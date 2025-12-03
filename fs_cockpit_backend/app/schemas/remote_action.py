"""NextThink schema definitions."""
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field


class RemoteActionDTO(BaseModel):
    """Data Transfer Object for NextThink Remote Action."""
    
    actionId: Optional[str] = Field(None, description="Unique identifier for the remote action")
    actionName: Optional[str] = Field(None, description="Name of the remote action")
    actionType: Optional[str] = Field(None, description="Type of the remote action")
    status: Optional[str] = Field(None, description="Current status of the action")
    createdAt: Optional[str] = Field(None, description="Timestamp when action was created")
    updatedAt: Optional[str] = Field(None, description="Timestamp when action was last updated")
    deviceId: Optional[str] = Field(None, description="Target device identifier")
    deviceName: Optional[str] = Field(None, description="Target device name")
    executedBy: Optional[str] = Field(None, description="User who executed the action")
    result: Optional[Dict[str, Any]] = Field(None, description="Action execution result")
    
    class Config:
        """Pydantic config."""
        json_schema_extra = {
            "example": {
                "actionId": "act_12345",
                "actionName": "Restart Device",
                "actionType": "system",
                "status": "completed",
                "createdAt": "2025-12-03T10:00:00Z",
                "updatedAt": "2025-12-03T10:05:00Z",
                "deviceId": "dev_67890",
                "deviceName": "DESKTOP-ABC123",
                "executedBy": "admin@example.com",
                "result": {"exitCode": 0, "message": "Success"}
            }
        }


class RemoteActionListResponse(BaseModel):
    """Response model for list of remote actions."""
    
    actions: List[RemoteActionDTO] = Field(default_factory=list, description="List of remote actions")
    total: Optional[int] = Field(None, description="Total number of actions")
    
    class Config:
        """Pydantic config."""
        json_schema_extra = {
            "example": {
                "actions": [
                    {
                        "actionId": "act_12345",
                        "actionName": "Restart Device",
                        "actionType": "system",
                        "status": "completed"
                    }
                ],
                "total": 1
            }
        }


class RemoteActionExecuteRequest(BaseModel):
    """Request model for executing a remote action."""
    
    actionType: str = Field(..., description="Type of action to execute")
    deviceId: str = Field(..., description="Target device identifier")
    parameters: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Action parameters")
    
    class Config:
        """Pydantic config."""
        json_schema_extra = {
            "example": {
                "actionType": "restart",
                "deviceId": "dev_67890",
                "parameters": {"timeout": 30}
            }
        }


class RemoteActionExecuteResponse(BaseModel):
    """Response model for remote action execution."""
    
    actionId: str = Field(..., description="ID of the executed action")
    status: str = Field(..., description="Execution status")
    message: Optional[str] = Field(None, description="Status message")
    
    class Config:
        """Pydantic config."""
        json_schema_extra = {
            "example": {
                "actionId": "act_12345",
                "status": "initiated",
                "message": "Action has been queued for execution"
            }
        }
