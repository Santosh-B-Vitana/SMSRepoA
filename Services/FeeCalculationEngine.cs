using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SmsApi.Data;
using SmsApi.Models.Entities;

namespace SmsApi.Services
{
    // ───────────────────────────────────────────────────────────────
    //  DTOs – pure data, no EF dependency
    // ───────────────────────────────────────────────────────────────

    public class FeeLineItem
    {
        public string Head { get; set; } = string.Empty;
        public decimal GrossAmount { get; set; }
        public decimal ConcessionAmount { get; set; }
        public decimal NetAmount { get; set; }
    }

    public class ConcessionBreakdown
    {
        public Guid ConcessionId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string DiscountType { get; set; } = string.Empty;   // Percentage | FixedAmount
        public decimal DiscountValue { get; set; }
        public decimal ComputedDiscount { get; set; }
        public int Priority { get; set; }
    }

    public class InstallmentDetail
    {
        public int Number { get; set; }
        public decimal Amount { get; set; }
        public DateTime DueDate { get; set; }
        public string Status { get; set; } = "pending";           // paid, partial, pending, overdue
        public decimal PaidAmount { get; set; }
        public decimal LateFee { get; set; }
        public decimal Balance { get; set; }
    }

    public class AgingBucket
    {
        public decimal Current { get; set; }      // not yet due
        public decimal Bucket0_30 { get; set; }   // 1-30 days overdue
        public decimal Bucket31_60 { get; set; }
        public decimal Bucket61_90 { get; set; }
        public decimal Bucket90Plus { get; set; }
        public decimal TotalOverdue { get; set; }
    }

    public class InvoiceBreakdown
    {
        public Guid StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string Class { get; set; } = string.Empty;
        public Guid FeeStructureId { get; set; }
        public string FeeStructureName { get; set; } = string.Empty;
        public string AcademicYear { get; set; } = string.Empty;

        // Line items
        public List<FeeLineItem> LineItems { get; set; } = new();
        public decimal GrossTotal { get; set; }

        // Concessions applied
        public List<ConcessionBreakdown> Concessions { get; set; } = new();
        public decimal TotalConcession { get; set; }
        public decimal ConcessionCap { get; set; }          // 75% cap
        public bool ConcessionCapHit { get; set; }

        // Net figures
        public decimal NetPayable { get; set; }
        public decimal LateFee { get; set; }
        public decimal GrandTotal { get; set; }              // NetPayable + LateFee
        public decimal AlreadyPaid { get; set; }
        public decimal OutstandingBalance { get; set; }

        // Installments
        public List<InstallmentDetail> Installments { get; set; } = new();
        public AgingBucket Aging { get; set; } = new();
    }

    // ───────────────────────────────────────────────────────────────
    //  Interface
    // ───────────────────────────────────────────────────────────────

    public interface IFeeCalculationEngine
    {
        /// <summary>
        /// Compute a full invoice breakdown for a student, applying all approved concessions,
        /// computing installments, late fees, and aging buckets.
        /// </summary>
        Task<InvoiceBreakdown> ComputeInvoiceAsync(Guid schoolId, Guid studentId, Guid feeStructureId);

        /// <summary>
        /// Preview what the fee would look like with a set of concession type IDs before they are approved.
        /// Used by the admin UI "Apply Concession" form.
        /// </summary>
        Task<InvoiceBreakdown> PreviewConcessionsAsync(Guid schoolId, Guid studentId, Guid feeStructureId, List<Guid> concessionTypeIds);

        /// <summary>
        /// Compute aging buckets across all outstanding records for a school.
        /// </summary>
        Task<AgingBucket> ComputeSchoolAgingAsync(Guid schoolId);
    }

    // ───────────────────────────────────────────────────────────────
    //  Implementation
    // ───────────────────────────────────────────────────────────────

    public class FeeCalculationEngine : IFeeCalculationEngine
    {
        private readonly AppDbContext _ctx;
        private readonly ILogger<FeeCalculationEngine> _log;
        private const decimal CONCESSION_CAP_PERCENT = 75m;

        // Priority ordering: fixed concessions first, then percentage (so fixed amount subtracted before %
        // This is how most Indian schools work — RTE is a fixed 100% first, then merit % on remainder)
        private static readonly Dictionary<string, int> ConcessionPriority = new(StringComparer.OrdinalIgnoreCase)
        {
            ["rte"]            = 1,
            ["ews"]            = 2,
            ["sc_st"]          = 3,
            ["special_need"]   = 4,
            ["staff_ward"]     = 5,
            ["merit"]          = 6,
            ["sports"]         = 7,
            ["sibling"]        = 8,
            ["obc"]            = 9,
            ["management"]     = 10,
        };

        public FeeCalculationEngine(AppDbContext ctx, ILogger<FeeCalculationEngine> log)
        {
            _ctx = ctx;
            _log = log;
        }

        // ─── Public API ──────────────────────────────────

        public async Task<InvoiceBreakdown> ComputeInvoiceAsync(Guid schoolId, Guid studentId, Guid feeStructureId)
        {
            // 1. Load entities
            var structure = await _ctx.FeeStructures.FirstOrDefaultAsync(f => f.Id == feeStructureId && f.SchoolId == schoolId)
                ?? throw new KeyNotFoundException("Fee structure not found");
            var student = await _ctx.Students.FirstOrDefaultAsync(s => s.Id == studentId && s.SchoolId == schoolId)
                ?? throw new KeyNotFoundException("Student not found");

            // 2. Load approved concessions for this student + academic year
            var concessions = await _ctx.FeeConcessions
                .Include(fc => fc.ConcessionType)
                .Where(fc => fc.SchoolId == schoolId
                          && fc.StudentId == studentId
                          && fc.Status == "Approved"
                          && fc.AcademicYear == structure.AcademicYear)
                .ToListAsync();

            // 3. Load existing fee record + payments (if any)
            var feeRecord = await _ctx.FeeRecords
                .FirstOrDefaultAsync(fr => fr.SchoolId == schoolId
                                        && fr.StudentId == studentId
                                        && fr.FeeStructureId == feeStructureId);

            var paidAmount = feeRecord?.PaidAmount ?? 0m;

            // 4. Late fee config
            var lateFeeConfig = await _ctx.LateFeeConfigs.FirstOrDefaultAsync(c => c.SchoolId == schoolId && c.IsActive);

            // 5. Build invoice
            var invoice = BuildInvoice(structure, student, concessions, paidAmount, feeRecord, lateFeeConfig);
            return invoice;
        }

        public async Task<InvoiceBreakdown> PreviewConcessionsAsync(
            Guid schoolId, Guid studentId, Guid feeStructureId, List<Guid> concessionTypeIds)
        {
            var structure = await _ctx.FeeStructures.FirstOrDefaultAsync(f => f.Id == feeStructureId && f.SchoolId == schoolId)
                ?? throw new KeyNotFoundException("Fee structure not found");
            var student = await _ctx.Students.FirstOrDefaultAsync(s => s.Id == studentId && s.SchoolId == schoolId)
                ?? throw new KeyNotFoundException("Student not found");

            // Build fake concessions from the requested types
            var types = await _ctx.ConcessionTypes
                .Where(ct => concessionTypeIds.Contains(ct.Id) && ct.SchoolId == schoolId)
                .ToListAsync();

            var fakeConcessions = types.Select(t => new FeeConcession
            {
                Id = Guid.NewGuid(),
                ConcessionTypeId = t.Id,
                ConcessionType = t,
                ApprovedAmount = t.DiscountType == "FixedAmount" ? t.DiscountValue : 0,
                Status = "Approved",
                AcademicYear = structure.AcademicYear,
            }).ToList();

            var feeRecord = await _ctx.FeeRecords
                .FirstOrDefaultAsync(fr => fr.SchoolId == schoolId
                                        && fr.StudentId == studentId
                                        && fr.FeeStructureId == feeStructureId);

            var paidAmount = feeRecord?.PaidAmount ?? 0m;
            var lateFeeConfig = await _ctx.LateFeeConfigs.FirstOrDefaultAsync(c => c.SchoolId == schoolId && c.IsActive);

            return BuildInvoice(structure, student, fakeConcessions, paidAmount, feeRecord, lateFeeConfig);
        }

        public async Task<AgingBucket> ComputeSchoolAgingAsync(Guid schoolId)
        {
            var records = await _ctx.FeeRecords
                .Where(r => r.SchoolId == schoolId && r.Status != "paid")
                .ToListAsync();

            var today = DateTime.UtcNow.Date;
            var bucket = new AgingBucket();

            foreach (var r in records)
            {
                var balance = r.PendingAmount;
                if (balance <= 0) continue;

                var daysOverdue = (today - r.DueDate.Date).Days;
                if (daysOverdue <= 0)       bucket.Current      += balance;
                else if (daysOverdue <= 30) bucket.Bucket0_30   += balance;
                else if (daysOverdue <= 60) bucket.Bucket31_60  += balance;
                else if (daysOverdue <= 90) bucket.Bucket61_90  += balance;
                else                        bucket.Bucket90Plus += balance;
            }

            bucket.TotalOverdue = bucket.Bucket0_30 + bucket.Bucket31_60 + bucket.Bucket61_90 + bucket.Bucket90Plus;
            return bucket;
        }

        // ─── Core calculation ────────────────────────────

        private InvoiceBreakdown BuildInvoice(
            FeeStructure structure,
            Student student,
            List<FeeConcession> concessions,
            decimal paidAmount,
            FeeRecord? existingRecord,
            LateFeeConfig? lateFeeConfig)
        {
            var invoice = new InvoiceBreakdown
            {
                StudentId = student.Id,
                StudentName = student.Name ?? $"{student.FirstName} {student.LastName}",
                Class = student.Class ?? "",
                FeeStructureId = structure.Id,
                FeeStructureName = structure.Name,
                AcademicYear = structure.AcademicYear,
            };

            // ── Step 1: Build line items from fee components ──
            var heads = new (string key, string label, decimal amount)[]
            {
                ("TuitionFee",      "Tuition Fee",          structure.TuitionFee),
                ("AdmissionFee",    "Admission Fee",        structure.AdmissionFee),
                ("ExamFee",         "Examination Fee",      structure.ExamFee),
                ("LibraryFee",      "Library Fee",          structure.LibraryFee),
                ("LabFee",          "Lab Fee",              structure.LabFee),
                ("SportsFee",       "Sports Fee",           structure.SportsFee),
                ("TransportFee",    "Transport Fee",        structure.TransportFee),
                ("HostelFee",       "Hostel Fee",           structure.HostelFee),
                ("UniformFee",      "Uniform Fee",          structure.UniformFee),
                ("BooksFee",        "Books / Stationery",   structure.BooksFee),
                ("DevelopmentFee",  "Development Fund",     structure.DevelopmentFee),
                ("Miscellaneous",   "Miscellaneous",        structure.Miscellaneous),
            };

            foreach (var (key, label, amount) in heads)
            {
                if (amount <= 0) continue;
                invoice.LineItems.Add(new FeeLineItem
                {
                    Head = label,
                    GrossAmount = amount,
                    ConcessionAmount = 0,
                    NetAmount = amount,
                });
            }

            invoice.GrossTotal = invoice.LineItems.Sum(li => li.GrossAmount);

            // ── Step 2: Apply overlapping concessions ──
            // Business rule: concessions are applied in priority order.
            // Fixed-amount concessions reduce the gross first.
            // Percentage concessions apply on the remaining balance.
            // Total concession is capped at CONCESSION_CAP_PERCENT% of gross.

            var sortedConcessions = concessions
                .Where(c => c.ConcessionType != null)
                .OrderBy(c => GetConcessionPriority(c.ConcessionType!.Name))
                .ThenBy(c => c.ConcessionType!.DiscountType == "FixedAmount" ? 0 : 1)
                .ToList();

            decimal runningNet = invoice.GrossTotal;
            decimal totalConcession = 0m;
            var concessionCap = invoice.GrossTotal * (CONCESSION_CAP_PERCENT / 100m);

            foreach (var fc in sortedConcessions)
            {
                var ct = fc.ConcessionType!;
                decimal discount;

                if (ct.DiscountType.Equals("FixedAmount", StringComparison.OrdinalIgnoreCase))
                {
                    discount = fc.ApprovedAmount > 0 ? fc.ApprovedAmount : ct.DiscountValue;
                }
                else // Percentage
                {
                    discount = runningNet * (ct.DiscountValue / 100m);
                    if (ct.MaxDiscountAmount.HasValue && discount > ct.MaxDiscountAmount.Value)
                        discount = ct.MaxDiscountAmount.Value;
                }

                // Enforce cap
                if (totalConcession + discount > concessionCap)
                {
                    discount = concessionCap - totalConcession;
                    invoice.ConcessionCapHit = true;
                }

                if (discount <= 0) continue;

                totalConcession += discount;
                runningNet -= discount;

                invoice.Concessions.Add(new ConcessionBreakdown
                {
                    ConcessionId = fc.Id,
                    Name = ct.Name,
                    DiscountType = ct.DiscountType,
                    DiscountValue = ct.DiscountValue,
                    ComputedDiscount = Math.Round(discount, 2),
                    Priority = GetConcessionPriority(ct.Name),
                });
            }

            // Distribute concession proportionally across line items
            if (totalConcession > 0 && invoice.GrossTotal > 0)
            {
                var ratio = totalConcession / invoice.GrossTotal;
                foreach (var li in invoice.LineItems)
                {
                    li.ConcessionAmount = Math.Round(li.GrossAmount * ratio, 2);
                    li.NetAmount = li.GrossAmount - li.ConcessionAmount;
                }
            }

            invoice.TotalConcession = Math.Round(totalConcession, 2);
            invoice.ConcessionCap = Math.Round(concessionCap, 2);
            invoice.NetPayable = Math.Round(runningNet, 2);

            // ── Step 3: Late fee ──
            decimal lateFee = 0m;
            if (existingRecord != null && existingRecord.Status != "paid" && lateFeeConfig != null && lateFeeConfig.IsActive)
            {
                var daysOverdue = (DateTime.UtcNow.Date - existingRecord.DueDate.Date).Days - lateFeeConfig.GracePeriodDays;
                if (daysOverdue > 0)
                {
                    var feeType = lateFeeConfig.FeeType?.ToLower() ?? "daily";
                    if (feeType == "daily")
                    {
                        var monthsComplete = (int)Math.Floor(daysOverdue / 30.0m);
                        var remainingDays = daysOverdue % 30;
                        var monthlyMax = lateFeeConfig.MaxAmount ?? (lateFeeConfig.Amount * 30);
                        lateFee = (monthsComplete * monthlyMax) + Math.Min(remainingDays * lateFeeConfig.Amount, monthlyMax);
                    }
                    else if (feeType == "percentage")
                    {
                        var months = (int)Math.Ceiling(daysOverdue / 30.0m);
                        lateFee = (invoice.NetPayable * (lateFeeConfig.Amount / 100m)) * months;
                    }
                    else // fixed
                    {
                        lateFee = lateFeeConfig.Amount;
                    }

                    if (lateFeeConfig.MaxAmount.HasValue)
                        lateFee = Math.Min(lateFee, lateFeeConfig.MaxAmount.Value);
                }
            }

            invoice.LateFee = Math.Round(lateFee, 2);
            invoice.GrandTotal = invoice.NetPayable + invoice.LateFee;
            invoice.AlreadyPaid = paidAmount;
            invoice.OutstandingBalance = Math.Max(0, invoice.GrandTotal - paidAmount);

            // ── Step 4: Installment schedule ──
            var installmentCount = Math.Max(1, structure.InstallmentCount);
            var perInstallment = Math.Round(invoice.NetPayable / installmentCount, 2);

            List<DateTime>? dueDates = null;
            List<decimal>? amounts = null;

            try
            {
                if (!string.IsNullOrEmpty(structure.InstallmentDueDates))
                    dueDates = JsonSerializer.Deserialize<List<DateTime>>(structure.InstallmentDueDates);
                if (!string.IsNullOrEmpty(structure.InstallmentAmounts))
                    amounts = JsonSerializer.Deserialize<List<decimal>>(structure.InstallmentAmounts);
            }
            catch { /* fallback to equal split */ }

            var today = DateTime.UtcNow.Date;
            decimal installmentPaidRemaining = paidAmount;

            for (int i = 0; i < installmentCount; i++)
            {
                var instAmount = (amounts != null && amounts.Count > i) ? amounts[i] : perInstallment;
                var instDue = (dueDates != null && dueDates.Count > i)
                    ? dueDates[i]
                    : existingRecord?.DueDate.AddMonths(i * (12 / installmentCount)) ?? DateTime.UtcNow.AddMonths(i * (12 / installmentCount));

                // Figure out how much of paidAmount falls on this installment
                var instPaid = Math.Min(installmentPaidRemaining, instAmount);
                installmentPaidRemaining -= instPaid;
                var instBalance = instAmount - instPaid;

                string instStatus;
                if (instBalance <= 0) instStatus = "paid";
                else if (instPaid > 0) instStatus = "partial";
                else if (instDue.Date < today) instStatus = "overdue";
                else instStatus = "pending";

                invoice.Installments.Add(new InstallmentDetail
                {
                    Number = i + 1,
                    Amount = instAmount,
                    DueDate = instDue,
                    Status = instStatus,
                    PaidAmount = instPaid,
                    Balance = instBalance,
                    LateFee = instStatus == "overdue" ? Math.Round(lateFee / installmentCount, 2) : 0,
                });
            }

            // ── Step 5: Aging ──
            if (existingRecord != null)
            {
                var daysOver = (today - existingRecord.DueDate.Date).Days;
                var bal = invoice.OutstandingBalance;
                if (daysOver <= 0)       invoice.Aging.Current      = bal;
                else if (daysOver <= 30) invoice.Aging.Bucket0_30   = bal;
                else if (daysOver <= 60) invoice.Aging.Bucket31_60  = bal;
                else if (daysOver <= 90) invoice.Aging.Bucket61_90  = bal;
                else                     invoice.Aging.Bucket90Plus = bal;
                invoice.Aging.TotalOverdue = daysOver > 0 ? bal : 0;
            }

            return invoice;
        }

        private static int GetConcessionPriority(string concessionName)
        {
            foreach (var kvp in ConcessionPriority)
            {
                if (concessionName.Contains(kvp.Key, StringComparison.OrdinalIgnoreCase))
                    return kvp.Value;
            }
            return 99; // unknown → last
        }
    }
}
