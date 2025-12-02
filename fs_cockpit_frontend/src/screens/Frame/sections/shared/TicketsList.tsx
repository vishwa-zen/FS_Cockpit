import React from "react";
import { MonitorIcon, ClockIcon } from "lucide-react";
import { Badge } from "../../../../components/ui/badge";

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

export interface TicketsListProps {
  tickets: Ticket[];
  selectedTicketId?: string | null;
  onTicketClick: (ticketId: string) => void;
}

export const TicketsList = ({
  tickets,
  selectedTicketId,
  onTicketClick,
}: TicketsListProps) => {
  return (
    <div className="flex flex-col gap-2" role="list">
      {tickets.map((ticket) => {
        const isSelected = selectedTicketId === ticket.id;
        return (
          <article
            key={ticket.id}
            onClick={() => onTicketClick(ticket.id)}
            role="listitem"
            tabIndex={0}
            aria-selected={isSelected}
            className={`flex items-start justify-between cursor-pointer p-2 rounded-lg transition-colors border-[0.67px] ${
              isSelected
                ? "bg-blue-50 border-[#60a5fa]"
                : "border-transparent hover:bg-slate-50"
            }`}
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-end gap-2">
                <span className="font-mono font-normal text-[#155cfb] text-sm leading-normal">
                  {ticket.id}
                </span>
                <Badge
                  className={`h-[21.33px] px-2 py-0.5 rounded-lg border-[0.67px] ${ticket.statusColor} [font-family:'Arial-Regular',Helvetica] font-normal text-xs leading-4`}
                >
                  {ticket.status}
                </Badge>
              </div>
              <p className="font-sans font-normal text-[#0e162b] text-sm leading-5">
                {ticket.title}
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <MonitorIcon className="w-3 h-3 text-[#61738d]" />
                  <span className="font-sans font-normal text-[#61738d] text-xs leading-4">
                    {ticket.device}
                  </span>
                </div>
                <Badge
                  className={`h-[21.33px] px-2 py-0.5 rounded-lg border-[0.67px] ${ticket.priorityColor} [font-family:'Arial-Regular',Helvetica] font-normal text-xs leading-4`}
                >
                  {ticket.priority}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <ClockIcon className="w-3 h-3 text-[#61738d]" />
              <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#61738d] text-xs leading-4">
                {ticket.time}
              </span>
            </div>
          </article>
        );
      })}
    </div>
  );
};

export default TicketsList;
