# Сгенерировано codegen/generate.py из openapi/openapi.yaml, руками не править.

from abc import ABC, abstractmethod
from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query

from app.generated.models import SubjectModeratorResponse
from app.generated.security import require_session_cookie


class ModeratorsApi(ABC):
    """Ручки тега «moderators». Реализация наследуется от этого класса."""

    @abstractmethod
    def assign_subject_moderator(
        self, *, account_id: int, subject_id: int
    ) -> SubjectModeratorResponse:
        """Назначить модератора на предмет

        Только для администратора. Назначить можно только пользователя с ролью «Модератор»."""

    @abstractmethod
    def get_my_subjects(self) -> list[SubjectModeratorResponse]:
        """Мои предметы

        Предметы, на которые назначен текущий модератор."""

    @abstractmethod
    def remove_subject_moderator(self, *, account_id: int, subject_id: int) -> None:
        """Снять модератора с предмета"""

    @abstractmethod
    def get_subject_moderators(self, *, id: int) -> list[SubjectModeratorResponse]:
        """Модераторы предмета

        Для модераторов и администратора."""


def build_router(implementation: type[ModeratorsApi]) -> APIRouter:
    """Роутер тега «moderators»: реализация создаётся на каждый запрос через Depends."""
    if implementation.__abstractmethods__:
        missing = ", ".join(sorted(implementation.__abstractmethods__))
        raise TypeError(f"{implementation.__name__} не реализует: {missing}")

    router = APIRouter(tags=["moderators"])
    Service = Annotated[ModeratorsApi, Depends(implementation)]

    @router.post(
        "/admin/moderators/assign",
        operation_id="assignSubjectModerator",
        status_code=201,
        response_model=SubjectModeratorResponse,
        dependencies=[Depends(require_session_cookie)],
    )
    def assign_subject_moderator(
        service: Service,
        account_id: Annotated[int, Query(alias="accountId")],
        subject_id: Annotated[int, Query(alias="subjectId")],
    ) -> SubjectModeratorResponse:
        return service.assign_subject_moderator(account_id=account_id, subject_id=subject_id)

    @router.get(
        "/admin/moderators/my",
        operation_id="getMySubjects",
        status_code=200,
        response_model=list[SubjectModeratorResponse],
        dependencies=[Depends(require_session_cookie)],
    )
    def get_my_subjects(
        service: Service,
    ) -> list[SubjectModeratorResponse]:
        return service.get_my_subjects()

    @router.delete(
        "/admin/moderators/remove",
        operation_id="removeSubjectModerator",
        status_code=204,
        response_model=None,
        dependencies=[Depends(require_session_cookie)],
    )
    def remove_subject_moderator(
        service: Service,
        account_id: Annotated[int, Query(alias="accountId")],
        subject_id: Annotated[int, Query(alias="subjectId")],
    ) -> None:
        return service.remove_subject_moderator(account_id=account_id, subject_id=subject_id)

    @router.get(
        "/admin/moderators/subject/{id}",
        operation_id="getSubjectModerators",
        status_code=200,
        response_model=list[SubjectModeratorResponse],
        dependencies=[Depends(require_session_cookie)],
    )
    def get_subject_moderators(
        service: Service,
        id: Annotated[int, Path()],
    ) -> list[SubjectModeratorResponse]:
        return service.get_subject_moderators(id=id)

    return router
