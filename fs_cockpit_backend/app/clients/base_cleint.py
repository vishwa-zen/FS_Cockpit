"""Base client module defining the BaseClient class for API interactions."""

import httpx
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential
from circuitbreaker import circuit
from typing import Optional, Dict, Any

# logging configuration
logger = structlog.get_logger(__name__)

class BaseClient:
    """Base client for interacting with external APIs."""
    def __init__(self,
                 base_url: str,
                 timeout: int = 30,
                 max_retries: int = 3,
                 retry_backoff: float = 0.3,
                 auth: Optional[httpx.Auth] = None,
                 auth_headers: Optional[Dict[str, str]] = None):
        self.base_url = base_url
        self.timeout = timeout
        self.max_retries = max_retries
        self.retry_backoff = retry_backoff
        self.auth = auth
        self.auth_headers = auth_headers or {}
      
    async def __aenter__(self):
        self.client = httpx.AsyncClient(
                    base_url=self.base_url,
                    timeout=self.timeout,
                    headers=self.auth_headers,
                    auth=self.auth,
                    follow_redirects=True,
                )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.client:
            await self.client.aclose()  
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        reraise=True
    )
    
    async def _request(
        self,
        method: str,
        endpoint: str,
        **kwargs
    ) -> httpx.Response:
        try:
            response = await self.client.request(method, endpoint, **kwargs)
            response.raise_for_status()
            return response
        except httpx.HTTPError as e:
            logger.error(f"HTTP Error: {method} {endpoint} - {e}")
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