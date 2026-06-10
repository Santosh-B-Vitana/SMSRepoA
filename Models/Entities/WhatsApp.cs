using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities;

// ── School WhatsApp Settings ──────────────────────────────────────────────────

public class WhatsappSettings : BaseEntity
{
    [Required]
    public Guid SchoolId { get; set; }

    public bool IsEnabled { get; set; } = false;

    /// <summary>FK to CRM.SchoolWhatsappAccounts (int, cross-DB — stored as int, not FK constraint)</summary>
    public int? CrmAccountId { get; set; }

    [MaxLength(10)]
    public string DefaultLanguage { get; set; } = "en";

    public bool AutoSendOnEvents { get; set; } = true;

    [ForeignKey("SchoolId")]
    public School School { get; set; } = null!;
}

// ── WhatsApp Templates ────────────────────────────────────────────────────────

public class WhatsappTemplate : BaseEntity
{
    [Required]
    public Guid SchoolId { get; set; }

    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(30)]
    public string Category { get; set; } = "Utility";
    // Utility | Authentication | Marketing

    [MaxLength(10)]
    public string Language { get; set; } = "en";

    [MaxLength(30)]
    public string Status { get; set; } = "Draft";
    // Draft | Submitted | Approved | Rejected | Paused | Disabled

    [MaxLength(100)]
    public string? MetaTemplateId { get; set; }

    [MaxLength(200)]
    public string? MetaTemplateName { get; set; }

    [Required]
    public string BodyText { get; set; } = string.Empty;

    [MaxLength(20)]
    public string HeaderType { get; set; } = "None";
    // None | Text | Image | Video | Document

    [MaxLength(500)]
    public string? HeaderValue { get; set; }

    [MaxLength(200)]
    public string? FooterText { get; set; }

    public bool HasButtons { get; set; } = false;

    public string? ButtonsJson { get; set; }

    [MaxLength(1000)]
    public string? RejectionReason { get; set; }

    public DateTime? SubmittedAt { get; set; }
    public DateTime? ApprovedAt { get; set; }

    [MaxLength(50)]
    public string? EventCategory { get; set; }
    // attendance | fees | exams | admissions | leave | diary | announcements | emergency | transport | hostel | payroll | library | visitor | general

    [ForeignKey("SchoolId")]
    public School School { get; set; } = null!;

    public ICollection<WhatsappTemplateVersion> Versions { get; set; } = new List<WhatsappTemplateVersion>();
    public ICollection<WhatsappTemplateMapping> Mappings { get; set; } = new List<WhatsappTemplateMapping>();
}

public class WhatsappTemplateVersion : BaseEntity
{
    [Required]
    public Guid TemplateId { get; set; }

    [Required]
    public Guid SchoolId { get; set; }

    public int Version { get; set; } = 1;

    [Required]
    public string BodyText { get; set; } = string.Empty;

    [MaxLength(20)]
    public string HeaderType { get; set; } = "None";

    [MaxLength(500)]
    public string? HeaderValue { get; set; }

    [MaxLength(200)]
    public string? FooterText { get; set; }

    public string? ButtonsJson { get; set; }

    [MaxLength(30)]
    public string Status { get; set; } = "Draft";

    [ForeignKey("TemplateId")]
    public WhatsappTemplate Template { get; set; } = null!;
}

// ── Template Mappings (Event → Template) ─────────────────────────────────────

public class WhatsappTemplateMapping : BaseEntity
{
    [Required]
    public Guid SchoolId { get; set; }

    [Required, MaxLength(100)]
    public string EventKey { get; set; } = string.Empty;
    // e.g. attendance.student_absent, fees.fee_due, exams.result_published

    [Required]
    public Guid TemplateId { get; set; }

    public bool IsEnabled { get; set; } = true;

    [MaxLength(30)]
    public string AudienceType { get; set; } = "Parent";
    // Parent | Student | Staff | Admin | All

    [ForeignKey("SchoolId")]
    public School School { get; set; } = null!;

    [ForeignKey("TemplateId")]
    public WhatsappTemplate Template { get; set; } = null!;
}

// ── Message Queue ─────────────────────────────────────────────────────────────

public class WhatsappMessageQueue : BaseEntity
{
    [Required]
    public Guid SchoolId { get; set; }

    [Required, MaxLength(20)]
    public string RecipientPhone { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? RecipientName { get; set; }

    [MaxLength(30)]
    public string RecipientType { get; set; } = "Parent";
    // Parent | Student | Staff | Admin

    public Guid? TemplateId { get; set; }

    public string? PlaceholdersJson { get; set; }

    [MaxLength(100)]
    public string? EventKey { get; set; }

    public Guid? EntityId { get; set; }

    [MaxLength(100)]
    public string? EntityType { get; set; }

    /// <summary>1=Critical, 2=High, 3=Medium, 4=Low</summary>
    public int Priority { get; set; } = 2;

    [MaxLength(30)]
    public string Status { get; set; } = "Pending";
    // Pending | Processing | Sent | Failed | Skipped

    public DateTime ScheduledAt { get; set; } = DateTime.UtcNow;
    public DateTime? ProcessedAt { get; set; }
    public int AttemptCount { get; set; } = 0;

    [MaxLength(1000)]
    public string? LastError { get; set; }

    [ForeignKey("SchoolId")]
    public School School { get; set; } = null!;
}

// ── Message Logs (full history) ───────────────────────────────────────────────

public class WhatsappMessageLog : BaseEntity
{
    [Required]
    public Guid SchoolId { get; set; }

    public Guid? QueueId { get; set; }

    [Required, MaxLength(20)]
    public string RecipientPhone { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? RecipientName { get; set; }

    public Guid? TemplateId { get; set; }

    [MaxLength(200)]
    public string? TemplateName { get; set; }

    public string? PlaceholdersJson { get; set; }

    [MaxLength(100)]
    public string? MetaMessageId { get; set; }

    [MaxLength(100)]
    public string? WaMessageId { get; set; }

    [MaxLength(100)]
    public string? EventKey { get; set; }

    public Guid? EntityId { get; set; }

    [MaxLength(100)]
    public string? EntityType { get; set; }

    [MaxLength(30)]
    public string Status { get; set; } = "Queued";
    // Queued | Accepted | Sent | Delivered | Read | Failed | Expired | Blocked | Rejected

    public DateTime? QueuedAt { get; set; }
    public DateTime? SentAt { get; set; }
    public DateTime? DeliveredAt { get; set; }
    public DateTime? ReadAt { get; set; }
    public DateTime? FailedAt { get; set; }

    public string? ProviderResponseJson { get; set; }

    [MaxLength(100)]
    public string? ConversationId { get; set; }

    [MaxLength(30)]
    public string? ConversationCategory { get; set; }

    public bool ConversationBillable { get; set; } = false;

    [MaxLength(1000)]
    public string? ErrorMessage { get; set; }

    [ForeignKey("SchoolId")]
    public School School { get; set; } = null!;
}

// ── Webhook Events (raw storage) ──────────────────────────────────────────────

public class WhatsappWebhookEvent : BaseEntity
{
    [Required]
    public Guid SchoolId { get; set; }

    [MaxLength(100)]
    public string EventType { get; set; } = string.Empty;

    [Required]
    public string Payload { get; set; } = string.Empty;

    public bool Processed { get; set; } = false;
    public DateTime? ProcessedAt { get; set; }

    [MaxLength(1000)]
    public string? Error { get; set; }

    public DateTime ReceivedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey("SchoolId")]
    public School School { get; set; } = null!;
}

// ── Usage Tracking ────────────────────────────────────────────────────────────

public class WhatsappUsage : BaseEntity
{
    [Required]
    public Guid SchoolId { get; set; }

    [Required, MaxLength(6)]
    public string Period { get; set; } = string.Empty; // YYYYMM

    public int MessagesSent { get; set; } = 0;
    public int MessagesDelivered { get; set; } = 0;
    public int MessagesRead { get; set; } = 0;
    public int MessagesFailed { get; set; } = 0;
    public int OverageMessages { get; set; } = 0;
    public int ConversationsCount { get; set; } = 0;
    public decimal EstimatedCostInr { get; set; } = 0m;

    public DateTime LastUpdatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey("SchoolId")]
    public School School { get; set; } = null!;
}

public class WhatsappUsageHistory : BaseEntity
{
    [Required]
    public Guid SchoolId { get; set; }

    [Required, MaxLength(6)]
    public string Period { get; set; } = string.Empty;

    public int MessagesSent { get; set; }
    public int MessagesDelivered { get; set; }
    public int MessagesFailed { get; set; }
    public int OverageMessages { get; set; }
    public int QuotaAtStart { get; set; }
    public int CarryForward { get; set; }

    public DateTime ArchivedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey("SchoolId")]
    public School School { get; set; } = null!;
}

// ── Contact Management ────────────────────────────────────────────────────────

public class WhatsappContact : BaseEntity
{
    [Required]
    public Guid SchoolId { get; set; }

    [Required, MaxLength(30)]
    public string EntityType { get; set; } = string.Empty;
    // Student | Staff | Parent | Visitor | Applicant

    public Guid? EntityId { get; set; }

    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(25)]
    public string Phone { get; set; } = string.Empty; // E.164 format

    [MaxLength(5)]
    public string CountryCode { get; set; } = "+91";

    public bool IsValidated { get; set; } = false;
    public bool IsOptedIn { get; set; } = true;
    public bool IsOptedOut { get; set; } = false;
    public bool IsBlacklisted { get; set; } = false;

    public DateTime? OptInAt { get; set; }
    public DateTime? OptOutAt { get; set; }
    public DateTime? BlacklistedAt { get; set; }

    [MaxLength(500)]
    public string? BlacklistReason { get; set; }

    [MaxLength(30)]
    public string ValidationStatus { get; set; } = "Unknown";
    // Unknown | Valid | Invalid

    public DateTime? LastValidatedAt { get; set; }
    public Guid? DuplicateOfId { get; set; }

    [ForeignKey("SchoolId")]
    public School School { get; set; } = null!;

    public ICollection<WhatsappOptInEvent> OptInEvents { get; set; } = new List<WhatsappOptInEvent>();
}

public class WhatsappOptInEvent : BaseEntity
{
    [Required]
    public Guid ContactId { get; set; }

    [Required]
    public Guid SchoolId { get; set; }

    [Required, MaxLength(30)]
    public string EventType { get; set; } = string.Empty;
    // OptIn | OptOut | Blacklist | Unblacklist

    [MaxLength(30)]
    public string Source { get; set; } = "SystemDefault";
    // SystemDefault | UserRequest | AdminAction | IncomingMsg

    public Guid? PerformedBy { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }

    [ForeignKey("ContactId")]
    public WhatsappContact Contact { get; set; } = null!;
}

// ── Retry Queue ───────────────────────────────────────────────────────────────

public class WhatsappRetryQueue : BaseEntity
{
    [Required]
    public Guid SchoolId { get; set; }

    public Guid? MessageLogId { get; set; }

    [Required, MaxLength(20)]
    public string RecipientPhone { get; set; } = string.Empty;

    public Guid? TemplateId { get; set; }
    public string? PlaceholdersJson { get; set; }

    public int AttemptCount { get; set; } = 0;
    public int MaxAttempts { get; set; } = 3;

    public DateTime? NextRetryAt { get; set; }

    [MaxLength(1000)]
    public string? LastError { get; set; }

    [MaxLength(20)]
    public string Status { get; set; } = "Pending";
    // Pending | Exhausted

    [ForeignKey("SchoolId")]
    public School School { get; set; } = null!;
}

// ── Audit Logs ────────────────────────────────────────────────────────────────

public class WhatsappAuditLog : BaseEntity
{
    [Required]
    public Guid SchoolId { get; set; }

    [MaxLength(100)]
    public string EntityType { get; set; } = string.Empty;

    public Guid? EntityId { get; set; }

    [Required, MaxLength(100)]
    public string Action { get; set; } = string.Empty;

    public Guid? PerformedBy { get; set; }

    public string? OldValueJson { get; set; }
    public string? NewValueJson { get; set; }

    [MaxLength(45)]
    public string? IpAddress { get; set; }

    [MaxLength(500)]
    public string? UserAgent { get; set; }

    [ForeignKey("SchoolId")]
    public School School { get; set; } = null!;
}

// ── Conversation Window Tracking (24h billing window) ────────────────────────

public class WhatsappConversation : BaseEntity
{
    [Required]
    public Guid SchoolId { get; set; }

    [Required, MaxLength(20)]
    public string ContactPhone { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? WaConversationId { get; set; }

    [MaxLength(30)]
    public string Category { get; set; } = "Utility";
    // Utility | Authentication | Marketing | Service

    public DateTime WindowStart { get; set; }
    public DateTime WindowEnd { get; set; }
    public int MessageCount { get; set; } = 1;
    public bool IsBillable { get; set; } = true;

    [ForeignKey("SchoolId")]
    public School School { get; set; } = null!;
}
