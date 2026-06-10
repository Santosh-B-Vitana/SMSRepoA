using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using SmsApi.Services.WhatsApp;

namespace SmsApi.Controllers;

/// <summary>
/// Receives Meta Cloud API webhook events.
/// Route A (shared number): POST /api/webhooks/whatsapp
/// Route B (school-owned):  POST /api/webhooks/whatsapp/{schoolExternalId}
/// </summary>
[ApiController]
[Route("api/webhooks/whatsapp")]
public class WhatsAppWebhookController : ControllerBase
{
    private readonly IWhatsAppWebhookProcessor _processor;
    private readonly IConfiguration _config;
    private readonly ILogger<WhatsAppWebhookController> _logger;
    private readonly SmsApi.Data.CrmDbContext _crm;

    public WhatsAppWebhookController(
        IWhatsAppWebhookProcessor processor,
        IConfiguration config,
        ILogger<WhatsAppWebhookController> logger,
        SmsApi.Data.CrmDbContext crm)
    {
        _processor = processor;
        _config = config;
        _logger = logger;
        _crm = crm;
    }

    // ── Meta webhook verification challenge ───────────────────────────────────

    [HttpGet]
    public IActionResult VerifyShared(
        [FromQuery(Name = "hub.mode")] string? mode,
        [FromQuery(Name = "hub.verify_token")] string? verifyToken,
        [FromQuery(Name = "hub.challenge")] string? challenge)
    {
        return VerifyWebhook(mode, verifyToken, challenge,
            _config["WhatsApp:WebhookVerifyToken"]);
    }

    [HttpGet("{schoolExternalId}")]
    public async Task<IActionResult> VerifySchool(
        string schoolExternalId,
        [FromQuery(Name = "hub.mode")] string? mode,
        [FromQuery(Name = "hub.verify_token")] string? verifyToken,
        [FromQuery(Name = "hub.challenge")] string? challenge)
    {
        var account = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions
            .FirstOrDefaultAsync(_crm.SchoolWhatsappAccounts,
                a => a.WabaId == schoolExternalId || a.PhoneNumberId == schoolExternalId);

        var expectedToken = account?.WebhookSecretEncrypted ?? _config["WhatsApp:WebhookVerifyToken"];
        return VerifyWebhook(mode, verifyToken, challenge, expectedToken);
    }

    private IActionResult VerifyWebhook(string? mode, string? verifyToken, string? challenge, string? expectedToken)
    {
        if (mode == "subscribe" &&
            !string.IsNullOrEmpty(verifyToken) &&
            verifyToken == expectedToken &&
            !string.IsNullOrEmpty(challenge))
        {
            _logger.LogInformation("WhatsApp webhook verification successful");
            return Ok(challenge);
        }

        _logger.LogWarning("WhatsApp webhook verification failed (mode={Mode})", mode);
        return Forbid();
    }

    // ── Shared number webhook handler ─────────────────────────────────────────

    [HttpPost]
    public async Task<IActionResult> ReceiveShared(CancellationToken ct)
    {
        return await ProcessWebhook(null, ct);
    }

    [HttpPost("{schoolExternalId}")]
    public async Task<IActionResult> ReceiveSchool(string schoolExternalId, CancellationToken ct)
    {
        return await ProcessWebhook(schoolExternalId, ct);
    }

    private async Task<IActionResult> ProcessWebhook(string? schoolExternalId, CancellationToken ct)
    {
        // Read raw body for signature verification
        Request.EnableBuffering();
        var rawBody = await new StreamReader(Request.Body).ReadToEndAsync(ct);
        Request.Body.Position = 0;

        // Verify HMAC-SHA256 signature
        var signature = Request.Headers["X-Hub-Signature-256"].FirstOrDefault() ?? "";
        var appSecret = _config["WhatsApp:AppSecret"] ?? "";

        if (!string.IsNullOrEmpty(appSecret) && !_processor.VerifySignature(rawBody, signature, appSecret))
        {
            _logger.LogWarning("WhatsApp webhook signature verification FAILED (source={Source})", schoolExternalId ?? "shared");
            return StatusCode(401);
        }

        // Parse payload
        MetaWebhookPayload? payload;
        try
        {
            payload = JsonSerializer.Deserialize<MetaWebhookPayload>(rawBody,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse WhatsApp webhook payload");
            return BadRequest();
        }

        if (payload == null)
            return Ok(); // Meta expects 200 even for empty payloads

        // Resolve schoolId
        Guid schoolId;
        if (schoolExternalId != null)
        {
            // Mode B: school-specific webhook
            var account = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions
                .FirstOrDefaultAsync(_crm.SchoolWhatsappAccounts,
                    a => a.WabaId == schoolExternalId || a.PhoneNumberId == schoolExternalId,
                    ct);

            if (account == null)
            {
                _logger.LogWarning("Webhook for unknown school external ID: {Id}", schoolExternalId);
                return Ok();
            }

            // We need to look up the Guid from AppDbContext using CRM schoolId
            // For simplicity, we use a placeholder here — in production, cache this mapping
            schoolId = Guid.Empty; // TODO: resolve from CRM schoolId → tenant Guid
        }
        else
        {
            // Mode A: shared number — use platform school marker
            schoolId = Guid.Parse("00000000-0000-0000-0000-000000000002"); // shared platform marker
        }

        // Process asynchronously (Meta expects fast response)
        _ = Task.Run(async () =>
        {
            try
            {
                await _processor.ProcessWebhookAsync(schoolId, payload, rawBody, CancellationToken.None);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Async webhook processing failed");
            }
        }, CancellationToken.None);

        // Always return 200 immediately to Meta
        return Ok();
    }
}
