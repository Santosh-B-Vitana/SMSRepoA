using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models;
using SmsApi.Models.Entities;
using SmsApi.Services;
using System.Security.Cryptography;
using System.Text;

namespace SmsApi.Controllers;

/// <summary>
/// Manages parent/guardian portal accounts.
/// Admins provision accounts and reset passwords.
/// Parents change their own passwords via POST /api/auth/change-password.
/// </summary>
[ApiController]
[Route("api/parent-portal")]
[Authorize]
public class ParentPortalController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ITenantContext _tenant;
    private readonly ILogger<ParentPortalController> _logger;

    public ParentPortalController(
        AppDbContext context,
        ITenantContext tenant,
        ILogger<ParentPortalController> logger)
    {
        _context = context;
        _tenant = tenant;
        _logger = logger;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET  /api/parent-portal/accounts/{studentId}
    // Returns account status for every guardian of a student.
    // ─────────────────────────────────────────────────────────────────────────
    [HttpGet("accounts/{studentId:guid}")]
    [Authorize(Roles = "Admin,Principal")]
    public async Task<IActionResult> GetParentAccounts(Guid studentId)
    {
        var schoolId = _tenant.GetEffectiveSchoolId();

        // Verify student belongs to this school
        var student = await _context.Students
            .FirstOrDefaultAsync(s => s.Id == studentId && s.SchoolId == schoolId && !s.IsDeleted);

        if (student == null)
            return NotFound(new { message = "Student not found." });

        var guardians = await _context.StudentGuardians
            .Where(g => g.StudentId == studentId && g.SchoolId == schoolId && !g.IsDeleted)
            .ToListAsync();

        // For each guardian check if there's a UserLogin
        var guardianEmails = guardians
            .Where(g => !string.IsNullOrWhiteSpace(g.Email))
            .Select(g => g.Email!.ToLower())
            .Distinct()
            .ToList();

        var existingLogins = await _context.UserLogins
            .Where(u => u.SchoolId == schoolId && u.Role == "parent" && !u.IsDeleted
                        && guardianEmails.Contains(u.Email.ToLower()))
            .ToListAsync();

        var loginByEmail = existingLogins.ToDictionary(l => l.Email.ToLower());

        var result = guardians.Select(g =>
        {
            UserLogin? login = null;
            if (!string.IsNullOrWhiteSpace(g.Email))
                loginByEmail.TryGetValue(g.Email.ToLower(), out login);

            return new GuardianAccountStatusDto
            {
                GuardianId = g.Id,
                GuardianName = g.Name,
                Relation = g.Relation,
                Email = g.Email,
                Phone = g.Phone,
                HasAccount = login != null,
                AccountStatus = login?.Status,
                RequirePasswordChange = login?.RequirePasswordChange ?? false,
                LastLogin = login?.LastLogin,
                UserLoginId = login?.Id
            };
        }).ToList();

        return Ok(result);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/parent-portal/provision/{studentId}/guardian/{guardianId}
    // Creates (or re-provisions) a parent portal login for a guardian.
    // Returns the generated plain-text password once — store or share it.
    // ─────────────────────────────────────────────────────────────────────────
    [HttpPost("provision/{studentId:guid}/guardian/{guardianId:guid}")]
    [Authorize(Roles = "Admin,Principal")]
    public async Task<IActionResult> ProvisionParentAccount(Guid studentId, Guid guardianId)
    {
        var schoolId = _tenant.GetEffectiveSchoolId();
        var adminId = _tenant.UserId;

        // Verify student belongs to school
        var student = await _context.Students
            .FirstOrDefaultAsync(s => s.Id == studentId && s.SchoolId == schoolId && !s.IsDeleted);
        if (student == null)
            return NotFound(new { message = "Student not found." });

        // Load guardian
        var guardian = await _context.StudentGuardians
            .FirstOrDefaultAsync(g => g.Id == guardianId && g.StudentId == studentId
                                       && g.SchoolId == schoolId && !g.IsDeleted);
        if (guardian == null)
            return NotFound(new { message = "Guardian not found." });

        if (string.IsNullOrWhiteSpace(guardian.Email))
            return BadRequest(new { message = "Guardian does not have an email address. Please update the guardian's profile first." });

        var email = guardian.Email.Trim().ToLower();

        // Check for existing account
        var existing = await _context.UserLogins
            .FirstOrDefaultAsync(u => u.SchoolId == schoolId && u.Email.ToLower() == email
                                       && u.Role == "parent" && !u.IsDeleted);

        var plainPassword = GenerateReadablePassword();
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(plainPassword, workFactor: 12);
        var now = DateTime.UtcNow;

        string action;
        if (existing != null)
        {
            // Re-provision: reset the password on the existing account
            existing.PasswordHash = passwordHash;
            existing.RequirePasswordChange = true;
            existing.PasswordChangedAt = now;
            existing.Status = "active";
            existing.FailedLoginAttempts = 0;
            existing.LockedUntil = null;
            existing.LinkedEntityId = guardianId;
            existing.LinkedEntityType = "parent";
            existing.UpdatedAt = now;
            existing.UpdatedBy = adminId;
            action = "reprovi​sioned";
        }
        else
        {
            // Derive name from guardian record
            var nameParts = guardian.Name.Trim().Split(' ', 2);
            var firstName = nameParts[0];
            var lastName = nameParts.Length > 1 ? nameParts[1] : string.Empty;

            var login = new UserLogin
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                Username = email,
                Email = email,
                PasswordHash = passwordHash,
                FirstName = firstName,
                LastName = lastName,
                Role = "parent",
                Status = "active",
                RequirePasswordChange = true,
                LinkedEntityId = guardianId,
                LinkedEntityType = "parent",
                FailedLoginAttempts = 0,
                CreatedAt = now,
                UpdatedAt = now,
                CreatedBy = adminId
            };
            _context.UserLogins.Add(login);
            action = "provisioned";
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation("Parent account {Action} for guardian {GuardianId} by admin {AdminId}",
            action, guardianId, adminId);

        return Ok(new ProvisionParentAccountResponse
        {
            GuardianId = guardianId,
            GuardianName = guardian.Name,
            Email = email,
            TemporaryPassword = plainPassword,
            Action = action,
            Message = $"Account {action} successfully. Share the temporary password with the parent. They will be prompted to change it on first login.",
            RequirePasswordChange = true
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/parent-portal/reset-password/{studentId}/guardian/{guardianId}
    // Admin resets the guardian's password. Returns new temp password.
    // ─────────────────────────────────────────────────────────────────────────
    [HttpPost("reset-password/{studentId:guid}/guardian/{guardianId:guid}")]
    [Authorize(Roles = "Admin,Principal")]
    public async Task<IActionResult> ResetParentPassword(Guid studentId, Guid guardianId)
    {
        var schoolId = _tenant.GetEffectiveSchoolId();
        var adminId = _tenant.UserId;

        var guardian = await _context.StudentGuardians
            .FirstOrDefaultAsync(g => g.Id == guardianId && g.StudentId == studentId
                                       && g.SchoolId == schoolId && !g.IsDeleted);
        if (guardian == null)
            return NotFound(new { message = "Guardian not found." });

        if (string.IsNullOrWhiteSpace(guardian.Email))
            return BadRequest(new { message = "Guardian does not have a registered email address." });

        var email = guardian.Email.Trim().ToLower();

        var login = await _context.UserLogins
            .FirstOrDefaultAsync(u => u.SchoolId == schoolId && u.Email.ToLower() == email
                                       && u.Role == "parent" && !u.IsDeleted);

        if (login == null)
            return NotFound(new { message = "No parent portal account found for this guardian. Use the Provision endpoint first." });

        var plainPassword = GenerateReadablePassword();
        login.PasswordHash = BCrypt.Net.BCrypt.HashPassword(plainPassword, workFactor: 12);
        login.RequirePasswordChange = true;
        login.PasswordChangedAt = DateTime.UtcNow;
        login.Status = "active";
        login.FailedLoginAttempts = 0;
        login.LockedUntil = null;
        login.RefreshTokenHash = null; // Invalidate any active sessions
        login.RefreshTokenExpiry = null;
        login.UpdatedAt = DateTime.UtcNow;
        login.UpdatedBy = adminId;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Parent password reset for guardian {GuardianId} by admin {AdminId}",
            guardianId, adminId);

        return Ok(new ProvisionParentAccountResponse
        {
            GuardianId = guardianId,
            GuardianName = guardian.Name,
            Email = email,
            TemporaryPassword = plainPassword,
            Action = "reset",
            Message = "Password reset successfully. Share the new temporary password with the parent.",
            RequirePasswordChange = true
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Generates a human-readable secure password like "Veda@2026#xK9m".
    /// Easy to share verbally/visually while still being strong.
    /// </summary>
    private static string GenerateReadablePassword()
    {
        const string upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        const string lower = "abcdefghjkmnpqrstuvwxyz";
        const string digits = "23456789";
        const string special = "@#$!";

        Span<byte> buf = stackalloc byte[8];
        RandomNumberGenerator.Fill(buf);

        var sb = new StringBuilder("Veda");
        sb.Append(special[buf[0] % special.Length]);
        sb.Append(digits[buf[1] % digits.Length]);
        sb.Append(digits[buf[2] % digits.Length]);
        sb.Append(digits[buf[3] % digits.Length]);
        sb.Append(upper[buf[4] % upper.Length]);
        sb.Append(lower[buf[5] % lower.Length]);
        sb.Append(digits[buf[6] % digits.Length]);
        sb.Append(upper[buf[7] % upper.Length]);

        return sb.ToString(); // e.g.  Veda@842Km3T
    }
}

// ── DTOs ──────────────────────────────────────────────────────────────────

public class GuardianAccountStatusDto
{
    public Guid GuardianId { get; set; }
    public string GuardianName { get; set; } = string.Empty;
    public string Relation { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string Phone { get; set; } = string.Empty;
    public bool HasAccount { get; set; }
    public string? AccountStatus { get; set; }
    public bool RequirePasswordChange { get; set; }
    public DateTime? LastLogin { get; set; }
    public Guid? UserLoginId { get; set; }
}

public class ProvisionParentAccountResponse
{
    public Guid GuardianId { get; set; }
    public string GuardianName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    /// <summary>Plain-text temporary password. Show once — not stored.</summary>
    public string TemporaryPassword { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty; // provisioned | reprovisioned | reset
    public string Message { get; set; } = string.Empty;
    public bool RequirePasswordChange { get; set; }
}
