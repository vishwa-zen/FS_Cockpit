"""API routes for Intune integration."""

import structlog
from fastapi import APIRouter, Depends, HTTPException

from app.middleware.request_id import get_request_id as _get_request_id
from app.schemas.device import DeviceDTO, DeviceListResponse
from app.services.intune_service import IntuneService

# logging configuration
logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/api/v1/intune", tags=["Intune"])


async def get_service():
    """Dependency to get IntuneService instance."""
    return IntuneService()


@router.get("/health", summary="Intune Health Check")
async def intune_health_check(
    request_id: str = Depends(_get_request_id), service: IntuneService = Depends(get_service)
):
    """
    Health check endpoint for Intune integration.

    Args:
        request_id (str): The unique request identifier.
    Returns:
        dict: A dictionary indicating the health status.
    """
    logger.info("Intune health check", request_id=request_id)
    result = await service.health_check()
    result["request_id"] = request_id
    return result


@router.post("/authenticate", summary="Authenticate with Intune API")
async def intune_authenticate(
    request_id: str = Depends(_get_request_id), service: IntuneService = Depends(get_service)
):
    """
    Authenticate with the Intune API.

    Args:
        request_id (str): The unique request identifier.
    Returns:
        dict: A dictionary indicating the authentication status.
    """
    logger.info("Intune authentication", request_id=request_id)
    result = await service.authenticate()
    result["request_id"] = request_id
    return result


@router.get(
    "/devices/email/{email}",
    summary="Get Devices by User Email",
    response_model=DeviceListResponse,
)
async def fetch_devices_by_email(email: str, service: IntuneService = Depends(get_service)):
    """
    Retrieve all devices associated with a user's email (UPN).

    Args:
        email (str): The user's email address (User Principal Name)

    Returns:
        DeviceListResponse: A list of devices for the user
    """
    logger.info("Fetching devices by email", email=email)
    devices = await service.fetch_devices_by_email(email)
    return {"devices": devices}


@router.get(
    "/devices/name/{device_name}",
    summary="Get Devices by Device Name",
    response_model=DeviceListResponse,
)
async def fetch_devices_by_name(device_name: str, service: IntuneService = Depends(get_service)):
    """
    Retrieve devices by device name.

    Args:
        device_name (str): The name of the device

    Returns:
        DeviceListResponse: A list of devices matching the name
    """
    logger.info("Fetching devices by name", device_name=device_name)
    devices = await service.fetch_devices_by_name(device_name)
    return {"devices": devices}


@router.get(
    "/devices/{device_id}",
    summary="Get Device by ID",
    response_model=DeviceDTO,
)
async def fetch_device_by_id(device_id: str, service: IntuneService = Depends(get_service)):
    """
    Retrieve a specific device by its Intune device ID.

    Args:
        device_id (str): The Intune device ID

    Returns:
        DeviceDTO: The device details
    """
    logger.info("Fetching device by ID", device_id=device_id)
    device = await service.fetch_device_by_id(device_id)
    if device is None:
        raise HTTPException(status_code=404, detail=f"Device {device_id} not found")
    return device
