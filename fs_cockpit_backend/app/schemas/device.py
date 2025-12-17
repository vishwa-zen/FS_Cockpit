"""Data Transfer Objects (DTOs) for Intune Device records."""

from typing import List, Optional

from pydantic import BaseModel


class DeviceDTO(BaseModel):
    """Data Transfer Object representing an Intune Managed Device."""

    deviceId: str
    deviceName: Optional[str] = None
    userPrincipalName: Optional[str] = None
    operatingSystem: Optional[str] = None
    osVersion: Optional[str] = None
    complianceState: Optional[str] = None
    managedDeviceOwnerType: Optional[str] = None
    enrolledDateTime: Optional[str] = None
    lastSyncDateTime: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serialNumber: Optional[str] = None
    isEncrypted: Optional[bool] = None
    userDisplayName: Optional[str] = None


class DeviceListResponse(BaseModel):
    """Response model containing a list of devices."""

    devices: List[DeviceDTO]
