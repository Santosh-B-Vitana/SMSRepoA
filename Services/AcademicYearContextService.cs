using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.Entities;

namespace SmsApi.Services;

/// <summary>
/// Centralized service for resolving the effective academic year for a request.
/// Extracts from header, query, or defaults to current active year.
/// Used by all modules to enforce consistent year-scoped filtering.
/// </summary>
public interface IAcademicYearContextService
{
    /// <summary>Resolve the effective academic year name from request context.</summary>
    Task<string> GetEffectiveYearAsync(Guid schoolId, string? headerYear = null, string? queryYear = null);

    /// <summary>Validate that a year exists for the school.</summary>
    Task<bool> YearExistsAsync(Guid schoolId, string yearName);

    /// <summary>Get the currently active academic year for the school.</summary>
    Task<string?> GetCurrentYearAsync(Guid schoolId);
}

public class AcademicYearContextService : IAcademicYearContextService
{
    private readonly AppDbContext _db;

    public AcademicYearContextService(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Resolve effective academic year in priority order:
    /// 1. Explicit header year (X-Academic-Year from frontend selector)
    /// 2. Query parameter year
    /// 3. Current/active year
    /// 4. Most recent year in DB
    /// 5. Fallback to "2025-26"
    /// </summary>
    public async Task<string> GetEffectiveYearAsync(Guid schoolId, string? headerYear = null, string? queryYear = null)
    {
        // Priority 1: Header (user selected year)
        if (!string.IsNullOrWhiteSpace(headerYear))
        {
            var matchedHeaderYear = await ResolveMatchingYearAsync(schoolId, headerYear);
            if (!string.IsNullOrWhiteSpace(matchedHeaderYear))
            {
                return matchedHeaderYear;
            }
        }

        // Priority 2: Query parameter
        if (!string.IsNullOrWhiteSpace(queryYear))
        {
            var matchedQueryYear = await ResolveMatchingYearAsync(schoolId, queryYear);
            if (!string.IsNullOrWhiteSpace(matchedQueryYear))
            {
                return matchedQueryYear;
            }
        }

        // Priority 3: Current/active year
        var currentYear = await GetCurrentYearAsync(schoolId);
        if (!string.IsNullOrWhiteSpace(currentYear))
        {
            return currentYear;
        }

        // Priority 4: Most recent year in DB
        var latestYear = await _db.AcademicYears
            .AsNoTracking()
            .Where(y => y.SchoolId == schoolId && !y.IsDeleted)
            .OrderByDescending(y => y.EndDate)
            .Select(y => y.Name)
            .FirstOrDefaultAsync();

        if (!string.IsNullOrWhiteSpace(latestYear))
        {
            return latestYear;
        }

        // Priority 5: Fallback
        return "2025-26";
    }

    public async Task<bool> YearExistsAsync(Guid schoolId, string yearName)
    {
        var resolved = await ResolveMatchingYearAsync(schoolId, yearName);
        return !string.IsNullOrWhiteSpace(resolved);
    }

    public async Task<string?> GetCurrentYearAsync(Guid schoolId)
    {
        var now = DateTime.UtcNow;
        var current = await _db.AcademicYears
            .AsNoTracking()
            .Where(y => y.SchoolId == schoolId && !y.IsDeleted
                && y.StartDate <= now && y.EndDate >= now)
            .Select(y => y.Name)
            .FirstOrDefaultAsync();

        return current;
    }

    private async Task<string?> ResolveMatchingYearAsync(Guid schoolId, string requestedYear)
    {
        var normalizedRequested = NormalizeAcademicYear(requestedYear);
        var compactRequested = CompactYearSeparators(requestedYear);

        var years = await _db.AcademicYears
            .AsNoTracking()
            .Where(y => y.SchoolId == schoolId && !y.IsDeleted)
            .Select(y => y.Name)
            .ToListAsync();

        return years.FirstOrDefault(y =>
            string.Equals(y.Trim(), requestedYear.Trim(), StringComparison.OrdinalIgnoreCase)
            || string.Equals(NormalizeAcademicYear(y), normalizedRequested, StringComparison.OrdinalIgnoreCase)
            || string.Equals(CompactYearSeparators(y), compactRequested, StringComparison.OrdinalIgnoreCase));
    }

    private static string NormalizeAcademicYear(string year)
    {
        if (string.IsNullOrWhiteSpace(year))
            return string.Empty;

        var clean = CompactYearSeparators(year);
        var parts = clean.Split('-', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (parts.Length != 2)
            return clean;

        var start = parts[0];
        var end = parts[1];

        if (start.Length == 4 && end.Length == 4)
        {
            end = end.Substring(2);
        }
        else if (start.Length == 4 && end.Length == 2)
        {
            // already normalized
        }

        return $"{start}-{end}";
    }

    private static string CompactYearSeparators(string year)
    {
        return year.Trim().Replace("/", "-").Replace(" ", string.Empty);
    }
}
