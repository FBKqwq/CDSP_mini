import asyncio

import aiomysql

from app.core.config import get_settings

_pool: aiomysql.Pool | None = None
_pool_lock = asyncio.Lock()


async def get_pool() -> aiomysql.Pool:
    """惰性创建并缓存全局 MySQL 连接池。"""
    global _pool
    if _pool is None:
        async with _pool_lock:
            if _pool is None:
                settings = get_settings()
                _pool = await aiomysql.create_pool(
                    host=settings.db_host,
                    port=settings.db_port,
                    user=settings.db_user,
                    password=settings.db_password,
                    db=settings.db_name,
                    charset="utf8mb4",
                    autocommit=True,
                    minsize=settings.db_pool_minsize,
                    maxsize=settings.db_pool_maxsize,
                    cursorclass=aiomysql.DictCursor,
                )
    return _pool


async def close_pool() -> None:
    """关闭连接池（幂等，未初始化时为空操作）。"""
    global _pool
    if _pool is not None:
        _pool.close()
        await _pool.wait_closed()
        _pool = None
