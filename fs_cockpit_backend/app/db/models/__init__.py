"""Database ORM models for FS Cockpit."""

# Import models to register them with SQLAlchemy Base
from app.db.models.audit_log import AuditLog  # noqa: F401
from app.db.models.device import Device  # noqa: F401
from app.db.models.incident import Incident  # noqa: F401
from app.db.models.knowledge_article import KnowledgeArticle  # noqa: F401
from app.db.models.remote_action import RemoteAction  # noqa: F401
from app.db.models.sync_history import SyncHistory  # noqa: F401

__all__ = [
    "Incident",
    "Device",
    "KnowledgeArticle",
    "SyncHistory",
    "RemoteAction",
    "AuditLog",
]
