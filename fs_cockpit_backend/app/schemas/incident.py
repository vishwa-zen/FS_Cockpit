""" Data Transfer Objects (DTOs) for ServiceNow Incident records."""
from typing import Optional
from typing import List
from pydantic import BaseModel


class IncidentDTO(BaseModel):
    """Data Transfer Object representing a ServiceNow Incident."""
    sysId: str
    incidentNumber: str
    shortDescription: Optional[str]
    priority: Optional[str]
    impact: Optional[int]
    status: Optional[str]  # This will now contain state.display_value
    active: Optional[bool]
    assignedTo: Optional[str]
    deviceName: Optional[str]
    createdBy: Optional[str]
    callerId: Optional[str]
    openedAt: Optional[str]  # ISO datetime string
    lastUpdatedAt: Optional[str]


class IncidentListResponse(BaseModel):
    """Response model containing a list of incidents."""
    incidents: List[IncidentDTO]