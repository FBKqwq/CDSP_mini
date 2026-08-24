class FeatureNotImplementedError(RuntimeError):
    """Raised when an adapter is intentionally absent from the scaffold."""

    def __init__(self, feature: str) -> None:
        self.feature = feature
        super().__init__(f"{feature} 尚未接入真实实现")


class DomainError(Exception):
    """业务错误基类，携带稳定错误码与 HTTP 状态。"""

    code: str = "INTERNAL_ERROR"
    status_code: int = 500

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


class AuthInvalidError(DomainError):
    code = "AUTH_INVALID"
    status_code = 401

    def __init__(self) -> None:
        super().__init__("账号或密码错误")


class TokenInvalidError(DomainError):
    code = "TOKEN_INVALID"
    status_code = 401

    def __init__(self) -> None:
        super().__init__("登录凭证无效")


class TokenExpiredError(DomainError):
    code = "TOKEN_EXPIRED"
    status_code = 401

    def __init__(self) -> None:
        super().__init__("登录会话已过期")


class AccountDisabledError(DomainError):
    code = "ACCOUNT_DISABLED"
    status_code = 403

    def __init__(self) -> None:
        super().__init__("账号已停用")


class AccountLockedError(DomainError):
    code = "ACCOUNT_LOCKED"
    status_code = 423

    def __init__(self) -> None:
        super().__init__("账号已临时锁定，请稍后再试")
