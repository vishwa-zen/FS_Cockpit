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
from app.cache.memory_cache import get_cache

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
        
    
    async def fetch_incidents_by_technician(self, technician_username: str, cmdb_ci_name: str | None = None) -> List[IncidentDTO]:
        """
        Retrieve incidents assigned to a specific technician.
        Cached for 5 minutes since incident lists change frequently.

        Args:
            technician_username (str): The username of the technician.

        Returns:
            dict: A dictionary containing incident information.
        """
        # Check cache first
        if self.cache:
            device_key = cmdb_ci_name or "all"
            cache_key = f"sn:incidents_by_tech:{technician_username}:{device_key}"
            cached_incidents = self.cache.get(cache_key)
            if cached_incidents is not None:
                logger.debug("Cache hit for incidents by technician", username=technician_username)
                return cached_incidents
        
        logger.debug("Connecting to ServiceNow", instance_url=self.base_url)

        async with ServiceNowClient(self.base_url, self.sn_username, self.sn_password) as client:
            raw = await client.fetch_incidents_by_technician(technician_username, cmdb_ci_name=cmdb_ci_name)

        results = raw.get("result", [])
        dtos: List[IncidentDTO] = [self._map_incident_to_dto(r) for r in results]
        # sort by openedAt (newest first)
        dtos = IncidentUtils.sort_dtos_by_opened_at(dtos)
        
        # Cache the result
        if self.cache:
            self.cache.set(cache_key, dtos, ttl_seconds=self.settings.CACHE_TTL_INCIDENT)
            logger.debug("Cached incidents by technician", username=technician_username, count=len(dtos))
        
        return dtos

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
        if len(cmdb_ci_value) == 32 and all(c in '0123456789abcdef' for c in cmdb_ci_value.lower()):
            async with ServiceNowClient(self.base_url, self.sn_username, self.sn_password) as client:
                computer = await client.fetch_computer_by_sys_id(cmdb_ci_value)
                if computer:
                    device_name = IncidentUtils.extract_str(computer.get("name")) or IncidentUtils.extract_str(computer.get("host_name"))
                    
                    # Cache the result
                    if self.cache and device_name:
                        self.cache.set(cache_key, device_name, ttl_seconds=self.settings.CACHE_TTL_DEVICE)
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
        logger.info("Found device from ServiceNow", device_name=device_name, caller_sys_id=caller_sys_id)
        
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
        Cached for 5 minutes since incident lists change frequently.

        Args:
            caller_sys_id (str): The `sys_id` of the user.

        Returns:
            dict: The raw API response containing active incident records raised by the user.
        """
        # Check cache first
        if self.cache:
            cache_key = f"sn:incidents_by_user:{user_name}"
            cached_incidents = self.cache.get(cache_key)
            if cached_incidents is not None:
                logger.debug("Cache hit for incidents by user", user_name=user_name)
                return cached_incidents
        
        logger.debug("Connecting to ServiceNow", instance_url=self.base_url)

        async with ServiceNowClient(self.base_url, self.sn_username, self.sn_password) as client:
            raw = await client.fetch_incidents_by_user(user_name)

        results = raw.get("result", [])
        dtos: List[IncidentDTO] = [self._map_incident_to_dto(r) for r in results]
        # sort by openedAt (newest first)
        dtos = IncidentUtils.sort_dtos_by_opened_at(dtos)
        
        # Cache the result
        if self.cache:
            self.cache.set(cache_key, dtos, ttl_seconds=self.settings.CACHE_TTL_INCIDENT)
            logger.debug("Cached incidents by user", user_name=user_name, count=len(dtos))
        
        return dtos
    
    async def fetch_incidents_by_device(self, device_name: str) -> List[IncidentDTO]:
        """
        Retrieve incidents related to a specific device.
        Cached for 5 minutes since incident lists change frequently.

        Args:
            device_name (str): The name of the device.

        Returns:
            dict: A dictionary containing incident information.
        """
        # Check cache first
        if self.cache:
            cache_key = f"sn:incidents_by_device:{device_name}"
            cached_incidents = self.cache.get(cache_key)
            if cached_incidents is not None:
                logger.debug("Cache hit for incidents by device", device_name=device_name)
                return cached_incidents
        
        logger.debug("Connecting to ServiceNow", instance_url=self.base_url)

        async with ServiceNowClient(self.base_url, self.sn_username, self.sn_password) as client:
            raw = await client.fetch_incidents_by_device(device_name)

        results = raw.get("result", [])
        dtos: List[IncidentDTO] = [self._map_incident_to_dto(r) for r in results]
        # sort by openedAt (newest first)
        dtos = IncidentUtils.sort_dtos_by_opened_at(dtos)
        
        # Cache the result
        if self.cache:
            self.cache.set(cache_key, dtos, ttl_seconds=self.settings.CACHE_TTL_INCIDENT)
            logger.debug("Cached incidents by device", device_name=device_name, count=len(dtos))
        
        return dtos
        
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
                "sysparm_display_value": "all"
            }
            response = await client.get(endpoint, params=params)

        results = response.get("result", [])
        devices = [self._map_computer_to_dto(rec) for rec in results]
        
        # Cache the result
        if self.cache:
            self.cache.set(cache_key, devices, ttl_seconds=self.settings.CACHE_TTL_DEVICE)
            logger.debug("Cached devices by user", user_sys_id=user_sys_id, count=len(devices))
        
        return devices

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
            cache_ttl = getattr(self.settings, 'CACHE_TTL_KNOWLEDGE', 900)
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
                
                # Cache the result
                if self.cache:
                    cache_ttl = getattr(self.settings, 'CACHE_TTL_KNOWLEDGE', 900)
                    cache_key = f"sn:knowledge:{query}:{limit}:{use_search_api}"
                    self.cache.set(cache_key, filtered_articles, ttl_seconds=cache_ttl)
                    logger.debug("Cached knowledge articles", query=query[:50], count=len(filtered_articles))
                
                return filtered_articles

    async def search_knowledge_articles_for_incident(
        self, 
        incident_number: str,
        limit: int = 5
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
                logger.debug("Cache hit for knowledge articles for incident", incident_number=incident_number)
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
            cache_ttl = getattr(self.settings, 'CACHE_TTL_KNOWLEDGE', 900)
            cache_key = f"sn:knowledge_incident:{incident_number}:{limit}"
            self.cache.set(cache_key, articles, ttl_seconds=cache_ttl)
            logger.debug("Cached knowledge articles for incident", incident_number=incident_number, count=len(articles))
        
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
        logger.debug("Fetching KB article content", article_sys_id=article_sys_id, article_number=article_number)
        
        try:
            async with ServiceNowClient(self.base_url, self.sn_username, self.sn_password) as client:
                endpoint = "/api/sn_km_api/knowledge/articles"
                
                # Try fetching with sys_id first
                if article_sys_id:
                    params = {
                        "filter": f"sys_id={article_sys_id}",
                        "fields": "text,body,content,short_description,number"
                    }
                else:
                    params = {
                        "filter": f"number={article_number}",
                        "fields": "text,body,content,short_description,number"
                    }
                
                response = await client.get(endpoint, params=params)
                
                result = response.get("result", {})
                articles_data = result.get("articles", []) if isinstance(result, dict) else []
                
                if articles_data and len(articles_data) > 0:
                    article = articles_data[0]
                    # Try different field names for content
                    content = article.get("text") or article.get("body") or article.get("content") or article.get("short_description") or ""
                    if content:
                        logger.debug("Successfully fetched KB article content", article_sys_id=article_sys_id, content_length=len(str(content)))
                        return str(content)
                
                logger.debug("No content found for KB article", article_sys_id=article_sys_id)
                return ""
        except (KeyError, ValueError, TypeError) as e:
            logger.warning("Error fetching KB article content", article_sys_id=article_sys_id, error=str(e))
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
        content = re.sub(r'<[^>]+>', '', content)
        
        points = []
        
        numbered_pattern = r'^\\s*(?:\\d+\\.|Step\\s+\\d+:|•|\\-|\\*|→)\\s*(.+?)(?=\\n|$)'
        numbered_matches = re.findall(numbered_pattern, content, re.MULTILINE | re.IGNORECASE)
        if numbered_matches:
            points.extend([m.strip() for m in numbered_matches if m.strip()])
        
        if len(points) >= min_points:
            return points[:min_points]
        
        sentences = re.split(r'[.!?]\\s+', content)
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
        logger.info("Getting solution summary for incident", incident_number=incident_number, limit=limit)
        
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
                        extracted_points = self._extract_summary_points_from_content(content, min_points=5)
                        if extracted_points:
                            summary_points.extend(extracted_points)
                            articles_with_content += 1
                            logger.debug("Extracted points from article", article_number=article.number, points_count=len(extracted_points))
                    else:
                        if article.title and article.title not in summary_points:
                            summary_points.append(article.title)
                        if article.shortDescription and article.shortDescription not in summary_points:
                            summary_points.append(article.shortDescription)
                
                if len(summary_points) >= 5:
                    logger.info("Solution summary from KB articles", incident_number=incident_number, points_count=len(summary_points))
                    result = {
                        "incident_number": incident_number,
                        "summary_points": summary_points[:10],
                        "source": "kb_articles",
                        "kb_articles_count": len(articles),
                        "total_kb_articles_used": articles_with_content,
                        "confidence": "high",
                        "message": f"Solution summary extracted from {articles_with_content} relevant KB articles"
                    }
                    
                    # Cache the result
                    if self.cache:
                        cache_ttl = getattr(self.settings, 'CACHE_TTL_KNOWLEDGE', 900)
                        cache_key = f"sn:solution_summary:{incident_number}:{limit}"
                        self.cache.set(cache_key, result, ttl_seconds=cache_ttl)
                        logger.debug("Cached solution summary from KB articles", incident_number=incident_number)
                    
                    return result
        except (KeyError, ValueError, TypeError) as e:
            logger.warning("Error processing KB articles, using AI fallback", incident_number=incident_number, error=str(e))
        
        # Fallback: Generate AI-based summary points
        logger.info("Using AI-generated fallback for solution summary", incident_number=incident_number)
        
        try:
            incident = await self.fetch_incident_details(incident_number)
            if not incident:
                logger.warning("Incident not found for AI fallback", incident_number=incident_number)
                return {
                    "incident_number": incident_number,
                    "summary_points": [],
                    "source": "none",
                    "kb_articles_count": 0,
                    "total_kb_articles_used": 0,
                    "confidence": "none",
                    "message": f"Incident {incident_number} not found"
                }
            
            search_query = incident.description or incident.shortDescription or ""
            if not search_query:
                logger.warning("Incident has no description for AI summary", incident_number=incident_number)
                search_query = f"{incident_number} {incident.category or ''}"
            
            summary_points = self._generate_ai_solution_points(search_query, incident)
            
            logger.info("Solution summary from AI generation", incident_number=incident_number, points_count=len(summary_points))
            
            result = {
                "incident_number": incident_number,
                "summary_points": summary_points,
                "source": "ai_generated",
                "kb_articles_count": 0,
                "total_kb_articles_used": 0,
                "confidence": "medium",
                "message": f"Solution points generated using AI analysis of: {search_query[:100]}..."
            }
            
            # Cache the AI-generated result too
            if self.cache:
                cache_ttl = getattr(self.settings, 'CACHE_TTL_KNOWLEDGE', 900)
                cache_key = f"sn:solution_summary:{incident_number}:{limit}"
                self.cache.set(cache_key, result, ttl_seconds=cache_ttl)
                logger.debug("Cached AI-generated solution summary", incident_number=incident_number)
            
            return result
        except (KeyError, ValueError, TypeError) as e:
            logger.error("Error generating AI solution points", incident_number=incident_number, error=str(e))
            return {
                "incident_number": incident_number,
                "summary_points": [],
                "source": "error",
                "kb_articles_count": 0,
                "total_kb_articles_used": 0,
                "confidence": "none",
                "message": f"Unable to generate solution summary for incident {incident_number}"
            }

    def _generate_ai_solution_points(self, query: str, incident) -> List[str]:
        """
        Generate intelligent AI-powered solution points based on incident details.
        Analyzes keywords and provides 5-6 specific, actionable steps.

        Args:
            query (str): Search query (incident description)
            incident: IncidentDTO object with category and other details

        Returns:
            List[str]: List of 5-6 suggested solution steps
        """
        points = []
        query_lower = query.lower()
        category = (incident.category or "").lower() if incident else ""
        
        if any(kw in query_lower or kw in category for kw in ["error", "failed", "crash", "broken", "exception"]):
            points = [
                "Review application error logs and event viewer for specific error codes and stack traces",
                "Restart the affected application and verify the issue persists",
                "Clear application cache, temporary files, and browser cache related to the service",
                "Check if there are any pending software updates or patches available",
                "Verify system resources (CPU, memory, disk) are not at critical levels",
                "Check application compatibility with current OS version and installed drivers"
            ]
        
        elif any(kw in query_lower or kw in category for kw in ["network", "connection", "internet", "wifi", "connectivity", "dns"]):
            points = [
                "Verify network connectivity: ping gateway and DNS servers to ensure connectivity",
                "Check and reconfigure DNS settings, try alternate DNS servers (e.g., 8.8.8.8)",
                "Restart network adapters and modem/router to refresh connection",
                "Review firewall rules and proxy settings that may be blocking traffic",
                "Check network adapter drivers are up to date and properly configured",
                "Test connectivity using different network interfaces or alternate networks"
            ]
        
        elif any(kw in query_lower or kw in category for kw in ["printer", "print", "printing", "document"]):
            points = [
                "Verify the printer is powered on, connected to network, and showing as ready",
                "Clear print queue and restart print spooler service on the computer",
                "Reinstall or update printer drivers from manufacturer's website",
                "Check printer permissions and sharing settings in network configuration",
                "Test printing from different applications and document formats",
                "Review printer error logs and clear any stuck print jobs from the queue"
            ]
        
        elif any(kw in query_lower or kw in category for kw in ["password", "authentication", "login", "access", "permission", "denied"]):
            points = [
                "Verify credentials are correct and account is not locked or expired",
                "Check if user account is enabled and has not been disabled",
                "Reset password through official IT channels and verify password policy compliance",
                "Verify user is member of required security groups and has necessary permissions",
                "Check Multi-Factor Authentication (MFA) settings and alternative authentication methods",
                "Review account lockout policies and recent failed login attempts"
            ]
        
        elif any(kw in query_lower or kw in category for kw in ["performance", "slow", "freeze", "hang", "lag", "timeout"]):
            points = [
                "Monitor CPU, memory, and disk usage to identify resource bottlenecks",
                "Close unnecessary applications and browser tabs consuming system resources",
                "Run disk cleanup utility and defragmentation to improve disk performance",
                "Check Task Manager for processes consuming excessive resources and investigate",
                "Scan for malware and potentially unwanted programs using antivirus software",
                "Check for outdated drivers and system updates affecting performance"
            ]
        
        elif any(kw in query_lower or kw in category for kw in ["software", "installation", "install", "update", "upgrade", "license"]):
            points = [
                "Verify software license is valid, activated, and not expired",
                "Check system meets minimum requirements for software installation",
                "Run installer with administrative privileges and disable antivirus temporarily if needed",
                "Clear temporary files and previous installation remnants before reinstalling",
                "Check software vendor's release notes for known issues and workarounds",
                "Verify installation directories have proper read/write permissions"
            ]
        
        elif any(kw in query_lower or kw in category for kw in ["email", "outlook", "gmail", "mail", "exchange"]):
            points = [
                "Verify email account credentials and check if mailbox is not full",
                "Clear email cache and reconfigure email client connections",
                "Check email server connectivity and IMAP/SMTP settings are correct",
                "Verify firewall and antivirus are not blocking email client connections",
                "Check email account security settings and app-specific password requirements",
                "Test email synchronization and manually force a sync attempt"
            ]
        
        if not points:
            points = [
                "Gather complete error message, logs, and steps to reproduce the issue",
                "Perform basic troubleshooting: restart system, clear cache, log out and back in",
                "Check for software updates, patches, and driver updates for affected components",
                "Review system event logs and application logs for related errors or warnings",
                "Test in Safe Mode or with minimal applications to isolate software conflicts",
                "Document findings and prepare details for escalation if issue persists"
            ]
        
        if len(points) < 5:
            points.append("Consult vendor documentation and support resources for the affected software")
        if len(points) < 6:
            points.append(f"Search for solutions specific to: {query[:40]}")
        
        return points[:6]

    # Sorting and parsing helpers moved to `app.utils.incident_utils.IncidentUtils` for reuse
        