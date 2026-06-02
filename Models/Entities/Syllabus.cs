using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    /// <summary>
    /// A syllabus unit (chapter) within a subject for a specific class and academic year.
    /// Represents the curriculum structure: Subject → Units → Topics.
    /// </summary>
    public class SyllabusUnit : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        public Guid ClassId { get; set; }

        [Required]
        public Guid SubjectId { get; set; }

        /// <summary>Academic year e.g. "2025-26"</summary>
        [Required]
        [MaxLength(20)]
        public string AcademicYear { get; set; } = string.Empty;

        /// <summary>Display order within the subject (1, 2, 3…)</summary>
        [Required]
        public int UnitNumber { get; set; }

        [Required]
        [MaxLength(300)]
        public string Title { get; set; } = string.Empty;

        public string? Description { get; set; }

        /// <summary>Total estimated teaching hours for this unit</summary>
        public int? PlannedHours { get; set; }

        public DateTime? PlannedStartDate { get; set; }
        public DateTime? PlannedEndDate { get; set; }
        public DateTime? ActualStartDate { get; set; }
        public DateTime? ActualEndDate { get; set; }

        /// <summary>pending | in_progress | completed</summary>
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "pending";

        /// <summary>Computed: number of topics in this unit (updated on topic save)</summary>
        public int TotalTopics { get; set; } = 0;

        /// <summary>Computed: number of completed topics (updated on topic completion)</summary>
        public int CompletedTopics { get; set; } = 0;

        // Navigation
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }

        [ForeignKey("ClassId")]
        public virtual Class? ClassRef { get; set; }

        [ForeignKey("SubjectId")]
        public virtual Subject? SubjectRef { get; set; }

        public virtual ICollection<SyllabusTopic> Topics { get; set; } = new List<SyllabusTopic>();
    }

    /// <summary>
    /// A topic within a syllabus unit. This is the atomic teaching unit that
    /// teachers mark as completed in their daily work.
    /// </summary>
    public class SyllabusTopic : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        public Guid UnitId { get; set; }

        /// <summary>Display order within the unit (1, 2, 3…)</summary>
        [Required]
        public int TopicNumber { get; set; }

        [Required]
        [MaxLength(300)]
        public string Title { get; set; } = string.Empty;

        public string? Description { get; set; }

        /// <summary>Estimated teaching duration in minutes</summary>
        public int? DurationMinutes { get; set; }

        /// <summary>References to textbook/resource pages, e.g. "NCERT pg 42-55"</summary>
        [MaxLength(500)]
        public string? ResourceReferences { get; set; }

        /// <summary>pending | in_progress | completed</summary>
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "pending";

        public DateTime? CompletedDate { get; set; }

        /// <summary>Staff member who marked this topic as completed</summary>
        public Guid? CompletedByStaffId { get; set; }

        [MaxLength(1000)]
        public string? CompletionRemarks { get; set; }

        // Navigation
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }

        [ForeignKey("UnitId")]
        public virtual SyllabusUnit? Unit { get; set; }

        [ForeignKey("CompletedByStaffId")]
        public virtual Staff? CompletedByStaff { get; set; }
    }

    /// <summary>
    /// Teacher's daily lesson plan linked to a class, subject and optionally a syllabus topic.
    /// Provides structured planning and an audit trail of what was taught each day.
    /// </summary>
    public class LessonPlan : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        /// <summary>Teacher who authored the plan (null for admin-created plans)</summary>
        public Guid? StaffId { get; set; }

        [Required]
        public Guid ClassId { get; set; }

        public Guid? SectionId { get; set; }

        [Required]
        public Guid SubjectId { get; set; }

        /// <summary>Optional link to a SyllabusTopic covered in this lesson</summary>
        public Guid? TopicId { get; set; }

        [Required]
        public DateTime Date { get; set; }

        /// <summary>Period number in timetable (1-based)</summary>
        public int? PeriodNumber { get; set; }

        [Required]
        [MaxLength(300)]
        public string Title { get; set; } = string.Empty;

        /// <summary>What students will be able to do after this lesson</summary>
        public string? LearningObjectives { get; set; }

        /// <summary>Teaching strategies and methods used</summary>
        public string? TeachingMethods { get; set; }

        /// <summary>Textbooks, charts, digital tools used</summary>
        public string? Resources { get; set; }

        /// <summary>Activities done during the class</summary>
        public string? ClassActivities { get; set; }

        /// <summary>Homework or follow-up assigned</summary>
        public string? Homework { get; set; }

        /// <summary>Teacher's private notes or observations</summary>
        public string? Notes { get; set; }

        /// <summary>draft | submitted | approved | rejected</summary>
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "draft";

        public Guid? ApprovedByStaffId { get; set; }
        public DateTime? ApprovedAt { get; set; }

        [MaxLength(500)]
        public string? RejectionReason { get; set; }

        // Navigation
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }

        [ForeignKey("StaffId")]
        public virtual Staff? Staff { get; set; }

        [ForeignKey("ClassId")]
        public virtual Class? ClassRef { get; set; }

        [ForeignKey("SectionId")]
        public virtual Section? SectionRef { get; set; }

        [ForeignKey("SubjectId")]
        public virtual Subject? SubjectRef { get; set; }

        [ForeignKey("TopicId")]
        public virtual SyllabusTopic? Topic { get; set; }

        [ForeignKey("ApprovedByStaffId")]
        public virtual Staff? ApprovedByStaff { get; set; }
    }
}
