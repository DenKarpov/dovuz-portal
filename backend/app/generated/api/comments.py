# Сгенерировано codegen/generate.py из openapi/openapi.yaml, руками не править.

from abc import ABC, abstractmethod
from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query

from app.generated.models import (
    CommentCreateRequest,
    CommentPage,
    CommentReplyRequest,
    CommentResponse,
    CommentRevisionResponse,
    CommentUpdateRequest,
)
from app.generated.security import require_session_cookie


class CommentsApi(ABC):
    """Ручки тега «comments». Реализация наследуется от этого класса."""

    @abstractmethod
    def get_comments(self, *, publication_id: int, page_number: int, page_size: int) -> CommentPage:
        """Комментарии к публикации

        Только комментарии верхнего уровня, новые сверху. Для новостей открыты всем."""

    @abstractmethod
    def create_comment(self, *, body: CommentCreateRequest) -> CommentResponse:
        """Оставить комментарий"""

    @abstractmethod
    def update_comment(self, *, body: CommentUpdateRequest) -> CommentResponse:
        """Изменить свой комментарий"""

    @abstractmethod
    def create_comment_reply(self, *, body: CommentReplyRequest) -> CommentResponse:
        """Ответить на комментарий

        Вложенность двухуровневая — отвечать можно только на комментарий верхнего уровня."""

    @abstractmethod
    def get_comment_revisions(self, *, comment_id: int) -> list[CommentRevisionResponse]:
        """История правок комментария

        Для модераторов и администратора. Доступна и после удаления комментария."""

    @abstractmethod
    def get_comment(self, *, id: int) -> CommentResponse:
        """Комментарий по id"""

    @abstractmethod
    def delete_comment(self, *, id: int) -> None:
        """Удалить комментарий

        Свой — автор, любой — администратор, в публикациях предмета —
        назначенный на него модератор. Удаляется вместе с ответами."""

    @abstractmethod
    def get_comment_replies(self, *, id: int, page_number: int, page_size: int) -> CommentPage:
        """Ответы на комментарий

        В порядке написания."""


def build_router(implementation: type[CommentsApi]) -> APIRouter:
    """Роутер тега «comments»: реализация создаётся на каждый запрос через Depends."""
    if implementation.__abstractmethods__:
        missing = ", ".join(sorted(implementation.__abstractmethods__))
        raise TypeError(f"{implementation.__name__} не реализует: {missing}")

    router = APIRouter(tags=["comments"])
    Service = Annotated[CommentsApi, Depends(implementation)]

    @router.get(
        "/comments",
        operation_id="getComments",
        status_code=200,
        response_model=CommentPage,
    )
    def get_comments(
        service: Service,
        publication_id: Annotated[int, Query(alias="publicationId")],
        page_number: Annotated[int, Query(alias="pageNumber", ge=0, le=1000000)] = 0,
        page_size: Annotated[int, Query(alias="pageSize", ge=1, le=1000)] = 10,
    ) -> CommentPage:
        return service.get_comments(
            publication_id=publication_id, page_number=page_number, page_size=page_size
        )

    @router.post(
        "/comments",
        operation_id="createComment",
        status_code=201,
        response_model=CommentResponse,
        dependencies=[Depends(require_session_cookie)],
    )
    def create_comment(
        service: Service,
        body: CommentCreateRequest,
    ) -> CommentResponse:
        return service.create_comment(body=body)

    @router.put(
        "/comments",
        operation_id="updateComment",
        status_code=200,
        response_model=CommentResponse,
        dependencies=[Depends(require_session_cookie)],
    )
    def update_comment(
        service: Service,
        body: CommentUpdateRequest,
    ) -> CommentResponse:
        return service.update_comment(body=body)

    @router.post(
        "/comments/create-comment-reply",
        operation_id="createCommentReply",
        status_code=201,
        response_model=CommentResponse,
        dependencies=[Depends(require_session_cookie)],
    )
    def create_comment_reply(
        service: Service,
        body: CommentReplyRequest,
    ) -> CommentResponse:
        return service.create_comment_reply(body=body)

    @router.get(
        "/comments/revisions",
        operation_id="getCommentRevisions",
        status_code=200,
        response_model=list[CommentRevisionResponse],
        dependencies=[Depends(require_session_cookie)],
    )
    def get_comment_revisions(
        service: Service,
        comment_id: Annotated[int, Query(alias="commentId")],
    ) -> list[CommentRevisionResponse]:
        return service.get_comment_revisions(comment_id=comment_id)

    @router.get(
        "/comments/{id}",
        operation_id="getComment",
        status_code=200,
        response_model=CommentResponse,
    )
    def get_comment(
        service: Service,
        id: Annotated[int, Path()],
    ) -> CommentResponse:
        return service.get_comment(id=id)

    @router.delete(
        "/comments/{id}",
        operation_id="deleteComment",
        status_code=204,
        response_model=None,
        dependencies=[Depends(require_session_cookie)],
    )
    def delete_comment(
        service: Service,
        id: Annotated[int, Path()],
    ) -> None:
        return service.delete_comment(id=id)

    @router.get(
        "/comments/{id}/replies",
        operation_id="getCommentReplies",
        status_code=200,
        response_model=CommentPage,
    )
    def get_comment_replies(
        service: Service,
        id: Annotated[int, Path()],
        page_number: Annotated[int, Query(alias="pageNumber", ge=0, le=1000000)] = 0,
        page_size: Annotated[int, Query(alias="pageSize", ge=1, le=1000)] = 10,
    ) -> CommentPage:
        return service.get_comment_replies(id=id, page_number=page_number, page_size=page_size)

    return router
