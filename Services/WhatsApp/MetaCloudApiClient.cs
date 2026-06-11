using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Caching.Distributed;
using Polly;
using Polly.CircuitBreaker;
using Polly.Retry;

namespace SmsApi.Services.WhatsApp;

/// <summary>
/// Production-grade Meta Cloud API client.
/// Handles message sending, template management, and per-number rate limiting.
/// </summary>
public class MetaCloudApiClient : IMetaCloudApiClient
{
    private readonly HttpClient _httpClient;
    private readonly IDistributedCache _cache;
    private readonly ILogger<MetaCloudApiClient> _logger;
    private readonly IConfiguration _configuration;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        PropertyNameCaseInsensitive = true
    };

    private const int RateLimitPerSecond = 80;

    public MetaCloudApiClient(
        HttpClient httpClient,
        IDistributedCache cache,
        ILogger<MetaCloudApiClient> logger,
        IConfiguration configuration)
    {
        _httpClient = httpClient;
        _cache = cache;
        _logger = logger;
        _configuration = configuration;
    }

    public async Task<MetaSendMessageResponse> SendTemplateMessageAsync(
        string phoneNumberId,
        string accessToken,
        MetaSendMessageRequest request,
        CancellationToken cancellationToken = default)
    {
        await EnforceRateLimitAsync(phoneNumberId, cancellationToken);

        var url = $"{GetApiVersion()}/{phoneNumberId}/messages";
        var json = JsonSerializer.Serialize(request, JsonOptions);
        using var content = new StringContent(json, Encoding.UTF8, "application/json");

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = content
        };
        httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        _logger.LogDebug("Meta API: sending template message to {PhoneNumberId}, recipient {To}",
            phoneNumberId, request.To);

        var response = await _httpClient.SendAsync(httpRequest, cancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Meta API send failed: {StatusCode} — {Body}",
                response.StatusCode, responseBody);

            var errorResponse = TryDeserialize<MetaSendMessageResponse>(responseBody);
            return errorResponse ?? new MetaSendMessageResponse(
                null, null, null,
                new MetaError((int)response.StatusCode, responseBody, "HttpError"));
        }

        var result = TryDeserialize<MetaSendMessageResponse>(responseBody);
        _logger.LogDebug("Meta API: message sent, waMid={WaMessageId}",
            result?.Messages?.FirstOrDefault()?.Id);

        return result ?? new MetaSendMessageResponse(null, null, null,
            new MetaError(0, "Failed to deserialize response", "ParseError"));
    }

    public async Task<MetaCreateTemplateResponse> CreateTemplateAsync(
        string wabaId,
        string accessToken,
        MetaCreateTemplateRequest request,
        CancellationToken cancellationToken = default)
    {
        var url = $"{GetApiVersion()}/{wabaId}/message_templates";
        var json = JsonSerializer.Serialize(request, JsonOptions);
        using var content = new StringContent(json, Encoding.UTF8, "application/json");

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = content
        };
        httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        _logger.LogInformation("Meta API: submitting template '{Name}' for WABA {WabaId}", request.Name, wabaId);

        var response = await _httpClient.SendAsync(httpRequest, cancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Meta API create template failed: {StatusCode} — {Body}",
                response.StatusCode, responseBody);
            return new MetaCreateTemplateResponse(null, null, null, null,
                new MetaError((int)response.StatusCode, responseBody, "HttpError"));
        }

        return TryDeserialize<MetaCreateTemplateResponse>(responseBody)
               ?? new MetaCreateTemplateResponse(null, null, null, null,
                   new MetaError(0, "Failed to deserialize response", "ParseError"));
    }

    public async Task<bool> DeleteTemplateAsync(
        string wabaId,
        string accessToken,
        string templateName,
        CancellationToken cancellationToken = default)
    {
        var url = $"{GetApiVersion()}/{wabaId}/message_templates?name={Uri.EscapeDataString(templateName)}";

        using var httpRequest = new HttpRequestMessage(HttpMethod.Delete, url);
        httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var response = await _httpClient.SendAsync(httpRequest, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogWarning("Meta API delete template failed: {StatusCode} — {Body}",
                response.StatusCode, body);
            return false;
        }

        return true;
    }

    public async Task<MetaTemplateStatusResponse?> GetTemplateAsync(
        string templateId,
        string accessToken,
        CancellationToken cancellationToken = default)
    {
        var url = $"{GetApiVersion()}/{templateId}?fields=id,name,status,rejected_reason";

        using var httpRequest = new HttpRequestMessage(HttpMethod.Get, url);
        httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var response = await _httpClient.SendAsync(httpRequest, cancellationToken);
        if (!response.IsSuccessStatusCode)
            return null;

        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        return TryDeserialize<MetaTemplateStatusResponse>(body);
    }

    // ── Rate Limiting (80 msg/s per phone number) ─────────────────────────────

    private async Task EnforceRateLimitAsync(string phoneNumberId, CancellationToken cancellationToken)
    {
        var key = $"wa:rl:{phoneNumberId}:{DateTime.UtcNow:yyyyMMddHHmmss}";

        var countBytes = await _cache.GetAsync(key, cancellationToken);
        var count = countBytes != null ? BitConverter.ToInt32(countBytes) : 0;

        if (count >= RateLimitPerSecond)
        {
            // Wait 50ms and retry once — simple backpressure
            _logger.LogWarning("WhatsApp rate limit reached for {PhoneNumberId}, throttling 50ms", phoneNumberId);
            await Task.Delay(50, cancellationToken);
        }

        count++;
        await _cache.SetAsync(
            key,
            BitConverter.GetBytes(count),
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(2) },
            cancellationToken);
    }

    private string GetApiVersion()
        => _configuration["WhatsApp:MetaApiVersion"] ?? "v19.0";

    private static T? TryDeserialize<T>(string json) where T : class
    {
        try { return JsonSerializer.Deserialize<T>(json, JsonOptions); }
        catch { return null; }
    }
}

// ── Polly Resilience Policies ─────────────────────────────────────────────────

public static class MetaApiResiliencePolicy
{
    public static IAsyncPolicy<HttpResponseMessage> GetRetryPolicy()
    {
        return Policy<HttpResponseMessage>
            .Handle<HttpRequestException>()
            .OrResult(r => r.StatusCode == HttpStatusCode.TooManyRequests ||
                           r.StatusCode == HttpStatusCode.ServiceUnavailable ||
                           r.StatusCode == HttpStatusCode.GatewayTimeout)
            .WaitAndRetryAsync(
                retryCount: 3,
                sleepDurationProvider: attempt => TimeSpan.FromSeconds(Math.Pow(2, attempt)),
                onRetry: (outcome, timespan, attempt, _) =>
                {
                    Serilog.Log.Warning(
                        "Meta API retry {Attempt}/3 after {Delay}s — {Reason}",
                        attempt, timespan.TotalSeconds,
                        outcome.Exception?.Message ?? outcome.Result?.StatusCode.ToString());
                });
    }

    public static IAsyncPolicy<HttpResponseMessage> GetCircuitBreakerPolicy()
    {
        return Policy<HttpResponseMessage>
            .Handle<HttpRequestException>()
            .OrResult(r => (int)r.StatusCode >= 500)
            .CircuitBreakerAsync(
                handledEventsAllowedBeforeBreaking: 5,
                durationOfBreak: TimeSpan.FromMinutes(2),
                onBreak: (_, duration) =>
                    Serilog.Log.Warning("Meta API circuit breaker OPEN for {Duration}s", duration.TotalSeconds),
                onReset: () =>
                    Serilog.Log.Information("Meta API circuit breaker CLOSED"));
    }
}
