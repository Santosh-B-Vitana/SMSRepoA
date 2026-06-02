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
    /// Sends WhatsApp template messages via MSG91 outbound bulk API v5.
    /// Endpoint: POST https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/
    /// Auth:     authkey header per request.
    ///
    /// Ecosystem: Msg91.
    ///
    /// Supports optional media attachment via Base64-encoded document streaming.
    /// If request.MediaUrl starts with "data:", it is embedded as Base64.
    /// If it is an HTTPS URL, it is passed as a remote link.
    /// </summary>
    public sealed class Msg91WhatsAppProvider : IChannelProvider
    {
        public CommunicationChannel Channel => CommunicationChannel.WhatsApp;

        private readonly AsyncRetryPolicy<HttpResponseMessage> _retryPolicy;
        private readonly IHttpClientFactory _httpFactory;
        private readonly ISchoolBranchContext _branchCtx;
        private readonly ISchoolBranchConfigResolver _resolver;
        private readonly ILogger<Msg91WhatsAppProvider> _logger;

        public Msg91WhatsAppProvider(
            IHttpClientFactory httpFactory,
            ISchoolBranchContext branchCtx,
            ISchoolBranchConfigResolver resolver,
            ILogger<Msg91WhatsAppProvider> logger)
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
                    "No active school context — cannot resolve MSG91 WhatsApp credentials.",
                    HttpStatusCode.Unauthorized);

            var branchId = _branchCtx.BranchId;
            var config   = await _resolver.GetMsg91WhatsAppConfigAsync(schoolId, branchId, cancellationToken);

            if (config is null || !config.IsEnabled)
            {
                _logger.LogWarning(
                    "MSG91 WhatsApp: no config for school={School} branch={Branch}. Send aborted.",
                    schoolId, branchId);
                return ChannelMessageResult.Failure(Channel,
                    $"No MSG91 WhatsApp configuration for school {schoolId} / branch {branchId}.",
                    HttpStatusCode.UnprocessableEntity);
            }

            var payload = BuildPayload(config, request);

            try
            {
                var response = await _retryPolicy.ExecuteAsync(async () =>
                {
                    var client = _httpFactory.CreateClient(ProviderConstants.Msg91.ClientName);
                    var req = new HttpRequestMessage(HttpMethod.Post, ProviderConstants.Msg91.SendWhatsApp)
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
                        "MSG91 WhatsApp sent to {Dest} school={School} branch={Branch} msgId={Id}",
                        request.Destination, schoolId, branchId, msgId);
                    return ChannelMessageResult.Success(Channel, msgId ?? "ok", response.StatusCode);
                }

                _logger.LogWarning(
                    "MSG91 WhatsApp returned {Status} for {Dest}: {Body}",
                    (int)response.StatusCode, request.Destination, body);
                return ChannelMessageResult.Failure(Channel, body, response.StatusCode);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "MSG91 WhatsApp failed for {Dest} school={School} branch={Branch}",
                    request.Destination, schoolId, branchId);
                return ChannelMessageResult.Failure(Channel, ex.Message, HttpStatusCode.InternalServerError);
            }
        }

        private static Msg91WaPayload BuildPayload(Msg91WhatsAppConfig config, ChannelMessageRequest request)
        {
            var bodyComponents = new List<Msg91WaComponent>();

            if (request.TemplateParameters.Count > 0)
            {
                bodyComponents.Add(new Msg91WaComponent
                {
                    Type       = "body",
                    Parameters = request.TemplateParameters
                        .Select(p => new Msg91WaParameter { Type = "text", Text = p })
                        .ToList()
                });
            }

            if (!string.IsNullOrWhiteSpace(request.MediaUrl))
            {
                var doc = new Msg91WaDocument
                {
                    Filename = request.MediaFilename ?? "attachment",
                    Caption  = string.Empty
                };

                if (request.MediaUrl.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
                    doc.Base64 = request.MediaUrl;
                else
                    doc.Link = request.MediaUrl;

                bodyComponents.Insert(0, new Msg91WaComponent
                {
                    Type       = "header",
                    Parameters = new List<Msg91WaParameter>
                    {
                        new() { Type = "document", Document = doc }
                    }
                });
            }

            return new Msg91WaPayload
            {
                IntegratedNumber = config.IntegratedNumber,
                ContentType      = "template",
                Payload = new Msg91WaMessagePayload
                {
                    MessagingProduct = "whatsapp",
                    Type             = "template",
                    To               = request.Destination,
                    Template = new Msg91WaTemplate
                    {
                        Name       = request.TemplateOrCampaignIdentifier,
                        Language   = new Msg91WaLanguage { Code = "en" },
                        Components = bodyComponents
                    }
                }
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

    internal sealed class Msg91WaPayload
    {
        [JsonPropertyName("integrated_number")]
        public string IntegratedNumber { get; set; } = string.Empty;

        [JsonPropertyName("content_type")]
        public string ContentType { get; set; } = "template";

        [JsonPropertyName("payload")]
        public Msg91WaMessagePayload Payload { get; set; } = new();
    }

    internal sealed class Msg91WaMessagePayload
    {
        [JsonPropertyName("messaging_product")]
        public string MessagingProduct { get; set; } = "whatsapp";

        [JsonPropertyName("type")]
        public string Type { get; set; } = "template";

        [JsonPropertyName("to")]
        public string To { get; set; } = string.Empty;

        [JsonPropertyName("template")]
        public Msg91WaTemplate Template { get; set; } = new();
    }

    internal sealed class Msg91WaTemplate
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("language")]
        public Msg91WaLanguage Language { get; set; } = new();

        [JsonPropertyName("components")]
        public List<Msg91WaComponent> Components { get; set; } = new();
    }

    internal sealed class Msg91WaLanguage
    {
        [JsonPropertyName("code")]
        public string Code { get; set; } = "en";
    }

    internal sealed class Msg91WaComponent
    {
        [JsonPropertyName("type")]
        public string Type { get; set; } = string.Empty;

        [JsonPropertyName("parameters")]
        public List<Msg91WaParameter> Parameters { get; set; } = new();
    }

    internal sealed class Msg91WaParameter
    {
        [JsonPropertyName("type")]
        public string Type { get; set; } = "text";

        [JsonPropertyName("text")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? Text { get; set; }

        [JsonPropertyName("document")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public Msg91WaDocument? Document { get; set; }
    }

    internal sealed class Msg91WaDocument
    {
        [JsonPropertyName("link")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? Link { get; set; }

        [JsonPropertyName("base64")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? Base64 { get; set; }

        [JsonPropertyName("filename")]
        public string Filename { get; set; } = string.Empty;

        [JsonPropertyName("caption")]
        public string Caption { get; set; } = string.Empty;
    }
}
