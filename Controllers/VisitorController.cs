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
    public class VisitorController : ControllerBase
    {
        private readonly IVisitorService _service;
        private readonly ILogger<VisitorController> _logger;

        public VisitorController(IVisitorService service, ILogger<VisitorController> logger)
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

        /// <summary>
        /// Get paginated visitors with filters
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(PaginatedResponse<VisitorBasicDto>), 200)]
        public async Task<ActionResult<PaginatedResponse<VisitorBasicDto>>> GetVisitors(
            [FromQuery] VisitorFiltersDto filters,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetVisitorsAsync(schoolId, filters, page, pageSize);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting visitors");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Get visitor by ID
        /// </summary>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(VisitorFullDto), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<VisitorFullDto>> GetVisitorById(Guid id)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetVisitorByIdAsync(schoolId, id);
                
                if (result == null)
                    return NotFound(new { message = "Visitor not found" });
                
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting visitor {Id}", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Check-in a visitor
        /// </summary>
        [HttpPost("check-in")]
        [ProducesResponseType(typeof(VisitorFullDto), 201)]
        [ProducesResponseType(400)]
        public async Task<ActionResult<VisitorFullDto>> CheckInVisitor([FromBody] VisitorCheckInDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                
                // Convert VisitorCheckInDto to CreateVisitorDto
                var createVisitorDto = new CreateVisitorDto
                {
                    Name = dto.Name,
                    VisitorName = dto.Name,
                    Phone = dto.Phone,
                    Email = dto.Email,
                    Purpose = dto.Purpose,
                    PersonToMeet = dto.PersonToMeet,
                    IdProof = dto.IdProof,
                    IdProofNumber = dto.IdProofNumber,
                    HasVehicle = dto.HasVehicle,
                    VehicleNumber = dto.VehicleNumber,
                    StudentId = dto.StudentId
                };
                
                var result = await _service.CheckInVisitorAsync(schoolId, createVisitorDto, userId);
                
                return CreatedAtAction(nameof(GetVisitorById), new { id = result.Id }, result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking in visitor");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Check-out a visitor
        /// </summary>
        [HttpPut("{id}/check-out")]
        [ProducesResponseType(204)]
        [ProducesResponseType(404)]
        [ProducesResponseType(400)]
        public async Task<ActionResult> CheckOutVisitor(
            Guid id,
            [FromBody] VisitorCheckOutDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                var result = await _service.CheckOutVisitorAsync(schoolId, id, userId);
                
                if (!result)
                    return NotFound(new { message = "Visitor not found or already checked out" });
                
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Visitor not found" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking out visitor {Id}", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Update visitor details
        /// </summary>
        [HttpPut("{id}")]
        [ProducesResponseType(typeof(VisitorFullDto), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<VisitorFullDto>> UpdateVisitor(
            Guid id,
            [FromBody] UpdateVisitorDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                var result = await _service.UpdateVisitorAsync(schoolId, id, dto);
                
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Visitor not found" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating visitor {Id}", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Cancel visitor visit
        /// </summary>
        [HttpPut("{id}/cancel")]
        [ProducesResponseType(204)]
        [ProducesResponseType(404)]
        [ProducesResponseType(400)]
        public async Task<ActionResult> CancelVisit(
            Guid id,
            [FromBody] CancelVisitorDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                var result = await _service.CancelVisitAsync(schoolId, id, dto.Reason ?? "Cancelled");
                
                if (!result)
                    return NotFound(new { message = "Visitor not found" });
                
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Visitor not found" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error canceling visit {Id}", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Get pre-registrations
        /// </summary>
        [HttpGet("pre-registrations")]
        [ProducesResponseType(typeof(List<VisitorPreRegistrationBasicDto>), 200)]
        public async Task<ActionResult<List<VisitorPreRegistrationBasicDto>>> GetPreRegistrations(
            [FromQuery] PreRegistrationFiltersDto filters,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetPreRegistrationsAsync(schoolId, filters.Status);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting pre-registrations");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Create visitor pre-registration
        /// </summary>
        [HttpPost("pre-registrations")]
        [ProducesResponseType(typeof(VisitorPreRegistrationFullDto), 201)]
        public async Task<ActionResult<VisitorPreRegistrationFullDto>> CreatePreRegistration(
            [FromBody] CreatePreRegistrationDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                
                // Convert CreatePreRegistrationDto to CreateVisitorPreRegistrationDto
                var createVisitorPreRegDto = new CreateVisitorPreRegistrationDto
                {
                    SchoolId = schoolId,
                    VisitorName = dto.VisitorName,
                    VisitorPhone = dto.VisitorPhone,
                    VisitorEmail = dto.VisitorEmail,
                    Purpose = dto.Purpose,
                    PersonToMeet = dto.PersonToMeet,
                    ExpectedDate = dto.ExpectedDate,
                    ExpectedTime = dto.ExpectedTime,
                    RegisteredBy = userId
                };
                
                var result = await _service.CreatePreRegistrationAsync(schoolId, createVisitorPreRegDto, userId);
                
                return CreatedAtAction(nameof(GetPreRegistrations), null, result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating pre-registration");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Approve pre-registration and check-in visitor
        /// </summary>
        [HttpPut("pre-registrations/{id}/approve")]
        [ProducesResponseType(204)]
        [ProducesResponseType(404)]
        [ProducesResponseType(400)]
        public async Task<ActionResult> ApprovePreRegistration(
            Guid id,
            [FromBody] ApprovePreRegistrationDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                var result = await _service.ApprovePreRegistrationAsync(schoolId, id, userId);
                
                if (!result)
                    return NotFound(new { message = "Pre-registration not found" });
                
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Pre-registration not found" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error approving pre-registration {Id}", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Get currently inside visitors
        /// </summary>
        [HttpGet("currently-inside")]
        [ProducesResponseType(typeof(List<VisitorBasicDto>), 200)]
        public async Task<ActionResult<List<VisitorBasicDto>>> GetCurrentlyInside()
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetCurrentlyInsideAsync(schoolId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting currently inside visitors");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Get today's visitors
        /// </summary>
        [HttpGet("today")]
        [ProducesResponseType(typeof(List<VisitorBasicDto>), 200)]
        public async Task<ActionResult<List<VisitorBasicDto>>> GetTodayVisitors()
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetTodayVisitorsAsync(schoolId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting today's visitors");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Get visitor statistics
        /// </summary>
        [HttpGet("stats")]
        [ProducesResponseType(typeof(VisitorStatsDto), 200)]
        public async Task<ActionResult<VisitorStatsDto>> GetStats(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetVisitorStatsAsync(schoolId, startDate);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting visitor stats");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Get visitor history by phone number
        /// </summary>
        [HttpGet("history/{phone}")]
        [ProducesResponseType(typeof(List<VisitorBasicDto>), 200)]
        public async Task<ActionResult<List<VisitorBasicDto>>> GetVisitorHistory(string phone)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetVisitorHistoryAsync(schoolId, phone);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting visitor history for phone {Phone}", phone);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }
    }
}
