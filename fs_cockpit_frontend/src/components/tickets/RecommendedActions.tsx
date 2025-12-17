import React from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { ZapIcon } from "lucide-react";

export interface ActionItem {
  title: string;
  priority: string;
  description: string;
  duration: string;
  confidence: string;
}

interface RecommendedActionsProps {
  items: ActionItem[];
  isLoading?: boolean;
  onExecute?: (action: ActionItem) => void;
}

export const RecommendedActions: React.FC<RecommendedActionsProps> = ({
  items,
  isLoading = false,
  onExecute,
}) => {
  const getPriorityBadgeColor = (priority: string) => {
    const priorityLower = priority.toLowerCase();
    if (priorityLower === "high") {
      return "bg-[#FEE2E2] text-[#991B1B]";
    }
    if (priorityLower === "medium") {
      return "bg-[#FEF3C7] text-[#92400E]";
    }
    return "bg-[#DBEAFE] text-[#1E40AF]";
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <ZapIcon className="w-5 h-5 text-[#3B82F6]" />
          <h2 className="text-base font-semibold text-[#0E162B]">Actions</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3B82F6]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <ZapIcon className="w-5 h-5 text-[#3B82F6]" />
        <h2 className="text-base font-semibold text-[#0E162B]">Actions</h2>
      </div>

      {items.length === 0 ? (
        <Card className="border border-[#E1E8F0] shadow-sm">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-[#61738D]">No actions available</p>
          </CardContent>
        </Card>
      ) : (
        items.map((item, index) => (
          <Card
            key={index}
            className="border border-[#E1E8F0] shadow-sm hover:shadow-md transition-shadow"
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-sm font-semibold text-[#0E162B] flex-1">
                  {item.title}
                </h3>
                <Badge
                  className={`${getPriorityBadgeColor(
                    item.priority
                  )} border-0 px-2 py-1 text-xs font-medium ml-2 flex-shrink-0`}
                >
                  {item.priority}
                </Badge>
              </div>
              <p className="text-xs text-[#61738D] mb-3 leading-relaxed">
                {item.description}
              </p>
              <div className="flex items-center justify-between text-xs text-[#61738D] mb-3">
                <span>{item.duration}</span>
                <span>{item.confidence}</span>
              </div>
              <Button
                onClick={() => onExecute?.(item)}
                className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white text-sm py-2 rounded-lg"
              >
                Execute
              </Button>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};
