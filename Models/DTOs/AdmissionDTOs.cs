using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SmsApi.Models.DTOs
{
    // ========== ADMISSION DTOs (Basic & Full) ==========
    
    /// <summary>
    /// Basic DTO for GET list endpoints - lightweight admission data for listing
    /// </summary>
    public class AdmissionBasicDto
    {
        public Guid Id { get; set; }
        public string ApplicationNumber { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty; // FirstName + LastName
        public DateTime DateOfBirth { get; set; }
        public string Gender { get; set; } = string.Empty;
        public string AppliedClass { get; set; } = string.Empty;
        public string GuardianName { get; set; } = string.Empty;
        public string GuardianPhone { get; set; } = string.Empty;
        public DateTime ApplicationDate { get; set; }
        public string Status { get; set; } = string.Empty; // pending, approved, rejected, waitlisted, enrolled
    }

    /// <summary>
    /// Full DTO for GET by ID endpoints - complete admission details with all information
    /// </summary>
    public class AdmissionFullDto
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string ApplicationNumber { get; set; } = string.Empty;
        
        // Student Information
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty; // Computed: FirstName + LastName
        public DateTime DateOfBirth { get; set; }
        public string Gender { get; set; } = string.Empty;
        public string? BloodGroup { get; set; }
        public string Nationality { get; set; } = "Indian";
        public string? Religion { get; set; }
        public string? Caste { get; set; }
        public string? Category { get; set; } // general, obc, sc, st, ews
        public string? MotherTongue { get; set; }
        
        // Guardian Information
        public string GuardianName { get; set; } = string.Empty;
        public string GuardianRelation { get; set; } = string.Empty;
        public string GuardianPhone { get; set; } = string.Empty;
        public string? GuardianEmail { get; set; }
        public string? GuardianOccupation { get; set; }
        public decimal? GuardianAnnualIncome { get; set; }
        
        // Father Details
        public string? FatherName { get; set; }
        public string? FatherPhone { get; set; }
        public string? FatherEmail { get; set; }
        public string? FatherOccupation { get; set; }
        
        // Mother Details
        public string? MotherName { get; set; }
        public string? MotherPhone { get; set; }
        public string? MotherEmail { get; set; }
        public string? MotherOccupation { get; set; }
        
        // Address
        public string Address { get; set; } = string.Empty;
        public string? City { get; set; }
        public string? State { get; set; }
        public string? Pincode { get; set; }
        public string? PermanentAddress { get; set; }
        
        // Academic
        public string AppliedClass { get; set; } = string.Empty;
        public string AcademicYear { get; set; } = string.Empty;
        public string? PreviousSchool { get; set; }
        public string? PreviousClass { get; set; }
        public decimal? PreviousMarks { get; set; }
        public string? TransferCertificateNumber { get; set; }
        
        // Documents
        public string? AadharNumber { get; set; }
        public string? BirthCertificateNumber { get; set; }
        public string? PhotoUrl { get; set; }
        
        // Application Status
        public DateTime ApplicationDate { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime? InterviewDate { get; set; }
        public string? InterviewNotes { get; set; }
        public Guid? ApprovedBy { get; set; }
        public string? ApprovedByName { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public string? RejectionReason { get; set; }
        public DateTime? EnrollmentDate { get; set; }
        
        // Related Data
        public List<AdmissionDocumentDto> Documents { get; set; } = new();
        
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    // ========== DOCUMENT DTO ==========
    
    public class AdmissionDocumentDto
    {
        public Guid Id { get; set; }
        public Guid AdmissionId { get; set; }
        public string DocumentType { get; set; } = string.Empty;
        public string DocumentName { get; set; } = string.Empty;
        public string FileUrl { get; set; } = string.Empty;
        public bool IsVerified { get; set; }
        public Guid? VerifiedBy { get; set; }
        public string? VerifiedByName { get; set; }
        public DateTime? VerifiedAt { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    // ========== CREATE/UPDATE DTOs ==========
    
    public class CreateAdmissionDto
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        // Student Information
        [Required]
        [MaxLength(100)]
        public string FirstName { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(100)]
        public string LastName { get; set; } = string.Empty;
        
        [Required]
        public DateTime DateOfBirth { get; set; }
        
        [Required]
        [MaxLength(10)]
        public string Gender { get; set; } = string.Empty; // male, female, other
        
        [MaxLength(10)]
        public string? BloodGroup { get; set; }
        
        [MaxLength(50)]
        public string Nationality { get; set; } = "Indian";
        
        [MaxLength(50)]
        public string? Religion { get; set; }
        
        [MaxLength(50)]
        public string? Caste { get; set; }
        
        [MaxLength(20)]
        public string? Category { get; set; } // general, obc, sc, st, ews
        
        [MaxLength(50)]
        public string? MotherTongue { get; set; }
        
        // Guardian Information
        [Required]
        [MaxLength(200)]
        public string GuardianName { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(50)]
        public string GuardianRelation { get; set; } = string.Empty;
        
        [Required]
        [Phone]
        [MaxLength(20)]
        public string GuardianPhone { get; set; } = string.Empty;
        
        [EmailAddress]
        [MaxLength(200)]
        public string? GuardianEmail { get; set; }
        
        [MaxLength(100)]
        public string? GuardianOccupation { get; set; }
        
        public decimal? GuardianAnnualIncome { get; set; }
        
        // Father Details
        [MaxLength(200)]
        public string? FatherName { get; set; }
        
        [Phone]
        [MaxLength(20)]
        public string? FatherPhone { get; set; }
        
        [EmailAddress]
        [MaxLength(200)]
        public string? FatherEmail { get; set; }
        
        [MaxLength(100)]
        public string? FatherOccupation { get; set; }
        
        // Mother Details
        [MaxLength(200)]
        public string? MotherName { get; set; }
        
        [Phone]
        [MaxLength(20)]
        public string? MotherPhone { get; set; }
        
        [EmailAddress]
        [MaxLength(200)]
        public string? MotherEmail { get; set; }
        
        [MaxLength(100)]
        public string? MotherOccupation { get; set; }
        
        // Address
        [Required]
        public string Address { get; set; } = string.Empty;
        
        [MaxLength(100)]
        public string? City { get; set; }
        
        [MaxLength(100)]
        public string? State { get; set; }
        
        [MaxLength(10)]
        public string? Pincode { get; set; }
        
        public string? PermanentAddress { get; set; }
        
        // Academic
        [Required]
        [MaxLength(20)]
        public string AppliedClass { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(20)]
        public string AcademicYear { get; set; } = string.Empty;
        
        [MaxLength(200)]
        public string? PreviousSchool { get; set; }
        
        [MaxLength(20)]
        public string? PreviousClass { get; set; }
        
        public decimal? PreviousMarks { get; set; }
        
        [MaxLength(50)]
        public string? TransferCertificateNumber { get; set; }
        
        // Documents
        [MaxLength(20)]
        public string? AadharNumber { get; set; }
        
        [MaxLength(50)]
        public string? BirthCertificateNumber { get; set; }
        
        [MaxLength(500)]
        public string? PhotoUrl { get; set; }
        
        // Additional Fields
        [MaxLength(200)]
        public string? GuardianAddress { get; set; }
        
        [MaxLength(20)]
        public string? Class { get; set; }
        
        [MaxLength(1000)]
        public string? Remarks { get; set; }
    }

    public class UpdateAdmissionDto
    {
        // Student Information
        [MaxLength(100)]
        public string? FirstName { get; set; }
        
        [MaxLength(100)]
        public string? LastName { get; set; }
        
        public DateTime? DateOfBirth { get; set; }
        
        [MaxLength(10)]
        public string? Gender { get; set; }
        
        [MaxLength(10)]
        public string? BloodGroup { get; set; }
        
        // Guardian Information
        [MaxLength(200)]
        public string? GuardianName { get; set; }
        
        [MaxLength(50)]
        public string? GuardianRelation { get; set; }
        
        [Phone]
        [MaxLength(20)]
        public string? GuardianPhone { get; set; }
        
        [EmailAddress]
        [MaxLength(200)]
        public string? GuardianEmail { get; set; }
        
        [MaxLength(100)]
        public string? GuardianOccupation { get; set; }
        
        public decimal? GuardianAnnualIncome { get; set; }
        
        // Address
        public string? Address { get; set; }
        
        [MaxLength(100)]
        public string? City { get; set; }
        
        [MaxLength(100)]
        public string? State { get; set; }
        
        [MaxLength(10)]
        public string? Pincode { get; set; }
        
        // Application
        public DateTime? InterviewDate { get; set; }
        
        public string? InterviewNotes { get; set; }
        
        // Additional Fields
        [MaxLength(200)]
        public string? GuardianAddress { get; set; }
    }

    public class UpdateAdmissionStatusDto
    {
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = string.Empty; // pending, approved, rejected, waitlisted, enrolled
        
        public string? RejectionReason { get; set; }
        
        public DateTime? EnrollmentDate { get; set; }
        
        [Required]
        public Guid UpdatedBy { get; set; }
    }

    public class UploadAdmissionDocumentDto
    {
        [Required]
        public Guid AdmissionId { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string DocumentType { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(200)]
        public string DocumentName { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(500)]
        public string FileUrl { get; set; } = string.Empty;
    }

    public class VerifyAdmissionDocumentDto
    {
        [Required]
        public Guid VerifiedBy { get; set; }
        
        public string? VerificationNotes { get; set; }
    }

    // ========== LIST RESPONSES ==========
    
    public class AdmissionListResponse
    {
        public List<AdmissionBasicDto> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    public class AdmissionDocumentListResponse
    {
        public List<AdmissionDocumentDto> Items { get; set; } = new();
        public int TotalCount { get; set; }
    }

    // ========== STATS DTOs ==========
    
    public class AdmissionStatsDto
    {
        public int Total { get; set; }
        public int Pending { get; set; }
        public int Approved { get; set; }
        public int Rejected { get; set; }
        public int Waitlisted { get; set; }
        public int Enrolled { get; set; }
        public int Interviewed { get; set; }
        public Dictionary<string, int> ByClass { get; set; } = new();
        public Dictionary<string, int> ByCategory { get; set; } = new();
    }
}
