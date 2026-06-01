namespace SmsApi.Services
{
    /// <summary>
    /// Extends the school-level tenant context with branch-level scoping.
    /// Providers inject this to resolve per-branch credentials at send time.
    /// BranchId == Guid.Empty means no branch was specified — use school-level defaults.
    /// </summary>
    public interface ISchoolBranchContext
    {
        /// <summary>School from JWT claim "SchoolId". Throws if not authenticated.</summary>
        Guid SchoolId { get; }

        /// <summary>
        /// Branch from JWT claim "BranchId" or request header "X-Branch-Id".
        /// Returns Guid.Empty when neither is present — resolver uses school defaults.
        /// </summary>
        Guid BranchId { get; }

        /// <summary>True when BranchId is a non-empty, meaningful branch identifier.</summary>
        bool HasBranch { get; }

        bool IsAuthenticated { get; }

        /// <summary>Non-throwing attempt to get SchoolId.</summary>
        bool TryGetSchoolId(out Guid schoolId);

        /// <summary>Non-throwing attempt to get BranchId.</summary>
        bool TryGetBranchId(out Guid branchId);
    }
}
