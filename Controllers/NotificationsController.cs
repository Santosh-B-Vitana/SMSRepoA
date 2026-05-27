using SmsApi.Models.Constants;
using SmsApi.Models.DTOs;
using SmsApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace SmsApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class NotificationsController : ControllerBase
    {
        private readonly INotificationService _notificationService;
        private readonly ITenantContext _tenant;
        private readonly ILogger<NotificationsController> _logger;

        public NotificationsController(
            INotificationService notificationService,
            ITenantContext tenant,
            ILogger<NotificationsController> logger)
        {
            _notificationService = notificationService;
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
            [FromQuery] string? type = null)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                if (userId == null) return Unauthorized(new { message = "User identity not found." });
                var result = await _notificationService.GetMyNotificationsAsync(schoolId, userId.Value, page, pageSize, unreadOnly, type);
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
        /// Registers a mobile device push notification token (FCM/APNs) for the current user.
        /// Called by the React Native mobile app on first launch after login.
        /// </summary>
        [HttpPost("register-device")]
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        public async Task<ActionResult> RegisterDeviceToken([FromBody] RegisterDeviceTokenRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.DeviceToken))
                    return BadRequest(new { message = "Device token is required." });

                if (request.Platform != "android" && request.Platform != "ios")
                    return BadRequest(new { message = "Platform must be 'android' or 'ios'." });

                var userId = GetUserId();
                if (userId == null) return Unauthorized(new { message = "User identity not found." });

                var schoolId = GetSchoolId();

                // Store the device token (best-effort — failures are non-critical)
                _logger.LogInformation(
                    "Device token registered: userId={UserId}, platform={Platform}, schoolId={SchoolId}",
                    userId, request.Platform, schoolId);

                // TODO: persist to a DeviceTokens table or pass to FCM/APNs service
                // For now, log and acknowledge — implement persistence when push service is wired up
                return Ok(new { message = "Device token registered successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error registering device token");
                return StatusCode(500, new { message = "An error occurred." });
            }
        }
    }
}

/// <summary>
/// Request DTO for mobile push notification device token registration.
/// </summary>
public record RegisterDeviceTokenRequest(
    string DeviceToken,
    string Platform  // "android" | "ios"
);
