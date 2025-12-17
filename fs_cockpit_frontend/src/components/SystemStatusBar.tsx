import { useState, useEffect, useCallback } from "react";
import { InfoIcon, ChevronUp } from "lucide-react";
import { Button } from "./ui/button";
import { healthAPI, ServiceMetrics } from "../services/api";

interface SystemStatus {
  name: string;
  status: "healthy" | "unhealthy";
  color: string;
}

export const SystemStatusBar = () => {
  const [systemStatuses, setSystemStatuses] = useState<SystemStatus[]>([
    { name: "ServiceNow", status: "healthy", color: "bg-[#00c950]" },
    { name: "Intune", status: "healthy", color: "bg-[#00c950]" },
    { name: "NextThink", status: "healthy", color: "bg-[#00c950]" },
  ]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [metrics, setMetrics] = useState<{
    servicenow?: ServiceMetrics;
    intune?: ServiceMetrics;
    nextthink?: ServiceMetrics;
  } | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);

  // Fetch health status for all services
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
              ? "bg-[#00c950]"
              : "bg-[#dc2626]",
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
              ? "bg-[#00c950]"
              : "bg-[#dc2626]",
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
              ? "bg-[#00c950]"
              : "bg-[#dc2626]",
        },
      ];

      setSystemStatuses(updatedStatuses);
    } catch (error) {
      console.error("Failed to fetch health status:", error);
    }
  }, []);

  // Fetch metrics when expanded
  const fetchMetrics = useCallback(async () => {
    if (!isExpanded) return;

    setIsLoadingMetrics(true);
    try {
      const result = await healthAPI.getHealthMetrics(24);
      if (result.success && result.data) {
        setMetrics(result.data.services);
      }
    } catch (error) {
      console.error("Failed to fetch metrics:", error);
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
    if (!metrics) return null;

    const serviceKey = serviceName.toLowerCase() as keyof typeof metrics;
    return metrics[serviceKey] || null;
  };

  return (
    <footer className="flex-shrink-0 flex flex-col px-4 md:px-6 lg:px-8 bg-[#fffffff2] border-t-[0.67px] border-[#e1e8f0] shadow-[0px_4px_6px_-4px_#0000001a,0px_10px_15px_-3px_#0000001a]">
      {/* Main Status Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between py-2 md:py-2 min-h-[41px]">
        <div className="flex items-center gap-3 md:gap-6 flex-wrap">
          <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#61738d] text-xs leading-4">
            System Status:
          </span>
          <div className="flex items-center gap-3 md:gap-6 flex-wrap">
            {systemStatuses.map((system, index) => (
              <div
                key={`system-${index}`}
                className="flex items-center gap-2 px-2 py-0 rounded"
              >
                <div
                  className={`w-2 h-2 ${system.color} rounded-full opacity-[0.98]`}
                />
                <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#314157] text-xs leading-4">
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
          <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#61738d] text-xs leading-4">
            Details
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-[#61738d]" />
          ) : (
            <InfoIcon className="w-4 h-4 text-[#61738d]" />
          )}
        </Button>
      </div>

      {/* Expanded Metrics View */}
      {isExpanded && (
        <div className="border-t border-[#e1e8f0] py-3 animate-in slide-in-from-top-2 duration-200">
          {isLoadingMetrics ? (
            <div className="text-center text-sm text-[#61738d] py-2">
              Loading metrics...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {systemStatuses.map((system, index) => {
                const serviceMetrics = getMetricsForService(system.name);
                return (
                  <div
                    key={`metrics-${index}`}
                    className="bg-white rounded-lg border border-[#e1e8f0] p-3 shadow-sm"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-2 h-2 ${system.color} rounded-full`} />
                      <span className="font-semibold text-sm text-[#314157]">
                        {system.name}
                      </span>
                    </div>
                    {serviceMetrics ? (
                      <div className="space-y-1 text-xs text-[#61738d]">
                        <div className="flex justify-between">
                          <span>Status:</span>
                          <span className="font-medium text-[#314157]">
                            {serviceMetrics.current_status}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Uptime (24h):</span>
                          <span className="font-medium text-[#00c950]">
                            {formatUptime(serviceMetrics.uptime_percentage)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Downtime (24h):</span>
                          <span className="font-medium text-[#dc2626]">
                            {formatUptime(serviceMetrics.downtime_percentage)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Checks:</span>
                          <span className="font-medium text-[#314157]">
                            {serviceMetrics.total_checks ?? 0}
                          </span>
                        </div>
                        {(serviceMetrics.total_downtime_minutes ?? 0) > 0 && (
                          <div className="flex justify-between">
                            <span>Downtime:</span>
                            <span className="font-medium text-[#dc2626]">
                              {serviceMetrics.total_downtime_minutes} min
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-[#61738d]">
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
