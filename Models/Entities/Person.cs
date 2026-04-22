using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using SmsApi.Models.Constants;

namespace SmsApi.Models.Entities
{
    /// <summary>
    /// Person entity — the single source of truth for all personal data in the system.
    /// 
    /// Every human being (Student, Staff, Guardian) links to ONE Person record.
    /// This is the identity layer, separate from authentication (UserLogin) and
    /// functional roles (Student, Staff).
    ///
    /// Migration path: existing Student and Staff entities get a nullable PersonId FK.
    /// New code uses Person; old code continues reading flat fields on Student/Staff.
    /// </summary>
    public class Person : BaseEntity
    {
        // Multi-tenancy
        [Required]
        public Guid SchoolId { get; set; }

        // === Core Identity (Required) ===

        [Required]
        [MaxLength(100)]
        public string FirstName { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string LastName { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? MiddleName { get; set; }

        [MaxLength(100)]
        public string? PreferredName { get; set; }

        // === Contact ===

        [MaxLength(255)]
        [EmailAddress]
        public string? Email { get; set; }

        [MaxLength(20)]
        [Phone]
        public string? Phone { get; set; }

        [MaxLength(20)]
        [Phone]
        public string? AlternatePhone { get; set; }

        // === Demographics ===

        public DateTime? DateOfBirth { get; set; }

        [MaxLength(20)]
        public string? Gender { get; set; } // Male, Female, Other, PreferNotToSay

        [MaxLength(100)]
        public string? Nationality { get; set; }

        [MaxLength(100)]
        public string? Religion { get; set; }

        [MaxLength(50)]
        public string? BloodGroup { get; set; }

        [MaxLength(100)]
        public string? MotherTongue { get; set; }

        [MaxLength(500)]
        public string? PhotoUrl { get; set; }

        // === Address ===

        [MaxLength(500)]
        public string? Address { get; set; }

        [MaxLength(100)]
        public string? City { get; set; }

        [MaxLength(100)]
        public string? State { get; set; }

        [MaxLength(100)]
        public string? Country { get; set; }

        [MaxLength(10)]
        public string? Pincode { get; set; }

        [MaxLength(500)]
        public string? PermanentAddress { get; set; }

        // === Government Identity Documents ===

        [MaxLength(14)]
        public string? AadharNumber { get; set; }  // XXXX-XXXX-XXXX

        [MaxLength(10)]
        public string? PanNumber { get; set; }      // ABCDE1234F

        [MaxLength(20)]
        public string? PassportNumber { get; set; }

        // === Health ===

        public string? Allergies { get; set; }         // JSON array

        public string? ChronicConditions { get; set; } // JSON array

        [MaxLength(500)]
        public string? MedicalNotes { get; set; }

        [MaxLength(200)]
        public string? EmergencyContactName { get; set; }

        [MaxLength(20)]
        [Phone]
        public string? EmergencyContactPhone { get; set; }

        // === Navigation ===

        public School? School { get; set; }

        // Reverse navigation — one Person may have at most one Student, Staff, or Guardian record
        public Student? StudentProfile { get; set; }
        public Staff? StaffProfile { get; set; }

        // === Computed helpers ===

        [NotMapped]
        public string FullName => string.IsNullOrWhiteSpace(MiddleName)
            ? $"{FirstName} {LastName}"
            : $"{FirstName} {MiddleName} {LastName}";

        [NotMapped]
        public string DisplayName => !string.IsNullOrWhiteSpace(PreferredName)
            ? PreferredName
            : FullName;
    }
}
