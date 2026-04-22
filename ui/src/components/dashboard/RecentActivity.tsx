
import { formatDistanceToNow } from "date-fns";

interface Activity {
  id: string;
  type: string;
  message: string;
  timestamp: Date;
  user: string;
}

const mockActivities: Activity[] = [
  {
    id: "1",
    type: "student",
    message: "New student Alice Johnson enrolled in Class 10-A",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    user: "Admin"
  },
  {
    id: "2",
    type: "attendance",
    message: "Attendance marked for Class 9-B (28/30 present)",
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    user: "Maria Garcia"
  },
  {
    id: "3",
    type: "fee",
    message: "Fee payment received from David Chen (ID: STU002)",
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    user: "Finance Dept"
  },
  {
    id: "4",
    type: "announcement",
    message: "New announcement posted: Parent-Teacher Meeting Schedule",
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    user: "Dr. Sarah Martinez"
  }
];

export function RecentActivity() {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "student":
        return "👥";
      case "attendance":
        return "📅";
      case "fee":
        return "💰";
      case "announcement":
        return "📢";
      default:
        return "📝";
    }
  };

  return (
    <div className="dashboard-card">
      <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
      <div className="space-y-4">
        {mockActivities.map((activity) => (
          <div key={activity.id} className="flex gap-3 p-3 rounded-lg bg-muted/30">
            <div className="text-lg">{getActivityIcon(activity.type)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">{activity.message}</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-muted-foreground">
                  by {activity.user}
                </p>
                <span className="text-xs text-muted-foreground">•</span>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
