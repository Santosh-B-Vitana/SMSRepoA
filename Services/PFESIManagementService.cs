using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;

namespace SmsApi.Services
{
    public interface IPFESIManagementService
    {
        Task<List<PFESIConfigResponse>> GetConfigsAsync(Guid schoolId, string? type = null);
        Task<PFESIConfigResponse> GetConfigByIdAsync(Guid id, Guid schoolId);
        Task<PFESIConfigResponse> CreateConfigAsync(CreatePFESIConfigRequest request);
        Task<PFESIConfigResponse> UpdateConfigAsync(Guid id, UpdatePFESIConfigRequest request, Guid schoolId);
        Task DeleteConfigAsync(Guid id, Guid schoolId);
        Task<List<PFESIContributionResponse>> CalculateContributionsAsync(CalculateContributionsRequest request);
        Task<PFESIContributionListResponse> GetContributionsAsync(Guid schoolId, int page, int pageSize, string? month = null, string? type = null);
        Task<PFESIContributionResponse> GetContributionByIdAsync(Guid id, Guid schoolId);
        Task<PFESIContributionResponse> MarkAsDepositedAsync(MarkDepositRequest request);
        Task<ComplianceReportResponse> GenerateComplianceReportAsync(GenerateComplianceReportRequest request);
        Task<ComplianceReportListResponse> GetComplianceReportsAsync(Guid schoolId, string? period = null, string? reportType = null);
        Task<ComplianceReportResponse> GetComplianceReportByIdAsync(Guid id, Guid schoolId);
        Task<ComplianceReportResponse> SubmitComplianceReportAsync(Guid id, SubmitComplianceReportRequest request, Guid schoolId);
    }

    public class PFESIManagementService : IPFESIManagementService
    {
        private readonly AppDbContext _context;

        public PFESIManagementService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<PFESIConfigResponse>> GetConfigsAsync(Guid schoolId, string? type = null)
        {
            var query = _context.PFESIConfigurations.Where(c => c.SchoolId == schoolId);

            if (!string.IsNullOrEmpty(type))
                query = query.Where(c => c.Type == type);

            var configs = await query.OrderBy(c => c.Type).ThenBy(c => c.EffectiveFrom).ToListAsync();
            return configs.Select(MapToConfigResponse).ToList();
        }

        public async Task<PFESIConfigResponse> GetConfigByIdAsync(Guid id, Guid schoolId)
        {
            var config = await _context.PFESIConfigurations
                .FirstOrDefaultAsync(c => c.Id == id && c.SchoolId == schoolId);

            if (config == null)
                throw new KeyNotFoundException("PF/ESI configuration not found");

            return MapToConfigResponse(config);
        }

        public async Task<PFESIConfigResponse> CreateConfigAsync(CreatePFESIConfigRequest request)
        {
            // ═══ Comprehensive Input Validation (11 rules) ═══
            if (request.SchoolId == Guid.Empty)
                throw new ArgumentException("SchoolId cannot be empty", nameof(request.SchoolId));

            if (string.IsNullOrWhiteSpace(request.Type))
                throw new ArgumentException("Type is required (PF, ESI, NPS, etc)", nameof(request.Type));

            var validTypes = new[] { "PF", "ESI", "NPS", "Gratuity", "OtherFund" };
            if (!validTypes.Contains(request.Type))
                throw new ArgumentException($"Invalid Type. Must be one of: {string.Join(", ", validTypes)}", nameof(request.Type));

            // Percentage validation (0-100)
            if (request.EmployeeContributionPercentage < 0 || request.EmployeeContributionPercentage > 100)
                throw new ArgumentException("EmployeeContributionPercentage must be between 0 and 100", nameof(request.EmployeeContributionPercentage));

            if (request.EmployerContributionPercentage < 0 || request.EmployerContributionPercentage > 100)
                throw new ArgumentException("EmployerContributionPercentage must be between 0 and 100", nameof(request.EmployerContributionPercentage));

            // Wage limit validation (if provided)
            if (request.WageLimit.HasValue && request.WageLimit.Value <= 0)
                throw new ArgumentException("WageLimit must be greater than 0", nameof(request.WageLimit));

            // Pension contribution limit validation (if provided)
            if (request.PensionContributionLimit.HasValue && request.PensionContributionLimit.Value <= 0)
                throw new ArgumentException("PensionContributionLimit must be greater than 0", nameof(request.PensionContributionLimit));

            // Date validation: EffectiveFrom cannot be future
            if (request.EffectiveFrom.HasValue && request.EffectiveFrom.Value.Date > DateTime.UtcNow.Date)
                throw new ArgumentException("EffectiveFrom cannot be in the future", nameof(request.EffectiveFrom));

            // Date range validation: EffectiveTo > EffectiveFrom
            if (request.EffectiveFrom.HasValue && request.EffectiveTo.HasValue && request.EffectiveTo.Value <= request.EffectiveFrom.Value)
                throw new ArgumentException("EffectiveTo must be after EffectiveFrom", nameof(request.EffectiveTo));

            // Registration number length validation (if provided)
            if (!string.IsNullOrWhiteSpace(request.RegistrationNumber) && request.RegistrationNumber.Length > 50)
                throw new ArgumentException("RegistrationNumber cannot exceed 50 characters", nameof(request.RegistrationNumber));

            // Duplicate prevention: Check if same type+school already exists with overlapping dates
            var existingConfig = await _context.PFESIConfigurations.FirstOrDefaultAsync(c => 
                c.SchoolId == request.SchoolId && 
                c.Type == request.Type);

            if (existingConfig != null)
                throw new InvalidOperationException($"A {request.Type} configuration already exists for this school");

            var config = new PFESIConfiguration
            {
                Id = Guid.NewGuid(),
                SchoolId = request.SchoolId,
                Type = request.Type,
                EmployeeContributionPercentage = request.EmployeeContributionPercentage,
                EmployerContributionPercentage = request.EmployerContributionPercentage,
                WageLimit = request.WageLimit,
                PensionContributionLimit = request.PensionContributionLimit,
                RegistrationNumber = request.RegistrationNumber,
                EffectiveFrom = request.EffectiveFrom ?? DateTime.UtcNow,
                EffectiveTo = request.EffectiveTo,
                CreatedAt = DateTime.UtcNow
            };

            _context.PFESIConfigurations.Add(config);
            await _context.SaveChangesAsync();

            return MapToConfigResponse(config);
        }

        public async Task<PFESIConfigResponse> UpdateConfigAsync(Guid id, UpdatePFESIConfigRequest request, Guid schoolId)
        {
            // ═══ Input Validation ═══
            if (id == Guid.Empty)
                throw new ArgumentException("Configuration ID cannot be empty", nameof(id));

            if (schoolId == Guid.Empty)
                throw new ArgumentException("SchoolId cannot be empty", nameof(schoolId));

            // Percentage validation (0-100)
            if (request.EmployeeContributionPercentage < 0 || request.EmployeeContributionPercentage > 100)
                throw new ArgumentException("EmployeeContributionPercentage must be between 0 and 100", nameof(request.EmployeeContributionPercentage));

            if (request.EmployerContributionPercentage < 0 || request.EmployerContributionPercentage > 100)
                throw new ArgumentException("EmployerContributionPercentage must be between 0 and 100", nameof(request.EmployerContributionPercentage));

            // Wage limit validation
            if (request.WageLimit.HasValue && request.WageLimit.Value <= 0)
                throw new ArgumentException("WageLimit must be greater than 0", nameof(request.WageLimit));

            // Pension contribution limit validation
            if (request.PensionContributionLimit.HasValue && request.PensionContributionLimit.Value <= 0)
                throw new ArgumentException("PensionContributionLimit must be greater than 0", nameof(request.PensionContributionLimit));

            // Date validation: EffectiveTo > EffectiveFrom
            if (request.EffectiveFrom.HasValue && request.EffectiveTo.HasValue && request.EffectiveTo.Value <= request.EffectiveFrom.Value)
                throw new ArgumentException("EffectiveTo must be after EffectiveFrom", nameof(request.EffectiveTo));

            // Registration number length validation
            if (!string.IsNullOrWhiteSpace(request.RegistrationNumber) && request.RegistrationNumber.Length > 50)
                throw new ArgumentException("RegistrationNumber cannot exceed 50 characters", nameof(request.RegistrationNumber));

            var config = await _context.PFESIConfigurations
                .FirstOrDefaultAsync(c => c.Id == id && c.SchoolId == schoolId);

            if (config == null)
                throw new KeyNotFoundException("PF/ESI configuration not found");

            config.EmployeeContributionPercentage = request.EmployeeContributionPercentage;
            config.EmployerContributionPercentage = request.EmployerContributionPercentage;
            config.WageLimit = request.WageLimit;
            config.PensionContributionLimit = request.PensionContributionLimit;
            config.RegistrationNumber = request.RegistrationNumber;
            if (request.EffectiveFrom.HasValue)
                config.EffectiveFrom = request.EffectiveFrom.Value;
            if (request.EffectiveTo.HasValue)
                config.EffectiveTo = request.EffectiveTo.Value;
            config.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return MapToConfigResponse(config);
        }

        public async Task DeleteConfigAsync(Guid id, Guid schoolId)
        {
            var config = await _context.PFESIConfigurations
                .FirstOrDefaultAsync(c => c.Id == id && c.SchoolId == schoolId);

            if (config == null)
                throw new KeyNotFoundException("PF/ESI configuration not found");

            _context.PFESIConfigurations.Remove(config);
            await _context.SaveChangesAsync();
        }

        public async Task<List<PFESIContributionResponse>> CalculateContributionsAsync(CalculateContributionsRequest request)
        {
            // ═══ Comprehensive Input Validation (8 rules) ═══
            if (request.SchoolId == Guid.Empty)
                throw new ArgumentException("SchoolId cannot be empty", nameof(request.SchoolId));

            if (string.IsNullOrWhiteSpace(request.Type))
                throw new ArgumentException("Type is required", nameof(request.Type));

            if (string.IsNullOrWhiteSpace(request.Month))
                throw new ArgumentException("Month is required (YYYY-MM format)", nameof(request.Month));

            // Month format validation (YYYY-MM)
            if (!System.Text.RegularExpressions.Regex.IsMatch(request.Month, @"^\d{4}-\d{2}$"))
                throw new ArgumentException("Month must be in YYYY-MM format", nameof(request.Month));

            // Salary validation (must be positive)
            if (request.BasicSalary <= 0)
                throw new ArgumentException("BasicSalary must be greater than 0", nameof(request.BasicSalary));

            if (request.GrossSalary <= 0)
                throw new ArgumentException("GrossSalary must be greater than 0", nameof(request.GrossSalary));

            // GrossSalary >= BasicSalary
            if (request.GrossSalary < request.BasicSalary)
                throw new ArgumentException("GrossSalary cannot be less than BasicSalary", nameof(request.GrossSalary));

            // StaffIds validation (at least one staff member)
            if (request.StaffIds == null || request.StaffIds.Count == 0)
                throw new ArgumentException("At least one StaffId is required", nameof(request.StaffIds));

            // Duplicate staff IDs check
            if (request.StaffIds.Distinct().Count() != request.StaffIds.Count)
                throw new ArgumentException("StaffIds contains duplicates", nameof(request.StaffIds));

            var config = await _context.PFESIConfigurations
                .FirstOrDefaultAsync(c => c.SchoolId == request.SchoolId && 
                                          c.Type == request.Type &&
                                          c.EffectiveFrom <= DateTime.UtcNow &&
                                          (c.EffectiveTo == null || c.EffectiveTo >= DateTime.UtcNow));

            if (config == null)
                throw new KeyNotFoundException($"Active {request.Type} configuration not found for this school");

            var contributions = new List<PFESIContribution>();

            foreach (var staffId in request.StaffIds)
            {
                if (staffId == Guid.Empty)
                    throw new ArgumentException("Staff ID cannot be empty", nameof(staffId));

                // Check for duplicate contribution in same month
                var existingContribution = await _context.PFESIContributions.FirstOrDefaultAsync(c =>
                    c.SchoolId == request.SchoolId &&
                    c.StaffId == staffId &&
                    c.Type == request.Type &&
                    c.Month == request.Month);

                if (existingContribution != null)
                    throw new InvalidOperationException($"Contribution for staff {staffId} in {request.Month} already exists");

                var employeeContribution = (request.BasicSalary * config.EmployeeContributionPercentage) / 100;
                var employerContribution = (request.BasicSalary * config.EmployerContributionPercentage) / 100;
                var pensionContribution = config.PensionContributionLimit.HasValue 
                    ? Math.Min(employerContribution, config.PensionContributionLimit.Value) 
                    : 0;

                var contribution = new PFESIContribution
                {
                    Id = Guid.NewGuid(),
                    SchoolId = request.SchoolId,
                    StaffId = staffId,
                    Type = request.Type,
                    Month = request.Month,
                    BasicSalary = request.BasicSalary,
                    GrossSalary = request.GrossSalary,
                    EmployeeContribution = employeeContribution,
                    EmployerContribution = employerContribution,
                    PensionContribution = pensionContribution,
                    TotalContribution = employeeContribution + employerContribution,
                    Status = "Calculated",
                    CreatedAt = DateTime.UtcNow
                };

                contributions.Add(contribution);
                _context.PFESIContributions.Add(contribution);
            }

            await _context.SaveChangesAsync();
            return contributions.Select(MapToContributionResponse).ToList();
        }

        public async Task<PFESIContributionListResponse> GetContributionsAsync(Guid schoolId, int page, int pageSize, string? month = null, string? type = null)
        {
            // ═══ Pagination Normalization ═══
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;
            if (pageSize > 100) pageSize = 100;

            var query = _context.PFESIContributions.Where(c => c.SchoolId == schoolId);

            if (!string.IsNullOrEmpty(month))
                query = query.Where(c => c.Month == month);

            if (!string.IsNullOrEmpty(type))
                query = query.Where(c => c.Type == type);

            var total = await query.CountAsync();
            var contributions = await query
                .OrderByDescending(c => c.Month)
                .ThenBy(c => c.StaffId)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var totalPages = (total + pageSize - 1) / pageSize;
            var totalEmployeeContribution = contributions.Sum(c => c.EmployeeContribution);
            var totalEmployerContribution = contributions.Sum(c => c.EmployerContribution);

            return new PFESIContributionListResponse
            {
                Items = contributions.Select(MapToContributionResponse).ToList(),
                Contributions = contributions.Select(MapToContributionResponse).ToList(),
                TotalCount = total,
                Total = total,
                Page = page,
                PageSize = pageSize,
                TotalPages = totalPages,
                TotalEmployeeContribution = totalEmployeeContribution,
                TotalEmployerContribution = totalEmployerContribution,
                GrandTotal = totalEmployeeContribution + totalEmployerContribution
            };
        }

        public async Task<PFESIContributionResponse> GetContributionByIdAsync(Guid id, Guid schoolId)
        {
            var contribution = await _context.PFESIContributions
                .FirstOrDefaultAsync(c => c.Id == id && c.SchoolId == schoolId);

            if (contribution == null)
                throw new KeyNotFoundException("Contribution not found");

            return MapToContributionResponse(contribution);
        }

        public async Task<PFESIContributionResponse> MarkAsDepositedAsync(MarkDepositRequest request)
        {
            // ═══ Comprehensive Input Validation (6 rules) ═══
            if (request.SchoolId == Guid.Empty)
                throw new ArgumentException("SchoolId cannot be empty", nameof(request.SchoolId));

            if (request.ContributionId == Guid.Empty && (request.ContributionIds == null || request.ContributionIds.Count == 0))
                throw new ArgumentException("At least one ContributionId is required", nameof(request.ContributionId));

            if (request.DepositDate > DateTime.UtcNow.Date)
                throw new ArgumentException("DepositDate cannot be in the future", nameof(request.DepositDate));

            if (string.IsNullOrWhiteSpace(request.ChallanNumber))
                throw new ArgumentException("ChallanNumber is required", nameof(request.ChallanNumber));

            if (request.ChallanNumber.Length > 50)
                throw new ArgumentException("ChallanNumber cannot exceed 50 characters", nameof(request.ChallanNumber));

            if (!string.IsNullOrWhiteSpace(request.ReceiptUrl) && request.ReceiptUrl.Length > 500)
                throw new ArgumentException("ReceiptUrl cannot exceed 500 characters", nameof(request.ReceiptUrl));

            var contribution = await _context.PFESIContributions
                .FirstOrDefaultAsync(c => c.Id == request.ContributionId && c.SchoolId == request.SchoolId);

            if (contribution == null)
                throw new KeyNotFoundException("Contribution not found");

            if (contribution.Status == "Deposited")
                throw new InvalidOperationException("Contribution is already marked as deposited");

            contribution.Status = "Deposited";
            contribution.DepositDate = request.DepositDate;
            contribution.ChallanNumber = request.ChallanNumber;
            contribution.ReceiptUrl = request.ReceiptUrl;
            contribution.Remarks = request.Remarks;
            contribution.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return MapToContributionResponse(contribution);
        }

        public async Task<ComplianceReportResponse> GenerateComplianceReportAsync(GenerateComplianceReportRequest request)
        {
            // ═══ Comprehensive Input Validation (6 rules) ═══
            if (request.SchoolId == Guid.Empty)
                throw new ArgumentException("SchoolId cannot be empty", nameof(request.SchoolId));

            if (string.IsNullOrWhiteSpace(request.Type))
                throw new ArgumentException("Type is required", nameof(request.Type));

            if (string.IsNullOrWhiteSpace(request.ReportType))
                throw new ArgumentException("ReportType is required", nameof(request.ReportType));

            var validReportTypes = new[] { "Monthly", "Quarterly", "Annual", "Compliance", "Audit" };
            if (!validReportTypes.Contains(request.ReportType))
                throw new ArgumentException($"Invalid ReportType. Must be one of: {string.Join(", ", validReportTypes)}", nameof(request.ReportType));

            if (string.IsNullOrWhiteSpace(request.Period))
                throw new ArgumentException("Period is required (YYYY-MM format)", nameof(request.Period));

            // Period format validation
            if (!System.Text.RegularExpressions.Regex.IsMatch(request.Period, @"^\d{4}-\d{2}$"))
                throw new ArgumentException("Period must be in YYYY-MM format", nameof(request.Period));

            if (!string.IsNullOrWhiteSpace(request.Remarks) && request.Remarks.Length > 500)
                throw new ArgumentException("Remarks cannot exceed 500 characters", nameof(request.Remarks));

            var reportNumber = $"RPT-{DateTime.UtcNow:yyyyMMddHHmmss}";

            // Duplicate prevention: Check if report already generated for this period+reportType
            var existingReport = await _context.ComplianceReports.FirstOrDefaultAsync(r =>
                r.SchoolId == request.SchoolId &&
                r.Period == request.Period &&
                r.ReportType == request.ReportType);

            if (existingReport != null)
                throw new InvalidOperationException($"A {request.ReportType} report in {request.Period} already exists");

            // Calculate totals from contributions for the period
            var contributions = await _context.PFESIContributions
                .Where(c => c.SchoolId == request.SchoolId && c.Month == request.Period && c.Type == request.Type)
                .ToListAsync();

            var report = new ComplianceReport
            {
                Id = Guid.NewGuid(),
                SchoolId = request.SchoolId,
                ReportNumber = reportNumber,
                ReportType = request.ReportType,
                Period = request.Period,
                GeneratedDate = DateTime.UtcNow,
                Status = "Generated",
                TotalEmployeeContribution = contributions.Sum(c => c.EmployeeContribution),
                TotalEmployerContribution = contributions.Sum(c => c.EmployerContribution),
                TotalEmployees = contributions.Select(c => c.StaffId).Distinct().Count(),
                Remarks = request.Remarks,
                CreatedAt = DateTime.UtcNow
            };

            _context.ComplianceReports.Add(report);
            await _context.SaveChangesAsync();

            return MapToReportResponse(report);
        }

        public async Task<ComplianceReportListResponse> GetComplianceReportsAsync(Guid schoolId, string? period = null, string? reportType = null)
        {
            var query = _context.ComplianceReports.Where(r => r.SchoolId == schoolId);

            if (!string.IsNullOrEmpty(period))
                query = query.Where(r => r.Period == period);

            if (!string.IsNullOrEmpty(reportType))
                query = query.Where(r => r.ReportType == reportType);

            var reports = await query.OrderByDescending(r => r.GeneratedDate).ToListAsync();

            return new ComplianceReportListResponse
            {
                Reports = reports.Select(MapToReportResponse).ToList(),
                Total = reports.Count
            };
        }

        public async Task<ComplianceReportResponse> GetComplianceReportByIdAsync(Guid id, Guid schoolId)
        {
            var report = await _context.ComplianceReports
                .FirstOrDefaultAsync(r => r.Id == id && r.SchoolId == schoolId);

            if (report == null)
                throw new KeyNotFoundException("Compliance report not found");

            return MapToReportResponse(report);
        }

        public async Task<ComplianceReportResponse> SubmitComplianceReportAsync(Guid id, SubmitComplianceReportRequest request, Guid schoolId)
        {
            // ═══ Comprehensive Input Validation (4 rules) ═══
            if (id == Guid.Empty)
                throw new ArgumentException("Report ID cannot be empty", nameof(id));

            if (schoolId == Guid.Empty)
                throw new ArgumentException("SchoolId cannot be empty", nameof(schoolId));

            if (request.SubmittedByStaffId == Guid.Empty)
                throw new ArgumentException("SubmittedByStaffId cannot be empty", nameof(request.SubmittedByStaffId));

            if (!string.IsNullOrWhiteSpace(request.SubmissionDetails) && request.SubmissionDetails.Length > 1000)
                throw new ArgumentException("SubmissionDetails cannot exceed 1000 characters", nameof(request.SubmissionDetails));

            var report = await _context.ComplianceReports
                .FirstOrDefaultAsync(r => r.Id == id && r.SchoolId == schoolId);

            if (report == null)
                throw new KeyNotFoundException("Compliance report not found");

            if (report.Status == "Submitted")
                throw new InvalidOperationException("Report is already submitted");

            if (report.Status == "Rejected")
                throw new InvalidOperationException("Rejected reports cannot be re-submitted. Generate a new report instead");

            report.Status = "Submitted";
            report.SubmissionDate = DateTime.UtcNow;
            report.SubmittedByStaffId = request.SubmittedByStaffId;
            report.SubmissionDetails = request.SubmissionDetails;
            report.Remarks = request.Remarks;
            report.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return MapToReportResponse(report);
        }

        private PFESIConfigResponse MapToConfigResponse(PFESIConfiguration config)
        {
            return new PFESIConfigResponse
            {
                Id = config.Id,
                SchoolId = config.SchoolId,
                Type = config.Type,
                EmployeeContributionPercentage = config.EmployeeContributionPercentage,
                EmployerContributionPercentage = config.EmployerContributionPercentage,
                WageLimit = config.WageLimit,
                PensionContributionLimit = config.PensionContributionLimit,
                RegistrationNumber = config.RegistrationNumber,
                EffectiveFrom = config.EffectiveFrom,
                EffectiveTo = config.EffectiveTo,
                CreatedAt = config.CreatedAt,
                UpdatedAt = config.UpdatedAt
            };
        }

        private PFESIContributionResponse MapToContributionResponse(PFESIContribution contribution)
        {
            return new PFESIContributionResponse
            {
                Id = contribution.Id,
                SchoolId = contribution.SchoolId,
                StaffId = contribution.StaffId,
                Type = contribution.Type,
                Month = contribution.Month,
                BasicSalary = contribution.BasicSalary,
                GrossSalary = contribution.GrossSalary,
                EmployeeContribution = contribution.EmployeeContribution,
                EmployerContribution = contribution.EmployerContribution,
                PensionContribution = contribution.PensionContribution,
                TotalContribution = contribution.TotalContribution,
                Status = contribution.Status,
                DepositDate = contribution.DepositDate,
                ChallanNumber = contribution.ChallanNumber,
                ReceiptUrl = contribution.ReceiptUrl,
                Remarks = contribution.Remarks,
                CreatedAt = contribution.CreatedAt,
                UpdatedAt = contribution.UpdatedAt
            };
        }

        private ComplianceReportResponse MapToReportResponse(ComplianceReport report)
        {
            return new ComplianceReportResponse
            {
                Id = report.Id,
                SchoolId = report.SchoolId,
                ReportNumber = report.ReportNumber,
                ReportType = report.ReportType,
                Period = report.Period,
                GeneratedDate = report.GeneratedDate,
                Status = report.Status,
                ReportFileUrl = report.ReportFileUrl,
                TotalEmployeeContribution = report.TotalEmployeeContribution,
                TotalEmployerContribution = report.TotalEmployerContribution,
                TotalEmployees = report.TotalEmployees,
                SubmissionDate = report.SubmissionDate,
                SubmittedByStaffId = report.SubmittedByStaffId,
                SubmissionDetails = report.SubmissionDetails,
                Remarks = report.Remarks,
                CreatedAt = report.CreatedAt,
                UpdatedAt = report.UpdatedAt
            };
        }
    }
}

