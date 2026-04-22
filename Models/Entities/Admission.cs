using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    public class Admission : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string ApplicationNumber { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(100)]
        public string FirstName { get; set; } = string.Empty;
        
        [MaxLength(100)]
        public string? MiddleName { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string LastName { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(200)]
        public string ParentName { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(20)]
        public string ParentPhone { get; set; } = string.Empty;
        
        [MaxLength(255)]
        [EmailAddress]
        public string? ParentEmail { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string ApplyingForClass { get; set; } = string.Empty;
        
        [Required]
        public DateTime ApplicationDate { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "pending";
        
        [MaxLength(255)]
        public string? PreviousSchool { get; set; }
        
        [Required]
        public string Address { get; set; } = string.Empty;
        
        [Required]
        public DateTime DateOfBirth { get; set; }
        
        [Required]
        [MaxLength(10)]
        public string Gender { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(20)]
        public string AcademicYear { get; set; } = string.Empty;
        
        [Column(TypeName = "decimal(5,2)")]
        public decimal? EntranceTestScore { get; set; }
        
        [Column(TypeName = "decimal(5,2)")]
        public decimal? InterviewScore { get; set; }
        
        public string? Remarks { get; set; }
        
        public DateTime? InterviewDate { get; set; }
        
        public Guid? ProcessedBy { get; set; }
        
        public DateTime? ProcessedAt { get; set; }
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
        
        [ForeignKey("ProcessedBy")]
        public virtual Staff? ProcessedByStaff { get; set; }
    }

    public class AdmissionDocument : BaseEntity
    {
        [Required]
        public Guid AdmissionId { get; set; }
        
        [Required]
        [MaxLength(255)]
        public string Name { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(50)]
        public string Type { get; set; } = string.Empty;
        
        [Required]
        public string Url { get; set; } = string.Empty;
        
        public bool Verified { get; set; } = false;
        
        public Guid? VerifiedBy { get; set; }
        
        public DateTime? VerifiedAt { get; set; }
        
        [ForeignKey("AdmissionId")]
        public virtual Admission? Admission { get; set; }
        
        [ForeignKey("VerifiedBy")]
        public virtual Staff? VerifiedByStaff { get; set; }
    }
}
