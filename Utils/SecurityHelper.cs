using System.Security.Claims;

namespace SmsApi.Utils
{
    /// <summary>
    /// Helper class for extracting and validating security claims from JWT tokens
    /// </summary>
    public static class SecurityHelper
    {
        /// <summary>
        /// Extract SchoolId from JWT claims
        /// </summary>
        public static Guid GetSchoolIdFromClaims(ClaimsPrincipal user)
        {
            var schoolIdClaim = user.FindFirst("SchoolId")?.Value;
            
            if (string.IsNullOrEmpty(schoolIdClaim))
                throw new UnauthorizedAccessException("SchoolId not found in claims");
            
            if (!Guid.TryParse(schoolIdClaim, out var schoolId))
                throw new UnauthorizedAccessException("Invalid SchoolId format in claims");
            
            return schoolId;
        }

        /// <summary>
        /// Extract UserId from JWT claims
        /// </summary>
        public static Guid GetUserIdFromClaims(ClaimsPrincipal user)
        {
            var userIdClaim = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            
            if (string.IsNullOrEmpty(userIdClaim))
                throw new UnauthorizedAccessException("UserId not found in claims");
            
            if (!Guid.TryParse(userIdClaim, out var userId))
                throw new UnauthorizedAccessException("Invalid UserId format in claims");
            
            return userId;
        }

        /// <summary>
        /// Extract Role from JWT claims
        /// </summary>
        public static string GetRoleFromClaims(ClaimsPrincipal user)
        {
            var role = user.FindFirst(ClaimTypes.Role)?.Value;
            
            if (string.IsNullOrEmpty(role))
                throw new UnauthorizedAccessException("Role not found in claims");
            
            return role;
        }

        /// <summary>
        /// Check if user has specific role
        /// </summary>
        public static bool HasRole(ClaimsPrincipal user, params string[] roles)
        {
            try
            {
                var userRole = GetRoleFromClaims(user);
                return roles.Contains(userRole, StringComparer.OrdinalIgnoreCase);
            }
            catch
            {
                return false;
            }
        }

        /// <summary>
        /// Validate SchoolId matches claim
        /// </summary>
        public static void ValidateSchoolIdMatch(ClaimsPrincipal user, Guid schoolId)
        {
            var claimsSchoolId = GetSchoolIdFromClaims(user);
            
            if (claimsSchoolId != schoolId)
                throw new UnauthorizedAccessException("SchoolId mismatch - cross-school access denied");
        }
    }
}
