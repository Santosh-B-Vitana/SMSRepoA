using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using SmsApi.Infrastructure.Resilience;
using SmsApi.Infrastructure.TenantConfig;
using SmsApi.Services;

namespace SmsApi.Messaging.Providers.Office24by7
{
    /// <summary>
    /// Sends transactional email via Office24by7.
    /// Endpoint: POST https://apis.office24by7.com/getgenericsp
    ///
    /// Credentials are resolved per-branch from ISchoolBranchConfigResolver at send time.
    /// Short-circuits immediately with UnprocessableEntity when no config is found.
    /// </summary>
    public sealed class Office24by7EmailProvider : IChannelProvider
    {
        public CommunicationChannel Channel => CommunicationChannel.Email;

        private const string ClientName = "Office24by7";
        private const string ApiPath    = "getgenericsp";

        private static readonly JsonSerializerOptions SerializerOptions = new()
        {
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
            WriteIndented          = false
        };

        private readonly IHttpClientFactory _httpFactory;
        private readonly ISchoolBranchContext _branchCtx;
        private readonly ISchoolBranchConfigResolver _resolver;
        private readonly ILogger<Office24by7EmailProvider> _logger;

        public Office24by7EmailProvider(
            IHttpClientFactory httpFactory,
            ISchoolBranchContext branchCtx,
            ISchoolBranchConfigResolver resolver,
            ILogger<Office24by7EmailProvider> logger)
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
                    "No active school context — cannot resolve email credentials.",
                    HttpStatusCode.Unauthorized);

            var branchId = _branchCtx.BranchId;

            var config = await _resolver.GetEmailConfigAsync(schoolId, branchId, cancellationToken);
            if (config is null || !config.IsEnabled)
            {
                _logger.LogWarning(
                    "Office24by7 Email: no config for school={School} branch={Branch}. Send aborted.",
                    schoolId, branchId);
                return ChannelMessageResult.Failure(Channel,
                    $"No email configuration found for school {schoolId} / branch {branchId}.",
                    HttpStatusCode.UnprocessableEntity);
            }

            // ── 2. Build payload (exact Office24by7 schema) ──────────────────
            var payload = BuildPayload(config, request);

            // ── 3. Send with Polly retry ─────────────────────────────────────
            var retryPolicy = ResiliencePolicies.GetHttpRetryPolicy(_logger);
            try
            {
                var response = await retryPolicy.ExecuteAsync(async () =>
                {
                    var client = _httpFactory.CreateClient(ClientName);
                    return await client.PostAsJsonAsync(ApiPath, payload,
                        SerializerOptions, cancellationToken);
                });

                var body = await response.Content.ReadAsStringAsync(cancellationToken);

                if (response.IsSuccessStatusCode)
                {
                    var msgRef = TryExtractReference(body);
                    _logger.LogInformation(
                        "Office24by7 email sent to {Dest} school={School} branch={Branch} ref={Ref}",
                        request.Destination, schoolId, branchId, msgRef);
                    return ChannelMessageResult.Success(Channel,
                        msgRef ?? response.StatusCode.ToString(), response.StatusCode);
                }

                _logger.LogWarning(
                    "Office24by7 returned {Status} for {Dest}: {Body}",
                    (int)response.StatusCode, request.Destination, body);
                return ChannelMessageResult.Failure(Channel, body, response.StatusCode);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "Office24by7 email failed for {Dest} school={School} branch={Branch}",
                    request.Destination, schoolId, branchId);
                return ChannelMessageResult.Failure(Channel, ex.Message,
                    HttpStatusCode.InternalServerError);
            }
        }

        // ── Payload builder ──────────────────────────────────────────────────

        private static Office24by7EmailPayload BuildPayload(
            EmailChannelConfig config,
            ChannelMessageRequest request)
        {
            // Merge CustomAttributes + positional TemplateParameters into variables data
            var variables = new Dictionary<string, string>(request.CustomAttributes);
            for (var i = 0; i < request.TemplateParameters.Count; i++)
                variables[$"param{i + 1}"] = request.TemplateParameters[i];

            return new Office24by7EmailPayload
            {
                UserAuthToken = config.UserAuthToken,
                FromMail      = config.FromEmail,
                To            = request.Destination,
                Subject       = request.TemplateOrCampaignIdentifier,
                VariablesData = variables.Count > 0 ? variables : null
            };
        }

        private static string? TryExtractReference(string body)
        {
            try
            {
                using var doc = JsonDocument.Parse(body);
                if (doc.RootElement.TryGetProperty("messageId", out var m)) return m.GetString();
                if (doc.RootElement.TryGetProperty("reference",  out var r)) return r.GetString();
                if (doc.RootElement.TryGetProperty("id",          out var i)) return i.GetString();
            }
            catch { }
            return null;
        }
    }

    // ── Payload model ────────────────────────────────────────────────────────

    /// <summary>
    /// Exact JSON schema required by Office24by7 getgenericsp endpoint.
    /// Property names contain spaces — use JsonPropertyName attributes.
    /// </summary>
    internal sealed class Office24by7EmailPayload
    {
        [JsonPropertyName("user auth token")]
        public string UserAuthToken { get; set; } = string.Empty;

        [JsonPropertyName("from mail")]
        public string FromMail { get; set; } = string.Empty;

        [JsonPropertyName("to")]
        public string To { get; set; } = string.Empty;

        [JsonPropertyName("subject")]
        public string Subject { get; set; } = string.Empty;

        [JsonPropertyName("variables data")]
        public Dictionary<string, string>? VariablesData { get; set; }
    }
}
