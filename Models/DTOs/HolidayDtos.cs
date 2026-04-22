using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SmsApi.Models.DTOs
{
    // ─────────────────────────────────────────────────────────────────────────
    // Constants
    // ─────────────────────────────────────────────────────────────────────────
    public static class HolidayConstants
    {
        public const int NameMinLength  = 3;
        public const int NameMaxLength  = 200;
        public const int DescMaxLength  = 1000;
        public const int AcademicYearMaxLength = 20;
        public const int BulkMaxItems   = 50;

        // Valid holiday types (stored lowercase)
        public const string TypePublic   = "public";
        public const string TypeSchool   = "school";
        public const string TypeOptional = "optional";
        public const string TypeNational = "national";
        public const string TypeRegional = "regional";

        public static readonly IReadOnlyList<string> ValidTypes = new[]
        {
            TypePublic, TypeSchool, TypeOptional, TypeNational, TypeRegional
        };

        // Academic year format: YYYY-YY  (e.g. 2024-25)
        public const string AcademicYearPattern = @"^\d{4}-\d{2}$";
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Response DTOs
    // ─────────────────────────────────────────────────────────────────────────

    // Basic DTO for list views
    public class HolidayBasicDto
    {
        public Guid   Id           { get; set; }
        public string Name         { get; set; } = string.Empty;
        public DateTime StartDate  { get; set; }
        public DateTime? EndDate   { get; set; }
        public string Type         { get; set; } = string.Empty;
        public string AcademicYear { get; set; } = string.Empty;
        public int    DurationDays { get; set; }
    }

    // Full DTO with all details
    public class HolidayFullDto
    {
        public Guid   Id           { get; set; }
        public Guid   SchoolId     { get; set; }
        public string Name         { get; set; } = string.Empty;
        public DateTime StartDate  { get; set; }
        public DateTime? EndDate   { get; set; }
        public string Type         { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string AcademicYear { get; set; } = string.Empty;
        public bool   IsActive     { get; set; }
        public int    DurationDays { get; set; }
        public DateTime CreatedAt  { get; set; }
        public DateTime UpdatedAt  { get; set; }
    }

    // Stats DTO
    public class HolidayStatsDto
    {
        public int TotalHolidays          { get; set; }
        public int TotalDaysOff           { get; set; }
        public int UpcomingCount          { get; set; }   // next 30 days
        public int ThisMonthCount         { get; set; }
        public int PublicHolidays         { get; set; }
        public int SchoolHolidays         { get; set; }
        public int OptionalHolidays       { get; set; }
        public int NationalHolidays       { get; set; }
        public int RegionalHolidays       { get; set; }
        public string? NextHolidayName    { get; set; }
        public DateTime? NextHolidayDate  { get; set; }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Request DTOs
    // ─────────────────────────────────────────────────────────────────────────

    // Create DTO
    public class CreateHolidayDto
    {
        // SchoolId is set server-side from tenant context; ignored if provided in body
        public Guid SchoolId { get; set; }

        [Required]
        [MaxLength(HolidayConstants.NameMaxLength)]
        public string Name { get; set; } = string.Empty;

        [Required]
        public DateTime StartDate { get; set; }

        public DateTime? EndDate { get; set; }

        [Required]
        [MaxLength(20)]
        public string Type { get; set; } = HolidayConstants.TypeSchool;

        [MaxLength(HolidayConstants.DescMaxLength)]
        public string? Description { get; set; }

        [Required]
        [MaxLength(HolidayConstants.AcademicYearMaxLength)]
        public string AcademicYear { get; set; } = string.Empty;
    }

    // Update DTO
    public class UpdateHolidayDto
    {
        [MaxLength(HolidayConstants.NameMaxLength)]
        public string? Name { get; set; }

        public DateTime? StartDate { get; set; }

        public DateTime? EndDate    { get; set; }

        [MaxLength(20)]
        public string? Type { get; set; }

        [MaxLength(HolidayConstants.DescMaxLength)]
        public string? Description { get; set; }

        public bool? IsActive { get; set; }
    }

    // Bulk-create request
    public class BulkCreateHolidaysDto
    {
        [Required]
        public List<CreateHolidayDto> Holidays { get; set; } = new();
    }

    // Bulk-create response
    public class BulkCreateHolidaysResponseDto
    {
        public int Created { get; set; }
        public int Failed  { get; set; }
        public List<HolidayFullDto>   SuccessItems { get; set; } = new();
        public List<BulkErrorItemDto> Errors       { get; set; } = new();
    }

    public class BulkErrorItemDto
    {
        public int    Index   { get; set; }
        public string Name    { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Filter / Pagination
    // ─────────────────────────────────────────────────────────────────────────

    // Filters
    public class HolidayFiltersDto
    {
        public string?   Type         { get; set; }
        public string?   AcademicYear { get; set; }
        public DateTime? DateFrom     { get; set; }
        public DateTime? DateTo       { get; set; }
        public bool?     IsActive     { get; set; }
    }

    // Response with pagination (kept for compatibility)
    public class HolidayListResponse
    {
        public List<HolidayBasicDto> Items      { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page       { get; set; }
        public int PageSize   { get; set; }
        public int TotalPages { get; set; }
    }
}
