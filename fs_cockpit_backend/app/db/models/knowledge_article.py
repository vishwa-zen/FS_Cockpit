"""Knowledge Article ORM model."""

from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime, Index
from datetime import datetime
import uuid

from app.db.base import Base


class KnowledgeArticle(Base):
    """
    Knowledge Article model - ServiceNow KB articles with embedding vectors for RAG.
    
    Supports semantic search and AI context retrieval.
    """
    __tablename__ = "knowledge_articles"
    
    # Primary key
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Article identification
    article_number = Column(String(50), unique=True, nullable=False, index=True)
    title = Column(String(500), nullable=False)
    content = Column(Text, nullable=False)
    
    # Categorization
    category = Column(String(100), nullable=True, index=True)  # e.g., "Hardware", "Software", "Network"
    keywords = Column(String(500), nullable=True)  # comma-separated
    
    # ServiceNow sync
    servicenow_sys_id = Column(String(100), unique=True, nullable=False, index=True)
    
    # Article metrics
    view_count = Column(Integer, default=0)
    
    # Embedding for RAG/semantic search (JSON string of float array)
    embedding = Column(Text, nullable=True)
    
    # Status and sync
    is_published = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_sync_at = Column(DateTime, nullable=True)
    
    __table_args__ = (
        Index('idx_article_category', 'category'),
        Index('idx_article_published', 'is_published'),
        Index('idx_article_created', 'created_at'),
    )
    
    def to_dict(self):
        """Convert model to dictionary."""
        return {
            'id': self.id,
            'article_number': self.article_number,
            'title': self.title,
            'content': self.content,
            'category': self.category,
            'keywords': self.keywords,
            'servicenow_sys_id': self.servicenow_sys_id,
            'view_count': self.view_count,
            'embedding': self.embedding,
            'is_published': self.is_published,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'last_sync_at': self.last_sync_at.isoformat() if self.last_sync_at else None,
        }
