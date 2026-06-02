using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using SmsApi.Infrastructure.Resilience;
using SmsApi.Infrastructure.TenantConfig;
using SmsApi.Services;

namespace SmsApi.Messaging.Providers.SmsStriker
{
    /// <summary>
    /// Sends transactional / promotional SMS via SMS Striker.
    /// Endpoint: POST https://www.smsstriker.com/API/sendsmsapi.php
    /// Content-Type: application/json
    ///
    /// Ecosystem: SmsStriker.
    /// Credentials resolved per-branch from ISchoolBranchConfigResolver at send time.
    /// </summary>
    public sealed class SmsStrikerSmsProvider : IChannelProvider
    {
        public CommunicationChannel Channel => CommunicationChannel.Sms;

        private readonly AsyncRetryPolicy<HttpResponseMessage> _retryPolicy;
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
            _retryPolicy = ResiliencePolicies.GetHttpRetryPolicy(logger);
        }

        public async Task<ChannelMessageResult> SendAsync(
            ChannelMessageRequest request,
            CancellationToken cancellationToken = default)
        {
            if (!_branchCtx.TryGetSchoolId(out var schoolId))
                return ChannelMessageResult.Failure(Channel,
                    "No active school context — cannot resolve SMS Striker credentials.",
                    HttpStatusCode.Unauthorized);

            var branchId = _branchCtx.BranchId;
            var config   = await _resolver.GetSmsConfigAsync(schoolId, branchId, cancellationToken);

            if (config is null || !config.IsEnabled)
            {
                _logger.LogWarning(
                    "SMS Striker: no config for school={School} branch={Branch}. Send aborted.",
                    schoolId, branchId);
                return ChannelMessageResult.Failure(Channel,
                    $"No SMS Striker configuration for school {schoolId} / branch {branchId}.",
                    HttpStatusCode.UnprocessableEntity);
            }

            var payload = new SmsStrikerPayload
            {
                Key  = config.ApiKey,
                From = config.SenderId,
                To   = request.Destination,
                Msg  = BuildMessageBody(request.TemplateOrCampaignIdentifier, request.TemplateParameters),
                Type = config.SmsType
            };

            try
            {
                var response = await _retryPolicy.ExecuteAsync(async () =>
                {
                    var client = _httpFactory.CreateClient(ProviderConstants.SmsStriker.ClientName);
                    return await client.PostAsJsonAsync(
                        ProviderConstants.SmsStriker.SendSms, payload, cancellationToken);
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
                return ChannelMessageResult.Failure(Channel, ex.Message, HttpStatusCode.InternalServerError);
            }
        }

        /// <summary>Substitutes positional placeholders {1}, {2}, … in the DLT template text.</summary>
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

        private static string? TryExtractJobId(string body)
        {
            if (string.IsNullOrWhiteSpace(body)) return null;
            try
            {
                using var doc = JsonDocument.Parse(body);
                if (doc.RootElement.TryGetProperty("Job Id", out var j1)) return j1.GetString();
                if (doc.RootElement.TryGetProperty("jobId",  out var j2)) return j2.GetString();
                if (doc.RootElement.TryGetProperty("job_id", out var j3)) return j3.GetString();
            }
            catch { /* non-JSON response */ }
            return null;
        }
    }

    // ── Payload model ────────────────────────────────────────────────────────

    internal sealed class SmsStrikerPayload
    {
        [JsonPropertyName("key")]
        public string Key { get; set; } = string.Empty;

        [JsonPropertyName("from")]
        public string From { get; set; } = string.Empty;

        [JsonPropertyName("to")]
        public string To { get; set; } = string.Empty;

        [JsonPropertyName("msg")]
        public string Msg { get; set; } = string.Empty;

        [JsonPropertyName("type")]
        public string Type { get; set; } = string.Empty;
    }
}
