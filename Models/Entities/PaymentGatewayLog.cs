using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    public class PaymentGatewayLog : BaseEntity
    {
        [Required]
        public Guid FeeRecordId { get; set; }

        [Required]
        public Guid TransactionId { get; set; }
        
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        [MaxLength(20)]
        public string Gateway { get; set; } = string.Empty; // razorpay, payu, stripe, manual

        [MaxLength(100)]
        public string? GatewayOrderId { get; set; }

        [MaxLength(100)]
        public string? GatewayPaymentId { get; set; }

        [MaxLength(100)]
        public string? GatewaySignature { get; set; }

        [Required]
        [Column(TypeName = "decimal(10, 2)")]
        public decimal Amount { get; set; }

        [MaxLength(3)]
        public string Currency { get; set; } = "INR";

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = string.Empty; // created, authorized, captured, failed, refunded

        [MaxLength(50)]
        public string? Method { get; set; } // card, netbanking, upi, wallet

        [MaxLength(100)]
        public string? CardLastFour { get; set; }

        [MaxLength(100)]
        public string? Bank { get; set; }

        [MaxLength(100)]
        public string? UpiId { get; set; }

        public string? WebhookData { get; set; } // JSON

        [MaxLength(500)]
        public string? ErrorMessage { get; set; }

        [MaxLength(50)]
        public string? ErrorCode { get; set; }

        public DateTime? CompletedAt { get; set; }

        [ForeignKey("FeeRecordId")]
        public virtual FeeRecord? FeeRecord { get; set; }

        [ForeignKey("TransactionId")]
        public virtual PaymentTransaction? Transaction { get; set; }
    }

    public class Refund : BaseEntity
    {
        [Required]
        public Guid TransactionId { get; set; }
        
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        [MaxLength(100)]
        public string RefundId { get; set; } = string.Empty; // Internal refund ID

        [MaxLength(100)]
        public string? GatewayRefundId { get; set; } // Razorpay/PayU refund ID

        [Required]
        [Column(TypeName = "decimal(10, 2)")]
        public decimal Amount { get; set; }

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "pending"; // pending, processing, completed, failed

        [Required]
        [MaxLength(500)]
        public string Reason { get; set; } = string.Empty;

        [MaxLength(50)]
        public string RefundMethod { get; set; } = "original"; // original, bank_transfer, cash

        public new Guid? CreatedBy { get; set; }

        public Guid? ProcessedBy { get; set; }

        public DateTime? ProcessedAt { get; set; }

        [MaxLength(500)]
        public string? Notes { get; set; }

        [MaxLength(500)]
        public string? ErrorMessage { get; set; }

        [ForeignKey("TransactionId")]
        public virtual PaymentTransaction? Transaction { get; set; }
    }
}
