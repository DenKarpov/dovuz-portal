"""Ошибки API.

Фронт читает только `error.response.data.message`, поэтому формат один: {"message": "..."}.
"""

import logging
from collections.abc import Sequence
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.types import ASGIApp, Message, Receive, Scope, Send

logger = logging.getLogger(__name__)


class ApiError(Exception):
    def __init__(self, status_code: int, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.message = message


def error_response(status_code: int, message: str, headers: dict | None = None) -> JSONResponse:
    return JSONResponse({"message": message}, status_code=status_code, headers=headers)


FIELD_TITLES = {
    "email": "Email",
    "nickname": "Никнейм",
    "password": "Пароль",
    "current_password": "Текущий пароль",
    "new_password": "Новый пароль",
    "name": "Название",
    "title": "Заголовок",
    "description": "Описание",
    "content": "Текст",
    "firstName": "Имя",
    "first_name": "Имя",
    "lastName": "Фамилия",
    "last_name": "Фамилия",
    "middleName": "Отчество",
    "middle_name": "Отчество",
    "birthDate": "Дата рождения",
    "schoolId": "Школа",
    "school_id": "Школа",
    "classId": "Класс",
    "class_id": "Класс",
    "role_id": "Роль",
    "photo": "Фото",
    "files": "Файлы",
    "pageNumber": "Номер страницы",
    "pageSize": "Размер страницы",
}

NICKNAME_RULES = "Никнейм: 3–32 символа — буквы, цифры, «_», «.», «-»; начинается с буквы или цифры"


def validation_message(errors: Sequence[Any]) -> str:
    """Первая ошибка валидации pydantic — по-русски, с названием поля."""
    if not errors:
        return "Некорректный запрос"
    error = errors[0]
    kind = error.get("type", "")
    ctx = error.get("ctx") or {}
    names = [part for part in error.get("loc", ()) if isinstance(part, str)]
    field = names[-1] if names else ""
    title = FIELD_TITLES.get(field, field)

    if kind == "json_invalid":
        return "Тело запроса — некорректный JSON"
    if kind in ("model_attributes_type", "dict_type"):
        return "Тело запроса должно быть JSON-объектом"
    if field == "nickname" and kind.startswith("string_"):
        return NICKNAME_RULES
    if field == "email" and kind == "string_pattern_mismatch":
        return "Некорректный email"
    messages = {
        "missing": f"Не заполнено поле «{title}»",
        "string_too_short": f"Поле «{title}»: минимум {ctx.get('min_length')} симв.",
        "string_too_long": f"Поле «{title}»: максимум {ctx.get('max_length')} симв.",
        "string_pattern_mismatch": f"Поле «{title}» заполнено неверно",
        "too_long": f"Поле «{title}»: не больше {ctx.get('max_length')} шт.",
        "int_parsing": f"Поле «{title}» должно быть целым числом",
        "int_type": f"Поле «{title}» должно быть целым числом",
        "int_from_float": f"Поле «{title}» должно быть целым числом",
        "bool_parsing": f"Поле «{title}» должно быть true или false",
        "bool_type": f"Поле «{title}» должно быть true или false",
        "string_type": f"Поле «{title}» должно быть строкой",
        "date_from_datetime_parsing": f"Поле «{title}»: неверная дата",
        "date_parsing": f"Поле «{title}»: неверная дата",
        "greater_than_equal": f"Поле «{title}» не может быть меньше {ctx.get('ge')}",
        "less_than_equal": f"Поле «{title}» не может быть больше {ctx.get('le')}",
        "upload_file_type": f"Поле «{title}» должно быть файлом",
    }
    return messages.get(kind, f"Некорректное значение поля «{title}»")


HTTP_MESSAGES = {
    404: "Не найдено",
    405: "Метод не поддерживается",
}


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def api_error(_: Request, exc: ApiError) -> JSONResponse:
        return error_response(exc.status_code, exc.message)

    @app.exception_handler(RequestValidationError)
    async def invalid_request(_: Request, exc: RequestValidationError) -> JSONResponse:
        # Как и старый бэкенд — 400, а не 422: фронт на 422 не рассчитан
        return error_response(400, validation_message(exc.errors()))

    @app.exception_handler(StarletteHTTPException)
    async def http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        message = HTTP_MESSAGES.get(exc.status_code, str(exc.detail))
        return error_response(exc.status_code, message, headers=exc.headers)


class CatchAllMiddleware:
    """Отвечает 500 в нашем формате. Стоит внутри CORS, чтобы у 500 были CORS-заголовки."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        started = False

        async def tracked_send(message: Message) -> None:
            nonlocal started
            if message["type"] == "http.response.start":
                started = True
            await send(message)

        try:
            await self.app(scope, receive, tracked_send)
        except Exception:
            logger.exception("Необработанная ошибка в %s %s", scope["method"], scope["path"])
            if started:
                raise
            await error_response(500, "Внутренняя ошибка сервера")(scope, receive, send)
