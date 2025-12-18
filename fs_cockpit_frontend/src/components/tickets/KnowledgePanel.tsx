/**
 * KnowledgePanel Component
 *
 * Displays ServiceNow knowledge base articles related to the current incident.
 * Shows relevant troubleshooting guides, solutions, and documentation with confidence scores.
 *
 * Features:
 * - Loading state with skeleton placeholders
 * - Empty state with lightbulb icon
 * - Color-coded confidence/severity badges (green 80%+, orange 60-79%, red 40-59%, dark red <40%)
 * - Responsive card layout with hover effects
 * - Article source attribution
 * - Mobile-optimized spacing and typography
 *
 * @example
 * ```tsx
 * <KnowledgePanel
 *   items={[
 *     {
 *       title: "WiFi Connection Troubleshooting",
 *       severity: "85",
 *       description: "Step-by-step guide to resolve WiFi connectivity issues",
 *       confidence: "High",
 *       source: "KB0001234"
 *     }
 *   ]}
 *   isLoading={false}
 * />
 * ```
 */
import React from "react";
import { Card } from "@ui/card";
import { Badge } from "@ui/badge";
import { Lightbulb } from "lucide-react";

/**
 * Knowledge article item structure
 *
 * @interface KnowledgeItem
 */
export interface KnowledgeItem {
  /** Article title/heading */
  title: string;
  /** Confidence score as percentage string (0-100), used for badge color */
  severity?: string;
  /** Article description or summary text */
  description: string;
  /** Confidence level text (e.g., "High", "Medium", "Low") */
  confidence?: string;
  /** Source reference (e.g., KB article number) */
  source?: string;
}

/**
 * Props for the KnowledgePanel component
 *
 * @interface KnowledgePanelProps
 */
interface KnowledgePanelProps {
  /** Array of knowledge articles to display */
  items: KnowledgeItem[];
  /** Whether articles are currently being fetched from API */
  isLoading?: boolean;
}

export const KnowledgePanel: React.FC<KnowledgePanelProps> = React.memo(
  ({ items, isLoading }) => {
    /**
     * Determines badge color based on confidence/severity score
     * @param {string} [severity] - Confidence percentage (0-100)
     * @returns {string} Tailwind CSS classes for severity badge
     */
    const getSeverityColor = (severity?: string) => {
      if (!severity) return "bg-[#10B981] text-white";
      const sev = parseInt(severity);
      if (sev >= 80) return "bg-[#10B981] text-white"; // Green
      if (sev >= 60) return "bg-[#F59E0B] text-white"; // Orange
      if (sev >= 40) return "bg-[#EF4444] text-white"; // Red
      return "bg-[#DC2626] text-white"; // Dark Red
    };

    if (isLoading) {
      return (
        <Card className="bg-white border-[0.67px] border-[#BAD2EE] rounded-[14px] p-4 w-full shadow-[0px_1px_2px_-1px_rgba(0,0,0,0.1),0px_1px_3px_0px_rgba(0,0,0,0.1)]">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-[#3B82F6]" />
            <h3 className="[font-family:'Arial-Regular',Helvetica] text-[#0E162B] text-base font-semibold">
              Knowledge
            </h3>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-100 rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
              </div>
            ))}
          </div>
        </Card>
      );
    }

    return (
      <Card className="bg-white border-[0.67px] border-[#BAD2EE] rounded-[14px] p-3 sm:p-4 w-full shadow-[0px_1px_2px_-1px_rgba(0,0,0,0.1),0px_1px_3px_0px_rgba(0,0,0,0.1)]">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-[#3B82F6]" />
          <h3 className="[font-family:'Arial-Regular',Helvetica] text-[#0E162B] text-sm sm:text-base font-semibold">
            Knowledge
          </h3>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 sm:py-12 px-3 sm:px-4">
            <Lightbulb
              className="w-10 h-10 sm:w-12 sm:h-12 text-[#93C5FD] mb-3 sm:mb-4"
              strokeWidth={1.5}
            />
            <p className="[font-family:'Arial-Regular',Helvetica] text-[#61738D] text-xs sm:text-sm text-center">
              There are no knowledge articles for this incident at the moment
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
                  {item.severity && (
                    <Badge
                      className={`${getSeverityColor(
                        item.severity
                      )} px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold rounded-full flex-shrink-0`}
                    >
                      {item.severity}%
                    </Badge>
                  )}
                </div>
                <p className="[font-family:'Arial-Regular',Helvetica] text-[#5876AB] text-xs sm:text-sm leading-relaxed pb-2">
                  {item.description}
                </p>
                {item.source && (
                  <p className="[font-family:'Arial-Regular',Helvetica] text-[#5876AB]/70 text-[10px] sm:text-xs italic pb-3 sm:pb-4">
                    Source: {item.source}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    );
  }
);

KnowledgePanel.displayName = "KnowledgePanel";
