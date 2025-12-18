import React from "react";
import {
  Cpu,
  HardDrive,
  MemoryStick,
  Network,
  ListChecks,
  Clock,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  Monitor,
  Shield,
  ShieldCheck,
  AppWindow,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  FileText,
  AlertTriangle,
} from "lucide-react";

/**
 * Diagnostics data interface
 * Represents system health metrics for a device
 */
export interface DiagnosticsData {
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
  pcLogs?: Array<{
    timestamp: string;
    severity: "error" | "warning" | "info";
    message: string;
    source: string;
  }>;
  // Applications with issues
  appsWithIssues?: Array<{
    name: string;
    issue: string;
    severity: "critical" | "warning";
  }>;
  // Section-level health status for rapid identification
  hardwareHealth?: "healthy" | "warning" | "critical";
  osHealth?: "healthy" | "warning" | "critical";
  securityHealth?: "healthy" | "warning" | "critical";
  servicesAppHealth?: "healthy" | "warning" | "critical";
}

interface DiagnosticsPanelProps {
  diagnostics: DiagnosticsData;
}

/**
 * DiagnosticsPanel Component
 *
 * Displays system diagnostics with color-coded indicators:
 * - CPU Usage: Color-coded text (green/orange/red)
 * - RAM Usage: Color-coded text (green/orange/red)
 * - Battery Level: Icon and color based on charge level
 * - Disk Usage: Storage consumption percentage
 * - Network Latency: Connection response time
 * - Process Count: Number of running processes
 * - System Uptime: Time since last restart
 *
 * Features:
 * - Color-coded indicators (green < 60%, orange 60-79%, red ≥ 80%)
 * - Battery icon changes based on charge level
 * - Responsive grid layout
 *
 * @param {DiagnosticsPanelProps} props - Component props
 */
export const DiagnosticsPanel: React.FC<DiagnosticsPanelProps> = React.memo(
  ({ diagnostics }) => {
    /**
     * Get text color based on resource usage percentage
     * @param {string} usage - Usage percentage as string or "Not Available"
     * @returns {string} Tailwind CSS color class
     */
    const getUsageColor = (usage: string) => {
      if (usage === "Not Available") return "text-[#61738D]";
      const value = parseInt(usage);
      if (isNaN(value)) return "text-[#61738D]";
      if (value >= 80) return "text-[#DC2626]"; // Red for critical
      if (value >= 60) return "text-[#F59E0B]"; // Yellow for warning
      return "text-[#10B981]"; // Green for healthy
    };

    /**
     * Get battery icon and color based on charge level
     * @param {string} battery - Battery percentage as string or "Not Available"
     * @returns {object} Object with icon component, text color, and background color
     */
    const getBatteryDisplay = (battery: string) => {
      if (battery === "Not Available") {
        return {
          icon: BatteryMedium,
          color: "text-[#61738D]",
          bgColor: "bg-[#F3F4F6]",
        };
      }
      const value = parseInt(battery);
      if (isNaN(value)) {
        return {
          icon: BatteryMedium,
          color: "text-[#61738D]",
          bgColor: "bg-[#F3F4F6]",
        };
      }
      if (value >= 60) {
        return {
          icon: BatteryFull,
          color: "text-[#10B981]",
          bgColor: "bg-[#F0FDF4]",
        };
      }
      if (value >= 20) {
        return {
          icon: BatteryMedium,
          color: "text-[#F59E0B]",
          bgColor: "bg-[#FEF3C7]",
        };
      }
      return {
        icon: BatteryLow,
        color: "text-[#DC2626]",
        bgColor: "bg-[#FEE2E2]",
      };
    };

    const batteryDisplay = getBatteryDisplay(
      diagnostics.batteryPercentage || "Not Available"
    );
    const BatteryIcon = batteryDisplay.icon;

    /**
     * Get section health status icon and color
     */
    const getSectionHealth = (status?: "healthy" | "warning" | "critical") => {
      switch (status) {
        case "healthy":
          return {
            icon: CheckCircle2,
            color: "text-[#10B981]",
            bgColor: "bg-[#D1FAE5]",
            label: "Healthy",
          };
        case "warning":
          return {
            icon: AlertTriangle,
            color: "text-[#F59E0B]",
            bgColor: "bg-[#FEF3C7]",
            label: "Warning",
          };
        case "critical":
          return {
            icon: AlertCircle,
            color: "text-[#DC2626]",
            bgColor: "bg-[#FEE2E2]",
            label: "Critical",
          };
        default:
          return {
            icon: CheckCircle2,
            color: "text-[#10B981]",
            bgColor: "bg-[#D1FAE5]",
            label: "Healthy",
          };
      }
    };

    const hardwareHealthStatus = getSectionHealth(diagnostics.hardwareHealth);
    const osHealthStatus = getSectionHealth(diagnostics.osHealth);
    const securityHealthStatus = getSectionHealth(diagnostics.securityHealth);
    const servicesHealthStatus = getSectionHealth(
      diagnostics.servicesAppHealth
    );

    return (
      <div className="space-y-6">
        <h3 className="text-sm font-medium text-[#0E162B] mb-4">
          System Diagnostics
        </h3>

        {/* Hardware Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full ${hardwareHealthStatus.bgColor} flex items-center justify-center`}
            >
              <hardwareHealthStatus.icon
                className={`w-4 h-4 ${hardwareHealthStatus.color}`}
              />
            </div>
            <h4 className="text-sm font-semibold text-[#0E162B]">
              Hardware - {hardwareHealthStatus.label}
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CPU Usage */}
            <div className="bg-white border border-[#E1E8F0] rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] flex items-center justify-center">
                  <Cpu
                    className={`w-5 h-5 ${getUsageColor(diagnostics.cpuUsage)}`}
                  />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-[#61738D] mb-1">CPU Usage</div>
                  <div
                    className={`text-2xl font-semibold ${getUsageColor(
                      diagnostics.cpuUsage
                    )}`}
                  >
                    {diagnostics.cpuUsage === "Not Available"
                      ? "Not Available"
                      : `${diagnostics.cpuUsage}%`}
                  </div>
                </div>
              </div>
            </div>

            {/* RAM Usage */}
            <div className="bg-white border border-[#E1E8F0] rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#F0FDF4] flex items-center justify-center">
                  <MemoryStick
                    className={`w-5 h-5 ${getUsageColor(diagnostics.ramUsage)}`}
                  />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-[#61738D] mb-1">RAM Usage</div>
                  <div
                    className={`text-2xl font-semibold ${getUsageColor(
                      diagnostics.ramUsage
                    )}`}
                  >
                    {diagnostics.ramUsage === "Not Available"
                      ? "Not Available"
                      : `${diagnostics.ramUsage}%`}
                  </div>
                </div>
              </div>
            </div>

            {/* Battery Level */}
            <div className="bg-white border border-[#E1E8F0] rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg ${batteryDisplay.bgColor} flex items-center justify-center`}
                >
                  <BatteryIcon className={`w-5 h-5 ${batteryDisplay.color}`} />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-[#61738D] mb-1">
                    Battery Level
                  </div>
                  <div
                    className={`text-2xl font-semibold ${batteryDisplay.color}`}
                  >
                    {diagnostics.batteryPercentage === "Not Available" ||
                    !diagnostics.batteryPercentage
                      ? "Not Available"
                      : `${diagnostics.batteryPercentage}%`}
                  </div>
                </div>
              </div>
            </div>

            {/* Disk Usage */}
            <div className="bg-white border border-[#E1E8F0] rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#FEF3C7] flex items-center justify-center">
                  <HardDrive
                    className={`w-5 h-5 ${getUsageColor(
                      diagnostics.diskUsage
                    )}`}
                  />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-[#61738D] mb-1">Disk Usage</div>
                  <div className="text-2xl font-semibold text-[#0E162B]">
                    {diagnostics.diskUsage === "Not Available"
                      ? "Not Available"
                      : `${diagnostics.diskUsage}%`}
                  </div>
                </div>
              </div>
            </div>

            {/* Network Latency */}
            <div className="bg-white border border-[#E1E8F0] rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#F5F3FF] flex items-center justify-center">
                  <Network className="w-5 h-5 text-[#8B5CF6]" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-[#61738D] mb-1">
                    Network Latency
                  </div>
                  <div className="text-2xl font-semibold text-[#0E162B]">
                    {diagnostics.networkLatency === "Not Available"
                      ? "Not Available"
                      : `${diagnostics.networkLatency} ms`}
                  </div>
                </div>
              </div>
            </div>

            {/* Process Count */}
            <div className="bg-white border border-[#E1E8F0] rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#ECFEFF] flex items-center justify-center">
                  <ListChecks className="w-5 h-5 text-[#06B6D4]" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-[#61738D] mb-1">
                    Process Count
                  </div>
                  <div className="text-2xl font-semibold text-[#0E162B]">
                    {diagnostics.processCount === "Not Available"
                      ? "Not Available"
                      : diagnostics.processCount}
                  </div>
                </div>
              </div>
            </div>

            {/* System Uptime */}
            <div className="bg-white border border-[#E1E8F0] rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#FEE2E2] flex items-center justify-center">
                  <Clock className="w-5 h-5 text-[#EF4444]" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-[#61738D] mb-1">
                    System Uptime
                  </div>
                  <div className="text-lg font-semibold text-[#0E162B]">
                    {diagnostics.uptime === "Not Available"
                      ? "Not Available"
                      : diagnostics.uptime}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Operating System Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full ${osHealthStatus.bgColor} flex items-center justify-center`}
            >
              <osHealthStatus.icon
                className={`w-4 h-4 ${osHealthStatus.color}`}
              />
            </div>
            <h4 className="text-sm font-semibold text-[#0E162B]">
              Operating System - {osHealthStatus.label}
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* OS Build */}
            {diagnostics.osBuild && (
              <div className="bg-white border border-[#E1E8F0] rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#F3F4F6] flex items-center justify-center">
                    <Monitor className="w-5 h-5 text-[#6B7280]" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-[#61738D] mb-1">OS Build</div>
                    <div className="text-lg font-semibold text-[#0E162B]">
                      {diagnostics.osBuild}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Driver Health */}
            {diagnostics.driverHealth && (
              <div className="bg-white border border-[#E1E8F0] rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#EDE9FE] flex items-center justify-center">
                    <Monitor className="w-5 h-5 text-[#7C3AED]" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-[#61738D] mb-1">
                      Driver Health
                    </div>
                    <div className="text-lg font-semibold text-[#0E162B]">
                      {diagnostics.driverHealth}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Restart Status */}
            {diagnostics.restartStatus && (
              <div className="bg-white border border-[#E1E8F0] rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#DBEAFE] flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-[#3B82F6]" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-[#61738D] mb-1">
                      Restart Status
                    </div>
                    <div className="text-lg font-semibold text-[#0E162B]">
                      {diagnostics.restartStatus}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Security Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full ${securityHealthStatus.bgColor} flex items-center justify-center`}
            >
              <securityHealthStatus.icon
                className={`w-4 h-4 ${securityHealthStatus.color}`}
              />
            </div>
            <h4 className="text-sm font-semibold text-[#0E162B]">
              Security - {securityHealthStatus.label}
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Encryption Status */}
            {diagnostics.encryptionStatus && (
              <div className="bg-white border border-[#E1E8F0] rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#D1FAE5] flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-[#10B981]" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-[#61738D] mb-1">
                      Encryption
                    </div>
                    <div className="text-lg font-semibold text-[#0E162B]">
                      {diagnostics.encryptionStatus}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Antivirus Status */}
            {diagnostics.antivirusStatus && (
              <div className="bg-white border border-[#E1E8F0] rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#FEF3C7] flex items-center justify-center">
                    <Shield className="w-5 h-5 text-[#F59E0B]" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-[#61738D] mb-1">Antivirus</div>
                    <div className="text-lg font-semibold text-[#0E162B]">
                      {diagnostics.antivirusStatus}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Vulnerability Scan */}
            {diagnostics.vulnerabilityScan && (
              <div className="bg-white border border-[#E1E8F0] rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#FEE2E2] flex items-center justify-center">
                    <Shield className="w-5 h-5 text-[#DC2626]" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-[#61738D] mb-1">
                      Vulnerability Scan
                    </div>
                    <div className="text-lg font-semibold text-[#0E162B]">
                      {diagnostics.vulnerabilityScan}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Services/App Health Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full ${servicesHealthStatus.bgColor} flex items-center justify-center`}
            >
              <servicesHealthStatus.icon
                className={`w-4 h-4 ${servicesHealthStatus.color}`}
              />
            </div>
            <h4 className="text-sm font-semibold text-[#0E162B]">
              Services/App Health - {servicesHealthStatus.label}
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Services Health */}
            {diagnostics.servicesHealth && (
              <div className="bg-white border border-[#E1E8F0] rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#E0E7FF] flex items-center justify-center">
                    <AppWindow className="w-5 h-5 text-[#6366F1]" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-[#61738D] mb-1">
                      Services Health
                    </div>
                    <div className="text-lg font-semibold text-[#0E162B]">
                      {diagnostics.servicesHealth}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Running Applications */}
            {diagnostics.runningApps && (
              <div className="bg-white border border-[#E1E8F0] rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#FCE7F3] flex items-center justify-center">
                    <AppWindow className="w-5 h-5 text-[#EC4899]" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-[#61738D] mb-1">
                      Running Apps
                    </div>
                    <div className="text-lg font-semibold text-[#0E162B]">
                      {diagnostics.runningApps}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* PC Local Logs - Only shown if issues found */}
        {diagnostics.pcLogs && diagnostics.pcLogs.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#FEE2E2] flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-[#DC2626]" />
              </div>
              <h4 className="text-sm font-semibold text-[#0E162B]">
                PC Local Logs - Issues Detected
              </h4>
            </div>
            <div className="space-y-2">
              {diagnostics.pcLogs.map((log, index) => (
                <div
                  key={index}
                  className={`bg-white border rounded-lg p-3 ${
                    log.severity === "error"
                      ? "border-[#FCA5A5] bg-[#FEF2F2]"
                      : log.severity === "warning"
                      ? "border-[#FCD34D] bg-[#FFFBEB]"
                      : "border-[#E1E8F0] bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        log.severity === "error"
                          ? "bg-[#FEE2E2]"
                          : log.severity === "warning"
                          ? "bg-[#FEF3C7]"
                          : "bg-[#DBEAFE]"
                      }`}
                    >
                      <FileText
                        className={`w-4 h-4 ${
                          log.severity === "error"
                            ? "text-[#DC2626]"
                            : log.severity === "warning"
                            ? "text-[#F59E0B]"
                            : "text-[#3B82F6]"
                        }`}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-xs font-medium uppercase ${
                            log.severity === "error"
                              ? "text-[#DC2626]"
                              : log.severity === "warning"
                              ? "text-[#F59E0B]"
                              : "text-[#3B82F6]"
                          }`}
                        >
                          {log.severity}
                        </span>
                        <span className="text-xs text-[#61738D]">
                          {log.timestamp}
                        </span>
                      </div>
                      <div className="text-sm text-[#0E162B] font-medium mb-1">
                        {log.source}
                      </div>
                      <div className="text-xs text-[#61738D]">
                        {log.message}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Applications with Issues */}
        {diagnostics.appsWithIssues &&
          diagnostics.appsWithIssues.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#FEF3C7] flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
                </div>
                <h4 className="text-sm font-semibold text-[#0E162B]">
                  Applications with Issues
                </h4>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {diagnostics.appsWithIssues.map((app, index) => (
                  <div
                    key={index}
                    className={`bg-white border rounded-lg p-4 ${
                      app.severity === "critical"
                        ? "border-[#FCA5A5] bg-[#FEF2F2]"
                        : "border-[#FCD34D] bg-[#FFFBEB]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          app.severity === "critical"
                            ? "bg-[#FEE2E2]"
                            : "bg-[#FEF3C7]"
                        }`}
                      >
                        <AppWindow
                          className={`w-5 h-5 ${
                            app.severity === "critical"
                              ? "text-[#DC2626]"
                              : "text-[#F59E0B]"
                          }`}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="text-sm font-semibold text-[#0E162B]">
                            {app.name}
                          </div>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              app.severity === "critical"
                                ? "bg-[#FEE2E2] text-[#DC2626]"
                                : "bg-[#FEF3C7] text-[#F59E0B]"
                            }`}
                          >
                            {app.severity.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-xs text-[#61738D]">
                          {app.issue}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
      </div>
    );
  }
);

DiagnosticsPanel.displayName = "DiagnosticsPanel";
