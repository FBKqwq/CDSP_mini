class BusinessError(RuntimeError):
    """Business error with a stable API code and HTTP status."""

    def __init__(
        self,
        code: str,
        message: str,
        status_code: int,
    ) -> None:
        self.code = code
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class FeatureNotImplementedError(RuntimeError):
    """Raised when an adapter is intentionally absent from the scaffold."""

    def __init__(self, feature: str) -> None:
        self.feature = feature
        super().__init__(f"{feature} 尚未接入真实实现")