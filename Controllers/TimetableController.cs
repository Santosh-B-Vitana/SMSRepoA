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
    public class TimetableController : ControllerBase
    {
        private readonly ITimetableService _timetableService;
        private readonly ITenantContext _tenant;

        public TimetableController(ITimetableService timetableService, ITenantContext tenant)
        {
            _timetableService = timetableService;
            _tenant = tenant;
        }

        // Timetable Endpoints
        /// <summary>
        /// Get timetables for the authenticated user's school. Respects X-Academic-Year header for year-scoped filtering.
        /// </summary>
        [HttpGet]
        [Authorize(Roles = StatusConstants.RoleGroups.StudentView)]
        [ProducesResponseType(200)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        [ProducesResponseType(500)]
        public async Task<ActionResult<TimetableListResponse>> GetTimetables(
            [FromQuery] Guid? classId = null,
            [FromQuery] Guid? sectionId = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? academicYear = null)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var headerYear = HttpContext.Items["AcademicYearHeaderValue"] as string;
                var effectiveYear = !string.IsNullOrWhiteSpace(academicYear) ? academicYear : headerYear;
                var result = await _timetableService.GetTimetablesAsync(schoolId, classId, sectionId, page, pageSize, effectiveYear);
                return Ok(result);
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (Exception)
            {
                return StatusCode(500, new { message = "An error occurred while fetching timetables." });
            }
        }

        [HttpGet("{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(200)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        [ProducesResponseType(404)]
        [ProducesResponseType(500)]
        public async Task<ActionResult<TimetableResponse>> GetTimetableById(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var timetable = await _timetableService.GetTimetableByIdAsync(id, schoolId);
                if (timetable == null)
                {
                    return NotFound(new { message = "Timetable not found" });
                }
                return Ok(timetable);
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (Exception)
            {
                return StatusCode(500, new { message = "An error occurred while fetching the timetable." });
            }
        }

        [HttpGet("{id}/detail")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(200)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        [ProducesResponseType(404)]
        [ProducesResponseType(500)]
        public async Task<ActionResult<TimetableDetailResponse>> GetTimetableWithPeriods(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var timetable = await _timetableService.GetTimetableWithPeriodsAsync(id, schoolId);
                if (timetable == null)
                {
                    return NotFound(new { message = "Timetable not found" });
                }
                return Ok(timetable);
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (Exception)
            {
                return StatusCode(500, new { message = "An error occurred while fetching the timetable." });
            }
        }

        [HttpPost]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        [ProducesResponseType(201)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        [ProducesResponseType(500)]
        public async Task<ActionResult<TimetableResponse>> CreateTimetable([FromBody] CreateTimetableRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                request.SchoolId = schoolId;
                var timetable = await _timetableService.CreateTimetableAsync(request);
                return CreatedAtAction(nameof(GetTimetableById), new { id = timetable.Id }, timetable);
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
            catch (UnauthorizedAccessException ex)
            {
                return Forbid();
            }
            catch (Exception)
            {
                return StatusCode(500, new { message = "An error occurred while creating the timetable." });
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        [ProducesResponseType(200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        [ProducesResponseType(404)]
        [ProducesResponseType(500)]
        public async Task<ActionResult<TimetableResponse>> UpdateTimetable(Guid id, [FromBody] CreateTimetableRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var timetable = await _timetableService.UpdateTimetableAsync(id, schoolId, request);
                return Ok(timetable);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Timetable not found" });
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (Exception)
            {
                return StatusCode(500, new { message = "An error occurred while updating the timetable." });
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        [ProducesResponseType(204)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        [ProducesResponseType(404)]
        [ProducesResponseType(500)]
        public async Task<ActionResult> DeleteTimetable(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _timetableService.DeleteTimetableAsync(id, schoolId);
                if (!result)
                {
                    return NotFound(new { message = "Timetable not found" });
                }
                return NoContent();
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (Exception)
            {
                return StatusCode(500, new { message = "An error occurred while deleting the timetable." });
            }
        }

        // Periods Endpoints
        [HttpGet("{timetableId}/periods")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(200)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        [ProducesResponseType(500)]
        public async Task<ActionResult<TimetablePeriodListResponse>> GetPeriods(Guid timetableId)
        {
            try
            {
                var result = await _timetableService.GetPeriodsAsync(timetableId);
                return Ok(result);
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (Exception)
            {
                return StatusCode(500, new { message = "An error occurred while fetching periods." });
            }
        }

        [HttpPost("periods")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        [ProducesResponseType(200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        [ProducesResponseType(404)]
        [ProducesResponseType(500)]
        public async Task<ActionResult<TimetablePeriodResponse>> CreatePeriod([FromBody] CreateTimetablePeriodRequest request)
        {
            try
            {
                var result = await _timetableService.CreatePeriodAsync(request);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (TeacherConflictException ex)
            {
                return Conflict(new { message = ex.Message, conflictInfo = ex.ConflictInfo });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (Exception)
            {
                return StatusCode(500, new { message = "An error occurred while creating the period." });
            }
        }

        [HttpPut("periods/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        [ProducesResponseType(200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        [ProducesResponseType(404)]
        [ProducesResponseType(500)]
        public async Task<ActionResult<TimetablePeriodResponse>> UpdatePeriod(Guid id, [FromBody] UpdateTimetablePeriodRequest request)
        {
            try
            {
                var period = await _timetableService.UpdatePeriodAsync(id, request);
                return Ok(period);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (TeacherConflictException ex)
            {
                return Conflict(new { message = ex.Message, conflictInfo = ex.ConflictInfo });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Period not found" });
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (Exception)
            {
                return StatusCode(500, new { message = "An error occurred while updating the period." });
            }
        }

        [HttpDelete("periods/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        [ProducesResponseType(204)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        [ProducesResponseType(404)]
        [ProducesResponseType(500)]
        public async Task<ActionResult> DeletePeriod(Guid id)
        {
            try
            {
                var result = await _timetableService.DeletePeriodAsync(id);
                if (!result)
                {
                    return NotFound(new { message = "Period not found" });
                }
                return NoContent();
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (Exception)
            {
                return StatusCode(500, new { message = "An error occurred while deleting the period." });
            }
        }

        // Teacher Schedule Endpoint
        /// <summary>
        /// Get the calling teacher's personal timetable — resolved automatically from JWT email.
        /// </summary>
        [HttpGet("my-schedule")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(200)]
        [ProducesResponseType(401)]
        [ProducesResponseType(404)]
        [ProducesResponseType(500)]
        public async Task<ActionResult<TeacherScheduleResponse>> GetMySchedule()
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var email = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
                if (string.IsNullOrWhiteSpace(email))
                    return Unauthorized();
                var schedule = await _timetableService.GetMyScheduleAsync(email, schoolId);
                if (schedule == null)
                    return NotFound(new { message = "No schedule found. You may not be assigned to any classes yet." });
                return Ok(schedule);
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (Exception)
            {
                return StatusCode(500, new { message = "An error occurred while fetching your schedule." });
            }
        }

        /// <summary>
        /// Get timetable/schedule for a specific teacher. Accessible by all staff roles.
        /// Staff can only view their own schedule; Admin/Principal can view any teacher's schedule.
        /// </summary>
        [HttpGet("teacher/{teacherId}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(200)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        [ProducesResponseType(404)]
        [ProducesResponseType(500)]
        public async Task<ActionResult<TeacherScheduleResponse>> GetTeacherSchedule(Guid teacherId)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var schedule = await _timetableService.GetTeacherScheduleAsync(teacherId, schoolId);
                if (schedule == null)
                {
                    return NotFound(new { message = "Teacher not found" });
                }
                return Ok(schedule);
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (Exception)
            {
                return StatusCode(500, new { message = "An error occurred while fetching teacher schedule." });
            }
        }
    }
}
