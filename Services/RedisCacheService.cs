using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;

namespace SmsApi.Services;

/// <summary>
/// IDistributedCache-backed cache service. Works with Redis in production
/// and in-memory IDistributedCache in development.
/// </summary>
public class RedisCacheService : ICacheService
{
    private readonly IDistributedCache _cache;
    private readonly ILogger<RedisCacheService> _logger;
    private static readonly TimeSpan DefaultExpiration = TimeSpan.FromMinutes(30);

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    public RedisCacheService(IDistributedCache cache, ILogger<RedisCacheService> logger)
    {
        _cache = cache;
        _logger = logger;
    }

    public async Task<T?> GetOrSetAsync<T>(string key, Func<Task<T>> factory, TimeSpan? expiration = null) where T : class
    {
        var cached = await GetAsync<T>(key);
        if (cached != null)
        {
            _logger.LogDebug("Cache HIT: {Key}", key);
            return cached;
        }

        _logger.LogDebug("Cache MISS: {Key} — executing factory", key);
        var value = await factory();
        if (value != null)
            await SetAsync(key, value, expiration);

        return value;
    }

    public async Task<T?> GetAsync<T>(string key) where T : class
    {
        try
        {
            var json = await _cache.GetStringAsync(key);
            if (string.IsNullOrEmpty(json)) return null;
            return JsonSerializer.Deserialize<T>(json, JsonOptions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Cache GET error for key {Key}", key);
            return null;
        }
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? expiration = null) where T : class
    {
        try
        {
            var json = JsonSerializer.Serialize(value, JsonOptions);
            var opts = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = expiration ?? DefaultExpiration
            };
            await _cache.SetStringAsync(key, json, opts);
            _logger.LogDebug("Cached key {Key}, TTL {Minutes}m", key, (expiration ?? DefaultExpiration).TotalMinutes);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Cache SET error for key {Key}", key);
            // Caching failures must never break the application
        }
    }

    public async Task RemoveAsync(string key)
    {
        try
        {
            await _cache.RemoveAsync(key);
            _logger.LogDebug("Cache REMOVE: {Key}", key);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Cache REMOVE error for key {Key}", key);
        }
    }

    public async Task<bool> ExistsAsync(string key)
    {
        try
        {
            var value = await _cache.GetStringAsync(key);
            return !string.IsNullOrEmpty(value);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Cache EXISTS error for key {Key}", key);
            return false;
        }
    }
}
