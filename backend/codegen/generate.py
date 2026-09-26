"""Генерирует серверный слой из openapi/openapi.yaml.

Пишет в app/generated/:
  models.py          pydantic-модели (datamodel-codegen, настройки в pyproject.toml);
  security.py        проверки из components.securitySchemes;
  api/<тег>.py       абстрактный класс <Тег>Api и build_router(), который вешает
                     ручки FastAPI и вызывает методы реализации;
  api/__init__.py    build_api_router() со всеми тегами.

Руками там ничего не правится: поменяли спеку — перезапустили генератор,
а бизнес-логику дописали в app/services/.

    uv run python codegen/generate.py           # перегенерировать
    uv run python codegen/generate.py --check   # упасть, если app/generated устарел
"""

from __future__ import annotations

import argparse
import filecmp
import keyword
import re
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml
from jinja2 import Environment, FileSystemLoader, StrictUndefined

ROOT = Path(__file__).resolve().parent.parent
SPEC = ROOT / "openapi" / "openapi.yaml"
OUTPUT = ROOT / "app" / "generated"
TEMPLATES = Path(__file__).resolve().parent / "templates"
HTTP_METHODS = ("get", "post", "put", "patch", "delete")


@dataclass
class Param:
    name: str
    type_hint: str
    annotation: str
    default: str | None

    @property
    def required(self) -> bool:
        return self.default is None


@dataclass
class Operation:
    tag: str
    method: str
    path: str
    operation_id: str
    function: str
    docstring: str
    params: list[Param]
    status_code: int
    response_model: str
    return_type: str
    security_dependency: str | None
    models: set[str]


@dataclass
class SecurityScheme:
    key: str
    cookie: str

    @property
    def variable(self) -> str:
        return f"{snake_case(self.key)}_scheme"

    @property
    def dependency(self) -> str:
        return f"require_{snake_case(self.key)}"


class SpecError(Exception):
    pass


def snake_case(name: str) -> str:
    name = re.sub(r"[-\s]+", "_", name)
    name = re.sub(r"(?<=[a-z0-9])([A-Z])", r"_\1", name)
    name = name.lower()
    return f"{name}_" if keyword.iskeyword(name) else name


def pascal_case(name: str) -> str:
    return "".join(part.capitalize() for part in re.split(r"[-_\s]+", name))


class Generator:
    def __init__(self, spec: dict[str, Any]) -> None:
        self.spec = spec
        self.security_schemes = {
            key: self.security_scheme(key, scheme)
            for key, scheme in spec.get("components", {}).get("securitySchemes", {}).items()
        }

    @staticmethod
    def security_scheme(key: str, scheme: dict[str, Any]) -> SecurityScheme:
        if scheme.get("type") != "apiKey" or scheme.get("in") != "cookie":
            raise SpecError(f"схема {key}: поддерживается только apiKey в куке")
        return SecurityScheme(key, scheme["name"])

    def resolve(self, node: dict[str, Any]) -> dict[str, Any]:
        while "$ref" in node:
            prefix = "#/components/"
            ref = node["$ref"]
            if not ref.startswith(prefix):
                raise SpecError(f"поддерживаются только локальные $ref: {ref}")
            section, name = ref.removeprefix(prefix).split("/")
            node = self.spec["components"][section][name]
        return node

    def model_name(self, schema: dict[str, Any]) -> str | None:
        ref = schema.get("$ref", "")
        if not ref.startswith("#/components/schemas/"):
            return None
        name = ref.rsplit("/", 1)[1]
        target = self.resolve(schema)
        is_model = target.get("type") == "object" or "allOf" in target or "enum" in target
        return name if is_model else None

    def python_type(self, schema: dict[str, Any], models: set[str]) -> str:
        if name := self.model_name(schema):
            models.add(name)
            return name
        schema = self.resolve(schema)
        types = schema.get("type", "string")
        nullable = isinstance(types, list) and "null" in types
        if isinstance(types, list):
            types = next(t for t in types if t != "null")
        if types == "array":
            result = f"list[{self.python_type(schema['items'], models)}]"
        elif types == "string":
            result = {"date": "date", "binary": "UploadFile"}.get(schema.get("format", ""), "str")
        else:
            result = {"integer": "int", "number": "float", "boolean": "bool"}[types]
        return f"{result} | None" if nullable else result

    @staticmethod
    def constraints(schema: dict[str, Any]) -> list[str]:
        mapping = {
            "minLength": "min_length",
            "maxLength": "max_length",
            "maxItems": "max_length",
            "pattern": "pattern",
            "minimum": "ge",
            "maximum": "le",
        }
        return [f"{kwarg}={schema[key]!r}" for key, kwarg in mapping.items() if key in schema]

    def make_param(
        self, wire_name: str, schema: dict[str, Any], marker: str, required: bool, models: set[str]
    ) -> Param:
        name = snake_case(wire_name)
        type_hint = self.python_type(schema, models)
        resolved = self.resolve(schema)
        default = None
        if not required:
            if "default" in resolved:
                default = repr(resolved["default"])
            else:
                default = "None"
                if not type_hint.endswith("| None"):
                    type_hint = f"{type_hint} | None"
        args = [f"alias={wire_name!r}"] if name != wire_name else []
        args += self.constraints(resolved)
        annotation = f"Annotated[{type_hint}, {marker}({', '.join(args)})]"
        return Param(name, type_hint, annotation, default)

    def parameters(self, path_item: dict[str, Any], op: dict[str, Any], models: set[str]):
        merged = {}
        for raw in path_item.get("parameters", []) + op.get("parameters", []):
            param = self.resolve(raw)
            merged[(param["name"], param["in"])] = param
        for param in merged.values():
            location = param["in"]
            if location not in ("path", "query"):
                raise SpecError(f"параметры в {location} генератор не поддерживает")
            yield self.make_param(
                param["name"],
                param["schema"],
                location.capitalize(),
                location == "path" or param.get("required", False),
                models,
            )

    def request_body(self, op: dict[str, Any], models: set[str]):
        body = op.get("requestBody")
        if not body:
            return
        body = self.resolve(body)
        content = body["content"]
        if "application/json" in content:
            schema = content["application/json"]["schema"]
            type_hint = self.python_type(schema, models)
            required = body.get("required", False)
            if not required:
                type_hint = f"{type_hint} | None"
            yield Param("body", type_hint, type_hint, None if required else "None")
        elif "multipart/form-data" in content:
            schema = self.resolve(content["multipart/form-data"]["schema"])
            required = set(schema.get("required", []))
            for wire_name, prop in schema["properties"].items():
                is_file = "UploadFile" in self.python_type(prop, set())
                yield self.make_param(
                    wire_name, prop, "File" if is_file else "Form", wire_name in required, models
                )
        else:
            raise SpecError(f"тело {', '.join(content)} генератор не поддерживает")

    def response(self, op: dict[str, Any], models: set[str]) -> tuple[int, str, str]:
        # В YAML код ответа бывает и строкой '200', и числом 200
        success = {
            int(code): body
            for code, body in op["responses"].items()
            if str(code).isdigit() and str(code).startswith("2")
        }
        if not success:
            raise SpecError(f"{op['operationId']}: нет успешного ответа")
        code = min(success)
        content = self.resolve(success[code]).get("content")
        if not content:
            return code, "None", "None"
        if "application/json" not in content:
            return code, "None", "Response"
        type_hint = self.python_type(content["application/json"]["schema"], models)
        return code, type_hint, type_hint

    def security_dependency(self, op: dict[str, Any]) -> str | None:
        """Зависимость для обязательной схемы; при `{}` в списке вход необязателен."""
        requirements = op.get("security", self.spec.get("security", []))
        if not requirements or {} in requirements:
            return None
        if len(requirements) != 1 or len(requirements[0]) != 1:
            raise SpecError(f"{op['operationId']}: поддерживается одна схема безопасности")
        (key,) = requirements[0]
        if key not in self.security_schemes:
            raise SpecError(f"{op['operationId']}: схема {key} не объявлена")
        return self.security_schemes[key].dependency

    @staticmethod
    def docstring(op: dict[str, Any]) -> str:
        parts = [op.get("summary", ""), op.get("description", "").strip()]
        text = "\n\n".join(part for part in parts if part)
        return text.replace("\\", "\\\\").replace('"""', '\\"\\"\\"')

    def operations(self) -> list[Operation]:
        result = []
        for path, path_item in self.spec["paths"].items():
            for method in HTTP_METHODS:
                if method not in path_item:
                    continue
                op = path_item[method]
                models: set[str] = set()
                params = [
                    *self.parameters(path_item, op, models),
                    *self.request_body(op, models),
                ]
                names = [param.name for param in params]
                if len(set(names)) != len(names) or "service" in names:
                    raise SpecError(
                        f"{op['operationId']}: имена аргументов совпадают или заняты: {names}"
                    )
                status_code, response_model, return_type = self.response(op, models)
                result.append(
                    Operation(
                        tag=op["tags"][0],
                        method=method,
                        path=path,
                        operation_id=op["operationId"],
                        function=snake_case(op["operationId"]),
                        docstring=self.docstring(op),
                        params=params,
                        status_code=status_code,
                        response_model=response_model,
                        return_type=return_type,
                        security_dependency=self.security_dependency(op),
                        models=models,
                    )
                )
        return result


def route_order(op: Operation) -> tuple:
    # Статический сегмент раньше параметра: /comments/revisions до /comments/{id}
    segments = tuple((1, "") if s.startswith("{") else (0, s) for s in op.path.split("/"))
    return segments, HTTP_METHODS.index(op.method)


def check_shadowing(operations: list[Operation]) -> None:
    def pattern(path: str) -> re.Pattern[str]:
        return re.compile("^" + re.sub(r"\\\{[^/]+?\\\}", "[^/]+", re.escape(path)) + "$")

    for i, op in enumerate(operations):
        sample = re.sub(r"\{[^/]+?\}", "1", op.path)
        for earlier in operations[:i]:
            if earlier.method != op.method or earlier.path == op.path:
                continue
            if pattern(earlier.path).match(sample):
                raise SpecError(
                    f"{op.method.upper()} {op.path} перекрыт ручкой {earlier.path}, "
                    "которая регистрируется раньше"
                )


def render(spec: dict[str, Any], output: Path) -> None:
    generator = Generator(spec)
    tag_order = [tag["name"] for tag in spec.get("tags", [])]
    by_tag: dict[str, list[Operation]] = {}
    for op in generator.operations():
        if op.tag not in tag_order:
            raise SpecError(f"тег {op.tag} не объявлен в корневом списке tags")
        by_tag.setdefault(op.tag, []).append(op)

    tags = [tag for tag in tag_order if tag in by_tag]
    for tag in tags:
        by_tag[tag].sort(key=route_order)
    check_shadowing([op for tag in tags for op in by_tag[tag]])

    env = Environment(
        loader=FileSystemLoader(TEMPLATES),
        undefined=StrictUndefined,
        keep_trailing_newline=True,
        trim_blocks=True,
        lstrip_blocks=True,
    )
    api_dir = output / "api"
    api_dir.mkdir(parents=True, exist_ok=True)
    modules = []
    for tag in tags:
        ops = by_tag[tag]
        module = {
            "tag": tag,
            "name": snake_case(tag),
            "class_name": f"{pascal_case(tag)}Api",
            "operations": ops,
            "models": sorted(set().union(*(op.models for op in ops))),
            "security": sorted({op.security_dependency for op in ops} - {None}),
        }
        modules.append(module)
        code = env.get_template("api_module.py.jinja").render(**module)
        (api_dir / f"{module['name']}.py").write_text(code)
    (api_dir / "__init__.py").write_text(
        env.get_template("api_package.py.jinja").render(modules=modules)
    )
    (output / "__init__.py").write_text(env.get_template("package.py.jinja").render())
    (output / "security.py").write_text(
        env.get_template("security.py.jinja").render(
            schemes=list(generator.security_schemes.values())
        )
    )


def generate(output: Path) -> None:
    spec = yaml.safe_load(SPEC.read_text(encoding="utf-8"))
    output.mkdir(parents=True, exist_ok=True)
    python = [sys.executable, "-m"]
    subprocess.run(
        [*python, "datamodel_code_generator", "--output", str(output / "models.py")],
        cwd=ROOT,
        check=True,
    )
    render(spec, output)
    files = [str(path) for path in sorted(output.rglob("*.py"))]
    ruff = [*python, "ruff"]
    config = ["--config", str(ROOT / "pyproject.toml"), "--quiet"]
    subprocess.run(
        [*ruff, "check", *config, "--fix", "--select", "I,F401", *files], cwd=ROOT, check=True
    )
    subprocess.run([*ruff, "format", *config, *files], cwd=ROOT, check=True)


def differences(expected: Path, actual: Path) -> list[str]:
    comparison = filecmp.dircmp(expected, actual, ignore=["__pycache__"])
    found = []

    def walk(cmp: filecmp.dircmp, prefix: str) -> None:
        found.extend(f"{prefix}{name}" for name in cmp.left_only + cmp.right_only)
        _, mismatch, errors = filecmp.cmpfiles(cmp.left, cmp.right, cmp.common_files, shallow=False)
        found.extend(f"{prefix}{name}" for name in mismatch + errors)
        for name, sub in cmp.subdirs.items():
            walk(sub, f"{prefix}{name}/")

    walk(comparison, "")
    return found


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--check", action="store_true", help="сверить app/generated со спекой, ничего не меняя"
    )
    args = parser.parse_args()
    try:
        if not args.check:
            generate(OUTPUT)
            return 0
        with tempfile.TemporaryDirectory() as tmp:
            fresh = Path(tmp) / "generated"
            generate(fresh)
            stale = differences(fresh, OUTPUT) if OUTPUT.exists() else ["app/generated"]
    except SpecError as error:
        print(f"Ошибка в спеке: {error}", file=sys.stderr)
        return 1
    if stale:
        print("app/generated отстал от спеки, запустите codegen/generate.py:", file=sys.stderr)
        print("\n".join(f"  {name}" for name in stale), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
