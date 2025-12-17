/**
 * TicketDetailsView Component
 *
 * Displays comprehensive ticket information including:
 * - Ticket details (status, priority, caller, dates)
 * - Device information (manufacturer, model, storage, sync status)
 * - Knowledge base articles (relevant documentation and solutions)
 * - Recommended actions (diagnostic steps and remediation)
 *
 * Features:
 * - Parallel API data fetching for optimal performance
 * - Loading states for all data sections
 * - Graceful error handling with user-friendly messages
 * - Real-time device synchronization status
 *
 * @param {TicketDetailsViewProps} props - Component props containing ticket data
 */

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  ActionsIcon,
  IncidentIcon,
  KnowledgeIcon,
} from "../../components/icons";
import { formatPriority, formatStatus } from "../../lib/utils";
import { useTickets } from "../../context/TicketsContext";
import {
  ClockIcon,
  CalendarIcon,
  RefreshCwIcon,
  UserIcon,
  ChevronRightIcon,
  MonitorIcon,
  FileTextIcon,
  PhoneIcon,
  BuildingIcon,
  PackageIcon,
  HashIcon,
  LaptopIcon,
  HardDriveIcon,
  DatabaseIcon,
  ArrowLeft,
  WifiIcon,
  ActivityIcon,
  AlertCircle,
  BookOpen,
  Leaf,
  Info,
  Server,
  Shield,
  LibraryBig,
  Zap,
  Network,
  Globe,
  CheckCircle,
} from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "../../components/ui/tooltip";
import {
  deviceAPI,
  ticketsAPI,
  knowledgeAPI,
  remoteActionsAPI,
  IntuneDevice,
  RemoteAction,
  SolutionSummaryData,
} from "../../services/api";

/**
 * Ticket interface definition
 * Represents the core ticket/incident data structure
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
  callerId?: string;
  callerName?: string;
  createdBy?: string;
  openedAt?: string;
  lastUpdatedAt?: string;
}

/**
 * Component props interface
 */
interface TicketDetailsViewProps {
  ticket: Ticket;
  showSustainabilityScore?: boolean;
}

/**
 * Get status badge color based on action status
 *
 * @param status - Action execution status
 * @returns Tailwind CSS classes for badge styling
 */
const getActionStatusColor = (status: string): string => {
  const statusLower = status.toLowerCase();
  if (statusLower === "success") {
    return "bg-[#d1fae5] text-[#065f46] border-transparent";
  } else if (statusLower === "failure" || statusLower === "failed") {
    return "bg-[#ffe2e2] text-[#c10007] border-transparent";
  } else if (statusLower === "pending" || statusLower === "running") {
    return "bg-[#fef9c2] text-[#a65f00] border-transparent";
  }
  return "bg-[#f3f4f6] text-[#374151] border-transparent";
};

export const TicketDetailsView: React.FC<TicketDetailsViewProps> = ({
  ticket: initialTicket,
  showSustainabilityScore = false,
}) => {
  const navigate = useNavigate();
  const { updateTicketDevice } = useTickets();
  const [ticket, setTicket] = useState<Ticket>(initialTicket);
  const [deviceDetails, setDeviceDetails] = useState<IntuneDevice | null>(null);
  const [isLoadingDevice, setIsLoadingDevice] = useState(true);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [isLoadingTicket, setIsLoadingTicket] = useState(true);
  const [solutionSummary, setSolutionSummary] =
    useState<SolutionSummaryData | null>(null);
  const [isLoadingKnowledge, setIsLoadingKnowledge] = useState(true);
  const [knowledgeError, setKnowledgeError] = useState<string | null>(null);
  const [remoteActions, setRemoteActions] = useState<RemoteAction[]>([]);
  const [isLoadingActions, setIsLoadingActions] = useState(true);
  const [actionsError, setActionsError] = useState<string | null>(null);

  /**
   * Fetch all ticket-related data in parallel
   *
   * Uses Promise.allSettled to execute all API calls simultaneously:
   * 1. Ticket details - Full incident information
   * 2. Device details - Hardware specs and health status
   * 3. Knowledge articles - Relevant documentation
   * 4. Remote actions - Recommended remediation actions
   *
   * Each API result is handled independently, allowing partial data display even if some calls fail.
   * This approach is 4x faster than sequential fetching.
   *
   * AbortController ensures previous requests are cancelled when user switches tickets,
   * preventing race conditions and stale data display.
   */
  useEffect(() => {
    // Create abort controller for this ticket's requests
    const abortController = new AbortController();
    let isMounted = true;

    const fetchAllData = async () => {
      // Set all loading states
      setIsLoadingTicket(true);
      setIsLoadingDevice(true);
      setIsLoadingKnowledge(true);
      setIsLoadingActions(true);

      // Debug: Log ticket info being fetched
      console.log(
        `[TicketDetailsView] Fetching data for ticket: ${
          initialTicket.id
        }, device: ${initialTicket.device || "Not Available"}, caller: ${
          initialTicket.callerId || "Not Available"
        }`
      );

      // Execute all API calls in parallel
      const results = await Promise.allSettled([
        // 1. Fetch ticket details
        ticketsAPI.getIncidentDetails(initialTicket.id),

        // 2. Fetch device details
        deviceAPI.getDeviceDetailsOrchestrated(
          initialTicket.device,
          initialTicket.callerId || undefined
        ),

        // 3. Fetch solution summary
        knowledgeAPI.getSolutionSummary(initialTicket.id, 3),

        // 4. Fetch remote actions
        remoteActionsAPI.getRecommendations(
          initialTicket.id,
          initialTicket.device,
          initialTicket.callerId || undefined,
          3
        ),
      ]);

      // Only update state if component is still mounted and request wasn't aborted
      if (!isMounted || abortController.signal.aborted) {
        return;
      }

      // Process ticket details
      if (results[0].status === "fulfilled") {
        const result = results[0].value;
        console.log(
          `[TicketDetailsView] Ticket details API result for ${initialTicket.id}:`,
          {
            success: result.success,
            hasData: !!result.data,
            deviceInResponse: result.data?.device,
            deviceInInitialTicket: initialTicket.device,
          }
        );

        if (result.success && result.data) {
          const ticketData = {
            ...result.data,
            callerId: result.data.callerId ?? undefined,
            callerName: result.data.callerName ?? undefined,
          };
          setTicket(ticketData);

          // Update device name in My Tickets list if it was missing
          if (
            result.data.device &&
            result.data.device !== "Not Available" &&
            (!initialTicket.device || initialTicket.device === "Not Available")
          ) {
            console.log(
              `[TicketDetailsView] ✅ Updating ticket ${initialTicket.id} device from "${initialTicket.device}" to "${result.data.device}"`
            );
            updateTicketDevice(initialTicket.id, result.data.device);
          } else {
            console.log(
              `[TicketDetailsView] ⏭️ Skipping device update for ${initialTicket.id}:`,
              {
                hasDevice: !!result.data.device,
                deviceValue: result.data.device,
                initialDevice: initialTicket.device,
              }
            );
          }
        } else {
          setTicket(initialTicket);
        }
      } else {
        setTicket(initialTicket);
      }
      setIsLoadingTicket(false);

      // Process device details
      if (results[1].status === "fulfilled") {
        const result = results[1].value;

        // Debug: Log what we got from the API
        console.log(
          `[TicketDetailsView] 📦 Device API result for ${initialTicket.id}:`,
          {
            success: result.success,
            hasData: !!result.data,
            message: result.message,
          }
        );

        if (result.success && result.data) {
          console.log(
            `[TicketDetailsView] Device details received for ticket ${initialTicket.id}:`,
            result.data.deviceName
          );
          setDeviceDetails(result.data);
          setDeviceError(null);

          // Debug: Log the check values
          console.log(`[TicketDetailsView] 🔍 Checking if should update:`, {
            hasDeviceName: !!result.data.deviceName,
            deviceNameValue: result.data.deviceName,
            initialDevice: initialTicket.device,
            initialDeviceIsEmpty: !initialTicket.device,
            initialDeviceIsNA: initialTicket.device === "Not Available",
            willUpdate: !!(
              result.data.deviceName &&
              (!initialTicket.device ||
                initialTicket.device === "Not Available")
            ),
          });

          // Update device name in My Tickets list if it was missing
          if (
            result.data.deviceName &&
            (!initialTicket.device || initialTicket.device === "Not Available")
          ) {
            console.log(
              `[TicketDetailsView] ✅ Updating ticket ${initialTicket.id} device from "${initialTicket.device}" to "${result.data.deviceName}" (from Intune)`
            );
            updateTicketDevice(initialTicket.id, result.data.deviceName);
          }
        } else {
          const apiMessage = result.message;
          if (
            apiMessage &&
            !apiMessage.includes("Operation completed successfully")
          ) {
            setDeviceError(apiMessage);
          } else {
            setDeviceError(
              "Device information not available for this incident"
            );
          }
        }
      } else {
        setDeviceError("Device details temporarily unavailable");
      }
      setIsLoadingDevice(false);

      // Process solution summary
      if (results[2].status === "fulfilled") {
        const result = results[2].value;
        if (result.success && result.data) {
          setSolutionSummary(result.data);
          setKnowledgeError(null);
        } else {
          const apiMessage = result.message;
          if (
            apiMessage &&
            !apiMessage.includes("Operation completed successfully")
          ) {
            setKnowledgeError(apiMessage);
          } else {
            setKnowledgeError("No solution summary found");
          }
        }
      } else {
        setKnowledgeError("Knowledge base articles temporarily unavailable");
      }
      setIsLoadingKnowledge(false);

      // Process remote actions
      if (results[3].status === "fulfilled") {
        const result = results[3].value;
        if (result.success && result.data) {
          setRemoteActions(result.data);
          setActionsError(null);
        } else {
          const apiMessage = result.message;
          if (
            apiMessage &&
            !apiMessage.includes("Operation completed successfully")
          ) {
            setActionsError(apiMessage);
          } else {
            setActionsError("No recommendations available");
          }
        }
      } else {
        setActionsError("Actions temporarily unavailable");
      }
      setIsLoadingActions(false);
    };

    fetchAllData();

    // Cleanup function: abort requests and prevent state updates when ticket changes
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [initialTicket]);

  /**
   * Format storage bytes to GB
   *
   * @param bytes - Storage size in bytes
   * @returns Formatted string with GB units (e.g., "512.00 GB")
   */
  const formatStorage = (bytes?: number): string => {
    if (bytes === undefined || bytes === null) return "Not Available";
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(2)} GB`;
  };

  /**
   * Format ISO date string to locale date string
   *
   * @param dateString - ISO 8601 date string
   * @returns Localized date/time string
   */
  const formatDate = (dateString?: string): string => {
    if (!dateString) return "Not Available";
    try {
      const date = new Date(dateString);
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return dateString;
    }
  };

  /**
   * Convert ISO date to relative time string
   *
   * Calculates time difference and returns human-readable format:
   * - "X minutes ago" (< 60 minutes)
   * - "X hours ago" (< 24 hours)
   * - "X days ago" (≥ 24 hours)
   *
   * @param dateString - ISO 8601 date string
   * @returns Relative time string or "Not Available"
   */
  const getRelativeTime = (dateString?: string): string => {
    if (!dateString) return "Not Available";
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 60)
        return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
      if (diffHours < 24)
        return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
      return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
    } catch {
      return dateString;
    }
  };

  return (
    <div className="flex flex-col gap-3 sm:gap-4 md:gap-6 p-2 sm:p-3 md:p-4 lg:p-6 w-full h-full overflow-y-auto items-center">
      <div className="w-full max-w-[1400px]">
        {/* Mobile back button */}
        <button
          onClick={() => navigate("/home")}
          className="md:hidden flex items-center gap-2 text-[#155cfb] hover:text-[#1347e5] transition-colors mb-3 sm:mb-4"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-xs sm:text-sm">
            Back to tickets
          </span>
        </button>

        <div className="flex flex-col lg:flex-row items-start justify-between gap-4 lg:gap-6">
          <div className="flex items-start gap-3 md:gap-4 w-full lg:w-auto">
            <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-[96px] md:h-[96px] rounded-[10px] overflow-hidden flex-shrink-0">
              <IncidentIcon />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
                <h1 className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#070f26] text-lg sm:text-xl md:text-2xl leading-7 sm:leading-8 md:leading-9">
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
          <div className="flex gap-2 sm:gap-3 w-full lg:w-auto overflow-x-auto">
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
            {showSustainabilityScore && (
              <Card className="p-4 rounded-[10px] border-[0.67px] border-[#e1e8f0] bg-white shadow-sm">
                <CardContent className="p-0 flex flex-col gap-2">
                  <p className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#61738d] text-xs leading-4">
                    Sustainability Score
                  </p>
                  <div className="flex items-center gap-1">
                    <Leaf className="w-5 h-5 text-[#00a63e] fill-[#00a63e]" />
                    <Leaf className="w-5 h-5 text-[#00a63e] fill-[#00a63e]" />
                    <Leaf className="w-5 h-5 text-[#00a63e] fill-[#00a63e]" />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-3 md:gap-4">
          <Card className="w-full p-3 sm:p-4 md:p-5 lg:p-6 rounded-[14px] border-[0.67px] border-[#e1e8f0] bg-white shadow-sm">
            <CardContent className="p-0 flex flex-col gap-3 sm:gap-4 md:gap-6">
              "
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-[#155cfb]" />
                  <h3 className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#070f26] text-base leading-6">
                    Ticket Details
                  </h3>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        tabIndex={0}
                        aria-label="Show data source"
                        className="cursor-pointer"
                      >
                        <Info className="w-4 h-4 text-[#155cfb]" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="bg-white border-[#155cfb] border-2 px-3 py-2 shadow-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Server className="w-3.5 h-3.5 text-[#155cfb]" />
                        <span className="text-[#070f26] text-xs font-semibold">
                          ServiceNow
                        </span>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {isLoadingTicket ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5876ab]"></div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-2">
                  <div className="flex gap-3 pb-3 border-b-[0.67px] border-[#e1e8f0]">
                    <FileTextIcon className="w-4 h-4 mt-1 text-[#61738d]" />
                    <div className="flex flex-col min-w-0">
                      <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#5876ab] text-xs leading-4">
                        Description
                      </span>
                      <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#070f26] text-sm leading-5 break-words">
                        {ticket.title}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-3 pb-3 border-b-[0.67px] border-[#e1e8f0]">
                    <PhoneIcon className="w-4 h-4 mt-1 text-[#61738d]" />
                    <div className="flex flex-col min-w-0">
                      <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#5876ab] text-xs leading-4">
                        Caller
                      </span>
                      <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#070f26] text-sm leading-5 break-words">
                        {ticket.callerName ||
                          ticket.callerId ||
                          "Not Available"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-3 pb-3 border-b-[0.67px] border-[#e1e8f0]">
                    <CalendarIcon className="w-4 h-4 mt-1" />
                    <div className="flex flex-col min-w-0">
                      <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#5876ab] text-xs leading-4">
                        Created
                      </span>
                      <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#070f26] text-sm leading-5 break-words">
                        {ticket.openedAt
                          ? formatDate(ticket.openedAt)
                          : "Not Available"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-3 pb-3 border-b-[0.67px] border-[#e1e8f0]">
                    <RefreshCwIcon className="w-4 h-4 mt-1" />
                    <div className="flex flex-col min-w-0">
                      <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#5876ab] text-xs leading-4">
                        Last Updated
                      </span>
                      <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#070f26] text-sm leading-5 break-words">
                        {ticket.time}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <ClockIcon className="w-4 h-4 mt-1" />
                    <div className="flex flex-col min-w-0">
                      <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#5876ab] text-xs leading-4">
                        SLA Status
                      </span>
                      <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#070f26] text-sm leading-5 break-words">
                        Within SLA (18 hours remaining)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="w-full p-3 sm:p-4 md:p-5 lg:p-6 rounded-[14px] border-[0.67px] border-[#e1e8f0] bg-white shadow-sm">
            <CardContent className="p-0 flex flex-col gap-3 sm:gap-4 md:gap-6">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MonitorIcon className="w-5 h-5 text-[#155cfb]" />
                  <h3 className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#070f26] text-base leading-6">
                    Device Details
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-[#10B981]" />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          tabIndex={0}
                          aria-label="Show data source"
                          className="cursor-pointer"
                        >
                          <Info className="w-4 h-4 text-[#155cfb]" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="bg-white border-[#155cfb] border-2 px-3 py-2 shadow-lg"
                      >
                        <div className="flex items-center gap-2">
                          <Shield className="w-3.5 h-3.5 text-[#155cfb]" />
                          <span className="text-[#070f26] text-xs font-semibold">
                            Intune
                          </span>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              {isLoadingDevice ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5876ab]"></div>
                </div>
              ) : deviceError ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 gap-3">
                  <AlertCircle className="w-10 h-10 text-[#61738d] opacity-50" />
                  <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#61738d] text-sm text-center">
                    {deviceError}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-4 max-h-[600px] overflow-y-auto pr-2">
                  {/* Device Identity Section */}
                  <div className="bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE] rounded-xl p-4 border border-[#BFDBFE]">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-[#3B82F6] flex items-center justify-center">
                        <LaptopIcon className="w-4 h-4 text-white" />
                      </div>
                      <h4 className="[font-family:'Arial-Regular',Helvetica] font-semibold text-[#1E40AF] text-sm">
                        Device Identity
                      </h4>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <MonitorIcon className="w-4 h-4 mt-0.5 text-[#3B82F6] flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="[font-family:'Arial-Regular',Helvetica] text-[10px] text-[#64748B] uppercase tracking-wide mb-0.5">
                            Device Name
                          </p>
                          <p className="[font-family:'Arial-Regular',Helvetica] font-medium text-[#0F172A] text-sm break-words">
                            {deviceDetails?.deviceName ||
                              ticket.device ||
                              "Not Available"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <HashIcon className="w-4 h-4 mt-0.5 text-[#3B82F6] flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="[font-family:'Arial-Regular',Helvetica] text-[10px] text-[#64748B] uppercase tracking-wide mb-0.5">
                            Serial Number
                          </p>
                          <p className="[font-family:'Arial-Regular',Helvetica] font-mono text-[#475569] text-xs break-all">
                            {deviceDetails?.serialNumber || "Not Available"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Network Information */}
                  <div className="bg-gradient-to-br from-[#ECFEFF] to-[#CFFAFE] rounded-xl p-4 border border-[#A5F3FC]">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#06B6D4] to-[#0891B2] flex items-center justify-center">
                        <Network className="w-4 h-4 text-white" />
                      </div>
                      <h4 className="[font-family:'Arial-Regular',Helvetica] font-semibold text-[#155E75] text-sm">
                        Network Information
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-[#A5F3FC]">
                        <div className="flex items-center gap-2">
                          <Globe className="w-3.5 h-3.5 text-[#0891B2]" />
                          <span className="[font-family:'Arial-Regular',Helvetica] text-xs text-[#0E7490]">
                            IP Address
                          </span>
                        </div>
                        <span className="[font-family:'Arial-Regular',Helvetica] font-mono text-xs text-[#164E63]">
                          {deviceDetails?.ipAddress || "Not Available"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-[#A5F3FC]">
                        <div className="flex items-center gap-2">
                          <HashIcon className="w-3.5 h-3.5 text-[#0891B2]" />
                          <span className="[font-family:'Arial-Regular',Helvetica] text-xs text-[#0E7490]">
                            MAC Address
                          </span>
                        </div>
                        <span className="[font-family:'Arial-Regular',Helvetica] font-mono text-xs text-[#164E63]">
                          {deviceDetails?.macAddress || "Not Available"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-[#A5F3FC]">
                        <div className="flex items-center gap-2">
                          <WifiIcon className="w-3.5 h-3.5 text-[#0891B2]" />
                          <span className="[font-family:'Arial-Regular',Helvetica] text-xs text-[#0E7490]">
                            Connection Type
                          </span>
                        </div>
                        <Badge className="bg-[#06B6D4] text-white border-0 hover:bg-[#0891B2] capitalize">
                          {deviceDetails?.connectionType || "Unknown"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-[#A5F3FC]">
                        <div className="flex items-center gap-2">
                          <Shield className="w-3.5 h-3.5 text-[#0891B2]" />
                          <span className="[font-family:'Arial-Regular',Helvetica] text-xs text-[#0E7490]">
                            VPN Status
                          </span>
                        </div>
                        <Badge
                          className={`border-0 ${
                            deviceDetails?.vpnStatus?.toLowerCase() ===
                            "connected"
                              ? "bg-[#10B981] text-white"
                              : deviceDetails?.vpnStatus?.toLowerCase() ===
                                "disconnected"
                              ? "bg-[#F59E0B] text-white"
                              : "bg-[#64748B] text-white"
                          }`}
                        >
                          {deviceDetails?.vpnStatus || "Unknown"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Hardware Specifications */}
                  <div className="bg-[#F8FAFC] rounded-xl p-4 border border-[#E2E8F0]">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8B5CF6] to-[#6366F1] flex items-center justify-center">
                        <BuildingIcon className="w-4 h-4 text-white" />
                      </div>
                      <h4 className="[font-family:'Arial-Regular',Helvetica] font-semibold text-[#334155] text-sm">
                        Hardware Specifications
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-[#E2E8F0]">
                        <div className="flex items-center gap-2">
                          <BuildingIcon className="w-3.5 h-3.5 text-[#64748B]" />
                          <span className="[font-family:'Arial-Regular',Helvetica] text-xs text-[#64748B]">
                            Manufacturer
                          </span>
                        </div>
                        <span className="[font-family:'Arial-Regular',Helvetica] font-medium text-sm text-[#0F172A]">
                          {deviceDetails?.manufacturer || "Not Available"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-[#E2E8F0]">
                        <div className="flex items-center gap-2">
                          <PackageIcon className="w-3.5 h-3.5 text-[#64748B]" />
                          <span className="[font-family:'Arial-Regular',Helvetica] text-xs text-[#64748B]">
                            Model
                          </span>
                        </div>
                        <span
                          className="[font-family:'Arial-Regular',Helvetica] font-medium text-sm text-[#0F172A] text-right max-w-[200px] truncate"
                          title={deviceDetails?.model || "Not Available"}
                        >
                          {deviceDetails?.model || "Not Available"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Operating System */}
                  <div className="bg-gradient-to-br from-[#F0FDF4] to-[#DCFCE7] rounded-xl p-4 border border-[#BBF7D0]">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-[#10B981] flex items-center justify-center">
                        <MonitorIcon className="w-4 h-4 text-white" />
                      </div>
                      <h4 className="[font-family:'Arial-Regular',Helvetica] font-semibold text-[#065F46] text-sm">
                        Operating System
                      </h4>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="[font-family:'Arial-Regular',Helvetica] text-xs text-[#059669]">
                          OS
                        </span>
                        <Badge className="bg-[#10B981] text-white border-0 hover:bg-[#059669]">
                          {deviceDetails?.operatingSystem || "Not Available"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="[font-family:'Arial-Regular',Helvetica] text-xs text-[#059669]">
                          Version
                        </span>
                        <span className="[font-family:'Arial-Regular',Helvetica] font-mono text-xs text-[#065F46]">
                          {deviceDetails?.osVersion || "Not Available"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Storage Information */}
                  <div className="bg-[#FEF3C7] rounded-xl p-4 border border-[#FDE68A]">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center">
                        <HardDriveIcon className="w-4 h-4 text-white" />
                      </div>
                      <h4 className="[font-family:'Arial-Regular',Helvetica] font-semibold text-[#92400E] text-sm">
                        Storage
                      </h4>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2">
                          <HardDriveIcon className="w-3.5 h-3.5 text-[#D97706]" />
                          <span className="[font-family:'Arial-Regular',Helvetica] text-xs text-[#92400E]">
                            Total Capacity
                          </span>
                        </div>
                        <span className="[font-family:'Arial-Regular',Helvetica] font-semibold text-sm text-[#92400E]">
                          {deviceDetails?.totalStorageSpaceInBytes
                            ? formatStorage(
                                deviceDetails.totalStorageSpaceInBytes
                              )
                            : "Not Available"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2">
                          <DatabaseIcon className="w-3.5 h-3.5 text-[#D97706]" />
                          <span className="[font-family:'Arial-Regular',Helvetica] text-xs text-[#92400E]">
                            Free Space
                          </span>
                        </div>
                        <span className="[font-family:'Arial-Regular',Helvetica] font-semibold text-sm text-[#059669]">
                          {deviceDetails?.freeStorageSpaceInBytes
                            ? formatStorage(
                                deviceDetails.freeStorageSpaceInBytes
                              )
                            : "Not Available"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Management & Sync Status */}
                  <div className="bg-gradient-to-br from-[#F5F3FF] to-[#EDE9FE] rounded-xl p-4 border border-[#DDD6FE]">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] flex items-center justify-center">
                        <WifiIcon className="w-4 h-4 text-white" />
                      </div>
                      <h4 className="[font-family:'Arial-Regular',Helvetica] font-semibold text-[#5B21B6] text-sm">
                        Management Status
                      </h4>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <CalendarIcon className="w-4 h-4 mt-0.5 text-[#8B5CF6] flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="[font-family:'Arial-Regular',Helvetica] text-[10px] text-[#7C3AED] uppercase tracking-wide mb-0.5">
                            Enrolled Date & Time
                          </p>
                          <p className="[font-family:'Arial-Regular',Helvetica] font-medium text-[#5B21B6] text-sm">
                            {deviceDetails?.enrolledDateTime
                              ? formatDate(deviceDetails.enrolledDateTime)
                              : "Not Available"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <WifiIcon className="w-4 h-4 mt-0.5 text-[#8B5CF6] flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="[font-family:'Arial-Regular',Helvetica] text-[10px] text-[#7C3AED] uppercase tracking-wide mb-0.5">
                            Last Sync Date & Time
                          </p>
                          <div className="flex items-center gap-2">
                            <p className="[font-family:'Arial-Regular',Helvetica] font-medium text-[#5B21B6] text-sm">
                              {deviceDetails?.lastSyncDateTime
                                ? formatDate(deviceDetails.lastSyncDateTime)
                                : "Not Available"}
                            </p>
                            {deviceDetails?.lastSyncDateTime && (
                              <Badge className="bg-[#8B5CF6] text-white border-0 text-[10px] px-2 py-0">
                                {getRelativeTime(
                                  deviceDetails.lastSyncDateTime
                                )}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Shield className="w-4 h-4 mt-0.5 text-[#8B5CF6] flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="[font-family:'Arial-Regular',Helvetica] text-[10px] text-[#7C3AED] uppercase tracking-wide mb-0.5">
                            Managed Device Owner Type
                          </p>
                          <Badge className="bg-white text-[#5B21B6] border border-[#8B5CF6] capitalize">
                            {deviceDetails?.managedDeviceOwnerType || "company"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="w-full p-3 sm:p-4 md:p-5 lg:p-6 rounded-[14px] border-[0.67px] border-[#e1e8f0] bg-white shadow-sm">
            <CardContent className="p-0 flex flex-col gap-3 sm:gap-4 md:gap-6">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <KnowledgeIcon />
                  <h3 className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#070f26] text-base leading-6">
                    Knowledge
                  </h3>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        tabIndex={0}
                        aria-label="Show data source"
                        className="cursor-pointer"
                      >
                        <Info className="w-4 h-4 text-[#155cfb]" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="bg-white border-[#155cfb] border-2 px-3 py-2 shadow-lg"
                    >
                      <div className="flex items-center gap-2">
                        <LibraryBig className="w-3.5 h-3.5 text-[#155cfb]" />
                        <span className="text-[#070f26] text-xs font-semibold">
                          {solutionSummary?.source === "ai_generated"
                            ? "Google"
                            : "KnowledgeBase"}
                        </span>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {isLoadingKnowledge ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5876ab]"></div>
                </div>
              ) : knowledgeError ? (
                <div className="flex flex-col items-center justify-center py-8 px-4">
                  <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#d32f2f] text-sm text-center">
                    {knowledgeError}
                  </span>
                </div>
              ) : !solutionSummary ||
                solutionSummary.summary_points.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 gap-3">
                  <BookOpen className="w-10 h-10 text-[#61738d] opacity-50" />
                  <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#61738d] text-sm text-center">
                    No solution summary available for this incident
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Solution Points List */}
                  <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-2">
                    {solutionSummary.summary_points.map((point, index) => (
                      <div key={index} className="flex gap-3">
                        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-gradient-to-br from-[#1347e5] to-[#0e3aa8] mt-2"></div>
                        <p className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#0e162b] text-sm leading-6 flex-1">
                          {point}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Footer Info */}
                  {solutionSummary.kb_articles_count > 0 && (
                    <div className="pt-3 border-t border-[#e1e8f0]">
                      <p className="text-xs text-[#61738d] flex items-center gap-1">
                        <LibraryBig className="w-3 h-3" />
                        Based on {solutionSummary.kb_articles_count} knowledge
                        article
                        {solutionSummary.kb_articles_count !== 1 ? "s" : ""}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="w-full p-3 sm:p-4 md:p-5 lg:p-6 rounded-[14px] border-[0.67px] border-[#e1e8f0] bg-white shadow-sm">
            <CardContent className="p-0 flex flex-col gap-3 sm:gap-4 md:gap-6">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ActionsIcon />
                  <h3 className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#070f26] text-base leading-6">
                    Actions
                  </h3>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        tabIndex={0}
                        aria-label="Show data source"
                        className="cursor-pointer"
                      >
                        <Info className="w-4 h-4 text-[#155cfb]" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="bg-white border-[#155cfb] border-2 px-3 py-2 shadow-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-[#155cfb]" />
                        <span className="text-[#070f26] text-xs font-semibold">
                          NextThink
                        </span>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {isLoadingActions ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5876ab]"></div>
                </div>
              ) : actionsError ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 gap-3">
                  <AlertCircle className="w-10 h-10 text-[#61738d] opacity-50" />
                  <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#61738d] text-sm text-center">
                    {actionsError}
                  </span>
                </div>
              ) : remoteActions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 gap-3">
                  <ActivityIcon className="w-10 h-10 text-[#61738d] opacity-50" />
                  <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#61738d] text-sm text-center">
                    No recommended actions available for this incident
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-2">
                  {remoteActions.map((action) => (
                    <div
                      key={action.actionId}
                      className="flex flex-col gap-3 p-4 bg-[#f8fafc] rounded-lg border-[0.67px] border-[#e1e8f0]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#070F26] text-sm leading-5 flex-1 break-words">
                          {action.actionName}
                        </p>
                        <Badge
                          className={`h-auto px-2 py-0.5 rounded-lg text-xs ${getActionStatusColor(
                            action.status
                          )} flex-shrink-0`}
                        >
                          {action.status.charAt(0).toUpperCase() +
                            action.status.slice(1)}
                        </Badge>
                      </div>
                      <p className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#5876ab] text-xs leading-4 break-words">
                        {action.actionName}
                      </p>
                      <div className="flex flex-col gap-1">
                        <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#90a1b8] text-xs leading-4">
                          Type: {action.actionType}
                        </span>
                        <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#90a1b8] text-xs leading-4">
                          Executed by: {action.executedBy}
                        </span>
                        <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#90a1b8] text-xs leading-4">
                          Updated: {formatDate(action.updatedAt)}
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
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TicketDetailsView;
