using SmsApi.Models.CRM;

namespace SmsApi.Services;

public interface ISchoolConfigService
{
    Task<SchoolConfig?> GetByDomainAsync(string domain, CancellationToken cancellationToken = default);

    /// <summary>
    /// Removes the cached SchoolConfig entry for the given domain.
    /// Call on logout and when a refresh token expires so that the next
    /// request performs a fresh CRM lookup (handles DBServer/DBName changes).
    /// </summary>
    void InvalidateDomainCache(string domain);
}
