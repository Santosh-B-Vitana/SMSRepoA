using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.Entities;
using SmsApi.Services;
using System.Security.Cryptography;
using System.Text;

namespace SmsApi.Controllers;

/// <summary>
/// Manages staff portal accounts.
/// Admins provision accounts and reset passwords for staff members.
/// Staff change their own passwords via POST /api/auth/change-password.
/// </summary>
[ApiController]
[Route("api/staff-portal")]
[Authorize]
public class StaffPortalController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ITenantContext _tenant;
    private readonly ILogger<StaffPortalController> _logger;

    public StaffPortalController(
        AppDbContext context,
        ITenantContext tenant,
        ILogger<StaffPortalController> logger)
    {
        _context = context;
        _tenant = tenant;
        _logger = logger;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET  /api/staff-portal/account/{staffId}
    // Returns the portal account status for a staff member.
    // ─────────────────────────────────────────────────────────────────────────
    [HttpGet("account/{staffId:guid}")]
    [Authorize(Roles = "Admin,Principal")]
    public async Task<IActionResult> GetStaffAccount(Guid staffId)
    {
        var schoolId = _tenant.GetEffectiveSchoolId();

        var staff = await _context.StaffMembers
            .FirstOrDefaultAsync(s => s.Id == staffId && s.SchoolId == schoolId && !s.IsDeleted);

        if (staff == null)
            return NotFound(new { message = "Staff member not found." });

        UserLogin? login = null;
        if (!string.IsNullOrWhiteSpace(staff.Email))
        {
            login = await _context.UserLogins
                .FirstOrDefaultAsync(u => u.SchoolId == schoolId
                                          && u.Role.ToLower() == "staff"
                                          && u.Email.ToLower() == staff.Email.ToLower()
                                          && !u.IsDeleted);
        }

        var dto = new StaffAccountStatusDto
        {
            StaffId = staff.Id,
            StaffName = $"{staff.FirstName} {staff.LastName}".Trim(),
            EmployeeId = staff.EmployeeId,
            Designation = staff.Designation,
            Department = staff.Department,
            Email = staff.Email,
            Phone = staff.Phone,
            HasAccount = login != null,
            AccountStatus = login?.Status,
            RequirePasswordChange = login?.RequirePasswordChange ?? false,
            LastLogin = login?.LastLogin,
            UserLoginId = login?.Id
        };

        return Ok(dto);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/staff-portal/provision/{staffId}
    // Creates (or re-provisions) a staff portal login.
    // Returns the generated plain-text password once — share it securely.
    // ─────────────────────────────────────────────────────────────────────────
    [HttpPost("provision/{staffId:guid}")]
    [Authorize(Roles = "Admin,Principal")]
    public async Task<IActionResult> ProvisionStaffAccount(Guid staffId)
    {
        var schoolId = _tenant.GetEffectiveSchoolId();
        var adminId = _tenant.UserId;

        var staff = await _context.StaffMembers
            .FirstOrDefaultAsync(s => s.Id == staffId && s.SchoolId == schoolId && !s.IsDeleted);

        if (staff == null)
            return NotFound(new { message = "Staff member not found." });

        if (string.IsNullOrWhiteSpace(staff.Email))
            return BadRequest(new { message = "Staff member does not have a registered email. Please update their profile first." });

        var email = staff.Email.Trim().ToLower();

        // Check for an existing staff portal account
        var existing = await _context.UserLogins
            .FirstOrDefaultAsync(u => u.SchoolId == schoolId
                                       && u.Email.ToLower() == email
                                       && u.Role.ToLower() == "staff"
                                       && !u.IsDeleted);

        var plainPassword = GenerateReadablePassword();
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(plainPassword, workFactor: 12);
        var now = DateTime.UtcNow;
        var staffFullName = $"{staff.FirstName} {staff.LastName}".Trim();

        string action;
        if (existing != null)
        {
            existing.PasswordHash = passwordHash;
            existing.RequirePasswordChange = true;
            existing.PasswordChangedAt = now;
            existing.Status = "active";
            existing.FailedLoginAttempts = 0;
            existing.LockedUntil = null;
            existing.LinkedEntityId = staffId;
            existing.LinkedEntityType = "staff";
            existing.UpdatedAt = now;
            existing.UpdatedBy = adminId;
            action = "reprovisioned";
        }
        else
        {
            var login = new UserLogin
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                Username = email,
                Email = email,
                PasswordHash = passwordHash,
                FirstName = staff.FirstName,
                LastName = staff.LastName,
                Role = "staff",
                Status = "active",
                RequirePasswordChange = true,
                LinkedEntityId = staffId,
                LinkedEntityType = "staff",
                FailedLoginAttempts = 0,
                CreatedAt = now,
                UpdatedAt = now,
                CreatedBy = adminId
            };
            _context.UserLogins.Add(login);
            action = "provisioned";
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation("Staff account {Action} for staff {StaffId} ({Email}) by admin {AdminId}",
            action, staffId, email, adminId);

        return Ok(new ProvisionStaffAccountResponse
        {
            StaffId = staffId,
            StaffName = staffFullName,
            EmployeeId = staff.EmployeeId,
            Email = email,
            TemporaryPassword = plainPassword,
            Action = action,
            Message = $"Account {action} successfully. Share the temporary password with the staff member. They will be prompted to change it on first login.",
            RequirePasswordChange = true
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/staff-portal/reset-password/{staffId}
    // Admin resets a staff member's portal password. Returns new temp password.
    // ─────────────────────────────────────────────────────────────────────────
    [HttpPost("reset-password/{staffId:guid}")]
    [Authorize(Roles = "Admin,Principal")]
    public async Task<IActionResult> ResetStaffPassword(Guid staffId)
    {
        var schoolId = _tenant.GetEffectiveSchoolId();
        var adminId = _tenant.UserId;

        var staff = await _context.StaffMembers
            .FirstOrDefaultAsync(s => s.Id == staffId && s.SchoolId == schoolId && !s.IsDeleted);

        if (staff == null)
            return NotFound(new { message = "Staff member not found." });

        if (string.IsNullOrWhiteSpace(staff.Email))
            return BadRequest(new { message = "Staff member does not have a registered email address." });

        var email = staff.Email.Trim().ToLower();

        var login = await _context.UserLogins
            .FirstOrDefaultAsync(u => u.SchoolId == schoolId
                                       && u.Email.ToLower() == email
                                       && u.Role.ToLower() == "staff"
                                       && !u.IsDeleted);

        if (login == null)
            return NotFound(new { message = "No staff portal account found. Use the Provision endpoint first." });

        var plainPassword = GenerateReadablePassword();
        login.PasswordHash = BCrypt.Net.BCrypt.HashPassword(plainPassword, workFactor: 12);
        login.RequirePasswordChange = true;
        login.PasswordChangedAt = DateTime.UtcNow;
        login.Status = "active";
        login.FailedLoginAttempts = 0;
        login.LockedUntil = null;
        login.RefreshTokenHash = null;
        login.RefreshTokenExpiry = null;
        login.UpdatedAt = DateTime.UtcNow;
        login.UpdatedBy = adminId;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Staff password reset for staff {StaffId} by admin {AdminId}", staffId, adminId);

        var staffFullName = $"{staff.FirstName} {staff.LastName}".Trim();
        return Ok(new ProvisionStaffAccountResponse
        {
            StaffId = staffId,
            StaffName = staffFullName,
            EmployeeId = staff.EmployeeId,
            Email = email,
            TemporaryPassword = plainPassword,
            Action = "reset",
            Message = "Password reset successfully. Share the new temporary password with the staff member.",
            RequirePasswordChange = true
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────
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

        return sb.ToString();
    }
}

// ── DTOs ──────────────────────────────────────────────────────────────────

public class StaffAccountStatusDto
{
    public Guid StaffId { get; set; }
    public string StaffName { get; set; } = string.Empty;
    public string EmployeeId { get; set; } = string.Empty;
    public string Designation { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public bool HasAccount { get; set; }
    public string? AccountStatus { get; set; }
    public bool RequirePasswordChange { get; set; }
    public DateTime? LastLogin { get; set; }
    public Guid? UserLoginId { get; set; }
}

public class ProvisionStaffAccountResponse
{
    public Guid StaffId { get; set; }
    public string StaffName { get; set; } = string.Empty;
    public string EmployeeId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    /// <summary>Plain-text temporary password — returned once, never stored.</summary>
    public string TemporaryPassword { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;  // "provisioned" | "reprovisioned" | "reset"
    public string Message { get; set; } = string.Empty;
    public bool RequirePasswordChange { get; set; }
}
