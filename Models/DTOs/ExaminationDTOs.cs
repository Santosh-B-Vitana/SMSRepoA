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

    // ========== EXAM SETUP DTOs ==========

    /// <summary>List-view DTO for ExamSetup.</summary>
    public class ExamSetupBasicDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string ExamType { get; set; } = string.Empty;
        public bool IsCustomType { get; set; }
        public string? CustomTypeName { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public Guid ClassId { get; set; }
        public string? SectionName { get; set; }
        public Guid? SectionId { get; set; }
        public string? BoardName { get; set; }
        public Guid? BoardConfigurationId { get; set; }
        public string AcademicYear { get; set; } = string.Empty;
        public int Term { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string Status { get; set; } = string.Empty;
        public int SubjectCount { get; set; }
        public int MarksEnteredCount { get; set; }
        public DateTime CreatedAt { get; set; }

        /// <summary>
        /// True when the requesting staff member is the class teacher for this exam's class.
        /// Only set when returned via the staff-scoped endpoint (GetExamSetupsForStaffAsync).
        /// </summary>
        public bool IsClassTeacherForThisClass { get; set; }

        /// <summary>
        /// The subject IDs within this exam that are explicitly assigned to the requesting staff.
        /// Empty when <see cref="IsClassTeacherForThisClass"/> is true (they can access all subjects).
        /// Only set when returned via the staff-scoped endpoint (GetExamSetupsForStaffAsync).
        /// </summary>
        public List<Guid> MyAssignedSubjectIds { get; set; } = new();
    }

    /// <summary>Detail DTO for ExamSetup with subjects list.</summary>
    public class ExamSetupDetailDto : ExamSetupBasicDto
    {
        public List<ExamSetupSubjectDto> Subjects { get; set; } = new();
        public DateTime? PublishedAt { get; set; }

        // ── Board grading context ─────────────────────────────────────────
        /// <summary>Board code (e.g. "CBSE", "IB", "STATE-MH").</summary>
        public string? BoardCode { get; set; }
        /// <summary>Grading system label (e.g. "A1-E2 10-point scale").</summary>
        public string? GradingSystem { get; set; }
        /// <summary>Overall pass percentage for this exam's board (school override applied).</summary>
        public decimal? OverallPassingPercentage { get; set; }
        /// <summary>
        /// Ordered grading scale for rendering the grade key on exam setup pages and mark entry sheets.
        /// Always populated regardless of exam status.
        /// </summary>
        public List<GradeScaleEntryDto> EffectiveGradingScale { get; set; } = new();
    }

    /// <summary>Per-subject slot within an ExamSetup.</summary>
    public class ExamSetupSubjectDto
    {
        public Guid Id { get; set; }
        public Guid SubjectId { get; set; }
        public string SubjectName { get; set; } = string.Empty;
        public string? SubjectCode { get; set; }
        public bool IsElective { get; set; }
        public decimal MaxTheoryMarks { get; set; }
        public decimal MaxPracticalMarks { get; set; }
        public decimal MaxInternalMarks { get; set; }
        public decimal MaxTotalMarks { get; set; }
        public decimal PassingMarks { get; set; }
        public Guid? AssignedStaffId { get; set; }
        public string? AssignedStaffName { get; set; }
        public DateTime? ExamDate { get; set; }
        public string? StartTime { get; set; }
        public string? EndTime { get; set; }
        public string? Venue { get; set; }
        public int SubjectOrder { get; set; }
        public string Status { get; set; } = "pending";
        public int StudentsEnrolled { get; set; }
        public int MarksEntered { get; set; }
    }

    /// <summary>Create/update payload for ExamSetup (Step 1 of wizard).</summary>
    public class CreateExamSetupDto
    {
        public Guid? ExamTypeId { get; set; }

        public bool IsCustomType { get; set; } = false;

        [MaxLength(100)]
        public string? CustomTypeName { get; set; }

        [Required]
        public Guid ClassId { get; set; }

        public Guid? SectionId { get; set; }

        /// <summary>Explicitly chosen board (required when class has multiple boards).</summary>
        public Guid? BoardConfigurationId { get; set; }

        [Required]
        [MaxLength(20)]
        public string AcademicYear { get; set; } = string.Empty;

        public int Term { get; set; } = 0;

        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }

        /// <summary>Subjects to include (Step 3 of wizard).</summary>
        [Required]
        public List<CreateExamSetupSubjectDto> Subjects { get; set; } = new();
    }

    /// <summary>Per-subject payload when creating an ExamSetup.</summary>
    public class CreateExamSetupSubjectDto
    {
        [Required]
        public Guid SubjectId { get; set; }

        public bool IsElective { get; set; } = false;

        [Range(0, 1000)]
        public decimal MaxTheoryMarks { get; set; } = 0;

        [Range(0, 1000)]
        public decimal MaxPracticalMarks { get; set; } = 0;

        [Range(0, 1000)]
        public decimal MaxInternalMarks { get; set; } = 0;

        [Range(0, 1000)]
        public decimal PassingMarks { get; set; } = 35;

        public Guid? AssignedStaffId { get; set; }

        public DateTime? ExamDate { get; set; }

        [MaxLength(10)]
        public string? StartTime { get; set; }

        [MaxLength(10)]
        public string? EndTime { get; set; }

        [MaxLength(100)]
        public string? Venue { get; set; }

        public int SubjectOrder { get; set; } = 0;
    }

    // ========== MARKS ENTRY DTOs ==========

    /// <summary>Sheet returned to the marks-entry UI: one row per enrolled student.</summary>
    public class MarksEntrySheetDto
    {
        public Guid ExamSetupId { get; set; }
        public Guid ExamSetupSubjectId { get; set; }
        public string ExamName { get; set; } = string.Empty;
        public string SubjectName { get; set; } = string.Empty;
        public string? SubjectCode { get; set; }
        public decimal MaxTheoryMarks { get; set; }
        public decimal MaxPracticalMarks { get; set; }
        public decimal MaxInternalMarks { get; set; }
        public decimal MaxTotalMarks { get; set; }
        public decimal PassingMarks { get; set; }
        public bool IsLocked { get; set; }
        public string Status { get; set; } = string.Empty;
        public List<StudentMarksRowDto> Rows { get; set; } = new();
    }

    public class StudentMarksRowDto
    {
        public Guid StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string? RollNumber { get; set; }
        public string? AdmissionNumber { get; set; }
        public Guid? MarksEntryId { get; set; }
        public decimal? TheoryMarks { get; set; }
        public decimal? PracticalMarks { get; set; }
        public decimal? InternalMarks { get; set; }
        public decimal? ObtainedMarks { get; set; }
        public bool IsAbsent { get; set; }
        public string? Grade { get; set; }
        public decimal? Percentage { get; set; }
        public bool IsPass { get; set; }
        public string? Remarks { get; set; }
        public string Status { get; set; } = "draft";
    }

    /// <summary>Bulk save marks for all students in a subject.</summary>
    public class BulkMarksEntryDto
    {
        [Required]
        public Guid ExamSetupId { get; set; }

        [Required]
        public Guid ExamSetupSubjectId { get; set; }

        [Required]
        public List<SingleStudentMarksDto> Entries { get; set; } = new();
    }

    public class SingleStudentMarksDto
    {
        [Required]
        public Guid StudentId { get; set; }

        [Range(0, 1000)]
        public decimal? TheoryMarks { get; set; }

        [Range(0, 1000)]
        public decimal? PracticalMarks { get; set; }

        [Range(0, 1000)]
        public decimal? InternalMarks { get; set; }

        public bool IsAbsent { get; set; } = false;

        [MaxLength(500)]
        public string? Remarks { get; set; }
    }

    // ========== HELPER DTOs (for wizard dropdowns) ==========

    /// <summary>Board info returned when a class has multiple boards configured.</summary>
    public class ClassBoardDto
    {
        public Guid BoardConfigurationId { get; set; }
        public string BoardName { get; set; } = string.Empty;
        public string BoardCode { get; set; } = string.Empty;
        public string BoardLevel { get; set; } = string.Empty;
    }

    /// <summary>Subject info returned for the exam subject picker (filtered by class+board).</summary>
    public class ClassSubjectForExamDto
    {
        public Guid SubjectId { get; set; }
        public string SubjectName { get; set; } = string.Empty;
        public string? SubjectCode { get; set; }
        public bool IsElective { get; set; }
        public int DefaultMaxMarks { get; set; }
        public int DefaultTheoryMarks { get; set; }
        public int DefaultPracticalMarks { get; set; }
        public Guid? DefaultStaffId { get; set; }
        public string? DefaultStaffName { get; set; }
    }

    /// <summary>Preview of the auto-generated exam name returned by the wizard before creation.</summary>
    public class ExamNamePreviewDto
    {
        public string SuggestedName { get; set; } = string.Empty;
    }

    /// <summary>Response after publishing exam results to parent portals.</summary>
    public class PublishResultsResponseDto
    {
        public Guid ExamSetupId { get; set; }
        public int StudentsNotified { get; set; }
        public int ReportCardsGenerated { get; set; }
        public string Message { get; set; } = string.Empty;
    }

    /// <summary>Consolidated results for one student across all subjects of an ExamSetup.</summary>
    public class StudentExamResultSummaryDto
    {
        public Guid StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string? RollNumber { get; set; }
        public string ExamName { get; set; } = string.Empty;
        public string AcademicYear { get; set; } = string.Empty;
        public List<SubjectResultSummaryDto> Subjects { get; set; } = new();
        public decimal TotalObtained { get; set; }
        public decimal TotalMax { get; set; }
        public decimal Percentage { get; set; }
        public string? OverallGrade { get; set; }
        public decimal? CGPA { get; set; }
        public int? Rank { get; set; }
        public bool IsPass { get; set; }

        // ── Board context for mark card / report card rendering ────────────
        /// <summary>Board code (e.g. "CBSE", "IB", "STATE-MH"). Null if no board configured.</summary>
        public string? BoardCode { get; set; }
        /// <summary>Full board name (e.g. "Central Board of Secondary Education").</summary>
        public string? BoardName { get; set; }
        /// <summary>Grading system description (e.g. "A1-E2 10-point scale").</summary>
        public string? GradingSystem { get; set; }
        /// <summary>
        /// Ordered grading scale legend for this exam. Populated after finalization.
        /// Allows the frontend to render the correct grade key on mark cards for every board.
        /// </summary>
        public List<GradeScaleEntryDto> GradingScaleLegend { get; set; } = new();
    }

    public class SubjectResultSummaryDto
    {
        public string SubjectName { get; set; } = string.Empty;
        public bool IsElective { get; set; }
        public decimal? TheoryMarks { get; set; }
        public decimal? PracticalMarks { get; set; }
        public decimal? InternalMarks { get; set; }
        public decimal ObtainedMarks { get; set; }
        public decimal MaxMarks { get; set; }
        public decimal Percentage { get; set; }
        public string? Grade { get; set; }
        public decimal? GradePoint { get; set; }
        public bool IsAbsent { get; set; }
        public bool IsPass { get; set; }
    }

    // ========== STAFF GRADES DASHBOARD DTOs ==========

    /// <summary>KPI stats for the staff grades dashboard — scoped to this staff's exam assignments.</summary>
    public class StaffExamStatsDto
    {
        public int TotalExams { get; set; }
        public int PublishedExams { get; set; }
        public int TotalMarksEntries { get; set; }
        public decimal AveragePercentage { get; set; }
        public decimal PassRate { get; set; }
    }

    /// <summary>One row in the student grades history tab — one student × one subject × one exam.</summary>
    public class StaffStudentMarkDto
    {
        public Guid ExamMarksEntryId { get; set; }
        public Guid ExamSetupId { get; set; }
        public string ExamName { get; set; } = string.Empty;
        public string AcademicYear { get; set; } = string.Empty;
        public Guid ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public Guid? SectionId { get; set; }
        public string? SectionName { get; set; }
        public Guid StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string? RollNumber { get; set; }
        public Guid SubjectId { get; set; }
        public string SubjectName { get; set; } = string.Empty;
        public decimal ObtainedMarks { get; set; }
        public decimal MaxMarks { get; set; }
        public decimal? Percentage { get; set; }
        public string? Grade { get; set; }
        public bool IsPass { get; set; }
        public bool IsAbsent { get; set; }
    }

    /// <summary>Paginated response for staff student marks, includes class/section filter options.</summary>
    public class StaffStudentMarksPageDto
    {
        public int Total { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public List<StaffStudentMarkDto> Items { get; set; } = new();
        public List<ClassSectionFilterOption> Classes { get; set; } = new();
    }

    /// <summary>Class+section combo for the filter dropdowns in the staff grades tab.</summary>
    public class ClassSectionFilterOption
    {
        public Guid ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public Guid? SectionId { get; set; }
        public string? SectionName { get; set; }
    }

}
