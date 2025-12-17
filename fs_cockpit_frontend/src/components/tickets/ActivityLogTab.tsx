import React from "react";
import { ActivityLogPanel } from "./ActivityLogPanel";
import { KnowledgePanel, KnowledgeItem } from "./KnowledgePanel";
import { ActionsPanel, ActionItem } from "./ActionsPanel";

export interface ActivityItem {
  user: string;
  timestamp: string;
  message: string;
}

interface ActivityLogTabProps {
  activities: ActivityItem[];
  knowledgeItems?: KnowledgeItem[];
  actionItems?: ActionItem[];
  isLoading?: boolean;
  onExecuteAction?: (action: ActionItem) => void;
}

export const ActivityLogTab: React.FC<ActivityLogTabProps> = ({
  activities,
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

  return (
    <div className="space-y-6">
      {/* Activity Log Section */}
      <ActivityLogPanel activities={activities} />

      {/* Knowledge and Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <KnowledgePanel items={knowledgeItems} />
        <ActionsPanel items={actionItems} onExecute={onExecuteAction} />
      </div>
    </div>
  );
};
