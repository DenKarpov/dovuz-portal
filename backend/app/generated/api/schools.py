# Сгенерировано codegen/generate.py из openapi/openapi.yaml, руками не править.

from abc import ABC, abstractmethod
from typing import Annotated

from fastapi import APIRouter, Depends, Path

from app.generated.models import NameRequest, SchoolResponse
from app.generated.security import require_session_cookie


class SchoolsApi(ABC):
    """Ручки тега «schools». Реализация наследуется от этого класса."""

    @abstractmethod
    def get_schools(self) -> list[SchoolResponse]:
        """Все школы"""

    @abstractmethod
    def create_school(self, *, body: NameRequest) -> SchoolResponse:
        """Создать школу

        Только для администратора. Название уникально без учёта регистра."""

    @abstractmethod
    def delete_school(self, *, id: int) -> None:
        """Удалить школу

        Вместе с классами. Ученики остаются, но теряют привязку к школе и классу."""


def build_router(implementation: type[SchoolsApi]) -> APIRouter:
    """Роутер тега «schools»: реализация создаётся на каждый запрос через Depends."""
    if implementation.__abstractmethods__:
        missing = ", ".join(sorted(implementation.__abstractmethods__))
        raise TypeError(f"{implementation.__name__} не реализует: {missing}")

    router = APIRouter(tags=["schools"])
    Service = Annotated[SchoolsApi, Depends(implementation)]

    @router.get(
        "/schools",
        operation_id="getSchools",
        status_code=200,
        response_model=list[SchoolResponse],
        dependencies=[Depends(require_session_cookie)],
    )
    def get_schools(
        service: Service,
    ) -> list[SchoolResponse]:
        return service.get_schools()

    @router.post(
        "/schools",
        operation_id="createSchool",
        status_code=201,
        response_model=SchoolResponse,
        dependencies=[Depends(require_session_cookie)],
    )
    def create_school(
        service: Service,
        body: NameRequest,
    ) -> SchoolResponse:
        return service.create_school(body=body)

    @router.delete(
        "/schools/{id}",
        operation_id="deleteSchool",
        status_code=204,
        response_model=None,
        dependencies=[Depends(require_session_cookie)],
    )
    def delete_school(
        service: Service,
        id: Annotated[int, Path()],
    ) -> None:
        return service.delete_school(id=id)

    return router
