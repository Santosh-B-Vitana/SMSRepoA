import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Users } from "lucide-react";
import { StaffLeaveManagerEnhanced } from "../components/leave/StaffLeaveManagerEnhanced";
import { AdminLeaveManagementEnhanced } from "../components/leave/AdminLeaveManagementEnhanced";

/**
 * Staff Leave Management Page — role-aware
 *
 * • Admin / Principal / Vice Principal / HRManager → two tabs:
 *     "Staff Requests"  – approve/reject all staff leaves (AdminLeaveManagementEnhanced)
 *     "My Leave"        – personal leave application / history (StaffLeaveManagerEnhanced)
 *
 * • All other staff → personal leave only (StaffLeaveManagerEnhanced)
 */
export default function LeaveManagement() {
  const { user } = useAuth();
  const role = user?.role ?? "";
  const designation = (user?.designation ?? "").toLowerCase();
  const isLeadership =
    role === "admin" ||
    designation === "principal" ||
    designation === "vice principal" ||
    designation === "hr manager";

  if (!isLeadership) {
    return <StaffLeaveManagerEnhanced />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leave Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review staff leave requests and manage your own leave
        </p>
      </div>

      <Tabs defaultValue="staff-requests">
        <TabsList className="mb-2">
          <TabsTrigger value="staff-requests" className="gap-2">
            <Users className="h-4 w-4" />Staff Requests
          </TabsTrigger>
          <TabsTrigger value="my-leave" className="gap-2">
            <Calendar className="h-4 w-4" />My Leave
          </TabsTrigger>
        </TabsList>

        <TabsContent value="staff-requests">
          <AdminLeaveManagementEnhanced defaultRequestType="staff" />
        </TabsContent>

        <TabsContent value="my-leave">
          <StaffLeaveManagerEnhanced />
        </TabsContent>
      </Tabs>
    </div>
  );
}
