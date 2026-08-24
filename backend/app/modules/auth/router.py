from fastapi import APIRouter, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.container import get_auth_service
from app.contracts import ApiEnvelope, ok
from app.core.errors import TokenInvalidError
from app.modules.auth.schemas import LoginRequest, LoginResponse, UserSummary
from app.modules.auth.service import AuthService


router = APIRouter(prefix="/auth", tags=["Authentication"])

_bearer = HTTPBearer(auto_error=False)


async def require_bearer_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> str:
    if credentials is None or not credentials.credentials:
        raise TokenInvalidError()
    return credentials.credentials


@router.post("/login", response_model=ApiEnvelope[LoginResponse])
async def login(
    payload: LoginRequest,
    service: AuthService = Depends(get_auth_service),
) -> ApiEnvelope[LoginResponse]:
    return ok(await service.login(payload))


@router.get("/me", response_model=ApiEnvelope[UserSummary])
async def me(
    token: str = Depends(require_bearer_token),
    service: AuthService = Depends(get_auth_service),
) -> ApiEnvelope[UserSummary]:
    return ok(await service.me(token))
