using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using SmsApi.Models.DTOs;

namespace SmsApi.Services.Cashfree
{
    /// <summary>
    /// Production implementation of ICashfreeClient.
    /// Uses named HttpClient "Cashfree" registered in Program.cs.
    /// Cashfree PG API v3 — base URLs:
    ///   Sandbox:    https://sandbox.cashfree.com/pg
    ///   Production: https://api.cashfree.com/pg
    /// </summary>
    public class CashfreeClient : ICashfreeClient
    {
        private const string SandboxBase    = "https://sandbox.cashfree.com/pg";
        private const string ProductionBase = "https://api.cashfree.com/pg";
        private const string ApiVersion     = "2023-08-01";

        private readonly IHttpClientFactory _httpFactory;
        private readonly ILogger<CashfreeClient> _logger;

        public CashfreeClient(IHttpClientFactory httpFactory, ILogger<CashfreeClient> logger)
        {
            _httpFactory = httpFactory;
            _logger = logger;
        }

        // ──────────────────────────────────────────────────────────────────────────
        // Public interface methods
        // ──────────────────────────────────────────────────────────────────────────

        public async Task<CashfreeCreateOrderResponse> CreateOrderAsync(
            CashfreeCreateOrderRequest request,
            string clientId,
            string clientSecret,
            bool isSandbox)
        {
            var url = $"{BaseUrl(isSandbox)}/orders";
            using var client = BuildClient(clientId, clientSecret);

            _logger.LogInformation("Creating Cashfree order {OrderId} amount={Amount} sandbox={IsSandbox}",
                request.OrderId, request.OrderAmount, isSandbox);

            var response = await client.PostAsJsonAsync(url, request);

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                _logger.LogError("Cashfree CreateOrder failed {Status}: {Body}", (int)response.StatusCode, body);
                throw new InvalidOperationException($"Cashfree order creation failed ({(int)response.StatusCode}): {body}");
            }

            var result = await response.Content.ReadFromJsonAsync<CashfreeCreateOrderResponse>();
            if (result == null)
                throw new InvalidOperationException("Cashfree returned an empty response for order creation.");

            _logger.LogInformation("Cashfree order created: cf_order_id={CfOrderId} session={Session}",
                result.CfOrderId, result.PaymentSessionId);

            return result;
        }

        public async Task<CashfreeCreateOrderResponse?> GetOrderAsync(
            string orderId,
            string clientId,
            string clientSecret,
            bool isSandbox)
        {
            var url = $"{BaseUrl(isSandbox)}/orders/{Uri.EscapeDataString(orderId)}";
            using var client = BuildClient(clientId, clientSecret);

            _logger.LogInformation("Fetching Cashfree order status for {OrderId}", orderId);

            var response = await client.GetAsync(url);

            if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                return null;

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("Cashfree GetOrder failed {Status}: {Body}", (int)response.StatusCode, body);
                throw new InvalidOperationException($"Cashfree get order failed ({(int)response.StatusCode}): {body}");
            }

            return await response.Content.ReadFromJsonAsync<CashfreeCreateOrderResponse>();
        }

        public async Task<CashfreeRefundResponse> CreateRefundAsync(
            string orderId,
            CashfreeRefundRequest request,
            string clientId,
            string clientSecret,
            bool isSandbox)
        {
            var url = $"{BaseUrl(isSandbox)}/orders/{Uri.EscapeDataString(orderId)}/refunds";
            using var client = BuildClient(clientId, clientSecret);

            _logger.LogInformation("Initiating Cashfree refund for order {OrderId} amount={Amount}",
                orderId, request.RefundAmount);

            var response = await client.PostAsJsonAsync(url, request);

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                _logger.LogError("Cashfree CreateRefund failed {Status}: {Body}", (int)response.StatusCode, body);
                throw new InvalidOperationException($"Cashfree refund initiation failed ({(int)response.StatusCode}): {body}");
            }

            var result = await response.Content.ReadFromJsonAsync<CashfreeRefundResponse>();
            if (result == null)
                throw new InvalidOperationException("Cashfree returned an empty response for refund.");

            _logger.LogInformation("Cashfree refund created: cf_refund_id={CfRefundId}", result.CfRefundId);

            return result;
        }

        /// <summary>
        /// Verifies Cashfree webhook signature.
        /// Algorithm: HMAC-SHA256 of (timestamp + rawBody) keyed with clientSecret.
        /// The signature is base64 encoded.
        /// Ref: https://docs.cashfree.com/docs/webhook-verification
        /// </summary>
        public bool VerifyWebhookSignature(string rawBody, string signature, string timestamp, string secret)
        {
            if (string.IsNullOrEmpty(rawBody) || string.IsNullOrEmpty(signature) ||
                string.IsNullOrEmpty(timestamp) || string.IsNullOrEmpty(secret))
                return false;

            try
            {
                var message = timestamp + rawBody;
                using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
                var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(message));
                var computed = Convert.ToBase64String(hash);

                // Constant-time comparison to prevent timing attacks
                return CryptographicOperations.FixedTimeEquals(
                    Encoding.UTF8.GetBytes(computed),
                    Encoding.UTF8.GetBytes(signature));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error verifying Cashfree webhook signature");
                return false;
            }
        }

        // ──────────────────────────────────────────────────────────────────────────
        // Helpers
        // ──────────────────────────────────────────────────────────────────────────

        private static string BaseUrl(bool isSandbox) =>
            isSandbox ? SandboxBase : ProductionBase;

        private HttpClient BuildClient(string clientId, string clientSecret)
        {
            var client = _httpFactory.CreateClient("Cashfree");
            // Clear any leftover headers (factory may reuse connection pools but new HttpClient instance is fresh)
            client.DefaultRequestHeaders.Clear();
            client.DefaultRequestHeaders.Add("x-client-id", clientId);
            client.DefaultRequestHeaders.Add("x-client-secret", clientSecret);
            client.DefaultRequestHeaders.Add("x-api-version", ApiVersion);
            client.DefaultRequestHeaders.Add("Accept", "application/json");
            return client;
        }
    }
}
