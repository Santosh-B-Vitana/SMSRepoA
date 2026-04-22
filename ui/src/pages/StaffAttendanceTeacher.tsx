import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Users, UserCheck, UserX, Clock, Edit, Save, AlertCircle, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { academicApi, type MyClassAssignment } from "@/services/api/academicApi";
import { studentApi, type StudentBasic } from "@/services/api/studentApi";
import { attendanceApi } from "@/services/api/attendanceApi";
import { apiPost } from "@/lib/apiClient";

interface AttendanceEntry {
  studentId: string;
  status: 'present' | 'absent' | 'late';
  remarks?: string;
}

export default function StaffAttendanceTeacher() {
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

  // Load teacher's class assignments on mount
  useEffect(() => {
    academicApi.getMyClassAssignments()
      .then(data => {
        setAssignments(data);
        if (data.length > 0) setSelectedAssignment(data[0]);
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
      const records: { studentId: string; status: string; remarks?: string }[] = res.records ?? [];
      const hasTaken = records.length > 0 &&
        studentList.some(s => records.find(r => r.studentId === s.id));
      setAlreadyTaken(hasTaken);
      setAttendance(studentList.map(s => {
        const existing = records.find(r => r.studentId === s.id);
        return {
          studentId: s.id,
          status: (existing?.status as AttendanceEntry['status']) ?? 'present',
          remarks: existing?.remarks ?? undefined,
        };
      }));
    } catch {
      // Fallback: default all to present
      setAttendance(studentList.map(s => ({ studentId: s.id, status: 'present' as const })));
      setAlreadyTaken(false);
    } finally {
      setAttendanceLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedAssignment) return;
    loadStudents(selectedAssignment).then(classStudents => {
      if (classStudents.length > 0) loadExistingAttendance(classStudents, selectedDate);
    });
  }, [selectedAssignment, loadStudents]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-load attendance when date changes (students already loaded)
  useEffect(() => {
    if (students.length > 0) {
      setIsEditing(false);
      loadExistingAttendance(students, selectedDate);
    }
  }, [selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateAttendance = (studentId: string, status: AttendanceEntry['status'], remarks?: string) => {
    setAttendance(prev => prev.map(entry =>
      entry.studentId === studentId ? { ...entry, status, remarks: remarks ?? entry.remarks } : entry
    ));
  };

  const handleStatusChange = (student: StudentBasic, status: AttendanceEntry['status']) => {
    if (status === 'absent' || status === 'late') {
      setPendingStatusChange({ studentId: student.id, name: student.name, status });
      setRemarks('');
      setShowReasonDialog(true);
    } else {
      updateAttendance(student.id, status);
    }
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
    setSaving(true);
    try {
      await apiPost('/attendance/records/bulk', {
        date: selectedDate,
        attendances: attendance.map(a => ({
          studentId: a.studentId,
          date: selectedDate,
          status: a.status,
          remarks: a.remarks ?? null,
          isManualOverride: true
        }))
      });
      toast.success("Attendance saved successfully");
      setIsEditing(false);
      setAlreadyTaken(true);
      // Reload to reflect saved state
      loadExistingAttendance(students, selectedDate);
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
    return 'bg-gray-100 text-gray-800';
  };

  const stats = {
    present: attendance.filter(a => a.status === 'present').length,
    absent: attendance.filter(a => a.status === 'absent').length,
    late: attendance.filter(a => a.status === 'late').length,
    total: attendance.length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-display">Student Attendance</h1>
          <p className="text-muted-foreground">Mark attendance for {classLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Class selector (if multiple assignments) */}
          {assignments.length > 1 && (
            <Select
              value={selectedAssignment?.assignmentId ?? ""}
              onValueChange={v => setSelectedAssignment(assignments.find(a => a.assignmentId === v) ?? null)}
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
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto"
          />
          {alreadyTaken && !isEditing && (
            <Badge variant="outline" className="gap-1 text-green-700 border-green-300 bg-green-50">
              <CheckCircle className="h-3.5 w-3.5" /> Taken
            </Badge>
          )}
          {isEditing ? (
            <div className="flex gap-2">
              <Button onClick={saveAttendance} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Attendance
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
            </div>
          ) : (
            <Button onClick={() => setIsEditing(true)} disabled={attendanceLoading}>
              <Edit className="h-4 w-4 mr-2" />
              {alreadyTaken ? 'Edit Attendance' : 'Take Attendance'}
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Students', value: stats.total, icon: Users, color: 'text-primary' },
          { label: 'Present', value: stats.present, icon: UserCheck, color: 'text-green-600' },
          { label: 'Absent', value: stats.absent, icon: UserX, color: 'text-red-600' },
          { label: 'Late', value: stats.late, icon: Clock, color: 'text-yellow-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
              </div>
              <Icon className={`h-8 w-8 ${color} opacity-80`} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {classLabel} Attendance — {selectedDate}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {studentsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : students.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No students found for this class/section.</p>
          ) : attendanceLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Roll No</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Remarks</TableHead>
                  {isEditing && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map(student => {
                  const entry = attendance.find(a => a.studentId === student.id);
                  return (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.rollNumber}</TableCell>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(entry?.status ?? 'present')}>
                          {entry?.status ?? 'present'}
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
                                variant={entry?.status === s ? (s === 'absent' ? 'destructive' : s === 'late' ? 'secondary' : 'default') : 'outline'}
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

      {/* Reason Dialog */}
      <Dialog open={showReasonDialog} onOpenChange={setShowReasonDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Reason — {pendingStatusChange?.name} ({pendingStatusChange?.status})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="remarks">Remarks (optional)</Label>
              <Textarea
                id="remarks"
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                placeholder="e.g., Medical leave, family emergency..."
                className="min-h-20"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowReasonDialog(false)}>Cancel</Button>
              <Button onClick={handleReasonSubmit}>Confirm</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
