using System.Net;
using System.Text;
using System.Web;
using Microsoft.Extensions.Logging;
using SmsApi.Infrastructure.Resilience;
using SmsApi.Infrastructure.TenantConfig;
using SmsApi.Services;

namespace SmsApi.Messaging.Providers.SmsStriker
{
    /// <summary>
    /// Sends transactional / promotional SMS via SMS Striker.
    /// Endpoint: GET https://www.smsstriker.com/API/sendsmsapi.php
    ///
    /// Credentials are resolved per-branch from ISchoolBranchConfigResolver at send time —
    /// never from appsettings.json. If no config is found for the active branch the send is
    /// immediately short-circuited with UnprocessableEntity to prevent cross-tenant leakage.
    /// </summary>
    public sealed class SmsStrikerSmsProvider : IChannelProvider
    {
        public CommunicationChannel Channel => CommunicationChannel.Sms;

        private const string ClientName = "SmsStriker";
        private const string ApiPath    = "API/sendsmsapi.php";

        private readonly IHttpClientFactory _httpFactory;
        private readonly ISchoolBranchContext _branchCtx;
        private readonly ISchoolBranchConfigResolver _resolver;
        private readonly ILogger<SmsStrikerSmsProvider> _logger;

        public SmsStrikerSmsProvider(
            IHttpClientFactory httpFactory,
            ISchoolBranchContext branchCtx,
            ISchoolBranchConfigResolver resolver,
            ILogger<SmsStrikerSmsProvider> logger)
        {
            _httpFactory = httpFactory;
            _branchCtx   = branchCtx;
            _resolver    = resolver;
            _logger      = logger;
        }

        public async Task<ChannelMessageResult> SendAsync(
            ChannelMessageRequest request,
            CancellationToken cancellationToken = default)
        {
            // ── 1. Tenant isolation guard ────────────────────────────────────
            if (!_branchCtx.TryGetSchoolId(out var schoolId))
                return ChannelMessageResult.Failure(Channel,
                    "No active school context — cannot resolve SMS credentials.",
                    HttpStatusCode.Unauthorized);

            var branchId = _branchCtx.BranchId; // Guid.Empty → school defaults

            var config = await _resolver.GetSmsConfigAsync(schoolId, branchId, cancellationToken);
            if (config is null || !config.IsEnabled)
            {
                _logger.LogWarning(
                    "SMS Striker: no config for school={School} branch={Branch}. Send aborted.",
                    schoolId, branchId);
                return ChannelMessageResult.Failure(Channel,
                    $"No SMS configuration found for school {schoolId} / branch {branchId}.",
                    HttpStatusCode.UnprocessableEntity);
            }

            // ── 2. Build DLT-compliant message body ──────────────────────────
            var messageBody = BuildMessageBody(
                request.TemplateOrCampaignIdentifier,
                request.TemplateParameters);

            // ── 3. Build query string ────────────────────────────────────────
            var qs = new StringBuilder();
            qs.Append($"key={HttpUtility.UrlEncode(config.ApiKey)}");
            qs.Append($"&from={HttpUtility.UrlEncode(config.SenderId)}");
            qs.Append($"&type={HttpUtility.UrlEncode(config.SmsType)}");
            qs.Append($"&to={HttpUtility.UrlEncode(request.Destination)}");
            qs.Append($"&msg={HttpUtility.UrlEncode(messageBody)}");

            // ── 4. Send with Polly retry ─────────────────────────────────────
            var retryPolicy = ResiliencePolicies.GetHttpRetryPolicy(_logger);
            try
            {
                var response = await retryPolicy.ExecuteAsync(async () =>
                {
                    var client = _httpFactory.CreateClient(ClientName);
                    return await client.GetAsync($"{ApiPath}?{qs}", cancellationToken);
                });

                var body = await response.Content.ReadAsStringAsync(cancellationToken);

                if (response.IsSuccessStatusCode)
                {
                    var jobId = TryExtractJobId(body);
                    _logger.LogInformation(
                        "SMS Striker sent to {Dest} school={School} branch={Branch} jobId={JobId}",
                        request.Destination, schoolId, branchId, jobId);
                    return ChannelMessageResult.Success(Channel, jobId ?? body, response.StatusCode);
                }

                _logger.LogWarning(
                    "SMS Striker returned {Status} for {Dest}: {Body}",
                    (int)response.StatusCode, request.Destination, body);
                return ChannelMessageResult.Failure(Channel, body, response.StatusCode);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "SMS Striker send failed for {Dest} school={School} branch={Branch}",
                    request.Destination, schoolId, branchId);
                return ChannelMessageResult.Failure(Channel, ex.Message,
                    HttpStatusCode.InternalServerError);
            }
        }

        // ── Helpers ──────────────────────────────────────────────────────────

        /// <summary>
        /// Substitutes positional placeholders {1}, {2}, … in the DLT-approved template text.
        /// If the template contains no placeholders, parameters are appended after a space.
        /// </summary>
        private static string BuildMessageBody(string template, IEnumerable<string> parameters)
        {
            var result = template;
            var index  = 1;
            foreach (var param in parameters)
            {
                result = result.Replace($"{{{index}}}", param);
                index++;
            }
            return result;
        }

        /// <summary>SMS Striker returns the Job Id in the response body (plain text or JSON).</summary>
        private static string? TryExtractJobId(string body)
        {
            if (string.IsNullOrWhiteSpace(body)) return null;

            // Try JSON first
            try
            {
                using var doc = System.Text.Json.JsonDocument.Parse(body);
                if (doc.RootElement.TryGetProperty("jobId", out var j)) return j.GetString();
                if (doc.RootElement.TryGetProperty("job_id", out var j2)) return j2.GetString();
                if (doc.RootElement.TryGetProperty("id", out var j3)) return j3.GetString();
            }
            catch { }

            // Fall back: treat the whole body as the ID (plain-text gateway style)
            var trimmed = body.Trim();
            return trimmed.Length <= 100 ? trimmed : null;
        }
    }
}
