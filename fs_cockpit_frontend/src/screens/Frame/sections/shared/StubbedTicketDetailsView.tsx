/**
 * StubbedTicketDetailsView Component
 *
 * Displays stubbed/demo ticket details for Copilot tab demonstration.
 * Uses predefined API responses instead of making real API calls.
 */

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "../../../../components/ui/card";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
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
} from "lucide-react";
import {
  IntuneDevice,
  KnowledgeArticle,
  RemoteAction,
} from "../../../../services/api";

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

interface StubbedTicketDetailsViewProps {
  ticket: Ticket;
}

// Stubbed device details
const stubbedDeviceDetails: IntuneDevice = {
  deviceId: "abc123-456-789",
  deviceName: "CPC-vijay-BSCCU",
  userPrincipalName: "vijay.kumar@company.com",
  operatingSystem: "Windows",
  osVersion: "10.0.19045.3803",
  complianceState: "compliant",
  managedDeviceOwnerType: "company",
  enrolledDateTime: "2024-01-15T08:30:00Z",
  lastSyncDateTime: "2025-12-03T11:45:00Z",
  manufacturer: "Dell Inc.",
  model: "Latitude 5420",
  serialNumber: "BSCCU2025",
  isEncrypted: true,
  userDisplayName: "Vijay Kumar",
  totalStorageSpaceInBytes: 512000000000,
  freeStorageSpaceInBytes: 156000000000,
};

// Stubbed knowledge articles
const stubbedKnowledgeArticles: KnowledgeArticle[] = [
  {
    sysId: "kb001",
    number: "KB0001234",
    title: "Troubleshooting Laptop Battery Drain Issues",
    shortDescription:
      "Step-by-step guide to diagnose and resolve battery drainage problems in Windows laptops",
    link: "https://knowledge.company.com/kb0001234",
    knowledgeBase: "IT Support",
    viewCount: 1247,
    score: 92,
    workflow: "published",
    author: "IT Support Team",
    publishedDate: "2025-11-15T00:00:00Z",
  },
  {
    sysId: "kb002",
    number: "KB0001567",
    title: "Laptop Overheating Prevention and Solutions",
    shortDescription:
      "Best practices for preventing laptop overheating and thermal throttling",
    link: "https://knowledge.company.com/kb0001567",
    knowledgeBase: "IT Support",
    viewCount: 892,
    score: 88,
    workflow: "published",
    author: "Hardware Team",
    publishedDate: "2025-10-22T00:00:00Z",
  },
  {
    sysId: "kb003",
    number: "KB0001890",
    title: "Dell Latitude Battery Calibration Guide",
    shortDescription:
      "Complete guide for calibrating Dell Latitude laptop batteries",
    link: "https://knowledge.company.com/kb0001890",
    knowledgeBase: "IT Support",
    viewCount: 654,
    score: 85,
    workflow: "published",
    author: "Hardware Team",
    publishedDate: "2025-09-10T00:00:00Z",
  },
];

// Stubbed remote actions
const stubbedRemoteActions: RemoteAction[] = [
  {
    actionId: "8112ab5d-710d-4746-9b24-067b3a3fa3c7",
    actionName: "Get Intune device status",
    actionType: "Cloud",
    status: "success",
    createdAt: "2025-12-03 07:04:00",
    updatedAt: "2025-12-03 07:04:25",
    deviceId: null,
    deviceName: "CPC-vijay-BSCCU",
    executedBy: "automatic",
    result: {
      inputs: "{}",
      outputs:
        '{"mdm_service_running":1,"auto_enrollment_error_datetime":null,"days_to_cert_expiry":152,"mdm_service_installed":1,"onboarding_certificate_installed":1,"auto_enrollment_error_detected":0,"auto_enrollment_error_message":"-","enrollment_error_detected":0,"onboarding_certificate_is_valid":1,"health_checks_all_passed":0,"device_enrollment_service_installed":1,"enrollment_error_message":"-","enrollment_error_datetime":null}',
      purpose: "remediation",
      status_details: "PowerShell exited with code 0\n",
      nql_id: "get_intune_device_status",
      external_reference: "",
      external_source: "",
      internal_source: "",
    },
  },
  {
    actionId: "fba7510c-90b8-4913-8e18-20a0a9626bd4",
    actionName: "Set Outlook online",
    actionType: "Cloud",
    status: "success",
    createdAt: "2025-12-01 07:19:16",
    updatedAt: "2025-12-01 07:19:24",
    deviceId: null,
    deviceName: "CPC-vijay-BSCCU",
    executedBy: "API",
    result: {
      inputs: '{"CampaignId":""}',
      outputs: "{}",
      purpose: "remediation",
      status_details:
        "Outlook set to online and restarted correctly. \r\nPowerShell exited with code 0\n",
      nql_id: "set_outlook_online_windows",
      external_reference: "",
      external_source: "",
      internal_source: "",
    },
  },
  {
    actionId: "301f9de8-333b-456d-ab87-7aed47e51e44",
    actionName: "Restart Windows Device (Infinity)",
    actionType: "Cloud",
    status: "failure",
    createdAt: "2025-12-02 09:34:00",
    updatedAt: "2025-12-02 09:34:43",
    deviceId: null,
    deviceName: "CPC-vijay-BSCCU",
    executedBy: "automatic",
    result: {
      inputs:
        '{"NumberOfDaysSinceLastReboot":"7","TestPendingRestart":"True","ShowCampaign":"Always","CampaignId":"6ea6139c-661b-4eff-a526-a424d4c0e11f","PostponeGracePeriodInDays":"7","RestartDelayInSeconds":"210","CampaignTimeout":"300"}',
      outputs: "{}",
      purpose: "remediation",
      status_details:
        "Version: 4.0.1.0. Line '584': Unable to notify the Collector component that controls campaign notifications. \r\nPowerShell exited with code 1\n",
      nql_id: "#restart_windows_device_infinity",
      external_reference: "",
      external_source: "",
      internal_source: "",
    },
  },
];

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

export const StubbedTicketDetailsView: React.FC<
  StubbedTicketDetailsViewProps
> = ({ ticket: initialTicket }) => {
  const navigate = useNavigate();
  const [ticket] = useState<Ticket>(initialTicket);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Simulate loading delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoadingData(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const formatStorage = (bytes?: number): string => {
    if (!bytes) return "N/A";
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(2)} GB`;
  };

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
    <div className="flex flex-col gap-4 md:gap-6 p-3 sm:p-4 md:p-6 w-full h-full overflow-y-auto items-center">
      <div className="w-full max-w-[1400px]">
        <button
          onClick={() => navigate("/home")}
          className="md:hidden flex items-center gap-2 text-[#155cfb] hover:text-[#1347e5] transition-colors mb-4"
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

        <div className="flex flex-col xl:flex-row gap-3 md:gap-4 mt-6">
          {/* Ticket Details Card */}
          <Card className="w-full xl:flex-1 p-4 md:p-5 lg:p-6 rounded-[14px] border-[0.67px] border-[#e1e8f0] bg-white shadow-sm">
            <CardContent className="p-0 flex flex-col gap-4 md:gap-6">
              <div className="flex items-center gap-2">
                <UserIcon className="w-5 h-5" />
                <h3 className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#070f26] text-base leading-6">
                  Ticket Details
                </h3>
              </div>
              {isLoadingData ? (
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

          {/* Device Details Card */}
          <Card className="w-full xl:flex-1 p-4 md:p-5 lg:p-6 rounded-[14px] border-[0.67px] border-[#e1e8f0] bg-white shadow-sm">
            <CardContent className="p-0 flex flex-col gap-4 md:gap-6">
              <div className="flex items-center gap-2">
                <MonitorIcon className="w-5 h-5 text-[#61738d]" />
                <h3 className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#070f26] text-base leading-6">
                  Device Details
                </h3>
              </div>
              {isLoadingData ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5876ab]"></div>
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
                        {stubbedDeviceDetails.deviceName}
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
                        {stubbedDeviceDetails.manufacturer}
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
                        {stubbedDeviceDetails.model}
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
                        {stubbedDeviceDetails.serialNumber}
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
                        {stubbedDeviceDetails.operatingSystem}
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
                        {stubbedDeviceDetails.osVersion}
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
                        {formatStorage(
                          stubbedDeviceDetails.totalStorageSpaceInBytes
                        )}
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
                        {formatStorage(
                          stubbedDeviceDetails.freeStorageSpaceInBytes
                        )}
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
                        {formatDate(stubbedDeviceDetails.enrolledDateTime)}
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
                        {getRelativeTime(stubbedDeviceDetails.lastSyncDateTime)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <ActivityIcon className="w-4 h-4 mt-1 text-[#61738d]" />
                    <div className="flex flex-col min-w-0">
                      <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#5876ab] text-xs leading-4">
                        Health Status
                      </span>
                      <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-sm leading-5 break-words text-[#00a63e]">
                        Compliant
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Knowledge Card */}
          <Card className="w-full xl:flex-1 p-4 md:p-5 lg:p-6 rounded-[14px] border-[0.67px] border-[#e1e8f0] bg-white shadow-sm">
            <CardContent className="p-0 flex flex-col gap-4 md:gap-6">
              <div className="flex items-center gap-2">
                <KnowledgeIcon />
                <h3 className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#070f26] text-base leading-6">
                  Knowledge
                </h3>
              </div>
              {isLoadingData ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5876ab]"></div>
                </div>
              ) : (
                <div className="flex flex-col gap-4 max-h-[600px] overflow-y-auto pr-2">
                  {stubbedKnowledgeArticles.map((article) => (
                    <div
                      key={article.sysId}
                      className="flex flex-col gap-2 pb-4 border-b-[0.67px] border-[#e1e8f0] last:border-0 last:pb-0"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#070f26] text-sm leading-5 flex-1 break-words">
                          {article.title}
                        </p>
                        <Badge className="h-auto px-2 py-0.5 rounded-lg text-xs bg-blue-100 text-[#1347e5] border-0 flex-shrink-0">
                          {article.score}%
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

          {/* Actions Card */}
          <Card className="w-full xl:flex-1 p-4 md:p-5 lg:p-6 rounded-[14px] border-[0.67px] border-[#e1e8f0] bg-white shadow-sm">
            <CardContent className="p-0 flex flex-col gap-4 md:gap-6">
              <div className="flex items-center gap-2">
                <ActionsIcon />
                <h3 className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#070f26] text-base leading-6">
                  Actions
                </h3>
              </div>
              {isLoadingData ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5876ab]"></div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-2">
                  {stubbedRemoteActions.map((action) => (
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

export default StubbedTicketDetailsView;
