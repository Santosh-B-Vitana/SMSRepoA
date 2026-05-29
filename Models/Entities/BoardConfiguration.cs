using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    /// <summary>
    /// Master configuration for a curriculum board (CBSE, ICSE, IB, State boards…).
    /// System boards are pre-seeded and read-only. Schools can create custom board variants.
    /// </summary>
    public class BoardConfiguration : BaseEntity
    {
        /// <summary>
        /// For system boards this is NULL (not school-specific).
        /// For custom/cloned boards created by a school, this is set to their SchoolId.
        /// </summary>
        public Guid? SchoolId { get; set; }

        /// <summary>Display name: "CBSE", "ICSE", "Maharashtra State Board", etc.</summary>
        [Required]
        [MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        /// <summary>Short identifier used in code: "CBSE", "ICSE", "IB", "CAIE", "STATE-MH"…</summary>
        [Required]
        [MaxLength(30)]
        public string Code { get; set; } = string.Empty;

        [MaxLength(300)]
        public string? Description { get; set; }

        /// <summary>National | State | International</summary>
        [MaxLength(30)]
        public string BoardLevel { get; set; } = "National";

        /// <summary>ISO 3166-2 state code for state boards: KA, TN, MH, GJ, RJ, UP, MP, WB, AP, TS, KL, BR</summary>
        [MaxLength(5)]
        public string? StateCode { get; set; }

        // ── Passing Criteria ─────────────────────────────────────────────────
        /// <summary>Minimum percentage to pass theory component per subject.</summary>
        public decimal TheoryPassingPercentage { get; set; } = 33;

        /// <summary>Minimum percentage to pass practical component per subject.</summary>
        public decimal PracticalPassingPercentage { get; set; } = 33;

        /// <summary>Minimum overall percentage (theory+practical combined) to pass a subject.</summary>
        public decimal OverallPassingPercentage { get; set; } = 33;

        // ── Grading ──────────────────────────────────────────────────────────
        /// <summary>
        /// JSON array of GradeScaleEntry objects:
        /// [{ "grade": "A1", "minPercentage": 91, "maxPercentage": 100, "gradePoint": 10.0,
        ///    "description": "Outstanding", "isPassing": true }]
        /// </summary>
        public string GradingScaleJson { get; set; } = "[]";

        /// <summary>Max grade point (e.g. 10 for CBSE, 7 for IB).</summary>
        public decimal MaxGradePoint { get; set; } = 10;

        /// <summary>Grading system label: "A1-E2", "1-7", "A*-U", "O-F", "Percentage"</summary>
        [MaxLength(30)]
        public string GradingSystem { get; set; } = "A1-E2";

        // ── Exam Structure ────────────────────────────────────────────────────
        /// <summary>
        /// JSON array of BoardExamStructureEntry objects per term:
        /// [{ "code": "PT1", "name": "Periodic Test 1", "weightagePercent": 10,
        ///    "term": 1, "isInternal": true, "defaultMaxMarks": 40 }]
        /// </summary>
        public string ExamStructureJson { get; set; } = "[]";

        // ── Meta ──────────────────────────────────────────────────────────────
        /// <summary>True for CBSE/ICSE/IB – cannot be edited by schools. False for state/custom boards.</summary>
        public bool IsSystemBoard { get; set; } = false;

        /// <summary>Whether schools can override grading scale and passing criteria.</summary>
        public bool IsCustomizable { get; set; } = true;

        public bool IsActive { get; set; } = true;

        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
    }

    /// <summary>
    /// Records which BoardConfiguration a school is using for a given academic year.
    /// Schools can also override the grading scale and passing criteria independently.
    /// </summary>
    public class SchoolBoardConfig : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        public Guid BoardConfigurationId { get; set; }

        /// <summary>Academic year this config applies to, e.g. "2025-26". NULL = applies to all years.</summary>
        [MaxLength(10)]
        public string? AcademicYear { get; set; }

        // ── School-specific overrides (null = use board defaults) ─────────────

        public decimal? CustomOverallPassingPercentage { get; set; }
        public decimal? CustomTheoryPassingPercentage { get; set; }
        public decimal? CustomPracticalPassingPercentage { get; set; }

        /// <summary>Override grading scale (same JSON format as BoardConfiguration.GradingScaleJson).</summary>
        public string? CustomGradingScaleJson { get; set; }

        /// <summary>Override exam structure (same JSON format as BoardConfiguration.ExamStructureJson).</summary>
        public string? CustomExamStructureJson { get; set; }

        public bool IsActive { get; set; } = true;

        /// <summary>True if this is the school's primary/default board.</summary>
        public bool IsDefault { get; set; } = false;

        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }

        [ForeignKey("BoardConfigurationId")]
        public virtual BoardConfiguration? BoardConfiguration { get; set; }
    }
}
