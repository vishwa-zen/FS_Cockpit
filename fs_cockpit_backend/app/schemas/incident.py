""" Data Transfer Objects (DTOs) for ServiceNow Incident records."""
from typing import Optional
from typing import List
from pydantic import BaseModel


class IncidentDTO(BaseModel):
    """Data Transfer Object representing a ServiceNow Incident."""
    sysId: str
    incidentNumber: str
    shortDescription: Optional[str]
    description: Optional[str]  # Full detailed description
    category: Optional[str]  # Incident category (e.g., 'hardware', 'software', 'network', 'inquiry')
    subcategory: Optional[str]  # Incident subcategory for more specific classification
    priority: Optional[str]
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


class IncidentListResponse(BaseModel):
    """Response model containing a list of incidents."""
    incidents: List[IncidentDTO]