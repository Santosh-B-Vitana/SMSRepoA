using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using SmsApi.Data;
using SmsApi.Models.CRM;

namespace SmsApi.Services.WhatsApp;

public interface IWhatsAppEligibilityChecker
{
    Task<EligibilityResult> CheckAsync(Guid schoolId, CancellationToken ct = default);
}

public record EligibilityResult(bool IsEligible, string? Reason);

public interface IWhatsAppQuotaService
{
    Task<int> GetRemainingQuotaAsync(Guid schoolId, CancellationToken ct = default);
    Task<bool> IncrementUsageAsync(Guid schoolId, CancellationToken ct = default);
    Task SyncUsageToDatabaseAsync(Guid schoolId, CancellationToken ct = default);
    Task RefreshCacheAsync(Guid schoolId, CancellationToken ct = default);
}

public class WhatsAppEligibilityChecker : IWhatsAppEligibilityChecker
{
    private readonly AppDbContext _db;
    private readonly CrmDbContext _crm;
    private readonly IWhatsAppQuotaService _quota;
    private readonly IDistributedCache _cache;
    private readonly ILogger<WhatsAppEligibilityChecker> _logger;

    public WhatsAppEligibilityChecker(
        AppDbContext db, CrmDbContext crm, IWhatsAppQuotaService quota,
        IDistributedCache cache, ILogger<WhatsAppEligibilityChecker> logger)
    {
        _db = db;
        _crm = crm;
        _quota = quota;
        _cache = cache;
        _logger = logger;
    }

    public async Task<EligibilityResult> CheckAsync(Guid schoolId, CancellationToken ct = default)
    {
        // 1. Check WhatsApp is enabled for school
        var settings = await _db.WhatsappSettings
            .FirstOrDefaultAsync(s => s.SchoolId == schoolId, ct);

        if (settings == null || !settings.IsEnabled)
            return new EligibilityResult(false, "WhatsApp is not enabled for this school");

        if (settings.CrmAccountId == null)
        {
            // Using shared platform account — check platform settings
            var sharedEnabled = true; // assume shared is always configured if enabled
            if (!sharedEnabled)
                return new EligibilityResult(false, "Shared WhatsApp account not configured");
        }

        // 2. Check subscription is active
        var cacheKey = $"wa:sub:{schoolId}";
        var cachedStatus = await _cache.GetStringAsync(cacheKey, ct);

        if (cachedStatus == null)
        {
            // Load from CRM
            var subscription = await GetActiveSubscriptionAsync(schoolId, ct);
            cachedStatus = subscription?.Status ?? "None";
            await _cache.SetStringAsync(cacheKey, cachedStatus,
                new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5) },
                ct);
        }

        if (cachedStatus != "Active" && cachedStatus != "Trial")
            return new EligibilityResult(false, $"WhatsApp subscription is {cachedStatus}");

        // 3. Check quota
        var remaining = await _quota.GetRemainingQuotaAsync(schoolId, ct);
        if (remaining <= 0)
        {
            // Check overage policy
            var subscription = await GetActiveSubscriptionAsync(schoolId, ct);
            if (subscription?.OveragePolicy == "Block")
                return new EligibilityResult(false, "Monthly quota exhausted (overage blocked by policy)");
        }

        return new EligibilityResult(true, null);
    }

    private async Task<WhatsappSubscription?> GetActiveSubscriptionAsync(Guid schoolId, CancellationToken ct)
    {
        // schoolId (Guid) → CRM SchoolId (int) lookup via domain
        // For simplicity, we store CrmAccountId in WhatsappSettings and use it to find the subscription
        var settings = await _db.WhatsappSettings
            .FirstOrDefaultAsync(s => s.SchoolId == schoolId, ct);

        if (settings?.CrmAccountId == null) return null;

        return await _crm.WhatsappSubscriptions
            .Include(s => s.Plan)
            .FirstOrDefaultAsync(s =>
                s.AccountId == settings.CrmAccountId &&
                (s.Status == "Active" || s.Status == "Trial"), ct);
    }
}

public class WhatsAppQuotaService : IWhatsAppQuotaService
{
    private readonly AppDbContext _db;
    private readonly CrmDbContext _crm;
    private readonly IDistributedCache _cache;
    private readonly ILogger<WhatsAppQuotaService> _logger;

    public WhatsAppQuotaService(
        AppDbContext db, CrmDbContext crm,
        IDistributedCache cache, ILogger<WhatsAppQuotaService> logger)
    {
        _db = db;
        _crm = crm;
        _cache = cache;
        _logger = logger;
    }

    public async Task<int> GetRemainingQuotaAsync(Guid schoolId, CancellationToken ct = default)
    {
        var key = $"wa:quota:{schoolId}";
        var cached = await _cache.GetStringAsync(key, ct);
        if (cached != null && int.TryParse(cached, out var remaining))
            return remaining;

        await RefreshCacheAsync(schoolId, ct);
        cached = await _cache.GetStringAsync(key, ct);
        return cached != null && int.TryParse(cached, out remaining) ? remaining : 0;
    }

    public async Task<bool> IncrementUsageAsync(Guid schoolId, CancellationToken ct = default)
    {
        var period = DateTime.UtcNow.ToString("yyyyMM");

        // Increment Redis counter
        var quotaKey = $"wa:quota:{schoolId}";
        var usageKey = $"wa:used:{schoolId}:{period}";

        // Decrement remaining quota
        var cachedQuota = await _cache.GetStringAsync(quotaKey, ct);
        if (cachedQuota != null && int.TryParse(cachedQuota, out var quota))
        {
            var newRemaining = Math.Max(-1000, quota - 1); // allow up to 1000 overage tracking
            await _cache.SetStringAsync(quotaKey, newRemaining.ToString(),
                new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(6) }, ct);
        }

        // Track usage in cache (synced to DB periodically)
        var cachedUsed = await _cache.GetStringAsync(usageKey, ct);
        var used = cachedUsed != null && int.TryParse(cachedUsed, out var u) ? u + 1 : 1;
        await _cache.SetStringAsync(usageKey, used.ToString(),
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(25) }, ct);

        return true;
    }

    public async Task SyncUsageToDatabaseAsync(Guid schoolId, CancellationToken ct = default)
    {
        var period = DateTime.UtcNow.ToString("yyyyMM");
        var usageKey = $"wa:used:{schoolId}:{period}";

        var cachedUsed = await _cache.GetStringAsync(usageKey, ct);
        if (cachedUsed == null || !int.TryParse(cachedUsed, out var used)) return;

        var usage = await _db.WhatsappUsages
            .FirstOrDefaultAsync(u => u.SchoolId == schoolId && u.Period == period, ct);

        if (usage == null)
        {
            usage = new SmsApi.Models.Entities.WhatsappUsage
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                Period = period,
                MessagesSent = used,
                LastUpdatedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _db.WhatsappUsages.Add(usage);
        }
        else
        {
            usage.MessagesSent = used;
            usage.LastUpdatedAt = DateTime.UtcNow;
            usage.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync(ct);
    }

    public async Task RefreshCacheAsync(Guid schoolId, CancellationToken ct = default)
    {
        var settings = await _db.WhatsappSettings
            .FirstOrDefaultAsync(s => s.SchoolId == schoolId, ct);

        if (settings?.CrmAccountId == null)
        {
            // No subscription
            await _cache.SetStringAsync($"wa:quota:{schoolId}", "0",
                new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10) }, ct);
            return;
        }

        var subscription = await _crm.WhatsappSubscriptions
            .FirstOrDefaultAsync(s => s.AccountId == settings.CrmAccountId &&
                (s.Status == "Active" || s.Status == "Trial"), ct);


        if (subscription == null)
        {
            await _cache.SetStringAsync($"wa:quota:{schoolId}", "0",
                new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5) }, ct);
            return;
        }

        var remaining = subscription.MessagesQuota + subscription.CarryForwardMessages - subscription.MessagesUsed;

        await _cache.SetStringAsync(
            $"wa:quota:{schoolId}", Math.Max(0, remaining).ToString(),
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(6) }, ct);

        _logger.LogDebug("Quota cache refreshed for school {SchoolId}: {Remaining} remaining", schoolId, remaining);
    }
}
