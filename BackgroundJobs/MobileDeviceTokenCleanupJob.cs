using Hangfire;
using Microsoft.EntityFrameworkCore;
using SmsApi.Data;

namespace SmsApi.BackgroundJobs;

/// <summary>
/// Runs weekly. Marks device tokens inactive and soft-deletes them when the device
/// has not been seen for more than 90 days, satisfying NFR-5 from EP-06.
/// FCM also invalidates stale tokens on delivery failure; this job is the
/// belt-and-suspenders cleanup that reclaims rows before they accumulate.
/// </summary>
[DisableConcurrentExecution(timeoutInSeconds: 120)]
public class MobileDeviceTokenCleanupJob
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<MobileDeviceTokenCleanupJob> _logger;

    public MobileDeviceTokenCleanupJob(
        IServiceScopeFactory scopeFactory,
        ILogger<MobileDeviceTokenCleanupJob> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public async Task RunAsync(CancellationToken ct = default)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var cutoff = DateTime.UtcNow.AddDays(-90);

        var deactivated = await db.MobileDeviceTokens
            .Where(t => t.LastActiveAt < cutoff && t.IsActive && !t.IsDeleted)
            .ExecuteUpdateAsync(s => s
                .SetProperty(t => t.IsActive, false)
                .SetProperty(t => t.IsDeleted, true)
                .SetProperty(t => t.DeletedAt, DateTime.UtcNow),
            ct);

        _logger.LogInformation(
            "MobileDeviceTokenCleanupJob: deactivated {Count} tokens inactive since before {Cutoff:yyyy-MM-dd}",
            deactivated,
            cutoff);
    }
}
