import asyncio
from datetime import date

import pytest

from app.core.errors import HistoryNotFoundError, VersionConflictError
from app.infrastructure import clinical_repository as repository_module
from app.infrastructure.clinical_repository import MySqlClinicalRepository, calculate_age
from app.modules.crud.schemas import PatientProfileUpdate


class FakeCursor:
    def __init__(
        self,
        *,
        fetchone_results: list[dict | None] | None = None,
        fetchall_result: list[dict] | None = None,
        rowcounts: list[int] | None = None,
    ) -> None:
        self.fetchone_results = list(fetchone_results or [])
        self.fetchall_result = list(fetchall_result or [])
        self.rowcounts = list(rowcounts or [])
        self.rowcount = 0
        self.executions: list[tuple[str, tuple]] = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, _exc_type, _exc, _traceback):
        return False

    async def execute(self, sql: str, parameters: tuple) -> None:
        self.executions.append((" ".join(sql.split()), parameters))
        self.rowcount = self.rowcounts.pop(0) if self.rowcounts else 0

    async def fetchone(self):
        return self.fetchone_results.pop(0) if self.fetchone_results else None

    async def fetchall(self):
        return self.fetchall_result


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


def install_pool(monkeypatch, cursor: FakeCursor) -> None:
    async def fake_get_pool():
        return FakePool(cursor)

    monkeypatch.setattr(repository_module, "get_pool", fake_get_pool)


def test_calculate_age_handles_birthday_boundary() -> None:
    assert calculate_age(date(1990, 8, 24), date(2026, 8, 23)) == 35
    assert calculate_age(date(1990, 8, 24), date(2026, 8, 24)) == 36
    assert calculate_age(None, date(2026, 8, 24)) is None


def test_profile_lookup_is_scoped_to_current_user(monkeypatch) -> None:
    cursor = FakeCursor(
        fetchone_results=[
            {
                "id": "patient-1",
                "code": "P001",
                "name": "测试患者",
                "gender": "未知",
                "birth_date": date(1990, 1, 1),
                "lock_version": 2,
            }
        ]
    )
    install_pool(monkeypatch, cursor)

    profile = asyncio.run(MySqlClinicalRepository().get_patient_profile("user-1"))

    assert profile.id == "patient-1"
    sql, parameters = cursor.executions[0]
    assert "WHERE user_id = %s AND deleted_at IS NULL" in sql
    assert parameters == ("user-1",)


def test_profile_update_reports_version_conflict(monkeypatch) -> None:
    cursor = FakeCursor(
        rowcounts=[0, 0],
        fetchone_results=[
            {
                "id": "patient-1",
                "code": "P001",
                "name": "测试患者",
                "gender": "未知",
                "birth_date": None,
                "lock_version": 3,
            }
        ],
    )
    install_pool(monkeypatch, cursor)

    with pytest.raises(VersionConflictError):
        asyncio.run(
            MySqlClinicalRepository().update_patient_profile(
                "user-1",
                PatientProfileUpdate(
                    name="新姓名",
                    gender="未知",
                    birth_date=None,
                    lock_version=2,
                ),
            )
        )

    update_sql, parameters = cursor.executions[0]
    assert "lock_version = lock_version + 1" in update_sql
    assert "AND lock_version = %s" in update_sql
    assert parameters[-2:] == ("user-1", 2)


def test_delete_other_patients_history_does_not_reveal_it(monkeypatch) -> None:
    cursor = FakeCursor(rowcounts=[0, 0], fetchone_results=[None])
    install_pool(monkeypatch, cursor)

    with pytest.raises(HistoryNotFoundError):
        asyncio.run(MySqlClinicalRepository().delete_medical_history("user-1", "history-2"))

    update_sql, parameters = cursor.executions[0]
    assert "JOIN patient_profile AS p" in update_sql
    assert "p.user_id = %s" in update_sql
    assert parameters == ("history-2", "user-1")
