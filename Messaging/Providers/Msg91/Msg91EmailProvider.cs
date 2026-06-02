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
    /// Sends transactional email via MSG91 Email API v5.
    /// Endpoint: POST https://api.msg91.com/api/v5/email/send
    /// Auth:     authkey header per request.
    ///
    /// Ecosystem: Msg91.
    /// </summary>
    public sealed class Msg91EmailProvider : IChannelProvider
    {
        public CommunicationChannel Channel => CommunicationChannel.Email;

        private readonly AsyncRetryPolicy<HttpResponseMessage> _retryPolicy;
        private readonly IHttpClientFactory _httpFactory;
        private readonly ISchoolBranchContext _branchCtx;
        private readonly ISchoolBranchConfigResolver _resolver;
        private readonly ILogger<Msg91EmailProvider> _logger;

        public Msg91EmailProvider(
            IHttpClientFactory httpFactory,
            ISchoolBranchContext branchCtx,
            ISchoolBranchConfigResolver resolver,
            ILogger<Msg91EmailProvider> logger)
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
                    "No active school context — cannot resolve MSG91 email credentials.",
                    HttpStatusCode.Unauthorized);

            var branchId = _branchCtx.BranchId;
            var config   = await _resolver.GetMsg91EmailConfigAsync(schoolId, branchId, cancellationToken);

            if (config is null || !config.IsEnabled)
            {
                _logger.LogWarning(
                    "MSG91 Email: no config for school={School} branch={Branch}. Send aborted.",
                    schoolId, branchId);
                return ChannelMessageResult.Failure(Channel,
                    $"No MSG91 email configuration for school {schoolId} / branch {branchId}.",
                    HttpStatusCode.UnprocessableEntity);
            }

            var payload = BuildPayload(config, request);

            try
            {
                var response = await _retryPolicy.ExecuteAsync(async () =>
                {
                    var client = _httpFactory.CreateClient(ProviderConstants.Msg91.ClientName);
                    var req = new HttpRequestMessage(HttpMethod.Post, ProviderConstants.Msg91.SendEmail)
                    {
                        Content = JsonContent.Create(payload)
                    };
                    req.Headers.TryAddWithoutValidation("authkey", config.AuthKey);
                    return await client.SendAsync(req, cancellationToken);
                });

                var body = await response.Content.ReadAsStringAsync(cancellationToken);

                if (response.IsSuccessStatusCode)
                {
                    var msgId = TryExtractMessageId(body);
                    _logger.LogInformation(
                        "MSG91 email sent to {Dest} school={School} branch={Branch} msgId={Id}",
                        request.Destination, schoolId, branchId, msgId);
                    return ChannelMessageResult.Success(Channel, msgId ?? "ok", response.StatusCode);
                }

                _logger.LogWarning(
                    "MSG91 email returned {Status} for {Dest}: {Body}",
                    (int)response.StatusCode, request.Destination, body);
                return ChannelMessageResult.Failure(Channel, body, response.StatusCode);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "MSG91 email failed for {Dest} school={School} branch={Branch}",
                    request.Destination, schoolId, branchId);
                return ChannelMessageResult.Failure(Channel, ex.Message, HttpStatusCode.InternalServerError);
            }
        }

        private static Msg91EmailPayload BuildPayload(Msg91EmailConfig config, ChannelMessageRequest request)
        {
            var variables = new Dictionary<string, string>(request.CustomAttributes);
            for (var i = 0; i < request.TemplateParameters.Count; i++)
                variables[$"var{i + 1}"] = request.TemplateParameters[i];

            return new Msg91EmailPayload
            {
                To         = new List<Msg91EmailAddress> { new() { Name = request.RecipientName, Email = request.Destination } },
                From       = new Msg91EmailAddress { Name = config.FromName, Email = config.FromEmail },
                Domain     = config.Domain,
                TemplateId = config.TemplateId,
                Variables  = variables.Count > 0 ? variables : null
            };
        }

        private static string? TryExtractMessageId(string body)
        {
            try
            {
                using var doc = JsonDocument.Parse(body);
                if (doc.RootElement.TryGetProperty("message_id", out var m)) return m.GetString();
                if (doc.RootElement.TryGetProperty("request_id", out var r)) return r.GetString();
            }
            catch { }
            return null;
        }
    }

    // ── Payload models ────────────────────────────────────────────────────────

    internal sealed class Msg91EmailPayload
    {
        [JsonPropertyName("to")]
        public List<Msg91EmailAddress> To { get; set; } = new();

        [JsonPropertyName("from")]
        public Msg91EmailAddress From { get; set; } = new();

        [JsonPropertyName("domain")]
        public string Domain { get; set; } = string.Empty;

        [JsonPropertyName("template_id")]
        public string TemplateId { get; set; } = string.Empty;

        [JsonPropertyName("variables")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public Dictionary<string, string>? Variables { get; set; }
    }

    internal sealed class Msg91EmailAddress
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("email")]
        public string Email { get; set; } = string.Empty;
    }
}
