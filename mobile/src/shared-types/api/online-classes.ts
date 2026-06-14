// ─── Enums (mirror backend) ───────────────────────────────────────────────────

export type OnlineClassStatus = 'Scheduled' | 'Live' | 'Ended' | 'Cancelled';
export type MeetingProvider = 'LiveKit' | 'Zoom' | 'Jitsi';
export type OnlineClassAttendanceStatus =
  | 'Present'
  | 'PartiallyPresent'
  | 'Absent'
  | 'JoinedAndLeftImmediately';

// ─── Core DTOs ────────────────────────────────────────────────────────────────

export interface OnlineClassDto {
  id: string;
  title: string;
  description?: string;
  hostName: string;
  hostStaffId: string;
  subjectName?: string;
  className?: string;
  sectionName?: string;
  provider: MeetingProvider;
  meetingUrl?: string;
  scheduledStart: string; // ISO 8601 UTC
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

// ─── Requests ─────────────────────────────────────────────────────────────────

export interface ScheduleOnlineClassRequest {
  title: string;
  description?: string;
  subjectId?: string;
  classId?: string;
  sectionId?: string;
  scheduledStart: string; // ISO 8601 UTC
  scheduledEnd: string;
  maxParticipants?: number;
  isRecordingEnabled?: boolean;
}

export interface InstantClassRequest {
  title?: string;
}

export interface AttendanceOverrideRequest {
  status: OnlineClassAttendanceStatus;
  notes?: string;
}

// ─── Join Response ────────────────────────────────────────────────────────────

export interface JoinClassResponse {
  classId: string;
  roomName: string;
  token: string;
  wsUrl: string;
  meetingUrl?: string;
  isHost: boolean;
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export interface OnlineClassAttendanceDto {
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

// ─── Recordings ───────────────────────────────────────────────────────────────

export interface RecordingDto {
  id: string;
  classId: string;
  classTitle: string;
  playbackUrl: string;
  downloadUrl?: string;
  durationSeconds: number;
  fileSizeMb: number;
  isTeacherRestricted: boolean;
  status: string;
  createdAt: string;
}
