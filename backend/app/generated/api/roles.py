# Сгенерировано codegen/generate.py из openapi/openapi.yaml, руками не править.

from abc import ABC, abstractmethod
from typing import Annotated

from fastapi import APIRouter, Depends

from app.generated.models import RoleResponse
from app.generated.security import require_session_cookie


class RolesApi(ABC):
    """Ручки тега «roles». Реализация наследуется от этого класса."""

    @abstractmethod
    def get_roles(self) -> list[RoleResponse]:
        """Все роли"""


def build_router(implementation: type[RolesApi]) -> APIRouter:
    """Роутер тега «roles»: реализация создаётся на каждый запрос через Depends."""
    if implementation.__abstractmethods__:
        missing = ", ".join(sorted(implementation.__abstractmethods__))
        raise TypeError(f"{implementation.__name__} не реализует: {missing}")

    router = APIRouter(tags=["roles"])
    Service = Annotated[RolesApi, Depends(implementation)]

    @router.get(
        "/roles",
        operation_id="getRoles",
        status_code=200,
        response_model=list[RoleResponse],
        dependencies=[Depends(require_session_cookie)],
    )
    def get_roles(
        service: Service,
    ) -> list[RoleResponse]:
        return service.get_roles()

    return router
