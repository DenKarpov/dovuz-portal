# Сгенерировано codegen/generate.py из openapi/openapi.yaml, руками не править.

from abc import ABC, abstractmethod
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile

from app.generated.models import PublicationPage, PublicationResponse
from app.generated.security import require_session_cookie


class NewsApi(ABC):
    """Ручки тега «news». Реализация наследуется от этого класса."""

    @abstractmethod
    def get_news(self, *, page_number: int, page_size: int) -> PublicationPage:
        """Лента новостей

        Открыта всем, новые сверху."""

    @abstractmethod
    def create_news(
        self, *, title: str, description: str | None, files: list[UploadFile] | None
    ) -> PublicationResponse:
        """Опубликовать новость

        Для модераторов и администратора."""


def build_router(implementation: type[NewsApi]) -> APIRouter:
    """Роутер тега «news»: реализация создаётся на каждый запрос через Depends."""
    if implementation.__abstractmethods__:
        missing = ", ".join(sorted(implementation.__abstractmethods__))
        raise TypeError(f"{implementation.__name__} не реализует: {missing}")

    router = APIRouter(tags=["news"])
    Service = Annotated[NewsApi, Depends(implementation)]

    @router.get(
        "/news_publications",
        operation_id="getNews",
        status_code=200,
        response_model=PublicationPage,
    )
    def get_news(
        service: Service,
        page_number: Annotated[int, Query(alias="pageNumber", ge=0, le=1000000)] = 0,
        page_size: Annotated[int, Query(alias="pageSize", ge=1, le=1000)] = 10,
    ) -> PublicationPage:
        return service.get_news(page_number=page_number, page_size=page_size)

    @router.post(
        "/news_publications",
        operation_id="createNews",
        status_code=201,
        response_model=PublicationResponse,
        dependencies=[Depends(require_session_cookie)],
    )
    def create_news(
        service: Service,
        title: Annotated[str, Form(min_length=1, max_length=300)],
        description: Annotated[str | None, Form(max_length=20000)] = None,
        files: Annotated[list[UploadFile] | None, File(max_length=10)] = None,
    ) -> PublicationResponse:
        return service.create_news(title=title, description=description, files=files)

    return router
