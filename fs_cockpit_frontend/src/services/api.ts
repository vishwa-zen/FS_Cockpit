import axios from "axios";

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
  debug: (message: string, ...args: any[]) => {
    if (
      typeof import.meta !== "undefined" &&
      (import.meta as any).env?.MODE !== "production"
    ) {
      console.debug(`[API Debug] ${message}`, ...args);
    }
  },
  info: (message: string, ...args: any[]) => {
    if (
      typeof import.meta !== "undefined" &&
      (import.meta as any).env?.MODE !== "production"
    ) {
      console.info(`[API Info] ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[API Warning] ${message}`, ...args);
  },
  error: (message: string, error?: any) => {
    // Always log errors, but sanitize in production
    if (
      typeof import.meta !== "undefined" &&
      (import.meta as any).env?.MODE === "production"
    ) {
      console.error(`[API Error] ${message}`);
    } else {
      console.error(`[API Error] ${message}`, error);
    }
  },
};

// Prefer import.meta.env for Vite, fallback to process.env, then default to localhost:8003
const API_BASE_URL =
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env?.VITE_API_BASE_URL) ||
  (typeof process !== "undefined" && process.env?.VITE_API_BASE_URL) ||
  "http://127.0.0.1:8003/api/v1";

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
    const token = localStorage.getItem("msal.token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
      logger.warn("Unauthorized request detected, clearing session");
      localStorage.clear();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
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
 * Collection wrapper for incidents
 */
export interface IncidentsData {
  incidents: Incident[];
}

// Helper function to map numeric priority to text labels
// API returns: 1=High, 2=Medium, 3=Low
export const mapPriorityToText = (priority: string | number): string => {
  const priorityStr = String(priority).trim();

  // Map numeric priorities from API
  if (priorityStr === "1") return "High";
  if (priorityStr === "2") return "Medium";
  if (priorityStr === "3") return "Low";

  // Handle any "Critical" text that might come from API or cache - map to High
  if (priorityStr.toLowerCase().includes("critical")) return "High";

  // Return as-is if already text
  return priorityStr;
};

// Helper function to map priority to color
export const getPriorityColor = (priority: string | number): string => {
  const priorityText = mapPriorityToText(priority);

  if (priorityText.toLowerCase().includes("high")) {
    return "bg-[#ffe2e2] text-[#c10007] border-[#ffc9c9]";
  } else if (priorityText.toLowerCase().includes("medium")) {
    return "bg-[#fef9c2] text-[#a65f00] border-[#feef85]";
  } else if (priorityText.toLowerCase().includes("low")) {
    return "bg-[#fff4e6] text-[#d97706] border-[#fed7aa]";
  }
  return "bg-[#f0f9ff] text-[#0369a1] border-[#bae6fd]";
};

// Helper function to map status to color
export const getStatusColor = (status: string): string => {
  if (status === "In Progress") {
    return "bg-[#ffedd4] text-[#c93400] border-transparent";
  } else if (status === "New" || status === "Open") {
    return "bg-[#dbeafe] text-[#1e40af] border-transparent";
  } else if (status === "Resolved" || status === "Closed") {
    return "bg-[#d1fae5] text-[#065f46] border-transparent";
  }
  return "bg-[#f3f4f6] text-[#374151] border-transparent";
};

// Helper function to format time ago
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

// API endpoints
export const ticketsAPI = {
  // Search incidents by username
  getUserIncidents: async (userName: string) => {
    try {
      const response = await apiClient.get<ApiResponse<IncidentsData>>(
        `/servicenow/user/${encodeURIComponent(userName)}/incidents`
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
            device: incident.deviceName || "N/A",
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

  // Search incidents by device name
  getIncidentsByDevice: async (deviceName: string) => {
    try {
      const response = await apiClient.get<ApiResponse<IncidentsData>>(
        `/servicenow/device/${encodeURIComponent(deviceName)}/incidents`
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
            device: incident.deviceName || "N/A",
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
  getMyTickets: async () => {
    try {
      const response = await apiClient.get<ApiResponse<IncidentsData>>(
        "/servicenow/technician/FS_Cockpit_Integration/incidents"
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
            device: incident.deviceName || "N/A",
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

  // Get incident details by incident number
  getIncidentByNumber: async (incidentNumber: string) => {
    try {
      const response = await apiClient.get<ApiResponse<Incident>>(
        `/servicenow/incident/${encodeURIComponent(incidentNumber)}/details`
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
          device: incident.deviceName || "N/A",
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

  // Get full incident details for ticket details view
  getIncidentDetails: async (incidentNumber: string) => {
    try {
      const response = await apiClient.get<ApiResponse<Incident>>(
        `/servicenow/incident/${encodeURIComponent(incidentNumber)}/details`
      );
      if (response.data.success) {
        // Transform single incident to UI format with full details
        const incident = response.data.data;
        const transformedData = {
          id: incident.incidentNumber,
          sysId: incident.sysId,
          status: incident.status,
          statusColor: getStatusColor(incident.status),
          title: incident.shortDescription,
          device: incident.deviceName || "N/A",
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
      console.error("API Error:", error);
      return { data: null, success: false };
    }
  },

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
      console.error("API Error:", error);
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

export const knowledgeAPI = {
  getKnowledgeArticles: async (incidentNumber: string, limit: number = 3) => {
    try {
      const response = await apiClient.get<ApiResponse<KnowledgeData>>(
        `/servicenow/incident/${encodeURIComponent(
          incidentNumber
        )}/knowledge?limit=${limit}`
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
};

export const diagnosticsAPI = {
  getRootCauses: async (ticketId: string) => {
    try {
      return await apiClient.get(`/diagnostics/${ticketId}/root-causes`);
    } catch (error) {
      console.error("API Error:", error);
      return { data: [] };
    }
  },

  getRecommendedActions: async (ticketId: string) => {
    try {
      return await apiClient.get(`/diagnostics/${ticketId}/actions`);
    } catch (error) {
      console.error("API Error:", error);
      return { data: [] };
    }
  },
};

export const systemStatusAPI = {
  getStatus: async () => {
    try {
      return await apiClient.get("/system/status");
    } catch (error) {
      console.error("API Error:", error);
      return {
        data: [
          { name: "ServiceNow", status: "operational", color: "bg-[#00c950]" },
          { name: "Tachyon", status: "operational", color: "bg-[#00c950]" },
          { name: "Nexthink", status: "degraded", color: "bg-[#f0b100]" },
          {
            name: "Intune / SCCM",
            status: "operational",
            color: "bg-[#00c950]",
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
}

export interface IntuneDevicesData {
  devices: IntuneDevice[];
}

export const deviceAPI = {
  // Get user devices from ServiceNow
  getUserDevices: async (callerId: string) => {
    try {
      const response = await apiClient.get<ApiResponse<ComputersData>>(
        `/servicenow/user/${encodeURIComponent(callerId)}/devices`
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

  // Get device details from Intune
  getDeviceDetails: async (deviceName: string) => {
    try {
      const response = await apiClient.get<ApiResponse<IntuneDevicesData>>(
        `/intune/devices/name/${encodeURIComponent(deviceName)}`
      );
      if (response.data.success && response.data.data.devices.length > 0) {
        return {
          data: response.data.data.devices[0],
          success: true,
          message: response.data.message,
        };
      }
      throw new Error(
        response.data.message || "Failed to fetch device details"
      );
    } catch (error: any) {
      logger.error("Failed to fetch device details", error);
      return {
        data: null,
        success: false,
        message: error?.message || "API error",
      };
    }
  },

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
      if ((!deviceName || deviceName === "N/A") && callerId) {
        logger.debug(`Fetching device name for caller: ${callerId}`);
        const devicesResponse = await deviceAPI.getUserDevices(callerId);

        if (devicesResponse.success && devicesResponse.data.length > 0) {
          finalDeviceName = devicesResponse.data[0].name;
          logger.debug(`Found device name: ${finalDeviceName}`);
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
      if (finalDeviceName && finalDeviceName !== "N/A") {
        logger.debug(`Fetching device details for: ${finalDeviceName}`);
        return await deviceAPI.getDeviceDetails(finalDeviceName);
      }

      return {
        data: null,
        success: false,
        message: "Device information not available for this incident",
      };
    } catch (error: any) {
      logger.error("Failed to orchestrate device details fetch", error);

      let errorMessage = "Unable to retrieve device information";
      if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
        errorMessage = "Request timeout - please try again";
      } else if (error.code === "ERR_NETWORK" || !error.response) {
        errorMessage = "Device service temporarily unavailable";
      }

      return {
        data: null,
        success: false,
        message: errorMessage,
      };
    }
  },
};
