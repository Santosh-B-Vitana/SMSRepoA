using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;
using SmsApi.Services.Cashfree;

namespace SmsApi.Services
{
    public interface IPaymentGatewayService
    {
        Task<PaymentGatewayConfigListResponse> GetGatewayConfigsAsync(Guid schoolId, int page, int pageSize);
        Task<PaymentGatewayConfigResponse> GetGatewayConfigByIdAsync(Guid id, Guid schoolId);
        Task<PaymentGatewayConfigResponse> CreateGatewayConfigAsync(Guid schoolId, CreatePaymentGatewayConfigRequest request);
        Task<PaymentGatewayConfigResponse> UpdateGatewayConfigAsync(Guid id, Guid schoolId, UpdatePaymentGatewayConfigRequest request);
        Task<bool> DeleteGatewayConfigAsync(Guid id, Guid schoolId);
        Task<InitiatePaymentResponse> InitiatePaymentAsync(Guid schoolId, InitiatePaymentRequest request);
        Task<PaymentTransactionResponse> ProcessCallbackAsync(PaymentCallbackRequest request);
        Task<PaymentTransactionResponse> ProcessCashfreeWebhookAsync(CashfreeWebhookRequest webhook, string rawBody, string signature, string timestamp);
        Task<PaymentTransactionListResponse> GetTransactionsAsync(Guid schoolId, int page, int pageSize, Guid? payerId, string? status, string? purpose, DateTime? dateFrom, DateTime? dateTo);
        Task<PaymentTransactionResponse> GetTransactionByIdAsync(Guid id, Guid schoolId);
        Task<PaymentRefundResponse> InitiateRefundAsync(Guid schoolId, Guid initiatedByStaffId, InitiateRefundRequest request);
        Task<PaymentRefundListResponse> GetRefundsAsync(Guid schoolId, int page, int pageSize);
        Task<PaymentRefundResponse> GetRefundByIdAsync(Guid id, Guid schoolId);
        Task<PaymentGatewayStats> GetStatsAsync(Guid schoolId);
    }

    public class PaymentGatewayService : IPaymentGatewayService
    {
        private readonly AppDbContext _db;
        private readonly ICashfreeClient _cashfree;
        private readonly ILogger<PaymentGatewayService> _logger;

        public PaymentGatewayService(AppDbContext db, ICashfreeClient cashfree, ILogger<PaymentGatewayService> logger)
        {
            _db = db; _cashfree = cashfree; _logger = logger;
        }

        private static (int p, int ps) NormalizePage(int page, int pageSize)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;
            if (pageSize > 100) pageSize = 100;
            return (page, pageSize);
        }

        private static void ValidateAmount(decimal amount)
        {
            if (amount < PaymentGatewayConstants.MinAmount)
                throw new ArgumentException($"Amount must be at least Rs.{PaymentGatewayConstants.MinAmount}.");
            if (amount > PaymentGatewayConstants.MaxAmount)
                throw new ArgumentException($"Amount cannot exceed Rs.{PaymentGatewayConstants.MaxAmount:N0}.");
        }

        private static void ValidateGatewayName(string gatewayName)
        {
            if (string.IsNullOrWhiteSpace(gatewayName)) throw new ArgumentException("Gateway name is required.");
            if (gatewayName.Length > PaymentGatewayConstants.MaxGatewayNameLen) throw new ArgumentException($"Gateway name cannot exceed {PaymentGatewayConstants.MaxGatewayNameLen} characters.");
            if (!PaymentGatewayConstants.ValidGateways.Contains(gatewayName)) throw new ArgumentException($"Invalid gateway name '{gatewayName}'. Valid values: {string.Join(", ", PaymentGatewayConstants.ValidGateways)}.");
        }

        private static void ValidateMode(string? mode)
        {
            if (!string.IsNullOrEmpty(mode) && !PaymentGatewayConstants.ValidModes.Contains(mode))
                throw new ArgumentException($"Invalid mode '{mode}'. Valid values: {string.Join(", ", PaymentGatewayConstants.ValidModes)}.");
        }

        private static void ValidateStatus(string status)
        {
            if (!PaymentGatewayConstants.ValidStatuses.Contains(status))
                throw new ArgumentException($"Invalid status '{status}'. Valid values: {string.Join(", ", PaymentGatewayConstants.ValidStatuses)}.");
        }

        private static void ValidatePayerType(string payerType)
        {
            if (string.IsNullOrWhiteSpace(payerType)) throw new ArgumentException("PayerType is required.");
            if (!PaymentGatewayConstants.ValidPayerTypes.Contains(payerType))
                throw new ArgumentException($"Invalid payer type '{payerType}'. Valid values: {string.Join(", ", PaymentGatewayConstants.ValidPayerTypes)}.");
        }

        private static void ValidatePurpose(string purpose)
        {
            if (string.IsNullOrWhiteSpace(purpose)) throw new ArgumentException("Purpose is required.");
            if (!PaymentGatewayConstants.ValidPurposes.Contains(purpose))
                throw new ArgumentException($"Invalid purpose '{purpose}'. Valid values: {string.Join(", ", PaymentGatewayConstants.ValidPurposes)}.");
        }

        private static void ValidateFeePercentage(decimal? fee)
        {
            if (fee.HasValue && (fee.Value < PaymentGatewayConstants.MinFeePercentage || fee.Value > PaymentGatewayConstants.MaxFeePercentage))
                throw new ArgumentException($"Transaction fee percentage must be between {PaymentGatewayConstants.MinFeePercentage} and {PaymentGatewayConstants.MaxFeePercentage}.");
        }

        private static void ValidateReason(string reason)
        {
            if (string.IsNullOrWhiteSpace(reason)) throw new ArgumentException("Refund reason is required.");
            if (reason.Length > PaymentGatewayConstants.MaxReasonLen) throw new ArgumentException($"Reason cannot exceed {PaymentGatewayConstants.MaxReasonLen} characters.");
        }

        public async Task<PaymentGatewayConfigListResponse> GetGatewayConfigsAsync(Guid schoolId, int page, int pageSize)
        {
            var (p, ps) = NormalizePage(page, pageSize);
            var query = _db.PaymentGatewayConfigs.Where(c => c.SchoolId == schoolId);
            var total = await query.CountAsync();
            var configs = await query.OrderBy(c => c.GatewayName).Skip((p - 1) * ps).Take(ps).ToListAsync();
            return new PaymentGatewayConfigListResponse { Configs = configs.Select(MapConfigResponse).ToList(), TotalCount = total, Page = p, PageSize = ps, TotalPages = (int)Math.Ceiling((double)total / ps) };
        }

        public async Task<PaymentGatewayConfigResponse> GetGatewayConfigByIdAsync(Guid id, Guid schoolId)
        {
            var config = await _db.PaymentGatewayConfigs.FirstOrDefaultAsync(c => c.Id == id && c.SchoolId == schoolId);
            if (config == null) throw new KeyNotFoundException($"Payment gateway config '{id}' not found.");
            return MapConfigResponse(config);
        }

        public async Task<PaymentGatewayConfigResponse> CreateGatewayConfigAsync(Guid schoolId, CreatePaymentGatewayConfigRequest request)
        {
            ValidateGatewayName(request.GatewayName);
            ValidateMode(request.Mode);
            ValidateFeePercentage(request.TransactionFeePercentage);
            if (string.IsNullOrWhiteSpace(request.MerchantId)) throw new ArgumentException("Merchant ID is required.");
            if (request.MerchantId.Length > PaymentGatewayConstants.MaxMerchantIdLen) throw new ArgumentException($"Merchant ID cannot exceed {PaymentGatewayConstants.MaxMerchantIdLen} characters.");
            if (string.IsNullOrWhiteSpace(request.ApiKey)) throw new ArgumentException("API Key is required.");

            var exists = await _db.PaymentGatewayConfigs.AnyAsync(c => c.SchoolId == schoolId && c.GatewayName.ToLower() == request.GatewayName.ToLower());
            if (exists) throw new InvalidOperationException($"A configuration for '{request.GatewayName}' already exists for this school.");

            if (request.IsDefault) await ClearDefaultsAsync(schoolId, null);

            var config = new PaymentGatewayConfig { Id = Guid.NewGuid(), SchoolId = schoolId, GatewayName = request.GatewayName.Trim(), MerchantId = request.MerchantId.Trim(), ApiKey = request.ApiKey.Trim(), ApiSecret = request.ApiSecret?.Trim(), Mode = (request.Mode ?? PaymentGatewayConstants.ModeTest).Trim(), Currency = (request.Currency ?? PaymentGatewayConstants.DefaultCurrency).Trim(), IsActive = request.IsActive, IsDefault = request.IsDefault, TransactionFeePercentage = request.TransactionFeePercentage, TransactionFeeFixed = request.TransactionFeeFixed, WebhookUrl = request.WebhookUrl?.Trim(), ReturnUrl = request.ReturnUrl?.Trim(), CallbackUrl = request.CallbackUrl?.Trim(), AdditionalConfig = request.AdditionalConfig, CreatedAt = DateTime.UtcNow };
            _db.PaymentGatewayConfigs.Add(config);
            await _db.SaveChangesAsync();
            return MapConfigResponse(config);
        }

        public async Task<PaymentGatewayConfigResponse> UpdateGatewayConfigAsync(Guid id, Guid schoolId, UpdatePaymentGatewayConfigRequest request)
        {
            ValidateMode(request.Mode);
            ValidateFeePercentage(request.TransactionFeePercentage);
            var config = await _db.PaymentGatewayConfigs.FirstOrDefaultAsync(c => c.Id == id && c.SchoolId == schoolId);
            if (config == null) throw new KeyNotFoundException($"Payment gateway config '{id}' not found.");
            if (!string.IsNullOrWhiteSpace(request.ApiKey)) config.ApiKey = request.ApiKey.Trim();
            if (!string.IsNullOrWhiteSpace(request.ApiSecret)) config.ApiSecret = request.ApiSecret.Trim();
            if (!string.IsNullOrEmpty(request.Mode)) config.Mode = request.Mode.Trim();
            config.IsActive = request.IsActive; config.TransactionFeePercentage = request.TransactionFeePercentage; config.TransactionFeeFixed = request.TransactionFeeFixed; config.WebhookUrl = request.WebhookUrl?.Trim(); config.ReturnUrl = request.ReturnUrl?.Trim(); config.CallbackUrl = request.CallbackUrl?.Trim(); config.AdditionalConfig = request.AdditionalConfig; config.UpdatedAt = DateTime.UtcNow;
            if (request.IsDefault && !config.IsDefault) { await ClearDefaultsAsync(schoolId, id); config.IsDefault = true; }
            else if (!request.IsDefault) { config.IsDefault = false; }
            await _db.SaveChangesAsync();
            return MapConfigResponse(config);
        }

        public async Task<bool> DeleteGatewayConfigAsync(Guid id, Guid schoolId)
        {
            var config = await _db.PaymentGatewayConfigs.FirstOrDefaultAsync(c => c.Id == id && c.SchoolId == schoolId);
            if (config == null) return false;
            _db.PaymentGatewayConfigs.Remove(config);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<InitiatePaymentResponse> InitiatePaymentAsync(Guid schoolId, InitiatePaymentRequest request)
        {
            ValidateAmount(request.Amount);
            ValidatePayerType(request.PayerType);
            ValidatePurpose(request.Purpose);
            if (request.PayerId == Guid.Empty) throw new ArgumentException("PayerId is required.");

            var gatewayName = string.IsNullOrWhiteSpace(request.GatewayName) ? PaymentGatewayConstants.GatewayCashfree : request.GatewayName.Trim();
            ValidateGatewayName(gatewayName);

            var config = await _db.PaymentGatewayConfigs.FirstOrDefaultAsync(c => c.SchoolId == schoolId && c.GatewayName == gatewayName && c.IsActive);
            if (config == null) throw new InvalidOperationException($"No active configuration found for gateway '{gatewayName}'. Please configure the gateway first.");

            var transactionId = GenerateTransactionId();
            var currency = (request.Currency ?? config.Currency ?? PaymentGatewayConstants.DefaultCurrency).ToUpper();
            var fee = request.TransactionFee ?? CalculateFee(request.Amount, config);

            string? paymentSessionId = null; string? paymentLink = null;

            if (gatewayName.Equals(PaymentGatewayConstants.GatewayCashfree, StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    // Validate Cashfree credentials are configured
                    if (string.IsNullOrWhiteSpace(config.ApiKey) || string.IsNullOrWhiteSpace(config.ApiSecret))
                    {
                        _logger.LogError("Cashfree credentials not configured for school {SchoolId}. ApiKey={HasKey}, ApiSecret={HasSecret}",
                            schoolId, !string.IsNullOrWhiteSpace(config.ApiKey), !string.IsNullOrWhiteSpace(config.ApiSecret));
                        throw new InvalidOperationException(
                            "Cashfree gateway not properly configured. " +
                            "Please configure Client ID (ApiKey) and Client Secret (ApiSecret) in the payment gateway settings. " +
                            "Get credentials from: https://www.cashfree.com/dashboard");
                    }

                    var cfRequest = new CashfreeCreateOrderRequest { OrderId = transactionId, OrderAmount = request.Amount, OrderCurrency = currency, CustomerDetails = new CashfreeCustomerDetails { CustomerId = request.PayerId.ToString("N"), CustomerName = request.CustomerName?.Trim(), CustomerEmail = request.CustomerEmail?.Trim(), CustomerPhone = request.CustomerPhone?.Trim() ?? "9999999999" }, OrderMeta = new CashfreeOrderMeta { ReturnUrl = request.ReturnUrl ?? config.ReturnUrl, NotifyUrl = request.NotifyUrl ?? config.WebhookUrl, PaymentMethods = PaymentGatewayConstants.CashfreePaymentMethods }, OrderNote = request.Purpose, OrderTags = new Dictionary<string, string> { ["schoolId"] = schoolId.ToString(), ["payerId"] = request.PayerId.ToString(), ["payerType"] = request.PayerType, ["purpose"] = request.Purpose, ["referenceId"] = request.ReferenceId?.ToString() ?? string.Empty } };
                    var isSandbox = config.Mode?.Equals(PaymentGatewayConstants.ModeTest, StringComparison.OrdinalIgnoreCase) ?? true;
                    
                    _logger.LogInformation("Initiating Cashfree order - Amount: {Amount}, Mode: {Mode}, Environment: {Env}",
                        request.Amount, config.Mode, isSandbox ? "Sandbox" : "Production");
                    
                    var cfResponse = await _cashfree.CreateOrderAsync(cfRequest, config.ApiKey, config.ApiSecret, isSandbox);
                    paymentSessionId = cfResponse.PaymentSessionId; 
                    paymentLink = cfResponse.Payments?.Url;
                }
                catch (InvalidOperationException ex) when (ex.Message.Contains("authentication"))
                {
                    _logger.LogError(ex, "Cashfree authentication failed for school {SchoolId}. Check credentials are correct and match the environment mode (Test vs Production).", schoolId);
                    throw new InvalidOperationException(
                        "Cashfree authentication failed. Please verify: " +
                        "1. Client ID (ApiKey) is correct " +
                        "2. Client Secret (ApiSecret) is correct " +
                        "3. Credentials match the Mode (Test credentials for Test mode, Production credentials for Production mode) " +
                        "Visit https://www.cashfree.com/dashboard to verify credentials.");
                }
                catch (Exception ex) 
                { 
                    _logger.LogError(ex, "Cashfree CreateOrder failed for school {SchoolId}", schoolId); 
                    throw new InvalidOperationException($"Failed to create payment order: {ex.Message}"); 
                }
            }

            var transaction = new GatewayPaymentTransaction { Id = Guid.NewGuid(), SchoolId = schoolId, TransactionId = transactionId, GatewayName = gatewayName, PayerId = request.PayerId, PayerType = request.PayerType, Amount = request.Amount, TransactionFee = fee, NetAmount = request.Amount - fee, Currency = currency, Purpose = request.Purpose, ReferenceId = request.ReferenceId, ReferenceType = request.ReferenceType, Status = PaymentGatewayConstants.StatusInitiated, CustomerEmail = request.CustomerEmail?.Trim(), CustomerPhone = request.CustomerPhone?.Trim(), AdditionalData = request.AdditionalData, CreatedAt = DateTime.UtcNow };
            _db.GatewayPaymentTransactions.Add(transaction);
            await _db.SaveChangesAsync();

            return new InitiatePaymentResponse { Id = transaction.Id, TransactionId = transaction.TransactionId, Status = transaction.Status, PaymentSessionId = paymentSessionId, PaymentLink = paymentLink, GatewayOrderId = transaction.GatewayOrderId, Amount = transaction.Amount, Currency = transaction.Currency, CreatedAt = transaction.CreatedAt };
        }

        public async Task<PaymentTransactionResponse> ProcessCallbackAsync(PaymentCallbackRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.TransactionId)) throw new ArgumentException("TransactionId is required.");
            if (!string.IsNullOrEmpty(request.Status)) ValidateStatus(request.Status);
            var transaction = await _db.GatewayPaymentTransactions.FirstOrDefaultAsync(t => t.TransactionId == request.TransactionId);
            if (transaction == null) throw new KeyNotFoundException($"Transaction '{request.TransactionId}' not found.");
            if (transaction.Status == PaymentGatewayConstants.StatusSuccess || transaction.Status == PaymentGatewayConstants.StatusRefunded)
                throw new InvalidOperationException($"Transaction is already in terminal status '{transaction.Status}' and cannot be updated.");
            transaction.GatewayTransactionId = request.GatewayTransactionId; transaction.GatewayOrderId = request.GatewayOrderId; transaction.Status = request.Status; transaction.PaymentMethod = request.PaymentMethod; transaction.PaymentDate = request.PaymentDate; transaction.BankTransactionId = request.BankTransactionId; transaction.GatewayResponse = request.GatewayResponse; transaction.ErrorCode = request.ErrorCode; transaction.ErrorMessage = request.ErrorMessage; transaction.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return MapTransactionResponse(transaction);
        }

        public async Task<PaymentTransactionResponse> ProcessCashfreeWebhookAsync(CashfreeWebhookRequest webhook, string rawBody, string signature, string timestamp)
        {
            if (webhook?.Data?.Order?.OrderId == null) throw new ArgumentException("Invalid Cashfree webhook payload.");
            var orderId = webhook.Data.Order.OrderId;
            var transaction = await _db.GatewayPaymentTransactions.FirstOrDefaultAsync(t => t.TransactionId == orderId || t.GatewayOrderId == orderId);
            if (transaction == null) throw new KeyNotFoundException($"No transaction found for Cashfree order '{orderId}'.");
            var config = await _db.PaymentGatewayConfigs.FirstOrDefaultAsync(c => c.SchoolId == transaction.SchoolId && c.GatewayName == PaymentGatewayConstants.GatewayCashfree);
            if (config?.ApiSecret != null && !_cashfree.VerifyWebhookSignature(rawBody, signature, timestamp, config.ApiSecret))
                throw new UnauthorizedAccessException("Cashfree webhook signature verification failed.");
            var payment = webhook.Data.Payment;
            if (payment != null)
            {
                transaction.GatewayTransactionId = payment.CfPaymentId;
                transaction.PaymentDate = string.IsNullOrEmpty(payment.PaymentTime) ? DateTime.UtcNow : DateTime.TryParse(payment.PaymentTime, out var dt) ? dt : DateTime.UtcNow;
                transaction.BankTransactionId = payment.BankReference; transaction.GatewayResponse = rawBody;
                transaction.Status = payment.PaymentStatus?.ToUpper() switch { "SUCCESS" => PaymentGatewayConstants.StatusSuccess, "FAILED" => PaymentGatewayConstants.StatusFailed, "PENDING" => PaymentGatewayConstants.StatusPending, _ => PaymentGatewayConstants.StatusPending };
                transaction.ErrorMessage = payment.PaymentMessage; transaction.GatewayOrderId = orderId; transaction.UpdatedAt = DateTime.UtcNow;
            }
            await _db.SaveChangesAsync();
            return MapTransactionResponse(transaction);
        }

        public async Task<PaymentTransactionListResponse> GetTransactionsAsync(Guid schoolId, int page, int pageSize, Guid? payerId, string? status, string? purpose, DateTime? dateFrom, DateTime? dateTo)
        {
            if (!string.IsNullOrEmpty(status)) ValidateStatus(status);
            var (p, ps) = NormalizePage(page, pageSize);
            var query = _db.GatewayPaymentTransactions.Where(t => t.SchoolId == schoolId);
            if (payerId.HasValue) query = query.Where(t => t.PayerId == payerId.Value);
            if (!string.IsNullOrEmpty(status)) query = query.Where(t => t.Status == status);
            if (!string.IsNullOrEmpty(purpose)) query = query.Where(t => t.Purpose == purpose);
            if (dateFrom.HasValue) query = query.Where(t => t.CreatedAt >= dateFrom.Value);
            if (dateTo.HasValue) query = query.Where(t => t.CreatedAt <= dateTo.Value);
            var total = await query.CountAsync();
            var items = await query.OrderByDescending(t => t.CreatedAt).Skip((p - 1) * ps).Take(ps).ToListAsync();
            return new PaymentTransactionListResponse { Transactions = items.Select(MapTransactionResponse).ToList(), TotalCount = total, Page = p, PageSize = ps, TotalPages = (int)Math.Ceiling((double)total / ps) };
        }

        public async Task<PaymentTransactionResponse> GetTransactionByIdAsync(Guid id, Guid schoolId)
        {
            var tx = await _db.GatewayPaymentTransactions.FirstOrDefaultAsync(t => t.Id == id && t.SchoolId == schoolId);
            if (tx == null) throw new KeyNotFoundException($"Transaction '{id}' not found.");
            return MapTransactionResponse(tx);
        }

        public async Task<PaymentRefundResponse> InitiateRefundAsync(Guid schoolId, Guid initiatedByStaffId, InitiateRefundRequest request)
        {
            ValidateAmount(request.RefundAmount);
            ValidateReason(request.Reason);
            if (request.PaymentTransactionId == Guid.Empty) throw new ArgumentException("PaymentTransactionId is required.");
            var transaction = await _db.GatewayPaymentTransactions.FirstOrDefaultAsync(t => t.Id == request.PaymentTransactionId && t.SchoolId == schoolId);
            if (transaction == null) throw new KeyNotFoundException($"Transaction '{request.PaymentTransactionId}' not found.");
            if (transaction.Status != PaymentGatewayConstants.StatusSuccess) throw new InvalidOperationException("Can only refund successful transactions.");
            if (request.RefundAmount > transaction.Amount) throw new ArgumentException($"Refund amount Rs.{request.RefundAmount} cannot exceed original transaction amount Rs.{transaction.Amount}.");
            var existingRefundTotal = await _db.PaymentRefunds.Where(r => r.PaymentTransactionId == request.PaymentTransactionId && r.Status != PaymentGatewayConstants.RefundFailed).SumAsync(r => r.RefundAmount);
            if (existingRefundTotal + request.RefundAmount > transaction.Amount) throw new InvalidOperationException($"Total refunded amount (Rs.{existingRefundTotal + request.RefundAmount}) would exceed original transaction amount (Rs.{transaction.Amount}).");

            var refundId = $"REF-{DateTime.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid().ToString("N")[..6].ToUpper()}";
            string? gatewayRefundId = null;

            if (transaction.GatewayName.Equals(PaymentGatewayConstants.GatewayCashfree, StringComparison.OrdinalIgnoreCase) && transaction.GatewayOrderId != null)
            {
                try
                {
                    var config = await _db.PaymentGatewayConfigs.FirstOrDefaultAsync(c => c.SchoolId == schoolId && c.GatewayName == PaymentGatewayConstants.GatewayCashfree);
                    if (config != null) { var isSandbox = config.Mode?.Equals(PaymentGatewayConstants.ModeTest, StringComparison.OrdinalIgnoreCase) ?? true; var cfRefund = await _cashfree.CreateRefundAsync(transaction.GatewayOrderId, new CashfreeRefundRequest { RefundId = refundId, RefundAmount = request.RefundAmount, RefundNote = request.Reason }, config.ApiKey, config.ApiSecret ?? string.Empty, isSandbox); gatewayRefundId = cfRefund.CfRefundId; }
                }
                catch (Exception ex) { _logger.LogError(ex, "Cashfree refund failed for transaction {TxId}", transaction.TransactionId); throw new InvalidOperationException($"Failed to initiate refund on Cashfree: {ex.Message}"); }
            }

            var refund = new PaymentRefund { Id = Guid.NewGuid(), SchoolId = schoolId, RefundId = refundId, PaymentTransactionId = request.PaymentTransactionId, GatewayRefundId = gatewayRefundId, RefundAmount = request.RefundAmount, Reason = request.Reason.Trim(), Status = PaymentGatewayConstants.RefundInitiated, InitiatedByStaffId = initiatedByStaffId == Guid.Empty ? (Guid?)null : initiatedByStaffId, Remarks = request.Remarks?.Trim(), CreatedAt = DateTime.UtcNow };
            _db.PaymentRefunds.Add(refund);
            transaction.Status = PaymentGatewayConstants.StatusRefunded; transaction.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return MapRefundResponse(refund);
        }

        public async Task<PaymentRefundListResponse> GetRefundsAsync(Guid schoolId, int page, int pageSize)
        {
            var (p, ps) = NormalizePage(page, pageSize);
            var query = _db.PaymentRefunds.Where(r => r.SchoolId == schoolId);
            var total = await query.CountAsync();
            var items = await query.OrderByDescending(r => r.CreatedAt).Skip((p - 1) * ps).Take(ps).ToListAsync();
            return new PaymentRefundListResponse { Refunds = items.Select(MapRefundResponse).ToList(), TotalCount = total, Page = p, PageSize = ps, TotalPages = (int)Math.Ceiling((double)total / ps) };
        }

        public async Task<PaymentRefundResponse> GetRefundByIdAsync(Guid id, Guid schoolId)
        {
            var refund = await _db.PaymentRefunds.FirstOrDefaultAsync(r => r.Id == id && r.SchoolId == schoolId);
            if (refund == null) throw new KeyNotFoundException($"Refund '{id}' not found.");
            return MapRefundResponse(refund);
        }

        public async Task<PaymentGatewayStats> GetStatsAsync(Guid schoolId)
        {
            var now = DateTime.UtcNow;
            var allTx = await _db.GatewayPaymentTransactions.Where(t => t.SchoolId == schoolId).ToListAsync();
            var allRefunds = await _db.PaymentRefunds.Where(r => r.SchoolId == schoolId).ToListAsync();
            var successTx = allTx.Where(t => t.Status == PaymentGatewayConstants.StatusSuccess).ToList();
            var totalCollected = successTx.Sum(t => t.Amount);
            var totalFees = successTx.Sum(t => t.TransactionFee ?? 0);
            var totalRefunded = allRefunds.Where(r => r.Status != PaymentGatewayConstants.RefundFailed).Sum(r => r.RefundAmount);
            return new PaymentGatewayStats { TotalTransactions = allTx.Count, SuccessfulTransactions = successTx.Count, FailedTransactions = allTx.Count(t => t.Status == PaymentGatewayConstants.StatusFailed), PendingTransactions = allTx.Count(t => t.Status == PaymentGatewayConstants.StatusPending || t.Status == PaymentGatewayConstants.StatusInitiated), TotalRefunds = allRefunds.Count, TotalAmountCollected = totalCollected, TotalRefundedAmount = totalRefunded, TotalFeesCharged = totalFees, NetAmountCollected = totalCollected - totalFees - totalRefunded, TransactionsLast7Days = allTx.Count(t => t.CreatedAt >= now.AddDays(-7)), TransactionsLast30Days = allTx.Count(t => t.CreatedAt >= now.AddDays(-30)), SuccessRate = allTx.Count == 0 ? 0.0 : Math.Round((double)successTx.Count / allTx.Count * 100, 2), ByStatus = allTx.GroupBy(t => t.Status).ToDictionary(g => g.Key, g => g.Count()), ByGateway = allTx.GroupBy(t => t.GatewayName).ToDictionary(g => g.Key, g => g.Count()), ByPurpose = allTx.GroupBy(t => t.Purpose).ToDictionary(g => g.Key, g => g.Count()), AmountByGateway = successTx.GroupBy(t => t.GatewayName).ToDictionary(g => g.Key, g => g.Sum(t => t.Amount)) };
        }

        private async Task ClearDefaultsAsync(Guid schoolId, Guid? excludeId)
        {
            var defaults = await _db.PaymentGatewayConfigs.Where(c => c.SchoolId == schoolId && c.IsDefault && c.Id != excludeId).ToListAsync();
            foreach (var d in defaults) d.IsDefault = false;
        }

        private static decimal CalculateFee(decimal amount, PaymentGatewayConfig config)
        {
            decimal fee = 0;
            if (config.TransactionFeePercentage.HasValue) fee += amount * (config.TransactionFeePercentage.Value / 100m);
            if (config.TransactionFeeFixed.HasValue) fee += config.TransactionFeeFixed.Value;
            return Math.Round(fee, 2);
        }

        private static string GenerateTransactionId() => $"TXN-{DateTime.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid().ToString("N")[..8].ToUpper()}";

        private static PaymentGatewayConfigResponse MapConfigResponse(PaymentGatewayConfig c) => new() { Id = c.Id, SchoolId = c.SchoolId, GatewayName = c.GatewayName, MerchantId = c.MerchantId, Mode = c.Mode, Currency = c.Currency, IsActive = c.IsActive, IsDefault = c.IsDefault, TransactionFeePercentage = c.TransactionFeePercentage, TransactionFeeFixed = c.TransactionFeeFixed, WebhookUrl = c.WebhookUrl, ReturnUrl = c.ReturnUrl, CallbackUrl = c.CallbackUrl, CreatedAt = c.CreatedAt, UpdatedAt = c.UpdatedAt };
        private static PaymentTransactionResponse MapTransactionResponse(GatewayPaymentTransaction t) => new() { Id = t.Id, SchoolId = t.SchoolId, TransactionId = t.TransactionId, GatewayName = t.GatewayName, GatewayTransactionId = t.GatewayTransactionId, GatewayOrderId = t.GatewayOrderId, PayerId = t.PayerId, PayerType = t.PayerType, Amount = t.Amount, TransactionFee = t.TransactionFee, NetAmount = t.NetAmount, Currency = t.Currency, Purpose = t.Purpose, ReferenceId = t.ReferenceId, ReferenceType = t.ReferenceType, Status = t.Status, PaymentMethod = t.PaymentMethod, PaymentDate = t.PaymentDate, CustomerEmail = t.CustomerEmail, CustomerPhone = t.CustomerPhone, BankTransactionId = t.BankTransactionId, ErrorCode = t.ErrorCode, ErrorMessage = t.ErrorMessage, CreatedAt = t.CreatedAt, UpdatedAt = t.UpdatedAt };
        private static PaymentRefundResponse MapRefundResponse(PaymentRefund r) => new() { Id = r.Id, SchoolId = r.SchoolId, RefundId = r.RefundId, PaymentTransactionId = r.PaymentTransactionId, GatewayRefundId = r.GatewayRefundId, RefundAmount = r.RefundAmount, Reason = r.Reason, Status = r.Status, InitiatedByStaffId = r.InitiatedByStaffId, ProcessedDate = r.ProcessedDate, Remarks = r.Remarks, CreatedAt = r.CreatedAt, UpdatedAt = r.UpdatedAt };
    }
}
