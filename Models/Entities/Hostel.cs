using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    // ========== HOSTEL BLOCK ==========
    public class HostelBlock : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(200)]
        public string? Description { get; set; }

        [MaxLength(100)]
        public string? WardenName { get; set; }

        [MaxLength(20)]
        public string? WardenContact { get; set; }

        public Guid? WardenStaffId { get; set; }

        [Required]
        [MaxLength(20)]
        public string Gender { get; set; } = "mixed"; // boys / girls / mixed

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "active";

        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }

        [ForeignKey("WardenStaffId")]
        public virtual Staff? WardenStaff { get; set; }

        public virtual ICollection<HostelRoom> Rooms { get; set; } = new List<HostelRoom>();
    }

    // ========== HOSTEL MESS BILLING ==========
    public class HostelMessBilling : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        public Guid HostelStudentId { get; set; }

        /// <summary>Month in YYYY-MM format, e.g. "2024-06"</summary>
        [Required]
        [MaxLength(7)]
        public string Month { get; set; } = string.Empty;

        [Column(TypeName = "decimal(10,2)")]
        public decimal Amount { get; set; }

        [MaxLength(500)]
        public string? Description { get; set; }

        public bool IsPaid { get; set; } = false;

        public DateTime? PaidDate { get; set; }

        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }

        [ForeignKey("HostelStudentId")]
        public virtual HostelStudent? HostelStudent { get; set; }
    }

    // ========== HOSTEL VISITOR LOG ==========
    public class HostelVisitorLog : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        public Guid HostelStudentId { get; set; }

        [Required]
        [MaxLength(150)]
        public string VisitorName { get; set; } = string.Empty;

        [MaxLength(20)]
        public string? VisitorContact { get; set; }

        [MaxLength(50)]
        public string? Relationship { get; set; }

        [MaxLength(500)]
        public string? Purpose { get; set; }

        [Required]
        public DateTime CheckInTime { get; set; }

        public DateTime? CheckOutTime { get; set; }

        [MaxLength(20)]
        public string Status { get; set; } = "checked_in"; // checked_in / checked_out

        [MaxLength(500)]
        public string? Notes { get; set; }

        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }

        [ForeignKey("HostelStudentId")]
        public virtual HostelStudent? HostelStudent { get; set; }
    }

    // ========== HOSTEL LEAVE ==========
    public class HostelLeave : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        public Guid HostelStudentId { get; set; }

        [Required]
        public DateTime FromDate { get; set; }

        [Required]
        public DateTime ToDate { get; set; }

        [Required]
        [MaxLength(500)]
        public string Reason { get; set; } = string.Empty;

        [MaxLength(150)]
        public string? ContactDuringLeave { get; set; }

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "pending"; // pending / approved / rejected

        public Guid? ApprovedBy { get; set; }

        public DateTime? ApprovedAt { get; set; }

        [MaxLength(500)]
        public string? ApprovalRemarks { get; set; }

        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }

        [ForeignKey("HostelStudentId")]
        public virtual HostelStudent? HostelStudent { get; set; }
    }

    // ========== HOSTEL ROOM ==========
    public class HostelRoom : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        // Optional block assignment (P1 enhancement — nullable for backward compat)
        public Guid? BlockId { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string RoomNumber { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(50)]
        public string RoomType { get; set; } = string.Empty;
        
        public int Capacity { get; set; }
        
        public int Occupied { get; set; } = 0;
        
        [Column(TypeName = "decimal(10,2)")]
        public decimal RentPerBed { get; set; }
        
        [MaxLength(50)]
        public string? Floor { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "available";
        
        public string? Facilities { get; set; }
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }

        [ForeignKey("BlockId")]
        public virtual HostelBlock? Block { get; set; }
    }

    public class HostelStudent : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public Guid StudentId { get; set; }
        
        [Required]
        public Guid RoomId { get; set; }
        
        [Required]
        public DateTime CheckInDate { get; set; }
        
        public DateTime? CheckOutDate { get; set; }
        
        [Column(TypeName = "decimal(10,2)")]
        public decimal MonthlyFee { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "active";
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
        
        [ForeignKey("StudentId")]
        public virtual Student? Student { get; set; }
        
        [ForeignKey("RoomId")]
        public virtual HostelRoom? Room { get; set; }

        public virtual ICollection<HostelMessBilling> MessBillings { get; set; } = new List<HostelMessBilling>();
        public virtual ICollection<HostelVisitorLog> VisitorLogs { get; set; } = new List<HostelVisitorLog>();
        public virtual ICollection<HostelLeave> Leaves { get; set; } = new List<HostelLeave>();
    }
}
