using MediatR;
using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Services.WhatsApp;

namespace SmsApi.Features.WhatsApp.Notifications;

// ── Base handler with shared logic ────────────────────────────────────────────

public abstract class WhatsAppBaseHandler
{
    protected readonly IWhatsAppService WhatsApp;
    protected readonly IWhatsAppContactResolver Contacts;
    protected readonly ILogger Logger;

    protected WhatsAppBaseHandler(
        IWhatsAppService whatsApp,
        IWhatsAppContactResolver contacts,
        ILogger logger)
    {
        WhatsApp = whatsApp;
        Contacts = contacts;
        Logger = logger;
    }
}

// ── Attendance Handlers ───────────────────────────────────────────────────────

public class StudentMarkedAbsentWhatsAppHandler
    : WhatsAppBaseHandler, INotificationHandler<StudentMarkedAbsentNotification>
{
    public StudentMarkedAbsentWhatsAppHandler(
        IWhatsAppService whatsApp, IWhatsAppContactResolver contacts,
        ILogger<StudentMarkedAbsentWhatsAppHandler> logger)
        : base(whatsApp, contacts, logger) { }

    public async Task Handle(StudentMarkedAbsentNotification n, CancellationToken ct)
    {
        // Resolve contact if phone not provided
        string phone = n.GuardianPhone;
        if (string.IsNullOrEmpty(phone))
        {
            var contact = await Contacts.ResolveForStudentAsync(n.StudentId, n.SchoolId, ct);
            if (contact == null) return;
            phone = contact.Phone;
        }
        else
        {
            phone = Contacts.NormalizeToE164(phone) ?? phone;
        }

        await WhatsApp.QueueMessageAsync(
            schoolId: n.SchoolId,
            eventKey: "attendance.student_absent",
            entityId: n.StudentId,
            entityType: "Attendance",
            recipientPhone: phone,
            recipientName: n.GuardianName,
            recipientType: "Parent",
            placeholders: new Dictionary<string, string>
            {
                { "{{ParentName}}", n.GuardianName },
                { "{{StudentName}}", n.StudentName },
                { "{{Class}}", n.Class },
                { "{{Section}}", n.Section },
                { "{{AttendanceDate}}", n.AttendanceDate.ToString("dd MMM yyyy") },
                { "{{SchoolName}}", "" }
            },
            priority: 2,
            ct: ct);
    }
}

public class AttendanceShortageWhatsAppHandler
    : WhatsAppBaseHandler, INotificationHandler<AttendanceShortageNotification>
{
    public AttendanceShortageWhatsAppHandler(
        IWhatsAppService whatsApp, IWhatsAppContactResolver contacts,
        ILogger<AttendanceShortageWhatsAppHandler> logger)
        : base(whatsApp, contacts, logger) { }

    public async Task Handle(AttendanceShortageNotification n, CancellationToken ct)
    {
        var phone = Contacts.NormalizeToE164(n.GuardianPhone) ?? n.GuardianPhone;

        await WhatsApp.QueueMessageAsync(
            n.SchoolId, "attendance.shortage", n.StudentId, "Student",
            phone, "Parent/Guardian", "Parent",
            new Dictionary<string, string>
            {
                { "{{StudentName}}", n.StudentName },
                { "{{Class}}", n.Class },
                { "{{AttendanceDate}}", $"{n.AttendancePct:F1}%" }
            },
            priority: 2, ct: ct);
    }
}

// ── Fee Handlers ──────────────────────────────────────────────────────────────

public class FeeDueReminderWhatsAppHandler
    : WhatsAppBaseHandler, INotificationHandler<FeeDueReminderNotification>
{
    public FeeDueReminderWhatsAppHandler(
        IWhatsAppService whatsApp, IWhatsAppContactResolver contacts,
        ILogger<FeeDueReminderWhatsAppHandler> logger)
        : base(whatsApp, contacts, logger) { }

    public async Task Handle(FeeDueReminderNotification n, CancellationToken ct)
    {
        var phone = Contacts.NormalizeToE164(n.GuardianPhone) ?? n.GuardianPhone;

        await WhatsApp.QueueMessageAsync(
            n.SchoolId, "fees.fee_due", n.StudentId, "FeeRecord",
            phone, "Parent/Guardian", "Parent",
            new Dictionary<string, string>
            {
                { "{{ParentName}}", "Parent" },
                { "{{StudentName}}", n.StudentName },
                { "{{Class}}", n.Class },
                { "{{Amount}}", $"₹{n.AmountDue:F0}" },
                { "{{DueDate}}", n.DueDate.ToString("dd MMM yyyy") },
                { "{{AcademicYear}}", n.AcademicYear }
            },
            priority: 2, ct: ct);
    }
}

public class FeePaymentReceivedWhatsAppHandler
    : WhatsAppBaseHandler, INotificationHandler<FeePaymentReceivedNotification>
{
    public FeePaymentReceivedWhatsAppHandler(
        IWhatsAppService whatsApp, IWhatsAppContactResolver contacts,
        ILogger<FeePaymentReceivedWhatsAppHandler> logger)
        : base(whatsApp, contacts, logger) { }

    public async Task Handle(FeePaymentReceivedNotification n, CancellationToken ct)
    {
        var phone = Contacts.NormalizeToE164(n.GuardianPhone) ?? n.GuardianPhone;

        await WhatsApp.QueueMessageAsync(
            n.SchoolId, "fees.payment_received", n.StudentId, "Payment",
            phone, "Parent/Guardian", "Parent",
            new Dictionary<string, string>
            {
                { "{{StudentName}}", n.StudentName },
                { "{{Amount}}", $"₹{n.AmountPaid:F0}" },
                { "{{FeeReceiptNumber}}", n.ReceiptNumber },
                { "{{AcademicYear}}", n.AcademicYear }
            },
            priority: 2, ct: ct);
    }
}

public class FeeOverdueWhatsAppHandler
    : WhatsAppBaseHandler, INotificationHandler<FeeOverdueNotification>
{
    public FeeOverdueWhatsAppHandler(
        IWhatsAppService whatsApp, IWhatsAppContactResolver contacts,
        ILogger<FeeOverdueWhatsAppHandler> logger)
        : base(whatsApp, contacts, logger) { }

    public async Task Handle(FeeOverdueNotification n, CancellationToken ct)
    {
        var phone = Contacts.NormalizeToE164(n.GuardianPhone) ?? n.GuardianPhone;

        await WhatsApp.QueueMessageAsync(
            n.SchoolId, "fees.fee_overdue", n.StudentId, "FeeRecord",
            phone, "Parent/Guardian", "Parent",
            new Dictionary<string, string>
            {
                { "{{StudentName}}", n.StudentName },
                { "{{Amount}}", $"₹{n.OverdueAmount:F0}" },
                { "{{OverdueDays}}", n.OverdueDays.ToString() }
            },
            priority: 1, ct: ct); // HIGH priority for overdue
    }
}

// ── Exam Handlers ─────────────────────────────────────────────────────────────

public class ExamResultPublishedWhatsAppHandler
    : WhatsAppBaseHandler, INotificationHandler<ExamResultPublishedNotification>
{
    public ExamResultPublishedWhatsAppHandler(
        IWhatsAppService whatsApp, IWhatsAppContactResolver contacts,
        ILogger<ExamResultPublishedWhatsAppHandler> logger)
        : base(whatsApp, contacts, logger) { }

    public async Task Handle(ExamResultPublishedNotification n, CancellationToken ct)
    {
        var phone = Contacts.NormalizeToE164(n.GuardianPhone) ?? n.GuardianPhone;

        await WhatsApp.QueueMessageAsync(
            n.SchoolId, "exams.result_published", n.StudentId, "ExamResult",
            phone, "Parent/Guardian", "Parent",
            new Dictionary<string, string>
            {
                { "{{StudentName}}", n.StudentName },
                { "{{ExamName}}", n.ExamName },
                { "{{Class}}", n.Class },
                { "{{ResultSummary}}", $"{n.Percentage:F1}% ({n.Grade})" },
                { "{{AcademicYear}}", n.AcademicYear }
            },
            priority: 2, ct: ct);
    }
}

// ── Admission Handlers ────────────────────────────────────────────────────────

public class AdmissionApplicationReceivedWhatsAppHandler
    : WhatsAppBaseHandler, INotificationHandler<AdmissionApplicationReceivedNotification>
{
    public AdmissionApplicationReceivedWhatsAppHandler(
        IWhatsAppService whatsApp, IWhatsAppContactResolver contacts,
        ILogger<AdmissionApplicationReceivedWhatsAppHandler> logger)
        : base(whatsApp, contacts, logger) { }

    public async Task Handle(AdmissionApplicationReceivedNotification n, CancellationToken ct)
    {
        var phone = Contacts.NormalizeToE164(n.GuardianPhone) ?? n.GuardianPhone;

        await WhatsApp.QueueMessageAsync(
            n.SchoolId, "admissions.application_received", n.ApplicationId, "Admission",
            phone, "Parent/Guardian", "Parent",
            new Dictionary<string, string>
            {
                { "{{StudentName}}", n.StudentName },
                { "{{AdmissionNumber}}", n.AdmissionNumber }
            },
            priority: 2, ct: ct);
    }
}

public class AdmissionStatusChangedWhatsAppHandler
    : WhatsAppBaseHandler, INotificationHandler<AdmissionStatusChangedNotification>
{
    public AdmissionStatusChangedWhatsAppHandler(
        IWhatsAppService whatsApp, IWhatsAppContactResolver contacts,
        ILogger<AdmissionStatusChangedWhatsAppHandler> logger)
        : base(whatsApp, contacts, logger) { }

    public async Task Handle(AdmissionStatusChangedNotification n, CancellationToken ct)
    {
        var phone = Contacts.NormalizeToE164(n.GuardianPhone) ?? n.GuardianPhone;
        var eventKey = n.NewStatus.ToLower() switch
        {
            "approved" => "admissions.application_approved",
            "rejected" => "admissions.application_rejected",
            "enrolled" => "admissions.enrollment_confirmed",
            _ => "admissions.status_update"
        };

        await WhatsApp.QueueMessageAsync(
            n.SchoolId, eventKey, n.ApplicationId, "Admission",
            phone, "Parent/Guardian", "Parent",
            new Dictionary<string, string>
            {
                { "{{StudentName}}", n.StudentName }
            },
            priority: 2, ct: ct);
    }
}

// ── Leave Handlers ────────────────────────────────────────────────────────────

public class StaffLeaveStatusChangedWhatsAppHandler
    : WhatsAppBaseHandler, INotificationHandler<StaffLeaveStatusChangedNotification>
{
    public StaffLeaveStatusChangedWhatsAppHandler(
        IWhatsAppService whatsApp, IWhatsAppContactResolver contacts,
        ILogger<StaffLeaveStatusChangedWhatsAppHandler> logger)
        : base(whatsApp, contacts, logger) { }

    public async Task Handle(StaffLeaveStatusChangedNotification n, CancellationToken ct)
    {
        var phone = Contacts.NormalizeToE164(n.StaffPhone) ?? n.StaffPhone;
        var eventKey = n.NewStatus.ToLower() == "approved"
            ? "leave.staff_approved"
            : "leave.staff_rejected";

        await WhatsApp.QueueMessageAsync(
            n.SchoolId, eventKey, n.StaffId, "StaffLeave",
            phone, n.StaffName, "Staff",
            new Dictionary<string, string>
            {
                { "{{ParentName}}", n.StaffName },
                { "{{LeaveType}}", n.LeaveType },
                { "{{LeaveDates}}", n.LeaveDates }
            },
            priority: 2, ct: ct);
    }
}

public class StudentLeaveStatusChangedWhatsAppHandler
    : WhatsAppBaseHandler, INotificationHandler<StudentLeaveStatusChangedNotification>
{
    public StudentLeaveStatusChangedWhatsAppHandler(
        IWhatsAppService whatsApp, IWhatsAppContactResolver contacts,
        ILogger<StudentLeaveStatusChangedWhatsAppHandler> logger)
        : base(whatsApp, contacts, logger) { }

    public async Task Handle(StudentLeaveStatusChangedNotification n, CancellationToken ct)
    {
        var phone = Contacts.NormalizeToE164(n.GuardianPhone) ?? n.GuardianPhone;
        var eventKey = n.NewStatus.ToLower() == "approved"
            ? "leave.student_approved"
            : "leave.student_rejected";

        await WhatsApp.QueueMessageAsync(
            n.SchoolId, eventKey, n.StudentId, "StudentLeave",
            phone, "Parent/Guardian", "Parent",
            new Dictionary<string, string>
            {
                { "{{StudentName}}", n.StudentName },
                { "{{LeaveDates}}", n.LeaveDates }
            },
            priority: 2, ct: ct);
    }
}

// ── Diary Handler ─────────────────────────────────────────────────────────────

public class DiaryPostedWhatsAppHandler
    : WhatsAppBaseHandler, INotificationHandler<DiaryPostedNotification>
{
    private readonly AppDbContext _db;

    public DiaryPostedWhatsAppHandler(
        IWhatsAppService whatsApp, IWhatsAppContactResolver contacts, AppDbContext db,
        ILogger<DiaryPostedWhatsAppHandler> logger)
        : base(whatsApp, contacts, logger)
    {
        _db = db;
    }

    public async Task Handle(DiaryPostedNotification n, CancellationToken ct)
    {
        // Send to all parents of students in the class
        foreach (var studentId in n.StudentIds)
        {
            var contact = await Contacts.ResolveForStudentAsync(studentId, n.SchoolId, ct);
            if (contact == null) continue;

            await WhatsApp.QueueMessageAsync(
                n.SchoolId, "diary.diary_posted", studentId, "Diary",
                contact.Phone, contact.Name, "Parent",
                new Dictionary<string, string>
                {
                    { "{{StudentName}}", "your child" },
                    { "{{Class}}", n.Class },
                    { "{{Section}}", n.Section },
                    { "{{AttendanceDate}}", n.DiaryDate.ToString("dd MMM yyyy") }
                },
                priority: 3, ct: ct);
        }
    }
}

// ── Announcement Handler ──────────────────────────────────────────────────────

public class AnnouncementCreatedWhatsAppHandler
    : WhatsAppBaseHandler, INotificationHandler<AnnouncementCreatedNotification>
{
    private readonly AppDbContext _db;

    public AnnouncementCreatedWhatsAppHandler(
        IWhatsAppService whatsApp, IWhatsAppContactResolver contacts, AppDbContext db,
        ILogger<AnnouncementCreatedWhatsAppHandler> logger)
        : base(whatsApp, contacts, logger)
    {
        _db = db;
    }

    public async Task Handle(AnnouncementCreatedNotification n, CancellationToken ct)
    {
        // Only send WhatsApp for High/Urgent announcements
        if (n.Priority is not ("High" or "Urgent" or "Emergency"))
        {
            Logger.LogDebug("Skipping WhatsApp for {Priority} priority announcement {Id}",
                n.Priority, n.AnnouncementId);
            return;
        }

        var eventKey = n.Priority == "Emergency"
            ? "announcements.emergency_alert"
            : "announcements.urgent";

        // Get contacts based on audience
        var contacts = new List<(string Phone, string Name, Guid EntityId)>();

        if (n.TargetAudience is "All" or "Parents")
        {
            var students = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions
                .ToListAsync(
                    _db.Students
                        .Where(s => s.SchoolId == n.SchoolId && !s.IsDeleted)
                        .Select(s => new { s.Id, s.GuardianPhone, s.GuardianName }),
                    ct);

            foreach (var s in students)
            {
                if (!string.IsNullOrEmpty(s.GuardianPhone))
                {
                    var phone = Contacts.NormalizeToE164(s.GuardianPhone);
                    if (phone != null)
                        contacts.Add((phone, s.GuardianName ?? "Parent", s.Id));
                }
            }
        }

        // Deduplicate by phone
        var uniqueContacts = contacts
            .GroupBy(c => c.Phone)
            .Select(g => g.First())
            .ToList();

        foreach (var (phone, name, entityId) in uniqueContacts)
        {
            await WhatsApp.QueueMessageAsync(
                n.SchoolId, eventKey, n.AnnouncementId, "Announcement",
                phone, name, "Parent",
                new Dictionary<string, string>
                {
                    { "{{ParentName}}", name },
                    { "{{SchoolName}}", "" },
                },
                priority: n.Priority == "Emergency" ? 1 : 2, ct: ct);
        }
    }
}

// ── Transport Handlers ────────────────────────────────────────────────────────

public class BusDelayAlertWhatsAppHandler
    : WhatsAppBaseHandler, INotificationHandler<BusDelayAlertNotification>
{
    private readonly AppDbContext _db;

    public BusDelayAlertWhatsAppHandler(
        IWhatsAppService whatsApp, IWhatsAppContactResolver contacts, AppDbContext db,
        ILogger<BusDelayAlertWhatsAppHandler> logger)
        : base(whatsApp, contacts, logger)
    {
        _db = db;
    }

    public async Task Handle(BusDelayAlertNotification n, CancellationToken ct)
    {
        // Get all students on this route
        var studentIds = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions
            .ToListAsync(
                _db.TransportStudents
                    .Where(ts => ts.RouteId == n.RouteId && ts.SchoolId == n.SchoolId)
                    .Select(ts => ts.StudentId),
                ct);

        foreach (var studentId in studentIds)
        {
            var contact = await Contacts.ResolveForStudentAsync(studentId, n.SchoolId, ct);
            if (contact == null) continue;

            await WhatsApp.QueueMessageAsync(
                n.SchoolId, "transport.bus_delayed", n.RouteId, "Transport",
                contact.Phone, contact.Name, "Parent",
                new Dictionary<string, string>
                {
                    { "{{BusNumber}}", n.BusNumber },
                    { "{{RouteNumber}}", n.RouteName },
                    { "{{OverdueDays}}", n.DelayMinutes.ToString() }
                },
                priority: 2, ct: ct);
        }
    }
}

// ── Hostel Handler ────────────────────────────────────────────────────────────

public class HostelRoomAllottedWhatsAppHandler
    : WhatsAppBaseHandler, INotificationHandler<HostelRoomAllottedNotification>
{
    public HostelRoomAllottedWhatsAppHandler(
        IWhatsAppService whatsApp, IWhatsAppContactResolver contacts,
        ILogger<HostelRoomAllottedWhatsAppHandler> logger)
        : base(whatsApp, contacts, logger) { }

    public async Task Handle(HostelRoomAllottedNotification n, CancellationToken ct)
    {
        var phone = Contacts.NormalizeToE164(n.GuardianPhone) ?? n.GuardianPhone;

        await WhatsApp.QueueMessageAsync(
            n.SchoolId, "hostel.room_allotted", n.StudentId, "Hostel",
            phone, "Parent/Guardian", "Parent",
            new Dictionary<string, string>
            {
                { "{{StudentName}}", n.StudentName },
                { "{{RoomNumber}}", n.RoomNumber }
            },
            priority: 3, ct: ct);
    }
}

// ── Library Handler ───────────────────────────────────────────────────────────

public class BookOverdueWhatsAppHandler
    : WhatsAppBaseHandler, INotificationHandler<BookOverdueNotification>
{
    public BookOverdueWhatsAppHandler(
        IWhatsAppService whatsApp, IWhatsAppContactResolver contacts,
        ILogger<BookOverdueWhatsAppHandler> logger)
        : base(whatsApp, contacts, logger) { }

    public async Task Handle(BookOverdueNotification n, CancellationToken ct)
    {
        var phone = Contacts.NormalizeToE164(n.GuardianPhone) ?? n.GuardianPhone;

        await WhatsApp.QueueMessageAsync(
            n.SchoolId, "library.book_overdue", n.StudentId, "BookIssue",
            phone, "Parent/Guardian", "Parent",
            new Dictionary<string, string>
            {
                { "{{StudentName}}", n.StudentName },
                { "{{BookTitle}}", n.BookTitle },
                { "{{OverdueDays}}", n.OverdueDays.ToString() },
                { "{{OverdueFine}}", $"₹{n.OverdueFine:F0}" }
            },
            priority: 3, ct: ct);
    }
}

// ── Visitor Handler ───────────────────────────────────────────────────────────

public class VisitorArrivedWhatsAppHandler
    : WhatsAppBaseHandler, INotificationHandler<VisitorArrivedNotification>
{
    public VisitorArrivedWhatsAppHandler(
        IWhatsAppService whatsApp, IWhatsAppContactResolver contacts,
        ILogger<VisitorArrivedWhatsAppHandler> logger)
        : base(whatsApp, contacts, logger) { }

    public async Task Handle(VisitorArrivedNotification n, CancellationToken ct)
    {
        var phone = Contacts.NormalizeToE164(n.GuardianPhone) ?? n.GuardianPhone;

        await WhatsApp.QueueMessageAsync(
            n.SchoolId, "visitor.visitor_arrived", n.StudentId, "Visitor",
            phone, "Parent/Guardian", "Parent",
            new Dictionary<string, string>
            {
                { "{{StudentName}}", n.StudentName },
                { "{{VisitorName}}", n.VisitorName }
            },
            priority: 3, ct: ct);
    }
}

// ── Payroll Handler ───────────────────────────────────────────────────────────

public class PayslipGeneratedWhatsAppHandler
    : WhatsAppBaseHandler, INotificationHandler<PayslipGeneratedNotification>
{
    public PayslipGeneratedWhatsAppHandler(
        IWhatsAppService whatsApp, IWhatsAppContactResolver contacts,
        ILogger<PayslipGeneratedWhatsAppHandler> logger)
        : base(whatsApp, contacts, logger) { }

    public async Task Handle(PayslipGeneratedNotification n, CancellationToken ct)
    {
        var phone = Contacts.NormalizeToE164(n.StaffPhone) ?? n.StaffPhone;

        await WhatsApp.QueueMessageAsync(
            n.SchoolId, "payroll.salary_slip", n.StaffId, "Payroll",
            phone, n.StaffName, "Staff",
            new Dictionary<string, string>
            {
                { "{{ParentName}}", n.StaffName },
                { "{{Amount}}", $"₹{n.NetPay:F0}" },
                { "{{AttendanceDate}}", $"{n.Month} {n.Year}" }
            },
            priority: 3, ct: ct);
    }
}
