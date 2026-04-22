using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    public class PaymentGatewayConfig : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string GatewayName { get; set; } = string.Empty; // Razorpay, Stripe, PayPal, etc.
        
        [Required]
        [MaxLength(200)]
        public string MerchantId { get; set; } = string.Empty;
        
        [Required]
        public string ApiKey { get; set; } = string.Empty; // Encrypted
        
        public string? ApiSecret { get; set; } // Encrypted
        
        [MaxLength(20)]
        public string? Mode { get; set; } = "Test"; // Test, Production
        
        [MaxLength(10)]
        public string? Currency { get; set; } = "INR";
        
        public bool IsActive { get; set; } = true;
        
        public bool IsDefault { get; set; } = false;
        
        [Column(TypeName = "decimal(5,2)")]
        public decimal? TransactionFeePercentage { get; set; }
        
        [Column(TypeName = "decimal(10,2)")]
        public decimal? TransactionFeeFixed { get; set; }
        
        public string? WebhookUrl { get; set; }
        
        public string? ReturnUrl { get; set; }
        
        public string? CallbackUrl { get; set; }
        
        public string? AdditionalConfig { get; set; } // JSON for gateway-specific settings
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
    }

    public class GatewayPaymentTransaction : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string TransactionId { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(100)]
        public string GatewayName { get; set; } = string.Empty;
        
        [MaxLength(200)]
        public string? GatewayTransactionId { get; set; }
        
        [MaxLength(200)]
        public string? GatewayOrderId { get; set; }
        
        [Required]
        public Guid PayerId { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string PayerType { get; set; } = string.Empty; // Student, Staff, Parent
        
        [Required]
        [Column(TypeName = "decimal(12,2)")]
        public decimal Amount { get; set; }
        
        [Column(TypeName = "decimal(12,2)")]
        public decimal? TransactionFee { get; set; }
        
        [Column(TypeName = "decimal(12,2)")]
        public decimal? NetAmount { get; set; }
        
        [Required]
        [MaxLength(10)]
        public string Currency { get; set; } = "INR";
        
        [Required]
        [MaxLength(50)]
        public string Purpose { get; set; } = string.Empty; // FeePayment, WalletTopup, StorePayment
        
        public Guid? ReferenceId { get; set; } // Related FeeRecord, Order, etc.
        
        [MaxLength(100)]
        public string? ReferenceType { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Initiated"; // Initiated, Pending, Success, Failed, Refunded
        
        [MaxLength(50)]
        public string? PaymentMethod { get; set; } // Card, NetBanking, UPI, Wallet
        
        public DateTime? PaymentDate { get; set; }
        
        public string? GatewayResponse { get; set; } // JSON response from gateway
        
        public string? ErrorCode { get; set; }
        
        public string? ErrorMessage { get; set; }
        
        public string? CustomerEmail { get; set; }
        
        public string? CustomerPhone { get; set; }
        
        [MaxLength(200)]
        public string? BankTransactionId { get; set; }
        
        public string? AdditionalData { get; set; } // JSON for additional transaction data
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
    }

    public class PaymentRefund : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string RefundId { get; set; } = string.Empty;
        
        [Required]
        public Guid PaymentTransactionId { get; set; }
        
        [MaxLength(200)]
        public string? GatewayRefundId { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(12,2)")]
        public decimal RefundAmount { get; set; }
        
        [Required]
        public string Reason { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Initiated"; // Initiated, Processing, Success, Failed
        
        public Guid? InitiatedByStaffId { get; set; }
        
        public DateTime? ProcessedDate { get; set; }
        
        public string? GatewayResponse { get; set; }
        
        public string? Remarks { get; set; }
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
        
        [ForeignKey("PaymentTransactionId")]
        public virtual PaymentTransaction? PaymentTransaction { get; set; }
    }
}
