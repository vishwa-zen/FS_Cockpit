"""NextThink API client."""
import httpx
import structlog
from typing import Optional, Dict, Any
from app.clients.base_cleint import BaseClient
from app.exceptions.custom_exceptions import ExternalServiceError

# logging configuration
logger = structlog.get_logger(__name__)


class NextThinkClient(BaseClient):
    """Client to interact with NextThink API."""
    
    def __init__(
        self,
        auth_base_url: str,
        api_base_url: str,
        username: str,
        password: str,
        grant_type: str = "client_credentials",
        scope: str = "service:integration",
        timeout: int = 30
    ):
        self.auth_base_url = auth_base_url
        self.api_base_url = api_base_url
        self.username = username
        self.password = password
        self.grant_type = grant_type
        self.scope = scope
        self.timeout = timeout
        self.access_token: Optional[str] = None
        self.client = None
        
        # Initialize with NextThink API URL for API calls
        super().__init__(api_base_url, timeout)
    
    async def _get_access_token(self) -> str:
        """Obtain OAuth2 access token from NextThink."""
        if self.access_token:
            return self.access_token
        
        logger.debug("Getting NextThink access token", auth_base_url=self.auth_base_url)
        # NextThink uses /oauth2/default/v1/token endpoint
        token_url = f"{self.auth_base_url}/oauth2/default/v1/token"
        logger.debug("Token URL", url=token_url)
        
        # Send as form data with proper OAuth2 format
        data = {
            "grant_type": self.grant_type,
            "scope": self.scope
        }
        
        # Use Basic Auth with username and password
        auth = httpx.BasicAuth(username=self.username, password=self.password)
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    token_url, 
                    data=data,
                    auth=auth,
                    headers={"Content-Type": "application/x-www-form-urlencoded"}
                )
                response.raise_for_status()
                token_data = response.json()
                self.access_token = token_data.get("access_token")
                logger.debug("Successfully obtained NextThink access token")
                return self.access_token
        except httpx.HTTPError as e:
            logger.error("Failed to obtain NextThink access token", error=str(e))
            resp = getattr(e, "response", None)
            status = getattr(resp, "status_code", 502) if resp else 502
            raise ExternalServiceError(
                service="NextThink",
                status_code=status,
                message=f"Authentication failed: {str(e)}"
            ) from e
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Perform a lightweight health check by verifying token acquisition.
        
        Returns:
            dict: Health status and connection details
        """
        try:
            token = await self._get_access_token()
            return {
                "status": "healthy",
                "service": "NextThink API",
                "auth_url": self.auth_base_url,
                "api_url": self.api_base_url,
                "authenticated": bool(token)
            }
        except ExternalServiceError as e:
            logger.error("NextThink health check failed", error=str(e))
            return {
                "status": "unhealthy",
                "service": "NextThink API",
                "auth_url": self.auth_base_url,
                "api_url": self.api_base_url,
                "authenticated": False,
                "error": str(e)
            }
    
    async def authenticate(self) -> Dict[str, Any]:
        """
        Authenticate with NextThink API and return token info.
        
        Returns:
            dict: Authentication status and details
        """
        try:
            token = await self._get_access_token()
            return {
                "status": "authenticated",
                "service": "NextThink API",
                "auth_url": self.auth_base_url,
                "api_url": self.api_base_url,
                "username": self.username,
                "token_acquired": bool(token),
                "access_token": token
            }
        except ExternalServiceError as e:
            logger.error("NextThink authentication failed", error=str(e))
            return {
                "status": "authentication_failed",
                "service": "NextThink API",
                "auth_url": self.auth_base_url,
                "api_url": self.api_base_url,
                "error": str(e)
            }
    
    async def __aenter__(self):
        """Set up the client with authentication."""
        token = await self._get_access_token()
        self.auth_headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        self.client = httpx.AsyncClient(
            base_url=self.api_base_url,
            timeout=self.timeout,
            headers=self.auth_headers,
            follow_redirects=True,
        )
        return self
    
    async def get_remote_actions(
        self, 
        device_name: str,
        query_type: str = "detailed"
    ) -> Dict[str, Any]:
        """
        Fetch remote actions from NextThink using NQL query.
        
        Args:
            device_name (str): The device name to query
            query_type (str): "detailed" for all details or "basic" for simple list
            
        Returns:
            dict: Response containing remote actions
        """
        endpoint = "/api/v1/nql/execute"
        
        # Choose query based on type
        if query_type == "basic":
            query_id = "#zentience_ntt_remote_actions_executed_on_a_device"
        else:
            query_id = "#zentience_ntt_all_individual_remote_actions_executed_and_details"
        
        payload = {
            "queryId": query_id,
            "parameters": {
                "device_name": device_name
            }
        }
        
        logger.debug("Fetching remote actions for device", device_name=device_name, query_type=query_type)
        
        try:
            response = await self.post(endpoint, json=payload)
            return response
        except httpx.HTTPError as e:
            resp = getattr(e, "response", None)
            status = getattr(resp, "status_code", None) if resp is not None else None
            raise ExternalServiceError(
                service="NextThink",
                status_code=status or 502,
                message=str(e)
            ) from e
    
    async def get_remote_action_by_id(self, action_id: str) -> Dict[str, Any]:
        """
        Fetch a specific remote action by ID.
        
        Args:
            action_id (str): The remote action ID
            
        Returns:
            dict: Remote action details
        """
        endpoint = f"/api/v1/acts/{action_id}"
        
        logger.debug("Fetching remote action by ID", action_id=action_id)
        
        try:
            response = await self.get(endpoint)
            return response
        except httpx.HTTPError as e:
            resp = getattr(e, "response", None)
            status = getattr(resp, "status_code", None) if resp is not None else None
            if status == 404:
                logger.debug("Remote action not found", action_id=action_id)
                return {}
            raise ExternalServiceError(
                service="NextThink",
                status_code=status or 502,
                message=str(e)
            ) from e
    
    async def execute_remote_action(self, action_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a remote action on NextThink.
        
        Args:
            action_data (dict): The action payload
            
        Returns:
            dict: Execution response
        """
        endpoint = "/api/v1/acts/execute"
        
        logger.debug("Executing remote action", action_data=action_data)
        
        try:
            response = await self.post(endpoint, json=action_data)
            return response
        except httpx.HTTPError as e:
            resp = getattr(e, "response", None)
            status = getattr(resp, "status_code", None) if resp is not None else None
            raise ExternalServiceError(
                service="NextThink",
                status_code=status or 502,
                message=str(e)
            ) from e
