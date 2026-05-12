/**
 * StaffMyAttendance — Staff self-view attendance dashboard
 * View-only: shows present/absent/late/leave stats, monthly calendar grid, and record list.
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  CalendarCheck, TrendingUp, Clock, UserCheck, CalendarX,
  AlertCircle, ChevronLeft, ChevronRight, RefreshCw, Info,
  Award, CheckCircle2, XCircle, Calendar, BarChart2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { attendanceApi, type StaffAttendanceResponse, type StaffAttendanceStatus } from "@/services/api/attendanceApi";
import { AnimatedWrapper } from "@/components/common/AnimatedWrapper";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<StaffAttendanceStatus, {
  label: string; bg: string; text: string; border: string; dot: string; icon: typeof CheckCircle2;
}> = {
  present: { label: "Present", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500", icon: CheckCircle2 },
  absent:  { label: "Absent",  bg: "bg-rose-50",    text: "text-rose-700",    border: "border-rose-200",    dot: "bg-rose-500",    icon: XCircle },
  late:    { label: "Late",    bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",   dot: "bg-amber-500",   icon: Clock },
  leave:   { label: "Leave",   bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200",    dot: "bg-blue-500",    icon: CalendarX },
};

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", weekday: "short" });
}

function getMonthDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDow = first.getDay(); // 0=Sun
  const days: (number | null)[] = Array(startDow).fill(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(d);
  return days;
}

function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getWorkingDaysInMonth(year: number, month: number) {
  const last = new Date(year, month + 1, 0).getDate();
  let count = 0;
  for (let d = 1; d <= last; d++) {
    const dow = new Date(year, month, d).getDay();
    if (dow !== 0) count++; // exclude Sundays; adjust if school has Saturdays off too
  }
  return count;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, subtitle, color }: {
  icon: typeof CheckCircle2; label: string; value: number | string; subtitle?: string; color: string;
}) {
  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
            <p className="text-xs font-medium text-muted-foreground mt-0.5">{label}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Calendar month grid ──────────────────────────────────────────────────────

function MonthCalendar({
  year, month, statusMap,
}: {
  year: number; month: number; statusMap: Record<string, StaffAttendanceStatus>;
}) {
  const days = getMonthDays(year, month);
  const today = new Date().toISOString().split("T")[0];
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {DOW.map(d => (
          <div key={d} className="text-[10px] font-semibold text-muted-foreground text-center py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          if (!day) return <div key={`e${idx}`} />;
          const dateStr = isoDate(year, month, day);
          const status = statusMap[dateStr];
          const isToday = dateStr === today;
          const isFuture = dateStr > today;
          const dow = new Date(year, month, day).getDay();
          const isSunday = dow === 0;

          let bg = "bg-transparent";
          let text = "text-foreground";
          let title = "";

          if (isSunday) { bg = "bg-muted/40"; text = "text-muted-foreground/50"; }
          else if (status) {
            const cfg = STATUS_CONFIG[status];
            bg = cfg.bg; text = cfg.text; title = cfg.label;
          } else if (!isFuture && !isSunday) {
            bg = "bg-muted/20"; text = "text-muted-foreground/60";
          }

          return (
            <div
              key={dateStr}
              title={title || (isSunday ? "Sunday" : isFuture ? "Future" : "No record")}
              className={[
                "aspect-square flex items-center justify-center rounded-lg text-[11px] font-medium transition-all",
                bg, text,
                isToday ? "ring-2 ring-primary ring-offset-1" : "",
              ].join(" ")}
            >
              {day}
              {status && (
                <span className="sr-only">{STATUS_CONFIG[status].label}</span>
              )}
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t">
        {(Object.entries(STATUS_CONFIG) as [StaffAttendanceStatus, typeof STATUS_CONFIG[StaffAttendanceStatus]][]).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className={`w-2.5 h-2.5 rounded ${cfg.bg} border ${cfg.border}`} />
            {cfg.label}
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="w-2.5 h-2.5 rounded bg-muted/20 border border-border" />No record
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function StaffMyAttendance() {
  const { user } = useAuth();

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed

  const [records, setRecords] = useState<StaffAttendanceResponse[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch current year's attendance
  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const from = `${viewYear}-01-01`;
      const to = `${viewYear}-12-31`;
      const data = await attendanceApi.getMyAttendance({ fromDate: from, toDate: to });
      setRecords(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load attendance data");
    } finally {
      setLoading(false);
    }
  }, [viewYear]);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

  // Month navigation
  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // Status map for calendar
  const statusMap = useMemo(() => {
    const m: Record<string, StaffAttendanceStatus> = {};
    records.forEach(r => { m[r.date.split("T")[0]] = r.status; });
    return m;
  }, [records]);

  // Current month records
  const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
  const monthRecords = records.filter(r => r.date.startsWith(monthPrefix));

  // Yearly stats
  const yearStats = useMemo(() => {
    const s = { present: 0, absent: 0, late: 0, leave: 0, total: 0 };
    records.forEach(r => { s[r.status]++; s.total++; });
    const working = getWorkingDaysInMonth(viewYear, 0) * 12; // rough approx; real = actual working days
    const rate = s.total > 0 ? Math.round(((s.present + s.late) / s.total) * 100) : 0;
    return { ...s, rate, working };
  }, [records, viewYear]);

  // Month stats
  const monthStats = useMemo(() => {
    const s = { present: 0, absent: 0, late: 0, leave: 0 };
    monthRecords.forEach(r => { s[r.status]++; });
    const total = s.present + s.absent + s.late + s.leave;
    const rate = total > 0 ? Math.round(((s.present + s.late) / total) * 100) : 0;
    return { ...s, total, rate };
  }, [monthRecords]);

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      {/* Header */}
      <AnimatedWrapper variant="fadeInUp" delay={0.0}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold gradient-text">My Attendance</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your attendance record — view only
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(viewYear)} onValueChange={v => setViewYear(Number(v))}>
              <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1].map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={fetchAttendance} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />Refresh
            </Button>
          </div>
        </div>
      </AnimatedWrapper>

      {/* Yearly stat cards */}
      <AnimatedWrapper variant="fadeInUp" delay={0.05}>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          <StatCard icon={UserCheck} label="Present" value={yearStats.present}
            subtitle={`${viewYear} total`} color="bg-emerald-100 text-emerald-700" />
          <StatCard icon={XCircle} label="Absent" value={yearStats.absent}
            subtitle={`${viewYear} total`} color="bg-rose-100 text-rose-700" />
          <StatCard icon={Clock} label="Late" value={yearStats.late}
            subtitle={`${viewYear} total`} color="bg-amber-100 text-amber-700" />
          <StatCard icon={CalendarX} label="On Leave" value={yearStats.leave}
            subtitle={`${viewYear} total`} color="bg-blue-100 text-blue-700" />
          {/* Attendance rate card */}
          <Card className="col-span-2 sm:col-span-4 lg:col-span-1 hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold leading-none">{yearStats.rate}%</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Attendance rate</p>
                </div>
              </div>
              <Progress value={yearStats.rate} className="h-2" />
              <p className="text-[10px] text-muted-foreground mt-1">
                {yearStats.present + yearStats.late} of {yearStats.total} recorded days
              </p>
            </CardContent>
          </Card>
        </div>
      </AnimatedWrapper>

      {/* Month view */}
      <AnimatedWrapper variant="fadeInUp" delay={0.1}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Calendar */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{monthLabel}</CardTitle>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-48 flex items-center justify-center">
                  <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <MonthCalendar year={viewYear} month={viewMonth} statusMap={statusMap} />
              )}
            </CardContent>
          </Card>

          {/* Month summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Month Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-10 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : (
                <>
                  {(Object.entries(STATUS_CONFIG) as [StaffAttendanceStatus, typeof STATUS_CONFIG[StaffAttendanceStatus]][]).map(([key, cfg]) => {
                    const count = monthStats[key];
                    return (
                      <div key={key} className={`flex items-center gap-3 p-3 rounded-xl border ${cfg.bg} ${cfg.border}`}>
                        <cfg.icon className={`h-4 w-4 ${cfg.text}`} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className={`text-sm font-medium ${cfg.text}`}>{cfg.label}</span>
                            <span className={`text-xl font-bold ${cfg.text}`}>{count}</span>
                          </div>
                          {monthStats.total > 0 && (
                            <div className="mt-1">
                              <Progress
                                value={Math.round((count / monthStats.total) * 100)}
                                className="h-1"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <Separator />

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Attendance rate</span>
                    <span className={`font-bold text-base ${
                      monthStats.rate >= 90 ? "text-emerald-600" :
                      monthStats.rate >= 75 ? "text-amber-600" : "text-rose-600"
                    }`}>{monthStats.rate}%</span>
                  </div>
                  <Progress value={monthStats.rate} className="h-2" />

                  {monthStats.total === 0 && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
                      <Info className="h-3.5 w-3.5 shrink-0" />
                      No attendance records for this month
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </AnimatedWrapper>

      {/* Recent records table */}
      <AnimatedWrapper variant="fadeInUp" delay={0.15}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Records — {monthLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-10 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : monthRecords.length === 0 ? (
              <div className="text-center py-8">
                <CalendarCheck className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No records for {monthLabel}</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {[...monthRecords]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map(rec => {
                    const cfg = STATUS_CONFIG[rec.status];
                    return (
                      <div
                        key={rec.id}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${cfg.bg} ${cfg.border}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                        <span className="text-sm font-medium text-foreground flex-1">
                          {formatDate(rec.date.split("T")[0])}
                        </span>
                        {rec.checkInTime && (
                          <span className="text-xs text-muted-foreground">
                            In: {rec.checkInTime.slice(0, 5)}
                          </span>
                        )}
                        {rec.checkOutTime && (
                          <span className="text-xs text-muted-foreground">
                            Out: {rec.checkOutTime.slice(0, 5)}
                          </span>
                        )}
                        <Badge
                          variant="outline"
                          className={`text-[10px] h-5 px-2 ${cfg.bg} ${cfg.text} ${cfg.border}`}
                        >
                          {cfg.label}
                        </Badge>
                        {rec.remarks && (
                          <span className="text-xs text-muted-foreground truncate max-w-[120px]" title={rec.remarks}>
                            {rec.remarks}
                          </span>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </AnimatedWrapper>

      {/* Note */}
      <AnimatedWrapper variant="fadeInUp" delay={0.18}>
        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded-xl p-3 border">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            Your attendance is marked by the administration. This is a read-only view.
            For corrections or leave adjustments, please contact your HR or Principal.
          </span>
        </div>
      </AnimatedWrapper>
    </div>
  );
}
