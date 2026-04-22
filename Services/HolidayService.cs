using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;

namespace SmsApi.Services
{
    public interface IHolidayService
    {
        Task<PaginatedResponse<HolidayBasicDto>> GetHolidaysAsync(
            Guid schoolId, HolidayFiltersDto filters, int page, int pageSize);
        Task<HolidayFullDto?>           GetHolidayByIdAsync(Guid schoolId, Guid id);
        Task<HolidayFullDto>            CreateHolidayAsync(Guid schoolId, CreateHolidayDto dto);
        Task<HolidayFullDto>            UpdateHolidayAsync(Guid schoolId, Guid id, UpdateHolidayDto dto);
        Task<bool>                      DeleteHolidayAsync(Guid schoolId, Guid id);
        Task<List<HolidayBasicDto>>     GetUpcomingHolidaysAsync(Guid schoolId, int days = 30);
        Task<HolidayStatsDto>           GetStatsAsync(Guid schoolId, string? academicYear = null);
        Task<BulkCreateHolidaysResponseDto> BulkCreateHolidaysAsync(
            Guid schoolId, BulkCreateHolidaysDto dto);
    }

    public class HolidayService : IHolidayService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<HolidayService> _logger;

        public HolidayService(AppDbContext context, ILogger<HolidayService> logger)
        {
            _context = context;
            _logger  = logger;
        }

        // ─────────────────────────────────────────────────────────────────────
        // GET LIST
        // ─────────────────────────────────────────────────────────────────────
        public async Task<PaginatedResponse<HolidayBasicDto>> GetHolidaysAsync(
            Guid schoolId, HolidayFiltersDto filters, int page, int pageSize)
        {
            // Pagination normalisation
            if (page     < 1)   page     = 1;
            if (pageSize < 1)   pageSize = 10;
            if (pageSize > 100) pageSize = 100;

            var query = _context.Holidays.Where(h => h.SchoolId == schoolId);

            if (!string.IsNullOrWhiteSpace(filters.Type))
                query = query.Where(h => h.Type == filters.Type.ToLowerInvariant());

            if (!string.IsNullOrWhiteSpace(filters.AcademicYear))
                query = query.Where(h => h.AcademicYear == filters.AcademicYear);

            if (filters.DateFrom.HasValue)
                query = query.Where(h => h.StartDate >= filters.DateFrom.Value.Date);

            if (filters.DateTo.HasValue)
                query = query.Where(h => h.StartDate <= filters.DateTo.Value.Date);

            if (filters.IsActive.HasValue)
                query = query.Where(h => h.IsActive == filters.IsActive.Value);

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderBy(h => h.StartDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(h => new HolidayBasicDto
                {
                    Id           = h.Id,
                    Name         = h.Name,
                    StartDate    = h.StartDate,
                    EndDate      = h.EndDate,
                    Type         = h.Type,
                    AcademicYear = h.AcademicYear,
                    DurationDays = h.EndDate.HasValue
                        ? (int)(h.EndDate.Value - h.StartDate).TotalDays + 1
                        : 1
                })
                .ToListAsync();

            return new PaginatedResponse<HolidayBasicDto>
            {
                Items      = items,
                TotalCount = totalCount,
                Page       = page,
                PageSize   = pageSize,
                TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
            };
        }

        // ─────────────────────────────────────────────────────────────────────
        // GET BY ID
        // ─────────────────────────────────────────────────────────────────────
        public async Task<HolidayFullDto?> GetHolidayByIdAsync(Guid schoolId, Guid id)
        {
            var h = await _context.Holidays
                .FirstOrDefaultAsync(x => x.SchoolId == schoolId && x.Id == id);

            return h == null ? null : MapToFull(h);
        }

        // ─────────────────────────────────────────────────────────────────────
        // CREATE
        // ─────────────────────────────────────────────────────────────────────
        public async Task<HolidayFullDto> CreateHolidayAsync(Guid schoolId, CreateHolidayDto dto)
        {
            ValidateCreateDto(dto);

            // Duplicate: same name (case-insensitive) on same start date for same school
            var nameLower = dto.Name.Trim().ToLowerInvariant();
            var startDate = dto.StartDate.Date;

            var duplicate = await _context.Holidays
                .AnyAsync(h => h.SchoolId == schoolId
                            && h.StartDate == startDate
                            && h.Name.ToLower() == nameLower);

            if (duplicate)
                throw new InvalidOperationException(
                    $"A holiday named '{dto.Name}' already exists on {startDate:yyyy-MM-dd} for this school.");

            var entity = new Holiday
            {
                Id           = Guid.NewGuid(),
                SchoolId     = schoolId,
                Name         = dto.Name.Trim(),
                StartDate    = startDate,
                EndDate      = dto.EndDate?.Date,
                Type         = dto.Type.ToLowerInvariant(),
                Description  = dto.Description?.Trim(),
                AcademicYear = dto.AcademicYear.Trim(),
                IsActive     = true,
                CreatedAt    = DateTime.UtcNow,
                UpdatedAt    = DateTime.UtcNow
            };

            _context.Holidays.Add(entity);
            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "Holiday '{Name}' created for school {SchoolId} on {StartDate}",
                entity.Name, schoolId, entity.StartDate);

            return MapToFull(entity);
        }

        // ─────────────────────────────────────────────────────────────────────
        // UPDATE
        // ─────────────────────────────────────────────────────────────────────
        public async Task<HolidayFullDto> UpdateHolidayAsync(Guid schoolId, Guid id, UpdateHolidayDto dto)
        {
            var entity = await _context.Holidays
                .FirstOrDefaultAsync(h => h.SchoolId == schoolId && h.Id == id)
                ?? throw new KeyNotFoundException("Holiday not found.");

            // Validate name length if provided
            if (dto.Name != null)
            {
                var trimmed = dto.Name.Trim();
                if (trimmed.Length < HolidayConstants.NameMinLength)
                    throw new ArgumentException(
                        $"Name must be at least {HolidayConstants.NameMinLength} characters.");
                if (trimmed.Length > HolidayConstants.NameMaxLength)
                    throw new ArgumentException(
                        $"Name must not exceed {HolidayConstants.NameMaxLength} characters.");
                entity.Name = trimmed;
            }

            // Validate type if provided
            if (dto.Type != null)
            {
                var typeLower = dto.Type.ToLowerInvariant();
                if (!HolidayConstants.ValidTypes.Contains(typeLower))
                    throw new ArgumentException(
                        $"Invalid type '{dto.Type}'. Valid: {string.Join(", ", HolidayConstants.ValidTypes)}.");
                entity.Type = typeLower;
            }

            // Validate description length
            if (dto.Description != null)
            {
                if (dto.Description.Length > HolidayConstants.DescMaxLength)
                    throw new ArgumentException(
                        $"Description must not exceed {HolidayConstants.DescMaxLength} characters.");
                entity.Description = dto.Description.Trim();
            }

            if (dto.StartDate.HasValue)
                entity.StartDate = dto.StartDate.Value.Date;

            if (dto.EndDate.HasValue)
                entity.EndDate = dto.EndDate.Value.Date;

            if (dto.IsActive.HasValue)
                entity.IsActive = dto.IsActive.Value;

            // Date consistency check
            if (entity.EndDate.HasValue && entity.EndDate.Value < entity.StartDate)
                throw new ArgumentException("End date cannot be before start date.");

            entity.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Holiday {Id} updated for school {SchoolId}", id, schoolId);

            return MapToFull(entity);
        }

        // ─────────────────────────────────────────────────────────────────────
        // DELETE
        // ─────────────────────────────────────────────────────────────────────
        public async Task<bool> DeleteHolidayAsync(Guid schoolId, Guid id)
        {
            var entity = await _context.Holidays
                .FirstOrDefaultAsync(h => h.SchoolId == schoolId && h.Id == id);

            if (entity == null) return false;

            _context.Holidays.Remove(entity);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Holiday {Id} deleted for school {SchoolId}", id, schoolId);
            return true;
        }

        // ─────────────────────────────────────────────────────────────────────
        // UPCOMING
        // ─────────────────────────────────────────────────────────────────────
        public async Task<List<HolidayBasicDto>> GetUpcomingHolidaysAsync(Guid schoolId, int days = 30)
        {
            if (days < 1)   days = 1;
            if (days > 365) days = 365;

            var today   = DateTime.UtcNow.Date;
            var endDate = today.AddDays(days);

            return await _context.Holidays
                .Where(h => h.SchoolId == schoolId
                         && h.IsActive
                         && h.StartDate >= today
                         && h.StartDate <= endDate)
                .OrderBy(h => h.StartDate)
                .Select(h => new HolidayBasicDto
                {
                    Id           = h.Id,
                    Name         = h.Name,
                    StartDate    = h.StartDate,
                    EndDate      = h.EndDate,
                    Type         = h.Type,
                    AcademicYear = h.AcademicYear,
                    DurationDays = h.EndDate.HasValue
                        ? (int)(h.EndDate.Value - h.StartDate).TotalDays + 1
                        : 1
                })
                .ToListAsync();
        }

        // ─────────────────────────────────────────────────────────────────────
        // STATS
        // ─────────────────────────────────────────────────────────────────────
        public async Task<HolidayStatsDto> GetStatsAsync(Guid schoolId, string? academicYear = null)
        {
            var query = _context.Holidays
                .Where(h => h.SchoolId == schoolId && h.IsActive);

            if (!string.IsNullOrWhiteSpace(academicYear))
                query = query.Where(h => h.AcademicYear == academicYear);

            var holidays = await query.ToListAsync();

            var today       = DateTime.UtcNow.Date;
            var endOfMonth  = new DateTime(today.Year, today.Month,
                                DateTime.DaysInMonth(today.Year, today.Month));
            var next30      = today.AddDays(30);

            static int CalcDuration(Holiday h) =>
                h.EndDate.HasValue
                    ? (int)(h.EndDate.Value - h.StartDate).TotalDays + 1
                    : 1;

            var next = holidays
                .Where(h => h.StartDate >= today)
                .OrderBy(h => h.StartDate)
                .FirstOrDefault();

            return new HolidayStatsDto
            {
                TotalHolidays    = holidays.Count,
                TotalDaysOff     = holidays.Sum(CalcDuration),
                UpcomingCount    = holidays.Count(h => h.StartDate >= today && h.StartDate <= next30),
                ThisMonthCount   = holidays.Count(h => h.StartDate >= today && h.StartDate <= endOfMonth),
                PublicHolidays   = holidays.Count(h => h.Type == HolidayConstants.TypePublic),
                SchoolHolidays   = holidays.Count(h => h.Type == HolidayConstants.TypeSchool),
                OptionalHolidays = holidays.Count(h => h.Type == HolidayConstants.TypeOptional),
                NationalHolidays = holidays.Count(h => h.Type == HolidayConstants.TypeNational),
                RegionalHolidays = holidays.Count(h => h.Type == HolidayConstants.TypeRegional),
                NextHolidayName  = next?.Name,
                NextHolidayDate  = next?.StartDate
            };
        }

        // ─────────────────────────────────────────────────────────────────────
        // BULK CREATE
        // ─────────────────────────────────────────────────────────────────────
        public async Task<BulkCreateHolidaysResponseDto> BulkCreateHolidaysAsync(
            Guid schoolId, BulkCreateHolidaysDto dto)
        {
            if (dto.Holidays == null || dto.Holidays.Count == 0)
                throw new ArgumentException("Holiday list cannot be empty.");

            if (dto.Holidays.Count > HolidayConstants.BulkMaxItems)
                throw new ArgumentException(
                    $"Cannot create more than {HolidayConstants.BulkMaxItems} holidays at once.");

            var response = new BulkCreateHolidaysResponseDto();

            for (var i = 0; i < dto.Holidays.Count; i++)
            {
                var item = dto.Holidays[i];
                try
                {
                    // Override schoolId from context (ignore whatever was in body)
                    item.SchoolId = schoolId;
                    var created = await CreateHolidayAsync(schoolId, item);
                    response.SuccessItems.Add(created);
                    response.Created++;
                }
                catch (Exception ex)
                {
                    response.Errors.Add(new BulkErrorItemDto
                    {
                        Index   = i,
                        Name    = item.Name ?? "(unknown)",
                        Message = ex.Message
                    });
                    response.Failed++;
                }
            }

            return response;
        }

        // ─────────────────────────────────────────────────────────────────────
        // PRIVATE HELPERS
        // ─────────────────────────────────────────────────────────────────────
        private static void ValidateCreateDto(CreateHolidayDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
                throw new ArgumentException("Holiday name is required.");

            var name = dto.Name.Trim();
            if (name.Length < HolidayConstants.NameMinLength)
                throw new ArgumentException(
                    $"Name must be at least {HolidayConstants.NameMinLength} characters.");
            if (name.Length > HolidayConstants.NameMaxLength)
                throw new ArgumentException(
                    $"Name must not exceed {HolidayConstants.NameMaxLength} characters.");

            if (string.IsNullOrWhiteSpace(dto.Type))
                throw new ArgumentException("Holiday type is required.");

            var typeLower = dto.Type.ToLowerInvariant();
            if (!HolidayConstants.ValidTypes.Contains(typeLower))
                throw new ArgumentException(
                    $"Invalid type '{dto.Type}'. Valid: {string.Join(", ", HolidayConstants.ValidTypes)}.");

            if (string.IsNullOrWhiteSpace(dto.AcademicYear))
                throw new ArgumentException("Academic year is required.");

            if (dto.AcademicYear.Length > HolidayConstants.AcademicYearMaxLength)
                throw new ArgumentException(
                    $"Academic year must not exceed {HolidayConstants.AcademicYearMaxLength} characters.");

            if (!Regex.IsMatch(dto.AcademicYear.Trim(), HolidayConstants.AcademicYearPattern))
                throw new ArgumentException(
                    "Academic year must be in YYYY-YY format (e.g. 2024-25).");

            if (dto.EndDate.HasValue && dto.EndDate.Value.Date < dto.StartDate.Date)
                throw new ArgumentException("End date cannot be before start date.");

            if (dto.Description != null && dto.Description.Length > HolidayConstants.DescMaxLength)
                throw new ArgumentException(
                    $"Description must not exceed {HolidayConstants.DescMaxLength} characters.");
        }

        private static HolidayFullDto MapToFull(Holiday h) => new()
        {
            Id           = h.Id,
            SchoolId     = h.SchoolId,
            Name         = h.Name,
            StartDate    = h.StartDate,
            EndDate      = h.EndDate,
            Type         = h.Type,
            Description  = h.Description,
            AcademicYear = h.AcademicYear,
            IsActive     = h.IsActive,
            DurationDays = h.EndDate.HasValue
                ? (int)(h.EndDate.Value - h.StartDate).TotalDays + 1
                : 1,
            CreatedAt    = h.CreatedAt,
            UpdatedAt    = h.UpdatedAt
        };
    }
}
