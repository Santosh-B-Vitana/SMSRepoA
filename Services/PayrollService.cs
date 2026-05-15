using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using SmsApi.Data;
using SmsApi.Models.Entities;
using SmsApi.Models.DTOs;

namespace SmsApi.Services
{
    public interface IPayrollService
    {
        Task<PaginatedResponse<PayrollRecordBasicDto>> GetPayrollRecordsAsync(
            Guid schoolId, PayrollFiltersDto filters, int page, int pageSize);
        Task<PayrollRecordFullDto?> GetPayrollRecordByIdAsync(Guid schoolId, Guid id);
        Task<PayrollRecordFullDto?> GetPayrollByIdAsync(Guid schoolId, Guid id);
        Task<PayrollRecordFullDto> CreatePayrollRecordAsync(
            Guid schoolId, CreatePayrollRecordDto dto, Guid userId);
        Task<PayrollRecordFullDto> CreatePayrollAsync(
            Guid schoolId, CreatePayrollRecordDto dto, Guid userId);
        Task<PayrollRecordFullDto> UpdatePayrollRecordAsync(
            Guid schoolId, Guid id, UpdatePayrollRecordDto dto);
        Task<PayrollRecordFullDto> UpdatePayrollAsync(
            Guid schoolId, Guid id, UpdatePayrollRecordDto dto);
        Task<bool> DeletePayrollRecordAsync(Guid schoolId, Guid id);
        Task<bool> DeletePayrollAsync(Guid schoolId, Guid id);
        Task<List<PayrollRecordBasicDto>> ProcessPayrollAsync(
            Guid schoolId, int month, int year, List<Guid> staffIds, Guid userId);
        Task<List<PayrollRecordBasicDto>> ProcessPayrollsAsync(
            Guid schoolId, int month, int year, List<Guid> staffIds, Guid userId);
        Task<bool> ApprovePayrollAsync(Guid schoolId, Guid id, Guid userId);
        Task<PayrollRecordFullDto> GeneratePayslipAsync(Guid schoolId, Guid id);
        Task<PayrollRecordFullDto> GetPayslipAsync(Guid schoolId, Guid payrollId);
        Task<SalaryCalculationDto> CalculateSalaryAsync(Guid schoolId, Guid staffId, int month, int year);
        Task<PayrollStatsDto> GetPayrollStatsAsync(Guid schoolId, int? month, int? year);
        Task<SalaryStructureDto?> GetSalaryStructureAsync(Guid schoolId, string designation);
        Task<SalaryStructureDto> CreateSalaryStructureAsync(Guid schoolId, CreateSalaryStructureDto dto);
    }

    public class PayrollService : IPayrollService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<PayrollService> _logger;
        private readonly IServiceScopeFactory _scopeFactory;

        public PayrollService(AppDbContext context, ILogger<PayrollService> logger, IServiceScopeFactory scopeFactory)
        {
            _context = context;
            _logger = logger;
            _scopeFactory = scopeFactory;
        }

        // ========== PAYROLL RECORDS API ==========

        public async Task<PaginatedResponse<PayrollRecordBasicDto>> GetPayrollRecordsAsync(
            Guid schoolId, PayrollFiltersDto filters, int page, int pageSize)
        {
            try
            {
                // ===== PAGINATION BOUNDS NORMALIZATION =====
                if (page < 1)
                    page = 1;
                if (pageSize < 1)
                    pageSize = 1;
                if (pageSize > 100)
                    pageSize = 100;

                var query = _context.PayrollRecords
                    .AsNoTracking()
                    .Where(p => p.SchoolId == schoolId);

                if (filters.Month != null)
                {
                    var monthNum = GetMonthNumber(filters.Month);
                    if (monthNum > 0)
                        query = query.Where(p => p.Month == monthNum);
                }

                if (filters.Year.HasValue)
                    query = query.Where(p => p.Year == filters.Year.Value);

                if (!string.IsNullOrEmpty(filters.Status))
                    query = query.Where(p => p.Status == filters.Status);

                if (!string.IsNullOrEmpty(filters.Department))
                    query = query.Where(p => p.Staff != null && p.Staff.Department == filters.Department);

                if (!string.IsNullOrEmpty(filters.Designation))
                    query = query.Where(p => p.Staff != null && p.Staff.Designation == filters.Designation);

                if (!string.IsNullOrEmpty(filters.SearchQuery))
                {
                    query = query.Where(p => p.Staff != null &&
                        (p.Staff.FirstName.Contains(filters.SearchQuery) ||
                         p.Staff.LastName.Contains(filters.SearchQuery) ||
                         p.Staff.EmployeeId.Contains(filters.SearchQuery)));
                }

                var totalCount = await query.CountAsync();

                // Materialize first — GetMonthName() is a C# method, can't run in EF SQL projection
                var rawRecords = await query
                    .Include(p => p.Staff)
                    .OrderByDescending(p => p.Year)
                    .ThenByDescending(p => p.Month)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToListAsync();

                var items = rawRecords.Select(p => new PayrollRecordBasicDto
                {
                    Id = p.Id,
                    StaffId = p.StaffId,
                    StaffName = p.Staff != null ? $"{p.Staff.FirstName} {p.Staff.LastName}" : "",
                    EmployeeId = p.Staff != null ? p.Staff.EmployeeId : "",
                    Designation = p.Staff != null ? p.Staff.Designation : "",
                    Department = p.Staff != null ? p.Staff.Department : "",
                    Month = GetMonthName(p.Month),
                    Year = p.Year,
                    GrossSalary = p.BasicSalary + p.Allowances,
                    TotalDeductions = p.Deductions,
                    NetSalary = p.NetSalary,
                    Status = p.Status,
                    PaymentDate = p.PaymentDate
                }).ToList();

                return new PaginatedResponse<PayrollRecordBasicDto>
                {
                    Items = items,
                    TotalCount = totalCount,
                    Page = page,
                    PageSize = pageSize,
                    TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting payroll records for school {SchoolId}", schoolId);
                throw;
            }
        }

        public async Task<PayrollRecordFullDto?> GetPayrollRecordByIdAsync(Guid schoolId, Guid id)
        {
            try
            {
                var record = await _context.PayrollRecords
                    .AsNoTracking()
                    .Include(p => p.Staff)
                    .FirstOrDefaultAsync(p => p.SchoolId == schoolId && p.Id == id);

                if (record == null) return null;

                var allowances = new AllowanceBreakdownDto();
                var deductions = new DeductionBreakdownDto();

                if (!string.IsNullOrEmpty(record.Notes))
                {
                    try
                    {
                        var breakdown = JsonSerializer.Deserialize<SalaryBreakdown>(record.Notes);
                        if (breakdown != null)
                        {
                            allowances = breakdown.Allowances ?? new AllowanceBreakdownDto();
                            deductions = breakdown.Deductions ?? new DeductionBreakdownDto();
                        }
                    }
                    catch
                    {
                        _logger.LogWarning("Failed to parse salary breakdown for payroll {Id}", id);
                    }
                }

                return new PayrollRecordFullDto
                {
                    Id = record.Id,
                    SchoolId = record.SchoolId,
                    StaffId = record.StaffId,
                    StaffName = record.Staff != null ? $"{record.Staff.FirstName} {record.Staff.LastName}" : "",
                    EmployeeId = record.Staff?.EmployeeId ?? "",
                    Designation = record.Staff?.Designation ?? "",
                    Department = record.Staff?.Department ?? "",
                    Month = GetMonthName(record.Month),
                    Year = record.Year,
                    BasicSalary = record.BasicSalary,
                    Allowances = allowances,
                    Deductions = deductions,
                    GrossSalary = record.BasicSalary + record.Allowances,
                    TotalDeductions = record.Deductions,
                    NetSalary = record.NetSalary,
                    PaymentDate = record.PaymentDate,
                    PaymentMethod = record.PaymentMethod,
                    Status = record.Status,
                    CreatedAt = record.CreatedAt,
                    UpdatedAt = record.UpdatedAt
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting payroll record {Id} for school {SchoolId}", id, schoolId);
                throw;
            }
        }

        public async Task<PayrollRecordFullDto> CreatePayrollRecordAsync(
            Guid schoolId, CreatePayrollRecordDto dto, Guid userId)
        {
            try
            {
                // ===== VALIDATION 1: Staff Verification & Eligibility =====
                var staff = await _context.StaffMembers
                    .FirstOrDefaultAsync(s => s.SchoolId == schoolId && s.Id == dto.StaffId);

                if (staff == null)
                    throw new KeyNotFoundException("Staff member not found");

                if (!staff.IsActive)
                    throw new InvalidOperationException("Staff member is not active. Cannot create payroll for separated/inactive staff.");

                var staffStatus = staff.Status ?? "active";
                if (staffStatus.ToLower() == "leave" || staffStatus.ToLower() == "resigned")
                    throw new InvalidOperationException($"Cannot create payroll for staff with status: {staffStatus}");

                // Check for pending approval status
                if (staffStatus.ToLower() == "pending_approval")
                    throw new InvalidOperationException("Staff member has pending approval. Complete approval workflow before processing payroll.");

                var monthNum = GetMonthNumber(dto.Month);
                if (monthNum <= 0)
                    throw new ArgumentException("Invalid month");

                // ===== VALIDATION 1B: Salary Amount Validation =====
                if (dto.BasicSalary <= 0)
                    throw new ArgumentException("Basic salary must be greater than zero");

                if (dto.BasicSalary > 10000000)  // Cap at 1 crore
                    throw new ArgumentException("Basic salary exceeds maximum allowed amount (10,000,000)");

                // ===== VALIDATION 1C: Year Range Validation =====
                if (dto.Year < 1900 || dto.Year > 2999)
                    throw new ArgumentException("Year must be between 1900 and 2999");

                int currentYear = DateTime.UtcNow.Year;
                if (dto.Year < currentYear - 2 || dto.Year > currentYear + 2)
                    throw new ArgumentException($"Year must be within 2 years of current year ({currentYear})");

                // ===== VALIDATION 2: Duplicate Prevention =====
                var exists = await _context.PayrollRecords
                    .AnyAsync(p => p.SchoolId == schoolId &&
                                  p.StaffId == dto.StaffId &&
                                  p.Month == monthNum &&
                                  p.Year == dto.Year);

                if (exists)
                    throw new InvalidOperationException(
                        $"Payroll record already exists for this staff member for {dto.Month} {dto.Year}");

                // ===== VALIDATION 3: Complete Salary Structure Verification =====
                var salaryStructure = await _context.SalaryStructures
                    .FirstOrDefaultAsync(ss => ss.SchoolId == schoolId && ss.Designation == staff.Designation);

                if (salaryStructure == null)
                    throw new InvalidOperationException($"No salary structure defined for designation: {staff.Designation}");

                if (!salaryStructure.IsActive)
                    throw new InvalidOperationException($"Salary structure for {staff.Designation} is inactive");

                // ===== VALIDATION 4: Attendance-Based Salary Deduction =====
                // TODO: Implement attendance deduction after confirming StaffAttendance entity structure
                var attendanceDeductionAmount = 0m;
                var medicalLeaveDays = 0;

                // ===== VALIDATION 5: Salary Structure Compliance =====
                if (Math.Abs(dto.BasicSalary - staff.BasicSalary.GetValueOrDefault()) > 0.01m)
                {
                    // BasicSalary differs from approved salary - log warning but allow
                    _logger.LogWarning("BasicSalary override for staff {StaffId}. Expected: {Expected}, Provided: {Provided}",
                        dto.StaffId, staff.BasicSalary, dto.BasicSalary);
                }

                // Calculate salary components
                var calculation = await CalculateSalaryInternalAsync(
                    schoolId, dto.StaffId, monthNum, dto.Year, dto.BasicSalary);

                // Validate allowance limits
                if (calculation.Allowances.HRA > (dto.BasicSalary * 0.5m))
                {
                    _logger.LogWarning("HRA exceeds 50% limit for staff {StaffId}", dto.StaffId);
                    throw new InvalidOperationException("HRA cannot exceed 50% of basic salary");
                }

                // Validate deduction limits
                if (calculation.Deductions.PF > (dto.BasicSalary * 0.12m))
                {
                    throw new InvalidOperationException("PF cannot exceed 12% of basic salary");
                }

                // Apply manual allowances/deductions if provided
                if (dto.Allowances != null)
                {
                    calculation.Allowances.HRA = dto.Allowances.HRA > 0 ? dto.Allowances.HRA : calculation.Allowances.HRA;
                    calculation.Allowances.DA = dto.Allowances.DA > 0 ? dto.Allowances.DA : calculation.Allowances.DA;
                    calculation.Allowances.TA = dto.Allowances.TA > 0 ? dto.Allowances.TA : calculation.Allowances.TA;
                    calculation.Allowances.MA = dto.Allowances.MA > 0 ? dto.Allowances.MA : calculation.Allowances.MA;
                    calculation.Allowances.SpecialAllowance = dto.Allowances.SpecialAllowance;
                    calculation.Allowances.OvertimePay = dto.Allowances.OvertimePay;
                    calculation.Allowances.Bonus = dto.Allowances.Bonus;
                    calculation.Allowances.Other = dto.Allowances.Other;
                }

                if (dto.Deductions != null)
                {
                    calculation.Deductions.PF = dto.Deductions.PF > 0 ? dto.Deductions.PF : calculation.Deductions.PF;
                    calculation.Deductions.ESI = dto.Deductions.ESI > 0 ? dto.Deductions.ESI : calculation.Deductions.ESI;
                    calculation.Deductions.ProfessionalTax = dto.Deductions.ProfessionalTax > 0 ? dto.Deductions.ProfessionalTax : calculation.Deductions.ProfessionalTax;
                    calculation.Deductions.IncomeTax = dto.Deductions.IncomeTax;
                    calculation.Deductions.TDS = dto.Deductions.TDS;
                    calculation.Deductions.LoanRecovery = dto.Deductions.LoanRecovery;
                    calculation.Deductions.Advance = dto.Deductions.Advance;
                    calculation.Deductions.LeaveDeduction = dto.Deductions.LeaveDeduction;
                    calculation.Deductions.Other = dto.Deductions.Other;
                }

                // ===== VALIDATION 6: Bonus & Incentive Rules =====
                if (calculation.Allowances.Bonus > 0)
                {
                    // TODO: Verify attended >= 90% of month (pending attendance entity structure)
                    // For now, just cap bonus at 2x basic salary

                    // Cap bonus at 2x basic salary
                    if (calculation.Allowances.Bonus > (dto.BasicSalary * 2))
                    {
                        _logger.LogWarning("Bonus capped for staff {StaffId}: {Amount} -> {Capped}",
                            dto.StaffId, calculation.Allowances.Bonus, dto.BasicSalary * 2);
                        calculation.Allowances.Bonus = dto.BasicSalary * 2;
                    }

                    _logger.LogInformation("Bonus approved for staff {StaffId}: {Amount:C}", dto.StaffId, calculation.Allowances.Bonus);
                }

                // ===== VALIDATION 7: Loan Deduction Validation =====
                // TODO: Implement loan validation after confirming StaffLoans entity structure
                if (calculation.Deductions.LoanRecovery > 0)
                {
                    _logger.LogInformation("Loan recovery processed for staff {StaffId}: {Amount:C}", dto.StaffId, calculation.Deductions.LoanRecovery);
                }

                // ===== VALIDATION 8: Net Salary Validation & Final Checks =====
                var grossSalary = dto.BasicSalary + calculation.Allowances.Total - attendanceDeductionAmount;
                var totalDeductions = calculation.Deductions.Total;
                var netSalary = grossSalary - totalDeductions;

                // Verify NetSalary >= 0
                if (netSalary < 0)
                {
                    _logger.LogError("Invalid net salary calculated for staff {StaffId}: {NetSalary:C}", dto.StaffId, netSalary);
                    throw new InvalidOperationException("Net salary cannot be negative. Review deductions.");
                }

                // Flag for review if NetSalary < 50% of BasicSalary
                string reviewFlag = "";
                if (netSalary < (dto.BasicSalary * 0.5m))
                {
                    reviewFlag = "MANAGER_REVIEW_REQUIRED";
                    _logger.LogWarning("Net salary ({Net:C}) is less than 50% of basic salary ({Basic:C}) for staff {StaffId}. Flagged for review.",
                        netSalary, dto.BasicSalary, dto.StaffId);
                }

                // Recalculate all totals to prevent manual errors
                var recalculatedGross = dto.BasicSalary + calculation.Allowances.Total;
                var recalculatedTotal = calculation.Allowances.Total + calculation.Deductions.Total;

                if (Math.Abs(recalculatedGross - (grossSalary + attendanceDeductionAmount)) > 0.01m)
                {
                    _logger.LogWarning("Gross salary recalculation mismatch for staff {StaffId}", dto.StaffId);
                }

                var breakdown = new SalaryBreakdown
                {
                    Allowances = calculation.Allowances,
                    Deductions = calculation.Deductions
                };

                // ===== VALIDATION 9: Approval Workflow =====
                var record = new PayrollRecord
                {
                    Id = Guid.NewGuid(),
                    SchoolId = schoolId,
                    StaffId = dto.StaffId,
                    Month = monthNum,
                    Year = dto.Year,
                    BasicSalary = dto.BasicSalary,
                    Allowances = calculation.Allowances.Total,
                    Deductions = totalDeductions,
                    Bonus = calculation.Allowances.Bonus,
                    NetSalary = netSalary,
                    Status = "pending_approval",  // Set to pending_approval, not draft
                    Notes = JsonSerializer.Serialize(breakdown),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.PayrollRecords.Add(record);
                await _context.SaveChangesAsync();

                _logger.LogInformation(
                    "Created payroll record {Id} for staff {StaffId} - {Month} {Year} - Status: pending_approval",
                    record.Id, dto.StaffId, dto.Month, dto.Year);

                return await GetPayrollRecordByIdAsync(schoolId, record.Id)
                    ?? throw new Exception("Failed to retrieve created payroll record");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating payroll record for school {SchoolId}", schoolId);
                throw;
            }
        }

        public async Task<PayrollRecordFullDto> UpdatePayrollRecordAsync(
            Guid schoolId, Guid id, UpdatePayrollRecordDto dto)
        {
            try
            {
                var record = await _context.PayrollRecords
                    .FirstOrDefaultAsync(p => p.SchoolId == schoolId && p.Id == id);

                if (record == null)
                    throw new KeyNotFoundException("Payroll record not found");

                if (record.Status == "approved" || record.Status == "paid")
                    throw new InvalidOperationException("Cannot update approved or paid payroll records");

                var breakdown = new SalaryBreakdown();
                if (!string.IsNullOrEmpty(record.Notes))
                {
                    try
                    {
                        breakdown = JsonSerializer.Deserialize<SalaryBreakdown>(record.Notes)
                            ?? new SalaryBreakdown();
                    }
                    catch (Exception ex) { _logger.LogWarning(ex, "Failed to deserialize salary breakdown for payroll {Id} — using defaults", record.Id); }
                }

                if (breakdown.Allowances == null) breakdown.Allowances = new AllowanceBreakdownDto();
                if (breakdown.Deductions == null) breakdown.Deductions = new DeductionBreakdownDto();

                // Update allowances
                if (dto.Allowances != null)
                {
                    if (dto.Allowances.HRA.HasValue) breakdown.Allowances.HRA = dto.Allowances.HRA.Value;
                    if (dto.Allowances.DA.HasValue) breakdown.Allowances.DA = dto.Allowances.DA.Value;
                    if (dto.Allowances.TA.HasValue) breakdown.Allowances.TA = dto.Allowances.TA.Value;
                    if (dto.Allowances.MA.HasValue) breakdown.Allowances.MA = dto.Allowances.MA.Value;
                    if (dto.Allowances.SpecialAllowance.HasValue) breakdown.Allowances.SpecialAllowance = dto.Allowances.SpecialAllowance.Value;
                    if (dto.Allowances.OvertimePay.HasValue) breakdown.Allowances.OvertimePay = dto.Allowances.OvertimePay.Value;
                    if (dto.Allowances.Bonus.HasValue) breakdown.Allowances.Bonus = dto.Allowances.Bonus.Value;
                    if (dto.Allowances.Other.HasValue) breakdown.Allowances.Other = dto.Allowances.Other.Value;
                }

                // Update deductions
                if (dto.Deductions != null)
                {
                    if (dto.Deductions.PF.HasValue) breakdown.Deductions.PF = dto.Deductions.PF.Value;
                    if (dto.Deductions.ESI.HasValue) breakdown.Deductions.ESI = dto.Deductions.ESI.Value;
                    if (dto.Deductions.ProfessionalTax.HasValue) breakdown.Deductions.ProfessionalTax = dto.Deductions.ProfessionalTax.Value;
                    if (dto.Deductions.IncomeTax.HasValue) breakdown.Deductions.IncomeTax = dto.Deductions.IncomeTax.Value;
                    if (dto.Deductions.TDS.HasValue) breakdown.Deductions.TDS = dto.Deductions.TDS.Value;
                    if (dto.Deductions.LoanRecovery.HasValue) breakdown.Deductions.LoanRecovery = dto.Deductions.LoanRecovery.Value;
                    if (dto.Deductions.Advance.HasValue) breakdown.Deductions.Advance = dto.Deductions.Advance.Value;
                    if (dto.Deductions.LeaveDeduction.HasValue) breakdown.Deductions.LeaveDeduction = dto.Deductions.LeaveDeduction.Value;
                    if (dto.Deductions.Other.HasValue) breakdown.Deductions.Other = dto.Deductions.Other.Value;
                }

                // Recalculate totals
                record.Allowances = breakdown.Allowances.Total;
                record.Deductions = breakdown.Deductions.Total;
                record.Bonus = breakdown.Allowances.Bonus;
                record.NetSalary = record.BasicSalary + record.Allowances - record.Deductions;
                record.Notes = JsonSerializer.Serialize(breakdown);

                // Update other fields
                if (!string.IsNullOrEmpty(dto.Status))
                    record.Status = dto.Status;
                if (dto.PaymentDate.HasValue)
                    record.PaymentDate = dto.PaymentDate.Value;
                if (!string.IsNullOrEmpty(dto.PaymentMethod))
                    record.PaymentMethod = dto.PaymentMethod;

                record.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                // Sync to wallet if status is being set to 'paid'
                if (dto.Status?.ToLower() == "paid")
                {
                    var capturedSchoolId = record.SchoolId;
                    var capturedMonth = record.Month;
                    var capturedYear = record.Year;
                    var capturedRecordId = record.Id;
                    _ = Task.Run(async () =>
                    {
                        using var scope = _scopeFactory.CreateScope();
                        var financeService = scope.ServiceProvider.GetRequiredService<IFinanceService>();
                        try { await financeService.SyncPayrollExpensesAsync(capturedSchoolId, capturedMonth, capturedYear); }
                        catch (Exception ex) { _logger.LogError(ex, "Failed to sync payroll record {Id} to wallet", capturedRecordId); }
                    });
                }

                _logger.LogInformation("Updated payroll record {Id}", id);

                return await GetPayrollRecordByIdAsync(schoolId, id)
                    ?? throw new Exception("Failed to retrieve updated payroll record");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating payroll record {Id} for school {SchoolId}", id, schoolId);
                throw;
            }
        }

        public async Task<bool> DeletePayrollRecordAsync(Guid schoolId, Guid id)
        {
            try
            {
                var record = await _context.PayrollRecords
                    .FirstOrDefaultAsync(p => p.SchoolId == schoolId && p.Id == id);

                if (record == null) return false;

                if (record.Status == "approved" || record.Status == "paid")
                    throw new InvalidOperationException("Cannot delete approved or paid payroll records");

                _context.PayrollRecords.Remove(record);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Deleted payroll record {Id}", id);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting payroll record {Id} for school {SchoolId}", id, schoolId);
                throw;
            }
        }

        public async Task<List<PayrollRecordBasicDto>> ProcessPayrollAsync(
            Guid schoolId, int month, int year, List<Guid> staffIds, Guid userId)
        {
            try
            {
                var query = _context.StaffMembers.Where(s => s.SchoolId == schoolId && s.IsActive);

                if (staffIds != null && staffIds.Any())
                    query = query.Where(s => staffIds.Contains(s.Id));

                var staffList = await query.ToListAsync();
                var createdRecords = new List<PayrollRecordBasicDto>();

                foreach (var staff in staffList)
                {
                    try
                    {
                        // Check if already exists
                        var exists = await _context.PayrollRecords
                            .AnyAsync(p => p.SchoolId == schoolId &&
                                          p.StaffId == staff.Id &&
                                          p.Month == month &&
                                          p.Year == year);

                        if (exists)
                        {
                            _logger.LogWarning(
                                "Payroll already exists for staff {StaffId} for {Month}/{Year}",
                                staff.Id, month, year);
                            continue;
                        }

                        var calculation = await CalculateSalaryInternalAsync(
                            schoolId, staff.Id, month, year, staff.BasicSalary.GetValueOrDefault());

                        var breakdown = new SalaryBreakdown
                        {
                            Allowances = calculation.Allowances,
                            Deductions = calculation.Deductions
                        };

                        var grossSalary = staff.BasicSalary.GetValueOrDefault() + calculation.Allowances.Total;
                        var netSalary = grossSalary - calculation.Deductions.Total;

                        var record = new PayrollRecord
                        {
                            Id = Guid.NewGuid(),
                            SchoolId = schoolId,
                            StaffId = staff.Id,
                            Month = month,
                            Year = year,
                            BasicSalary = staff.BasicSalary.GetValueOrDefault(),
                            Allowances = calculation.Allowances.Total,
                            Deductions = calculation.Deductions.Total,
                            Bonus = calculation.Allowances.Bonus,
                            NetSalary = netSalary,
                            Status = "pending_approval",
                            Notes = JsonSerializer.Serialize(breakdown),
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };

                        _context.PayrollRecords.Add(record);
                        await _context.SaveChangesAsync();

                        createdRecords.Add(new PayrollRecordBasicDto
                        {
                            Id = record.Id,
                            StaffId = staff.Id,
                            StaffName = $"{staff.FirstName} {staff.LastName}",
                            EmployeeId = staff.EmployeeId,
                            Designation = staff.Designation,
                            Department = staff.Department,
                            Month = GetMonthName(month),
                            Year = year,
                            GrossSalary = grossSalary,
                            TotalDeductions = calculation.Deductions.Total,
                            NetSalary = netSalary,
                            Status = record.Status
                        });
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error processing payroll for staff {StaffId}", staff.Id);
                    }
                }

                _logger.LogInformation(
                    "Processed payroll for {Count} staff members for {Month}/{Year}",
                    createdRecords.Count, month, year);

                return createdRecords;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing payroll for school {SchoolId}", schoolId);
                throw;
            }
        }

        public async Task<bool> ApprovePayrollAsync(Guid schoolId, Guid id, Guid userId)
        {
            try
            {
                var record = await _context.PayrollRecords
                    .FirstOrDefaultAsync(p => p.SchoolId == schoolId && p.Id == id);

                if (record == null)
                    throw new KeyNotFoundException("Payroll record not found");

                if (record.Status == "approved")
                    throw new InvalidOperationException("Payroll record is already approved");

                if (record.Status == "paid")
                    throw new InvalidOperationException("Payroll record is already paid");

                record.Status = "approved";
                record.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                _logger.LogInformation(
                    "Approved payroll record {Id} by user {UserId}",
                    id, userId);

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error approving payroll record {Id} for school {SchoolId}", id, schoolId);
                throw;
            }
        }

        public async Task<PayrollRecordFullDto> GeneratePayslipAsync(Guid schoolId, Guid id)
        {
            try
            {
                var payslip = await GetPayrollRecordByIdAsync(schoolId, id);
                
                if (payslip == null)
                    throw new KeyNotFoundException("Payroll record not found");

                if (payslip.Status == "draft")
                    throw new InvalidOperationException("Cannot generate payslip for draft payroll");

                _logger.LogInformation("Generated payslip for payroll record {Id}", id);

                return payslip;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating payslip for record {Id}", id);
                throw;
            }
        }

        public async Task<SalaryCalculationDto> CalculateSalaryAsync(
            Guid schoolId, Guid staffId, int month, int year)
        {
            try
            {
                var staff = await _context.StaffMembers
                    .AsNoTracking()
                    .FirstOrDefaultAsync(s => s.SchoolId == schoolId && s.Id == staffId);

                if (staff == null)
                    throw new KeyNotFoundException("Staff member not found");

                return await CalculateSalaryInternalAsync(schoolId, staffId, month, year, staff.BasicSalary.GetValueOrDefault());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating salary for staff {StaffId}", staffId);
                throw;
            }
        }

        private async Task<SalaryCalculationDto> CalculateSalaryInternalAsync(
            Guid schoolId, Guid staffId, int month, int year, decimal basicSalary)
        {
            // Calculate allowances
            var hra = basicSalary * 0.40m;  // HRA = 40% of Basic
            var da = basicSalary * 0.20m;   // DA = 20% of Basic
            var ta = 1000m;                  // TA = Fixed 1000
            var ma = 500m;                   // MA = Fixed 500

            var allowances = new AllowanceBreakdownDto
            {
                HRA = hra,
                DA = da,
                TA = ta,
                MA = ma
            };

            var grossSalary = basicSalary + allowances.Total;

            // Calculate deductions
            var pf = basicSalary * 0.12m;   // PF = 12% of Basic
            var esi = grossSalary < 21000 ? grossSalary * 0.0075m : 0m; // ESI = 0.75% if Gross < 21000
            var pt = 200m;                   // Professional Tax = Fixed 200

            var deductions = new DeductionBreakdownDto
            {
                PF = pf,
                ESI = esi,
                ProfessionalTax = pt
            };

            var netSalary = grossSalary - deductions.Total;

            return new SalaryCalculationDto
            {
                BasicSalary = basicSalary,
                Allowances = allowances,
                Deductions = deductions,
                GrossSalary = grossSalary,
                NetSalary = netSalary
            };
        }

        public async Task<PayrollStatsDto> GetPayrollStatsAsync(Guid schoolId, int? month, int? year)
        {
            try
            {
                var query = _context.PayrollRecords
                    .AsNoTracking()
                    .Where(p => p.SchoolId == schoolId);

                if (month.HasValue)
                    query = query.Where(p => p.Month == month.Value);

                if (year.HasValue)
                    query = query.Where(p => p.Year == year.Value);

                var records = await query.Include(p => p.Staff).ToListAsync();

                var totalRecords = records.Count;
                var paidRecords = records.Count(p => p.Status == "paid");
                var pendingRecords = records.Count(p => p.Status == "pending_approval" || p.Status == "draft");
                var totalPayroll = records.Sum(p => p.NetSalary);
                var avgSalary = totalRecords > 0 ? totalPayroll / totalRecords : 0;
                var totalDeductions = records.Sum(p => p.Deductions);

                var breakdown = records
                    .Select(p => new
                    {
                        Record = p,
                        Breakdown = ParseSalaryBreakdown(p.Notes)
                    })
                    .ToList();

                var totalPF = breakdown.Sum(b => b.Breakdown.Deductions.PF);
                var totalESI = breakdown.Sum(b => b.Breakdown.Deductions.ESI);
                var totalTax = breakdown.Sum(b => 
                    b.Breakdown.Deductions.ProfessionalTax + 
                    b.Breakdown.Deductions.IncomeTax + 
                    b.Breakdown.Deductions.TDS);

                var byDepartment = records
                    .Where(p => p.Staff != null)
                    .GroupBy(p => p.Staff!.Department)
                    .ToDictionary(
                        g => g.Key,
                        g => new DepartmentPayrollDto
                        {
                            StaffCount = g.Count(),
                            TotalPayroll = g.Sum(p => p.NetSalary),
                            AvgSalary = g.Average(p => p.NetSalary)
                        });

                return new PayrollStatsDto
                {
                    TotalRecords = totalRecords,
                    PaidRecords = paidRecords,
                    PendingRecords = pendingRecords,
                    TotalPayroll = totalPayroll,
                    AvgSalary = avgSalary,
                    TotalDeductions = totalDeductions,
                    TotalPF = totalPF,
                    TotalESI = totalESI,
                    TotalTax = totalTax,
                    ByDepartment = byDepartment
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting payroll stats for school {SchoolId}", schoolId);
                throw;
            }
        }

        public async Task<SalaryStructureDto?> GetSalaryStructureAsync(Guid schoolId, string designation)
        {
            try
            {
                var structure = await _context.SalaryStructures
                    .AsNoTracking()
                    .FirstOrDefaultAsync(s => s.SchoolId == schoolId && 
                                             s.Designation == designation && 
                                             s.IsActive);

                if (structure == null) return null;

                var allowanceConfig = new AllowanceConfigDto();
                var deductionConfig = new DeductionConfigDto();

                if (!string.IsNullOrEmpty(structure.AllowanceConfig))
                {
                    try
                    {
                        allowanceConfig = JsonSerializer.Deserialize<AllowanceConfigDto>(structure.AllowanceConfig)
                            ?? new AllowanceConfigDto();
                    }
                    catch (Exception ex) { _logger.LogWarning(ex, "Failed to deserialize AllowanceConfig for structure {Id} — using defaults", structure.Id); }
                }

                if (!string.IsNullOrEmpty(structure.DeductionConfig))
                {
                    try
                    {
                        deductionConfig = JsonSerializer.Deserialize<DeductionConfigDto>(structure.DeductionConfig)
                            ?? new DeductionConfigDto();
                    }
                    catch (Exception ex) { _logger.LogWarning(ex, "Failed to deserialize DeductionConfig for structure {Id} — using defaults", structure.Id); }
                }

                return new SalaryStructureDto
                {
                    Id = structure.Id,
                    SchoolId = structure.SchoolId,
                    Name = structure.Name,
                    Designation = structure.Designation,
                    BasicSalary = structure.BasicSalary,
                    AllowanceConfig = allowanceConfig,
                    DeductionConfig = deductionConfig,
                    IsActive = structure.IsActive,
                    CreatedAt = structure.CreatedAt
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting salary structure for designation {Designation}", designation);
                throw;
            }
        }

        public async Task<SalaryStructureDto> CreateSalaryStructureAsync(
            Guid schoolId, CreateSalaryStructureDto dto)
        {
            try
            {
                var structure = new SalaryStructure
                {
                    Id = Guid.NewGuid(),
                    SchoolId = schoolId,
                    Name = dto.Name,
                    Designation = dto.Designation,
                    BasicSalary = dto.BasicSalary,
                    AllowanceConfig = JsonSerializer.Serialize(dto.AllowanceConfig),
                    DeductionConfig = JsonSerializer.Serialize(dto.DeductionConfig),
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.SalaryStructures.Add(structure);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Created salary structure {Id} for {Designation}", structure.Id, dto.Designation);

                return new SalaryStructureDto
                {
                    Id = structure.Id,
                    SchoolId = structure.SchoolId,
                    Name = structure.Name,
                    Designation = structure.Designation,
                    BasicSalary = structure.BasicSalary,
                    AllowanceConfig = dto.AllowanceConfig,
                    DeductionConfig = dto.DeductionConfig,
                    IsActive = structure.IsActive,
                    CreatedAt = structure.CreatedAt
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating salary structure for school {SchoolId}", schoolId);
                throw;
            }
        }
        // ========== ALIAS METHODS FOR CONTROLLER COMPATIBILITY ==========

        public Task<PayrollRecordFullDto?> GetPayrollByIdAsync(Guid schoolId, Guid id)
        {
            return GetPayrollRecordByIdAsync(schoolId, id);
        }

        public Task<PayrollRecordFullDto> CreatePayrollAsync(Guid schoolId, CreatePayrollRecordDto dto, Guid userId)
        {
            return CreatePayrollRecordAsync(schoolId, dto, userId);
        }

        public Task<PayrollRecordFullDto> UpdatePayrollAsync(Guid schoolId, Guid id, UpdatePayrollRecordDto dto)
        {
            return UpdatePayrollRecordAsync(schoolId, id, dto);
        }

        public Task<bool> DeletePayrollAsync(Guid schoolId, Guid id)
        {
            return DeletePayrollRecordAsync(schoolId, id);
        }

        public Task<List<PayrollRecordBasicDto>> ProcessPayrollsAsync(Guid schoolId, int month, int year, List<Guid> staffIds, Guid userId)
        {
            return ProcessPayrollAsync(schoolId, month, year, staffIds, userId);
        }

        public Task<PayrollRecordFullDto> GetPayslipAsync(Guid schoolId, Guid payrollId)
        {
            return GeneratePayslipAsync(schoolId, payrollId);
        }
        // ========== HELPER METHODS ==========

        private string GetMonthName(int month)
        {
            var months = new[] { "", "January", "February", "March", "April", "May", "June",
                               "July", "August", "September", "October", "November", "December" };
            return month >= 1 && month <= 12 ? months[month] : "";
        }

        private int GetMonthNumber(string month)
        {
            var months = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
            {
                { "January", 1 }, { "Jan", 1 },
                { "February", 2 }, { "Feb", 2 },
                { "March", 3 }, { "Mar", 3 },
                { "April", 4 }, { "Apr", 4 },
                { "May", 5 },
                { "June", 6 }, { "Jun", 6 },
                { "July", 7 }, { "Jul", 7 },
                { "August", 8 }, { "Aug", 8 },
                { "September", 9 }, { "Sep", 9 }, { "Sept", 9 },
                { "October", 10 }, { "Oct", 10 },
                { "November", 11 }, { "Nov", 11 },
                { "December", 12 }, { "Dec", 12 }
            };

            return months.TryGetValue(month, out var num) ? num : 0;
        }

        private SalaryBreakdown ParseSalaryBreakdown(string? notes)
        {
            if (string.IsNullOrEmpty(notes))
                return new SalaryBreakdown();

            try
            {
                return JsonSerializer.Deserialize<SalaryBreakdown>(notes) ?? new SalaryBreakdown();
            }
            catch
            {
                return new SalaryBreakdown();
            }
        }
    }

    // ========== INTERNAL MODELS ==========

    internal class SalaryBreakdown
    {
        public AllowanceBreakdownDto Allowances { get; set; } = new();
        public DeductionBreakdownDto Deductions { get; set; } = new();
    }

    public class SalaryCalculationDto
    {
        public decimal BasicSalary { get; set; }
        public AllowanceBreakdownDto Allowances { get; set; } = new();
        public DeductionBreakdownDto Deductions { get; set; } = new();
        public decimal GrossSalary { get; set; }
        public decimal NetSalary { get; set; }
    }

    // ========== ADDITIONAL DTOs ==========

    public class PayrollRecordBasicDto
    {
        public Guid Id { get; set; }
        public Guid StaffId { get; set; }
        public string StaffName { get; set; } = string.Empty;
        public string EmployeeId { get; set; } = string.Empty;
        public string Designation { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public string Month { get; set; } = string.Empty;
        public int Year { get; set; }
        public decimal GrossSalary { get; set; }
        public decimal TotalDeductions { get; set; }
        public decimal NetSalary { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime? PaymentDate { get; set; }
    }

    public class PayrollRecordFullDto
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
        public decimal BasicSalary { get; set; }
        public AllowanceBreakdownDto Allowances { get; set; } = new();
        public DeductionBreakdownDto Deductions { get; set; } = new();
        public decimal GrossSalary { get; set; }
        public decimal TotalDeductions { get; set; }
        public decimal NetSalary { get; set; }
        public DateTime? PaymentDate { get; set; }
        public string? PaymentMethod { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class CreatePayrollRecordDto
    {
        public Guid StaffId { get; set; }
        public string Month { get; set; } = string.Empty;
        public int Year { get; set; }
        public decimal BasicSalary { get; set; }
        public CreateAllowanceDto? Allowances { get; set; }
        public CreateDeductionDto? Deductions { get; set; }
        public string? Remarks { get; set; }
    }

    public class UpdatePayrollRecordDto
    {
        public UpdateAllowanceDto? Allowances { get; set; }
        public UpdateDeductionDto? Deductions { get; set; }
        public string? Status { get; set; }
        public DateTime? PaymentDate { get; set; }
        public string? PaymentMethod { get; set; }
        public string? Remarks { get; set; }
    }

}



