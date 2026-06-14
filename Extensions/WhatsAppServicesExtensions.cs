using Hangfire;
using Hangfire.SqlServer;
using SmsApi.BackgroundJobs;
using SmsApi.Services.WhatsApp;

namespace SmsApi.Extensions;

public static class WhatsAppServicesExtensions
{
    public static IServiceCollection AddWhatsAppServices(
        this IServiceCollection services,
        IConfiguration configuration,
        IWebHostEnvironment? environment = null)
    {
        // ── Meta Cloud API typed HTTP client (Polly: 3 retries, exponential backoff) ──
        services.AddHttpClient<IMetaCloudApiClient, MetaCloudApiClient>(client =>
        {
            var baseUrl = configuration["WhatsApp:MetaApiBaseUrl"] ?? "https://graph.facebook.com";
            client.BaseAddress = new Uri(baseUrl);
            client.DefaultRequestHeaders.Add("Accept", "application/json");
            client.Timeout = TimeSpan.FromSeconds(30);
        })
        .AddPolicyHandler(MetaApiResiliencePolicy.GetRetryPolicy())
        .AddPolicyHandler(MetaApiResiliencePolicy.GetCircuitBreakerPolicy());

        // ── Core WhatsApp services ────────────────────────────────────────────
        services.AddScoped<IWhatsAppService, WhatsAppService>();
        services.AddScoped<IWhatsAppTemplateService, WhatsAppTemplateService>();
        services.AddScoped<IWhatsAppContactResolver, WhatsAppContactResolver>();
        services.AddScoped<IWhatsAppQuotaService, WhatsAppQuotaService>();
        services.AddScoped<IWhatsAppEligibilityChecker, WhatsAppEligibilityChecker>();
        services.AddScoped<IWhatsAppWebhookProcessor, WhatsAppWebhookProcessor>();

        // ── Super Admin services (CRM-level) ─────────────────────────────────
        services.AddScoped<IWhatsAppHubService, WhatsAppHubService>();

        // ── Background job classes (transient — Hangfire creates them) ────────
        services.AddTransient<WhatsAppMessageProcessorJob>();
        services.AddTransient<WhatsAppRenewalEngineJob>();
        services.AddTransient<WhatsAppExpirationJob>();
        services.AddTransient<WhatsAppRetryJob>();
        services.AddTransient<WhatsAppCostAggregatorJob>();
        services.AddTransient<WhatsAppUsageSyncJob>();
        services.AddTransient<WhatsAppQuotaAlertJob>();
        services.AddTransient<WhatsAppInvoiceGeneratorJob>();

        // ── Hangfire background jobs ──────────────────────────────────────────
        var hangfireConnectionString = configuration.GetConnectionString("CRMConnection")
            ?? configuration.GetConnectionString("DefaultConnection");

        // Hangfire storage selection:
        // - SQL Server: when connection string is available AND Hangfire SQL schema exists
        //   (checked via HANGFIRE_SQL_STORAGE env var or non-Development environment)
        // - InMemory: development default, or when HANGFIRE_SQL_STORAGE is not set
        // The HANGFIRE_SQL_STORAGE env var can be set to "true" to force SQL Server in any env.
        var useHangfireSql = (System.Environment.GetEnvironmentVariable("HANGFIRE_SQL_STORAGE") ?? "false")
            .Equals("true", StringComparison.OrdinalIgnoreCase);

        if (!string.IsNullOrEmpty(hangfireConnectionString) && useHangfireSql)
        {
            services.AddHangfire(config => config
                .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
                .UseSimpleAssemblyNameTypeSerializer()
                .UseRecommendedSerializerSettings()
                .UseSqlServerStorage(hangfireConnectionString, new SqlServerStorageOptions
                {
                    CommandBatchMaxTimeout = TimeSpan.FromMinutes(5),
                    SlidingInvisibilityTimeout = TimeSpan.FromMinutes(5),
                    QueuePollInterval = TimeSpan.Zero,
                    UseRecommendedIsolationLevel = true,
                    DisableGlobalLocks = true,
                    SchemaName = "hangfire"
                }));
            Serilog.Log.Information("Hangfire: SQL Server storage configured");
        }
        else
        {
            // Default: in-memory (safe in dev, and in prod without Hangfire SQL schema).
            // Set HANGFIRE_SQL_STORAGE=true to enable persistent job storage.
            services.AddHangfire(config => config
                .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
                .UseSimpleAssemblyNameTypeSerializer()
                .UseRecommendedSerializerSettings()
                .UseInMemoryStorage());
            Serilog.Log.Information("Hangfire: in-memory storage (set HANGFIRE_SQL_STORAGE=true to use SQL Server)");
        }

        // Only start the Hangfire background server when SQL storage is configured.
        // Without SQL Server Hangfire schema, workers would fail immediately.
        if (useHangfireSql)
        {
            services.AddHangfireServer(options =>
            {
                options.WorkerCount = 5;
                options.Queues = new[] { "whatsapp-critical", "whatsapp-high", "whatsapp-default", "default" };
            });
        }

        return services;
    }

    public static WebApplication UseWhatsAppHub(this WebApplication app)
    {
        // Hangfire dashboard — super_admin only
        try
        {
            app.UseHangfireDashboard("/hangfire", new DashboardOptions
            {
                Authorization = new[] { new HangfireSuperAdminAuthFilter() },
                DashboardTitle = "Vitana SMS — Background Jobs"
            });
        }
        catch (Exception ex)
        {
            Serilog.Log.Warning(ex, "Hangfire dashboard registration failed — skipping");
        }

        // Schedule recurring WhatsApp jobs (skip gracefully if Hangfire schema not ready)
        try
        {
        RecurringJob.AddOrUpdate<WhatsAppMessageProcessorJob>(
            "whatsapp-message-processor",
            job => job.ProcessBatchAsync(CancellationToken.None),
            "*/30 * * * * *",
            new RecurringJobOptions { TimeZone = TimeZoneInfo.Utc });

        RecurringJob.AddOrUpdate<WhatsAppRenewalEngineJob>(
            "whatsapp-renewal-engine",
            job => job.RunAsync(CancellationToken.None),
            Cron.Daily(0, 1));

        RecurringJob.AddOrUpdate<WhatsAppExpirationJob>(
            "whatsapp-expiration",
            job => job.RunAsync(CancellationToken.None),
            Cron.Daily(0, 5));

        RecurringJob.AddOrUpdate<WhatsAppRetryJob>(
            "whatsapp-retry",
            job => job.RunAsync(CancellationToken.None),
            "*/15 * * * *");

        RecurringJob.AddOrUpdate<WhatsAppCostAggregatorJob>(
            "whatsapp-cost-aggregator",
            job => job.RunAsync(CancellationToken.None),
            Cron.Hourly());

        RecurringJob.AddOrUpdate<WhatsAppUsageSyncJob>(
            "whatsapp-usage-sync",
            job => job.RunAsync(CancellationToken.None),
            "*/5 * * * *");

        RecurringJob.AddOrUpdate<WhatsAppQuotaAlertJob>(
            "whatsapp-quota-alert",
            job => job.RunAsync(CancellationToken.None),
            Cron.Daily(3, 30));

        RecurringJob.AddOrUpdate<WhatsAppInvoiceGeneratorJob>(
            "whatsapp-invoice-generator",
            job => job.RunAsync(CancellationToken.None),
            "0 2 1 * *");

        // ── Mobile: stale FCM/APNs token cleanup (NFR-5, EP-06) ──────────────
        RecurringJob.AddOrUpdate<SmsApi.BackgroundJobs.MobileDeviceTokenCleanupJob>(
            "mobile-token-cleanup",
            job => job.RunAsync(CancellationToken.None),
            Cron.Weekly(DayOfWeek.Sunday, 2, 0),
            new RecurringJobOptions { TimeZone = TimeZoneInfo.Utc });
        }
        catch (Exception ex)
        {
            Serilog.Log.Warning(ex, "Hangfire recurring job registration failed — WhatsApp Hub jobs not scheduled (Hangfire schema may not be set up)");
        }

        return app;
    }
}

/// <summary>Restricts Hangfire dashboard access to SuperAdmin role only.</summary>
public class HangfireSuperAdminAuthFilter : Hangfire.Dashboard.IDashboardAuthorizationFilter
{
    public bool Authorize(Hangfire.Dashboard.DashboardContext context)
    {
        var httpContextAccessor = context.GetType()
            .GetProperty("HttpContext")?.GetValue(context) as Microsoft.AspNetCore.Http.HttpContext;

        if (httpContextAccessor == null) return false;

        return httpContextAccessor.User.IsInRole("SuperAdmin") ||
               httpContextAccessor.User.IsInRole("super_admin");
    }
}
