using SmsApi.Messaging;
using SmsApi.Models.Entities;

namespace SmsApi.Services.Messaging;

public interface INotificationLogService
{
    /// <summary>
    /// Persists a channel delivery event to the AuditLogs table.
    /// Exceptions are caught internally — a log failure never surfaces to the caller.
    /// </summary>
    Task LogAsync(ChannelMessageRequest request, ChannelMessageResult result,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Persists all channel results from a single dispatch in one DB round-trip.
    /// Safe to call from Task.WhenAll alternatives — uses a single DbContext.SaveChangesAsync.
    /// Exceptions are caught internally — a log failure never surfaces to the caller.
    /// </summary>
    Task LogBatchAsync(ChannelMessageRequest request, IReadOnlyList<ChannelMessageResult> results,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves channel message audit records from AuditLogs filtered by channel and/or date.
    /// </summary>
    Task<IReadOnlyList<AuditLog>> GetLogsAsync(
        string? channelType = null,
        string? destination = null,
        DateTime? from = null,
        DateTime? to = null,
        CancellationToken cancellationToken = default);
}
