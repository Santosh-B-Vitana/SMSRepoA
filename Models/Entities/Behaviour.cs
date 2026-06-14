using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    /// <summary>
    /// Logs a student behaviour / discipline event raised by a teacher or admin.
    /// </summary>
    public class BehaviourRecord : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        public Guid StudentId { get; set; }

        [Required]
        public Guid ReportedByStaffId { get; set; }

        /// <summary>
        /// Incident type: positive (merit) or negative (demerit/violation).
        /// </summary>
        [Required, MaxLength(20)]
        public string IncidentType { get; set; } = "negative"; // positive, negative

        /// <summary>
        /// Category: tardiness, bullying, excellence, participation, violence, etc.
        /// </summary>
        [Required, MaxLength(100)]
        public string Category { get; set; } = string.Empty;

        [Required]
        public DateTime IncidentDate { get; set; }

        [Required, MaxLength(2000)]
        public string Description { get; set; } = string.Empty;

        /// <summary>Action taken: warning, detention, suspension, commendation, etc.</summary>
        [MaxLength(200)]
        public string? ActionTaken { get; set; }

        /// <summary>Point value: positive for merit, negative for demerit.</summary>
        public int Points { get; set; } = 0;

        [MaxLength(20)]
        public string Status { get; set; } = "open"; // open, resolved, escalated

        /// <summary>Parent informed about this incident.</summary>
        public bool ParentNotified { get; set; } = false;

        [MaxLength(2000)]
        public string? Resolution { get; set; }

        public DateTime? ResolvedAt { get; set; }

        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }

        [ForeignKey("StudentId")]
        public virtual Student? Student { get; set; }

        [ForeignKey("ReportedByStaffId")]
        public virtual Staff? ReportedByStaff { get; set; }
    }
}
