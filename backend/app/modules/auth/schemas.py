from datetime import datetime
from typing import Any, Literal

from pydantic import Field, field_validator

from app.contracts.common import ApiModel


class LoginRequest(ApiModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("username", mode="before")
    @classmethod
    def normalize_username(cls, value: Any) -> Any:
        if isinstance(value, str):
            return value.strip().lower()
        return value


class UserSummary(ApiModel):
    id: str
    display_name: str = Field(alias="displayName")
    role: Literal["patient"]


class LoginData(ApiModel):
    access_token: str = Field(alias="accessToken")
    expires_at: datetime = Field(alias="expiresAt")
    user: UserSummary