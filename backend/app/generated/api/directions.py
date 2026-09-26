# Сгенерировано codegen/generate.py из openapi/openapi.yaml, руками не править.

from abc import ABC, abstractmethod
from typing import Annotated

from fastapi import APIRouter, Depends, Path

from app.generated.models import DirectionResponse, NameRequest
from app.generated.security import require_session_cookie


class DirectionsApi(ABC):
    """Ручки тега «directions». Реализация наследуется от этого класса."""

    @abstractmethod
    def get_directions(self) -> list[DirectionResponse]:
        """Все направления"""

    @abstractmethod
    def create_direction(self, *, body: NameRequest) -> DirectionResponse:
        """Создать направление

        Только для администратора. Название уникально без учёта регистра."""

    @abstractmethod
    def get_direction(self, *, id: int) -> DirectionResponse:
        """Направление по id"""

    @abstractmethod
    def update_direction(self, *, id: int, body: NameRequest) -> DirectionResponse:
        """Переименовать направление"""

    @abstractmethod
    def delete_direction(self, *, id: int) -> None:
        """Удалить направление

        Вместе с предметами, темами, публикациями и их файлами."""


def build_router(implementation: type[DirectionsApi]) -> APIRouter:
    """Роутер тега «directions»: реализация создаётся на каждый запрос через Depends."""
    if implementation.__abstractmethods__:
        missing = ", ".join(sorted(implementation.__abstractmethods__))
        raise TypeError(f"{implementation.__name__} не реализует: {missing}")

    router = APIRouter(tags=["directions"])
    Service = Annotated[DirectionsApi, Depends(implementation)]

    @router.get(
        "/directions",
        operation_id="getDirections",
        status_code=200,
        response_model=list[DirectionResponse],
        dependencies=[Depends(require_session_cookie)],
    )
    def get_directions(
        service: Service,
    ) -> list[DirectionResponse]:
        return service.get_directions()

    @router.post(
        "/directions",
        operation_id="createDirection",
        status_code=201,
        response_model=DirectionResponse,
        dependencies=[Depends(require_session_cookie)],
    )
    def create_direction(
        service: Service,
        body: NameRequest,
    ) -> DirectionResponse:
        return service.create_direction(body=body)

    @router.get(
        "/directions/{id}",
        operation_id="getDirection",
        status_code=200,
        response_model=DirectionResponse,
        dependencies=[Depends(require_session_cookie)],
    )
    def get_direction(
        service: Service,
        id: Annotated[int, Path()],
    ) -> DirectionResponse:
        return service.get_direction(id=id)

    @router.put(
        "/directions/{id}",
        operation_id="updateDirection",
        status_code=200,
        response_model=DirectionResponse,
        dependencies=[Depends(require_session_cookie)],
    )
    def update_direction(
        service: Service,
        id: Annotated[int, Path()],
        body: NameRequest,
    ) -> DirectionResponse:
        return service.update_direction(id=id, body=body)

    @router.delete(
        "/directions/{id}",
        operation_id="deleteDirection",
        status_code=204,
        response_model=None,
        dependencies=[Depends(require_session_cookie)],
    )
    def delete_direction(
        service: Service,
        id: Annotated[int, Path()],
    ) -> None:
        return service.delete_direction(id=id)

    return router
