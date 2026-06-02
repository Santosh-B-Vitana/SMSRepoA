using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    // ========== QUESTION BANK ==========
    public class QuestionBank : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        public Guid SubjectId { get; set; }

        /// <summary>MCQ / short / subjective / true_false</summary>
        [Required]
        [MaxLength(30)]
        public string QuestionType { get; set; } = "MCQ";

        [Required]
        public string QuestionText { get; set; } = string.Empty;

        /// <summary>JSON array of option strings (used for MCQ / true_false)</summary>
        public string? Options { get; set; }

        /// <summary>Correct answer text or option index (0-based) for MCQ</summary>
        public string? CorrectAnswer { get; set; }

        [Column(TypeName = "decimal(5,2)")]
        public decimal Marks { get; set; } = 1;

        [MaxLength(20)]
        public string? Difficulty { get; set; } = "medium"; // easy / medium / hard

        [MaxLength(500)]
        public string? Tags { get; set; }

        [MaxLength(500)]
        public string? Explanation { get; set; }

        public bool IsActive { get; set; } = true;

        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }

        [ForeignKey("SubjectId")]
        public virtual Subject? Subject { get; set; }
    }

    // ========== ONLINE EXAM ==========
    public class OnlineExam : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        public Guid? SubjectId { get; set; }

        public Guid? ClassId { get; set; }

        /// <summary>Duration in minutes</summary>
        public int DurationMinutes { get; set; } = 60;

        public DateTime? ScheduledStart { get; set; }

        public DateTime? ScheduledEnd { get; set; }

        [Column(TypeName = "decimal(8,2)")]
        public decimal TotalMarks { get; set; }

        [Column(TypeName = "decimal(8,2)")]
        public decimal PassingMarks { get; set; }

        public string? Instructions { get; set; }

        /// <summary>draft / published / active / completed / cancelled</summary>
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "draft";

        public bool ShuffleQuestions { get; set; } = false;

        public bool ShowResultImmediately { get; set; } = true;

        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }

        [ForeignKey("SubjectId")]
        public virtual Subject? Subject { get; set; }

        [ForeignKey("ClassId")]
        public virtual Class? Class { get; set; }

        public virtual ICollection<OnlineExamQuestion> Questions { get; set; } = new List<OnlineExamQuestion>();
        public virtual ICollection<StudentExamSession> Sessions { get; set; } = new List<StudentExamSession>();
    }

    // ========== ONLINE EXAM QUESTION (JUNCTION) ==========
    public class OnlineExamQuestion : BaseEntity
    {
        [Required]
        public Guid ExamId { get; set; }

        [Required]
        public Guid QuestionId { get; set; }

        public int QuestionOrder { get; set; }

        /// <summary>Override marks from question bank (null = use question bank marks)</summary>
        [Column(TypeName = "decimal(5,2)")]
        public decimal? MarksOverride { get; set; }

        [ForeignKey("ExamId")]
        public virtual OnlineExam? Exam { get; set; }

        [ForeignKey("QuestionId")]
        public virtual QuestionBank? Question { get; set; }
    }

    // ========== STUDENT EXAM SESSION ==========
    public class StudentExamSession : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        public Guid ExamId { get; set; }

        [Required]
        public Guid StudentId { get; set; }

        public DateTime? StartedAt { get; set; }

        public DateTime? SubmittedAt { get; set; }

        [Column(TypeName = "decimal(8,2)")]
        public decimal TotalMarks { get; set; }

        [Column(TypeName = "decimal(8,2)")]
        public decimal ObtainedMarks { get; set; }

        /// <summary>pending / in_progress / submitted / graded / absent</summary>
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "pending";

        [MaxLength(500)]
        public string? TeacherRemarks { get; set; }

        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }

        [ForeignKey("ExamId")]
        public virtual OnlineExam? Exam { get; set; }

        [ForeignKey("StudentId")]
        public virtual Student? Student { get; set; }

        public virtual ICollection<StudentExamResponse> Responses { get; set; } = new List<StudentExamResponse>();
    }

    // ========== STUDENT EXAM RESPONSE ==========
    public class StudentExamResponse : BaseEntity
    {
        [Required]
        public Guid SessionId { get; set; }

        [Required]
        public Guid QuestionId { get; set; }

        /// <summary>Student's answer text or MCQ option index</summary>
        public string? ResponseText { get; set; }

        public bool? IsCorrect { get; set; }

        [Column(TypeName = "decimal(5,2)")]
        public decimal MarksAwarded { get; set; } = 0;

        public Guid? GradedBy { get; set; }

        public DateTime? GradedAt { get; set; }

        [MaxLength(500)]
        public string? GraderRemarks { get; set; }

        [ForeignKey("SessionId")]
        public virtual StudentExamSession? Session { get; set; }

        [ForeignKey("QuestionId")]
        public virtual QuestionBank? Question { get; set; }
    }
}
