using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;

namespace SmsApi.Services
{
    public interface IStaffTaxService
    {
        Task<List<StaffTaxDeclarationResponse>> GetDeclarationsAsync(Guid schoolId, string? financialYear);
        Task<StaffTaxDeclarationResponse?> GetDeclarationByIdAsync(Guid id, Guid schoolId);
        Task<StaffTaxDeclarationResponse?> GetDeclarationByStaffAsync(Guid staffId, Guid schoolId, string financialYear);
        Task<StaffTaxDeclarationResponse> CreateOrUpdateDeclarationAsync(Guid schoolId, CreateStaffTaxDeclarationRequest request);
        Task<StaffTaxDeclarationResponse?> UpdateStatusAsync(Guid id, Guid schoolId, Guid approvedBy, string status);
        Task<bool> DeleteDeclarationAsync(Guid id, Guid schoolId);
    }

    public class StaffTaxService : IStaffTaxService
    {
        private readonly AppDbContext _context;

        public StaffTaxService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<StaffTaxDeclarationResponse>> GetDeclarationsAsync(Guid schoolId, string? financialYear)
        {
            var q = _context.StaffTaxDeclarations
                .Include(d => d.Staff)
                .Where(d => d.SchoolId == schoolId && !d.IsDeleted);
            if (!string.IsNullOrWhiteSpace(financialYear)) q = q.Where(d => d.FinancialYear == financialYear);
            var list = await q.OrderBy(d => d.FinancialYear).ToListAsync();
            return list.Select(MapDeclaration).ToList();
        }

        public async Task<StaffTaxDeclarationResponse?> GetDeclarationByIdAsync(Guid id, Guid schoolId)
        {
            var d = await _context.StaffTaxDeclarations.Include(x => x.Staff)
                .FirstOrDefaultAsync(x => x.Id == id && x.SchoolId == schoolId && !x.IsDeleted);
            return d == null ? null : MapDeclaration(d);
        }

        public async Task<StaffTaxDeclarationResponse?> GetDeclarationByStaffAsync(Guid staffId, Guid schoolId, string financialYear)
        {
            var d = await _context.StaffTaxDeclarations.Include(x => x.Staff)
                .FirstOrDefaultAsync(x => x.StaffId == staffId && x.SchoolId == schoolId && x.FinancialYear == financialYear && !x.IsDeleted);
            return d == null ? null : MapDeclaration(d);
        }

        public async Task<StaffTaxDeclarationResponse> CreateOrUpdateDeclarationAsync(Guid schoolId, CreateStaffTaxDeclarationRequest request)
        {
            var staff = await _context.StaffMembers.FirstOrDefaultAsync(s => s.Id == request.StaffId && s.SchoolId == schoolId && !s.IsDeleted);
            if (staff == null) throw new KeyNotFoundException("Staff member not found.");

            var existing = await _context.StaffTaxDeclarations.Include(d => d.Staff)
                .FirstOrDefaultAsync(d => d.StaffId == request.StaffId && d.SchoolId == schoolId && d.FinancialYear == request.FinancialYear && !d.IsDeleted);

            if (existing != null && existing.Status == "finalized")
                throw new InvalidOperationException("Cannot modify a finalized tax declaration.");

            var decl = existing ?? new StaffTaxDeclaration
            {
                Id = Guid.NewGuid(), SchoolId = schoolId, CreatedAt = DateTime.UtcNow
            };

            // Map fields
            decl.StaffId = request.StaffId;
            decl.FinancialYear = request.FinancialYear;
            decl.TaxRegime = request.TaxRegime;
            decl.BasicSalary = request.BasicSalary;
            decl.HraReceived = request.HRA;
            decl.LtaReceived = request.LTA;
            decl.MedicalAllowance = request.Medical;
            decl.OtherAllowances = request.OtherAllowances;
            decl.HraExemption = request.HraExemption;
            decl.LtaExemption = request.LtaExemption;
            decl.StandardDeduction = 50000;
            decl.Section80C = Math.Min(request.Section80C, 150000);
            decl.Section80D = request.Section80D;
            decl.Section80G = request.Section80G;
            decl.Section80E = request.Section80E;
            decl.HomeLoanInterest = Math.Min(request.HomeLoanInterest, 200000);
            decl.ProfessionalTax = Math.Min(request.ProfessionalTax, 2400);
            decl.TdsDeducted = request.TdsDeducted;
            decl.UpdatedAt = DateTime.UtcNow;
            if (existing == null) decl.Status = "draft";

            // Compute taxes
            ComputeTax(decl);

            if (existing == null)
                _context.StaffTaxDeclarations.Add(decl);
            await _context.SaveChangesAsync();

            if (decl.Staff == null)
                await _context.Entry(decl).Reference(d => d.Staff).LoadAsync();
            return MapDeclaration(decl);
        }

        public async Task<StaffTaxDeclarationResponse?> UpdateStatusAsync(Guid id, Guid schoolId, Guid approvedBy, string status)
        {
            var decl = await _context.StaffTaxDeclarations.Include(d => d.Staff)
                .FirstOrDefaultAsync(d => d.Id == id && d.SchoolId == schoolId && !d.IsDeleted);
            if (decl == null) return null;

            decl.Status = status;
            if (status == "submitted") decl.SubmittedAt = DateTime.UtcNow;
            if (status is "approved" or "finalized")
            {
                decl.ApprovedBy = approvedBy;
                decl.ApprovedAt = DateTime.UtcNow;
            }
            decl.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return MapDeclaration(decl);
        }

        public async Task<bool> DeleteDeclarationAsync(Guid id, Guid schoolId)
        {
            var decl = await _context.StaffTaxDeclarations.FirstOrDefaultAsync(d => d.Id == id && d.SchoolId == schoolId && !d.IsDeleted);
            if (decl == null) return false;
            decl.IsDeleted = true; decl.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }

        /// <summary>
        /// Computes Indian income tax for FY per old regime slab rates (AY 2024-25).
        /// New regime uses flat slab (FY 2023-24 onwards default slabs).
        /// </summary>
        private static void ComputeTax(StaffTaxDeclaration d)
        {
            var grossIncome = d.BasicSalary + d.HraReceived + d.LtaReceived + d.MedicalAllowance + d.OtherAllowances;
            d.GrossIncome = grossIncome;

            decimal taxableIncome;
            if (d.TaxRegime == "new")
            {
                // New regime FY 2023-24: no exemptions, standard deduction ₹50,000
                taxableIncome = Math.Max(0, grossIncome - 50000);
                d.TaxLiability = ComputeNewRegimeTax(taxableIncome);
            }
            else
            {
                // Old regime
                var totalDeductions = d.HraExemption + d.LtaExemption + d.StandardDeduction
                    + d.Section80C + d.Section80D + d.Section80G + d.Section80E
                    + d.HomeLoanInterest + d.ProfessionalTax;
                taxableIncome = Math.Max(0, grossIncome - totalDeductions);
                d.TaxLiability = ComputeOldRegimeTax(taxableIncome);
            }

            d.TaxableIncome = taxableIncome;
            d.EducationCess = Math.Round(d.TaxLiability * 0.04m, 2);
            d.TotalTaxPayable = d.TaxLiability + d.EducationCess;
            d.BalanceTax = d.TotalTaxPayable - d.TdsDeducted;
        }

        private static decimal ComputeOldRegimeTax(decimal income)
        {
            // FY 2024-25 old regime slabs (individuals below 60)
            decimal tax = 0;
            if (income <= 250000) return 0;
            if (income <= 500000) return Math.Round((income - 250000) * 0.05m, 2);
            tax = 12500;
            if (income <= 1000000) return Math.Round(tax + (income - 500000) * 0.20m, 2);
            tax = 112500;
            return Math.Round(tax + (income - 1000000) * 0.30m, 2);
        }

        private static decimal ComputeNewRegimeTax(decimal income)
        {
            // FY 2024-25 new regime default slabs
            if (income <= 300000) return 0;
            decimal tax = 0;
            if (income <= 600000) return Math.Round((income - 300000) * 0.05m, 2);
            tax = 15000;
            if (income <= 900000) return Math.Round(tax + (income - 600000) * 0.10m, 2);
            tax = 45000;
            if (income <= 1200000) return Math.Round(tax + (income - 900000) * 0.15m, 2);
            tax = 90000;
            if (income <= 1500000) return Math.Round(tax + (income - 1200000) * 0.20m, 2);
            tax = 150000;
            return Math.Round(tax + (income - 1500000) * 0.30m, 2);
        }

        private static StaffTaxDeclarationResponse MapDeclaration(StaffTaxDeclaration d) => new()
        {
            Id = d.Id, SchoolId = d.SchoolId, StaffId = d.StaffId,
            StaffName = d.Staff != null ? $"{d.Staff.FirstName} {d.Staff.LastName}".Trim() : string.Empty,
            EmployeeCode = d.Staff?.EmployeeId ?? string.Empty,
            FinancialYear = d.FinancialYear, TaxRegime = d.TaxRegime,
            BasicSalary = d.BasicSalary, HRA = d.HraReceived, LTA = d.LtaReceived,
            Medical = d.MedicalAllowance, OtherAllowances = d.OtherAllowances,
            HraExemption = d.HraExemption, LtaExemption = d.LtaExemption,
            StandardDeduction = d.StandardDeduction,
            Section80C = d.Section80C, Section80D = d.Section80D, Section80G = d.Section80G,
            Section80E = d.Section80E, HomeLoanInterest = d.HomeLoanInterest,
            ProfessionalTax = d.ProfessionalTax, TdsDeducted = d.TdsDeducted,
            GrossIncome = d.GrossIncome, TaxableIncome = d.TaxableIncome,
            TaxLiability = d.TaxLiability, EducationCess = d.EducationCess,
            TotalTaxPayable = d.TotalTaxPayable, BalanceTax = d.BalanceTax,
            Status = d.Status, CreatedAt = d.CreatedAt, UpdatedAt = d.UpdatedAt
        };
    }
}
