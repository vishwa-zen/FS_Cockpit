/**
 * @fileoverview Status and Priority Constants
 *
 * Centralized definitions for ticket statuses, priorities,
 * and their associated styling/display values.
 *
 * @module constants/statuses
 * @example
 * import { PRIORITY, STATUS, getPriorityColor } from '@/constants';
 */

/**
 * Ticket priority levels
 */
export const PRIORITY = {
  CRITICAL: "Critical",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
} as const;

/**
 * Priority numeric mappings from ServiceNow
 */
export const PRIORITY_NUMERIC = {
  1: PRIORITY.HIGH,
  2: PRIORITY.MEDIUM,
  3: PRIORITY.LOW,
} as const;

/**
 * Ticket status values
 */
export const STATUS = {
  NEW: "New",
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  PENDING: "Pending",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
} as const;

/**
 * Priority color mappings (Tailwind CSS classes)
 */
export const PRIORITY_COLORS = {
  [PRIORITY.CRITICAL]:
    "bg-priority-high text-priority-high-text border-transparent",
  [PRIORITY.HIGH]:
    "bg-priority-high text-priority-high-text border-transparent",
  [PRIORITY.MEDIUM]:
    "bg-priority-medium text-priority-medium-text border-transparent",
  [PRIORITY.LOW]: "bg-priority-low text-priority-low-text border-transparent",
} as const;

/**
 * Status color mappings (Tailwind CSS classes)
 */
export const STATUS_COLORS = {
  [STATUS.NEW]: "bg-badge-blue text-badge-blue-text border-transparent",
  [STATUS.OPEN]: "bg-badge-blue text-badge-blue-text border-transparent",
  [STATUS.IN_PROGRESS]:
    "bg-badge-yellow text-badge-yellow-text border-transparent",
  [STATUS.PENDING]: "bg-badge-yellow text-badge-yellow-text border-transparent",
  [STATUS.RESOLVED]: "bg-badge-green text-badge-green-text border-transparent",
  [STATUS.CLOSED]: "bg-badge-gray text-badge-gray-text border-transparent",
  [STATUS.CANCELLED]: "bg-badge-gray text-badge-gray-text border-transparent",
} as const;

/**
 * Get Tailwind CSS classes for priority badge
 * @param priority - Priority level or numeric value
 * @returns Tailwind CSS classes for styling
 */
export const getPriorityColor = (priority: string | number): string => {
  if (typeof priority === "number") {
    const mappedPriority =
      PRIORITY_NUMERIC[priority as keyof typeof PRIORITY_NUMERIC];
    return PRIORITY_COLORS[mappedPriority] || PRIORITY_COLORS[PRIORITY.MEDIUM];
  }

  const upperPriority = priority.toUpperCase();
  if (upperPriority === "CRITICAL") {
    return PRIORITY_COLORS[PRIORITY.CRITICAL];
  }

  const priorityKey = Object.values(PRIORITY).find(
    (p) => p.toUpperCase() === upperPriority
  );
  return priorityKey
    ? PRIORITY_COLORS[priorityKey]
    : PRIORITY_COLORS[PRIORITY.MEDIUM];
};

/**
 * Get Tailwind CSS classes for status badge
 * @param status - Status value
 * @returns Tailwind CSS classes for styling
 */
export const getStatusColor = (status: string): string => {
  const upperStatus = status.toUpperCase().replace(/_/g, " ");
  const statusKey = Object.values(STATUS).find(
    (s) => s.toUpperCase() === upperStatus
  );
  return statusKey ? STATUS_COLORS[statusKey] : STATUS_COLORS[STATUS.OPEN];
};

/**
 * Health status values
 */
export const HEALTH_STATUS = {
  HEALTHY: "healthy",
  WARNING: "warning",
  CRITICAL: "critical",
  UNHEALTHY: "unhealthy",
} as const;

/**
 * Compliance state values
 */
export const COMPLIANCE_STATE = {
  COMPLIANT: "compliant",
  NON_COMPLIANT: "noncompliant",
  IN_GRACE_PERIOD: "inGracePeriod",
  CONFIG_MANAGER: "configManager",
  UNKNOWN: "unknown",
} as const;
