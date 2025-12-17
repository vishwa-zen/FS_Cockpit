import React from "react";
import { Badge } from "../../components/ui/badge";
import { TicketIcon } from "lucide-react";

export interface IncidentCardProps {
  incidentNumber: string;
  title: string;
  status: string;
  priority: string;
  userDisplayName: string;
  deviceName: string;
  created: string;
  assignedTo: string;
  category: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  activityLogExpanded?: boolean;
  onActivityLogToggle?: () => void;
  children?: React.ReactNode;
}

export const IncidentCard: React.FC<IncidentCardProps> = ({
  incidentNumber,
  title,
  status,
  priority,
  userDisplayName,
  deviceName,
  created,
  assignedTo,
  category,
  activeTab,
  onTabChange,
  activityLogExpanded: _activityLogExpanded = false,
  onActivityLogToggle: _onActivityLogToggle,
  children,
}) => {
  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes("progress"))
      return "bg-[#FFF4E6] text-[#F57C00] border-[#F57C00]/20";
    if (statusLower.includes("resolved"))
      return "bg-[#E8F5E9] text-[#2E7D32] border-[#2E7D32]/20";
    if (statusLower.includes("open"))
      return "bg-[#E3F2FD] text-[#1976D2] border-[#1976D2]/20";
    return "bg-gray-100 text-gray-700 border-gray-300";
  };

  const getPriorityColor = (priority: string) => {
    const priorityLower = priority.toLowerCase();
    if (priorityLower === "high")
      return "bg-[#FFEBEE] text-[#C62828] border-[#C62828]/20";
    if (priorityLower === "medium")
      return "bg-[#FFF3E0] text-[#EF6C00] border-[#EF6C00]/20";
    return "bg-[#F3F4F6] text-[#61738D] border-[#61738D]/20";
  };

  return (
    <div className="bg-white rounded-[24px] overflow-hidden w-full min-w-0 shadow-[0px_2px_40px_0px_rgba(15,23,42,0.12)]">
      <div className="px-6 py-4 w-full min-w-0 space-y-7">
        {/* gap-28 = space-y-7 (28px) */}
        {/* Header: Ticket Badge + Tabs on the right */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-3 sm:gap-4">
          <div className="flex items-center gap-2 bg-[#EFF6FF] px-3 py-1.5 rounded-md border border-[#BFDBFE]">
            <TicketIcon className="w-4 h-4 text-[#3B82F6]" />
            <span className="font-semibold text-[#1E40AF] text-sm">
              {incidentNumber}
            </span>
          </div>

          {/* Tabs - Horizontally aligned on the right, scrollable on small screens */}
          <div className="flex items-center gap-1 bg-[#EFF3FF] p-1 rounded-full h-9 overflow-x-auto w-full sm:w-auto">
            <button
              onClick={() => onTabChange("ticket-details")}
              className={`[font-family:'Arial-Regular',Helvetica] px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-normal rounded-full transition-all whitespace-nowrap ${
                activeTab === "ticket-details"
                  ? "bg-white text-[#3B82F6] shadow-sm"
                  : "text-[#61738D] hover:text-[#0E162B]"
              }`}
            >
              Ticket Details
            </button>
            <button
              onClick={() => onTabChange("diagnostics")}
              className={`[font-family:'Arial-Regular',Helvetica] px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-normal rounded-full transition-all whitespace-nowrap ${
                activeTab === "diagnostics"
                  ? "bg-white text-[#3B82F6] shadow-sm"
                  : "text-[#61738D] hover:text-[#0E162B]"
              }`}
            >
              Diagnostics
            </button>
            <button
              onClick={() => onTabChange("device-user-details")}
              className={`[font-family:'Arial-Regular',Helvetica] px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-normal rounded-full transition-all whitespace-nowrap ${
                activeTab === "device-user-details"
                  ? "bg-white text-[#3B82F6] shadow-sm"
                  : "text-[#61738D] hover:text-[#0E162B]"
              }`}
            >
              Device & User Details
            </button>
          </div>
        </div>

        {/* Title - Always visible */}
        <h2 className="[font-family:'Arial-Regular',Helvetica] text-[#0E162B] text-sm sm:text-base font-normal mb-4 sm:mb-6 leading-relaxed">
          {title}
        </h2>

        {/* Ticket Details Grid - Show only in ticket-details tab */}
        {activeTab === "ticket-details" && (
          <div className="bg-[#F9FAFB] border border-[#E2E8F0] rounded-[18px] p-3 sm:p-4 mb-4 sm:mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 sm:gap-x-6 lg:gap-x-8 gap-y-3 sm:gap-y-4">
              {/* User Display Name */}
              <div>
                <div className="[font-family:'Arial-Regular',Helvetica] text-[#61738D] text-xs font-medium mb-1">
                  User Display Name
                </div>
                <div className="[font-family:'Arial-Regular',Helvetica] text-[#0E162B] text-sm font-medium">
                  {userDisplayName}
                </div>
              </div>

              {/* Device Name */}
              <div>
                <div className="[font-family:'Arial-Regular',Helvetica] text-[#61738D] text-xs font-medium mb-1">
                  Device Name
                </div>
                <div className="[font-family:'Arial-Regular',Helvetica] text-[#0E162B] text-sm font-medium">
                  {deviceName}
                </div>
              </div>

              {/* Status */}
              <div>
                <div className="[font-family:'Arial-Regular',Helvetica] text-[#61738D] text-xs font-medium mb-1">
                  Status
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    className={`${getStatusColor(
                      status
                    )} [font-family:'Arial-Regular',Helvetica] px-2 py-0.5 text-xs font-medium rounded border`}
                  >
                    {status}
                  </Badge>
                  <Badge
                    className={`${getPriorityColor(
                      priority
                    )} [font-family:'Arial-Regular',Helvetica] px-2 py-0.5 text-xs font-medium rounded border`}
                  >
                    {priority}
                  </Badge>
                </div>
              </div>

              {/* Created */}
              <div>
                <div className="[font-family:'Arial-Regular',Helvetica] text-[#61738D] text-xs font-medium mb-1">
                  Created
                </div>
                <div className="[font-family:'Arial-Regular',Helvetica] text-[#0E162B] text-sm">
                  {created}
                </div>
              </div>

              {/* Assigned To */}
              <div>
                <div className="[font-family:'Arial-Regular',Helvetica] text-[#61738D] text-xs font-medium mb-1">
                  Assigned To
                </div>
                <div className="[font-family:'Arial-Regular',Helvetica] text-[#0E162B] text-sm">
                  {assignedTo}
                </div>
              </div>

              {/* Type */}
              <div>
                <div className="[font-family:'Arial-Regular',Helvetica] text-[#61738D] text-xs font-medium mb-1">
                  Type
                </div>
                <div className="[font-family:'Arial-Regular',Helvetica] text-[#0E162B] text-sm">
                  {category}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content - Rendered inside the card */}
        <div className="w-full min-w-0">{children}</div>
      </div>
    </div>
  );
};
