using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    public class Class : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(20)]
        public string? Code { get; set; }

        /// <summary>Curriculum board: CBSE, ICSE, State, IB, Cambridge, etc.</summary>
        [MaxLength(50)]
        public string? Board { get; set; }

        /// <summary>FK to BoardConfiguration. Set when admin selects a board during class setup.</summary>
        public Guid? BoardConfigurationId { get; set; }

        public int? Capacity { get; set; }

        /// <summary>How many sections this class has (A, B, C...). Created automatically on class creation.</summary>
        public int NumberOfSections { get; set; } = 1;

        [MaxLength(20)]
        public string Status { get; set; } = "active";

        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }

        [ForeignKey("BoardConfigurationId")]
        public virtual BoardConfiguration? BoardConfig { get; set; }
    }

    public class Section : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        public Guid ClassId { get; set; }

        [Required]
        [MaxLength(50)]
        public string Name { get; set; } = string.Empty;

        public int? Capacity { get; set; }

        public int StudentsCount { get; set; } = 0;

        [MaxLength(20)]
        public string Status { get; set; } = "active";

        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }

        [ForeignKey("ClassId")]
        public virtual Class? Class { get; set; }
    }

    public class Subject : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Code { get; set; } = string.Empty;

        /// <summary>Legacy free-text type — use SubjectTypeId for structured data.</summary>
        [MaxLength(50)]
        public string? Type { get; set; }

        /// <summary>Primary subject type FK (Theory / Practical / Language / Project).</summary>
        public Guid? SubjectTypeId { get; set; }

        /// <summary>Overall default max marks.</summary>
        public int? MaxMarks { get; set; }

        /// <summary>Default theory component marks (Indian board split).</summary>
        public int? TheoryMaxMarks { get; set; }

        /// <summary>Default practical/lab component marks.</summary>
        public int? PracticalMaxMarks { get; set; }

        public int? PassMarks { get; set; }

        [MaxLength(20)]
        public string Status { get; set; } = "active";

        public string? Description { get; set; }

        /// <summary>Curriculum board this subject belongs to. Null = school-default (applies to all boards).</summary>
        public Guid? BoardConfigurationId { get; set; }

        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }

        [ForeignKey("SubjectTypeId")]
        public virtual SubjectType? SubjectTypeRef { get; set; }

        [ForeignKey("BoardConfigurationId")]
        public virtual BoardConfiguration? BoardConfig { get; set; }
    }

    public class ClassSubject : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        public Guid ClassId { get; set; }

        [Required]
        public Guid SubjectId { get; set; }

        /// <summary>Specifies Theory / Practical context for this class-subject assignment.</summary>
        public Guid? SubjectTypeId { get; set; }

        public Guid? TeacherId { get; set; }

        /// <summary>Academic year this assignment is valid for (e.g. "2025-26").</summary>
        [MaxLength(20)]
        public string? AcademicYear { get; set; }

        public int? MaxMarks { get; set; } = 100;

        /// <summary>Theory component max marks for this class-subject.</summary>
        public int? TheoryMaxMarks { get; set; }

        /// <summary>Practical component max marks for this class-subject.</summary>
        public int? PracticalMaxMarks { get; set; }

        public int? Credits { get; set; } = 4;

        public bool IsMandatory { get; set; } = true;

        [MaxLength(20)]
        public string Status { get; set; } = "active";

        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }

        [ForeignKey("ClassId")]
        public virtual Class? Class { get; set; }

        [ForeignKey("SubjectId")]
        public virtual Subject? Subject { get; set; }

        [ForeignKey("SubjectTypeId")]
        public virtual SubjectType? SubjectType { get; set; }

        [ForeignKey("TeacherId")]
        public virtual Staff? Teacher { get; set; }
    }

    public class TeacherAssignment : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        public Guid StaffId { get; set; }

        [Required]
        public Guid ClassId { get; set; }

        public Guid? SectionId { get; set; }

        public Guid? SubjectId { get; set; }

        public bool IsClassTeacher { get; set; } = false;

        [MaxLength(20)]
        public string AcademicYear { get; set; } = string.Empty;

        [MaxLength(20)]
        public string Status { get; set; } = "active";

        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }

        [ForeignKey("StaffId")]
        public virtual Staff? Staff { get; set; }

        [ForeignKey("ClassId")]
        public virtual Class? Class { get; set; }

        [ForeignKey("SectionId")]
        public virtual Section? Section { get; set; }

        [ForeignKey("SubjectId")]
        public virtual Subject? Subject { get; set; }
    }

    // Class Settings for Grading and Promotion
    public class ClassSettings : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        public Guid ClassId { get; set; }

        /// <summary>
        /// Passing percentage required (0-100)
        /// </summary>
        public decimal PassingPercentage { get; set; } = 35m;

        /// <summary>
        /// Minimum attendance percentage required for promotion (0-100)
        /// </summary>
        public decimal MinimumAttendance { get; set; } = 75m;

        /// <summary>
        /// Grading scale: 4.0, 5.0, or percentage
        /// </summary>
        [MaxLength(20)]
        public string GradingScale { get; set; } = "4.0";

        /// <summary>
        /// Promotion policy: strict, lenient, or flexible
        /// </summary>
        [MaxLength(50)]
        public string PromotionPolicy { get; set; } = "strict";

        /// <summary>
        /// Custom promotion policy text (optional, user-defined)
        /// </summary>
        public string? CustomPromotionPolicy { get; set; }

        /// <summary>
        /// Whether automatic promotion is enabled
        /// </summary>
        public bool EnableAutoPromotion { get; set; } = true;

        /// <summary>
        /// Whether supplementary exams are allowed
        /// </summary>
        public bool EnableSupplementaryExams { get; set; } = true;

        /// <summary>
        /// Whether grading should be considered for promotion
        /// </summary>
        public bool EnableGradingForPromotion { get; set; } = true;

        /// <summary>
        /// Minimum subjects that must be passed for promotion
        /// </summary>
        public int? MinSubjectsToPass { get; set; }

        /// <summary>
        /// Additional notes or requirements
        /// </summary>
        public string? Notes { get; set; }

        [MaxLength(20)]
        public string Status { get; set; } = "active";

        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }

        [ForeignKey("ClassId")]
        public virtual Class? Class { get; set; }
    }

    // Grade Tier Entity
    public class GradeTier : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        public Guid ClassId { get; set; }

        /// <summary>
        /// Grade label (e.g., A+, A, B+, etc.)
        /// </summary>
        [Required]
        [MaxLength(10)]
        public string Grade { get; set; } = string.Empty;

        /// <summary>
        /// Minimum marks for this grade (0-100)
        /// </summary>
        public decimal MinMarks { get; set; }

        /// <summary>
        /// Maximum marks for this grade (0-100)
        /// </summary>
        public decimal MaxMarks { get; set; }

        /// <summary>
        /// GPA value for this grade (0-10)
        /// </summary>
        public decimal GPA { get; set; }

        /// <summary>
        /// Display order for sorting
        /// </summary>
        public int DisplayOrder { get; set; }

        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }

        [ForeignKey("ClassId")]
        public virtual Class? Class { get; set; }
    }

    // Timetable Entry Entity
    public class TimetableEntry : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        public Guid SectionId { get; set; }

        /// <summary>
        /// Day of week (Monday, Tuesday, etc.)
        /// </summary>
        [Required]
        [MaxLength(20)]
        public string DayOfWeek { get; set; } = string.Empty;

        /// <summary>
        /// Period number (1-8)
        /// </summary>
        [Required]
        public int Period { get; set; }

        /// <summary>
        /// Subject for this period
        /// </summary>
        [Required]
        public Guid SubjectId { get; set; }

        /// <summary>
        /// Teacher assigned to this period
        /// </summary>
        public Guid? TeacherId { get; set; }

        /// <summary>
        /// Start time (e.g., "09:00")
        /// </summary>
        [MaxLength(10)]
        public string? StartTime { get; set; }

        /// <summary>
        /// End time (e.g., "09:40")
        /// </summary>
        [MaxLength(10)]
        public string? EndTime { get; set; }

        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }

        [ForeignKey("SectionId")]
        public virtual Section? Section { get; set; }

        [ForeignKey("SubjectId")]
        public virtual Subject? Subject { get; set; }

        [ForeignKey("TeacherId")]
        public virtual Staff? Teacher { get; set; }
    }

    // ── ExamType ─────────────────────────────────────────────────────────────
    /// <summary>
    /// Configures a named exam type for a school (Unit Test, Quarterly, Half-Yearly, Annual…).
    /// Each type carries default marks and how many times it runs per academic term.
    /// </summary>
    public class ExamType : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        /// <summary>Default maximum marks for exams of this type.</summary>
        public int DefaultMaxMarks { get; set; } = 100;

        /// <summary>Typical number of exams of this type conducted per academic term.</summary>
        public int ExamsPerTerm { get; set; } = 1;

        /// <summary>True if this exam type is a short/unit-test format (as opposed to a full exam).</summary>
        public bool IsUnitTest { get; set; } = false;

        public string? Description { get; set; }

        [MaxLength(20)]
        public string Status { get; set; } = "active";

        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
    }

    // ── SubjectType ───────────────────────────────────────────────────────────
    /// <summary>
    /// Defines a subject category/type for a school (Theory, Practical, Language, Project…).
    /// A subject can be tagged with one or more types via Subject.SubjectTypes.
    /// </summary>
    public class SubjectType : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

        [MaxLength(20)]
        public string Status { get; set; } = "active";

        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
    }

    // ── StudentSubject (per-student subject enrollment) ───────────────────────
    /// <summary>
    /// Records which subjects a student is enrolled in for a given academic year.
    /// Students in the same class can have different optional/elective subjects.
    /// </summary>
    public class StudentSubject : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        public Guid StudentId { get; set; }

        [Required]
        public Guid ClassId { get; set; }

        [Required]
        public Guid SubjectId { get; set; }

        public Guid? SubjectTypeId { get; set; }

        /// <summary>
        /// FK to AcademicYear entity — the structured replacement for the legacy string field.
        /// Populated on all new enrollments. Null on rows created before this column was added.
        /// </summary>
        public Guid? AcademicYearId { get; set; }

        /// <summary>
        /// Legacy free-text academic year (e.g. "2025-26"). Kept for backward compatibility.
        /// New code should use AcademicYearId and read the name from AcademicYearRef.Name.
        /// </summary>
        [Required]
        [MaxLength(20)]
        public string AcademicYear { get; set; } = string.Empty;

        /// <summary>
        /// Optional link to the StudentEnrollment row for this student/year.
        /// When populated, provides the authoritative class+section context without
        /// needing to join through Student.Class/Section strings.
        /// </summary>
        public Guid? StudentEnrollmentId { get; set; }

        /// <summary>Whether this is a mandatory or elective enrollment.</summary>
        public bool IsMandatory { get; set; } = true;

        [MaxLength(20)]
        public string Status { get; set; } = "active";

        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }

        [ForeignKey("StudentId")]
        public virtual Student? Student { get; set; }

        [ForeignKey("ClassId")]
        public virtual Class? Class { get; set; }

        [ForeignKey("SubjectId")]
        public virtual Subject? Subject { get; set; }

        [ForeignKey("SubjectTypeId")]
        public virtual SubjectType? SubjectType { get; set; }

        [ForeignKey("AcademicYearId")]
        public virtual AcademicYear? AcademicYearRef { get; set; }

        [ForeignKey("StudentEnrollmentId")]
        public virtual StudentEnrollment? StudentEnrollment { get; set; }
    }

    /// <summary>
    /// Tracks a student's enrollment in a specific class and section for a given academic year.
    /// <para>
    /// This is the authoritative source for "which class is this student in?" — replacing the
    /// legacy string Class/Section fields on the Student entity. By creating a new row per year,
    /// the full promotion history is preserved: when a student is promoted the current row is
    /// closed (Status = "promoted", ExitDate = promotion date) and a new active row is opened.
    /// </para>
    /// <para>
    /// Migration note: existing Student.Class and Student.Section strings are kept for backward
    /// compatibility but new code should always read from StudentEnrollment.
    /// </para>
    /// </summary>
    public class StudentEnrollment : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        /// <summary>The student being enrolled.</summary>
        [Required]
        public Guid StudentId { get; set; }

        /// <summary>FK to AcademicYear — replaces the legacy string AcademicYear field.</summary>
        [Required]
        public Guid AcademicYearId { get; set; }

        /// <summary>FK to Class entity — replaces Student.Class string field.</summary>
        [Required]
        public Guid ClassId { get; set; }

        /// <summary>FK to Section entity — replaces Student.Section string field.</summary>
        [Required]
        public Guid SectionId { get; set; }

        /// <summary>Roll number within this class/section for this academic year.</summary>
        [MaxLength(20)]
        public string? RollNumber { get; set; }

        /// <summary>
        /// Lifecycle status: active | promoted | transferred | dropped | completed.
        /// Only one row per student per academic year should be "active" at a time.
        /// </summary>
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "active";

        /// <summary>Date the student was enrolled/admitted into this class.</summary>
        public DateTime EnrollmentDate { get; set; }

        /// <summary>
        /// Set when the student leaves this class (promoted, transferred, or dropped).
        /// Null means the enrollment is still active.
        /// </summary>
        public DateTime? ExitDate { get; set; }

        [MaxLength(500)]
        public string? Remarks { get; set; }

        // ── Navigation properties ─────────────────────────────────────────────
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }

        [ForeignKey("StudentId")]
        public virtual Student? Student { get; set; }

        [ForeignKey("AcademicYearId")]
        public virtual AcademicYear? AcademicYear { get; set; }

        [ForeignKey("ClassId")]
        public virtual Class? Class { get; set; }

        [ForeignKey("SectionId")]
        public virtual Section? Section { get; set; }
    }

    // Academic Year Entity
    public class AcademicYear : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        [MaxLength(50)]
        public string Name { get; set; } = string.Empty;

        [Required]
        public DateTime StartDate { get; set; }

        [Required]
        public DateTime EndDate { get; set; }

        public bool IsCurrent { get; set; } = false;

        [MaxLength(20)]
        public string Status { get; set; } = "active";

        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
    }
}
