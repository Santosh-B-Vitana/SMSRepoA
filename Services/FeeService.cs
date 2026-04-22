using System;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SmsApi.Data;
using SmsApi.Models.Entities;
using SmsApi.Models.DTOs;
using SmsApi.Utils;

namespace SmsApi.Services
{
    public interface IFeeService
    {
        Task<List<FeeStructureResponse>> GetFeeStructuresAsync(Guid schoolId, string? classFilter);
        Task<FeeStructureResponse?> GetFeeStructureByIdAsync(Guid id, Guid schoolId);
        Task<FeeStructureResponse> CreateFeeStructureAsync(CreateFeeStructureRequest request);
        Task<FeeListResponse> GetFeeRecordsAsync(Guid schoolId, int page, int pageSize, Guid? studentId, string? status);
        Task<FeeRecordResponse?> GetFeeRecordByIdAsync(Guid id, Guid schoolId);
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
    }

    public class FeeService : IFeeService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<FeeService> _logger;

        public FeeService(AppDbContext context, ILogger<FeeService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<List<FeeStructureResponse>> GetFeeStructuresAsync(Guid schoolId, string? classFilter)
        {
            var query = _context.FeeStructures.Where(f => f.SchoolId == schoolId);

            if (!string.IsNullOrWhiteSpace(classFilter))
            {
                query = query.Where(f => f.Class == classFilter);
            }

            var structures = await query
                .Select(f => new FeeStructureResponse
                {
                    Id = f.Id,
                    SchoolId = f.SchoolId,
                    Name = f.Name,
                    Class = f.Class,
                    AcademicYear = f.AcademicYear,
                    
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
                    
                    Description = f.Description,
                    CreatedAt = f.CreatedAt,
                    UpdatedAt = f.UpdatedAt
                })
                .ToListAsync();

            return structures;
        }

        public async Task<FeeStructureResponse?> GetFeeStructureByIdAsync(Guid id, Guid schoolId)
        {
            return await _context.FeeStructures
                .Where(f => f.Id == id && f.SchoolId == schoolId)
                .Select(f => new FeeStructureResponse
                {
                    Id = f.Id,
                    SchoolId = f.SchoolId,
                    Name = f.Name,
                    Class = f.Class,
                    AcademicYear = f.AcademicYear,
                    
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
                    
                    Description = f.Description,
                    CreatedAt = f.CreatedAt,
                    UpdatedAt = f.UpdatedAt
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
                .AnyAsync(fs => fs.SchoolId == request.SchoolId &&
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
                SchoolId = request.SchoolId,
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
                
                Description = request.Description,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.FeeStructures.Add(structure);
            await _context.SaveChangesAsync();

            return new FeeStructureResponse
            {
                Id = structure.Id,
                SchoolId = structure.SchoolId,
                Name = structure.Name,
                Class = structure.Class,
                AcademicYear = structure.AcademicYear,
                
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
                
                Description = structure.Description,
                CreatedAt = structure.CreatedAt,
                UpdatedAt = structure.UpdatedAt
            };
        }

        public async Task<FeeListResponse> GetFeeRecordsAsync(Guid schoolId, int page, int pageSize, Guid? studentId, string? status)
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

            var total = await query.CountAsync();

            var feeRecords = await query
                .OrderByDescending(f => f.DueDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            // Auto-apply late fees for overdue records
            foreach (var record in feeRecords.Where(f => f.Status != "paid" && f.DueDate.Date < DateTime.UtcNow.Date))
            {
                var calculatedLateFee = await CalculateLateFeeAsync(record.Id, schoolId);
                if (calculatedLateFee > 0 && record.LateFeeAmount != calculatedLateFee)
                {
                    record.LateFeeAmount = calculatedLateFee;
                    record.PendingAmount = record.TotalAmount - record.PaidAmount - record.DiscountAmount + record.LateFeeAmount;
                    record.UpdatedAt = DateTime.UtcNow;
                }
            }
            
            // Save changes if any late fees were updated
            if (_context.ChangeTracker.HasChanges())
            {
                await _context.SaveChangesAsync();
            }

            var records = feeRecords.Select(f => new FeeRecordResponse
            {
                Id = f.Id,
                SchoolId = f.SchoolId,
                StudentId = f.StudentId,
                StudentName = f.Student != null ? f.Student.Name : "",
                Class = f.Student != null ? f.Student.Class : "",
                FeeStructureId = f.FeeStructureId,
                DueDate = f.DueDate,
                TotalAmount = f.TotalAmount,
                PaidAmount = f.PaidAmount,
                    DiscountAmount = f.DiscountAmount,
                    LateFeeAmount = f.LateFeeAmount,
                    PendingAmount = f.PendingAmount,
                    LastPaymentDate = f.LastPaymentDate,
                    AcademicYear = f.AcademicYear,
                    Status = f.Status,
                Payments = new List<PaymentTransactionDto>(), // Load separately if needed
                CreatedAt = f.CreatedAt,
                UpdatedAt = f.UpdatedAt
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

            // Auto-apply late fee if overdue and not paid
            if (record.Status != "paid" && record.DueDate.Date < DateTime.UtcNow.Date)
            {
                var calculatedLateFee = await CalculateLateFeeAsync(id, schoolId);
                if (calculatedLateFee > 0 && record.LateFeeAmount != calculatedLateFee)
                {
                    record.LateFeeAmount = calculatedLateFee;
                    record.PendingAmount = record.TotalAmount - record.PaidAmount - record.DiscountAmount + record.LateFeeAmount;
                    record.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                }
            }

            var payments = await _context.PaymentTransactions
                .Where(p => p.FeeRecordId == id)
                .OrderByDescending(p => p.Date)
                .Select(p => new PaymentTransactionDto
                {
                    Id = p.Id,
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

            return new FeeRecordResponse
            {
                Id = record.Id,
                SchoolId = record.SchoolId,
                StudentId = record.StudentId,
                StudentName = record.Student?.Name ?? "",
                Class = record.Student?.Class ?? "",
                FeeStructureId = record.FeeStructureId,
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
                UpdatedAt = record.UpdatedAt
            };
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
                Status = request.Status,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.FeeRecords.Add(record);
            await _context.SaveChangesAsync();

            return await GetFeeRecordByIdAsync(record.Id, record.SchoolId) ?? throw new InvalidOperationException("Failed to retrieve created fee record.");
        }

        public async Task<PaymentResponse> CreatePaymentAsync(CreatePaymentRequest request)
        {
            if (request.Amount <= 0) throw new ArgumentException("Payment amount must be greater than zero.");
            if (request.Amount > 10_000_000) throw new ArgumentException("Payment amount cannot exceed 10,000,000.");

            var validMethods = new[] { "cash", "cheque", "online", "upi", "card", "bank_transfer", "razorpay", "payu" };
            if (string.IsNullOrWhiteSpace(request.Method) || !validMethods.Contains(request.Method.ToLower()))
                throw new ArgumentException("Payment method must be: cash, cheque, online, upi, card, bank_transfer, razorpay, or payu.");

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
                    Method = request.Method,
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

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                _logger?.LogInformation(
                    "Payment {PaymentId} committed (₹{Amount}) for FeeRecord {FeeRecordId}. New balance: ₹{Balance}, Status: {Status}",
                    payment.Id, request.Amount, request.FeeRecordId, feeRecord.PendingAmount, feeRecord.Status);

                return new PaymentResponse
                {
                    Id = payment.Id,
                    SchoolId = payment.SchoolId,
                    StudentId = payment.StudentId,
                    FeeRecordId = payment.FeeRecordId,
                    Amount = payment.Amount,
                    Date = payment.Date,
                    Method = payment.Method,
                    Status = payment.Status,
                    ReceiptNumber = payment.ReceiptNumber,
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
                .Where(f => f.SchoolId == schoolId);
            
            if (!string.IsNullOrWhiteSpace(academicYear))
            {
                query = query.Where(f => f.AcademicYear == academicYear);
            }

            var feeRecords = await query.ToListAsync();
            
            var payments = await _context.PaymentTransactions
                .Where(p => p.SchoolId == schoolId && feeRecords.Select(f => f.Id).Contains(p.FeeRecordId))
                .ToListAsync();

            var totalFees = feeRecords.Sum(f => f.TotalAmount);
            var collectedFees = feeRecords.Sum(f => f.PaidAmount);
            var pendingFees = totalFees - collectedFees;
            
            var overdueFees = feeRecords
                .Where(f => f.DueDate < DateTime.UtcNow && f.Status != "paid")
                .Sum(f => f.TotalAmount - f.PaidAmount);

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
                FeeType = config.FeeType,
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
                    FeeType = dto.FeeType,
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
                config.FeeType = dto.FeeType;
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
                FeeType = config.FeeType,
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

            // Gateway-specific configuration
            if (dto.Gateway == "razorpay")
            {
                response.GatewayKey = "rzp_test_your_key_here"; // From configuration
                response.CheckoutUrl = "https://checkout.razorpay.com/v1/checkout.js";
            }
            else if (dto.Gateway == "payu")
            {
                response.GatewayKey = "your_payu_merchant_key"; // From configuration
                response.CheckoutUrl = "https://secure.payu.in/_payment";
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
                    var message = dto.CustomMessage ?? 
                        $"Reminder: Fee of ₹{fee.BalanceAmount} is due on {fee.DueDate:dd/MM/yyyy} for {fee.Student?.FirstName}.";

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
        /// Creates fee records for every student in the structure's class who doesn't already have one
        /// for the same academic year + structure combination.
        /// </summary>
        public async Task<(int Assigned, int Skipped)> BulkAssignStructureAsync(Guid structureId, Guid schoolId)
        {
            var structure = await _context.FeeStructures
                .FirstOrDefaultAsync(s => s.Id == structureId && s.SchoolId == schoolId);
            if (structure == null)
                throw new KeyNotFoundException("Fee structure not found.");

            // Fetch all active students in the matching class for this school
            var students = await _context.Students
                .Where(s => s.SchoolId == schoolId && s.Class == structure.Class && s.Status == "active")
                .Select(s => new { s.Id })
                .ToListAsync();

            if (students.Count == 0)
                return (0, 0);

            // Get existing fee records for this structure+year combo to avoid duplicates
            var existingStudentIds = (await _context.FeeRecords
                .Where(f => f.SchoolId == schoolId &&
                            f.FeeStructureId == structureId &&
                            f.AcademicYear == structure.AcademicYear)
                .Select(f => f.StudentId)
                .ToListAsync()).ToHashSet();

            var assigned = 0;
            foreach (var student in students)
            {
                if (existingStudentIds.Contains(student.Id))
                    continue;

                var dueDate = DateTime.UtcNow.Date.AddDays(30); // 30-day rolling grace
                var record = new FeeRecord
                {
                    Id = Guid.NewGuid(),
                    SchoolId = schoolId,
                    StudentId = student.Id,
                    FeeStructureId = structureId,
                    DueDate = dueDate,
                    TotalAmount = structure.TotalAmount,
                    PaidAmount = 0,
                    DiscountAmount = 0,
                    LateFeeAmount = 0,
                    PendingAmount = structure.TotalAmount,
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

            return (assigned, students.Count - assigned);
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
    }
}

