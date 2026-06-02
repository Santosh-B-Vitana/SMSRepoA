using System;
using System.ComponentModel.DataAnnotations;

namespace SmsApi.Models.DTOs
{
    // ─── Teacher scheduling-conflict info returned in 409 responses ────────────
    public class TeacherConflictInfo
    {
        public Guid ConflictingPeriodId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public string? SectionName { get; set; }
        public string? SubjectName { get; set; }
        public string DayOfWeek { get; set; } = string.Empty;
        public string StartTime { get; set; } = string.Empty;
        public string EndTime { get; set; } = string.Empty;
    }

    public class TeacherConflictException : InvalidOperationException
    {
        public TeacherConflictInfo ConflictInfo { get; }
        public TeacherConflictException(TeacherConflictInfo info)
            : base("Teacher has a scheduling conflict at this time")
        {
            ConflictInfo = info;
        }
    }

    // Timetable Basic DTO - Lightweight version for list views
    public class TimetableBasicDto
    {
        public Guid Id { get; set; }
        public Guid ClassId { get; set; }
        public Guid? SectionId { get; set; }
        public string AcademicYear { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
    }

    // Timetable Period Basic DTO - Lightweight version for list views
    public class TimetablePeriodBasicDto
    {
        public Guid Id { get; set; }
        public Guid TimetableId { get; set; }
        public string DayOfWeek { get; set; } = string.Empty;
        public int PeriodNumber { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public string? PeriodType { get; set; }
    }

    // Timetable DTOs
    public class CreateTimetableRequest
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
    }

    public class TimetableResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid ClassId { get; set; }
        public string? ClassName { get; set; }
        public Guid? SectionId { get; set; }
        public string? SectionName { get; set; }
        public string AcademicYear { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    // Timetable Period DTOs
    public class CreateTimetablePeriodRequest
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

        /// <summary>Admin-only: skip teacher scheduling-conflict check and override anyway.</summary>
        public bool ForceOverride { get; set; } = false;
    }

    public class UpdateTimetablePeriodRequest
    {
        public TimeSpan? StartTime { get; set; }

        public TimeSpan? EndTime { get; set; }

        public Guid? SubjectId { get; set; }

        public Guid? TeacherId { get; set; }

        [MaxLength(50)]
        public string? PeriodType { get; set; }

        [MaxLength(200)]
        public string? Room { get; set; }

        public string? Notes { get; set; }

        /// <summary>Admin-only: skip teacher scheduling-conflict check and override anyway.</summary>
        public bool ForceOverride { get; set; } = false;
    }

    public class TimetablePeriodResponse
    {
        public Guid Id { get; set; }
        public Guid TimetableId { get; set; }
        public string DayOfWeek { get; set; } = string.Empty;
        public int PeriodNumber { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public Guid? SubjectId { get; set; }
        public string? SubjectName { get; set; }
        public string? SubjectCode { get; set; }
        public Guid? TeacherId { get; set; }
        public string? TeacherName { get; set; }
        public string? PeriodType { get; set; }
        public string? Room { get; set; }
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class TeacherScheduleResponse
    {
        public Guid TeacherId { get; set; }
        public string TeacherName { get; set; } = string.Empty;
        public List<TeacherPeriodEntry> Schedule { get; set; } = new();
        public int TotalPeriods { get; set; }
    }

    public class TeacherPeriodEntry
    {
        public Guid PeriodId { get; set; }
        public string DayOfWeek { get; set; } = string.Empty;
        public int PeriodNumber { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public Guid? SubjectId { get; set; }
        public string? SubjectName { get; set; }
        public Guid TimetableId { get; set; }
        public Guid ClassId { get; set; }
        public string? ClassName { get; set; }
        public Guid? SectionId { get; set; }
        public string? SectionName { get; set; }
        public string? PeriodType { get; set; }
        public string? Room { get; set; }
    }

    public class TimetablePeriodListResponse
    {
        public List<TimetablePeriodResponse> Periods { get; set; } = new();
        public int Total { get; set; }
    }

    public class TimetableListResponse
    {
        public List<TimetableResponse> Timetables { get; set; } = new();
        public int Total { get; set; }
    }

    public class TimetableDetailResponse
    {
        public TimetableResponse Timetable { get; set; } = new();
        public List<TimetablePeriodResponse> Periods { get; set; } = new();
    }

    // Timetable Filters DTO
    public class TimetableFiltersDto
    {
        public Guid? ClassId { get; set; }
        public Guid? SectionId { get; set; }
        public string? Day { get; set; }
        public string? SearchQuery { get; set; }
        public string? AcademicYear { get; set; }
    }
}
