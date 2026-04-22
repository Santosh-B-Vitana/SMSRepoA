using SmsApi.Models.DTOs;

namespace SmsApi.Services.Cashfree
{
    /// <summary>
    /// Abstraction over Cashfree Payment Gateway PG API v3.
    /// Using an interface allows the service to be tested with a mock (no real HTTP calls in tests).
    /// Docs: https://docs.cashfree.com/docs/payment-gateway
    /// </summary>
    public interface ICashfreeClient
    {
        /// <summary>Creates an order on Cashfree and returns the payment session id.</summary>
        Task<CashfreeCreateOrderResponse> CreateOrderAsync(
            CashfreeCreateOrderRequest request,
            string clientId,
            string clientSecret,
            bool isSandbox);

        /// <summary>Fetches the latest status of a Cashfree order.</summary>
        Task<CashfreeCreateOrderResponse?> GetOrderAsync(
            string orderId,
            string clientId,
            string clientSecret,
            bool isSandbox);

        /// <summary>Initiates a refund on Cashfree for a given order.</summary>
        Task<CashfreeRefundResponse> CreateRefundAsync(
            string orderId,
            CashfreeRefundRequest request,
            string clientId,
            string clientSecret,
            bool isSandbox);

        /// <summary>
        /// Verifies a Cashfree webhook signature.
        /// Cashfree signs the webhook with: HMAC-SHA256(timestamp + rawBody, secret).
        /// </summary>
        bool VerifyWebhookSignature(string rawBody, string signature, string timestamp, string secret);
    }
}
