using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    public class PerformanceReview : BaseEntity
    {
        [Required]
        public Guid StaffId { get; set; }
        
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        public DateTime ReviewDate { get; set; }

        [Required]
        [MaxLength(20)]
        public string ReviewPeriod { get; set; } = string.Empty; // monthly, quarterly, annual

        [Required]
        public Guid ReviewerId { get; set; }

        [Required]
        [MaxLength(200)]
        public string ReviewerName { get; set; } = string.Empty;

        // Rating Categories (1-5 scale)
        [Range(1, 5)]
        public int? TeachingQuality { get; set; }

        [Range(1, 5)]
        public int? ClassroomManagement { get; set; }

        [Range(1, 5)]
        public int? StudentEngagement { get; set; }

        [Range(1, 5)]
        public int? Punctuality { get; set; }

        [Range(1, 5)]
        public int? Professionalism { get; set; }

        [Range(1, 5)]
        public int? Collaboration { get; set; }

        [Range(1, 5)]
        public int? OverallRating { get; set; }

        [MaxLength(2000)]
        public string? Strengths { get; set; }

        [MaxLength(2000)]
        public string? AreasOfImprovement { get; set; }

        [MaxLength(2000)]
        public string? Goals { get; set; }

        [MaxLength(2000)]
        public string? Comments { get; set; }

        [MaxLength(20)]
        public string Status { get; set; } = "draft"; // draft, submitted, acknowledged

        public DateTime? AcknowledgedAt { get; set; }

        [ForeignKey("StaffId")]
        public virtual Staff? Staff { get; set; }
    }
}
