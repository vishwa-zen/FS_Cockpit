import axios from "axios";

// Environment variables - using process.env instead of import.meta
// Prefer Vite's import.meta.env at runtime; fall back to process.env for Node/SSR or a sane default
declare const process: {
  env: {
    VITE_API_BASE_URL?: string;
  };
};

// Prefer import.meta.env for Vite, fallback to process.env, then default to localhost:8005
const API_BASE_URL =
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env?.VITE_API_BASE_URL) ||
  (typeof process !== "undefined" && process.env?.VITE_API_BASE_URL) ||
  "http://127.0.0.1:8005/api/v1";

// Log the computed base URL for debugging in dev/prod
if (
  typeof window !== "undefined" &&
  typeof import.meta !== "undefined" &&
  (import.meta as any).env?.MODE !== "production"
) {
  // eslint-disable-next-line no-console
  console.debug("[API] baseURL:", API_BASE_URL);
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Add auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("msal.token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.clear();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// Types for API responses
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
  callerId: string;
  openedAt: string;
  lastUpdatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
  request_id: string;
}

export interface IncidentsData {
  incidents: Incident[];
}

// Helper function to map priority to color
export const getPriorityColor = (priority: string): string => {
  if (priority.includes("Critical") || priority.includes("1")) {
    return "bg-[#ffe2e2] text-[#c10007] border-[#ffc9c9]";
  } else if (priority.includes("High") || priority.includes("2")) {
    return "bg-[#fef9c2] text-[#a65f00] border-[#feef85]";
  } else if (priority.includes("Medium") || priority.includes("3")) {
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
            priority: incident.priority,
            priorityColor: getPriorityColor(incident.priority),
            time: getTimeAgo(incident.openedAt),
            assignedTo: incident.assignedTo,
            createdBy: incident.createdBy,
            callerId: incident.callerId,
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
      console.error("API Error (user incidents):", error);
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
            priority: incident.priority,
            priorityColor: getPriorityColor(incident.priority),
            time: getTimeAgo(incident.openedAt),
            assignedTo: incident.assignedTo,
            createdBy: incident.createdBy,
            callerId: incident.callerId,
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
      console.error("API Error (device incidents):", error);
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
            priority: incident.priority,
            priorityColor: getPriorityColor(incident.priority),
            time: getTimeAgo(incident.openedAt),
            assignedTo: incident.assignedTo,
            createdBy: incident.createdBy,
            callerId: incident.callerId,
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
      console.error("API Error:", error);

      // Return mock data as fallback
      console.warn("API failed, using mock data");
      return {
        data: [
          {
            id: "INC0012345",
            sysId: "mock-sys-id-1",
            status: "In Progress",
            statusColor: "bg-[#ffedd4] text-[#c93400] border-transparent",
            title: "Outlook not responding on LAPTOP-8X7D2K",
            device: "LAPTOP-8X7D2K",
            priority: "1 - Critical",
            priorityColor: "bg-[#ffe2e2] text-[#c10007] border-[#ffc9c9]",
            time: "2 hours ago",
            assignedTo: "FS Cockpit Integration",
            createdBy: "admin",
            callerId: "John Doe",
            openedAt: new Date().toISOString(),
            lastUpdatedAt: new Date().toISOString(),
            impact: 1,
            active: true,
          },
          {
            id: "INC0010148",
            sysId: "mock-sys-id-2",
            status: "New",
            statusColor: "bg-[#dbeafe] text-[#1e40af] border-transparent",
            title: "Printer Issue at Fountains Hills Safeway Branch",
            device: "HP LaserJet Pro",
            priority: "2 - High",
            priorityColor: "bg-[#fef9c2] text-[#a65f00] border-[#feef85]",
            time: "5 hours ago",
            assignedTo: "FS Cockpit Integration",
            createdBy: "koreapitest",
            callerId: "Sarah Johnson",
            openedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
            lastUpdatedAt: new Date(
              Date.now() - 5 * 60 * 60 * 1000
            ).toISOString(),
            impact: 2,
            active: true,
          },
          {
            id: "INC0002012",
            sysId: "mock-sys-id-3",
            status: "In Progress",
            statusColor: "bg-[#ffedd4] text-[#c93400] border-transparent",
            title: "Cannot access SAP Sales app",
            device: "SAP Sales and Distribution",
            priority: "1 - Critical",
            priorityColor: "bg-[#ffe2e2] text-[#c10007] border-[#ffc9c9]",
            time: "1 day ago",
            assignedTo: "FS Cockpit Integration",
            createdBy: "admin",
            callerId: "Carol Coughlin",
            openedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            lastUpdatedAt: new Date(
              Date.now() - 24 * 60 * 60 * 1000
            ).toISOString(),
            impact: 1,
            active: true,
          },
          {
            id: "INC0024934",
            sysId: "mock-sys-id-4",
            status: "Resolved",
            statusColor: "bg-[#d1fae5] text-[#065f46] border-transparent",
            title: "Error installing software update",
            device: "LAPTOP-9K2L5P",
            priority: "3 - Medium",
            priorityColor: "bg-[#fff4e6] text-[#d97706] border-[#fed7aa]",
            time: "3 days ago",
            assignedTo: "FS Cockpit Integration",
            createdBy: "Nisarga",
            callerId: "Jitin",
            openedAt: new Date(
              Date.now() - 3 * 24 * 60 * 60 * 1000
            ).toISOString(),
            lastUpdatedAt: new Date(
              Date.now() - 3 * 24 * 60 * 60 * 1000
            ).toISOString(),
            impact: 2,
            active: false,
          },
          {
            id: "INC0024933",
            sysId: "mock-sys-id-5",
            status: "In Progress",
            statusColor: "bg-[#ffedd4] text-[#c93400] border-transparent",
            title: "Unable to print documents",
            device: "Canon Printer MX920",
            priority: "2 - High",
            priorityColor: "bg-[#fef9c2] text-[#a65f00] border-[#feef85]",
            time: "6 hours ago",
            assignedTo: "FS Cockpit Integration",
            createdBy: "Nisarga",
            callerId: "Jitin",
            openedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
            lastUpdatedAt: new Date(
              Date.now() - 6 * 60 * 60 * 1000
            ).toISOString(),
            impact: 2,
            active: true,
          },
        ],
        success: true,
        message: "Using mock data (API unavailable)",
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
      const response = await ticketsAPI.getMyTickets();

      if (!query.trim()) {
        return response;
      }

      const filtered = response.data.filter((ticket) => {
        const searchLower = query.toLowerCase();

        switch (type) {
          case "Ticket":
            return (
              ticket.id.toLowerCase().includes(searchLower) ||
              ticket.title.toLowerCase().includes(searchLower)
            );
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
