using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    public class Assignment : BaseEntity
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

        [Column(TypeName = "decimal(5,2)")]
        public decimal MaxMarks { get; set; } = 100;

        [MaxLength(20)]
        public string Status { get; set; } = "active";

        public string? AttachmentUrl { get; set; }

        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }

        [ForeignKey("ClassId")]
        public virtual Class? Class { get; set; }

        [ForeignKey("SectionId")]
        public virtual Section? Section { get; set; }

        [ForeignKey("SubjectId")]
        public virtual Subject? Subject { get; set; }

        [ForeignKey("AssignedById")]
        public virtual Staff? AssignedBy { get; set; }
    }

    public class AssignmentSubmission : BaseEntity
    {
        [Required]
        public Guid AssignmentId { get; set; }

        [Required]
        public Guid StudentId { get; set; }

        [Required]
        public DateTime SubmissionDate { get; set; }

        [Required]
        public string Content { get; set; } = string.Empty;

        public string? AttachmentUrl { get; set; }

        [Column(TypeName = "decimal(5,2)")]
        public decimal? MarksObtained { get; set; }

        [MaxLength(20)]
        public string Status { get; set; } = "submitted";

        public string? Feedback { get; set; }

        public Guid? GradedById { get; set; }

        public DateTime? GradedDate { get; set; }

        [ForeignKey("AssignmentId")]
        public virtual Assignment? Assignment { get; set; }

        [ForeignKey("StudentId")]
        public virtual Student? Student { get; set; }

        [ForeignKey("GradedById")]
        public virtual Staff? GradedBy { get; set; }
    }
}
