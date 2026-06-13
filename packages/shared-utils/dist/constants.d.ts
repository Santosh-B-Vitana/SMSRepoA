export declare const ACADEMIC_YEAR_HEADER: "X-Academic-Year";
export declare const CORRELATION_ID_HEADER: "X-Correlation-ID";
export declare const IST_TIMEZONE: "Asia/Kolkata";
export declare const USER_ROLES: {
    readonly SUPER_ADMIN: "SuperAdmin";
    readonly ADMIN: "Admin";
    readonly PRINCIPAL: "Principal";
    readonly TEACHER: "Teacher";
    readonly STAFF: "Staff";
    readonly HR_MANAGER: "HRManager";
    readonly ACCOUNTANT: "Accountant";
    readonly LIBRARIAN: "Librarian";
    readonly TRANSPORT_MANAGER: "TransportManager";
    readonly HOSTEL_WARDEN: "HostelWarden";
    readonly RECEPTIONIST: "Receptionist";
    readonly PARENT: "Parent";
    readonly STUDENT: "Student";
};
export type UserRoleKey = keyof typeof USER_ROLES;
export type UserRoleValue = (typeof USER_ROLES)[UserRoleKey];
export declare const ATTENDANCE_STATUS: {
    readonly PRESENT: "Present";
    readonly ABSENT: "Absent";
    readonly LATE: "Late";
    readonly HALF_DAY: "HalfDay";
};
export type AttendanceStatusKey = keyof typeof ATTENDANCE_STATUS;
export type AttendanceStatusValue = (typeof ATTENDANCE_STATUS)[AttendanceStatusKey];
export declare const PARENT_ROLES: UserRoleValue[];
export declare const TEACHER_ROLES: UserRoleValue[];
export declare const STUDENT_ROLES: UserRoleValue[];
export declare const ADMIN_ROLES: UserRoleValue[];
export declare const API_TIMEOUT_MS = 15000;
export declare const TOKEN_REFRESH_THRESHOLD_MS: number;
//# sourceMappingURL=constants.d.ts.map