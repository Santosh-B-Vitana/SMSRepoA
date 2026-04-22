using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    /// <summary>
    /// CRITICAL ENTITY: Tracks student promotion history for audit trail and data integrity
    /// Ensures traceability of all class changes and promotions
    /// </summary>
    [Table("PromotionHistory")]
    public class PromotionHistory
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        [ForeignKey(nameof(Student))]
        public Guid StudentId { get; set; }
        public virtual Student Student { get; set; }

        [Required]
        [ForeignKey(nameof(School))]
        public Guid SchoolId { get; set; }
        public virtual School School { get; set; }

        // Previous Class/Section Before Promotion
        [Required]
        [MaxLength(20)]
        public string PreviousClass { get; set; }

        [MaxLength(10)]
        public string PreviousSection { get; set; }

        // New Class/Section After Promotion
        [Required]
        [MaxLength(20)]
        public string NewClass { get; set; }

        [MaxLength(10)]
        public string NewSection { get; set; }

        // Academic Year Context
        [MaxLength(50)]
        public string AcademicYear { get; set; }

        // Promotion Details
        [Required]
        public DateTime PromotionDate { get; set; }

        [Required]
        [MaxLength(20)]
        public string PromotionStatus { get; set; } // "completed", "cancelled", "pending_approval"

        // Audit Trail
        [MaxLength(500)]
        public string Remarks { get; set; }

        [MaxLength(50)]
        public string PromotionReason { get; set; } // "regular_promotion", "compartment_cleared", "retention_ended", "manual_override"

        // Approval Workflow (if applicable)
        public Guid? ApprovedBy { get; set; } // User ID of approver
        public DateTime? ApprovalDate { get; set; }

        [MaxLength(200)]
        public string ApprovalRemarks { get; set; }

        // Timestamps
        [Required]
        public DateTime CreatedAt { get; set; }

        public DateTime UpdatedAt { get; set; }

        // Metadata
        [MaxLength(500)]
        public string MetaData { get; set; } // JSON field for additional info
    }
}
