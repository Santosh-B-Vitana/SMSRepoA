using Serilog.Context;

namespace SmsApi.Middleware;

/// <summary>
/// Propagates a correlation ID through the request pipeline for distributed tracing.
/// If the client sends X-Correlation-Id, it is reused; otherwise a new one is generated.
/// The ID is pushed into Serilog's LogContext so every log line includes it.
/// </summary>
public class CorrelationIdMiddleware
{
    private const string HeaderName = "X-Correlation-Id";
    private readonly RequestDelegate _next;

    public CorrelationIdMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var correlationId = context.Request.Headers[HeaderName].FirstOrDefault()
                            ?? Guid.NewGuid().ToString("N");

        // Store for downstream middleware / controllers
        context.Items["CorrelationId"] = correlationId;

        // Echo back to caller for end-to-end tracing
        context.Response.OnStarting(() =>
        {
            context.Response.Headers[HeaderName] = correlationId;
            return Task.CompletedTask;
        });

        // Push into Serilog LogContext so structured logs include it automatically
        using (LogContext.PushProperty("CorrelationId", correlationId))
        {
            await _next(context);
        }
    }
}
