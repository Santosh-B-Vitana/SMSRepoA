using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace SmsApi.Middleware;

/// <summary>
/// Extracts X-Academic-Year header from request and stores in HttpContext.Items
/// for use by all controllers/services in the request pipeline.
/// </summary>
public class AcademicYearContextMiddleware
{
    private readonly RequestDelegate _next;

    public AcademicYearContextMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Extract academic year from request header (set by frontend selector)
        var academicYear = context.Request.Headers["X-Academic-Year"].ToString();

        // Store in HttpContext.Items for use throughout request
        if (!string.IsNullOrWhiteSpace(academicYear))
        {
            context.Items["AcademicYear"] = academicYear;
        }

        // Also preserve as value for ease of access in controllers
        context.Items["AcademicYearHeaderValue"] = academicYear ?? "";

        await _next(context);
    }
}

public static class AcademicYearContextMiddlewareExtensions
{
    public static IApplicationBuilder UseAcademicYearContext(
        this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<AcademicYearContextMiddleware>();
    }
}
