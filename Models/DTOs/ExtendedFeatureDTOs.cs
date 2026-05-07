using System;
using System.Collections.Generic;

namespace SmsApi.Models.DTOs
{
    // Leave Type DTOs
    public class CreateLeaveTypeRequest
    {
        public Guid SchoolId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string ApplicableTo { get; set; } = "All";
        public int MaxDaysPerYear { get; set; }
        public bool RequiresApproval { get; set; } = true;
        public bool RequiresDocument { get; set; } = false;
        public int MinNoticeDays { get; set; }
        public bool IsCarryForward { get; set; } = false;
        public bool IsPaid { get; set; } = true;
        public Guid CreatedBy { get; set; }
    }

    public class UpdateLeaveTypeRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int MaxDaysPerYear { get; set; }
        public bool RequiresApproval { get; set; }
        public bool RequiresDocument { get; set; }
        public int MinNoticeDays { get; set; }
        public bool IsCarryForward { get; set; }
        public bool IsPaid { get; set; }
        public bool IsActive { get; set; }
        public Guid UpdatedBy { get; set; }
    }

    public class LeaveTypeResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string ApplicableTo { get; set; } = string.Empty;
        public int MaxDaysPerYear { get; set; }
        public bool RequiresApproval { get; set; }
        public bool RequiresDocument { get; set; }
        public int MinNoticeDays { get; set; }
        public bool IsCarryForward { get; set; }
        public bool IsPaid { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class LeaveTypeListResponse
    {
        public List<LeaveTypeResponse> Items { get; set; } = new();
        public int TotalCount { get; set; }
    }

    // Leave Request DTOs
    public class CreateLeaveRequestRequest
    {
        public Guid SchoolId { get; set; }
        public Guid ApplicantId { get; set; }
        public string ApplicantType { get; set; } = string.Empty;
        public Guid LeaveTypeId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string? DocumentUrl { get; set; }
        public string? EmergencyContact { get; set; }
    }

    public class UpdateLeaveRequestRequest
    {
        public string Status { get; set; } = string.Empty;
        public string? ApproverRemarks { get; set; }
    }

    public class LeaveRequestResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string LeaveNumber { get; set; } = string.Empty;
        public Guid ApplicantId { get; set; }
        public string ApplicantType { get; set; } = string.Empty;
        public string? ApplicantName { get; set; }
        public string? ApplicantEmail { get; set; }
        public string? ApplicantDesignation { get; set; }
        public Guid LeaveTypeId { get; set; }
        public string? LeaveTypeName { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int TotalDays { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string? DocumentUrl { get; set; }
        public string? EmergencyContact { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime ApplicationDate { get; set; }
        public Guid? ApprovedByStaffId { get; set; }
        public string? ApprovedByStaffName { get; set; }
        public DateTime? ApprovedDate { get; set; }
        public string? ApproverRemarks { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    // Leave Balance DTOs
    public class LeaveBalanceResponse
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string UserType { get; set; } = string.Empty;
        public Guid LeaveTypeId { get; set; }
        public string? LeaveTypeName { get; set; }
        public string AcademicYear { get; set; } = string.Empty;
        public int TotalAllowed { get; set; }
        public int Used { get; set; }
        public int Available { get; set; }
        public int CarriedForward { get; set; }
    }

    // ========== VISITOR BASIC DTO (for GET list) ==========
    public class VisitorBasicDto
    {
        public Guid Id { get; set; }
        public Guid? VisitorId { get; set; }
        public string? VisitNumber { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? VisitorName { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? Organization { get; set; }
        public string Purpose { get; set; } = string.Empty;
        public string? PersonToMeet { get; set; }
        public string? Department { get; set; }
        public DateTime CheckIn { get; set; }
        public DateTime? CheckOut { get; set; }
        public DateTime CheckInTime { get; set; }
        public DateTime? CheckOutTime { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? BadgeNumber { get; set; }
        public bool HasVehicle { get; set; }
        public string? VehicleNumber { get; set; }
        public int? VisitDuration { get; set; }
        public bool IsBlacklisted { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    // ========== VISITOR FULL DTO (for GET by ID) ==========
    public class VisitorFullDto
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid? VisitorId { get; set; }
        public string? VisitNumber { get; set; }
        
        // Personal Info
        public string Name { get; set; } = string.Empty;
        public string? VisitorName { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? Address { get; set; }
        public string? Company { get; set; }
        public string? Organization { get; set; }
        public string? Designation { get; set; }
        
        // Visit Details
        public string Purpose { get; set; } = string.Empty;
        public string? PurposeDetails { get; set; }
        public string? PersonToMeet { get; set; }
        public string? PersonToMeetDesignation { get; set; }
        public Guid? PersonToMeetId { get; set; }
        public string? Department { get; set; }
        
        // Additional Visit Details
        public Guid? StaffMeetingId { get; set; }
        public string? ItemsCarried { get; set; }
        public string? PassNumber { get; set; }
        
        // ID Verification
        public string IdProof { get; set; } = string.Empty;
        public string? IdProofNumber { get; set; }
        public string? IdProofPhoto { get; set; }
        public string? IdType { get; set; }
        public string? IdNumber { get; set; }
        
        // Vehicle
        public bool HasVehicle { get; set; }
        public string? VehicleNumber { get; set; }
        public string? VehicleType { get; set; }
        
        // Check-in/out
        public DateTime CheckIn { get; set; }
        public DateTime? CheckOut { get; set; }
        public DateTime CheckInTime { get; set; }
        public DateTime? CheckOutTime { get; set; }
        public int? ExpectedDuration { get; set; }
        public int? VisitDuration { get; set; }
        
        // Status
        public string Status { get; set; } = string.Empty;
        
        // Additional
        public string? PhotoUrl { get; set; }
        public string? BadgeNumber { get; set; }
        public string? Remarks { get; set; }
        public Guid? ApprovedBy { get; set; }
        public string? ApprovedByName { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public Guid? CheckedInBy { get; set; }
        public string? CheckedInByName { get; set; }
        public Guid? CheckedInByStaffId { get; set; }
        public Guid? CheckedOutBy { get; set; }
        public string? CheckedOutByName { get; set; }
        public Guid? CheckedOutByStaffId { get; set; }
        
        // Recurring
        public bool IsRecurring { get; set; }
        public List<string> RecurringDays { get; set; } = new();
        public DateTime? ValidFrom { get; set; }
        public DateTime? ValidTo { get; set; }
        
        // History
        public List<VisitorBasicDto> PreviousVisits { get; set; } = new();
        
        // Timestamps
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    // ========== PRE-REGISTRATION DTO ==========
    public class VisitorPreRegistrationDto
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string VisitorName { get; set; } = string.Empty;
        public string VisitorPhone { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? VisitorEmail { get; set; }
        public string? Email { get; set; }
        public string? Organization { get; set; }
        public string Purpose { get; set; } = string.Empty;
        public string PersonToMeet { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public DateTime ExpectedDate { get; set; }
        public DateTime? ScheduledDate { get; set; }
        public string? ExpectedTime { get; set; }
        public string? ScheduledTime { get; set; }
        public string? Remarks { get; set; }
        public string RegisteredBy { get; set; } = string.Empty;
        public Guid? ApprovedBy { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public string? RejectionReason { get; set; }
        public string Status { get; set; } = string.Empty; // pending, approved, arrived, cancelled
        public DateTime CreatedAt { get; set; }
    }

    // ========== CREATE DTOs ==========
    public class CheckInVisitorDto
    {
        // Personal Info
        [System.ComponentModel.DataAnnotations.Required]
        [System.ComponentModel.DataAnnotations.MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        [System.ComponentModel.DataAnnotations.Required]
        [System.ComponentModel.DataAnnotations.Phone]
        public string Phone { get; set; } = string.Empty;

        [System.ComponentModel.DataAnnotations.EmailAddress]
        public string? Email { get; set; }

        public string? Address { get; set; }
        public string? Company { get; set; }
        public string? Designation { get; set; }
        
        // Visit Details
        [System.ComponentModel.DataAnnotations.Required]
        public string Purpose { get; set; } = string.Empty;

        public string? PurposeDetails { get; set; }

        [System.ComponentModel.DataAnnotations.Required]
        public string PersonToMeet { get; set; } = string.Empty;

        public Guid? PersonToMeetId { get; set; }

        [System.ComponentModel.DataAnnotations.Required]
        public string Department { get; set; } = string.Empty;
        
        // ID Verification
        [System.ComponentModel.DataAnnotations.Required]
        public string IdProof { get; set; } = string.Empty;

        public string? IdProofNumber { get; set; }
        public string? IdProofPhoto { get; set; }
        
        // Vehicle
        public bool HasVehicle { get; set; }
        public string? VehicleNumber { get; set; }
        public string? VehicleType { get; set; }
        
        // Additional
        public string? PhotoUrl { get; set; }
        public int? ExpectedDuration { get; set; }
        public string? Remarks { get; set; }
        
        // Recurring
        public bool IsRecurring { get; set; }
        public List<string>? RecurringDays { get; set; }
        public DateTime? ValidFrom { get; set; }
        public DateTime? ValidTo { get; set; }
    }

    public class PreRegisterVisitorDto
    {
        [System.ComponentModel.DataAnnotations.Required]
        [System.ComponentModel.DataAnnotations.MaxLength(200)]
        public string VisitorName { get; set; } = string.Empty;

        [System.ComponentModel.DataAnnotations.Required]
        [System.ComponentModel.DataAnnotations.Phone]
        public string VisitorPhone { get; set; } = string.Empty;

        [System.ComponentModel.DataAnnotations.EmailAddress]
        public string? VisitorEmail { get; set; }

        [System.ComponentModel.DataAnnotations.Required]
        public string Purpose { get; set; } = string.Empty;

        [System.ComponentModel.DataAnnotations.Required]
        public string PersonToMeet { get; set; } = string.Empty;

        public Guid? PersonToMeetId { get; set; }
        public string? Department { get; set; }

        [System.ComponentModel.DataAnnotations.Required]
        public DateTime ExpectedDate { get; set; }

        public string? ExpectedTime { get; set; }
    }

    public class CheckOutVisitorDto
    {
        public string? Remarks { get; set; }
    }

    public class UpdateVisitorStatusDto
    {
        [System.ComponentModel.DataAnnotations.Required]
        public string Status { get; set; } = string.Empty;

        public string? Remarks { get; set; }
    }

    public class BlacklistVisitorDto
    {
        [System.ComponentModel.DataAnnotations.Required]
        public string Reason { get; set; } = string.Empty;
    }

    // ========== STATS DTO ==========
    public class VisitorStatsDto
    {
        public int TodayTotal { get; set; }
        public int CurrentlyInside { get; set; }
        public int CompletedToday { get; set; }
        public int CancelledToday { get; set; }
        public int ThisWeek { get; set; }
        public int ThisMonth { get; set; }
        public decimal AvgVisitDuration { get; set; }
        public double AverageVisitDuration { get; set; }
        public Dictionary<string, int> ByPurpose { get; set; } = new();
        public Dictionary<string, int> PurposeBreakdown { get; set; } = new();
        public Dictionary<string, int> ByDepartment { get; set; } = new();
        public List<HourlyCountDto> HourlyDistribution { get; set; } = new();
        public List<VisitorBasicDto> RecentVisitors { get; set; } = new();
    }

    public class HourlyCountDto
    {
        public string Hour { get; set; } = string.Empty;
        public int Count { get; set; }
    }

    public class VisitorFiltersDto
    {
        public string? Status { get; set; }
        public string? Purpose { get; set; }
        public string? Department { get; set; }
        public string? PersonToMeet { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public DateTime? DateFrom { get; set; }
        public DateTime? DateTo { get; set; }
        public string? Search { get; set; }
        public string? SearchQuery { get; set; }
        public bool? HasVehicle { get; set; }
    }

    // ========== LIST RESPONSES ==========
    public class VisitorListResponse
    {
        public List<VisitorBasicDto> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    public class PreRegistrationListResponse
    {
        public List<VisitorPreRegistrationDto> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    // ========== ALUMNI BASIC DTO (for GET list) ==========
    public class AlumniBasicDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string GraduationYear { get; set; } = string.Empty;
        public string Class { get; set; } = string.Empty;
        public string CurrentOccupation { get; set; } = string.Empty;
        public string Designation { get; set; } = string.Empty;
        public string Company { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? PhotoUrl { get; set; }
        public bool IsStarAlumni { get; set; }
        public bool IsMentor { get; set; }
    }

    // ========== ALUMNI FULL DTO (for GET by ID) ==========
    public class AlumniFullDto
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        
        // Personal Info
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string? AlternatePhone { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? Gender { get; set; }
        
        // Academic History
        public string GraduationYear { get; set; } = string.Empty;
        public string Class { get; set; } = string.Empty;
        public string? Section { get; set; }
        public string? RollNumber { get; set; }
        public Guid? StudentId { get; set; }
        
        // Professional Info
        public string CurrentOccupation { get; set; } = string.Empty;
        public string? Designation { get; set; }
        public string Company { get; set; } = string.Empty;
        public string? Industry { get; set; }
        public int? WorkExperience { get; set; }
        public string? LinkedinUrl { get; set; }
        
        // Location
        public string? City { get; set; }
        public string? State { get; set; }
        public string? Country { get; set; }
        
        // Additional
        public string? Achievements { get; set; }
        public List<string> Skills { get; set; } = new();
        public List<string> Interests { get; set; } = new();
        public string? PhotoUrl { get; set; }
        
        // Engagement
        public bool IsStarAlumni { get; set; }
        public bool IsMentor { get; set; }
        public List<string> MentorAreas { get; set; } = new();
        public bool WillingToHire { get; set; }
        public bool WillingToSpeak { get; set; }
        public DateTime? LastContactDate { get; set; }
        
        // Social
        public string? FacebookUrl { get; set; }
        public string? TwitterUrl { get; set; }
        public string? InstagramUrl { get; set; }
        
        // Related
        public List<AlumniMeetBasicDto> AttendedMeets { get; set; } = new();
        public List<AlumniDonationDto> Donations { get; set; } = new();
        
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    // ========== ALUMNI MEET DTOs ==========
    public class AlumniMeetBasicDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string Venue { get; set; } = string.Empty;
        public bool IsVirtual { get; set; }
        public int RegisteredCount { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    public class AlumniMeetFullDto
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string? StartTime { get; set; }
        public string? EndTime { get; set; }
        public string Venue { get; set; } = string.Empty;
        public string? VenueAddress { get; set; }
        public bool IsVirtual { get; set; }
        public string? VirtualLink { get; set; }
        public string Organizer { get; set; } = string.Empty;
        public string? OrganizerContact { get; set; }
        public int ExpectedAttendees { get; set; }
        public int RegisteredCount { get; set; }
        public int AttendedCount { get; set; }
        public string Status { get; set; } = string.Empty; // planned, ongoing, completed, cancelled
        public string? PhotoGalleryUrl { get; set; }
        public string? Notes { get; set; }
        public List<AlumniBasicDto> RegisteredAlumni { get; set; } = new();
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    // ========== CREATE DTOs ==========
    public class CreateAlumniDto
    {
        // Personal Info
        [System.ComponentModel.DataAnnotations.Required]
        [System.ComponentModel.DataAnnotations.MaxLength(100)]
        public string FirstName { get; set; } = string.Empty;

        [System.ComponentModel.DataAnnotations.Required]
        [System.ComponentModel.DataAnnotations.MaxLength(100)]
        public string LastName { get; set; } = string.Empty;

        [System.ComponentModel.DataAnnotations.Required]
        [System.ComponentModel.DataAnnotations.EmailAddress]
        public string Email { get; set; } = string.Empty;

        [System.ComponentModel.DataAnnotations.Phone]
        public string? Phone { get; set; }

        public string? AlternatePhone { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? Gender { get; set; }
        
        // Academic History
        [System.ComponentModel.DataAnnotations.Required]
        public string GraduationYear { get; set; } = string.Empty;

        [System.ComponentModel.DataAnnotations.Required]
        public string Class { get; set; } = string.Empty;

        public string? Section { get; set; }
        public string? RollNumber { get; set; }
        public Guid? StudentId { get; set; }
        
        // Professional Info
        public string? CurrentOccupation { get; set; }
        public string? Designation { get; set; }
        public string? Company { get; set; }
        public string? Industry { get; set; }
        public int? WorkExperience { get; set; }
        public string? LinkedinUrl { get; set; }
        
        // Location
        public string? City { get; set; }
        public string? State { get; set; }
        public string? Country { get; set; }
        
        // Additional
        public string? Achievements { get; set; }
        public List<string>? Skills { get; set; }
        public List<string>? Interests { get; set; }
        public string? PhotoUrl { get; set; }
        
        // Engagement
        public bool IsStarAlumni { get; set; }
        public bool IsMentor { get; set; }
        public List<string>? MentorAreas { get; set; }
        public bool WillingToHire { get; set; }
        public bool WillingToSpeak { get; set; }
        
        // Social
        public string? FacebookUrl { get; set; }
        public string? TwitterUrl { get; set; }
        public string? InstagramUrl { get; set; }
    }

    public class UpdateAlumniDto
    {
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? AlternatePhone { get; set; }
        public string? CurrentOccupation { get; set; }
        public string? Designation { get; set; }
        public string? Company { get; set; }
        public string? Industry { get; set; }
        public int? WorkExperience { get; set; }
        public string? LinkedinUrl { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public string? Country { get; set; }
        public string? Achievements { get; set; }
        public List<string>? Skills { get; set; }
        public List<string>? Interests { get; set; }
        public string? PhotoUrl { get; set; }
        public bool? IsStarAlumni { get; set; }
        public bool? IsMentor { get; set; }
        public List<string>? MentorAreas { get; set; }
        public bool? WillingToHire { get; set; }
        public bool? WillingToSpeak { get; set; }
        public string? FacebookUrl { get; set; }
        public string? TwitterUrl { get; set; }
        public string? InstagramUrl { get; set; }
    }

    public class CreateAlumniMeetDto
    {
        [System.ComponentModel.DataAnnotations.Required]
        [System.ComponentModel.DataAnnotations.MaxLength(300)]
        public string Title { get; set; } = string.Empty;

        public string? Description { get; set; }

        [System.ComponentModel.DataAnnotations.Required]
        public DateTime Date { get; set; }

        public string? StartTime { get; set; }
        public string? EndTime { get; set; }
        public string? Venue { get; set; }
        public string? VenueAddress { get; set; }
        public bool IsVirtual { get; set; }
        public string? VirtualLink { get; set; }
        public string? Organizer { get; set; }
        public string? OrganizerContact { get; set; }
        public int ExpectedAttendees { get; set; }
    }

    public class RegisterForMeetDto
    {
        [System.ComponentModel.DataAnnotations.Required]
        public Guid MeetId { get; set; }

        [System.ComponentModel.DataAnnotations.Required]
        public Guid AlumniId { get; set; }
    }

    // ========== STATS DTO ==========
    public class AlumniStatsDto
    {
        public int Total { get; set; }
        public int StarAlumni { get; set; }
        public int Mentors { get; set; }
        public int ThisYear { get; set; }
        public Dictionary<string, int> ByYear { get; set; } = new();
        public Dictionary<string, int> ByLocation { get; set; } = new();
        public Dictionary<string, int> ByIndustry { get; set; } = new();
        public List<CompanyCountDto> TopCompanies { get; set; } = new();
        public List<AlumniBasicDto> RecentAlumni { get; set; } = new();
    }

    public class CompanyCountDto
    {
        public string Company { get; set; } = string.Empty;
        public int Count { get; set; }
    }

    public class AlumniFiltersDto
    {
        public string? GraduationYear { get; set; }
        public string? GraduationYearFrom { get; set; }
        public string? GraduationYearTo { get; set; }
        public bool? IsStarAlumni { get; set; }
        public bool? IsMentor { get; set; }
        public string? Search { get; set; }
        public string? Occupation { get; set; }
        public string? Industry { get; set; }
        public string? Location { get; set; }
        public string? Company { get; set; }
    }

    // ========== LIST RESPONSES ==========
    public class AlumniListResponse
    {
        public List<AlumniBasicDto> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    public class AlumniMeetListResponse
    {
        public List<AlumniMeetBasicDto> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }
    public class ApproveLeaveRequest
    {
        public string? ApproverRemarks { get; set; }
        public Guid ApprovedBy { get; set; }
    }

    public class RejectLeaveRequest
    {
        public string? ApproverRemarks { get; set; }
        public Guid RejectedBy { get; set; }
    }

    // ── Student Leave DTOs (parent-initiated, teacher/admin managed) ──────────
    public class CreateStudentLeaveRequest
    {
        public Guid StudentId { get; set; }
        public Guid LeaveTypeId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        /// <summary>Optional reason (not mandatory for parent portal).</summary>
        public string? Reason { get; set; }
    }

    public class StudentLeaveResponse : LeaveRequestResponse
    {
        public string? StudentName { get; set; }
        public string? ClassName { get; set; }
        public string? Section { get; set; }
        public string? GuardianName { get; set; }
        public string? GuardianPhone { get; set; }
    }

    public class StudentLeaveListResponse
    {
        public List<StudentLeaveResponse> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    public class CheckInVisitorRequest
    {
        public Guid SchoolId { get; set; }
        public Guid VisitorId { get; set; }
        public string Purpose { get; set; } = string.Empty;
        public string? PersonToMeet { get; set; }
        public string? Department { get; set; }
        public Guid? StaffMeetingId { get; set; }
        /// <summary>Optional: link this visit to a specific student.</summary>
        public Guid? StudentId { get; set; }
        public string? ItemsCarried { get; set; }
        public string? Remarks { get; set; }
        public Guid CheckedInBy { get; set; }
    }

    public class VerifyAlumniRequest
    {
        public bool IsVerified { get; set; }
        public string? Remarks { get; set; }
        public Guid VerifiedBy { get; set; }
    }

    // Alumni Meet DTOs
    public class UpdateAlumniMeetDto
    {
        public string? Title { get; set; }
        public string? Description { get; set; }
        public DateTime? Date { get; set; }
        public string? StartTime { get; set; }
        public string? EndTime { get; set; }
        public string? Venue { get; set; }
        public string? VenueAddress { get; set; }
        public bool? IsVirtual { get; set; }
        public string? VirtualLink { get; set; }
        public string? Status { get; set; }
    }

    // Alumni Donation DTOs
    public class CreateAlumniDonationDto
    {
        [System.ComponentModel.DataAnnotations.Required]
        public Guid AlumniId { get; set; }

        [System.ComponentModel.DataAnnotations.Required]
        [System.ComponentModel.DataAnnotations.Range(0.01, double.MaxValue)]
        public decimal Amount { get; set; }

        [System.ComponentModel.DataAnnotations.Required]
        public string Purpose { get; set; } = string.Empty;

        [System.ComponentModel.DataAnnotations.Required]
        public DateTime DonationDate { get; set; }

        public string? PaymentMethod { get; set; }
        public string? ReceiptNumber { get; set; }
        public bool IsAnonymous { get; set; }
        public string? Message { get; set; }
    }
}
