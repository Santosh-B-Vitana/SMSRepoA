export const ACADEMIC_YEAR_HEADER = 'X-Academic-Year' as const;
export const CORRELATION_ID_HEADER = 'X-Correlation-ID' as const;
export const IST_TIMEZONE = 'Asia/Kolkata' as const;

export const USER_ROLES = {
  SUPER_ADMIN: 'SuperAdmin',
  ADMIN: 'Admin',
  PRINCIPAL: 'Principal',
  TEACHER: 'Teacher',
  STAFF: 'Staff',
  HR_MANAGER: 'HRManager',
  ACCOUNTANT: 'Accountant',
  LIBRARIAN: 'Librarian',
  TRANSPORT_MANAGER: 'TransportManager',
  HOSTEL_WARDEN: 'HostelWarden',
  RECEPTIONIST: 'Receptionist',
  PARENT: 'Parent',
  STUDENT: 'Student',
} as const;

export type UserRoleKey = keyof typeof USER_ROLES;
export type UserRoleValue = (typeof USER_ROLES)[UserRoleKey];

export const ATTENDANCE_STATUS = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  LATE: 'Late',
  HALF_DAY: 'HalfDay',
} as const;

export type AttendanceStatusKey = keyof typeof ATTENDANCE_STATUS;
export type AttendanceStatusValue = (typeof ATTENDANCE_STATUS)[AttendanceStatusKey];

export const PARENT_ROLES: UserRoleValue[] = ['Parent'];
export const TEACHER_ROLES: UserRoleValue[] = ['Teacher'];
export const STUDENT_ROLES: UserRoleValue[] = ['Student'];
export const ADMIN_ROLES: UserRoleValue[] = ['Admin', 'Principal', 'SuperAdmin'];

export const API_TIMEOUT_MS = 15000;
export const TOKEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000;
