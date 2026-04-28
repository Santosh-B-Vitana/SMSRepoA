namespace SmsApi.Services;

/// <summary>
/// Abstraction over IDistributedCache providing typed get/set/remove.
/// Concrete implementation is RedisCacheService (or in-memory in dev).
/// </summary>
public interface ICacheService
{
    /// <summary>Cache-aside: return cached value or execute factory and cache the result.</summary>
    Task<T?> GetOrSetAsync<T>(string key, Func<Task<T>> factory, TimeSpan? expiration = null) where T : class;

    /// <summary>Get a typed value from cache. Returns null on miss.</summary>
    Task<T?> GetAsync<T>(string key) where T : class;

    /// <summary>Set a typed value in cache.</summary>
    Task SetAsync<T>(string key, T value, TimeSpan? expiration = null) where T : class;

    /// <summary>Remove a single key from cache.</summary>
    Task RemoveAsync(string key);

    /// <summary>Check whether a key exists in cache.</summary>
    Task<bool> ExistsAsync(string key);
}

/// <summary>Well-known cache key patterns — keeps key construction consistent.</summary>
public static class CacheKeys
{
    public static string Classes(Guid schoolId) => $"school:{schoolId}:classes";
    public static string Sections(Guid classId) => $"class:{classId}:sections";
    public static string ClassById(Guid classId) => $"class:{classId}";
    public static string AcademicYears(Guid schoolId) => $"school:{schoolId}:academic-years";
    public static string CurrentAcademicYear(Guid schoolId) => $"school:{schoolId}:current-academic-year";
    public static string Subjects(Guid schoolId) => $"school:{schoolId}:subjects";
    public static string SubjectsByClass(Guid classId) => $"class:{classId}:subjects";
    public static string Roles(Guid schoolId) => $"school:{schoolId}:roles";
    public static string RoleById(Guid roleId) => $"role:{roleId}";
    public static string Permissions() => "system:permissions";
    public static string RolePermissions(Guid roleId) => $"role:{roleId}:permissions";
    public static string SchoolSettings(Guid schoolId) => $"school:{schoolId}:settings";
    public static string FeeStructures(Guid schoolId) => $"school:{schoolId}:fee-structures";
    public static string FeeStructureByClass(Guid classId) => $"class:{classId}:fee-structure";
}

/// <summary>Canonical cache TTL constants.</summary>
public static class CacheDurations
{
    public static readonly TimeSpan Short = TimeSpan.FromMinutes(5);
    public static readonly TimeSpan Medium = TimeSpan.FromMinutes(30);
    public static readonly TimeSpan Long = TimeSpan.FromHours(2);
    public static readonly TimeSpan VeryLong = TimeSpan.FromHours(24);
}
