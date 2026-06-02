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
    /// Sends transactional email via Office24by7 (Email channel in the SmsStriker ecosystem).
    /// Endpoint: POST https://apis.office24by7.com/getgenericsp
    /// Content-Type: application/json
    ///
    /// Ecosystem: SmsStriker.
    /// Credentials resolved per-branch from ISchoolBranchConfigResolver at send time.
    ///
    /// Request: { api_name, user_auth_token, from_mail, to_mail, subject, template_id, variables_data }
    /// Response success: { "status": "success", "message": "Email sent successfully" }
    /// </summary>
    public sealed class Office24by7EmailProvider : IChannelProvider
    {
        public CommunicationChannel Channel => CommunicationChannel.Email;

        private static readonly JsonSerializerOptions SerializerOptions = new()
        {
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
            WriteIndented          = false
        };

        private readonly AsyncRetryPolicy<HttpResponseMessage> _retryPolicy;
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
            _retryPolicy = ResiliencePolicies.GetHttpRetryPolicy(logger);
        }

        public async Task<ChannelMessageResult> SendAsync(
            ChannelMessageRequest request,
            CancellationToken cancellationToken = default)
        {
            if (!_branchCtx.TryGetSchoolId(out var schoolId))
                return ChannelMessageResult.Failure(Channel,
                    "No active school context — cannot resolve Office24by7 email credentials.",
                    HttpStatusCode.Unauthorized);

            var branchId = _branchCtx.BranchId;
            var config   = await _resolver.GetEmailConfigAsync(schoolId, branchId, cancellationToken);

            if (config is null || !config.IsEnabled)
            {
                _logger.LogWarning(
                    "Office24by7 Email: no config for school={School} branch={Branch}. Send aborted.",
                    schoolId, branchId);
                return ChannelMessageResult.Failure(Channel,
                    $"No Office24by7 email configuration for school {schoolId} / branch {branchId}.",
                    HttpStatusCode.UnprocessableEntity);
            }

            var payload = BuildPayload(config, request);

            try
            {
                var response = await _retryPolicy.ExecuteAsync(async () =>
                {
                    var client = _httpFactory.CreateClient(ProviderConstants.Office24by7.ClientName);
                    return await client.PostAsJsonAsync(
                        ProviderConstants.Office24by7.SendEmail, payload, SerializerOptions, cancellationToken);
                });

                var body = await response.Content.ReadAsStringAsync(cancellationToken);

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation(
                        "Office24by7 email sent to {Dest} school={School} branch={Branch}",
                        request.Destination, schoolId, branchId);
                    return ChannelMessageResult.Success(Channel, "sent", response.StatusCode);
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
                return ChannelMessageResult.Failure(Channel, ex.Message, HttpStatusCode.InternalServerError);
            }
        }

        private static Office24by7EmailPayload BuildPayload(
            EmailChannelConfig config,
            ChannelMessageRequest request)
        {
            // CustomAttributes carry named template variables (##key##).
            // TemplateParameters carry positional overflows mapped to param1, param2, …
            var variables = new Dictionary<string, string>(request.CustomAttributes);
            for (var i = 0; i < request.TemplateParameters.Count; i++)
                variables[$"param{i + 1}"] = request.TemplateParameters[i];

            return new Office24by7EmailPayload
            {
                UserAuthToken = config.UserAuthToken,
                FromMail      = config.FromEmail,
                ToMail        = request.Destination,
                Subject       = request.TemplateOrCampaignIdentifier,
                TemplateId    = config.TemplateId,
                VariablesData = variables.Count > 0 ? variables : null
            };
        }
    }

    // ── Payload model ────────────────────────────────────────────────────────

    /// <summary>Exact JSON schema required by Office24by7 getgenericsp endpoint.</summary>
    internal sealed class Office24by7EmailPayload
    {
        [JsonPropertyName("api_name")]
        public string ApiName { get; set; } = "EmailSend";

        [JsonPropertyName("user_auth_token")]
        public string UserAuthToken { get; set; } = string.Empty;

        [JsonPropertyName("from_mail")]
        public string FromMail { get; set; } = string.Empty;

        [JsonPropertyName("to_mail")]
        public string ToMail { get; set; } = string.Empty;

        [JsonPropertyName("subject")]
        public string Subject { get; set; } = string.Empty;

        [JsonPropertyName("template_id")]
        public string TemplateId { get; set; } = string.Empty;

        [JsonPropertyName("variables_data")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public Dictionary<string, string>? VariablesData { get; set; }
    }
}
