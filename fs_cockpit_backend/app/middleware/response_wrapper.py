from __future__ import annotations

from datetime import datetime
import json
 


from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from starlette.middleware.base import BaseHTTPMiddleware

import structlog
from app.middleware.request_id import get_request_id as _get_request_id
from app.logger.log import get_logger

logger = structlog.get_logger(__name__)


def _now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


class ResponseWrapperMiddleware(BaseHTTPMiddleware):
    """Wrap successful and error JSON responses into a standard format.

    Successful responses will be transformed to:
    {
      "success": true,
      "message": "Operation completed successfully",
      "data": <original payload>,
      "timestamp": "...",
      "request_id": "..."
    }

    Error responses (status >= 400) will be transformed to similar shape
    with `success: false` and `data: null` when appropriate. The middleware
    will not double-wrap responses that already include the `success` key.
    """

    async def dispatch(self, request: Request, call_next) -> Response:  # type: ignore[override]
        from app.logger.log import get_bound_request_id
        request_id_state = getattr(request.state, "request_id", None)
        request_header = request.headers.get("X-Request-ID")
        request_id_bound = get_bound_request_id()
        request_id = request_id_state or request_header or request_id_bound
        get_logger().debug(
            "response_wrapper.request_id",
            request_id=request_id,
            request_state_request_id=request_id_state,
            request_header=request_header,
            request_bound_request_id=request_id_bound,
        )
        response = await call_next(request)

        # Only wrap JSON responses
        content_type = response.headers.get("content-type", "")
        if "application/json" not in content_type:
            return response

        # Read body (consume iterator if present)
        body_bytes = b""
        if hasattr(response, "body_iterator") and response.body_iterator is not None:
            async for chunk in response.body_iterator:
                body_bytes += chunk
        else:
            body_bytes = getattr(response, "body", b"") or b""

        # Parse JSON body, or return original response if not JSON
        try:
            payload = json.loads(body_bytes.decode("utf-8")) if body_bytes else None
        except (json.JSONDecodeError, UnicodeDecodeError):
            return response

        # If it's already our standard shape, return as-is
        if isinstance(payload, dict) and payload.get("success") is not None:
            return response

        # Build wrapper
        status_code = getattr(response, "status_code", 200)
        if status_code < 400:
            wrapper = {
                "success": True,
                "message": "Operation completed successfully",
                "data": payload,
                "timestamp": _now_iso(),
                    "request_id": request_id,
            }
        else:
            # For error responses, try to extract message from payload
            message = None
            if isinstance(payload, dict):
                message = payload.get("message") or payload.get("detail") or json.dumps(payload)
            else:
                message = str(payload)

            wrapper = {
                "success": False,
                "message": message,
                "data": None,
                "timestamp": _now_iso(),
                "request_id": request_id,
            }

        # Preserve headers except content-length (will be recalculated)
        headers = {k: v for k, v in response.headers.items() if k.lower() != "content-length"}
        return JSONResponse(status_code=status_code, content=wrapper, headers=headers)


__all__ = ["ResponseWrapperMiddleware"]
