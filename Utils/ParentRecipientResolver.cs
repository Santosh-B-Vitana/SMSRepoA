using Microsoft.EntityFrameworkCore;
using SmsApi.Data;

namespace SmsApi.Utils
{
    /// <summary>
    /// Centralised resolution of a student's parent/guardian portal accounts for notification delivery.
    /// <para>
    /// The system carries TWO guardian data models that may both be partially populated:
    /// <list type="bullet">
    ///   <item>LEGACY: <c>StudentGuardians</c> — links a student to a guardian by email and/or a direct
    ///   <c>UserLoginId</c>.</item>
    ///   <item>MODERN: <c>GuardianStudents</c> → <c>Guardian.UserLoginId</c> — the normalised model.</item>
    /// </list>
    /// Historically each notification service resolved parents differently (some only queried the legacy
    /// table), which meant parents whose portal link lived only in the other table never received
    /// notifications — most visibly for parents with multiple children. This helper unions ALL linkage
    /// paths so every notification reaches every linked, active parent account exactly once.
    /// </para>
    /// </summary>
    public static class ParentRecipientResolver
    {
        /// <summary>
        /// Returns a map of <c>studentId → distinct active parent UserLogin IDs</c> for the given students,
        /// unioning the legacy direct-link, legacy email-join, and modern guardian paths. Only active,
        /// non-deleted parent accounts in the school are included.
        /// </summary>
        public static async Task<Dictionary<Guid, List<Guid>>> GetParentUserIdsByStudentAsync(
            AppDbContext context, Guid schoolId, IReadOnlyCollection<Guid> studentIds)
        {
            var result = new Dictionary<Guid, HashSet<Guid>>();
            if (studentIds == null || studentIds.Count == 0)
                return new Dictionary<Guid, List<Guid>>();

            void Add(Guid studentId, Guid parentId)
            {
                if (!result.TryGetValue(studentId, out var set))
                {
                    set = new HashSet<Guid>();
                    result[studentId] = set;
                }
                set.Add(parentId);
            }

            // ── Path A: LEGACY StudentGuardians with a direct UserLoginId ─────────────────────────
            var legacyDirect = await context.StudentGuardians
                .Where(sg => sg.SchoolId == schoolId && !sg.IsDeleted
                             && studentIds.Contains(sg.StudentId)
                             && sg.UserLoginId != null)
                .Select(sg => new { sg.StudentId, UserLoginId = sg.UserLoginId!.Value })
                .ToListAsync();

            // ── Path B: LEGACY StudentGuardians linked by email ──────────────────────────────────
            var legacyEmailLinks = await context.StudentGuardians
                .Where(sg => sg.SchoolId == schoolId && !sg.IsDeleted
                             && studentIds.Contains(sg.StudentId)
                             && sg.Email != null && sg.Email != "")
                .Select(sg => new { sg.StudentId, Email = sg.Email!.ToLower() })
                .ToListAsync();

            // ── Path C: MODERN GuardianStudents → Guardian.UserLoginId ───────────────────────────
            var modernLinks = await context.GuardianStudents
                .Where(gs => gs.SchoolId == schoolId && !gs.IsDeleted
                             && studentIds.Contains(gs.StudentId)
                             && gs.Guardian != null && gs.Guardian.UserLoginId != null)
                .Select(gs => new { gs.StudentId, UserLoginId = gs.Guardian!.UserLoginId!.Value })
                .ToListAsync();

            // Resolve email links to UserLogin IDs (active parent accounts only).
            var emails = legacyEmailLinks.Select(l => l.Email).Distinct().ToList();
            var emailToUserId = emails.Count == 0
                ? new Dictionary<string, Guid>()
                : (await context.UserLogins
                        .Where(ul => ul.SchoolId == schoolId && !ul.IsDeleted
                                     && ul.Status == "active"
                                     && emails.Contains(ul.Email.ToLower()))
                        .Select(ul => new { ul.Id, Email = ul.Email.ToLower() })
                        .ToListAsync())
                    .GroupBy(x => x.Email)
                    .ToDictionary(g => g.Key, g => g.First().Id);

            // Collect every candidate (studentId, userId) pair from all three paths.
            foreach (var l in legacyDirect) Add(l.StudentId, l.UserLoginId);
            foreach (var l in modernLinks) Add(l.StudentId, l.UserLoginId);
            foreach (var l in legacyEmailLinks)
                if (emailToUserId.TryGetValue(l.Email, out var uid)) Add(l.StudentId, uid);

            // Validate all collected direct/modern user IDs are active accounts in the school.
            var allUserIds = result.Values.SelectMany(s => s).Distinct().ToList();
            if (allUserIds.Count == 0)
                return new Dictionary<Guid, List<Guid>>();

            var validUserIds = (await context.UserLogins
                    .Where(ul => ul.SchoolId == schoolId && !ul.IsDeleted
                                 && ul.Status == "active"
                                 && allUserIds.Contains(ul.Id))
                    .Select(ul => ul.Id)
                    .ToListAsync())
                .ToHashSet();

            return result.ToDictionary(
                kv => kv.Key,
                kv => kv.Value.Where(validUserIds.Contains).Distinct().ToList());
        }

        /// <summary>
        /// Convenience overload for a single student: returns its distinct active parent UserLogin IDs.
        /// </summary>
        public static async Task<List<Guid>> GetParentUserIdsForStudentAsync(
            AppDbContext context, Guid schoolId, Guid studentId)
        {
            var map = await GetParentUserIdsByStudentAsync(context, schoolId, new[] { studentId });
            return map.TryGetValue(studentId, out var ids) ? ids : new List<Guid>();
        }

        /// <summary>
        /// Convenience overload returning the flat, distinct set of active parent UserLogin IDs across
        /// all given students (for broadcast-style notifications where per-student tagging isn't needed).
        /// </summary>
        public static async Task<List<Guid>> GetParentUserIdsForStudentsAsync(
            AppDbContext context, Guid schoolId, IReadOnlyCollection<Guid> studentIds)
        {
            var map = await GetParentUserIdsByStudentAsync(context, schoolId, studentIds);
            return map.Values.SelectMany(ids => ids).Distinct().ToList();
        }
    }
}
