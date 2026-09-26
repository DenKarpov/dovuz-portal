from typing import Any

import yaml
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import BACKEND_DIR, settings
from app.errors import CatchAllMiddleware, install_error_handlers
from app.generated.api import build_api_router
from app.generated.api.accounts import AccountsApi
from app.generated.api.auth import AuthApi
from app.generated.api.classes import ClassesApi
from app.generated.api.comments import CommentsApi
from app.generated.api.directions import DirectionsApi
from app.generated.api.files import FilesApi
from app.generated.api.moderators import ModeratorsApi
from app.generated.api.news import NewsApi
from app.generated.api.publications import PublicationsApi
from app.generated.api.roles import RolesApi
from app.generated.api.schools import SchoolsApi
from app.generated.api.subject_topics import SubjectTopicsApi
from app.generated.api.subjects import SubjectsApi
from app.stubs import not_implemented

SPEC_PATH = BACKEND_DIR / "openapi" / "openapi.yaml"


def load_spec() -> dict[str, Any]:
    return yaml.safe_load(SPEC_PATH.read_text(encoding="utf-8"))


def create_app() -> FastAPI:
    spec = load_spec()
    app = FastAPI(
        title=spec["info"]["title"],
        version=spec["info"]["version"],
        docs_url="/docs",
        redoc_url=None,
        openapi_url="/openapi.json",
    )
    # В /docs — сам контракт, а не схема, которую FastAPI вывел бы из кода
    app.openapi = lambda: spec

    install_error_handlers(app)
    app.add_middleware(CatchAllMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Реализаций пока нет: каждая ручка отвечает 501. Готовый сервис подставляется вместо заглушки
    api = build_api_router(
        auth=not_implemented(AuthApi),
        accounts=not_implemented(AccountsApi),
        roles=not_implemented(RolesApi),
        directions=not_implemented(DirectionsApi),
        subjects=not_implemented(SubjectsApi),
        subject_topics=not_implemented(SubjectTopicsApi),
        publications=not_implemented(PublicationsApi),
        news=not_implemented(NewsApi),
        comments=not_implemented(CommentsApi),
        files=not_implemented(FilesApi),
        schools=not_implemented(SchoolsApi),
        classes=not_implemented(ClassesApi),
        moderators=not_implemented(ModeratorsApi),
    )
    app.include_router(api, prefix="/v1")
    return app


app = create_app()
