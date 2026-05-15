using SmsApi.Models.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;
using SmsApi.Services;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;

namespace SmsApi.Controllers
{
    /// <summary>
    /// Finance & Ledger Management - School accounting and financial tracking
    /// </summary>
    [ApiController]
    [Route("api/finance")]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class FinanceController : ControllerBase
    {
        private readonly IFinanceService _service;
        private readonly ILogger<FinanceController> _logger;
        private readonly AppDbContext _db;
        private readonly ITenantContext _tenant;

        public FinanceController(IFinanceService service, ILogger<FinanceController> logger, AppDbContext db, ITenantContext tenant)
        {
            _service = service;
            _logger = logger;
            _db = db;
            _tenant = tenant;
        }

        private Guid GetSchoolId()
        {
            var schoolIdClaim = User.FindFirst("SchoolId")?.Value;
            return Guid.Parse(schoolIdClaim ?? throw new UnauthorizedAccessException());
        }

        private Guid GetUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.Parse(userIdClaim ?? throw new UnauthorizedAccessException());
        }

        /// <summary>
        /// Resolves the current user's StaffMember.Id from their UserLogin.
        /// UserLogin.Id != StaffMember.Id — must use LinkedEntityId or email fallback.
        /// </summary>
        private async Task<Guid?> ResolveStaffIdAsync()
        {
            var userId = GetUserId();
            var userLogin = await _db.Set<UserLogin>().FirstOrDefaultAsync(u => u.Id == userId);
            if (userLogin?.LinkedEntityId != null) return userLogin.LinkedEntityId;
            var email = userLogin?.Email ?? User.FindFirst(ClaimTypes.Email)?.Value;
            if (!string.IsNullOrEmpty(email))
            {
                var schoolId = GetSchoolId();
                var staff = await _db.StaffMembers
                    .FirstOrDefaultAsync(s => s.SchoolId == schoolId && s.Email == email);
                return staff?.Id;
            }
            return null;
        }

        // ========== ACCOUNTS ==========

        /// <summary>
        /// Get all finance accounts (chart of accounts)
        /// </summary>
        [HttpGet("accounts")]
        [ProducesResponseType(typeof(List<FinanceAccountDto>), 200)]
        public async Task<ActionResult<List<FinanceAccountDto>>> GetAccounts()
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetAccountsAsync(schoolId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting accounts");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Create a new finance account
        /// </summary>
        [HttpPost("accounts")]
        [ProducesResponseType(typeof(FinanceAccountDto), 201)]
        [ProducesResponseType(typeof(object), 400)]
        [ProducesResponseType(typeof(object), 401)]
        public async Task<ActionResult<FinanceAccountDto>> CreateAccount([FromBody] CreateFinanceAccountDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.CreateAccountAsync(schoolId, dto);
                return CreatedAtAction(nameof(GetAccounts), new { id = result.Id }, result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating account");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // ========== TRANSACTIONS ==========

        /// <summary>
        /// Get all financial transactions with filters
        /// </summary>
        [HttpGet("transactions")]
        [ProducesResponseType(typeof(PaginatedResponse<FinanceTransactionDto>), 200)]
        public async Task<ActionResult<PaginatedResponse<FinanceTransactionDto>>> GetTransactions(
            [FromQuery] TransactionFiltersDto filters,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetTransactionsAsync(schoolId, filters, page, pageSize);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting transactions");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Create a new financial transaction
        /// </summary>
        [HttpPost("transactions")]
        [ProducesResponseType(typeof(FinanceTransactionDto), 201)]
        [ProducesResponseType(typeof(object), 400)]
        [ProducesResponseType(typeof(object), 401)]
        [ProducesResponseType(typeof(object), 404)]
        public async Task<ActionResult<FinanceTransactionDto>> CreateTransaction([FromBody] CreateFinanceTransactionDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                var result = await _service.CreateTransactionAsync(schoolId, dto, userId);
                return CreatedAtAction(nameof(GetTransactions), new { id = result.Id }, result);
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
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating transaction");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Add income transaction
        /// </summary>
        [HttpPost("income")]
        [ProducesResponseType(typeof(FinanceTransactionDto), 201)]
        [ProducesResponseType(typeof(object), 400)]
        [ProducesResponseType(typeof(object), 401)]
        [ProducesResponseType(typeof(object), 404)]
        public async Task<ActionResult<FinanceTransactionDto>> AddIncome([FromBody] AddIncomeDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                var result = await _service.AddIncomeAsync(schoolId, dto, userId);
                return CreatedAtAction(nameof(GetTransactions), new { id = result.Id }, result);
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
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding income");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Add expense transaction
        /// </summary>
        [HttpPost("expenses")]
        [ProducesResponseType(typeof(FinanceTransactionDto), 201)]
        [ProducesResponseType(typeof(object), 400)]
        [ProducesResponseType(typeof(object), 401)]
        [ProducesResponseType(typeof(object), 404)]
        public async Task<ActionResult<FinanceTransactionDto>> AddExpense([FromBody] AddExpenseDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                var result = await _service.AddExpenseAsync(schoolId, dto, userId);
                return CreatedAtAction(nameof(GetTransactions), new { id = result.Id }, result);
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
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding expense");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Add store income transaction
        /// </summary>
        [HttpPost("store-income")]
        [ProducesResponseType(typeof(FinanceTransactionDto), 201)]
        [ProducesResponseType(typeof(object), 400)]
        [ProducesResponseType(typeof(object), 401)]
        [ProducesResponseType(typeof(object), 404)]
        public async Task<ActionResult<FinanceTransactionDto>> AddStoreIncome([FromBody] AddStoreIncomeDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                var result = await _service.AddStoreIncomeAsync(schoolId, dto, userId);
                return CreatedAtAction(nameof(GetTransactions), new { id = result.Id }, result);
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
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding store income");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // ========== CATEGORIES ==========

        /// <summary>
        /// Get all finance categories
        /// </summary>
        [HttpGet("categories")]
        [ProducesResponseType(typeof(List<FinanceCategoryDto>), 200)]
        public async Task<ActionResult<List<FinanceCategoryDto>>> GetCategories([FromQuery] string? type = null)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetCategoriesAsync(schoolId, type);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting categories");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Create a new finance category
        /// </summary>
        [HttpPost("categories")]
        [ProducesResponseType(typeof(FinanceCategoryDto), 201)]
        [ProducesResponseType(typeof(object), 400)]
        [ProducesResponseType(typeof(object), 401)]
        public async Task<ActionResult<FinanceCategoryDto>> CreateCategory([FromBody] CreateFinanceCategoryDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.CreateCategoryAsync(schoolId, dto);
                return CreatedAtAction(nameof(GetCategories), new { id = result.Id }, result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating category");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // ========== PETTY CASH ==========

        /// <summary>
        /// Get all petty cash entries
        /// </summary>
        [HttpGet("petty-cash")]
        [ProducesResponseType(typeof(PaginatedResponse<PettyCashEntryDto>), 200)]
        public async Task<ActionResult<PaginatedResponse<PettyCashEntryDto>>> GetPettyCashEntries(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetPettyCashEntriesAsync(schoolId, page, pageSize);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting petty cash entries");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Create a new petty cash entry
        /// </summary>
        [HttpPost("petty-cash")]
        [ProducesResponseType(typeof(PettyCashEntryDto), 201)]
        [ProducesResponseType(typeof(object), 400)]
        [ProducesResponseType(typeof(object), 401)]
        [ProducesResponseType(typeof(object), 404)]
        public async Task<ActionResult<PettyCashEntryDto>> CreatePettyCashEntry([FromBody] CreatePettyCashEntryDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                // Fall back to the current user's ID when no staff profile is linked —
                // PettyCashEntry.RequestedByStaffId has no FK constraint so any Guid is valid.
                var staffId = await ResolveStaffIdAsync() ?? GetUserId();
                var result = await _service.CreatePettyCashEntryAsync(schoolId, dto, staffId);
                return CreatedAtAction(nameof(GetPettyCashEntries), new { id = result.Id }, result);
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
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating petty cash entry");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Approve or reject petty cash entry
        /// </summary>
        [HttpPut("petty-cash/{entryId}/approve")]
        [ProducesResponseType(typeof(PettyCashEntryDto), 200)]
        [ProducesResponseType(typeof(object), 400)]
        [ProducesResponseType(typeof(object), 401)]
        [ProducesResponseType(typeof(object), 404)]
        public async Task<ActionResult<PettyCashEntryDto>> ApprovePettyCash(
            Guid entryId,
            [FromBody] ApprovePettyCashDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var staffId = GetUserId();
                var result = await _service.ApprovePettyCashAsync(schoolId, entryId, dto, staffId);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Petty cash entry not found" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error approving petty cash entry {EntryId}", entryId);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // ========== STORE SALES ==========

        /// <summary>
        /// Get all store sales
        /// </summary>
        [HttpGet("store-sales")]
        [ProducesResponseType(typeof(PaginatedResponse<StoreSaleDto>), 200)]
        public async Task<ActionResult<PaginatedResponse<StoreSaleDto>>> GetStoreSales(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetStoreSalesAsync(schoolId, page, pageSize);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting store sales");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Create a new store sale
        /// </summary>
        [HttpPost("store-sales")]
        [ProducesResponseType(typeof(StoreSaleDto), 201)]
        [ProducesResponseType(typeof(object), 400)]
        [ProducesResponseType(typeof(object), 401)]
        [ProducesResponseType(typeof(object), 404)]
        public async Task<ActionResult<StoreSaleDto>> CreateStoreSale([FromBody] CreateStoreSaleDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var staffId = GetUserId();
                var result = await _service.CreateStoreSaleAsync(schoolId, dto, staffId);
                return CreatedAtAction(nameof(GetStoreSales), new { id = result.Id }, result);
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
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating store sale");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // ========== STATISTICS ==========

        /// <summary>
        /// Get finance statistics and dashboard data
        /// </summary>
        [HttpGet("stats")]
        [ProducesResponseType(typeof(FinanceStatsDto), 200)]
        public async Task<ActionResult<FinanceStatsDto>> GetStats([FromQuery] FinanceFiltersDto filters)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetStatsAsync(schoolId, filters);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting finance stats");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // ========== REPORT ==========

        /// <summary>
        /// Get financial report with monthly trend and budget summary
        /// </summary>
        [HttpGet("report")]
        [ProducesResponseType(typeof(FinanceReportDto), 200)]
        public async Task<ActionResult<FinanceReportDto>> GetReport(
            [FromQuery] DateTime? dateFrom,
            [FromQuery] DateTime? dateTo)
        {
            try
            {
                var schoolId = GetSchoolId();
                var from = dateFrom ?? new DateTime(DateTime.UtcNow.Year, 1, 1);
                var to = dateTo ?? DateTime.UtcNow;
                var result = await _service.GetReportAsync(schoolId, from, to);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting finance report");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Get aggregated income sources (Fee, Library, Store, Donations, Petty Cash)
        /// </summary>
        [HttpGet("income-sources")]
        [ProducesResponseType(typeof(AggregatedIncomeDto), 200)]
        public async Task<ActionResult<AggregatedIncomeDto>> GetIncomeSources()
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetAggregatedIncomeSourcesAsync(schoolId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting aggregated income sources");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // ========== CATEGORY BUDGET UPDATE ==========

        /// <summary>
        /// Update a finance category's name or budget
        /// </summary>
        [HttpPut("categories/{categoryId}")]
        [ProducesResponseType(typeof(FinanceCategoryDto), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<FinanceCategoryDto>> UpdateCategory(
            Guid categoryId,
            [FromBody] UpdateFinanceCategoryDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.UpdateCategoryAsync(schoolId, categoryId, dto);
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Category not found" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating category {CategoryId}", categoryId);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // ========== DELETE CATEGORY ==========

        /// <summary>
        /// Soft-delete a finance category (only if it has no transactions)
        /// </summary>
        [HttpDelete("categories/{categoryId}")]
        [ProducesResponseType(204)]
        [ProducesResponseType(404)]
        [ProducesResponseType(typeof(object), 400)]
        public async Task<ActionResult> DeleteCategory(Guid categoryId)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.DeleteCategoryAsync(schoolId, categoryId);
                if (!result)
                    return NotFound(new { message = "Category not found" });
                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting category {CategoryId}", categoryId);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // ========== PAYROLL SYNC ==========

        /// <summary>
        /// Import paid/approved payroll records as wallet expenses (idempotent — skips already-synced entries)
        /// </summary>
        [HttpPost("sync-payroll")]
        [ProducesResponseType(typeof(PayrollSyncResultDto), 200)]
        public async Task<ActionResult<PayrollSyncResultDto>> SyncPayroll(
            [FromQuery] int? month,
            [FromQuery] int? year)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.SyncPayrollExpensesAsync(schoolId, month, year);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error syncing payroll expenses");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpPost("sync-store")]
        [ProducesResponseType(typeof(PayrollSyncResultDto), 200)]
        public async Task<ActionResult<PayrollSyncResultDto>> SyncStoreOrders()
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.SyncStoreOrdersAsync(schoolId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error syncing store orders");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }
    }
}
