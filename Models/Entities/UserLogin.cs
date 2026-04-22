using System;
using System.ComponentModel.DataAnnotations;

namespace SmsApi.Models.Entities
{
    /// <summary>
    /// User login credentials and access management entity
    /// Stores username, hashed password, role, and account status
    /// </summary>
    public class UserLogin : BaseEntity
    {
        [Required]
        [StringLength(100)]
        public string Username { get; set; } = string.Empty;

        [Required]
        [StringLength(255)]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        /// <summary>
        /// Hashed password (bcrypt or similar)
        /// NEVER store plain text passwords
        /// </summary>
        [Required]
        [StringLength(500)]
        public string PasswordHash { get; set; } = string.Empty;

        [StringLength(100)]
        public string FirstName { get; set; } = string.Empty;

        [StringLength(100)]
        public string LastName { get; set; } = string.Empty;

        /// <summary>
        /// User role: admin, principal, teacher, staff, parent, student
        /// </summary>
        [Required]
        [StringLength(50)]
        public string Role { get; set; } = string.Empty;

        /// <summary>
        /// Account status: active, inactive, locked, suspended
        /// </summary>
        [Required]
        [StringLength(50)]
        public string Status { get; set; } = "active";

        /// <summary>
        /// School ID this user belongs to
        /// </summary>
        public Guid SchoolId { get; set; }

        /// <summary>
        /// Last successful login timestamp
        /// </summary>
        public DateTime? LastLogin { get; set; }

        /// <summary>
        /// Number of failed login attempts
        /// Used for account lockout security
        /// </summary>
        public int FailedLoginAttempts { get; set; } = 0;

        /// <summary>
        /// Timestamp when account was locked due to failed attempts
        /// </summary>
        public DateTime? LockedUntil { get; set; }

        /// <summary>
        /// Track password changes for security
        /// </summary>
        public DateTime? PasswordChangedAt { get; set; }

        /// <summary>
        /// Hashed refresh token for session management
        /// </summary>
        public string? RefreshTokenHash { get; set; }

        /// <summary>
        /// Refresh token expiry
        /// </summary>
        public DateTime? RefreshTokenExpiry { get; set; }

        // ── Two-Factor Authentication (TOTP) ─────────────────────────────────

        /// <summary>
        /// Whether TOTP two-factor authentication is enabled for this account.
        /// </summary>
        public bool TwoFactorEnabled { get; set; } = false;

        /// <summary>
        /// Base32-encoded TOTP secret (stored server-side, shown once on setup).
        /// </summary>
        [System.ComponentModel.DataAnnotations.MaxLength(256)]
        public string? TwoFactorSecret { get; set; }

        /// <summary>
        /// Short-lived hashed token issued after password verification, before 2FA code entry.
        /// </summary>
        public string? TwoFactorChallengeToken { get; set; }

        /// <summary>
        /// Expiry of the 2FA challenge token (typically 5 minutes).
        /// </summary>
        public DateTime? TwoFactorChallengeExpiry { get; set; }

        /// <summary>
        /// Mark for soft delete
        /// </summary>
        public bool IsDeleted { get; set; } = false;

        /// <summary>
        /// Foreign key to School
        /// </summary>
        public virtual School? School { get; set; }
    }
}
