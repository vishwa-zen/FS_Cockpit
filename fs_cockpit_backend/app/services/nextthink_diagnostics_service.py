"""
NextThink Diagnostics Service Module
This module provides functionalities to retrieve and aggregate comprehensive device diagnostics.
Uses actual NextThink NQL query responses.
"""
from typing import Optional, Dict, Any
from datetime import datetime
import structlog
import json
from app.clients.nextthink_client import NextThinkClient
from app.config.settings import get_settings
from app.schemas.diagnostics import (
    ComprehensiveDiagnosticsResponse,
    DiagnosticsRequest,
    HardwareDiagnostics,
    CPUDiagnostics,
    MemoryDiagnostics,
    DiskDiagnostics,
    OSHealthDiagnostics,
    OSBuildInfo,
    SystemUptimeInfo,
    AVAILABLE_DIAGNOSTIC_CATEGORIES
)
from app.cache.memory_cache import get_cache
from app.exceptions.custom_exceptions import ExternalServiceError

# logging configuration
logger = structlog.get_logger(__name__)


class NextThinkDiagnosticsService:
    """
    NextThink Diagnostics Service Class
    
    Retrieves comprehensive device diagnostics from NextThink using NQL queries:
    - #zentience_ntt_demo_device_information: Hardware & OS info
    - #zentience_ntt_demo_device_performance: CPU/GPU/Memory usage, boot metrics
    - #zentience_ntt_demo_device_score: Digital Experience (DEX) scores
    - #zentience_ntt_demo_app_crash_count: Application crash metrics
    - #zentience_ntt_demo_no_of_alerts: Alert summary
    """

    def __init__(self):
        """Initialize the NextThinkDiagnosticsService instance."""
        self.settings = get_settings()
        self.auth_base_url = self.settings.NEXTTHINK_BASE_URL
        self.api_base_url = self.settings.NEXTTHINK_API_URL
        self.username = self.settings.NEXTTHINK_USER_NAME
        self.password = self.settings.NEXTTHINK_PASWORD
        self.grant_type = self.settings.NEXTTHINK_GRANT_TYPE
        self.scope = self.settings.NEXTTHINK_SCOPE
        self.cache = get_cache() if self.settings.CACHE_ENABLED else None

    async def get_device_diagnostics(
        self,
        request: DiagnosticsRequest
    ) -> ComprehensiveDiagnosticsResponse:
        """
        Get comprehensive device diagnostics from NextThink.
        
        Supports two modes:
        1. Full Diagnostics: Retrieves all available diagnostic categories
        2. Partial Diagnostics: Retrieves only selected categories
        
        Args:
            request (DiagnosticsRequest): Diagnostics request with device_name, mode, categories
            
        Returns:
            ComprehensiveDiagnosticsResponse: Comprehensive diagnostics data
        """
        device_name = request.device_name
        mode = request.mode.lower()
        requested_categories = request.categories or AVAILABLE_DIAGNOSTIC_CATEGORIES
        
        logger.info(
            "Fetching device diagnostics",
            device_name=device_name,
            mode=mode,
            categories=requested_categories
        )
        
        # Initialize response
        response = ComprehensiveDiagnosticsResponse(
            device_name=device_name,
            timestamp=datetime.now().isoformat(),
            diagnostics_mode=mode,
            categories_requested=requested_categories,
            categories_available=AVAILABLE_DIAGNOSTIC_CATEGORIES,
            data_completeness_percent=0.0
        )
        
        # Determine which categories to retrieve
        if mode == "full":
            categories_to_fetch = AVAILABLE_DIAGNOSTIC_CATEGORIES.copy()
            # Always include hardware_performance when hardware is requested
            if "hardware" in categories_to_fetch and "hardware_performance" not in categories_to_fetch:
                categories_to_fetch.append("hardware_performance")
        elif mode == "partial":
            # Validate requested categories
            invalid_categories = set(requested_categories) - set(AVAILABLE_DIAGNOSTIC_CATEGORIES)
            if invalid_categories:
                logger.warning(
                    "Invalid diagnostic categories requested",
                    invalid_categories=list(invalid_categories)
                )
                response.notes = f"Invalid categories ignored: {', '.join(invalid_categories)}"
            categories_to_fetch = [
                c for c in requested_categories 
                if c in AVAILABLE_DIAGNOSTIC_CATEGORIES
            ]
            # Always include hardware_performance when hardware is requested
            if "hardware" in categories_to_fetch and "hardware_performance" not in categories_to_fetch:
                categories_to_fetch.append("hardware_performance")
        else:
            raise ValueError(f"Invalid mode: {mode}. Must be 'full' or 'partial'")
        
        # Fetch diagnostics using NextThink client
        try:
            async with NextThinkClient(
                auth_base_url=self.auth_base_url,
                api_base_url=self.api_base_url,
                username=self.username,
                password=self.password,
                grant_type=self.grant_type,
                scope=self.scope
            ) as client:
                # Get raw diagnostics from NextThink
                raw_diagnostics = await client.get_device_diagnostics(
                    device_name=device_name,
                    include_categories=categories_to_fetch
                )
            
            logger.debug(
                "Successfully retrieved raw diagnostics",
                device_name=device_name,
                categories_found=raw_diagnostics.get("queries_executed", [])
            )
            
            # Parse and populate response based on what was returned
            self._parse_and_populate_diagnostics(
                response=response,
                raw_diagnostics=raw_diagnostics,
                include_details=request.include_details
            )
            
            # Calculate data completeness
            if categories_to_fetch:
                completeness = (
                    len(raw_diagnostics.get("queries_executed", [])) / len(categories_to_fetch) * 100
                )
                response.data_completeness_percent = round(completeness, 2)
            
            response.categories_available = raw_diagnostics.get("queries_executed", [])
            
            # Store raw responses only if requested
            if request.include_raw_responses:
                response.raw_responses = raw_diagnostics.get("data", {})
            
            logger.info(
                "Device diagnostics retrieved successfully",
                device_name=device_name,
                completeness_percent=response.data_completeness_percent,
                categories_available=response.categories_available
            )
            
        except ExternalServiceError as e:
            logger.error(
                "Failed to retrieve device diagnostics from NextThink",
                device_name=device_name,
                error=str(e)
            )
            response.notes = f"Error retrieving diagnostics: {str(e)}"
            response.data_completeness_percent = 0.0
        except Exception as e:  # noqa: BLE001
            logger.error(
                "Unexpected error retrieving diagnostics",
                device_name=device_name,
                error=str(e)
            )
            response.notes = f"Unexpected error: {str(e)}"
            response.data_completeness_percent = 0.0
        
        return response

    def _parse_and_populate_diagnostics(
        self,
        response: ComprehensiveDiagnosticsResponse,
        raw_diagnostics: Dict[str, Any],
        include_details: bool = True
    ) -> None:
        """
        Parse raw NextThink diagnostics data and populate response object.
        
        This method maps raw NQL query results to structured diagnostic objects.
        
        Args:
            response: Response object to populate
            raw_diagnostics: Raw diagnostics data from NextThink
            include_details: Whether to include detailed information
        """
        data = raw_diagnostics.get("data", {})
        
        # Query IDs used as keys in raw response data (from client.get_device_diagnostics)
        device_info_key = "#zentience_ntt_demo_device_information"
        device_perf_key = "#zentience_ntt_demo_device_performance"
        device_score_key = "#zentience_ntt_demo_device_score"
        app_crash_key = "#zentience_ntt_demo_app_crash_count"
        alerts_key = "#zentience_ntt_demo_no_of_alerts"
        
        # Parse based on actual query responses
        if device_info_key in data:
            device_info_response = data[device_info_key].get("raw_response", {})
            response.hardware = self._parse_device_information(device_info_response)
            response.os_health = self._parse_os_info_from_device_info(device_info_response)
        
        # Parse performance metrics and merge with hardware
        if device_perf_key in data:
            perf_response = data[device_perf_key].get("raw_response", {})
            perf = self._parse_device_performance(perf_response)
            if perf:
                if response.hardware:
                    # Merge performance data with hardware
                    if perf.cpu:
                        response.hardware.cpu = perf.cpu
                    if perf.gpu:
                        response.hardware.gpu = perf.gpu
                    if perf.memory:
                        response.hardware.memory = perf.memory
                    if perf.network_metrics:
                        response.hardware.network_metrics = perf.network_metrics
                else:
                    response.hardware = perf
        
        if device_score_key in data:
            score_response = data[device_score_key].get("raw_response", {})
            response.device_scores = self._parse_device_score(score_response)
        
        if app_crash_key in data:
            crash_response = data[app_crash_key].get("raw_response", {})
            response.application_health = self._parse_app_crashes(crash_response)
        
        if alerts_key in data:
            alert_response = data[alerts_key].get("raw_response", {})
            response.alert_summary = self._parse_alerts(alert_response)

    def _parse_device_information(self, raw_data: Dict[str, Any]) -> Optional[HardwareDiagnostics]:
        """
        Parse device information query response.
        
        Raw data structure:
        {
            "queryId": "...",
            "headers": [...],
            "data": [[...]]
        }
        """
        try:
            data_rows = raw_data.get("data", [])
            headers = raw_data.get("headers", [])
            
            if not data_rows or not headers:
                return None
            
            # Create a dict mapping headers to values
            first_row = data_rows[0]
            row_dict = {headers[i]: first_row[i] for i in range(len(headers))}
            
            hardware = HardwareDiagnostics()
            
            # Parse CPU information
            cpus_json = row_dict.get("device.cpus")
            if cpus_json:
                try:
                    cpus = json.loads(cpus_json)
                    if cpus and isinstance(cpus, list):
                        cpu_info = cpus[0]
                        hardware.cpu = CPUDiagnostics(
                            cpu_model=cpu_info.get("name"),
                            cpu_speed_ghz=cpu_info.get("frequency"),
                            cpu_cores=cpu_info.get("numberOfCores")
                        )
                except (json.JSONDecodeError, TypeError, IndexError):
                    pass
            
            # Parse Memory information
            memory_bytes = self._safe_float(row_dict.get("device.hardware.memory"))
            if memory_bytes:
                hardware.memory = MemoryDiagnostics(
                    memory_total_gb=memory_bytes / (1024**3)  # Convert bytes to GB
                )
            
            # Parse Disk information
            disks_json = row_dict.get("device.disks")
            if disks_json:
                try:
                    disks = json.loads(disks_json)
                    if disks and isinstance(disks, list):
                        disk_info = disks[0]
                        hardware.disk = DiskDiagnostics(
                            disk_total_gb=disk_info.get("size", 0) / (1024**3),
                            disk_type="SSD" if disk_info.get("bootDisk") else "HDD"
                        )
                except (json.JSONDecodeError, TypeError, IndexError):
                    pass
            
            return hardware if hardware.cpu or hardware.memory or hardware.disk else None
            
        except Exception as e:  # noqa: BLE001
            logger.warning("Error parsing device information", error=str(e))
            return None

    def _parse_os_info_from_device_info(self, raw_data: Dict[str, Any]) -> Optional[OSHealthDiagnostics]:
        """Parse OS information from device_information query."""
        try:
            data_rows = raw_data.get("data", [])
            headers = raw_data.get("headers", [])
            
            if not data_rows or not headers:
                return None
            
            first_row = data_rows[0]
            row_dict = {headers[i]: first_row[i] for i in range(len(headers))}
            
            os_health = OSHealthDiagnostics()
            
            # Build info
            build_info = OSBuildInfo(
                os_name=row_dict.get("device.operating_system.name"),
                os_platform=row_dict.get("device.operating_system.platform"),
                architecture=row_dict.get("device.operating_system.architecture"),
                days_since_last_update=self._safe_int(row_dict.get("device.operating_system.days_since_last_update"))
            )
            os_health.build_info = build_info
            
            # Uptime info
            days_since_last_boot = self._safe_int(row_dict.get("device.boot.days_since_last_full_boot"))
            boot_duration = self._safe_float(row_dict.get("device.boot.last_full_boot_duration"))
            
            uptime_info = SystemUptimeInfo(
                uptime_days=days_since_last_boot,
                last_full_boot_duration_minutes=boot_duration,
                days_since_last_seen=self._safe_int(row_dict.get("device.days_since_last_seen"))
            )
            os_health.uptime_info = uptime_info
            
            return os_health
            
        except Exception as e:  # noqa: BLE001
            logger.warning("Error parsing OS info from device information", error=str(e))
            return None

    def _parse_device_performance(self, raw_data: Dict[str, Any]) -> Optional[HardwareDiagnostics]:
        """
        Parse device performance query response.
        
        Includes CPU, GPU, Memory usage (24h averages), boot metrics, and network info.
        
        Headers:
        - Full_boots, Hard_resets, Suspends, System_crashes (7d counts)
        - device.average_cpu_usage_24h
        - device.average_gpu_usage_24h
        - device.average_memory_usage_24h
        - device.average_time_until_desktop_is_ready_7d
        - device.average_boot_duration_7d
        - device.average_wifi_signal_strength_24h
        """
        try:
            data_rows = raw_data.get("data", [])
            headers = raw_data.get("headers", [])
            
            if not data_rows or not headers:
                return None
            
            first_row = data_rows[0]
            row_dict = {headers[i]: first_row[i] for i in range(len(headers))}
            
            hardware = HardwareDiagnostics()
            
            # CPU metrics (24-hour average)
            cpu_avg = self._safe_float(row_dict.get("device.average_cpu_usage_24h"))
            if cpu_avg is not None:
                hardware.cpu = CPUDiagnostics(
                    cpu_usage_percent=cpu_avg,
                    cpu_usage_24h_avg=cpu_avg
                )
            
            # GPU metrics (24-hour average)
            gpu_avg = self._safe_float(row_dict.get("device.average_gpu_usage_24h"))
            if gpu_avg is not None:
                from app.schemas.diagnostics import GPUDiagnostics
                hardware.gpu = GPUDiagnostics(
                    gpu_usage_percent=gpu_avg,
                    gpu_usage_24h_avg=gpu_avg
                )
            
            # Memory metrics (24-hour average)
            mem_avg = self._safe_float(row_dict.get("device.average_memory_usage_24h"))
            if mem_avg is not None:
                if not hardware.memory:
                    hardware.memory = MemoryDiagnostics()
                hardware.memory.memory_usage_percent = mem_avg
            
            # Boot metrics
            if not hardware.cpu:
                hardware.cpu = CPUDiagnostics()
            
            hardware.cpu.boot_metrics = {
                "full_boots_7d": self._safe_int(row_dict.get("Full_boots")),
                "hard_resets_7d": self._safe_int(row_dict.get("Hard_resets")),
                "suspends_7d": self._safe_int(row_dict.get("Suspends")),
                "system_crashes_7d": self._safe_int(row_dict.get("System_crashes")),
                "average_boot_duration_7d_minutes": self._safe_float(row_dict.get("device.average_boot_duration_7d")),
                "average_time_until_desktop_ready_7d_seconds": self._safe_float(row_dict.get("device.average_time_until_desktop_is_ready_7d"))
            }
            
            # Network metrics
            wifi_signal = self._safe_float(row_dict.get("device.average_wifi_signal_strength_24h"))
            hardware.network_metrics = {
                "wifi_signal_strength_24h_percent": wifi_signal
            }
            
            return hardware
            
        except Exception as e:  # noqa: BLE001
            logger.warning("Error parsing device performance", error=str(e))
            return None

    def _parse_device_score(self, raw_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Parse device score query response.
        
        Contains DEX scores (Digital Experience Score) for various categories.
        """
        try:
            data_rows = raw_data.get("data", [])
            headers = raw_data.get("headers", [])
            
            if not data_rows or not headers:
                return None
            
            first_row = data_rows[0]
            row_dict = {headers[i]: first_row[i] for i in range(len(headers))}
            
            scores = {
                "overall_dex_score": self._safe_float(row_dict.get("device.last_dex_score")),
                "endpoint_score": self._safe_float(row_dict.get("device.last_endpoint_score")),
                "boot_speed_score": self._safe_float(row_dict.get("device.last_boot_speed_score")),
                "logon_speed_score": self._safe_float(row_dict.get("device.last_logon_speed_score")),
                "applications_score": self._safe_float(row_dict.get("device.last_applications_score")),
                "collaboration_score": self._safe_float(row_dict.get("device.last_collaboration_score")),
                "os_activation_score": self._safe_float(row_dict.get("device.last_os_activation_score")),
                "network_quality_score": self._safe_float(row_dict.get("device.last_network_quality_score")),
                "device_performance_score": self._safe_float(row_dict.get("device.last_device_performance_score")),
                "device_reliability_score": self._safe_float(row_dict.get("device.last_device_reliability_score"))
            }
            
            return scores
            
        except Exception as e:  # noqa: BLE001
            logger.warning("Error parsing device scores", error=str(e))
            return None

    def _parse_app_crashes(self, raw_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Parse application crash count from last 24 hours."""
        try:
            data_rows = raw_data.get("data", [])
            headers = raw_data.get("headers", [])
            
            if not data_rows or not headers:
                return None
            
            first_row = data_rows[0]
            row_dict = {headers[i]: first_row[i] for i in range(len(headers))}
            
            return {
                "crash_count_24h": self._safe_int(row_dict.get("crash_count")),
                "time_period": "24 hours"
            }
            
        except Exception as e:  # noqa: BLE001
            logger.warning("Error parsing app crashes", error=str(e))
            return None

    def _parse_alerts(self, raw_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Parse alert count."""
        try:
            data_rows = raw_data.get("data", [])
            headers = raw_data.get("headers", [])
            
            if not data_rows or not headers:
                return None
            
            first_row = data_rows[0]
            row_dict = {headers[i]: first_row[i] for i in range(len(headers))}
            
            return {
                "alert_count": self._safe_int(row_dict.get("no_of_alerts"))
            }
            
        except Exception as e:  # noqa: BLE001
            logger.warning("Error parsing alerts", error=str(e))
            return None

    # ============================================================================
    # Helper Methods
    # ============================================================================

    @staticmethod
    def _safe_float(value: Any, default: Optional[float] = None) -> Optional[float]:
        """Safely convert value to float."""
        if value is None:
            return default
        try:
            return float(value)
        except (ValueError, TypeError):
            return default

    @staticmethod
    def _safe_int(value: Any, default: Optional[int] = None) -> Optional[int]:
        """Safely convert value to int."""
        if value is None:
            return default
        try:
            return int(float(value))
        except (ValueError, TypeError):
            return default
