using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SmsApi.Models.DTOs
{
    // ═══════════════════════════════════════════════════════════════════════════
    // Constants
    // ═══════════════════════════════════════════════════════════════════════════
    public static class ReportCardDocumentConstants
    {
        public static readonly IReadOnlyList<string> BoardTypes = new[]
        {
            "CBSE", "ICSE", "ISC", "StateBoard", "IGCSE", "IB", "Custom"
        };

        public static readonly IReadOnlyList<string> TemplateStyles = new[]
        {
            "CBSE_Classic",      // Traditional CBSE layout — maroon & navy
            "CBSE_Modern",       // Clean CBSE with color bands — blue gradient
            "ICSE_Standard",     // ICSE/ISC style — formal dark green
            "StateBoard_Elite",  // State board style — saffron & tricolor motif
            "Modern_Premium"     // Contemporary minimalist — used by top CBSE/IGCSE schools
        };

        public static readonly IReadOnlyList<string> DownloadFormats = new[]
        {
            "PDF", "Excel", "HTML", "CSV"
        };

        public static readonly IReadOnlyList<string> DocumentTypes = new[]
        {
            "ReportCard", "BonafideCertificate", "TransferCertificate",
            "CharacterCertificate", "LeavingCertificate", "MeritCertificate",
            "ParticipationCertificate", "AchievementCertificate",
            "StudentIDCard", "StaffIDCard"
        };

        public static readonly IReadOnlyList<string> Orientations = new[]
        {
            "Portrait", "Landscape"
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Subject marks for a report card row
    // ═══════════════════════════════════════════════════════════════════════════
    public class ReportCardSubjectDto
    {
        public string SubjectName { get; set; } = string.Empty;
        public string SubjectCode { get; set; } = string.Empty;
        public string? SubjectType { get; set; }   // Core, Elective, Language, CoScholastic

        // Term 1
        public decimal? T1TheoryMax { get; set; }
        public decimal? T1TheoryObtained { get; set; }
        public decimal? T1PracticalMax { get; set; }
        public decimal? T1PracticalObtained { get; set; }
        public decimal? T1InternalMax { get; set; }
        public decimal? T1InternalObtained { get; set; }
        public string? T1Grade { get; set; }
        public decimal? T1GradePoint { get; set; }

        // Term 2
        public decimal? T2TheoryMax { get; set; }
        public decimal? T2TheoryObtained { get; set; }
        public decimal? T2PracticalMax { get; set; }
        public decimal? T2PracticalObtained { get; set; }
        public decimal? T2InternalMax { get; set; }
        public decimal? T2InternalObtained { get; set; }
        public string? T2Grade { get; set; }
        public decimal? T2GradePoint { get; set; }

        // Annual / Combined
        public decimal? AnnualMax { get; set; }
        public decimal? AnnualObtained { get; set; }
        public decimal? AnnualPercentage { get; set; }
        public string? FinalGrade { get; set; }
        public decimal? FinalGradePoint { get; set; }
        public bool IsPass { get; set; } = true;
        public string? Remarks { get; set; }
    }

    // Co-Scholastic assessment
    public class CoScholasticItemDto
    {
        public string Area { get; set; } = string.Empty;
        public string SubArea { get; set; } = string.Empty;
        public string? T1Grade { get; set; }
        public string? T2Grade { get; set; }
        public string? Remarks { get; set; }
    }

    // Attendance summary
    public class AttendanceSummaryDto
    {
        public int TotalWorkingDays { get; set; }
        public int DaysPresent { get; set; }
        public int DaysAbsent { get; set; }
        public decimal AttendancePercentage { get; set; }
        public string? T1WorkingDays { get; set; }
        public string? T1DaysPresent { get; set; }
        public string? T2WorkingDays { get; set; }
        public string? T2DaysPresent { get; set; }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Report Card Document — full data model
    // ═══════════════════════════════════════════════════════════════════════════
    public class ReportCardDocumentDto
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid StudentId { get; set; }

        // School info
        public string SchoolName { get; set; } = string.Empty;
        public string? SchoolAddress { get; set; }
        public string? SchoolPhone { get; set; }
        public string? SchoolEmail { get; set; }
        public string? SchoolLogoUrl { get; set; }
        public string? SchoolAffiliationNo { get; set; }
        public string? SchoolRegistrationNo { get; set; }

        // Student info
        public string StudentName { get; set; } = string.Empty;
        public string? AdmissionNo { get; set; }
        public string? RollNumber { get; set; }
        public string? DateOfBirth { get; set; }
        public string? ClassName { get; set; }
        public string? SectionName { get; set; }
        public string? FatherName { get; set; }
        public string? MotherName { get; set; }
        public string? StudentPhotoUrl { get; set; }
        public string? HouseColor { get; set; }

        // Academic period
        public string AcademicYear { get; set; } = string.Empty;
        public string Term { get; set; } = string.Empty;
        public string? ExamName { get; set; }

        // Board
        public string BoardType { get; set; } = "CBSE";
        public string? BoardAffiliationNo { get; set; }

        // Template
        public string TemplateStyle { get; set; } = "CBSE_Classic";
        public string Orientation { get; set; } = "Portrait";

        // Marks & grades
        public List<ReportCardSubjectDto> Subjects { get; set; } = new();
        public List<CoScholasticItemDto> CoScholasticItems { get; set; } = new();
        public AttendanceSummaryDto? Attendance { get; set; }

        // Result summary
        public decimal TotalMaxMarks { get; set; }
        public decimal TotalObtainedMarks { get; set; }
        public decimal Percentage { get; set; }
        public string? OverallGrade { get; set; }
        public decimal? CGPA { get; set; }
        public int? ClassRank { get; set; }
        public int? TotalStudentsInClass { get; set; }
        public string ResultStatus { get; set; } = "Pass";  // Pass / Fail / Promoted / Detained

        // Remarks & signatures
        public string? TeacherRemarks { get; set; }
        public string? PrincipalRemarks { get; set; }
        public string? ClassTeacherName { get; set; }
        public string? PrincipalName { get; set; }
        public string? ParentSignatureLabel { get; set; }

        // Metadata
        public DateTime? IssueDate { get; set; }
        public bool IsEdited { get; set; }
        public string? EditRemarks { get; set; }
        public DateTime? LastEditedAt { get; set; }
        public string? LastEditedBy { get; set; }
        public string Status { get; set; } = "Draft";  // Draft, Generated, Distributed
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Request: Generate report card for one student
    // ═══════════════════════════════════════════════════════════════════════════
    public class GenerateReportCardRequest
    {
        [Required]
        public Guid StudentId { get; set; }

        public Guid? ExamSetupId { get; set; }

        [Required]
        [MaxLength(50)]
        public string AcademicYear { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Term { get; set; } = string.Empty;

        /// <summary>CBSE, ICSE, ISC, StateBoard, IGCSE, IB, Custom</summary>
        [MaxLength(30)]
        public string BoardType { get; set; } = "CBSE";

        /// <summary>CBSE_Classic | CBSE_Modern | ICSE_Standard | StateBoard_Elite | Modern_Premium</summary>
        [MaxLength(50)]
        public string TemplateStyle { get; set; } = "CBSE_Classic";

        public string Orientation { get; set; } = "Portrait";

        /// <summary>Override school logo URL (optional)</summary>
        public string? CustomLogoUrl { get; set; }

        /// <summary>Include co-scholastic data</summary>
        public bool IncludeCoScholastic { get; set; } = true;

        /// <summary>Include attendance summary</summary>
        public bool IncludeAttendance { get; set; } = true;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Request: Bulk generate for entire class/section
    // ═══════════════════════════════════════════════════════════════════════════
    public class BulkGenerateReportCardsRequest
    {
        public Guid? ClassId { get; set; }
        public Guid? SectionId { get; set; }
        public List<Guid>? StudentIds { get; set; }

        [Required]
        public string AcademicYear { get; set; } = string.Empty;

        [Required]
        public string Term { get; set; } = string.Empty;

        public string BoardType { get; set; } = "CBSE";
        public string TemplateStyle { get; set; } = "CBSE_Classic";
        public string Orientation { get; set; } = "Portrait";
        public bool IncludeCoScholastic { get; set; } = true;
        public bool IncludeAttendance { get; set; } = true;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Request: Edit / correct a generated report card
    // ═══════════════════════════════════════════════════════════════════════════
    public class EditReportCardRequest
    {
        /// <summary>Corrected subject marks (only include subjects that need correction)</summary>
        public List<ReportCardSubjectDto>? CorrectedSubjects { get; set; }

        public string? TeacherRemarks { get; set; }
        public string? PrincipalRemarks { get; set; }
        public decimal? OverridePercentage { get; set; }
        public string? OverrideOverallGrade { get; set; }
        public decimal? OverrideCGPA { get; set; }
        public string? OverrideResultStatus { get; set; }

        [Required]
        [MaxLength(1000)]
        public string EditRemarks { get; set; } = string.Empty;  // Reason for correction — required

        /// <summary>Change template style if needed</summary>
        public string? TemplateStyle { get; set; }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Request: Download document
    // ═══════════════════════════════════════════════════════════════════════════
    public class DownloadDocumentRequest
    {
        /// <summary>PDF | Excel | HTML | CSV</summary>
        public string Format { get; set; } = "PDF";
        public string? TemplateStyle { get; set; }
        public string? Orientation { get; set; }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Response types
    // ═══════════════════════════════════════════════════════════════════════════
    public class ReportCardListResponse
    {
        public List<ReportCardDocumentDto> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    public class ReportCardStatsResponse
    {
        public int TotalGenerated { get; set; }
        public int TotalDistributed { get; set; }
        public int TotalDraft { get; set; }
        public int TotalEdited { get; set; }
        public int TotalPassed { get; set; }
        public int TotalFailed { get; set; }
        public decimal ClassAveragePercentage { get; set; }
        public decimal HighestPercentage { get; set; }
        public decimal LowestPercentage { get; set; }
        public Dictionary<string, int> ByBoardType { get; set; } = new();
        public Dictionary<string, int> ByGrade { get; set; } = new();
    }

    public class TemplatePreviewResponse
    {
        public string TemplateStyle { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string BoardCompatibility { get; set; } = string.Empty;
        public string PrimaryColor { get; set; } = string.Empty;
        public string PreviewImageUrl { get; set; } = string.Empty;   // placeholder for UI thumbnail
        public string SampleHtml { get; set; } = string.Empty;        // mini preview HTML
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Certificate edit DTO (extends existing cert system with edit tracking)
    // ═══════════════════════════════════════════════════════════════════════════
    public class EditCertificateRequest
    {
        public string? Title { get; set; }
        public string? Content { get; set; }
        public string? Metadata { get; set; }  // JSON with field overrides
        public DateTime? ValidUntil { get; set; }

        [Required]
        [MaxLength(500)]
        public string EditReason { get; set; } = string.Empty;
    }
}
