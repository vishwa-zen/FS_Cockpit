-- ============================================================================
-- FS Cockpit Backend - Database Schema
-- ============================================================================
-- This file documents the complete database schema.
-- Tables are auto-created by SQLAlchemy ORM on app startup.
-- This file serves as reference and backup.
-- ============================================================================

-- ============================================================================
-- TABLE: incidents
-- Purpose: Cache ServiceNow incidents with solution tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS incidents (
    id VARCHAR(36) PRIMARY KEY,
    incident_number VARCHAR(50) NOT NULL UNIQUE,
    short_description VARCHAR(500) NOT NULL,
    description TEXT,
    device_name VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'new',
    priority INTEGER NOT NULL DEFAULT 3,
    servicenow_sys_id VARCHAR(100) NOT NULL UNIQUE,
    solution_generated BOOLEAN DEFAULT FALSE,
    solution_source VARCHAR(50),
    kb_article_used VARCHAR(36),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_sync_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_incident_device_status ON incidents(device_name, status);
CREATE INDEX IF NOT EXISTS idx_incident_number ON incidents(incident_number);
CREATE INDEX IF NOT EXISTS idx_incident_created ON incidents(created_at);


-- ============================================================================
-- TABLE: devices
-- Purpose: Device information from Intune/CMDB (no user assignment names)
-- ============================================================================
CREATE TABLE IF NOT EXISTS devices (
    id VARCHAR(36) PRIMARY KEY,
    device_name VARCHAR(255) NOT NULL UNIQUE,
    device_type VARCHAR(100) NOT NULL,
    os_version VARCHAR(100),
    serial_number VARCHAR(255),
    intune_device_id VARCHAR(100) UNIQUE,
    servicenow_cmdb_id VARCHAR(100) UNIQUE,
    is_compliant BOOLEAN DEFAULT FALSE,
    is_managed BOOLEAN DEFAULT FALSE,
    last_health_status VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_intune_sync TIMESTAMP,
    last_servicenow_sync TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_device_type ON devices(device_type);
CREATE INDEX IF NOT EXISTS idx_device_name ON devices(device_name);
CREATE INDEX IF NOT EXISTS idx_device_intune_id ON devices(intune_device_id);
CREATE INDEX IF NOT EXISTS idx_device_created ON devices(created_at);


-- ============================================================================
-- TABLE: knowledge_articles
-- Purpose: ServiceNow KB articles with embeddings for RAG/semantic search
-- ============================================================================
CREATE TABLE IF NOT EXISTS knowledge_articles (
    id VARCHAR(36) PRIMARY KEY,
    article_number VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100),
    keywords VARCHAR(500),
    servicenow_sys_id VARCHAR(100) NOT NULL UNIQUE,
    view_count INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT TRUE,
    embedding TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_sync_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_article_number ON knowledge_articles(article_number);
CREATE INDEX IF NOT EXISTS idx_article_category ON knowledge_articles(category);
CREATE INDEX IF NOT EXISTS idx_article_published ON knowledge_articles(is_published);
CREATE INDEX IF NOT EXISTS idx_article_created ON knowledge_articles(created_at);


-- ============================================================================
-- TABLE: sync_history
-- Purpose: Track sync freshness from ServiceNow, Intune, Nextthink
-- ============================================================================
CREATE TABLE IF NOT EXISTS sync_history (
    id VARCHAR(36) PRIMARY KEY,
    source VARCHAR(50) NOT NULL,
    sync_status VARCHAR(50) NOT NULL,
    record_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sync_source ON sync_history(source);
CREATE INDEX IF NOT EXISTS idx_sync_status ON sync_history(sync_status);
CREATE INDEX IF NOT EXISTS idx_sync_created ON sync_history(created_at);
CREATE INDEX IF NOT EXISTS idx_sync_source_created ON sync_history(source, created_at);


-- ============================================================================
-- TABLE: remote_actions
-- Purpose: NextThink remote actions executed on devices
-- ============================================================================
CREATE TABLE IF NOT EXISTS remote_actions (
    id VARCHAR(36) PRIMARY KEY,
    action_id VARCHAR(100) NOT NULL UNIQUE,
    action_name VARCHAR(255) NOT NULL,
    action_type VARCHAR(100),
    device_name VARCHAR(255),
    incident_number VARCHAR(50),
    status VARCHAR(50) NOT NULL,
    execution_result TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    executed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_action_id ON remote_actions(action_id);
CREATE INDEX IF NOT EXISTS idx_action_status ON remote_actions(status);
CREATE INDEX IF NOT EXISTS idx_action_device ON remote_actions(device_name);
CREATE INDEX IF NOT EXISTS idx_action_incident ON remote_actions(incident_number);
CREATE INDEX IF NOT EXISTS idx_action_created ON remote_actions(created_at);


-- ============================================================================
-- TABLE: audit_logs
-- Purpose: Technician action trail (WHO, WHAT, WHERE, WHEN)
-- Privacy: No client PII - only technician username, no emails/phone
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    technician_username VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(100),
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_technician ON audit_logs(technician_username);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_tech_created ON audit_logs(technician_username, created_at);


-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. AUTOMATIC CREATION
--    - Tables are auto-created by SQLAlchemy ORM on app startup
--    - No manual execution of this file is required
--    - This file serves as schema reference and documentation
--
-- 2. DATA FLOW (Write-Only, No Retrieval Yet)
--    - ServiceNow → incidents table
--    - Intune → devices table
--    - ServiceNow KB → knowledge_articles table
--    - External systems → sync_history table
--    - Nextthink → remote_actions table
--    - All operations → audit_logs table
--
-- 3. PRIVACY
--    - No caller names, emails, or user IDs stored
--    - No device owner information stored
--    - Only technician_username (no email/phone) in audit_logs
--    - Suitable for GDPR/CCPA compliance
--
-- 4. FUTURE USE
--    - Embeddings column ready for RAG/semantic search
--    - All tables include created_at/updated_at for audit trail
--    - Prepared for Agentic AI consumption
--
-- 5. PERFORMANCE
--    - Composite indexes on frequently queried columns
--    - All foreign key columns indexed
--    - Prepared for query optimization
-- ============================================================================
