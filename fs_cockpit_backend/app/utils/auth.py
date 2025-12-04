"""Authentication utilities and FastAPI dependencies."""
from typing import Optional, Dict, Any
from fastapi import Request, HTTPException, Depends
import structlog

from app.config.settings import get_settings

logger = structlog.get_logger(__name__)


def get_current_user(request: Request) -> Optional[Dict[str, Any]]:
    """
    Get the current authenticated user from request state.
    
    This dependency retrieves user information attached by the
    AzureADAuthMiddleware. If authentication is disabled or the
    endpoint is public, returns None.
    
    Args:
        request: FastAPI request object
        
    Returns:
        dict: User information from validated JWT token, or None if not authenticated
        
    Example:
        @router.get("/profile")
        async def get_profile(user: dict = Depends(get_current_user)):
            if user:
                return {"email": user["email"], "name": user["name"]}
            return {"message": "Anonymous user"}
    """
    return getattr(request.state, "user", None)


def require_auth(request: Request) -> Dict[str, Any]:
    """
    Require authentication for an endpoint.
    
    This dependency enforces that a valid user is authenticated.
    Raises 401 if no user is authenticated.
    
    Args:
        request: FastAPI request object
        
    Returns:
        dict: User information from validated JWT token
        
    Raises:
        HTTPException: 401 if user is not authenticated
        
    Example:
        @router.get("/secure-data")
        async def get_secure_data(user: dict = Depends(require_auth)):
            return {"message": f"Hello {user['name']}!"}
    """
    user = getattr(request.state, "user", None)
    
    if user is None:
        settings = get_settings()
        if settings.AZURE_AD_ENABLED:
            logger.warning("Authentication required but no user found", path=request.url.path)
            raise HTTPException(
                status_code=401,
                detail="Authentication required. Please provide a valid Bearer token."
            )
        else:
            # If auth is disabled, return a mock user for testing
            logger.debug("Auth disabled, returning mock user")
            return {
                "oid": "mock-user-id",
                "email": "mock@example.com",
                "name": "Mock User (Auth Disabled)",
                "roles": []
            }
    
    return user


def require_role(required_role: str):
    """
    Create a dependency that requires a specific role.
    
    Args:
        required_role: The role name required (e.g., "Admin", "Technician")
        
    Returns:
        Callable: Dependency function that validates role
        
    Example:
        @router.delete("/incidents/{id}")
        async def delete_incident(
            id: str,
            user: dict = Depends(require_role("Admin"))
        ):
            return {"message": f"Incident {id} deleted by {user['name']}"}
    """
    def role_checker(user: Dict[str, Any] = Depends(require_auth)) -> Dict[str, Any]:
        """Check if user has the required role."""
        user_roles = user.get("roles", [])
        
        if required_role not in user_roles:
            logger.warning(
                "Role check failed",
                required_role=required_role,
                user_roles=user_roles,
                user_email=user.get("email")
            )
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Required role: {required_role}"
            )
        
        logger.debug(
            "Role check passed",
            required_role=required_role,
            user_email=user.get("email")
        )
        
        return user
    
    return role_checker


def require_any_role(*required_roles: str):
    """
    Create a dependency that requires ANY of the specified roles.
    
    Args:
        *required_roles: Variable number of role names
        
    Returns:
        Callable: Dependency function that validates roles
        
    Example:
        @router.get("/dashboard")
        async def get_dashboard(
            user: dict = Depends(require_any_role("Admin", "Technician", "Viewer"))
        ):
            return {"message": f"Dashboard for {user['name']}"}
    """
    def role_checker(user: Dict[str, Any] = Depends(require_auth)) -> Dict[str, Any]:
        """Check if user has any of the required roles."""
        user_roles = user.get("roles", [])
        
        if not any(role in user_roles for role in required_roles):
            logger.warning(
                "Role check failed - none of required roles present",
                required_roles=list(required_roles),
                user_roles=user_roles,
                user_email=user.get("email")
            )
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Required roles: {', '.join(required_roles)}"
            )
        
        logger.debug(
            "Role check passed",
            required_roles=list(required_roles),
            user_email=user.get("email")
        )
        
        return user
    
    return role_checker


def get_user_email(user: Dict[str, Any] = Depends(get_current_user)) -> Optional[str]:
    """
    Extract user email from authenticated user.
    
    Convenience dependency for endpoints that only need the email.
    
    Args:
        user: Authenticated user from get_current_user dependency
        
    Returns:
        str: User email, or None if not authenticated
        
    Example:
        @router.get("/my-incidents")
        async def get_my_incidents(email: str = Depends(get_user_email)):
            if email:
                return await fetch_incidents_by_user(email)
            return []
    """
    return user.get("email") if user else None


__all__ = [
    "get_current_user",
    "require_auth",
    "require_role",
    "require_any_role",
    "get_user_email",
]
