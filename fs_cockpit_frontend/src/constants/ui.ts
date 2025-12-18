/**
 * @fileoverview UI Configuration Constants
 *
 * Centralized UI-related constants including timing,
 * animation delays, and display settings.
 *
 * @module constants/ui
 * @example
 * import { UI_TIMING, SEARCH_TYPES } from '@/constants';
 */

/**
 * Search type options
 */
export const SEARCH_TYPES = ["User", "Device", "Ticket"] as const;

/**
 * UI timing and animation constants (in milliseconds)
 */
export const UI_TIMING = {
  /** Health status refresh interval - 2 hours */
  HEALTH_REFRESH_INTERVAL: 7200000,
  /** Debounce delay for search input */
  SEARCH_DEBOUNCE: 300,
  /** Toast notification duration */
  TOAST_DURATION: 3000,
  /** Loading spinner minimum display time */
  MIN_LOADING_TIME: 500,
} as const;

/**
 * Default technician ID for fetching assigned tickets
 */
export const DEFAULT_TECHNICIAN_ID = "FS_Cockpit_Integration";

/**
 * Pagination defaults
 */
export const PAGINATION = {
  /** Default page size */
  PAGE_SIZE: 20,
  /** Initial page number */
  INITIAL_PAGE: 1,
} as const;

/**
 * Font family constants
 */
export const FONTS = {
  /** Primary font family */
  PRIMARY: "Arial-Regular, Helvetica",
  /** Monospace font for code/serial numbers */
  MONO: "monospace",
} as const;

/**
 * Z-index layers for consistent stacking
 */
export const Z_INDEX = {
  /** Dropdown menus */
  DROPDOWN: 50,
  /** Modal overlays */
  MODAL: 100,
  /** Toast notifications */
  TOAST: 1000,
  /** Loading overlays */
  LOADING: 999,
} as const;

/**
 * Breakpoint values (matches Tailwind defaults)
 */
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  "2XL": 1536,
} as const;

/**
 * Animation delay values for staggered animations
 */
export const ANIMATION_DELAYS = {
  /** No delay */
  NONE: "0ms",
  /** Short delay */
  SHORT: "100ms",
  /** Medium delay */
  MEDIUM: "200ms",
  /** Long delay */
  LONG: "300ms",
} as const;
