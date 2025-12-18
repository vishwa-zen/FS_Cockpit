/**
 * DeviceUserDetailsTab Component
 *
 * Tab panel that displays device and user information along with knowledge/actions.
 * Used within the IncidentCard's tabbed interface for the "Device & User Details" tab.
 *
 * Features:
 * - Device and user details panel with compliance status
 * - Knowledge base articles grid
 * - Recommended actions grid
 * - Loading state with spinner
 * - Empty state when no device data available
 * - Responsive layout (stacked on mobile, grid on desktop)
 *
 * @example
 * <DeviceUserDetailsTab
 *   details={{
 *     userName: "John Doe",
 *     userId: "john.doe@company.com",
 *     deviceName: "LAPTOP-ABC123",
 *     complianceState: "Compliant",
 *     operatingSystem: "Windows 11",
 *     emailId: "john.doe@company.com",
 *     lastSyncDateTime: "2025-12-18T10:00:00Z",
 *     serialNumber: "SN123456",
 *     managedDeviceOwnerType: "Company"
 *   }}
 *   knowledgeItems={[]}
 *   actionItems={[]}
 *   isLoading={false}
 *   onExecuteAction={(action) => console.log(action)}
 * />
 */
import React from "react";
import { DeviceUserDetailsPanel } from "./DeviceUserDetailsPanel";
import { KnowledgePanel, KnowledgeItem } from "./KnowledgePanel";
import { ActionsPanel, ActionItem } from "./ActionsPanel";
import { Monitor } from "@components/icons";

/**
 * Device and user details data structure
 *
 * @interface DeviceUserDetails
 */
export interface DeviceUserDetails {
  /** User's full display name */
  userName: string;
  /** User's unique identifier (UPN) */
  userId: string;
  /** Device hostname/computer name */
  deviceName: string;
  /** Optional device health score */
  deviceScore?: string;
  /** User's email address */
  emailId: string;
  /** Optional employee ID */
  employeeId?: string;
  /** Operating system name */
  operatingSystem: string;
  /** OS version/build number */
  osVersion?: string;
  /** Compliance status */
  complianceState: string;
  /** Optional device ID */
  id?: string;
  /** Last sync timestamp */
  lastSyncDateTime: string;
  /** Device serial number */
  serialNumber: string;
  /** Device ownership type */
  managedDeviceOwnerType: string;
  /** Optional enrollment timestamp */
  enrolledDateTime?: string;
  /** Memory usage percentage */
  memoryUsage?: string;
  /** Disk usage percentage */
  diskUsage?: string;
}

/**
 * Props for the DeviceUserDetailsTab component
 *
 * @interface DeviceUserDetailsTabProps
 */
interface DeviceUserDetailsTabProps {
  /** Device and user details object (null if not available) */
  details: DeviceUserDetails | null;
  /** Optional knowledge articles array */
  knowledgeItems?: KnowledgeItem[];
  /** Optional recommended actions array */
  actionItems?: ActionItem[];
  /** Whether device details are loading */
  isLoading?: boolean;
  /** Callback for action execution */
  onExecuteAction?: (action: ActionItem) => void;
}

export const DeviceUserDetailsTab: React.FC<DeviceUserDetailsTabProps> = ({
  details,
  knowledgeItems = [],
  actionItems = [],
  isLoading = false,
  onExecuteAction,
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3B82F6]"></div>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <Monitor className="w-16 h-16 text-[#93C5FD] mb-4" strokeWidth={1.5} />
        <p className="[font-family:'Arial-Regular',Helvetica] text-[#61738D] text-sm text-center">
          No device or user details available for this incident at the moment
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Device & User Details */}
      <DeviceUserDetailsPanel details={details} />

      {/* Knowledge and Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <KnowledgePanel items={knowledgeItems} />
        <ActionsPanel items={actionItems} onExecute={onExecuteAction} />
      </div>
    </div>
  );
};
