using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmsApi.Services.WhatsApp;

namespace SmsApi.Controllers.SuperAdmin;

/// <summary>
/// Super Admin — WhatsApp Communication Hub management.
/// All endpoints require SuperAdmin role.
/// </summary>
[ApiController]
[Route("api/super-admin/whatsapp")]
[Authorize(Roles = "SuperAdmin,super_admin")]
public class WhatsAppHubController : ControllerBase
{
    private readonly IWhatsAppHubService _hub;

    public WhatsAppHubController(IWhatsAppHubService hub)
    {
        _hub = hub;
    }

    // ── Dashboard ─────────────────────────────────────────────────────────────

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard(CancellationToken ct)
        => Ok(await _hub.GetDashboardAsync(ct));

    // ── Providers ─────────────────────────────────────────────────────────────

    [HttpGet("providers")]
    public async Task<IActionResult> GetProviders(CancellationToken ct)
        => Ok(await _hub.GetProvidersAsync(ct));

    [HttpPost("providers")]
    public async Task<IActionResult> CreateProvider([FromBody] CreateProviderRequest request, CancellationToken ct)
        => Ok(await _hub.CreateProviderAsync(request, ct));

    // ── School Accounts ───────────────────────────────────────────────────────

    [HttpGet("accounts")]
    public async Task<IActionResult> GetSchoolAccounts(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
        => Ok(await _hub.GetSchoolAccountsAsync(page, pageSize, ct));

    [HttpPut("accounts/{id:int}/activate")]
    public async Task<IActionResult> ActivateAccount(int id, CancellationToken ct)
    {
        var account = await _hub.GetSchoolAccountsAsync(1, 1000, ct);
        var found = account.FirstOrDefault(a => a.Id == id);
        if (found == null) return NotFound();
        return Ok(new { message = "Account activation endpoint - update IsActive in CRM" });
    }

    // ── Plans ─────────────────────────────────────────────────────────────────

    [HttpGet("plans")]
    public async Task<IActionResult> GetPlans(CancellationToken ct)
        => Ok(await _hub.GetPlansAsync(ct));

    [HttpPost("plans")]
    public async Task<IActionResult> CreatePlan([FromBody] CreatePlanRequest request, CancellationToken ct)
        => Ok(await _hub.CreatePlanAsync(request, ct));

    // ── Subscriptions ─────────────────────────────────────────────────────────

    [HttpGet("subscriptions")]
    public async Task<IActionResult> GetSubscriptions(CancellationToken ct)
        => Ok(await _hub.GetSubscriptionsAsync(ct));

    [HttpPost("subscriptions")]
    public async Task<IActionResult> AssignPlan([FromBody] AssignPlanRequest request, CancellationToken ct)
        => Ok(await _hub.AssignPlanAsync(request, ct));

    // ── Cost & Billing ────────────────────────────────────────────────────────

    [HttpGet("costs")]
    public async Task<IActionResult> GetCostDashboard(CancellationToken ct)
        => Ok(await _hub.GetCostDashboardAsync(ct));

    [HttpGet("billing/invoices")]
    public async Task<IActionResult> GetInvoices(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
        => Ok(await _hub.GetInvoicesAsync(page, pageSize, ct));

    // ── Renewal Management ────────────────────────────────────────────────────

    [HttpGet("renewals/upcoming")]
    public async Task<IActionResult> GetUpcomingRenewals(
        [FromQuery] int days = 30, CancellationToken ct = default)
        => Ok(await _hub.GetUpcomingRenewalsAsync(days, ct));

    // ── Pricing Configuration ─────────────────────────────────────────────────

    [HttpGet("pricing-config")]
    public async Task<IActionResult> GetPricingConfig(CancellationToken ct)
        => Ok(await _hub.GetPricingConfigAsync(ct));

    [HttpPut("pricing-config")]
    public async Task<IActionResult> UpdatePricingConfig(
        [FromBody] UpdatePricingConfigRequest request, CancellationToken ct)
        => Ok(await _hub.UpdatePricingConfigAsync(request, ct));

    // ── Queue Monitoring ──────────────────────────────────────────────────────

    [HttpGet("queue/status")]
    public IActionResult GetQueueStatus()
    {
        // Queue status is available via Hangfire dashboard (/hangfire)
        // For API consumers, return Hangfire job counts
        return Ok(new
        {
            message = "Use /hangfire dashboard for real-time job monitoring",
            hangfireDashboard = "/hangfire"
        });
    }
}
