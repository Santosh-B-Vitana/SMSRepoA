using SmsApi.Services;

namespace SmsApi.Middleware;

/// <summary>
/// Resolves the <see cref="SmsApi.Models.CRM.SchoolConfig"/> for the current request
/// based on the incoming Host header domain. The resolved config is stored in
/// <c>HttpContext.Items["SchoolConfig"]</c> so that the dynamically-configured
/// <c>AppDbContext</c> can pick up the correct DBServer and DBName per tenant.
/// </summary>
public class SchoolDbContextMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<SchoolDbContextMiddleware> _logger;

    // Paths that must be reachable without a school domain match
    private static readonly string[] _bypassPrefixes =
    [
        "/health",
        "/swagger",
        "/files"
    ];

    public SchoolDbContextMiddleware(RequestDelegate next, ILogger<SchoolDbContextMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, ISchoolConfigService schoolConfigService)
    {
        var path = context.Request.Path.Value ?? string.Empty;

        // Allow health/swagger/static paths through without a CRM lookup
        if (_bypassPrefixes.Any(p => path.StartsWith(p, StringComparison.OrdinalIgnoreCase)))
        {
            await _next(context);
            return;
        }

        var host = context.Request.Host.Host;
        _logger.LogInformation("SchoolDbContext: resolving config for domain {Host}", host);

        if (!string.IsNullOrWhiteSpace(host))
        {
            var schoolConfig = await schoolConfigService.GetByDomainAsync(host, context.RequestAborted);
            if (schoolConfig != null)
            {
                context.Items["SchoolConfig"] = schoolConfig;
            }
            else
            {
                // No CRM entry for this domain — log a warning and continue.
                // The per-request connection string resolver falls back to the
                // credential template from appsettings, which is the correct
                // behaviour for single-school IIS deployments.
                _logger.LogWarning(
                    "SchoolDbContext: no active SchoolConfig found for domain {Host}; "
                    + "falling back to default connection string.", host);
            }
        }

        await _next(context);
    }
}

public static class SchoolDbContextMiddlewareExtensions
{
    public static IApplicationBuilder UseSchoolDbContext(this IApplicationBuilder app)
        => app.UseMiddleware<SchoolDbContextMiddleware>();
}
