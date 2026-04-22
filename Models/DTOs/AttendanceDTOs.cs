using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SmsApi.Models.DTOs
{
    // ========== ATTENDANCE RECORD DTOs (Basic & Full) ==========
    
    /// <summary>
    /// <summary>
    /// Basic DTO for GET list endpoints - lightweight attendance data only
    /// Used by: GET /api/attendance (list view)
    /// </summary>
    public class AttendanceRecordBasicDto
    {
        public Guid Id { get; set; }
        public Guid StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string Class { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string Status { get; set; } = string.Empty; // present, absent, late, excused
    }
    // Note: For full attendance details, use AttendanceRecordFullDto via GET /api/attendance/{id}

    /// <summary>
    /// Full DTO for GET by ID endpoints - complete attendance details
    /// </summary>
    public class AttendanceRecordFullDto
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string Class { get; set; } = string.Empty;
        public string Section { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? CheckInTime { get; set; }
        public string? CheckOutTime { get; set; }
        public string? Remarks { get; set; }
        public Guid? MarkedBy { get; set; }
        public string? MarkedByName { get; set; }
        public string? BiometricId { get; set; }
        public bool IsManualOverride { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    // ========== LEAVE REQUEST DTOs (Basic & Full) ==========
    
    /// <summary>
    /// Basic DTO for GET list endpoints - lightweight leave request data
    /// </summary>
    public class LeaveRequestBasicDto
    {
        public Guid Id { get; set; }
        public Guid StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string Class { get; set; } = string.Empty;
        public string LeaveType { get; set; } = string.Empty; // sick, casual, emergency, other
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string Status { get; set; } = string.Empty; // pending, approved, rejected
    }

    /// <summary>
    /// Full DTO for GET by ID endpoints - complete leave request details
    /// </summary>
    public class LeaveRequestFullDto
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string Class { get; set; } = string.Empty;
        public string LeaveType { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string? AttachmentUrl { get; set; }
        public string Status { get; set; } = string.Empty;
        public Guid? ApprovedBy { get; set; }
        public string? ApprovedByName { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public string? RejectionReason { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    // ========== CREATE/UPDATE DTOs ==========
    
    public class MarkAttendanceDto
    {
        [Required]
        public Guid StudentId { get; set; }
        
        [Required]
        public DateTime Date { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = string.Empty; // present, absent, late, excused, half_day
        
        public string? CheckInTime { get; set; }
        public string? CheckOutTime { get; set; }
        public string? Remarks { get; set; }
        public string? BiometricId { get; set; }
        public bool IsManualOverride { get; set; }
    }

    public class BulkAttendanceDto
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public DateTime Date { get; set; }
        
        [Required]
        public List<MarkAttendanceDto> Attendances { get; set; } = new();
        
        [Required]
        public Guid MarkedBy { get; set; }
    }

    public class CreateLeaveRequestDto
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public Guid StudentId { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string LeaveType { get; set; } = string.Empty;
        
        [Required]
        public DateTime StartDate { get; set; }
        
        [Required]
        public DateTime EndDate { get; set; }
        
        [Required]
        public string Reason { get; set; } = string.Empty;
        
        public string? AttachmentUrl { get; set; }
    }

    public class UpdateLeaveRequestDto
    {
        [Required]
        [MaxLength(20)]
        public string LeaveType { get; set; } = string.Empty;
        
        [Required]
        public DateTime StartDate { get; set; }
        
        [Required]
        public DateTime EndDate { get; set; }
        
        [Required]
        public string Reason { get; set; } = string.Empty;
        
        public string? AttachmentUrl { get; set; }
    }

    public class ApproveLeaveRequestDto
    {
        [Required]
        public Guid ApprovedBy { get; set; }
        
        public string? ApprovalNotes { get; set; }
        
        public string? Remarks { get; set; }
    }

    public class RejectLeaveRequestDto
    {
        [Required]
        public Guid RejectedBy { get; set; }
        
        [Required]
        public string RejectionReason { get; set; } = string.Empty;
        
        public string? Reason { get; set; }
    }

    // ========== LIST RESPONSES ==========
    
    public class AttendanceRecordListResponse
    {
        public List<AttendanceRecordBasicDto> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    public class LeaveRequestListResponse
    {
        public List<LeaveRequestResponse> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    // ========== STATS DTOs ==========
    
    public class AttendanceStatsDto
    {
        public int TotalPresent { get; set; }
        public int TotalAbsent { get; set; }
        public int TotalLate { get; set; }
        public int TotalExcused { get; set; }
        public int TotalHalfDay { get; set; }
        public decimal AttendanceRate { get; set; }
        public decimal AverageAttendance { get; set; }
        public List<MonthlyAttendanceDto> MonthlyTrend { get; set; } = new();
    }

    public class MonthlyAttendanceDto
    {
        public string Month { get; set; } = string.Empty;
        public int PresentCount { get; set; }
        public int AbsentCount { get; set; }
        public decimal AttendanceRate { get; set; }
    }

    // ========== STAFF ATTENDANCE DTOs ==========
    
    public class StaffAttendanceBasicDto
    {
        public Guid Id { get; set; }
        public Guid StaffId { get; set; }
        public string StaffName { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? CheckInTime { get; set; }
        public string? CheckOutTime { get; set; }
    }

    public class StaffAttendanceFullDto
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid StaffId { get; set; }
        public string StaffName { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? CheckInTime { get; set; }
        public string? CheckOutTime { get; set; }
        public string? Remarks { get; set; }
        public Guid? MarkedBy { get; set; }
        public string? MarkedByName { get; set; }
        public string? BiometricId { get; set; }
        public bool IsManualOverride { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class MarkStaffAttendanceDto
    {
        [Required]
        public Guid StaffId { get; set; }
        
        [Required]
        public DateTime Date { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = string.Empty;
        
        public string? CheckInTime { get; set; }
        public string? CheckOutTime { get; set; }
        public string? Remarks { get; set; }
        public string? BiometricId { get; set; }
        public bool IsManualOverride { get; set; }
    }

    public class StaffAttendanceListResponse
    {
        public List<StaffAttendanceBasicDto> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    // ========== FILTER DTOs ==========
    
    public class AttendanceFiltersDto
    {
        public Guid? StudentId { get; set; }
        public Guid? ClassId { get; set; }
        public Guid? SectionId { get; set; }
        public string? Status { get; set; }
        public DateTime? DateFrom { get; set; }
        public DateTime? DateTo { get; set; }
        public string? SearchQuery { get; set; }
        public string? AcademicYear { get; set; }
    }

    public class LeaveRequestFiltersDto
    {
        public Guid? StudentId { get; set; }
        public string? LeaveType { get; set; }
        public string? Status { get; set; }
        public DateTime? DateFrom { get; set; }
        public DateTime? DateTo { get; set; }
        public string? SearchQuery { get; set; }
    }

    // ========== BULK OPERATIONS ==========
    
    public class BulkMarkAttendanceDto
    {
        [Required]
        public DateTime Date { get; set; }
        
        [Required]
        public List<MarkAttendanceDto> Attendances { get; set; } = new();
    }

    public class UpdateAttendanceDto
    {
        public string? Status { get; set; }
        public string? CheckInTime { get; set; }
        public string? CheckOutTime { get; set; }
        public string? Remarks { get; set; }
    }

    // ========== STUDENT ATTENDANCE REQUEST/RESPONSE ==========
    
    public class CreateStudentAttendanceRequest
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public Guid StudentId { get; set; }
        
        [Required]
        public DateTime Date { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = string.Empty;
        
        public TimeSpan? CheckInTime { get; set; }
        public TimeSpan? CheckOutTime { get; set; }
        public string? Remarks { get; set; }
    }

    public class StudentAttendanceResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid StudentId { get; set; }
        public string? StudentName { get; set; }
        public DateTime Date { get; set; }
        public string Status { get; set; } = string.Empty;
        public TimeSpan? CheckInTime { get; set; }
        public TimeSpan? CheckOutTime { get; set; }
        public string? Remarks { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class BulkStudentAttendanceRequest
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public DateTime Date { get; set; }
        
        [Required]
        public List<CreateStudentAttendanceRequest> Attendances { get; set; } = new();
    }

    // ========== STAFF ATTENDANCE REQUEST/RESPONSE ==========
    
    public class CreateStaffAttendanceRequest
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public Guid StaffId { get; set; }
        
        [Required]
        public DateTime Date { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = string.Empty;
        
        public TimeSpan? CheckInTime { get; set; }
        public TimeSpan? CheckOutTime { get; set; }
        public string? Remarks { get; set; }
    }

    public class StaffAttendanceResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid StaffId { get; set; }
        public string? StaffName { get; set; }
        public DateTime Date { get; set; }
        public string Status { get; set; } = string.Empty;
        public TimeSpan? CheckInTime { get; set; }
        public TimeSpan? CheckOutTime { get; set; }
        public string? Remarks { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
