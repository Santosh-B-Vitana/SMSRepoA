import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Users, UserCheck, Calendar, GraduationCap, Award, Loader2,
  RefreshCw, BookOpen, Bus, Home as HomeIcon, HeartPulse,
  Shield, Settings, MessageSquare, BarChart3, Clock,
  ChevronRight, Bell, AlertTriangle, CheckCircle2,
  IndianRupee, School, TrendingUp, TrendingDown,
  Megaphone, UserCog, Activity, ChevronDown, ChevronUp,
  Cake, MapPin, Trophy, CalendarDays, Sparkles,
  ExternalLink, X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { analyticsApi, DashboardSummaryResponse, AttendanceDayDataPoint } from "@/services/api/analyticsApi";
import { getBillingNotification } from "@/services/api/superAdminApi";
import { useAuth } from "@/contexts/AuthContext";
import { useSchool } from "@/contexts/SchoolContext";
import { toast } from "sonner";
import {
  AreaChart, Area, PieChart, Pie, Cell,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { AdminLeaveManagementEnhanced } from "@/components/leave/AdminLeaveManagementEnhanced";
import { StaffAttendanceTile } from "@/components/attendance/StaffAttendanceTile";
import { getFeeStats, getFeeRecords, FeeStats, FeeRecord } from "@/services/api/feeApi";
import { getExams, ExamBasic } from "@/services/api/examinationApi";
import { getUpcomingHolidays, HolidayBasic } from "@/services/api/holidayApi";
import { transportApi, TransportRoute } from "@/services/api/transportApi";
import { studentApi, StudentBasic } from "@/services/api/studentApi";
import {
  EnrollmentAnalyticsResponse,
  FeeAnalyticsResponse,
  ClassEnrollmentDto,
} from "@/services/api/analyticsApi";

// ─── helpers ──────────────────────────────────────────────────────────────────
function inr(n: number) {
  if (n >= 100000) return "Rs." + (n / 100000).toFixed(1) + "L";
  if (n >= 1000) return "Rs." + (n / 1000).toFixed(0) + "K";
  return "Rs." + n.toLocaleString("en-IN");
}
function inrFull(n: number) {
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

/** Collapse multiple fee records for the same student into a single aggregated row. */
function groupByStudent(records: FeeRecord[]): FeeRecord[] {
  const byStudent = new Map<string, FeeRecord>();
  for (const rec of records) {
    if (!byStudent.has(rec.studentId)) {
      byStudent.set(rec.studentId, { ...rec });
    } else {
      const existing = byStudent.get(rec.studentId)!;
      existing.totalAmount += rec.totalAmount;
      existing.pendingAmount += rec.pendingAmount;
      existing.paidAmount += rec.paidAmount;
      if (new Date(rec.dueDate) > new Date(existing.dueDate)) {
        existing.dueDate = rec.dueDate;
      }
    }
  }
  return [...byStudent.values()].sort((a, b) => b.pendingAmount - a.pendingAmount);
}

const TODAY = new Date();
const DATE_LABEL = TODAY.toLocaleDateString("en-IN", {
  weekday: "long", day: "numeric", month: "long", year: "numeric",
});

type AttPeriod = "7" | "30" | "90";
type FeeMonths = "3" | "6" | "12";

function buildAttendanceTrend(dailyData: AttendanceDayDataPoint[], todayPct: number, period: AttPeriod) {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  if (dailyData.length > 0) {
    return dailyData.map(d => {
      const dt = new Date(d.date);
      const label = period === "7"
        ? dayNames[dt.getDay()]
        : dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      return { day: label, pct: Math.round(Number(d.attendancePercentage)) };
    });
  }
  const todayLabel = dayNames[TODAY.getDay()];
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days.map(d => ({ day: d, pct: d === todayLabel ? Math.round(todayPct) : 0 }));
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; accent: string; accentBg: string; borderColor: string;
  trend?: "up" | "down" | "neutral"; trendLabel?: string; onClick?: () => void;
}
function KpiCard({ label, value, sub, icon: Icon, accent, accentBg, borderColor, trend, trendLabel, onClick }: KpiCardProps) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Activity;
  const trendColor = trend === "up" ? "text-emerald-600" : trend === "down" ? "text-rose-500" : "text-slate-400";
  return (
    <Card className={`relative overflow-hidden border-l-4 hover:shadow-md transition-all cursor-pointer group ${borderColor}`} onClick={onClick}>
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
            <TrendIcon className="h-3 w-3" />{trendLabel}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────
function AttTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-foreground mb-0.5">{label}</p>
      <p className="text-primary">{payload[0].value}% present</p>
    </div>
  );
}

// ─── Dialog helper ────────────────────────────────────────────────────────────
function statusBadge(status: string) {
  const s = status?.toLowerCase();
  const cls =
    s === "paid" ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
    s === "pending" ? "bg-amber-100 text-amber-700 border-amber-200" :
    s === "overdue" ? "bg-rose-100 text-rose-700 border-rose-200" :
    s === "partial" ? "bg-blue-100 text-blue-700 border-blue-200" :
    "bg-slate-100 text-slate-700 border-slate-200";
  return <Badge variant="outline" className={`text-[10px] capitalize ${cls}`}>{status}</Badge>;
}

// ─── Paginator ────────────────────────────────────────────────────────────────
function Paginator({ page, total, pageSize, onChange }: { page: number; total: number; pageSize: number; onChange: (p: number) => void }) {
  const { t } = useLanguage();
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-3 border-t mt-3">
      <p className="text-xs text-muted-foreground">{t('dashboard.showingResults')} {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} {t('dashboard.ofLabel')} {total}</p>
      <div className="flex gap-1">
        <Button variant="outline" size="sm" className="h-7 px-2 text-xs" disabled={page <= 1} onClick={() => onChange(page - 1)}>{t('dashboard.prevPage')}</Button>
        {Array.from({ length: Math.min(5, pages) }, (_, i) => {
          const p = pages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= pages - 2 ? pages - 4 + i : page - 2 + i;
          return (
            <Button key={p} variant={p === page ? "default" : "outline"} size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => onChange(p)}>{p}</Button>
          );
        })}
        <Button variant="outline" size="sm" className="h-7 px-2 text-xs" disabled={page >= pages} onClick={() => onChange(page + 1)}>{t('dashboard.nextPage')}</Button>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { schoolInfo } = useSchool();
  const { t } = useLanguage();

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t('dashboard.goodMorning');
    if (h < 17) return t('dashboard.goodAfternoon');
    return t('dashboard.goodEvening');
  };
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [attendanceData, setAttendanceData] = useState<AttendanceDayDataPoint[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showLeaveManagement, setShowLeaveManagement] = useState(false);
  // Chart period controls
  const [attPeriod, setAttPeriod] = useState<AttPeriod>("7");
  const [feeMonths, setFeeMonths] = useState<FeeMonths>("6");
  // Intelligence tile data
  const [feeAnalytics, setFeeAnalytics] = useState<FeeAnalyticsResponse | null>(null);
  const [feeAnalyticsLoading, setFeeAnalyticsLoading] = useState(false);
  const [feeStats, setFeeStats] = useState<FeeStats | null>(null);
  const [topDebtors, setTopDebtors] = useState<FeeRecord[]>([]);
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentAnalyticsResponse | null>(null);
  const [routes, setRoutes] = useState<TransportRoute[]>([]);
  const [upcomingExamList, setUpcomingExamList] = useState<ExamBasic[]>([]);
  const [upcomingHolidays, setUpcomingHolidays] = useState<HolidayBasic[]>([]);
  const [birthdayStudents, setBirthdayStudents] = useState<{ name: string; class: string; section: string; dob: Date }[]>([]);
  const [allStudentsForBirthday, setAllStudentsForBirthday] = useState<StudentBasic[]>([]);
  // Dialog states
  const [feeDialog, setFeeDialog] = useState(false);
  const [feeDialogPage, setFeeDialogPage] = useState(1);
  const [feeDialogData, setFeeDialogData] = useState<FeeRecord[]>([]);
  const [feeDialogTotal, setFeeDialogTotal] = useState(0);
  const [feeDialogLoading, setFeeDialogLoading] = useState(false);
  const [debtorDialog, setDebtorDialog] = useState(false);
  const [debtorDialogPage, setDebtorDialogPage] = useState(1);
  const [debtorDialogData, setDebtorDialogData] = useState<FeeRecord[]>([]);
  const [debtorDialogTotal, setDebtorDialogTotal] = useState(0);
  const [debtorDialogLoading, setDebtorDialogLoading] = useState(false);
  const [debtorAllRecords, setDebtorAllRecords] = useState<FeeRecord[]>([]);
  const [transportDialog, setTransportDialog] = useState(false);
  const [examDialog, setExamDialog] = useState(false);
  const [examDialogPage, setExamDialogPage] = useState(1);
  const [examDialogData, setExamDialogData] = useState<ExamBasic[]>([]);
  const [examDialogTotal, setExamDialogTotal] = useState(0);
  const [examDialogLoading, setExamDialogLoading] = useState(false);
  const [holidayDialog, setHolidayDialog] = useState(false);
  const [birthdayDialog, setBirthdayDialog] = useState(false);
  const [headcountDialog, setHeadcountDialog] = useState(false);
  const [classwiseFeeDialog, setClasswiseFeeDialog] = useState(false);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [data, attData] = await Promise.all([
        analyticsApi.getDashboardSummary(silent),
        analyticsApi.getAttendanceAnalytics(Number(attPeriod)).catch(() => ({
          dailyData: [] as AttendanceDayDataPoint[], totalDays: 0,
          averageAttendancePercentage: 0, highestAttendancePercentage: 0,
          lowestAttendancePercentage: 0, perfectAttendanceDays: 0,
        })),
      ]);
      setSummary(data);
      setAttendanceData(attData.dailyData ?? []);
      setLastUpdated(new Date());

      // Enrichment data (best-effort)
      const [feeAnal, feeSt, debtors, enroll, transportRes, examsRes, holidaysRes, studentsRes] =
        await Promise.allSettled([
          analyticsApi.getFeeAnalytics(Number(feeMonths)),
          getFeeStats(),
          getFeeRecords(1, 20, undefined, "pending"),
          analyticsApi.getEnrollmentAnalytics(),
          transportApi.getRoutes(1, 50),
          getExams({ status: "scheduled" }, 1, 10),
          getUpcomingHolidays(45),
          studentApi.list({ pageSize: 500, status: "active" }),
        ]);

      if (feeAnal.status === "fulfilled") setFeeAnalytics(feeAnal.value);
      if (feeSt.status === "fulfilled") setFeeStats(feeSt.value);
      if (debtors.status === "fulfilled") {
        const recs = (debtors.value.feeRecords ?? debtors.value.items ?? []) as FeeRecord[];
        setTopDebtors(groupByStudent(recs).slice(0, 5));
      }
      if (enroll.status === "fulfilled") setEnrollmentData(enroll.value);
      if (transportRes.status === "fulfilled") setRoutes(transportRes.value.routes ?? []);
      if (examsRes.status === "fulfilled") {
        const todayStr = new Date().toISOString().split("T")[0];
        const upcoming = (examsRes.value.items ?? []).filter((e: ExamBasic) => e.date >= todayStr);
        setUpcomingExamList(upcoming.slice(0, 8));
      }
      if (holidaysRes.status === "fulfilled") setUpcomingHolidays(holidaysRes.value ?? []);
      if (studentsRes.status === "fulfilled") {
        const all = studentsRes.value.students as StudentBasic[];
        setAllStudentsForBirthday(all);
        const today = new Date();
        const in7 = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        const allFull = studentsRes.value.students as unknown as {
          name: string; class: string; section: string; dateOfBirth?: string;
        }[];
        const bdays = allFull.filter(s => {
          if (!s.dateOfBirth) return false;
          const dob = new Date(s.dateOfBirth);
          const thisYear = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
          const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          return thisYear >= todayMidnight && thisYear <= in7;
        }).map(s => ({
          name: s.name, class: s.class, section: s.section,
          dob: new Date(s.dateOfBirth!),
        }));
        setBirthdayStudents(bdays);
      }
    } catch {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [attPeriod, feeMonths]);

  // Reload attendance when period changes (silent refresh)
  const loadAttendance = useCallback(async () => {
    try {
      const attData = await analyticsApi.getAttendanceAnalytics(Number(attPeriod));
      setAttendanceData(attData.dailyData ?? []);
    } catch { /* ignore */ }
  }, [attPeriod]);

  // Reload fee analytics when feeMonths changes
  const loadFeeAnalytics = useCallback(async () => {
    setFeeAnalyticsLoading(true);
    try {
      const fa = await analyticsApi.getFeeAnalytics(Number(feeMonths));
      setFeeAnalytics(fa);
    } catch { /* ignore */ } finally {
      setFeeAnalyticsLoading(false);
    }
  }, [feeMonths]);

  useEffect(() => { loadData(); }, [loadData]);
  // Period changes after mount — only re-fetch the specific piece
  useEffect(() => { if (!loading) loadAttendance(); }, [attPeriod]); // eslint-disable-line
  useEffect(() => { if (!loading) loadFeeAnalytics(); }, [feeMonths]); // eslint-disable-line

  // Billing expiry notification — fires once per session for admin
  useEffect(() => {
    const SESSION_KEY = "billing_notif_shown";
    if (sessionStorage.getItem(SESSION_KEY)) return;
    getBillingNotification()
      .then((notif) => {
        if (!notif.hasWarning) return;
        sessionStorage.setItem(SESSION_KEY, "1");
        if (notif.severity === "critical") {
          toast.error(notif.message, { duration: 8000, description: "Contact Vitana Group to renew your subscription." });
        } else {
          toast.warning(notif.message, { duration: 6000, description: "Contact Vitana Group to renew your subscription." });
        }
      })
      .catch(() => { /* silently ignore billing check failures */ });
  }, []); // eslint-disable-line

  // ── Dialog data loaders ────────────────────────────────────────────────────
  const openFeeDialog = useCallback(async (page = 1) => {
    setFeeDialog(true);
    setFeeDialogPage(page);
    setFeeDialogLoading(true);
    try {
      const r = await getFeeRecords(page, 12);
      const recs = (r.feeRecords ?? r.items ?? []) as FeeRecord[];
      setFeeDialogData(recs);
      setFeeDialogTotal(r.total ?? r.totalCount ?? 0);
    } catch { toast.error("Failed to load fee records"); } finally {
      setFeeDialogLoading(false);
    }
  }, []);

  const DEBTOR_PAGE_SIZE = 12;
  const openDebtorDialog = useCallback(async (page = 1) => {
    setDebtorDialog(true);
    setDebtorDialogPage(page);
    if (page === 1) {
      // Fetch all pending records in one shot so we can group by student
      setDebtorDialogLoading(true);
      try {
        const r = await getFeeRecords(1, 500, undefined, "pending");
        const raw = (r.feeRecords ?? r.items ?? []) as FeeRecord[];
        const grouped = groupByStudent(raw);
        setDebtorAllRecords(grouped);
        setDebtorDialogTotal(grouped.length);
        setDebtorDialogData(grouped.slice(0, DEBTOR_PAGE_SIZE));
      } catch { toast.error("Failed to load pending fees"); } finally {
        setDebtorDialogLoading(false);
      }
      return;
    }
    // Subsequent pages use the already-grouped cache
    const start = (page - 1) * DEBTOR_PAGE_SIZE;
    setDebtorDialogData(debtorAllRecords.slice(start, start + DEBTOR_PAGE_SIZE));
  }, [debtorAllRecords]);

  const openExamDialog = useCallback(async (page = 1) => {
    setExamDialog(true);
    setExamDialogPage(page);
    setExamDialogLoading(true);
    try {
      const r = await getExams({}, page, 12);
      setExamDialogData(r.items ?? []);
      setExamDialogTotal(r.totalCount ?? 0);
    } catch { toast.error("Failed to load exams"); } finally {
      setExamDialogLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="relative">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <School className="h-7 w-7 text-primary" />
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-primary absolute -top-1 -right-1" />
        </div>
        <p className="text-sm text-muted-foreground">{t('dashboard.loadingDashboard')}</p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <p className="text-sm text-muted-foreground">{t('dashboard.dataUnavailable')}</p>
        <button onClick={() => loadData()} className="text-sm text-primary underline">{t('dashboard.retry')}</button>
      </div>
    );
  }

  const s = summary;
  const attendancePct = Math.round(s.todayAttendancePercentage ?? 0);
  const attendanceTrend = buildAttendanceTrend(attendanceData, attendancePct, attPeriod);
  const pieCollected = feeAnalytics?.totalCollected ?? feeStats?.totalCollected ?? s.totalCollected ?? 0;
  const piePending = feeAnalytics?.totalPending ?? feeStats?.totalPending ?? s.pendingFees ?? 0;
  const feePieData = [
    { name: "Collected", value: pieCollected, fill: "hsl(var(--chart-2))" },
    { name: "Pending", value: piePending, fill: "hsl(var(--chart-5))" },
  ];

  const alerts: { type: "warn" | "ok" | "info"; text: string }[] = [];
  if (attendancePct > 0 && attendancePct < 85) alerts.push({ type: "warn", text: `${t('dashboard.alertAttendanceLow')} ${attendancePct}%` });
  if (s.pendingFees > 0) alerts.push({ type: "warn", text: `${inr(s.pendingFees)} ${t('dashboard.alertFeesPending')}` });
  if (s.upcomingExams > 0) alerts.push({ type: "info", text: `${s.upcomingExams} ${t('dashboard.alertExamsScheduled')}` });
  if (alerts.length === 0) alerts.push({ type: "ok", text: t('dashboard.alertAllOk') });

  return (
    <>
    <div className="space-y-6 animate-fade-in pb-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-primary/5 border-primary/20 text-primary">
              {t('dashboard.adminBadge')}
            </Badge>
            {schoolInfo?.boardAffiliation && (
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 text-muted-foreground">{schoolInfo.boardAffiliation}</Badge>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {getGreeting()}, {user?.name?.split(" ")[0] ?? t('dashboard.adminBadge')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {DATE_LABEL}{schoolInfo?.name ? ` · ${schoolInfo.name}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground hidden sm:block">
              {t('dashboard.updated')} {lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => loadData(true)} disabled={refreshing}>
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {t('dashboard.refresh')}
          </Button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <KpiCard
          label={t('dashboard.totalStudents')} value={s.totalStudents.toLocaleString()} sub={t('dashboard.activeEnrollment')}
          icon={Users} accent="text-blue-600" accentBg="bg-blue-50" borderColor="border-l-blue-500"
          trend="neutral" trendLabel={t('dashboard.enrolledThisYear')} onClick={() => navigate("/students")}
        />
        <KpiCard
          label={t('dashboard.teachingStaff')} value={s.totalStaff.toLocaleString()} sub={t('dashboard.activeMembers')}
          icon={UserCheck} accent="text-violet-600" accentBg="bg-violet-50" borderColor="border-l-violet-500"
          trend="neutral" trendLabel={t('dashboard.fullTimePartTime')} onClick={() => navigate("/staff")}
        />
        <KpiCard
          label={t('dashboard.attendanceToday')} value={attendancePct > 0 ? `${attendancePct}%` : "–"} sub={`${s.todayAbsentStudents} ${t('dashboard.absentLabel')}`}
          icon={Calendar}
          accent={attendancePct >= 90 ? "text-emerald-600" : attendancePct >= 80 ? "text-amber-600" : "text-rose-600"}
          accentBg={attendancePct >= 90 ? "bg-emerald-50" : attendancePct >= 80 ? "bg-amber-50" : "bg-rose-50"}
          borderColor={attendancePct >= 90 ? "border-l-emerald-500" : attendancePct >= 80 ? "border-l-amber-500" : "border-l-rose-500"}
          trend={attendancePct >= 90 ? "up" : attendancePct >= 80 ? "neutral" : "down"}
          trendLabel={attendancePct >= 90 ? t('dashboard.onTarget') : attendancePct >= 80 ? t('dashboard.nearTarget') : t('dashboard.belowTarget')}
          onClick={() => navigate("/students")}
        />
        <KpiCard
          label={t('dashboard.pendingFees')} value={inr(s.pendingFees)} sub={t('dashboard.duesOutstanding')}
          icon={IndianRupee} accent="text-rose-600" accentBg="bg-rose-50" borderColor="border-l-rose-500"
          trend={s.pendingFees === 0 ? "up" : "down"} trendLabel={s.pendingFees === 0 ? t('dashboard.allClear') : t('dashboard.actionNeeded')}
          onClick={() => navigate("/fees")}
        />
        <KpiCard
          label={t('dashboard.activeClasses')} value={s.totalClasses.toLocaleString()} sub={t('dashboard.standardsSections')}
          icon={GraduationCap} accent="text-indigo-600" accentBg="bg-indigo-50" borderColor="border-l-indigo-500"
          trend="neutral" trendLabel={t('dashboard.thisAcademicYear')} onClick={() => navigate("/academics")}
        />
        <KpiCard
          label={t('dashboard.examsLabel')} value={s.upcomingExams.toLocaleString()} sub={t('dashboard.next7Days')}
          icon={Award}
          accent={s.upcomingExams > 0 ? "text-amber-600" : "text-slate-500"}
          accentBg={s.upcomingExams > 0 ? "bg-amber-50" : "bg-slate-50"}
          borderColor={s.upcomingExams > 0 ? "border-l-amber-500" : "border-l-slate-300"}
          trend={s.upcomingExams > 0 ? "neutral" : "up"}
          trendLabel={s.upcomingExams > 0 ? t('dashboard.scheduled') : t('dashboard.noExamsThisWeek')}
          onClick={() => navigate("/examinations")}
        />
      </div>

      {/* Staff Attendance Banner */}
      <StaffAttendanceTile />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 pt-5 px-5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">{t('dashboard.attendanceTrend')}</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{t('dashboard.studentPresenceRate')}</p>
              </div>
              <Select value={attPeriod} onValueChange={(v) => setAttPeriod(v as AttPeriod)}>
                <SelectTrigger className="h-7 w-28 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">{t('dashboard.thisWeekFilter')}</SelectItem>
                  <SelectItem value="30">{t('dashboard.last30Days')}</SelectItem>
                  <SelectItem value="90">{t('dashboard.last3Months')}</SelectItem>
                </SelectContent>
              </Select>
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
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">{t('dashboard.feeOverview')}</CardTitle>
              <Select value={feeMonths} onValueChange={(v) => setFeeMonths(v as FeeMonths)}>
                <SelectTrigger className="h-7 w-24 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 months</SelectItem>
                  <SelectItem value="6">6 months</SelectItem>
                  <SelectItem value="12">12 months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">{t('dashboard.collectedVsPending')}</p>
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
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--chart-2))]" />{t('dashboard.collected')}</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--chart-5))]" />{t('dashboard.pendingCol')}</span>
            </div>
            <div className="mt-3 w-full border-t pt-3 space-y-1.5 px-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t('dashboard.outstandingDues')}</span>
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

      {/* ═══ School Intelligence Tiles ═══ */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('dashboard.schoolIntelligence')}</h2>
        </div>

        {/* Row 1: Fee Collection Overview + Transport Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Fee Collection Overview — 2 cols */}
          <Card className="lg:col-span-2 overflow-hidden hover:shadow-md transition-all">
            <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
            <CardHeader className="pb-2 pt-4 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <IndianRupee className="h-4 w-4 text-emerald-600" />
                  {t('dashboard.overallFeeCollection')}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={feeMonths} onValueChange={(v) => setFeeMonths(v as FeeMonths)}>
                    <SelectTrigger className="h-6 w-24 text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 months</SelectItem>
                      <SelectItem value="6">6 months</SelectItem>
                      <SelectItem value="12">12 months</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] text-primary hover:text-primary" onClick={() => openFeeDialog(1)}>
                    View All <ExternalLink className="h-2.5 w-2.5 ml-1" />
                  </Button>
                </div>
              </div>
              {feeAnalytics && (
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 rounded-xl p-3 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1">{t('dashboard.collected')}</p>
                    <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{inr(feeAnalytics.totalCollected)}</p>
                  </div>
                  <div className="bg-rose-50 dark:bg-rose-950/40 rounded-xl p-3 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400 mb-1">{t('dashboard.pendingCol')}</p>
                    <p className="text-xl font-bold text-rose-700 dark:text-rose-400">{inr(feeAnalytics.totalPending)}</p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-950/40 rounded-xl p-3 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400 mb-1">{t('dashboard.collectionRate')}</p>
                    <p className="text-xl font-bold text-blue-700 dark:text-blue-400">{feeAnalytics.collectionRate.toFixed(1)}%</p>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent className="px-3 pb-4">
              {feeAnalyticsLoading ? (
                <div className="h-[145px] flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">{t('dashboard.loadingLabel')}</p>
                </div>
              ) : feeAnalytics?.monthlyData?.length ? (
                <ResponsiveContainer width="100%" height={145}>
                  <BarChart data={feeAnalytics.monthlyData.slice(-6)} margin={{ top: 0, right: 5, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v: number) => inr(v)} />
                    <Tooltip formatter={(v: number, n: string) => [inr(v), n === "collected" ? "Collected" : "Pending"]} />
                    <Bar dataKey="collected" name="Collected" fill="#10b981" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="pending" name="Pending" fill="#f43f5e" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[145px] flex items-center justify-center">
                  <p className="text-xs text-muted-foreground">{t('dashboard.feeAnalyticsLoading')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transport Summary — 1 col */}
          <Card className="overflow-hidden hover:shadow-md transition-all">
            <div className="h-1.5 bg-gradient-to-r from-orange-500 to-amber-500" />
            <CardHeader className="pb-2 pt-4 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Bus className="h-4 w-4 text-orange-600" />
                  {t('dashboard.transportSummary')}
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] text-primary hover:text-primary" onClick={() => setTransportDialog(true)}>
                  View All <ExternalLink className="h-2.5 w-2.5 ml-1" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="bg-orange-50 dark:bg-orange-950/40 rounded-xl p-2.5 text-center">
                  <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">{routes.length}</p>
                  <p className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold uppercase tracking-wider">{t('dashboard.routes')}</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/40 rounded-xl p-2.5 text-center">
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{routes.reduce((s, r) => s + (r.studentsAssigned ?? 0), 0)}</p>
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider">{t('dashboard.studentsCol')}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <div className="space-y-2.5">
                {routes.slice(0, 5).map(r => (
                  <div key={r.id} className="flex items-center gap-2">
                    <MapPin className="h-3 w-3 text-orange-500 shrink-0" />
                    <span className="text-xs font-medium text-foreground truncate flex-1">{r.routeName}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="w-14 bg-orange-100 dark:bg-orange-900/40 rounded-full h-1.5">
                        <div
                          className="bg-orange-500 h-1.5 rounded-full"
                          style={{ width: `${Math.min(100, ((r.studentsAssigned ?? 0) / Math.max(r.capacity, 1)) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground w-10 text-right">{r.studentsAssigned ?? 0}/{r.capacity}</span>
                    </div>
                  </div>
                ))}
                {routes.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">{t('dashboard.noRoutesConfigured')}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row 2: Classwise Fees + Top Debtors + Head Count */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Classwise Fee Collections */}
          <Card className="overflow-hidden hover:shadow-md transition-all">
            <div className="h-1.5 bg-gradient-to-r from-violet-500 to-purple-600" />
            <CardHeader className="pb-2 pt-4 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-violet-600" />
                  {t('dashboard.classwiseFeeBalance')}
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] text-primary hover:text-primary" onClick={() => setClasswiseFeeDialog(true)}>
                  {t('dashboard.viewAll')} <ExternalLink className="h-2.5 w-2.5 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              {feeStats && Object.keys(feeStats.classwiseCollection).length > 0 ? (
                <div className="space-y-2.5">
                  {Object.entries(feeStats.classwiseCollection)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .slice(0, 7)
                    .map(([cls, amount], idx) => {
                      const maxVal = Math.max(...Object.values(feeStats.classwiseCollection) as number[]);
                      const pct = maxVal > 0 ? ((amount as number) / maxVal) * 100 : 0;
                      const colors = ["bg-violet-500", "bg-purple-500", "bg-indigo-500", "bg-blue-500", "bg-cyan-500", "bg-teal-500", "bg-green-500"];
                      return (
                        <div key={cls}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-foreground">{t('dashboard.classLabel')} {cls}</span>
                            <span className="text-muted-foreground font-semibold">{inr(amount as number)}</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-1.5 ${colors[idx % colors.length]} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6">{t('dashboard.noClasswiseData')}</p>
              )}
            </CardContent>
          </Card>

          {/* Top Students with Outstanding Balance */}
          <Card className="overflow-hidden hover:shadow-md transition-all">
            <div className="h-1.5 bg-gradient-to-r from-rose-500 to-pink-600" />
            <CardHeader className="pb-2 pt-4 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-rose-600" />
                  {t('dashboard.topOutstandingBalances')}
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] text-primary hover:text-primary" onClick={() => openDebtorDialog(1)}>
                  {t('dashboard.viewAll')} <ExternalLink className="h-2.5 w-2.5 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              {topDebtors.length > 0 ? (
                <div className="space-y-2.5">
                  {topDebtors.map((rec, idx) => (
                    <div key={rec.id} className="flex items-center gap-3">
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        idx === 0 ? "bg-rose-100 text-rose-700" :
                        idx === 1 ? "bg-orange-100 text-orange-700" :
                        idx === 2 ? "bg-amber-100 text-amber-700" :
                        "bg-slate-100 text-slate-600"
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{rec.studentName}</p>
                        <p className="text-[10px] text-muted-foreground">{t('dashboard.classLabel')} {rec.class}</p>
                      </div>
                      <span className="text-xs font-bold text-rose-600 shrink-0">{inr(rec.pendingAmount)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                  <p className="text-xs font-medium text-foreground">{t('dashboard.allDuesCleared')}</p>
                  <p className="text-[10px] text-muted-foreground">{t('dashboard.noOutstandingBalances')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Head Count by Class */}
          <Card className="overflow-hidden hover:shadow-md transition-all">
            <div className="h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600" />
            <CardHeader className="pb-2 pt-4 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  {t('dashboard.headCountByClass')}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {enrollmentData && (
                    <Badge variant="outline" className="text-[10px] border-blue-200 text-blue-600 bg-blue-50">
                      {enrollmentData.totalActiveStudents} {t('common.total')}
                    </Badge>
                  )}
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] text-primary hover:text-primary" onClick={() => setHeadcountDialog(true)}>
                    {t('dashboard.viewAll')} <ExternalLink className="h-2.5 w-2.5 ml-1" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-4">
              {enrollmentData?.byClass?.length ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart
                    data={enrollmentData.byClass.slice(0, 8).map(c => ({
                      name: c.className.replace(/class\s*/i, ""),
                      students: c.activeStudents,
                    }))}
                    layout="vertical"
                    margin={{ top: 0, right: 5, left: -5, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={38} />
                    <Tooltip formatter={(v: number) => [v, "Students"]} />
                    <Bar dataKey="students" fill="#3b82f6" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6">{t('dashboard.noEnrollmentData')}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Row 3: Upcoming Calendar + Birthday Students */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Upcoming Exams + Holidays — 2 cols */}
          <Card className="lg:col-span-2 overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />
            <CardHeader className="pb-2 pt-4 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-amber-600" />
                  {t('dashboard.upcomingCalendar')}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="flex gap-2 text-[10px] font-medium">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" /> {t('dashboard.examsLabel')}
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <span className="h-2 w-2 rounded-full bg-blue-500 inline-block" /> {t('dashboard.holidaysLabel')}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] text-primary hover:text-primary" onClick={() => openExamDialog(1)}>
                    {t('dashboard.allExams')} <ExternalLink className="h-2.5 w-2.5 ml-1" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] text-primary hover:text-primary" onClick={() => setHolidayDialog(true)}>
                    {t('dashboard.allHolidays')} <ExternalLink className="h-2.5 w-2.5 ml-1" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              {(() => {
                const todayStr = new Date().toISOString().split("T")[0];
                const events = [
                  ...upcomingExamList.map(e => ({
                    id: e.id, date: e.date,
                    title: e.name,
                    sub: [e.class, e.subject].filter(Boolean).join(" · "),
                    type: "exam" as const,
                    url: "/examinations",
                  })),
                  ...upcomingHolidays.map(h => ({
                    id: h.id, date: h.startDate,
                    title: h.name,
                    sub: `${h.type.charAt(0).toUpperCase()}${h.type.slice(1)} · ${h.durationDays} day${h.durationDays > 1 ? "s" : ""}`,
                    type: "holiday" as const,
                    url: "/holidays",
                  })),
                ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 10);

                if (!events.length) {
                  return (
                    <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                      <CalendarDays className="h-10 w-10 text-muted-foreground/30" />
                      <p className="text-xs text-muted-foreground">{t('dashboard.noUpcomingEvents')}</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-1.5">
                    {events.map(ev => {
                      const d = new Date(ev.date);
                      const daysFromNow = Math.ceil((d.getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24));
                      return (
                        <div
                          key={`${ev.type}-${ev.id}`}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
                          onClick={() => navigate(ev.url)}
                        >
                          <div className={`flex-none w-11 h-11 rounded-xl flex flex-col items-center justify-center text-white shadow-sm ${ev.type === "exam" ? "bg-amber-500" : "bg-blue-500"}`}>
                            <span className="text-[13px] font-bold leading-none">{d.toLocaleDateString("en-IN", { day: "2-digit" })}</span>
                            <span className="text-[9px] uppercase leading-none mt-0.5 opacity-90">{d.toLocaleDateString("en-IN", { month: "short" })}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">{ev.title}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{ev.sub}</p>
                          </div>
                          <Badge variant="outline" className={`text-[9px] shrink-0 font-semibold ${
                            daysFromNow === 0 ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:border-red-800" :
                            daysFromNow <= 3 ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800" :
                            "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900/40 dark:border-slate-700"
                          }`}>
                            {daysFromNow === 0 ? t('dashboard.todayLabel') : daysFromNow === 1 ? t('dashboard.tomorrowLabel') : `in ${daysFromNow}d`}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Birthday Students — 1 col */}
          <Card className="overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-pink-500 via-rose-500 to-red-400" />
            <CardHeader className="pb-2 pt-4 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Cake className="h-4 w-4 text-pink-600" />
                  {t('dashboard.birthdaysThisWeek')}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {birthdayStudents.length > 0 && (
                    <Badge className="text-[10px] bg-pink-100 text-pink-700 hover:bg-pink-100 border-0">
                      {birthdayStudents.length}
                    </Badge>
                  )}
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] text-primary hover:text-primary" onClick={() => setBirthdayDialog(true)}>
                    {t('dashboard.viewAll')} <ExternalLink className="h-2.5 w-2.5 ml-1" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              {birthdayStudents.length > 0 ? (
                <div className="space-y-2.5">
                  {birthdayStudents.slice(0, 7).map((s, i) => {
                    const today = new Date();
                    const dobThisYear = new Date(today.getFullYear(), s.dob.getMonth(), s.dob.getDate());
                    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                    const isToday = dobThisYear.getTime() === todayMidnight.getTime();
                    const age = today.getFullYear() - s.dob.getFullYear();
                    const initial = s.name.charAt(0).toUpperCase();
                    return (
                      <div
                        key={i}
                        className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${
                          isToday
                            ? "bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-800"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {initial}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {s.name}{isToday && " 🎂"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {s.class} {s.section} · {t('dashboard.turnsLabel')} {age}
                          </p>
                        </div>
                        {isToday && (
                          <Badge className="text-[9px] bg-pink-500 hover:bg-pink-500 border-0 shrink-0">{t('dashboard.todayBadge')}</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                  <div className="h-12 w-12 rounded-full bg-pink-50 dark:bg-pink-950/40 flex items-center justify-center">
                    <Cake className="h-6 w-6 text-pink-300" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">{t('dashboard.noBirthdaysThisWeek')}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{t('dashboard.upcomingBirthdaysAppear')}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Quick Actions */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('dashboard.quickActions')}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { labelKey: "dashboard.collectFee",    url: "/fees",       primary: false },
            { labelKey: "dashboard.addStudent",    url: "/students",   primary: false },
            { labelKey: "dashboard.addStaff",      url: "/staff",      primary: false },
            { labelKey: "dashboard.issueBook",     url: "/library",    primary: false },
            { labelKey: "dashboard.viewAnalytics", url: "/analytics",  primary: false },
          ].map(q => (
            <Button key={q.url} variant={q.primary ? "default" : "outline"} size="sm" onClick={() => navigate(q.url)}>
              {t(q.labelKey)}
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
                <CardTitle className="text-base">{t('dashboard.leaveManagementTitle')}</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{t('dashboard.leaveManagementDesc')}</p>
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
              <AdminLeaveManagementEnhanced defaultRequestType="staff" />
            </div>
          </CardContent>
        )}
      </Card>

    </div>

    {/* ═══════════════ DIALOGS ═══════════════ */}

    {/* Fee Records Dialog */}
    <Dialog open={feeDialog} onOpenChange={setFeeDialog}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-emerald-600" />
            All Fee Records
            <Button variant="ghost" size="sm" className="ml-auto h-7 px-2 text-xs" onClick={() => navigate("/fees")}>
              {t('dashboard.openFullPage')} <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-auto flex-1">
          {feeDialogLoading ? (
            <div className="flex items-center justify-center py-12 gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Loading…</span>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                <tr>
                  <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">{t('dashboard.studentCol')}</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">{t('dashboard.classCol')}</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">{t('dashboard.totalCol')}</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">{t('dashboard.paidCol')}</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">{t('dashboard.pendingCol')}</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">{t('dashboard.dueDateCol')}</th>
                  <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground">{t('dashboard.statusCol')}</th>
                </tr>
              </thead>
              <tbody>
                {feeDialogData.map((rec, i) => (
                  <tr key={rec.id} className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                    <td className="px-3 py-2.5 font-medium text-foreground">{rec.studentName}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{rec.class}</td>
                    <td className="px-3 py-2.5 text-right">{inrFull(rec.totalAmount)}</td>
                    <td className="px-3 py-2.5 text-right text-emerald-600 font-medium">{inrFull(rec.paidAmount)}</td>
                    <td className="px-3 py-2.5 text-right text-rose-600 font-semibold">{inrFull(rec.pendingAmount)}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{new Date(rec.dueDate).toLocaleDateString("en-IN")}</td>
                    <td className="px-3 py-2.5 text-center">{statusBadge(rec.status)}</td>
                  </tr>
                ))}
                {feeDialogData.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">{t('dashboard.noRecordsFound')}</td></tr>
                )}
              </tbody>
            </table>
          )}
          <Paginator page={feeDialogPage} total={feeDialogTotal} pageSize={12} onChange={(p) => openFeeDialog(p)} />
        </div>
      </DialogContent>
    </Dialog>

    {/* Outstanding Balances Dialog */}
    <Dialog open={debtorDialog} onOpenChange={setDebtorDialog}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-rose-600" />
            All Outstanding Fee Balances
            <Button variant="ghost" size="sm" className="ml-auto h-7 px-2 text-xs" onClick={() => navigate("/fees")}>
              {t('dashboard.openFullPage')} <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-auto flex-1">
          {debtorDialogLoading ? (
            <div className="flex items-center justify-center py-12 gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Loading…</span>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                <tr>
                  <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground w-8">#</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">{t('dashboard.studentCol')}</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">{t('dashboard.classCol')}</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">{t('dashboard.totalFeeCol')}</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-rose-600">{t('dashboard.pendingCol')}</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">{t('dashboard.dueDateCol')}</th>
                </tr>
              </thead>
              <tbody>
                {debtorDialogData.map((rec, idx) => (
                  <tr key={rec.id} className={`border-b border-border/50 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/10"}`}>
                    <td className="px-3 py-2.5">
                      <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                        idx === 0 ? "bg-rose-100 text-rose-700" : idx === 1 ? "bg-orange-100 text-orange-700" : idx === 2 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                      }`}>{(debtorDialogPage - 1) * 12 + idx + 1}</div>
                    </td>
                    <td className="px-3 py-2.5 font-medium text-foreground">{rec.studentName}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{rec.class}</td>
                    <td className="px-3 py-2.5 text-right">{inrFull(rec.totalAmount)}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-rose-600">{inrFull(rec.pendingAmount)}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{new Date(rec.dueDate).toLocaleDateString("en-IN")}</td>
                  </tr>
                ))}
                {debtorDialogData.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                    {t('dashboard.noOutstandingMsg')}
                  </td></tr>
                )}
              </tbody>
            </table>
          )}
          <Paginator page={debtorDialogPage} total={debtorDialogTotal} pageSize={12} onChange={(p) => openDebtorDialog(p)} />
        </div>
      </DialogContent>
    </Dialog>

    {/* Transport Routes Dialog */}
    <Dialog open={transportDialog} onOpenChange={setTransportDialog}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bus className="h-4 w-4 text-orange-600" />
            All Transport Routes
            <Button variant="ghost" size="sm" className="ml-auto h-7 px-2 text-xs" onClick={() => navigate("/transport")}>
              {t('dashboard.openFullPage')} <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-auto flex-1">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
              <tr>
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">{t('dashboard.routeCol')}</th>
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">{t('dashboard.vehicleCol')}</th>
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">{t('dashboard.driverCol')}</th>
                <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground">{t('dashboard.studentsCol')}</th>
                <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground">{t('dashboard.capacityCol')}</th>
                <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">{t('dashboard.monthlyFeeCol')}</th>
                <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground">{t('dashboard.statusCol')}</th>
              </tr>
            </thead>
            <tbody>
              {routes.map((r, i) => (
                <tr key={r.id} className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-foreground">{r.routeName}</div>
                    <div className="text-[10px] text-muted-foreground">#{r.routeNumber}</div>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{r.vehicleNumber ?? "—"}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{r.driverName ?? "—"}</td>
                  <td className="px-3 py-2.5 text-center font-semibold text-foreground">{r.studentsAssigned ?? 0}</td>
                  <td className="px-3 py-2.5 text-center text-muted-foreground">{r.capacity}</td>
                  <td className="px-3 py-2.5 text-right">{r.monthlyFee ? inrFull(r.monthlyFee) : "—"}</td>
                  <td className="px-3 py-2.5 text-center">{statusBadge(r.status)}</td>
                </tr>
              ))}
              {routes.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">{t('dashboard.noRoutesConfigured')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>

    {/* Examinations Dialog */}
    <Dialog open={examDialog} onOpenChange={setExamDialog}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-600" />
            All Examinations
            <Button variant="ghost" size="sm" className="ml-auto h-7 px-2 text-xs" onClick={() => navigate("/examinations")}>
              {t('dashboard.openFullPage')} <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-auto flex-1">
          {examDialogLoading ? (
            <div className="flex items-center justify-center py-12 gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Loading…</span>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                <tr>
                  <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">{t('dashboard.examNameCol')}</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">{t('dashboard.typeCol')}</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">{t('dashboard.classCol')}</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">{t('dashboard.subjectCol')}</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">{t('common.date')}</th>
                  <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground">Max Marks</th>
                  <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground">{t('dashboard.statusCol')}</th>
                </tr>
              </thead>
              <tbody>
                {examDialogData.map((ex, i) => {
                  const d = new Date(ex.date);
                  const todayStr = new Date().toISOString().split("T")[0];
                  const isUpcoming = ex.date >= todayStr;
                  return (
                    <tr key={ex.id} className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                      <td className="px-3 py-2.5 font-medium text-foreground">{ex.name}</td>
                      <td className="px-3 py-2.5 text-muted-foreground capitalize">{ex.examType ?? "—"}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{ex.class}{ex.section ? ` ${ex.section}` : ""}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{ex.subject}</td>
                      <td className="px-3 py-2.5">
                        <span className={isUpcoming ? "text-amber-600 font-semibold" : "text-muted-foreground"}>
                          {d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center text-foreground">{ex.maxMarks}</td>
                      <td className="px-3 py-2.5 text-center">{statusBadge(ex.status)}</td>
                    </tr>
                  );
                })}
                {examDialogData.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">{t('dashboard.noExamsFound')}</td></tr>
                )}
              </tbody>
            </table>
          )}
          <Paginator page={examDialogPage} total={examDialogTotal} pageSize={12} onChange={(p) => openExamDialog(p)} />
        </div>
      </DialogContent>
    </Dialog>

    {/* Holidays Dialog */}
    <Dialog open={holidayDialog} onOpenChange={setHolidayDialog}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-blue-600" />
            Upcoming Holidays (Next 45 days)
            <Button variant="ghost" size="sm" className="ml-auto h-7 px-2 text-xs" onClick={() => navigate("/holidays")}>
              {t('dashboard.openFullPage')} <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-auto flex-1 space-y-2 pr-1">
          {upcomingHolidays.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
              <CalendarDays className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No upcoming holidays in the next 45 days</p>
            </div>
          ) : upcomingHolidays.map(h => {
            const d = new Date(h.startDate);
            const todayStr = new Date().toISOString().split("T")[0];
            const daysFromNow = Math.ceil((new Date(h.startDate).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24));
            const typeColors: Record<string, string> = {
              national: "bg-blue-500", public: "bg-green-500",
              school: "bg-violet-500", optional: "bg-amber-500", regional: "bg-orange-500",
            };
            return (
              <div key={h.id} className="flex items-center gap-4 p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors">
                <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center text-white shadow-sm shrink-0 ${typeColors[h.type] ?? "bg-slate-500"}`}>
                  <span className="text-sm font-bold leading-none">{d.toLocaleDateString("en-IN", { day: "2-digit" })}</span>
                  <span className="text-[9px] uppercase leading-none mt-0.5 opacity-90">{d.toLocaleDateString("en-IN", { month: "short" })}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{h.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-[9px] capitalize">{h.type}</Badge>
                    <span className="text-[10px] text-muted-foreground">{h.durationDays} day{h.durationDays > 1 ? "s" : ""}</span>
                    {h.academicYear && <span className="text-[10px] text-muted-foreground">AY {h.academicYear}</span>}
                  </div>
                </div>
                <Badge variant="outline" className={`text-[9px] shrink-0 font-semibold ${
                  daysFromNow === 0 ? "bg-red-50 text-red-600 border-red-200" :
                  daysFromNow <= 7 ? "bg-amber-50 text-amber-700 border-amber-200" :
                  "bg-slate-50 text-slate-500 border-slate-200"
                }`}>
                  {daysFromNow === 0 ? t('dashboard.todayLabel') : daysFromNow === 1 ? t('dashboard.tomorrowLabel') : `in ${daysFromNow}d`}
                </Badge>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>

    {/* Birthday Dialog — All birthdays this month */}
    <Dialog open={birthdayDialog} onOpenChange={setBirthdayDialog}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cake className="h-4 w-4 text-pink-600" />
            Birthdays This Month
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-auto flex-1 space-y-1.5 pr-1">
          {(() => {
            const today = new Date();
            const thisMonth = today.getMonth();
            const thisYear = today.getFullYear();
            const monthBdays = (allStudentsForBirthday as unknown as { name: string; class: string; section: string; dateOfBirth?: string }[])
              .filter(s => {
                if (!s.dateOfBirth) return false;
                const dob = new Date(s.dateOfBirth);
                return dob.getMonth() === thisMonth;
              })
              .map(s => {
                const dob = new Date(s.dateOfBirth!);
                const thisYearDob = new Date(thisYear, dob.getMonth(), dob.getDate());
                const todayMidnight = new Date(thisYear, today.getMonth(), today.getDate());
                const daysFromNow = Math.ceil((thisYearDob.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
                return { ...s, dob, daysFromNow, age: thisYear - dob.getFullYear() };
              })
              .sort((a, b) => a.dob.getDate() - b.dob.getDate());

            if (monthBdays.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
                  <Cake className="h-10 w-10 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No birthdays this month</p>
                </div>
              );
            }

            return monthBdays.map((s, i) => {
              const isToday = s.daysFromNow === 0;
              const isPast = s.daysFromNow < 0;
              return (
                <div key={i} className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${
                  isToday ? "bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-800" :
                  isPast ? "opacity-50" : "hover:bg-muted/40"
                }`}>
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {s.name}{isToday && " 🎂"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{s.class} {s.section} · {t('dashboard.turnsLabel')} {s.age} on {s.dob.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</p>
                  </div>
                  {isToday && <Badge className="text-[9px] bg-pink-500 hover:bg-pink-500 border-0 shrink-0">{t('dashboard.todayBadge')}</Badge>}
                  {!isPast && !isToday && (
                    <span className="text-[10px] text-muted-foreground shrink-0">in {s.daysFromNow}d</span>
                  )}
                </div>
              );
            });
          })()}
        </div>
      </DialogContent>
    </Dialog>

    {/* Head Count Dialog */}
    <Dialog open={headcountDialog} onOpenChange={setHeadcountDialog}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            Student Head Count — All Classes
            <Button variant="ghost" size="sm" className="ml-auto h-7 px-2 text-xs" onClick={() => navigate("/students")}>
              {t('dashboard.openFullPage')} <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-auto flex-1">
          {enrollmentData ? (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-blue-50 dark:bg-blue-950/40 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{enrollmentData.totalActiveStudents}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">{t('common.active')}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">{enrollmentData.totalInactiveStudents}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t('common.inactive')}</p>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-950/40 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">{enrollmentData.totalClasses}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600">{t('dashboard.activeClasses')}</p>
                </div>
              </div>
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                  <tr>
                    <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">{t('dashboard.classCol')}</th>
                    <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground">{t('dashboard.totalCol')}</th>
                    <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground text-emerald-600">{t('common.active')}</th>
                    <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground">{t('dashboard.capacityCol')}</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Fill Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollmentData.byClass.map((c: ClassEnrollmentDto, i) => {
                    const fill = c.fillPercentage ?? (c.capacity ? (c.activeStudents / c.capacity) * 100 : 0);
                    return (
                      <tr key={c.classId} className={`border-b border-border/50 hover:bg-muted/30 ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                        <td className="px-3 py-2.5 font-medium text-foreground">{c.className}</td>
                        <td className="px-3 py-2.5 text-center">{c.totalStudents}</td>
                        <td className="px-3 py-2.5 text-center font-semibold text-emerald-600">{c.activeStudents}</td>
                        <td className="px-3 py-2.5 text-center text-muted-foreground">{c.capacity ?? "—"}</td>
                        <td className="px-3 py-2.5 min-w-[120px]">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className={`h-1.5 rounded-full ${fill >= 90 ? "bg-rose-500" : fill >= 70 ? "bg-amber-500" : "bg-blue-500"}`} style={{ width: `${Math.min(100, fill)}%` }} />
                            </div>
                            <span className="text-[10px] text-muted-foreground w-10 text-right">{fill > 0 ? fill.toFixed(0) + "%" : "—"}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          ) : (
            <div className="flex items-center justify-center py-12 gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{t('dashboard.loadingLabel')}</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Classwise Fee Dialog */}
    <Dialog open={classwiseFeeDialog} onOpenChange={setClasswiseFeeDialog}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-violet-600" />
            Classwise Fee Collection Summary
            <Button variant="ghost" size="sm" className="ml-auto h-7 px-2 text-xs" onClick={() => navigate("/fees")}>
              {t('dashboard.openFullPage')} <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-auto flex-1">
          {feeStats && Object.keys(feeStats.classwiseCollection).length > 0 ? (
            <>
              <div className="mb-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={Object.entries(feeStats.classwiseCollection)
                      .sort(([, a], [, b]) => (b as number) - (a as number))
                      .map(([cls, amount]) => ({ class: `Cl. ${cls}`, amount: amount as number }))}
                    margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="class" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v: number) => inr(v)} />
                    <Tooltip formatter={(v: number) => [inrFull(v), "Collected"]} />
                    <Bar dataKey="amount" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                  <tr>
                    <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">#</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">{t('dashboard.classCol')}</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">{t('dashboard.collected')}</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const total = Object.values(feeStats.classwiseCollection).reduce((s, v) => s + (v as number), 0);
                    return Object.entries(feeStats.classwiseCollection)
                      .sort(([, a], [, b]) => (b as number) - (a as number))
                      .map(([cls, amount], i) => (
                        <tr key={cls} className={`border-b border-border/50 hover:bg-muted/30 ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                          <td className="px-3 py-2.5 text-muted-foreground">{i + 1}</td>
                          <td className="px-3 py-2.5 font-medium text-foreground">{t('dashboard.classLabel')} {cls}</td>
                          <td className="px-3 py-2.5 text-right font-semibold text-violet-600">{inrFull(amount as number)}</td>
                          <td className="px-3 py-2.5 min-w-[100px]">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-1.5 bg-violet-500 rounded-full" style={{ width: `${total > 0 ? ((amount as number) / total) * 100 : 0}%` }} />
                              </div>
                              <span className="text-[10px] text-muted-foreground w-10 text-right">{total > 0 ? (((amount as number) / total) * 100).toFixed(1) : 0}%</span>
                            </div>
                          </td>
                        </tr>
                      ));
                  })()}
                </tbody>
              </table>
            </>
          ) : (
            <div className="flex items-center justify-center py-12 gap-2">
              <p className="text-sm text-muted-foreground">{t('dashboard.noClasswiseData')}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    </>
  );
}
