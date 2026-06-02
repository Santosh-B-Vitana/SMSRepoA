using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SmsApi.Models.DTOs
{
    // ============================================================
    // DISCIPLINE — Request / Response DTOs
    // ============================================================

    public class CreateDisciplineRecordRequest
    {
        [Required]
        public Guid StudentId { get; set; }

        [Required]
        public DateTime IncidentDate { get; set; }

        /// <summary>
        /// warning | suspension | misconduct | detention | bullying |
        /// physical_altercation | property_damage | academic_dishonesty |
        /// absenteeism | disruption | behaviour_concern | positive_recognition | other
        /// </summary>
        [Required]
        [MaxLength(60)]
        public string IncidentType { get; set; } = "warning";

        /// <summary>low | medium | high | critical | commendation</summary>
        [Required]
        [MaxLength(20)]
        public string Severity { get; set; } = "low";

        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [MaxLength(2000)]
        public string? Description { get; set; }

        [MaxLength(1000)]
        public string? ActionTaken { get; set; }

        /// <summary>open | under_review | resolved | appealed | escalated | closed</summary>
        [MaxLength(30)]
        public string Status { get; set; } = "open";

        public Guid? ReportedByStaffId { get; set; }

        [MaxLength(150)]
        public string? ReportedByName { get; set; }

        /// <summary>pending | notified | not_required</summary>
        [MaxLength(20)]
        public string? ParentNotificationStatus { get; set; }

        public DateTime? ParentNotifiedAt { get; set; }

        public int SuspensionDays { get; set; } = 0;

        [MaxLength(1000)]
        public string? Notes { get; set; }
    }

    public class UpdateDisciplineRecordRequest
    {
        public DateTime? IncidentDate { get; set; }

        [MaxLength(60)]
        public string? IncidentType { get; set; }

        [MaxLength(20)]
        public string? Severity { get; set; }

        [MaxLength(200)]
        public string? Title { get; set; }

        [MaxLength(2000)]
        public string? Description { get; set; }

        [MaxLength(1000)]
        public string? ActionTaken { get; set; }

        [MaxLength(30)]
        public string? Status { get; set; }

        [MaxLength(20)]
        public string? ParentNotificationStatus { get; set; }

        public DateTime? ParentNotifiedAt { get; set; }

        public int? SuspensionDays { get; set; }

        [MaxLength(1000)]
        public string? Notes { get; set; }

        [MaxLength(500)]
        public string? ResolutionNotes { get; set; }
    }

    public class DisciplineRecordResponse
    {
        public Guid Id { get; set; }
        public Guid StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string? StudentAdmissionNumber { get; set; }
        public string? StudentClass { get; set; }
        public string? StudentSection { get; set; }
        public DateTime IncidentDate { get; set; }
        public string IncidentType { get; set; } = string.Empty;
        public string Severity { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? ActionTaken { get; set; }
        public string Status { get; set; } = string.Empty;
        public Guid? ReportedByStaffId { get; set; }
        public string? ReportedByName { get; set; }
        public string? ParentNotificationStatus { get; set; }
        public DateTime? ParentNotifiedAt { get; set; }
        public int SuspensionDays { get; set; }
        public string? Notes { get; set; }
        public string? ResolutionNotes { get; set; }
        public DateTime? ResolvedAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class DisciplineListResponse
    {
        public List<DisciplineRecordResponse> Records { get; set; } = new();
        public int TotalCount { get; set; }
        public DisciplineSummary Summary { get; set; } = new();
    }

    public class DisciplineSummary
    {
        public int TotalIncidents { get; set; }
        public int OpenIncidents { get; set; }
        public int ResolvedIncidents { get; set; }
        public int SuspensionDays { get; set; }
        public int PositiveRecognitions { get; set; }
        public int HighSeverityCount { get; set; }
        public int ParentNotifiedCount { get; set; }
    }

    public class DisciplineQueryParams
    {
        public Guid? StudentId { get; set; }
        public string? Status { get; set; }
        public string? Severity { get; set; }
        public string? IncidentType { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public string? AcademicYear { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
    }
}
