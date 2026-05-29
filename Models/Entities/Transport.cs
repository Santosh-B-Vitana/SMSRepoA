using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    /// <summary>
    /// School vehicle — registration, insurance, fitness and service tracking.
    /// Linked to routes via TransportRoute.VehicleId.
    /// </summary>
    public class Vehicle : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

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

        public int SeatingCapacity { get; set; }

        [MaxLength(50)]
        public string? Color { get; set; }

        /// <summary>diesel | petrol | cng | electric</summary>
        [MaxLength(20)]
        public string? FuelType { get; set; }

        // ── Compliance documents ───────────────────────────────────────────
        public DateTime? FitnessCertExpiry { get; set; }
        public DateTime? InsuranceExpiry { get; set; }
        public DateTime? PUCExpiry { get; set; }
        public DateTime? RoadTaxExpiry { get; set; }
        public DateTime? PermitExpiry { get; set; }

        // ── Service history ────────────────────────────────────────────────
        public DateTime? LastServiceDate { get; set; }
        public DateTime? NextServiceDue { get; set; }
        public int? OdometerKm { get; set; }

        // ── Driver (can be a staff member or external) ─────────────────────
        /// <summary>FK to Staff if driver is a school staff member</summary>
        public Guid? DriverStaffId { get; set; }

        [MaxLength(200)]
        public string? DriverName { get; set; }

        [MaxLength(20)]
        public string? DriverPhone { get; set; }

        [MaxLength(50)]
        public string? DriverLicenseNumber { get; set; }

        public DateTime? DriverLicenseExpiry { get; set; }

        /// <summary>active | inactive | under_maintenance | retired</summary>
        [Required]
        [MaxLength(30)]
        public string Status { get; set; } = "active";

        public string? Notes { get; set; }

        // Navigation
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }

        [ForeignKey("DriverStaffId")]
        public virtual Staff? DriverStaff { get; set; }

        public virtual ICollection<TransportRoute> Routes { get; set; } = new List<TransportRoute>();
    }

    public class TransportRoute : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        [MaxLength(100)]
        public string RouteName { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        public string RouteNumber { get; set; } = string.Empty;

        // ── Legacy string fields (kept for backward compat) ────────────────
        [MaxLength(20)]
        public string? VehicleNumber { get; set; }

        [MaxLength(200)]
        public string? DriverName { get; set; }

        [MaxLength(20)]
        public string? DriverContact { get; set; }

        [MaxLength(20)]
        public string? DriverPhone { get; set; }

        // ── Structured vehicle FK (preferred) ─────────────────────────────
        /// <summary>FK to Vehicle entity — set after vehicles are configured</summary>
        public Guid? VehicleId { get; set; }

        public TimeSpan StartTime { get; set; }

        public TimeSpan EndTime { get; set; }

        [Column(TypeName = "decimal(10,2)")]
        public decimal Fare { get; set; }

        [Column(TypeName = "decimal(10,2)")]
        public decimal? MonthlyFee { get; set; }

        public int Capacity { get; set; }

        public int StudentsAssigned { get; set; } = 0;

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "active";

        // Navigation
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }

        [ForeignKey("VehicleId")]
        public virtual Vehicle? Vehicle { get; set; }

        public virtual ICollection<TransportStop> Stops { get; set; } = new List<TransportStop>();
    }

    /// <summary>
    /// A named stop on a transport route with sequence order and timing.
    /// Students are assigned to a pickup stop and a drop stop.
    /// </summary>
    public class TransportStop : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        public Guid RouteId { get; set; }

        [Required]
        [MaxLength(200)]
        public string StopName { get; set; } = string.Empty;

        /// <summary>Position in route sequence (1 = first stop)</summary>
        [Required]
        public int StopOrder { get; set; }

        /// <summary>Landmark or nearby area description</summary>
        [MaxLength(300)]
        public string? Landmark { get; set; }

        [Column(TypeName = "decimal(10,7)")]
        public decimal? Latitude { get; set; }

        [Column(TypeName = "decimal(10,7)")]
        public decimal? Longitude { get; set; }

        /// <summary>Morning pickup arrival time (e.g. 07:15)</summary>
        public TimeSpan? MorningArrivalTime { get; set; }

        /// <summary>Evening drop departure time from this stop (e.g. 14:30)</summary>
        public TimeSpan? EveningDepartureTime { get; set; }

        /// <summary>Approximate distance from school in km</summary>
        [Column(TypeName = "decimal(6,2)")]
        public decimal? DistanceKm { get; set; }

        [MaxLength(20)]
        public string Status { get; set; } = "active";

        // Navigation
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }

        [ForeignKey("RouteId")]
        public virtual TransportRoute? Route { get; set; }
    }

    public class TransportStudent : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        public Guid StudentId { get; set; }

        [Required]
        public Guid RouteId { get; set; }

        // ── Legacy free-text (kept for backward compat) ────────────────────
        [MaxLength(200)]
        public string? PickupPoint { get; set; }

        [MaxLength(200)]
        public string? DropPoint { get; set; }

        // ── Structured stop FKs (preferred) ───────────────────────────────
        /// <summary>FK to TransportStop where student boards the bus in the morning</summary>
        public Guid? PickupStopId { get; set; }

        /// <summary>FK to TransportStop where student alights in the evening</summary>
        public Guid? DropStopId { get; set; }

        [Column(TypeName = "decimal(10,2)")]
        public decimal Fare { get; set; }

        [Column(TypeName = "decimal(10,2)")]
        public decimal? MonthlyFee { get; set; }

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "active";

        // Navigation
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }

        [ForeignKey("StudentId")]
        public virtual Student? Student { get; set; }

        [ForeignKey("RouteId")]
        public virtual TransportRoute? Route { get; set; }

        [ForeignKey("PickupStopId")]
        public virtual TransportStop? PickupStop { get; set; }

        [ForeignKey("DropStopId")]
        public virtual TransportStop? DropStop { get; set; }
    }
}

