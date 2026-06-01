using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using SmsApi.Infrastructure.Resilience;
using SmsApi.Infrastructure.TenantConfig;
using SmsApi.Services;

namespace SmsApi.Messaging.Providers.Msg91
{
    /// <summary>
    /// Sends DLT-compliant SMS via MSG91 Flow API v5.
    /// Endpoint: POST https://api.msg91.com/api/v5/flow/
    /// Headers:  authkey: {branch.AuthKey}
    /// </summary>
    public sealed class Msg91SmsProvider : IChannelProvider
    {
        public CommunicationChannel Channel => CommunicationChannel.Sms;

        private const string ClientName = "Msg91";
        private const string ApiPath    = "api/v5/flow/";

        private readonly IHttpClientFactory _httpFactory;
        private readonly ISchoolBranchContext _branchCtx;
        private readonly ISchoolBranchConfigResolver _resolver;
        private readonly ILogger<Msg91SmsProvider> _logger;

        public Msg91SmsProvider(
            IHttpClientFactory httpFactory,
            ISchoolBranchContext branchCtx,
            ISchoolBranchConfigResolver resolver,
            ILogger<Msg91SmsProvider> logger)
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
            // ── Tenant isolation guard ───────────────────────────────────────
            if (!_branchCtx.TryGetSchoolId(out var schoolId))
                return ChannelMessageResult.Failure(Channel,
                    "No active school context — cannot resolve MSG91 SMS credentials.",
                    HttpStatusCode.Unauthorized);

            var branchId = _branchCtx.BranchId;
            var config   = await _resolver.GetMsg91SmsConfigAsync(schoolId, branchId, cancellationToken);

            if (config is null || !config.IsEnabled)
            {
                _logger.LogWarning(
                    "MSG91 SMS: no config for school={School} branch={Branch}. Send aborted.",
                    schoolId, branchId);
                return ChannelMessageResult.Failure(Channel,
                    $"No MSG91 SMS configuration for school {schoolId} / branch {branchId}.",
                    HttpStatusCode.UnprocessableEntity);
            }

            // ── Build MSG91 v5 flow payload ──────────────────────────────────
            // Variables are mapped by ordinal: TemplateParameters[0] → var1, etc.
            var recipient = new Msg91SmsRecipient { Mobiles = request.Destination };
            for (var i = 0; i < request.TemplateParameters.Count; i++)
                recipient.Variables[$"var{i + 1}"] = request.TemplateParameters[i];

            var payload = new Msg91SmsPayload
            {
                TemplateId        = config.TemplateId,
                SenderId          = config.SenderId,
                ShortUrl          = "0",
                RealTimeResponse  = "1",
                Recipients        = new List<Msg91SmsRecipient> { recipient }
            };

            // ── Send with Polly retry ────────────────────────────────────────
            var retryPolicy = ResiliencePolicies.GetHttpRetryPolicy(_logger);
            try
            {
                var response = await retryPolicy.ExecuteAsync(async () =>
                {
                    var client = _httpFactory.CreateClient(ClientName);
                    // MSG91 auth via header, not body
                    var req = new HttpRequestMessage(HttpMethod.Post, ApiPath)
                    {
                        Content = JsonContent.Create(payload)
                    };
                    req.Headers.TryAddWithoutValidation("authkey", config.AuthKey);
                    return await client.SendAsync(req, cancellationToken);
                });

                var body = await response.Content.ReadAsStringAsync(cancellationToken);

                if (response.IsSuccessStatusCode)
                {
                    var reqId = TryExtractRequestId(body);
                    _logger.LogInformation(
                        "MSG91 SMS sent to {Dest} school={School} branch={Branch} requestId={Id}",
                        request.Destination, schoolId, branchId, reqId);
                    return ChannelMessageResult.Success(Channel, reqId ?? "ok", response.StatusCode);
                }

                _logger.LogWarning(
                    "MSG91 SMS returned {Status} for {Dest}: {Body}",
                    (int)response.StatusCode, request.Destination, body);
                return ChannelMessageResult.Failure(Channel, body, response.StatusCode);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "MSG91 SMS failed for {Dest} school={School} branch={Branch}",
                    request.Destination, schoolId, branchId);
                return ChannelMessageResult.Failure(Channel, ex.Message,
                    HttpStatusCode.InternalServerError);
            }
        }

        private static string? TryExtractRequestId(string body)
        {
            try
            {
                using var doc = JsonDocument.Parse(body);
                if (doc.RootElement.TryGetProperty("request_id", out var r)) return r.GetString();
                if (doc.RootElement.TryGetProperty("message",    out var m)) return m.GetString();
            }
            catch { }
            return null;
        }
    }

    // ── Payload models ────────────────────────────────────────────────────────

    internal sealed class Msg91SmsPayload
    {
        [JsonPropertyName("template_id")]
        public string TemplateId { get; set; } = string.Empty;

        [JsonPropertyName("sender")]
        public string SenderId { get; set; } = string.Empty;

        [JsonPropertyName("short_url")]
        public string ShortUrl { get; set; } = "0";

        [JsonPropertyName("realTimeResponse")]
        public string RealTimeResponse { get; set; } = "1";

        [JsonPropertyName("recipients")]
        public List<Msg91SmsRecipient> Recipients { get; set; } = new();
    }

    internal sealed class Msg91SmsRecipient
    {
        [JsonPropertyName("mobiles")]
        public string Mobiles { get; set; } = string.Empty;

        // Dynamic variable substitution: var1, var2, var3…
        // Written as individual JSON properties via a custom converter.
        [JsonExtensionData]
        public Dictionary<string, object?> Variables { get; set; } = new();
    }
}
