using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.Entities;
using SmsApi.Services;

namespace SmsApi.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/online-classes")]
    public class OnlineClassesController : ControllerBase
    {
        private readonly IOnlineClassService _svc;
        private readonly IRecordingService _recordings;
        private readonly ITenantContext _tenant;
        private readonly AppDbContext _db;
        private readonly ILogger<OnlineClassesController> _logger;

        public OnlineClassesController(
            IOnlineClassService svc,
            IRecordingService recordings,
            ITenantContext tenant,
            AppDbContext db,
            ILogger<OnlineClassesController> logger)
        {
            _svc = svc;
            _recordings = recordings;
            _tenant = tenant;
            _db = db;
            _logger = logger;
        }

        // ── GET /api/online-classes/upcoming ────────────────────────────────
        [HttpGet("upcoming")]
        public async Task<IActionResult> GetUpcoming(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result = await _svc.GetUpcomingAsync(schoolId, _tenant.UserId, _tenant.Role ?? string.Empty, page, pageSize);
            return Ok(result);
        }

        // ── GET /api/online-classes/today ────────────────────────────────────
        [HttpGet("today")]
        public async Task<IActionResult> GetToday()
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var academicYear = HttpContext.Items["AcademicYear"]?.ToString() ?? string.Empty;
            var result = await _svc.GetTodaysClassesAsync(schoolId, _tenant.UserId, _tenant.Role ?? string.Empty, academicYear);
            return Ok(result);
        }

        // ── GET /api/online-classes/{id} ────────────────────────────────────
        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var cls = await _svc.GetByIdAsync(id, schoolId);
            if (cls is null) return NotFound(new { message = "Online class not found." });
            return Ok(cls);
        }

        // ── POST /api/online-classes ─────────────────────────────────────────
        [HttpPost]
        [Authorize(Roles = "Teacher,Admin,Principal,SuperAdmin")]
        public async Task<IActionResult> Schedule([FromBody] ScheduleOnlineClassRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var schoolId = _tenant.GetEffectiveSchoolId();
            var staffId = await ResolveStaffIdAsync();
            if (staffId == Guid.Empty)
                return Unauthorized(new { message = "Could not resolve staff identity." });

            var academicYear = HttpContext.Items["AcademicYear"]?.ToString() ?? string.Empty;
            try
            {
                var result = await _svc.ScheduleClassAsync(schoolId, staffId, academicYear, request);
                return StatusCode(201, result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "OnlineClassesController.Schedule threw: {Type} — {Message}", ex.GetType().Name, ex.Message);
                throw;
            }
        }

        // ── POST /api/online-classes/instant ────────────────────────────────
        [HttpPost("instant")]
        [Authorize(Roles = "Teacher,Admin,Principal,SuperAdmin")]
        public async Task<IActionResult> StartInstant([FromBody] InstantClassRequest? request = null)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var staffId = await ResolveStaffIdAsync();
            if (staffId == Guid.Empty)
                return Unauthorized(new { message = "Could not resolve staff identity." });

            var academicYear = HttpContext.Items["AcademicYear"]?.ToString() ?? string.Empty;
            var result = await _svc.CreateInstantClassAsync(schoolId, staffId, academicYear, request?.Title);
            return Ok(result);
        }

        // ── PATCH /api/online-classes/{id}/cancel ───────────────────────────
        [HttpPatch("{id:guid}/cancel")]
        [Authorize(Roles = "Teacher,Admin,Principal,SuperAdmin")]
        public async Task<IActionResult> Cancel(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var staffId = await ResolveStaffIdAsync();
            var success = await _svc.CancelClassAsync(id, schoolId, staffId);
            if (!success) return BadRequest(new { message = "Class could not be cancelled." });
            return NoContent();
        }

        // ── POST /api/online-classes/{id}/join ──────────────────────────────
        [HttpPost("{id:guid}/join")]
        public async Task<IActionResult> Join(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var role = _tenant.Role ?? string.Empty;
            var isHost = role is "Teacher" or "Admin" or "Principal" or "SuperAdmin";

            var displayName = await ResolveDisplayNameAsync();

            try
            {
                var result = await _svc.JoinClassAsync(id, schoolId, _tenant.UserId, displayName, isHost);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // ── POST /api/online-classes/{id}/end ───────────────────────────────
        [HttpPost("{id:guid}/end")]
        [Authorize(Roles = "Teacher,Admin,Principal,SuperAdmin")]
        public async Task<IActionResult> End(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var staffId = await ResolveStaffIdAsync();
            var success = await _svc.EndClassAsync(id, schoolId, staffId);
            if (!success) return BadRequest(new { message = "Class is not currently live." });
            return NoContent();
        }

        // ── GET /api/online-classes/{id}/attendance ──────────────────────────
        [HttpGet("{id:guid}/attendance")]
        [Authorize(Roles = "Teacher,Admin,Principal,SuperAdmin")]
        public async Task<IActionResult> GetAttendance(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result = await _svc.GetAttendanceAsync(id, schoolId);
            return Ok(result);
        }

        // ── PATCH /api/online-classes/{id}/attendance/{studentId} ────────────
        [HttpPatch("{id:guid}/attendance/{studentId:guid}")]
        [Authorize(Roles = "Teacher,Admin,Principal,SuperAdmin")]
        public async Task<IActionResult> OverrideAttendance(
            Guid id, Guid studentId, [FromBody] AttendanceOverrideRequest request)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var overriddenBy = _tenant.UserId;
            var success = await _svc.OverrideAttendanceAsync(id, studentId, schoolId, overriddenBy, request);
            if (!success) return NotFound(new { message = "Attendance record not found." });
            return NoContent();
        }

        // ── GET /api/online-classes/{id}/recordings ──────────────────────────
        [HttpGet("{id:guid}/recordings")]
        public async Task<IActionResult> GetRecordings(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var isTeacher = (_tenant.Role ?? string.Empty) is "Teacher" or "Admin" or "Principal" or "SuperAdmin";
            var result = await _recordings.GetRecordingsAsync(id, schoolId, isTeacher);
            return Ok(result);
        }

        // ── PATCH /api/online-classes/{id}/recordings/{recordingId}/restrict ─
        [HttpPatch("{id:guid}/recordings/{recordingId:guid}/restrict")]
        [Authorize(Roles = "Teacher,Admin,Principal,SuperAdmin")]
        public async Task<IActionResult> ToggleRestrict(Guid id, Guid recordingId, [FromBody] ToggleRestrictRequest request)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var success = await _recordings.ToggleTeacherRestrictAsync(recordingId, schoolId, request.IsRestricted);
            if (!success) return NotFound(new { message = "Recording not found." });
            return NoContent();
        }

        // ── DELETE /api/online-classes/{id}/recordings/{recordingId} ────────
        [HttpDelete("{id:guid}/recordings/{recordingId:guid}")]
        [Authorize(Roles = "Teacher,Admin,Principal,SuperAdmin")]
        public async Task<IActionResult> DeleteRecording(Guid id, Guid recordingId)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var success = await _recordings.DeleteRecordingAsync(recordingId, schoolId);
            if (!success) return NotFound(new { message = "Recording not found." });
            return NoContent();
        }

        // ─── Private helpers ─────────────────────────────────────────────────

        private async Task<Guid> ResolveStaffIdAsync()
        {
            var userId = _tenant.UserId;
            var userLogin = await _db.UserLogins.FirstOrDefaultAsync(u => u.Id == userId);
            if (userLogin?.LinkedEntityId.HasValue == true)
                return userLogin.LinkedEntityId.Value;

            var email = _tenant.UserEmail;
            if (!string.IsNullOrEmpty(email))
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var staff = await _db.StaffMembers
                    .FirstOrDefaultAsync(s => s.SchoolId == schoolId && s.Email == email);
                if (staff != null) return staff.Id;
            }

            return Guid.Empty;
        }

        private async Task<string> ResolveDisplayNameAsync()
        {
            var userId = _tenant.UserId;
            var userLogin = await _db.UserLogins
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (userLogin != null && !string.IsNullOrEmpty(userLogin.FirstName))
                return $"{userLogin.FirstName} {userLogin.LastName}".Trim();

            return _tenant.UserEmail ?? _tenant.UserId.ToString("N")[..8];
        }
    }

    public class InstantClassRequest
    {
        public string? Title { get; set; }
    }

    public class ToggleRestrictRequest
    {
        public bool IsRestricted { get; set; }
    }
}
