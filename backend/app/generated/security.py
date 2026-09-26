# Сгенерировано codegen/generate.py из openapi/openapi.yaml, руками не править.

from typing import Annotated

from fastapi import HTTPException, Security
from fastapi.security import APIKeyCookie

session_cookie_scheme = APIKeyCookie(name="dovuz_session", auto_error=False)


def require_session_cookie(value: Annotated[str | None, Security(session_cookie_scheme)]) -> str:
    """Схема «sessionCookie»: без куки dovuz_session — 401.

    Здесь проверяется только наличие куки, действительность сессии проверяет реализация.
    """
    if not value:
        raise HTTPException(status_code=401, detail="Нужно войти в систему")
    return value
