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
  totalStudents: number;
  activeStudents: number;
  totalStaff: number;
  activeStaff: number;
  totalClasses: number;
}

// ─── Leave Requests ──────────────────────────────────────────────────────────

export interface AdminLeaveRequest {
  id: string;
  /** 'staff' = came from /leavemanagement/requests, 'student' = came from /leavemanagement/student-leaves */
  leaveSource: 'staff' | 'student';
  staffName?: string | null;
  studentName?: string | null;
  /** Extra context for student leaves */
  className?: string | null;
  leaveTypeName: string;
  fromDate: string;
  toDate: string;
  days: number;
  remainingBalance: number;
  reason: string | null;
  status: 'Pending' | 'Approved' | 'Rejected';
  appliedAt: string;
}

// ─── Admissions ───────────────────────────────────────────────────────────────

export type AdmissionStatus = 'Inquiry' | 'Applied' | 'Shortlisted' | 'Interview' | 'Approved' | 'Enrolled' | 'Rejected' | 'Withdrawn';

export interface AdmissionApplication {
  id: string;
  applicationNumber: string;
  studentName: string;
  dateOfBirth: string | null;
  gender: string | null;
  gradeApplied: string | null;
  parentName: string | null;
  parentPhone: string | null;
  parentEmail: string | null;
  status: AdmissionStatus;
  /** Backend may serialize as submittedAt or applicationDate depending on version */
  submittedAt: string;
  applicationDate?: string;
  remarks: string | null;
}

export interface CreateAdmissionRequest {
  studentName: string;
  dateOfBirth?: string;
  gender?: string;
  gradeApplied?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  remarks?: string;
}

// ─── Student management ───────────────────────────────────────────────────────

export interface CreateStudentPayload {
  name: string;
  firstName?: string;
  lastName?: string;
  admissionNumber: string;
  dateOfBirth?: string;
  gender?: string;
  class?: string;
  section?: string;
  rollNumber?: string;
  primaryPhone?: string;
  email?: string;
  guardianName?: string;
  guardianRelation?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  academicYear?: string;
}

// ─── Announcements ───────────────────────────────────────────────────────────

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'Low' | 'Normal' | 'High' | 'Urgent';
  targetAudience: string;
  isActive: boolean;
  isPinned: boolean;
  createdAt: string;
  expiryDate: string | null;
  createdByStaffName: string | null;
  totalRecipients: number;
  readCount: number;
  unreadCount: number;
}

export interface CreateAnnouncementRequest {
  title: string;
  content: string;
  priority: 'Low' | 'Normal' | 'High' | 'Urgent';
  targetAudience: 'All' | 'Parents' | 'Staff' | 'Students';
  targetClassId?: string | null;
  expiryDate?: string | null;
  isPinned?: boolean;
}

export interface WhatsAppBroadcastResult {
  success: boolean;
  recipientsQueued: number;
  totalContacts?: number;
  skipped?: number;
  aiFormatted: boolean;
  messagePreview: string;
  templateCategory: string;
  message?: string;
}

export interface CrmBroadcastRequest {
  /** Phone numbers in E.164 or local format — backend normalises */
  recipients: string[];
  /** Free-form message — AI converts to WhatsApp utility format */
  message: string;
  /** Optional subject/title used as announcement heading */
  subject?: string;
  /** Recipient display name (shown in template greeting) */
  recipientName?: string;
}

export interface CrmParent {
  id: string;
  name: string;
  phone: string;
  studentName?: string;
  className?: string;
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
  // Overview stats from /analytics/overview
  totalStudents?: number;
  activeStudents?: number;
  totalStaff?: number;
  activeStaff?: number;
  totalClasses?: number;
  todayAttendancePercentage?: number;
  totalBooks?: number;
  booksIssued?: number;
  pendingAdmissions?: number;
  hostelOccupied?: number;
  transportStudents?: number;
  // Chart data (may be empty if backend doesn't provide)
  attendanceTrend?: AttendanceTrendPoint[];
  feeBarChart?: FeeBarPoint[];
  classAttendance?: ClassAttendancePoint[];
}

// ─── Academics ───────────────────────────────────────────────────────────────

export interface ClassItem {
  id: string;
  /** Full display name returned by the backend, e.g. "Class 1 A" */
  name: string;
  standard: string;
  /** Alias that may come from older API versions — prefer `name` */
  displayName?: string;
  section?: string;
  academicYear: string;
  totalStudents?: number;
  classTeacher?: string | null;
}

export interface SectionItem {
  id: string;
  name: string;
  classId: string;
  className: string;
}

export interface ClassSubjectItem {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  teacherId: string | null;
  teacherName: string | null;
}

export interface TeacherAssignmentItem {
  id: string;
  staffId: string;
  staffName: string;
  classId: string;
  className: string;
  sectionId: string | null;
  sectionName: string | null;
  subjectId: string | null;
  subjectName: string | null;
  isClassTeacher: boolean;
  academicYear: string;
  status: string;
}

export interface AssignTeacherRequest {
  staffId: string;
  classId: string;
  sectionId?: string | null;
  subjectId?: string | null;
  isClassTeacher?: boolean;
  academicYear: string;
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
      return (
        apiClient.get('/leavemanagement/student-leaves', {
          params: { status: 'pending', pageSize: 50 },
        }) as Promise<{ items: any[] }>
      ).then((res) =>
        (res?.items ?? []).map((item: any): AdminLeaveRequest => ({
          id: item.id,
          leaveSource: 'student',
          studentName: item.studentName ?? item.applicantName,
          staffName: undefined,
          className: item.className,
          leaveTypeName: item.leaveTypeName ?? '',
          fromDate: item.startDate,
          toDate: item.endDate,
          days: item.totalDays ?? 0,
          remainingBalance: 0,
          reason: item.reason,
          status: item.status,
          appliedAt: item.applicationDate ?? item.createdAt,
        })),
      );
    }
    return (
      apiClient.get('/leavemanagement/requests', {
        params: { status: 'pending', pageSize: 50 },
      }) as Promise<{ items: any[] }>
    ).then((res) =>
      (res?.items ?? []).map((item: any): AdminLeaveRequest => ({
        id: item.id,
        leaveSource: 'staff',
        // Try multiple possible name fields the backend may return
        staffName: item.applicantName ?? item.staffName ?? item.staffFullName
          ?? (item.firstName && item.lastName ? `${item.firstName} ${item.lastName}`.trim() : null)
          ?? item.email ?? 'Staff Member',
        studentName: undefined,
        leaveTypeName: item.leaveTypeName ?? item.leaveType ?? '',
        fromDate: item.startDate ?? item.fromDate,
        toDate: item.endDate ?? item.toDate,
        days: item.totalDays ?? item.days ?? 0,
        remainingBalance: item.remainingBalance ?? 0,
        reason: item.reason,
        status: item.status,
        appliedAt: item.applicationDate ?? item.appliedAt ?? item.createdAt,
      })),
    );
  },

  approveLeave: (id: string, remark?: string): Promise<void> =>
    apiClient.put(`/leavemanagement/requests/${id}/approve`, { remark }),

  rejectLeave: (id: string, reason: string): Promise<void> =>
    apiClient.put(`/leavemanagement/requests/${id}/reject`, { reason }),

  approveStudentLeave: (id: string, remark?: string): Promise<void> =>
    apiClient.post(`/leavemanagement/student-leaves/${id}/approve`, { remark }),

  rejectStudentLeave: (id: string, reason: string): Promise<void> =>
    apiClient.post(`/leavemanagement/student-leaves/${id}/reject`, { reason }),

  getAnnouncements: (page = 1): Promise<PaginatedResponse<Announcement>> =>
    apiClient.get('/announcements', { params: { page, pageSize: 20 } }),

  createAnnouncement: (data: CreateAnnouncementRequest): Promise<Announcement> =>
    apiClient.post('/announcements', data),

  deleteAnnouncement: (id: string): Promise<void> =>
    apiClient.delete(`/announcements/${id}`),

  editAnnouncement: (id: string, data: CreateAnnouncementRequest): Promise<Announcement> =>
    apiClient.put(`/announcements/${id}`, data),

  /**
   * AI-format the announcement via Groq, then queue WhatsApp utility messages
   * for all relevant parents / staff. Returns queue stats.
   */
  broadcastAnnouncementWhatsApp: (id: string): Promise<WhatsAppBroadcastResult> =>
    apiClient.post(`/announcements/${id}/broadcast-whatsapp`),

  /**
   * Send a targeted WhatsApp utility message to a custom list of phone numbers.
   * Groq AI formats the raw message. Used for CRM-style admin broadcasts.
   */
  crmBroadcastWhatsApp: (request: CrmBroadcastRequest): Promise<WhatsAppBroadcastResult> =>
    apiClient.post('/whatsapp/crm-broadcast', request),

  getAnalytics: (): Promise<AnalyticsDashboard> =>
    apiClient.get('/analytics/overview'),

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

  createStudent: (data: CreateStudentPayload): Promise<{ id: string }> =>
    apiClient.post('/students', data),

  getAdmissions: (
    page = 1,
    status?: string,
  ): Promise<PaginatedResponse<AdmissionApplication>> =>
    apiClient.get('/admissions/applications', { params: { page, pageSize: 20, status } }),

  createAdmission: (data: CreateAdmissionRequest): Promise<AdmissionApplication> =>
    apiClient.post('/admissions/applications', data),

  updateAdmissionStatus: (
    id: string,
    status: AdmissionStatus,
    remarks?: string,
  ): Promise<AdmissionApplication> =>
    apiClient.put(`/admissions/applications/${id}/status`, { status, remarks }),

  getClasses: (): Promise<{ classes: ClassItem[]; totalCount: number }> =>
    apiClient.get('/academics/classes', { params: { page: 1, pageSize: 100 } }),

  getSections: (classId: string): Promise<{ sections: SectionItem[]; totalCount: number }> =>
    apiClient.get('/academics/sections', { params: { classId, page: 1, pageSize: 50 } }),

  getClassSubjects: (classId: string): Promise<ClassSubjectItem[]> =>
    apiClient.get(`/academics/classes/${classId}/subjects`),

  getTeacherAssignmentsForStaff: (
    staffId: string,
  ): Promise<{ assignments: TeacherAssignmentItem[]; total: number }> =>
    apiClient.get('/academics/teacher-assignments', { params: { staffId, pageSize: 100 } }),

  assignTeacher: (data: AssignTeacherRequest): Promise<TeacherAssignmentItem> =>
    apiClient.post('/academics/teacher-assignments', data),

  removeTeacherAssignment: (id: string): Promise<void> =>
    apiClient.delete(`/academics/teacher-assignments/${id}`),
};
