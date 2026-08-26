from datetime import date
from typing import Any

from app.core.errors import (
    HistoryNotFoundError,
    ProfileNotFoundError,
    VersionConflictError,
)
from app.core.ulid import new_ulid
from app.infrastructure.db import get_pool
from app.modules.crud.schemas import (
    MedicalHistoryCreate,
    MedicalHistoryRead,
    MedicalHistoryUpdate,
    PatientProfileRead,
    PatientProfileUpdate,
)


def calculate_age(birth_date: date | None, today: date | None = None) -> int | None:
    if birth_date is None:
        return None
    current = today or date.today()
    return current.year - birth_date.year - (
        (current.month, current.day) < (birth_date.month, birth_date.day)
    )


def _as_date(value: Any) -> date | None:
    if value is None or isinstance(value, date):
        return value
    return date.fromisoformat(str(value))


def _profile_from_row(row: dict[str, Any]) -> PatientProfileRead:
    birth_date = _as_date(row.get("birth_date"))
    return PatientProfileRead(
        id=row["id"],
        code=row["code"],
        name=row["name"],
        gender=row["gender"],
        birth_date=birth_date,
        age=calculate_age(birth_date),
        lock_version=row["lock_version"],
    )


def _history_from_row(row: dict[str, Any]) -> MedicalHistoryRead:
    return MedicalHistoryRead(
        id=row["id"],
        name=row["name"],
        description=row.get("description"),
        diagnosed_at=_as_date(row.get("diagnosed_at")),
        lock_version=row["lock_version"],
    )


class MySqlClinicalRepository:
    """patient_profile / medical_history 的当前用户数据仓储。"""

    async def get_patient_profile(self, user_id: str) -> PatientProfileRead:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                row = await self._select_profile(cur, user_id)
        if row is None:
            raise ProfileNotFoundError()
        return _profile_from_row(row)

    async def update_patient_profile(
        self,
        user_id: str,
        payload: PatientProfileUpdate,
    ) -> PatientProfileRead:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    UPDATE patient_profile
                    SET name = %s,
                        gender = %s,
                        birth_date = %s,
                        lock_version = lock_version + 1,
                        updated_at = CURRENT_TIMESTAMP(3)
                    WHERE user_id = %s
                      AND deleted_at IS NULL
                      AND lock_version = %s
                    """,
                    (
                        payload.name,
                        payload.gender,
                        payload.birth_date,
                        user_id,
                        payload.lock_version,
                    ),
                )
                if cur.rowcount == 0:
                    existing = await self._select_profile(cur, user_id)
                    if existing is None:
                        raise ProfileNotFoundError()
                    raise VersionConflictError()
                row = await self._select_profile(cur, user_id)
        if row is None:
            raise ProfileNotFoundError()
        return _profile_from_row(row)

    async def list_medical_histories(self, user_id: str) -> list[MedicalHistoryRead]:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                patient_id = await self._select_patient_id(cur, user_id)
                if patient_id is None:
                    raise ProfileNotFoundError()
                await cur.execute(
                    """
                    SELECT id, name, description, diagnosed_at, lock_version
                    FROM medical_history
                    WHERE patient_id = %s
                      AND deleted_at IS NULL
                    ORDER BY diagnosed_at DESC, updated_at DESC, id DESC
                    """,
                    (patient_id,),
                )
                rows = await cur.fetchall()
        return [_history_from_row(row) for row in rows]

    async def create_medical_history(
        self,
        user_id: str,
        payload: MedicalHistoryCreate,
    ) -> MedicalHistoryRead:
        history_id = new_ulid()
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                patient_id = await self._select_patient_id(cur, user_id)
                if patient_id is None:
                    raise ProfileNotFoundError()
                await cur.execute(
                    """
                    INSERT INTO medical_history (
                        id, patient_id, name, description, diagnosed_at,
                        lock_version, created_at, updated_at
                    )
                    VALUES (%s, %s, %s, %s, %s, 0, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
                    """,
                    (
                        history_id,
                        patient_id,
                        payload.name,
                        payload.description,
                        payload.diagnosed_at,
                    ),
                )
                row = await self._select_history(cur, user_id, history_id)
        if row is None:
            raise HistoryNotFoundError()
        return _history_from_row(row)

    async def update_medical_history(
        self,
        user_id: str,
        history_id: str,
        payload: MedicalHistoryUpdate,
    ) -> MedicalHistoryRead:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    UPDATE medical_history AS h
                    JOIN patient_profile AS p
                      ON p.id = h.patient_id AND p.deleted_at IS NULL
                    SET h.name = %s,
                        h.description = %s,
                        h.diagnosed_at = %s,
                        h.lock_version = h.lock_version + 1,
                        h.updated_at = CURRENT_TIMESTAMP(3)
                    WHERE h.id = %s
                      AND p.user_id = %s
                      AND h.deleted_at IS NULL
                      AND h.lock_version = %s
                    """,
                    (
                        payload.name,
                        payload.description,
                        payload.diagnosed_at,
                        history_id,
                        user_id,
                        payload.lock_version,
                    ),
                )
                if cur.rowcount == 0:
                    existing = await self._select_history(cur, user_id, history_id)
                    if existing is None:
                        raise HistoryNotFoundError()
                    raise VersionConflictError()
                row = await self._select_history(cur, user_id, history_id)
        if row is None:
            raise HistoryNotFoundError()
        return _history_from_row(row)

    async def delete_medical_history(self, user_id: str, history_id: str) -> None:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    UPDATE medical_history AS h
                    JOIN patient_profile AS p
                      ON p.id = h.patient_id AND p.deleted_at IS NULL
                    SET h.deleted_at = COALESCE(h.deleted_at, CURRENT_TIMESTAMP(3))
                    WHERE h.id = %s
                      AND p.user_id = %s
                    """,
                    (history_id, user_id),
                )
                await cur.execute(
                    """
                    SELECT h.id
                    FROM medical_history AS h
                    JOIN patient_profile AS p
                      ON p.id = h.patient_id AND p.deleted_at IS NULL
                    WHERE h.id = %s AND p.user_id = %s
                    LIMIT 1
                    """,
                    (history_id, user_id),
                )
                owned_row = await cur.fetchone()
        if owned_row is None:
            raise HistoryNotFoundError()

    @staticmethod
    async def _select_profile(cur: Any, user_id: str) -> dict[str, Any] | None:
        await cur.execute(
            """
            SELECT id, code, name, gender, birth_date, lock_version
            FROM patient_profile
            WHERE user_id = %s AND deleted_at IS NULL
            LIMIT 1
            """,
            (user_id,),
        )
        return await cur.fetchone()

    @staticmethod
    async def _select_patient_id(cur: Any, user_id: str) -> str | None:
        await cur.execute(
            """
            SELECT id
            FROM patient_profile
            WHERE user_id = %s AND deleted_at IS NULL
            LIMIT 1
            """,
            (user_id,),
        )
        row = await cur.fetchone()
        return None if row is None else row["id"]

    @staticmethod
    async def _select_history(
        cur: Any,
        user_id: str,
        history_id: str,
    ) -> dict[str, Any] | None:
        await cur.execute(
            """
            SELECT h.id, h.name, h.description, h.diagnosed_at, h.lock_version
            FROM medical_history AS h
            JOIN patient_profile AS p
              ON p.id = h.patient_id AND p.deleted_at IS NULL
            WHERE h.id = %s
              AND p.user_id = %s
              AND h.deleted_at IS NULL
            LIMIT 1
            """,
            (history_id, user_id),
        )
        return await cur.fetchone()
