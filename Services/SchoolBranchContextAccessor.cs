using System.Security.Claims;

namespace SmsApi.Services
{
    /// <summary>
    /// Resolves the active School + Branch context from the current HTTP request.
    /// BranchId is resolved in order:
    ///   1. JWT claim "BranchId"
    ///   2. Request header "X-Branch-Id" (for SuperAdmin cross-branch calls)
    ///   3. Guid.Empty — providers will use school-level default credentials
    /// </summary>
    public sealed class SchoolBranchContextAccessor : ISchoolBranchContext
    {
        private readonly IHttpContextAccessor _http;

        public SchoolBranchContextAccessor(IHttpContextAccessor http)
        {
            _http = http;
        }

        private ClaimsPrincipal? User => _http.HttpContext?.User;

        public bool IsAuthenticated => User?.Identity?.IsAuthenticated ?? false;

        public Guid SchoolId
        {
            get
            {
                if (TryGetSchoolId(out var id)) return id;
                throw new UnauthorizedAccessException("SchoolId not found in token claims.");
            }
        }

        public Guid BranchId
        {
            get
            {
                TryGetBranchId(out var id);
                return id; // Guid.Empty when absent — callers use HasBranch
            }
        }

        public bool HasBranch => TryGetBranchId(out var id) && id != Guid.Empty;

        public bool TryGetSchoolId(out Guid schoolId)
        {
            schoolId = Guid.Empty;
            var claim = User?.FindFirst("SchoolId")?.Value
                     ?? User?.FindFirst("schoolId")?.Value;
            return !string.IsNullOrEmpty(claim) && Guid.TryParse(claim, out schoolId);
        }

        public bool TryGetBranchId(out Guid branchId)
        {
            branchId = Guid.Empty;

            // 1. JWT claim
            var claim = User?.FindFirst("BranchId")?.Value
                     ?? User?.FindFirst("branchId")?.Value;
            if (!string.IsNullOrEmpty(claim) && Guid.TryParse(claim, out branchId) && branchId != Guid.Empty)
                return true;

            // 2. Request header (SuperAdmin / admin portal branch-switcher)
            var header = _http.HttpContext?.Request.Headers["X-Branch-Id"].FirstOrDefault();
            if (!string.IsNullOrEmpty(header) && Guid.TryParse(header, out branchId) && branchId != Guid.Empty)
                return true;

            branchId = Guid.Empty;
            return false;
        }
    }
}
