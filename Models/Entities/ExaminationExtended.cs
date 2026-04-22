using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    // ========== RESULT ==========
    public class Result : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public Guid ExamId { get; set; }
        
        [Required]
        public Guid StudentId { get; set; }
        
        [Required]
        public Guid SubjectId { get; set; }
        
        public decimal? TheoryMarks { get; set; }
        
        public decimal? PracticalMarks { get; set; }
        
        public decimal TotalMarks { get; set; }
        
        public decimal ObtainedMarks { get; set; }
        
        [MaxLength(10)]
        public string? Grade { get; set; }
        
        public decimal? GradePoint { get; set; }
        
        public decimal? Percentage { get; set; }
        
        [MaxLength(20)]
        public string Status { get; set; } = "Pass"; // Pass, Fail, Absent
        
        [MaxLength(1000)]
        public string? Remarks { get; set; }
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
        
        [ForeignKey("ExamId")]
        public virtual Exam? Exam { get; set; }
        
        [ForeignKey("StudentId")]
        public virtual Student? Student { get; set; }
        
        [ForeignKey("SubjectId")]
        public virtual Subject? Subject { get; set; }
    }

    // ========== GRADE CONFIGURATION ==========
    public class GradeConfiguration : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(10)]
        public string Grade { get; set; } = string.Empty;
        
        public decimal MinPercentage { get; set; }
        
        public decimal MaxPercentage { get; set; }
        
        public decimal? GradePoint { get; set; }
        
        [MaxLength(500)]
        public string? Description { get; set; }
        
        public bool IsPassingGrade { get; set; } = true;
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
    }

    // ========== REPORT CARD ==========
    public class ReportCard : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public Guid StudentId { get; set; }
        
        [Required]
        public Guid ExamId { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string AcademicYear { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(50)]
        public string Term { get; set; } = string.Empty;
        
        public decimal TotalMarks { get; set; }
        
        public decimal ObtainedMarks { get; set; }
        
        public decimal Percentage { get; set; }
        
        [MaxLength(10)]
        public string? OverallGrade { get; set; }
        
        public decimal? CGPA { get; set; }
        
        public int? Rank { get; set; }
        
        public int? TotalStudents { get; set; }
        
        [MaxLength(20)]
        public string Status { get; set; } = "Pass"; // Pass, Fail
        
        [MaxLength(1000)]
        public string? Remarks { get; set; }
        
        [MaxLength(1000)]
        public string? TeacherComments { get; set; }
        
        public DateTime? IssueDate { get; set; }
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
        
        [ForeignKey("StudentId")]
        public virtual Student? Student { get; set; }
        
        [ForeignKey("ExamId")]
        public virtual Exam? Exam { get; set; }
    }

    // ========== ADMISSION TEST ==========
    public class AdmissionTest : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public Guid AdmissionId { get; set; }
        
        [Required]
        [MaxLength(200)]
        public string TestName { get; set; } = string.Empty;
        
        [Required]
        public DateTime TestDate { get; set; }
        
        public TimeSpan? TestTime { get; set; }
        
        [MaxLength(500)]
        public string? Venue { get; set; }
        
        public decimal? MaxMarks { get; set; }
        
        public decimal? ObtainedMarks { get; set; }
        
        public decimal? Percentage { get; set; }
        
        [MaxLength(10)]
        public string? Grade { get; set; }
        
        [MaxLength(20)]
        public string Status { get; set; } = "Scheduled"; // Scheduled, Completed, Cancelled, Absent
        
        [MaxLength(1000)]
        public string? Remarks { get; set; }
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
        
        [ForeignKey("AdmissionId")]
        public virtual Admission? Admission { get; set; }
    }

    // ========== INTERVIEW ==========
    public class Interview : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public Guid AdmissionId { get; set; }
        
        [Required]
        public DateTime InterviewDate { get; set; }
        
        public TimeSpan? InterviewTime { get; set; }
        
        [MaxLength(500)]
        public string? Venue { get; set; }
        
        [MaxLength(200)]
        public string? InterviewerName { get; set; }
        
        public Guid? InterviewerId { get; set; }
        
        public int? Rating { get; set; } // 1-10
        
        [MaxLength(20)]
        public string Status { get; set; } = "Scheduled"; // Scheduled, Completed, Cancelled, Rescheduled
        
        [MaxLength(2000)]
        public string? Comments { get; set; }
        
        [MaxLength(1000)]
        public string? Strengths { get; set; }
        
        [MaxLength(1000)]
        public string? Weaknesses { get; set; }
        
        [MaxLength(20)]
        public string? Recommendation { get; set; } // Strongly Recommended, Recommended, Not Recommended
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
        
        [ForeignKey("AdmissionId")]
        public virtual Admission? Admission { get; set; }
    }
}
