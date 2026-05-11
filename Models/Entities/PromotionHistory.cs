using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    /// <summary>
    /// Audit trail for every student promotion or class transfer.
    /// <para>
    /// This entity records WHAT happened and WHEN — it is not the primary source of truth for
    /// "which class is a student in right now". That role belongs to <see cref="StudentEnrollment"/>.
    /// </para>
    /// <para>
    /// FK columns (PreviousClassId, NewClassId, etc.) are added alongside the original string
    /// fields for backward compatibility. Legacy rows keep the strings; new promotions populate
    /// both. Queries should prefer the FK columns when available.
    /// </para>
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

        // ── Previous class/section (string — kept for legacy rows) ────────────
        [Required]
        [MaxLength(20)]
        public string PreviousClass { get; set; }

        [MaxLength(10)]
        public string PreviousSection { get; set; }

        // ── New class/section (string — kept for legacy rows) ─────────────────
        [Required]
        [MaxLength(20)]
        public string NewClass { get; set; }

        [MaxLength(10)]
        public string NewSection { get; set; }

        // ── Structured FK references (populated on all new promotions) ─────────

        /// <summary>FK to Class entity for the source class. Null on legacy rows.</summary>
        public Guid? PreviousClassId { get; set; }

        /// <summary>FK to Section entity for the source section. Null on legacy rows.</summary>
        public Guid? PreviousSectionId { get; set; }

        /// <summary>FK to Class entity for the target class. Null on legacy rows.</summary>
        public Guid? NewClassId { get; set; }

        /// <summary>FK to Section entity for the target section. Null on legacy rows.</summary>
        public Guid? NewSectionId { get; set; }

        /// <summary>
        /// FK to AcademicYear entity — replaces the legacy string AcademicYear field.
        /// Null on legacy rows.
        /// </summary>
        public Guid? AcademicYearId { get; set; }

        /// <summary>
        /// FK to the StudentEnrollment row that was created/updated by this promotion.
        /// Allows tracing "what enrollment did this promotion produce?".
        /// </summary>
        public Guid? ResultingEnrollmentId { get; set; }

        // ── Legacy string fields (kept for backward compat) ───────────────────
        [MaxLength(50)]
        public string AcademicYear { get; set; }

        // ── Promotion details ─────────────────────────────────────────────────
        [Required]
        public DateTime PromotionDate { get; set; }

        [Required]
        [MaxLength(20)]
        public string PromotionStatus { get; set; } // "completed", "cancelled", "pending_approval"

        [MaxLength(500)]
        public string Remarks { get; set; }

        [MaxLength(50)]
        public string PromotionReason { get; set; } // "regular_promotion", "compartment_cleared", "retention_ended", "manual_override"

        public Guid? ApprovedBy { get; set; }
        public DateTime? ApprovalDate { get; set; }

        [MaxLength(200)]
        public string ApprovalRemarks { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; }

        public DateTime UpdatedAt { get; set; }

        [MaxLength(500)]
        public string MetaData { get; set; }

        // ── Navigation properties ─────────────────────────────────────────────
        [ForeignKey("PreviousClassId")]
        public virtual Class? PreviousClassRef { get; set; }

        [ForeignKey("PreviousSectionId")]
        public virtual Section? PreviousSectionRef { get; set; }

        [ForeignKey("NewClassId")]
        public virtual Class? NewClassRef { get; set; }

        [ForeignKey("NewSectionId")]
        public virtual Section? NewSectionRef { get; set; }

        [ForeignKey("AcademicYearId")]
        public virtual AcademicYear? AcademicYearRef { get; set; }

        [ForeignKey("ResultingEnrollmentId")]
        public virtual StudentEnrollment? ResultingEnrollment { get; set; }
    }
}
