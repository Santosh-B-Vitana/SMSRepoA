using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    public class PFESIConfiguration : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string Type { get; set; } = string.Empty; // PF, ESI
        
        [Required]
        [Column(TypeName = "decimal(5,2)")]
        public decimal EmployeeContributionPercentage { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(5,2)")]
        public decimal EmployerContributionPercentage { get; set; }
        
        [Column(TypeName = "decimal(12,2)")]
        public decimal? WageLimit { get; set; } // ESI wage limit
        
        [Column(TypeName = "decimal(12,2)")]
        public decimal? PensionContributionLimit { get; set; } // PF pension limit
        
        [MaxLength(100)]
        public string? RegistrationNumber { get; set; }
        
        public DateTime? EffectiveFrom { get; set; }
        
        public DateTime? EffectiveTo { get; set; }
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
    }

    public class PFESIContribution : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public Guid StaffId { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string Type { get; set; } = string.Empty; // PF, ESI
        
        [Required]
        [MaxLength(20)]
        public string Month { get; set; } = string.Empty; // YYYY-MM
        
        [Required]
        [Column(TypeName = "decimal(12,2)")]
        public decimal BasicSalary { get; set; }
        
        [Column(TypeName = "decimal(12,2)")]
        public decimal GrossSalary { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(12,2)")]
        public decimal EmployeeContribution { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(12,2)")]
        public decimal EmployerContribution { get; set; }
        
        [Column(TypeName = "decimal(12,2)")]
        public decimal? PensionContribution { get; set; } // For PF only
        
        [Column(TypeName = "decimal(12,2)")]
        public decimal TotalContribution { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Calculated"; // Calculated, Deposited, Verified
        
        public DateTime? DepositDate { get; set; }
        
        [MaxLength(100)]
        public string? ChallanNumber { get; set; }
        
        [MaxLength(200)]
        public string? ReceiptUrl { get; set; }
        
        public string? Remarks { get; set; }
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
        
        [ForeignKey("StaffId")]
        public virtual Staff? Staff { get; set; }
    }

    public class ComplianceReport : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string ReportNumber { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(50)]
        public string ReportType { get; set; } = string.Empty; // PF_Monthly, ESI_HalfYearly, Form_5, Form_6A, etc.
        
        [Required]
        [MaxLength(20)]
        public string Period { get; set; } = string.Empty; // YYYY-MM or YYYY-Q1/Q2 etc.
        
        public DateTime GeneratedDate { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Draft"; // Draft, Generated, Submitted, Verified
        
        [MaxLength(200)]
        public string? ReportFileUrl { get; set; }
        
        [Column(TypeName = "decimal(12,2)")]
        public decimal? TotalEmployeeContribution { get; set; }
        
        [Column(TypeName = "decimal(12,2)")]
        public decimal? TotalEmployerContribution { get; set; }
        
        public int? TotalEmployees { get; set; }
        
        public DateTime? SubmissionDate { get; set; }
        
        public Guid? SubmittedByStaffId { get; set; }
        
        public string? SubmissionDetails { get; set; } // JSON with additional submission info
        
        public string? Remarks { get; set; }
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
    }
}
