import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Plus, Search, Users, CalendarDays, History, ClipboardList, RefreshCw, CheckCircle2, XCircle, Clock, CalendarOff, TrendingUp, ChevronRight, ChevronLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { StaffForm } from "./StaffForm";
import { StaffList } from "./StaffList";
import { staffApi, StaffBasic as Staff, StaffStatsResponse } from "@/services/api/staffApi";
import { attendanceApi, StaffAttendanceResponse, StaffAttendanceStatus } from "@/services/api/attendanceApi";
import { LoadingState, EmptyState, ExportButton, ImportButton, ErrorBoundary } from "@/components/common";
import { useKeyboardShortcuts, CommonShortcuts } from "@/hooks/useKeyboardShortcuts";
import { AnimatedBackground } from "@/components/common/AnimatedBackground";
import { AnimatedWrapper } from "@/components/common/AnimatedWrapper";
import { ModernCard } from "@/components/common/ModernCard";
import { StaffAttendanceManager } from "@/components/attendance/StaffAttendanceManager";
import { AdvancedPagination } from "@/components/common/AdvancedPagination";
import { useCan } from "@/components/common/Can";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

export function StaffManager() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const canCreate = useCan("Staff", "Create");
  const [staff, setStaff] = useState<Staff[]>([]);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"directory" | "attendance">("directory");
  const [staffStats, setStaffStats] = useState<StaffStatsResponse | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSearch = useRef(search);

  // History state
  const [historyFrom, setHistoryFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [historyTo, setHistoryTo] = useState(new Date().toISOString().split("T")[0]);
  const [historyRecords, setHistoryRecords] = useState<StaffAttendanceResponse[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    CommonShortcuts.new(() => setIsAddDialogOpen(true)),
    CommonShortcuts.search(() => document.querySelector<HTMLInputElement>('input[placeholder*="Search"]')?.focus()),
  ]);

  const fetchPage = useCallback(async (opts: { page: number; pageSize: number; search: string; department: string }) => {
    try {
      const result = await staffApi.list({
        page: opts.page,
        pageSize: opts.pageSize,
        search: opts.search || undefined,
        department: opts.department !== "all" ? opts.department : undefined,
      });
      setStaff(result.staff);
      setTotal(result.total ?? 0);
    } catch (error) {
      console.error("Failed to fetch staff:", error);
      toast({ title: "Error", description: "Failed to load staff data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Load school-wide stats once
  useEffect(() => {
    staffApi.getStats().then(setStaffStats).catch(() => {});
  }, []);

  // Initial load and filter changes
  useEffect(() => {
    fetchPage({ page, pageSize, search, department: departmentFilter });
  }, [fetchPage, page, pageSize, departmentFilter]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    pendingSearch.current = value;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchPage({ page: 1, pageSize, search: pendingSearch.current, department: departmentFilter });
    }, SEARCH_DEBOUNCE_MS);
  }, [fetchPage, pageSize, departmentFilter]);

  const handleDepartmentChange = (v: string) => { setDepartmentFilter(v); setPage(1); };
  const handlePageChange = (p: number) => setPage(p);
  const handlePageSizeChange = (s: number) => { setPageSize(s); setPage(1); };

  const handleStaffSuccess = async () => {
    try {
      await fetchPage({ page, pageSize, search, department: departmentFilter });
      staffApi.getStats().then(setStaffStats).catch(() => {});
      setIsAddDialogOpen(false);
      setSelectedStaff(null);
    } catch (error) {
      console.error("Failed to refresh staff:", error);
    }
  };

  const getDepartments = () => {
    if (staffStats?.byDepartment) return Object.keys(staffStats.byDepartment).sort();
    return [...new Set(staff.map(s => s.department).filter(Boolean))].sort();
  };

  const getStaffStats = () => {
    return {
      total: staffStats?.totalStaff ?? total,
      active: staffStats?.activeStaff ?? staff.filter(s => s.status === 'active').length,
      inactive: staffStats?.inactiveStaff ?? staff.filter(s => s.status !== 'active').length,
      departments: staffStats ? Object.keys(staffStats.byDepartment ?? {}).length : getDepartments().length,
    };
  };

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const records = await attendanceApi.getStaffAttendances({ fromDate: historyFrom, toDate: historyTo });
      setHistoryRecords(
        (Array.isArray(records) ? records : []).sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )
      );
    } catch {
      setHistoryRecords([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyFrom, historyTo]);

  useEffect(() => {
    if (view === "attendance") loadHistory();
  }, [view, loadHistory]);

  const historySummary = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0, leave: 0 };
    historyRecords.forEach(r => { if (r.status in c) (c as Record<string, number>)[r.status]++; });
    return c;
  }, [historyRecords]);

  const staffHistorySummary = useMemo(() => {
    const map: Record<string, { present: number; absent: number; late: number; leave: number; total: number; dates: StaffAttendanceResponse[] }> = {};
    historyRecords.forEach(r => {
      if (!map[r.staffId]) map[r.staffId] = { present: 0, absent: 0, late: 0, leave: 0, total: 0, dates: [] };
      const s = r.status as StaffAttendanceStatus;
      if (s in map[r.staffId]) (map[r.staffId] as Record<string, number>)[s]++;
      map[r.staffId].total++;
      map[r.staffId].dates.push(r);
    });
    return map;
  }, [historyRecords]);

  function initials(name: string) {
    return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
  }

  const stats = getStaffStats();

  if (loading) {
    return <LoadingState variant="cards" message="Loading staff..." />;
  }

  return (
    <ErrorBoundary>
      <div className="relative min-h-screen">
        <AnimatedBackground variant="mesh" className="fixed inset-0 -z-10 opacity-30" />
        
        <div className="space-y-6 relative z-10">
          <AnimatedWrapper variant="fadeInUp" delay={0.05}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-display gradient-text">{t('staffMgmt.title')}</h1>
                <p className="text-muted-foreground mt-2">{t('staffMgmt.subtitle')}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {view === "directory" ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setView("attendance")}
                      className="gap-1.5 border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-400"
                    >
                      <CalendarDays className="h-4 w-4" />
                      Attendance
                    </Button>
                    <ImportButton
                      columns={[
                        { key: 'firstName', label: 'FirstName', required: true },
                        { key: 'lastName', label: 'LastName', required: true },
                        { key: 'email', label: 'Email', required: true },
                        { key: 'phone', label: 'Phone', required: true },
                        { key: 'department', label: 'Department', required: true },
                        { key: 'designation', label: 'Designation', required: true },
                        { key: 'joiningDate', label: 'JoiningDate', required: true },
                      ]}
                      apiTemplateUrl="/Staff/bulk-import/template"
                      apiImportUrl="/Staff/bulk-import/csv"
                      onImport={async (_data) => {
                        toast({ title: "Import Complete", description: "Staff imported successfully — login accounts created automatically" });
                        await fetchPage({ page: 1, pageSize, search, department: departmentFilter });
                        staffApi.getStats().then(setStaffStats).catch(() => {});
                      }}
                      templateFilename="staff_import_template"
                    />
                    <ExportButton
                      data={staff}
                      filename="staff"
                      apiExportUrl="/Staff/export"
                      columns={[
                        { key: 'name', label: 'Name' },
                        { key: 'email', label: 'Email' },
                        { key: 'phone', label: 'Phone' },
                        { key: 'department', label: 'Department' },
                        { key: 'designation', label: 'Designation' },
                        { key: 'status', label: 'Status' },
                      ]}
                    />
                    {canCreate && (
                    <Button className="gap-1.5" onClick={() => setIsAddDialogOpen(true)}>
                      <Plus className="h-4 w-4" />
                      {t('staffMgmt.addStaff')}
                    </Button>
                    )}
                  </>
                ) : (
                  <Button variant="outline" onClick={() => setView("directory")} className="gap-1.5">
                    <ChevronLeft className="h-4 w-4" />
                    Back to Directory
                  </Button>
                )}
              </div>
            </div>
          </AnimatedWrapper>

          {view === "directory" ? (
            <>
              <AnimatedWrapper variant="fadeInUp" delay={0.1}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <ModernCard variant="glass">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">{t('staff.totalStaff')}</p>
                          <p className="text-xl font-semibold">{stats.total}</p>
                        </div>
                      </div>
                    </CardContent>
                  </ModernCard>
                  <ModernCard variant="glass">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                          <Users className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">{t('common.active')}</p>
                          <p className="text-xl font-semibold">{stats.active}</p>
                        </div>
                      </div>
                    </CardContent>
                  </ModernCard>
                  <ModernCard variant="glass">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                          <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">{t('staff.departments')}</p>
                          <p className="text-xl font-semibold">{stats.departments}</p>
                        </div>
                      </div>
                    </CardContent>
                  </ModernCard>
                  <ModernCard variant="glass">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                          <Users className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">{t('common.inactive')}</p>
                          <p className="text-xl font-semibold">{stats.inactive}</p>
                        </div>
                      </div>
                    </CardContent>
                  </ModernCard>
                </div>
              </AnimatedWrapper>

              <AnimatedWrapper variant="fadeInUp" delay={0.15}>
                {/* Search + filter bar */}
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder={t('staffMgmt.searchPlaceholder') || 'Search staff by name, email, employee ID…'}
                      value={search}
                      onChange={e => handleSearchChange(e.target.value)}
                    />
                  </div>
                  <Select value={departmentFilter} onValueChange={handleDepartmentChange}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {getDepartments().map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {loading ? (
                  <LoadingState variant="cards" message="Loading staff..." />
                ) : staff.length === 0 ? (
                  <EmptyState title={t('staff.noStaffFound')} description={t('staff.noStaffDesc')} />
                ) : (
                  <>
                    <StaffList staff={staff} refreshStaff={handleStaffSuccess} />
                    <div className="mt-4">
                      <AdvancedPagination
                        currentPage={page}
                        pageSize={pageSize}
                        totalItems={total}
                        onPageChange={handlePageChange}
                        onPageSizeChange={handlePageSizeChange}
                        pageSizeOptions={[10, 20, 50, 100]}
                      />
                    </div>
                  </>
                )}
              </AnimatedWrapper>
            </>
          ) : (
            /* ── Attendance Management View ─────────────────────────────── */
            <AnimatedWrapper variant="fadeInUp" delay={0.05}>
              <Tabs defaultValue="mark" className="space-y-4">
                <TabsList className="h-9">
                  <TabsTrigger value="mark" className="gap-1.5 text-sm">
                    <ClipboardList className="h-4 w-4" />
                    Mark Attendance
                  </TabsTrigger>
                  <TabsTrigger value="history" className="gap-1.5 text-sm">
                    <History className="h-4 w-4" />
                    History &amp; Reports
                  </TabsTrigger>
                </TabsList>

                {/* ── Mark Attendance ────────────────────────────────────── */}
                <TabsContent value="mark" className="mt-0">
                  <StaffAttendanceManager />
                </TabsContent>

                {/* ── History & Reports ──────────────────────────────────── */}
                <TabsContent value="history" className="mt-0 space-y-4">
                  {/* Toolbar */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex flex-wrap items-end gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1 font-medium">From</p>
                          <Input type="date" className="h-9 w-38 text-sm" value={historyFrom}
                            max={historyTo} onChange={e => setHistoryFrom(e.target.value)} />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1 font-medium">To</p>
                          <Input type="date" className="h-9 w-38 text-sm" value={historyTo}
                            min={historyFrom} max={new Date().toISOString().split("T")[0]}
                            onChange={e => setHistoryTo(e.target.value)} />
                        </div>
                        <Button variant="outline" className="gap-1.5 h-9" onClick={loadHistory} disabled={historyLoading}>
                          {historyLoading
                            ? <><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Loading…</>
                            : <><RefreshCw className="h-4 w-4" />Refresh</>}
                        </Button>
                        <div className="ml-auto text-sm text-muted-foreground">
                          {historyRecords.length} records · {Object.keys(staffHistorySummary).length} staff
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Overall stats */}
                  {historyRecords.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {(
                        [
                          { key: "present" as const, label: "Present", icon: CheckCircle2, bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-700 dark:text-emerald-400", bar: "[&>div]:bg-emerald-500" },
                          { key: "absent"  as const, label: "Absent",  icon: XCircle,      bg: "bg-rose-50 dark:bg-rose-950/30",    border: "border-rose-200 dark:border-rose-800",    text: "text-rose-700 dark:text-rose-400",    bar: "[&>div]:bg-rose-500" },
                          { key: "late"    as const, label: "Late",    icon: Clock,        bg: "bg-amber-50 dark:bg-amber-950/30",  border: "border-amber-200 dark:border-amber-800",  text: "text-amber-700 dark:text-amber-400",  bar: "[&>div]:bg-amber-500" },
                          { key: "leave"   as const, label: "Leave",   icon: CalendarOff,  bg: "bg-blue-50 dark:bg-blue-950/30",    border: "border-blue-200 dark:border-blue-800",    text: "text-blue-700 dark:text-blue-400",    bar: "[&>div]:bg-blue-500" },
                        ]
                      ).map(({ key, label, icon: Icon, bg, border, text, bar }) => (
                        <Card key={key} className={`border ${border} ${bg}`}>
                          <CardContent className="p-4">
                            <div className={`flex items-center gap-2 mb-2 ${text}`}>
                              <Icon className="h-4 w-4" />
                              <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
                            </div>
                            <p className={`text-3xl font-bold leading-none ${text}`}>{historySummary[key]}</p>
                            <div className="mt-2">
                              <Progress
                                value={historyRecords.length > 0 ? (historySummary[key] / historyRecords.length) * 100 : 0}
                                className={`h-1.5 ${bar}`}
                              />
                              <p className="text-[11px] text-muted-foreground mt-1">
                                {historyRecords.length > 0
                                  ? Math.round((historySummary[key] / historyRecords.length) * 100)
                                  : 0}% of all records
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* Per-staff breakdown */}
                  <Card>
                    <CardHeader className="pb-3 pt-4 px-5">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Users className="h-4 w-4 text-violet-600" />
                        Per Staff Breakdown
                        <Badge variant="secondary" className="text-xs font-normal">
                          Click a row to see individual dates
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {historyLoading ? (
                        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          <span className="text-sm">Loading history…</span>
                        </div>
                      ) : historyRecords.length === 0 ? (
                        <div className="py-16 text-center">
                          <History className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                          <p className="text-sm font-medium text-muted-foreground">No attendance records in this date range</p>
                          <p className="text-xs text-muted-foreground/60 mt-1">Adjust dates and click Refresh</p>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="pl-5 text-xs">Staff Member</TableHead>
                              <TableHead className="text-center text-xs text-emerald-600">Present</TableHead>
                              <TableHead className="text-center text-xs text-rose-600">Absent</TableHead>
                              <TableHead className="text-center text-xs text-amber-600">Late</TableHead>
                              <TableHead className="text-center text-xs text-blue-600">Leave</TableHead>
                              <TableHead className="text-xs">Total Days</TableHead>
                              <TableHead className="pr-5 text-xs">Attendance Rate</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {staff
                              .filter(s => staffHistorySummary[s.id])
                              .sort((a, b) => {
                                const ra = staffHistorySummary[a.id];
                                const rb = staffHistorySummary[b.id];
                                const pctA = ra.total > 0 ? (ra.present + ra.late) / ra.total : 0;
                                const pctB = rb.total > 0 ? (rb.present + rb.late) / rb.total : 0;
                                return pctB - pctA;
                              })
                              .flatMap(s => {
                                const st = staffHistorySummary[s.id];
                                const name = (s as Staff & { name?: string }).name ?? `${s.firstName} ${s.lastName}`;
                                const presentPct = st.total > 0 ? Math.round(((st.present + st.late) / st.total) * 100) : 0;
                                const isExpanded = expandedStaffId === s.id;

                                const rows = [(
                                  <TableRow
                                    key={s.id}
                                    className="cursor-pointer hover:bg-muted/40 transition-colors"
                                    onClick={() => setExpandedStaffId(isExpanded ? null : s.id)}
                                  >
                                    <TableCell className="pl-5">
                                      <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8 shrink-0">
                                          {s.profilePhoto && <AvatarFallback className="text-xs">{initials(name)}</AvatarFallback>}
                                          <AvatarFallback className="text-[10px] bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                                            {initials(name)}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div>
                                          <p className="text-sm font-medium leading-tight">{name}</p>
                                          <p className="text-[11px] text-muted-foreground">{s.department} · {s.designation}</p>
                                        </div>
                                        <ChevronRight className={["h-4 w-4 text-muted-foreground/40 transition-transform ml-1", isExpanded ? "rotate-90" : ""].join(" ")} />
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <span className="text-sm font-bold text-emerald-600">{st.present}</span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <span className="text-sm font-bold text-rose-600">{st.absent}</span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <span className="text-sm font-bold text-amber-600">{st.late}</span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <span className="text-sm font-bold text-blue-600">{st.leave}</span>
                                    </TableCell>
                                    <TableCell>
                                      <span className="text-sm text-muted-foreground">{st.total} days</span>
                                    </TableCell>
                                    <TableCell className="pr-5">
                                      <div className="flex items-center gap-2 min-w-[120px]">
                                        <Progress
                                          value={presentPct}
                                          className={[
                                            "h-2 flex-1",
                                            presentPct >= 90 ? "[&>div]:bg-emerald-500"
                                              : presentPct >= 75 ? "[&>div]:bg-amber-500"
                                              : "[&>div]:bg-rose-500",
                                          ].join(" ")}
                                        />
                                        <span className={[
                                          "text-sm font-bold w-10 text-right shrink-0",
                                          presentPct >= 90 ? "text-emerald-600"
                                            : presentPct >= 75 ? "text-amber-600"
                                            : "text-rose-600",
                                        ].join(" ")}>
                                          {presentPct}%
                                        </span>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )];

                                if (isExpanded) {
                                  rows.push(
                                    <TableRow key={`${s.id}-expanded`} className="bg-muted/20">
                                      <TableCell colSpan={7} className="p-0">
                                        <div className="px-16 py-3">
                                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                            Individual Records
                                          </p>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                                            {st.dates.map(rec => {
                                              const statusColors: Record<string, string> = {
                                                present: "bg-emerald-100 text-emerald-700 border-emerald-200",
                                                absent:  "bg-rose-100 text-rose-700 border-rose-200",
                                                late:    "bg-amber-100 text-amber-700 border-amber-200",
                                                leave:   "bg-blue-100 text-blue-700 border-blue-200",
                                              };
                                              const statusIcons: Record<string, React.ElementType> = {
                                                present: CheckCircle2, absent: XCircle, late: Clock, leave: CalendarOff,
                                              };
                                              const Icon = statusIcons[rec.status] ?? CheckCircle2;
                                              const colorCls = statusColors[rec.status] ?? "bg-muted text-foreground border-border";
                                              return (
                                                <div key={rec.id} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs ${colorCls}`}>
                                                  <Icon className="h-3 w-3 shrink-0" />
                                                  <span className="font-medium">
                                                    {new Date(rec.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                                                  </span>
                                                  <span className="capitalize ml-auto opacity-80">{rec.status}</span>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  );
                                }

                                return rows;
                              })}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </AnimatedWrapper>
          )}
        </div>
      </div>

      {/* StaffForm renders its own full-screen overlay — mount outside the page layout */}
      {isAddDialogOpen && (
        <StaffForm
          staff={selectedStaff}
          onSuccess={handleStaffSuccess}
          onClose={() => { setIsAddDialogOpen(false); setSelectedStaff(null); }}
        />
      )}
    </ErrorBoundary>
  );
}
