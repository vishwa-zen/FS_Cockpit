import React from "react";
import { Badge } from "../../components/ui/badge";
import { TicketIcon } from "lucide-react";

export interface IncidentHeaderProps {
  incidentNumber: string;
  title: string;
  status: string;
  priority: string;
  userDisplayName: string;
  deviceName: string;
  created: string;
  assignedTo: string;
  category: string;
}

export const IncidentHeader: React.FC<IncidentHeaderProps> = ({
  incidentNumber,
  title,
  status,
  priority,
  userDisplayName,
  deviceName,
  created,
  assignedTo,
  category,
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
    <div className="bg-white border border-[#E1E8F0] rounded-lg p-6">
      {/* Ticket Number Badge */}
      <div className="flex items-start gap-3 mb-4">
        <div className="flex items-center gap-2 bg-[#EFF6FF] px-3 py-1.5 rounded-md border border-[#BFDBFE]">
          <TicketIcon className="w-4 h-4 text-[#3B82F6]" />
          <span className="font-semibold text-[#1E40AF] text-sm">
            {incidentNumber}
          </span>
        </div>
      </div>

      {/* Title */}
      <h2 className="text-[#0E162B] text-base font-normal mb-6 leading-relaxed">
        {title}
      </h2>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-4">
        {/* User Display Name */}
        <div>
          <div className="text-[#61738D] text-xs font-medium mb-1">
            User Display Name
          </div>
          <div className="text-[#0E162B] text-sm font-medium">
            {userDisplayName}
          </div>
        </div>

        {/* Device Name */}
        <div>
          <div className="text-[#61738D] text-xs font-medium mb-1">
            Device Name
          </div>
          <div className="text-[#0E162B] text-sm font-medium">{deviceName}</div>
        </div>

        {/* Status */}
        <div>
          <div className="text-[#61738D] text-xs font-medium mb-1">Status</div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              className={`${getStatusColor(
                status
              )} px-2 py-0.5 text-xs font-medium rounded border`}
            >
              {status}
            </Badge>
            <Badge
              className={`${getPriorityColor(
                priority
              )} px-2 py-0.5 text-xs font-medium rounded border`}
            >
              {priority}
            </Badge>
          </div>
        </div>

        {/* Created */}
        <div>
          <div className="text-[#61738D] text-xs font-medium mb-1">Created</div>
          <div className="text-[#0E162B] text-sm">{created}</div>
        </div>

        {/* Assigned To */}
        <div>
          <div className="text-[#61738D] text-xs font-medium mb-1">
            Assigned To
          </div>
          <div className="text-[#0E162B] text-sm">{assignedTo}</div>
        </div>

        {/* Type */}
        <div>
          <div className="text-[#61738D] text-xs font-medium mb-1">Type</div>
          <div className="text-[#0E162B] text-sm">{category}</div>
        </div>
      </div>
    </div>
  );
};
