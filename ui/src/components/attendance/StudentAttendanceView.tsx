import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Calendar, CheckCircle, XCircle, Timer, AlertCircle, Edit2, Trash2 } from "lucide-react";
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

interface AttendanceStats {
  presentDays: number;
  absentDays: number;
  lateDays: number;
  attendancePercent: number;
}

export default function StudentAttendanceView({ studentId }: StudentAttendanceViewProps) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [newRecord, setNewRecord] = useState({
    date: new Date().toISOString().split('T')[0],
    status: 'present' as const,
    remarks: ''
  });

  useEffect(() => {
    fetchAttendance();
  }, [studentId]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      // Fetch real attendance records from backend
      const recordsResponse = await attendanceApi.getStudentRecords(studentId);
      const records = recordsResponse.items.map((r: any) => ({
        id: r.id,
        date: r.date,
        status: r.status,
        isManualOverride: r.isManualOverride,
        remarks: r.remarks
      }));
      
      // Fetch real stats from backend
      const statsResponse = await attendanceApi.getStats(studentId);
      
      setRecords(records);
      setStats(statsResponse);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast.error('Failed to load attendance records');
      // Show empty state instead of mock data
      setRecords([]);
      setStats({
        presentDays: 0,
        absentDays: 0,
        lateDays: 0,
        attendancePercent: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecord = async () => {
    if (!newRecord.date) {
      toast.error("Please select a date");
      return;
    }

    try {
      // Call backend API to add record
      const response = await attendanceApi.markAttendance({
        studentId,
        date: newRecord.date,
        status: newRecord.status as 'present' | 'absent' | 'late' | 'excused',
        remarks: newRecord.remarks || undefined,
        isManualOverride: true
      });

      // Add to local state
      const newRecordForState: AttendanceRecord = {
        id: response.id,
        date: response.date,
        status: response.status,
        isManualOverride: response.isManualOverride,
        remarks: response.remarks
      };

      setRecords([newRecordForState, ...records]);
      setShowAddDialog(false);
      setNewRecord({
        date: new Date().toISOString().split('T')[0],
        status: 'present',
        remarks: ''
      });
      
      // Refresh stats
      const statsResponse = await attendanceApi.getStats(studentId);
      setStats(statsResponse);
      
      toast.success('Attendance record added');
    } catch (error) {
      console.error('Error adding record:', error);
      toast.error('Failed to add attendance record');
    }
  };

  const handleEditRecord = async () => {
    if (!editingRecord || !editingRecord.id || !editingRecord.date) {
      toast.error("Invalid record");
      return;
    }

    try {
      // Call backend API to update record
      const response = await attendanceApi.updateRecord(editingRecord.id, {
        status: editingRecord.status,
        remarks: editingRecord.remarks
      });

      // Update local state
      const updatedRecords = records.map(r => 
        r.id === editingRecord.id 
          ? {
              ...r,
              status: response.status,
              remarks: response.remarks
            }
          : r
      );
      
      setRecords(updatedRecords);
      setShowEditDialog(false);
      setEditingRecord(null);
      
      // Refresh stats
      const statsResponse = await attendanceApi.getStats(studentId);
      setStats(statsResponse);
      
      toast.success('Attendance record updated');
    } catch (error) {
      console.error('Error updating record:', error);
      toast.error('Failed to update attendance record');
    }
  };

  const handleDeleteRecord = async (record: AttendanceRecord) => {
    if (!record.id) {
      toast.error("Cannot delete record without ID");
      return;
    }

    try {
      // Call backend API to delete record
      await attendanceApi.deleteRecord(record.id);

      // Remove from local state
      setRecords(records.filter(r => r.id !== record.id));
      
      // Refresh stats
      const statsResponse = await attendanceApi.getStats(studentId);
      setStats(statsResponse);
      
      toast.success('Attendance record deleted');
    } catch (error) {
      console.error('Error deleting record:', error);
      toast.error('Failed to delete attendance record');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'absent':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'late':
        return <Timer className="h-4 w-4 text-yellow-600" />;
      case 'excused':
        return <AlertCircle className="h-4 w-4 text-blue-600" />;
      default:
        return null;
    }
  };

  const getStatusVariant = (status: string): "default" | "destructive" | "secondary" | "outline" => {
    switch (status) {
      case 'present':
        return 'default';
      case 'absent':
        return 'destructive';
      case 'late':
        return 'secondary';
      case 'excused':
        return 'outline';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading attendance records...</p>
        </CardContent>
      </Card>
    );
  }

  const filteredRecords = filterDate
    ? records.filter(r => r.date === filterDate)
    : records;

  return (
    <div className="space-y-6">
      {/* Statistics Card */}
      {stats && (
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.presentDays}</div>
                <div className="text-sm text-muted-foreground">Present</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.absentDays}</div>
                <div className="text-sm text-muted-foreground">Absent</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.lateDays}</div>
                <div className="text-sm text-muted-foreground">Late</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{stats.attendancePercent}%</div>
                <div className="text-sm text-muted-foreground">Attendance</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attendance Records Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Attendance Records
            </CardTitle>
            <Button
              size="sm"
              onClick={() => setShowAddDialog(true)}
            >
              Add Record
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filter */}
          <div className="mb-4 flex gap-2 items-center">
            <span className="text-sm font-medium">Filter by Date:</span>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            />
            {filterDate && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilterDate("")}
              >
                Clear
              </Button>
            )}
          </div>

          {/* Records Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {filterDate ? 'No records for this date' : 'No attendance records'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">
                        {new Date(record.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(record.status)} className="flex w-fit items-center gap-1">
                          {getStatusIcon(record.status)}
                          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">
                        {record.isManualOverride ? 'Manual' : 'Biometric'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {record.remarks || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingRecord(record);
                              setShowEditDialog(true);
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600"
                            onClick={() => handleDeleteRecord(record)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Record Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Attendance Record</DialogTitle>
            <DialogDescription>
              Manually add an attendance record for this student
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                value={newRecord.date}
                onChange={(e) => setNewRecord({ ...newRecord, date: e.target.value })}
                className="w-full border rounded px-2 py-1 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={newRecord.status}
                onChange={(e) => setNewRecord({ ...newRecord, status: e.target.value as any })}
                className="w-full border rounded px-2 py-1 text-sm"
              >
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
                <option value="excused">Excused</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Remarks (Optional)</label>
              <textarea
                value={newRecord.remarks}
                onChange={(e) => setNewRecord({ ...newRecord, remarks: e.target.value })}
                placeholder="Enter reason or remarks..."
                className="w-full border rounded px-2 py-1 text-sm resize-none h-20"
              />
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setShowAddDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleAddRecord}>
                Add Record
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Record Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Attendance Record</DialogTitle>
            <DialogDescription>
              Update the attendance record for this student
            </DialogDescription>
          </DialogHeader>

          {editingRecord && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <div className="border rounded px-2 py-1 text-sm bg-muted">
                  {new Date(editingRecord.date).toLocaleDateString()}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={editingRecord.status}
                  onChange={(e) => setEditingRecord({ ...editingRecord, status: e.target.value as any })}
                  className="w-full border rounded px-2 py-1 text-sm"
                >
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="late">Late</option>
                  <option value="excused">Excused</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Remarks (Optional)</label>
                <textarea
                  value={editingRecord.remarks || ''}
                  onChange={(e) => setEditingRecord({ ...editingRecord, remarks: e.target.value })}
                  placeholder="Enter reason or remarks..."
                  className="w-full border rounded px-2 py-1 text-sm resize-none h-20"
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowEditDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleEditRecord}>
                  Update Record
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
