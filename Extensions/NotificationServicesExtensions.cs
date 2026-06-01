using Microsoft.Extensions.Options;
using SmsApi.Messaging;
using SmsApi.Messaging.Providers.AiSensy;
using SmsApi.Services.Messaging;

namespace SmsApi.Extensions;

/// <summary>
/// Registers the outbound channel messaging engine (WhatsApp/SMS via AiSensy).
/// Called from <see cref="ApplicationServicesExtensions.AddApplicationServices"/>.
/// To add a new channel provider: implement <see cref="IChannelProvider"/> and add
/// <c>services.AddScoped&lt;IChannelProvider, YourProvider&gt;()</c> here.
/// </summary>
public static class NotificationServicesExtensions
{
    public static IServiceCollection AddNotificationServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // ── Configuration ──────────────────────────────────────────────────
        services.Configure<AiSensyOptions>(configuration.GetSection("AiSensy"));

        // ── Named HttpClient for AiSensy ───────────────────────────────────
        // Polly retry is applied at call-time inside AiSensyWhatsAppProvider
        // using ResiliencePolicies.GetHttpRetryPolicy(logger) — same pattern
        // as the existing CashfreeClient.
        services.AddHttpClient("AiSensy", (sp, client) =>
        {
            var opts = sp.GetRequiredService<IOptions<AiSensyOptions>>().Value;
            client.BaseAddress = new Uri(
                opts.BaseUrl.EndsWith('/') ? opts.BaseUrl : opts.BaseUrl + "/");
            client.DefaultRequestHeaders.Add("Accept", "application/json");
            client.Timeout = TimeSpan.FromSeconds(30);
        });

        // ── Channel providers (add more here as new channels are onboarded) ─
        services.AddScoped<IChannelProvider, AiSensyWhatsAppProvider>();

        // ── Orchestrator ───────────────────────────────────────────────────
        services.AddScoped<IChannelNotificationManager, NotificationManager>();

        // ── Audit log service (writes to existing AuditLogs table) ─────────
        services.AddScoped<INotificationLogService, NotificationLogService>();

        return services;
    }
}
