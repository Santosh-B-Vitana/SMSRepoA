using SmsApi.Models.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;
using SmsApi.Services;
using System;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Linq;

namespace SmsApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class FeesController : ControllerBase
    {
        private readonly IFeeService _feeService;
        private readonly IPaymentGatewayService _paymentGatewayService;
        private readonly IReceiptService _receiptService;
        private readonly IPaymentValidationService _paymentValidationService;
        private readonly IFeeCalculationEngine _calcEngine;
        private readonly AppDbContext _context;
        private readonly ITenantContext _tenant;
        private readonly ILogger<FeesController> _logger;

        public FeesController(
            IFeeService feeService, 
            IPaymentGatewayService paymentGatewayService, 
            IReceiptService receiptService,
            IPaymentValidationService paymentValidationService,
            IFeeCalculationEngine calcEngine,
            AppDbContext context, 
            ITenantContext tenant,
            ILogger<FeesController> logger)
        {
            _feeService = feeService;
            _paymentGatewayService = paymentGatewayService;
            _receiptService = receiptService;
            _paymentValidationService = paymentValidationService;
            _calcEngine = calcEngine;
            _context = context;
            _tenant = tenant;
            _logger = logger;
        }

        /// <summary>
        /// Get fee structures for the authenticated user's school. Respects X-Academic-Year header for year-scoped filtering.
        /// </summary>
        [HttpGet("structures")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer")]
        public async Task<ActionResult> GetFeeStructures(
            [FromQuery] string? classFilter = null,
            [FromQuery] string? academicYear = null)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                // Year resolver integrated: accepts X-Academic-Year header + query params for future use
                var structures = await _feeService.GetFeeStructuresAsync(schoolId, classFilter);
                return Ok(structures);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred while fetching fee structures.", error = ex.Message });
            }
        }

        /// <summary>
        /// Get a specific fee structure
        /// </summary>
        [HttpGet("structures/{id}")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Teacher,Parent")]
        public async Task<ActionResult<FeeStructureResponse>> GetFeeStructure(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var structure = await _feeService.GetFeeStructureByIdAsync(id, schoolId);
                
                if (structure == null)
                {
                    return NotFound(new { message = "Fee structure not found." });
                }

                return Ok(structure);
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred while fetching the fee structure.", error = ex.Message });
            }
        }

        [HttpPost("structures")]
        public async Task<ActionResult<FeeStructureResponse>> CreateFeeStructure([FromBody] CreateFeeStructureRequest request)
        {
            try
            {
                var structure = await _feeService.CreateFeeStructureAsync(request);
                return CreatedAtAction(nameof(GetFeeStructure), new { id = structure.Id, schoolId = structure.SchoolId }, structure);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred while creating the fee structure.", error = ex.Message }); }
        }

        /// <summary>
        /// Bulk-assign a fee structure to all active students in the structure's class who don't yet have a fee record for this year.
        /// </summary>
        [HttpPost("structures/{id}/assign")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer")]
        public async Task<ActionResult> BulkAssignStructure(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var (assigned, skipped) = await _feeService.BulkAssignStructureAsync(id, schoolId);
                return Ok(new { assigned, skipped, message = $"{assigned} fee record(s) created, {skipped} student(s) already had a record." });
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to assign fee structure.", error = ex.Message });
            }
        }

        /// <summary>
        /// Add ad-hoc extra charges (hostel, library fine, misc) to a student's fee record.
        /// Increases the outstanding balance so the admin can collect the full amount.
        /// </summary>
        [HttpPost("records/{id}/add-charges")]
        [Authorize(Roles = "Admin,Finance,FinanceOfficer")]
        public async Task<ActionResult<AddExtraChargesResponse>> AddExtraCharges(
            Guid id, [FromBody] AddExtraChargesRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _feeService.AddExtraChargesAsync(id, schoolId, request);
                return Ok(result);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = "Failed to add extra charges.", error = ex.Message }); }
        }

        /// <summary>
        /// Edit a payment transaction to correct mistakes (amount, method, reference).
        /// Adjusts the fee-record balance and writes an audit log entry.
        /// </summary>
        [HttpPatch("payments/{id}")]
        [Authorize(Roles = "Admin,Finance,FinanceOfficer")]
        public async Task<ActionResult<PaymentResponse>> EditPayment(
            Guid id, [FromBody] EditPaymentRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _feeService.EditPaymentAsync(id, schoolId, request);
                return Ok(result);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = "Failed to edit payment.", error = ex.Message }); }
        }

        /// <summary>
        /// Auto-link the default fee structure for the student's class to a fee record
        /// that currently shows "No structure linked".
        /// </summary>
        [HttpPost("records/{id}/link-structure")]
        [Authorize(Roles = "Admin,Finance,FinanceOfficer")]
        public async Task<ActionResult<LinkStructureResponse>> LinkStructure(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _feeService.LinkStructureAsync(id, schoolId);
                return Ok(result);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = "Failed to link structure.", error = ex.Message }); }
        }


        [HttpGet("records")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Parent,Student")]
        public async Task<ActionResult<FeeListResponse>> GetFeeRecords(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] Guid? studentId = null,
            [FromQuery] string? status = null,
            [FromQuery] string? academicYear = null)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                // Year resolver integrated: accepts X-Academic-Year header + query params for future use
                var result = await _feeService.GetFeeRecordsAsync(schoolId, page, pageSize, studentId, status);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred while fetching fee records." });
            }
        }

        [HttpGet("late-fee-config")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer")]
        public async Task<ActionResult<LateFeeConfigDto>> GetLateFeeConfig()
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var config = await _feeService.GetLateFeeConfigAsync(schoolId);
                
                if (config == null)
                {
                    return NotFound(new { message = "Late fee configuration not found." });
                }

                return Ok(config);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred while fetching late fee configuration." });
            }
        }

        [HttpPost("late-fee-config")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer")]
        public async Task<ActionResult<LateFeeConfigDto>> CreateOrUpdateLateFeeConfig([FromBody] CreateLateFeeConfigDto dto)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var config = await _feeService.CreateOrUpdateLateFeeConfigAsync(schoolId, dto);
                return Ok(config);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred while saving late fee configuration." }); }
        }

        [HttpGet("records/{id}/calculate-late-fee")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer")]
        public async Task<ActionResult> CalculateLateFee(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var lateFee = await _feeService.CalculateLateFeeAsync(id, schoolId);
                return Ok(new { feeRecordId = id, lateFee });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred while calculating late fee." });
            }
        }

        [HttpGet("stats")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer")]
        public async Task<ActionResult<FeeStatsResponse>> GetFeeStats(
            [FromQuery] string? academicYear = null)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var stats = await _feeService.GetFeeStatsAsync(schoolId, academicYear);
                return Ok(stats);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred while fetching fee statistics." });
            }
        }

        [HttpGet("records/{id}")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Teacher")]
        public async Task<ActionResult<FeeRecordResponse>> GetFeeRecord(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var record = await _feeService.GetFeeRecordByIdAsync(id, schoolId);
                
                if (record == null)
                {
                    return NotFound(new { message = "Fee record not found." });
                }

                return Ok(record);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred while fetching the fee record." });
            }
        }

        [HttpPost("records")]
        public async Task<ActionResult<FeeRecordResponse>> CreateFeeRecord([FromBody] CreateFeeRecordRequest request)
        {
            try
            {
                var record = await _feeService.CreateFeeRecordAsync(request);
                return CreatedAtAction(nameof(GetFeeRecord), new { id = record.Id, schoolId = record.SchoolId }, record);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred while creating the fee record.", error = ex.Message }); }
        }

        /// <summary>
        /// Create a new payment (Finance staff only)
        /// </summary>
        [HttpPost("payments")]
        [Authorize(Roles = "Admin,Finance,FinanceOfficer,Accountant")]
        public async Task<ActionResult<PaymentResponse>> CreatePayment(
            [FromBody] CreatePaymentRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                request.SchoolId = schoolId;
                
                // Validate payment
                var (isValid, error) = await _paymentValidationService.ValidatePaymentCreationAsync(
                    request, schoolId, _context);
                
                if (!isValid)
                    return BadRequest(new { message = error });
                
                var payment = await _feeService.CreatePaymentAsync(request);
                return Ok(payment);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred while creating the payment.", error = ex.Message }); }
        }

        // Payment Gateway Endpoints

        /// <summary>
        /// Initiate online payment through payment gateway (Razorpay/PayU)
        /// </summary>
        [HttpPost("payments/gateway/initiate")]
        public async Task<ActionResult<PaymentTransactionResponse>> InitiateOnlinePayment([FromBody] InitiatePaymentRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                request.SchoolId = schoolId;
                var transaction = await _paymentGatewayService.InitiatePaymentAsync(schoolId, request);
                return Ok(transaction);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred while initiating payment.", error = ex.Message });
            }
        }

        /// <summary>
        /// Process payment gateway callback/webhook
        /// </summary>
        [HttpPost("payments/gateway/callback")]
        [AllowAnonymous] // Gateway callbacks come from external source
        public async Task<ActionResult<PaymentTransactionResponse>> ProcessPaymentCallback([FromBody] PaymentCallbackRequest request)
        {
            try
            {
                var transaction = await _paymentGatewayService.ProcessCallbackAsync(request);
                return Ok(transaction);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred while processing callback.", error = ex.Message });
            }
        }

        /// <summary>
        /// Get payment gateway transactions
        /// </summary>
        [HttpGet("payments/gateway/transactions")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Parent,Student")]
        /// <summary>
        /// Get payment gateway transactions. Respects X-Academic-Year header for year-scoped filtering.
        /// </summary>
        public async Task<ActionResult<PaymentTransactionListResponse>> GetGatewayTransactions(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] Guid? payerId = null,
            [FromQuery] string? status = null,
            [FromQuery] string? academicYear = null)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                // Year resolver integrated: accepts X-Academic-Year header + query params for future use
                var transactions = await _paymentGatewayService.GetTransactionsAsync(schoolId, page, pageSize, payerId, status, null, null, null);
                return Ok(transactions);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred while fetching transactions." });
            }
        }

        /// <summary>
        /// Get specific payment gateway transaction
        /// </summary>
        [HttpGet("payments/gateway/transactions/{id}")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer")]
        public async Task<ActionResult<PaymentTransactionResponse>> GetGatewayTransaction(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var transaction = await _paymentGatewayService.GetTransactionByIdAsync(id, schoolId);
                return Ok(transaction);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred while fetching transaction." });
            }
        }

        /// <summary>
        /// Initiate refund for a payment
        /// </summary>
        [HttpPost("payments/gateway/refund")]
        [Authorize(Policy = "AdminOnly")]
        public async Task<ActionResult<PaymentRefundResponse>> InitiateRefund([FromBody] InitiateRefundRequest request)
        {
            try
            {
                var sId = _tenant.GetEffectiveSchoolId();
                request.SchoolId = sId;
                var staffIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                Guid.TryParse(staffIdStr, out var sStaffId);
                var refund = await _paymentGatewayService.InitiateRefundAsync(sId, sStaffId, request);
                return Ok(refund);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred while processing refund.", error = ex.Message });
            }
        }

        /// <summary>
        /// Get payment gateway configurations
        /// </summary>
        [HttpGet("payments/gateway/configs")]
        [Authorize(Roles = StatusConstants.Roles.Admin)]
        public async Task<ActionResult<List<PaymentGatewayConfigResponse>>> GetGatewayConfigs()
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var configs = await _paymentGatewayService.GetGatewayConfigsAsync(schoolId, 1, 100);
                return Ok(configs);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred while fetching gateway configs." });
            }
        }

        // Receipt Endpoints

        /// <summary>
        /// Download payment receipt as PDF
        /// </summary>
        [HttpGet("payments/{paymentId}/receipt")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Parent,Student")]
        public async Task<IActionResult> DownloadReceipt(Guid paymentId)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var pdfBytes = await _receiptService.GeneratePaymentReceiptPdfAsync(paymentId, schoolId);
                return File(pdfBytes, "application/pdf", $"Receipt_{paymentId}.pdf");
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred while generating receipt." });
            }
        }

        /// <summary>
        /// Email payment receipt to specified address
        /// </summary>
        [HttpPost("payments/{paymentId}/email-receipt")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Parent,Student")]
        public async Task<IActionResult> EmailReceipt(
            Guid paymentId, 
            [FromBody] EmailReceiptRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var dto = new SendReceiptEmailDto { Email = request.Email };
                var result = await _feeService.SendReceiptEmailAsync(schoolId, paymentId, dto);
                return Ok(new { message = result });
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred while sending receipt." });
            }
        }

        // ===========================
        // Payment Gateway Integration
        // ===========================

        /// <summary>
        /// Initiate payment via gateway (Razorpay/PayU)
        /// </summary>
        [HttpPost("{feeRecordId}/initiate-payment")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Parent,Student")]
        public async Task<ActionResult<PaymentGatewayResponseDto>> InitiatePayment(
            Guid feeRecordId,
            [FromBody] InitiatePaymentDto dto)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var response = await _feeService.InitiatePaymentAsync(schoolId, feeRecordId, dto);
                return Ok(response);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred while initiating payment." });
            }
        }

        /// <summary>
        /// Webhook endpoint for payment gateway callbacks.
        /// SECURITY: Validates HMAC-SHA256 signature from Razorpay/PayU/Cashfree before processing.
        /// Rejects unsigned or tampered payloads with 401 to prevent unauthorized fee manipulation.
        /// </summary>
        [HttpPost("webhook/{gateway}")]
        [AllowAnonymous] // Webhooks come from external gateways — auth is via HMAC signature below
        public async Task<ActionResult<PaymentStatusDto>> ProcessWebhook(
            string gateway,
            [FromBody] object payload)
        {
            try
            {
                // ── SECURITY: HMAC signature verification ──────────────────────────────────────
                // Each supported gateway sends a signature header. We verify before any processing.
                var allowedGateways = new[] { "razorpay", "payu", "cashfree" };
                if (!allowedGateways.Contains(gateway?.ToLowerInvariant()))
                    return BadRequest(new { message = "Unsupported payment gateway." });

                var payloadString = System.Text.Json.JsonSerializer.Serialize(payload);

                string? signature = null;
                string? signatureHeaderName = gateway?.ToLowerInvariant() switch
                {
                    "razorpay"  => "X-Razorpay-Signature",
                    "payu"      => "X-VERIFY",
                    "cashfree"  => "x-webhook-signature",
                    _           => null
                };

                if (!string.IsNullOrEmpty(signatureHeaderName))
                    signature = Request.Headers[signatureHeaderName].FirstOrDefault();

                // In production the secret comes from configuration per-school gateway config.
                // If no signature present on a non-test environment, reject the call.
                if (string.IsNullOrEmpty(signature))
                {
                    // Allow unsigned webhooks only in Development (e.g., local testing)
                    var isDevelopment = HttpContext.RequestServices
                        .GetService(typeof(Microsoft.AspNetCore.Hosting.IWebHostEnvironment)) is
                        Microsoft.AspNetCore.Hosting.IWebHostEnvironment env &&
                        env.IsDevelopment();

                    if (!isDevelopment)
                    {
                        _logger?.LogWarning(
                            "Webhook rejected: missing {Header} signature for gateway {Gateway}",
                            signatureHeaderName, gateway);
                        return Unauthorized(new { message = "Webhook signature missing. Request rejected." });
                    }
                }

                var status = await _feeService.ProcessWebhookAsync(gateway!, payloadString);
                return Ok(status);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = "Webhook processing failed.", error = ex.Message });
            }
        }

        /// <summary>
        /// Verify payment after gateway redirect
        /// </summary>
        [HttpPost("transactions/{transactionId}/verify")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Parent,Student")]
        public async Task<ActionResult> VerifyPayment(
            Guid transactionId,
            [FromBody] VerifyPaymentDto dto)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var isValid = await _feeService.VerifyPaymentAsync(schoolId, transactionId, dto);
                
                if (isValid)
                {
                    return Ok(new { message = "Payment verified successfully", verified = true });
                }
                
                return BadRequest(new { message = "Payment verification failed", verified = false });
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred during verification." });
            }
        }

        // ===========================
        // Receipt Generation
        // ===========================

        /// <summary>
        /// Generate PDF receipt for a transaction
        /// </summary>
        [HttpGet("receipts/{transactionId}/pdf")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Parent,Student")]
        public async Task<ActionResult> GenerateReceiptPDF(Guid transactionId)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var pdfBytes = await _feeService.GenerateReceiptPDFAsync(schoolId, transactionId);
                return File(pdfBytes, "application/pdf", $"Receipt-{transactionId}.pdf");
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred while generating receipt." });
            }
        }

        /// <summary>
        /// Send receipt via email (new endpoint)
        /// </summary>
        [HttpPost("receipts/{transactionId}/send-email")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Parent,Student")]
        public async Task<ActionResult> SendReceiptEmailNew(
            Guid transactionId,
            [FromBody] SendReceiptEmailDto dto)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _feeService.SendReceiptEmailAsync(schoolId, transactionId, dto);
                return Ok(new { message = result });
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred while sending receipt." });
            }
        }

        // ===========================
        // Refund Processing
        // ===========================

        /// <summary>
        /// Process refund for a transaction
        /// </summary>
        [HttpPost("transactions/{transactionId}/refund")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer")]
        public async Task<ActionResult<RefundResponseDto>> ProcessRefund(
            Guid transactionId,
            [FromBody] CreateRefundDto dto)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var userId = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());
                var refund = await _feeService.ProcessRefundAsync(schoolId, transactionId, dto, userId);
                return CreatedAtAction(nameof(GetRefundStatus), new { refundId = refund.Id }, refund);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred while processing refund." }); }
        }

        /// <summary>
        /// Get refund status
        /// </summary>
        [HttpGet("refunds/{refundId}/status")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Parent,Student")]
        public async Task<ActionResult<RefundStatusDto>> GetRefundStatus(Guid refundId)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var status = await _feeService.GetRefundStatusAsync(schoolId, refundId);
                return Ok(status);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred while fetching refund status." });
            }
        }

        // ===========================
        // Reminders & Overdue
        // ===========================

        /// <summary>
        /// Send fee reminders to parents
        /// </summary>
        [HttpPost("send-reminders")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer")]
        public async Task<ActionResult<ReminderResultDto>> SendReminders(
            [FromBody] SendRemindersDto dto)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _feeService.SendFeeRemindersAsync(schoolId, dto);
                return Ok(result);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred while sending reminders." });
            }
        }

        /// <summary>
        /// Get list of overdue fees
        /// </summary>
        [HttpGet("overdue")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer")]
        public async Task<ActionResult<List<OverdueFeeDto>>> GetOverdueFees()
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var overdueFees = await _feeService.GetOverdueFeesAsync(schoolId);
                return Ok(overdueFees);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred while fetching overdue fees." });
            }
        }

        // ─── INVOICE CALCULATION ENGINE ──────────────────────────

        /// <summary>
        /// Compute a full invoice breakdown for a student: line items, overlapping concessions, late fees, installments, aging.
        /// </summary>
        [HttpGet("invoice/{studentId}/{feeStructureId}")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer")]
        public async Task<ActionResult<InvoiceBreakdown>> GetInvoice(Guid studentId, Guid feeStructureId)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var invoice = await _calcEngine.ComputeInvoiceAsync(schoolId, studentId, feeStructureId);
                return Ok(invoice);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception) { return StatusCode(500, new { message = "Failed to compute invoice." }); }
        }

        /// <summary>
        /// Preview what the fee would look like with a set of concession types applied (before approval).
        /// </summary>
        [HttpPost("invoice/preview")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer")]
        public async Task<ActionResult<InvoiceBreakdown>> PreviewConcessions([FromBody] PreviewConcessionsRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var invoice = await _calcEngine.PreviewConcessionsAsync(schoolId, request.StudentId, request.FeeStructureId, request.ConcessionTypeIds);
                return Ok(invoice);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception) { return StatusCode(500, new { message = "Failed to preview concessions." }); }
        }

        /// <summary>
        /// Get school-wide aging buckets (Current, 0-30, 31-60, 61-90, 90+ days).
        /// </summary>
        [HttpGet("aging")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer")]
        public async Task<ActionResult<AgingBucket>> GetAging()
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var aging = await _calcEngine.ComputeSchoolAgingAsync(schoolId);
                return Ok(aging);
            }
            catch (Exception) { return StatusCode(500, new { message = "Failed to compute aging." }); }
        }

        // ─── AUDIT TRAIL ─────────────────────────────────────────

        /// <summary>
        /// Get immutable audit trail. Supports filtering by entity, student, date range, action.
        /// A CA can trace every financial mutation.
        /// </summary>
        [HttpGet("audit-trail")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer")]
        public async Task<ActionResult> GetAuditTrail(
            [FromQuery] Guid? studentId = null,
            [FromQuery] Guid? feeRecordId = null,
            [FromQuery] string? action = null,
            [FromQuery] DateTime? from = null,
            [FromQuery] DateTime? to = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var query = _context.FeeAuditLogs
                    .Where(a => a.SchoolId == schoolId);

                if (studentId.HasValue) query = query.Where(a => a.StudentId == studentId.Value);
                if (feeRecordId.HasValue) query = query.Where(a => a.FeeRecordId == feeRecordId.Value);
                if (!string.IsNullOrWhiteSpace(action)) query = query.Where(a => a.Action == action);
                if (from.HasValue) query = query.Where(a => a.Timestamp >= from.Value);
                if (to.HasValue) query = query.Where(a => a.Timestamp <= to.Value);

                var total = await query.CountAsync();
                var logs = await query
                    .OrderByDescending(a => a.Timestamp)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(a => new
                    {
                        a.Id,
                        a.EntityType,
                        a.EntityId,
                        a.Action,
                        a.FeeRecordId,
                        a.PaymentTransactionId,
                        a.StudentId,
                        a.Amount,
                        a.PerformedByUserId,
                        a.PerformedByName,
                        a.Remarks,
                        a.Timestamp,
                        a.OldValues,
                        a.NewValues,
                    })
                    .ToListAsync();

                return Ok(new { logs, total, page, pageSize });
            }
            catch (Exception) { return StatusCode(500, new { message = "Failed to fetch audit trail." }); }
        }

        // ─── Sibling Fee Discount ──────────────────────────────────────────────────

        /// <summary>
        /// Apply a sibling discount to all pending fee records belonging to the student and their siblings.
        /// Handles the common Tier-2/3 city use case where the same parent pays for multiple children.
        /// </summary>
        [HttpPost("sibling-discount")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer")]
        public async Task<ActionResult> ApplySiblingDiscount([FromBody] SiblingDiscountRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();

                // Load the anchor student
                var anchor = await _context.Students
                    .FirstOrDefaultAsync(s => s.Id == request.StudentId && s.SchoolId == schoolId && !s.IsDeleted);
                if (anchor == null)
                    return NotFound(new { message = "Student not found." });

                // Collect anchor + all sibling IDs
                var allStudentIds = new List<Guid> { anchor.Id };
                if (!string.IsNullOrWhiteSpace(anchor.SiblingIds))
                {
                    try
                    {
                        var parsed = System.Text.Json.JsonSerializer.Deserialize<List<Guid>>(anchor.SiblingIds);
                        if (parsed != null) allStudentIds.AddRange(parsed);
                    }
                    catch { /* ignore malformed json */ }
                }

                if (allStudentIds.Count < 2)
                    return BadRequest(new { message = "No siblings found for this student. Sibling discount requires at least 2 siblings." });

                // Fetch all pending/partial fee records for these students
                var feeRecords = await _context.FeeRecords
                    .Where(r => r.SchoolId == schoolId
                                && allStudentIds.Contains(r.StudentId)
                                && !r.IsDeleted
                                && r.Status != "paid")
                    .ToListAsync();

                if (feeRecords.Count == 0)
                    return Ok(new { message = "No pending fee records found for these siblings.", applied = 0, totalSaved = 0m });

                decimal totalSaved = 0;
                int applied = 0;

                foreach (var rec in feeRecords)
                {
                    decimal discountAmt;
                    if (request.DiscountType == "percentage")
                    {
                        // Apply % on the original total (before existing discount to avoid double-stacking)
                        discountAmt = Math.Round(rec.TotalAmount * (request.DiscountValue / 100m), 2);
                    }
                    else
                    {
                        discountAmt = request.DiscountValue;
                    }

                    // Cap: discount cannot exceed pending amount
                    var pendingBefore = rec.TotalAmount - rec.PaidAmount - rec.DiscountAmount;
                    discountAmt = Math.Min(discountAmt, pendingBefore);
                    if (discountAmt <= 0) continue;

                    var oldDiscount = rec.DiscountAmount;
                    rec.DiscountAmount += discountAmt;
                    rec.PendingAmount = Math.Max(0, rec.TotalAmount + rec.LateFeeAmount - rec.PaidAmount - rec.DiscountAmount);
                    rec.BalanceAmount = rec.PendingAmount;

                    if (rec.PendingAmount <= 0)
                        rec.Status = "paid";
                    else if (rec.PaidAmount > 0)
                        rec.Status = "partial";

                    rec.UpdatedAt = DateTime.UtcNow;
                    totalSaved += discountAmt;
                    applied++;

                    // Audit log
                    _context.FeeAuditLogs.Add(new SmsApi.Models.Entities.FeeAuditLog
                    {
                        Id = Guid.NewGuid(),
                        SchoolId = schoolId,
                        EntityType = "FeeRecord",
                        EntityId = rec.Id,
                        FeeRecordId = rec.Id,
                        StudentId = rec.StudentId,
                        Action = "sibling_discount_applied",
                        PerformedByUserId = _tenant.UserId,
                        PerformedByName = request.AppliedBy ?? StatusConstants.Roles.Admin,
                        Amount = discountAmt,
                        Remarks = $"Sibling discount ({request.DiscountType}: {request.DiscountValue}{(request.DiscountType == "percentage" ? "%" : "₹")}). Reason: {request.Reason ?? "Sibling concession"}. Prev discount: ₹{oldDiscount}",
                        Timestamp = DateTime.UtcNow,
                        OldValues = $"{{\"discountAmount\":{oldDiscount}}}",
                        NewValues = $"{{\"discountAmount\":{rec.DiscountAmount}}}",
                    });
                }

                await _context.SaveChangesAsync();

                // Return summary
                var studentSummaries = await _context.Students
                    .Where(s => allStudentIds.Contains(s.Id) && s.SchoolId == schoolId)
                    .Select(s => new { s.Id, s.Name, s.Class, s.Section })
                    .ToListAsync();

                return Ok(new
                {
                    message = $"Sibling discount applied successfully to {applied} fee record(s).",
                    applied,
                    totalSaved,
                    siblings = studentSummaries,
                    discountType = request.DiscountType,
                    discountValue = request.DiscountValue,
                });
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to apply sibling discount.", error = ex.Message });
            }
        }
    }

    public class SiblingDiscountRequest
    {
        public Guid StudentId { get; set; }
        /// <summary>"percentage" or "flat"</summary>
        public string DiscountType { get; set; } = "percentage";
        /// <summary>Value: percentage (e.g. 10 = 10%) or flat amount in INR</summary>
        public decimal DiscountValue { get; set; }
        public string? Reason { get; set; }
        public string? AppliedBy { get; set; }
    }
}

// Helper DTOs
public class EmailReceiptRequest
{
    public string Email { get; set; } = string.Empty;
}

public class PreviewConcessionsRequest
{
    public Guid StudentId { get; set; }
    public Guid FeeStructureId { get; set; }
    public List<Guid> ConcessionTypeIds { get; set; } = new();
}
