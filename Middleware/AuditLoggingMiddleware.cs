using System.Diagnostics;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using SmsApi.Data;
using SmsApi.Models.Entities;

namespace SmsApi.Middleware;

/// <summary>
/// Logs all mutating API requests (POST/PUT/PATCH/DELETE) to the AuditLogs table.
/// Redacts sensitive fields (password, token, secret) from request bodies.
/// </summary>
public class AuditLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<AuditLoggingMiddleware> _logger;

    private static readonly HashSet<string> AuditedMethods = new(StringComparer.OrdinalIgnoreCase)
    {
        "POST", "PUT", "PATCH", "DELETE"
    };

    private static readonly HashSet<string> SensitiveFields = new(StringComparer.OrdinalIgnoreCase)
    {
        "password", "passwordhash", "currentpassword", "newpassword", "confirmpassword",
        "secret", "token", "refreshtoken", "accesstoken", "twofactorsecret"
    };

    public AuditLoggingMiddleware(RequestDelegate next, ILogger<AuditLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, AppDbContext dbContext)
    {
        var path = context.Request.Path.Value ?? string.Empty;

        // Skip non-API and infra endpoints
        if (path.StartsWith("/health") ||
            path.StartsWith("/swagger") ||
            path.StartsWith("/_framework") ||
            path.EndsWith(".js") ||
            path.EndsWith(".css") ||
            path.EndsWith(".map"))
        {
            await _next(context);
            return;
        }

        bool shouldAudit = AuditedMethods.Contains(context.Request.Method);

        if (!shouldAudit)
        {
            await _next(context);
            return;
        }

        var stopwatch = Stopwatch.StartNew();
        string? requestBody = null;

        try
        {
            if (context.Request.ContentLength > 0)
            {
                requestBody = await ReadAndRedactBody(context.Request);
            }

            await _next(context);
            stopwatch.Stop();

            await WriteAuditLog(context, dbContext, requestBody, stopwatch.ElapsedMilliseconds, null);
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            _logger.LogError(ex, "Request failed — audit entry will include exception");
            await WriteAuditLog(context, dbContext, requestBody, stopwatch.ElapsedMilliseconds, ex.Message);
            throw;
        }
    }

    private async Task WriteAuditLog(
        HttpContext context, AppDbContext dbContext,
        string? requestBody, long durationMs, string? exceptionMessage)
    {
        try
        {
            var user = context.User;

            var auditLog = new AuditLog
            {
                HttpMethod = context.Request.Method,
                Path = context.Request.Path.Value ?? string.Empty,
                QueryString = context.Request.QueryString.Value,
                StatusCode = context.Response.StatusCode,
                DurationMs = durationMs,
                IpAddress = GetClientIp(context),
                UserAgent = context.Request.Headers.UserAgent.ToString(),
                RequestBody = requestBody,
                ExceptionMessage = exceptionMessage,
                UserId = ParseGuidClaim(user, ClaimTypes.NameIdentifier),
                SchoolId = ParseGuidClaim(user, "SchoolId"),
                Username = user.Identity?.Name,
                ActionType = DetermineActionType(context.Request),
                EntityId = ExtractEntityId(context.Request),
                EntityType = ExtractEntityType(context.Request)
            };

            dbContext.AuditLogs.Add(auditLog);
            await dbContext.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            // Never fail the request because of audit logging
            _logger.LogError(ex, "Failed to write audit log entry");
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static Guid? ParseGuidClaim(ClaimsPrincipal user, string claimType)
    {
        var value = user.FindFirst(claimType)?.Value;
        return Guid.TryParse(value, out var id) ? id : null;
    }

    private static string GetClientIp(HttpContext context)
    {
        if (context.Request.Headers.TryGetValue("X-Forwarded-For", out var xff) && !string.IsNullOrEmpty(xff))
            return xff.ToString().Split(',')[0].Trim();

        if (context.Request.Headers.TryGetValue("X-Real-IP", out var realIp) && !string.IsNullOrEmpty(realIp))
            return realIp.ToString();

        return context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }

    private static string? DetermineActionType(HttpRequest request)
    {
        var segments = (request.Path.Value ?? string.Empty)
            .Split('/', StringSplitOptions.RemoveEmptyEntries);
        return segments.Length >= 2 ? $"{request.Method}_{segments[1]}" : request.Method;
    }

    private static Guid? ExtractEntityId(HttpRequest request)
    {
        foreach (var seg in (request.Path.Value ?? string.Empty).Split('/'))
        {
            if (Guid.TryParse(seg, out var id)) return id;
        }
        return null;
    }

    private static string? ExtractEntityType(HttpRequest request)
    {
        var segments = (request.Path.Value ?? string.Empty)
            .Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (segments.Length >= 2 && segments[0].Equals("api", StringComparison.OrdinalIgnoreCase))
        {
            var resource = segments[1];
            if (resource.EndsWith('s') && resource.Length > 1)
                return char.ToUpper(resource[0]) + resource[1..^1];
            return char.ToUpper(resource[0]) + resource[1..];
        }
        return null;
    }

    // ── Request body reading & redaction ─────────────────────────────────────

    private async Task<string?> ReadAndRedactBody(HttpRequest request)
    {
        try
        {
            request.EnableBuffering();
            using var reader = new StreamReader(request.Body, Encoding.UTF8, false, 1024, leaveOpen: true);
            var body = await reader.ReadToEndAsync();
            request.Body.Position = 0;
            return RedactSensitiveData(body);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to read request body for audit");
            return null;
        }
    }

    private static string? RedactSensitiveData(string? json)
    {
        if (string.IsNullOrEmpty(json)) return json;
        try
        {
            using var doc = JsonDocument.Parse(json);
            using var stream = new MemoryStream();
            using var writer = new Utf8JsonWriter(stream, new JsonWriterOptions { Indented = false });
            RedactElement(doc.RootElement, writer);
            writer.Flush();
            return Encoding.UTF8.GetString(stream.ToArray());
        }
        catch
        {
            return json; // not JSON — return as-is
        }
    }

    private static void RedactElement(JsonElement element, Utf8JsonWriter writer)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                writer.WriteStartObject();
                foreach (var prop in element.EnumerateObject())
                {
                    writer.WritePropertyName(prop.Name);
                    if (SensitiveFields.Contains(prop.Name))
                        writer.WriteStringValue("***REDACTED***");
                    else
                        RedactElement(prop.Value, writer);
                }
                writer.WriteEndObject();
                break;

            case JsonValueKind.Array:
                writer.WriteStartArray();
                foreach (var item in element.EnumerateArray())
                    RedactElement(item, writer);
                writer.WriteEndArray();
                break;

            default:
                element.WriteTo(writer);
                break;
        }
    }
}
