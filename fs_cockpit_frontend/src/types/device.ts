/**
 * @fileoverview Device and Diagnostics Type Definitions
 *
 * Centralized type definitions for device information, diagnostics,
 * and system health metrics from Intune and other sources.
 *
 * @module types/device
 */

/**
 * Device and user details from Intune/Azure AD
 */
export interface DeviceUserDetails {
  /** User's full display name */
  userName: string;
  /** Device hostname/computer name */
  deviceName: string;
  /** Optional device health score */
  deviceScore?: string;
  /** User's email address */
  emailId: string;
  /** Optional employee ID */
  employeeId?: string;
  /** Operating system name */
  operatingSystem: string;
  /** OS version/build number */
  osVersion?: string;
  /** Compliance status */
  complianceState: string;
  /** Optional device ID */
  id?: string;
  /** Last sync timestamp */
  lastSyncDateTime: string;
  /** Device serial number */
  serialNumber: string;
  /** Device ownership type */
  managedDeviceOwnerType: string;
  /** Optional enrollment timestamp */
  enrolledDateTime?: string;
  /** Memory usage percentage */
  memoryUsage?: string;
  /** Disk usage percentage */
  diskUsage?: string;
}

/**
 * Log entry severity levels
 */
export type LogSeverity = "error" | "warning" | "info";

/**
 * Health status levels
 */
export type HealthStatus = "healthy" | "warning" | "critical";

/**
 * Application issue severity levels
 */
export type IssueSeverity = "critical" | "warning";

/**
 * PC local log entry
 */
export interface PCLogEntry {
  /** Log timestamp */
  timestamp: string;
  /** Severity level */
  severity: LogSeverity;
  /** Log message */
  message: string;
  /** Log source/origin */
  source: string;
}

/**
 * Application with identified issues
 */
export interface AppWithIssue {
  /** Application name */
  name: string;
  /** Issue description */
  issue: string;
  /** Issue severity */
  severity: IssueSeverity;
}

/**
 * Comprehensive diagnostics data for a device
 */
export interface DiagnosticsData {
  // Hardware Metrics
  cpuUsage: string;
  ramUsage: string;
  diskUsage: string;
  networkLatency: string;
  processCount: string;
  uptime: string;
  batteryPercentage?: string;

  // Operating System
  osBuild?: string;
  osUptime?: string;
  driverHealth?: string;
  restartStatus?: string;

  // Security
  encryptionStatus?: string;
  antivirusStatus?: string;
  vulnerabilityScan?: string;

  // Services
  servicesHealth?: string;
  runningApps?: string;

  // PC Local Logs (only shown if issues found)
  pcLogs?: PCLogEntry[];

  // Applications with issues
  appsWithIssues?: AppWithIssue[];

  // Section-level health status for rapid identification
  hardwareHealth?: HealthStatus;
  osHealth?: HealthStatus;
  securityHealth?: HealthStatus;
  servicesAppHealth?: HealthStatus;
}
