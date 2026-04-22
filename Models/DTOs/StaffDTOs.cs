using System;
using System.ComponentModel.DataAnnotations;

namespace SmsApi.Models.DTOs
{
    // Document DTO
    public class StaffDocumentDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string Url { get; set; } = string.Empty;
        public DateTime UploadedAt { get; set; }
    }

    // Request DTOs
    public class CreateStaffRequest
    {
        [Required]
        public Guid SchoolId { get; set; }

        [MaxLength(50)]
        public string? EmployeeId { get; set; } // Optional - auto-generated if not provided

        [Required]
        [MaxLength(100)]
        public string FirstName { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string LastName { get; set; } = string.Empty;

        [Required]
        [MaxLength(10)]
        public string Gender { get; set; } = string.Empty;

        [Required]
        public DateTime DateOfBirth { get; set; }

        [Required]
        [MaxLength(100)]
        public string Designation { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Department { get; set; } = string.Empty;

        [Required]
        public DateTime JoiningDate { get; set; }

        [MaxLength(50)]
        public string? Qualification { get; set; }

        public int Experience { get; set; } = 0;

        // Address Details
        public string? Address { get; set; }
        
        public string? PermanentAddress { get; set; }

        [MaxLength(100)]
        public string? City { get; set; }

        [MaxLength(50)]
        public string? State { get; set; }

        [MaxLength(10)]
        public string? Pincode { get; set; }

        // Contact Details
        [Required]
        [MaxLength(20)]
        public string Phone { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [MaxLength(100)]
        public string Email { get; set; } = string.Empty;

        // Indian ID Documents
        [MaxLength(14)]
        public string? AadharNumber { get; set; }

        [MaxLength(10)]
        public string? PanNumber { get; set; }

        [MaxLength(20)]
        public string? PassportNumber { get; set; }

        // Professional Details
        [MaxLength(200)]
        public string? Specialization { get; set; }

        [MaxLength(20)]
        public string EmploymentType { get; set; } = "permanent";

        public Guid? ReportingToId { get; set; }

        public string? Subjects { get; set; } // JSON array

        public string? Classes { get; set; } // JSON array

        // Banking Details
        [MaxLength(100)]
        public string? BankName { get; set; }

        [MaxLength(30)]
        public string? BankAccountNumber { get; set; }

        [MaxLength(15)]
        public string? IfscCode { get; set; }

        // PF/ESI Details
        [MaxLength(30)]
        public string? PfNumber { get; set; }

        [MaxLength(20)]
        public string? EsiNumber { get; set; }

        [MaxLength(20)]
        public string? UanNumber { get; set; }

        // Emergency Contact (Inline)
        [MaxLength(200)]
        public string? EmergencyContactName { get; set; }

        [MaxLength(20)]
        public string? EmergencyContactPhone { get; set; }

        [MaxLength(50)]
        public string? EmergencyContactRelationship { get; set; }

        [MaxLength(20)]
        public string Status { get; set; } = "active";

        public decimal? Salary { get; set; }

        public string? ProfilePhoto { get; set; }
    }

    public class UpdateStaffRequest
    {
        [MaxLength(50)]
        public string? EmployeeId { get; set; }

        [MaxLength(100)]
        public string? FirstName { get; set; }

        [MaxLength(100)]
        public string? LastName { get; set; }

        [MaxLength(10)]
        public string? Gender { get; set; }

        public DateTime? DateOfBirth { get; set; }

        [MaxLength(100)]
        public string? Designation { get; set; }

        [MaxLength(100)]
        public string? Department { get; set; }

        public DateTime? JoiningDate { get; set; }

        [MaxLength(50)]
        public string? Qualification { get; set; }

        public int? Experience { get; set; }

        // Address Details
        public string? Address { get; set; }
        
        public string? PermanentAddress { get; set; }

        [MaxLength(100)]
        public string? City { get; set; }

        [MaxLength(50)]
        public string? State { get; set; }

        [MaxLength(10)]
        public string? Pincode { get; set; }

        // Contact Details
        [MaxLength(20)]
        public string? Phone { get; set; }

        [EmailAddress]
        [MaxLength(100)]
        public string? Email { get; set; }

        // Indian ID Documents
        [MaxLength(14)]
        public string? AadharNumber { get; set; }

        [MaxLength(10)]
        public string? PanNumber { get; set; }

        [MaxLength(20)]
        public string? PassportNumber { get; set; }

        // Professional Details
        [MaxLength(200)]
        public string? Specialization { get; set; }

        [MaxLength(20)]
        public string? EmploymentType { get; set; }

        public Guid? ReportingToId { get; set; }

        public string? Subjects { get; set; } // JSON array

        public string? Classes { get; set; } // JSON array

        // Banking Details
        [MaxLength(100)]
        public string? BankName { get; set; }

        [MaxLength(30)]
        public string? BankAccountNumber { get; set; }

        [MaxLength(15)]
        public string? IfscCode { get; set; }

        // PF/ESI Details
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

        [MaxLength(20)]
        public string? Status { get; set; }

        public decimal? Salary { get; set; }

        public string? ProfilePhoto { get; set; }
    }

    public class ResetStaffPasswordRequest
    {
        [Required]
        [MinLength(8, ErrorMessage = "Password must be at least 8 characters.")]
        public string NewPassword { get; set; } = string.Empty;
    }

    // Response DTOs
    // Lightweight DTO for GET list endpoints - only essential fields for performance
    // Used by: GET /api/staff (list view)
    public class StaffBasicResponse
    {
        public Guid Id { get; set; }
        public string EmployeeId { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Designation { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;  // active/inactive/on-leave
        public string? ProfilePhoto { get; set; }
    }
    // Note: For full staff details, use StaffResponse via GET /api/staff/{id}

    public class StaffResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string EmployeeId { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Gender { get; set; } = string.Empty;
        public DateTime DateOfBirth { get; set; }
        public string Designation { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public DateTime JoiningDate { get; set; }
        public string? Qualification { get; set; }
        public int Experience { get; set; }

        // Address Details
        public string? Address { get; set; }
        public string? PermanentAddress { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public string? Pincode { get; set; }

        // Contact Details
        public string Phone { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;

        // Indian ID Documents
        public string? AadharNumber { get; set; }
        public string? PanNumber { get; set; }
        public string? PassportNumber { get; set; }

        // Professional Details
        public string? Specialization { get; set; }
        public string EmploymentType { get; set; } = string.Empty;
        public Guid? ReportingToId { get; set; }
        public string? ReportingToName { get; set; }
        public string? Subjects { get; set; }
        public string? Classes { get; set; }

        // Banking Details
        public string? BankName { get; set; }
        public string? BankAccountNumber { get; set; }
        public string? IfscCode { get; set; }

        // PF/ESI Details
        public string? PfNumber { get; set; }
        public string? EsiNumber { get; set; }
        public string? UanNumber { get; set; }

        // Emergency Contact
        public string? EmergencyContactName { get; set; }
        public string? EmergencyContactPhone { get; set; }
        public string? EmergencyContactRelationship { get; set; }

        public string Status { get; set; } = string.Empty;
        public decimal? Salary { get; set; }
        public string? ProfilePhoto { get; set; }

        // Documents
        public List<StaffDocumentDto> Documents { get; set; } = new();

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class StaffListResponse
    {
        public List<StaffBasicResponse> Staff { get; set; } = new();
        public int Total { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages => PageSize > 0 ? (int)Math.Ceiling(Total / (double)PageSize) : 0;
    }

    public class StaffStatsResponse
    {
        public int TotalStaff { get; set; }
        public int ActiveStaff { get; set; }
        public int InactiveStaff { get; set; }
        public int OnLeave { get; set; }
        public Dictionary<string, int> ByDepartment { get; set; } = new();
        public Dictionary<string, int> ByDesignation { get; set; } = new();
        public Dictionary<string, int> ByEmploymentType { get; set; } = new();
    }

    public class BulkUpdateStaffRequest
    {
        [Required]
        public List<Guid> StaffIds { get; set; } = new();
        
        public string? Department { get; set; }
        public string? Status { get; set; }
        public decimal? Salary { get; set; }
    }

    public class BulkUpdateStaffStatusRequest
    {
        [Required]
        public List<Guid> StaffIds { get; set; } = new();
        
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = string.Empty;
    }

    // ===========================
    // Qualification DTOs
    // ===========================
    
    public class QualificationDto
    {
        public Guid Id { get; set; }
        public string QualificationType { get; set; } = string.Empty;
        public string DegreeName { get; set; } = string.Empty;
        public string InstitutionName { get; set; } = string.Empty;
        public string? UniversityBoard { get; set; }
        public string? Specialization { get; set; }
        public int YearOfPassing { get; set; }
        public string? Grade { get; set; }
        public decimal? Percentage { get; set; }
        public string? CertificateUrl { get; set; }
        public string? Remarks { get; set; }
    }

    public class CreateQualificationDto
    {
        [Required]
        [MaxLength(20)]
        public string QualificationType { get; set; } = string.Empty;

        [Required]
        [MaxLength(200)]
        public string DegreeName { get; set; } = string.Empty;

        [Required]
        [MaxLength(300)]
        public string InstitutionName { get; set; } = string.Empty;

        [MaxLength(200)]
        public string? UniversityBoard { get; set; }

        [MaxLength(100)]
        public string? Specialization { get; set; }

        [Required]
        public int YearOfPassing { get; set; }

        [MaxLength(20)]
        public string? Grade { get; set; }

        public decimal? Percentage { get; set; }

        [MaxLength(500)]
        public string? CertificateUrl { get; set; }

        [MaxLength(500)]
        public string? Remarks { get; set; }
    }

    public class UpdateQualificationDto
    {
        [MaxLength(20)]
        public string? QualificationType { get; set; }

        [MaxLength(200)]
        public string? DegreeName { get; set; }

        [MaxLength(300)]
        public string? InstitutionName { get; set; }

        [MaxLength(200)]
        public string? UniversityBoard { get; set; }

        [MaxLength(100)]
        public string? Specialization { get; set; }

        public int? YearOfPassing { get; set; }

        [MaxLength(20)]
        public string? Grade { get; set; }

        public decimal? Percentage { get; set; }

        [MaxLength(500)]
        public string? CertificateUrl { get; set; }

        [MaxLength(500)]
        public string? Remarks { get; set; }
    }

    // ===========================
    // PF/ESI DTOs
    // ===========================
    
    public class PFESIDetailsDto
    {
        public Guid StaffId { get; set; }
        public string? PfNumber { get; set; }
        public string? EsiNumber { get; set; }
        public string? UanNumber { get; set; }
    }

    public class UpdatePFESIDto
    {
        [MaxLength(30)]
        public string? PfNumber { get; set; }

        [MaxLength(20)]
        public string? EsiNumber { get; set; }

        [MaxLength(20)]
        public string? UanNumber { get; set; }
    }

    // ===========================
    // Bank Details DTOs
    // ===========================
    
    public class BankDetailsDto
    {
        public Guid StaffId { get; set; }
        public string? BankName { get; set; }
        public string? BankAccountNumber { get; set; }
        public string? IfscCode { get; set; }
    }

    public class UpdateBankDetailsDto
    {
        [MaxLength(100)]
        public string? BankName { get; set; }

        [MaxLength(30)]
        public string? BankAccountNumber { get; set; }

        [MaxLength(15)]
        public string? IfscCode { get; set; }
    }

    // ===========================
    // Performance Review DTOs
    // ===========================
    
    public class PerformanceReviewDto
    {
        public Guid Id { get; set; }
        public Guid StaffId { get; set; }
        public DateTime ReviewDate { get; set; }
        public string ReviewPeriod { get; set; } = string.Empty;
        public Guid ReviewerId { get; set; }
        public string ReviewerName { get; set; } = string.Empty;
        public int? TeachingQuality { get; set; }
        public int? ClassroomManagement { get; set; }
        public int? StudentEngagement { get; set; }
        public int? Punctuality { get; set; }
        public int? Professionalism { get; set; }
        public int? Collaboration { get; set; }
        public int? OverallRating { get; set; }
        public string? Strengths { get; set; }
        public string? AreasOfImprovement { get; set; }
        public string? Goals { get; set; }
        public string? Comments { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime? AcknowledgedAt { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreatePerformanceReviewDto
    {
        [Required]
        public DateTime ReviewDate { get; set; }

        [Required]
        [MaxLength(20)]
        public string ReviewPeriod { get; set; } = string.Empty;

        [Range(1, 5)]
        public int? TeachingQuality { get; set; }

        [Range(1, 5)]
        public int? ClassroomManagement { get; set; }

        [Range(1, 5)]
        public int? StudentEngagement { get; set; }

        [Range(1, 5)]
        public int? Punctuality { get; set; }

        [Range(1, 5)]
        public int? Professionalism { get; set; }

        [Range(1, 5)]
        public int? Collaboration { get; set; }

        [Range(1, 5)]
        public int? OverallRating { get; set; }

        [MaxLength(2000)]
        public string? Strengths { get; set; }

        [MaxLength(2000)]
        public string? AreasOfImprovement { get; set; }

        [MaxLength(2000)]
        public string? Goals { get; set; }

        [MaxLength(2000)]
        public string? Comments { get; set; }
    }

    // ===========================
    // Leave Balance DTOs
    // ===========================
    
    public class LeaveBalanceDto
    {
        public Guid StaffId { get; set; }
        public int CasualLeave { get; set; }
        public int SickLeave { get; set; }
        public int EarnedLeave { get; set; }
        public int MaternityLeave { get; set; }
        public int PaternityLeave { get; set; }
        public int UnpaidLeave { get; set; }
    }

    public class UpdateLeaveBalanceDto
    {
        public int? CasualLeave { get; set; }
        public int? SickLeave { get; set; }
        public int? EarnedLeave { get; set; }
        public int? MaternityLeave { get; set; }
        public int? PaternityLeave { get; set; }
        public int? UnpaidLeave { get; set; }
    }

    // ===========================
    // MASKED RESPONSE DTOs (For Security)
    // ===========================
    /// <summary>
    /// Staff response with masked sensitive data for non-admin users
    /// Hides: Bank account, PAN, Aadhar, ESI, Passport numbers
    /// </summary>
    public class StaffMaskedResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string EmployeeId { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Gender { get; set; } = string.Empty;
        public DateTime DateOfBirth { get; set; }
        public string Designation { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public DateTime JoiningDate { get; set; }
        public string? Qualification { get; set; }
        public int Experience { get; set; }

        // Address Details
        public string? City { get; set; }
        public string? State { get; set; }

        // Contact Details
        public string? MaskedPhone { get; set; } // XXXX-12345
        public string? MaskedEmail { get; set; } // j***@example.com

        // Indian ID Documents - MASKED
        public string? MaskedAadhar { get; set; } // XXXX-XXXX-XXXX-1234
        public string? MaskedPan { get; set; } // XXXX-XXXX-1234
        public string? MaskedPassport { get; set; } // XXXX-XXXX-1234

        // Professional Details
        public string? Specialization { get; set; }
        public string EmploymentType { get; set; } = string.Empty;
        public Guid? ReportingToId { get; set; }
        public string? ReportingToName { get; set; }

        // Banking Details - MASKED
        public string? BankName { get; set; }
        public string? MaskedBankAccount { get; set; } // XXXX-XXXX-XXXX-5678
        public string? IfscCode { get; set; }

        // PF/ESI Details - MASKED
        public string? MaskedPfNumber { get; set; }
        public string? MaskedEsiNumber { get; set; }

        // Emergency Contact - LIMITED INFO
        public string? EmergencyContactName { get; set; }
        public string? EmergencyContactRelationship { get; set; }

        public string Status { get; set; } = string.Empty;
        public decimal? Salary { get; set; }
        public string? ProfilePhoto { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    /// <summary>
    /// Staff list response with masked sensitive data
    /// </summary>
    public class StaffMaskedListResponse
    {
        public List<StaffBasicMaskedResponse> Staff { get; set; } = new();
        public int Total { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }

    public class StaffBasicMaskedResponse
    {
        public Guid Id { get; set; }
        public string EmployeeId { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Designation { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public string? MaskedEmail { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? ProfilePhoto { get; set; }
    }}