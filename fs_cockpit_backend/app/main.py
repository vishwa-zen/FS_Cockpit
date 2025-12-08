"""
Main FastAPI application factory (class-based).

This module encapsulates FastAPI application construction in a class so the
creation and wiring (middleware, routers, startup events) are easier to test
and extend. The module still exposes a top-level `app` variable for
`uvicorn main:app` / `gunicorn main:app` compatibility.
"""
from typing import Optional
from fastapi import FastAPI
from fastapi import Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import structlog

from app.api.routes import intune, servicenow, nextthink
from app.api.routes import health_metrics
from app.api.routes import cache as cache_routes
from app.middleware.security import SecurityHeadersMiddleware
from app.middleware.request_id import RequestIDMiddleware, get_request_id
from app.middleware.error_handler import GlobalErrorHandlerMiddleware
from app.middleware.response_wrapper import ResponseWrapperMiddleware
from app.middleware.auth import AzureADAuthMiddleware
from app.config.settings import get_settings, Settings
from app.logger.log import configure_logging
from app.db.connection import init_db, close_db

# Try to configure logging at module import time using settings if available.
# This is best-effort: don't raise if settings are incomplete during import.
try:
    _settings = get_settings()
    try:
        configure_logging(env=_settings.ENVIRONMENT)
    except Exception:
        # continue with default logging if configure fails
        pass
    logger = structlog.get_logger()
except Exception:
    # Fall back to a plain structlog logger; configuration may be handled later.
    logger = structlog.get_logger()

class FSCockpitApplication:
    """Encapsulates FastAPI app creation and configuration.

    Example:
        factory = FSCockpitApplication()
        app = factory.app
    """

    def __init__(self, title: Optional[str] = None):
        # configure structured logging early so startup logs are captured
        # Use environment from settings (defaults to 'development')
        self.settings: Settings = get_settings()
        try:
            configure_logging(env=self.settings.ENVIRONMENT)
        except Exception:
            # best-effort: if logging setup fails, continue with default logging
            pass
        # expose a structlog logger bound to this module
        self.logger = structlog.get_logger()
        self.logger.info("app.initializing", title=title or self.settings.TITLE)
        self.title = title or self.settings.TITLE
        self._app: Optional[FastAPI] = None
        self._create_app()
        # Register routes separately from app creation
        self._register_health()
        self._register_shutdown()

    def _create_app(self) -> None:
        """Builds the FastAPI instance and configures middleware/routers."""
        self._app = FastAPI(
            title=self.title,
            description=self.settings.DESCRIPTION,
            version=self.settings.VERSION,
            openapi_tags=self.settings.OPENAPI_TAGS,
            contact=self.settings.CONTACT,
            license_info=self.settings.LICENSE_INFO,
        )

        # Add middleware in order where RequestIDMiddleware is outermost,
        # so it runs first and sets `request.state.request_id` which other
        # middleware and handlers can read.  Starlette wraps middlewares in
        # the order they are added such that the last added runs outermost.
        # Therefore we add the error/response middlewares first and the
        # request-id middleware last.
        self._app.add_middleware(GlobalErrorHandlerMiddleware)
        self._app.add_middleware(ResponseWrapperMiddleware)
        
        # Add Azure AD authentication middleware (before request-id so it can access request_id)
        # This middleware is only active when AZURE_AD_ENABLED=True
        self._app.add_middleware(AzureADAuthMiddleware)
        
        # Request-id middleware should run early so other middleware/handlers
        # can access `request.state.request_id`.
        self._app.add_middleware(RequestIDMiddleware)
        # Configure CORS middleware using project constants.
        self._app.add_middleware(
            CORSMiddleware,
            allow_origins=self.settings.ALLOWED_ORIGINS,
            allow_credentials=self.settings.ALLOW_CREDENTIALS,
            allow_methods=self.settings.ALLOW_METHODS,
            allow_headers=self.settings.ALLOW_HEADERS,
        )

        # GZip compression middleware
        self._app.add_middleware(GZipMiddleware, minimum_size=self.settings.GZIP_MINIMUM_SIZE)

        # Register security headers middleware (moved to app.middleware.security)
        self._app.add_middleware(SecurityHeadersMiddleware)

        # Placeholder: configure routers and other app wiring here.
        self._app.include_router(servicenow.router)
        self._app.include_router(intune.router)
        self._app.include_router(nextthink.router)
        self._app.include_router(health_metrics.router)
        self._app.include_router(cache_routes.router)
        # Debug: record the order of user-registered middleware for visibility
        try:
            mw_names = [mw.cls.__name__ for mw in self._app.user_middleware]
            self.logger.debug("middleware.registration.order", middleware=mw_names)
        except Exception:
            # best-effort debug logging; don't let middleware introspection
            # break application startup
            pass

    def _register_health(self) -> None:
        """Register the /health endpoint separate from app construction.

        Separating route registration from middleware setup makes the app
        factory easier to test and extend.
        """
        assert self._app is not None

        @self._app.get("/health", tags=["v1"])  # basic up-check
        async def _health(request: Request):
            # simple liveness check. include X-Request-ID in middleware and
            # return a small JSON payload so orchestration systems can parse it.
            try:
                rid = get_request_id(request)
            except Exception:
                rid = None
            # log a structured health check event; structlog will include bound
            # context if configured. we include request id explicitly as well.
            try:
                self.logger.info("health.check", status="ok", request_id=rid)
            except Exception:
                # logging should never prevent the endpoint from replying
                pass
            return {"status": "ok"}
    
    def _register_shutdown(self) -> None:
        """Register shutdown event to cleanup connection pools and cache."""
        assert self._app is not None
        
        @self._app.on_event("startup")
        async def startup_event():
            """Initialize database and background tasks on startup."""
            import asyncio
            from app.cache.memory_cache import get_cache
            
            # Initialize database and verify connection
            self.logger.info("Starting database initialization")
            db_initialized = await init_db()
            if db_initialized:
                self.logger.info("Database initialized successfully")
            else:
                self.logger.error("Database initialization failed - application may have limited functionality")
            
            async def cleanup_cache_periodically():
                """Background task to cleanup expired cache entries."""
                while True:
                    try:
                        await asyncio.sleep(self.settings.CACHE_CLEANUP_INTERVAL)
                        if self.settings.CACHE_ENABLED:
                            cache = get_cache()
                            removed = cache.cleanup_expired()
                            if removed > 0:
                                self.logger.info("Automatic cache cleanup", removed_entries=removed)
                    except Exception as e:
                        self.logger.error("Cache cleanup error", error=str(e))
            
            # Start background cleanup task
            if self.settings.CACHE_ENABLED:
                asyncio.create_task(cleanup_cache_periodically())
                self.logger.info("Cache cleanup task started", interval_seconds=self.settings.CACHE_CLEANUP_INTERVAL)
        
        @self._app.on_event("shutdown")
        async def shutdown_event():
            """Cleanup resources on application shutdown."""
            try:
                self.logger.info("Starting application shutdown")
                
                # Close database connections
                await close_db()
                self.logger.info("Database connections closed")
                
                # Close HTTP client connections
                from app.clients.base_cleint import BaseClient
                await BaseClient.close_shared_client()
                self.logger.info("HTTP client connections closed")
                
                self.logger.info("Application shutdown complete")
            except Exception as e:
                self.logger.error("Error during shutdown", error=str(e), error_type=type(e).__name__)

    @property
    def app(self) -> FastAPI:
        """Return the underlying FastAPI application."""
        assert self._app is not None
        return self._app


# Module-level app for ASGI servers. Keep this name so `uvicorn main:app`
# and `gunicorn main:app` continue to work.
_factory = FSCockpitApplication()
app = _factory.app
