""" 
    ServiceNow API Routes Module
    This module defines API routes for interacting with the ServiceNow platform.
"""
from fastapi import APIRouter, Depends, HTTPException
import structlog
 # ...existing code...
from app.services.servicenow_service import ServiceNowService
from app.middleware.request_id import get_request_id as _get_request_id
from app.schemas.incident import IncidentDTO, IncidentListResponse

# logging configuration
logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/api/v1/servicenow", tags=["ServiceNow"])

async def get_service():
    """Dependency to get ServiceNowService instance."""
    return ServiceNowService()

@router.get("/user/{username}/sys_id", summary="Get ServiceNow User Sys ID by Username")
async def fetch_user_sys_id_by_username(username: str, service: ServiceNowService = Depends(get_service)):
    """
    Fetch the ServiceNow `sys_id` for a user given their username.

    Args:
        username (str): The user_name (login) of the ServiceNow user to look up.
    Returns:
        str: The ServiceNow `sys_id` for the user, or an empty string if not found. 
    """
    logger.info("Fetching ServiceNow user sys_id", username=username)
    return await service.fetch_user_sys_id_by_username(username)


@router.get(
    "/technician/{technician_username}/incidents",
    summary="Get Incidents by Technician ID",
    response_model=IncidentListResponse,
)
async def fetch_incidents_assigned_to_technician(technician_username: str, device_name: str | None = None, service: ServiceNowService = Depends(get_service)):
    """
    Retrieve incidents assigned to a specific technician.

    Args:
        technician_id (str): The ID of the technician.
    Returns:
        dict: A dictionary containing incident information.
    """
    logger.info("Fetching incidents for technician", technician_username=technician_username)
    dtos = await service.fetch_incidents_by_technician(technician_username, cmdb_ci_name=device_name)
    return {"incidents": dtos}

@router.get(
    "/user/{user_name}/incidents",
    summary="Get Incidents by User Name",
    response_model=IncidentListResponse,
)
async def fetch_incidents_by_user(user_name: str, service: ServiceNowService = Depends(get_service)):
    """
    Retrieve incidents reported by a specific user.

    Args:
        caller_sys_id (str): The sys_id of the user who reported the incidents.
    Returns:
        dict: A dictionary containing incident information.
    """
    logger.info("Fetching incidents for user", user_name=user_name)
    dtos = await service.fetch_incidents_by_user(user_name)
    return {"incidents": dtos}


@router.get(
    "/device/{device_name}/incidents",
    summary="Get Incidents by Device Name",
    response_model=IncidentListResponse,
)
async def fetch_incidents_by_device(device_name: str, service: ServiceNowService = Depends(get_service)):
    """
    Retrieve incidents related to a specific device.

    Args:
        device_name (str): The name of the device.
    Returns:
        dict: A dictionary containing incident information.
    """
    logger.info("Fetching incidents for device", device_name=device_name)
    dtos = await service.fetch_incidents_by_device(device_name)
    return {"incidents": dtos}

@router.get("/incident/{incident_number}/details", summary="Get Incident Details by Incident Number", response_model=IncidentDTO)
async def fetch_incident_details(incident_number: str, service: ServiceNowService = Depends(get_service)):
    """
    Retrieve details of a specific incident.

    Args:
        incident_number (str): The number of the incident.
    Returns:
        dict: A dictionary containing incident details.
    """
    logger.info("Fetching incident details", incident_number=incident_number)
    result = await service.fetch_incident_details(incident_number)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Incident {incident_number} not found")
    return result

