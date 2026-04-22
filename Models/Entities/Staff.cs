using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    public class Staff : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string EmployeeId { get; set; } = string.Empty;
        
        // Personal Information
        [Required]
        [MaxLength(100)]
        public string FirstName { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(100)]
        public string LastName { get; set; } = string.Empty;
        
        [MaxLength(200)]
        public string? Name { get; set; } // Computed: FirstName + LastName
        
        [Required]
        [MaxLength(255)]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(20)]
        public string Phone { get; set; } = string.Empty;
        
        [Required]
        public DateTime DateOfBirth { get; set; }
        
        [Required]
        [MaxLength(10)]
        public string Gender { get; set; } = string.Empty;
        
        // Address
        [Required]
        public string Address { get; set; } = string.Empty;
        
        public string? PermanentAddress { get; set; }
        
        [MaxLength(100)]
        public string? City { get; set; }
        
        [MaxLength(50)]
        public string? State { get; set; }
        
        [MaxLength(10)]
        public string? Pincode { get; set; }
        
        // Identification (Indian Government IDs)
        [MaxLength(14)]
        public string? AadharNumber { get; set; }
        
        [MaxLength(10)]
        public string? PanNumber { get; set; }
        
        [MaxLength(20)]
        public string? PassportNumber { get; set; }
        
        // Professional
        [Required]
        [MaxLength(100)]
        public string Department { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(100)]
        public string Designation { get; set; } = string.Empty;
        
        [MaxLength(200)]
        public string? Qualification { get; set; }
        
        [MaxLength(200)]
        public string? Specialization { get; set; }
        
        public int Experience { get; set; } = 0;
        
        [Required]
        public DateTime JoiningDate { get; set; }
        
        // Employment Details
        [Required]
        [MaxLength(20)]
        public string EmploymentType { get; set; } = "permanent"; // permanent, contract, temporary, probation
        
        public Guid? ReportingToId { get; set; }
        
        public string? Subjects { get; set; } // JSON array
        
        public string? Classes { get; set; } // JSON array
        
        // Salary & Compensation
        [Required]
        [Column(TypeName = "decimal(12,2)")]
        public decimal Salary { get; set; }
        
        [Column(TypeName = "decimal(12,2)")]
        public decimal? BasicSalary { get; set; }
        
        [MaxLength(100)]
        public string? BankName { get; set; }
        
        [MaxLength(30)]
        public string? BankAccountNumber { get; set; }
        
        [MaxLength(15)]
        public string? IfscCode { get; set; }
        
        // PF/ESI Details (Indian Compliance)
        [MaxLength(30)]
        public string? PfNumber { get; set; }
        
        [MaxLength(20)]
        public string? EsiNumber { get; set; }
        
        [MaxLength(20)]
        public string? UanNumber { get; set; }
        
        // Emergency Contact
        [MaxLength(200)]
        public string? EmergencyContactName { get; set; }
        
        [MaxLength(20)]
        public string? EmergencyContactPhone { get; set; }
        
        [MaxLength(50)]
        public string? EmergencyContactRelationship { get; set; }
        
        // Leave Balance
        public int CasualLeave { get; set; } = 12;
        public int SickLeave { get; set; } = 12;
        public int EarnedLeave { get; set; } = 15;
        public int MaternityLeave { get; set; } = 180;
        public int PaternityLeave { get; set; } = 15;
        public int UnpaidLeave { get; set; } = 0;
        
        // Status
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "active"; // active, inactive, on-leave, resigned, terminated
        
        public bool IsActive { get; set; } = true;

        [MaxLength(500)]
        public string? ProfilePhoto { get; set; }

        // === PUR Identity Model — Phase 2 migration path ===
        // PersonId is nullable to remain fully backward compatible.
        public Guid? PersonId { get; set; }

        // Navigation properties
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }

        [ForeignKey("PersonId")]
        public virtual Person? Person { get; set; }
        
        [ForeignKey("ReportingToId")]
        public virtual Staff? ReportingTo { get; set; }
        
        public virtual ICollection<StaffDocument>? Documents { get; set; }
        
        public virtual ICollection<StaffQualification>? Qualifications { get; set; }
        
        public virtual ICollection<PerformanceReview>? PerformanceReviews { get; set; }
    }
    
    public class StaffDocument : BaseEntity
    {
        [Required]
        public Guid StaffId { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(50)]
        public string Type { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(500)]
        public string Url { get; set; } = string.Empty;
        
        public DateTime UploadedAt { get; set; }
        
        [ForeignKey("StaffId")]
        public virtual Staff? Staff { get; set; }
    }
}
