using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace SmsApi.Services
{
    public interface IHostelService
    {
        Task<HostelRoomListResponse> GetRoomsAsync(Guid schoolId, int page = 1, int pageSize = 10);
        Task<HostelRoomResponse?> GetRoomByIdAsync(Guid id, Guid schoolId);
        Task<HostelRoomResponse> CreateRoomAsync(CreateHostelRoomRequest request);
        Task<HostelRoomResponse?> UpdateRoomAsync(Guid id, Guid schoolId, CreateHostelRoomRequest request);
        Task<bool> DeleteRoomAsync(Guid id, Guid schoolId);
        Task<List<HostelStudentResponse>> GetStudentsByRoomAsync(Guid roomId, Guid schoolId);
        Task<List<HostelStudentDetailResponse>> GetAllHostelStudentsAsync(Guid schoolId);
        Task<HostelStudentResponse> AssignStudentToRoomAsync(CreateHostelStudentRequest request);
        Task<HostelStudentResponse?> UpdateHostelStudentAsync(Guid id, Guid schoolId, UpdateHostelStudentRequest request);
        Task<bool> RemoveStudentFromRoomAsync(Guid id, Guid schoolId);

        // ── P1: Enhanced Hostel ─────────────────────────────────────────────────
        Task<List<HostelBlockResponse>> GetBlocksAsync(Guid schoolId);
        Task<HostelBlockResponse?> GetBlockByIdAsync(Guid id, Guid schoolId);
        Task<HostelBlockResponse> CreateBlockAsync(Guid schoolId, CreateHostelBlockRequest request);
        Task<HostelBlockResponse?> UpdateBlockAsync(Guid id, Guid schoolId, CreateHostelBlockRequest request);
        Task<bool> DeleteBlockAsync(Guid id, Guid schoolId);
        Task<List<HostelMessBillingResponse>> GetMessBillingsAsync(Guid schoolId, Guid? hostelStudentId, string? month);
        Task<HostelMessBillingResponse> CreateMessBillingAsync(Guid schoolId, CreateHostelMessBillingRequest request);
        Task<HostelMessBillingResponse?> MarkMessBillingPaidAsync(Guid id, Guid schoolId);
        Task<List<HostelVisitorLogResponse>> GetVisitorLogsAsync(Guid schoolId, Guid? hostelStudentId);
        Task<HostelVisitorLogResponse> CreateVisitorLogAsync(Guid schoolId, CreateHostelVisitorLogRequest request);
        Task<HostelVisitorLogResponse?> CheckOutVisitorAsync(Guid id, Guid schoolId);
        Task<List<HostelLeaveResponse>> GetLeavesAsync(Guid schoolId, Guid? hostelStudentId, string? status);
        Task<HostelLeaveResponse> CreateLeaveAsync(Guid schoolId, CreateHostelLeaveRequest request);
        Task<HostelLeaveResponse?> ApproveLeaveAsync(Guid id, Guid schoolId, Guid approvedBy, string status, string? remarks);
    }

    public class HostelService : IHostelService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<HostelService> _logger;

        public HostelService(AppDbContext context, ILogger<HostelService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<HostelRoomListResponse> GetRoomsAsync(Guid schoolId, int page = 1, int pageSize = 10)
        {
            // Normalize pagination
            page = Math.Max(1, page);
            pageSize = Math.Min(100, Math.Max(1, pageSize));

            var query = _context.HostelRooms
                .Include(r => r.Block)
                .Where(r => r.SchoolId == schoolId);

            var total = await query.CountAsync();
            var rooms = await query
                .OrderBy(r => r.RoomNumber)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new HostelRoomListResponse
            {
                Rooms = rooms.Select(MapToResponse).ToList(),
                Total = total,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<HostelRoomResponse?> GetRoomByIdAsync(Guid id, Guid schoolId)
        {
            var room = await _context.HostelRooms
                .Include(r => r.Block)
                .FirstOrDefaultAsync(r => r.Id == id && r.SchoolId == schoolId);

            return room == null ? null : MapToResponse(room);
        }

        public async Task<HostelRoomResponse> CreateRoomAsync(CreateHostelRoomRequest request)
        {
            // Validate required fields
            if (string.IsNullOrWhiteSpace(request.RoomNumber))
                throw new ArgumentException("RoomNumber is required");

            if (string.IsNullOrWhiteSpace(request.RoomType))
                throw new ArgumentException("RoomType is required");

            if (request.Capacity <= 0)
                throw new ArgumentException("Capacity must be greater than 0");

            if (request.RentPerBed < 0)
                throw new ArgumentException("RentPerBed cannot be negative");

            // Check for duplicate room number in the same school
            var existingRoom = await _context.HostelRooms
                .FirstOrDefaultAsync(r => r.SchoolId == request.SchoolId && 
                                          r.RoomNumber == request.RoomNumber);

            if (existingRoom != null)
                throw new InvalidOperationException($"Room {request.RoomNumber} already exists in this school");

            // Validate room type
            var validRoomTypes = new[] { "boys", "girls", "co-ed" };
            if (!validRoomTypes.Contains(request.RoomType?.ToLower()))
                throw new ArgumentException($"Invalid RoomType. Must be one of: {string.Join(", ", validRoomTypes)}");

            var room = new HostelRoom
            {
                Id = Guid.NewGuid(),
                SchoolId = request.SchoolId,
                BlockId = request.BlockId,
                RoomNumber = request.RoomNumber,
                RoomType = request.RoomType,
                Capacity = request.Capacity,
                Occupied = request.Occupied,
                RentPerBed = request.RentPerBed,
                Floor = request.Floor,
                Status = request.Status ?? "available",
                Facilities = request.Facilities,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.HostelRooms.Add(room);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Room {RoomNumber} created successfully", request.RoomNumber);

            return MapToResponse(room);
        }

        public async Task<HostelRoomResponse?> UpdateRoomAsync(Guid id, Guid schoolId, CreateHostelRoomRequest request)
        {
            // Validate required fields
            if (string.IsNullOrWhiteSpace(request.RoomNumber))
                throw new ArgumentException("RoomNumber is required");

            if (string.IsNullOrWhiteSpace(request.RoomType))
                throw new ArgumentException("RoomType is required");

            if (request.Capacity <= 0)
                throw new ArgumentException("Capacity must be greater than 0");

            if (request.RentPerBed < 0)
                throw new ArgumentException("RentPerBed cannot be negative");

            var validRoomTypes = new[] { "boys", "girls", "co-ed" };
            if (!validRoomTypes.Contains(request.RoomType?.ToLower()))
                throw new ArgumentException($"Invalid RoomType. Must be one of: {string.Join(", ", validRoomTypes)}");

            var room = await _context.HostelRooms
                .FirstOrDefaultAsync(r => r.Id == id && r.SchoolId == schoolId);

            if (room == null) return null;

            // Check if another room has this room number (excluding current room)
            var duplicateRoom = await _context.HostelRooms
                .FirstOrDefaultAsync(r => r.SchoolId == schoolId && 
                                          r.Id != id && 
                                          r.RoomNumber == request.RoomNumber);

            if (duplicateRoom != null)
                throw new InvalidOperationException($"Room {request.RoomNumber} already exists in this school");

            // Validate capacity doesn't decrease below current occupancy
            if (request.Capacity < room.Occupied)
                throw new InvalidOperationException(
                    $"Cannot reduce capacity to {request.Capacity}. Current occupancy is {room.Occupied}");

            room.BlockId = request.BlockId;
            room.RoomNumber = request.RoomNumber;
            room.RoomType = request.RoomType;
            room.Capacity = request.Capacity;
            room.RentPerBed = request.RentPerBed;
            room.Floor = request.Floor;
            room.Status = request.Status ?? "available";
            room.Facilities = request.Facilities;
            room.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Room {RoomNumber} updated successfully", request.RoomNumber);

            return MapToResponse(room);
        }

        public async Task<bool> DeleteRoomAsync(Guid id, Guid schoolId)
        {
            var room = await _context.HostelRooms
                .FirstOrDefaultAsync(r => r.Id == id && r.SchoolId == schoolId);

            if (room == null) return false;

            _context.HostelRooms.Remove(room);
            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<List<HostelStudentResponse>> GetStudentsByRoomAsync(Guid roomId, Guid schoolId)
        {
            var students = await _context.HostelStudents
                .Include(hs => hs.Student)
                .Include(hs => hs.Room)
                .Where(hs => hs.RoomId == roomId && hs.SchoolId == schoolId)
                .ToListAsync();

            return students.Select(MapToStudentResponse).ToList();
        }

        public async Task<List<HostelStudentDetailResponse>> GetAllHostelStudentsAsync(Guid schoolId)
        {
            var hostelStudents = await _context.HostelStudents
                .Include(hs => hs.Student)
                .Include(hs => hs.Room)
                .Where(hs => hs.SchoolId == schoolId && hs.Status == "active")
                .ToListAsync();

            return hostelStudents.Select(hs => new HostelStudentDetailResponse
            {
                Id = hs.Id,
                StudentId = hs.StudentId,
                StudentName = hs.Student != null
                    ? (!string.IsNullOrWhiteSpace(hs.Student.FirstName)
                        ? $"{hs.Student.FirstName} {hs.Student.LastName}".Trim()
                        : hs.Student.Name)
                    : "Unknown",
                StudentClass = hs.Student?.Class ?? "N/A",
                StudentSection = hs.Student?.Section ?? "N/A",
                Gender = hs.Student?.Gender ?? "Unknown",
                RoomId = hs.RoomId,
                RoomNumber = hs.Room?.RoomNumber ?? "N/A",
                RoomType = hs.Room?.RoomType ?? "Unknown",
                Floor = hs.Room?.Floor,
                CheckInDate = hs.CheckInDate,
                CheckOutDate = hs.CheckOutDate,
                MonthlyFee = hs.MonthlyFee,
                Status = hs.Status,
                CreatedAt = hs.CreatedAt
            }).ToList();
        }

        public async Task<HostelStudentResponse> AssignStudentToRoomAsync(CreateHostelStudentRequest request)
        {
            // ===== VALIDATION 1: Room Capacity Validation =====
            var room = await _context.HostelRooms
                .FirstOrDefaultAsync(r => r.Id == request.RoomId && r.SchoolId == request.SchoolId);

            if (room == null)
                throw new KeyNotFoundException($"Hostel room not found");

            // Count current occupants
            var currentOccupants = await _context.HostelStudents
                .Where(hs => hs.RoomId == request.RoomId && hs.Status == "active")
                .CountAsync();

            if (currentOccupants >= room.Capacity)
                throw new InvalidOperationException(
                    $"Room {room.RoomNumber} is full ({currentOccupants}/{room.Capacity} occupants). Cannot assign more students.");

            // Prevent overcrowding (don't allow 150% occupancy)
            if (currentOccupants + 1 > (room.Capacity * 1.5))
                throw new InvalidOperationException(
                    $"Assignment would exceed overcrowding limit (150% capacity) for Room {room.RoomNumber}");

            // ===== VALIDATION 2: Student Verification & Status Checks =====
            var student = await _context.Students
                .FirstOrDefaultAsync(s => s.SchoolId == request.SchoolId && s.Id == request.StudentId);

            if (student == null)
                throw new KeyNotFoundException("Student not found");

            if (student.Status == "dropped_out" || student.Status == "transferred")
                throw new InvalidOperationException($"Cannot assign hostel to student with status: {student.Status}");

            // ===== VALIDATION 3: Gender-Based Room Allocation =====
            var studentGender = student.Gender?.ToLower() ?? "unknown";
            var roomType = room.RoomType?.ToLower() ?? "co-ed";

            if (roomType != "co-ed")
            {
                if (roomType == "boys" && studentGender != "male")
                    throw new InvalidOperationException(
                        $"Room {room.RoomNumber} is designated for boys only. Cannot assign {studentGender} student.");

                if (roomType == "girls" && studentGender != "female")
                    throw new InvalidOperationException(
                        $"Room {room.RoomNumber} is designated for girls only. Cannot assign {studentGender} student.");
            }

            // ===== VALIDATION 4: Age-Based Allocation =====
            var studentClass = student.Class ?? "unknown";
            var classLevel = ExtractClassLevel(studentClass);

            // Separate junior (1-5) from senior (6+) if configured
            var existingStudentsInRoom = await _context.HostelStudents
                .Include(hs => hs.Student)
                .Where(hs => hs.RoomId == request.RoomId && hs.Status == "active")
                .ToListAsync();

            if (existingStudentsInRoom.Any())
            {
                var existingClassLevels = existingStudentsInRoom
                    .Select(hs => ExtractClassLevel(hs.Student?.Class ?? ""))
                    .Distinct()
                    .ToList();

                var isExistingJunior = existingClassLevels.Any(cl => cl >= 1 && cl <= 5);
                var isExistingSnior = existingClassLevels.Any(cl => cl >= 6);
                var isNewJunior = classLevel >= 1 && classLevel <= 5;
                var isNewSenior = classLevel >= 6;

                if (isExistingJunior && isNewSenior)
                    throw new InvalidOperationException(
                        $"Room {room.RoomNumber} contains junior students (Class 1-5). Cannot mix with senior (Class 6+).");

                if (isExistingSnior && isNewJunior)
                    throw new InvalidOperationException(
                        $"Room {room.RoomNumber} contains senior students (Class 6+). Cannot mix with junior (Class 1-5).");
            }

            // ===== VALIDATION 5: Duplicate Assignment Prevention =====
            var existingAssignment = await _context.HostelStudents
                .FirstOrDefaultAsync(hs => hs.StudentId == request.StudentId && 
                                           hs.SchoolId == request.SchoolId && 
                                           hs.Status == "active");

            if (existingAssignment != null)
                throw new InvalidOperationException(
                    $"Student is already assigned to hostel room {existingAssignment.RoomId}. Remove from existing assignment first.");

            // Check for dangling assignment (left without checkout)
            var danglingAssignment = await _context.HostelStudents
                .FirstOrDefaultAsync(hs => hs.StudentId == request.StudentId && 
                                           hs.SchoolId == request.SchoolId && 
                                           hs.Status != "checkout");

            if (danglingAssignment != null)
            {
                _logger.LogWarning("Dangling hostel assignment found for student {StudentId}. Marking as revoked.", request.StudentId);
                danglingAssignment.Status = "revoked";
                await _context.SaveChangesAsync();
            }

            // ===== VALIDATION 6: Room Maintenance Check =====
            if (room.Status == "maintenance")
                throw new InvalidOperationException(
                    $"Room {room.RoomNumber} is under maintenance. Cannot assign students at this time.");

            // ===== VALIDATION 7: Checkout Date Validation =====
            if (request.CheckOutDate.HasValue && request.CheckOutDate < request.CheckInDate)
                throw new ArgumentException("CheckOutDate cannot be earlier than CheckInDate");

            // ===== MAIN ASSIGNMENT LOGIC =====
            var hostelStudent = new HostelStudent
            {
                Id = Guid.NewGuid(),
                SchoolId = request.SchoolId,
                StudentId = request.StudentId,
                RoomId = request.RoomId,
                CheckInDate = request.CheckInDate,
                CheckOutDate = request.CheckOutDate,
                MonthlyFee = request.MonthlyFee,
                Status = "active",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            // Increase occupied count
            room.Occupied++;
            room.UpdatedAt = DateTime.UtcNow;

            _context.HostelStudents.Add(hostelStudent);
            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "Student {StudentId} assigned to hostel room {RoomId} ({RoomNumber}). Occupancy: {Current}/{Capacity}",
                request.StudentId, request.RoomId, room.RoomNumber, room.Occupied, room.Capacity);

            // ===== VALIDATION 8: Auto-Fee Deduction =====
            await AddFeesToStudentRecordAsync(request.SchoolId, request.StudentId, request.MonthlyFee);

            // Load navigation properties for full response
            await _context.Entry(hostelStudent).Reference(hs => hs.Student).LoadAsync();
            await _context.Entry(hostelStudent).Reference(hs => hs.Room).LoadAsync();

            return MapToStudentResponse(hostelStudent);
        }

        // ─── Fee Helpers ─────────────────────────────────────────────────────────

        private async Task<(string Name, DateTime EndDate)> GetCurrentAcademicYearInfoAsync(Guid schoolId)
        {
            var now = DateTime.UtcNow;
            var activeYear = await _context.AcademicYears
                .IgnoreQueryFilters()
                .Where(a => a.SchoolId == schoolId && !a.IsDeleted && a.StartDate <= now && a.EndDate >= now)
                .OrderByDescending(a => a.StartDate)
                .Select(a => new { a.Name, a.EndDate })
                .FirstOrDefaultAsync();
            if (activeYear != null) return (activeYear.Name, activeYear.EndDate);

            var latestYear = await _context.AcademicYears
                .IgnoreQueryFilters()
                .Where(a => a.SchoolId == schoolId && !a.IsDeleted)
                .OrderByDescending(a => a.StartDate)
                .Select(a => new { a.Name, a.EndDate })
                .FirstOrDefaultAsync();
            if (latestYear != null) return (latestYear.Name, latestYear.EndDate);

            // Fallback: Indian academic year Apr–Mar
            var yearEnd = now.Month >= 4
                ? new DateTime(now.Year + 1, 3, 31)
                : new DateTime(now.Year, 3, 31);
            var yearName = now.Month >= 4 ? $"{now.Year}-{now.Year + 1}" : $"{now.Year - 1}-{now.Year}";
            return (yearName, yearEnd);
        }

        /// <summary>
        /// Pro-rates a monthly fee from <paramref name="from"/> to the end of the academic year.
        /// Includes a partial first month (remaining days) plus full subsequent months.
        /// </summary>
        private static decimal CalculateProrataAmount(decimal monthlyFee, DateTime from, DateTime academicYearEnd)
        {
            if (monthlyFee <= 0) return 0m;

            var daysInMonth = DateTime.DaysInMonth(from.Year, from.Month);
            var remainingDays = daysInMonth - from.Day + 1;
            var prorataThisMonth = Math.Round(monthlyFee * remainingDays / daysInMonth, 2);

            var nextMonth = new DateTime(from.Year, from.Month, 1).AddMonths(1);
            var firstMonthAfterEnd = new DateTime(academicYearEnd.Year, academicYearEnd.Month, 1).AddMonths(1);
            var fullMonths = 0;
            for (var m = nextMonth; m < firstMonthAfterEnd; m = m.AddMonths(1))
                fullMonths++;

            return prorataThisMonth + fullMonths * monthlyFee;
        }

        /// <summary>
        /// Adds or accumulates <paramref name="addedAmount"/> into the named key of
        /// <see cref="FeeRecord.FeeHeadOverrides"/>. When the fee structure has 0 for that head,
        /// the stale-fix loop treats a positive override as a negative reduction (0 - X = -X,
        /// correctTotal -= -X → correctTotal += X), preserving the per-student charge across GETs.
        /// </summary>
        private static void ApplyModuleFeeOverride(FeeRecord record, string key, decimal addedAmount)
        {
            var overrides = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);
            if (!string.IsNullOrWhiteSpace(record.FeeHeadOverrides))
                try { overrides = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, decimal>>(record.FeeHeadOverrides) ?? overrides; } catch { }
            overrides[key] = (overrides.TryGetValue(key, out var existing) ? existing : 0m) + addedAmount;
            record.FeeHeadOverrides = System.Text.Json.JsonSerializer.Serialize(overrides);
        }

        /// <summary>
        /// Adjusts (adds or subtracts) <paramref name="delta"/> on the named key in
        /// <see cref="FeeRecord.FeeHeadOverrides"/>. Removes the key when the result reaches 0.
        /// </summary>
        private static void AdjustModuleFeeOverride(FeeRecord record, string key, decimal delta)
        {
            if (delta == 0) return;
            var overrides = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);
            if (!string.IsNullOrWhiteSpace(record.FeeHeadOverrides))
                try { overrides = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, decimal>>(record.FeeHeadOverrides) ?? overrides; } catch { }
            var current = overrides.TryGetValue(key, out var ex) ? ex : 0m;
            var updated = Math.Max(0, current + delta);
            if (updated > 0) overrides[key] = updated;
            else overrides.Remove(key);
            record.FeeHeadOverrides = overrides.Count > 0
                ? System.Text.Json.JsonSerializer.Serialize(overrides) : null;
        }

        /// <summary>
        /// Adds the pro-rated hostel fee (from today to academic-year end) plus any pending
        /// library fines to the student's existing pending FeeRecord. Creates one if none exists.
        /// Library fines are marked FinePaid=true to prevent double-counting.
        /// </summary>
        private async Task AddFeesToStudentRecordAsync(Guid schoolId, Guid studentId, decimal monthlyFee)
        {
            try
            {
                var (academicYear, yearEnd) = await GetCurrentAcademicYearInfoAsync(schoolId);
                var now = DateTime.UtcNow;

                var prorataFee = CalculateProrataAmount(monthlyFee, now, yearEnd);

                var pendingFines = await _context.BookIssues
                    .IgnoreQueryFilters()
                    .Where(bi => bi.StudentId == studentId && bi.SchoolId == schoolId && !bi.IsDeleted && !bi.FinePaid && bi.Fine > 0)
                    .ToListAsync();
                var libraryFineTotal = pendingFines.Sum(bi => bi.Fine);
                foreach (var fine in pendingFines)
                    fine.FinePaid = true;

                var totalToAdd = prorataFee + libraryFineTotal;
                if (totalToAdd <= 0) return;

                var feeRecord = await _context.FeeRecords
                    .IgnoreQueryFilters()
                    .Where(fr => fr.StudentId == studentId && fr.SchoolId == schoolId && !fr.IsDeleted &&
                                 (fr.AcademicYear == academicYear || fr.AcademicYear == null || fr.AcademicYear == "") &&
                                 fr.Status != "paid")
                    .OrderByDescending(fr => fr.CreatedAt)
                    .FirstOrDefaultAsync();

                if (feeRecord != null)
                {
                    if (string.IsNullOrEmpty(feeRecord.AcademicYear))
                        feeRecord.AcademicYear = academicYear;
                    feeRecord.TotalAmount += totalToAdd;
                    feeRecord.PendingAmount = Math.Max(0, feeRecord.TotalAmount - feeRecord.PaidAmount - feeRecord.DiscountAmount + feeRecord.LateFeeAmount);
                    feeRecord.BalanceAmount = feeRecord.PendingAmount;
                    feeRecord.UpdatedAt = now;

                    // Track pro-rata hostel fee in FeeHeadOverrides so the stale-fix loop
                    // (which resets TotalAmount from the fee structure) preserves this per-student charge.
                    if (prorataFee > 0)
                        ApplyModuleFeeOverride(feeRecord, "hostelFee", prorataFee);

                    _logger.LogInformation(
                        "Added ₹{Amount} (pro-rata hostel ₹{Hostel} [{Days}d] + library fines ₹{Fines}) to fee record {RecordId} for student {StudentId}",
                        totalToAdd, prorataFee, DateTime.DaysInMonth(now.Year, now.Month) - now.Day + 1, libraryFineTotal, feeRecord.Id, studentId);
                }
                else
                {
                    var dueDate = new DateTime(now.Year, now.Month, 1).AddMonths(1);
                    var newRecord = new FeeRecord
                    {
                        Id = Guid.NewGuid(),
                        SchoolId = schoolId,
                        StudentId = studentId,
                        TotalAmount = totalToAdd,
                        PaidAmount = 0,
                        DiscountAmount = 0,
                        LateFeeAmount = 0,
                        PendingAmount = totalToAdd,
                        BalanceAmount = totalToAdd,
                        AcademicYear = academicYear,
                        DueDate = dueDate,
                        Status = "pending",
                        CreatedAt = now,
                        UpdatedAt = now
                    };
                    _context.FeeRecords.Add(newRecord);

                    _logger.LogInformation(
                        "Created fee record for student {StudentId}: ₹{Amount} (pro-rata hostel ₹{Hostel} + library fines ₹{Fines}), due {DueDate}",
                        studentId, totalToAdd, prorataFee, libraryFineTotal, dueDate);
                }

                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error applying fees to student {StudentId}", studentId);
            }
        }

        /// <summary>
        /// Adjusts the student's fee record when the hostel monthly fee changes.
        /// The adjustment is pro-rated: remaining days this month + remaining full months to year-end.
        /// </summary>
        private async Task AdjustStudentFeeRecordAsync(Guid schoolId, Guid studentId, decimal oldAmount, decimal newAmount)
        {
            if (newAmount == oldAmount) return;
            try
            {
                var now = DateTime.UtcNow;
                var (academicYear, yearEnd) = await GetCurrentAcademicYearInfoAsync(schoolId);

                var feeRecord = await _context.FeeRecords
                    .IgnoreQueryFilters()
                    .Where(fr => fr.StudentId == studentId && fr.SchoolId == schoolId && !fr.IsDeleted &&
                                 (fr.AcademicYear == academicYear || fr.AcademicYear == null || fr.AcademicYear == "") &&
                                 fr.Status != "paid")
                    .OrderByDescending(fr => fr.CreatedAt)
                    .FirstOrDefaultAsync();

                var monthlyDiff = newAmount - oldAmount;
                var prorataDiff = CalculateProrataAmount(Math.Abs(monthlyDiff), now, yearEnd);
                if (monthlyDiff < 0) prorataDiff = -prorataDiff;

                if (feeRecord != null)
                {
                    if (string.IsNullOrEmpty(feeRecord.AcademicYear))
                        feeRecord.AcademicYear = academicYear;
                    feeRecord.TotalAmount = Math.Max(0, feeRecord.TotalAmount + prorataDiff);
                    feeRecord.PendingAmount = Math.Max(0, feeRecord.TotalAmount - feeRecord.PaidAmount - feeRecord.DiscountAmount + feeRecord.LateFeeAmount);
                    feeRecord.BalanceAmount = feeRecord.PendingAmount;
                    feeRecord.UpdatedAt = now;

                    // Keep the FeeHeadOverrides in sync so the stale-fix loop preserves the correct value.
                    AdjustModuleFeeOverride(feeRecord, "hostelFee", prorataDiff);

                    await _context.SaveChangesAsync();

                    _logger.LogInformation(
                        "Adjusted fee record for student {StudentId}: pro-rata diff ₹{Diff} (monthly ₹{Old} → ₹{New}), new total ₹{Total}",
                        studentId, prorataDiff, oldAmount, newAmount, feeRecord.TotalAmount);
                }
                else if (prorataDiff > 0)
                {
                    var newRecord = new FeeRecord
                    {
                        Id = Guid.NewGuid(),
                        SchoolId = schoolId,
                        StudentId = studentId,
                        TotalAmount = prorataDiff,
                        PaidAmount = 0,
                        DiscountAmount = 0,
                        LateFeeAmount = 0,
                        PendingAmount = prorataDiff,
                        BalanceAmount = prorataDiff,
                        AcademicYear = academicYear,
                        DueDate = new DateTime(now.Year, now.Month, 1).AddMonths(1),
                        Status = "pending",
                        CreatedAt = now,
                        UpdatedAt = now
                    };
                    _context.FeeRecords.Add(newRecord);
                    await _context.SaveChangesAsync();

                    _logger.LogInformation(
                        "Created fee record for student {StudentId} on fee update: pro-rata ₹{Diff} (monthly ₹{Old} → ₹{New})",
                        studentId, prorataDiff, oldAmount, newAmount);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adjusting fee record for student {StudentId}", studentId);
            }
        }

        private int ExtractClassLevel(string className)
        {
            if (string.IsNullOrEmpty(className)) return 0;

            var match = System.Text.RegularExpressions.Regex.Match(className, @"\d+");
            if (match.Success && int.TryParse(match.Value, out int level))
                return level;

            return 0;
        }

        public async Task<HostelStudentResponse?> UpdateHostelStudentAsync(Guid id, Guid schoolId, UpdateHostelStudentRequest request)
        {
            var hostelStudent = await _context.HostelStudents
                .Include(hs => hs.Room)
                .FirstOrDefaultAsync(hs => hs.Id == id && hs.SchoolId == schoolId);

            if (hostelStudent == null) return null;

            // If room changed, update occupied counts
            if (hostelStudent.RoomId != request.RoomId)
            {
                var newRoom = await _context.HostelRooms
                    .FirstOrDefaultAsync(r => r.Id == request.RoomId && r.SchoolId == schoolId);
                if (newRoom == null)
                    throw new KeyNotFoundException("Room not found.");

                if (newRoom.Occupied >= newRoom.Capacity)
                    throw new InvalidOperationException($"Room {newRoom.RoomNumber} is at full capacity.");

                // Decrement old room
                if (hostelStudent.Room != null)
                {
                    hostelStudent.Room.Occupied = Math.Max(0, hostelStudent.Room.Occupied - 1);
                    hostelStudent.Room.UpdatedAt = DateTime.UtcNow;
                }

                // Increment new room
                newRoom.Occupied++;
                newRoom.UpdatedAt = DateTime.UtcNow;

                hostelStudent.RoomId = request.RoomId;
            }

            var oldFee = hostelStudent.MonthlyFee;

            hostelStudent.CheckInDate = request.CheckInDate;
            hostelStudent.CheckOutDate = request.CheckOutDate;
            hostelStudent.MonthlyFee = request.MonthlyFee;
            hostelStudent.Status = request.Status;
            hostelStudent.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Adjust student's fee record if monthly fee changed
            await AdjustStudentFeeRecordAsync(schoolId, hostelStudent.StudentId, oldFee, request.MonthlyFee);

            // Load navigation properties for full response
            await _context.Entry(hostelStudent).Reference(hs => hs.Student).LoadAsync();
            await _context.Entry(hostelStudent).Reference(hs => hs.Room).LoadAsync();

            return MapToStudentResponse(hostelStudent);
        }

        public async Task<bool> RemoveStudentFromRoomAsync(Guid id, Guid schoolId)
        {
            var hostelStudent = await _context.HostelStudents
                .Include(hs => hs.Room)
                .FirstOrDefaultAsync(hs => hs.Id == id && hs.SchoolId == schoolId);

            if (hostelStudent == null) return false;

            // Mark as checkout with date and update status
            hostelStudent.CheckOutDate = DateTime.Now;
            hostelStudent.Status = "checkout";
            hostelStudent.UpdatedAt = DateTime.UtcNow;

            // Decrease occupied count
            if (hostelStudent.Room != null)
            {
                hostelStudent.Room.Occupied = Math.Max(0, hostelStudent.Room.Occupied - 1);
                hostelStudent.Room.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "Student {StudentId} checked out from hostel room {RoomId}",
                hostelStudent.StudentId, hostelStudent.RoomId);

            return true;
        }

        private static HostelRoomResponse MapToResponse(HostelRoom room)
        {
            return new HostelRoomResponse
            {
                Id = room.Id,
                SchoolId = room.SchoolId,
                BlockId = room.BlockId,
                BlockName = room.Block?.Name,
                RoomNumber = room.RoomNumber,
                RoomType = room.RoomType,
                Capacity = room.Capacity,
                Occupied = room.Occupied,
                RentPerBed = room.RentPerBed,
                Floor = room.Floor,
                Status = room.Status,
                Facilities = room.Facilities,
                CreatedAt = room.CreatedAt,
                UpdatedAt = room.UpdatedAt
            };
        }

        private static HostelStudentResponse MapToStudentResponse(HostelStudent hs)
        {
            return new HostelStudentResponse
            {
                Id = hs.Id,
                SchoolId = hs.SchoolId,
                StudentId = hs.StudentId,
                StudentName = hs.Student != null
                    ? (!string.IsNullOrWhiteSpace(hs.Student.FirstName)
                        ? $"{hs.Student.FirstName} {hs.Student.LastName}".Trim()
                        : hs.Student.Name)
                    : string.Empty,
                StudentClass = hs.Student?.Class ?? string.Empty,
                StudentSection = hs.Student?.Section ?? string.Empty,
                Gender = hs.Student?.Gender ?? string.Empty,
                RoomId = hs.RoomId,
                RoomNumber = hs.Room?.RoomNumber ?? string.Empty,
                RoomType = hs.Room?.RoomType ?? string.Empty,
                Floor = hs.Room?.Floor,
                CheckInDate = hs.CheckInDate,
                CheckOutDate = hs.CheckOutDate,
                MonthlyFee = hs.MonthlyFee,
                Status = hs.Status,
                CreatedAt = hs.CreatedAt,
                UpdatedAt = hs.UpdatedAt
            };
        }

        // ── P1: Hostel Blocks ───────────────────────────────────────────────────

        public async Task<List<HostelBlockResponse>> GetBlocksAsync(Guid schoolId)
        {
            var blocks = await _context.HostelBlocks
                .Include(b => b.Rooms)
                .Where(b => b.SchoolId == schoolId && !b.IsDeleted)
                .OrderBy(b => b.Name)
                .ToListAsync();
            return blocks.Select(MapBlock).ToList();
        }

        public async Task<HostelBlockResponse?> GetBlockByIdAsync(Guid id, Guid schoolId)
        {
            var block = await _context.HostelBlocks
                .Include(b => b.Rooms)
                .FirstOrDefaultAsync(b => b.Id == id && b.SchoolId == schoolId && !b.IsDeleted);
            return block == null ? null : MapBlock(block);
        }

        public async Task<HostelBlockResponse> CreateBlockAsync(Guid schoolId, CreateHostelBlockRequest request)
        {
            if (await _context.HostelBlocks.AnyAsync(b => b.SchoolId == schoolId && b.Name == request.Name && !b.IsDeleted))
                throw new InvalidOperationException($"Block '{request.Name}' already exists.");

            var block = new HostelBlock
            {
                Id = Guid.NewGuid(), SchoolId = schoolId,
                Name = request.Name, Description = request.Description,
                WardenName = request.WardenName, WardenContact = request.WardenContact,
                WardenStaffId = request.WardenStaffId, Gender = request.Gender ?? "mixed",
                Status = "active", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            };
            _context.HostelBlocks.Add(block);
            await _context.SaveChangesAsync();
            return MapBlock(block);
        }

        public async Task<HostelBlockResponse?> UpdateBlockAsync(Guid id, Guid schoolId, CreateHostelBlockRequest request)
        {
            var block = await _context.HostelBlocks.FirstOrDefaultAsync(b => b.Id == id && b.SchoolId == schoolId && !b.IsDeleted);
            if (block == null) return null;
            if (await _context.HostelBlocks.AnyAsync(b => b.SchoolId == schoolId && b.Name == request.Name && b.Id != id && !b.IsDeleted))
                throw new InvalidOperationException($"Block '{request.Name}' already exists.");
            block.Name = request.Name; block.Description = request.Description;
            block.WardenName = request.WardenName; block.WardenContact = request.WardenContact;
            block.WardenStaffId = request.WardenStaffId; block.Gender = request.Gender ?? block.Gender;
            block.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return MapBlock(block);
        }

        public async Task<bool> DeleteBlockAsync(Guid id, Guid schoolId)
        {
            var block = await _context.HostelBlocks.FirstOrDefaultAsync(b => b.Id == id && b.SchoolId == schoolId && !b.IsDeleted);
            if (block == null) return false;
            block.IsDeleted = true; block.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }

        private static HostelBlockResponse MapBlock(HostelBlock b) => new()
        {
            Id = b.Id, SchoolId = b.SchoolId, Name = b.Name, Description = b.Description,
            WardenName = b.WardenName, WardenContact = b.WardenContact,
            WardenStaffId = b.WardenStaffId, Gender = b.Gender, Status = b.Status,
            TotalRooms = b.Rooms?.Count ?? 0,
            TotalCapacity = b.Rooms?.Sum(r => r.Capacity) ?? 0,
            TotalOccupied = b.Rooms?.Sum(r => r.Occupied) ?? 0,
            CreatedAt = b.CreatedAt, UpdatedAt = b.UpdatedAt
        };

        // ── P1: Mess Billing ────────────────────────────────────────────────────

        public async Task<List<HostelMessBillingResponse>> GetMessBillingsAsync(Guid schoolId, Guid? hostelStudentId, string? month)
        {
            var q = _context.HostelMessBillings
                .Include(m => m.HostelStudent).ThenInclude(hs => hs!.Student)
                .Where(m => m.SchoolId == schoolId && !m.IsDeleted);
            if (hostelStudentId.HasValue) q = q.Where(m => m.HostelStudentId == hostelStudentId.Value);
            if (!string.IsNullOrWhiteSpace(month)) q = q.Where(m => m.Month == month);
            var list = await q.OrderByDescending(m => m.Month).ToListAsync();
            return list.Select(MapMessBilling).ToList();
        }

        public async Task<HostelMessBillingResponse> CreateMessBillingAsync(Guid schoolId, CreateHostelMessBillingRequest request)
        {
            var hs = await _context.HostelStudents.FirstOrDefaultAsync(s => s.Id == request.HostelStudentId && s.SchoolId == schoolId && !s.IsDeleted);
            if (hs == null) throw new KeyNotFoundException("Hostel student record not found.");
            if (await _context.HostelMessBillings.AnyAsync(m => m.HostelStudentId == request.HostelStudentId && m.Month == request.Month && !m.IsDeleted))
                throw new InvalidOperationException($"Mess billing for month {request.Month} already exists for this student.");
            var billing = new HostelMessBilling
            {
                Id = Guid.NewGuid(), SchoolId = schoolId, HostelStudentId = request.HostelStudentId,
                Month = request.Month, Amount = request.Amount, Description = request.Description,
                IsPaid = false, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            };
            _context.HostelMessBillings.Add(billing);
            await _context.SaveChangesAsync();
            await _context.Entry(billing).Reference(b => b.HostelStudent).LoadAsync();
            if (billing.HostelStudent != null)
                await _context.Entry(billing.HostelStudent).Reference(s => s.Student).LoadAsync();

            // ── Sync mess charge to student's fee record ──────────────────────
            await AddMessBillingToFeeRecordAsync(schoolId, hs.StudentId, request.Amount, request.Month, request.Description);

            return MapMessBilling(billing);
        }

        public async Task<HostelMessBillingResponse?> MarkMessBillingPaidAsync(Guid id, Guid schoolId)
        {
            var billing = await _context.HostelMessBillings.Include(b => b.HostelStudent).ThenInclude(hs => hs!.Student)
                .FirstOrDefaultAsync(m => m.Id == id && m.SchoolId == schoolId && !m.IsDeleted);
            if (billing == null) return null;
            billing.IsPaid = true; billing.PaidDate = DateTime.UtcNow; billing.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // ── Create a PaymentTransaction so a receipt can be generated ──
            Guid? paymentTransactionId = null;
            if (billing.HostelStudent != null)
                paymentTransactionId = await RecordMessBillingPaymentOnFeeRecordAsync(schoolId, billing.HostelStudent.StudentId, billing.Amount, billing.Month);

            var response = MapMessBilling(billing);
            response.PaymentTransactionId = paymentTransactionId;
            return response;
        }

        /// <summary>
        /// Creates a dedicated fee record for a hostel mess billing charge so it appears
        /// as a separate "Hostel Fee" line in the fee module — independent of academic fees.
        /// </summary>
        private async Task AddMessBillingToFeeRecordAsync(Guid schoolId, Guid studentId, decimal amount, string month, string? description)
        {
            try
            {
                var (academicYear, _) = await GetCurrentAcademicYearInfoAsync(schoolId);
                var now = DateTime.UtcNow;

                // Avoid creating a duplicate if one already exists for this student+month
                var existingRecord = await _context.FeeRecords
                    .IgnoreQueryFilters()
                    .Where(fr => fr.StudentId == studentId && fr.SchoolId == schoolId && !fr.IsDeleted &&
                                 fr.FeeStructureId == null &&
                                 fr.FeeHeadOverrides != null && fr.FeeHeadOverrides.Contains(month))
                    .FirstOrDefaultAsync();

                if (existingRecord != null)
                {
                    _logger.LogInformation("Mess fee record for student {StudentId} month {Month} already exists ({RecordId})", studentId, month, existingRecord.Id);
                    return;
                }

                // Dedicated mess fee record — no FeeStructure; hostelFee stored in FeeHeadOverrides
                var overrideJson = System.Text.Json.JsonSerializer.Serialize(new
                {
                    hostelFee  = amount,
                    messMonth  = month,
                    messLabel  = $"Hostel Mess – {month}"
                });

                var messRecord = new FeeRecord
                {
                    Id             = Guid.NewGuid(),
                    SchoolId       = schoolId,
                    StudentId      = studentId,
                    FeeStructureId = null,
                    TotalAmount    = amount,
                    PaidAmount     = 0,
                    DiscountAmount = 0,
                    LateFeeAmount  = 0,
                    PendingAmount  = amount,
                    BalanceAmount  = amount,
                    AcademicYear   = academicYear,
                    DueDate        = new DateTime(now.Year, now.Month, 1).AddMonths(1),
                    Status         = "pending",
                    FeeHeadOverrides = overrideJson,
                    CreatedAt      = now,
                    UpdatedAt      = now
                };
                _context.FeeRecords.Add(messRecord);
                await _context.SaveChangesAsync();
                _logger.LogInformation("Created dedicated mess fee record {RecordId} for student {StudentId} — ₹{Amount} ({Month})", messRecord.Id, studentId, amount, month);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding mess billing to fee record for student {StudentId}", studentId);
            }
        }

        /// <summary>
        /// Marks the dedicated mess fee record as paid and creates a PaymentTransaction so a
        /// receipt can be generated. Targets the specific mess fee record created by
        /// AddMessBillingToFeeRecordAsync (identified by FeeHeadOverrides containing the month).
        /// Returns the new PaymentTransaction Id, or null if no matching fee record was found.
        /// </summary>
        private async Task<Guid?> RecordMessBillingPaymentOnFeeRecordAsync(Guid schoolId, Guid studentId, decimal amount, string month)
        {
            try
            {
                var (academicYear, _) = await GetCurrentAcademicYearInfoAsync(schoolId);

                // Find the dedicated mess fee record for this specific month
                var feeRecord = await _context.FeeRecords
                    .IgnoreQueryFilters()
                    .Where(fr => fr.StudentId == studentId && fr.SchoolId == schoolId && !fr.IsDeleted &&
                                 fr.FeeStructureId == null &&
                                 fr.FeeHeadOverrides != null && fr.FeeHeadOverrides.Contains(month) &&
                                 fr.Status != "paid")
                    .OrderByDescending(fr => fr.CreatedAt)
                    .FirstOrDefaultAsync();

                // Fallback: any unpaid fee record for this student (legacy / pre-migration data)
                if (feeRecord == null)
                {
                    feeRecord = await _context.FeeRecords
                        .IgnoreQueryFilters()
                        .Where(fr => fr.StudentId == studentId && fr.SchoolId == schoolId && !fr.IsDeleted &&
                                     (fr.AcademicYear == academicYear || string.IsNullOrEmpty(fr.AcademicYear)) &&
                                     fr.Status != "paid")
                        .OrderByDescending(fr => fr.CreatedAt)
                        .FirstOrDefaultAsync();
                }

                if (feeRecord == null) return null;

                var now = DateTime.UtcNow;
                var receiptNumber = $"MESS-{month.Replace("-", "")}-{Guid.NewGuid().ToString().Substring(0, 6).ToUpper()}";

                var payment = new Models.Entities.PaymentTransaction
                {
                    Id = Guid.NewGuid(),
                    SchoolId = schoolId,
                    StudentId = studentId,
                    FeeRecordId = feeRecord.Id,
                    Amount = amount,
                    Method = "cash",
                    Status = "success",
                    Date = now,
                    TransactionDate = now,
                    ReceiptNumber = receiptNumber,
                    ProcessedBy = "Hostel Office",
                    AcademicYear = string.IsNullOrEmpty(feeRecord.AcademicYear) ? academicYear : feeRecord.AcademicYear,
                    Remarks = $"Mess bill payment for {month}",
                    CreatedAt = now,
                    UpdatedAt = now
                };
                _context.PaymentTransactions.Add(payment);

                feeRecord.PaidAmount += amount;
                feeRecord.PendingAmount = Math.Max(0, feeRecord.TotalAmount - feeRecord.PaidAmount - feeRecord.DiscountAmount + feeRecord.LateFeeAmount);
                feeRecord.BalanceAmount = feeRecord.PendingAmount;
                if (feeRecord.PendingAmount <= 0) feeRecord.Status = "paid";
                else if (feeRecord.PaidAmount > 0) feeRecord.Status = "partial";
                feeRecord.LastPaymentDate = now;
                feeRecord.UpdatedAt = now;

                await _context.SaveChangesAsync();
                _logger.LogInformation("Mess billing payment ₹{Amount} ({Month}) applied to fee record {RecordId} for student {StudentId}, receipt {Receipt}",
                    amount, month, feeRecord.Id, studentId, receiptNumber);
                return payment.Id;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error recording mess billing payment on fee record for student {StudentId}", studentId);
                return null;
            }
        }

        private static HostelMessBillingResponse MapMessBilling(HostelMessBilling m) => new()
        {
            Id = m.Id, SchoolId = m.SchoolId, HostelStudentId = m.HostelStudentId,
            StudentName = m.HostelStudent?.Student != null
                ? (!string.IsNullOrWhiteSpace(m.HostelStudent.Student.FirstName)
                    ? $"{m.HostelStudent.Student.FirstName} {m.HostelStudent.Student.LastName}".Trim()
                    : m.HostelStudent.Student.Name) : string.Empty,
            Month = m.Month, Amount = m.Amount, Description = m.Description,
            IsPaid = m.IsPaid, PaidDate = m.PaidDate,
            PaymentTransactionId = null, // caller sets this after creating the transaction
            CreatedAt = m.CreatedAt, UpdatedAt = m.UpdatedAt
        };

        // ── P1: Visitor Log ─────────────────────────────────────────────────────

        public async Task<List<HostelVisitorLogResponse>> GetVisitorLogsAsync(Guid schoolId, Guid? hostelStudentId)
        {
            var q = _context.HostelVisitorLogs
                .Include(v => v.HostelStudent).ThenInclude(hs => hs!.Student)
                .Where(v => v.SchoolId == schoolId && !v.IsDeleted);
            if (hostelStudentId.HasValue) q = q.Where(v => v.HostelStudentId == hostelStudentId.Value);
            var list = await q.OrderByDescending(v => v.CheckInTime).ToListAsync();
            return list.Select(MapVisitorLog).ToList();
        }

        public async Task<HostelVisitorLogResponse> CreateVisitorLogAsync(Guid schoolId, CreateHostelVisitorLogRequest request)
        {
            var hs = await _context.HostelStudents.FirstOrDefaultAsync(s => s.Id == request.HostelStudentId && s.SchoolId == schoolId && !s.IsDeleted);
            if (hs == null) throw new KeyNotFoundException("Hostel student record not found.");
            var log = new HostelVisitorLog
            {
                Id = Guid.NewGuid(), SchoolId = schoolId, HostelStudentId = request.HostelStudentId,
                VisitorName = request.VisitorName, VisitorContact = request.VisitorContact,
                Relationship = request.Relationship, Purpose = request.Purpose,
                CheckInTime = request.CheckInTime ?? DateTime.UtcNow, Status = "checked_in",
                Notes = request.Notes, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            };
            _context.HostelVisitorLogs.Add(log);
            await _context.SaveChangesAsync();
            await _context.Entry(log).Reference(l => l.HostelStudent).LoadAsync();
            if (log.HostelStudent != null) await _context.Entry(log.HostelStudent).Reference(s => s.Student).LoadAsync();
            return MapVisitorLog(log);
        }

        public async Task<HostelVisitorLogResponse?> CheckOutVisitorAsync(Guid id, Guid schoolId)
        {
            var log = await _context.HostelVisitorLogs.Include(v => v.HostelStudent).ThenInclude(hs => hs!.Student)
                .FirstOrDefaultAsync(v => v.Id == id && v.SchoolId == schoolId && !v.IsDeleted);
            if (log == null) return null;
            log.CheckOutTime = DateTime.UtcNow; log.Status = "checked_out"; log.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return MapVisitorLog(log);
        }

        private static HostelVisitorLogResponse MapVisitorLog(HostelVisitorLog v) => new()
        {
            Id = v.Id, SchoolId = v.SchoolId, HostelStudentId = v.HostelStudentId,
            StudentName = v.HostelStudent?.Student != null
                ? (!string.IsNullOrWhiteSpace(v.HostelStudent.Student.FirstName)
                    ? $"{v.HostelStudent.Student.FirstName} {v.HostelStudent.Student.LastName}".Trim()
                    : v.HostelStudent.Student.Name) : string.Empty,
            VisitorName = v.VisitorName, VisitorContact = v.VisitorContact,
            Relationship = v.Relationship, Purpose = v.Purpose,
            CheckInTime = v.CheckInTime, CheckOutTime = v.CheckOutTime,
            Status = v.Status, Notes = v.Notes, CreatedAt = v.CreatedAt, UpdatedAt = v.UpdatedAt
        };

        // ── P1: Hostel Leave ────────────────────────────────────────────────────

        public async Task<List<HostelLeaveResponse>> GetLeavesAsync(Guid schoolId, Guid? hostelStudentId, string? status)
        {
            var q = _context.HostelLeaves
                .Include(l => l.HostelStudent).ThenInclude(hs => hs!.Student)
                .Where(l => l.SchoolId == schoolId && !l.IsDeleted);
            if (hostelStudentId.HasValue) q = q.Where(l => l.HostelStudentId == hostelStudentId.Value);
            if (!string.IsNullOrWhiteSpace(status)) q = q.Where(l => l.Status == status);
            var list = await q.OrderByDescending(l => l.CreatedAt).ToListAsync();
            return list.Select(MapLeave).ToList();
        }

        public async Task<HostelLeaveResponse> CreateLeaveAsync(Guid schoolId, CreateHostelLeaveRequest request)
        {
            var hs = await _context.HostelStudents.FirstOrDefaultAsync(s => s.Id == request.HostelStudentId && s.SchoolId == schoolId && !s.IsDeleted);
            if (hs == null) throw new KeyNotFoundException("Hostel student record not found.");
            if (request.ToDate < request.FromDate) throw new ArgumentException("ToDate must be on or after FromDate.");
            var leave = new HostelLeave
            {
                Id = Guid.NewGuid(), SchoolId = schoolId, HostelStudentId = request.HostelStudentId,
                FromDate = request.FromDate, ToDate = request.ToDate, Reason = request.Reason,
                ContactDuringLeave = request.ContactDuringLeave, Status = "pending",
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            };
            _context.HostelLeaves.Add(leave);
            await _context.SaveChangesAsync();
            await _context.Entry(leave).Reference(l => l.HostelStudent).LoadAsync();
            if (leave.HostelStudent != null) await _context.Entry(leave.HostelStudent).Reference(s => s.Student).LoadAsync();
            return MapLeave(leave);
        }

        public async Task<HostelLeaveResponse?> ApproveLeaveAsync(Guid id, Guid schoolId, Guid approvedBy, string status, string? remarks)
        {
            var leave = await _context.HostelLeaves.Include(l => l.HostelStudent).ThenInclude(hs => hs!.Student)
                .FirstOrDefaultAsync(l => l.Id == id && l.SchoolId == schoolId && !l.IsDeleted);
            if (leave == null) return null;
            if (status != "approved" && status != "rejected") throw new ArgumentException("Status must be 'approved' or 'rejected'.");
            leave.Status = status; leave.ApprovedBy = approvedBy; leave.ApprovedAt = DateTime.UtcNow;
            leave.ApprovalRemarks = remarks; leave.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return MapLeave(leave);
        }

        private static HostelLeaveResponse MapLeave(HostelLeave l) => new()
        {
            Id = l.Id, SchoolId = l.SchoolId, HostelStudentId = l.HostelStudentId,
            StudentName = l.HostelStudent?.Student != null
                ? (!string.IsNullOrWhiteSpace(l.HostelStudent.Student.FirstName)
                    ? $"{l.HostelStudent.Student.FirstName} {l.HostelStudent.Student.LastName}".Trim()
                    : l.HostelStudent.Student.Name) : string.Empty,
            FromDate = l.FromDate, ToDate = l.ToDate, Reason = l.Reason,
            ContactDuringLeave = l.ContactDuringLeave, Status = l.Status,
            ApprovedBy = l.ApprovedBy, ApprovedAt = l.ApprovedAt,
            ApprovalRemarks = l.ApprovalRemarks, CreatedAt = l.CreatedAt, UpdatedAt = l.UpdatedAt
        };
    }
}

