/**
 * ActivityLogCollapsible Component
 *
 * Collapsible section that displays a chronological list of ticket activities and comments.
 * Provides toggle control to expand/collapse the activity timeline.
 *
 * Features:
 * - Expandable/collapsible interface with chevron icon indicator
 * - Activity count badge in header
 * - Loading state with spinner animation
 * - Error state with user-friendly message
 * - Empty state when no activities exist
 * - Timeline-style layout with user avatars
 * - Smooth slide-in animation when expanded
 * - Comment input box for adding new comments
 *
 * @example
 * ```tsx
 * <ActivityLogCollapsible
 *   activities={[
 *     { user: "John Doe", timestamp: "2 hours ago", message: "Assigned ticket to support team" },
 *     { user: "Jane Smith", timestamp: "1 hour ago", message: "Investigating network issue" }
 *   ]}
 *   isExpanded={isExpanded}
 *   onToggle={() => setIsExpanded(!isExpanded)}
 *   isLoading={false}
 *   error={null}
 *   onAddComment={(comment) => console.log(comment)}
 * />
 * ```
 */
import React, { useState, useCallback } from "react";
import {
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Send,
  User,
} from "@components/icons";
import { ActivityItem } from "./ActivityLogPanel";
import { Avatar } from "@ui/avatar";
import { Button } from "@ui/button";

/**
 * Props for the ActivityLogCollapsible component
 *
 * @interface ActivityLogCollapsibleProps
 */
interface ActivityLogCollapsibleProps {
  /** Array of activity items to display in chronological order */
  activities: ActivityItem[];
  /** Whether the activity log section is expanded */
  isExpanded: boolean;
  /** Callback fired when expand/collapse button is clicked */
  onToggle: () => void;
  /** Whether activities are currently being fetched from API */
  isLoading?: boolean;
  /** Error message to display if activity fetch failed */
  error?: string | null;
  /** Optional callback when a comment is added */
  onAddComment?: (comment: string) => void;
}

export const ActivityLogCollapsible: React.FC<ActivityLogCollapsibleProps> = ({
  activities,
  isExpanded,
  onToggle,
  isLoading = false,
  error = null,
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
    <div className="border-t border-[#E1E8F0] mt-6">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-4 hover:bg-[#F9FAFB] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="[font-family:'Arial-Regular',Helvetica] text-sm font-medium text-[#0E162B]">
            Activity Log
          </span>
          <span className="[font-family:'Arial-Regular',Helvetica] text-xs text-[#61738D]">
            ({activities.length} activities)
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-[#61738D]" />
        ) : (
          <ChevronDown className="w-5 h-5 text-[#61738D]" />
        )}
      </button>

      {isExpanded && (
        <div className="pb-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3B82F6]"></div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageSquare className="w-12 h-12 text-[#9CA3AF] mb-3" />
              <p className="[font-family:'Arial-Regular',Helvetica] text-sm text-[#61738D]">
                {error}
              </p>
            </div>
          ) : activities.length === 0 ? (
            <>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MessageSquare className="w-12 h-12 text-[#9CA3AF] mb-3" />
                <p className="[font-family:'Arial-Regular',Helvetica] text-sm font-medium text-[#0E162B] mb-1">
                  No Activity Yet
                </p>
                <p className="[font-family:'Arial-Regular',Helvetica] text-xs text-[#61738D]">
                  Activity and comments will appear here
                </p>
              </div>
              {/* Comment Input Box for Empty State */}
              {onAddComment && (
                <div className="pt-2 pb-4 border-t border-[#E1E8F0]">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-[#EFF6FF] flex items-center justify-center border border-[#BFDBFE]">
                        <User className="w-4 h-4 text-[#3B82F6]" />
                      </div>
                    </div>
                    <div className="flex-1 flex gap-2">
                      <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Add a comment..."
                        className="flex-1 min-h-[60px] px-3 py-2 text-sm border border-[#E1E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent resize-none [font-family:'Arial-Regular',Helvetica]"
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
                    <p className="text-xs text-[#61738D] [font-family:'Arial-Regular',Helvetica]">
                      Press Enter to send, Shift+Enter for new line
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Comment Input Box */}
              {onAddComment && (
                <div className="pt-2 pb-4 border-b border-[#E1E8F0]">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-[#EFF6FF] flex items-center justify-center border border-[#BFDBFE]">
                        <User className="w-4 h-4 text-[#3B82F6]" />
                      </div>
                    </div>
                    <div className="flex-1 flex gap-2">
                      <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Add a comment..."
                        className="flex-1 min-h-[60px] px-3 py-2 text-sm border border-[#E1E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent resize-none [font-family:'Arial-Regular',Helvetica]"
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
                    <p className="text-xs text-[#61738D] [font-family:'Arial-Regular',Helvetica]">
                      Press Enter to send, Shift+Enter for new line
                    </p>
                  </div>
                </div>
              )}
              {activities.map((activity, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 ${
                    index !== activities.length - 1
                      ? "pb-4 border-b border-[#E1E8F0]"
                      : ""
                  }`}
                >
                  <Avatar className="w-8 h-8 rounded-full bg-[#EFF6FF] flex items-center justify-center border border-[#BFDBFE]">
                    <span className="[font-family:'Arial-Regular',Helvetica] text-xs font-medium text-[#3B82F6]">
                      {activity.user.charAt(0).toUpperCase()}
                    </span>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="[font-family:'Arial-Regular',Helvetica] text-sm font-medium text-[#0E162B]">
                        {activity.user}
                      </span>
                      <span className="[font-family:'Arial-Regular',Helvetica] text-xs text-[#61738D]">
                        • {activity.timestamp}
                      </span>
                    </div>
                    <p className="[font-family:'Arial-Regular',Helvetica] text-sm text-[#61738D]">
                      {activity.message}
                    </p>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};
