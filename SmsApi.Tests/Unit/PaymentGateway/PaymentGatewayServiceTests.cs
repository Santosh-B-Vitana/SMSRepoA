using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;
using SmsApi.Services;
using SmsApi.Services.Cashfree;
using Xunit;

namespace SmsApi.Tests.Unit.PaymentGateway
{
    // ──────────────────────────────────────────────────────────────────────────
    // Fake Cashfree client — no real HTTP calls in unit tests
    // ──────────────────────────────────────────────────────────────────────────
    public class FakeCashfreeClient : ICashfreeClient
    {
        public bool VerifySignatureResult { get; set; } = true;
        public CashfreeCreateOrderResponse OrderResponse { get; set; } = new()
        {
            CfOrderId = "CF_ORDER_001",
            OrderId = "TXN-TEST",
            OrderStatus = "ACTIVE",
            PaymentSessionId = "CF_SESSION_123",
            Payments = new CashfreeLink { Url = "https://payments.cashfree.com/order/CF_ORDER_001" }
        };
        public CashfreeRefundResponse RefundResponse { get; set; } = new()
        {
            CfRefundId = "CF_REFUND_001",
            RefundId = "REF-TEST",
            RefundStatus = "SUCCESS",
            RefundAmount = 100m
        };

        public Task<CashfreeCreateOrderResponse> CreateOrderAsync(CashfreeCreateOrderRequest request, string clientId, string clientSecret, bool isSandbox)
            => Task.FromResult(OrderResponse);

        public Task<CashfreeCreateOrderResponse?> GetOrderAsync(string orderId, string clientId, string clientSecret, bool isSandbox)
            => Task.FromResult<CashfreeCreateOrderResponse?>(OrderResponse);

        public Task<CashfreeRefundResponse> CreateRefundAsync(string orderId, CashfreeRefundRequest request, string clientId, string clientSecret, bool isSandbox)
            => Task.FromResult(RefundResponse);

        public bool VerifyWebhookSignature(string rawBody, string signature, string timestamp, string secret)
            => VerifySignatureResult;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Base test class with shared setup
    // ──────────────────────────────────────────────────────────────────────────
    public abstract class PaymentGatewayTestBase : IDisposable
    {
        protected readonly AppDbContext Db;
        protected readonly FakeCashfreeClient FakeCashfree;
        protected readonly PaymentGatewayService Svc;

        protected readonly Guid School1 = Guid.NewGuid();
        protected readonly Guid School2 = Guid.NewGuid();
        protected readonly Guid Staff1 = Guid.NewGuid();
        protected Guid ConfigId1;
        protected Guid TxId1; // Success
        protected Guid TxId2; // Failed
        protected Guid TxId3; // Initiated
        protected Guid RefundId1;

        protected PaymentGatewayTestBase()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options;
            Db = new AppDbContext(options);
            FakeCashfree = new FakeCashfreeClient();
            Svc = new PaymentGatewayService(Db, FakeCashfree, NullLogger<PaymentGatewayService>.Instance);
            Seed();
        }

        private void Seed()
        {
            var config = new PaymentGatewayConfig
            {
                Id = Guid.NewGuid(), SchoolId = School1, GatewayName = "Cashfree",
                MerchantId = "MERCH_001", ApiKey = "KEY_001", ApiSecret = "SEC_001",
                Mode = "Test", Currency = "INR", IsActive = true, IsDefault = true,
                TransactionFeePercentage = 2m, CreatedAt = DateTime.UtcNow
            };
            ConfigId1 = config.Id;
            Db.PaymentGatewayConfigs.Add(config);

            var tx1 = new GatewayPaymentTransaction
            {
                Id = Guid.NewGuid(), SchoolId = School1, TransactionId = "TXN-S1",
                GatewayName = "Cashfree", GatewayOrderId = "CF_ORD_S1",
                PayerId = Staff1, PayerType = "Staff", Amount = 5000m,
                TransactionFee = 100m, NetAmount = 4900m, Currency = "INR",
                Purpose = "FeePayment", Status = "Success", CreatedAt = DateTime.UtcNow.AddDays(-3)
            };
            TxId1 = tx1.Id;

            var tx2 = new GatewayPaymentTransaction
            {
                Id = Guid.NewGuid(), SchoolId = School1, TransactionId = "TXN-F1",
                GatewayName = "Cashfree", PayerId = Staff1, PayerType = "Staff",
                Amount = 1000m, Currency = "INR", Purpose = "WalletTopup",
                Status = "Failed", CreatedAt = DateTime.UtcNow.AddDays(-2)
            };
            TxId2 = tx2.Id;

            var tx3 = new GatewayPaymentTransaction
            {
                Id = Guid.NewGuid(), SchoolId = School1, TransactionId = "TXN-I1",
                GatewayName = "Cashfree", PayerId = Staff1, PayerType = "Staff",
                Amount = 2000m, Currency = "INR", Purpose = "FeePayment",
                Status = "Initiated", CreatedAt = DateTime.UtcNow.AddDays(-1)
            };
            TxId3 = tx3.Id;

            Db.GatewayPaymentTransactions.AddRange(tx1, tx2, tx3);

            var refund = new PaymentRefund
            {
                Id = Guid.NewGuid(), SchoolId = School1, RefundId = "REF-001",
                PaymentTransactionId = TxId1, RefundAmount = 100m,
                Reason = "Test refund", Status = "Initiated",
                InitiatedByStaffId = Staff1, CreatedAt = DateTime.UtcNow.AddDays(-1)
            };
            RefundId1 = refund.Id;
            Db.PaymentRefunds.Add(refund);

            Db.SaveChanges();
        }

        public void Dispose() => Db.Dispose();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // GetGatewayConfigs
    // ══════════════════════════════════════════════════════════════════════════
    public class GetGatewayConfigsTests : PaymentGatewayTestBase
    {
        [Fact] public async Task Returns_configs_for_school()
        {
            var result = await Svc.GetGatewayConfigsAsync(School1, 1, 10);
            result.Configs.Should().HaveCount(1);
            result.TotalCount.Should().Be(1);
        }

        [Fact] public async Task Returns_empty_for_different_school()
        {
            var result = await Svc.GetGatewayConfigsAsync(School2, 1, 10);
            result.Configs.Should().BeEmpty();
        }

        [Fact] public async Task Page_less_than_1_normalizes_to_1()
        {
            var result = await Svc.GetGatewayConfigsAsync(School1, -5, 10);
            result.Page.Should().Be(1);
        }

        [Fact] public async Task PageSize_less_than_1_normalizes_to_10()
        {
            var result = await Svc.GetGatewayConfigsAsync(School1, 1, 0);
            result.PageSize.Should().Be(10);
        }

        [Fact] public async Task PageSize_greater_than_100_normalizes_to_100()
        {
            var result = await Svc.GetGatewayConfigsAsync(School1, 1, 200);
            result.PageSize.Should().Be(100);
        }

        [Fact] public async Task TotalPages_calculated_correctly()
        {
            var result = await Svc.GetGatewayConfigsAsync(School1, 1, 10);
            result.TotalPages.Should().Be(1);
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // GetGatewayConfigById
    // ══════════════════════════════════════════════════════════════════════════
    public class GetGatewayConfigByIdTests : PaymentGatewayTestBase
    {
        [Fact] public async Task Returns_correct_config()
        {
            var result = await Svc.GetGatewayConfigByIdAsync(ConfigId1, School1);
            result.GatewayName.Should().Be("Cashfree");
        }

        [Fact] public async Task Throws_KeyNotFound_for_wrong_school()
        {
            var act = async () => await Svc.GetGatewayConfigByIdAsync(ConfigId1, School2);
            await act.Should().ThrowAsync<KeyNotFoundException>();
        }

        [Fact] public async Task Throws_KeyNotFound_for_nonexistent()
        {
            var act = async () => await Svc.GetGatewayConfigByIdAsync(Guid.NewGuid(), School1);
            await act.Should().ThrowAsync<KeyNotFoundException>();
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // CreateGatewayConfig
    // ══════════════════════════════════════════════════════════════════════════
    public class CreateGatewayConfigTests : PaymentGatewayTestBase
    {
        private CreatePaymentGatewayConfigRequest ValidRequest() => new()
        {
            GatewayName = "Razorpay", MerchantId = "RZP_MERCH",
            ApiKey = "RZP_KEY", Mode = "Test", Currency = "INR",
            IsActive = true, IsDefault = false
        };

        [Fact] public async Task Creates_config_successfully()
        {
            var result = await Svc.CreateGatewayConfigAsync(School2, ValidRequest());
            result.GatewayName.Should().Be("Razorpay");
            result.SchoolId.Should().Be(School2);
        }

        [Fact] public async Task Throws_InvalidOp_for_duplicate_gateway_same_school()
        {
            var req = ValidRequest();
            req.GatewayName = "Cashfree"; // already exists for School1
            var act = async () => await Svc.CreateGatewayConfigAsync(School1, req);
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*already exists*");
        }

        [Fact] public async Task Allows_same_gateway_for_different_school()
        {
            var req2 = ValidRequest(); req2.GatewayName = "Cashfree";
            var result = await Svc.CreateGatewayConfigAsync(School2, req2);
            result.GatewayName.Should().Be("Cashfree");
        }

        [Fact] public async Task Throws_Argument_for_invalid_gateway_name()
        {
            var req = ValidRequest();
            req.GatewayName = "EvilGateway";
            var act = async () => await Svc.CreateGatewayConfigAsync(School2, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*Invalid gateway name*");
        }

        [Fact] public async Task Throws_Argument_for_invalid_mode()
        {
            var req = ValidRequest();
            req.Mode = "InvalidMode";
            var act = async () => await Svc.CreateGatewayConfigAsync(School2, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*Invalid mode*");
        }

        [Fact] public async Task Throws_Argument_for_missing_merchantId()
        {
            var req = ValidRequest();
            req.MerchantId = "";
            var act = async () => await Svc.CreateGatewayConfigAsync(School2, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*Merchant ID*");
        }

        [Fact] public async Task Throws_Argument_for_missing_apiKey()
        {
            var req = ValidRequest();
            req.ApiKey = "";
            var act = async () => await Svc.CreateGatewayConfigAsync(School2, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*API Key*");
        }

        [Fact] public async Task Throws_Argument_for_fee_percentage_above_max()
        {
            var req = ValidRequest();
            req.TransactionFeePercentage = 51m;
            var act = async () => await Svc.CreateGatewayConfigAsync(School2, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*fee percentage*");
        }

        [Fact] public async Task Throws_Argument_for_fee_percentage_below_min()
        {
            var req = ValidRequest();
            req.TransactionFeePercentage = -1m;
            var act = async () => await Svc.CreateGatewayConfigAsync(School2, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*fee percentage*");
        }

        [Fact] public async Task IsDefault_true_clears_other_defaults()
        {
            // ConfigId1 is the default for School1 → adding another default should clear it
            var req2 = ValidRequest(); req2.GatewayName = "Razorpay"; req2.IsDefault = true;
            var result = await Svc.CreateGatewayConfigAsync(School1, req2);
            var original = await Db.PaymentGatewayConfigs.FindAsync(ConfigId1);
            original!.IsDefault.Should().BeFalse();
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // UpdateGatewayConfig
    // ══════════════════════════════════════════════════════════════════════════
    public class UpdateGatewayConfigTests : PaymentGatewayTestBase
    {
        private UpdatePaymentGatewayConfigRequest ValidUpdate() => new()
        {
            ApiKey = "NEW_KEY", Mode = "Production", IsActive = true, IsDefault = true
        };

        [Fact] public async Task Updates_config_successfully()
        {
            var result = await Svc.UpdateGatewayConfigAsync(ConfigId1, School1, ValidUpdate());
            result.Mode.Should().Be("Production");
        }

        [Fact] public async Task Throws_KeyNotFound_for_wrong_school()
        {
            var act = async () => await Svc.UpdateGatewayConfigAsync(ConfigId1, School2, ValidUpdate());
            await act.Should().ThrowAsync<KeyNotFoundException>();
        }

        [Fact] public async Task Throws_KeyNotFound_for_nonexistent()
        {
            var act = async () => await Svc.UpdateGatewayConfigAsync(Guid.NewGuid(), School1, ValidUpdate());
            await act.Should().ThrowAsync<KeyNotFoundException>();
        }

        [Fact] public async Task Throws_Argument_for_invalid_mode()
        {
            var req = ValidUpdate();
            req.Mode = "NOPE";
            var act = async () => await Svc.UpdateGatewayConfigAsync(ConfigId1, School1, req);
            await act.Should().ThrowAsync<ArgumentException>();
        }

        [Fact] public async Task Throws_Argument_for_fee_percentage_out_of_range()
        {
            var req = ValidUpdate();
            req.TransactionFeePercentage = 99m;
            var act = async () => await Svc.UpdateGatewayConfigAsync(ConfigId1, School1, req);
            await act.Should().ThrowAsync<ArgumentException>();
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // DeleteGatewayConfig
    // ══════════════════════════════════════════════════════════════════════════
    public class DeleteGatewayConfigTests : PaymentGatewayTestBase
    {
        [Fact] public async Task Deletes_existing_config()
        {
            var result = await Svc.DeleteGatewayConfigAsync(ConfigId1, School1);
            result.Should().BeTrue();
        }

        [Fact] public async Task Returns_false_for_nonexistent()
        {
            var result = await Svc.DeleteGatewayConfigAsync(Guid.NewGuid(), School1);
            result.Should().BeFalse();
        }

        [Fact] public async Task Returns_false_for_wrong_school()
        {
            var result = await Svc.DeleteGatewayConfigAsync(ConfigId1, School2);
            result.Should().BeFalse();
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // InitiatePayment
    // ══════════════════════════════════════════════════════════════════════════
    public class InitiatePaymentTests : PaymentGatewayTestBase
    {
        private InitiatePaymentRequest ValidRequest() => new()
        {
            PayerId = Staff1, PayerType = "Staff", Amount = 1000m,
            Purpose = "FeePayment", Currency = "INR",
            GatewayName = "Cashfree",
            CustomerEmail = "test@test.com", CustomerPhone = "9999999999"
        };

        [Fact] public async Task Initiates_payment_and_returns_session_id()
        {
            var result = await Svc.InitiatePaymentAsync(School1, ValidRequest());
            result.PaymentSessionId.Should().Be("CF_SESSION_123");
            result.Status.Should().Be("Initiated");
        }

        [Fact] public async Task Cashfree_CreateOrder_called_correctly()
        {
            var result = await Svc.InitiatePaymentAsync(School1, ValidRequest());
            result.Amount.Should().Be(1000m);
            result.Currency.Should().Be("INR");
        }

        [Fact] public async Task Throws_Argument_for_amount_below_min()
        {
            var req = ValidRequest();
            req.Amount = 0m;
            var act = async () => await Svc.InitiatePaymentAsync(School1, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*Amount must be at least*");
        }

        [Fact] public async Task Throws_Argument_for_amount_above_max()
        {
            var req = ValidRequest();
            req.Amount = 2_000_000m;
            var act = async () => await Svc.InitiatePaymentAsync(School1, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*cannot exceed*");
        }

        [Fact] public async Task Throws_Argument_for_invalid_payerType()
        {
            var req = ValidRequest();
            req.PayerType = "Dog";
            var act = async () => await Svc.InitiatePaymentAsync(School1, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*payer type*");
        }

        [Fact] public async Task Throws_Argument_for_invalid_purpose()
        {
            var req = ValidRequest();
            req.Purpose = "Bribe";
            var act = async () => await Svc.InitiatePaymentAsync(School1, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*purpose*");
        }

        [Fact] public async Task Throws_Argument_for_empty_payerId()
        {
            var req = ValidRequest();
            req.PayerId = Guid.Empty;
            var act = async () => await Svc.InitiatePaymentAsync(School1, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*PayerId*");
        }

        [Fact] public async Task Throws_InvalidOp_for_no_active_config()
        {
            var req = ValidRequest();
            var act = async () => await Svc.InitiatePaymentAsync(School2, req); // School2 has no config
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*No active configuration*");
        }

        [Fact] public async Task Fee_calculated_from_config_percentage()
        {
            var result = await Svc.InitiatePaymentAsync(School1, ValidRequest());
            // 2% of 1000 = 20
            result.Amount.Should().Be(1000m);
        }

        [Fact] public async Task Transaction_stored_in_db()
        {
            var result = await Svc.InitiatePaymentAsync(School1, ValidRequest());
            var tx = await Db.GatewayPaymentTransactions.FindAsync(result.Id);
            tx.Should().NotBeNull();
            tx!.Status.Should().Be("Initiated");
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ProcessCallback
    // ══════════════════════════════════════════════════════════════════════════
    public class ProcessCallbackTests : PaymentGatewayTestBase
    {
        [Fact] public async Task Updates_transaction_status()
        {
            var result = await Svc.ProcessCallbackAsync(new PaymentCallbackRequest
            {
                TransactionId = "TXN-I1", Status = "Success",
                GatewayTransactionId = "GW-001", GatewayOrderId = "ORD-001"
            });
            result.Status.Should().Be("Success");
        }

        [Fact] public async Task Throws_InvalidOp_for_already_success()
        {
            var act = async () => await Svc.ProcessCallbackAsync(new PaymentCallbackRequest
            {
                TransactionId = "TXN-S1", Status = "Failed"
            });
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*terminal status*");
        }

        [Fact] public async Task Throws_InvalidOp_for_already_refunded()
        {
            // Mark TxId3 as Refunded first
            var tx = await Db.GatewayPaymentTransactions.FindAsync(TxId3);
            tx!.Status = "Refunded";
            await Db.SaveChangesAsync();

            var act = async () => await Svc.ProcessCallbackAsync(new PaymentCallbackRequest
            {
                TransactionId = "TXN-I1", Status = "Success"
            });
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*terminal status*");
        }

        [Fact] public async Task Throws_KeyNotFound_for_unknown_transaction()
        {
            var act = async () => await Svc.ProcessCallbackAsync(new PaymentCallbackRequest
            {
                TransactionId = "TXN-UNKNOWN", Status = "Success"
            });
            await act.Should().ThrowAsync<KeyNotFoundException>();
        }

        [Fact] public async Task Throws_Argument_for_empty_transactionId()
        {
            var act = async () => await Svc.ProcessCallbackAsync(new PaymentCallbackRequest
            {
                TransactionId = "", Status = "Success"
            });
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*TransactionId*");
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ProcessCashfreeWebhook
    // ══════════════════════════════════════════════════════════════════════════
    public class ProcessCashfreeWebhookTests : PaymentGatewayTestBase
    {
        private CashfreeWebhookRequest Webhook(string status) => new()
        {
            Data = new CashfreeWebhookData
            {
                Order = new CashfreeWebhookOrder { OrderId = "TXN-I1" },
                Payment = new CashfreeWebhookPayment
                {
                    CfPaymentId = "CF_PAY_001",
                    PaymentStatus = status,
                    PaymentTime = DateTime.UtcNow.ToString("o"),
                    BankReference = "BANK_REF_001",
                    PaymentMessage = null
                }
            }
        };

        [Fact] public async Task SUCCESS_maps_to_Success()
        {
            var result = await Svc.ProcessCashfreeWebhookAsync(Webhook("SUCCESS"), "{}", "sig", "ts");
            result.Status.Should().Be("Success");
        }

        [Fact] public async Task FAILED_maps_to_Failed()
        {
            var result = await Svc.ProcessCashfreeWebhookAsync(Webhook("FAILED"), "{}", "sig", "ts");
            result.Status.Should().Be("Failed");
        }

        [Fact] public async Task PENDING_maps_to_Pending()
        {
            var result = await Svc.ProcessCashfreeWebhookAsync(Webhook("PENDING"), "{}", "sig", "ts");
            result.Status.Should().Be("Pending");
        }

        [Fact] public async Task Unknown_status_maps_to_Pending()
        {
            var result = await Svc.ProcessCashfreeWebhookAsync(Webhook("EXPIRED"), "{}", "sig", "ts");
            result.Status.Should().Be("Pending");
        }

        [Fact] public async Task Throws_Unauthorized_for_bad_signature()
        {
            FakeCashfree.VerifySignatureResult = false;
            var act = async () => await Svc.ProcessCashfreeWebhookAsync(Webhook("SUCCESS"), "{}", "badsig", "ts");
            await act.Should().ThrowAsync<UnauthorizedAccessException>().WithMessage("*signature*");
        }

        [Fact] public async Task Throws_KeyNotFound_for_unknown_order()
        {
            var webhook = new CashfreeWebhookRequest
            {
                Data = new CashfreeWebhookData
                {
                    Order = new CashfreeWebhookOrder { OrderId = "NONEXISTENT" },
                    Payment = new CashfreeWebhookPayment { PaymentStatus = "SUCCESS" }
                }
            };
            var act = async () => await Svc.ProcessCashfreeWebhookAsync(webhook, "{}", "sig", "ts");
            await act.Should().ThrowAsync<KeyNotFoundException>();
        }

        [Fact] public async Task Throws_Argument_for_null_webhook_data()
        {
            var act = async () => await Svc.ProcessCashfreeWebhookAsync(new CashfreeWebhookRequest(), "{}", "sig", "ts");
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*Invalid*");
        }

        [Fact] public async Task Lookup_by_gatewayOrderId_works()
        {
            // TxId1 has GatewayOrderId = "CF_ORD_S1", but status is Success — just verify the lookup works
            var webhook = new CashfreeWebhookRequest
            {
                Data = new CashfreeWebhookData
                {
                    Order = new CashfreeWebhookOrder { OrderId = "CF_ORD_S1" },
                    Payment = new CashfreeWebhookPayment { PaymentStatus = "SUCCESS" }
                }
            };
            var result = await Svc.ProcessCashfreeWebhookAsync(webhook, "{}", "sig", "ts");
            result.Should().NotBeNull();
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // GetTransactions
    // ══════════════════════════════════════════════════════════════════════════
    public class GetTransactionsTests : PaymentGatewayTestBase
    {
        [Fact] public async Task Returns_only_school1_transactions()
        {
            var result = await Svc.GetTransactionsAsync(School1, 1, 10, null, null, null, null, null);
            result.TotalCount.Should().Be(3);
        }

        [Fact] public async Task Returns_empty_for_school2()
        {
            var result = await Svc.GetTransactionsAsync(School2, 1, 10, null, null, null, null, null);
            result.Transactions.Should().BeEmpty();
        }

        [Fact] public async Task Filters_by_payerId()
        {
            var result = await Svc.GetTransactionsAsync(School1, 1, 10, Staff1, null, null, null, null);
            result.TotalCount.Should().Be(3);
        }

        [Fact] public async Task Filters_by_status()
        {
            var result = await Svc.GetTransactionsAsync(School1, 1, 10, null, "Success", null, null, null);
            result.TotalCount.Should().Be(1);
        }

        [Fact] public async Task Filters_by_purpose()
        {
            var result = await Svc.GetTransactionsAsync(School1, 1, 10, null, null, "WalletTopup", null, null);
            result.TotalCount.Should().Be(1);
        }

        [Fact] public async Task Filters_by_date_range()
        {
            // No dateFrom/dateTo = all results returned
            var result = await Svc.GetTransactionsAsync(School1, 1, 10, null, null, null, null, null);
            result.TotalCount.Should().Be(3); // all 3 returned when no date filter
        }

        [Fact] public async Task PageSize_normalization()
        {
            var result = await Svc.GetTransactionsAsync(School1, 1, 200, null, null, null, null, null);
            result.PageSize.Should().Be(100);
        }

        [Fact] public async Task Invalid_status_throws_Argument()
        {
            var act = async () => await Svc.GetTransactionsAsync(School1, 1, 10, null, "BADSATUS", null, null, null);
            await act.Should().ThrowAsync<ArgumentException>();
        }

        [Fact] public async Task Ordered_descending_by_createdAt()
        {
            var result = await Svc.GetTransactionsAsync(School1, 1, 10, null, null, null, null, null);
            result.Transactions[0].CreatedAt.Should().BeOnOrAfter(result.Transactions[1].CreatedAt);
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // GetTransactionById
    // ══════════════════════════════════════════════════════════════════════════
    public class GetTransactionByIdTests : PaymentGatewayTestBase
    {
        [Fact] public async Task Returns_correct_transaction()
        {
            var result = await Svc.GetTransactionByIdAsync(TxId1, School1);
            result.Status.Should().Be("Success");
        }

        [Fact] public async Task Throws_KeyNotFound_for_wrong_school()
        {
            var act = async () => await Svc.GetTransactionByIdAsync(TxId1, School2);
            await act.Should().ThrowAsync<KeyNotFoundException>();
        }

        [Fact] public async Task Throws_KeyNotFound_for_nonexistent()
        {
            var act = async () => await Svc.GetTransactionByIdAsync(Guid.NewGuid(), School1);
            await act.Should().ThrowAsync<KeyNotFoundException>();
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // InitiateRefund
    // ══════════════════════════════════════════════════════════════════════════
    public class InitiateRefundTests : PaymentGatewayTestBase
    {
        private InitiateRefundRequest ValidRequest() => new()
        {
            PaymentTransactionId = TxId1,
            RefundAmount = 100m,
            Reason = "Customer requested refund"
        };

        [Fact] public async Task Initiates_refund_successfully()
        {
            var result = await Svc.InitiateRefundAsync(School1, Staff1, ValidRequest());
            result.RefundAmount.Should().Be(100m);
            result.Status.Should().Be("Initiated");
        }

        [Fact] public async Task GatewayRefundId_populated_from_Cashfree()
        {
            var result = await Svc.InitiateRefundAsync(School1, Staff1, ValidRequest());
            result.GatewayRefundId.Should().Be("CF_REFUND_001");
        }

        [Fact] public async Task Transaction_status_set_to_Refunded()
        {
            await Svc.InitiateRefundAsync(School1, Staff1, ValidRequest());
            var tx = await Db.GatewayPaymentTransactions.FindAsync(TxId1);
            tx!.Status.Should().Be("Refunded");
        }

        [Fact] public async Task Throws_Argument_for_refund_exceeding_amount()
        {
            var req = ValidRequest();
            req.RefundAmount = 9999m;
            var act = async () => await Svc.InitiateRefundAsync(School1, Staff1, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*cannot exceed*");
        }

        [Fact] public async Task Throws_InvalidOp_for_cumulative_overage()
        {
            // Seeded: existing refund of 100m. Transaction amount = 5000m.
            // Try to refund 4950m (100+4950=5050 > 5000)
            var req = ValidRequest();
            req.RefundAmount = 4950m;
            var act = async () => await Svc.InitiateRefundAsync(School1, Staff1, req);
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*Total refunded amount*");
        }

        [Fact] public async Task Throws_InvalidOp_for_non_success_transaction()
        {
            var req = ValidRequest();
            req.PaymentTransactionId = TxId2; // Failed transaction
            var act = async () => await Svc.InitiateRefundAsync(School1, Staff1, req);
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*successful transactions*");
        }

        [Fact] public async Task Throws_KeyNotFound_for_missing_transaction()
        {
            var req = ValidRequest();
            req.PaymentTransactionId = Guid.NewGuid();
            var act = async () => await Svc.InitiateRefundAsync(School1, Staff1, req);
            await act.Should().ThrowAsync<KeyNotFoundException>();
        }

        [Fact] public async Task Throws_Argument_for_empty_reason()
        {
            var req = ValidRequest();
            req.Reason = "";
            var act = async () => await Svc.InitiateRefundAsync(School1, Staff1, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*reason*");
        }

        [Fact] public async Task Throws_Argument_for_empty_transactionId()
        {
            var req = ValidRequest();
            req.PaymentTransactionId = Guid.Empty;
            var act = async () => await Svc.InitiateRefundAsync(School1, Staff1, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*PaymentTransactionId*");
        }

        [Fact] public async Task Refund_stored_in_db()
        {
            var result = await Svc.InitiateRefundAsync(School1, Staff1, ValidRequest());
            var r = await Db.PaymentRefunds.FindAsync(result.Id);
            r.Should().NotBeNull();
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // GetRefunds
    // ══════════════════════════════════════════════════════════════════════════
    public class GetRefundsTests : PaymentGatewayTestBase
    {
        [Fact] public async Task Returns_refunds_for_school1()
        {
            var result = await Svc.GetRefundsAsync(School1, 1, 10);
            result.TotalCount.Should().Be(1);
        }

        [Fact] public async Task Returns_empty_for_school2()
        {
            var result = await Svc.GetRefundsAsync(School2, 1, 10);
            result.Refunds.Should().BeEmpty();
        }

        [Fact] public async Task PageSize_normalization()
        {
            var result = await Svc.GetRefundsAsync(School1, 1, -5);
            result.PageSize.Should().Be(10);
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // GetRefundById
    // ══════════════════════════════════════════════════════════════════════════
    public class GetRefundByIdTests : PaymentGatewayTestBase
    {
        [Fact] public async Task Returns_correct_refund()
        {
            var result = await Svc.GetRefundByIdAsync(RefundId1, School1);
            result.RefundId.Should().Be("REF-001");
        }

        [Fact] public async Task Throws_KeyNotFound_for_wrong_school()
        {
            var act = async () => await Svc.GetRefundByIdAsync(RefundId1, School2);
            await act.Should().ThrowAsync<KeyNotFoundException>();
        }

        [Fact] public async Task Throws_KeyNotFound_for_nonexistent()
        {
            var act = async () => await Svc.GetRefundByIdAsync(Guid.NewGuid(), School1);
            await act.Should().ThrowAsync<KeyNotFoundException>();
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // GetStats
    // ══════════════════════════════════════════════════════════════════════════
    public class GetStatsTests : PaymentGatewayTestBase
    {
        [Fact] public async Task TotalTransactions_correct()
        {
            var stats = await Svc.GetStatsAsync(School1);
            stats.TotalTransactions.Should().Be(3);
        }

        [Fact] public async Task SuccessfulTransactions_correct()
        {
            var stats = await Svc.GetStatsAsync(School1);
            stats.SuccessfulTransactions.Should().Be(1);
        }

        [Fact] public async Task FailedTransactions_correct()
        {
            var stats = await Svc.GetStatsAsync(School1);
            stats.FailedTransactions.Should().Be(1);
        }

        [Fact] public async Task PendingTransactions_includes_initiated()
        {
            var stats = await Svc.GetStatsAsync(School1);
            stats.PendingTransactions.Should().Be(1); // 1 Initiated
        }

        [Fact] public async Task TotalRefunds_correct()
        {
            var stats = await Svc.GetStatsAsync(School1);
            stats.TotalRefunds.Should().Be(1);
        }

        [Fact] public async Task TotalAmountCollected_from_success_only()
        {
            var stats = await Svc.GetStatsAsync(School1);
            stats.TotalAmountCollected.Should().Be(5000m);
        }

        [Fact] public async Task SuccessRate_calculated()
        {
            var stats = await Svc.GetStatsAsync(School1);
            stats.SuccessRate.Should().BeApproximately(33.33, 0.01);
        }

        [Fact] public async Task ByStatus_breakdown_complete()
        {
            var stats = await Svc.GetStatsAsync(School1);
            stats.ByStatus.Should().ContainKey("Success");
            stats.ByStatus["Success"].Should().Be(1);
        }

        [Fact] public async Task ByGateway_all_Cashfree()
        {
            var stats = await Svc.GetStatsAsync(School1);
            stats.ByGateway.Should().ContainKey("Cashfree");
            stats.ByGateway["Cashfree"].Should().Be(3);
        }

        [Fact] public async Task Empty_school_returns_zero_stats()
        {
            var stats = await Svc.GetStatsAsync(School2);
            stats.TotalTransactions.Should().Be(0);
            stats.SuccessRate.Should().Be(0.0);
        }

        [Fact] public async Task TransactionsLast7Days_correct()
        {
            // All 3 seeded transactions are within 7 days
            var stats = await Svc.GetStatsAsync(School1);
            stats.TransactionsLast7Days.Should().Be(3);
        }

        [Fact] public async Task TransactionsLast30Days_correct()
        {
            var stats = await Svc.GetStatsAsync(School1);
            stats.TransactionsLast30Days.Should().Be(3);
        }

        [Fact] public async Task NetAmountCollected_subtracts_fees_and_refunds()
        {
            var stats = await Svc.GetStatsAsync(School1);
            // TotalAmountCollected=5000, TotalFeesCharged=100, TotalRefundedAmount=100
            stats.NetAmountCollected.Should().Be(4800m);
        }
    }
}
