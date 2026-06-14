import { apiClient } from '../client';
import type { AppNotification } from '@vitana/shared-types';

// ─── Examinations ────────────────────────────────────────────────────────────

export interface ExamSetupBasicDto {
  id: string;
  name: string;
  examType: string;
  className: string;
  classId: string;
  academicYear: string;
  status: string;
  myAssignedSubjectIds: string[];
}

export interface StudentMarksRowDto {
  studentId: string;
  studentName: string;
  rollNumber: string | null;
  admissionNumber: string | null;
  marksEntryId: string | null;
  theoryMarks: number | null;
  practicalMarks: number | null;
  internalMarks: number | null;
  obtainedMarks: number | null;
  isAbsent: boolean;
  grade: string | null;
  percentage: number | null;
  isPass: boolean;
  remarks: string | null;
  status: string;
}

export interface MarksEntrySheetDto {
  examSetupId: string;
  examSetupSubjectId: string;
  examName: string;
  subjectName: string;
  subjectCode: string | null;
  maxTheoryMarks: number;
  maxPracticalMarks: number;
  maxInternalMarks: number;
  maxTotalMarks: number;
  passingMarks: number;
  isLocked: boolean;
  status: string;
  rows: StudentMarksRowDto[];
}

export interface SingleStudentMarksDto {
  studentId: string;
  theoryMarks?: number | null;
  practicalMarks?: number | null;
  internalMarks?: number | null;
  isAbsent: boolean;
  remarks?: string | null;
}

export interface BulkMarksEntryPayload {
  examSetupId: string;
  examSetupSubjectId: string;
  entries: SingleStudentMarksDto[];
}

export interface BulkOperationResult {
  successCount: number;
  failureCount: number;
  errors: string[];
}

// ─── Assignments ─────────────────────────────────────────────────────────────

export interface AssignmentDto {
  id: string;
  title: string;
  description: string | null;
  subjectName: string | null;
  className: string | null;
  dueDate: string;
  maxMarks: number | null;
  status: string;
  submissionCount: number;
  pendingGradingCount: number;
  createdAt: string;
}

export interface CreateAssignmentPayload {
  title: string;
  description?: string | null;
  classId: string;
  subjectId?: string | null;
  dueDate: string;
  maxMarks?: number | null;
  attachmentUrl?: string | null;
}

export interface SubmissionDto {
  id: string;
  studentId: string;
  studentName: string;
  submittedAt: string | null;
  status: string;
  marksObtained: number | null;
  feedback: string | null;
  attachmentUrl: string | null;
}

export interface GradeSubmissionPayload {
  marksObtained: number;
  feedback: string;
}

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
  dayOfWeek?: string;
}

export interface TeacherScheduleEntry {
  periodId: string;
  dayOfWeek: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  subjectId?: string;
  subjectName?: string;
  classId: string;
  className?: string;
  sectionName?: string;
  room?: string;
}

export interface TeacherFullScheduleResponse {
  teacherId: string;
  teacherName: string;
  schedule: TeacherScheduleEntry[];
  totalPeriods: number;
}

export interface TeacherAssignment {
  classId: string;
  className: string;
  subjects: string[];
  isClassTeacher?: boolean;
  sectionName?: string;
}

export interface TeacherDashboardResponse {
  todaySchedule: TimetableEntry[];
  pendingLeaveCount: number;
  classesStatus: {
    classId?: string | null;
    className: string;
    section?: string | null;
    attendanceMarked?: boolean; // legacy field name
    isMarked?: boolean;         // actual API field name
    totalStudents?: number;
    presentCount?: number;
  }[];
  unreadCount?: number;
  unreadNotificationCount?: number;
  pendingAssignmentSubmissions?: number;
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
  maxDaysPerYear: number;
  isCarryForward: boolean;
  isPaid: boolean;
}

export interface LeaveBalanceResponse {
  id: string;
  leaveTypeId: string;
  leaveTypeName: string;
  academicYear: string;
  totalAllowed: number;
  used: number;
  available: number;
  carriedForward: number;
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

  getFullSchedule: (): Promise<TeacherFullScheduleResponse> =>
    apiClient.get('/timetable/my-schedule'),

  getTeacherAssignments: (): Promise<TeacherAssignment[]> =>
    (apiClient.get('/academics/my-class-assignments') as Promise<Array<{
      classId: string;
      className: string;
      sectionId: string | null;
      sectionName: string | null;
      subjectName: string | null;
      status: string;
    }>>).then((list) => {
      // Group by classId+sectionId so each card = one class (aggregating subjects)
      const map = new Map<string, TeacherAssignment>();
      for (const item of list) {
        if (item.status?.toLowerCase() === 'inactive') continue;
        const key = item.sectionId ? `${item.classId}-${item.sectionId}` : item.classId;
        if (!map.has(key)) {
          map.set(key, {
            classId: item.classId,
            className: item.sectionName
              ? `${item.className} - ${item.sectionName}`
              : item.className,
            subjects: [],
          });
        }
        const entry = map.get(key)!;
        if (item.subjectName && !entry.subjects.includes(item.subjectName)) {
          entry.subjects.push(item.subjectName);
        }
      }
      return Array.from(map.values());
    }),

  getClassStudents: (classId: string): Promise<MinimalStudent[]> =>
    (apiClient.get('/students', { params: { classId, minimal: true, pageSize: 100 } }) as Promise<{
      students?: Array<{ id: string; firstName: string; lastName: string; rollNumber: string; profilePhotoUrl?: string | null; photoUrl?: string | null }>;
      items?: MinimalStudent[];
    } | MinimalStudent[]>).then((res) => {
      if (Array.isArray(res)) return res;
      const list = res?.students ?? res?.items ?? [];
      return list.map((s) => ({
        id: s.id,
        firstName: s.firstName ?? '',
        lastName: s.lastName ?? '',
        rollNumber: s.rollNumber ?? '',
        photoUrl: (s as any).profilePhotoUrl ?? (s as any).photoUrl ?? null,
      }));
    }),

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
    apiClient.post('/leavemanagement/requests', data),

  getOwnLeaves: (): Promise<OwnLeaveApplication[]> =>
    (apiClient.get('/leavemanagement/my-requests') as Promise<unknown>).then((res) => {
      if (Array.isArray(res)) return res as OwnLeaveApplication[];
      if (res && typeof res === 'object') {
        const obj = res as Record<string, unknown>;
        const arr = obj.items ?? obj.requests ?? obj.data ?? obj.leaves ?? [];
        return Array.isArray(arr) ? (arr as OwnLeaveApplication[]) : [];
      }
      return [];
    }),

  getLeaveTypes: (): Promise<LeaveType[]> =>
    (apiClient.get('/leavemanagement/types') as Promise<unknown>).then((res) => {
      if (Array.isArray(res)) return res as LeaveType[];
      if (res && typeof res === 'object') {
        const obj = res as Record<string, unknown>;
        const arr = obj.items ?? obj.types ?? obj.data ?? [];
        return Array.isArray(arr) ? (arr as LeaveType[]) : [];
      }
      return [];
    }),

  getLeaveBalance: (): Promise<LeaveBalanceResponse[]> =>
    (apiClient.get('/leavemanagement/my-balance') as Promise<unknown>).then((res) => {
      if (Array.isArray(res)) return res as LeaveBalanceResponse[];
      if (res && typeof res === 'object') {
        const obj = res as Record<string, unknown>;
        const arr = obj.items ?? obj.balances ?? obj.data ?? [];
        return Array.isArray(arr) ? (arr as LeaveBalanceResponse[]) : [];
      }
      return [];
    }),

  getNotifications: (page: number): Promise<PaginatedResponse<AppNotification>> =>
    (apiClient.get('/notifications/my', { params: { page, pageSize: 20 } }) as Promise<Record<string, unknown>>).then(
      (res) => ({
        items: (res?.notifications ?? res?.items ?? []) as AppNotification[],
        totalCount: (res?.total ?? res?.totalCount ?? 0) as number,
        page: (res?.page ?? page) as number,
        pageSize: (res?.pageSize ?? 20) as number,
        totalPages: (res?.totalPages ?? 1) as number,
      }),
    ),

  markNotificationRead: (id: string): Promise<void> =>
    apiClient.put(`/notifications/${id}/read`),

  markAllNotificationsRead: (): Promise<void> =>
    apiClient.put('/notifications/read-all'),

  // ── Examinations ──────────────────────────────────────────────────────────

  getMyExamAssignments: (academicYear?: string): Promise<ExamSetupBasicDto[]> =>
    apiClient.get('/examinations/exam-setup/my-assignments', {
      params: academicYear ? { academicYear } : undefined,
    }),

  getMarksSheet: (examSetupId: string, examSetupSubjectId: string): Promise<MarksEntrySheetDto> =>
    apiClient.get(
      `/examinations/exam-setup/${examSetupId}/subjects/${examSetupSubjectId}/marks`,
    ),

  saveBulkMarks: (
    examSetupId: string,
    examSetupSubjectId: string,
    payload: BulkMarksEntryPayload,
    idempotencyKey: string,
  ): Promise<BulkOperationResult> =>
    apiClient.post(
      `/examinations/exam-setup/${examSetupId}/subjects/${examSetupSubjectId}/marks`,
      payload,
      { headers: { 'X-Idempotency-Key': idempotencyKey } },
    ),

  // ── Assignments ───────────────────────────────────────────────────────────

  getMyAssignments: (): Promise<AssignmentDto[]> =>
    (apiClient.get('/assignments') as Promise<{
      assignments: Array<{
        id: string; title: string; description: string | null;
        subjectName: string | null; className: string | null;
        dueDate: string; maxMarks: number | null; status: string;
        submissionCount: number; gradedCount: number; createdAt: string;
      }>;
    }>).then((res) => {
      const list = res?.assignments ?? [];
      return list.map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        subjectName: a.subjectName,
        className: a.className,
        dueDate: a.dueDate,
        maxMarks: a.maxMarks,
        status: a.status ?? '',
        submissionCount: a.submissionCount ?? 0,
        pendingGradingCount: Math.max(0, (a.submissionCount ?? 0) - (a.gradedCount ?? 0)),
        createdAt: a.createdAt,
      }));
    }),

  createAssignment: (data: CreateAssignmentPayload): Promise<AssignmentDto> =>
    apiClient.post('/assignments', data),

  getSubmissions: (assignmentId: string): Promise<SubmissionDto[]> =>
    apiClient.get(`/assignments/${assignmentId}/submissions`),

  gradeSubmission: (
    submissionId: string,
    data: GradeSubmissionPayload,
  ): Promise<SubmissionDto> =>
    apiClient.put(`/assignments/submissions/${submissionId}/grade`, data),
};
