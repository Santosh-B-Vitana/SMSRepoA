using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    public class HostelRoom : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
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
    }
}
