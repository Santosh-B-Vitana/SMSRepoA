using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    /// <summary>
    /// Finance Account - Chart of Accounts for school accounting
    /// </summary>
    public class FinanceAccount : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(20)]
        public string Type { get; set; } = string.Empty; // ASSET, LIABILITY, EQUITY, INCOME, EXPENSE
        
        public Guid? ParentAccountId { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(15,2)")]
        public decimal Balance { get; set; } = 0;
        
        public bool IsActive { get; set; } = true;
        
        [MaxLength(500)]
        public string? Description { get; set; }
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
        
        [ForeignKey("ParentAccountId")]
        public virtual FinanceAccount? ParentAccount { get; set; }
    }

    /// <summary>
    /// Finance Transaction - Double-entry accounting transactions
    /// </summary>
    public class FinanceTransaction : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public Guid AccountId { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(15,2)")]
        public decimal Amount { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string Type { get; set; } = string.Empty; // DEBIT, CREDIT
        
        [Required]
        public Guid CategoryId { get; set; }
        
        [Required]
        public DateTime Date { get; set; }
        
        [Required]
        [MaxLength(500)]
        public string Description { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(30)]
        public string Source { get; set; } = string.Empty; // FEE, STORE, PETTY_CASH, DONATION, OTHER
        
        [MaxLength(500)]
        public string? ReceiptUrl { get; set; }
        
        [MaxLength(100)]
        public string? ReferenceNumber { get; set; }
        
        public Guid? ProcessedByStaffId { get; set; }
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
        
        [ForeignKey("AccountId")]
        public virtual FinanceAccount? Account { get; set; }
        
        [ForeignKey("CategoryId")]
        public virtual FinanceCategory? Category { get; set; }
    }

    /// <summary>
    /// Finance Category - Income/Expense categories with budgets
    /// </summary>
    public class FinanceCategory : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(20)]
        public string Type { get; set; } = string.Empty; // INCOME, EXPENSE
        
        [Column(TypeName = "decimal(15,2)")]
        public decimal? Budget { get; set; }
        
        public bool IsActive { get; set; } = true;
        
        [MaxLength(500)]
        public string? Description { get; set; }
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
    }

    /// <summary>
    /// Petty Cash Entry - Small expense approval workflow
    /// </summary>
    public class PettyCashEntry : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public DateTime Date { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(10,2)")]
        public decimal Amount { get; set; }
        
        [Required]
        [MaxLength(500)]
        public string Purpose { get; set; } = string.Empty;
        
        [Required]
        public Guid RequestedByStaffId { get; set; }
        
        public Guid? ApprovedByStaffId { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "PENDING"; // PENDING, APPROVED, REJECTED
        
        [MaxLength(500)]
        public string? ReceiptUrl { get; set; }
        
        [MaxLength(500)]
        public string? ApprovalRemarks { get; set; }
        
        public DateTime? ApprovedAt { get; set; }
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
    }

    /// <summary>
    /// Store Sale - School store sales tracking
    /// </summary>
    public class StoreSale : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public DateTime Date { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(10,2)")]
        public decimal Amount { get; set; }
        
        [Required]
        public int ItemsCount { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string PaymentMethod { get; set; } = string.Empty; // Cash, Card, UPI
        
        [MaxLength(100)]
        public string? InvoiceNumber { get; set; }
        
        [MaxLength(500)]
        public string? Notes { get; set; }
        
        public Guid? ProcessedByStaffId { get; set; }
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
    }
}
