import React from "react";
import {
  Cpu,
  HardDrive,
  MemoryStick,
  Network,
  ListChecks,
  Clock,
  Battery,
} from "lucide-react";
import { Progress } from "../../components/ui/progress";

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
}

interface DiagnosticsPanelProps {
  diagnostics: DiagnosticsData;
}

/**
 * DiagnosticsPanel Component
 *
 * Displays system diagnostics with visual progress bars:
 * - CPU Usage: Color-coded based on utilization (green/yellow/red)
 * - RAM Usage: Memory utilization percentage
 * - Disk Usage: Storage consumption percentage
 * - Network Latency: Connection response time
 * - Process Count: Number of running processes
 * - System Uptime: Time since last restart
 *
 * Features:
 * - Color-coded indicators (green < 60%, yellow 60-79%, red ≥ 80%)
 * - Visual progress bars for resource metrics
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
     * Get progress bar color based on resource usage percentage
     * @param {string} usage - Usage percentage as string or "Not Available"
     * @returns {string} Tailwind CSS background color class
     */
    const getProgressColor = (usage: string) => {
      if (usage === "Not Available") return "bg-[#61738D]";
      const value = parseInt(usage);
      if (isNaN(value)) return "bg-[#61738D]";
      if (value >= 80) return "bg-[#DC2626]"; // Red for critical
      if (value >= 60) return "bg-[#F59E0B]"; // Yellow for warning
      return "bg-[#10B981]"; // Green for healthy
    };

    /**
     * Get battery text color (inverted logic - high is good)
     * @param {string} battery - Battery percentage as string
     * @returns {string} Tailwind CSS color class
     */
    const getBatteryUsageColor = (battery: string) => {
      const value = parseInt(battery);
      if (value >= 60) return "text-[#10B981]"; // Green for healthy
      if (value >= 20) return "text-[#F59E0B]"; // Yellow for warning
      return "text-[#DC2626]"; // Red for critical
    };

    /**
     * Get battery progress bar color (inverted logic - high is good)
     * @param {string} battery - Battery percentage as string
     * @returns {string} Tailwind CSS background color class
     */
    const getBatteryProgressColor = (battery: string) => {
      const value = parseInt(battery);
      if (value >= 60) return "bg-[#10B981]"; // Green for healthy
      if (value >= 20) return "bg-[#F59E0B]"; // Yellow for warning
      return "bg-[#DC2626]"; // Red for critical
    };

    return (
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-[#0E162B] mb-4">
          System Diagnostics
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* CPU Usage */}
          <div className="bg-white border border-[#E1E8F0] rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] flex items-center justify-center">
                <Cpu className="w-5 h-5 text-[#3B82F6]" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-[#61738D] mb-1">CPU Usage</div>
                <div
                  className={`text-lg font-semibold ${getUsageColor(
                    diagnostics.cpuUsage
                  )}`}
                >
                  {diagnostics.cpuUsage === "Not Available"
                    ? "Not Available"
                    : `${diagnostics.cpuUsage}%`}
                </div>
              </div>
            </div>
            {diagnostics.cpuUsage !== "Not Available" &&
              parseInt(diagnostics.cpuUsage) > 0 && (
                <div className="relative">
                  <Progress
                    value={parseInt(diagnostics.cpuUsage)}
                    className="h-2 bg-gray-100"
                  />
                  <div
                    className={`absolute top-0 left-0 h-2 rounded-full transition-all ${getProgressColor(
                      diagnostics.cpuUsage
                    )}`}
                    style={{ width: `${diagnostics.cpuUsage}%` }}
                  />
                </div>
              )}
          </div>

          {/* RAM Usage */}
          <div className="bg-white border border-[#E1E8F0] rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-[#F0FDF4] flex items-center justify-center">
                <MemoryStick className="w-5 h-5 text-[#10B981]" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-[#61738D] mb-1">RAM Usage</div>
                <div
                  className={`text-lg font-semibold ${getUsageColor(
                    diagnostics.ramUsage
                  )}`}
                >
                  {diagnostics.ramUsage === "Not Available"
                    ? "Not Available"
                    : `${diagnostics.ramUsage}%`}
                </div>
              </div>
            </div>
            {diagnostics.ramUsage !== "Not Available" &&
              parseInt(diagnostics.ramUsage) > 0 && (
                <div className="relative">
                  <Progress
                    value={parseInt(diagnostics.ramUsage)}
                    className="h-2 bg-gray-100"
                  />
                  <div
                    className={`absolute top-0 left-0 h-2 rounded-full transition-all ${getProgressColor(
                      diagnostics.ramUsage
                    )}`}
                    style={{ width: `${diagnostics.ramUsage}%` }}
                  />
                </div>
              )}
          </div>

          {/* Disk Usage */}
          <div className="bg-white border border-[#E1E8F0] rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-[#FEF3C7] flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-[#F59E0B]" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-[#61738D] mb-1">Disk Usage</div>
                <div
                  className={`text-lg font-semibold ${getUsageColor(
                    diagnostics.diskUsage
                  )}`}
                >
                  {diagnostics.diskUsage === "Not Available"
                    ? "Not Available"
                    : `${diagnostics.diskUsage}%`}
                </div>
              </div>
            </div>
            {diagnostics.diskUsage !== "Not Available" &&
              parseInt(diagnostics.diskUsage) > 0 && (
                <div className="relative">
                  <Progress
                    value={parseInt(diagnostics.diskUsage)}
                    className="h-2 bg-gray-100"
                  />
                  <div
                    className={`absolute top-0 left-0 h-2 rounded-full transition-all ${getProgressColor(
                      diagnostics.diskUsage
                    )}`}
                    style={{ width: `${diagnostics.diskUsage}%` }}
                  />
                </div>
              )}
          </div>

          {/* Battery Percentage */}
          {diagnostics.batteryPercentage && (
            <div className="bg-white border border-[#E1E8F0] rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#FEF3C7] flex items-center justify-center">
                  <Battery className="w-5 h-5 text-[#F59E0B]" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-[#61738D] mb-1">Battery</div>
                  <div
                    className={`text-lg font-semibold ${getBatteryUsageColor(
                      diagnostics.batteryPercentage
                    )}`}
                  >
                    {diagnostics.batteryPercentage}%
                  </div>
                </div>
              </div>
              {parseInt(diagnostics.batteryPercentage) > 0 && (
                <div className="relative">
                  <Progress
                    value={parseInt(diagnostics.batteryPercentage)}
                    className="h-2 bg-gray-100"
                  />
                  <div
                    className={`absolute top-0 left-0 h-2 rounded-full transition-all ${getBatteryProgressColor(
                      diagnostics.batteryPercentage
                    )}`}
                    style={{ width: `${diagnostics.batteryPercentage}%` }}
                  />
                </div>
              )}
            </div>
          )}

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
                <div className="text-lg font-semibold text-[#0E162B]">
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
              <div className="w-10 h-10 rounded-lg bg-[#FEE2E2] flex items-center justify-center">
                <ListChecks className="w-5 h-5 text-[#DC2626]" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-[#61738D] mb-1">
                  Running Processes
                </div>
                <div className="text-lg font-semibold text-[#0E162B]">
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
              <div className="w-10 h-10 rounded-lg bg-[#E0F2FE] flex items-center justify-center">
                <Clock className="w-5 h-5 text-[#0284C7]" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-[#61738D] mb-1">System Uptime</div>
                <div className="text-lg font-semibold text-[#0E162B]">
                  {diagnostics.uptime}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

DiagnosticsPanel.displayName = "DiagnosticsPanel";
