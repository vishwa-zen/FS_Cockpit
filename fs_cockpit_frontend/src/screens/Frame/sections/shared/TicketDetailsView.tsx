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
  FileTextIcon,
  PhoneIcon,
  BuildingIcon,
  PackageIcon,
  HashIcon,
  LaptopIcon,
  SettingsIcon,
  HardDriveIcon,
  DatabaseIcon,
  ArrowLeft,
  WifiIcon,
  ActivityIcon,
  AlertCircle,
  BookOpen,
} from "lucide-react";
import {
  deviceAPI,
  ticketsAPI,
  knowledgeAPI,
  IntuneDevice,
  KnowledgeArticle,
} from "../../../../services/api";

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
  ticket: initialTicket,
}) => {
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket>(initialTicket);
  const [deviceDetails, setDeviceDetails] = useState<IntuneDevice | null>(null);
  const [isLoadingDevice, setIsLoadingDevice] = useState(true);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [isLoadingTicket, setIsLoadingTicket] = useState(true);
  const [knowledgeArticles, setKnowledgeArticles] = useState<
    KnowledgeArticle[]
  >([]);
  const [isLoadingKnowledge, setIsLoadingKnowledge] = useState(true);
  const [knowledgeError, setKnowledgeError] = useState<string | null>(null);

  /**
   * Fetch all ticket-related data in parallel
   *
   * Executes three API calls simultaneously for optimal performance:
   * 1. Ticket details - Full incident information
   * 2. Device details - Hardware specs and health status
   * 3. Knowledge articles - Relevant documentation
   *
   * Uses Promise.allSettled to ensure independent error handling
   * for each API call without blocking others.
   */
  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoadingTicket(true);
      setIsLoadingDevice(true);
      setIsLoadingKnowledge(true);
      setDeviceError(null);
      setKnowledgeError(null);

      try {
        // Start all API calls in parallel for optimal performance
        const [ticketResponse, deviceResponse, knowledgeResponse] =
          await Promise.allSettled([
            // Fetch ticket details
            ticketsAPI.getIncidentDetails(initialTicket.id),
            // Fetch device details (using initial ticket data)
            deviceAPI.getDeviceDetailsOrchestrated(
              initialTicket.device,
              initialTicket.callerId || undefined
            ),
            // Fetch knowledge articles
            knowledgeAPI.getKnowledgeArticles(initialTicket.id, 3),
          ]);

        // Handle ticket details response
        if (
          ticketResponse.status === "fulfilled" &&
          ticketResponse.value.success &&
          ticketResponse.value.data
        ) {
          setTicket(ticketResponse.value.data);
        } else {
          // Fallback to initial ticket data if API fails
          setTicket(initialTicket);
        }

        // Handle device details response with contextual error messages
        if (
          deviceResponse.status === "fulfilled" &&
          deviceResponse.value.success &&
          deviceResponse.value.data
        ) {
          setDeviceDetails(deviceResponse.value.data);
        } else {
          let errorMsg = "Unable to load device information";
          if (deviceResponse.status === "rejected") {
            errorMsg = "Device service is temporarily unavailable";
          } else if (deviceResponse.status === "fulfilled") {
            const apiMessage = deviceResponse.value.message;
            // Don't show generic success messages as errors
            if (
              apiMessage &&
              !apiMessage.includes("Operation completed successfully")
            ) {
              errorMsg = apiMessage;
            } else {
              errorMsg = "Device information not found";
            }
          }
          setDeviceError(errorMsg);
        }

        // Handle knowledge articles response with contextual error messages
        if (
          knowledgeResponse.status === "fulfilled" &&
          knowledgeResponse.value.success &&
          knowledgeResponse.value.data
        ) {
          setKnowledgeArticles(knowledgeResponse.value.data);
        } else {
          let errorMsg = "Unable to load knowledge articles";
          if (knowledgeResponse.status === "rejected") {
            errorMsg = "Knowledge base service is temporarily unavailable";
          } else if (knowledgeResponse.status === "fulfilled") {
            const apiMessage = knowledgeResponse.value.message;
            // Don't show generic success messages as errors
            if (
              apiMessage &&
              !apiMessage.includes("Operation completed successfully")
            ) {
              errorMsg = apiMessage;
            } else {
              errorMsg = "No relevant articles found";
            }
          }
          setKnowledgeError(errorMsg);
        }
      } catch (error) {
        // Global error handler for unexpected failures
        setTicket(initialTicket);
        setDeviceError("Unable to connect to device service");
        setKnowledgeError("Unable to connect to knowledge base");
      } finally {
        setIsLoadingTicket(false);
        setIsLoadingDevice(false);
        setIsLoadingKnowledge(false);
      }
    };

    fetchAllData();
  }, [initialTicket.id]);

  /**
   * Format storage bytes to GB
   *
   * @param bytes - Storage size in bytes
   * @returns Formatted string with GB units (e.g., "512.00 GB")
   */
  const formatStorage = (bytes?: number): string => {
    if (!bytes) return "N/A";
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
    if (!dateString) return "N/A";
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
   * @returns Relative time string or "N/A"
   */
  const getRelativeTime = (dateString?: string): string => {
    if (!dateString) return "N/A";
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
    <div className="flex flex-col gap-4 md:gap-6 p-3 sm:p-4 md:p-6 w-full h-full overflow-y-auto">
      {/* Mobile back button */}
      <button
        onClick={() => navigate("/home")}
        className="md:hidden flex items-center gap-2 text-[#155cfb] hover:text-[#1347e5] transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-sm">
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
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-3 md:gap-4">
        <Card className="w-full xl:flex-1 p-4 md:p-5 lg:p-6 rounded-[14px] border-[0.67px] border-[#e1e8f0] bg-white shadow-sm">
          <CardContent className="p-0 flex flex-col gap-4 md:gap-6">
            <div className="flex items-center gap-2">
              <UserIcon className="w-5 h-5" />
              <h3 className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#070f26] text-base leading-6">
                Ticket Details
              </h3>
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
                      {ticket.callerName || ticket.callerId || "N/A"}
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
                      {ticket.openedAt ? formatDate(ticket.openedAt) : "N/A"}
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

        <Card className="w-full xl:flex-1 p-4 md:p-5 lg:p-6 rounded-[14px] border-[0.67px] border-[#e1e8f0] bg-white shadow-sm">
          <CardContent className="p-0 flex flex-col gap-4 md:gap-6">
            <div className="flex items-center gap-2">
              <MonitorIcon className="w-5 h-5 text-[#61738d]" />
              <h3 className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#070f26] text-base leading-6">
                Device Details
              </h3>
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
              <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-2">
                <div className="flex gap-3 pb-3 border-b-[0.67px] border-[#e1e8f0]">
                  <LaptopIcon className="w-4 h-4 mt-1 text-[#61738d]" />
                  <div className="flex flex-col min-w-0">
                    <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#5876ab] text-xs leading-4">
                      Device Name
                    </span>
                    <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#070f26] text-sm leading-5 break-words">
                      {deviceDetails?.deviceName || ticket.device || "N/A"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-3 pb-3 border-b-[0.67px] border-[#e1e8f0]">
                  <BuildingIcon className="w-4 h-4 mt-1 text-[#61738d]" />
                  <div className="flex flex-col min-w-0">
                    <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#5876ab] text-xs leading-4">
                      Manufacturer
                    </span>
                    <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#070f26] text-sm leading-5 break-words">
                      {deviceDetails?.manufacturer || "N/A"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-3 pb-3 border-b-[0.67px] border-[#e1e8f0]">
                  <PackageIcon className="w-4 h-4 mt-1 text-[#61738d]" />
                  <div className="flex flex-col min-w-0">
                    <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#5876ab] text-xs leading-4">
                      Model
                    </span>
                    <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#070f26] text-sm leading-5 break-words">
                      {deviceDetails?.model || "N/A"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-3 pb-3 border-b-[0.67px] border-[#e1e8f0]">
                  <HashIcon className="w-4 h-4 mt-1 text-[#61738d]" />
                  <div className="flex flex-col min-w-0">
                    <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#5876ab] text-xs leading-4">
                      Serial Number
                    </span>
                    <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#070f26] text-sm leading-5 break-words">
                      {deviceDetails?.serialNumber || "N/A"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-3 pb-3 border-b-[0.67px] border-[#e1e8f0]">
                  <MonitorIcon className="w-4 h-4 mt-1 text-[#61738d]" />
                  <div className="flex flex-col min-w-0">
                    <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#5876ab] text-xs leading-4">
                      Operating System
                    </span>
                    <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#070f26] text-sm leading-5 break-words">
                      {deviceDetails?.operatingSystem || "N/A"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-3 pb-3 border-b-[0.67px] border-[#e1e8f0]">
                  <SettingsIcon className="w-4 h-4 mt-1 text-[#61738d]" />
                  <div className="flex flex-col min-w-0">
                    <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#5876ab] text-xs leading-4">
                      OS Version
                    </span>
                    <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#070f26] text-sm leading-5 break-words">
                      {deviceDetails?.osVersion || "N/A"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-3 pb-3 border-b-[0.67px] border-[#e1e8f0]">
                  <HardDriveIcon className="w-4 h-4 mt-1 text-[#61738d]" />
                  <div className="flex flex-col min-w-0">
                    <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#5876ab] text-xs leading-4">
                      Total Storage
                    </span>
                    <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#070f26] text-sm leading-5 break-words">
                      {deviceDetails?.totalStorageSpaceInBytes
                        ? formatStorage(deviceDetails.totalStorageSpaceInBytes)
                        : "N/A"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-3 pb-3 border-b-[0.67px] border-[#e1e8f0]">
                  <DatabaseIcon className="w-4 h-4 mt-1 text-[#61738d]" />
                  <div className="flex flex-col min-w-0">
                    <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#5876ab] text-xs leading-4">
                      Free Storage
                    </span>
                    <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#070f26] text-sm leading-5 break-words">
                      {deviceDetails?.freeStorageSpaceInBytes
                        ? formatStorage(deviceDetails.freeStorageSpaceInBytes)
                        : "N/A"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-3 pb-3 border-b-[0.67px] border-[#e1e8f0]">
                  <CalendarIcon className="w-4 h-4 mt-1 text-[#61738d]" />
                  <div className="flex flex-col min-w-0">
                    <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#5876ab] text-xs leading-4">
                      Enrolled Date
                    </span>
                    <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#070f26] text-sm leading-5 break-words">
                      {deviceDetails?.enrolledDateTime
                        ? formatDate(deviceDetails.enrolledDateTime)
                        : "N/A"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-3 pb-3 border-b-[0.67px] border-[#e1e8f0]">
                  <WifiIcon className="w-4 h-4 mt-1 text-[#61738d]" />
                  <div className="flex flex-col min-w-0">
                    <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#5876ab] text-xs leading-4">
                      Last Sync
                    </span>
                    <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#070f26] text-sm leading-5 break-words">
                      {deviceDetails?.lastSyncDateTime
                        ? getRelativeTime(deviceDetails.lastSyncDateTime)
                        : "N/A"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <ActivityIcon className="w-4 h-4 mt-1 text-[#61738d]" />
                  <div className="flex flex-col min-w-0">
                    <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#5876ab] text-xs leading-4">
                      Health Status
                    </span>
                    <span
                      className={`[font-family:'Arial-Regular',Helvetica] font-normal text-sm leading-5 break-words ${
                        deviceDetails?.complianceState === "compliant"
                          ? "text-[#00a63e]"
                          : deviceDetails?.complianceState === "noncompliant"
                          ? "text-[#d32f2f]"
                          : "text-[#f59e0b]"
                      }`}
                    >
                      {deviceDetails?.complianceState === "compliant"
                        ? "Compliant"
                        : deviceDetails?.complianceState === "noncompliant"
                        ? "Non-Compliant"
                        : deviceDetails?.complianceState || "Unknown"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="w-full xl:flex-1 p-4 md:p-5 lg:p-6 rounded-[14px] border-[0.67px] border-[#e1e8f0] bg-white shadow-sm">
          <CardContent className="p-0 flex flex-col gap-4 md:gap-6">
            <div className="flex items-center gap-2">
              <KnowledgeIcon />
              <h3 className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#070f26] text-base leading-6">
                Knowledge
              </h3>
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
            ) : knowledgeArticles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 gap-3">
                <BookOpen className="w-10 h-10 text-[#61738d] opacity-50" />
                <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#61738d] text-sm text-center">
                  No knowledge articles found for this incident
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-4 max-h-[600px] overflow-y-auto pr-2">
                {knowledgeArticles.map((article, index) => (
                  <div
                    key={article.sysId}
                    className="flex flex-col gap-2 pb-4 border-b-[0.67px] border-[#e1e8f0] last:border-0 last:pb-0"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#070f26] text-sm leading-5 flex-1 break-words">
                        {article.title}
                      </p>
                      <Badge className="h-auto px-2 py-0.5 rounded-lg text-xs bg-blue-100 text-[#1347e5] border-0 flex-shrink-0">
                        {article.score.toFixed(0)}%
                      </Badge>
                    </div>
                    <p className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#5876ab] text-xs leading-4 break-words">
                      {article.shortDescription}
                    </p>
                    <a
                      href={article.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#1347e5] hover:underline text-xs"
                    >
                      View Article
                      <ChevronRightIcon className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="w-full xl:flex-1 p-4 md:p-5 lg:p-6 rounded-[14px] border-[0.67px] border-[#e1e8f0] bg-white shadow-sm">
          <CardContent className="p-0 flex flex-col gap-4 md:gap-6">
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
                    <p className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#070F26] text-sm leading-5 flex-1 break-words">
                      {action.title}
                    </p>
                    <Badge
                      className={`h-auto px-2 py-0.5 rounded-lg text-xs border-[0.67px] ${action.priorityColor} flex-shrink-0`}
                    >
                      {action.priority}
                    </Badge>
                  </div>
                  <p className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#5876ab] text-xs leading-4 break-words">
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
