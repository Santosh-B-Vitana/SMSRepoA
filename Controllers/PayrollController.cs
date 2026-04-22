using SmsApi.Models.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using SmsApi.Models.DTOs;
using SmsApi.Services;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;

namespace SmsApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class PayrollController : ControllerBase
    {
        private readonly IPayrollService _service;
        private readonly ILogger<PayrollController> _logger;

        public PayrollController(IPayrollService service, ILogger<PayrollController> logger)
        {
            _service = service;
            _logger = logger;
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

        // ========== PAYROLL RECORDS API ==========

        /// <summary>
        /// Get paginated payroll records with filters
        /// </summary>
        [HttpGet("records")]
        [ProducesResponseType(typeof(PaginatedResponse<PayrollRecordBasicDto>), 200)]
        [ProducesResponseType(400)]
        public async Task<ActionResult<PaginatedResponse<PayrollRecordBasicDto>>> GetPayrollRecords(
            [FromQuery] PayrollFiltersDto filters,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetPayrollRecordsAsync(schoolId, filters, page, pageSize);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting payroll records");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Get payroll record by ID (Full DTO)
        /// </summary>
        [HttpGet("records/{id}")]
        [ProducesResponseType(typeof(PayrollRecordFullDto), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<PayrollRecordFullDto>> GetPayrollById(Guid id)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetPayrollByIdAsync(schoolId, id);
                
                if (result == null)
                    return NotFound(new { message = "Payroll record not found" });
                
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting payroll {Id}", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Create payroll record
        /// </summary>
        [HttpPost("records")]
        [ProducesResponseType(typeof(PayrollRecordFullDto), 201)]
        [ProducesResponseType(400)]
        public async Task<ActionResult<PayrollRecordFullDto>> CreatePayroll([FromBody] CreatePayrollDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                
                // Convert CreatePayrollDto to CreatePayrollRecordDto
                var createPayrollRecordDto = new CreatePayrollRecordDto
                {
                    StaffId = dto.StaffId,
                    Month = dto.Month,
                    Year = dto.Year,
                    BasicSalary = dto.BasicSalary,
                    Allowances = dto.Allowances,
                    Deductions = dto.Deductions,
                    Remarks = dto.Remarks
                };
                
                var result = await _service.CreatePayrollAsync(schoolId, createPayrollRecordDto, userId);
                
                return CreatedAtAction(nameof(GetPayrollById), new { id = result.Id }, result);
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
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating payroll");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Update payroll record
        /// </summary>
        [HttpPut("records/{id}")]
        [ProducesResponseType(typeof(PayrollRecordFullDto), 200)]
        [ProducesResponseType(404)]
        [ProducesResponseType(400)]
        public async Task<ActionResult<PayrollRecordFullDto>> UpdatePayroll(
            Guid id, 
            [FromBody] UpdatePayrollDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                
                // Convert UpdatePayrollDto to UpdatePayrollRecordDto
                var updatePayrollRecordDto = new UpdatePayrollRecordDto
                {
                    Allowances = dto.Allowances,
                    Deductions = dto.Deductions,
                    Status = dto.Status,
                    PaymentDate = dto.PaymentDate,
                    PaymentMethod = dto.PaymentMethod,
                    Remarks = dto.Remarks
                };
                
                var result = await _service.UpdatePayrollAsync(schoolId, id, updatePayrollRecordDto);
                
                return Ok(result);
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
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating payroll {Id}", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Delete payroll record
        /// </summary>
        [HttpDelete("records/{id}")]
        [ProducesResponseType(204)]
        [ProducesResponseType(404)]
        public async Task<ActionResult> DeletePayroll(Guid id)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.DeletePayrollAsync(schoolId, id);
                
                if (!result)
                    return NotFound(new { message = "Payroll record not found" });
                
                return NoContent();
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting payroll {Id}", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Process multiple staff payrolls
        /// </summary>
        [HttpPost("process")]
        [ProducesResponseType(typeof(List<PayrollRecordBasicDto>), 201)]
        [ProducesResponseType(400)]
        public async Task<ActionResult<List<PayrollRecordBasicDto>>> ProcessPayrolls(
            [FromBody] ProcessPayrollsDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                var month = int.Parse(dto.Month);
                var result = await _service.ProcessPayrollsAsync(schoolId, month, dto.Year, dto.StaffIds ?? new List<Guid>(), userId);
                
                return CreatedAtAction(nameof(GetPayrollRecords), null, result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing payrolls");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Approve payroll record
        /// </summary>
        [HttpPut("records/{id}/approve")]
        [ProducesResponseType(204)]
        [ProducesResponseType(404)]
        public async Task<ActionResult> ApprovePayroll(
            Guid id, 
            [FromBody] ApprovePayrollDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                var result = await _service.ApprovePayrollAsync(schoolId, id, userId);
                
                if (!result)
                    return NotFound(new { message = "Payroll record not found" });
                
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Payroll record not found" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error approving payroll {Id}", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Get payslip for payroll record
        /// </summary>
        [HttpGet("records/{id}/payslip")]
        [ProducesResponseType(typeof(PayrollRecordFullDto), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<PayrollRecordFullDto>> GetPayslip(Guid id)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetPayslipAsync(schoolId, id);
                
                if (result == null)
                    return NotFound(new { message = "Payroll record not found" });
                
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting payslip for payroll {Id}", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Calculate salary for staff
        /// </summary>
        [HttpPost("calculate")]
        [ProducesResponseType(typeof(SalaryCalculationDto), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<SalaryCalculationDto>> CalculateSalary(
            [FromBody] CalculateSalaryDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var month = int.Parse(dto.Month);
                var result = await _service.CalculateSalaryAsync(schoolId, dto.StaffId, month, dto.Year);
                
                return Ok(result);
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
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating salary");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Get payroll statistics
        /// </summary>
        [HttpGet("stats")]
        [ProducesResponseType(typeof(PayrollStatsDto), 200)]
        public async Task<ActionResult<PayrollStatsDto>> GetStats(
            [FromQuery] int? month,
            [FromQuery] int? year)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetPayrollStatsAsync(schoolId, month, year);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting payroll stats");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Get salary structure by designation
        /// </summary>
        [HttpGet("salary-structures/{designation}")]
        [ProducesResponseType(typeof(SalaryStructureDto), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<SalaryStructureDto>> GetSalaryStructure(string designation)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetSalaryStructureAsync(schoolId, designation);
                
                if (result == null)
                    return NotFound(new { message = "Salary structure not found for this designation" });
                
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting salary structure for {Designation}", designation);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Create or update salary structure
        /// </summary>
        [HttpPost("salary-structures")]
        [ProducesResponseType(typeof(SalaryStructureDto), 201)]
        public async Task<ActionResult<SalaryStructureDto>> CreateSalaryStructure(
            [FromBody] CreateSalaryStructureDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                var result = await _service.CreateSalaryStructureAsync(schoolId, dto);
                
                return CreatedAtAction(nameof(GetSalaryStructure), new { designation = result.Designation }, result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating salary structure");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }
    }
}
