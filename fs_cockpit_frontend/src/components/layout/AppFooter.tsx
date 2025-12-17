import React from "react";

interface ServiceStatus {
  name: string;
  isHealthy: boolean;
}

interface AppFooterProps {
  services?: ServiceStatus[];
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
