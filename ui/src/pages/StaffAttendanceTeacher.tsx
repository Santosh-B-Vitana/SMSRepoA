import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Users, UserCheck, UserX, Clock, Edit, Save, AlertCircle, Loader2, CheckCircle, Lock, ShieldOff, History, ChevronDown, CheckSquare, MinusSquare } from "lucide-react";
import { toast } from "sonner";
import { academicApi, type MyClassAssignment } from "@/services/api/academicApi";
import { studentApi, type StudentBasic } from "@/services/api/studentApi";
import { attendanceApi, type AttendanceRecordBasic } from "@/services/api/attendanceApi";
import { usePermissions } from "@/contexts/PermissionsContext";

// ─── Types ─────────────────────────────────────────────────────────────────
// 'not-marked' is UI-only; it is never sent to the API
type AttendanceStatus = 'present' | 'absent' | 'late' | 'not-marked';

interface AttendanceEntry {
  studentId: string;
  status: AttendanceStatus;
  remarks?: string;
}

interface HistoryDay {
  date: string;
  present: number;
  absent: number;
  late: number;
  total: number;
  records: AttendanceRecordBasic[];
}

export default function StaffAttendanceTeacher() {
  const { hasUserPermission, permissionsLoaded } = usePermissions();
  const canMarkAttendance = hasUserPermission('Attendance', 'Create');
  const canEditAttendance = hasUserPermission('Attendance', 'Edit');
  const accessDenied = permissionsLoaded && !canMarkAttendance && !canEditAttendance;
  const [assignments, setAssignments] = useState<MyClassAssignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<MyClassAssignment | null>(null);
  const [students, setStudents] = useState<StudentBasic[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState<AttendanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [alreadyTaken, setAlreadyTaken] = useState(false);
  const [showReasonDialog, setShowReasonDialog] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{ studentId: string; name: string; status: 'absent' | 'late' } | null>(null);
  const [remarks, setRemarks] = useState('');
  // History tab
  const [activeTab, setActiveTab] = useState<'mark' | 'history'>('mark');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyDays, setHistoryDays] = useState<HistoryDay[]>([]);
  const [historyExpandedDate, setHistoryExpandedDate] = useState<string | null>(null);

  // Load teacher's class assignments on mount
  useEffect(() => {
    academicApi.getMyClassAssignments()
      .then(data => {
        // Only class teachers can mark attendance — filter to class teacher assignments
        const classTeacherAssignments = data.filter(a => a.isClassTeacher);
        setAssignments(classTeacherAssignments);
        if (classTeacherAssignments.length > 0) setSelectedAssignment(classTeacherAssignments[0]);
      })
      .catch(() => toast.error("Failed to load class assignments"))
      .finally(() => setLoading(false));
  }, []);

  // Load students when selected assignment changes
  const loadStudents = useCallback(async (assignment: MyClassAssignment) => {
    setStudentsLoading(true);
    try {
      const res = await studentApi.list({ classFilter: assignment.className, pageSize: 200 });
      const classStudents = (res.students ?? []).filter(s =>
        !assignment.sectionName || s.section === assignment.sectionName
      );
      setStudents(classStudents);
      return classStudents;
    } catch {
      toast.error("Failed to load students");
      return [];
    } finally {
      setStudentsLoading(false);
    }
  }, []);

  // Load existing attendance records for the selected date
  const loadExistingAttendance = useCallback(async (
    studentList: StudentBasic[],
    date: string,
  ) => {
    if (studentList.length === 0) return;
    setAttendanceLoading(true);
    try {
      const res = await attendanceApi.listRecords({ dateFrom: date, dateTo: date, pageSize: 500 });
      const records: { studentId: string; status: string; remarks?: string }[] = res.items ?? [];
      const hasTaken = records.length > 0 &&
        studentList.some(s => records.find(r => r.studentId === s.id));
      setAlreadyTaken(hasTaken);
      setAttendance(studentList.map(s => {
        const existing = records.find(r => r.studentId === s.id);
        return {
          studentId: s.id,
          // Use existing value if attendance was already taken; otherwise leave as 'not-marked'
          // so the teacher must explicitly set each student's status
          status: existing
            ? (existing.status as AttendanceStatus)
            : 'not-marked',
          remarks: existing?.remarks ?? undefined,
        };
      }));
    } catch {
      // Fallback on API error — leave all as not-marked, don't assume present
      setAttendance(studentList.map(s => ({ studentId: s.id, status: 'not-marked' as AttendanceStatus })));
      setAlreadyTaken(false);
    } finally {
      setAttendanceLoading(false);
    }
  }, []);

  // Load history for the last 30 days for the selected class
  const loadHistory = useCallback(async (assignment: MyClassAssignment) => {
    setHistoryLoading(true);
    try {
      const today = new Date();
      const from = new Date(today);
      from.setDate(from.getDate() - 30);
      const dateFrom = from.toISOString().split('T')[0];
      const dateTo = today.toISOString().split('T')[0];
      const res = await attendanceApi.listRecords({ dateFrom, dateTo, pageSize: 2000 });
      const allRecords = res.items ?? [];

      // Group by date
      const byDate: Record<string, AttendanceRecordBasic[]> = {};
      allRecords.forEach(r => {
        const d = r.date.split('T')[0];
        if (!byDate[d]) byDate[d] = [];
        byDate[d].push(r);
      });

      const days: HistoryDay[] = Object.entries(byDate)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([date, records]) => ({
          date,
          present: records.filter(r => r.status === 'present').length,
          absent: records.filter(r => r.status === 'absent').length,
          late: records.filter(r => r.status === 'late').length,
          total: records.length,
          records,
        }));

      setHistoryDays(days);
    } catch {
      toast.error("Failed to load attendance history");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedAssignment) return;
    loadStudents(selectedAssignment).then(classStudents => {
      if (classStudents.length > 0) loadExistingAttendance(classStudents, selectedDate);
    });
    loadHistory(selectedAssignment);
  }, [selectedAssignment, loadStudents]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-load attendance when date changes (students already loaded)
  useEffect(() => {
    if (students.length > 0) {
      setIsEditing(false);
      loadExistingAttendance(students, selectedDate);
    }
  }, [selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateAttendance = (studentId: string, status: AttendanceStatus, remarks?: string) => {
    setAttendance(prev => prev.map(entry =>
      entry.studentId === studentId ? { ...entry, status, remarks: remarks ?? entry.remarks } : entry
    ));
  };

  const handleStatusChange = (student: StudentBasic, status: AttendanceStatus) => {
    if (status === 'absent' || status === 'late') {
      setPendingStatusChange({ studentId: student.id, name: student.name, status });
      setRemarks('');
      setShowReasonDialog(true);
    } else {
      updateAttendance(student.id, status);
    }
  };

  // Bulk quick-mark all students to a status
  const markAll = (status: 'present' | 'absent') => {
    setAttendance(prev => prev.map(entry => ({ ...entry, status })));
  };

  const handleReasonSubmit = () => {
    if (pendingStatusChange) {
      updateAttendance(pendingStatusChange.studentId, pendingStatusChange.status, remarks);
      setShowReasonDialog(false);
      setPendingStatusChange(null);
      setRemarks('');
    }
  };

  const saveAttendance = async () => {
    if (!selectedAssignment) return;
    if (!canMarkAttendance) {
      toast.error("Permission denied. Contact your administrator to get the required role.");
      return;
    }
    // Warn if any students haven't been marked
    const notMarked = attendance.filter(a => a.status === 'not-marked');
    if (notMarked.length > 0) {
      const names = notMarked.map(a => students.find(s => s.id === a.studentId)?.name ?? a.studentId).slice(0, 3);
      const extra = notMarked.length > 3 ? ` and ${notMarked.length - 3} more` : '';
      const proceed = window.confirm(
        `${notMarked.length} student(s) have not been marked yet:\n${names.join(', ')}${extra}\n\nThey will be saved as "present". Continue?`
      );
      if (!proceed) return;
    }
    setSaving(true);
    try {
      await attendanceApi.markBulkAttendance({
        date: selectedDate,
        attendances: attendance.map(a => ({
          studentId: a.studentId,
          // Treat any remaining 'not-marked' as present when saving
          status: a.status === 'not-marked' ? 'present' : a.status,
          remarks: a.remarks ?? null,
          isManualOverride: true,
        }))
      });
      toast.success("Attendance saved successfully");
      setIsEditing(false);
      setAlreadyTaken(true);
      loadExistingAttendance(students, selectedDate);
      loadHistory(selectedAssignment);
    } catch {
      toast.error("Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'present') return 'bg-green-100 text-green-800';
    if (status === 'absent') return 'bg-red-100 text-red-800';
    if (status === 'late') return 'bg-yellow-100 text-yellow-800';
    // not-marked
    return 'bg-muted text-muted-foreground border border-dashed';
  };

  const stats = {
    present: attendance.filter(a => a.status === 'present').length,
    absent: attendance.filter(a => a.status === 'absent').length,
    late: attendance.filter(a => a.status === 'late').length,
    notMarked: attendance.filter(a => a.status === 'not-marked').length,
    total: attendance.length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show access denied BEFORE the "no assignments" check so a non-class-teacher
  // staff member who was granted attendance sees the right message
  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="rounded-full bg-destructive/10 p-5">
            <ShieldOff className="h-10 w-10 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold">Access Restricted</h2>
          <p className="text-muted-foreground max-w-sm">
            You don't have permission to mark or edit attendance.
            Please contact your administrator to request access.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            toast.info("Contact your school administrator to have the 'Class Teacher' or 'Teacher' role assigned to your account.");
          }}
        >
          How to get access?
        </Button>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No class teacher assignments found for your account.</p>
        <p className="text-xs text-muted-foreground mt-2">Contact the administrator to assign you as a class teacher.</p>
      </div>
    );
  }

  const classLabel = selectedAssignment
    ? `${selectedAssignment.className}${selectedAssignment.sectionName ? ' – ' + selectedAssignment.sectionName : ''}`
    : '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-display">Student Attendance</h1>
          <p className="text-muted-foreground">Mark and review attendance for {classLabel}</p>
        </div>
        {assignments.length > 1 && (
          <Select
            value={selectedAssignment?.assignmentId ?? ""}
            onValueChange={v => {
              const a = assignments.find(a => a.assignmentId === v) ?? null;
              setSelectedAssignment(a);
              setHistoryExpandedDate(null);
            }}
          >
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {assignments.map(a => (
                <SelectItem key={a.assignmentId} value={a.assignmentId}>
                  {a.className}{a.sectionName ? ' – ' + a.sectionName : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'mark' | 'history')}>
        <TabsList>
          <TabsTrigger value="mark" className="gap-1.5"><Calendar className="h-4 w-4" />Mark Attendance</TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5"><History className="h-4 w-4" />History</TabsTrigger>
        </TabsList>

        {/* ── Mark Attendance Tab ─────────────────────────────────── */}
        <TabsContent value="mark" className="space-y-5 mt-4">
          {/* Date picker + actions */}
          <div className="flex flex-wrap items-center gap-3">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
              max={new Date().toISOString().split('T')[0]}
            />
            {alreadyTaken && !isEditing && (
              <Badge variant="outline" className="gap-1 text-green-700 border-green-300 bg-green-50">
                <CheckCircle className="h-3.5 w-3.5" /> Taken
              </Badge>
            )}
            {isEditing ? (
              <>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => markAll('present')}>
                  <CheckSquare className="h-4 w-4 text-green-600" />Mark All Present
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => markAll('absent')}>
                  <MinusSquare className="h-4 w-4 text-red-500" />Mark All Absent
                </Button>
                <Button onClick={saveAttendance} disabled={saving} className="gap-1.5">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Attendance
                </Button>
                <Button variant="outline" onClick={() => {
                  setIsEditing(false);
                  loadExistingAttendance(students, selectedDate);
                }}>Cancel</Button>
              </>
            ) : (
              <Button
                onClick={() => {
                  if (!canEditAttendance) {
                    toast.error("Permission denied. Contact your administrator.");
                    return;
                  }
                  setIsEditing(true);
                }}
                disabled={attendanceLoading}
              >
                {!canEditAttendance ? <Lock className="h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
                {alreadyTaken ? 'Edit Attendance' : 'Take Attendance'}
              </Button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Total', value: stats.total, icon: Users, color: 'text-primary' },
              { label: 'Present', value: stats.present, icon: UserCheck, color: 'text-green-600' },
              { label: 'Absent', value: stats.absent, icon: UserX, color: 'text-red-600' },
              { label: 'Late', value: stats.late, icon: Clock, color: 'text-yellow-600' },
              { label: 'Not Marked', value: stats.notMarked, icon: AlertCircle, color: stats.notMarked > 0 ? 'text-orange-500' : 'text-muted-foreground' },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{label}</p>
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  </div>
                  <Icon className={`h-7 w-7 ${color} opacity-70`} />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4" />
                {classLabel} — {selectedDate}
                {isEditing && stats.notMarked > 0 && (
                  <Badge className="ml-2 bg-orange-100 text-orange-700 border-orange-200">
                    {stats.notMarked} not marked
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {studentsLoading || attendanceLoading ? (
                <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : students.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No students found for this class/section.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Roll No</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Remarks</TableHead>
                      {isEditing && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map(student => {
                      const entry = attendance.find(a => a.studentId === student.id);
                      const status = entry?.status ?? 'not-marked';
                      return (
                        <TableRow key={student.id} className={status === 'not-marked' && isEditing ? 'bg-orange-50/40' : ''}>
                          <TableCell className="font-medium">{student.rollNumber}</TableCell>
                          <TableCell>{student.name}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(status)}>
                              {status === 'not-marked' ? '— not marked' : status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{entry?.remarks ?? ''}</TableCell>
                          {isEditing && (
                            <TableCell>
                              <div className="flex gap-1">
                                {(['present', 'absent', 'late'] as const).map(s => (
                                  <Button
                                    key={s}
                                    size="sm"
                                    variant={entry?.status === s
                                      ? (s === 'absent' ? 'destructive' : s === 'late' ? 'secondary' : 'default')
                                      : 'outline'}
                                    onClick={() => handleStatusChange(student, s)}
                                  >
                                    {s.charAt(0).toUpperCase() + s.slice(1)}
                                  </Button>
                                ))}
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── History Tab ─────────────────────────────────────────── */}
        <TabsContent value="history" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Last 30 days — {classLabel}</p>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => selectedAssignment && loadHistory(selectedAssignment)} disabled={historyLoading}>
              {historyLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <History className="h-3.5 w-3.5" />}
              Refresh
            </Button>
          </div>

          {historyLoading ? (
            <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : historyDays.length === 0 ? (
            <Card>
              <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
                <History className="h-10 w-10 text-muted-foreground/50" />
                <p className="font-medium text-muted-foreground">No attendance records yet</p>
                <p className="text-xs text-muted-foreground">Saved attendance will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-center text-green-700">Present</TableHead>
                    <TableHead className="text-center text-red-600">Absent</TableHead>
                    <TableHead className="text-center text-yellow-600">Late</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Rate</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyDays.map(day => {
                    const rate = day.total > 0 ? Math.round((day.present / day.total) * 100) : 0;
                    const isExpanded = historyExpandedDate === day.date;
                    return (
                      <React.Fragment key={day.date}>
                        <TableRow
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setHistoryExpandedDate(isExpanded ? null : day.date)}
                        >
                          <TableCell className="font-medium">{day.date}</TableCell>
                          <TableCell className="text-center font-semibold text-green-700">{day.present}</TableCell>
                          <TableCell className="text-center font-semibold text-red-600">{day.absent}</TableCell>
                          <TableCell className="text-center font-semibold text-yellow-600">{day.late}</TableCell>
                          <TableCell className="text-center">{day.total}</TableCell>
                          <TableCell className="text-center">
                            <Badge className={rate >= 90 ? 'bg-green-100 text-green-800' : rate >= 75 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                              {rate}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={7} className="bg-muted/30 p-0">
                              <div className="px-6 py-3">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Student</TableHead>
                                      <TableHead>Status</TableHead>
                                      <TableHead>Remarks</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {day.records.map(r => (
                                      <TableRow key={r.id}>
                                        <TableCell className="text-sm">{r.studentName}</TableCell>
                                        <TableCell>
                                          <Badge className={getStatusColor(r.status)}>{r.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                          {(r as any).remarks ?? ''}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Reason Dialog */}
      <Dialog open={showReasonDialog} onOpenChange={setShowReasonDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Mark as {pendingStatusChange?.status} — {pendingStatusChange?.name}
            </DialogTitle>
            <DialogDescription>Add an optional reason for this status change.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="remarks">Remarks (optional)</Label>
              <Textarea
                id="remarks"
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                placeholder="e.g., Medical leave, family emergency..."
                className="min-h-20 mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReasonDialog(false)}>Cancel</Button>
            <Button onClick={handleReasonSubmit}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
