"""API routes for NextThink integration."""
import asyncio
from fastapi import APIRouter, Depends, HTTPException
import structlog
from app.middleware.request_id import get_request_id as _get_request_id
from app.services.nextthink_service import NextThinkService
from app.services.nextthink_diagnostics_service import NextThinkDiagnosticsService
from app.services.servicenow_service import ServiceNowService
from app.schemas.remote_action import (
    RemoteActionDTO,
    RemoteActionListResponse,
    RemoteActionExecuteRequest,
    RemoteActionExecuteResponse
)
from app.schemas.recommendation import RecommendationRequest, RecommendationResponse
from app.schemas.diagnostics import DiagnosticsRequest, ComprehensiveDiagnosticsResponse, AVAILABLE_DIAGNOSTIC_CATEGORIES

# logging configuration
logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/api/v1/nextthink", tags=["NextThink"])


async def get_service():
    """Dependency to get NextThinkService instance."""
    return NextThinkService()


async def get_servicenow_service():
    """Dependency to get ServiceNowService instance."""
    return ServiceNowService()


async def get_diagnostics_service():
    """Dependency to get NextThinkDiagnosticsService instance."""
    return NextThinkDiagnosticsService()


@router.get("/health", summary="NextThink Health Check")
async def nextthink_health_check(
    request_id: str = Depends(_get_request_id),
    service: NextThinkService = Depends(get_service)
):
    """
    Health check endpoint for NextThink integration.

    Args:
        request_id (str): The unique request identifier.
    Returns:
        dict: A dictionary indicating the health status.
    """
    logger.info("NextThink health check", request_id=request_id)
    result = await service.health_check()
    result["request_id"] = request_id
    return result


@router.post("/authenticate", summary="Authenticate with NextThink API")
async def nextthink_authenticate(
    request_id: str = Depends(_get_request_id),
    service: NextThinkService = Depends(get_service)
):
    """
    Authenticate with the NextThink API.

    Args:
        request_id (str): The unique request identifier.
    Returns:
        dict: A dictionary indicating the authentication status.
    """
    logger.info("NextThink authentication", request_id=request_id)
    result = await service.authenticate()
    result["request_id"] = request_id
    return result


@router.get(
    "/remote-actions",
    summary="Get Remote Actions",
    response_model=RemoteActionListResponse,
)
async def get_remote_actions(
    device_name: str,
    query_type: str = "detailed",
    status: str = None,
    days: int = None,
    limit: int = None,
    service: NextThinkService = Depends(get_service)
):
    """
    Retrieve remote actions from NextThink for a specific device with optional filtering.

    Args:
        device_name (str): The device name to query
        query_type (str): "detailed" (default) for all details or "basic" for simple list
        status (str, optional): Comma-separated status values (e.g., "success,failure")
        days (int, optional): Filter actions from last N days
        limit (int, optional): Maximum number of actions to return

    Returns:
        RemoteActionListResponse: A list of remote actions
        
    Examples:
        - Get all actions: ?device_name=CPC-vijay-BSCCU
        - Get only successful: ?device_name=CPC-vijay-BSCCU&status=success
        - Get recent failures: ?device_name=CPC-vijay-BSCCU&status=failure&days=7
        - Get top 10 recent: ?device_name=CPC-vijay-BSCCU&limit=10&days=7
    """
    # Parse status filter
    status_filter = None
    if status:
        status_filter = [s.strip() for s in status.split(",")]
    
    logger.info(
        "Fetching remote actions", 
        device_name=device_name, 
        query_type=query_type,
        status_filter=status_filter,
        days=days,
        limit=limit
    )
    
    actions = await service.get_remote_actions(
        device_name=device_name, 
        query_type=query_type,
        status_filter=status_filter,
        days=days,
        limit=limit
    )
    
    return {"actions": actions, "total": len(actions)}


@router.get(
    "/remote-actions/{action_id}",
    summary="Get Remote Action by ID",
    response_model=RemoteActionDTO,
)
async def get_remote_action_by_id(
    action_id: str,
    service: NextThinkService = Depends(get_service)
):
    """
    Retrieve a specific remote action by its ID.

    Args:
        action_id (str): The remote action ID

    Returns:
        RemoteActionDTO: The remote action details
    """
    logger.info("Fetching remote action by ID", action_id=action_id)
    action = await service.get_remote_action_by_id(action_id)
    if action is None:
        raise HTTPException(status_code=404, detail=f"Remote action {action_id} not found")
    return action


@router.post(
    "/remote-actions/execute",
    summary="Execute Remote Action",
    response_model=RemoteActionExecuteResponse,
)
async def execute_remote_action(
    request: RemoteActionExecuteRequest,
    service: NextThinkService = Depends(get_service)
):
    """
    Execute a remote action on NextThink.

    Args:
        request (RemoteActionExecuteRequest): The action execution request

    Returns:
        RemoteActionExecuteResponse: Execution response
    """
    logger.info("Executing remote action", action_type=request.actionType, device_id=request.deviceId)
    result = await service.execute_remote_action(request)
    
    # Map the response to the expected format
    return RemoteActionExecuteResponse(
        actionId=result.get("actionId", result.get("id", "")),
        status=result.get("status", "unknown"),
        message=result.get("message", result.get("msg"))
    )


@router.post(
    "/recommendations",
    summary="Get Remote Action Recommendations for Incident",
    response_model=RecommendationResponse,
)
async def get_recommendations(
    request: RecommendationRequest,
    nextthink_service: NextThinkService = Depends(get_service),
    servicenow_service: ServiceNowService = Depends(get_servicenow_service)
):
    """
    Get intelligent remote action recommendations for a ServiceNow incident.
    
    Uses category-based filtering and keyword matching to recommend relevant actions.
    
    Args:
        request (RecommendationRequest): Contains incident_number, optional device_name, and limit
        
    Returns:
        RecommendationResponse: Recommended actions sorted by relevance
        
    Examples:
        POST /api/v1/nextthink/recommendations
        {
            "incident_number": "INC0010148",
            "device_name": "CPC-vijay-BSCCU",
            "limit": 10
        }
        
        Or with caller_id for device resolution:
        {
            "incident_number": "INC0002012",
            "caller_id": "67a6adf4938e4e507ec2f6aa7bba10a5"
        }
        
        Or let it auto-detect from incident:
        {
            "incident_number": "INC0002012"
        }
    """
    logger.info("Getting recommendations for incident", incident_number=request.incident_number)
    
    # Fetch incident details from ServiceNow
    incident = await servicenow_service.fetch_incident_details(request.incident_number)
    
    if not incident:
        raise HTTPException(
            status_code=404,
            detail=f"Incident {request.incident_number} not found in ServiceNow"
        )
    
    # Override device name if provided in request body
    if request.device_name:
        incident.deviceName = request.device_name
        logger.info("Using override device name", device_name=request.device_name)
    else:
        # Parallel execution: resolve device name and get device from caller simultaneously
        # These operations are independent and can run in parallel
        resolve_device_task = None
        get_caller_device_task = None
        
        # Task 1: Try to resolve device name if it's a sys_id
        if incident.deviceName:
            resolve_device_task = servicenow_service.resolve_device_name(incident.deviceName)
        
        # Task 2: Try to get device from caller_id (from request or incident)
        caller_sys_id = request.caller_id or incident.callerId
        if not incident.deviceName and caller_sys_id:
            get_caller_device_task = servicenow_service.get_device_name_from_caller(caller_sys_id)
        
        # Execute tasks in parallel if both exist
        if resolve_device_task and get_caller_device_task:
            resolved_name, device_from_caller = await asyncio.gather(
                resolve_device_task,
                get_caller_device_task,
                return_exceptions=True
            )
            # Use resolved name if available, otherwise use caller device
            if not isinstance(resolved_name, Exception) and resolved_name:
                incident.deviceName = resolved_name
                logger.info("Resolved device name from cmdb_ci", device_name=resolved_name)
            elif not isinstance(device_from_caller, Exception) and device_from_caller:
                incident.deviceName = device_from_caller
                logger.info("Resolved device name from caller", device_name=device_from_caller)
        elif resolve_device_task:
            resolved_name = await resolve_device_task
            if resolved_name:
                incident.deviceName = resolved_name
                logger.info("Resolved device name from cmdb_ci", device_name=resolved_name)
        elif get_caller_device_task:
            logger.info("Attempting to get device from caller", caller_id=caller_sys_id)
            device_from_caller = await get_caller_device_task
            if device_from_caller:
                incident.deviceName = device_from_caller
                logger.info("Resolved device name from caller", device_name=device_from_caller, source="request" if request.caller_id else "incident")
    
    # Get recommendations using category-based filtering
    recommendations = await nextthink_service.get_recommendations_for_incident(
        incident=incident,
        limit=request.limit or 10
    )
    
    # Extract category info from incident
    category = incident.category or "unknown"
    
    response = RecommendationResponse(
        incident_number=request.incident_number,
        device_name=incident.deviceName,
        category=category,
        recommendations=recommendations,
        total=len(recommendations)
    )
    
    # Add helpful messages
    if not incident.deviceName:
        response.message = (
            "No device name found in incident. Remote action recommendations require a device name. "
            "Please either: 1) Add 'device_name' to the request body, or 2) Update the incident's 'Configuration Item' (cmdb_ci) field in ServiceNow, "
            "or 3) Include a device name in the incident description using patterns like 'CPC-*', 'LAPTOP-*', etc."
        )
    elif not recommendations:
        response.message = f"No relevant remote actions found for device '{incident.deviceName}' in the last 30 days."
    
    logger.info(
        "Recommendations generated",
        incident_number=request.incident_number,
        device_name=incident.deviceName,
        recommendations_count=len(recommendations)
    )
    
    return response


@router.post(
    "/diagnostics",
    summary="Get Device Diagnostics (Full or Partial)",
    response_model=ComprehensiveDiagnosticsResponse,
)
async def get_device_diagnostics(
    request: DiagnosticsRequest,
    request_id: str = Depends(_get_request_id),
    service: NextThinkDiagnosticsService = Depends(get_diagnostics_service)
):
    """
    Get comprehensive device diagnostics from NextThink.
    
    Supports two diagnostic modes:
    
    **Full Diagnostics**: Retrieves all available diagnostic categories:
    - Hardware (CPU, GPU, Memory, Disk, Battery)
    - OS Health (Build, Uptime, Drivers, Restart Status)
    - Security (Encryption, Antivirus, Firewall, Vulnerabilities)
    - Compliance & Patching (Updates, Compliance Status)
    - Incident History (Past tickets and issues)
    - Logs (System logs and local issues)
    - Services (Running applications and services)
    - Network (Connectivity and interfaces)
    
    **Partial Diagnostics**: Select specific categories to query
    
    Args:
        request (DiagnosticsRequest): 
            - device_name: Device name (required)
            - mode: "full" or "partial" (default: "full")
            - categories: List of categories for partial mode (optional)
            - include_details: Whether to include detailed info (default: True)
    
    Returns:
        ComprehensiveDiagnosticsResponse: Structured diagnostics data with completeness metrics
    
    Examples:
        Full diagnostics:
        POST /api/v1/nextthink/diagnostics
        {
            "device_name": "CPC-vijay-BSCCU",
            "mode": "full"
        }
        
        Partial diagnostics (selected categories):
        POST /api/v1/nextthink/diagnostics
        {
            "device_name": "CPC-vijay-BSCCU",
            "mode": "partial",
            "categories": ["hardware", "security", "compliance"]
        }
        
        Available categories:
        - hardware: CPU, GPU, Memory, Disk, Battery
        - os_health: Build, Uptime, Drivers, Restart Status
        - security: Encryption, Antivirus, Firewall, Vulnerabilities
        - compliance: Patching and compliance status
        - incident_history: Past tickets and issues
        - logs: System logs and local issues
        - services: Running applications and services
        - network: Network connectivity and status
    """
    logger.info(
        "Device diagnostics requested",
        request_id=request_id,
        device_name=request.device_name,
        mode=request.mode,
        categories=request.categories
    )
    
    # Validate mode
    if request.mode.lower() not in ["full", "partial"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid mode: {request.mode}. Must be 'full' or 'partial'"
        )
    
    # Validate categories if partial mode
    if request.mode.lower() == "partial" and request.categories:
        invalid_cats = set(request.categories) - set(AVAILABLE_DIAGNOSTIC_CATEGORIES)
        if invalid_cats:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid categories: {', '.join(invalid_cats)}. Available: {', '.join(AVAILABLE_DIAGNOSTIC_CATEGORIES)}"
            )
    
    try:
        diagnostics = await service.get_device_diagnostics(request)
        diagnostics.__dict__['request_id'] = request_id
        return diagnostics
    except Exception as e:  # noqa: BLE001
        logger.error(
            "Error retrieving device diagnostics",
            request_id=request_id,
            device_name=request.device_name,
            error=str(e)
        )
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve diagnostics: {str(e)}"
        ) from e


@router.get(
    "/diagnostics/categories",
    summary="Get Available Diagnostic Categories",
    response_model=dict,
)
async def get_diagnostic_categories(
    request_id: str = Depends(_get_request_id)
):
    """
    Get list of available diagnostic categories that can be queried.
    
    This is useful for understanding what categories can be selected in partial diagnostics mode.
    
    Returns:
        dict: Available categories and their descriptions
        
    Example:
        GET /api/v1/nextthink/diagnostics/categories
        
        Response:
        {
            "request_id": "req-123",
            "total_categories": 8,
            "categories": [
                {
                    "name": "hardware",
                    "description": "CPU, GPU, Memory, Disk, Battery diagnostics"
                },
                ...
            ]
        }
    """
    logger.info("Fetching diagnostic categories", request_id=request_id)
    
    category_descriptions = {
        "hardware": "CPU, GPU, Memory, Disk, Battery diagnostics (last 24 hours for CPU/GPU)",
        "os_health": "Operating System build, uptime, drivers, restart status",
        "security": "Encryption, antivirus, firewall, vulnerability status",
        "compliance": "Patch status, compliance score, policy violations",
        "incident_history": "Past ServiceNow tickets, recurring issues",
        "logs": "System event logs, application crashes, BSOD incidents",
        "services": "Running services, processes, resource consumption",
        "network": "Network connectivity, interfaces, DNS, latency"
    }
    
    return {
        "request_id": request_id,
        "total_categories": len(AVAILABLE_DIAGNOSTIC_CATEGORIES),
        "categories": [
            {
                "name": cat,
                "description": category_descriptions.get(cat, "Diagnostics for this category")
            }
            for cat in AVAILABLE_DIAGNOSTIC_CATEGORIES
        ]
    }

