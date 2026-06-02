using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using SmsApi.Data;
using SmsApi.Models.CRM;

namespace SmsApi.Services;

public class SchoolConfigService : ISchoolConfigService
{
    private readonly CrmDbContext _crmDbContext;
    private readonly IMemoryCache _cache;

    private static readonly TimeSpan CacheDuration = TimeSpan.FromHours(6);
    private const string CacheKeyPrefix = "SchoolConfig_Domain_";

    public SchoolConfigService(CrmDbContext crmDbContext, IMemoryCache cache)
    {
        _crmDbContext = crmDbContext;
        _cache = cache;
    }

    public async Task<SchoolConfig?> GetByDomainAsync(string domain, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(domain))
            return null;

        var normalizedDomain = domain.ToLowerInvariant();
        var cacheKey = CacheKeyPrefix + normalizedDomain;

        if (_cache.TryGetValue(cacheKey, out SchoolConfig? cached))
            return cached;

        var config = await _crmDbContext.SchoolConfigs
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.SchoolDomain == normalizedDomain && s.IsActive, cancellationToken);

        if (config != null)
        {
            _cache.Set(cacheKey, config, new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = CacheDuration,
                Priority = CacheItemPriority.Normal
            });
        }

        return config;
    }

    public void InvalidateDomainCache(string domain)
    {
        if (string.IsNullOrWhiteSpace(domain))
            return;

        _cache.Remove(CacheKeyPrefix + domain.ToLowerInvariant());
    }
}
