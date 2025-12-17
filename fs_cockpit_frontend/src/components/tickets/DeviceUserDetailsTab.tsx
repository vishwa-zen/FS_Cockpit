import React from "react";
import { DeviceUserDetailsPanel } from "./DeviceUserDetailsPanel";
import { KnowledgePanel, KnowledgeItem } from "./KnowledgePanel";
import { ActionsPanel, ActionItem } from "./ActionsPanel";
import { Monitor } from "lucide-react";

export interface DeviceUserDetails {
  userName: string;
  userId: string;
  deviceName: string;
  deviceScore?: string;
  emailId: string;
  employeeId?: string;
  operatingSystem: string;
  osVersion?: string;
  complianceState: string;
  id?: string;
  lastSyncDateTime: string;
  serialNumber: string;
  managedDeviceOwnerType: string;
  enrolledDateTime?: string;
  memoryUsage?: string;
  diskUsage?: string;
}

interface DeviceUserDetailsTabProps {
  details: DeviceUserDetails | null;
  knowledgeItems?: KnowledgeItem[];
  actionItems?: ActionItem[];
  isLoading?: boolean;
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
