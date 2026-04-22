using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    public class Report : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [ForeignKey(nameof(SchoolId))]
        public School? School { get; set; }

        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Description { get; set; }

        [Required]
        [MaxLength(50)]
        public string ReportType { get; set; } = string.Empty; // Attendance, Fee, Academic, Exam, Staff, Student, Transport, Library, etc.

        [Required]
        [MaxLength(50)]
        public string Category { get; set; } = string.Empty; // Daily, Weekly, Monthly, Quarterly, Annual, Custom

        [Required]
        public string Parameters { get; set; } = string.Empty; // JSON string of report parameters

        [MaxLength(50)]
        public string Format { get; set; } = "PDF"; // PDF, Excel, CSV, JSON

        [Required]
        public Guid GeneratedByStaffId { get; set; }

        [ForeignKey(nameof(GeneratedByStaffId))]
        public Staff? GeneratedByStaff { get; set; }

        public DateTime? StartDate { get; set; }

        public DateTime? EndDate { get; set; }

        public Guid? ClassId { get; set; }

        [ForeignKey(nameof(ClassId))]
        public Class? Class { get; set; }

        public Guid? SectionId { get; set; }

        [ForeignKey(nameof(SectionId))]
        public Section? Section { get; set; }

        [MaxLength(500)]
        public string? FileUrl { get; set; }

        [MaxLength(50)]
        public string Status { get; set; } = "Pending"; // Pending, Processing, Completed, Failed

        public string? ErrorMessage { get; set; }

        public int RecordCount { get; set; } = 0;

        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    }

    public class ReportTemplate : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [ForeignKey(nameof(SchoolId))]
        public School? School { get; set; }

        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Description { get; set; }

        [Required]
        [MaxLength(50)]
        public string ReportType { get; set; } = string.Empty;

        [Required]
        public string QueryTemplate { get; set; } = string.Empty; // SQL query template with placeholders

        public string? DefaultParameters { get; set; } // JSON string of default parameters

        [MaxLength(50)]
        public string Format { get; set; } = "PDF";

        public bool IsActive { get; set; } = true;

        public bool IsPublic { get; set; } = true; // If false, only creator can use it

        [Required]
        public Guid CreatedByStaffId { get; set; }

        [ForeignKey(nameof(CreatedByStaffId))]
        public Staff? CreatedByStaff { get; set; }
    }
}
