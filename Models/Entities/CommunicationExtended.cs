using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    // ========== MESSAGE TEMPLATE ==========
    public class MessageTemplate : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(50)]
        public string Type { get; set; } = string.Empty; // email, sms, push_notification, whatsapp
        
        [Required]
        [MaxLength(100)]
        public string Category { get; set; } = string.Empty; // Fee Reminder, Attendance Alert, Exam Notice, etc.
        
        [MaxLength(500)]
        public string? Subject { get; set; }
        
        [Required]
        public string Content { get; set; } = string.Empty;
        
        [MaxLength(2000)]
        public string? Variables { get; set; } // JSON array of available variables
        
        public bool IsActive { get; set; } = true;
        
        [MaxLength(500)]
        public string? Description { get; set; }
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
    }

    // ========== ANNOUNCEMENT ATTACHMENT ==========
    public class AnnouncementAttachment : BaseEntity
    {
        [Required]
        public Guid AnnouncementId { get; set; }
        
        [Required]
        [MaxLength(500)]
        public string FileName { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(1000)]
        public string FileUrl { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(100)]
        public string FileType { get; set; } = string.Empty; // pdf, doc, image, etc.
        
        public long FileSize { get; set; }
        
        [MaxLength(500)]
        public string? Description { get; set; }
        
        [ForeignKey("AnnouncementId")]
        public virtual Announcement? Announcement { get; set; }
    }

    // ========== ANNOUNCEMENT READ RECEIPT ==========
    public class AnnouncementReadReceipt : BaseEntity
    {
        [Required]
        public Guid AnnouncementId { get; set; }
        
        [Required]
        public Guid UserId { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string UserType { get; set; } = string.Empty; // Student, Staff, Parent
        
        public DateTime ReadAt { get; set; }
        
        public bool Acknowledged { get; set; } = false;
        
        public DateTime? AcknowledgedAt { get; set; }
        
        [MaxLength(1000)]
        public string? Feedback { get; set; }
        
        [ForeignKey("AnnouncementId")]
        public virtual Announcement? Announcement { get; set; }
    }
}
