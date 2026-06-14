using SmsApi.Models.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace SmsApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class AttendanceController : ControllerBase
    {
        private readonly IAttendanceService _service;
        private readonly IAcademicYearContextService _yearContextService;
        private readonly ITenantContext _tenant;
        private readonly ILogger<AttendanceController> _logger;
        private readonly AppDbContext _context;
        private readonly IParentAuthorizationService _parentAuth;

        public AttendanceController(
            IAttendanceService service,
            IAcademicYearContextService yearContextService,
            ILogger<AttendanceController> logger,
            ITenantContext tenant,
            AppDbContext context,
            IParentAuthorizationService parentAuth)
        {
            _service = service;
            _yearContextService = yearContextService;
            _logger = logger;
            _tenant = tenant;
            _context = context;
            _parentAuth = parentAuth;
        }

        /// <summary>
        /// Get SchoolId from JWT claims - uses SecurityHelper
        /// </summary>
        private Guid GetSchoolId()
        {
            try
            {
                return _tenant.GetEffectiveSchoolId();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to extract SchoolId from claims");
                throw new UnauthorizedAccessException("Invalid or missing SchoolId in claims");
            }
        }

        /// <summary>
        /// Get UserId from JWT claims - uses SecurityHelper
        /// </summary>
        private Guid GetUserId()
        {
            try
            {
                return _tenant.UserId;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to extract UserId from claims");
                throw new UnauthorizedAccessException("Invalid or missing UserId in claims");
            }
        }

        /// <summary>
        /// Checks whether the logged-in staff member is the active class teacher
        /// for the section to which the given student belongs.
        /// </summary>
        private async Task<bool> IsClassTeacherForStudentAsync(Guid schoolId, Guid studentId)
        {
            var userEmail = _tenant.UserEmail;
            if (string.IsNullOrWhiteSpace(userEmail)) return false;

            var staffId = await _context.StaffMembers
                .Where(s => s.SchoolId == schoolId && s.Email == userEmail && !s.IsDeleted)
                .Select(s => (Guid?)s.Id)
                .FirstOrDefaultAsync();
            if (staffId == null) return false;

            var student = await _context.Students
                .Where(s => s.Id == studentId && s.SchoolId == schoolId)
                .Select(s => new { s.Class, s.Section })
                .FirstOrDefaultAsync();
            if (student == null) return false;

            var sectionId = await ResolveSectionIdAsync(schoolId, student.Class, student.Section);

            if (sectionId == null)
                return false;

            return await _context.TeacherAssignments
                .AnyAsync(ta => ta.SchoolId == schoolId
                    && ta.StaffId == staffId.Value
                    && ta.SectionId == sectionId.Value
                    && ta.IsClassTeacher
                    && ta.Status == "active"
                    && !ta.IsDeleted);
        }

        /// <summary>
        /// Returns true only if the logged-in staff member is the class teacher
        /// for ALL sections to which the given students belong.
        /// </summary>
        private async Task<bool> IsClassTeacherForAllStudentsAsync(Guid schoolId, List<Guid> studentIds)
        {
            if (studentIds.Count == 0) return true;

            var userEmail = _tenant.UserEmail;
            if (string.IsNullOrWhiteSpace(userEmail)) return false;

            var staffId = await _context.StaffMembers
                .Where(s => s.SchoolId == schoolId && s.Email == userEmail && !s.IsDeleted)
                .Select(s => (Guid?)s.Id)
                .FirstOrDefaultAsync();
            if (staffId == null) return false;

            var pairs = await _context.Students
                .Where(s => s.SchoolId == schoolId && studentIds.Contains(s.Id))
                .Select(s => new { s.Class, s.Section })
                .Distinct()
                .ToListAsync();

            foreach (var pair in pairs)
            {
                var sectionId = await ResolveSectionIdAsync(schoolId, pair.Class, pair.Section);
                if (sectionId == null) return false;

                var isClassTeacher = await _context.TeacherAssignments
                    .AnyAsync(ta => ta.SchoolId == schoolId
                        && ta.StaffId == staffId.Value
                        && ta.SectionId == sectionId.Value
                        && ta.IsClassTeacher
                        && ta.Status == "active"
                        && !ta.IsDeleted);

                if (!isClassTeacher) return false;
            }

            return true;
        }

        /// <summary>
        /// Resolves the Section.Id from class name + section name.
        /// </summary>
        private async Task<Guid?> ResolveSectionIdAsync(Guid schoolId, string className, string sectionName)
        {
            var classId = await _context.Classes
                .Where(c => c.SchoolId == schoolId && c.Name == className)
                .Select(c => (Guid?)c.Id)
                .FirstOrDefaultAsync();
            if (classId == null) return null;

            return await _context.Sections
                .Where(s => s.SchoolId == schoolId && s.ClassId == classId.Value && s.Name == sectionName)
                .Select(s => (Guid?)s.Id)
                .FirstOrDefaultAsync();
        }

        // ========== NEW ATTENDANCE RECORDS API ==========

        /// <summary>
        /// Get paginated attendance records with filters
        /// </summary>
        [HttpGet("records")]
        [ProducesResponseType(typeof(PaginatedResponse<AttendanceRecordBasicDto>), 200)]
        public async Task<ActionResult<PaginatedResponse<AttendanceRecordBasicDto>>> GetAttendanceRecords(
            [FromQuery] AttendanceFiltersDto filters,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            try
            {
                var schoolId = GetSchoolId();

                // Role-based data isolation for attendance records
                var userRole = User.FindFirst(ClaimTypes.Role)?.Value ?? "";

                if (userRole == "Student")
                {
                    // Student: always force to own LinkedEntityId — never accept arbitrary studentId
                    var linkedId = _tenant.LinkedEntityId;
                    if (!linkedId.HasValue || linkedId == Guid.Empty)
                        return StatusCode(403, new { message = "Student identity could not be resolved from token." });
                    filters.StudentId = linkedId.Value;
                }
                else if (userRole == "Parent")
                {
                    if (!filters.StudentId.HasValue)
                        return BadRequest(new { message = "studentId is required for Parent role." });

                    var parentEmail = _tenant.UserEmail ?? string.Empty;
                    var canAccess = await _parentAuth.CanAccessStudentAsync(schoolId, parentEmail, filters.StudentId.Value);
                    if (!canAccess)
                        return StatusCode(403, new { message = "Parents can only access their own child's attendance records." });
                }

                // Resolve effective academic year from header
                var headerYear = (string?)HttpContext.Items["AcademicYearHeaderValue"] ?? "";
                var effectiveYear = await _yearContextService.GetEffectiveYearAsync(
                    schoolId,
                    string.IsNullOrWhiteSpace(headerYear) ? null : headerYear,
                    filters.AcademicYear);
                
                if (string.IsNullOrWhiteSpace(filters.AcademicYear))
                {
                    filters.AcademicYear = effectiveYear;
                }
                
                var result = await _service.GetAttendanceRecordsAsync(schoolId, filters, page, pageSize);
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
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting attendance records");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Get attendance record by ID (Full DTO)
        /// </summary>
        [HttpGet("records/{id}")]
        [ProducesResponseType(typeof(AttendanceRecordFullDto), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<AttendanceRecordFullDto>> GetAttendanceById(Guid id)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetAttendanceByIdAsync(schoolId, id);
                
                if (result == null)
                    return NotFound(new { message = "Attendance record not found" });
                
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting attendance {Id}", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Mark attendance for a student (Teachers and Admin only)
        /// </summary>
        [HttpPost("records")]
        [Authorize(Roles = "Admin,Principal,Teacher,Staff")]
        [ProducesResponseType(typeof(AttendanceRecordFullDto), 201)]
        [ProducesResponseType(400)]
        public async Task<ActionResult<AttendanceRecordFullDto>> MarkAttendance([FromBody] MarkAttendanceDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();

                // Non-admin/principal roles must be the class teacher for the student's section
                var userRole = User.FindFirst(ClaimTypes.Role)?.Value ?? "";
                if (userRole != "Admin" && userRole != "Principal")
                {
                    var authorized = await IsClassTeacherForStudentAsync(schoolId, dto.StudentId);
                    if (!authorized)
                        return StatusCode(403, new { message = "Only the class teacher of this section may mark attendance." });
                }

                var result = await _service.MarkAttendanceAsync(schoolId, dto, userId);
                return CreatedAtAction(nameof(GetAttendanceById), new { id = result.Id }, result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking attendance");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Bulk mark attendance for multiple students (Teachers and Admin only)
        /// </summary>
        [HttpPost("records/bulk")]
        [Authorize(Roles = "Admin,Principal,Teacher,Staff")]
        [ProducesResponseType(typeof(List<AttendanceRecordBasicDto>), 201)]
        public async Task<ActionResult<List<AttendanceRecordBasicDto>>> BulkMarkAttendance(
            [FromBody] BulkMarkAttendanceDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();

                // Non-admin/principal roles must be the class teacher for every student's section
                var userRole = User.FindFirst(ClaimTypes.Role)?.Value ?? "";
                if (userRole != "Admin" && userRole != "Principal")
                {
                    var studentIds = dto.Attendances.Select(a => a.StudentId).ToList();
                    var authorized = await IsClassTeacherForAllStudentsAsync(schoolId, studentIds);
                    if (!authorized)
                        return StatusCode(403, new { message = "Only the class teacher of this section may mark attendance." });
                }

                var result = await _service.BulkMarkAttendanceAsync(schoolId, dto, userId);
                return CreatedAtAction(nameof(GetAttendanceRecords), null, result);
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
                _logger.LogError(ex, "Error bulk marking attendance");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Update attendance record
        /// </summary>
        [HttpPut("records/{id}")]
        [ProducesResponseType(typeof(AttendanceRecordFullDto), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<AttendanceRecordFullDto>> UpdateAttendance(
            Guid id, 
            [FromBody] UpdateAttendanceDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                var result = await _service.UpdateAttendanceAsync(schoolId, id, dto, userId);
                
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Attendance record not found" });
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
                _logger.LogError(ex, "Error updating attendance {Id}", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Delete attendance record
        /// </summary>
        [HttpDelete("records/{id}")]
        [ProducesResponseType(204)]
        [ProducesResponseType(404)]
        public async Task<ActionResult> DeleteAttendance(Guid id)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.DeleteAttendanceAsync(schoolId, id);
                
                if (!result)
                    return NotFound(new { message = "Attendance record not found" });
                
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting attendance {Id}", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // ========== LEAVE REQUESTS ==========

        /// <summary>
        /// Get paginated leave requests
        /// </summary>
        [HttpGet("leave-requests")]
        [ProducesResponseType(typeof(PaginatedResponse<LeaveRequestBasicDto>), 200)]
        public async Task<ActionResult<PaginatedResponse<LeaveRequestBasicDto>>> GetLeaveRequests(
            [FromQuery] LeaveRequestFiltersDto filters,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetLeaveRequestsAsync(schoolId, filters, page, pageSize);
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
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting leave requests");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Get leave request by ID (Full DTO)
        /// </summary>
        [HttpGet("leave-requests/{id}")]
        [ProducesResponseType(typeof(LeaveRequestFullDto), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<LeaveRequestFullDto>> GetLeaveRequestById(Guid id)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetLeaveRequestByIdAsync(schoolId, id);
                
                if (result == null)
                    return NotFound(new { message = "Leave request not found" });
                
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting leave request {Id}", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Create leave request
        /// </summary>
        [HttpPost("leave-requests")]
        [ProducesResponseType(typeof(LeaveRequestFullDto), 201)]
        public async Task<ActionResult<LeaveRequestFullDto>> CreateLeaveRequest(
            [FromBody] CreateLeaveRequestDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.CreateLeaveRequestAsync(schoolId, dto);
                
                return CreatedAtAction(nameof(GetLeaveRequestById), new { id = result.Id }, result);
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
                _logger.LogError(ex, "Error creating leave request");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Approve leave request
        /// </summary>
        [HttpPut("leave-requests/{id}/approve")]
        [Authorize(Roles = "Admin,Principal,HRManager,Teacher")]
        [ProducesResponseType(typeof(LeaveRequestFullDto), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<LeaveRequestFullDto>> ApproveLeaveRequest(
            Guid id, 
            [FromBody] ApproveLeaveRequestDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                var result = await _service.ApproveLeaveRequestAsync(schoolId, id, userId, dto.Remarks);
                
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Leave request not found" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error approving leave request {Id}", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Reject leave request
        /// </summary>
        [HttpPut("leave-requests/{id}/reject")]
        [Authorize(Roles = "Admin,Principal,HRManager,Teacher")]
        [ProducesResponseType(typeof(LeaveRequestFullDto), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<LeaveRequestFullDto>> RejectLeaveRequest(
            Guid id, 
            [FromBody] RejectLeaveRequestDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                var result = await _service.RejectLeaveRequestAsync(schoolId, id, userId, dto.Reason ?? "No reason provided");
                
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Leave request not found" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error rejecting leave request {Id}", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // ========== STATISTICS ==========

        /// <summary>
        /// Get attendance statistics
        /// </summary>
        [HttpGet("stats")]
        [ProducesResponseType(typeof(AttendanceStatsDto), 200)]
        public async Task<ActionResult<AttendanceStatsDto>> GetStats(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetAttendanceStatsAsync(schoolId, startDate, endDate);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting stats");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Get monthly attendance trend
        /// </summary>
        [HttpGet("monthly-trend")]
        [ProducesResponseType(typeof(List<MonthlyAttendanceDto>), 200)]
        public async Task<ActionResult<List<MonthlyAttendanceDto>>> GetMonthlyTrend([FromQuery] int year)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetMonthlyTrendAsync(schoolId, year);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting monthly trend");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // ========== LEGACY ENDPOINTS (backward compatibility) ==========

        [HttpGet("students")]
        [Authorize(Roles = "Admin,Principal,Teacher,HRManager,Student,Parent")]
        public async Task<ActionResult> GetStudentAttendances(
            [FromQuery] DateTime? date = null,
            [FromQuery] Guid? studentId = null,
            [FromQuery] string? classFilter = null,
            [FromQuery] int? month = null,
            [FromQuery] int? year = null)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? "";

                if (userRole == "Student")
                {
                    // Student: always override to own LinkedEntityId — no IDOR fallback
                    var linkedId = _tenant.LinkedEntityId;
                    if (!linkedId.HasValue || linkedId == Guid.Empty)
                        return StatusCode(403, new { message = "Student identity could not be resolved from token." });
                    studentId = linkedId.Value;
                }
                else if (userRole == "Parent")
                {
                    if (!studentId.HasValue)
                        return BadRequest(new { message = "studentId is required for Parent role." });
                    var parentEmail = _tenant.UserEmail ?? string.Empty;
                    var canAccess = await _parentAuth.CanAccessStudentAsync(schoolId, parentEmail, studentId.Value);
                    if (!canAccess)
                        return StatusCode(403, new { message = "Parents can only access their own child's attendance records." });
                }

                // If month/year supplied, build a date range for filtering
                if (!date.HasValue && month.HasValue && year.HasValue)
                {
                    date = new DateTime(year.Value, month.Value, 1, 0, 0, 0, DateTimeKind.Utc);
                }

                var attendances = await _service.GetStudentAttendancesAsync(schoolId, date, studentId, classFilter);
                return Ok(attendances);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred while fetching student attendances." });
            }
        }

        [HttpPost("students")]
        [Authorize(Roles = "Admin,Principal,Teacher,Staff")]
        public async Task<ActionResult<StudentAttendanceResponse>> CreateStudentAttendance([FromBody] CreateStudentAttendanceRequest request)
        {
            try
            {
                request.SchoolId = GetSchoolId();
                var attendance = await _service.CreateStudentAttendanceAsync(request);
                return Ok(attendance);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred while creating the attendance.", error = ex.Message });
            }
        }

        [HttpPost("students/bulk")]
        [Authorize(Roles = "Admin,Principal,Teacher,Staff")]
        public async Task<ActionResult> CreateBulkStudentAttendance([FromBody] BulkStudentAttendanceRequest request)
        {
            try
            {
                request.SchoolId = GetSchoolId();
                foreach (var item in request.Attendances)
                {
                    item.SchoolId = request.SchoolId;
                }
                await _service.CreateBulkStudentAttendanceAsync(request);
                return Ok(new { message = "Bulk attendance created successfully." });
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred while creating bulk attendance.", error = ex.Message });
            }
        }

        /// <summary>
        /// GET /api/Attendance/my-attendance — Staff self-view: returns the calling staff member's own attendance records.
        /// Resolves staffId from JWT (LinkedEntityId or email fallback). View-only; no editing.
        /// </summary>
        [HttpGet("my-attendance")]
        [Authorize(Roles = "Admin,Principal,Teacher,Staff,HRManager,Accountant,Librarian,TransportManager,HostelWarden,Receptionist")]
        public async Task<ActionResult> GetMyAttendance(
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var userId = _tenant.UserId;

                // Resolve this user's Staff record
                var userLogin = await _context.UserLogins
                    .AsNoTracking()
                    .FirstOrDefaultAsync(u => u.Id == userId);

                Guid? staffId = null;
                if (userLogin?.LinkedEntityId != null)
                {
                    var linked = await _context.StaffMembers
                        .AsNoTracking()
                        .FirstOrDefaultAsync(s => s.Id == userLogin.LinkedEntityId && s.SchoolId == schoolId);
                    if (linked != null) staffId = linked.Id;
                }
                if (staffId == null)
                {
                    var email = _tenant.UserEmail;
                    if (!string.IsNullOrWhiteSpace(email))
                    {
                        var byEmail = await _context.StaffMembers
                            .AsNoTracking()
                            .FirstOrDefaultAsync(s => s.Email == email && s.SchoolId == schoolId);
                        if (byEmail != null) staffId = byEmail.Id;
                    }
                }
                if (staffId == null)
                    return Ok(new List<object>()); // No staff record found; return empty

                var attendances = await _service.GetStaffAttendancesAsync(schoolId, null, staffId, fromDate, toDate);
                return Ok(attendances);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetMyAttendance");
                return StatusCode(500, new { message = "An error occurred while fetching your attendance." });
            }
        }

        [HttpGet("staff")]
        [Authorize(Roles = "Admin,Principal,HRManager")]
        public async Task<ActionResult> GetStaffAttendances(
            [FromQuery] DateTime? date = null,
            [FromQuery] Guid? staffId = null,
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var attendances = await _service.GetStaffAttendancesAsync(schoolId, date, staffId, fromDate, toDate);
                return Ok(attendances);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred while fetching staff attendances." });
            }
        }

        [HttpPost("staff")]
        [Authorize(Roles = "Admin,Principal,HRManager,Teacher")]
        public async Task<ActionResult<StaffAttendanceResponse>> CreateStaffAttendance([FromBody] CreateStaffAttendanceRequest request)
        {
            try
            {
                request.SchoolId = GetSchoolId();
                var attendance = await _service.CreateStaffAttendanceAsync(request);
                return Ok(attendance);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred while creating the attendance.", error = ex.Message });
            }
        }

        [HttpPut("staff/{id:guid}")]
        [Authorize(Roles = "Admin,Principal,HRManager,Teacher")]
        public async Task<ActionResult<StaffAttendanceResponse>> UpdateStaffAttendance(Guid id, [FromBody] UpdateStaffAttendanceRequest request)
        {
            try
            {
                var schoolId = GetSchoolId();
                var attendance = await _service.UpdateStaffAttendanceAsync(id, schoolId, request);
                return Ok(attendance);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred while updating the attendance.", error = ex.Message });
            }
        }

        [HttpDelete("staff/{id:guid}")]
        [Authorize(Roles = "Admin,Principal,HRManager,Teacher")]
        public async Task<ActionResult> DeleteStaffAttendance(Guid id)
        {
            try
            {
                var schoolId = GetSchoolId();
                var record = await _context.StaffAttendances
                    .FirstOrDefaultAsync(a => a.Id == id && a.SchoolId == schoolId);
                if (record == null)
                    return NotFound(new { message = "Staff attendance record not found." });
                _context.StaffAttendances.Remove(record);
                await _context.SaveChangesAsync();
                return Ok(new { message = "Staff attendance record deleted." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error deleting staff attendance.", error = ex.Message });
            }
        }
    }
}
