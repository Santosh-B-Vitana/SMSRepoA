using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SmsApi.Infrastructure.Resilience;

namespace SmsApi.Messaging.Providers.AiSensy;

public sealed class AiSensyWhatsAppProvider : IChannelProvider
{
    public CommunicationChannel Channel => CommunicationChannel.WhatsApp;

    private const string Endpoint = "campaign/t1/api/v2";

    private readonly IHttpClientFactory _httpFactory;
    private readonly AiSensyOptions _options;
    private readonly ILogger<AiSensyWhatsAppProvider> _logger;

    public AiSensyWhatsAppProvider(
        IHttpClientFactory httpFactory,
        IOptions<AiSensyOptions> options,
        ILogger<AiSensyWhatsAppProvider> logger)
    {
        _httpFactory = httpFactory;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<ChannelMessageResult> SendAsync(
        ChannelMessageRequest request,
        CancellationToken cancellationToken = default)
    {
        var payload = BuildPayload(request);
        var retryPolicy = ResiliencePolicies.GetHttpRetryPolicy(_logger);

        try
        {
            var response = await retryPolicy.ExecuteAsync(async () =>
            {
                var client = _httpFactory.CreateClient("AiSensy");
                return await client.PostAsJsonAsync(Endpoint, payload, cancellationToken);
            });

            if (response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(cancellationToken);
                var msgId = TryExtractMessageId(body);
                _logger.LogInformation(
                    "AiSensy WhatsApp sent to {Destination} campaign={Campaign} msgId={MsgId}",
                    request.Destination, request.TemplateOrCampaignIdentifier, msgId);
                return ChannelMessageResult.Success(CommunicationChannel.WhatsApp,
                    msgId ?? response.StatusCode.ToString(), response.StatusCode);
            }

            var error = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogWarning(
                "AiSensy returned {Status} for {Destination}: {Error}",
                (int)response.StatusCode, request.Destination, error);
            return ChannelMessageResult.Failure(CommunicationChannel.WhatsApp, error, response.StatusCode);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "AiSensy send failed for {Destination} campaign={Campaign}",
                request.Destination, request.TemplateOrCampaignIdentifier);
            return ChannelMessageResult.Failure(CommunicationChannel.WhatsApp,
                ex.Message, HttpStatusCode.InternalServerError);
        }
    }

    private AiSensyPayload BuildPayload(ChannelMessageRequest request) => new()
    {
        ApiKey       = _options.ApiKey,
        CampaignName = request.TemplateOrCampaignIdentifier,
        Destination  = request.Destination,
        UserName     = request.RecipientName,
        Source       = _options.DefaultSource,
        TemplateParams = request.TemplateParameters,
        Attributes   = request.CustomAttributes,
        Media = !string.IsNullOrWhiteSpace(request.MediaUrl)
            ? new AiSensyMedia { Url = request.MediaUrl!, Filename = request.MediaFilename ?? string.Empty }
            : null
    };

    private static string? TryExtractMessageId(string body)
    {
        try
        {
            using var doc = JsonDocument.Parse(body);
            if (doc.RootElement.TryGetProperty("messageId", out var el)) return el.GetString();
        }
        catch { }
        return null;
    }
}
