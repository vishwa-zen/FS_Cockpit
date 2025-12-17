"""
ServiceNow Service Module
This module provides functionalities to interact with the ServiceNow platform.
"""

from typing import List, Optional

import structlog

from app.cache.memory_cache import get_cache
from app.clients.google_ai_client import get_google_ai_client
from app.clients.servicenow_client import ServiceNowClient
from app.config.settings import get_settings
from app.db import (
    AuditLogWriter,
    IncidentWriter,
    SessionLocal,
)
from app.exceptions.custom_exceptions import ExternalServiceError
from app.schemas.computer import ComputerDTO
from app.schemas.incident import IncidentDTO
from app.schemas.knowledge import KnowledgeArticleDTO
from app.utils.incident_utils import IncidentUtils

# logging configuration
logger = structlog.get_logger(__name__)


class ServiceNowService:
    """
    ServiceNow Service Class
    This class encapsulates methods to perform operations on the ServiceNow platform.
    """

    def __init__(self):
        """Initialize the ServiceNowService instance."""
        self.settings = get_settings()
        self.base_url = self.settings.SERVICENOW_INSTANCE_URL
        self.sn_username = self.settings.SERVICENOW_USERNAME
        self.sn_password = self.settings.SERVICENOW_PASSWORD
        self.cache = get_cache() if self.settings.CACHE_ENABLED else None

    async def health_check(self) -> dict:
        """
        Perform a health check by verifying connection to ServiceNow.

        Returns:
            dict: Health status and connection details
        """
        logger.debug("Performing ServiceNow health check", instance_url=self.base_url)

        async with ServiceNowClient(self.base_url, self.sn_username, self.sn_password) as client:
            result = await client.health_check()

        return result

    async def fetch_user_sys_id_by_username(self, username: str) -> str:
        """
        Fetches the ServiceNow `sys_id` for a user given their username.
        Cached for 1 hour since user data rarely changes.

        Args:
            username (str): The user_name (login) of the ServiceNow user to look up.

        Returns:
            str: The ServiceNow `sys_id` for the user, or an empty string if not found.
        """
        # Check cache first
        if self.cache:
            cache_key = f"sn:user_sys_id:{username}"
            cached_sys_id = self.cache.get(cache_key)
            if cached_sys_id is not None:
                logger.debug("Cache hit for user sys_id", username=username)
                return cached_sys_id

        logger.debug("Connecting to ServiceNow", instance_url=self.base_url)

        async with ServiceNowClient(self.base_url, self.sn_username, self.sn_password) as client:
            sys_id = await client.fetch_user_sys_id_by_username(username)

        # Cache the result
        if self.cache and sys_id:
            self.cache.set(cache_key, sys_id, ttl_seconds=self.settings.CACHE_TTL_USER)
            logger.debug("Cached user sys_id", username=username)

        return sys_id

    async def fetch_incidents_by_technician(
        self,
        technician_username: str,
        cmdb_ci_name: str | None = None,
        limit: int = 25,
        offset: int = 0,
    ) -> tuple[List[IncidentDTO], int]:
        """
        Retrieve incidents assigned to a specific technician with pagination.
        Cached for 5 minutes since incident lists change frequently.
        Also pushes incidents to database for Agentic AI.

        Args:
            technician_username (str): The username of the technician.
            cmdb_ci_name (str | None): Optional device/CMDB CI name filter.
            limit (int): Maximum number of incidents to return (default 25, max 300).
            offset (int): Number of incidents to skip for pagination (default 0).

        Returns:
            tuple: (List of IncidentDTO objects, total count of all incidents)
        """
        # Validate pagination params
        limit = min(limit, 300)  # Cap at 300 to prevent excessive API calls
        limit = max(limit, 1)
        offset = max(offset, 0)

        # Check cache first (cache full list, paginate in-memory)
        if self.cache:
            device_key = cmdb_ci_name or "all"
            cache_key = f"sn:incidents_by_tech:{technician_username}:{device_key}:full"
            cached_incidents = self.cache.get(cache_key)
            if cached_incidents is not None:
                logger.debug(
                    "Cache hit for incidents by technician", username=technician_username
                )
                # Paginate cached results
                total = len(cached_incidents)
                paginated = cached_incidents[offset : offset + limit]
                return paginated, total

        logger.debug("Connecting to ServiceNow", instance_url=self.base_url)

        async with ServiceNowClient(self.base_url, self.sn_username, self.sn_password) as client:
            raw = await client.fetch_incidents_by_technician(
                technician_username, cmdb_ci_name=cmdb_ci_name
            )

        results = raw.get("result", [])
        dtos: List[IncidentDTO] = [self._map_incident_to_dto(r) for r in results]
        # sort by openedAt (newest first)
        dtos = IncidentUtils.sort_dtos_by_opened_at(dtos)

        # Push incidents to database for AI engine
        db = SessionLocal()
        try:
            for incident in dtos:
                IncidentWriter.push_incident(
                    db,
                    incident_number=incident.incidentNumber,
                    short_description=incident.shortDescription or "",
                    servicenow_sys_id=incident.sysId,
                    device_name=incident.deviceName,
                    description=incident.description,
                    status=incident.status or "new",
                    priority=int(incident.priority or 3),
                )

            # Log audit
            AuditLogWriter.log_action(
                db,
                technician_username=technician_username,
                action="fetch_incidents",
                resource_type="incident",
                details=f"fetched {len(dtos)} incidents",
            )
            logger.info("Pushed incidents to DB", count=len(dtos), technician=technician_username)
        except Exception as e:  # noqa: BLE001
            logger.error("Error pushing incidents to DB", error=str(e))
        finally:
            db.close()

        # Cache the full result
        if self.cache:
            cache_key = f"sn:incidents_by_tech:{technician_username}:{device_key}:full"
            self.cache.set(cache_key, dtos, ttl_seconds=self.settings.CACHE_TTL_INCIDENT)
            logger.debug(
                "Cached incidents by technician", username=technician_username, count=len(dtos)
            )

        # Paginate results
        total = len(dtos)
        paginated = dtos[offset : offset + limit]
        return paginated, total

    # Extract string fields using the shared utility

    async def resolve_device_name(self, cmdb_ci_value: str) -> str | None:
        """
        Resolve device name from cmdb_ci value (could be sys_id or name).
        Cached for 15 minutes since device info is relatively stable.

        Args:
            cmdb_ci_value: Either a sys_id or device name

        Returns:
            Device name or None
        """
        if not cmdb_ci_value:
            return None

        # Check cache first
        if self.cache:
            cache_key = f"sn:device_name:{cmdb_ci_value}"
            cached_name = self.cache.get(cache_key)
            if cached_name is not None:
                logger.debug("Cache hit for device name", cmdb_ci=cmdb_ci_value)
                return cached_name

        # If it looks like a sys_id (32 hex chars), fetch the computer name
        if len(cmdb_ci_value) == 32 and all(c in "0123456789abcdef" for c in cmdb_ci_value.lower()):
            async with ServiceNowClient(
                self.base_url, self.sn_username, self.sn_password
            ) as client:
                computer = await client.fetch_computer_by_sys_id(cmdb_ci_value)
                if computer:
                    device_name = IncidentUtils.extract_str(
                        computer.get("name")
                    ) or IncidentUtils.extract_str(computer.get("host_name"))

                    # Cache the result
                    if self.cache and device_name:
                        self.cache.set(
                            cache_key, device_name, ttl_seconds=self.settings.CACHE_TTL_DEVICE
                        )
                        logger.debug("Cached device name", cmdb_ci=cmdb_ci_value)

                    return device_name
            return None

        # Otherwise, assume it's already a device name
        return cmdb_ci_value

    async def get_device_name_from_caller(self, caller_sys_id: str) -> str | None:
        """
        Get device name from caller by fetching user's devices from ServiceNow.
        Cached for 15 minutes since device assignments are relatively stable.

        Args:
            caller_sys_id: The sys_id of the caller from incident

        Returns:
            Device name or None
        """
        if not caller_sys_id:
            return None

        # Check cache first
        if self.cache:
            cache_key = f"sn:device_name_from_caller:{caller_sys_id}"
            cached_device_name = self.cache.get(cache_key)
            if cached_device_name is not None:
                logger.debug("Cache hit for device name from caller", caller_sys_id=caller_sys_id)
                return cached_device_name

        logger.info("Fetching devices from ServiceNow for caller", caller_sys_id=caller_sys_id)

        # Get devices assigned to the user from ServiceNow
        devices = await self.fetch_devices_by_user(caller_sys_id)

        if not devices:
            logger.warning("No devices found for caller", caller_sys_id=caller_sys_id)
            return None

        # Return the first device's name
        first_device = devices[0]
        device_name = first_device.name
        logger.info(
            "Found device from ServiceNow", device_name=device_name, caller_sys_id=caller_sys_id
        )

        # Cache the result
        if self.cache:
            self.cache.set(cache_key, device_name, ttl_seconds=self.settings.CACHE_TTL_DEVICE)
            logger.debug("Cached device name from caller", caller_sys_id=caller_sys_id)

        return device_name

    def _map_incident_to_dto(self, rec: dict) -> IncidentDTO:
        # Extract all fields as strings, using display_value if present
        impact_val = rec.get("impact")
        try:
            if isinstance(impact_val, dict):
                impact_val = int(impact_val.get("value") or 0)
            else:
                impact_val = int(impact_val) if impact_val is not None else None
        except (ValueError, TypeError):
            impact_val = None

        # status will be state.display_value if present
        state_val = rec.get("state")
        status = ""
        if isinstance(state_val, dict):
            status = state_val.get("display_value") or state_val.get("value") or ""
        else:
            status = state_val or ""
        # Prefer explicit cmdb_ci.name field if present (ServiceNow may return it as a flat field)
        device_name = IncidentUtils.extract_str(
            rec.get("cmdb_ci.name")
        ) or IncidentUtils.extract_str(rec.get("cmdb_ci"))

        # Extract both caller_id (sys_id) and callerName (display_value)
        caller_id, caller_name = IncidentUtils.extract_reference_field(rec.get("caller_id"))

        return IncidentDTO(
            sysId=IncidentUtils.extract_str(rec.get("sys_id")),
            incidentNumber=IncidentUtils.extract_str(rec.get("number")),
            shortDescription=IncidentUtils.extract_str(rec.get("short_description")),
            description=IncidentUtils.extract_str(rec.get("description")),
            category=IncidentUtils.extract_str(rec.get("category")),
            subcategory=IncidentUtils.extract_str(rec.get("subcategory")),
            priority=IncidentUtils.extract_str(rec.get("priority")),
            impact=impact_val,
            status=status,
            active=rec.get("active") in (True, "true", "True", "1", 1),
            assignedTo=IncidentUtils.extract_str(rec.get("assigned_to")),
            deviceName=device_name,
            createdBy=IncidentUtils.extract_str(rec.get("sys_created_by")),
            callerId=caller_id,
            callerName=caller_name,
            openedAt=IncidentUtils.extract_str(rec.get("opened_at")),
            lastUpdatedAt=IncidentUtils.extract_str(rec.get("sys_updated_on")),
        )

    async def fetch_incidents_by_user(
        self, user_name: str, limit: int = 25, offset: int = 0
    ) -> tuple[List[IncidentDTO], int]:
        """
        Retrieves incidents raised by the specified user with pagination.
        Cached for 5 minutes since incident lists change frequently.

        Args:
            user_name (str): The name/username of the user.
            limit (int): Maximum number of incidents to return (default 25, max 300).
            offset (int): Number of incidents to skip for pagination (default 0).

        Returns:
            tuple: (List of IncidentDTO objects, total count of all incidents)
        """
        # Validate pagination params
        limit = min(limit, 300)  # Cap at 300 to prevent excessive API calls
        limit = max(limit, 1)
        offset = max(offset, 0)

        # Check cache first (cache full list, paginate in-memory)
        if self.cache:
            cache_key = f"sn:incidents_by_user:{user_name}:full"
            cached_incidents = self.cache.get(cache_key)
            if cached_incidents is not None:
                logger.debug("Cache hit for incidents by user", user_name=user_name)
                # Paginate cached results
                total = len(cached_incidents)
                paginated = cached_incidents[offset : offset + limit]
                return paginated, total

        logger.debug("Connecting to ServiceNow", instance_url=self.base_url)

        async with ServiceNowClient(self.base_url, self.sn_username, self.sn_password) as client:
            raw = await client.fetch_incidents_by_user(user_name)

        results = raw.get("result", [])
        dtos: List[IncidentDTO] = [self._map_incident_to_dto(r) for r in results]
        # sort by openedAt (newest first)
        dtos = IncidentUtils.sort_dtos_by_opened_at(dtos)

        # Cache the full result
        if self.cache:
            cache_key = f"sn:incidents_by_user:{user_name}:full"
            self.cache.set(cache_key, dtos, ttl_seconds=self.settings.CACHE_TTL_INCIDENT)
            logger.debug("Cached incidents by user", user_name=user_name, count=len(dtos))

        # Paginate results
        total = len(dtos)
        paginated = dtos[offset : offset + limit]
        return paginated, total

    async def fetch_incidents_by_device(
        self, device_name: str, limit: int = 25, offset: int = 0
    ) -> tuple[List[IncidentDTO], int]:
        """
        Retrieve incidents related to a specific device with pagination.
        Cached for 5 minutes since incident lists change frequently.

        Args:
            device_name (str): The name of the device.
            limit (int): Maximum number of incidents to return (default 25, max 300).
            offset (int): Number of incidents to skip for pagination (default 0).

        Returns:
            tuple: (List of IncidentDTO objects, total count of all incidents)
        """
        # Validate pagination params
        limit = min(limit, 300)
        limit = max(limit, 1)
        offset = max(offset, 0)

        # Check cache first (cache full list, paginate in-memory)
        if self.cache:
            cache_key = f"sn:incidents_by_device:{device_name}:full"
            cached_incidents = self.cache.get(cache_key)
            if cached_incidents is not None:
                logger.debug("Cache hit for incidents by device", device_name=device_name)
                # Paginate cached results
                total = len(cached_incidents)
                paginated = cached_incidents[offset : offset + limit]
                return paginated, total

        logger.debug("Connecting to ServiceNow", instance_url=self.base_url)

        async with ServiceNowClient(self.base_url, self.sn_username, self.sn_password) as client:
            raw = await client.fetch_incidents_by_device(device_name)

        results = raw.get("result", [])
        dtos: List[IncidentDTO] = [self._map_incident_to_dto(r) for r in results]
        # sort by openedAt (newest first)
        dtos = IncidentUtils.sort_dtos_by_opened_at(dtos)

        # Cache the full result
        if self.cache:
            cache_key = f"sn:incidents_by_device:{device_name}:full"
            self.cache.set(cache_key, dtos, ttl_seconds=self.settings.CACHE_TTL_INCIDENT)
            logger.debug("Cached incidents by device", device_name=device_name, count=len(dtos))

        # Paginate results
        total = len(dtos)
        paginated = dtos[offset : offset + limit]
        return paginated, total

    async def fetch_incident_details(self, incident_number: str) -> Optional[IncidentDTO]:
        """
        Retrieve details of a specific incident.
        Cached for 5 minutes since incident details change frequently.

        Args:
            incident_number (str): The number of the incident.

        Returns:
            Optional[IncidentDTO]: The incident details as an IncidentDTO, or None if not found.
        """
        # Check cache first
        if self.cache:
            cache_key = f"sn:incident_details:{incident_number}"
            cached_incident = self.cache.get(cache_key)
            if cached_incident is not None:
                logger.debug("Cache hit for incident details", incident_number=incident_number)
                return cached_incident

        logger.debug("Connecting to ServiceNow", instance_url=self.base_url)

        async with ServiceNowClient(self.base_url, self.sn_username, self.sn_password) as client:
            raw = await client.fetch_incident_details(incident_number)

        if not raw:
            return None

        # Client returns the incident dict directly (not wrapped in 'result')
        incident_dto = self._map_incident_to_dto(raw)

        # Cache the result
        if self.cache:
            self.cache.set(cache_key, incident_dto, ttl_seconds=self.settings.CACHE_TTL_INCIDENT)
            logger.debug("Cached incident details", incident_number=incident_number)

        return incident_dto

    async def fetch_incident_comments(
        self,
        incident_number: str,
        incident_sys_id: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> dict:
        """
        Retrieve comments and notes for a specific incident.

        Results are cached for the specified TTL (default: 5 minutes).
        Comments include both user-visible comments and internal work notes.

        Args:
            incident_number (str): The incident number (e.g., 'INC0024934'). Used to fetch sys_id if not provided.
            incident_sys_id (str, optional): The ServiceNow sys_id of the incident. If not provided, will be fetched
                from incident details. Providing this avoids an extra lookup.
            limit (int): Maximum number of comments to return (default 100, max typically 300 per API limits).
            offset (int): Pagination offset for retrieving subsequent comment pages (default 0).

        Returns:
            dict: Dictionary containing incident_number, incident_sys_id, comments list, total_comments,
                limit, offset, has_more flag, and optional error/warning messages.
        """
        # Build cache key including pagination to avoid stale data on different pages
        cache_key = f"sn:incident_comments:{incident_number}:{limit}:{offset}"

        # Check cache first - return immediately if available
        if self.cache:
            cached_comments = self.cache.get(cache_key)
            if cached_comments is not None:
                logger.debug(
                    "Cache hit for incident comments",
                    incident_number=incident_number,
                    limit=limit,
                    offset=offset,
                )
                return cached_comments

        # Resolve incident_sys_id if not provided
        if not incident_sys_id:
            incident_detail = await self.fetch_incident_details(incident_number)
            if not incident_detail:
                logger.warning(
                    "Incident not found, cannot fetch comments", incident_number=incident_number
                )
                # Return structured error response instead of raising exception
                return {
                    "incident_number": incident_number,
                    "incident_sys_id": "",
                    "comments": [],
                    "total_comments": 0,
                    "limit": limit,
                    "offset": offset,
                    "has_more": False,
                    "error": f"Incident {incident_number} not found",
                }
            incident_sys_id = incident_detail.sysId

        logger.debug(
            "Fetching incident comments from ServiceNow",
            incident_number=incident_number,
            incident_sys_id=incident_sys_id,
            limit=limit,
            offset=offset,
        )

        try:
            # Fetch raw comments from ServiceNow API
            async with ServiceNowClient(
                self.base_url, self.sn_username, self.sn_password
            ) as client:
                raw_response = await client.fetch_incident_comments(
                    incident_sys_id=incident_sys_id, limit=limit, offset=offset
                )
        except ExternalServiceError as e:
            # ServiceNow API errors (4xx/5xx) are wrapped in ExternalServiceError
            logger.error(
                "ServiceNow API error fetching comments",
                incident_number=incident_number,
                incident_sys_id=incident_sys_id,
                error=str(e),
                status=e.status_code,
            )
            # Return graceful error response
            return {
                "incident_number": incident_number,
                "incident_sys_id": incident_sys_id,
                "comments": [],
                "total_comments": 0,
                "limit": limit,
                "offset": offset,
                "has_more": False,
                "error": f"Failed to fetch comments: {str(e)}",
            }
        except Exception as e:  # noqa: BLE001
            # Catch any unexpected exceptions to prevent route crashes
            logger.error(
                "Unexpected error fetching incident comments",
                incident_number=incident_number,
                incident_sys_id=incident_sys_id,
                error=str(e),
            )
            return {
                "incident_number": incident_number,
                "incident_sys_id": incident_sys_id,
                "comments": [],
                "total_comments": 0,
                "limit": limit,
                "offset": offset,
                "has_more": False,
                "error": "Failed to fetch comments due to unexpected error",
            }

        # Parse and map raw comments to DTOs
        from app.schemas.incident_comments import CommentDTO

        raw_comments = raw_response.get("result", [])
        comments = []

        # Convert each raw comment to a structured CommentDTO
        for comment in raw_comments:
            try:
                comment_dto = CommentDTO(
                    sys_id=IncidentUtils.extract_str(comment.get("sys_id")),
                    comment_id=IncidentUtils.extract_str(
                        comment.get("sys_id")
                    ),  # Use sys_id as unique identifier
                    text=IncidentUtils.extract_str(comment.get("value", "")),
                    created_by=IncidentUtils.extract_str(comment.get("sys_created_by")),
                    created_by_name=IncidentUtils.extract_str(comment.get("sys_created_by")),
                    created_at=IncidentUtils.extract_str(comment.get("sys_created_on")),
                    updated_at=IncidentUtils.extract_str(comment.get("sys_updated_on")),
                    is_internal=comment.get("element")
                    == "work_notes",  # work_notes are internal, comments are public
                    comment_type=(
                        "work_note" if comment.get("element") == "work_notes" else "comment"
                    ),
                )
                comments.append(comment_dto)
            except Exception as e:  # noqa: BLE001
                # Log malformed comments but continue processing others
                logger.warning(
                    "Failed to parse comment, skipping",
                    incident_number=incident_number,
                    error=str(e),
                )
                continue

        # Build result object with pagination metadata
        result = {
            "incident_number": incident_number,
            "incident_sys_id": incident_sys_id,
            "comments": comments,
            "total_comments": len(comments),
            "limit": limit,
            "offset": offset,
            "has_more": len(comments)
            >= limit,  # If we got exactly limit comments, more might exist
        }

        # Cache the result using configured TTL
        if self.cache:
            self.cache.set(cache_key, result, ttl_seconds=self.settings.CACHE_TTL_INCIDENT)
            logger.debug(
                "Cached incident comments",
                incident_number=incident_number,
                count=len(comments),
                ttl_seconds=self.settings.CACHE_TTL_INCIDENT,
            )

        return result

    async def fetch_incident_activity_logs(
        self,
        incident_number: str,
        incident_sys_id: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> dict:
        """
        Retrieve activity logs (field changes and status updates) for a specific incident.

        Provides an audit trail of all modifications made to the incident, including:
        - Status/state changes
        - Priority updates
        - Assignment changes

        Results are cached for the specified TTL (default: 5 minutes).
        Note: Uses sys_journal_field table for state changes since sys_audit_log may have restricted access.

        Args:
            incident_number (str): The incident number (e.g., 'INC0024934'). Used to fetch sys_id if not provided.
            incident_sys_id (str, optional): The ServiceNow sys_id. If not provided, will be fetched from incident details.
            limit (int): Maximum number of activity logs to return (default 100).
            offset (int): Pagination offset (default 0).

        Returns:
            dict: Dictionary containing incident_number, incident_sys_id, activity_logs list, total_activity_logs,
                limit, offset, has_more flag, and optional warning/error messages.
        """
        # Build cache key including pagination to avoid stale data on different pages
        cache_key = f"sn:incident_activity:{incident_number}:{limit}:{offset}"

        # Check cache first - return immediately if available
        if self.cache:
            cached_activity = self.cache.get(cache_key)
            if cached_activity is not None:
                logger.debug(
                    "Cache hit for incident activity logs",
                    incident_number=incident_number,
                    limit=limit,
                    offset=offset,
                )
                return cached_activity

        # Resolve incident_sys_id if not provided
        if not incident_sys_id:
            incident_detail = await self.fetch_incident_details(incident_number)
            if not incident_detail:
                logger.warning(
                    "Incident not found, cannot fetch activity logs",
                    incident_number=incident_number,
                )
                # Return structured error response instead of raising exception
                return {
                    "incident_number": incident_number,
                    "incident_sys_id": "",
                    "activity_logs": [],
                    "total_activity_logs": 0,
                    "limit": limit,
                    "offset": offset,
                    "has_more": False,
                    "error": f"Incident {incident_number} not found",
                }
            incident_sys_id = incident_detail.sysId

        logger.debug(
            "Fetching incident activity logs from ServiceNow",
            incident_number=incident_number,
            incident_sys_id=incident_sys_id,
            limit=limit,
            offset=offset,
        )

        try:
            # Fetch raw activity logs from ServiceNow API
            async with ServiceNowClient(
                self.base_url, self.sn_username, self.sn_password
            ) as client:
                raw_response = await client.fetch_incident_activity_logs(
                    incident_sys_id=incident_sys_id, limit=limit, offset=offset
                )
        except ExternalServiceError as e:
            # ServiceNow API errors (4xx/5xx) are wrapped in ExternalServiceError
            logger.error(
                "ServiceNow API error fetching activity logs",
                incident_number=incident_number,
                incident_sys_id=incident_sys_id,
                error=str(e),
                status=e.status_code,
            )
            # Return graceful error response instead of raising
            return {
                "incident_number": incident_number,
                "incident_sys_id": incident_sys_id,
                "activity_logs": [],
                "total_activity_logs": 0,
                "limit": limit,
                "offset": offset,
                "has_more": False,
                "warning": "Activity logs not available for this incident",
            }
        except Exception as e:  # noqa: BLE001
            # Catch any unexpected exceptions to prevent route crashes
            logger.error(
                "Unexpected error fetching incident activity logs",
                incident_number=incident_number,
                incident_sys_id=incident_sys_id,
                error=str(e),
            )
            return {
                "incident_number": incident_number,
                "incident_sys_id": incident_sys_id,
                "activity_logs": [],
                "total_activity_logs": 0,
                "limit": limit,
                "offset": offset,
                "has_more": False,
                "warning": "Activity logs unavailable due to API restrictions or unexpected error",
            }

        # Parse and map raw activity logs to DTOs
        from app.schemas.incident_comments import ActivityLogEntryDTO

        raw_logs = raw_response.get("result", [])
        activity_logs = []

        # Convert each raw log entry to a structured ActivityLogEntryDTO
        # Note: Uses sys_journal_field table which provides state changes
        for log_entry in raw_logs:
            try:
                log_dto = ActivityLogEntryDTO(
                    sys_id=IncidentUtils.extract_str(log_entry.get("sys_id")),
                    field_name="state",  # sys_journal_field captures state/status changes
                    old_value=None,  # sys_journal_field doesn't provide old_value directly
                    new_value=IncidentUtils.extract_str(
                        log_entry.get("value")
                    ),  # The new state value
                    changed_by=IncidentUtils.extract_str(
                        log_entry.get("sys_created_by")
                    ),  # Who made the change
                    changed_by_name=IncidentUtils.extract_str(log_entry.get("sys_created_by")),
                    changed_at=IncidentUtils.extract_str(
                        log_entry.get("sys_created_on")
                    ),  # When it changed
                    change_type="update",
                )
                activity_logs.append(log_dto)
            except Exception as e:  # noqa: BLE001
                # Log malformed entries but continue processing others
                logger.warning(
                    "Failed to parse activity log entry, skipping",
                    incident_number=incident_number,
                    error=str(e),
                )
                continue

        # Build result object with pagination metadata
        result = {
            "incident_number": incident_number,
            "incident_sys_id": incident_sys_id,
            "activity_logs": activity_logs,
            "total_activity_logs": len(activity_logs),
            "limit": limit,
            "offset": offset,
            "has_more": len(activity_logs)
            >= limit,  # If we got exactly limit logs, more might exist
        }

        # Add warning if no activity logs found (may indicate API restrictions)
        if not activity_logs:
            result["warning"] = (
                "No activity logs found for this incident (may be due to API access restrictions)"
            )

        # Cache the result using configured TTL
        if self.cache:
            self.cache.set(cache_key, result, ttl_seconds=self.settings.CACHE_TTL_INCIDENT)
            logger.debug(
                "Cached incident activity logs",
                incident_number=incident_number,
                count=len(activity_logs),
                ttl_seconds=self.settings.CACHE_TTL_INCIDENT,
            )

        return result

    def _map_computer_to_dto(self, rec: dict) -> ComputerDTO:
        """Map a ServiceNow computer record to ComputerDTO."""
        # Extract assigned_to reference field (both value and display_value)
        assigned_to_id, assigned_to_name = IncidentUtils.extract_reference_field(
            rec.get("assigned_to")
        )

        return ComputerDTO(
            sysId=IncidentUtils.extract_str(rec.get("sys_id")),
            name=IncidentUtils.extract_str(rec.get("name")),
            hostName=IncidentUtils.extract_str(rec.get("host_name")),
            serialNumber=IncidentUtils.extract_str(rec.get("serial_number")),
            assignedToId=assigned_to_id,
            assignedToName=assigned_to_name,
        )

    async def fetch_devices_by_user(self, user_sys_id: str) -> List[ComputerDTO]:
        """
        Retrieves devices (computers) assigned to a specific user.
        Cached for 15 minutes since device assignments are relatively stable.

        Args:
            user_sys_id (str): The sys_id of the user.

        Returns:
            List[ComputerDTO]: List of computers assigned to the user.
        """
        # Check cache first
        if self.cache:
            cache_key = f"sn:devices_by_user:{user_sys_id}"
            cached_devices = self.cache.get(cache_key)
            if cached_devices is not None:
                logger.debug("Cache hit for devices by user", user_sys_id=user_sys_id)
                return cached_devices

        logger.debug("Fetching devices for user", user_sys_id=user_sys_id)

        # Build query parameters
        query = f"assigned_to={user_sys_id}^install_status=1"
        fields = "name,host_name,sys_id,serial_number,assigned_to"

        async with ServiceNowClient(self.base_url, self.sn_username, self.sn_password) as client:
            endpoint = "/api/now/table/cmdb_ci_computer"
            params = {
                "sysparm_query": query,
                "sysparm_fields": fields,
                "sysparm_display_value": "all",
            }
            response = await client.get(endpoint, params=params)

        results = response.get("result", [])
        devices = [self._map_computer_to_dto(rec) for rec in results]

        # Cache the result
        if self.cache:
            self.cache.set(cache_key, devices, ttl_seconds=self.settings.CACHE_TTL_DEVICE)
            logger.debug("Cached devices by user", user_sys_id=user_sys_id, count=len(devices))

        return devices

    def _map_knowledge_article_to_dto(
        self, rec: dict, score: Optional[float] = None
    ) -> KnowledgeArticleDTO:
        """Map a ServiceNow knowledge article record to KnowledgeArticleDTO.

        Handles both sn_km_api format (fields nested under 'fields' key) and Table API format (flat structure).
        """
        # Check if this is sn_km_api format (has 'fields' key) or Table API format
        fields = rec.get("fields", {})

        if fields:
            # sn_km_api format: extract from fields.field_name.value or display_value
            # title and link are at top level, short_description is nested under fields
            title = rec.get("title", "")  # title is at top level in sn_km_api
            short_desc = fields.get("short_description", {}).get("value", "")
            number = fields.get("number", {}).get("value", "")
            sys_id = fields.get("sys_id", {}).get("value", "")

            # Build proper KB article URL - prefer sys_kb_id format
            # Format: https://instance.service-now.com/kb_view.do?sys_kb_id=<sys_id>
            full_link = f"{self.base_url}/kb_view.do?sys_kb_id={sys_id}" if sys_id else None

            return KnowledgeArticleDTO(
                sysId=sys_id,
                number=number,
                title=title,
                shortDescription=short_desc,
                link=full_link,
                knowledgeBase=fields.get("kb_knowledge_base", {}).get("display_value", ""),
                viewCount=fields.get("sys_view_count", {}).get("value"),
                score=(
                    rec.get("score") if score is None else score
                ),  # score is at top level in sn_km_api
                workflow=fields.get("workflow_state", {}).get("value", ""),
                author=fields.get("author", {}).get("display_value", ""),
                publishedDate=fields.get("published", {}).get("value", ""),
            )
        else:
            # Table API format: direct field access
            short_desc = IncidentUtils.extract_str(rec.get("short_description"))
            sys_id = IncidentUtils.extract_str(rec.get("sys_id"))

            # Construct KB article URL for Table API
            kb_link = f"{self.base_url}/kb_view.do?sysparm_article={sys_id}" if sys_id else None

            return KnowledgeArticleDTO(
                sysId=sys_id,
                number=IncidentUtils.extract_str(rec.get("number")),
                title=short_desc,  # Use short_description as title for Table API
                shortDescription=short_desc,
                link=kb_link,
                knowledgeBase=IncidentUtils.extract_str(rec.get("kb_knowledge_base")),
                viewCount=rec.get("sys_view_count"),
                score=score,
                workflow=IncidentUtils.extract_str(rec.get("workflow_state")),
                author=IncidentUtils.extract_str(rec.get("author")),
                publishedDate=IncidentUtils.extract_str(rec.get("published")),
            )

    async def search_knowledge_articles(
        self,
        query: str,
        limit: int = 5,
        use_search_api: bool = False,  # Default to Table API (more compatible)
    ) -> List[KnowledgeArticleDTO]:
        """
        Search for knowledge articles matching the query.
        Cached for 15 minutes since knowledge articles don't change frequently.

        Args:
            query (str): Search text (e.g., incident short description)
            limit (int): Maximum number of articles to return
            use_search_api (bool): If True, uses Search API (relevance ranking).
                                   If False, uses simple Table API query.

        Returns:
            List[KnowledgeArticleDTO]: List of matching knowledge articles,
                                       sorted by relevance or view count.
        """
        # Check cache first
        if self.cache:
            # Use CACHE_TTL_KNOWLEDGE if available, otherwise 900 seconds (15 minutes)
            cache_ttl = getattr(self.settings, "CACHE_TTL_KNOWLEDGE", 900)
            cache_key = f"sn:knowledge:{query}:{limit}:{use_search_api}"
            cached_articles = self.cache.get(cache_key)
            if cached_articles is not None:
                logger.debug("Cache hit for knowledge articles", query=query[:50])
                return cached_articles

        logger.debug("Searching knowledge articles", query=query, use_search_api=use_search_api)

        async with ServiceNowClient(self.base_url, self.sn_username, self.sn_password) as client:
            if use_search_api:
                # Use advanced Search API (requires Knowledge Management plugin)
                # This may not be available on all instances
                endpoint = "/api/now/km/search"
                payload = {
                    "query": query,
                    "language": "en",
                    "limit": limit,
                    "offset": 0,
                    "facets": {"workflow_state": ["published"]},
                }
                response = await client.post(endpoint, json=payload)

                # Search API returns results with scores
                results = response.get("result", {}).get("articles", [])

                # Filter by score threshold and map to DTOs
                filtered_results = [
                    self._map_knowledge_article_to_dto(
                        article.get("article", {}), score=article.get("score")
                    )
                    for article in results
                    if article.get("score", 0) >= 50
                ]

                logger.debug(
                    "KB articles filtered by score",
                    total=len(results),
                    filtered=len(filtered_results),
                    threshold=50,
                )

                return filtered_results
            else:
                # Use standard Knowledge Management API (sn_km_api)
                # This is widely available and purpose-built for KB articles
                endpoint = "/api/sn_km_api/knowledge/articles"
                params = {
                    "query": query,
                    "filter": "workflow_state=published^active=true",
                    "fields": "number,short_description,sys_id,kb_knowledge_base,sys_view_count,workflow_state,author,published",
                    "limit": limit,
                }
                response = await client.get(endpoint, params=params)

                # sn_km_api returns: {"result": {"meta": {...}, "articles": [...]}}
                result = response.get("result", {})
                articles_data = result.get("articles", []) if isinstance(result, dict) else []

                logger.debug("KB API articles found", count=len(articles_data))

                # Log first article structure to debug
                if articles_data:
                    first_article = articles_data[0]
                    logger.debug(
                        "First article structure",
                        article_keys=(
                            list(first_article.keys())
                            if isinstance(first_article, dict)
                            else "not_dict"
                        ),
                        article_sample=str(first_article)[:200],
                    )

                # Filter out None values, validate dict type, and filter by score threshold
                filtered_articles = [
                    self._map_knowledge_article_to_dto(article)
                    for article in articles_data
                    if article is not None
                    and isinstance(article, dict)
                    and article.get("score", 0) >= 50
                ]

                logger.debug(
                    "KB articles filtered by score",
                    total=len(articles_data),
                    filtered=len(filtered_articles),
                    threshold=50,
                )

                # Cache the result
                if self.cache:
                    cache_ttl = getattr(self.settings, "CACHE_TTL_KNOWLEDGE", 900)
                    cache_key = f"sn:knowledge:{query}:{limit}:{use_search_api}"
                    self.cache.set(cache_key, filtered_articles, ttl_seconds=cache_ttl)
                    logger.debug(
                        "Cached knowledge articles", query=query[:50], count=len(filtered_articles)
                    )

                return filtered_articles

    async def search_knowledge_articles_for_incident(
        self, incident_number: str, limit: int = 5
    ) -> List[KnowledgeArticleDTO]:
        """
        Search for knowledge articles relevant to a specific incident.
        Uses incident's short description and category for contextual search.
        Cached for 15 minutes since knowledge articles don't change frequently.

        Args:
            incident_number (str): The incident number
            limit (int): Maximum number of articles to return

        Returns:
            List[KnowledgeArticleDTO]: Relevant knowledge articles sorted by relevance.
        """
        # Check cache first
        if self.cache:
            cache_key = f"sn:knowledge_incident:{incident_number}:{limit}"
            cached_articles = self.cache.get(cache_key)
            if cached_articles is not None:
                logger.debug(
                    "Cache hit for knowledge articles for incident", incident_number=incident_number
                )
                return cached_articles

        logger.debug("Searching KB articles for incident", incident_number=incident_number)

        # First, get incident details
        incident = await self.fetch_incident_details(incident_number)
        if not incident:
            logger.warning("Incident not found", incident_number=incident_number)
            return []

        # Use both short and full description for better matching
        # Prefer full description if available, fallback to short description
        query = incident.description or incident.shortDescription or ""
        if not query:
            logger.warning("Incident has no description", incident_number=incident_number)
            return []

        # Search using the incident description (Table API is more widely supported)
        articles = await self.search_knowledge_articles(query, limit=limit, use_search_api=False)

        # Cache the result
        if self.cache:
            cache_ttl = getattr(self.settings, "CACHE_TTL_KNOWLEDGE", 900)
            cache_key = f"sn:knowledge_incident:{incident_number}:{limit}"
            self.cache.set(cache_key, articles, ttl_seconds=cache_ttl)
            logger.debug(
                "Cached knowledge articles for incident",
                incident_number=incident_number,
                count=len(articles),
            )

        return articles

    async def get_kb_article_content(self, article_sys_id: str, article_number: str = "") -> str:
        """
        Fetch the full content/body of a KB article from ServiceNow.

        Args:
            article_sys_id (str): The sys_id of the KB article
            article_number (str): The article number (KB number) as fallback

        Returns:
            str: The full article content/body text
        """
        logger.debug(
            "Fetching KB article content",
            article_sys_id=article_sys_id,
            article_number=article_number,
        )

        try:
            async with ServiceNowClient(
                self.base_url, self.sn_username, self.sn_password
            ) as client:
                endpoint = "/api/sn_km_api/knowledge/articles"

                # Try fetching with sys_id first
                if article_sys_id:
                    params = {
                        "filter": f"sys_id={article_sys_id}",
                        "fields": "text,body,content,short_description,number",
                    }
                else:
                    params = {
                        "filter": f"number={article_number}",
                        "fields": "text,body,content,short_description,number",
                    }

                response = await client.get(endpoint, params=params)

                result = response.get("result", {})
                articles_data = result.get("articles", []) if isinstance(result, dict) else []

                if articles_data and len(articles_data) > 0:
                    article = articles_data[0]
                    # Try different field names for content
                    content = (
                        article.get("text")
                        or article.get("body")
                        or article.get("content")
                        or article.get("short_description")
                        or ""
                    )
                    if content:
                        logger.debug(
                            "Successfully fetched KB article content",
                            article_sys_id=article_sys_id,
                            content_length=len(str(content)),
                        )
                        return str(content)

                logger.debug("No content found for KB article", article_sys_id=article_sys_id)
                return ""
        except (KeyError, ValueError, TypeError) as e:
            logger.warning(
                "Error fetching KB article content", article_sys_id=article_sys_id, error=str(e)
            )
            # Fallback: return just the article number if we can't get full content
            if article_number:
                return f"Reference Article: {article_number}"
            return ""

    def _extract_summary_points_from_content(self, content: str, min_points: int = 5) -> List[str]:
        """
        Extract summary points from KB article content by parsing sentences and formatting.

        Args:
            content (str): The KB article content/body text
            min_points (int): Minimum number of points to extract (default: 5)

        Returns:
            List[str]: List of extracted summary points
        """
        if not content or not content.strip():
            return []

        import re

        content = re.sub(r"<[^>]+>", "", content)

        points = []

        numbered_pattern = r"^\\s*(?:\\d+\\.|Step\\s+\\d+:|•|\\-|\\*|→)\\s*(.+?)(?=\\n|$)"
        numbered_matches = re.findall(numbered_pattern, content, re.MULTILINE | re.IGNORECASE)
        if numbered_matches:
            points.extend([m.strip() for m in numbered_matches if m.strip()])

        if len(points) >= min_points:
            return points[:min_points]

        sentences = re.split(r"[.!?]\\s+", content)
        for sentence in sentences:
            sentence = sentence.strip()
            if len(sentence) > 20 and len(sentence) < 300:
                points.append(sentence + ".")
            if len(points) >= min_points:
                break

        return points if points else [content[:200] + "..."]

    async def get_solution_summary_for_incident(self, incident_number: str, limit: int = 3) -> dict:
        """
        Get a summary of solution points from KB articles for a specific incident.
        Fetches full KB article content and extracts meaningful summary points.
        Falls back to AI-generated suggestions if no KB articles are found or on errors.
        Results are cached for 15 minutes to improve performance.

        Args:
            incident_number (str): The incident number (e.g., "INC0010001")
            limit (int): Maximum number of KB articles to use (default: 3)

        Returns:
            dict: Contains summary_points (5-6 points), source ('kb_articles' or 'ai_generated'), and metadata
        """
        logger.info(
            "Getting solution summary for incident", incident_number=incident_number, limit=limit
        )

        # Check cache first
        if self.cache:
            cache_key = f"sn:solution_summary:{incident_number}:{limit}"
            cached_result = self.cache.get(cache_key)
            if cached_result is not None:
                logger.debug("Cache hit for solution summary", incident_number=incident_number)
                return cached_result

        try:
            articles = await self.search_knowledge_articles_for_incident(incident_number, limit)

            if articles and len(articles) > 0:
                summary_points = []
                articles_with_content = 0

                for article in articles:
                    content = await self.get_kb_article_content(article.sysId, article.number)

                    if content and len(content) > 20:
                        extracted_points = self._extract_summary_points_from_content(
                            content, min_points=5
                        )
                        if extracted_points:
                            summary_points.extend(extracted_points)
                            articles_with_content += 1
                            logger.debug(
                                "Extracted points from article",
                                article_number=article.number,
                                points_count=len(extracted_points),
                            )
                    else:
                        if article.title and article.title not in summary_points:
                            summary_points.append(article.title)
                        if (
                            article.shortDescription
                            and article.shortDescription not in summary_points
                        ):
                            summary_points.append(article.shortDescription)

                if len(summary_points) >= 5:
                    logger.info(
                        "Solution summary from KB articles",
                        incident_number=incident_number,
                        points_count=len(summary_points),
                    )
                    result = {
                        "incident_number": incident_number,
                        "summary_points": summary_points[:10],
                        "source": "kb_articles",
                        "kb_articles_count": len(articles),
                        "total_kb_articles_used": articles_with_content,
                        "confidence": "high",
                        "message": f"Solution summary extracted from {articles_with_content} relevant KB articles",
                    }

                    # Cache the result
                    if self.cache:
                        cache_ttl = getattr(self.settings, "CACHE_TTL_KNOWLEDGE", 900)
                        cache_key = f"sn:solution_summary:{incident_number}:{limit}"
                        self.cache.set(cache_key, result, ttl_seconds=cache_ttl)
                        logger.debug(
                            "Cached solution summary from KB articles",
                            incident_number=incident_number,
                        )

                    return result
        except (KeyError, ValueError, TypeError) as e:
            logger.warning(
                "Error processing KB articles, using AI fallback",
                incident_number=incident_number,
                error=str(e),
            )

        # Fallback: Generate AI-based summary points
        logger.info(
            "Using AI-generated fallback for solution summary", incident_number=incident_number
        )

        try:
            incident = await self.fetch_incident_details(incident_number)
            if not incident:
                logger.warning(
                    "Incident not found for AI fallback", incident_number=incident_number
                )
                return {
                    "incident_number": incident_number,
                    "summary_points": [],
                    "source": "none",
                    "kb_articles_count": 0,
                    "total_kb_articles_used": 0,
                    "confidence": "none",
                    "message": f"Incident {incident_number} not found",
                }

            search_query = incident.description or incident.shortDescription or ""
            if not search_query:
                logger.warning(
                    "Incident has no description for AI summary", incident_number=incident_number
                )
                search_query = f"{incident_number} {incident.category or ''}"

            summary_points, ai_source = await self._generate_ai_solution_points(
                search_query, incident
            )

            logger.info(
                "Solution summary from AI generation",
                incident_number=incident_number,
                points_count=len(summary_points),
                source=ai_source,
            )

            result = {
                "incident_number": incident_number,
                "summary_points": summary_points,
                "source": ai_source,
                "kb_articles_count": 0,
                "total_kb_articles_used": 0,
                "confidence": "medium",
                "message": f"Solution points generated using AI analysis of: {search_query[:100]}...",
            }

            # Push solution to database for AI engine
            db = SessionLocal()
            try:
                IncidentWriter.update_incident_solution(
                    db,
                    incident_number=incident_number,
                    solution_source=ai_source,
                )
                logger.info(
                    "Pushed solution to DB", incident_number=incident_number, source=ai_source
                )
            except Exception as e:  # noqa: BLE001
                logger.error(
                    "Error pushing solution to DB", incident_number=incident_number, error=str(e)
                )
            finally:
                db.close()

            # Cache the AI-generated result too
            if self.cache:
                cache_ttl = getattr(self.settings, "CACHE_TTL_KNOWLEDGE", 900)
                cache_key = f"sn:solution_summary:{incident_number}:{limit}"
                self.cache.set(cache_key, result, ttl_seconds=cache_ttl)
                logger.debug(
                    "Cached AI-generated solution summary", incident_number=incident_number
                )

            return result
        except (KeyError, ValueError, TypeError) as e:
            logger.error(
                "Error generating AI solution points", incident_number=incident_number, error=str(e)
            )
            return {
                "incident_number": incident_number,
                "summary_points": [],
                "source": "error",
                "kb_articles_count": 0,
                "total_kb_articles_used": 0,
                "confidence": "none",
                "message": f"Unable to generate solution summary for incident {incident_number}",
            }

    async def _generate_ai_solution_points(self, query: str, incident) -> tuple:
        """
        Generate solution points using Google Gemini AI or template-based responses.
        Can toggle between real AI responses and template-based responses via env variable.

        Args:
            query (str): Search query (incident description)
            incident: IncidentDTO object with category, device details, and other information

        Returns:
            Tuple[List[str], str]: (List of 6-8 solution steps, source_type)
                - source_type: "AI" for both real AI and template-based responses

        Raises:
            Exception: If AI generation fails, returns fallback generic solutions
        """
        # Check if we should use real AI or stubbed responses
        use_real_responses = self.settings.GOOGLE_AI_USE_REAL_RESPONSES
        logger.info(
            "[AI_SOLUTION] Starting solution generation",
            use_real_responses=use_real_responses,
            google_ai_enabled=self.settings.GOOGLE_AI_ENABLED,
            query_length=len(query) if query else 0,
        )

        if use_real_responses:
            points, source = await self._generate_real_ai_solutions(query, incident)
            return points, source
        else:
            logger.info("[AI_SOLUTION] GOOGLE_AI_USE_REAL_RESPONSES is False, using stubbed responses")
            points = self._generate_stubbed_solutions(query, incident)
            return points, "AI"

    async def _generate_real_ai_solutions(self, query: str, incident) -> tuple:
        """
        Generate real solutions using Google Gemini AI with comprehensive device details.

        Returns:
            Tuple[List[str], str]: (solution_points, source)
                - source: "AI" for successful AI generation or fallback template responses
        """
        try:
            # Extract context from incident
            device_name = None
            category = None
            device_details_str = ""

            if incident:
                device_name = incident.deviceName if hasattr(incident, "deviceName") else None
                category = incident.category if hasattr(incident, "category") else None

            logger.info(
                "[AI_REAL_SOLUTIONS] Step 1: Extracted incident context",
                device_name=device_name,
                category=category,
                has_incident=incident is not None,
            )

            # Step 1: If device_name is not available, try to get it from caller's devices
            if not device_name and incident and hasattr(incident, "callerId") and incident.callerId:
                try:
                    logger.info(
                        "[AI_REAL_SOLUTIONS] Step 2a: Fetching device from caller",
                        caller_id=incident.callerId,
                    )
                    device_name = await self.get_device_name_from_caller(incident.callerId)
                    logger.info(
                        "[AI_REAL_SOLUTIONS] Step 2a: Got device name from caller",
                        caller_id=incident.callerId,
                        device_name=device_name,
                    )
                except Exception as e:
                    logger.warning(
                        "[AI_REAL_SOLUTIONS] Step 2a: Could not get device from caller",
                        caller_id=incident.callerId,
                        error=str(e),
                        error_type=type(e).__name__,
                    )

            # Step 2: Fetch comprehensive device details from Intune if device_name is available
            if device_name:
                try:
                    logger.info(
                        "[AI_REAL_SOLUTIONS] Step 2b: Fetching device details from Intune",
                        device_name=device_name,
                    )
                    device_details_str = await self._get_device_details_from_intune(device_name)
                    if device_details_str:
                        logger.info(
                            "[AI_REAL_SOLUTIONS] Step 2b: Fetched device details from Intune",
                            device_name=device_name,
                            details_length=len(device_details_str),
                        )
                    else:
                        logger.warning(
                            "[AI_REAL_SOLUTIONS] Step 2b: No device details returned from Intune",
                            device_name=device_name,
                        )
                except Exception as e:
                    logger.warning(
                        "[AI_REAL_SOLUTIONS] Step 2b: Could not fetch device details from Intune",
                        device_name=device_name,
                        error=str(e),
                        error_type=type(e).__name__,
                    )
            else:
                logger.warning(
                    "[AI_REAL_SOLUTIONS] Step 2b: Skipping Intune fetch - no device_name available"
                )

            # Step 3: Get Gemini AI client and generate solutions
            logger.info("[AI_REAL_SOLUTIONS] Step 3: Getting Google AI client")
            ai_client = get_google_ai_client()

            if ai_client is None:
                logger.error("[AI_REAL_SOLUTIONS] Step 3: CRITICAL - AI client is None!")
                raise ValueError("Google AI client is not initialized (None)")

            logger.info(
                "[AI_REAL_SOLUTIONS] Step 3: AI client obtained, requesting solutions from Gemini",
                category=category,
                device_name=device_name,
                has_device_details=bool(device_details_str),
                query_length=len(query) if query else 0,
            )

            # Step 4: Call the AI API
            points = await ai_client.generate_solution_points(
                incident_description=query,
                category=category,
                device_name=device_name,
                device_details=device_details_str,
            )

            logger.info(
                "[AI_REAL_SOLUTIONS] Step 4: SUCCESS - Received solutions from Gemini",
                solutions_count=len(points) if points else 0,
                category=category,
            )

            return points, "AI"

        except Exception as e:  # noqa: BLE001
            import traceback
            logger.error(
                "[AI_REAL_SOLUTIONS] FAILURE - Exception during real AI solution generation",
                error_message=str(e),
                error_type=type(e).__name__,
                query_preview=query[:100] if query else "None",
                traceback=traceback.format_exc(),
            )

            # Fall back to stubbed responses on AI error
            logger.info("[AI_REAL_SOLUTIONS] Falling back to stubbed responses")
            return self._generate_stubbed_solutions(query, incident), "AI"

    async def _get_device_details_from_intune(self, device_name: str) -> str:
        """
        Fetch comprehensive device details from Intune and format them as a string for AI context.
        Follows the existing pattern: ServiceNow devices → Intune device details.

        Args:
            device_name (str): The name of the device (e.g., "CPC-jitin-0PY7D")

        Returns:
            str: Formatted device details string with OS, compliance, management status, etc.
        """
        try:
            from app.clients.intune_client import IntuneClient

            logger.debug("Fetching device details from Intune", device_name=device_name)

            # Create Intune client to fetch device details
            intune_client = IntuneClient(
                graph_base_url=self.settings.INTUNE_GRAPH_URL,
                tenant_id=self.settings.INTUNE_TENANT_ID,
                client_id=self.settings.INTUNE_CLIENT_ID,
                client_secret=self.settings.INTUNE_CLIENT_SECRET,
            )

            # Fetch device details by name from Intune
            device_details = await intune_client.fetch_device_by_name(device_name)

            if not device_details:
                logger.debug("No device found in Intune", device_name=device_name)
                return ""

            # Build comprehensive device details string
            details_parts = []

            # Basic info
            if device_name:
                details_parts.append(f"Computer: {device_name}")

            # Operating System
            os_version = device_details.get("operatingSystem")
            if os_version:
                details_parts.append(f"OS: {os_version}")

            # OS Version details
            os_version_detail = device_details.get("osVersion")
            if os_version_detail:
                details_parts.append(f"OS Version: {os_version_detail}")

            # Device compliance status
            compliance = device_details.get("complianceState")
            if compliance:
                details_parts.append(f"Compliance: {compliance}")

            # Device management status
            managed = device_details.get("managementAgent")
            if managed:
                details_parts.append(f"Managed By: {managed}")

            # Enrollment status
            enrollment = device_details.get("enrollmentType")
            if enrollment:
                details_parts.append(f"Enrollment: {enrollment}")

            # Device model and manufacturer
            model = device_details.get("model")
            if model:
                details_parts.append(f"Model: {model}")

            manufacturer = device_details.get("manufacturer")
            if manufacturer:
                details_parts.append(f"Manufacturer: {manufacturer}")

            # Serial number
            serial = device_details.get("serialNumber")
            if serial:
                details_parts.append(f"Serial: {serial}")

            # Last sync time (indicates if device is active)
            last_sync = device_details.get("lastSyncDateTime")
            if last_sync:
                details_parts.append(f"Last Sync: {last_sync}")

            logger.info(
                "Successfully fetched device details from Intune",
                device_name=device_name,
                details_count=len(details_parts),
            )

            return " | ".join(details_parts)

        except Exception as e:
            logger.warning(
                "Error fetching device details from Intune",
                device_name=device_name,
                error=str(e),
            )
            return ""

    def _generate_stubbed_solutions(self, query: str, incident) -> List[str]:
        """
        Generate stubbed/template-based solution points for field technicians.
        Used when real AI is disabled or as fallback when AI fails.
        Mimics ServiceNow KB format with practical troubleshooting steps.

        Args:
            query (str): Search query (incident description)
            incident: IncidentDTO object with category, device details

        Returns:
            List[str]: List of 6-8 template-based solution steps
        """
        points = []
        query_lower = query.lower()
        category = (incident.category or "").lower() if incident else ""

        # Extract dynamic device context from incident - no hardcoding
        device_context = ""
        if incident:
            device_name = incident.deviceName if hasattr(incident, "deviceName") else None
            if device_name:
                device_context = f" [{device_name}]"

        if any(
            kw in query_lower or kw in category
            for kw in [
                "error",
                "failed",
                "crash",
                "broken",
                "exception",
                "install",
                "update",
                "software",
                "patch",
            ]
        ):
            points = [
                f"Run installer as Administrator — Right-click installer.exe → 'Run as administrator'{device_context}",
                "Clear Temp folders — Delete %TEMP% and %TMP% content, then retry installation",
                "Temporarily disable antivirus/security software (if allowed by policy) — Re-enable after installation completes",
                "Verify prerequisites — Ensure required .NET Framework and Visual C++ Redistributables installed per vendor documentation → reboot if needed",
                "Check disk space — Ensure sufficient free disk space on installation target drive (check vendor minimum requirements)",
                "Re-download installer from official vendor portal or trusted network share — Verify file hash/checksum if provided by vendor",
                "Try compatibility mode (if OS version mismatch) — Right-click installer → Properties → Compatibility → try alternate Windows version",
                "Review installer logs — Check installer log file in installation directory or %LocalAppData%\\Temp for specific error codes and details",
            ]

        elif any(
            kw in query_lower or kw in category
            for kw in [
                "network",
                "connection",
                "internet",
                "download",
                "timeout",
                "connectivity",
                "dns",
            ]
        ):
            points = [
                f"Verify network connection — Check cable connection, Wi-Fi signal, or VPN status{device_context}",
                "Test connectivity — Run: ping to external host and ping to gateway in Command Prompt",
                "Check DNS configuration — Run: ipconfig /all to verify DNS servers assigned → flush DNS cache",
                "Try alternate DNS — If primary DNS failing, configure alternate DNS server in Network Settings",
                "Check firewall/antivirus — Verify firewall not blocking network traffic → temporarily disable to test",
                "Verify proxy settings (if corporate) — Check Network Settings for proxy configuration → configure software to use proxy if needed",
                "Re-download from different source — If download timing out, try alternate vendor URL or network share",
                "Document connectivity results — Record ping success/failure, DNS resolution status, and any firewall blocks encountered",
            ]

        elif any(
            kw in query_lower or kw in category
            for kw in [
                "performance",
                "slow",
                "freeze",
                "hang",
                "lag",
                "timeout",
                "resource",
                "memory",
            ]
        ):
            points = [
                f"Check system resources — Open Task Manager (Ctrl+Shift+Esc) → monitor CPU, RAM, and disk I/O usage{device_context}",
                "Close unnecessary programs — End non-essential processes in Task Manager to free RAM/CPU",
                "Clear temporary files — Run Disk Cleanup (cleanmgr.exe) → delete Temp, Cache, Recycle Bin files",
                "Disable visual effects — Settings > Advanced System Settings > Performance > Visual Effects > optimize for best performance",
                "Disable background processes — Services.msc → disable non-critical background services and startup programs",
                "Check for malware — Run security scan (Windows Defender or equivalent antimalware) to rule out infections",
                "Optimize storage — Check disk for fragmentation and optimize if needed (especially important for traditional drives)",
                "Monitor system performance — Run after changes and document resource usage (CPU %, RAM %, Disk %) for analysis",
            ]

        elif any(
            kw in query_lower or kw in category
            for kw in [
                "password",
                "authentication",
                "login",
                "access",
                "permission",
                "denied",
                "credential",
            ]
        ):
            points = [
                f"Verify credentials are correct — Check username and password for typos, verify Caps Lock and keyboard layout{device_context}",
                "Confirm account is active — Verify account is not disabled in directory services or system settings",
                "Clear cached credentials — Credential Manager > remove stored credentials → re-enter fresh credentials",
                "Check account lockout status — Verify account is not locked after multiple failed login attempts → request unlock if needed",
                "Try alternate authentication method — Use alternative authentication if available (security key, alternative credential method)",
                "Verify file/share permissions — Verify user has necessary NTFS permissions for target resource (right-click > Properties > Security)",
                "Check MFA status — If multi-factor authentication enabled, verify authentication method is accessible and not failing",
                "Document authentication error — Note exact error message, error code, and when error occurs for troubleshooting",
            ]

        elif any(
            kw in query_lower or kw in category
            for kw in ["printer", "print", "printing", "document", "output"]
        ):
            points = [
                f"Verify printer is powered on and online — Check indicator lights, status display, connection cable{device_context}",
                "Clear print queue — Control Panel > Devices and Printers > right-click printer > 'See what's printing' > Cancel all documents",
                "Restart Print Spooler service — Services.msc > Print Spooler > right-click > Restart",
                "Delete stuck print jobs manually — Access print spooler folder and delete stuck job files (requires admin privileges)",
                "Reinstall printer driver — Uninstall current driver → download latest from printer manufacturer website → restart system",
                "Set printer as default — Right-click printer in Devices and Printers → select 'Set as default printer'",
                "Verify connectivity (if network printer) — Test connectivity to printer → verify firewall not blocking printer communication ports",
                "Test print functionality — Send test page to verify printer accepting and processing jobs correctly",
            ]

        elif any(
            kw in query_lower or kw in category
            for kw in ["email", "outlook", "gmail", "mail", "exchange", "calendar"]
        ):
            points = [
                f"Verify credentials and mail server settings — Check email address, password, server configuration per vendor documentation{device_context}",
                "Test credentials in webmail first — Access mail provider web portal directly to verify credentials and account access work",
                "Clear email client cache — Clear client-side cache and temporary files → restart email application",
                "Check firewall/antivirus blocking — Verify firewall allows email client → check antivirus not blocking email communication ports",
                "Verify mailbox usage — Check if mailbox has reached quota/capacity limit → archive or delete old emails if needed",
                "Repair mailbox database if corrupted — Use mail client repair tools to verify/repair local mailbox database files",
                "Check multi-factor authentication — If MFA/2FA enabled, verify app-specific credentials or authentication method configured correctly",
                "Test email functionality — Send/receive test message to verify email client connection and functionality working correctly",
            ]

        if not points:
            points = [
                f"Document issue details — Note error code/message, affected application, reproduction steps, and system information{device_context}",
                "Check system logs — Review Event Viewer or system logs for error messages at time of incident",
                "Verify system is updated — Run OS updates, update all software, update device drivers",
                "Try system restart — Often resolves temporary issues; restart affected service or application if applicable",
                "Run system diagnostic tools — Use system repair tools (SFC scan, DISM, chkdsk) to verify system integrity",
                "Test in Safe Mode — Safe Mode isolates driver/software conflicts → use to identify problematic components",
                "Collect diagnostic data — Gather system information, logs, and error screenshots for analysis",
                "Review vendor documentation — Check vendor KB or support articles for known issues matching error code",
            ]

        return points[:8]  # Return up to 8 comprehensive points

    # Sorting and parsing helpers moved to `app.utils.incident_utils.IncidentUtils` for reuse
