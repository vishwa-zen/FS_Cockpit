"""Azure AD JWT token authentication middleware."""

from datetime import datetime
from typing import Any, Callable, Dict, Optional

import jwt
import structlog
from fastapi import Request
from jwt import PyJWKClient, PyJWTError
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse, Response

from app.config.settings import get_settings
from app.middleware.request_id import get_request_id

logger = structlog.get_logger(__name__)


class AzureADAuthMiddleware(BaseHTTPMiddleware):
    """
    Middleware to validate Azure AD JWT tokens.

    When AZURE_AD_ENABLED=True, validates Bearer tokens in Authorization header.
    When AZURE_AD_ENABLED=False, skips validation (for testing/development).

    Validates:
    - Token signature using Azure AD public keys (JWKS)
    - Token expiration
    - Token issuer
    - Token audience

    On success, attaches user info to request.state.user
    """

    def __init__(self, app):
        super().__init__(app)
        self.settings = get_settings()
        self.jwks_client: Optional[PyJWKClient] = None

        # Initialize JWKS client only if auth is enabled
        if self.settings.AZURE_AD_ENABLED:
            try:
                # Configure SSL verification based on settings
                if not self.settings.AZURE_AD_VERIFY_SSL:
                    logger.warning(
                        "⚠️ SSL verification DISABLED for Azure AD JWKS - NOT FOR PRODUCTION!",
                        jwks_uri=self.settings.AZURE_AD_JWKS_URI,
                    )
                    # SECURITY WARNING: This code is only for development/testing with self-signed certs
                    # In production, either use valid certificates or configure CA bundle path
                    # Monkey-patch PyJWKClient to disable SSL verification for dev/test
                    import ssl as ssl_module
                    import urllib.request

                    # Create unverified context (for dev/test only - allows self-signed certs)
                    # nosec B323: Intentional for development/testing only
                    ssl_context = ssl_module._create_unverified_context()  # noqa: S323

                    # Patch urllib to use unverified context
                    original_urlopen = urllib.request.urlopen

                    def patched_urlopen(url, *args, **kwargs):
                        kwargs["context"] = ssl_context
                        return original_urlopen(url, *args, **kwargs)

                    urllib.request.urlopen = patched_urlopen

                self.jwks_client = PyJWKClient(
                    self.settings.AZURE_AD_JWKS_URI,
                    timeout=10,
                    headers={"User-Agent": "FS-Cockpit-Backend"},
                )

                logger.info(
                    "Azure AD authentication enabled",
                    tenant_id=self.settings.AZURE_AD_TENANT_ID,
                    client_id=self.settings.AZURE_AD_CLIENT_ID,
                    jwks_uri=self.settings.AZURE_AD_JWKS_URI,
                    ssl_verify=self.settings.AZURE_AD_VERIFY_SSL,
                )
            except Exception as e:
                logger.error("Failed to initialize JWKS client", error=str(e))
                raise
        else:
            logger.info("Azure AD authentication DISABLED (AZURE_AD_ENABLED=False)")

    def _is_excluded_path(self, path: str) -> bool:
        """Check if the request path should skip authentication."""
        return any(path.startswith(excluded) for excluded in self.settings.AUTH_EXCLUDED_PATHS)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process the request and validate JWT token if required."""

        # Skip auth for excluded paths (health, docs, etc.)
        if self._is_excluded_path(request.url.path):
            return await call_next(request)

        # Skip auth if disabled
        if not self.settings.AZURE_AD_ENABLED:
            # Set a default anonymous user for non-authenticated mode
            request.state.user = None
            return await call_next(request)

        # Extract token from Authorization header
        auth_header = request.headers.get("Authorization", "")

        if not auth_header:
            return self._unauthorized_response(request, "Missing Authorization header")

        if not auth_header.startswith("Bearer "):
            return self._unauthorized_response(
                request, "Invalid Authorization header format. Expected 'Bearer <token>'"
            )

        token = auth_header.replace("Bearer ", "").strip()

        if not token:
            return self._unauthorized_response(request, "Empty token")

        # Validate token
        try:
            user_info = await self._validate_token(token)
        except jwt.ExpiredSignatureError:
            return self._unauthorized_response(
                request, "Token has expired", error_code="TOKEN_EXPIRED"
            )
        except jwt.InvalidAudienceError:
            return self._unauthorized_response(
                request, "Invalid token audience", error_code="INVALID_AUDIENCE"
            )
        except jwt.InvalidIssuerError:
            return self._unauthorized_response(
                request, "Invalid token issuer", error_code="INVALID_ISSUER"
            )
        except PyJWTError as e:
            # Catches all other JWT-related errors (invalid signature, malformed token, etc.)
            logger.warning(
                "JWT validation failed",
                error=str(e),
                error_type=type(e).__name__,
                request_id=get_request_id(request),
            )
            return self._unauthorized_response(
                request, f"Token validation failed: {str(e)}", error_code="INVALID_TOKEN"
            )

        # Token validated successfully - attach user info and continue
        request.state.user = user_info

        logger.debug(
            "Token validated successfully",
            user_email=user_info.get("email"),
            user_oid=user_info.get("oid"),
            request_id=get_request_id(request),
        )

        # Let downstream errors propagate naturally instead of catching them here
        return await call_next(request)

    async def _validate_token(self, token: str) -> Dict[str, Any]:
        """
        Validate Azure AD JWT token.

        Args:
            token: JWT token string

        Returns:
            dict: Decoded token payload with user information

        Raises:
            PyJWTError: If token validation fails
        """
        # Get signing key from Azure AD JWKS endpoint
        signing_key = self.jwks_client.get_signing_key_from_jwt(token)

        # Decode and validate token
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=self.settings.AZURE_AD_AUDIENCE,
            issuer=self.settings.AZURE_AD_ISSUER,
            options={
                "verify_signature": True,
                "verify_exp": True,
                "verify_aud": True,
                "verify_iss": True,
            },
        )

        # Extract user information from token claims
        user_info = {
            "oid": payload.get("oid"),  # Object ID (unique user identifier)
            "email": payload.get("email")
            or payload.get("preferred_username")
            or payload.get("upn"),
            "name": payload.get("name"),
            "given_name": payload.get("given_name"),
            "family_name": payload.get("family_name"),
            "roles": payload.get("roles", []),  # Application roles
            "groups": payload.get("groups", []),  # Group memberships
            "tenant_id": payload.get("tid"),
            "app_id": payload.get("appid") or payload.get("azp"),
            "token_exp": payload.get("exp"),
            "token_iat": payload.get("iat"),
        }

        return user_info

    def _unauthorized_response(
        self, request: Request, message: str, error_code: str = "UNAUTHORIZED"
    ) -> JSONResponse:
        """Create a standardized 401 Unauthorized response."""
        request_id = get_request_id(request)

        logger.warning(
            "Authentication failed",
            message=message,
            error_code=error_code,
            path=request.url.path,
            request_id=request_id,
        )

        return JSONResponse(
            status_code=401,
            content={
                "success": False,
                "message": message,
                "error_code": error_code,
                "data": None,
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "request_id": request_id,
            },
        )


__all__ = ["AzureADAuthMiddleware"]
