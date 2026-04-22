using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;

namespace SmsApi.Infrastructure.Performance;

/// <summary>
/// EF Core query extension methods for optimized reads, pagination, and search.
/// </summary>
public static class QueryOptimizationExtensions
{
    /// <summary>
    /// AsNoTracking + projection in one call. Use for all read-only DTO queries.
    /// </summary>
    public static IQueryable<TResult> OptimizeForRead<TSource, TResult>(
        this IQueryable<TSource> query,
        Expression<Func<TSource, TResult>> selector)
        where TSource : class
    {
        return query.AsNoTracking().Select(selector);
    }

    /// <summary>
    /// Split query to prevent cartesian explosion with multiple includes.
    /// </summary>
    public static IQueryable<T> UseSplitQuery<T>(this IQueryable<T> query) where T : class
        => query.AsSplitQuery();

    /// <summary>
    /// Standard pagination with guard rails (min 1, max 100).
    /// </summary>
    public static IQueryable<T> Paginate<T>(this IQueryable<T> query, int page, int pageSize)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;
        if (pageSize > 100) pageSize = 100;
        return query.Skip((page - 1) * pageSize).Take(pageSize);
    }

    /// <summary>
    /// Explicit Include wrapper for discoverability.
    /// </summary>
    public static IQueryable<T> BatchLoadWith<T, TProperty>(
        this IQueryable<T> query,
        Expression<Func<T, TProperty>> navigationPropertyPath)
        where T : class
        => query.Include(navigationPropertyPath);

    /// <summary>
    /// Case-insensitive search on a string property via expression tree.
    /// </summary>
    public static IQueryable<T> SearchBy<T>(
        this IQueryable<T> query,
        Expression<Func<T, string>> property,
        string searchTerm)
        where T : class
    {
        if (string.IsNullOrWhiteSpace(searchTerm)) return query;

        var searchLower = searchTerm.ToLower();
        var param = Expression.Parameter(typeof(T), "e");
        var propAccess = Expression.Invoke(property, param);
        var toLower = Expression.Call(propAccess, typeof(string).GetMethod("ToLower", Type.EmptyTypes)!);
        var contains = Expression.Call(toLower,
            typeof(string).GetMethod("Contains", new[] { typeof(string) })!,
            Expression.Constant(searchLower));
        var lambda = Expression.Lambda<Func<T, bool>>(contains, param);
        return query.Where(lambda);
    }
}
