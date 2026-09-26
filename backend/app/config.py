from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="DOVUZ_", env_file=BACKEND_DIR / ".env", extra="ignore"
    )

    # Фронт ходит с withCredentials, поэтому origin перечисляется явно, без «*»
    cors_origins: list[str] = ["http://localhost:3000"]


settings = Settings()
