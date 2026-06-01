using SmsApi.Infrastructure.TenantConfig;
using SmsApi.Messaging;
using SmsApi.Messaging.Providers.Msg91;
using SmsApi.Services;
using SmsApi.Services.Messaging;

namespace SmsApi.Extensions;

/// <summary>
/// Registers the outbound channel messaging engine.
///
/// Active provider: MSG91 (SMS + WhatsApp + Email).
///
/// To switch providers, replace the three AddScoped lines below with the
/// alternative implementations — no other code changes are required:
///
///   SMS     : SmsStrikerSmsProvider    (Messaging/Providers/SmsStriker/)
///   Email   : Office24by7EmailProvider (Messaging/Providers/Office24by7/)
///   WhatsApp: (implement IChannelProvider with Channel = WhatsApp)
///
/// All providers read per-branch credentials from tenant-configs.json via
/// ISchoolBranchConfigResolver. Add the branch credential block to that
/// file for whichever provider you activate.
/// </summary>
public static class NotificationServicesExtensions
{
    public static IServiceCollection AddNotificationServices(
        this IServiceCollection services,
        IConfiguration configuration,
        IWebHostEnvironment environment)
    {
        // ── In-process cache for branch credential resolution ──────────────
        services.AddMemoryCache();

        // ── Branch context (SchoolId + BranchId from JWT / X-Branch-Id header) ─
        services.AddScoped<ISchoolBranchContext, SchoolBranchContextAccessor>();

        // ── Config resolver (tenant-configs.json → IMemoryCache, 30-min TTL) ─
        // Singleton: JSON tree is immutable at runtime. Replace with a
        // DbContext-backed implementation here when the DB schema is finalised.
        services.AddSingleton<ISchoolBranchConfigResolver, SchoolBranchConfigResolver>();

        // ── MSG91 HttpClient ───────────────────────────────────────────────
        // Auth key is injected per-request inside each provider — never here.
        services.AddHttpClient("Msg91", client =>
        {
            client.BaseAddress = new Uri("https://api.msg91.com/");
            client.DefaultRequestHeaders.Add("Accept", "application/json");
            client.Timeout = TimeSpan.FromSeconds(25);
        });

        // ── Active channel providers (MSG91) ──────────────────────────────
        services.AddScoped<IChannelProvider, Msg91SmsProvider>();
        services.AddScoped<IChannelProvider, Msg91WhatsAppProvider>();
        services.AddScoped<IChannelProvider, Msg91EmailProvider>();

        // ── Orchestrator ───────────────────────────────────────────────────
        services.AddScoped<IChannelNotificationManager, NotificationManager>();

        // ── Audit log service (writes to existing AuditLogs table) ─────────
        services.AddScoped<INotificationLogService, NotificationLogService>();

        return services;
    }
}
