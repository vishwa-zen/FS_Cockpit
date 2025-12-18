/**
 * @fileoverview Constants Barrel Export
 *
 * Central export point for all application constants.
 * Import constants from this module instead of individual files.
 *
 * @module constants
 * @example
 * import { ROUTES, API_CONFIG, PRIORITY, UI_TIMING } from '@/constants';
 */

// Route constants
export { ROUTES, getTicketRoute, getIssueRoute } from "./routes";

// API constants
export { API_CONFIG, API_ENDPOINTS, HTTP_STATUS, STORAGE_KEYS } from "./api";

// Status and priority constants
export {
  PRIORITY,
  PRIORITY_NUMERIC,
  STATUS,
  PRIORITY_COLORS,
  STATUS_COLORS,
  getPriorityColor,
  getStatusColor,
  HEALTH_STATUS,
  COMPLIANCE_STATE,
} from "./statuses";

// UI constants
export {
  SEARCH_TYPES,
  UI_TIMING,
  DEFAULT_TECHNICIAN_ID,
  PAGINATION,
  FONTS,
  Z_INDEX,
  BREAKPOINTS,
  ANIMATION_DELAYS,
} from "./ui";

// Demo and fallback data constants
export {
  DEMO_CREDENTIALS,
  DEMO_USER,
  HEALTH_COLORS,
  DEMO_SERVICES,
} from "./demo";
