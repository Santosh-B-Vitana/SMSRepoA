import { apiClient } from '../client';
import type { Announcement, AppNotification, ExamResult, ReportCard } from '@vitana/shared-types';

// ─── Local response types matching backend DTOs ────────────────────────────

export interface ChildSummaryDto {
  id: string;
  studentName: string;
  className: string;
  rollNumber: string;
  photoUrl?: string | null;
}

export interface MobileAttendanceSummaryDto {
  status: 'Present' | 'Absent' | 'Late' | 'HalfDay' | null;
  presentDays: number;
  totalDays: number;
}

export interface FeesSummaryDto {
  totalDue: number;
  totalPaid: number;
  outstanding: number;
  nextDueDate?: string | null;
  hasOverdue: boolean;
}

export interface LatestResultDto {
  examName: string;
  percentage: number;
  grade: string;
  remarks?: string | null;
}

export interface AnnouncementSummaryDto {
  id: string;
  title: string;
  publishedAt: string;
}

export interface ParentDashboardResponse {
  children: ChildSummaryDto[];
  selectedChildId: string | null;
  todayAttendance: MobileAttendanceSummaryDto | null;
  feeSummary: FeesSummaryDto | null;
  latestResult: LatestResultDto | null;
  latestAnnouncement: AnnouncementSummaryDto | null;
  unreadNotificationCount: number;
}

export interface AttendanceDayRecord {
  date: string;
  status: 'Present' | 'Absent' | 'Late' | 'Holiday' | 'HalfDay';
}

export interface MonthlyAttendanceResponse {
  studentId: string;
  month: number;
  year: number;
  records: AttendanceDayRecord[];
  presentDays: number;
  absentDays: number;
  lateDays: number;
  totalWorkingDays: number;
  attendancePercent: number;
}

export interface FeeHeadDetail {
  feeHeadId: string;
  feeHeadName: string;
  amount: number;
  pendingAmount: number;
  isConcession: boolean;
  concessionType?: string | null;
}

export interface StudentFeeRecord {
  studentId: string;
  studentName: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  lateFeeAmount: number;
  feeHeads: FeeHeadDetail[];
}

export interface MobilePaymentInitResponse {
  cfOrderId: string;
  paymentSessionId: string;
  amount: number;
  currency: string;
  expiresAt: string;
}

export interface PaymentHistoryRecord {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMode: string;
  receiptNumber: string;
  status: 'Success' | 'Failed' | 'Pending';
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DiaryEntry {
  id: string;
  date: string;
  content: string;
  subjectName?: string | null;
  teacherName: string;
  attachmentUrl?: string | null;
}

export interface LeaveRequest {
  id: string;
  studentId: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  appliedAt: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  remarks?: string | null;
}

export interface ApplyLeaveRequest {
  studentId: string;
  fromDate: string;
  toDate: string;
  reason: string;
}

// ─── API functions ─────────────────────────────────────────────────────────

export const parentApi = {
  getDashboard: (): Promise<ParentDashboardResponse> =>
    apiClient.get('/mobile/parent-dashboard'),

  getMyChildren: (): Promise<ChildSummaryDto[]> =>
    apiClient.get('/students/my-children'),

  getAttendance: (
    studentId: string,
    month: number,
    year: number,
  ): Promise<MonthlyAttendanceResponse> =>
    apiClient.get('/attendance/students', { params: { studentId, month, year } }),

  getFeeRecords: (studentId: string): Promise<StudentFeeRecord> =>
    apiClient.get('/fees/records', { params: { studentId } }),

  initiateMobilePayment: (
    studentId: string,
    amount: number,
  ): Promise<MobilePaymentInitResponse> =>
    apiClient.post('/fees/payments/mobile-initiate', { studentId, amount }),

  verifyPayment: (transactionId: string, paymentId: string): Promise<{ status: string }> =>
    apiClient.post(`/fees/transactions/${transactionId}/verify`, { paymentId }),

  getPaymentHistory: (studentId: string): Promise<PaymentHistoryRecord[]> =>
    apiClient.get('/fees/payments/gateway/transactions', { params: { payerId: studentId } }),

  getPaymentReceipt: (paymentId: string): Promise<{ pdfUrl: string }> =>
    apiClient.get(`/fees/payments/${paymentId}/receipt`),

  getExamResults: (studentId: string): Promise<ExamResult[]> =>
    apiClient.get('/examinations/results', { params: { studentId } }),

  getReportCard: (studentId: string): Promise<ReportCard> =>
    apiClient.get(`/examinations/report-cards/${studentId}`),

  getAnnouncements: (page: number): Promise<PaginatedResponse<Announcement>> =>
    apiClient.get('/announcements/for-parent', { params: { page, pageSize: 20 } }),

  getDiaryEntries: (studentId: string, page: number): Promise<PaginatedResponse<DiaryEntry>> =>
    apiClient.get(`/diary/parent/child/${studentId}`, { params: { page, pageSize: 20 } }),

  applyLeave: (data: ApplyLeaveRequest): Promise<LeaveRequest> =>
    apiClient.post('/leavemanagement/student-leave', data),

  getLeaveRequests: (studentId: string): Promise<LeaveRequest[]> =>
    apiClient.get('/leavemanagement/student-leave/my-children', { params: { studentId } }),

  getNotifications: (page: number): Promise<PaginatedResponse<AppNotification>> =>
    apiClient.get('/notifications/my', { params: { page, pageSize: 20 } }),

  markNotificationRead: (id: string): Promise<void> =>
    apiClient.put(`/notifications/${id}/read`),

  markAllRead: (): Promise<void> => apiClient.put('/notifications/read-all'),
};
