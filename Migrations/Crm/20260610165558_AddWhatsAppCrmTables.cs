using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmsApi.Migrations.Crm
{
    /// <inheritdoc />
    public partial class AddWhatsAppCrmTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "WhatsappCostTrackings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SchoolId = table.Column<int>(type: "int", nullable: false),
                    Period = table.Column<string>(type: "nvarchar(6)", maxLength: 6, nullable: false),
                    TotalMessagesDelivered = table.Column<int>(type: "int", nullable: false),
                    ProviderConversations = table.Column<int>(type: "int", nullable: false),
                    ProviderCostInr = table.Column<decimal>(type: "decimal(12,4)", nullable: false),
                    PlatformChargedInr = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    GrossProfit = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    GrossMarginPct = table.Column<decimal>(type: "decimal(6,2)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WhatsappCostTrackings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WhatsappCostTrackings_SchoolConfig_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "SchoolConfig",
                        principalColumn: "SchoolId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "WhatsappPlans",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PlanName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    MonthlyQuota = table.Column<int>(type: "int", nullable: false),
                    OverageAllowed = table.Column<bool>(type: "bit", nullable: false),
                    OverageChargePerMessageInr = table.Column<decimal>(type: "decimal(10,4)", nullable: false),
                    BaseMonthlyPriceInr = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    IsCustom = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WhatsappPlans", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "WhatsappPricingConfigs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PlanId = table.Column<int>(type: "int", nullable: true),
                    MarkupPct = table.Column<decimal>(type: "decimal(6,2)", nullable: false),
                    ServiceChargeInr = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    PlatformFeeInr = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    GstPct = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    EffectiveFrom = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedBy = table.Column<int>(type: "int", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WhatsappPricingConfigs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "WhatsappProviders",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ApiBaseUrl = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    ApiVersion = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    WebhookVerifyToken = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WhatsappProviders", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "WhatsappRenewalLedgers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SchoolId = table.Column<int>(type: "int", nullable: false),
                    SubscriptionId = table.Column<int>(type: "int", nullable: false),
                    RenewalType = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    PreviousBalance = table.Column<int>(type: "int", nullable: false),
                    AddedMessages = table.Column<int>(type: "int", nullable: false),
                    ExpiredMessages = table.Column<int>(type: "int", nullable: false),
                    NewBalance = table.Column<int>(type: "int", nullable: false),
                    ProcessedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WhatsappRenewalLedgers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WhatsappRenewalLedgers_SchoolConfig_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "SchoolConfig",
                        principalColumn: "SchoolId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SchoolWhatsappAccounts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SchoolId = table.Column<int>(type: "int", nullable: false),
                    ProviderId = table.Column<int>(type: "int", nullable: false),
                    Mode = table.Column<string>(type: "nvarchar(1)", maxLength: 1, nullable: false),
                    WabaId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    PhoneNumberId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    AccessTokenEncrypted = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    DisplayPhoneNumber = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    BusinessName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    ActivatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeactivatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    WebhookSecretEncrypted = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SchoolWhatsappAccounts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SchoolWhatsappAccounts_SchoolConfig_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "SchoolConfig",
                        principalColumn: "SchoolId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SchoolWhatsappAccounts_WhatsappProviders_ProviderId",
                        column: x => x.ProviderId,
                        principalTable: "WhatsappProviders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "WhatsappProviderCosts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProviderId = table.Column<int>(type: "int", nullable: false),
                    CountryCode = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    UtilityConversationCostInr = table.Column<decimal>(type: "decimal(10,4)", nullable: false),
                    AuthConversationCostInr = table.Column<decimal>(type: "decimal(10,4)", nullable: false),
                    MarketingConversationCostInr = table.Column<decimal>(type: "decimal(10,4)", nullable: false),
                    ServiceConversationCostInr = table.Column<decimal>(type: "decimal(10,4)", nullable: false),
                    EffectiveFrom = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EffectiveTo = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WhatsappProviderCosts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WhatsappProviderCosts_WhatsappProviders_ProviderId",
                        column: x => x.ProviderId,
                        principalTable: "WhatsappProviders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WhatsappSubscriptions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SchoolId = table.Column<int>(type: "int", nullable: false),
                    AccountId = table.Column<int>(type: "int", nullable: false),
                    PlanId = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    CurrentPeriodStart = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CurrentPeriodEnd = table.Column<DateTime>(type: "datetime2", nullable: false),
                    MessagesUsed = table.Column<int>(type: "int", nullable: false),
                    MessagesQuota = table.Column<int>(type: "int", nullable: false),
                    CarryForwardMessages = table.Column<int>(type: "int", nullable: false),
                    RenewalPolicy = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    CarryForwardMonths = table.Column<int>(type: "int", nullable: true),
                    OveragePolicy = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    AutoRenew = table.Column<bool>(type: "bit", nullable: false),
                    NextRenewalDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    SuspendedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    SuspendedReason = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WhatsappSubscriptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WhatsappSubscriptions_SchoolConfig_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "SchoolConfig",
                        principalColumn: "SchoolId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_WhatsappSubscriptions_SchoolWhatsappAccounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "SchoolWhatsappAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_WhatsappSubscriptions_WhatsappPlans_PlanId",
                        column: x => x.PlanId,
                        principalTable: "WhatsappPlans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "WhatsappBillingInvoices",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    SchoolId = table.Column<int>(type: "int", nullable: false),
                    SubscriptionId = table.Column<int>(type: "int", nullable: false),
                    PeriodStart = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PeriodEnd = table.Column<DateTime>(type: "datetime2", nullable: false),
                    BaseAmountInr = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    OverageAmountInr = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    GstInr = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    TotalAmountInr = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    MessagesIncluded = table.Column<int>(type: "int", nullable: false),
                    MessagesUsed = table.Column<int>(type: "int", nullable: false),
                    OverageMessages = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    IssuedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PaidAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DueDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WhatsappBillingInvoices", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WhatsappBillingInvoices_SchoolConfig_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "SchoolConfig",
                        principalColumn: "SchoolId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_WhatsappBillingInvoices_WhatsappSubscriptions_SubscriptionId",
                        column: x => x.SubscriptionId,
                        principalTable: "WhatsappSubscriptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SchoolWhatsappAccounts_ProviderId",
                table: "SchoolWhatsappAccounts",
                column: "ProviderId");

            migrationBuilder.CreateIndex(
                name: "IX_SchoolWhatsappAccounts_SchoolId",
                table: "SchoolWhatsappAccounts",
                column: "SchoolId");

            migrationBuilder.CreateIndex(
                name: "IX_WhatsappBillingInvoices_SchoolId_Status",
                table: "WhatsappBillingInvoices",
                columns: new[] { "SchoolId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_WhatsappBillingInvoices_SubscriptionId",
                table: "WhatsappBillingInvoices",
                column: "SubscriptionId");

            migrationBuilder.CreateIndex(
                name: "IX_WhatsappCostTrackings_SchoolId_Period",
                table: "WhatsappCostTrackings",
                columns: new[] { "SchoolId", "Period" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WhatsappProviderCosts_ProviderId",
                table: "WhatsappProviderCosts",
                column: "ProviderId");

            migrationBuilder.CreateIndex(
                name: "IX_WhatsappRenewalLedgers_SchoolId_ProcessedAt",
                table: "WhatsappRenewalLedgers",
                columns: new[] { "SchoolId", "ProcessedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_WhatsappSubscriptions_AccountId",
                table: "WhatsappSubscriptions",
                column: "AccountId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WhatsappSubscriptions_NextRenewalDate",
                table: "WhatsappSubscriptions",
                column: "NextRenewalDate");

            migrationBuilder.CreateIndex(
                name: "IX_WhatsappSubscriptions_PlanId",
                table: "WhatsappSubscriptions",
                column: "PlanId");

            migrationBuilder.CreateIndex(
                name: "IX_WhatsappSubscriptions_SchoolId_Status",
                table: "WhatsappSubscriptions",
                columns: new[] { "SchoolId", "Status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WhatsappBillingInvoices");

            migrationBuilder.DropTable(
                name: "WhatsappCostTrackings");

            migrationBuilder.DropTable(
                name: "WhatsappPricingConfigs");

            migrationBuilder.DropTable(
                name: "WhatsappProviderCosts");

            migrationBuilder.DropTable(
                name: "WhatsappRenewalLedgers");

            migrationBuilder.DropTable(
                name: "WhatsappSubscriptions");

            migrationBuilder.DropTable(
                name: "SchoolWhatsappAccounts");

            migrationBuilder.DropTable(
                name: "WhatsappPlans");

            migrationBuilder.DropTable(
                name: "WhatsappProviders");
        }
    }
}
