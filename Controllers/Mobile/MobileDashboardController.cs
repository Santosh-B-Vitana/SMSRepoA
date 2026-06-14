using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using SmsApi.Models.Constants;
using SmsApi.Models.DTOs;
using SmsApi.Services;
using System.Security.Claims;

namespace SmsApi.Controllers.Mobile
{
    /// <summary>
    /// Mobile dashboard aggregation endpoints.
    /// Each endpoint returns all home-screen data in a single response (< 500ms).
    /// </summary>
    [ApiController]
    [Route("api/mobile")]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class MobileDashboardController : ControllerBase
    {
        private readonly IMobileDashboardService _dashboard;
        private readonly ITenantContext _tenant;
        private readonly ILogger<MobileDashboardController> _logger;

        public MobileDashboardController(
            IMobileDashboardService dashboard,
            ITenantContext tenant,
            ILogger<MobileDashboardController> logger)
        {
            _dashboard = dashboard;
            _tenant = tenant;
            _logger = logger;
        }

        private Guid? GetUserId()
        {
            var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(raw, out var id) ? id : null;
        }

        private string GetUserEmail() =>
            User.FindFirstValue(ClaimTypes.Email)
            ?? User.FindFirstValue(ClaimTypes.Name)
            ?? _tenant.UserEmail
            ?? string.Empty;

        /// <summary>
        /// Parent home-screen data: children list, today's attendance, fee summary,
        /// latest exam result, latest announcement, and unread notification count.
        /// All 6 data points returned in one response.
        /// </summary>
        /// <response code="200">Parent dashboard data.</response>
        [HttpGet("parent-dashboard")]
        [Authorize(Roles = StatusConstants.Roles.Parent)]
        [ProducesResponseType(typeof(ParentDashboardResponse), 200)]
        public async Task<ActionResult<ParentDashboardResponse>> GetParentDashboard()
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var userId = GetUserId();
                if (userId == null)
                    return Unauthorized(new { message = "User identity not found." });

                var email = GetUserEmail();
                var result = await _dashboard.GetParentDashboardAsync(schoolId, userId.Value, email);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching parent dashboard");
                return StatusCode(500, new { message = "An error occurred." });
            }
        }

        /// <summary>
        /// Teacher home-screen data: today's schedule, pending leave count, class attendance
        /// status, unread notifications, and pending assignment submissions.
        /// </summary>
        /// <response code="200">Teacher dashboard data.</response>
        [HttpGet("teacher-dashboard")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(TeacherDashboardResponse), 200)]
        public async Task<ActionResult<TeacherDashboardResponse>> GetTeacherDashboard()
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var userId = GetUserId();
                if (userId == null)
                    return Unauthorized(new { message = "User identity not found." });

                var email = GetUserEmail();
                var result = await _dashboard.GetTeacherDashboardAsync(schoolId, userId.Value, email);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching teacher dashboard");
                return StatusCode(500, new { message = "An error occurred." });
            }
        }

        /// <summary>
        /// Student home-screen data: today's schedule, monthly attendance, latest result,
        /// upcoming assignments, latest announcement, and unread notification count.
        /// </summary>
        /// <response code="200">Student dashboard data.</response>
        [HttpGet("student-dashboard")]
        [Authorize(Roles = StatusConstants.Roles.Student)]
        [ProducesResponseType(typeof(StudentDashboardResponse), 200)]
        public async Task<ActionResult<StudentDashboardResponse>> GetStudentDashboard()
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var userId = GetUserId();
                if (userId == null)
                    return Unauthorized(new { message = "User identity not found." });

                var email = GetUserEmail();
                var result = await _dashboard.GetStudentDashboardAsync(schoolId, userId.Value, email);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching student dashboard");
                return StatusCode(500, new { message = "An error occurred." });
            }
        }

        /// <summary>
        /// Admin home-screen data: today's attendance rate, fee collection, pending approvals,
        /// overdue fee alert, recent announcements, and unread notification count.
        /// </summary>
        /// <response code="200">Admin dashboard data.</response>
        [HttpGet("admin-dashboard")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        [ProducesResponseType(typeof(AdminDashboardResponse), 200)]
        public async Task<ActionResult<AdminDashboardResponse>> GetAdminDashboard()
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var userId = GetUserId();
                if (userId == null)
                    return Unauthorized(new { message = "User identity not found." });

                var result = await _dashboard.GetAdminDashboardAsync(schoolId, userId.Value);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching admin dashboard");
                return StatusCode(500, new { message = "An error occurred." });
            }
        }

        /// <summary>
        /// Pre-fetches all daily data needed for offline use.
        /// </summary>
        [HttpGet("offline-bundle")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(OfflineBundleResponse), 200)]
        public async Task<ActionResult<OfflineBundleResponse>> GetOfflineBundle()
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var email = GetUserEmail();
                var result = await _dashboard.GetOfflineBundleAsync(schoolId, email);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching offline bundle");
                return StatusCode(500, new { message = "An error occurred." });
            }
        }

        /// <summary>
        /// Librarian home-screen: books issued today, overdue count, pending reservations.
        /// </summary>
        [HttpGet("librarian-dashboard")]
        [Authorize(Roles = "Librarian")]
        [ProducesResponseType(typeof(LibrarianDashboardResponse), 200)]
        public async Task<ActionResult<LibrarianDashboardResponse>> GetLibrarianDashboard()
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var userId = GetUserId();
                if (userId == null) return Unauthorized(new { message = "User identity not found." });
                var result = await _dashboard.GetLibrarianDashboardAsync(schoolId, userId.Value);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching librarian dashboard");
                return StatusCode(500, new { message = "An error occurred." });
            }
        }

        /// <summary>
        /// Transport Manager home-screen: active routes, vehicle count, students assigned.
        /// </summary>
        [HttpGet("transport-dashboard")]
        [Authorize(Roles = "TransportManager")]
        [ProducesResponseType(typeof(TransportDashboardResponse), 200)]
        public async Task<ActionResult<TransportDashboardResponse>> GetTransportDashboard()
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var userId = GetUserId();
                if (userId == null) return Unauthorized(new { message = "User identity not found." });
                var result = await _dashboard.GetTransportDashboardAsync(schoolId, userId.Value);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching transport dashboard");
                return StatusCode(500, new { message = "An error occurred." });
            }
        }

        /// <summary>
        /// Hostel Warden home-screen: room occupancy, checked-in students, visitor count.
        /// </summary>
        [HttpGet("hostel-dashboard")]
        [Authorize(Roles = "HostelWarden")]
        [ProducesResponseType(typeof(HostelDashboardResponse), 200)]
        public async Task<ActionResult<HostelDashboardResponse>> GetHostelDashboard()
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var userId = GetUserId();
                if (userId == null) return Unauthorized(new { message = "User identity not found." });
                var result = await _dashboard.GetHostelDashboardAsync(schoolId, userId.Value);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching hostel dashboard");
                return StatusCode(500, new { message = "An error occurred." });
            }
        }

        /// <summary>
        /// Receptionist home-screen: visitors currently inside, check-ins today, pending pre-registrations.
        /// </summary>
        [HttpGet("receptionist-dashboard")]
        [Authorize(Roles = "Receptionist")]
        [ProducesResponseType(typeof(ReceptionistDashboardResponse), 200)]
        public async Task<ActionResult<ReceptionistDashboardResponse>> GetReceptionistDashboard()
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var userId = GetUserId();
                if (userId == null) return Unauthorized(new { message = "User identity not found." });
                var result = await _dashboard.GetReceptionistDashboardAsync(schoolId, userId.Value);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching receptionist dashboard");
                return StatusCode(500, new { message = "An error occurred." });
            }
        }
    }
}
