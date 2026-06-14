import { apiClient } from '../client';

// ─── Shared types ────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Admin Dashboard ─────────────────────────────────────────────────────────

export interface PendingApprovalsDto {
  leaveRequests: number;
  admissionApplications: number;
  documentVerifications: number;
}

export interface BillingAlertDto {
  overdueCount: number;
  overdueAmount: number;
  alertMessage: string | null;
}

export interface FeeCollectionDto {
  collectedToday: number;
  collectedThisMonth: number;
}

export interface AnnouncementSummaryDto {
  id: string;
  title: string;
  summary: string;
  createdAt: string;
  category: string | null;
}

export interface AdminDashboardResponse {
  attendanceRate: number;
  feeCollection: FeeCollectionDto;
  pendingApprovals: PendingApprovalsDto;
  billingAlert: BillingAlertDto | null;
  recentAnnouncements: AnnouncementSummaryDto[];
  unreadCount: number;
}

// ─── Leave Requests ──────────────────────────────────────────────────────────

export interface AdminLeaveRequest {
  id: string;
  staffName?: string | null;
  studentName?: string | null;
  leaveTypeName: string;
  fromDate: string;
  toDate: string;
  days: number;
  remainingBalance: number;
  reason: string | null;
  status: 'Pending' | 'Approved' | 'Rejected';
  appliedAt: string;
}

// ─── Announcements ───────────────────────────────────────────────────────────

export interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: 'Low' | 'Normal' | 'High' | 'Urgent';
  audience: string;
  isActive: boolean;
  isPinned: boolean;
  createdAt: string;
  expiresAt: string | null;
  createdByName: string;
}

export interface CreateAnnouncementRequest {
  title: string;
  body: string;
  priority: 'Low' | 'Normal' | 'High' | 'Urgent';
  audience: 'All' | 'Parents' | 'Staff' | 'Students';
  classIds?: string[];
  expiresAt?: string | null;
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export interface AttendanceTrendPoint {
  date: string;
  rate: number;
}

export interface FeeBarPoint {
  date: string;
  amount: number;
}

export interface ClassAttendancePoint {
  className: string;
  rate: number;
}

export interface AnalyticsDashboard {
  attendanceTrend: AttendanceTrendPoint[];
  feeBarChart: FeeBarPoint[];
  classAttendance: ClassAttendancePoint[];
}

// ─── Search ──────────────────────────────────────────────────────────────────

export interface StudentSearchResult {
  id: string;
  fullName: string;
  rollNumber: string;
  className: string;
  sectionName: string;
  profilePhotoUrl: string | null;
}

export interface StaffSearchResult {
  id: string;
  fullName: string;
  designation: string;
  email: string;
  phone: string | null;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const adminApi = {
  getDashboard: (): Promise<AdminDashboardResponse> =>
    apiClient.get('/mobile/admin-dashboard'),

  getPendingLeaves: (type: 'staff' | 'student'): Promise<AdminLeaveRequest[]> => {
    if (type === 'student') {
      return apiClient.get('/leavemanagement/student-leaves', {
        params: { status: 'pending' },
      });
    }
    return apiClient.get('/leavemanagement/requests', {
      params: { status: 'pending' },
    });
  },

  approveLeave: (id: string, remark?: string): Promise<void> =>
    apiClient.put(`/leavemanagement/requests/${id}/approve`, { remark }),

  rejectLeave: (id: string, reason: string): Promise<void> =>
    apiClient.put(`/leavemanagement/requests/${id}/reject`, { reason }),

  getAnnouncements: (page = 1): Promise<PaginatedResponse<Announcement>> =>
    apiClient.get('/announcements', { params: { page, pageSize: 20 } }),

  createAnnouncement: (data: CreateAnnouncementRequest): Promise<Announcement> =>
    apiClient.post('/announcements', data),

  deleteAnnouncement: (id: string): Promise<void> =>
    apiClient.delete(`/announcements/${id}`),

  getAnalytics: (): Promise<AnalyticsDashboard> =>
    apiClient.get('/analytics/dashboard'),

  searchStudents: (
    query: string,
    page = 1,
  ): Promise<PaginatedResponse<StudentSearchResult>> =>
    apiClient.get('/students', { params: { search: query, page, pageSize: 15 } }),

  searchStaff: (
    query: string,
    page = 1,
  ): Promise<PaginatedResponse<StaffSearchResult>> =>
    apiClient.get('/staff', { params: { search: query, page, pageSize: 15 } }),
};
