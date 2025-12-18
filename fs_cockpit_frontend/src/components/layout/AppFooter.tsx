/**
 * AppFooter Component
 *
 * Application footer displaying system health status for backend services.
 * Shows color-coded status indicators for ServiceNow, Techyon, NextThink, and Intune/SCCM.
 *
 * Features:
 * - Real-time service health indicators (green=healthy, orange=unhealthy)
 * - Multiple service status display in horizontal layout
 * - "Details" link for expanded health metrics view
 * - Default service configuration with override support
 * - Compact footer design with border separation
 *
 * Status Colors:
 * - Green (#10B981): Service is healthy and operational
 * - Orange (#F59E0B): Service is experiencing issues or down
 *
 * @example
 * // Using default services
 * <AppFooter onDetailsClick={() => setShowHealthModal(true)} />
 *
 * @example
 * // Custom service status
 * <AppFooter
 *   services={[
 *     { name: "ServiceNow", isHealthy: true },
 *     { name: "Intune", isHealthy: false }
 *   ]}
 *   onDetailsClick={handleDetailsClick}
 * />
 */
import React from "react";

/**
 * Service health status data structure
 *
 * @interface ServiceStatus
 */
interface ServiceStatus {
  /** Service name to display */
  name: string;
  /** Whether service is currently healthy */
  isHealthy: boolean;
}

/**
 * Props for the AppFooter component
 *
 * @interface AppFooterProps
 */
interface AppFooterProps {
  /** Array of services with health status (defaults to 4 services if not provided) */
  services?: ServiceStatus[];
  /** Optional callback fired when Details link is clicked */
  onDetailsClick?: () => void;
}

export const AppFooter: React.FC<AppFooterProps> = ({
  services = [
    { name: "ServiceNow", isHealthy: true },
    { name: "Techyon", isHealthy: true },
    { name: "NextThink", isHealthy: false },
    { name: "Intune / SCCM", isHealthy: true },
  ],
  onDetailsClick,
}) => {
  return (
    <div className="border-t border-[#E5E7EB] px-6 py-3 bg-white flex items-center justify-between text-xs text-[#6B7280]">
      <div className="flex items-center gap-4">
        <span>System Status:</span>
        {services.map((service, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                service.isHealthy ? "bg-[#10B981]" : "bg-[#F59E0B]"
              }`}
            ></div>
            <span>{service.name}</span>
          </div>
        ))}
      </div>
      <button
        onClick={onDetailsClick}
        className="text-[#3B82F6] hover:underline"
      >
        Details →
      </button>
    </div>
  );
};
