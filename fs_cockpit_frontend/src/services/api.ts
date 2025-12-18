import axios from "axios";
import { API_ENDPOINTS } from "@constants/api";
import { PRIORITY, STATUS } from "@constants/statuses";
import { DEMO_SERVICES, HEALTH_COLORS } from "@constants/demo";
import { DEFAULT_TECHNICIAN_ID } from "@constants/ui";

/**
 * API Service Module
 *
 * Provides centralized HTTP client configuration and API methods for:
 * - Incident/Ticket management
 * - Device information retrieval
 * - Knowledge base articles
 * - Diagnostics and system status
 *
 * Features:
 * - Automatic authentication token injection
 * - Request/response interceptors
 * - Graceful error handling with user-friendly messages
 * - Production-grade logging
 */

// Environment variables - using process.env instead of import.meta
// Prefer Vite's import.meta.env at runtime; fall back to process.env for Node/SSR or a sane default
declare const process: {
  env: {
    VITE_API_BASE_URL?: string;
  };
};

/**
 * Environment-aware logger utility
 * Only logs in development mode to prevent console pollution in production
 */
const logger = {
  debug: (_message: string, ..._args: any[]) => {
    // Disabled in production
  },
  info: (_message: string, ..._args: any[]) => {
    // Disabled in production
  },
  warn: (_message: string, ..._args: any[]) => {
    // Disabled
  },
  error: (_message: string, _error?: any) => {
    // Disabled - errors handled by callers
  },
};

// Prefer import.meta.env for Vite, fallback to process.env, then default to localhost:8000
const API_BASE_URL =
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env?.VITE_API_BASE_URL) ||
  (typeof process !== "undefined" && process.env?.VITE_API_BASE_URL) ||
  "http://127.0.0.1:8000/api/v1";

// Log the computed base URL for debugging in development only
logger.debug("API Base URL initialized", { baseURL: API_BASE_URL });

/**
 * Axios HTTP client instance
 *
 * Configuration:
 * - Base URL from environment variables
 * - JSON content type headers
 * - 30 second timeout for requests
 * - Automatic bearer token injection
 * - Response error handling with auth redirect
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

/**
 * Request Interceptor
 *
 * Automatically injects authentication bearer token from localStorage
 * into all outgoing requests if available.
 */
apiClient.interceptors.request.use(
  (config) => {
    const idToken = localStorage.getItem("msal.idToken");
    if (idToken) {
      config.headers.Authorization = `Bearer ${idToken}`;
      logger.debug("Request with ID token", {
        url: config.url,
        method: config.method,
        tokenPrefix: idToken.substring(0, 20) + "...",
      });
    } else {
      logger.warn("No ID token found for request", {
        url: config.url,
        method: config.method,
      });
    }
    return config;
  },
  (error) => {
    logger.error("Request interceptor error", error);
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 *
 * Handles global error scenarios:
 * - 401 Unauthorized: Clears auth data and redirects to login
 * - Other errors: Passes through for handling by API methods
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      logger.error("❌ 401 UNAUTHORIZED - Token rejected by backend", {
        url: error.config?.url,
        method: error.config?.method,
        hasAuthHeader: !!error.config?.headers?.Authorization,
        tokenPrefix:
          error.config?.headers?.Authorization?.substring(0, 30) + "...",
        currentPath:
          typeof window !== "undefined" ? window.location.pathname : "unknown",
      });

      // Check if we just logged in (within last 2 seconds)
      const lastLoginTime = sessionStorage.getItem("last_login_time");
      const now = Date.now();

      if (lastLoginTime && now - parseInt(lastLoginTime) < 2000) {
        logger.warn(
          "⚠️ 401 occurred right after login - token may be invalid format"
        );
      }

      // Only redirect if not already on login page to prevent refresh loop
      if (
        typeof window !== "undefined" &&
        window.location.pathname !== "/login"
      ) {
        logger.error("🔄 Clearing session and redirecting to login in 500ms");

        // Use a longer delay to allow debugging and prevent immediate redirect after login
        setTimeout(() => {
          localStorage.clear();
          sessionStorage.clear();
          window.location.href = "/login";
        }, 500);
      } else if (typeof window !== "undefined") {
        // Already on login page - just clear storage, don't redirect
        logger.warn("Already on login page - clearing storage only");
        localStorage.clear();
        sessionStorage.clear();
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Type Definitions for API Responses
 */

/**
 * Incident data structure from ServiceNow API
 *
 * Represents a single incident/ticket with all relevant details
 * including assignee, status, priority, and timestamps.
 *
 * @interface Incident
 * @property {string} sysId - Unique system identifier
 * @property {string} incidentNumber - Incident number (e.g., INC0012345)
 * @property {string} shortDescription - Brief description of the issue
 * @property {string} priority - Priority level (1=High, 2=Medium, 3=Low)
 * @property {number} impact - Impact level numeric value
 * @property {string} status - Current incident status (New, In Progress, Resolved, etc.)
 * @property {boolean} active - Whether incident is currently active
 * @property {string} assignedTo - Technician assigned to incident
 * @property {string} deviceName - Device associated with incident
 * @property {string} createdBy - User who created the incident
 * @property {string | null} callerId - Caller's user ID
 * @property {string | null} callerName - Caller's display name
 * @property {string} openedAt - ISO 8601 timestamp when opened
 * @property {string} lastUpdatedAt - ISO 8601 timestamp of last update
 */
export interface Incident {
  sysId: string;
  incidentNumber: string;
  shortDescription: string;
  priority: string;
  impact: number;
  status: string;
  active: boolean;
  assignedTo: string;
  deviceName: string;
  createdBy: string;
  callerId: string | null;
  callerName: string | null;
  openedAt: string;
  lastUpdatedAt: string;
}

/**
 * Standard API response wrapper
 *
 * All API endpoints return data in this consistent format
 * with success indicator, message, data payload, and request metadata.
 *
 * @template T - The type of data contained in the response
 */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
  request_id: string;
}

/**
 * Pagination metadata for API responses
 */
export interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

/**
 * Collection wrapper for incidents
 */
export interface IncidentsData {
  incidents: Incident[];
  pagination?: PaginationInfo;
}

/**
 * Map numeric priority codes to text labels
 *
 * ServiceNow API returns numeric priorities that need conversion:
 * - 1 → "High"
 * - 2 → "Medium"
 * - 3 → "Low"
 * - "Critical" → "High" (legacy compatibility)
 *
 * @param {string | number} priority - Numeric or text priority from API
 * @returns {string} Text priority label for UI display
 *
 * @example
 * mapPriorityToText(1) // Returns "High"
 * mapPriorityToText("2") // Returns "Medium"
 * mapPriorityToText("Critical") // Returns "High"
 */
export const mapPriorityToText = (priority: string | number): string => {
  const priorityStr = String(priority).trim();

  // Map numeric priorities from API
  if (priorityStr === "1") return PRIORITY.HIGH;
  if (priorityStr === "2") return PRIORITY.MEDIUM;
  if (priorityStr === "3") return PRIORITY.LOW;

  // Handle any "Critical" text that might come from API or cache - map to High
  if (priorityStr.toLowerCase().includes("critical")) return PRIORITY.HIGH;

  // Return as-is if already text
  return priorityStr;
};

/**
 * Get Tailwind CSS classes for priority badge styling
 *
 * Maps priority levels to color-coded badge classes:
 * - High: Red background (#ffe2e2) with dark red text (#c10007)
 * - Medium: Yellow background (#fef9c2) with brown text (#a65f00)
 * - Low: Orange background (#fff4e6) with dark orange text (#d97706)
 * - Default: Blue background for unknown priorities
 *
 * @param {string | number} priority - Priority value from API
 * @returns {string} Tailwind CSS class string for badge styling
 *
 * @example
 * getPriorityColor("High") // Returns "bg-[#ffe2e2] text-[#c10007] border-[#ffc9c9]"
 * getPriorityColor(1) // Returns "bg-[#ffe2e2] text-[#c10007] border-[#ffc9c9]"
 */
export const getPriorityColor = (priority: string | number): string => {
  const priorityText = mapPriorityToText(priority);

  if (priorityText.toLowerCase().includes("high")) {
    return "bg-priority-high text-priority-high-text border-transparent";
  } else if (priorityText.toLowerCase().includes("medium")) {
    return "bg-priority-medium text-priority-medium-text border-transparent";
  } else if (priorityText.toLowerCase().includes("low")) {
    return "bg-priority-low text-priority-low-text border-transparent";
  }
  return "bg-badge-blue text-badge-blue-text border-transparent";
};

/**
 * Get Tailwind CSS classes for status badge styling
 *
 * Maps incident statuses to color-coded badge classes:
 * - "In Progress": Orange background with dark orange text
 * - "New"/"Open": Blue background with dark blue text
 * - "Resolved"/"Closed": Green background with dark green text
 * - Default: Gray background for unknown statuses
 *
 * @param {string} status - Incident status from API
 * @returns {string} Tailwind CSS class string for badge styling
 *
 * @example
 * getStatusColor("In Progress") // Returns "bg-[#ffedd4] text-[#c93400] border-transparent"
 * getStatusColor("Resolved") // Returns "bg-[#d1fae5] text-[#065f46] border-transparent"
 */
export const getStatusColor = (status: string): string => {
  if (status === STATUS.IN_PROGRESS) {
    return "bg-badge-yellow text-badge-yellow-text border-transparent";
  } else if (status === STATUS.NEW || status === STATUS.OPEN) {
    return "bg-badge-blue text-badge-blue-text border-transparent";
  } else if (status === STATUS.RESOLVED || status === STATUS.CLOSED) {
    return "bg-badge-green text-badge-green-text border-transparent";
  }
  return "bg-badge-gray text-badge-gray-text border-transparent";
};

/**
 * Convert ISO 8601 timestamp to human-readable relative time
 *
 * Calculates time difference between now and provided date,
 * returning the most appropriate time unit:
 * - Minutes (< 60 minutes)
 * - Hours (< 24 hours)
 * - Days (< 7 days)
 * - Weeks (< 4 weeks)
 * - Months (>= 4 weeks)
 *
 * @param {string} dateString - ISO 8601 timestamp from API
 * @returns {string} Human-readable relative time string
 *
 * @example
 * getTimeAgo("2024-12-18T10:30:00Z") // Returns "2 hours ago" (if current time is 12:30)
 * getTimeAgo("2024-12-15T10:30:00Z") // Returns "3 days ago"
 */
export const getTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  } else if (diffWeeks < 4) {
    return `${diffWeeks} week${diffWeeks !== 1 ? "s" : ""} ago`;
  } else {
    return `${diffMonths} month${diffMonths !== 1 ? "s" : ""} ago`;
  }
};

/**
 * Tickets API Namespace
 *
 * Provides methods for retrieving and searching incident data from ServiceNow.
 * All methods return transformed data with UI-friendly formats and color codes.
 *
 * Available Methods:
 * - getUserIncidents: Get incidents by username
 * - getIncidentsByDevice: Get incidents by device name
 * - getMyTickets: Get tickets assigned to technician (paginated)
 * - getIncidentByNumber: Get specific incident by ticket number
 * - getIncidentDetails: Get full incident details for ticket view
 * - getTicketById: Get single ticket by ID from cached tickets
 * - searchTickets: Universal search across users, devices, and tickets
 *
 * @namespace ticketsAPI
 */
export const ticketsAPI = {
  /**
   * Get incidents by username
   *
   * Fetches all incidents associated with a specific user from ServiceNow.
   * Transforms raw API data into UI format with color codes and relative timestamps.
   *
   * @async
   * @param {string} userName - Username to search for
   * @returns {Promise<{data: Array, success: boolean, message: string}>} Transformed incidents
   *
   * @example
   * const result = await ticketsAPI.getUserIncidents(\"john.doe\");
   * if (result.success) {
   *   console.log(`Found ${result.data.length} tickets for user`);
   * }
   */
  getUserIncidents: async (userName: string) => {
    try {
      const response = await apiClient.get<ApiResponse<IncidentsData>>(
        API_ENDPOINTS.SERVICENOW.USER_INCIDENTS(encodeURIComponent(userName))
      );
      if (response.data.success) {
        // Transform the data to match our UI format
        const transformedData = response.data.data.incidents.map(
          (incident) => ({
            id: incident.incidentNumber,
            sysId: incident.sysId,
            status: incident.status,
            statusColor: getStatusColor(incident.status),
            title: incident.shortDescription,
            device: incident.deviceName || "Not Available",
            priority: mapPriorityToText(incident.priority),
            priorityColor: getPriorityColor(incident.priority),
            time: getTimeAgo(incident.openedAt),
            assignedTo: incident.assignedTo,
            createdBy: incident.createdBy,
            callerId: incident.callerId,
            callerName: incident.callerName,
            openedAt: incident.openedAt,
            lastUpdatedAt: incident.lastUpdatedAt,
            impact: incident.impact,
            active: incident.active,
          })
        );
        return {
          data: transformedData,
          success: true,
          message: response.data.message,
        };
      }
      throw new Error(
        response.data.message || "Failed to fetch user incidents"
      );
    } catch (error: any) {
      logger.error("Failed to fetch user incidents", error);
      return {
        data: [],
        success: false,
        message: error?.message || "API error",
      };
    }
  },

  /**
   * Get incidents by device name
   *
   * Fetches all incidents associated with a specific device from ServiceNow.
   * Useful for tracking device-specific issues and troubleshooting patterns.
   *
   * @async
   * @param {string} deviceName - Device hostname or computer name to search for
   * @returns {Promise<{data: Array, success: boolean, message: string}>} Transformed incidents array
   *
   * @example
   * const result = await ticketsAPI.getIncidentsByDevice("LAPTOP-ABC123");
   * if (result.success) {
   *   console.log(`Found ${result.data.length} tickets for device`);
   * }
   */
  // Search incidents by device name
  getIncidentsByDevice: async (deviceName: string) => {
    try {
      const response = await apiClient.get<ApiResponse<IncidentsData>>(
        API_ENDPOINTS.SERVICENOW.DEVICE_INCIDENTS(
          encodeURIComponent(deviceName)
        )
      );
      if (response.data.success) {
        // Transform the data to match our UI format
        const transformedData = response.data.data.incidents.map(
          (incident) => ({
            id: incident.incidentNumber,
            sysId: incident.sysId,
            status: incident.status,
            statusColor: getStatusColor(incident.status),
            title: incident.shortDescription,
            device: incident.deviceName || "Not Available",
            priority: mapPriorityToText(incident.priority),
            priorityColor: getPriorityColor(incident.priority),
            time: getTimeAgo(incident.openedAt),
            assignedTo: incident.assignedTo,
            createdBy: incident.createdBy,
            callerId: incident.callerId,
            callerName: incident.callerName,
            openedAt: incident.openedAt,
            lastUpdatedAt: incident.lastUpdatedAt,
            impact: incident.impact,
            active: incident.active,
          })
        );
        return {
          data: transformedData,
          success: true,
          message: response.data.message,
        };
      }
      throw new Error(
        response.data.message || "Failed to fetch device incidents"
      );
    } catch (error: any) {
      logger.error("Failed to fetch device incidents", error);
      return {
        data: [],
        success: false,
        message: error?.message || "API error",
      };
    }
  },

  /**
   * Get tickets assigned to technician (paginated)
   *
   * Fetches incidents assigned to the FS_Cockpit_Integration technician account.
   * Supports pagination with limit and offset parameters for efficient data loading.
   *
   * Features:
   * - Pagination support with customizable limit and offset
   * - Device name validation and logging for missing data
   * - Enhanced error messages for timeout, network, and server errors
   * - Returns pagination metadata (total, limit, offset, has_more)
   *
   * @async
   * @param {number} [limit=25] - Maximum number of tickets to return per page
   * @param {number} [offset=0] - Number of tickets to skip (for pagination)
   * @returns {Promise<{data: Array, pagination: PaginationInfo, success: boolean, message: string}>} Paginated tickets
   *
   * @example
   * // Get first page of 25 tickets
   * const page1 = await ticketsAPI.getMyTickets(25, 0);
   *
   * // Get second page
   * const page2 = await ticketsAPI.getMyTickets(25, 25);
   *
   * // Check if more pages available
   * if (page1.pagination.has_more) {
   *   console.log(`Total tickets: ${page1.pagination.total}`);
   * }
   */
  getMyTickets: async (limit: number = 25, offset: number = 0) => {
    try {
      const response = await apiClient.get<ApiResponse<IncidentsData>>(
        `${API_ENDPOINTS.SERVICENOW.TECHNICIAN_INCIDENTS(
          DEFAULT_TECHNICIAN_ID
        )}?limit=${limit}&offset=${offset}`
      );

      if (response.data.success) {
        // Transform the data to match our UI format
        const transformedData = response.data.data.incidents.map((incident) => {
          // Log incidents with missing device names
          if (!incident.deviceName) {
            logger.warn(
              `[ServiceNow] Incident ${incident.incidentNumber} has no deviceName`,
              {
                incidentNumber: incident.incidentNumber,
                callerId: incident.callerId,
                deviceName: incident.deviceName,
              }
            );
          }
          return {
            id: incident.incidentNumber,
            sysId: incident.sysId,
            status: incident.status,
            statusColor: getStatusColor(incident.status),
            title: incident.shortDescription,
            device: incident.deviceName || "Not Available",
            priority: mapPriorityToText(incident.priority),
            priorityColor: getPriorityColor(incident.priority),
            time: getTimeAgo(incident.openedAt),
            assignedTo: incident.assignedTo,
            createdBy: incident.createdBy,
            callerId: incident.callerId,
            callerName: incident.callerName,
            openedAt: incident.openedAt,
            lastUpdatedAt: incident.lastUpdatedAt,
            impact: incident.impact,
            active: incident.active,
          };
        });

        return {
          data: transformedData,
          pagination: response.data.data.pagination,
          success: true,
          message: response.data.message,
        };
      }

      throw new Error(response.data.message || "Failed to fetch tickets");
    } catch (error: any) {
      logger.error("Failed to fetch tickets", error);

      let errorMessage = "Unable to retrieve tickets";
      if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
        errorMessage = "Request timeout - please try again";
      } else if (error.code === "ERR_NETWORK" || !error.response) {
        errorMessage = "Service temporarily unavailable";
      } else if (error.response?.status >= 500) {
        errorMessage = "Server error - please try again later";
      }

      return {
        data: [],
        success: false,
        message: errorMessage,
      };
    }
  },

  /**
   * Get incident details by incident number
   *
   * Fetches a specific incident using its ticket number (e.g., INC0012345).
   * Used for Ticket search type to retrieve exact match by incident number.
   *
   * @async
   * @param {string} incidentNumber - Ticket number to search for (e.g., "INC0012345")
   * @returns {Promise<{data: Array, success: boolean, message: string}>} Single incident in array format
   *
   * @example
   * const result = await ticketsAPI.getIncidentByNumber("INC0012345");
   * if (result.success && result.data.length > 0) {
   *   console.log(`Found ticket: ${result.data[0].title}`);
   * }
   */
  // Get incident details by incident number
  getIncidentByNumber: async (incidentNumber: string) => {
    try {
      const response = await apiClient.get<ApiResponse<Incident>>(
        API_ENDPOINTS.SERVICENOW.INCIDENT_DETAILS(
          encodeURIComponent(incidentNumber)
        )
      );
      if (response.data.success) {
        // Transform single incident to UI format
        const incident = response.data.data;
        const transformedData = {
          id: incident.incidentNumber,
          sysId: incident.sysId,
          status: incident.status,
          statusColor: getStatusColor(incident.status),
          title: incident.shortDescription,
          device: incident.deviceName || "Not Available",
          priority: mapPriorityToText(incident.priority),
          priorityColor: getPriorityColor(incident.priority),
          time: getTimeAgo(incident.openedAt),
          assignedTo: incident.assignedTo,
          createdBy: incident.createdBy,
          callerId: incident.callerId,
          callerName: incident.callerName,
          openedAt: incident.openedAt,
          lastUpdatedAt: incident.lastUpdatedAt,
          impact: incident.impact,
          active: incident.active,
        };
        return {
          data: [transformedData],
          success: true,
          message: response.data.message,
        };
      }
      throw new Error(
        response.data.message || "Failed to fetch incident details"
      );
    } catch (error: any) {
      logger.error("Failed to fetch incident details", error);
      return {
        data: [],
        success: false,
        message: error?.message || "API error",
      };
    }
  },

  /**
   * Get full incident details for ticket details view
   *
   * Retrieves comprehensive incident information for displaying in the ticket details panel.
   * Returns single incident object (not array) with all metadata and timestamps.
   *
   * Features:
   * - Full incident metadata including status, priority, assignments
   * - Device name logging for debugging missing data
   * - Enhanced error handling with specific messages for 404, timeout, network errors
   * - Returns null data on failure instead of array
   *
   * @async
   * @param {string} incidentNumber - Incident number to retrieve
   * @returns {Promise<{data: object|null, success: boolean, message: string}>} Full incident details
   *
   * @example
   * const result = await ticketsAPI.getIncidentDetails("INC0012345");
   * if (result.success && result.data) {
   *   console.log(`Status: ${result.data.status}`);
   *   console.log(`Device: ${result.data.device}`);
   * }
   */
  // Get full incident details for ticket details view
  getIncidentDetails: async (incidentNumber: string) => {
    try {
      const response = await apiClient.get<ApiResponse<Incident>>(
        API_ENDPOINTS.SERVICENOW.INCIDENT_DETAILS(
          encodeURIComponent(incidentNumber)
        )
      );
      if (response.data.success) {
        // Transform single incident to UI format with full details
        const incident = response.data.data;

        // Log device name from details API
        logger.info(
          `[ServiceNow Details API] Incident ${incident.incidentNumber} deviceName: "${incident.deviceName}"`
        );

        const transformedData = {
          id: incident.incidentNumber,
          sysId: incident.sysId,
          status: incident.status,
          statusColor: getStatusColor(incident.status),
          title: incident.shortDescription,
          device: incident.deviceName || "Not Available",
          priority: mapPriorityToText(incident.priority),
          priorityColor: getPriorityColor(incident.priority),
          time: getTimeAgo(incident.openedAt),
          assignedTo: incident.assignedTo,
          createdBy: incident.createdBy,
          callerId: incident.callerId,
          callerName: incident.callerName,
          openedAt: incident.openedAt,
          lastUpdatedAt: incident.lastUpdatedAt,
          impact: incident.impact,
          active: incident.active,
        };
        return {
          data: transformedData,
          success: true,
          message: response.data.message,
        };
      }
      throw new Error(
        response.data.message || "Incident details not available"
      );
    } catch (error: any) {
      logger.error("Failed to fetch full incident details", error);

      let errorMessage = "Unable to retrieve incident details";
      if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
        errorMessage = "Request timeout - please try again";
      } else if (error.code === "ERR_NETWORK" || !error.response) {
        errorMessage = "Service temporarily unavailable";
      } else if (error.response?.status === 404) {
        errorMessage = "Incident not found";
      } else if (error.response?.status >= 500) {
        errorMessage = "Server error - please try again later";
      }

      return {
        data: null,
        success: false,
        message: errorMessage,
      };
    }
  },

  /**
   * Get single ticket by ID from cached tickets
   *
   * Searches through all fetched tickets to find one matching the specified ID.
   * Uses in-memory cache from getMyTickets() to avoid additional API calls.
   *
   * @async
   * @param {string} id - Ticket ID/incident number to find
   * @returns {Promise<{data: object|null, success: boolean}>} Single ticket or null if not found
   *
   * @example
   * const result = await ticketsAPI.getTicketById("INC0012345");
   * if (result.success && result.data) {
   *   console.log(`Found ticket: ${result.data.title}`);
   * }
   */
  getTicketById: async (id: string) => {
    try {
      // First get all tickets, then filter by ID
      const response = await ticketsAPI.getMyTickets();
      const ticket = response.data.find((t) => t.id === id);

      return {
        data: ticket || null,
        success: !!ticket,
      };
    } catch (error) {
      return { data: null, success: false };
    }
  },

  /**
   * Universal search across users, devices, and tickets
   *
   * Provides flexible search functionality with type-specific filtering:
   * - "Ticket" type: Searches by exact incident number using API
   * - "Device" type: Filters by device name (case-insensitive substring match)
   * - "User" type: Filters by caller ID or created by fields
   * - Default: Searches across ID, title, and device fields
   *
   * Empty query returns all tickets from getMyTickets().
   *
   * @async
   * @param {string} query - Search query string
   * @param {string} type - Search type ("Ticket" | "Device" | "User" | default)
   * @returns {Promise<{data: Array, success: boolean, message: string}>} Filtered tickets array
   *
   * @example
   * // Search by ticket number
   * const tickets = await ticketsAPI.searchTickets("INC0012345", "Ticket");
   *
   * // Search by device name
   * const deviceTickets = await ticketsAPI.searchTickets("LAPTOP", "Device");
   *
   * // Search by username
   * const userTickets = await ticketsAPI.searchTickets("john.doe", "User");
   */
  searchTickets: async (query: string, type: string) => {
    try {
      if (!query.trim()) {
        const response = await ticketsAPI.getMyTickets();
        return response;
      }

      // For Ticket search type, use the specific incident details API
      if (type === "Ticket") {
        const response = await ticketsAPI.getIncidentByNumber(query);
        return response;
      }

      // For other search types, filter from all tickets
      const response = await ticketsAPI.getMyTickets();
      const filtered = response.data.filter((ticket) => {
        const searchLower = query.toLowerCase();

        switch (type) {
          case "Device":
            return ticket.device.toLowerCase().includes(searchLower);
          case "User":
            return (
              ticket.callerId?.toLowerCase().includes(searchLower) ||
              ticket.createdBy?.toLowerCase().includes(searchLower)
            );
          default:
            return (
              ticket.id.toLowerCase().includes(searchLower) ||
              ticket.title.toLowerCase().includes(searchLower) ||
              ticket.device.toLowerCase().includes(searchLower)
            );
        }
      });

      return {
        data: filtered,
        success: true,
        message: `Found ${filtered.length} results`,
      };
    } catch (error) {
      return { data: [], success: false };
    }
  },
};

// Knowledge API types
export interface KnowledgeArticle {
  sysId: string;
  number: string;
  title: string;
  shortDescription: string;
  link: string;
  knowledgeBase: string;
  viewCount: number;
  score: number;
  workflow: string;
  author: string;
  publishedDate: string;
}

export interface KnowledgeData {
  articles: KnowledgeArticle[];
  count: number;
  query: string;
}

// Solution Summary API types
export interface SolutionSummaryData {
  incident_number: string;
  summary_points: string[];
  source: string;
  kb_articles_count: number;
  total_kb_articles_used: number;
  confidence: string;
  message: string;
}

export const knowledgeAPI = {
  /**
   * Get knowledge base articles for incident
   *
   * Retrieves relevant KB articles related to the incident.
   *
   * @async
   * @param {string} incidentNumber - Incident number to get KB articles for
   * @param {number} [limit=3] - Maximum number of articles to retrieve
   * @returns {Promise<{data: KnowledgeArticle[], success: boolean, message: string}>} Knowledge articles array
   */
  getKnowledgeArticles: async (incidentNumber: string, limit: number = 3) => {
    try {
      const response = await apiClient.get<ApiResponse<KnowledgeData>>(
        API_ENDPOINTS.SERVICENOW.KNOWLEDGE_ARTICLES(
          encodeURIComponent(incidentNumber),
          limit
        )
      );
      if (response.data.success) {
        return {
          data: response.data.data.articles,
          success: true,
          message: response.data.message,
        };
      }
      throw new Error(
        response.data.message || "Knowledge articles not available"
      );
    } catch (error: any) {
      logger.error("Failed to fetch knowledge articles", error);

      let errorMessage = "Unable to retrieve knowledge articles";
      if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
        errorMessage = "Request timeout - please try again";
      } else if (error.code === "ERR_NETWORK" || !error.response) {
        errorMessage = "Knowledge base temporarily unavailable";
      } else if (error.response?.status === 404) {
        errorMessage = "No relevant articles found";
      }

      return {
        data: [],
        success: false,
        message: errorMessage,
      };
    }
  },

  /**
   * Get AI-generated solution summary for incident
   *
   * Retrieves summarized solution recommendations based on related knowledge base articles.
   * Uses AI to analyze KB articles and generate actionable summary points.
   *
   * Response includes:
   * - Summary points array with key recommendations
   * - Source information (which KB articles were used)
   * - Confidence level of the summary
   * - KB article count metadata
   *
   * @async
   * @param {string} incidentNumber - Incident number to get solution summary for
   * @param {number} [limit=3] - Maximum number of KB articles to analyze
   * @returns {Promise<{data: SolutionSummaryData|null, success: boolean, message: string}>} Solution summary object
   *
   * @example
   * const result = await knowledgeAPI.getSolutionSummary("INC0012345", 3);
   * if (result.success && result.data) {
   *   console.log(`Confidence: ${result.data.confidence}`);
   *   result.data.summary_points.forEach(point => console.log(`- ${point}`));
   * }
   */
  // New Solution Summary API
  getSolutionSummary: async (incidentNumber: string, limit: number = 3) => {
    try {
      const response = await apiClient.get<ApiResponse<SolutionSummaryData>>(
        API_ENDPOINTS.SERVICENOW.SOLUTION_SUMMARY(
          encodeURIComponent(incidentNumber),
          limit
        )
      );
      if (response.data.success) {
        return {
          data: response.data.data,
          success: true,
          message: response.data.message,
        };
      }
      throw new Error(
        response.data.message || "Solution summary not available"
      );
    } catch (error: any) {
      logger.error("Failed to fetch solution summary", error);

      let errorMessage = "Unable to retrieve solution summary";
      if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
        errorMessage = "Request timeout - please try again";
      } else if (error.code === "ERR_NETWORK" || !error.response) {
        errorMessage = "Solution service temporarily unavailable";
      } else if (error.response?.status === 404) {
        errorMessage = "No solution summary found";
      }

      return {
        data: null,
        success: false,
        message: errorMessage,
      };
    }
  },
};

/**
 * Diagnostics API Namespace
 *
 * Provides methods for retrieving device diagnostics and health metrics from NextThink.
 * Includes comprehensive hardware, OS, and application health data.
 *
 * @namespace diagnosticsAPI
 */
export const diagnosticsAPI = {
  /**
   * Get device diagnostics from NextThink
   *
   * Fetches comprehensive device health metrics including:
   * - Hardware: CPU usage, memory, disk, network, boot metrics
   * - OS Health: Build info, uptime, last update
   * - Device Scores: DEX score, endpoint score, reliability, performance
   * - Application Health: Crash counts, alert summary
   *
   * Supports two modes:
   * - "full": Complete diagnostics with all metrics
   * - "quick": Essential metrics only for faster response
   *
   * @async
   * @param {string} deviceName - Device hostname/computer name
   * @param {"full"|"quick"} [mode="full"] - Diagnostics detail level
   * @param {boolean} [includeDetails=true] - Whether to include detailed breakdowns
   * @returns {Promise<{data: object|null, success: boolean, message: string}>} Device diagnostics data
   *
   * @example
   * // Get full diagnostics
   * const full = await diagnosticsAPI.getDeviceDiagnostics("LAPTOP-ABC123", "full", true);
   * if (full.success && full.data) {
   *   console.log(`CPU Usage: ${full.data.hardware.cpu.cpu_usage_percent}%`);
   *   console.log(`DEX Score: ${full.data.device_scores.overall_dex_score}`);
   * }
   *
   * // Get quick diagnostics
   * const quick = await diagnosticsAPI.getDeviceDiagnostics("LAPTOP-ABC123", "quick", false);
   */
  getDeviceDiagnostics: async (
    deviceName: string,
    mode: "full" | "quick" = "full",
    includeDetails: boolean = true
  ) => {
    try {
      logger.debug("Fetching device diagnostics", {
        deviceName,
        mode,
        includeDetails,
      });
      const response = await apiClient.post<
        ApiResponse<{
          device_name: string;
          device_id: string | null;
          timestamp: string;
          hardware: {
            cpu: {
              cpu_usage_percent: number;
              cpu_usage_24h_avg: number;
              cpu_model: string | null;
              cpu_speed_ghz: number | null;
              cpu_cores: number | null;
              boot_metrics: {
                full_boots_7d: number;
                hard_resets_7d: number;
                suspends_7d: number;
                system_crashes_7d: number;
                average_boot_duration_7d_minutes: number;
                average_time_until_desktop_ready_7d_seconds: number;
              };
            };
            gpu: any | null;
            memory: {
              memory_usage_percent: number;
              memory_total_gb: number | null;
              memory_available_gb: number | null;
            };
            disk: {
              disk_total_gb: number;
              disk_type: string;
            };
            network_metrics: {
              wifi_signal_strength_24h_percent: number | null;
            };
          };
          os_health: {
            build_info: {
              os_name: string;
              os_platform: string;
              architecture: string;
              days_since_last_update: number;
            };
            uptime_info: {
              uptime_days: number;
              last_full_boot_duration_minutes: number;
              days_since_last_seen: number;
            };
          };
          device_scores: {
            overall_dex_score: number;
            endpoint_score: number;
            boot_speed_score: number;
            logon_speed_score: number;
            applications_score: number;
            collaboration_score: number | null;
            os_activation_score: number;
            network_quality_score: number | null;
            device_performance_score: number;
            device_reliability_score: number;
          };
          application_health: {
            crash_count_24h: number;
            time_period: string;
          };
          alert_summary: {
            alert_count: number;
          };
          diagnostics_mode: string;
          categories_available: string[];
          categories_requested: string[];
          data_completeness_percent: number;
          notes: string | null;
        }>
      >(API_ENDPOINTS.NEXTTHINK.DIAGNOSTICS, {
        device_name: deviceName,
        mode,
        include_details: includeDetails,
      });

      if (response.data.success && response.data.data) {
        logger.info("Device diagnostics retrieved successfully", {
          device: deviceName,
        });
        return {
          data: response.data.data,
          success: true,
          message: response.data.message,
        };
      }

      throw new Error(
        response.data.message || "Failed to retrieve device diagnostics"
      );
    } catch (error: any) {
      logger.error("Failed to fetch device diagnostics", error);
      return {
        data: null,
        success: false,
        message:
          error?.response?.data?.message ||
          error?.message ||
          "Device diagnostics unavailable",
      };
    }
  },

  /**
   * Get root cause analysis for ticket (legacy/stub)
   *
   * Placeholder method for root cause analysis.
   * Currently returns empty array on error.
   *
   * @async
   * @param {string} ticketId - Ticket ID to analyze
   * @returns {Promise<{data: Array}>} Root causes array
   */
  getRootCauses: async (ticketId: string) => {
    try {
      return await apiClient.get(`/diagnostics/${ticketId}/root-causes`);
    } catch (error) {
      return { data: [] };
    }
  },

  /**
   * Get recommended actions for ticket (legacy/stub)
   *
   * Placeholder method for action recommendations.
   * Currently returns empty array on error.
   * Use remoteActionsAPI.getRecommendations for active implementation.
   *
   * @async
   * @param {string} ticketId - Ticket ID to get actions for
   * @returns {Promise<{data: Array}>} Recommended actions array
   */
  getRecommendedActions: async (ticketId: string) => {
    try {
      return await apiClient.get(`/diagnostics/${ticketId}/actions`);
    } catch (error) {
      return { data: [] };
    }
  },
};

// Health Check API types
export interface HealthCheckData {
  status: string;
  service: string;
  authenticated: boolean;
  response_received?: boolean;
  cached?: boolean;
  token_expires_in_seconds?: number;
  instance_url?: string;
  auth_url?: string;
  api_url?: string;
  graph_url?: string;
  tenant_id?: string;
  request_id: string;
}

export interface ServiceMetrics {
  service: string;
  time_period_hours: number;
  current_status: string;
  last_state_change: string;
  total_checks: number;
  healthy_checks: number;
  unhealthy_checks: number;
  uptime_percentage: number;
  downtime_percentage: number;
  total_downtime_minutes: number;
  downtime_periods: Array<{
    start: string;
    end: string;
    duration_minutes: number;
  }>;
  first_check: string;
  last_check: string;
}

export interface HealthMetricsData {
  time_period_hours: number;
  services: {
    servicenow: ServiceMetrics;
    intune: ServiceMetrics;
    nextthink: ServiceMetrics;
  };
  generated_at: string;
}

/**
 * Health Check API Namespace
 *
 * Provides methods for monitoring backend service health and uptime metrics.
 * Supports real-time health checks and historical metric analysis.
 *
 * Services monitored:
 * - ServiceNow: Incident management system
 * - Intune: Device management platform
 * - NextThink: Diagnostics and analytics
 *
 * @namespace healthAPI
 */
export const healthAPI = {
  /**
   * Check ServiceNow service health
   *
   * Performs real-time health check on ServiceNow API connectivity.
   * Returns authentication status, instance URLs, and token expiration info.
   *
   * @async
   * @returns {Promise<{data: HealthCheckData|null, success: boolean, message: string}>} ServiceNow health status
   *
   * @example
   * const result = await healthAPI.checkServiceNowHealth();
   * if (result.success && result.data) {
   *   console.log(`Status: ${result.data.status}`);
   *   console.log(`Authenticated: ${result.data.authenticated}`);
   * }
   */
  // Check ServiceNow health
  checkServiceNowHealth: async () => {
    try {
      const response = await apiClient.get<ApiResponse<HealthCheckData>>(
        API_ENDPOINTS.HEALTH.SERVICENOW
      );
      if (response.data.success) {
        return {
          data: response.data.data,
          success: true,
          message: response.data.message,
        };
      }
      throw new Error(
        response.data.message || "ServiceNow health check failed"
      );
    } catch (error: any) {
      logger.error("ServiceNow health check failed", error);
      return {
        data: null,
        success: false,
        message: error?.message || "ServiceNow unavailable",
      };
    }
  },

  /**
   * Check Intune service health
   *
   * Performs real-time health check on Microsoft Intune API connectivity.
   * Validates Graph API access and device management capabilities.
   *
   * @async
   * @returns {Promise<{data: HealthCheckData|null, success: boolean, message: string}>} Intune health status
   *
   * @example
   * const result = await healthAPI.checkIntuneHealth();
   * if (result.success && result.data) {
   *   console.log(`Status: ${result.data.status}`);
   *   console.log(`Graph URL: ${result.data.graph_url}`);
   * }
   */
  // Check Intune health
  checkIntuneHealth: async () => {
    try {
      const response = await apiClient.get<ApiResponse<HealthCheckData>>(
        API_ENDPOINTS.HEALTH.INTUNE
      );
      if (response.data.success) {
        return {
          data: response.data.data,
          success: true,
          message: response.data.message,
        };
      }
      throw new Error(response.data.message || "Intune health check failed");
    } catch (error: any) {
      logger.error("Intune health check failed", error);
      return {
        data: null,
        success: false,
        message: error?.message || "Intune unavailable",
      };
    }
  },

  /**
   * Check NextThink service health
   *
   * Performs real-time health check on NextThink diagnostics API.
   * Validates device query and analytics capabilities.
   *
   * @async
   * @returns {Promise<{data: HealthCheckData|null, success: boolean, message: string}>} NextThink health status
   *
   * @example
   * const result = await healthAPI.checkNextThinkHealth();
   * if (result.success && result.data) {
   *   console.log(`Status: ${result.data.status}`);
   *   console.log(`API URL: ${result.data.api_url}`);
   * }
   */
  // Check NextThink health
  checkNextThinkHealth: async () => {
    try {
      const response = await apiClient.get<ApiResponse<HealthCheckData>>(
        API_ENDPOINTS.HEALTH.NEXTTHINK
      );
      if (response.data.success) {
        return {
          data: response.data.data,
          success: true,
          message: response.data.message,
        };
      }
      throw new Error(response.data.message || "NextThink health check failed");
    } catch (error: any) {
      logger.error("NextThink health check failed", error);
      return {
        data: null,
        success: false,
        message: error?.message || "NextThink unavailable",
      };
    }
  },

  /**
   * Get historical health metrics for all services
   *
   * Retrieves uptime/downtime statistics for specified time period.
   * Includes:
   * - Current status and last state change
   * - Total checks performed (healthy vs unhealthy)
   * - Uptime and downtime percentages
   * - Downtime periods with start/end times and durations
   *
   * @async
   * @param {number} [hours=24] - Time period in hours to retrieve metrics for
   * @returns {Promise<{data: HealthMetricsData|null, success: boolean, message: string}>} Health metrics for all services
   *
   * @example
   * const metrics = await healthAPI.getHealthMetrics(24);
   * if (metrics.success && metrics.data) {
   *   console.log(`ServiceNow uptime: ${metrics.data.services.servicenow.uptime_percentage}%`);
   *   console.log(`Intune downtime: ${metrics.data.services.intune.total_downtime_minutes} mins`);
   * }
   */
  // Get health metrics for all services
  getHealthMetrics: async (hours: number = 24) => {
    try {
      const response = await apiClient.get<ApiResponse<HealthMetricsData>>(
        API_ENDPOINTS.HEALTH.METRICS(hours)
      );
      if (response.data.success) {
        return {
          data: response.data.data,
          success: true,
          message: response.data.message,
        };
      }
      throw new Error(
        response.data.message || "Failed to fetch health metrics"
      );
    } catch (error: any) {
      logger.error("Failed to fetch health metrics", error);
      return {
        data: null,
        success: false,
        message: error?.message || "Metrics unavailable",
      };
    }
  },

  /**
   * Check all services health in parallel
   *
   * Executes health checks for ServiceNow, Intune, and NextThink simultaneously
   * using Promise.allSettled for resilient error handling.
   *
   * Always returns results for all three services even if some fail.
   * Failed checks return `{data: null, success: false, message: "Check failed"}`.
   *
   * @async
   * @returns {Promise<{serviceNow: object, intune: object, nextThink: object}>} Health status for all services
   *
   * @example
   * const health = await healthAPI.checkAllServicesHealth();
   * console.log(`ServiceNow: ${health.serviceNow.success ? 'UP' : 'DOWN'}`);
   * console.log(`Intune: ${health.intune.success ? 'UP' : 'DOWN'}`);
   * console.log(`NextThink: ${health.nextThink.success ? 'UP' : 'DOWN'}`);
   */
  // Check all services health in parallel
  checkAllServicesHealth: async () => {
    try {
      const [serviceNowResult, intuneResult, nextThinkResult] =
        await Promise.allSettled([
          healthAPI.checkServiceNowHealth(),
          healthAPI.checkIntuneHealth(),
          healthAPI.checkNextThinkHealth(),
        ]);

      return {
        serviceNow:
          serviceNowResult.status === "fulfilled"
            ? serviceNowResult.value
            : { data: null, success: false, message: "Check failed" },
        intune:
          intuneResult.status === "fulfilled"
            ? intuneResult.value
            : { data: null, success: false, message: "Check failed" },
        nextThink:
          nextThinkResult.status === "fulfilled"
            ? nextThinkResult.value
            : { data: null, success: false, message: "Check failed" },
      };
    } catch (error: any) {
      logger.error("Failed to check all services health", error);
      return {
        serviceNow: { data: null, success: false, message: "Check failed" },
        intune: { data: null, success: false, message: "Check failed" },
        nextThink: { data: null, success: false, message: "Check failed" },
      };
    }
  },
};

/**
 * System Status API Namespace (Legacy/Stub)
 *
 * Provides mock system status data for UI display.
 * Returns hardcoded status indicators when backend is unavailable.
 *
 * @namespace systemStatusAPI
 */
export const systemStatusAPI = {
  /**
   * Get system status indicators
   *
   * Returns operational status for integrated services.
   * Currently returns mock data with hardcoded values.
   *
   * @async
   * @returns {Promise<{data: Array}>} Service status array
   */
  getStatus: async () => {
    try {
      return await apiClient.get("/system/status");
    } catch (error) {
      return {
        data: [
          DEMO_SERVICES.SERVICENOW,
          DEMO_SERVICES.TACHYON,
          DEMO_SERVICES.NEXTHINK,
          {
            name: "Intune / SCCM",
            status: "operational" as const,
            color: HEALTH_COLORS.HEALTHY,
          },
        ],
      };
    }
  },
};

// Device API types
export interface Computer {
  sysId: string;
  name: string;
  hostName: string;
  serialNumber: string;
  assignedToId: string;
  assignedToName: string;
}

export interface ComputersData {
  computers: Computer[];
  count: number;
}

export interface IntuneDevice {
  deviceId: string;
  deviceName: string;
  userPrincipalName: string;
  operatingSystem: string;
  osVersion: string;
  complianceState: string;
  managedDeviceOwnerType: string;
  enrolledDateTime: string;
  lastSyncDateTime: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  isEncrypted: boolean;
  userDisplayName: string;
  totalStorageSpaceInBytes?: number;
  freeStorageSpaceInBytes?: number;
  ipAddress?: string;
  macAddress?: string;
  connectionType?: string;
  vpnStatus?: string;
}

export interface IntuneDevicesData {
  devices: IntuneDevice[];
}

// Remote Actions API types
export interface RemoteAction {
  actionId: string;
  actionName: string;
  actionType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  deviceId: string | null;
  deviceName: string;
  executedBy: string;
  result: {
    inputs: string;
    outputs: string;
    purpose: string;
    status_details: string;
    nql_id: string;
    external_reference: string;
    external_source: string;
    internal_source: string;
  };
}

export interface RemoteActionsData {
  incident_number: string;
  device_name: string;
  category: string;
  recommendations: RemoteAction[];
  total: number;
  message: string | null;
}

/**
 * Remote Actions API Namespace
 *
 * Provides methods for retrieving NextThink remote action recommendations
 * based on incident context and device information.
 *
 * @namespace remoteActionsAPI
 */
export const remoteActionsAPI = {
  /**
   * Get remote action recommendations for incident
   *
   * Fetches AI-powered action recommendations from NextThink based on:
   * - Incident number (required)
   * - Device name (optional, improves accuracy)
   * - Caller ID (optional, for user context)
   *
   * Returns actionable remediation steps with:
   * - Action names and types
   * - Execution status and results
   * - NQL query IDs for execution
   * - Purpose and status details
   *
   * @async
   * @param {string} incidentNumber - Incident number to get recommendations for
   * @param {string} [deviceName] - Device name for device-specific actions
   * @param {string} [callerId] - User ID for user-context actions
   * @param {number} [limit=3] - Maximum number of recommendations to return
   * @returns {Promise<{data: RemoteAction[], success: boolean, message: string}>} Recommended actions array
   *
   * @example
   * const result = await remoteActionsAPI.getRecommendations(
   *   "INC0012345",
   *   "LAPTOP-ABC123",
   *   "john.doe",
   *   3
   * );
   * if (result.success && result.data.length > 0) {
   *   result.data.forEach(action => {
   *     console.log(`Action: ${action.actionName}`);
   *     console.log(`Purpose: ${action.result.purpose}`);
   *   });
   * }
   */
  getRecommendations: async (
    incidentNumber: string,
    deviceName?: string,
    callerId?: string,
    limit: number = 3
  ) => {
    try {
      const requestBody: any = {
        incident_number: incidentNumber,
        limit,
      };

      // Add optional fields if provided
      if (deviceName && deviceName !== "Not Available") {
        requestBody.device_name = deviceName;
      }
      if (callerId) {
        requestBody.caller_id = callerId;
      }

      const response = await apiClient.post<ApiResponse<RemoteActionsData>>(
        API_ENDPOINTS.NEXTTHINK.RECOMMENDATIONS,
        requestBody
      );

      if (response.data.success) {
        return {
          data: response.data.data.recommendations,
          success: true,
          message: response.data.message,
        };
      }
      throw new Error(
        response.data.message || "Failed to fetch remote actions"
      );
    } catch (error: any) {
      logger.error("Failed to fetch remote actions", error);

      let errorMessage = "Actions temporarily unavailable";
      if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
        errorMessage = "Actions temporarily unavailable";
      } else if (error.code === "ERR_NETWORK" || !error.response) {
        errorMessage = "Actions temporarily unavailable";
      } else if (error.response?.status === 404) {
        errorMessage = "No recommendations found for this incident";
      }

      return {
        data: [],
        success: false,
        message: errorMessage,
      };
    }
  },
};

/**
 * Device API Namespace
 *
 * Provides methods for retrieving device information from ServiceNow and Intune.
 * Supports both direct lookups and orchestrated multi-step queries.
 *
 * @namespace deviceAPI
 */
export const deviceAPI = {
  /**
   * Get user devices from ServiceNow
   *
   * Fetches all computers/devices assigned to a specific user in ServiceNow CMDB.
   * Returns device metadata including serial numbers, hostnames, and assignments.
   *
   * @async
   * @param {string} callerId - User ID to find devices for
   * @returns {Promise<{data: Computer[], success: boolean, message: string}>} User's devices array
   *
   * @example
   * const result = await deviceAPI.getUserDevices("john.doe");
   * if (result.success && result.data.length > 0) {
   *   console.log(`Found ${result.data.length} devices`);
   *   console.log(`Primary device: ${result.data[0].name}`);
   * }
   */
  // Get user devices from ServiceNow
  getUserDevices: async (callerId: string) => {
    try {
      const response = await apiClient.get<ApiResponse<ComputersData>>(
        API_ENDPOINTS.SERVICENOW.USER_DEVICES(encodeURIComponent(callerId))
      );
      if (response.data.success) {
        return {
          data: response.data.data.computers,
          success: true,
          message: response.data.message,
        };
      }
      throw new Error(response.data.message || "Failed to fetch user devices");
    } catch (error: any) {
      logger.error("Failed to fetch user devices", error);
      return {
        data: [],
        success: false,
        message: error?.message || "API error",
      };
    }
  },

  /**
   * Get device details from Intune
   *
   * Fetches comprehensive device information from Microsoft Intune by device name.
   * Returns first matching device if multiple found.
   *
   * Device details include:
   * - Device ID, name, and serial number
   * - User information (UPN, display name)
   * - OS version and compliance state
   * - Enrollment and last sync timestamps
   * - Hardware details (manufacturer, model)
   * - Storage information (total/free space)
   * - Network details (IP, MAC, connection type, VPN)
   * - Encryption status
   *
   * @async
   * @param {string} deviceName - Device hostname/computer name to search for
   * @returns {Promise<{data: IntuneDevice|null, success: boolean, message: string}>} Device details or null
   *
   * @example
   * const result = await deviceAPI.getDeviceDetails("LAPTOP-ABC123");
   * if (result.success && result.data) {
   *   console.log(`User: ${result.data.userDisplayName}`);
   *   console.log(`Compliance: ${result.data.complianceState}`);
   *   console.log(`OS: ${result.data.operatingSystem} ${result.data.osVersion}`);
   * }
   */
  // Get device details from Intune
  getDeviceDetails: async (deviceName: string) => {
    try {
      logger.debug(`[Intune API] Calling /intune/devices/name/${deviceName}`);
      const response = await apiClient.get<ApiResponse<IntuneDevicesData>>(
        API_ENDPOINTS.INTUNE.DEVICE_BY_NAME(encodeURIComponent(deviceName))
      );

      // Log the full API response
      logger.debug(`[Intune API] Response for ${deviceName}:`, {
        success: response.data.success,
        deviceCount: response.data.data.devices.length,
        firstDevice: response.data.data.devices[0] || null,
      });

      if (response.data.success && response.data.data.devices.length > 0) {
        const device = response.data.data.devices[0];
        logger.info(`[Intune API] Returning device:`, {
          deviceId: device.deviceId,
          deviceName: device.deviceName,
          userPrincipalName: device.userPrincipalName,
          serialNumber: device.serialNumber,
        });
        return {
          data: device,
          success: true,
          message: response.data.message,
        };
      }
      // API succeeded but no devices found - not an error, just no data
      if (response.data.success && response.data.data.devices.length === 0) {
        return {
          data: null,
          success: false,
          message: "Device information not available for this incident",
        };
      }
      throw new Error(
        response.data.message || "Failed to fetch device details"
      );
    } catch (error: any) {
      logger.error("Failed to fetch device details", error);
      // Check if this is a network error or API error
      if (error.code === "ERR_NETWORK" || !error.response) {
        return {
          data: null,
          success: false,
          message: "Device details temporarily unavailable",
        };
      }
      return {
        data: null,
        success: false,
        message: "Device information not available for this incident",
      };
    }
  },

  /**
   * Get device details with orchestrated fallback logic
   *
   * Intelligent two-step device lookup process:
   * 1. If device name missing/"Not Available" and caller ID provided:
   *    - Fetch device name from ServiceNow user devices
   *    - Use first device found
   * 2. Fetch full device details from Intune using device name
   *
   * This orchestration handles scenarios where incident has caller ID but no device name,
   * automatically resolving the device name before querying Intune.
   *
   * @async
   * @param {string} [deviceName] - Device name if known (optional)
   * @param {string} [callerId] - User ID for fallback device lookup (optional)
   * @returns {Promise<{data: IntuneDevice|null, success: boolean, message: string}>} Device details or null
   *
   * @example
   * // Direct lookup with known device name
   * const result1 = await deviceAPI.getDeviceDetailsOrchestrated("LAPTOP-ABC123");
   *
   * // Orchestrated lookup with only caller ID (fetches device name first)
   * const result2 = await deviceAPI.getDeviceDetailsOrchestrated(undefined, "john.doe");
   *
   * // Fallback when device name is "Not Available"
   * const result3 = await deviceAPI.getDeviceDetailsOrchestrated("Not Available", "john.doe");
   *
   * if (result2.success && result2.data) {
   *   console.log(`Auto-resolved device: ${result2.data.deviceName}`);
   * }
   */
  // Orchestrated call to get device details
  // Step 1: Get device name from ServiceNow if not provided
  // Step 2: Get device details from Intune
  getDeviceDetailsOrchestrated: async (
    deviceName?: string,
    callerId?: string
  ) => {
    try {
      let finalDeviceName = deviceName;

      // Step 1: If device name is empty and caller ID exists, get device name from ServiceNow
      if ((!deviceName || deviceName === "Not Available") && callerId) {
        logger.debug(
          `[Orchestrated] Step 1: Fetching device name for caller: ${callerId}`
        );
        const devicesResponse = await deviceAPI.getUserDevices(callerId);

        if (devicesResponse.success && devicesResponse.data.length > 0) {
          finalDeviceName = devicesResponse.data[0].name;
          logger.info(
            `[Orchestrated] Step 1 Result: Found device "${finalDeviceName}" for caller "${callerId}"`
          );
        } else {
          logger.warn("No devices found for caller");
          return {
            data: null,
            success: false,
            message: "No devices found for this user",
          };
        }
      }

      // Step 2: Get device details from Intune if we have a device name
      if (finalDeviceName && finalDeviceName !== "Not Available") {
        logger.info(
          `[Orchestrated] Step 2: Fetching Intune details for device: ${finalDeviceName}`
        );
        const intuneResult = await deviceAPI.getDeviceDetails(finalDeviceName);
        logger.info(`[Orchestrated] Step 2 Result:`, {
          success: intuneResult.success,
          hasData: !!intuneResult.data,
          deviceId: intuneResult.data?.deviceId,
          deviceName: intuneResult.data?.deviceName,
        });
        return intuneResult;
      }

      return {
        data: null,
        success: false,
        message: "Device information not available for this incident",
      };
    } catch (error: any) {
      logger.error("Failed to orchestrate device details fetch", error);

      let errorMessage = "Device details temporarily unavailable";
      if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
        errorMessage = "Device details temporarily unavailable";
      } else if (error.code === "ERR_NETWORK" || !error.response) {
        errorMessage = "Device details temporarily unavailable";
      }

      return {
        data: null,
        success: false,
        message: errorMessage,
      };
    }
  },
};
