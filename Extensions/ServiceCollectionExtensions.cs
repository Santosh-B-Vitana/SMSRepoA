using System.IO.Compression;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using System.Text.Json;

namespace SmsApi.Extensions;

/// <summary>
/// Production-grade service registration extensions.
/// Keeps Program.cs clean and focused.
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Configure Brotli + GZip response compression with mime types.
    /// </summary>
    public static IServiceCollection AddProductionResponseCompression(this IServiceCollection services)
    {
        services.AddResponseCompression(options =>
        {
            options.EnableForHttps = true;
            options.Providers.Add<BrotliCompressionProvider>();
            options.Providers.Add<GzipCompressionProvider>();
            options.MimeTypes = ResponseCompressionDefaults.MimeTypes.Concat(new[]
            {
                "application/json",
                "application/javascript",
                "text/css",
                "text/plain",
                "text/html",
                "application/xml",
                "text/xml"
            });
        });

        services.Configure<BrotliCompressionProviderOptions>(options =>
            options.Level = CompressionLevel.Fastest);

        services.Configure<GzipCompressionProviderOptions>(options =>
            options.Level = CompressionLevel.Optimal);

        return services;
    }

    /// <summary>
    /// Configure HSTS for production (308 permanent redirect, 1-year max-age).
    /// </summary>
    public static IServiceCollection AddProductionHttpsSecurity(
        this IServiceCollection services, IHostEnvironment environment)
    {
        if (!environment.IsDevelopment())
        {
            services.AddHsts(options =>
            {
                options.Preload = true;
                options.IncludeSubDomains = true;
                options.MaxAge = TimeSpan.FromDays(365);
                options.ExcludedHosts.Clear();
            });

            services.AddHttpsRedirection(options =>
            {
                options.RedirectStatusCode = StatusCodes.Status308PermanentRedirect;
                options.HttpsPort = 443;
            });
        }

        return services;
    }

    /// <summary>
    /// Configure Data Protection for IIS/production environments.
    /// On IIS, the app pool typically lacks access to HKLM registry and user profile.
    /// This method configures file-based key storage and disables isolation policies
    /// to prevent ephemeral key warnings.
    /// </summary>
    public static IServiceCollection ConfigureDataProtection(
        this IServiceCollection services,
        IHostEnvironment environment,
        IConfiguration configuration)
    {
        var dataProtectionBuilder = services.AddDataProtection();

        if (!environment.IsDevelopment())
        {
            // Use file-based storage for encryption keys on production/IIS
            // Keys are stored in a persistent location that survives app restarts
            var keyStoragePath = configuration["DataProtection:KeyStoragePath"]
                ?? Path.Combine(Directory.GetCurrentDirectory(), "keys");

            if (!Directory.Exists(keyStoragePath))
                Directory.CreateDirectory(keyStoragePath);

            dataProtectionBuilder.PersistKeysToFileSystem(new DirectoryInfo(keyStoragePath));
            Serilog.Log.Information("Data Protection: keys will be persisted to {Path}", keyStoragePath);
        }

        return services;
    }
}

/// <summary>
/// Kubernetes/Docker-ready health-check endpoint mapper.
/// </summary>
public static class ApplicationBuilderExtensions
{
    /// <summary>
    /// Map /health/live, /health/ready, and /health with JSON response writer.
    /// </summary>
    public static WebApplication MapHealthCheckEndpoints(this WebApplication app)
    {
        app.MapHealthChecks("/health/live", new HealthCheckOptions
        {
            Predicate = check => check.Tags.Contains("live"),
            ResponseWriter = WriteHealthCheckResponse
        });

        app.MapHealthChecks("/health/ready", new HealthCheckOptions
        {
            Predicate = check => check.Tags.Contains("ready"),
            ResponseWriter = WriteHealthCheckResponse
        });

        app.MapHealthChecks("/health", new HealthCheckOptions
        {
            ResponseWriter = WriteHealthCheckResponse
        });

        return app;
    }

    private static async Task WriteHealthCheckResponse(HttpContext context, HealthReport report)
    {
        context.Response.ContentType = "application/json";
        var response = new
        {
            status = report.Status.ToString(),
            totalDuration = report.TotalDuration.TotalMilliseconds,
            timestamp = DateTime.UtcNow,
            entries = report.Entries.Select(e => new
            {
                name = e.Key,
                status = e.Value.Status.ToString(),
                duration = e.Value.Duration.TotalMilliseconds,
                description = e.Value.Description
            })
        };
        await context.Response.WriteAsJsonAsync(response, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = true
        });
    }
}
