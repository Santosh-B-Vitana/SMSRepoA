using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    public class OfflineAttendanceSession : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string SessionId { get; set; } = string.Empty;
        
        [Required]
        public Guid DeviceId { get; set; }
        
        [MaxLength(100)]
        public string? DeviceName { get; set; }
        
        [Required]
        public Guid CapturedByStaffId { get; set; }
        
        public DateTime SessionStartTime { get; set; }
        
        public DateTime? SessionEndTime { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string AttendanceType { get; set; } = "Student"; // Student, Staff
        
        public int RecordCount { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "InProgress"; // InProgress, Completed, Syncing, Synced, Failed
        
        public DateTime? SyncInitiatedAt { get; set; }
        
        public DateTime? SyncCompletedAt { get; set; }
        
        public int? SyncedRecords { get; set; }
        
        public int? FailedRecords { get; set; }
        
        public string? SyncErrors { get; set; } // JSON array of errors
        
        public string? Remarks { get; set; }
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
    }

    public class OfflineAttendanceRecord : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public Guid SessionId { get; set; }
        
        [Required]
        public Guid EntityId { get; set; } // StudentId or StaffId
        
        [Required]
        [MaxLength(50)]
        public string EntityType { get; set; } = "Student"; // Student, Staff
        
        [Required]
        public DateTime AttendanceDate { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Present"; // Present, Absent, Late, HalfDay
        
        public TimeSpan? CheckInTime { get; set; }
        
        public TimeSpan? CheckOutTime { get; set; }
        
        public Guid? ClassId { get; set; }
        
        public Guid? SectionId { get; set; }
        
        public string? Remarks { get; set; }
        
        [Required]
        public DateTime CapturedAt { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string SyncStatus { get; set; } = "Pending"; // Pending, Synced, Failed, Duplicate
        
        public DateTime? SyncedAt { get; set; }
        
        public Guid? ServerRecordId { get; set; } // Reference to synced StudentAttendance or StaffAttendance ID
        
        public string? SyncError { get; set; }
        
        [MaxLength(500)]
        public string? DeviceFingerprint { get; set; } // Unique device identifier
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
        
        [ForeignKey("SessionId")]
        public virtual OfflineAttendanceSession? Session { get; set; }
    }

    public class OfflineDevice : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public Guid DeviceId { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string DeviceName { get; set; } = string.Empty;
        
        [MaxLength(50)]
        public string? DeviceType { get; set; } // Tablet, Mobile, Desktop
        
        [MaxLength(500)]
        public string? DeviceFingerprint { get; set; }
        
        [Required]
        public Guid AssignedToStaffId { get; set; }
        
        public bool IsActive { get; set; } = true;
        
        public DateTime? LastSyncedAt { get; set; }
        
        public DateTime? LastActiveAt { get; set; }
        
        [MaxLength(50)]
        public string? AppVersion { get; set; }
        
        [MaxLength(50)]
        public string? OSVersion { get; set; }
        
        public string? Remarks { get; set; }
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
    }

    public class SyncConflict : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public Guid OfflineRecordId { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string ConflictType { get; set; } = string.Empty; // Duplicate, DataMismatch, TimestampConflict
        
        public Guid? ServerRecordId { get; set; }
        
        [Required]
        public string OfflineData { get; set; } = string.Empty; // JSON
        
        public string? ServerData { get; set; } // JSON
        
        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Pending"; // Pending, Resolved, OfflineWins, ServerWins
        
        public DateTime? ResolvedAt { get; set; }
        
        public Guid? ResolvedByStaffId { get; set; }
        
        [MaxLength(50)]
        public string? Resolution { get; set; } // KeepOffline, KeepServer, Merge, Skip
        
        public string? ResolutionRemarks { get; set; }
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
    }
}
