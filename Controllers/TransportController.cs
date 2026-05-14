using SmsApi.Models.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmsApi.Models.DTOs;
using SmsApi.Services;
using System;
using System.Threading.Tasks;

namespace SmsApi.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class TransportController : ControllerBase
    {
        private readonly ITransportService _transportService;
        private readonly ITenantContext _tenant;

        public TransportController(ITransportService transportService, ITenantContext tenant)
        {
            _transportService = transportService;
            _tenant = tenant;
        }

        [HttpGet("routes")]
        [Authorize(Roles = StatusConstants.RoleGroups.TransportManagement)]
        public async Task<ActionResult<TransportRouteListResponse>> GetRoutes(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _transportService.GetRoutesAsync(schoolId, page, pageSize);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpGet("routes/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.TransportManagement)]
        public async Task<ActionResult<TransportRouteResponse>> GetRouteById(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var route = await _transportService.GetRouteByIdAsync(id, schoolId);
                if (route == null)
                {
                    return NotFound();
                }
                return Ok(route);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpPost("routes")]
        [Authorize(Roles = StatusConstants.RoleGroups.TransportManagement)]
        public async Task<ActionResult<TransportRouteResponse>> CreateRoute([FromBody] CreateTransportRouteRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                request.SchoolId = schoolId;
                var route = await _transportService.CreateRouteAsync(request);
                return CreatedAtAction(nameof(GetRouteById), new { id = route.Id }, route);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpPut("routes/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.TransportManagement)]
        public async Task<ActionResult<TransportRouteResponse>> UpdateRoute(Guid id, [FromBody] CreateTransportRouteRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var route = await _transportService.UpdateRouteAsync(id, schoolId, request);
                if (route == null)
                {
                    return NotFound();
                }
                return Ok(route);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpDelete("routes/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.TransportManagement)]
        public async Task<ActionResult> DeleteRoute(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _transportService.DeleteRouteAsync(id, schoolId);
                if (!result)
                {
                    return NotFound();
                }
                return NoContent();
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpGet("routes/{routeId}/students")]
        [Authorize(Roles = StatusConstants.RoleGroups.TransportManagement)]
        public async Task<ActionResult> GetStudentsByRoute(Guid routeId)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var students = await _transportService.GetStudentsByRouteAsync(routeId, schoolId);
                return Ok(students);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpGet("students")]
        [Authorize(Roles = StatusConstants.RoleGroups.TransportManagement)]
        public async Task<ActionResult> GetAllTransportStudents()
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var students = await _transportService.GetAllTransportStudentsAsync(schoolId);
                return Ok(students);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpPost("students")]
        [Authorize(Roles = StatusConstants.RoleGroups.TransportManagement)]
        public async Task<ActionResult<TransportStudentResponse>> AssignStudentToRoute([FromBody] CreateTransportStudentRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                request.SchoolId = schoolId;
                var student = await _transportService.AssignStudentToRouteAsync(request);
                return Ok(student);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpPut("students/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.TransportManagement)]
        public async Task<ActionResult<TransportStudentResponse>> UpdateTransportStudent(Guid id, [FromBody] UpdateTransportStudentRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var student = await _transportService.UpdateTransportStudentAsync(id, schoolId, request);
                if (student == null) return NotFound();
                return Ok(student);
            }
            catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpDelete("students/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.TransportManagement)]
        public async Task<ActionResult> RemoveStudentFromRoute(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _transportService.RemoveStudentFromRouteAsync(id, schoolId);
                if (!result)
                {
                    return NotFound();
                }
                return NoContent();
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }
    }
}
