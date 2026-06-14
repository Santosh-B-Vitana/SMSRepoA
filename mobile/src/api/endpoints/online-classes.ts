import { apiClient } from '../client';
import type {
  OnlineClassDto,
  OnlineClassListResponse,
  ScheduleOnlineClassRequest,
  InstantClassRequest,
  JoinClassResponse,
  OnlineClassAttendanceDto,
  AttendanceOverrideRequest,
  RecordingDto,
} from '@/shared-types/api/online-classes';

export const onlineClassesApi = {
  // ── Listing ────────────────────────────────────────────────────────────────

  getUpcoming: (page = 1, pageSize = 20): Promise<OnlineClassListResponse> =>
    apiClient.get('/online-classes/upcoming', { params: { page, pageSize } }),

  getToday: (): Promise<OnlineClassDto[]> =>
    apiClient.get('/online-classes/today'),

  getById: (id: string): Promise<OnlineClassDto> =>
    apiClient.get(`/online-classes/${id}`),

  // ── Teacher actions ────────────────────────────────────────────────────────

  schedule: (data: ScheduleOnlineClassRequest): Promise<OnlineClassDto> =>
    apiClient.post('/online-classes', data),

  startInstant: (data?: InstantClassRequest): Promise<OnlineClassDto> =>
    apiClient.post('/online-classes/instant', data ?? {}),

  cancel: (id: string): Promise<void> =>
    apiClient.patch(`/online-classes/${id}/cancel`),

  end: (id: string): Promise<void> =>
    apiClient.post(`/online-classes/${id}/end`),

  // ── Join / Leave ───────────────────────────────────────────────────────────

  join: (id: string): Promise<JoinClassResponse> =>
    apiClient.post(`/online-classes/${id}/join`),

  // ── Attendance ─────────────────────────────────────────────────────────────

  getAttendance: (id: string): Promise<OnlineClassAttendanceDto[]> =>
    apiClient.get(`/online-classes/${id}/attendance`),

  overrideAttendance: (
    classId: string,
    studentId: string,
    data: AttendanceOverrideRequest,
  ): Promise<void> =>
    apiClient.patch(`/online-classes/${classId}/attendance/${studentId}`, data),

  // ── Recordings ────────────────────────────────────────────────────────────

  getRecordings: (id: string): Promise<RecordingDto[]> =>
    apiClient.get(`/online-classes/${id}/recordings`),

  toggleRestrict: (classId: string, recordingId: string, isRestricted: boolean): Promise<void> =>
    apiClient.patch(`/online-classes/${classId}/recordings/${recordingId}/restrict`, {
      isRestricted,
    }),

  deleteRecording: (classId: string, recordingId: string): Promise<void> =>
    apiClient.delete(`/online-classes/${classId}/recordings/${recordingId}`),
};
