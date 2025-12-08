"""NextThink API client."""
import httpx
import structlog
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from app.clients.base_cleint import BaseClient
from app.exceptions.custom_exceptions import ExternalServiceError
from app.utils.health_metrics import get_health_tracker

# logging configuration
logger = structlog.get_logger(__name__)


class NextThinkClient(BaseClient):
    """Client to interact with NextThink API."""
    
    def __init__(
        self,
        auth_base_url: str,
        api_base_url: str,
        username: str,
        password: str,
        grant_type: str = "client_credentials",
        scope: str = "service:integration",
        timeout: int = 30
    ):
        self.auth_base_url = auth_base_url
        self.api_base_url = api_base_url
        self.username = username
        self.password = password
        self.grant_type = grant_type
        self.scope = scope
        self.timeout = timeout
        self.access_token: Optional[str] = None
        self.token_expiry: Optional[datetime] = None
        self.client = None
        
        # Get settings for connection pool configuration
        from app.config.settings import get_settings
        self.settings = get_settings()
        
        # Initialize with NextThink API URL for API calls
        super().__init__(api_base_url, timeout)
    
    async def _get_access_token(self) -> str:
        """Obtain OAuth2 access token from NextThink with caching."""
        # Check if we have a valid cached token
        if self.access_token and self.token_expiry and datetime.now() < self.token_expiry:
            logger.debug("Using cached access token", expires_in=(self.token_expiry - datetime.now()).total_seconds())
            return self.access_token
        
        logger.debug("Getting new NextThink access token", auth_base_url=self.auth_base_url)
        # NextThink uses /oauth2/default/v1/token endpoint
        token_url = f"{self.auth_base_url}/oauth2/default/v1/token"
        logger.debug("Token URL", url=token_url)
        
        # Send as form data with proper OAuth2 format
        data = {
            "grant_type": self.grant_type,
            "scope": self.scope
        }
        
        # Use Basic Auth with username and password
        auth = httpx.BasicAuth(username=self.username, password=self.password)
        
        try:
            # Use optimized client for token acquisition
            async with httpx.AsyncClient(
                limits=httpx.Limits(
                    max_connections=self.settings.HTTP_POOL_MAX_CONNECTIONS,
                    max_keepalive_connections=self.settings.HTTP_POOL_MAX_KEEPALIVE
                )
            ) as client:
                response = await client.post(
                    token_url, 
                    data=data,
                    auth=auth,
                    headers={"Content-Type": "application/x-www-form-urlencoded"}
                )
                response.raise_for_status()
                token_data = response.json()
                self.access_token = token_data.get("access_token")
            
            # Cache token with expiry (NextThink tokens typically expire in 3600 seconds)
            # Set expiry to 5 minutes before actual expiry for safety margin
            expires_in = token_data.get("expires_in", 3600)
            self.token_expiry = datetime.now() + timedelta(seconds=expires_in - 300)
            
            logger.debug("Successfully obtained NextThink access token", expires_in=expires_in)
            return self.access_token
        except httpx.HTTPError as e:
            logger.error("Failed to obtain NextThink access token", error=str(e))
            resp = getattr(e, "response", None)
            status = getattr(resp, "status_code", 502) if resp else 502
            raise ExternalServiceError(
                service="NextThink",
                status_code=status,
                message=f"Authentication failed: {str(e)}"
            ) from e
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Perform a lightweight health check by verifying token acquisition.
        Uses cached token if available to minimize API calls.
        Suitable for frequent polling (e.g., every 5 minutes).
        
        Returns:
            dict: Health status and connection details
        """
        try:
            # Check if we have a cached token before making the call
            was_cached = bool(self.access_token and self.token_expiry and datetime.now() < self.token_expiry)
            
            token = await self._get_access_token()
            
            result = {
                "status": "healthy",
                "service": "NextThink API",
                "auth_url": self.auth_base_url,
                "api_url": self.api_base_url,
                "authenticated": bool(token),
                "cached": was_cached
            }
            
            if self.token_expiry:
                result["token_expires_in_seconds"] = int((self.token_expiry - datetime.now()).total_seconds())
            
            # Track health metrics
            tracker = get_health_tracker()
            tracker.record_health_check("NextThink", "healthy")
            
            return result
        except ExternalServiceError as e:
            logger.error("NextThink health check failed", error=str(e))
            
            # Track health metrics
            tracker = get_health_tracker()
            tracker.record_health_check("NextThink", "unhealthy", error=str(e))
            
            return {
                "status": "unhealthy",
                "service": "NextThink API",
                "auth_url": self.auth_base_url,
                "api_url": self.api_base_url,
                "authenticated": False,
                "error": str(e)
            }
    
    async def authenticate(self) -> Dict[str, Any]:
        """
        Authenticate with NextThink API and return token info.
        WARNING: Does not return actual token for security reasons.
        
        Returns:
            dict: Authentication status and details (token excluded)
        """
        try:
            token = await self._get_access_token()
            return {
                "status": "authenticated",
                "service": "NextThink API",
                "auth_url": self.auth_base_url,
                "api_url": self.api_base_url,
                "username": self.username,
                "token_acquired": bool(token),
                "message": "Successfully authenticated with NextThink API"
            }
        except ExternalServiceError as e:
            logger.error("NextThink authentication failed", error=str(e))
            return {
                "status": "authentication_failed",
                "service": "NextThink API",
                "auth_url": self.auth_base_url,
                "api_url": self.api_base_url,
                "error": str(e)
            }
    
    async def __aenter__(self):
        """Set up the client with authentication and connection pooling."""
        token = await self._get_access_token()
        self.auth_headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        # Create client with optimized connection pool
        limits = httpx.Limits(
            max_connections=self.settings.HTTP_POOL_MAX_CONNECTIONS,
            max_keepalive_connections=self.settings.HTTP_POOL_MAX_KEEPALIVE,
            keepalive_expiry=self.settings.HTTP_POOL_KEEPALIVE_EXPIRY
        )
        
        # Try to enable HTTP/2
        enable_http2 = getattr(self.settings, 'HTTP_ENABLE_HTTP2', True)
        if enable_http2:
            try:
                import h2  # noqa
            except ImportError:
                enable_http2 = False
        
        self.client = httpx.AsyncClient(
            base_url=self.api_base_url,
            timeout=self.timeout,
            headers=self.auth_headers,
            follow_redirects=True,
            http2=enable_http2,
            limits=limits
        )
        return self
    
    async def get_remote_actions(
        self, 
        device_name: str,
        query_type: str = "detailed"
    ) -> Dict[str, Any]:
        """
        Fetch remote actions from NextThink using NQL query.
        
        Args:
            device_name (str): The device name to query
            query_type (str): "detailed" for all details or "basic" for simple list
            
        Returns:
            dict: Response containing remote actions
        """
        endpoint = "/api/v1/nql/execute"
        
        # Choose query based on type
        if query_type == "basic":
            query_id = "#zentience_ntt_remote_actions_executed_on_a_device"
        else:
            query_id = "#zentience_ntt_all_individual_remote_actions_executed_and_details"
        
        payload = {
            "queryId": query_id,
            "parameters": {
                "device_name": device_name
            }
        }
        
        logger.debug("Fetching remote actions for device", device_name=device_name, query_type=query_type)
        
        try:
            response = await self.post(endpoint, json=payload)
            return response
        except httpx.HTTPError as e:
            resp = getattr(e, "response", None)
            status = getattr(resp, "status_code", None) if resp is not None else None
            raise ExternalServiceError(
                service="NextThink",
                status_code=status or 502,
                message=str(e)
            ) from e
    
    async def get_remote_action_by_id(self, action_id: str) -> Dict[str, Any]:
        """
        Fetch a specific remote action by ID.
        
        Args:
            action_id (str): The remote action ID
            
        Returns:
            dict: Remote action details
        """
        endpoint = f"/api/v1/acts/{action_id}"
        
        logger.debug("Fetching remote action by ID", action_id=action_id)
        
        try:
            response = await self.get(endpoint)
            return response
        except httpx.HTTPError as e:
            resp = getattr(e, "response", None)
            status = getattr(resp, "status_code", None) if resp is not None else None
            if status == 404:
                logger.debug("Remote action not found", action_id=action_id)
                return {}
            raise ExternalServiceError(
                service="NextThink",
                status_code=status or 502,
                message=str(e)
            ) from e
    
    async def execute_remote_action(self, action_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a remote action on NextThink.
        
        Args:
            action_data (dict): The action payload
            
        Returns:
            dict: Execution response
        """
        endpoint = "/api/v1/acts/execute"
        
        logger.debug("Executing remote action", action_data=action_data)
        
        try:
            response = await self.post(endpoint, json=action_data)
            return response
        except httpx.HTTPError as e:
            resp = getattr(e, "response", None)
            status = getattr(resp, "status_code", None) if resp is not None else None
            raise ExternalServiceError(
                service="NextThink",
                status_code=status or 502,
                message=str(e)
            ) from e
    
    async def execute_nql_query(
        self,
        query_id: str,
        parameters: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute a generic NQL query on NextThink.
        
        Args:
            query_id (str): The query ID (e.g., "#zentience_ntt_demo_device_performance")
            parameters (dict): Query parameters including device_name
            
        Returns:
            dict: NQL query response containing the requested data
        """
        endpoint = "/api/v1/nql/execute"
        
        payload = {
            "queryId": query_id,
            "parameters": parameters
        }
        
        logger.debug(
            "Executing NQL query",
            query_id=query_id,
            parameters=parameters
        )
        
        try:
            response = await self.post(endpoint, json=payload)
            return response
        except httpx.HTTPError as e:
            resp = getattr(e, "response", None)
            status = getattr(resp, "status_code", None) if resp is not None else None
            raise ExternalServiceError(
                service="NextThink",
                status_code=status or 502,
                message=f"NQL query failed: {str(e)}"
            ) from e
    
    async def get_device_diagnostics(
        self,
        device_name: str,
        include_categories: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Fetch comprehensive device diagnostics from NextThink using multiple NQL queries.
        
        Uses 5 actual verified NQL queries:
        - #zentience_ntt_demo_device_information (Hardware & OS info - 18 fields)
        - #zentience_ntt_demo_device_performance (CPU/GPU/Memory/Boot metrics - 11 fields)
        - #zentience_ntt_demo_device_score (DEX scores - 10 scores)
        - #zentience_ntt_demo_app_crash_count (App crashes in 24h - 1 field)
        - #zentience_ntt_demo_no_of_alerts (Alert summary - variable)
        
        Args:
            device_name (str): The device name to query
            include_categories (list, optional): Specific diagnostic categories to query
                Available: ["hardware", "os_health", "device_scores", "application_health", "alerts"]
            
        Returns:
            dict: Aggregated diagnostics data with raw responses
        """
        logger.debug(
            "Fetching device diagnostics",
            device_name=device_name,
            categories=include_categories
        )
        
        diagnostics = {
            "device_name": device_name,
            "timestamp": datetime.now().isoformat(),
            "queries_executed": [],
            "data": {},
            "errors": []
        }
        
        # Map diagnostic categories to actual NQL query IDs (verified in Postman)
        diagnostic_queries = {
            "hardware": {
                "query_id": "#zentience_ntt_demo_device_information",
                "description": "Device hardware, CPU, GPU, Memory, Disk, Network"
            },
            "hardware_performance": {
                "query_id": "#zentience_ntt_demo_device_performance",
                "description": "CPU/GPU/Memory usage, boot metrics (24h/7d averages)"
            },
            "os_health": {
                "query_id": "#zentience_ntt_demo_device_information",
                "description": "OS build, platform, architecture, uptime"
            },
            "device_scores": {
                "query_id": "#zentience_ntt_demo_device_score",
                "description": "Digital Experience (DEX) scores"
            },
            "application_health": {
                "query_id": "#zentience_ntt_demo_app_crash_count",
                "description": "Application crash count (24h)"
            },
            "alerts": {
                "query_id": "#zentience_ntt_demo_no_of_alerts",
                "description": "Alert summary"
            }
        }
        
        # Determine which queries to execute
        categories_to_query = include_categories or list(diagnostic_queries.keys())
        
        # Track which actual NQL queries we've already executed (to avoid duplicates)
        executed_query_ids = set()
        
        # Execute each diagnostic query
        for category in categories_to_query:
            if category not in diagnostic_queries:
                logger.warning(
                    "Unknown diagnostic category",
                    category=category,
                    available=list(diagnostic_queries.keys())
                )
                diagnostics["errors"].append({
                    "category": category,
                    "error": f"Unknown diagnostic category. Available: {list(diagnostic_queries.keys())}"
                })
                continue
            
            query_info = diagnostic_queries[category]
            query_id = query_info["query_id"]
            
            try:
                logger.debug(
                    "Executing diagnostic query",
                    category=category,
                    query_id=query_id,
                    device_name=device_name
                )
                
                # Execute NQL query with device name filter
                response = await self.execute_nql_query(
                    query_id=query_id,
                    parameters={"device_name": device_name}
                )
                
                # Store response using query_id as key (for hardware and os_health which share same query)
                if query_id not in executed_query_ids:
                    diagnostics["data"][query_id] = {
                        "description": query_info["description"],
                        "raw_response": response
                    }
                    executed_query_ids.add(query_id)
                
                diagnostics["queries_executed"].append(category)
                
                logger.debug(
                    "Successfully retrieved diagnostics",
                    category=category,
                    query_id=query_id
                )
                
            except ExternalServiceError as e:
                logger.error(
                    "Failed to retrieve diagnostics",
                    category=category,
                    query_id=query_id,
                    error=str(e)
                )
                diagnostics["errors"].append({
                    "category": category,
                    "error": str(e),
                    "query_id": query_id
                })
            except Exception as e:  # noqa: BLE001
                logger.error(
                    "Unexpected error retrieving diagnostics",
                    category=category,
                    query_id=query_id,
                    error=str(e)
                )
                diagnostics["errors"].append({
                    "category": category,
                    "error": f"Unexpected error: {str(e)}"
                })
        
        # Add summary
        diagnostics["summary"] = {
            "total_categories_defined": len(diagnostic_queries),
            "total_categories_executed": len(diagnostics["queries_executed"]),
            "total_categories_failed": len(diagnostics["errors"]),
            "success_rate_percent": (
                len(diagnostics["queries_executed"]) / len(categories_to_query) * 100
                if categories_to_query else 0
            )
        }
        
        logger.info(
            "Device diagnostics retrieval completed",
            device_name=device_name,
            queries_executed=len(diagnostics["queries_executed"]),
            queries_failed=len(diagnostics["errors"]),
            success_rate=diagnostics["summary"]["success_rate_percent"]
        )
        
        return diagnostics
