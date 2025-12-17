"""Minimal, import-safe structured logging helpers for FS CockPIT.

This module intentionally avoids framework-specific imports and minimizes
side effects at import time. Use `configure_logging(...)` during startup to
initialize logging; use `get_logger()` to obtain a structlog logger; and use
`bind_request_id()` / `clear_request_context()` in middleware to attach
request-scoped data to logs when structlog supports contextvars.
"""

from __future__ import annotations

import logging
import os
import sys
from logging.handlers import RotatingFileHandler
from typing import Optional

import structlog

try:
    from structlog import contextvars as _structlog_contextvars  # type: ignore

    _HAS_CONTEXTVARS = True
except ImportError:
    _structlog_contextvars = None
    _HAS_CONTEXTVARS = False
    print("[logger] structlog contextvars import failed", file=sys.stderr)


def configure_logging(env: str = "development", *, enable_file: Optional[bool] = None) -> None:
    """Initialize stdlib logging and structlog.

    Args:
        env: "development" or "production" (controls formatting and levels).
        enable_file: explicitly enable file logging; if None, reads
            SURVEY_ENABLE_FILE_LOGGING env var (defaults to false).
    """

    if enable_file is None:
        enable_file = os.getenv("SURVEY_ENABLE_FILE_LOGGING", "false").lower() in (
            "1",
            "true",
            "yes",
        )

    console_level = logging.DEBUG if env != "production" else logging.INFO

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(console_level)
    console_handler.setFormatter(logging.Formatter("%(message)s"))

    root_logger = logging.getLogger()
    root_logger.setLevel(console_level)
    if not any(isinstance(h, logging.StreamHandler) for h in root_logger.handlers):
        root_logger.addHandler(console_handler)

    # Optional rotating file handler
    if enable_file:
        log_dir = os.getenv("FC_COCKPIT_LOG_DIR", "logs")
        os.makedirs(log_dir, exist_ok=True)
        log_file = os.path.join(log_dir, os.getenv("FC_COCKPIT_LOG_FILENAME", "fc_cockpit.log"))
        max_bytes = int(os.getenv("FC_COCKPIT_LOG_MAX_BYTES", str(50 * 1024 * 1024)))
        backup_count = int(os.getenv("FC_COCKPIT_LOG_BACKUP_COUNT", "2"))
        try:
            fh = RotatingFileHandler(
                log_file, maxBytes=max_bytes, backupCount=backup_count, encoding="utf-8"
            )
            fh.setLevel(logging.INFO if env == "production" else logging.DEBUG)
            fh.setFormatter(
                logging.Formatter(
                    "%(asctime)s %(levelname)s %(name)s %(message)s", datefmt="%Y-%m-%dT%H:%M:%S%z"
                )
            )
            root_logger.addHandler(fh)
        except OSError as exc:  # pragma: no cover - best-effort
            print(f"[logger] failed to set up file handler: {exc}", file=sys.stderr)

    # structlog configuration
    processors = []
    # If structlog contextvars is available, merge any bound contextvars
    # (like request_id) into the event dict so processors can render them.
    if _HAS_CONTEXTVARS and _structlog_contextvars is not None:
        processors.append(_structlog_contextvars.merge_contextvars)
    processors.extend(
        [
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.add_log_level,
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
        ]
    )

    if env == "production":
        processors.append(structlog.processors.JSONRenderer())
    else:
        processors.append(structlog.dev.ConsoleRenderer())

    structlog.configure(
        processors=processors,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )


def get_logger(name: Optional[str] = None):
    """Return a structlog logger instance (convenience wrapper)."""

    return structlog.get_logger(name) if name else structlog.get_logger()


def bind_request_id(request_id: str) -> None:
    """Bind a request_id into structlog's contextvars if available (best-effort)."""

    if _HAS_CONTEXTVARS and _structlog_contextvars is not None:
        _structlog_contextvars.bind_contextvars(request_id=request_id)


def clear_request_context() -> None:
    """Clear any bound structlog contextvars (best-effort)."""

    if _HAS_CONTEXTVARS and _structlog_contextvars is not None:
        _structlog_contextvars.clear_contextvars()


def get_bound_request_id() -> Optional[str]:
    """Return the `request_id` bound into structlog contextvars if present.

    This is a best-effort helper: if structlog/contextvars are not available
    it returns None.
    """
    if _HAS_CONTEXTVARS and _structlog_contextvars is not None:
        ctx = _structlog_contextvars.get_contextvars()
        return ctx.get("request_id")
    return None
