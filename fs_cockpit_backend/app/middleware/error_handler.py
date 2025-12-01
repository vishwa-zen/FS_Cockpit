from __future__ import annotations

from datetime import datetime
 # ...existing code...

from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from starlette.middleware.base import BaseHTTPMiddleware

import structlog
from app.logger.log import get_logger, get_bound_request_id
from app.middleware.request_id import get_request_id as _get_request_id

from app.exceptions.custom_exceptions import (
    ExternalServiceError,
    CredentialError,
    ConfigurationError,
    CircuitBreakerOpenError,
)

logger = structlog.get_logger(__name__)


def _now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


class GlobalErrorHandlerMiddleware(BaseHTTPMiddleware):
    """Catch top-level exceptions and return uniform JSON error responses.

    The response format follows the project's convention:
    {
      "success": false,
      "message": "...",
      "data": null,
      "timestamp": "...",
      "request_id": "..."
    }
    """

    async def dispatch(self, request: Request, call_next) -> Response:  # type: ignore[override]
        request_id_state = getattr(request.state, "request_id", None)
        request_header = request.headers.get("X-Request-ID")
        request_id_bound = get_bound_request_id()
        request_id = request_id_state or request_header or request_id_bound
        # Best-effort debug log; do not catch Exception
        get_logger().debug(
            "error_handler.request_id",
            request_id=request_id,
            request_state_request_id=request_id_state,
            request_header=request_header,
            request_bound_request_id=request_id_bound,
        )
        try:
            return await call_next(request)
        except ExternalServiceError as exc:
            status = exc.status_code or 502
            body = {
                "success": False,
                "message": exc.message,
                "data": None,
                "timestamp": _now_iso(),
                "request_id": request_id,
            }
            logger.error("external.service.error", service=exc.service, status=status, request_id=request_id, error=exc.message)
            return JSONResponse(status_code=status, content=body)
        except CredentialError as exc:
            body = {
                "success": False,
                "message": str(exc),
                "data": None,
                "timestamp": _now_iso(),
                "request_id": request_id,
            }
            logger.warning("credential.error", request_id=request_id, error=str(exc))
            return JSONResponse(status_code=401, content=body)
        except ConfigurationError as exc:
            body = {
                "success": False,
                "message": str(exc),
                "data": None,
                "timestamp": _now_iso(),
                "request_id": request_id,
            }
            logger.error("configuration.error", request_id=request_id, error=str(exc))
            return JSONResponse(status_code=500, content=body)
        except CircuitBreakerOpenError as exc:
            body = {
                "success": False,
                "message": str(exc),
                "data": None,
                "timestamp": _now_iso(),
                "request_id": request_id,
            }
            logger.warning("circuitbreaker.open", request_id=request_id, error=str(exc))
            return JSONResponse(status_code=503, content=body)
        # For any other unhandled exception, return a generic error response
        logger.exception("unhandled.exception", request_id=request_id)
        body = {
            "success": False,
            "message": "internal server error",
            "data": None,
            "timestamp": _now_iso(),
            "request_id": request_id,
        }
        return JSONResponse(status_code=500, content=body)


__all__ = ["GlobalErrorHandlerMiddleware"]
