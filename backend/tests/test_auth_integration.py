"""登录功能集成测试：针对真实 MySQL 逐条验证失败规则与验收标准。

未配置或连不上数据库时整体跳过，不影响无数据库环境下的单元测试。
测试依赖种子账号 patient / demo123，并在每次用例前后复位其锁状态与失败计数。
"""

from datetime import timedelta

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.core.timeutil import utcnow
from app.main import create_app

TEST_USERNAME = "patient"
TEST_PASSWORD = "demo123"


def _db_connection():
    import pymysql

    settings = get_settings()
    return pymysql.connect(
        host=settings.db_host,
        port=settings.db_port,
        user=settings.db_user,
        password=settings.db_password,
        database=settings.db_name,
        charset="utf8mb4",
        autocommit=True,
        cursorclass=pymysql.cursors.DictCursor,
        connect_timeout=3,
    )


def _database_available() -> bool:
    if not get_settings().db_host:
        return False
    try:
        conn = _db_connection()
        conn.close()
        return True
    except Exception:
        return False


pytestmark = pytest.mark.skipif(
    not _database_available(),
    reason="MySQL 不可用或未配置，跳过登录集成测试",
)


def _reset_user() -> None:
    conn = _db_connection()
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE app_user SET failed_login_count=0, locked_until=NULL, enabled=1 "
            "WHERE username=%s",
            (TEST_USERNAME,),
        )
    conn.close()


def _fetch_user() -> dict:
    conn = _db_connection()
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, failed_login_count, locked_until, enabled "
            "FROM app_user WHERE username=%s",
            (TEST_USERNAME,),
        )
        row = cur.fetchone()
    conn.close()
    return row


def _session_count(user_id: str) -> int:
    conn = _db_connection()
    with conn.cursor() as cur:
        cur.execute(
            "SELECT COUNT(*) AS c FROM auth_session WHERE user_id=%s AND revoked_at IS NULL",
            (user_id,),
        )
        row = cur.fetchone()
    conn.close()
    return row["c"]


def _session_revoke_reason(token: str) -> str | None:
    import hashlib

    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    conn = _db_connection()
    with conn.cursor() as cur:
        cur.execute(
            "SELECT revoke_reason FROM auth_session WHERE token_jti_hash=%s",
            (token_hash,),
        )
        row = cur.fetchone()
    conn.close()
    return row["revoke_reason"] if row else None


@pytest.fixture(scope="module")
def client():
    app = create_app()
    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def reset_user():
    _reset_user()
    yield
    _reset_user()


def _login(client, password: str):
    return client.post(
        "/api/v1/auth/login",
        json={"username": TEST_USERNAME, "password": password},
    )


def test_login_success_creates_session_and_resets_failures(client):
    # 先制造一次失败
    resp = _login(client, "wrong")
    assert resp.status_code == 401 and resp.json()["code"] == "AUTH_INVALID"
    assert _fetch_user()["failed_login_count"] == 1

    # 正确登录
    resp = _login(client, TEST_PASSWORD)
    assert resp.status_code == 200
    body = resp.json()
    assert body["code"] == "OK"
    data = body["data"]
    assert data["accessToken"]
    assert isinstance(data["expiresAt"], int)
    assert data["user"]["role"] == "patient"
    # 返回内容不包含数据库密码字段
    assert "password" not in data
    assert "password" not in data["user"]

    # 成功登录后失败次数归零，且新增了会话
    user = _fetch_user()
    assert user["failed_login_count"] == 0
    assert _session_count(user["id"]) >= 1


def test_wrong_password_increments_count_without_session(client):
    before = _fetch_user()
    resp = _login(client, "wrong")
    assert resp.status_code == 401 and resp.json()["code"] == "AUTH_INVALID"
    assert _fetch_user()["failed_login_count"] == before["failed_login_count"] + 1


def test_unknown_account_returns_auth_invalid(client):
    resp = client.post(
        "/api/v1/auth/login",
        json={"username": "no_such_user_xyz", "password": "x"},
    )
    assert resp.status_code == 401
    assert resp.json()["code"] == "AUTH_INVALID"


def test_disabled_account_returns_disabled(client):
    conn = _db_connection()
    with conn.cursor() as cur:
        cur.execute("UPDATE app_user SET enabled=0 WHERE username=%s", (TEST_USERNAME,))
    conn.close()

    resp = _login(client, TEST_PASSWORD)
    assert resp.status_code == 403
    assert resp.json()["code"] == "ACCOUNT_DISABLED"


def test_five_consecutive_failures_lock_account(client):
    for _ in range(5):
        resp = _login(client, "wrong")
        assert resp.status_code == 401 and resp.json()["code"] == "AUTH_INVALID"

    row = _fetch_user()
    assert row["failed_login_count"] == 5
    assert row["locked_until"] is not None
    # 锁定时长约 15 分钟
    assert abs((row["locked_until"] - (utcnow() + timedelta(minutes=15))).total_seconds()) < 5

    # 锁定期内，正确密码也被拒绝
    resp = _login(client, TEST_PASSWORD)
    assert resp.status_code == 423
    assert resp.json()["code"] == "ACCOUNT_LOCKED"


def test_logout_revokes_session(client):
    resp = _login(client, TEST_PASSWORD)
    assert resp.status_code == 200
    token = resp.json()["data"]["accessToken"]

    out = client.post("/api/v1/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert out.status_code == 200 and out.json()["code"] == "OK"
    assert _session_revoke_reason(token) == "user_logout"

    # 注销后令牌失效
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 401 and me.json()["code"] == "TOKEN_INVALID"

    # 幂等：重复注销仍成功
    out2 = client.post("/api/v1/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert out2.status_code == 200


def test_multiple_sessions_allowed_for_same_user(client):
    resp1 = _login(client, TEST_PASSWORD)
    resp2 = _login(client, TEST_PASSWORD)
    assert resp1.status_code == 200 and resp2.status_code == 200

    token1 = resp1.json()["data"]["accessToken"]
    token2 = resp2.json()["data"]["accessToken"]
    assert token1 != token2

    me1 = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token1}"})
    me2 = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token2}"})
    assert me1.status_code == 200 and me2.status_code == 200
    assert me1.json()["data"]["id"] == me2.json()["data"]["id"]
