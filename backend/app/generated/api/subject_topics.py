# Сгенерировано codegen/generate.py из openapi/openapi.yaml, руками не править.

from abc import ABC, abstractmethod
from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query

from app.generated.models import (
    NameRequest,
    SubjectTopicCreateRequest,
    SubjectTopicPage,
    SubjectTopicResponse,
)
from app.generated.security import require_session_cookie


class SubjectTopicsApi(ABC):
    """Ручки тега «subject-topics». Реализация наследуется от этого класса."""

    @abstractmethod
    def get_subject_topics(
        self, *, subject_id: int, page_number: int, page_size: int
    ) -> SubjectTopicPage:
        """Темы предмета"""

    @abstractmethod
    def create_subject_topic(self, *, body: SubjectTopicCreateRequest) -> SubjectTopicResponse:
        """Создать тему

        Администратору и модераторам, назначенным на предмет."""

    @abstractmethod
    def get_subject_topic(self, *, id: int) -> SubjectTopicResponse:
        """Тема по id"""

    @abstractmethod
    def update_subject_topic(self, *, id: int, body: NameRequest) -> SubjectTopicResponse:
        """Переименовать тему"""

    @abstractmethod
    def delete_subject_topic(self, *, id: int) -> None:
        """Удалить тему

        Вместе с публикациями и их файлами."""


def build_router(implementation: type[SubjectTopicsApi]) -> APIRouter:
    """Роутер тега «subject-topics»: реализация создаётся на каждый запрос через Depends."""
    if implementation.__abstractmethods__:
        missing = ", ".join(sorted(implementation.__abstractmethods__))
        raise TypeError(f"{implementation.__name__} не реализует: {missing}")

    router = APIRouter(tags=["subject-topics"])
    Service = Annotated[SubjectTopicsApi, Depends(implementation)]

    @router.get(
        "/subject-topics",
        operation_id="getSubjectTopics",
        status_code=200,
        response_model=SubjectTopicPage,
        dependencies=[Depends(require_session_cookie)],
    )
    def get_subject_topics(
        service: Service,
        subject_id: Annotated[int, Query(alias="subjectId")],
        page_number: Annotated[int, Query(alias="pageNumber", ge=0, le=1000000)] = 0,
        page_size: Annotated[int, Query(alias="pageSize", ge=1, le=1000)] = 10,
    ) -> SubjectTopicPage:
        return service.get_subject_topics(
            subject_id=subject_id, page_number=page_number, page_size=page_size
        )

    @router.post(
        "/subject-topics",
        operation_id="createSubjectTopic",
        status_code=201,
        response_model=SubjectTopicResponse,
        dependencies=[Depends(require_session_cookie)],
    )
    def create_subject_topic(
        service: Service,
        body: SubjectTopicCreateRequest,
    ) -> SubjectTopicResponse:
        return service.create_subject_topic(body=body)

    @router.get(
        "/subject-topics/{id}",
        operation_id="getSubjectTopic",
        status_code=200,
        response_model=SubjectTopicResponse,
        dependencies=[Depends(require_session_cookie)],
    )
    def get_subject_topic(
        service: Service,
        id: Annotated[int, Path()],
    ) -> SubjectTopicResponse:
        return service.get_subject_topic(id=id)

    @router.put(
        "/subject-topics/{id}",
        operation_id="updateSubjectTopic",
        status_code=200,
        response_model=SubjectTopicResponse,
        dependencies=[Depends(require_session_cookie)],
    )
    def update_subject_topic(
        service: Service,
        id: Annotated[int, Path()],
        body: NameRequest,
    ) -> SubjectTopicResponse:
        return service.update_subject_topic(id=id, body=body)

    @router.delete(
        "/subject-topics/{id}",
        operation_id="deleteSubjectTopic",
        status_code=204,
        response_model=None,
        dependencies=[Depends(require_session_cookie)],
    )
    def delete_subject_topic(
        service: Service,
        id: Annotated[int, Path()],
    ) -> None:
        return service.delete_subject_topic(id=id)

    return router
