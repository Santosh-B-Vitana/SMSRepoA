using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    public class Exam : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        // ── Legacy string fields (kept for backward compat, new code uses FK columns) ──
        [MaxLength(50)]
        public string Class { get; set; } = string.Empty;
        
        [MaxLength(20)]
        public string? Section { get; set; }
        
        [MaxLength(100)]
        public string Subject { get; set; } = string.Empty;
        
        // ── Structured references (preferred) ────────────────────────────────
        /// <summary>FK to ExamType (Unit Test, Quarterly, Half-Yearly, Annual…)</summary>
        public Guid? ExamTypeId { get; set; }
        /// <summary>FK to Subject entity</summary>
        public Guid? SubjectId { get; set; }
        /// <summary>FK to SubjectType (Theory / Practical / Project)</summary>
        public Guid? SubjectTypeId { get; set; }
        /// <summary>FK to Class entity</summary>
        public Guid? ClassId { get; set; }
        /// <summary>FK to Section entity (null = entire class)</summary>
        public Guid? SectionId { get; set; }
        /// <summary>FK to Staff acting as invigilator</summary>
        public Guid? InvigilatorId { get; set; }
        /// <summary>FK to BoardConfiguration for board-specific grading</summary>
        public Guid? BoardConfigurationId { get; set; }

        // ── Scheduling ────────────────────────────────────────────────────────
        [Required]
        public DateTime ExamDate { get; set; }

        /// <summary>Exam start time e.g. "09:00"</summary>
        [MaxLength(10)]
        public string? StartTime { get; set; }

        /// <summary>Exam end time e.g. "12:00"</summary>
        [MaxLength(10)]
        public string? EndTime { get; set; }

        /// <summary>Duration in minutes</summary>
        public int? Duration { get; set; }

        [MaxLength(100)]
        public string? Venue { get; set; }

        // ── Marks ─────────────────────────────────────────────────────────────
        public int TotalMarks { get; set; }
        public int PassingMarks { get; set; }

        // ── Academic context ──────────────────────────────────────────────────
        /// <summary>Academic year e.g. "2025-26"</summary>
        [MaxLength(20)]
        public string? AcademicYear { get; set; }

        /// <summary>0 = full year | 1 = Term 1 | 2 = Term 2</summary>
        public int Term { get; set; } = 0;

        // ── Metadata ──────────────────────────────────────────────────────────
        public string? Description { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "scheduled";

        // ── Navigation properties ─────────────────────────────────────────────
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
        [ForeignKey("ExamTypeId")]
        public virtual ExamType? ExamTypeRef { get; set; }
        [ForeignKey("SubjectId")]
        public virtual Subject? SubjectRef { get; set; }
        [ForeignKey("SubjectTypeId")]
        public virtual SubjectType? SubjectTypeRef { get; set; }
        [ForeignKey("ClassId")]
        public virtual Class? ClassRef { get; set; }
        [ForeignKey("SectionId")]
        public virtual Section? SectionRef { get; set; }
        [ForeignKey("InvigilatorId")]
        public virtual Staff? Invigilator { get; set; }
        [ForeignKey("BoardConfigurationId")]
        public virtual BoardConfiguration? BoardConfig { get; set; }
    }

    /// <summary>
    /// DEPRECATED — use <see cref="Result"/> instead. <c>Result</c> has a non-nullable
    /// <c>SubjectId</c> FK and a cleaner marks model. <c>ExamResult</c> is kept to avoid
    /// breaking existing queries; new code must write to and read from <c>Results</c>.
    /// </summary>
    [Obsolete("Use Result (DbSet: Results) instead. ExamResult will be removed in a future migration.")]
    public class ExamResult : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public Guid ExamId { get; set; }
        
        [Required]
        public Guid StudentId { get; set; }

        /// <summary>FK to Subject entity (nullable for backward compat)</summary>
        public Guid? SubjectId { get; set; }
        
        /// <summary>Legacy string field kept for backward compat</summary>
        [MaxLength(100)]
        public string Subject { get; set; } = string.Empty;
        
        // ── Marks breakdown ───────────────────────────────────────────────────
        [Column(TypeName = "decimal(6,2)")]
        public decimal MarksObtained { get; set; }

        [Column(TypeName = "decimal(6,2)")]
        public decimal? TheoryMarks { get; set; }

        [Column(TypeName = "decimal(6,2)")]
        public decimal? PracticalMarks { get; set; }

        [Column(TypeName = "decimal(6,2)")]
        public decimal? InternalMarks { get; set; }
        
        public int TotalMarks { get; set; }
        
        [Column(TypeName = "decimal(5,2)")]
        public decimal Percentage { get; set; }
        
        [MaxLength(10)]
        public string? Grade { get; set; }

        /// <summary>Computed pass/fail based on passing marks or passing percentage</summary>
        public bool IsPass { get; set; } = false;

        /// <summary>True if the student was absent for this exam</summary>
        public bool IsAbsent { get; set; } = false;
        
        public string? Remarks { get; set; }

        // ── Navigation properties ─────────────────────────────────────────────
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
        
        [ForeignKey("ExamId")]
        public virtual Exam? Exam { get; set; }
        
        [ForeignKey("StudentId")]
        public virtual Student? Student { get; set; }

        [ForeignKey("SubjectId")]
        public virtual Subject? SubjectRef { get; set; }
    }
}

