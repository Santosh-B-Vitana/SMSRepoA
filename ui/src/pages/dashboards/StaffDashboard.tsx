
import { useEffect, useState, useCallback } from "react";
import {
  Calendar, Users, BookOpen, CheckCircle, Clock, MessageSquare,
  AlertCircle, Bell, TrendingUp, ArrowRight, RefreshCw, Loader2,
  ClipboardList, Send, UserCheck, ChevronRight, Megaphone, KeyRound,
  GraduationCap, BarChart3, DollarSign, Truck, Home, HeartPulse,
  Library, UserCog, School, Building2, Activity,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import leaveManagementApi, { LeaveRequest } from "@/services/api/leaveManagementApi";
import staffCommunicationApi from "@/services/api/staffCommunicationApi";
import { StudentLeaveRequests } from "@/components/leave-management/StudentLeaveRequests";
import api from "@/services/api/apiClient";
import { academicApi, type MyClassAssignment } from "@/services/api/academicApi";
import { analyticsApi, type DashboardSummaryResponse } from "@/services/api/analyticsApi";
import { ChangePasswordDialog } from "@/components/auth/ChangePasswordDialog";

// ─── Designation groups ───────────────────────────────────────────────────────
type DesignationGroup =
  | "leadership"    // Principal, Vice Principal
  | "academic_head" // Head of Department
  | "class_teacher" // Class Teacher
  | "teacher"       // Teacher
  | "finance"       // Accountant
  | "hr"            // HR Manager
  | "librarian"     // Librarian
  | "transport"     // Transport Manager
  | "hostel"        // Hostel Warden
  | "admissions"    // Admissions Officer
  | "counselor"     // Counselor
  | "other";        // Generic staff

function getDesignationGroup(designation?: string): DesignationGroup {
  const d = (designation ?? "teacher").toLowerCase();
  if (d === "principal" || d === "vice principal") return "leadership";
  if (d === "head of department") return "academic_head";
  if (d === "class teacher") return "class_teacher";
  if (d === "teacher") return "teacher";
  if (d === "accountant") return "finance";
  if (d === "hr manager") return "hr";
  if (d === "librarian") return "librarian";
  if (d === "transport manager") return "transport";
  if (d === "hostel warden") return "hostel";
  if (d === "admissions officer") return "admissions";
  if (d === "counselor") return "counselor";
  return "other";
}

// ─── Role metadata ─────────────────────────────────────────────────────────────
const GROUP_META: Record<DesignationGroup, {
  icon: React.ElementType; gradient: string; accentColor: string; badgeBg: string;
}> = {
  leadership:    { icon: GraduationCap, gradient: "from-purple-500/20 via-purple-500/10 to-background", accentColor: "text-purple-600", badgeBg: "bg-purple-500/10 text-purple-700 border-purple-200" },
  academic_head: { icon: BookOpen,      gradient: "from-blue-500/20 via-blue-500/10 to-background",    accentColor: "text-blue-600",   badgeBg: "bg-blue-500/10 text-blue-700 border-blue-200" },
  class_teacher: { icon: Users,         gradient: "from-sky-500/20 via-sky-500/10 to-background",     accentColor: "text-sky-600",    badgeBg: "bg-sky-500/10 text-sky-700 border-sky-200" },
  teacher:       { icon: BookOpen,      gradient: "from-primary/20 via-primary/10 to-background",     accentColor: "text-primary",    badgeBg: "bg-primary/10 text-primary border-primary/20" },
  finance:       { icon: DollarSign,    gradient: "from-emerald-500/20 via-emerald-500/10 to-background", accentColor: "text-emerald-600", badgeBg: "bg-emerald-500/10 text-emerald-700 border-emerald-200" },
  hr:            { icon: UserCheck,     gradient: "from-teal-500/20 via-teal-500/10 to-background",   accentColor: "text-teal-600",   badgeBg: "bg-teal-500/10 text-teal-700 border-teal-200" },
  librarian:     { icon: Library,       gradient: "from-amber-500/20 via-amber-500/10 to-background", accentColor: "text-amber-600",  badgeBg: "bg-amber-500/10 text-amber-700 border-amber-200" },
  transport:     { icon: Truck,         gradient: "from-orange-500/20 via-orange-500/10 to-background", accentColor: "text-orange-600", badgeBg: "bg-orange-500/10 text-orange-700 border-orange-200" },
  hostel:        { icon: Home,          gradient: "from-lime-500/20 via-lime-500/10 to-background",   accentColor: "text-lime-700",   badgeBg: "bg-lime-100 text-lime-700 border-lime-200" },
  admissions:    { icon: ClipboardList, gradient: "from-pink-500/20 via-pink-500/10 to-background",   accentColor: "text-pink-600",   badgeBg: "bg-pink-500/10 text-pink-700 border-pink-200" },
  counselor:     { icon: HeartPulse,    gradient: "from-rose-500/20 via-rose-500/10 to-background",   accentColor: "text-rose-600",   badgeBg: "bg-rose-500/10 text-rose-700 border-rose-200" },
  other:         { icon: UserCog,       gradient: "from-slate-500/20 via-slate-500/10 to-background", accentColor: "text-slate-600",  badgeBg: "bg-slate-500/10 text-slate-700 border-slate-200" },
};

// ─── Role-specific Quick Actions ──────────────────────────────────────────────
function getQuickActions(group: DesignationGroup): Array<{label: string; icon: React.ElementType; color: string; path: string}> {
  const leave      = { label: "Apply for Leave",  icon: Calendar,      color: "text-amber-600 bg-amber-500/10",    path: "/leave-management" };
  const announce   = { label: "Announcements",    icon: Bell,          color: "text-purple-600 bg-purple-500/10",  path: "/announcements" };
  const myClasses  = { label: "My Classes",       icon: BookOpen,      color: "text-blue-600 bg-blue-500/10",      path: "/my-classes" };
  const att        = { label: "Mark Attendance",  icon: UserCheck,     color: "text-sky-600 bg-sky-500/10",        path: "/attendance" };
  const msg        = { label: "Message Parents",  icon: Send,          color: "text-green-600 bg-green-500/10",    path: "/staff-parent-communication" };
  const timetable  = { label: "Timetable",        icon: Clock,         color: "text-indigo-600 bg-indigo-500/10",  path: "/timetable" };
  const grades     = { label: "Grades",           icon: GraduationCap, color: "text-violet-600 bg-violet-500/10",  path: "/grades" };
  const reports    = { label: "Reports",          icon: BarChart3,     color: "text-cyan-600 bg-cyan-500/10",      path: "/reports" };
  const staff      = { label: "Staff",            icon: Users,         color: "text-pink-600 bg-pink-500/10",      path: "/staff" };
  const fees       = { label: "Fees",             icon: DollarSign,    color: "text-emerald-600 bg-emerald-500/10",path: "/fees" };
  const hostelNav  = { label: "Hostel",           icon: Home,          color: "text-lime-700 bg-lime-500/10",      path: "/hostel" };
  const health     = { label: "Health",           icon: HeartPulse,    color: "text-rose-600 bg-rose-500/10",      path: "/health" };
  const transport  = { label: "Transport",        icon: Truck,         color: "text-orange-600 bg-orange-500/10",  path: "/transport" };
  const library    = { label: "Library",          icon: Library,       color: "text-amber-600 bg-amber-500/10",    path: "/library" };
  const students   = { label: "Students",         icon: Users,         color: "text-blue-600 bg-blue-500/10",      path: "/students" };
  const connect    = { label: "School Connect",   icon: School,        color: "text-teal-600 bg-teal-500/10",      path: "/school-connect" };

  switch (group) {
    case "leadership":    return [staff, students, att, reports, leave, announce];
    case "academic_head": return [myClasses, grades, timetable, msg, leave, announce];
    case "class_teacher": return [myClasses, att, grades, msg, leave, connect];
    case "teacher":       return [myClasses, att, timetable, grades, msg, leave];
    case "finance":       return [fees, reports, leave, announce];
    case "hr":            return [staff, reports, leave, announce];
    case "librarian":     return [library, students, leave, announce];
    case "transport":     return [transport, students, leave, announce];
    case "hostel":        return [hostelNav, health, students, leave, announce];
    case "admissions":    return [students, leave, announce];
    case "counselor":     return [health, msg, students, leave];
    default:              return [myClasses, att, msg, leave, announce, connect];
  }
}

// ─── Role-specific Stat config ────────────────────────────────────────────────
interface RoleStatConfig {
  title: string; iconBg: string; borderColor: string; icon: React.ElementType; path?: string;
  value: (d: DashboardData) => string | number;
  subtitle: (d: DashboardData) => string;
}

function getRoleStats(group: DesignationGroup): RoleStatConfig[] {
  switch (group) {
    case "leadership":
      return [
        { title: "Total Students", iconBg: "bg-purple-500/10", borderColor: "border-l-purple-500", icon: Users,       path: "/students",     value: d => d.schoolStats?.totalStudents ?? "—", subtitle: d => `${d.schoolStats?.todayAbsentStudents ?? 0} absent today` },
        { title: "Total Staff",    iconBg: "bg-blue-500/10",   borderColor: "border-l-blue-500",   icon: UserCheck,   path: "/staff",        value: d => d.schoolStats?.totalStaff ?? "—",    subtitle: d => `${d.schoolStats?.todayAbsentStaff ?? 0} absent today` },
        { title: "Attendance",     iconBg: "bg-green-500/10",  borderColor: "border-l-green-500",  icon: Activity,    value: d => d.schoolStats ? `${Math.round(d.schoolStats.todayAttendancePercentage)}%` : "—", subtitle: () => "Today's rate" },
        { title: "Staff Leaves",   iconBg: "bg-amber-500/10",  borderColor: "border-l-amber-500",  icon: Calendar,    path: "/leave-management", value: d => d.pendingStaffLeaves ?? 0, subtitle: () => "Pending approval" },
      ];
    case "academic_head":
      return [
        { title: "My Classes",     iconBg: "bg-blue-500/10",   borderColor: "border-l-blue-500",   icon: BookOpen,    path: "/my-classes",   value: d => d.classAssignments.length, subtitle: () => "Assigned sections" },
        { title: "My Students",    iconBg: "bg-purple-500/10", borderColor: "border-l-purple-500", icon: Users,       path: "/my-classes",   value: d => d.studentCount,            subtitle: d => `across ${d.classAssignments.length} class${d.classAssignments.length !== 1 ? "es" : ""}` },
        { title: "Pending Leaves", iconBg: "bg-amber-500/10",  borderColor: "border-l-amber-500",  icon: Calendar,    path: "/leave-management", value: d => d.pendingLeaves, subtitle: d => `${d.approvedLeaves} approved` },
        { title: "Announcements",  iconBg: "bg-violet-500/10", borderColor: "border-l-violet-500", icon: Megaphone,   value: d => d.announcements.length, subtitle: () => "From management" },
      ];
    case "class_teacher":
      return [
        { title: "My Students",    iconBg: "bg-sky-500/10",    borderColor: "border-l-sky-500",    icon: Users,       path: "/my-classes",   value: d => d.studentCount, subtitle: d => `${d.classAssignments.length} class${d.classAssignments.length !== 1 ? "es" : ""}` },
        { title: "Pending Leaves", iconBg: "bg-amber-500/10",  borderColor: "border-l-amber-500",  icon: Clock,       path: "/leave-management", value: d => d.pendingLeaves, subtitle: d => `${d.approvedLeaves} approved this year` },
        { title: "Announcements",  iconBg: "bg-purple-500/10", borderColor: "border-l-purple-500", icon: Megaphone,   value: d => d.announcements.length, subtitle: () => "From management" },
        { title: "Messages Sent",  iconBg: "bg-green-500/10",  borderColor: "border-l-green-500",  icon: Send,        path: "/staff-parent-communication", value: d => d.sentMessages, subtitle: () => "To parents" },
      ];
    case "finance":
      return [
        { title: "Pending Fees",   iconBg: "bg-red-500/10",    borderColor: "border-l-red-500",    icon: DollarSign,  path: "/fees",     value: d => d.schoolStats ? `₹${(d.schoolStats.pendingFees / 1000).toFixed(0)}K` : "—", subtitle: () => "Outstanding" },
        { title: "Total Students", iconBg: "bg-emerald-500/10",borderColor: "border-l-emerald-500",icon: Users,       path: "/students", value: d => d.schoolStats?.totalStudents ?? "—", subtitle: () => "Active enrollment" },
        { title: "Pending Leaves", iconBg: "bg-amber-500/10",  borderColor: "border-l-amber-500",  icon: Calendar,    path: "/leave-management", value: d => d.pendingLeaves, subtitle: d => `${d.approvedLeaves} approved` },
        { title: "Announcements",  iconBg: "bg-purple-500/10", borderColor: "border-l-purple-500", icon: Megaphone,   value: d => d.announcements.length, subtitle: () => "From management" },
      ];
    case "hr":
      return [
        { title: "Total Staff",    iconBg: "bg-teal-500/10",   borderColor: "border-l-teal-500",   icon: UserCheck,   path: "/staff", value: d => d.schoolStats?.totalStaff ?? "—", subtitle: d => `${d.schoolStats?.todayAbsentStaff ?? 0} absent today` },
        { title: "Staff Leaves",   iconBg: "bg-amber-500/10",  borderColor: "border-l-amber-500",  icon: Calendar,    path: "/leave-management", value: d => d.pendingStaffLeaves ?? d.pendingLeaves, subtitle: () => "Pending approval" },
        { title: "My Leaves",      iconBg: "bg-green-500/10",  borderColor: "border-l-green-500",  icon: CheckCircle, path: "/leave-management", value: d => d.approvedLeaves, subtitle: () => "Approved this year" },
        { title: "Announcements",  iconBg: "bg-purple-500/10", borderColor: "border-l-purple-500", icon: Megaphone,   value: d => d.announcements.length, subtitle: () => "From management" },
      ];
    default: // teacher, librarian, transport, hostel, admissions, counselor, other
      return [
        { title: "My Classes",     iconBg: "bg-primary/10",    borderColor: "border-l-primary",    icon: BookOpen,    path: "/my-classes",   value: d => d.classAssignments.length || "—", subtitle: () => "Assigned" },
        { title: "Pending Leaves", iconBg: "bg-amber-500/10",  borderColor: "border-l-amber-500",  icon: Clock,       path: "/leave-management", value: d => d.pendingLeaves, subtitle: d => `${d.approvedLeaves} approved` },
        { title: "Announcements",  iconBg: "bg-purple-500/10", borderColor: "border-l-purple-500", icon: Megaphone,   value: d => d.announcements.length, subtitle: () => "From management" },
        { title: "Messages Sent",  iconBg: "bg-green-500/10",  borderColor: "border-l-green-500",  icon: Send,        path: "/staff-parent-communication", value: d => d.sentMessages, subtitle: () => "To parents" },
      ];
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Announcement {
  id: string;
  title: string;
  content?: string;
  priority: string;
  createdAt: string;
  publishDate?: string;
}

interface DashboardData {
  studentCount: number;
  classAssignments: MyClassAssignment[];
  pendingLeaves: number;
  approvedLeaves: number;
  recentLeaves: LeaveRequest[];
  announcements: Announcement[];
  sentMessages: number;
  schoolStats?: DashboardSummaryResponse | null;
  pendingStaffLeaves?: number;
  staffLeaveQueue?: LeaveRequest[]; // top pending staff leaves for principal approval
}

// â”€â”€â”€ Sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="h-36 bg-muted/50 rounded-2xl animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-muted/50 rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="h-80 bg-muted/50 rounded-xl animate-pulse" />
        <div className="lg:col-span-2 space-y-6">
          <div className="h-36 bg-muted/50 rounded-xl animate-pulse" />
          <div className="h-40 bg-muted/50 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg: string;
  borderColor: string;
  progress?: number;
  onClick?: () => void;
}

function StatCard({ title, value, subtitle, icon, iconBg, borderColor, progress, onClick }: StatCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-border bg-card p-5 border-l-4 ${borderColor} hover:shadow-md transition-all duration-200 ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">{title}</p>
          <p className="text-3xl font-bold mt-1.5 leading-none">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-2 truncate">{subtitle}</p>}
          {progress !== undefined && <Progress value={progress} className="mt-3 h-1.5" />}
        </div>
        <div className={`p-2.5 rounded-lg ${iconBg} ml-3 shrink-0`}>{icon}</div>
      </div>
    </div>
  );
}

function LeaveStatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    Pending: { variant: "secondary", label: "Pending" },
    Approved: { variant: "default", label: "Approved" },
    Rejected: { variant: "destructive", label: "Rejected" },
    Cancelled: { variant: "outline", label: "Cancelled" },
  };
  const { variant, label } = variants[status] ?? { variant: "outline", label: status };
  return <Badge variant={variant} className="shrink-0">{label}</Badge>;
}

function PriorityDot({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    urgent: "bg-red-500", high: "bg-orange-500", medium: "bg-yellow-500", low: "bg-green-500",
  };
  return <span className={`inline-block w-2 h-2 rounded-full shrink-0 mt-1.5 ${colors[priority?.toLowerCase()] ?? "bg-blue-400"}`} />;
}

// ─── Pending Staff Leave Approval Card (Principal / VP only) ─────────────────

function PendingStaffLeaveCard({
  leaves, totalCount, onActionComplete,
}: {
  leaves: LeaveRequest[];
  totalCount: number;
  onActionComplete: () => void;
}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; leave: LeaveRequest | null; remarks: string }>({
    open: false, leave: null, remarks: "",
  });

  async function handleApprove(id: string) {
    setProcessingId(id);
    try {
      await leaveManagementApi.approveLeave(id, "Approved by Principal");
      toast({ title: "Leave Approved", description: "Staff leave request has been approved." });
      onActionComplete();
    } catch {
      toast({ title: "Error", description: "Could not approve leave request.", variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  }

  async function handleRejectConfirm() {
    if (!rejectDialog.leave) return;
    if (!rejectDialog.remarks.trim()) {
      toast({ title: "Remarks required", description: "Please state the reason for rejection.", variant: "destructive" });
      return;
    }
    setProcessingId(rejectDialog.leave.id);
    try {
      await leaveManagementApi.rejectLeave(rejectDialog.leave.id, rejectDialog.remarks);
      toast({ title: "Leave Rejected", description: "Staff leave request has been rejected." });
      setRejectDialog({ open: false, leave: null, remarks: "" });
      onActionComplete();
    } catch {
      toast({ title: "Error", description: "Could not reject leave request.", variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  }

  if (leaves.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-amber-600" />
            Staff Leave Approvals
            <Badge variant="secondary" className="text-xs">0 pending</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle className="h-8 w-8 text-green-500/60 mb-2" />
            <p className="text-sm text-muted-foreground">All caught up! No pending leave requests.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-l-4 border-l-amber-500">
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-amber-600" />
            Staff Leave Approvals
            {totalCount > 0 && (
              <Badge className="text-xs bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-100">
                {totalCount} pending
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary" onClick={() => navigate("/leave-management")}>
            View all <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {leaves.map((leave) => (
              <div key={leave.id} className="flex items-center justify-between gap-3 px-6 py-3 hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {(leave.applicantName?.[0] ?? "S").toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-tight truncate">{leave.applicantName ?? "Staff"}</p>
                      <p className="text-xs text-muted-foreground">
                        {leave.leaveTypeName} ·{" "}
                        {new Date(leave.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                        {" – "}
                        {new Date(leave.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                        {" · "}
                        <span className="font-medium">{leave.totalDays}d</span>
                      </p>
                      {leave.reason && (
                        <p className="text-xs text-muted-foreground/70 italic truncate max-w-xs">"{leave.reason}"</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm" variant="outline"
                    className="h-7 px-2.5 text-xs gap-1 border-green-300 text-green-700 hover:bg-green-50"
                    disabled={processingId === leave.id}
                    onClick={() => handleApprove(leave.id)}
                  >
                    {processingId === leave.id
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <CheckCircle className="h-3 w-3" />
                    }
                    Approve
                  </Button>
                  <Button
                    size="sm" variant="outline"
                    className="h-7 px-2.5 text-xs gap-1 border-red-300 text-red-700 hover:bg-red-50"
                    disabled={processingId === leave.id}
                    onClick={() => setRejectDialog({ open: true, leave, remarks: "" })}
                  >
                    <AlertCircle className="h-3 w-3" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {totalCount > leaves.length && (
            <div className="px-6 py-3 border-t bg-muted/20">
              <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={() => navigate("/leave-management")}>
                +{totalCount - leaves.length} more pending requests — View all
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rejection remarks dialog */}
      {rejectDialog.open && rejectDialog.leave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-card border rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
            <div>
              <h3 className="font-semibold text-base">Reject Leave Request</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {rejectDialog.leave.applicantName} · {rejectDialog.leave.leaveTypeName}
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Reason for rejection <span className="text-destructive">*</span></label>
              <textarea
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="State reason clearly..."
                value={rejectDialog.remarks}
                onChange={e => setRejectDialog(d => ({ ...d, remarks: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setRejectDialog({ open: false, leave: null, remarks: "" })}>
                Cancel
              </Button>
              <Button
                variant="destructive" size="sm"
                disabled={processingId === rejectDialog.leave.id}
                onClick={handleRejectConfirm}
                className="gap-1"
              >
                {processingId === rejectDialog.leave.id && <Loader2 className="h-3 w-3 animate-spin" />}
                Confirm Reject
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StaffDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const requirePasswordChange = !!(user as any)?.requirePasswordChange;

  const designation = user?.designation ?? "Teacher";
  const group = getDesignationGroup(designation);
  const meta = GROUP_META[group];
  const quickActions = getQuickActions(group);
  const statConfigs = getRoleStats(group);

  const [data, setData] = useState<DashboardData>({
    studentCount: 0, classAssignments: [],
    pendingLeaves: 0, approvedLeaves: 0, recentLeaves: [],
    announcements: [], sentMessages: 0,
    schoolStats: null, pendingStaffLeaves: 0,
  });

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const hour = today.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.name?.split(" ")[0] ?? "Staff";

  // Force password change on first login
  useEffect(() => {
    if (requirePasswordChange) setChangePasswordOpen(true);
  }, [requirePasswordChange]);

  const loadDashboardData = useCallback(async () => {
    try {
      const isSchoolWide = group === "leadership" || group === "finance" || group === "hr";
      const results = await Promise.allSettled([
        academicApi.getMyClassAssignments(),
        staffCommunicationApi.getClassStudents(),
        leaveManagementApi.getMyLeaveRequests(1, 20),
        api.get("/Announcements", { params: { pageSize: 5 } }),
        staffCommunicationApi.getSentMessages(1, 1),
        isSchoolWide ? analyticsApi.getDashboardSummary() : Promise.resolve(null),
        isSchoolWide ? leaveManagementApi.getLeaveRequests(1, 8, undefined, "Pending") : Promise.resolve(null),
      ]);

      let classAssignments: MyClassAssignment[] = [];
      if (results[0].status === "fulfilled") classAssignments = results[0].value;

      let studentCount = 0;
      if (results[1].status === "fulfilled") studentCount = results[1].value.length;

      let recentLeaves: LeaveRequest[] = [];
      let pendingLeaves = 0;
      let approvedLeaves = 0;
      if (results[2].status === "fulfilled") {
        const leaveData = results[2].value;
        recentLeaves = (leaveData.items ?? []).slice(0, 5);
        pendingLeaves = (leaveData.items ?? []).filter((l) => l.status === "Pending").length;
        approvedLeaves = (leaveData.items ?? []).filter((l) => l.status === "Approved").length;
      }

      let announcements: Announcement[] = [];
      if (results[3].status === "fulfilled") {
        const annData = results[3].value.data;
        announcements = (annData?.items ?? annData?.announcements ?? []).slice(0, 5);
      }

      let sentMessages = 0;
      if (results[4].status === "fulfilled") sentMessages = results[4].value?.totalCount ?? 0;

      let schoolStats: DashboardSummaryResponse | null = null;
      if (results[5].status === "fulfilled" && results[5].value) {
        schoolStats = results[5].value as DashboardSummaryResponse;
      }

      let pendingStaffLeaves = 0;
      let staffLeaveQueue: LeaveRequest[] = [];
      if (results[6].status === "fulfilled" && results[6].value) {
        const lv = results[6].value as any;
        pendingStaffLeaves = lv?.totalCount ?? 0;
        staffLeaveQueue = (lv?.items ?? []).filter((l: LeaveRequest) => l.applicantType === "Staff" || !l.applicantType);
      }

      setData({ studentCount, classAssignments, pendingLeaves, approvedLeaves, recentLeaves, announcements, sentMessages, schoolStats, pendingStaffLeaves, staffLeaveQueue });
    } catch (err) {
      console.error("Dashboard load error:", err);
      toast({ title: "Dashboard", description: "Some data could not be loaded", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [group, toast]);

  useEffect(() => { loadDashboardData(); }, [loadDashboardData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, [loadDashboardData]);

  if (loading) return <DashboardSkeleton />;

  const RoleIcon = meta.icon;

  return (
    <div className="space-y-8">
      <ChangePasswordDialog
        open={changePasswordOpen}
        onOpenChange={setChangePasswordOpen}
        forced={requirePasswordChange}
        onSuccess={logout}
      />

      {/* ── Role-aware Hero Header ──────────────────────────────────────────── */}
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${meta.gradient} border border-primary/20 p-6 md:p-8`}>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <RoleIcon className={`h-4 w-4 ${meta.accentColor}`} />
              <p className={`text-sm font-semibold uppercase tracking-widest ${meta.accentColor}`}>{greeting}</p>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mt-1">{firstName} 👋</h1>
            <p className="text-muted-foreground mt-1 text-sm">{dateStr}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {/* Designation badge — always shown */}
              <Badge variant="outline" className={`${meta.badgeBg} border font-medium`}>
                <RoleIcon className="h-3 w-3 mr-1" />{designation}
              </Badge>
              {/* Class badges — for teaching roles */}
              {(group === "teacher" || group === "class_teacher" || group === "academic_head") &&
                data.classAssignments.map((a) => (
                  <Badge key={a.assignmentId} variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    {a.className}{a.sectionName ? ` – ${a.sectionName}` : ""}
                    {a.isClassTeacher && <span className="ml-1 text-[10px] opacity-70">(CT)</span>}
                  </Badge>
                ))
              }
              {/* School-wide summary pills — for leadership */}
              {group === "leadership" && data.schoolStats && (
                <>
                  <Badge variant="secondary" className="bg-purple-500/10 text-purple-700 border-purple-200">{data.schoolStats.totalStudents} students</Badge>
                  <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 border-blue-200">{data.schoolStats.totalStaff} staff</Badge>
                  <Badge variant="secondary" className={Math.round(data.schoolStats.todayAttendancePercentage) >= 85 ? "bg-green-500/10 text-green-700" : "bg-amber-500/10 text-amber-700"}>
                    {Math.round(data.schoolStats.todayAttendancePercentage)}% attendance
                  </Badge>
                </>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="shrink-0">
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-2 hidden sm:inline">Refresh</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setChangePasswordOpen(true)} className="shrink-0">
              <KeyRound className="h-4 w-4 mr-2" />Change Password
            </Button>
            <Button size="sm" onClick={() => navigate("/leave-management")} className="shrink-0">
              <Calendar className="h-4 w-4 mr-2" />Apply Leave
            </Button>
          </div>
        </div>
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-4 right-24 w-24 h-24 bg-primary/5 rounded-full blur-2xl" />
      </div>

      {/* ── Role-specific KPI Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statConfigs.map((cfg) => {
          const iconColorClass = cfg.iconBg.replace("/10", "-600").replace("bg-", "text-");
          return (
            <StatCard
              key={cfg.title}
              title={cfg.title}
              value={cfg.value(data)}
              subtitle={cfg.subtitle(data)}
              icon={<cfg.icon className={`h-5 w-5 ${iconColorClass}`} />}
              iconBg={cfg.iconBg}
              borderColor={cfg.borderColor}
              onClick={cfg.path ? () => navigate(cfg.path!) : undefined}
            />
          );
        })}
      </div>

      {/* ── Main Grid: Quick Actions + Leave + Announcements ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions — role-specific */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickActions.map(({ label, icon: Icon, color, path }) => (
              <button key={path + label} onClick={() => navigate(path)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border bg-background hover:bg-muted/50 hover:border-primary/30 transition-all duration-150 group text-left">
                <div className={`p-1.5 rounded-md ${color}`}><Icon className="h-4 w-4" /></div>
                <span className="text-sm font-medium flex-1">{label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* My Leave Requests */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />My Leave Requests
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary" onClick={() => navigate("/leave-management")}>
                View all <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {data.recentLeaves.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Calendar className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No leave requests yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Your submitted leaves will appear here</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate("/leave-management")}>Apply for Leave</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.recentLeaves.map((leave) => (
                    <div key={leave.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{leave.leaveTypeName ?? "Leave"}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(leave.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                          {" → "}
                          {new Date(leave.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          {" · "}<span className="font-medium">{leave.totalDays}d</span>
                        </p>
                        {leave.approverRemarks && (
                          <p className="text-xs text-muted-foreground/70 mt-1 italic truncate">"{leave.approverRemarks}"</p>
                        )}
                      </div>
                      <LeaveStatusBadge status={leave.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Announcements */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-primary" />School Announcements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.announcements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Bell className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">No announcements at this time</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.announcements.map((ann) => (
                    <div key={ann.id} className="flex gap-3 p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer">
                      <PriorityDot priority={ann.priority} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{ann.title}</p>
                        {ann.content && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ann.content}</p>}
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          {new Date(ann.publishDate ?? ann.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0 capitalize text-xs">{ann.priority}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Leadership: School-wide Overview ───────────────────────────────── */}
      {group === "leadership" && data.schoolStats && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />School Overview
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary" onClick={() => navigate("/reports")}>
              Full Report <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Students",  value: data.schoolStats.totalStudents,         color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30",  icon: Users,       path: "/students" },
                { label: "Total Staff",     value: data.schoolStats.totalStaff,             color: "text-blue-600",   bg: "bg-blue-50 dark:bg-blue-950/30",      icon: UserCheck,   path: "/staff" },
                { label: "Upcoming Exams",  value: data.schoolStats.upcomingExams,          color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/30",  icon: CheckCircle, path: "/examinations" },
                { label: "Absent Students", value: data.schoolStats.todayAbsentStudents,    color: "text-rose-600",   bg: "bg-rose-50 dark:bg-rose-950/30",      icon: AlertCircle, path: "/attendance" },
              ].map(({ label, value, color, bg, icon: Icon, path }) => (
                <div key={label} className={`p-4 rounded-xl ${bg} border cursor-pointer hover:opacity-80 transition-opacity`} onClick={() => navigate(path)}>
                  <div className="flex items-center gap-2 mb-2"><Icon className={`h-4 w-4 ${color}`} /><p className="text-xs text-muted-foreground">{label}</p></div>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Leadership: Pending Staff Leave Approvals ───────────────────────── */}
      {group === "leadership" && (
        <PendingStaffLeaveCard
          leaves={data.staffLeaveQueue ?? []}
          totalCount={data.pendingStaffLeaves ?? 0}
          onActionComplete={handleRefresh}
        />
      )}

      {/* ── Teacher / Class Teacher / HoD: My Classes ──────────────────────── */}
      {(group === "teacher" || group === "class_teacher" || group === "academic_head") && data.classAssignments.length > 0 && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />My Classes
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary" onClick={() => navigate("/my-classes")}>
              View all <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {data.classAssignments.map((a) => {
                const count = data.classAssignments.length > 0 ? Math.round(data.studentCount / data.classAssignments.length) : 0;
                return (
                  <div key={a.assignmentId}
                    className="p-4 rounded-xl border bg-gradient-to-br from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/20 hover:border-primary/40 transition-all cursor-pointer"
                    onClick={() => navigate("/my-classes")}>
                    <p className="font-bold text-base text-primary">{a.className}</p>
                    {a.sectionName && <p className="text-xs text-muted-foreground">Section {a.sectionName}</p>}
                    {a.isClassTeacher && <Badge variant="secondary" className="mt-1 text-[10px] px-1.5 py-0">Class Teacher</Badge>}
                    <p className="text-xs text-muted-foreground mt-1">~{count} students</p>
                    <div className="flex items-center gap-1 mt-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-xs text-muted-foreground">Active</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Teacher / Class Teacher: Student Leave Requests ────────────────── */}
      {(group === "teacher" || group === "class_teacher" || group === "academic_head") && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />Student Leave Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <StudentLeaveRequests compact />
          </CardContent>
        </Card>
      )}

      {/* ── My Leave Overview (all roles) ──────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-primary" />My Leave Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Submitted", value: data.pendingLeaves + data.approvedLeaves + data.recentLeaves.filter(l => l.status === "Rejected").length, color: "text-blue-600",  bg: "bg-blue-50 dark:bg-blue-950/30" },
              { label: "Pending Approval",value: data.pendingLeaves,  color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
              { label: "Approved",        value: data.approvedLeaves, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
              { label: "Rejected",        value: data.recentLeaves.filter(l => l.status === "Rejected").length, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`p-4 rounded-xl ${bg} border cursor-pointer hover:opacity-80 transition-opacity`} onClick={() => navigate("/leave-management")}>
                <p className="text-xs text-muted-foreground mb-1">{label}</p>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
