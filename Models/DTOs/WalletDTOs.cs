using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SmsApi.Models.DTOs
{
    // ========== FINANCE ACCOUNT DTOs ==========
    public class FinanceAccountDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty; // ASSET, LIABILITY, EQUITY, INCOME, EXPENSE
        public Guid? ParentAccountId { get; set; }
        public decimal Balance { get; set; }
        public bool IsActive { get; set; }
    }

    public class CreateFinanceAccountDto
    {
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [RegularExpression("^(ASSET|LIABILITY|EQUITY|INCOME|EXPENSE)$")]
        public string Type { get; set; } = string.Empty;

        public Guid? ParentAccountId { get; set; }

        [MaxLength(500)]
        public string? Description { get; set; }
    }

    // ========== FINANCE TRANSACTION DTOs ==========
    public class FinanceTransactionDto
    {
        public Guid Id { get; set; }
        public Guid AccountId { get; set; }
        public string AccountName { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Type { get; set; } = string.Empty; // DEBIT, CREDIT
        public Guid CategoryId { get; set; }
        public string CategoryName { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string Description { get; set; } = string.Empty;
        public string Source { get; set; } = string.Empty; // FEE, STORE, PETTY_CASH, DONATION, OTHER
        public string? ReceiptUrl { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateFinanceTransactionDto
    {
        [Required]
        public Guid AccountId { get; set; }

        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Amount must be greater than 0")]
        public decimal Amount { get; set; }

        [Required]
        [RegularExpression("^(DEBIT|CREDIT)$")]
        public string Type { get; set; } = string.Empty;

        [Required]
        public Guid CategoryId { get; set; }

        [Required]
        public DateTime Date { get; set; }

        [Required]
        [MaxLength(500)]
        public string Description { get; set; } = string.Empty;

        [Required]
        [RegularExpression("^(FEE|STORE|PETTY_CASH|DONATION|OTHER|PAYROLL)$")]
        public string Source { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? ReceiptUrl { get; set; }

        [MaxLength(100)]
        public string? ReferenceNumber { get; set; }
    }

    public class TransactionFiltersDto
    {
        public Guid? AccountId { get; set; }
        public Guid? CategoryId { get; set; }
        public string? Type { get; set; }
        public string? Source { get; set; }
        public DateTime? DateFrom { get; set; }
        public DateTime? DateTo { get; set; }
        public string? SearchQuery { get; set; }
    }

    // ========== FINANCE CATEGORY DTOs ==========
    public class FinanceCategoryDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty; // INCOME, EXPENSE
        public decimal? Budget { get; set; }
        public decimal ActualAmount { get; set; } // Calculated
        public bool IsActive { get; set; }
    }

    public class CreateFinanceCategoryDto
    {
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [RegularExpression("^(INCOME|EXPENSE)$")]
        public string Type { get; set; } = string.Empty;

        [Range(0, double.MaxValue)]
        public decimal? Budget { get; set; }

        [MaxLength(500)]
        public string? Description { get; set; }
    }

    // ========== PETTY CASH DTOs ==========
    public class PettyCashEntryDto
    {
        public Guid Id { get; set; }
        public DateTime Date { get; set; }
        public decimal Amount { get; set; }
        public string Purpose { get; set; } = string.Empty;
        public string RequestedByName { get; set; } = string.Empty;
        public string? ApprovedByName { get; set; }
        public string Status { get; set; } = string.Empty; // PENDING, APPROVED, REJECTED
        public string? ReceiptUrl { get; set; }
        public string? ApprovalRemarks { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreatePettyCashEntryDto
    {
        [Required]
        public DateTime Date { get; set; }

        [Required]
        [Range(0.01, 50000, ErrorMessage = "Amount must be between 0.01 and 50000")]
        public decimal Amount { get; set; }

        [Required]
        [MaxLength(500)]
        public string Purpose { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? ReceiptUrl { get; set; }
    }

    public class ApprovePettyCashDto
    {
        [Required]
        [RegularExpression("^(APPROVED|REJECTED)$")]
        public string Status { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? ApprovalRemarks { get; set; }
    }

    // ========== STORE SALE DTOs ==========
    public class StoreSaleDto
    {
        public Guid Id { get; set; }
        public DateTime Date { get; set; }
        public decimal Amount { get; set; }
        public int ItemsCount { get; set; }
        public string PaymentMethod { get; set; } = string.Empty;
        public string? InvoiceNumber { get; set; }
        public string? ProcessedByName { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateStoreSaleDto
    {
        [Required]
        public DateTime Date { get; set; }

        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Amount must be greater than 0")]
        public decimal Amount { get; set; }

        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "Items count must be at least 1")]
        public int ItemsCount { get; set; }

        [Required]
        [MaxLength(50)]
        public string PaymentMethod { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? InvoiceNumber { get; set; }

        [MaxLength(500)]
        public string? Notes { get; set; }
    }

    // ========== FINANCE STATS DTO ==========
    public class FinanceStatsDto
    {
        public decimal CashOnHand { get; set; }
        public decimal TotalIncome { get; set; }
        public decimal TotalExpenses { get; set; }
        public decimal NetIncome { get; set; }
        public decimal TodayIncome { get; set; }
        public decimal TodayExpenses { get; set; }
        public int PendingPettyCash { get; set; }
        // Cross-module fee data (from Fees module PaymentTransactions)
        public decimal CollectedFees { get; set; }
        public decimal PendingFees { get; set; }
        public decimal TotalFeesBilled { get; set; }
        public decimal OverdueFees { get; set; }
        public decimal FeeCollectionRate { get; set; }  // 0-100 percentage
        public Dictionary<string, decimal> IncomeByCategory { get; set; } = new();
        public Dictionary<string, decimal> ExpenseByCategory { get; set; } = new();
        public Dictionary<string, decimal> FeesByPaymentMethod { get; set; } = new();
    }

    public class FinanceFiltersDto
    {
        public DateTime? DateFrom { get; set; }
        public DateTime? DateTo { get; set; }
        public string? Type { get; set; }
        public string? Source { get; set; }
    }

    // ========== MONTHLY TREND DTO ==========
    public class MonthlyTrendDto
    {
        public string Month { get; set; } = string.Empty;   // "Jan 2025"
        public int Year { get; set; }
        public int MonthNumber { get; set; }
        public decimal Income { get; set; }
        public decimal Expenses { get; set; }
        public decimal Net { get; set; }
    }

    public class BudgetSummaryDto
    {
        public string CategoryName { get; set; } = string.Empty;
        public string CategoryType { get; set; } = string.Empty;
        public decimal Budget { get; set; }
        public decimal Actual { get; set; }
        public decimal Variance { get; set; }
        public decimal UtilizationPct { get; set; }
    }

    public class FinanceReportDto
    {
        public DateTime DateFrom { get; set; }
        public DateTime DateTo { get; set; }
        public decimal TotalIncome { get; set; }
        public decimal TotalExpenses { get; set; }
        public decimal NetSurplus { get; set; }
        public decimal StoreSalesTotal { get; set; }
        public decimal PettyCashTotal { get; set; }
        // Cross-module fee data
        public decimal FeeCollections { get; set; }
        public List<MonthlyTrendDto> MonthlyTrend { get; set; } = new();
        public List<BudgetSummaryDto> BudgetSummary { get; set; } = new();
    }

    public class UpdateFinanceCategoryDto
    {
        [MaxLength(100)]
        public string? Name { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? Budget { get; set; }
    }

    // ========== ADD INCOME/EXPENSE DTOs ==========
    public class AddIncomeDto
    {
        [Required]
        public Guid AccountId { get; set; }

        [Required]
        public Guid CategoryId { get; set; }

        [Required]
        [RegularExpression("^(FEE|STORE|DONATION|OTHER)$")]
        public string Source { get; set; } = string.Empty;

        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Amount must be greater than 0")]
        public decimal Amount { get; set; }

        [Required]
        public DateTime Date { get; set; }

        [Required]
        [MaxLength(500)]
        public string Description { get; set; } = string.Empty;
    }

    public class AddExpenseDto
    {
        [Required]
        public Guid AccountId { get; set; }

        [Required]
        public Guid CategoryId { get; set; }

        [Required]
        [RegularExpression("^(FEE|STORE|PETTY_CASH|DONATION|OTHER)$")]
        public string Source { get; set; } = string.Empty;

        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Amount must be greater than 0")]
        public decimal Amount { get; set; }

        [Required]
        public DateTime Date { get; set; }

        [Required]
        [MaxLength(500)]
        public string Description { get; set; } = string.Empty;
    }

    public class AddStoreIncomeDto
    {
        [Required]
        public Guid AccountId { get; set; }

        [Required]
        public Guid CategoryId { get; set; }

        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Amount must be greater than 0")]
        public decimal Amount { get; set; }

        [Required]
        public DateTime Date { get; set; }

        [Required]
        [MaxLength(500)]
        public string Description { get; set; } = string.Empty;
    }

    // ========== AGGREGATED INCOME SOURCES DTO ==========
    public class IncomeSourceDto
    {
        public string SourceName { get; set; } = string.Empty;                  // "Fee Collections", "Library Fines", etc.
        public string SourceCategory { get; set; } = string.Empty;              // "FEE", "STORE", "LIBRARY", "DONATION", "OTHER"
        public decimal ThisMonth { get; set; }                                  // Income this month
        public decimal LastMonth { get; set; }                                  // Income last month
        public decimal YearToDate { get; set; }                                 // Income year to date
        public decimal Pending { get; set; }                                    // Pending collection/approval
        public int TransactionCount { get; set; }                               // Number of transactions
        public DateTime? LastTransactionDate { get; set; }
    }

    public class AggregatedIncomeDto
    {
        public List<IncomeSourceDto> Sources { get; set; } = new();
        public decimal TotalThisMonth { get; set; }
        public decimal TotalLastMonth { get; set; }
        public decimal TotalYearToDate { get; set; }
        public decimal TotalPending { get; set; }
        public int TotalTransactions { get; set; }
        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    }

    // ========== PAYROLL SYNC DTOs ==========
    public class PayrollSyncResultDto
    {
        public int Synced { get; set; }
        public int Skipped { get; set; }
        public int Total { get; set; }
        public string? CustomMessage { get; set; }
        public string Message => CustomMessage ?? $"Synced {Synced} payroll expense(s). {Skipped} already synced or skipped.";
    }
}
