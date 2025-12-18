/**
 * @fileoverview API Configuration Constants
 *
 * Centralized API endpoint and configuration constants.
 * Use these instead of hardcoded values for consistency.
 *
 * @module constants/api
 * @example
 * import { API_CONFIG, API_ENDPOINTS } from '@/constants';
 */

/**
 * API configuration settings
 */
export const API_CONFIG = {
  /** Base API URL from environment or default */
  BASE_URL:
    import.meta.env.VITE_API_BASE_URL ||
    process.env.VITE_API_BASE_URL ||
    "http://127.0.0.1:8000/api/v1",
  /** Request timeout in milliseconds */
  TIMEOUT: 30000,
  /** Default items per page for pagination */
  DEFAULT_PAGE_SIZE: 20,
  /** Default number of knowledge articles to fetch */
  DEFAULT_KNOWLEDGE_LIMIT: 3,
  /** Default number of remote actions to fetch */
  DEFAULT_ACTIONS_LIMIT: 3,
} as const;

/**
 * API endpoint paths (relative to BASE_URL)
 */
export const API_ENDPOINTS = {
  // ServiceNow Endpoints
  SERVICENOW: {
    /** Get incidents by username */
    USER_INCIDENTS: (userName: string) =>
      `/servicenow/user/${userName}/incidents`,
    /** Get incidents by device name */
    DEVICE_INCIDENTS: (deviceName: string) =>
      `/servicenow/device/${deviceName}/incidents`,
    /** Get specific incident details */
    INCIDENT_DETAILS: (incidentNumber: string) =>
      `/servicenow/incident/${incidentNumber}/details`,
    /** Get technician's assigned incidents */
    TECHNICIAN_INCIDENTS: (technicianId: string) =>
      `/servicenow/technician/${technicianId}/incidents`,
    /** Get user's devices */
    USER_DEVICES: (callerId: string) => `/servicenow/user/${callerId}/devices`,
    /** Get knowledge articles for incident */
    KNOWLEDGE_ARTICLES: (incidentNumber: string, limit?: number) =>
      `/servicenow/incident/${incidentNumber}/knowledge${
        limit ? `?limit=${limit}` : ""
      }`,
    /** Get AI solution summary for incident */
    SOLUTION_SUMMARY: (incidentNumber: string, limit?: number) =>
      `/servicenow/incident/${incidentNumber}/solution_summary${
        limit ? `?limit=${limit}` : ""
      }`,
    /** ServiceNow health check */
    HEALTH: "/servicenow/health",
  },

  // Intune Endpoints
  INTUNE: {
    /** Get device details by name */
    DEVICE_BY_NAME: (deviceName: string) =>
      `/intune/devices/name/${deviceName}`,
    /** Intune health check */
    HEALTH: "/intune/health",
  },

  // NextThink Endpoints
  NEXTTHINK: {
    /** Get remote action recommendations */
    RECOMMENDATIONS: "/nextthink/recommendations",
    /** Get device diagnostics */
    DIAGNOSTICS: "/nextthink/diagnostics",
    /** NextThink health check */
    HEALTH: "/nextthink/health",
  },

  // Health & Metrics
  HEALTH: {
    /** ServiceNow health check */
    SERVICENOW: "/servicenow/health",
    /** Intune health check */
    INTUNE: "/intune/health",
    /** NextThink health check */
    NEXTTHINK: "/nextthink/health",
    /** Get health metrics for all services */
    METRICS: (hours?: number) =>
      `/health/metrics${hours ? `?hours=${hours}` : ""}`,
  },
} as const;

/**
 * HTTP status codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Storage keys for localStorage/sessionStorage
 */
export const STORAGE_KEYS = {
  /** MSAL authentication token */
  MSAL_TOKEN: "msal.token",
  /** MSAL account information */
  MSAL_ACCOUNT: "msal.account",
  /** Demo mode flag */
  DEMO_MODE: "demo.mode",
  /** Demo user data */
  DEMO_USER: "demo.user",
} as const;
