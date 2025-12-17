"""Device ORM model."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Index, String

from app.db.base import Base


class Device(Base):
    """
    Device model - Technical device information only (no user assignment names).

    Privacy: No device owner names, emails, or user identifiers.
    Only: device name, type, OS, serial, compliance status
    """

    __tablename__ = "devices"

    # Primary key
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    # Device identification (technical only)
    device_name = Column(String(255), unique=True, nullable=False, index=True)
    device_type = Column(String(100), nullable=False)  # e.g., "Windows", "Mac", "iOS"
    os_version = Column(String(100), nullable=True)

    # Device identifiers (technical)
    serial_number = Column(String(255), nullable=True)
    intune_device_id = Column(String(100), unique=True, nullable=True, index=True)
    servicenow_cmdb_id = Column(String(100), unique=True, nullable=True, index=True)

    # Device status
    is_compliant = Column(Boolean, default=False)
    is_managed = Column(Boolean, default=False)
    last_health_status = Column(String(50), nullable=True)  # "healthy", "warning", "critical"

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_intune_sync = Column(DateTime, nullable=True)
    last_servicenow_sync = Column(DateTime, nullable=True)

    __table_args__ = (
        Index("idx_device_type_compliant", "device_type", "is_compliant"),
        Index("idx_device_created", "created_at"),
    )

    def to_dict(self):
        """Convert model to dictionary."""
        return {
            "id": self.id,
            "device_name": self.device_name,
            "device_type": self.device_type,
            "os_version": self.os_version,
            "serial_number": self.serial_number,
            "intune_device_id": self.intune_device_id,
            "servicenow_cmdb_id": self.servicenow_cmdb_id,
            "is_compliant": self.is_compliant,
            "is_managed": self.is_managed,
            "last_health_status": self.last_health_status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_intune_sync": (
                self.last_intune_sync.isoformat() if self.last_intune_sync else None
            ),
            "last_servicenow_sync": (
                self.last_servicenow_sync.isoformat() if self.last_servicenow_sync else None
            ),
        }
