import React from "react";
import { Card } from "../../components/ui/card";
import { MessageSquare, User } from "lucide-react";

export interface ActivityItem {
  user: string;
  timestamp: string;
  message: string;
}

interface ActivityLogPanelProps {
  activities: ActivityItem[];
}

export const ActivityLogPanel: React.FC<ActivityLogPanelProps> = ({
  activities,
}) => {
  return (
    <Card className="border border-[#E1E8F0] rounded-lg p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5 text-[#3B82F6]" />
        <h3 className="text-[#0E162B] text-base font-semibold">
          Activity & Comments
        </h3>
      </div>

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
