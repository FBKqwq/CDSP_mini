import hashlib
import secrets
from datetime import timedelta

from app.core.errors import (
    AccountDisabledError,
    AccountLockedError,
    AuthInvalidError,
    FeatureNotImplementedError,
    TokenExpiredError,
    TokenInvalidError,
)
from app.core.timeutil import to_epoch_ms, utcnow
from app.core.ulid import new_ulid
from app.modules.auth.ports import AuthRepository
from app.modules.auth.schemas import LoginRequest, LoginResponse, UserSummary


class AuthService:
    def __init__(
        self,
        repository: AuthRepository | None = None,
        *,
        session_ttl_hours: int = 8,
        lock_threshold: int = 5,
        lock_minutes: int = 15,
    ) -> None:
        self._repository_adapter = repository
        self._session_ttl_hours = session_ttl_hours
        self._lock_threshold = lock_threshold
        self._lock_minutes = lock_minutes

    def _repository(self) -> AuthRepository:
        if self._repository_adapter is None:
            raise FeatureNotImplementedError("认证数据仓储")
        return self._repository_adapter

    async def login(self, payload: LoginRequest) -> LoginResponse:
        repository = self._repository()
        user = await repository.get_user_by_username(payload.username)
        if user is None:
            raise AuthInvalidError()
        if not user.enabled:
            raise AccountDisabledError()

        now = utcnow()
        if user.locked_until is not None and user.locked_until > now:
            raise AccountLockedError()

        if user.password != payload.password:
            lock_until = now + timedelta(minutes=self._lock_minutes)
            await repository.record_login_failure(user.id, self._lock_threshold, lock_until)
            raise AuthInvalidError()

        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        expires_at = now + timedelta(hours=self._session_ttl_hours)
        await repository.create_session(
            session_id=new_ulid(),
            user_id=user.id,
            token_hash=token_hash,
            issued_at=now,
            expires_at=expires_at,
        )
        await repository.record_login_success(user.id, now)

        return LoginResponse(
            access_token=token,
            expires_at=to_epoch_ms(expires_at),
            user=UserSummary(id=user.id, display_name=user.display_name, role=user.role),
        )

    async def me(self, token: str) -> UserSummary:
        repository = self._repository()
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        session = await repository.get_session_by_token_hash(token_hash)
        if session is None or session.revoked_at is not None:
            raise TokenInvalidError()

        now = utcnow()
        if session.expires_at <= now:
            raise TokenExpiredError()
        if session.user_deleted:
            raise TokenInvalidError()
        if not session.user_enabled:
            raise AccountDisabledError()

        await repository.touch_session(session.session_id, now)
        return UserSummary(
            id=session.user_id,
            display_name=session.display_name,
            role=session.role,
        )

    async def logout(self, token: str) -> None:
        repository = self._repository()
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        session = await repository.get_session_by_token_hash(token_hash)
        # 幂等：会话不存在或已注销，均视为成功。
        if session is None or session.revoked_at is not None:
            return
        await repository.revoke_session(session.session_id, utcnow(), "user_logout")
