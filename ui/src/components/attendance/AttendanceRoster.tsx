import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Calendar,
  CheckCircle, 
  XCircle, 
  Timer, 
  AlertCircle,
  Download,
  Save,
  RefreshCw,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import { attendanceApi, type MarkAttendanceDto } from "@/services/api/attendanceApi";

interface Student {
  id: string;
  name: string;
  rollNo: string;
  photoUrl?: string;
}

interface AttendanceRosterProps {
  classId: string;
  students: Student[];
}

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

interface AttendanceEntry {
  studentId: string;
  status: AttendanceStatus;
  reason?: string;
}

export default function AttendanceRoster({ classId, students }: AttendanceRosterProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceEntry>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasExistingRecords, setHasExistingRecords] = useState(false);

  // Load existing attendance for selected date
  useEffect(() => {
    loadExistingAttendance();
  }, [selectedDate]);

  const loadExistingAttendance = async () => {
    setLoading(true);
    try {
      const attendanceDate = new Date(selectedDate + 'T00:00:00Z').toISOString();
      // Try to load existing records for this date
      const response = await attendanceApi.listRecords({
        dateFrom: selectedDate,
        dateTo: selectedDate,
        pageSize: 1000
      });

      if (response.records && response.records.length > 0) {
        // Convert API response to attendance format
        const existingAttendance: Record<string, AttendanceEntry> = {};
        response.records.forEach(record => {
          existingAttendance[record.studentId] = {
            studentId: record.studentId,
            status: record.status as AttendanceStatus,
            reason: record.remarks || ''
          };
        });
        
        setAttendance(existingAttendance);
        setHasExistingRecords(true);
        setIsEditMode(true);
        toast.info(`Loaded ${response.records.length} existing records for ${selectedDate}`);
      } else {
        setAttendance({});
        setHasExistingRecords(false);
        setIsEditMode(false);
      }
    } catch (error) {
      console.error('Error loading attendance:', error);
      // Don't show error toast for first load - likely no records yet
      setAttendance({});
      setHasExistingRecords(false);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (studentId: string, status: AttendanceStatus, reason?: string) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: {
        studentId,
        status,
        reason: reason || ''
      }
    }));
  };

  const handleReasonChange = (studentId: string, reason: string) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        reason
      }
    }));
  };

  const handleBulkAction = (status: AttendanceStatus) => {
    const bulkAttendance: Record<string, AttendanceEntry> = {};
    students.forEach(student => {
      bulkAttendance[student.id] = {
        studentId: student.id,
        status,
        reason: ''
      };
    });
    setAttendance(bulkAttendance);
    toast.success(`Marked all students as ${status}`);
  };

  const handleClearAttendance = () => {
    if (window.confirm('Clear all marked attendance for this date?')) {
      setAttendance({});
      setIsEditMode(false);
      setHasExistingRecords(false);
      toast.info('Attendance cleared');
    }
  };

  const handleSaveAttendance = async () => {
    setSaving(true);
    try {
      if (Object.keys(attendance).length === 0) {
        toast.error("Please mark attendance for at least one student");
        setSaving(false);
        return;
      }

      // Validate date
      if (!selectedDate) {
        toast.error("Please select a date");
        setSaving(false);
        return;
      }

      // Convert date to ISO 8601 format with time (midnight UTC)
      const attendanceDate = new Date(selectedDate + 'T00:00:00Z').toISOString();

      // Convert attendance to API format
      const attendanceEntries: MarkAttendanceDto[] = Object.values(attendance).map(entry => ({
        studentId: entry.studentId,
        date: attendanceDate,
        status: entry.status,
        remarks: entry.reason || undefined,
        isManualOverride: true
      }));

      const payload = {
        date: attendanceDate,
        attendances: attendanceEntries
      };

      console.log('Marking attendance - Date input:', selectedDate);
      console.log('Marking attendance - ISO Date:', attendanceDate);
      console.log('Marking attendance with payload:', JSON.stringify(payload, null, 2));

      // Call bulk attendance API
      const result = await attendanceApi.markBulkAttendance(payload);
      
      console.log('Attendance marking response:', result);
      
      // Handle list response
      if (Array.isArray(result)) {
        toast.success(`Attendance ${isEditMode ? 'updated' : 'saved'} for ${result.length} student(s)`);
        setAttendance({});
        setIsEditMode(false);
      } else if (result.succeeded !== undefined) {
        if (result.succeeded > 0) {
          toast.success(`Attendance ${isEditMode ? 'updated' : 'saved'} for ${result.succeeded} student(s)`);
        }
        if (result.failed > 0) {
          toast.warning(`Failed to save for ${result.failed} student(s)${result.errors ? ': ' + result.errors.join(', ') : ''}`);
        }
        setAttendance({});
        setIsEditMode(false);
      }
    } catch (error: any) {
      console.error('Error saving attendance:', error);
      const errorMessage = error?.response?.data?.message || error?.response?.data?.error || error?.message || "Failed to save attendance";
      console.error('Full error details:', {
        message: errorMessage,
        status: error?.response?.status,
        data: error?.response?.data,
        originalPayload: error?.config?.data
      });
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const getStatusIcon = (status: AttendanceStatus) => {
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

  const getStatusVariant = (status: AttendanceStatus): "default" | "destructive" | "secondary" | "outline" => {
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

  return (
    <div className="space-y-6">
      {/* Date Selection and Bulk Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end justify-between">
        <div className="space-y-2 flex-1">
          <label className="text-sm font-medium">Select Date</label>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
              disabled={loading}
            />
            {loading && <span className="text-sm text-muted-foreground">Loading...</span>}
            {isEditMode && <Badge variant="secondary" className="animate-pulse">Edit Mode</Badge>}
            {hasExistingRecords && !isEditMode && <Badge variant="outline">Has Records</Badge>}
          </div>
        </div>

        {/* Bulk Actions */}
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBulkAction('present')}
            disabled={loading}
          >
            Mark All Present
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBulkAction('absent')}
            disabled={loading}
          >
            Mark All Absent
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={loading}
          >
            <Download className="h-4 w-4 mr-2" />
            Import from Biometric
          </Button>
          {(Object.keys(attendance).length > 0 || isEditMode) && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleClearAttendance}
              className="text-red-600"
              disabled={loading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Attendance Roster */}
      <div className="space-y-3">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
            <span className="text-muted-foreground">Loading existing attendance...</span>
          </div>
        )}

        {!loading && students.map((student) => {
          const currentAttendance = attendance[student.id];
          
          return (
            <Card key={student.id} className="p-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                {/* Student Info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    {student.photoUrl ? (
                      <img 
                        src={student.photoUrl} 
                        alt={student.name} 
                        className="w-full h-full object-cover rounded-full" 
                      />
                    ) : (
                      <span className="text-sm font-medium">{student.name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{student.name}</div>
                    <div className="text-sm text-muted-foreground">Roll No: {student.rollNo}</div>
                  </div>
                </div>

                {/* Status Buttons */}
                <div className="flex gap-2 flex-wrap">
                  {(['present', 'absent', 'late', 'excused'] as AttendanceStatus[]).map((status) => (
                    <Button
                      key={status}
                      size="sm"
                      variant={currentAttendance?.status === status ? getStatusVariant(status) : "outline"}
                      onClick={() => handleStatusChange(student.id, status)}
                      className="flex items-center gap-2"
                    >
                      {getStatusIcon(status)}
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Button>
                  ))}
                </div>

                {/* Reason Input (shown if absent, late, or excused) */}
                {currentAttendance?.status && currentAttendance.status !== 'present' && (
                  <Input
                    placeholder="Reason (optional)"
                    value={currentAttendance.reason || ''}
                    onChange={(e) => handleReasonChange(student.id, e.target.value)}
                    className="w-40 flex-shrink-0"
                  />
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Save Button */}
      <div className="flex justify-between items-center gap-4 pt-4 border-t flex-wrap">
        <div className="flex items-center gap-4 flex-wrap text-sm">
          <span className="text-muted-foreground">
            {Object.keys(attendance).length} of {students.length} students marked
          </span>
          {isEditMode && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              Editing existing records
            </Badge>
          )}
        </div>
        <Button 
          onClick={handleSaveAttendance}
          disabled={saving || loading || Object.keys(attendance).length === 0}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {saving ? `${isEditMode ? 'Updating' : 'Saving'}...` : `${isEditMode ? 'Update' : 'Save'} Attendance`}
        </Button>
      </div>
    </div>
  );
}