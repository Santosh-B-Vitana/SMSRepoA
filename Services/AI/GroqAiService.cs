using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace SmsApi.Services.AI;

// ─── Contract ────────────────────────────────────────────────────────────────

public interface IGroqAiService
{
    /// <summary>
    /// Use Groq (Llama 4 Scout) to format a school announcement into a
    /// concise, WhatsApp-friendly utility message. Falls back gracefully
    /// if the API key is missing or the call fails.
    /// </summary>
    Task<WhatsAppFormattedMessage> FormatAnnouncementAsync(
        string title,
        string content,
        string audience,
        string priority,
        CancellationToken ct = default);
}

/// <summary>
/// Three parts that together form a WhatsApp utility message body.
/// The full message = Greeting + "\n\n" + Body + "\n\n" + Closing
/// </summary>
public record WhatsAppFormattedMessage(
    string Greeting,  // e.g. "Dear Parent,"
    string Body,      // AI-formatted concise announcement body (≤ 300 chars)
    string Closing    // e.g. "– School Management"
)
{
    /// <summary>Assembled full message body ready to stuff into a template placeholder.</summary>
    public string Full => $"{Greeting}\n\n{Body}\n\n{Closing}";

    /// <summary>Short preview for UI/logging (first 100 chars).</summary>
    public string Preview => Full.Length > 100 ? Full[..100] + "…" : Full;
}

// ─── Implementation ───────────────────────────────────────────────────────────

public class GroqAiService : IGroqAiService
{
    private const string GroqApiEndpoint = "https://api.groq.com/openai/v1/chat/completions";
    private const string DefaultModel    = "llama-4-scout-17b-16e-instruct";

    private readonly IHttpClientFactory _httpFactory;
    private readonly IConfiguration     _config;
    private readonly ILogger<GroqAiService> _logger;

    public GroqAiService(
        IHttpClientFactory httpFactory,
        IConfiguration config,
        ILogger<GroqAiService> logger)
    {
        _httpFactory = httpFactory;
        _config      = config;
        _logger      = logger;
    }

    public async Task<WhatsAppFormattedMessage> FormatAnnouncementAsync(
        string title, string content, string audience, string priority,
        CancellationToken ct = default)
    {
        var apiKey = _config["Groq:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            _logger.LogWarning("Groq:ApiKey is not configured — using raw announcement text");
            return Fallback(title, content);
        }

        var model = _config["Groq:Model"] ?? DefaultModel;
        var audienceLabel = audience switch
        {
            "Parents"  => "parents",
            "Staff"    => "staff members",
            "Students" => "students",
            _          => "the school community"
        };

        var system = "You are a professional school communication assistant. " +
                     "You convert school announcements into concise WhatsApp utility messages. " +
                     "Rules: use *bold* sparingly for key info, no markdown headers (#), " +
                     "no bullet lists, keep body under 300 characters, be warm but professional.";

        var user =
            $"Convert this school announcement into a WhatsApp utility message for {audienceLabel}.\n\n" +
            $"Title: {title}\n" +
            $"Content: {content}\n" +
            $"Priority: {priority}\n\n" +
            "Respond ONLY with valid JSON — no explanation, no markdown fence — exactly:\n" +
            "{\n" +
            "  \"greeting\": \"Dear Parent,\",\n" +
            "  \"body\": \"...(formatted body, max 300 chars)...\",\n" +
            "  \"closing\": \"– School Management\"\n" +
            "}";

        try
        {
            var http = _httpFactory.CreateClient("Groq");
            http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
            http.Timeout = TimeSpan.FromSeconds(20);

            var payload = JsonSerializer.Serialize(new
            {
                model,
                messages = new[]
                {
                    new { role = "system",    content = system },
                    new { role = "user",      content = user   }
                },
                response_format = new { type = "json_object" },
                max_tokens = 300,
                temperature = 0.25
            });

            using var resp = await http.PostAsync(
                GroqApiEndpoint,
                new StringContent(payload, Encoding.UTF8, "application/json"),
                ct);

            if (!resp.IsSuccessStatusCode)
            {
                var err = await resp.Content.ReadAsStringAsync(ct);
                _logger.LogWarning("Groq API error {Status}: {Body}", (int)resp.StatusCode, err);
                return Fallback(title, content);
            }

            var json = await resp.Content.ReadAsStringAsync(ct);
            using var root = JsonDocument.Parse(json);

            var innerText = root.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString() ?? "{}";

            using var inner = JsonDocument.Parse(innerText);

            var greeting = TryGet(inner, "greeting") ?? "Dear Parent,";
            var body     = TryGet(inner, "body")     ?? $"*{title}*\n\n{content}";
            var closing  = TryGet(inner, "closing")  ?? "– School Management";

            _logger.LogInformation("Groq formatted announcement '{Title}' for {Audience}", title, audience);
            return new WhatsAppFormattedMessage(greeting, body, closing);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Groq AI formatting failed — falling back to raw content");
            return Fallback(title, content);
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static WhatsAppFormattedMessage Fallback(string title, string content)
    {
        var body = content.Length > 280 ? content[..277] + "…" : content;
        return new WhatsAppFormattedMessage("Dear Parent,", $"*{title}*\n\n{body}", "– School Management");
    }

    private static string? TryGet(JsonDocument doc, string key)
    {
        return doc.RootElement.TryGetProperty(key, out var el)
            ? el.GetString()
            : null;
    }
}
