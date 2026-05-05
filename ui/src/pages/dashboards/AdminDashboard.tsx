import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, UserCheck, Calendar, GraduationCap, Award, Loader2,
  RefreshCw, BookOpen, Bus, Home as HomeIcon, HeartPulse,
  Shield, Settings, MessageSquare, BarChart3, Clock,
  ChevronRight, Bell, AlertTriangle, CheckCircle2,
  IndianRupee, School, TrendingUp, TrendingDown,
  Megaphone, UserCog, Activity, ChevronDown, ChevronUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { analyticsApi, DashboardSummaryResponse, AttendanceDayDataPoint } from "@/services/api/analyticsApi";
import { useAuth } from "@/contexts/AuthContext";
import { useSchool } from "@/contexts/SchoolContext";
import { toast } from "sonner";
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { AdminLeaveManagementEnhanced } from "@/components/leave-management/AdminLeaveManagementEnhanced";

function inr(n: number) {
  if (n >= 1000000) return "Rs." + (n / 1000000).toFixed(1) + "L";
  if (n >= 1000) return "Rs." + (n / 1000).toFixed(0) + "K";
  return "Rs." + n.toLocaleString("en-IN");
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

const TODAY = new Date();
const DATE_LABEL = TODAY.toLocaleDateString("en-IN", {
  weekday: "long", day: "numeric", month: "long", year: "numeric",
});

function buildAttendanceTrend(dailyData: AttendanceDayDataPoint[], todayPct: number) {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  if (dailyData.length > 0) {
    return dailyData.map(d => ({
      day: dayNames[new Date(d.date).getDay()],
      pct: Math.round(Number(d.attendancePercentage)),
    }));
  }
  // Fallback: only today's real value, rest as zero
  const todayLabel = dayNames[TODAY.getDay()];
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days.map(d => ({ day: d, pct: d === todayLabel ? Math.round(todayPct) : 0 }));
}

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent: string;
  accentBg: string;
  borderColor: string;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  onClick?: () => void;
}

function KpiCard({ label, value, sub, icon: Icon, accent, accentBg, borderColor, trend, trendLabel, onClick }: KpiCardProps) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Activity;
  const trendColor = trend === "up" ? "text-emerald-600" : trend === "down" ? "text-rose-500" : "text-slate-400";
  return (
    <Card
      className={`relative overflow-hidden border-l-4 hover:shadow-md transition-all cursor-pointer group ${borderColor}`}
      onClick={onClick}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
            <p className="text-2xl sm:text-3xl font-bold text-foreground leading-none mb-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground truncate">{sub}</p>}
          </div>
          <div className={`p-2.5 rounded-xl ${accentBg} shrink-0 ml-3`}>
            <Icon className={`h-5 w-5 ${accent}`} />
          </div>
        </div>
        {trendLabel && (
          <div className={`flex items-center gap-1 mt-3 text-xs font-medium ${trendColor}`}>
            <TrendIcon className="h-3 w-3" />
            {trendLabel}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ModuleTileProps {
  icon: React.ElementType;
  label: string;
  desc?: string;
  color: string;
  bg: string;
  url: string;
  badge?: string;
  badgeColor?: string;
}

function ModuleTile({ icon: Icon, label, desc, color, bg, url, badge, badgeColor = "bg-primary/10 text-primary" }: ModuleTileProps) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(url)}
      className="group flex flex-col items-start p-3 sm:p-4 rounded-xl border border-border bg-card hover:bg-muted/40 hover:border-primary/30 hover:shadow-sm transition-all text-left w-full"
    >
      <div className="flex items-center justify-between w-full mb-2.5">
        <div className={`p-2 rounded-lg ${bg}`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        {badge && (
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${badgeColor}`}>{badge}</span>
        )}
      </div>
      <p className="text-xs font-semibold text-foreground leading-snug">{label}</p>
      {desc && <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight line-clamp-1">{desc}</p>}
    </button>
  );
}

function AttTooltip({ active, payload, label }: { active?: boolean; payload?: {value:number}[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-foreground mb-0.5">{label}</p>
      <p className="text-primary">{payload[0].value}% present</p>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { schoolInfo } = useSchool();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [attendanceData, setAttendanceData] = useState<AttendanceDayDataPoint[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showLeaveManagement, setShowLeaveManagement] = useState(false);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [data, attData] = await Promise.all([
        analyticsApi.getDashboardSummary(silent), // force=true when user clicks Refresh
        analyticsApi.getAttendanceAnalytics(7).catch(() => ({ dailyData: [] as AttendanceDayDataPoint[], totalDays: 0, averageAttendancePercentage: 0, highestAttendancePercentage: 0, lowestAttendancePercentage: 0, perfectAttendanceDays: 0 })),
      ]);
      setSummary(data);
      setAttendanceData(attData.dailyData ?? []);
      setLastUpdated(new Date());
    } catch {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="relative">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <School className="h-7 w-7 text-primary" />
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-primary absolute -top-1 -right-1" />
        </div>
        <p className="text-sm text-muted-foreground">Loading dashboard…</p>
      </div>
    );
  }

  const s = summary!;
  const attendancePct = Math.round(s.todayAttendancePercentage ?? 0);
  const attendanceTrend = buildAttendanceTrend(attendanceData, attendancePct);
  const collected = Math.max(0, (s.totalStudents ?? 0) * 8000 - (s.pendingFees ?? 0));
  const feePieData = [
    { name: "Collected", value: collected, fill: "hsl(var(--chart-2))" },
    { name: "Pending", value: s.pendingFees ?? 0, fill: "hsl(var(--chart-5))" },
  ];

  const modules: ModuleTileProps[] = [
    { icon: Users,        label: "Students",      desc: `${s.totalStudents} enrolled`,       color: "text-blue-600",    bg: "bg-blue-50",     url: "/students" },
    { icon: UserCheck,    label: "Staff",          desc: `${s.totalStaff} active`,            color: "text-violet-600",  bg: "bg-violet-50",   url: "/staff" },
    { icon: GraduationCap,label: "Academics",      desc: `${s.totalClasses} classes`,         color: "text-indigo-600",  bg: "bg-indigo-50",   url: "/academics" },
    { icon: Award,        label: "Examinations",   desc: `${s.upcomingExams} upcoming`,       color: "text-amber-600",   bg: "bg-amber-50",    url: "/examinations", badge: s.upcomingExams > 0 ? `${s.upcomingExams}` : undefined, badgeColor: "bg-amber-100 text-amber-700" },
    { icon: Clock,        label: "Timetable",      desc: "Schedule & periods",                color: "text-teal-600",    bg: "bg-teal-50",     url: "/timetable" },
    { icon: IndianRupee,  label: "Fees",            desc: inr(s.pendingFees) + " pending",    color: "text-rose-600",    bg: "bg-rose-50",     url: "/fees", badge: s.pendingFees > 0 ? "!" : undefined, badgeColor: "bg-rose-100 text-rose-700" },
    { icon: BookOpen,     label: "Library",         desc: "Books & issues",                    color: "text-cyan-600",    bg: "bg-cyan-50",     url: "/library" },
    { icon: Calendar,     label: "Attendance",      desc: `${attendancePct}% today`,           color: "text-green-600",   bg: "bg-green-50",    url: "/attendance" },
    { icon: Bus,          label: "Transport",       desc: "Routes & vehicles",                 color: "text-orange-600",  bg: "bg-orange-50",   url: "/transport" },
    { icon: HomeIcon,     label: "Hostel",          desc: "Rooms & occupancy",                 color: "text-pink-600",    bg: "bg-pink-50",     url: "/hostel" },
    { icon: HeartPulse,   label: "Health",          desc: "Medical records",                   color: "text-red-600",     bg: "bg-red-50",      url: "/health" },
    { icon: MessageSquare,label: "Communication",   desc: "Messages & alerts",                 color: "text-green-700",   bg: "bg-green-50",    url: "/communication" },
    { icon: Megaphone,    label: "Announcements",   desc: "Notices & circulars",               color: "text-lime-600",    bg: "bg-lime-50",     url: "/announcements" },
    { icon: BarChart3,    label: "Analytics",       desc: "Insights & reports",                color: "text-blue-700",    bg: "bg-blue-50",     url: "/analytics" },
    { icon: Shield,       label: "Roles",           desc: "Permissions & access",              color: "text-slate-600",   bg: "bg-slate-100",   url: "/role-management" },
    { icon: UserCog,      label: "Visitor",         desc: "Entry & exit log",                  color: "text-stone-600",   bg: "bg-stone-100",   url: "/visitor-management" },
    { icon: Settings,     label: "Settings",        desc: "System configuration",              color: "text-gray-600",    bg: "bg-gray-100",    url: "/settings" },
  ];

  const alerts: { type: "warn" | "ok" | "info"; text: string }[] = [];
  if (attendancePct > 0 && attendancePct < 85) alerts.push({ type: "warn", text: `Attendance is low today - ${attendancePct}%` });
  if (s.pendingFees > 0) alerts.push({ type: "warn", text: `${inr(s.pendingFees)} in fee collections pending` });
  if (s.upcomingExams > 0) alerts.push({ type: "info", text: `${s.upcomingExams} exam(s) scheduled in the next 7 days` });
  if (alerts.length === 0) alerts.push({ type: "ok", text: "All systems operating normally" });

  return (
    <div className="space-y-6 animate-fade-in pb-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-primary/5 border-primary/20 text-primary">
              Admin
            </Badge>
            {schoolInfo?.boardAffiliation && (
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 text-muted-foreground">{schoolInfo.boardAffiliation}</Badge>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {greeting()}, {user?.name?.split(" ")[0] ?? "Admin"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {DATE_LABEL}{schoolInfo?.name ? ` · ${schoolInfo.name}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground hidden sm:block">
              Updated {lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => loadData(true)} disabled={refreshing}>
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <KpiCard
          label="Total Students" value={s.totalStudents.toLocaleString()} sub="Active enrolment"
          icon={Users} accent="text-blue-600" accentBg="bg-blue-50" borderColor="border-l-blue-500"
          trend="neutral" trendLabel="Enrolled this year" onClick={() => navigate("/students")}
        />
        <KpiCard
          label="Teaching Staff" value={s.totalStaff.toLocaleString()} sub="Active members"
          icon={UserCheck} accent="text-violet-600" accentBg="bg-violet-50" borderColor="border-l-violet-500"
          trend="neutral" trendLabel="Full-time & part-time" onClick={() => navigate("/staff")}
        />
        <KpiCard
          label="Attendance Today" value={attendancePct > 0 ? `${attendancePct}%` : "–"} sub={`${s.todayAbsentStudents} absent`}
          icon={Calendar}
          accent={attendancePct >= 90 ? "text-emerald-600" : attendancePct >= 80 ? "text-amber-600" : "text-rose-600"}
          accentBg={attendancePct >= 90 ? "bg-emerald-50" : attendancePct >= 80 ? "bg-amber-50" : "bg-rose-50"}
          borderColor={attendancePct >= 90 ? "border-l-emerald-500" : attendancePct >= 80 ? "border-l-amber-500" : "border-l-rose-500"}
          trend={attendancePct >= 90 ? "up" : attendancePct >= 80 ? "neutral" : "down"}
          trendLabel={attendancePct >= 90 ? "On target" : attendancePct >= 80 ? "Near target" : "Below target"}
          onClick={() => navigate("/attendance")}
        />
        <KpiCard
          label="Pending Fees" value={inr(s.pendingFees)} sub="Dues outstanding"
          icon={IndianRupee} accent="text-rose-600" accentBg="bg-rose-50" borderColor="border-l-rose-500"
          trend={s.pendingFees === 0 ? "up" : "down"} trendLabel={s.pendingFees === 0 ? "All clear" : "Action needed"}
          onClick={() => navigate("/fees")}
        />
        <KpiCard
          label="Active Classes" value={s.totalClasses.toLocaleString()} sub="Standards & sections"
          icon={GraduationCap} accent="text-indigo-600" accentBg="bg-indigo-50" borderColor="border-l-indigo-500"
          trend="neutral" trendLabel="This academic year" onClick={() => navigate("/academics")}
        />
        <KpiCard
          label="Upcoming Exams" value={s.upcomingExams.toLocaleString()} sub="Next 7 days"
          icon={Award}
          accent={s.upcomingExams > 0 ? "text-amber-600" : "text-slate-500"}
          accentBg={s.upcomingExams > 0 ? "bg-amber-50" : "bg-slate-50"}
          borderColor={s.upcomingExams > 0 ? "border-l-amber-500" : "border-l-slate-300"}
          trend={s.upcomingExams > 0 ? "neutral" : "up"}
          trendLabel={s.upcomingExams > 0 ? "Scheduled" : "No exams this week"}
          onClick={() => navigate("/examinations")}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 pt-5 px-5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Attendance Trend</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Student presence this week (%)</p>
              </div>
              <Badge variant="outline" className="text-xs">This week</Badge>
            </div>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={attendanceTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[70, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip content={<AttTooltip />} />
                <Area type="monotone" dataKey="pct" stroke="hsl(var(--primary))" strokeWidth={2.5}
                  fill="url(#attGrad)" dot={{ r: 3, fill: "hsl(var(--primary))", strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-sm font-semibold">Fee Overview</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Collected vs pending</p>
          </CardHeader>
          <CardContent className="flex flex-col items-center pb-4">
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={feePieData} cx="50%" cy="50%" innerRadius={42} outerRadius={62} paddingAngle={3} dataKey="value">
                  {feePieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip formatter={(v: number) => inr(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex gap-4 text-xs mt-1">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--chart-2))]" />Collected</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--chart-5))]" />Pending</span>
            </div>
            <div className="mt-3 w-full border-t pt-3 space-y-1.5 px-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Outstanding dues</span>
                <span className="font-semibold text-rose-600">{inr(s.pendingFees)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      <div className="flex flex-wrap gap-2">
        {alerts.map((a, i) => (
          <div key={i} className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border font-medium ${
            a.type === "warn" ? "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300" :
            a.type === "info" ? "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300" :
            "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300"
          }`}>
            {a.type === "warn" ? <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> :
             a.type === "info" ? <Bell className="h-3.5 w-3.5 shrink-0" /> :
             <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
            {a.text}
          </div>
        ))}
      </div>

      {/* Module Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">All Modules</h2>
          </div>
          <span className="text-xs text-muted-foreground">{modules.length} modules active</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-9 gap-2.5">
          {modules.map(m => <ModuleTile key={m.url} {...m} />)}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quick Actions</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Take Attendance", url: "/attendance", primary: true },
            { label: "Collect Fee",      url: "/fees",       primary: false },
            { label: "Add Student",      url: "/students",   primary: false },
            { label: "Add Staff",        url: "/staff",      primary: false },
            { label: "Issue Book",       url: "/library",    primary: false },
            { label: "View Analytics",   url: "/analytics",  primary: false },
          ].map(q => (
            <Button key={q.url} variant={q.primary ? "default" : "outline"} size="sm" onClick={() => navigate(q.url)}>
              {q.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Leave Management Section */}
      <Card className="border-l-4 border-l-primary/50">
        <CardHeader 
          className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => setShowLeaveManagement(!showLeaveManagement)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Leave Management</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Approve, reject, and manage staff/student leave requests</p>
              </div>
            </div>
            {showLeaveManagement ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        {showLeaveManagement && (
          <CardContent className="pt-0">
            <div className="border-t pt-4">
              <AdminLeaveManagementEnhanced />
            </div>
          </CardContent>
        )}
      </Card>

    </div>
  );
}
