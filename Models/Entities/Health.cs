using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    public class HealthRecord : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public Guid StudentId { get; set; }
        
        [Required]
        public DateTime CheckupDate { get; set; }
        
        [Column(TypeName = "decimal(5,2)")]
        public decimal? Height { get; set; }
        
        [Column(TypeName = "decimal(5,2)")]
        public decimal? Weight { get; set; }
        
        [MaxLength(10)]
        public string? BloodGroup { get; set; }
        
        [MaxLength(10)]
        public string? VisionLeft { get; set; }
        
        [MaxLength(10)]
        public string? VisionRight { get; set; }
        
        public string? Allergies { get; set; }
        
        public string? ChronicConditions { get; set; }
        
        public string? Medications { get; set; }
        
        public string? Vaccinations { get; set; }
        
        public string? Notes { get; set; }
        
        [MaxLength(100)]
        public string? CheckedBy { get; set; }
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
        
        [ForeignKey("StudentId")]
        public virtual Student? Student { get; set; }
    }
}
