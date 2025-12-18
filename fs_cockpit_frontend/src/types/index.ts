/**
 * @fileoverview Type Definitions Barrel Export
 *
 * Central export point for all TypeScript type definitions.
 * Import types from this module instead of individual files.
 *
 * @module types
 * @example
 * import { Ticket, DeviceUserDetails, ApiResponse } from '@/types';
 */

// Ticket and incident types
export type {
  ActivityItem,
  KnowledgeItem,
  ActionItem,
  TicketPriority,
  TicketStatus,
  Ticket,
} from "./ticket";

// Device and diagnostics types
export type {
  DeviceUserDetails,
  LogSeverity,
  HealthStatus,
  IssueSeverity,
  PCLogEntry,
  AppWithIssue,
  DiagnosticsData,
} from "./device";

// API types
export type {
  ApiResponse,
  PaginationMeta,
  SearchType,
  ServiceHealth,
  HealthMetrics,
  AllServicesHealthMetrics,
  RemoteActionRecommendation,
  DiagnosticSummary,
  IntuneDevice,
  ServiceNowDevice,
  KnowledgeArticle,
} from "./api";
