using System.ComponentModel.DataAnnotations;

namespace SmsApi.Models.DTOs
{
    // ──────────────────────────────────────────────
    // Request DTOs
    // ──────────────────────────────────────────────

    /// <summary>Send a notification to a single recipient.</summary>
    public class SendNotificationRequest
    {
        [Required]
        public Guid RecipientId { get; set; }

        [Required, MaxLength(50)]
        public string RecipientType { get; set; } = string.Empty; // Student, Staff, Parent

        [Required, MaxLength(50)]
        public string Type { get; set; } = string.Empty; // Fee, Attendance, Exam, Assignment, Announcement, Message, General

        [Required, MinLength(2), MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required, MinLength(1), MaxLength(5000)]
        public string Content { get; set; } = string.Empty;

        [MaxLength(50)]
        public string Priority { get; set; } = "Normal"; // Low, Normal, High, Urgent

        [MaxLength(500)]
        public string? ActionUrl { get; set; }

        public Guid? ReferenceId { get; set; }

        [MaxLength(50)]
        public string? ReferenceType { get; set; }
    }

    /// <summary>Broadcast a notification to multiple recipients (by role, class, or explicit IDs).</summary>
    public class BroadcastNotificationRequest
    {
        /// <summary>Explicit list of recipient IDs. If provided, RecipientType is required.</summary>
        public List<Guid>? RecipientIds { get; set; }

        /// <summary>Broadcast to all users of this role: Student, Staff, Parent, Teacher.</summary>
        [MaxLength(50)]
        public string? RecipientRole { get; set; }

        [Required, MaxLength(50)]
        public string RecipientType { get; set; } = string.Empty;

        [Required, MaxLength(50)]
        public string Type { get; set; } = string.Empty;

        [Required, MinLength(2), MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required, MinLength(1), MaxLength(5000)]
        public string Content { get; set; } = string.Empty;

        [MaxLength(50)]
        public string Priority { get; set; } = "Normal";

        [MaxLength(500)]
        public string? ActionUrl { get; set; }

        public Guid? ReferenceId { get; set; }

        [MaxLength(50)]
        public string? ReferenceType { get; set; }
    }

    // ──────────────────────────────────────────────
    // Response DTOs
    // ──────────────────────────────────────────────

    public class NotificationResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid RecipientId { get; set; }
        public string RecipientType { get; set; } = string.Empty;
        public Guid? SenderId { get; set; }
        public string? SenderName { get; set; }
        public string Type { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string? ActionUrl { get; set; }
        public Guid? ReferenceId { get; set; }
        public string? ReferenceType { get; set; }
        public bool IsRead { get; set; }
        public DateTime? ReadAt { get; set; }
        public string Priority { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        /// <summary>For parent notifications: the student this notification relates to.</summary>
        public Guid? StudentId { get; set; }
    }

    public class NotificationListResponse
    {
        public List<NotificationResponse> Notifications { get; set; } = new();
        public int Total { get; set; }
        public int UnreadCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    public class NotificationStatsResponse
    {
        public int Total { get; set; }
        public int Unread { get; set; }
        public int Read { get; set; }
        public double ReadRate { get; set; }
        public Dictionary<string, int> ByType { get; set; } = new();
        public Dictionary<string, int> ByPriority { get; set; } = new();
        public int SentLast24Hours { get; set; }
        public int SentLast7Days { get; set; }
    }

    public class BroadcastResult
    {
        public int TotalRecipients { get; set; }
        public int Sent { get; set; }
        public int Failed { get; set; }
        public List<string> Errors { get; set; } = new();
    }

    public class UnreadCountResponse
    {
        public int UnreadCount { get; set; }
    }
}
