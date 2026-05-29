using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SmsApi.Models.DTOs
{
    // ═══════════════════════════════════════════════════════════════
    // SYLLABUS UNIT DTOs
    // ═══════════════════════════════════════════════════════════════

    public class CreateSyllabusUnitRequest
    {
        [Required]
        public Guid ClassId { get; set; }

        [Required]
        public Guid SubjectId { get; set; }

        [Required]
        [MaxLength(20)]
        public string AcademicYear { get; set; } = string.Empty;

        [Required]
        public int UnitNumber { get; set; }

        [Required]
        [MaxLength(300)]
        public string Title { get; set; } = string.Empty;

        public string? Description { get; set; }
        public int? PlannedHours { get; set; }
        public DateTime? PlannedStartDate { get; set; }
        public DateTime? PlannedEndDate { get; set; }
    }

    public class UpdateSyllabusUnitRequest
    {
        [MaxLength(300)]
        public string? Title { get; set; }
        public string? Description { get; set; }
        public int? UnitNumber { get; set; }
        public int? PlannedHours { get; set; }
        public DateTime? PlannedStartDate { get; set; }
        public DateTime? PlannedEndDate { get; set; }
        public DateTime? ActualStartDate { get; set; }
        public DateTime? ActualEndDate { get; set; }

        /// <summary>pending | in_progress | completed</summary>
        [MaxLength(20)]
        public string? Status { get; set; }
    }

    public class SyllabusUnitResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid ClassId { get; set; }
        public string? ClassName { get; set; }
        public Guid SubjectId { get; set; }
        public string? SubjectName { get; set; }
        public string AcademicYear { get; set; } = string.Empty;
        public int UnitNumber { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int? PlannedHours { get; set; }
        public DateTime? PlannedStartDate { get; set; }
        public DateTime? PlannedEndDate { get; set; }
        public DateTime? ActualStartDate { get; set; }
        public DateTime? ActualEndDate { get; set; }
        public string Status { get; set; } = "pending";
        public int TotalTopics { get; set; }
        public int CompletedTopics { get; set; }
        public double CompletionPercentage => TotalTopics == 0 ? 0 : Math.Round((double)CompletedTopics / TotalTopics * 100, 1);
        public List<SyllabusTopicResponse> Topics { get; set; } = new();
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    // ═══════════════════════════════════════════════════════════════
    // SYLLABUS TOPIC DTOs
    // ═══════════════════════════════════════════════════════════════

    public class CreateSyllabusTopicRequest
    {
        [Required]
        public Guid UnitId { get; set; }

        [Required]
        public int TopicNumber { get; set; }

        [Required]
        [MaxLength(300)]
        public string Title { get; set; } = string.Empty;

        public string? Description { get; set; }
        public int? DurationMinutes { get; set; }

        [MaxLength(500)]
        public string? ResourceReferences { get; set; }
    }

    public class UpdateSyllabusTopicRequest
    {
        [MaxLength(300)]
        public string? Title { get; set; }
        public string? Description { get; set; }
        public int? TopicNumber { get; set; }
        public int? DurationMinutes { get; set; }

        [MaxLength(500)]
        public string? ResourceReferences { get; set; }

        /// <summary>pending | in_progress | completed</summary>
        [MaxLength(20)]
        public string? Status { get; set; }
    }

    public class MarkTopicCompleteRequest
    {
        [Required]
        public DateTime CompletedDate { get; set; }

        [MaxLength(1000)]
        public string? Remarks { get; set; }
    }

    public class SyllabusTopicResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid UnitId { get; set; }
        public int TopicNumber { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int? DurationMinutes { get; set; }
        public string? ResourceReferences { get; set; }
        public string Status { get; set; } = "pending";
        public DateTime? CompletedDate { get; set; }
        public Guid? CompletedByStaffId { get; set; }
        public string? CompletedByStaffName { get; set; }
        public string? CompletionRemarks { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    // ═══════════════════════════════════════════════════════════════
    // LESSON PLAN DTOs
    // ═══════════════════════════════════════════════════════════════

    public class CreateLessonPlanRequest
    {
        [Required]
        public Guid ClassId { get; set; }

        public Guid? SectionId { get; set; }

        [Required]
        public Guid SubjectId { get; set; }

        public Guid? TopicId { get; set; }

        [Required]
        public DateTime Date { get; set; }

        public int? PeriodNumber { get; set; }

        [Required]
        [MaxLength(300)]
        public string Title { get; set; } = string.Empty;

        public string? LearningObjectives { get; set; }
        public string? TeachingMethods { get; set; }
        public string? Resources { get; set; }
        public string? ClassActivities { get; set; }
        public string? Homework { get; set; }
        public string? Notes { get; set; }
    }

    public class UpdateLessonPlanRequest
    {
        public Guid? TopicId { get; set; }
        public DateTime? Date { get; set; }
        public int? PeriodNumber { get; set; }

        [MaxLength(300)]
        public string? Title { get; set; }
        public string? LearningObjectives { get; set; }
        public string? TeachingMethods { get; set; }
        public string? Resources { get; set; }
        public string? ClassActivities { get; set; }
        public string? Homework { get; set; }
        public string? Notes { get; set; }
    }

    public class ApproveLessonPlanRequest
    {
        [Required]
        [MaxLength(20)]
        public string Action { get; set; } = string.Empty; // "approve" | "reject"

        [MaxLength(500)]
        public string? RejectionReason { get; set; }
    }

    public class LessonPlanResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid? StaffId { get; set; }
        public string? StaffName { get; set; }
        public Guid ClassId { get; set; }
        public string? ClassName { get; set; }
        public Guid? SectionId { get; set; }
        public string? SectionName { get; set; }
        public Guid SubjectId { get; set; }
        public string? SubjectName { get; set; }
        public Guid? TopicId { get; set; }
        public string? TopicTitle { get; set; }
        public DateTime Date { get; set; }
        public int? PeriodNumber { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? LearningObjectives { get; set; }
        public string? TeachingMethods { get; set; }
        public string? Resources { get; set; }
        public string? ClassActivities { get; set; }
        public string? Homework { get; set; }
        public string? Notes { get; set; }
        public string Status { get; set; } = "draft";
        public Guid? ApprovedByStaffId { get; set; }
        public string? ApprovedByName { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public string? RejectionReason { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    // ═══════════════════════════════════════════════════════════════
    // SYLLABUS COVERAGE REPORT
    // ═══════════════════════════════════════════════════════════════

    public class SyllabusCoverageReport
    {
        public Guid ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public Guid SubjectId { get; set; }
        public string SubjectName { get; set; } = string.Empty;
        public string AcademicYear { get; set; } = string.Empty;
        public int TotalUnits { get; set; }
        public int CompletedUnits { get; set; }
        public int InProgressUnits { get; set; }
        public int PendingUnits { get; set; }
        public int TotalTopics { get; set; }
        public int CompletedTopics { get; set; }
        public double OverallCompletionPercentage => TotalTopics == 0 ? 0 : Math.Round((double)CompletedTopics / TotalTopics * 100, 1);
        public List<SyllabusUnitResponse> Units { get; set; } = new();
    }

    public class LessonPlanListResponse
    {
        public List<LessonPlanResponse> Plans { get; set; } = new();
        public int Total { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }

    // ═══════════════════════════════════════════════════════════════
    // TEACHER ASSIGNMENT DTOs
    // ═══════════════════════════════════════════════════════════════

    /// <summary>
    /// A class+subject pair assigned to a specific teacher, returned by GET /syllabus/my-assignments.
    /// </summary>
    public class TeacherSubjectAssignmentDto
    {
        public Guid ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public Guid? SectionId { get; set; }
        public string? SectionName { get; set; }
        public Guid SubjectId { get; set; }
        public string SubjectName { get; set; } = string.Empty;
        public string AcademicYear { get; set; } = string.Empty;
    }

    /// <summary>
    /// Which teacher is assigned to a specific section for a given class+subject. Returned by GET /syllabus/section-teachers.
    /// </summary>
    public class SectionTeacherInfoDto
    {
        public Guid? SectionId { get; set; }
        public string? SectionName { get; set; }
        public Guid? StaffId { get; set; }
        public string? StaffName { get; set; }
    }
}
