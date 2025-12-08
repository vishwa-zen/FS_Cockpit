"""ServiceNow API client."""
import httpx
import structlog

from app.clients.base_cleint import BaseClient
from app.exceptions.custom_exceptions import ExternalServiceError
from app.utils.health_metrics import get_health_tracker

# logging configuration
logger = structlog.get_logger(__name__)

class ServiceNowClient(BaseClient):
    """Client to interact with ServiceNow API."""
    def __init__(
        self,
        base_url: str,
        username: str,
        password: str,
        timeout: int =  30):
        
        self.base_url = base_url
        basic_auth = httpx.BasicAuth(username, password)
        self.timeout = timeout
        
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
        
        self.default_headers = headers

        super().__init__(base_url, timeout, auth=basic_auth, auth_headers=headers)
    
    async def health_check(self) -> dict:
        """
        Perform a lightweight health check by verifying connection to ServiceNow.
        Makes a minimal API call to check authentication and connectivity.
        
        Returns:
            dict: Health status and connection details
        """
        try:
            # Make a lightweight API call to verify connection
            # Using sys_user table with limit=1 is minimal and fast
            endpoint = "/api/now/table/sys_user"
            params = {"sysparm_limit": "1", "sysparm_fields": "sys_id"}
            response = await self.get(endpoint, params=params)
            
            # If we get here, authentication and connection are working
            result = {
                "status": "healthy",
                "service": "ServiceNow",
                "instance_url": self.base_url,
                "authenticated": True,
                "response_received": bool(response)
            }
            
            # Track health metrics
            tracker = get_health_tracker()
            tracker.record_health_check("ServiceNow", "healthy")
            
            return result
        except httpx.HTTPError as e:
            logger.error("ServiceNow health check failed", error=str(e))
            resp = getattr(e, "response", None)
            status = getattr(resp, "status_code", None) if resp is not None else None
            
            # Track health metrics
            tracker = get_health_tracker()
            tracker.record_health_check("ServiceNow", "unhealthy", error=str(e))
            
            return {
                "status": "unhealthy",
                "service": "ServiceNow",
                "instance_url": self.base_url,
                "authenticated": False,
                "error": str(e),
                "status_code": status
            }
        except Exception as e:
            logger.error("ServiceNow health check failed with unexpected error", error=str(e))
            
            # Track health metrics
            tracker = get_health_tracker()
            tracker.record_health_check("ServiceNow", "unhealthy", error=str(e))
            
            return {
                "status": "unhealthy",
                "service": "ServiceNow",
                "instance_url": self.base_url,
                "authenticated": False,
                "error": str(e)
            }
        
        
    async def fetch_user_sys_id_by_username(self, username: str) -> str:
        """Fetches the ServiceNow `sys_id` for a user given their username."""
        endpoint = "/api/now/table/sys_user"
        params = {"user_name": username}
        logger.debug("Fetching user sys_id from ServiceNow", username=username)
        try:
            response = await self.get(endpoint, params=params)
        except httpx.HTTPError as e:
            # translate HTTP errors into domain exception for middleware
            status = None
            resp = getattr(e, "response", None)
            if resp is not None:
                try:
                    status = resp.status_code
                except (AttributeError, TypeError) as exc:
                    status = None
                    logger.warning("servicenow_client.status_code_failed", error=str(exc))
            raise ExternalServiceError(service="ServiceNow", status_code=status or 502, message=str(e)) from e

        results = response.get("result", [])
        if results:
            logger.debug("User found", username=username, sys_id=results[0].get("sys_id", ""))
            return results[0].get("sys_id", "")
        return ""
    
    async def fetch_user_by_sys_id(self, user_sys_id: str) -> dict | None:
        """Fetch user details by sys_id.
        
        Args:
            user_sys_id (str): The sys_id of the user
            
        Returns:
            dict: User details including email, name, etc. or None if not found
        """
        endpoint = f"/api/now/table/sys_user/{user_sys_id}"
        params = {
            "sysparm_fields": "sys_id,user_name,email,name,first_name,last_name",
            "sysparm_display_value": "all"
        }
        try:
            response = await self.get(endpoint, params=params)
            return response.get("result")
        except httpx.HTTPError:
            logger.warning("Failed to fetch user by sys_id", user_sys_id=user_sys_id)
            return None
        
    async def fetch_incidents_by_technician(
        self,
        technician_username: str,
        active: bool = True,
        limit: int = 50,
        sysparm_display_value: str = "all",
        sysparm_exclude_reference_link: bool = True,
        sysparm_fields: str = "sys_id,number,short_description,description,category,subcategory,state,priority,impact,active,assigned_to,sys_created_by,caller_id,cmdb_ci,cmdb_ci.name,opened_at,sys_updated_on",
        cmdb_ci_name: str | None = None,
    ) -> dict:
        """
        Retrieve incidents assigned to a specific technician with extended query params.

        Args:
            technician_username (str): The username of the technician.
            active (bool): Filter for active incidents.
            limit (int): Max number of incidents to return.
            sysparm_display_value (str): Display value mode for ServiceNow.
            sysparm_exclude_reference_link (bool): Exclude reference links in response.
            sysparm_fields (str): Comma-separated list of fields to return.
        Returns:
            dict: A dictionary containing incident information.
        """
        # Resolve the technician username to a ServiceNow sys_id first
        tech_sys_id = await self.fetch_user_sys_id_by_username(technician_username)
        if not tech_sys_id:
            logger.debug("Technician not found in ServiceNow", technician_username=technician_username)
            return {"result": []}

        endpoint = "/api/now/table/incident"
        # Build sysparm_query for assigned_to and active
        sysparm_query = f"assigned_to={tech_sys_id}"
        if active:
            sysparm_query += "^active=true"
        # Optionally filter by device name (cmdb_ci.name)
        if cmdb_ci_name:
            # Escape or ensure value safe - we keep basic usage
            sysparm_query += f"^cmdb_ci.name={cmdb_ci_name}"

        params = {
            "sysparm_query": sysparm_query,
            "sysparm_limit": str(limit),
            "sysparm_display_value": sysparm_display_value,
            "sysparm_exclude_reference_link": str(sysparm_exclude_reference_link).lower(),
            "sysparm_fields": sysparm_fields,
        }
        logger.debug(
            "Fetching incidents from ServiceNow",
            technician_username=technician_username,
            tech_sys_id=tech_sys_id,
            params=params,
        )
        try:
            response = await self.get(endpoint, params=params)
        except httpx.HTTPError as e:
            resp = getattr(e, "response", None)
            status = getattr(resp, "status_code", None) if resp is not None else None
            raise ExternalServiceError(service="ServiceNow", status_code=status or 502, message=str(e)) from e
        return response
    
    async def fetch_incidents_by_user(self, user_name: str, _fields: list[str] | None = None, limit: int | None = 50) -> dict:
        """
        Retrieves up to 50 active incidents raised by the specified user.

        Args:
            user_name (str): The user_name (login) of the user.
        Returns:
            dict: The raw API response containing active incident records raised by the user.
        """
        # Resolve the user_name to a ServiceNow sys_id first
        caller_sys_id = await self.fetch_user_sys_id_by_username(user_name)
        if not caller_sys_id:
            logger.debug("User not found in ServiceNow", user_name=user_name)
            return {"result": []}

        endpoint = "/api/now/table/incident"
        params = {
            "caller_id": caller_sys_id,
            "active": "true",
            "sysparm_limit": 50,
            "sysparm_fields": _fields or "sys_id,number,short_description,description,category,subcategory,state,priority,impact,active,assigned_to,sys_created_by,caller_id,cmdb_ci,cmdb_ci.name,opened_at,sys_updated_on",
        }
        # fields param intentionally not sent to ServiceNow to keep API calls generic; mapping/filtering is handled in service layer
        if limit is not None:
            params["sysparm_limit"] = limit
        logger.debug("Fetching incidents from ServiceNow", user_name=user_name, caller_sys_id=caller_sys_id)
        try:
            response = await self.get(endpoint, params=params)
        except httpx.HTTPError as e:
            resp = getattr(e, "response", None)
            status = getattr(resp, "status_code", None) if resp is not None else None
            raise ExternalServiceError(service="ServiceNow", status_code=status or 502, message=str(e)) from e
        return response
    
    async def fetch_incidents_by_device(self, device_name: str, _fields: list[str] | None = None, limit: int | None = None) -> dict:
        """
        Retrieve incidents related to a specific device.

        Args:
            device_name (str): The name of the device.
        Returns:
            dict: A dictionary containing incident information.
        """
        endpoint = "/api/now/table/incident"
        params = {"cmdb_ci.name": device_name, "sysparm_fields": _fields or "sys_id,number,short_description,description,category,subcategory,state,priority,impact,active,assigned_to,sys_created_by,caller_id,cmdb_ci,cmdb_ci.name,opened_at,sys_updated_on"}
        # fields param intentionally not sent to ServiceNow to keep API calls generic; mapping/filtering is handled in service layer
        if limit is not None:
            params["sysparm_limit"] = limit
        logger.debug("Fetching incidents from ServiceNow", device_name=device_name)
        try:
            response = await self.get(endpoint, params=params)
        except httpx.HTTPError as e:
            resp = getattr(e, "response", None)
            status = getattr(resp, "status_code", None) if resp is not None else None
            raise ExternalServiceError(service="ServiceNow", status_code=status or 502, message=str(e)) from e
        return response
    
    async def fetch_computer_by_sys_id(self, sys_id: str) -> dict | None:
        """
        Fetch computer details by sys_id.
        
        Args:
            sys_id (str): The sys_id of the computer (cmdb_ci)
            
        Returns:
            dict: Computer details or None if not found
        """
        endpoint = f"/api/now/table/cmdb_ci_computer/{sys_id}"
        params = {
            "sysparm_fields": "name,host_name,sys_id",
            "sysparm_display_value": "all"
        }
        try:
            response = await self.get(endpoint, params=params)
            return response.get("result")
        except httpx.HTTPError:
            logger.warning("Failed to fetch computer by sys_id", sys_id=sys_id)
            return None
    
    async def fetch_incident_details(self, incident_number: str, _fields: list[str] | None = None) -> dict:
        """
        Retrieve details of a specific incident.

        Args:
            incident_number (str): The number of the incident.
        Returns:
            dict: A dictionary containing incident details.
        """
        endpoint = "/api/now/table/incident"
        params = {
            "sysparm_query": f"number={incident_number}",
            "sysparm_fields": "sys_id,number,short_description,description,category,subcategory,state,priority,impact,active,assigned_to,sys_created_by,caller_id,cmdb_ci,cmdb_ci.name,opened_at,sys_updated_on",
            "sysparm_display_value": "all",
            "sysparm_limit": 1
        }
        logger.debug("Fetching incident details from ServiceNow", incident_number=incident_number)
        try:
            response = await self.get(endpoint, params=params)
        except httpx.HTTPError as e:
            resp = getattr(e, "response", None)
            status = getattr(resp, "status_code", None) if resp is not None else None
            raise ExternalServiceError(service="ServiceNow", status_code=status or 502, message=str(e)) from e
        results = response.get("result", [])
        if results:
            logger.debug("Incident found", incident_number=incident_number)
            return results[0]
        logger.debug("Incident not found", incident_number=incident_number)
        return {}
    
    async def fetch_incident_comments(
        self,
        incident_sys_id: str,
        limit: int = 100,
        offset: int = 0,
        sysparm_display_value: str = "all"
    ) -> dict:
        """
        Retrieve comments/notes for a specific incident.
        
        Args:
            incident_sys_id (str): The sys_id of the incident.
            limit (int): Maximum number of comments to return (default 100).
            offset (int): Pagination offset (default 0).
            sysparm_display_value (str): Display value mode for ServiceNow.
            
        Returns:
            dict: Raw API response containing comments.
        """
        endpoint = "/api/now/table/sys_journal_field"
        params = {
            "sysparm_query": f"element_id={incident_sys_id}^element=comments^ORelement=work_notes",
            "sysparm_limit": str(limit),
            "sysparm_offset": str(offset),
            "sysparm_display_value": sysparm_display_value,
            "sysparm_fields": "sys_id,element_id,value,sys_created_by,sys_created_on,sys_updated_on",
            "sysparm_order_by": "-sys_created_on"
        }
        logger.debug(
            "Fetching incident comments from ServiceNow",
            incident_sys_id=incident_sys_id,
            limit=limit,
            offset=offset
        )
        try:
            response = await self.get(endpoint, params=params)
        except httpx.HTTPError as e:
            resp = getattr(e, "response", None)
            status = getattr(resp, "status_code", None) if resp is not None else None
            raise ExternalServiceError(service="ServiceNow", status_code=status or 502, message=str(e)) from e
        return response
    
    async def fetch_incident_activity_logs(
        self,
        incident_sys_id: str,
        limit: int = 100,
        offset: int = 0,
        sysparm_display_value: str = "all"
    ) -> dict:
        """
        Retrieve activity logs (changes/updates) for a specific incident.
        
        Uses sys_journal_field table which is more reliable than sys_audit_log.
        
        Args:
            incident_sys_id (str): The sys_id of the incident.
            limit (int): Maximum number of activity logs to return (default 100).
            offset (int): Pagination offset (default 0).
            sysparm_display_value (str): Display value mode for ServiceNow.
            
        Returns:
            dict: Raw API response containing activity logs.
        """
        # Use sys_journal_field for state/update tracking (more reliable)
        logger.debug(
            "Fetching incident activity logs from ServiceNow",
            incident_sys_id=incident_sys_id,
            limit=limit,
            offset=offset
        )
        endpoint = "/api/now/table/sys_journal_field"
        params = {
            "sysparm_query": f"element_id={incident_sys_id}^element=state",
            "sysparm_limit": str(limit),
            "sysparm_offset": str(offset),
            "sysparm_display_value": sysparm_display_value,
            "sysparm_fields": "sys_id,value,sys_created_by,sys_created_on",
            "sysparm_order_by": "-sys_created_on"
        }
        try:
            response = await self.get(endpoint, params=params)
            return response
        except httpx.HTTPError as e:
            logger.warning(
                "Could not fetch activity logs",
                incident_sys_id=incident_sys_id,
                error=str(e)
            )
            # Return empty result instead of raising error
            return {"result": [], "warning": "Activity logs not available for this incident"}
