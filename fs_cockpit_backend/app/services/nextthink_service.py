"""
NextThink Service Module
This module provides functionalities to interact with NextThink API.
"""

import re
from typing import Any, Dict, List, Optional

import structlog

from app.cache.memory_cache import get_cache
from app.clients.nextthink_client import NextThinkClient
from app.config.settings import get_settings
from app.db import (
    AuditLogWriter,
    RemoteActionWriter,
    SessionLocal,
)
from app.schemas.remote_action import RemoteActionDTO, RemoteActionExecuteRequest

# logging configuration
logger = structlog.get_logger(__name__)


class NextThinkService:
    """
    NextThink Service Class
    This class encapsulates methods to perform operations on NextThink.
    """

    def __init__(self):
        """Initialize the NextThinkService instance."""
        self.settings = get_settings()
        self.auth_base_url = self.settings.NEXTTHINK_BASE_URL
        self.api_base_url = self.settings.NEXTTHINK_API_URL
        self.username = self.settings.NEXTTHINK_USER_NAME
        self.password = self.settings.NEXTTHINK_PASWORD
        self.grant_type = self.settings.NEXTTHINK_GRANT_TYPE
        self.scope = self.settings.NEXTTHINK_SCOPE
        self.cache = get_cache() if self.settings.CACHE_ENABLED else None

    def _apply_filters(
        self,
        dtos: List[RemoteActionDTO],
        status_filter: Optional[List[str]],
        days: Optional[int],
        limit: Optional[int],
    ) -> List[RemoteActionDTO]:
        """Apply filters to the list of remote action DTOs."""
        from datetime import datetime, timedelta

        filtered = dtos

        # Filter by status
        if status_filter:
            status_lower = [s.lower() for s in status_filter]
            filtered = [
                dto for dto in filtered if dto.status and dto.status.lower() in status_lower
            ]

        # Filter by days (check updatedAt field)
        if days is not None and days > 0:
            cutoff_date = datetime.now() - timedelta(days=days)
            filtered_by_date = []
            for dto in filtered:
                if dto.updatedAt:
                    try:
                        # Parse the date string (format: "2025-11-27 01:15:17")
                        action_date = datetime.strptime(dto.updatedAt, "%Y-%m-%d %H:%M:%S")
                        if action_date >= cutoff_date:
                            filtered_by_date.append(dto)
                    except (ValueError, TypeError):
                        # If date parsing fails, include the action
                        filtered_by_date.append(dto)
            filtered = filtered_by_date

        # Sort by updatedAt (most recent first)
        filtered.sort(
            key=lambda x: (
                datetime.strptime(x.updatedAt, "%Y-%m-%d %H:%M:%S") if x.updatedAt else datetime.min
            ),
            reverse=True,
        )

        # Apply limit
        if limit is not None and limit > 0:
            filtered = filtered[:limit]

        return filtered

    def _map_action_to_dto(self, action: dict) -> RemoteActionDTO:
        """Map a raw remote action record from NextThink API to RemoteActionDTO."""
        return RemoteActionDTO(
            actionId=action.get("remote_action.execution.request_id"),
            actionName=action.get("remote_action.name"),
            actionType=action.get("remote_action.source"),
            status=action.get("remote_action.execution.status"),
            createdAt=action.get("remote_action.execution.request_time"),
            updatedAt=action.get("remote_action.execution.time"),
            deviceId=None,  # Not directly available in response
            deviceName=action.get("device.name"),
            executedBy=action.get("remote_action.execution.trigger_method"),
            result={
                "inputs": action.get("remote_action.execution.inputs"),
                "outputs": action.get("remote_action.execution.outputs"),
                "purpose": action.get("remote_action.execution.purpose"),
                "status_details": action.get("remote_action.execution.status_details"),
                "nql_id": action.get("remote_action.nql_id"),
                "external_reference": action.get("remote_action.execution.external_reference"),
                "external_source": action.get("remote_action.execution.external_source"),
                "internal_source": action.get("remote_action.execution.internal_source"),
            },
        )

    async def health_check(self) -> dict:
        """
        Perform a health check by attempting to authenticate with NextThink.

        Returns:
            dict: Health status and connection details
        """
        logger.debug(
            "Performing NextThink health check",
            auth_url=self.auth_base_url,
            api_url=self.api_base_url,
        )

        client = NextThinkClient(
            auth_base_url=self.auth_base_url,
            api_base_url=self.api_base_url,
            username=self.username,
            password=self.password,
            grant_type=self.grant_type,
            scope=self.scope,
        )
        return await client.health_check()

    async def authenticate(self) -> dict:
        """
        Authenticate with NextThink API and return token info.

        Returns:
            dict: Authentication status and details
        """
        logger.debug(
            "Authenticating with NextThink", auth_url=self.auth_base_url, api_url=self.api_base_url
        )

        client = NextThinkClient(
            auth_base_url=self.auth_base_url,
            api_base_url=self.api_base_url,
            username=self.username,
            password=self.password,
            grant_type=self.grant_type,
            scope=self.scope,
        )
        result = await client.authenticate()

        # Add additional service-level details
        if result.get("status") == "authenticated":
            result["grant_type"] = self.grant_type
            result["scope"] = self.scope

        return result

    async def get_remote_actions(
        self,
        device_name: str,
        query_type: str = "detailed",
        status_filter: Optional[List[str]] = None,
        days: Optional[int] = None,
        limit: Optional[int] = None,
    ) -> List[RemoteActionDTO]:
        """
        Fetch remote actions from NextThink with optional filtering.
        Cached for 10 minutes since remote actions don't change frequently.

        Args:
            device_name (str): The device name to query
            query_type (str): "detailed" for all details or "basic" for simple list
            status_filter (List[str], optional): Filter by status (e.g., ["success", "failure"])
            days (int, optional): Filter actions from last N days
            limit (int, optional): Maximum number of actions to return

        Returns:
            List[RemoteActionDTO]: List of remote actions
        """
        # Build cache key including all parameters
        if self.cache:
            status_str = ",".join(sorted(status_filter)) if status_filter else "all"
            cache_key = f"nt:remote_actions:{device_name}:{query_type}:{status_str}:{days}:{limit}"
            cached_actions = self.cache.get(cache_key)
            if cached_actions is not None:
                logger.debug("Cache hit for remote actions", device_name=device_name)
                return cached_actions

        logger.debug("Connecting to NextThink API", api_url=self.api_base_url)

        async with NextThinkClient(
            auth_base_url=self.auth_base_url,
            api_base_url=self.api_base_url,
            username=self.username,
            password=self.password,
            grant_type=self.grant_type,
            scope=self.scope,
        ) as client:
            raw = await client.get_remote_actions(device_name=device_name, query_type=query_type)

        # NextThink NQL returns data in a specific format
        # Expected structure: {"data": [[row1_col1, row1_col2, ...], [row2_col1, row2_col2, ...]], "headers": ["col1", "col2", ...]}
        logger.debug(
            "Raw NextThink response",
            response_keys=raw.keys() if isinstance(raw, dict) else "not_dict",
        )

        actions = []
        if isinstance(raw, dict):
            # Get the data rows and header names
            data_rows = raw.get("data", [])
            headers = raw.get("headers", [])

            logger.debug(
                "NextThink data structure", num_rows=len(data_rows), num_headers=len(headers)
            )

            # Convert each row to a dictionary using header names
            for row in data_rows:
                if isinstance(row, list) and len(row) == len(headers):
                    action_dict = dict(zip(headers, row))
                    actions.append(action_dict)
                else:
                    logger.warning(
                        "Row length mismatch",
                        row_length=len(row) if isinstance(row, list) else "not_list",
                        headers_length=len(headers),
                    )

        dtos: List[RemoteActionDTO] = [self._map_action_to_dto(a) for a in actions]

        # Apply filters
        filtered_dtos = self._apply_filters(dtos, status_filter, days, limit)

        # Cache the filtered result
        if self.cache:
            self.cache.set(
                cache_key, filtered_dtos, ttl_seconds=self.settings.CACHE_TTL_REMOTE_ACTION
            )
            logger.debug("Cached remote actions", device_name=device_name, count=len(filtered_dtos))

        logger.debug(
            "Filtered actions", original_count=len(dtos), filtered_count=len(filtered_dtos)
        )
        return filtered_dtos

    async def get_remote_action_by_id(self, action_id: str) -> Optional[RemoteActionDTO]:
        """
        Fetch a specific remote action by its ID.

        Args:
            action_id (str): The remote action ID

        Returns:
            Optional[RemoteActionDTO]: The remote action details or None if not found
        """
        logger.debug("Connecting to NextThink API", api_url=self.api_base_url)

        async with NextThinkClient(
            auth_base_url=self.auth_base_url,
            api_base_url=self.api_base_url,
            username=self.username,
            password=self.password,
            grant_type=self.grant_type,
            scope=self.scope,
        ) as client:
            raw = await client.get_remote_action_by_id(action_id)

        if not raw:
            return None

        return self._map_action_to_dto(raw)

    async def execute_remote_action(
        self, request: RemoteActionExecuteRequest, technician_username: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Execute a remote action on NextThink.
        Pushes action to database for Agentic AI and audit trail.

        Args:
            request (RemoteActionExecuteRequest): The action execution request
            technician_username (str): Username of technician executing the action

        Returns:
            Dict[str, Any]: Execution response
        """
        logger.debug("Connecting to NextThink API", api_url=self.api_base_url)

        action_data = {
            "actionType": request.actionType,
            "deviceId": request.deviceId,
            "parameters": request.parameters or {},
        }

        async with NextThinkClient(
            auth_base_url=self.auth_base_url,
            api_base_url=self.api_base_url,
            username=self.username,
            password=self.password,
            grant_type=self.grant_type,
            scope=self.scope,
        ) as client:
            result = await client.execute_remote_action(action_data)

        # Push action to database for AI engine
        db = SessionLocal()
        try:
            RemoteActionWriter.push_action(
                db,
                action_id=result.get("id", f"act_{request.deviceId}"),
                action_name=request.actionType or "Unknown",
                status=result.get("status", "pending"),
                device_name=self._extract_device_name_from_text(request.deviceId),
                action_type="system",
                execution_result=str(result.get("result")) if result.get("result") else None,
            )

            # Log audit if technician username provided
            if technician_username:
                AuditLogWriter.log_action(
                    db,
                    technician_username=technician_username,
                    action="execute_remote_action",
                    resource_type="remote_action",
                    resource_id=result.get("id", f"act_{request.deviceId}"),
                    details=f"action={request.actionType}, device={request.deviceId}",
                )

            logger.info("Pushed remote action to DB", action_id=result.get("id"))
        except Exception as e:  # noqa: BLE001
            logger.error("Error pushing action to DB", error=str(e))
        finally:
            db.close()

        return result

    def _extract_device_name_from_text(self, text: str) -> Optional[str]:
        """
        Extract device name from text using common device naming patterns.

        Args:
            text (str): Text to search for device names

        Returns:
            Optional[str]: Extracted device name or None
        """
        if not text:
            return None

        # Common device name patterns: CPC-*, LAPTOP-*, DESKTOP-*, WIN-*, PC-*, etc.
        patterns = [
            r"\b(CPC-[A-Za-z0-9-]+)\b",
            r"\b(LAPTOP-[A-Za-z0-9-]+)\b",
            r"\b(DESKTOP-[A-Za-z0-9-]+)\b",
            r"\b(WIN-[A-Za-z0-9-]+)\b",
            r"\b(PC-[A-Za-z0-9-]+)\b",
            r"\b(WS-[A-Za-z0-9-]+)\b",
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1)

        return None

    def _score_action_by_category(
        self, action: RemoteActionDTO, category: str, description: str
    ) -> float:
        """
        Score a remote action based on incident category and description.
        Higher score = more relevant.

        Args:
            action (RemoteActionDTO): The remote action
            category (str): ServiceNow incident category
            description (str): Incident description

        Returns:
            float: Relevance score (0-100)
        """
        score = 0.0
        action_name = (action.actionName or "").lower()
        action_purpose = (action.result.get("purpose") or "").lower() if action.result else ""
        description_lower = (description or "").lower()
        category_lower = (category or "").lower()

        # Category-based scoring
        if category_lower == "hardware":
            # Hardware issues: prioritize hardware diagnostics, health checks
            if any(
                kw in action_name
                for kw in ["hardware", "health", "diagnostic", "disk", "memory", "cpu"]
            ):
                score += 40
            if "printer" in description_lower and "print" in action_name:
                score += 50

        elif category_lower == "inquiry":
            # Inquiry: analyze description for specific issues
            if "vpn" in description_lower or "network" in description_lower:
                if any(
                    kw in action_name for kw in ["vpn", "network", "connectivity", "ping", "dns"]
                ):
                    score += 50
            if (
                "software" in description_lower
                or "app" in description_lower
                or "application" in description_lower
            ):
                if any(
                    kw in action_name for kw in ["software", "app", "install", "update", "patch"]
                ):
                    score += 50
            if "print" in description_lower:
                if "print" in action_name:
                    score += 50

        elif category_lower == "software":
            # Software issues: prioritize software-related actions
            if any(
                kw in action_name
                for kw in ["software", "application", "app", "install", "update", "patch"]
            ):
                score += 40

        elif category_lower == "network":
            # Network issues: prioritize network diagnostics
            if any(
                kw in action_name
                for kw in ["network", "vpn", "connectivity", "ping", "dns", "proxy"]
            ):
                score += 40

        # Purpose-based scoring
        if action_purpose == "remediation":
            score += 20  # Prefer remediation actions
        elif action_purpose == "data_collection":
            score += 10  # Data collection is useful but less priority

        # Status-based scoring (prefer recent successful actions)
        if action.status:
            if action.status.lower() == "success":
                score += 15
            elif action.status.lower() == "failure":
                score += 5  # Failed actions still relevant to know what was tried

        # Keyword matching in description
        keywords = re.findall(r"\b\w{4,}\b", description_lower)  # Extract words 4+ chars
        for keyword in keywords[:10]:  # Check top 10 keywords
            if keyword in action_name:
                score += 5

        return min(score, 100.0)  # Cap at 100

    async def get_recommendations_for_incident(
        self, incident: Any, limit: int = 10  # IncidentDTO type
    ) -> List[RemoteActionDTO]:
        """
        Get recommended remote actions for a ServiceNow incident based on category and description.

        Args:
            incident: The ServiceNow incident (IncidentDTO)
            limit (int): Maximum number of recommendations to return

        Returns:
            List[RemoteActionDTO]: Recommended remote actions sorted by relevance
        """
        # Extract device name from incident
        device_name = incident.deviceName

        # If no device name, try to extract from description
        if not device_name:
            device_name = self._extract_device_name_from_text(incident.description or "")

        if not device_name:
            device_name = self._extract_device_name_from_text(incident.shortDescription or "")

        if not device_name:
            logger.warning(
                "Cannot determine device name for incident - no remote actions available",
                incident_number=incident.incidentNumber,
                deviceName_raw=incident.deviceName,
                description_sample=(incident.description or "")[:100],
            )
            # Return empty list - endpoint will still show the incident details
            return []

        logger.info(
            "Getting recommendations for incident",
            incident_number=incident.incidentNumber,
            device_name=device_name,
            category=incident.priority,
        )

        # Fetch all remote actions for the device (last 7 days for better performance)
        all_actions = await self.get_remote_actions(
            device_name=device_name,
            query_type="detailed",
            days=self.settings.NEXTTHINK_DEFAULT_DAYS,
        )

        if not all_actions:
            logger.warning("No remote actions found for device", device_name=device_name)
            return []

        # Score each action based on incident context
        category = getattr(incident, "priority", "") or ""  # Using priority as category proxy
        description = f"{incident.shortDescription or ''} {incident.description or ''}"

        scored_actions = []
        seen_action_names = set()  # Track unique action names

        for action in all_actions:
            score = self._score_action_by_category(action, category, description)
            if score > 0:  # Only include actions with positive scores
                action_name = action.actionName or ""

                # Only add if we haven't seen this action name before
                if action_name and action_name not in seen_action_names:
                    scored_actions.append((score, action))
                    seen_action_names.add(action_name)
                elif action_name in seen_action_names:
                    # If duplicate, keep the one with higher score
                    existing_idx = next(
                        (
                            i
                            for i, (s, a) in enumerate(scored_actions)
                            if a.actionName == action_name
                        ),
                        None,
                    )
                    if existing_idx is not None and score > scored_actions[existing_idx][0]:
                        scored_actions[existing_idx] = (score, action)

        # Sort by score (descending) and take top N
        scored_actions.sort(key=lambda x: x[0], reverse=True)
        recommendations = [action for score, action in scored_actions[:limit]]

        logger.info(
            "Generated recommendations",
            incident_number=incident.incidentNumber,
            total_actions=len(all_actions),
            unique_actions=len(scored_actions),
            recommendations=len(recommendations),
        )

        return recommendations
