import asyncio
import hashlib
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient

from app.container import get_auth_service
from app.core.config import Settings
from app.core.errors import (
    AccountDisabledError,
    AccountLockedError,
    AuthInvalidError,
    TokenExpiredError,
    TokenInvalidError,
)
from app.core.timeutil import utcnow
from app.main import create_app
from app.modules.auth.ports import AppUserRecord, SessionRecord
from app.modules.auth.schemas import LoginRequest
from app.modules.auth.service import AuthService


def make_user(**overrides):
    user = {
        "id": "user-1",
        "username": "patient",
        "password": "demo123",
        "display_name": "测试用户",
        "role": "patient",
        "enabled": True,
        "deleted": False,
    }
    user.update(overrides)
    return user


class FakeAuthRepository:
    def __init__(self):
        self.users = {}
        self.failure_counts = {}
        self.locked_until = {}
        self.sessions = {}
        self.touched = []

    async def get_user_by_username(self, username):
        user = self.users.get(username)
        if user is None:
            return None
        return AppUserRecord(
            id=user["id"],
            username=user["username"],
            password=user["password"],
            display_name=user["display_name"],
            role=user["role"],
            enabled=user["enabled"],
            locked_until=self.locked_until.get(user["id"]),
        )

    async def record_login_failure(self, user_id, threshold, lock_until):
        self.failure_counts[user_id] = self.failure_counts.get(user_id, 0) + 1
        if self.failure_counts[user_id] >= threshold:
            self.locked_until[user_id] = lock_until

    async def record_login_success(self, user_id, at):
        self.failure_counts[user_id] = 0
        self.locked_until[user_id] = None

    async def create_session(self, *, session_id, user_id, token_hash, issued_at, expires_at):
        self.sessions[token_hash] = {
            "session_id": session_id,
            "user_id": user_id,
            "expires_at": expires_at,
            "revoked_at": None,
        }

    async def get_session_by_token_hash(self, token_hash):
        session = self.sessions.get(token_hash)
        if session is None:
            return None
        user = next(u for u in self.users.values() if u["id"] == session["user_id"])
        return SessionRecord(
            session_id=session["session_id"],
            user_id=session["user_id"],
            display_name=user["display_name"],
            role=user["role"],
            expires_at=session["expires_at"],
            revoked_at=session["revoked_at"],
            user_enabled=user["enabled"],
            user_deleted=user["deleted"],
        )

    async def touch_session(self, session_id, at):
        self.touched.append((session_id, at))


def run(coro):
    return asyncio.run(coro)


def build_client(service):
    app = create_app(Settings(app_name="test", environment="test", cors_origins=()))
    app.dependency_overrides[get_auth_service] = lambda: service
    return TestClient(app)


# --- 登录 ---


def test_login_success_creates_session_and_resets_failures():
    repo = FakeAuthRepository()
    repo.users["patient"] = make_user()
    service = AuthService(repository=repo, lock_threshold=5, lock_minutes=15)

    result = run(service.login(LoginRequest(username=" Patient ", password="demo123")))

    assert result.access_token
    assert result.user.id == "user-1"
    assert result.user.display_name == "测试用户"
    assert result.user.role == "patient"
    assert len(repo.sessions) == 1
    assert repo.failure_counts["user-1"] == 0


def test_login_unknown_account_returns_invalid_without_session():
    repo = FakeAuthRepository()
    service = AuthService(repository=repo)

    with pytest.raises(AuthInvalidError):
        run(service.login(LoginRequest(username="nobody", password="x")))

    assert repo.sessions == {}


def test_login_wrong_password_increments_failure_count():
    repo = FakeAuthRepository()
    repo.users["patient"] = make_user()
    service = AuthService(repository=repo, lock_threshold=5, lock_minutes=15)

    with pytest.raises(AuthInvalidError):
        run(service.login(LoginRequest(username="patient", password="wrong")))

    assert repo.failure_counts["user-1"] == 1
    assert repo.sessions == {}


def test_login_disabled_account_is_rejected():
    repo = FakeAuthRepository()
    repo.users["patient"] = make_user(enabled=False)
    service = AuthService(repository=repo)

    with pytest.raises(AccountDisabledError):
        run(service.login(LoginRequest(username="patient", password="demo123")))


def test_five_consecutive_failures_lock_account():
    repo = FakeAuthRepository()
    repo.users["patient"] = make_user()
    service = AuthService(repository=repo, lock_threshold=5, lock_minutes=15)

    for _ in range(5):
        with pytest.raises(AuthInvalidError):
            run(service.login(LoginRequest(username="patient", password="wrong")))

    # 锁定 15 分钟
    locked = repo.locked_until["user-1"]
    assert locked is not None
    assert abs((locked - (utcnow() + timedelta(minutes=15))).total_seconds()) < 5

    with pytest.raises(AccountLockedError):
        run(service.login(LoginRequest(username="patient", password="demo123")))


def test_multiple_sessions_allowed_for_same_user():
    repo = FakeAuthRepository()
    repo.users["patient"] = make_user()
    service = AuthService(repository=repo)

    first = run(service.login(LoginRequest(username="patient", password="demo123")))
    second = run(service.login(LoginRequest(username="patient", password="demo123")))

    assert first.access_token != second.access_token
    assert len(repo.sessions) == 2
    assert run(service.me(first.access_token)).id == "user-1"
    assert run(service.me(second.access_token)).id == "user-1"


# --- 身份恢复与当前用户查询 ---


def test_me_returns_summary_and_touches_session():
    repo = FakeAuthRepository()
    repo.users["patient"] = make_user()
    service = AuthService(repository=repo)

    token = run(service.login(LoginRequest(username="patient", password="demo123"))).access_token
    summary = run(service.me(token))

    assert summary.id == "user-1"
    assert summary.display_name == "测试用户"
    assert summary.role == "patient"
    assert repo.touched


def test_me_unknown_token_is_invalid():
    repo = FakeAuthRepository()
    service = AuthService(repository=repo)

    with pytest.raises(TokenInvalidError):
        run(service.me("bogus-token"))


def test_me_expired_session_is_expired():
    repo = FakeAuthRepository()
    repo.users["patient"] = make_user()
    service = AuthService(repository=repo)

    token = run(service.login(LoginRequest(username="patient", password="demo123"))).access_token
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    repo.sessions[token_hash]["expires_at"] = utcnow() - timedelta(seconds=1)

    with pytest.raises(TokenExpiredError):
        run(service.me(token))


def test_me_revoked_session_is_invalid():
    repo = FakeAuthRepository()
    repo.users["patient"] = make_user()
    service = AuthService(repository=repo)

    token = run(service.login(LoginRequest(username="patient", password="demo123"))).access_token
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    repo.sessions[token_hash]["revoked_at"] = utcnow()

    with pytest.raises(TokenInvalidError):
        run(service.me(token))


def test_me_disabled_user_is_rejected():
    repo = FakeAuthRepository()
    repo.users["patient"] = make_user()
    service = AuthService(repository=repo)
    token = run(service.login(LoginRequest(username="patient", password="demo123"))).access_token

    repo.users["patient"]["enabled"] = False

    with pytest.raises(AccountDisabledError):
        run(service.me(token))


# --- HTTP 层 ---


def test_login_http_returns_standard_envelope():
    repo = FakeAuthRepository()
    repo.users["patient"] = make_user()
    client = build_client(AuthService(repository=repo))

    response = client.post(
        "/api/v1/auth/login",
        json={"username": "patient", "password": "demo123"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["code"] == "OK"
    assert body["data"]["user"] == {"id": "user-1", "displayName": "测试用户", "role": "patient"}
    assert body["data"]["accessToken"]
    assert isinstance(body["data"]["expiresAt"], int)
    # 返回内容不得包含数据库密码字段
    assert "password" not in body["data"]
    assert "password" not in body["data"]["user"]


def test_login_http_wrong_password_returns_auth_invalid():
    repo = FakeAuthRepository()
    repo.users["patient"] = make_user()
    client = build_client(AuthService(repository=repo))

    response = client.post(
        "/api/v1/auth/login",
        json={"username": "patient", "password": "wrong"},
    )

    assert response.status_code == 401
    assert response.json()["code"] == "AUTH_INVALID"


def test_me_http_roundtrip():
    repo = FakeAuthRepository()
    repo.users["patient"] = make_user()
    client = build_client(AuthService(repository=repo))

    token = client.post(
        "/api/v1/auth/login",
        json={"username": "patient", "password": "demo123"},
    ).json()["data"]["accessToken"]

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json()["data"]["displayName"] == "测试用户"


def test_me_http_missing_token_returns_token_invalid():
    repo = FakeAuthRepository()
    client = build_client(AuthService(repository=repo))

    response = client.get("/api/v1/auth/me")

    assert response.status_code == 401
    assert response.json()["code"] == "TOKEN_INVALID"
