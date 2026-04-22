using System.Text.Json;
using System.Text.Json.Nodes;

namespace SmsApi.Middleware;

/// <summary>
/// Wraps all successful JSON responses in a standard envelope:
/// { "success": true, "data": ..., "timestamp": "...", "correlationId": "..." }
///
/// Also sanitizes 4xx/5xx error responses in production to prevent leaking internal
/// exception messages or stack traces to clients (OWASP A09).
///
/// Skips wrapping for: non-JSON, health checks, Swagger, file downloads.
/// </summary>
public class ApiResponseWrapperMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IWebHostEnvironment _env;
    private static readonly HashSet<string> SkipPaths = new(StringComparer.OrdinalIgnoreCase)
    {
        "/health",
        "/swagger",
    };

    public ApiResponseWrapperMiddleware(RequestDelegate next, IWebHostEnvironment env)
    {
        _next = next;
        _env = env;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path.Value ?? "";
        if (ShouldSkip(path))
        {
            await _next(context);
            return;
        }

        var originalBody = context.Response.Body;
        using var memoryStream = new MemoryStream();
        context.Response.Body = memoryStream;

        await _next(context);

        memoryStream.Seek(0, SeekOrigin.Begin);
        var responseBody = await new StreamReader(memoryStream).ReadToEndAsync();

        var statusCode = context.Response.StatusCode;
        var contentType = context.Response.ContentType ?? "";
        var isJson = contentType.Contains("application/json", StringComparison.OrdinalIgnoreCase);

        if (statusCode >= 200 && statusCode < 300 && isJson && !string.IsNullOrWhiteSpace(responseBody))
        {
            object? data;
            try { data = JsonSerializer.Deserialize<JsonElement>(responseBody); }
            catch
            {
                await PassThroughAsync(memoryStream, originalBody, context);
                return;
            }

            var envelope = new
            {
                success = true,
                statusCode,
                data,
                timestamp = DateTime.UtcNow,
                correlationId = context.Items["CorrelationId"]?.ToString()
            };

            context.Response.Body = originalBody;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(envelope);
        }
        else if (statusCode >= 400 && isJson && !string.IsNullOrWhiteSpace(responseBody))
        {
            // Strip raw exception details from 5xx responses in production (OWASP A09)
            var sanitized = SanitizeErrorBody(responseBody, statusCode);
            context.Response.Body = originalBody;
            context.Response.ContentType = "application/json";
            await context.Response.Body.WriteAsync(System.Text.Encoding.UTF8.GetBytes(sanitized));
        }
        else
        {
            await PassThroughAsync(memoryStream, originalBody, context);
        }
    }

    private string SanitizeErrorBody(string body, int statusCode)
    {
        if (_env.IsProduction() && statusCode >= 500)
        {
            try
            {
                var node = JsonNode.Parse(body);
                if (node is JsonObject obj)
                {
                    obj.Remove("error");
                    obj.Remove("stackTrace");
                    obj.Remove("innerException");
                    return obj.ToJsonString();
                }
            }
            catch
            {
                return "{\"message\":\"An internal error occurred.\",\"statusCode\":" + statusCode + "}";
            }
        }
        return body;
    }

    private static async Task PassThroughAsync(MemoryStream source, Stream destination, HttpContext context)
    {
        source.Seek(0, SeekOrigin.Begin);
        await source.CopyToAsync(destination);
        context.Response.Body = destination;
    }

    private static bool ShouldSkip(string path)
    {
        foreach (var skip in SkipPaths)
            if (path.StartsWith(skip, StringComparison.OrdinalIgnoreCase))
                return true;
        return false;
    }
}
