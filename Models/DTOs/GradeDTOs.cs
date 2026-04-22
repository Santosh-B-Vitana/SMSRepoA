using System;
using System.ComponentModel.DataAnnotations;

namespace SmsApi.Models.DTOs
{
    // Grade Category Basic DTO - Lightweight version for list views
    public class GradeCategoryBasicDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Code { get; set; }
        public decimal Weightage { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    // Grade Item Basic DTO - Lightweight version for list views
    public class GradeItemBasicDto
    {
        public Guid Id { get; set; }
        public Guid ClassId { get; set; }
        public Guid SubjectId { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal MaxMarks { get; set; }
        public DateTime Date { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    // Grade Category DTOs
    public class CreateGradeCategoryRequest
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(50)]
        public string? Code { get; set; }

        public decimal Weightage { get; set; } = 0;

        public string? Description { get; set; }

        [MaxLength(20)]
        public string Status { get; set; } = "active";
    }

    public class GradeCategoryResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Code { get; set; }
        public decimal Weightage { get; set; }
        public string? Description { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class GradeCategoryListResponse
    {
        public List<GradeCategoryResponse> Categories { get; set; } = new();
        public int Total { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }

    // Grade Item DTOs
    public class CreateGradeItemRequest
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        public Guid ClassId { get; set; }

        public Guid? SectionId { get; set; }

        [Required]
        public Guid SubjectId { get; set; }

        [Required]
        public Guid CategoryId { get; set; }

        [Required]
        [MaxLength(300)]
        public string Name { get; set; } = string.Empty;

        public decimal MaxMarks { get; set; } = 100;

        [Required]
        public DateTime Date { get; set; }

        public string? Description { get; set; }

        [MaxLength(20)]
        public string Status { get; set; } = "active";
    }

    public class UpdateGradeItemRequest
    {
        [MaxLength(300)]
        public string? Name { get; set; }

        public decimal? MaxMarks { get; set; }

        public DateTime? Date { get; set; }

        public string? Description { get; set; }

        [MaxLength(20)]
        public string? Status { get; set; }
    }

    public class GradeItemResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid ClassId { get; set; }
        public Guid? SectionId { get; set; }
        public Guid SubjectId { get; set; }
        public Guid CategoryId { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal MaxMarks { get; set; }
        public DateTime Date { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class GradeItemListResponse
    {
        public List<GradeItemResponse> Items { get; set; } = new();
        public int Total { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }

    // Student Grade DTOs
    public class CreateStudentGradeRequest
    {
        [Required]
        public Guid GradeItemId { get; set; }

        [Required]
        public Guid StudentId { get; set; }

        [Required]
        public decimal MarksObtained { get; set; }

        public string? Grade { get; set; }

        public string? Remarks { get; set; }

        public Guid? EnteredById { get; set; }

        [MaxLength(20)]
        public string Status { get; set; } = "published";
    }

    public class UpdateStudentGradeRequest
    {
        public decimal? MarksObtained { get; set; }

        public string? Grade { get; set; }

        public string? Remarks { get; set; }

        [MaxLength(20)]
        public string? Status { get; set; }
    }

    public class StudentGradeResponse
    {
        public Guid Id { get; set; }
        public Guid GradeItemId { get; set; }
        public Guid StudentId { get; set; }
        public decimal MarksObtained { get; set; }
        public string? Grade { get; set; }
        public string? Remarks { get; set; }
        public string Status { get; set; } = string.Empty;
        public Guid? EnteredById { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class StudentGradeListResponse
    {
        public List<StudentGradeResponse> Grades { get; set; } = new();
        public int Total { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }

    // CCE Assessment DTOs
    public class CreateCCEAssessmentRequest
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        public Guid StudentId { get; set; }

        [Required]
        public Guid ClassId { get; set; }

        public Guid? SectionId { get; set; }

        [Required]
        [MaxLength(50)]
        public string AcademicYear { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Term { get; set; } = string.Empty;

        [Required]
        [MaxLength(200)]
        public string SkillArea { get; set; } = string.Empty;

        [Required]
        [MaxLength(10)]
        public string Grade { get; set; } = string.Empty;

        public string? Remarks { get; set; }

        public Guid? AssessedById { get; set; }
    }

    public class UpdateCCEAssessmentRequest
    {
        [MaxLength(10)]
        public string? Grade { get; set; }

        public string? Remarks { get; set; }
    }

    public class CCEAssessmentResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid StudentId { get; set; }
        public Guid ClassId { get; set; }
        public Guid? SectionId { get; set; }
        public string AcademicYear { get; set; } = string.Empty;
        public string Term { get; set; } = string.Empty;
        public string SkillArea { get; set; } = string.Empty;
        public string Grade { get; set; } = string.Empty;
        public string? Remarks { get; set; }
        public Guid? AssessedById { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class CCEAssessmentListResponse
    {
        public List<CCEAssessmentResponse> Assessments { get; set; } = new();
        public int Total { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }

    // Grade Filters DTOs
    public class GradeItemsFiltersDto
    {
        public Guid? ClassId { get; set; }
        public Guid? SubjectId { get; set; }
        public string? Status { get; set; }
        public string? SearchQuery { get; set; }
        public DateTime? DateFrom { get; set; }
        public DateTime? DateTo { get; set; }
        public string? AcademicYear { get; set; }
    }

    public class StudentGradesFiltersDto
    {
        public Guid? GradeItemId { get; set; }
        public Guid? StudentId { get; set; }
        public Guid? ClassId { get; set; }
        public string? GradeRange { get; set; }
        public string? SearchQuery { get; set; }
        public string? AcademicYear { get; set; }
        public string? Term { get; set; }
    }

    // Bulk grade entry
    public class BulkCreateStudentGradeRequest
    {
        [Required]
        public Guid GradeItemId { get; set; }
        [Required]
        public List<BulkGradeEntry> Grades { get; set; } = new();
    }

    public class BulkGradeEntry
    {
        [Required]
        public Guid StudentId { get; set; }
        [Required]
        public decimal MarksObtained { get; set; }
        public string? Remarks { get; set; }
    }

    public class BulkCreateStudentGradeResult
    {
        public int Created { get; set; }
        public int Skipped { get; set; }
        public List<string> Errors { get; set; } = new();
    }

    // Grade stats DTOs
    public class GradeStatsResponse
    {
        public Guid SchoolId { get; set; }
        public int TotalGradeItems { get; set; }
        public int TotalStudentGrades { get; set; }
        public decimal AverageMarks { get; set; }
        public decimal PassRate { get; set; }
        public Dictionary<string, int> GradeDistribution { get; set; } = new();
        public List<ClassGradeSummary> ByClass { get; set; } = new();
    }

    public class ClassGradeSummary
    {
        public Guid ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public int StudentCount { get; set; }
        public decimal AverageMarks { get; set; }
        public decimal PassRate { get; set; }
    }
}
