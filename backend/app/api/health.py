from fastapi import APIRouter

from app.contracts import ApiEnvelope, ok
from app.core.config import Settings


def build_health_router(settings: Settings) -> APIRouter:
    router = APIRouter(tags=["Operations"])

    @router.get("/health", response_model=ApiEnvelope[dict[str, str]])
    async def health() -> ApiEnvelope[dict[str, str]]:
        return ok(
            {
                "status": "ok",
                "service": settings.app_name,
                "version": settings.version,
                "environment": settings.environment,
            }
        )

    return router
