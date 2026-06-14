using Microsoft.EntityFrameworkCore;
using SmsApi.Data;

namespace SmsApi.Services;

/// <summary>
/// Centralizes parent-to-student access control.
/// A parent may access a student's data if any of the following are true:
///   1. V1 (legacy): They are listed in StudentGuardians for that student, OR
///   2. V2 (normalized): Their email matches a Person linked to a Guardian who has
///      a GuardianStudent record for that student, OR
///   3. The student is a sibling of a student they are authorized to access.
/// Both V1 and V2 checks are performed to support the ongoing migration.
/// </summary>
public interface IParentAuthorizationService
{
    /// <summary>
    /// Returns true if <paramref name="parentEmail"/> is authorised to access data
    /// for <paramref name="studentId"/> within the given school.
    /// </summary>
    Task<bool> CanAccessStudentAsync(Guid schoolId, string parentEmail, Guid studentId);
}

public class ParentAuthorizationService : IParentAuthorizationService
{
    private readonly AppDbContext _context;

    public ParentAuthorizationService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<bool> CanAccessStudentAsync(Guid schoolId, string parentEmail, Guid studentId)
    {
        if (string.IsNullOrWhiteSpace(parentEmail)) return false;

        var email = parentEmail.ToLower();

        // ── V1: Legacy StudentGuardians direct check ──────────────────────────
        var v1Direct = await _context.StudentGuardians
            .AnyAsync(g => g.StudentId == studentId
                        && g.SchoolId == schoolId
                        && !g.IsDeleted
                        && g.Email != null
                        && g.Email.ToLower() == email);

        if (v1Direct) return true;

        // ── V2: Normalized Guardian→Person email check ────────────────────────
        var v2Direct = await (
            from gs in _context.GuardianStudents
            join g in _context.Guardians on gs.GuardianId equals g.Id
            join p in _context.Persons   on g.PersonId    equals p.Id
            where gs.StudentId == studentId
               && gs.SchoolId  == schoolId
               && !gs.IsDeleted
               && !g.IsDeleted
               && p.Email != null
               && p.Email.ToLower() == email
            select 1
        ).AnyAsync();

        if (v2Direct) return true;

        // ── V1 + sibling check ────────────────────────────────────────────────
        var siblingAccessible = await (
            from sg in _context.StudentGuardians
            join ss in _context.StudentSiblings
                on new { sg.SchoolId, StudentId = sg.StudentId }
                equals new { ss.SchoolId, ss.StudentId }
            where sg.SchoolId == schoolId
               && !sg.IsDeleted
               && sg.Email != null
               && sg.Email.ToLower() == email
               && ss.SiblingId == studentId
            select 1
        ).AnyAsync();

        if (siblingAccessible) return true;

        // ── V2 + sibling check ────────────────────────────────────────────────
        var v2Sibling = await (
            from gs in _context.GuardianStudents
            join g in _context.Guardians on gs.GuardianId equals g.Id
            join p in _context.Persons   on g.PersonId    equals p.Id
            join ss in _context.StudentSiblings
                on new { gs.SchoolId, StudentId = gs.StudentId }
                equals new { ss.SchoolId, ss.StudentId }
            where gs.SchoolId == schoolId
               && !gs.IsDeleted
               && !g.IsDeleted
               && p.Email != null
               && p.Email.ToLower() == email
               && ss.SiblingId == studentId
            select 1
        ).AnyAsync();

        return v2Sibling;
    }
}
