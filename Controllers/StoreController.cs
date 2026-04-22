using SmsApi.Models.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmsApi.Models.DTOs;
using SmsApi.Services;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace SmsApi.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class StoreController : ControllerBase
    {
        private readonly IStoreService _storeService;

        public StoreController(IStoreService storeService)
        {
            _storeService = storeService;
        }

        private Guid GetSchoolId()
        {
            var schoolIdClaim = User.FindFirst("SchoolId")?.Value;
            return Guid.TryParse(schoolIdClaim, out var schoolId) ? schoolId : Guid.Empty;
        }

        private Guid GetUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty;
        }

        // Store Items
        [HttpGet("items")]
        public async Task<ActionResult<StoreItemListResponse>> GetItems(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? category = null,
            [FromQuery] string? searchTerm = null)
        {
            var schoolId = GetSchoolId();
            if (schoolId == Guid.Empty)
                return Unauthorized();

            var response = await _storeService.GetItemsAsync(schoolId, page, pageSize, category, searchTerm);
            return Ok(response);
        }

        [HttpGet("items/{id}")]
        public async Task<ActionResult<StoreItemResponse>> GetItemById(Guid id)
        {
            var schoolId = GetSchoolId();
            if (schoolId == Guid.Empty)
                return Unauthorized();

            var item = await _storeService.GetItemByIdAsync(id, schoolId);
            if (item == null)
                return NotFound();

            return Ok(item);
        }

        [HttpPost("items")]
        [ProducesResponseType(typeof(StoreItemResponse), 201)]
        [ProducesResponseType(typeof(object), 400)]
        [ProducesResponseType(typeof(object), 401)]
        public async Task<ActionResult<StoreItemResponse>> CreateItem([FromBody] CreateStoreItemRequest request)
        {
            var schoolId = GetSchoolId();
            var userId = GetUserId();
            if (schoolId == Guid.Empty)
                return Unauthorized();

            try
            {
                request.SchoolId = schoolId;
                request.CreatedBy = userId;

                var item = await _storeService.CreateItemAsync(request);
                return CreatedAtAction(nameof(GetItemById), new { id = item.Id }, item);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("items/{id}")]
        [ProducesResponseType(typeof(StoreItemResponse), 200)]
        [ProducesResponseType(typeof(object), 400)]
        [ProducesResponseType(typeof(object), 401)]
        [ProducesResponseType(typeof(object), 404)]
        public async Task<ActionResult<StoreItemResponse>> UpdateItem(Guid id, [FromBody] UpdateStoreItemRequest request)
        {
            var schoolId = GetSchoolId();
            var userId = GetUserId();
            if (schoolId == Guid.Empty)
                return Unauthorized();

            try
            {
                request.UpdatedBy = userId;

                var item = await _storeService.UpdateItemAsync(id, request, schoolId);
                return Ok(item);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpDelete("items/{id}")]
        public async Task<IActionResult> DeleteItem(Guid id)
        {
            var schoolId = GetSchoolId();
            if (schoolId == Guid.Empty)
                return Unauthorized();

            try
            {
                await _storeService.DeleteItemAsync(id, schoolId);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        // Store Orders
        [HttpGet("orders")]
        public async Task<ActionResult<StoreOrderListResponse>> GetOrders(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] Guid? customerId = null,
            [FromQuery] string? status = null)
        {
            var schoolId = GetSchoolId();
            if (schoolId == Guid.Empty)
                return Unauthorized();

            var response = await _storeService.GetOrdersAsync(schoolId, page, pageSize, customerId, status);
            return Ok(response);
        }

        [HttpGet("orders/{id}")]
        public async Task<ActionResult<StoreOrderResponse>> GetOrderById(Guid id)
        {
            var schoolId = GetSchoolId();
            if (schoolId == Guid.Empty)
                return Unauthorized();

            var order = await _storeService.GetOrderByIdAsync(id, schoolId);
            if (order == null)
                return NotFound();

            return Ok(order);
        }

        [HttpPost("orders")]
        [ProducesResponseType(typeof(StoreOrderResponse), 201)]
        [ProducesResponseType(typeof(object), 400)]
        [ProducesResponseType(typeof(object), 401)]
        public async Task<ActionResult<StoreOrderResponse>> CreateOrder([FromBody] CreateStoreOrderRequest request)
        {
            var schoolId = GetSchoolId();
            var userId = GetUserId();
            if (schoolId == Guid.Empty)
                return Unauthorized();

            try
            {
                request.SchoolId = schoolId;
                request.CreatedBy = userId;

                var order = await _storeService.CreateOrderAsync(request);
                return CreatedAtAction(nameof(GetOrderById), new { id = order.Id }, order);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("orders/{id}/status")]
        [ProducesResponseType(typeof(StoreOrderResponse), 200)]
        [ProducesResponseType(typeof(object), 400)]
        [ProducesResponseType(typeof(object), 401)]
        [ProducesResponseType(typeof(object), 404)]
        public async Task<ActionResult<StoreOrderResponse>> UpdateOrderStatus(Guid id, [FromBody] UpdateOrderStatusRequest request)
        {
            var schoolId = GetSchoolId();
            var userId = GetUserId();
            if (schoolId == Guid.Empty)
                return Unauthorized();

            try
            {
                request.UpdatedBy = userId;

                var order = await _storeService.UpdateOrderStatusAsync(id, request, schoolId);
                return Ok(order);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpGet("inventory/{itemId}")]
        public async Task<ActionResult<InventoryLogListResponse>> GetInventoryLogs(
            Guid itemId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var schoolId = GetSchoolId();
            if (schoolId == Guid.Empty)
                return Unauthorized();

            var response = await _storeService.GetInventoryLogsAsync(itemId, schoolId, page, pageSize);
            return Ok(response);
        }

        // ─── Stats ────────────────────────────────────────────────────────────────
        [HttpGet("stats")]
        public async Task<ActionResult<StoreStatsDto>> GetStats()
        {
            var schoolId = GetSchoolId();
            if (schoolId == Guid.Empty) return Unauthorized();

            var stats = await _storeService.GetStatsAsync(schoolId);
            return Ok(stats);
        }

        // ─── Stock Adjustment ─────────────────────────────────────────────────────
        [HttpPost("items/{id}/adjust-stock")]
        public async Task<ActionResult<StoreItemResponse>> AdjustStock(Guid id, [FromBody] AdjustStockDto dto)
        {
            var schoolId = GetSchoolId();
            var userId = GetUserId();
            if (schoolId == Guid.Empty) return Unauthorized();

            try
            {
                var item = await _storeService.AdjustStockAsync(id, schoolId, dto, userId);
                return Ok(item);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Item not found" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // ─── Mark Order Paid ──────────────────────────────────────────────────────
        [HttpPut("orders/{id}/payment")]
        [ProducesResponseType(typeof(StoreOrderResponse), 200)]
        [ProducesResponseType(typeof(object), 400)]
        [ProducesResponseType(typeof(object), 401)]
        [ProducesResponseType(typeof(object), 404)]
        public async Task<ActionResult<StoreOrderResponse>> MarkOrderPaid(Guid id, [FromBody] MarkOrderPaidDto dto)
        {
            var schoolId = GetSchoolId();
            if (schoolId == Guid.Empty) return Unauthorized();

            try
            {
                var order = await _storeService.MarkOrderPaidAsync(id, schoolId, dto);
                return Ok(order);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }
    }
}
