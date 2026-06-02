using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SmsApi.Models.DTOs
{
    // ═══════════════════════════════════════════════════════════════
    // VEHICLE DTOs
    // ═══════════════════════════════════════════════════════════════

    public class CreateVehicleRequest
    {
        [Required]
        [MaxLength(30)]
        public string RegistrationNumber { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Make { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Model { get; set; } = string.Empty;

        public int? Year { get; set; }

        /// <summary>bus | van | car | tempo</summary>
        [MaxLength(20)]
        public string VehicleType { get; set; } = "bus";

        [Required]
        [Range(1, 100)]
        public int SeatingCapacity { get; set; }

        [MaxLength(50)]
        public string? Color { get; set; }

        /// <summary>diesel | petrol | cng | electric</summary>
        [MaxLength(20)]
        public string? FuelType { get; set; }

        // Compliance documents
        public DateTime? FitnessCertExpiry { get; set; }
        public DateTime? InsuranceExpiry { get; set; }
        public DateTime? PUCExpiry { get; set; }
        public DateTime? RoadTaxExpiry { get; set; }
        public DateTime? PermitExpiry { get; set; }

        // Service
        public DateTime? LastServiceDate { get; set; }
        public DateTime? NextServiceDue { get; set; }
        public int? OdometerKm { get; set; }

        // Driver
        public Guid? DriverStaffId { get; set; }

        [MaxLength(200)]
        public string? DriverName { get; set; }

        [MaxLength(20)]
        public string? DriverPhone { get; set; }

        [MaxLength(50)]
        public string? DriverLicenseNumber { get; set; }

        public DateTime? DriverLicenseExpiry { get; set; }
        public string? Notes { get; set; }
    }

    public class UpdateVehicleRequest
    {
        [MaxLength(30)]
        public string? RegistrationNumber { get; set; }

        [MaxLength(100)]
        public string? Make { get; set; }

        [MaxLength(100)]
        public string? Model { get; set; }

        public int? Year { get; set; }

        [MaxLength(20)]
        public string? VehicleType { get; set; }

        public int? SeatingCapacity { get; set; }

        [MaxLength(50)]
        public string? Color { get; set; }

        [MaxLength(20)]
        public string? FuelType { get; set; }

        public DateTime? FitnessCertExpiry { get; set; }
        public DateTime? InsuranceExpiry { get; set; }
        public DateTime? PUCExpiry { get; set; }
        public DateTime? RoadTaxExpiry { get; set; }
        public DateTime? PermitExpiry { get; set; }
        public DateTime? LastServiceDate { get; set; }
        public DateTime? NextServiceDue { get; set; }
        public int? OdometerKm { get; set; }
        public Guid? DriverStaffId { get; set; }

        [MaxLength(200)]
        public string? DriverName { get; set; }

        [MaxLength(20)]
        public string? DriverPhone { get; set; }

        [MaxLength(50)]
        public string? DriverLicenseNumber { get; set; }

        public DateTime? DriverLicenseExpiry { get; set; }

        [MaxLength(30)]
        public string? Status { get; set; }

        public string? Notes { get; set; }
    }

    public class VehicleResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string RegistrationNumber { get; set; } = string.Empty;
        public string Make { get; set; } = string.Empty;
        public string Model { get; set; } = string.Empty;
        public int? Year { get; set; }
        public string VehicleType { get; set; } = string.Empty;
        public int SeatingCapacity { get; set; }
        public string? Color { get; set; }
        public string? FuelType { get; set; }
        public DateTime? FitnessCertExpiry { get; set; }
        public DateTime? InsuranceExpiry { get; set; }
        public DateTime? PUCExpiry { get; set; }
        public DateTime? RoadTaxExpiry { get; set; }
        public DateTime? PermitExpiry { get; set; }
        public DateTime? LastServiceDate { get; set; }
        public DateTime? NextServiceDue { get; set; }
        public int? OdometerKm { get; set; }
        public Guid? DriverStaffId { get; set; }
        public string? DriverName { get; set; }
        public string? DriverPhone { get; set; }
        public string? DriverLicenseNumber { get; set; }
        public DateTime? DriverLicenseExpiry { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? Notes { get; set; }
        public string? AssignedRouteName { get; set; }

        /// <summary>Compliance alerts: documents expiring within 30 days</summary>
        public List<VehicleComplianceAlert> ComplianceAlerts { get; set; } = new();
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class VehicleComplianceAlert
    {
        public string DocumentType { get; set; } = string.Empty;
        public DateTime ExpiryDate { get; set; }
        public int DaysUntilExpiry { get; set; }

        /// <summary>expired | expiring_soon | ok</summary>
        public string Severity { get; set; } = string.Empty;
    }

    public class VehicleListResponse
    {
        public List<VehicleResponse> Vehicles { get; set; } = new();
        public int Total { get; set; }
        public int AlertCount { get; set; }
    }

    // ═══════════════════════════════════════════════════════════════
    // TRANSPORT STOP DTOs
    // ═══════════════════════════════════════════════════════════════

    public class CreateTransportStopRequest
    {
        [Required]
        [MaxLength(200)]
        public string StopName { get; set; } = string.Empty;

        [Required]
        [Range(1, 999)]
        public int StopOrder { get; set; }

        [MaxLength(300)]
        public string? Landmark { get; set; }

        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }
        public TimeSpan? MorningArrivalTime { get; set; }
        public TimeSpan? EveningDepartureTime { get; set; }
        public decimal? DistanceKm { get; set; }
    }

    public class UpdateTransportStopRequest
    {
        [MaxLength(200)]
        public string? StopName { get; set; }

        public int? StopOrder { get; set; }

        [MaxLength(300)]
        public string? Landmark { get; set; }

        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }
        public TimeSpan? MorningArrivalTime { get; set; }
        public TimeSpan? EveningDepartureTime { get; set; }
        public decimal? DistanceKm { get; set; }

        [MaxLength(20)]
        public string? Status { get; set; }
    }

    public class ReorderStopsRequest
    {
        /// <summary>Ordered list of stop IDs in the new sequence</summary>
        [Required]
        public List<Guid> OrderedStopIds { get; set; } = new();
    }

    public class TransportStopResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid RouteId { get; set; }
        public string StopName { get; set; } = string.Empty;
        public int StopOrder { get; set; }
        public string? Landmark { get; set; }
        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }
        public TimeSpan? MorningArrivalTime { get; set; }
        public TimeSpan? EveningDepartureTime { get; set; }
        public decimal? DistanceKm { get; set; }
        public string Status { get; set; } = string.Empty;
        public int StudentsPickupCount { get; set; }
        public int StudentsDropCount { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
