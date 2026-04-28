using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    /// <summary>
    /// Immutable audit trail for every financial mutation.
    /// A Chartered Accountant can trace any change back to who/when/why.
    /// Insert-only — rows must never be updated or deleted.
    /// </summary>
    public class FeeAuditLog
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid SchoolId { get; set; }

        /// <summary>
        /// The domain entity type that was changed.
        /// Values: FeeRecord, PaymentTransaction, FeeConcession, FeeStructure, LateFeeConfig, Refund
        /// </summary>
        [Required]
        [MaxLength(50)]
        public string EntityType { get; set; } = string.Empty;

        /// <summary>PK of the entity that was changed.</summary>
        [Required]
        public Guid EntityId { get; set; }

        /// <summary>
        /// Verb describing the mutation.
        /// Values: Created, Updated, Deleted, PaymentReceived, PaymentReversed,
        ///         ConcessionApplied, ConcessionRevoked, ConcessionApproved, ConcessionRejected,
        ///         LateFeeApplied, LateFeeWaived, RefundInitiated, RefundCompleted,
        ///         DiscountApplied, ManualAdjustment, StatusChanged, WaiverGranted
        /// </summary>
        [Required]
        [MaxLength(50)]
        public string Action { get; set; } = string.Empty;

        /// <summary>Optional FK to the related FeeRecord (for quick joins).</summary>
        public Guid? FeeRecordId { get; set; }

        /// <summary>Optional FK to the PaymentTransaction (for payment audits).</summary>
        public Guid? PaymentTransactionId { get; set; }

        /// <summary>Optional FK to the student the action relates to.</summary>
        public Guid? StudentId { get; set; }

        /// <summary>JSON snapshot of the entity BEFORE the change. Null for creates.</summary>
        /// Column type is configured provider-aware in AppDbContext:
        ///   PostgreSQL → jsonb (indexed, binary JSON)
        ///   SQL Server → nvarchar(max)
        public string? OldValues { get; set; }

        /// <summary>JSON snapshot of the entity AFTER the change. Null for deletes.</summary>
        public string? NewValues { get; set; }

        /// <summary>Monetary amount involved (payment amount, discount amount, etc.).</summary>
        [Column(TypeName = "decimal(12,2)")]
        public decimal? Amount { get; set; }

        /// <summary>User ID who performed the action. Null = system-triggered (e.g. auto late-fee).</summary>
        public Guid? PerformedByUserId { get; set; }

        /// <summary>Display name of the user (denormalized for fast reads).</summary>
        [MaxLength(200)]
        public string? PerformedByName { get; set; }

        /// <summary>Client IP address for security audit.</summary>
        [MaxLength(45)]
        public string? IpAddress { get; set; }

        /// <summary>Free-text reason / remarks (e.g. "Principal approved ₹5000 waiver").</summary>
        [MaxLength(500)]
        public string? Remarks { get; set; }

        /// <summary>UTC timestamp — set once, never modified.</summary>
        [Required]
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
    }
}
