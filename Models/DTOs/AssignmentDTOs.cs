using System;
using System.ComponentModel.DataAnnotations;

namespace SmsApi.Models.DTOs
{
    // Assignment Basic DTO - Lightweight version for list views
    public class AssignmentBasicDto
    {
        public Guid Id { get; set; }
        public Guid ClassId { get; set; }
        public Guid SubjectId { get; set; }
        public string Title { get; set; } = string.Empty;
        public DateTime AssignedDate { get; set; }
        public DateTime DueDate { get; set; }
        public decimal MaxMarks { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    // Assignment DTOs
    public class CreateAssignmentRequest
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        public Guid ClassId { get; set; }

        public Guid? SectionId { get; set; }

        [Required]
        public Guid SubjectId { get; set; }

        [Required]
        public Guid AssignedById { get; set; }

        [Required]
        [MaxLength(500)]
        public string Title { get; set; } = string.Empty;

        [Required]
        public string Description { get; set; } = string.Empty;

        [Required]
        public DateTime AssignedDate { get; set; }

        [Required]
        public DateTime DueDate { get; set; }

        public decimal MaxMarks { get; set; } = 100;

        public string? AttachmentUrl { get; set; }

        [MaxLength(20)]
        public string Status { get; set; } = "active";
    }

    public class UpdateAssignmentRequest
    {
        [MaxLength(500)]
        public string? Title { get; set; }

        public string? Description { get; set; }

        public DateTime? DueDate { get; set; }

        public decimal? MaxMarks { get; set; }

        public string? AttachmentUrl { get; set; }

        [MaxLength(20)]
        public string? Status { get; set; }
    }

    public class AssignmentResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public Guid? SectionId { get; set; }
        public string? SectionName { get; set; }
        public Guid SubjectId { get; set; }
        public string SubjectName { get; set; } = string.Empty;
        public Guid AssignedById { get; set; }
        public string AssignedByName { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public DateTime AssignedDate { get; set; }
        public DateTime DueDate { get; set; }
        public decimal MaxMarks { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? AttachmentUrl { get; set; }
        public int SubmissionCount { get; set; }
        public int GradedCount { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class AssignmentListResponse
    {
        public List<AssignmentResponse> Assignments { get; set; } = new();
        public int Total { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }

    // Assignment Submission DTOs
    public class CreateSubmissionRequest
    {
        [Required]
        public Guid AssignmentId { get; set; }

        [Required]
        public Guid StudentId { get; set; }

        [Required]
        public string Content { get; set; } = string.Empty;

        public string? AttachmentUrl { get; set; }
    }

    public class GradeSubmissionRequest
    {
        [Required]
        public decimal MarksObtained { get; set; }

        public string? Feedback { get; set; }

        [Required]
        public Guid GradedById { get; set; }

        [MaxLength(20)]
        public string Status { get; set; } = "graded";
    }

    public class SubmissionResponse
    {
        public Guid Id { get; set; }
        public Guid AssignmentId { get; set; }
        public Guid StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string? StudentRollNo { get; set; }
        public DateTime SubmissionDate { get; set; }
        public string Content { get; set; } = string.Empty;
        public string? AttachmentUrl { get; set; }
        public decimal? MarksObtained { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? Feedback { get; set; }
        public Guid? GradedById { get; set; }
        public DateTime? GradedDate { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class SubmissionListResponse
    {
        public List<SubmissionResponse> Submissions { get; set; } = new();
        public int Total { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }
}
