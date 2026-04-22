using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SmsApi.Services
{
    public interface IStoreService
    {
        Task<StoreItemListResponse> GetItemsAsync(Guid schoolId, int page = 1, int pageSize = 10, string? category = null, string? searchTerm = null);
        Task<StoreItemResponse?> GetItemByIdAsync(Guid itemId, Guid schoolId);
        Task<StoreItemResponse> CreateItemAsync(CreateStoreItemRequest request);
        Task<StoreItemResponse?> UpdateItemAsync(Guid itemId, UpdateStoreItemRequest request, Guid schoolId);
        Task<bool> DeleteItemAsync(Guid itemId, Guid schoolId);
        Task<StoreItemResponse> AdjustStockAsync(Guid itemId, Guid schoolId, AdjustStockDto dto, Guid staffId);
        Task<StoreOrderListResponse> GetOrdersAsync(Guid schoolId, int page = 1, int pageSize = 10, Guid? customerId = null, string? status = null);
        Task<StoreOrderResponse?> GetOrderByIdAsync(Guid orderId, Guid schoolId);
        Task<StoreOrderResponse> CreateOrderAsync(CreateStoreOrderRequest request);
        Task<StoreOrderResponse?> UpdateOrderStatusAsync(Guid orderId, UpdateOrderStatusRequest request, Guid schoolId);
        Task<StoreOrderResponse?> MarkOrderPaidAsync(Guid orderId, Guid schoolId, MarkOrderPaidDto dto);
        Task<InventoryLogListResponse> GetInventoryLogsAsync(Guid itemId, Guid schoolId, int page = 1, int pageSize = 10);
        Task<StoreStatsDto> GetStatsAsync(Guid schoolId);
    }

    public class StoreService : IStoreService
    {
        private readonly AppDbContext _context;

        public StoreService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<StoreItemListResponse> GetItemsAsync(Guid schoolId, int page = 1, int pageSize = 10, string? category = null, string? searchTerm = null)
        {
            // Pagination normalization
            page = Math.Max(1, page);
            pageSize = Math.Min(100, Math.Max(1, pageSize));

            var query = _context.StoreItems.Where(i => i.SchoolId == schoolId);

            if (!string.IsNullOrWhiteSpace(category))
            {
                query = query.Where(i => i.Category == category);
            }

            if (!string.IsNullOrWhiteSpace(searchTerm))
            {
                query = query.Where(i => i.Name.Contains(searchTerm) || 
                                        (i.ItemCode != null && i.ItemCode.Contains(searchTerm)));
            }

            var total = await query.CountAsync();

            var items = await query
                .OrderBy(i => i.Name)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new StoreItemListResponse
            {
                Items = items.Select(MapToItemResponse).ToList(),
                TotalCount = total,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling(total / (double)pageSize)
            };
        }

        public async Task<StoreItemResponse?> GetItemByIdAsync(Guid itemId, Guid schoolId)
        {
            var item = await _context.StoreItems
                .FirstOrDefaultAsync(i => i.Id == itemId && i.SchoolId == schoolId);

            return item == null ? null : MapToItemResponse(item);
        }

        public async Task<StoreItemResponse> CreateItemAsync(CreateStoreItemRequest request)
        {
            // VALIDATION 1: Item name required and not empty
            if (string.IsNullOrWhiteSpace(request.Name) || request.Name.Length > 200)
                throw new InvalidOperationException("Item name is required and cannot exceed 200 characters");

            // VALIDATION 2: Item code uniqueness per school
            if (!string.IsNullOrEmpty(request.ItemCode))
            {
                var codeExists = await _context.StoreItems
                    .AnyAsync(i => i.SchoolId == request.SchoolId && 
                                  i.ItemCode == request.ItemCode);
                if (codeExists)
                    throw new InvalidOperationException("Item code already exists in your school store");
            }

            // VALIDATION 3: Price validation - must be positive
            if (request.Price < 0)
                throw new InvalidOperationException("Item price cannot be negative");

            // VALIDATION 4: Stock quantity validation - must be non-negative
            if (request.StockQuantity < 0)
                throw new InvalidOperationException("Stock quantity cannot be negative");

            // VALIDATION 5: Minimum stock level validation
            if (request.MinStockLevel < 0 || request.MinStockLevel > request.StockQuantity)
                throw new InvalidOperationException("Minimum stock level must be between 0 and current stock quantity");

            // VALIDATION 6: Category must be specified
            if (string.IsNullOrWhiteSpace(request.Category))
                throw new InvalidOperationException("Item category is required");

            var item = new StoreItem
            {
                Id = Guid.NewGuid(),
                SchoolId = request.SchoolId,
                Name = request.Name,
                ItemCode = request.ItemCode,
                Description = request.Description,
                Category = request.Category,
                Price = request.Price,
                StockQuantity = request.StockQuantity,
                MinStockLevel = request.MinStockLevel,
                Unit = request.Unit,
                ImageUrl = request.ImageUrl,
                IsAvailable = true,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.StoreItems.Add(item);
            await _context.SaveChangesAsync();

            return MapToItemResponse(item);
        }

        public async Task<StoreItemResponse?> UpdateItemAsync(Guid itemId, UpdateStoreItemRequest request, Guid schoolId)
        {
            var item = await _context.StoreItems
                .FirstOrDefaultAsync(i => i.Id == itemId && i.SchoolId == schoolId);

            if (item == null)
            {
                throw new KeyNotFoundException($"Store item with ID {itemId} not found");
            }

            // VALIDATION 1: Item name required and max 200 chars
            if (string.IsNullOrWhiteSpace(request.Name) || request.Name.Length > 200)
                throw new ArgumentException("Item name is required and cannot exceed 200 characters");

            // VALIDATION 2: Price validation - must be non-negative
            if (request.Price < 0)
                throw new ArgumentException("Item price cannot be negative");

            // VALIDATION 3: Stock quantity validation - must be non-negative
            if (request.StockQuantity < 0)
                throw new ArgumentException("Stock quantity cannot be negative");

            // VALIDATION 4: Minimum stock level validation
            if (request.MinStockLevel < 0 || request.MinStockLevel > request.StockQuantity)
                throw new ArgumentException("Minimum stock level must be between 0 and current stock quantity");

            // VALIDATION 5: Description max length
            if (!string.IsNullOrEmpty(request.Description) && request.Description.Length > 500)
                throw new ArgumentException("Description cannot exceed 500 characters");

            item.Name = request.Name;
            item.Description = request.Description;
            item.Price = request.Price;
            item.StockQuantity = request.StockQuantity;
            item.MinStockLevel = request.MinStockLevel;
            item.IsAvailable = request.IsAvailable;
            item.IsActive = request.IsActive;
            item.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return MapToItemResponse(item);
        }

        public async Task<bool> DeleteItemAsync(Guid itemId, Guid schoolId)
        {
            var item = await _context.StoreItems
                .FirstOrDefaultAsync(i => i.Id == itemId && i.SchoolId == schoolId);

            if (item == null) return false;

            item.IsActive = false;
            item.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<StoreOrderListResponse> GetOrdersAsync(Guid schoolId, int page = 1, int pageSize = 10, Guid? customerId = null, string? status = null)
        {
            // Pagination normalization
            page = Math.Max(1, page);
            pageSize = Math.Min(100, Math.Max(1, pageSize));

            var query = _context.StoreOrders.Where(o => o.SchoolId == schoolId);

            if (customerId.HasValue)
            {
                query = query.Where(o => o.CustomerId == customerId.Value);
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                query = query.Where(o => o.Status == status);
            }

            var total = await query.CountAsync();

            var orders = await query
                .OrderByDescending(o => o.OrderDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new StoreOrderListResponse
            {
                Items = orders.Select(MapToOrderResponse).ToList(),
                TotalCount = total,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling(total / (double)pageSize)
            };
        }

        public async Task<StoreOrderResponse?> GetOrderByIdAsync(Guid orderId, Guid schoolId)
        {
            var order = await _context.StoreOrders
                .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.Item)
                .FirstOrDefaultAsync(o => o.Id == orderId && o.SchoolId == schoolId);

            if (order == null) return null;

            var response = MapToOrderResponse(order);
            response.Items = order.OrderItems?.Select(MapToOrderItemResponse).ToList() ?? new List<StoreOrderItemResponse>();

            return response;
        }

        public async Task<StoreOrderResponse> CreateOrderAsync(CreateStoreOrderRequest request)
        {
            // VALIDATION 1: At least one item required
            if (request.Items == null || !request.Items.Any())
            {
                throw new ArgumentException("Order must contain at least one item");
            }

            // VALIDATION 2: Item count validation
            if (request.Items.Count > 100)
                throw new ArgumentException("Order cannot contain more than 100 items");

            // VALIDATION 3: Payment method validation (if marked as paid)
            if (request.MarkAsPaid && string.IsNullOrWhiteSpace(request.PaymentMethod))
                throw new ArgumentException("Payment method is required when marking order as paid");

            // VALIDATION 4: Valid payment method enum
            var validPaymentMethods = new[] { "Cash", "Card", "Check", "Transfer", "Other" };
            if (!string.IsNullOrEmpty(request.PaymentMethod) && !validPaymentMethods.Contains(request.PaymentMethod))
                throw new ArgumentException("Invalid payment method. Valid values: Cash, Card, Check, Transfer, Other");

            // VALIDATION 5: Discount validation - cannot be negative
            if (request.GlobalDiscount < 0)
                throw new ArgumentException("Discount amount cannot be negative");

            // VALIDATION 6: Customer type validation if customer ID provided
            if (request.CustomerId.HasValue && request.CustomerId.Value != Guid.Empty)
            {
                if (string.IsNullOrWhiteSpace(request.CustomerType))
                    throw new ArgumentException("Customer type is required when customer ID is specified");
            }

            // VALIDATION 7: Remarks max length
            if (!string.IsNullOrEmpty(request.Remarks) && request.Remarks.Length > 500)
                throw new ArgumentException("Remarks cannot exceed 500 characters");

            var order = new StoreOrder
            {
                Id = Guid.NewGuid(),
                SchoolId = request.SchoolId,
                OrderNumber = $"ORD-{DateTime.UtcNow:yyyyMMddHHmmss}-{new Random().Next(1000, 9999)}",
                CustomerId = request.CustomerId ?? Guid.Empty,
                CustomerType = request.CustomerType,
                OrderDate = DateTime.UtcNow,
                Status = "Pending",
                PaymentMethod = request.PaymentMethod,
                PaymentStatus = "Pending",
                Remarks = request.Remarks,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                ProcessedByStaffId = request.CreatedBy
            };

            decimal totalAmount = 0;
            var orderItems = new List<StoreOrderItem>();

            foreach (var itemRequest in request.Items)
            {
                // VALIDATION 8: Item quantity validation (per item)
                if (itemRequest.Quantity <= 0 || itemRequest.Quantity > 10000)
                    throw new ArgumentException($"Order item quantity must be between 1 and 10000");

                var item = await _context.StoreItems.FindAsync(itemRequest.ItemId);
                if (item == null)
                {
                    throw new KeyNotFoundException($"Store item with ID {itemRequest.ItemId} not found");
                }

                if (item.StockQuantity < itemRequest.Quantity)
                {
                    throw new InvalidOperationException($"Insufficient stock for item '{item.Name}'. Available: {item.StockQuantity}, Requested: {itemRequest.Quantity}");
                }

                var orderItem = new StoreOrderItem
                {
                    Id = Guid.NewGuid(),
                    SchoolId = request.SchoolId,
                    OrderId = order.Id,
                    ItemId = itemRequest.ItemId,
                    Quantity = itemRequest.Quantity,
                    UnitPrice = item.Price,
                    DiscountAmount = 0,
                    TotalPrice = item.Price * itemRequest.Quantity,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                totalAmount += orderItem.TotalPrice;
                orderItems.Add(orderItem);

                // Update inventory
                item.StockQuantity -= itemRequest.Quantity;
                item.UpdatedAt = DateTime.UtcNow;

                // Create inventory log
                var inventoryLog = new StoreInventoryLog
                {
                    Id = Guid.NewGuid(),
                    SchoolId = request.SchoolId,
                    ItemId = item.Id,
                    TransactionType = "Sale",
                    Quantity = -itemRequest.Quantity,
                    QuantityBefore = item.StockQuantity + itemRequest.Quantity,
                    QuantityAfter = item.StockQuantity,
                    Reference = order.OrderNumber,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.StoreInventoryLogs.Add(inventoryLog);
            }

            // VALIDATION 9: Discount cannot exceed total amount
            if (request.GlobalDiscount > totalAmount)
                throw new ArgumentException("Discount amount cannot exceed total order amount");

            order.TotalAmount = totalAmount;
            order.DiscountAmount = request.GlobalDiscount;
            order.TaxAmount = 0;
            order.FinalAmount = Math.Max(0, totalAmount - request.GlobalDiscount);

            if (request.MarkAsPaid && !string.IsNullOrEmpty(request.PaymentMethod))
            {
                order.PaymentStatus = "Paid";
                order.PaymentDate = DateTime.UtcNow;
                order.PaymentReference = request.PaymentReference;
                order.Status = "Confirmed";
            }

            _context.StoreOrders.Add(order);
            _context.StoreOrderItems.AddRange(orderItems);
            await _context.SaveChangesAsync();

            var response = MapToOrderResponse(order);
            response.Items = orderItems.Select(MapToOrderItemResponse).ToList();

            return response;
        }

        public async Task<StoreOrderResponse?> UpdateOrderStatusAsync(Guid orderId, UpdateOrderStatusRequest request, Guid schoolId)
        {
            var order = await _context.StoreOrders
                .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.Item)
                .FirstOrDefaultAsync(o => o.Id == orderId && o.SchoolId == schoolId);

            if (order == null)
            {
                throw new KeyNotFoundException($"Store order with ID {orderId} not found");
            }

            // VALIDATION 1: Status enum validation
            var validStatuses = new[] { "Pending", "Confirmed", "Shipped", "Delivered", "Cancelled" };
            if (string.IsNullOrWhiteSpace(request.Status) || !validStatuses.Contains(request.Status))
                throw new ArgumentException($"Invalid order status. Valid values: {string.Join(", ", validStatuses)}");

            // VALIDATION 2: Remarks max length
            if (!string.IsNullOrEmpty(request.Remarks) && request.Remarks.Length > 500)
                throw new ArgumentException("Remarks cannot exceed 500 characters");

            // VALIDATION 3: Delivery date validation (must be in future if provided)
            if (request.DeliveryDate.HasValue && request.DeliveryDate.Value < DateTime.UtcNow)
                throw new ArgumentException("Delivery date cannot be in the past");

            order.Status = request.Status;
            order.DeliveryDate = request.DeliveryDate;
            order.Remarks = request.Remarks;
            order.UpdatedAt = DateTime.UtcNow;
            order.ProcessedByStaffId = request.UpdatedBy;

            await _context.SaveChangesAsync();

            var response = MapToOrderResponse(order);
            response.Items = order.OrderItems?.Select(MapToOrderItemResponse).ToList() ?? new List<StoreOrderItemResponse>();

            return response;
        }

        public async Task<InventoryLogListResponse> GetInventoryLogsAsync(Guid itemId, Guid schoolId, int page = 1, int pageSize = 10)
        {
            // Pagination normalization
            page = Math.Max(1, page);
            pageSize = Math.Min(100, Math.Max(1, pageSize));

            var query = _context.StoreInventoryLogs
                .Include(l => l.Item)
                .Where(l => l.ItemId == itemId && l.SchoolId == schoolId);

            var total = await query.CountAsync();

            var logs = await query
                .OrderByDescending(l => l.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new InventoryLogListResponse
            {
                Items = logs.Select(MapToInventoryLogResponse).ToList(),
                TotalCount = total,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling(total / (double)pageSize)
            };
        }

        public async Task<StoreStatsDto> GetStatsAsync(Guid schoolId)
        {
            var today = DateTime.UtcNow.Date;
            var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);

            var items = await _context.StoreItems
                .Where(i => i.SchoolId == schoolId && i.IsActive)
                .ToListAsync();

            var orders = await _context.StoreOrders
                .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.Item)
                .Where(o => o.SchoolId == schoolId)
                .ToListAsync();

            var revByCat = orders
                .Where(o => o.PaymentStatus == "Paid")
                .SelectMany(o => o.OrderItems)
                .GroupBy(oi => oi.Item?.Category ?? "Other")
                .ToDictionary(g => g.Key, g => g.Sum(oi => oi.TotalPrice));

            var lowStockAlerts = items
                .Where(i => i.StockQuantity <= i.MinStockLevel)
                .OrderBy(i => i.StockQuantity)
                .Take(10)
                .Select(MapToItemResponse)
                .ToList();

            return new StoreStatsDto
            {
                TotalItems = items.Count,
                ActiveItems = items.Count(i => i.IsAvailable),
                LowStockItems = items.Count(i => i.StockQuantity > 0 && i.StockQuantity <= i.MinStockLevel),
                OutOfStockItems = items.Count(i => i.StockQuantity == 0),
                TotalOrders = orders.Count,
                PendingOrders = orders.Count(o => o.Status == "Pending"),
                TodayRevenue = orders.Where(o => o.OrderDate.Date == today && o.PaymentStatus == "Paid").Sum(o => o.FinalAmount),
                ThisMonthRevenue = orders.Where(o => o.OrderDate >= monthStart && o.PaymentStatus == "Paid").Sum(o => o.FinalAmount),
                TotalRevenue = orders.Where(o => o.PaymentStatus == "Paid").Sum(o => o.FinalAmount),
                TodayOrders = orders.Count(o => o.OrderDate.Date == today),
                RevenueByCategory = revByCat,
                LowStockAlerts = lowStockAlerts
            };
        }

        public async Task<StoreItemResponse> AdjustStockAsync(Guid itemId, Guid schoolId, AdjustStockDto dto, Guid staffId)
        {
            var item = await _context.StoreItems
                .FirstOrDefaultAsync(i => i.Id == itemId && i.SchoolId == schoolId);
            if (item == null)
                throw new KeyNotFoundException("Store item not found");

            // VALIDATION 1: Transaction type enum validation
            var validTransactionTypes = new[] { "Sale", "Adjustment", "Return", "Restock" };
            if (string.IsNullOrWhiteSpace(dto.TransactionType) || !validTransactionTypes.Contains(dto.TransactionType))
                throw new ArgumentException($"Invalid transaction type. Valid values: {string.Join(", ", validTransactionTypes)}");

            // VALIDATION 2: Quantity validation - cannot be zero
            if (dto.Quantity == 0)
                throw new ArgumentException("Quantity adjustment cannot be zero");

            // VALIDATION 3: Stock adjustment bounds - resulting quantity cannot be negative
            if (item.StockQuantity + dto.Quantity < 0)
                throw new InvalidOperationException($"Adjustment would result in negative stock. Current stock: {item.StockQuantity}, Adjustment: {dto.Quantity}");

            // VALIDATION 4: Reference max length
            if (!string.IsNullOrEmpty(dto.Reference) && dto.Reference.Length > 100)
                throw new ArgumentException("Reference cannot exceed 100 characters");

            // VALIDATION 5: Remarks max length
            if (!string.IsNullOrEmpty(dto.Remarks) && dto.Remarks.Length > 500)
                throw new ArgumentException("Remarks cannot exceed 500 characters");

            var before = item.StockQuantity;
            item.StockQuantity += dto.Quantity;
            item.UpdatedAt = DateTime.UtcNow;

            var log = new StoreInventoryLog
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                ItemId = itemId,
                TransactionType = dto.TransactionType,
                Quantity = dto.Quantity,
                QuantityBefore = before,
                QuantityAfter = item.StockQuantity,
                Reference = dto.Reference,
                Remarks = dto.Remarks,
                ProcessedByStaffId = staffId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.StoreInventoryLogs.Add(log);
            await _context.SaveChangesAsync();
            return MapToItemResponse(item);
        }

        public async Task<StoreOrderResponse?> MarkOrderPaidAsync(Guid orderId, Guid schoolId, MarkOrderPaidDto dto)
        {
            var order = await _context.StoreOrders
                .Include(o => o.OrderItems).ThenInclude(oi => oi.Item)
                .FirstOrDefaultAsync(o => o.Id == orderId && o.SchoolId == schoolId);
            if (order == null) throw new KeyNotFoundException("Order not found");

            // VALIDATION 1: Payment method required
            if (string.IsNullOrWhiteSpace(dto.PaymentMethod))
                throw new ArgumentException("Payment method is required");

            // VALIDATION 2: Valid payment method enum
            var validPaymentMethods = new[] { "Cash", "Card", "Check", "Transfer", "Other" };
            if (!validPaymentMethods.Contains(dto.PaymentMethod))
                throw new ArgumentException($"Invalid payment method. Valid values: {string.Join(", ", validPaymentMethods)}");

            // VALIDATION 3: Payment reference max length
            if (!string.IsNullOrEmpty(dto.PaymentReference) && dto.PaymentReference.Length > 100)
                throw new ArgumentException("Payment reference cannot exceed 100 characters");

            order.PaymentStatus = "Paid";
            order.PaymentMethod = dto.PaymentMethod;
            order.PaymentReference = dto.PaymentReference;
            order.PaymentDate = DateTime.UtcNow;
            order.Status = order.Status == "Pending" ? "Confirmed" : order.Status;
            order.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var response = MapToOrderResponse(order);
            response.Items = order.OrderItems?.Select(MapToOrderItemResponse).ToList() ?? new();
            return response;
        }

        private StoreItemResponse MapToItemResponse(StoreItem item)        {
            return new StoreItemResponse
            {
                Id = item.Id,
                SchoolId = item.SchoolId,
                Name = item.Name,
                ItemCode = item.ItemCode,
                Description = item.Description,
                Category = item.Category,
                Price = item.Price,
                StockQuantity = item.StockQuantity,
                MinStockLevel = item.MinStockLevel,
                Unit = item.Unit,
                ImageUrl = item.ImageUrl,
                IsAvailable = item.IsAvailable,
                IsActive = item.IsActive,
                CreatedAt = item.CreatedAt,
                UpdatedAt = item.UpdatedAt
            };
        }

        private StoreOrderResponse MapToOrderResponse(StoreOrder order)
        {
            return new StoreOrderResponse
            {
                Id = order.Id,
                SchoolId = order.SchoolId,
                OrderNumber = order.OrderNumber,
                CustomerId = order.CustomerId,
                CustomerType = order.CustomerType,
                OrderDate = order.OrderDate,
                TotalAmount = order.TotalAmount,
                DiscountAmount = order.DiscountAmount,
                TaxAmount = order.TaxAmount,
                FinalAmount = order.FinalAmount,
                Status = order.Status,
                PaymentMethod = order.PaymentMethod,
                PaymentStatus = order.PaymentStatus,
                PaymentDate = order.PaymentDate,
                PaymentReference = order.PaymentReference,
                DeliveryDate = order.DeliveryDate,
                ProcessedByStaffId = order.ProcessedByStaffId,
                Remarks = order.Remarks,
                CreatedAt = order.CreatedAt,
                UpdatedAt = order.UpdatedAt
            };
        }

        private StoreOrderItemResponse MapToOrderItemResponse(StoreOrderItem orderItem)
        {
            return new StoreOrderItemResponse
            {
                Id = orderItem.Id,
                ItemId = orderItem.ItemId,
                ItemName = orderItem.Item?.Name ?? string.Empty,
                Quantity = orderItem.Quantity,
                UnitPrice = orderItem.UnitPrice,
                DiscountAmount = orderItem.DiscountAmount,
                TotalPrice = orderItem.TotalPrice,
                Remarks = orderItem.Remarks
            };
        }

        private InventoryLogResponse MapToInventoryLogResponse(StoreInventoryLog log)
        {
            return new InventoryLogResponse
            {
                Id = log.Id,
                ItemId = log.ItemId,
                ItemName = log.Item?.Name ?? string.Empty,
                TransactionType = log.TransactionType,
                Quantity = log.Quantity,
                QuantityBefore = log.QuantityBefore,
                QuantityAfter = log.QuantityAfter,
                Reference = log.Reference,
                Remarks = log.Remarks,
                ProcessedByStaffId = log.ProcessedByStaffId,
                CreatedAt = log.CreatedAt
            };
        }
    }
}

