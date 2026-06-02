using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    /// <summary>
    /// A single discipline incident or commendation record for a student.
    /// Covers negative incidents (misconduct, suspension, etc.) and positive
    /// recognitions. All records are school-scoped and soft-deleteable.
    /// </summary>
    public class DisciplineRecord : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [ForeignKey(nameof(SchoolId))]
        public School? School { get; set; }

        [Required]
        public Guid StudentId { get; set; }

        [ForeignKey(nameof(StudentId))]
        public Student? Student { get; set; }

        /// <summary>Date the incident/commendation occurred.</summary>
        [Required]
        public DateTime IncidentDate { get; set; }

        /// <summary>
        /// Category of record.
        /// Values: warning | suspension | misconduct | detention | bullying |
        ///         physical_altercation | property_damage | academic_dishonesty |
        ///         absenteeism | disruption | behaviour_concern | positive_recognition | other
        /// </summary>
        [Required]
        [MaxLength(60)]
        public string IncidentType { get; set; } = "warning";

        /// <summary>Severity level. Values: low | medium | high | critical | commendation</summary>
        [Required]
        [MaxLength(20)]
        public string Severity { get; set; } = "low";

        /// <summary>Short title / subject line shown in list view.</summary>
        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        /// <summary>Full description of the incident.</summary>
        [MaxLength(2000)]
        public string? Description { get; set; }

        /// <summary>What action was taken (detention, parent meeting, counselling, etc.).</summary>
        [MaxLength(1000)]
        public string? ActionTaken { get; set; }

        /// <summary>
        /// Workflow status.
        /// Values: open | under_review | resolved | appealed | escalated | closed
        /// </summary>
        [Required]
        [MaxLength(30)]
        public string Status { get; set; } = "open";

        /// <summary>Staff member who reported the incident.</summary>
        public Guid? ReportedByStaffId { get; set; }

        [ForeignKey(nameof(ReportedByStaffId))]
        public Staff? ReportedByStaff { get; set; }

        /// <summary>Denormalized name for display without join.</summary>
        [MaxLength(150)]
        public string? ReportedByName { get; set; }

        /// <summary>Whether the parent/guardian was notified. Values: pending | notified | not_required</summary>
        [MaxLength(20)]
        public string? ParentNotificationStatus { get; set; }

        public DateTime? ParentNotifiedAt { get; set; }

        /// <summary>How many days suspension was issued (0 = N/A).</summary>
        public int SuspensionDays { get; set; } = 0;

        /// <summary>Additional internal notes.</summary>
        [MaxLength(1000)]
        public string? Notes { get; set; }

        /// <summary>Resolution notes once the incident is closed.</summary>
        [MaxLength(500)]
        public string? ResolutionNotes { get; set; }

        public DateTime? ResolvedAt { get; set; }
    }
}
