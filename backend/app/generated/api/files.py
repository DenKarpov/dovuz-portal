# Сгенерировано codegen/generate.py из openapi/openapi.yaml, руками не править.

from abc import ABC, abstractmethod
from typing import Annotated

from fastapi import APIRouter, Depends, Path, Response


class FilesApi(ABC):
    """Ручки тега «files». Реализация наследуется от этого класса."""

    @abstractmethod
    def get_photo(self, *, filename: str) -> Response:
        """Картинка для `<img src>`

        Доступ как у скачивания. JPEG, PNG, GIF и WebP отдаются для показа в браузере,
        остальные файлы — как вложение."""

    @abstractmethod
    def download_file(self, *, file_name_in_directory: str) -> Response:
        """Скачать файл

        Вложения новостей и аватарки открыты всем, остальное — после входа."""


def build_router(implementation: type[FilesApi]) -> APIRouter:
    """Роутер тега «files»: реализация создаётся на каждый запрос через Depends."""
    if implementation.__abstractmethods__:
        missing = ", ".join(sorted(implementation.__abstractmethods__))
        raise TypeError(f"{implementation.__name__} не реализует: {missing}")

    router = APIRouter(tags=["files"])
    Service = Annotated[FilesApi, Depends(implementation)]

    @router.get(
        "/files/photos/{filename}",
        operation_id="getPhoto",
        status_code=200,
        response_model=None,
    )
    def get_photo(
        service: Service,
        filename: Annotated[str, Path()],
    ) -> Response:
        return service.get_photo(filename=filename)

    @router.get(
        "/files/{fileNameInDirectory}",
        operation_id="downloadFile",
        status_code=200,
        response_model=None,
    )
    def download_file(
        service: Service,
        file_name_in_directory: Annotated[str, Path(alias="fileNameInDirectory")],
    ) -> Response:
        return service.download_file(file_name_in_directory=file_name_in_directory)

    return router
