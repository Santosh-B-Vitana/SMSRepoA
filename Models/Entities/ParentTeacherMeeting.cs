using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    /// <summary>
    /// Represents a scheduled Parent-Teacher Meeting session for a school.
    /// </summary>
    public class PtmSession : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required, MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [MaxLength(1000)]
        public string? Description { get; set; }

        [Required]
        public DateTime SessionDate { get; set; }

        [Required]
        public TimeSpan StartTime { get; set; }

        [Required]
        public TimeSpan EndTime { get; set; }

        /// <summary>Duration of each slot in minutes (e.g. 10 or 15).</summary>
        public int SlotDurationMinutes { get; set; } = 10;

        [MaxLength(20)]
        public string Status { get; set; } = "scheduled"; // scheduled, ongoing, completed, cancelled

        [MaxLength(500)]
        public string? Location { get; set; }

        /// <summary>Targeted class IDs (JSON array). Null = all classes.</summary>
        [MaxLength(2000)]
        public string? TargetClassIds { get; set; }

        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }

        public virtual ICollection<PtmSlot> Slots { get; set; } = new List<PtmSlot>();
    }

    /// <summary>
    /// A time slot within a PTM session for a specific teacher.
    /// </summary>
    public class PtmSlot : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        public Guid SessionId { get; set; }

        [Required]
        public Guid TeacherId { get; set; }

        [Required]
        public DateTime SlotDateTime { get; set; }

        public Guid? BookedByParentId { get; set; }

        public Guid? StudentId { get; set; }

        [MaxLength(20)]
        public string Status { get; set; } = "available"; // available, booked, completed, cancelled

        [MaxLength(1000)]
        public string? Notes { get; set; }

        [MaxLength(1000)]
        public string? TeacherRemarks { get; set; }

        [ForeignKey("SessionId")]
        public virtual PtmSession? Session { get; set; }

        [ForeignKey("TeacherId")]
        public virtual Staff? Teacher { get; set; }

        [ForeignKey("StudentId")]
        public virtual Student? Student { get; set; }

        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
    }
}
