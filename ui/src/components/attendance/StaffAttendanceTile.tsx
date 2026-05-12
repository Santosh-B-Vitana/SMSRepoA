/**
 * StaffAttendanceTile — Compact dashboard widget for quick staff attendance marking.
 * Features:
 * - Compact card fitting within the Charts row
 * - Sheet panel with 2 tabs: "Mark Today" and "History"
 * - Leave integration: approved leave auto-marks as Leave; pending shows indicator
 */

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  UserCheck, CheckCircle2, XCircle, Clock, CalendarOff,
  ChevronRight, CheckCheck, Save, Loader2, TrendingUp,
  History, ClipboardList, RefreshCw, AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { staffApi, StaffBasic } from "@/services/api/staffApi";
import {
  attendanceApi,
  StaffAttendanceStatus,
  StaffAttendanceResponse,
  CreateStaffAttendanceRequest,
} from "@/services/api/attendanceApi";
import leaveManagementApi, { LeaveRequest } from "@/services/api/leaveManagementApi";
import { useAuth } from "@/contexts/AuthContext";

// ─── helpers ─────────────────────────────────────────────────────────────────

type StatusKey = StaffAttendanceStatus;

interface RowState {
  staffId: string;
  status: StatusKey | null;
  existingId?: string;
  approvedLeave?: LeaveRequest;
  pendingLeave?: LeaveRequest;
  isLeaveReadOnly?: boolean;
}

const TODAY_ISO = new Date().toISOString().split("T")[0];

const STATUS_CONFIG: Record<
  StatusKey,
  { label: string; icon: React.ElementType; ring: string; bg: string; text: string }
> = {
  present: {
    label: "Present",
    icon: CheckCircle2,
    ring: "ring-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-400",
  },
  absent: {
    label: "Absent",
    icon: XCircle,
    ring: "ring-rose-500",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-700 dark:text-rose-400",
  },
  late: {
    label: "Late",
    icon: Clock,
    ring: "ring-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-400",
  },
  leave: {
    label: "Leave",
    icon: CalendarOff,
    ring: "ring-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-400",
  },
};

function initials(name: string) {
  return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
}

function daysAgoISO(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

// ─── StatusToggle ─────────────────────────────────────────────────────────────

interface StatusToggleProps {
  staffId: string;
  current: StatusKey | null;
  onChange: (staffId: string, status: StatusKey) => void;
  readonly?: boolean;
}

function StatusToggle({ staffId, current, onChange, readonly }: StatusToggleProps) {
  return (
    <div className="flex gap-1 flex-wrap">
      {(Object.entries(STATUS_CONFIG) as [StatusKey, (typeof STATUS_CONFIG)[StatusKey]][]).map(
        ([key, cfg]) => {
          const Icon = cfg.icon;
          const active = current === key;
          return (
            <button
              key={key}
              disabled={readonly}
              onClick={() => !readonly && onChange(staffId, key)}
              className={[
                "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all",
                "border ring-1 ring-transparent",
                active
                  ? `${cfg.bg} ${cfg.text} ring-1 ${cfg.ring} border-transparent shadow-sm`
                  : "bg-muted/50 text-muted-foreground hover:bg-muted border-border",
                readonly ? "opacity-60 cursor-default" : "",
              ].join(" ")}
            >
              <Icon className="h-3 w-3" />
              {cfg.label}
            </button>
          );
        }
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function StaffAttendanceTile() {
  const { user } = useAuth();
  const schoolId = user?.schoolId ?? "";

  const [open, setOpen] = useState(false);
  const [staffList, setStaffList] = useState<StaffBasic[]>([]);
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // History tab state
  const [historyFrom, setHistoryFrom] = useState(daysAgoISO(30));
  const [historyTo, setHistoryTo] = useState(TODAY_ISO);
  const [historyRecords, setHistoryRecords] = useState<StaffAttendanceResponse[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Summary stats (shown on the tile card)
  const [summary, setSummary] = useState<{
    total: number; present: number; absent: number; late: number; leave: number; unmarked: number;
  }>({ total: 0, present: 0, absent: 0, late: 0, leave: 0, unmarked: 0 });

  // ─── Load marking data (today) ─────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [staffRes, attRes, leaveRes] = await Promise.all([
        staffApi.list({ pageSize: 500 } as Parameters<typeof staffApi.list>[0]),
        attendanceApi.getStaffAttendances({ date: TODAY_ISO }),
        leaveManagementApi.getLeaveRequests(1, 200).catch(() => ({ items: [] as LeaveRequest[] })),
      ]);

      const activeStaff = (staffRes.staff ?? []).filter(s => s.status === "active");
      setStaffList(activeStaff);

      const attMap: Record<string, StaffAttendanceResponse> = {};
      (Array.isArray(attRes) ? attRes : []).forEach(r => { attMap[r.staffId] = r; });

      // Find leaves covering today
      const todayDate = new Date(TODAY_ISO);
      const todayLeaves = (leaveRes.items ?? []).filter(l => {
        const start = new Date(l.startDate);
        const end = new Date(l.endDate);
        return todayDate >= start && todayDate <= end && l.applicantType === "Staff";
      });
      const approvedMap: Record<string, LeaveRequest> = {};
      const pendingMap: Record<string, LeaveRequest> = {};
      todayLeaves.forEach(l => {
        if (l.status === "Approved") approvedMap[l.applicantId] = l;
        else if (l.status === "Pending") pendingMap[l.applicantId] = l;
      });

      const rows: Record<string, RowState> = {};
      activeStaff.forEach(s => {
        const existing = attMap[s.id];
        const approved = approvedMap[s.id];
        const pending = pendingMap[s.id];
        let status: StatusKey | null = existing ? (existing.status as StatusKey) : null;
        let isLeaveReadOnly = false;
        // Auto-apply approved leave if not yet marked
        if (!existing && approved) { status = "leave"; isLeaveReadOnly = true; }
        rows[s.id] = { staffId: s.id, status, existingId: existing?.id, approvedLeave: approved, pendingLeave: pending, isLeaveReadOnly };
      });
      setRowStates(rows);

      const counts = { present: 0, absent: 0, late: 0, leave: 0, unmarked: 0 };
      activeStaff.forEach(s => {
        const st = rows[s.id]?.status;
        if (!st) counts.unmarked++;
        else counts[st]++;
      });
      setSummary({ total: activeStaff.length, ...counts });
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Load history ──────────────────────────────────────────────────────────

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      // Fetch all staff attendance and filter by date range client-side
      // (API only supports single date; fetching all by omitting date param)
      const records = await attendanceApi.getStaffAttendances({});
      const from = new Date(historyFrom + "T00:00:00");
      const to = new Date(historyTo + "T23:59:59");
      const filtered = (Array.isArray(records) ? records : []).filter(r => {
        const d = new Date(r.date);
        return d >= from && d <= to;
      });
      setHistoryRecords(filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch {
      // non-fatal
    } finally {
      setHistoryLoading(false);
    }
  }, [historyFrom, historyTo]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { if (open) loadHistory(); }, [open, loadHistory]);

  // ─── Derived values ────────────────────────────────────────────────────────

  const departments = useMemo(() => {
    const set = new Set(staffList.map(s => s.department).filter(Boolean));
    return ["all", ...Array.from(set).sort()];
  }, [staffList]);

  const filteredStaff = useMemo(() => {
    const q = search.toLowerCase();
    return staffList.filter(s => {
      const nameMatch =
        !q ||
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
        s.department?.toLowerCase().includes(q) ||
        s.designation?.toLowerCase().includes(q);
      const deptMatch = deptFilter === "all" || s.department === deptFilter;
      return nameMatch && deptMatch;
    });
  }, [staffList, search, deptFilter]);

  const sheetCounts = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0, leave: 0, unmarked: 0 };
    Object.values(rowStates).forEach(r => {
      if (!r.status) c.unmarked++;
      else c[r.status]++;
    });
    return c;
  }, [rowStates]);

  const markedPct = summary.total
    ? Math.round(((summary.total - summary.unmarked) / summary.total) * 100)
    : 0;

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleStatusChange = (staffId: string, status: StatusKey) => {
    setRowStates(prev => ({
      ...prev,
      [staffId]: { ...prev[staffId], status },
    }));
  };

  const handleMarkAllPresent = () => {
    setRowStates(prev => {
      const updated = { ...prev };
      filteredStaff.forEach(s => {
        updated[s.id] = { ...updated[s.id], status: "present" };
      });
      return updated;
    });
  };

  const handleSave = async () => {
    const toCreate: CreateStaffAttendanceRequest[] = [];

    // Only create records that are not already saved (no existingId) and have a status
    Object.values(rowStates).forEach(row => {
      if (row.status && !row.existingId) {
        toCreate.push({
          schoolId: schoolId ?? "",
          staffId: row.staffId,
          date: TODAY_ISO,
          status: row.status,
        });
      }
    });

    if (toCreate.length === 0) {
      toast.info("No new records to save. All selected attendance has already been marked.");
      return;
    }

    setSaving(true);
    let succeeded = 0;
    let failed = 0;

    // Submit in parallel batches of 10
    const batchSize = 10;
    for (let i = 0; i < toCreate.length; i += batchSize) {
      const batch = toCreate.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(req => attendanceApi.createStaffAttendance(req))
      );
      results.forEach((r, idx) => {
        if (r.status === "fulfilled") {
          succeeded++;
          // Mark as saved so re-save doesn't duplicate
          const savedId = (r.value as StaffAttendanceResponse).id;
          setRowStates(prev => ({
            ...prev,
            [batch[idx].staffId]: { ...prev[batch[idx].staffId], existingId: savedId },
          }));
        } else {
          failed++;
        }
      });
    }

    setSaving(false);

    if (failed === 0) {
      toast.success(`Attendance saved for ${succeeded} staff member${succeeded !== 1 ? "s" : ""}`, {
        description: `${TODAY_ISO} — ${succeeded} records created`,
      });
    } else {
      toast.warning(`Saved ${succeeded}, failed ${failed}`, {
        description: "Some records could not be saved. Please retry.",
      });
    }

    // Refresh summary
    await loadData();
  };

  // ─── History stats ────────────────────────────────────────────────────────

  const [historyView, setHistoryView] = useState<"overview" | "detailed">("overview");
  const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);

  const historySummary = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0, leave: 0 };
    historyRecords.forEach(r => {
      if (r.status in c) (c as Record<string, number>)[r.status]++;
    });
    return c;
  }, [historyRecords]);

  // Per-staff breakdown: staffId → { present, absent, late, leave, total }
  const staffHistorySummary = useMemo(() => {
    const map: Record<string, { present: number; absent: number; late: number; leave: number; total: number }> = {};
    historyRecords.forEach(r => {
      if (!map[r.staffId]) map[r.staffId] = { present: 0, absent: 0, late: 0, leave: 0, total: 0 };
      const s = r.status as StatusKey;
      if (s in map[r.staffId]) (map[r.staffId] as Record<string, number>)[s]++;
      map[r.staffId].total++;
    });
    return map;
  }, [historyRecords]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Dashboard Banner (horizontal, full-width row) ────────────────── */}
      <Card
        className="relative overflow-hidden border border-violet-200 dark:border-violet-800 hover:shadow-md transition-all cursor-pointer group"
        onClick={() => setOpen(true)}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-violet-50/80 via-transparent to-transparent dark:from-violet-950/30 pointer-events-none" />
        <CardContent className="p-4 relative">
          <div className="flex flex-wrap items-center gap-4">

            {/* Icon + Title */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="p-2.5 rounded-xl bg-violet-100 dark:bg-violet-900/40">
                <UserCheck className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground leading-none mb-0.5">
                  Today's Staff Attendance
                </p>
                <p className="text-xl font-bold text-foreground leading-none">
                  {loading ? "—" : `${summary.total - summary.unmarked} / ${summary.total}`}
                  <span className="text-sm font-normal text-muted-foreground ml-1.5">marked</span>
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="flex-1 min-w-[120px]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-muted-foreground">
                  {loading ? "" : summary.unmarked === 0 ? "All staff marked ✓" : `${summary.unmarked} yet to mark`}
                </span>
                <span className="text-[11px] font-semibold text-violet-600">{markedPct}%</span>
              </div>
              <Progress value={markedPct} className="h-2 [&>div]:bg-violet-500" />
            </div>

            {/* Status pills */}
            {!loading && summary.total > 0 && (
              <div className="flex gap-2 flex-wrap shrink-0">
                {summary.present > 0 && (
                  <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{summary.present}</span>
                    <span className="text-[10px] text-emerald-600/70">Present</span>
                  </div>
                )}
                {summary.absent > 0 && (
                  <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg px-3 py-1.5">
                    <XCircle className="h-3.5 w-3.5 text-rose-600" />
                    <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">{summary.absent}</span>
                    <span className="text-[10px] text-rose-600/70">Absent</span>
                  </div>
                )}
                {summary.late > 0 && (
                  <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-1.5">
                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">{summary.late}</span>
                    <span className="text-[10px] text-amber-600/70">Late</span>
                  </div>
                )}
                {summary.leave > 0 && (
                  <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-1.5">
                    <CalendarOff className="h-3.5 w-3.5 text-blue-600" />
                    <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">{summary.leave}</span>
                    <span className="text-[10px] text-blue-600/70">Leave</span>
                  </div>
                )}
                {summary.unmarked > 0 && (
                  <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{summary.unmarked}</span>
                    <span className="text-[10px] text-slate-500/70">Unmarked</span>
                  </div>
                )}
              </div>
            )}

            {/* CTA button */}
            <Button
              size="sm"
              className="ml-auto shrink-0 bg-violet-600 hover:bg-violet-700 text-white gap-1.5 group-hover:shadow-sm"
              onClick={e => { e.stopPropagation(); setOpen(true); }}
            >
              <ClipboardList className="h-3.5 w-3.5" />
              {summary.unmarked > 0 ? "Mark Attendance" : "View / Edit"}
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Attendance Sheet ────────────────────────────────────────────────── */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0">
          {/* Sheet header */}
          <SheetHeader className="px-5 pt-5 pb-4 border-b shrink-0">
            <SheetTitle className="flex items-center gap-2 text-base">
              <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/40">
                <UserCheck className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              Staff Attendance
              <Badge variant="secondary" className="ml-1 text-xs font-normal">
                {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
              </Badge>
            </SheetTitle>
          </SheetHeader>

          {/* Tabs */}
          <Tabs defaultValue="mark" className="flex flex-col flex-1 overflow-hidden">
            <TabsList className="mx-5 mt-3 shrink-0 self-start h-8 p-0.5">
              <TabsTrigger value="mark" className="gap-1.5 text-xs h-7 px-3">
                <ClipboardList className="h-3.5 w-3.5" />
                Mark Today
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1.5 text-xs h-7 px-3">
                <History className="h-3.5 w-3.5" />
                History
              </TabsTrigger>
            </TabsList>

            {/* ── Mark Today Tab ─────────────────────────────────────────── */}
            <TabsContent value="mark" className="flex flex-col flex-1 overflow-hidden mt-0 data-[state=inactive]:hidden">
              {/* Today summary strip */}
              <div className="px-5 py-3 border-b shrink-0 bg-muted/20">
                <div className="flex items-center gap-4 flex-wrap">
                  {(
                    [
                      { label: "Present", count: sheetCounts.present, color: "text-emerald-600" },
                      { label: "Absent",  count: sheetCounts.absent,  color: "text-rose-600" },
                      { label: "Late",    count: sheetCounts.late,    color: "text-amber-600" },
                      { label: "Leave",   count: sheetCounts.leave,   color: "text-blue-600" },
                      { label: "Unmarked",count: sheetCounts.unmarked,color: "text-muted-foreground" },
                    ] as { label: string; count: number; color: string }[]
                  ).map(s => (
                    <div key={s.label} className="text-center">
                      <p className={`text-sm font-bold ${s.color}`}>{s.count}</p>
                      <p className="text-[10px] text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                  <div className="ml-auto text-center">
                    <p className="text-sm font-bold text-violet-600">
                      {staffList.length
                        ? Math.round(((staffList.length - sheetCounts.unmarked) / staffList.length) * 100)
                        : 0}%
                    </p>
                    <p className="text-[10px] text-muted-foreground">Marked</p>
                  </div>
                </div>
                <Progress
                  value={staffList.length ? ((staffList.length - sheetCounts.unmarked) / staffList.length) * 100 : 0}
                  className="h-1 mt-2 [&>div]:bg-violet-500"
                />
              </div>

              {/* Toolbar */}
              <div className="px-5 py-2.5 flex flex-wrap items-center gap-2 border-b shrink-0">
                <Input
                  placeholder="Search staff name, dept…"
                  className="h-8 text-sm flex-1 min-w-[180px]"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                <select
                  value={deptFilter}
                  onChange={e => setDeptFilter(e.target.value)}
                  className="h-8 text-sm border border-border rounded-md px-2 bg-background text-foreground min-w-[120px]"
                >
                  {departments.map(d => (
                    <option key={d} value={d}>{d === "all" ? "All Depts" : d}</option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-700"
                  onClick={handleMarkAllPresent}
                  disabled={saving}
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  All Present
                </Button>
              </div>

              {/* Staff list */}
              <ScrollArea className="flex-1">
                {loading ? (
                  <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Loading…</span>
                  </div>
                ) : filteredStaff.length === 0 ? (
                  <p className="py-16 text-center text-sm text-muted-foreground">No staff found.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {filteredStaff.map(staff => {
                      const row = rowStates[staff.id];
                      const currentStatus = row?.status ?? null;
                      const alreadySaved = !!row?.existingId;
                      const name = (staff as StaffBasic & { name?: string }).name ?? `${staff.firstName} ${staff.lastName}`;
                      const isReadOnly = !!row?.isLeaveReadOnly;

                      return (
                        <div
                          key={staff.id}
                          className={[
                            "px-5 py-3 transition-colors",
                            currentStatus ? STATUS_CONFIG[currentStatus].bg : "hover:bg-muted/30",
                          ].join(" ")}
                        >
                          <div className="flex items-start gap-3">
                            <Avatar className="h-9 w-9 shrink-0 mt-0.5">
                              {staff.profilePhoto && <AvatarImage src={staff.profilePhoto} alt={name} />}
                              <AvatarFallback className="text-xs font-semibold bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                                {initials(name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="text-sm font-semibold text-foreground truncate">{name}</span>
                                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                                  {staff.department}
                                </span>
                                {alreadySaved && (
                                  <Badge variant="outline" className="text-[10px] h-4 px-1 text-violet-600 border-violet-300">
                                    saved
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground mb-1.5">{staff.designation}</p>

                              {/* Leave indicators */}
                              {row?.approvedLeave && (
                                <div className="flex items-center gap-1.5 text-[11px] text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 rounded px-2 py-1 mb-1.5">
                                  <CalendarOff className="h-3 w-3 shrink-0" />
                                  Approved Leave — auto-marked as Leave
                                </div>
                              )}
                              {!row?.approvedLeave && row?.pendingLeave && (
                                <div className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded px-2 py-1 mb-1.5">
                                  <AlertCircle className="h-3 w-3 shrink-0" />
                                  Leave Requested — Awaiting Approval
                                </div>
                              )}

                              <StatusToggle
                                staffId={staff.id}
                                current={currentStatus}
                                onChange={handleStatusChange}
                                readonly={isReadOnly}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>

              {/* Footer */}
              <div className="px-5 py-3 border-t bg-muted/20 shrink-0 flex items-center justify-between gap-3">
                <div className="text-sm">
                  {sheetCounts.unmarked > 0 ? (
                    <span className="text-amber-600 font-medium">{sheetCounts.unmarked} not yet marked</span>
                  ) : (
                    <span className="text-emerald-600 font-medium flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5" />All marked
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={saving}>
                    Close
                  </Button>
                  <Button
                    size="sm"
                    className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving…</> : <><Save className="h-3.5 w-3.5" />Save Attendance</>}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* ── History Tab ────────────────────────────────────────────── */}
            <TabsContent value="history" className="flex flex-col flex-1 overflow-hidden mt-0 data-[state=inactive]:hidden">
              {/* Date range toolbar */}
              <div className="px-5 py-3 border-b shrink-0 flex flex-wrap items-end gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1 font-medium uppercase tracking-wide">From</p>
                  <Input type="date" className="h-8 text-sm w-36" value={historyFrom} max={historyTo}
                    onChange={e => setHistoryFrom(e.target.value)} />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1 font-medium uppercase tracking-wide">To</p>
                  <Input type="date" className="h-8 text-sm w-36" value={historyTo} min={historyFrom} max={TODAY_ISO}
                    onChange={e => setHistoryTo(e.target.value)} />
                </div>
                <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={loadHistory} disabled={historyLoading}>
                  {historyLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Refresh
                </Button>
                {/* Sub-view toggle */}
                <div className="ml-auto flex rounded-md border border-border overflow-hidden text-xs shrink-0">
                  <button
                    onClick={() => setHistoryView("overview")}
                    className={["px-3 py-1 font-medium transition-colors", historyView === "overview"
                      ? "bg-violet-600 text-white"
                      : "bg-background text-muted-foreground hover:bg-muted"].join(" ")}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setHistoryView("detailed")}
                    className={["px-3 py-1 font-medium transition-colors border-l border-border", historyView === "detailed"
                      ? "bg-violet-600 text-white"
                      : "bg-background text-muted-foreground hover:bg-muted"].join(" ")}
                  >
                    Detailed
                  </button>
                </div>
              </div>

              {historyLoading ? (
                <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground flex-1">
                  <Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm">Loading history…</span>
                </div>
              ) : historyRecords.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
                  <History className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No records in this date range</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Adjust the date range and click Refresh</p>
                </div>
              ) : historyView === "overview" ? (
                /* ─ Overview view ─────────────────────────────────────── */
                <ScrollArea className="flex-1">
                  {/* Overall stat cards */}
                  <div className="px-5 py-4 border-b bg-muted/10">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      Overall — {historyRecords.length} records across {Object.keys(staffHistorySummary).length} staff
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {(
                        [
                          { key: "present", label: "Present", bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", icon: CheckCircle2 },
                          { key: "absent",  label: "Absent",  bg: "bg-rose-100 dark:bg-rose-900/30",    text: "text-rose-700 dark:text-rose-400",    icon: XCircle },
                          { key: "late",    label: "Late",    bg: "bg-amber-100 dark:bg-amber-900/30",  text: "text-amber-700 dark:text-amber-400",  icon: Clock },
                          { key: "leave",   label: "Leave",   bg: "bg-blue-100 dark:bg-blue-900/30",   text: "text-blue-700 dark:text-blue-400",   icon: CalendarOff },
                        ] as { key: keyof typeof historySummary; label: string; bg: string; text: string; icon: React.ElementType }[]
                      ).map(({ key, label, bg, text, icon: Icon }) => (
                        <div key={key} className={`rounded-lg px-3 py-2 ${bg}`}>
                          <div className={`flex items-center gap-1.5 mb-0.5 ${text}`}>
                            <Icon className="h-3 w-3" />
                            <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
                          </div>
                          <p className={`text-xl font-bold leading-none ${text}`}>{historySummary[key]}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {historyRecords.length > 0
                              ? Math.round((historySummary[key] / historyRecords.length) * 100) + "%"
                              : "0%"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Per-staff breakdown table */}
                  <div className="px-5 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      Per Staff Breakdown
                    </p>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs pl-5">Staff</TableHead>
                        <TableHead className="text-xs text-center text-emerald-600">Present</TableHead>
                        <TableHead className="text-xs text-center text-rose-600">Absent</TableHead>
                        <TableHead className="text-xs text-center text-amber-600">Late</TableHead>
                        <TableHead className="text-xs text-center text-blue-600">Leave</TableHead>
                        <TableHead className="text-xs pr-5">Attendance Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staffList
                        .filter(s => staffHistorySummary[s.id])
                        .sort((a, b) => {
                          const ra = staffHistorySummary[a.id];
                          const rb = staffHistorySummary[b.id];
                          const pctA = ra.total > 0 ? (ra.present + ra.late) / ra.total : 0;
                          const pctB = rb.total > 0 ? (rb.present + rb.late) / rb.total : 0;
                          return pctB - pctA;
                        })
                        .map(staff => {
                          const st = staffHistorySummary[staff.id];
                          const name = (staff as StaffBasic & { name?: string }).name ?? `${staff.firstName} ${staff.lastName}`;
                          const presentPct = st.total > 0 ? Math.round(((st.present + st.late) / st.total) * 100) : 0;
                          const isExpanded = expandedStaffId === staff.id;

                          return (
                            <>
                              <TableRow
                                key={staff.id}
                                className="cursor-pointer hover:bg-muted/40"
                                onClick={() => setExpandedStaffId(isExpanded ? null : staff.id)}
                              >
                                <TableCell className="pl-5">
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-7 w-7 shrink-0">
                                      {staff.profilePhoto && <AvatarImage src={staff.profilePhoto} alt={name} />}
                                      <AvatarFallback className="text-[9px] bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                                        {initials(name)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="text-xs font-medium leading-tight truncate max-w-[110px]">{name}</p>
                                      <p className="text-[10px] text-muted-foreground">{staff.department}</p>
                                    </div>
                                    <ChevronRight className={["h-3 w-3 text-muted-foreground/50 transition-transform shrink-0", isExpanded ? "rotate-90" : ""].join(" ")} />
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <span className="text-xs font-semibold text-emerald-600">{st.present}</span>
                                </TableCell>
                                <TableCell className="text-center">
                                  <span className="text-xs font-semibold text-rose-600">{st.absent}</span>
                                </TableCell>
                                <TableCell className="text-center">
                                  <span className="text-xs font-semibold text-amber-600">{st.late}</span>
                                </TableCell>
                                <TableCell className="text-center">
                                  <span className="text-xs font-semibold text-blue-600">{st.leave}</span>
                                </TableCell>
                                <TableCell className="pr-5">
                                  <div className="flex items-center gap-2">
                                    <Progress
                                      value={presentPct}
                                      className={[
                                        "h-1.5 flex-1",
                                        presentPct >= 90 ? "[&>div]:bg-emerald-500"
                                          : presentPct >= 75 ? "[&>div]:bg-amber-500"
                                          : "[&>div]:bg-rose-500",
                                      ].join(" ")}
                                    />
                                    <span className={[
                                      "text-[11px] font-semibold w-8 text-right shrink-0",
                                      presentPct >= 90 ? "text-emerald-600"
                                        : presentPct >= 75 ? "text-amber-600"
                                        : "text-rose-600",
                                    ].join(" ")}>
                                      {presentPct}%
                                    </span>
                                  </div>
                                </TableCell>
                              </TableRow>

                              {/* Expanded: individual dates for this staff */}
                              {isExpanded && historyRecords
                                .filter(r => r.staffId === staff.id)
                                .map(rec => {
                                  const cfg = STATUS_CONFIG[rec.status as StatusKey];
                                  return (
                                    <TableRow key={rec.id} className="bg-muted/20">
                                      <TableCell className="pl-14 text-xs text-muted-foreground italic" colSpan={1}>
                                        {new Date(rec.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                                      </TableCell>
                                      <TableCell colSpan={4}>
                                        {cfg ? (
                                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.text}`}>
                                            <cfg.icon className="h-2.5 w-2.5" />{cfg.label}
                                          </span>
                                        ) : <span className="text-xs text-muted-foreground">{rec.status}</span>}
                                      </TableCell>
                                      <TableCell className="pr-5 text-xs text-muted-foreground">
                                        {rec.checkInTime ? String(rec.checkInTime).slice(0, 5) : "—"}
                                        {rec.checkOutTime ? ` – ${String(rec.checkOutTime).slice(0, 5)}` : ""}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                            </>
                          );
                        })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : (
                /* ─ Detailed view ──────────────────────────────────────── */
                <ScrollArea className="flex-1">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs pl-5">Date</TableHead>
                        <TableHead className="text-xs">Staff</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Check In</TableHead>
                        <TableHead className="text-xs">Check Out</TableHead>
                        <TableHead className="text-xs pr-5">Remarks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyRecords.map(rec => {
                        const staff = staffList.find(s => s.id === rec.staffId);
                        const name = staff
                          ? ((staff as StaffBasic & { name?: string }).name ?? `${staff.firstName} ${staff.lastName}`)
                          : rec.staffId.slice(0, 8) + "…";
                        const cfg = STATUS_CONFIG[rec.status as StatusKey];
                        return (
                          <TableRow key={rec.id}>
                            <TableCell className="text-xs font-medium whitespace-nowrap pl-5">
                              {new Date(rec.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "2-digit" })}
                            </TableCell>
                            <TableCell className="text-xs">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6 shrink-0">
                                  {staff?.profilePhoto && <AvatarImage src={staff.profilePhoto} alt={name} />}
                                  <AvatarFallback className="text-[9px] bg-violet-100 text-violet-700">{initials(name)}</AvatarFallback>
                                </Avatar>
                                <span className="truncate max-w-[120px]">{name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {cfg ? (
                                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.text}`}>
                                  <cfg.icon className="h-2.5 w-2.5" />{cfg.label}
                                </span>
                              ) : <span className="text-xs text-muted-foreground">{rec.status}</span>}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {rec.checkInTime ? String(rec.checkInTime).slice(0, 5) : "—"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {rec.checkOutTime ? String(rec.checkOutTime).slice(0, 5) : "—"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate pr-5">
                              {rec.remarks ?? "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </>
  );
}
