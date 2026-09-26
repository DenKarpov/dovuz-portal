"""Сборка контракта из openapi/ в один документ.

Контракт разбит по файлам: корень openapi.yaml держит общие настройки и оглавление
путей, файлы тегов — сами пути и свои схемы, common.yaml — общее. Ссылки между
файлами — обычные `$ref`: пути `<тег>.yaml#/paths/<ключ>`, остальное
`<файл>.yaml#/<раздел>/<имя>` (разделы schemas, parameters, responses, headers).

Сборка подставляет пути на место, а всё остальное переносит в components,
чтобы генераторы, тесты и Swagger работали с обычной однофайловой спекой.
"""

from functools import cache
from pathlib import Path
from typing import Any

import yaml

SPEC_DIR = Path(__file__).resolve().parent.parent / "openapi"
ROOT_FILE = "openapi.yaml"
SECTIONS = ("schemas", "parameters", "responses", "headers")


class SpecError(Exception):
    pass


class _Bundler:
    def __init__(self, directory: Path) -> None:
        self.directory = directory
        self.documents: dict[str, Any] = {}
        self.components: dict[str, dict[str, Any]] = {section: {} for section in SECTIONS}
        self.used: set[tuple[str, str, str]] = set()

    def document(self, name: str) -> Any:
        if name not in self.documents:
            path = self.directory / name
            if not path.is_file():
                raise SpecError(f"нет файла {name}")
            self.documents[name] = yaml.safe_load(path.read_text(encoding="utf-8"))
        return self.documents[name]

    def target(self, name: str, section: str, key: str) -> Any:
        try:
            return self.document(name)[section][key]
        except (KeyError, TypeError):
            raise SpecError(f"в {name} нет {section}/{key}") from None

    def walk(self, node: Any, current: str) -> Any:
        if isinstance(node, list):
            return [self.walk(item, current) for item in node]
        if not isinstance(node, dict):
            return node
        if "$ref" in node:
            return self.reference(node, current)
        return {key: self.walk(value, current) for key, value in node.items()}

    def reference(self, node: dict[str, Any], current: str) -> Any:
        file, _, fragment = node["$ref"].partition("#")
        name = file or current
        parts = fragment.strip("/").split("/")
        if len(parts) != 2 or parts[0] not in ("paths", *SECTIONS):
            raise SpecError(f"{current}: ссылка {node['$ref']} не в формате <файл>#/<раздел>/<имя>")
        section, key = parts
        self.used.add((name, section, key))
        if section == "paths":
            return self.walk(self.target(name, section, key), name)

        known = self.components[section]
        if key not in known:
            known[key] = None  # занять имя до обхода: схемы бывают рекурсивными
            known[key] = self.walk(self.target(name, section, key), name)
        elif (other := self.origin(section, key, exclude=name)) is not None:
            raise SpecError(f"{section}/{key} объявлен и в {other}, и в {name}")
        siblings = {k: v for k, v in node.items() if k != "$ref"}
        return {**siblings, "$ref": f"#/components/{section}/{key}"}

    def origin(self, section: str, key: str, exclude: str) -> str | None:
        return next(
            (
                name
                for name, document in self.documents.items()
                if name != exclude and key in ((document or {}).get(section) or {})
            ),
            None,
        )

    def check_everything_used(self) -> None:
        stray = sorted(
            path.name for path in self.directory.glob("*.yaml") if path.name not in self.documents
        )
        if stray:
            raise SpecError(f"на эти файлы никто не ссылается: {', '.join(stray)}")
        for name, document in self.documents.items():
            if name == ROOT_FILE:
                continue
            for section in ("paths", *SECTIONS):
                for key in (document or {}).get(section) or {}:
                    if (name, section, key) not in self.used:
                        raise SpecError(f"{name}: {section}/{key} нигде не используется")


def bundle(directory: Path = SPEC_DIR) -> dict[str, Any]:
    bundler = _Bundler(directory)
    root = bundler.document(ROOT_FILE)
    result = {key: value for key, value in root.items() if key not in ("paths", "components")}
    result["paths"] = {path: bundler.walk(item, ROOT_FILE) for path, item in root["paths"].items()}
    result["components"] = {
        **(root.get("components") or {}),
        **{section: items for section, items in bundler.components.items() if items},
    }
    bundler.check_everything_used()
    return result


@cache
def load_spec() -> dict[str, Any]:
    """Собранный контракт. Общий на всё приложение — не изменять."""
    return bundle()
