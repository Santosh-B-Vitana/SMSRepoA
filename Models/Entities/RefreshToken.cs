using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities;

/// <summary>
/// Refresh token entity for JWT token rotation.
/// Extends BaseEntity for standard audit fields and soft-delete.
/// </summary>
public class RefreshToken : BaseEntity
{
    [Required]
    public Guid UserLoginId { get; set; }

    [Required]
    [StringLength(500)]
    public string Token { get; set; } = string.Empty;

    [Required]
    public DateTime ExpiresAt { get; set; }

    public bool IsRevoked { get; set; }

    public DateTime? RevokedAt { get; set; }

    [StringLength(50)]
    public string? CreatedByIp { get; set; }

    public string? UserAgent { get; set; }

    [ForeignKey("UserLoginId")]
    public virtual UserLogin? UserLogin { get; set; }

    public bool IsExpired => DateTime.UtcNow > ExpiresAt;

    public bool IsActive => !IsRevoked && !IsExpired;
}
