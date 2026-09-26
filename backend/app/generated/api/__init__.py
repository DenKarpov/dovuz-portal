# Сгенерировано codegen/generate.py из openapi/openapi.yaml, руками не править.

from fastapi import APIRouter

from app.generated.api import accounts as accounts_api
from app.generated.api import auth as auth_api
from app.generated.api import classes as classes_api
from app.generated.api import comments as comments_api
from app.generated.api import directions as directions_api
from app.generated.api import files as files_api
from app.generated.api import moderators as moderators_api
from app.generated.api import news as news_api
from app.generated.api import publications as publications_api
from app.generated.api import roles as roles_api
from app.generated.api import schools as schools_api
from app.generated.api import subject_topics as subject_topics_api
from app.generated.api import subjects as subjects_api


def build_api_router(
    *,
    auth: type[auth_api.AuthApi],
    accounts: type[accounts_api.AccountsApi],
    roles: type[roles_api.RolesApi],
    directions: type[directions_api.DirectionsApi],
    subjects: type[subjects_api.SubjectsApi],
    subject_topics: type[subject_topics_api.SubjectTopicsApi],
    publications: type[publications_api.PublicationsApi],
    news: type[news_api.NewsApi],
    comments: type[comments_api.CommentsApi],
    files: type[files_api.FilesApi],
    schools: type[schools_api.SchoolsApi],
    classes: type[classes_api.ClassesApi],
    moderators: type[moderators_api.ModeratorsApi],
) -> APIRouter:
    """Все ручки спеки. Реализацию нужно передать для каждого тега."""
    router = APIRouter()
    router.include_router(auth_api.build_router(auth))
    router.include_router(accounts_api.build_router(accounts))
    router.include_router(roles_api.build_router(roles))
    router.include_router(directions_api.build_router(directions))
    router.include_router(subjects_api.build_router(subjects))
    router.include_router(subject_topics_api.build_router(subject_topics))
    router.include_router(publications_api.build_router(publications))
    router.include_router(news_api.build_router(news))
    router.include_router(comments_api.build_router(comments))
    router.include_router(files_api.build_router(files))
    router.include_router(schools_api.build_router(schools))
    router.include_router(classes_api.build_router(classes))
    router.include_router(moderators_api.build_router(moderators))
    return router
