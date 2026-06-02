using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SmsApi.Data;
using SmsApi.Messaging;
using SmsApi.Models.Entities;
using SmsApi.Services;

namespace SmsApi.Services.Messaging;

public sealed class NotificationLogService : BaseService, INotificationLogService
{
    public NotificationLogService(AppDbContext context, ILogger<NotificationLogService> logger)
        : base(context, logger) { }

    public async Task LogAsync(
        ChannelMessageRequest request,
        ChannelMessageResult result,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _context.AuditLogs.Add(BuildEntry(request, result));
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            LogOperationError(nameof(LogAsync), ex,
                new { request.Destination, channel = result.Channel.ToString() });
        }
    }

    public async Task LogBatchAsync(
        ChannelMessageRequest request,
        IReadOnlyList<ChannelMessageResult> results,
        CancellationToken cancellationToken = default)
    {
        try
        {
            foreach (var result in results)
                _context.AuditLogs.Add(BuildEntry(request, result));

            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            LogOperationError(nameof(LogBatchAsync), ex, new { request.Destination });
        }
    }

    private static AuditLog BuildEntry(ChannelMessageRequest request, ChannelMessageResult result)
    {
        var requestBody = JsonSerializer.Serialize(new
        {
            destination = request.Destination,
            campaign = request.TemplateOrCampaignIdentifier,
            recipientName = request.RecipientName,
            templateParams = request.TemplateParameters,
            messageId = result.MessageId
        });

        Guid? schoolId = null;
        if (request.CustomAttributes.TryGetValue("schoolId", out var schoolIdStr)
            && Guid.TryParse(schoolIdStr, out var parsedSchoolId))
            schoolId = parsedSchoolId;

        Guid? userId = null;
        if (request.CustomAttributes.TryGetValue("userId", out var userIdStr)
            && Guid.TryParse(userIdStr, out var parsedUserId))
            userId = parsedUserId;

        return new AuditLog
        {
            HttpMethod = "POST",
            Path = "outbound-messaging",
            QueryString = request.Destination,
            ActionType = result.IsSuccess ? "ChannelMessage_Sent" : "ChannelMessage_Failed",
            EntityType = result.Channel.ToString(),
            StatusCode = (int)result.StatusCode,
            RequestBody = requestBody,
            ExceptionMessage = result.ErrorMessage,
            SchoolId = schoolId,
            UserId = userId,
            Timestamp = DateTime.UtcNow,
            DurationMs = 0
        };
    }

    public async Task<IReadOnlyList<AuditLog>> GetLogsAsync(
        string? channelType = null,
        string? destination = null,
        DateTime? from = null,
        DateTime? to = null,
        CancellationToken cancellationToken = default)
    {
        var query = _context.AuditLogs
            .Where(l => l.ActionType == "ChannelMessage_Sent"
                     || l.ActionType == "ChannelMessage_Failed");

        if (!string.IsNullOrWhiteSpace(channelType))
            query = query.Where(l => l.EntityType == channelType);

        if (!string.IsNullOrWhiteSpace(destination))
            query = query.Where(l => l.QueryString == destination);

        if (from.HasValue)
            query = query.Where(l => l.Timestamp >= from.Value);

        if (to.HasValue)
            query = query.Where(l => l.Timestamp <= to.Value);

        return await query
            .OrderByDescending(l => l.Timestamp)
            .ToListAsync(cancellationToken);
    }
}
