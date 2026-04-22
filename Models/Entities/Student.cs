using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    public class Student : BaseEntity
    {
        // Multi-tenancy
        [Required]
        public Guid SchoolId { get; set; }
        
        // Basic Information
        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;
        
        [MaxLength(100)]
        public string? FirstName { get; set; }
        
        [MaxLength(100)]
        public string? MiddleName { get; set; }
        
        [MaxLength(100)]
        public string? LastName { get; set; }
        
        [MaxLength(100)]
        public string? PreferredName { get; set; }
        
        [MaxLength(50)]
        public string? AdmissionNumber { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string Class { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(10)]
        public string Section { get; set; } = string.Empty;
        
        [MaxLength(20)]
        public string? RollNumber { get; set; }
        
        [Required]
        public DateTime DateOfBirth { get; set; }
        
        [MaxLength(100)]
        public string? PlaceOfBirth { get; set; }
        
        [MaxLength(10)]
        public string? Gender { get; set; }
        
        public string? Nationality { get; set; } // JSON array
        
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "active";
        
        [Required]
        public DateTime AdmissionDate { get; set; }
        
        [MaxLength(500)]
        public string? PhotoUrl { get; set; }
        
        // Identification (Indian Government IDs)
        [MaxLength(14)]
        public string? AadharNumber { get; set; } // XXXX-XXXX-XXXX
        
        [MaxLength(10)]
        public string? PanNumber { get; set; } // ABCDE1234F
        
        [MaxLength(20)]
        public string? PassportNumber { get; set; }
        
        [MaxLength(50)]
        public string? VisaType { get; set; }
        
        public DateTime? VisaExpiry { get; set; }
        
        // Contact Information
        [Required]
        public string Address { get; set; } = string.Empty; // Current/Local
        
        public string? PermanentAddress { get; set; }
        
        [MaxLength(20)]
        public string? PrimaryPhone { get; set; }
        
        [MaxLength(20)]
        public string? SecondaryPhone { get; set; }
        
        [MaxLength(255)]
        [EmailAddress]
        public string? Email { get; set; }
        
        // Primary Guardian (backward compatibility)
        [Required]
        [MaxLength(200)]
        public string GuardianName { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(20)]
        public string GuardianPhone { get; set; } = string.Empty;
        
        // Academic History
        [MaxLength(200)]
        public string? PreviousSchool { get; set; }
        
        [MaxLength(20)]
        public string? PreviousClass { get; set; }
        
        public string? TransferReason { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string Category { get; set; } = "General"; // General, OBC, SC, ST
        
        // Cultural Information
        [MaxLength(50)]
        public string? Religion { get; set; }
        
        [MaxLength(50)]
        public string? Caste { get; set; }
        
        [MaxLength(100)]
        public string? MotherTongue { get; set; }
        
        // Medical Information
        [MaxLength(5)]
        public string? BloodGroup { get; set; }
        
        public string? Allergies { get; set; }
        
        public string? ChronicConditions { get; set; }
        
        public string? Medications { get; set; }
        
        [MaxLength(200)]
        public string? EmergencyContact { get; set; }
        
        [MaxLength(20)]
        public string? EmergencyPhone { get; set; }
        
        [MaxLength(200)]
        public string? DoctorName { get; set; }
        
        [MaxLength(20)]
        public string? DoctorPhone { get; set; }
        
        // Consent Flags
        public bool PhotoConsent { get; set; } = false;
        public bool MediaConsent { get; set; } = false;
        public bool MedicalConsent { get; set; } = false;
        
        // Additional
        public string? LanguageProficiency { get; set; } // JSON array
        
        public string? SpecialNeeds { get; set; }
        
        public bool TransportRequired { get; set; } = false;
        public bool HostelRequired { get; set; } = false;
        
        // Siblings (JSON array of student IDs)
        public string? SiblingIds { get; set; }
        
        // Status flag
        public bool IsActive { get; set; } = true;

        // === PUR Identity Model — Phase 2 migration path ===
        // PersonId is nullable to remain fully backward compatible.
        // New records should populate this FK. Old records keep PersonId = null.
        public Guid? PersonId { get; set; }

        // Navigation properties
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }

        [ForeignKey("PersonId")]
        public virtual Person? Person { get; set; }
        
        public virtual ICollection<StudentGuardian>? Guardians { get; set; }
        public virtual ICollection<StudentDocument>? Documents { get; set; }
    }
    
    public class StudentGuardian : BaseEntity
    {
        public Guid StudentId { get; set; }
        
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(20)]
        public string Relation { get; set; } = string.Empty; // father, mother, guardian, other
        
        [MaxLength(100)]
        public string? Occupation { get; set; }
        
        [MaxLength(200)]
        public string? Employer { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string Phone { get; set; } = string.Empty;
        
        [MaxLength(255)]
        [EmailAddress]
        public string? Email { get; set; }
        
        [MaxLength(14)]
        public string? AadharNumber { get; set; }
        
        [MaxLength(10)]
        public string? PanNumber { get; set; }
        
        [ForeignKey("StudentId")]
        public virtual Student? Student { get; set; }
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
    }
    
    public class StudentDocument : BaseEntity
    {
        public Guid StudentId { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string DocumentType { get; set; } = string.Empty; // birthCertificate, aadharCard, etc.
        
        [Required]
        [MaxLength(500)]
        public string FileUrl { get; set; } = string.Empty;
        
        [MaxLength(200)]
        public string? FileName { get; set; }
        
        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
        
        [ForeignKey("StudentId")]
        public virtual Student? Student { get; set; }
    }
}
