/**
 * KnowledgeArticles Component
 *
 * Displays a list of knowledge base articles in card format.
 * Shows title, confidence score badge, and description for each article.
 *
 * Features:
 * - Card-based layout with hover effects
 * - Color-coded confidence badges (green >=80%, orange >=70%, red <70%)
 * - Loading state with spinner
 * - Empty state message
 * - Responsive design
 *
 * @example
 * <KnowledgeArticles
 *   items={[
 *     {
 *       title: "WiFi Troubleshooting Guide",
 *       confidence: "85",
 *       description: "Step-by-step guide to resolve WiFi connectivity issues"
 *     }
 *   ]}
 *   isLoading={false}
 * />
 */
import React from "react";
import { Card, CardContent } from "@ui/card";
import { Badge } from "@ui/badge";
import { LightbulbIcon } from "lucide-react";

/**
 * Knowledge article item structure
 *
 * @interface KnowledgeItem
 */
export interface KnowledgeItem {
  /** Article title */
  title: string;
  /** Confidence score percentage */
  confidence: string;
  /** Article description/summary */
  description: string;
}

/**
 * Props for the KnowledgeArticles component
 *
 * @interface KnowledgeArticlesProps
 */
interface KnowledgeArticlesProps {
  /** Array of knowledge articles to display */
  items: KnowledgeItem[];
  /** Whether articles are loading */
  isLoading?: boolean;
}

export const KnowledgeArticles: React.FC<KnowledgeArticlesProps> = ({
  items,
  isLoading = false,
}) => {
  /**
   * Get badge color based on confidence score
   * @param {string} confidence - Confidence percentage
   * @returns {string} Tailwind CSS classes
   */
  const getConfidenceBadgeColor = (confidence: string) => {
    const value = parseInt(confidence);
    if (value >= 80) {
      return "bg-[#D1FAE5] text-[#065F46]";
    }
    if (value >= 70) {
      return "bg-[#FED7AA] text-[#9A3412]";
    }
    return "bg-[#FEE2E2] text-[#991B1B]";
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <LightbulbIcon className="w-5 h-5 text-[#3B82F6]" />
          <h2 className="text-base font-semibold text-[#0E162B]">Knowledge</h2>
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
        <LightbulbIcon className="w-5 h-5 text-[#3B82F6]" />
        <h2 className="text-base font-semibold text-[#0E162B]">Knowledge</h2>
      </div>

      {items.length === 0 ? (
        <Card className="border border-[#E1E8F0] shadow-sm">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-[#61738D]">
              No knowledge articles available
            </p>
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
                  className={`${getConfidenceBadgeColor(
                    item.confidence
                  )} border-0 px-2 py-1 text-xs font-medium ml-2 flex-shrink-0`}
                >
                  {item.confidence}
                </Badge>
              </div>
              <p className="text-xs text-[#61738D] leading-relaxed">
                {item.description}
              </p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};
