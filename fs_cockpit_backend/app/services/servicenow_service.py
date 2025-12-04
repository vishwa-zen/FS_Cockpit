"""
    ServiceNow Service Module
    This module provides functionalities to interact with the ServiceNow platform.
"""
from typing import List, Optional
import structlog
from app.utils.incident_utils import IncidentUtils
from app.clients.servicenow_client import ServiceNowClient
from app.config.settings import get_settings
from app.schemas.incident import IncidentDTO
from app.schemas.computer import ComputerDTO
from app.schemas.knowledge import KnowledgeArticleDTO

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

        Args:
            username (str): The user_name (login) of the ServiceNow user to look up.

        Returns:
            str: The ServiceNow `sys_id` for the user, or an empty string if not found.
        """
        logger.debug("Connecting to ServiceNow", base_url=self.base_url, sn_username=self.sn_username)

        async with ServiceNowClient(self.base_url, self.sn_username, self.sn_password) as client:
            return await client.fetch_user_sys_id_by_username(username)
        
    
    async def fetch_incidents_by_technician(self, technician_username: str, cmdb_ci_name: str | None = None) -> List[IncidentDTO]:
        """
        Retrieve incidents assigned to a specific technician.

        Args:
            technician_username (str): The username of the technician.

        Returns:
            dict: A dictionary containing incident information.
        """
        logger.debug("Connecting to ServiceNow", base_url=self.base_url, sn_username=self.sn_username)

        async with ServiceNowClient(self.base_url, self.sn_username, self.sn_password) as client:
            raw = await client.fetch_incidents_by_technician(technician_username, cmdb_ci_name=cmdb_ci_name)

        results = raw.get("result", [])
        dtos: List[IncidentDTO] = [self._map_incident_to_dto(r) for r in results]
        # sort by openedAt (newest first)
        dtos = IncidentUtils.sort_dtos_by_opened_at(dtos)
        return dtos

    # Extract string fields using the shared utility

    async def resolve_device_name(self, cmdb_ci_value: str) -> str | None:
        """
        Resolve device name from cmdb_ci value (could be sys_id or name).
        
        Args:
            cmdb_ci_value: Either a sys_id or device name
            
        Returns:
            Device name or None
        """
        if not cmdb_ci_value:
            return None
            
        # If it looks like a sys_id (32 hex chars), fetch the computer name
        if len(cmdb_ci_value) == 32 and all(c in '0123456789abcdef' for c in cmdb_ci_value.lower()):
            async with ServiceNowClient(self.base_url, self.sn_username, self.sn_password) as client:
                computer = await client.fetch_computer_by_sys_id(cmdb_ci_value)
                if computer:
                    return IncidentUtils.extract_str(computer.get("name")) or IncidentUtils.extract_str(computer.get("host_name"))
            return None
        
        # Otherwise, assume it's already a device name
        return cmdb_ci_value
    
    async def get_device_name_from_caller(self, caller_sys_id: str) -> str | None:
        """
        Get device name from caller by fetching user's devices from ServiceNow.
        
        Args:
            caller_sys_id: The sys_id of the caller from incident
            
        Returns:
            Device name or None
        """
        if not caller_sys_id:
            return None
        
        logger.info("Fetching devices from ServiceNow for caller", caller_sys_id=caller_sys_id)
        
        # Get devices assigned to the user from ServiceNow
        devices = await self.fetch_devices_by_user(caller_sys_id)
        
        if not devices:
            logger.warning("No devices found for caller", caller_sys_id=caller_sys_id)
            return None
        
        # Return the first device's name
        first_device = devices[0]
        device_name = first_device.name
        logger.info("Found device from ServiceNow", device_name=device_name, caller_sys_id=caller_sys_id)
        
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
        device_name = IncidentUtils.extract_str(rec.get("cmdb_ci.name")) or IncidentUtils.extract_str(rec.get("cmdb_ci"))
        
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
    
    async def fetch_incidents_by_user(self, user_name: str) -> List[IncidentDTO]:
        """
        Retrieves up to 50 active incidents raised by the specified user.

        Args:
            caller_sys_id (str): The `sys_id` of the user.

        Returns:
            dict: The raw API response containing active incident records raised by the user.
        """
        logger.debug("Connecting to ServiceNow", base_url=self.base_url, sn_username=self.sn_username)

        async with ServiceNowClient(self.base_url, self.sn_username, self.sn_password) as client:
            raw = await client.fetch_incidents_by_user(user_name)

        results = raw.get("result", [])
        dtos: List[IncidentDTO] = [self._map_incident_to_dto(r) for r in results]
        # sort by openedAt (newest first)
        dtos = IncidentUtils.sort_dtos_by_opened_at(dtos)
        return dtos
    
    async def fetch_incidents_by_device(self, device_name: str) -> List[IncidentDTO]:
        """
        Retrieve incidents related to a specific device.

        Args:
            device_name (str): The name of the device.

        Returns:
            dict: A dictionary containing incident information.
        """
        logger.debug("Connecting to ServiceNow", base_url=self.base_url, sn_username=self.sn_username)

        async with ServiceNowClient(self.base_url, self.sn_username, self.sn_password) as client:
            raw = await client.fetch_incidents_by_device(device_name)

        results = raw.get("result", [])
        dtos: List[IncidentDTO] = [self._map_incident_to_dto(r) for r in results]
        # sort by openedAt (newest first)
        dtos = IncidentUtils.sort_dtos_by_opened_at(dtos)
        return dtos
        
    async def fetch_incident_details(self, incident_number: str) -> Optional[IncidentDTO]:
        """
        Retrieve details of a specific incident.

        Args:
            incident_number (str): The number of the incident.

        Returns:
            Optional[IncidentDTO]: The incident details as an IncidentDTO, or None if not found.
        """
        logger.debug("Connecting to ServiceNow", base_url=self.base_url, sn_username=self.sn_username)

        async with ServiceNowClient(self.base_url, self.sn_username, self.sn_password) as client:
            raw = await client.fetch_incident_details(incident_number)

        if not raw:
            return None
        # Client returns the incident dict directly (not wrapped in 'result')
        return self._map_incident_to_dto(raw)

    def _map_computer_to_dto(self, rec: dict) -> ComputerDTO:
        """Map a ServiceNow computer record to ComputerDTO."""
        # Extract assigned_to reference field (both value and display_value)
        assigned_to_id, assigned_to_name = IncidentUtils.extract_reference_field(rec.get("assigned_to"))
        
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

        Args:
            user_sys_id (str): The sys_id of the user.

        Returns:
            List[ComputerDTO]: List of computers assigned to the user.
        """
        logger.debug("Fetching devices for user", user_sys_id=user_sys_id)

        # Build query parameters
        query = f"assigned_to={user_sys_id}^install_status=1"
        fields = "name,host_name,sys_id,serial_number,assigned_to"
        
        async with ServiceNowClient(self.base_url, self.sn_username, self.sn_password) as client:
            endpoint = "/api/now/table/cmdb_ci_computer"
            params = {
                "sysparm_query": query,
                "sysparm_fields": fields,
                "sysparm_display_value": "all"
            }
            response = await client.get(endpoint, params=params)

        results = response.get("result", [])
        return [self._map_computer_to_dto(rec) for rec in results]

    def _map_knowledge_article_to_dto(self, rec: dict, score: Optional[float] = None) -> KnowledgeArticleDTO:
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
                score=rec.get("score") if score is None else score,  # score is at top level in sn_km_api
                workflow=fields.get("workflow_state", {}).get("value", ""),
                author=fields.get("author", {}).get("display_value", ""),
                publishedDate=fields.get("published", {}).get("value", "")
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
        use_search_api: bool = False  # Default to Table API (more compatible)
    ) -> List[KnowledgeArticleDTO]:
        """
        Search for knowledge articles matching the query.

        Args:
            query (str): Search text (e.g., incident short description)
            limit (int): Maximum number of articles to return
            use_search_api (bool): If True, uses Search API (relevance ranking). 
                                   If False, uses simple Table API query.

        Returns:
            List[KnowledgeArticleDTO]: List of matching knowledge articles, 
                                       sorted by relevance or view count.
        """
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
                    "facets": {
                        "workflow_state": ["published"]
                    }
                }
                response = await client.post(endpoint, json=payload)
                
                # Search API returns results with scores
                results = response.get("result", {}).get("articles", [])
                
                # Filter by score threshold and map to DTOs
                filtered_results = [
                    self._map_knowledge_article_to_dto(
                        article.get("article", {}), 
                        score=article.get("score")
                    ) 
                    for article in results
                    if article.get("score", 0) >= 50
                ]
                
                logger.debug("KB articles filtered by score", 
                            total=len(results), 
                            filtered=len(filtered_results),
                            threshold=50)
                
                return filtered_results
            else:
                # Use standard Knowledge Management API (sn_km_api)
                # This is widely available and purpose-built for KB articles
                endpoint = "/api/sn_km_api/knowledge/articles"
                params = {
                    "query": query,
                    "filter": "workflow_state=published^active=true",
                    "fields": "number,short_description,sys_id,kb_knowledge_base,sys_view_count,workflow_state,author,published",
                    "limit": limit
                }
                response = await client.get(endpoint, params=params)
                
                # sn_km_api returns: {"result": {"meta": {...}, "articles": [...]}}
                result = response.get("result", {})
                articles_data = result.get("articles", []) if isinstance(result, dict) else []
                
                logger.debug("KB API articles found", count=len(articles_data))
                
                # Log first article structure to debug
                if articles_data:
                    first_article = articles_data[0]
                    logger.debug("First article structure", 
                                article_keys=list(first_article.keys()) if isinstance(first_article, dict) else "not_dict",
                                article_sample=str(first_article)[:200])
                
                # Filter out None values, validate dict type, and filter by score threshold
                filtered_articles = [
                    self._map_knowledge_article_to_dto(article) 
                    for article in articles_data 
                    if article is not None 
                    and isinstance(article, dict)
                    and article.get("score", 0) >= 50
                ]
                
                logger.debug("KB articles filtered by score", 
                            total=len(articles_data), 
                            filtered=len(filtered_articles),
                            threshold=50)
                
                return filtered_articles

    async def search_knowledge_articles_for_incident(
        self, 
        incident_number: str,
        limit: int = 5
    ) -> List[KnowledgeArticleDTO]:
        """
        Search for knowledge articles relevant to a specific incident.
        Uses incident's short description and category for contextual search.

        Args:
            incident_number (str): The incident number
            limit (int): Maximum number of articles to return

        Returns:
            List[KnowledgeArticleDTO]: Relevant knowledge articles sorted by relevance.
        """
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
        return await self.search_knowledge_articles(query, limit=limit, use_search_api=False)

    # Sorting and parsing helpers moved to `app.utils.incident_utils.IncidentUtils` for reuse
        