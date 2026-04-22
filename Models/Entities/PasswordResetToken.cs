using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities;

/// <summary>
/// Self-service password reset token.
/// Standalone entity — does not extend BaseEntity (short-lived, no soft-delete).
/// </summary>
public class PasswordResetToken
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid UserLoginId { get; set; }

    [Required]
    [MaxLength(500)]
    public string Token { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime ExpiresAt { get; set; }

    public bool IsUsed { get; set; }

    public DateTime? UsedAt { get; set; }

    [MaxLength(45)]
    public string? RequestIp { get; set; }

    [MaxLength(45)]
    public string? UsedIp { get; set; }

    [ForeignKey("UserLoginId")]
    public virtual UserLogin? UserLogin { get; set; }
}
