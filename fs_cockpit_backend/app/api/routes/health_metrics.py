"""API routes for health metrics and uptime/downtime tracking."""
from fastapi import APIRouter, Query
import structlog
from app.utils.health_metrics import get_health_tracker

# logging configuration
logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/api/v1/health", tags=["Health Metrics"])


@router.get("/metrics", summary="Get Service Uptime/Downtime Metrics")
async def get_health_metrics(
    hours: int = Query(default=24, ge=1, le=168, description="Hours to look back (1-168)")
):
    """
    Get uptime and downtime statistics for all services.
    
    Tracks health check history in memory and calculates:
    - Uptime percentage
    - Downtime periods
    - Current service status
    - Historical health data
    
    Args:
        hours: Number of hours to look back (default: 24, max: 168 = 1 week)
    
    Returns:
        dict: Uptime/downtime statistics for ServiceNow, Intune, and NextThink
        
    Example Response:
        {
          "time_period_hours": 24,
          "services": {
            "servicenow": {
              "service": "ServiceNow",
              "current_status": "healthy",
              "uptime_percentage": 99.5,
              "downtime_percentage": 0.5,
              "total_checks": 288,
              "healthy_checks": 287,
              "unhealthy_checks": 1,
              "downtime_periods": [...]
            },
            "intune": {...},
            "nextthink": {...}
          }
        }
    """
    logger.info("Fetching health metrics", hours=hours)
    tracker = get_health_tracker()
    return tracker.get_all_services_stats(hours=hours)


@router.get("/metrics/{service}", summary="Get Specific Service Metrics")
async def get_service_metrics(
    service: str,
    hours: int = Query(default=24, ge=1, le=168, description="Hours to look back (1-168)")
):
    """
    Get uptime/downtime statistics for a specific service.
    
    Args:
        service: Service name (servicenow, intune, or nextthink)
        hours: Number of hours to look back
    
    Returns:
        dict: Detailed metrics for the specified service
    """
    # Normalize service name
    service_map = {
        "servicenow": "ServiceNow",
        "intune": "Intune",
        "nextthink": "NextThink"
    }
    
    service_name = service_map.get(service.lower())
    if not service_name:
        return {
            "error": f"Unknown service: {service}",
            "valid_services": list(service_map.keys())
        }
    
    logger.info("Fetching service metrics", service=service_name, hours=hours)
    tracker = get_health_tracker()
    return tracker.get_uptime_stats(service_name, hours=hours)


@router.get("/history/{service}", summary="Get Service Health History")
async def get_service_history(
    service: str,
    limit: int = Query(default=50, ge=1, le=500, description="Number of recent records")
):
    """
    Get recent health check history for a specific service.
    
    Args:
        service: Service name (servicenow, intune, or nextthink)
        limit: Number of recent health checks to return
    
    Returns:
        list: Recent health check records
    """
    # Normalize service name
    service_map = {
        "servicenow": "ServiceNow",
        "intune": "Intune",
        "nextthink": "NextThink"
    }
    
    service_name = service_map.get(service.lower())
    if not service_name:
        return {
            "error": f"Unknown service: {service}",
            "valid_services": list(service_map.keys())
        }
    
    logger.info("Fetching service history", service=service_name, limit=limit)
    tracker = get_health_tracker()
    history = tracker.get_recent_history(service_name, limit=limit)
    
    return {
        "service": service_name,
        "limit": limit,
        "records_returned": len(history),
        "history": history
    }
