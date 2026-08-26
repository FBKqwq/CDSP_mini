import asyncio

from app.infrastructure import auth_repository as auth_repository_module
from app.infrastructure.auth_repository import MySqlAuthRepository


class FakeCursor:
    def __init__(self) -> None:
        self.executions: list[tuple[str, tuple[str, str]]] = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, _exc_type, _exc, _traceback):
        return False

    async def execute(self, sql: str, parameters: tuple[str, str]) -> None:
        self.executions.append((sql, parameters))


class FakeConnection:
    def __init__(self, cursor: FakeCursor) -> None:
        self._cursor = cursor

    async def __aenter__(self):
        return self

    async def __aexit__(self, _exc_type, _exc, _traceback):
        return False

    def cursor(self) -> FakeCursor:
        return self._cursor


class FakePool:
    def __init__(self, cursor: FakeCursor) -> None:
        self._connection = FakeConnection(cursor)

    def acquire(self) -> FakeConnection:
        return self._connection


def test_revoke_session_is_one_atomic_idempotent_update(monkeypatch):
    cursor = FakeCursor()

    async def fake_get_pool():
        return FakePool(cursor)

    monkeypatch.setattr(auth_repository_module, "get_pool", fake_get_pool)

    asyncio.run(
        MySqlAuthRepository().revoke_session_by_token_hash(
            "hashed-token",
            "user_logout",
        )
    )

    assert len(cursor.executions) == 1
    sql, parameters = cursor.executions[0]
    normalized_sql = " ".join(sql.split()).upper()
    assert normalized_sql.startswith("UPDATE AUTH_SESSION")
    assert "WHEN REVOKED_AT IS NULL THEN %S" in normalized_sql
    assert "REVOKED_AT = COALESCE(REVOKED_AT, CURRENT_TIMESTAMP(3))" in normalized_sql
    assert "WHERE TOKEN_JTI_HASH = %S" in normalized_sql
    assert parameters == ("user_logout", "hashed-token")
