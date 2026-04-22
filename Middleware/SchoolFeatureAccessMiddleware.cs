using Microsoft.AspNetCore.Http;
using SmsApi.Services;
using SmsApi.Utils;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace SmsApi.Middleware
{
    /// <summary>
    /// Middleware to check if a school has access to the requested module/feature.
    /// This enforces the feature permissions set by the Super Admin.
    /// </summary>
    public class SchoolFeatureAccessMiddleware
    {
        private readonly RequestDelegate _next;

        // Map API routes to module names
        private readonly Dictionary<string, string> _routeToModuleMap = new()
        {
            { "/api/students", "students" },
            { "/api/staff", "staff" },
            { "/api/attendance", "attendance" },
            { "/api/fees", "fees" },
            { "/api/timetable", "timetable" },
            { "/api/examinations", "examinations" },
            { "/api/announcements", "announcements" },
            { "/api/reports", "reports" },
            { "/api/documents", "documents" },
            { "/api/admissions", "admissions" },
            { "/api/library", "library" },
            { "/api/transport", "transport" },
            { "/api/hostel", "hostel" },
            { "/api/health", "health" },
            { "/api/payroll", "payroll" },
            { "/api/communication", "communication" },
            { "/api/analytics", "analytics" },
            { "/api/certificates", "certificates" },
            { "/api/store", "store" },
            { "/api/wallet", "wallet" }
        };

        public SchoolFeatureAccessMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context, ISchoolFeaturePermissionService featurePermissionService)
        {
            var path = context.Request.Path.Value?.ToLower() ?? "";

            // Skip feature check for certain routes
            if (ShouldSkipFeatureCheck(path))
            {
                await _next(context);
                return;
            }

            // Get the module name from the route
            var moduleName = GetModuleNameFromPath(path);
            if (string.IsNullOrEmpty(moduleName))
            {
                await _next(context);
                return;
            }

            // Get schoolId from JWT claims
            try
            {
                // NOTE: claim name must match exactly what TokenService sets ("SchoolId" with capital S)
                var schoolIdClaim = context.User.FindFirst("SchoolId")?.Value;
                if (string.IsNullOrEmpty(schoolIdClaim) || !Guid.TryParse(schoolIdClaim, out var schoolId))
                {
                    // SuperAdmin or unauthenticated - allow through (controller-level auth will handle)
                    if (context.User.IsInRole("SuperAdmin") || !context.User.Identity?.IsAuthenticated == true)
                    {
                        await _next(context);
                        return;
                    }

                    context.Response.StatusCode = 401;
                    await context.Response.WriteAsJsonAsync(new { message = "School ID not found in token" });
                    return;
                }

                // Check if the school has access to this module
                var hasAccess = await featurePermissionService.CheckModuleAccessAsync(schoolId, moduleName);
                if (!hasAccess)
                {
                    context.Response.StatusCode = 403;
                    await context.Response.WriteAsJsonAsync(new 
                    { 
                        message = $"Your school does not have access to the {moduleName} module. Please contact support to upgrade your package.",
                        module = moduleName,
                        feature = "disabled"
                    });
                    return;
                }

                await _next(context);
            }
            catch (Exception ex)
            {
                // Log the error but don't block the request
                Console.WriteLine($"Error in SchoolFeatureAccessMiddleware: {ex.Message}");
                await _next(context);
            }
        }

        private bool ShouldSkipFeatureCheck(string path)
        {
            // Skip feature check for these routes
            var skipRoutes = new[]
            {
                "/api/auth",
                "/api/schoolfeaturepermissions",
                "/api/permissions",
                "/api/settings",
                "/swagger",
                "/health"
            };

            return skipRoutes.Any(route => path.StartsWith(route));
        }

        private string? GetModuleNameFromPath(string path)
        {
            foreach (var mapping in _routeToModuleMap)
            {
                if (path.StartsWith(mapping.Key))
                {
                    return mapping.Value;
                }
            }
            return null;
        }
    }
}
