import React from "react";
import { KnowledgePanel, KnowledgeItem } from "./KnowledgePanel";
import { ActionsPanel, ActionItem } from "./ActionsPanel";

interface TicketDetailsTabProps {
  knowledgeItems: KnowledgeItem[];
  actionItems: ActionItem[];
  isLoadingKnowledge?: boolean;
  isLoadingActions?: boolean;
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
