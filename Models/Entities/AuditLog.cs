using System.ComponentModel.DataAnnotations;

namespace SmsApi.Models.Entities;

/// <summary>
/// Audit log entry for tracking API mutations and user actions.
/// Immutable record — does NOT extend BaseEntity (no soft-delete needed for audit logs).
/// </summary>
public class AuditLog
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    public Guid? UserId { get; set; }

    public Guid? SchoolId { get; set; }

    [MaxLength(255)]
    public string? Username { get; set; }

    [Required]
    [MaxLength(10)]
    public string HttpMethod { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    public string Path { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? QueryString { get; set; }

    public int StatusCode { get; set; }

    public long DurationMs { get; set; }

    [MaxLength(45)]
    public string? IpAddress { get; set; }

    [MaxLength(500)]
    public string? UserAgent { get; set; }

    /// <summary>
    /// Request body (sensitive fields redacted)
    /// </summary>
    public string? RequestBody { get; set; }

    public string? ExceptionMessage { get; set; }

    /// <summary>
    /// Action category: POST_students, DELETE_fees, etc.
    /// </summary>
    [MaxLength(100)]
    public string? ActionType { get; set; }

    /// <summary>
    /// Entity ID being operated on (extracted from URL path)
    /// </summary>
    public Guid? EntityId { get; set; }

    /// <summary>
    /// Entity type: Student, Staff, FeeRecord, etc.
    /// </summary>
    [MaxLength(100)]
    public string? EntityType { get; set; }
}
