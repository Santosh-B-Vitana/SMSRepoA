"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOKEN_REFRESH_THRESHOLD_MS = exports.API_TIMEOUT_MS = exports.ADMIN_ROLES = exports.STUDENT_ROLES = exports.TEACHER_ROLES = exports.PARENT_ROLES = exports.ATTENDANCE_STATUS = exports.USER_ROLES = exports.IST_TIMEZONE = exports.CORRELATION_ID_HEADER = exports.ACADEMIC_YEAR_HEADER = void 0;
exports.ACADEMIC_YEAR_HEADER = 'X-Academic-Year';
exports.CORRELATION_ID_HEADER = 'X-Correlation-ID';
exports.IST_TIMEZONE = 'Asia/Kolkata';
exports.USER_ROLES = {
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
};
exports.ATTENDANCE_STATUS = {
    PRESENT: 'Present',
    ABSENT: 'Absent',
    LATE: 'Late',
    HALF_DAY: 'HalfDay',
};
exports.PARENT_ROLES = ['Parent'];
exports.TEACHER_ROLES = ['Teacher'];
exports.STUDENT_ROLES = ['Student'];
exports.ADMIN_ROLES = ['Admin', 'Principal', 'SuperAdmin'];
exports.API_TIMEOUT_MS = 15000;
exports.TOKEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000;
//# sourceMappingURL=constants.js.map