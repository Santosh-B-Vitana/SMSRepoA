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
        public Guid RoomId { get; set; }
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
}
