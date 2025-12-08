"""SQLAlchemy session and engine setup."""

from typing import Generator
import structlog
from sqlalchemy import create_engine, event, pool, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import SQLAlchemyError

from app.db.config import db_config

logger = structlog.get_logger(__name__)

# Create engine with connection pooling
try:
    engine = create_engine(
        db_config.database_url,
        echo=db_config.echo_sql,
        poolclass=pool.QueuePool,
        pool_size=db_config.pool_size,
        max_overflow=db_config.max_overflow,
        pool_timeout=db_config.pool_timeout,
        pool_recycle=db_config.pool_recycle,
        pool_pre_ping=True,  # Test connections before using
        connect_args={
            "connect_timeout": 10,
            "options": "-c statement_timeout=30000"  # 30 second statement timeout
        }
    )
    logger.info("Database engine created successfully", 
                connection_string=db_config.get_connection_string())
except SQLAlchemyError as e:
    logger.error("Failed to create database engine", 
                 error=str(e), 
                 connection_string=db_config.get_connection_string())
    raise

# Session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False
)


# Event listeners for connection pool monitoring
@event.listens_for(pool.Pool, "connect")
def receive_connect(dbapi_conn, connection_record):
    """Log when a new connection is established."""
    logger.debug("New database connection established")


@event.listens_for(pool.Pool, "checkout")
def receive_checkout(dbapi_conn, connection_record, connection_proxy):
    """Log connection checkout from pool."""
    logger.debug("Connection checked out from pool")


@event.listens_for(pool.Pool, "checkin")
def receive_checkin(dbapi_conn, connection_record):
    """Log connection return to pool."""
    logger.debug("Connection returned to pool")


@event.listens_for(pool.Pool, "close")
def receive_close(dbapi_conn, connection_record):
    """Log connection closure."""
    logger.debug("Database connection closed")
