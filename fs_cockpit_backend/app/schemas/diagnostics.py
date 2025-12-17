"""Diagnostics schema for comprehensive device diagnostic information."""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

# ================================================================================
# HARDWARE DIAGNOSTICS
# ================================================================================


class CPUDiagnostics(BaseModel):
    """CPU diagnostic information."""

    cpu_usage_percent: Optional[float] = Field(None, description="Current CPU usage percentage")
    cpu_usage_24h_avg: Optional[float] = Field(None, description="Average CPU usage over 24 hours")
    cpu_model: Optional[str] = Field(None, description="CPU model name")
    cpu_speed_ghz: Optional[float] = Field(None, description="CPU base frequency in GHz")
    cpu_cores: Optional[int] = Field(None, description="Number of CPU cores")
    boot_metrics: Optional[Dict[str, Any]] = Field(None, description="Boot-related metrics")


class GPUDiagnostics(BaseModel):
    """GPU diagnostic information."""

    gpu_usage_percent: Optional[float] = Field(None, description="Current GPU usage percentage")
    gpu_usage_24h_avg: Optional[float] = Field(None, description="Average GPU usage over 24 hours")


class MemoryDiagnostics(BaseModel):
    """Memory (RAM) diagnostic information."""

    memory_usage_percent: Optional[float] = Field(None, description="Memory usage percentage")
    memory_total_gb: Optional[float] = Field(None, description="Total physical memory in GB")
    memory_available_gb: Optional[float] = Field(None, description="Available memory in GB")


class DiskDiagnostics(BaseModel):
    """Disk storage diagnostic information."""

    disk_total_gb: Optional[float] = Field(None, description="Total disk space in GB")
    disk_type: Optional[str] = Field(None, description="Disk type: SSD/HDD")


class HardwareDiagnostics(BaseModel):
    """Aggregated hardware diagnostics."""

    cpu: Optional[CPUDiagnostics] = None
    gpu: Optional[GPUDiagnostics] = None
    memory: Optional[MemoryDiagnostics] = None
    disk: Optional[DiskDiagnostics] = None
    network_metrics: Optional[Dict[str, Any]] = None


# ================================================================================
# OPERATING SYSTEM DIAGNOSTICS
# ================================================================================


class OSBuildInfo(BaseModel):
    """Operating system build information."""

    os_name: Optional[str] = Field(
        None, description="Operating system name (e.g., Windows 11 Enterprise)"
    )
    os_platform: Optional[str] = Field(None, description="OS platform (e.g., Windows)")
    architecture: Optional[str] = Field(None, description="OS architecture (e.g., x64)")
    days_since_last_update: Optional[int] = Field(None, description="Days since last OS update")


class SystemUptimeInfo(BaseModel):
    """System uptime information."""

    uptime_days: Optional[int] = Field(None, description="Days since last full boot")
    last_full_boot_duration_minutes: Optional[float] = Field(
        None, description="Last full boot duration in minutes"
    )
    days_since_last_seen: Optional[int] = Field(None, description="Days since device was last seen")


class OSHealthDiagnostics(BaseModel):
    """Aggregated OS health diagnostics."""

    build_info: Optional[OSBuildInfo] = None
    uptime_info: Optional[SystemUptimeInfo] = None


# ================================================================================
# COMPREHENSIVE DIAGNOSTICS RESPONSE
# ================================================================================


class ComprehensiveDiagnosticsResponse(BaseModel):
    """Comprehensive device diagnostics response with all available data."""

    device_name: str = Field(..., description="Device name")
    device_id: Optional[str] = Field(None, description="Device ID from NextThink")
    timestamp: str = Field(..., description="Timestamp when diagnostics were collected")

    # Core diagnostic data
    hardware: Optional[HardwareDiagnostics] = None
    os_health: Optional[OSHealthDiagnostics] = None

    # Digital Experience Scores (DEX)
    device_scores: Optional[Dict[str, Any]] = Field(
        None,
        description="Device scoring metrics (0-100): overall_dex_score, boot_speed, logon_speed, etc.",
    )

    # Application health
    application_health: Optional[Dict[str, Any]] = Field(
        None, description="Application crash count and health metrics"
    )

    # Alerts and notifications
    alert_summary: Optional[Dict[str, Any]] = Field(
        None, description="Summary of active alerts and their severity"
    )

    # Raw query responses (for reference/debugging)
    raw_responses: Optional[Dict[str, Any]] = Field(
        None, description="Raw NQL query responses from NextThink"
    )

    # Metadata
    diagnostics_mode: str = Field(..., description="'full' or 'partial'")
    categories_available: List[str] = Field(
        default_factory=list, description="List of categories retrieved"
    )
    categories_requested: List[str] = Field(
        default_factory=list, description="List of categories requested"
    )
    data_completeness_percent: float = Field(
        ..., description="Percentage of available data retrieved"
    )
    notes: Optional[str] = Field(None, description="Additional notes or warnings")


class DiagnosticsRequest(BaseModel):
    """Diagnostics request parameters."""

    device_name: str = Field(..., description="Device name to diagnose")
    mode: str = Field("full", description="'full' for all diagnostics, 'partial' for selected")
    categories: Optional[List[str]] = Field(
        None,
        description="Categories to include when mode='partial'. Available: hardware, os_health, device_scores, application_health, alerts",
    )
    include_details: bool = Field(True, description="Whether to include detailed information")
    include_raw_responses: bool = Field(
        False, description="Whether to include raw NQL responses (for debugging)"
    )


# All available diagnostic categories based on actual NQL queries
AVAILABLE_DIAGNOSTIC_CATEGORIES = [
    "hardware",  # CPU, GPU, Memory, Disk from device_information + performance
    "os_health",  # Build, Uptime from device_information
    "device_scores",  # DEX scores from device_score query
    "application_health",  # App crashes from app_crash_count
    "alerts",  # Alert counts from no_of_alerts
]
