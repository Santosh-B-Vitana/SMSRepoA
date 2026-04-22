using System;
using System.Collections.Generic;

namespace SmsApi.Models.DTOs
{
    // Offline Attendance Session Basic DTO - Lightweight version for list views
    public class OfflineSessionBasicDto
    {
        public Guid Id { get; set; }
        public string SessionId { get; set; } = string.Empty;
        public Guid DeviceId { get; set; }
        public string? DeviceName { get; set; }
        public DateTime SessionStartTime { get; set; }
        public int RecordCount { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    // Offline Attendance Record Basic DTO - Lightweight version for list views
    public class OfflineAttendanceRecordBasicDto
    {
        public Guid Id { get; set; }
        public Guid SessionId { get; set; }
        public Guid EntityId { get; set; }
        public string EntityType { get; set; } = string.Empty;
        public string? EntityName { get; set; }
        public DateTime AttendanceDate { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    // Offline Attendance Session DTOs
    public class CreateOfflineSessionRequest
    {
        public Guid SchoolId { get; set; }
        public Guid DeviceId { get; set; }
        public string? DeviceName { get; set; }
        public Guid CapturedByStaffId { get; set; }
        public string AttendanceType { get; set; } = "Student";
    }

    public class OfflineAttendanceSessionResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string SessionId { get; set; } = string.Empty;
        public Guid DeviceId { get; set; }
        public string? DeviceName { get; set; }
        public Guid CapturedByStaffId { get; set; }
        public string? CapturedByStaffName { get; set; }
        public DateTime SessionStartTime { get; set; }
        public DateTime? SessionEndTime { get; set; }
        public string AttendanceType { get; set; } = string.Empty;
        public int RecordCount { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime? SyncInitiatedAt { get; set; }
        public DateTime? SyncCompletedAt { get; set; }
        public int? SyncedRecords { get; set; }
        public int? FailedRecords { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public class OfflineSessionListResponse
    {
        public List<OfflineAttendanceSessionResponse> Items { get; set; } = new();
        public List<OfflineAttendanceSessionResponse> Sessions { get; set; } = new();
        public int TotalCount { get; set; }
        public int Total { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    // Offline Attendance Record DTOs
    public class BulkOfflineAttendanceRequest
    {
        public Guid SchoolId { get; set; }
        public Guid SessionId { get; set; }
        public List<OfflineAttendanceRecordRequest> Records { get; set; } = new();
    }

    public class OfflineAttendanceRecordRequest
    {
        public Guid EntityId { get; set; }
        public string EntityType { get; set; } = "Student";
        public DateTime AttendanceDate { get; set; }
        public string Status { get; set; } = "Present";
        public TimeSpan? CheckInTime { get; set; }
        public TimeSpan? CheckOutTime { get; set; }
        public Guid? ClassId { get; set; }
        public Guid? SectionId { get; set; }
        public string? Remarks { get; set; }
        public DateTime CapturedAt { get; set; }
        public string? DeviceFingerprint { get; set; }
    }

    public class OfflineAttendanceRecordResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid SessionId { get; set; }
        public Guid EntityId { get; set; }
        public string EntityType { get; set; } = string.Empty;
        public string? EntityName { get; set; }
        public DateTime AttendanceDate { get; set; }
        public string Status { get; set; } = string.Empty;
        public TimeSpan? CheckInTime { get; set; }
        public TimeSpan? CheckOutTime { get; set; }
        public Guid? ClassId { get; set; }
        public Guid? SectionId { get; set; }
        public string? Remarks { get; set; }
        public string SyncStatus { get; set; } = string.Empty;
        public DateTime? SyncedAt { get; set; }
        public Guid? ServerRecordId { get; set; }
        public string? SyncError { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class OfflineRecordListResponse
    {
        public List<OfflineAttendanceRecordResponse> Items { get; set; } = new();
        public List<OfflineAttendanceRecordResponse> Records { get; set; } = new();
        public int TotalCount { get; set; }
        public int Total { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    // Sync Operations
    public class SyncOfflineAttendanceRequest
    {
        public Guid SchoolId { get; set; }
        public Guid SessionId { get; set; }
        public Guid SyncInitiatedBy { get; set; }
    }

    public class SyncOfflineAttendanceResponse
    {
        public Guid SessionId { get; set; }
        public int TotalRecords { get; set; }
        public int SyncedRecords { get; set; }
        public int FailedRecords { get; set; }
        public int DuplicateRecords { get; set; }
        public List<SyncErrorDetail> Errors { get; set; } = new();
        public DateTime SyncCompletedAt { get; set; }
    }

    public class SyncErrorDetail
    {
        public Guid RecordId { get; set; }
        public Guid EntityId { get; set; }
        public string EntityType { get; set; } = string.Empty;
        public string Error { get; set; } = string.Empty;
    }

    // Device Management DTOs
    public class RegisterOfflineDeviceRequest
    {
        public Guid SchoolId { get; set; }
        public Guid DeviceId { get; set; }
        public string DeviceName { get; set; } = string.Empty;
        public string? DeviceType { get; set; }
        public string? DeviceFingerprint { get; set; }
        public Guid AssignedToStaffId { get; set; }
        public string? AppVersion { get; set; }
        public string? OSVersion { get; set; }
        public Guid CreatedBy { get; set; }
    }

    public class OfflineDeviceResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid DeviceId { get; set; }
        public string DeviceName { get; set; } = string.Empty;
        public string? DeviceType { get; set; }
        public Guid AssignedToStaffId { get; set; }
        public string? AssignedToStaffName { get; set; }
        public bool IsActive { get; set; }
        public string? DeviceFingerprint { get; set; }
        public DateTime? LastSyncedAt { get; set; }
        public DateTime? LastActiveAt { get; set; }
        public string? AppVersion { get; set; }
        public string? OSVersion { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    // Conflict Resolution DTOs
    public class SyncConflictResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid OfflineRecordId { get; set; }
        public string ConflictType { get; set; } = string.Empty;
        public Guid? ServerRecordId { get; set; }
        public string OfflineData { get; set; } = string.Empty;
        public string? ServerData { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? Resolution { get; set; }
        public string? ResolutionRemarks { get; set; }
        public DateTime? ResolvedAt { get; set; }
        public Guid? ResolvedByStaffId { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class ResolveConflictRequest
    {
        public Guid SchoolId { get; set; }
        public Guid ConflictId { get; set; }
        public string Resolution { get; set; } = string.Empty;
        public string? ResolutionRemarks { get; set; }
        public string? Remarks { get; set; }
        public Guid ResolvedBy { get; set; }
        public Guid ResolvedByStaffId { get; set; }
    }
}
