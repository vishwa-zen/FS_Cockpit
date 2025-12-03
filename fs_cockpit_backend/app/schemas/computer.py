from pydantic import BaseModel
from typing import Optional, List


class ComputerDTO(BaseModel):
    """Data Transfer Object representing a ServiceNow Computer (cmdb_ci_computer)."""
    sysId: str
    name: str
    hostName: Optional[str]
    serialNumber: Optional[str]
    assignedToId: Optional[str]  # The sys_id value
    assignedToName: Optional[str]  # The display_value (user name)


class ComputerListResponse(BaseModel):
    """Response model for a list of computers."""
    computers: List[ComputerDTO]
    count: int
