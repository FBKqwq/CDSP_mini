from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import build_health_router
from app.api.router import api_v1_router
from app.core.config import Settings, get_settings
from app.core.exception_handlers import register_exception_handlers
from app.infrastructure.db import close_pool
from app.modules.chat.router import websocket_router


@asynccontextmanager
async def lifespan(_application: FastAPI):
    yield
    await close_pool()


def create_app(settings: Settings | None = None) -> FastAPI:
    current = settings or get_settings()
    application = FastAPI(
        title=current.app_name,
        version=current.version,
        description="CDSP Mini 微信小程序统一网关脚手架",
        lifespan=lifespan,
    )

    if current.cors_origins:
        application.add_middleware(
            CORSMiddleware,
            allow_origins=list(current.cors_origins),
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    register_exception_handlers(application)
    application.include_router(build_health_router(current))
    application.include_router(api_v1_router, prefix=current.api_v1_prefix)
    application.include_router(websocket_router)
    return application


app = create_app()
