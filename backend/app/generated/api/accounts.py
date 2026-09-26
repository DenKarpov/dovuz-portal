# Сгенерировано codegen/generate.py из openapi/openapi.yaml, руками не править.

from abc import ABC, abstractmethod
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Path, Query, UploadFile

from app.generated.models import (
    AccountResponse,
    AccountUpdateRoleResponse,
    AdminRegisterRequest,
    AdminUpdateProfileRequest,
    ChangePasswordRequest,
    CourseProgressResponse,
    GetAllUserResponse,
    StatusAccountResponse,
    UpdateRoleRequest,
    UserPage,
)
from app.generated.security import require_session_cookie


class AccountsApi(ABC):
    """Ручки тега «accounts». Реализация наследуется от этого класса."""

    @abstractmethod
    def get_all_users(self, *, page_number: int, page_size: int) -> UserPage:
        """Все пользователи

        Только для администратора."""

    @abstractmethod
    def save_info(
        self,
        *,
        nickname: str | None,
        first_name: str | None,
        last_name: str | None,
        middle_name: str | None,
        birth_date: date | None,
        description: str | None,
        school_id: int | None,
        class_id: int | None,
        photo: UploadFile | None,
    ) -> AccountResponse:
        """Правка своего профиля

        Меняются только переданные поля. Школа и класс проверяются на
        согласованность: класс должен принадлежать выбранной школе."""

    @abstractmethod
    def admin_register_user(self, *, body: AdminRegisterRequest) -> GetAllUserResponse:
        """Создать пользователя администратором

        Без `role_id` создаётся «Пользователь»."""

    @abstractmethod
    def get_by_class(self, *, class_id: int, page_number: int, page_size: int) -> UserPage:
        """Пользователи класса

        Модераторам и администратору — любой класс, ученику — только свой."""

    @abstractmethod
    def change_password(self, *, body: ChangePasswordRequest) -> None:
        """Сменить пароль

        Остальные сессии пользователя закрываются, текущая остаётся."""

    @abstractmethod
    def get_by_school(self, *, school_id: int, page_number: int, page_size: int) -> UserPage:
        """Пользователи школы

        Для модераторов и администратора."""

    @abstractmethod
    def get_account(self, *, account: str) -> AccountResponse:
        """Профиль по никнейму

        Email виден владельцу профиля, модераторам и администратору, остальным — `null`."""

    @abstractmethod
    def delete_user(self, *, account: int) -> None:
        """Удалить пользователя

        Только для администратора, себя удалить нельзя."""

    @abstractmethod
    def ban_user(self, *, id: int) -> StatusAccountResponse:
        """Заблокировать

        Закрывает все сессии пользователя. Только для администратора."""

    @abstractmethod
    def get_course_progress(self, *, nickname: str) -> list[CourseProgressResponse]:
        """Прогресс по курсам

        По каждому курсу пользователя — занятия, баллы и статусы слушаний."""

    @abstractmethod
    def admin_update_user(self, *, id: int, body: AdminUpdateProfileRequest) -> GetAllUserResponse:
        """Правка профиля администратором

        Меняются только переданные поля. `null` в `school_id` отвязывает от школы
        и класса, `null` в `class_id` — только от класса."""

    @abstractmethod
    def update_role(self, *, id: int, body: UpdateRoleRequest) -> AccountUpdateRoleResponse:
        """Сменить роль

        Только для администратора, свою роль сменить нельзя. При снятии роли
        модератора снимаются и его назначения на предметы."""

    @abstractmethod
    def unban_user(self, *, id: int) -> StatusAccountResponse:
        """Разблокировать"""


def build_router(implementation: type[AccountsApi]) -> APIRouter:
    """Роутер тега «accounts»: реализация создаётся на каждый запрос через Depends."""
    if implementation.__abstractmethods__:
        missing = ", ".join(sorted(implementation.__abstractmethods__))
        raise TypeError(f"{implementation.__name__} не реализует: {missing}")

    router = APIRouter(tags=["accounts"])
    Service = Annotated[AccountsApi, Depends(implementation)]

    @router.get(
        "/accounts",
        operation_id="getAllUsers",
        status_code=200,
        response_model=UserPage,
        dependencies=[Depends(require_session_cookie)],
    )
    def get_all_users(
        service: Service,
        page_number: Annotated[int, Query(alias="pageNumber", ge=0, le=1000000)] = 0,
        page_size: Annotated[int, Query(alias="pageSize", ge=1, le=1000)] = 10,
    ) -> UserPage:
        return service.get_all_users(page_number=page_number, page_size=page_size)

    @router.put(
        "/accounts",
        operation_id="saveInfo",
        status_code=200,
        response_model=AccountResponse,
        dependencies=[Depends(require_session_cookie)],
    )
    def save_info(
        service: Service,
        nickname: Annotated[
            str | None, Form(pattern="^[A-Za-zА-Яа-яЁё0-9][A-Za-zА-Яа-яЁё0-9_.-]{2,31}$")
        ] = None,
        first_name: Annotated[str | None, Form(alias="firstName", max_length=100)] = None,
        last_name: Annotated[str | None, Form(alias="lastName", max_length=100)] = None,
        middle_name: Annotated[str | None, Form(alias="middleName", max_length=100)] = None,
        birth_date: Annotated[date | None, Form(alias="birthDate")] = None,
        description: Annotated[str | None, Form(max_length=2000)] = None,
        school_id: Annotated[int | None, Form(alias="schoolId")] = None,
        class_id: Annotated[int | None, Form(alias="classId")] = None,
        photo: Annotated[UploadFile | None, File()] = None,
    ) -> AccountResponse:
        return service.save_info(
            nickname=nickname,
            first_name=first_name,
            last_name=last_name,
            middle_name=middle_name,
            birth_date=birth_date,
            description=description,
            school_id=school_id,
            class_id=class_id,
            photo=photo,
        )

    @router.post(
        "/accounts/admin/register",
        operation_id="adminRegisterUser",
        status_code=201,
        response_model=GetAllUserResponse,
        dependencies=[Depends(require_session_cookie)],
    )
    def admin_register_user(
        service: Service,
        body: AdminRegisterRequest,
    ) -> GetAllUserResponse:
        return service.admin_register_user(body=body)

    @router.get(
        "/accounts/class/{classId}",
        operation_id="getByClass",
        status_code=200,
        response_model=UserPage,
        dependencies=[Depends(require_session_cookie)],
    )
    def get_by_class(
        service: Service,
        class_id: Annotated[int, Path(alias="classId")],
        page_number: Annotated[int, Query(alias="pageNumber", ge=0, le=1000000)] = 0,
        page_size: Annotated[int, Query(alias="pageSize", ge=1, le=1000)] = 10,
    ) -> UserPage:
        return service.get_by_class(class_id=class_id, page_number=page_number, page_size=page_size)

    @router.put(
        "/accounts/me/password",
        operation_id="changePassword",
        status_code=204,
        response_model=None,
        dependencies=[Depends(require_session_cookie)],
    )
    def change_password(
        service: Service,
        body: ChangePasswordRequest,
    ) -> None:
        return service.change_password(body=body)

    @router.get(
        "/accounts/school/{schoolId}",
        operation_id="getBySchool",
        status_code=200,
        response_model=UserPage,
        dependencies=[Depends(require_session_cookie)],
    )
    def get_by_school(
        service: Service,
        school_id: Annotated[int, Path(alias="schoolId")],
        page_number: Annotated[int, Query(alias="pageNumber", ge=0, le=1000000)] = 0,
        page_size: Annotated[int, Query(alias="pageSize", ge=1, le=1000)] = 10,
    ) -> UserPage:
        return service.get_by_school(
            school_id=school_id, page_number=page_number, page_size=page_size
        )

    @router.get(
        "/accounts/{account}",
        operation_id="getAccount",
        status_code=200,
        response_model=AccountResponse,
        dependencies=[Depends(require_session_cookie)],
    )
    def get_account(
        service: Service,
        account: Annotated[str, Path(min_length=1)],
    ) -> AccountResponse:
        return service.get_account(account=account)

    @router.delete(
        "/accounts/{account}",
        operation_id="deleteUser",
        status_code=204,
        response_model=None,
        dependencies=[Depends(require_session_cookie)],
    )
    def delete_user(
        service: Service,
        account: Annotated[int, Path()],
    ) -> None:
        return service.delete_user(account=account)

    @router.post(
        "/accounts/{id}/ban",
        operation_id="banUser",
        status_code=200,
        response_model=StatusAccountResponse,
        dependencies=[Depends(require_session_cookie)],
    )
    def ban_user(
        service: Service,
        id: Annotated[int, Path()],
    ) -> StatusAccountResponse:
        return service.ban_user(id=id)

    @router.get(
        "/accounts/{nickname}/course-progress",
        operation_id="getCourseProgress",
        status_code=200,
        response_model=list[CourseProgressResponse],
        dependencies=[Depends(require_session_cookie)],
    )
    def get_course_progress(
        service: Service,
        nickname: Annotated[str, Path(min_length=1)],
    ) -> list[CourseProgressResponse]:
        return service.get_course_progress(nickname=nickname)

    @router.patch(
        "/accounts/{id}/profile",
        operation_id="adminUpdateUser",
        status_code=200,
        response_model=GetAllUserResponse,
        dependencies=[Depends(require_session_cookie)],
    )
    def admin_update_user(
        service: Service,
        id: Annotated[int, Path()],
        body: AdminUpdateProfileRequest,
    ) -> GetAllUserResponse:
        return service.admin_update_user(id=id, body=body)

    @router.put(
        "/accounts/{id}/role",
        operation_id="updateRole",
        status_code=200,
        response_model=AccountUpdateRoleResponse,
        dependencies=[Depends(require_session_cookie)],
    )
    def update_role(
        service: Service,
        id: Annotated[int, Path()],
        body: UpdateRoleRequest,
    ) -> AccountUpdateRoleResponse:
        return service.update_role(id=id, body=body)

    @router.post(
        "/accounts/{id}/unban",
        operation_id="unbanUser",
        status_code=200,
        response_model=StatusAccountResponse,
        dependencies=[Depends(require_session_cookie)],
    )
    def unban_user(
        service: Service,
        id: Annotated[int, Path()],
    ) -> StatusAccountResponse:
        return service.unban_user(id=id)

    return router
