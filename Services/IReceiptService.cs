using SmsApi.Models.DTOs;

namespace SmsApi.Services;

public interface IReceiptService
{
    Task<byte[]> GeneratePaymentReceiptPdfAsync(Guid paymentId, Guid schoolId);
    Task<bool> SendReceiptEmailAsync(Guid paymentId, Guid schoolId, string recipientEmail);
}

