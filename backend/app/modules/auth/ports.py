from dataclasses import dataclass
from datetime import datetime
from typing import Protocol


@dataclass(frozen=True, slots=True)
class AppUserRecord:
    id: str
    username: str
    password: str
    display_name: str
    role: str
    enabled: bool
    locked_until: datetime | None


@dataclass(frozen=True, slots=True)
class SessionRecord:
    session_id: str
    user_id: str
    display_name: str
    role: str
    expires_at: datetime
    revoked_at: datetime | None
    user_enabled: bool
    user_deleted: bool


class AuthRepository(Protocol):
    """认证数据的持久化边界（app_user / auth_session）。"""

    async def get_user_by_username(self, username: str) -> AppUserRecord | None: ...

    async def record_login_failure(
        self,
        user_id: str,
        threshold: int,
        lock_until: datetime,
    ) -> None: ...

    async def record_login_success(self, user_id: str, at: datetime) -> None: ...

    async def create_session(
        self,
        *,
        session_id: str,
        user_id: str,
        token_hash: str,
        issued_at: datetime,
        expires_at: datetime,
    ) -> None: ...

    async def get_session_by_token_hash(self, token_hash: str) -> SessionRecord | None: ...

    async def touch_session(self, session_id: str, at: datetime) -> None: ...
