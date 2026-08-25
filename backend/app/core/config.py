import os
from dataclasses import dataclass
from functools import lru_cache

from dotenv import load_dotenv


load_dotenv()


def _csv_env(name: str) -> tuple[str, ...]:
    return tuple(
        item.strip()
        for item in os.getenv(name, "").split(",")
        if item.strip()
    )


@dataclass(frozen=True, slots=True)
class Settings:
    app_name: str = "CDSP Mini API"
    version: str = "0.1.0"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"
    cors_origins: tuple[str, ...] = ()

    db_host: str = "127.0.0.1"
    db_port: int = 3306
    db_name: str = ""
    db_user: str = ""
    db_password: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings(
        app_name=os.getenv("CDSP_APP_NAME", "CDSP Mini API"),
        environment=os.getenv("CDSP_ENVIRONMENT", "development"),
        api_v1_prefix=os.getenv("CDSP_API_V1_PREFIX", "/api/v1"),
        cors_origins=_csv_env("CDSP_CORS_ORIGINS"),
        db_host=os.getenv("CMEAGENT_DB_HOST", "127.0.0.1"),
        db_port=int(os.getenv("CMEAGENT_DB_PORT", "3306")),
        db_name=os.getenv("CMEAGENT_DB_NAME", ""),
        db_user=os.getenv("CMEAGENT_DB_USER", ""),
        db_password=os.getenv("CMEAGENT_DB_PASSWORD", ""),
    )