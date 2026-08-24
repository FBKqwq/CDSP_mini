from pydantic import Field, field_validator

from app.contracts.common import ApiModel


class UserSummary(ApiModel):
    id: str
    display_name: str = Field(alias="displayName")
    role: str


class LoginRequest(ApiModel):
    username: str
    password: str = Field(min_length=1, max_length=128)

    @field_validator("username")
    @classmethod
    def _normalize_username(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not 1 <= len(normalized) <= 64:
            raise ValueError("账号长度须为 1～64 个字符")
        return normalized


class LoginResponse(ApiModel):
    access_token: str = Field(alias="accessToken")
    expires_at: int = Field(alias="expiresAt")
    user: UserSummary
