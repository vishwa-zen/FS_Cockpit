class ExternalServiceError(Exception):
    """Raised when external service returns an error"""
    def __init__(self, service: str, status_code: int, message: str):
        self.service = service
        self.status_code = status_code
        self.message = message
        super().__init__(f"{service} error ({status_code}): {message}")

class ServiceTimeoutError(Exception):
    """Raised when request times out"""
    def __init__(self, service: str, timeout_seconds: int, operation: str = "request"):
        self.service = service
        self.timeout_seconds = timeout_seconds
        self.operation = operation
        self.message = f"{service} {operation} timed out after {timeout_seconds} seconds"
        super().__init__(self.message)

class ServiceConnectionError(Exception):
    """Raised when cannot connect to service"""
    def __init__(self, service: str, url: str, details: str = ""):
        self.service = service
        self.url = url
        self.details = details
        self.message = f"Cannot connect to {service} at {url}"
        if details:
            self.message += f": {details}"
        super().__init__(self.message)

class CredentialError(Exception):
    """Raised when credentials are missing or invalid"""

class ConfigurationError(Exception):
    """Raised when configuration is missing or invalid"""

class CircuitBreakerOpenError(Exception):
    """Raised when circuit breaker is open"""
