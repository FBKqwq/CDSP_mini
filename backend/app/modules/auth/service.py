from datetime import datetime, timedelta, timezone

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import BusinessError
from app.core.ids import new_ulid
from app.core.security import generate_access_token, hash_token
from app.db.models import AppUser, AuthSession
from app.db.session import get_db
from app.modules.auth.schemas import (
    LoginData,
    LoginRequest,
    UserSummary,
)


def utc_now() -> datetime:
    """Return naive UTC datetime for MySQL DATETIME columns."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def login(self, payload: LoginRequest) -> LoginData:
        now = utc_now()

        user = self.db.scalar(
            select(AppUser)
            .where(
                AppUser.username == payload.username,
                AppUser.deleted_at.is_(None),
            )
            .with_for_update()
        )

        # 账号不存在和密码错误统一返回 AUTH_INVALID
        if user is None:
            raise BusinessError(
                "AUTH_INVALID",
                "账号或密码错误",
                401,
            )

        # 账号已停用
        if not user.enabled:
            raise BusinessError(
                "ACCOUNT_DISABLED",
                "账号已停用",
                403,
            )

        # 当前仍处于锁定期
        if user.locked_until is not None and user.locked_until > now:
            raise BusinessError(
                "ACCOUNT_LOCKED",
                "账号暂时锁定",
                423,
            )

        # 上一次锁定已经到期，重新开始计算失败次数
        if user.locked_until is not None and user.locked_until <= now:
            user.locked_until = None
            user.failed_login_count = 0

        # 当前需求要求与数据库明文密码比较
        if user.password != payload.password:
            user.failed_login_count += 1

            # 连续五次密码错误，锁定十五分钟
            if user.failed_login_count >= 5:
                user.locked_until = now + timedelta(minutes=15)

            self.db.commit()

            raise BusinessError(
                "AUTH_INVALID",
                "账号或密码错误",
                401,
            )

        # 登录成功，生成随机 Token
        access_token = generate_access_token()

        # 数据库只保存 Token 的 SHA-256 摘要
        auth_session = AuthSession(
            id=new_ulid(),
            user_id=user.id,
            token_jti_hash=hash_token(access_token),
            issued_at=now,
            expires_at=now + timedelta(hours=8),
        )

        # 成功登录后清空失败状态
        user.failed_login_count = 0
        user.locked_until = None
        user.last_login_at = now

        self.db.add(auth_session)
        self.db.commit()

        self.db.refresh(auth_session)
        self.db.refresh(user)

        return LoginData(
            access_token=access_token,
            expires_at=auth_session.expires_at,
            user=UserSummary(
                id=user.id,
                display_name=user.display_name,
                role=user.role,
            ),
        )

    def get_current_user(self, access_token: str) -> AppUser:
        now = utc_now()
        token_hash = hash_token(access_token)

        auth_session = self.db.scalar(
            select(AuthSession).where(
                AuthSession.token_jti_hash == token_hash
            )
        )

        # Token 不存在
        if auth_session is None:
            raise BusinessError(
                "TOKEN_INVALID",
                "登录状态无效",
                401,
            )

        # Token 已吊销
        if auth_session.revoked_at is not None:
            raise BusinessError(
                "TOKEN_INVALID",
                "登录状态无效",
                401,
            )

        # Token 已过期
        if auth_session.expires_at <= now:
            raise BusinessError(
                "TOKEN_EXPIRED",
                "登录状态已过期",
                401,
            )

        user = self.db.scalar(
            select(AppUser).where(
                AppUser.id == auth_session.user_id,
                AppUser.deleted_at.is_(None),
            )
        )

        # 用户不存在或已被逻辑删除
        if user is None:
            raise BusinessError(
                "TOKEN_INVALID",
                "登录状态无效",
                401,
            )

        # 用户已停用
        if not user.enabled:
            raise BusinessError(
                "ACCOUNT_DISABLED",
                "账号已停用",
                403,
            )

        # 更新当前 Session 最近访问时间
        auth_session.last_seen_at = now
        self.db.commit()

        return user

    def me(self, access_token: str) -> UserSummary:
        user = self.get_current_user(access_token)

        return UserSummary(
            id=user.id,
            display_name=user.display_name,
            role=user.role,
        )

    def logout(self, access_token: str) -> None:
        now = utc_now()
        token_hash = hash_token(access_token)

        auth_session = self.db.scalar(
            select(AuthSession).where(
                AuthSession.token_jti_hash == token_hash
            )
        )

        # Token 根本不存在
        if auth_session is None:
            raise BusinessError(
                "TOKEN_INVALID",
                "登录状态无效",
                401,
            )

        # logout 必须幂等，已经退出过则仍然视为成功
        if auth_session.revoked_at is not None:
            return

        auth_session.revoked_at = now
        auth_session.revoke_reason = "user_logout"

        self.db.commit()


def get_auth_service(
    db: Session = Depends(get_db),
) -> AuthService:
    return AuthService(db)