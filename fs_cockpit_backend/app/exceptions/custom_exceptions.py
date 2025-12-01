class ExternalServiceError(Exception):
    """Raised when external service returns an error"""
    def __init__(self, service: str, status_code: int, message: str):
        self.service = service
        self.status_code = status_code
        self.message = message
        super().__init__(f"{service} error ({status_code}): {message}")

class CredentialError(Exception):
    """Raised when credentials are missing or invalid"""
    pass

class ConfigurationError(Exception):
    """Raised when configuration is missing or invalid"""
    pass

class CircuitBreakerOpenError(Exception):
    """Raised when circuit breaker is open"""
    pass
