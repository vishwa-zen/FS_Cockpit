"""
    Intune Service Module
    This module provides functionalities to interact with Microsoft Intune via Graph API.
"""
from typing import List, Optional
import structlog
from app.clients.intune_client import IntuneClient
from app.config.settings import get_settings
from app.schemas.device import DeviceDTO

# logging configuration
logger = structlog.get_logger(__name__)


class IntuneService:
    """
    Intune Service Class
    This class encapsulates methods to perform operations on Microsoft Intune.
    """

    def __init__(self):
        """Initialize the IntuneService instance."""
        self.settings = get_settings()
        self.base_url = self.settings.INTUNE_BASE_URL
        self.graph_url = self.settings.INTUNE_GRAPH_URL
        self.tenant_id = self.settings.INTUNE_TENANT_ID
        self.client_id = self.settings.INTUNE_CLIENT_ID
        self.client_secret = self.settings.INTUNE_CLIENT_SECRET
        self.scope = self.settings.INTUNE_SCOPE
        self.grant_type = self.settings.INTUNE_GRANT_TYPE

    def _map_device_to_dto(self, device: dict) -> DeviceDTO:
        """Map a raw device record from Graph API to DeviceDTO."""
        return DeviceDTO(
            deviceId=device.get("id", ""),
            deviceName=device.get("deviceName"),
            userPrincipalName=device.get("userPrincipalName"),
            operatingSystem=device.get("operatingSystem"),
            osVersion=device.get("osVersion"),
            complianceState=device.get("complianceState"),
            managedDeviceOwnerType=device.get("managedDeviceOwnerType"),
            enrolledDateTime=device.get("enrolledDateTime"),
            lastSyncDateTime=device.get("lastSyncDateTime"),
            manufacturer=device.get("manufacturer"),
            model=device.get("model"),
            serialNumber=device.get("serialNumber"),
            isEncrypted=device.get("isEncrypted"),
            userDisplayName=device.get("userDisplayName"),
        )

    async def health_check(self) -> dict:
        """
        Perform a health check by attempting to authenticate with Microsoft Graph.

        Returns:
            dict: Health status and connection details
        """
        logger.debug("Performing Intune health check", auth_url=self.base_url, tenant_id=self.tenant_id)
        
        client = IntuneClient(
            graph_base_url="",  # Not needed for health check
            tenant_id=self.tenant_id,
            client_id=self.client_id,
            client_secret=self.client_secret,
            auth_base_url=self.base_url
        )
        return await client.health_check()

    async def authenticate(self) -> dict:
        """
        Authenticate with Microsoft Graph API and return token info.

        Returns:
            dict: Authentication status and details
        """
        logger.debug("Authenticating with Microsoft Graph", tenant_id=self.tenant_id)
        
        client = IntuneClient(
            graph_base_url="",  # Not needed for authenticate
            tenant_id=self.tenant_id,
            client_id=self.client_id,
            client_secret=self.client_secret,
            auth_base_url=self.base_url
        )
        result = await client.authenticate()
        
        # Add additional service-level details
        if result.get("status") == "authenticated":
            result["scope"] = self.scope
            result["grant_type"] = self.grant_type
        
        return result

    async def fetch_devices_by_email(self, email: str) -> List[DeviceDTO]:
        """
        Fetch all devices associated with a user's email.

        Args:
            email (str): The user's email (UPN)

        Returns:
            List[DeviceDTO]: List of devices
        """
        logger.debug("Connecting to Microsoft Graph", graph_url=self.graph_url, tenant_id=self.tenant_id)

        async with IntuneClient(self.graph_url, self.tenant_id, self.client_id, self.client_secret, auth_base_url=self.base_url) as client:
            raw = await client.fetch_devices_by_user_email(email)

        devices = raw.get("value", [])
        dtos: List[DeviceDTO] = [self._map_device_to_dto(d) for d in devices]
        return dtos

    async def fetch_devices_by_name(self, device_name: str) -> List[DeviceDTO]:
        """
        Fetch devices by device name.

        Args:
            device_name (str): The device name

        Returns:
            List[DeviceDTO]: List of devices matching the name
        """
        logger.debug("Connecting to Microsoft Graph", graph_url=self.graph_url, tenant_id=self.tenant_id)

        async with IntuneClient(self.graph_url, self.tenant_id, self.client_id, self.client_secret, auth_base_url=self.base_url) as client:
            raw = await client.fetch_device_by_name(device_name)

        devices = raw.get("value", [])
        dtos: List[DeviceDTO] = [self._map_device_to_dto(d) for d in devices]
        return dtos

    async def fetch_device_by_id(self, device_id: str) -> Optional[DeviceDTO]:
        """
        Fetch a specific device by its ID.

        Args:
            device_id (str): The Intune device ID

        Returns:
            Optional[DeviceDTO]: The device details or None if not found
        """
        logger.debug("Connecting to Microsoft Graph", graph_url=self.graph_url, tenant_id=self.tenant_id)

        async with IntuneClient(self.graph_url, self.tenant_id, self.client_id, self.client_secret, auth_base_url=self.base_url) as client:
            raw = await client.fetch_device_by_id(device_id)

        if not raw:
            return None

        return self._map_device_to_dto(raw)
