using System;
using System.ComponentModel.DataAnnotations;

namespace SmsApi.Models.DTOs
{
    // Hostel Room Basic DTO - Lightweight version for list views
    public class HostelRoomBasicDto
    {
        public Guid Id { get; set; }
        public string RoomNumber { get; set; } = string.Empty;
        public string RoomType { get; set; } = string.Empty;
        public int Capacity { get; set; }
        public int Occupied { get; set; }
        public decimal RentPerBed { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    // Hostel Student Basic DTO - Lightweight version for list views
    public class HostelStudentBasicDto
    {
        public Guid Id { get; set; }
        public Guid StudentId { get; set; }
        public Guid RoomId { get; set; }
        public DateTime CheckInDate { get; set; }
        public decimal MonthlyFee { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    // Hostel Room DTOs
    public class CreateHostelRoomRequest
    {
        [Required]
        public Guid SchoolId { get; set; }

        public Guid? BlockId { get; set; }

        [Required]
        [MaxLength(20)]
        public string RoomNumber { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string RoomType { get; set; } = string.Empty;

        [Required]
        public int Capacity { get; set; }

        public int Occupied { get; set; } = 0;

        [Required]
        public decimal RentPerBed { get; set; }

        [MaxLength(50)]
        public string? Floor { get; set; }

        [MaxLength(20)]
        public string Status { get; set; } = "available";

        public string? Facilities { get; set; }
    }

    public class HostelRoomResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid? BlockId { get; set; }
        public string? BlockName { get; set; }
        public string RoomNumber { get; set; } = string.Empty;
        public string RoomType { get; set; } = string.Empty;
        public int Capacity { get; set; }
        public int Occupied { get; set; }
        public decimal RentPerBed { get; set; }
        public string? Floor { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? Facilities { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    // Hostel Student DTOs
    public class CreateHostelStudentRequest
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

        [Required]
        public decimal MonthlyFee { get; set; }

        [MaxLength(20)]
        public string Status { get; set; } = "active";
    }

    public class HostelStudentResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string StudentClass { get; set; } = string.Empty;
        public string StudentSection { get; set; } = string.Empty;
        public string Gender { get; set; } = string.Empty;
        public Guid RoomId { get; set; }
        public string RoomNumber { get; set; } = string.Empty;
        public string RoomType { get; set; } = string.Empty;
        public string? Floor { get; set; }
        public DateTime CheckInDate { get; set; }
        public DateTime? CheckOutDate { get; set; }
        public decimal MonthlyFee { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class HostelRoomListResponse
    {
        public List<HostelRoomResponse> Rooms { get; set; } = new();
        public int Total { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }

    public class UpdateHostelStudentRequest
    {
        public Guid RoomId { get; set; }

        [Required]
        public DateTime CheckInDate { get; set; }

        public DateTime? CheckOutDate { get; set; }

        [Required]
        public decimal MonthlyFee { get; set; }

        [MaxLength(20)]
        public string Status { get; set; } = "active";
    }

    // Hostel Student with full details including student and room info
    public class HostelStudentDetailResponse
    {
        public Guid Id { get; set; }
        public Guid StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string StudentClass { get; set; } = string.Empty;
        public string StudentSection { get; set; } = string.Empty;
        public string Gender { get; set; } = string.Empty;
        public Guid RoomId { get; set; }
        public string RoomNumber { get; set; } = string.Empty;
        public string RoomType { get; set; } = string.Empty;
        public string? Floor { get; set; }
        public DateTime CheckInDate { get; set; }
        public DateTime? CheckOutDate { get; set; }
        public decimal MonthlyFee { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    // ── P1: Hostel Block DTOs ────────────────────────────────────────────────────

    public class CreateHostelBlockRequest
    {
        [Required] [MaxLength(100)] public string Name { get; set; } = string.Empty;
        [MaxLength(200)] public string? Description { get; set; }
        [MaxLength(100)] public string? WardenName { get; set; }
        [MaxLength(20)] public string? WardenContact { get; set; }
        public Guid? WardenStaffId { get; set; }
        [MaxLength(20)] public string? Gender { get; set; } = "mixed";
    }

    public class HostelBlockResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? WardenName { get; set; }
        public string? WardenContact { get; set; }
        public Guid? WardenStaffId { get; set; }
        public string Gender { get; set; } = "mixed";
        public string Status { get; set; } = "active";
        public int TotalRooms { get; set; }
        public int TotalCapacity { get; set; }
        public int TotalOccupied { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    // ── P1: Mess Billing DTOs ────────────────────────────────────────────────────

    public class CreateHostelMessBillingRequest
    {
        [Required] public Guid HostelStudentId { get; set; }
        [Required] [MaxLength(7)] public string Month { get; set; } = string.Empty;
        [Required] [Range(0.01, double.MaxValue)] public decimal Amount { get; set; }
        [MaxLength(500)] public string? Description { get; set; }
    }

    public class HostelMessBillingResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid HostelStudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string Month { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string? Description { get; set; }
        public bool IsPaid { get; set; }
        public DateTime? PaidDate { get; set; }
        /// <summary>Set when IsPaid=true; used to fetch the fee receipt.</summary>
        public Guid? PaymentTransactionId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    // ── P1: Visitor Log DTOs ─────────────────────────────────────────────────────

    public class CreateHostelVisitorLogRequest
    {
        [Required] public Guid HostelStudentId { get; set; }
        [Required] [MaxLength(150)] public string VisitorName { get; set; } = string.Empty;
        [MaxLength(20)] public string? VisitorContact { get; set; }
        [MaxLength(50)] public string? Relationship { get; set; }
        [MaxLength(500)] public string? Purpose { get; set; }
        public DateTime? CheckInTime { get; set; }
        [MaxLength(500)] public string? Notes { get; set; }
    }

    public class HostelVisitorLogResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid HostelStudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string VisitorName { get; set; } = string.Empty;
        public string? VisitorContact { get; set; }
        public string? Relationship { get; set; }
        public string? Purpose { get; set; }
        public DateTime CheckInTime { get; set; }
        public DateTime? CheckOutTime { get; set; }
        public string Status { get; set; } = "checked_in";
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    // ── P1: Hostel Leave DTOs ────────────────────────────────────────────────────

    public class CreateHostelLeaveRequest
    {
        [Required] public Guid HostelStudentId { get; set; }
        [Required] public DateTime FromDate { get; set; }
        [Required] public DateTime ToDate { get; set; }
        [Required] [MaxLength(500)] public string Reason { get; set; } = string.Empty;
        [MaxLength(150)] public string? ContactDuringLeave { get; set; }
    }

    public class HostelLeaveResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid HostelStudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string? ContactDuringLeave { get; set; }
        public string Status { get; set; } = "pending";
        public Guid? ApprovedBy { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public string? ApprovalRemarks { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class ApproveHostelLeaveRequest
    {
        [Required] public string Status { get; set; } = string.Empty; // approved / rejected
        [MaxLength(500)] public string? Remarks { get; set; }
    }
}

