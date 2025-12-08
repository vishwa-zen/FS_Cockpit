"""Remote Action ORM model."""

from sqlalchemy import Column, String, Text, DateTime, Index
from datetime import datetime
import uuid

from app.db.base import Base


class RemoteAction(Base):
    """
    Remote Action model - NextThink remote actions executed on devices.
    
    Purpose: Log remote actions for incidents and devices.
    """
    __tablename__ = "remote_actions"
    
    # Primary key
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Action identification
    action_id = Column(String(100), unique=True, nullable=False, index=True)
    action_name = Column(String(255), nullable=False)
    action_type = Column(String(100), nullable=True)  # e.g., "restart", "reboot", "update"
    
    # Context
    device_name = Column(String(255), nullable=True, index=True)
    incident_number = Column(String(50), nullable=True, index=True)
    
    # Execution
    status = Column(String(50), nullable=False, index=True)  # "pending", "executing", "completed", "failed"
    execution_result = Column(Text, nullable=True)  # JSON result or error details
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    executed_at = Column(DateTime, nullable=True)
    
    __table_args__ = (
        Index('idx_action_status', 'status'),
        Index('idx_action_device', 'device_name'),
        Index('idx_action_incident', 'incident_number'),
        Index('idx_action_created', 'created_at'),
    )
    
    def to_dict(self):
        """Convert model to dictionary."""
        return {
            'id': self.id,
            'action_id': self.action_id,
            'action_name': self.action_name,
            'action_type': self.action_type,
            'device_name': self.device_name,
            'incident_number': self.incident_number,
            'status': self.status,
            'execution_result': self.execution_result,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'executed_at': self.executed_at.isoformat() if self.executed_at else None,
        }
