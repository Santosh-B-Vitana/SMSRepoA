using Microsoft.EntityFrameworkCore;
using SmsApi.Data;

namespace SmsApi.Services;

/// <summary>
/// Centralizes parent-to-student access control.
/// A parent may access a student's data if:
///   1. They are a direct guardian of that student (StudentGuardians), OR
///   2. The student is a sibling of a student for whom they are a guardian (StudentSiblings).
/// This ensures siblings auto-linked via the admin portal are fully accessible in the parent portal.
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

        // 1. Direct guardian check
        var directLink = await _context.StudentGuardians
            .AnyAsync(g => g.StudentId == studentId
                        && g.SchoolId == schoolId
                        && !g.IsDeleted
                        && g.Email != null
                        && g.Email.ToLower() == email);

        if (directLink) return true;

        // 2. Sibling check — parent is a guardian of any sibling of this student
        //    (bidirectional: StudentSiblings has A→B and B→A rows)
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

        return siblingAccessible;
    }
}
