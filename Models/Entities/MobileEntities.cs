using System.ComponentModel.DataAnnotations;

namespace SmsApi.Models.Entities
{
    /// <summary>
    /// Stores FCM/APNS device push tokens per user device.
    /// Supports multi-device (phone + tablet) with max 2 active per user.
    /// </summary>
    public class MobileDeviceToken : BaseEntity
    {
        public Guid UserId { get; set; }
        public Guid SchoolId { get; set; }

        /// <summary>Hardware/installation identifier from the device (expo-device or react-native-device-info).</summary>
        [Required, MaxLength(512)]
        public string DeviceId { get; set; } = string.Empty;

        /// <summary>FCM registration token (Android) or APNS device token (iOS).</summary>
        [Required, MaxLength(1024)]
        public string NativeToken { get; set; } = string.Empty;

        /// <summary>"android" or "ios"</summary>
        [Required, MaxLength(10)]
        public string Platform { get; set; } = string.Empty;

        [MaxLength(20)]
        public string? AppVersion { get; set; }

        public bool IsActive { get; set; } = true;
        public DateTime LastActiveAt { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// Per-user, per-notification-type push/email opt-in preferences.
    /// Missing rows are treated as opted-in (default enabled).
    /// </summary>
    public class UserNotificationPreference : BaseEntity
    {
        public Guid UserId { get; set; }
        public Guid SchoolId { get; set; }

        /// <summary>Notification type: Fee, Attendance, Exam, Assignment, Announcement, etc.</summary>
        [Required, MaxLength(50)]
        public string NotificationType { get; set; } = string.Empty;

        public bool PushEnabled { get; set; } = true;
        public bool EmailEnabled { get; set; } = true;
    }

    /// <summary>
    /// Per-school mobile app version requirements and maintenance window config.
    /// Returned as part of GET /api/mobile/app-config.
    /// </summary>
    public class MobileAppConfiguration : BaseEntity
    {
        public Guid SchoolId { get; set; }

        [MaxLength(20)]
        public string MinVersion { get; set; } = "1.0.0";

        [MaxLength(20)]
        public string RecommendedVersion { get; set; } = "1.0.0";

        [MaxLength(20)]
        public string? ForceUpdateVersion { get; set; }

        public bool MaintenanceMode { get; set; } = false;

        [MaxLength(500)]
        public string? MaintenanceMessage { get; set; }

        public bool IsActive { get; set; } = true;
    }

    /// <summary>
    /// Per-school mobile feature flag overrides (e.g. "mobile.attendance.offline" = true).
    /// Augments SchoolFeaturePermissions which controls module-level access.
    /// </summary>
    public class MobileFeatureFlag : BaseEntity
    {
        public Guid SchoolId { get; set; }

        /// <summary>Dot-separated key, e.g. "mobile.attendance.offline".</summary>
        [Required, MaxLength(100)]
        public string FlagKey { get; set; } = string.Empty;

        public bool IsEnabled { get; set; } = false;

        [MaxLength(200)]
        public string? Notes { get; set; }
    }

    /// <summary>
    /// Audit log for FCM/APNS push delivery attempts.
    /// Used to detect invalid tokens and track delivery reliability.
    /// </summary>
    public class NotificationDeliveryLog : BaseEntity
    {
        public Guid NotificationId { get; set; }
        public Guid UserId { get; set; }

        [MaxLength(10)]
        public string Platform { get; set; } = string.Empty;

        /// <summary>"Sent", "Failed", "InvalidToken", "Skipped"</summary>
        [MaxLength(20)]
        public string DeliveryStatus { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? ErrorMessage { get; set; }

        public DateTime AttemptedAt { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// Per-school mobile app branding overrides.
    /// Used for white-label builds: stores colors, asset URLs, and app metadata.
    /// Returned by GET /api/mobile/branding; managed by Admin/Principal via PUT.
    /// One row per school (unique on SchoolId).
    /// </summary>
    public class MobileAppBranding : BaseEntity
    {
        public Guid SchoolId { get; set; }

        /// <summary>Display name used in the app (may differ from the store listing name).</summary>
        [MaxLength(100)]
        public string? AppName { get; set; }

        /// <summary>S3 URL to a 1024×1024 PNG app icon.</summary>
        [MaxLength(1024)]
        public string? AppIconUrl { get; set; }

        /// <summary>S3 URL to a 2048×2048 PNG splash screen image.</summary>
        [MaxLength(1024)]
        public string? SplashScreenUrl { get; set; }

        /// <summary>Hex color applied to tab bar active state, header, buttons, badges. Default: Vitana blue.</summary>
        [Required, MaxLength(9)]
        public string PrimaryColor { get; set; } = "#1a6fd8";

        /// <summary>Hex accent / secondary color. Default: Vitana teal.</summary>
        [Required, MaxLength(9)]
        public string AccentColor { get; set; } = "#17a2b8";

        /// <summary>Google Fonts family name for headings (e.g. "Poppins").</summary>
        [MaxLength(100)]
        public string? FontHeading { get; set; }

        /// <summary>Google Fonts family name for body text (e.g. "Inter").</summary>
        [MaxLength(100)]
        public string? FontBody { get; set; }

        /// <summary>Short one-line description used in app store listings.</summary>
        [MaxLength(80)]
        public string? StoreShortDescription { get; set; }

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public Guid UpdatedBy { get; set; }
    }
}
