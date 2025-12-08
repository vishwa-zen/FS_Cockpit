"""Database write services - Push data to DB for Agentic AI engine."""

from datetime import datetime
from typing import Optional
import structlog
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, SQLAlchemyError, OperationalError

from app.db.models import (
    Incident,
    Device,
    KnowledgeArticle,
    SyncHistory,
    RemoteAction,
    AuditLog,
)

logger = structlog.get_logger(__name__)


class IncidentWriter:
    """Write incident data to database."""
    
    @staticmethod
    def push_incident(
        db: Session,
        incident_number: str,
        short_description: str,
        servicenow_sys_id: str,
        device_name: Optional[str] = None,
        description: Optional[str] = None,
        status: str = "new",
        priority: int = 3,
        solution_source: Optional[str] = None,
    ) -> bool:
        """Push incident to database with comprehensive error handling."""
        try:
            incident = Incident(
                incident_number=incident_number,
                short_description=short_description,
                servicenow_sys_id=servicenow_sys_id,
                device_name=device_name,
                description=description,
                status=status,
                priority=priority,
                solution_source=solution_source,
            )
            db.add(incident)
            db.commit()
            logger.info("Incident pushed to DB", incident_number=incident_number)
            return True
        except IntegrityError as e:
            db.rollback()
            logger.warning(
                "Incident already exists or constraint violation",
                incident_number=incident_number,
                error_detail=str(e.orig) if hasattr(e, 'orig') else str(e),
            )
            return False
        except OperationalError as e:
            db.rollback()
            logger.error(
                "Database operational error (connection, timeout, etc.)",
                incident_number=incident_number,
                error_detail=str(e),
            )
            return False
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(
                "SQLAlchemy error",
                incident_number=incident_number,
                error_type=type(e).__name__,
                error_detail=str(e),
            )
            return False
        except Exception as e:  # noqa: BLE001
            db.rollback()
            logger.error(
                "Unexpected error pushing incident",
                incident_number=incident_number,
                error_type=type(e).__name__,
                error_detail=str(e),
            )
            return False
    
    @staticmethod
    def update_incident_solution(
        db: Session,
        incident_number: str,
        solution_source: str,
        kb_article_used: Optional[str] = None,
    ) -> bool:
        """Update incident with solution info - comprehensive error handling."""
        try:
            incident = db.query(Incident).filter_by(incident_number=incident_number).first()
            if incident:
                incident.solution_generated = True
                incident.solution_source = solution_source
                if kb_article_used:
                    incident.kb_article_used = kb_article_used
                incident.updated_at = datetime.utcnow()
                db.commit()
                logger.info("Incident solution updated", incident_number=incident_number)
                return True
            else:
                logger.warning("Incident not found for update", incident_number=incident_number)
                return False
        except OperationalError as e:
            db.rollback()
            logger.error(
                "Database operational error updating solution",
                incident_number=incident_number,
                error_detail=str(e),
            )
            return False
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(
                "SQLAlchemy error updating solution",
                incident_number=incident_number,
                error_type=type(e).__name__,
                error_detail=str(e),
            )
            return False
        except Exception as e:  # noqa: BLE001
            db.rollback()
            logger.error(
                "Unexpected error updating incident",
                incident_number=incident_number,
                error_type=type(e).__name__,
                error_detail=str(e),
            )
            return False


class DeviceWriter:
    """Write device data to database."""
    
    @staticmethod
    def push_device(
        db: Session,
        device_name: str,
        device_type: str,
        intune_device_id: Optional[str] = None,
        servicenow_cmdb_id: Optional[str] = None,
        os_version: Optional[str] = None,
        serial_number: Optional[str] = None,
        is_compliant: bool = False,
        is_managed: bool = False,
    ) -> bool:
        """Push device to database with comprehensive error handling."""
        try:
            device = Device(
                device_name=device_name,
                device_type=device_type,
                intune_device_id=intune_device_id,
                servicenow_cmdb_id=servicenow_cmdb_id,
                os_version=os_version,
                serial_number=serial_number,
                is_compliant=is_compliant,
                is_managed=is_managed,
            )
            db.add(device)
            db.commit()
            logger.info("Device pushed to DB", device_name=device_name)
            return True
        except IntegrityError as e:
            db.rollback()
            logger.warning(
                "Device already exists or constraint violation",
                device_name=device_name,
                error_detail=str(e.orig) if hasattr(e, 'orig') else str(e),
            )
            return False
        except OperationalError as e:
            db.rollback()
            logger.error(
                "Database operational error",
                device_name=device_name,
                error_detail=str(e),
            )
            return False
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(
                "SQLAlchemy error pushing device",
                device_name=device_name,
                error_type=type(e).__name__,
                error_detail=str(e),
            )
            return False
        except Exception as e:  # noqa: BLE001
            db.rollback()
            logger.error(
                "Unexpected error pushing device",
                device_name=device_name,
                error_type=type(e).__name__,
                error_detail=str(e),
            )
            return False
    
    @staticmethod
    def update_device_health(
        db: Session,
        device_name: str,
        health_status: str,
    ) -> bool:
        """Update device health status with comprehensive error handling."""
        try:
            device = db.query(Device).filter_by(device_name=device_name).first()
            if device:
                device.last_health_status = health_status
                device.updated_at = datetime.utcnow()
                db.commit()
                logger.info("Device health updated", device_name=device_name, status=health_status)
                return True
            else:
                logger.warning("Device not found for health update", device_name=device_name)
                return False
        except OperationalError as e:
            db.rollback()
            logger.error(
                "Database operational error updating health",
                device_name=device_name,
                error_detail=str(e),
            )
            return False
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(
                "SQLAlchemy error updating device health",
                device_name=device_name,
                error_type=type(e).__name__,
                error_detail=str(e),
            )
            return False
        except Exception as e:  # noqa: BLE001
            db.rollback()
            logger.error(
                "Unexpected error updating device health",
                device_name=device_name,
                error_type=type(e).__name__,
                error_detail=str(e),
            )
            return False


class KnowledgeArticleWriter:
    """Write knowledge articles to database."""
    
    @staticmethod
    def push_article(
        db: Session,
        article_number: str,
        title: str,
        content: str,
        servicenow_sys_id: str,
        category: Optional[str] = None,
        keywords: Optional[str] = None,
        embedding: Optional[str] = None,
    ) -> bool:
        """Push knowledge article to database."""
        try:
            article = KnowledgeArticle(
                article_number=article_number,
                title=title,
                content=content,
                servicenow_sys_id=servicenow_sys_id,
                category=category,
                keywords=keywords,
                embedding=embedding,
            )
            db.add(article)
            db.commit()
            logger.info("Knowledge article pushed to DB", article_number=article_number)
            return True
        except IntegrityError as e:
            db.rollback()
            logger.warning("Article already exists", article_number=article_number, error=str(e))
            return False
        except Exception as e:
            db.rollback()
            logger.error("Error pushing article", article_number=article_number, error=str(e))
            return False
    
    @staticmethod
    def update_article_embedding(
        db: Session,
        article_number: str,
        embedding: str,
    ) -> bool:
        """Update article with embedding vector."""
        try:
            article = db.query(KnowledgeArticle).filter_by(article_number=article_number).first()
            if article:
                article.embedding = embedding
                article.updated_at = datetime.utcnow()
                db.commit()
                logger.info("Article embedding updated", article_number=article_number)
                return True
            else:
                logger.warning("Article not found for update", article_number=article_number)
                return False
        except Exception as e:
            db.rollback()
            logger.error("Error updating article embedding", article_number=article_number, error=str(e))
            return False


class SyncHistoryWriter:
    """Write sync history to database."""
    
    @staticmethod
    def push_sync_record(
        db: Session,
        source: str,
        sync_status: str,
        record_count: int = 0,
        error_message: Optional[str] = None,
    ) -> bool:
        """Push sync record to database."""
        try:
            sync_record = SyncHistory(
                source=source,
                sync_status=sync_status,
                record_count=record_count,
                error_message=error_message,
            )
            db.add(sync_record)
            db.commit()
            logger.info("Sync record pushed to DB", source=source, status=sync_status, count=record_count)
            return True
        except Exception as e:
            db.rollback()
            logger.error("Error pushing sync record", source=source, error=str(e))
            return False


class RemoteActionWriter:
    """Write remote action data to database."""
    
    @staticmethod
    def push_action(
        db: Session,
        action_id: str,
        action_name: str,
        status: str,
        device_name: Optional[str] = None,
        incident_number: Optional[str] = None,
        action_type: Optional[str] = None,
        execution_result: Optional[str] = None,
    ) -> bool:
        """Push remote action to database."""
        try:
            action = RemoteAction(
                action_id=action_id,
                action_name=action_name,
                status=status,
                device_name=device_name,
                incident_number=incident_number,
                action_type=action_type,
                execution_result=execution_result,
            )
            db.add(action)
            db.commit()
            logger.info("Remote action pushed to DB", action_id=action_id, status=status)
            return True
        except IntegrityError as e:
            db.rollback()
            logger.warning("Action already exists", action_id=action_id, error=str(e))
            return False
        except Exception as e:
            db.rollback()
            logger.error("Error pushing action", action_id=action_id, error=str(e))
            return False
    
    @staticmethod
    def update_action_status(
        db: Session,
        action_id: str,
        status: str,
        execution_result: Optional[str] = None,
    ) -> bool:
        """Update action status and result."""
        try:
            action = db.query(RemoteAction).filter_by(action_id=action_id).first()
            if action:
                action.status = status
                if execution_result:
                    action.execution_result = execution_result
                if status == "completed":
                    action.executed_at = datetime.utcnow()
                action.updated_at = datetime.utcnow()
                db.commit()
                logger.info("Action status updated", action_id=action_id, status=status)
                return True
            else:
                logger.warning("Action not found for update", action_id=action_id)
                return False
        except Exception as e:
            db.rollback()
            logger.error("Error updating action status", action_id=action_id, error=str(e))
            return False


class AuditLogWriter:
    """Write audit logs to database with comprehensive error handling."""
    
    @staticmethod
    def log_action(
        db: Session,
        technician_username: str,
        action: str,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        details: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> bool:
        """Log technician action to audit trail with comprehensive error handling."""
        try:
            audit = AuditLog(
                technician_username=technician_username,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                details=details,
                ip_address=ip_address,
            )
            db.add(audit)
            db.commit()
            logger.info(
                "Audit log pushed to DB",
                technician=technician_username,
                action=action,
                resource=resource_id,
            )
            return True
        except IntegrityError as e:
            db.rollback()
            logger.warning(
                "Audit log constraint violation",
                technician=technician_username,
                action=action,
                error_detail=str(e.orig) if hasattr(e, 'orig') else str(e),
            )
            return False
        except OperationalError as e:
            db.rollback()
            logger.error(
                "Database operational error logging action",
                technician=technician_username,
                action=action,
                error_detail=str(e),
            )
            return False
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(
                "SQLAlchemy error logging action",
                technician=technician_username,
                action=action,
                error_type=type(e).__name__,
                error_detail=str(e),
            )
            return False
        except Exception as e:  # noqa: BLE001
            db.rollback()
            logger.error(
                "Unexpected error logging action",
                technician=technician_username,
                action=action,
                error_type=type(e).__name__,
                error_detail=str(e),
            )
            return False
