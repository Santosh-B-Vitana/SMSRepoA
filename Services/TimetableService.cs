using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SmsApi.Services
{
    public interface ITimetableService
    {
        Task<TimetableListResponse> GetTimetablesAsync(Guid schoolId, Guid? classId = null, Guid? sectionId = null, int page = 1, int pageSize = 10, string? academicYear = null);
        Task<TimetableResponse?> GetTimetableByIdAsync(Guid id, Guid schoolId);
        Task<TimetableDetailResponse?> GetTimetableWithPeriodsAsync(Guid id, Guid schoolId);
        Task<TimetableResponse> CreateTimetableAsync(CreateTimetableRequest request);
        Task<TimetableResponse?> UpdateTimetableAsync(Guid id, Guid schoolId, CreateTimetableRequest request);
        Task<bool> DeleteTimetableAsync(Guid id, Guid schoolId);
        
        Task<TimetablePeriodListResponse> GetPeriodsAsync(Guid timetableId);
        Task<TimetablePeriodResponse> CreatePeriodAsync(CreateTimetablePeriodRequest request);
        Task<TimetablePeriodResponse?> UpdatePeriodAsync(Guid id, UpdateTimetablePeriodRequest request);
        Task<bool> DeletePeriodAsync(Guid id);

        Task<TeacherScheduleResponse?> GetTeacherScheduleAsync(Guid teacherId, Guid schoolId);
        Task<TeacherScheduleResponse?> GetMyScheduleAsync(string email, Guid schoolId);
    }

    public class TimetableService : ITimetableService
    {
        private readonly AppDbContext _context;
        private static readonly string[] ValidDaysOfWeek = { "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday" };
        private static readonly string[] ValidTimetableStatuses = { "active", "inactive", "draft" };
        private static readonly string[] ValidPeriodTypes = { "lecture", "practical", "lab", "seminar", "tutorial", "break", "lunch" };

        public TimetableService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<TimetableListResponse> GetTimetablesAsync(Guid schoolId, Guid? classId = null, Guid? sectionId = null, int page = 1, int pageSize = 10, string? academicYear = null)
        {
            // VALIDATION: Normalize pagination bounds
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;
            if (pageSize > 100) pageSize = 100;

            var query = _context.Timetables
                .IgnoreQueryFilters()
                .Include(t => t.Class)
                .Include(t => t.Section)
                .Where(t => t.SchoolId == schoolId && !t.IsDeleted);

            if (classId.HasValue)
            {
                query = query.Where(t => t.ClassId == classId.Value);
            }

            if (sectionId.HasValue)
            {
                query = query.Where(t => t.SectionId == sectionId.Value);
            }

            if (!string.IsNullOrWhiteSpace(academicYear))
            {
                query = query.Where(t => t.AcademicYear == academicYear);
            }

            var total = await query.CountAsync();
            var timetables = await query
                .OrderByDescending(t => t.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new TimetableListResponse
            {
                Timetables = timetables.Select(MapToResponse).ToList(),
                Total = total
            };
        }

        public async Task<TimetableResponse?> GetTimetableByIdAsync(Guid id, Guid schoolId)
        {
            var timetable = await _context.Timetables
                .IgnoreQueryFilters()
                .Include(t => t.Class)
                .Include(t => t.Section)
                .FirstOrDefaultAsync(t => t.Id == id && t.SchoolId == schoolId && !t.IsDeleted);

            return timetable == null ? null : MapToResponse(timetable);
        }

        public async Task<TimetableDetailResponse?> GetTimetableWithPeriodsAsync(Guid id, Guid schoolId)
        {
            var timetable = await _context.Timetables
                .IgnoreQueryFilters()
                .Include(t => t.Class)
                .Include(t => t.Section)
                .FirstOrDefaultAsync(t => t.Id == id && t.SchoolId == schoolId && !t.IsDeleted);

            if (timetable == null) return null;

            var periods = await _context.TimetablePeriods
                .IgnoreQueryFilters()
                .Include(tp => tp.Subject)
                .Include(tp => tp.Teacher)
                .Where(tp => tp.TimetableId == id && !tp.IsDeleted)
                .OrderBy(tp => tp.DayOfWeek)
                .ThenBy(tp => tp.PeriodNumber)
                .ToListAsync();

            return new TimetableDetailResponse
            {
                Timetable = MapToResponse(timetable),
                Periods = periods.Select(MapToPeriodResponse).ToList()
            };
        }

        public async Task<TimetableResponse> CreateTimetableAsync(CreateTimetableRequest request)
        {
            // VALIDATION 1: Academic year format (YYYY/YYYY pattern)
            if (string.IsNullOrWhiteSpace(request.AcademicYear))
                throw new ArgumentException("Academic year is required");
            if (request.AcademicYear.Length > 20)
                throw new ArgumentException("Academic year must be 20 characters or less");
            
            // VALIDATION 2: Status enum validation
            var status = request.Status?.ToLower() ?? "active";
            if (!ValidTimetableStatuses.Contains(status))
                throw new ArgumentException($"Status must be one of: {string.Join(", ", ValidTimetableStatuses)}");

            // VALIDATION 3: Class exists and belongs to school
            var classExists = await _context.Classes
                .IgnoreQueryFilters()
                .AnyAsync(c => c.Id == request.ClassId && c.SchoolId == request.SchoolId && !c.IsDeleted);
            if (!classExists)
                throw new InvalidOperationException("Class does not exist in this school");

            // VALIDATION 4: Verify section exists (if provided)
            if (request.SectionId.HasValue && request.SectionId != Guid.Empty)
            {
                var sectionExists = await _context.Sections
                    .IgnoreQueryFilters()
                    .AnyAsync(s => s.Id == request.SectionId && s.ClassId == request.ClassId && !s.IsDeleted);
                if (!sectionExists)
                    throw new InvalidOperationException("Section does not exist for this class");
            }

            // VALIDATION 5: Prevent duplicate timetables for same class/section/academic year
            var existingTimetable = await _context.Timetables
                .IgnoreQueryFilters()
                .AnyAsync(t => t.ClassId == request.ClassId &&
                              (request.SectionId == null || request.SectionId == Guid.Empty ? t.SectionId == null : t.SectionId == request.SectionId) &&
                              t.AcademicYear == request.AcademicYear &&
                              t.SchoolId == request.SchoolId &&
                              !t.IsDeleted);
            if (existingTimetable)
                throw new InvalidOperationException("Timetable already exists for this class/section in the academic year");

            var timetable = new Timetable
            {
                Id = Guid.NewGuid(),
                SchoolId = request.SchoolId,
                ClassId = request.ClassId,
                SectionId = request.SectionId == Guid.Empty ? null : request.SectionId,
                AcademicYear = request.AcademicYear,
                Status = status,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                IsDeleted = false
            };

            _context.Timetables.Add(timetable);
            await _context.SaveChangesAsync();

            return MapToResponse(timetable);
        }

        public async Task<TimetableResponse?> UpdateTimetableAsync(Guid id, Guid schoolId, CreateTimetableRequest request)
        {
            var timetable = await _context.Timetables
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(t => t.Id == id && t.SchoolId == schoolId && !t.IsDeleted);

            if (timetable == null) 
                throw new KeyNotFoundException("Timetable not found");

            // VALIDATION 1: Academic year format
            if (!string.IsNullOrWhiteSpace(request.AcademicYear))
            {
                if (request.AcademicYear.Length > 20)
                    throw new ArgumentException("Academic year must be 20 characters or less");
                timetable.AcademicYear = request.AcademicYear;
            }

            // VALIDATION 2: Status enum validation
            var status = request.Status?.ToLower() ?? timetable.Status;
            if (!ValidTimetableStatuses.Contains(status))
                throw new ArgumentException($"Status must be one of: {string.Join(", ", ValidTimetableStatuses)}");
            timetable.Status = status;

            timetable.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return MapToResponse(timetable);
        }

        public async Task<bool> DeleteTimetableAsync(Guid id, Guid schoolId)
        {
            var timetable = await _context.Timetables
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(t => t.Id == id && t.SchoolId == schoolId && !t.IsDeleted);

            if (timetable == null) 
                return false;

            timetable.IsDeleted = true;
            timetable.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<TimetablePeriodListResponse> GetPeriodsAsync(Guid timetableId)
        {
            var periods = await _context.TimetablePeriods
                .IgnoreQueryFilters()
                .Include(tp => tp.Subject)
                .Include(tp => tp.Teacher)
                .Where(tp => tp.TimetableId == timetableId && !tp.IsDeleted)
                .OrderBy(tp => tp.DayOfWeek)
                .ThenBy(tp => tp.PeriodNumber)
                .ToListAsync();

            return new TimetablePeriodListResponse
            {
                Periods = periods.Select(MapToPeriodResponse).ToList(),
                Total = periods.Count
            };
        }

        public async Task<TimetablePeriodResponse> CreatePeriodAsync(CreateTimetablePeriodRequest request)
        {
            // VALIDATION 1: Timetable exists
            var timetableExists = await _context.Timetables
                .IgnoreQueryFilters()
                .AnyAsync(t => t.Id == request.TimetableId && !t.IsDeleted);
            if (!timetableExists)
                throw new KeyNotFoundException("Timetable not found");

            // VALIDATION 2: Day of week validation
            if (string.IsNullOrWhiteSpace(request.DayOfWeek))
                throw new ArgumentException("Day of week is required");
            
            var dayOfWeek = request.DayOfWeek.Trim();
            if (!ValidDaysOfWeek.Contains(dayOfWeek, StringComparer.OrdinalIgnoreCase))
                throw new ArgumentException($"Day of week must be one of: {string.Join(", ", ValidDaysOfWeek)}");

            // VALIDATION 3: Period number validation (1-9 typical school periods)
            if (request.PeriodNumber < 1 || request.PeriodNumber > 9)
                throw new ArgumentException("Period number must be between 1 and 9");

            // VALIDATION 4: Time range validation
            if (request.StartTime >= request.EndTime)
                throw new ArgumentException("Start time must be before end time");

            // VALIDATION 5: Time range within school hours (6 AM to 6 PM)
            if (request.StartTime.Hours < 6 || request.EndTime.Hours > 18)
                throw new ArgumentException("Period times must be within school hours (6 AM to 6 PM)");

            // VALIDATION 6: Period duration (max 2 hours per period)
            var duration = request.EndTime - request.StartTime;
            if (duration.TotalHours > 2)
                throw new ArgumentException("Period duration cannot exceed 2 hours");

            // VALIDATION 7: Detect overlapping periods for same day
            var overlappingPeriod = await _context.TimetablePeriods
                .IgnoreQueryFilters()
                .AnyAsync(tp => tp.TimetableId == request.TimetableId &&
                               tp.DayOfWeek.ToUpper() == dayOfWeek.ToUpper() &&
                               tp.PeriodNumber == request.PeriodNumber &&
                               !tp.IsDeleted);
            if (overlappingPeriod)
                throw new InvalidOperationException("A period already exists for this timetable on this day with this period number");

            // VALIDATION 8: Subject exists (if provided)
            if (request.SubjectId.HasValue && request.SubjectId != Guid.Empty)
            {
                var subjectExists = await _context.Subjects
                    .IgnoreQueryFilters()
                    .AnyAsync(s => s.Id == request.SubjectId && !s.IsDeleted);
                if (!subjectExists)
                    throw new KeyNotFoundException("Subject not found");
            }

            // VALIDATION 9: Teacher exists (if provided)
            if (request.TeacherId.HasValue && request.TeacherId != Guid.Empty)
            {
                var teacherExists = await _context.StaffMembers
                    .IgnoreQueryFilters()
                    .AnyAsync(s => s.Id == request.TeacherId && !s.IsDeleted);
                if (!teacherExists)
                    throw new KeyNotFoundException("Teacher not found");

                // VALIDATION 10: Check for teacher scheduling conflicts
                var conflictingPeriods = await _context.TimetablePeriods
                    .IgnoreQueryFilters()
                    .Include(tp => tp.Timetable).ThenInclude(t => t!.Class)
                    .Include(tp => tp.Timetable).ThenInclude(t => t!.Section)
                    .Include(tp => tp.Subject)
                    .Where(tp => tp.TeacherId == request.TeacherId &&
                                tp.DayOfWeek.ToUpper() == dayOfWeek.ToUpper() &&
                                !tp.IsDeleted &&
                                tp.StartTime < request.EndTime && tp.EndTime > request.StartTime)
                    .ToListAsync();
                if (conflictingPeriods.Count > 0)
                {
                    if (!request.ForceOverride)
                    {
                        var first = conflictingPeriods.First();
                        throw new TeacherConflictException(new TeacherConflictInfo
                        {
                            ConflictingPeriodId = first.Id,
                            ClassName = first.Timetable?.Class?.Name ?? "Unknown Class",
                            SectionName = first.Timetable?.Section?.Name,
                            SubjectName = first.Subject?.Name,
                            DayOfWeek = first.DayOfWeek,
                            StartTime = first.StartTime.ToString(@"hh\:mm"),
                            EndTime = first.EndTime.ToString(@"hh\:mm"),
                        });
                    }
                    // ForceOverride: soft-delete all conflicting periods — they will be replaced
                    foreach (var cp in conflictingPeriods)
                    {
                        cp.IsDeleted = true;
                        cp.UpdatedAt = DateTime.UtcNow;
                    }
                }
            }

            // VALIDATION 11: Period type validation (if provided)
            if (!string.IsNullOrWhiteSpace(request.PeriodType))
            {
                var periodType = request.PeriodType.Trim().ToLower();
                if (!ValidPeriodTypes.Contains(periodType))
                    throw new ArgumentException($"Period type must be one of: {string.Join(", ", ValidPeriodTypes)}");
            }

            // VALIDATION 12: Room field length
            if (request.Room != null && request.Room.Length > 200)
                throw new ArgumentException("Room field must be 200 characters or less");

            // VALIDATION 13: Notes field length
            if (request.Notes != null && request.Notes.Length > 500)
                throw new ArgumentException("Notes field must be 500 characters or less");

            var period = new TimetablePeriod
            {
                Id = Guid.NewGuid(),
                TimetableId = request.TimetableId,
                DayOfWeek = dayOfWeek,
                PeriodNumber = request.PeriodNumber,
                StartTime = request.StartTime,
                EndTime = request.EndTime,
                SubjectId = request.SubjectId == Guid.Empty ? null : request.SubjectId,
                TeacherId = request.TeacherId == Guid.Empty ? null : request.TeacherId,
                PeriodType = request.PeriodType?.Trim().ToLower(),
                Room = request.Room?.Trim(),
                Notes = request.Notes?.Trim(),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                IsDeleted = false
            };

            _context.TimetablePeriods.Add(period);
            await _context.SaveChangesAsync();

            return MapToPeriodResponse(period);
        }

        public async Task<TimetablePeriodResponse?> UpdatePeriodAsync(Guid id, UpdateTimetablePeriodRequest request)
        {
            var period = await _context.TimetablePeriods
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(tp => tp.Id == id && !tp.IsDeleted);

            if (period == null) 
                throw new KeyNotFoundException("Period not found");

            // VALIDATION 1: Time range validation
            var startTime = request.StartTime ?? period.StartTime;
            var endTime = request.EndTime ?? period.EndTime;

            if (startTime >= endTime)
                throw new ArgumentException("Start time must be before end time");

            // VALIDATION 2: Time range within school hours
            if (startTime.Hours < 6 || endTime.Hours > 18)
                throw new ArgumentException("Period times must be within school hours (6 AM to 6 PM)");

            // VALIDATION 3: Period duration (max 2 hours)
            var duration = endTime - startTime;
            if (duration.TotalHours > 2)
                throw new ArgumentException("Period duration cannot exceed 2 hours");

            if (request.StartTime.HasValue) period.StartTime = request.StartTime.Value;
            if (request.EndTime.HasValue) period.EndTime = request.EndTime.Value;

            // VALIDATION 4: Subject exists (if provided)
            if (request.SubjectId.HasValue && request.SubjectId != Guid.Empty)
            {
                var subjectExists = await _context.Subjects
                    .IgnoreQueryFilters()
                    .AnyAsync(s => s.Id == request.SubjectId && !s.IsDeleted);
                if (!subjectExists)
                    throw new KeyNotFoundException("Subject not found");
                period.SubjectId = request.SubjectId;
            }

            // VALIDATION 5: Teacher exists (if provided)
            if (request.TeacherId.HasValue && request.TeacherId != Guid.Empty)
            {
                var teacherExists = await _context.StaffMembers
                    .IgnoreQueryFilters()
                    .AnyAsync(s => s.Id == request.TeacherId && !s.IsDeleted);
                if (!teacherExists)
                    throw new KeyNotFoundException("Teacher not found");

                // VALIDATION 6: Check for teacher scheduling conflicts (excluding current period)
                var conflictingPeriods = await _context.TimetablePeriods
                    .IgnoreQueryFilters()
                    .Include(tp => tp.Timetable).ThenInclude(t => t!.Class)
                    .Include(tp => tp.Timetable).ThenInclude(t => t!.Section)
                    .Include(tp => tp.Subject)
                    .Where(tp => tp.TeacherId == request.TeacherId &&
                                tp.Id != id &&
                                tp.DayOfWeek.ToUpper() == period.DayOfWeek.ToUpper() &&
                                !tp.IsDeleted &&
                                tp.StartTime < endTime && tp.EndTime > startTime)
                    .ToListAsync();
                if (conflictingPeriods.Count > 0)
                {
                    if (!request.ForceOverride)
                    {
                        var first = conflictingPeriods.First();
                        throw new TeacherConflictException(new TeacherConflictInfo
                        {
                            ConflictingPeriodId = first.Id,
                            ClassName = first.Timetable?.Class?.Name ?? "Unknown Class",
                            SectionName = first.Timetable?.Section?.Name,
                            SubjectName = first.Subject?.Name,
                            DayOfWeek = first.DayOfWeek,
                            StartTime = first.StartTime.ToString(@"hh\:mm"),
                            EndTime = first.EndTime.ToString(@"hh\:mm"),
                        });
                    }
                    // ForceOverride: soft-delete all conflicting periods — they will be replaced
                    foreach (var cp in conflictingPeriods)
                    {
                        cp.IsDeleted = true;
                        cp.UpdatedAt = DateTime.UtcNow;
                    }
                }
                
                period.TeacherId = request.TeacherId;
            }

            // VALIDATION 7: Period type validation (if provided)
            if (!string.IsNullOrWhiteSpace(request.PeriodType))
            {
                var periodType = request.PeriodType.Trim().ToLower();
                if (!ValidPeriodTypes.Contains(periodType))
                    throw new ArgumentException($"Period type must be one of: {string.Join(", ", ValidPeriodTypes)}");
                period.PeriodType = periodType;
            }

            // VALIDATION 8: Room field length
            if (request.Room != null && request.Room.Length > 200)
                throw new ArgumentException("Room field must be 200 characters or less");
            if (request.Room != null) period.Room = request.Room.Trim();

            // VALIDATION 9: Notes field length
            if (request.Notes != null && request.Notes.Length > 500)
                throw new ArgumentException("Notes field must be 500 characters or less");
            if (request.Notes != null) period.Notes = request.Notes.Trim();

            period.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return MapToPeriodResponse(period);
        }

        public async Task<bool> DeletePeriodAsync(Guid id)
        {
            var period = await _context.TimetablePeriods
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(tp => tp.Id == id && !tp.IsDeleted);

            if (period == null) 
                return false;

            period.IsDeleted = true;
            period.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<TeacherScheduleResponse?> GetMyScheduleAsync(string email, Guid schoolId)
        {
            var teacher = await _context.StaffMembers
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(s => s.Email.ToLower() == email.ToLower() && s.SchoolId == schoolId && !s.IsDeleted);
            if (teacher == null) return null;
            return await GetTeacherScheduleAsync(teacher.Id, schoolId);
        }

        public async Task<TeacherScheduleResponse?> GetTeacherScheduleAsync(Guid teacherId, Guid schoolId)
        {
            var teacher = await _context.StaffMembers
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(s => s.Id == teacherId && s.SchoolId == schoolId && !s.IsDeleted);

            if (teacher == null) return null;

            var periods = await _context.TimetablePeriods
                .IgnoreQueryFilters()
                .Include(tp => tp.Timetable)
                    .ThenInclude(t => t!.Class)
                .Include(tp => tp.Timetable)
                    .ThenInclude(t => t!.Section)
                .Include(tp => tp.Subject)
                .Where(tp => tp.TeacherId == teacherId && !tp.IsDeleted && tp.Timetable != null && tp.Timetable.SchoolId == schoolId)
                .OrderBy(tp => tp.DayOfWeek)
                .ThenBy(tp => tp.PeriodNumber)
                .ToListAsync();

            var teacherName = teacher.Name ?? $"{teacher.FirstName} {teacher.LastName}".Trim();

            return new TeacherScheduleResponse
            {
                TeacherId = teacherId,
                TeacherName = teacherName,
                Schedule = periods.Select(p => new TeacherPeriodEntry
                {
                    PeriodId = p.Id,
                    DayOfWeek = p.DayOfWeek,
                    PeriodNumber = p.PeriodNumber,
                    StartTime = p.StartTime,
                    EndTime = p.EndTime,
                    SubjectId = p.SubjectId,
                    SubjectName = p.Subject?.Name,
                    TimetableId = p.TimetableId,
                    ClassId = p.Timetable!.ClassId,
                    ClassName = p.Timetable.Class?.Name,
                    SectionId = p.Timetable.SectionId,
                    SectionName = p.Timetable.Section?.Name,
                    PeriodType = p.PeriodType,
                    Room = p.Room
                }).ToList(),
                TotalPeriods = periods.Count
            };
        }

        private static TimetableResponse MapToResponse(Timetable timetable)
        {
            return new TimetableResponse
            {
                Id = timetable.Id,
                SchoolId = timetable.SchoolId,
                ClassId = timetable.ClassId,
                ClassName = timetable.Class?.Name,
                SectionId = timetable.SectionId,
                SectionName = timetable.Section?.Name,
                AcademicYear = timetable.AcademicYear,
                Status = timetable.Status,
                CreatedAt = timetable.CreatedAt,
                UpdatedAt = timetable.UpdatedAt
            };
        }

        private static TimetablePeriodResponse MapToPeriodResponse(TimetablePeriod period)
        {
            return new TimetablePeriodResponse
            {
                Id = period.Id,
                TimetableId = period.TimetableId,
                DayOfWeek = period.DayOfWeek,
                PeriodNumber = period.PeriodNumber,
                StartTime = period.StartTime,
                EndTime = period.EndTime,
                SubjectId = period.SubjectId,
                SubjectName = period.Subject?.Name,
                SubjectCode = period.Subject?.Code,
                TeacherId = period.TeacherId,
                TeacherName = period.Teacher != null ? (period.Teacher.Name ?? $"{period.Teacher.FirstName} {period.Teacher.LastName}".Trim()) : null,
                PeriodType = period.PeriodType,
                Room = period.Room,
                Notes = period.Notes,
                CreatedAt = period.CreatedAt,
                UpdatedAt = period.UpdatedAt
            };
        }
    }
}

