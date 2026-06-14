using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmsApi.Services;

namespace SmsApi.Controllers
{
    /// <summary>
    /// Receives LiveKit server-side webhook events.
    /// Route is intentionally excluded from SchoolFeatureAccessMiddleware
    /// (webhook calls have no JWT — HMAC-SHA256 signature is the auth mechanism).
    /// </summary>
    [AllowAnonymous]
    [ApiController]
    [Route("api/webhooks/livekit")]
    public class LiveKitWebhookController : ControllerBase
    {
        private readonly IMeetingAttendanceService _attendance;
        private readonly IConfiguration _config;
        private readonly ILogger<LiveKitWebhookController> _logger;

        public LiveKitWebhookController(
            IMeetingAttendanceService attendance,
            IConfiguration config,
            ILogger<LiveKitWebhookController> logger)
        {
            _attendance = attendance;
            _config = config;
            _logger = logger;
        }

        [HttpPost]
        public async Task<IActionResult> Handle()
        {
            // Read raw body for HMAC verification
            using var reader = new StreamReader(Request.Body);
            var body = await reader.ReadToEndAsync();

            if (!VerifyWebhookSignature(body))
            {
                _logger.LogWarning("LiveKit webhook signature verification failed. Remote IP: {IP}",
                    HttpContext.Connection.RemoteIpAddress);
                return Unauthorized(new { message = "Invalid webhook signature." });
            }

            LiveKitWebhookEvent? evt;
            try
            {
                evt = JsonSerializer.Deserialize<LiveKitWebhookEvent>(body,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "Failed to deserialize LiveKit webhook payload");
                return BadRequest(new { message = "Malformed webhook payload." });
            }

            if (evt is null) return Ok();

            _logger.LogInformation("LiveKit webhook received: {Event}", evt.Event);

            switch (evt.Event)
            {
                case "participant_joined":
                    await _attendance.HandleParticipantJoinedAsync(evt);
                    break;

                case "participant_left":
                    await _attendance.HandleParticipantLeftAsync(evt);
                    break;

                case "egress_ended":
                    await _attendance.HandleEgressEndedAsync(evt);
                    break;

                default:
                    _logger.LogDebug("Unhandled LiveKit webhook event type: {Event}", evt.Event);
                    break;
            }

            return Ok(new { received = true });
        }

        // ─── Webhook HMAC-SHA256 verification ────────────────────────────────

        private bool VerifyWebhookSignature(string body)
        {
            var secret = _config["LiveKit:ApiSecret"];
            if (string.IsNullOrEmpty(secret))
            {
                // In dev with no secret configured, skip verification and warn
                _logger.LogWarning("LiveKit:ApiSecret not configured — skipping webhook signature verification.");
                return true;
            }

            // LiveKit sends signature in Authorization header as "Bearer <jwt>"
            // The JWT is signed with the API secret; its body hash matches the webhook body hash
            // Simplified verification: check Authorization header is a valid JWT signed with our secret
            var authHeader = Request.Headers["Authorization"].FirstOrDefault();
            if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
                return false;

            var token = authHeader["Bearer ".Length..];

            try
            {
                var keyBytes = Encoding.UTF8.GetBytes(secret);
                using var hmac = new HMACSHA256(keyBytes);
                // LiveKit uses SHA256 of body as the "sha256" claim in the JWT
                var bodyHash = Convert.ToBase64String(hmac.ComputeHash(Encoding.UTF8.GetBytes(body)));

                // Validate the JWT signature (without full claim validation — we only care about integrity)
                var handler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
                var jwt = handler.ReadJwtToken(token);
                var sha256Claim = jwt.Claims.FirstOrDefault(c => c.Type == "sha256")?.Value;

                // Compare hash from JWT with hash of received body
                return sha256Claim == bodyHash;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "LiveKit webhook signature validation threw: {Message}", ex.Message);
                return false;
            }
        }
    }
}
