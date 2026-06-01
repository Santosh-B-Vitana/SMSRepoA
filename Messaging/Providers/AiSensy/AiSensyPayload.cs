using System.Text.Json.Serialization;

namespace SmsApi.Messaging.Providers.AiSensy;

internal sealed class AiSensyPayload
{
    [JsonPropertyName("apiKey")]
    public string ApiKey { get; set; } = string.Empty;

    [JsonPropertyName("campaignName")]
    public string CampaignName { get; set; } = string.Empty;

    [JsonPropertyName("destination")]
    public string Destination { get; set; } = string.Empty;

    [JsonPropertyName("userName")]
    public string UserName { get; set; } = string.Empty;

    [JsonPropertyName("source")]
    public string Source { get; set; } = string.Empty;

    /// <summary>Omitted from JSON when null (i.e., when no media URL is provided).</summary>
    [JsonPropertyName("media")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public AiSensyMedia? Media { get; set; }

    [JsonPropertyName("templateParams")]
    public List<string> TemplateParams { get; set; } = new();

    [JsonPropertyName("attributes")]
    public Dictionary<string, string> Attributes { get; set; } = new();
}

internal sealed class AiSensyMedia
{
    [JsonPropertyName("url")]
    public string Url { get; set; } = string.Empty;

    [JsonPropertyName("filename")]
    public string Filename { get; set; } = string.Empty;
}
