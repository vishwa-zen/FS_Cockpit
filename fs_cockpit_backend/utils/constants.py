"""FastAPI application metadata constants used by `app/main.py`.

This file intentionally contains only the API metadata items the project
expects when creating the FastAPI app instance in `app/main.py`.
"""

from typing import Dict, List

# API metadata consumed when building the FastAPI app
TITLE: str = "FS Cockpit Backend"
DESCRIPTION: str = (
    "FS Cockpit Backend provides connectors to external systems (ServiceNow, Intune, "
    "NextThink) and exposes a small HTTP API used by the FS Cockpit platform."
)
VERSION: str = "0.1.0"

# OpenAPI tags used to group endpoints in the generated docs
OPENAPI_TAGS: List[Dict[str, str]] = [
    {"name": "v1", "description": "Version 1 API"},
]

# Contact and license information inserted into OpenAPI schema
CONTACT: Dict[str, str] = {"name": "FS Cockpit Team", "email": "devops@example.com"}
LICENSE_INFO: Dict[str, str] = {"name": "MIT"}

__all__ = [
    "TITLE",
    "DESCRIPTION",
    "VERSION",
    "OPENAPI_TAGS",
    "CONTACT",
    "LICENSE_INFO",
]

# CORS configuration defaults used by `app/main.py`
# Edit these values to control which origins/headers/methods are allowed.
ALLOWED_ORIGINS = ["*"]
ALLOW_CREDENTIALS = True
ALLOW_METHODS = ["*"]
ALLOW_HEADERS = ["*"]

__all__ += [
    "ALLOWED_ORIGINS",
    "ALLOW_CREDENTIALS",
    "ALLOW_METHODS",
    "ALLOW_HEADERS",
]
