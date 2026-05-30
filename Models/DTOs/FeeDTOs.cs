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
        // SchoolId is intentionally optional in the body — the controller always
        // overwrites it from the authenticated user's tenant context.
        public Guid? SchoolId { get; set; }

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

        /// <summary>
        /// Per-head billing frequency. Keys: tuitionFee, admissionFee, examFee, etc.
        /// Values: "once" | "termly" | "halfYearly" | "quarterly" | "monthly"
        /// </summary>
        public string? FeeHeadFrequencies { get; set; }

        public string? Description { get; set; }

        public Guid? BoardConfigurationId { get; set; }
    }

    public class UpdateFeeStructureRequest
    {
        [MaxLength(100)]
        public string? Name { get; set; }

        /// <summary>Comma-separated class list, e.g. "5A, 5B" — replaces the current class(es).</summary>
        [MaxLength(200)]
        public string? Class { get; set; }

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

        /// <summary>Per-head billing frequency map (JSON). See CreateFeeStructureRequest.FeeHeadFrequencies.</summary>
        public string? FeeHeadFrequencies { get; set; }

        public string? Description { get; set; }

        public Guid? BoardConfigurationId { get; set; }
    }

    /// <summary>Request body for adding/removing a class from a fee structure's class list.</summary>
    public class UpdateLinkedClassRequest
    {
        /// <summary>Class name to add to the structure's class list.</summary>
        public string? AddClass { get; set; }
        /// <summary>Class name to remove from the structure's class list.</summary>
        public string? RemoveClass { get; set; }
    }

    public class FeeStructureResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Class { get; set; } = string.Empty;
        public string AcademicYear { get; set; } = string.Empty;
        public Guid? BoardConfigurationId { get; set; }
        public string? BoardName { get; set; }

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

        /// <summary>Per-head billing frequency map (JSON). Keys: tuitionFee etc. Values: once|termly|halfYearly|quarterly|monthly.</summary>
        public string? FeeHeadFrequencies { get; set; }

        public string? Description { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        /// <summary>Number of fee records (students) linked to this structure. 0 = not yet assigned.</summary>
        public int AssignedStudentCount { get; set; }

        public bool IsActive { get; set; } = true;
    }

    // Fee Record DTOs
    public class UpdateModuleFeesRequest
    {
        public decimal? TransportMonthlyFee { get; set; }
        public decimal? HostelMonthlyFee { get; set; }
    }

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
        public string AdmissionNumber { get; set; } = string.Empty;
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

        // Transport & Hostel fee breakdown (live from assignments)
        public decimal TransportFee { get; set; } = 0;        // pro-rata amount charged
        public decimal TransportMonthlyFee { get; set; } = 0; // configured monthly rate
        public string? TransportRoute { get; set; }
        public string? TransportPickup { get; set; }
        public decimal HostelFee { get; set; } = 0;           // pro-rata amount charged
        public decimal HostelMonthlyFee { get; set; } = 0;    // configured monthly rate
        public string? HostelRoom { get; set; }

        /// <summary>
        /// Per-student fee head overrides (JSON dict). Not a concession — reflects structural exemptions.
        /// E.g. {"libraryFee":0} means this student's library fee was waived at the fee-head level.
        /// </summary>
        public string? FeeHeadOverrides { get; set; }
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

        /// <summary>
        /// When true, the backend creates an in-app notification for the student's
        /// guardians (those with CanViewFees = true and a portal UserLoginId).
        /// </summary>
        public bool NotifyParent { get; set; } = true;
    }

    public class PaymentTransactionDto
    {
        public Guid Id { get; set; }
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

    // Recent payments (for Day Summary / today's collection)
    public class RecentPaymentDto
    {
        public Guid Id { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string Class { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateTime Date { get; set; }
        public string Method { get; set; } = string.Empty;
        public string ReceiptNumber { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
    }

    // Sibling info (for sibling discount panel in collect form)
    public class SiblingInstallmentDto
    {
        public int Number { get; set; }
        public string Label { get; set; } = string.Empty;   // "Term 1", "Q1", "Annual", etc.
        /// <summary>Installment amount scaled to actual fee record total (not structure template)</summary>
        public decimal Amount { get; set; }
        /// <summary>How much of the student's paid amount covers this installment</summary>
        public decimal PaidInInstallment { get; set; }
        /// <summary>Amount still due for this installment (Amount - PaidInInstallment)</summary>
        public decimal DueInInstallment { get; set; }
        public DateTime? DueDate { get; set; }
        /// <summary>paid | current | upcoming</summary>
        public string Status { get; set; } = string.Empty;
        /// <summary>
        /// Proportional fee head amounts for this installment (only non-zero heads included).
        /// Key: display label (e.g. "Tuition Fee"), Value: amount due in this installment for that head.
        /// </summary>
        public Dictionary<string, decimal> FeeHeads { get; set; } = new();
    }

    public class SiblingConcessionDto
    {
        public string Name { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Reason { get; set; } = string.Empty;
    }

    public class SiblingFeeInfoDto
    {
        public Guid StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string Class { get; set; } = string.Empty;
        public string Section { get; set; } = string.Empty;
        public bool IsAnchor { get; set; }
        public decimal TotalFee { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal PendingAmount { get; set; }
        /// <summary>Discount already applied to FeeRecord (reduces pending amount)</summary>
        public decimal DiscountAmount { get; set; }
        /// <summary>Late fee already applied to FeeRecord (increases pending amount)</summary>
        public decimal LateFeeAmount { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? FeeRecordId { get; set; }
        public string AcademicYear { get; set; } = string.Empty;
        public string? StructureName { get; set; }
        /// <summary>Installment plan type label: Annual / Half-Yearly / Term-wise / Quarterly / Monthly</summary>
        public string InstallmentPlan { get; set; } = "Annual";
        public List<SiblingInstallmentDto> Installments { get; set; } = new();
        /// <summary>Fee head breakdown (full year, not per installment). Key = label e.g. "Tuition Fee".</summary>
        public Dictionary<string, decimal> FeeHeads { get; set; } = new();
        /// <summary>Per-head billing frequency. Keys = camelCase head names. Values = once|termly|halfYearly|quarterly|monthly.</summary>
        public Dictionary<string, string> FeeHeadFrequencies { get; set; } = new();
        public decimal ConcessionAmount { get; set; }
        public List<SiblingConcessionDto> Concessions { get; set; } = new();
        /// <summary>Active transport monthly fee from TransportStudents table (null = not enrolled)</summary>
        public decimal? TransportMonthlyFee { get; set; }
        /// <summary>Active hostel monthly fee from HostelStudents table (null = not enrolled)</summary>
        public decimal? HostelMonthlyFee { get; set; }
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

    // ===========================
    // ClassFeeStructure DTOs
    // ===========================

    public class ClassFeeStructureResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid FeeStructureId { get; set; }
        public string FeeStructureName { get; set; } = string.Empty;
        public string ClassName { get; set; } = string.Empty;
        public string AcademicYear { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateClassFeeStructureRequest
    {
        [Required]
        public Guid FeeStructureId { get; set; }

        [Required]
        [MaxLength(50)]
        public string ClassName { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        public string AcademicYear { get; set; } = string.Empty;
    }

    // ===========================
    // StudentFeeItem DTOs
    // ===========================

    /// <summary>
    /// Per-student line-item discount record (Scholarship / Sibling / Management / Others).
    /// </summary>
    public class StudentFeeItemResponse
    {
        public Guid Id { get; set; }
        public Guid StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public Guid FeeStructureId { get; set; }
        public string FeeStructureName { get; set; } = string.Empty;
        /// <summary>Null means the discount applies to the full structure total.</summary>
        public Guid? FeeStructureComponentId { get; set; }
        public string? FeeHeadName { get; set; }
        public string AcademicYear { get; set; } = string.Empty;
        /// <summary>Scholarship | Sibling | Management | Others</summary>
        public string DiscountType { get; set; } = string.Empty;
        public decimal DiscountPercentage { get; set; }
        public decimal? FlatAmount { get; set; }
        /// <summary>Resolved discount amount based on percentage or flat override.</summary>
        public decimal ResolvedDiscountAmount { get; set; }
        public string? Reason { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateStudentFeeItemRequest
    {
        [Required]
        public Guid StudentId { get; set; }

        [Required]
        public Guid FeeStructureId { get; set; }

        /// <summary>Leave null to apply the discount to the entire structure.</summary>
        public Guid? FeeStructureComponentId { get; set; }

        [Required]
        [MaxLength(20)]
        public string AcademicYear { get; set; } = string.Empty;

        /// <summary>Scholarship | Sibling | Management | Others</summary>
        [Required]
        [MaxLength(50)]
        public string DiscountType { get; set; } = "Others";

        [Range(0, 100)]
        public decimal DiscountPercentage { get; set; } = 0;

        /// <summary>Flat override. When both are supplied, flat takes precedence.</summary>
        [Range(0, double.MaxValue)]
        public decimal? FlatAmount { get; set; }

        [MaxLength(500)]
        public string? Reason { get; set; }
    }

    public class UpdateStudentFeeItemRequest
    {
        [MaxLength(50)]
        public string? DiscountType { get; set; }

        [Range(0, 100)]
        public decimal? DiscountPercentage { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? FlatAmount { get; set; }

        [MaxLength(500)]
        public string? Reason { get; set; }

        public bool? IsActive { get; set; }
    }
}

