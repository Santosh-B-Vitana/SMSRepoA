import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  CalendarDays, CheckCircle2, XCircle, Clock, AlertCircle,
  Edit2, Trash2, UserCheck, ChevronDown, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { attendanceApi } from "@/services/api/attendanceApi";

interface StudentAttendanceViewProps {
  studentId: string;
}

interface AttendanceRecord {
  id?: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  isManualOverride: boolean;
  remarks?: string;
}

type StatusFilter = 'all' | 'present' | 'absent' | 'late' | 'excused';

function computeStats(records: AttendanceRecord[]) {
  const presentDays = records.filter(r => r.status === 'present').length;
  const absentDays = records.filter(r => r.status === 'absent').length;
  const lateDays = records.filter(r => r.status === 'late').length;
  const excusedDays = records.filter(r => r.status === 'excused').length;
  const totalDays = records.length;
  const attendancePercent = totalDays > 0
    ? Math.round((presentDays + lateDays) / totalDays * 100)
    : 0;
  return { presentDays, absentDays, lateDays, excusedDays, totalDays, attendancePercent };
}

function groupByMonth(records: AttendanceRecord[]): [string, AttendanceRecord[]][] {
  const map = new Map<string, AttendanceRecord[]>();
  [...records]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .forEach(r => {
      const d = new Date(r.date);
      const key = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
  return Array.from(map.entries());
}

const STATUS_CONFIG = {
  present: {
    label: 'Present',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    row: 'border-l-emerald-400',
  },
  absent: {
    label: 'Absent',
    icon: <XCircle className="h-3.5 w-3.5" />,
    badge: 'bg-rose-100 text-rose-700 border-rose-200',
    row: 'border-l-rose-400',
  },
  late: {
    label: 'Late',
    icon: <Clock className="h-3.5 w-3.5" />,
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    row: 'border-l-amber-400',
  },
  excused: {
    label: 'Excused',
    icon: <AlertCircle className="h-3.5 w-3.5" />,
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    row: 'border-l-blue-400',
  },
} as const;

export default function StudentAttendanceView({ studentId }: StudentAttendanceViewProps) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newRecord, setNewRecord] = useState({
    date: new Date().toISOString().split('T')[0],
    status: 'present' as AttendanceRecord['status'],
    remarks: '',
  });
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);

  useEffect(() => { fetchAttendance(); }, [studentId]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const res = await attendanceApi.getStudentRecords(studentId);
      const mapped: AttendanceRecord[] = res.items.map((r: any) => ({
        id: r.id, date: r.date, status: r.status,
        isManualOverride: r.isManualOverride, remarks: r.remarks,
      }));
      setRecords(mapped);
    } catch {
      toast.error('Failed to load attendance records');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => computeStats(records), [records]);

  const filteredRecords = useMemo(
    () => statusFilter === 'all' ? records : records.filter(r => r.status === statusFilter),
    [records, statusFilter]
  );

  const monthGroups = useMemo(() => groupByMonth(filteredRecords), [filteredRecords]);

  const toggleMonth = (key: string) => {
    setCollapsedMonths(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleAddRecord = async () => {
    if (!newRecord.date) { toast.error('Please select a date'); return; }
    try {
      const res = await attendanceApi.markAttendance({
        studentId, date: newRecord.date, status: newRecord.status,
        remarks: newRecord.remarks || undefined, isManualOverride: true,
      });
      const added: AttendanceRecord = {
        id: res.id, date: res.date, status: res.status,
        isManualOverride: res.isManualOverride, remarks: res.remarks,
      };
      setRecords(prev => [added, ...prev]);
      setShowAddDialog(false);
      setNewRecord({ date: new Date().toISOString().split('T')[0], status: 'present', remarks: '' });
      toast.success('Attendance record added');
    } catch {
      toast.error('Failed to add attendance record');
    }
  };

  const handleEditRecord = async () => {
    if (!editingRecord?.id) { toast.error('Invalid record'); return; }
    try {
      const res = await attendanceApi.updateRecord(editingRecord.id, {
        status: editingRecord.status, remarks: editingRecord.remarks,
      });
      setRecords(prev => prev.map(r =>
        r.id === editingRecord.id ? { ...r, status: res.status, remarks: res.remarks } : r
      ));
      setEditingRecord(null);
      toast.success('Attendance record updated');
    } catch {
      toast.error('Failed to update attendance record');
    }
  };

  const handleDeleteRecord = async (record: AttendanceRecord) => {
    if (!record.id) { toast.error('Cannot delete record without ID'); return; }
    try {
      await attendanceApi.deleteRecord(record.id);
      setRecords(prev => prev.filter(r => r.id !== record.id));
      toast.success('Attendance record deleted');
    } catch {
      toast.error('Failed to delete attendance record');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-10 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading attendance records…</p>
        </CardContent>
      </Card>
    );
  }

  const pctColor = stats.attendancePercent >= 90
    ? 'text-emerald-600' : stats.attendancePercent >= 75
    ? 'text-amber-600' : 'text-rose-600';

  return (
    <div className="space-y-4">

      {/* Stats Header */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Attendance Overview
            </p>
            <span className={`text-2xl font-bold ${pctColor}`}>
              {stats.attendancePercent}%
            </span>
          </div>
          <Progress value={stats.attendancePercent} className="h-2 mb-4" />
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
              <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{stats.presentDays}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">Present</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30">
              <p className="text-xl font-bold text-rose-700 dark:text-rose-400">{stats.absentDays}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-600">Absent</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30">
              <p className="text-xl font-bold text-amber-700 dark:text-amber-400">{stats.lateDays}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600">Late</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
              <p className="text-xl font-bold text-slate-700 dark:text-slate-300">{stats.totalDays}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Total</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4" />
              Attendance History
            </CardTitle>
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              + Add Record
            </Button>
          </div>
          {/* Status filter pills */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {(['all', 'present', 'absent', 'late', 'excused'] as StatusFilter[]).map(f => {
              const active = statusFilter === f;
              const cfg = f !== 'all' ? STATUS_CONFIG[f] : null;
              return (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={[
                    'px-3 py-1 rounded-full text-xs font-medium border transition-all',
                    active
                      ? f === 'all'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : `${cfg!.badge} border-current`
                      : 'bg-background text-muted-foreground border-border hover:bg-muted',
                  ].join(' ')}
                >
                  {f === 'all'
                    ? `All (${records.length})`
                    : `${STATUS_CONFIG[f].label} (${records.filter(r => r.status === f).length})`}
                </button>
              );
            })}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {filteredRecords.length === 0 ? (
            <div className="text-center py-12">
              <UserCheck className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No records found</p>
              {statusFilter !== 'all' && (
                <button onClick={() => setStatusFilter('all')} className="text-xs text-primary hover:underline mt-1">
                  Clear filter
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {monthGroups.map(([month, monthRecords]) => {
                const collapsed = collapsedMonths.has(month);
                const mStats = computeStats(monthRecords);
                return (
                  <div key={month}>
                    <button
                      onClick={() => toggleMonth(month)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-muted/60 hover:bg-muted transition-colors mb-2"
                    >
                      <div className="flex items-center gap-2">
                        {collapsed
                          ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                          : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                        <span className="text-sm font-semibold text-foreground">{month}</span>
                        <span className="text-xs text-muted-foreground">
                          ({monthRecords.length} day{monthRecords.length !== 1 ? 's' : ''})
                        </span>
                      </div>
                      <div className="flex gap-2 text-xs">
                        {mStats.presentDays > 0 && <span className="text-emerald-600 font-medium">{mStats.presentDays}P</span>}
                        {mStats.absentDays > 0 && <span className="text-rose-600 font-medium">{mStats.absentDays}A</span>}
                        {mStats.lateDays > 0 && <span className="text-amber-600 font-medium">{mStats.lateDays}L</span>}
                        <span className="text-muted-foreground font-medium">{mStats.attendancePercent}%</span>
                      </div>
                    </button>

                    {!collapsed && (
                      <div className="space-y-1 pl-1">
                        {monthRecords.map((record, idx) => {
                          const cfg = STATUS_CONFIG[record.status] ?? STATUS_CONFIG.present;
                          const d = new Date(record.date);
                          const dayName = d.toLocaleDateString('en-IN', { weekday: 'short' });
                          const dayNum = d.getDate();
                          return (
                            <div
                              key={record.id ?? idx}
                              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border-l-[3px] bg-background hover:bg-muted/40 transition-colors ${cfg.row}`}
                            >
                              <div className="w-10 shrink-0 text-center">
                                <p className="text-[10px] font-semibold uppercase text-muted-foreground leading-none">{dayName}</p>
                                <p className="text-lg font-bold text-foreground leading-tight">{dayNum}</p>
                              </div>
                              <Badge variant="outline" className={`flex items-center gap-1 text-xs ${cfg.badge} shrink-0`}>
                                {cfg.icon}{cfg.label}
                              </Badge>
                              <span className="text-xs text-muted-foreground shrink-0">
                                {record.isManualOverride ? 'Admin' : 'Class Teacher'}
                              </span>
                              <span className="text-xs text-muted-foreground flex-1 truncate">
                                {record.remarks || ''}
                              </span>
                              <div className="flex gap-1 shrink-0">
                                <button
                                  onClick={() => setEditingRecord(record)}
                                  className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteRecord(record)}
                                  className="p-1.5 rounded hover:bg-rose-50 text-muted-foreground hover:text-rose-600 transition-colors"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Record Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Attendance Record</DialogTitle>
            <DialogDescription>Manually record attendance for this student</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                value={newRecord.date}
                onChange={e => setNewRecord({ ...newRecord, date: e.target.value })}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <div className="grid grid-cols-2 gap-2">
                {(['present', 'absent', 'late', 'excused'] as const).map(s => {
                  const cfg = STATUS_CONFIG[s];
                  return (
                    <button
                      key={s}
                      onClick={() => setNewRecord({ ...newRecord, status: s })}
                      className={[
                        'flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all',
                        newRecord.status === s ? `${cfg.badge} border-current` : 'border-border text-muted-foreground hover:bg-muted',
                      ].join(' ')}
                    >
                      {cfg.icon}{cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Remarks <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <textarea
                value={newRecord.remarks}
                onChange={e => setNewRecord({ ...newRecord, remarks: e.target.value })}
                placeholder="Enter reason or notes…"
                className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none h-20"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button size="sm" onClick={handleAddRecord}>Add Record</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Record Dialog */}
      <Dialog open={!!editingRecord} onOpenChange={open => { if (!open) setEditingRecord(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Attendance Record</DialogTitle>
            <DialogDescription>
              {editingRecord && new Date(editingRecord.date).toLocaleDateString('en-IN', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              })}
            </DialogDescription>
          </DialogHeader>
          {editingRecord && (
            <div className="space-y-4 pt-1">
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['present', 'absent', 'late', 'excused'] as const).map(s => {
                    const cfg = STATUS_CONFIG[s];
                    return (
                      <button
                        key={s}
                        onClick={() => setEditingRecord({ ...editingRecord, status: s })}
                        className={[
                          'flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all',
                          editingRecord.status === s ? `${cfg.badge} border-current` : 'border-border text-muted-foreground hover:bg-muted',
                        ].join(' ')}
                      >
                        {cfg.icon}{cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Remarks <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <textarea
                  value={editingRecord.remarks || ''}
                  onChange={e => setEditingRecord({ ...editingRecord, remarks: e.target.value })}
                  placeholder="Enter reason or notes…"
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none h-20"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" size="sm" onClick={() => setEditingRecord(null)}>Cancel</Button>
                <Button size="sm" onClick={handleEditRecord}>Update</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
