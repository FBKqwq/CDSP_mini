from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.errors import BusinessError
from app.db.models import AppUser
from app.modules.auth.service import AuthService, get_auth_service


bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    service: AuthService = Depends(get_auth_service),
) -> AppUser:
    if credentials is None:
        raise BusinessError(
            "TOKEN_INVALID",
            "登录状态无效",
            401,
        )

    if credentials.scheme.lower() != "bearer":
        raise BusinessError(
            "TOKEN_INVALID",
            "登录状态无效",
            401,
        )

    return service.get_current_user(
        credentials.credentials
    )