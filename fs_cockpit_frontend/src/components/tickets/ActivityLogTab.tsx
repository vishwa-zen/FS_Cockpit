/**
 * ActivityLogTab Component
 *
 * Tab panel that displays activity log with timeline of ticket changes and updates.
 * Also shows knowledge articles and recommended actions in a grid below the activity log.
 *
 * Features:
 * - Activity timeline with user avatars and timestamps
 * - Knowledge base articles grid
 * - Recommended actions grid
 * - Loading state with spinner
 * - Responsive layout
 *
 * @example
 * <ActivityLogTab
 *   activities={[
 *     { user: "John Doe", timestamp: "2 hours ago", message: "Assigned to support team" }
 *   ]}
 *   knowledgeItems={[]}
 *   actionItems={[]}
 *   isLoading={false}
 *   onExecuteAction={(action) => console.log(action)}
 * />
 */
import React from "react";
import { ActivityLogPanel } from "./ActivityLogPanel";
import { KnowledgePanel, KnowledgeItem } from "./KnowledgePanel";
import { ActionsPanel, ActionItem } from "./ActionsPanel";

/**
 * Activity item data structure
 *
 * @interface ActivityItem
 */
export interface ActivityItem {
  /** User who performed the activity */
  user: string;
  /** Timestamp or relative time string */
  timestamp: string;
  /** Activity message/description */
  message: string;
}

/**
 * Props for the ActivityLogTab component
 *
 * @interface ActivityLogTabProps
 */
interface ActivityLogTabProps {
  /** Array of activity items to display */
  activities: ActivityItem[];
  /** Optional knowledge articles array */
  knowledgeItems?: KnowledgeItem[];
  /** Optional recommended actions array */
  actionItems?: ActionItem[];
  /** Whether data is loading */
  isLoading?: boolean;
  /** Callback for action execution */
  onExecuteAction?: (action: ActionItem) => void;
  /** Optional callback when a comment is added */
  onAddComment?: (comment: string) => void;
}

export const ActivityLogTab: React.FC<ActivityLogTabProps> = ({
  activities,
  knowledgeItems = [],
  actionItems = [],
  isLoading = false,
  onExecuteAction,
  onAddComment,
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
      <ActivityLogPanel activities={activities} onAddComment={onAddComment} />

      {/* Knowledge and Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <KnowledgePanel items={knowledgeItems} />
        <ActionsPanel items={actionItems} onExecute={onExecuteAction} />
      </div>
    </div>
  );
};
