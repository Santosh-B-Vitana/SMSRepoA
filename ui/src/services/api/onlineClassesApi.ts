import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export type OnlineClassStatus = 'Scheduled' | 'Live' | 'Ended' | 'Cancelled';
export type OnlineClassAttendanceStatus =
  | 'Present'
  | 'PartiallyPresent'
  | 'Absent'
  | 'JoinedAndLeftImmediately';

export interface OnlineClassDto {
  id: string;
  title: string;
  description?: string;
  hostName: string;
  hostStaffId: string;
  subjectName?: string;
  className?: string;
  sectionName?: string;
  provider: string;
  meetingUrl?: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string;
  actualEnd?: string;
  status: OnlineClassStatus;
  maxParticipants: number;
  isRecordingEnabled: boolean;
  isInstant: boolean;
  academicYear: string;
  recordingCount: number;
  attendeeCount: number;
  createdAt: string;
}

export interface OnlineClassListResponse {
  items: OnlineClassDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ScheduleClassRequest {
  title: string;
  description?: string;
  subjectId?: string;
  classId?: string;
  sectionId?: string;
  scheduledStart: string;
  scheduledEnd: string;
  maxParticipants?: number;
  isRecordingEnabled?: boolean;
}

export interface AttendanceDto {
  studentId: string;
  studentName: string;
  rollNumber?: string;
  joinTime?: string;
  leaveTime?: string;
  totalDurationMinutes: number;
  joinCount: number;
  attendanceStatus: OnlineClassAttendanceStatus;
  isManualOverride: boolean;
}

export interface RecordingDto {
  id: string;
  classId: string;
  playbackUrl: string;
  downloadUrl?: string;
  durationSeconds: number;
  fileSizeMb: number;
  isTeacherRestricted: boolean;
  status: string;
  createdAt: string;
}

export interface JoinClassResponse {
  classId: string;
  roomName: string;
  token: string;
  wsUrl: string;
  meetingUrl?: string;
  isHost: boolean;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const onlineClassesApi = {
  getUpcoming: (page = 1, pageSize = 20) =>
    apiGet<OnlineClassListResponse>(`/online-classes/upcoming?page=${page}&pageSize=${pageSize}`),

  getToday: () => apiGet<OnlineClassDto[]>('/online-classes/today'),

  getById: (id: string) => apiGet<OnlineClassDto>(`/online-classes/${id}`),

  schedule: (data: ScheduleClassRequest) => apiPost<OnlineClassDto>('/online-classes', data),

  startInstant: (title?: string) =>
    apiPost<OnlineClassDto>('/online-classes/instant', { title }),

  cancel: (id: string) => apiPatch<void>(`/online-classes/${id}/cancel`, {}),

  end: (id: string) => apiPost<void>(`/online-classes/${id}/end`, {}),

  join: (id: string) => apiPost<JoinClassResponse>(`/online-classes/${id}/join`, {}),

  getAttendance: (id: string) =>
    apiGet<AttendanceDto[]>(`/online-classes/${id}/attendance`),

  overrideAttendance: (
    classId: string,
    studentId: string,
    status: OnlineClassAttendanceStatus,
    notes?: string,
  ) =>
    apiPatch<void>(`/online-classes/${classId}/attendance/${studentId}`, { status, notes }),

  getRecordings: (id: string) => apiGet<RecordingDto[]>(`/online-classes/${id}/recordings`),

  toggleRestrict: (classId: string, recordingId: string, isRestricted: boolean) =>
    apiPatch<void>(`/online-classes/${classId}/recordings/${recordingId}/restrict`, {
      isRestricted,
    }),

  deleteRecording: (classId: string, recordingId: string) =>
    apiDelete<void>(`/online-classes/${classId}/recordings/${recordingId}`),
};
