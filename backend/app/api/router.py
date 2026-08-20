from fastapi import APIRouter

from app.modules.chat.router import http_router as chat_http_router
from app.modules.crud.router import router as crud_router


api_v1_router = APIRouter()
api_v1_router.include_router(crud_router)
api_v1_router.include_router(chat_http_router)
