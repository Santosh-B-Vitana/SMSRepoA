using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    public class LeaveType : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty; // Sick Leave, Casual Leave, Earned Leave, Maternity Leave, etc.
        
        [MaxLength(500)]
        public string? Description { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string ApplicableTo { get; set; } = "All"; // Staff, Teacher, Student, All
        
        public int MaxDaysPerYear { get; set; } = 0;
        
        public bool RequiresApproval { get; set; } = true;
        
        public bool RequiresDocument { get; set; } = false;
        
        public int MinNoticeDays { get; set; } = 0;
        
        public bool IsCarryForward { get; set; } = false;
        
        public bool IsPaid { get; set; } = true;
        
        public bool IsActive { get; set; } = true;
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
    }

    public class StaffLeaveRequest : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string LeaveNumber { get; set; } = string.Empty;
        
        [Required]
        public Guid ApplicantId { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string ApplicantType { get; set; } = string.Empty; // Staff, Student
        
        [Required]
        public Guid LeaveTypeId { get; set; }
        
        [Required]
        public DateTime StartDate { get; set; }
        
        [Required]
        public DateTime EndDate { get; set; }
        
        public int TotalDays { get; set; }
        
        [Required]
        [MaxLength(1000)]
        public string Reason { get; set; } = string.Empty;
        
        [MaxLength(500)]
        public string? DocumentUrl { get; set; }
        
        [MaxLength(500)]
        public string? EmergencyContact { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "Pending"; // Pending, Approved, Rejected, Cancelled
        
        public DateTime ApplicationDate { get; set; }
        
        public Guid? ApprovedByStaffId { get; set; }
        
        public DateTime? ApprovedDate { get; set; }
        
        [MaxLength(1000)]
        public string? ApproverRemarks { get; set; }
        
        public Guid? CancelledByUserId { get; set; }
        
        public DateTime? CancelledDate { get; set; }
        
        [MaxLength(500)]
        public string? CancellationReason { get; set; }
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
        
        [ForeignKey("LeaveTypeId")]
        public virtual LeaveType? LeaveType { get; set; }
    }

    public class LeaveBalance : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public Guid UserId { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string UserType { get; set; } = string.Empty; // Staff, Student
        
        [Required]
        public Guid LeaveTypeId { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string AcademicYear { get; set; } = string.Empty;
        
        public int TotalAllowed { get; set; }
        
        public int Used { get; set; } = 0;
        
        public int Available { get; set; }
        
        public int CarriedForward { get; set; } = 0;
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
        
        [ForeignKey("LeaveTypeId")]
        public virtual LeaveType? LeaveType { get; set; }
    }

    public class Visitor : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [MaxLength(15)]
        public string? Phone { get; set; }
        
        [MaxLength(100)]
        public string? Email { get; set; }
        
        [MaxLength(50)]
        public string? IdType { get; set; } // Aadhar, PAN, Driving License, Passport
        
        [MaxLength(50)]
        public string? IdNumber { get; set; }
        
        [MaxLength(500)]
        public string? Address { get; set; }
        
        [MaxLength(500)]
        public string? PhotoUrl { get; set; }
        
        [MaxLength(50)]
        public string? Organization { get; set; }
        
        public bool IsBlacklisted { get; set; } = false;
        
        [MaxLength(500)]
        public string? BlacklistReason { get; set; }
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
    }

    public class VisitorLog : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public Guid VisitorId { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string VisitNumber { get; set; } = string.Empty;
        
        [Required]
        public DateTime CheckInTime { get; set; }
        
        public DateTime? CheckOutTime { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string Purpose { get; set; } = string.Empty;
        
        [MaxLength(100)]
        public string? PersonToMeet { get; set; }
        
        [MaxLength(50)]
        public string? Department { get; set; }
        
        public Guid? StaffMeetingId { get; set; }

        /// <summary>Optional: links this visit to a specific student being visited.</summary>
        public Guid? StudentId { get; set; }

        [MaxLength(500)]
        public string? ItemsCarried { get; set; }
        
        [MaxLength(50)]
        public string? PassNumber { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "CheckedIn"; // CheckedIn, CheckedOut, Overstayed
        
        [MaxLength(1000)]
        public string? Remarks { get; set; }
        
        public Guid? CheckedInByStaffId { get; set; }
        
        public Guid? CheckedOutByStaffId { get; set; }
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
        
        [ForeignKey("VisitorId")]
        public virtual Visitor? Visitor { get; set; }

        [ForeignKey("StudentId")]
        public virtual Student? Student { get; set; }
    }

    public class Alumni : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public Guid StudentId { get; set; } // Reference to original student record
        
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [MaxLength(100)]
        public string? Email { get; set; }
        
        [MaxLength(15)]
        public string? Phone { get; set; }
        
        [MaxLength(50)]
        public string? BatchYear { get; set; }
        
        [MaxLength(50)]
        public string? Class { get; set; }
        
        [MaxLength(20)]
        public string? Section { get; set; }
        
        [MaxLength(100)]
        public string? Profession { get; set; }
        
        [MaxLength(100)]
        public string? Company { get; set; }
        
        [MaxLength(200)]
        public string? CurrentAddress { get; set; }
        
        [MaxLength(50)]
        public string? City { get; set; }
        
        [MaxLength(50)]
        public string? State { get; set; }
        
        [MaxLength(50)]
        public string? Country { get; set; }
        
        [MaxLength(500)]
        public string? ProfilePhotoUrl { get; set; }
        
        [MaxLength(500)]
        public string? LinkedInUrl { get; set; }
        
        [MaxLength(1000)]
        public string? Achievements { get; set; }
        
        public bool IsActive { get; set; } = true;
        
        public bool IsVerified { get; set; } = false;
        
        [MaxLength(500)]
        public string? Remarks { get; set; }
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
        
        [ForeignKey("StudentId")]
        public virtual Student? Student { get; set; }
    }
}
