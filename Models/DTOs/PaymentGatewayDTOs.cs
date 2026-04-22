using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace SmsApi.Models.DTOs
{
    // ─── Constants ────────────────────────────────────────────────────────────────

    public static class PaymentGatewayConstants
    {
        // Gateway names
        public const string GatewayCashfree    = "Cashfree";
        public const string GatewayRazorpay    = "Razorpay";
        public const string GatewayStripe      = "Stripe";

        public static readonly HashSet<string> ValidGateways = new(StringComparer.OrdinalIgnoreCase)
            { GatewayCashfree, GatewayRazorpay, GatewayStripe };

        // Modes
        public const string ModeTest       = "Test";
        public const string ModeProduction = "Production";
        public static readonly HashSet<string> ValidModes = new(StringComparer.OrdinalIgnoreCase)
            { ModeTest, ModeProduction };

        // Transaction statuses
        public const string StatusInitiated  = "Initiated";
        public const string StatusPending    = "Pending";
        public const string StatusSuccess    = "Success";
        public const string StatusFailed     = "Failed";
        public const string StatusRefunded   = "Refunded";
        public const string StatusCancelled  = "Cancelled";
        public static readonly HashSet<string> ValidStatuses = new(StringComparer.OrdinalIgnoreCase)
            { StatusInitiated, StatusPending, StatusSuccess, StatusFailed, StatusRefunded, StatusCancelled };

        // Refund statuses
        public const string RefundInitiated  = "Initiated";
        public const string RefundProcessing = "Processing";
        public const string RefundSuccess    = "Success";
        public const string RefundFailed     = "Failed";

        // Payer types
        public const string PayerStudent = "Student";
        public const string PayerStaff   = "Staff";
        public const string PayerParent  = "Parent";
        public static readonly HashSet<string> ValidPayerTypes = new(StringComparer.OrdinalIgnoreCase)
            { PayerStudent, PayerStaff, PayerParent };

        // Purposes
        public const string PurposeFeePayment   = "FeePayment";
        public const string PurposeWalletTopup  = "WalletTopup";
        public const string PurposeStorePayment = "StorePayment";
        public const string PurposeDonation     = "Donation";
        public static readonly HashSet<string> ValidPurposes = new(StringComparer.OrdinalIgnoreCase)
            { PurposeFeePayment, PurposeWalletTopup, PurposeStorePayment, PurposeDonation };

        // Validation bounds
        public const decimal MinAmount        = 1m;
        public const decimal MaxAmount        = 1_000_000m;   // 10 lakh INR
        public const decimal MinFeePercentage = 0m;
        public const decimal MaxFeePercentage = 50m;
        public const int     MaxMerchantIdLen = 200;
        public const int     MaxGatewayNameLen = 100;
        public const int     MaxReasonLen      = 500;
        public const string  DefaultCurrency   = "INR";
    }

    // ─── Payment Gateway Config DTOs ─────────────────────────────────────────────

    public class PaymentGatewayConfigBasicDto
    {
        public Guid Id { get; set; }
        public string GatewayName { get; set; } = string.Empty;
        public string? Mode { get; set; }
        public bool IsActive { get; set; }
        public bool IsDefault { get; set; }
        public decimal? TransactionFeePercentage { get; set; }
    }

    public class CreatePaymentGatewayConfigRequest
    {
        public Guid SchoolId { get; set; }          // set from tenant context in controller
        public string GatewayName { get; set; } = string.Empty;
        public string MerchantId { get; set; } = string.Empty;
        public string ApiKey { get; set; } = string.Empty;
        public string? ApiSecret { get; set; }
        public string? Mode { get; set; } = PaymentGatewayConstants.ModeTest;
        public string? Currency { get; set; } = PaymentGatewayConstants.DefaultCurrency;
        public bool IsActive { get; set; } = true;
        public bool IsDefault { get; set; }
        public decimal? TransactionFeePercentage { get; set; }
        public decimal? TransactionFeeFixed { get; set; }
        public string? WebhookUrl { get; set; }
        public string? ReturnUrl { get; set; }
        public string? CallbackUrl { get; set; }
        public string? AdditionalConfig { get; set; }
        public Guid CreatedBy { get; set; }
    }

    public class UpdatePaymentGatewayConfigRequest
    {
        public string? ApiKey { get; set; }
        public string? ApiSecret { get; set; }
        public string? Mode { get; set; }
        public bool IsActive { get; set; }
        public bool IsDefault { get; set; }
        public decimal? TransactionFeePercentage { get; set; }
        public decimal? TransactionFeeFixed { get; set; }
        public string? WebhookUrl { get; set; }
        public string? ReturnUrl { get; set; }
        public string? CallbackUrl { get; set; }
        public string? AdditionalConfig { get; set; }
        public Guid UpdatedBy { get; set; }
    }

    public class PaymentGatewayConfigResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string GatewayName { get; set; } = string.Empty;
        public string MerchantId { get; set; } = string.Empty;
        public string? Mode { get; set; }
        public string? Currency { get; set; }
        public bool IsActive { get; set; }
        public bool IsDefault { get; set; }
        public decimal? TransactionFeePercentage { get; set; }
        public decimal? TransactionFeeFixed { get; set; }
        public string? WebhookUrl { get; set; }
        public string? ReturnUrl { get; set; }
        public string? CallbackUrl { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class PaymentGatewayConfigListResponse
    {
        public List<PaymentGatewayConfigResponse> Configs { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    // ─── Transaction DTOs ─────────────────────────────────────────────────────────

    public class PaymentTransactionBasicDto
    {
        public Guid Id { get; set; }
        public Guid PayerId { get; set; }
        public string PayerType { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public decimal? TransactionFee { get; set; }
        public string? Purpose { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class InitiatePaymentRequest
    {
        public Guid SchoolId { get; set; }          // set from tenant context in controller
        public Guid PayerId { get; set; }
        public string PayerType { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public decimal? TransactionFee { get; set; }
        public string? Currency { get; set; }
        public string Purpose { get; set; } = string.Empty;
        public Guid? ReferenceId { get; set; }
        public string? ReferenceType { get; set; }
        public string? CustomerName { get; set; }
        public string? CustomerEmail { get; set; }
        public string? CustomerPhone { get; set; }
        public string? GatewayName { get; set; }
        public string? ReturnUrl { get; set; }
        public string? NotifyUrl { get; set; }
        public string? AdditionalData { get; set; }
    }

    public class InitiatePaymentResponse
    {
        public Guid Id { get; set; }
        public string TransactionId { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? PaymentSessionId { get; set; }   // Cashfree session token for JS SDK
        public string? PaymentLink { get; set; }         // Direct payment URL
        public string? GatewayOrderId { get; set; }
        public decimal Amount { get; set; }
        public string Currency { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class PaymentCallbackRequest
    {
        public string TransactionId { get; set; } = string.Empty;
        public string GatewayTransactionId { get; set; } = string.Empty;
        public string? GatewayOrderId { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? PaymentMethod { get; set; }
        public DateTime? PaymentDate { get; set; }
        public string? BankTransactionId { get; set; }
        public string GatewayResponse { get; set; } = string.Empty;
        public string? ErrorCode { get; set; }
        public string? ErrorMessage { get; set; }
    }

    /// <summary>Cashfree webhook payload (POST to /api/payment-gateway/webhook)</summary>
    public class CashfreeWebhookRequest
    {
        [JsonPropertyName("data")]
        public CashfreeWebhookData? Data { get; set; }

        [JsonPropertyName("event_time")]
        public string? EventTime { get; set; }

        [JsonPropertyName("type")]
        public string? Type { get; set; }
    }

    public class CashfreeWebhookData
    {
        [JsonPropertyName("order")]
        public CashfreeWebhookOrder? Order { get; set; }

        [JsonPropertyName("payment")]
        public CashfreeWebhookPayment? Payment { get; set; }
    }

    public class CashfreeWebhookOrder
    {
        [JsonPropertyName("order_id")]
        public string? OrderId { get; set; }

        [JsonPropertyName("order_amount")]
        public decimal OrderAmount { get; set; }

        [JsonPropertyName("order_currency")]
        public string? OrderCurrency { get; set; }

        [JsonPropertyName("order_tags")]
        public Dictionary<string, string>? OrderTags { get; set; }
    }

    public class CashfreeWebhookPayment
    {
        [JsonPropertyName("cf_payment_id")]
        public string? CfPaymentId { get; set; }

        [JsonPropertyName("payment_status")]
        public string? PaymentStatus { get; set; }   // SUCCESS, FAILED, PENDING

        [JsonPropertyName("payment_amount")]
        public decimal PaymentAmount { get; set; }

        [JsonPropertyName("payment_currency")]
        public string? PaymentCurrency { get; set; }

        [JsonPropertyName("payment_message")]
        public string? PaymentMessage { get; set; }

        [JsonPropertyName("payment_time")]
        public string? PaymentTime { get; set; }

        [JsonPropertyName("bank_reference")]
        public string? BankReference { get; set; }

        [JsonPropertyName("payment_method")]
        public object? PaymentMethod { get; set; }   // Cashfree returns union type
    }

    public class PaymentTransactionResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string TransactionId { get; set; } = string.Empty;
        public string GatewayName { get; set; } = string.Empty;
        public string? GatewayTransactionId { get; set; }
        public string? GatewayOrderId { get; set; }
        public Guid PayerId { get; set; }
        public string PayerType { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public decimal? TransactionFee { get; set; }
        public decimal? NetAmount { get; set; }
        public string Currency { get; set; } = string.Empty;
        public string Purpose { get; set; } = string.Empty;
        public Guid? ReferenceId { get; set; }
        public string? ReferenceType { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? PaymentMethod { get; set; }
        public DateTime? PaymentDate { get; set; }
        public string? CustomerEmail { get; set; }
        public string? CustomerPhone { get; set; }
        public string? BankTransactionId { get; set; }
        public string? ErrorCode { get; set; }
        public string? ErrorMessage { get; set; }
        public string? PaymentSessionId { get; set; }
        public string? PaymentLink { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class PaymentTransactionListResponse
    {
        public List<PaymentTransactionResponse> Transactions { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    // ─── Refund DTOs ──────────────────────────────────────────────────────────────

    public class InitiateRefundRequest
    {
        public Guid SchoolId { get; set; }          // set from tenant context in controller
        public Guid PaymentTransactionId { get; set; }
        public decimal RefundAmount { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string? Remarks { get; set; }
        public Guid InitiatedBy { get; set; }
        public Guid InitiatedByStaffId { get; set; }
    }

    public class PaymentRefundResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string RefundId { get; set; } = string.Empty;
        public Guid PaymentTransactionId { get; set; }
        public string? GatewayRefundId { get; set; }
        public decimal RefundAmount { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public Guid? InitiatedByStaffId { get; set; }
        public DateTime? ProcessedDate { get; set; }
        public string? Remarks { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class PaymentRefundListResponse
    {
        public List<PaymentRefundResponse> Refunds { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    // ─── Stats DTO ────────────────────────────────────────────────────────────────

    public class PaymentGatewayStats
    {
        public int TotalTransactions { get; set; }
        public int SuccessfulTransactions { get; set; }
        public int FailedTransactions { get; set; }
        public int PendingTransactions { get; set; }
        public int TotalRefunds { get; set; }
        public decimal TotalAmountCollected { get; set; }
        public decimal TotalRefundedAmount { get; set; }
        public decimal TotalFeesCharged { get; set; }
        public decimal NetAmountCollected { get; set; }
        public int TransactionsLast7Days { get; set; }
        public int TransactionsLast30Days { get; set; }
        public Dictionary<string, int> ByStatus { get; set; } = new();
        public Dictionary<string, int> ByGateway { get; set; } = new();
        public Dictionary<string, int> ByPurpose { get; set; } = new();
        public Dictionary<string, decimal> AmountByGateway { get; set; } = new();
        public double SuccessRate { get; set; }
    }

    // ─── Cashfree API model DTOs (internal, used by CashfreeClient) ──────────────

    public class CashfreeCreateOrderRequest
    {
        [JsonPropertyName("order_id")]
        public string OrderId { get; set; } = string.Empty;

        [JsonPropertyName("order_amount")]
        public decimal OrderAmount { get; set; }

        [JsonPropertyName("order_currency")]
        public string OrderCurrency { get; set; } = "INR";

        [JsonPropertyName("customer_details")]
        public CashfreeCustomerDetails CustomerDetails { get; set; } = new();

        [JsonPropertyName("order_meta")]
        public CashfreeOrderMeta? OrderMeta { get; set; }

        [JsonPropertyName("order_note")]
        public string? OrderNote { get; set; }

        [JsonPropertyName("order_tags")]
        public Dictionary<string, string>? OrderTags { get; set; }
    }

    public class CashfreeCustomerDetails
    {
        [JsonPropertyName("customer_id")]
        public string CustomerId { get; set; } = string.Empty;

        [JsonPropertyName("customer_name")]
        public string? CustomerName { get; set; }

        [JsonPropertyName("customer_email")]
        public string? CustomerEmail { get; set; }

        [JsonPropertyName("customer_phone")]
        public string CustomerPhone { get; set; } = string.Empty;
    }

    public class CashfreeOrderMeta
    {
        [JsonPropertyName("return_url")]
        public string? ReturnUrl { get; set; }

        [JsonPropertyName("notify_url")]
        public string? NotifyUrl { get; set; }

        [JsonPropertyName("payment_methods")]
        public string? PaymentMethods { get; set; }
    }

    public class CashfreeCreateOrderResponse
    {
        [JsonPropertyName("cf_order_id")]
        public string? CfOrderId { get; set; }

        [JsonPropertyName("order_id")]
        public string? OrderId { get; set; }

        [JsonPropertyName("entity")]
        public string? Entity { get; set; }

        [JsonPropertyName("order_currency")]
        public string? OrderCurrency { get; set; }

        [JsonPropertyName("order_amount")]
        public decimal OrderAmount { get; set; }

        [JsonPropertyName("order_status")]
        public string? OrderStatus { get; set; }

        [JsonPropertyName("payment_session_id")]
        public string? PaymentSessionId { get; set; }

        [JsonPropertyName("order_expiry_time")]
        public string? OrderExpiryTime { get; set; }

        [JsonPropertyName("payments")]
        public CashfreeLink? Payments { get; set; }

        [JsonPropertyName("refunds")]
        public CashfreeLink? Refunds { get; set; }

        [JsonPropertyName("settlements")]
        public CashfreeLink? Settlements { get; set; }
    }

    public class CashfreeLink
    {
        [JsonPropertyName("url")]
        public string? Url { get; set; }
    }

    public class CashfreeRefundRequest
    {
        [JsonPropertyName("refund_amount")]
        public decimal RefundAmount { get; set; }

        [JsonPropertyName("refund_id")]
        public string RefundId { get; set; } = string.Empty;

        [JsonPropertyName("refund_note")]
        public string? RefundNote { get; set; }
    }

    public class CashfreeRefundResponse
    {
        [JsonPropertyName("cf_refund_id")]
        public string? CfRefundId { get; set; }

        [JsonPropertyName("refund_id")]
        public string? RefundId { get; set; }

        [JsonPropertyName("order_id")]
        public string? OrderId { get; set; }

        [JsonPropertyName("refund_amount")]
        public decimal RefundAmount { get; set; }

        [JsonPropertyName("refund_currency")]
        public string? RefundCurrency { get; set; }

        [JsonPropertyName("refund_status")]
        public string? RefundStatus { get; set; }

        [JsonPropertyName("refund_note")]
        public string? RefundNote { get; set; }

        [JsonPropertyName("status_description")]
        public string? StatusDescription { get; set; }
    }

    // ─── Payment Gateway Filters DTO ──────────────────────────────────────────────

    public class PaymentGatewayTransactionFiltersDto
    {
        public Guid? PayerId { get; set; }
        public string? Status { get; set; }
        public string? PaymentMethod { get; set; }
        public DateTime? DateFrom { get; set; }
        public DateTime? DateTo { get; set; }
        public string? SearchQuery { get; set; }
        public string? AcademicYear { get; set; }
        public string? Purpose { get; set; }
        public string? GatewayName { get; set; }
    }
}
