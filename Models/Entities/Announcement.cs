using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    public class Announcement : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [ForeignKey(nameof(SchoolId))]
        public School? School { get; set; }

        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        public string Content { get; set; } = string.Empty;

        [Required]
        public Guid CreatedByStaffId { get; set; }

        [ForeignKey(nameof(CreatedByStaffId))]
        public Staff? CreatedByStaff { get; set; }

        [Required]
        [MaxLength(50)]
        public string Priority { get; set; } = "Normal"; // Low, Normal, High, Urgent

        [Required]
        [MaxLength(50)]
        public string TargetAudience { get; set; } = "All"; // All, Students, Staff, Parents, Class, Section

        public Guid? TargetClassId { get; set; }

        [ForeignKey(nameof(TargetClassId))]
        public Class? TargetClass { get; set; }

        public Guid? TargetSectionId { get; set; }

        [ForeignKey(nameof(TargetSectionId))]
        public Section? TargetSection { get; set; }

        public DateTime PublishedDate { get; set; }

        public DateTime? ExpiryDate { get; set; }

        public bool IsActive { get; set; } = true;

        public bool IsPinned { get; set; } = false;

        [MaxLength(500)]
        public string? AttachmentUrl { get; set; }

        // Navigation property
        public ICollection<AnnouncementRecipient> Recipients { get; set; } = new List<AnnouncementRecipient>();
    }

    public class AnnouncementRecipient : BaseEntity
    {
        [Required]
        public Guid AnnouncementId { get; set; }

        [ForeignKey(nameof(AnnouncementId))]
        public Announcement? Announcement { get; set; }

        [Required]
        [MaxLength(50)]
        public string RecipientType { get; set; } = string.Empty; // Student, Staff, Parent

        [Required]
        public Guid RecipientId { get; set; } // StudentId, StaffId, or ParentId

        public bool IsRead { get; set; } = false;

        public DateTime? ReadAt { get; set; }
    }
}
