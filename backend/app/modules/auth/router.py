from fastapi import APIRouter, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.contracts import ApiEnvelope, ok
from app.modules.auth.schemas import LoginData, LoginRequest, UserSummary
from app.modules.auth.service import AuthService, get_auth_service


router = APIRouter(
    prefix="/auth",
    tags=["Auth"],
)
bearer_scheme = HTTPBearer(auto_error=False)

@router.post(
    "/login",
    response_model=ApiEnvelope[LoginData],
)
async def login(
    payload: LoginRequest,
    service: AuthService = Depends(get_auth_service),
) -> ApiEnvelope[LoginData]:
    return ok(
        service.login(payload)
    )
@router.get(
    "/me",
    response_model=ApiEnvelope[UserSummary],
)
async def me(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    service: AuthService = Depends(get_auth_service),
) -> ApiEnvelope[UserSummary]:
    if credentials is None or credentials.scheme.lower() != "bearer":
        from app.core.errors import BusinessError

        raise BusinessError(
            "TOKEN_INVALID",
            "登录状态无效",
            401,
        )

    return ok(
        service.me(credentials.credentials)
    )

@router.post(
    "/logout",
    response_model=ApiEnvelope[None],
)
async def logout(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    service: AuthService = Depends(get_auth_service),
) -> ApiEnvelope[None]:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise BusinessError(
            "TOKEN_INVALID",
            "登录状态无效",
            401,
        )

    service.logout(credentials.credentials)

    return ok(None)
