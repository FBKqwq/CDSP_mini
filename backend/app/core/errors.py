class FeatureNotImplementedError(RuntimeError):
    """Raised when an adapter is intentionally absent from the scaffold."""

    def __init__(self, feature: str) -> None:
        self.feature = feature
        super().__init__(f"{feature} 尚未接入真实实现")
