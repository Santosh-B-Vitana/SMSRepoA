using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    public class FeeStructure : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(20)]
        public string Class { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(20)]
        public string AcademicYear { get; set; } = string.Empty;
        
        [Required]
        [Column(TypeName = "decimal(12,2)")]
        public decimal TotalAmount { get; set; }
        
        public string? Description { get; set; }
        
        // Fee Components
        [Column(TypeName = "decimal(12,2)")]
        public decimal TuitionFee { get; set; } = 0;
        
        [Column(TypeName = "decimal(12,2)")]
        public decimal AdmissionFee { get; set; } = 0;
        
        [Column(TypeName = "decimal(12,2)")]
        public decimal ExamFee { get; set; } = 0;
        
        [Column(TypeName = "decimal(12,2)")]
        public decimal LibraryFee { get; set; } = 0;
        
        [Column(TypeName = "decimal(12,2)")]
        public decimal LabFee { get; set; } = 0;
        
        [Column(TypeName = "decimal(12,2)")]
        public decimal SportsFee { get; set; } = 0;
        
        [Column(TypeName = "decimal(12,2)")]
        public decimal TransportFee { get; set; } = 0;
        
        [Column(TypeName = "decimal(12,2)")]
        public decimal HostelFee { get; set; } = 0;
        
        [Column(TypeName = "decimal(12,2)")]
        public decimal UniformFee { get; set; } = 0;
        
        [Column(TypeName = "decimal(12,2)")]
        public decimal BooksFee { get; set; } = 0;
        
        [Column(TypeName = "decimal(12,2)")]
        public decimal DevelopmentFee { get; set; } = 0;
        
        [Column(TypeName = "decimal(12,2)")]
        public decimal Miscellaneous { get; set; } = 0;
        
        // Installments
        public int InstallmentCount { get; set; } = 1;
        
        public string? InstallmentAmounts { get; set; } // JSON array
        
        public string? InstallmentDueDates { get; set; } // JSON array
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
    }

    public class FeeRecord : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public Guid StudentId { get; set; }
        
        public Guid? FeeStructureId { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(12,2)")]
        public decimal TotalAmount { get; set; }
        
        [Column(TypeName = "decimal(12,2)")]
        public decimal PaidAmount { get; set; } = 0;
        
        [Column(TypeName = "decimal(12,2)")]
        public decimal DiscountAmount { get; set; } = 0;
        
        [Column(TypeName = "decimal(12,2)")]
        public decimal LateFeeAmount { get; set; } = 0;
        
        // Computed column in database
        [Column(TypeName = "decimal(12,2)")]
        public decimal PendingAmount { get; set; }
        
        [Column(TypeName = "decimal(12,2)")]
        public decimal BalanceAmount { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "pending"; // paid, pending, overdue, partial
        
        [Required]
        public DateTime DueDate { get; set; }
        
        public DateTime? LastPaymentDate { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string AcademicYear { get; set; } = string.Empty;

        /// <summary>
        /// FK to the StudentEnrollment row for this fee record — provides year + class context
        /// without joining through Student. Null on rows created before this column was added.
        /// </summary>
        public Guid? StudentEnrollmentId { get; set; }
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
        
        [ForeignKey("StudentId")]
        public virtual Student? Student { get; set; }
        
        [ForeignKey("FeeStructureId")]
        public virtual FeeStructure? FeeStructure { get; set; }

        [ForeignKey("StudentEnrollmentId")]
        public virtual StudentEnrollment? StudentEnrollment { get; set; }
    }

    public class PaymentTransaction : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public Guid StudentId { get; set; }
        
        [Required]
        public Guid FeeRecordId { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(12,2)")]
        public decimal Amount { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string Method { get; set; } = string.Empty; // cash, card, online, cheque, razorpay, payu, upi
        
        [MaxLength(50)]
        public string? PaymentMethod { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "pending"; // success, pending, failed, refunded
        
        [Required]
        public DateTime Date { get; set; }
        
        public DateTime? TransactionDate { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string ReceiptNumber { get; set; } = string.Empty;
        
        [MaxLength(100)]
        public string? TransactionNumber { get; set; }
        
        [MaxLength(100)]
        public string? ReferenceNumber { get; set; }
        
        [MaxLength(100)]
        public string? GatewayRef { get; set; }
        
        [MaxLength(100)]
        public string? GatewayOrderId { get; set; }
        
        [MaxLength(50)]
        public string? ChequeNumber { get; set; }
        
        public DateTime? ChequeDate { get; set; }
        
        [MaxLength(100)]
        public string? BankName { get; set; }
        
        public string? Remarks { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string ProcessedBy { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(20)]
        public string AcademicYear { get; set; } = string.Empty;
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
        
        [ForeignKey("StudentId")]
        public virtual Student? Student { get; set; }
        
        [ForeignKey("FeeRecordId")]
        public virtual FeeRecord? FeeRecord { get; set; }
    }
    
    public class LateFeeConfig : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public int GracePeriodDays { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string FeeType { get; set; } = string.Empty; // fixed, percentage, daily
        
        [Required]
        [Column(TypeName = "decimal(12,2)")]
        public decimal Amount { get; set; }
        
        [Column(TypeName = "decimal(12,2)")]
        public decimal? MaxAmount { get; set; }
        
        [Required]
        public bool IsActive { get; set; } = true;
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
    }
}
