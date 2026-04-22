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
    public class HostelController : ControllerBase
    {
        private readonly IHostelService _hostelService;
        private readonly ITenantContext _tenant;

        public HostelController(IHostelService hostelService, ITenantContext tenant)
        {
            _hostelService = hostelService;
            _tenant = tenant;
        }

        [HttpGet("rooms")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<ActionResult<HostelRoomListResponse>> GetRooms(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _hostelService.GetRoomsAsync(schoolId, page, pageSize);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpGet("rooms/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<ActionResult<HostelRoomResponse>> GetRoomById(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var room = await _hostelService.GetRoomByIdAsync(id, schoolId);
                if (room == null) { return NotFound(); }
                return Ok(room);
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpPost("rooms")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<ActionResult<HostelRoomResponse>> CreateRoom([FromBody] CreateHostelRoomRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                request.SchoolId = schoolId;
                var room = await _hostelService.CreateRoomAsync(request);
                return CreatedAtAction(nameof(GetRoomById), new { id = room.Id }, room);
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpPut("rooms/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<ActionResult<HostelRoomResponse>> UpdateRoom(Guid id, [FromBody] CreateHostelRoomRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var room = await _hostelService.UpdateRoomAsync(id, schoolId, request);
                if (room == null) { return NotFound(); }
                return Ok(room);
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpDelete("rooms/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<ActionResult> DeleteRoom(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _hostelService.DeleteRoomAsync(id, schoolId);
                if (!result) { return NotFound(); }
                return NoContent();
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpGet("rooms/{roomId}/students")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<ActionResult> GetStudentsByRoom(Guid roomId)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var students = await _hostelService.GetStudentsByRoomAsync(roomId, schoolId);
                return Ok(students);
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpGet("students")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<ActionResult> GetAllHostelStudents()
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var students = await _hostelService.GetAllHostelStudentsAsync(schoolId);
                return Ok(students);
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpPost("students")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<ActionResult<HostelStudentResponse>> AssignStudentToRoom([FromBody] CreateHostelStudentRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                request.SchoolId = schoolId;
                var student = await _hostelService.AssignStudentToRoomAsync(request);
                return Ok(student);
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpDelete("students/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<ActionResult> RemoveStudentFromRoom(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _hostelService.RemoveStudentFromRoomAsync(id, schoolId);
                if (!result) { return NotFound(); }
                return NoContent();
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }
    }
}
