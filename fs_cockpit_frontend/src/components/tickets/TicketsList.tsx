/**
 * @fileoverview TicketsList Component
 *
 * Displays a scrollable list of incident tickets with summary information.
 * Optimized with React.memo for performance when rendering large ticket lists.
 *
 * Features:
 * - Compact card layout with ticket ID, title, status, priority
 * - Device name display with icon
 * - Relative time display (e.g., "2 hours ago")
 * - Visual selection highlighting with blue background
 * - Hover effects for better UX
 * - Responsive text sizing for mobile/desktop
 * - Badge color coding for status and priority
 * - Accessible ARIA attributes for screen readers
 * - Text truncation for long titles with title tooltip
 *
 * Layout:
 * - Left side: Ticket ID (blue link), status badge, title, device info
 * - Right side: Time ago, priority badge
 * - Selected state: Blue background (#EFF6FF) with blue border (#3B82F6)
 * - Hover state: Light gray background (#F8F9FB)
 *
 * Performance:
 * - Memoized with React.memo to prevent unnecessary re-renders
 * - Only re-renders when tickets array, selectedTicketId, or onTicketClick changes
 *
 * @component
 * @example
 * // Basic usage in search results:
 * <TicketsList
 *   tickets={searchResults}
 *   selectedTicketId={selectedId}
 *   onTicketClick={(id) => navigate(\`/home/\${id}\`)}
 * />
 *
 * @example
 * // With filtered/sorted tickets:
 * <TicketsList
 *   tickets={filteredAndSortedTickets}
 *   selectedTicketId={params.id}
 *   onTicketClick={handleTicketClick}
 * />
 */

import React from "react";
import { MonitorIcon, ClockIcon } from "lucide-react";
import { Badge } from "@ui/badge";
import { formatPriority, formatStatus } from "@lib/utils";

/**
 * Ticket data structure for list display
 *
 * @interface Ticket
 * @property {string} id - Ticket identifier (e.g., INC0012345)
 * @property {string} status - Current status (New, In Progress, Resolved, etc.)
 * @property {string} [statusColor] - Tailwind CSS classes for status badge
 * @property {string} title - Short description of the issue
 * @property {string} [time] - Relative time string (e.g., \"2 hours ago\")
 * @property {string} [device] - Associated device name
 * @property {string} [priority] - Priority level (High, Medium, Low)
 * @property {string} [priorityColor] - Tailwind CSS classes for priority badge
 */
interface Ticket {
  id: string;
  status: string;
  statusColor?: string;
  title: string;
  time?: string;
  device?: string;
  priority?: string;
  priorityColor?: string;
}

/**
 * Props for TicketsList component
 *
 * @interface TicketsListProps
 * @property {Ticket[]} tickets - Array of tickets to display
 * @property {string | null} [selectedTicketId] - Currently selected ticket ID for highlighting
 * @property {(ticketId: string) => void} onTicketClick - Callback when ticket is clicked
 */
export interface TicketsListProps {
  tickets: Ticket[];
  selectedTicketId?: string | null;
  onTicketClick: (ticketId: string) => void;
}

/**
 * TicketsList Component
 *
 * Renders a list of incident tickets with click handling and selection state.
 * Memoized to prevent re-renders when parent component updates but ticket data hasn't changed.
 *
 * Accessibility:
 * - role=\"list\" for semantic list structure
 * - role=\"listitem\" for each ticket
 * - tabIndex={0} for keyboard navigation
 * - aria-selected for screen reader support
 *
 * Responsive Design:
 * - Mobile (sm): Smaller fonts (text-xs), compact spacing (gap-1.5)
 * - Desktop: Larger fonts (text-sm), standard spacing (gap-2)
 * - Icons scale from 2.5h/w to 3h/w on larger screens
 *
 * @param {TicketsListProps} props - Component props
 * @returns {JSX.Element} Rendered list of tickets
 */
const TicketsList = React.memo(
  ({ tickets, selectedTicketId, onTicketClick }: TicketsListProps) => {
    return (
      <div className="flex flex-col gap-1.5 sm:gap-2" role="list">
        {tickets.map((ticket) => {
          const isSelected = selectedTicketId === ticket.id;
          return (
            <article
              key={ticket.id}
              onClick={() => onTicketClick(ticket.id)}
              role="listitem"
              tabIndex={0}
              aria-selected={isSelected}
              className={`flex items-stretch justify-between cursor-pointer p-1.5 sm:p-2 rounded-lg transition-colors border-[0.67px] ${
                isSelected
                  ? "bg-[#EFF6FF] border-[#3B82F6]"
                  : "border-transparent hover:bg-[#F8F9FB]"
              }`}
            >
              <div className="flex flex-col justify-between gap-1 flex-1 min-w-0">
                <div className="flex flex-col gap-0.5 sm:gap-1 min-w-0">
                  <div className="flex items-end gap-1.5 sm:gap-2 min-w-0">
                    <span
                      className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#155cfb] text-xs sm:text-sm leading-normal truncate"
                      title={ticket.id}
                    >
                      {ticket.id}
                    </span>
                    <Badge
                      className={`h-[18px] sm:h-[21.33px] px-1.5 sm:px-2 py-0.5 rounded-lg border-[0.67px] ${ticket.statusColor} [font-family:'Arial-Regular',Helvetica] font-normal text-[10px] sm:text-xs leading-4 flex-shrink-0`}
                    >
                      {formatStatus(ticket.status)}
                    </Badge>
                  </div>
                  <p
                    className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#0e162b] text-xs sm:text-sm leading-4 sm:leading-5 line-clamp-2"
                    title={ticket.title}
                  >
                    {ticket.title}
                  </p>
                </div>
                <div className="flex items-center gap-1 min-w-0">
                  <MonitorIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#61738d] flex-shrink-0" />
                  <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#61738d] text-[10px] sm:text-xs leading-3 sm:leading-4 flex-shrink-0">
                    Device Name:
                  </span>
                  <span
                    className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#61738d] text-[10px] sm:text-xs leading-3 sm:leading-4 truncate"
                    title={ticket.device || "No device assigned"}
                  >
                    {ticket.device || "Not Available"}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end justify-between gap-0.5 sm:gap-1 pl-1.5 sm:pl-2">
                <div className="flex items-center gap-0.5 sm:gap-1">
                  <ClockIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#61738d]" />
                  <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#61738d] text-[10px] sm:text-xs leading-3 sm:leading-4 whitespace-nowrap">
                    {ticket.time}
                  </span>
                </div>
                {ticket.priority && (
                  <Badge
                    className={`h-[18px] sm:h-[21.33px] px-1.5 sm:px-2 py-0.5 rounded-lg border-[0.67px] ${ticket.priorityColor} [font-family:'Arial-Regular',Helvetica] font-normal text-[10px] sm:text-xs leading-4 whitespace-nowrap flex-shrink-0`}
                    title={formatPriority(ticket.priority)}
                  >
                    {formatPriority(ticket.priority)}
                  </Badge>
                )}
              </div>
            </article>
          );
        })}
      </div>
    );
  }
);

TicketsList.displayName = "TicketsList";

export { TicketsList };
