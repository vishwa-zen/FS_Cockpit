"""
    Application configuration settings for FSCOCKPIT.
"""
from functools import lru_cache
from typing import Dict, List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    """
    Application settings for FSCOCKPIT.

    Args:
        BaseSettings (_type_): _description_
    """
    # Application metadata for OpenAPI/docs
    APP_NAME: str = "FSCOCKPIT"
    TITLE: str = "FS Cockpit Backend"
    DESCRIPTION: str = (
        "FS Cockpit Backend provides connectors to external systems (ServiceNow, Intune, "
        "NextThink) and exposes a small HTTP API used by the FS Cockpit platform."
    )
    VERSION: str = "0.1.0"
    OPENAPI_TAGS: List[Dict[str, str]] = [{"name": "v1", "description": "Version 1 API"}]
    CONTACT: Dict[str, str] = {"name": "FS Cockpit Team", "email": "devops@example.com"}
    LICENSE_INFO: Dict[str, str] = {"name": "MIT"}
    
    # ServiceNow Configuration
    # Accept multiple env var names for backwards compatibility with existing .env
    SERVICENOW_INSTANCE_URL: str = Field(..., env=("SERVICENOW_INSTANCE_URL", "SN_INSTANCE_URL"))
    SERVICENOW_USERNAME: str = Field(..., env=("SERVICENOW_USERNAME", "SN_USERNAME"))
    SERVICENOW_PASSWORD: str = Field(..., env=("SERVICENOW_PASSWORD", "SN_PASSWORD"))
    
    # Intune Configuration
    INTUNE_BASE_URL: str = Field(..., env="INTUNE_BASE_URL")
    INTUNE_GRAPH_URL: str = Field(default="https://graph.microsoft.com/v1.0", env="INTUNE_GRAPH_URL")
    INTUNE_TENANT_ID: str = Field(..., env="INTUNE_TENANT_ID")
    INTUNE_CLIENT_ID: str = Field(..., env="INTUNE_CLIENT_ID")
    INTUNE_CLIENT_SECRET: str = Field(..., env="INTUNE_CLIENT_SECRET")
    INTUNE_SCOPE: str = Field(default="https://graph.microsoft.com/.default", env="INTUNE_SCOPE")
    INTUNE_GRANT_TYPE: str = Field(default="client_credentials", env="INTUNE_GRANT_TYPE")
    
    # NextThink Configuration (support legacy NEXTHINK_* env names)
    NEXTTHINK_BASE_URL: str = Field(..., env=("NEXTTHINK_BASE_URL", "NEXTHINK_BASE_URL"))
    NEXTTHINK_API_URL: str = Field(..., env=("NEXTTHINK_API_URL", "NEXTHINK_API_URL"))
    NEXTTHINK_USER_NAME: str = Field(..., env=("NEXTTHINK_USER_NAME", "NEXTHINK_USER_NAME"))
    NEXTTHINK_PASWORD: str = Field(..., env=("NEXTTHINK_PASWORD", "NEXTHINK_PASWORD"))
    NEXTTHINK_GRANT_TYPE: str = Field(default="client_credentials", env=("NEXTTHINK_GRANT_TYPE", "NEXTHINK_GRANT_TYPE"))
    NEXTTHINK_SCOPE: str = Field(default="service:integration", env=("NEXTTHINK_SCOPE", "NEXTHIK_SCOPE"))
    
    # Http Configuration
    HTTP_TIMEOUT_SECONDS: int = 30
    HTTP_POOL_MAX_CONNECTIONS: int = 200
    HTTP_POOL_MAX_KEEPALIVE: int = 100
    HTTP_POOL_KEEPALIVE_EXPIRY: float = 30.0
    HTTP_ENABLE_HTTP2: bool = True  # Enable HTTP/2 if h2 package available
    
    # NextThink Query Optimization
    NEXTTHINK_DEFAULT_DAYS: int = 7  # Reduced from 30 for better performance
    
    # Azure AD Authentication Configuration
    AZURE_AD_ENABLED: bool = Field(default=False, env="AZURE_AD_ENABLED")  # Disable by default
    AZURE_AD_TENANT_ID: str = Field(default="e168d6cf-6597-4aeb-ae6f-111c78a48f78", env="AZURE_AD_TENANT_ID")
    AZURE_AD_CLIENT_ID: str = Field(default="64db8b2f-22ad-4ded-86b9-c91a43623f78", env="AZURE_AD_CLIENT_ID")
    
    # Azure AD B2C specific settings
    AZURE_AD_B2C_DOMAIN: Optional[str] = Field(default=None, env="AZURE_AD_B2C_DOMAIN")  # e.g., "zenpoc.b2clogin.com"
    AZURE_AD_B2C_POLICY: Optional[str] = Field(default=None, env="AZURE_AD_B2C_POLICY")  # e.g., "B2C_1_NTT_SIGNUP_SIGNIN"
    AZURE_AD_VERIFY_SSL: bool = Field(default=True, env="AZURE_AD_VERIFY_SSL")  # Set to false to disable SSL verification (dev only)
    
    # Derived Azure AD URLs (can be overridden via env vars)
    @property
    def AZURE_AD_ISSUER(self) -> str:
        """Azure AD token issuer URL."""
        if self.AZURE_AD_B2C_DOMAIN and self.AZURE_AD_B2C_POLICY:
            # B2C issuer format
            return f"https://{self.AZURE_AD_B2C_DOMAIN}/{self.AZURE_AD_TENANT_ID}/v2.0/"
        else:
            # Standard Azure AD issuer format
            return f"https://sts.windows.net/{self.AZURE_AD_TENANT_ID}/"
    
    @property
    def AZURE_AD_JWKS_URI(self) -> str:
        """Azure AD public keys endpoint for token signature verification."""
        if self.AZURE_AD_B2C_DOMAIN and self.AZURE_AD_B2C_POLICY:
            # B2C JWKS endpoint
            return f"https://{self.AZURE_AD_B2C_DOMAIN}/{self.AZURE_AD_TENANT_ID}/{self.AZURE_AD_B2C_POLICY}/discovery/v2.0/keys"
        else:
            # Standard Azure AD JWKS endpoint
            return f"https://login.microsoftonline.com/{self.AZURE_AD_TENANT_ID}/discovery/v2.0/keys"
    
    @property
    def AZURE_AD_AUDIENCE(self) -> str:
        """Expected audience in the token (your backend client ID)."""
        return self.AZURE_AD_CLIENT_ID
    
    # Optional: List of paths that don't require authentication
    AUTH_EXCLUDED_PATHS: List[str] = [
        "/health",
        "/docs",
        "/openapi.json",
        "/redoc",
        "/favicon.ico"
    ]
    
    # Cache Configuration
    CACHE_ENABLED: bool = True  # Enable/disable caching globally
    CACHE_MAX_SIZE: int = 10000  # Maximum number of cache entries
    CACHE_DEFAULT_TTL: int = 300  # Default TTL in seconds (5 minutes)
    CACHE_CLEANUP_INTERVAL: int = 300  # Cleanup interval in seconds (5 minutes)
    
    # Cache TTL for different data types
    CACHE_TTL_DEVICE: int = 900  # 15 minutes for device info
    CACHE_TTL_USER: int = 3600  # 1 hour for user info
    CACHE_TTL_INCIDENT: int = 300  # 5 minutes for incident data
    CACHE_TTL_REMOTE_ACTION: int = 600  # 10 minutes for remote actions
    CACHE_TTL_KNOWLEDGE: int = 900  # 15 minutes for KB articles
    CACHE_TTL_SOLUTION: int = 900  # 15 minutes for AI-generated solutions
    
    # Google Gemini AI Configuration
    GOOGLE_AI_API_KEY: str = Field(default="", env="GOOGLE_AI_API_KEY")
    GOOGLE_AI_ENABLED: bool = Field(default=False, env="GOOGLE_AI_ENABLED")
    GOOGLE_AI_USE_REAL_RESPONSES: bool = Field(default=True, env="GOOGLE_AI_USE_REAL_RESPONSES")
    GOOGLE_AI_MODEL_NAME: str = Field(default="gemini-pro", env="GOOGLE_AI_MODEL_NAME")
    GOOGLE_AI_TEMPERATURE: float = Field(default=0.7, env="GOOGLE_AI_TEMPERATURE")
    GOOGLE_AI_MAX_OUTPUT_TOKENS: int = Field(default=1000, env="GOOGLE_AI_MAX_OUTPUT_TOKENS")
    
    # CORS defaults
    ALLOWED_ORIGINS: List[str] = ["*"]
    ALLOW_CREDENTIALS: bool = True
    ALLOW_METHODS: List[str] = ["*"]
    ALLOW_HEADERS: List[str] = ["*"]

    # GZip configuration
    GZIP_MINIMUM_SIZE: int = 1000
    # Runtime environment for logging/configuration (e.g. development|production)
    ENVIRONMENT: str = "development"
    
    # pydantic v2 model config
    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }

@lru_cache
def get_settings() -> Settings:
    """
    Caches and returns the application settings.

    Returns:
        Settings: _description_
    """
    return Settings()