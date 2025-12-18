/**
 * ActivityLogPanel Component
 *
 * Displays a standalone panel of activity items with user avatars and timestamps.
 * Used for showing ticket history, comments, and status changes.
 *
 * Features:
 * - Card-based layout with header icon
 * - User avatar indicators
 * - Timestamp display for each activity
 * - Border separators between items
 * - Responsive text sizing
 * - Comment input box for adding new comments
 *
 * @example
 * ```tsx
 * <ActivityLogPanel
 *   activities={[
 *     {
 *       user: "John Doe",
 *       timestamp: "2 hours ago",
 *       message: "Updated ticket status to In Progress"
 *     },
 *     {
 *       user: "Jane Smith",
 *       timestamp: "1 hour ago",
 *       message: "Added diagnostic information"
 *     }
 *   ]}
 *   onAddComment={(comment) => console.log(comment)}
 * />
 * ```
 */
import React, { useState, useCallback } from "react";
import { Card } from "@ui/card";
import { MessageSquare, User, Send } from "@components/icons";
import { Button } from "@ui/button";

/**
 * Individual activity item structure
 *
 * @interface ActivityItem
 */
export interface ActivityItem {
  /** Name of the user who performed the activity */
  user: string;
  /** Relative or absolute timestamp (e.g., "2 hours ago" or ISO date) */
  timestamp: string;
  /** Description of the activity or comment text */
  message: string;
}

/**
 * Props for the ActivityLogPanel component
 *
 * @interface ActivityLogPanelProps
 */
interface ActivityLogPanelProps {
  /** Array of activity items to display */
  activities: ActivityItem[];
  /** Optional callback when a comment is added */
  onAddComment?: (comment: string) => void;
}

export const ActivityLogPanel: React.FC<ActivityLogPanelProps> = ({
  activities,
  onAddComment,
}) => {
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitComment = useCallback(async () => {
    if (!commentText.trim() || !onAddComment) return;

    setIsSubmitting(true);
    try {
      await onAddComment(commentText.trim());
      setCommentText("");
    } catch (error) {
      console.error("Failed to add comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [commentText, onAddComment]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmitComment();
      }
    },
    [handleSubmitComment]
  );

  return (
    <Card className="border border-[#E1E8F0] rounded-lg p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5 text-[#3B82F6]" />
        <h3 className="text-[#0E162B] text-base font-semibold">
          Activity & Comments
        </h3>
      </div>

      {/* Comment Input Box */}
      {onAddComment && (
        <div className="mb-6">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-[#EFF6FF] flex items-center justify-center">
                <User className="w-4 h-4 text-[#3B82F6]" />
              </div>
            </div>
            <div className="flex-1 flex gap-2">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Add a comment..."
                className="flex-1 min-h-[80px] px-3 py-2 text-sm border border-[#E1E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent resize-none"
                disabled={isSubmitting}
                aria-label="Add comment"
              />
              <Button
                onClick={handleSubmitComment}
                disabled={!commentText.trim() || isSubmitting}
                className="self-end h-[38px] px-4 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Send comment"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
          <div className="ml-11 mt-1">
            <p className="text-xs text-[#61738D]">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {activities.map((activity, index) => (
          <div
            key={index}
            className="flex gap-3 pb-4 border-b border-[#E1E8F0] last:border-b-0 last:pb-0"
          >
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-[#EFF6FF] flex items-center justify-center">
                <User className="w-4 h-4 text-[#3B82F6]" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-[#0E162B] text-sm font-semibold">
                  {activity.user}
                </span>
                <span className="text-[#61738D] text-xs">
                  • {activity.timestamp}
                </span>
              </div>
              <p className="text-[#374151] text-sm leading-relaxed">
                {activity.message}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
