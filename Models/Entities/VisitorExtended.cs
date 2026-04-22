using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    // ========== VISITOR PRE-REGISTRATION ==========
    public class VisitorPreRegistration : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        [MaxLength(200)]
        public string VisitorName { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(20)]
        public string VisitorPhone { get; set; } = string.Empty;
        
        [MaxLength(200)]
        public string? VisitorEmail { get; set; }
        
        [MaxLength(500)]
        public string? VisitorCompany { get; set; }
        
        [Required]
        [MaxLength(200)]
        public string Purpose { get; set; } = string.Empty;
        
        [MaxLength(1000)]
        public string? PurposeDetails { get; set; }
        
        [Required]
        [MaxLength(200)]
        public string PersonToMeet { get; set; } = string.Empty;
        
        public Guid? PersonToMeetId { get; set; }
        
        [MaxLength(100)]
        public string? Department { get; set; }
        
        [Required]
        public DateTime ExpectedDate { get; set; }
        
        public TimeSpan? ExpectedTime { get; set; }
        
        public int? ExpectedDuration { get; set; } // in minutes
        
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "Pending"; // Pending, Approved, Rejected, Arrived, Cancelled
        
        [Required]
        public Guid RegisteredBy { get; set; }
        
        public Guid? ApprovedBy { get; set; }
        
        public DateTime? ApprovedAt { get; set; }
        
        [MaxLength(1000)]
        public string? ApprovalNotes { get; set; }
        
        [MaxLength(1000)]
        public string? RejectionReason { get; set; }
        
        public Guid? VisitorId { get; set; } // Links to Visitor when they arrive
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
        
        [ForeignKey("VisitorId")]
        public virtual Visitor? Visitor { get; set; }
    }
}
