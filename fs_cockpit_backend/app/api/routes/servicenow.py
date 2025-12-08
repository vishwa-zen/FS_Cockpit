""" 
    ServiceNow API Routes Module
    This module defines API routes for interacting with the ServiceNow platform.
"""
from fastapi import APIRouter, Depends, HTTPException
import structlog
from app.services.servicenow_service import ServiceNowService
from app.middleware.request_id import get_request_id as _get_request_id
from app.schemas.incident import IncidentDTO, IncidentListResponse
from app.schemas.computer import ComputerListResponse
from app.schemas.knowledge import KnowledgeSearchResponse
from app.schemas.solution_summary import SolutionSummaryResponse

# logging configuration
logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/api/v1/servicenow", tags=["ServiceNow"])

async def get_service():
    """Dependency to get ServiceNowService instance."""
    return ServiceNowService()

@router.get("/health", summary="ServiceNow Health Check")
async def servicenow_health_check(
    request_id: str = Depends(_get_request_id),
    service: ServiceNowService = Depends(get_service)
):
    """
    Health check endpoint for ServiceNow integration.

    Args:
        request_id (str): The unique request identifier.
    Returns:
        dict: A dictionary indicating the health status.
    """
    logger.info("ServiceNow health check", request_id=request_id)
    result = await service.health_check()
    result["request_id"] = request_id
    return result

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


@router.get(
    "/user/{user_sys_id}/devices",
    summary="Get Devices by User Sys ID",
    response_model=ComputerListResponse,
)
async def fetch_devices_by_user(user_sys_id: str, service: ServiceNowService = Depends(get_service)):
    """
    Retrieve devices (computers) assigned to a specific user.

    Args:
        user_sys_id (str): The sys_id of the user.
    Returns:
        ComputerListResponse: A list of computers assigned to the user.
    """
    logger.info("Fetching devices for user", user_sys_id=user_sys_id)
    computers = await service.fetch_devices_by_user(user_sys_id)
    return {"computers": computers, "count": len(computers)}


@router.get(
    "/knowledge/search",
    summary="Search Knowledge Articles",
    response_model=KnowledgeSearchResponse,
)
async def search_knowledge_articles(
    query: str,
    limit: int = 5,
    use_search_api: bool = False,  # Default to Table API (more compatible)
    service: ServiceNowService = Depends(get_service)
):
    """
    Search for knowledge articles matching the query.
    Uses ServiceNow Search API for relevance ranking by default.

    Args:
        query (str): Search text (e.g., "Error installing software update")
        limit (int): Maximum number of articles (default: 5)
        use_search_api (bool): Use Search API (True) or Table API (False)
    
    Returns:
        KnowledgeSearchResponse: Matching articles sorted by relevance or popularity.
    """
    logger.info("Searching knowledge articles", query=query, limit=limit)
    articles = await service.search_knowledge_articles(query, limit, use_search_api)
    return {"articles": articles, "count": len(articles), "query": query}


@router.get(
    "/incident/{incident_number}/knowledge",
    summary="Get Knowledge Articles for Incident",
    response_model=KnowledgeSearchResponse,
)
async def get_knowledge_for_incident(
    incident_number: str,
    limit: int = 5,
    service: ServiceNowService = Depends(get_service)
):
    """
    Search for knowledge articles relevant to a specific incident.
    Uses the incident's short description to find matching articles.

    Args:
        incident_number (str): The incident number (e.g., "INC0010001")
        limit (int): Maximum number of articles (default: 5)
    
    Returns:
        KnowledgeSearchResponse: Relevant articles sorted by relevance.
    """
    logger.info("Fetching KB articles for incident", incident_number=incident_number)
    articles = await service.search_knowledge_articles_for_incident(incident_number, limit)
    return {"articles": articles, "count": len(articles), "query": f"incident:{incident_number}"}


@router.get(
    "/incident/{incident_number}/solution_summary",
    summary="Get Solution Summary for Incident",
    response_model=SolutionSummaryResponse,
)
async def get_solution_summary_for_incident(
    incident_number: str,
    limit: int = 3,
    service: ServiceNowService = Depends(get_service)
):
    """
    Get a summary of solution points needed to resolve a ticket.
    
    This endpoint searches for relevant KB articles based on the incident details.
    If KB articles are found, it extracts and returns solution points from them.
    If no KB articles are found, it generates generic solution suggestions based on
    the incident category and description (simulating Google search fallback).

    Args:
        incident_number (str): The incident number (e.g., "INC0024934")
        limit (int): Maximum number of KB articles to consider (default: 3)
    
    Returns:
        SolutionSummaryResponse: 
            - summary_points: List of actionable solution steps
            - source: 'kb_articles' (from ServiceNow KB) or 'google_search' (generated fallback)
            - confidence: 'high' for KB articles, 'medium' for generated suggestions
            - message: Descriptive message about the source and number of articles used
    
    Example:
        GET /api/v1/servicenow/incident/INC0024934/solution_summary?limit=3
        
        Response:
        {
            "incident_number": "INC0024934",
            "summary_points": [
                "Restart the affected system",
                "Clear the application cache",
                "Check system logs for errors"
            ],
            "source": "kb_articles",
            "kb_articles_count": 2,
            "total_kb_articles_used": 2,
            "confidence": "high",
            "message": "Solution summary extracted from 2 relevant KB articles"
        }
    """
    logger.info("Fetching solution summary for incident", incident_number=incident_number, limit=limit)
    result = await service.get_solution_summary_for_incident(incident_number, limit)
    return result


@router.get(
    "/incident/{incident_number}/comments",
    summary="Get Incident Comments and Notes",
)
async def fetch_incident_comments(
    incident_number: str,
    limit: int = 100,
    offset: int = 0,
    request_id: str = Depends(_get_request_id),
    service: ServiceNowService = Depends(get_service)
):
    """
    Retrieve all comments and notes for a specific incident.
    
    Args:
        incident_number (str): The incident number (e.g., "INC0024934")
        limit (int): Maximum number of comments to return (default: 100)
        offset (int): Pagination offset (default: 0)
        request_id (str): The unique request identifier
    
    Returns:
        dict: Dictionary containing:
            - incident_number: The incident number
            - incident_sys_id: The ServiceNow sys_id
            - comments: List of comment objects with text, author, timestamp, etc.
            - total_comments: Total number of comments retrieved
            - limit: Requested limit
            - offset: Requested offset
            - has_more: Whether there are more comments available
    
    Example:
        GET /api/v1/servicenow/incident/INC0024934/comments?limit=50&offset=0
        
        Response:
        {
            "incident_number": "INC0024934",
            "incident_sys_id": "a1b2c3d4e5f6...",
            "comments": [
                {
                    "sys_id": "...",
                    "comment_id": "...",
                    "text": "Issue resolved by applying patch",
                    "created_by": "john.smith",
                    "created_by_name": "John Smith",
                    "created_at": "2024-12-08T10:30:00Z",
                    "updated_at": "2024-12-08T10:30:00Z",
                    "is_internal": false,
                    "comment_type": "comment"
                }
            ],
            "total_comments": 5,
            "limit": 50,
            "offset": 0,
            "has_more": false
        }
    """
    logger.info("Fetching comments for incident", incident_number=incident_number, request_id=request_id)
    result = await service.fetch_incident_comments(incident_number, limit=limit, offset=offset)
    result["request_id"] = request_id
    return result


@router.get(
    "/incident/{incident_number}/activity",
    summary="Get Incident Activity Logs",
)
async def fetch_incident_activity(
    incident_number: str,
    limit: int = 100,
    offset: int = 0,
    request_id: str = Depends(_get_request_id),
    service: ServiceNowService = Depends(get_service)
):
    """
    Retrieve activity logs (field changes and updates) for a specific incident.
    
    This provides a complete audit trail of all changes made to the incident,
    including status changes, priority updates, assignments, etc.
    
    Args:
        incident_number (str): The incident number (e.g., "INC0024934")
        limit (int): Maximum number of activity logs to return (default: 100)
        offset (int): Pagination offset (default: 0)
        request_id (str): The unique request identifier
    
    Returns:
        dict: Dictionary containing:
            - incident_number: The incident number
            - incident_sys_id: The ServiceNow sys_id
            - activity_logs: List of activity log entries with field changes, old/new values, etc.
            - total_activity_logs: Total number of activity logs retrieved
            - limit: Requested limit
            - offset: Requested offset
            - has_more: Whether there are more activity logs available
    
    Example:
        GET /api/v1/servicenow/incident/INC0024934/activity?limit=50&offset=0
        
        Response:
        {
            "incident_number": "INC0024934",
            "incident_sys_id": "a1b2c3d4e5f6...",
            "activity_logs": [
                {
                    "sys_id": "...",
                    "field_name": "state",
                    "old_value": "1",
                    "new_value": "2",
                    "changed_by": "john.smith",
                    "changed_by_name": "John Smith",
                    "changed_at": "2024-12-08T10:30:00Z",
                    "change_type": "update"
                },
                {
                    "sys_id": "...",
                    "field_name": "priority",
                    "old_value": "3",
                    "new_value": "2",
                    "changed_by": "jane.doe",
                    "changed_by_name": "Jane Doe",
                    "changed_at": "2024-12-08T09:15:00Z",
                    "change_type": "update"
                }
            ],
            "total_activity_logs": 12,
            "limit": 50,
            "offset": 0,
            "has_more": false
        }
    """
    logger.info("Fetching activity logs for incident", incident_number=incident_number, request_id=request_id)
    result = await service.fetch_incident_activity_logs(incident_number, limit=limit, offset=offset)
    result["request_id"] = request_id
    return result


@router.get(
    "/incident/{incident_number}/logs",
    summary="Get Incident Comments and Activity Logs (Combined)",
)
async def fetch_incident_logs(
    incident_number: str,
    limit: int = 100,
    offset: int = 0,
    request_id: str = Depends(_get_request_id),
    service: ServiceNowService = Depends(get_service)
):
    """
    Retrieve both comments and activity logs for a specific incident in one call.
    
    Combines comments/notes and activity logs (field changes) into a single response.
    
    Args:
        incident_number (str): The incident number (e.g., "INC0024934")
        limit (int): Maximum number of items to return for each category (default: 100)
        offset (int): Pagination offset (default: 0)
        request_id (str): The unique request identifier
    
    Returns:
        dict: Dictionary containing:
            - incident_number: The incident number
            - incident_sys_id: The ServiceNow sys_id
            - comments: List of comment objects
            - activity_logs: List of activity log entries
            - total_comments: Total comments retrieved
            - total_activity_logs: Total activity logs retrieved
            - limit: Requested limit
            - offset: Requested offset
    
    Example:
        GET /api/v1/servicenow/incident/INC0024934/logs?limit=50&offset=0
        
        Response:
        {
            "incident_number": "INC0024934",
            "incident_sys_id": "a1b2c3d4e5f6...",
            "comments": [...],
            "activity_logs": [...],
            "total_comments": 5,
            "total_activity_logs": 12,
            "limit": 50,
            "offset": 0,
            "request_id": "req-123..."
        }
    """
    logger.info("Fetching comments and activity logs for incident", incident_number=incident_number, request_id=request_id)
    
    comments_result = await service.fetch_incident_comments(incident_number, limit=limit, offset=offset)
    activity_result = await service.fetch_incident_activity_logs(incident_number, limit=limit, offset=offset)
    
    combined_result = {
        "incident_number": incident_number,
        "incident_sys_id": comments_result.get("incident_sys_id", activity_result.get("incident_sys_id", "")),
        "comments": comments_result.get("comments", []),
        "activity_logs": activity_result.get("activity_logs", []),
        "total_comments": comments_result.get("total_comments", 0),
        "total_activity_logs": activity_result.get("total_activity_logs", 0),
        "limit": limit,
        "offset": offset,
        "request_id": request_id
    }
    
    return combined_result



