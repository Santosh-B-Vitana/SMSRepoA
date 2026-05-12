using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SmsApi.Data;
using SmsApi.Models.Constants;
using SmsApi.Models.Entities;
using SmsApi.Models.DTOs;
using SmsApi.Utils;

#pragma warning disable CS0618 // 'StudentAttendance' is obsolete
namespace SmsApi.Services
{
    public interface IAttendanceService
    {
        // Attendance Records
        Task<PaginatedResponse<AttendanceRecordBasicDto>> GetAttendanceRecordsAsync(
            Guid schoolId, AttendanceFiltersDto filters, int page, int pageSize);
        Task<AttendanceRecordFullDto?> GetAttendanceByIdAsync(Guid schoolId, Guid id);
        Task<AttendanceRecordFullDto> MarkAttendanceAsync(Guid schoolId, MarkAttendanceDto dto, Guid userId);
        Task<List<AttendanceRecordBasicDto>> BulkMarkAttendanceAsync(
            Guid schoolId, BulkMarkAttendanceDto dto, Guid userId);
        Task<AttendanceRecordFullDto> UpdateAttendanceAsync(
            Guid schoolId, Guid id, UpdateAttendanceDto dto, Guid userId);
        Task<bool> DeleteAttendanceAsync(Guid schoolId, Guid id);

        // Leave Requests
        Task<PaginatedResponse<LeaveRequestBasicDto>> GetLeaveRequestsAsync(
            Guid schoolId, LeaveRequestFiltersDto filters, int page, int pageSize);
        Task<LeaveRequestFullDto?> GetLeaveRequestByIdAsync(Guid schoolId, Guid id);
        Task<LeaveRequestFullDto> CreateLeaveRequestAsync(Guid schoolId, CreateLeaveRequestDto dto);
        Task<LeaveRequestFullDto> ApproveLeaveRequestAsync(
            Guid schoolId, Guid id, Guid approverId, string? remarks);
        Task<LeaveRequestFullDto> RejectLeaveRequestAsync(
            Guid schoolId, Guid id, Guid approverId, string reason);

        // Statistics
        Task<AttendanceStatsDto> GetAttendanceStatsAsync(Guid schoolId, DateTime? startDate, DateTime? endDate);
        Task<List<MonthlyAttendanceDto>> GetMonthlyTrendAsync(Guid schoolId, int year);
        
        // Legacy methods for backward compatibility
        Task<List<StudentAttendanceResponse>> GetStudentAttendancesAsync(Guid schoolId, DateTime? date, Guid? studentId, string? classFilter);
        Task<StudentAttendanceResponse> CreateStudentAttendanceAsync(CreateStudentAttendanceRequest request);
        Task<bool> CreateBulkStudentAttendanceAsync(BulkStudentAttendanceRequest request);
        Task<List<StaffAttendanceResponse>> GetStaffAttendancesAsync(Guid schoolId, DateTime? date, Guid? staffId, DateTime? fromDate = null, DateTime? toDate = null);
        Task<StaffAttendanceResponse> CreateStaffAttendanceAsync(CreateStaffAttendanceRequest request);
        Task<StaffAttendanceResponse> UpdateStaffAttendanceAsync(Guid id, Guid schoolId, UpdateStaffAttendanceRequest request);
    }

    public class AttendanceService : IAttendanceService
    {
        private static readonly HashSet<string> AllowedAttendanceStatuses = new(StringComparer.OrdinalIgnoreCase)
        {
            StatusConstants.AttendanceStatus.Present,
            StatusConstants.AttendanceStatus.Absent,
            StatusConstants.AttendanceStatus.Late,
            StatusConstants.AttendanceStatus.Excused,
            StatusConstants.AttendanceStatus.HalfDay,
            StatusConstants.AttendanceStatus.AbsentWithLeave,
            "leave"
        };

        private static readonly HashSet<string> AllowedLeaveStatuses = new(StringComparer.OrdinalIgnoreCase)
        {
            StatusConstants.LeaveStatus.Pending,
            StatusConstants.LeaveStatus.Approved,
            StatusConstants.LeaveStatus.Rejected
        };

        private static readonly HashSet<string> AllowedLeaveTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            "sick",
            "casual",
            "emergency",
            "medical",
            "other"
        };

        private readonly AppDbContext _context;
        private readonly ILogger<AttendanceService> _logger;

        public AttendanceService(AppDbContext context, ILogger<AttendanceService> logger)
        {
            _context = context;
            _logger = logger;
        }

        // ========== NEW ATTENDANCE RECORDS API ==========

        public async Task<PaginatedResponse<AttendanceRecordBasicDto>> GetAttendanceRecordsAsync(
            Guid schoolId, AttendanceFiltersDto filters, int page, int pageSize)
        {
            filters ??= new AttendanceFiltersDto();
            NormalizePagination(ref page, ref pageSize);

            var query = _context.AttendanceRecords.Where(a => a.SchoolId == schoolId);

            if (filters.StudentId.HasValue)
                query = query.Where(a => a.StudentId == filters.StudentId.Value);
            if (!string.IsNullOrEmpty(filters.Status))
            {
                var normalizedStatus = NormalizeValue(filters.Status);
                ValidateAttendanceStatus(normalizedStatus);
                query = query.Where(a => a.Status.ToLower() == normalizedStatus);
            }
            if (filters.DateFrom.HasValue)
                query = query.Where(a => a.Date >= filters.DateFrom.Value);
            if (filters.DateTo.HasValue)
                query = query.Where(a => a.Date <= filters.DateTo.Value);
            if (!string.IsNullOrEmpty(filters.SearchQuery))
            {
                var search = filters.SearchQuery.Trim().ToLower();
                query = query.Where(a => 
                    a.Student != null && 
                    ((a.Student.Name != null && a.Student.Name.ToLower().Contains(search)) ||
                     (a.Student.LastName != null && a.Student.LastName.ToLower().Contains(search))));
            }

            if (filters.DateFrom.HasValue && filters.DateTo.HasValue && filters.DateFrom > filters.DateTo)
                throw new ArgumentException("DateFrom cannot be after DateTo");

            // Deduplicate by (StudentId, Date) to get only the latest record for each student-date combo
            // Materialize first, then group to avoid EF Core GroupBy with Include issues
            var allRecords = await query
                .Include(a => a.Student)
                .ToListAsync();

            var deduplicatedRecords = allRecords
                .GroupBy(a => new { a.StudentId, Date = a.Date.Date })
                .Select(g => g.OrderByDescending(a => a.UpdatedAt).First())
                .OrderByDescending(a => a.Date)
                .ToList();

            var totalCount = deduplicatedRecords.Count;
            var items = deduplicatedRecords
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(a => new AttendanceRecordBasicDto
                {
                    Id = a.Id,
                    StudentId = a.StudentId ?? Guid.Empty,
                    StudentName = a.Student != null ? a.Student.Name : "",
                    Class = a.Student != null ? a.Student.Class : "",
                    Date = a.Date,
                    Status = a.Status
                })
                .ToList();

            return new PaginatedResponse<AttendanceRecordBasicDto>
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
            };
        }

        public async Task<AttendanceRecordFullDto?> GetAttendanceByIdAsync(Guid schoolId, Guid id)
        {
            var record = await _context.AttendanceRecords
                .Include(a => a.Student)
                .FirstOrDefaultAsync(a => a.SchoolId == schoolId && a.Id == id);

            if (record == null) return null;

            return new AttendanceRecordFullDto
            {
                Id = record.Id,
                SchoolId = record.SchoolId,
                StudentId = record.StudentId ?? Guid.Empty,
                StudentName = record.Student != null ? record.Student.Name : "",
                Class = record.Student?.Class ?? "",
                Section = record.Student?.Section ?? "",
                Date = record.Date,
                Status = record.Status,
                CheckInTime = record.CheckInTime?.ToString(@"hh\:mm"),
                CheckOutTime = record.CheckOutTime?.ToString(@"hh\:mm"),
                Remarks = record.Remarks,
                MarkedBy = record.MarkedBy ?? Guid.Empty,
                MarkedByName = "",
                BiometricId = record.BiometricId,
                IsManualOverride = record.IsManualOverride,
                CreatedAt = record.CreatedAt,
                UpdatedAt = record.UpdatedAt
            };
        }

        public async Task<AttendanceRecordFullDto> MarkAttendanceAsync(Guid schoolId, MarkAttendanceDto dto, Guid userId)
        {
            if (dto == null)
                throw new ArgumentException("Attendance payload is required");
            if (dto.StudentId == Guid.Empty)
                throw new ArgumentException("StudentId is required");
            if (dto.Date.Date > DateTime.UtcNow.Date)
                throw new InvalidOperationException("Attendance date cannot be in the future");

            var normalizedStatus = NormalizeValue(dto.Status);
            ValidateAttendanceStatus(normalizedStatus);

            // VALIDATION 1: Student enrollment verification - Ensure student is enrolled for that specific date
            var studentEnrollment = await _context.Students
                .FirstOrDefaultAsync(s => s.Id == dto.StudentId && s.SchoolId == schoolId);
            if (studentEnrollment == null)
                throw new InvalidOperationException("Student not enrolled in school");
            
            // VALIDATION 2: Duplicate attendance prevention - Check if attendance already marked same day/student
            var exists = await _context.AttendanceRecords
                .AnyAsync(a => a.SchoolId == schoolId && 
                              a.StudentId == dto.StudentId && 
                              a.Date.Date == dto.Date.Date);
            if (exists)
                throw new InvalidOperationException("Attendance already marked for this student on this date");

            // VALIDATION 3: Leave type validation - If marked as leave, verify leave request exists
            if (normalizedStatus == "leave" || normalizedStatus == StatusConstants.AttendanceStatus.AbsentWithLeave)
            {
                var approvedLeave = await _context.AttendanceLeaveRequests
                    .FirstOrDefaultAsync(lr => lr.StudentId == dto.StudentId && 
                                               lr.Status.ToLower() == StatusConstants.LeaveStatus.Approved &&
                                               lr.StartDate.Date <= dto.Date.Date &&
                                               lr.EndDate.Date >= dto.Date.Date);
                if (approvedLeave == null)
                    _logger.LogWarning("No approved leave request found for student {StudentId} on {Date}", dto.StudentId, dto.Date);
            }

            // Parse and validate time strings
            TimeSpan? checkInTime = null;
            TimeSpan? checkOutTime = null;

            if (!string.IsNullOrEmpty(dto.CheckInTime))
            {
                if (!TimeSpanHelper.TryParseTimeSpan(dto.CheckInTime, out var parsedCheckIn, out var checkInError))
                    throw new ArgumentException(checkInError);
                checkInTime = parsedCheckIn;
            }

            if (!string.IsNullOrEmpty(dto.CheckOutTime))
            {
                if (!TimeSpanHelper.TryParseTimeSpan(dto.CheckOutTime, out var parsedCheckOut, out var checkOutError))
                    throw new ArgumentException(checkOutError);
                checkOutTime = parsedCheckOut;
            }

            if (checkInTime.HasValue && checkOutTime.HasValue)
            {
                if (!TimeSpanHelper.ValidateCheckInOutTimes(checkInTime.Value, checkOutTime.Value, out var timeValidationError))
                    throw new ArgumentException(timeValidationError);
            }

            var record = new AttendanceRecord
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                StudentId = dto.StudentId,
                Date = dto.Date.Date,
                Status = normalizedStatus,
                CheckInTime = checkInTime,
                CheckOutTime = checkOutTime,
                Remarks = dto.Remarks,
                MarkedBy = userId,
                IsManualOverride = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.AttendanceRecords.Add(record);
            await _context.SaveChangesAsync();

            return new AttendanceRecordFullDto
            {
                Id = record.Id,
                SchoolId = record.SchoolId,
                StudentId = record.StudentId ?? Guid.Empty,
                StudentName = studentEnrollment.Name,
                Class = studentEnrollment.Class,
                Section = studentEnrollment.Section,
                Date = record.Date,
                Status = record.Status,
                CheckInTime = record.CheckInTime?.ToString(@"hh\:mm"),
                CheckOutTime = record.CheckOutTime?.ToString(@"hh\:mm"),
                Remarks = record.Remarks,
                MarkedBy = record.MarkedBy ?? Guid.Empty,
                MarkedByName = string.Empty,
                BiometricId = record.BiometricId,
                IsManualOverride = record.IsManualOverride,
                CreatedAt = record.CreatedAt,
                UpdatedAt = record.UpdatedAt
            };
        }

        public async Task<List<AttendanceRecordBasicDto>> BulkMarkAttendanceAsync(
            Guid schoolId, BulkMarkAttendanceDto dto, Guid userId)
        {
            if (schoolId == Guid.Empty)
                throw new ArgumentException("School ID is required");

            if (dto?.Attendances == null || dto.Attendances.Count == 0)
                throw new ArgumentException("No attendance records provided");

            var distinctStudentCount = dto.Attendances.Select(a => a.StudentId).Distinct().Count();
            if (distinctStudentCount != dto.Attendances.Count)
                throw new ArgumentException("Duplicate student IDs are not allowed in bulk attendance payload");

            var date = dto.Date.Date;

            // Validate that all students exist
            var studentIds = dto.Attendances.Select(x => x.StudentId).Distinct().ToList();
            var existingStudentIds = await _context.Students
                .Where(s => s.SchoolId == schoolId && studentIds.Contains(s.Id))
                .Select(s => s.Id)
                .ToListAsync();

            var missingStudents = studentIds.Except(existingStudentIds).ToList();
            if (missingStudents.Any())
            {
                throw new ArgumentException($"Students not found in school: {string.Join(", ", missingStudents.Take(5))}");
            }

            // Get existing records for this date/students
            var existingRecordsDict = await _context.AttendanceRecords
                .Where(a => a.SchoolId == schoolId && 
                           a.Date.Date == date &&
                           a.StudentId.HasValue && studentIds.Contains(a.StudentId.Value))
                .ToDictionaryAsync(a => a.StudentId!.Value, a => a);

            var recordsToAdd = new List<AttendanceRecord>();
            var recordsToUpdate = new List<AttendanceRecord>();

            foreach (var attendance in dto.Attendances)
            {
                var normalizedStatus = NormalizeValue(attendance.Status);
                ValidateAttendanceStatus(normalizedStatus);

                TimeSpan? checkIn = null;
                TimeSpan? checkOut = null;

                // Only validate times if provided
                if (!string.IsNullOrEmpty(attendance.CheckInTime))
                {
                    if (!TimeSpanHelper.TryParseTimeSpan(attendance.CheckInTime, out var parsedCheckIn, out var checkInErr))
                        throw new ArgumentException($"Student {attendance.StudentId}: {checkInErr}");
                    checkIn = parsedCheckIn;
                }

                if (!string.IsNullOrEmpty(attendance.CheckOutTime))
                {
                    if (!TimeSpanHelper.TryParseTimeSpan(attendance.CheckOutTime, out var parsedCheckOut, out var checkOutErr))
                        throw new ArgumentException($"Student {attendance.StudentId}: {checkOutErr}");
                    checkOut = parsedCheckOut;
                }

                // Validate times if both are provided
                if (checkIn.HasValue && checkOut.HasValue)
                {
                    if (!TimeSpanHelper.ValidateCheckInOutTimes(checkIn.Value, checkOut.Value, out var timeErr))
                        throw new ArgumentException($"Student {attendance.StudentId}: {timeErr}");
                }

                if (existingRecordsDict.TryGetValue(attendance.StudentId, out var existingRecord))
                {
                    // Update existing record
                    existingRecord.Status = attendance.Status;
                    existingRecord.Status = normalizedStatus;
                    existingRecord.CheckInTime = checkIn;
                    existingRecord.CheckOutTime = checkOut;
                    existingRecord.Remarks = attendance.Remarks;
                    existingRecord.MarkedBy = userId;
                    existingRecord.IsManualOverride = true;
                    existingRecord.UpdatedAt = DateTime.UtcNow;
                    recordsToUpdate.Add(existingRecord);
                }
                else
                {
                    // Create new record
                    recordsToAdd.Add(new AttendanceRecord
                    {
                        Id = Guid.NewGuid(),
                        SchoolId = schoolId,
                        StudentId = attendance.StudentId,
                        Date = date,
                        Status = normalizedStatus,
                        CheckInTime = checkIn,
                        CheckOutTime = checkOut,
                        Remarks = attendance.Remarks,
                        MarkedBy = userId,
                        IsManualOverride = true,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                }
            }

            // Apply changes
            if (recordsToAdd.Any())
            {
                _context.AttendanceRecords.AddRange(recordsToAdd);
            }
            if (recordsToUpdate.Any())
            {
                _context.AttendanceRecords.UpdateRange(recordsToUpdate);
            }

            await _context.SaveChangesAsync();

            // Return all records (new + updated) for this batch
            var allRecordIds = recordsToAdd.Select(r => r.Id)
                .Concat(recordsToUpdate.Select(r => r.Id))
                .ToList();

            var result = await _context.AttendanceRecords
                .Include(a => a.Student)
                .Where(a => allRecordIds.Contains(a.Id))
                .Select(a => new AttendanceRecordBasicDto
                {
                    Id = a.Id,
                    StudentId = a.StudentId ?? Guid.Empty,
                    StudentName = a.Student != null ? a.Student.Name : "Unknown",
                    Date = a.Date,
                    Status = a.Status
                })
                .ToListAsync();

            return result;
        }

        public async Task<AttendanceRecordFullDto> UpdateAttendanceAsync(
            Guid schoolId, Guid id, UpdateAttendanceDto dto, Guid userId)
        {
            var record = await _context.AttendanceRecords
                .FirstOrDefaultAsync(a => a.SchoolId == schoolId && a.Id == id);

            if (record == null)
                throw new KeyNotFoundException("Attendance record not found");

            if (!string.IsNullOrEmpty(dto.Status))
            {
                var normalizedStatus = NormalizeValue(dto.Status);
                ValidateAttendanceStatus(normalizedStatus);
                record.Status = normalizedStatus;
            }
            if (!string.IsNullOrEmpty(dto.CheckInTime))
            {
                if (!TimeSpanHelper.TryParseTimeSpan(dto.CheckInTime, out var newCheckIn, out var err))
                    throw new ArgumentException(err);
                record.CheckInTime = newCheckIn;
            }
            if (!string.IsNullOrEmpty(dto.CheckOutTime))
            {
                if (!TimeSpanHelper.TryParseTimeSpan(dto.CheckOutTime, out var newCheckOut, out var err))
                    throw new ArgumentException(err);
                record.CheckOutTime = newCheckOut;
            }
            if (!TimeSpanHelper.ValidateCheckInOutTimes(record.CheckInTime, record.CheckOutTime, out var timeErr))
                throw new ArgumentException(timeErr);
            if (dto.Remarks != null)
                record.Remarks = dto.Remarks;

            record.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return await GetAttendanceByIdAsync(schoolId, id) 
                ?? throw new Exception("Failed to retrieve updated attendance");
        }

        public async Task<bool> DeleteAttendanceAsync(Guid schoolId, Guid id)
        {
            var record = await _context.AttendanceRecords
                .FirstOrDefaultAsync(a => a.SchoolId == schoolId && a.Id == id);

            if (record == null) return false;

            _context.AttendanceRecords.Remove(record);
            await _context.SaveChangesAsync();
            return true;
        }

        // ========== LEAVE REQUESTS ==========

        public async Task<PaginatedResponse<LeaveRequestBasicDto>> GetLeaveRequestsAsync(
            Guid schoolId, LeaveRequestFiltersDto filters, int page, int pageSize)
        {
            filters ??= new LeaveRequestFiltersDto();
            NormalizePagination(ref page, ref pageSize);

            var query = _context.AttendanceLeaveRequests.Where(l => l.SchoolId == schoolId);

            if (filters.StudentId.HasValue)
                query = query.Where(l => l.StudentId == filters.StudentId.Value);
            if (!string.IsNullOrEmpty(filters.Status))
            {
                var normalizedStatus = NormalizeValue(filters.Status);
                if (!AllowedLeaveStatuses.Contains(normalizedStatus))
                    throw new ArgumentException("Status must be one of: pending, approved, rejected");
                query = query.Where(l => l.Status.ToLower() == normalizedStatus);
            }
            if (!string.IsNullOrEmpty(filters.LeaveType))
            {
                var normalizedType = NormalizeValue(filters.LeaveType);
                query = query.Where(l => l.LeaveType.ToLower() == normalizedType);
            }
            if (filters.DateFrom.HasValue)
                query = query.Where(l => l.StartDate.Date >= filters.DateFrom.Value.Date);
            if (filters.DateTo.HasValue)
                query = query.Where(l => l.EndDate.Date <= filters.DateTo.Value.Date);

            var totalCount = await query.CountAsync();
            var items = await query
                .Include(l => l.Student)
                .OrderByDescending(l => l.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(l => new LeaveRequestBasicDto
                {
                    Id = l.Id,
                    StudentId = l.StudentId,
                    StudentName = l.Student != null ? l.Student.Name : "",
                    Class = l.Student != null ? l.Student.Class : "",
                    LeaveType = l.LeaveType,
                    StartDate = l.StartDate,
                    EndDate = l.EndDate,
                    Status = l.Status
                })
                .ToListAsync();

            return new PaginatedResponse<LeaveRequestBasicDto>
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
            };
        }

        public async Task<LeaveRequestFullDto?> GetLeaveRequestByIdAsync(Guid schoolId, Guid id)
        {
            var leave = await _context.AttendanceLeaveRequests
                .Include(l => l.Student)
                .Include(l => l.ApprovedByUser)
                .FirstOrDefaultAsync(l => l.SchoolId == schoolId && l.Id == id);

            if (leave == null) return null;

            return new LeaveRequestFullDto
            {
                Id = leave.Id,
                SchoolId = leave.SchoolId,
                StudentId = leave.StudentId,
                StudentName = leave.Student != null ? leave.Student.Name : "",
                Class = leave.Student?.Class ?? "",
                LeaveType = leave.LeaveType,
                StartDate = leave.StartDate,
                EndDate = leave.EndDate,
                Reason = leave.Reason,
                AttachmentUrl = leave.AttachmentUrl,
                Status = leave.Status,
                ApprovedBy = leave.ApprovedBy,
                ApprovedByName = leave.ApprovedByUser?.FirstName + " " + leave.ApprovedByUser?.LastName ?? "",
                ApprovedAt = leave.ApprovedAt,
                RejectionReason = leave.RejectionReason,
                CreatedAt = leave.CreatedAt,
                UpdatedAt = leave.UpdatedAt
            };
        }

        public async Task<LeaveRequestFullDto> CreateLeaveRequestAsync(Guid schoolId, CreateLeaveRequestDto dto)
        {
            if (dto == null)
                throw new ArgumentException("Leave request payload is required");
            if (dto.StudentId == Guid.Empty)
                throw new ArgumentException("StudentId is required");
            if (string.IsNullOrWhiteSpace(dto.Reason) || dto.Reason.Trim().Length > 1000)
                throw new InvalidOperationException("Reason is required and must be 1000 characters or fewer");
            if (dto.StartDate.Date > dto.EndDate.Date)
                throw new InvalidOperationException("StartDate cannot be after EndDate");
            if (dto.EndDate.Date < DateTime.UtcNow.Date)
                throw new InvalidOperationException("Leave request cannot end in the past");

            var normalizedLeaveType = NormalizeValue(dto.LeaveType);
            if (!AllowedLeaveTypes.Contains(normalizedLeaveType))
                throw new InvalidOperationException("LeaveType must be one of: sick, casual, emergency, medical, other");

            var studentExists = await _context.Students.AnyAsync(s => s.SchoolId == schoolId && s.Id == dto.StudentId);
            if (!studentExists)
                throw new InvalidOperationException("Student not found in school");

            var overlapExists = await _context.AttendanceLeaveRequests.AnyAsync(l =>
                l.SchoolId == schoolId &&
                l.StudentId == dto.StudentId &&
                (l.Status == StatusConstants.LeaveStatus.Pending || l.Status == StatusConstants.LeaveStatus.Approved) &&
                l.StartDate.Date <= dto.EndDate.Date &&
                l.EndDate.Date >= dto.StartDate.Date);
            if (overlapExists)
                throw new InvalidOperationException("Leave request overlaps with an existing pending or approved request");

            var leave = new StudentLeaveRequest
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                StudentId = dto.StudentId,
                LeaveType = normalizedLeaveType,
                StartDate = dto.StartDate.Date,
                EndDate = dto.EndDate.Date,
                Reason = dto.Reason.Trim(),
                AttachmentUrl = dto.AttachmentUrl,
                Status = StatusConstants.LeaveStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.AttendanceLeaveRequests.Add(leave);
            await _context.SaveChangesAsync();

            return await GetLeaveRequestByIdAsync(schoolId, leave.Id) 
                ?? throw new Exception("Failed to retrieve created leave request");
        }

        public async Task<LeaveRequestFullDto> ApproveLeaveRequestAsync(
            Guid schoolId, Guid id, Guid approverId, string? remarks)
        {
            var leave = await _context.AttendanceLeaveRequests
                .FirstOrDefaultAsync(l => l.SchoolId == schoolId && l.Id == id);

            if (leave == null)
                throw new KeyNotFoundException("Leave request not found");
            if (!leave.Status.Equals(StatusConstants.LeaveStatus.Pending, StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("Leave request has already been processed");

            leave.Status = StatusConstants.LeaveStatus.Approved;
            leave.ApprovedBy = approverId;
            leave.ApprovedAt = DateTime.UtcNow;
            leave.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return await GetLeaveRequestByIdAsync(schoolId, id) 
                ?? throw new Exception("Failed to retrieve updated leave request");
        }

        public async Task<LeaveRequestFullDto> RejectLeaveRequestAsync(
            Guid schoolId, Guid id, Guid approverId, string reason)
        {
            var leave = await _context.AttendanceLeaveRequests
                .FirstOrDefaultAsync(l => l.SchoolId == schoolId && l.Id == id);

            if (leave == null)
                throw new KeyNotFoundException("Leave request not found");
            if (!leave.Status.Equals(StatusConstants.LeaveStatus.Pending, StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("Leave request has already been processed");
            if (string.IsNullOrWhiteSpace(reason))
                throw new InvalidOperationException("Rejection reason is required");

            leave.Status = StatusConstants.LeaveStatus.Rejected;
            leave.ApprovedBy = approverId;
            leave.ApprovedAt = DateTime.UtcNow;
            leave.RejectionReason = reason.Trim();
            leave.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return await GetLeaveRequestByIdAsync(schoolId, id) 
                ?? throw new Exception("Failed to retrieve updated leave request");
        }

        // ========== STATISTICS ==========

        public async Task<AttendanceStatsDto> GetAttendanceStatsAsync(
            Guid schoolId, DateTime? startDate, DateTime? endDate)
        {
            if (startDate.HasValue && endDate.HasValue && startDate > endDate)
                throw new ArgumentException("Start date cannot be after end date");

            var query = _context.AttendanceRecords.Where(a => a.SchoolId == schoolId);

            if (startDate.HasValue)
                query = query.Where(a => a.Date >= startDate.Value);
            if (endDate.HasValue)
                query = query.Where(a => a.Date <= endDate.Value);

            // Get records and group by (StudentId, Date) to count unique attendance entries
            // This prevents counting multiple edits of the same student's attendance on the same date
            var records = await query
                .GroupBy(a => new { a.StudentId, a.Date })
                .Select(g => g.OrderByDescending(a => a.UpdatedAt).First()) // Take the LATEST edit for each student-date combination
                .ToListAsync();

            var totalPresent = records.Count(a => a.Status == "present");
            var totalAbsent = records.Count(a => a.Status == "absent");
            var totalLate = records.Count(a => a.Status == "late");
            var totalExcused = records.Count(a => a.Status == "excused");
            var totalHalfDay = records.Count(a => a.Status == "half_day");

            var total = records.Count;
            var attendanceRate = total > 0 ? (totalPresent + totalLate + totalHalfDay * 0.5m) / total * 100 : 0;

            return new AttendanceStatsDto
            {
                TotalPresent = totalPresent,
                TotalAbsent = totalAbsent,
                TotalLate = totalLate,
                TotalExcused = totalExcused,
                TotalHalfDay = totalHalfDay,
                AttendanceRate = Math.Round(attendanceRate, 2),
                AverageAttendance = Math.Round(attendanceRate, 2)
            };
        }

        public async Task<List<MonthlyAttendanceDto>> GetMonthlyTrendAsync(Guid schoolId, int year)
        {
            if (year < 2000 || year > 2100)
                throw new ArgumentException("Year must be between 2000 and 2100");

            var records = await _context.AttendanceRecords
                .Where(a => a.SchoolId == schoolId && a.Date.Year == year)
                .GroupBy(a => a.Date.Month)
                .Select(g => new
                {
                    Month = g.Key,
                    PresentCount = g.Count(a => a.Status == "present"),
                    AbsentCount = g.Count(a => a.Status == "absent"),
                    Total = g.Count()
                })
                .ToListAsync();

            var months = new[] { "January", "February", "March", "April", "May", "June", 
                               "July", "August", "September", "October", "November", "December" };

            return records.Select(r => new MonthlyAttendanceDto
            {
                Month = months[r.Month - 1],
                PresentCount = r.PresentCount,
                AbsentCount = r.AbsentCount,
                AttendanceRate = r.Total > 0 ? Math.Round((decimal)r.PresentCount / r.Total * 100, 2) : 0
            }).ToList();
        }

        // ========== LEGACY METHODS (for backward compatibility) ==========

        public async Task<List<StudentAttendanceResponse>> GetStudentAttendancesAsync(
            Guid schoolId, DateTime? date, Guid? studentId, string? classFilter)
        {
            var query = _context.StudentAttendances.Where(a => a.SchoolId == schoolId);

            if (date.HasValue)
                query = query.Where(a => a.Date.Date == date.Value.Date);
            if (studentId.HasValue)
                query = query.Where(a => a.StudentId == studentId.Value);

            // Deduplicate by (StudentId, Date) to get only the latest record for each student-date combo
            var attendances = await query
                .GroupBy(a => new { a.StudentId, Date = a.Date.Date })
                .Select(g => g.OrderByDescending(a => a.UpdatedAt).First())
                .OrderByDescending(a => a.Date)
                .Select(a => new StudentAttendanceResponse
                {
                    Id = a.Id,
                    SchoolId = a.SchoolId,
                    StudentId = a.StudentId ?? Guid.Empty,
                    Date = a.Date,
                    Status = a.Status,
                    Remarks = a.Remarks,
                    CreatedAt = a.CreatedAt,
                    UpdatedAt = a.UpdatedAt
                })
                .ToListAsync();

            return attendances;
        }

        public async Task<StudentAttendanceResponse> CreateStudentAttendanceAsync(CreateStudentAttendanceRequest request)
        {
            var exists = await _context.StudentAttendances
                .AnyAsync(a => a.SchoolId == request.SchoolId && 
                              a.StudentId == request.StudentId && 
                              a.Date.Date == request.Date.Date);

            if (exists)
                throw new InvalidOperationException("Attendance already exists for this student on this date.");

            var attendance = new StudentAttendance
            {
                Id = Guid.NewGuid(),
                SchoolId = request.SchoolId,
                StudentId = request.StudentId,
                Date = request.Date.Date,
                Status = request.Status,
                Remarks = request.Remarks,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.StudentAttendances.Add(attendance);
            await _context.SaveChangesAsync();

            return new StudentAttendanceResponse
            {
                Id = attendance.Id,
                SchoolId = attendance.SchoolId,
                StudentId = attendance.StudentId ?? Guid.Empty,
                Date = attendance.Date,
                Status = attendance.Status,
                Remarks = attendance.Remarks,
                CreatedAt = attendance.CreatedAt,
                UpdatedAt = attendance.UpdatedAt
            };
        }

        public async Task<bool> CreateBulkStudentAttendanceAsync(BulkStudentAttendanceRequest request)
        {
            var attendances = request.Attendances.Select(a => new StudentAttendance
            {
                Id = Guid.NewGuid(),
                SchoolId = request.SchoolId,
                StudentId = a.StudentId,
                Date = request.Date.Date,
                Status = a.Status,
                Remarks = a.Remarks,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            }).ToList();

            _context.StudentAttendances.AddRange(attendances);
            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<List<StaffAttendanceResponse>> GetStaffAttendancesAsync(
            Guid schoolId, DateTime? date, Guid? staffId, DateTime? fromDate = null, DateTime? toDate = null)
        {
            var query = _context.StaffAttendances.Where(a => a.SchoolId == schoolId);

            if (date.HasValue)
                query = query.Where(a => a.Date.Date == date.Value.Date);
            if (staffId.HasValue)
                query = query.Where(a => a.StaffId == staffId.Value);
            if (fromDate.HasValue)
                query = query.Where(a => a.Date.Date >= fromDate.Value.Date);
            if (toDate.HasValue)
                query = query.Where(a => a.Date.Date <= toDate.Value.Date);

            // Deduplicate by (StaffId, Date) to get only the latest record for each staff-date combo
            var attendances = await query
                .GroupBy(a => new { a.StaffId, Date = a.Date.Date })
                .Select(g => g.OrderByDescending(a => a.UpdatedAt).First())
                .OrderByDescending(a => a.Date)
                .Select(a => new StaffAttendanceResponse
                {
                    Id = a.Id,
                    SchoolId = a.SchoolId,
                    StaffId = a.StaffId,
                    Date = a.Date,
                    Status = a.Status,
                    CheckInTime = a.CheckInTime.HasValue ? a.CheckInTime.Value.TimeOfDay : (TimeSpan?)null,
                    CheckOutTime = a.CheckOutTime.HasValue ? a.CheckOutTime.Value.TimeOfDay : (TimeSpan?)null,
                    Remarks = a.Remarks,
                    CreatedAt = a.CreatedAt,
                    UpdatedAt = a.UpdatedAt
                })
                .ToListAsync();

            return attendances;
        }

        public async Task<StaffAttendanceResponse> CreateStaffAttendanceAsync(CreateStaffAttendanceRequest request)
        {
            var exists = await _context.StaffAttendances
                .AnyAsync(a => a.SchoolId == request.SchoolId && 
                              a.StaffId == request.StaffId && 
                              a.Date.Date == request.Date.Date);

            if (exists)
                throw new InvalidOperationException("Attendance already exists for this staff member on this date.");

            var attendance = new StaffAttendance
            {
                Id = Guid.NewGuid(),
                SchoolId = request.SchoolId,
                StaffId = request.StaffId,
                Date = request.Date.Date,
                Status = request.Status,
                CheckInTime = request.CheckInTime.HasValue ? request.Date.Date.Add(request.CheckInTime.Value) : (DateTime?)null,
                CheckOutTime = request.CheckOutTime.HasValue ? request.Date.Date.Add(request.CheckOutTime.Value) : (DateTime?)null,
                Remarks = request.Remarks,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.StaffAttendances.Add(attendance);
            await _context.SaveChangesAsync();

            return new StaffAttendanceResponse
            {
                Id = attendance.Id,
                SchoolId = attendance.SchoolId,
                StaffId = attendance.StaffId,
                Date = attendance.Date,
                Status = attendance.Status,
                CheckInTime = attendance.CheckInTime.HasValue ? attendance.CheckInTime.Value.TimeOfDay : (TimeSpan?)null,
                CheckOutTime = attendance.CheckOutTime.HasValue ? attendance.CheckOutTime.Value.TimeOfDay : (TimeSpan?)null,
                Remarks = attendance.Remarks,
                CreatedAt = attendance.CreatedAt,
                UpdatedAt = attendance.UpdatedAt
            };
        }

        private static string NormalizeValue(string? value) => value?.Trim().ToLowerInvariant() ?? string.Empty;

        public async Task<StaffAttendanceResponse> UpdateStaffAttendanceAsync(Guid id, Guid schoolId, UpdateStaffAttendanceRequest request)
        {
            var attendance = await _context.StaffAttendances
                .FirstOrDefaultAsync(a => a.Id == id && a.SchoolId == schoolId);

            if (attendance == null)
                throw new KeyNotFoundException($"Attendance record {id} not found.");

            attendance.Status = request.Status;
            attendance.CheckInTime = request.CheckInTime.HasValue
                ? attendance.Date.Add(request.CheckInTime.Value)
                : (DateTime?)null;
            attendance.CheckOutTime = request.CheckOutTime.HasValue
                ? attendance.Date.Add(request.CheckOutTime.Value)
                : (DateTime?)null;
            attendance.Remarks = request.Remarks;
            attendance.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return new StaffAttendanceResponse
            {
                Id = attendance.Id,
                SchoolId = attendance.SchoolId,
                StaffId = attendance.StaffId,
                Date = attendance.Date,
                Status = attendance.Status,
                CheckInTime = attendance.CheckInTime?.TimeOfDay,
                CheckOutTime = attendance.CheckOutTime?.TimeOfDay,
                Remarks = attendance.Remarks,
                CreatedAt = attendance.CreatedAt,
                UpdatedAt = attendance.UpdatedAt
            };
        }

        private static void ValidateAttendanceStatus(string status)
        {
            if (!AllowedAttendanceStatuses.Contains(status))
                throw new InvalidOperationException("Status must be one of: present, absent, late, excused, half_day, absent_with_leave, leave");
        }

        private static void NormalizePagination(ref int page, ref int pageSize)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 20;
            if (pageSize > 200) pageSize = 200;
        }
    }
}

