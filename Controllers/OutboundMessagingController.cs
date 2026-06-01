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
    /// Outbound channel messaging — dispatches SMS, WhatsApp, and Email via MSG91.
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
            if (string.IsNullOrEmpty(claim) || !Guid.TryParse(claim, out var id))
                throw new UnauthorizedAccessException("SchoolId claim missing or invalid.");
            return id;
        }

        private Guid GetUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(claim) || !Guid.TryParse(claim, out var id))
                throw new UnauthorizedAccessException("UserId claim missing or invalid.");
            return id;
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

                // Copy to avoid mutating the deserialized DTO
                var attrs = new Dictionary<string, string>(request.CustomAttributes ?? new());
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
                await _logService.LogBatchAsync(channelRequest, results, ct);

                return Ok(ToResponse(results));
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
                _logger.LogError(ex, "Outbound dispatch failed for {Destination}", request.Destination);
                return StatusCode(500, new { message = "Dispatch failed." });
            }
        }

        // ── Use-case: User registration ──────────────────────────────────────

        /// <summary>
        /// Dispatches a user-registration notification: OTP via SMS and welcome kit via WhatsApp,
        /// concurrently. Each channel uses its own MSG91 template identifier because SMS Flow IDs
        /// and WhatsApp template names are separate namespaces in the MSG91 platform.
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
                // SMS and WhatsApp use different MSG91 template namespaces (Flow ID vs template name),
                // so they are built as separate requests and dispatched concurrently.
                var schoolId = GetSchoolId().ToString();
                var userId   = GetUserId().ToString();
                var templateParams = new List<string> { request.FullName, request.OtpCode, request.SchoolName };

                var smsRequest = new ChannelMessageRequest(
                    destination: request.PhoneNumber,
                    recipientName: request.FullName,
                    templateOrCampaignIdentifier: request.SmsTemplateIdentifier,
                    templateParameters: templateParams,
                    customAttributes: new Dictionary<string, string>
                    {
                        ["schoolId"] = schoolId,
                        ["userId"]   = userId,
                        ["event"]    = "UserRegistration"
                    },
                    mediaUrl: null,
                    mediaFilename: null,
                    channels: new[] { CommunicationChannel.Sms });

                var waRequest = new ChannelMessageRequest(
                    destination: request.PhoneNumber,
                    recipientName: request.FullName,
                    templateOrCampaignIdentifier: request.WhatsAppTemplateIdentifier,
                    templateParameters: templateParams,
                    customAttributes: new Dictionary<string, string>
                    {
                        ["schoolId"] = schoolId,
                        ["userId"]   = userId,
                        ["event"]    = "UserRegistration"
                    },
                    mediaUrl: request.WelcomeDocumentUrl,
                    mediaFilename: request.WelcomeDocumentFilename,
                    channels: new[] { CommunicationChannel.WhatsApp });

                var dispatched = await Task.WhenAll(
                    _manager.SendAsync(smsRequest, ct),
                    _manager.SendAsync(waRequest, ct));

                // Log sequentially — both share the same scoped DbContext
                await _logService.LogBatchAsync(smsRequest, dispatched[0], ct);
                await _logService.LogBatchAsync(waRequest, dispatched[1], ct);

                var allResults = dispatched[0].Concat(dispatched[1]).ToList();

                _logger.LogInformation(
                    "Registration messages dispatched for {Phone}: WhatsApp={WA}, SMS={SMS}",
                    request.PhoneNumber,
                    dispatched[1].FirstOrDefault(r => r.Channel == CommunicationChannel.WhatsApp)?.IsSuccess,
                    dispatched[0].FirstOrDefault(r => r.Channel == CommunicationChannel.Sms)?.IsSuccess);

                return Ok(ToResponse(allResults));
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
                _logger.LogError(ex, "Registration dispatch failed for {Phone}", request.PhoneNumber);
                return StatusCode(500, new { message = "Registration message dispatch failed." });
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
                return StatusCode(500, new { message = "Could not retrieve logs." });
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
