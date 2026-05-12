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

        // Optional link to a structured ExamSetup (new system)
        public Guid? ExamSetupId { get; set; }
    }

    // ========== EXAM SETUP (structured multi-subject exam) ==========

    public class ExamSetup : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required, MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        public Guid? ExamTypeId { get; set; }

        public bool IsCustomType { get; set; }

        [MaxLength(100)]
        public string? CustomTypeName { get; set; }

        [Required]
        public Guid ClassId { get; set; }

        public Guid? SectionId { get; set; }

        public Guid? BoardConfigurationId { get; set; }

        [Required, MaxLength(20)]
        public string AcademicYear { get; set; } = string.Empty;

        /// <summary>0 = Annual, 1 = Term 1, 2 = Term 2, 3 = Term 3</summary>
        public int Term { get; set; }

        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }

        /// <summary>draft | scheduled | ongoing | marks_entry | finalized | published</summary>
        [Required, MaxLength(30)]
        public string Status { get; set; } = "draft";

        public DateTime? PublishedAt { get; set; }
        public Guid? PublishedByStaffId { get; set; }

        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }

        [ForeignKey("ClassId")]
        public virtual Class? ClassRef { get; set; }

        [ForeignKey("SectionId")]
        public virtual Section? SectionRef { get; set; }

        [ForeignKey("ExamTypeId")]
        public virtual ExamType? ExamTypeRef { get; set; }

        [ForeignKey("BoardConfigurationId")]
        public virtual BoardConfiguration? BoardConfig { get; set; }

        public virtual ICollection<ExamSetupSubject> Subjects { get; set; } = new List<ExamSetupSubject>();
    }

    public class ExamSetupSubject : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        public Guid ExamSetupId { get; set; }

        [Required]
        public Guid SubjectId { get; set; }

        public bool IsElective { get; set; }

        [Column(TypeName = "decimal(6,2)")]
        public decimal MaxTheoryMarks { get; set; }
        [Column(TypeName = "decimal(6,2)")]
        public decimal MaxPracticalMarks { get; set; }
        [Column(TypeName = "decimal(6,2)")]
        public decimal MaxInternalMarks { get; set; }
        [Column(TypeName = "decimal(6,2)")]
        public decimal MaxTotalMarks { get; set; }
        [Column(TypeName = "decimal(6,2)")]
        public decimal PassingMarks { get; set; }

        public Guid? AssignedStaffId { get; set; }

        public DateTime? ExamDate { get; set; }

        [MaxLength(10)]
        public string? StartTime { get; set; }

        [MaxLength(10)]
        public string? EndTime { get; set; }

        [MaxLength(100)]
        public string? Venue { get; set; }

        public int SubjectOrder { get; set; }

        /// <summary>pending | marks_entry | locked</summary>
        [Required, MaxLength(20)]
        public string Status { get; set; } = "pending";

        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }

        [ForeignKey("ExamSetupId")]
        public virtual ExamSetup? ExamSetup { get; set; }

        [ForeignKey("SubjectId")]
        public virtual Subject? Subject { get; set; }

        [ForeignKey("AssignedStaffId")]
        public virtual Staff? AssignedStaff { get; set; }

        public virtual ICollection<ExamMarksEntry> MarksEntries { get; set; } = new List<ExamMarksEntry>();
    }

    public class ExamMarksEntry : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        public Guid ExamSetupId { get; set; }

        [Required]
        public Guid ExamSetupSubjectId { get; set; }

        [Required]
        public Guid StudentId { get; set; }

        [Column(TypeName = "decimal(6,2)")]
        public decimal? TheoryMarks { get; set; }
        [Column(TypeName = "decimal(6,2)")]
        public decimal? PracticalMarks { get; set; }
        [Column(TypeName = "decimal(6,2)")]
        public decimal? InternalMarks { get; set; }

        /// <summary>Sum of theory + practical + internal. Non-nullable for aggregation.</summary>
        [Column(TypeName = "decimal(6,2)")]
        public decimal ObtainedMarks { get; set; }

        public bool IsAbsent { get; set; }

        [MaxLength(10)]
        public string? Grade { get; set; }

        [Column(TypeName = "decimal(4,2)")]
        public decimal? GradePoint { get; set; }
        [Column(TypeName = "decimal(5,2)")]
        public decimal? Percentage { get; set; }

        public bool IsPass { get; set; }

        [MaxLength(500)]
        public string? Remarks { get; set; }

        /// <summary>draft | submitted | published</summary>
        [Required, MaxLength(20)]
        public string Status { get; set; } = "draft";

        public Guid? EnteredByStaffId { get; set; }
        public DateTime? EnteredAt { get; set; }

        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }

        [ForeignKey("ExamSetupId")]
        public virtual ExamSetup? ExamSetup { get; set; }

        [ForeignKey("EnteredByStaffId")]
        public virtual Staff? EnteredByStaff { get; set; }

        [ForeignKey("ExamSetupSubjectId")]
        public virtual ExamSetupSubject? ExamSetupSubject { get; set; }

        [ForeignKey("StudentId")]
        public virtual Student? Student { get; set; }
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

    // ─────────────────────────────────────────────────────────────────────────
    // CoScholasticArea — Activity domains assessed co-scholastically.
    // CBSE mandates assessment in Work Education, Art Education, Health & PE.
    // ─────────────────────────────────────────────────────────────────────────
    public class CoScholasticArea : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty; // "Work Education", "Art Education", "Health & PE"

        [MaxLength(20)]
        public string? Code { get; set; }

        [MaxLength(500)]
        public string? Description { get; set; }

        /// <summary>Grade scale: "A1-E2" for CBSE or "A-E" for state boards</summary>
        [MaxLength(50)]
        public string GradeScale { get; set; } = "A-E"; // A, B, C, D, E

        public int DisplayOrder { get; set; } = 0;

        public bool IsActive { get; set; } = true;

        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CoScholasticAssessment — Per-student, per-term assessment in a CoScholasticArea.
    // ─────────────────────────────────────────────────────────────────────────
    public class CoScholasticAssessment : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        public Guid StudentId { get; set; }

        [Required]
        public Guid CoScholasticAreaId { get; set; }

        /// <summary>FK to Exam if tied to a specific exam term, otherwise null</summary>
        public Guid? ExamId { get; set; }

        [Required]
        [MaxLength(20)]
        public string AcademicYear { get; set; } = string.Empty;

        /// <summary>Term: 1 = Term 1 / FA1+FA2, 2 = Term 2 / SA1+SA2, 0 = Annual</summary>
        public int Term { get; set; } = 0;

        /// <summary>Grade awarded: A, B, C, D, E  (or A1–E2 for CBSE)</summary>
        [Required]
        [MaxLength(5)]
        public string Grade { get; set; } = string.Empty;

        [MaxLength(1000)]
        public string? Remarks { get; set; }

        /// <summary>Staff who assessed the student</summary>
        public Guid? AssessedByStaffId { get; set; }

        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }

        [ForeignKey("StudentId")]
        public virtual Student? Student { get; set; }

        [ForeignKey("CoScholasticAreaId")]
        public virtual CoScholasticArea? CoScholasticArea { get; set; }

        [ForeignKey("ExamId")]
        public virtual Exam? Exam { get; set; }
    }
}
