"""Database module for PostgreSQL connection and session management."""

# Import after modules are created to avoid circular imports
from app.db.connection import get_db, init_db, close_db  # noqa: F401
from app.db.session import SessionLocal, engine  # noqa: F401
from app.db.models import (  # noqa: F401
    Incident,
    Device,
    KnowledgeArticle,
    SyncHistory,
    RemoteAction,
    AuditLog,
)
from app.db.writers import (  # noqa: F401
    IncidentWriter,
    DeviceWriter,
    KnowledgeArticleWriter,
    SyncHistoryWriter,
    RemoteActionWriter,
    AuditLogWriter,
)

__all__ = [
    "get_db",
    "init_db",
    "close_db",
    "SessionLocal",
    "engine",
    "Incident",
    "Device",
    "KnowledgeArticle",
    "SyncHistory",
    "RemoteAction",
    "AuditLog",
    "IncidentWriter",
    "DeviceWriter",
    "KnowledgeArticleWriter",
    "SyncHistoryWriter",
    "RemoteActionWriter",
    "AuditLogWriter",
]

