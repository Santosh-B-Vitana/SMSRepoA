/**
 * Timetable API — connects to /api/timetable backend endpoints
 */
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TimetableRecord {
  id: string;
  schoolId: string;
  classId: string;
  sectionId?: string;
  academicYear: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimetableListResponse {
  timetables: TimetableRecord[];
  total: number;
}

export interface TimetablePeriod {
  id: string;
  timetableId: string;
  dayOfWeek: string;      // "Monday", "Tuesday", etc.
  periodNumber: number;
  startTime: string;      // "HH:MM:SS"
  endTime: string;
  subjectId?: string;
  teacherId?: string;
  periodType?: string;    // "class" | "break" | "lab" | "free"
  room?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimetablePeriodListResponse {
  periods: TimetablePeriod[];
  total: number;
}

export interface CreateTimetableRequest {
  SchoolId: string;
  ClassId: string;
  SectionId?: string;
  AcademicYear: string;
  Status?: string;
}

export interface CreatePeriodRequest {
  TimetableId: string;
  DayOfWeek: string;
  PeriodNumber: number;
  StartTime: string;    // "HH:MM:SS"
  EndTime: string;
  SubjectId?: string;
  TeacherId?: string;
  PeriodType?: string;
  Room?: string;
  Notes?: string;
}

export interface UpdatePeriodRequest {
  StartTime?: string;
  EndTime?: string;
  SubjectId?: string;
  TeacherId?: string;
  PeriodType?: string;
  Room?: string;
  Notes?: string;
}
export interface TeacherScheduleEntry {
  periodId: string;
  dayOfWeek: string;
  periodNumber: number;
  startTime: string;    // "HH:MM:SS"
  endTime: string;
  subjectId?: string;
  subjectName?: string;
  timetableId: string;
  classId: string;
  className?: string;
  sectionId?: string;
  sectionName?: string;
  periodType?: string;
  room?: string;
}

export interface TeacherScheduleResponse {
  teacherId: string;
  teacherName: string;
  schedule: TeacherScheduleEntry[];
  totalPeriods: number;
}
// ─── API service ──────────────────────────────────────────────────────────────

export const timetableApi = {
  list: (classId?: string, page = 1, pageSize = 50) =>
    apiGet<TimetableListResponse>('/timetable', { classId, page, pageSize }),

  getById: (id: string) =>
    apiGet<TimetableRecord>(`/timetable/${id}`),

  getDetail: (id: string) =>
    apiGet<{ timetable: TimetableRecord; periods: TimetablePeriod[] }>(`/timetable/${id}/detail`),

  create: (data: CreateTimetableRequest) =>
    apiPost<TimetableRecord>('/timetable', data),

  update: (id: string, data: Partial<CreateTimetableRequest>) =>
    apiPut<TimetableRecord>(`/timetable/${id}`, data),

  delete: (id: string) =>
    apiDelete<void>(`/timetable/${id}`),

  getPeriods: (timetableId: string) =>
    apiGet<TimetablePeriodListResponse>(`/timetable/${timetableId}/periods`),

  createPeriod: (data: CreatePeriodRequest) =>
    apiPost<TimetablePeriod>('/timetable/periods', data),

  updatePeriod: (id: string, data: UpdatePeriodRequest) =>
    apiPut<TimetablePeriod>(`/timetable/periods/${id}`, data),

  deletePeriod: (id: string) =>
    apiDelete<void>(`/timetable/periods/${id}`),

  /** Get the calling teacher's own schedule (auto-resolved from JWT email) */
  getMySchedule: () =>
    apiGet<TeacherScheduleResponse>('/timetable/my-schedule'),

  /** Get any teacher's schedule by Staff.Id (admin/principal use) */
  getTeacherSchedule: (teacherId: string) =>
    apiGet<TeacherScheduleResponse>(`/timetable/teacher/${teacherId}`),
};
