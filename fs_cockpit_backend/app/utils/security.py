"""Security utilities for masking sensitive information in logs and responses."""

import re
from typing import Any, Dict, Set

import structlog

logger = structlog.get_logger(__name__)

# Sensitive field patterns (case-insensitive)
SENSITIVE_FIELDS: Set[str] = {
    "password",
    "passwd",
    "pwd",
    "secret",
    "api_key",
    "apikey",
    "access_token",
    "refresh_token",
    "token",
    "authorization",
    "auth",
    "bearer",
    "client_secret",
    "private_key",
    "privatekey",
    "credential",
    "credentials",
}

# Patterns to detect sensitive data in strings
SENSITIVE_PATTERNS = [
    re.compile(r"(Bearer\s+)[A-Za-z0-9\-\._~\+\/]+=*", re.IGNORECASE),  # Bearer tokens
    re.compile(
        r"(token[\"']?\s*[:=]\s*[\"']?)[A-Za-z0-9\-\._~\+\/]+=*", re.IGNORECASE
    ),  # token=xxx
    re.compile(r"(password[\"']?\s*[:=]\s*[\"']?)([^\s\"']+)", re.IGNORECASE),  # password=xxx
    re.compile(r"(api[_-]?key[\"']?\s*[:=]\s*[\"']?)([^\s\"']+)", re.IGNORECASE),  # api_key=xxx
]

MASK_VALUE = "***REDACTED***"


def mask_sensitive_string(text: str) -> str:
    """
    Mask sensitive information in a string using pattern matching.

    Args:
        text: String that may contain sensitive information

    Returns:
        str: String with sensitive data masked
    """
    if not isinstance(text, str):
        return text

    masked = text
    for pattern in SENSITIVE_PATTERNS:
        masked = pattern.sub(r"\1" + MASK_VALUE, masked)

    return masked


def mask_sensitive_dict(data: Dict[str, Any], mask_value: str = MASK_VALUE) -> Dict[str, Any]:
    """
    Recursively mask sensitive fields in a dictionary.

    Args:
        data: Dictionary that may contain sensitive information
        mask_value: Value to use for masking (default: "***REDACTED***")

    Returns:
        dict: New dictionary with sensitive fields masked
    """
    if not isinstance(data, dict):
        return data

    masked = {}
    for key, value in data.items():
        key_lower = key.lower()

        # Check if key is sensitive
        if any(sensitive in key_lower for sensitive in SENSITIVE_FIELDS):
            masked[key] = mask_value
        elif isinstance(value, dict):
            # Recursively mask nested dictionaries
            masked[key] = mask_sensitive_dict(value, mask_value)
        elif isinstance(value, list):
            # Mask items in lists
            masked[key] = [
                mask_sensitive_dict(item, mask_value) if isinstance(item, dict) else item
                for item in value
            ]
        elif isinstance(value, str):
            # Mask sensitive patterns in strings
            masked[key] = mask_sensitive_string(value)
        else:
            masked[key] = value

    return masked


def mask_url_credentials(url: str) -> str:
    """
    Mask credentials in URLs (e.g., https://user:pass@host.com).

    Args:
        url: URL that may contain embedded credentials

    Returns:
        str: URL with credentials masked
    """
    if not isinstance(url, str):
        return url

    # Pattern: scheme://username:password@host
    pattern = re.compile(r"(https?://)([^:]+):([^@]+)@")
    return pattern.sub(r"\1***:***@", url)


def sanitize_for_logging(data: Any) -> Any:
    """
    Sanitize data before logging by masking sensitive information.
    Use this function before logging any user input, API responses, or configuration.

    Args:
        data: Data to sanitize (dict, str, or other)

    Returns:
        Sanitized copy of the data
    """
    if isinstance(data, dict):
        return mask_sensitive_dict(data)
    elif isinstance(data, str):
        return mask_sensitive_string(data)
    elif isinstance(data, list):
        return [sanitize_for_logging(item) for item in data]
    else:
        return data


def safe_log_context(**kwargs) -> Dict[str, Any]:
    """
    Create a safe logging context by masking sensitive fields.
    Use this when binding context to structlog.

    Example:
        logger.info("User login", **safe_log_context(username=user, password=pwd))
        # Logs: {"username": "john", "password": "***REDACTED***"}

    Args:
        **kwargs: Key-value pairs to log

    Returns:
        dict: Sanitized context dictionary
    """
    return mask_sensitive_dict(kwargs)


def remove_sensitive_headers(headers: Dict[str, str]) -> Dict[str, str]:
    """
    Remove or mask sensitive HTTP headers for logging.

    Args:
        headers: HTTP headers dictionary

    Returns:
        dict: Headers with sensitive values masked
    """
    if not isinstance(headers, dict):
        return headers

    sensitive_header_names = {
        "authorization",
        "x-api-key",
        "x-auth-token",
        "cookie",
        "set-cookie",
        "proxy-authorization",
    }

    masked = {}
    for key, value in headers.items():
        key_lower = key.lower()
        if key_lower in sensitive_header_names:
            masked[key] = MASK_VALUE
        else:
            masked[key] = value

    return masked


__all__ = [
    "mask_sensitive_dict",
    "mask_sensitive_string",
    "mask_url_credentials",
    "sanitize_for_logging",
    "safe_log_context",
    "remove_sensitive_headers",
    "MASK_VALUE",
]
