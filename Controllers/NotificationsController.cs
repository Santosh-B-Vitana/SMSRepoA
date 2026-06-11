using SmsApi.Models.Constants;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;
using SmsApi.Services;
using SmsApi.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace SmsApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class NotificationsController : ControllerBase
    {
        private readonly INotificationService _notificationService;
        private readonly AppDbContext _db;
        private readonly ITenantContext _tenant;
        private readonly ILogger<NotificationsController> _logger;

        private const int MaxActiveDevicesPerUser = 2;

        public NotificationsController(
            INotificationService notificationService,
            AppDbContext db,
            ITenantContext tenant,
            ILogger<NotificationsController> logger)
        {
            _notificationService = notificationService;
            _db = db;
            _tenant = tenant;
            _logger = logger;
        }

        private Guid GetSchoolId() => _tenant.GetEffectiveSchoolId();

        private Guid? GetUserId()
        {
            var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(raw, out var id) ? id : null;
        }

        private string GetSenderName()
        {
            var firstName = User.FindFirstValue(ClaimTypes.GivenName) ?? string.Empty;
            var lastName = User.FindFirstValue(ClaimTypes.Surname) ?? string.Empty;
            var name = $"{firstName} {lastName}".Trim();
            return string.IsNullOrWhiteSpace(name) ? (User.FindFirstValue(ClaimTypes.Name) ?? "Unknown") : name;
        }

        // User-facing endpoints (all authenticated roles)

        [HttpGet("my")]
        [Authorize(Roles = StatusConstants.RoleGroups.StudentView)]
        public async Task<ActionResult> GetMyNotifications(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] bool? unreadOnly = null,
            [FromQuery] string? type = null,
            [FromQuery] Guid? studentId = null)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                if (userId == null) return Unauthorized(new { message = "User identity not found." });
                var result = await _notificationService.GetMyNotificationsAsync(schoolId, userId.Value, page, pageSize, unreadOnly, type, studentId);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { _logger.LogError(ex, "Error fetching user notifications"); return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpGet("unread-count")]
        [Authorize(Roles = StatusConstants.RoleGroups.StudentView)]
        public async Task<ActionResult> GetUnreadCount()
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                if (userId == null) return Unauthorized(new { message = "User identity not found." });
                var result = await _notificationService.GetUnreadCountAsync(schoolId, userId.Value);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { _logger.LogError(ex, "Error fetching unread count"); return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpPut("{id:guid}/read")]
        [Authorize(Roles = StatusConstants.RoleGroups.StudentView)]
        public async Task<ActionResult> MarkAsRead(Guid id)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                if (userId == null) return Unauthorized(new { message = "User identity not found." });
                await _notificationService.MarkAsReadAsync(id, schoolId, userId.Value);
                return Ok(new { message = "Notification marked as read." });
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { _logger.LogError(ex, "Error marking notification as read: {Id}", id); return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpPut("read-all")]
        [Authorize(Roles = StatusConstants.RoleGroups.StudentView)]
        public async Task<ActionResult> MarkAllAsRead()
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                if (userId == null) return Unauthorized(new { message = "User identity not found." });
                var count = await _notificationService.MarkAllAsReadAsync(schoolId, userId.Value);
                return Ok(new { message = $"{count} notification(s) marked as read.", count });
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { _logger.LogError(ex, "Error marking all notifications as read"); return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpDelete("{id:guid}")]
        [Authorize(Roles = StatusConstants.RoleGroups.StudentView)]
        public async Task<ActionResult> DeleteMyNotification(Guid id)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                if (userId == null) return Unauthorized(new { message = "User identity not found." });
                await _notificationService.DeleteMyNotificationAsync(id, schoolId, userId.Value);
                return Ok(new { message = "Notification deleted." });
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { _logger.LogError(ex, "Error deleting notification: {Id}", id); return StatusCode(500, new { message = "An error occurred." }); }
        }

        // Staff / admin endpoints

        [HttpPost("send")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        public async Task<ActionResult> SendNotification([FromBody] SendNotificationRequest request)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                if (userId == null) return Unauthorized(new { message = "Sender identity not found." });
                var result = await _notificationService.SendNotificationAsync(schoolId, userId.Value, GetSenderName(), request);
                return CreatedAtAction(nameof(GetMyNotifications), new { }, result);
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { _logger.LogError(ex, "Error sending notification"); return StatusCode(500, new { message = "An error occurred while sending." }); }
        }

        [HttpPost("broadcast")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<ActionResult> BroadcastNotification([FromBody] BroadcastNotificationRequest request)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                if (userId == null) return Unauthorized(new { message = "Sender identity not found." });
                var result = await _notificationService.BroadcastNotificationAsync(schoolId, userId.Value, GetSenderName(), request);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { _logger.LogError(ex, "Error broadcasting notification"); return StatusCode(500, new { message = "An error occurred while broadcasting." }); }
        }

        [HttpGet]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<ActionResult> GetSchoolNotifications(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? type = null,
            [FromQuery] string? priority = null,
            [FromQuery] Guid? recipientId = null)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _notificationService.GetSchoolNotificationsAsync(schoolId, page, pageSize, type, priority, recipientId);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { _logger.LogError(ex, "Error fetching school notifications"); return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpGet("stats")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<ActionResult> GetStats()
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _notificationService.GetStatsAsync(schoolId);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { _logger.LogError(ex, "Error fetching stats"); return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpDelete("{id:guid}/admin")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<ActionResult> AdminDeleteNotification(Guid id)
        {
            try
            {
                var schoolId = GetSchoolId();
                await _notificationService.AdminDeleteNotificationAsync(id, schoolId);
                return Ok(new { message = "Notification deleted." });
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { _logger.LogError(ex, "Error admin-deleting notification: {Id}", id); return StatusCode(500, new { message = "An error occurred." }); }
        }

        /// <summary>
        /// Registers or updates a mobile device push notification token (FCM/APNs).
        /// Idempotent: calling twice with the same deviceId updates the token rather than duplicating.
        /// A user may have at most 2 active devices; older excess tokens are deactivated.
        /// </summary>
        [HttpPost("register-device")]
        [ProducesResponseType(typeof(RegisterDeviceTokenResponse), 200)]
        public async Task<ActionResult<RegisterDeviceTokenResponse>> RegisterDeviceToken(
            [FromBody] RegisterDeviceTokenRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.NativeToken))
                    return BadRequest(new { message = "NativeToken is required." });

                if (request.Platform != "android" && request.Platform != "ios")
                    return BadRequest(new { message = "Platform must be 'android' or 'ios'." });

                if (string.IsNullOrWhiteSpace(request.DeviceId))
                    return BadRequest(new { message = "DeviceId is required." });

                var userId = GetUserId();
                if (userId == null) return Unauthorized(new { message = "User identity not found." });

                var schoolId = GetSchoolId();

                // Upsert: update if (UserId, DeviceId) exists, else insert
                var existing = await _db.MobileDeviceTokens
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(t => t.UserId == userId.Value && t.DeviceId == request.DeviceId);

                bool isNew = existing == null;

                if (existing != null)
                {
                    existing.NativeToken = request.NativeToken;
                    existing.Platform = request.Platform;
                    existing.AppVersion = request.AppVersion;
                    existing.LastActiveAt = DateTime.UtcNow;
                    existing.IsActive = true;
                    existing.IsDeleted = false;
                    existing.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    _db.MobileDeviceTokens.Add(new MobileDeviceToken
                    {
                        UserId = userId.Value,
                        SchoolId = schoolId,
                        DeviceId = request.DeviceId,
                        NativeToken = request.NativeToken,
                        Platform = request.Platform,
                        AppVersion = request.AppVersion,
                        IsActive = true,
                        LastActiveAt = DateTime.UtcNow
                    });
                }

                await _db.SaveChangesAsync();

                // Enforce max 2 active devices: deactivate oldest excess tokens
                var allActiveTokens = await _db.MobileDeviceTokens
                    .Where(t => t.UserId == userId.Value && t.IsActive)
                    .OrderByDescending(t => t.LastActiveAt)
                    .ToListAsync();

                if (allActiveTokens.Count > MaxActiveDevicesPerUser)
                {
                    var toDeactivate = allActiveTokens.Skip(MaxActiveDevicesPerUser).ToList();
                    foreach (var token in toDeactivate)
                    {
                        token.IsActive = false;
                        token.UpdatedAt = DateTime.UtcNow;
                    }
                    await _db.SaveChangesAsync();
                }

                _logger.LogInformation(
                    "Device token {Action}: userId={UserId}, platform={Platform}, deviceId={DeviceId}",
                    isNew ? "registered" : "updated", userId.Value, request.Platform, request.DeviceId);

                return Ok(new RegisterDeviceTokenResponse
                {
                    Message = isNew ? "Device token registered successfully." : "Device token updated successfully.",
                    IsNew = isNew
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error registering device token");
                return StatusCode(500, new { message = "An error occurred." });
            }
        }

        /// <summary>
        /// Returns all notification type preferences for the current user.
        /// Notification types not listed here default to enabled.
        /// </summary>
        [HttpGet("preferences")]
        [Authorize(Roles = StatusConstants.RoleGroups.StudentView)]
        [ProducesResponseType(typeof(NotificationPreferencesResponse), 200)]
        public async Task<ActionResult<NotificationPreferencesResponse>> GetNotificationPreferences()
        {
            try
            {
                var userId = GetUserId();
                if (userId == null) return Unauthorized(new { message = "User identity not found." });

                var prefs = await _db.UserNotificationPreferences
                    .AsNoTracking()
                    .Where(p => p.UserId == userId.Value)
                    .ToListAsync();

                return Ok(new NotificationPreferencesResponse
                {
                    Preferences = prefs.Select(p => new NotificationPreferenceDto
                    {
                        NotificationType = p.NotificationType,
                        PushEnabled = p.PushEnabled,
                        EmailEnabled = p.EmailEnabled
                    }).ToList()
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching notification preferences");
                return StatusCode(500, new { message = "An error occurred." });
            }
        }

        /// <summary>
        /// Creates or updates the push/email preference for a specific notification type.
        /// Valid types: Fee, Attendance, Exam, Assignment, Announcement, Leave, General, etc.
        /// </summary>
        [HttpPut("preferences/{notificationType}")]
        [Authorize(Roles = StatusConstants.RoleGroups.StudentView)]
        [ProducesResponseType(typeof(NotificationPreferenceDto), 200)]
        public async Task<ActionResult<NotificationPreferenceDto>> UpdateNotificationPreference(
            string notificationType,
            [FromBody] UpdateNotificationPreferenceRequest request)
        {
            try
            {
                if (!SmsApi.Services.NotificationConstants.ValidTypes.Contains(notificationType))
                    return BadRequest(new { message = $"Invalid notification type '{notificationType}'." });

                var userId = GetUserId();
                if (userId == null) return Unauthorized(new { message = "User identity not found." });

                var schoolId = GetSchoolId();

                var existing = await _db.UserNotificationPreferences
                    .FirstOrDefaultAsync(p => p.UserId == userId.Value
                                           && p.NotificationType == notificationType);

                if (existing != null)
                {
                    existing.PushEnabled = request.PushEnabled;
                    existing.EmailEnabled = request.EmailEnabled;
                    existing.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    _db.UserNotificationPreferences.Add(new UserNotificationPreference
                    {
                        UserId = userId.Value,
                        SchoolId = schoolId,
                        NotificationType = notificationType,
                        PushEnabled = request.PushEnabled,
                        EmailEnabled = request.EmailEnabled
                    });
                }

                await _db.SaveChangesAsync();

                return Ok(new NotificationPreferenceDto
                {
                    NotificationType = notificationType,
                    PushEnabled = request.PushEnabled,
                    EmailEnabled = request.EmailEnabled
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating notification preference for type {Type}", notificationType);
                return StatusCode(500, new { message = "An error occurred." });
            }
        }
    }
}
