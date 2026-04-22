using System;
using System.Collections.Generic;

namespace SmsApi.Models.DTOs
{
    // Store Item Basic DTO - Lightweight version for list views
    public class StoreItemBasicDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? ItemCode { get; set; }
        public string Category { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public int StockQuantity { get; set; }
        public bool IsAvailable { get; set; }
    }

    // Store Order Basic DTO - Lightweight version for list views
    public class StoreOrderBasicDto
    {
        public Guid Id { get; set; }
        public Guid CustomerId { get; set; }
        public string CustomerType { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    // Store Item DTOs
    public class CreateStoreItemRequest
    {
        public Guid SchoolId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? ItemCode { get; set; }
        public string? Description { get; set; }
        public string Category { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public int StockQuantity { get; set; }
        public int MinStockLevel { get; set; }
        public string? Unit { get; set; }
        public string? ImageUrl { get; set; }
        public Guid CreatedBy { get; set; }
    }

    public class UpdateStoreItemRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal Price { get; set; }
        public int StockQuantity { get; set; }
        public int MinStockLevel { get; set; }
        public bool IsAvailable { get; set; }
        public bool IsActive { get; set; }
        public Guid UpdatedBy { get; set; }
    }

    public class StoreItemResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? ItemCode { get; set; }
        public string? Description { get; set; }
        public string Category { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public int StockQuantity { get; set; }
        public int MinStockLevel { get; set; }
        public string? Unit { get; set; }
        public string? ImageUrl { get; set; }
        public bool IsAvailable { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class StoreItemListResponse
    {
        public List<StoreItemResponse> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    // Store Order DTOs
    public class CreateStoreOrderRequest
    {
        public Guid SchoolId { get; set; }
        public Guid? CustomerId { get; set; }         // nullable for walk-in
        public string? CustomerName { get; set; }     // display name
        public string CustomerType { get; set; } = string.Empty;
        public List<OrderItemRequest> Items { get; set; } = new();
        public string? PaymentMethod { get; set; }
        public string? PaymentReference { get; set; } // UPI txn id, card last-4, etc.
        public decimal GlobalDiscount { get; set; }   // flat discount on order
        public bool MarkAsPaid { get; set; }          // POS: paid at counter
        public string? Remarks { get; set; }
        public Guid CreatedBy { get; set; }
    }

    public class OrderItemRequest
    {
        public Guid ItemId { get; set; }
        public int Quantity { get; set; }
    }

    public class UpdateStoreOrderRequest
    {
        public string Status { get; set; } = string.Empty;
        public DateTime? DeliveryDate { get; set; }
        public string? Remarks { get; set; }
    }

    public class StoreOrderResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string OrderNumber { get; set; } = string.Empty;
        public Guid CustomerId { get; set; }
        public string CustomerType { get; set; } = string.Empty;
        public string? CustomerName { get; set; }
        public DateTime OrderDate { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal FinalAmount { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? PaymentMethod { get; set; }
        public string? PaymentStatus { get; set; }
        public DateTime? PaymentDate { get; set; }
        public string? PaymentReference { get; set; }
        public DateTime? DeliveryDate { get; set; }
        public Guid? ProcessedByStaffId { get; set; }
        public string? ProcessedByStaffName { get; set; }
        public string? Remarks { get; set; }
        public List<StoreOrderItemResponse> Items { get; set; } = new();
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class StoreOrderItemResponse
    {
        public Guid Id { get; set; }
        public Guid ItemId { get; set; }
        public string ItemName { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal TotalPrice { get; set; }
        public string? Remarks { get; set; }
    }

    public class StoreOrderListResponse
    {
        public List<StoreOrderResponse> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    // Inventory Log DTOs
    public class InventoryLogResponse
    {
        public Guid Id { get; set; }
        public Guid ItemId { get; set; }
        public string ItemName { get; set; } = string.Empty;
        public string TransactionType { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public int QuantityBefore { get; set; }
        public int QuantityAfter { get; set; }
        public string? Reference { get; set; }
        public string? Remarks { get; set; }
        public Guid? ProcessedByStaffId { get; set; }
        public string? ProcessedByStaffName { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class InventoryLogListResponse
    {
        public List<InventoryLogResponse> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }
    public class UpdateOrderStatusRequest
    {
        public string Status { get; set; } = string.Empty;
        public DateTime? DeliveryDate { get; set; }
        public string? Remarks { get; set; }
        public Guid UpdatedBy { get; set; }
    }

    // ─── POS / Store Stats ────────────────────────────────────────────────────────
    public class StoreStatsDto
    {
        public int TotalItems { get; set; }
        public int ActiveItems { get; set; }
        public int LowStockItems { get; set; }
        public int OutOfStockItems { get; set; }
        public int TotalOrders { get; set; }
        public int PendingOrders { get; set; }
        public decimal TodayRevenue { get; set; }
        public decimal ThisMonthRevenue { get; set; }
        public decimal TotalRevenue { get; set; }
        public int TodayOrders { get; set; }
        public Dictionary<string, decimal> RevenueByCategory { get; set; } = new();
        public List<StoreItemResponse> LowStockAlerts { get; set; } = new();
    }

    // ─── Stock Adjustment ─────────────────────────────────────────────────────────
    public class AdjustStockDto
    {
        public string TransactionType { get; set; } = string.Empty; // Purchase|Adjustment|Return|Damage
        public int Quantity { get; set; }    // positive = add, negative = deduct
        public string? Remarks { get; set; }
        public string? Reference { get; set; }
    }

    // ─── Mark Order Paid ──────────────────────────────────────────────────────────
    public class MarkOrderPaidDto
    {
        public string PaymentMethod { get; set; } = string.Empty;
        public string? PaymentReference { get; set; }
    }
}
