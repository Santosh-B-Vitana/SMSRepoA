using SmsApi.Models.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Services;
using System;
using System.Linq;
using System.Security.Claims;
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
        private readonly AppDbContext _db;

        public HostelController(IHostelService hostelService, ITenantContext tenant, AppDbContext db)
        {
            _hostelService = hostelService;
            _tenant = tenant;
            _db = db;
        }

        // ── Parent: view child's hostel assignment ─────────────────────────────

        [HttpGet("parent/my-child/{studentId:guid}")]
        [Authorize(Roles = "Parent")]
        public async Task<ActionResult> GetChildHostelInfo(Guid studentId)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var parentEmail = User.FindFirstValue(ClaimTypes.Email) ?? string.Empty;

            var isMyChild = await _db.StudentGuardians
                .AnyAsync(sg => sg.SchoolId == schoolId && !sg.IsDeleted
                             && sg.StudentId == studentId
                             && sg.Email != null && sg.Email.ToLower() == parentEmail.ToLower());
            if (!isMyChild)
                return StatusCode(403, new { message = "You can only view your own child's hostel information." });

            var all = await _hostelService.GetAllHostelStudentsAsync(schoolId);
            var child = all.FirstOrDefault(s => s.StudentId == studentId);

            if (child == null)
                return NotFound(new { message = "No hostel assignment found for this student." });

            return Ok(child);
        }

        // ── Student: view own hostel assignment ───────────────────────────────

        [HttpGet("my-assignment")]
        [Authorize(Roles = "Student")]
        public async Task<ActionResult> GetMyHostelAssignment()
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var linkedId = _tenant.LinkedEntityId;
            if (!linkedId.HasValue || linkedId == Guid.Empty)
                return StatusCode(403, new { message = "Student identity could not be resolved from token." });

            var all = await _hostelService.GetAllHostelStudentsAsync(schoolId);
            var child = all.FirstOrDefault(s => s.StudentId == linkedId.Value);

            if (child == null)
                return NotFound(new { message = "No hostel assignment found." });

            return Ok(child);
        }

        [HttpGet("rooms")]
        [Authorize(Roles = StatusConstants.RoleGroups.HostelManagement)]
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
        [Authorize(Roles = StatusConstants.RoleGroups.HostelManagement)]
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
        [Authorize(Roles = StatusConstants.RoleGroups.HostelManagement)]
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
        [Authorize(Roles = StatusConstants.RoleGroups.HostelManagement)]
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
        [Authorize(Roles = StatusConstants.RoleGroups.HostelManagement)]
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
        [Authorize(Roles = StatusConstants.RoleGroups.HostelManagement)]
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
        [Authorize(Roles = StatusConstants.RoleGroups.HostelManagement)]
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
        [Authorize(Roles = StatusConstants.RoleGroups.HostelManagement)]
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

        [HttpPut("students/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.HostelManagement)]
        public async Task<ActionResult<HostelStudentResponse>> UpdateHostelStudent(Guid id, [FromBody] UpdateHostelStudentRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var student = await _hostelService.UpdateHostelStudentAsync(id, schoolId, request);
                if (student == null) return NotFound();
                return Ok(student);
            }
            catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpDelete("students/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.HostelManagement)]
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

        // ── P1: Hostel Blocks ────────────────────────────────────────────────────

        [HttpGet("blocks")]
        public async Task<IActionResult> GetBlocks()
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            return Ok(await _hostelService.GetBlocksAsync(schoolId));
        }

        [HttpGet("blocks/{id:guid}")]
        public async Task<IActionResult> GetBlock(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result = await _hostelService.GetBlockByIdAsync(id, schoolId);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpPost("blocks")]
        public async Task<IActionResult> CreateBlock([FromBody] CreateHostelBlockRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _hostelService.CreateBlockAsync(schoolId, request);
                return CreatedAtAction(nameof(GetBlock), new { id = result.Id }, result);
            }
            catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpPut("blocks/{id:guid}")]
        public async Task<IActionResult> UpdateBlock(Guid id, [FromBody] CreateHostelBlockRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _hostelService.UpdateBlockAsync(id, schoolId, request);
                return result == null ? NotFound() : Ok(result);
            }
            catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpDelete("blocks/{id:guid}")]
        public async Task<IActionResult> DeleteBlock(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result = await _hostelService.DeleteBlockAsync(id, schoolId);
            return result ? NoContent() : NotFound();
        }

        // ── P1: Mess Billing ─────────────────────────────────────────────────────

        [HttpGet("mess-billings")]
        public async Task<IActionResult> GetMessBillings([FromQuery] Guid? hostelStudentId, [FromQuery] string? month)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            return Ok(await _hostelService.GetMessBillingsAsync(schoolId, hostelStudentId, month));
        }

        [HttpPost("mess-billings")]
        public async Task<IActionResult> CreateMessBilling([FromBody] CreateHostelMessBillingRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _hostelService.CreateMessBillingAsync(schoolId, request);
                return StatusCode(201, result);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpPut("mess-billings/{id:guid}/pay")]
        public async Task<IActionResult> MarkMessBillingPaid(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result = await _hostelService.MarkMessBillingPaidAsync(id, schoolId);
            return result == null ? NotFound() : Ok(result);
        }

        // ── P1: Visitor Log ──────────────────────────────────────────────────────

        [HttpGet("visitor-logs")]
        public async Task<IActionResult> GetVisitorLogs([FromQuery] Guid? hostelStudentId)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            return Ok(await _hostelService.GetVisitorLogsAsync(schoolId, hostelStudentId));
        }

        [HttpPost("visitor-logs")]
        public async Task<IActionResult> CreateVisitorLog([FromBody] CreateHostelVisitorLogRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _hostelService.CreateVisitorLogAsync(schoolId, request);
                return StatusCode(201, result);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpPut("visitor-logs/{id:guid}/checkout")]
        public async Task<IActionResult> CheckOutVisitor(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result = await _hostelService.CheckOutVisitorAsync(id, schoolId);
            return result == null ? NotFound() : Ok(result);
        }

        // ── P1: Hostel Leave ─────────────────────────────────────────────────────

        [HttpGet("leaves")]
        public async Task<IActionResult> GetLeaves([FromQuery] Guid? hostelStudentId, [FromQuery] string? status)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            return Ok(await _hostelService.GetLeavesAsync(schoolId, hostelStudentId, status));
        }

        [HttpPost("leaves")]
        public async Task<IActionResult> CreateLeave([FromBody] CreateHostelLeaveRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _hostelService.CreateLeaveAsync(schoolId, request);
                return StatusCode(201, result);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpPut("leaves/{id:guid}/approve")]
        public async Task<IActionResult> ApproveLeave(Guid id, [FromBody] ApproveHostelLeaveRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var userId = _tenant.UserId;
                var result = await _hostelService.ApproveLeaveAsync(id, schoolId, userId, request.Status, request.Remarks);
                return result == null ? NotFound() : Ok(result);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }
    }
}
