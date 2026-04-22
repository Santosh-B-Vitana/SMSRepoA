using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SmsApi.Models.DTOs
{
    // ========== EXAM DTOs (Basic & Full) ==========
    
    /// <summary>
    /// Basic DTO for GET list endpoints - lightweight exam data
    /// </summary>
    /// <summary>
    /// Basic DTO for GET list endpoints - lightweight exam data only
    /// Used by: GET /api/examinations/exams (list view)
    /// </summary>
    public class ExamBasicDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Class { get; set; } = string.Empty;
        public Guid? ClassId { get; set; }
        public string? Section { get; set; }
        public Guid? SectionId { get; set; }
        public string Subject { get; set; } = string.Empty;
        public Guid? SubjectId { get; set; }
        public string? SubjectType { get; set; }
        public Guid? SubjectTypeId { get; set; }
        public string? ExamType { get; set; }
        public Guid? ExamTypeId { get; set; }
        public DateTime Date { get; set; }
        public decimal MaxMarks { get; set; }
        public decimal PassingMarks { get; set; }
        public string? AcademicYear { get; set; }
        public int Term { get; set; }
        public string Status { get; set; } = string.Empty;
        public Guid? BoardConfigurationId { get; set; }
        public string? BoardName { get; set; }
        public string? BoardCode { get; set; }
    }
    // Note: For full exam details with time, syllabus, etc., use ExamFullDto via GET /api/examinations/exams/{id}

    /// <summary>
    /// Full DTO for GET by ID endpoints - complete exam details
    /// </summary>
    public class ExamFullDto
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string ExamType { get; set; } = string.Empty;
        public Guid? ExamTypeId { get; set; }
        public string Class { get; set; } = string.Empty;
        public Guid? ClassId { get; set; }
        public string Section { get; set; } = string.Empty;
        public Guid? SectionId { get; set; }
        public string Subject { get; set; } = string.Empty;
        public Guid? SubjectId { get; set; }
        public string? SubjectType { get; set; }
        public Guid? SubjectTypeId { get; set; }
        public DateTime Date { get; set; }
        public string StartTime { get; set; } = string.Empty;
        public string EndTime { get; set; } = string.Empty;
        public int Duration { get; set; }
        public decimal MaxMarks { get; set; }
        public decimal PassingMarks { get; set; }
        public string? Room { get; set; }
        public Guid? InvigilatorId { get; set; }
        public string? InvigilatorName { get; set; }
        public List<string> SyllabusTopics { get; set; } = new();
        public string? Instructions { get; set; }
        public string Status { get; set; } = string.Empty;
        public string AcademicYear { get; set; } = string.Empty;
        public int Term { get; set; }
        public int TotalStudents { get; set; }
        public int ResultsEntered { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public Guid? BoardConfigurationId { get; set; }
        public string? BoardName { get; set; }
        public string? BoardCode { get; set; }
        public string? GradingSystem { get; set; }
    }

    // ========== RESULT DTOs (Basic & Full) ==========
    
    /// <summary>
    /// Basic DTO for GET list endpoints - lightweight result data only
    /// Used by: GET /api/examinations/results (list view)
    /// </summary>
    public class ResultBasicDto
    {
        public Guid Id { get; set; }
        public Guid StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string Class { get; set; } = string.Empty;
        public string Subject { get; set; } = string.Empty;
        public Guid? SubjectId { get; set; }
        public decimal MarksObtained { get; set; }
        public decimal MaxMarks { get; set; }
        public string Grade { get; set; } = string.Empty;
        public bool IsAbsent { get; set; }
        public bool IsPass { get; set; }
        public decimal Percentage { get; set; }
    }
    // Note: For full result details including percentage, rank, etc., use ResultFullDto via GET /api/examinations/results/{id}

    /// <summary>
    /// Full DTO for GET by ID endpoints - complete result details
    /// </summary>
    public class ResultFullDto
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid ExamId { get; set; }
        public string ExamName { get; set; } = string.Empty;
        public Guid StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string Class { get; set; } = string.Empty;
        public string Section { get; set; } = string.Empty;
        public string Subject { get; set; } = string.Empty;
        public Guid? SubjectId { get; set; }
        public decimal MarksObtained { get; set; }
        public decimal? TheoryMarks { get; set; }
        public decimal? PracticalMarks { get; set; }
        public decimal? InternalMarks { get; set; }
        public decimal MaxMarks { get; set; }
        public decimal Percentage { get; set; }
        public string Grade { get; set; } = string.Empty;
        public decimal GradePoint { get; set; }
        public int? Rank { get; set; }
        public string? Remarks { get; set; }
        public bool IsAbsent { get; set; }
        public bool IsPass { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    // ========== GRADE CONFIG DTO ==========
    
    public class GradeConfigDto
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string GradeName { get; set; } = string.Empty;
        public decimal MinPercentage { get; set; }
        public decimal MaxPercentage { get; set; }
        public decimal GradePoint { get; set; }
        public string? Description { get; set; }
        public bool IsPassingGrade { get; set; }
    }

    // ========== REPORT CARD DTO ==========
    
    public class ReportCardDto
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string Class { get; set; } = string.Empty;
        public string Section { get; set; } = string.Empty;
        public string? RollNumber { get; set; }
        public string AcademicYear { get; set; } = string.Empty;
        public string ExamType { get; set; } = string.Empty;
        public List<SubjectResultDto> Subjects { get; set; } = new();
        public decimal TotalMarks { get; set; }
        public decimal MaxTotalMarks { get; set; }
        public decimal Percentage { get; set; }
        public string Grade { get; set; } = string.Empty;
        public int? Rank { get; set; }
        public decimal? AttendancePercentage { get; set; }
        public string? TeacherRemarks { get; set; }
        public string? PrincipalRemarks { get; set; }
        public DateTime GeneratedAt { get; set; }
    }

    public class SubjectResultDto
    {
        public string Subject { get; set; } = string.Empty;
        public decimal? TheoryMarks { get; set; }
        public decimal? PracticalMarks { get; set; }
        public decimal TotalMarks { get; set; }
        public decimal MaxMarks { get; set; }
        public string Grade { get; set; } = string.Empty;
        public decimal GradePoint { get; set; }
    }

    // ========== CREATE/UPDATE DTOs ==========
    
    public class CreateExamDto
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        // ── Structured FK references (preferred) ─────────────────────────────
        public Guid? ExamTypeId { get; set; }
        public Guid? ClassId { get; set; }
        public Guid? SectionId { get; set; }
        public Guid? SubjectId { get; set; }
        public Guid? SubjectTypeId { get; set; }
        public Guid? InvigilatorId { get; set; }
        public Guid? BoardConfigurationId { get; set; }

        // ── Legacy string fields (used when FK IDs not provided) ─────────────
        [MaxLength(30)]
        public string? ExamType { get; set; }

        [MaxLength(20)]
        public string? Class { get; set; }
        
        [MaxLength(20)]
        public string? Section { get; set; }
        
        [MaxLength(100)]
        public string? Subject { get; set; }

        // ── Academic context ──────────────────────────────────────────────────
        [Required]
        [MaxLength(20)]
        public string AcademicYear { get; set; } = string.Empty;

        /// <summary>0 = full year | 1 = Term 1 | 2 = Term 2</summary>
        public int Term { get; set; } = 0;

        // ── Scheduling ────────────────────────────────────────────────────────
        [Required]
        public DateTime Date { get; set; }

        [MaxLength(10)]
        public string? StartTime { get; set; }

        [MaxLength(10)]
        public string? EndTime { get; set; }
        
        [Range(1, 600)]
        public int? Duration { get; set; }
        
        // ── Marks ─────────────────────────────────────────────────────────────
        [Required]
        [Range(1, 1000)]
        public decimal MaxMarks { get; set; }
        
        [Required]
        [Range(0, 1000)]
        public decimal PassingMarks { get; set; }
        
        [MaxLength(100)]
        public string? Room { get; set; }

        public List<string>? SyllabusTopics { get; set; }
        public string? Instructions { get; set; }
    }

    public class UpdateExamDto
    {
        [MaxLength(200)]
        public string? Name { get; set; }
        
        [MaxLength(30)]
        public string? ExamType { get; set; }
        
        public DateTime? Date { get; set; }
        
        [MaxLength(10)]
        public string? StartTime { get; set; }
        
        [MaxLength(10)]
        public string? EndTime { get; set; }
        
        [Range(1, 600)]
        public int? Duration { get; set; }
        
        [Range(1, 1000)]
        public decimal? MaxMarks { get; set; }
        
        [Range(0, 1000)]
        public decimal? PassingMarks { get; set; }
        
        [MaxLength(50)]
        public string? Room { get; set; }
        
        public Guid? InvigilatorId { get; set; }
        
        public List<string>? SyllabusTopics { get; set; }
        
        public string? Instructions { get; set; }
        
        [MaxLength(20)]
        public string? Status { get; set; } // scheduled, ongoing, completed, cancelled, postponed
    }

    public class CreateResultDto
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public Guid ExamId { get; set; }
        
        [Required]
        public Guid StudentId { get; set; }

        /// <summary>FK to Subject entity — preferred over string Subject field.</summary>
        public Guid? SubjectId { get; set; }
        
        public decimal? MarksObtained { get; set; }
        public decimal? TheoryMarks { get; set; }
        public decimal? PracticalMarks { get; set; }
        public decimal? InternalMarks { get; set; }
        public string? Remarks { get; set; }
        public bool IsAbsent { get; set; }
    }

    public class UpdateResultDto
    {
        public decimal? MarksObtained { get; set; }
        
        public decimal? TheoryMarks { get; set; }
        
        public decimal? PracticalMarks { get; set; }
        
        public decimal? InternalMarks { get; set; }
        
        public string? Remarks { get; set; }
        
        public bool? IsAbsent { get; set; }
    }

    public class BulkResultDto
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public Guid ExamId { get; set; }
        
        [Required]
        public List<StudentResultDto> Results { get; set; } = new();
    }

    public class StudentResultDto
    {
        [Required]
        public Guid StudentId { get; set; }
        
        public decimal? MarksObtained { get; set; }
        
        public decimal? TheoryMarks { get; set; }
        
        public decimal? PracticalMarks { get; set; }
        
        public decimal? InternalMarks { get; set; }
        
        public bool IsAbsent { get; set; }
        
        public string? Remarks { get; set; }
    }

    public class CreateGradeConfigDto
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        [MaxLength(10)]
        public string GradeName { get; set; } = string.Empty;
        
        [Required]
        [Range(0, 100)]
        public decimal MinPercentage { get; set; }
        
        [Required]
        [Range(0, 100)]
        public decimal MaxPercentage { get; set; }
        
        [Required]
        [Range(0, 10)]
        public decimal GradePoint { get; set; }
        
        [MaxLength(200)]
        public string? Description { get; set; }
        
        public bool IsPassingGrade { get; set; }
    }

    public class GenerateReportCardDto
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public Guid StudentId { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string AcademicYear { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(30)]
        public string ExamType { get; set; } = string.Empty;
        
        public string? TeacherRemarks { get; set; }
        
        public string? PrincipalRemarks { get; set; }
    }

    // ========== LIST RESPONSES ==========
    
    public class ExamListResponse
    {
        public List<ExamBasicDto> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    public class ResultListResponse
    {
        public List<ResultBasicDto> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    public class GradeConfigListResponse
    {
        public List<GradeConfigDto> Items { get; set; } = new();
        public int TotalCount { get; set; }
    }

    // ========== STATS DTOs ==========
    
    public class ExamStatsDto
    {
        public int TotalExams { get; set; }
        public int ScheduledExams { get; set; }
        public int CompletedExams { get; set; }
        public int OngoingExams { get; set; }
        public int TotalResults { get; set; }
        public decimal AverageMarks { get; set; }
        public decimal PassPercentage { get; set; }
        public List<TopPerformerDto> TopPerformers { get; set; } = new();
    }

    public class TopPerformerDto
    {
        public Guid StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string Class { get; set; } = string.Empty;
        public decimal Percentage { get; set; }
        public int Rank { get; set; }
    }

}
