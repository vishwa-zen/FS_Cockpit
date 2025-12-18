/**
 * TicketDetailsTab Component
 *
 * Tab panel that displays knowledge base articles and recommended actions side-by-side.
 * Used within the IncidentCard's tabbed interface for the "Ticket Details" tab.
 *
 * Features:
 * - Two-column grid layout (single column on mobile, 2 columns on large screens)
 * - Knowledge panel showing relevant KB articles with confidence scores
 * - Actions panel showing remediation steps with priority badges
 * - Loading states for independent data sources
 * - Execute action callback support
 *
 * @example
 * <TicketDetailsTab
 *   knowledgeItems={[
 *     { title: "WiFi Troubleshooting", severity: "85", description: "Steps to fix WiFi issues" }
 *   ]}
 *   actionItems={[
 *     { title: "Restart Network", priority: "High", description: "Restart network adapter", duration: "~2 mins", confidence: "95%" }
 *   ]}
 *   isLoadingKnowledge={false}
 *   isLoadingActions={false}
 *   onExecuteAction={(action) => console.log('Execute:', action.title)}
 * />
 */
import React from "react";
import { KnowledgePanel, KnowledgeItem } from "./KnowledgePanel";
import { ActionsPanel, ActionItem } from "./ActionsPanel";

/**
 * Props for the TicketDetailsTab component
 *
 * @interface TicketDetailsTabProps
 */
interface TicketDetailsTabProps {
  /** Array of knowledge base articles to display */
  knowledgeItems: KnowledgeItem[];
  /** Array of recommended actions to display */
  actionItems: ActionItem[];
  /** Whether knowledge articles are loading from API */
  isLoadingKnowledge?: boolean;
  /** Whether actions are loading from API */
  isLoadingActions?: boolean;
  /** Callback fired when Execute button is clicked on an action */
  onExecuteAction?: (action: ActionItem) => void;
}

export const TicketDetailsTab: React.FC<TicketDetailsTabProps> = ({
  knowledgeItems,
  actionItems,
  isLoadingKnowledge = false,
  isLoadingActions = false,
  onExecuteAction,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <KnowledgePanel items={knowledgeItems} isLoading={isLoadingKnowledge} />
      <ActionsPanel
        items={actionItems}
        isLoading={isLoadingActions}
        onExecute={onExecuteAction}
      />
    </div>
  );
};
