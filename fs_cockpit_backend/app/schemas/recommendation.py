"""Data Transfer Objects (DTOs) for NextThink Remote Action Recommendations."""

from typing import List, Optional

from pydantic import BaseModel

from app.schemas.remote_action import RemoteActionDTO


class RecommendationRequest(BaseModel):
    """Request model for getting remote action recommendations."""

    incident_number: str
    device_name: Optional[str] = None  # Optional override
    caller_id: Optional[str] = None  # Optional caller sys_id for device resolution
    limit: Optional[int] = 10


class RecommendationResponse(BaseModel):
    """Response model for remote action recommendations."""

    incident_number: str
    device_name: Optional[str]
    category: Optional[str]
    recommendations: List[RemoteActionDTO]
    total: int
    message: Optional[str] = None
