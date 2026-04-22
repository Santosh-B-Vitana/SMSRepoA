using System.Diagnostics;

namespace SmsApi.Infrastructure.Performance;

/// <summary>
/// Tracks every request's duration and logs slow endpoints.
/// - WARNING at > 500 ms
/// - ERROR at > 2 000 ms (SLA breach)
/// Adds X-Response-Time header so browsers / APM tools can display it.
/// </summary>
public class PerformanceMonitoringMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<PerformanceMonitoringMiddleware> _logger;

    private static readonly HashSet<string> SkipPaths = new(StringComparer.OrdinalIgnoreCase)
    {
        "/health",
        "/swagger",
        "/favicon.ico",
    };

    public PerformanceMonitoringMiddleware(
        RequestDelegate next,
        ILogger<PerformanceMonitoringMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path.Value ?? "";
        if (SkipPaths.Any(p => path.StartsWith(p, StringComparison.OrdinalIgnoreCase)))
        {
            await _next(context);
            return;
        }

        var sw = Stopwatch.StartNew();

        // Register header before the response starts (headers become read-only once streaming begins)
        context.Response.OnStarting(() =>
        {
            sw.Stop();
            context.Response.Headers.TryAdd("X-Response-Time", $"{sw.ElapsedMilliseconds}ms");
            return Task.CompletedTask;
        });

        await _next(context);

        sw.Stop();
        var elapsed = sw.ElapsedMilliseconds;

        var method = context.Request.Method;
        var statusCode = context.Response.StatusCode;

        if (elapsed > 2_000)
        {
            _logger.LogError(
                "SLA BREACH: {Method} {Path} took {Elapsed}ms — status {Status}. Investigate immediately.",
                method, path, elapsed, statusCode);
        }
        else if (elapsed > 500)
        {
            _logger.LogWarning(
                "Slow request: {Method} {Path} took {Elapsed}ms — status {Status}.",
                method, path, elapsed, statusCode);
        }
        else
        {
            _logger.LogDebug(
                "Request: {Method} {Path} → {Status} in {Elapsed}ms",
                method, path, statusCode, elapsed);
        }
    }
}

/// <summary>
/// Extension method for clean middleware registration.
/// </summary>
public static class PerformanceMonitoringMiddlewareExtensions
{
    public static IApplicationBuilder UsePerformanceMonitoring(this IApplicationBuilder app)
        => app.UseMiddleware<PerformanceMonitoringMiddleware>();
}
