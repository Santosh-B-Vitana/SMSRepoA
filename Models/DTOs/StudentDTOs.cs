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
        public string Relation { get; set; } = string.Empty; // father, mother, guardian, other
        public string? Occupation { get; set; }
        public string? Employer { get; set; }
        public string Phone { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? AadharNumber { get; set; }
        public string? PanNumber { get; set; }
    }
    
    // Document DTO
    public class StudentDocumentDto
    {
        public Guid Id { get; set; }
        public string DocumentType { get; set; } = string.Empty;
        public string FileUrl { get; set; } = string.Empty;
        public string? FileName { get; set; }
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
        public DateTime AdmissionDate { get; set; }
        public string? PhotoUrl { get; set; }
        
        // Identification
        public string? AadharNumber { get; set; }
        public string? PanNumber { get; set; }
        public string? PassportNumber { get; set; }
        public string? VisaType { get; set; }
        public DateTime? VisaExpiry { get; set; }
        
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
        public string? TransferReason { get; set; }
        public string Category { get; set; } = string.Empty;
        
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
        public string? LanguageProficiency { get; set; } // JSON array
        public string? SpecialNeeds { get; set; }
        public bool TransportRequired { get; set; }
        public bool HostelRequired { get; set; }
        public string? SiblingIds { get; set; } // JSON array
        
        // Relations
        public List<GuardianDto>? Guardians { get; set; }
        public List<StudentDocumentDto>? Documents { get; set; }
        
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
        
        // Academic History
        [MaxLength(200)]
        public string? PreviousSchool { get; set; }
        
        [MaxLength(20)]
        public string? PreviousClass { get; set; }
        
        public string? TransferReason { get; set; }
        
        /// <summary>Allowed: General, OBC, SC, ST, EWS, Minority, Other</summary>
        [MaxLength(20)]
        public string Category { get; set; } = "General";
        
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
        
        // Academic
        [MaxLength(200)]
        public string? PreviousSchool { get; set; }
        
        [MaxLength(20)]
        public string? PreviousClass { get; set; }
        
        public string? TransferReason { get; set; }
        
        [MaxLength(20)]
        public string? Category { get; set; }
        
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
        public string? SiblingIds { get; set; }
        
        [MaxLength(20)]
        public string? Status { get; set; }
    }

    // Bulk Update Request
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
    }
    
    public class UpdateGuardianDto
    {
        [MaxLength(200)]
        public string? Name { get; set; }
        
        [MaxLength(20)]
        public string? Relation { get; set; }
        
        [MaxLength(100)]
        public string? Occupation { get; set; }
        
        [MaxLength(200)]
        public string? Employer { get; set; }
        
        [MaxLength(20)]
        public string? Phone { get; set; }
        
        [MaxLength(255)]
        [EmailAddress]
        public string? Email { get; set; }
        
        [MaxLength(14)]
        public string? AadharNumber { get; set; }
        
        [MaxLength(10)]
        public string? PanNumber { get; set; }
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
}
