using System;
using System.Collections.Generic;

namespace SmsApi.Models.DTOs
{
    // ═══════════════════════════════════════════════════════════════
    // Constants
    // ═══════════════════════════════════════════════════════════════
    public static class AnnouncementConstants
    {
        public const int TitleMinLength     = 3;
        public const int TitleMaxLength     = 200;
        public const int ContentMinLength   = 10;
        public const int ContentMaxLength   = 5000;
        public const int AttachmentUrlMax   = 500;

        public const string PriorityLow    = "low";
        public const string PriorityNormal = "normal";
        public const string PriorityHigh   = "high";
        public const string PriorityUrgent = "urgent";

        public const string AudienceAll      = "all";
        public const string AudienceStudents = "students";
        public const string AudienceStaff    = "staff";
        public const string AudienceParents  = "parents";
        public const string AudienceClass    = "class";
        public const string AudienceSection  = "section";

        public static readonly IReadOnlyList<string> ValidPriorities = new[]
            { PriorityLow, PriorityNormal, PriorityHigh, PriorityUrgent };

        public static readonly IReadOnlyList<string> ValidAudiences = new[]
            { AudienceAll, AudienceStudents, AudienceStaff, AudienceParents, AudienceClass, AudienceSection };
    }

    // ═══════════════════════════════════════════════════════════════
    // Requests
    // ═══════════════════════════════════════════════════════════════
    public class CreateAnnouncementRequest
    {
        // SchoolId is injected by the service from ITenantContext — NOT from request body
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public Guid CreatedByStaffId { get; set; }
        public string Priority { get; set; } = AnnouncementConstants.PriorityNormal;
        public string TargetAudience { get; set; } = AnnouncementConstants.AudienceAll;
        public Guid? TargetClassId { get; set; }
        public Guid? TargetSectionId { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public bool IsPinned { get; set; } = false;
        public string? AttachmentUrl { get; set; }
    }

    public class UpdateAnnouncementRequest
    {
        public string? Title { get; set; }
        public string? Content { get; set; }
        public string? Priority { get; set; }
        public string? TargetAudience { get; set; }
        public Guid? TargetClassId { get; set; }
        public Guid? TargetSectionId { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public bool? IsPinned { get; set; }
        public bool? IsActive { get; set; }
        public string? AttachmentUrl { get; set; }
    }

    // ═══════════════════════════════════════════════════════════════
    // Responses
    // ═══════════════════════════════════════════════════════════════
    public class AnnouncementResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public Guid CreatedByStaffId { get; set; }
        public string? CreatedByStaffName { get; set; }
        public string Priority { get; set; } = string.Empty;
        public string TargetAudience { get; set; } = string.Empty;
        public Guid? TargetClassId { get; set; }
        public string? TargetClassName { get; set; }
        public Guid? TargetSectionId { get; set; }
        public string? TargetSectionName { get; set; }
        public DateTime PublishedDate { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public bool IsActive { get; set; }
        public bool IsPinned { get; set; }
        public bool IsExpired { get; set; }
        public string? AttachmentUrl { get; set; }
        public int TotalRecipients { get; set; }
        public int ReadCount { get; set; }
        public int UnreadCount { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class AnnouncementListResponse
    {
        public List<AnnouncementResponse> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    public class AnnouncementStatsDto
    {
        public int TotalAnnouncements   { get; set; }
        public int ActiveAnnouncements  { get; set; }
        public int PinnedAnnouncements  { get; set; }
        public int UrgentAnnouncements  { get; set; }
        public int ExpiringToday        { get; set; }
        public int ExpiredAnnouncements { get; set; }
        public int TotalRecipients      { get; set; }
        public int ReadCount            { get; set; }
        public int UnreadCount          { get; set; }
        public Dictionary<string, int> ByPriority { get; set; } = new();
        public Dictionary<string, int> ByAudience { get; set; } = new();
    }

    // ═══════════════════════════════════════════════════════════════
    // Read / Recipients
    // ═══════════════════════════════════════════════════════════════
    public class MarkAnnouncementAsReadRequest
    {
        public Guid AnnouncementId { get; set; }
        public string RecipientType { get; set; } = string.Empty; // Student, Staff, Parent
        public Guid RecipientId { get; set; }
    }

    public class AnnouncementRecipientResponse
    {
        public Guid Id { get; set; }
        public Guid AnnouncementId { get; set; }
        public string RecipientType { get; set; } = string.Empty;
        public Guid RecipientId { get; set; }
        public string? RecipientName { get; set; }
        public bool IsRead { get; set; }
        public DateTime? ReadAt { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class AnnouncementRecipientsListResponse
    {
        public List<AnnouncementRecipientResponse> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

}
