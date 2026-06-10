using System.ComponentModel.DataAnnotations;

namespace SmsApi.Models.CRM;

// ── Provider Registry ─────────────────────────────────────────────────────────

public class WhatsappProvider
{
    public int Id { get; set; }

    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(300)]
    public string ApiBaseUrl { get; set; } = "https://graph.facebook.com";

    [MaxLength(100)]
    public string ApiVersion { get; set; } = "v19.0";

    public bool IsActive { get; set; } = true;

    [MaxLength(200)]
    public string? WebhookVerifyToken { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<WhatsappProviderCost> Costs { get; set; } = new List<WhatsappProviderCost>();
    public ICollection<SchoolWhatsappAccount> SchoolAccounts { get; set; } = new List<SchoolWhatsappAccount>();
}

public class WhatsappProviderCost
{
    public int Id { get; set; }
    public int ProviderId { get; set; }

    [MaxLength(10)]
    public string CountryCode { get; set; } = "IN";

    public decimal UtilityConversationCostInr { get; set; } = 0.58m;
    public decimal AuthConversationCostInr { get; set; } = 0.45m;
    public decimal MarketingConversationCostInr { get; set; } = 1.50m;
    public decimal ServiceConversationCostInr { get; set; } = 0m;

    public DateTime EffectiveFrom { get; set; } = DateTime.UtcNow;
    public DateTime? EffectiveTo { get; set; }

    public WhatsappProvider Provider { get; set; } = null!;
}

// ── School WhatsApp Account ───────────────────────────────────────────────────

public class SchoolWhatsappAccount
{
    public int Id { get; set; }
    public int SchoolId { get; set; }
    public int ProviderId { get; set; }

    /// <summary>A = Shared Vitana number; B = School-owned WABA</summary>
    [MaxLength(1)]
    public string Mode { get; set; } = "A";

    [MaxLength(100)]
    public string? WabaId { get; set; }

    [MaxLength(100)]
    public string? PhoneNumberId { get; set; }

    /// <summary>Stored AES-256 encrypted. Decrypt before use.</summary>
    [MaxLength(2000)]
    public string? AccessTokenEncrypted { get; set; }

    [MaxLength(30)]
    public string? DisplayPhoneNumber { get; set; }

    [MaxLength(200)]
    public string? BusinessName { get; set; }

    public bool IsActive { get; set; } = false;
    public DateTime? ActivatedAt { get; set; }
    public DateTime? DeactivatedAt { get; set; }

    [MaxLength(500)]
    public string? WebhookSecretEncrypted { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public SchoolConfig SchoolConfig { get; set; } = null!;
    public WhatsappProvider Provider { get; set; } = null!;
    public WhatsappSubscription? Subscription { get; set; }
}

// ── Subscription Plans ────────────────────────────────────────────────────────

public class WhatsappPlan
{
    public int Id { get; set; }

    [Required, MaxLength(100)]
    public string PlanName { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    public int MonthlyQuota { get; set; }
    public bool OverageAllowed { get; set; } = true;
    public decimal OverageChargePerMessageInr { get; set; } = 1.50m;
    public decimal BaseMonthlyPriceInr { get; set; }
    public bool IsCustom { get; set; } = false;
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; } = 0;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<WhatsappSubscription> Subscriptions { get; set; } = new List<WhatsappSubscription>();
}

// ── School Subscription ───────────────────────────────────────────────────────

public class WhatsappSubscription
{
    public int Id { get; set; }
    public int SchoolId { get; set; }
    public int AccountId { get; set; }
    public int PlanId { get; set; }

    [MaxLength(30)]
    public string Status { get; set; } = "Active";
    // Active | Suspended | Expired | Trial | PendingRenewal

    public DateTime CurrentPeriodStart { get; set; }
    public DateTime CurrentPeriodEnd { get; set; }

    public int MessagesUsed { get; set; } = 0;
    public int MessagesQuota { get; set; }
    public int CarryForwardMessages { get; set; } = 0;

    [MaxLength(30)]
    public string RenewalPolicy { get; set; } = "Expire";
    // Expire | CarryForward | LimitedCarryForward | Unlimited | Hybrid

    public int? CarryForwardMonths { get; set; }

    [MaxLength(20)]
    public string OveragePolicy { get; set; } = "Block";
    // Block | Charge

    public bool AutoRenew { get; set; } = true;
    public DateTime? NextRenewalDate { get; set; }
    public DateTime? SuspendedAt { get; set; }
    public string? SuspendedReason { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public SchoolConfig SchoolConfig { get; set; } = null!;
    public WhatsappPlan Plan { get; set; } = null!;
    public SchoolWhatsappAccount Account { get; set; } = null!;
    public ICollection<WhatsappBillingInvoice> Invoices { get; set; } = new List<WhatsappBillingInvoice>();
}

// ── Billing Invoices ──────────────────────────────────────────────────────────

public class WhatsappBillingInvoice
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public int SchoolId { get; set; }
    public int SubscriptionId { get; set; }

    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }

    public decimal BaseAmountInr { get; set; }
    public decimal OverageAmountInr { get; set; }
    public decimal GstInr { get; set; }
    public decimal TotalAmountInr { get; set; }

    public int MessagesIncluded { get; set; }
    public int MessagesUsed { get; set; }
    public int OverageMessages { get; set; }

    [MaxLength(30)]
    public string Status { get; set; } = "Draft";
    // Draft | Issued | Paid | Overdue

    public DateTime? IssuedAt { get; set; }
    public DateTime? PaidAt { get; set; }
    public DateTime? DueDate { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public SchoolConfig SchoolConfig { get; set; } = null!;
    public WhatsappSubscription Subscription { get; set; } = null!;
}

// ── Cost & Profit Tracking ────────────────────────────────────────────────────

public class WhatsappCostTracking
{
    public int Id { get; set; }
    public int SchoolId { get; set; }

    [MaxLength(6)]
    public string Period { get; set; } = string.Empty; // YYYYMM

    public int TotalMessagesDelivered { get; set; }
    public int ProviderConversations { get; set; }
    public decimal ProviderCostInr { get; set; }
    public decimal PlatformChargedInr { get; set; }
    public decimal GrossProfit { get; set; }
    public decimal GrossMarginPct { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public SchoolConfig SchoolConfig { get; set; } = null!;
}

// ── Renewal Ledger ────────────────────────────────────────────────────────────

public class WhatsappRenewalLedger
{
    public int Id { get; set; }
    public int SchoolId { get; set; }
    public int SubscriptionId { get; set; }

    [MaxLength(30)]
    public string RenewalType { get; set; } = "Renewal";
    // Renewal | Expiry | Rollover | Overage | Adjustment

    public int PreviousBalance { get; set; }
    public int AddedMessages { get; set; }
    public int ExpiredMessages { get; set; }
    public int NewBalance { get; set; }

    public DateTime ProcessedAt { get; set; } = DateTime.UtcNow;

    [MaxLength(500)]
    public string? Notes { get; set; }

    public SchoolConfig SchoolConfig { get; set; } = null!;
}

// ── Platform Pricing Configuration ───────────────────────────────────────────

public class WhatsappPricingConfig
{
    public int Id { get; set; }
    public int? PlanId { get; set; } // null = global default

    public decimal MarkupPct { get; set; } = 100m;
    public decimal ServiceChargeInr { get; set; } = 0m;
    public decimal PlatformFeeInr { get; set; } = 0m;
    public decimal GstPct { get; set; } = 18m;

    public DateTime EffectiveFrom { get; set; } = DateTime.UtcNow;
    public int UpdatedBy { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
