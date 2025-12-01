"""
    ServiceNow Service Module
    This module provides functionalities to interact with the ServiceNow platform.
"""
from typing import List, Optional
import structlog
from app.clients.servicenow_client import ServiceNowClient
from app.config.settings import get_settings
from app.schemas.incident import IncidentDTO

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


    async def fetch_user_sys_id_by_username(self, username: str) -> str:
        """
        Fetches the ServiceNow `sys_id` for a user given their username.

        Args:
            username (str): The user_name (login) of the ServiceNow user to look up.

        Returns:
            str: The ServiceNow `sys_id` for the user, or an empty string if not found.
        """
      
        base_url = self.settings.SERVICENOW_INSTANCE_URL
        sn_username = self.settings.SERVICENOW_USERNAME
        sn_password = self.settings.SERVICENOW_PASSWORD

        logger.debug("Connecting to ServiceNow", base_url=base_url, sn_username=sn_username)

        async with ServiceNowClient(base_url, sn_username, sn_password) as client:
            return await client.fetch_user_sys_id_by_username(username)
        
    
    async def fetch_incidents_by_technician(self, technician_username: str, cmdb_ci_name: str | None = None) -> List[IncidentDTO]:
        """
        Retrieve incidents assigned to a specific technician.

        Args:
            technician_username (str): The username of the technician.

        Returns:
            dict: A dictionary containing incident information.
        """
        
        base_url = self.settings.SERVICENOW_INSTANCE_URL
        sn_username = self.settings.SERVICENOW_USERNAME
        sn_password = self.settings.SERVICENOW_PASSWORD

        logger.debug("Connecting to ServiceNow", base_url=base_url, sn_username=sn_username)

        async with ServiceNowClient(base_url, sn_username, sn_password) as client:
            raw = await client.fetch_incidents_by_technician(technician_username, cmdb_ci_name=cmdb_ci_name)

        results = raw.get("result", [])
        dtos: List[IncidentDTO] = [self._map_incident_to_dto(r) for r in results]
        return dtos

    def _extract_str(self, val):
        if isinstance(val, dict):
            return val.get("display_value") or val.get("value") or ""
        return val if val is not None else ""

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
        device_name = self._extract_str(rec.get("cmdb_ci.name")) or self._extract_str(rec.get("cmdb_ci"))
        return IncidentDTO(
            sysId=self._extract_str(rec.get("sys_id")),
            incidentNumber=self._extract_str(rec.get("number")),
            shortDescription=self._extract_str(rec.get("short_description")),
            priority=self._extract_str(rec.get("priority")),
            impact=impact_val,
            status=status,
            active=rec.get("active") in (True, "true", "True", "1", 1),
            assignedTo=self._extract_str(rec.get("assigned_to")),
            deviceName=device_name,
            createdBy=self._extract_str(rec.get("sys_created_by")),
            callerId=self._extract_str(rec.get("caller_id")),
            openedAt=self._extract_str(rec.get("opened_at")),
            lastUpdatedAt=self._extract_str(rec.get("sys_updated_on")),
        )
    
    async def fetch_incidents_by_user(self, user_name: str) -> List[IncidentDTO]:
        """
        Retrieves up to 50 active incidents raised by the specified user.

        Args:
            caller_sys_id (str): The `sys_id` of the user.

        Returns:
            dict: The raw API response containing active incident records raised by the user.
        """
        base_url = self.settings.SERVICENOW_INSTANCE_URL
        sn_username = self.settings.SERVICENOW_USERNAME
        sn_password = self.settings.SERVICENOW_PASSWORD

        logger.debug("Connecting to ServiceNow", base_url=base_url, sn_username=sn_username)

        async with ServiceNowClient(base_url, sn_username, sn_password) as client:
            raw = await client.fetch_incidents_by_user(user_name)

        results = raw.get("result", [])
        dtos: List[IncidentDTO] = [self._map_incident_to_dto(r) for r in results]
        return dtos
    
    async def fetch_incidents_by_device(self, device_name: str) -> List[IncidentDTO]:
        """
        Retrieve incidents related to a specific device.

        Args:
            device_name (str): The name of the device.

        Returns:
            dict: A dictionary containing incident information.
        """
        base_url = self.settings.SERVICENOW_INSTANCE_URL
        sn_username = self.settings.SERVICENOW_USERNAME
        sn_password = self.settings.SERVICENOW_PASSWORD

        logger.debug("Connecting to ServiceNow", base_url=base_url, sn_username=sn_username)

        async with ServiceNowClient(base_url, sn_username, sn_password) as client:
            raw = await client.fetch_incidents_by_device(device_name)

        results = raw.get("result", [])
        dtos: List[IncidentDTO] = [self._map_incident_to_dto(r) for r in results]
        return dtos
        
    async def fetch_incident_details(self, incident_number: str) -> Optional[IncidentDTO]:
        """
        Retrieve details of a specific incident.

        Args:
            incident_number (str): The number of the incident.

        Returns:
            dict: A dictionary containing incident details.
        """
        base_url = self.settings.SERVICENOW_INSTANCE_URL
        sn_username = self.settings.SERVICENOW_USERNAME
        sn_password = self.settings.SERVICENOW_PASSWORD

        logger.debug("Connecting to ServiceNow", base_url=base_url, sn_username=sn_username)

        async with ServiceNowClient(base_url, sn_username, sn_password) as client:
            raw = await client.fetch_incident_details(incident_number)

        if not raw:
            return None
        # ServiceNow returns a 'result' list; fetch first item
        results = raw.get("result", [])
        if results:
            return self._map_incident_to_dto(results[0])
        return None
        