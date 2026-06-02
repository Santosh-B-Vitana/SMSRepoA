import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, CheckCircle2, Clock, Search, UserCheck, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { staffApi, type StaffBasic } from "@/services/api/staffApi";
import {
  attendanceApi,
  type StaffAttendanceStatus,
  type StaffAttendanceResponse,
} from "@/services/api/attendanceApi";
import leaveManagementApi, { type LeaveType } from "@/services/api/leaveManagementApi";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

interface StaffAttendanceEntryUI {
  staffId: string;
  status: StaffAttendanceStatus | "none";
  remarks?: string;
  leaveTypeId?: string;
}

const STATUS_OPTIONS: Array<{ value: StaffAttendanceStatus; label: string; color: string }> = [
  { value: "present", label: "Present", color: "bg-green-100 text-green-700" },
  { value: "late", label: "Late", color: "bg-amber-100 text-amber-700" },
  { value: "absent", label: "Absent", color: "bg-red-100 text-red-700" },
  { value: "leave", label: "On Leave", color: "bg-blue-100 text-blue-700" },
];

export function StaffAttendanceManager() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [staff, setStaff] = useState<StaffBasic[]>([]);
  const [entries, setEntries] = useState<Record<string, StaffAttendanceEntryUI>>({});
  const [existing, setExisting] = useState<Record<string, StaffAttendanceResponse>>({});
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);

  const schoolId = user?.schoolId;

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  async function loadAll() {
    setLoading(true);
    try {
      // Use allSettled so a failed attendance fetch doesn't prevent staff from loading
      const [staffResult, attendanceResult, leaveTypesResult] = await Promise.allSettled([
        staffApi.list({ page: 1, pageSize: 500, status: "active" }),
        attendanceApi.getStaffAttendances({ date }),
        leaveManagementApi.getLeaveTypes("Staff"),
      ]);

      if (leaveTypesResult.status === "fulfilled") {
        setLeaveTypes(leaveTypesResult.value ?? []);
      }

      if (staffResult.status === "rejected") {
        toast.error(t('staffAtt.loadStaffError'));
        return;
      }

      const staffList = staffResult.value.staff ?? [];
      setStaff(staffList);

      const attendanceRecords: StaffAttendanceResponse[] =
        attendanceResult.status === "fulfilled" ? (attendanceResult.value ?? []) : [];

      const existingMap: Record<string, StaffAttendanceResponse> = {};
      const entryMap: Record<string, StaffAttendanceEntryUI> = {};

      for (const rec of attendanceRecords) {
        existingMap[rec.staffId] = rec;
        entryMap[rec.staffId] = {
          staffId: rec.staffId,
          status: rec.status,
          remarks: rec.remarks,
          leaveTypeId: rec.leaveTypeId,
        };
      }

      for (const s of staffList) {
        if (!entryMap[s.id]) {
          entryMap[s.id] = { staffId: s.id, status: "none" };
        }
      }

      setExisting(existingMap);
      setEntries(entryMap);
    } catch {
      toast.error(t('staffAtt.loadError'));
    } finally {
      setLoading(false);
    }
  }

  const filteredStaff = useMemo(() => {
    return staff.filter((s) => {
      const matchesSearch = `${s.firstName ?? ''} ${s.lastName ?? ''}`.toLowerCase().includes(search.toLowerCase());
      const matchesDept = deptFilter === "all" ? true : s.department === deptFilter;
      const entryStatus = entries[s.id]?.status ?? "none";
      const matchesStatus = statusFilter === "all" ? true : entryStatus === statusFilter;
      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [staff, search, deptFilter, statusFilter, entries]);

  const departments = useMemo(() => {
    return Array.from(new Set(staff.map((s) => s.department).filter(Boolean)));
  }, [staff]);

  function setStatus(staffId: string, status: StaffAttendanceStatus) {
    setEntries((prev) => ({
      ...prev,
      [staffId]: {
        ...(prev[staffId] ?? { staffId, status: "none" }),
        staffId,
        status,
      },
    }));
  }

  function setRemarks(staffId: string, remarks: string) {
    setEntries((prev) => ({
      ...prev,
      [staffId]: {
        ...(prev[staffId] ?? { staffId, status: "none" }),
        staffId,
        remarks,
      },
    }));
  }

  function setLeaveTypeId(staffId: string, leaveTypeId: string) {
    setEntries((prev) => ({
      ...prev,
      [staffId]: {
        ...(prev[staffId] ?? { staffId, status: "none" }),
        staffId,
        leaveTypeId,
      },
    }));
  }

  async function saveAll() {
    if (!schoolId) {
      toast.error("Missing school context");
      return;
    }

    const toCreate = Object.values(entries).filter(
      (e) => e.status !== "none" && !existing[e.staffId]
    ) as Array<StaffAttendanceEntryUI & { status: StaffAttendanceStatus }>;

    // Update records where status/leaveTypeId changed OR leave was never deducted
    const toUpdate = Object.values(entries).filter((e) => {
      const ex = existing[e.staffId];
      if (!ex || e.status === "none") return false;
      const statusChanged = e.status !== ex.status;
      const leaveTypeChanged = e.status === "leave" && e.leaveTypeId !== (ex.leaveTypeId ?? undefined);
      // Also re-send if leave was marked but balance was never deducted (e.g. record created before fix)
      const pendingDeduction = e.status === "leave" && ex.leaveDeducted === false && !!e.leaveTypeId;
      return statusChanged || leaveTypeChanged || pendingDeduction;
    }) as Array<StaffAttendanceEntryUI & { status: StaffAttendanceStatus }>;

    if (toCreate.length === 0 && toUpdate.length === 0) {
      toast.info(t('staffAtt.noChanges'));
      return;
    }

    setSaving(true);
    try {
      await Promise.all([
        ...toCreate.map((e) =>
          attendanceApi.createStaffAttendance({
            schoolId,
            staffId: e.staffId,
            date,
            status: e.status,
            remarks: e.remarks,
            leaveTypeId: e.status === "leave" ? e.leaveTypeId : undefined,
          })
        ),
        ...toUpdate.map((e) =>
          attendanceApi.updateStaffAttendance(existing[e.staffId].id, {
            status: e.status,
            remarks: e.remarks,
            leaveTypeId: e.status === "leave" ? e.leaveTypeId : undefined,
          })
        ),
      ]);

      const total = toCreate.length + toUpdate.length;
      toast.success(t('staffAtt.saveSuccess').replace('{n}', String(total)));
      await loadAll();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to save attendance";
      toast.error(msg || t('staffAtt.saveError'));
    } finally {
      setSaving(false);
    }
  }

  const summary = useMemo(() => {
    const values = Object.values(entries);
    const total = values.length;
    const present = values.filter((e) => e.status === "present").length;
    const late = values.filter((e) => e.status === "late").length;
    const absent = values.filter((e) => e.status === "absent").length;
    const leave = values.filter((e) => e.status === "leave").length;
    return { total, present, late, absent, leave };
  }, [entries]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('staffAtt.title')}</h1>
          <p className="text-muted-foreground text-sm">{t('staffAtt.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
          <Button onClick={saveAll} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {t('staffAtt.saveBtn')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{t('staffAtt.summary.total')}</p><p className="text-2xl font-bold">{summary.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{t('staffAtt.summary.present')}</p><p className="text-2xl font-bold text-green-600">{summary.present}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{t('staffAtt.summary.late')}</p><p className="text-2xl font-bold text-amber-600">{summary.late}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{t('staffAtt.summary.onLeave')}</p><p className="text-2xl font-bold text-blue-600">{summary.leave}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Mark Attendance
          </CardTitle>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <div className="relative sm:w-64">
              <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder={t('staffAtt.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="sm:w-48"><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('staffAtt.allDepts')}</SelectItem>
                {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('staffAtt.allStatus')}</SelectItem>
                <SelectItem value="present">{t('staffAtt.statusPresent')}</SelectItem>
                <SelectItem value="late">{t('staffAtt.statusLate')}</SelectItem>
                <SelectItem value="leave">{t('staffAtt.statusLeave')}</SelectItem>
                <SelectItem value="none">{t('staffAtt.notMarked')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('staffAtt.colStaff')}</TableHead>
                  <TableHead>{t('staffAtt.colDept')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead>{t('staffAtt.colQuickMark')}</TableHead>
                  <TableHead>{t('staffAtt.colRemarks')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.map((s) => {
                  const entry = entries[s.id] ?? { staffId: s.id, status: "none" as const };
                  const selected = STATUS_OPTIONS.find((o) => o.value === entry.status);
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{`${s.firstName} ${s.lastName}`.trim()}</TableCell>
                      <TableCell>{s.department || "-"}</TableCell>
                      <TableCell>
                        {entry.status === "none" ? (
                          <Badge variant="outline">{t('staffAtt.notMarkedBadge')}</Badge>
                        ) : (
                          <Badge className={selected?.color}>{selected?.label}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5 items-center">
                          <Button size="sm" variant={entry.status === "present" ? "default" : "outline"} onClick={() => setStatus(s.id, "present")}><UserCheck className="h-3.5 w-3.5 mr-1" />{t('staffAtt.statusPresent')}</Button>
                          <Button size="sm" variant={entry.status === "late" ? "secondary" : "outline"} onClick={() => setStatus(s.id, "late")}><Clock className="h-3.5 w-3.5 mr-1" />{t('staffAtt.statusLate')}</Button>
                          <Button size="sm" variant={entry.status === "leave" ? "secondary" : "outline"} onClick={() => setStatus(s.id, "leave")}><CheckCircle2 className="h-3.5 w-3.5 mr-1" />{t('staffAtt.statusLeave')}</Button>
                          {entry.status === "leave" && (
                            <Select value={entry.leaveTypeId ?? ""} onValueChange={(v) => setLeaveTypeId(s.id, v)}>
                              <SelectTrigger className="h-7 w-36 text-xs">
                                <SelectValue placeholder="Leave type" />
                              </SelectTrigger>
                              <SelectContent>
                                {leaveTypes.map((lt) => (
                                  <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder={t('staffAtt.remarkPlaceholder')}
                          value={entry.remarks ?? ""}
                          onChange={(e) => setRemarks(s.id, e.target.value)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
