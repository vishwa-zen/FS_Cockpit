from __future__ import annotations

 # ...existing code...

import uuid
from typing import Callable, Optional
from starlette.requests import Request
from starlette.responses import Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from app.logger.log import bind_request_id, clear_request_context, get_logger


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Attach a request id to each request and ensure it is returned in responses.

    The middleware prefers an incoming ``X-Request-ID`` header if present.
    Otherwise it generates a stable UUID4 string for the lifetime of the
    request and stores it on ``request.state.request_id``.

    Additionally, when structlog's contextvars integration is available, the
    middleware will bind the request id into the logging context so that
    structured logs include ``request_id`` automatically.
    """

    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:  # type: ignore[override]
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id

        bind_request_id(request_id)
        get_logger().debug("request_id.assigned", request_id=request_id, from_header=("X-Request-ID" in request.headers))

        response = await call_next(request)
        if "X-Request-ID" not in response.headers:
            response.headers["X-Request-ID"] = request_id
        clear_request_context()
        return response


def get_request_id(request: Request) -> Optional[str]:
    """Retrieve the request ID from the request state, if available."""
    # Prefer state-based request id; fallback to header if not present
    request_id = getattr(request.state, "request_id", None)
    if not request_id:
        request_id = request.headers.get("X-Request-ID")
    if not request_id:
        # fallback to bound structlog contextvar
        from app.logger.log import get_bound_request_id
        request_id = get_bound_request_id()
    return request_id


__all__ = ["RequestIDMiddleware", "get_request_id"]
