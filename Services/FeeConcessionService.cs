using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;

namespace SmsApi.Services
{
    public interface IFeeConcessionService
    {
        Task<ConcessionTypeListResponse> GetConcessionTypesAsync(Guid schoolId);
        Task<ConcessionTypeResponse> GetConcessionTypeByIdAsync(Guid id, Guid schoolId);
        Task<ConcessionTypeResponse> CreateConcessionTypeAsync(CreateConcessionTypeRequest request);
        Task<ConcessionTypeResponse> UpdateConcessionTypeAsync(Guid id, UpdateConcessionTypeRequest request, Guid schoolId);
        Task DeleteConcessionTypeAsync(Guid id, Guid schoolId);
        Task<FeeConcessionListResponse> GetConcessionsAsync(Guid schoolId, int page, int pageSize, Guid? studentId = null, string? status = null);
        Task<FeeConcessionResponse> GetConcessionByIdAsync(Guid id, Guid schoolId);
        Task<FeeConcessionResponse> CreateConcessionAsync(CreateFeeConcessionRequest request);
        Task<FeeConcessionResponse> ApproveConcessionAsync(Guid id, ApproveFeeConcessionRequest request, Guid schoolId);
        Task<FeeConcessionResponse> RejectConcessionAsync(Guid id, RejectFeeConcessionRequest request, Guid schoolId);
        Task<FeeConcessionResponse> RevokeFeeConcessionAsync(Guid id, string reason, Guid schoolId);
        Task<FeeConcessionListResponse> GetConcessionsForSchoolAsync(Guid schoolId, Guid? studentId, string? status, int page, int pageSize);
    }

    public class FeeConcessionService : IFeeConcessionService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<FeeConcessionService> _logger;

        public FeeConcessionService(AppDbContext context, ILogger<FeeConcessionService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<ConcessionTypeListResponse> GetConcessionTypesAsync(Guid schoolId)
        {
            var types = await _context.ConcessionTypes
                .Where(ct => ct.SchoolId == schoolId)
                .OrderBy(ct => ct.Name)
                .ToListAsync();

            return new ConcessionTypeListResponse
            {
                ConcessionTypes = types.Select(MapToConcessionTypeResponse).ToList(),
                Total = types.Count
            };
        }

        public async Task<ConcessionTypeResponse> GetConcessionTypeByIdAsync(Guid id, Guid schoolId)
        {
            var type = await _context.ConcessionTypes
                .FirstOrDefaultAsync(ct => ct.Id == id && ct.SchoolId == schoolId);

            if (type == null)
                throw new KeyNotFoundException("Concession type not found");

            return MapToConcessionTypeResponse(type);
        }

        public async Task<ConcessionTypeResponse> CreateConcessionTypeAsync(CreateConcessionTypeRequest request)
        {
            // VALIDATION: Name required and length
            if (string.IsNullOrWhiteSpace(request.Name) || request.Name.Trim().Length < 3)
                throw new ArgumentException("Concession type name must be at least 3 characters.");
            if (request.Name.Length > 100)
                throw new ArgumentException("Concession type name cannot exceed 100 characters.");

            // VALIDATION: DiscountType must be valid
            var validDiscountTypes = new[] { "Percentage", "FixedAmount", "percentage", "fixedamount", "fixed_amount" };
            if (string.IsNullOrWhiteSpace(request.DiscountType) || !validDiscountTypes.Contains(request.DiscountType))
                throw new ArgumentException("Discount type must be 'Percentage' or 'FixedAmount'.");

            // VALIDATION: DiscountValue must be positive
            if (request.DiscountValue <= 0)
                throw new ArgumentException("Discount value must be greater than zero.");
            if (request.DiscountType.ToLower().Contains("percentage") && request.DiscountValue > 100)
                throw new ArgumentException("Percentage discount cannot exceed 100%.");

            // VALIDATION: MaxDiscountAmount
            if (request.MaxDiscountAmount.HasValue && request.MaxDiscountAmount.Value <= 0)
                throw new ArgumentException("Max discount amount must be greater than zero.");

            // VALIDATION: ValidFrom/ValidTo
            if (request.ValidFrom.HasValue && request.ValidTo.HasValue && request.ValidTo.Value < request.ValidFrom.Value)
                throw new ArgumentException("Valid-to date cannot be before valid-from date.");

            // VALIDATION: Duplicate check — use IgnoreQueryFilters so soft-deleted records are included,
            // preventing a unique-index violation on the (SchoolId, Name) composite key.
            var duplicate = await _context.ConcessionTypes
                .IgnoreQueryFilters()
                .AnyAsync(ct => ct.SchoolId == request.SchoolId && ct.Name == request.Name);
            if (duplicate)
                throw new InvalidOperationException("A concession type with this name already exists.");

            var type = new ConcessionType
            {
                Id = Guid.NewGuid(),
                SchoolId = request.SchoolId,
                Name = request.Name,
                Description = request.Description,
                DiscountType = request.DiscountType,
                DiscountValue = request.DiscountValue,
                MaxDiscountAmount = request.MaxDiscountAmount,
                ApplicableFor = request.ApplicableFor,
                RequiresDocuments = request.RequiresDocuments,
                RequiresApproval = request.RequiresApproval,
                ValidFrom = request.ValidFrom,
                ValidTo = request.ValidTo,
                CreatedAt = DateTime.UtcNow
            };

            _context.ConcessionTypes.Add(type);
            await _context.SaveChangesAsync();

            return MapToConcessionTypeResponse(type);
        }

        public async Task<ConcessionTypeResponse> UpdateConcessionTypeAsync(Guid id, UpdateConcessionTypeRequest request, Guid schoolId)
        {
            var type = await _context.ConcessionTypes
                .FirstOrDefaultAsync(ct => ct.Id == id && ct.SchoolId == schoolId);

            if (type == null)
                throw new KeyNotFoundException("Concession type not found");

            type.Description = request.Description;
            type.DiscountValue = request.DiscountValue;
            type.MaxDiscountAmount = request.MaxDiscountAmount;
            type.RequiresDocuments = request.RequiresDocuments;
            type.RequiresApproval = request.RequiresApproval;
            type.ValidFrom = request.ValidFrom;
            type.ValidTo = request.ValidTo;
            type.IsActive = request.IsActive;
            type.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return MapToConcessionTypeResponse(type);
        }

        public async Task DeleteConcessionTypeAsync(Guid id, Guid schoolId)
        {
            var type = await _context.ConcessionTypes
                .FirstOrDefaultAsync(ct => ct.Id == id && ct.SchoolId == schoolId);

            if (type == null)
                throw new KeyNotFoundException("Concession type not found");

            var hasActiveConcessions = await _context.FeeConcessions
                .AnyAsync(fc => fc.ConcessionTypeId == id && fc.Status != "Expired");

            if (hasActiveConcessions)
                throw new InvalidOperationException("Cannot delete concession type with active concessions");

            _context.ConcessionTypes.Remove(type);
            await _context.SaveChangesAsync();
        }

        public async Task<FeeConcessionListResponse> GetConcessionsAsync(Guid schoolId, int page, int pageSize, Guid? studentId = null, string? status = null)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 20;
            if (pageSize > 100) pageSize = 100;

            var query = _context.FeeConcessions
                .Include(fc => fc.ConcessionType)
                .Where(fc => fc.SchoolId == schoolId);

            if (studentId.HasValue)
                query = query.Where(fc => fc.StudentId == studentId.Value);

            if (!string.IsNullOrEmpty(status))
                query = query.Where(fc => fc.Status == status);

            var total = await query.CountAsync();
            var concessions = await query
                .OrderByDescending(fc => fc.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new FeeConcessionListResponse
            {
                Concessions = concessions.Select(MapToFeeConcessionResponse).ToList(),
                Total = total,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<FeeConcessionResponse> GetConcessionByIdAsync(Guid id, Guid schoolId)
        {
            var concession = await _context.FeeConcessions
                .Include(fc => fc.ConcessionType)
                .FirstOrDefaultAsync(fc => fc.Id == id && fc.SchoolId == schoolId);

            if (concession == null)
                throw new KeyNotFoundException("Concession not found");

            return MapToFeeConcessionResponse(concession);
        }

        public async Task<FeeConcessionResponse> CreateConcessionAsync(CreateFeeConcessionRequest request)
        {
            // VALIDATION: AcademicYear required
            if (string.IsNullOrWhiteSpace(request.AcademicYear))
                throw new ArgumentException("Academic year is required.");

            // VALIDATION: Reason required
            if (string.IsNullOrWhiteSpace(request.Reason))
                throw new ArgumentException("Reason for concession is required.");
            if (request.Reason.Length > 500)
                throw new ArgumentException("Reason cannot exceed 500 characters.");

            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // ===== VALIDATION 1: Concession Type Exists & Valid =====
                var concessionType = await _context.ConcessionTypes
                    .FirstOrDefaultAsync(ct => ct.Id == request.ConcessionTypeId && ct.SchoolId == request.SchoolId);

                if (concessionType == null)
                    throw new KeyNotFoundException("Concession type not found");

                _logger.LogInformation($"Concession Type validated: {concessionType.Name}");

                // ===== VALIDATION 2: Student Exists & Enrolled =====
                var student = await _context.Students
                    .FirstOrDefaultAsync(s => s.Id == request.StudentId && s.SchoolId == request.SchoolId);

                if (student == null)
                    throw new KeyNotFoundException("Student not found or not in this school");

                if (!string.Equals(student.Status, "Active", StringComparison.OrdinalIgnoreCase) 
                    && !string.Equals(student.Status, "Enrolled", StringComparison.OrdinalIgnoreCase))
                    throw new InvalidOperationException($"Cannot grant concession to {student.Status} student");

                _logger.LogInformation($"Student validated: {student.Name} (Status: {student.Status})");

                // ===== VALIDATION 3: No Duplicate Active Concessions =====
                var existingConcessions = await _context.FeeConcessions
                    .Where(fc => fc.StudentId == request.StudentId 
                        && fc.SchoolId == request.SchoolId
                        && fc.AcademicYear == request.AcademicYear
                        && (fc.Status == "Pending" || fc.Status == "Approved"))
                    .ToListAsync();

                if (existingConcessions.Any(ec => ec.ConcessionTypeId == request.ConcessionTypeId))
                    throw new InvalidOperationException($"Student already has an active {concessionType.Name} concession for {request.AcademicYear}");

                _logger.LogInformation($"No duplicate concessions found. Existing: {existingConcessions.Count}");

                // ===== VALIDATION 4: Concession Type is Valid for Academic Year =====
                if (concessionType.ValidFrom.HasValue && DateTime.UtcNow < concessionType.ValidFrom)
                    throw new InvalidOperationException($"Concession type not yet valid (starts {concessionType.ValidFrom:yyyy-MM-dd})");

                if (concessionType.ValidTo.HasValue && DateTime.UtcNow > concessionType.ValidTo)
                    throw new InvalidOperationException($"Concession type has expired (ended {concessionType.ValidTo:yyyy-MM-dd})");

                _logger.LogInformation($"Concession type date validation passed");

                // ===== VALIDATION 5: Document Requirements =====
                if (concessionType.RequiresDocuments && (request.DocumentUrls == null || request.DocumentUrls.Count == 0))
                    throw new InvalidOperationException($"Concession type '{concessionType.Name}' requires supporting documents");

                _logger.LogInformation($"Document requirements met: {request.DocumentUrls?.Count ?? 0} docs");

                // ===== VALIDATION 6: Eligibility Criteria Check Based on Type =====
                await ValidateConcessionEligibility(student, concessionType, request);

                // ===== VALIDATION 7: Applied Amount Validation =====
                if (request.AppliedAmount <= 0)
                    throw new InvalidOperationException("Applied amount must be greater than 0");

                // Get student's total fee to validate concession amount doesn't exceed
                var studentFees = await _context.FeeRecords
                    .Where(f => f.StudentId == request.StudentId)
                    .ToListAsync();

                var totalFee = studentFees.Sum(f => f.TotalAmount);
                
                // Calculate max concession allowed
                decimal maxConcessionAllowed = totalFee;
                if (concessionType.MaxDiscountAmount.HasValue)
                    maxConcessionAllowed = Math.Min(totalFee, (decimal)concessionType.MaxDiscountAmount.Value);

                if (request.AppliedAmount > maxConcessionAllowed)
                    throw new InvalidOperationException($"Applied amount (₹{request.AppliedAmount}) exceeds maximum allowed (₹{maxConcessionAllowed})");

                _logger.LogInformation($"Amount validation passed: Applied={request.AppliedAmount}, Max={maxConcessionAllowed}, Total Fee={totalFee}");

                // ===== VALIDATION 8: Check Concession Stacking Limits =====
                var totalApprovedConcessions = existingConcessions
                    .Where(ec => ec.Status == "Approved")
                    .Sum(ec => ec.ApprovedAmount);

                decimal maxStackingAllowed = totalFee * 0.75m; // Max 75% concession when combined
                if (totalApprovedConcessions + request.AppliedAmount > maxStackingAllowed)
                    throw new InvalidOperationException($"Total concessions (₹{totalApprovedConcessions + request.AppliedAmount}) exceeds maximum allowed (₹{maxStackingAllowed})");

                _logger.LogInformation($"Stacking validation passed: Total existing={totalApprovedConcessions}, New={request.AppliedAmount}");

                // ===== CREATE CONCESSION RECORD =====
                var concessionNumber = $"CON-{DateTime.UtcNow:yyyyMMddHHmmss}";

                var concession = new FeeConcession
                {
                    Id = Guid.NewGuid(),
                    SchoolId = request.SchoolId,
                    ConcessionNumber = concessionNumber,
                    StudentId = request.StudentId,
                    ConcessionTypeId = request.ConcessionTypeId,
                    AcademicYear = request.AcademicYear,
                    Reason = request.Reason,
                    DocumentUrls = request.DocumentUrls != null ? string.Join(",", request.DocumentUrls) : null,
                    AppliedAmount = request.AppliedAmount,
                    Status = concessionType.RequiresApproval ? "Pending" : "Approved",
                    ValidFrom = request.ValidFrom,
                    ValidTo = request.ValidTo,
                    CreatedAt = DateTime.UtcNow
                };

                _context.FeeConcessions.Add(concession);
                await _context.SaveChangesAsync();

                // If auto-approved (RequiresApproval = false), update FeeRecord.DiscountAmount immediately
                if (concession.Status == "Approved")
                {
                    concession.ApprovedAmount = request.AppliedAmount;
                    var feeRecord = await _context.FeeRecords
                        .FirstOrDefaultAsync(f => f.StudentId == request.StudentId
                            && f.AcademicYear == request.AcademicYear
                            && f.SchoolId == request.SchoolId);
                    if (feeRecord != null)
                    {
                        feeRecord.DiscountAmount += request.AppliedAmount;
                        feeRecord.PendingAmount = Math.Max(0, feeRecord.TotalAmount + feeRecord.LateFeeAmount - feeRecord.PaidAmount - feeRecord.DiscountAmount);
                        if (feeRecord.PendingAmount <= 0) feeRecord.Status = "paid";
                        feeRecord.UpdatedAt = DateTime.UtcNow;
                    }
                    await _context.SaveChangesAsync();
                }

                _logger.LogInformation($"✓ Concession created: {concessionNumber} | Student: {student.Name} | Type: {concessionType.Name} | Amount: ₹{request.AppliedAmount} | Status: {concession.Status}");

                // Reload with navigation properties
                concession = await _context.FeeConcessions
                    .Include(fc => fc.ConcessionType)
                    .FirstAsync(fc => fc.Id == concession.Id);

                await transaction.CommitAsync();
                return MapToFeeConcessionResponse(concession);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError($"✗ Concession creation failed: {ex.Message}");
                throw;
            }
            });
        }

        // ===== NEW METHOD: Eligibility Validation by Type =====
        private async Task ValidateConcessionEligibility(Student student, ConcessionType concessionType, CreateFeeConcessionRequest request)
        {
            var concessionTypeLower = concessionType.ApplicableFor?.ToLower() ?? "";

            if (concessionTypeLower.Contains("merit"))
            {
                // ===== MERIT-BASED: Average marks >= 80% =====
                var studentResults = await _context.ExamResults
                    .Where(r => r.StudentId == student.Id)
                    .ToListAsync();

                if (!studentResults.Any())
                    throw new InvalidOperationException("No exam results found for merit-based concession eligibility");

                var averagePercentage = studentResults.Any() ? studentResults.Average(r => (decimal)r.MarksObtained / r.TotalMarks * 100) : 0;

                if (averagePercentage < 80)
                    throw new InvalidOperationException($"Merit-based concession requires average marks >= 80% (Current: {averagePercentage:F2}%)");

                _logger.LogInformation($"Merit validation passed: Average = {averagePercentage:F2}%");
            }
            else if (concessionTypeLower.Contains("sports"))
            {
                // ===== SPORTS: Check if student in sports team =====
                // This would require a sports entity - assume it exists
                var studentId = student.Id;
                _logger.LogInformation($"Sports eligibility check (would require sports entity)");
            }
            else if (concessionTypeLower.Contains("need") || concessionTypeLower.Contains("financial"))
            {
                // ===== NEED-BASED: Documents should validate income =====
                if (request.DocumentUrls == null || request.DocumentUrls.Count == 0)
                    throw new InvalidOperationException("Need-based concession requires income verification documents");

                _logger.LogInformation($"Financial need validation passed: Documents provided");
            }
            else if (concessionTypeLower.Contains("sibling"))
            {
                // ===== SIBLING: Check if sibling already in school with concession =====
                // Would require family linking - assume Parent ID or similar exists
                _logger.LogInformation($"Sibling concession validation (would require family linking)");
            }
        }

        public async Task<FeeConcessionResponse> ApproveConcessionAsync(Guid id, ApproveFeeConcessionRequest request, Guid schoolId)
        {
            // VALIDATION: ApprovedAmount must be positive
            if (request.ApprovedAmount <= 0)
                throw new ArgumentException("Approved amount must be greater than zero.");

            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var concession = await _context.FeeConcessions
                    .Include(fc => fc.ConcessionType)
                    .FirstOrDefaultAsync(fc => fc.Id == id && fc.SchoolId == schoolId);

                if (concession == null)
                    throw new KeyNotFoundException("Concession not found");

                // ===== VALIDATION 1: Only Pending concessions can be approved =====
                if (concession.Status != "Pending")
                    throw new InvalidOperationException($"Only pending concessions can be approved (Current: {concession.Status})");

                _logger.LogInformation($"Concession status check passed: {concession.ConcessionNumber}");

                // ===== VALIDATION 2: Approved amount <= Applied amount =====
                if (request.ApprovedAmount > concession.AppliedAmount)
                    throw new InvalidOperationException($"Approved amount (₹{request.ApprovedAmount}) cannot exceed applied amount (₹{concession.AppliedAmount})");

                _logger.LogInformation($"Amount validation passed: Approved={request.ApprovedAmount}, Applied={concession.AppliedAmount}");

                // ===== VALIDATION 3: Check Total Concessions Don't Exceed Limit =====
                var otherApprovedConcessions = await _context.FeeConcessions
                    .Where(fc => fc.StudentId == concession.StudentId 
                        && fc.SchoolId == schoolId
                        && fc.Id != concession.Id
                        && fc.Status == "Approved")
                    .SumAsync(fc => fc.ApprovedAmount);

                var studentFees = await _context.FeeRecords
                    .Where(f => f.StudentId == concession.StudentId)
                    .SumAsync(f => f.TotalAmount);

                decimal maxConcessionAllowed = studentFees * 0.75m;
                if (otherApprovedConcessions + request.ApprovedAmount > maxConcessionAllowed)
                    throw new InvalidOperationException($"Total concessions would exceed maximum allowed (₹{maxConcessionAllowed})");

                _logger.LogInformation($"Total concession limit validation passed: Other approved={otherApprovedConcessions}, New={request.ApprovedAmount}, Max={maxConcessionAllowed}");

                // ===== UPDATE CONCESSION =====
                concession.Status = "Approved";
                concession.ApprovedAmount = request.ApprovedAmount;
                concession.ApprovedByStaffId = request.ApprovedByStaffId;
                concession.ApprovedDate = DateTime.UtcNow;
                concession.ApproverRemarks = request.Remarks;
                concession.UpdatedAt = DateTime.UtcNow;

                // ===== UPDATE FeeRecord.DiscountAmount =====
                var feeRec = await _context.FeeRecords
                    .FirstOrDefaultAsync(f => f.StudentId == concession.StudentId
                        && f.AcademicYear == concession.AcademicYear
                        && f.SchoolId == schoolId);
                if (feeRec != null)
                {
                    feeRec.DiscountAmount += request.ApprovedAmount;
                    feeRec.PendingAmount = Math.Max(0, feeRec.TotalAmount + feeRec.LateFeeAmount - feeRec.PaidAmount - feeRec.DiscountAmount);
                    if (feeRec.PendingAmount <= 0) feeRec.Status = "paid";
                    feeRec.UpdatedAt = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();

                // ===== AUDIT LOG: immutable concession approval record =====
                _context.Set<FeeAuditLog>().Add(new FeeAuditLog
                {
                    SchoolId = schoolId,
                    EntityType = "FeeConcession",
                    EntityId = concession.Id,
                    Action = "ConcessionApproved",
                    StudentId = concession.StudentId,
                    Amount = request.ApprovedAmount,
                    PerformedByUserId = request.ApprovedByStaffId,
                    Remarks = $"Concession {concession.ConcessionNumber} approved for ₹{request.ApprovedAmount}. {request.Remarks}",
                    NewValues = System.Text.Json.JsonSerializer.Serialize(new { concession.Status, concession.ApprovedAmount, concession.ApprovedByStaffId }),
                    Timestamp = DateTime.UtcNow,
                });
                await _context.SaveChangesAsync();

                _logger.LogInformation($"✓ Concession Approved: {concession.ConcessionNumber} | Approved Amount: ₹{request.ApprovedAmount} | Approver: {request.ApprovedByStaffId}");

                await transaction.CommitAsync();
                return MapToFeeConcessionResponse(concession);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError($"✗ Concession approval failed: {ex.Message}");
                throw;
            }
            });
        }

        public async Task<FeeConcessionResponse> RejectConcessionAsync(Guid id, RejectFeeConcessionRequest request, Guid schoolId)
        {
            // VALIDATION: Reason required
            if (string.IsNullOrWhiteSpace(request.Reason))
                throw new ArgumentException("Rejection reason is required.");

            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var concession = await _context.FeeConcessions
                    .Include(fc => fc.ConcessionType)
                    .FirstOrDefaultAsync(fc => fc.Id == id && fc.SchoolId == schoolId);

                if (concession == null)
                    throw new KeyNotFoundException("Concession not found");

                // ===== VALIDATION 1: Only Pending concessions can be rejected =====
                if (concession.Status != "Pending")
                    throw new InvalidOperationException($"Only pending concessions can be rejected (Current: {concession.Status})");

                _logger.LogInformation($"Concession status check passed: {concession.ConcessionNumber}");

                // ===== VALIDATION 2: Rejection reason is provided =====
                if (string.IsNullOrWhiteSpace(request.Reason))
                    throw new InvalidOperationException("Rejection reason is required");

                _logger.LogInformation($"Rejection reason validated: {request.Reason}");

                // ===== UPDATE CONCESSION =====
                concession.Status = "Rejected";
                concession.ApprovedByStaffId = request.RejectedByStaffId;
                concession.ApprovedDate = DateTime.UtcNow;
                concession.ApproverRemarks = request.Reason;
                concession.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation($"✓ Concession Rejected: {concession.ConcessionNumber} | Reason: {request.Reason}");

                await transaction.CommitAsync();
                return MapToFeeConcessionResponse(concession);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError($"✗ Concession rejection failed: {ex.Message}");
                throw;
            }
            });
        }

        public async Task<FeeConcessionResponse> RevokeFeeConcessionAsync(Guid id, string reason, Guid schoolId)
        {
            if (string.IsNullOrWhiteSpace(reason))
                throw new ArgumentException("Revocation reason is required.");

            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var concession = await _context.FeeConcessions
                    .Include(fc => fc.ConcessionType)
                    .FirstOrDefaultAsync(fc => fc.Id == id && fc.SchoolId == schoolId);

                if (concession == null)
                    throw new KeyNotFoundException("Concession not found");

                if (concession.Status != "Approved")
                    throw new InvalidOperationException($"Only approved concessions can be revoked (Current: {concession.Status})");

                // Reverse the discount on FeeRecord
                var feeRec = await _context.FeeRecords
                    .FirstOrDefaultAsync(f => f.StudentId == concession.StudentId
                        && f.AcademicYear == concession.AcademicYear
                        && f.SchoolId == schoolId);
                if (feeRec != null)
                {
                    feeRec.DiscountAmount = Math.Max(0, feeRec.DiscountAmount - concession.ApprovedAmount);
                    feeRec.PendingAmount = Math.Max(0, feeRec.TotalAmount + feeRec.LateFeeAmount - feeRec.PaidAmount - feeRec.DiscountAmount);
                    if (feeRec.PendingAmount > 0 && feeRec.Status == "paid") feeRec.Status = "partial";
                    feeRec.UpdatedAt = DateTime.UtcNow;
                }

                concession.Status = "Revoked";
                concession.ApproverRemarks = reason;
                concession.UpdatedAt = DateTime.UtcNow;

                _context.Set<FeeAuditLog>().Add(new FeeAuditLog
                {
                    SchoolId = schoolId,
                    EntityType = "FeeConcession",
                    EntityId = concession.Id,
                    Action = "ConcessionRevoked",
                    StudentId = concession.StudentId,
                    Amount = concession.ApprovedAmount,
                    Remarks = $"Concession {concession.ConcessionNumber} revoked. Reason: {reason}",
                    Timestamp = DateTime.UtcNow,
                });

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                _logger.LogInformation($"✓ Concession Revoked: {concession.ConcessionNumber}");
                return MapToFeeConcessionResponse(concession);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError($"✗ Concession revocation failed: {ex.Message}");
                throw;
            }
            });
        }

        public async Task<FeeConcessionListResponse> GetConcessionsForSchoolAsync(Guid schoolId, Guid? studentId, string? status, int page, int pageSize)
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 200) pageSize = 50;

            var query = _context.FeeConcessions
                .Include(fc => fc.ConcessionType)
                .Include(fc => fc.Student)
                .Where(fc => fc.SchoolId == schoolId);

            if (studentId.HasValue)
                query = query.Where(fc => fc.StudentId == studentId.Value);
            if (!string.IsNullOrEmpty(status))
                query = query.Where(fc => fc.Status == status);

            var total = await query.CountAsync();
            var concessions = await query
                .OrderByDescending(fc => fc.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new FeeConcessionListResponse
            {
                Concessions = concessions.Select(fc =>
                {
                    var r = MapToFeeConcessionResponse(fc);
                    r.StudentName = fc.Student?.Name;
                    r.StudentAdmissionNumber = fc.Student?.AdmissionNumber;
                    return r;
                }).ToList(),
                Total = total,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling((double)total / pageSize)
            };
        }

        private ConcessionTypeResponse MapToConcessionTypeResponse(ConcessionType type)
        {
            return new ConcessionTypeResponse
            {
                Id = type.Id,
                SchoolId = type.SchoolId,
                Name = type.Name,
                Description = type.Description,
                DiscountType = type.DiscountType,
                DiscountValue = type.DiscountValue,
                MaxDiscountAmount = type.MaxDiscountAmount,
                ApplicableFor = type.ApplicableFor,
                RequiresDocuments = type.RequiresDocuments,
                RequiresApproval = type.RequiresApproval,
                ValidFrom = type.ValidFrom,
                ValidTo = type.ValidTo,
                IsActive = type.IsActive,
                CreatedAt = type.CreatedAt,
                UpdatedAt = type.UpdatedAt
            };
        }

        private FeeConcessionResponse MapToFeeConcessionResponse(FeeConcession concession)
        {
            return new FeeConcessionResponse
            {
                Id = concession.Id,
                SchoolId = concession.SchoolId,
                ConcessionNumber = concession.ConcessionNumber,
                StudentId = concession.StudentId,
                ConcessionTypeId = concession.ConcessionTypeId,
                ConcessionTypeName = concession.ConcessionType?.Name,
                AcademicYear = concession.AcademicYear,
                Reason = concession.Reason,
                DocumentUrls = !string.IsNullOrEmpty(concession.DocumentUrls) 
                    ? concession.DocumentUrls.Split(',').ToList() 
                    : new List<string>(),
                AppliedAmount = concession.AppliedAmount,
                ApprovedAmount = concession.ApprovedAmount,
                Status = concession.Status,
                ApprovedByStaffId = concession.ApprovedByStaffId,
                ApprovedDate = concession.ApprovedDate,
                ApproverRemarks = concession.ApproverRemarks,
                ValidFrom = concession.ValidFrom,
                ValidTo = concession.ValidTo,
                CreatedAt = concession.CreatedAt,
                UpdatedAt = concession.UpdatedAt
            };
        }
    }
}

