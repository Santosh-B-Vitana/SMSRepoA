using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    /// <summary>
    /// Staff income tax declaration for a financial year.
    /// Supports Indian IT computation (old & new tax regime).
    /// </summary>
    public class StaffTaxDeclaration : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        public Guid StaffId { get; set; }

        /// <summary>Financial year string, e.g. "2024-25"</summary>
        [Required]
        [MaxLength(10)]
        public string FinancialYear { get; set; } = string.Empty;

        // ── INCOME ──────────────────────────────────────────────────────────

        [Column(TypeName = "decimal(12,2)")]
        public decimal BasicSalary { get; set; }

        [Column(TypeName = "decimal(12,2)")]
        public decimal HraReceived { get; set; }

        [Column(TypeName = "decimal(12,2)")]
        public decimal LtaReceived { get; set; }

        [Column(TypeName = "decimal(12,2)")]
        public decimal MedicalAllowance { get; set; }

        [Column(TypeName = "decimal(12,2)")]
        public decimal OtherAllowances { get; set; }

        // ── EXEMPTIONS / DEDUCTIONS (Old Regime) ────────────────────────────

        [Column(TypeName = "decimal(12,2)")]
        public decimal HraExemption { get; set; }       // computed or declared

        [Column(TypeName = "decimal(12,2)")]
        public decimal LtaExemption { get; set; }

        [Column(TypeName = "decimal(12,2)")]
        public decimal StandardDeduction { get; set; } = 50000; // FY24-25: ₹50,000

        /// <summary>80C investments (PPF, ELSS, LIC, etc.) — max ₹1,50,000</summary>
        [Column(TypeName = "decimal(12,2)")]
        public decimal Section80C { get; set; }

        /// <summary>80D health insurance premium — max ₹25,000 self + ₹25,000 parents</summary>
        [Column(TypeName = "decimal(12,2)")]
        public decimal Section80D { get; set; }

        /// <summary>80G donations</summary>
        [Column(TypeName = "decimal(12,2)")]
        public decimal Section80G { get; set; }

        /// <summary>80E education loan interest (no limit)</summary>
        [Column(TypeName = "decimal(12,2)")]
        public decimal Section80E { get; set; }

        /// <summary>24(b) home loan interest — max ₹2,00,000</summary>
        [Column(TypeName = "decimal(12,2)")]
        public decimal HomeLoanInterest { get; set; }

        [Column(TypeName = "decimal(12,2)")]
        public decimal ProfessionalTax { get; set; }   // max ₹2,400 typically

        // ── TAX COMPUTATION ─────────────────────────────────────────────────

        [Column(TypeName = "decimal(12,2)")]
        public decimal GrossIncome { get; set; }

        [Column(TypeName = "decimal(12,2)")]
        public decimal TaxableIncome { get; set; }

        [Column(TypeName = "decimal(12,2)")]
        public decimal TaxLiability { get; set; }

        [Column(TypeName = "decimal(12,2)")]
        public decimal EducationCess { get; set; }     // 4% of tax

        [Column(TypeName = "decimal(12,2)")]
        public decimal TotalTaxPayable { get; set; }

        [Column(TypeName = "decimal(12,2)")]
        public decimal TdsDeducted { get; set; }

        [Column(TypeName = "decimal(12,2)")]
        public decimal BalanceTax { get; set; }        // TotalTaxPayable - TdsDeducted

        // ── REGIME ──────────────────────────────────────────────────────────

        /// <summary>old / new</summary>
        [Required]
        [MaxLength(10)]
        public string TaxRegime { get; set; } = "old";

        /// <summary>draft / submitted / approved / finalized</summary>
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "draft";

        public DateTime? SubmittedAt { get; set; }

        public Guid? ApprovedBy { get; set; }

        public DateTime? ApprovedAt { get; set; }

        [MaxLength(1000)]
        public string? Remarks { get; set; }

        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }

        [ForeignKey("StaffId")]
        public virtual Staff? Staff { get; set; }
    }
}
