using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.CRM;

namespace SmsApi.Services.WhatsApp;

public interface IWhatsAppHubService
{
    Task<WhatsAppHubDashboard> GetDashboardAsync(CancellationToken ct = default);
    Task<List<WhatsAppProviderDto>> GetProvidersAsync(CancellationToken ct = default);
    Task<WhatsAppProviderDto> CreateProviderAsync(CreateProviderRequest request, CancellationToken ct = default);
    Task<List<SchoolAccountDto>> GetSchoolAccountsAsync(int page, int pageSize, CancellationToken ct = default);
    Task<List<WhatsAppPlanDto>> GetPlansAsync(CancellationToken ct = default);
    Task<WhatsAppPlanDto> CreatePlanAsync(CreatePlanRequest request, CancellationToken ct = default);
    Task<List<SchoolSubscriptionDto>> GetSubscriptionsAsync(CancellationToken ct = default);
    Task<SchoolSubscriptionDto> AssignPlanAsync(AssignPlanRequest request, CancellationToken ct = default);
    Task<WhatsAppCostDashboard> GetCostDashboardAsync(CancellationToken ct = default);
    Task<WhatsAppPricingConfigDto> GetPricingConfigAsync(CancellationToken ct = default);
    Task<WhatsAppPricingConfigDto> UpdatePricingConfigAsync(UpdatePricingConfigRequest request, CancellationToken ct = default);
    Task<List<BillingInvoiceDto>> GetInvoicesAsync(int page, int pageSize, CancellationToken ct = default);
    Task<List<UpcomingRenewalDto>> GetUpcomingRenewalsAsync(int days = 30, CancellationToken ct = default);
}

// ── DTOs ──────────────────────────────────────────────────────────────────────

public record WhatsAppHubDashboard(
    int TotalActiveSchools, int TotalMessagesMtd, decimal TotalRevenueMtd,
    decimal TotalProviderCostMtd, decimal GrossProfitMtd, decimal GrossMarginPct,
    int PendingRenewals, int ExhaustedQuota, int FailedMessages24h,
    List<SchoolUsageSummaryDto> TopConsumers);

public record SchoolUsageSummaryDto(int SchoolId, string SchoolName, int MessagesSent, decimal Revenue, decimal Cost, decimal Margin);
public record WhatsAppProviderDto(int Id, string Name, string ApiBaseUrl, string ApiVersion, bool IsActive);
public record SchoolAccountDto(int Id, int SchoolId, string SchoolName, string Mode, string? DisplayPhoneNumber, bool IsActive, string? Status);
public record WhatsAppPlanDto(int Id, string PlanName, int MonthlyQuota, decimal BaseMonthlyPriceInr, bool OverageAllowed, decimal OverageChargePerMessageInr, bool IsActive);
public record SchoolSubscriptionDto(int Id, int SchoolId, string SchoolName, string PlanName, string Status, int MessagesUsed, int MessagesQuota, DateTime CurrentPeriodEnd);
public record WhatsAppCostDashboard(
    decimal TotalProviderCostInr, decimal TotalRevenueInr, decimal GrossProfit,
    decimal GrossMarginPct, List<MonthlyRevenueDto> MonthlyRevenue,
    List<SchoolCostDto> SchoolCosts, decimal ExpectedNextMonthRevenue, decimal ExpectedNextMonthCost);
public record MonthlyRevenueDto(string Period, decimal ProviderCost, decimal Revenue, decimal Profit);
public record SchoolCostDto(int SchoolId, string SchoolName, decimal ProviderCost, decimal Revenue, decimal Profit, decimal MarginPct);
public record WhatsAppPricingConfigDto(int Id, decimal MarkupPct, decimal ServiceChargeInr, decimal PlatformFeeInr, decimal GstPct, DateTime EffectiveFrom);
public record BillingInvoiceDto(Guid Id, int SchoolId, string SchoolName, DateTime PeriodStart, DateTime PeriodEnd, decimal TotalAmountInr, string Status);
public record UpcomingRenewalDto(int SubscriptionId, int SchoolId, string SchoolName, DateTime RenewalDate, string PlanName, decimal Amount);

public class WhatsAppHubService : IWhatsAppHubService
{
    private readonly CrmDbContext _crm;
    private readonly ILogger<WhatsAppHubService> _logger;

    public WhatsAppHubService(CrmDbContext crm, ILogger<WhatsAppHubService> logger)
    {
        _crm = crm;
        _logger = logger;
    }

    public async Task<WhatsAppHubDashboard> GetDashboardAsync(CancellationToken ct = default)
    {
        var activeCount = await _crm.WhatsappSubscriptions
            .CountAsync(s => s.Status == "Active", ct);

        var mtdStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
        var period = DateTime.UtcNow.ToString("yyyyMM");

        var costStats = await _crm.WhatsappCostTrackings
            .Where(c => c.Period == period)
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Messages = g.Sum(c => c.TotalMessagesDelivered),
                Revenue = g.Sum(c => c.PlatformChargedInr),
                Cost = g.Sum(c => c.ProviderCostInr),
                Profit = g.Sum(c => c.GrossProfit)
            })
            .FirstOrDefaultAsync(ct);

        var pendingRenewals = await _crm.WhatsappSubscriptions
            .CountAsync(s => s.Status == "Active" &&
                s.NextRenewalDate <= DateTime.UtcNow.AddDays(7), ct);

        var topConsumers = await _crm.WhatsappCostTrackings
            .Include(c => c.SchoolConfig)
            .Where(c => c.Period == period)
            .OrderByDescending(c => c.TotalMessagesDelivered)
            .Take(5)
            .Select(c => new SchoolUsageSummaryDto(
                c.SchoolId,
                c.SchoolConfig.SchoolName,
                c.TotalMessagesDelivered,
                c.PlatformChargedInr,
                c.ProviderCostInr,
                c.GrossMarginPct))
            .ToListAsync(ct);

        var revenue = costStats?.Revenue ?? 0m;
        var cost = costStats?.Cost ?? 0m;
        var profit = costStats?.Profit ?? 0m;
        var margin = revenue > 0 ? Math.Round(profit / revenue * 100, 2) : 0;

        return new WhatsAppHubDashboard(
            activeCount,
            costStats?.Messages ?? 0,
            revenue,
            cost,
            profit,
            margin,
            pendingRenewals,
            0, // exhaustedQuota — requires per-tenant data
            0, // failedMessages24h — requires per-tenant data
            topConsumers);
    }

    public async Task<List<WhatsAppProviderDto>> GetProvidersAsync(CancellationToken ct = default)
        => await _crm.WhatsappProviders
            .Select(p => new WhatsAppProviderDto(p.Id, p.Name, p.ApiBaseUrl, p.ApiVersion, p.IsActive))
            .ToListAsync(ct);

    public async Task<WhatsAppProviderDto> CreateProviderAsync(
        CreateProviderRequest request, CancellationToken ct = default)
    {
        var provider = new WhatsappProvider
        {
            Name = request.Name,
            ApiBaseUrl = request.ApiBaseUrl,
            ApiVersion = request.ApiVersion ?? "v19.0",
            IsActive = true,
            WebhookVerifyToken = request.WebhookVerifyToken,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _crm.WhatsappProviders.Add(provider);
        await _crm.SaveChangesAsync(ct);
        return new WhatsAppProviderDto(provider.Id, provider.Name, provider.ApiBaseUrl, provider.ApiVersion, provider.IsActive);
    }

    public async Task<List<SchoolAccountDto>> GetSchoolAccountsAsync(
        int page, int pageSize, CancellationToken ct = default)
        => await _crm.SchoolWhatsappAccounts
            .Include(a => a.SchoolConfig)
            .Include(a => a.Subscription)
            .OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new SchoolAccountDto(
                a.Id, a.SchoolId, a.SchoolConfig.SchoolName,
                a.Mode, a.DisplayPhoneNumber, a.IsActive,
                a.Subscription != null ? a.Subscription.Status : "None"))
            .ToListAsync(ct);

    public async Task<List<WhatsAppPlanDto>> GetPlansAsync(CancellationToken ct = default)
        => await _crm.WhatsappPlans
            .Where(p => p.IsActive)
            .OrderBy(p => p.SortOrder)
            .Select(p => new WhatsAppPlanDto(
                p.Id, p.PlanName, p.MonthlyQuota, p.BaseMonthlyPriceInr,
                p.OverageAllowed, p.OverageChargePerMessageInr, p.IsActive))
            .ToListAsync(ct);

    public async Task<WhatsAppPlanDto> CreatePlanAsync(
        CreatePlanRequest request, CancellationToken ct = default)
    {
        var plan = new WhatsappPlan
        {
            PlanName = request.PlanName,
            Description = request.Description,
            MonthlyQuota = request.MonthlyQuota,
            OverageAllowed = request.OverageAllowed,
            OverageChargePerMessageInr = request.OverageChargePerMessageInr,
            BaseMonthlyPriceInr = request.BaseMonthlyPriceInr,
            IsCustom = request.IsCustom,
            IsActive = true,
            SortOrder = request.SortOrder,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _crm.WhatsappPlans.Add(plan);
        await _crm.SaveChangesAsync(ct);
        return new WhatsAppPlanDto(
            plan.Id, plan.PlanName, plan.MonthlyQuota, plan.BaseMonthlyPriceInr,
            plan.OverageAllowed, plan.OverageChargePerMessageInr, plan.IsActive);
    }

    public async Task<List<SchoolSubscriptionDto>> GetSubscriptionsAsync(CancellationToken ct = default)
        => await _crm.WhatsappSubscriptions
            .Include(s => s.Plan)
            .Include(s => s.SchoolConfig)
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new SchoolSubscriptionDto(
                s.Id, s.SchoolId, s.SchoolConfig.SchoolName, s.Plan.PlanName,
                s.Status, s.MessagesUsed, s.MessagesQuota, s.CurrentPeriodEnd))
            .ToListAsync(ct);

    public async Task<SchoolSubscriptionDto> AssignPlanAsync(
        AssignPlanRequest request, CancellationToken ct = default)
    {
        var plan = await _crm.WhatsappPlans
            .FirstOrDefaultAsync(p => p.Id == request.PlanId, ct)
            ?? throw new KeyNotFoundException("Plan not found");

        var account = await _crm.SchoolWhatsappAccounts
            .FirstOrDefaultAsync(a => a.Id == request.AccountId, ct)
            ?? throw new KeyNotFoundException("Account not found");

        // Expire existing subscription if any
        var existing = await _crm.WhatsappSubscriptions
            .FirstOrDefaultAsync(s => s.AccountId == request.AccountId &&
                (s.Status == "Active" || s.Status == "Trial"), ct);
        if (existing != null)
        {
            existing.Status = "Expired";
            existing.UpdatedAt = DateTime.UtcNow;
        }

        var now = DateTime.UtcNow;
        var subscription = new WhatsappSubscription
        {
            SchoolId = account.SchoolId,
            AccountId = account.Id,
            PlanId = plan.Id,
            Status = "Active",
            CurrentPeriodStart = now.Date,
            CurrentPeriodEnd = now.Date.AddMonths(1).AddDays(-1),
            MessagesUsed = 0,
            MessagesQuota = plan.MonthlyQuota,
            CarryForwardMessages = 0,
            RenewalPolicy = request.RenewalPolicy ?? "Expire",
            OveragePolicy = request.OveragePolicy ?? "Block",
            AutoRenew = request.AutoRenew,
            NextRenewalDate = now.Date.AddMonths(1).AddDays(-1),
            CreatedAt = now,
            UpdatedAt = now
        };

        _crm.WhatsappSubscriptions.Add(subscription);
        await _crm.SaveChangesAsync(ct);

        var school = await _crm.SchoolConfigs.FindAsync([account.SchoolId], ct);
        return new SchoolSubscriptionDto(
            subscription.Id, subscription.SchoolId, school?.SchoolName ?? "Unknown",
            plan.PlanName, subscription.Status,
            subscription.MessagesUsed, subscription.MessagesQuota, subscription.CurrentPeriodEnd);
    }

    public async Task<WhatsAppCostDashboard> GetCostDashboardAsync(CancellationToken ct = default)
    {
        var last12Months = Enumerable.Range(0, 12)
            .Select(i => DateTime.UtcNow.AddMonths(-i).ToString("yyyyMM"))
            .ToList();

        var monthlyCosts = await _crm.WhatsappCostTrackings
            .Where(c => last12Months.Contains(c.Period))
            .GroupBy(c => c.Period)
            .Select(g => new MonthlyRevenueDto(
                g.Key,
                g.Sum(c => c.ProviderCostInr),
                g.Sum(c => c.PlatformChargedInr),
                g.Sum(c => c.GrossProfit)))
            .OrderBy(m => m.Period)
            .ToListAsync(ct);

        var schoolCosts = await _crm.WhatsappCostTrackings
            .Include(c => c.SchoolConfig)
            .Where(c => c.Period == DateTime.UtcNow.ToString("yyyyMM"))
            .Select(c => new SchoolCostDto(
                c.SchoolId, c.SchoolConfig.SchoolName,
                c.ProviderCostInr, c.PlatformChargedInr,
                c.GrossProfit, c.GrossMarginPct))
            .OrderByDescending(c => c.Revenue)
            .ToListAsync(ct);

        var totalRevenue = monthlyCosts.Sum(m => m.Revenue);
        var totalCost = monthlyCosts.Sum(m => m.ProviderCost);
        var totalProfit = monthlyCosts.Sum(m => m.Profit);
        var avgRevenue = monthlyCosts.Count > 0 ? monthlyCosts.Average(m => m.Revenue) : 0;

        return new WhatsAppCostDashboard(
            totalCost, totalRevenue, totalProfit,
            totalRevenue > 0 ? Math.Round(totalProfit / totalRevenue * 100, 2) : 0,
            monthlyCosts, schoolCosts, avgRevenue, avgRevenue * 0.45m);
    }

    public async Task<WhatsAppPricingConfigDto> GetPricingConfigAsync(CancellationToken ct = default)
    {
        var config = await _crm.WhatsappPricingConfigs
            .Where(c => c.PlanId == null)
            .OrderByDescending(c => c.EffectiveFrom)
            .FirstOrDefaultAsync(ct);

        if (config == null)
            return new WhatsAppPricingConfigDto(0, 100m, 0m, 0m, 18m, DateTime.UtcNow);

        return new WhatsAppPricingConfigDto(
            config.Id, config.MarkupPct, config.ServiceChargeInr, config.PlatformFeeInr,
            config.GstPct, config.EffectiveFrom);
    }

    public async Task<WhatsAppPricingConfigDto> UpdatePricingConfigAsync(
        UpdatePricingConfigRequest request, CancellationToken ct = default)
    {
        var config = new WhatsappPricingConfig
        {
            PlanId = null,
            MarkupPct = request.MarkupPct,
            ServiceChargeInr = request.ServiceChargeInr,
            PlatformFeeInr = request.PlatformFeeInr,
            GstPct = request.GstPct,
            EffectiveFrom = DateTime.UtcNow,
            UpdatedBy = request.UpdatedBy,
            UpdatedAt = DateTime.UtcNow
        };
        _crm.WhatsappPricingConfigs.Add(config);
        await _crm.SaveChangesAsync(ct);
        return new WhatsAppPricingConfigDto(
            config.Id, config.MarkupPct, config.ServiceChargeInr, config.PlatformFeeInr,
            config.GstPct, config.EffectiveFrom);
    }

    public async Task<List<BillingInvoiceDto>> GetInvoicesAsync(
        int page, int pageSize, CancellationToken ct = default)
        => await _crm.WhatsappBillingInvoices
            .Include(i => i.SchoolConfig)
            .OrderByDescending(i => i.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(i => new BillingInvoiceDto(
                i.Id, i.SchoolId, i.SchoolConfig.SchoolName,
                i.PeriodStart, i.PeriodEnd, i.TotalAmountInr, i.Status))
            .ToListAsync(ct);

    public async Task<List<UpcomingRenewalDto>> GetUpcomingRenewalsAsync(
        int days = 30, CancellationToken ct = default)
    {
        var cutoff = DateTime.UtcNow.AddDays(days);
        return await _crm.WhatsappSubscriptions
            .Include(s => s.Plan)
            .Include(s => s.SchoolConfig)
            .Where(s => s.Status == "Active" && s.NextRenewalDate <= cutoff)
            .OrderBy(s => s.NextRenewalDate)
            .Select(s => new UpcomingRenewalDto(
                s.Id, s.SchoolId, s.SchoolConfig.SchoolName,
                s.NextRenewalDate ?? s.CurrentPeriodEnd,
                s.Plan.PlanName, s.Plan.BaseMonthlyPriceInr))
            .ToListAsync(ct);
    }
}

// ── Request DTOs ──────────────────────────────────────────────────────────────

public record CreateProviderRequest(string Name, string ApiBaseUrl, string? ApiVersion = null, string? WebhookVerifyToken = null);
public record CreatePlanRequest(string PlanName, int MonthlyQuota, decimal BaseMonthlyPriceInr, bool OverageAllowed = true, decimal OverageChargePerMessageInr = 1.50m, string? Description = null, bool IsCustom = false, int SortOrder = 0);
public record AssignPlanRequest(int AccountId, int PlanId, string? RenewalPolicy = null, string? OveragePolicy = null, bool AutoRenew = true);
public record UpdatePricingConfigRequest(decimal MarkupPct, decimal ServiceChargeInr, decimal PlatformFeeInr, decimal GstPct, int UpdatedBy);
