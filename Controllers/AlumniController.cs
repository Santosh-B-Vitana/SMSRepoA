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
    public class AlumniController : ControllerBase
    {
        private readonly IAlumniService _service;
        private readonly ILogger<AlumniController> _logger;

        public AlumniController(IAlumniService service, ILogger<AlumniController> logger)
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

        // ========== ALUMNI MANAGEMENT ==========

        /// <summary>
        /// Get paginated alumni records with filters
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(PaginatedResponse<AlumniBasicDto>), 200)]
        public async Task<ActionResult<PaginatedResponse<AlumniBasicDto>>> GetAlumni(
            [FromQuery] AlumniFiltersDto filters,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetAlumniAsync(schoolId, filters, page, pageSize);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting alumni records");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Get alumni by ID (Full DTO)
        /// </summary>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(AlumniFullDto), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<AlumniFullDto>> GetAlumniById(Guid id)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetAlumniByIdAsync(schoolId, id);
                
                if (result == null)
                    return NotFound(new { message = "Alumni record not found" });
                
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting alumni {Id}", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Create alumni record
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(AlumniFullDto), 201)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        public async Task<ActionResult<AlumniFullDto>> CreateAlumni([FromBody] CreateAlumniDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                var result = await _service.CreateAlumniAsync(schoolId, dto, userId);
                
                return CreatedAtAction(nameof(GetAlumniById), new { id = result.Id }, result);
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
                _logger.LogError(ex, "Error creating alumni record");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Update alumni record
        /// </summary>
        [HttpPut("{id}")]
        [ProducesResponseType(typeof(AlumniFullDto), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<AlumniFullDto>> UpdateAlumni(
            Guid id, 
            [FromBody] UpdateAlumniDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                var result = await _service.UpdateAlumniAsync(schoolId, id, dto, userId);
                
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
                return NotFound(new { message = "Alumni record not found" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating alumni {Id}", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Delete alumni record
        /// </summary>
        [HttpDelete("{id}")]
        [ProducesResponseType(204)]
        [ProducesResponseType(404)]
        public async Task<ActionResult> DeleteAlumni(Guid id)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.DeleteAlumniAsync(schoolId, id);
                
                if (!result)
                    return NotFound(new { message = "Alumni record not found" });
                
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting alumni {Id}", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // ========== ALUMNI MEETS ==========

        /// <summary>
        /// Get paginated alumni meets
        /// </summary>
        [HttpGet("meets")]
        [ProducesResponseType(typeof(PaginatedResponse<AlumniMeetBasicDto>), 200)]
        public async Task<ActionResult<PaginatedResponse<AlumniMeetBasicDto>>> GetAlumniMeets(
            [FromQuery] AlumniMeetFiltersDto filters,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetAlumniMeetsAsync(schoolId, filters, page, pageSize);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting alumni meets");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Create alumni meet
        /// </summary>
        [HttpPost("meets")]
        [ProducesResponseType(typeof(AlumniMeetFullDto), 201)]
        public async Task<ActionResult<AlumniMeetFullDto>> CreateAlumniMeet(
            [FromBody] CreateAlumniMeetDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                var result = await _service.CreateAlumniMeetAsync(schoolId, dto, userId);
                
                return CreatedAtAction(nameof(GetAlumniMeets), new { id = result.Id }, result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating alumni meet");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Update alumni meet
        /// </summary>
        [HttpPut("meets/{id}")]
        [ProducesResponseType(typeof(AlumniMeetFullDto), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<AlumniMeetFullDto>> UpdateAlumniMeet(
            Guid id, 
            [FromBody] UpdateAlumniMeetDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                var result = await _service.UpdateAlumniMeetAsync(schoolId, id, dto, userId);
                
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Alumni meet not found" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating alumni meet {Id}", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Register for alumni meet
        /// </summary>
        [HttpPost("meets/{meetId}/register")]
        [ProducesResponseType(typeof(AlumniMeetRegistrationDto), 201)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<AlumniMeetRegistrationDto>> RegisterForMeet(
            Guid meetId,
            [FromBody] RegisterForMeetDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                var result = await _service.RegisterForMeetAsync(schoolId, meetId, dto, userId);
                
                return CreatedAtAction(nameof(GetAlumniMeets), new { id = meetId }, result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Alumni meet not found" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error registering for meet {MeetId}", meetId);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Mark attendance for alumni meet
        /// </summary>
        [HttpPost("meets/{meetId}/attendance")]
        [ProducesResponseType(typeof(AlumniMeetAttendanceDto), 201)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<AlumniMeetAttendanceDto>> MarkMeetAttendance(
            Guid meetId,
            [FromBody] MarkMeetAttendanceDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                var result = await _service.MarkMeetAttendanceAsync(schoolId, meetId, dto, userId);
                
                return CreatedAtAction(nameof(GetAlumniMeets), new { id = meetId }, result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Alumni meet not found" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking attendance for meet {MeetId}", meetId);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // ========== ALUMNI DONATIONS ==========

        /// <summary>
        /// Get paginated alumni donations
        /// </summary>
        [HttpGet("donations")]
        [ProducesResponseType(typeof(PaginatedResponse<AlumniDonationBasicDto>), 200)]
        public async Task<ActionResult<PaginatedResponse<AlumniDonationBasicDto>>> GetAlumniDonations(
            [FromQuery] AlumniDonationFiltersDto filters,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetAlumniDonationsAsync(schoolId, filters, page, pageSize);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting alumni donations");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Create alumni donation
        /// </summary>
        [HttpPost("donations")]
        [ProducesResponseType(typeof(AlumniDonationFullDto), 201)]
        public async Task<ActionResult<AlumniDonationFullDto>> CreateAlumniDonation(
            [FromBody] CreateAlumniDonationDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                var result = await _service.CreateAlumniDonationAsync(schoolId, dto, userId);
                
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning(ex, "Alumni not found when recording donation");
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating alumni donation");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // ========== STATISTICS ==========

        /// <summary>
        /// Get alumni statistics
        /// </summary>
        [HttpGet("stats")]
        [ProducesResponseType(typeof(AlumniStatsDto), 200)]
        public async Task<ActionResult<AlumniStatsDto>> GetStats(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetAlumniStatsAsync(schoolId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting alumni stats");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }
    }
}
