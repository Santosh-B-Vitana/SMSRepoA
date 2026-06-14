using Hangfire;
using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.Entities;
using SmsApi.Services;

namespace SmsApi.BackgroundJobs;

/// <summary>
/// Scans for online classes starting within the next 20 minutes and fires
/// 15-minute pre-class reminder push notifications.
/// Runs every 5 minutes via a Hangfire recurring job.
/// </summary>
[DisableConcurrentExecution(timeoutInSeconds: 120)]
public class OnlineClassReminderJob
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<OnlineClassReminderJob> _logger;

    public OnlineClassReminderJob(
        IServiceScopeFactory scopeFactory,
        ILogger<OnlineClassReminderJob> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public async Task ProcessAsync()
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var notificationSvc = scope.ServiceProvider.GetRequiredService<IOnlineClassNotificationService>();
        var ct = CancellationToken.None;

        var now = DateTime.UtcNow;
        var windowStart = now.AddMinutes(10);
        var windowEnd = now.AddMinutes(20);

        // Find classes starting in the 10–20 minute window (i.e. 15-minute warning band)
        var upcomingClasses = await db.OnlineClasses
            .IgnoreQueryFilters()
            .Where(c => !c.IsDeleted &&
                        c.Status == OnlineClassStatus.Scheduled &&
                        c.ScheduledStart >= windowStart &&
                        c.ScheduledStart <= windowEnd)
            .ToListAsync(ct);

        if (upcomingClasses.Count == 0) return;

        _logger.LogInformation(
            "OnlineClassReminderJob: sending reminders for {Count} classes starting soon", upcomingClasses.Count);

        foreach (var cls in upcomingClasses)
        {
            try
            {
                await notificationSvc.SendStartingSoonAsync(cls.Id, cls.SchoolId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send reminder for class {ClassId}", cls.Id);
            }
        }
    }
}
