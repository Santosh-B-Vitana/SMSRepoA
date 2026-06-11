using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmsApi.Models.Constants;
using SmsApi.Services;
using SmsApi.Services.WhatsApp;

namespace SmsApi.Controllers;

/// <summary>
/// School Admin WhatsApp Hub endpoints.
/// All endpoints require school-level authentication.
/// </summary>
[ApiController]
[Route("api/whatsapp")]
[Authorize]
public class WhatsAppController : ControllerBase
{
    private readonly IWhatsAppService _whatsApp;
    private readonly IWhatsAppTemplateService _templates;
    private readonly IWhatsAppQuotaService _quota;
    private readonly IWhatsAppContactResolver _contacts;
    private readonly ITenantContext _tenant;
    private readonly ILogger<WhatsAppController> _logger;

    public WhatsAppController(
        IWhatsAppService whatsApp,
        IWhatsAppTemplateService templates,
        IWhatsAppQuotaService quota,
        IWhatsAppContactResolver contacts,
        ITenantContext tenant,
        ILogger<WhatsAppController> logger)
    {
        _whatsApp = whatsApp;
        _templates = templates;
        _quota = quota;
        _contacts = contacts;
        _tenant = tenant;
        _logger = logger;
    }

    private Guid SchoolId => _tenant.SchoolId;

    // ── Templates ─────────────────────────────────────────────────────────────

    [HttpGet("templates")]
    public async Task<IActionResult> GetTemplates([FromQuery] string? status, CancellationToken ct)
    {
        var templates = await _templates.GetTemplatesAsync(SchoolId, status, ct);
        return Ok(templates);
    }

    [HttpGet("templates/{id:guid}")]
    public async Task<IActionResult> GetTemplate(Guid id, CancellationToken ct)
    {
        var template = await _templates.GetTemplateByIdAsync(SchoolId, id, ct);
        if (template == null) return NotFound();
        return Ok(template);
    }

    [HttpPost("templates")]
    [Authorize(Roles = "Admin,Principal")]
    public async Task<IActionResult> CreateTemplate(
        [FromBody] CreateTemplateRequest request, CancellationToken ct)
    {
        var userId = _tenant.UserId;
        var template = await _templates.CreateTemplateAsync(SchoolId, userId, request, ct);
        return CreatedAtAction(nameof(GetTemplate), new { id = template.Id }, template);
    }

    [HttpPut("templates/{id:guid}")]
    [Authorize(Roles = "Admin,Principal")]
    public async Task<IActionResult> UpdateTemplate(
        Guid id, [FromBody] UpdateTemplateRequest request, CancellationToken ct)
    {
        try
        {
            var template = await _templates.UpdateTemplateAsync(SchoolId, id, request, ct);
            return Ok(template);
        }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpDelete("templates/{id:guid}")]
    [Authorize(Roles = "Admin,Principal")]
    public async Task<IActionResult> DeleteTemplate(Guid id, CancellationToken ct)
    {
        var success = await _templates.DeleteTemplateAsync(SchoolId, id, ct);
        return success ? NoContent() : NotFound();
    }

    [HttpPost("templates/{id:guid}/submit")]
    [Authorize(Roles = "Admin,Principal")]
    public async Task<IActionResult> SubmitTemplate(Guid id, CancellationToken ct)
    {
        try
        {
            var result = await _templates.SubmitToMetaAsync(SchoolId, id, ct);
            return result.Success ? Ok(result) : BadRequest(result);
        }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpGet("templates/{id:guid}/preview")]
    public async Task<IActionResult> PreviewTemplate(
        Guid id,
        [FromQuery] string? sampleData,
        CancellationToken ct)
    {
        var samples = new Dictionary<string, string>();
        if (!string.IsNullOrEmpty(sampleData))
        {
            try
            {
                samples = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string>>(sampleData) ?? new();
            }
            catch { /* ignore */ }
        }

        var preview = await _templates.PreviewTemplateAsync(id, SchoolId, samples, ct);
        return Ok(new { preview });
    }

    // ── Template Mappings ─────────────────────────────────────────────────────

    [HttpGet("template-mappings")]
    public async Task<IActionResult> GetTemplateMappings(CancellationToken ct)
    {
        using var scope = HttpContext.RequestServices.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SmsApi.Data.AppDbContext>();

        var mappings = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions
            .ToListAsync(
                db.WhatsappTemplateMappings
                    .Where(m => m.SchoolId == SchoolId)
                    .Select(m => new
                    {
                        m.Id,
                        m.EventKey,
                        m.TemplateId,
                        m.IsEnabled,
                        m.AudienceType
                    }),
                ct);

        return Ok(mappings);
    }

    [HttpPut("template-mappings/{eventKey}")]
    [Authorize(Roles = "Admin,Principal")]
    public async Task<IActionResult> UpdateTemplateMapping(
        string eventKey,
        [FromBody] UpdateTemplateMappingRequest request,
        CancellationToken ct)
    {
        using var scope = HttpContext.RequestServices.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SmsApi.Data.AppDbContext>();

        var existing = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions
            .FirstOrDefaultAsync(
                db.WhatsappTemplateMappings,
                m => m.SchoolId == SchoolId && m.EventKey == eventKey,
                ct);

        if (existing == null)
        {
            db.WhatsappTemplateMappings.Add(new SmsApi.Models.Entities.WhatsappTemplateMapping
            {
                Id = Guid.NewGuid(),
                SchoolId = SchoolId,
                EventKey = eventKey,
                TemplateId = request.TemplateId,
                IsEnabled = request.IsEnabled,
                AudienceType = request.AudienceType ?? "Parent",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        }
        else
        {
            existing.TemplateId = request.TemplateId;
            existing.IsEnabled = request.IsEnabled;
            if (request.AudienceType != null) existing.AudienceType = request.AudienceType;
            existing.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(ct);
        return Ok();
    }

    // ── Message History ───────────────────────────────────────────────────────

    [HttpGet("messages")]
    public async Task<IActionResult> GetMessages(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? status = null,
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        CancellationToken ct = default)
    {
        var messages = await _whatsApp.GetMessageHistoryAsync(
            SchoolId, page, Math.Min(pageSize, 100), status, from, to, ct);
        return Ok(messages);
    }

    [HttpPost("messages/test")]
    [Authorize(Roles = "Admin,Principal")]
    public async Task<IActionResult> SendTestMessage(
        [FromBody] TestMessageRequest request, CancellationToken ct)
    {
        var result = await _whatsApp.SendTestMessageAsync(
            SchoolId, request.TemplateName, request.RecipientPhone, request.Placeholders, ct);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    // ── Usage & Quota ─────────────────────────────────────────────────────────

    [HttpGet("usage")]
    public async Task<IActionResult> GetUsage(CancellationToken ct)
    {
        var summary = await _whatsApp.GetUsageSummaryAsync(SchoolId, ct);
        return Ok(summary);
    }

    [HttpGet("usage/history")]
    public async Task<IActionResult> GetUsageHistory(CancellationToken ct)
    {
        using var scope = HttpContext.RequestServices.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SmsApi.Data.AppDbContext>();

        var history = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions
            .ToListAsync(
                db.WhatsappUsageHistories
                    .Where(u => u.SchoolId == SchoolId)
                    .OrderByDescending(u => u.Period)
                    .Take(12)
                    .Select(u => new { u.Period, u.MessagesSent, u.MessagesDelivered, u.MessagesFailed }),
                ct);

        return Ok(history);
    }

    // ── Contacts / Opt-In Management ──────────────────────────────────────────

    [HttpGet("contacts")]
    public async Task<IActionResult> GetContacts(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken ct = default)
    {
        using var scope = HttpContext.RequestServices.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SmsApi.Data.AppDbContext>();

        var contacts = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions
            .ToListAsync(
                db.WhatsappContacts
                    .Where(c => c.SchoolId == SchoolId)
                    .OrderByDescending(c => c.CreatedAt)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(c => new
                    {
                        c.Id, c.Name, c.Phone, c.EntityType,
                        c.IsOptedIn, c.IsOptedOut, c.IsBlacklisted,
                        c.OptInAt, c.OptOutAt
                    }),
                ct);

        return Ok(contacts);
    }

    [HttpPut("contacts/{id:guid}/opt-out")]
    [Authorize(Roles = "Admin,Principal")]
    public async Task<IActionResult> OptOut(Guid id, CancellationToken ct)
    {
        using var scope = HttpContext.RequestServices.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SmsApi.Data.AppDbContext>();

        var contact = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions
            .FirstOrDefaultAsync(db.WhatsappContacts,
                c => c.Id == id && c.SchoolId == SchoolId, ct);

        if (contact == null) return NotFound();

        contact.IsOptedOut = true;
        contact.OptOutAt = DateTime.UtcNow;
        contact.UpdatedAt = DateTime.UtcNow;

        db.WhatsappOptInEvents.Add(new SmsApi.Models.Entities.WhatsappOptInEvent
        {
            Id = Guid.NewGuid(),
            ContactId = contact.Id,
            SchoolId = SchoolId,
            EventType = "OptOut",
            Source = "AdminAction",
            PerformedBy = _tenant.UserId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });

        await db.SaveChangesAsync(ct);
        return Ok();
    }

    [HttpPut("contacts/{id:guid}/opt-in")]
    [Authorize(Roles = "Admin,Principal")]
    public async Task<IActionResult> OptIn(Guid id, CancellationToken ct)
    {
        using var scope = HttpContext.RequestServices.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SmsApi.Data.AppDbContext>();

        var contact = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions
            .FirstOrDefaultAsync(db.WhatsappContacts,
                c => c.Id == id && c.SchoolId == SchoolId, ct);

        if (contact == null) return NotFound();

        contact.IsOptedIn = true;
        contact.IsOptedOut = false;
        contact.OptInAt = DateTime.UtcNow;
        contact.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        return Ok();
    }

    [HttpPut("contacts/{id:guid}/blacklist")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Blacklist(Guid id, [FromBody] BlacklistRequest request, CancellationToken ct)
    {
        using var scope = HttpContext.RequestServices.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SmsApi.Data.AppDbContext>();

        var contact = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions
            .FirstOrDefaultAsync(db.WhatsappContacts,
                c => c.Id == id && c.SchoolId == SchoolId, ct);

        if (contact == null) return NotFound();

        contact.IsBlacklisted = true;
        contact.BlacklistedAt = DateTime.UtcNow;
        contact.BlacklistReason = request.Reason;
        contact.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        return Ok();
    }

    // ── Settings ──────────────────────────────────────────────────────────────

    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings(CancellationToken ct)
    {
        using var scope = HttpContext.RequestServices.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SmsApi.Data.AppDbContext>();

        var settings = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions
            .FirstOrDefaultAsync(db.WhatsappSettings,
                s => s.SchoolId == SchoolId, ct);

        return Ok(settings ?? new SmsApi.Models.Entities.WhatsappSettings
        {
            SchoolId = SchoolId,
            IsEnabled = false
        });
    }

    [HttpPut("settings")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateSettings(
        [FromBody] UpdateWhatsAppSettingsRequest request, CancellationToken ct)
    {
        using var scope = HttpContext.RequestServices.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SmsApi.Data.AppDbContext>();

        var settings = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions
            .FirstOrDefaultAsync(db.WhatsappSettings,
                s => s.SchoolId == SchoolId, ct);

        if (settings == null)
        {
            settings = new SmsApi.Models.Entities.WhatsappSettings
            {
                Id = Guid.NewGuid(),
                SchoolId = SchoolId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            db.WhatsappSettings.Add(settings);
        }

        settings.IsEnabled = request.IsEnabled;
        settings.AutoSendOnEvents = request.AutoSendOnEvents;
        settings.DefaultLanguage = request.DefaultLanguage ?? "en";
        settings.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        return Ok(settings);
    }

    // ── Analytics ─────────────────────────────────────────────────────────────

    [HttpGet("analytics/dashboard")]
    public async Task<IActionResult> GetAnalyticsDashboard(CancellationToken ct)
    {
        using var scope = HttpContext.RequestServices.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SmsApi.Data.AppDbContext>();

        var period = DateTime.UtcNow.ToString("yyyyMM");
        var last30Days = DateTime.UtcNow.AddDays(-30);

        var stats = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions
            .ToListAsync(
                db.WhatsappMessageLogs
                    .Where(l => l.SchoolId == SchoolId && l.CreatedAt >= last30Days)
                    .GroupBy(l => l.Status)
                    .Select(g => new { Status = g.Key, Count = g.Count() }),
                ct);

        var deliveryByEvent = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions
            .ToListAsync(
                db.WhatsappMessageLogs
                    .Where(l => l.SchoolId == SchoolId && l.CreatedAt >= last30Days && l.EventKey != null)
                    .GroupBy(l => l.EventKey)
                    .Select(g => new
                    {
                        EventKey = g.Key,
                        Total = g.Count(),
                        Delivered = g.Count(l => l.Status == "Delivered" || l.Status == "Read"),
                        Read = g.Count(l => l.Status == "Read")
                    })
                    .OrderByDescending(g => g.Total)
                    .Take(10),
                ct);

        return Ok(new { stats, deliveryByEvent });
    }
}

// ── Request DTOs ──────────────────────────────────────────────────────────────

public record UpdateTemplateMappingRequest(Guid TemplateId, bool IsEnabled, string? AudienceType = null);
public record TestMessageRequest(string TemplateName, string RecipientPhone, Dictionary<string, string> Placeholders);
public record BlacklistRequest(string Reason);
public record UpdateWhatsAppSettingsRequest(bool IsEnabled, bool AutoSendOnEvents, string? DefaultLanguage = null);
