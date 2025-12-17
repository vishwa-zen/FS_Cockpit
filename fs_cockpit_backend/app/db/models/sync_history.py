"""Sync History ORM model."""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Index, Integer, String, Text

from app.db.base import Base


class SyncHistory(Base):
    """
    Sync History model - Tracks when external systems were last synced.

    Purpose: Know freshness of cached data, debug sync issues.
    """

    __tablename__ = "sync_history"

    # Primary key
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    # Sync tracking
    source = Column(String(50), nullable=False, index=True)  # "ServiceNow", "Intune", "Nextthink"
    sync_status = Column(String(50), nullable=False, index=True)  # "success", "failed", "partial"
    record_count = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("idx_sync_source", "source"),
        Index("idx_sync_status", "sync_status"),
        Index("idx_sync_created", "created_at"),
        Index("idx_sync_source_created", "source", "created_at"),
    )

    def to_dict(self):
        """Convert model to dictionary."""
        return {
            "id": self.id,
            "source": self.source,
            "sync_status": self.sync_status,
            "record_count": self.record_count,
            "error_message": self.error_message,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
