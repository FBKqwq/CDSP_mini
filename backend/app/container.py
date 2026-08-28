"""应用装配层：将领域服务与具体基础设施适配器连接起来。"""
from functools import lru_cache

from app.core.config import get_settings
from app.infrastructure.auth_repository import MySqlAuthRepository
from app.infrastructure.clinical_repository import MySqlClinicalRepository
from app.modules.auth.service import AuthService
from app.modules.crud.service import CrudService


@lru_cache
def get_auth_service() -> AuthService:
    settings = get_settings()
    return AuthService(
        repository=MySqlAuthRepository(),
        session_ttl_hours=settings.auth_session_ttl_hours,
        lock_threshold=settings.auth_lock_threshold,
        lock_minutes=settings.auth_lock_minutes,
    )


@lru_cache
def get_crud_service() -> CrudService:
    return CrudService(repository=MySqlClinicalRepository())
