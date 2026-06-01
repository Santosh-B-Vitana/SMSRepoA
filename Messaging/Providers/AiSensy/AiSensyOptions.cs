namespace SmsApi.Messaging.Providers.AiSensy;

/// <summary>
/// Bound from appsettings.json section "AiSensy".
/// In production, set ApiKey via environment variable AiSensy__ApiKey.
/// </summary>
public class AiSensyOptions
{
    public string ApiKey { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://backend.aisensy.com/";
    public string DefaultSource { get; set; } = "WebPlatform";
}
