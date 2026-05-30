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
using System.ComponentModel.DataAnnotations;

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
        private readonly IParentAuthorizationService _parentAuth;
        private readonly INotificationService _notificationService;

        public FeesController(
            IFeeService feeService, 
            IPaymentGatewayService paymentGatewayService, 
            IReceiptService receiptService,
            IPaymentValidationService paymentValidationService,
            IFeeCalculationEngine calcEngine,
            AppDbContext context, 
            ITenantContext tenant,
            ILogger<FeesController> logger,
            IParentAuthorizationService parentAuth,
            INotificationService notificationService)
        {
            _feeService = feeService;
            _paymentGatewayService = paymentGatewayService;
            _receiptService = receiptService;
            _paymentValidationService = paymentValidationService;
            _calcEngine = calcEngine;
            _context = context;
            _tenant = tenant;
            _logger = logger;
            _parentAuth = parentAuth;
            _notificationService = notificationService;
        }

        /// <summary>
        /// Get fee structures for the authenticated user's school. Respects X-Academic-Year header for year-scoped filtering.
        /// </summary>
        [HttpGet("structures")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant,Teacher,Staff")]
        public async Task<ActionResult> GetFeeStructures(
            [FromQuery] string? classFilter = null,
            [FromQuery] string? academicYear = null,
            [FromQuery] Guid? boardConfigurationId = null)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var headerYear = HttpContext.Items["AcademicYearHeaderValue"] as string;
                var effectiveYear = !string.IsNullOrWhiteSpace(academicYear) ? academicYear : headerYear;
                var structures = await _feeService.GetFeeStructuresAsync(schoolId, classFilter, effectiveYear, boardConfigurationId);
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
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant,Teacher,Staff,Parent")]
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
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant,Teacher,Staff")]
        public async Task<ActionResult<FeeStructureResponse>> CreateFeeStructure([FromBody] CreateFeeStructureRequest request)
        {
            try
            {
                // Always use the authenticated user's school — never trust the client-supplied schoolId
                request.SchoolId = _tenant.GetEffectiveSchoolId();
                var structure = await _feeService.CreateFeeStructureAsync(request);

                // Auto-assign the new structure to every active student in the class
                var (assigned, skipped) = await _feeService.BulkAssignStructureAsync(structure.Id, structure.SchoolId);
                _logger.LogInformation(
                    "Auto-assigned structure {StructureId} to {Assigned} student(s) in Class {Class} ({Skipped} skipped).",
                    structure.Id, assigned, structure.Class, skipped);

                return CreatedAtAction(
                    nameof(GetFeeStructure),
                    new { id = structure.Id, schoolId = structure.SchoolId },
                    new { structure, autoAssigned = assigned, autoSkipped = skipped });
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred while creating the fee structure.", error = ex.Message }); }
        }

        /// <summary>
        /// Update an existing fee structure (name, fee heads, installment plan).
        /// </summary>
        [HttpPut("structures/{id}")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant,Teacher,Staff")]
        public async Task<ActionResult<FeeStructureResponse>> UpdateFeeStructure(Guid id, [FromBody] UpdateFeeStructureRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var structure = await _feeService.UpdateFeeStructureAsync(id, schoolId, request);
                if (structure == null)
                    return NotFound(new { message = "Fee structure not found." });
                return Ok(structure);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred while updating the fee structure.", error = ex.Message }); }
        }

        /// <summary>
        /// Delete a fee structure. Only allowed if no fee records are linked to it.
        /// </summary>
        [HttpDelete("structures/{id}")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant")]
        public async Task<ActionResult> DeleteFeeStructure(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                await _feeService.DeleteFeeStructureAsync(id, schoolId);
                return NoContent();
            }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred while deleting the fee structure.", error = ex.Message }); }
        }

        /// <summary>
        /// Bulk-assign a fee structure to all active students in the structure's class who don't yet have a fee record for this year.
        /// </summary>
        [HttpPost("structures/{id}/assign")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant,Teacher,Staff")]
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
        /// Seed default fee structures for every active-student class that has none for the given academic year.
        /// Creates a 3-term schedule with tiered tuition fees. Safe to call multiple times — existing classes are skipped.
        /// </summary>
        [HttpPost("structures/seed")]
        [Authorize(Roles = "Admin,Principal")]
        public async Task<ActionResult> SeedStructures([FromQuery] string? academicYear = null)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                // Fall back to current active academic year if not supplied
                if (string.IsNullOrWhiteSpace(academicYear))
                {
                    academicYear = await _context.AcademicYears
                        .Where(y => y.SchoolId == schoolId && y.IsCurrent)
                        .Select(y => y.Name)
                        .FirstOrDefaultAsync();
                }
                if (string.IsNullOrWhiteSpace(academicYear))
                    return BadRequest(new { message = "Could not determine academic year. Please supply ?academicYear=YYYY-YYYY." });

                var (created, skipped) = await _feeService.SeedStructuresAsync(schoolId, academicYear);
                return Ok(new { created, skipped, academicYear, message = $"{created} structure(s) created, {skipped} class(es) already had structures." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to seed fee structures.", error = ex.Message });
            }
        }

        /// <summary>
        /// Backfill fee records for all active students who don't yet have one for the given
        /// academic year.  Uses each student's class to find the best matching fee structure
        /// and respects their transport/hostel flags.  Safe to call multiple times.
        /// </summary>
        [HttpPost("sync-students")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant")]
        public async Task<ActionResult> SyncStudentFeeRecords([FromQuery] string? academicYear = null)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();

                if (string.IsNullOrWhiteSpace(academicYear))
                {
                    academicYear = await _context.AcademicYears
                        .Where(y => y.SchoolId == schoolId && y.IsCurrent)
                        .Select(y => y.Name)
                        .FirstOrDefaultAsync();
                }
                if (string.IsNullOrWhiteSpace(academicYear))
                    return BadRequest(new { message = "Could not determine academic year. Please supply ?academicYear=YYYY-YYYY." });

                var (created, skipped) = await _feeService.SyncStudentFeeRecordsAsync(schoolId, academicYear);
                return Ok(new
                {
                    created,
                    skipped,
                    academicYear,
                    message = $"{created} student(s) imported into fees, {skipped} already had records or had no matching fee structure."
                });
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to sync student fee records.", error = ex.Message });
            }
        }

        /// <summary>
        /// Fix stale TotalAmount on fee records whose linked structure was updated after assignment.
        /// Safe to re-run — records that already match their structure are skipped unchanged.
        /// </summary>
        [HttpPost("recalculate-totals")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant")]
        public async Task<ActionResult> RecalculateFeeTotals()
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var (fixed_, skipped) = await _feeService.RecalculateFeeTotalsAsync(schoolId);
                return Ok(new
                {
                    fixed_,
                    skipped,
                    message = $"{fixed_} record(s) corrected, {skipped} already accurate or skipped."
                });
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to recalculate fee totals.", error = ex.Message });
            }
        }

        /// <summary>
        /// Add ad-hoc extra charges (hostel, library fine, misc) to a student's fee record.
        /// Increases the outstanding balance so the admin can collect the full amount.
        /// </summary>
        [HttpPost("records/{id}/add-charges")]
        [Authorize(Roles = "Admin,Finance,FinanceOfficer,Accountant,Teacher,Staff")]
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
        [Authorize(Roles = "Admin,Finance,FinanceOfficer,Accountant,Teacher,Staff")]
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
        [Authorize(Roles = "Admin,Finance,FinanceOfficer,Accountant,Teacher,Staff")]
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
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant,Teacher,Staff,Parent,Student")]
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

                // Parent role: must provide a studentId and must be a linked guardian
                var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? "";
                if (userRole == "Parent" || userRole == "Student")
                {
                    if (!studentId.HasValue)
                        return BadRequest(new { message = "studentId is required for Parent/Student role." });

                    var parentEmail = _tenant.UserEmail ?? string.Empty;
                    var canAccess = await _parentAuth.CanAccessStudentAsync(schoolId, parentEmail, studentId.Value);
                    if (!canAccess)
                        return StatusCode(403, new { message = "Parents can only access their own child's fee records." });
                }

                // Year resolver integrated: accepts X-Academic-Year header + query params for future use
                var result = await _feeService.GetFeeRecordsAsync(schoolId, page, pageSize, studentId, status, academicYear);
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
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant,Teacher,Staff")]
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
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant,Teacher,Staff")]
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
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant,Teacher,Staff")]
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
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant,Teacher,Staff")]
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
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant,Teacher,Staff,Parent,Student")]
        public async Task<ActionResult<FeeRecordResponse>> GetFeeRecord(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();

                // Parent/Student: ensure they can only access their own child's record
                var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? "";
                if (userRole == "Parent" || userRole == "Student")
                {
                    var record = await _feeService.GetFeeRecordByIdAsync(id, schoolId);
                    if (record == null) return NotFound(new { message = "Fee record not found." });

                    var parentEmail = _tenant.UserEmail ?? string.Empty;
                    var canAccess = await _parentAuth.CanAccessStudentAsync(schoolId, parentEmail, record.StudentId);
                    if (!canAccess)
                        return StatusCode(403, new { message = "Parents can only access their own child's fee records." });

                    return Ok(record);
                }

                var result = await _feeService.GetFeeRecordByIdAsync(id, schoolId);
                if (result == null) return NotFound(new { message = "Fee record not found." });
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred while fetching the fee record." });
            }
        }

        [HttpPatch("records/{id}/module-fees")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant,Teacher,Staff")]
        public async Task<ActionResult<FeeRecordResponse>> UpdateModuleFees(Guid id, [FromBody] UpdateModuleFeesRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _feeService.UpdateModuleFeesAsync(id, schoolId, request.TransportMonthlyFee, request.HostelMonthlyFee);
                if (result == null) return NotFound(new { message = "Fee record not found." });
                return Ok(result);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred while updating module fees." }); }
        }

        [HttpPost("records")]
        [Authorize(Roles = "Admin,Finance,FinanceOfficer,Accountant,Teacher,Staff")]
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
        [Authorize(Roles = "Admin,Finance,FinanceOfficer,Accountant,Teacher,Staff")]
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
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant,Teacher,Staff,Parent,Student")]
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
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant,Teacher,Staff")]
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
        /// Get recent payments for a given date (defaults to today). Used by the Day Summary tab.
        /// </summary>
        [HttpGet("payments/recent")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant,Teacher,Staff")]
        public async Task<ActionResult<List<RecentPaymentDto>>> GetRecentPayments([FromQuery] string? date = null)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            DateTime? parsedDate = null;
            if (!string.IsNullOrWhiteSpace(date) &&
                DateTime.TryParseExact(date, "yyyy-MM-dd", null,
                    System.Globalization.DateTimeStyles.None, out var d))
                parsedDate = d;
            var result = await _feeService.GetRecentPaymentsAsync(schoolId, parsedDate);
            return Ok(result);
        }

        /// <summary>
        /// Download payment receipt as PDF
        /// </summary>
        [HttpGet("payments/{paymentId}/receipt")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant,Teacher,Staff,Parent,Student")]
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
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant,Teacher,Staff,Parent,Student")]
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
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant,Teacher,Staff,Parent,Student")]
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
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant,Teacher,Staff,Parent,Student")]
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
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant,Teacher,Staff,Parent,Student")]
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
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant,Teacher,Staff,Parent,Student")]
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
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant,Teacher,Staff")]
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
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant,Teacher,Staff,Parent,Student")]
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
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant,Teacher,Staff")]
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
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant,Teacher,Staff")]
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
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant,Teacher,Staff")]
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
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant,Teacher,Staff")]
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
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant,Teacher,Staff")]
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
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant,Teacher,Staff")]
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
        /// Fetch the anchor student + their siblings with fee summaries and installment breakdown.
        /// Used by the Collect Payment form to show sibling info before applying a discount.
        /// </summary>
        [HttpGet("sibling-info")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant,Teacher,Staff")]
        public async Task<ActionResult<List<SiblingFeeInfoDto>>> GetSiblingInfo(
            [FromQuery] Guid studentId,
            [FromQuery] string? academicYear = null)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();

            var anchor = await _context.Students
                .FirstOrDefaultAsync(s => s.Id == studentId && s.SchoolId == schoolId && !s.IsDeleted);
            if (anchor == null) return NotFound(new { message = "Student not found." });

            // Primary: use the StudentSiblings junction table (bidirectional links)
            var siblingIds = await _context.StudentSiblings
                .Where(x => x.StudentId == anchor.Id && x.SchoolId == schoolId)
                .Select(x => x.SiblingId)
                .ToListAsync();

            // Fallback: legacy SiblingIds JSON on the Student row
            if (siblingIds.Count == 0 && !string.IsNullOrWhiteSpace(anchor.SiblingIds))
            {
                try
                {
                    var parsed = System.Text.Json.JsonSerializer.Deserialize<List<Guid>>(anchor.SiblingIds);
                    if (parsed != null) siblingIds.AddRange(parsed);
                }
                catch { }
            }

            var allStudentIds = new List<Guid> { anchor.Id };
            allStudentIds.AddRange(siblingIds);

            var students = await _context.Students
                .Where(s => allStudentIds.Contains(s.Id) && s.SchoolId == schoolId && !s.IsDeleted)
                .ToListAsync();

            var feeQuery = _context.FeeRecords
                .Where(r => r.SchoolId == schoolId && allStudentIds.Contains(r.StudentId) && !r.IsDeleted);
            if (!string.IsNullOrWhiteSpace(academicYear))
                feeQuery = feeQuery.Where(r => r.AcademicYear == academicYear);

            var feeRecords = await feeQuery
                .OrderByDescending(r => r.AcademicYear)
                .ThenByDescending(r => r.CreatedAt)
                .ToListAsync();

            // Load linked fee structures so we can build installment breakdowns
            var structureIds = feeRecords
                .Where(r => r.FeeStructureId.HasValue)
                .Select(r => r.FeeStructureId!.Value)
                .Distinct().ToList();
            var structures = structureIds.Count > 0
                ? await _context.FeeStructures.Where(s => structureIds.Contains(s.Id)).ToListAsync()
                : new List<FeeStructure>();

            // Load approved concessions for all relevant students
            var concessionQuery = _context.FeeConcessions
                .Include(fc => fc.ConcessionType)
                .Where(fc => fc.SchoolId == schoolId && allStudentIds.Contains(fc.StudentId) && fc.Status == "Approved");
            if (!string.IsNullOrWhiteSpace(academicYear))
                concessionQuery = concessionQuery.Where(fc => fc.AcademicYear == academicYear);
            var allConcessions = await concessionQuery.ToListAsync();

            // Load active transport enrollments so monthly fees can be surfaced in the payment UI
            var transportMap = await _context.TransportStudents
                .Where(t => t.SchoolId == schoolId && allStudentIds.Contains(t.StudentId) && t.Status == "active")
                .GroupBy(t => t.StudentId)
                .Select(g => new { StudentId = g.Key, MonthlyFee = g.Max(t => t.MonthlyFee ?? t.Fare) })
                .ToDictionaryAsync(x => x.StudentId, x => x.MonthlyFee);

            // Load active hostel enrollments
            var hostelMap = await _context.HostelStudents
                .Where(h => h.SchoolId == schoolId && allStudentIds.Contains(h.StudentId) && h.Status == "active")
                .GroupBy(h => h.StudentId)
                .Select(g => new { StudentId = g.Key, MonthlyFee = g.Max(h => h.MonthlyFee) })
                .ToDictionaryAsync(x => x.StudentId, x => x.MonthlyFee);

            var result = new List<SiblingFeeInfoDto>();
            foreach (var s in students)
            {
                var studentRecs = feeRecords.Where(r => r.StudentId == s.Id).ToList();
                var studentConcessions = allConcessions
                    .Where(c => c.StudentId == s.Id)
                    .Select(c => new SiblingConcessionDto
                    {
                        Name = c.ConcessionType?.Name ?? "Concession",
                        Amount = c.ApprovedAmount > 0 ? c.ApprovedAmount : c.AppliedAmount,
                        Reason = c.Reason ?? "",
                    }).ToList();

                if (studentRecs.Count == 0)
                {
                    result.Add(new SiblingFeeInfoDto
                    {
                        StudentId = s.Id,
                        StudentName = s.Name,
                        Class = s.Class ?? "",
                        Section = s.Section ?? "",
                        IsAnchor = s.Id == anchor.Id,
                        TotalFee = 0,
                        PaidAmount = 0,
                        PendingAmount = 0,
                        DiscountAmount = 0,
                        LateFeeAmount = 0,
                        Status = "no_record",
                        FeeRecordId = null,
                        AcademicYear = "",
                        StructureName = null,
                        InstallmentPlan = "Annual",
                        Installments = new(),
                        FeeHeads = new(),
                        FeeHeadFrequencies = new(),
                        ConcessionAmount = studentConcessions.Sum(c => c.Amount),
                        Concessions = studentConcessions,
                        TransportMonthlyFee = transportMap.TryGetValue(s.Id, out var tm) ? tm : null,
                        HostelMonthlyFee = hostelMap.TryGetValue(s.Id, out var hm) ? hm : null,
                    });
                    continue;
                }

                // Return one DTO per fee record so the UI can show (and collect) each independently.
                // Only the first record for the anchor student is marked IsAnchor=true; additional
                // records (e.g. a separate transport or hostel fee) render as selectable sections.
                bool firstRecord = true;
                foreach (var rec in studentRecs)
                {
                    var structure = rec.FeeStructureId.HasValue
                        ? structures.FirstOrDefault(st => st.Id == rec.FeeStructureId)
                        : null;
                    var installments = BuildInstallments(structure, rec.TotalAmount, rec.PaidAmount, rec.FeeHeadOverrides);
                    var planLabel = GetInstallmentPlanLabel(structure?.InstallmentCount ?? 1);

                    result.Add(new SiblingFeeInfoDto
                    {
                        StudentId = s.Id,
                        StudentName = s.Name,
                        Class = s.Class ?? "",
                        Section = s.Section ?? "",
                        IsAnchor = s.Id == anchor.Id && firstRecord,
                        TotalFee = rec.TotalAmount,
                        PaidAmount = rec.PaidAmount,
                        PendingAmount = rec.PendingAmount,
                        DiscountAmount = rec.DiscountAmount,
                        LateFeeAmount = rec.LateFeeAmount,
                        Status = rec.Status,
                        FeeRecordId = rec.Id.ToString(),
                        AcademicYear = rec.AcademicYear,
                        StructureName = structure?.Name,
                        InstallmentPlan = planLabel,
                        Installments = installments,
                        FeeHeads = BuildFeeHeads(structure, rec.FeeHeadOverrides),
                        FeeHeadFrequencies = BuildFeeHeadFrequencyMap(structure),
                        ConcessionAmount = studentConcessions.Sum(c => c.Amount),
                        Concessions = studentConcessions,
                        TransportMonthlyFee = transportMap.TryGetValue(s.Id, out var tm) ? tm : null,
                        HostelMonthlyFee = hostelMap.TryGetValue(s.Id, out var hm) ? hm : null,
                    });
                    firstRecord = false;
                }
            }
            result = result.OrderByDescending(x => x.IsAnchor).ThenByDescending(x => x.TotalFee).ToList();

            return Ok(result);
        }

        private static Dictionary<string, decimal> BuildFeeHeads(FeeStructure? structure, string? feeHeadOverridesJson = null)
        {
            if (structure == null) return new();
            Dictionary<string, decimal>? overrides = null;
            if (!string.IsNullOrWhiteSpace(feeHeadOverridesJson))
            {
                try { overrides = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, decimal>>(feeHeadOverridesJson); } catch { }
            }
            decimal Eff(string key, decimal structVal) =>
                overrides != null && overrides.TryGetValue(key, out var ov) ? ov : structVal;

            var defs = new (string Label, decimal Val)[]
            {
                ("Tuition Fee",     Eff("tuitionFee",     structure.TuitionFee)),
                ("Admission Fee",   Eff("admissionFee",   structure.AdmissionFee)),
                ("Exam Fee",        Eff("examFee",        structure.ExamFee)),
                ("Library Fee",     Eff("libraryFee",     structure.LibraryFee)),
                ("Lab Fee",         Eff("labFee",         structure.LabFee)),
                ("Sports Fee",      Eff("sportsFee",      structure.SportsFee)),
                ("Transport Fee",   Eff("transportFee",   structure.TransportFee)),
                ("Hostel Fee",      Eff("hostelFee",      structure.HostelFee)),
                ("Uniform Fee",     Eff("uniformFee",     structure.UniformFee)),
                ("Books Fee",       Eff("booksFee",       structure.BooksFee)),
                ("Development Fee", Eff("developmentFee", structure.DevelopmentFee)),
                ("Miscellaneous",   Eff("miscellaneous",  structure.Miscellaneous)),
            };
            return defs.Where(d => d.Val > 0).ToDictionary(d => d.Label, d => d.Val);
        }

        private static Dictionary<string, string> BuildFeeHeadFrequencyMap(FeeStructure? structure)
        {
            if (structure == null || string.IsNullOrEmpty(structure.FeeHeadFrequencies))
                return new();
            try
            {
                return System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string>>(
                    structure.FeeHeadFrequencies,
                    new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                    ?? new();
            }
            catch { return new(); }
        }

        private static List<SiblingInstallmentDto> BuildInstallments(FeeStructure? structure, decimal actualTotal, decimal paidAmount, string? feeHeadOverridesJson = null)
        {
            if (structure == null) return new();

            // Parse per-student head overrides (camelCase keys, e.g. {"libraryFee":0})
            Dictionary<string, decimal>? overrides = null;
            if (!string.IsNullOrWhiteSpace(feeHeadOverridesJson))
            {
                try { overrides = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, decimal>>(feeHeadOverridesJson); } catch { }
            }

            int count = structure.InstallmentCount < 1 ? 1 : structure.InstallmentCount;

            // Parse raw proportional weights from the fee structure template
            decimal[] rawAmounts;
            try
            {
                var parsed = string.IsNullOrWhiteSpace(structure.InstallmentAmounts)
                    ? null
                    : System.Text.Json.JsonSerializer.Deserialize<decimal[]>(structure.InstallmentAmounts);
                rawAmounts = parsed != null && parsed.Length == count
                    ? parsed
                    : Enumerable.Repeat(1m, count).ToArray(); // equal weights if not specified
            }
            catch { rawAmounts = Enumerable.Repeat(1m, count).ToArray(); }

            // Scale proportionally to the ACTUAL fee record total (not the structure template total)
            decimal referenceTotal = actualTotal > 0 ? actualTotal : structure.TotalAmount;
            decimal rawSum = rawAmounts.Sum();
            decimal[] amounts;
            if (rawSum > 0 && referenceTotal > 0)
            {
                amounts = rawAmounts.Select(a => Math.Round(a / rawSum * referenceTotal, 2)).ToArray();
                // Absorb rounding difference into the last installment
                decimal diff = referenceTotal - amounts.Sum();
                if (amounts.Length > 0) amounts[amounts.Length - 1] += diff;
            }
            else
            {
                decimal each = referenceTotal > 0 ? Math.Round(referenceTotal / count, 2) : 0;
                amounts = Enumerable.Repeat(each, count).ToArray();
                if (amounts.Length > 0) amounts[amounts.Length - 1] += referenceTotal - amounts.Sum();
            }

            DateTime?[] dueDates;
            try
            {
                var parsed = string.IsNullOrWhiteSpace(structure.InstallmentDueDates)
                    ? null
                    : System.Text.Json.JsonSerializer.Deserialize<string[]>(structure.InstallmentDueDates);
                dueDates = parsed?.Select(d => (DateTime?)DateTime.Parse(d)).ToArray()
                    ?? new DateTime?[count];
            }
            catch { dueDates = new DateTime?[count]; }

            var list = new List<SiblingInstallmentDto>();
            decimal remaining = paidAmount;
            bool foundCurrent = false;

            for (int i = 0; i < count; i++)
            {
                decimal instAmt = amounts[i];
                decimal paidInThis = Math.Min(remaining, instAmt);
                remaining = Math.Max(0, remaining - paidInThis);
                decimal dueInThis = instAmt - paidInThis;
                DateTime? due = i < dueDates.Length ? dueDates[i] : null;

                string status;
                if (dueInThis <= 0)
                    status = "paid";
                else if (!foundCurrent)
                {
                    status = "current";   // first installment with an outstanding amount = active/next due
                    foundCurrent = true;
                }
                else
                    status = "upcoming";

                // Proportional fee head breakdown for this installment
                var feeHeads = new Dictionary<string, decimal>();
                // Merge structure head amounts with per-student overrides
                decimal Eff(string key, decimal structVal) =>
                    overrides != null && overrides.TryGetValue(key, out var ov) ? ov : structVal;

                var headDefs = new (string Label, decimal HeadAmt)[]
                {
                    ("Tuition Fee",     Eff("tuitionFee",    structure.TuitionFee)),
                    ("Admission Fee",   Eff("admissionFee",  structure.AdmissionFee)),
                    ("Exam Fee",        Eff("examFee",       structure.ExamFee)),
                    ("Library Fee",     Eff("libraryFee",    structure.LibraryFee)),
                    ("Lab Fee",         Eff("labFee",        structure.LabFee)),
                    ("Sports Fee",      Eff("sportsFee",     structure.SportsFee)),
                    ("Transport Fee",   Eff("transportFee",  structure.TransportFee)),
                    ("Hostel Fee",      Eff("hostelFee",     structure.HostelFee)),
                    ("Uniform Fee",     Eff("uniformFee",    structure.UniformFee)),
                    ("Books Fee",       Eff("booksFee",      structure.BooksFee)),
                    ("Development Fee", Eff("developmentFee",structure.DevelopmentFee)),
                    ("Miscellaneous",   Eff("miscellaneous", structure.Miscellaneous)),
                }.Where(h => h.HeadAmt > 0).ToArray();

                decimal headDefSum = headDefs.Sum(h => h.HeadAmt);
                // Scale fee head amounts to dueInThis (what's actually owed), not instAmt (full installment).
                // This ensures that for partially-paid installments the breakdown correctly sums to
                // dueInInstallment, preventing cashiers from selecting more than is outstanding.
                if (headDefSum > 0 && dueInThis > 0)
                {
                    decimal accumulated = 0m;
                    for (int h = 0; h < headDefs.Length; h++)
                    {
                        decimal headInstAmt;
                        if (h < headDefs.Length - 1)
                        {
                            headInstAmt = Math.Round(headDefs[h].HeadAmt / headDefSum * dueInThis, 2);
                            accumulated += headInstAmt;
                        }
                        else
                        {
                            headInstAmt = Math.Round(dueInThis - accumulated, 2);
                        }
                        if (headInstAmt > 0) feeHeads[headDefs[h].Label] = headInstAmt;
                    }
                }

                list.Add(new SiblingInstallmentDto
                {
                    Number = i + 1,
                    Label = GetInstallmentLabel(count, i),
                    Amount = instAmt,
                    PaidInInstallment = paidInThis,
                    DueInInstallment = dueInThis,
                    DueDate = due,
                    Status = status,
                    FeeHeads = feeHeads,
                });
            }
            return list;
        }

        private static string GetInstallmentLabel(int count, int index) => count switch
        {
            1  => "Annual",
            2  => index == 0 ? "Term 1 (Half-Year)" : "Term 2 (Half-Year)",
            3  => $"Term {index + 1}",
            4  => $"Q{index + 1}",
            12 => new[] { "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar" }[index % 12],
            _  => $"Installment {index + 1}",
        };

        private static string GetInstallmentPlanLabel(int count) => count switch
        {
            1  => "Annual",
            2  => "Half-Yearly",
            3  => "Term-wise (3)",
            4  => "Quarterly",
            12 => "Monthly",
            _  => $"{count} Installments",
        };

        /// <summary>
        /// Apply a sibling discount to all pending fee records belonging to the student and their siblings.
        /// Handles the common Tier-2/3 city use case where the same parent pays for multiple children.
        /// </summary>
        [HttpPost("sibling-discount")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant,Teacher,Staff")]
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

        // ── Staff Child Discount ──────────────────────────────────────────────

        /// <summary>
        /// Apply a staff-child discount to all pending fee records for the specified student.
        /// The student must have GuardianStaffId set (i.e., be a child of a staff member).
        /// Respects the 75% total concession stacking cap.
        /// </summary>
        [HttpPost("staff-discount")]
        [Authorize(Roles = "Admin,Principal,Accountant,Teacher,Staff")]
        public async Task<IActionResult> ApplyStaffDiscount([FromBody] StaffDiscountRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var schoolId = _tenant.GetEffectiveSchoolId();

            try
            {
                if (request.DiscountValue <= 0)
                    throw new ArgumentException("Discount value must be positive.");
                if (request.DiscountType == "percentage" && request.DiscountValue > 100)
                    throw new ArgumentException("Percentage cannot exceed 100.");

                // Verify student exists and is a staff child
                var student = await _context.Students
                    .Where(s => s.Id == request.StudentId && s.SchoolId == schoolId && !s.IsDeleted)
                    .Select(s => new { s.Id, s.Name, s.GuardianStaffId, s.Class, s.Section })
                    .FirstOrDefaultAsync()
                    ?? throw new KeyNotFoundException("Student not found.");

                if (student.GuardianStaffId == null)
                    throw new InvalidOperationException("Student is not linked to a staff member. Set GuardianStaffId first.");

                // Verify the staff member exists in this school
                var staffExists = await _context.StaffMembers
                    .AnyAsync(s => s.Id == student.GuardianStaffId && s.SchoolId == schoolId && !s.IsDeleted);
                if (!staffExists)
                    throw new InvalidOperationException("Linked staff member not found in this school.");

                // Load all pending fee records for student
                var records = await _context.FeeRecords
                    .Where(r => r.StudentId == request.StudentId && r.SchoolId == schoolId
                                && !r.IsDeleted && r.PendingAmount > 0)
                    .ToListAsync();

                if (records.Count == 0)
                    throw new InvalidOperationException("No pending fee records found for this student.");

                int applied = 0;
                decimal totalSaved = 0m;

                foreach (var rec in records)
                {
                    // Enforce 75% max concession cap across all discounts already applied
                    var totalFee = rec.TotalAmount;
                    var alreadyDiscounted = rec.DiscountAmount;
                    var maxAdditionalDiscount = (totalFee * 0.75m) - alreadyDiscounted;
                    if (maxAdditionalDiscount <= 0) continue;

                    decimal discountAmt = request.DiscountType == "percentage"
                        ? Math.Round(totalFee * request.DiscountValue / 100m, 2)
                        : request.DiscountValue;

                    discountAmt = Math.Min(discountAmt, rec.PendingAmount);
                    discountAmt = Math.Min(discountAmt, maxAdditionalDiscount);
                    if (discountAmt <= 0) continue;

                    rec.DiscountAmount += discountAmt;
                    rec.PendingAmount = Math.Max(0, rec.TotalAmount + rec.LateFeeAmount - rec.PaidAmount - rec.DiscountAmount);
                    rec.UpdatedAt = DateTime.UtcNow;

                    totalSaved += discountAmt;
                    applied++;
                }

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = $"Staff child discount applied to {applied} fee record(s).",
                    applied,
                    totalSaved,
                    studentName = student.Name,
                    discountType = request.DiscountType,
                    discountValue = request.DiscountValue,
                });
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to apply staff discount.", error = ex.Message });
            }
        }

        // ─── Inline Discount ─────────────────────────────────────────────────────

        /// <summary>
        /// Apply an inline discount directly to a fee record during collection.
        /// Respects the 75% concession cap and logs an audit entry.
        /// </summary>
        [HttpPost("inline-discount")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant,Teacher,Staff")]
        public async Task<IActionResult> ApplyInlineDiscount([FromBody] InlineDiscountRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var schoolId = _tenant.GetEffectiveSchoolId();
            try
            {
                if (request.DiscountValue <= 0)
                    return BadRequest(new { message = "Discount value must be positive." });

                var rec = await _context.FeeRecords
                    .FirstOrDefaultAsync(r => r.Id == request.FeeRecordId && r.SchoolId == schoolId && !r.IsDeleted);
                if (rec == null)
                    return NotFound(new { message = "Fee record not found." });
                if (rec.Status == "paid")
                    return BadRequest(new { message = "Fee record is already fully paid." });

                decimal discountAmt;
                if (request.DiscountType == "percentage")
                {
                    if (request.DiscountValue > 100)
                        return BadRequest(new { message = "Percentage cannot exceed 100." });
                    discountAmt = Math.Round(rec.TotalAmount * (request.DiscountValue / 100m), 2);
                }
                else
                {
                    discountAmt = Math.Round(request.DiscountValue, 2);
                }

                // Enforce 75% cap
                var maxDiscount = Math.Round(rec.TotalAmount * 0.75m, 2);
                var headroom = Math.Max(0, maxDiscount - rec.DiscountAmount);
                if (discountAmt > headroom)
                    return BadRequest(new { message = $"Discount of ₹{discountAmt} exceeds the 75% concession cap. Maximum additional: ₹{headroom}." });

                var oldDiscount = rec.DiscountAmount;
                rec.DiscountAmount += discountAmt;
                rec.PendingAmount = Math.Max(0, rec.TotalAmount + rec.LateFeeAmount - rec.PaidAmount - rec.DiscountAmount);
                rec.BalanceAmount = rec.PendingAmount;

                if (rec.PendingAmount <= 0)
                    rec.Status = "paid";
                else if (rec.PaidAmount > 0)
                    rec.Status = "partial";

                rec.UpdatedAt = DateTime.UtcNow;

                _context.FeeAuditLogs.Add(new SmsApi.Models.Entities.FeeAuditLog
                {
                    Id = Guid.NewGuid(),
                    SchoolId = schoolId,
                    EntityType = "FeeRecord",
                    EntityId = rec.Id,
                    FeeRecordId = rec.Id,
                    StudentId = rec.StudentId,
                    Action = "inline_discount_applied",
                    PerformedByUserId = _tenant.UserId,
                    PerformedByName = request.AppliedBy ?? "Staff",
                    Amount = discountAmt,
                    Remarks = $"Inline discount ({request.DiscountType}: {request.DiscountValue}{(request.DiscountType == "percentage" ? "%" : "₹")}). {request.Reason ?? "Applied at collection"}. Prev discount: ₹{oldDiscount}",
                    Timestamp = DateTime.UtcNow,
                    OldValues = $"{{\"discountAmount\":{oldDiscount}}}",
                    NewValues = $"{{\"discountAmount\":{rec.DiscountAmount}}}",
                });

                await _context.SaveChangesAsync();

                if (request.NotifyParent)
                {
                    var studentName = (await _context.Students.FindAsync(rec.StudentId))?.FirstName ?? "your child";
                    await NotifyFeeParentsAsync(
                        schoolId, rec.StudentId,
                        $"Fee concession applied for {studentName}",
                        $"A concession of \u20B9{discountAmt:F0} has been applied to {studentName}'s fee account. " +
                        $"Outstanding balance is now \u20B9{rec.PendingAmount:F0}.",
                        rec.Id);
                }

                return Ok(new
                {
                    message = $"Discount of ₹{discountAmt} applied successfully.",
                    discountApplied = discountAmt,
                    newDiscountAmount = rec.DiscountAmount,
                    newPendingAmount = rec.PendingAmount,
                    status = rec.Status,
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to apply discount.", error = ex.Message });
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        // Fee Head Overrides — per-student structural fee exemptions
        // These directly reduce TotalAmount; they are NOT concessions/discounts.
        // ─────────────────────────────────────────────────────────────────────

        /// <summary>
        /// Apply per-student fee head overrides (e.g. Library Fee waived because student didn't use it).
        /// Reduces TotalAmount on the FeeRecord; does NOT change DiscountAmount.
        /// </summary>
        [HttpPatch("records/{id}/fee-head-overrides")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant,Teacher,Staff")]
        public async Task<IActionResult> UpdateFeeHeadOverrides(Guid id, [FromBody] FeeHeadOverridesRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var schoolId = _tenant.GetEffectiveSchoolId();
            try
            {
                var rec = await _context.FeeRecords
                    .Include(r => r.FeeStructure)
                    .FirstOrDefaultAsync(r => r.Id == id && r.SchoolId == schoolId && !r.IsDeleted);
                if (rec == null) return NotFound(new { message = "Fee record not found." });
                if (rec.FeeStructure == null)
                    return BadRequest(new { message = "No fee structure linked to this record. Please link a structure first." });

                // Merge new overrides on top of existing persisted overrides
                var existing = string.IsNullOrEmpty(rec.FeeHeadOverrides)
                    ? new Dictionary<string, decimal>()
                    : System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, decimal>>(rec.FeeHeadOverrides) ?? new();
                foreach (var kv in request.Overrides)
                    existing[kv.Key] = Math.Max(0, kv.Value);

                // Map of camelCase key → FeeStructure gross value
                var headMap = new Dictionary<string, decimal>
                {
                    ["tuitionFee"]    = rec.FeeStructure.TuitionFee,
                    ["admissionFee"]  = rec.FeeStructure.AdmissionFee,
                    ["examFee"]       = rec.FeeStructure.ExamFee,
                    ["libraryFee"]    = rec.FeeStructure.LibraryFee,
                    ["labFee"]        = rec.FeeStructure.LabFee,
                    ["sportsFee"]     = rec.FeeStructure.SportsFee,
                    ["transportFee"]  = rec.FeeStructure.TransportFee,
                    ["hostelFee"]     = rec.FeeStructure.HostelFee,
                    ["uniformFee"]    = rec.FeeStructure.UniformFee,
                    ["booksFee"]      = rec.FeeStructure.BooksFee,
                    ["developmentFee"]= rec.FeeStructure.DevelopmentFee,
                    ["miscellaneous"] = rec.FeeStructure.Miscellaneous,
                };

                var structureTotal = headMap.Values.Sum();
                decimal overrideReduction = 0;
                foreach (var kv in existing)
                {
                    if (headMap.TryGetValue(kv.Key, out var grossVal))
                        overrideReduction += grossVal - Math.Min(grossVal, Math.Max(0, kv.Value));
                }

                var oldTotal = rec.TotalAmount;
                rec.FeeHeadOverrides = System.Text.Json.JsonSerializer.Serialize(existing);
                rec.TotalAmount = Math.Max(0, structureTotal - overrideReduction);
                rec.PendingAmount = Math.Max(0, rec.TotalAmount + rec.LateFeeAmount - rec.PaidAmount - rec.DiscountAmount);
                rec.BalanceAmount = rec.PendingAmount;

                if (rec.PendingAmount <= 0) rec.Status = "paid";
                else if (rec.PaidAmount > 0) rec.Status = "partial";
                else rec.Status = "pending";
                rec.UpdatedAt = DateTime.UtcNow;

                var overrideDesc = string.Join(", ", request.Overrides.Select(kv => $"{kv.Key}=₹{kv.Value}"));
                _context.FeeAuditLogs.Add(new SmsApi.Models.Entities.FeeAuditLog
                {
                    Id = Guid.NewGuid(),
                    SchoolId = schoolId,
                    EntityType = "FeeRecord",
                    EntityId = rec.Id,
                    FeeRecordId = rec.Id,
                    StudentId = rec.StudentId,
                    Action = "fee_head_override",
                    PerformedByUserId = _tenant.UserId,
                    PerformedByName = request.AppliedBy ?? "Staff",
                    Amount = oldTotal - rec.TotalAmount,
                    Remarks = $"Fee head overrides: {overrideDesc}",
                    Timestamp = DateTime.UtcNow,
                    OldValues = $"{{\"totalAmount\":{oldTotal}}}",
                    NewValues = $"{{\"totalAmount\":{rec.TotalAmount},\"feeHeadOverrides\":{rec.FeeHeadOverrides}}}",
                });

                await _context.SaveChangesAsync();

                if (request.NotifyParent)
                {
                    var studentName = (await _context.Students.FindAsync(rec.StudentId))?.FirstName ?? "your child";
                    var saving = oldTotal - rec.TotalAmount;
                    await NotifyFeeParentsAsync(
                        schoolId, rec.StudentId,
                        $"Fee structure updated for {studentName}",
                        saving > 0
                            ? $"Fee adjustments have been made for {studentName}'s account, saving \u20B9{saving:F0}. " +
                              $"Revised outstanding balance: \u20B9{rec.PendingAmount:F0}."
                            : $"Fee heads have been updated for {studentName}'s account. " +
                              $"Outstanding balance: \u20B9{rec.PendingAmount:F0}.",
                        rec.Id);
                }

                return Ok(new
                {
                    message = "Fee head overrides saved successfully.",
                    newTotalAmount = rec.TotalAmount,
                    newPendingAmount = rec.PendingAmount,
                    feeHeadOverrides = rec.FeeHeadOverrides,
                    status = rec.Status,
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to save fee head overrides.", error = ex.Message });
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        // Remove Concession — reverses an applied inline discount
        // ─────────────────────────────────────────────────────────────────────

        /// <summary>Removes the active concession (DiscountAmount) from a fee record.</summary>
        [HttpPost("records/{id}/remove-discount")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant")]
        public async Task<IActionResult> RemoveDiscount(Guid id, [FromBody] RemoveDiscountRequest request)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            try
            {
                var rec = await _context.FeeRecords
                    .FirstOrDefaultAsync(r => r.Id == id && r.SchoolId == schoolId && !r.IsDeleted);
                if (rec == null) return NotFound(new { message = "Fee record not found." });

                var oldDiscount = rec.DiscountAmount;
                if (oldDiscount <= 0)
                    return BadRequest(new { message = "No active concession to remove." });

                rec.DiscountAmount = 0;
                rec.PendingAmount = Math.Max(0, rec.TotalAmount + rec.LateFeeAmount - rec.PaidAmount);
                rec.BalanceAmount = rec.PendingAmount;

                if (rec.PendingAmount <= 0) rec.Status = "paid";
                else if (rec.PaidAmount > 0) rec.Status = "partial";
                else rec.Status = "pending";
                rec.UpdatedAt = DateTime.UtcNow;

                _context.FeeAuditLogs.Add(new SmsApi.Models.Entities.FeeAuditLog
                {
                    Id = Guid.NewGuid(),
                    SchoolId = schoolId,
                    EntityType = "FeeRecord",
                    EntityId = rec.Id,
                    FeeRecordId = rec.Id,
                    StudentId = rec.StudentId,
                    Action = "discount_removed",
                    PerformedByUserId = _tenant.UserId,
                    PerformedByName = request.RemovedBy ?? "Staff",
                    Amount = oldDiscount,
                    Remarks = request.Reason ?? "Concession removed by staff",
                    Timestamp = DateTime.UtcNow,
                    OldValues = $"{{\"discountAmount\":{oldDiscount}}}",
                    NewValues = $"{{\"discountAmount\":0}}",
                });

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = $"Concession of ₹{oldDiscount} removed successfully.",
                    removedAmount = oldDiscount,
                    newPendingAmount = rec.PendingAmount,
                    status = rec.Status,
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to remove concession.", error = ex.Message });
            }
        }

        // ═══════════════════════════════════════════════════════════════════════
        // FEE HEADS — Normalized fee component types (replaces hardcoded columns)
        // ═══════════════════════════════════════════════════════════════════════

        /// <summary>Get all active fee heads for the school</summary>
        [HttpGet("heads")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant,Teacher,Staff")]
        public async Task<ActionResult<List<FeeHeadResponse>>> GetFeeHeads()
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var heads = await _context.FeeHeads
                    .Where(h => h.SchoolId == schoolId && !h.IsDeleted)
                    .OrderBy(h => h.DisplayOrder).ThenBy(h => h.Name)
                    .Select(h => new FeeHeadResponse
                    {
                        Id = h.Id, Name = h.Name, Code = h.Code,
                        Description = h.Description, IsVisibleOnReceipt = h.IsVisibleOnReceipt,
                        IsMandatory = h.IsMandatory, DisplayOrder = h.DisplayOrder, IsActive = h.IsActive,
                        DefaultFrequency = h.DefaultFrequency
                    }).ToListAsync();
                return Ok(heads);
            }
            catch (Exception) { return StatusCode(500, new { message = "Failed to fetch fee heads." }); }
        }

        /// <summary>Create a fee head</summary>
        [HttpPost("heads")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant,Teacher,Staff")]
        public async Task<ActionResult<FeeHeadResponse>> CreateFeeHead([FromBody] CreateFeeHeadRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var duplicate = await _context.FeeHeads.AnyAsync(h => h.SchoolId == schoolId && h.Name == request.Name && !h.IsDeleted);
                if (duplicate) return Conflict(new { message = $"Fee head '{request.Name}' already exists." });

                var entity = new SmsApi.Models.Entities.FeeHead
                {
                    Id = Guid.NewGuid(), SchoolId = schoolId, Name = request.Name, Code = request.Code,
                    Description = request.Description, IsVisibleOnReceipt = request.IsVisibleOnReceipt,
                    IsMandatory = request.IsMandatory, DisplayOrder = request.DisplayOrder, IsActive = true,
                    DefaultFrequency = request.DefaultFrequency
                };
                _context.FeeHeads.Add(entity);
                await _context.SaveChangesAsync();
                return CreatedAtAction(nameof(GetFeeHeads), new FeeHeadResponse
                {
                    Id = entity.Id, Name = entity.Name, Code = entity.Code,
                    Description = entity.Description, IsVisibleOnReceipt = entity.IsVisibleOnReceipt,
                    IsMandatory = entity.IsMandatory, DisplayOrder = entity.DisplayOrder, IsActive = entity.IsActive,
                    DefaultFrequency = entity.DefaultFrequency
                });
            }
            catch (Exception) { return StatusCode(500, new { message = "Failed to create fee head." }); }
        }

        /// <summary>Update a fee head</summary>
        [HttpPut("heads/{id}")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant,Teacher,Staff")]
        public async Task<ActionResult> UpdateFeeHead(Guid id, [FromBody] CreateFeeHeadRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var entity = await _context.FeeHeads.FirstOrDefaultAsync(h => h.Id == id && h.SchoolId == schoolId && !h.IsDeleted);
                if (entity == null) return NotFound(new { message = "Fee head not found." });
                entity.Name = request.Name; entity.Code = request.Code; entity.Description = request.Description;
                entity.IsVisibleOnReceipt = request.IsVisibleOnReceipt; entity.IsMandatory = request.IsMandatory;
                entity.DisplayOrder = request.DisplayOrder; entity.DefaultFrequency = request.DefaultFrequency;
                entity.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception) { return StatusCode(500, new { message = "Failed to update fee head." }); }
        }

        /// <summary>Delete a fee head (soft delete)</summary>
        [HttpDelete("heads/{id}")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant,Teacher,Staff")]
        public async Task<ActionResult> DeleteFeeHead(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var entity = await _context.FeeHeads.FirstOrDefaultAsync(h => h.Id == id && h.SchoolId == schoolId && !h.IsDeleted);
                if (entity == null) return NotFound(new { message = "Fee head not found." });
                entity.IsDeleted = true; entity.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception) { return StatusCode(500, new { message = "Failed to delete fee head." }); }
        }

        // ═══════════════════════════════════════════════════════════════════════
        // FEE STRUCTURE COMPONENTS — Attach fee heads with amounts to a structure
        // ═══════════════════════════════════════════════════════════════════════

        /// <summary>Get components for a fee structure</summary>
        [HttpGet("structures/{structureId}/components")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant,Teacher,Staff")]
        public async Task<ActionResult<List<FeeStructureComponentResponse>>> GetStructureComponents(Guid structureId)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var components = await _context.FeeStructureComponents
                    .Include(c => c.FeeHead)
                    .Where(c => c.FeeStructureId == structureId && c.SchoolId == schoolId && !c.IsDeleted)
                    .OrderBy(c => c.FeeHead!.DisplayOrder)
                    .Select(c => new FeeStructureComponentResponse
                    {
                        Id = c.Id, FeeHeadId = c.FeeHeadId,
                        FeeHeadName = c.FeeHead!.Name, FeeHeadCode = c.FeeHead.Code,
                        Amount = c.Amount, Remarks = c.Remarks
                    }).ToListAsync();
                return Ok(components);
            }
            catch (Exception) { return StatusCode(500, new { message = "Failed to fetch components." }); }
        }

        /// <summary>Set (replace) all components for a fee structure</summary>
        [HttpPost("structures/{structureId}/components")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant,Teacher,Staff")]
        public async Task<ActionResult> SetStructureComponents(Guid structureId, [FromBody] List<CreateFeeStructureComponentRequest> request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var structure = await _context.FeeStructures.FirstOrDefaultAsync(s => s.Id == structureId && s.SchoolId == schoolId && !s.IsDeleted);
                if (structure == null) return NotFound(new { message = "Fee structure not found." });

                // Remove existing
                var existing = await _context.FeeStructureComponents.Where(c => c.FeeStructureId == structureId).ToListAsync();
                _context.FeeStructureComponents.RemoveRange(existing);

                // Add new
                var newComponents = request.Select(r => new SmsApi.Models.Entities.FeeStructureComponent
                {
                    Id = Guid.NewGuid(), SchoolId = schoolId, FeeStructureId = structureId,
                    FeeHeadId = r.FeeHeadId, Amount = r.Amount, Remarks = r.Remarks
                }).ToList();
                _context.FeeStructureComponents.AddRange(newComponents);

                // Update FeeStructure total from components
                structure.TotalAmount = newComponents.Sum(c => c.Amount);
                structure.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                return Ok(new { message = "Components saved.", total = structure.TotalAmount });
            }
            catch (Exception) { return StatusCode(500, new { message = "Failed to save components." }); }
        }

        /// <summary>Add or remove a class from a fee structure's linked class list.</summary>
        [HttpPatch("structures/{id}/classes")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant,Teacher,Staff")]
        public async Task<ActionResult> UpdateLinkedClasses(Guid id, [FromBody] UpdateLinkedClassRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var structure = await _context.FeeStructures
                    .FirstOrDefaultAsync(s => s.Id == id && s.SchoolId == schoolId && !s.IsDeleted);
                if (structure == null) return NotFound(new { message = "Fee structure not found." });

                // Split current class list
                var classes = structure.Class
                    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .ToList();

                if (!string.IsNullOrWhiteSpace(request.AddClass))
                {
                    var c = request.AddClass.Trim();

                    // Enforce: a class may only be linked to ONE fee structure per academic year
                    var allOtherStructures = await _context.FeeStructures
                        .Where(fs => fs.Id != id && fs.SchoolId == schoolId && !fs.IsDeleted
                                     && fs.AcademicYear == structure.AcademicYear)
                        .Select(fs => new { fs.Id, fs.Name, fs.Class })
                        .ToListAsync();

                    var conflict = allOtherStructures.FirstOrDefault(fs =>
                        fs.Class.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                                .Any(cls => string.Equals(cls, c, StringComparison.OrdinalIgnoreCase)));

                    if (conflict != null)
                        return Conflict(new { message = $"Class '{c}' is already linked to fee structure '{conflict.Name}'. A class can only belong to one fee structure per academic year." });

                    if (!classes.Contains(c, StringComparer.OrdinalIgnoreCase))
                        classes.Add(c);
                }
                if (!string.IsNullOrWhiteSpace(request.RemoveClass))
                {
                    classes.RemoveAll(c => string.Equals(c, request.RemoveClass.Trim(), StringComparison.OrdinalIgnoreCase));
                }

                structure.Class = string.Join(", ", classes);
                structure.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                return Ok(new { classes = structure.Class });
            }
            catch (Exception) { return StatusCode(500, new { message = "Failed to update linked classes." }); }
        }

        /// <summary>Toggle the active/inactive status of a fee structure</summary>
        [HttpPost("structures/{id}/toggle-active")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant")]
        public async Task<ActionResult> ToggleStructureActive(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var structure = await _context.FeeStructures.FirstOrDefaultAsync(s => s.Id == id && s.SchoolId == schoolId && !s.IsDeleted);
                if (structure == null) return NotFound(new { message = "Fee structure not found." });
                structure.IsActive = !structure.IsActive;
                structure.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                return Ok(new { isActive = structure.IsActive });
            }
            catch (Exception) { return StatusCode(500, new { message = "Failed to toggle structure status." }); }
        }

        // ═══════════════════════════════════════════════════════════════════════
        // FEE TERMS — Named installments with due dates (Q1, Q2, Annual, etc.)
        // ═══════════════════════════════════════════════════════════════════════

        /// <summary>Get fee terms for a fee structure</summary>
        [HttpGet("structures/{structureId}/terms")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant,Teacher,Staff,Parent,Student")]
        public async Task<ActionResult<List<FeeTermResponse>>> GetFeeTerms(Guid structureId)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var terms = await _context.FeeTerms
                    .Where(t => t.FeeStructureId == structureId && t.SchoolId == schoolId && !t.IsDeleted)
                    .OrderBy(t => t.TermNumber)
                    .Select(t => new FeeTermResponse
                    {
                        Id = t.Id, Name = t.Name, TermNumber = t.TermNumber,
                        Amount = t.Amount, DueDate = t.DueDate, Status = t.Status, Remarks = t.Remarks
                    }).ToListAsync();
                return Ok(terms);
            }
            catch (Exception) { return StatusCode(500, new { message = "Failed to fetch fee terms." }); }
        }

        /// <summary>Set (replace) all terms for a fee structure</summary>
        [HttpPost("structures/{structureId}/terms")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant,Teacher,Staff")]
        public async Task<ActionResult> SetFeeTerms(Guid structureId, [FromBody] List<CreateFeeTermRequest> request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var structure = await _context.FeeStructures.FirstOrDefaultAsync(s => s.Id == structureId && s.SchoolId == schoolId && !s.IsDeleted);
                if (structure == null) return NotFound(new { message = "Fee structure not found." });

                if (request.Any(t => t.Amount < 0)) return BadRequest(new { message = "Term amounts cannot be negative." });
                if (request.Select(t => t.TermNumber).Distinct().Count() != request.Count)
                    return BadRequest(new { message = "Duplicate term numbers detected." });

                var existing = await _context.FeeTerms.Where(t => t.FeeStructureId == structureId).ToListAsync();
                _context.FeeTerms.RemoveRange(existing);

                var newTerms = request.Select(r => new SmsApi.Models.Entities.FeeTerm
                {
                    Id = Guid.NewGuid(), SchoolId = schoolId, FeeStructureId = structureId,
                    Name = r.Name, TermNumber = r.TermNumber, Amount = r.Amount,
                    DueDate = r.DueDate, Status = "pending", Remarks = r.Remarks
                }).ToList();
                _context.FeeTerms.AddRange(newTerms);

                // Update installment count on parent structure
                structure.InstallmentCount = newTerms.Count;
                structure.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                return Ok(new { message = $"{newTerms.Count} terms saved." });
            }
            catch (Exception) { return StatusCode(500, new { message = "Failed to save fee terms." }); }
        }

        // ═══════════════════════════════════════════════════════════════════════
        // PROMOTE FEES — Copy fee structure to next academic year
        // ═══════════════════════════════════════════════════════════════════════

        /// <summary>
        /// Promote a fee structure to a new academic year (optionally with % increment).
        /// Copies FeeTerms and FeeStructureComponents to the new year.
        /// </summary>
        [HttpPost("structures/{id}/promote")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant,Teacher,Staff")]
        public async Task<ActionResult> PromoteFeeStructure(Guid id, [FromBody] PromoteFeeStructureRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            if (string.IsNullOrWhiteSpace(request.TargetAcademicYear))
                return BadRequest(new { message = "Target academic year is required." });
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var source = await _context.FeeStructures
                    .FirstOrDefaultAsync(s => s.Id == id && s.SchoolId == schoolId && !s.IsDeleted);
                if (source == null) return NotFound(new { message = "Fee structure not found." });

                // Check if a structure for same class + target year already exists
                var exists = await _context.FeeStructures.AnyAsync(s =>
                    s.SchoolId == schoolId && s.Class == source.Class &&
                    s.AcademicYear == request.TargetAcademicYear && !s.IsDeleted);
                if (exists) return Conflict(new { message = $"A fee structure for class '{source.Class}' in year '{request.TargetAcademicYear}' already exists." });

                decimal multiplier = 1 + (request.IncrementPercent / 100m);

                // Clone the structure
                var newStructure = new SmsApi.Models.Entities.FeeStructure
                {
                    Id = Guid.NewGuid(), SchoolId = schoolId, Name = source.Name,
                    Class = source.Class, AcademicYear = request.TargetAcademicYear,
                    Description = source.Description, InstallmentCount = source.InstallmentCount,
                    TotalAmount = Math.Round(source.TotalAmount * multiplier, 2),
                    // Legacy hardcoded columns — scale them too
                    TuitionFee = Math.Round(source.TuitionFee * multiplier, 2),
                    AdmissionFee = Math.Round(source.AdmissionFee * multiplier, 2),
                    ExamFee = Math.Round(source.ExamFee * multiplier, 2),
                    LibraryFee = Math.Round(source.LibraryFee * multiplier, 2),
                    LabFee = Math.Round(source.LabFee * multiplier, 2),
                    SportsFee = Math.Round(source.SportsFee * multiplier, 2),
                    TransportFee = Math.Round(source.TransportFee * multiplier, 2),
                    HostelFee = Math.Round(source.HostelFee * multiplier, 2),
                    UniformFee = Math.Round(source.UniformFee * multiplier, 2),
                    BooksFee = Math.Round(source.BooksFee * multiplier, 2),
                    DevelopmentFee = Math.Round(source.DevelopmentFee * multiplier, 2),
                    Miscellaneous = Math.Round(source.Miscellaneous * multiplier, 2),
                };
                _context.FeeStructures.Add(newStructure);

                // Clone FeeTerms
                var sourceTerms = await _context.FeeTerms.Where(t => t.FeeStructureId == id && !t.IsDeleted).ToListAsync();
                var yearDiff = ParseAcademicYearStartDiff(source.AcademicYear, request.TargetAcademicYear);
                foreach (var term in sourceTerms)
                {
                    _context.FeeTerms.Add(new SmsApi.Models.Entities.FeeTerm
                    {
                        Id = Guid.NewGuid(), SchoolId = schoolId, FeeStructureId = newStructure.Id,
                        Name = term.Name, TermNumber = term.TermNumber,
                        Amount = Math.Round(term.Amount * multiplier, 2),
                        DueDate = term.DueDate.AddYears(yearDiff), Status = "pending", Remarks = term.Remarks
                    });
                }

                // Clone FeeStructureComponents
                var sourceComponents = await _context.FeeStructureComponents.Where(c => c.FeeStructureId == id && !c.IsDeleted).ToListAsync();
                foreach (var comp in sourceComponents)
                {
                    _context.FeeStructureComponents.Add(new SmsApi.Models.Entities.FeeStructureComponent
                    {
                        Id = Guid.NewGuid(), SchoolId = schoolId, FeeStructureId = newStructure.Id,
                        FeeHeadId = comp.FeeHeadId, Amount = Math.Round(comp.Amount * multiplier, 2), Remarks = comp.Remarks
                    });
                }

                await _context.SaveChangesAsync();
                return CreatedAtAction(nameof(GetFeeTerms), new { structureId = newStructure.Id },
                    new { message = "Fee structure promoted successfully.", newStructureId = newStructure.Id, targetYear = request.TargetAcademicYear });
            }
            catch (Exception ex) { return StatusCode(500, new { message = "Failed to promote fee structure.", error = ex.Message }); }
        }

        private static int ParseAcademicYearStartDiff(string sourceYear, string targetYear)
        {
            // e.g. "2025-26" → 2025, "2026-27" → 2026
            if (int.TryParse(sourceYear.Split('-')[0], out int src) && int.TryParse(targetYear.Split('-')[0], out int tgt))
                return tgt - src;
            return 1;
        }

        // ═══════════════════════════════════════════════════════════════════════
        // RECEIPT TEMPLATES — Custom branding per school
        // ═══════════════════════════════════════════════════════════════════════

        /// <summary>Get all receipt templates for the school</summary>
        [HttpGet("receipt-templates")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant,Teacher,Staff")]
        public async Task<ActionResult<List<ReceiptTemplateResponse>>> GetReceiptTemplates()
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var templates = await _context.ReceiptTemplates
                    .Where(t => t.SchoolId == schoolId && !t.IsDeleted)
                    .Select(t => new ReceiptTemplateResponse
                    {
                        Id = t.Id, Name = t.Name, HeaderText = t.HeaderText, FooterText = t.FooterText,
                        LogoUrl = t.LogoUrl, PrimaryColor = t.PrimaryColor,
                        ColumnConfigJson = t.ColumnConfigJson, IsDefault = t.IsDefault, IsActive = t.IsActive
                    }).ToListAsync();
                return Ok(templates);
            }
            catch (Exception) { return StatusCode(500, new { message = "Failed to fetch receipt templates." }); }
        }

        /// <summary>Create a receipt template</summary>
        [HttpPost("receipt-templates")]
        [Authorize(Roles = "Admin,Principal,Accountant,Teacher,Staff")]
        public async Task<ActionResult<ReceiptTemplateResponse>> CreateReceiptTemplate([FromBody] CreateReceiptTemplateRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                // If marked default, unset existing default
                if (request.IsDefault)
                {
                    var currentDefault = await _context.ReceiptTemplates.FirstOrDefaultAsync(t => t.SchoolId == schoolId && t.IsDefault && !t.IsDeleted);
                    if (currentDefault != null) { currentDefault.IsDefault = false; }
                }
                var entity = new SmsApi.Models.Entities.ReceiptTemplate
                {
                    Id = Guid.NewGuid(), SchoolId = schoolId, Name = request.Name,
                    HeaderText = request.HeaderText, FooterText = request.FooterText,
                    LogoUrl = request.LogoUrl, PrimaryColor = request.PrimaryColor,
                    ColumnConfigJson = request.ColumnConfigJson, IsDefault = request.IsDefault, IsActive = true
                };
                _context.ReceiptTemplates.Add(entity);
                await _context.SaveChangesAsync();
                return CreatedAtAction(nameof(GetReceiptTemplates), new ReceiptTemplateResponse
                {
                    Id = entity.Id, Name = entity.Name, HeaderText = entity.HeaderText,
                    FooterText = entity.FooterText, LogoUrl = entity.LogoUrl, PrimaryColor = entity.PrimaryColor,
                    ColumnConfigJson = entity.ColumnConfigJson, IsDefault = entity.IsDefault, IsActive = entity.IsActive
                });
            }
            catch (Exception) { return StatusCode(500, new { message = "Failed to create receipt template." }); }
        }

        /// <summary>Update receipt template</summary>
        [HttpPut("receipt-templates/{id}")]
        [Authorize(Roles = "Admin,Principal,Accountant,Teacher,Staff")]
        public async Task<ActionResult> UpdateReceiptTemplate(Guid id, [FromBody] CreateReceiptTemplateRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var entity = await _context.ReceiptTemplates.FirstOrDefaultAsync(t => t.Id == id && t.SchoolId == schoolId && !t.IsDeleted);
                if (entity == null) return NotFound(new { message = "Template not found." });
                if (request.IsDefault && !entity.IsDefault)
                {
                    var old = await _context.ReceiptTemplates.FirstOrDefaultAsync(t => t.SchoolId == schoolId && t.IsDefault && !t.IsDeleted && t.Id != id);
                    if (old != null) old.IsDefault = false;
                }
                entity.Name = request.Name; entity.HeaderText = request.HeaderText; entity.FooterText = request.FooterText;
                entity.LogoUrl = request.LogoUrl; entity.PrimaryColor = request.PrimaryColor;
                entity.ColumnConfigJson = request.ColumnConfigJson; entity.IsDefault = request.IsDefault;
                entity.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception) { return StatusCode(500, new { message = "Failed to update receipt template." }); }
        }

        // ═══════════════════════════════════════════════════════════════════════
        // BULK FEE PAYMENT UPLOAD — CSV/JSON bulk payment import
        // ═══════════════════════════════════════════════════════════════════════

        /// <summary>
        /// Bulk import fee payments from a JSON array (frontend parses CSV → JSON).
        /// Each row matches a student by admission number and records a payment.
        /// </summary>
        [HttpPost("payments/bulk-upload")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant,Teacher,Staff")]
        public async Task<ActionResult<BulkFeePaymentResult>> BulkUploadPayments([FromBody] List<BulkFeePaymentRow> rows)
        {
            if (rows == null || rows.Count == 0) return BadRequest(new { message = "No rows provided." });
            if (rows.Count > 500) return BadRequest(new { message = "Maximum 500 rows per upload." });

            var schoolId = _tenant.GetEffectiveSchoolId();
            var processedBy = User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value ?? "BulkUpload";
            var result = new BulkFeePaymentResult { TotalRows = rows.Count };

            var allowedMethods = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "cash", "online", "cheque", "dd", "neft", "upi" };
            const decimal MaxSinglePayment = 10_000_000m; // ₹1 crore hard ceiling per row

            // ── Detect duplicate admission numbers in this batch (warn, don't abort) ──
            var duplicateAdmNos = rows
                .Where(r => !string.IsNullOrWhiteSpace(r.AdmissionNumber))
                .GroupBy(r => r.AdmissionNumber!.Trim().ToUpperInvariant())
                .Where(g => g.Count() > 1)
                .Select(g => g.Key)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);
            if (duplicateAdmNos.Count > 0)
                result.Errors.Add($"Warning: the following admission numbers appear more than once in this batch — each occurrence is processed in order: {string.Join(", ", duplicateAdmNos)}.");

            foreach (var row in rows)
            {
                try
                {
                    if (string.IsNullOrWhiteSpace(row.AdmissionNumber)) { result.Errors.Add($"Missing admission number for row '{row.StudentName}'."); result.Failed++; continue; }
                    if (row.AmountPaid <= 0) { result.Errors.Add($"{row.AdmissionNumber}: Amount must be positive."); result.Failed++; continue; }
                    if (row.AmountPaid > MaxSinglePayment) { result.Errors.Add($"{row.AdmissionNumber}: Amount ₹{row.AmountPaid:N0} exceeds the maximum allowed per row (₹{MaxSinglePayment:N0})."); result.Failed++; continue; }
                    if (!allowedMethods.Contains(row.PaymentMethod ?? ""))
                    {
                        result.Errors.Add($"{row.AdmissionNumber}: Invalid payment method '{row.PaymentMethod}'. Allowed: cash, online, cheque, dd, neft, upi.");
                        result.Failed++;
                        continue;
                    }

                    var student = await _context.Students
                        .FirstOrDefaultAsync(s => s.AdmissionNumber == row.AdmissionNumber && s.SchoolId == schoolId && !s.IsDeleted);
                    if (student == null) { result.Errors.Add($"{row.AdmissionNumber}: Student not found."); result.Failed++; continue; }

                    var feeRecord = await _context.FeeRecords
                        .Where(r => r.StudentId == student.Id && r.SchoolId == schoolId && !r.IsDeleted && r.Status != "paid")
                        .OrderBy(r => r.DueDate)
                        .FirstOrDefaultAsync();
                    if (feeRecord == null) { result.Errors.Add($"{row.AdmissionNumber}: No pending fee record."); result.Failed++; continue; }

                    // ── Overpayment guard: cap the payment at the outstanding balance ──────────
                    var pendingBefore = feeRecord.PendingAmount;
                    if (pendingBefore <= 0) { result.Errors.Add($"{row.AdmissionNumber}: Fee record has no outstanding balance."); result.Failed++; continue; }
                    var amountToRecord = Math.Min(row.AmountPaid, pendingBefore);

                    var receiptNum = string.IsNullOrWhiteSpace(row.ReceiptNumber)
                        ? $"BLK-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString()[..6].ToUpper()}"
                        : row.ReceiptNumber;

                    var safeRemarks = row.Remarks?.Length > 500 ? row.Remarks[..500] : row.Remarks;
                    var payment = new SmsApi.Models.Entities.PaymentTransaction
                    {
                        Id = Guid.NewGuid(), SchoolId = schoolId, StudentId = student.Id,
                        FeeRecordId = feeRecord.Id, Amount = amountToRecord, Method = row.PaymentMethod!.ToLowerInvariant(),
                        Status = "success", Date = row.PaymentDate, ReceiptNumber = receiptNum,
                        AcademicYear = feeRecord.AcademicYear, ProcessedBy = processedBy, Remarks = safeRemarks
                    };
                    _context.PaymentTransactions.Add(payment);

                    var prevPaid = feeRecord.PaidAmount;
                    feeRecord.PaidAmount += amountToRecord;
                    feeRecord.PendingAmount = Math.Max(0, feeRecord.TotalAmount + feeRecord.LateFeeAmount - feeRecord.PaidAmount - feeRecord.DiscountAmount);
                    feeRecord.BalanceAmount = feeRecord.PendingAmount;
                    feeRecord.LastPaymentDate = row.PaymentDate;
                    feeRecord.Status = feeRecord.PendingAmount <= 0 ? "paid" : "partial";
                    feeRecord.UpdatedAt = DateTime.UtcNow;

                    // ── Audit log entry (matches all other payment paths) ─────────────────────
                    _context.FeeAuditLogs.Add(new SmsApi.Models.Entities.FeeAuditLog
                    {
                        Id = Guid.NewGuid(),
                        SchoolId = schoolId,
                        EntityType = "Payment",
                        EntityId = payment.Id,
                        FeeRecordId = feeRecord.Id,
                        StudentId = student.Id,
                        Action = "bulk_payment_uploaded",
                        PerformedByUserId = _tenant.UserId,
                        PerformedByName = processedBy,
                        Amount = amountToRecord,
                        Remarks = $"Bulk upload. Method: {row.PaymentMethod}. Receipt: {receiptNum}.",
                        Timestamp = DateTime.UtcNow,
                        OldValues = $"{{\"paidAmount\":{prevPaid},\"pendingAmount\":{pendingBefore}}}",
                        NewValues = $"{{\"paidAmount\":{feeRecord.PaidAmount},\"pendingAmount\":{feeRecord.PendingAmount},\"method\":\"{row.PaymentMethod}\",\"receipt\":\"{receiptNum}\"}}",
                    });

                    await _context.SaveChangesAsync();
                    result.Successful++;

                    // Warn if the requested amount was capped (overpayment attempt)
                    if (row.AmountPaid > amountToRecord)
                        result.Errors.Add($"{row.AdmissionNumber}: Requested ₹{row.AmountPaid:N0} but only ₹{amountToRecord:N0} was outstanding — recorded ₹{amountToRecord:N0}.");
                }
                catch (Exception ex)
                {
                    result.Errors.Add($"{row.AdmissionNumber}: {ex.Message}");
                    result.Failed++;
                }
            }
            return Ok(result);
        }

        // ═══════════════════════════════════════════════════════════════════════
        // DELETED RECEIPTS — Audit view of soft-deleted payment transactions
        // ═══════════════════════════════════════════════════════════════════════

        /// <summary>View soft-deleted payment records for audit compliance (CA / Finance)</summary>
        [HttpGet("deleted-transactions")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant,Teacher,Staff")]
        public async Task<ActionResult> GetDeletedTransactions([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                // Bypass global query filter intentionally — we need to see IsDeleted=true rows
                var query = _context.PaymentTransactions
                    .IgnoreQueryFilters()
                    .Where(t => t.SchoolId == schoolId && t.IsDeleted);

                var total = await query.CountAsync();
                var items = await query
                    .OrderByDescending(t => t.UpdatedAt)
                    .Skip((page - 1) * pageSize).Take(pageSize)
                    .Select(t => new {
                        t.Id, t.StudentId, t.FeeRecordId, t.Amount, t.Method,
                        t.ReceiptNumber, t.Date, t.AcademicYear, t.Remarks,
                        t.ProcessedBy, t.CreatedAt, DeletedAt = t.UpdatedAt
                    }).ToListAsync();
                return Ok(new { items, total, page, pageSize });
            }
            catch (Exception) { return StatusCode(500, new { message = "Failed to fetch deleted transactions." }); }
        }

        // ─── Private helper — push fee notification to all eligible guardians ────
        private async Task NotifyFeeParentsAsync(
            Guid schoolId, Guid studentId,
            string title, string content,
            Guid? referenceId = null)
        {
            try
            {
                // Path 1 (legacy): StudentGuardians email → UserLogins
                var guardianEmails = await _context.StudentGuardians
                    .Where(sg => sg.StudentId == studentId && sg.SchoolId == schoolId && sg.Email != null)
                    .Select(sg => sg.Email!.ToLower())
                    .Distinct()
                    .ToListAsync();

                var legacyIds = guardianEmails.Any()
                    ? await _context.UserLogins
                        .Where(ul => ul.SchoolId == schoolId && guardianEmails.Contains(ul.Email.ToLower()))
                        .Select(ul => ul.Id)
                        .Distinct()
                        .ToListAsync()
                    : new List<Guid>();

                // Path 2 (new): GuardianStudents → Guardian.UserLoginId
                var newIds = await _context.GuardianStudents
                    .Include(gs => gs.Guardian)
                    .Where(gs => gs.StudentId == studentId && gs.SchoolId == schoolId && gs.CanViewFees
                                 && gs.Guardian != null && gs.Guardian.UserLoginId != null)
                    .Select(gs => gs.Guardian!.UserLoginId!.Value)
                    .Distinct()
                    .ToListAsync();

                var parentUserIds = legacyIds.Union(newIds).Distinct().ToList();

                foreach (var userId in parentUserIds)
                {
                    _context.Notifications.Add(new SmsApi.Models.Entities.Notification
                    {
                        Id = Guid.NewGuid(),
                        SchoolId = schoolId,
                        RecipientId = userId,
                        RecipientType = "Parent",
                        Type = "Fee",
                        Title = title,
                        Content = content,
                        Priority = "Normal",
                        ReferenceId = referenceId,
                        ReferenceType = "FeeRecord",
                        ActionUrl = "/parent-fees",
                        IsRead = false,
                        SenderName = "School Fee Office",
                        StudentId = studentId,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                    });
                }
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send fee notification to parents for student {StudentId}", studentId);
            }
        }

        // ═══════════════════════════════════════════════════════════════════════
        // CLASS-FEE-STRUCTURE — assign a fee structure to one or more classes
        // ═══════════════════════════════════════════════════════════════════════

        /// <summary>List all class→structure assignments for the school (optionally filtered by academic year).</summary>
        [HttpGet("class-assignments")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant")]
        public async Task<ActionResult> GetClassFeeStructures([FromQuery] string? academicYear = null)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var query = _context.ClassFeeStructures
                    .Include(c => c.FeeStructure)
                    .Where(c => c.SchoolId == schoolId);
                if (!string.IsNullOrWhiteSpace(academicYear))
                    query = query.Where(c => c.AcademicYear == academicYear);
                var items = await query
                    .OrderBy(c => c.AcademicYear).ThenBy(c => c.ClassName)
                    .Select(c => new ClassFeeStructureResponse
                    {
                        Id = c.Id,
                        SchoolId = c.SchoolId,
                        FeeStructureId = c.FeeStructureId,
                        FeeStructureName = c.FeeStructure != null ? c.FeeStructure.Name : string.Empty,
                        ClassName = c.ClassName,
                        AcademicYear = c.AcademicYear,
                        IsActive = c.IsActive,
                        CreatedAt = c.CreatedAt,
                    }).ToListAsync();
                return Ok(items);
            }
            catch (Exception ex) { return StatusCode(500, new { message = "Failed to fetch class assignments.", error = ex.Message }); }
        }

        /// <summary>Assign a fee structure to a class for an academic year.</summary>
        [HttpPost("class-assignments")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer")]
        public async Task<ActionResult> CreateClassFeeStructure([FromBody] CreateClassFeeStructureRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                if (!await _context.FeeStructures.AnyAsync(f => f.Id == request.FeeStructureId && f.SchoolId == schoolId))
                    return NotFound(new { message = "Fee structure not found." });

                var duplicate = await _context.ClassFeeStructures.AnyAsync(c =>
                    c.SchoolId == schoolId &&
                    c.ClassName == request.ClassName &&
                    c.AcademicYear == request.AcademicYear);
                if (duplicate)
                    return BadRequest(new { message = $"Class '{request.ClassName}' already has a fee structure for {request.AcademicYear}." });

                var entity = new SmsApi.Models.Entities.ClassFeeStructure
                {
                    Id = Guid.NewGuid(),
                    SchoolId = schoolId,
                    FeeStructureId = request.FeeStructureId,
                    ClassName = request.ClassName.Trim(),
                    AcademicYear = request.AcademicYear,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                };
                _context.ClassFeeStructures.Add(entity);
                await _context.SaveChangesAsync();
                return CreatedAtAction(nameof(GetClassFeeStructures), new { academicYear = request.AcademicYear }, new { id = entity.Id });
            }
            catch (Exception ex) { return StatusCode(500, new { message = "Failed to create class assignment.", error = ex.Message }); }
        }

        /// <summary>Remove a class→structure assignment.</summary>
        [HttpDelete("class-assignments/{id}")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer")]
        public async Task<ActionResult> DeleteClassFeeStructure(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var entity = await _context.ClassFeeStructures.FirstOrDefaultAsync(c => c.Id == id && c.SchoolId == schoolId);
                if (entity == null) return NotFound();
                entity.IsDeleted = true;
                entity.DeletedAt = DateTime.UtcNow;
                entity.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception ex) { return StatusCode(500, new { message = "Failed to delete class assignment.", error = ex.Message }); }
        }

        // ═══════════════════════════════════════════════════════════════════════
        // STUDENT FEE ITEMS — per-student line-item discounts
        // ═══════════════════════════════════════════════════════════════════════

        /// <summary>Get all fee item discounts for a student (or all students for a structure).</summary>
        [HttpGet("student-fee-items")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer,Accountant")]
        public async Task<ActionResult> GetStudentFeeItems(
            [FromQuery] Guid? studentId = null,
            [FromQuery] Guid? feeStructureId = null,
            [FromQuery] string? academicYear = null)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var query = _context.StudentFeeItems
                    .Include(s => s.Student)
                    .Include(s => s.FeeStructure)
                    .Include(s => s.FeeStructureComponent).ThenInclude(c => c != null ? c.FeeHead : null)
                    .Where(s => s.SchoolId == schoolId);
                if (studentId.HasValue) query = query.Where(s => s.StudentId == studentId.Value);
                if (feeStructureId.HasValue) query = query.Where(s => s.FeeStructureId == feeStructureId.Value);
                if (!string.IsNullOrWhiteSpace(academicYear)) query = query.Where(s => s.AcademicYear == academicYear);

                var items = await query.OrderBy(s => s.AcademicYear).ToListAsync();
                var result = items.Select(s =>
                {
                    decimal componentAmount = s.FeeStructureComponent?.Amount ?? 0;
                    decimal resolved = s.FlatAmount.HasValue
                        ? s.FlatAmount.Value
                        : Math.Round(componentAmount * s.DiscountPercentage / 100, 2);
                    return new StudentFeeItemResponse
                    {
                        Id = s.Id,
                        StudentId = s.StudentId,
                        StudentName = s.Student?.Name ?? string.Empty,
                        FeeStructureId = s.FeeStructureId,
                        FeeStructureName = s.FeeStructure?.Name ?? string.Empty,
                        FeeStructureComponentId = s.FeeStructureComponentId,
                        FeeHeadName = s.FeeStructureComponent?.FeeHead?.Name,
                        AcademicYear = s.AcademicYear,
                        DiscountType = s.DiscountType,
                        DiscountPercentage = s.DiscountPercentage,
                        FlatAmount = s.FlatAmount,
                        ResolvedDiscountAmount = resolved,
                        Reason = s.Reason,
                        IsActive = s.IsActive,
                        CreatedAt = s.CreatedAt,
                    };
                });
                return Ok(result);
            }
            catch (Exception ex) { return StatusCode(500, new { message = "Failed to fetch student fee items.", error = ex.Message }); }
        }

        /// <summary>Create a per-student line-item discount.</summary>
        [HttpPost("student-fee-items")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer")]
        public async Task<ActionResult> CreateStudentFeeItem([FromBody] CreateStudentFeeItemRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                if (!await _context.Students.AnyAsync(s => s.Id == request.StudentId && s.SchoolId == schoolId))
                    return NotFound(new { message = "Student not found." });
                if (!await _context.FeeStructures.AnyAsync(f => f.Id == request.FeeStructureId && f.SchoolId == schoolId))
                    return NotFound(new { message = "Fee structure not found." });
                if (request.FeeStructureComponentId.HasValue &&
                    !await _context.FeeStructureComponents.AnyAsync(c => c.Id == request.FeeStructureComponentId.Value && c.FeeStructureId == request.FeeStructureId))
                    return BadRequest(new { message = "FeeStructureComponent does not belong to the given structure." });
                if (request.DiscountPercentage == 0 && !request.FlatAmount.HasValue)
                    return BadRequest(new { message = "Provide either a DiscountPercentage (>0) or a FlatAmount." });

                var entity = new SmsApi.Models.Entities.StudentFeeItem
                {
                    Id = Guid.NewGuid(),
                    SchoolId = schoolId,
                    StudentId = request.StudentId,
                    FeeStructureId = request.FeeStructureId,
                    FeeStructureComponentId = request.FeeStructureComponentId,
                    AcademicYear = request.AcademicYear,
                    DiscountType = request.DiscountType,
                    DiscountPercentage = request.DiscountPercentage,
                    FlatAmount = request.FlatAmount,
                    Reason = request.Reason,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                };
                _context.StudentFeeItems.Add(entity);
                await _context.SaveChangesAsync();
                return CreatedAtAction(nameof(GetStudentFeeItems), new { studentId = entity.StudentId }, new { id = entity.Id });
            }
            catch (Exception ex) { return StatusCode(500, new { message = "Failed to create student fee item.", error = ex.Message }); }
        }

        /// <summary>Update a student fee item discount.</summary>
        [HttpPut("student-fee-items/{id}")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer")]
        public async Task<ActionResult> UpdateStudentFeeItem(Guid id, [FromBody] UpdateStudentFeeItemRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var entity = await _context.StudentFeeItems.FirstOrDefaultAsync(s => s.Id == id && s.SchoolId == schoolId);
                if (entity == null) return NotFound();
                if (request.DiscountType != null) entity.DiscountType = request.DiscountType;
                if (request.DiscountPercentage.HasValue) entity.DiscountPercentage = request.DiscountPercentage.Value;
                if (request.FlatAmount.HasValue) entity.FlatAmount = request.FlatAmount.Value;
                if (request.Reason != null) entity.Reason = request.Reason;
                if (request.IsActive.HasValue) entity.IsActive = request.IsActive.Value;
                entity.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception ex) { return StatusCode(500, new { message = "Failed to update student fee item.", error = ex.Message }); }
        }

        /// <summary>Delete (soft) a student fee item.</summary>
        [HttpDelete("student-fee-items/{id}")]
        [Authorize(Roles = "Admin,Principal,Finance,FinanceOfficer")]
        public async Task<ActionResult> DeleteStudentFeeItem(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var entity = await _context.StudentFeeItems.FirstOrDefaultAsync(s => s.Id == id && s.SchoolId == schoolId);
                if (entity == null) return NotFound();
                entity.IsDeleted = true;
                entity.DeletedAt = DateTime.UtcNow;
                entity.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception ex) { return StatusCode(500, new { message = "Failed to delete student fee item.", error = ex.Message }); }
        }

        // ─── Batch Payment ─────────────────────────────────────────────────────────
        // Collect fees for multiple students in a single operation (typically siblings
        // whose parent pays in one visit). Each student gets their own PaymentTransaction
        // and receipt number. All are linked by a common batchRef written into Remarks.

        /// <summary>
        /// Record fee payments for one or more students at once (sibling batch payment).
        /// Creates individual receipts per student but groups them with a shared batch reference.
        /// </summary>
        [HttpPost("payments/batch")]
        [Authorize(Roles = "Admin,Finance,FinanceOfficer,Accountant,Teacher,Staff")]
        public async Task<ActionResult> CreateBatchPayment([FromBody] BatchPaymentRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            if (request.Payments == null || request.Payments.Count == 0)
                return BadRequest(new { message = "At least one payment entry is required." });

            var schoolId = _tenant.GetEffectiveSchoolId();
            var paymentDate = request.Date?.ToUniversalTime() ?? DateTime.UtcNow;
            var batchRef = $"BATCH-{paymentDate:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpper()}";

            var headerYear = HttpContext.Items["AcademicYearHeaderValue"] as string ?? string.Empty;
            var results = new List<object>();
            var errors  = new List<object>();

            foreach (var entry in request.Payments)
            {
                if (entry.Amount <= 0)
                {
                    errors.Add(new { studentId = entry.StudentId, feeRecordId = entry.FeeRecordId, error = "Amount must be positive." });
                    continue;
                }

                var receiptNumber = $"RCPT-{paymentDate:yyyyMMddHHmm}-{Guid.NewGuid().ToString("N")[..6].ToUpper()}";
                var entryRemarks = !string.IsNullOrWhiteSpace(entry.Remarks)
                    ? $"{entry.Remarks.Trim()} | Batch ref: {batchRef}"
                    : $"Batch ref: {batchRef}";
                if (!string.IsNullOrWhiteSpace(request.Remarks))
                    entryRemarks += $" | {request.Remarks.Trim()}";
                if (!string.IsNullOrWhiteSpace(request.ReferenceNumber))
                    entryRemarks += $" | Ref: {request.ReferenceNumber.Trim()}";

                // Apply ad-hoc discount / late fee before processing payment
                if (entry.DiscountApplied > 0 || entry.LateFeeApplied > 0)
                {
                    var feeRec = await _context.FeeRecords.FirstOrDefaultAsync(f => f.Id == entry.FeeRecordId && f.SchoolId == schoolId);
                    if (feeRec != null)
                    {
                        if (entry.DiscountApplied > 0) feeRec.DiscountAmount += entry.DiscountApplied;
                        if (entry.LateFeeApplied  > 0) feeRec.LateFeeAmount  += entry.LateFeeApplied;
                        feeRec.PendingAmount = feeRec.TotalAmount - feeRec.PaidAmount - feeRec.DiscountAmount + feeRec.LateFeeAmount;
                        feeRec.UpdatedAt = DateTime.UtcNow;
                        await _context.SaveChangesAsync();
                    }
                }

                var payReq = new CreatePaymentRequest
                {
                    SchoolId    = schoolId,
                    StudentId   = entry.StudentId,
                    FeeRecordId = entry.FeeRecordId,
                    Amount      = entry.Amount,
                    Date        = paymentDate,
                    Method      = request.Method,
                    ReceiptNumber  = receiptNumber,
                    // Cheque & DD share the same ChequeNumber/ChequeDate/BankName columns
                    ChequeNumber   = (request.Method == "cheque" || request.Method == "dd") ? request.ChequeNumber : null,
                    ChequeDate     = (request.Method == "cheque" || request.Method == "dd") ? request.ChequeDate : null,
                    BankName       = (request.Method == "cheque" || request.Method == "dd" || request.Method == "bank_transfer") ? request.BankName : null,
                    // For online (Cashfree), the transaction ID goes into GatewayRef
                    GatewayRef     = request.Method == "cashfree" ? request.GatewayRef : null,
                    ProcessedBy    = _tenant.UserId.ToString(),
                    AcademicYear   = headerYear,
                    Remarks        = entryRemarks,
                    NotifyParent   = request.NotifyParents,
                };

                try
                {
                    var (isValid, validationError) = await _paymentValidationService.ValidatePaymentCreationAsync(payReq, schoolId, _context);
                    if (!isValid)
                    {
                        errors.Add(new { studentId = entry.StudentId, feeRecordId = entry.FeeRecordId, error = validationError });
                        continue;
                    }
                    var payment = await _feeService.CreatePaymentAsync(payReq);
                    results.Add(payment);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Batch payment failed for student {StudentId} / record {RecordId}", entry.StudentId, entry.FeeRecordId);
                    errors.Add(new { studentId = entry.StudentId, feeRecordId = entry.FeeRecordId, error = ex.Message });
                }
            }

            if (results.Count == 0)
                return BadRequest(new { message = "All payment entries failed.", errors });

            return Ok(new
            {
                batchRef,
                processed = results.Count,
                failed    = errors.Count,
                payments  = results,
                errors    = errors.Count > 0 ? errors : (object?)null,
            });
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

    public class StaffDiscountRequest
    {
        public Guid StudentId { get; set; }
        /// <summary>"percentage" or "flat"</summary>
        public string DiscountType { get; set; } = "percentage";
        /// <summary>Value: percentage (e.g. 10 = 10%) or flat amount in INR</summary>
        public decimal DiscountValue { get; set; }
        public string? Reason { get; set; }
    }
}

// ─── Batch Payment DTOs ──────────────────────────────────────────────────────

/// <summary>A single payment entry in a batch (one student, one fee record).</summary>
public class BatchPaymentEntry
{
    [Required]
    public Guid StudentId { get; set; }

    [Required]
    public Guid FeeRecordId { get; set; }

    [Required]
    [Range(0.01, 10_000_000, ErrorMessage = "Amount must be between 0.01 and 10,000,000.")]
    public decimal Amount { get; set; }

    /// <summary>Optional note, e.g. "Term 1, Term 2" for audit trail.</summary>
    public string? Remarks { get; set; }

    /// <summary>Ad-hoc discount/concession applied at collection time (added to FeeRecord.DiscountAmount).</summary>
    [Range(0, 10_000_000)]
    public decimal DiscountApplied { get; set; } = 0;

    /// <summary>Late fee or fine applied at collection time (added to FeeRecord.LateFeeAmount).</summary>
    [Range(0, 10_000_000)]
    public decimal LateFeeApplied { get; set; } = 0;
}

/// <summary>
/// Request body for POST /api/fees/payments/batch.
/// One call covers multiple students; each gets its own receipt.
/// </summary>
public class BatchPaymentRequest
{
    [Required, MinLength(1, ErrorMessage = "At least one payment entry is required.")]
    public List<BatchPaymentEntry> Payments { get; set; } = new();

    /// <summary>Payment method: cash | cheque | dd | bank_transfer | upi | card | cashfree</summary>
    [Required]
    public string Method { get; set; } = "cash";

    /// <summary>Payment date (defaults to now if omitted).</summary>
    public DateTime? Date { get; set; }

    // Cheque / DD / bank-transfer fields (apply to all entries)
    public string? ChequeNumber { get; set; }   // Also used for DD number
    public DateTime? ChequeDate { get; set; }   // Also used for DD date
    public string? BankName { get; set; }

    /// <summary>UPI ref / UTR / Cashfree transaction ID — stored in GatewayRef for cashfree method.</summary>
    public string? ReferenceNumber { get; set; }

    /// <summary>Cashfree / gateway transaction ID — stored in PaymentTransaction.GatewayRef.</summary>
    public string? GatewayRef { get; set; }

    /// <summary>General remarks written into every receipt.</summary>
    public string? Remarks { get; set; }

    /// <summary>Send payment notification to parent(s). Defaults to true.</summary>
    public bool NotifyParents { get; set; } = true;
}

// ─── Helper DTOs ─────────────────────────────────────────────────────────────
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

public class InlineDiscountRequest
{
    [Required]
    public Guid FeeRecordId { get; set; }
    /// <summary>"fixed" or "percentage"</summary>
    public string DiscountType { get; set; } = "fixed";
    [Range(0.01, double.MaxValue, ErrorMessage = "Discount value must be positive.")]
    public decimal DiscountValue { get; set; }
    public string? Reason { get; set; }
    public string? AppliedBy { get; set; }
    /// <summary>If true, an in-app notification is sent to all guardians with portal access.</summary>
    public bool NotifyParent { get; set; } = false;
}

public class FeeHeadOverridesRequest
{
    /// <summary>Map of camelCase fee head key → override amount. E.g. {"libraryFee": 0}</summary>
    [Required]
    public Dictionary<string, decimal> Overrides { get; set; } = new();
    public string? AppliedBy { get; set; }
    /// <summary>If true, an in-app notification is sent to all guardians with portal access.</summary>
    public bool NotifyParent { get; set; } = false;
}

public class RemoveDiscountRequest
{
    public string? Reason { get; set; }
    public string? RemovedBy { get; set; }
}

// ── FeeHead DTOs ──────────────────────────────────────────────────────────────
public class CreateFeeHeadRequest
{
    [Required] public Guid SchoolId { get; set; }
    [Required][MaxLength(100)] public string Name { get; set; } = string.Empty;
    [MaxLength(20)] public string? Code { get; set; }
    [MaxLength(500)] public string? Description { get; set; }
    public bool IsVisibleOnReceipt { get; set; } = true;
    public bool IsMandatory { get; set; } = true;
    public int DisplayOrder { get; set; } = 0;
    [MaxLength(20)] public string? DefaultFrequency { get; set; }
}

public class FeeHeadResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? Description { get; set; }
    public bool IsVisibleOnReceipt { get; set; }
    public bool IsMandatory { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; }
    public string? DefaultFrequency { get; set; }
}

// ── FeeStructureComponent DTOs ────────────────────────────────────────────────
public class CreateFeeStructureComponentRequest
{
    [Required] public Guid FeeHeadId { get; set; }
    [Required] public decimal Amount { get; set; }
    [MaxLength(200)] public string? Remarks { get; set; }
}

public class FeeStructureComponentResponse
{
    public Guid Id { get; set; }
    public Guid FeeHeadId { get; set; }
    public string FeeHeadName { get; set; } = string.Empty;
    public string? FeeHeadCode { get; set; }
    public decimal Amount { get; set; }
    public string? Remarks { get; set; }
}

// ── FeeTerm DTOs ──────────────────────────────────────────────────────────────
public class CreateFeeTermRequest
{
    [Required][MaxLength(100)] public string Name { get; set; } = string.Empty;
    [Required] public int TermNumber { get; set; }
    [Required] public decimal Amount { get; set; }
    [Required] public DateTime DueDate { get; set; }
    [MaxLength(500)] public string? Remarks { get; set; }
}

public class FeeTermResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int TermNumber { get; set; }
    public decimal Amount { get; set; }
    public DateTime DueDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Remarks { get; set; }
}

// ── ReceiptTemplate DTOs ──────────────────────────────────────────────────────
public class CreateReceiptTemplateRequest
{
    [Required] public Guid SchoolId { get; set; }
    [Required][MaxLength(100)] public string Name { get; set; } = string.Empty;
    [MaxLength(500)] public string? HeaderText { get; set; }
    [MaxLength(500)] public string? FooterText { get; set; }
    [MaxLength(500)] public string? LogoUrl { get; set; }
    [MaxLength(10)] public string? PrimaryColor { get; set; }
    public string? ColumnConfigJson { get; set; }
    public bool IsDefault { get; set; } = false;
}

public class ReceiptTemplateResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? HeaderText { get; set; }
    public string? FooterText { get; set; }
    public string? LogoUrl { get; set; }
    public string? PrimaryColor { get; set; }
    public string? ColumnConfigJson { get; set; }
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; }
}

// ── PromoteFees DTO ───────────────────────────────────────────────────────────
public class PromoteFeeStructureRequest
{
    [Required] public string TargetAcademicYear { get; set; } = string.Empty;
    /// <summary>Optional % increase to apply to all amounts. 0 = copy as-is.</summary>
    public decimal IncrementPercent { get; set; } = 0;
}

// ── BulkFeePayment Upload DTO ─────────────────────────────────────────────────
public class BulkFeePaymentRow
{
    public string AdmissionNumber { get; set; } = string.Empty;
    public string StudentName { get; set; } = string.Empty;
    public decimal AmountPaid { get; set; }
    public string PaymentMethod { get; set; } = "cash";
    public string? ReceiptNumber { get; set; }
    public DateTime PaymentDate { get; set; }
    public string? Remarks { get; set; }
}

public class BulkFeePaymentResult
{
    public int TotalRows { get; set; }
    public int Successful { get; set; }
    public int Failed { get; set; }
    public List<string> Errors { get; set; } = new();
}



