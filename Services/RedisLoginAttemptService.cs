using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;

namespace SmsApi.Services;

/// <summary>
/// Redis-backed login attempt tracking.
/// Uses IDistributedCache so it works with both Redis (production) and
/// in-memory cache (development/fallback). Each user+IP combo has a separate
/// key with TTL = lockout + tracking window, so it self-cleans.
/// </summary>
public class RedisLoginAttemptService : ILoginAttemptService
{
    private readonly IDistributedCache _cache;
    private readonly ILogger<RedisLoginAttemptService> _logger;

    private const int MAX_LOGIN_ATTEMPTS = 5;
    private static readonly TimeSpan LOCKOUT_DURATION = TimeSpan.FromMinutes(15);
    private static readonly TimeSpan ATTEMPT_TRACKING_WINDOW = TimeSpan.FromMinutes(30);

    public RedisLoginAttemptService(IDistributedCache cache, ILogger<RedisLoginAttemptService> logger)
    {
        _cache = cache;
        _logger = logger;
    }

    public async Task<int> RecordFailedAttemptAsync(string username, string ipAddress)
    {
        var key = GetCacheKey(username, ipAddress);
        var attempt = await GetAttemptDataAsync(key);

        if (attempt == null)
        {
            attempt = new LoginAttemptData
            {
                Attempts = 1,
                FirstAttemptAt = DateTime.UtcNow,
                LastAttemptAt = DateTime.UtcNow
            };
        }
        else
        {
            // Reset window if tracking window expired
            if (DateTime.UtcNow - attempt.FirstAttemptAt > ATTEMPT_TRACKING_WINDOW)
            {
                attempt.Attempts = 1;
                attempt.FirstAttemptAt = DateTime.UtcNow;
            }
            else
            {
                attempt.Attempts++;
            }
            attempt.LastAttemptAt = DateTime.UtcNow;
        }

        if (attempt.Attempts >= MAX_LOGIN_ATTEMPTS)
        {
            attempt.LockedUntil = DateTime.UtcNow.Add(LOCKOUT_DURATION);
            _logger.LogWarning(
                "Account locked after {Attempts} failed attempts. Username: {Username}, IP: {IP}, LockedUntil: {LockedUntil}",
                attempt.Attempts, username, ipAddress, attempt.LockedUntil);
        }

        await SaveAttemptDataAsync(key, attempt);
        return attempt.Attempts;
    }

    public async Task ClearAttemptsAsync(string username, string ipAddress)
    {
        var key = GetCacheKey(username, ipAddress);
        await _cache.RemoveAsync(key);
        _logger.LogInformation("Cleared login attempts. Username: {Username}, IP: {IP}", username, ipAddress);
    }

    public async Task<(bool isLocked, TimeSpan? remainingTime)> IsAccountLockedAsync(string username, string ipAddress)
    {
        var key = GetCacheKey(username, ipAddress);
        var attempt = await GetAttemptDataAsync(key);

        if (attempt?.LockedUntil == null)
            return (false, null);

        if (DateTime.UtcNow < attempt.LockedUntil.Value)
        {
            var remaining = attempt.LockedUntil.Value - DateTime.UtcNow;
            return (true, remaining);
        }

        // Lockout expired, self-clean
        await _cache.RemoveAsync(key);
        return (false, null);
    }

    public async Task<int> GetRemainingAttemptsAsync(string username, string ipAddress)
    {
        var key = GetCacheKey(username, ipAddress);
        var attempt = await GetAttemptDataAsync(key);

        if (attempt == null)
            return MAX_LOGIN_ATTEMPTS;

        if (DateTime.UtcNow - attempt.FirstAttemptAt > ATTEMPT_TRACKING_WINDOW)
        {
            await _cache.RemoveAsync(key);
            return MAX_LOGIN_ATTEMPTS;
        }

        return Math.Max(0, MAX_LOGIN_ATTEMPTS - attempt.Attempts);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static string GetCacheKey(string username, string ipAddress) =>
        $"login_attempts:{username.ToLowerInvariant().Trim()}:{ipAddress}";

    private async Task<LoginAttemptData?> GetAttemptDataAsync(string key)
    {
        try
        {
            var json = await _cache.GetStringAsync(key);
            return string.IsNullOrEmpty(json) ? null : JsonSerializer.Deserialize<LoginAttemptData>(json);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reading login attempt cache for key {Key}", key);
            return null;
        }
    }

    private async Task SaveAttemptDataAsync(string key, LoginAttemptData data)
    {
        try
        {
            var json = JsonSerializer.Serialize(data);
            var opts = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = LOCKOUT_DURATION + ATTEMPT_TRACKING_WINDOW
            };
            await _cache.SetStringAsync(key, json, opts);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving login attempt cache for key {Key}", key);
            // Don't re-throw — a cache write failure must not block the auth flow
        }
    }

    private sealed class LoginAttemptData
    {
        public int Attempts { get; set; }
        public DateTime FirstAttemptAt { get; set; }
        public DateTime LastAttemptAt { get; set; }
        public DateTime? LockedUntil { get; set; }
    }
}
