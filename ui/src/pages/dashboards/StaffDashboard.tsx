
import { useEffect, useState, useCallback, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Calendar, Users, BookOpen, CheckCircle, Clock,
  AlertCircle, Bell, TrendingUp, ArrowRight, RefreshCw, Loader2,
  ClipboardList, UserCheck, ChevronRight, Megaphone, KeyRound,
  GraduationCap, BarChart3, DollarSign, Truck, Home, HeartPulse,
  Library, UserCog, School, Building2, Activity, Cake, NotebookPen,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import leaveManagementApi, { LeaveRequest } from "@/services/api/leaveManagementApi";
import { StudentLeaveRequests } from "@/components/leave-management/StudentLeaveRequests";
import api from "@/services/api/apiClient";
import { academicApi, type MyClassAssignment } from "@/services/api/academicApi";
import { analyticsApi, type DashboardSummaryResponse, type AttendanceAnalyticsResponse } from "@/services/api/analyticsApi";
import { attendanceApi, type StaffAttendanceResponse } from "@/services/api/attendanceApi";
import { studentApi } from "@/services/api/studentApi";
import { diaryApi, type DiaryEntry } from "@/services/api/diaryApi";
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

// ─── Birthday helpers ──────────────────────────────────────────────────────────
interface BirthdayStudent {
  id: string; name: string; className: string; sectionName?: string;
  dob: string; isToday: boolean; daysUntil: number;
}

function getBirthdayInfo(dob: string): { isToday: boolean; daysUntil: number } | null {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = new Date(dob);
    const thisYear = new Date(today.getFullYear(), d.getMonth(), d.getDate());
    if (thisYear.getTime() < today.getTime()) thisYear.setFullYear(today.getFullYear() + 1);
    const diff = Math.round((thisYear.getTime() - today.getTime()) / 86400000);
    if (diff < 0) return null;
    if (diff === 0) return { isToday: true, daysUntil: 0 };
    if (diff <= 7) return { isToday: false, daysUntil: diff };
    return null;
  } catch { return null; }
}

const AVATAR_COLORS = [
  "from-purple-500 to-indigo-600", "from-sky-500 to-blue-600",
  "from-emerald-500 to-teal-600",  "from-orange-500 to-amber-600",
  "from-pink-500 to-rose-600",     "from-violet-500 to-purple-600",
];
function avatarColor(name: string) { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]; }

// ─── Role-specific Stat config ────────────────────────────────────────────────
interface RoleStatConfig {
  title: string; iconBg: string; borderColor: string; icon: React.ElementType; path?: string;
  value: (d: DashboardData) => string | number;
  subtitle: (d: DashboardData) => string;
}

function getRoleStats(group: DesignationGroup, t: (key: string) => string): RoleStatConfig[] {
  switch (group) {
    case "leadership":
      return [
        { title: t('staffDash.totalStudents'), iconBg: "bg-purple-500/10", borderColor: "border-l-purple-500", icon: Users,       path: "/students",     value: d => d.schoolStats?.totalStudents ?? "—", subtitle: d => `${d.schoolStats?.todayAbsentStudents ?? 0} ${t('staffDash.absentToday')}` },
        { title: t('staffDash.totalStaff'),    iconBg: "bg-blue-500/10",   borderColor: "border-l-blue-500",   icon: UserCheck,   path: "/staff",        value: d => d.schoolStats?.totalStaff ?? "—",    subtitle: d => `${d.schoolStats?.todayAbsentStaff ?? 0} ${t('staffDash.absentToday')}` },
        { title: t('staffDash.attendance'),     iconBg: "bg-green-500/10",  borderColor: "border-l-green-500",  icon: Activity,    value: d => d.schoolStats ? `${Math.round(d.schoolStats.todayAttendancePercentage)}%` : "—", subtitle: () => "Today's rate" },
        { title: t('staffDash.staffLeaves'),   iconBg: "bg-amber-500/10",  borderColor: "border-l-amber-500",  icon: Calendar,    path: "/leave-management", value: d => d.pendingStaffLeaves ?? 0, subtitle: () => t('staffDash.pendingApproval') },
      ];
    case "academic_head":
    case "class_teacher":
    case "teacher":
      return [
        { title: t('staffDash.myClasses'),     iconBg: "bg-primary/10",    borderColor: "border-l-primary",    icon: BookOpen,     path: "/my-classes",       value: d => d.classAssignments.length || "—",      subtitle: () => t('staffDash.assignedSections') },
        { title: t('staffDash.myStudents'),    iconBg: "bg-purple-500/10", borderColor: "border-l-purple-500", icon: Users,        path: "/my-classes",       value: d => d.studentCount,                        subtitle: d => `across ${d.classAssignments.length} class${d.classAssignments.length !== 1 ? "es" : ""}` },
        { title: t('staffDash.diaryEntries'),  iconBg: "bg-sky-500/10",    borderColor: "border-l-sky-500",    icon: NotebookPen,  path: "/staff-diary",      value: d => d.recentDiaryEntries.length,           subtitle: () => t('staffDash.recentEntries') },
        { title: t('staffDash.myLeaves'),      iconBg: "bg-amber-500/10",  borderColor: "border-l-amber-500",  icon: Calendar,     path: "/leave-management", value: d => d.pendingLeaves,                       subtitle: d => `${d.approvedLeaves} ${t('staffDash.approved')}` },
      ];
    case "finance":
      return [
        { title: t('staffDash.pendingFees'),   iconBg: "bg-red-500/10",    borderColor: "border-l-red-500",    icon: DollarSign,  path: "/fees",     value: d => d.schoolStats ? `₹${(d.schoolStats.pendingFees / 1000).toFixed(0)}K` : "—", subtitle: () => t('staffDash.outstanding') },
        { title: t('staffDash.totalStudents'), iconBg: "bg-emerald-500/10",borderColor: "border-l-emerald-500",icon: Users,       path: "/students", value: d => d.schoolStats?.totalStudents ?? "—", subtitle: () => t('staffDash.activeEnrollment') },
        { title: t('staffDash.pendingLeaves'), iconBg: "bg-amber-500/10",  borderColor: "border-l-amber-500",  icon: Calendar,    path: "/leave-management", value: d => d.pendingLeaves, subtitle: d => `${d.approvedLeaves} ${t('staffDash.approved')}` },
        { title: t('staffDash.announcements'), iconBg: "bg-purple-500/10", borderColor: "border-l-purple-500", icon: Megaphone,   value: d => d.announcements.length, subtitle: () => t('staffDash.fromManagement') },
      ];
    case "hr":
      return [
        { title: t('staffDash.totalStaff'),    iconBg: "bg-teal-500/10",   borderColor: "border-l-teal-500",   icon: UserCheck,   path: "/staff", value: d => d.schoolStats?.totalStaff ?? "—", subtitle: d => `${d.schoolStats?.todayAbsentStaff ?? 0} ${t('staffDash.absentToday')}` },
        { title: t('staffDash.staffLeaves'),   iconBg: "bg-amber-500/10",  borderColor: "border-l-amber-500",  icon: Calendar,    path: "/leave-management", value: d => d.pendingStaffLeaves ?? d.pendingLeaves, subtitle: () => t('staffDash.pendingApproval') },
        { title: t('staffDash.myLeaves'),      iconBg: "bg-green-500/10",  borderColor: "border-l-green-500",  icon: CheckCircle, path: "/leave-management", value: d => d.approvedLeaves, subtitle: () => t('staffDash.approvedThisYear') },
        { title: t('staffDash.announcements'), iconBg: "bg-purple-500/10", borderColor: "border-l-purple-500", icon: Megaphone,   value: d => d.announcements.length, subtitle: () => t('staffDash.fromManagement') },
      ];
    default: // teacher, librarian, transport, hostel, admissions, counselor, other
      return [
        { title: t('staffDash.myClasses'),     iconBg: "bg-primary/10",    borderColor: "border-l-primary",    icon: BookOpen,    path: "/my-classes",       value: d => d.classAssignments.length || "—", subtitle: () => t('staffDash.assigned') },
        { title: t('staffDash.pendingLeaves'), iconBg: "bg-amber-500/10",  borderColor: "border-l-amber-500",  icon: Clock,       path: "/leave-management", value: d => d.pendingLeaves, subtitle: d => `${d.approvedLeaves} ${t('staffDash.approved')}` },
        { title: t('staffDash.announcements'), iconBg: "bg-purple-500/10", borderColor: "border-l-purple-500", icon: Megaphone,                              value: d => d.announcements.length, subtitle: () => t('staffDash.fromManagement') },
        { title: t('staffDash.leaveApproved'), iconBg: "bg-green-500/10",  borderColor: "border-l-green-500",  icon: CheckCircle, path: "/leave-management", value: d => d.approvedLeaves, subtitle: () => t('staffDash.thisYear') },
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
  schoolStats?: DashboardSummaryResponse | null;
  pendingStaffLeaves?: number;
  staffLeaveQueue?: LeaveRequest[];
  // New widgets
  myAttendance: StaffAttendanceResponse[];
  attendanceTrend: AttendanceAnalyticsResponse | null;
  birthdayStudents: BirthdayStudent[];
  recentDiaryEntries: DiaryEntry[];
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

// ── Attendance Trend Bar Chart (leadership – 7-day school-wide) ───────────────
function AttendanceTrendChart({ data }: { data: AttendanceAnalyticsResponse }) {
  const days = data.dailyData.slice(-7);
  const maxPct = Math.max(...days.map(d => d.attendancePercentage), 1);
  return (
    <div className="space-y-3">
      <div className="flex items-end gap-1.5 h-28">
        {days.map((day) => {
          const height = Math.max((day.attendancePercentage / maxPct) * 100, 4);
          const color = day.attendancePercentage >= 85 ? "#22c55e" : day.attendancePercentage >= 70 ? "#f59e0b" : "#ef4444";
          return (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-popover border rounded px-1.5 py-0.5 text-[10px] font-medium shadow opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                {Math.round(day.attendancePercentage)}%
              </div>
              <div className="w-full rounded-t-sm transition-all" style={{ height: `${height}%`, backgroundColor: color }} />
              <span className="text-[10px] text-muted-foreground">
                {new Date(day.date).toLocaleDateString("en-IN", { weekday: "short" }).slice(0, 2)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />≥85%</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />70–84%</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />&lt;70%</span>
      </div>
    </div>
  );
}

// ── Personal Attendance Card (non-leadership – this month) ────────────────────
function PersonalAttendanceCard({ records, onNavigate }: { records: StaffAttendanceResponse[]; onNavigate: () => void }) {
  const { t } = useLanguage();
  const presentCount = records.filter(r => r.status === "present").length;
  const absentCount  = records.filter(r => r.status === "absent").length;
  const lateCount    = records.filter(r => r.status === "late").length;
  const leaveCount   = records.filter(r => r.status === "leave").length;
  const rate = records.length > 0 ? Math.round((presentCount / records.length) * 100) : null;
  return (
    <div className="space-y-4">
      {rate !== null && (
        <div className="flex items-center justify-between">
          <div><p className="text-3xl font-bold leading-none">{rate}%</p><p className="text-xs text-muted-foreground mt-1">This month's rate</p></div>
          <div className={`px-3 py-1.5 rounded-full text-sm font-semibold ${rate >= 90 ? "bg-green-100 text-green-700" : rate >= 75 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
            {rate >= 90 ? "Excellent" : rate >= 75 ? "Good" : "Low"}
          </div>
        </div>
      )}
      {records.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">{t('staffDash.noRecordsThisMonth')}</p>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: t('staffDash.present'), count: presentCount, color: "text-green-600" },
              { label: t('staffDash.absent'),  count: absentCount,  color: "text-red-600" },
              { label: t('staffDash.late'),    count: lateCount,    color: "text-amber-600" },
              { label: t('staffDash.leave'),   count: leaveCount,   color: "text-blue-600" },
            ].map(({ label, count, color }) => (
              <div key={label} className="text-center p-2 rounded-lg bg-muted/40">
                <p className={`text-xl font-bold ${color}`}>{count}</p>
                <p className="text-[11px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
          <Progress value={rate ?? 0} className="h-2" />
        </>
      )}
      <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground hover:text-primary" onClick={onNavigate}>
        {t('staffDash.fullAttendanceHistory')} <ArrowRight className="h-3 w-3 ml-1" />
      </Button>
    </div>
  );
}

// ── Birthday Widget ────────────────────────────────────────────────────────────
function BirthdayWidget({ students, onNavigate }: { students: BirthdayStudent[]; onNavigate: () => void }) {
  const { t } = useLanguage();
  const todayBdays    = students.filter(s => s.isToday);
  const upcomingBdays = students.filter(s => !s.isToday);
  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
        <Cake className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">{t('staffDash.noBirthdaysNext7')}</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {todayBdays.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t('staffDash.todayBirthdays')}</p>
          <div className="space-y-2">
            {todayBdays.map(s => (
              <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200/60">
                <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColor(s.name)} flex items-center justify-center text-white text-sm font-bold shrink-0`}>{s.name.charAt(0)}</div>
                <div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate">{s.name}</p><p className="text-xs text-muted-foreground">{s.className}{s.sectionName ? ` – ${s.sectionName}` : ""}</p></div>
                <span className="text-lg">🎂</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {upcomingBdays.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t('staffDash.upcoming')}</p>
          <div className="space-y-1.5">
            {upcomingBdays.slice(0, 5).map(s => (
              <div key={s.id} className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-muted/40 transition-colors">
                <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatarColor(s.name)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>{s.name.charAt(0)}</div>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{s.name}</p><p className="text-xs text-muted-foreground">{s.className}</p></div>
                <Badge variant="secondary" className="text-[10px] shrink-0">in {s.daysUntil}d</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
      <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground hover:text-primary" onClick={onNavigate}>
        {t('staffDash.viewAllStudents')} <ArrowRight className="h-3 w-3 ml-1" />
      </Button>
    </div>
  );
}

// ── Recent Diary Activity ─────────────────────────────────────────────────────
const CATEGORY_DOTS: Record<string, string> = {
  note: "bg-blue-400", homework: "bg-violet-500", guideline: "bg-teal-500",
  observation: "bg-amber-500", achievement: "bg-green-500", concern: "bg-red-500",
  feedback: "bg-pink-500", behavior: "bg-orange-500",
};
function DiaryActivityWidget({ entries, onNavigate }: { entries: DiaryEntry[]; onNavigate: () => void }) {
  const { t } = useLanguage();
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
        <NotebookPen className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">{t('staffDash.noDiaryEntries')}</p>
        <Button variant="outline" size="sm" onClick={onNavigate} className="mt-1">{t('staffDash.openDiary')}</Button>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {entries.map((e) => (
        <div key={e.id} className="flex gap-3 p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer" onClick={onNavigate}>
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${CATEGORY_DOTS[e.category] ?? "bg-blue-400"}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium truncate flex-1">{e.title}</p>
              <Badge variant="outline" className="text-[10px] capitalize shrink-0">{e.category}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{e.content}</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {e.className ? `${e.className}${e.sectionName ? ` – ${e.sectionName}` : ""}` : "Individual"} · {new Date(e.diaryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
            </p>
          </div>
        </div>
      ))}
      <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground hover:text-primary" onClick={onNavigate}>
        {t('staffDash.openDiary')} <ArrowRight className="h-3 w-3 ml-1" />
      </Button>
    </div>
  );
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
  const { t } = useLanguage();
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
            {t('staffDash.staffLeaveApprovals')}
            <Badge variant="secondary" className="text-xs">0 pending</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle className="h-8 w-8 text-green-500/60 mb-2" />
            <p className="text-sm text-muted-foreground">{t('staffDash.allCaughtUp')}</p>
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
            {t('staffDash.staffLeaveApprovals')}
            {totalCount > 0 && (
              <Badge className="text-xs bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-100">
                {totalCount} pending
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary" onClick={() => navigate("/leave-management")}>
            {t('staffDash.viewAll2')} <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {leaves.map((leave) => (
              <div key={leave.id} className="flex items-center justify-between gap-3 px-6 py-3 hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className={`h-7 w-7 rounded-full bg-gradient-to-br ${avatarColor(leave.applicantName ?? "S")} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
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
                    {t('staffDash.approveBtn')}
                  </Button>
                  <Button
                    size="sm" variant="outline"
                    className="h-7 px-2.5 text-xs gap-1 border-red-300 text-red-700 hover:bg-red-50"
                    disabled={processingId === leave.id}
                    onClick={() => setRejectDialog({ open: true, leave, remarks: "" })}
                  >
                    <AlertCircle className="h-3 w-3" />
                    {t('staffDash.rejectBtn')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {totalCount > leaves.length && (
            <div className="px-6 py-3 border-t bg-muted/20">
              <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={() => navigate("/leave-management")}>
                +{totalCount - leaves.length} {t('staffDash.morePending')}
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
              <h3 className="font-semibold text-base">{t('staffDash.rejectLeaveTitle')}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {rejectDialog.leave.applicantName} · {rejectDialog.leave.leaveTypeName}
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t('staffDash.reasonForRejection')} <span className="text-destructive">*</span></label>
              <textarea
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="State reason clearly..."
                value={rejectDialog.remarks}
                onChange={e => setRejectDialog(d => ({ ...d, remarks: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setRejectDialog({ open: false, leave: null, remarks: "" })}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="destructive" size="sm"
                disabled={processingId === rejectDialog.leave.id}
                onClick={handleRejectConfirm}
                className="gap-1"
              >
                {processingId === rejectDialog.leave.id && <Loader2 className="h-3 w-3 animate-spin" />}
                {t('staffDash.confirmReject')}
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
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const requirePasswordChange = !!(user as { requirePasswordChange?: boolean })?.requirePasswordChange;

  const designation = user?.designation ?? "Teacher";
  const group = getDesignationGroup(designation);
  const meta = GROUP_META[group];
  const statConfigs = getRoleStats(group, t);
  const isTeachingRole = group === "teacher" || group === "class_teacher" || group === "academic_head";
  const isSchoolWide   = group === "leadership" || group === "finance" || group === "hr";

  const [data, setData] = useState<DashboardData>({
    studentCount: 0, classAssignments: [],
    pendingLeaves: 0, approvedLeaves: 0, recentLeaves: [],
    announcements: [], schoolStats: null,
    pendingStaffLeaves: 0, staffLeaveQueue: [],
    myAttendance: [], attendanceTrend: null,
    birthdayStudents: [], recentDiaryEntries: [],
  });

  const today = new Date();
  const dateStr  = today.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const hour     = today.getHours();
  const greeting = hour < 12 ? t('staffDash.goodMorning') : hour < 17 ? t('staffDash.goodAfternoon') : t('staffDash.goodEvening');
  const firstName = user?.name?.split(" ")[0] ?? "Staff";

  const monthStart = useMemo(() => new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0], []); // eslint-disable-line react-hooks/exhaustive-deps
  const todayStr   = useMemo(() => today.toISOString().split("T")[0], []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (requirePasswordChange) setChangePasswordOpen(true);
  }, [requirePasswordChange]);

  const loadDashboardData = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        /* 0 */ academicApi.getMyClassAssignments(),
        /* 1 */ leaveManagementApi.getMyLeaveRequests(1, 20),
        /* 2 */ api.get("/Announcements", { params: { pageSize: 5 } }),
        /* 3 */ isSchoolWide ? analyticsApi.getDashboardSummary() : Promise.resolve(null),
        /* 4 */ group === "leadership" ? leaveManagementApi.getLeaveRequests(1, 8, undefined, "Pending") : Promise.resolve(null),
        /* 5 */ group === "leadership" ? analyticsApi.getAttendanceAnalytics(7) : Promise.resolve(null),
        /* 6 */ attendanceApi.getMyAttendance({ fromDate: monthStart, toDate: todayStr }),
        /* 7 */ isTeachingRole ? diaryApi.list({ page: 1, pageSize: 3 }) : Promise.resolve(null),
      ]);

      let classAssignments: MyClassAssignment[] = [];
      if (results[0].status === "fulfilled") classAssignments = results[0].value;

      let recentLeaves: LeaveRequest[] = [];
      let pendingLeaves = 0; let approvedLeaves = 0;
      if (results[1].status === "fulfilled") {
        const lv = results[1].value;
        recentLeaves   = (lv.items ?? []).slice(0, 5);
        pendingLeaves  = (lv.items ?? []).filter(l => l.status === "Pending").length;
        approvedLeaves = (lv.items ?? []).filter(l => l.status === "Approved").length;
      }

      let announcements: Announcement[] = [];
      if (results[2].status === "fulfilled") {
        const a = results[2].value.data;
        announcements = (a?.items ?? a?.announcements ?? []).slice(0, 5);
      }

      let schoolStats: DashboardSummaryResponse | null = null;
      if (results[3].status === "fulfilled" && results[3].value) schoolStats = results[3].value as DashboardSummaryResponse;

      let pendingStaffLeaves = 0; let staffLeaveQueue: LeaveRequest[] = [];
      if (results[4].status === "fulfilled" && results[4].value) {
        const lv = results[4].value as { totalCount?: number; items?: LeaveRequest[] };
        pendingStaffLeaves = lv?.totalCount ?? 0;
        staffLeaveQueue = (lv?.items ?? []).filter(l => l.applicantType === "Staff" || !l.applicantType);
      }

      let attendanceTrend: AttendanceAnalyticsResponse | null = null;
      if (results[5].status === "fulfilled" && results[5].value) attendanceTrend = results[5].value as AttendanceAnalyticsResponse;

      let myAttendance: StaffAttendanceResponse[] = [];
      if (results[6].status === "fulfilled") myAttendance = results[6].value as StaffAttendanceResponse[];

      let recentDiaryEntries: DiaryEntry[] = [];
      if (results[7].status === "fulfilled" && results[7].value) {
        const dv = results[7].value as { entries?: DiaryEntry[] } | DiaryEntry[];
        recentDiaryEntries = Array.isArray(dv) ? dv : (dv?.entries ?? []);
      }

      // Load students for birthday widget (teaching roles only)
      let birthdayStudents: BirthdayStudent[] = [];
      let studentCount = 0;
      if (isTeachingRole && classAssignments.length > 0) {
        const studentResults = await Promise.allSettled(
          classAssignments.map(cls =>
            studentApi.list({ classFilter: cls.className, sectionFilter: cls.sectionName, pageSize: 500 })
          )
        );
        for (let i = 0; i < studentResults.length; i++) {
          const r = studentResults[i];
          if (r.status !== "fulfilled") continue;
          const cls = classAssignments[i];
          const students = (r.value as { students?: { id: string; name: string; dateOfBirth?: string }[] }).students ?? [];
          studentCount += students.length;
          for (const s of students) {
            if (!s.dateOfBirth) continue;
            const info = getBirthdayInfo(s.dateOfBirth);
            if (!info) continue;
            birthdayStudents.push({ id: s.id, name: s.name, className: cls.className, sectionName: cls.sectionName, dob: s.dateOfBirth, ...info });
          }
        }
        birthdayStudents.sort((a, b) => a.daysUntil - b.daysUntil);
      }

      setData({ studentCount, classAssignments, pendingLeaves, approvedLeaves, recentLeaves, announcements, schoolStats, pendingStaffLeaves, staffLeaveQueue, myAttendance, attendanceTrend, birthdayStudents, recentDiaryEntries });
    } catch (err) {
      console.error("Dashboard load error:", err);
      toast({ title: "Dashboard", description: "Some data could not be loaded", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [group, isTeachingRole, isSchoolWide, monthStart, todayStr, toast]);

  useEffect(() => { loadDashboardData(); }, [loadDashboardData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, [loadDashboardData]);

  if (loading) return <DashboardSkeleton />;

  const RoleIcon = meta.icon;

  return (
    <div className="space-y-6">
      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} forced={requirePasswordChange} onSuccess={logout} />

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
              <Badge variant="outline" className={`${meta.badgeBg} border font-medium`}>
                <RoleIcon className="h-3 w-3 mr-1" />{designation}
              </Badge>
              {(group === "teacher" || group === "class_teacher" || group === "academic_head") &&
                data.classAssignments.map((a) => (
                  <Badge key={a.assignmentId} variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    {a.className}{a.sectionName ? ` – ${a.sectionName}` : ""}
                    {a.isClassTeacher && <span className="ml-1 text-[10px] opacity-70">(CT)</span>}
                  </Badge>
                ))
              }
              {group === "leadership" && data.schoolStats && (
                <>
                  <Badge variant="secondary" className="bg-purple-500/10 text-purple-700 border-purple-200">{data.schoolStats.totalStudents} students</Badge>
                  <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 border-blue-200">{data.schoolStats.totalStaff} staff</Badge>
                  <Badge variant="secondary" className={Math.round(data.schoolStats.todayAttendancePercentage) >= 85 ? "bg-green-500/10 text-green-700" : "bg-amber-500/10 text-amber-700"}>
                    {Math.round(data.schoolStats.todayAttendancePercentage)}% attendance today
                  </Badge>
                </>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap shrink-0">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="shrink-0">
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-2 hidden sm:inline">{t('staffDash.refresh')}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setChangePasswordOpen(true)} className="shrink-0">
              <KeyRound className="h-4 w-4 mr-2" />{t('staffDash.changePassword')}
            </Button>
            <Button size="sm" onClick={() => navigate("/leave-management")} className="shrink-0">
              <Calendar className="h-4 w-4 mr-2" />{t('staffDash.applyLeave')}
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
            <StatCard key={cfg.title} title={cfg.title} value={cfg.value(data)} subtitle={cfg.subtitle(data)}
              icon={<cfg.icon className={`h-5 w-5 ${iconColorClass}`} />}
              iconBg={cfg.iconBg} borderColor={cfg.borderColor}
              onClick={cfg.path ? () => navigate(cfg.path!) : undefined}
            />
          );
        })}
      </div>

      {/* ── Insights Row ─────────────────────────────────────────────────────── */}
      {group === "leadership" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 7-day Attendance Trend */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" />{t('staffDash.attendance')}</CardTitle>
              {data.attendanceTrend && <Badge variant="secondary" className="text-xs">Avg {Math.round(data.attendanceTrend.averageAttendancePercentage)}%</Badge>}
            </CardHeader>
            <CardContent>
              {data.attendanceTrend ? <AttendanceTrendChart data={data.attendanceTrend} /> : <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">{t('staffDash.noAttendanceData')}</div>}
            </CardContent>
          </Card>
          {/* School at a Glance */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" />{t('staffDash.schoolAtGlance')}</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => navigate("/reports")}>{t('staffDash.report')} <ArrowRight className="h-3 w-3 ml-1" /></Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.schoolStats ? [
                { label: t('staffDash.students2'),       value: data.schoolStats.totalStudents,      color: "text-purple-600", icon: Users },
                { label: t('staffDash.staff'),          value: data.schoolStats.totalStaff,          color: "text-blue-600",   icon: UserCheck },
                { label: t('staffDash.absentTodayLabel'),   value: data.schoolStats.todayAbsentStudents, color: "text-red-600",    icon: AlertCircle },
                { label: t('staffDash.upcomingExams'), value: data.schoolStats.upcomingExams,       color: "text-violet-600", icon: CheckCircle },
              ].map(({ label, value, color, icon: Icon }) => (
                <div key={label} className="flex items-center justify-between py-1 border-b last:border-0">
                  <div className="flex items-center gap-2"><Icon className={`h-3.5 w-3.5 ${color}`} /><span className="text-sm text-muted-foreground">{label}</span></div>
                  <span className={`text-sm font-bold ${color}`}>{value}</span>
                </div>
              )) : <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Personal Attendance */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />{t('staffDash.myAttendance')}
                <Badge variant="secondary" className="text-xs">{today.toLocaleDateString("en-IN", { month: "short" })}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PersonalAttendanceCard records={data.myAttendance} onNavigate={() => navigate("/my-attendance")} />
            </CardContent>
          </Card>
          {/* Birthdays or Overview */}
          {isTeachingRole ? (
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <Cake className="h-4 w-4 text-amber-500" />{t('staffDash.title')}
                  {data.birthdayStudents.filter(s => s.isToday).length > 0 && (
                    <Badge className="text-xs bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-100">{data.birthdayStudents.filter(s => s.isToday).length} today!</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BirthdayWidget students={data.birthdayStudents} onNavigate={() => navigate("/my-classes")} />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />{t('staffDash.myOverview')}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: t('staffDash.pendingLeaves'),  value: data.pendingLeaves,            color: "text-amber-600", path: "/leave-management" },
                  { label: t('staffDash.approvedLeaves'), value: data.approvedLeaves,           color: "text-green-600", path: "/leave-management" },
                  { label: t('staffDash.announcementsLabel'),   value: data.announcements.length,     color: "text-purple-600", path: "/announcements" },
                ].map(({ label, value, color, path }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b last:border-0 cursor-pointer hover:bg-muted/30 -mx-1 px-1 rounded" onClick={() => navigate(path)}>
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span className={`text-lg font-bold ${color}`}>{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {/* Recent Diary (teaching) or Quick Access (others) */}
          {isTeachingRole ? (
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base flex items-center gap-2"><NotebookPen className="h-4 w-4 text-primary" />{t('staffDash.recentDiary')}</CardTitle>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => navigate("/staff-diary")}>{t('staffDash.write')} <ArrowRight className="h-3 w-3 ml-1" /></Button>
              </CardHeader>
              <CardContent>
                <DiaryActivityWidget entries={data.recentDiaryEntries} onNavigate={() => navigate("/staff-diary")} />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><School className="h-4 w-4 text-primary" />{t('staffDash.quickAccess')}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {[
                  { label: t('staffDash.schoolConnect'), icon: School,   path: "/school-connect" },
                  { label: t('staffDash.announcementsLabel'),  icon: Bell,     path: "/announcements" },
                  { label: t('staffDash.timetable'),      icon: Clock,    path: "/timetable" },
                ].map(({ label, icon: Icon, path }) => (
                  <button key={path} onClick={() => navigate(path)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-background hover:bg-muted/50 hover:border-primary/30 transition-all text-left group">
                    <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                    <span className="text-sm font-medium flex-1">{label}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary" />
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Leave + Announcements Row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" />{t('staffDash.leaveBalance')}</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => navigate("/leave-management")}>{t('staffDash.viewAll')} <ArrowRight className="h-3 w-3 ml-1" /></Button>
          </CardHeader>
          <CardContent>
            {data.recentLeaves.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Calendar className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No leave requests yet</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate("/leave-management")}>Apply for Leave</Button>
              </div>
            ) : (
              <div className="space-y-2">
                {data.recentLeaves.map(leave => (
                  <div key={leave.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{leave.leaveTypeName ?? "Leave"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(leave.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} → {new Date(leave.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} · <span className="font-medium">{leave.totalDays}d</span>
                      </p>
                      {leave.approverRemarks && <p className="text-xs text-muted-foreground/70 mt-1 italic truncate">"{leave.approverRemarks}"</p>}
                    </div>
                    <LeaveStatusBadge status={leave.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base flex items-center gap-2"><Megaphone className="h-4 w-4 text-primary" />{t('staffDash.announcements')}</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => navigate("/announcements")}>{t('staffDash.viewAll')} <ArrowRight className="h-3 w-3 ml-1" /></Button>
          </CardHeader>
          <CardContent>
            {data.announcements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Bell className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No announcements at this time</p>
              </div>
            ) : (
              <div className="space-y-2">
                {data.announcements.map(ann => (
                  <div key={ann.id} className="flex gap-3 p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                    <span className={`inline-block w-2 h-2 rounded-full shrink-0 mt-1.5 ${{ urgent: "bg-red-500", high: "bg-orange-500", medium: "bg-yellow-500", low: "bg-green-500" }[ann.priority?.toLowerCase()] ?? "bg-blue-400"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ann.title}</p>
                      {ann.content && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ann.content}</p>}
                      <p className="text-xs text-muted-foreground/60 mt-1">{new Date(ann.publishDate ?? ann.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                    </div>
                    <Badge variant="outline" className="shrink-0 capitalize text-[10px]">{ann.priority}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Teaching: My Classes ──────────────────────────────────────────────── */}
      {isTeachingRole && data.classAssignments.length > 0 && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" />{t('staffDash.myClasses')}</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => navigate("/my-classes")}>{t('staffDash.viewAll')} <ArrowRight className="h-3 w-3 ml-1" /></Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {data.classAssignments.map((a) => {
                const studentsPerClass = data.classAssignments.length > 0 ? Math.round(data.studentCount / data.classAssignments.length) : 0;
                const color = avatarColor(a.className);
                return (
                  <div key={a.assignmentId} className="p-4 rounded-xl border bg-card hover:shadow-md hover:border-primary/40 transition-all cursor-pointer group" onClick={() => navigate("/my-classes")}>
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold text-lg mb-3 group-hover:scale-110 transition-transform`}>{a.className.charAt(0)}</div>
                    <p className="font-bold text-sm">{a.className}</p>
                    {a.sectionName && <p className="text-xs text-muted-foreground">Section {a.sectionName}</p>}
                    {a.isClassTeacher && <Badge variant="secondary" className="mt-1.5 text-[10px] px-1.5 py-0.5">Class Teacher</Badge>}
                    <div className="flex items-center gap-1 mt-2"><Users className="h-3 w-3 text-muted-foreground" /><span className="text-xs text-muted-foreground">~{studentsPerClass} students</span></div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Teaching: Student Leave Requests ─────────────────────────────────── */}
      {isTeachingRole && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-primary" />Student Leave Requests</CardTitle></CardHeader>
          <CardContent className="pt-0"><StudentLeaveRequests compact /></CardContent>
        </Card>
      )}

      {/* ── Leadership: Pending Staff Leave Approvals ─────────────────────────── */}
      {group === "leadership" && (
        <PendingStaffLeaveCard leaves={data.staffLeaveQueue ?? []} totalCount={data.pendingStaffLeaves ?? 0} onActionComplete={handleRefresh} />
      )}

      {/* ── My Leave Overview ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" />My Leave Overview</CardTitle>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => navigate("/leave-management")}>Manage <ArrowRight className="h-3 w-3 ml-1" /></Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Submitted",  value: data.pendingLeaves + data.approvedLeaves + data.recentLeaves.filter(l => l.status === "Rejected").length, color: "text-blue-600",   bg: "bg-blue-50 dark:bg-blue-950/30",   border: "border-blue-100 dark:border-blue-900" },
              { label: "Pending Approval", value: data.pendingLeaves,  color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-100 dark:border-amber-900" },
              { label: "Approved",         value: data.approvedLeaves, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30", border: "border-green-100 dark:border-green-900" },
              { label: "Rejected",         value: data.recentLeaves.filter(l => l.status === "Rejected").length, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-100 dark:border-red-900" },
            ].map(({ label, value, color, bg, border }) => (
              <div key={label} className={`p-4 rounded-xl ${bg} border ${border} cursor-pointer hover:opacity-80 transition-opacity`} onClick={() => navigate("/leave-management")}>
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
