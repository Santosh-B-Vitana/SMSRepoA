using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using SmsApi.Data;
using SmsApi.Infrastructure.Authorization;
using SmsApi.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace SmsApi.Middleware
{
    /// <summary>
    /// Enforces fine-grained Role Management permissions ("Module.Action") on the BACKEND
    /// so that the permission matrix is no longer cosmetic.
    ///
    /// Design goals (deliberately fail-safe to avoid breaking existing roles):
    ///   1. Admin / SuperAdmin are never restricted.
    ///   2. Only users who actually hold a CUSTOM (non-system) role are enforced
    ///      ("role-managed"). Users on designation/system-role defaults pass through
    ///      exactly as before — this is what keeps existing behaviour intact.
    ///   3. Only WRITE operations are gated (POST / PUT / PATCH / DELETE). Reads are
    ///      never blocked here, so cross-module lookup/dropdown GETs never break.
    ///   4. Unknown modules, read-like POSTs (search/report/export…) and any internal
    ///      error fail OPEN — the request is allowed and controller [Authorize] still applies.
    ///
    /// Net effect: a custom role with only "View" can no longer create/edit/delete via the
    /// API, while every pre-existing role keeps working untouched.
    /// </summary>
    public class RolePermissionEnforcementMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<RolePermissionEnforcementMiddleware> _logger;

        public RolePermissionEnforcementMiddleware(
            RequestDelegate next,
            ILogger<RolePermissionEnforcementMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        // Route prefix (lower-case) → permission Module name (matches PermissionsService.ModuleActions keys)
        private static readonly Dictionary<string, string> RouteToModule = new(StringComparer.OrdinalIgnoreCase)
        {
            ["/api/students"]            = "Students",
            ["/api/staff"]               = "Staff",
            ["/api/admissions"]          = "Admissions",
            ["/api/attendance"]          = "Attendance",
            ["/api/offlineattendance"]   = "Attendance",
            ["/api/assignments"]         = "Assignments",
            ["/api/fees"]                = "Fees",
            ["/api/feeconcession"]       = "Fees",
            ["/api/timetable"]           = "Timetable",
            ["/api/examinations"]        = "Examinations",
            ["/api/examsetup"]           = "Examinations",
            ["/api/onlineexam"]          = "Examinations",
            ["/api/grades"]              = "Grades",
            ["/api/library"]             = "Library",
            ["/api/transport"]           = "Transport",
            ["/api/vehicle"]             = "Transport",
            ["/api/hostel"]              = "Hostel",
            ["/api/payroll"]             = "Payroll",
            ["/api/communication"]       = "Communication",
            ["/api/announcements"]       = "Announcements",
            ["/api/certificates"]        = "Certificates",
            ["/api/usermanagement"]      = "UserManagement",
            ["/api/visitor"]             = "Visitor",
            ["/api/visitormanagement"]   = "Visitor",
            ["/api/health"]              = "Health",
            ["/api/settings"]            = "Settings",
        };

        // POST paths containing any of these tokens are treated as read-like / side actions
        // and are NOT gated (they are not standard "Create" operations).
        private static readonly string[] ReadLikePostTokens =
        {
            "search", "filter", "query", "list", "lookup", "report", "reports",
            "export", "download", "print", "preview", "calculate", "compute",
            "validate", "check", "bulk-export", "summary", "statistics", "stats",
        };

        // Path tokens that indicate an Approve-type action (mapped to the Approve permission).
        private static readonly string[] ApproveTokens = { "approve", "reject", "authorize", "sanction" };

        public async Task InvokeAsync(HttpContext context, IPermissionsService permissionsService, AppDbContext db, IMemoryCache cache)
        {
            try
            {
                var method = context.Request.Method;

                // Only gate state-changing verbs. Reads pass straight through.
                if (HttpMethods.IsGet(method) || HttpMethods.IsHead(method) || HttpMethods.IsOptions(method))
                {
                    await _next(context);
                    return;
                }

                var user = context.User;
                if (user?.Identity?.IsAuthenticated != true)
                {
                    await _next(context);
                    return;
                }

                // Admin / SuperAdmin: never restricted.
                var jwtRole = user.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;
                if (jwtRole.Equals("Admin", StringComparison.OrdinalIgnoreCase)
                    || jwtRole.Equals("SuperAdmin", StringComparison.OrdinalIgnoreCase))
                {
                    await _next(context);
                    return;
                }

                // Endpoint opted out explicitly?
                var endpoint = context.GetEndpoint();
                if (endpoint?.Metadata.GetMetadata<SkipPermissionCheckAttribute>() != null)
                {
                    await _next(context);
                    return;
                }

                var path = context.Request.Path.Value?.ToLowerInvariant() ?? string.Empty;

                var module = ResolveModule(path);
                if (module == null)
                {
                    // Unmapped route → not enforced here (controller [Authorize] still applies).
                    await _next(context);
                    return;
                }

                var action = ResolveAction(method, path);
                if (action == null)
                {
                    // Read-like POST or unmappable → don't gate.
                    await _next(context);
                    return;
                }

                // Identify the user.
                var userIdClaim = user.FindFirst("UserId") ?? user.FindFirst(ClaimTypes.NameIdentifier);
                var schoolIdClaim = user.FindFirst("SchoolId")?.Value;
                if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId)
                    || string.IsNullOrEmpty(schoolIdClaim) || !Guid.TryParse(schoolIdClaim, out var schoolId))
                {
                    // Can't resolve identity → fail open, controller auth still applies.
                    await _next(context);
                    return;
                }

                var profile = await GetPermissionProfileAsync(userId, schoolId, permissionsService, db, cache);

                // Not role-managed → preserve existing designation/system-role behaviour (no enforcement).
                if (!profile.IsRoleManaged)
                {
                    await _next(context);
                    return;
                }

                var required = $"{module}.{action}";
                if (profile.Permissions.Contains(required))
                {
                    await _next(context);
                    return;
                }

                // Role-managed user lacking the required permission → block the write.
                _logger.LogInformation(
                    "RBAC denied: user {UserId} lacks {Permission} for {Method} {Path}",
                    userId, required, method, path);

                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                await context.Response.WriteAsJsonAsync(new
                {
                    message = $"You don't have permission to {action} {module}.",
                    requiredPermission = required,
                    code = "PERMISSION_DENIED"
                });
            }
            catch (Exception ex)
            {
                // Never block a request due to an enforcement bug — fail open.
                _logger.LogError(ex, "RolePermissionEnforcementMiddleware error; allowing request through");
                await _next(context);
            }
        }

        private static string? ResolveModule(string path)
        {
            foreach (var kvp in RouteToModule)
            {
                if (path.StartsWith(kvp.Key, StringComparison.OrdinalIgnoreCase))
                    return kvp.Value;
            }
            return null;
        }

        private static string? ResolveAction(string method, string path)
        {
            // Approve-style actions take precedence regardless of verb.
            if (ApproveTokens.Any(t => path.Contains(t, StringComparison.OrdinalIgnoreCase)))
                return "Approve";

            if (HttpMethods.IsDelete(method))
                return "Delete";

            if (HttpMethods.IsPut(method) || HttpMethods.IsPatch(method))
                return "Edit";

            if (HttpMethods.IsPost(method))
            {
                if (ReadLikePostTokens.Any(t => path.Contains(t, StringComparison.OrdinalIgnoreCase)))
                    return null; // read-like / export POST — not a Create
                return "Create";
            }

            return null;
        }

        private sealed record PermissionProfile(bool IsRoleManaged, HashSet<string> Permissions);

        private static async Task<PermissionProfile> GetPermissionProfileAsync(
            Guid userId, Guid schoolId, IPermissionsService permissionsService, AppDbContext db, IMemoryCache cache)
        {
            var cacheKey = $"rbac:profile:{schoolId}:{userId}";
            if (cache.TryGetValue<PermissionProfile>(cacheKey, out var cached) && cached != null)
                return cached;

            // role-managed = has at least one active CUSTOM (non-system) role assignment.
            var isRoleManaged = await db.UserRoles
                .AnyAsync(ur => ur.UserId == userId && ur.SchoolId == schoolId && !ur.IsDeleted
                                && ur.Role != null && !ur.Role.IsSystemRole);

            var perms = isRoleManaged
                ? await permissionsService.GetUserEffectivePermissionsAsync(userId, schoolId)
                : new List<string>();

            var profile = new PermissionProfile(
                isRoleManaged,
                new HashSet<string>(perms, StringComparer.OrdinalIgnoreCase));

            // Short TTL keeps DB load low while reflecting role changes quickly.
            cache.Set(cacheKey, profile, TimeSpan.FromSeconds(30));
            return profile;
        }
    }
}
