using System.Text.Json;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using SmsApi.Data;
using SmsApi.Models.Entities;
using SmsApi.Services.WhatsApp;

namespace SmsApi.BackgroundJobs;

/// <summary>
/// Processes the WhatsApp message queue: dequeues pending messages from DB,
/// resolves credentials, sends via Meta Cloud API, and logs results.
/// Runs every 30 seconds via Hangfire recurring job.
/// </summary>
[DisableConcurrentExecution(timeoutInSeconds: 60)]
public class WhatsAppMessageProcessorJob
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<WhatsAppMessageProcessorJob> _logger;
    private const int BatchSize = 50;

    public WhatsAppMessageProcessorJob(
        IServiceScopeFactory scopeFactory,
        ILogger<WhatsAppMessageProcessorJob> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public async Task ProcessBatchAsync(CancellationToken ct = default)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var crm = scope.ServiceProvider.GetRequiredService<CrmDbContext>();
        var metaClient = scope.ServiceProvider.GetRequiredService<IMetaCloudApiClient>();
        var templateService = scope.ServiceProvider.GetRequiredService<IWhatsAppTemplateService>();
        var quotaService = scope.ServiceProvider.GetRequiredService<IWhatsAppQuotaService>();
        var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();

        // Get pending messages, ordered by priority (1=critical first) then creation time
        var pending = await db.WhatsappMessageQueues
            .IgnoreQueryFilters()
            .Where(q => q.Status == "Pending" &&
                        q.ScheduledAt <= DateTime.UtcNow &&
                        !q.IsDeleted)
            .OrderBy(q => q.Priority)
            .ThenBy(q => q.CreatedAt)
            .Take(BatchSize)
            .ToListAsync(ct);

        if (pending.Count == 0) return;

        _logger.LogInformation("WhatsApp processor: processing {Count} messages", pending.Count);

        foreach (var queueItem in pending)
        {
            try
            {
                await ProcessSingleMessageAsync(queueItem, db, crm, metaClient, templateService, quotaService, config, ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to process WhatsApp queue item {QueueId}", queueItem.Id);
                queueItem.Status = "Failed";
                queueItem.LastError = ex.Message;
                queueItem.AttemptCount++;
                queueItem.UpdatedAt = DateTime.UtcNow;
            }
        }

        await db.SaveChangesAsync(ct);
    }

    private async Task ProcessSingleMessageAsync(
        WhatsappMessageQueue queueItem,
        AppDbContext db,
        CrmDbContext crm,
        IMetaCloudApiClient metaClient,
        IWhatsAppTemplateService templateService,
        IWhatsAppQuotaService quotaService,
        IConfiguration config,
        CancellationToken ct)
    {
        queueItem.Status = "Processing";
        queueItem.AttemptCount++;
        queueItem.UpdatedAt = DateTime.UtcNow;

        // Load template
        WhatsappTemplate? template = null;
        if (queueItem.TemplateId.HasValue)
        {
            template = await db.WhatsappTemplates
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(t => t.Id == queueItem.TemplateId.Value, ct);
        }

        if (template == null || template.Status != "Approved")
        {
            queueItem.Status = "Skipped";
            queueItem.LastError = "Template not found or not approved";

            CreateFailureLog(db, queueItem, "Skipped", "Template not found or not approved");
            return;
        }

        // Parse placeholders
        Dictionary<string, string> placeholders = new();
        if (!string.IsNullOrEmpty(queueItem.PlaceholdersJson))
        {
            try { placeholders = JsonSerializer.Deserialize<Dictionary<string, string>>(queueItem.PlaceholdersJson) ?? new(); }
            catch { /* use empty */ }
        }

        // Resolve credentials
        var (phoneNumberId, accessToken) = await ResolveCredentialsAsync(
            queueItem.SchoolId, db, crm, config, ct);

        if (phoneNumberId == null || accessToken == null)
        {
            queueItem.Status = "Failed";
            queueItem.LastError = "WhatsApp credentials not configured";
            CreateFailureLog(db, queueItem, "Failed", "WhatsApp credentials not configured");
            return;
        }

        // Build request
        var components = templateService.BuildTemplateComponents(template, placeholders);
        var request = new MetaSendMessageRequest(
            MessagingProduct: "whatsapp",
            To: queueItem.RecipientPhone,
            Type: "template",
            Template: new MetaTemplatePayload(
                Name: template.MetaTemplateName ?? template.Name,
                Language: new MetaLanguage(template.Language),
                Components: components
            )
        );

        // Send
        var response = await metaClient.SendTemplateMessageAsync(
            phoneNumberId, accessToken, request, ct);

        if (response.Error != null)
        {
            var isRetryable = response.Error.Code is 500 or 503 or 429;

            if (isRetryable && queueItem.AttemptCount < 3)
            {
                queueItem.Status = "Pending"; // will be retried
                queueItem.ScheduledAt = DateTime.UtcNow.AddSeconds(Math.Pow(5, queueItem.AttemptCount) * 60);
            }
            else
            {
                queueItem.Status = "Failed";
                queueItem.LastError = response.Error.Message;
                CreateFailureLog(db, queueItem, "Failed", response.Error.Message);

                // Move to retry queue if not exhausted
                if (queueItem.AttemptCount < 3)
                    CreateRetryQueueEntry(db, queueItem);
            }

            return;
        }

        var waMessageId = response.Messages?.FirstOrDefault()?.Id;
        queueItem.Status = "Sent";
        queueItem.ProcessedAt = DateTime.UtcNow;
        queueItem.UpdatedAt = DateTime.UtcNow;

        // Write to message log
        var log = new WhatsappMessageLog
        {
            Id = Guid.NewGuid(),
            SchoolId = queueItem.SchoolId,
            QueueId = queueItem.Id,
            RecipientPhone = queueItem.RecipientPhone,
            RecipientName = queueItem.RecipientName,
            TemplateId = queueItem.TemplateId,
            TemplateName = template.Name,
            PlaceholdersJson = queueItem.PlaceholdersJson,
            MetaMessageId = waMessageId,
            WaMessageId = waMessageId,
            EventKey = queueItem.EventKey,
            EntityId = queueItem.EntityId,
            EntityType = queueItem.EntityType,
            Status = "Sent",
            QueuedAt = queueItem.CreatedAt,
            SentAt = DateTime.UtcNow,
            ConversationBillable = true,
            ProviderResponseJson = JsonSerializer.Serialize(response),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        db.WhatsappMessageLogs.Add(log);

        // Increment usage counter
        await quotaService.IncrementUsageAsync(queueItem.SchoolId, ct);

        _logger.LogInformation(
            "WhatsApp sent: school={SchoolId} event={EventKey} to={Phone} waMid={WaMid}",
            queueItem.SchoolId, queueItem.EventKey, queueItem.RecipientPhone, waMessageId);
    }

    private static void CreateFailureLog(AppDbContext db, WhatsappMessageQueue queueItem, string status, string error)
    {
        db.WhatsappMessageLogs.Add(new WhatsappMessageLog
        {
            Id = Guid.NewGuid(),
            SchoolId = queueItem.SchoolId,
            QueueId = queueItem.Id,
            RecipientPhone = queueItem.RecipientPhone,
            RecipientName = queueItem.RecipientName,
            TemplateId = queueItem.TemplateId,
            EventKey = queueItem.EventKey,
            EntityId = queueItem.EntityId,
            EntityType = queueItem.EntityType,
            Status = status,
            QueuedAt = queueItem.CreatedAt,
            FailedAt = DateTime.UtcNow,
            ErrorMessage = error,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
    }

    private static void CreateRetryQueueEntry(AppDbContext db, WhatsappMessageQueue queueItem)
    {
        db.WhatsappRetryQueues.Add(new WhatsappRetryQueue
        {
            Id = Guid.NewGuid(),
            SchoolId = queueItem.SchoolId,
            MessageLogId = queueItem.Id,
            RecipientPhone = queueItem.RecipientPhone,
            TemplateId = queueItem.TemplateId,
            PlaceholdersJson = queueItem.PlaceholdersJson,
            AttemptCount = queueItem.AttemptCount,
            MaxAttempts = 3,
            NextRetryAt = DateTime.UtcNow.AddMinutes(15 * queueItem.AttemptCount),
            LastError = queueItem.LastError,
            Status = "Pending",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
    }

    private static async Task<(string? phoneNumberId, string? accessToken)> ResolveCredentialsAsync(
        Guid schoolId, AppDbContext db, CrmDbContext crm, IConfiguration config, CancellationToken ct)
    {
        var settings = await db.WhatsappSettings
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.SchoolId == schoolId, ct);

        if (settings?.CrmAccountId != null)
        {
            var account = await crm.SchoolWhatsappAccounts
                .FirstOrDefaultAsync(a => a.Id == settings.CrmAccountId && a.IsActive, ct);
            if (account?.Mode == "B" && account.PhoneNumberId != null && account.AccessTokenEncrypted != null)
                return (account.PhoneNumberId, account.AccessTokenEncrypted);
        }

        return (config["WhatsApp:SharedPhoneNumberId"], config["WhatsApp:SharedAccessToken"]);
    }
}
