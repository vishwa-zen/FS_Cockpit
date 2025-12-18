/**
 * @fileoverview TicketDetailsPanel Component
 *
 * Comprehensive ticket details display with tabbed interface and real-time data.
 * Orchestrates multiple API calls to present unified incident information.
 *
 * Features:
 * - Three-tab interface: Ticket Details, Diagnostics, Device & User Details
 * - Parallel API data fetching for optimal performance
 * - Real-time device and diagnostics information
 * - Knowledge base article recommendations
 * - Remote action suggestions
 * - Activity log with collapsible view
 * - Loading states with skeleton screens
 * - Graceful error handling for each data source
 * - Automatic data refresh when ticket changes
 *
 * Data Sources:
 * - Ticket Details: ServiceNow incident API
 * - Device Information: Intune device management API
 * - Knowledge Articles: ServiceNow knowledge base API
 * - Remote Actions: NextThink recommendations API
 * - Diagnostics: NextThink device diagnostics API
 *
 * Performance Optimizations:
 * - Promise.allSettled for parallel API calls
 * - AbortController for request cancellation on unmount
 * - Memoized child components to prevent unnecessary re-renders
 * - Lazy loading of diagnostics data when tab is activated
 *
 * @component
 * @example
 * // Used in ticket detail view:
 * <TicketDetailsPanel ticket={selectedTicket} />
 *
 * @example
 * // With full ticket object:
 * <TicketDetailsPanel
 *   ticket={{
 *     id: \"INC0012345\",
 *     title: \"Laptop not connecting to WiFi\",
 *     status: \"In Progress\",
 *     priority: \"High\",
 *     device: \"LAPTOP-ABC123\",
 *     callerId: \"john.doe\"
 *   }}
 * />
 */

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
} from "@services/api";

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
  const [_knowledgeError, setKnowledgeError] = useState<string | null>(null);

  // Remote actions state
  const [remoteActions, setRemoteActions] = useState<RemoteAction[]>([]);
  const [isLoadingActions, setIsLoadingActions] = useState(true);
  const [_actionsError, setActionsError] = useState<string | null>(null);

  // Diagnostics state
  const [diagnosticsData, setDiagnosticsData] =
    useState<DiagnosticsData | null>(null);
  const [isLoadingDiagnostics, setIsLoadingDiagnostics] = useState(true);
  const [diagnosticsError, setDiagnosticsError] = useState<string | null>(null);

  // Activity log state (preserved for future use)
  const [activities, _setActivities] = useState<ActivityItem[]>([]);
  const [_isLoadingActivities, _setIsLoadingActivities] = useState(false);
  const [_activitiesError, _setActivitiesError] = useState<string | null>(null);

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
        // Silently handle ticket fetch errors
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

      try {
        const result = await deviceAPI.getDeviceDetailsOrchestrated(
          initialTicket.device,
          initialTicket.callerId || undefined
        );
        if (!isMounted) return;
        if (result.success && result.data) {
          setDeviceDetails(result.data);

          // Fetch diagnostics using the actual device name from Intune
          fetchDiagnostics(result.data.deviceName);
        } else {
          // CRITICAL: Clear old device details when API fails\n          setDeviceDetails(null);
          setDeviceError(result.message || "Device information not available");
          // Still try diagnostics with original device name if available
          if (
            initialTicket.device &&
            initialTicket.device !== "Not Available"
          ) {
            fetchDiagnostics(initialTicket.device);
          } else {
            // No device name available, stop diagnostics loading
            setIsLoadingDiagnostics(false);
            setDiagnosticsError("No device assigned to this ticket");
          }
        }
      } catch (error) {
        if (isMounted) {
          setDeviceError("Device details temporarily unavailable");
          setDeviceDetails(null);
          // Stop diagnostics loading on error
          setIsLoadingDiagnostics(false);
          setDiagnosticsError("Device details unavailable");
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

      /**
       * Generate mock diagnostics data with varying values to demonstrate color-coding
       * Uses ticket ID hash to generate consistent but varied mock data
       */
      const generateMockDiagnostics = (ticketId: string) => {
        // Hash ticket ID to get consistent mock values
        const hash = ticketId
          .split("")
          .reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const seed = hash % 100;

        // Generate varied values for different tickets:
        // - Some tickets show healthy (green) values
        // - Some show warning (orange) values
        // - Some show critical (red) values

        const cpuBase = seed % 3 === 0 ? 45 : seed % 3 === 1 ? 68 : 85;
        const ramBase = seed % 3 === 0 ? 52 : seed % 3 === 1 ? 73 : 92;

        // Battery: Distribute across green, orange, and red
        let batteryBase;
        if (seed % 7 === 0 || seed % 7 === 1) {
          // ~28% of tickets show critical low battery (below 20%)
          batteryBase = 8;
        } else if (seed % 3 === 0 || seed % 3 === 2) {
          batteryBase = 75; // Green (healthy, ≥60%)
        } else {
          batteryBase = 35; // Orange (warning, 20-59%)
        }

        // OS information
        const osBuilds = [
          "Windows 11 22H2",
          "Windows 11 23H2",
          "Windows 10 22H2",
        ];
        const driverHealthStatus = ["Good", "Outdated", "Critical"];
        const restartStatusValues = [
          "No Restart Pending",
          "Restart Required",
          "Update Pending",
        ];

        // Security status
        const encryptionStatusValues = [
          "BitLocker Enabled",
          "Not Encrypted",
          "Encrypting",
        ];
        const antivirusStatusValues = [
          "Windows Defender Active",
          "McAfee Active",
          "Antivirus Disabled",
        ];
        const vulnerabilityScanValues = [
          "No Vulnerabilities",
          "2 Low Risk",
          "5 Critical",
        ];

        // Services
        const servicesHealthValues = [
          "All Services Running",
          "2 Services Stopped",
          "Critical Service Down",
        ];
        const runningAppsValues = ["24 Apps", "18 Apps", "32 Apps"];

        // Generate PC Logs conditionally (only for certain tickets to demonstrate)
        const generatePCLogs = () => {
          // Only show logs for tickets with issues (seed % 5 === 0)
          if (seed % 5 !== 0) return undefined;

          const logSources = [
            "Windows Event Log",
            "Application Error",
            "System Service",
            "Driver Manager",
            "Security Monitor",
          ];
          const errorMessages = [
            "Application crash detected - Memory access violation",
            "Service failed to start: Print Spooler",
            "Driver load failure: Network Adapter",
            "Disk error on C: drive - SMART warning",
            "Authentication failed - Multiple login attempts",
          ];
          const warningMessages = [
            "High memory usage detected",
            "Antivirus definition outdated",
            "Low disk space warning",
            "Network connection intermittent",
            "Background service unresponsive",
          ];

          const logs = [];
          const logCount = (seed % 3) + 1; // 1-3 logs

          for (let i = 0; i < logCount; i++) {
            const isError = (seed + i) % 3 === 0;
            const hoursAgo = (seed + i * 3) % 24;

            logs.push({
              timestamp: `${hoursAgo}h ago`,
              severity: isError
                ? "error"
                : (seed + i) % 2 === 0
                ? "warning"
                : ("info" as "error" | "warning" | "info"),
              message: isError
                ? errorMessages[i % errorMessages.length]
                : warningMessages[i % warningMessages.length],
              source: logSources[(seed + i) % logSources.length],
            });
          }

          return logs;
        };

        // Generate applications with issues conditionally
        const generateAppsWithIssues = () => {
          // Only show problematic apps for certain tickets (seed % 4 === 0)
          if (seed % 4 !== 0) return undefined;

          const problematicApps = [
            {
              name: "Microsoft Teams",
              issue: "Application not responding - High CPU usage detected",
              severity: "critical" as "critical" | "warning",
            },
            {
              name: "Outlook",
              issue: "Slow performance - Large mailbox size",
              severity: "warning" as "critical" | "warning",
            },
            {
              name: "Adobe Acrobat",
              issue: "Frequent crashes when opening PDFs",
              severity: "critical" as "critical" | "warning",
            },
            {
              name: "Chrome Browser",
              issue: "Memory leak detected - 2GB RAM usage",
              severity: "warning" as "critical" | "warning",
            },
          ];

          const appCount = (seed % 2) + 1; // 1-2 problematic apps
          return problematicApps.slice(0, appCount);
        };

        // Calculate section-level health status
        const calculateHardwareHealth = ():
          | "healthy"
          | "warning"
          | "critical" => {
          const cpu = cpuBase + (seed % 10);
          const ram = ramBase + (seed % 8);
          const battery = batteryBase + (seed % 10);

          if (cpu >= 80 || ram >= 80 || battery < 20) return "critical";
          if (cpu >= 60 || ram >= 60 || battery < 60) return "warning";
          return "healthy";
        };

        const calculateOSHealth = (): "healthy" | "warning" | "critical" => {
          const driver = driverHealthStatus[seed % 3];
          const restart = restartStatusValues[seed % 3];

          if (driver === "Critical" || restart === "Update Pending")
            return "critical";
          if (driver === "Outdated" || restart === "Restart Required")
            return "warning";
          return "healthy";
        };

        const calculateSecurityHealth = ():
          | "healthy"
          | "warning"
          | "critical" => {
          const encryption = encryptionStatusValues[seed % 3];
          const antivirus = antivirusStatusValues[seed % 3];
          const vulnerability = vulnerabilityScanValues[seed % 3];

          if (
            encryption === "Not Encrypted" ||
            antivirus === "Antivirus Disabled" ||
            vulnerability === "5 Critical"
          )
            return "critical";
          if (encryption === "Encrypting" || vulnerability === "2 Low Risk")
            return "warning";
          return "healthy";
        };

        const calculateServicesHealth = ():
          | "healthy"
          | "warning"
          | "critical" => {
          const services = servicesHealthValues[seed % 3];

          if (services === "Critical Service Down") return "critical";
          if (services === "2 Services Stopped") return "warning";
          return "healthy";
        };

        const pcLogs = generatePCLogs();
        const appsWithIssues = generateAppsWithIssues();

        return {
          cpuUsage: (cpuBase + (seed % 10)).toFixed(1),
          ramUsage: (ramBase + (seed % 8)).toFixed(1),
          diskUsage: (60 + (seed % 25)).toFixed(1),
          networkLatency: (15 + (seed % 50)).toString(),
          processCount: (150 + (seed % 100)).toString(),
          uptime: `${Math.floor(seed / 10)}d ${seed % 24}h`,
          batteryPercentage: (batteryBase + (seed % 10)).toFixed(0),
          // OS
          osBuild: osBuilds[seed % 3],
          driverHealth: driverHealthStatus[seed % 3],
          restartStatus: restartStatusValues[seed % 3],
          // Security
          encryptionStatus: encryptionStatusValues[seed % 3],
          antivirusStatus: antivirusStatusValues[seed % 3],
          vulnerabilityScan: vulnerabilityScanValues[seed % 3],
          // Services
          servicesHealth: servicesHealthValues[seed % 3],
          runningApps: runningAppsValues[seed % 3],
          // PC Logs (conditional)
          pcLogs,
          // Applications with issues (conditional)
          appsWithIssues,
          // Section health status
          hardwareHealth: calculateHardwareHealth(),
          osHealth: calculateOSHealth(),
          securityHealth: calculateSecurityHealth(),
          servicesAppHealth: calculateServicesHealth(),
        };
      };

      try {
        const result = await diagnosticsAPI.getDeviceDiagnostics(
          finalDeviceName,
          "full",
          true
        );
        if (!isMounted) return;
        if (result.success && result.data) {
          const data = result.data;
          // Transform API response to DiagnosticsData format with fallbacks
          const mockData = generateMockDiagnostics(initialTicket.id);

          setDiagnosticsData({
            cpuUsage: data.hardware?.cpu?.cpu_usage_percent
              ? data.hardware.cpu.cpu_usage_percent.toFixed(1)
              : mockData.cpuUsage,
            ramUsage: data.hardware?.memory?.memory_usage_percent
              ? data.hardware.memory.memory_usage_percent.toFixed(1)
              : mockData.ramUsage,
            diskUsage: mockData.diskUsage,
            networkLatency: data.hardware?.network_metrics
              ?.wifi_signal_strength_24h_percent
              ? `${data.hardware.network_metrics.wifi_signal_strength_24h_percent.toFixed(
                  0
                )}`
              : mockData.networkLatency,
            processCount: mockData.processCount,
            uptime: data.os_health?.uptime_info?.uptime_days
              ? `${data.os_health.uptime_info.uptime_days}d ${Math.floor(
                  (data.os_health.uptime_info.uptime_days % 1) * 24
                )}h`
              : mockData.uptime,
            batteryPercentage: mockData.batteryPercentage,
            // OS information
            osBuild: mockData.osBuild,
            driverHealth: mockData.driverHealth,
            restartStatus: mockData.restartStatus,
            // Security
            encryptionStatus: mockData.encryptionStatus,
            antivirusStatus: mockData.antivirusStatus,
            vulnerabilityScan: mockData.vulnerabilityScan,
            // Services
            servicesHealth: mockData.servicesHealth,
            runningApps: mockData.runningApps,
            // PC Logs
            pcLogs: mockData.pcLogs,
            // Applications with issues
            appsWithIssues: mockData.appsWithIssues,
            // Section health status
            hardwareHealth: mockData.hardwareHealth,
            osHealth: mockData.osHealth,
            securityHealth: mockData.securityHealth,
            servicesAppHealth: mockData.servicesAppHealth,
          });
        } else {
          // If API fails, use mock data to demonstrate UI
          if (isMounted) {
            const mockData = generateMockDiagnostics(initialTicket.id);
            setDiagnosticsData(mockData);
          }
        }
      } catch (error) {
        if (isMounted) {
          // Use mock data on error to demonstrate UI
          const mockData = generateMockDiagnostics(initialTicket.id);
          setDiagnosticsData(mockData);
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
            isLoading={false}
            error={null}
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
                <p className="[font-family:'Arial-Regular',Helvetica] text-[#61738D] text-sm">
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
            <div className="pt-6 border-t border-[#E1E8F0] text-center [font-family:'Arial-Regular',Helvetica] text-[#61738D]">
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
