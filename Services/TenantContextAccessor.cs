using SmsApi.Models.Constants;
using System.Security.Claims;

namespace SmsApi.Services
{
    /// <summary>
    /// Provides tenant (school) context from the current HTTP request.
    /// Replaces static SecurityHelper calls with an injectable, testable service.
    /// Injected via IHttpContextAccessor so it always reflects the live request.
    /// </summary>
    public interface ITenantContext
    {
        /// <summary>SchoolId from JWT. Throws if not authenticated or not present.</summary>
        Guid SchoolId { get; }

        /// <summary>UserId from JWT. Throws if not present.</summary>
        Guid UserId { get; }

        /// <summary>Email from JWT claims (ClaimTypes.Email).</summary>
        string? UserEmail { get; }

        /// <summary>Role from JWT claims.</summary>
        string? Role { get; }

        bool IsAuthenticated { get; }
        bool IsSuperAdmin { get; }

        /// <summary>Try to get SchoolId without throwing.</summary>
        bool TryGetSchoolId(out Guid schoolId);

        /// <summary>Try to get UserId without throwing.</summary>
        bool TryGetUserId(out Guid userId);

        /// <summary>
        /// Returns the effective SchoolId for the operation.
        /// SuperAdmin: uses the explicitly requested schoolId (required).
        /// Normal role: validates requested matches JWT, returns JWT schoolId.
        /// </summary>
        Guid GetEffectiveSchoolId(Guid? requestedSchoolId = null);

        /// <summary>Returns true if the current user may access the given school.</summary>
        bool CanAccessSchool(Guid schoolId);
    }

    public class TenantContextAccessor : ITenantContext
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public TenantContextAccessor(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        private ClaimsPrincipal? User => _httpContextAccessor.HttpContext?.User;

        public bool IsAuthenticated => User?.Identity?.IsAuthenticated ?? false;

        public string? Role => User?.FindFirst(ClaimTypes.Role)?.Value;

        public string? UserEmail => User?.FindFirst(ClaimTypes.Email)?.Value;

        public bool IsSuperAdmin =>
            string.Equals(Role, StatusConstants.Roles.SuperAdmin, StringComparison.OrdinalIgnoreCase);

        public Guid SchoolId
        {
            get
            {
                if (TryGetSchoolId(out var id)) return id;
                if (IsSuperAdmin) return Guid.Empty; // SuperAdmin has no school scope
                throw new UnauthorizedAccessException("SchoolId not found in token claims.");
            }
        }

        public Guid UserId
        {
            get
            {
                if (TryGetUserId(out var id)) return id;
                throw new UnauthorizedAccessException("UserId not found in token claims.");
            }
        }

        public bool TryGetSchoolId(out Guid schoolId)
        {
            schoolId = Guid.Empty;
            // Token stores "SchoolId" (capital S) — check both for resilience
            var claim = User?.FindFirst("SchoolId")?.Value
                     ?? User?.FindFirst("schoolId")?.Value;
            return !string.IsNullOrEmpty(claim) && Guid.TryParse(claim, out schoolId);
        }

        public bool TryGetUserId(out Guid userId)
        {
            userId = Guid.Empty;
            var claim = User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return !string.IsNullOrEmpty(claim) && Guid.TryParse(claim, out userId);
        }

        /// <summary>
        /// Returns the effective school ID, checking (in order):
        /// 1. requestedSchoolId argument
        /// 2. X-School-Override request header (super admin school context switcher)
        /// 3. JWT schoolId claim
        /// </summary>
        public Guid GetEffectiveSchoolId(Guid? requestedSchoolId = null)
        {
            if (IsSuperAdmin)
            {
                if (requestedSchoolId.HasValue && requestedSchoolId.Value != Guid.Empty)
                    return requestedSchoolId.Value;

                // Check header set by the super admin school-context switcher in the UI
                var header = _httpContextAccessor.HttpContext?.Request.Headers["X-School-Override"].FirstOrDefault();
                if (!string.IsNullOrEmpty(header) && Guid.TryParse(header, out var headerSchoolId) && headerSchoolId != Guid.Empty)
                    return headerSchoolId;

                return Guid.Empty; // caller decides whether to return all-schools data
            }

            if (!TryGetSchoolId(out var jwtSchoolId))
                throw new UnauthorizedAccessException("SchoolId not found in token claims.");

            if (requestedSchoolId.HasValue && requestedSchoolId.Value != Guid.Empty
                && requestedSchoolId.Value != jwtSchoolId)
                throw new UnauthorizedAccessException("Access denied: cannot access a different school's data.");

            return jwtSchoolId;
        }

        public bool CanAccessSchool(Guid schoolId)
        {
            if (IsSuperAdmin) return true;
            return TryGetSchoolId(out var id) && id == schoolId;
        }
    }
}
