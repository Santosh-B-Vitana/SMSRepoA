using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SmsApi.Models.DTOs
{
    // ========== ANNOUNCEMENT BASIC DTO (for GET list) ==========
    public class AnnouncementBasicDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string TargetAudience { get; set; } = string.Empty;
        public string Priority { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? PublishedByName { get; set; }
        public DateTime? PublishDate { get; set; }
        public int ReadCount { get; set; }
        public bool IsPinned { get; set; }
    }

    // ========== ANNOUNCEMENT FULL DTO ==========
    public class AnnouncementFullDto
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string TargetAudience { get; set; } = string.Empty;
        public List<string> TargetGroups { get; set; } = new();
        public List<Guid> TargetUserIds { get; set; } = new();
        public string Priority { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public Guid? PublishedBy { get; set; }
        public string? PublishedByName { get; set; }
        public DateTime? PublishDate { get; set; }
        public DateTime? ScheduleDate { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public List<AttachmentDto> Attachments { get; set; } = new();
        public int ReadCount { get; set; }
        public int AcknowledgedCount { get; set; }
        public int TotalTargetCount { get; set; }
        public bool IsPinned { get; set; }
        public bool RequiresAcknowledgement { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class AttachmentDto
    {
        public Guid Id { get; set; }
        public string FileName { get; set; } = string.Empty;
        public string FileUrl { get; set; } = string.Empty;
        public string FileType { get; set; } = string.Empty;
        public int FileSize { get; set; }
    }

    // ========== MESSAGE BASIC DTO (for GET list) ==========
    public class MessageBasicDto
    {
        public Guid Id { get; set; }
        public string? FromName { get; set; }
        public int RecipientCount { get; set; }
        public string Subject { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime? SentAt { get; set; }
    }

    // ========== MESSAGE FULL DTO ==========
    public class MessageFullDto
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid? FromUserId { get; set; }
        public string? FromName { get; set; }
        public List<RecipientDto> Recipients { get; set; } = new();
        public string Subject { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty; // email, sms, push_notification, whatsapp
        public string Status { get; set; } = string.Empty; // queued, sent, delivered, failed, bounced
        public string Priority { get; set; } = string.Empty;
        public DateTime? SentAt { get; set; }
        public DateTime? DeliveredAt { get; set; }
        public string? FailureReason { get; set; }
        public Guid? TemplateId { get; set; }
        public string? TemplateName { get; set; }
        public Dictionary<string, object> Metadata { get; set; } = new();
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class RecipientDto
    {
        public Guid UserId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Phone { get; set; }
    }

    // ========== TEMPLATE DTOs ==========
    public class MessageTemplateDto
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string? Subject { get; set; }
        public string Content { get; set; } = string.Empty;
        public List<string> Variables { get; set; } = new();
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    // ========== CREATE DTOs ==========
    public class CreateAnnouncementDto
    {
        [Required]
        [MaxLength(500)]
        public string Title { get; set; } = string.Empty;

        [Required]
        public string Content { get; set; } = string.Empty;

        [Required]
        [RegularExpression("^(all|students|parents|staff|specific_class|specific_section)$")]
        public string TargetAudience { get; set; } = string.Empty;

        public List<string>? TargetGroups { get; set; }
        public List<Guid>? TargetUserIds { get; set; }

        [RegularExpression("^(low|medium|high|urgent|critical)$")]
        public string Priority { get; set; } = "medium";

        [RegularExpression("^(general|academic|event|holiday|exam|fee|emergency)$")]
        public string Category { get; set; } = "general";

        public DateTime? ScheduleDate { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public bool IsPinned { get; set; }
        public bool RequiresAcknowledgement { get; set; }
        public bool PublishImmediately { get; set; }
    }

    public class UpdateAnnouncementDto
    {
        [MaxLength(500)]
        public string? Title { get; set; }

        public string? Content { get; set; }
        public string? Priority { get; set; }
        public string? Category { get; set; }
        public string? Status { get; set; }
        public DateTime? ScheduleDate { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public bool? IsPinned { get; set; }
    }

    public class CreateMessageDto
    {
        [Required]
        public List<Guid> ToUserIds { get; set; } = new();

        [MaxLength(200)]
        public string? Subject { get; set; }

        [Required]
        public string Content { get; set; } = string.Empty;

        [Required]
        [RegularExpression("^(email|sms|push_notification|whatsapp)$")]
        public string Type { get; set; } = string.Empty;

        [RegularExpression("^(normal|high)$")]
        public string Priority { get; set; } = "normal";

        public Guid? TemplateId { get; set; }
        public Dictionary<string, string>? TemplateVariables { get; set; }
    }

    public class BulkSendMessageDto
    {
        [Required]
        [RegularExpression("^(all|students|parents|staff|specific_class|specific_section)$")]
        public string TargetAudience { get; set; } = string.Empty;

        public List<string>? TargetGroups { get; set; }

        [MaxLength(200)]
        public string? Subject { get; set; }

        [Required]
        public string Content { get; set; } = string.Empty;

        [Required]
        [RegularExpression("^(email|sms|push_notification|whatsapp)$")]
        public string Type { get; set; } = string.Empty;

        public Guid? TemplateId { get; set; }
        public Dictionary<string, string>? TemplateVariables { get; set; }
    }

    public class CreateTemplateDto
    {
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [RegularExpression("^(email|sms|push_notification|whatsapp)$")]
        public string Type { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Category { get; set; } = string.Empty;

        [MaxLength(200)]
        public string? Subject { get; set; }

        [Required]
        public string Content { get; set; } = string.Empty;

        public List<string> Variables { get; set; } = new();
    }

    public class MarkAnnouncementReadDto
    {
        [Required]
        public Guid UserId { get; set; }

        public bool Acknowledged { get; set; }
    }

    // ========== SCHEDULE DTO ==========
    public class NotificationScheduleDto
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public Guid TemplateId { get; set; }
        public string? TemplateName { get; set; }
        public string TargetAudience { get; set; } = string.Empty;
        public string ScheduleType { get; set; } = string.Empty; // once, daily, weekly, monthly
        public string ScheduledTime { get; set; } = string.Empty;
        public DateTime? NextRunTime { get; set; }
        public DateTime? LastRunTime { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    // ========== STATS DTO ==========
    public class CommunicationStatsDto
    {
        public int TotalAnnouncements { get; set; }
        public int PublishedAnnouncements { get; set; }
        public int TotalMessages { get; set; }
        public int SentMessages { get; set; }
        public int FailedMessages { get; set; }
        public decimal DeliveryRate { get; set; }
        public decimal AvgReadRate { get; set; }
        public Dictionary<string, int> MessagesByType { get; set; } = new();
        public Dictionary<string, int> AnnouncementsByCategory { get; set; } = new();
    }

    public class CommunicationFiltersDto
    {
        public string? TargetAudience { get; set; }
        public string? Priority { get; set; }
        public string? Category { get; set; }
        public string? Status { get; set; }
        public string? Type { get; set; }
        public string? SearchQuery { get; set; }
        public DateTime? DateFrom { get; set; }
        public DateTime? DateTo { get; set; }
    }

    // ========== LIST RESPONSES ==========
    public class MessageListResponse
    {
        public List<MessageBasicDto> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    public class TemplateListResponse
    {
        public List<MessageTemplateDto> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    // ========== MISSING DTOs ==========
    
    public class AnnouncementFiltersDto
    {
        public bool? IsActive { get; set; }
        public bool? IsPinned { get; set; }
        public string? TargetAudience { get; set; }
        public string? Priority { get; set; }
        public string? Category { get; set; }
        public string? Status { get; set; }
        public string? Search { get; set; }
        public string? SearchQuery { get; set; }
        public DateTime? DateFrom { get; set; }
        public DateTime? DateTo { get; set; }
    }

    public class MessageFiltersDto
    {
        public Guid? FromUserId { get; set; }
        public Guid? ToUserId { get; set; }
        public string? Type { get; set; }
        public string? Status { get; set; }
        public DateTime? DateFrom { get; set; }
        public DateTime? DateTo { get; set; }
        public string? SearchQuery { get; set; }
    }

    public class SendMessageDto
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public List<Guid> ToUserIds { get; set; } = new();
        
        public string? Subject { get; set; }
        
        [Required]
        public string Content { get; set; } = string.Empty;
        
        [Required]
        public string Type { get; set; } = string.Empty; // email, sms, push_notification, whatsapp
        
        public string Priority { get; set; } = "normal";
        public Guid? TemplateId { get; set; }
        public Dictionary<string, string>? TemplateVariables { get; set; }
    }

    public class BulkMessageResultDto
    {
        public int TotalRecipients { get; set; }
        public int SuccessCount { get; set; }
        public int FailureCount { get; set; }
        public List<string> FailedRecipients { get; set; } = new();
        public string Message { get; set; } = string.Empty;
    }

    public class CommunicationTemplateDto
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string? Subject { get; set; }
        public string Content { get; set; } = string.Empty;
        public List<string> Variables { get; set; } = new();
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class UpdateTemplateDto
    {
        public string? Name { get; set; }
        public string? Subject { get; set; }
        public string? Content { get; set; }
        public List<string>? Variables { get; set; }
        public bool? IsActive { get; set; }
    }

    // ========== STAFF-TO-PARENT MESSAGING DTOs ==========

    public class GuardianInfoDto
    {
        public Guid GuardianId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Relation { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string? Email { get; set; }
        public Guid? PortalUserId { get; set; }  // UserLogins.Id if they have a portal account
    }

    public class StudentBasicDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? PhotoUrl { get; set; }
        public string Class { get; set; } = string.Empty;
        public string Section { get; set; } = string.Empty;
        public string RollNumber { get; set; } = string.Empty;
        public List<GuardianInfoDto> Guardians { get; set; } = new();
    }

    public class SendStaffParentMessageDto
    {
        [Required]
        [MinLength(3)]
        public string Subject { get; set; } = string.Empty;

        [Required]
        [MinLength(10)]
        public string Message { get; set; } = string.Empty;

        [Required]
        public Guid ParentUserId { get; set; }

        public Guid? StudentId { get; set; }

        public string? MessageType { get; set; } = "Text";
    }

    public class StaffParentMessageDto
    {
        public Guid Id { get; set; }
        public Guid StaffId { get; set; }
        public string? StaffName { get; set; }
        public Guid ParentUserId { get; set; }
        public string? ParentName { get; set; }
        public string? ParentEmail { get; set; }
        public Guid? StudentId { get; set; }
        public string? StudentName { get; set; }
        public string Subject { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string MessageType { get; set; } = "Text";
        public DateTime SentAt { get; set; }
        public bool IsRead { get; set; }
        public DateTime? ReadAt { get; set; }
    }

    public class BulkSendStaffParentDto
    {
        [Required]
        [MinLength(3)]
        public string Subject { get; set; } = string.Empty;

        [Required]
        [MinLength(10)]
        public string Message { get; set; } = string.Empty;

        public List<Guid>? ParentUserIds { get; set; }

        public bool SendToAllClassParents { get; set; } = false;

        public string? MessageType { get; set; } = "Text";
    }

    public class BulkSendResultDto
    {
        public int TotalSent { get; set; }
        public int SuccessCount { get; set; }
        public int FailureCount { get; set; }
        public DateTime SentAt { get; set; }
        public List<string> FailedParentEmails { get; set; } = new();
    }
}
