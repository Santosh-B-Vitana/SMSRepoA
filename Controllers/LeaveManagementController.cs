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
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class LeaveManagementController : ControllerBase
    {
        private readonly ILeaveManagementService _leaveManagementService;

        public LeaveManagementController(ILeaveManagementService leaveManagementService)
        {
            _leaveManagementService = leaveManagementService;
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

        private string? GetCallerRole()
            => User.FindFirst(ClaimTypes.Role)?.Value ?? User.FindFirst("role")?.Value;

        // Leave Types
        [HttpGet("types")]
        [Authorize(Roles = "Admin,Principal,Teacher,Staff,HRManager,Parent")]
        public async Task<ActionResult<LeaveTypeListResponse>> GetLeaveTypes([FromQuery] string? applicableTo = null)
        {
            var schoolId = GetSchoolId();
            if (schoolId == Guid.Empty)
                return Unauthorized();

            var response = await _leaveManagementService.GetLeaveTypesAsync(schoolId, applicableTo);
            return Ok(response);
        }

        [HttpPost("types")]
        [Authorize(Roles = "Admin,Principal,HRManager")]
        public async Task<ActionResult<LeaveTypeResponse>> CreateLeaveType([FromBody] CreateLeaveTypeRequest request)
        {
            var schoolId = GetSchoolId();
            var userId = GetUserId();
            if (schoolId == Guid.Empty)
                return Unauthorized();

            request.SchoolId = schoolId;
            request.CreatedBy = userId;

            try
            {
                var leaveType = await _leaveManagementService.CreateLeaveTypeAsync(request);
                return Ok(leaveType);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("types/{id}")]
        [Authorize(Roles = "Admin,Principal,HRManager")]
        public async Task<ActionResult<LeaveTypeResponse>> UpdateLeaveType(Guid id, [FromBody] UpdateLeaveTypeRequest request)
        {
            var schoolId = GetSchoolId();
            var userId = GetUserId();
            if (schoolId == Guid.Empty)
                return Unauthorized();

            request.UpdatedBy = userId;

            try
            {
                var leaveType = await _leaveManagementService.UpdateLeaveTypeAsync(id, request, schoolId);
                return Ok(leaveType);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // Leave Requests
        [HttpGet("requests")]
        [Authorize(Roles = "Admin,Principal,HRManager")]
        public async Task<ActionResult<LeaveRequestListResponse>> GetLeaveRequests(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] Guid? applicantId = null,
            [FromQuery] string? status = null,
            [FromQuery] string? staffEmail = null)
        {
            var schoolId = GetSchoolId();
            if (schoolId == Guid.Empty)
                return Unauthorized();

            var response = await _leaveManagementService.GetLeaveRequestsAsync(schoolId, page, pageSize, applicantId, status, staffEmail);
            return Ok(response);
        }

        [HttpGet("requests/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        public async Task<ActionResult<LeaveRequestResponse>> GetLeaveRequestById(Guid id)
        {
            var schoolId = GetSchoolId();
            if (schoolId == Guid.Empty)
                return Unauthorized();

            var request = await _leaveManagementService.GetLeaveRequestByIdAsync(id, schoolId);
            if (request == null)
                return NotFound();

            return Ok(request);
        }

        // Staff: get only MY leave requests (auto-scoped to current user)
        [HttpGet("my-requests")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        public async Task<ActionResult<LeaveRequestListResponse>> GetMyLeaveRequests(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? status = null)
        {
            var schoolId = GetSchoolId();
            var userId = GetUserId();
            if (schoolId == Guid.Empty || userId == Guid.Empty)
                return Unauthorized();

            var response = await _leaveManagementService.GetLeaveRequestsAsync(schoolId, page, pageSize, userId, status);
            return Ok(response);
        }

        [HttpPost("requests")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        public async Task<ActionResult<LeaveRequestResponse>> CreateLeaveRequest([FromBody] CreateLeaveRequestRequest request)
        {
            var schoolId = GetSchoolId();
            var userId = GetUserId();
            if (schoolId == Guid.Empty)
                return Unauthorized();

            request.SchoolId = schoolId;
            request.ApplicantId = userId;
            request.ApplicantType = "Staff";

            try
            {
                var leaveRequest = await _leaveManagementService.CreateLeaveRequestAsync(request);
                return CreatedAtAction(nameof(GetLeaveRequestById), new { id = leaveRequest.Id }, leaveRequest);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("requests/{id}/approve")]
        [Authorize(Roles = "Admin,Principal,HRManager")]
        public async Task<ActionResult<LeaveRequestResponse>> ApproveLeave(Guid id, [FromBody] ApproveLeaveRequest request)
        {
            var schoolId = GetSchoolId();
            var userId = GetUserId();
            if (schoolId == Guid.Empty)
                return Unauthorized();

            request.ApprovedBy = userId;

            try
            {
                var leaveRequest = await _leaveManagementService.ApproveLeaveAsync(id, request, schoolId);
                return Ok(leaveRequest);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("requests/{id}/reject")]
        [Authorize(Roles = "Admin,Principal,HRManager")]
        public async Task<ActionResult<LeaveRequestResponse>> RejectLeave(Guid id, [FromBody] RejectLeaveRequest request)
        {
            var schoolId = GetSchoolId();
            var userId = GetUserId();
            if (schoolId == Guid.Empty)
                return Unauthorized();

            request.RejectedBy = userId;

            try
            {
                var leaveRequest = await _leaveManagementService.RejectLeaveAsync(id, request, schoolId);
                return Ok(leaveRequest);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("balance/{userId}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        public async Task<ActionResult<LeaveBalanceResponse>> GetLeaveBalance(Guid userId, [FromQuery] string userType)
        {
            var schoolId = GetSchoolId();
            var currentUserId = GetUserId();
            if (schoolId == Guid.Empty)
                return Unauthorized();

            var isPrivileged = User.IsInRole(StatusConstants.Roles.Admin)
                               || User.IsInRole(StatusConstants.Roles.Principal)
                               || User.IsInRole("HRManager");
            if (!isPrivileged && currentUserId != userId)
            {
                return Forbid();
            }

            try
            {
                var balance = await _leaveManagementService.GetLeaveBalanceAsync(userId, userType, schoolId);
                return Ok(balance);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // ── Student Leave Endpoints (parent-initiated, teacher/admin managed) ─────

        /// <summary>Parent submits a leave request for their child.</summary>
        [HttpPost("student-leave")]
        [Authorize(Roles = "Parent")]
        public async Task<ActionResult<StudentLeaveResponse>> CreateStudentLeave([FromBody] CreateStudentLeaveRequest request)
        {
            var schoolId = GetSchoolId();
            if (schoolId == Guid.Empty) return Unauthorized();

            var parentEmail = User.FindFirst(ClaimTypes.Email)?.Value;
            if (string.IsNullOrWhiteSpace(parentEmail)) return Unauthorized();

            try
            {
                var result = await _leaveManagementService.CreateStudentLeaveAsync(parentEmail, request, schoolId);
                return Ok(result);
            }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        /// <summary>Parent views their child's leave requests.</summary>
        [HttpGet("student-leave/my-children")]
        [Authorize(Roles = "Parent")]
        public async Task<ActionResult<StudentLeaveListResponse>> GetMyChildrenLeaves(
            [FromQuery] Guid? studentId,
            [FromQuery] string? status,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            var schoolId = GetSchoolId();
            if (schoolId == Guid.Empty) return Unauthorized();

            var result = await _leaveManagementService.GetStudentLeaveRequestsAsync(schoolId, page, pageSize, studentId, status);
            return Ok(result);
        }

        /// <summary>Staff/Admin view student leave requests. Teachers see only their assigned classes.</summary>
        [HttpGet("student-leaves")]
        [Authorize(Roles = "Admin,Principal,Teacher,Staff,HRManager")]
        public async Task<ActionResult<StudentLeaveListResponse>> GetStudentLeaves(
            [FromQuery] Guid? studentId,
            [FromQuery] string? status,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var schoolId = GetSchoolId();
            if (schoolId == Guid.Empty) return Unauthorized();

            var userId = GetUserId();
            var role = GetCallerRole();
            var result = await _leaveManagementService.GetStudentLeaveRequestsAsync(schoolId, page, pageSize, studentId, status, userId, role);
            return Ok(result);
        }

        /// <summary>Staff/Admin approves a student leave request (attendance auto-marked). Class teachers can only approve for their class.</summary>
        [HttpPost("student-leaves/{id}/approve")]
        [Authorize(Roles = "Admin,Principal,Teacher,Staff,HRManager")]
        public async Task<ActionResult<StudentLeaveResponse>> ApproveStudentLeave(Guid id, [FromBody] ApproveLeaveRequest request)
        {
            var schoolId = GetSchoolId();
            var userId = GetUserId();
            if (schoolId == Guid.Empty) return Unauthorized();

            request.ApprovedBy = userId;
            try
            {
                var result = await _leaveManagementService.ApproveStudentLeaveAsync(id, request, schoolId, userId, GetCallerRole());
                return Ok(result);
            }
            catch (KeyNotFoundException) { return NotFound(); }
            catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        /// <summary>Staff/Admin rejects a student leave request. Class teachers can only deny for their class.</summary>
        [HttpPost("student-leaves/{id}/reject")]
        [Authorize(Roles = "Admin,Principal,Teacher,Staff,HRManager")]
        public async Task<ActionResult<StudentLeaveResponse>> RejectStudentLeave(Guid id, [FromBody] RejectLeaveRequest request)
        {
            var schoolId = GetSchoolId();
            var userId = GetUserId();
            if (schoolId == Guid.Empty) return Unauthorized();

            request.RejectedBy = userId;
            try
            {
                var result = await _leaveManagementService.RejectStudentLeaveAsync(id, request, schoolId, userId, GetCallerRole());
                return Ok(result);
            }
            catch (KeyNotFoundException) { return NotFound(); }
            catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }
    }
}
