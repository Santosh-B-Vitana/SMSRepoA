using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.CRM;
using SmsApi.Models.Entities;

namespace SmsApi.Services.WhatsApp;

public interface IWhatsAppTemplateService
{
    Task<List<WhatsAppTemplateDto>> GetTemplatesAsync(Guid schoolId, string? status = null, CancellationToken ct = default);
    Task<WhatsAppTemplateDto?> GetTemplateByIdAsync(Guid schoolId, Guid templateId, CancellationToken ct = default);
    Task<WhatsAppTemplateDto> CreateTemplateAsync(Guid schoolId, Guid createdBy, CreateTemplateRequest request, CancellationToken ct = default);
    Task<WhatsAppTemplateDto> UpdateTemplateAsync(Guid schoolId, Guid templateId, UpdateTemplateRequest request, CancellationToken ct = default);
    Task<bool> DeleteTemplateAsync(Guid schoolId, Guid templateId, CancellationToken ct = default);
    Task<SubmitTemplateResult> SubmitToMetaAsync(Guid schoolId, Guid templateId, CancellationToken ct = default);
    Task<string> PreviewTemplateAsync(Guid templateId, Guid schoolId, Dictionary<string, string> sampleValues, CancellationToken ct = default);
    IReadOnlyList<MetaTemplateComponent>? BuildTemplateComponents(WhatsappTemplate template, Dictionary<string, string> placeholders);
}

// ── DTOs ──────────────────────────────────────────────────────────────────────

public record WhatsAppTemplateDto(
    Guid Id, string Name, string Category, string Language, string Status,
    string? MetaTemplateId, string BodyText, string HeaderType, string? HeaderValue,
    string? FooterText, bool HasButtons, string? EventCategory,
    DateTime CreatedAt, DateTime? ApprovedAt, string? RejectionReason);

public record CreateTemplateRequest(
    string Name, string Category, string Language, string BodyText,
    string HeaderType = "None", string? HeaderValue = null, string? FooterText = null,
    bool HasButtons = false, string? ButtonsJson = null, string? EventCategory = null);

public record UpdateTemplateRequest(
    string? BodyText = null, string? HeaderType = null, string? HeaderValue = null,
    string? FooterText = null, string? ButtonsJson = null, string? EventCategory = null);

public record SubmitTemplateResult(bool Success, string? MetaTemplateId, string? Error);

public class WhatsAppTemplateService : IWhatsAppTemplateService
{
    private readonly AppDbContext _db;
    private readonly CrmDbContext _crm;
    private readonly IMetaCloudApiClient _metaClient;
    private readonly IConfiguration _config;
    private readonly ILogger<WhatsAppTemplateService> _logger;

    // Standard placeholders mapped to position (Meta uses {{1}}, {{2}}, etc.)
    private static readonly Dictionary<string, int> PlaceholderPositions = new()
    {
        { "{{ParentName}}", 1 },   { "{{StudentName}}", 2 },   { "{{Class}}", 3 },
        { "{{Section}}", 4 },      { "{{SchoolName}}", 5 },    { "{{Amount}}", 6 },
        { "{{DueDate}}", 7 },      { "{{ExamName}}", 8 },      { "{{AttendanceDate}}", 9 },
        { "{{AdmissionNumber}}", 10 }, { "{{FeeReceiptNumber}}", 11 }, { "{{AcademicYear}}", 12 },
        { "{{PrincipalName}}", 13 }, { "{{GuardianName}}", 14 }, { "{{LeaveType}}", 15 },
        { "{{LeaveDates}}", 16 },   { "{{BusNumber}}", 17 },    { "{{RouteNumber}}", 18 },
        { "{{RoomNumber}}", 19 },   { "{{VisitorName}}", 20 },  { "{{BookTitle}}", 21 },
        { "{{OverdueDays}}", 22 },  { "{{OverdueFine}}", 23 },  { "{{ResultSummary}}", 24 },
    };

    public WhatsAppTemplateService(
        AppDbContext db, CrmDbContext crm, IMetaCloudApiClient metaClient,
        IConfiguration config, ILogger<WhatsAppTemplateService> logger)
    {
        _db = db;
        _crm = crm;
        _metaClient = metaClient;
        _config = config;
        _logger = logger;
    }

    public async Task<List<WhatsAppTemplateDto>> GetTemplatesAsync(
        Guid schoolId, string? status = null, CancellationToken ct = default)
    {
        var query = _db.WhatsappTemplates.Where(t => t.SchoolId == schoolId);
        if (!string.IsNullOrEmpty(status))
            query = query.Where(t => t.Status == status);

        return await query
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => MapToDto(t))
            .ToListAsync(ct);
    }

    public async Task<WhatsAppTemplateDto?> GetTemplateByIdAsync(
        Guid schoolId, Guid templateId, CancellationToken ct = default)
    {
        var template = await _db.WhatsappTemplates
            .FirstOrDefaultAsync(t => t.Id == templateId && t.SchoolId == schoolId, ct);
        return template == null ? null : MapToDto(template);
    }

    public async Task<WhatsAppTemplateDto> CreateTemplateAsync(
        Guid schoolId, Guid createdBy, CreateTemplateRequest request, CancellationToken ct = default)
    {
        // Enforce: only Utility category allowed for school admins
        if (request.Category == "Marketing")
            throw new InvalidOperationException("Marketing templates require Super Admin approval. Use Utility category.");

        // Check duplicate name
        var exists = await _db.WhatsappTemplates
            .AnyAsync(t => t.SchoolId == schoolId && t.Name == request.Name, ct);
        if (exists)
            throw new InvalidOperationException($"A template named '{request.Name}' already exists.");

        var template = new WhatsappTemplate
        {
            Id = Guid.NewGuid(),
            SchoolId = schoolId,
            Name = request.Name,
            Category = request.Category,
            Language = request.Language,
            Status = "Draft",
            BodyText = request.BodyText,
            HeaderType = request.HeaderType,
            HeaderValue = request.HeaderValue,
            FooterText = request.FooterText,
            HasButtons = request.HasButtons,
            ButtonsJson = request.ButtonsJson,
            EventCategory = request.EventCategory,
            CreatedBy = createdBy,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.WhatsappTemplates.Add(template);

        // Create initial version
        _db.WhatsappTemplateVersions.Add(new WhatsappTemplateVersion
        {
            Id = Guid.NewGuid(),
            TemplateId = template.Id,
            SchoolId = schoolId,
            Version = 1,
            BodyText = request.BodyText,
            HeaderType = request.HeaderType,
            HeaderValue = request.HeaderValue,
            FooterText = request.FooterText,
            ButtonsJson = request.ButtonsJson,
            Status = "Draft",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync(ct);
        return MapToDto(template);
    }

    public async Task<WhatsAppTemplateDto> UpdateTemplateAsync(
        Guid schoolId, Guid templateId, UpdateTemplateRequest request, CancellationToken ct = default)
    {
        var template = await _db.WhatsappTemplates
            .FirstOrDefaultAsync(t => t.Id == templateId && t.SchoolId == schoolId, ct)
            ?? throw new KeyNotFoundException("Template not found");

        if (template.Status == "Approved")
        {
            // Approved template: create a new version instead of modifying in-place
            var latestVersion = await _db.WhatsappTemplateVersions
                .Where(v => v.TemplateId == templateId)
                .MaxAsync(v => v.Version, ct);

            _db.WhatsappTemplateVersions.Add(new WhatsappTemplateVersion
            {
                Id = Guid.NewGuid(),
                TemplateId = template.Id,
                SchoolId = schoolId,
                Version = latestVersion + 1,
                BodyText = request.BodyText ?? template.BodyText,
                HeaderType = request.HeaderType ?? template.HeaderType,
                HeaderValue = request.HeaderValue ?? template.HeaderValue,
                FooterText = request.FooterText ?? template.FooterText,
                ButtonsJson = request.ButtonsJson ?? template.ButtonsJson,
                Status = "Draft",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });

            // Template status reset to Draft for re-approval
            template.Status = "Draft";
        }

        if (request.BodyText != null) template.BodyText = request.BodyText;
        if (request.HeaderType != null) template.HeaderType = request.HeaderType;
        if (request.HeaderValue != null) template.HeaderValue = request.HeaderValue;
        if (request.FooterText != null) template.FooterText = request.FooterText;
        if (request.ButtonsJson != null) template.ButtonsJson = request.ButtonsJson;
        if (request.EventCategory != null) template.EventCategory = request.EventCategory;
        template.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
        return MapToDto(template);
    }

    public async Task<bool> DeleteTemplateAsync(Guid schoolId, Guid templateId, CancellationToken ct = default)
    {
        var template = await _db.WhatsappTemplates
            .FirstOrDefaultAsync(t => t.Id == templateId && t.SchoolId == schoolId, ct);
        if (template == null) return false;

        if (template.Status == "Approved" && template.MetaTemplateName != null)
        {
            // Delete from Meta too (best-effort)
            var (_, accessToken, wabaId) = await GetSchoolMetaCredentialsAsync(schoolId, ct);
            if (accessToken != null && wabaId != null)
            {
                await _metaClient.DeleteTemplateAsync(wabaId, accessToken, template.MetaTemplateName, ct);
            }
        }

        template.IsDeleted = true;
        template.DeletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<SubmitTemplateResult> SubmitToMetaAsync(
        Guid schoolId, Guid templateId, CancellationToken ct = default)
    {
        var template = await _db.WhatsappTemplates
            .FirstOrDefaultAsync(t => t.Id == templateId && t.SchoolId == schoolId, ct)
            ?? throw new KeyNotFoundException("Template not found");

        if (template.Status != "Draft" && template.Status != "Rejected")
            return new SubmitTemplateResult(false, null, $"Cannot submit template with status '{template.Status}'");

        var (phoneNumberId, accessToken, wabaId) = await GetSchoolMetaCredentialsAsync(schoolId, ct);
        if (accessToken == null || wabaId == null)
            return new SubmitTemplateResult(false, null, "WhatsApp account not configured");

        // Build Meta template name (lowercase, underscores, school-scoped)
        var metaName = $"{template.Name.ToLower().Replace(" ", "_")}_{schoolId.ToString()[..8]}";

        var components = new List<MetaTemplateComponent2>();

        if (template.HeaderType != "None" && !string.IsNullOrEmpty(template.HeaderValue))
            components.Add(new MetaTemplateComponent2("HEADER", template.HeaderType, template.HeaderValue));

        components.Add(new MetaTemplateComponent2("BODY", Text: template.BodyText));

        if (!string.IsNullOrEmpty(template.FooterText))
            components.Add(new MetaTemplateComponent2("FOOTER", Text: template.FooterText));

        var metaRequest = new MetaCreateTemplateRequest(
            Name: metaName,
            Category: template.Category.ToUpper(),
            Language: template.Language,
            Components: components
        );

        var result = await _metaClient.CreateTemplateAsync(wabaId, accessToken, metaRequest, ct);

        if (result.Error != null)
        {
            template.Status = "Rejected";
            template.RejectionReason = result.Error.Message;
            await _db.SaveChangesAsync(ct);
            return new SubmitTemplateResult(false, null, result.Error.Message);
        }

        template.MetaTemplateId = result.Id;
        template.MetaTemplateName = metaName;
        template.Status = "Submitted";
        template.SubmittedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Template '{Name}' submitted to Meta, id={Id}", metaName, result.Id);
        return new SubmitTemplateResult(true, result.Id, null);
    }

    public async Task<string> PreviewTemplateAsync(
        Guid templateId, Guid schoolId, Dictionary<string, string> sampleValues, CancellationToken ct = default)
    {
        var template = await _db.WhatsappTemplates
            .FirstOrDefaultAsync(t => t.Id == templateId && t.SchoolId == schoolId, ct)
            ?? throw new KeyNotFoundException("Template not found");

        var text = template.BodyText;
        foreach (var (placeholder, value) in sampleValues)
            text = text.Replace(placeholder, value);

        // Replace any remaining unfilled placeholders with [placeholder_name]
        var remaining = System.Text.RegularExpressions.Regex.Replace(
            text, @"\{\{(\w+)\}\}", m => $"[{m.Groups[1].Value}]");

        return remaining;
    }

    public IReadOnlyList<MetaTemplateComponent>? BuildTemplateComponents(
        WhatsappTemplate template, Dictionary<string, string> placeholders)
    {
        // Extract positional parameters from body text
        var bodyParams = new List<MetaTemplateParameter>();
        var bodyText = template.BodyText;

        foreach (var (placeholder, _) in PlaceholderPositions.OrderBy(p => p.Value))
        {
            if (!bodyText.Contains(placeholder)) continue;
            placeholders.TryGetValue(placeholder, out var value);
            bodyParams.Add(new MetaTemplateParameter("text", value ?? $"[{placeholder}]"));
        }

        // Handle unknown custom placeholders
        var unknownMatches = System.Text.RegularExpressions.Regex.Matches(bodyText, @"\{\{(\w+)\}\}");
        foreach (System.Text.RegularExpressions.Match m in unknownMatches)
        {
            var key = $"{{{{{m.Groups[1].Value}}}}}";
            if (!PlaceholderPositions.ContainsKey(key))
            {
                placeholders.TryGetValue(key, out var value);
                bodyParams.Add(new MetaTemplateParameter("text", value ?? $"[{m.Groups[1].Value}]"));
            }
        }

        var components = new List<MetaTemplateComponent>();

        if (template.HeaderType != "None" && !string.IsNullOrEmpty(template.HeaderValue))
        {
            if (template.HeaderType == "Text")
                components.Add(new MetaTemplateComponent("header",
                    new[] { new MetaTemplateParameter("text", template.HeaderValue) }));
            else
                components.Add(new MetaTemplateComponent("header", null));
        }

        if (bodyParams.Count > 0)
            components.Add(new MetaTemplateComponent("body", bodyParams));

        return components.Count > 0 ? components : null;
    }

    private async Task<(string? phoneNumberId, string? accessToken, string? wabaId)> GetSchoolMetaCredentialsAsync(
        Guid schoolId, CancellationToken ct)
    {
        var settings = await _db.WhatsappSettings
            .FirstOrDefaultAsync(s => s.SchoolId == schoolId, ct);

        if (settings?.CrmAccountId != null)
        {
            var account = await _crm.SchoolWhatsappAccounts
                .FirstOrDefaultAsync(a => a.Id == settings.CrmAccountId && a.IsActive, ct);
            if (account?.Mode == "B")
                return (account.PhoneNumberId, account.AccessTokenEncrypted, account.WabaId);
        }

        return (
            _config["WhatsApp:SharedPhoneNumberId"],
            _config["WhatsApp:SharedAccessToken"],
            _config["WhatsApp:SharedWabaId"]
        );
    }

    private static WhatsAppTemplateDto MapToDto(WhatsappTemplate t) => new(
        t.Id, t.Name, t.Category, t.Language, t.Status,
        t.MetaTemplateId, t.BodyText, t.HeaderType, t.HeaderValue,
        t.FooterText, t.HasButtons, t.EventCategory,
        t.CreatedAt, t.ApprovedAt, t.RejectionReason);
}
