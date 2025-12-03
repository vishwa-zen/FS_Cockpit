"""Intune API client for Microsoft Graph."""
import httpx
import structlog
from typing import Optional, Dict, Any
from app.clients.base_cleint import BaseClient
from app.exceptions.custom_exceptions import ExternalServiceError

# logging configuration
logger = structlog.get_logger(__name__)


class IntuneClient(BaseClient):
    """Client to interact with Microsoft Graph API for Intune."""
    
    def __init__(
        self,
        graph_base_url: str,
        tenant_id: str,
        client_id: str,
        client_secret: str,
        auth_base_url: str = "https://login.microsoftonline.com",
        timeout: int = 30
    ):
        self.graph_base_url = graph_base_url
        self.auth_base_url = auth_base_url
        self.tenant_id = tenant_id
        self.client_id = client_id
        self.client_secret = client_secret
        self.timeout = timeout
        self.access_token: Optional[str] = None
        self.client = None
        
        # Initialize with Graph API base URL for API calls
        super().__init__(graph_base_url, timeout)
    
    async def _get_access_token(self) -> str:
        """Obtain OAuth2 access token from Microsoft Identity Platform."""
        if self.access_token:
            return self.access_token
        
        logger.debug("Getting access token", auth_base_url=self.auth_base_url, tenant_id=self.tenant_id)
        token_url = f"{self.auth_base_url}/{self.tenant_id}/oauth2/v2.0/token"
        logger.debug("Token URL", url=token_url)
        
        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "scope": "https://graph.microsoft.com/.default",
            "grant_type": "client_credentials"
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(token_url, data=data)
                response.raise_for_status()
                token_data = response.json()
                self.access_token = token_data.get("access_token")
                logger.debug("Successfully obtained access token")
                return self.access_token
        except httpx.HTTPError as e:
            logger.error("Failed to obtain access token", error=str(e))
            resp = getattr(e, "response", None)
            status = getattr(resp, "status_code", 502) if resp else 502
            raise ExternalServiceError(
                service="Microsoft Graph",
                status_code=status,
                message=f"Authentication failed: {str(e)}"
            ) from e
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Perform a lightweight health check by verifying token acquisition.
        Suitable for frequent polling (e.g., every 5 minutes).
        
        Returns:
            dict: Health status and connection details
        """
        try:
            token = await self._get_access_token()
            return {
                "status": "healthy",
                "service": "Microsoft Graph API",
                "auth_url": self.auth_base_url,
                "graph_url": self.graph_base_url,
                "tenant_id": self.tenant_id,
                "authenticated": bool(token)
            }
        except ExternalServiceError as e:
            logger.error("Intune health check failed", error=str(e))
            return {
                "status": "unhealthy",
                "service": "Microsoft Graph API",
                "auth_url": self.auth_base_url,
                "graph_url": self.graph_base_url,
                "tenant_id": self.tenant_id,
                "authenticated": False,
                "error": str(e)
            }
    
    async def authenticate(self) -> Dict[str, Any]:
        """
        Authenticate with Microsoft Graph API and return token info.
        
        Returns:
            dict: Authentication status and details
        """
        try:
            token = await self._get_access_token()
            return {
                "status": "authenticated",
                "service": "Microsoft Graph API",
                "tenant_id": self.tenant_id,
                "client_id": self.client_id,
                "token_acquired": bool(token),
                "access_token": token
            }
        except ExternalServiceError as e:
            logger.error("Intune authentication failed", error=str(e))
            return {
                "status": "authentication_failed",
                "service": "Microsoft Graph API",
                "tenant_id": self.tenant_id,
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
            base_url=self.graph_base_url,
            timeout=self.timeout,
            headers=self.auth_headers,
            follow_redirects=True,
        )
        return self
    
    async def fetch_devices_by_user_email(self, email: str) -> Dict[str, Any]:
        """
        Fetch all managed devices for a user by their email (UPN).
        
        Args:
            email (str): User's email/UPN
            
        Returns:
            dict: Response containing managed devices
        """
        endpoint = "/deviceManagement/managedDevices"
        params = {
            "$filter": f"userPrincipalName eq '{email}'",
            "$select": "id,deviceName,userPrincipalName,operatingSystem,osVersion,complianceState,managedDeviceOwnerType,enrolledDateTime,lastSyncDateTime,manufacturer,model,serialNumber,isEncrypted,userDisplayName"
        }
        
        logger.debug("Fetching devices by user email", email=email)
        
        try:
            response = await self.get(endpoint, params=params)
            return response
        except httpx.HTTPError as e:
            resp = getattr(e, "response", None)
            status = getattr(resp, "status_code", None) if resp is not None else None
            raise ExternalServiceError(
                service="Microsoft Graph",
                status_code=status or 502,
                message=str(e)
            ) from e
    
    async def fetch_device_by_name(self, device_name: str) -> Dict[str, Any]:
        """
        Fetch managed devices by device name.
        
        Args:
            device_name (str): Device name to search for
            
        Returns:
            dict: Response containing managed devices
        """
        endpoint = "/deviceManagement/managedDevices"
        params = {
            "$filter": f"deviceName eq '{device_name}'",
            "$select": "id,deviceName,userPrincipalName,operatingSystem,osVersion,complianceState,managedDeviceOwnerType,enrolledDateTime,lastSyncDateTime,manufacturer,model,serialNumber,isEncrypted,userDisplayName"
        }
        
        logger.debug("Fetching device by name", device_name=device_name)
        
        try:
            response = await self.get(endpoint, params=params)
            return response
        except httpx.HTTPError as e:
            resp = getattr(e, "response", None)
            status = getattr(resp, "status_code", None) if resp is not None else None
            raise ExternalServiceError(
                service="Microsoft Graph",
                status_code=status or 502,
                message=str(e)
            ) from e
    
    async def fetch_device_by_id(self, device_id: str) -> Dict[str, Any]:
        """
        Fetch a specific managed device by its ID.
        
        Args:
            device_id (str): The Intune device ID
            
        Returns:
            dict: Device details
        """
        endpoint = f"/deviceManagement/managedDevices/{device_id}"
        params = {
            "$select": "id,deviceName,userPrincipalName,operatingSystem,osVersion,complianceState,managedDeviceOwnerType,enrolledDateTime,lastSyncDateTime,manufacturer,model,serialNumber,isEncrypted,userDisplayName"
        }
        
        logger.debug("Fetching device by ID", device_id=device_id)
        
        try:
            response = await self.get(endpoint, params=params)
            return response
        except httpx.HTTPError as e:
            resp = getattr(e, "response", None)
            status = getattr(resp, "status_code", None) if resp is not None else None
            if status == 404:
                logger.debug("Device not found", device_id=device_id)
                return {}
            raise ExternalServiceError(
                service="Microsoft Graph",
                status_code=status or 502,
                message=str(e)
            ) from e
