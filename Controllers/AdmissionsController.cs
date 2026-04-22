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
    public class AdmissionsController : ControllerBase
    {
        private readonly IAdmissionService _service;
        private readonly ILogger<AdmissionsController> _logger;

        public AdmissionsController(IAdmissionService service, ILogger<AdmissionsController> logger)
        {
            _service = service;
            _logger = logger;
        }

        private Guid GetSchoolId()
        {
            var schoolIdClaim = User.FindFirst("SchoolId")?.Value;
            if (string.IsNullOrEmpty(schoolIdClaim) || !Guid.TryParse(schoolIdClaim, out var schoolId))
                throw new UnauthorizedAccessException("Invalid or missing school context");
            return schoolId;
        }

        private Guid GetUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
                throw new UnauthorizedAccessException("Invalid or missing user context");
            return userId;
        }

        [HttpGet("applications")]
        [ProducesResponseType(typeof(PaginatedResponse<AdmissionBasicDto>), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        public async Task<ActionResult<PaginatedResponse<AdmissionBasicDto>>> GetApplications(
            [FromQuery] AdmissionFiltersDto filters,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetApplicationsAsync(schoolId, filters, page, pageSize);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting admission applications");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpGet("applications/{id}")]
        [ProducesResponseType(typeof(AdmissionFullDto), 200)]
        [ProducesResponseType(401)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<AdmissionFullDto>> GetApplicationById(Guid id)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetApplicationByIdAsync(schoolId, id);
                if (result == null) return NotFound(new { message = "Admission application not found" });
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting admission application {Id}", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpPost("applications")]
        [ProducesResponseType(typeof(AdmissionFullDto), 201)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        public async Task<ActionResult<AdmissionFullDto>> CreateApplication([FromBody] CreateAdmissionDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                dto.SchoolId = schoolId;
                var result = await _service.CreateApplicationAsync(schoolId, dto, userId);
                return CreatedAtAction(nameof(GetApplicationById), new { id = result.Id }, result);
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating admission application");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpPut("applications/{id}")]
        [ProducesResponseType(typeof(AdmissionFullDto), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<AdmissionFullDto>> UpdateApplication(Guid id, [FromBody] UpdateAdmissionDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.UpdateApplicationAsync(schoolId, id, dto);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException) { return NotFound(new { message = "Admission application not found" }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating admission application {Id}", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpDelete("applications/{id}")]
        [ProducesResponseType(204)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        [ProducesResponseType(404)]
        public async Task<ActionResult> DeleteApplication(Guid id)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.DeleteApplicationAsync(schoolId, id);
                if (!result) return NotFound(new { message = "Admission application not found" });
                return NoContent();
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting admission application {Id}", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpPut("applications/{id}/status")]
        [ProducesResponseType(204)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        [ProducesResponseType(404)]
        public async Task<ActionResult> UpdateApplicationStatus(Guid id, [FromBody] UpdateApplicationStatusDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                await _service.UpdateStatusAsync(schoolId, id, dto.Status, dto.Remarks, userId);
                return NoContent();
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException) { return NotFound(new { message = "Admission application not found" }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating application status {Id}", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpPut("applications/{id}/interview")]
        [ProducesResponseType(204)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        [ProducesResponseType(404)]
        public async Task<ActionResult> ScheduleInterview(Guid id, [FromBody] ScheduleInterviewDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                await _service.ScheduleInterviewAsync(schoolId, id, dto.InterviewDate, dto.Notes);
                return NoContent();
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException) { return NotFound(new { message = "Admission application not found" }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error scheduling interview for application {Id}", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpPut("applications/{id}/approve")]
        [ProducesResponseType(204)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        [ProducesResponseType(404)]
        public async Task<ActionResult> ApproveApplication(Guid id)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                await _service.ApproveApplicationAsync(schoolId, id, userId);
                return NoContent();
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException) { return NotFound(new { message = "Admission application not found" }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error approving application {Id}", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpPut("applications/{id}/reject")]
        [ProducesResponseType(204)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        [ProducesResponseType(404)]
        public async Task<ActionResult> RejectApplication(Guid id, [FromBody] RejectApplicationDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                var reason = dto.RejectionReason ?? dto.Reason ?? string.Empty;
                await _service.RejectApplicationAsync(schoolId, id, reason, userId);
                return NoContent();
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException) { return NotFound(new { message = "Admission application not found" }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error rejecting application {Id}", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpPut("applications/{id}/enroll")]
        [ProducesResponseType(204)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        [ProducesResponseType(404)]
        public async Task<ActionResult> EnrollApplication(Guid id, [FromBody] EnrollApplicationDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                await _service.EnrollStudentAsync(schoolId, id, dto.AdmissionNumber ?? string.Empty, userId);
                return NoContent();
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException) { return NotFound(new { message = "Admission application not found" }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error enrolling application {Id}", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpGet("stats")]
        [ProducesResponseType(typeof(AdmissionStatsDto), 200)]
        [ProducesResponseType(401)]
        public async Task<ActionResult<AdmissionStatsDto>> GetStats()
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetApplicationStatsAsync(schoolId);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting admission stats");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpGet("applications/{id}/documents")]
        [ProducesResponseType(typeof(List<AdmissionDocumentDto>), 200)]
        [ProducesResponseType(401)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<List<AdmissionDocumentDto>>> GetApplicationDocuments(Guid id)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetDocumentsAsync(schoolId, id);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (KeyNotFoundException) { return NotFound(new { message = "Admission application not found" }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting documents for application {Id}", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpPost("applications/{id}/documents")]
        [ProducesResponseType(typeof(AdmissionDocumentDto), 201)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<AdmissionDocumentDto>> UploadApplicationDocument(
            Guid id, [FromBody] CreateAdmissionDocumentDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.UploadDocumentAsync(schoolId, id, dto);
                return CreatedAtAction(nameof(GetApplicationDocuments), new { id }, result);
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException) { return NotFound(new { message = "Admission application not found" }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading document for application {Id}", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }
    }
}