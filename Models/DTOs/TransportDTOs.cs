using System;
using System.ComponentModel.DataAnnotations;

namespace SmsApi.Models.DTOs
{
    // Transport Route Basic DTO - Lightweight version for list views
    public class TransportRouteBasicDto
    {
        public Guid Id { get; set; }
        public string RouteNumber { get; set; } = string.Empty;
        public string RouteName { get; set; } = string.Empty;
        public string? VehicleNumber { get; set; }
        public string? DriverName { get; set; }
        public decimal? MonthlyFee { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    // Transport Student Basic DTO - Lightweight version for list views
    public class TransportStudentBasicDto
    {
        public Guid Id { get; set; }
        public Guid StudentId { get; set; }
        public Guid RouteId { get; set; }
        public string? PickupPoint { get; set; }
        public decimal? MonthlyFee { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    // Transport Route DTOs
    public class CreateTransportRouteRequest
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        [MaxLength(50)]
        public string RouteNumber { get; set; } = string.Empty;

        [Required]
        [MaxLength(200)]
        public string RouteName { get; set; } = string.Empty;

        [MaxLength(50)]
        public string? VehicleNumber { get; set; }

        [MaxLength(100)]
        public string? DriverName { get; set; }

        [MaxLength(20)]
        public string? DriverPhone { get; set; }

        public TimeSpan? StartTime { get; set; }

        public TimeSpan? EndTime { get; set; }

        public int Capacity { get; set; } = 50;

        public decimal? MonthlyFee { get; set; }

        [MaxLength(20)]
        public string Status { get; set; } = "active";
    }

    public class TransportRouteResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string RouteNumber { get; set; } = string.Empty;
        public string RouteName { get; set; } = string.Empty;
        public string? VehicleNumber { get; set; }
        public string? DriverName { get; set; }
        public string? DriverPhone { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public int Capacity { get; set; }
        public int StudentsAssigned { get; set; }
        public decimal? MonthlyFee { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    // Transport Student DTOs
    public class CreateTransportStudentRequest
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        public Guid StudentId { get; set; }

        [Required]
        public Guid RouteId { get; set; }

        [MaxLength(200)]
        public string? PickupPoint { get; set; }

        [MaxLength(200)]
        public string? DropPoint { get; set; }

        public decimal? MonthlyFee { get; set; }

        [MaxLength(20)]
        public string Status { get; set; } = "active";
    }

    public class TransportStudentResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid StudentId { get; set; }
        public Guid RouteId { get; set; }
        public string? PickupPoint { get; set; }
        public string? DropPoint { get; set; }
        public decimal? MonthlyFee { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class TransportRouteListResponse
    {
        public List<TransportRouteResponse> Routes { get; set; } = new();
        public int Total { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }

    // Transport Student with full details including student info
    public class TransportStudentDetailResponse
    {
        public Guid Id { get; set; }
        public Guid StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string StudentClass { get; set; } = string.Empty;
        public string StudentSection { get; set; } = string.Empty;
        public Guid RouteId { get; set; }
        public string RouteName { get; set; } = string.Empty;
        public string RouteNumber { get; set; } = string.Empty;
        public string? PickupPoint { get; set; }
        public string? DropPoint { get; set; }
        public decimal? MonthlyFee { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }
}
