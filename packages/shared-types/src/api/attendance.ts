export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'HalfDay';

export interface StudentAttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  status: AttendanceStatus;
  markedBy: string;
  remarks?: string;
  classId?: string;
  className?: string;
}

export interface AttendanceSummary {
  studentId: string;
  studentName: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  attendancePercentage: number;
  month?: string;
}

export interface BulkAttendanceRequest {
  classId: string;
  date: string;
  records: Array<{
    studentId: string;
    status: AttendanceStatus;
    remarks?: string;
  }>;
}
