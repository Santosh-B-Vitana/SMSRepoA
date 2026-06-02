using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmsApi.Models.DTOs;
using SmsApi.Services;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace SmsApi.Controllers
{
    /// <summary>
    /// Student Discipline Tracking — incident log, commendations, suspension records.
    /// Route: /api/discipline
    /// </summary>
    [ApiController]
    [Route("api/discipline")]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class DisciplineController : ControllerBase
    {
        private readonly IDisciplineService _service;
        private readonly ILogger<DisciplineController> _logger;

        public DisciplineController(IDisciplineService service, ILogger<DisciplineController> logger)
        {
            _service = service;
            _logger = logger;
        }

        private Guid GetSchoolId()
        {
            var schoolIdClaim = User.FindFirst("SchoolId")?.Value;
            return Guid.Parse(schoolIdClaim ?? throw new UnauthorizedAccessException("SchoolId claim missing."));
        }

        /// <summary>
        /// List discipline records. Supports filtering by studentId, status, severity,
        /// incidentType, fromDate, toDate with pagination.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> List([FromQuery] DisciplineQueryParams query)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetRecordsAsync(schoolId, query);
                return Ok(result);
            }
            catch (UnauthorizedAccessException) { return Unauthorized(); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error listing discipline records");
                return StatusCode(500, new { message = "Internal server error." });
            }
        }

        /// <summary>Get a specific discipline record by ID.</summary>
        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            try
            {
                var schoolId = GetSchoolId();
                var record = await _service.GetByIdAsync(schoolId, id);
                if (record == null) return NotFound(new { message = "Record not found." });
                return Ok(record);
            }
            catch (UnauthorizedAccessException) { return Unauthorized(); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching discipline record {Id}", id);
                return StatusCode(500, new { message = "Internal server error." });
            }
        }

        /// <summary>Get discipline summary statistics for a specific student.</summary>
        [HttpGet("students/{studentId:guid}/summary")]
        public async Task<IActionResult> GetStudentSummary(Guid studentId)
        {
            try
            {
                var schoolId = GetSchoolId();
                var summary = await _service.GetStudentSummaryAsync(schoolId, studentId);
                return Ok(summary);
            }
            catch (UnauthorizedAccessException) { return Unauthorized(); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching discipline summary for student {StudentId}", studentId);
                return StatusCode(500, new { message = "Internal server error." });
            }
        }

        /// <summary>Create a new discipline record.</summary>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateDisciplineRecordRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var schoolId = GetSchoolId();
                var created = await _service.CreateAsync(schoolId, request);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (UnauthorizedAccessException) { return Unauthorized(); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating discipline record");
                return StatusCode(500, new { message = "Internal server error." });
            }
        }

        /// <summary>Update an existing discipline record.</summary>
        [HttpPatch("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] UpdateDisciplineRecordRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var schoolId = GetSchoolId();
                var updated = await _service.UpdateAsync(schoolId, id, request);
                if (updated == null) return NotFound(new { message = "Record not found." });
                return Ok(updated);
            }
            catch (UnauthorizedAccessException) { return Unauthorized(); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating discipline record {Id}", id);
                return StatusCode(500, new { message = "Internal server error." });
            }
        }

        /// <summary>Soft-delete a discipline record.</summary>
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            try
            {
                var schoolId = GetSchoolId();
                var deleted = await _service.DeleteAsync(schoolId, id);
                if (!deleted) return NotFound(new { message = "Record not found." });
                return NoContent();
            }
            catch (UnauthorizedAccessException) { return Unauthorized(); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting discipline record {Id}", id);
                return StatusCode(500, new { message = "Internal server error." });
            }
        }
    }
}
