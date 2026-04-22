using SmsApi.Data;
using SmsApi.Models.DTOs;
using Microsoft.EntityFrameworkCore;

namespace SmsApi.Services
{
    /// <summary>
    /// Service for validating payment operations
    /// </summary>
    public interface IPaymentValidationService
    {
        Task<(bool IsValid, string? ErrorMessage)> ValidatePaymentCreationAsync(
            CreatePaymentRequest request,
            Guid schoolId,
            AppDbContext context);
            
        Task<(bool IsValid, string? ErrorMessage)> ValidateRefundAsync(
            Guid paymentId,
            decimal amount,
            Guid schoolId,
            AppDbContext context);
    }

    public class PaymentValidationService : IPaymentValidationService
    {
        public async Task<(bool IsValid, string? ErrorMessage)> ValidatePaymentCreationAsync(
            CreatePaymentRequest request,
            Guid schoolId,
            AppDbContext context)
        {
            if (request == null)
                return (false, "Payment request is required");

            // Verify FeeRecord exists and belongs to school
            var feeRecord = await context.FeeRecords
                .FirstOrDefaultAsync(f => f.Id == request.FeeRecordId && 
                                          f.SchoolId == schoolId);
            
            if (feeRecord == null)
                return (false, "Fee record not found or belongs to different school");

            // Verify Student exists and belongs to school
            var student = await context.Students
                .FirstOrDefaultAsync(s => s.Id == request.StudentId && 
                                         s.SchoolId == schoolId);
            
            if (student == null)
                return (false, "Student not found or belongs to different school");

            // Verify StudentId matches FeeRecord
            if (request.StudentId != feeRecord.StudentId)
                return (false, "Student ID does not match fee record");

            // Verify amount is positive
            if (request.Amount <= 0)
                return (false, "Amount must be greater than zero");

            // Verify amount doesn't exceed pending
            if (request.Amount > feeRecord.PendingAmount)
                return (false, $"Amount exceeds pending balance ({feeRecord.PendingAmount})");

            // Verify payment method (case-insensitive, accept all frontend method codes)
            var validMethods = new[] { "cash", "cheque", "dd", "upi", "neft", "rtgs", "challan", "card", "netbanking", "online", "cashfree" };
            if (!validMethods.Contains(request.Method?.ToLowerInvariant()))
                return (false, $"Invalid payment method '{request.Method}'. Allowed: cash, cheque, dd, upi, neft, challan, card, netbanking");

            // Verify no duplicate payment (check last 30 seconds)
            var recentPayment = await context.PaymentTransactions
                .AsNoTracking()
                .Where(p => p.FeeRecordId == request.FeeRecordId &&
                           p.Amount == request.Amount &&
                           p.CreatedAt > DateTime.UtcNow.AddSeconds(-30))
                .FirstOrDefaultAsync();
            
            if (recentPayment != null)
                return (false, "Duplicate payment attempt detected - identical payment just created");

            return (true, null);
        }

        public async Task<(bool IsValid, string? ErrorMessage)> ValidateRefundAsync(
            Guid paymentId,
            decimal amount,
            Guid schoolId,
            AppDbContext context)
        {
            if (amount <= 0)
                return (false, "Refund amount must be greater than zero");

            // Verify PaymentTransaction exists and belongs to school
            var payment = await context.PaymentTransactions
                .Include(p => p.FeeRecord)
                .FirstOrDefaultAsync(p => p.Id == paymentId && 
                                         p.FeeRecord.SchoolId == schoolId);
            
            if (payment == null)
                return (false, "Payment not found or belongs to different school");

            // Verify payment is not already refunded
            if (payment.Status == "Refunded")
                return (false, "Payment already refunded");

            // Verify refund amount doesn't exceed payment
            if (amount > payment.Amount)
                return (false, $"Refund amount exceeds payment amount ({payment.Amount})");

            // Verify payment is old enough to refund (no refunds within 1 minute of creation)
            if (payment.CreatedAt > DateTime.UtcNow.AddMinutes(-1))
                return (false, "Payment too recent for refund - please wait at least 1 minute");

            return (true, null);
        }
    }
}
