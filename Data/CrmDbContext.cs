using Microsoft.EntityFrameworkCore;
using SmsApi.Models.CRM;

namespace SmsApi.Data
{
    public class CrmDbContext : DbContext
    {
        public CrmDbContext(DbContextOptions<CrmDbContext> options) : base(options)
        {
        }

        public DbSet<SchoolConfig> SchoolConfigs { get; set; }
        public DbSet<SchoolBilling> SchoolBillings { get; set; }
        public DbSet<SchoolBillPayment> SchoolBillPayments { get; set; }

        // ── WhatsApp Communication Hub (Platform-Level) ──────────────────────
        public DbSet<WhatsappProvider> WhatsappProviders { get; set; }
        public DbSet<WhatsappProviderCost> WhatsappProviderCosts { get; set; }
        public DbSet<SchoolWhatsappAccount> SchoolWhatsappAccounts { get; set; }
        public DbSet<WhatsappPlan> WhatsappPlans { get; set; }
        public DbSet<WhatsappSubscription> WhatsappSubscriptions { get; set; }
        public DbSet<WhatsappBillingInvoice> WhatsappBillingInvoices { get; set; }
        public DbSet<WhatsappCostTracking> WhatsappCostTrackings { get; set; }
        public DbSet<WhatsappRenewalLedger> WhatsappRenewalLedgers { get; set; }
        public DbSet<WhatsappPricingConfig> WhatsappPricingConfigs { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // SchoolConfig
            modelBuilder.Entity<SchoolConfig>(entity =>
            {
                entity.ToTable("SchoolConfig");
                entity.HasKey(e => e.SchoolId);
                entity.Property(e => e.SchoolId).ValueGeneratedOnAdd();
                entity.Property(e => e.SchoolName).IsRequired().HasMaxLength(200);
                entity.Property(e => e.SchoolShortName).IsRequired().HasMaxLength(50);
                entity.Property(e => e.SchoolDomain).IsRequired().HasMaxLength(200);
                entity.Property(e => e.DBServer).IsRequired().HasMaxLength(200);
                entity.Property(e => e.DBName).IsRequired().HasMaxLength(200);
            });

            // SchoolBilling
            modelBuilder.Entity<SchoolBilling>(entity =>
            {
                entity.ToTable("SchoolBilling");
                entity.HasKey(e => e.SchoolBillId);
                entity.Property(e => e.SchoolBillId).HasDefaultValueSql("NEWID()");
                entity.Property(e => e.Amount).HasColumnType("decimal(18,2)");

                entity.HasOne(e => e.SchoolConfig)
                      .WithMany(s => s.SchoolBillings)
                      .HasForeignKey(e => e.SchoolId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            // SchoolBillPayment
            modelBuilder.Entity<SchoolBillPayment>(entity =>
            {
                entity.ToTable("SchoolBillPayment");
                entity.HasKey(e => e.SchoolBillPaymentId);
                entity.Property(e => e.SchoolBillPaymentId).HasDefaultValueSql("NEWID()");
                entity.Property(e => e.Amount).HasColumnType("decimal(18,2)");
                entity.Property(e => e.PaymentMode).IsRequired().HasMaxLength(100);
                entity.Property(e => e.CollectedBy).IsRequired().HasMaxLength(200);
                entity.Property(e => e.AddedDate)
                      .HasDefaultValueSql("GETDATE()");

                entity.HasOne(e => e.SchoolBilling)
                      .WithMany(b => b.SchoolBillPayments)
                      .HasForeignKey(e => e.SchoolBillId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            // ── WhatsApp Provider ────────────────────────────────────────────
            modelBuilder.Entity<WhatsappProvider>(entity =>
            {
                entity.ToTable("WhatsappProviders");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).ValueGeneratedOnAdd();
                entity.Property(e => e.ApiBaseUrl).HasMaxLength(300);
                entity.Property(e => e.ApiVersion).HasMaxLength(100);
                entity.Property(e => e.WebhookVerifyToken).HasMaxLength(200);
            });

            modelBuilder.Entity<WhatsappProviderCost>(entity =>
            {
                entity.ToTable("WhatsappProviderCosts");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).ValueGeneratedOnAdd();
                entity.Property(e => e.UtilityConversationCostInr).HasColumnType("decimal(10,4)");
                entity.Property(e => e.AuthConversationCostInr).HasColumnType("decimal(10,4)");
                entity.Property(e => e.MarketingConversationCostInr).HasColumnType("decimal(10,4)");
                entity.Property(e => e.ServiceConversationCostInr).HasColumnType("decimal(10,4)");
                entity.HasOne(e => e.Provider)
                      .WithMany(p => p.Costs)
                      .HasForeignKey(e => e.ProviderId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // ── School WhatsApp Account ──────────────────────────────────────
            modelBuilder.Entity<SchoolWhatsappAccount>(entity =>
            {
                entity.ToTable("SchoolWhatsappAccounts");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).ValueGeneratedOnAdd();
                entity.Property(e => e.AccessTokenEncrypted).HasMaxLength(2000);
                entity.Property(e => e.WebhookSecretEncrypted).HasMaxLength(500);
                entity.HasOne(e => e.SchoolConfig)
                      .WithMany()
                      .HasForeignKey(e => e.SchoolId)
                      .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Provider)
                      .WithMany(p => p.SchoolAccounts)
                      .HasForeignKey(e => e.ProviderId)
                      .OnDelete(DeleteBehavior.Restrict);
                entity.HasIndex(e => e.SchoolId);
            });

            // ── WhatsApp Plans ───────────────────────────────────────────────
            modelBuilder.Entity<WhatsappPlan>(entity =>
            {
                entity.ToTable("WhatsappPlans");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).ValueGeneratedOnAdd();
                entity.Property(e => e.BaseMonthlyPriceInr).HasColumnType("decimal(10,2)");
                entity.Property(e => e.OverageChargePerMessageInr).HasColumnType("decimal(10,4)");
            });

            // ── Subscriptions ────────────────────────────────────────────────
            modelBuilder.Entity<WhatsappSubscription>(entity =>
            {
                entity.ToTable("WhatsappSubscriptions");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).ValueGeneratedOnAdd();
                entity.HasOne(e => e.SchoolConfig)
                      .WithMany()
                      .HasForeignKey(e => e.SchoolId)
                      .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Plan)
                      .WithMany(p => p.Subscriptions)
                      .HasForeignKey(e => e.PlanId)
                      .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Account)
                      .WithOne(a => a.Subscription)
                      .HasForeignKey<WhatsappSubscription>(e => e.AccountId)
                      .OnDelete(DeleteBehavior.Restrict);
                entity.HasIndex(e => new { e.SchoolId, e.Status });
                entity.HasIndex(e => e.NextRenewalDate);
            });

            // ── Billing Invoices ─────────────────────────────────────────────
            modelBuilder.Entity<WhatsappBillingInvoice>(entity =>
            {
                entity.ToTable("WhatsappBillingInvoices");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasDefaultValueSql("NEWID()");
                entity.Property(e => e.BaseAmountInr).HasColumnType("decimal(12,2)");
                entity.Property(e => e.OverageAmountInr).HasColumnType("decimal(12,2)");
                entity.Property(e => e.GstInr).HasColumnType("decimal(12,2)");
                entity.Property(e => e.TotalAmountInr).HasColumnType("decimal(12,2)");
                entity.HasOne(e => e.SchoolConfig)
                      .WithMany()
                      .HasForeignKey(e => e.SchoolId)
                      .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Subscription)
                      .WithMany(s => s.Invoices)
                      .HasForeignKey(e => e.SubscriptionId)
                      .OnDelete(DeleteBehavior.Restrict);
                entity.HasIndex(e => new { e.SchoolId, e.Status });
            });

            // ── Cost Tracking ────────────────────────────────────────────────
            modelBuilder.Entity<WhatsappCostTracking>(entity =>
            {
                entity.ToTable("WhatsappCostTrackings");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).ValueGeneratedOnAdd();
                entity.Property(e => e.ProviderCostInr).HasColumnType("decimal(12,4)");
                entity.Property(e => e.PlatformChargedInr).HasColumnType("decimal(12,2)");
                entity.Property(e => e.GrossProfit).HasColumnType("decimal(12,2)");
                entity.Property(e => e.GrossMarginPct).HasColumnType("decimal(6,2)");
                entity.HasOne(e => e.SchoolConfig)
                      .WithMany()
                      .HasForeignKey(e => e.SchoolId)
                      .OnDelete(DeleteBehavior.Restrict);
                entity.HasIndex(e => new { e.SchoolId, e.Period }).IsUnique();
            });

            // ── Renewal Ledger ───────────────────────────────────────────────
            modelBuilder.Entity<WhatsappRenewalLedger>(entity =>
            {
                entity.ToTable("WhatsappRenewalLedgers");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).ValueGeneratedOnAdd();
                entity.HasOne(e => e.SchoolConfig)
                      .WithMany()
                      .HasForeignKey(e => e.SchoolId)
                      .OnDelete(DeleteBehavior.Restrict);
                entity.HasIndex(e => new { e.SchoolId, e.ProcessedAt });
            });

            // ── Pricing Config ───────────────────────────────────────────────
            modelBuilder.Entity<WhatsappPricingConfig>(entity =>
            {
                entity.ToTable("WhatsappPricingConfigs");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).ValueGeneratedOnAdd();
                entity.Property(e => e.MarkupPct).HasColumnType("decimal(6,2)");
                entity.Property(e => e.ServiceChargeInr).HasColumnType("decimal(10,2)");
                entity.Property(e => e.PlatformFeeInr).HasColumnType("decimal(10,2)");
                entity.Property(e => e.GstPct).HasColumnType("decimal(5,2)");
            });
        }
    }
}

