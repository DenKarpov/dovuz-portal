"""Сгенерированный слой соответствует спеке.

Пока реализаций нет, каждая ручка отвечает заглушкой 501 с именем своего метода,
поэтому по ответу видно, до какой операции дошёл запрос. Schemathesis строит запросы
из спеки: допустимые должны дойти ровно до своей операции, недопустимые — отсечься раньше.

Недопустимые данные проверяются только в JSON-телах: в query, path и multipart всё
передаётся текстом, и «число вместо строки» там неотличимо от допустимого значения.
"""

import re

import schemathesis
from hypothesis import HealthCheck, assume, settings
from schemathesis import GenerationMode
from schemathesis.core.parameters import ParameterLocation

from app.main import app

SESSION = {"dovuz_session": "test"}


def schema_for(mode: GenerationMode):
    schema = schemathesis.openapi.from_asgi("/openapi.json", app)
    # Лишние query-параметры по HTTP игнорируются (фронт их и шлёт), куку ставит сам тест
    schema.config.generation.update(
        modes=[mode],
        max_examples=25,
        allow_extra_parameters=False,
        with_security_parameters=False,
    )
    return schema


def has_json_body(ctx) -> bool:
    body = ctx.operation.definition.raw.get("requestBody", {})
    return "application/json" in body.get("content", {})


positive = schema_for(GenerationMode.POSITIVE)
negative = schema_for(GenerationMode.NEGATIVE).include(func=has_json_body)


def method_name(operation_id: str) -> str:
    return re.sub(r"(?<=[a-z0-9])([A-Z])", r"_\1", operation_id).lower()


@positive.parametrize()
def test_valid_request_reaches_its_operation(case):
    case.cookies = {**(case.cookies or {}), **SESSION}
    response = case.call()
    operation = method_name(case.operation.definition.raw["operationId"])
    assert response.status_code == 501, response.text
    assert response.json() == {"message": f"Ручка {operation} ещё не реализована"}


@negative.parametrize()
@settings(suppress_health_check=[HealthCheck.filter_too_much])
def test_invalid_json_body_is_rejected_before_implementation(case):
    body = case.meta.components.get(ParameterLocation.BODY)
    assume(body is not None and body.mode == GenerationMode.NEGATIVE)
    case.cookies = {**(case.cookies or {}), **SESSION}
    response = case.call()
    assert 400 <= response.status_code < 500, response.text
    assert set(response.json()) == {"message"}
