using System;

namespace SmsApi.Infrastructure.Authorization
{
    /// <summary>
    /// Marks a controller or action so the <see cref="SmsApi.Middleware.RolePermissionEnforcementMiddleware"/>
    /// does NOT apply fine-grained Role-Management permission checks to it.
    /// Use for endpoints that must remain reachable regardless of a custom role's
    /// module matrix (e.g. self-service profile reads, OTP, exports handled elsewhere).
    /// </summary>
    [AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false, Inherited = true)]
    public sealed class SkipPermissionCheckAttribute : Attribute
    {
    }
}
