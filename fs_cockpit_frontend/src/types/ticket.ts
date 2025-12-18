/**
 * @fileoverview Ticket and Incident Type Definitions
 *
 * Centralized type definitions for tickets, incidents, and related entities.
 * Used throughout the application for type safety and consistency.
 *
 * @module types/ticket
 */

/**
 * Activity item representing a single event in the activity log
 */
export interface ActivityItem {
  /** User who performed the activity */
  user: string;
  /** Timestamp or relative time string */
  timestamp: string;
  /** Activity message/description */
  message: string;
}

/**
 * Knowledge base article item
 */
export interface KnowledgeItem {
  /** Article title */
  title: string;
  /** Confidence score percentage */
  confidence: string;
  /** Article description/summary */
  description: string;
}

/**
 * Recommended action item for remote execution
 */
export interface ActionItem {
  /** Action title/name */
  title: string;
  /** Priority level (High, Medium, Low) */
  priority: string;
  /** Action description */
  description: string;
  /** Estimated duration */
  duration: string;
  /** Confidence score */
  confidence: string;
}

/**
 * Ticket/Incident priority levels
 */
export type TicketPriority = "High" | "Medium" | "Low" | "Critical";

/**
 * Ticket/Incident status values
 */
export type TicketStatus =
  | "Open"
  | "In Progress"
  | "Pending"
  | "Resolved"
  | "Closed";

/**
 * Base ticket/incident structure
 */
export interface Ticket {
  /** Unique incident number (e.g., INC0010001) */
  id: string;
  /** Incident number (same as id for display) */
  number?: string;
  /** Incident title/short description */
  title: string;
  /** Detailed description */
  description?: string;
  /** Priority level */
  priority: TicketPriority;
  /** Current status */
  status: TicketStatus;
  /** Assigned to user */
  assignedTo?: string;
  /** Caller/reporter name */
  caller?: string;
  /** Associated device name */
  device?: string;
  /** Creation timestamp */
  createdAt?: string;
  /** Last updated timestamp */
  updatedAt?: string;
  /** Category/type */
  category?: string;
  /** Subcategory */
  subcategory?: string;
}
