using System;
using System.ComponentModel.DataAnnotations;

namespace SmsApi.Models.DTOs
{
    // Fee Structure Basic DTO - Lightweight version for list views
    public class FeeStructureBasicDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Class { get; set; } = string.Empty;
        public string AcademicYear { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public int InstallmentCount { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    // Fee Structure DTOs
    public class CreateFeeStructureRequest
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Class { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        public string AcademicYear { get; set; } = string.Empty;

        // Fee Components (12 fields)
        public decimal TuitionFee { get; set; } = 0;
        public decimal AdmissionFee { get; set; } = 0;
        public decimal ExamFee { get; set; } = 0;
        public decimal LibraryFee { get; set; } = 0;
        public decimal LabFee { get; set; } = 0;
        public decimal SportsFee { get; set; } = 0;
        public decimal TransportFee { get; set; } = 0;
        public decimal HostelFee { get; set; } = 0;
        public decimal UniformFee { get; set; } = 0;
        public decimal BooksFee { get; set; } = 0;
        public decimal DevelopmentFee { get; set; } = 0;
        public decimal Miscellaneous { get; set; } = 0;

        // Installment Support
        public int InstallmentCount { get; set; } = 1;
        public string? InstallmentAmounts { get; set; } // JSON array
        public string? InstallmentDueDates { get; set; } // JSON array

        public string? Description { get; set; }
    }

    public class UpdateFeeStructureRequest
    {
        [MaxLength(100)]
        public string? Name { get; set; }

        [MaxLength(20)]
        public string? AcademicYear { get; set; }

        // Fee Components
        public decimal? TuitionFee { get; set; }
        public decimal? AdmissionFee { get; set; }
        public decimal? ExamFee { get; set; }
        public decimal? LibraryFee { get; set; }
        public decimal? LabFee { get; set; }
        public decimal? SportsFee { get; set; }
        public decimal? TransportFee { get; set; }
        public decimal? HostelFee { get; set; }
        public decimal? UniformFee { get; set; }
        public decimal? BooksFee { get; set; }
        public decimal? DevelopmentFee { get; set; }
        public decimal? Miscellaneous { get; set; }

        // Installment Support
        public int? InstallmentCount { get; set; }
        public string? InstallmentAmounts { get; set; }
        public string? InstallmentDueDates { get; set; }

        public string? Description { get; set; }
    }

    public class FeeStructureResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Class { get; set; } = string.Empty;
        public string AcademicYear { get; set; } = string.Empty;

        // Fee Components
        public decimal TuitionFee { get; set; }
        public decimal AdmissionFee { get; set; }
        public decimal ExamFee { get; set; }
        public decimal LibraryFee { get; set; }
        public decimal LabFee { get; set; }
        public decimal SportsFee { get; set; }
        public decimal TransportFee { get; set; }
        public decimal HostelFee { get; set; }
        public decimal UniformFee { get; set; }
        public decimal BooksFee { get; set; }
        public decimal DevelopmentFee { get; set; }
        public decimal Miscellaneous { get; set; }
        public decimal TotalAmount { get; set; }

        // Installment Support
        public int InstallmentCount { get; set; }
        public string? InstallmentAmounts { get; set; }
        public string? InstallmentDueDates { get; set; }

        public string? Description { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    // Fee Record DTOs
    public class CreateFeeRecordRequest
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        public Guid StudentId { get; set; }

        public Guid? FeeStructureId { get; set; }

        [Required]
        public DateTime DueDate { get; set; }

        [Required]
        public decimal TotalAmount { get; set; }

        public decimal PaidAmount { get; set; } = 0;

        public decimal DiscountAmount { get; set; } = 0;

        public decimal LateFeeAmount { get; set; } = 0;

        [Required]
        [MaxLength(20)]
        public string AcademicYear { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "pending";
    }

    public class UpdateFeeRecordRequest
    {
        public DateTime? DueDate { get; set; }
        public decimal? TotalAmount { get; set; }
        public decimal? PaidAmount { get; set; }
        public decimal? DiscountAmount { get; set; }
        public decimal? LateFeeAmount { get; set; }
        
        [MaxLength(20)]
        public string? Status { get; set; }
    }

    public class FeeRecordResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string Class { get; set; } = string.Empty;
        public Guid? FeeStructureId { get; set; }
        public string? FeeStructureName { get; set; }
        public DateTime DueDate { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal LateFeeAmount { get; set; }
        public decimal PendingAmount { get; set; }
        public DateTime? LastPaymentDate { get; set; }
        public string AcademicYear { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public List<PaymentTransactionDto> Payments { get; set; } = new();
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    // Payment Transaction DTOs
    public class CreatePaymentRequest
    {
        // SchoolId is optional in the body — the controller always overwrites it from tenant context
        public Guid? SchoolId { get; set; }

        [Required]
        public Guid StudentId { get; set; }

        [Required]
        public Guid FeeRecordId { get; set; }

        [Required]
        public decimal Amount { get; set; }

        [Required]
        public DateTime Date { get; set; }

        [Required]
        [MaxLength(50)]
        public string Method { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string ReceiptNumber { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? GatewayRef { get; set; }

        [MaxLength(100)]
        public string? GatewayOrderId { get; set; }

        // Cheque Details
        [MaxLength(50)]
        public string? ChequeNumber { get; set; }

        public DateTime? ChequeDate { get; set; }

        [MaxLength(100)]
        public string? BankName { get; set; }

        [MaxLength(100)]
        public string? ProcessedBy { get; set; }

        [MaxLength(20)]
        public string? AcademicYear { get; set; }

        public string? Remarks { get; set; }
    }

    public class PaymentTransactionDto
    {
        public Guid Id { get; set; }
        public decimal Amount { get; set; }
        public DateTime Date { get; set; }
        public string Method { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string ReceiptNumber { get; set; } = string.Empty;
        public string? GatewayRef { get; set; }
        public string? GatewayOrderId { get; set; }
        public string? ChequeNumber { get; set; }
        public DateTime? ChequeDate { get; set; }
        public string? BankName { get; set; }
        public string? ProcessedBy { get; set; }
        public string? Remarks { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class PaymentResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid StudentId { get; set; }
        public Guid FeeRecordId { get; set; }
        public decimal Amount { get; set; }
        public DateTime Date { get; set; }
        public string Method { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string ReceiptNumber { get; set; } = string.Empty;
        public string? GatewayRef { get; set; }
        public string? GatewayOrderId { get; set; }
        public string? ChequeNumber { get; set; }
        public DateTime? ChequeDate { get; set; }
        public string? BankName { get; set; }
        public string? ProcessedBy { get; set; }
        public string? AcademicYear { get; set; }
        public string? Remarks { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    // Late Fee Config DTOs
    public class CreateLateFeeConfigRequest
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        [MaxLength(50)]
        public string Class { get; set; } = string.Empty;

        [MaxLength(20)]
        public string? AcademicYear { get; set; }

        public int GracePeriodDays { get; set; } = 0;

        [Required]
        [MaxLength(20)]
        public string FeeType { get; set; } = "fixed";

        [Required]
        public decimal Amount { get; set; }

        public decimal? MaxAmount { get; set; }

        public bool IsActive { get; set; } = true;
    }

    public class LateFeeConfigResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string Class { get; set; } = string.Empty;
        public string? AcademicYear { get; set; }
        public int GracePeriodDays { get; set; }
        public string FeeType { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public decimal? MaxAmount { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    // List Responses
    public class FeeListResponse
    {
        public List<FeeRecordResponse> FeeRecords { get; set; } = new();
        public int Total { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }

    public class FeeStructureListResponse
    {
        public List<FeeStructureResponse> FeeStructures { get; set; } = new();
        public int Total { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }

    // Statistics
    public class FeeStatsResponse
    {
        public decimal TotalFees { get; set; }
        public decimal CollectedFees { get; set; }
        public decimal PendingFees { get; set; }
        public decimal OverdueFees { get; set; }
        public decimal DiscountGiven { get; set; }
        public decimal LateFeeCollected { get; set; }
        public Dictionary<string, decimal> ByClass { get; set; } = new();
        public Dictionary<string, decimal> ByMethod { get; set; } = new();
        public Dictionary<string, int> ByConcessionType { get; set; } = new();
    }

    // Fee Filters DTOs
    public class FeeRecordsFiltersDto
    {
        public Guid? StudentId { get; set; }
        public Guid? ClassId { get; set; }
        public string? Status { get; set; }
        public string? SearchQuery { get; set; }
        public DateTime? DateFrom { get; set; }
        public DateTime? DateTo { get; set; }
        public string? AcademicYear { get; set; }
    }

    public class FeeStructuresFiltersDto
    {
        public string? Class { get; set; }
        public string? Status { get; set; }
        public string? SearchQuery { get; set; }
        public string? AcademicYear { get; set; }
    }

    // Late Fee Configuration DTOs
    public class LateFeeConfigDto
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public int GracePeriodDays { get; set; }
        public string FeeType { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public decimal? MaxAmount { get; set; }
        public bool IsActive { get; set; }
    }

    public class CreateLateFeeConfigDto
    {
        [Required]
        public int GracePeriodDays { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string FeeType { get; set; } = "daily"; // fixed, percentage, daily
        
        [Required]
        public decimal Amount { get; set; }
        
        public decimal? MaxAmount { get; set; }
        
        public bool IsActive { get; set; } = true;
    }

    // ===========================
    // Payment Gateway DTOs
    // ===========================
    
    public class InitiatePaymentDto
    {
        [Required]
        [MaxLength(20)]
        public string Gateway { get; set; } = "razorpay"; // razorpay, payu, stripe, manual
        
        [Required]
        public decimal Amount { get; set; }
        
        [MaxLength(3)]
        public string Currency { get; set; } = "INR";
        
        [MaxLength(500)]
        public string? Notes { get; set; }
    }

    public class PaymentGatewayResponseDto
    {
        public string OrderId { get; set; } = string.Empty;
        public string Gateway { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Currency { get; set; } = string.Empty;
        public string? GatewayKey { get; set; } // Public key for client-side
        public string? CheckoutUrl { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
    }

    public class VerifyPaymentDto
    {
        [Required]
        [MaxLength(100)]
        public string GatewayPaymentId { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(100)]
        public string GatewayOrderId { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(100)]
        public string GatewaySignature { get; set; } = string.Empty;
    }

    public class PaymentStatusDto
    {
        public Guid TransactionId { get; set; }
        public string Status { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Gateway { get; set; } = string.Empty;
        public string? GatewayPaymentId { get; set; }
        public string? Method { get; set; }
        public DateTime? CompletedAt { get; set; }
        public string? ErrorMessage { get; set; }
    }

    // ===========================
    // Receipt DTOs
    // ===========================
    
    public class ReceiptDto
    {
        public Guid TransactionId { get; set; }
        public string ReceiptNumber { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string Class { get; set; } = string.Empty;
        public string AdmissionNumber { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string PaymentMethod { get; set; } = string.Empty;
        public string? ReferenceNumber { get; set; }
        public string SchoolName { get; set; } = string.Empty;
        public string? SchoolAddress { get; set; }
        public string? SchoolLogo { get; set; }
    }

    public class SendReceiptEmailDto
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;
        
        [MaxLength(200)]
        public string? Subject { get; set; }
        
        [MaxLength(1000)]
        public string? Message { get; set; }
    }

    // ===========================
    // Refund DTOs
    // ===========================
    
    public class CreateRefundDto
    {
        [Required]
        public decimal Amount { get; set; }
        
        [Required]
        [MaxLength(500)]
        public string Reason { get; set; } = string.Empty;
        
        [MaxLength(50)]
        public string RefundMethod { get; set; } = "original"; // original, bank_transfer, cash
        
        [MaxLength(500)]
        public string? Notes { get; set; }
    }

    public class RefundResponseDto
    {
        public Guid Id { get; set; }
        public Guid TransactionId { get; set; }
        public string RefundId { get; set; } = string.Empty;
        public string? GatewayRefundId { get; set; }
        public decimal Amount { get; set; }
        public string Status { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
        public string RefundMethod { get; set; } = string.Empty;
        public DateTime? ProcessedAt { get; set; }
        public string? ErrorMessage { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class RefundStatusDto
    {
        public Guid RefundId { get; set; }
        public string Status { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateTime? ProcessedAt { get; set; }
        public string? ErrorMessage { get; set; }
    }

    // ===========================
    // Overdue Fees DTOs
    // ===========================
    
    public class OverdueFeeDto
    {
        public Guid FeeRecordId { get; set; }
        public Guid StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string AdmissionNumber { get; set; } = string.Empty;
        public string Class { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateTime DueDate { get; set; }
        public int DaysOverdue { get; set; }
        public decimal CalculatedLateFee { get; set; }
        public string? GuardianPhone { get; set; }
        public string? GuardianEmail { get; set; }
    }

    public class SendRemindersDto
    {
        [Required]
        public int DaysBefore { get; set; } // Send reminders X days before due date
        
        [MaxLength(20)]
        public string? Channel { get; set; } = "all"; // sms, email, whatsapp, all
        
        [MaxLength(500)]
        public string? CustomMessage { get; set; }
    }

    public class ReminderResultDto
    {
        public int TotalRecords { get; set; }
        public int SentSuccessfully { get; set; }
        public int Failed { get; set; }
        public List<string> Errors { get; set; } = new();
    }

    // ===========================
    // Extra Charges DTOs
    // ===========================

    public class ExtraChargeItem
    {
        [Required]
        [MaxLength(100)]
        public string Label { get; set; } = string.Empty;

        [Required]
        public decimal Amount { get; set; }
    }

    public class AddExtraChargesRequest
    {
        [Required]
        [MinLength(1)]
        public List<ExtraChargeItem> Charges { get; set; } = new();

        [MaxLength(500)]
        public string? Reason { get; set; }

        [MaxLength(100)]
        public string? AddedBy { get; set; }
    }

    public class AddExtraChargesResponse
    {
        public Guid FeeRecordId { get; set; }
        public decimal PreviousTotalAmount { get; set; }
        public decimal ChargesAdded { get; set; }
        public decimal NewTotalAmount { get; set; }
        public decimal NewPendingAmount { get; set; }
        public string Message { get; set; } = string.Empty;
    }

    // ===========================
    // Edit Payment DTOs
    // ===========================

    public class EditPaymentRequest
    {
        public decimal? Amount { get; set; }

        [MaxLength(50)]
        public string? Method { get; set; }

        public DateTime? Date { get; set; }

        [MaxLength(50)]
        public string? ChequeNumber { get; set; }

        public DateTime? ChequeDate { get; set; }

        [MaxLength(100)]
        public string? BankName { get; set; }

        [MaxLength(100)]
        public string? GatewayRef { get; set; }

        [MaxLength(100)]
        public string? ProcessedBy { get; set; }

        public string? Remarks { get; set; }

        [Required]
        [MaxLength(500)]
        public string EditReason { get; set; } = string.Empty;
    }

    // ===========================
    // Link Structure DTOs
    // ===========================

    public class LinkStructureResponse
    {
        public Guid FeeRecordId { get; set; }
        public Guid StructureId { get; set; }
        public string StructureName { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
    }
}

