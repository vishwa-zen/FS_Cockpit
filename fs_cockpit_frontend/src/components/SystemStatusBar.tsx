/**
 * @fileoverview System Status Bar Component
 *
 * Footer component displaying real-time health status of backend services.
 * Shows ServiceNow, Intune, and NextThink service availability with
 * expandable metrics panel for detailed uptime/downtime statistics.
 *
 * Features:
 * - Real-time health status indicators
 * - Color-coded status (green=healthy, red=unhealthy)
 * - Expandable metrics panel with uptime percentages
 * - Auto-refresh every 2 hours
 * - Parallel API calls for efficient health checks
 *
 * @module components/SystemStatusBar
 * @requires lucide-react - Icon components
 * @requires services/api - Health check API
 */

import { useState, useEffect, useCallback } from "react";
import { InfoIcon, ChevronUp } from "lucide-react";
import { Button } from "@ui/button";
import { healthAPI, ServiceMetrics } from "@services/api";

/**
 * System Status Interface
 *
 * Represents the health status of a single backend service
 *
 * @interface SystemStatus
 * @property {string} name - Service display name (ServiceNow, Intune, NextThink)
 * @property {"healthy" | "unhealthy"} status - Current health status
 * @property {string} color - Tailwind background color class for status indicator
 */
interface SystemStatus {
  name: string;
  status: "healthy" | "unhealthy";
  color: string;
}

/**
 * System Status Bar Component
 *
 * Displays real-time health status of all backend services in a footer bar.
 * Supports expansion to show detailed metrics including uptime percentages,
 * downtime minutes, and total health checks performed.
 *
 * @component
 * @returns {JSX.Element} System status footer with expandable metrics
 *
 * @example
 * // Basic usage in app layout
 * <main>
 *   <YourPageContent />
 *   <SystemStatusBar />
 * </main>
 *
 * @example
 * // Status indicators update every 2 hours automatically
 * // Users can click to expand for detailed metrics
 */
export const SystemStatusBar = () => {
  const [systemStatuses, setSystemStatuses] = useState<SystemStatus[]>([
    { name: "ServiceNow", status: "healthy", color: "bg-status-success" },
    { name: "Intune", status: "healthy", color: "bg-status-success" },
    { name: "NextThink", status: "healthy", color: "bg-status-success" },
  ]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [metrics, setMetrics] = useState<{
    services?: {
      servicenow?: ServiceMetrics;
      intune?: ServiceMetrics;
      nextthink?: ServiceMetrics;
    };
  } | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);

  /**
   * Fetch Health Status for All Services
   *
   * Performs parallel health checks for ServiceNow, Intune, and NextThink.
   * Updates system status indicators with color-coded results.
   *
   * @async
   * @function fetchHealthStatus
   * @returns {Promise<void>}
   */
  const fetchHealthStatus = useCallback(async () => {
    try {
      const healthResults = await healthAPI.checkAllServicesHealth();

      const updatedStatuses: SystemStatus[] = [
        {
          name: "ServiceNow",
          status:
            healthResults.serviceNow.success &&
            healthResults.serviceNow.data?.status === "healthy"
              ? "healthy"
              : "unhealthy",
          color:
            healthResults.serviceNow.success &&
            healthResults.serviceNow.data?.status === "healthy"
              ? "bg-status-success"
              : "bg-status-error",
        },
        {
          name: "Intune",
          status:
            healthResults.intune.success &&
            healthResults.intune.data?.status === "healthy"
              ? "healthy"
              : "unhealthy",
          color:
            healthResults.intune.success &&
            healthResults.intune.data?.status === "healthy"
              ? "bg-status-success"
              : "bg-status-error",
        },
        {
          name: "NextThink",
          status:
            healthResults.nextThink.success &&
            healthResults.nextThink.data?.status === "healthy"
              ? "healthy"
              : "unhealthy",
          color:
            healthResults.nextThink.success &&
            healthResults.nextThink.data?.status === "healthy"
              ? "bg-status-success"
              : "bg-status-error",
        },
      ];

      setSystemStatuses(updatedStatuses);
    } catch (error) {
      // Silently handle health status fetch errors
    }
  }, []);

  /**
   * Fetch Detailed Metrics for Services
   *
   * Retrieves uptime/downtime statistics for the last 24 hours.
   * Only fetches when metrics panel is expanded to optimize API calls.
   *
   * @async
   * @function fetchMetrics
   * @returns {Promise<void>}
   */
  const fetchMetrics = useCallback(async () => {
    if (!isExpanded) return;

    setIsLoadingMetrics(true);
    try {
      const result = await healthAPI.getHealthMetrics(24);
      if (result.success && result.data) {
        setMetrics({ services: result.data.services });
      }
    } catch (error) {
      // Silently handle errors
    } finally {
      setIsLoadingMetrics(false);
    }
  }, [isExpanded]);

  // Initial health check
  useEffect(() => {
    fetchHealthStatus();
  }, [fetchHealthStatus]);

  // Fetch metrics when expanded
  useEffect(() => {
    if (isExpanded) {
      fetchMetrics();
    }
  }, [isExpanded, fetchMetrics]);

  // Poll every 2 hours (7200000 milliseconds)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchHealthStatus();
      if (isExpanded) {
        fetchMetrics();
      }
    }, 2 * 60 * 60 * 1000); // 2 hours

    return () => clearInterval(interval);
  }, [fetchHealthStatus, fetchMetrics, isExpanded]);

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const formatUptime = (percentage?: number) => {
    if (percentage === undefined || percentage === null || isNaN(percentage))
      return "Not Available";
    return `${percentage.toFixed(2)}%`;
  };

  const getMetricsForService = (serviceName: string): ServiceMetrics | null => {
    if (!metrics?.services) return null;

    const serviceKey =
      serviceName.toLowerCase() as keyof typeof metrics.services;
    return metrics.services[serviceKey] || null;
  };

  return (
    <footer className="flex-shrink-0 flex flex-col px-3 sm:px-4 md:px-6 lg:px-8 bg-surface-white-95 border-t-[0.67px] border-border shadow-[0px_4px_6px_-4px_#0000001a,0px_10px_15px_-3px_#0000001a]">
      {/* Main Status Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-2 gap-2 sm:gap-0 min-h-[41px]">
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 w-full sm:w-auto overflow-x-auto scrollbar-hide">
          <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-text-secondary text-xs leading-4 flex-shrink-0">
            System Status:
          </span>
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-shrink-0">
            {systemStatuses.map((system, index) => (
              <div
                key={`system-${index}`}
                className="flex items-center gap-2 px-2 py-0 rounded"
              >
                <div
                  className={`w-2 h-2 ${system.color} rounded-full opacity-[0.98]`}
                />
                <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-gray-700 text-xs leading-4">
                  {system.name}
                </span>
              </div>
            ))}
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={handleToggleExpand}
          className="h-auto p-0 hover:bg-transparent gap-1 transition-colors"
        >
          <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-text-secondary text-xs leading-4">
            Details
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-text-secondary" />
          ) : (
            <InfoIcon className="w-4 h-4 text-text-secondary" />
          )}
        </Button>
      </div>

      {/* Expanded Metrics View */}
      {isExpanded && (
        <div className="border-t border-border py-2 sm:py-3 animate-in slide-in-from-top-2 duration-200">
          {isLoadingMetrics ? (
            <div className="text-center text-sm text-text-secondary py-2">
              Loading metrics...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {systemStatuses.map((system, index) => {
                const serviceMetrics = getMetricsForService(system.name);
                return (
                  <div
                    key={`metrics-${index}`}
                    className="bg-white rounded-lg border border-border p-3 shadow-sm"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-2 h-2 ${system.color} rounded-full`} />
                      <span className="font-semibold text-sm text-gray-700">
                        {system.name}
                      </span>
                    </div>
                    {serviceMetrics ? (
                      <div className="space-y-1 text-xs text-text-secondary">
                        <div className="flex justify-between">
                          <span>Status:</span>
                          <span className="font-medium text-gray-700">
                            {serviceMetrics.current_status}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Uptime (24h):</span>
                          <span className="font-medium text-status-success">
                            {formatUptime(serviceMetrics.uptime_percentage)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Downtime (24h):</span>
                          <span className="font-medium text-status-error">
                            {formatUptime(serviceMetrics.downtime_percentage)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Checks:</span>
                          <span className="font-medium text-gray-700">
                            {serviceMetrics.total_checks ?? 0}
                          </span>
                        </div>
                        {(serviceMetrics.total_downtime_minutes ?? 0) > 0 && (
                          <div className="flex justify-between">
                            <span>Downtime:</span>
                            <span className="font-medium text-status-error">
                              {serviceMetrics.total_downtime_minutes} min
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-text-secondary">
                        No metrics available
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </footer>
  );
};
