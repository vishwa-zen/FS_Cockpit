/**
 * @fileoverview API Request/Response Type Definitions
 *
 * Centralized type definitions for API requests, responses,
 * and data transfer objects used across the application.
 *
 * @module types/api
 */

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = unknown> {
  /** Response success status */
  success: boolean;
  /** Response data */
  data: T;
  /** Error message (if success is false) */
  error?: string;
  /** Additional metadata */
  meta?: Record<string, unknown>;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  /** Current page number */
  page: number;
  /** Items per page */
  pageSize: number;
  /** Total number of items */
  total: number;
  /** Total number of pages */
  totalPages: number;
}

/**
 * Search type options
 */
export type SearchType = "User" | "Device" | "Ticket";

/**
 * Service health status
 */
export interface ServiceHealth {
  /** Service name */
  service: string;
  /** Health status */
  status: "healthy" | "unhealthy";
  /** Success flag */
  success: boolean;
  /** Additional details */
  details?: string;
}

/**
 * Health metrics for a service
 */
export interface HealthMetrics {
  /** Uptime percentage */
  uptime_percentage: number;
  /** Downtime percentage */
  downtime_percentage: number;
  /** Total checks performed */
  total_checks: number;
  /** Total downtime in minutes */
  total_downtime_minutes: number;
}

/**
 * All services health metrics
 */
export interface AllServicesHealthMetrics {
  services: {
    servicenow: HealthMetrics;
    intune: HealthMetrics;
    nextthink: HealthMetrics;
  };
  period_hours: number;
}

/**
 * Remote action recommendation
 */
export interface RemoteActionRecommendation {
  /** Action name/identifier */
  actionName: string;
  /** Action result details */
  result: {
    /** Confidence score */
    confidence: number;
    /** Action description */
    description: string;
    /** Expected impact */
    impact: string;
    /** Execution purpose */
    purpose: string;
  };
}

/**
 * AI diagnostic summary
 */
export interface DiagnosticSummary {
  /** Confidence score percentage */
  confidence: string;
  /** Summary points/findings */
  summary_points: string[];
  /** Root cause analysis */
  root_cause?: string;
  /** Recommended next steps */
  next_steps?: string[];
}

/**
 * Intune device details
 */
export interface IntuneDevice {
  /** Device ID */
  id: string;
  /** Device name */
  deviceName: string;
  /** User display name */
  userDisplayName: string;
  /** User email */
  userPrincipalName: string;
  /** Operating system */
  operatingSystem: string;
  /** OS version */
  osVersion: string;
  /** Compliance state */
  complianceState: string;
  /** Last sync date */
  lastSyncDateTime: string;
  /** Serial number */
  serialNumber: string;
  /** Device owner type */
  managedDeviceOwnerType: string;
  /** Enrollment date */
  enrolledDateTime?: string;
  /** Additional properties */
  [key: string]: unknown;
}

/**
 * ServiceNow device
 */
export interface ServiceNowDevice {
  /** Device name */
  name: string;
  /** Device serial number */
  serial_number: string;
  /** Asset tag */
  asset_tag?: string;
  /** Model category */
  model_category?: string;
}

/**
 * Knowledge article from ServiceNow
 */
export interface KnowledgeArticle {
  /** Article number */
  number: string;
  /** Article title */
  short_description: string;
  /** Article text content */
  text: string;
  /** Workflow state */
  workflow_state: string;
  /** Additional properties */
  [key: string]: unknown;
}
