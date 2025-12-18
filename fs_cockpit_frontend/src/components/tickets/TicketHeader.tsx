/**
 * TicketHeader Component
 *
 * Displays ticket header information with metadata grid.
 * Shows ticket number badge, title, and key details in a responsive grid layout.
 *
 * Features:
 * - Ticket number badge with icon
 * - Title display
 * - Responsive info grid (1 column mobile, 2-4 columns desktop)
 * - Color-coded status and priority badges
 * - Metadata: user, device, status, created date, assigned to, type
 *
 * @example
 * <TicketHeader
 *   ticketNumber="INC0012345"
 *   title="Laptop not connecting to WiFi"
 *   userDisplayName="John Doe"
 *   deviceName="LAPTOP-ABC123"
 *   status="In Progress"
 *   createdDate="2025-12-18"
 *   assignedTo="Jane Smith"
 *   type="Network"
 * />
 */
import React from "react";
import { Badge } from "@ui/badge";
import { TicketIcon } from "@components/icons";

/**
 * Props for the TicketHeader component
 *
 * @interface TicketHeaderProps
 */
interface TicketHeaderProps {
  /** Ticket identifier (e.g., INC0012345) */
  ticketNumber: string;
  /** Ticket title/short description */
  title: string;
  /** User's display name who opened ticket */
  userDisplayName: string;
  /** Associated device name */
  deviceName: string;
  /** Current ticket status */
  status: string;
  /** Ticket creation date */
  createdDate: string;
  /** Technician assigned to ticket */
  assignedTo: string;
  /** Ticket category/type */
  type: string;
}

export const TicketHeader: React.FC<TicketHeaderProps> = ({
  ticketNumber,
  title,
  userDisplayName,
  deviceName,
  status,
  createdDate,
  assignedTo,
  type,
}) => {
  /**
   * Get status badge color classes
   * @param {string} status - Ticket status
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
    <div className="bg-white border border-[#E1E8F0] rounded-lg p-6 mb-6">
      {/* Ticket Number and Title */}
      <div className="flex items-start gap-3 mb-6">
        <div className="flex items-center gap-2 bg-[#EFF6FF] px-3 py-1.5 rounded-md border border-[#3B82F6]/20">
          <TicketIcon className="w-4 h-4 text-[#3B82F6]" />
          <span className="[font-family:'Arial-Regular',Helvetica] font-semibold text-[#1E40AF] text-sm">
            {ticketNumber}
          </span>
        </div>
      </div>
      <h2 className="[font-family:'Arial-Regular',Helvetica] text-[#0E162B] text-base font-normal mb-6 leading-relaxed">
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
          <div className="flex items-center gap-2">
            <Badge
              className={`${getStatusColor(
                status
              )} px-2 py-0.5 text-xs font-medium rounded border`}
            >
              {status}
            </Badge>
            <Badge
              className={
                getPriorityColor("High") +
                " px-2 py-0.5 text-xs font-medium rounded border"
              }
            >
              High
            </Badge>
          </div>
        </div>

        {/* Created */}
        <div>
          <div className="text-[#61738D] text-xs font-medium mb-1">Created</div>
          <div className="text-[#0E162B] text-sm">{createdDate}</div>
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
          <div className="text-[#0E162B] text-sm">{type}</div>
        </div>
      </div>
    </div>
  );
};
