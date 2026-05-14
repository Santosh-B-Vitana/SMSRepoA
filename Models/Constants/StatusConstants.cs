namespace SmsApi.Models.Constants
{
    /// <summary>
    /// Centralized constants to replace magic strings throughout the codebase.
    /// Prevents typos, enables IDE refactoring, and makes role/status changes safe.
    /// </summary>
    public static class StatusConstants
    {
        // ===== ROLES =====
        public static class Roles
        {
            public const string SuperAdmin   = "SuperAdmin";
            public const string Admin        = "Admin";
            public const string Principal    = "Principal";
            public const string Teacher      = "Teacher";
            public const string Staff        = "Staff";
            public const string Parent       = "Parent";
            public const string Student      = "Student";
        }

        /// <summary>Pre-built role group strings for [Authorize(Roles = ...)] attributes.</summary>
        public static class RoleGroups
        {
            public const string AdminOnly            = "Admin";
            public const string AdminPrincipal       = "Admin,Principal";
            public const string AdminPrincipalStaff  = "Admin,Principal,Staff";
            // NOTE: Role strings here MUST match the JWT role claim values produced by
            // TokenService.ResolveEffectiveRole. Designations with spaces are collapsed:
            //   "Transport Manager" designation → JWT role "TransportManager"
            //   "Hostel Warden" designation     → JWT role "HostelWarden"
            //   "Vice Principal" designation    → JWT role "Principal"
            //   "Front Desk Officer" designation→ JWT role "Receptionist"
            //   "Class Teacher" designation     → JWT role "Teacher"
            public const string AllStaff             = "Admin,Principal,Teacher,Staff,HRManager,Librarian,Accountant,TransportManager,HostelWarden,Receptionist";
            public const string AllInternal          = "SuperAdmin,Admin,Principal,Teacher,Staff,HRManager,Librarian,Accountant,TransportManager,HostelWarden,Receptionist";
            public const string AllRoles             = "SuperAdmin,Admin,Principal,Teacher,Staff,HRManager,Librarian,Accountant,TransportManager,HostelWarden,Receptionist,Parent,Student";
            public const string StudentView          = "Admin,Principal,Teacher,Staff,HRManager,Librarian,Accountant,TransportManager,HostelWarden,Receptionist,Parent,Student";
            public const string FeeManagement        = "Admin,Principal,Staff,Accountant";
            public const string ReportsView          = "Admin,Principal,Teacher,Staff,HRManager,Librarian,Accountant,TransportManager,HostelWarden,Receptionist";
            // Domain-specific role groups — use the exact JWT role values.
            public const string TransportManagement  = "Admin,Principal,TransportManager,Teacher,Staff";
            public const string HostelManagement     = "Admin,Principal,HostelWarden,Teacher,Staff";
            public const string AccountingAccess     = "Admin,Principal,Accountant,Teacher,Staff";
            public const string FrontDeskAccess      = "Admin,Principal,Receptionist,Teacher,Staff";
        }

        // ===== USER STATUS =====
        public static class UserStatus
        {
            public const string Active    = "active";
            public const string Inactive  = "inactive";
            public const string Locked    = "locked";
            public const string Suspended = "suspended";
        }

        // ===== STUDENT STATUS =====
        public static class StudentStatus
        {
            public const string Active      = "active";
            public const string Inactive    = "inactive";
            public const string Transferred = "transferred";
            public const string Graduated   = "graduated";
            public const string Withdrawn   = "withdrawn";
            public const string Suspended   = "suspended";
        }

        // ===== STAFF STATUS =====
        public static class StaffStatus
        {
            public const string Active     = "active";
            public const string Inactive   = "inactive";
            public const string OnLeave    = "on_leave";
            public const string Resigned   = "resigned";
            public const string Terminated = "terminated";
        }

        // ===== ATTENDANCE STATUS =====
        public static class AttendanceStatus
        {
            public const string Present          = "present";
            public const string Absent           = "absent";
            public const string Late             = "late";
            public const string Excused          = "excused";
            public const string HalfDay          = "half_day";
            public const string AbsentWithLeave  = "absent_with_leave";
            public const string OnLeave          = "on_leave";
        }

        // ===== FEE STATUS =====
        public static class FeeStatus
        {
            public const string Pending  = "pending";
            public const string Paid     = "paid";
            public const string Partial  = "partial";
            public const string Overdue  = "overdue";
            public const string Waived   = "waived";
        }

        // ===== PAYMENT STATUS =====
        public static class PaymentStatus
        {
            public const string Pending   = "pending";
            public const string Success   = "success";
            public const string Failed    = "failed";
            public const string Refunded  = "refunded";
        }

        // ===== ADMISSION STATUS =====
        public static class AdmissionStatus
        {
            public const string Draft     = "draft";
            public const string Pending   = "pending";
            public const string Approved  = "approved";
            public const string Rejected  = "rejected";
            public const string Enrolled  = "enrolled";
            public const string Waitlisted = "waitlisted";
        }

        // ===== LEAVE STATUS =====
        public static class LeaveStatus
        {
            public const string Pending  = "pending";
            public const string Approved = "approved";
            public const string Rejected = "rejected";
            public const string Cancelled = "cancelled";
        }

        // ===== EXAM STATUS =====
        public static class ExamStatus
        {
            public const string Draft     = "draft";
            public const string Published = "published";
            public const string Ongoing   = "ongoing";
            public const string Completed = "completed";
            public const string Cancelled = "cancelled";
        }

        // ===== SCHOOL STATUS =====
        public static class SchoolStatus
        {
            public const string Active    = "active";
            public const string Inactive  = "inactive";
            public const string Suspended = "suspended";
            public const string Trial     = "trial";
        }
    }
}
