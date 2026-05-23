using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    // ========== ATTENDANCE RECORD ==========
    /// <summary>
    /// Unified attendance record for both students and staff.
    /// Set EntityType = "Student" (default) and populate StudentId for student records.
    /// Set EntityType = "Staff" and populate StaffId for staff records.
    /// </summary>
    public class AttendanceRecord : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        /// <summary>
        /// Discriminator: "Student" (default) or "Staff".
        /// Allows a single table to cover both entity types.
        /// </summary>
        [Required]
        [MaxLength(20)]
        public string EntityType { get; set; } = "Student";
        
        /// <summary>FK to Student — populate for EntityType = "Student", null for staff records.</summary>
        public Guid? StudentId { get; set; }
        
        /// <summary>FK to Staff — populate for EntityType = "Staff", null for student records.</summary>
        public Guid? StaffId { get; set; }
        
        [Required]
        public DateTime Date { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = string.Empty; // present, absent, late, excused, half_day
        
        public TimeSpan? CheckInTime { get; set; }
        
        public TimeSpan? CheckOutTime { get; set; }
        
        [MaxLength(500)]
        public string? Remarks { get; set; }
        
        public Guid? MarkedBy { get; set; }
        
        [MaxLength(50)]
        public string? BiometricId { get; set; }
        
        public bool IsManualOverride { get; set; } = false;
        
        // Navigation properties
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
        
        [ForeignKey("StudentId")]
        public virtual Student? Student { get; set; }
        
        [ForeignKey("StaffId")]
        public virtual Staff? Staff { get; set; }
    }

    // ========== STUDENT LEAVE REQUEST (deprecated) ==========
    /// <summary>
    /// Use <see cref="StaffLeaveRequest"/> with ApplicantType = "Student" instead.
    /// StaffLeaveRequest already supports both staff and students via its ApplicantType
    /// discriminator and LeaveTypeId FK. StudentLeaveRequest is retained for backward
    /// compatibility only.
    /// </summary>
    [Obsolete("Use StaffLeaveRequest with ApplicantType = 'Student' instead.")]
    public class StudentLeaveRequest : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public Guid StudentId { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string LeaveType { get; set; } = string.Empty; // sick, casual, emergency, maternity, paternity, other
        
        [Required]
        public DateTime StartDate { get; set; }
        
        [Required]
        public DateTime EndDate { get; set; }
        
        [Required]
        public string Reason { get; set; } = string.Empty;
        
        [MaxLength(500)]
        public string? AttachmentUrl { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "pending"; // pending, approved, rejected
        
        public Guid? ApprovedBy { get; set; }
        
        public DateTime? ApprovedAt { get; set; }
        
        [MaxLength(500)]
        public string? RejectionReason { get; set; }
        
        // Navigation properties
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
        
        [ForeignKey("StudentId")]
        public virtual Student? Student { get; set; }
        
        [ForeignKey("ApprovedBy")]
        public virtual User? ApprovedByUser { get; set; }
    }

    // ========== BIOMETRIC LOG ==========
    public class BiometricLog : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string BiometricId { get; set; } = string.Empty;
        
        public Guid? StudentId { get; set; }
        
        [Required]
        public DateTime LogTime { get; set; }
        
        [Required]
        [MaxLength(10)]
        public string LogType { get; set; } = string.Empty; // IN, OUT
        
        [MaxLength(50)]
        public string? DeviceId { get; set; }
        
        public bool IsProcessed { get; set; } = false;
        
        // Navigation properties
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
        
        [ForeignKey("StudentId")]
        public virtual Student? Student { get; set; }
    }

    // ========== LEGACY SUPPORT (for backward compatibility) ==========
    [Obsolete("Use AttendanceRecord instead")]
    public class StudentAttendance : AttendanceRecord
    {
        // Backward compatibility wrapper
        [MaxLength(20)]
        public string Class { get; set; } = string.Empty;
        
        [MaxLength(10)]
        public string Section { get; set; } = string.Empty;
        
        [MaxLength(20)]
        public string Source { get; set; } = "manual";
    }

    // ========== STAFF ATTENDANCE (deprecated) ==========
    /// <summary>
    /// Use <see cref="AttendanceRecord"/> with EntityType = "Staff" and StaffId populated.
    /// StaffAttendance is kept for backward compatibility while data migration is in progress.
    /// </summary>
    [Obsolete("Use AttendanceRecord with EntityType='Staff' instead. StaffAttendance will be removed after migration.")]
    public class StaffAttendance : BaseEntity
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
        
        public DateTime? CheckInTime { get; set; }
        
        public DateTime? CheckOutTime { get; set; }
        
        public TimeSpan? WorkingHours { get; set; }
        
        [MaxLength(20)]
        public string Source { get; set; } = "manual";
        
        public string? Remarks { get; set; }
        
        public Guid? MarkedBy { get; set; }

        /// <summary>
        /// Populated when Status = "leave" — tracks which leave type was consumed.
        /// </summary>
        public Guid? LeaveTypeId { get; set; }

        /// <summary>
        /// True when leave balance was automatically deducted on attendance marking
        /// (i.e. no prior approved StaffLeaveRequest existed for this day).
        /// </summary>
        public bool LeaveDeducted { get; set; } = false;
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
        
        [ForeignKey("StaffId")]
        public virtual Staff? Staff { get; set; }

        [ForeignKey("LeaveTypeId")]
        public virtual LeaveType? LeaveType { get; set; }
    }
}
