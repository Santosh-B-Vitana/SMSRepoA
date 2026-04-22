using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    public class ConcessionType : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;
        
        public string? Description { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string DiscountType { get; set; } = "Percentage"; // Percentage, FixedAmount
        
        [Required]
        [Column(TypeName = "decimal(10,2)")]
        public decimal DiscountValue { get; set; }
        
        [Column(TypeName = "decimal(12,2)")]
        public decimal? MaxDiscountAmount { get; set; }
        
        [MaxLength(100)]
        public string? ApplicableFor { get; set; } // All, Specific Classes, Specific Categories
        
        public bool RequiresDocuments { get; set; } = false;
        
        public bool RequiresApproval { get; set; } = true;
        
        public DateTime? ValidFrom { get; set; }
        
        public DateTime? ValidTo { get; set; }
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
    }

    public class FeeConcession : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string ConcessionNumber { get; set; } = string.Empty;
        
        [Required]
        public Guid StudentId { get; set; }
        
        [Required]
        public Guid ConcessionTypeId { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string AcademicYear { get; set; } = string.Empty;
        
        [Required]
        public string Reason { get; set; } = string.Empty;
        
        public string? DocumentUrls { get; set; } // JSON array of document URLs
        
        [Required]
        [Column(TypeName = "decimal(12,2)")]
        public decimal AppliedAmount { get; set; }
        
        [Column(TypeName = "decimal(12,2)")]
        public decimal ApprovedAmount { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Pending"; // Pending, Approved, Rejected, Expired
        
        public Guid? ApprovedByStaffId { get; set; }
        
        public DateTime? ApprovedDate { get; set; }
        
        public string? ApproverRemarks { get; set; }
        
        public DateTime? ValidFrom { get; set; }
        
        public DateTime? ValidTo { get; set; }
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
        
        [ForeignKey("StudentId")]
        public virtual Student? Student { get; set; }
        
        [ForeignKey("ConcessionTypeId")]
        public virtual ConcessionType? ConcessionType { get; set; }
    }
}
