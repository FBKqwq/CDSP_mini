from datetime import datetime

from app.infrastructure.db import get_pool
from app.modules.auth.ports import AppUserRecord, SessionRecord


class MySqlAuthRepository:
    """app_user / auth_session 两表的 MySQL 仓储实现。"""

    async def get_user_by_username(self, username: str) -> AppUserRecord | None:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    SELECT id, username, password, display_name, role, enabled, locked_until
                    FROM app_user
                    WHERE username = %s AND deleted_at IS NULL
                    LIMIT 1
                    """,
                    (username,),
                )
                row = await cur.fetchone()
        if row is None:
            return None
        return AppUserRecord(
            id=row["id"],
            username=row["username"],
            password=row["password"],
            display_name=row["display_name"],
            role=row["role"],
            enabled=bool(row["enabled"]),
            locked_until=row["locked_until"],
        )

    async def record_login_failure(
        self,
        user_id: str,
        threshold: int,
        lock_until: datetime,
    ) -> None:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    UPDATE app_user
                    SET failed_login_count = failed_login_count + 1,
                        locked_until = CASE
                            WHEN failed_login_count + 1 >= %s THEN %s
                            ELSE locked_until
                        END
                    WHERE id = %s
                    """,
                    (threshold, lock_until, user_id),
                )

    async def record_login_success(self, user_id: str, at: datetime) -> None:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    UPDATE app_user
                    SET failed_login_count = 0,
                        locked_until = NULL,
                        last_login_at = %s
                    WHERE id = %s
                    """,
                    (at, user_id),
                )

    async def create_session(
        self,
        *,
        session_id: str,
        user_id: str,
        token_hash: str,
        issued_at: datetime,
        expires_at: datetime,
    ) -> None:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    INSERT INTO auth_session (id, user_id, token_jti_hash, issued_at, expires_at)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (session_id, user_id, token_hash, issued_at, expires_at),
                )

    async def get_session_by_token_hash(self, token_hash: str) -> SessionRecord | None:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    SELECT
                        s.id AS session_id,
                        s.user_id,
                        s.expires_at,
                        s.revoked_at,
                        u.display_name,
                        u.role,
                        u.enabled,
                        u.deleted_at
                    FROM auth_session s
                    JOIN app_user u ON u.id = s.user_id
                    WHERE s.token_jti_hash = %s
                    LIMIT 1
                    """,
                    (token_hash,),
                )
                row = await cur.fetchone()
        if row is None:
            return None
        return SessionRecord(
            session_id=row["session_id"],
            user_id=row["user_id"],
            display_name=row["display_name"],
            role=row["role"],
            expires_at=row["expires_at"],
            revoked_at=row["revoked_at"],
            user_enabled=bool(row["enabled"]),
            user_deleted=row["deleted_at"] is not None,
        )

    async def touch_session(self, session_id: str, at: datetime) -> None:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "UPDATE auth_session SET last_seen_at = %s WHERE id = %s",
                    (at, session_id),
                )
