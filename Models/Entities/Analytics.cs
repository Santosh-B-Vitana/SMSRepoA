using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    public class DashboardWidget : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [ForeignKey(nameof(SchoolId))]
        public School? School { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string WidgetType { get; set; } = string.Empty; // Counter, Chart, Table, Progress, Calendar, List

        [Required]
        [MaxLength(50)]
        public string DataSource { get; set; } = string.Empty; // Students, Staff, Fees, Attendance, Exams, etc.

        [MaxLength(500)]
        public string? Description { get; set; }

        public string? Configuration { get; set; } // JSON configuration for widget

        [MaxLength(50)]
        public string? ChartType { get; set; } // Line, Bar, Pie, Donut, Area, etc.

        public int DisplayOrder { get; set; } = 0;

        [MaxLength(20)]
        public string Size { get; set; } = "Medium"; // Small, Medium, Large, Full

        [MaxLength(50)]
        public string RefreshInterval { get; set; } = "Manual"; // Manual, 1min, 5min, 15min, 30min, 1hour

        [MaxLength(50)]
        public string Visibility { get; set; } = "All"; // All, Admin, Teacher, Parent, Student

        public bool IsActive { get; set; } = true;
    }

    public class Analytics : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [ForeignKey(nameof(SchoolId))]
        public School? School { get; set; }

        [Required]
        [MaxLength(50)]
        public string MetricType { get; set; } = string.Empty; // Enrollment, Attendance, Revenue, Performance, etc.

        [Required]
        [MaxLength(100)]
        public string MetricName { get; set; } = string.Empty;

        [Required]
        public decimal Value { get; set; }

        [MaxLength(20)]
        public string? Unit { get; set; } // Count, Percentage, Currency, etc.

        [Required]
        [MaxLength(50)]
        public string Period { get; set; } = string.Empty; // Daily, Weekly, Monthly, Quarterly, Yearly

        [Required]
        public DateTime PeriodStart { get; set; }

        [Required]
        public DateTime PeriodEnd { get; set; }

        public Guid? ClassId { get; set; }

        [ForeignKey(nameof(ClassId))]
        public Class? Class { get; set; }

        public Guid? SectionId { get; set; }

        [ForeignKey(nameof(SectionId))]
        public Section? Section { get; set; }

        public string? Metadata { get; set; } // JSON additional data
    }
}
