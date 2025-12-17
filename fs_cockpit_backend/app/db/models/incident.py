"""Incident ORM model."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Index, Integer, String, Text

from app.db.base import Base


class Incident(Base):
    """
    Incident model - ServiceNow incident data.

    Privacy: No caller names, emails, or identifiers stored.
    Only: incident_number, description, device info, status, priority
    """

    __tablename__ = "incidents"

    # Primary key
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    # Incident identification
    incident_number = Column(String(50), unique=True, nullable=False, index=True)
    short_description = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)

    # Device context (technical only, no user assignment)
    device_name = Column(String(255), nullable=True, index=True)

    # Incident status
    status = Column(String(50), nullable=False, default="new")  # new, assigned, resolved, closed
    priority = Column(Integer, nullable=False, default=3)  # 1=critical, 5=low

    # ServiceNow identifier (for sync/lookup)
    servicenow_sys_id = Column(String(100), unique=True, nullable=False, index=True)

    # Solution tracking
    solution_generated = Column(Boolean, default=False)
    solution_source = Column(String(50), nullable=True)  # "KB", "GeminiAI", "stubbed"
    kb_article_used = Column(String(36), nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_sync_at = Column(DateTime, nullable=True)

    __table_args__ = (
        Index("idx_incident_device_status", "device_name", "status"),
        Index("idx_incident_created", "created_at"),
    )

    def to_dict(self):
        """Convert model to dictionary."""
        return {
            "id": self.id,
            "incident_number": self.incident_number,
            "short_description": self.short_description,
            "description": self.description,
            "device_name": self.device_name,
            "status": self.status,
            "priority": self.priority,
            "servicenow_sys_id": self.servicenow_sys_id,
            "solution_generated": self.solution_generated,
            "solution_source": self.solution_source,
            "kb_article_used": self.kb_article_used,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_sync_at": self.last_sync_at.isoformat() if self.last_sync_at else None,
        }
