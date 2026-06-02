using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SmsApi.Models.DTOs
{
    // Guardian DTO
    public class GuardianDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Surname { get; set; }
        public string Relation { get; set; } = string.Empty;
        public string? Qualification { get; set; }
        public string? Occupation { get; set; }
        public string? EmploymentType { get; set; }
        public string? Employer { get; set; }
        public string? OfficeAddress { get; set; }
        public string? OfficePhone { get; set; }
        public string? OfficeEmail { get; set; }
        public string? AnnualIncome { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? ResidentialAddress { get; set; }
        public string Phone { get; set; } = string.Empty;
        public string? HomePhone { get; set; }
        public string? Email { get; set; }
        public string? AadharNumber { get; set; }
        public string? PanNumber { get; set; }
        public string? PassportNumber { get; set; }
        public string? PhotoUrl { get; set; }
        public bool HasPortalAccess { get; set; }
    }
    
    // Document DTO
    public class StudentDocumentDto
    {
        public Guid Id { get; set; }
        public string DocumentType { get; set; } = string.Empty;
        public string FileUrl { get; set; } = string.Empty;
        public string? FileName { get; set; }
        public string? DocumentNumber { get; set; }
        public string? IssuingAuthority { get; set; }
        public DateTime? IssueDate { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public string VerificationStatus { get; set; } = "none";
        public DateTime? VerifiedAt { get; set; }
        public DateTime UploadedAt { get; set; }
    }

    // Basic Student Response (for lists)
    // Lightweight DTO for GET list endpoints - only essential fields for performance
    // Used by: GET /api/students (list view)
    public class StudentBasicResponse
    {
        public Guid Id { get; set; }
        public string AdmissionNumber { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty; // FirstName + LastName computed
        public string Class { get; set; } = string.Empty;
        public string Section { get; set; } = string.Empty;
        public string RollNumber { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty; // active/inactive
        public string? PhotoUrl { get; set; }
    }
    // Note: For full student details, use StudentResponse via GET /api/students/{id}

    // Full Student Response (for detail view)
    public class StudentResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        
        // Basic Information
        public string? FirstName { get; set; }
        public string? MiddleName { get; set; }
        public string? LastName { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? PreferredName { get; set; }
        public string? AdmissionNumber { get; set; }
        public string Class { get; set; } = string.Empty;
        public string Section { get; set; } = string.Empty;
        public string? RollNumber { get; set; }
        public DateTime DateOfBirth { get; set; }
        public string? PlaceOfBirth { get; set; }
        public string? Gender { get; set; }
        public string? Nationality { get; set; } // JSON array
        public string Status { get; set; } = string.Empty;
        public string? InactiveReason { get; set; }
        public DateTime? InactiveDate { get; set; }
        public DateTime AdmissionDate { get; set; }
        public string? PhotoUrl { get; set; }
        
        // Identification
        public string? AadharNumber { get; set; }
        public string? PanNumber { get; set; }
        public string? PassportNumber { get; set; }
        public string? VisaType { get; set; }
        public DateTime? VisaExpiry { get; set; }
        public string? RationCardNumber { get; set; }
        
        // Government / UDISE identifiers
        public string? PenNumber { get; set; }
        public string? UDISENumber { get; set; }
        public string? BoardRollNumber { get; set; }
        
        // Admission / Registration
        public string? RegistrationNumber { get; set; }
        public string? EnrollmentNumber { get; set; }
        public string? LedgerNumber { get; set; }
        public string? ApplicationFormNumber { get; set; }
        public string? ReasonToApply { get; set; }
        public string? KnownAboutSchoolBy { get; set; }
        
        // Contact Information
        public string Address { get; set; } = string.Empty;
        public string? PermanentAddress { get; set; }
        public string? PrimaryPhone { get; set; }
        public string? SecondaryPhone { get; set; }
        public string? Email { get; set; }
        
        // Primary Guardian
        public string GuardianName { get; set; } = string.Empty;
        public string GuardianPhone { get; set; } = string.Empty;
        
        // Academic History
        public string? PreviousSchool { get; set; }
        public string? PreviousClass { get; set; }
        public string? PreviousSchoolPlace { get; set; }
        public string? PreviousSchoolBoard { get; set; }
        public string? PreviousSchoolYearOfPassing { get; set; }
        public string? PreviousSchoolPercentage { get; set; }
        public string? PreviousSchoolMedium { get; set; }
        public string? TransferReason { get; set; }
        public string Category { get; set; } = string.Empty;
        public string? SubCaste { get; set; }
        
        // DISE demographic flags
        public bool IsMinority { get; set; }
        public bool IsBPL { get; set; }
        public bool IsDifferentlyAbled { get; set; }
        public string? DifferentlyAbledType { get; set; }
        public string? DifferentlyAbledPercentage { get; set; }
        
        // Cultural
        public string? Religion { get; set; }
        public string? Caste { get; set; }
        public string? MotherTongue { get; set; }
        
        // Medical Information
        public string? BloodGroup { get; set; }
        public string? Allergies { get; set; }
        public string? ChronicConditions { get; set; }
        public string? Medications { get; set; }
        public string? EmergencyContact { get; set; }
        public string? EmergencyPhone { get; set; }
        public string? DoctorName { get; set; }
        public string? DoctorPhone { get; set; }
        
        // Consent Flags
        public bool PhotoConsent { get; set; }
        public bool MediaConsent { get; set; }
        public bool MedicalConsent { get; set; }
        
        // Additional
        public string? LanguageProficiency { get; set; }
        public string? SpecialNeeds { get; set; }
        public bool TransportRequired { get; set; }
        public bool HostelRequired { get; set; }
        public string? CommunicationMode { get; set; }
        
        // Extracurricular
        public bool IsNCCCadet { get; set; }
        public string? NCCDetails { get; set; }
        public string? ExtraCurricularActivities { get; set; }
        
        // Report Card
        public string? ProgressReportRemarks { get; set; }
        public string? ProgressReportRemarksCBSE { get; set; }
        
        // Character Certificate
        public bool IsCharacterCertificateIssued { get; set; }
        public string? CharacterCertificateNumber { get; set; }
        
        public string? SiblingIds { get; set; } // legacy JSON; prefer Siblings collection

        /// <summary>Staff ID of the parent/guardian who is also a school staff member.</summary>
        public Guid? GuardianStaffId { get; set; }
        
        // Relations
        public List<GuardianDto>? Guardians { get; set; }
        public List<StudentDocumentDto>? Documents { get; set; }
        public List<StudentSiblingDto>? Siblings { get; set; }
        
        // Audit
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    // Create Student Request
    public class CreateStudentRequest
    {
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
        
        [Required(ErrorMessage = "Admission number is required")]
        [MaxLength(50)]
        public string AdmissionNumber { get; set; } = string.Empty;
        
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
        
        /// <summary>Allowed: male, female, other, prefer_not_to_say</summary>
        [MaxLength(10)]
        public string? Gender { get; set; }
        
        public string? Nationality { get; set; } // JSON array
        
        [Required]
        public DateTime AdmissionDate { get; set; }
        
        [MaxLength(500)]
        public string? PhotoUrl { get; set; }
        
        // Identification
        [MaxLength(14)]
        public string? AadharNumber { get; set; }
        
        [MaxLength(10)]
        public string? PanNumber { get; set; }
        
        [MaxLength(20)]
        public string? PassportNumber { get; set; }
        
        [MaxLength(50)]
        public string? VisaType { get; set; }
        
        public DateTime? VisaExpiry { get; set; }
        
        [MaxLength(20)]
        public string? RationCardNumber { get; set; }
        
        // Government / UDISE
        [MaxLength(20)]
        public string? PenNumber { get; set; }
        
        [MaxLength(20)]
        public string? UDISENumber { get; set; }
        
        [MaxLength(30)]
        public string? BoardRollNumber { get; set; }
        
        // Admission / Registration
        [MaxLength(50)]
        public string? RegistrationNumber { get; set; }
        
        [MaxLength(50)]
        public string? EnrollmentNumber { get; set; }
        
        [MaxLength(30)]
        public string? LedgerNumber { get; set; }
        
        [MaxLength(50)]
        public string? ApplicationFormNumber { get; set; }
        
        [MaxLength(500)]
        public string? ReasonToApply { get; set; }
        
        [MaxLength(200)]
        public string? KnownAboutSchoolBy { get; set; }
        
        // Contact Information
        [Required]
        public string Address { get; set; } = string.Empty;
        
        public string? PermanentAddress { get; set; }
        
        [MaxLength(20)]
        public string? PrimaryPhone { get; set; }
        
        [MaxLength(20)]
        public string? SecondaryPhone { get; set; }
        
        [MaxLength(255)]
        [EmailAddress]
        public string? Email { get; set; }
        
        // Primary Guardian
        [Required]
        [MaxLength(200)]
        public string GuardianName { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(20)]
        public string GuardianPhone { get; set; } = string.Empty;

        /// <summary>Guardian email — used as the username for parent portal login.</summary>
        [MaxLength(255)]
        [EmailAddress]
        public string? GuardianEmail { get; set; }
        
        // Academic History
        [MaxLength(200)]
        public string? PreviousSchool { get; set; }
        
        [MaxLength(20)]
        public string? PreviousClass { get; set; }
        
        [MaxLength(100)]
        public string? PreviousSchoolPlace { get; set; }
        
        [MaxLength(100)]
        public string? PreviousSchoolBoard { get; set; }
        
        [MaxLength(10)]
        public string? PreviousSchoolYearOfPassing { get; set; }
        
        [MaxLength(20)]
        public string? PreviousSchoolPercentage { get; set; }
        
        [MaxLength(100)]
        public string? PreviousSchoolMedium { get; set; }
        
        public string? TransferReason { get; set; }
        
        /// <summary>Allowed: General, OBC, SC, ST, EWS, Minority, Other</summary>
        [MaxLength(20)]
        public string Category { get; set; } = "General";
        
        [MaxLength(100)]
        public string? SubCaste { get; set; }
        
        // DISE flags
        public bool IsMinority { get; set; } = false;
        public bool IsBPL { get; set; } = false;
        public bool IsDifferentlyAbled { get; set; } = false;
        
        [MaxLength(100)]
        public string? DifferentlyAbledType { get; set; }
        
        [MaxLength(10)]
        public string? DifferentlyAbledPercentage { get; set; }
        
        // Cultural Information
        [MaxLength(50)]
        public string? Religion { get; set; }
        
        [MaxLength(50)]
        public string? Caste { get; set; }
        
        [MaxLength(100)]
        public string? MotherTongue { get; set; }
        
        // Medical Information
        /// <summary>Allowed: A+, A-, B+, B-, O+, O-, AB+, AB-, Unknown</summary>
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
        public string? LanguageProficiency { get; set; }
        public string? SpecialNeeds { get; set; }
        public bool TransportRequired { get; set; } = false;
        public bool HostelRequired { get; set; } = false;
        
        [MaxLength(50)]
        public string? CommunicationMode { get; set; }
        
        // Extracurricular
        public bool IsNCCCadet { get; set; } = false;
        
        [MaxLength(500)]
        public string? NCCDetails { get; set; }
        
        public string? ExtraCurricularActivities { get; set; }
        
        // Report card
        public string? ProgressReportRemarks { get; set; }
        public string? ProgressReportRemarksCBSE { get; set; }
        
        public string? SiblingIds { get; set; }
        
        [MaxLength(20)]
        public string Status { get; set; } = "active";
    }

    // Update Student Request
    public class UpdateStudentRequest
    {
        [MaxLength(200)]
        public string? Name { get; set; }
        
        [MaxLength(100)]
        public string? PreferredName { get; set; }
        
        [MaxLength(20)]
        public string? Class { get; set; }
        
        [MaxLength(10)]
        public string? Section { get; set; }
        
        [MaxLength(20)]
        public string? RollNumber { get; set; }
        
        public DateTime? DateOfBirth { get; set; }
        
        [MaxLength(100)]
        public string? PlaceOfBirth { get; set; }
        
        [MaxLength(10)]
        public string? Gender { get; set; }
        
        public string? Nationality { get; set; }
        
        [MaxLength(500)]
        public string? PhotoUrl { get; set; }
        
        // Identification
        [MaxLength(14)]
        public string? AadharNumber { get; set; }
        
        [MaxLength(10)]
        public string? PanNumber { get; set; }
        
        [MaxLength(20)]
        public string? PassportNumber { get; set; }
        
        [MaxLength(50)]
        public string? VisaType { get; set; }
        
        public DateTime? VisaExpiry { get; set; }
        
        [MaxLength(20)]
        public string? RationCardNumber { get; set; }
        
        // Contact
        public string? Address { get; set; }
        public string? PermanentAddress { get; set; }
        
        [MaxLength(20)]
        public string? PrimaryPhone { get; set; }
        
        [MaxLength(20)]
        public string? SecondaryPhone { get; set; }
        
        [MaxLength(255)]
        [EmailAddress]
        public string? Email { get; set; }
        
        [MaxLength(200)]
        public string? GuardianName { get; set; }
        
        [MaxLength(20)]
        public string? GuardianPhone { get; set; }

        /// <summary>Guardian email — used as the username for parent portal login.</summary>
        [MaxLength(255)]
        [EmailAddress]
        public string? GuardianEmail { get; set; }
        
        // Academic
        [MaxLength(200)]
        public string? PreviousSchool { get; set; }
        
        [MaxLength(20)]
        public string? PreviousClass { get; set; }
        
        public string? TransferReason { get; set; }
        
        [MaxLength(20)]
        public string? Category { get; set; }
        
        [MaxLength(100)]
        public string? SubCaste { get; set; }
        
        public bool? IsMinority { get; set; }
        public bool? IsBPL { get; set; }
        public bool? IsDifferentlyAbled { get; set; }
        
        [MaxLength(100)]
        public string? DifferentlyAbledType { get; set; }
        
        [MaxLength(10)]
        public string? DifferentlyAbledPercentage { get; set; }
        
        // Government / UDISE
        [MaxLength(20)]
        public string? PenNumber { get; set; }
        
        [MaxLength(20)]
        public string? UDISENumber { get; set; }
        
        [MaxLength(30)]
        public string? BoardRollNumber { get; set; }
        
        [MaxLength(50)]
        public string? RegistrationNumber { get; set; }
        
        [MaxLength(50)]
        public string? EnrollmentNumber { get; set; }
        
        [MaxLength(30)]
        public string? LedgerNumber { get; set; }
        
        // Previous school details
        [MaxLength(100)]
        public string? PreviousSchoolPlace { get; set; }
        
        [MaxLength(100)]
        public string? PreviousSchoolBoard { get; set; }
        
        [MaxLength(10)]
        public string? PreviousSchoolYearOfPassing { get; set; }
        
        [MaxLength(20)]
        public string? PreviousSchoolPercentage { get; set; }
        
        [MaxLength(100)]
        public string? PreviousSchoolMedium { get; set; }
        
        // Medical
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
        
        // Consent
        public bool? PhotoConsent { get; set; }
        public bool? MediaConsent { get; set; }
        public bool? MedicalConsent { get; set; }
        
        // Additional
        public string? LanguageProficiency { get; set; }
        public string? SpecialNeeds { get; set; }
        public bool? TransportRequired { get; set; }
        public bool? HostelRequired { get; set; }
        
        [MaxLength(50)]
        public string? CommunicationMode { get; set; }
        
        public bool? IsNCCCadet { get; set; }
        
        [MaxLength(500)]
        public string? NCCDetails { get; set; }
        
        public string? ExtraCurricularActivities { get; set; }
        public string? ProgressReportRemarks { get; set; }
        public string? ProgressReportRemarksCBSE { get; set; }
        
        public string? SiblingIds { get; set; }
        
        [MaxLength(20)]
        public string? Status { get; set; }

        [MaxLength(100)]
        public string? InactiveReason { get; set; }
        public DateTime? InactiveDate { get; set; }
    }
    public class BulkUpdateStudentsRequest
    {
        public List<Guid> StudentIds { get; set; } = new();
        public string? Class { get; set; }
        public string? Section { get; set; }
        public string? Status { get; set; }
    }

    // Student Stats Response
    public class StudentStatsResponse
    {
        public int Total { get; set; }
        public int Active { get; set; }
        public int Inactive { get; set; }
        public int Transferred { get; set; }
        public int Graduated { get; set; }
        public Dictionary<string, int> ByClass { get; set; } = new();
        public Dictionary<string, int> ByGender { get; set; } = new();
        public Dictionary<string, int> ByCategory { get; set; } = new();
    }

    // Bulk Operations DTOs
    public class BulkPromoteRequest
    {
        [Required]
        public List<Guid> StudentIds { get; set; } = new();
        
        [Required]
        [MaxLength(20)]
        public string NewClass { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(20)]
        public string NewSection { get; set; } = string.Empty;

        [MaxLength(20)]
        public string? AcademicYear { get; set; }
    }

    public class StudentFiltersDto
    {
        public Guid? ClassId { get; set; }
        public string? Class { get; set; }
        public string? Section { get; set; }
        public string? Status { get; set; }
        public string? Category { get; set; }
        public string? SearchQuery { get; set; }
        public DateTime? DateOfBirthFrom { get; set; }
        public DateTime? DateOfBirthTo { get; set; }
        public string? AcademicYear { get; set; }
    }

    public class BulkUpdateRequest
    {
        [Required]
        public List<Guid> StudentIds { get; set; } = new();
        
        [MaxLength(20)]
        public string? Class { get; set; }
        
        [MaxLength(20)]
        public string? Section { get; set; }
        
        [MaxLength(20)]
        public string? Status { get; set; }
    }

    public class BulkOperationResult
    {
        public int SuccessCount { get; set; }
        public int FailureCount { get; set; }
        public List<string> Errors { get; set; } = new();
        /// <summary>IDs of successfully created/updated students.</summary>
        public List<Guid> SuccessfulIds { get; set; } = new();
        /// <summary>Admission numbers of successfully processed students.</summary>
        public List<string> SuccessfulAdmissionNumbers { get; set; } = new();
    }

    // Distinct classes and sections for filter dropdowns
    public class StudentClassesSectionsResponse
    {
        public List<string> Classes { get; set; } = new();
        public List<string> Sections { get; set; } = new();
    }

    // Student List Response
    public class StudentListResponse
    {
        public List<StudentBasicResponse> Students { get; set; } = new();
        public int Total { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        /// <summary>Total number of pages at the current pageSize. Computed server-side.</summary>
        public int TotalPages => PageSize > 0 ? (int)Math.Ceiling(Total / (double)PageSize) : 0;
    }
    
    // Guardian Create/Update DTOs
    public class CreateGuardianDto
    {
        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;
        
        [MaxLength(100)]
        public string? Surname { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string Relation { get; set; } = string.Empty;
        
        [MaxLength(100)]
        public string? Qualification { get; set; }
        
        [MaxLength(100)]
        public string? Occupation { get; set; }
        
        [MaxLength(50)]
        public string? EmploymentType { get; set; }
        
        [MaxLength(200)]
        public string? Employer { get; set; }
        
        [MaxLength(200)]
        public string? OfficeAddress { get; set; }
        
        [MaxLength(20)]
        public string? OfficePhone { get; set; }
        
        [MaxLength(255)]
        [EmailAddress]
        public string? OfficeEmail { get; set; }
        
        [MaxLength(100)]
        public string? AnnualIncome { get; set; }
        
        public DateTime? DateOfBirth { get; set; }
        
        [MaxLength(200)]
        public string? ResidentialAddress { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string Phone { get; set; } = string.Empty;
        
        [MaxLength(20)]
        public string? HomePhone { get; set; }
        
        [MaxLength(255)]
        [EmailAddress]
        public string? Email { get; set; }
        
        [MaxLength(14)]
        public string? AadharNumber { get; set; }
        
        [MaxLength(10)]
        public string? PanNumber { get; set; }
        
        [MaxLength(20)]
        public string? PassportNumber { get; set; }
        
        [MaxLength(500)]
        public string? PhotoUrl { get; set; }
    }
    
    public class UpdateGuardianDto
    {
        [MaxLength(200)]
        public string? Name { get; set; }
        
        [MaxLength(100)]
        public string? Surname { get; set; }
        
        [MaxLength(20)]
        public string? Relation { get; set; }
        
        [MaxLength(100)]
        public string? Qualification { get; set; }
        
        [MaxLength(100)]
        public string? Occupation { get; set; }
        
        [MaxLength(50)]
        public string? EmploymentType { get; set; }
        
        [MaxLength(200)]
        public string? Employer { get; set; }
        
        [MaxLength(200)]
        public string? OfficeAddress { get; set; }
        
        [MaxLength(20)]
        public string? OfficePhone { get; set; }
        
        [MaxLength(255)]
        [EmailAddress]
        public string? OfficeEmail { get; set; }
        
        [MaxLength(100)]
        public string? AnnualIncome { get; set; }
        
        public DateTime? DateOfBirth { get; set; }
        
        [MaxLength(200)]
        public string? ResidentialAddress { get; set; }
        
        [MaxLength(20)]
        public string? Phone { get; set; }
        
        [MaxLength(20)]
        public string? HomePhone { get; set; }
        
        [MaxLength(255)]
        [EmailAddress]
        public string? Email { get; set; }
        
        [MaxLength(14)]
        public string? AadharNumber { get; set; }
        
        [MaxLength(10)]
        public string? PanNumber { get; set; }
        
        [MaxLength(20)]
        public string? PassportNumber { get; set; }
        
        [MaxLength(500)]
        public string? PhotoUrl { get; set; }
    }

    // ─── Student Document Create DTO ──────────────────────────────────────────
    public class CreateStudentDocumentDto
    {
        [Required]
        [MaxLength(50)]
        public string DocumentType { get; set; } = string.Empty;
        
        [MaxLength(100)]
        public string? DocumentNumber { get; set; }
        
        [MaxLength(200)]
        public string? IssuingAuthority { get; set; }
        
        public DateTime? IssueDate { get; set; }
        
        public DateTime? ExpiryDate { get; set; }
    }

    public class VerifyDocumentDto
    {
        // verified | rejected
        [Required]
        [MaxLength(20)]
        public string VerificationStatus { get; set; } = string.Empty;
    }

    // ─── StudentSibling DTOs ──────────────────────────────────────────────────
    public class StudentSiblingDto
    {
        public Guid SiblingId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? AdmissionNumber { get; set; }
        public string Class { get; set; } = string.Empty;
        public string Section { get; set; } = string.Empty;
        public string? PhotoUrl { get; set; }
    }

    public class AddSiblingRequest
    {
        [Required]
        public Guid SiblingStudentId { get; set; }
    }

    // ─── StudentAnnualHealth DTOs ─────────────────────────────────────────────
    public class StudentAnnualHealthDto
    {
        public Guid Id { get; set; }
        public string AcademicYear { get; set; } = string.Empty;
        public string? Weight { get; set; }
        public string? Height { get; set; }
        public string? VisionLeft { get; set; }
        public string? VisionRight { get; set; }
        public string? DentalHygiene { get; set; }
        public string? Remarks { get; set; }
        public DateTime ExaminedOn { get; set; }
        public string? ExaminedBy { get; set; }
    }

    public class UpsertAnnualHealthRequest
    {
        [Required]
        [MaxLength(20)]
        public string AcademicYear { get; set; } = string.Empty;
        
        [MaxLength(10)]
        public string? Weight { get; set; }
        
        [MaxLength(10)]
        public string? Height { get; set; }
        
        [MaxLength(20)]
        public string? VisionLeft { get; set; }
        
        [MaxLength(20)]
        public string? VisionRight { get; set; }
        
        [MaxLength(50)]
        public string? DentalHygiene { get; set; }
        
        [MaxLength(500)]
        public string? Remarks { get; set; }
        
        public DateTime? ExaminedOn { get; set; }
        
        [MaxLength(200)]
        public string? ExaminedBy { get; set; }
    }

    // ─── Hobby / Club DTOs ────────────────────────────────────────────────────
    public class HobbyDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Category { get; set; }
        public bool IsActive { get; set; }
    }

    public class CreateHobbyRequest
    {
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [MaxLength(50)]
        public string? Category { get; set; }
    }

    public class StudentHobbyEnrollmentDto
    {
        public Guid Id { get; set; }
        public Guid HobbyId { get; set; }
        public string HobbyName { get; set; } = string.Empty;
        public string? HobbyCategory { get; set; }
        public string AcademicYear { get; set; } = string.Empty;
        public string? Remarks { get; set; }
    }

    public class EnrollHobbyRequest
    {
        [Required]
        public Guid HobbyId { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string AcademicYear { get; set; } = string.Empty;
        
        [MaxLength(500)]
        public string? Remarks { get; set; }
    }

    public class BulkEnrollHobbiesRequest
    {
        [Required]
        public List<Guid> HobbyIds { get; set; } = new();
        
        [Required]
        [MaxLength(20)]
        public string AcademicYear { get; set; } = string.Empty;
    }

    // ─── StudentPermissionSlip DTOs ───────────────────────────────────────────
    public class StudentPermissionSlipDto
    {
        public Guid Id { get; set; }
        public Guid StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string AcademicYear { get; set; } = string.Empty;
        public string? OutWith { get; set; }
        public string? OutWithRelation { get; set; }
        public string? Reason { get; set; }
        public DateTime OutDate { get; set; }
        public string? OutTime { get; set; }
        public string Status { get; set; } = "pending";
        public string? ReviewRemarks { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreatePermissionSlipRequest
    {
        [Required]
        [MaxLength(20)]
        public string AcademicYear { get; set; } = string.Empty;
        
        [MaxLength(200)]
        public string? OutWith { get; set; }
        
        [MaxLength(50)]
        public string? OutWithRelation { get; set; }
        
        [MaxLength(500)]
        public string? Reason { get; set; }
        
        [Required]
        public DateTime OutDate { get; set; }
        
        [MaxLength(10)]
        public string? OutTime { get; set; }
    }

    public class ReviewPermissionSlipRequest
    {
        // approved | rejected
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = string.Empty;
        
        [MaxLength(500)]
        public string? Remarks { get; set; }
    }

    // ─── Transfer Certificate DTOs ────────────────────────────────────────────
    public class TransferCertificateDto
    {
        public Guid Id { get; set; }
        public Guid StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string? AdmissionNumber { get; set; }
        public string? TCNumber { get; set; }
        public int? AutoTCNumber { get; set; }
        public string? TCNumberPrefix { get; set; }
        public DateTime? ApplicationDate { get; set; }
        public DateTime? IssuedDate { get; set; }
        public string? ExitAcademicYear { get; set; }
        public string? ExitClass { get; set; }
        public string? ExitSection { get; set; }
        public string? ReasonForLeaving { get; set; }
        public string? Conduct { get; set; }
        public bool IsTCIssued { get; set; }
        public bool IsFailedInLastClass { get; set; }
        public string? LastAnnualExamResult { get; set; }
        public bool IsQualifiedForHigherClass { get; set; }
        public string? QualifiedToClass { get; set; }
        public string? DetainedInSameClass { get; set; }
        public string? DatePupilStruck { get; set; }
        public string? AdditionalRemarks { get; set; }
        public bool IsCharacterCertificateIssued { get; set; }
        public string? CharacterCertificateNumber { get; set; }
        public DateTime? CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public class CreateTransferCertificateRequest
    {
        [MaxLength(30)]
        public string? TCNumber { get; set; }
        
        [MaxLength(10)]
        public string? TCNumberPrefix { get; set; }
        
        public DateTime? ApplicationDate { get; set; }
        
        [MaxLength(20)]
        public string? ExitAcademicYear { get; set; }
        
        [MaxLength(100)]
        public string? ExitClass { get; set; }
        
        [MaxLength(20)]
        public string? ExitSection { get; set; }
        
        [MaxLength(500)]
        public string? ReasonForLeaving { get; set; }
        
        [MaxLength(100)]
        public string? Conduct { get; set; }
        
        public bool IsFailedInLastClass { get; set; } = false;
        
        [MaxLength(100)]
        public string? LastAnnualExamResult { get; set; }
        
        public bool IsQualifiedForHigherClass { get; set; } = false;
        
        [MaxLength(100)]
        public string? QualifiedToClass { get; set; }
        
        public string? AdditionalRemarks { get; set; }
    }

    public class IssueTCRequest
    {
        public DateTime IssuedDate { get; set; } = DateTime.UtcNow;
        
        [MaxLength(30)]
        public string? TCNumber { get; set; }
        
        public bool IssueCharacterCertificate { get; set; } = false;
    }

    // ─── Roll Number Assignment ────────────────────────────────────────────────
    public class RollNumberAssignmentRequest
    {
        [Required]
        [MaxLength(20)]
        public string Class { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(10)]
        public string Section { get; set; } = string.Empty;
        
        // Map of StudentId → RollNumber
        [Required]
        public Dictionary<Guid, string> Assignments { get; set; } = new();
    }

    public class RollNumberStudentDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? AdmissionNumber { get; set; }
        public string? Gender { get; set; }
        public string? RollNumber { get; set; }
    }

    // ========== STUDENT PROMOTION ==========
    public class PromoteStudentRequest
    {
        [Required]
        [MaxLength(20)]
        public string NewClass { get; set; } = string.Empty;

        [MaxLength(10)]
        public string? NewSection { get; set; }

        [MaxLength(50)]
        public string? AcademicYear { get; set; }

        public bool ResetRollNumber { get; set; } = false;

        [MaxLength(500)]
        public string? Remarks { get; set; }

    }

    // ========== STUDENT PROFILE SUMMARY (cross-module) ==========

    public class StudentFeeSummary
    {
        public decimal TotalAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal PendingAmount { get; set; }
        public string Status { get; set; } = string.Empty;
        public string AcademicYear { get; set; } = string.Empty;
        public DateTime? LastPaymentDate { get; set; }
        public int TotalRecords { get; set; }
    }

    public class StudentAttendanceSummary
    {
        public int TotalDays { get; set; }
        public int PresentDays { get; set; }
        public int AbsentDays { get; set; }
        public int LateDays { get; set; }
        public double AttendancePercent { get; set; }
        public List<StudentAttendanceRecord> RecentRecords { get; set; } = new();
    }

    public class StudentAttendanceRecord
    {
        public DateTime Date { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? Remarks { get; set; }
        public bool IsManualOverride { get; set; }
    }

    public class StudentExamSummary
    {
        public List<StudentExamResult> Results { get; set; } = new();
    }

    public class StudentExamResult
    {
        public string ExamName { get; set; } = string.Empty;
        public string Subject { get; set; } = string.Empty;
        public decimal MarksObtained { get; set; }
        public int TotalMarks { get; set; }
        public double Percentage { get; set; }
        public string? Grade { get; set; }
        public bool IsAbsent { get; set; }
        public DateTime ExamDate { get; set; }
    }

    public class StudentTransportInfo
    {
        public Guid AssignmentId { get; set; }
        public string RouteName { get; set; } = string.Empty;
        public string RouteNumber { get; set; } = string.Empty;
        public string? PickupPoint { get; set; }
        public string? DropPoint { get; set; }
        public decimal MonthlyFee { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? VehicleNumber { get; set; }
        public string? DriverName { get; set; }
        public string? DriverPhone { get; set; }
    }

    public class StudentHostelInfo
    {
        public Guid AssignmentId { get; set; }
        public string RoomNumber { get; set; } = string.Empty;
        public string? RoomType { get; set; }
        public string? Floor { get; set; }
        public decimal MonthlyFee { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CheckInDate { get; set; }
        public DateTime? CheckOutDate { get; set; }
    }

    public class StudentHealthInfo
    {
        public Guid RecordId { get; set; }
        public DateTime CheckupDate { get; set; }
        public decimal? Height { get; set; }
        public decimal? Weight { get; set; }
        public double? Bmi { get; set; }
        public string? BloodGroup { get; set; }
        public string? VisionLeft { get; set; }
        public string? VisionRight { get; set; }
        public string? Allergies { get; set; }
        public string? ChronicConditions { get; set; }
        public string? Medications { get; set; }
        public string? Vaccinations { get; set; }
        public string? Notes { get; set; }
        public string? CheckedBy { get; set; }
    }

    public class StudentVisitorRecord
    {
        public Guid VisitorLogId { get; set; }
        public string VisitorName { get; set; } = string.Empty;
        public string? VisitorPhone { get; set; }
        public string Purpose { get; set; } = string.Empty;
        public DateTime CheckInTime { get; set; }
        public DateTime? CheckOutTime { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    public class StudentProfileSummary
    {
        public StudentBasicResponse Student { get; set; } = new();
        public StudentFeeSummary? Fee { get; set; }
        public StudentAttendanceSummary? Attendance { get; set; }
        public StudentExamSummary? Exams { get; set; }
        public StudentTransportInfo? Transport { get; set; }
        public StudentHostelInfo? Hostel { get; set; }
        public List<StudentHealthInfo> HealthRecords { get; set; } = new();
        public List<StudentVisitorRecord> VisitorHistory { get; set; } = new();
    }

    public class SetGuardianStaffRequest
    {
        /// <summary>Staff member ID who is the parent/guardian. Null to unlink.</summary>
        public Guid? StaffId { get; set; }
    }

    public class GuardianStaffDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Designation { get; set; }
        public string? Department { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? ProfilePhoto { get; set; }
    }

    public class StaffChildDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? AdmissionNumber { get; set; }
        public string Class { get; set; } = string.Empty;
        public string Section { get; set; } = string.Empty;
        public string? RollNumber { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? PhotoUrl { get; set; }
    }

    // ============================================================
    // STUDENT EXIT — Drop-Out & Pass-Out
    // ============================================================

    /// <summary>
    /// Lightweight summary of a single pending fee record returned by the
    /// exit-clearance check.
    /// </summary>
    public class ExitPendingFeeDto
    {
        public Guid FeeRecordId { get; set; }
        public string FeeType { get; set; } = string.Empty;
        public string AcademicYear { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal PendingAmount { get; set; }
        public DateTime? DueDate { get; set; }
    }

    /// <summary>
    /// Returned by GET /api/students/{id}/exit-clearance — tells the UI
    /// exactly what is outstanding and what documents are available.
    /// </summary>
    public class ExitClearanceResponse
    {
        public Guid StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string CurrentClass { get; set; } = string.Empty;
        public string? CurrentSection { get; set; }
        public string AcademicYear { get; set; } = string.Empty;

        /// <summary>True when total pending == 0.</summary>
        public bool IsFeeClear { get; set; }
        public decimal TotalPendingAmount { get; set; }
        public List<ExitPendingFeeDto> PendingFees { get; set; } = new();

        /// <summary>
        /// Documents that can be generated for this student.
        /// Each entry is pre-populated with data the UI can display / edit.
        /// </summary>
        public List<ExitDocumentDto> AvailableDocuments { get; set; } = new();
    }

    /// <summary>
    /// Represents a single document that can be generated on exit.
    /// The <see cref="Fields"/> dictionary holds auto-populated key→value pairs
    /// that the user can edit before confirming.
    /// </summary>
    public class ExitDocumentDto
    {
        /// <summary>
        /// Stable key used to reference this document in the exit request.
        /// E.g. "transfer_certificate", "character_certificate", "bonafide_certificate".
        /// </summary>
        public string DocumentKey { get; set; } = string.Empty;

        /// <summary>Human-readable display name.</summary>
        public string Title { get; set; } = string.Empty;

        /// <summary>Whether this document is mandatory for this exit type.</summary>
        public bool IsMandatory { get; set; }

        /// <summary>Auto-populated field values — can be overridden by the user.</summary>
        public Dictionary<string, string> Fields { get; set; } = new();
    }

    /// <summary>Request body for POST /api/students/{id}/dropout</summary>
    public class StudentDropoutRequest
    {
        /// <summary>
        /// "transfer" — student moving to another school (TC issued, marks inactive).
        /// "detain" — student fails / stays in same class (no TC needed, remains active).
        /// </summary>
        [Required]
        [MaxLength(20)]
        public string DropoutType { get; set; } = "transfer"; // transfer | detain

        [MaxLength(200)]
        public string? DestinationSchool { get; set; }

        [MaxLength(500)]
        public string? Reason { get; set; }

        [MaxLength(100)]
        public string? Conduct { get; set; }

        /// <summary>Whether the fee dues have been cleared (confirmed by admin).</summary>
        public bool FeeClearanceConfirmed { get; set; }

        /// <summary>Documents to generate on exit, with possibly edited field values.</summary>
        public List<ExitDocumentRequest> DocumentsToGenerate { get; set; } = new();

        [MaxLength(1000)]
        public string? Remarks { get; set; }
    }

    /// <summary>Request body for POST /api/students/{id}/passout</summary>
    public class StudentPassoutRequest
    {
        [Required]
        [MaxLength(20)]
        public string AcademicYear { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? PassingClass { get; set; }

        [MaxLength(200)]
        public string? DestinationSchool { get; set; }

        [MaxLength(500)]
        public string? Reason { get; set; }

        [MaxLength(100)]
        public string? Conduct { get; set; }

        public bool FeeClearanceConfirmed { get; set; }

        public List<ExitDocumentRequest> DocumentsToGenerate { get; set; } = new();

        [MaxLength(1000)]
        public string? Remarks { get; set; }
    }

    /// <summary>
    /// A document included in a dropout/passout request.
    /// <see cref="Fields"/> contains values the user may have edited.
    /// </summary>
    public class ExitDocumentRequest
    {
        [Required]
        public string DocumentKey { get; set; } = string.Empty;

        /// <summary>Edited field values (overrides auto-population).</summary>
        public Dictionary<string, string> Fields { get; set; } = new();
    }

    /// <summary>Returned by the dropout / passout endpoints.</summary>
    public class StudentExitResponse
    {
        public Guid StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string ExitType { get; set; } = string.Empty;   // dropout | passout
        public string SubType { get; set; } = string.Empty;    // transfer | detain | passout
        public string NewStatus { get; set; } = string.Empty;  // inactive | active (detain)
        public Guid? AlumniId { get; set; }
        public string? AlumniMessage { get; set; }
        public List<GeneratedDocumentDto> GeneratedDocuments { get; set; } = new();
        public string Message { get; set; } = string.Empty;
    }

    public class GeneratedDocumentDto
    {
        public string DocumentKey { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        /// <summary>Populated field values that were actually used.</summary>
        public Dictionary<string, string> Fields { get; set; } = new();
        /// <summary>Optional URL if the document was persisted to storage.</summary>
        public string? FileUrl { get; set; }
    }
}
