using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    /// <summary>
    /// Stores the most recent GPS location ping for a vehicle.
    /// Kept lightweight — one row per vehicle (upserted on each ping).
    /// Historical tracking is outside the scope of this MVP.
    /// </summary>
    public class VehicleGpsLocation : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        public Guid VehicleId { get; set; }

        /// <summary>Route this vehicle is currently serving.</summary>
        public Guid? ActiveRouteId { get; set; }

        [Required]
        public double Latitude { get; set; }

        [Required]
        public double Longitude { get; set; }

        /// <summary>Speed in km/h, null if unknown.</summary>
        public double? SpeedKmh { get; set; }

        /// <summary>Heading in degrees (0–360), null if unknown.</summary>
        public double? Heading { get; set; }

        [MaxLength(20)]
        public string Status { get; set; } = "running"; // running, stopped, maintenance

        /// <summary>Timestamp of the GPS ping (may differ from UpdatedAt).</summary>
        public DateTime PingTime { get; set; } = DateTime.UtcNow;

        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }

        [ForeignKey("VehicleId")]
        public virtual Vehicle? Vehicle { get; set; }
    }
}
