
import { useEffect, useState, useCallback } from "react";
import {
  Calendar,
  Users,
  BookOpen,
  CheckCircle,
  Clock,
  MessageSquare,
  AlertCircle,
  Bell,
  TrendingUp,
  ArrowRight,
  RefreshCw,
  Loader2,
  ClipboardList,
  Send,
  UserCheck,
  ChevronRight,
  Megaphone,
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
import api from "@/services/api/apiClient";
import { academicApi, type MyClassAssignment } from "@/services/api/academicApi";

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function StaffDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<DashboardData>({
    studentCount: 0, classAssignments: [],
    pendingLeaves: 0, approvedLeaves: 0, recentLeaves: [],
    announcements: [], sentMessages: 0,
  });

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const hour = today.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.name?.split(" ")[0] ?? "Staff";

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const results = await Promise.allSettled([
          academicApi.getMyClassAssignments(),
          staffCommunicationApi.getClassStudents(),
          leaveManagementApi.getMyLeaveRequests(1, 20),
          api.get("/Announcements", { params: { pageSize: 5 } }),
          staffCommunicationApi.getSentMessages(1, 1),
        ]);

        // Class assignments (authoritative source — TeacherAssignment table)
        let classAssignments: MyClassAssignment[] = [];
        if (results[0].status === "fulfilled") classAssignments = results[0].value;

        // Students (from class teacher's classes)
        let studentCount = 0;
        if (results[1].status === "fulfilled") studentCount = results[1].value.length;

        // Leaves
        let recentLeaves: LeaveRequest[] = [];
        let pendingLeaves = 0;
        let approvedLeaves = 0;
        if (results[2].status === "fulfilled") {
          const leaveData = results[2].value;
          recentLeaves = (leaveData.items ?? []).slice(0, 5);
          pendingLeaves = (leaveData.items ?? []).filter((l) => l.status === "Pending").length;
          approvedLeaves = (leaveData.items ?? []).filter((l) => l.status === "Approved").length;
        }

        // Announcements
        let announcements: Announcement[] = [];
        if (results[3].status === "fulfilled") {
          const annData = results[3].value.data;
          announcements = (annData?.items ?? annData?.announcements ?? []).slice(0, 5);
        }

        // Sent messages
        let sentMessages = 0;
        if (results[4].status === "fulfilled") {
          sentMessages = results[4].value?.totalCount ?? 0;
        }

        setData({ studentCount, classAssignments, pendingLeaves, approvedLeaves, recentLeaves, announcements, sentMessages });
      } catch (err) {
        console.error("Dashboard load error:", err);
        toast({ title: "Dashboard", description: "Some data could not be loaded", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [toast]);

  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      const results = await Promise.allSettled([
        academicApi.getMyClassAssignments(),
        staffCommunicationApi.getClassStudents(),
        leaveManagementApi.getMyLeaveRequests(1, 20),
        api.get("/Announcements", { params: { pageSize: 5 } }),
        staffCommunicationApi.getSentMessages(1, 1),
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
      if (results[4].status === "fulfilled") {
        sentMessages = results[4].value?.totalCount ?? 0;
      }

      setData({ studentCount, classAssignments, pendingLeaves, approvedLeaves, recentLeaves, announcements, sentMessages });
    } catch (err) {
      console.error("Refresh error:", err);
      toast({ title: "Refresh", description: "Failed to refresh data", variant: "destructive" });
    } finally {
      setRefreshing(false);
    }
  }, [toast]);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-background border border-primary/20 p-6 md:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-primary/80 uppercase tracking-widest">{greeting}</p>
            <h1 className="text-3xl md:text-4xl font-bold mt-1">{firstName} 👋</h1>
            <p className="text-muted-foreground mt-1 text-sm">{dateStr}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {data.classAssignments.map((a) => (
                <Badge key={a.assignmentId} variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                  {a.className}{a.sectionName ? ` – ${a.sectionName}` : ""}
                  {a.isClassTeacher && <span className="ml-1 text-[10px] opacity-70">(CT)</span>}
                </Badge>
              ))}
              {data.classAssignments.length === 0 && (
                <Badge variant="secondary" className="text-muted-foreground">No classes assigned yet</Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleRefresh()} disabled={refreshing} className="shrink-0">
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-2 hidden sm:inline">Refresh</span>
            </Button>
            <Button size="sm" onClick={() => navigate("/leave-management")} className="shrink-0">
              <Calendar className="h-4 w-4 mr-2" />Apply Leave
            </Button>
          </div>
        </div>
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-4 right-24 w-24 h-24 bg-primary/5 rounded-full blur-2xl" />
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="My Students" value={data.studentCount} subtitle={`Across ${data.classAssignments.length} class${data.classAssignments.length !== 1 ? "es" : ""}`}
          icon={<Users className="h-5 w-5 text-blue-600" />} iconBg="bg-blue-500/10" borderColor="border-l-blue-500" onClick={() => navigate("/my-classes")} />
        <StatCard title="Pending Leaves" value={data.pendingLeaves} subtitle={`${data.approvedLeaves} approved this year`}
          icon={<Clock className="h-5 w-5 text-amber-600" />} iconBg="bg-amber-500/10" borderColor="border-l-amber-500" onClick={() => navigate("/leave-management")} />
        <StatCard title="Announcements" value={data.announcements.length} subtitle="From school management"
          icon={<Megaphone className="h-5 w-5 text-purple-600" />} iconBg="bg-purple-500/10" borderColor="border-l-purple-500" />
        <StatCard title="Messages Sent" value={data.sentMessages} subtitle="To parents"
          icon={<Send className="h-5 w-5 text-green-600" />} iconBg="bg-green-500/10" borderColor="border-l-green-500" onClick={() => navigate("/staff-parent-communication")} />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "Apply for Leave", icon: Calendar, color: "text-amber-600 bg-amber-500/10", path: "/leave-management" },
              { label: "Message Parents", icon: Send, color: "text-green-600 bg-green-500/10", path: "/staff-parent-communication" },
              { label: "Mark Attendance", icon: UserCheck, color: "text-blue-600 bg-blue-500/10", path: "/attendance" },
              { label: "My Classes", icon: BookOpen, color: "text-purple-600 bg-purple-500/10", path: "/my-classes" },
              { label: "Assignments", icon: ClipboardList, color: "text-orange-600 bg-orange-500/10", path: "/assignments" },
              { label: "Communication", icon: MessageSquare, color: "text-pink-600 bg-pink-500/10", path: "/communication" },
            ].map(({ label, icon: Icon, color, path }) => (
              <button key={path} onClick={() => navigate(path)}
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
          {/* Leave Requests */}
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
                          {" \u2192 "}
                          {new Date(leave.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          {" \u00b7 "}<span className="font-medium">{leave.totalDays}d</span>
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

      {/* My Classes Overview */}
      {data.classAssignments.length > 0 && (
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
                const count = data.classAssignments.length > 0
                  ? Math.round(data.studentCount / data.classAssignments.length) : 0;
                return (
                  <div key={a.assignmentId} className="p-4 rounded-xl border bg-gradient-to-br from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/20 hover:border-primary/40 transition-all cursor-pointer" onClick={() => navigate("/my-classes")}>
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

      {/* Leave Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-primary" />Leave Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Submitted", value: data.pendingLeaves + data.approvedLeaves + data.recentLeaves.filter(l => l.status === "Rejected").length, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
              { label: "Pending Approval", value: data.pendingLeaves, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
              { label: "Approved", value: data.approvedLeaves, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
              { label: "Rejected", value: data.recentLeaves.filter((l) => l.status === "Rejected").length, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
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

