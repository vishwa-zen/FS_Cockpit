"""Database connection management with exception handling."""

from typing import Generator, Optional
import structlog
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError, OperationalError
from sqlalchemy import text
from contextlib import contextmanager

from app.db.session import SessionLocal, engine
from app.db.base import Base

logger = structlog.get_logger(__name__)


async def init_db() -> bool:
    """Initialize database tables and verify connection."""
    try:
        logger.info("Initializing database tables")
        
        # Test connection
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
                logger.info("Database connection test successful")
        except Exception as e:
            logger.warning("Database connection test failed, but continuing", error=str(e))
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
        return True
        
    except OperationalError as e:
        logger.error("Database connection failed", 
                    error=str(e),
                    error_type="OperationalError")
        return False
    except SQLAlchemyError as e:
        logger.error("Database initialization failed",
                    error=str(e),
                    error_type="SQLAlchemyError")
        return False
    except Exception as e:
        logger.error("Unexpected error during database initialization",
                    error=str(e),
                    error_type=type(e).__name__)
        return False


async def close_db() -> None:
    """Close all database connections."""
    try:
        engine.dispose()
        logger.info("Database connections closed successfully")
    except Exception as e:
        logger.error("Error closing database connections", error=str(e))


def get_db() -> Generator[Session, None, None]:
    """
    Dependency for FastAPI to get database session.
    
    Yields:
        Session: SQLAlchemy database session
        
    Raises:
        SQLAlchemyError: If database operation fails
    """
    db = SessionLocal()
    try:
        yield db
    except SQLAlchemyError as e:
        logger.error("Database session error",
                    error=str(e),
                    error_type="SQLAlchemyError")
        db.rollback()
        raise
    except Exception as e:
        logger.error("Unexpected error in database session",
                    error=str(e),
                    error_type=type(e).__name__)
        db.rollback()
        raise
    finally:
        db.close()


@contextmanager
def get_db_context() -> Generator[Session, None, None]:
    """
    Context manager for database session (non-async usage).
    
    Usage:
        with get_db_context() as db:
            # Use db
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except SQLAlchemyError as e:
        db.rollback()
        logger.error("Database context error", error=str(e))
        raise
    except Exception as e:
        db.rollback()
        logger.error("Unexpected error in database context", error=str(e))
        raise
    finally:
        db.close()
