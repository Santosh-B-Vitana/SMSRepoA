namespace SmsApi.Models;

public class LoginResponse
{
    public string Token { get; set; } = string.Empty;
    public string? RefreshToken { get; set; }
    public DateTime Expiration { get; set; }
    public UserInfo? User { get; set; }
}

public class UserInfo
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    /// <summary>
    /// The actual staff designation from the Staff table (e.g. "Principal", "Mathematics Teacher").
    /// Null for admin/super-admin users who have no Staff record.
    /// </summary>
    public string? Designation { get; set; }
    public Guid SchoolId { get; set; }
    /// <summary>
    /// When true, the client must redirect the user to the change-password screen before continuing.
    /// </summary>
    public bool RequirePasswordChange { get; set; } = false;
    /// <summary>
    /// For staff accounts: the StaffMember.Id linked to this login.
    /// Null for admin/super-admin users who have no Staff record.
    /// </summary>
    public Guid? LinkedEntityId { get; set; }
}

public class RefreshTokenRequest
{
    public string AccessToken { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
}

public class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    /// <summary>Staff designation from the Staff table (e.g. "Principal").</summary>
    public string? Designation { get; set; }
    /// <summary>Linked entity ID (e.g. Staff.Id for staff/teacher logins).</summary>
    public Guid? LinkedEntityId { get; set; }
}

// ── 2FA request models ────────────────────────────────────────────────────

public class TwoFactorLoginRequest
{
    public string ChallengeToken { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
}

public class TwoFactorConfirmRequest
{
    public string Code { get; set; } = string.Empty;
}

public class DisableTwoFactorRequest
{
    public string Password { get; set; } = string.Empty;
}

