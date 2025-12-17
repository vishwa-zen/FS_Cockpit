import React, { useState, useEffect } from "react";
import { IncidentCard } from "./IncidentCard";
import { ActivityLogCollapsible } from "./ActivityLogCollapsible";
import { DiagnosticsPanel, DiagnosticsData } from "./DiagnosticsPanel";
import { DeviceUserDetailsPanel } from "./DeviceUserDetailsPanel";
import { KnowledgePanel, KnowledgeItem } from "./KnowledgePanel";
import { ActionsPanel, ActionItem } from "./ActionsPanel";
import { ActivityItem } from "./ActivityLogPanel";
import { DeviceUserDetails } from "./DeviceUserDetailsPanel";
import {
  deviceAPI,
  ticketsAPI,
  knowledgeAPI,
  remoteActionsAPI,
  diagnosticsAPI,
  IntuneDevice,
  RemoteAction,
  SolutionSummaryData,
} from "../../services/api";

/**
 * Ticket interface representing a ServiceNow incident
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
}

interface TicketDetailsPanelProps {
  ticket: Ticket;
}

/**
 * TicketDetailsPanel Component
 *
 * Main component for displaying ticket details with multiple tabs:
 * - Ticket Details: Shows ticket information and activity log
 * - Diagnostics: Displays system diagnostics (CPU, RAM, Disk, Network)
 * - Device & User Details: Shows device and user information
 *
 * Features:
 * - Real-time API integration for ticket data, device details, knowledge base, and actions
 * - Loading states for all async operations
 * - Error handling with user-friendly messages
 * - Responsive layout with tabbed interface
 *
 * @param {TicketDetailsPanelProps} props - Component props containing ticket information
 */
export const TicketDetailsPanel: React.FC<TicketDetailsPanelProps> = ({
  ticket: initialTicket,
}) => {
  // Tab state management
  const [activeTab, setActiveTab] = useState<
    "ticket-details" | "diagnostics" | "device-user-details"
  >("ticket-details");
  const [activityLogExpanded, setActivityLogExpanded] = useState(false);

  // Ticket data state
  const [ticket, setTicket] = useState<Ticket>(initialTicket);

  // Device data state
  const [deviceDetails, setDeviceDetails] = useState<IntuneDevice | null>(null);
  const [isLoadingDevice, setIsLoadingDevice] = useState(true);
  const [deviceError, setDeviceError] = useState<string | null>(null);

  // Knowledge base state
  const [solutionSummary, setSolutionSummary] =
    useState<SolutionSummaryData | null>(null);
  const [isLoadingKnowledge, setIsLoadingKnowledge] = useState(true);
  const [knowledgeError, setKnowledgeError] = useState<string | null>(null);

  // Remote actions state
  const [remoteActions, setRemoteActions] = useState<RemoteAction[]>([]);
  const [isLoadingActions, setIsLoadingActions] = useState(true);
  const [actionsError, setActionsError] = useState<string | null>(null);

  // Diagnostics state
  const [diagnosticsData, setDiagnosticsData] =
    useState<DiagnosticsData | null>(null);
  const [isLoadingDiagnostics, setIsLoadingDiagnostics] = useState(true);
  const [diagnosticsError, setDiagnosticsError] = useState<string | null>(null);

  // Activity log state
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);

  /**
   * Fetch all ticket-related data on component mount
   * Runs in parallel for optimal performance
   * Includes cleanup to cancel in-flight requests when ticket changes
   */
  useEffect(() => {
    // Track if component is mounted to prevent state updates after unmount
    let isMounted = true;

    // CRITICAL: Reset all state immediately when ticket changes to prevent showing stale data
    setTicket(initialTicket);
    setDeviceDetails(null);
    setDeviceError(null);
    setSolutionSummary(null);
    setKnowledgeError(null);
    setRemoteActions([]);
    setActionsError(null);
    setDiagnosticsData(null);
    setDiagnosticsError(null);

    // Reset loading states
    setIsLoadingDevice(true);
    setIsLoadingKnowledge(true);
    setIsLoadingActions(true);
    setIsLoadingDiagnostics(true);

    /**
     * Fetch ticket details from ServiceNow API
     * Updates ticket state with latest information
     */
    const fetchTicketDetails = async () => {
      try {
        const result = await ticketsAPI.getIncidentDetails(initialTicket.id);
        if (result.success && result.data && isMounted) {
          const ticketData = {
            ...result.data,
            callerId: result.data.callerId ?? undefined,
            callerName: result.data.callerName ?? undefined,
          };
          setTicket(ticketData);
        }
      } catch (error) {
        console.error(
          "[TicketDetailsPanel] Failed to fetch ticket details:",
          error
        );
      }
    };

    /**
     * Fetch device details from Intune API
     * Orchestrated call that fetches from ServiceNow first, then Intune
     */
    const fetchDeviceDetails = async () => {
      if (!isMounted) return;
      setIsLoadingDevice(true);
      setDeviceError(null);
      setDeviceDetails(null); // Clear old device details immediately

      // Debug: Log device fetch info
      console.log(
        `[TicketDetailsPanel] Fetching device for ticket: ${
          initialTicket.id
        }, device: ${initialTicket.device || "Not Available"}, caller: ${
          initialTicket.callerId || "Not Available"
        }`
      );

      try {
        const result = await deviceAPI.getDeviceDetailsOrchestrated(
          initialTicket.device,
          initialTicket.callerId || undefined
        );
        if (!isMounted) return;
        if (result.success && result.data) {
          console.log(
            `[TicketDetailsPanel] Device details received for ticket ${initialTicket.id}:`,
            {
              deviceName: result.data.deviceName,
              userPrincipalName: result.data.userPrincipalName,
              serialNumber: result.data.serialNumber,
            }
          );
          setDeviceDetails(result.data);

          // Fetch diagnostics using the actual device name from Intune
          fetchDiagnostics(result.data.deviceName);
        } else {
          // CRITICAL: Clear old device details when API fails
          console.log(
            `[TicketDetailsPanel] No device details for ticket ${initialTicket.id}: ${result.message}`
          );
          setDeviceDetails(null);
          setDeviceError(result.message || "Device information not available");
          // Still try diagnostics with original device name if available
          if (
            initialTicket.device &&
            initialTicket.device !== "Not Available"
          ) {
            fetchDiagnostics(initialTicket.device);
          }
        }
      } catch (error) {
        console.error("[TicketDetailsPanel] Device fetch error:", error);
        if (isMounted) {
          setDeviceError("Device details temporarily unavailable");
        }
      } finally {
        if (isMounted) {
          setIsLoadingDevice(false);
        }
      }
    };

    /**
     * Fetch solution summary from knowledge base API
     * Provides AI-generated insights and recommendations
     */
    const fetchSolutionSummary = async () => {
      if (!isMounted) return;
      setIsLoadingKnowledge(true);
      setKnowledgeError(null);
      try {
        const result = await knowledgeAPI.getSolutionSummary(
          initialTicket.id,
          4
        );
        if (!isMounted) return;
        if (result.success && result.data) {
          setSolutionSummary(result.data);
        } else {
          setKnowledgeError(result.message || "No solution summary found");
        }
      } catch (error) {
        console.error("[TicketDetailsPanel] Knowledge fetch error:", error);
        if (isMounted) {
          setKnowledgeError("Knowledge base temporarily unavailable");
        }
      } finally {
        if (isMounted) {
          setIsLoadingKnowledge(false);
        }
      }
    };

    /**
     * Fetch remote action recommendations from NextThink API
     * Provides automated remediation suggestions
     */
    const fetchRemoteActions = async () => {
      if (!isMounted) return;
      setIsLoadingActions(true);
      setActionsError(null);
      try {
        const result = await remoteActionsAPI.getRecommendations(
          initialTicket.id,
          initialTicket.device,
          initialTicket.callerId || undefined,
          3
        );
        if (!isMounted) return;
        if (result.success && result.data) {
          setRemoteActions(result.data);
        } else {
          setActionsError(result.message || "No recommendations available");
        }
      } catch (error) {
        console.error("[TicketDetailsPanel] Actions fetch error:", error);
        if (isMounted) {
          setActionsError("Actions temporarily unavailable");
        }
      } finally {
        if (isMounted) {
          setIsLoadingActions(false);
        }
      }
    };

    /**
     * Fetch device diagnostics from NextThink API
     * Provides comprehensive system health metrics
     * Must be called after device details are fetched to use correct device name
     */
    const fetchDiagnostics = async (deviceNameToUse?: string) => {
      const finalDeviceName = deviceNameToUse || initialTicket.device;

      if (!finalDeviceName || finalDeviceName === "Not Available") {
        if (isMounted) {
          setIsLoadingDiagnostics(false);
          setDiagnosticsError("No device assigned to this ticket");
        }
        return;
      }

      if (!isMounted) return;
      setIsLoadingDiagnostics(true);
      setDiagnosticsError(null);

      console.log(
        `[TicketDetailsPanel] Fetching diagnostics for device: ${finalDeviceName}`
      );

      try {
        const result = await diagnosticsAPI.getDeviceDiagnostics(
          finalDeviceName,
          "full",
          true
        );
        if (!isMounted) return;
        if (result.success && result.data) {
          const data = result.data;
          // Transform API response to DiagnosticsData format
          setDiagnosticsData({
            cpuUsage: data.hardware?.cpu?.cpu_usage_percent
              ? data.hardware.cpu.cpu_usage_percent.toFixed(1)
              : "Not Available",
            ramUsage: data.hardware?.memory?.memory_usage_percent
              ? data.hardware.memory.memory_usage_percent.toFixed(1)
              : "Not Available",
            diskUsage: data.hardware?.disk?.disk_total_gb
              ? "Not Available"
              : "Not Available",
            networkLatency: data.hardware?.network_metrics
              ?.wifi_signal_strength_24h_percent
              ? `${data.hardware.network_metrics.wifi_signal_strength_24h_percent.toFixed(
                  0
                )}`
              : "Not Available",
            processCount: "Not Available",
            uptime: data.os_health?.uptime_info?.uptime_days
              ? `${data.os_health.uptime_info.uptime_days}d ${Math.floor(
                  (data.os_health.uptime_info.uptime_days % 1) * 24
                )}h`
              : "Not Available",
            batteryPercentage: undefined,
          });
        } else {
          if (isMounted) {
            setDiagnosticsError(result.message || "Diagnostics not available");
          }
        }
      } catch (error) {
        console.error("[TicketDetailsPanel] Diagnostics fetch error:", error);
        if (isMounted) {
          setDiagnosticsError("Diagnostics temporarily unavailable");
        }
      } finally {
        if (isMounted) {
          setIsLoadingDiagnostics(false);
        }
      }
    };

    // Execute fetches - diagnostics runs after device details to get correct device name
    fetchTicketDetails();
    fetchDeviceDetails(); // This will call fetchDiagnostics internally
    fetchSolutionSummary();
    fetchRemoteActions();

    // Cleanup function: prevent state updates after component unmounts or ticket changes
    return () => {
      isMounted = false;
    };
  }, [initialTicket]);

  /**
   * Transform solution summary data to knowledge items for display
   * Maps API response to component-friendly format
   * Converts text confidence levels to numeric percentages
   */
  const knowledgeItems: KnowledgeItem[] =
    solutionSummary?.summary_points.map((point, index) => {
      // Convert text confidence to numeric percentage
      let confidenceScore: string | undefined;
      const confidence = solutionSummary.confidence?.toLowerCase();
      if (confidence === "high") confidenceScore = "85";
      else if (confidence === "medium") confidenceScore = "70";
      else if (confidence === "low") confidenceScore = "50";

      return {
        title: point,
        description:
          solutionSummary.message ||
          "Analysis based on incident data and historical patterns",
        severity: confidenceScore,
        source: solutionSummary.source,
      };
    }) || [];

  /**
   * Transform remote actions to action items for display
   * Maps API response fields to component interface
   * Determines priority based on action status
   */
  const actionItems: ActionItem[] = remoteActions.map((action) => ({
    title: action.actionName || action.actionType || "Unknown Action",
    priority:
      action.status?.toLowerCase() === "success"
        ? "low"
        : action.status?.toLowerCase() === "failed"
        ? "high"
        : "medium",
    description:
      action.result?.purpose ||
      action.result?.outputs ||
      "No description available",
    duration: "Not specified",
    confidence: action.result?.status_details || "Pending analysis",
  }));

  /**
   * Transform device details to user-friendly format
   * Combines ServiceNow and Intune data
   * Calculates memory and disk usage percentages
   */
  const deviceUserDetails: DeviceUserDetails | null = deviceDetails
    ? {
        userName: ticket.callerName || "Not available",
        userId: ticket.callerId || "Not available",
        emailId: deviceDetails.userPrincipalName || "Not available",
        complianceState: deviceDetails.complianceState || "Unknown",
        deviceName:
          deviceDetails.deviceName || ticket.device || "Not available",
        operatingSystem: deviceDetails.operatingSystem || "Not detected",
        osVersion: deviceDetails.osVersion,
        serialNumber: deviceDetails.serialNumber || "Not available",
        lastSyncDateTime: deviceDetails.lastSyncDateTime
          ? new Date(deviceDetails.lastSyncDateTime).toLocaleString()
          : "Never synced",
        managedDeviceOwnerType:
          deviceDetails.managedDeviceOwnerType || "Not specified",
        enrolledDateTime: deviceDetails.enrolledDateTime
          ? new Date(deviceDetails.enrolledDateTime).toLocaleString()
          : undefined,
        memoryUsage: deviceDetails.totalStorageSpaceInBytes
          ? `${(
              ((deviceDetails.totalStorageSpaceInBytes -
                (deviceDetails.freeStorageSpaceInBytes || 0)) /
                deviceDetails.totalStorageSpaceInBytes) *
              100
            ).toFixed(0)}%`
          : undefined,
        diskUsage:
          deviceDetails.freeStorageSpaceInBytes &&
          deviceDetails.totalStorageSpaceInBytes
            ? `${(
                ((deviceDetails.totalStorageSpaceInBytes -
                  deviceDetails.freeStorageSpaceInBytes) /
                  deviceDetails.totalStorageSpaceInBytes) *
                100
              ).toFixed(0)}%`
            : undefined,
        manufacturer: deviceDetails.manufacturer,
        model: deviceDetails.model,
        ipAddress: deviceDetails.ipAddress,
        macAddress: deviceDetails.macAddress,
        connectionType: deviceDetails.connectionType,
      }
    : null;

  /**
   * Handle action execution button click
   * TODO: Implement actual action execution logic with NextThink API
   * @param {ActionItem} action - The action to execute
   */
  const handleExecuteAction = (action: ActionItem) => {
    // TODO: Call remote action execution API
  };

  return (
    <div className="space-y-6 w-full p-6">
      {/* Incident Card with Tab Content Inside */}
      <IncidentCard
        incidentNumber={ticket.id}
        title={ticket.title}
        status={ticket.status}
        priority={ticket.priority || "Medium"}
        userDisplayName={ticket.callerName || ticket.device || "User"}
        deviceName={ticket.device || "No device assigned"}
        created={ticket.time || "Time not available"}
        assignedTo="Support Engineer"
        category="Performance & Slowness"
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as typeof activeTab)}
        activityLogExpanded={activityLogExpanded}
        onActivityLogToggle={() => setActivityLogExpanded(!activityLogExpanded)}
      >
        {/* Tab Content Rendered Inside the Card */}
        {activeTab === "ticket-details" && (
          <ActivityLogCollapsible
            activities={activities}
            isExpanded={activityLogExpanded}
            onToggle={() => setActivityLogExpanded(!activityLogExpanded)}
            isLoading={isLoadingActivities}
            error={activitiesError}
          />
        )}

        {activeTab === "diagnostics" && (
          <div className="pt-6 border-t border-[#E1E8F0] w-full min-w-0">
            {diagnosticsData ? (
              <DiagnosticsPanel diagnostics={diagnosticsData} />
            ) : isLoadingDiagnostics ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3B82F6]"></div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <p className="text-[#61738D] text-sm">
                  {diagnosticsError || "No diagnostics data available"}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "device-user-details" && deviceUserDetails && (
          <div className="pt-6 border-t border-[#E1E8F0] w-full min-w-0">
            <DeviceUserDetailsPanel details={deviceUserDetails} />
          </div>
        )}

        {activeTab === "device-user-details" &&
          !deviceUserDetails &&
          !isLoadingDevice && (
            <div className="pt-6 border-t border-[#E1E8F0] text-center text-[#61738D]">
              {deviceError || "Device information not available"}
            </div>
          )}
      </IncidentCard>

      {/* Knowledge and Actions - Always Visible Below */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        <div className="min-w-0 w-full">
          <KnowledgePanel
            items={knowledgeItems}
            isLoading={isLoadingKnowledge}
          />
        </div>
        <div className="min-w-0 w-full">
          <ActionsPanel
            items={actionItems}
            isLoading={isLoadingActions}
            onExecute={handleExecuteAction}
          />
        </div>
      </div>
    </div>
  );
};
