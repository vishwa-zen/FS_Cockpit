/**
 * ActionsPanel Component
 *
 * Displays recommended remote actions from NextThink for incident remediation.
 * Shows actionable items with priority levels, execution time estimates, and confidence scores.
 *
 * Features:
 * - Loading state with skeleton placeholders
 * - Empty state with lightning bolt icon
 * - Priority badges (High = red, Medium = yellow, Low = gray)
 * - Execution time and confidence display
 * - Execute button with callback handler
 * - Responsive card layout with hover effects
 * - Mobile-optimized button and text sizing
 *
 * @example
 * ```tsx
 * <ActionsPanel
 *   items={[
 *     {
 *       title: "Restart Network Adapter",
 *       priority: "High",
 *       description: "Remotely restart the network adapter to resolve connectivity issues",
 *       duration: "~2 minutes",
 *       confidence: "95% confidence"
 *     }
 *   ]}
 *   isLoading={false}
 *   onExecute={(action) => console.log('Executing:', action.title)}
 * />
 * ```
 */
import React from "react";
import { Card } from "@ui/card";
import { Badge } from "@ui/badge";
import { Button } from "@ui/button";
import { Zap } from "@components/icons";

/**
 * Remote action item structure
 *
 * @interface ActionItem
 */
export interface ActionItem {
  /** Action title/name */
  title: string;
  /** Priority level (High, Medium, Low) */
  priority: string;
  /** Detailed description of what the action does */
  description: string;
  /** Estimated execution time (e.g., "~2 minutes") */
  duration: string;
  /** Confidence score (e.g., "95% confidence") */
  confidence: string;
}

/**
 * Props for the ActionsPanel component
 *
 * @interface ActionsPanelProps
 */
interface ActionsPanelProps {
  /** Array of recommended actions to display */
  items: ActionItem[];
  /** Whether actions are currently being fetched from API */
  isLoading?: boolean;
  /** Callback fired when Execute button is clicked */
  onExecute?: (action: ActionItem) => void;
}

export const ActionsPanel: React.FC<ActionsPanelProps> = React.memo(
  ({ items, isLoading, onExecute }) => {
    /**
     * Determines badge color classes based on action priority
     * @param {string} priority - Priority level (High, Medium, Low)
     * @returns {string} Tailwind CSS classes for priority badge
     */
    const getPriorityColor = (priority: string) => {
      const priorityLower = priority.toLowerCase();
      if (priorityLower === "high")
        return "bg-[#FEE2E2] text-[#991B1B] border-[#991B1B]/20";
      if (priorityLower === "medium")
        return "bg-[#FEF3C7] text-[#92400E] border-[#92400E]/20";
      return "bg-[#F3F4F6] text-[#374151] border-[#374151]/20";
    };

    if (isLoading) {
      return (
        <Card className="bg-white border-[0.67px] border-[#BAD2EE] rounded-[14px] p-4 w-full shadow-[0px_1px_2px_-1px_rgba(0,0,0,0.1),0px_1px_3px_0px_rgba(0,0,0,0.1)]">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-[#3B82F6]" />
            <h3 className="[font-family:'Arial-Regular',Helvetica] text-[#0E162B] text-base font-semibold">
              Actions
            </h3>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-100 rounded-lg p-4 animate-pulse">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-5 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-4/5 mb-3"></div>
                <div className="flex items-center justify-between">
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                  <div className="h-8 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      );
    }

    return (
      <Card className="bg-white border-[0.67px] border-[#BAD2EE] rounded-[14px] p-3 sm:p-4 w-full shadow-[0px_1px_2px_-1px_rgba(0,0,0,0.1),0px_1px_3px_0px_rgba(0,0,0,0.1)]">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-[#3B82F6]" />
          <h3 className="[font-family:'Arial-Regular',Helvetica] text-[#0E162B] text-sm sm:text-base font-semibold">
            Actions
          </h3>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 sm:py-12 px-3 sm:px-4">
            <Zap
              className="w-10 h-10 sm:w-12 sm:h-12 text-[#93C5FD] mb-3 sm:mb-4"
              strokeWidth={1.5}
            />
            <p className="[font-family:'Arial-Regular',Helvetica] text-[#61738D] text-xs sm:text-sm text-center">
              There are no recommended actions for this incident at the moment
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item, index) => (
              <div
                key={index}
                className="bg-[#BAD2EE1A] rounded-[10px] border-[0.67px] border-[#0072BC33] pt-[12px] sm:pt-[16.67px] px-[12px] sm:px-[16.67px] pb-[0.67px] hover:bg-[#BAD2EE2A] transition-colors"
                style={{ gap: "8px" }}
              >
                <div className="flex items-start justify-between gap-2 sm:gap-3 mb-2">
                  <h4 className="[font-family:'Arial-Regular',Helvetica] text-[#5876AB] text-sm sm:text-base font-normal flex-1">
                    {item.title}
                  </h4>
                  <Badge
                    className={`${getPriorityColor(
                      item.priority
                    )} px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold rounded-full flex-shrink-0`}
                  >
                    {item.priority}
                  </Badge>
                </div>
                <p className="[font-family:'Arial-Regular',Helvetica] text-[#5876AB] text-xs sm:text-sm leading-relaxed pb-2">
                  {item.description}
                </p>

                <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-2 sm:gap-3 pb-3 sm:pb-4">
                  <div className="flex flex-col gap-0.5 sm:gap-1">
                    <span className="[font-family:'Arial-Regular',Helvetica] text-[#5876AB]/70 text-[10px] sm:text-xs">
                      {item.duration}
                    </span>
                    <span className="[font-family:'Arial-Regular',Helvetica] text-[#5876AB] text-[10px] sm:text-xs font-medium">
                      {item.confidence}
                    </span>
                  </div>
                  <Button
                    onClick={() => onExecute?.(item)}
                    className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-3 sm:px-4 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-md flex-shrink-0 self-stretch sm:self-end w-full sm:w-auto"
                  >
                    Execute
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    );
  }
);

ActionsPanel.displayName = "ActionsPanel";
