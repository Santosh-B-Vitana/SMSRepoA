import { apiClient } from '../client';
import type { AppNotification } from '@vitana/shared-types';

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface MinimalStudent {
  id: string;
  firstName: string;
  lastName: string;
  rollNumber: string;
  photoUrl: string | null;
}

export interface TimetableEntry {
  id: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  subjectName: string;
  className: string;
  classId: string;
  room?: string | null;
}

export interface TeacherAssignment {
  classId: string;
  className: string;
  subjects: string[];
}

export interface TeacherDashboardResponse {
  todaySchedule: TimetableEntry[];
  pendingLeaveCount: number;
  classesStatus: { classId: string; className: string; attendanceMarked: boolean }[];
  unreadCount: number;
}

export interface BulkAttendancePayload {
  classId: string;
  date: string;
  academicYear?: string | null;
  records: { studentId: string; status: string }[];
}

export interface LeaveRequest {
  id: string;
  studentName: string;
  className: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  appliedAt: string;
}

export interface OwnLeaveApplication {
  id: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  appliedAt: string;
}

export interface LeaveType {
  id: string;
  name: string;
  description?: string | null;
}

export interface AttendanceStats {
  presentCount: number;
  absentCount: number;
  lateCount: number;
  totalCount: number;
  percent: number;
}

export const teacherApi = {
  getDashboard: (): Promise<TeacherDashboardResponse> =>
    apiClient.get('/mobile/teacher-dashboard'),

  getTodaySchedule: (): Promise<TimetableEntry[]> =>
    apiClient.get('/timetable/my-schedule'),

  getTeacherAssignments: (): Promise<TeacherAssignment[]> =>
    apiClient.get('/academics/teacher-assignments'),

  getClassStudents: (classId: string): Promise<MinimalStudent[]> =>
    apiClient.get('/students', { params: { classId, minimal: true, pageSize: 100 } }),

  submitBulkAttendance: (
    payload: BulkAttendancePayload,
    idempotencyKey: string,
  ): Promise<void> =>
    apiClient.post('/attendance/students/bulk', payload, {
      headers: { 'X-Idempotency-Key': idempotencyKey },
    }),

  getAttendanceStats: (classId: string): Promise<AttendanceStats> =>
    apiClient.get('/attendance/stats', { params: { classId } }),

  getPendingLeaves: (classId?: string): Promise<LeaveRequest[]> =>
    apiClient.get('/attendance/leave-requests', {
      params: { classId, status: 'pending' },
    }),

  approveLeave: (id: string, remark?: string): Promise<void> =>
    apiClient.put(`/attendance/leave-requests/${id}/approve`, { remark }),

  rejectLeave: (id: string, reason: string): Promise<void> =>
    apiClient.put(`/attendance/leave-requests/${id}/reject`, { reason }),

  applyOwnLeave: (data: {
    leaveTypeId: string;
    fromDate: string;
    toDate: string;
    reason: string;
  }): Promise<OwnLeaveApplication> =>
    apiClient.post('/leavemanagement/leave-requests', data),

  getOwnLeaves: (): Promise<OwnLeaveApplication[]> =>
    apiClient.get('/leavemanagement/leave-requests/my'),

  getLeaveTypes: (): Promise<LeaveType[]> =>
    apiClient.get('/leavemanagement/leave-types'),

  getNotifications: (page: number): Promise<PaginatedResponse<AppNotification>> =>
    apiClient.get('/notifications/my', { params: { page, pageSize: 20 } }),

  markNotificationRead: (id: string): Promise<void> =>
    apiClient.put(`/notifications/${id}/read`),

  markAllNotificationsRead: (): Promise<void> =>
    apiClient.put('/notifications/read-all'),
};
