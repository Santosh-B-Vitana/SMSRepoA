using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    public enum MeetingProvider
    {
        LiveKit = 1,
        Zoom = 2,
        Jitsi = 3
    }

    public enum OnlineClassStatus
    {
        Scheduled = 1,
        Live = 2,
        Ended = 3,
        Cancelled = 4
    }

    public enum OnlineClassAttendanceStatus
    {
        Present = 1,
        PartiallyPresent = 2,
        Absent = 3,
        JoinedAndLeftImmediately = 4
    }

    public enum RecordingStatus
    {
        Processing = 1,
        Available = 2,
        Failed = 3
    }

    public enum NotificationChannel
    {
        Push = 1,
        Email = 2,
        SMS = 3
    }

    /// <summary>
    /// Represents a scheduled or instant online class (virtual classroom session).
    /// School-isolated via SchoolId + EF Core global query filter.
    /// </summary>
    public class OnlineClass : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [ForeignKey(nameof(SchoolId))]
        public School? School { get; set; }

        [Required, MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [MaxLength(1000)]
        public string? Description { get; set; }

        [Required]
        public Guid HostStaffId { get; set; }

        [ForeignKey(nameof(HostStaffId))]
        public Staff? HostStaff { get; set; }

        public Guid? SubjectId { get; set; }

        [ForeignKey(nameof(SubjectId))]
        public Subject? Subject { get; set; }

        public Guid? ClassId { get; set; }

        [ForeignKey(nameof(ClassId))]
        public Class? TargetClass { get; set; }

        public Guid? SectionId { get; set; }

        [ForeignKey(nameof(SectionId))]
        public Section? TargetSection { get; set; }

        public MeetingProvider Provider { get; set; } = MeetingProvider.LiveKit;

        /// <summary>LiveKit room name — globally unique, format: {schoolId}-{classId}</summary>
        [MaxLength(200)]
        public string? ProviderRoomName { get; set; }

        /// <summary>External join URL (fallback for non-LiveKit providers or deep link).</summary>
        [MaxLength(1024)]
        public string? MeetingUrl { get; set; }

        public DateTime ScheduledStart { get; set; }
        public DateTime ScheduledEnd { get; set; }

        public DateTime? ActualStart { get; set; }
        public DateTime? ActualEnd { get; set; }

        public OnlineClassStatus Status { get; set; } = OnlineClassStatus.Scheduled;

        public int MaxParticipants { get; set; } = 100;
        public bool IsRecordingEnabled { get; set; } = false;
        public bool IsInstant { get; set; } = false;

        [MaxLength(20)]
        public string AcademicYear { get; set; } = string.Empty;

        // Navigation
        public ICollection<OnlineClassAttendanceRecord> AttendanceRecords { get; set; } = new List<OnlineClassAttendanceRecord>();
        public ICollection<OnlineClassRecording> Recordings { get; set; } = new List<OnlineClassRecording>();
        public ICollection<OnlineClassNotificationLog> NotificationLogs { get; set; } = new List<OnlineClassNotificationLog>();
    }

    /// <summary>
    /// Per-student attendance record for a virtual class session.
    /// Populated automatically from LiveKit webhook events; overrideable by teacher.
    /// </summary>
    public class OnlineClassAttendanceRecord : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        public Guid OnlineClassId { get; set; }

        [ForeignKey(nameof(OnlineClassId))]
        public OnlineClass? OnlineClass { get; set; }

        [Required]
        public Guid StudentId { get; set; }

        [ForeignKey(nameof(StudentId))]
        public Student? Student { get; set; }

        public DateTime? JoinTime { get; set; }
        public DateTime? LeaveTime { get; set; }

        /// <summary>Total minutes the student was present (aggregated across reconnects).</summary>
        public int TotalDurationMinutes { get; set; } = 0;

        /// <summary>Number of times the student joined (reconnects).</summary>
        public int JoinCount { get; set; } = 0;

        public OnlineClassAttendanceStatus AttendanceStatus { get; set; } = OnlineClassAttendanceStatus.Absent;

        public bool IsManualOverride { get; set; } = false;
        public Guid? ManualOverrideBy { get; set; }
        public DateTime? ManualOverrideAt { get; set; }

        [MaxLength(500)]
        public string? Notes { get; set; }
    }

    /// <summary>
    /// Recording produced by LiveKit Egress; stored as MP4 on AWS S3.
    /// Presigned URLs are generated on demand (1-hour TTL).
    /// </summary>
    public class OnlineClassRecording : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        public Guid OnlineClassId { get; set; }

        [ForeignKey(nameof(OnlineClassId))]
        public OnlineClass? OnlineClass { get; set; }

        [Required, MaxLength(200)]
        public string S3Bucket { get; set; } = string.Empty;

        [Required, MaxLength(500)]
        public string S3Key { get; set; } = string.Empty;

        public int DurationSeconds { get; set; } = 0;
        public decimal FileSizeMb { get; set; } = 0;

        /// <summary>When true, students get stream-only access (no download link).</summary>
        public bool IsTeacherRestricted { get; set; } = false;

        public RecordingStatus RecordingStatus { get; set; } = RecordingStatus.Processing;

        /// <summary>LiveKit Egress job ID — used to correlate ingress webhook.</summary>
        [MaxLength(200)]
        public string? EgressId { get; set; }
    }

    /// <summary>
    /// Per-school LiveKit (or Zoom/Jitsi) credential configuration.
    /// Schools without their own credentials use the Vitana shared LiveKit account.
    /// API secrets are stored AES-256 encrypted via IDataProtectionProvider.
    /// </summary>
    public class SchoolMeetingProviderConfig : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [ForeignKey(nameof(SchoolId))]
        public School? School { get; set; }

        public MeetingProvider DefaultProvider { get; set; } = MeetingProvider.LiveKit;

        /// <summary>When true, use Vitana's shared LiveKit credentials (no school-level setup needed).</summary>
        public bool UseSharedVitanaAccount { get; set; } = true;

        [MaxLength(500)]
        public string? LiveKitServerUrl { get; set; }

        [MaxLength(200)]
        public string? LiveKitApiKey { get; set; }

        /// <summary>AES-256 encrypted via ASP.NET Core Data Protection.</summary>
        [MaxLength(1024)]
        public string? LiveKitApiSecretProtected { get; set; }

        [MaxLength(200)]
        public string? ZoomAccountId { get; set; }

        [MaxLength(200)]
        public string? ZoomClientId { get; set; }

        [MaxLength(1024)]
        public string? ZoomClientSecretProtected { get; set; }
    }

    /// <summary>
    /// Audit log for push/email/SMS notifications sent about online class events.
    /// </summary>
    public class OnlineClassNotificationLog : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        public Guid OnlineClassId { get; set; }

        [ForeignKey(nameof(OnlineClassId))]
        public OnlineClass? OnlineClass { get; set; }

        public Guid RecipientId { get; set; }

        [Required, MaxLength(100)]
        public string NotificationType { get; set; } = string.Empty;

        public NotificationChannel Channel { get; set; } = NotificationChannel.Push;
        public DateTime SentAt { get; set; } = DateTime.UtcNow;

        [MaxLength(50)]
        public string Status { get; set; } = "Sent";
    }
}
