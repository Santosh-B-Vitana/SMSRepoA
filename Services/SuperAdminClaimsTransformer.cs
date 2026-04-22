using SmsApi.Models.Constants;
using Microsoft.AspNetCore.Authentication;
using System.Security.Claims;

namespace SmsApi.Services;

/// <summary>
/// Automatically grants all school-level roles to any SuperAdmin user so that
/// [Authorize(Roles = "Admin,Principal,Staff,...")] on module controllers is
/// satisfied without requiring every controller to list StatusConstants.Roles.SuperAdmin.
/// </summary>
public class SuperAdminClaimsTransformer : IClaimsTransformation
{
    // Every role that individual module controllers check against
    private static readonly string[] AllSchoolRoles =
    [
        StatusConstants.Roles.Admin, "Principal", "Teacher", "Staff", "Parent"
    ];

    public Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal)
    {
        var roleClaim = principal.FindFirst(ClaimTypes.Role)?.Value;
        if (!string.Equals(roleClaim, StatusConstants.Roles.SuperAdmin, StringComparison.OrdinalIgnoreCase))
            return Task.FromResult(principal);

        // Avoid adding duplicate claims on multiple calls (ASP.NET Core may call
        // this once per request, but guard anyway)
        if (principal.HasClaim(ClaimTypes.Role, StatusConstants.Roles.Admin))
            return Task.FromResult(principal);

        var identity = new ClaimsIdentity();
        foreach (var role in AllSchoolRoles)
            identity.AddClaim(new Claim(ClaimTypes.Role, role));

        principal.AddIdentity(identity);
        return Task.FromResult(principal);
    }
}
