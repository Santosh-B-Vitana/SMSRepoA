using MediatR;

namespace SmsApi.Features.WhatsApp.Notifications;

// ── Domain notifications published by existing module services ─────────────────
// These are published using MediatR.IMediator.Publish() from the service layer.
// WhatsApp handlers subscribe to each of these via INotificationHandler<T>.

// ── Attendance ────────────────────────────────────────────────────────────────

public sealed record StudentMarkedAbsentNotification(
    Guid SchoolId,
    Guid StudentId,
    string StudentName,
    string GuardianName,
    string GuardianPhone,
    string Class,
    string Section,
    DateOnly AttendanceDate
) : INotification;

public sealed record AttendanceShortageNotification(
    Guid SchoolId,
    Guid StudentId,
    string StudentName,
    string GuardianPhone,
    string Class,
    decimal AttendancePct
) : INotification;

// ── Fee Management ────────────────────────────────────────────────────────────

public sealed record FeeDueReminderNotification(
    Guid SchoolId,
    Guid StudentId,
    string StudentName,
    string GuardianPhone,
    string Class,
    decimal AmountDue,
    DateTime DueDate,
    string AcademicYear
) : INotification;

public sealed record FeePaymentReceivedNotification(
    Guid SchoolId,
    Guid StudentId,
    string StudentName,
    string GuardianPhone,
    decimal AmountPaid,
    string ReceiptNumber,
    string AcademicYear
) : INotification;

public sealed record FeeOverdueNotification(
    Guid SchoolId,
    Guid StudentId,
    string StudentName,
    string GuardianPhone,
    decimal OverdueAmount,
    int OverdueDays
) : INotification;

// ── Examinations ──────────────────────────────────────────────────────────────

public sealed record ExamResultPublishedNotification(
    Guid SchoolId,
    Guid StudentId,
    string StudentName,
    string GuardianPhone,
    string ExamName,
    string Class,
    decimal Percentage,
    string Grade,
    string AcademicYear
) : INotification;

public sealed record ExamSchedulePublishedNotification(
    Guid SchoolId,
    string Class,
    string ExamName,
    DateTime StartDate,
    IReadOnlyList<Guid> StudentIds
) : INotification;

public sealed record OnlineExamReminderNotification(
    Guid SchoolId,
    Guid StudentId,
    string StudentPhone,
    string ExamName,
    DateTime StartTime
) : INotification;

// ── Admissions ────────────────────────────────────────────────────────────────

public sealed record AdmissionApplicationReceivedNotification(
    Guid SchoolId,
    Guid ApplicationId,
    string StudentName,
    string GuardianPhone,
    string AdmissionNumber
) : INotification;

public sealed record AdmissionStatusChangedNotification(
    Guid SchoolId,
    Guid ApplicationId,
    string StudentName,
    string GuardianPhone,
    string PreviousStatus,
    string NewStatus,
    string? Notes = null
) : INotification;

public sealed record InterviewScheduledNotification(
    Guid SchoolId,
    Guid ApplicationId,
    string StudentName,
    string GuardianPhone,
    DateTime InterviewDate,
    string? Venue = null
) : INotification;

// ── Leave Management ──────────────────────────────────────────────────────────

public sealed record StaffLeaveStatusChangedNotification(
    Guid SchoolId,
    Guid StaffId,
    string StaffName,
    string StaffPhone,
    string LeaveType,
    string LeaveDates,
    string NewStatus,
    string? Remarks = null
) : INotification;

public sealed record StudentLeaveStatusChangedNotification(
    Guid SchoolId,
    Guid StudentId,
    string StudentName,
    string GuardianPhone,
    string LeaveDates,
    string NewStatus
) : INotification;

// ── Diary ─────────────────────────────────────────────────────────────────────

public sealed record DiaryPostedNotification(
    Guid SchoolId,
    Guid ClassSectionId,
    string Class,
    string Section,
    string TeacherName,
    string DiaryContent,
    DateOnly DiaryDate,
    IReadOnlyList<Guid> StudentIds
) : INotification;

// ── Announcements ─────────────────────────────────────────────────────────────

public sealed record AnnouncementCreatedNotification(
    Guid SchoolId,
    Guid AnnouncementId,
    string Title,
    string Content,
    string Priority,
    string TargetAudience
) : INotification;

// ── Transport ─────────────────────────────────────────────────────────────────

public sealed record BusDelayAlertNotification(
    Guid SchoolId,
    Guid RouteId,
    string RouteName,
    string BusNumber,
    string DelayReason,
    int DelayMinutes
) : INotification;

public sealed record RouteChangeNotification(
    Guid SchoolId,
    Guid RouteId,
    string RouteName,
    string ChangeDetails
) : INotification;

// ── Hostel ────────────────────────────────────────────────────────────────────

public sealed record HostelRoomAllottedNotification(
    Guid SchoolId,
    Guid StudentId,
    string StudentName,
    string GuardianPhone,
    string RoomNumber,
    string BlockName
) : INotification;

// ── Library ───────────────────────────────────────────────────────────────────

public sealed record BookOverdueNotification(
    Guid SchoolId,
    Guid StudentId,
    string StudentName,
    string GuardianPhone,
    string BookTitle,
    int OverdueDays,
    decimal OverdueFine
) : INotification;

// ── Visitor Management ────────────────────────────────────────────────────────

public sealed record VisitorArrivedNotification(
    Guid SchoolId,
    Guid StudentId,
    string StudentName,
    string GuardianPhone,
    string VisitorName,
    string Purpose
) : INotification;

// ── Payroll ───────────────────────────────────────────────────────────────────

public sealed record PayslipGeneratedNotification(
    Guid SchoolId,
    Guid StaffId,
    string StaffName,
    string StaffPhone,
    decimal NetPay,
    string Month,
    string Year
) : INotification;
