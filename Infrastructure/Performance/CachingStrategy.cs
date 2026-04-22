using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;

namespace SmsApi.Infrastructure.Performance;

/// <summary>
/// Generic cache-aside helper that any service can inject.
/// Usage:
///   var data = await _cache.GetOrSetAsync("key", () => FetchFromDb(), TimeSpan.FromMinutes(5));
/// </summary>
public class CachingStrategy
{
    private readonly IDistributedCache _cache;
    private readonly ILogger<CachingStrategy> _logger;

    public CachingStrategy(IDistributedCache cache, ILogger<CachingStrategy> logger)
    {
        _cache = cache;
        _logger = logger;
    }

    /// <summary>
    /// Cache-aside: read from cache, on miss execute <paramref name="fetchFunc"/> and store result.
    /// </summary>
    public async Task<T?> GetOrSetAsync<T>(
        string cacheKey,
        Func<Task<T>> fetchFunc,
        TimeSpan? absoluteExpiry = null,
        TimeSpan? slidingExpiry = null)
    {
        try
        {
            var cached = await _cache.GetStringAsync(cacheKey);
            if (!string.IsNullOrEmpty(cached))
            {
                _logger.LogDebug("Cache HIT: {CacheKey}", cacheKey);
                return JsonSerializer.Deserialize<T>(cached);
            }

            _logger.LogDebug("Cache MISS: {CacheKey}", cacheKey);

            var value = await fetchFunc();
            if (value is null) return value;

            var opts = new DistributedCacheEntryOptions();
            if (absoluteExpiry.HasValue)
                opts.AbsoluteExpirationRelativeToNow = absoluteExpiry;
            if (slidingExpiry.HasValue)
                opts.SlidingExpiration = slidingExpiry;
            if (!absoluteExpiry.HasValue && !slidingExpiry.HasValue)
                opts.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(15);

            await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(value), opts);
            _logger.LogDebug("Cached: {CacheKey}", cacheKey);

            return value;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Cache error for key {CacheKey} — falling back to direct fetch.", cacheKey);
            return await fetchFunc();
        }
    }

    /// <summary>Remove a cache entry.</summary>
    public async Task InvalidateAsync(string cacheKey)
    {
        try
        {
            await _cache.RemoveAsync(cacheKey);
            _logger.LogInformation("Cache invalidated: {CacheKey}", cacheKey);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Cache invalidation failed for key {CacheKey}", cacheKey);
        }
    }

    /// <summary>Remove multiple cache entries by prefix pattern.</summary>
    public async Task InvalidatePrefixAsync(IEnumerable<string> keys)
    {
        foreach (var key in keys)
            await InvalidateAsync(key);
    }
}
