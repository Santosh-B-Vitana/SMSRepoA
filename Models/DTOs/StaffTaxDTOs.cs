using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SmsApi.Models.DTOs
{
    // ── Staff Tax Declaration DTOs ───────────────────────────────────────────────

    public class CreateStaffTaxDeclarationRequest
    {
        [Required] public Guid StaffId { get; set; }
        [Required] [MaxLength(10)] public string FinancialYear { get; set; } = string.Empty; // e.g. 2024-25
        [MaxLength(10)] public string TaxRegime { get; set; } = "old"; // old / new

        // Income
        public decimal BasicSalary { get; set; }
        public decimal HRA { get; set; }
        public decimal LTA { get; set; }
        public decimal Medical { get; set; }
        public decimal OtherAllowances { get; set; }

        // Deductions
        public decimal HraExemption { get; set; }
        public decimal LtaExemption { get; set; }
        public decimal Section80C { get; set; }
        public decimal Section80D { get; set; }
        public decimal Section80G { get; set; }
        public decimal Section80E { get; set; }
        public decimal HomeLoanInterest { get; set; }
        public decimal ProfessionalTax { get; set; }
        public decimal TdsDeducted { get; set; }
    }

    public class StaffTaxDeclarationResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid StaffId { get; set; }
        public string StaffName { get; set; } = string.Empty;
        public string EmployeeCode { get; set; } = string.Empty;
        public string FinancialYear { get; set; } = string.Empty;
        public string TaxRegime { get; set; } = "old";

        // Income
        public decimal BasicSalary { get; set; }
        public decimal HRA { get; set; }
        public decimal LTA { get; set; }
        public decimal Medical { get; set; }
        public decimal OtherAllowances { get; set; }

        // Deductions
        public decimal HraExemption { get; set; }
        public decimal LtaExemption { get; set; }
        public decimal StandardDeduction { get; set; } = 50000;
        public decimal Section80C { get; set; }
        public decimal Section80D { get; set; }
        public decimal Section80G { get; set; }
        public decimal Section80E { get; set; }
        public decimal HomeLoanInterest { get; set; }
        public decimal ProfessionalTax { get; set; }

        // Computed
        public decimal GrossIncome { get; set; }
        public decimal TaxableIncome { get; set; }
        public decimal TaxLiability { get; set; }
        public decimal EducationCess { get; set; }
        public decimal TotalTaxPayable { get; set; }
        public decimal TdsDeducted { get; set; }
        public decimal BalanceTax { get; set; }

        public string Status { get; set; } = "draft";
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class UpdateTaxStatusRequest
    {
        [Required] public string Status { get; set; } = string.Empty; // submitted/approved/finalized
    }
}
