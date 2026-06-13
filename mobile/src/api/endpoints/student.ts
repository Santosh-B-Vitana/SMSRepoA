import { apiClient } from '../client';
import type { Announcement, AppNotification, ExamResult } from '@vitana/shared-types';

// ─── Response types ────────────────────────────────────────────────────────

export interface TimetablePeriod {
  periodNumber: number;
  startTime: string;
  endTime: string;
  subjectName: string;
  teacherName: string;
  roomNumber?: string | null;
  isCurrentPeriod?: boolean;
}

export interface TimetableDay {
  day: string;
  periods: TimetablePeriod[];
}

export interface AttendanceDayRecord {
  date: string;
  status: 'Present' | 'Absent' | 'Late' | 'Holiday' | 'HalfDay' | 'Leave';
}

export interface MonthlyAttendanceResponse {
  studentId: string;
  month: number;
  year: number;
  records: AttendanceDayRecord[];
  presentDays: number;
  absentDays: number;
  lateDays: number;
  leaveDays: number;
  totalWorkingDays: number;
  attendancePercent: number;
}

export interface StudentDashboardScheduleItem {
  subjectName: string;
  teacherName: string;
  startTime: string;
  endTime: string;
  periodNumber: number;
  isCurrentPeriod: boolean;
}

export interface AssignmentSummary {
  id: string;
  title: string;
  subjectName: string;
  dueDate: string;
  status: 'Pending' | 'Submitted' | 'Graded' | 'Late' | 'RevisionRequested';
  isOverdue: boolean;
}

export interface AttendanceSummary {
  status: string | null;
  presentDaysThisMonth: number;
  totalWorkingDaysThisMonth: number;
}

export interface StudentDashboardResponse {
  todaySchedule: StudentDashboardScheduleItem[];
  attendanceThisMonth: AttendanceSummary | null;
  latestResult: {
    examName: string;
    percentage: number;
    grade: string;
    remarks?: string | null;
    publishedAt: string;
  } | null;
  dueSoonAssignments: AssignmentSummary[];
  latestAnnouncement: {
    id: string;
    title: string;
    summary: string;
    createdAt: string;
  } | null;
  unreadCount: number;
}

export interface AssignmentDetail {
  id: string;
  title: string;
  description: string;
  subjectName: string;
  teacherName: string;
  dueDate: string;
  status: 'Pending' | 'Submitted' | 'Graded' | 'Late' | 'RevisionRequested';
  submissionType: 'Text' | 'File' | 'Both';
  maxMarks?: number | null;
  attachmentUrl?: string | null;
  submission?: {
    id: string;
    textContent?: string | null;
    fileUrl?: string | null;
    submittedAt: string;
    marks?: number | null;
    grade?: string | null;
    feedback?: string | null;
  } | null;
}

export interface SubmitAssignmentRequest {
  textContent?: string;
}

export interface ExamResultDetail {
  id: string;
  examId: string;
  examName: string;
  examDate: string;
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  grade: string;
  remarks?: string | null;
  subjects: {
    subjectName: string;
    maxMarks: number;
    obtainedMarks: number;
    grade: string;
    isPass: boolean;
  }[];
}

export interface ReportCardInfo {
  id: string;
  examId: string;
  examName: string;
  pdfUrl: string;
  generatedAt: string;
}

export interface FeeRecord {
  studentId: string;
  studentName: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  feeHeads: {
    feeHeadName: string;
    amount: number;
    pendingAmount: number;
  }[];
}

export interface LeaveRequest {
  id: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  appliedAt: string;
  reviewedAt?: string | null;
  remarks?: string | null;
}

export interface ApplyLeaveRequest {
  fromDate: string;
  toDate: string;
  reason: string;
}

export interface LibraryIssue {
  id: string;
  bookTitle: string;
  author: string;
  isbnNumber?: string | null;
  issuedDate: string;
  dueDate: string;
  returnedDate?: string | null;
  isOverdue: boolean;
  fine?: number | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── API functions ──────────────────────────────────────────────────────────

export const studentApi = {
  getDashboard: (): Promise<StudentDashboardResponse> =>
    apiClient.get('/mobile/student-dashboard'),

  getProfile: (): Promise<{
    id: string;
    name: string;
    email?: string | null;
    rollNumber: string;
    className: string;
    section: string;
    photoUrl?: string | null;
    dateOfBirth?: string | null;
    admissionNumber?: string | null;
  }> => apiClient.get('/students/me'),

  getTimetable: (classId: string): Promise<TimetableDay[]> =>
    apiClient.get('/timetable', { params: { classId } }),

  getAttendance: (month: number, year: number): Promise<MonthlyAttendanceResponse> =>
    apiClient.get('/attendance/my-attendance', { params: { month, year } }),

  getExamResults: (): Promise<ExamResult[]> =>
    apiClient.get('/examinations/results', { params: { studentId: 'me' } }),

  getExamResultDetail: (examId: string): Promise<ExamResultDetail> =>
    apiClient.get(`/examinations/results/${examId}`),

  getReportCards: (): Promise<ReportCardInfo[]> =>
    apiClient.get('/examinations/report-cards/me'),

  getAssignments: (status?: string): Promise<PaginatedResponse<AssignmentSummary>> =>
    apiClient.get('/assignments', {
      params: { studentId: 'me', status, pageSize: 50 },
    }),

  getAssignmentDetail: (id: string): Promise<AssignmentDetail> =>
    apiClient.get(`/assignments/${id}`),

  submitTextAssignment: (id: string, textContent: string): Promise<void> =>
    apiClient.post(`/assignments/${id}/submit`, { content: textContent }),

  submitFileAssignment: (id: string, formData: FormData): Promise<void> =>
    apiClient.post(`/assignments/${id}/submit`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getFeeRecords: (): Promise<FeeRecord> =>
    apiClient.get('/fees/records', { params: { studentId: 'me' } }),

  applyLeave: (data: ApplyLeaveRequest): Promise<LeaveRequest> =>
    apiClient.post('/attendance/leave-requests', data),

  getLeaveRequests: (): Promise<LeaveRequest[]> =>
    apiClient.get('/attendance/leave-requests', { params: { studentId: 'me' } }),

  getLibraryIssues: (): Promise<LibraryIssue[]> =>
    apiClient.get('/library/my-issues'),

  getAnnouncements: (page: number): Promise<PaginatedResponse<Announcement>> =>
    apiClient.get('/announcements', { params: { page, pageSize: 20 } }),

  getNotifications: (page: number): Promise<PaginatedResponse<AppNotification>> =>
    apiClient.get('/notifications/my', { params: { page, pageSize: 20 } }),

  markNotificationRead: (id: string): Promise<void> =>
    apiClient.put(`/notifications/${id}/read`),

  markAllNotificationsRead: (): Promise<void> =>
    apiClient.put('/notifications/read-all'),
};
