# Сгенерировано codegen/generate.py из openapi/openapi.yaml, руками не править.

from abc import ABC, abstractmethod
from typing import Annotated

from fastapi import APIRouter, Depends, Path

from app.generated.models import SchoolClassCreateRequest, SchoolClassResponse
from app.generated.security import require_session_cookie


class ClassesApi(ABC):
    """Ручки тега «classes». Реализация наследуется от этого класса."""

    @abstractmethod
    def create_class(self, *, body: SchoolClassCreateRequest) -> SchoolClassResponse:
        """Создать класс в школе

        Только для администратора. Название уникально в пределах школы."""

    @abstractmethod
    def get_classes_by_school(self, *, school_id: int) -> list[SchoolClassResponse]:
        """Классы школы"""

    @abstractmethod
    def delete_class(self, *, id: int) -> None:
        """Удалить класс

        Ученики класса остаются в школе без класса."""


def build_router(implementation: type[ClassesApi]) -> APIRouter:
    """Роутер тега «classes»: реализация создаётся на каждый запрос через Depends."""
    if implementation.__abstractmethods__:
        missing = ", ".join(sorted(implementation.__abstractmethods__))
        raise TypeError(f"{implementation.__name__} не реализует: {missing}")

    router = APIRouter(tags=["classes"])
    Service = Annotated[ClassesApi, Depends(implementation)]

    @router.post(
        "/classes",
        operation_id="createClass",
        status_code=201,
        response_model=SchoolClassResponse,
        dependencies=[Depends(require_session_cookie)],
    )
    def create_class(
        service: Service,
        body: SchoolClassCreateRequest,
    ) -> SchoolClassResponse:
        return service.create_class(body=body)

    @router.get(
        "/classes/school/{schoolId}",
        operation_id="getClassesBySchool",
        status_code=200,
        response_model=list[SchoolClassResponse],
        dependencies=[Depends(require_session_cookie)],
    )
    def get_classes_by_school(
        service: Service,
        school_id: Annotated[int, Path(alias="schoolId")],
    ) -> list[SchoolClassResponse]:
        return service.get_classes_by_school(school_id=school_id)

    @router.delete(
        "/classes/{id}",
        operation_id="deleteClass",
        status_code=204,
        response_model=None,
        dependencies=[Depends(require_session_cookie)],
    )
    def delete_class(
        service: Service,
        id: Annotated[int, Path()],
    ) -> None:
        return service.delete_class(id=id)

    return router
