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
import { Calendar, CheckCircle2, Clock, Search, UserCheck, UserX, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { staffApi, type StaffBasic } from "@/services/api/staffApi";
import {
  attendanceApi,
  type StaffAttendanceStatus,
  type StaffAttendanceResponse,
} from "@/services/api/attendanceApi";
import { useAuth } from "@/contexts/AuthContext";

interface StaffAttendanceEntryUI {
  staffId: string;
  status: StaffAttendanceStatus | "none";
  remarks?: string;
}

const STATUS_OPTIONS: Array<{ value: StaffAttendanceStatus; label: string; color: string }> = [
  { value: "present", label: "Present", color: "bg-green-100 text-green-700" },
  { value: "late", label: "Late", color: "bg-amber-100 text-amber-700" },
  { value: "absent", label: "Absent", color: "bg-red-100 text-red-700" },
  { value: "leave", label: "On Leave", color: "bg-blue-100 text-blue-700" },
];

export function StaffAttendanceManager() {
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

  const schoolId = user?.schoolId;

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  async function loadAll() {
    setLoading(true);
    try {
      const [staffRes, attendanceRes] = await Promise.all([
        staffApi.list({ page: 1, pageSize: 500, status: "active" }),
        attendanceApi.getStaffAttendances({ date }),
      ]);

      const staffList = staffRes.staff ?? [];
      setStaff(staffList);

      const existingMap: Record<string, StaffAttendanceResponse> = {};
      const entryMap: Record<string, StaffAttendanceEntryUI> = {};

      for (const rec of attendanceRes ?? []) {
        existingMap[rec.staffId] = rec;
        entryMap[rec.staffId] = {
          staffId: rec.staffId,
          status: rec.status,
          remarks: rec.remarks,
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
      toast.error("Failed to load staff attendance data");
    } finally {
      setLoading(false);
    }
  }

  const filteredStaff = useMemo(() => {
    return staff.filter((s) => {
      const matchesSearch = `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase());
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

  async function saveAll() {
    if (!schoolId) {
      toast.error("Missing school context");
      return;
    }

    const toCreate = Object.values(entries).filter(
      (e) => e.status !== "none" && !existing[e.staffId]
    ) as Array<StaffAttendanceEntryUI & { status: StaffAttendanceStatus }>;

    if (toCreate.length === 0) {
      toast.info("No new attendance changes to save");
      return;
    }

    setSaving(true);
    try {
      await Promise.all(
        toCreate.map((e) =>
          attendanceApi.createStaffAttendance({
            schoolId,
            staffId: e.staffId,
            date,
            status: e.status,
            remarks: e.remarks,
          })
        )
      );

      toast.success(`Saved attendance for ${toCreate.length} staff members`);
      await loadAll();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to save attendance";
      toast.error(msg);
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
          <h1 className="text-2xl font-bold">Staff Attendance</h1>
          <p className="text-muted-foreground text-sm">Mark and save attendance for active staff members</p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
          <Button onClick={saveAll} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Attendance
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-bold">{summary.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Present</p><p className="text-2xl font-bold text-green-600">{summary.present}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Late</p><p className="text-2xl font-bold text-amber-600">{summary.late}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Absent</p><p className="text-2xl font-bold text-red-600">{summary.absent}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">On Leave</p><p className="text-2xl font-bold text-blue-600">{summary.leave}</p></CardContent></Card>
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
                placeholder="Search staff..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="sm:w-48"><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="late">Late</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
                <SelectItem value="leave">On Leave</SelectItem>
                <SelectItem value="none">Not Marked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Quick Mark</TableHead>
                  <TableHead>Remarks</TableHead>
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
                          <Badge variant="outline">Not marked</Badge>
                        ) : (
                          <Badge className={selected?.color}>{selected?.label}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          <Button size="sm" variant={entry.status === "present" ? "default" : "outline"} onClick={() => setStatus(s.id, "present")}><UserCheck className="h-3.5 w-3.5 mr-1" />Present</Button>
                          <Button size="sm" variant={entry.status === "late" ? "secondary" : "outline"} onClick={() => setStatus(s.id, "late")}><Clock className="h-3.5 w-3.5 mr-1" />Late</Button>
                          <Button size="sm" variant={entry.status === "absent" ? "destructive" : "outline"} onClick={() => setStatus(s.id, "absent")}><UserX className="h-3.5 w-3.5 mr-1" />Absent</Button>
                          <Button size="sm" variant={entry.status === "leave" ? "secondary" : "outline"} onClick={() => setStatus(s.id, "leave")}><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Leave</Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="Optional"
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
