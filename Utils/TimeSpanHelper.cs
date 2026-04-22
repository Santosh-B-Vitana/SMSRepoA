namespace SmsApi.Utils
{
    /// <summary>
    /// Utility class for safe TimeSpan parsing and validation.
    /// Replaces unsafe TimeSpan.Parse() calls with proper error handling.
    /// </summary>
    public static class TimeSpanHelper
    {
        /// <summary>
        /// Safely parses a time string to TimeSpan.
        /// Supports formats: HH:mm, HH:mm:ss, HH:mm:ss.fff
        /// </summary>
        /// <param name="timeString">Time string to parse</param>
        /// <param name="timeSpan">Parsed TimeSpan (null if parse fails)</param>
        /// <param name="errorMessage">Error message if parse fails</param>
        /// <returns>True if parsing succeeded, false otherwise</returns>
        public static bool TryParseTimeSpan(string? timeString, out TimeSpan? timeSpan, out string? errorMessage)
        {
            timeSpan = null;
            errorMessage = null;

            // Handle null or empty strings
            if (string.IsNullOrWhiteSpace(timeString))
            {
                return true; // Empty string is valid (means null TimeSpan)
            }

            // Attempt to parse using standard TimeSpan format
            if (TimeSpan.TryParse(timeString.Trim(), out var parsedTimeSpan))
            {
                // Validate TimeSpan is within valid range (0 to 23:59:59)
                if (parsedTimeSpan.TotalHours < 0 || parsedTimeSpan.TotalHours >= 24)
                {
                    errorMessage = $"Time must be between 00:00:00 and 23:59:59, got '{timeString}'";
                    return false;
                }

                timeSpan = parsedTimeSpan;
                return true;
            }

            // If standard parse failed, provide detailed error
            errorMessage = $"Invalid time format: '{timeString}'. Expected format: HH:mm, HH:mm:ss, or HH:mm:ss.fff";
            return false;
        }

        /// <summary>
        /// Safely parses a time string to TimeSpan with exception throwing.
        /// Use TryParseTimeSpan for non-exception handling.
        /// </summary>
        /// <param name="timeString">Time string to parse</param>
        /// <returns>Parsed TimeSpan or null if input is null/empty</returns>
        /// <exception cref="ArgumentException">Thrown if format is invalid</exception>
        public static TimeSpan? ParseTimeSpan(string? timeString)
        {
            if (!TryParseTimeSpan(timeString, out var result, out var error))
            {
                throw new ArgumentException(error ?? "Failed to parse time string", nameof(timeString));
            }

            return result;
        }

        /// <summary>
        /// Validates that a CheckIn/CheckOut pair is logically valid.
        /// CheckOut must be after CheckIn if both provided.
        /// </summary>
        /// <param name="checkInTime">CheckIn TimeSpan</param>
        /// <param name="checkOutTime">CheckOut TimeSpan</param>
        /// <param name="errorMessage">Error message if validation fails</param>
        /// <returns>True if valid, false otherwise</returns>
        public static bool ValidateCheckInOutTimes(TimeSpan? checkInTime, TimeSpan? checkOutTime, out string? errorMessage)
        {
            errorMessage = null;

            // If only one is provided, that's fine
            if (checkInTime == null || checkOutTime == null)
            {
                return true;
            }

            // If both provided, CheckOut must be after CheckIn
            if (checkOutTime <= checkInTime)
            {
                errorMessage = $"CheckOut time ({checkOutTime:hh\\:mm\\:ss}) must be after CheckIn time ({checkInTime:hh\\:mm\\:ss})";
                return false;
            }

            return true;
        }

        /// <summary>
        /// Converts a TimeSpan to its 24-hour string representation.
        /// </summary>
        /// <param name="timeSpan">TimeSpan to convert</param>
        /// <returns>String in format HH:mm:ss</returns>
        public static string ToTimeString(TimeSpan? timeSpan)
        {
            if (timeSpan == null)
                return string.Empty;

            return ((TimeSpan)timeSpan).ToString(@"hh\:mm\:ss");
        }

        /// <summary>
        /// Converts a TimeSpan to its short 24-hour string representation.
        /// </summary>
        /// <param name="timeSpan">TimeSpan to convert</param>
        /// <returns>String in format HH:mm</returns>
        public static string ToTimeStringShort(TimeSpan? timeSpan)
        {
            if (timeSpan == null)
                return string.Empty;

            return ((TimeSpan)timeSpan).ToString(@"hh\:mm");
        }

        /// <summary>
        /// Validates that a time string is in proper format without throwing exceptions.
        /// </summary>
        /// <param name="timeString">Time string to validate</param>
        /// <returns>True if format is valid, false otherwise</returns>
        public static bool IsValidTimeFormat(string? timeString)
        {
            return TryParseTimeSpan(timeString, out _, out _);
        }

        /// <summary>
        /// Gets examples of valid time formats.
        /// </summary>
        /// <returns>List of valid format examples</returns>
        public static List<string> GetValidFormatExamples()
        {
            return new List<string>
            {
                "09:30",           // HH:mm
                "09:30:00",        // HH:mm:ss
                "09:30:00.500",    // HH:mm:ss.fff
                "14:45",           // Afternoon example
                "23:59:59"         // End of day
            };
        }
    }
}
