using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.Entities;

namespace SmsApi.Services;

// ── Interface ─────────────────────────────────────────────────────────────────

/// <summary>
/// Chain-of-responsibility policy for document access decisions.
/// Returns true to grant, false to deny, null to defer to the next policy.
/// </summary>
public interface IDocumentAccessPolicy
{
    /// <summary>Evaluation order — lower runs first.</summary>
    int Order { get; }

    /// <summary>Returns true when this policy has an opinion on the given document.</summary>
    bool AppliesTo(Document document);

    /// <summary>
    /// Evaluates access. Returns:
    ///  true  → grant immediately
    ///  false → deny immediately
    ///  null  → no opinion, continue to next policy
    /// </summary>
    Task<bool?> EvaluateAsync(Document document, ITenantContext tenant);
}

/// <summary>
/// Orchestrates the policy chain. Register as scoped DI service.
/// </summary>
public interface IDocumentAccessPolicyService
{
    Task<bool> EvaluateAccessAsync(Document document);
}

// ── Concrete policies (ordered) ───────────────────────────────────────────────

/// <summary>Order 0: Public documents are readable by any authenticated user.</summary>
public sealed class PublicDocumentAccessPolicy : IDocumentAccessPolicy
{
    public int Order => 0;

    public bool AppliesTo(Document document) =>
        document.AccessLevel.Equals("Public", StringComparison.OrdinalIgnoreCase);

    public Task<bool?> EvaluateAsync(Document document, ITenantContext tenant) =>
        Task.FromResult<bool?>(tenant.IsAuthenticated);
}

/// <summary>Order 1: SuperAdmin has unrestricted access to every document.</summary>
public sealed class SuperAdminDocumentAccessPolicy : IDocumentAccessPolicy
{
    public int Order => 1;
    public bool AppliesTo(Document document) => true;

    public Task<bool?> EvaluateAsync(Document document, ITenantContext tenant) =>
        Task.FromResult<bool?>(tenant.IsSuperAdmin ? true : null);
}

/// <summary>Order 2: Admin / Principal can access all documents in their school.</summary>
public sealed class AdminDocumentAccessPolicy : IDocumentAccessPolicy
{
    public int Order => 2;
    public bool AppliesTo(Document document) => true;

    public Task<bool?> EvaluateAsync(Document document, ITenantContext tenant)
    {
        var role = tenant.Role?.ToLowerInvariant();
        if (role is "admin" or "principal")
            return Task.FromResult<bool?>(tenant.CanAccessSchool(document.SchoolId));

        return Task.FromResult<bool?>(null);
    }
}

/// <summary>Order 3: The staff member who uploaded the document always has access.</summary>
public sealed class UploaderDocumentAccessPolicy : IDocumentAccessPolicy
{
    public int Order => 3;
    public bool AppliesTo(Document document) => document.UploadedByStaffId != Guid.Empty;

    public Task<bool?> EvaluateAsync(Document document, ITenantContext tenant)
    {
        // Compare uploader's staff login ID against the current user ID from JWT
        if (document.UploadedByStaffId == tenant.UserId)
            return Task.FromResult<bool?>(true);

        return Task.FromResult<bool?>(null);
    }
}

/// <summary>Order 10: AccessLevel == "Staff" — only staff/admin roles can access.</summary>
public sealed class StaffDocumentAccessPolicy : IDocumentAccessPolicy
{
    public int Order => 10;

    public bool AppliesTo(Document document) =>
        document.AccessLevel.Equals("Staff", StringComparison.OrdinalIgnoreCase);

    public Task<bool?> EvaluateAsync(Document document, ITenantContext tenant)
    {
        var role = tenant.Role?.ToLowerInvariant();
        return Task.FromResult<bool?>(role is "admin" or "principal" or "teacher" or "staff" or "accountant" or "librarian");
    }
}

/// <summary>Order 11: Class-scoped document — teacher assigned to that class (via timetable), or parent/student in that class.</summary>
public sealed class ClassDocumentAccessPolicy : IDocumentAccessPolicy
{
    private readonly AppDbContext _db;

    public ClassDocumentAccessPolicy(AppDbContext db) => _db = db;

    public int Order => 11;

    public bool AppliesTo(Document document) =>
        document.AccessLevel.Equals("Class", StringComparison.OrdinalIgnoreCase)
        && document.RelatedClassId.HasValue;

    public async Task<bool?> EvaluateAsync(Document document, ITenantContext tenant)
    {
        var role = tenant.Role?.ToLowerInvariant();
        var classId = document.RelatedClassId!.Value;

        // Teacher: check they have at least one timetable period in this class
        if (role is "teacher" or "staff")
        {
            var isAssigned = await _db.TimetablePeriods
                .AnyAsync(p => p.Timetable!.ClassId == classId && p.TeacherId == tenant.UserId);
            return isAssigned ? true : null; // null = defer; another policy may still grant access
        }

        // Parent / Student: check their linked student is in this class
        if (role is "parent" or "student")
        {
            var userEmail = tenant.UserEmail;
            // Get class name from classId then check Student.Class string
            var className = await _db.Classes
                .Where(c => c.Id == classId)
                .Select(c => c.Name)
                .FirstOrDefaultAsync();

            if (className == null) return false;

            var inClass = await _db.Students
                .AnyAsync(s => s.SchoolId == document.SchoolId
                               && s.Class == className
                               && (s.Email == userEmail
                                   || s.Guardians!.Any(g => g.Email == userEmail)));
            return inClass ? true : false;
        }

        return null;
    }
}

/// <summary>Order 12: Section-scoped document.</summary>
public sealed class SectionDocumentAccessPolicy : IDocumentAccessPolicy
{
    private readonly AppDbContext _db;

    public SectionDocumentAccessPolicy(AppDbContext db) => _db = db;

    public int Order => 12;

    public bool AppliesTo(Document document) =>
        document.AccessLevel.Equals("Section", StringComparison.OrdinalIgnoreCase)
        && document.RelatedSectionId.HasValue;

    public async Task<bool?> EvaluateAsync(Document document, ITenantContext tenant)
    {
        var role = tenant.Role?.ToLowerInvariant();
        var sectionId = document.RelatedSectionId!.Value;

        if (role is "teacher" or "staff")
        {
            var isAssigned = await _db.TimetablePeriods
                .AnyAsync(p => p.Timetable!.SectionId == sectionId && p.TeacherId == tenant.UserId);
            return isAssigned ? true : null;
        }

        if (role is "parent" or "student")
        {
            var userEmail = tenant.UserEmail;
            var sectionName = await _db.Sections
                .Where(s => s.Id == sectionId)
                .Select(s => s.Name)
                .FirstOrDefaultAsync();

            if (sectionName == null) return false;

            var inSection = await _db.Students
                .AnyAsync(s => s.SchoolId == document.SchoolId
                               && s.Section == sectionName
                               && (s.Email == userEmail
                                   || s.Guardians!.Any(g => g.Email == userEmail)));
            return inSection ? true : false;
        }

        return null;
    }
}

/// <summary>Order 100: Deny everything that no other policy has granted.</summary>
public sealed class DefaultDocumentAccessPolicy : IDocumentAccessPolicy
{
    public int Order => 100;
    public bool AppliesTo(Document document) => true;

    public Task<bool?> EvaluateAsync(Document document, ITenantContext tenant) =>
        Task.FromResult<bool?>(false);
}

// ── Orchestrator ──────────────────────────────────────────────────────────────

/// <summary>
/// Evaluates all applicable policies in order. First definitive answer wins.
/// </summary>
public sealed class DocumentAccessPolicyService : IDocumentAccessPolicyService
{
    private readonly ITenantContext _tenant;
    private readonly IReadOnlyList<IDocumentAccessPolicy> _policies;
    private readonly ILogger<DocumentAccessPolicyService> _logger;

    public DocumentAccessPolicyService(
        ITenantContext tenant,
        IEnumerable<IDocumentAccessPolicy> policies,
        ILogger<DocumentAccessPolicyService> logger)
    {
        _tenant = tenant;
        _policies = policies.OrderBy(p => p.Order).ToList();
        _logger = logger;
    }

    public async Task<bool> EvaluateAccessAsync(Document document)
    {
        if (!_tenant.IsAuthenticated)
        {
            _logger.LogWarning("Document access denied — unauthenticated. DocumentId={Id}", document.Id);
            return false;
        }

        if (!_tenant.CanAccessSchool(document.SchoolId))
        {
            _logger.LogWarning("Document access denied — cross-school attempt. DocumentId={Id} SchoolId={School}", document.Id, document.SchoolId);
            return false;
        }

        foreach (var policy in _policies)
        {
            if (!policy.AppliesTo(document))
                continue;

            var result = await policy.EvaluateAsync(document, _tenant);
            if (result.HasValue)
            {
                _logger.LogDebug("Document access {Result} by {Policy}. DocumentId={Id}",
                    result.Value ? "GRANTED" : "DENIED", policy.GetType().Name, document.Id);
                return result.Value;
            }
        }

        _logger.LogWarning("Document access denied — no policy matched. DocumentId={Id}", document.Id);
        return false;
    }
}
