using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    /// <summary>
    /// Student Diary — a rich communication channel between staff and parents.
    /// Entries can be class-wide (DiaryType = "class") or individual student-specific
    /// (DiaryType = "individual"). Only entries with IsVisibleToParent = true are
    /// surfaced in the parent portal.
    /// </summary>
    public class StudentDiary : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [ForeignKey(nameof(SchoolId))]
        public School? School { get; set; }

        // ── Author ──────────────────────────────────────────────────────────
        [Required]
        public Guid StaffId { get; set; }

        [ForeignKey(nameof(StaffId))]
        public Staff? Staff { get; set; }

        // ── Content ─────────────────────────────────────────────────────────
        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        public string Content { get; set; } = string.Empty;

        /// <summary>
        /// Category of the diary entry.
        /// Values: note | homework | guideline | observation | achievement | concern | feedback | behavior
        /// </summary>
        [Required]
        [MaxLength(30)]
        public string Category { get; set; } = "note";

        /// <summary>
        /// Emoji icon for quick visual categorisation (optional, stored as unicode char / short string).
        /// </summary>
        [MaxLength(10)]
        public string? CategoryEmoji { get; set; }

        /// <summary>
        /// Hex colour tag for the entry card (optional).  e.g. "#f59e0b"
        /// </summary>
        [MaxLength(20)]
        public string? ColorTag { get; set; }

        // ── Scope ────────────────────────────────────────────────────────────
        /// <summary>
        /// "class" — entry applies to all students in the section.
        /// "individual" — entry is tied to a single student.
        /// </summary>
        [Required]
        [MaxLength(20)]
        public string DiaryType { get; set; } = "class";

        // Class-wide scope
        public Guid? ClassId { get; set; }

        [ForeignKey(nameof(ClassId))]
        public Class? Class { get; set; }

        public Guid? SectionId { get; set; }

        [ForeignKey(nameof(SectionId))]
        public Section? Section { get; set; }

        // Individual scope
        public Guid? StudentId { get; set; }

        [ForeignKey(nameof(StudentId))]
        public Student? Student { get; set; }

        // ── Metadata ─────────────────────────────────────────────────────────
        public DateTime DiaryDate { get; set; } = DateTime.UtcNow.Date;

        /// <summary>
        /// Whether parents can see this entry in the parent portal.
        /// </summary>
        public bool IsVisibleToParent { get; set; } = true;

        /// <summary>
        /// Whether to send a push / in-app notification to parent when published.
        /// </summary>
        public bool NotifyParent { get; set; } = false;

        [MaxLength(10)]
        public string Priority { get; set; } = "normal"; // low | normal | high | urgent

        [MaxLength(500)]
        public string? AttachmentUrl { get; set; }

        [MaxLength(100)]
        public string? AttachmentName { get; set; }
    }
}
