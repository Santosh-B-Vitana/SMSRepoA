using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    public class ExamRegistration : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public Guid ExamId { get; set; }
        
        [Required]
        public Guid StudentId { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "registered"; // registered, appeared, absent, exempted, cancelled
        
        public bool? IsPresent { get; set; } // null before exam, true/false after attendance marked
        
        [MaxLength(20)]
        public string? SeatNumber { get; set; }
        
        [MaxLength(50)]
        public string? HallTicketNumber { get; set; }
        
        public DateTime RegisteredAt { get; set; } = DateTime.UtcNow;
        
        public string? Remarks { get; set; }
        
        // Navigation properties
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
        
        [ForeignKey("ExamId")]
        public virtual Exam? Exam { get; set; }
        
        [ForeignKey("StudentId")]
        public virtual Student? Student { get; set; }
    }
}
