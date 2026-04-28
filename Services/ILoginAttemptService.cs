namespace SmsApi.Services;

/// <summary>
/// Tracks login attempts and manages distributed account lockouts via Redis.
/// Decoupled from the database so brute-force storms don't bottleneck DB connections.
/// </summary>
public interface ILoginAttemptService
{
    /// <summary>Records a failed login attempt for a user+IP pair. Returns total failed attempts.</summary>
    Task<int> RecordFailedAttemptAsync(string username, string ipAddress);

    /// <summary>Clears login attempts after a successful authentication.</summary>
    Task ClearAttemptsAsync(string username, string ipAddress);

    /// <summary>Returns (isLocked, remainingLockoutTime) for the user+IP pair.</summary>
    Task<(bool isLocked, TimeSpan? remainingTime)> IsAccountLockedAsync(string username, string ipAddress);

    /// <summary>Returns how many attempts remain before lockout.</summary>
    Task<int> GetRemainingAttemptsAsync(string username, string ipAddress);
}
