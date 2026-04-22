using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    public class Timetable : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        public Guid ClassId { get; set; }

        public Guid? SectionId { get; set; }

        [Required]
        [MaxLength(20)]
        public string AcademicYear { get; set; } = string.Empty;

        [MaxLength(20)]
        public string Status { get; set; } = "active";

        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }

        [ForeignKey("ClassId")]
        public virtual Class? Class { get; set; }

        [ForeignKey("SectionId")]
        public virtual Section? Section { get; set; }
    }

    public class TimetablePeriod : BaseEntity
    {
        [Required]
        public Guid TimetableId { get; set; }

        [Required]
        [MaxLength(20)]
        public string DayOfWeek { get; set; } = string.Empty;

        [Required]
        public int PeriodNumber { get; set; }

        [Required]
        public TimeSpan StartTime { get; set; }

        [Required]
        public TimeSpan EndTime { get; set; }

        public Guid? SubjectId { get; set; }

        public Guid? TeacherId { get; set; }

        [MaxLength(50)]
        public string? PeriodType { get; set; }

        [MaxLength(200)]
        public string? Room { get; set; }

        public string? Notes { get; set; }

        [ForeignKey("TimetableId")]
        public virtual Timetable? Timetable { get; set; }

        [ForeignKey("SubjectId")]
        public virtual Subject? Subject { get; set; }

        [ForeignKey("TeacherId")]
        public virtual Staff? Teacher { get; set; }
    }
}
