/**
 * IncidentHeader Component
 *
 * Displays incident header with ticket badge, title, and metadata grid.
 * Similar to TicketHeader but with different styling and layout structure.
 *
 * Features:
 * - Incident number badge with icon
 * - Title display with better spacing
 * - Responsive metadata grid (1-4 columns)
 * - Color-coded status and priority badges
 * - Complete incident metadata display
 *
 * @example
 * <IncidentHeader
 *   incidentNumber="INC0012345"
 *   title="Cannot access email"
 *   status="Open"
 *   priority="High"
 *   userDisplayName="John Doe"
 *   deviceName="LAPTOP-ABC123"
 *   created="2025-12-18T10:00:00Z"
 *   assignedTo="Support Team"
 *   category="Email"
 * />
 */
import React from "react";
import { Badge } from "@ui/badge";
import { TicketIcon } from "lucide-react";

/**
 * Props for the IncidentHeader component
 *
 * @interface IncidentHeaderProps
 */
export interface IncidentHeaderProps {
  /** Incident number (e.g., INC0012345) */
  incidentNumber: string;
  /** Incident title/description */
  title: string;
  /** Current status */
  status: string;
  /** Priority level */
  priority: string;
  /** User who reported incident */
  userDisplayName: string;
  /** Associated device */
  deviceName: string;
  /** Creation timestamp */
  created: string;
  /** Assigned technician */
  assignedTo: string;
  /** Incident category */
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
  /**
   * Get status badge color classes
   * @param {string} status - Incident status
   * @returns {string} Tailwind CSS classes
   */
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

  /**
   * Get priority badge color classes
   * @param {string} priority - Priority level
   * @returns {string} Tailwind CSS classes
   */
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
