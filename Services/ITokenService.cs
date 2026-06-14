using System.Security.Claims;
using SmsApi.Models;

namespace SmsApi.Services;

public interface ITokenService
{
    string GenerateAccessToken(User user, Guid schoolId);
    string GenerateRefreshToken();
    ClaimsPrincipal ValidateToken(string token);
    Guid GetCurrentUserId(ClaimsPrincipal principal);
    Guid GetCurrentSchoolId(ClaimsPrincipal principal);
    string GetCurrentUserRole(ClaimsPrincipal principal);
    /// <summary>
    /// Returns the effective JWT role for a user, applying designation overrides
    /// exactly as GenerateAccessToken does. Use this to ensure the login response
    /// body's role field matches the role claim inside the issued JWT.
    /// </summary>
    string GetEffectiveRole(string? rawRole, string? designation);
}

