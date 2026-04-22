using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
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
        
        [MaxLength(20)]
        public string? VehicleNumber { get; set; }
        
        [MaxLength(200)]
        public string? DriverName { get; set; }
        
        [MaxLength(20)]
        public string? DriverContact { get; set; }
        
        [MaxLength(20)]
        public string? DriverPhone { get; set; }
        
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
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
    }

    public class TransportStudent : BaseEntity
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
        
        [Column(TypeName = "decimal(10,2)")]
        public decimal Fare { get; set; }
        
        [Column(TypeName = "decimal(10,2)")]
        public decimal? MonthlyFee { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "active";
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
        
        [ForeignKey("StudentId")]
        public virtual Student? Student { get; set; }
        
        [ForeignKey("RouteId")]
        public virtual TransportRoute? Route { get; set; }
    }
}
