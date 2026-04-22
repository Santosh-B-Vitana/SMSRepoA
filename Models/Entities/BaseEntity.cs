using System;
using System.ComponentModel.DataAnnotations;

namespace SmsApi.Models.Entities
{
    /// <summary>
    /// Base entity class for all domain entities
    /// Provides common tracking properties: Id, timestamps, audit fields, soft delete
    /// </summary>
    public abstract class BaseEntity
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        
        /// <summary>
        /// Timestamp when entity was created (UTC)
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        /// <summary>
        /// Timestamp when entity was last updated (UTC)
        /// </summary>
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// User ID who created this entity
        /// Used for audit trail - can identify who enrolled student, hired staff, etc.
        /// </summary>
        public Guid? CreatedBy { get; set; }

        /// <summary>
        /// User ID who last updated this entity
        /// Used for audit trail - can identify who made changes
        /// </summary>
        public Guid? UpdatedBy { get; set; }

        /// <summary>
        /// Soft delete flag
        /// When true, entity is logically deleted but data preserved
        /// Prevents accidental data loss and enables recovery
        /// </summary>
        public bool IsDeleted { get; set; } = false;

        /// <summary>
        /// Timestamp when entity was soft deleted (UTC)
        /// Only set when IsDeleted = true
        /// </summary>
        public DateTime? DeletedAt { get; set; }

        /// <summary>
        /// Concurrency token for optimistic locking
        /// Prevents lost updates when multiple users modify same record
        /// SQL Server updates this automatically
        /// </summary>
        [Timestamp]
        public byte[]? RowVersion { get; set; }
    }
}
