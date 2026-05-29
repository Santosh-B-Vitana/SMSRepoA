using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SmsApi.Models.DTOs
{
    // ── Value objects shared by request and response DTOs ─────────────────────

    /// <summary>One row in a board's grading scale.</summary>
    public class GradeScaleEntryDto
    {
        public string Grade { get; set; } = string.Empty;
        public decimal MinPercentage { get; set; }
        public decimal MaxPercentage { get; set; }
        public decimal GradePoint { get; set; }
        public string? Description { get; set; }
        public bool IsPassing { get; set; } = true;
    }

    /// <summary>One exam type in a board's standard exam structure.</summary>
    public class BoardExamStructureEntryDto
    {
        /// <summary>Short code used internally: PT1, PT2, HALF, ANNUAL, TERM1, TERM2…</summary>
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        /// <summary>Percent contribution to final grade (all entries must sum to 100).</summary>
        public int WeightagePercent { get; set; }
        /// <summary>1 = first term, 2 = second term, 0 = whole year.</summary>
        public int Term { get; set; }
        public bool IsInternal { get; set; }
        public int DefaultMaxMarks { get; set; } = 100;
    }

    // ── Board Configuration ───────────────────────────────────────────────────

    public class BoardConfigurationResponse
    {
        public Guid Id { get; set; }
        public Guid? SchoolId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string BoardLevel { get; set; } = string.Empty;   // National | State | International
        public string? StateCode { get; set; }
        public decimal TheoryPassingPercentage { get; set; }
        public decimal PracticalPassingPercentage { get; set; }
        public decimal OverallPassingPercentage { get; set; }
        public string GradingSystem { get; set; } = string.Empty;
        public decimal MaxGradePoint { get; set; }
        public List<GradeScaleEntryDto> GradingScale { get; set; } = new();
        public List<BoardExamStructureEntryDto> ExamStructure { get; set; } = new();
        public bool IsSystemBoard { get; set; }
        public bool IsCustomizable { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class BoardConfigurationListResponse
    {
        public List<BoardConfigurationResponse> Boards { get; set; } = new();
        public int Total { get; set; }
    }

    /// <summary>Used by super-admin to create a new board template (rarely needed).</summary>
    public class CreateBoardConfigurationRequest
    {
        [Required]
        [MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(30)]
        public string Code { get; set; } = string.Empty;

        [MaxLength(300)]
        public string? Description { get; set; }

        [MaxLength(30)]
        public string BoardLevel { get; set; } = "National";

        [MaxLength(5)]
        public string? StateCode { get; set; }

        public decimal TheoryPassingPercentage { get; set; } = 33;
        public decimal PracticalPassingPercentage { get; set; } = 33;
        public decimal OverallPassingPercentage { get; set; } = 33;

        [MaxLength(30)]
        public string GradingSystem { get; set; } = "A1-E2";
        public decimal MaxGradePoint { get; set; } = 10;

        public List<GradeScaleEntryDto> GradingScale { get; set; } = new();
        public List<BoardExamStructureEntryDto> ExamStructure { get; set; } = new();

        public bool IsCustomizable { get; set; } = true;
    }

    // ── School Board Config ───────────────────────────────────────────────────

    public class SchoolBoardConfigResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid BoardConfigurationId { get; set; }
        public string BoardName { get; set; } = string.Empty;
        public string BoardCode { get; set; } = string.Empty;
        public string BoardLevel { get; set; } = string.Empty;
        public string? AcademicYear { get; set; }
        // Effective values (custom overrides take precedence over board defaults)
        public decimal EffectiveOverallPassingPercentage { get; set; }
        public decimal EffectiveTheoryPassingPercentage { get; set; }
        public decimal EffectivePracticalPassingPercentage { get; set; }
        public List<GradeScaleEntryDto> EffectiveGradingScale { get; set; } = new();
        public List<BoardExamStructureEntryDto> EffectiveExamStructure { get; set; } = new();
        // Raw overrides
        public decimal? CustomOverallPassingPercentage { get; set; }
        public decimal? CustomTheoryPassingPercentage { get; set; }
        public decimal? CustomPracticalPassingPercentage { get; set; }
        public bool HasCustomGradingScale { get; set; }
        public bool HasCustomExamStructure { get; set; }
        public bool IsActive { get; set; }
        public bool IsDefault { get; set; }
        public BoardConfigurationResponse Board { get; set; } = new();
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    /// <summary>Admin sets/updates which board their school uses.</summary>
    public class SetSchoolBoardConfigRequest
    {
        [Required]
        public Guid BoardConfigurationId { get; set; }

        [MaxLength(10)]
        public string? AcademicYear { get; set; }

        // Optional overrides
        public decimal? CustomOverallPassingPercentage { get; set; }
        public decimal? CustomTheoryPassingPercentage { get; set; }
        public decimal? CustomPracticalPassingPercentage { get; set; }

        /// <summary>Provide a custom grading scale to override the board's default. Pass null to use board default.</summary>
        public List<GradeScaleEntryDto>? CustomGradingScale { get; set; }

        /// <summary>Provide a custom exam structure to override the board's default. Pass null to use board default.</summary>
        public List<BoardExamStructureEntryDto>? CustomExamStructure { get; set; }
    }

    /// <summary>Add a board to school's supported boards.</summary>
    public class AddSchoolBoardRequest
    {
        [Required]
        public Guid BoardConfigurationId { get; set; }

        /// <summary>Mark this board as the school default. First board added is always default.</summary>
        public bool SetAsDefault { get; set; } = false;
    }

    /// <summary>List of all boards configured for a school.</summary>
    public class SchoolBoardListResponse
    {
        public List<SchoolBoardConfigResponse> Boards { get; set; } = new();
        public int Total { get; set; }
    }

    // ── Board-aware Grade Result ───────────────────────────────────────────────

    public class BoardAwareGradeResult
    {
        public string Grade { get; set; } = string.Empty;
        public decimal GradePoint { get; set; }
        public bool IsPassing { get; set; }
        public string? Description { get; set; }
        public string BoardCode { get; set; } = string.Empty;
        public string GradingSystem { get; set; } = string.Empty;
    }
}
