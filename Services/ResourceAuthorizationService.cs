using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.Constants;

namespace SmsApi.Services;

/// <summary>
/// Row-level security: determines if the current user may read/write a specific entity.
/// Guards against IDOR — a parent cannot enumerate another student's data by guessing IDs.
/// </summary>
public interface IResourceAuthorizationService
{
    /// <summary>
    /// Can the current user access the given student?
    /// - SuperAdmin / Admin / Principal / Teacher / Staff: any student in their school
    /// - Parent: only their guardian-linked children (matched by email on StudentGuardian)
    /// - Student: only themselves (matched by UserId on UserLogin)
    /// </summary>
    Task<bool> CanAccessStudentAsync(Guid studentId);

    /// <summary>
    /// Returns the set of student IDs the current user may see.
    /// Returns null = "all students in school" (for staff roles).
    /// Returns empty list = no access.
    /// </summary>
    Task<List<Guid>?> GetAuthorizedStudentIdsAsync();

    /// <summary>
    /// Can the current user access the given staff member?
    /// - SuperAdmin / Admin: any staff
    /// - Staff: only themselves
    /// </summary>
    Task<bool> CanAccessStaffAsync(Guid staffId);
}

public class ResourceAuthorizationService : IResourceAuthorizationService
{
    private readonly AppDbContext _context;
    private readonly ITenantContext _tenant;
    private readonly ILogger<ResourceAuthorizationService> _logger;

    public ResourceAuthorizationService(
        AppDbContext context,
        ITenantContext tenant,
        ILogger<ResourceAuthorizationService> logger)
    {
        _context = context;
        _tenant = tenant;
        _logger = logger;
    }

    public async Task<bool> CanAccessStudentAsync(Guid studentId)
    {
        if (!_tenant.IsAuthenticated) return false;
        if (_tenant.IsSuperAdmin) return true;

        var role = _tenant.Role?.ToLowerInvariant();

        // Staff roles have school-level access
        if (role is "admin" or "principal" or "teacher" or "staff" or "accountant")
        {
            var schoolId = _tenant.SchoolId;
            return await _context.Students
                .AsNoTracking()
                .AnyAsync(s => s.Id == studentId && s.SchoolId == schoolId && !s.IsDeleted);
        }

        // Student: can only access their own record (matched via UserLogin)
        if (role == "student")
        {
            var userEmail = _tenant.UserEmail;
            if (string.IsNullOrEmpty(userEmail)) return false;

            return await _context.Students
                .AsNoTracking()
                .AnyAsync(s => s.Id == studentId && !s.IsDeleted &&
                    s.Email != null && s.Email.ToLower() == userEmail.ToLower());
        }

        // Parent: can only access guardian-linked students
        if (role == "parent")
        {
            var authorizedIds = await GetAuthorizedStudentIdsAsync();
            return authorizedIds?.Contains(studentId) ?? false;
        }

        _logger.LogWarning("Unknown role {Role} attempting to access student {StudentId}", _tenant.Role, studentId);
        return false;
    }

    public async Task<List<Guid>?> GetAuthorizedStudentIdsAsync()
    {
        if (!_tenant.IsAuthenticated) return new List<Guid>();

        var role = _tenant.Role?.ToLowerInvariant();

        // Staff roles — return null (caller interprets as "all students in school")
        if (_tenant.IsSuperAdmin || role is "admin" or "principal" or "teacher" or "staff" or "accountant")
            return null;

        // Student — only themselves
        if (role == "student")
        {
            var userEmail = _tenant.UserEmail;
            if (string.IsNullOrEmpty(userEmail)) return new List<Guid>();

            var ownId = await _context.Students
                .AsNoTracking()
                .Where(s => !s.IsDeleted && s.Email != null && s.Email.ToLower() == userEmail.ToLower())
                .Select(s => s.Id)
                .FirstOrDefaultAsync();

            return ownId == Guid.Empty ? new List<Guid>() : new List<Guid> { ownId };
        }

        // Parent — look up linked students via StudentGuardian.Email
        if (role == "parent")
        {
            var userEmail = _tenant.UserEmail;
            if (string.IsNullOrEmpty(userEmail))
            {
                _logger.LogWarning("Parent user {UserId} has no email claim", _tenant.UserId);
                return new List<Guid>();
            }

            var linkedStudents = await _context.StudentGuardians
                .AsNoTracking()
                .Where(sg => !sg.IsDeleted &&
                    sg.Email != null && sg.Email.ToLower() == userEmail.ToLower())
                .Select(sg => sg.StudentId)
                .Distinct()
                .ToListAsync();

            if (linkedStudents.Count == 0)
                _logger.LogWarning("Parent {Email} has no linked students in StudentGuardians", userEmail);

            return linkedStudents;
        }

        return new List<Guid>();
    }

    public async Task<bool> CanAccessStaffAsync(Guid staffId)
    {
        if (!_tenant.IsAuthenticated) return false;
        if (_tenant.IsSuperAdmin) return true;

        var role = _tenant.Role?.ToLowerInvariant();

        // Admin / Principal: any staff in their school
        if (role is "admin" or "principal")
        {
            var schoolId = _tenant.SchoolId;
            return await _context.StaffMembers
                .AsNoTracking()
                .AnyAsync(s => s.Id == staffId && s.SchoolId == schoolId && !s.IsDeleted);
        }

        // Staff: only themselves
        if (role == "staff" || role == "teacher")
        {
            var userEmail = _tenant.UserEmail;
            if (string.IsNullOrEmpty(userEmail)) return false;

            return await _context.StaffMembers
                .AsNoTracking()
                .AnyAsync(s => s.Id == staffId && !s.IsDeleted &&
                    s.Email != null && s.Email.ToLower() == userEmail.ToLower());
        }

        return false;
    }
}
