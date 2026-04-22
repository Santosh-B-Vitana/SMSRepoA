using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    public class StoreItem : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [MaxLength(50)]
        public string? ItemCode { get; set; }
        
        [MaxLength(500)]
        public string? Description { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string Category { get; set; } = string.Empty; // Uniform, Books, Stationery, Sports, Food
        
        [Required]
        [Column(TypeName = "decimal(10,2)")]
        public decimal Price { get; set; }
        
        [Required]
        public int StockQuantity { get; set; } = 0;
        
        public int MinStockLevel { get; set; } = 0;
        
        [MaxLength(50)]
        public string? Unit { get; set; } // Piece, Set, Kg, Liter
        
        [MaxLength(500)]
        public string? ImageUrl { get; set; }
        
        public bool IsAvailable { get; set; } = true;
        
        public bool IsActive { get; set; } = true;
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
    }

    public class StoreOrder : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string OrderNumber { get; set; } = string.Empty;
        
        [Required]
        public Guid CustomerId { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string CustomerType { get; set; } = string.Empty; // Student, Staff, Parent
        
        public DateTime OrderDate { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(12,2)")]
        public decimal TotalAmount { get; set; }
        
        [Column(TypeName = "decimal(12,2)")]
        public decimal DiscountAmount { get; set; } = 0;
        
        [Column(TypeName = "decimal(12,2)")]
        public decimal TaxAmount { get; set; } = 0;
        
        [Column(TypeName = "decimal(12,2)")]
        public decimal FinalAmount { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "Pending"; // Pending, Confirmed, Processing, Packed, Delivered, Cancelled
        
        [MaxLength(50)]
        public string? PaymentMethod { get; set; } // Cash, Wallet, Card, UPI
        
        [MaxLength(20)]
        public string? PaymentStatus { get; set; } // Pending, Paid, Refunded
        
        public DateTime? PaymentDate { get; set; }
        
        [MaxLength(100)]
        public string? PaymentReference { get; set; }
        
        public DateTime? DeliveryDate { get; set; }
        
        public Guid? ProcessedByStaffId { get; set; }
        
        [MaxLength(1000)]
        public string? Remarks { get; set; }
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
        
        public virtual ICollection<StoreOrderItem>? OrderItems { get; set; }
    }

    public class StoreOrderItem : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public Guid OrderId { get; set; }
        
        [Required]
        public Guid ItemId { get; set; }
        
        [Required]
        public int Quantity { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(10,2)")]
        public decimal UnitPrice { get; set; }
        
        [Column(TypeName = "decimal(10,2)")]
        public decimal DiscountAmount { get; set; } = 0;
        
        [Required]
        [Column(TypeName = "decimal(12,2)")]
        public decimal TotalPrice { get; set; }
        
        [MaxLength(500)]
        public string? Remarks { get; set; }
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
        
        [ForeignKey("OrderId")]
        public virtual StoreOrder? Order { get; set; }
        
        [ForeignKey("ItemId")]
        public virtual StoreItem? Item { get; set; }
    }

    public class StoreInventoryLog : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public Guid ItemId { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string TransactionType { get; set; } = string.Empty; // Purchase, Sale, Adjustment, Return, Damage
        
        [Required]
        public int Quantity { get; set; }
        
        public int QuantityBefore { get; set; }
        
        public int QuantityAfter { get; set; }
        
        [MaxLength(100)]
        public string? Reference { get; set; }
        
        [MaxLength(500)]
        public string? Remarks { get; set; }
        
        public Guid? ProcessedByStaffId { get; set; }
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
        
        [ForeignKey("ItemId")]
        public virtual StoreItem? Item { get; set; }
    }
}
