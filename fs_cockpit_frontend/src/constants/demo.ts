/**
 * @fileoverview Demo and Fallback Data Constants
 *
 * Centralized demo/fallback values used across the application
 * for offline mode, testing, and placeholder data.
 *
 * @module constants/demo
 * @example
 * import { DEMO_USER, DEMO_CREDENTIALS } from '@constants/demo';
 */

/**
 * Demo user credentials for fallback authentication
 */
export const DEMO_CREDENTIALS = {
  /** Demo user email address */
  EMAIL: "testadmin@ntt.com",
  /** Demo user display name */
  NAME: "Test Admin",
  /** Demo username (same as email prefix) */
  USERNAME: "testadmin",
} as const;

/**
 * Demo user object for fallback display
 */
export const DEMO_USER = {
  email: DEMO_CREDENTIALS.EMAIL,
  name: DEMO_CREDENTIALS.NAME,
  username: DEMO_CREDENTIALS.USERNAME,
} as const;

/**
 * Service health indicator colors
 */
export const HEALTH_COLORS = {
  /** Healthy/operational service color */
  HEALTHY: "bg-status-success",
  /** Unhealthy/down service color */
  UNHEALTHY: "bg-status-error",
  /** Degraded/warning service color */
  DEGRADED: "bg-status-warning",
} as const;

/**
 * Demo service status configurations
 */
export const DEMO_SERVICES = {
  SERVICENOW: {
    name: "ServiceNow",
    status: "operational" as const,
    color: HEALTH_COLORS.HEALTHY,
  },
  TACHYON: {
    name: "Tachyon",
    status: "operational" as const,
    color: HEALTH_COLORS.HEALTHY,
  },
  NEXTHINK: {
    name: "Nexthink",
    status: "degraded" as const,
    color: HEALTH_COLORS.DEGRADED,
  },
} as const;
