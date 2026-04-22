using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    /// <summary>
    /// Represents a post in the School Connect social feed
    /// </summary>
    public class SchoolConnectPost : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        public Guid AuthorId { get; set; }

        [Required]
        [MaxLength(100)]
        public string AuthorName { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string AuthorRole { get; set; } = string.Empty; // Principal, Teacher, Staff, Student, Parent

        public string? AuthorAvatar { get; set; }

        [Required]
        public string Content { get; set; } = string.Empty;

        [MaxLength(20)]
        public string? MediaType { get; set; } // image, video, document, link

        public string? MediaUrl { get; set; }

        [Required]
        [MaxLength(20)]
        public string Visibility { get; set; } = "public"; // public, class, group, private

        // For class/group visibility - target audience
        public Guid? TargetClassId { get; set; }
        public Guid? TargetGroupId { get; set; }

        public int LikesCount { get; set; } = 0;
        public int CommentsCount { get; set; } = 0;
        public int SharesCount { get; set; } = 0;
        public int ViewsCount { get; set; } = 0;

        public bool IsPinned { get; set; } = false;
        public DateTime? PinnedAt { get; set; }
        public Guid? PinnedById { get; set; }

        public bool IsScheduled { get; set; } = false;
        public DateTime? ScheduledPublishAt { get; set; }
        public bool IsPublished { get; set; } = true;

        // Moderation
        public bool IsReported { get; set; } = false;
        public int ReportCount { get; set; } = 0;
        public bool IsHidden { get; set; } = false;
        public bool IsApproved { get; set; } = true;
        public Guid? ModeratedById { get; set; }
        public DateTime? ModeratedAt { get; set; }
        public string? ModerationNotes { get; set; }

        // Tags stored as comma-separated string
        public string? Tags { get; set; }

        public bool IsActive { get; set; } = true;

        // Navigation properties
        public virtual ICollection<SchoolConnectComment> Comments { get; set; } = new List<SchoolConnectComment>();
        public virtual ICollection<SchoolConnectPostLike> Likes { get; set; } = new List<SchoolConnectPostLike>();
        public virtual ICollection<SchoolConnectPostReport> Reports { get; set; } = new List<SchoolConnectPostReport>();
    }

    /// <summary>
    /// Represents a comment on a School Connect post
    /// </summary>
    public class SchoolConnectComment : BaseEntity
    {
        [Required]
        public Guid PostId { get; set; }

        public Guid? ParentCommentId { get; set; } // For nested replies

        [Required]
        public Guid AuthorId { get; set; }

        [Required]
        [MaxLength(100)]
        public string AuthorName { get; set; } = string.Empty;

        [MaxLength(50)]
        public string? AuthorRole { get; set; }

        public string? AuthorAvatar { get; set; }

        [Required]
        [MaxLength(2000)]
        public string Content { get; set; } = string.Empty;

        public int LikesCount { get; set; } = 0;

        public bool IsEdited { get; set; } = false;
        public DateTime? EditedAt { get; set; }

        public bool IsHidden { get; set; } = false;
        public bool IsActive { get; set; } = true;

        // Navigation properties
        [ForeignKey("PostId")]
        public virtual SchoolConnectPost? Post { get; set; }

        [ForeignKey("ParentCommentId")]
        public virtual SchoolConnectComment? ParentComment { get; set; }

        public virtual ICollection<SchoolConnectComment> Replies { get; set; } = new List<SchoolConnectComment>();
        public virtual ICollection<SchoolConnectCommentLike> Likes { get; set; } = new List<SchoolConnectCommentLike>();
    }

    /// <summary>
    /// Represents a like on a School Connect post
    /// </summary>
    public class SchoolConnectPostLike : BaseEntity
    {
        [Required]
        public Guid PostId { get; set; }

        [Required]
        public Guid UserId { get; set; }

        [MaxLength(100)]
        public string? UserName { get; set; }

        // Navigation property
        [ForeignKey("PostId")]
        public virtual SchoolConnectPost? Post { get; set; }
    }

    /// <summary>
    /// Represents a like on a School Connect comment
    /// </summary>
    public class SchoolConnectCommentLike : BaseEntity
    {
        [Required]
        public Guid CommentId { get; set; }

        [Required]
        public Guid UserId { get; set; }

        [MaxLength(100)]
        public string? UserName { get; set; }

        // Navigation property
        [ForeignKey("CommentId")]
        public virtual SchoolConnectComment? Comment { get; set; }
    }

    /// <summary>
    /// Represents a report on a School Connect post for moderation
    /// </summary>
    public class SchoolConnectPostReport : BaseEntity
    {
        [Required]
        public Guid PostId { get; set; }

        [Required]
        public Guid ReportedById { get; set; }

        [MaxLength(100)]
        public string? ReporterName { get; set; }

        [Required]
        [MaxLength(50)]
        public string Reason { get; set; } = string.Empty; // spam, inappropriate, harassment, misinformation, other

        [MaxLength(500)]
        public string? Details { get; set; }

        [MaxLength(20)]
        public string Status { get; set; } = "pending"; // pending, reviewed, dismissed, action_taken

        public Guid? ReviewedById { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public string? ReviewNotes { get; set; }

        // Navigation property
        [ForeignKey("PostId")]
        public virtual SchoolConnectPost? Post { get; set; }
    }

    /// <summary>
    /// Represents a share of a School Connect post
    /// </summary>
    public class SchoolConnectPostShare : BaseEntity
    {
        [Required]
        public Guid PostId { get; set; }

        [Required]
        public Guid SharedById { get; set; }

        [MaxLength(100)]
        public string? SharedByName { get; set; }

        [MaxLength(20)]
        public string ShareType { get; set; } = "internal"; // internal, external

        // Navigation property
        [ForeignKey("PostId")]
        public virtual SchoolConnectPost? Post { get; set; }
    }
}
