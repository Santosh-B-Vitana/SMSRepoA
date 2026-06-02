using System;
using System.Collections.Generic;

namespace SmsApi.Models.DTOs
{
    // ==================== EXAM SUMMARY REPORT ====================
    public class ResultSummaryReportResponse
    {
        public decimal OverallPassPercentage { get; set; }
        public decimal OverallAverageMarks { get; set; }
        public int TotalStudentsAppeared { get; set; }
        public int TotalStudentsPassed { get; set; }
        public int TotalStudentsFailed { get; set; }
        public decimal GradeAPercentage { get; set; }
        public decimal GradeBPercentage { get; set; }
        public decimal GradeCPercentage { get; set; }
        public decimal GradeDPercentage { get; set; }
        public decimal GradeEPercentage { get; set; }
        /// <summary>
        /// Board-specific grade distribution. Key = grade label (e.g. "A1", "O", "7", "A*"),
        /// Value = percentage of students who received that grade.
        /// Use this for non-CBSE boards where A/B/C/D/E buckets don't apply.
        /// </summary>
        public Dictionary<string, decimal> GradeBreakdown { get; set; } = new();
        public List<ExamSummary> ExamSummaries { get; set; } = new();
        public DateTime GeneratedAt { get; set; }
    }

    public class ExamSummary
    {
        public Guid ExamId { get; set; }
        public string ExamName { get; set; } = string.Empty;
        public string ExamCode { get; set; } = string.Empty;
        public DateTime ExamDate { get; set; }
        public int TotalQuestions { get; set; }
        public decimal PassPercentage { get; set; }
        public decimal FailPercentage { get; set; }
        public decimal AverageMarks { get; set; }
        public decimal HighestMarks { get; set; }
        public decimal LowestMarks { get; set; }
        public int TotalStudents { get; set; }
    }

    // ==================== EXAM PERFORMANCE REPORT ====================
    public class ExamPerformanceReportResponse
    {
        public string ExamName { get; set; } = string.Empty;
        public string ExamCode { get; set; } = string.Empty;
        public DateTime ExamDate { get; set; }
        public int TotalMarks { get; set; }
        public int PassMarks { get; set; }
        public decimal AverageMarks { get; set; }
        public decimal PassPercentage { get; set; }
        public List<QuestionPerformance> QuestionWisePerformance { get; set; } = new();
        public List<SectionPerformance> SectionWisePerformance { get; set; } = new();
        public ClassPerformanceSummary ClassPerformance { get; set; } = new();
    }

    public class QuestionPerformance
    {
        public int QuestionNumber { get; set; }
        public string QuestionText { get; set; } = string.Empty;
        public int MaxMarks { get; set; }
        public decimal AverageMarksObtained { get; set; }
        public decimal PercentageAttempted { get; set; }
        public decimal DifficultyLevel { get; set; } // 0-1, where 0 is easy, 1 is hard
        public decimal AverageTimeSpent { get; set; } // in seconds
    }

    public class SectionPerformance
    {
        public string SectionName { get; set; } = string.Empty;
        public int TotalQuestions { get; set; }
        public int MaxMarks { get; set; }
        public decimal AverageMarksObtained { get; set; }
        public decimal PassPercentage { get; set; }
    }

    public class ClassPerformanceSummary
    {
        public string ClassName { get; set; } = string.Empty;
        public int TotalStudents { get; set; }
        public int PassedStudents { get; set; }
        public int FailedStudents { get; set; }
        public decimal ClassAverage { get; set; }
        public decimal ClassPassPercentage { get; set; }
    }

    // ==================== STUDENT WISE MARKS REPORT ====================
    public class StudentWiseMarksReportResponse
    {
        public string ExamName { get; set; } = string.Empty;
        public DateTime ExamDate { get; set; }
        public List<StudentMarkDetail> StudentMarks { get; set; } = new();
        public int TotalStudents { get; set; }
    }

    public class StudentMarkDetail
    {
        public Guid StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string RollNumber { get; set; } = string.Empty;
        public string ClassName { get; set; } = string.Empty;
        public decimal MarksObtained { get; set; }
        public decimal TotalMarks { get; set; }
        public decimal Percentage { get; set; }
        public string Grade { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty; // Pass/Fail
        public Dictionary<string, decimal> SubjectWiseMarks { get; set; } = new();
    }

    // ==================== CLASS ANALYSIS REPORT ====================
    public class ClassAnalysisReportResponse
    {
        public List<ClassComparisonMetric> ClassMetrics { get; set; } = new();
        public string AcademicYear { get; set; } = string.Empty;
        public DateTime ReportGeneratedDate { get; set; }
    }

    public class ClassComparisonMetric
    {
        public Guid ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public int TotalStudents { get; set; }
        public int PassedStudents { get; set; }
        public int FailedStudents { get; set; }
        public decimal ClassAverage { get; set; }
        public decimal PassPercentage { get; set; }
        public decimal FailPercentage { get; set; }
        public decimal HighestMarks { get; set; }
        public decimal LowestMarks { get; set; }
        public string PerformerName { get; set; } = string.Empty;
        public decimal PerformerMarks { get; set; }
        public string RankerRank { get; set; } = string.Empty; // Class rank
    }

    // ==================== GRADE DISTRIBUTION REPORT ====================
    public class GradeDistributionReportResponse
    {
        public string ExamName { get; set; } = string.Empty;
        public DateTime ExamDate { get; set; }
        public List<GradeDistribution> GradeDistributions { get; set; } = new();
        public int TotalStudents { get; set; }
    }

    public class GradeDistribution
    {
        public string GradeSymbol { get; set; } = string.Empty; // A, B, C, D, E
        public string GradeRange { get; set; } = string.Empty; // 90-100, 80-89, etc
        public int StudentCount { get; set; }
        public decimal Percentage { get; set; }
    }

    // ==================== SUBJECT PERFORMANCE REPORT ====================
    public class SubjectPerformanceReportResponse
    {
        public string ExamName { get; set; } = string.Empty;
        public DateTime ExamDate { get; set; }
        public List<SubjectPerformanceMetric> SubjectMetrics { get; set; } = new();
        public DateTime ReportGeneratedDate { get; set; }
    }

    public class SubjectPerformanceMetric
    {
        public Guid SubjectId { get; set; }
        public string SubjectName { get; set; } = string.Empty;
        public int TotalMarks { get; set; }
        public int PassMarks { get; set; }
        public decimal AverageMarks { get; set; }
        public decimal PassPercentage { get; set; }
        public decimal FailPercentage { get; set; }
        public decimal HighestMarks { get; set; }
        public decimal LowestMarks { get; set; }
        public int StudentsPassed { get; set; }
        public int StudentsFailed { get; set; }
        public int TotalStudents { get; set; }
        public List<ClassSubjectPerformance> ClassWisePerformance { get; set; } = new();
    }

    public class ClassSubjectPerformance
    {
        public string ClassName { get; set; } = string.Empty;
        public decimal ClassAverage { get; set; }
        public int ClassStudentsCount { get; set; }
    }

    // ==================== GENERIC REPORT FILTER ====================
    public class ExamReportFilterRequest
    {
        public Guid? ExamId { get; set; }
        public Guid? ClassId { get; set; }
        public Guid? SubjectId { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public string AcademicYear { get; set; } = string.Empty;
    }

    // ==================== REPORT API RESPONSE WRAPPER ====================
    public class ReportApiResponse<T>
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public T? Data { get; set; }
        public DateTime GeneratedAt { get; set; }
    }
}
