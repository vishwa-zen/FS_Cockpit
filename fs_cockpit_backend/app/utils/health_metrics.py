"""
Health Metrics Tracker

In-memory storage for tracking service health history, uptime, and downtime.
This can be replaced with database storage in the future.
"""
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from collections import deque
import structlog

logger = structlog.get_logger(__name__)


class HealthCheckRecord:
    """Represents a single health check result."""
    
    def __init__(self, service: str, status: str, timestamp: datetime, error: Optional[str] = None):
        self.service = service
        self.status = status  # "healthy" or "unhealthy"
        self.timestamp = timestamp
        self.error = error
    
    def to_dict(self) -> dict:
        """Convert to dictionary format."""
        return {
            "service": self.service,
            "status": self.status,
            "timestamp": self.timestamp.isoformat(),
            "error": self.error
        }


class HealthMetricsTracker:
    """
    Tracks health check history in memory.
    Thread-safe singleton for tracking multiple services.
    """
    
    _instance = None
    _initialized = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(HealthMetricsTracker, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        # Store last 1000 health checks per service (roughly 3-4 days at 5-min intervals)
        self._max_history = 1000
        self._history: Dict[str, deque] = {
            "ServiceNow": deque(maxlen=self._max_history),
            "Intune": deque(maxlen=self._max_history),
            "NextThink": deque(maxlen=self._max_history)
        }
        
        # Track current state
        self._current_state: Dict[str, str] = {
            "ServiceNow": "unknown",
            "Intune": "unknown",
            "NextThink": "unknown"
        }
        
        # Track last state change timestamp
        self._last_state_change: Dict[str, Optional[datetime]] = {
            "ServiceNow": None,
            "Intune": None,
            "NextThink": None
        }
        
        HealthMetricsTracker._initialized = True
        logger.info("HealthMetricsTracker initialized")
    
    def record_health_check(self, service: str, status: str, error: Optional[str] = None) -> None:
        """
        Record a health check result.
        
        Args:
            service: Service name ("ServiceNow", "Intune", "NextThink")
            status: "healthy" or "unhealthy"
            error: Optional error message if unhealthy
        """
        if service not in self._history:
            logger.warning(f"Unknown service: {service}")
            return
        
        timestamp = datetime.now()
        record = HealthCheckRecord(service, status, timestamp, error)
        
        # Add to history
        self._history[service].append(record)
        
        # Track state changes
        previous_state = self._current_state[service]
        if previous_state != status:
            self._current_state[service] = status
            self._last_state_change[service] = timestamp
            logger.info(
                "Service state changed",
                service=service,
                previous_state=previous_state,
                new_state=status,
                timestamp=timestamp.isoformat()
            )
        
        self._current_state[service] = status
    
    def get_uptime_stats(self, service: str, hours: int = 24) -> Dict:
        """
        Calculate uptime statistics for a service over specified hours.
        
        Args:
            service: Service name
            hours: Number of hours to look back (default: 24)
            
        Returns:
            dict: Uptime statistics including percentage, total checks, etc.
        """
        if service not in self._history:
            return {"error": f"Unknown service: {service}"}
        
        cutoff_time = datetime.now() - timedelta(hours=hours)
        history = self._history[service]
        
        # Filter records within time window
        recent_checks = [r for r in history if r.timestamp >= cutoff_time]
        
        if not recent_checks:
            return {
                "service": service,
                "hours": hours,
                "total_checks": 0,
                "healthy_checks": 0,
                "unhealthy_checks": 0,
                "uptime_percentage": 0.0,
                "current_status": self._current_state[service],
                "message": "No data available for specified time period"
            }
        
        total_checks = len(recent_checks)
        healthy_checks = sum(1 for r in recent_checks if r.status == "healthy")
        unhealthy_checks = total_checks - healthy_checks
        uptime_percentage = (healthy_checks / total_checks * 100) if total_checks > 0 else 0.0
        
        # Find downtime periods
        downtime_periods = self._calculate_downtime_periods(recent_checks)
        
        # Calculate total downtime duration
        total_downtime_minutes = sum(p["duration_minutes"] for p in downtime_periods)
        
        return {
            "service": service,
            "time_period_hours": hours,
            "current_status": self._current_state[service],
            "last_state_change": self._last_state_change[service].isoformat() if self._last_state_change[service] else None,
            "total_checks": total_checks,
            "healthy_checks": healthy_checks,
            "unhealthy_checks": unhealthy_checks,
            "uptime_percentage": round(uptime_percentage, 2),
            "downtime_percentage": round(100 - uptime_percentage, 2),
            "total_downtime_minutes": total_downtime_minutes,
            "downtime_periods": downtime_periods,
            "first_check": recent_checks[0].timestamp.isoformat(),
            "last_check": recent_checks[-1].timestamp.isoformat()
        }
    
    def _calculate_downtime_periods(self, records: List[HealthCheckRecord]) -> List[Dict]:
        """
        Calculate distinct downtime periods from health check records.
        
        Args:
            records: List of health check records (sorted by timestamp)
            
        Returns:
            List of downtime periods with start, end, and duration
        """
        downtime_periods = []
        current_downtime_start = None
        
        for record in records:
            if record.status == "unhealthy":
                if current_downtime_start is None:
                    current_downtime_start = record.timestamp
            else:  # healthy
                if current_downtime_start is not None:
                    # Downtime period ended
                    duration = (record.timestamp - current_downtime_start).total_seconds() / 60
                    downtime_periods.append({
                        "start": current_downtime_start.isoformat(),
                        "end": record.timestamp.isoformat(),
                        "duration_minutes": round(duration, 2)
                    })
                    current_downtime_start = None
        
        # If still in downtime period at end of records
        if current_downtime_start is not None:
            duration = (datetime.now() - current_downtime_start).total_seconds() / 60
            downtime_periods.append({
                "start": current_downtime_start.isoformat(),
                "end": "ongoing",
                "duration_minutes": round(duration, 2)
            })
        
        return downtime_periods
    
    def get_all_services_stats(self, hours: int = 24) -> Dict:
        """
        Get uptime statistics for all services.
        
        Args:
            hours: Number of hours to look back
            
        Returns:
            dict: Stats for all services
        """
        return {
            "time_period_hours": hours,
            "services": {
                "servicenow": self.get_uptime_stats("ServiceNow", hours),
                "intune": self.get_uptime_stats("Intune", hours),
                "nextthink": self.get_uptime_stats("NextThink", hours)
            },
            "generated_at": datetime.now().isoformat()
        }
    
    def get_recent_history(self, service: str, limit: int = 50) -> List[Dict]:
        """
        Get recent health check history for a service.
        
        Args:
            service: Service name
            limit: Number of recent records to return
            
        Returns:
            List of recent health check records
        """
        if service not in self._history:
            return []
        
        history = list(self._history[service])
        recent = history[-limit:] if len(history) > limit else history
        return [r.to_dict() for r in reversed(recent)]  # Most recent first
    
    def clear_history(self, service: Optional[str] = None) -> None:
        """
        Clear health check history.
        
        Args:
            service: Specific service to clear, or None to clear all
        """
        if service:
            if service in self._history:
                self._history[service].clear()
                self._current_state[service] = "unknown"
                self._last_state_change[service] = None
                logger.info(f"Cleared history for {service}")
        else:
            for svc in self._history:
                self._history[svc].clear()
                self._current_state[svc] = "unknown"
                self._last_state_change[svc] = None
            logger.info("Cleared all health check history")


# Global singleton instance
_tracker = HealthMetricsTracker()


def get_health_tracker() -> HealthMetricsTracker:
    """Get the global health metrics tracker instance."""
    return _tracker
