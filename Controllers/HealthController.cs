using SmsApi.Models.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using SmsApi.Models.DTOs;
using SmsApi.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace SmsApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class HealthController : ControllerBase
    {
        private readonly IHealthService _service;
        private readonly ILogger<HealthController> _logger;

        public HealthController(IHealthService service, ILogger<HealthController> logger)
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

        private string? GetDesignation()
        {
            return User.FindFirst("Designation")?.Value;
        }

        private Guid? GetLinkedEntityId()
        {
            var raw = User.FindFirst("LinkedEntityId")?.Value;
            return Guid.TryParse(raw, out var id) ? id : null;
        }

        // ========== HEALTH RECORDS API ==========

        /// <summary>
        /// Get paginated health records with filters
        /// </summary>
        [HttpGet("records")]
        [ProducesResponseType(typeof(PaginatedResponse<HealthRecordBasicDto>), 200)]
        public async Task<ActionResult<PaginatedResponse<HealthRecordBasicDto>>> GetHealthRecords(
            [FromQuery] HealthFiltersDto filters,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            try
            {
                var schoolId = GetSchoolId();
                // For any non-admin staff, pass userId so service can restrict to their CT sections.
                // Admins/Principals/SuperAdmin see all. The service checks TeacherAssignments directly.
                var role = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? "";
                var isAdmin = role.Equals("Admin", StringComparison.OrdinalIgnoreCase)
                           || role.Equals("super_admin", StringComparison.OrdinalIgnoreCase)
                           || role.Equals("Principal", StringComparison.OrdinalIgnoreCase)
                           || role.Equals("HRManager", StringComparison.OrdinalIgnoreCase);
                Guid? ctUserId = isAdmin ? null : GetUserId();
                var result = await _service.GetHealthRecordsAsync(schoolId, filters, page, pageSize, ctUserId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting health records");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Get health record by ID (Full DTO)
        /// </summary>
        [HttpGet("records/{id}")]
        [ProducesResponseType(typeof(HealthRecordFullDto), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<HealthRecordFullDto>> GetHealthRecordById(Guid id)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetHealthRecordByIdAsync(schoolId, id);
                
                if (result == null)
                    return NotFound(new { message = "Health record not found" });
                
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting health record {Id}", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Create health record
        /// </summary>
        [HttpPost("records")]
        [ProducesResponseType(typeof(HealthRecordFullDto), 201)]
        [ProducesResponseType(400)]
        public async Task<ActionResult<HealthRecordFullDto>> CreateHealthRecord([FromBody] CreateHealthRecordDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                var result = await _service.CreateHealthRecordAsync(schoolId, dto, userId);
                
                return CreatedAtAction(nameof(GetHealthRecordById), new { id = result.Id }, result);
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
                _logger.LogError(ex, "Error creating health record");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Update health record
        /// </summary>
        [HttpPut("records/{id}")]
        [ProducesResponseType(typeof(HealthRecordFullDto), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<HealthRecordFullDto>> UpdateHealthRecord(
            Guid id, 
            [FromBody] UpdateHealthRecordDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                var result = await _service.UpdateHealthRecordAsync(schoolId, id, dto);
                
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
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Health record not found" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating health record {Id}", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Delete health record
        /// </summary>
        [HttpDelete("records/{id}")]
        [ProducesResponseType(204)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<ActionResult> DeleteHealthRecord(Guid id)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.DeleteHealthRecordAsync(schoolId, id);
                
                if (!result)
                    return NotFound(new { message = "Health record not found" });
                
                return NoContent();
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
                _logger.LogError(ex, "Error deleting health record {Id}", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // ========== VACCINATIONS ==========

        /// <summary>
        /// Add vaccination record
        /// </summary>
        [HttpPost("vaccinations")]
        [ProducesResponseType(typeof(VaccinationRecordDto), 201)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<VaccinationRecordDto>> AddVaccination([FromBody] CreateVaccinationDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                var result = await _service.AddVaccinationAsync(schoolId, dto.StudentId, dto);
                
                return CreatedAtAction(nameof(GetStudentVaccinations), new { studentId = dto.StudentId }, result);
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
                _logger.LogError(ex, "Error adding vaccination");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Get vaccination records for a student
        /// </summary>
        [HttpGet("vaccinations/{studentId}")]
        [ProducesResponseType(typeof(List<VaccinationRecordDto>), 200)]
        public async Task<ActionResult<List<VaccinationRecordDto>>> GetStudentVaccinations(Guid studentId)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetVaccinationsAsync(schoolId, studentId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting vaccinations for student {StudentId}", studentId);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Get upcoming vaccinations
        /// </summary>
        [HttpGet("vaccinations/upcoming")]
        [ProducesResponseType(typeof(List<UpcomingVaccinationDto>), 200)]
        public async Task<ActionResult<List<UpcomingVaccinationDto>>> GetUpcomingVaccinations(
            [FromQuery] int daysAhead = 30)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetUpcomingVaccinationsAsync(schoolId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting upcoming vaccinations");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // ========== HEALTH ALERTS ==========

        /// <summary>
        /// Create health alert
        /// </summary>
        [HttpPost("alerts")]
        [ProducesResponseType(typeof(HealthAlertDto), 201)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<HealthAlertDto>> CreateHealthAlert([FromBody] CreateHealthAlertDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                var result = await _service.CreateHealthAlertAsync(schoolId, dto);
                
                return CreatedAtAction(nameof(GetHealthAlerts), null, result);
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
                _logger.LogError(ex, "Error creating health alert");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Get health alerts with filters
        /// </summary>
        [HttpGet("alerts")]
        [ProducesResponseType(typeof(List<HealthAlertDto>), 200)]
        public async Task<ActionResult<List<HealthAlertDto>>> GetHealthAlerts(
            [FromQuery] HealthAlertFiltersDto filters)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetHealthAlertsAsync(schoolId, filters.Severity, filters.IsAcknowledged);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting health alerts");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Acknowledge health alert
        /// </summary>
        [HttpPut("alerts/{id}/acknowledge")]
        [ProducesResponseType(typeof(HealthAlertDto), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<HealthAlertDto>> AcknowledgeAlert(
            Guid id, 
            [FromBody] AcknowledgeAlertDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                var result = await _service.AcknowledgeAlertAsync(schoolId, id, userId);
                
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Health alert not found" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error acknowledging alert {Id}", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // ── Student / Parent self-service health record ────────────────────────

        /// <summary>
        /// Student: get own health record. Resolves student identity from JWT.
        /// </summary>
        [HttpGet("records/me")]
        [Authorize(Roles = "Student")]
        public async Task<ActionResult> GetMyHealthRecord()
        {
            try
            {
                var schoolId = GetSchoolId();
                var studentId = GetLinkedEntityId();
                if (!studentId.HasValue || studentId == Guid.Empty)
                    return StatusCode(403, new { message = "Student identity could not be resolved from token." });

                var result = await _service.GetHealthRecordsAsync(
                    schoolId,
                    new HealthFiltersDto { StudentId = studentId.Value },
                    page: 1,
                    pageSize: 1);

                return Ok(result.Items.FirstOrDefault());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting own health record");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Parent: get health record for a specific child.
        /// </summary>
        [HttpGet("records/child/{studentId:guid}")]
        [Authorize(Roles = "Parent")]
        public async Task<ActionResult> GetChildHealthRecord(Guid studentId)
        {
            try
            {
                var schoolId = GetSchoolId();
                var parentEmail = User.FindFirst(ClaimTypes.Email)?.Value ?? string.Empty;

                // Validate parent-child relationship via StudentGuardians
                // (service layer does not provide this check — we do it here)
                return StatusCode(501, new { message = "Parent child health endpoint — implement guardian check." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting child health record {StudentId}", studentId);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // ========== STATISTICS ==========

        /// <summary>
        /// Get health statistics
        /// </summary>
        [HttpGet("stats")]
        [ProducesResponseType(typeof(HealthStatsDto), 200)]
        public async Task<ActionResult<HealthStatsDto>> GetHealthStats(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            try
            {
                var schoolId = GetSchoolId();
                var role = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? "";
                var isAdmin = role.Equals("Admin", StringComparison.OrdinalIgnoreCase)
                           || role.Equals("super_admin", StringComparison.OrdinalIgnoreCase)
                           || role.Equals("Principal", StringComparison.OrdinalIgnoreCase)
                           || role.Equals("HRManager", StringComparison.OrdinalIgnoreCase);
                Guid? ctUserId = isAdmin ? null : GetUserId();
                var result = await _service.GetHealthStatsAsync(schoolId, ctUserId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting health stats");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // ========== BMI CALCULATION ==========

        /// <summary>
        /// Calculate BMI for a student
        /// </summary>
        [HttpPost("bmi/calculate")]
        [ProducesResponseType(typeof(BmiCalculationDto), 200)]
        [ProducesResponseType(400)]
        public async Task<ActionResult<BmiCalculationDto>> CalculateBmi([FromBody] CalculateBmiDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.CalculateBMIAsync(dto.Height, dto.Weight);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating BMI");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }
    }
}
