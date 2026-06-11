using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.Entities;

namespace SmsApi.Services.WhatsApp;

public interface IWhatsAppWebhookProcessor
{
    bool VerifySignature(string payload, string signature, string appSecret);
    Task ProcessWebhookAsync(Guid schoolId, MetaWebhookPayload payload, string rawPayload, CancellationToken ct = default);
    Task ProcessTemplateStatusUpdateAsync(string templateId, string status, string? rejectedReason, CancellationToken ct = default);
}

public class WhatsAppWebhookProcessor : IWhatsAppWebhookProcessor
{
    private readonly AppDbContext _db;
    private readonly ILogger<WhatsAppWebhookProcessor> _logger;

    public WhatsAppWebhookProcessor(AppDbContext db, ILogger<WhatsAppWebhookProcessor> logger)
    {
        _db = db;
        _logger = logger;
    }

    public bool VerifySignature(string payload, string signature, string appSecret)
    {
        if (string.IsNullOrEmpty(signature)) return false;

        // Meta sends: sha256=<hex-signature>
        const string prefix = "sha256=";
        if (!signature.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            return false;

        var expectedSig = signature[prefix.Length..];

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(appSecret));
        var computedBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        var computed = Convert.ToHexString(computedBytes).ToLowerInvariant();

        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(computed),
            Encoding.UTF8.GetBytes(expectedSig.ToLowerInvariant()));
    }

    public async Task ProcessWebhookAsync(
        Guid schoolId, MetaWebhookPayload payload, string rawPayload, CancellationToken ct = default)
    {
        // Store raw webhook event for audit
        var webhookEvent = new WhatsappWebhookEvent
        {
            Id = Guid.NewGuid(),
            SchoolId = schoolId,
            EventType = "message_status",
            Payload = rawPayload,
            Processed = false,
            ReceivedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _db.WhatsappWebhookEvents.Add(webhookEvent);

        try
        {
            foreach (var entry in payload.Entry ?? [])
            {
                foreach (var change in entry.Changes ?? [])
                {
                    if (change.Field != "messages") continue;

                    var value = change.Value;
                    if (value == null) continue;

                    // Process delivery status updates
                    foreach (var status in value.Statuses ?? [])
                    {
                        await ProcessStatusUpdateAsync(schoolId, status, ct);
                    }

                    // Process incoming messages (opt-out handling)
                    foreach (var message in value.Messages ?? [])
                    {
                        await ProcessIncomingMessageAsync(schoolId, message, ct);
                    }

                    // Template status changes
                    foreach (var templateStatus in value.MessageTemplateStatusChange ?? [])
                    {
                        if (templateStatus.MessageTemplateName != null)
                            await ProcessTemplateStatusUpdateAsync(
                                templateStatus.MessageTemplateName,
                                templateStatus.Event ?? "",
                                templateStatus.Reason,
                                ct);
                    }
                }
            }

            webhookEvent.Processed = true;
            webhookEvent.ProcessedAt = DateTime.UtcNow;
        }
        catch (Exception ex)
        {
            webhookEvent.Error = ex.Message;
            _logger.LogError(ex, "Error processing WhatsApp webhook for school {SchoolId}", schoolId);
        }

        await _db.SaveChangesAsync(ct);
    }

    public async Task ProcessTemplateStatusUpdateAsync(
        string templateId, string status, string? rejectedReason, CancellationToken ct = default)
    {
        // Template status comes with the Meta template ID
        var template = await _db.WhatsappTemplates
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.MetaTemplateId == templateId || t.MetaTemplateName == templateId, ct);

        if (template == null)
        {
            _logger.LogWarning("Template status update for unknown template: {TemplateId} status={Status}", templateId, status);
            return;
        }

        var newStatus = status.ToUpperInvariant() switch
        {
            "APPROVED" => "Approved",
            "REJECTED" => "Rejected",
            "PAUSED" => "Paused",
            "DISABLED" => "Disabled",
            "PENDING_DELETION" => "Disabled",
            _ => template.Status
        };

        template.Status = newStatus;
        template.UpdatedAt = DateTime.UtcNow;

        if (newStatus == "Approved")
            template.ApprovedAt = DateTime.UtcNow;
        else if (newStatus == "Rejected")
            template.RejectionReason = rejectedReason ?? "Rejected by Meta";

        _logger.LogInformation("Template {TemplateId} status updated to {Status}", templateId, newStatus);
    }

    private async Task ProcessStatusUpdateAsync(
        Guid schoolId, MetaWebhookStatus status, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(status.Id)) return;

        var log = await _db.WhatsappMessageLogs
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(l =>
                l.SchoolId == schoolId &&
                (l.MetaMessageId == status.Id || l.WaMessageId == status.Id), ct);

        if (log == null)
        {
            _logger.LogDebug("WhatsApp status update for unknown message: {MessageId}", status.Id);
            return;
        }

        var now = ParseTimestamp(status.Timestamp);

        var newStatus = status.Status?.ToLowerInvariant() switch
        {
            "sent" => "Sent",
            "delivered" => "Delivered",
            "read" => "Read",
            "failed" => "Failed",
            _ => log.Status
        };

        log.Status = newStatus;
        log.UpdatedAt = DateTime.UtcNow;

        switch (newStatus)
        {
            case "Sent":
                log.SentAt ??= now;
                break;
            case "Delivered":
                log.DeliveredAt = now;
                break;
            case "Read":
                log.ReadAt = now;
                break;
            case "Failed":
                log.FailedAt = now;
                if (status.Errors != null)
                    log.ErrorMessage = $"Code {status.Errors.Code}: {status.Errors.Title}";
                break;
        }

        // Track conversation window for billing
        if (status.Conversation != null && !string.IsNullOrEmpty(status.Conversation.Id))
        {
            log.ConversationId = status.Conversation.Id;
            log.ConversationCategory = status.Conversation.Origin?.Type ?? "utility";
            log.ConversationBillable = status.Pricing?.BillableStatus?.ToLowerInvariant() == "billable";

            await UpdateConversationWindowAsync(schoolId, log.RecipientPhone,
                status.Conversation.Id,
                status.Conversation.Origin?.Type ?? "utility",
                status.Pricing?.BillableStatus?.ToLowerInvariant() == "billable",
                ct);
        }

        _logger.LogDebug("Message {MessageId} status → {Status}", status.Id, newStatus);
    }

    private async Task ProcessIncomingMessageAsync(
        Guid schoolId, MetaWebhookMessage message, CancellationToken ct)
    {
        var body = message.Text?.Body?.ToUpperInvariant().Trim();

        // Handle STOP (opt-out)
        if (body is "STOP" or "UNSUBSCRIBE" or "CANCEL")
        {
            var contact = await _db.WhatsappContacts
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(c =>
                    c.SchoolId == schoolId &&
                    c.Phone.Contains(message.From ?? ""), ct);

            if (contact != null)
            {
                contact.IsOptedOut = true;
                contact.OptOutAt = DateTime.UtcNow;
                contact.UpdatedAt = DateTime.UtcNow;

                _db.WhatsappOptInEvents.Add(new WhatsappOptInEvent
                {
                    Id = Guid.NewGuid(),
                    ContactId = contact.Id,
                    SchoolId = schoolId,
                    EventType = "OptOut",
                    Source = "IncomingMsg",
                    Notes = "Received STOP via WhatsApp",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });

                _logger.LogInformation(
                    "Contact {Phone} opted out from WhatsApp (school {SchoolId})",
                    message.From, schoolId);
            }
        }
        // Handle START (re-opt-in)
        else if (body is "START" or "YES" or "SUBSCRIBE")
        {
            var contact = await _db.WhatsappContacts
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(c =>
                    c.SchoolId == schoolId &&
                    c.Phone.Contains(message.From ?? ""), ct);

            if (contact != null && contact.IsOptedOut)
            {
                contact.IsOptedOut = false;
                contact.IsOptedIn = true;
                contact.OptInAt = DateTime.UtcNow;
                contact.UpdatedAt = DateTime.UtcNow;

                _db.WhatsappOptInEvents.Add(new WhatsappOptInEvent
                {
                    Id = Guid.NewGuid(),
                    ContactId = contact.Id,
                    SchoolId = schoolId,
                    EventType = "OptIn",
                    Source = "IncomingMsg",
                    Notes = "Received START via WhatsApp",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }
        }
    }

    private async Task UpdateConversationWindowAsync(
        Guid schoolId, string phone, string conversationId,
        string category, bool isBillable, CancellationToken ct)
    {
        var existing = await _db.WhatsappConversations
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(c =>
                c.SchoolId == schoolId &&
                c.WaConversationId == conversationId, ct);

        if (existing != null)
        {
            existing.MessageCount++;
            existing.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            var now = DateTime.UtcNow;
            _db.WhatsappConversations.Add(new WhatsappConversation
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                ContactPhone = phone,
                WaConversationId = conversationId,
                Category = MapCategory(category),
                WindowStart = now,
                WindowEnd = now.AddHours(24),
                MessageCount = 1,
                IsBillable = isBillable,
                CreatedAt = now,
                UpdatedAt = now
            });
        }
    }

    private static string MapCategory(string category) => category.ToLowerInvariant() switch
    {
        "utility" => "Utility",
        "authentication" => "Authentication",
        "marketing" => "Marketing",
        "service" => "Service",
        "business_initiated" => "Utility",
        "user_initiated" => "Service",
        _ => "Utility"
    };

    private static DateTime ParseTimestamp(string? timestamp)
    {
        if (timestamp != null && long.TryParse(timestamp, out var unix))
            return DateTimeOffset.FromUnixTimeSeconds(unix).UtcDateTime;
        return DateTime.UtcNow;
    }
}
