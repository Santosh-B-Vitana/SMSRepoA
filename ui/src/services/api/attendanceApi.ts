/**
 * Attendance API — connects to /api/Attendance backend
 */
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/apiClient';

// Types
export interface AttendanceRecordBasic {
  id: string;
  studentId: string;
  studentName: string;
  class: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused' | 'half_day' | 'absent_with_leave';
}

export interface AttendanceRecordFull extends AttendanceRecordBasic {
  schoolId: string;
  section: string;
  checkInTime?: string;
  checkOutTime?: string;
  remarks?: string;
  markedBy: string;
  markedByName?: string;
  biometricId?: string;
  isManualOverride: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MarkAttendanceDto {
  studentId: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused' | 'half_day' | 'absent_with_leave';
  checkInTime?: string;
  checkOutTime?: string;
  remarks?: string;
  biometricId?: string;
  isManualOverride?: boolean;
}

export interface BulkAttendanceDto {
  date: string;
  attendances: MarkAttendanceDto[];
}

export interface AttendanceListResponse {
  items: AttendanceRecordBasic[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AttendanceFilters {
  page?: number;
  pageSize?: number;
  studentId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
  academicYear?: string;
}

export interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  attendancePercent: number;
}

export type StaffAttendanceStatus = 'present' | 'absent' | 'late' | 'leave';

export interface StaffAttendanceResponse {
  id: string;
  schoolId: string;
  staffId: string;
  staffName?: string;
  date: string;
  status: StaffAttendanceStatus;
  checkInTime?: string;
  checkOutTime?: string;
  remarks?: string;
  leaveTypeId?: string;
  leaveTypeName?: string;
  leaveDeducted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStaffAttendanceRequest {
  schoolId: string;
  staffId: string;
  date: string;
  status: StaffAttendanceStatus;
  checkInTime?: string;
  checkOutTime?: string;
  remarks?: string;
  leaveTypeId?: string;
}

export interface UpdateStaffAttendanceRequest {
  status: StaffAttendanceStatus;
  checkInTime?: string;
  checkOutTime?: string;
  remarks?: string;
  leaveTypeId?: string;
}

// API Service
export const attendanceApi = {
  /**
   * Get attendance records with optional filters
   */
  listRecords: (filters?: AttendanceFilters) =>
    apiGet<AttendanceListResponse>('/Attendance/records', filters as Record<string, unknown>),

  /**
   * Get single attendance record
   */
  getRecord: (id: string) =>
    apiGet<AttendanceRecordFull>(`/Attendance/records/${id}`),

  /**
   * Mark attendance for a single student
   */
  markAttendance: (data: MarkAttendanceDto) =>
    apiPost<AttendanceRecordFull>('/Attendance/records', data),

  /**
   * Mark attendance for multiple students (bulk)
   */
  markBulkAttendance: (data: BulkAttendanceDto) =>
    apiPost<{ succeeded: number; failed: number; errors?: string[] }>(
      '/Attendance/records/bulk',
      data
    ),

  /**
   * Update existing attendance record
   */
  updateRecord: (id: string, data: Partial<MarkAttendanceDto>) =>
    apiPut<AttendanceRecordFull>(`/Attendance/records/${id}`, data),

  /**
   * Get attendance statistics for a student
   */
  getStats: (studentId?: string) =>
    apiGet<AttendanceStats>('/Attendance/stats', studentId ? { studentId } : {}),

  /**
   * Get monthly attendance trend
   */
  getMonthlyTrend: (year: number, month: number, filters?: Record<string, unknown>) =>
    apiGet<Record<string, number>>(`/Attendance/monthly-trend`, {
      year,
      month,
      ...filters
    }),

  /**
   * Get student's attendance records for a specific date range
   */
  getStudentRecords: (
    studentId: string,
    dateFrom?: string,
    dateTo?: string,
    page: number = 1,
    pageSize: number = 50
  ) =>
    apiGet<AttendanceListResponse>('/Attendance/records', {
      studentId,
      dateFrom,
      dateTo,
      page,
      pageSize
    }),

  /**
   * Delete an attendance record
   */
  deleteRecord: (id: string) =>
    apiDelete(`/Attendance/records/${id}`),

  /**
   * GET /api/Attendance/my-attendance — Staff self-view attendance (no staffId needed)
   */
  getMyAttendance: (params?: { fromDate?: string; toDate?: string }) =>
    apiGet<StaffAttendanceResponse[]>('/Attendance/my-attendance', params as Record<string, unknown>),

  /**
   * Get staff attendance entries — supports single date, staffId, or date range
   */
  getStaffAttendances: (params?: { date?: string; staffId?: string; fromDate?: string; toDate?: string }) =>
    apiGet<StaffAttendanceResponse[]>('/Attendance/staff', params as Record<string, unknown>),

  /**
   * Create staff attendance entry
   */
  createStaffAttendance: (data: CreateStaffAttendanceRequest) =>
    apiPost<StaffAttendanceResponse>('/Attendance/staff', data),

  /**
   * Update an existing staff attendance record
   */
  updateStaffAttendance: (id: string, data: UpdateStaffAttendanceRequest) =>
    apiPut<StaffAttendanceResponse>(`/Attendance/staff/${id}`, data),
};
