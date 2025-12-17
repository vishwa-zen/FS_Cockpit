import React from "react";
import { ChevronDown, ChevronUp, MessageSquare } from "lucide-react";
import { ActivityItem } from "./ActivityLogPanel";
import { Avatar } from "../../components/ui/avatar";

interface ActivityLogCollapsibleProps {
  activities: ActivityItem[];
  isExpanded: boolean;
  onToggle: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export const ActivityLogCollapsible: React.FC<ActivityLogCollapsibleProps> = ({
  activities,
  isExpanded,
  onToggle,
  isLoading = false,
  error = null,
}) => {
  return (
    <div className="border-t border-[#E1E8F0] mt-6">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-4 hover:bg-[#F9FAFB] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#0E162B]">
            Activity Log
          </span>
          <span className="text-xs text-[#61738D]">
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
              <p className="text-sm text-[#61738D]">{error}</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageSquare className="w-12 h-12 text-[#9CA3AF] mb-3" />
              <p className="text-sm font-medium text-[#0E162B] mb-1">
                No Activity Yet
              </p>
              <p className="text-xs text-[#61738D]">
                Activity and comments will appear here
              </p>
            </div>
          ) : (
            activities.map((activity, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 ${
                  index !== activities.length - 1
                    ? "pb-4 border-b border-[#E1E8F0]"
                    : ""
                }`}
              >
                <Avatar className="w-8 h-8 rounded-full bg-[#EFF6FF] flex items-center justify-center border border-[#BFDBFE]">
                  <span className="text-xs font-medium text-[#3B82F6]">
                    {activity.user.charAt(0).toUpperCase()}
                  </span>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-[#0E162B]">
                      {activity.user}
                    </span>
                    <span className="text-xs text-[#61738D]">
                      • {activity.timestamp}
                    </span>
                  </div>
                  <p className="text-sm text-[#61738D]">{activity.message}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
