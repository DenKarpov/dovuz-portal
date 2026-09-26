from typing import Any

from app.errors import ApiError


def not_implemented[ApiT](api: type[ApiT]) -> type[ApiT]:
    """Реализация-заглушка сгенерированного *Api: каждая ручка отвечает 501.

    Позволяет подключать настоящие реализации по одному тегу, не ломая остальные.
    """

    def stub(name: str):
        def method(self: Any, **_: Any) -> Any:
            raise ApiError(501, f"Ручка {name} ещё не реализована")

        return method

    methods = {name: stub(name) for name in getattr(api, "__abstractmethods__", ())}
    return type(f"{api.__name__}Stub", (api,), methods)
