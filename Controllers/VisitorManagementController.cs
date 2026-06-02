using SmsApi.Models.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmsApi.Models.DTOs;
using SmsApi.Services;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace SmsApi.Controllers
{
    [Authorize(Roles = StatusConstants.RoleGroups.FrontDeskAccess)]
    [ApiController]
    [Route("api/[controller]")]
    public class VisitorManagementController : ControllerBase
    {
        private readonly IVisitorManagementService _visitorManagementService;

        public VisitorManagementController(IVisitorManagementService visitorManagementService)
        {
            _visitorManagementService = visitorManagementService;
        }

        private Guid GetSchoolId()
        {
            var schoolIdClaim = User.FindFirst("SchoolId")?.Value;
            return Guid.TryParse(schoolIdClaim, out var schoolId) ? schoolId : Guid.Empty;
        }

        private Guid GetUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty;
        }

        // Visitors
        [HttpGet("visitors")]
        public async Task<ActionResult<VisitorListResponse>> GetVisitors(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? searchTerm = null)
        {
            var schoolId = GetSchoolId();
            if (schoolId == Guid.Empty)
                return Unauthorized();

            var response = await _visitorManagementService.GetVisitorsAsync(schoolId, page, pageSize, searchTerm);
            return Ok(response);
        }

        [HttpGet("visitors/{id}")]
        public async Task<ActionResult<VisitorResponse>> GetVisitorById(Guid id)
        {
            var schoolId = GetSchoolId();
            if (schoolId == Guid.Empty)
                return Unauthorized();

            var visitor = await _visitorManagementService.GetVisitorByIdAsync(id, schoolId);
            if (visitor == null)
                return NotFound();

            return Ok(visitor);
        }

        [HttpPost("visitors")]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<VisitorResponse>> CreateVisitor([FromBody] CreateVisitorRequest request)
        {
            var schoolId = GetSchoolId();
            var userId = GetUserId();
            if (schoolId == Guid.Empty)
                return Unauthorized();

            request.SchoolId = schoolId;
            request.CreatedBy = userId;

            try
            {
                var visitor = await _visitorManagementService.CreateVisitorAsync(request);
                return CreatedAtAction(nameof(GetVisitorById), new { id = visitor.Id }, visitor);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message, error = ex.ParamName });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("visitors/{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<VisitorResponse>> UpdateVisitor(Guid id, [FromBody] UpdateVisitorRequest request)
        {
            var schoolId = GetSchoolId();
            var userId = GetUserId();
            if (schoolId == Guid.Empty)
                return Unauthorized();

            request.UpdatedBy = userId;

            try
            {
                var visitor = await _visitorManagementService.UpdateVisitorAsync(id, request, schoolId);
                return Ok(visitor);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message, error = ex.ParamName });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // Visitor Logs
        [HttpGet("logs")]
        public async Task<ActionResult<VisitorLogListResponse>> GetLogs(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] Guid? visitorId = null,
            [FromQuery] string? status = null)
        {
            var schoolId = GetSchoolId();
            if (schoolId == Guid.Empty)
                return Unauthorized();

            var response = await _visitorManagementService.GetVisitorLogsAsync(schoolId, page, pageSize, visitorId, status);
            return Ok(response);
        }

        [HttpPost("check-in")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<VisitorLogResponse>> CheckInVisitor([FromBody] CheckInVisitorRequest request)
        {
            var schoolId = GetSchoolId();
            var userId = GetUserId();
            if (schoolId == Guid.Empty)
                return Unauthorized();

            request.SchoolId = schoolId;
            request.CheckedInBy = userId;

            try
            {
                var log = await _visitorManagementService.CheckInVisitorAsync(request);
                return Ok(log);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message, error = ex.ParamName });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("logs/{id}/check-out")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<VisitorLogResponse>> CheckOutVisitor(Guid id, [FromBody] CheckOutVisitorRequest request)
        {
            var schoolId = GetSchoolId();
            var userId = GetUserId();
            if (schoolId == Guid.Empty)
                return Unauthorized();

            request.CheckedOutBy = userId;

            try
            {
                var log = await _visitorManagementService.CheckOutVisitorAsync(id, request, schoolId);
                return Ok(log);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message, error = ex.ParamName });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("active")]
        public async Task<ActionResult<VisitorLogListResponse>> GetActiveVisits(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var schoolId = GetSchoolId();
            if (schoolId == Guid.Empty)
                return Unauthorized();

            var response = await _visitorManagementService.GetActiveVisitsAsync(schoolId, page, pageSize);
            return Ok(response);
        }
    }
}
