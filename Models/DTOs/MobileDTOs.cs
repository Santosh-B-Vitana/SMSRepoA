using System.ComponentModel.DataAnnotations;

namespace SmsApi.Models.DTOs
{
    // ══════════════════════════════════════════════════════════════════════════
    // App Config  (GET /api/mobile/app-config)
    // ══════════════════════════════════════════════════════════════════════════

    public class AppConfigResponse
    {
        public Guid SchoolId { get; set; }
        public string AcademicYear { get; set; } = string.Empty;
        public AppBrandingDto Branding { get; set; } = new();
        public Dictionary<string, bool> Modules { get; set; } = new();
        public Dictionary<string, bool> MobileFeatures { get; set; } = new();
        public RolePermissionsDto RolePermissions { get; set; } = new();
        public RemoteConfigDto RemoteConfig { get; set; } = new();
        public VersionRequirementsDto VersionRequirements { get; set; } = new();
    }

    public class AppBrandingDto
    {
        public string SchoolName { get; set; } = string.Empty;
        public string? LogoUrl { get; set; }
        public string? PrimaryColor { get; set; }
        public string? AccentColor { get; set; }
        public string? SplashScreenUrl { get; set; }
        public string? AppIconUrl { get; set; }
    }

    public class RolePermissionsDto
    {
        public bool CanMarkAttendance { get; set; }
        public bool CanEnterMarks { get; set; }
        public bool CanViewFinance { get; set; }
        public bool CanApproveLeave { get; set; }
        public bool CanManageAnnouncements { get; set; }
        public bool CanViewStudentProfiles { get; set; }
        public bool CanInitiatePayments { get; set; }
    }

    public class RemoteConfigDto
    {
        public int AttendanceGracePeriodMinutes { get; set; } = 15;
        public int MaxOfflineQueueSize { get; set; } = 200;
        public int SyncIntervalMinutes { get; set; } = 5;
        public List<string> FeatureAnnouncements { get; set; } = new();
    }

    public class VersionRequirementsDto
    {
        public string MinVersion { get; set; } = "1.0.0";
        public string RecommendedVersion { get; set; } = "1.0.0";
        public string? ForceUpdateVersion { get; set; }
        public bool MaintenanceMode { get; set; }
        public string? MaintenanceMessage { get; set; }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Parent Dashboard  (GET /api/mobile/parent-dashboard)
    // ══════════════════════════════════════════════════════════════════════════

    public class ParentDashboardResponse
    {
        public List<ChildSummaryDto> Children { get; set; } = new();
        public ChildSummaryDto? SelectedChild { get; set; }
        public MobileAttendanceSummaryDto? TodayAttendance { get; set; }
        public FeesSummaryDto? FeeSummary { get; set; }
        public LatestResultDto? LatestResult { get; set; }
        public AnnouncementSummaryDto? LatestAnnouncement { get; set; }
        public int UnreadCount { get; set; }
    }

    public class ChildSummaryDto
    {
        public Guid StudentId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string? RollNumber { get; set; }
        public string? ClassName { get; set; }
        public string? Section { get; set; }
        public string? ProfilePhotoUrl { get; set; }
    }

    public class MobileAttendanceSummaryDto
    {
        public string Status { get; set; } = string.Empty;   // Present / Absent / Late / Holiday
        public DateTime? MarkedAt { get; set; }
        public int PresentDaysThisMonth { get; set; }
        public int TotalWorkingDaysThisMonth { get; set; }
    }

    public class FeesSummaryDto
    {
        public decimal TotalDue { get; set; }
        public decimal TotalPaid { get; set; }
        public decimal Outstanding { get; set; }
        public DateTime? NextDueDate { get; set; }
        public bool HasOverdue { get; set; }
    }

    public class LatestResultDto
    {
        public string? ExamName { get; set; }
        public decimal? Percentage { get; set; }
        public string? Grade { get; set; }
        public string? Remarks { get; set; }
        public DateTime? PublishedAt { get; set; }
    }

    public class AnnouncementSummaryDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Summary { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? Category { get; set; }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Teacher Dashboard  (GET /api/mobile/teacher-dashboard)
    // ══════════════════════════════════════════════════════════════════════════

    public class TeacherDashboardResponse
    {
        public List<TimetableSlotDto> TodaySchedule { get; set; } = new();
        public int PendingLeaveCount { get; set; }
        public List<ClassAttendanceStatusDto> ClassesStatus { get; set; } = new();
        public int UnreadNotificationCount { get; set; }
        public int PendingAssignmentSubmissions { get; set; }
    }

    public class TimetableSlotDto
    {
        public Guid? ClassId { get; set; }
        public string SubjectName { get; set; } = string.Empty;
        public string? ClassName { get; set; }
        public string? Section { get; set; }
        public string? Room { get; set; }
        public string? StartTime { get; set; }
        public string? EndTime { get; set; }
        public int PeriodNumber { get; set; }
    }

    public class ClassAttendanceStatusDto
    {
        public Guid? ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public string? Section { get; set; }
        public bool IsMarked { get; set; }
        public int TotalStudents { get; set; }
        public int PresentCount { get; set; }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Student Dashboard  (GET /api/mobile/student-dashboard)
    // ══════════════════════════════════════════════════════════════════════════

    public class StudentDashboardResponse
    {
        public List<TimetableSlotDto> TodaySchedule { get; set; } = new();
        public MobileAttendanceSummaryDto? AttendanceThisMonth { get; set; }
        public LatestResultDto? LatestResult { get; set; }
        public List<AssignmentSummaryDto> DueSoonAssignments { get; set; } = new();
        public AnnouncementSummaryDto? LatestAnnouncement { get; set; }
        public int UnreadCount { get; set; }
    }

    public class AssignmentSummaryDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? SubjectName { get; set; }
        public DateTime? DueDate { get; set; }
        public bool IsSubmitted { get; set; }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Admin Dashboard  (GET /api/mobile/admin-dashboard)
    // ══════════════════════════════════════════════════════════════════════════

    public class AdminDashboardResponse
    {
        public decimal AttendanceRate { get; set; }
        public FeeCollectionDto FeeCollection { get; set; } = new();
        public PendingApprovalsDto PendingApprovals { get; set; } = new();
        public BillingAlertDto? BillingAlert { get; set; }
        public List<AnnouncementSummaryDto> RecentAnnouncements { get; set; } = new();
        public int UnreadCount { get; set; }
        // School overview counts
        public int TotalStudents { get; set; }
        public int ActiveStudents { get; set; }
        public int TotalStaff { get; set; }
        public int ActiveStaff { get; set; }
        public int TotalClasses { get; set; }
    }

    public class FeeCollectionDto
    {
        public decimal CollectedToday { get; set; }
        public decimal CollectedThisMonth { get; set; }
    }

    public class PendingApprovalsDto
    {
        public int LeaveRequests { get; set; }
        public int AdmissionApplications { get; set; }
        public int DocumentVerifications { get; set; }
    }

    public class BillingAlertDto
    {
        public int OverdueCount { get; set; }
        public decimal OverdueAmount { get; set; }
        public string? AlertMessage { get; set; }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Device Token Registration  (POST /api/notifications/register-device)
    // ══════════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Replaces the inline record in NotificationsController. Adds DeviceId + AppVersion.
    /// </summary>
    public class RegisterDeviceTokenRequest
    {
        [Required, MaxLength(1024)]
        public string NativeToken { get; set; } = string.Empty;

        /// <summary>"android" or "ios"</summary>
        [Required, MaxLength(10)]
        public string Platform { get; set; } = string.Empty;

        [Required, MaxLength(512)]
        public string DeviceId { get; set; } = string.Empty;

        [MaxLength(20)]
        public string? AppVersion { get; set; }
    }

    public class RegisterDeviceTokenResponse
    {
        public string Message { get; set; } = string.Empty;
        public bool IsNew { get; set; }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Notification Preferences  (GET/PUT /api/notifications/preferences)
    // ══════════════════════════════════════════════════════════════════════════

    public class NotificationPreferenceDto
    {
        public string NotificationType { get; set; } = string.Empty;
        public bool PushEnabled { get; set; }
        public bool EmailEnabled { get; set; }
    }

    public class UpdateNotificationPreferenceRequest
    {
        public bool PushEnabled { get; set; }
        public bool EmailEnabled { get; set; }
    }

    public class NotificationPreferencesResponse
    {
        public List<NotificationPreferenceDto> Preferences { get; set; } = new();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Mobile Payment Initiation  (POST /api/fees/payments/mobile-initiate)
    // ══════════════════════════════════════════════════════════════════════════

    public class MobilePaymentInitiateRequest
    {
        [Required]
        public Guid StudentId { get; set; }

        /// <summary>Optional: target a specific fee record. If null, outstanding balance is used.</summary>
        public Guid? FeeRecordId { get; set; }

        [Range(1, 1_000_000)]
        public decimal Amount { get; set; }

        [MaxLength(50)]
        public string Purpose { get; set; } = "FeePayment";

        public string? CustomerName { get; set; }
        public string? CustomerEmail { get; set; }
        public string? CustomerPhone { get; set; }
    }

    public class MobilePaymentInitiateResponse
    {
        /// <summary>Cashfree order ID for reference.</summary>
        public string CfOrderId { get; set; } = string.Empty;

        /// <summary>Used by Cashfree React Native SDK to open the payment sheet.</summary>
        public string PaymentSessionId { get; set; } = string.Empty;

        public decimal Amount { get; set; }
        public string Currency { get; set; } = "INR";
        public Guid TransactionId { get; set; }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Student Minimal  (GET /api/students?minimal=true)
    // ══════════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Lightweight student record (~200 bytes) for teacher attendance/class lists.
    /// Avoids the ~2 KB full profile payload for 40+ student class screens.
    /// </summary>
    public class StudentMinimalDto
    {
        public Guid Id { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string FullName => $"{FirstName} {LastName}".Trim();
        public string? RollNumber { get; set; }
        public string? ProfilePhotoUrl { get; set; }
        public Guid? ClassId { get; set; }
        public Guid? SectionId { get; set; }
        public string? ClassName { get; set; }
        public string? SectionName { get; set; }
        public string? Gender { get; set; }
    }

    public class StudentMinimalListResponse
    {
        public List<StudentMinimalDto> Students { get; set; } = new();
        public int Total { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Mobile App Branding  (GET /api/mobile/branding  |  PUT /api/mobile/branding)
    // ══════════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Full branding payload returned by GET /api/mobile/branding.
    /// Merges MobileAppBranding overrides with SchoolSettings / School base data.
    /// </summary>
    public class BrandingResponse
    {
        public string SchoolName { get; set; } = string.Empty;
        public string? LogoUrl { get; set; }
        public string PrimaryColor { get; set; } = "#1a6fd8";
        public string AccentColor { get; set; } = "#17a2b8";
        public string? AppIconUrl { get; set; }
        public string? SplashScreenUrl { get; set; }
        public BrandingFontsDto Fonts { get; set; } = new();
        public string? StoreShortDescription { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public class BrandingFontsDto
    {
        public string Heading { get; set; } = "Poppins";
        public string Body { get; set; } = "Inter";
    }

    /// <summary>
    /// Request body for PUT /api/mobile/branding (Admin / Principal only).
    /// All fields are optional — only provided fields are persisted.
    /// </summary>
    public class UpdateBrandingRequest
    {
        [MaxLength(100)]
        public string? AppName { get; set; }

        [MaxLength(9), RegularExpression(@"^#[0-9A-Fa-f]{3,6}$", ErrorMessage = "PrimaryColor must be a valid hex color.")]
        public string? PrimaryColor { get; set; }

        [MaxLength(9), RegularExpression(@"^#[0-9A-Fa-f]{3,6}$", ErrorMessage = "AccentColor must be a valid hex color.")]
        public string? AccentColor { get; set; }

        [MaxLength(1024)]
        public string? AppIconUrl { get; set; }

        [MaxLength(1024)]
        public string? SplashScreenUrl { get; set; }

        [MaxLength(100)]
        public string? FontHeading { get; set; }

        [MaxLength(100)]
        public string? FontBody { get; set; }

        [MaxLength(80)]
        public string? StoreShortDescription { get; set; }
    }

    // ── Librarian Dashboard ───────────────────────────────────────────────────

    public class LibrarianDashboardResponse
    {
        public int BooksIssuedToday { get; set; }
        public int TotalOverdue { get; set; }
        public int ReturnsToday { get; set; }
        public int PendingReservations { get; set; }
        public int TotalBooks { get; set; }
        public int AvailableBooks { get; set; }
        public List<OverdueBookSummaryDto> TopOverdueBooks { get; set; } = new();
        public int UnreadCount { get; set; }
    }

    public class OverdueBookSummaryDto
    {
        public string BookTitle { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public int DaysOverdue { get; set; }
        public decimal FineAmount { get; set; }
    }

    // ── Transport Dashboard ───────────────────────────────────────────────────

    public class TransportDashboardResponse
    {
        public int TotalRoutes { get; set; }
        public int ActiveRoutes { get; set; }
        public int TotalVehicles { get; set; }
        public int StudentsAssigned { get; set; }
        public int MaintenanceDue { get; set; }
        public List<RouteSummaryDto> RoutesSummary { get; set; } = new();
        public int UnreadCount { get; set; }
    }

    public class RouteSummaryDto
    {
        public string RouteNumber { get; set; } = string.Empty;
        public string RouteName { get; set; } = string.Empty;
        public int StudentsAssigned { get; set; }
        public int Capacity { get; set; }
        public bool IsActive { get; set; }
    }

    // ── Hostel Dashboard ──────────────────────────────────────────────────────

    public class HostelDashboardResponse
    {
        public int TotalRooms { get; set; }
        public int OccupiedBeds { get; set; }
        public int TotalCapacity { get; set; }
        public int StudentsCheckedIn { get; set; }
        public int VisitorsInside { get; set; }
        public int PendingHostelLeaves { get; set; }
        public int HostelLeavesToday { get; set; }
        public int UnreadCount { get; set; }
    }

    // ── Receptionist Dashboard ────────────────────────────────────────────────

    public class ReceptionistDashboardResponse
    {
        public int VisitorsCurrentlyInside { get; set; }
        public int TotalCheckInsToday { get; set; }
        public int TotalCheckOutsToday { get; set; }
        public int PendingPreRegistrations { get; set; }
        public double AverageDurationMinutes { get; set; }
        public int UnreadCount { get; set; }
    }

    // ── Offline Bundle ────────────────────────────────────────────────────────

    public record OfflineBundleStudentDto(
        Guid StudentId,
        string FullName,
        string? RollNumber,
        string? PhotoUrl
    );

    public record OfflineBundleClassDto(
        string ClassId,
        string ClassName,
        string? Section,
        List<OfflineBundleStudentDto> Students
    );

    /// <summary>
    /// Pre-fetched offline data bundle — teacher's daily data for offline use.
    /// Delivered only to authenticated Teacher/Staff roles and valid for 8 hours.
    /// </summary>
    public record OfflineBundleResponse(
        DateTime BundledAt,
        DateTime ExpiresAt,
        List<OfflineBundleClassDto> MyClasses,
        List<TimetableSlotDto> TodaysTimetable,
        int PendingLeaveCount,
        List<AnnouncementSummaryDto> Announcements
    );
}
