/**
 * @fileoverview Application Route Constants
 *
 * Centralized route path definitions for consistent navigation
 * throughout the application. Use these constants instead of
 * hardcoded strings to prevent typos and enable easy refactoring.
 *
 * @module constants/routes
 * @example
 * import { ROUTES } from '@/constants';
 * navigate(ROUTES.DASHBOARD);
 */

/**
 * Application route paths
 */
export const ROUTES = {
  /** Root path - redirects to login */
  ROOT: "/",
  /** Login/authentication page */
  LOGIN: "/login",
  /** Main dashboard/home page */
  HOME: "/home",
  /** Dashboard with ticket ID parameter */
  HOME_WITH_ID: "/home/:id",
  /** Search page */
  SEARCH: "/search",
  /** Ticket details page */
  TICKET_DETAILS: "/issue/:id",
} as const;

/**
 * Helper function to generate ticket detail route
 * @param ticketId - Ticket/incident ID
 * @returns Route path with ticket ID
 */
export const getTicketRoute = (ticketId: string): string => `/home/${ticketId}`;

/**
 * Helper function to generate issue detail route
 * @param issueId - Issue ID
 * @returns Route path with issue ID
 */
export const getIssueRoute = (issueId: string): string => `/issue/${issueId}`;
