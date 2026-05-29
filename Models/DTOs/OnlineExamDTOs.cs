using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SmsApi.Models.DTOs
{
    // ── Question Bank ────────────────────────────────────────────────────────────

    public class CreateQuestionRequest
    {
        [Required] public Guid SubjectId { get; set; }
        [Required] [MaxLength(30)] public string QuestionType { get; set; } = "MCQ";
        [Required] public string QuestionText { get; set; } = string.Empty;
        public List<string>? Options { get; set; }
        public string? CorrectAnswer { get; set; }
        [Range(0.01, 1000)] public decimal Marks { get; set; } = 1;
        [MaxLength(20)] public string? Difficulty { get; set; } = "medium";
        [MaxLength(500)] public string? Tags { get; set; }
        [MaxLength(500)] public string? Explanation { get; set; }
    }

    public class QuestionResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid SubjectId { get; set; }
        public string SubjectName { get; set; } = string.Empty;
        public string QuestionType { get; set; } = string.Empty;
        public string QuestionText { get; set; } = string.Empty;
        public List<string>? Options { get; set; }
        public string? CorrectAnswer { get; set; }
        public decimal Marks { get; set; }
        public string? Difficulty { get; set; }
        public string? Tags { get; set; }
        public string? Explanation { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    // ── Online Exam ──────────────────────────────────────────────────────────────

    public class CreateOnlineExamRequest
    {
        [Required] [MaxLength(200)] public string Title { get; set; } = string.Empty;
        public Guid? SubjectId { get; set; }
        public Guid? ClassId { get; set; }
        [Range(1, 600)] public int DurationMinutes { get; set; } = 60;
        public DateTime? ScheduledStart { get; set; }
        public DateTime? ScheduledEnd { get; set; }
        [Range(0.01, double.MaxValue)] public decimal TotalMarks { get; set; }
        [Range(0, double.MaxValue)] public decimal PassingMarks { get; set; }
        public string? Instructions { get; set; }
        public bool ShuffleQuestions { get; set; } = false;
        public bool ShowResultImmediately { get; set; } = true;
        public List<ExamQuestionItem>? Questions { get; set; }
    }

    public class ExamQuestionItem
    {
        [Required] public Guid QuestionId { get; set; }
        public int QuestionOrder { get; set; }
        public decimal? MarksOverride { get; set; }
    }

    public class OnlineExamResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string Title { get; set; } = string.Empty;
        public Guid? SubjectId { get; set; }
        public string? SubjectName { get; set; }
        public Guid? ClassId { get; set; }
        public string? ClassName { get; set; }
        public int DurationMinutes { get; set; }
        public DateTime? ScheduledStart { get; set; }
        public DateTime? ScheduledEnd { get; set; }
        public decimal TotalMarks { get; set; }
        public decimal PassingMarks { get; set; }
        public string? Instructions { get; set; }
        public string Status { get; set; } = "draft";
        public bool ShuffleQuestions { get; set; }
        public bool ShowResultImmediately { get; set; }
        public int TotalQuestions { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    // ── Student Exam Session ─────────────────────────────────────────────────────

    public class StartExamSessionRequest
    {
        [Required] public Guid ExamId { get; set; }
    }

    public class SubmitExamRequest
    {
        [Required] public Guid SessionId { get; set; }
        [Required] public List<SubmitAnswerItem> Answers { get; set; } = new();
    }

    public class SubmitAnswerItem
    {
        [Required] public Guid QuestionId { get; set; }
        public string? ResponseText { get; set; }
    }

    public class GradeResponseRequest
    {
        [Required] public Guid ResponseId { get; set; }
        [Required] [Range(0, double.MaxValue)] public decimal MarksAwarded { get; set; }
        [MaxLength(500)] public string? Remarks { get; set; }
    }

    public class ExamSessionResponse
    {
        public Guid Id { get; set; }
        public Guid ExamId { get; set; }
        public string ExamTitle { get; set; } = string.Empty;
        public Guid StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public DateTime? StartedAt { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public decimal TotalMarks { get; set; }
        public decimal ObtainedMarks { get; set; }
        public string Status { get; set; } = "pending";
        public string? TeacherRemarks { get; set; }
        public List<ExamResponseItem>? Responses { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class ExamResponseItem
    {
        public Guid Id { get; set; }
        public Guid QuestionId { get; set; }
        public string QuestionText { get; set; } = string.Empty;
        public string? ResponseText { get; set; }
        public bool? IsCorrect { get; set; }
        public decimal MarksAwarded { get; set; }
        public string? GraderRemarks { get; set; }
    }

    // ── Exam Stats ───────────────────────────────────────────────────────────────

    public class ExamStatsResponse
    {
        public Guid ExamId { get; set; }
        public string ExamTitle { get; set; } = string.Empty;
        public int TotalStudents { get; set; }
        public int Submitted { get; set; }
        public int Graded { get; set; }
        public int Passed { get; set; }
        public int Failed { get; set; }
        public decimal AverageMarks { get; set; }
        public decimal HighestMarks { get; set; }
        public decimal LowestMarks { get; set; }
    }
}
