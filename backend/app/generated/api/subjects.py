# Сгенерировано codegen/generate.py из openapi/openapi.yaml, руками не править.

from abc import ABC, abstractmethod
from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query

from app.generated.models import NameRequest, SubjectCreateRequest, SubjectPage, SubjectResponse
from app.generated.security import require_session_cookie


class SubjectsApi(ABC):
    """Ручки тега «subjects». Реализация наследуется от этого класса."""

    @abstractmethod
    def get_subjects(self, *, direction_id: int, page_number: int, page_size: int) -> SubjectPage:
        """Предметы направления"""

    @abstractmethod
    def create_subject(self, *, body: SubjectCreateRequest) -> SubjectResponse:
        """Создать предмет

        Только для администратора. Название уникально в пределах направления."""

    @abstractmethod
    def get_subject(self, *, id: int) -> SubjectResponse:
        """Предмет по id"""

    @abstractmethod
    def update_subject(self, *, id: int, body: NameRequest) -> SubjectResponse:
        """Переименовать предмет"""

    @abstractmethod
    def delete_subject(self, *, id: int) -> None:
        """Удалить предмет

        Вместе с темами, публикациями и их файлами."""


def build_router(implementation: type[SubjectsApi]) -> APIRouter:
    """Роутер тега «subjects»: реализация создаётся на каждый запрос через Depends."""
    if implementation.__abstractmethods__:
        missing = ", ".join(sorted(implementation.__abstractmethods__))
        raise TypeError(f"{implementation.__name__} не реализует: {missing}")

    router = APIRouter(tags=["subjects"])
    Service = Annotated[SubjectsApi, Depends(implementation)]

    @router.get(
        "/subjects",
        operation_id="getSubjects",
        status_code=200,
        response_model=SubjectPage,
        dependencies=[Depends(require_session_cookie)],
    )
    def get_subjects(
        service: Service,
        direction_id: Annotated[int, Query(alias="directionId")],
        page_number: Annotated[int, Query(alias="pageNumber", ge=0, le=1000000)] = 0,
        page_size: Annotated[int, Query(alias="pageSize", ge=1, le=1000)] = 10,
    ) -> SubjectPage:
        return service.get_subjects(
            direction_id=direction_id, page_number=page_number, page_size=page_size
        )

    @router.post(
        "/subjects",
        operation_id="createSubject",
        status_code=201,
        response_model=SubjectResponse,
        dependencies=[Depends(require_session_cookie)],
    )
    def create_subject(
        service: Service,
        body: SubjectCreateRequest,
    ) -> SubjectResponse:
        return service.create_subject(body=body)

    @router.get(
        "/subjects/{id}",
        operation_id="getSubject",
        status_code=200,
        response_model=SubjectResponse,
        dependencies=[Depends(require_session_cookie)],
    )
    def get_subject(
        service: Service,
        id: Annotated[int, Path()],
    ) -> SubjectResponse:
        return service.get_subject(id=id)

    @router.put(
        "/subjects/{id}",
        operation_id="updateSubject",
        status_code=200,
        response_model=SubjectResponse,
        dependencies=[Depends(require_session_cookie)],
    )
    def update_subject(
        service: Service,
        id: Annotated[int, Path()],
        body: NameRequest,
    ) -> SubjectResponse:
        return service.update_subject(id=id, body=body)

    @router.delete(
        "/subjects/{id}",
        operation_id="deleteSubject",
        status_code=204,
        response_model=None,
        dependencies=[Depends(require_session_cookie)],
    )
    def delete_subject(
        service: Service,
        id: Annotated[int, Path()],
    ) -> None:
        return service.delete_subject(id=id)

    return router
