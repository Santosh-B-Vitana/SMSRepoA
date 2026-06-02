using SmsApi.Infrastructure.TenantConfig;
using SmsApi.Messaging;
using SmsApi.Messaging.Providers.Msg91;
using SmsApi.Messaging.Providers.SmsStriker;
using SmsApi.Services;
using SmsApi.Services.Messaging;

namespace SmsApi.Extensions;

/// <summary>
/// Registers the outbound channel messaging engine.
///
/// ── Active stack ─────────────────────────────────────────────────────────
/// Currently: MSG91 (SMS + WhatsApp + Email).
///
/// ── To switch to SmsStriker / Office24by7 ────────────────────────────────
/// 1. Comment out the three MSG91 AddScoped lines.
/// 2. Uncomment the two SmsStriker/Office24by7 AddScoped lines.
/// 3. Populate the sms / email credential blocks in tenant-configs.json.
///
/// All HTTP clients (MSG91, SmsStriker, Office24by7) are always registered
/// so switching never requires adding a new AddHttpClient call.
/// ─────────────────────────────────────────────────────────────────────────
/// </summary>
public static class NotificationServicesExtensions
{
    public static IServiceCollection AddNotificationServices(
        this IServiceCollection services,
        IWebHostEnvironment environment)
    {
        // ── In-process cache for credential resolution ────────────────────────
        services.AddMemoryCache();

        // ── Branch context (SchoolId + BranchId from JWT / X-Branch-Id header) ─
        services.AddScoped<ISchoolBranchContext, SchoolBranchContextAccessor>();

        // ── Config resolver (tenant-configs.json → IMemoryCache, 30-min TTL) ──
        services.AddSingleton<ISchoolBranchConfigResolver, SchoolBranchConfigResolver>();

        // ── HTTP clients ──────────────────────────────────────────────────────
        // All three are always registered so switching providers is a one-line swap.
        // Auth credentials are injected per-request inside each provider, never here.
        services.AddHttpClient(ProviderConstants.Msg91.ClientName, client =>
        {
            client.BaseAddress = new Uri(ProviderConstants.Msg91.BaseUrl);
            client.DefaultRequestHeaders.Add("Accept", "application/json");
            client.Timeout = TimeSpan.FromSeconds(25);
        });

        services.AddHttpClient(ProviderConstants.SmsStriker.ClientName, client =>
        {
            client.BaseAddress = new Uri(ProviderConstants.SmsStriker.BaseUrl);
            client.DefaultRequestHeaders.Add("Accept", "application/json");
            client.Timeout = TimeSpan.FromSeconds(25);
        });

        services.AddHttpClient(ProviderConstants.Office24by7.ClientName, client =>
        {
            client.BaseAddress = new Uri(ProviderConstants.Office24by7.BaseUrl);
            client.DefaultRequestHeaders.Add("Accept", "application/json");
            client.Timeout = TimeSpan.FromSeconds(25);
        });

        // ── Active providers ──────────────────────────────────────────────────

        // Ecosystem B — MSG91 (currently active)
        services.AddScoped<IChannelProvider, Msg91SmsProvider>();
        services.AddScoped<IChannelProvider, Msg91WhatsAppProvider>();
        services.AddScoped<IChannelProvider, Msg91EmailProvider>();

        // Ecosystem A — SmsStriker + Office24by7 (uncomment to activate instead of MSG91)
        // services.AddScoped<IChannelProvider, SmsStrikerSmsProvider>();
        // services.AddScoped<IChannelProvider, Office24by7EmailProvider>();

        // ── Orchestrator ──────────────────────────────────────────────────────
        services.AddScoped<IChannelNotificationManager, NotificationManager>();

        // ── Audit log service ─────────────────────────────────────────────────
        services.AddScoped<INotificationLogService, NotificationLogService>();

        return services;
    }
}
