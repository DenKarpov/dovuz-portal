# Сгенерировано codegen/generate.py из openapi/openapi.yaml, руками не править.

from abc import ABC, abstractmethod
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Path, Query, UploadFile

from app.generated.models import PublicationDetailResponse, PublicationTitlePage
from app.generated.security import require_session_cookie


class PublicationsApi(ABC):
    """Ручки тега «publications». Реализация наследуется от этого класса."""

    @abstractmethod
    def get_publications_by_topic(
        self, *, subject_topic_id: int, page_number: int, page_size: int
    ) -> PublicationTitlePage:
        """Публикации темы"""

    @abstractmethod
    def create_publication(
        self,
        *,
        title: str,
        description: str | None,
        subject_topic_id: int,
        files: list[UploadFile] | None,
    ) -> PublicationDetailResponse:
        """Создать публикацию в теме

        Администратору и модераторам, назначенным на предмет темы."""

    @abstractmethod
    def get_publication(self, *, id: int) -> PublicationDetailResponse:
        """Публикация по id

        Новости открыты всем, публикации из тем — только после входа."""

    @abstractmethod
    def delete_publication(self, *, id: int) -> None:
        """Удалить публикацию

        Публикацию из темы — администратор или модератор предмета,
        новость — администратор или её автор."""


def build_router(implementation: type[PublicationsApi]) -> APIRouter:
    """Роутер тега «publications»: реализация создаётся на каждый запрос через Depends."""
    if implementation.__abstractmethods__:
        missing = ", ".join(sorted(implementation.__abstractmethods__))
        raise TypeError(f"{implementation.__name__} не реализует: {missing}")

    router = APIRouter(tags=["publications"])
    Service = Annotated[PublicationsApi, Depends(implementation)]

    @router.get(
        "/publications",
        operation_id="getPublicationsByTopic",
        status_code=200,
        response_model=PublicationTitlePage,
        dependencies=[Depends(require_session_cookie)],
    )
    def get_publications_by_topic(
        service: Service,
        subject_topic_id: Annotated[int, Query(alias="subjectTopicId")],
        page_number: Annotated[int, Query(alias="pageNumber", ge=0, le=1000000)] = 0,
        page_size: Annotated[int, Query(alias="pageSize", ge=1, le=1000)] = 10,
    ) -> PublicationTitlePage:
        return service.get_publications_by_topic(
            subject_topic_id=subject_topic_id, page_number=page_number, page_size=page_size
        )

    @router.post(
        "/publications",
        operation_id="createPublication",
        status_code=201,
        response_model=PublicationDetailResponse,
        dependencies=[Depends(require_session_cookie)],
    )
    def create_publication(
        service: Service,
        title: Annotated[str, Form(min_length=1, max_length=300)],
        subject_topic_id: Annotated[int, Form(alias="subjectTopicId")],
        description: Annotated[str | None, Form(max_length=20000)] = None,
        files: Annotated[list[UploadFile] | None, File(max_length=10)] = None,
    ) -> PublicationDetailResponse:
        return service.create_publication(
            title=title, description=description, subject_topic_id=subject_topic_id, files=files
        )

    @router.get(
        "/publications/{id}",
        operation_id="getPublication",
        status_code=200,
        response_model=PublicationDetailResponse,
    )
    def get_publication(
        service: Service,
        id: Annotated[int, Path()],
    ) -> PublicationDetailResponse:
        return service.get_publication(id=id)

    @router.delete(
        "/publications/{id}",
        operation_id="deletePublication",
        status_code=204,
        response_model=None,
        dependencies=[Depends(require_session_cookie)],
    )
    def delete_publication(
        service: Service,
        id: Annotated[int, Path()],
    ) -> None:
        return service.delete_publication(id=id)

    return router
