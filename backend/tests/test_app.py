import subprocess
import sys

import yaml
from fastapi.testclient import TestClient

from app.config import BACKEND_DIR
from app.main import SPEC_PATH, app, create_app

client = TestClient(app)
SESSION = {"dovuz_session": "test"}
FRONTEND = "http://localhost:3000"


def test_generated_code_is_up_to_date():
    result = subprocess.run(
        [sys.executable, "codegen/generate.py", "--check"],
        cwd=BACKEND_DIR,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stderr


def test_docs_are_built_from_contract():
    spec = yaml.safe_load(SPEC_PATH.read_text(encoding="utf-8"))
    assert client.get("/openapi.json").json() == spec


def test_session_operation_without_cookie_is_401():
    response = client.get("/v1/directions")
    assert response.status_code == 401
    assert response.json() == {"message": "Нужно войти в систему"}


def test_public_operation_works_without_cookie():
    response = client.get("/v1/news_publications")
    assert response.json() == {"message": "Ручка get_news ещё не реализована"}


def test_static_path_is_not_shadowed_by_parameter():
    client.cookies.update(SESSION)
    try:
        response = client.get("/v1/comments/revisions", params={"commentId": 1})
    finally:
        client.cookies.clear()
    assert response.json() == {"message": "Ручка get_comment_revisions ещё не реализована"}


def test_invalid_query_is_400_with_field_name():
    response = client.get("/v1/news_publications", params={"pageSize": 0})
    assert response.status_code == 400
    assert response.json() == {"message": "Поле «Размер страницы» не может быть меньше 1"}


def test_multipart_fields_use_frontend_names():
    client.cookies.update(SESSION)
    try:
        response = client.put("/v1/accounts", data={"firstName": "Иван", "birthDate": "31.12.2008"})
    finally:
        client.cookies.clear()
    assert response.status_code == 400
    assert response.json() == {"message": "Поле «Дата рождения»: неверная дата"}


def test_unknown_path_and_method_keep_error_format():
    assert client.get("/v1/nope").json() == {"message": "Не найдено"}
    response = client.patch("/v1/news_publications")
    assert response.status_code == 405
    assert response.json() == {"message": "Метод не поддерживается"}


def test_cors_lets_frontend_send_cookies():
    response = client.options(
        "/v1/auth/login",
        headers={
            "Origin": FRONTEND,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == FRONTEND
    assert response.headers["access-control-allow-credentials"] == "true"


def test_cors_ignores_foreign_origin():
    response = client.get("/v1/news_publications", headers={"Origin": "https://evil.example"})
    assert "access-control-allow-origin" not in response.headers


def test_unexpected_error_is_500_in_same_format_with_cors():
    broken = create_app()

    @broken.get("/v1/boom")
    def boom() -> None:
        raise RuntimeError("boom")

    response = TestClient(broken).get("/v1/boom", headers={"Origin": FRONTEND})
    assert response.status_code == 500
    assert response.json() == {"message": "Внутренняя ошибка сервера"}
    assert response.headers["access-control-allow-origin"] == FRONTEND
