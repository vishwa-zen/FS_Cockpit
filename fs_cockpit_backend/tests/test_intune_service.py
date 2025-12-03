"""Tests for Intune service."""
from app.services.intune_service import IntuneService


def test_map_device_to_dto():
    """Test mapping a raw device response to DeviceDTO."""
    service = IntuneService()
    
    raw_device = {
        "id": "device-123",
        "deviceName": "LAPTOP-TEST",
        "userPrincipalName": "user@example.com",
        "operatingSystem": "Windows",
        "osVersion": "10.0.19045",
        "complianceState": "compliant",
        "managedDeviceOwnerType": "company",
        "enrolledDateTime": "2023-01-15T10:30:00Z",
        "lastSyncDateTime": "2023-12-01T14:22:00Z",
        "manufacturer": "Dell",
        "model": "Latitude 5520",
        "serialNumber": "ABC123XYZ",
        "isEncrypted": True,
        "userDisplayName": "John Doe"
    }
    
    dto = service._map_device_to_dto(raw_device)
    
    assert dto.deviceId == "device-123"
    assert dto.deviceName == "LAPTOP-TEST"
    assert dto.userPrincipalName == "user@example.com"
    assert dto.operatingSystem == "Windows"
    assert dto.complianceState == "compliant"
    assert dto.isEncrypted is True


def test_map_device_with_missing_fields():
    """Test mapping a device with minimal fields."""
    service = IntuneService()
    
    raw_device = {
        "id": "device-456"
    }
    
    dto = service._map_device_to_dto(raw_device)
    
    assert dto.deviceId == "device-456"
    assert dto.deviceName is None
    assert dto.userPrincipalName is None
