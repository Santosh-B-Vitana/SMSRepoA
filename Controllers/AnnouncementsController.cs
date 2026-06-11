using SmsApi.Models.Constants;
using SmsApi.Models.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Services;
using System;
using System.Threading.Tasks;

namespace SmsApi.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class AnnouncementsController : ControllerBase
    {
        private readonly IAnnouncementService _svc;
        private readonly ITenantContext _tenant;
        private readonly AppDbContext _db;
        private readonly ILogger<AnnouncementsController> _logger;

        public AnnouncementsController(
            IAnnouncementService svc,
            ITenantContext tenant,
            AppDbContext db,
            ILogger<AnnouncementsController> logger)
        {
            _svc    = svc;
            _tenant = tenant;
            _db     = db;
            _logger = logger;
        }

        /// <summary>Resolves Staff.Id from the current JWT (UserLogin.LinkedEntityId or email fallback).</summary>
        private async Task<Guid?> ResolveStaffIdAsync()
        {
            var userLogin = await _db.Set<UserLogin>().FirstOrDefaultAsync(u => u.Id == _tenant.UserId);
            if (userLogin?.LinkedEntityId != null) return userLogin.LinkedEntityId;
            var email = _tenant.UserEmail;
            if (!string.IsNullOrEmpty(email))
            {
                var schoolId = _tenant.SchoolId;
                var staff = await _db.StaffMembers
                    .FirstOrDefaultAsync(s => s.SchoolId == schoolId && s.Email == email);
                return staff?.Id;
            }
            return null;
        }

        // ──────────────────────────────────────────────────
        // GET /api/announcements
        // ──────────────────────────────────────────────────
        [HttpGet]
        [Authorize(Roles = StatusConstants.RoleGroups.StudentView)]
        [ProducesResponseType(typeof(AnnouncementListResponse), 200)]
        public async Task<ActionResult<AnnouncementListResponse>> GetAnnouncements(
            [FromQuery] bool?   isActive      = null,
            [FromQuery] bool?   isPinned      = null,
            [FromQuery] string? targetAudience= null,
            [FromQuery] string? priority      = null,
            [FromQuery] string? search        = null,
            [FromQuery] int     page          = 1,
            [FromQuery] int     pageSize      = 10)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var filters  = new AnnouncementFiltersDto
            {
                IsActive      = isActive,
                IsPinned      = isPinned,
                TargetAudience= targetAudience,
                Priority      = priority,
                Search        = search
            };
            var result = await _svc.GetAnnouncementsAsync(schoolId, filters, page, pageSize);
            return Ok(result);
        }

        // ──────────────────────────────────────────────────
        // GET /api/announcements/stats
        // ──────────────────────────────────────────────────
        [HttpGet("stats")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        [ProducesResponseType(typeof(AnnouncementStatsDto), 200)]
        public async Task<ActionResult<AnnouncementStatsDto>> GetStats()
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var stats = await _svc.GetStatsAsync(schoolId);
            return Ok(stats);
        }

        // ──────────────────────────────────────────────────
        // GET /api/announcements/my
        // Returns announcements relevant to the authenticated staff member:
        // targeted at "all", targeted at "staff" (recipient record exists),
        // or class/section-targeted for classes the staff member teaches.
        // ──────────────────────────────────────────────────
        [HttpGet("my")]
        [Authorize]
        [ProducesResponseType(200)]
        public async Task<ActionResult> GetMyAnnouncements()
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            // Guid.Empty fallback: school-wide announcements ("all" / "staff" audience)
            // still display even when we cannot resolve the Staff.Id.
            var staffId  = await ResolveStaffIdAsync() ?? Guid.Empty;

            var list = await _svc.GetMyAnnouncementsAsync(staffId, "Staff", schoolId);
            return Ok(list);
        }

        // ──────────────────────────────────────────────────
        // GET /api/announcements/for-parent
        // Returns announcements visible to the authenticated parent:
        // targeted at "all", "parents", or class/section for their children.
        // ──────────────────────────────────────────────────
        [HttpGet("for-parent")]
        [Authorize(Roles = "Parent")]
        [ProducesResponseType(200)]
        public async Task<ActionResult> GetAnnouncementsForParent()
        {
            var schoolId    = _tenant.GetEffectiveSchoolId();
            var parentEmail = _tenant.UserEmail;
            if (string.IsNullOrWhiteSpace(parentEmail))
                return Unauthorized(new { message = "Parent email not found in token." });

            var list = await _svc.GetParentAnnouncementsAsync(parentEmail, schoolId);
            return Ok(list);
        }

        // ──────────────────────────────────────────────────
        // GET /api/announcements/{id}
        // ──────────────────────────────────────────────────
        [HttpGet("{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(AnnouncementResponse), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<AnnouncementResponse>> GetAnnouncementById(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var announcement = await _svc.GetAnnouncementByIdAsync(id, schoolId);
            if (announcement == null)
                return NotFound(new { message = $"Announcement {id} not found." });
            return Ok(announcement);
        }

        // ──────────────────────────────────────────────────
        // POST /api/announcements
        // ──────────────────────────────────────────────────
        [HttpPost]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        [ProducesResponseType(typeof(AnnouncementResponse), 201)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        public async Task<ActionResult<AnnouncementResponse>> CreateAnnouncement(
            [FromBody] CreateAnnouncementRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();

                // Always resolve the author from the JWT — never trust a client-supplied ID.
                var staffId = await ResolveStaffIdAsync();
                if (staffId == null || staffId == Guid.Empty)
                    return Unauthorized(new { message = "Could not resolve your staff profile. Ensure your account is linked to a staff record." });

                request.CreatedByStaffId = staffId.Value;

                var announcement = await _svc.CreateAnnouncementAsync(schoolId, request);
                return CreatedAtAction(
                    nameof(GetAnnouncementById),
                    new { id = announcement.Id },
                    announcement);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
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
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error creating announcement");
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        // ──────────────────────────────────────────────────
        // PUT /api/announcements/{id}
        // ──────────────────────────────────────────────────
        [HttpPut("{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        [ProducesResponseType(typeof(AnnouncementResponse), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<AnnouncementResponse>> UpdateAnnouncement(
            Guid id, [FromBody] UpdateAnnouncementRequest request)
        {
            try
            {
                var schoolId     = _tenant.GetEffectiveSchoolId();
                var announcement = await _svc.UpdateAnnouncementAsync(schoolId, id, request);
                return Ok(announcement);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
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
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error updating announcement {Id}", id);
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        // ──────────────────────────────────────────────────
        // DELETE /api/announcements/{id}
        // ──────────────────────────────────────────────────
        [HttpDelete("{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        [ProducesResponseType(204)]
        [ProducesResponseType(404)]
        public async Task<ActionResult> DeleteAnnouncement(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result   = await _svc.DeleteAnnouncementAsync(id, schoolId);
                if (!result)
                    return NotFound(new { message = $"Announcement {id} not found." });
                return NoContent();
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error deleting announcement {Id}", id);
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        // ──────────────────────────────────────────────────
        // POST /api/announcements/mark-as-read
        // ──────────────────────────────────────────────────
        [HttpPost("mark-as-read")]
        [Authorize]
        [ProducesResponseType(200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult> MarkAsRead([FromBody] MarkAnnouncementAsReadRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result   = await _svc.MarkAsReadAsync(schoolId, request);
                return Ok(new { success = result });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error marking announcement as read");
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        // ──────────────────────────────────────────────────
        // GET /api/announcements/{announcementId}/recipients
        // ──────────────────────────────────────────────────
        [HttpGet("{announcementId}/recipients")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        [ProducesResponseType(typeof(AnnouncementRecipientsListResponse), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<AnnouncementRecipientsListResponse>> GetRecipients(
            Guid  announcementId,
            [FromQuery] bool? isRead   = null,
            [FromQuery] int   page     = 1,
            [FromQuery] int   pageSize = 10)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result   = await _svc.GetRecipientsAsync(announcementId, schoolId, isRead, page, pageSize);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error getting recipients for announcement {Id}", announcementId);
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }
    }
}
