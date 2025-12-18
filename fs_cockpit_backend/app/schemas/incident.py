"""Data Transfer Objects (DTOs) for ServiceNow Incident records."""

from typing import List, Optional

from pydantic import BaseModel


class IncidentDTO(BaseModel):
    """Data Transfer Object representing a ServiceNow Incident."""

    sysId: str
    incidentNumber: str
    shortDescription: Optional[str]
    description: Optional[str]  # Full detailed description
    category: Optional[
        str
    ]  # Incident category (e.g., 'hardware', 'software', 'network', 'inquiry')
    subcategory: Optional[str]  # Incident subcategory for more specific classification
    priority: Optional[str]
    severity: Optional[str]  # Incident severity level
    impact: Optional[int]
    status: Optional[str]  # This will now contain state.display_value
    active: Optional[bool]
    assignedTo: Optional[str]
    deviceName: Optional[str]
    createdBy: Optional[str]
    callerId: Optional[str]  # The sys_id value
    callerName: Optional[str]  # The display_value (user name)
    openedAt: Optional[str]  # ISO datetime string
    lastUpdatedAt: Optional[str]


class PaginationMetadata(BaseModel):
    """Pagination metadata for list responses."""

    total: int
    limit: int
    offset: int
    has_more: bool


class IncidentListResponse(BaseModel):
    """Response model containing a list of incidents."""

    incidents: List[IncidentDTO]


class PaginatedIncidentListResponse(BaseModel):
    """Response model containing paginated incidents with metadata."""

    incidents: List[IncidentDTO]
    pagination: PaginationMetadata
