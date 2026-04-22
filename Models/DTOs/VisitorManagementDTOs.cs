using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SmsApi.Models.DTOs
{
    // ========== VISITOR REQUEST/RESPONSE DTOs ==========
    
    public class VisitorResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Address { get; set; }
        public string? PhotoUrl { get; set; }
        public string? Organization { get; set; }
        public string? IdType { get; set; }
        public string? IdNumber { get; set; }
        public bool IsBlacklisted { get; set; }
        public string? BlacklistReason { get; set; }
        public string Purpose { get; set; } = string.Empty;
        public string PersonToMeet { get; set; } = string.Empty;
        public DateTime CheckIn { get; set; }
        public DateTime? CheckOut { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? BadgeNumber { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public class CreateVisitorRequest
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(20)]
        public string Phone { get; set; } = string.Empty;
        
        [EmailAddress]
        [MaxLength(100)]
        public string? Email { get; set; }
        
        public string? IdType { get; set; }
        public string? IdNumber { get; set; }
        public string? IdProof { get; set; }
        public string? IdProofNumber { get; set; }
        public bool HasVehicle { get; set; }
        public string? VehicleNumber { get; set; }
        public string? Address { get; set; }
        public string? Organization { get; set; }
        public string? PhotoUrl { get; set; }
        public Guid? CreatedBy { get; set; }
        /// <summary>Optional: link this visit to a specific student.</summary>
        public Guid? StudentId { get; set; }
    }

    public class UpdateVisitorRequest
    {
        public string? Name { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? Address { get; set; }
        public string? Organization { get; set; }
        public string? IdType { get; set; }
        public string? IdNumber { get; set; }
        public string? Purpose { get; set; }
        public string? PersonToMeet { get; set; }
        public string? Status { get; set; }
        public DateTime? CheckOut { get; set; }
        public Guid? UpdatedBy { get; set; }
    }

    public class VisitorLogListResponse
    {
        public List<VisitorLogResponse> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    public class VisitorLogResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid? VisitorId { get; set; }
        public string VisitorName { get; set; } = string.Empty;
        public string? VisitNumber { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Purpose { get; set; } = string.Empty;
        public string PersonToMeet { get; set; } = string.Empty;
        public string? Department { get; set; }
        public DateTime CheckIn { get; set; }
        public DateTime CheckInTime { get; set; }
        public DateTime? CheckOut { get; set; }
        public DateTime? CheckOutTime { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? ItemsCarried { get; set; }
        public string? PassNumber { get; set; }
        public string? Remarks { get; set; }
        public Guid? CheckedInByStaffId { get; set; }
        public Guid? CheckedOutByStaffId { get; set; }
        public Guid? StudentId { get; set; }
        public string? StudentName { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CheckOutVisitorRequest
    {
        public DateTime CheckOutTime { get; set; }
        public string? Remarks { get; set; }
        public Guid? CheckedOutBy { get; set; }
    }

    // ========== VISITOR CHECK-IN/OUT ==========
    
    public class VisitorCheckInDto
    {
        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;
        
        [Required]
        [Phone]
        public string Phone { get; set; } = string.Empty;
        
        [Required]
        public string Purpose { get; set; } = string.Empty;
        
        [Required]
        public string PersonToMeet { get; set; } = string.Empty;
        
        public string? Email { get; set; }
        public string? IdProof { get; set; }
        public string? IdProofNumber { get; set; }
        public bool HasVehicle { get; set; }
        public string? VehicleNumber { get; set; }
        /// <summary>Optional: link this visit to a specific student.</summary>
        public Guid? StudentId { get; set; }
    }

    public class VisitorCheckOutDto
    {
        [Required]
        public Guid VisitorId { get; set; }
        
        public DateTime CheckOutTime { get; set; }
        public string? Remarks { get; set; }
    }

    public class UpdateVisitorDto
    {
        public string? Purpose { get; set; }
        public string? PersonToMeet { get; set; }
        public string? Department { get; set; }
        public string? ItemsCarried { get; set; }
        public Guid? StaffMeetingId { get; set; }
        public string? Email { get; set; }
        public string? Organization { get; set; }
        public string? Status { get; set; }
        public string? Remarks { get; set; }
        /// <summary>Link or update the student this visit is for.</summary>
        public Guid? StudentId { get; set; }
    }

    public class CancelVisitorDto
    {
        [Required]
        public string CancellationReason { get; set; } = string.Empty;
        
        [MaxLength(500)]
        public string? Reason { get; set; }
    }

    // ========== PRE-REGISTRATION DTOs ==========
    
    public class PreRegistrationFiltersDto
    {
        public string? Status { get; set; }
        public DateTime? DateFrom { get; set; }
        public DateTime? DateTo { get; set; }
        public string? SearchQuery { get; set; }
    }

    public class VisitorPreRegistrationBasicDto
    {
        public Guid Id { get; set; }
        public string VisitorName { get; set; } = string.Empty;
        public string VisitorPhone { get; set; } = string.Empty;
        public string Purpose { get; set; } = string.Empty;
        public DateTime ExpectedDate { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    public class VisitorPreRegistrationFullDto
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string VisitorName { get; set; } = string.Empty;
        public string VisitorPhone { get; set; } = string.Empty;
        public string? VisitorEmail { get; set; }
        public string Purpose { get; set; } = string.Empty;
        public string PersonToMeet { get; set; } = string.Empty;
        public DateTime ExpectedDate { get; set; }
        public TimeSpan? ExpectedTime { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class CreatePreRegistrationDto
    {
        [Required]
        public string VisitorName { get; set; } = string.Empty;
        
        [Required]
        [Phone]
        public string VisitorPhone { get; set; } = string.Empty;
        
        [EmailAddress]
        public string? VisitorEmail { get; set; }
        
        [Required]
        public string Purpose { get; set; } = string.Empty;
        
        [Required]
        public string PersonToMeet { get; set; } = string.Empty;
        
        [Required]
        public DateTime ExpectedDate { get; set; }
        
        public TimeSpan? ExpectedTime { get; set; }
    }

    public class ApprovePreRegistrationDto
    {
        [Required]
        public Guid ApprovedBy { get; set; }
        
        public string? ApprovalNotes { get; set; }
    }

    public class CreateVisitorDto
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public string Name { get; set; } = string.Empty;
        
        public string VisitorName { get; set; } = string.Empty;
        
        [Required]
        public string Phone { get; set; } = string.Empty;
        
        public string? Email { get; set; }
        
        public string? Address { get; set; }
        
        public string? PhotoUrl { get; set; }
        
        public string? Organization { get; set; }
        
        [Required]
        public string Purpose { get; set; } = string.Empty;
        
        [Required]
        public string PersonToMeet { get; set; } = string.Empty;
        
        public string? Department { get; set; }
        
        public Guid? StaffMeetingId { get; set; }
        
        public string? ItemsCarried { get; set; }
        
        public string? PassNumber { get; set; }
        
        public string? IdProof { get; set; }
        public string? IdProofNumber { get; set; }
        public string? IdType { get; set; }
        public string? IdNumber { get; set; }
        public bool HasVehicle { get; set; }
        public string? VehicleNumber { get; set; }
        /// <summary>Optional: link this visit to a specific student.</summary>
        public Guid? StudentId { get; set; }
        
        public string? Remarks { get; set; }
    }

    public class CreateVisitorPreRegistrationDto
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public string VisitorName { get; set; } = string.Empty;
        
        [Required]
        public string VisitorPhone { get; set; } = string.Empty;
        
        public string? Phone { get; set; }
        
        public string? VisitorEmail { get; set; }
        
        public string? Email { get; set; }
        
        public string? Organization { get; set; }
        
        [Required]
        public string Purpose { get; set; } = string.Empty;
        
        [Required]
        public string PersonToMeet { get; set; } = string.Empty;
        
        public string? Department { get; set; }
        
        [Required]
        public DateTime ExpectedDate { get; set; }
        
        public DateTime? ScheduledDate { get; set; }
        
        public TimeSpan? ExpectedTime { get; set; }
        
        public string? ScheduledTime { get; set; }
        
        public string? Remarks { get; set; }
        
        [Required]
        public Guid RegisteredBy { get; set; }
    }
}
