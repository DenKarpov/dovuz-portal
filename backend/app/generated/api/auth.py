# Сгенерировано codegen/generate.py из openapi/openapi.yaml, руками не править.

from abc import ABC, abstractmethod
from typing import Annotated

from fastapi import APIRouter, Depends

from app.generated.models import AuthLoginRequest, AuthRegisterRequest, AuthResponse


class AuthApi(ABC):
    """Ручки тега «auth». Реализация наследуется от этого класса."""

    @abstractmethod
    def login(self, *, body: AuthLoginRequest) -> AuthResponse:
        """Вход по email и паролю"""

    @abstractmethod
    def logout(self) -> None:
        """Выход

        Закрывает текущую сессию и стирает куку. Без сессии тоже отвечает 204."""

    @abstractmethod
    def register(self, *, body: AuthRegisterRequest) -> AuthResponse:
        """Регистрация

        Создаёт учётную запись с ролью «Пользователь» и сразу открывает сессию."""


def build_router(implementation: type[AuthApi]) -> APIRouter:
    """Роутер тега «auth»: реализация создаётся на каждый запрос через Depends."""
    if implementation.__abstractmethods__:
        missing = ", ".join(sorted(implementation.__abstractmethods__))
        raise TypeError(f"{implementation.__name__} не реализует: {missing}")

    router = APIRouter(tags=["auth"])
    Service = Annotated[AuthApi, Depends(implementation)]

    @router.post(
        "/auth/login",
        operation_id="login",
        status_code=200,
        response_model=AuthResponse,
    )
    def login(
        service: Service,
        body: AuthLoginRequest,
    ) -> AuthResponse:
        return service.login(body=body)

    @router.post(
        "/auth/logout",
        operation_id="logout",
        status_code=204,
        response_model=None,
    )
    def logout(
        service: Service,
    ) -> None:
        return service.logout()

    @router.post(
        "/auth/register",
        operation_id="register",
        status_code=201,
        response_model=AuthResponse,
    )
    def register(
        service: Service,
        body: AuthRegisterRequest,
    ) -> AuthResponse:
        return service.register(body=body)

    return router
