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
    public class AttendanceController : ControllerBase
    {
        private readonly IAttendanceService _service;
        private readonly IAcademicYearContextService _yearContextService;
        private readonly ITenantContext _tenant;
        private readonly ILogger<AttendanceController> _logger;

        public AttendanceController(
            IAttendanceService service,
            IAcademicYearContextService yearContextService,
            ILogger<AttendanceController> logger,
            ITenantContext tenant)
        {
            _service = service;
            _yearContextService = yearContextService;
            _logger = logger;
            _tenant = tenant;
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
        [Authorize(Roles = "Admin,Principal,Teacher,ClassTeacher,Staff")]
        [ProducesResponseType(typeof(AttendanceRecordFullDto), 201)]
        [ProducesResponseType(400)]
        public async Task<ActionResult<AttendanceRecordFullDto>> MarkAttendance([FromBody] MarkAttendanceDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
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
        [Authorize(Roles = "Admin,Principal,Teacher,ClassTeacher,Staff")]
        [ProducesResponseType(typeof(List<AttendanceRecordBasicDto>), 201)]
        public async Task<ActionResult<List<AttendanceRecordBasicDto>>> BulkMarkAttendance(
            [FromBody] BulkMarkAttendanceDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
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
        [Authorize(Roles = "Admin,Principal,HRManager,ClassTeacher")]
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
        [Authorize(Roles = "Admin,Principal,HRManager,ClassTeacher")]
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
        [Authorize(Roles = "Admin,Principal,Teacher,HRManager")]
        public async Task<ActionResult> GetStudentAttendances(
            [FromQuery] DateTime? date = null,
            [FromQuery] Guid? studentId = null,
            [FromQuery] string? classFilter = null)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
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
        [Authorize(Roles = "Admin,Principal,Teacher,ClassTeacher,Staff")]
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
        [Authorize(Roles = "Admin,Principal,Teacher,ClassTeacher,Staff")]
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

        [HttpGet("staff")]
        [Authorize(Roles = "Admin,Principal,HRManager")]
        public async Task<ActionResult> GetStaffAttendances(
            [FromQuery] DateTime? date = null,
            [FromQuery] Guid? staffId = null)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var attendances = await _service.GetStaffAttendancesAsync(schoolId, date, staffId);
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
        [Authorize(Roles = "Admin,Principal,HRManager,ClassTeacher")]
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
    }
}
