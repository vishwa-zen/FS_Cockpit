"""Data Transfer Objects (DTOs) for ServiceNow Incident Comments/Activity Logs."""
from typing import Optional, List
from pydantic import BaseModel


class CommentDTO(BaseModel):
    """Data Transfer Object representing a ServiceNow Incident Comment."""
    sys_id: str
    comment_id: Optional[str]  # The actual comment text ID
    text: str  # The comment content
    created_by: Optional[str]  # User who created the comment
    created_by_name: Optional[str]  # Display name of user
    created_at: Optional[str]  # ISO datetime string
    updated_at: Optional[str]  # Last update time
    is_internal: Optional[bool]  # Whether it's an internal note (not visible to end user)
    comment_type: Optional[str]  # Type of comment (e.g., 'comment', 'activity', 'work_note')


class ActivityLogEntryDTO(BaseModel):
    """Data Transfer Object representing an Activity Log Entry."""
    sys_id: str
    field_name: Optional[str]  # Field that was changed
    old_value: Optional[str]  # Previous value
    new_value: Optional[str]  # New value
    changed_by: Optional[str]  # User who made the change
    changed_by_name: Optional[str]  # Display name
    changed_at: Optional[str]  # ISO datetime string
    change_type: Optional[str]  # Type of change (e.g., 'update', 'create')


class IncidentCommentsAndLogsResponse(BaseModel):
    """Response model containing comments and activity logs for an incident."""
    incident_number: str
    incident_sys_id: str
    comments: List[CommentDTO] = []
    activity_logs: List[ActivityLogEntryDTO] = []
    total_comments: int = 0
    total_activity_logs: int = 0
    metadata: Optional[dict] = None  # Additional metadata like last_update_time


class IncidentCommentThreadResponse(BaseModel):
    """Detailed comment thread response with pagination support."""
    incident_number: str
    incident_sys_id: str
    comments: List[CommentDTO] = []
    total_count: int = 0
    limit: int = 0
    offset: int = 0
    has_more: bool = False
