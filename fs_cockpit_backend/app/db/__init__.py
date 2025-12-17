"""Database module for PostgreSQL connection and session management."""

# Import after modules are created to avoid circular imports
from app.db.connection import close_db, get_db, init_db  # noqa: F401
from app.db.models import (  # noqa: F401
    AuditLog,
    Device,
    Incident,
    KnowledgeArticle,
    RemoteAction,
    SyncHistory,
)
from app.db.session import SessionLocal, engine  # noqa: F401
from app.db.writers import (  # noqa: F401
    AuditLogWriter,
    DeviceWriter,
    IncidentWriter,
    KnowledgeArticleWriter,
    RemoteActionWriter,
    SyncHistoryWriter,
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
