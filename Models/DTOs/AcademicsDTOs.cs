using System;
using System.ComponentModel.DataAnnotations;

namespace SmsApi.Models.DTOs
{
    // Class Basic DTO - Lightweight version for list views
    public class ClassBasicDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Code { get; set; }
        public int? Capacity { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    // Section Basic DTO - Lightweight version for list views
    public class SectionBasicDto
    {
        public Guid Id { get; set; }
        public Guid ClassId { get; set; }
        public string Name { get; set; } = string.Empty;
        public int? Capacity { get; set; }
        public int StudentsCount { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    // Class DTOs
    public class CreateClassRequest
    {
        [Required]
        public Guid SchoolId { get; set; }

        [MaxLength(100)]
        public string? Name { get; set; }

        // Frontend-compatible fields
        [MaxLength(100)]
        public string? Standard { get; set; }

        /// <summary>Number of sections to auto-create (A, B, C...). Replaces the old free-text Section field.</summary>
        public int NumberOfSections { get; set; } = 1;

        /// <summary>Legacy single-section text. Kept for backward compat; use NumberOfSections for new code.</summary>
        [MaxLength(20)]
        public string? Section { get; set; }

        [MaxLength(20)]
        public string? AcademicYear { get; set; }

        public Guid? ClassTeacherId { get; set; }

        [MaxLength(200)]
        public string? ClassTeacher { get; set; }

        [MaxLength(20)]
        public string? Code { get; set; }

        /// <summary>Curriculum board (CBSE, ICSE, State, IB, etc.)</summary>
        [MaxLength(50)]
        public string? Board { get; set; }

        /// <summary>FK to BoardConfiguration — set when admin selects a board during class setup.</summary>
        public Guid? BoardConfigurationId { get; set; }

        public int? Capacity { get; set; }

        [MaxLength(20)]
        public string Status { get; set; } = "active";
    }

    public class ClassResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Standard { get; set; } = string.Empty;
        public string Section { get; set; } = string.Empty;
        public string AcademicYear { get; set; } = string.Empty;
        public int TotalStudents { get; set; }
        public string? ClassTeacher { get; set; }
        public Guid? ClassTeacherId { get; set; }
        public string? Code { get; set; }
        public string? Board { get; set; }
        public Guid? BoardConfigurationId { get; set; }
        public string? BoardName { get; set; }   // resolved from BoardConfig nav
        public int? Capacity { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class ClassListResponse
    {
        public List<ClassResponse> Classes { get; set; } = new();
        public int Total { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }

    // Section DTOs
    public class CreateSectionRequest
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        public Guid ClassId { get; set; }

        [Required]
        [MaxLength(50)]
        public string Name { get; set; } = string.Empty;

        public int? Capacity { get; set; }

        [MaxLength(20)]
        public string Status { get; set; } = "active";

        // Class teacher for this section (creates a TeacherAssignment with IsClassTeacher=true)
        public Guid? ClassTeacherId { get; set; }
    }

    public class SectionResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid ClassId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string ClassName { get; set; } = string.Empty;
        public int? Capacity { get; set; }
        public int StudentsCount { get; set; }
        public int TotalStudents { get; set; }
        public string Status { get; set; } = string.Empty;
        public Guid? ClassTeacherId { get; set; }
        public string? ClassTeacherName { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class SectionListResponse
    {
        public List<SectionResponse> Sections { get; set; } = new();
        public int Total { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }

    // Subject DTOs
    public class CreateSubjectRequest
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Code { get; set; } = string.Empty;

        /// <summary>Legacy free-text type — prefer SubjectTypeId.</summary>
        [MaxLength(50)]
        public string? Type { get; set; }

        /// <summary>FK to SubjectType (Theory / Practical / Language / Project).</summary>
        public Guid? SubjectTypeId { get; set; }

        public int? MaxMarks { get; set; }
        public int? TheoryMaxMarks { get; set; }
        public int? PracticalMaxMarks { get; set; }
        public int? PassMarks { get; set; }

        public string? Description { get; set; }

        [MaxLength(20)]
        public string Status { get; set; } = "active";

        /// <summary>Curriculum board FK. Null = school-default (available for all boards).</summary>
        public Guid? BoardConfigurationId { get; set; }
    }

    public class SubjectResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string? Type { get; set; }
        public Guid? SubjectTypeId { get; set; }
        public string? SubjectTypeName { get; set; }
        public int? MaxMarks { get; set; }
        public int? TheoryMaxMarks { get; set; }
        public int? PracticalMaxMarks { get; set; }
        public int? PassMarks { get; set; }
        public string? Description { get; set; }
        public string Status { get; set; } = string.Empty;
        public Guid? BoardConfigurationId { get; set; }
        public string? BoardName { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class SubjectListResponse
    {
        public List<SubjectResponse> Subjects { get; set; } = new();
        public int Total { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }

    // Class Subject DTOs
    public class UpdateClassSubjectTeacherRequest
    {
        /// <summary>Assign a teacher; pass null to unassign.</summary>
        public Guid? TeacherId { get; set; }
    }

    public class AssignSubjectRequest
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        public Guid ClassId { get; set; }

        [Required]
        public Guid SubjectId { get; set; }

        /// <summary>Specify Theory / Practical context for this class-subject.</summary>
        public Guid? SubjectTypeId { get; set; }

        public Guid? TeacherId { get; set; }

        /// <summary>Academic year e.g. "2025-26"</summary>
        [MaxLength(20)]
        public string? AcademicYear { get; set; }

        public int? MaxMarks { get; set; } = 100;
        public int? TheoryMaxMarks { get; set; }
        public int? PracticalMaxMarks { get; set; }

        public int? Credits { get; set; } = 4;

        public bool IsMandatory { get; set; } = true;

        [MaxLength(20)]
        public string Status { get; set; } = "active";
    }

    public class ClassSubjectResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid ClassId { get; set; }
        public Guid SubjectId { get; set; }
        public Guid? SubjectTypeId { get; set; }
        public Guid? TeacherId { get; set; }
        public string? SubjectName { get; set; }
        public string? SubjectCode { get; set; }
        public string? SubjectType { get; set; }
        public string? SubjectTypeName { get; set; }
        public string? TeacherName { get; set; }
        public string? AcademicYear { get; set; }
        public int? MaxMarks { get; set; }
        public int? TheoryMaxMarks { get; set; }
        public int? PracticalMaxMarks { get; set; }
        public int? Credits { get; set; }
        public bool IsMandatory { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    // Teacher Assignment DTOs
    public class AssignTeacherRequest
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        public Guid StaffId { get; set; }

        [Required]
        public Guid ClassId { get; set; }

        public Guid? SectionId { get; set; }

        public Guid? SubjectId { get; set; }

        public bool IsClassTeacher { get; set; } = false;

        [Required]
        [MaxLength(20)]
        public string AcademicYear { get; set; } = string.Empty;

        [MaxLength(20)]
        public string Status { get; set; } = "active";
    }

    public class TeacherAssignmentResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid StaffId { get; set; }
        public string StaffName { get; set; } = string.Empty;
        public Guid ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public Guid? SectionId { get; set; }
        public string? SectionName { get; set; }
        public Guid? SubjectId { get; set; }
        public string? SubjectName { get; set; }
        public bool IsClassTeacher { get; set; }
        public string AcademicYear { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class TeacherAssignmentListResponse
    {
        public List<TeacherAssignmentResponse> Assignments { get; set; } = new();
        public int Total { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }

    // Class Settings DTOs
    public class CreateClassSettingsRequest
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        public Guid ClassId { get; set; }

        [Range(0, 100)]
        public decimal PassingPercentage { get; set; } = 35m;

        [Range(0, 100)]
        public decimal MinimumAttendance { get; set; } = 75m;

        [MaxLength(20)]
        public string GradingScale { get; set; } = "4.0";

        [MaxLength(50)]
        public string PromotionPolicy { get; set; } = "strict";

        public string? CustomPromotionPolicy { get; set; }

        public bool EnableAutoPromotion { get; set; } = true;

        public bool EnableSupplementaryExams { get; set; } = true;

        public bool EnableGradingForPromotion { get; set; } = true;

        public int? MinSubjectsToPass { get; set; }

        public string? Notes { get; set; }
    }

    public class UpdateClassSettingsRequest
    {
        [Range(0, 100)]
        public decimal? PassingPercentage { get; set; }

        [Range(0, 100)]
        public decimal? MinimumAttendance { get; set; }

        [MaxLength(20)]
        public string? GradingScale { get; set; }

        [MaxLength(50)]
        public string? PromotionPolicy { get; set; }

        public string? CustomPromotionPolicy { get; set; }

        public bool? EnableAutoPromotion { get; set; }

        public bool? EnableSupplementaryExams { get; set; }

        public bool? EnableGradingForPromotion { get; set; }

        public int? MinSubjectsToPass { get; set; }

        public string? Notes { get; set; }

        public string? Status { get; set; }
    }

    public class ClassSettingsResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid ClassId { get; set; }
        public decimal PassingPercentage { get; set; }
        public decimal MinimumAttendance { get; set; }
        public string GradingScale { get; set; } = string.Empty;
        public string PromotionPolicy { get; set; } = string.Empty;
        public string? CustomPromotionPolicy { get; set; }
        public bool EnableAutoPromotion { get; set; }
        public bool EnableSupplementaryExams { get; set; }
        public bool EnableGradingForPromotion { get; set; }
        public int? MinSubjectsToPass { get; set; }
        public string? Notes { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class ClassSettingsListResponse
    {
        public List<ClassSettingsResponse> Settings { get; set; } = new();
        public int Total { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }

    // Grade Tier DTOs
    public class CreateGradeTierRequest
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        public Guid ClassId { get; set; }

        [Required]
        [MaxLength(10)]
        public string Grade { get; set; } = string.Empty;

        [Range(0, 100)]
        public decimal MinMarks { get; set; }

        [Range(0, 100)]
        public decimal MaxMarks { get; set; }

        [Range(0, 10)]
        public decimal GPA { get; set; }

        public int DisplayOrder { get; set; }
    }

    public class UpdateGradeTierRequest
    {
        [MaxLength(10)]
        public string? Grade { get; set; }

        [Range(0, 100)]
        public decimal? MinMarks { get; set; }

        [Range(0, 100)]
        public decimal? MaxMarks { get; set; }

        [Range(0, 10)]
        public decimal? GPA { get; set; }

        public int? DisplayOrder { get; set; }
    }

    public class GradeTierResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid ClassId { get; set; }
        public string Grade { get; set; } = string.Empty;
        public decimal MinMarks { get; set; }
        public decimal MaxMarks { get; set; }
        public decimal GPA { get; set; }
        public int DisplayOrder { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class GradeTierListResponse
    {
        public List<GradeTierResponse> GradeTiers { get; set; } = new();
        public int Total { get; set; }
    }

    // Timetable DTOs
    public class CreateTimetableEntryRequest
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        public Guid SectionId { get; set; }

        [Required]
        [MaxLength(20)]
        public string DayOfWeek { get; set; } = string.Empty;

        [Required]
        public int Period { get; set; }

        [Required]
        public Guid SubjectId { get; set; }

        public Guid? TeacherId { get; set; }

        [MaxLength(10)]
        public string? StartTime { get; set; }

        [MaxLength(10)]
        public string? EndTime { get; set; }

        [Required]
        [MaxLength(20)]
        public string AcademicYear { get; set; } = string.Empty;
    }

    public class UpdateTimetableEntryRequest
    {
        [MaxLength(20)]
        public string? DayOfWeek { get; set; }

        public int? Period { get; set; }

        public Guid? SubjectId { get; set; }

        public Guid? TeacherId { get; set; }

        [MaxLength(10)]
        public string? StartTime { get; set; }

        [MaxLength(10)]
        public string? EndTime { get; set; }

        [MaxLength(20)]
        public string? AcademicYear { get; set; }
    }

    public class TimetableEntryResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid SectionId { get; set; }
        public string DayOfWeek { get; set; } = string.Empty;
        public int Period { get; set; }
        public Guid SubjectId { get; set; }
        public string SubjectName { get; set; } = string.Empty;
        public Guid? TeacherId { get; set; }
        public string? TeacherName { get; set; }
        public string? StartTime { get; set; }
        public string? EndTime { get; set; }
        public string AcademicYear { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class TimetableEntryListResponse
    {
        public List<TimetableEntryResponse> Entries { get; set; } = new();
        public int Total { get; set; }
    }

    // Grouped Class DTOs
    public class GroupedClassResponse
    {
        public string ClassName { get; set; } = string.Empty;
        public Guid ClassId { get; set; }
        public int SectionsCount { get; set; }
        public int TotalStudents { get; set; }
        public List<Guid> SectionIds { get; set; } = new();
        public List<SectionBasicDto> Sections { get; set; } = new();
    }

    public class GroupedClassListResponse
    {
        public List<GroupedClassResponse> GroupedClasses { get; set; } = new();
        public int Total { get; set; }
    }

    // My Class Assignments DTO — returned for logged-in teacher
    public class MyClassAssignmentDto
    {
        /// <summary>
        /// Unique key for this assignment view. For section-specific TeacherAssignment rows this is
        /// the assignment Guid as a string. For class-wide assignments expanded per section this is a
        /// composite "{assignmentGuid}|{sectionGuid}" string.  The frontend matches on this value when
        /// routing to /staff-class/:assignmentId.
        /// </summary>
        public string AssignmentId { get; set; } = string.Empty;
        /// <summary>The StaffMember.Id (not the UserLogin.Id) — use this to match against ExamSetupSubjectDto.AssignedStaffId.</summary>
        public Guid StaffId { get; set; }
        public Guid ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public Guid? SectionId { get; set; }
        public string? SectionName { get; set; }
        public Guid? SubjectId { get; set; }
        public string? SubjectName { get; set; }
        public bool IsClassTeacher { get; set; }
        public string AcademicYear { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public int StudentCount { get; set; }
    }

    // Extended Class Settings with new fields
    public class UpdateClassSettingsExtendedRequest : UpdateClassSettingsRequest
    {
        public int? MaxStudentsPerSection { get; set; }

        public bool? EnableContinuousAssessment { get; set; }

        public bool? EnableMidtermExams { get; set; }

        public DateTime? TermStartDate { get; set; }

        public DateTime? TermEndDate { get; set; }

        public DateTime? MidTermExamStart { get; set; }

        public DateTime? FinalExamStart { get; set; }
    }

    // Academic Year DTOs
    public class AcademicYearResponse
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public bool IsCurrent { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class AcademicYearListResponse
    {
        public List<AcademicYearResponse> AcademicYears { get; set; } = new();
        public int Total { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }

    public class CreateAcademicYearRequest
    {
        [Required]
        [MaxLength(50)]
        public string Name { get; set; } = string.Empty;

        [Required]
        public DateTime StartDate { get; set; }

        [Required]
        public DateTime EndDate { get; set; }
    }

    // ── ExamType DTOs ──────────────────────────────────────────────────────────
    public class ExamTypeResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string Name { get; set; } = string.Empty;
        public int DefaultMaxMarks { get; set; }
        public int ExamsPerTerm { get; set; }
        public bool IsUnitTest { get; set; }
        public string? Description { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class CreateExamTypeRequest
    {
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;
        public int DefaultMaxMarks { get; set; } = 100;
        public int ExamsPerTerm { get; set; } = 1;
        public bool IsUnitTest { get; set; } = false;
        public string? Description { get; set; }
    }

    public class ExamTypeListResponse
    {
        public List<ExamTypeResponse> ExamTypes { get; set; } = new();
        public int Total { get; set; }
    }

    // ── SubjectType DTOs ───────────────────────────────────────────────────────
    public class SubjectTypeResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class CreateSubjectTypeRequest
    {
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
    }

    public class SubjectTypeListResponse
    {
        public List<SubjectTypeResponse> SubjectTypes { get; set; } = new();
        public int Total { get; set; }
    }

    // ── StudentSubject DTOs ────────────────────────────────────────────────────
    public class StudentSubjectResponse
    {
        public Guid Id { get; set; }
        public Guid StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public Guid ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public Guid SubjectId { get; set; }
        public string SubjectName { get; set; } = string.Empty;
        public Guid? SubjectTypeId { get; set; }
        public string? SubjectTypeName { get; set; }
        public string AcademicYear { get; set; } = string.Empty;
        public bool IsMandatory { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    public class AssignStudentSubjectRequest
    {
        [Required]
        public Guid StudentId { get; set; }
        [Required]
        public Guid ClassId { get; set; }
        [Required]
        public Guid SubjectId { get; set; }
        public Guid? SubjectTypeId { get; set; }
        [Required]
        [MaxLength(20)]
        public string AcademicYear { get; set; } = string.Empty;
        public bool IsMandatory { get; set; } = true;
    }

    public class BulkAssignStudentSubjectsRequest
    {
        [Required]
        public Guid StudentId { get; set; }
        [Required]
        public Guid ClassId { get; set; }
        [Required]
        public string AcademicYear { get; set; } = string.Empty;
        public List<Guid> SubjectIds { get; set; } = new();
    }
}

