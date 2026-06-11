using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using SmsApi.Data;
using SmsApi.Models.CRM;
using SmsApi.Models.Entities;

namespace SmsApi.Services.WhatsApp;

public interface IWhatsAppService
{
    /// <summary>Queue a WhatsApp message for a specific event + entity.</summary>
    Task<bool> QueueMessageAsync(
        Guid schoolId,
        string eventKey,
        Guid entityId,
        string entityType,
        string recipientPhone,
        string recipientName,
        string recipientType,
        Dictionary<string, string> placeholders,
        int priority = 2,
        CancellationToken ct = default);

    /// <summary>Send a test message immediately (bypasses quota — deducted from quota though).</summary>
    Task<WhatsAppSendResult> SendTestMessageAsync(
        Guid schoolId,
        string templateName,
        string recipientPhone,
        Dictionary<string, string> placeholders,
        CancellationToken ct = default);

    Task<WhatsAppUsageSummary> GetUsageSummaryAsync(Guid schoolId, CancellationToken ct = default);
    Task<List<WhatsAppMessageLogDto>> GetMessageHistoryAsync(
        Guid schoolId, int page, int pageSize, string? status, DateTime? from, DateTime? to,
        CancellationToken ct = default);
}

public record WhatsAppSendResult(bool Success, string? MessageId, string? Error);
public record WhatsAppUsageSummary(
    int Quota, int Used, int Remaining, int CarryForward,
    string Plan, string OveragePolicy, decimal UsedPct,
    int SentToday, int DeliveredToday, int FailedToday);

public record WhatsAppMessageLogDto(
    Guid Id, string RecipientPhone, string? RecipientName, string? TemplateName,
    string Status, string? EventKey, DateTime CreatedAt, DateTime? DeliveredAt, DateTime? ReadAt,
    string? ErrorMessage);

public class WhatsAppService : IWhatsAppService
{
    private readonly AppDbContext _db;
    private readonly CrmDbContext _crm;
    private readonly IWhatsAppEligibilityChecker _eligibility;
    private readonly IWhatsAppQuotaService _quota;
    private readonly IMetaCloudApiClient _metaClient;
    private readonly IWhatsAppTemplateService _templateService;
    private readonly IDistributedCache _cache;
    private readonly ILogger<WhatsAppService> _logger;
    private readonly IConfiguration _config;

    public WhatsAppService(
        AppDbContext db,
        CrmDbContext crm,
        IWhatsAppEligibilityChecker eligibility,
        IWhatsAppQuotaService quota,
        IMetaCloudApiClient metaClient,
        IWhatsAppTemplateService templateService,
        IDistributedCache cache,
        ILogger<WhatsAppService> logger,
        IConfiguration config)
    {
        _db = db;
        _crm = crm;
        _eligibility = eligibility;
        _quota = quota;
        _metaClient = metaClient;
        _templateService = templateService;
        _cache = cache;
        _logger = logger;
        _config = config;
    }

    public async Task<bool> QueueMessageAsync(
        Guid schoolId, string eventKey, Guid entityId, string entityType,
        string recipientPhone, string recipientName, string recipientType,
        Dictionary<string, string> placeholders, int priority = 2, CancellationToken ct = default)
    {
        // Deduplication: prevent same event+entity from being queued twice within 1 hour
        var dedupKey = $"wa:dedup:{schoolId}:{eventKey}:{entityId}";
        var existing = await _cache.GetStringAsync(dedupKey, ct);
        if (existing != null)
        {
            _logger.LogDebug("WhatsApp dedup: skipping {EventKey} for {EntityId} (already queued)", eventKey, entityId);
            return false;
        }

        // Check subscription eligibility
        var eligibility = await _eligibility.CheckAsync(schoolId, ct);
        if (!eligibility.IsEligible)
        {
            _logger.LogDebug("WhatsApp ineligible for school {SchoolId}: {Reason}", schoolId, eligibility.Reason);
            return false;
        }

        // Find template mapping for event
        var mapping = await _db.WhatsappTemplateMappings
            .Include(m => m.Template)
            .FirstOrDefaultAsync(m =>
                m.SchoolId == schoolId &&
                m.EventKey == eventKey &&
                m.IsEnabled, ct);

        if (mapping?.Template == null || mapping.Template.Status != "Approved")
        {
            _logger.LogDebug("No approved template mapping for event {EventKey}, school {SchoolId}", eventKey, schoolId);
            return false;
        }

        var queueItem = new WhatsappMessageQueue
        {
            Id = Guid.NewGuid(),
            SchoolId = schoolId,
            RecipientPhone = recipientPhone,
            RecipientName = recipientName,
            RecipientType = recipientType,
            TemplateId = mapping.TemplateId,
            PlaceholdersJson = JsonSerializer.Serialize(placeholders),
            EventKey = eventKey,
            EntityId = entityId,
            EntityType = entityType,
            Priority = priority,
            Status = "Pending",
            ScheduledAt = DateTime.UtcNow,
            AttemptCount = 0,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.WhatsappMessageQueues.Add(queueItem);
        await _db.SaveChangesAsync(ct);

        // Also push to Redis for faster processing
        var redisKey = $"wa:queue:{schoolId}:p{priority}";
        await _cache.SetStringAsync(
            $"{redisKey}:{queueItem.Id}",
            JsonSerializer.Serialize(new { queueItem.Id, queueItem.SchoolId }),
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(4) },
            ct);

        // Set dedup key (1 hour TTL)
        await _cache.SetStringAsync(
            dedupKey, "1",
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1) },
            ct);

        return true;
    }

    public async Task<WhatsAppSendResult> SendTestMessageAsync(
        Guid schoolId, string templateName, string recipientPhone,
        Dictionary<string, string> placeholders, CancellationToken ct = default)
    {
        var eligibility = await _eligibility.CheckAsync(schoolId, ct);
        if (!eligibility.IsEligible)
            return new WhatsAppSendResult(false, null, eligibility.Reason);

        var template = await _db.WhatsappTemplates
            .FirstOrDefaultAsync(t =>
                t.SchoolId == schoolId &&
                t.Name == templateName &&
                t.Status == "Approved", ct);

        if (template == null)
            return new WhatsAppSendResult(false, null, "Template not found or not approved");

        var (phoneNumberId, accessToken) = await GetSchoolCredentialsAsync(schoolId, ct);
        if (phoneNumberId == null || accessToken == null)
            return new WhatsAppSendResult(false, null, "WhatsApp account not configured");

        var components = _templateService.BuildTemplateComponents(template, placeholders);

        var request = new MetaSendMessageRequest(
            MessagingProduct: "whatsapp",
            To: recipientPhone,
            Type: "template",
            Template: new MetaTemplatePayload(
                Name: template.MetaTemplateName ?? template.Name,
                Language: new MetaLanguage(template.Language),
                Components: components
            )
        );

        var response = await _metaClient.SendTemplateMessageAsync(phoneNumberId, accessToken, request, ct);

        if (response.Error != null)
            return new WhatsAppSendResult(false, null, response.Error.Message);

        var messageId = response.Messages?.FirstOrDefault()?.Id;

        // Log the test message
        var log = new WhatsappMessageLog
        {
            Id = Guid.NewGuid(),
            SchoolId = schoolId,
            RecipientPhone = recipientPhone,
            RecipientName = "Test",
            TemplateId = template.Id,
            TemplateName = template.Name,
            PlaceholdersJson = JsonSerializer.Serialize(placeholders),
            MetaMessageId = messageId,
            EventKey = "test",
            Status = "Sent",
            SentAt = DateTime.UtcNow,
            ConversationBillable = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _db.WhatsappMessageLogs.Add(log);

        // Deduct from quota
        await _quota.IncrementUsageAsync(schoolId, ct);
        await _db.SaveChangesAsync(ct);

        return new WhatsAppSendResult(true, messageId, null);
    }

    public async Task<WhatsAppUsageSummary> GetUsageSummaryAsync(Guid schoolId, CancellationToken ct = default)
    {
        var period = DateTime.UtcNow.ToString("yyyyMM");
        var usage = await _db.WhatsappUsages
            .FirstOrDefaultAsync(u => u.SchoolId == schoolId && u.Period == period, ct);

        var today = DateTime.UtcNow.Date;
        var todayStats = await _db.WhatsappMessageLogs
            .Where(l => l.SchoolId == schoolId && l.CreatedAt >= today)
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Sent = g.Count(l => l.Status == "Sent" || l.Status == "Delivered" || l.Status == "Read"),
                Delivered = g.Count(l => l.Status == "Delivered" || l.Status == "Read"),
                Failed = g.Count(l => l.Status == "Failed")
            })
            .FirstOrDefaultAsync(ct);

        int quota = 0, used = 0, carryForward = 0;
        string plan = "None", overagePolicy = "Block";

        // Pull quota from cache (set by QuotaService)
        var cachedQuota = await _cache.GetStringAsync($"wa:quota:{schoolId}", ct);
        if (cachedQuota != null && int.TryParse(cachedQuota, out var q))
            quota = q;

        if (usage != null)
        {
            used = usage.MessagesSent;
        }

        return new WhatsAppUsageSummary(
            Quota: quota,
            Used: used,
            Remaining: Math.Max(0, quota - used),
            CarryForward: carryForward,
            Plan: plan,
            OveragePolicy: overagePolicy,
            UsedPct: quota > 0 ? Math.Round((decimal)used / quota * 100, 1) : 0,
            SentToday: todayStats?.Sent ?? 0,
            DeliveredToday: todayStats?.Delivered ?? 0,
            FailedToday: todayStats?.Failed ?? 0
        );
    }

    public async Task<List<WhatsAppMessageLogDto>> GetMessageHistoryAsync(
        Guid schoolId, int page, int pageSize, string? status,
        DateTime? from, DateTime? to, CancellationToken ct = default)
    {
        var query = _db.WhatsappMessageLogs
            .Where(l => l.SchoolId == schoolId);

        if (!string.IsNullOrEmpty(status))
            query = query.Where(l => l.Status == status);
        if (from.HasValue)
            query = query.Where(l => l.CreatedAt >= from.Value);
        if (to.HasValue)
            query = query.Where(l => l.CreatedAt <= to.Value);

        return await query
            .OrderByDescending(l => l.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(l => new WhatsAppMessageLogDto(
                l.Id, l.RecipientPhone, l.RecipientName, l.TemplateName,
                l.Status, l.EventKey, l.CreatedAt, l.DeliveredAt, l.ReadAt, l.ErrorMessage))
            .ToListAsync(ct);
    }

    private async Task<(string? phoneNumberId, string? accessToken)> GetSchoolCredentialsAsync(
        Guid schoolId, CancellationToken ct)
    {
        var settings = await _db.WhatsappSettings
            .FirstOrDefaultAsync(s => s.SchoolId == schoolId, ct);

        if (settings?.CrmAccountId == null)
        {
            // Use shared platform credentials (Mode A)
            return (
                _config["WhatsApp:SharedPhoneNumberId"],
                _config["WhatsApp:SharedAccessToken"]
            );
        }

        var account = await _crm.SchoolWhatsappAccounts
            .FirstOrDefaultAsync(a => a.Id == settings.CrmAccountId && a.IsActive, ct);

        if (account?.Mode == "B" && account.PhoneNumberId != null && account.AccessTokenEncrypted != null)
        {
            // Mode B: decrypt the token
            var decrypted = DecryptAccessToken(account.AccessTokenEncrypted);
            return (account.PhoneNumberId, decrypted);
        }

        // Fallback to shared platform credentials
        return (
            _config["WhatsApp:SharedPhoneNumberId"],
            _config["WhatsApp:SharedAccessToken"]
        );
    }

    private string? DecryptAccessToken(string encryptedToken)
    {
        // TODO: Implement AES-256 decryption using AWS KMS or environment key
        // For now returns as-is (plaintext in dev)
        return encryptedToken;
    }
}
