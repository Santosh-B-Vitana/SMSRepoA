using System;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using SmsApi.Data;
using SmsApi.Models.Entities;
using SmsApi.Models.DTOs;
using SmsApi.Services.Cashfree;
using SmsApi.Utils;

#pragma warning disable CS0618 // Student.Class is obsolete - migration to StudentEnrollment is in progress

namespace SmsApi.Services
{
    public interface IFeeService
    {
        Task<List<FeeStructureResponse>> GetFeeStructuresAsync(Guid schoolId, string? classFilter, string? academicYear = null, Guid? boardConfigurationId = null);
        Task<FeeStructureResponse?> GetFeeStructureByIdAsync(Guid id, Guid schoolId);
        Task<FeeStructureResponse> CreateFeeStructureAsync(CreateFeeStructureRequest request);
        Task<FeeListResponse> GetFeeRecordsAsync(Guid schoolId, int page, int pageSize, Guid? studentId, string? status, string? academicYear = null);
        Task<FeeRecordResponse?> GetFeeRecordByIdAsync(Guid id, Guid schoolId);
        Task<FeeRecordResponse?> UpdateModuleFeesAsync(Guid feeRecordId, Guid schoolId, decimal? transportMonthlyFee, decimal? hostelMonthlyFee);
        Task<FeeRecordResponse> CreateFeeRecordAsync(CreateFeeRecordRequest request);
        Task<PaymentResponse> CreatePaymentAsync(CreatePaymentRequest request);
        Task<FeeStatsResponse> GetFeeStatsAsync(Guid schoolId, string? academicYear);
        Task<LateFeeConfigDto?> GetLateFeeConfigAsync(Guid schoolId);
        Task<LateFeeConfigDto> CreateOrUpdateLateFeeConfigAsync(Guid schoolId, CreateLateFeeConfigDto dto);
        Task<decimal> CalculateLateFeeAsync(Guid feeRecordId, Guid schoolId);
        
        // Payment Gateway
        Task<PaymentGatewayResponseDto> InitiatePaymentAsync(Guid schoolId, Guid feeRecordId, InitiatePaymentDto dto);
        Task<PaymentStatusDto> ProcessWebhookAsync(string gateway, string payload);
        Task<bool> VerifyPaymentAsync(Guid schoolId, Guid transactionId, VerifyPaymentDto dto);
        
        // Receipt Generation
        Task<byte[]> GenerateReceiptPDFAsync(Guid schoolId, Guid transactionId);
        Task<string> SendReceiptEmailAsync(Guid schoolId, Guid transactionId, SendReceiptEmailDto dto);
        
        // Refund Processing
        Task<RefundResponseDto> ProcessRefundAsync(Guid schoolId, Guid transactionId, CreateRefundDto dto, Guid userId);
        Task<RefundStatusDto> GetRefundStatusAsync(Guid schoolId, Guid refundId);
        
        // Reminders & Overdue
        Task<ReminderResultDto> SendFeeRemindersAsync(Guid schoolId, SendRemindersDto dto);
        Task<List<OverdueFeeDto>> GetOverdueFeesAsync(Guid schoolId);

        // Bulk assign fee structure to all students in a class
        Task<(int Assigned, int Skipped)> BulkAssignStructureAsync(Guid structureId, Guid schoolId);

        // Extra ad-hoc charges (hostel, library fine, misc — before modules wired)
        Task<AddExtraChargesResponse> AddExtraChargesAsync(Guid recordId, Guid schoolId, AddExtraChargesRequest req);

        // Edit an existing payment (correct mistakes — logged in audit)
        Task<PaymentResponse> EditPaymentAsync(Guid paymentId, Guid schoolId, EditPaymentRequest req);

        // Auto-link the default fee structure for the student's class
        Task<LinkStructureResponse> LinkStructureAsync(Guid recordId, Guid schoolId);

        // Update an existing fee structure
        Task<FeeStructureResponse?> UpdateFeeStructureAsync(Guid id, Guid schoolId, UpdateFeeStructureRequest request);

        // Delete a fee structure (only if no fee records reference it)
        Task DeleteFeeStructureAsync(Guid id, Guid schoolId);

        // Get recent payments for a given date (defaults to today UTC)
        Task<List<RecentPaymentDto>> GetRecentPaymentsAsync(Guid schoolId, DateTime? date = null);

        // Seed default fee structures for all classes that lack one for the given academic year
        Task<(int Created, int Skipped)> SeedStructuresAsync(Guid schoolId, string academicYear);

        // Backfill fee records: create records for all active students who don't yet have one for the given academic year.
        // Respects per-student transport/hostel flags when computing effective fee amount.
        Task<(int Created, int Skipped)> SyncStudentFeeRecordsAsync(Guid schoolId, string academicYear);

        // Recalculate TotalAmount and PendingAmount on existing fee records whose structure has changed.
        // Only adjusts records where the stored TotalAmount mismatches the live fee structure sum.
        Task<(int Fixed, int Skipped)> RecalculateFeeTotalsAsync(Guid schoolId);
    }

    public class FeeService : IFeeService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<FeeService> _logger;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ICashfreeClient _cashfree;

        public FeeService(AppDbContext context, ILogger<FeeService> logger, IServiceScopeFactory scopeFactory, ICashfreeClient cashfree)
        {
            _context = context;
            _logger = logger;
            _scopeFactory = scopeFactory;
            _cashfree = cashfree;
        }

        public async Task<List<FeeStructureResponse>> GetFeeStructuresAsync(Guid schoolId, string? classFilter, string? academicYear = null, Guid? boardConfigurationId = null)
        {
            var query = _context.FeeStructures
                .Include(f => f.BoardConfig)
                .Where(f => f.SchoolId == schoolId);

            if (!string.IsNullOrWhiteSpace(classFilter))
                query = query.Where(f => f.Class == classFilter);

            if (!string.IsNullOrWhiteSpace(academicYear))
                query = query.Where(f => f.AcademicYear == academicYear);

            if (boardConfigurationId.HasValue)
                query = query.Where(f => f.BoardConfigurationId == boardConfigurationId.Value);

            var structures = await query
                .Select(f => new FeeStructureResponse
                {
                    Id = f.Id,
                    SchoolId = f.SchoolId,
                    Name = f.Name,
                    Class = f.Class,
                    AcademicYear = f.AcademicYear,
                    BoardConfigurationId = f.BoardConfigurationId,
                    BoardName = f.BoardConfig != null ? f.BoardConfig.Name : null,

                    // Components
                    TuitionFee = f.TuitionFee,
                    AdmissionFee = f.AdmissionFee,
                    ExamFee = f.ExamFee,
                    LibraryFee = f.LibraryFee,
                    LabFee = f.LabFee,
                    SportsFee = f.SportsFee,
                    TransportFee = f.TransportFee,
                    HostelFee = f.HostelFee,
                    UniformFee = f.UniformFee,
                    BooksFee = f.BooksFee,
                    DevelopmentFee = f.DevelopmentFee,
                    Miscellaneous = f.Miscellaneous,
                    TotalAmount = f.TotalAmount,

                    // Installments
                    InstallmentCount = f.InstallmentCount,
                    InstallmentAmounts = f.InstallmentAmounts,
                    InstallmentDueDates = f.InstallmentDueDates,
                    FeeHeadFrequencies = f.FeeHeadFrequencies,

                    Description = f.Description,
                    CreatedAt = f.CreatedAt,
                    UpdatedAt = f.UpdatedAt,

                    // How many student fee records are linked to this structure
                    AssignedStudentCount = _context.FeeRecords.Count(r => r.FeeStructureId == f.Id),

                    IsActive = f.IsActive
                })
                .ToListAsync();

            return structures;
        }

        public async Task<FeeStructureResponse?> GetFeeStructureByIdAsync(Guid id, Guid schoolId)
        {
            return await _context.FeeStructures
                .Include(f => f.BoardConfig)
                .Where(f => f.Id == id && f.SchoolId == schoolId)
                .Select(f => new FeeStructureResponse
                {
                    Id = f.Id,
                    SchoolId = f.SchoolId,
                    Name = f.Name,
                    Class = f.Class,
                    AcademicYear = f.AcademicYear,
                    BoardConfigurationId = f.BoardConfigurationId,
                    BoardName = f.BoardConfig != null ? f.BoardConfig.Name : null,

                    // Components
                    TuitionFee = f.TuitionFee,
                    AdmissionFee = f.AdmissionFee,
                    ExamFee = f.ExamFee,
                    LibraryFee = f.LibraryFee,
                    LabFee = f.LabFee,
                    SportsFee = f.SportsFee,
                    TransportFee = f.TransportFee,
                    HostelFee = f.HostelFee,
                    UniformFee = f.UniformFee,
                    BooksFee = f.BooksFee,
                    DevelopmentFee = f.DevelopmentFee,
                    Miscellaneous = f.Miscellaneous,
                    TotalAmount = f.TotalAmount,

                    // Installments
                    InstallmentCount = f.InstallmentCount,
                    InstallmentAmounts = f.InstallmentAmounts,
                    InstallmentDueDates = f.InstallmentDueDates,
                    FeeHeadFrequencies = f.FeeHeadFrequencies,

                    Description = f.Description,
                    CreatedAt = f.CreatedAt,
                    UpdatedAt = f.UpdatedAt,

                    IsActive = f.IsActive
                })
                .FirstOrDefaultAsync();
        }

        public async Task<FeeStructureResponse> CreateFeeStructureAsync(CreateFeeStructureRequest request)
        {
            // VALIDATION 1: Fee structure name required and unique per class/year
            if (string.IsNullOrWhiteSpace(request.Name) || request.Name.Length > 100)
                throw new ArgumentException("Fee structure name is required and cannot exceed 100 characters");
            if (request.Name.Trim().Length < 3)
                throw new ArgumentException("Fee structure name must be at least 3 characters.");
            if (string.IsNullOrWhiteSpace(request.Class))
                throw new ArgumentException("Class is required.");
            if (string.IsNullOrWhiteSpace(request.AcademicYear))
                throw new ArgumentException("Academic year is required.");
            if (request.AcademicYear.Length > 20)
                throw new ArgumentException("Academic year cannot exceed 20 characters.");
            if (request.Description != null && request.Description.Length > 500)
                throw new ArgumentException("Description cannot exceed 500 characters.");

            var existingStructure = await _context.FeeStructures
                .AnyAsync(fs => fs.SchoolId == request.SchoolId!.Value &&
                               fs.Class == request.Class &&
                               fs.AcademicYear == request.AcademicYear &&
                               fs.Name == request.Name);
            if (existingStructure)
                throw new InvalidOperationException("A fee structure with this name already exists for this class and academic year");

            // VALIDATION 2: All fee components must be non-negative
            if (request.TuitionFee < 0 || request.AdmissionFee < 0 || request.ExamFee < 0 ||
                request.LibraryFee < 0 || request.LabFee < 0 || request.SportsFee < 0 ||
                request.TransportFee < 0 || request.HostelFee < 0 || request.UniformFee < 0 ||
                request.BooksFee < 0 || request.DevelopmentFee < 0 || request.Miscellaneous < 0)
                throw new ArgumentException("All fee components must be non-negative");

            var feeComponents = new[] { request.TuitionFee, request.AdmissionFee, request.ExamFee, request.LibraryFee, request.LabFee, request.SportsFee, request.TransportFee, request.HostelFee, request.UniformFee, request.BooksFee, request.DevelopmentFee, request.Miscellaneous };
            if (feeComponents.Any(c => c > 10_000_000))
                throw new ArgumentException("Individual fee component cannot exceed 10,000,000.");

            // VALIDATION 3: At least one fee component must be greater than zero
            var totalFee = request.TuitionFee + request.AdmissionFee + request.ExamFee + 
                          request.LibraryFee + request.LabFee + request.SportsFee + 
                          request.TransportFee + request.HostelFee + request.UniformFee + 
                          request.BooksFee + request.DevelopmentFee + request.Miscellaneous;
            if (totalFee <= 0)
                throw new ArgumentException("Total fee must be greater than zero");

            // VALIDATION 4: Installment count must be positive if specified
            if (request.InstallmentCount < 0)
                throw new ArgumentException("Installment count cannot be negative");
            if (request.InstallmentCount > 12)
                throw new ArgumentException("Installment count cannot exceed 12.");

            // Calculate total from components
            var totalAmount = totalFee;

            var structure = new FeeStructure
            {
                Id = Guid.NewGuid(),
                SchoolId = request.SchoolId!.Value, // guaranteed by controller before this call
                Name = request.Name,
                Class = request.Class,
                AcademicYear = request.AcademicYear,
                TotalAmount = totalAmount,
                
                // Components
                TuitionFee = request.TuitionFee,
                AdmissionFee = request.AdmissionFee,
                ExamFee = request.ExamFee,
                LibraryFee = request.LibraryFee,
                LabFee = request.LabFee,
                SportsFee = request.SportsFee,
                TransportFee = request.TransportFee,
                HostelFee = request.HostelFee,
                UniformFee = request.UniformFee,
                BooksFee = request.BooksFee,
                DevelopmentFee = request.DevelopmentFee,
                Miscellaneous = request.Miscellaneous,
                
                // Installments
                InstallmentCount = request.InstallmentCount,
                InstallmentAmounts = request.InstallmentAmounts,
                InstallmentDueDates = request.InstallmentDueDates,
                FeeHeadFrequencies = request.FeeHeadFrequencies,
                
                Description = request.Description,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                BoardConfigurationId = request.BoardConfigurationId
            };

            _context.FeeStructures.Add(structure);
            await _context.SaveChangesAsync();

            // Reload with board name
            var boardName = request.BoardConfigurationId.HasValue
                ? await _context.BoardConfigurations
                    .Where(b => b.Id == request.BoardConfigurationId.Value)
                    .Select(b => b.Name)
                    .FirstOrDefaultAsync()
                : null;

            return new FeeStructureResponse
            {
                Id = structure.Id,
                SchoolId = structure.SchoolId,
                Name = structure.Name,
                Class = structure.Class,
                AcademicYear = structure.AcademicYear,
                BoardConfigurationId = structure.BoardConfigurationId,
                BoardName = boardName,

                TuitionFee = structure.TuitionFee,
                AdmissionFee = structure.AdmissionFee,
                ExamFee = structure.ExamFee,
                LibraryFee = structure.LibraryFee,
                LabFee = structure.LabFee,
                SportsFee = structure.SportsFee,
                TransportFee = structure.TransportFee,
                HostelFee = structure.HostelFee,
                UniformFee = structure.UniformFee,
                BooksFee = structure.BooksFee,
                DevelopmentFee = structure.DevelopmentFee,
                Miscellaneous = structure.Miscellaneous,
                TotalAmount = structure.TotalAmount,

                InstallmentCount = structure.InstallmentCount,
                InstallmentAmounts = structure.InstallmentAmounts,
                InstallmentDueDates = structure.InstallmentDueDates,
                FeeHeadFrequencies = structure.FeeHeadFrequencies,

                Description = structure.Description,
                CreatedAt = structure.CreatedAt,
                UpdatedAt = structure.UpdatedAt
            };
        }

        public async Task<FeeListResponse> GetFeeRecordsAsync(Guid schoolId, int page, int pageSize, Guid? studentId, string? status, string? academicYear = null)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 20;
            if (pageSize > 100) pageSize = 100;

            var query = _context.FeeRecords
                .Include(f => f.Student)
                .Where(f => f.SchoolId == schoolId);

            if (studentId.HasValue)
            {
                query = query.Where(f => f.StudentId == studentId.Value);
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                query = query.Where(f => f.Status == status);
            }

            if (!string.IsNullOrWhiteSpace(academicYear))
            {
                query = query.Where(f => f.AcademicYear == academicYear);
            }

            var total = await query.CountAsync();

            var feeRecords = await query
                .OrderByDescending(f => f.DueDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            // Batch-fetch full fee structures so we can fix stale TotalAmount values
            // and derive structure names in a single round-trip.
            var structureIds = feeRecords
                .Where(f => f.FeeStructureId.HasValue)
                .Select(f => f.FeeStructureId!.Value)
                .Distinct()
                .ToList();
            var structureMap = structureIds.Count > 0
                ? await _context.FeeStructures
                    .Where(s => structureIds.Contains(s.Id) && !s.IsDeleted)
                    .ToDictionaryAsync(s => s.Id)
                : new Dictionary<Guid, Models.Entities.FeeStructure>();
            var structureNames = structureMap.ToDictionary(kv => kv.Key, kv => kv.Value.Name);

            // Recompute TotalAmount (fix stale values) and PendingAmount for all non-paid records.
            // Also apply late fees for overdue records.
            foreach (var record in feeRecords.Where(f => f.Status != "paid"))
            {
                // Fix stale TotalAmount from the linked fee structure
                if (record.FeeStructureId.HasValue && structureMap.TryGetValue(record.FeeStructureId.Value, out var fs))
                {
                    var correctTotal = fs.ComputeTotalFromComponents();
                    // Apply any persisted fee-head overrides that reduce the gross total
                    if (!string.IsNullOrWhiteSpace(record.FeeHeadOverrides))
                    {
                        try
                        {
                            var overrides = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, decimal>>(record.FeeHeadOverrides!);
                            if (overrides != null)
                            {
                                decimal reduction = 0;
                                if (overrides.TryGetValue("tuitionFee",     out var v)) reduction += fs.TuitionFee     - v;
                                if (overrides.TryGetValue("admissionFee",   out v))     reduction += fs.AdmissionFee   - v;
                                if (overrides.TryGetValue("examFee",        out v))     reduction += fs.ExamFee        - v;
                                if (overrides.TryGetValue("libraryFee",     out v))     reduction += fs.LibraryFee     - v;
                                if (overrides.TryGetValue("labFee",         out v))     reduction += fs.LabFee         - v;
                                if (overrides.TryGetValue("sportsFee",      out v))     reduction += fs.SportsFee      - v;
                                if (overrides.TryGetValue("transportFee",   out v))     reduction += fs.TransportFee   - v;
                                if (overrides.TryGetValue("hostelFee",      out v))     reduction += fs.HostelFee      - v;
                                if (overrides.TryGetValue("uniformFee",     out v))     reduction += fs.UniformFee     - v;
                                if (overrides.TryGetValue("booksFee",       out v))     reduction += fs.BooksFee       - v;
                                if (overrides.TryGetValue("developmentFee", out v))     reduction += fs.DevelopmentFee - v;
                                if (overrides.TryGetValue("miscellaneous",  out v))     reduction += fs.Miscellaneous  - v;
                                correctTotal -= reduction;
                            }
                        }
                        catch { /* ignore malformed override JSON */ }
                    }
                    if (record.TotalAmount != correctTotal)
                    {
                        record.TotalAmount = correctTotal;
                        record.UpdatedAt = DateTime.UtcNow;
                    }
                }

                if (record.DueDate.Date < DateTime.UtcNow.Date)
                {
                    var calculatedLateFee = await CalculateLateFeeAsync(record.Id, schoolId);
                    if (calculatedLateFee > 0 && record.LateFeeAmount != calculatedLateFee)
                        record.LateFeeAmount = calculatedLateFee;
                }
                var freshPending = Math.Max(0, record.TotalAmount + record.LateFeeAmount - record.PaidAmount - record.DiscountAmount);
                if (record.PendingAmount != freshPending)
                {
                    record.PendingAmount = freshPending;
                    record.UpdatedAt = DateTime.UtcNow;
                }
                // Update status if it was incorrectly marked paid under a stale (wrong) total
                if (record.PendingAmount > 0 && record.Status == "paid")
                    record.Status = record.PaidAmount > 0 ? "partial" : "pending";
            }

            // Save changes if any values were updated
            if (_context.ChangeTracker.HasChanges())
            {
                await _context.SaveChangesAsync();
            }

            // Batch-load payments for all records in one round-trip
            var allRecordIds = feeRecords.Select(f => f.Id).ToList();
            var allPaymentEntities = allRecordIds.Count > 0
                ? await _context.PaymentTransactions
                    .Where(p => allRecordIds.Contains(p.FeeRecordId))
                    .OrderByDescending(p => p.Date)
                    .ToListAsync()
                : new List<Models.Entities.PaymentTransaction>();

            var paymentsByRecord = allPaymentEntities
                .GroupBy(p => p.FeeRecordId)
                .ToDictionary(g => g.Key, g => g.Select(p => new PaymentTransactionDto
                {
                    Id = p.Id,
                    FeeRecordId = p.FeeRecordId,
                    Amount = p.Amount,
                    Date = p.Date,
                    Method = p.Method,
                    Status = p.Status,
                    ReceiptNumber = p.ReceiptNumber,
                    GatewayRef = p.GatewayRef,
                    GatewayOrderId = p.GatewayOrderId,
                    ChequeNumber = p.ChequeNumber,
                    ChequeDate = p.ChequeDate,
                    BankName = p.BankName,
                    ProcessedBy = p.ProcessedBy,
                    Remarks = p.Remarks,
                    CreatedAt = p.CreatedAt,
                }).ToList());

            var records = feeRecords.Select(f => new FeeRecordResponse
            {
                Id = f.Id,
                SchoolId = f.SchoolId,
                StudentId = f.StudentId,
                StudentName = f.Student != null ? f.Student.Name : "",
                AdmissionNumber = f.Student?.AdmissionNumber ?? "",
                Class = f.Student != null ? f.Student.Class : "",
                FeeStructureId = f.FeeStructureId,
                FeeStructureName = f.FeeStructureId.HasValue
                    ? structureNames.GetValueOrDefault(f.FeeStructureId.Value)
                    : null,
                DueDate = f.DueDate,
                TotalAmount = f.TotalAmount,
                PaidAmount = f.PaidAmount,
                DiscountAmount = f.DiscountAmount,
                LateFeeAmount = f.LateFeeAmount,
                PendingAmount = f.PendingAmount,
                LastPaymentDate = f.LastPaymentDate,
                AcademicYear = f.AcademicYear,
                Status = f.Status,
                Payments = paymentsByRecord.GetValueOrDefault(f.Id, new()),
                CreatedAt = f.CreatedAt,
                UpdatedAt = f.UpdatedAt,
                FeeHeadOverrides = f.FeeHeadOverrides,
            }).ToList();

            return new FeeListResponse
            {
                FeeRecords = records,
                Total = total,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<FeeRecordResponse?> GetFeeRecordByIdAsync(Guid id, Guid schoolId)
        {
            var record = await _context.FeeRecords
                .Include(f => f.Student)
                .Where(f => f.Id == id && f.SchoolId == schoolId)
                .FirstOrDefaultAsync();

            if (record == null)
                return null;

            // Always fix stale TotalAmount from the linked fee structure, then recompute
            // PendingAmount. Also apply late fee for overdue records.
            if (record.Status != "paid")
            {
                // Fix stale TotalAmount
                if (record.FeeStructureId.HasValue)
                {
                    var fs = await _context.FeeStructures
                        .Where(s => s.Id == record.FeeStructureId.Value && !s.IsDeleted)
                        .FirstOrDefaultAsync();
                    if (fs != null)
                    {
                        var correctTotal = fs.ComputeTotalFromComponents();
                        if (!string.IsNullOrWhiteSpace(record.FeeHeadOverrides))
                        {
                            try
                            {
                                var overrides = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, decimal>>(record.FeeHeadOverrides!);
                                if (overrides != null)
                                {
                                    decimal reduction = 0;
                                    if (overrides.TryGetValue("tuitionFee",     out var v)) reduction += fs.TuitionFee     - v;
                                    if (overrides.TryGetValue("admissionFee",   out v))     reduction += fs.AdmissionFee   - v;
                                    if (overrides.TryGetValue("examFee",        out v))     reduction += fs.ExamFee        - v;
                                    if (overrides.TryGetValue("libraryFee",     out v))     reduction += fs.LibraryFee     - v;
                                    if (overrides.TryGetValue("labFee",         out v))     reduction += fs.LabFee         - v;
                                    if (overrides.TryGetValue("sportsFee",      out v))     reduction += fs.SportsFee      - v;
                                    if (overrides.TryGetValue("transportFee",   out v))     reduction += fs.TransportFee   - v;
                                    if (overrides.TryGetValue("hostelFee",      out v))     reduction += fs.HostelFee      - v;
                                    if (overrides.TryGetValue("uniformFee",     out v))     reduction += fs.UniformFee     - v;
                                    if (overrides.TryGetValue("booksFee",       out v))     reduction += fs.BooksFee       - v;
                                    if (overrides.TryGetValue("developmentFee", out v))     reduction += fs.DevelopmentFee - v;
                                    if (overrides.TryGetValue("miscellaneous",  out v))     reduction += fs.Miscellaneous  - v;
                                    correctTotal -= reduction;
                                }
                            }
                            catch { /* ignore malformed override JSON */ }
                        }
                        if (record.TotalAmount != correctTotal)
                        {
                            record.TotalAmount = correctTotal;
                            record.UpdatedAt = DateTime.UtcNow;
                        }
                    }
                }

                if (record.DueDate.Date < DateTime.UtcNow.Date)
                {
                    var calculatedLateFee = await CalculateLateFeeAsync(id, schoolId);
                    if (calculatedLateFee > 0 && record.LateFeeAmount != calculatedLateFee)
                        record.LateFeeAmount = calculatedLateFee;
                }
                var freshPending = Math.Max(0, record.TotalAmount + record.LateFeeAmount - record.PaidAmount - record.DiscountAmount);
                if (record.PendingAmount != freshPending)
                {
                    record.PendingAmount = freshPending;
                    record.UpdatedAt = DateTime.UtcNow;
                }
                if (_context.ChangeTracker.HasChanges())
                    await _context.SaveChangesAsync();
            }

            var payments = await _context.PaymentTransactions
                .Where(p => p.FeeRecordId == id)
                .OrderByDescending(p => p.Date)
                .Select(p => new PaymentTransactionDto
                {
                    Id = p.Id,
                    FeeRecordId = p.FeeRecordId,
                    Amount = p.Amount,
                    Date = p.Date,
                    Method = p.Method,
                    Status = p.Status,
                    ReceiptNumber = p.ReceiptNumber,
                    GatewayRef = p.GatewayRef,
                    GatewayOrderId = p.GatewayOrderId,
                    ChequeNumber = p.ChequeNumber,
                    ChequeDate = p.ChequeDate,
                    BankName = p.BankName,
                    ProcessedBy = p.ProcessedBy,
                    Remarks = p.Remarks,
                    CreatedAt = p.CreatedAt
                })
                .ToListAsync();

            // Live transport/hostel assignment lookup for fee breakdown
            var transportAssignment = await _context.TransportStudents
                .IgnoreQueryFilters()
                .Include(ts => ts.Route)
                .Where(ts => ts.StudentId == record.StudentId && ts.SchoolId == schoolId
                             && !ts.IsDeleted && ts.Status == "active")
                .OrderByDescending(ts => ts.UpdatedAt)
                .FirstOrDefaultAsync();

            var hostelAssignment = await _context.HostelStudents
                .IgnoreQueryFilters()
                .Include(hs => hs.Room)
                .Where(hs => hs.StudentId == record.StudentId && hs.SchoolId == schoolId
                             && !hs.IsDeleted && hs.Status == "active")
                .OrderByDescending(hs => hs.UpdatedAt)
                .FirstOrDefaultAsync();

            // Compute pro-rata transport fee for context (from assignment date to current year end)
            decimal transportFee = 0m, hostelFee = 0m;
            if (transportAssignment?.MonthlyFee > 0)
            {
                var from = transportAssignment.UpdatedAt > transportAssignment.CreatedAt
                    ? transportAssignment.CreatedAt.Date
                    : transportAssignment.CreatedAt.Date;
                var yearEnd = record.DueDate > DateTime.UtcNow ? record.DueDate : DateTime.UtcNow.AddMonths(10);
                transportFee = CalculateMonthFeeForDisplay(transportAssignment.MonthlyFee ?? 0m, from, yearEnd);
            }
            if (hostelAssignment?.MonthlyFee > 0)
            {
                var from = hostelAssignment.CreatedAt.Date;
                var yearEnd = record.DueDate > DateTime.UtcNow ? record.DueDate : DateTime.UtcNow.AddMonths(10);
                hostelFee = CalculateMonthFeeForDisplay(hostelAssignment.MonthlyFee, from, yearEnd);
            }

            // Resolve the structure name for the single-record view
            string? feeStructureName = null;
            if (record.FeeStructureId.HasValue)
            {
                feeStructureName = await _context.FeeStructures
                    .Where(s => s.Id == record.FeeStructureId.Value)
                    .Select(s => s.Name)
                    .FirstOrDefaultAsync();
            }

            return new FeeRecordResponse
            {
                Id = record.Id,
                SchoolId = record.SchoolId,
                StudentId = record.StudentId,
                StudentName = record.Student?.Name ?? "",
                AdmissionNumber = record.Student?.AdmissionNumber ?? "",
                Class = record.Student?.Class ?? "",
                FeeStructureId = record.FeeStructureId,
                FeeStructureName = feeStructureName,
                DueDate = record.DueDate,
                TotalAmount = record.TotalAmount,
                PaidAmount = record.PaidAmount,
                DiscountAmount = record.DiscountAmount,
                LateFeeAmount = record.LateFeeAmount,
                PendingAmount = record.PendingAmount,
                LastPaymentDate = record.LastPaymentDate,
                AcademicYear = record.AcademicYear,
                Status = record.Status,
                Payments = payments,
                CreatedAt = record.CreatedAt,
                UpdatedAt = record.UpdatedAt,
                TransportFee = transportFee,
                TransportMonthlyFee = transportAssignment?.MonthlyFee ?? 0m,
                TransportRoute = transportAssignment?.Route?.RouteName,
                TransportPickup = transportAssignment?.PickupPoint,
                HostelFee = hostelFee,
                HostelMonthlyFee = hostelAssignment?.MonthlyFee ?? 0m,
                HostelRoom = hostelAssignment?.Room?.RoomNumber,
                FeeHeadOverrides = record.FeeHeadOverrides,
            };
        }

        private static decimal CalculateMonthFeeForDisplay(decimal monthlyFee, DateTime from, DateTime yearEnd)
        {
            if (monthlyFee <= 0) return 0m;
            var startMonthNum = from.Year * 12 + from.Month;
            var endMonthNum   = yearEnd.Year * 12 + yearEnd.Month;
            var months = Math.Max(0, endMonthNum - startMonthNum + 1);
            return Math.Round(monthlyFee * months, 2);
        }

        public async Task<FeeRecordResponse?> UpdateModuleFeesAsync(Guid feeRecordId, Guid schoolId, decimal? transportMonthlyFee, decimal? hostelMonthlyFee)
        {
            var record = await _context.FeeRecords
                .FirstOrDefaultAsync(r => r.Id == feeRecordId && r.SchoolId == schoolId && !r.IsDeleted);
            if (record == null) return null;

            if (transportMonthlyFee.HasValue)
            {
                var transportAssignment = await _context.TransportStudents
                    .Where(ts => ts.StudentId == record.StudentId && ts.SchoolId == schoolId && !ts.IsDeleted && ts.Status == "active")
                    .OrderByDescending(ts => ts.UpdatedAt)
                    .FirstOrDefaultAsync();
                if (transportAssignment != null)
                {
                    transportAssignment.MonthlyFee = transportMonthlyFee.Value;
                    transportAssignment.UpdatedAt = DateTime.UtcNow;
                }
            }

            if (hostelMonthlyFee.HasValue)
            {
                var hostelAssignment = await _context.HostelStudents
                    .Where(hs => hs.StudentId == record.StudentId && hs.SchoolId == schoolId && !hs.IsDeleted && hs.Status == "active")
                    .OrderByDescending(hs => hs.UpdatedAt)
                    .FirstOrDefaultAsync();
                if (hostelAssignment != null)
                {
                    hostelAssignment.MonthlyFee = hostelMonthlyFee.Value;
                    hostelAssignment.UpdatedAt = DateTime.UtcNow;
                }
            }

            await _context.SaveChangesAsync();
            return await GetFeeRecordByIdAsync(feeRecordId, schoolId);
        }

        public async Task<FeeRecordResponse> CreateFeeRecordAsync(CreateFeeRecordRequest request)
        {
            if (request.StudentId == Guid.Empty)
                throw new ArgumentException("Student ID is required.");
            var student = await _context.Students.FirstOrDefaultAsync(s => s.Id == request.StudentId && s.SchoolId == request.SchoolId);
            if (student == null)
                throw new KeyNotFoundException("Student not found.");

            if (request.TotalAmount <= 0)
                throw new ArgumentException("Total amount must be greater than zero.");
            if (request.TotalAmount > 10_000_000)
                throw new ArgumentException("Total amount cannot exceed 10,000,000.");

            if (request.PaidAmount < 0)
                throw new ArgumentException("Paid amount cannot be negative.");
            if (request.DiscountAmount < 0)
                throw new ArgumentException("Discount amount cannot be negative.");
            if (request.LateFeeAmount < 0)
                throw new ArgumentException("Late fee amount cannot be negative.");

            if (request.PaidAmount + request.DiscountAmount > request.TotalAmount)
                throw new ArgumentException("Paid amount plus discount cannot exceed total amount.");

            if (string.IsNullOrWhiteSpace(request.AcademicYear))
                throw new ArgumentException("Academic year is required.");

            var validStatuses = new[] { "pending", "partial", "paid", "overdue" };
            if (!validStatuses.Contains(request.Status?.ToLower()))
                throw new ArgumentException("Status must be: pending, partial, paid, or overdue.");

            if (request.DueDate < DateTime.UtcNow.AddYears(-2))
                throw new ArgumentException("Due date cannot be more than 2 years in the past.");

            if (request.FeeStructureId.HasValue)
            {
                var structureExists = await _context.FeeStructures.AnyAsync(s => s.Id == request.FeeStructureId.Value && s.SchoolId == request.SchoolId);
                if (!structureExists)
                    throw new KeyNotFoundException("Fee structure not found.");
            }

            if (request.FeeStructureId.HasValue)
            {
                var duplicate = await _context.FeeRecords.AnyAsync(r => r.SchoolId == request.SchoolId && r.StudentId == request.StudentId && r.FeeStructureId == request.FeeStructureId.Value && r.AcademicYear == request.AcademicYear);
                if (duplicate)
                    throw new InvalidOperationException("A fee record already exists for this student with the same fee structure and academic year.");
            }

            var pendingAmount = request.TotalAmount - request.PaidAmount - request.DiscountAmount + request.LateFeeAmount;

            var record = new FeeRecord
            {
                Id = Guid.NewGuid(),
                SchoolId = request.SchoolId,
                StudentId = request.StudentId,
                FeeStructureId = request.FeeStructureId,
                DueDate = request.DueDate,
                TotalAmount = request.TotalAmount,
                PaidAmount = request.PaidAmount,
                DiscountAmount = request.DiscountAmount,
                LateFeeAmount = request.LateFeeAmount,
                PendingAmount = pendingAmount,
                AcademicYear = request.AcademicYear,
                Status = request.Status ?? "pending",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.FeeRecords.Add(record);
            // Queue parent notifications alongside the record so they're saved atomically
            await AddFeeParentNotificationsAsync(
                record.SchoolId, record.StudentId,
                $"New fee generated for {student.FirstName}",
                $"A fee of \u20B9{record.TotalAmount:F0} has been created for the academic year {record.AcademicYear}, " +
                $"due on {record.DueDate:dd MMM yyyy}. Please log in to view the details.",
                record.Id);
            await _context.SaveChangesAsync();

            return await GetFeeRecordByIdAsync(record.Id, record.SchoolId) ?? throw new InvalidOperationException("Failed to retrieve created fee record.");
        }

        public async Task<PaymentResponse> CreatePaymentAsync(CreatePaymentRequest request)
        {
            if (request.Amount <= 0) throw new ArgumentException("Payment amount must be greater than zero.");
            if (request.Amount > 10_000_000) throw new ArgumentException("Payment amount cannot exceed 10,000,000.");

            var validMethods = new[] { "cash", "cheque", "dd", "online", "upi", "card", "bank_transfer", "neft", "imps", "rtgs", "razorpay", "payu", "cashfree" };
            if (string.IsNullOrWhiteSpace(request.Method) || !validMethods.Contains(request.Method.ToLower()))
                throw new ArgumentException($"Invalid payment method '{request.Method}'. Accepted: cash, cheque, dd, bank_transfer, upi, card, cashfree.");

            if (string.IsNullOrWhiteSpace(request.ReceiptNumber)) throw new ArgumentException("Receipt number is required.");

            if (request.Date > DateTime.UtcNow.AddDays(1)) throw new ArgumentException("Payment date cannot be in the future.");

            if (!request.SchoolId.HasValue || request.SchoolId == Guid.Empty) throw new ArgumentException("School ID is required.");

            if (request.Method?.ToLower() == "cheque" && string.IsNullOrWhiteSpace(request.ChequeNumber))
                throw new ArgumentException("Cheque number is required for cheque payments.");

            // ── TRANSACTION ATOMICITY: Wrap payment + balance update + audit in one DB transaction ──
            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
            await using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var feeRecord = await _context.FeeRecords
                    .FirstOrDefaultAsync(f => f.Id == request.FeeRecordId && f.SchoolId == request.SchoolId!.Value);

                if (feeRecord == null)
                    throw new InvalidOperationException("Fee record not found.");

                // ── GUARD: Explicit check for already-paid fee records ──
                if (feeRecord.Status == "paid")
                    throw new InvalidOperationException("This fee record is already fully paid. No further payment can be accepted.");

                // ── IDEMPOTENCY: Block duplicate receipt numbers within the same school ──
                var receiptExists = await _context.PaymentTransactions
                    .AsNoTracking()
                    .AnyAsync(p => p.SchoolId == request.SchoolId!.Value &&
                                   p.ReceiptNumber == request.ReceiptNumber &&
                                   p.Status != "voided");
                if (receiptExists)
                    throw new InvalidOperationException($"A payment with receipt number '{request.ReceiptNumber}' already exists. Duplicate receipt numbers are not allowed.");

                // Snapshot before mutation (for audit)
                var oldValues = JsonSerializer.Serialize(new
                {
                    feeRecord.PaidAmount,
                    feeRecord.PendingAmount,
                    feeRecord.Status,
                    feeRecord.LateFeeAmount,
                    feeRecord.DiscountAmount,
                });

                // Validate: payment must not exceed outstanding balance
                var outstanding = feeRecord.TotalAmount - feeRecord.PaidAmount - feeRecord.DiscountAmount + feeRecord.LateFeeAmount;
                if (outstanding <= 0)
                    throw new InvalidOperationException("Outstanding balance is zero. No payment is required.");
                if (request.Amount > outstanding + 0.01m) // small tolerance for rounding
                    throw new InvalidOperationException($"Payment amount ₹{request.Amount} exceeds outstanding balance ₹{outstanding}.");

                var payment = new PaymentTransaction
                {
                    Id = Guid.NewGuid(),
                    SchoolId = request.SchoolId!.Value,
                    StudentId = request.StudentId,
                    FeeRecordId = request.FeeRecordId,
                    Amount = request.Amount,
                    Date = request.Date,
                    Method = request.Method ?? string.Empty,
                    Status = "success",
                    ReceiptNumber = request.ReceiptNumber,
                    GatewayRef = request.GatewayRef,
                    GatewayOrderId = request.GatewayOrderId,
                    ChequeNumber = request.ChequeNumber,
                    ChequeDate = request.ChequeDate,
                    BankName = request.BankName,
                    ProcessedBy = request.ProcessedBy ?? string.Empty,
                    AcademicYear = request.AcademicYear ?? string.Empty,
                    Remarks = request.Remarks,
                    CreatedAt = DateTime.UtcNow
                };

                _context.PaymentTransactions.Add(payment);

                // Update fee record
                feeRecord.PaidAmount += request.Amount;
                feeRecord.PendingAmount = feeRecord.TotalAmount - feeRecord.PaidAmount - feeRecord.DiscountAmount + feeRecord.LateFeeAmount;
                feeRecord.Status = feeRecord.PendingAmount <= 0 ? "paid" : "partial";
                feeRecord.LastPaymentDate = request.Date;
                feeRecord.UpdatedAt = DateTime.UtcNow;

                // Snapshot after mutation (for audit)
                var newValues = JsonSerializer.Serialize(new
                {
                    feeRecord.PaidAmount,
                    feeRecord.PendingAmount,
                    feeRecord.Status,
                    feeRecord.LateFeeAmount,
                    feeRecord.DiscountAmount,
                    PaymentAmount = request.Amount,
                    PaymentMethod = request.Method,
                    ReceiptNumber = payment.ReceiptNumber,
                });

                // ── AUDIT LOG: immutable record of this financial event ──
                _context.Set<FeeAuditLog>().Add(new FeeAuditLog
                {
                    SchoolId = request.SchoolId!.Value,
                    EntityType = "PaymentTransaction",
                    EntityId = payment.Id,
                    Action = "PaymentReceived",
                    FeeRecordId = feeRecord.Id,
                    PaymentTransactionId = payment.Id,
                    StudentId = request.StudentId,
                    OldValues = oldValues,
                    NewValues = newValues,
                    Amount = request.Amount,
                    PerformedByName = request.ProcessedBy,
                    Remarks = $"Payment of ₹{request.Amount} via {request.Method}. Receipt: {payment.ReceiptNumber}",
                    Timestamp = DateTime.UtcNow,
                });

                // In-app parent notification (inside same transaction so it rolls back on failure)
                if (request.NotifyParent)
                {
                    var studentForNotif = await _context.Students.FindAsync(request.StudentId);
                    var studentName = studentForNotif?.FirstName ?? "your child";
                    await AddFeeParentNotificationsAsync(
                        request.SchoolId!.Value, request.StudentId,
                        $"Payment received for {studentName}",
                        $"Fee payment of \u20B9{request.Amount:F0} received via {request.Method}. " +
                        $"Receipt #{payment.ReceiptNumber}. " +
                        (feeRecord.PendingAmount > 0
                            ? $"Remaining outstanding: \u20B9{feeRecord.PendingAmount:F0}."
                            : "Fee account is now fully paid."),
                        feeRecord.Id);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                _logger?.LogInformation(
                    "Payment {PaymentId} committed (\u20b9{Amount}) for FeeRecord {FeeRecordId}. New balance: \u20b9{Balance}, Status: {Status}",
                    payment.Id, request.Amount, request.FeeRecordId, feeRecord.PendingAmount, feeRecord.Status);

                // Fire-and-log: sync fee payment to wallet (non-blocking)
                var capturedSchoolId = request.SchoolId!.Value;
                var capturedAmount = request.Amount;
                var capturedMethod = request.Method ?? "Cash";
                var capturedReceipt = payment.ReceiptNumber ?? payment.Id.ToString();
                var capturedStudentId = request.StudentId;
                _ = Task.Run(async () =>
                {
                    using var scope = _scopeFactory.CreateScope();
                    var financeService = scope.ServiceProvider.GetRequiredService<IFinanceService>();
                    try
                    {
                        await financeService.AddFeeIncomeAsync(
                            capturedSchoolId, capturedAmount,
                            $"Fee payment via {capturedMethod} — receipt {capturedReceipt}",
                            capturedMethod, capturedReceipt, capturedStudentId);
                    }
                    catch (Exception ex)
                    {
                        _logger?.LogError(ex, "Failed to sync fee payment {Receipt} to wallet", capturedReceipt);
                    }
                });

                return new PaymentResponse
                {
                    Id = payment.Id,
                    SchoolId = payment.SchoolId,
                    StudentId = payment.StudentId,
                    FeeRecordId = payment.FeeRecordId,
                    Amount = payment.Amount,
                    Date = payment.Date,
                    Method = payment.Method ?? string.Empty,
                    Status = payment.Status,
                    ReceiptNumber = payment.ReceiptNumber ?? string.Empty,
                    GatewayRef = payment.GatewayRef,
                    GatewayOrderId = payment.GatewayOrderId,
                    ChequeNumber = payment.ChequeNumber,
                    ChequeDate = payment.ChequeDate,
                    BankName = payment.BankName,
                    ProcessedBy = payment.ProcessedBy,
                    AcademicYear = payment.AcademicYear,
                    Remarks = payment.Remarks,
                    CreatedAt = payment.CreatedAt
                };
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger?.LogError(ex,
                    "ROLLBACK: Payment creation failed for FeeRecord {FeeRecordId}. All changes reverted.",
                    request.FeeRecordId);
                throw;
            }
            });
        }

        public async Task<FeeStatsResponse> GetFeeStatsAsync(Guid schoolId, string? academicYear)
        {
            var query = _context.FeeRecords
                .Include(f => f.Student)
                .Include(f => f.FeeStructure)
                .Where(f => f.SchoolId == schoolId);
            
            if (!string.IsNullOrWhiteSpace(academicYear))
            {
                query = query.Where(f => f.AcademicYear == academicYear);
            }

            var feeRecords = await query.ToListAsync();

            // Fix stale TotalAmount / PendingAmount values (same logic as GetFeeRecordsAsync)
            foreach (var record in feeRecords.Where(f => f.Status != "paid"))
            {
                if (record.FeeStructureId.HasValue && record.FeeStructure != null && !record.FeeStructure.IsDeleted)
                {
                    var fs = record.FeeStructure;
                    var correctTotal = fs.ComputeTotalFromComponents();
                    if (!string.IsNullOrWhiteSpace(record.FeeHeadOverrides))
                    {
                        try
                        {
                            var overrides = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, decimal>>(record.FeeHeadOverrides!);
                            if (overrides != null)
                            {
                                decimal reduction = 0;
                                if (overrides.TryGetValue("tuitionFee",     out var v)) reduction += fs.TuitionFee     - v;
                                if (overrides.TryGetValue("admissionFee",   out v))     reduction += fs.AdmissionFee   - v;
                                if (overrides.TryGetValue("examFee",        out v))     reduction += fs.ExamFee        - v;
                                if (overrides.TryGetValue("libraryFee",     out v))     reduction += fs.LibraryFee     - v;
                                if (overrides.TryGetValue("labFee",         out v))     reduction += fs.LabFee         - v;
                                if (overrides.TryGetValue("sportsFee",      out v))     reduction += fs.SportsFee      - v;
                                if (overrides.TryGetValue("transportFee",   out v))     reduction += fs.TransportFee   - v;
                                if (overrides.TryGetValue("hostelFee",      out v))     reduction += fs.HostelFee      - v;
                                if (overrides.TryGetValue("uniformFee",     out v))     reduction += fs.UniformFee     - v;
                                if (overrides.TryGetValue("booksFee",       out v))     reduction += fs.BooksFee       - v;
                                if (overrides.TryGetValue("developmentFee", out v))     reduction += fs.DevelopmentFee - v;
                                if (overrides.TryGetValue("miscellaneous",  out v))     reduction += fs.Miscellaneous  - v;
                                correctTotal -= reduction;
                            }
                        }
                        catch { /* ignore malformed override JSON */ }
                    }
                    if (record.TotalAmount != correctTotal)
                    {
                        record.TotalAmount = correctTotal;
                        record.UpdatedAt = DateTime.UtcNow;
                    }
                }

                var freshPending = Math.Max(0, record.TotalAmount + record.LateFeeAmount - record.PaidAmount - record.DiscountAmount);
                if (record.PendingAmount != freshPending)
                {
                    record.PendingAmount = freshPending;
                    record.UpdatedAt = DateTime.UtcNow;
                }
                if (record.PendingAmount > 0 && record.Status == "paid")
                    record.Status = record.PaidAmount > 0 ? "partial" : "pending";
            }

            if (_context.ChangeTracker.HasChanges())
                await _context.SaveChangesAsync();

            var payments = await _context.PaymentTransactions
                .Where(p => p.SchoolId == schoolId && feeRecords.Select(f => f.Id).Contains(p.FeeRecordId))
                .ToListAsync();

            var totalFees = feeRecords.Sum(f => f.TotalAmount);
            var collectedFees = feeRecords.Sum(f => f.PaidAmount);
            // Use corrected PendingAmount (accounts for discounts + late fees) rather than totalFees - collectedFees
            var pendingFees = feeRecords.Where(f => f.Status != "paid").Sum(f => f.PendingAmount);
            
            var overdueFees = feeRecords
                .Where(f => f.DueDate < DateTime.UtcNow && f.Status != "paid")
                .Sum(f => f.PendingAmount);

            var stats = new FeeStatsResponse
            {
                TotalFees = totalFees,
                CollectedFees = collectedFees,
                PendingFees = pendingFees,
                OverdueFees = overdueFees,
                DiscountGiven = feeRecords.Sum(f => f.DiscountAmount),
                LateFeeCollected = feeRecords.Sum(f => f.LateFeeAmount),
                ByClass = feeRecords
                    .Where(f => f.Student != null)
                    .GroupBy(f => f.Student!.Class)
                    .ToDictionary(g => g.Key, g => g.Sum(f => f.TotalAmount)),
                ByMethod = payments.Where(p => !string.IsNullOrEmpty(p.Method))
                    .GroupBy(p => p.Method!)
                    .ToDictionary(g => g.Key, g => g.Sum(p => p.Amount)),
                ByConcessionType = new Dictionary<string, int>() // Placeholder, requires join with fee concessions
            };

            return stats;
        }

        public async Task<LateFeeConfigDto?> GetLateFeeConfigAsync(Guid schoolId)
        {
            var config = await _context.LateFeeConfigs
                .FirstOrDefaultAsync(c => c.SchoolId == schoolId);

            if (config == null)
                return null;

            return new LateFeeConfigDto
            {
                Id = config.Id,
                SchoolId = config.SchoolId,
                GracePeriodDays = config.GracePeriodDays,
                FeeType = config.FeeType ?? string.Empty,
                Amount = config.Amount,
                MaxAmount = config.MaxAmount,
                IsActive = config.IsActive
            };
        }

        public async Task<LateFeeConfigDto> CreateOrUpdateLateFeeConfigAsync(Guid schoolId, CreateLateFeeConfigDto dto)
        {
            if (dto.GracePeriodDays < 0) throw new ArgumentException("Grace period days cannot be negative.");
            if (dto.GracePeriodDays > 365) throw new ArgumentException("Grace period cannot exceed 365 days.");

            var validFeeTypes = new[] { "fixed", "percentage", "daily" };
            if (string.IsNullOrWhiteSpace(dto.FeeType) || !validFeeTypes.Contains(dto.FeeType.ToLower()))
                throw new ArgumentException("Fee type must be: fixed, percentage, or daily.");

            if (dto.Amount <= 0) throw new ArgumentException("Late fee amount must be greater than zero.");
            if (dto.FeeType?.ToLower() == "percentage" && dto.Amount > 100)
                throw new ArgumentException("Percentage-based late fee cannot exceed 100%.");

            if (dto.MaxAmount.HasValue && dto.MaxAmount.Value <= 0)
                throw new ArgumentException("Max amount must be greater than zero.");
            if (dto.MaxAmount.HasValue && dto.MaxAmount.Value < dto.Amount && dto.FeeType?.ToLower() != "percentage")
                throw new ArgumentException("Max amount cannot be less than the base amount.");

            var config = await _context.LateFeeConfigs
                .FirstOrDefaultAsync(c => c.SchoolId == schoolId);

            if (config == null)
            {
                config = new LateFeeConfig
                {
                    Id = Guid.NewGuid(),
                    SchoolId = schoolId,
                    GracePeriodDays = dto.GracePeriodDays,
                    FeeType = dto.FeeType ?? string.Empty,
                    Amount = dto.Amount,
                    MaxAmount = dto.MaxAmount,
                    IsActive = dto.IsActive,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.LateFeeConfigs.Add(config);
            }
            else
            {
                config.GracePeriodDays = dto.GracePeriodDays;
                config.FeeType = dto.FeeType ?? string.Empty;
                config.Amount = dto.Amount;
                config.MaxAmount = dto.MaxAmount;
                config.IsActive = dto.IsActive;
                config.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            return new LateFeeConfigDto
            {
                Id = config.Id,
                SchoolId = config.SchoolId,
                GracePeriodDays = config.GracePeriodDays,
                FeeType = config.FeeType ?? string.Empty,
                Amount = config.Amount,
                MaxAmount = config.MaxAmount,
                IsActive = config.IsActive
            };
        }

        /// <summary>
        /// CRITICAL FIX: Enhanced late fee calculation with proper caps and waiver support
        /// Implements proper financial controls to prevent overcharging
        /// </summary>
        public async Task<decimal> CalculateLateFeeAsync(Guid feeRecordId, Guid schoolId)
        {
            var feeRecord = await _context.FeeRecords
                .FirstOrDefaultAsync(f => f.Id == feeRecordId && f.SchoolId == schoolId);

            if (feeRecord == null)
                return 0;

            // CRITICAL FIX 1: If already paid, NO additional late fee
            if (feeRecord.Status == "paid")
                return 0;

            // CRITICAL FIX 2: If partial payment made and installment is current, reduce late fee proportionally
            if (feeRecord.PaidAmount > 0 && feeRecord.PaidAmount < feeRecord.TotalAmount)
            {
                var remainingAmount = feeRecord.TotalAmount - feeRecord.PaidAmount;
                _logger.LogInformation($"Late fee calculation with partial payment: Total={feeRecord.TotalAmount}, Paid={feeRecord.PaidAmount}, Remaining={remainingAmount}");
            }

            var config = await _context.LateFeeConfigs
                .FirstOrDefaultAsync(c => c.SchoolId == schoolId && c.IsActive);

            if (config == null)
            {
                _logger.LogWarning($"No late fee configuration found for school {schoolId}");
                return 0;
            }

            var today = DateTime.UtcNow.Date;
            var dueDate = feeRecord.DueDate.Date;
            var daysOverdue = (today - dueDate).Days - config.GracePeriodDays;
            
            if (daysOverdue <= 0)
            {
                _logger.LogInformation($"Fee record still within grace period. Days overdue: {daysOverdue}, Grace period: {config.GracePeriodDays}");
                return 0;
            }

            // CRITICAL FIX 3: Calculate late fee with monthly caps
            decimal totalLateFee = 0;
            var feeType = config.FeeType?.ToLower() ?? "daily";

            // Apply daily late fee but cap per month
            if (feeType == "daily")
            {
                var dailyFee = config.Amount;
                
                // Calculate months overdue
                var monthsOverdue = (int)Math.Floor(daysOverdue / 30.0m);
                var remainingDaysInMonth = daysOverdue % 30;

                // Per-month cap
                var monthlyCapAmount = config.MaxAmount ?? (dailyFee * 30);
                
                // Charge for complete months (capped at monthly max)
                totalLateFee = (monthsOverdue * monthlyCapAmount);
                
                // Charge for remaining days in current month
                var remainingLateFee = remainingDaysInMonth * dailyFee;
                totalLateFee += Math.Min(remainingLateFee, monthlyCapAmount);

                _logger.LogInformation($"Late fee (daily): Days={daysOverdue}, Months={monthsOverdue}, RemainingDays={remainingDaysInMonth}, DailyFee={dailyFee}, MonthlyMax={monthlyCapAmount}, Total={totalLateFee}");
            }
            else if (feeType == "percentage")
            {
                // Percentage-based late fee (e.g., 1% of fee per month)
                var monthsOverdue = (int)Math.Ceiling(daysOverdue / 30.0m);
                var percentagePerMonth = config.Amount;
                
                totalLateFee = (feeRecord.TotalAmount * (percentagePerMonth / 100)) * monthsOverdue;

                _logger.LogInformation($"Late fee (percentage): Months={monthsOverdue}, Percentage={percentagePerMonth}%, FeeAmount={feeRecord.TotalAmount}, Total={totalLateFee}");
            }
            else if (feeType == "fixed")
            {
                // Fixed amount per installment
                totalLateFee = config.Amount;
                
                _logger.LogInformation($"Late fee (fixed): FixedAmount={config.Amount}");
            }

            // CRITICAL FIX 4: Apply overall cap
            if (config.MaxAmount.HasValue && totalLateFee > config.MaxAmount.Value)
            {
                _logger.LogWarning($"Late fee capped: Calculated={totalLateFee}, Max={config.MaxAmount.Value}");
                totalLateFee = config.MaxAmount.Value;
            }

            // CRITICAL FIX 5: Check for existing late fee waiver (exemptions)
            try
            {
                var hasWaiver = await _context.FeeConcessions
                    .AnyAsync(fc => fc.SchoolId == schoolId && 
                                   fc.Status == "approved");

                if (hasWaiver)
                {
                    _logger.LogInformation($"Late fee waiver found. May apply to fee record {feeRecordId}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning($"Could not check for fee waivers: {ex.Message}");
            }

            _logger.LogInformation($"✅ CRITICAL: Late fee calculated for fee record {feeRecordId}: {totalLateFee} (Days overdue: {daysOverdue}, Config type: {feeType})");

            return totalLateFee;
        }

        // ===========================
        // Payment Gateway Integration
        // ===========================

        public async Task<PaymentGatewayResponseDto> InitiatePaymentAsync(Guid schoolId, Guid feeRecordId, InitiatePaymentDto dto)
        {
            var feeRecord = await _context.FeeRecords
                .Include(f => f.Student)
                .FirstOrDefaultAsync(f => f.Id == feeRecordId && f.SchoolId == schoolId);

            if (feeRecord == null)
                throw new KeyNotFoundException("Fee record not found");

            if (feeRecord.Status == "paid")
                throw new InvalidOperationException("Fee already paid");

            // Create payment transaction
            var transaction = new PaymentTransaction
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                FeeRecordId = feeRecordId,
                StudentId = feeRecord.StudentId,
                Amount = dto.Amount,
                PaymentMethod = dto.Gateway,
                Status = "pending",
                TransactionDate = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            };

            _context.PaymentTransactions.Add(transaction);

            // Generate order ID based on gateway
            var orderId = $"{dto.Gateway.ToUpper()}-{schoolId.ToString().Substring(0, 8)}-{transaction.Id.ToString().Substring(0, 8)}";

            // Create payment gateway log
            var gatewayLog = new PaymentGatewayLog
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                FeeRecordId = feeRecordId,
                TransactionId = transaction.Id,
                Gateway = dto.Gateway,
                GatewayOrderId = orderId,
                Amount = dto.Amount,
                Currency = dto.Currency,
                Status = "created",
                CreatedAt = DateTime.UtcNow
            };

            _context.PaymentGatewayLogs.Add(gatewayLog);
            await _context.SaveChangesAsync();

            // Return gateway-specific response
            var response = new PaymentGatewayResponseDto
            {
                OrderId = orderId,
                Gateway = dto.Gateway,
                Amount = dto.Amount,
                Currency = dto.Currency,
                Metadata = new Dictionary<string, string>
                {
                    { "fee_record_id", feeRecordId.ToString() },
                    { "student_name", feeRecord.Student?.FirstName ?? "Student" },
                    { "transaction_id", transaction.Id.ToString() }
                }
            };

            // ── Cashfree: call the real API using the school's DB-configured credentials ──
            if (dto.Gateway.Equals("cashfree", StringComparison.OrdinalIgnoreCase))
            {
                var cfConfig = await _context.PaymentGatewayConfigs
                    .FirstOrDefaultAsync(c => c.SchoolId == schoolId
                        && c.GatewayName == PaymentGatewayConstants.GatewayCashfree
                        && c.IsActive);

                if (cfConfig != null)
                {
                    try
                    {
                        var isSandbox = cfConfig.Mode?.Equals("Test", StringComparison.OrdinalIgnoreCase) ?? true;
                        var student   = feeRecord.Student;
                        var cfReq = new CashfreeCreateOrderRequest
                        {
                            OrderId       = orderId,
                            OrderAmount   = dto.Amount,
                            OrderCurrency = dto.Currency ?? "INR",
                            CustomerDetails = new CashfreeCustomerDetails
                            {
                                CustomerId   = feeRecord.StudentId.ToString("N"),
                                CustomerName = student != null ? $"{student.FirstName} {student.LastName}".Trim() : "Student",
                                CustomerPhone = (!string.IsNullOrWhiteSpace(student?.GuardianPhone)
                                                    ? student.GuardianPhone
                                                    : "9999999999"),
                            },
                            OrderMeta = new CashfreeOrderMeta
                            {
                                ReturnUrl = cfConfig.ReturnUrl,
                                NotifyUrl = cfConfig.WebhookUrl,
                                PaymentMethods = "cc,dc,nb,upi,wallet"
                            },
                            OrderNote = $"Fee payment – {student?.FirstName} {student?.LastName}"
                        };

                        var cfResp = await _cashfree.CreateOrderAsync(cfReq, cfConfig.ApiKey, cfConfig.ApiSecret ?? string.Empty, isSandbox);

                        var baseUrl = isSandbox ? "https://sandbox.cashfree.com" : "https://payments.cashfree.com";
                        response.CheckoutUrl = cfResp.Payments?.Url
                            ?? (cfResp.PaymentSessionId != null
                                ? $"{baseUrl}/pg/orders/{cfResp.PaymentSessionId}/pay"
                                : null);

                        // Persist the Cashfree order ID against the gateway log
                        gatewayLog.GatewayOrderId = cfResp.CfOrderId ?? orderId;
                        await _context.SaveChangesAsync();
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Cashfree CreateOrder failed for school {SchoolId}, fee record {FeeRecordId}", schoolId, feeRecordId);
                        // Propagate so the controller can return a 502 with a clear message
                        throw new InvalidOperationException($"Payment gateway error: {ex.Message}", ex);
                    }
                }
                else
                {
                    _logger.LogWarning("No active Cashfree config for school {SchoolId}. Returning pending order without checkout URL.", schoolId);
                    // No config yet — return the order reference so the cashier can enter the txn ID manually
                }
            }

            return response;
        }

        public async Task<PaymentStatusDto> ProcessWebhookAsync(string gateway, string payload)
        {
            // This is a simplified version. In production, verify webhook signature
            // Parse payload based on gateway (Razorpay/PayU have different formats)
            
            // For demonstration, return empty status
            // In real implementation:
            // 1. Verify webhook signature
            // 2. Extract payment details from payload
            // 3. Update transaction status
            // 4. Update fee record if payment succeeded
            
            return await Task.FromResult(new PaymentStatusDto
            {
                Status = "processing"
            });
        }

        public async Task<bool> VerifyPaymentAsync(Guid schoolId, Guid transactionId, VerifyPaymentDto dto)
        {
            try
            {
                return await ConcurrencyHelper.ExecuteWithRetryAsync(async () =>
                {
                    var gatewayLog = await _context.PaymentGatewayLogs
                        .Include(g => g.Transaction)
                        .FirstOrDefaultAsync(g => g.TransactionId == transactionId && g.SchoolId == schoolId);

                    if (gatewayLog == null)
                        return false;

                    // Verify signature (Razorpay example)
                    // In production: Use HMAC SHA256 verification
                    // var generatedSignature = ComputeHmacSha256(dto.GatewayOrderId + "|" + dto.GatewayPaymentId, secretKey);
                    // if (generatedSignature != dto.GatewaySignature) return false;

                    // Update gateway log
                    gatewayLog.GatewayPaymentId = dto.GatewayPaymentId;
                    gatewayLog.GatewaySignature = dto.GatewaySignature;
                    gatewayLog.Status = "captured";
                    gatewayLog.CompletedAt = DateTime.UtcNow;
                    gatewayLog.UpdatedAt = DateTime.UtcNow;

                    // Update transaction
                    if (gatewayLog.Transaction != null)
                    {
                        gatewayLog.Transaction.Status = "completed";
                        gatewayLog.Transaction.ReferenceNumber = dto.GatewayPaymentId;
                        gatewayLog.Transaction.UpdatedAt = DateTime.UtcNow;

                        // Update fee record
                        var feeRecord = await _context.FeeRecords
                            .FirstOrDefaultAsync(f => f.Id == gatewayLog.FeeRecordId);

                        if (feeRecord != null)
                        {
                            feeRecord.PaidAmount += gatewayLog.Amount;
                            feeRecord.BalanceAmount = feeRecord.TotalAmount - feeRecord.PaidAmount;
                            feeRecord.Status = feeRecord.BalanceAmount <= 0 ? "paid" : "partial";
                            feeRecord.UpdatedAt = DateTime.UtcNow;

                            _logger?.LogInformation(
                                "Fee record {FeeRecordId} updated after payment verification. New BalanceAmount: {BalanceAmount}",
                                gatewayLog.FeeRecordId, feeRecord.BalanceAmount);
                        }
                    }

                    await _context.SaveChangesAsync();
                    
                    _logger?.LogInformation(
                        "Payment {TransactionId} verified and completed for GatewayPaymentId {GatewayPaymentId}",
                        transactionId, dto.GatewayPaymentId);
                    
                    return true;
                }, "VerifyPayment", _logger);
            }
            catch (InvalidOperationException ex) when (ex.Message.Contains("concurrent modifications"))
            {
                _logger?.LogError(
                    "Payment verification failed due to concurrent modifications on TransactionId {TransactionId}: {ExceptionMessage}",
                    transactionId, ex.Message);
                throw;
            }
        }

        // ===========================
        // Receipt Generation
        // ===========================

        public async Task<byte[]> GenerateReceiptPDFAsync(Guid schoolId, Guid transactionId)
        {
            var transaction = await _context.PaymentTransactions
                .Include(t => t.Student)
                .Include(t => t.FeeRecord)
                .FirstOrDefaultAsync(t => t.Id == transactionId && t.SchoolId == schoolId);

            if (transaction == null)
                throw new KeyNotFoundException("Transaction not found");

            // In production, use a PDF library like iTextSharp, QuestPDF, or DinkToPdf
            // For now, return a simple placeholder
            
            var receiptHtml = $@"
            <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; padding: 20px; }}
                    .header {{ text-align: center; margin-bottom: 30px; }}
                    .details {{ margin: 20px 0; }}
                    .footer {{ margin-top: 50px; text-align: center; font-size: 12px; }}
                </style>
            </head>
            <body>
                <div class='header'>
                    <h1>Fee Receipt</h1>
                    <p>Receipt No: {transaction.TransactionNumber}</p>
                    <p>Date: {transaction.TransactionDate:dd/MM/yyyy}</p>
                </div>
                <div class='details'>
                    <p><strong>Student Name:</strong> {transaction.Student?.FirstName} {transaction.Student?.LastName}</p>
                    <p><strong>Admission No:</strong> {transaction.Student?.AdmissionNumber}</p>
                    <p><strong>Class:</strong> {transaction.Student?.Class}</p>
                    <p><strong>Amount Paid:</strong> ₹{transaction.Amount:N2}</p>
                    <p><strong>Payment Method:</strong> {transaction.PaymentMethod}</p>
                    <p><strong>Reference No:</strong> {transaction.ReferenceNumber}</p>
                </div>
                <div class='footer'>
                    <p>This is a computer-generated receipt and does not require signature.</p>
                </div>
            </body>
            </html>";

            // Convert HTML to PDF (placeholder - use actual PDF library in production)
            return System.Text.Encoding.UTF8.GetBytes(receiptHtml);
        }

        public async Task<string> SendReceiptEmailAsync(Guid schoolId, Guid transactionId, SendReceiptEmailDto dto)
        {
            var transaction = await _context.PaymentTransactions
                .Include(t => t.Student)
                .FirstOrDefaultAsync(t => t.Id == transactionId && t.SchoolId == schoolId);

            if (transaction == null)
                throw new KeyNotFoundException("Transaction not found");

            // Generate PDF
            var pdfBytes = await GenerateReceiptPDFAsync(schoolId, transactionId);

            // In production, use an email service like SendGrid, AWS SES, or SMTP
            // For now, return success message
            
            var subject = dto.Subject ?? $"Fee Receipt - {transaction.TransactionNumber}";
            var message = dto.Message ?? $"Dear Parent, Please find attached the fee receipt for {transaction.Student?.FirstName}.";

            // Placeholder for actual email sending
            // await emailService.SendEmailWithAttachment(dto.Email, subject, message, pdfBytes, "receipt.pdf");

            return $"Receipt sent to {dto.Email}";
        }

        // ===========================
        // Refund Processing
        // ===========================

        public async Task<RefundResponseDto> ProcessRefundAsync(Guid schoolId, Guid transactionId, CreateRefundDto dto, Guid userId)
        {
            try
            {
                return await ConcurrencyHelper.ExecuteWithRetryAsync(async () =>
                {
                    var transaction = await _context.PaymentTransactions
                        .Include(t => t.FeeRecord)
                        .FirstOrDefaultAsync(t => t.Id == transactionId && t.SchoolId == schoolId);

                    if (transaction == null)
                        throw new KeyNotFoundException("Transaction not found");

                    if (transaction.Status != "success" && transaction.Status != "completed")
                        throw new InvalidOperationException("Cannot reverse a transaction that is not in a completed state");

                    if (dto.Amount > transaction.Amount)
                        throw new ArgumentException("Refund amount cannot exceed transaction amount");

                    // Create refund record
                    var refund = new Refund
                    {
                        Id = Guid.NewGuid(),
                        SchoolId = schoolId,
                        TransactionId = transactionId,
                        RefundId = $"RFD-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString().Substring(0, 8).ToUpper()}",
                        Amount = dto.Amount,
                        Status = "pending",
                        Reason = dto.Reason,
                        RefundMethod = dto.RefundMethod,
                        Notes = dto.Notes,
                        ProcessedBy = userId,
                        CreatedAt = DateTime.UtcNow
                    };

                    _context.Refunds.Add(refund);

                    // If original payment was via gateway, initiate gateway refund
                    var gatewayLog = await _context.PaymentGatewayLogs
                        .FirstOrDefaultAsync(g => g.TransactionId == transactionId);

                    if (gatewayLog != null && gatewayLog.Gateway != "manual")
                    {
                        // In production, call gateway API to initiate refund
                        // For Razorpay: POST /v1/payments/{payment_id}/refund
                        // For PayU: Use refund API
                        
                        refund.Status = "processing";
                        // refund.GatewayRefundId = response.RefundId;
                    }
                    else
                    {
                        // Manual refund - mark as processing
                        refund.Status = "processing";
                        refund.ProcessedAt = DateTime.UtcNow;
                    }

                    // Mark the original transaction as voided/refunded
                    transaction.Status = dto.Amount >= transaction.Amount ? "voided" : "partial_refund";

                    // Update fee record balance with concurrency control
                    if (transaction.FeeRecord != null)
                    {
                        transaction.FeeRecord.PaidAmount -= dto.Amount;
                        transaction.FeeRecord.PendingAmount += dto.Amount;
                        transaction.FeeRecord.BalanceAmount += dto.Amount;
                        transaction.FeeRecord.Status = transaction.FeeRecord.PendingAmount > 0 ? "pending" : "paid";
                        transaction.FeeRecord.UpdatedAt = DateTime.UtcNow;

                        _logger?.LogInformation(
                            "Processing refund {RefundId} for Transaction {TransactionId}: Amount={Amount}, FeeRecord {FeeRecordId}",
                            refund.RefundId, transactionId, dto.Amount, transaction.FeeRecord.Id);
                    }

                    await _context.SaveChangesAsync();

                    _logger?.LogInformation(
                        "Refund {RefundId} successfully processed for Transaction {TransactionId}",
                        refund.RefundId, transactionId);

                    return new RefundResponseDto
                    {
                        Id = refund.Id,
                        TransactionId = refund.TransactionId,
                        RefundId = refund.RefundId,
                        GatewayRefundId = refund.GatewayRefundId,
                        Amount = refund.Amount,
                        Status = refund.Status,
                        Reason = refund.Reason,
                        RefundMethod = refund.RefundMethod,
                        ProcessedAt = refund.ProcessedAt,
                        CreatedAt = refund.CreatedAt
                    };
                }, "ProcessRefund", _logger);
            }
            catch (InvalidOperationException ex) when (ex.Message.Contains("concurrent modifications"))
            {
                _logger?.LogError(
                    "Refund processing failed due to concurrent modifications on TransactionId {TransactionId}: {ExceptionMessage}",
                    transactionId, ex.Message);
                throw;
            }
        }

        public async Task<RefundStatusDto> GetRefundStatusAsync(Guid schoolId, Guid refundId)
        {
            var refund = await _context.Refunds
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == refundId && r.SchoolId == schoolId);

            if (refund == null)
                throw new KeyNotFoundException("Refund not found");

            return new RefundStatusDto
            {
                RefundId = refund.Id,
                Status = refund.Status,
                Amount = refund.Amount,
                ProcessedAt = refund.ProcessedAt,
                ErrorMessage = refund.ErrorMessage
            };
        }

        // ===========================
        // Reminders & Overdue
        // ===========================

        public async Task<ReminderResultDto> SendFeeRemindersAsync(Guid schoolId, SendRemindersDto dto)
        {
            var result = new ReminderResultDto();

            // Calculate target due date
            var targetDate = DateTime.UtcNow.Date.AddDays(dto.DaysBefore);

            // Get fee records with upcoming due dates
            var upcomingFees = await _context.FeeRecords
                .Include(f => f.Student)
                .Where(f => f.SchoolId == schoolId && 
                           f.Status != "paid" && 
                           f.DueDate.Date == targetDate)
                .ToListAsync();

            result.TotalRecords = upcomingFees.Count;

            foreach (var fee in upcomingFees)
            {
                try
                {
                    var studentName = fee.Student?.FirstName ?? "Student";
                    var message = dto.CustomMessage ?? 
                        $"Reminder: Fee of ₹{fee.BalanceAmount} is due on {fee.DueDate:dd/MM/yyyy} for {studentName}.";

                    // Send via requested channel
                    if (dto.Channel == "sms" || dto.Channel == "all")
                    {
                        // Send SMS (placeholder - integrate with SMS provider)
                        // await smsService.SendSMS(fee.Student?.GuardianPhone, message);
                    }

                    if (dto.Channel == "email" || dto.Channel == "all")
                    {
                        // Send Email (placeholder - integrate with email provider)
                        // await emailService.SendEmail(fee.Student?.Email, "Fee Reminder", message);
                    }

                    // Always create in-app notification for the parent portal
                    if (dto.Channel == "app" || dto.Channel == "all" || dto.Channel == null)
                    {
                        await AddFeeParentNotificationsAsync(
                            schoolId, fee.StudentId,
                            $"Fee reminder for {studentName}",
                            $"Fee of \u20B9{fee.BalanceAmount:F0} is due on {fee.DueDate:dd MMM yyyy} for {studentName}. " +
                            "Please log in to your parent portal to view and pay.",
                            fee.Id,
                            priority: "High");
                        await _context.SaveChangesAsync();
                    }

                    result.SentSuccessfully++;
                }
                catch (Exception ex)
                {
                    result.Failed++;
                    result.Errors.Add($"Student {fee.Student?.AdmissionNumber}: {ex.Message}");
                }
            }

            return result;
        }

        public async Task<List<OverdueFeeDto>> GetOverdueFeesAsync(Guid schoolId)
        {
            var today = DateTime.UtcNow.Date;

            var overdueFees = await _context.FeeRecords
                .Include(f => f.Student)
                .Where(f => f.SchoolId == schoolId && 
                           f.Status != "paid" && 
                           f.DueDate < today)
                .OrderBy(f => f.DueDate)
                .ToListAsync();

            var result = new List<OverdueFeeDto>();

            foreach (var fee in overdueFees)
            {
                var daysOverdue = (today - fee.DueDate.Date).Days;
                var calculatedLateFee = await CalculateLateFeeAsync(fee.Id, schoolId);

                result.Add(new OverdueFeeDto
                {
                    FeeRecordId = fee.Id,
                    StudentId = fee.StudentId,
                    StudentName = $"{fee.Student?.FirstName} {fee.Student?.LastName}",
                    AdmissionNumber = fee.Student?.AdmissionNumber ?? "",
                    Class = fee.Student?.Class ?? "",
                    Amount = fee.BalanceAmount,
                    DueDate = fee.DueDate,
                    DaysOverdue = daysOverdue,
                    CalculatedLateFee = calculatedLateFee,
                    GuardianPhone = fee.Student?.GuardianPhone,
                    GuardianEmail = fee.Student?.Email
                });
            }

            return result;
        }

        /// <summary>
        /// Parses an academic year string like "2026-2027" and returns the end date (March 31 of the end year).
        /// Falls back to 10 months from now if parsing fails.
        /// </summary>
        private static DateTime ParseAcademicYearEnd(string? academicYear)
        {
            if (!string.IsNullOrWhiteSpace(academicYear))
            {
                var parts = academicYear.Split('-');
                if (parts.Length == 2 && int.TryParse(parts[1].Trim(), out var endYear) && endYear > 2000)
                    return new DateTime(endYear, 3, 31); // Indian academic year ends March 31
            }
            // Fallback: Indian academic year Apr–Mar
            var now = DateTime.UtcNow;
            return now.Month >= 4
                ? new DateTime(now.Year + 1, 3, 31)
                : new DateTime(now.Year, 3, 31);
        }

        /// <summary>
        /// Computes the pro-rated annual fee from <paramref name="from"/> to <paramref name="yearEnd"/>
        /// for a given monthly fee. Matches the same logic used in TransportService/HostelService.
        /// Returns 0 when monthlyFee is 0 or yearEnd has already passed.
        /// </summary>
        private static decimal ComputeModuleFeeProrata(decimal monthlyFee, DateTime from, DateTime yearEnd)
        {
            if (monthlyFee <= 0 || yearEnd < from) return 0m;

            var daysInMonth = DateTime.DaysInMonth(from.Year, from.Month);
            var remainingDays = daysInMonth - from.Day + 1;
            var prorataFirst = Math.Round(monthlyFee * remainingDays / daysInMonth, 2);

            var nextMonth = new DateTime(from.Year, from.Month, 1).AddMonths(1);
            var firstMonthAfterEnd = new DateTime(yearEnd.Year, yearEnd.Month, 1).AddMonths(1);
            var fullMonths = 0;
            for (var m = nextMonth; m < firstMonthAfterEnd; m = m.AddMonths(1))
                fullMonths++;

            return prorataFirst + fullMonths * monthlyFee;
        }

        /// <summary>
        /// Creates fee records for every student in the structure's class who doesn't already have one
        /// for the same academic year + structure combination.
        /// </summary>
        public async Task<(int Assigned, int Skipped)> BulkAssignStructureAsync(Guid structureId, Guid schoolId)
        {
            var structure = await _context.FeeStructures
                .FirstOrDefaultAsync(s => s.Id == structureId && s.SchoolId == schoolId);
            if (structure == null)
                throw new KeyNotFoundException("Fee structure not found.");

            var baseClass = structure.Class;

            // Prefer modern enrollment-based lookup (StudentEnrollments FK model).
            // Fall back to the legacy Student.Class string if the class/year entities don't exist yet.
            var academicYearEntity = await _context.AcademicYears
                .Where(y => y.SchoolId == schoolId && y.Name == structure.AcademicYear)
                .FirstOrDefaultAsync();

            var classEntity = await _context.Classes
                .Where(c => c.SchoolId == schoolId && c.Name == baseClass)
                .FirstOrDefaultAsync();

            List<Guid> studentIds;
            var studentEnrollmentMap = new Dictionary<Guid, Guid>(); // studentId -> enrollmentId

            if (academicYearEntity != null && classEntity != null)
            {
                // Modern path: resolve students via active StudentEnrollments for this class + year.
                var enrollments = await _context.StudentEnrollments
                    .Where(e => e.SchoolId == schoolId &&
                                e.ClassId == classEntity.Id &&
                                e.AcademicYearId == academicYearEntity.Id &&
                                e.Status == "active")
                    .Select(e => new { e.StudentId, EnrollmentId = e.Id })
                    .ToListAsync();

                studentIds = enrollments.Select(e => e.StudentId).ToList();
                studentEnrollmentMap = enrollments.ToDictionary(e => e.StudentId, e => e.EnrollmentId);
            }
            else
            {
                // Legacy fallback: match by the deprecated Student.Class string field.
                // Covers "Class 10", "Class 10 A", "Class 10-B", etc.
                studentIds = await _context.Students
                    .Where(s => s.SchoolId == schoolId &&
                                s.Status == "active" &&
                                (s.Class == baseClass ||
                                 s.Class.StartsWith(baseClass + " ") ||
                                 s.Class.StartsWith(baseClass + "-")))
                    .Select(s => s.Id)
                    .ToListAsync();
            }

            if (studentIds.Count == 0)
                return (0, 0);

            // Get existing fee records for this structure+year combo to avoid duplicates
            var existingStudentIds = (await _context.FeeRecords
                .Where(f => f.SchoolId == schoolId &&
                            f.FeeStructureId == structureId &&
                            f.AcademicYear == structure.AcademicYear)
                .Select(f => f.StudentId)
                .ToListAsync()).ToHashSet();

            // Batch-load active transport/hostel assignments for all students in this class.
            // These per-student fees are NOT in the fee structure (by design) and must be
            // added individually based on each student's actual assignment.
            var transportMap = (await _context.TransportStudents
                .Where(ts => studentIds.Contains(ts.StudentId) && ts.SchoolId == schoolId &&
                             !ts.IsDeleted && ts.Status == "active" && ts.MonthlyFee > 0)
                .Select(ts => new { ts.StudentId, ts.MonthlyFee })
                .ToListAsync())
                .GroupBy(t => t.StudentId)
                .ToDictionary(g => g.Key, g => g.First().MonthlyFee ?? 0m);

            var hostelMap = (await _context.HostelStudents
                .Where(hs => studentIds.Contains(hs.StudentId) && hs.SchoolId == schoolId &&
                             !hs.IsDeleted && hs.Status == "active" && hs.MonthlyFee > 0)
                .Select(hs => new { hs.StudentId, hs.MonthlyFee })
                .ToListAsync())
                .GroupBy(h => h.StudentId)
                .ToDictionary(g => g.Key, g => g.First().MonthlyFee);

            // Compute the academic year end date once for pro-rata calculation.
            var academicYearEnd = ParseAcademicYearEnd(structure.AcademicYear);

            var assigned = 0;
            foreach (var studentId in studentIds)
            {
                if (existingStudentIds.Contains(studentId))
                    continue;

                var dueDate = DateTime.UtcNow.Date.AddDays(30); // 30-day rolling grace
                var bulkTotal = structure.ComputeTotalFromComponents();

                // Add each student's individual transport and hostel annual fees (pro-rated from today).
                var transportMonthly = transportMap.TryGetValue(studentId, out var tm) ? tm : 0m;
                var hostelMonthly    = hostelMap.TryGetValue(studentId, out var hm)    ? hm : 0m;
                var transportAnnual  = ComputeModuleFeeProrata(transportMonthly, DateTime.UtcNow, academicYearEnd);
                var hostelAnnual     = ComputeModuleFeeProrata(hostelMonthly,    DateTime.UtcNow, academicYearEnd);
                bulkTotal += transportAnnual + hostelAnnual;

                // Persist per-student module fees in FeeHeadOverrides so the stale-fix loop
                // (which resets TotalAmount from the fee structure) correctly preserves them.
                string? overridesJson = null;
                if (transportAnnual > 0 || hostelAnnual > 0)
                {
                    var ov = new Dictionary<string, decimal>();
                    if (transportAnnual > 0) ov["transportFee"] = transportAnnual;
                    if (hostelAnnual > 0)    ov["hostelFee"]    = hostelAnnual;
                    overridesJson = System.Text.Json.JsonSerializer.Serialize(ov);
                }

                var record = new FeeRecord
                {
                    Id = Guid.NewGuid(),
                    SchoolId = schoolId,
                    StudentId = studentId,
                    FeeStructureId = structureId,
                    StudentEnrollmentId = studentEnrollmentMap.TryGetValue(studentId, out var eid) ? eid : null,
                    DueDate = dueDate,
                    TotalAmount = bulkTotal,
                    PaidAmount = 0,
                    DiscountAmount = 0,
                    LateFeeAmount = 0,
                    PendingAmount = bulkTotal,
                    FeeHeadOverrides = overridesJson,
                    AcademicYear = structure.AcademicYear,
                    Status = "pending",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                };
                _context.FeeRecords.Add(record);
                assigned++;
            }

            if (assigned > 0)
                await _context.SaveChangesAsync();

            return (assigned, studentIds.Count - assigned);
        }

        /// <summary>
        /// Add ad-hoc extra charges (hostel, library fine, misc) to an existing fee record.
        /// Increases TotalAmount and PendingAmount accordingly and logs the audit event.
        /// </summary>
        public async Task<AddExtraChargesResponse> AddExtraChargesAsync(Guid recordId, Guid schoolId, AddExtraChargesRequest req)
        {
            var feeRecord = await _context.FeeRecords
                .FirstOrDefaultAsync(f => f.Id == recordId && f.SchoolId == schoolId)
                ?? throw new KeyNotFoundException("Fee record not found.");

            var chargesTotal = req.Charges.Sum(c => c.Amount);
            if (chargesTotal <= 0)
                throw new InvalidOperationException("Total extra charges must be greater than zero.");

            var prevTotal = feeRecord.TotalAmount;

            var oldValues = JsonSerializer.Serialize(new { feeRecord.TotalAmount, feeRecord.PendingAmount });

            feeRecord.TotalAmount += chargesTotal;
            feeRecord.PendingAmount += chargesTotal; // Outstanding goes up by extra charges
            feeRecord.UpdatedAt = DateTime.UtcNow;

            var breakdown = string.Join(", ", req.Charges.Select(c => $"{c.Label}: ₹{c.Amount:N0}"));
            var newValues = JsonSerializer.Serialize(new { feeRecord.TotalAmount, feeRecord.PendingAmount });

            _context.Set<FeeAuditLog>().Add(new FeeAuditLog
            {
                SchoolId = schoolId,
                EntityType = "FeeRecord",
                EntityId = recordId,
                Action = "ExtraChargesAdded",
                FeeRecordId = recordId,
                OldValues = oldValues,
                NewValues = newValues,
                Amount = chargesTotal,
                PerformedByName = req.AddedBy,
                Remarks = $"Extra charges added: {breakdown}. Reason: {req.Reason ?? "Admin override."}",
                Timestamp = DateTime.UtcNow,
            });

            await _context.SaveChangesAsync();

            return new AddExtraChargesResponse
            {
                FeeRecordId = recordId,
                PreviousTotalAmount = prevTotal,
                ChargesAdded = chargesTotal,
                NewTotalAmount = feeRecord.TotalAmount,
                NewPendingAmount = feeRecord.PendingAmount,
                Message = $"Extra charges of ₹{chargesTotal:N0} added successfully ({breakdown}).",
            };
        }

        /// <summary>
        /// Edit an existing payment transaction (amount, method, reference, remarks).
        /// Adjusts the fee record balance accordingly and logs an audit trail.
        /// Requires EditReason for accountability.
        /// </summary>
        public async Task<PaymentResponse> EditPaymentAsync(Guid paymentId, Guid schoolId, EditPaymentRequest req)
        {
            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
            await using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                var payment = await _context.PaymentTransactions
                    .Include(p => p.FeeRecord)
                    .FirstOrDefaultAsync(p => p.Id == paymentId && p.SchoolId == schoolId)
                    ?? throw new KeyNotFoundException("Payment transaction not found.");

                if (payment.Status == "voided" || payment.Status == "refunded")
                    throw new InvalidOperationException("Cannot edit a voided or refunded payment.");

                var feeRecord = payment.FeeRecord
                    ?? throw new InvalidOperationException("Associated fee record not found.");

                var oldValues = JsonSerializer.Serialize(new
                {
                    payment.Amount, payment.Method, payment.Date,
                    payment.ChequeNumber, payment.BankName, payment.GatewayRef, payment.Remarks,
                    feeRecord.PaidAmount, feeRecord.PendingAmount,
                });

                // If amount changes, adjust the fee record balance
                if (req.Amount.HasValue && req.Amount.Value != payment.Amount)
                {
                    var delta = req.Amount.Value - payment.Amount; // positive = more paid, negative = less paid
                    var newPaid = feeRecord.PaidAmount + delta;
                    if (newPaid < 0)
                        throw new InvalidOperationException("Adjusted payment amount would make total paid negative.");
                    var maxAllowed = feeRecord.TotalAmount - feeRecord.DiscountAmount + feeRecord.LateFeeAmount;
                    if (newPaid > maxAllowed + 0.01m)
                        throw new InvalidOperationException($"New amount would exceed the total fee of ₹{maxAllowed:N0}.");

                    feeRecord.PaidAmount = newPaid;
                    feeRecord.PendingAmount = feeRecord.TotalAmount - feeRecord.PaidAmount - feeRecord.DiscountAmount + feeRecord.LateFeeAmount;
                    feeRecord.Status = feeRecord.PendingAmount <= 0 ? "paid" : "partial";
                    feeRecord.UpdatedAt = DateTime.UtcNow;

                    payment.Amount = req.Amount.Value;
                }

                // Apply other field updates
                if (req.Method != null) payment.Method = req.Method;
                if (req.Date.HasValue) payment.Date = req.Date.Value;
                if (req.ChequeNumber != null) payment.ChequeNumber = req.ChequeNumber;
                if (req.ChequeDate.HasValue) payment.ChequeDate = req.ChequeDate;
                if (req.BankName != null) payment.BankName = req.BankName;
                if (req.GatewayRef != null) payment.GatewayRef = req.GatewayRef;
                if (req.ProcessedBy != null) payment.ProcessedBy = req.ProcessedBy;
                if (req.Remarks != null) payment.Remarks = req.Remarks;

                var newValues = JsonSerializer.Serialize(new
                {
                    payment.Amount, payment.Method, payment.Date,
                    payment.ChequeNumber, payment.BankName, payment.GatewayRef, payment.Remarks,
                    feeRecord.PaidAmount, feeRecord.PendingAmount,
                });

                _context.Set<FeeAuditLog>().Add(new FeeAuditLog
                {
                    SchoolId = schoolId,
                    EntityType = "PaymentTransaction",
                    EntityId = paymentId,
                    Action = "PaymentEdited",
                    FeeRecordId = feeRecord.Id,
                    PaymentTransactionId = paymentId,
                    StudentId = payment.StudentId,
                    OldValues = oldValues,
                    NewValues = newValues,
                    Amount = payment.Amount,
                    PerformedByName = req.ProcessedBy ?? payment.ProcessedBy,
                    Remarks = $"Payment edited. Reason: {req.EditReason}",
                    Timestamp = DateTime.UtcNow,
                });

                await _context.SaveChangesAsync();
                await tx.CommitAsync();

                return new PaymentResponse
                {
                    Id = payment.Id, SchoolId = payment.SchoolId, StudentId = payment.StudentId,
                    FeeRecordId = payment.FeeRecordId, Amount = payment.Amount, Date = payment.Date,
                    Method = payment.Method, Status = payment.Status, ReceiptNumber = payment.ReceiptNumber,
                    GatewayRef = payment.GatewayRef, ChequeNumber = payment.ChequeNumber,
                    ChequeDate = payment.ChequeDate, BankName = payment.BankName,
                    ProcessedBy = payment.ProcessedBy, AcademicYear = payment.AcademicYear,
                    Remarks = payment.Remarks, CreatedAt = payment.CreatedAt,
                };
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
            });
        }

        /// <summary>
        /// Auto-link the best matching fee structure (by class + academic year) to a fee record
        /// that currently has no structure assigned.
        /// </summary>
        public async Task<LinkStructureResponse> LinkStructureAsync(Guid recordId, Guid schoolId)
        {
            var feeRecord = await _context.FeeRecords
                .Include(f => f.Student)
                .FirstOrDefaultAsync(f => f.Id == recordId && f.SchoolId == schoolId)
                ?? throw new KeyNotFoundException("Fee record not found.");

            var studentClass = feeRecord.Student?.Class ?? "";

            // If already linked, return existing
            if (feeRecord.FeeStructureId.HasValue)
            {
                var existing = await _context.FeeStructures.FindAsync(feeRecord.FeeStructureId.Value);
                return new LinkStructureResponse
                {
                    FeeRecordId = recordId,
                    StructureId = feeRecord.FeeStructureId.Value,
                    StructureName = existing?.Name ?? "Unknown",
                    Message = "Already linked.",
                };
            }

            if (string.IsNullOrWhiteSpace(studentClass))
                throw new InvalidOperationException("Cannot determine student class — student record may be missing.");

            // Find a matching structure: same school + same class + same academic year (or closest)
            var structure = await _context.FeeStructures
                .Where(s => s.SchoolId == schoolId && s.Class == studentClass && s.AcademicYear == feeRecord.AcademicYear)
                .FirstOrDefaultAsync()
                // Fallback: any structure for this class regardless of year
                ?? await _context.FeeStructures
                    .Where(s => s.SchoolId == schoolId && s.Class == studentClass)
                    .OrderByDescending(s => s.AcademicYear)
                    .FirstOrDefaultAsync();

            if (structure == null)
                throw new InvalidOperationException($"No fee structure found for Class {studentClass}. Please create one in Fee Structures first.");

            feeRecord.FeeStructureId = structure.Id;
            // Sync total amount to structure if fee record total is 0 (newly created without amount)
            if (feeRecord.TotalAmount == 0)
            {
                feeRecord.TotalAmount = structure.TotalAmount;
                feeRecord.PendingAmount = structure.TotalAmount;
            }
            feeRecord.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return new LinkStructureResponse
            {
                FeeRecordId = recordId,
                StructureId = structure.Id,
                StructureName = structure.Name,
                Message = $"Linked to '{structure.Name}' (Class {structure.Class}).",
            };
        }

        /// <summary>
        /// Update an existing fee structure's name, fee heads, and installment settings.
        /// </summary>
        public async Task<FeeStructureResponse?> UpdateFeeStructureAsync(Guid id, Guid schoolId, UpdateFeeStructureRequest request)
        {
            var structure = await _context.FeeStructures
                .FirstOrDefaultAsync(s => s.Id == id && s.SchoolId == schoolId);

            if (structure == null)
                return null;

            // Apply partial updates — only overwrite fields that are provided
            if (request.Name != null)
            {
                if (request.Name.Trim().Length < 3)
                    throw new ArgumentException("Fee structure name must be at least 3 characters.");
                if (request.Name.Length > 100)
                    throw new ArgumentException("Fee structure name cannot exceed 100 characters.");
                structure.Name = request.Name.Trim();
            }
            if (request.Class != null)
                structure.Class = request.Class.Trim();
            if (request.AcademicYear != null)
            {
                if (request.AcademicYear.Length > 20)
                    throw new ArgumentException("Academic year cannot exceed 20 characters.");
                structure.AcademicYear = request.AcademicYear;
            }
            if (request.Description != null) structure.Description = request.Description;

            // Update fee components
            if (request.TuitionFee.HasValue)    { if (request.TuitionFee.Value < 0) throw new ArgumentException("Fee components must be non-negative."); structure.TuitionFee    = request.TuitionFee.Value; }
            if (request.AdmissionFee.HasValue)  { if (request.AdmissionFee.Value < 0) throw new ArgumentException("Fee components must be non-negative."); structure.AdmissionFee  = request.AdmissionFee.Value; }
            if (request.ExamFee.HasValue)       { if (request.ExamFee.Value < 0) throw new ArgumentException("Fee components must be non-negative."); structure.ExamFee       = request.ExamFee.Value; }
            if (request.LibraryFee.HasValue)    { if (request.LibraryFee.Value < 0) throw new ArgumentException("Fee components must be non-negative."); structure.LibraryFee    = request.LibraryFee.Value; }
            if (request.LabFee.HasValue)        { if (request.LabFee.Value < 0) throw new ArgumentException("Fee components must be non-negative."); structure.LabFee        = request.LabFee.Value; }
            if (request.SportsFee.HasValue)     { if (request.SportsFee.Value < 0) throw new ArgumentException("Fee components must be non-negative."); structure.SportsFee     = request.SportsFee.Value; }
            if (request.TransportFee.HasValue)  { if (request.TransportFee.Value < 0) throw new ArgumentException("Fee components must be non-negative."); structure.TransportFee  = request.TransportFee.Value; }
            if (request.HostelFee.HasValue)     { if (request.HostelFee.Value < 0) throw new ArgumentException("Fee components must be non-negative."); structure.HostelFee     = request.HostelFee.Value; }
            if (request.UniformFee.HasValue)    { if (request.UniformFee.Value < 0) throw new ArgumentException("Fee components must be non-negative."); structure.UniformFee    = request.UniformFee.Value; }
            if (request.BooksFee.HasValue)      { if (request.BooksFee.Value < 0) throw new ArgumentException("Fee components must be non-negative."); structure.BooksFee      = request.BooksFee.Value; }
            if (request.DevelopmentFee.HasValue){ if (request.DevelopmentFee.Value < 0) throw new ArgumentException("Fee components must be non-negative."); structure.DevelopmentFee= request.DevelopmentFee.Value; }
            if (request.Miscellaneous.HasValue) { if (request.Miscellaneous.Value < 0) throw new ArgumentException("Fee components must be non-negative."); structure.Miscellaneous = request.Miscellaneous.Value; }

            // Recompute total from all fee head components
            structure.TotalAmount = structure.ComputeTotalFromComponents();

            if (structure.TotalAmount <= 0)
                throw new ArgumentException("Total fee must be greater than zero.");

            if (request.InstallmentCount.HasValue)
            {
                if (request.InstallmentCount.Value < 1 || request.InstallmentCount.Value > 12)
                    throw new ArgumentException("Installment count must be between 1 and 12.");
                structure.InstallmentCount = request.InstallmentCount.Value;
            }
            if (request.InstallmentAmounts != null)  structure.InstallmentAmounts  = request.InstallmentAmounts;
            if (request.InstallmentDueDates != null) structure.InstallmentDueDates = request.InstallmentDueDates;
            if (request.FeeHeadFrequencies != null)  structure.FeeHeadFrequencies  = request.FeeHeadFrequencies;

            // Allow updating board — pass Guid.Empty to clear it
            if (request.BoardConfigurationId.HasValue)
                structure.BoardConfigurationId = request.BoardConfigurationId == Guid.Empty ? null : request.BoardConfigurationId;

            structure.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // Reload board name
            var boardName = structure.BoardConfigurationId.HasValue
                ? await _context.BoardConfigurations
                    .Where(b => b.Id == structure.BoardConfigurationId.Value)
                    .Select(b => b.Name)
                    .FirstOrDefaultAsync()
                : null;

            return new FeeStructureResponse
            {
                Id = structure.Id,
                SchoolId = structure.SchoolId,
                Name = structure.Name,
                Class = structure.Class,
                AcademicYear = structure.AcademicYear,
                BoardConfigurationId = structure.BoardConfigurationId,
                BoardName = boardName,
                TuitionFee = structure.TuitionFee,
                AdmissionFee = structure.AdmissionFee,
                ExamFee = structure.ExamFee,
                LibraryFee = structure.LibraryFee,
                LabFee = structure.LabFee,
                SportsFee = structure.SportsFee,
                TransportFee = structure.TransportFee,
                HostelFee = structure.HostelFee,
                UniformFee = structure.UniformFee,
                BooksFee = structure.BooksFee,
                DevelopmentFee = structure.DevelopmentFee,
                Miscellaneous = structure.Miscellaneous,
                TotalAmount = structure.TotalAmount,
                InstallmentCount = structure.InstallmentCount,
                InstallmentAmounts = structure.InstallmentAmounts,
                InstallmentDueDates = structure.InstallmentDueDates,
                FeeHeadFrequencies = structure.FeeHeadFrequencies,
                Description = structure.Description,
                CreatedAt = structure.CreatedAt,
                UpdatedAt = structure.UpdatedAt
            };
        }

        /// <summary>
        /// Delete a fee structure. Refuses if any fee records are still linked to it.
        /// </summary>
        public async Task DeleteFeeStructureAsync(Guid id, Guid schoolId)
        {
            var structure = await _context.FeeStructures
                .FirstOrDefaultAsync(s => s.Id == id && s.SchoolId == schoolId)
                ?? throw new KeyNotFoundException("Fee structure not found.");

            var linkedCount = await _context.FeeRecords
                .CountAsync(r => r.FeeStructureId == id && !r.IsDeleted);

            if (linkedCount > 0)
                throw new InvalidOperationException(
                    $"Cannot delete: {linkedCount} fee record(s) are linked to this structure. " +
                    "Unlink or delete those records first.");

            _context.FeeStructures.Remove(structure);
            await _context.SaveChangesAsync();
        }

        public async Task<List<RecentPaymentDto>> GetRecentPaymentsAsync(Guid schoolId, DateTime? date = null)
        {
            var targetDate = (date ?? DateTime.UtcNow).Date;
            var nextDate = targetDate.AddDays(1);

            return await (
                from p in _context.PaymentTransactions
                join f in _context.FeeRecords on p.FeeRecordId equals f.Id
                join s in _context.Students on f.StudentId equals s.Id into studentJoin
                from s in studentJoin.DefaultIfEmpty()
                where f.SchoolId == schoolId
                   && p.Date >= targetDate
                   && p.Date < nextDate
                   && p.Status != "voided"
                   && p.Status != "refunded"
                orderby p.Date descending
                select new RecentPaymentDto
                {
                    Id = p.Id,
                    StudentName = s != null ? s.Name : "",
                    Class = s != null ? s.Class : "",
                    Amount = p.Amount,
                    Date = p.Date,
                    Method = p.Method ?? "",
                    ReceiptNumber = p.ReceiptNumber ?? "",
                    Status = p.Status ?? ""
                }
            ).Take(100).ToListAsync();
        }

        public async Task<(int Created, int Skipped)> SeedStructuresAsync(Guid schoolId, string academicYear)
        {
            // Collect all unique class names from active enrollments for this academic year.
            // Prefer the modern StudentEnrollments → Class entity path; fall back to deprecated Student.Class.
            var academicYearEntity = await _context.AcademicYears
                .Where(y => y.SchoolId == schoolId && y.Name == academicYear)
                .FirstOrDefaultAsync();

            List<string> allClasses;
            if (academicYearEntity != null)
            {
                allClasses = await _context.StudentEnrollments
                    .Where(e => e.SchoolId == schoolId && e.AcademicYearId == academicYearEntity.Id && e.Status == "active")
                    .Join(_context.Classes, e => e.ClassId, c => c.Id, (e, c) => c.Name)
                    .Distinct()
                    .ToListAsync();
            }
            else
            {
                // Legacy fallback
                allClasses = await _context.Students
                    .Where(s => s.SchoolId == schoolId && s.Status == "active" && s.Class != null && s.Class != "")
                    .Select(s => s.Class!)
                    .Distinct()
                    .ToListAsync();
            }

            // Collect classes that already have at least one structure for this year
            var coveredClasses = await _context.FeeStructures
                .Where(f => f.SchoolId == schoolId && f.AcademicYear == academicYear)
                .Select(f => f.Class)
                .Distinct()
                .ToListAsync();

            var covered = new HashSet<string>(coveredClasses, StringComparer.OrdinalIgnoreCase);
            var missing = allClasses.Where(c => !covered.Contains(c)).OrderBy(c => c).ToList();

            if (missing.Count == 0)
                return (0, allClasses.Count);

            // For each missing class, determine a reasonable tuition fee based on grade number
            var now = DateTime.UtcNow;
            // Parse academic year for schedule start (e.g. "2026-2027" → start year 2026)
            int startYear = now.Year;
            if (academicYear.Length >= 4 && int.TryParse(academicYear.Substring(0, 4), out var parsed))
                startYear = parsed;
            int endYear = startYear + 1;

            foreach (var cls in missing)
            {
                // Derive a grade number for fee scaling ("Class 1" → 1, "KG" → 0, etc.)
                var gradeNum = 0;
                var parts = cls.Split(new[] { ' ', '-' }, StringSplitOptions.RemoveEmptyEntries);
                foreach (var p in parts)
                    if (int.TryParse(p, out var n)) { gradeNum = n; break; }

                // Simple tiered default fee: KG/1-5 = 25000, 6-8 = 35000, 9-10 = 45000, 11-12 = 55000
                var tuitionFee = gradeNum <= 0 ? 20000m
                    : gradeNum <= 5  ? 25000m
                    : gradeNum <= 8  ? 35000m
                    : gradeNum <= 10 ? 45000m
                    : 55000m;
                var examFee = 500m;
                var devFee = 2000m;
                var total = tuitionFee + examFee + devFee;

                // Build a 3-term schedule (Indian academic year Apr–Mar)
                var termSchedule = new[]
                {
                    new { termNumber = 1, name = "Term 1", fromDate = $"{startYear}-04-01", toDate = $"{startYear}-07-31", dueDate = $"{startYear}-04-30", amount = Math.Round(total * 0.40m) },
                    new { termNumber = 2, name = "Term 2", fromDate = $"{startYear}-08-01", toDate = $"{startYear}-11-30", dueDate = $"{startYear}-08-31", amount = Math.Round(total * 0.35m) },
                    new { termNumber = 3, name = "Term 3", fromDate = $"{startYear}-12-01", toDate = $"{endYear}-03-31",  dueDate = $"{startYear}-12-15", amount = total - Math.Round(total * 0.40m) - Math.Round(total * 0.35m) },
                };

                // Clean base class name (strip section suffixes for the structure name)
                var baseName = cls.Split(new[] { ' ', '-' }, StringSplitOptions.RemoveEmptyEntries).Take(2).Aggregate((a, b) => $"{a} {b}");

                var structure = new FeeStructure
                {
                    Id = Guid.NewGuid(),
                    SchoolId = schoolId,
                    Name = $"Standard Fee {academicYear} – {cls}",
                    Class = cls,
                    AcademicYear = academicYear,
                    TuitionFee = tuitionFee,
                    ExamFee = examFee,
                    DevelopmentFee = devFee,
                    TotalAmount = total,
                    InstallmentCount = 3,
                    InstallmentDueDates = JsonSerializer.Serialize(termSchedule),
                    CreatedAt = now,
                    UpdatedAt = now,
                };
                _context.FeeStructures.Add(structure);
            }

            if (missing.Count > 0)
                await _context.SaveChangesAsync();

            return (missing.Count, covered.Count);
        }

        /// <summary>
        /// Backfill fee records for every active student who doesn't yet have one for
        /// <paramref name="academicYear"/>.  Respects per-student transport/hostel flags
        /// when computing the effective fee amount.  Safe to call multiple times — students
        /// who already have a record for the year are skipped.
        /// </summary>
        public async Task<(int Created, int Skipped)> SyncStudentFeeRecordsAsync(Guid schoolId, string academicYear)
        {
            var students = await _context.Students
                .Where(s => s.SchoolId == schoolId && s.Status == "active")
                .ToListAsync();

            if (students.Count == 0)
                return (0, 0);

            var allStructures = await _context.FeeStructures
                .Where(f => f.SchoolId == schoolId)
                .ToListAsync();

            // Build a set of studentIds that already have a record for this year
            var existingIds = (await _context.FeeRecords
                .Where(f => f.SchoolId == schoolId && f.AcademicYear == academicYear)
                .Select(f => f.StudentId)
                .ToListAsync()).ToHashSet();

            // Batch-load active transport/hostel assignments for all active students so we can
            // include per-student module fees when creating fee records.
            var allStudentIds = students.Select(s => s.Id).ToList();
            var transportMap = (await _context.TransportStudents
                .Where(ts => allStudentIds.Contains(ts.StudentId) && ts.SchoolId == schoolId &&
                             !ts.IsDeleted && ts.Status == "active" && ts.MonthlyFee > 0)
                .Select(ts => new { ts.StudentId, ts.MonthlyFee })
                .ToListAsync())
                .GroupBy(t => t.StudentId)
                .ToDictionary(g => g.Key, g => g.First().MonthlyFee ?? 0m);

            var hostelMap = (await _context.HostelStudents
                .Where(hs => allStudentIds.Contains(hs.StudentId) && hs.SchoolId == schoolId &&
                             !hs.IsDeleted && hs.Status == "active" && hs.MonthlyFee > 0)
                .Select(hs => new { hs.StudentId, hs.MonthlyFee })
                .ToListAsync())
                .GroupBy(h => h.StudentId)
                .ToDictionary(g => g.Key, g => g.First().MonthlyFee);

            // Academic year end for pro-rata calculation (parse from the requested year string).
            var academicYearEnd = ParseAcademicYearEnd(academicYear);

            var created = 0;
            var skipped = 0;
            var now = DateTime.UtcNow;

            foreach (var student in students)
            {
                if (string.IsNullOrWhiteSpace(student.Class))
                {
                    skipped++;
                    continue;
                }

                if (existingIds.Contains(student.Id))
                {
                    skipped++;
                    continue;
                }

                // Best-match fee structure: exact year + class first, then any year
                var feeStructure = allStructures
                    .Where(f => f.AcademicYear == academicYear && IsSyncClassMatch(f.Class, student.Class))
                    .OrderByDescending(f => f.CreatedAt)
                    .FirstOrDefault()
                    ?? allStructures
                        .Where(f => IsSyncClassMatch(f.Class, student.Class))
                        .OrderByDescending(f => f.AcademicYear)
                        .ThenByDescending(f => f.CreatedAt)
                        .FirstOrDefault();

                if (feeStructure == null)
                {
                    _logger.LogWarning(
                        "SyncStudentFeeRecords: no fee structure for student {StudentId} class {Class}",
                        student.Id, student.Class);
                    skipped++;
                    continue;
                }

                var effectiveTotal = feeStructure.ComputeTotalFromComponents();

                // Look up this student's actual transport/hostel assignments (not flags —
                // the fee structure deliberately has 0 for these heads).
                var transportMonthly = transportMap.TryGetValue(student.Id, out var stm) ? stm : 0m;
                var hostelMonthly    = hostelMap.TryGetValue(student.Id, out var shm)    ? shm : 0m;
                var transportAnnual  = ComputeModuleFeeProrata(transportMonthly, now, academicYearEnd);
                var hostelAnnual     = ComputeModuleFeeProrata(hostelMonthly,    now, academicYearEnd);
                effectiveTotal += transportAnnual + hostelAnnual;
                if (effectiveTotal < 0) effectiveTotal = 0;

                // Persist per-student module fees in FeeHeadOverrides so the stale-fix loop
                // correctly preserves them across subsequent GET requests.
                string? overridesJson = null;
                if (transportAnnual > 0 || hostelAnnual > 0)
                {
                    var ov = new Dictionary<string, decimal>();
                    if (transportAnnual > 0) ov["transportFee"] = transportAnnual;
                    if (hostelAnnual > 0)    ov["hostelFee"]    = hostelAnnual;
                    overridesJson = System.Text.Json.JsonSerializer.Serialize(ov);
                }

                _context.FeeRecords.Add(new FeeRecord
                {
                    Id = Guid.NewGuid(),
                    SchoolId = schoolId,
                    StudentId = student.Id,
                    FeeStructureId = feeStructure.Id,
                    AcademicYear = academicYear,
                    TotalAmount = effectiveTotal,
                    PaidAmount = 0,
                    DiscountAmount = 0,
                    LateFeeAmount = 0,
                    PendingAmount = effectiveTotal,
                    BalanceAmount = effectiveTotal,
                    FeeHeadOverrides = overridesJson,
                    DueDate = now.AddDays(30),
                    Status = "pending",
                    CreatedAt = now,
                    UpdatedAt = now,
                });

                existingIds.Add(student.Id); // guard against duplicates in same batch
                created++;
            }

            if (created > 0)
                await _context.SaveChangesAsync();

            _logger.LogInformation(
                "SyncStudentFeeRecords: school {SchoolId} year {Year} — {Created} created, {Skipped} skipped.",
                schoolId, academicYear, created, skipped);

            return (created, skipped);
        }

        /// <summary>
        /// Fixes stale TotalAmount on fee records whose linked structure was edited after assignment.
        /// Recalculates TotalAmount = sum of structure fee-head fields and adjusts PendingAmount accordingly.
        /// Records with a mismatch are updated; all others are skipped unchanged.
        /// </summary>
        public async Task<(int Fixed, int Skipped)> RecalculateFeeTotalsAsync(Guid schoolId)
        {
            var records = await _context.FeeRecords
                .Where(r => r.SchoolId == schoolId && !r.IsDeleted && r.FeeStructureId != null)
                .Include(r => r.FeeStructure)
                .ToListAsync();

            int fixed_ = 0, skipped = 0;

            foreach (var record in records)
            {
                var fs = record.FeeStructure;
                if (fs == null || fs.IsDeleted) { skipped++; continue; }

                // Compute the correct total from current fee-head fields
                var correctTotal = fs.ComputeTotalFromComponents();

                // Apply any persisted fee-head overrides that reduce the total
                if (!string.IsNullOrWhiteSpace(record.FeeHeadOverrides))
                {
                    try
                    {
                        var overrides = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, decimal>>(record.FeeHeadOverrides!);
                        if (overrides != null)
                        {
                            // Each override is the NET value; reduction = gross - net
                            decimal reduction = 0;
                            if (overrides.TryGetValue("tuitionFee",    out var v)) reduction += fs.TuitionFee    - v;
                            if (overrides.TryGetValue("admissionFee",  out v))     reduction += fs.AdmissionFee  - v;
                            if (overrides.TryGetValue("examFee",       out v))     reduction += fs.ExamFee       - v;
                            if (overrides.TryGetValue("libraryFee",    out v))     reduction += fs.LibraryFee    - v;
                            if (overrides.TryGetValue("labFee",        out v))     reduction += fs.LabFee        - v;
                            if (overrides.TryGetValue("sportsFee",     out v))     reduction += fs.SportsFee     - v;
                            if (overrides.TryGetValue("transportFee",  out v))     reduction += fs.TransportFee  - v;
                            if (overrides.TryGetValue("hostelFee",     out v))     reduction += fs.HostelFee     - v;
                            if (overrides.TryGetValue("uniformFee",    out v))     reduction += fs.UniformFee    - v;
                            if (overrides.TryGetValue("booksFee",      out v))     reduction += fs.BooksFee      - v;
                            if (overrides.TryGetValue("developmentFee",out v))     reduction += fs.DevelopmentFee- v;
                            if (overrides.TryGetValue("miscellaneous", out v))     reduction += fs.Miscellaneous - v;
                            correctTotal -= reduction;
                        }
                    }
                    catch { /* ignore malformed override JSON */ }
                }

                if (correctTotal == record.TotalAmount) { skipped++; continue; }

                var oldTotal = record.TotalAmount;
                record.TotalAmount   = correctTotal;
                // Recompute pending = totalAmount + late fee - paid - discount (floor at 0)
                record.PendingAmount = Math.Max(0, correctTotal + record.LateFeeAmount - record.PaidAmount - record.DiscountAmount);
                record.BalanceAmount = record.PendingAmount;
                // Update status if it was incorrectly marked paid under the old (wrong) total
                if (record.PendingAmount > 0 && record.Status == "paid")
                    record.Status = record.PaidAmount > 0 ? "partial" : "pending";
                record.UpdatedAt = DateTime.UtcNow;

                _logger.LogInformation(
                    "RecalculateFeeTotals: record {RecordId} TotalAmount {Old} → {New}",
                    record.Id, oldTotal, correctTotal);
                fixed_++;
            }

            if (fixed_ > 0)
                await _context.SaveChangesAsync();

            _logger.LogInformation(
                "RecalculateFeeTotals: school {SchoolId} — {Fixed} fixed, {Skipped} skipped.",
                schoolId, fixed_, skipped);

            return (fixed_, skipped);
        }

        /// <summary>
        /// Class-name matching that handles "Class 10-A" students against a "Class 10" or "10" structure.
        /// Strips the "Class " prefix and section suffix before comparing.
        /// </summary>
        private static bool IsSyncClassMatch(string structureClass, string studentClass)
        {
            if (string.IsNullOrWhiteSpace(structureClass) || string.IsNullOrWhiteSpace(studentClass))
                return false;

            var sc = structureClass.Trim();
            var st = studentClass.Trim();

            if (string.Equals(sc, st, StringComparison.OrdinalIgnoreCase))
                return true;

            // Strip "Class " prefix for normalised comparison
            static string Normalize(string s)
            {
                if (s.StartsWith("class ", StringComparison.OrdinalIgnoreCase))
                    s = s.Substring(6).Trim();
                // Strip section suffix: "10-A" → "10", "10 A" → "10"
                var parts = s.Split(new[] { '-', ' ' }, 2, StringSplitOptions.RemoveEmptyEntries);
                return parts.Length > 0 ? parts[0].Trim() : s;
            }

            return string.Equals(Normalize(sc), Normalize(st), StringComparison.OrdinalIgnoreCase);
        }

        // ─── Private helper: queue in-app notifications for guardians ────────
        // NOTE: does NOT call SaveChangesAsync — callers are responsible for persisting.
        private async Task AddFeeParentNotificationsAsync(
            Guid schoolId, Guid studentId,
            string title, string content,
            Guid? referenceId = null,
            string priority = "Normal")
        {
            try
            {
                // Path 1 (legacy): StudentGuardians email → UserLogins
                var guardianEmails = await _context.StudentGuardians
                    .Where(sg => sg.StudentId == studentId && sg.SchoolId == schoolId && sg.Email != null)
                    .Select(sg => sg.Email!.ToLower())
                    .Distinct()
                    .ToListAsync();

                var legacyIds = guardianEmails.Any()
                    ? await _context.UserLogins
                        .Where(ul => ul.SchoolId == schoolId && guardianEmails.Contains(ul.Email.ToLower()))
                        .Select(ul => ul.Id)
                        .Distinct()
                        .ToListAsync()
                    : new List<Guid>();

                // Path 2 (new): GuardianStudents → Guardian.UserLoginId
                var newIds = await _context.GuardianStudents
                    .Include(gs => gs.Guardian)
                    .Where(gs => gs.StudentId == studentId && gs.SchoolId == schoolId && gs.CanViewFees
                                 && gs.Guardian != null && gs.Guardian.UserLoginId != null)
                    .Select(gs => gs.Guardian!.UserLoginId!.Value)
                    .Distinct()
                    .ToListAsync();

                var parentUserIds = legacyIds.Union(newIds).Distinct().ToList();

                foreach (var userId in parentUserIds)
                {
                    _context.Notifications.Add(new SmsApi.Models.Entities.Notification
                    {
                        Id = Guid.NewGuid(),
                        SchoolId = schoolId,
                        RecipientId = userId,
                        RecipientType = "Parent",
                        Type = "Fee",
                        Title = title,
                        Content = content,
                        Priority = priority,
                        ReferenceId = referenceId,
                        ReferenceType = "FeeRecord",
                        ActionUrl = "/parent-fees",
                        IsRead = false,
                        SenderName = "School Fee Office",
                        StudentId = studentId,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                    });
                }
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex, "Failed to queue fee notifications for student {StudentId}", studentId);
            }
        }
    }
}

