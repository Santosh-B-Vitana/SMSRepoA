using System;
using System.Collections.Generic;

namespace SmsApi.Models.DTOs
{
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // Constants
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    public static class AnalyticsConstants
    {
        public static readonly IReadOnlyList<string> ValidWidgetTypes =
            new[] { "chart", "metric", "table", "map", "gauge", "list" };

        public static readonly IReadOnlyList<string> ValidChartTypes =
            new[] { "line", "bar", "pie", "area", "scatter", "bubble", "donut" };

        public static readonly IReadOnlyList<string> ValidSizes =
            new[] { "small", "medium", "large", "full" };

        public static readonly IReadOnlyList<string> ValidVisibilities =
            new[] { "all", "admin", "teacher", "parent", "student" };

        public static readonly IReadOnlyList<string> ValidRefreshIntervals =
            new[] { "manual", "1min", "5min", "15min", "30min", "1hour" };

        public static readonly IReadOnlyList<string> ValidPeriods =
            new[] { "Daily", "Weekly", "Monthly", "Quarterly", "Yearly" };

        public static readonly IReadOnlyList<string> ValidMetricTypes =
            new[] { "Enrollment", "Attendance", "Revenue", "Performance", "Library", "Health", "Transport", "Hostel" };

        public const int WidgetNameMin       = 3;
        public const int WidgetNameMax       = 200;
        public const int DescriptionMax      = 500;
        public const int DataSourceMax       = 100;
        public const int MetricNameMax       = 200;
        public const int MetricUnitMax       = 30;
        public const int MetadataMax         = 4000;
        public const int MaxDataPoints       = 90;
        public const int MinDataPoints       = 1;
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // Dashboard Widget DTOs
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    public class DashboardWidgetBasicDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string WidgetType { get; set; } = string.Empty;
        public string DataSource { get; set; } = string.Empty;
        public string? ChartType { get; set; }
        public int DisplayOrder { get; set; }
        public string Size { get; set; } = string.Empty;
        public bool IsActive { get; set; }
    }

    public class CreateDashboardWidgetRequest
    {
        public Guid SchoolId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string WidgetType { get; set; } = string.Empty;
        public string DataSource { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Configuration { get; set; }
        public string? ChartType { get; set; }
        public int DisplayOrder { get; set; } = 0;
        public string Size { get; set; } = "medium";
        public string RefreshInterval { get; set; } = "manual";
        public string Visibility { get; set; } = "all";
    }

    public class UpdateDashboardWidgetRequest
    {
        public string? Name { get; set; }
        public string? Description { get; set; }
        public string? Configuration { get; set; }
        public string? ChartType { get; set; }
        public int? DisplayOrder { get; set; }
        public string? Size { get; set; }
        public string? RefreshInterval { get; set; }
        public string? Visibility { get; set; }
        public bool? IsActive { get; set; }
    }

    public class DashboardWidgetResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string WidgetType { get; set; } = string.Empty;
        public string DataSource { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Configuration { get; set; }
        public string? ChartType { get; set; }
        public int DisplayOrder { get; set; }
        public string Size { get; set; } = string.Empty;
        public string RefreshInterval { get; set; } = string.Empty;
        public string Visibility { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class DashboardWidgetListResponse
    {
        public List<DashboardWidgetResponse> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // Raw Analytics Record DTOs
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    public class AnalyticsBasicDto
    {
        public Guid Id { get; set; }
        public string MetricType { get; set; } = string.Empty;
        public string MetricName { get; set; } = string.Empty;
        public decimal Value { get; set; }
        public string Period { get; set; } = string.Empty;
        public DateTime PeriodStart { get; set; }
        public DateTime PeriodEnd { get; set; }
    }

    public class CreateAnalyticsRequest
    {
        public Guid SchoolId { get; set; }
        public string MetricType { get; set; } = string.Empty;
        public string MetricName { get; set; } = string.Empty;
        public decimal Value { get; set; }
        public string? Unit { get; set; }
        public string Period { get; set; } = string.Empty;
        public DateTime PeriodStart { get; set; }
        public DateTime PeriodEnd { get; set; }
        public Guid? ClassId { get; set; }
        public Guid? SectionId { get; set; }
        public string? Metadata { get; set; }
    }

    public class AnalyticsResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string MetricType { get; set; } = string.Empty;
        public string MetricName { get; set; } = string.Empty;
        public decimal Value { get; set; }
        public string? Unit { get; set; }
        public string Period { get; set; } = string.Empty;
        public DateTime PeriodStart { get; set; }
        public DateTime PeriodEnd { get; set; }
        public Guid? ClassId { get; set; }
        public string? ClassName { get; set; }
        public Guid? SectionId { get; set; }
        public string? SectionName { get; set; }
        public string? Metadata { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class AnalyticsListResponse
    {
        public List<AnalyticsResponse> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // Dashboard Summary
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    public class DashboardSummaryResponse
    {
        public int TotalStudents { get; set; }
        public int TotalStaff { get; set; }
        public int TotalClasses { get; set; }
        public decimal TodayAttendancePercentage { get; set; }
        public decimal PendingFees { get; set; }
        public decimal TotalCollected { get; set; }
        public decimal TotalFees { get; set; }
        public int UpcomingExams { get; set; }
        public int PendingAssignments { get; set; }
        public int UnreadNotifications { get; set; }
        public int TodayAbsentStudents { get; set; }
        public int TodayAbsentStaff { get; set; }
        public List<AnalyticsResponse> RecentMetrics { get; set; } = new();
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // Chart Data
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    public class ChartDataResponse
    {
        public List<string> Labels { get; set; } = new();
        public List<ChartDataset> Datasets { get; set; } = new();
    }

    public class ChartDataset
    {
        public string Label { get; set; } = string.Empty;
        public List<decimal> Data { get; set; } = new();
        public string? BackgroundColor { get; set; }
        public string? BorderColor { get; set; }
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // Computed Analytics â€” Attendance
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    public class AttendanceDayDataPoint
    {
        public string Date { get; set; } = string.Empty;
        public int TotalStudents { get; set; }
        public int PresentCount { get; set; }
        public int AbsentCount { get; set; }
        public int LateCount { get; set; }
        public decimal AttendancePercentage { get; set; }
    }

    public class AttendanceAnalyticsResponse
    {
        public int TotalDays { get; set; }
        public decimal AverageAttendancePercentage { get; set; }
        public decimal HighestAttendancePercentage { get; set; }
        public decimal LowestAttendancePercentage { get; set; }
        public int PerfectAttendanceDays { get; set; }
        public List<AttendanceDayDataPoint> DailyData { get; set; } = new();
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // Computed Analytics â€” Enrollment
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    public class ClassEnrollmentDto
    {
        public Guid ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public int TotalStudents { get; set; }
        public int ActiveStudents { get; set; }
        public int? Capacity { get; set; }
        public decimal? FillPercentage { get; set; }
    }

    public class EnrollmentAnalyticsResponse
    {
        public int TotalActiveStudents { get; set; }
        public int TotalInactiveStudents { get; set; }
        public int TotalClasses { get; set; }
        public decimal AverageClassSize { get; set; }
        public List<ClassEnrollmentDto> ByClass { get; set; } = new();
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // Computed Analytics â€” Performance
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    public class SubjectPerformanceDto
    {
        public string Subject { get; set; } = string.Empty;
        public int TotalResults { get; set; }
        public decimal AveragePercentage { get; set; }
        public int PassCount { get; set; }
        public int FailCount { get; set; }
        public decimal PassRate { get; set; }
    }

    public class PerformanceAnalyticsResponse
    {
        public string? AcademicYear { get; set; }
        public int TotalExams { get; set; }
        public int TotalResults { get; set; }
        public decimal OverallAveragePercentage { get; set; }
        public decimal OverallPassRate { get; set; }
        public List<SubjectPerformanceDto> BySubject { get; set; } = new();
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // Computed Analytics â€” Fee Collection
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    public class FeeMonthDataPoint
    {
        public string Month { get; set; } = string.Empty;
        public int Year { get; set; }
        public decimal Collected { get; set; }
        public decimal Pending { get; set; }
        public decimal Overdue { get; set; }
        public int TotalRecords { get; set; }
    }

    public class FeeAnalyticsResponse
    {
        public decimal TotalBilled { get; set; }
        public decimal TotalCollected { get; set; }
        public decimal TotalPending { get; set; }
        public decimal TotalOverdue { get; set; }
        public decimal CollectionRate { get; set; }
        public List<FeeMonthDataPoint> MonthlyData { get; set; } = new();
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // Overview Stats
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    public class SchoolOverviewStatsResponse
    {
        public int TotalStudents { get; set; }
        public int ActiveStudents { get; set; }
        public int TotalStaff { get; set; }
        public int ActiveStaff { get; set; }
        public int TotalClasses { get; set; }
        public int TotalBooks { get; set; }
        public int BooksIssued { get; set; }
        public int PendingAdmissions { get; set; }
        public int OpenHealthAlerts { get; set; }
        public int HostelOccupied { get; set; }
        public int TransportStudents { get; set; }
        public decimal TodayAttendancePercentage { get; set; }
    }
}
