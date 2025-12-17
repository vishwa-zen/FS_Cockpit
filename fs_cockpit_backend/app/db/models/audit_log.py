"""Audit Log ORM model."""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Index, String, Text

from app.db.base import Base


class AuditLog(Base):
    """
    Audit Log model - Technician action trail for compliance and debugging.

    Purpose: Track who performed what action on which resource and when.
    Privacy: Records technician username (no email/PII), action type, resource affected.
    """

    __tablename__ = "audit_logs"

    # Primary key
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    # WHO - Technician performing the action
    technician_username = Column(String(255), nullable=False, index=True)

    # WHAT - Type of action
    action = Column(
        String(255), nullable=False, index=True
    )  # e.g., "view_incident", "generate_solution", "execute_action"

    # WHERE - Resource type affected
    resource_type = Column(
        String(100), nullable=True, index=True
    )  # e.g., "incident", "device", "remote_action"

    # WHICH - Specific resource ID
    resource_id = Column(
        String(100), nullable=True, index=True
    )  # e.g., incident_number, device_name, action_id

    # HOW - Additional context/details
    details = Column(Text, nullable=True)  # JSON string for complex data

    # FROM - Source IP address
    ip_address = Column(String(45), nullable=True)  # IPv4 (15) or IPv6 (39) address

    # WHEN - Timestamp
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("idx_audit_technician", "technician_username"),
        Index("idx_audit_action", "action"),
        Index("idx_audit_resource", "resource_type", "resource_id"),
        Index("idx_audit_created", "created_at"),
        Index("idx_audit_tech_created", "technician_username", "created_at"),
    )

    def to_dict(self):
        """Convert model to dictionary."""
        return {
            "id": self.id,
            "technician_username": self.technician_username,
            "action": self.action,
            "resource_type": self.resource_type,
            "resource_id": self.resource_id,
            "details": self.details,
            "ip_address": self.ip_address,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
