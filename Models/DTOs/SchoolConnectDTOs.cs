using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SmsApi.Models.DTOs
{
    // ==================== POST DTOs ====================

    /// <summary>
    /// Response DTO for a School Connect post
    /// </summary>
    public class SchoolConnectPostResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid AuthorId { get; set; }
        public string AuthorName { get; set; } = string.Empty;
        public string AuthorRole { get; set; } = string.Empty;
        public string? AuthorAvatar { get; set; }
        public string Content { get; set; } = string.Empty;
        public string? MediaType { get; set; }
        public string? MediaUrl { get; set; }
        public string Visibility { get; set; } = "public";
        public Guid? TargetClassId { get; set; }
        public Guid? TargetGroupId { get; set; }
        public int LikesCount { get; set; }
        public int CommentsCount { get; set; }
        public int SharesCount { get; set; }
        public int ViewsCount { get; set; }
        public bool IsPinned { get; set; }
        public DateTime? PinnedAt { get; set; }
        public bool IsScheduled { get; set; }
        public DateTime? ScheduledPublishAt { get; set; }
        public bool IsPublished { get; set; }
        public bool IsReported { get; set; }
        public int ReportCount { get; set; }
        public List<string> Tags { get; set; } = new();
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public bool IsLikedByCurrentUser { get; set; }
        public List<SchoolConnectCommentResponse> RecentComments { get; set; } = new();
    }

    /// <summary>
    /// Response for paginated list of posts
    /// </summary>
    public class SchoolConnectPostListResponse
    {
        public List<SchoolConnectPostResponse> Posts { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    /// <summary>
    /// Request to create a new post
    /// </summary>
    public class CreateSchoolConnectPostRequest
    {
        public Guid SchoolId { get; set; }
        public Guid AuthorId { get; set; }

        [Required]
        [MaxLength(100)]
        public string AuthorName { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string AuthorRole { get; set; } = string.Empty;

        public string? AuthorAvatar { get; set; }

        [Required]
        [MinLength(1)]
        public string Content { get; set; } = string.Empty;

        [MaxLength(20)]
        public string? MediaType { get; set; }

        public string? MediaUrl { get; set; }

        [MaxLength(20)]
        public string Visibility { get; set; } = "public";

        public Guid? TargetClassId { get; set; }
        public Guid? TargetGroupId { get; set; }

        public bool IsScheduled { get; set; } = false;
        public DateTime? ScheduledPublishAt { get; set; }

        public List<string>? Tags { get; set; }
    }

    /// <summary>
    /// Request to update an existing post
    /// </summary>
    public class UpdateSchoolConnectPostRequest
    {
        [Required]
        [MinLength(1)]
        public string Content { get; set; } = string.Empty;

        [MaxLength(20)]
        public string? MediaType { get; set; }

        public string? MediaUrl { get; set; }

        [MaxLength(20)]
        public string? Visibility { get; set; }

        public Guid? TargetClassId { get; set; }
        public Guid? TargetGroupId { get; set; }

        public List<string>? Tags { get; set; }
    }

    // ==================== COMMENT DTOs ====================

    /// <summary>
    /// Response DTO for a comment
    /// </summary>
    public class SchoolConnectCommentResponse
    {
        public Guid Id { get; set; }
        public Guid PostId { get; set; }
        public Guid? ParentCommentId { get; set; }
        public Guid AuthorId { get; set; }
        public string AuthorName { get; set; } = string.Empty;
        public string? AuthorRole { get; set; }
        public string? AuthorAvatar { get; set; }
        public string Content { get; set; } = string.Empty;
        public int LikesCount { get; set; }
        public bool IsEdited { get; set; }
        public DateTime? EditedAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public bool IsLikedByCurrentUser { get; set; }
        public List<SchoolConnectCommentResponse> Replies { get; set; } = new();
    }

    /// <summary>
    /// Response for paginated list of comments
    /// </summary>
    public class SchoolConnectCommentListResponse
    {
        public List<SchoolConnectCommentResponse> Comments { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    /// <summary>
    /// Request to create a new comment
    /// </summary>
    public class CreateSchoolConnectCommentRequest
    {
        [Required]
        public Guid PostId { get; set; }

        public Guid? ParentCommentId { get; set; }

        public Guid AuthorId { get; set; }

        // AuthorName, AuthorRole, and AuthorAvatar are set server-side from JWT claims
        // in the controller — they must NOT be validated from the request body.
        [MaxLength(100)]
        public string AuthorName { get; set; } = string.Empty;

        [MaxLength(50)]
        public string? AuthorRole { get; set; }

        public string? AuthorAvatar { get; set; }

        [Required]
        [MinLength(1)]
        [MaxLength(2000)]
        public string Content { get; set; } = string.Empty;
    }

    /// <summary>
    /// Request to update an existing comment
    /// </summary>
    public class UpdateSchoolConnectCommentRequest
    {
        [Required]
        [MinLength(1)]
        [MaxLength(2000)]
        public string Content { get; set; } = string.Empty;
    }

    // ==================== LIKE DTOs ====================

    /// <summary>
    /// Request to like/unlike a post
    /// </summary>
    public class SchoolConnectLikeRequest
    {
        public Guid UserId { get; set; }
        public string? UserName { get; set; }
    }

    /// <summary>
    /// Response after liking/unliking
    /// </summary>
    public class SchoolConnectLikeResponse
    {
        public bool IsLiked { get; set; }
        public int TotalLikes { get; set; }
    }

    // ==================== REPORT DTOs ====================

    /// <summary>
    /// Request to report a post
    /// </summary>
    public class CreateSchoolConnectReportRequest
    {
        [Required]
        public Guid PostId { get; set; }

        public Guid ReportedById { get; set; }

        public string? ReporterName { get; set; }

        [Required]
        [MaxLength(50)]
        public string Reason { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Details { get; set; }
    }

    /// <summary>
    /// Response for a report
    /// </summary>
    public class SchoolConnectReportResponse
    {
        public Guid Id { get; set; }
        public Guid PostId { get; set; }
        public Guid ReportedById { get; set; }
        public string? ReporterName { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string? Details { get; set; }
        public string Status { get; set; } = "pending";
        public Guid? ReviewedById { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public string? ReviewNotes { get; set; }
        public DateTime CreatedAt { get; set; }
        public SchoolConnectPostResponse? Post { get; set; }
    }

    /// <summary>
    /// Response for list of reports (moderation queue)
    /// </summary>
    public class SchoolConnectReportListResponse
    {
        public List<SchoolConnectReportResponse> Reports { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    /// <summary>
    /// Request to review a report
    /// </summary>
    public class ReviewSchoolConnectReportRequest
    {
        [Required]
        public string Status { get; set; } = string.Empty; // reviewed, dismissed, action_taken

        public Guid ReviewedById { get; set; }

        public string? ReviewNotes { get; set; }

        public bool HidePost { get; set; } = false;
    }

    // ==================== PIN DTOs ====================

    /// <summary>
    /// Request to pin/unpin a post
    /// </summary>
    public class SchoolConnectPinRequest
    {
        public Guid PinnedById { get; set; }
        public bool IsPinned { get; set; }
    }

    // ==================== SHARE DTOs ====================

    /// <summary>
    /// Request to share a post
    /// </summary>
    public class CreateSchoolConnectShareRequest
    {
        [Required]
        public Guid PostId { get; set; }

        public Guid SharedById { get; set; }

        public string? SharedByName { get; set; }

        [MaxLength(20)]
        public string ShareType { get; set; } = "internal";
    }

    // ==================== ANALYTICS DTOs ====================

    /// <summary>
    /// Analytics summary for School Connect
    /// </summary>
    public class SchoolConnectAnalyticsResponse
    {
        public int TotalPosts { get; set; }
        public int TotalComments { get; set; }
        public int TotalLikes { get; set; }
        public int TotalShares { get; set; }
        public int TotalActiveUsers { get; set; }
        public int PostsThisWeek { get; set; }
        public int PostsThisMonth { get; set; }
        public double EngagementRate { get; set; }
        public int TotalReach { get; set; }
        public int PendingReports { get; set; }
        public List<TopPostDto> TopPosts { get; set; } = new();
        public List<TopAuthorDto> TopAuthors { get; set; } = new();
    }

    public class TopPostDto
    {
        public Guid PostId { get; set; }
        public string Content { get; set; } = string.Empty;
        public string AuthorName { get; set; } = string.Empty;
        public int Engagement { get; set; }
    }

    public class TopAuthorDto
    {
        public Guid AuthorId { get; set; }
        public string AuthorName { get; set; } = string.Empty;
        public string AuthorRole { get; set; } = string.Empty;
        public int PostCount { get; set; }
        public int TotalEngagement { get; set; }
    }

    // ==================== FILTER DTOs ====================

    /// <summary>
    /// Filters for querying posts
    /// </summary>
    public class SchoolConnectPostFilters
    {
        public string? Visibility { get; set; }
        public Guid? AuthorId { get; set; }
        public string? AuthorRole { get; set; }
        public bool? IsPinned { get; set; }
        public bool? IsScheduled { get; set; }
        public bool? IsReported { get; set; }
        public string? SearchTerm { get; set; }
        public string? Tag { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public Guid? TargetClassId { get; set; }
    }

    // ==================== MEDIA UPLOAD DTO ====================

    public class UploadMediaResponse
    {
        public string Url { get; set; } = string.Empty;
        public string MediaType { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public long FileSizeBytes { get; set; }
    }
}
