/**
 * DeviceUserDetailsPanel Component
 *
 * Displays comprehensive device and user information from Intune and Azure AD.
 * Shows device compliance, health metrics, network details, and user profile data.
 *
 * Features:
 * - Overall device health status calculation based on multiple factors
 * - Color-coded compliance badges (green = compliant, red = non-compliant)
 * - Comprehensive device metrics (memory, disk, device score)
 * - Network connectivity information (IP, MAC, VPN status)
 * - Hardware details (manufacturer, model, serial number)
 * - User profile information (name, email, employee ID)
 * - Responsive grid layouts
 * - Health score algorithm considering compliance, resource usage, sync status, and connectivity
 *
 * Health Score Factors:
 * - Compliance state: -40 points if non-compliant (critical)
 * - Memory usage: -20 points if >90%, -10 points if >80%
 * - Disk usage: -20 points if >90%, -10 points if >80%
 * - Last sync: -15 points if >48 hours
 * - Network: -15 points if no connection
 * - Score >=80 = Healthy, 50-79 = Warning, <50 = Critical
 *
 * @example
 * ```tsx
 * <DeviceUserDetailsPanel
 *   details={{
 *     userName: "John Doe",
 *     userId: "john.doe@company.com",
 *     emailId: "john.doe@company.com",
 *     employeeId: "EMP12345",
 *     complianceState: "Compliant",
 *     deviceName: "LAPTOP-ABC123",
 *     deviceScore: "85/100",
 *     memoryUsage: "65",
 *     diskUsage: "72",
 *     operatingSystem: "Windows 11 Pro",
 *     osVersion: "22H2",
 *     serialNumber: "SN123456789",
 *     lastSyncDateTime: "2025-12-18T10:30:00Z",
 *     managedDeviceOwnerType: "Company",
 *     ipAddress: "192.168.1.100",
 *     macAddress: "00:1A:2B:3C:4D:5E",
 *     connectionType: "Ethernet",
 *     vpnStatus: "Connected",
 *     manufacturer: "Dell",
 *     model: "Latitude 5520"
 *   }}
 * />
 * ```
 */
import React from "react";
import { Card } from "@ui/card";
import { Badge } from "@ui/badge";
import {
  Monitor,
  User,
  Mail,
  IdCard,
  Shield,
  Laptop,
  Gauge,
  Database,
  HardDrive,
  Smartphone,
  Calendar,
  Clock,
  Building,
  Wifi,
  Network,
  Globe,
  ShieldCheck,
  Package,
  CheckCircle,
} from "@components/icons";

/**
 * Device and user details data structure from Intune and Azure AD
 *
 * @interface DeviceUserDetails
 */
export interface DeviceUserDetails {
  /** User's full display name */
  userName: string;
  /** User's unique identifier (UPN or email) */
  userId: string;
  /** User's email address */
  emailId: string;
  /** Optional employee/staff ID number */
  employeeId?: string;
  /** Device compliance status (Compliant, Non-Compliant, etc.) */
  complianceState: string;
  /** Device hostname/computer name */
  deviceName: string;
  /** Optional device health score (e.g., "85/100") */
  deviceScore?: string;
  /** Memory usage percentage as string */
  memoryUsage?: string;
  /** Disk usage percentage as string */
  diskUsage?: string;
  /** Operating system name */
  operatingSystem: string;
  /** OS version/build number */
  osVersion?: string;
  /** Device serial number */
  serialNumber: string;
  /** ISO timestamp of last successful sync with Intune */
  lastSyncDateTime: string;
  /** Device ownership type (Company, Personal, etc.) */
  managedDeviceOwnerType: string;
  /** Optional enrollment date ISO timestamp */
  enrolledDateTime?: string;
  /** Device IP address */
  ipAddress?: string;
  /** Device MAC address */
  macAddress?: string;
  /** Network connection type (Ethernet, WiFi, etc.) */
  connectionType?: string;
  /** VPN connection status */
  vpnStatus?: string;
  /** Device manufacturer (Dell, HP, Lenovo, etc.) */
  manufacturer?: string;
  /** Device model number/name */
  model?: string;
}

/**
 * Props for the DeviceUserDetailsPanel component
 *
 * @interface DeviceUserDetailsPanelProps
 */
interface DeviceUserDetailsPanelProps {
  /** Device and user details object */
  details: DeviceUserDetails;
}

export const DeviceUserDetailsPanel: React.FC<DeviceUserDetailsPanelProps> =
  React.memo(({ details }) => {
    /**
     * Determines badge color classes based on compliance state
     * @param {string} state - Compliance state (Compliant, Non-Compliant, etc.)
     * @returns {string} Tailwind CSS classes for compliance badge
     */
    const getComplianceColor = (state: string) => {
      if (state.toLowerCase() === "compliant")
        return "bg-[#D1FAE5] text-[#065F46] border-[#065F46]/20";
      return "bg-[#FEE2E2] text-[#991B1B] border-[#991B1B]/20";
    };

    /**
     * Calculates overall device health status based on multiple factors
     * Evaluates compliance, resource usage, sync status, and network connectivity
     *
     * Scoring Algorithm:
     * - Base score: 100 points
     * - Non-compliant: -40 points (critical factor)
     * - High memory usage (>90%): -20 points, (>80%): -10 points
     * - High disk usage (>90%): -20 points, (>80%): -10 points
     * - Not synced in 48+ hours: -15 points
     * - No network connection: -15 points
     *
     * Status Thresholds:
     * - Healthy: score >= 80
     * - Warning: score 50-79
     * - Critical: score < 50
     *
     * @returns {object} Health status with status text, color class, and background color
     */
    // Calculate overall health status based on multiple factors
    const _calculateHealthStatus = (): {
      status: "Healthy" | "Warning" | "Critical";
      color: string;
      bgColor: string;
    } => {
      let healthScore = 100;
      const issues: string[] = [];

      // Check compliance state (critical factor)
      if (details.complianceState.toLowerCase() !== "compliant") {
        healthScore -= 40;
        issues.push("Non-compliant");
      }

      // Check memory usage
      if (details.memoryUsage) {
        const memUsage = parseInt(details.memoryUsage);
        if (memUsage > 90) {
          healthScore -= 20;
          issues.push("High memory usage");
        } else if (memUsage > 80) {
          healthScore -= 10;
        }
      }

      // Check disk usage
      if (details.diskUsage) {
        const diskUsage = parseInt(details.diskUsage);
        if (diskUsage > 90) {
          healthScore -= 20;
          issues.push("High disk usage");
        } else if (diskUsage > 80) {
          healthScore -= 10;
        }
      }

      // Check last sync (device connectivity/health)
      const lastSync = new Date(details.lastSyncDateTime);
      const hoursSinceSync =
        (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
      if (hoursSinceSync > 48 && details.lastSyncDateTime !== "Never synced") {
        healthScore -= 15;
        issues.push("Not synced recently");
      }

      // Check network connectivity
      if (!details.connectionType && !details.ipAddress) {
        healthScore -= 15;
        issues.push("No network connection");
      }

      // Determine status based on score
      if (healthScore >= 80) {
        return {
          status: "Healthy",
          color: "text-[#065F46]",
          bgColor: "bg-[#D1FAE5]",
        };
      } else if (healthScore >= 50) {
        return {
          status: "Warning",
          color: "text-[#92400E]",
          bgColor: "bg-[#FEF3C7]",
        };
      } else {
        return {
          status: "Critical",
          color: "text-[#991B1B]",
          bgColor: "bg-[#FEE2E2]",
        };
      }
    };

    // Health status calculation available for future use
    // const _healthStatus = calculateHealthStatus();

    return (
      <div className="space-y-4 sm:space-y-6">
        {/* User Details */}
        <Card className="bg-[#F9FAFB] border-[0.67px] border-[#E2E8F0] rounded-[18px] py-[12px] sm:py-[15px] px-[14px] sm:px-[18px]">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4 sm:w-5 sm:h-5 text-[#3B82F6]" />
            <h3 className="[font-family:'Arial-Regular',Helvetica] text-[#0E162B] text-sm sm:text-base font-semibold">
              User Details
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 sm:gap-x-8 gap-y-3 sm:gap-y-4">
            <div>
              <div className="text-[#61738D] text-xs font-medium mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                User Name
              </div>
              <div className="text-[#0E162B] text-sm">{details.userName}</div>
            </div>
            <div>
              <div className="text-[#61738D] text-xs font-medium mb-1 flex items-center gap-1">
                <IdCard className="w-3.5 h-3.5" />
                User ID
              </div>
              <div className="text-[#0E162B] text-sm font-mono text-xs">
                {details.userId}
              </div>
            </div>
            <div>
              <div className="text-[#61738D] text-xs font-medium mb-1 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                Email ID
              </div>
              <div className="text-[#3B82F6] text-sm">{details.emailId}</div>
            </div>
            {details.employeeId && (
              <div>
                <div className="text-[#61738D] text-xs font-medium mb-1 flex items-center gap-1">
                  <Building className="w-3.5 h-3.5" />
                  Employee ID
                </div>
                <div className="text-[#0E162B] text-sm">
                  {details.employeeId}
                </div>
              </div>
            )}
            <div>
              <div className="text-[#61738D] text-xs font-medium mb-1 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" />
                Compliance State
              </div>
              <Badge
                className={`${getComplianceColor(
                  details.complianceState
                )} px-2 py-0.5 text-xs font-medium rounded border`}
              >
                {details.complianceState}
              </Badge>
            </div>
          </div>
        </Card>

        {/* Device Details */}
        <Card className="bg-[#F9FAFB] border-[0.67px] border-[#E2E8F0] rounded-[18px] py-[12px] sm:py-[15px] px-[14px] sm:px-[18px]">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 sm:w-5 sm:h-5 text-[#3B82F6]" />
              <h3 className="[font-family:'Arial-Regular',Helvetica] text-[#0E162B] text-sm sm:text-base font-semibold">
                Device Details
              </h3>
            </div>
            <CheckCircle className="w-5 h-5 text-[#10B981]" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 sm:gap-x-8 gap-y-3 sm:gap-y-4">
            {/* Network Information */}
            <div>
              <div className="text-[#61738D] text-xs font-medium mb-1 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" />
                IP Address
              </div>
              <div className="text-[#0E162B] text-sm">
                {details.ipAddress || "Not available"}
              </div>
            </div>
            <div>
              <div className="text-[#61738D] text-xs font-medium mb-1 flex items-center gap-1">
                <Network className="w-3.5 h-3.5" />
                MAC Address
              </div>
              <div className="text-[#0E162B] text-sm">
                {details.macAddress || "Not available"}
              </div>
            </div>
            <div>
              <div className="text-[#61738D] text-xs font-medium mb-1 flex items-center gap-1">
                <Wifi className="w-3.5 h-3.5" />
                Connection Type
              </div>
              <div className="text-[#0E162B] text-sm">
                {details.connectionType || "Unknown"}
              </div>
            </div>
            <div>
              <div className="text-[#61738D] text-xs font-medium mb-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                VPN Status
              </div>
              <div className="text-[#0E162B] text-sm">
                {details.vpnStatus || "Unknown"}
              </div>
            </div>

            <div>
              <div className="text-[#61738D] text-xs font-medium mb-1 flex items-center gap-1">
                <Laptop className="w-3.5 h-3.5" />
                Device Name
              </div>
              <div className="text-[#0E162B] text-sm font-medium">
                {details.deviceName}
              </div>
            </div>
            {details.deviceScore && (
              <div>
                <div className="text-[#61738D] text-xs font-medium mb-1 flex items-center gap-1">
                  <Gauge className="w-3.5 h-3.5" />
                  Device Score
                </div>
                <div className="text-[#0E162B] text-sm font-semibold">
                  {details.deviceScore}
                </div>
              </div>
            )}
            {details.memoryUsage && (
              <div>
                <div className="text-[#61738D] text-xs font-medium mb-1 flex items-center gap-1">
                  <Database className="w-3.5 h-3.5" />
                  Memory Usage
                </div>
                <div className="text-[#0E162B] text-sm">
                  {details.memoryUsage}
                </div>
              </div>
            )}
            {details.diskUsage && (
              <div>
                <div className="text-[#61738D] text-xs font-medium mb-1 flex items-center gap-1">
                  <HardDrive className="w-3.5 h-3.5" />
                  Disk Usage
                </div>
                <div className="text-[#0E162B] text-sm">
                  {details.diskUsage}
                </div>
              </div>
            )}
            <div>
              <div className="text-[#61738D] text-xs font-medium mb-1 flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5" />
                Operating System
              </div>
              <div className="text-[#0E162B] text-sm">
                {details.operatingSystem}
              </div>
            </div>
            {details.manufacturer && (
              <div>
                <div className="text-[#61738D] text-xs font-medium mb-1 flex items-center gap-1">
                  <Package className="w-3.5 h-3.5" />
                  Manufacturer
                </div>
                <div className="text-[#0E162B] text-sm">
                  {details.manufacturer}
                </div>
              </div>
            )}
            {details.model && (
              <div>
                <div className="text-[#61738D] text-xs font-medium mb-1 flex items-center gap-1">
                  <Laptop className="w-3.5 h-3.5" />
                  Model
                </div>
                <div className="text-[#0E162B] text-sm">{details.model}</div>
              </div>
            )}
            {details.osVersion && (
              <div>
                <div className="text-[#61738D] text-xs font-medium mb-1 flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5" />
                  OS Version
                </div>
                <div className="text-[#0E162B] text-sm">
                  {details.osVersion}
                </div>
              </div>
            )}
            <div>
              <div className="text-[#61738D] text-xs font-medium mb-1 flex items-center gap-1">
                <IdCard className="w-3.5 h-3.5" />
                Serial Number
              </div>
              <div className="text-[#0E162B] text-sm font-mono text-xs">
                {details.serialNumber}
              </div>
            </div>
            <div>
              <div className="text-[#61738D] text-xs font-medium mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Last Sync Date & Time
              </div>
              <div className="text-[#0E162B] text-sm">
                {details.lastSyncDateTime}
              </div>
            </div>
            <div>
              <div className="text-[#61738D] text-xs font-medium mb-1 flex items-center gap-1">
                <Building className="w-3.5 h-3.5" />
                Managed Device Owner Type
              </div>
              <div className="text-[#0E162B] text-sm">
                {details.managedDeviceOwnerType}
              </div>
            </div>
            {details.enrolledDateTime && (
              <div>
                <div className="text-[#61738D] text-xs font-medium mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Enrolled Date Time
                </div>
                <div className="text-[#0E162B] text-sm">
                  {details.enrolledDateTime}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  });
