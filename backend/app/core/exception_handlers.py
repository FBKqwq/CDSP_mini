from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.contracts import ApiEnvelope
from app.core.errors import DomainError, FeatureNotImplementedError


def _error(status_code: int, code: str, message: str) -> JSONResponse:
    payload = ApiEnvelope[None](success=False, code=code, message=message, data=None)
    return JSONResponse(status_code=status_code, content=payload.model_dump(mode="json", by_alias=True))


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(FeatureNotImplementedError)
    async def handle_not_implemented(
        _request: Request,
        exc: FeatureNotImplementedError,
    ) -> JSONResponse:
        return _error(501, "NOT_IMPLEMENTED", str(exc))

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        _request: Request,
        _exc: RequestValidationError,
    ) -> JSONResponse:
        # Do not echo raw request fields: they may contain medical information.
        return _error(422, "VALIDATION_ERROR", "请求参数校验失败")

    @app.exception_handler(DomainError)
    async def handle_domain_error(
        _request: Request,
        exc: DomainError,
    ) -> JSONResponse:
        return _error(exc.status_code, exc.code, exc.message)
