using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    public class GradeCategory : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(50)]
        public string? Code { get; set; }

        [Column(TypeName = "decimal(5,2)")]
        public decimal Weightage { get; set; } = 0;

        public string? Description { get; set; }

        [MaxLength(20)]
        public string Status { get; set; } = "active";

        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
    }

    public class GradeItem : BaseEntity
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

        [Column(TypeName = "decimal(5,2)")]
        public decimal MaxMarks { get; set; } = 100;

        [Required]
        public DateTime Date { get; set; }

        [MaxLength(20)]
        public string Status { get; set; } = "active";

        public string? Description { get; set; }

        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }

        [ForeignKey("ClassId")]
        public virtual Class? Class { get; set; }

        [ForeignKey("SectionId")]
        public virtual Section? Section { get; set; }

        [ForeignKey("SubjectId")]
        public virtual Subject? Subject { get; set; }

        [ForeignKey("CategoryId")]
        public virtual GradeCategory? Category { get; set; }
    }

    public class StudentGrade : BaseEntity
    {
        [Required]
        public Guid GradeItemId { get; set; }

        [Required]
        public Guid StudentId { get; set; }

        [Column(TypeName = "decimal(5,2)")]
        public decimal MarksObtained { get; set; } = 0;

        public string? Grade { get; set; }

        public string? Remarks { get; set; }

        [MaxLength(20)]
        public string Status { get; set; } = "published";

        public Guid? EnteredById { get; set; }

        [ForeignKey("GradeItemId")]
        public virtual GradeItem? GradeItem { get; set; }

        [ForeignKey("StudentId")]
        public virtual Student? Student { get; set; }

        [ForeignKey("EnteredById")]
        public virtual Staff? EnteredBy { get; set; }
    }

    public class CCEAssessment : BaseEntity
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

        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }

        [ForeignKey("StudentId")]
        public virtual Student? Student { get; set; }

        [ForeignKey("ClassId")]
        public virtual Class? Class { get; set; }

        [ForeignKey("SectionId")]
        public virtual Section? Section { get; set; }

        [ForeignKey("AssessedById")]
        public virtual Staff? AssessedBy { get; set; }
    }
}
