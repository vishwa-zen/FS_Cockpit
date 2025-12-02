import React from "react";
import { Card, CardContent } from "../../../../components/ui/card";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { Progress } from "../../../../components/ui/progress";
import {
  ActionsIcon,
  IncidentIcon,
  KnowledgeIcon,
} from "../../../../components/icons";
import { formatPriority, formatStatus } from "../../../../lib/utils";
import {
  ClockIcon,
  CalendarIcon,
  RefreshCwIcon,
  UserIcon,
  ChevronRightIcon,
  MonitorIcon,
} from "lucide-react";

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

interface TicketDetailsViewProps {
  ticket: Ticket;
}

const rootCauseData = [
  {
    title: "Battery degradation affecting system performance",
    confidence: "85%",
    description:
      "Battery health at 67%, charging limited to 60%, and thermal issues suggest battery degradation impacting overall system performance",
    progress: 85,
  },
  {
    title: "Thermal throttling due to dust buildup",
    confidence: "78%",
    description:
      "User reports device getting hot. Combined with performance issues, suggests CPU throttling due to cooling system obstruction",
    progress: 78,
  },
  {
    title: "Memory leak in background processes",
    confidence: "72%",
    description:
      "Slowness when running multiple applications indicates possible memory management issues",
    progress: 72,
  },
];

const actionsData = [
  {
    title: "Run Hardware Diagnostics",
    priority: "High",
    priorityColor: "bg-[#ffe2e2] text-[#c10007] border-[#ffc9c9]",
    description:
      "Comprehensive hardware test including battery, thermal, and memory diagnostics",
    duration: "15 mins",
    confidence: "95% confidence",
  },
  {
    title: "Check Battery Health & Calibrate",
    priority: "High",
    priorityColor: "bg-[#ffe2e2] text-[#c10007] border-[#ffc9c9]",
    description: "Assess battery degradation and recalibrate charging cycles",
    duration: "10 mins",
    confidence: "88% confidence",
  },
  {
    title: "Clean Cooling System",
    priority: "Medium",
    priorityColor: "bg-[#fef9c2] text-[#a65f00] border-[#feef85]",
    description:
      "Schedule cleaning of fans and heatsink to resolve thermal issues",
    duration: "30 mins",
    confidence: "82% confidence",
  },
];

export const TicketDetailsView: React.FC<TicketDetailsViewProps> = ({
  ticket,
}) => {
  return (
    <div className="flex flex-col gap-6 p-6 w-full h-full overflow-y-auto">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="w-[96px] h-[96px] rounded-[10px] overflow-hidden flex-shrink-0">
            <IncidentIcon />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#070f26] text-2xl leading-9">
                {ticket.id}
              </h1>
              {ticket.priorityColor && ticket.priority && (
                <Badge
                  className={`h-auto px-2 py-0.5 rounded-lg text-xs border-[0.67px] ${ticket.priorityColor}`}
                >
                  {formatPriority(ticket.priority)}
                </Badge>
              )}
              {ticket.statusColor && ticket.status && (
                <Badge
                  className={`h-auto px-2 py-0.5 rounded-lg text-xs ${ticket.statusColor}`}
                >
                  {formatStatus(ticket.status)}
                </Badge>
              )}
            </div>
            <p className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#5876ab] text-sm leading-6">
              {ticket.title}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Card className="p-4 rounded-[10px] border-[0.67px] border-[#e1e8f0] bg-white shadow-sm">
            <CardContent className="p-0 flex flex-col gap-2">
              <p className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#61738d] text-xs leading-4">
                Time in Progress
              </p>
              <p className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#0e162b] text-xl leading-6">
                2d 5h
              </p>
            </CardContent>
          </Card>
          <Card className="p-4 rounded-[10px] border-[0.67px] border-[#e1e8f0] bg-white shadow-sm">
            <CardContent className="p-0 flex flex-col gap-2">
              <p className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#61738d] text-xs leading-4">
                Similar Cases
              </p>
              <p className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#0e162b] text-xl leading-6">
                12
              </p>
            </CardContent>
          </Card>
          <Card className="p-4 rounded-[10px] border-[0.67px] border-[#e1e8f0] bg-white shadow-sm">
            <CardContent className="p-0 flex flex-col gap-2">
              <p className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#61738d] text-xs leading-4">
                Resolution Rate
              </p>
              <p className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#00a63e] text-xl leading-6">
                94%
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex gap-4">
        <Card className="flex-[0_0_50%] p-6 rounded-[14px] border-[0.67px] border-[#e1e8f0] bg-white shadow-sm">
          <CardContent className="p-0 flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <UserIcon className="w-5 h-5" />
              <h3 className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#070f26] text-base leading-6">
                Ticket Details
              </h3>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex gap-3 pb-3 border-b-[0.67px] border-[#e1e8f0]">
                <MonitorIcon className="w-4 h-4 mt-1 text-[#61738d]" />
                <div className="flex flex-col">
                  <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#5876ab] text-xs leading-4">
                    Device
                  </span>
                  <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#070f26] text-sm leading-5">
                    {ticket.device || "N/A"}
                  </span>
                </div>
              </div>
              <div className="flex gap-3 pb-3 border-b-[0.67px] border-[#e1e8f0]">
                <CalendarIcon className="w-4 h-4 mt-1" />
                <div className="flex flex-col">
                  <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#5876ab] text-xs leading-4">
                    Created
                  </span>
                  <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#070f26] text-sm leading-5">
                    2025-11-13 09:23 AM
                  </span>
                </div>
              </div>
              <div className="flex gap-3 pb-3 border-b-[0.67px] border-[#e1e8f0]">
                <RefreshCwIcon className="w-4 h-4 mt-1" />
                <div className="flex flex-col">
                  <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#5876ab] text-xs leading-4">
                    Last Updated
                  </span>
                  <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#070f26] text-sm leading-5">
                    {ticket.time}
                  </span>
                </div>
              </div>
              <div className="flex gap-3">
                <ClockIcon className="w-4 h-4 mt-1" />
                <div className="flex flex-col">
                  <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#5876ab] text-xs leading-4">
                    SLA Status
                  </span>
                  <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#070f26] text-sm leading-5">
                    Within SLA (18 hours remaining)
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex-[0_0_25%] p-6 rounded-[14px] border-[0.67px] border-[#e1e8f0] bg-white shadow-sm">
          <CardContent className="p-0 flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <KnowledgeIcon />
              <h3 className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#070f26] text-base leading-6">
                Knowledge
              </h3>
            </div>
            <div className="flex flex-col gap-4">
              {rootCauseData.map((cause, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-2 pb-4 border-b-[0.67px] border-[#e1e8f0] last:border-0 last:pb-0"
                >
                  <div className="flex items-start justify-between">
                    <p className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#070f26] text-sm leading-5 flex-1">
                      {cause.title}
                    </p>
                    <Badge className="h-auto px-2 py-0.5 rounded-lg text-xs bg-blue-100 text-[#1347e5] border-0">
                      {cause.confidence}
                    </Badge>
                  </div>
                  <p className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#5876ab] text-xs leading-4">
                    {cause.description}
                  </p>
                  <Progress
                    value={cause.progress}
                    className="h-1.5 bg-slate-200 [&>div]:bg-[#0072BC]"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="flex-[0_0_25%] p-6 rounded-[14px] border-[0.67px] border-[#e1e8f0] bg-white shadow-sm">
          <CardContent className="p-0 flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <ActionsIcon />
              <h3 className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#070f26] text-base leading-6">
                Actions
              </h3>
            </div>
            <div className="flex flex-col gap-3">
              {actionsData.map((action, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-3 p-4 bg-[#f8fafc] rounded-lg border-[0.67px] border-[#e1e8f0]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#070F26] text-sm leading-5 flex-1">
                      {action.title}
                    </p>
                    <Badge
                      className={`h-auto px-2 py-0.5 rounded-lg text-xs border-[0.67px] ${action.priorityColor} flex-shrink-0`}
                    >
                      {action.priority}
                    </Badge>
                  </div>
                  <p className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#5876ab] text-xs leading-4">
                    {action.description}
                  </p>
                  <div className="flex flex-col gap-1">
                    <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#90a1b8] text-xs leading-4">
                      {action.duration}
                    </span>
                    <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#90a1b8] text-xs leading-4">
                      {action.confidence}
                    </span>
                  </div>
                  <Button className="w-full h-auto px-4 py-2 rounded-lg bg-[#155cfb] hover:bg-[#1250dc] gap-2">
                    <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-white text-sm">
                      Execute
                    </span>
                    <ChevronRightIcon className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TicketDetailsView;
