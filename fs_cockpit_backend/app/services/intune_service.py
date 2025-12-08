"""
    Intune Service Module
    This module provides functionalities to interact with Microsoft Intune via Graph API.
"""
from typing import List, Optional
import structlog
from app.clients.intune_client import IntuneClient
from app.config.settings import get_settings
from app.schemas.device import DeviceDTO
from app.cache.memory_cache import get_cache
from app.db import (
    DeviceWriter,
    SyncHistoryWriter,
    AuditLogWriter,
    SessionLocal,
)

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
        self.cache = get_cache() if self.settings.CACHE_ENABLED else None

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
        Cached for 15 minutes since device associations are relatively stable.

        Args:
            email (str): The user's email (UPN)

        Returns:
            List[DeviceDTO]: List of devices
        """
        # Check cache first
        if self.cache:
            cache_key = f"intune:devices_by_email:{email}"
            cached_devices = self.cache.get(cache_key)
            if cached_devices is not None:
                logger.debug("Cache hit for devices by email", email=email)
                return cached_devices
        
        logger.debug("Connecting to Microsoft Graph", graph_url=self.graph_url, tenant_id=self.tenant_id)

        async with IntuneClient(self.graph_url, self.tenant_id, self.client_id, self.client_secret, auth_base_url=self.base_url) as client:
            raw = await client.fetch_devices_by_user_email(email)

        devices = raw.get("value", [])
        dtos: List[DeviceDTO] = [self._map_device_to_dto(d) for d in devices]
        
        # Cache the result
        if self.cache:
            self.cache.set(cache_key, dtos, ttl_seconds=self.settings.CACHE_TTL_DEVICE)
            logger.debug("Cached devices by email", email=email, count=len(dtos))
        
        return dtos

    async def fetch_devices_by_name(self, device_name: str) -> List[DeviceDTO]:
        """
        Fetch devices by device name.
        Cached for 15 minutes since device info is relatively stable.
        Pushes devices to database for Agentic AI.

        Args:
            device_name (str): The device name

        Returns:
            List[DeviceDTO]: List of devices matching the name
        """
        # Check cache first
        if self.cache:
            cache_key = f"intune:devices_by_name:{device_name}"
            cached_devices = self.cache.get(cache_key)
            if cached_devices is not None:
                logger.debug("Cache hit for devices by name", device_name=device_name)
                return cached_devices
        
        logger.debug("Connecting to Microsoft Graph", graph_url=self.graph_url, tenant_id=self.tenant_id)

        async with IntuneClient(self.graph_url, self.tenant_id, self.client_id, self.client_secret, auth_base_url=self.base_url) as client:
            raw = await client.fetch_device_by_name(device_name)

        devices = raw.get("value", [])
        dtos: List[DeviceDTO] = [self._map_device_to_dto(d) for d in devices]
        
        # Push devices to database for AI engine
        db = SessionLocal()
        try:
            for device in dtos:
                DeviceWriter.push_device(
                    db,
                    device_name=device.deviceName or "",
                    device_type=device.operatingSystem or "Unknown",
                    intune_device_id=device.deviceId,
                    os_version=device.osVersion,
                    serial_number=device.serialNumber,
                    is_compliant=(device.complianceState == "Compliant"),
                    is_managed=True,
                )
            
            # Log sync
            SyncHistoryWriter.push_sync_record(
                db,
                source="Intune",
                sync_status="success",
                record_count=len(dtos),
            )
            logger.info("Pushed devices to DB", count=len(dtos), device_name=device_name)
        except Exception as e:  # noqa: BLE001
            logger.error("Error pushing devices to DB", error=str(e))
        finally:
            db.close()
        
        # Cache the result
        if self.cache:
            self.cache.set(cache_key, dtos, ttl_seconds=self.settings.CACHE_TTL_DEVICE)
            logger.debug("Cached devices by name", device_name=device_name, count=len(dtos))
        
        return dtos

    async def fetch_device_by_id(self, device_id: str) -> Optional[DeviceDTO]:
        """
        Fetch a specific device by its ID.
        Cached for 15 minutes since device info is relatively stable.

        Args:
            device_id (str): The Intune device ID

        Returns:
            Optional[DeviceDTO]: The device details or None if not found
        """
        # Check cache first
        if self.cache:
            cache_key = f"intune:device_by_id:{device_id}"
            cached_device = self.cache.get(cache_key)
            if cached_device is not None:
                logger.debug("Cache hit for device by ID", device_id=device_id)
                return cached_device
        
        logger.debug("Connecting to Microsoft Graph", graph_url=self.graph_url, tenant_id=self.tenant_id)

        async with IntuneClient(self.graph_url, self.tenant_id, self.client_id, self.client_secret, auth_base_url=self.base_url) as client:
            raw = await client.fetch_device_by_id(device_id)

        if not raw:
            return None

        device_dto = self._map_device_to_dto(raw)
        
        # Cache the result
        if self.cache:
            self.cache.set(cache_key, device_dto, ttl_seconds=self.settings.CACHE_TTL_DEVICE)
            logger.debug("Cached device by ID", device_id=device_id)
        
        return device_dto
