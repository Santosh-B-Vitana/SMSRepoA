using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmsApi.Messaging;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;
using SmsApi.Services.Messaging;

namespace SmsApi.Controllers
{
    /// <summary>
    /// Outbound channel messaging — dispatches WhatsApp and/or SMS via the AiSensy provider.
    /// All sends are concurrent; each channel result is independently audited in AuditLogs.
    /// </summary>
    [ApiController]
    [Route("api/outbound-messaging")]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class OutboundMessagingController : ControllerBase
    {
        private readonly IChannelNotificationManager _manager;
        private readonly INotificationLogService _logService;
        private readonly ILogger<OutboundMessagingController> _logger;

        public OutboundMessagingController(
            IChannelNotificationManager manager,
            INotificationLogService logService,
            ILogger<OutboundMessagingController> logger)
        {
            _manager = manager;
            _logService = logService;
            _logger = logger;
        }

        // ── Helpers ─────────────────────────────────────────────────────────

        private Guid GetSchoolId()
        {
            var claim = User.FindFirst("SchoolId")?.Value;
            return Guid.Parse(claim ?? throw new UnauthorizedAccessException("SchoolId claim missing."));
        }

        private Guid GetUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.Parse(claim ?? throw new UnauthorizedAccessException("UserId claim missing."));
        }

        // ── Generic dispatch ─────────────────────────────────────────────────

        /// <summary>
        /// Dispatch a message to one or more channels (WhatsApp, Sms, Email, Push) concurrently.
        /// All channels in the request fire in parallel; a result is returned for each.
        /// </summary>
        [HttpPost("dispatch")]
        [ProducesResponseType(typeof(ChannelDispatchResponse), 200)]
        [ProducesResponseType(400)]
        public async Task<ActionResult<ChannelDispatchResponse>> Dispatch(
            [FromBody] SendChannelMessageRequest request,
            CancellationToken ct)
        {
            try
            {
                var channels = ParseChannels(request.Channels);

                var attrs = request.CustomAttributes ?? new Dictionary<string, string>();
                attrs["schoolId"] = GetSchoolId().ToString();
                attrs["userId"]   = GetUserId().ToString();

                var channelRequest = new ChannelMessageRequest(
                    request.Destination,
                    request.RecipientName,
                    request.TemplateOrCampaignIdentifier,
                    request.TemplateParameters,
                    attrs,
                    request.MediaUrl,
                    request.MediaFilename,
                    channels);

                var results = await _manager.SendAsync(channelRequest, ct);
                await Task.WhenAll(results.Select(r => _logService.LogAsync(channelRequest, r, ct)));

                return Ok(ToResponse(results));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Outbound dispatch failed for {Destination}", request.Destination);
                return StatusCode(500, new { message = "Dispatch failed.", error = ex.Message });
            }
        }

        // ── Use-case: User registration ──────────────────────────────────────

        /// <summary>
        /// Demonstrates concurrent multi-channel dispatch for a user-registration event:
        /// sends an OTP via SMS and a welcome kit (with optional document) via WhatsApp
        /// in a single parallel call through the channel engine.
        /// </summary>
        [HttpPost("user-registration")]
        [Authorize(Roles = "Admin,Principal,SuperAdmin")]
        [ProducesResponseType(typeof(ChannelDispatchResponse), 200)]
        [ProducesResponseType(400)]
        public async Task<ActionResult<ChannelDispatchResponse>> SendRegistrationMessages(
            [FromBody] UserRegistrationMessageRequest request,
            CancellationToken ct)
        {
            try
            {
                // Both WhatsApp and SMS fire concurrently in a single manager call.
                // The AiSensy campaign handles the channel-specific template rendering;
                // templateParameters are positional: [fullName, otpCode, schoolName].
                var channelRequest = new ChannelMessageRequest(
                    destination: request.PhoneNumber,
                    recipientName: request.FullName,
                    templateOrCampaignIdentifier: request.WelcomeCampaignName,
                    templateParameters: new List<string>
                    {
                        request.FullName,
                        request.OtpCode,
                        request.SchoolName
                    },
                    customAttributes: new Dictionary<string, string>
                    {
                        ["schoolId"] = GetSchoolId().ToString(),
                        ["userId"]   = GetUserId().ToString(),
                        ["event"]    = "UserRegistration"
                    },
                    mediaUrl: request.WelcomeDocumentUrl,
                    mediaFilename: request.WelcomeDocumentFilename,
                    channels: new[] { CommunicationChannel.WhatsApp, CommunicationChannel.Sms });

                var results = await _manager.SendAsync(channelRequest, ct);

                // Audit both channel results concurrently
                await Task.WhenAll(results.Select(r => _logService.LogAsync(channelRequest, r, ct)));

                _logger.LogInformation(
                    "Registration messages dispatched for {Phone}: WhatsApp={WA}, SMS={SMS}",
                    request.PhoneNumber,
                    results.FirstOrDefault(r => r.Channel == CommunicationChannel.WhatsApp)?.IsSuccess,
                    results.FirstOrDefault(r => r.Channel == CommunicationChannel.Sms)?.IsSuccess);

                return Ok(ToResponse(results));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Registration dispatch failed for {Phone}", request.PhoneNumber);
                return StatusCode(500, new { message = "Registration message dispatch failed.", error = ex.Message });
            }
        }

        // ── Audit log query ──────────────────────────────────────────────────

        /// <summary>
        /// Retrieves channel delivery audit records from AuditLogs.
        /// Filter by phone number, channel name (WhatsApp/Sms), and/or date range.
        /// </summary>
        [HttpGet("logs")]
        [Authorize(Roles = "Admin,Principal,SuperAdmin")]
        [ProducesResponseType(typeof(IReadOnlyList<AuditLog>), 200)]
        public async Task<ActionResult<IReadOnlyList<AuditLog>>> GetLogs(
            [FromQuery] string? phone,
            [FromQuery] string? channel,
            [FromQuery] DateTime? from,
            [FromQuery] DateTime? to,
            CancellationToken ct)
        {
            try
            {
                var logs = await _logService.GetLogsAsync(channel, phone, from, to, ct);
                return Ok(logs);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to retrieve outbound messaging logs");
                return StatusCode(500, new { message = "Could not retrieve logs.", error = ex.Message });
            }
        }

        // ── Private helpers ──────────────────────────────────────────────────

        private static List<CommunicationChannel> ParseChannels(List<string> channelNames)
        {
            var result = new List<CommunicationChannel>();
            foreach (var name in channelNames)
            {
                if (!Enum.TryParse<CommunicationChannel>(name, ignoreCase: true, out var channel))
                    throw new ArgumentException(
                        $"'{name}' is not a valid channel. Valid values: {string.Join(", ", Enum.GetNames<CommunicationChannel>())}");
                result.Add(channel);
            }
            if (result.Count == 0)
                throw new ArgumentException("At least one channel must be specified.");
            return result;
        }

        private static ChannelDispatchResponse ToResponse(IReadOnlyList<ChannelMessageResult> results)
            => new()
            {
                AllSucceeded = results.All(r => r.IsSuccess),
                Results = results.Select(r => new ChannelDispatchResultDto
                {
                    Channel      = r.Channel.ToString(),
                    IsSuccess    = r.IsSuccess,
                    MessageId    = r.MessageId,
                    ErrorMessage = r.ErrorMessage,
                    StatusCode   = (int)r.StatusCode
                }).ToList()
            };
    }
}
