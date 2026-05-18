using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SmsApi.Models.DTOs
{
    // ========== BASIC DTO (for GET list) ==========
    // Lightweight DTO for GET list endpoints - only essential fields for performance
    // Used by: GET /api/payroll (list view)
    public class PayrollBasicDto
    {
        public Guid Id { get; set; }
        public Guid StaffId { get; set; }
        public string StaffName { get; set; } = string.Empty;
        public string EmployeeId { get; set; } = string.Empty;
        public string Month { get; set; } = string.Empty;  // e.g., "2025-01"
        public decimal GrossSalary { get; set; }
        public decimal NetSalary { get; set; }
        public string Status { get; set; } = string.Empty;  // pending/approved/paid
        public DateTime? PaymentDate { get; set; }
    }
    // Note: For full payroll details with allowances/deductions breakdown, use PayrollFullDto via GET /api/payroll/{id}

    // ========== FULL DTO (for GET by ID) ==========
    public class PayrollFullDto
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid StaffId { get; set; }
        public string StaffName { get; set; } = string.Empty;
        public string EmployeeId { get; set; } = string.Empty;
        public string Designation { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public string Month { get; set; } = string.Empty;
        public int Year { get; set; }
        
        // Salary Components
        public decimal BasicSalary { get; set; }
        public AllowanceBreakdownDto Allowances { get; set; } = new();
        public DeductionBreakdownDto Deductions { get; set; } = new();
        
        // Totals
        public decimal GrossSalary { get; set; }
        public decimal TotalDeductions { get; set; }
        public decimal NetSalary { get; set; }
        
        // Payment Details
        public DateTime? PaymentDate { get; set; }
        public string? PaymentMethod { get; set; }
        public string? BankAccountNumber { get; set; }
        public string? BankName { get; set; }
        public string? TransactionRef { get; set; }
        
        // Status
        public string Status { get; set; } = string.Empty;
        public Guid? ApprovedBy { get; set; }
        public string? ApprovedByName { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public string? Remarks { get; set; }
        
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class AllowanceBreakdownDto
    {
        public decimal HRA { get; set; }
        public decimal DA { get; set; }
        public decimal TA { get; set; }
        public decimal MA { get; set; }
        public decimal SpecialAllowance { get; set; }
        public decimal OvertimePay { get; set; }
        public decimal Bonus { get; set; }
        public decimal Other { get; set; }
        public decimal Total => HRA + DA + TA + MA + SpecialAllowance + OvertimePay + Bonus + Other;
    }

    public class DeductionBreakdownDto
    {
        public decimal PF { get; set; }
        public decimal ESI { get; set; }
        public decimal ProfessionalTax { get; set; }
        public decimal IncomeTax { get; set; }
        public decimal TDS { get; set; }
        public decimal LoanRecovery { get; set; }
        public decimal Advance { get; set; }
        public decimal LeaveDeduction { get; set; }
        public decimal Other { get; set; }
        public decimal Total => PF + ESI + ProfessionalTax + IncomeTax + TDS + LoanRecovery + Advance + LeaveDeduction + Other;
    }

    // ========== CREATE DTOs ==========
    public class CreatePayrollDto
    {
        [Required]
        public Guid StaffId { get; set; }

        [Required]
        [MaxLength(20)]
        public string Month { get; set; } = string.Empty;

        [Required]
        [Range(2020, 2100)]
        public int Year { get; set; }

        [Required]
        [Range(0, double.MaxValue)]
        public decimal BasicSalary { get; set; }

        public CreateAllowanceDto? Allowances { get; set; }
        public CreateDeductionDto? Deductions { get; set; }

        [MaxLength(500)]
        public string? Remarks { get; set; }
    }

    public class CreateAllowanceDto
    {
        public decimal HRA { get; set; }
        public decimal DA { get; set; }
        public decimal TA { get; set; }
        public decimal MA { get; set; }
        public decimal SpecialAllowance { get; set; }
        public decimal OvertimePay { get; set; }
        public decimal Bonus { get; set; }
        public decimal Other { get; set; }
    }

    public class CreateDeductionDto
    {
        public decimal PF { get; set; }
        public decimal ESI { get; set; }
        public decimal ProfessionalTax { get; set; }
        public decimal IncomeTax { get; set; }
        public decimal TDS { get; set; }
        public decimal LoanRecovery { get; set; }
        public decimal Advance { get; set; }
        public decimal LeaveDeduction { get; set; }
        public decimal Other { get; set; }
    }

    public class UpdatePayrollDto
    {
        public UpdateAllowanceDto? Allowances { get; set; }
        public UpdateDeductionDto? Deductions { get; set; }

        [MaxLength(20)]
        public string? Status { get; set; }

        public DateTime? PaymentDate { get; set; }

        [MaxLength(30)]
        public string? PaymentMethod { get; set; }

        [MaxLength(100)]
        public string? TransactionRef { get; set; }

        [MaxLength(500)]
        public string? Remarks { get; set; }
    }

    public class UpdateAllowanceDto
    {
        public decimal? HRA { get; set; }
        public decimal? DA { get; set; }
        public decimal? TA { get; set; }
        public decimal? MA { get; set; }
        public decimal? SpecialAllowance { get; set; }
        public decimal? OvertimePay { get; set; }
        public decimal? Bonus { get; set; }
        public decimal? Other { get; set; }
    }

    public class UpdateDeductionDto
    {
        public decimal? PF { get; set; }
        public decimal? ESI { get; set; }
        public decimal? ProfessionalTax { get; set; }
        public decimal? IncomeTax { get; set; }
        public decimal? TDS { get; set; }
        public decimal? LoanRecovery { get; set; }
        public decimal? Advance { get; set; }
        public decimal? LeaveDeduction { get; set; }
        public decimal? Other { get; set; }
    }

    public class ApprovePayrollDto
    {
        [MaxLength(500)]
        public string? Remarks { get; set; }
    }

    public class BulkGeneratePayrollDto
    {
        [Required]
        [MaxLength(20)]
        public string Month { get; set; } = string.Empty;

        [Required]
        [Range(2020, 2100)]
        public int Year { get; set; }

        public List<Guid>? StaffIds { get; set; } // null = all staff

        [MaxLength(50)]
        public string? Department { get; set; }
    }

    // ========== SALARY STRUCTURE DTOs ==========
    public class SalaryStructureDto
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Designation { get; set; }
        public decimal BasicSalary { get; set; }
        public AllowanceConfigDto AllowanceConfig { get; set; } = new();
        public DeductionConfigDto DeductionConfig { get; set; } = new();
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class AllowanceConfigDto
    {
        public decimal HRAPercentage { get; set; }
        public decimal DAPercentage { get; set; }
        public decimal TAFixed { get; set; }
        public decimal MAFixed { get; set; }
        public decimal SpecialAllowancePercentage { get; set; }
    }

    public class DeductionConfigDto
    {
        public decimal PFPercentage { get; set; }
        public decimal ESIPercentage { get; set; }
        public string? ProfessionalTaxSlab { get; set; }
        public decimal TDSPercentage { get; set; }
    }

    public class CreateSalaryStructureDto
    {
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(50)]
        public string? Designation { get; set; }

        [Required]
        [Range(0, double.MaxValue)]
        public decimal BasicSalary { get; set; }

        [Required]
        public AllowanceConfigDto AllowanceConfig { get; set; } = new();

        [Required]
        public DeductionConfigDto DeductionConfig { get; set; } = new();
    }

    // ========== STATS DTO ==========
    public class PayrollStatsDto
    {
        public int TotalRecords { get; set; }
        public int PaidRecords { get; set; }
        public int PendingRecords { get; set; }
        public decimal TotalPayroll { get; set; }
        public decimal AvgSalary { get; set; }
        public decimal TotalDeductions { get; set; }
        public decimal TotalPF { get; set; }
        public decimal TotalESI { get; set; }
        public decimal TotalTax { get; set; }
        public Dictionary<string, DepartmentPayrollDto> ByDepartment { get; set; } = new();
    }

    public class DepartmentPayrollDto
    {
        public int StaffCount { get; set; }
        public decimal TotalPayroll { get; set; }
        public decimal AvgSalary { get; set; }
    }

    public class PayrollFiltersDto
    {
        public Guid? StaffId { get; set; }
        public string? Month { get; set; }
        public int? Year { get; set; }
        public string? Status { get; set; }
        public string? Department { get; set; }
        public string? Designation { get; set; }
        public string? SearchQuery { get; set; }
    }

    // ========== LIST RESPONSE ==========
    public class PayrollListResponse
    {
        public List<PayrollBasicDto> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }
}
