using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    // ========== HEALTH ALERT ==========
    public class HealthAlert : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public Guid StudentId { get; set; }
        
        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(50)]
        public string AlertType { get; set; } = string.Empty; // Vaccination Due, Medical Checkup, Allergy Alert, Chronic Condition
        
        [Required]
        [MaxLength(20)]
        public string Severity { get; set; } = "Medium"; // Low, Medium, High, Critical
        
        [MaxLength(2000)]
        public string? Description { get; set; }
        
        public DateTime? DueDate { get; set; }
        
        [MaxLength(20)]
        public string Status { get; set; } = "Active"; // Active, Acknowledged, Resolved, Dismissed
        
        public Guid? AcknowledgedBy { get; set; }
        
        public DateTime? AcknowledgedAt { get; set; }
        
        [MaxLength(1000)]
        public string? AcknowledgementNotes { get; set; }
        
        public DateTime? ResolvedAt { get; set; }
        
        [MaxLength(1000)]
        public string? ResolutionNotes { get; set; }
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
        
        [ForeignKey("StudentId")]
        public virtual Student? Student { get; set; }
    }

    // ========== VACCINATION ==========
    public class Vaccination : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public Guid StudentId { get; set; }
        
        [Required]
        [MaxLength(200)]
        public string VaccineName { get; set; } = string.Empty;
        
        [MaxLength(200)]
        public string? Manufacturer { get; set; }
        
        [MaxLength(100)]
        public string? BatchNumber { get; set; }
        
        [Required]
        public DateTime DateAdministered { get; set; }
        
        public DateTime? NextDoseDate { get; set; }
        
        [MaxLength(200)]
        public string? AdministeredBy { get; set; }
        
        [MaxLength(500)]
        public string? Clinic { get; set; }
        
        [MaxLength(1000)]
        public string? SideEffects { get; set; }
        
        [MaxLength(1000)]
        public string? Notes { get; set; }
        
        [MaxLength(500)]
        public string? CertificateUrl { get; set; }
        
        [MaxLength(20)]
        public string Status { get; set; } = "Completed"; // Scheduled, Completed, Missed, Cancelled
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
        
        [ForeignKey("StudentId")]
        public virtual Student? Student { get; set; }
    }
}
