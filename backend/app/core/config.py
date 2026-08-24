import os
from dataclasses import dataclass
from functools import lru_cache

from dotenv import load_dotenv


load_dotenv()


def _csv_env(name: str) -> tuple[str, ...]:
    return tuple(item.strip() for item in os.getenv(name, "").split(",") if item.strip())


def _int_env(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or not raw.strip():
        return default
    return int(raw)


@dataclass(frozen=True, slots=True)
class Settings:
    app_name: str = "CDSP Mini API"
    version: str = "0.1.0"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"
    cors_origins: tuple[str, ...] = ()
    # MySQL 数据源
    db_host: str = ""
    db_port: int = 3306
    db_name: str = ""
    db_user: str = ""
    db_password: str = ""
    db_pool_minsize: int = 1
    db_pool_maxsize: int = 10
    # 认证
    auth_session_ttl_hours: int = 8
    auth_lock_threshold: int = 5
    auth_lock_minutes: int = 15


@lru_cache
def get_settings() -> Settings:
    return Settings(
        app_name=os.getenv("CDSP_APP_NAME", "CDSP Mini API"),
        environment=os.getenv("CDSP_ENVIRONMENT", "development"),
        api_v1_prefix=os.getenv("CDSP_API_V1_PREFIX", "/api/v1"),
        cors_origins=_csv_env("CDSP_CORS_ORIGINS"),
        db_host=os.getenv("CMEAGENT_DB_HOST", ""),
        db_port=_int_env("CMEAGENT_DB_PORT", 3306),
        db_name=os.getenv("CMEAGENT_DB_NAME", ""),
        db_user=os.getenv("CMEAGENT_DB_USER", ""),
        db_password=os.getenv("CMEAGENT_DB_PASSWORD", ""),
        db_pool_minsize=_int_env("CDSP_DB_POOL_MIN", 1),
        db_pool_maxsize=_int_env("CDSP_DB_POOL_MAX", 10),
        auth_session_ttl_hours=_int_env("CDSP_AUTH_SESSION_TTL_HOURS", 8),
        auth_lock_threshold=_int_env("CDSP_AUTH_LOCK_THRESHOLD", 5),
        auth_lock_minutes=_int_env("CDSP_AUTH_LOCK_MINUTES", 15),
    )
