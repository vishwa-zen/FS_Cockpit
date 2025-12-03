"""
    Application configuration settings for FSCOCKPIT.
"""
from functools import lru_cache
from typing import Dict, List
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
    NEXTTHINK_API_KEY: str = Field(..., env=("NEXTTHINK_API_KEY", "NEXTHINK_API_KEY"))
    
    # Http Configuration
    HTTP_TIMEOUT_SECONDS: int = 30
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