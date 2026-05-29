using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    public class Message : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [ForeignKey(nameof(SchoolId))]
        public School? School { get; set; }

        public Guid? ConversationId { get; set; }

        [ForeignKey(nameof(ConversationId))]
        public Conversation? Conversation { get; set; }

        [Required]
        public Guid SenderId { get; set; }

        [Required]
        [MaxLength(50)]
        public string SenderType { get; set; } = string.Empty; // Student, Staff, Parent

        [Required]
        public Guid ReceiverId { get; set; }

        [Required]
        [MaxLength(50)]
        public string ReceiverType { get; set; } = string.Empty; // Student, Staff, Parent

        [MaxLength(200)]
        public string? Subject { get; set; }

        [Required]
        public string Content { get; set; } = string.Empty;

        [MaxLength(50)]
        public string MessageType { get; set; } = "Text"; // Text, File, Image, Audio, Video

        [MaxLength(500)]
        public string? AttachmentUrl { get; set; }

        public bool IsRead { get; set; } = false;

        public DateTime? ReadAt { get; set; }

        public bool IsStarred { get; set; } = false;

        public bool IsArchived { get; set; } = false;

        public Guid? ParentMessageId { get; set; } // For replies
    }

    public class Conversation : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [ForeignKey(nameof(SchoolId))]
        public School? School { get; set; }

        [Required]
        public Guid Participant1Id { get; set; }

        [Required]
        [MaxLength(50)]
        public string Participant1Type { get; set; } = string.Empty; // Student, Staff, Parent

        [Required]
        public Guid Participant2Id { get; set; }

        [Required]
        [MaxLength(50)]
        public string Participant2Type { get; set; } = string.Empty; // Student, Staff, Parent

        [MaxLength(200)]
        public string? Subject { get; set; }

        public DateTime LastMessageAt { get; set; }

        public bool IsActive { get; set; } = true;

        // Navigation property
        public ICollection<Message> Messages { get; set; } = new List<Message>();
    }

    public class Notification : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [ForeignKey(nameof(SchoolId))]
        public School? School { get; set; }

        [Required]
        public Guid RecipientId { get; set; }

        [Required]
        [MaxLength(50)]
        public string RecipientType { get; set; } = string.Empty; // Student, Staff, Parent

        [Required]
        [MaxLength(50)]
        public string Type { get; set; } = string.Empty; // Fee, Attendance, Exam, Assignment, Announcement, Message, etc.

        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        public string Content { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? ActionUrl { get; set; }

        public Guid? ReferenceId { get; set; } // ID of related entity (Fee, Assignment, etc.)

        [MaxLength(50)]
        public string? ReferenceType { get; set; } // Fee, Assignment, Exam, etc.

        /// <summary>UserId of the person who sent this notification (null = system-generated).</summary>
        public Guid? SenderId { get; set; }

        /// <summary>Display name of the sender, denormalized for fast rendering.</summary>
        [MaxLength(150)]
        public string? SenderName { get; set; }

        public bool IsRead { get; set; } = false;

        public DateTime? ReadAt { get; set; }

        [MaxLength(50)]
        public string Priority { get; set; } = "Normal"; // Low, Normal, High, Urgent

        /// <summary>
        /// For parent notifications: the student this notification relates to.
        /// Allows filtering parent notifications by child when a parent has multiple children.
        /// </summary>
        public Guid? StudentId { get; set; }
    }
}
