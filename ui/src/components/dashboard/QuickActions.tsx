
import { Plus, UserPlus, Calendar, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export function QuickActions() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const getActionsForRole = () => {
    switch (user?.role) {
      case 'admin':
        return [
          {
            label: "Add Student",
            icon: UserPlus,
            onClick: () => navigate("/students"),
            variant: "default" as const
          },
          {
            label: "Take Attendance", 
            icon: Calendar,
            onClick: () => navigate("/staff-attendance"),
            variant: "secondary" as const
          },
          {
            label: "Generate Report",
            icon: FileText,
            onClick: () => navigate("/reports"),
            variant: "outline" as const
          }
        ];
      case 'staff':
        return [
          {
            label: "My Classes",
            icon: UserPlus,
            onClick: () => navigate("/my-classes"),
            variant: "default" as const
          },
          {
            label: "Take Attendance",
            icon: Calendar,
            onClick: () => navigate("/staff-attendance"),
            variant: "secondary" as const
          },
          {
            label: "Grade Assignments",
            icon: FileText,
            onClick: () => navigate("/assignments"),
            variant: "outline" as const
          }
        ];
      case 'parent':
        return [
          {
            label: "View Child Profile",
            icon: UserPlus,
            onClick: () => navigate("/child-profile"),
            variant: "default" as const
          },
          {
            label: "Check Attendance",
            icon: Calendar,
            onClick: () => navigate("/child-attendance"),
            variant: "secondary" as const
          },
          {
            label: "View Grades",
            icon: FileText,
            onClick: () => navigate("/child-grades"),
            variant: "outline" as const
          }
        ];
      default:
        return [];
    }
  };

  const actions = getActionsForRole();

  return (
    <div className="dashboard-card">
      <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
      <div className="space-y-3">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant={action.variant}
            onClick={action.onClick}
            className="w-full justify-start gap-2"
          >
            <action.icon className="h-4 w-4" />
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
