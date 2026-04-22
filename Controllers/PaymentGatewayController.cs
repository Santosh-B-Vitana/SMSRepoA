using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmsApi.Models.Constants;
using SmsApi.Models.DTOs;
using SmsApi.Services;

namespace SmsApi.Controllers
{
    /// <summary>
    /// Payment Gateway — Cashfree Payments India integration.
    /// Partnership activated: January 2026.
    /// </summary>
    [ApiController]
    [Route("api/payment-gateway")]
    [Authorize]
    public class PaymentGatewayController : ControllerBase
    {
        private readonly IPaymentGatewayService _payment;
        private readonly ITenantContext _tenant;
        private readonly ILogger<PaymentGatewayController> _logger;

        public PaymentGatewayController(
            IPaymentGatewayService payment,
            ITenantContext tenant,
            ILogger<PaymentGatewayController> logger)
        {
            _payment = payment;
            _tenant = tenant;
            _logger = logger;
        }

        private Guid GetSchoolId() => _tenant.GetEffectiveSchoolId();
        private Guid GetUserId()
        {
            var id = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(id, out var g) ? g : Guid.Empty;
        }

        // ─── Gateway Config ───────────────────────────────────────────────────────

        /// <summary>List gateway configurations for the school.</summary>
        [HttpGet("configs")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<IActionResult> GetGatewayConfigs([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            try
            {
                var result = await _payment.GetGatewayConfigsAsync(GetSchoolId(), page, pageSize);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { _logger.LogError(ex, "GetGatewayConfigs failed"); return StatusCode(500, new { message = "An unexpected error occurred." }); }
        }

        /// <summary>Get a specific gateway configuration.</summary>
        [HttpGet("configs/{id:guid}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<IActionResult> GetGatewayConfigById(Guid id)
        {
            try
            {
                var result = await _payment.GetGatewayConfigByIdAsync(id, GetSchoolId());
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { _logger.LogError(ex, "GetGatewayConfigById {Id} failed", id); return StatusCode(500, new { message = "An unexpected error occurred." }); }
        }

        /// <summary>Create a new gateway configuration (Cashfree recommended).</summary>
        [HttpPost("configs")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<IActionResult> CreateGatewayConfig([FromBody] CreatePaymentGatewayConfigRequest request)
        {
            try
            {
                var schoolId = GetSchoolId();
                request.SchoolId = schoolId;
                var result = await _payment.CreateGatewayConfigAsync(schoolId, request);
                return CreatedAtAction(nameof(GetGatewayConfigById), new { id = result.Id }, result);
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { _logger.LogError(ex, "CreateGatewayConfig failed"); return StatusCode(500, new { message = "An unexpected error occurred." }); }
        }

        /// <summary>Update a gateway configuration.</summary>
        [HttpPut("configs/{id:guid}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<IActionResult> UpdateGatewayConfig(Guid id, [FromBody] UpdatePaymentGatewayConfigRequest request)
        {
            try
            {
                var result = await _payment.UpdateGatewayConfigAsync(id, GetSchoolId(), request);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { _logger.LogError(ex, "UpdateGatewayConfig {Id} failed", id); return StatusCode(500, new { message = "An unexpected error occurred." }); }
        }

        /// <summary>Delete a gateway configuration.</summary>
        [HttpDelete("configs/{id:guid}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<IActionResult> DeleteGatewayConfig(Guid id)
        {
            try
            {
                var deleted = await _payment.DeleteGatewayConfigAsync(id, GetSchoolId());
                if (!deleted) return NotFound(new { message = $"Gateway config '{id}' not found." });
                return Ok(new { success = true, message = "Gateway configuration deleted." });
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { _logger.LogError(ex, "DeleteGatewayConfig {Id} failed", id); return StatusCode(500, new { message = "An unexpected error occurred." }); }
        }

        // ─── Transactions ─────────────────────────────────────────────────────────

        /// <summary>Initiate a payment order on Cashfree. Returns payment_session_id for JS SDK.</summary>
        [HttpPost("transactions/initiate")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        public async Task<IActionResult> InitiatePayment([FromBody] InitiatePaymentRequest request)
        {
            try
            {
                var schoolId = GetSchoolId();
                request.SchoolId = schoolId;
                var result = await _payment.InitiatePaymentAsync(schoolId, request);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { _logger.LogError(ex, "InitiatePayment failed"); return StatusCode(500, new { message = "An unexpected error occurred." }); }
        }

        /// <summary>Generic payment callback (non-Cashfree gateways).</summary>
        [HttpPost("transactions/callback")]
        [AllowAnonymous]
        public async Task<IActionResult> ProcessPaymentCallback([FromBody] PaymentCallbackRequest request)
        {
            try
            {
                var result = await _payment.ProcessCallbackAsync(request);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { _logger.LogError(ex, "ProcessPaymentCallback failed"); return StatusCode(500, new { message = "An unexpected error occurred." }); }
        }

        /// <summary>
        /// Cashfree webhook endpoint. Receives signed POST from Cashfree.
        /// Signature is verified using HMAC-SHA256 before processing.
        /// </summary>
        [HttpPost("webhook/cashfree")]
        [AllowAnonymous]
        public async Task<IActionResult> CashfreeWebhook(
            [FromHeader(Name = "x-webhook-signature")] string? signature,
            [FromHeader(Name = "x-webhook-timestamp")] string? timestamp)
        {
            try
            {
                // Read raw body for signature verification
                Request.EnableBuffering();
                var rawBody = await new System.IO.StreamReader(Request.Body, Encoding.UTF8, leaveOpen: true).ReadToEndAsync();
                Request.Body.Position = 0;

                if (string.IsNullOrEmpty(signature) || string.IsNullOrEmpty(timestamp))
                    return BadRequest(new { message = "Missing webhook signature headers." });

                CashfreeWebhookRequest? webhook;
                try { webhook = System.Text.Json.JsonSerializer.Deserialize<CashfreeWebhookRequest>(rawBody); }
                catch { return BadRequest(new { message = "Invalid webhook JSON payload." }); }

                var result = await _payment.ProcessCashfreeWebhookAsync(webhook!, rawBody, signature, timestamp);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex) { _logger.LogWarning("Cashfree webhook signature mismatch: {Msg}", ex.Message); return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { _logger.LogError(ex, "CashfreeWebhook processing failed"); return StatusCode(500, new { message = "An unexpected error occurred." }); }
        }

        /// <summary>List transactions for the school with optional filters.</summary>
        [HttpGet("transactions")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<IActionResult> GetTransactions(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] Guid? payerId = null,
            [FromQuery] string? status = null,
            [FromQuery] string? purpose = null,
            [FromQuery] DateTime? dateFrom = null,
            [FromQuery] DateTime? dateTo = null)
        {
            try
            {
                var result = await _payment.GetTransactionsAsync(GetSchoolId(), page, pageSize, payerId, status, purpose, dateFrom, dateTo);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { _logger.LogError(ex, "GetTransactions failed"); return StatusCode(500, new { message = "An unexpected error occurred." }); }
        }

        /// <summary>Get a specific transaction.</summary>
        [HttpGet("transactions/{id:guid}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        public async Task<IActionResult> GetTransactionById(Guid id)
        {
            try
            {
                var result = await _payment.GetTransactionByIdAsync(id, GetSchoolId());
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { _logger.LogError(ex, "GetTransactionById {Id} failed", id); return StatusCode(500, new { message = "An unexpected error occurred." }); }
        }

        // ─── Refunds ──────────────────────────────────────────────────────────────

        /// <summary>Initiate a refund for a successful transaction.</summary>
        [HttpPost("refunds")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<IActionResult> InitiateRefund([FromBody] InitiateRefundRequest request)
        {
            try
            {
                var schoolId = GetSchoolId();
                var staffId = GetUserId();
                request.SchoolId = schoolId;
                var result = await _payment.InitiateRefundAsync(schoolId, staffId, request);
                return CreatedAtAction(nameof(GetRefundById), new { id = result.Id }, result);
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { _logger.LogError(ex, "InitiateRefund failed"); return StatusCode(500, new { message = "An unexpected error occurred." }); }
        }

        /// <summary>List refunds for the school.</summary>
        [HttpGet("refunds")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<IActionResult> GetRefunds([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            try
            {
                var result = await _payment.GetRefundsAsync(GetSchoolId(), page, pageSize);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { _logger.LogError(ex, "GetRefunds failed"); return StatusCode(500, new { message = "An unexpected error occurred." }); }
        }

        /// <summary>Get a specific refund.</summary>
        [HttpGet("refunds/{id:guid}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<IActionResult> GetRefundById(Guid id)
        {
            try
            {
                var result = await _payment.GetRefundByIdAsync(id, GetSchoolId());
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { _logger.LogError(ex, "GetRefundById {Id} failed", id); return StatusCode(500, new { message = "An unexpected error occurred." }); }
        }

        // ─── Stats ────────────────────────────────────────────────────────────────

        /// <summary>Payment gateway analytics and statistics.</summary>
        [HttpGet("stats")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<IActionResult> GetStats()
        {
            try
            {
                var result = await _payment.GetStatsAsync(GetSchoolId());
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { _logger.LogError(ex, "GetStats failed"); return StatusCode(500, new { message = "An unexpected error occurred." }); }
        }
    }
}
