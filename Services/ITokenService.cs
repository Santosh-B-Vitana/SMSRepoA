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
}

