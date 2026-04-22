using System;
using System.Collections.Generic;
using System.Linq;

namespace SmsApi.Utils
{
    /// <summary>
    /// Academic Year Helper Utility
    /// Provides industry-standard academic year formatting and calculations
    /// </summary>
    public static class AcademicYearHelper
    {
        // Standard academic years in descending order
        public static readonly List<string> AvailableAcademicYears = new()
        {
            "2024-2025",
            "2023-2024",
            "2022-2023",
            "2021-2022",
            "2020-2021",
        };

        /// <summary>
        /// Get the current academic year
        /// Academic year starts in April (Indian school system)
        /// </summary>
        public static string GetCurrentAcademicYear()
        {
            var today = DateTime.Now;
            var currentYear = today.Year;
            var month = today.Month;

            // If current month is April or later, academic year starts in current year
            if (month >= 4)
            {
                return $"{currentYear}-{currentYear + 1}";
            }
            else
            {
                // If current month is before April, academic year started in previous year
                return $"{currentYear - 1}-{currentYear}";
            }
        }

        /// <summary>
        /// Format academic year for display
        /// Example: "2024-2025" -> "2024-25"
        /// </summary>
        public static string FormatAcademicYear(string year)
        {
            if (string.IsNullOrEmpty(year) || !year.Contains("-"))
                return year;

            var parts = year.Split("-");
            if (parts.Length == 2 && parts[1].Length == 4)
            {
                return $"{parts[0]}-{parts[1].Substring(2)}";
            }
            return year;
        }

        /// <summary>
        /// Parse academic year string to start and end year
        /// </summary>
        public static (int start, int end) ParseAcademicYear(string year)
        {
            if (string.IsNullOrEmpty(year) || !year.Contains("-"))
                throw new ArgumentException("Invalid academic year format", nameof(year));

            var parts = year.Split("-");
            if (parts.Length != 2)
                throw new ArgumentException("Invalid academic year format", nameof(year));

            if (!int.TryParse(parts[0], out var startYear))
                throw new ArgumentException("Invalid start year", nameof(year));

            // Handle both full year (2025) and short year (25) formats
            if (!int.TryParse(parts[1], out var endYear))
                throw new ArgumentException("Invalid end year", nameof(year));

            if (parts[1].Length == 2)
            {
                // Convert "25" to "2025"
                endYear = 2000 + endYear;
            }

            return (startYear, endYear);
        }

        /// <summary>
        /// Get academic year label with full format
        /// </summary>
        public static string GetAcademicYearLabel(string year)
        {
            return $"Academic Year {FormatAcademicYear(year)}";
        }

        /// <summary>
        /// Check if year is current academic year
        /// </summary>
        public static bool IsCurrentAcademicYear(string year)
        {
            return year == GetCurrentAcademicYear();
        }

        /// <summary>
        /// Get next academic year
        /// </summary>
        public static string? GetNextAcademicYear(string year)
        {
            var index = AvailableAcademicYears.IndexOf(year);
            if (index == -1 || index == AvailableAcademicYears.Count - 1)
                return null;
            return AvailableAcademicYears[index + 1];
        }

        /// <summary>
        /// Get previous academic year
        /// </summary>
        public static string? GetPreviousAcademicYear(string year)
        {
            var index = AvailableAcademicYears.IndexOf(year);
            if (index == -1 || index == 0)
                return null;
            return AvailableAcademicYears[index - 1];
        }

        /// <summary>
        /// Validate academic year format
        /// </summary>
        public static bool IsValidAcademicYear(string year)
        {
            return AvailableAcademicYears.Contains(year);
        }
    }
}
