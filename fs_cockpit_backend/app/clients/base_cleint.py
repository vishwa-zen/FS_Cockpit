"""Base client module defining the BaseClient class for API interactions."""

from typing import Any, Dict, Optional

import httpx
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config.settings import get_settings
from app.exceptions.custom_exceptions import ServiceConnectionError, ServiceTimeoutError

# logging configuration
logger = structlog.get_logger(__name__)


class BaseClient:
    """Base client for interacting with external APIs with connection pooling."""

    # Class-level connection pool (shared across instances)
    _http_client: Optional[httpx.AsyncClient] = None
    _client_lock = None

    def __init__(
        self,
        base_url: str,
        timeout: int = 30,
        max_retries: int = 3,
        retry_backoff: float = 0.3,
        auth: Optional[httpx.Auth] = None,
        auth_headers: Optional[Dict[str, str]] = None,
    ):
        self.base_url = base_url
        self.timeout = timeout
        self.max_retries = max_retries
        self.retry_backoff = retry_backoff
        self.auth = auth
        self.auth_headers = auth_headers or {}
        self.settings = get_settings()

    @classmethod
    def _get_shared_client(cls) -> httpx.AsyncClient:
        """Get or create shared HTTP client with connection pooling."""
        if cls._http_client is None:
            settings = get_settings()
            limits = httpx.Limits(
                max_connections=settings.HTTP_POOL_MAX_CONNECTIONS,
                max_keepalive_connections=settings.HTTP_POOL_MAX_KEEPALIVE,
                keepalive_expiry=settings.HTTP_POOL_KEEPALIVE_EXPIRY,
            )

            # Try to enable HTTP/2 if available
            enable_http2 = settings.HTTP_ENABLE_HTTP2
            if enable_http2:
                try:
                    import h2  # noqa
                except ImportError:
                    logger.warning(
                        "HTTP/2 support disabled - h2 package not installed. "
                        "Install with: pip install httpx[http2]"
                    )
                    enable_http2 = False

            cls._http_client = httpx.AsyncClient(
                limits=limits,
                timeout=settings.HTTP_TIMEOUT_SECONDS,
                http2=enable_http2,
                follow_redirects=True,
            )
            logger.info(
                "Initialized shared HTTP client pool",
                max_connections=settings.HTTP_POOL_MAX_CONNECTIONS,
                max_keepalive=settings.HTTP_POOL_MAX_KEEPALIVE,
                http2=enable_http2,
            )
        return cls._http_client

    @classmethod
    async def close_shared_client(cls):
        """Close the shared HTTP client (call on application shutdown)."""
        if cls._http_client is not None:
            await cls._http_client.aclose()
            cls._http_client = None
            logger.info("Closed shared HTTP client pool")

    async def __aenter__(self):
        """Create client with optimized connection pool settings."""
        settings = get_settings()
        limits = httpx.Limits(
            max_connections=settings.HTTP_POOL_MAX_CONNECTIONS,
            max_keepalive_connections=settings.HTTP_POOL_MAX_KEEPALIVE,
            keepalive_expiry=settings.HTTP_POOL_KEEPALIVE_EXPIRY,
        )

        # Try to enable HTTP/2 if available
        enable_http2 = getattr(settings, "HTTP_ENABLE_HTTP2", True)
        if enable_http2:
            try:
                import h2  # noqa
            except ImportError:
                enable_http2 = False

        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=self.timeout,
            headers=self.auth_headers,
            auth=self.auth,
            follow_redirects=True,
            http2=enable_http2,
            limits=limits,
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.client:
            await self.client.aclose()

    @retry(
        stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10), reraise=True
    )
    async def _request(self, method: str, endpoint: str, **kwargs) -> httpx.Response:
        service_name = self.__class__.__name__.replace("Client", "")
        try:
            response = await self.client.request(method, endpoint, **kwargs)
            response.raise_for_status()
            return response
        except (httpx.TimeoutException, httpx.ConnectTimeout, httpx.ReadTimeout) as e:
            logger.error(
                f"Timeout: {method} {endpoint} - {e}", service=service_name, timeout=self.timeout
            )
            raise ServiceTimeoutError(
                service=service_name, timeout_seconds=self.timeout, operation=f"{method} {endpoint}"
            ) from e
        except (httpx.ConnectError, httpx.NetworkError) as e:
            logger.error(
                f"Connection Error: {method} {endpoint} - {e}",
                service=service_name,
                url=f"{self.base_url}{endpoint}",
            )
            raise ServiceConnectionError(
                service=service_name, url=f"{self.base_url}{endpoint}", details=str(e)
            ) from e
        except httpx.HTTPError as e:
            logger.error(f"HTTP Error: {method} {endpoint} - {e}", service=service_name)
            raise

    async def get(self, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Make a GET request to the specified endpoint."""
        response = await self._request("GET", endpoint, **kwargs)
        return response.json()

    async def post(self, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Make a POST request to the specified endpoint."""
        response = await self._request("POST", endpoint, **kwargs)
        return response.json()

    async def patch(self, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Make a PATCH request to the specified endpoint."""
        response = await self._request("PATCH", endpoint, **kwargs)
        return response.json()

    async def put(self, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Make a PUT request to the specified endpoint."""
        response = await self._request("PUT", endpoint, **kwargs)
        return response.json()

    async def delete(self, endpoint: str, **kwargs):
        """Make a DELETE request to the specified endpoint."""
        await self._request("DELETE", endpoint, **kwargs)
