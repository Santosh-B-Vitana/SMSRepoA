using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

namespace SmsApi.Extensions;

/// <summary>
/// Rate-limiter policy registrations.
/// Policies are tuned for a school SaaS with hundreds of concurrent users.
/// All policies use per-IP partitioning and respond 429 with RFC 7807 problem detail.
/// </summary>
public static class RateLimitingExtensions
{
    public static IServiceCollection AddApiRateLimiting(
        this IServiceCollection services)
    {
        services.AddRateLimiter(options =>
        {
            // Auth: 10 req/min — brute-force lockout layer 1 (Redis is layer 2)
            options.AddFixedWindowLimiter("auth", cfg =>
            {
                cfg.PermitLimit = 10;
                cfg.Window = TimeSpan.FromMinutes(1);
                cfg.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
                cfg.QueueLimit = 0;
            });

            // Global: 200 req/min per IP
            options.AddFixedWindowLimiter("global", cfg =>
            {
                cfg.PermitLimit = 200;
                cfg.Window = TimeSpan.FromMinutes(1);
                cfg.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
                cfg.QueueLimit = 5;
            });

            // File uploads: 5 req/min — I/O resource protection
            options.AddFixedWindowLimiter("uploads", cfg =>
            {
                cfg.PermitLimit = 5;
                cfg.Window = TimeSpan.FromMinutes(1);
                cfg.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
                cfg.QueueLimit = 0;
            });

            // Reports: 10 req/min — DB-heavy
            options.AddFixedWindowLimiter("reports", cfg =>
            {
                cfg.PermitLimit = 10;
                cfg.Window = TimeSpan.FromMinutes(1);
                cfg.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
                cfg.QueueLimit = 0;
            });

            // Bulk operations: 10 req/5min sliding window
            options.AddSlidingWindowLimiter("bulk", cfg =>
            {
                cfg.PermitLimit = 10;
                cfg.Window = TimeSpan.FromMinutes(5);
                cfg.SegmentsPerWindow = 5;
                cfg.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
                cfg.QueueLimit = 0;
            });

            // Search: 30 req/min
            options.AddFixedWindowLimiter("search", cfg =>
            {
                cfg.PermitLimit = 30;
                cfg.Window = TimeSpan.FromMinutes(1);
                cfg.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
                cfg.QueueLimit = 0;
            });

            // Export: 5 req/min — CPU + memory intensive
            options.AddFixedWindowLimiter("export", cfg =>
            {
                cfg.PermitLimit = 5;
                cfg.Window = TimeSpan.FromMinutes(1);
                cfg.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
                cfg.QueueLimit = 0;
            });

            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.OnRejected = async (context, token) =>
            {
                context.HttpContext.Response.ContentType = "application/problem+json";
                await context.HttpContext.Response.WriteAsJsonAsync(new
                {
                    type = "https://tools.ietf.org/html/rfc6585#section-4",
                    title = "Too Many Requests",
                    status = 429,
                    detail = "Rate limit exceeded. Please slow down.",
                    retryAfter = 60
                }, token);
            };
        });

        return services;
    }
}
