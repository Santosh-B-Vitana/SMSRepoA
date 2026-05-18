using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using SmsApi.Data;
using SmsApi.Models.Entities;
using SmsApi.Models.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Text.Json;

namespace SmsApi.Services
{
    public interface IAnalyticsService
    {
        // Dashboard Widgets
        Task<DashboardWidgetListResponse> GetDashboardWidgetsAsync(Guid schoolId, string? visibility = null);
        Task<DashboardWidgetResponse?> GetDashboardWidgetByIdAsync(Guid widgetId, Guid schoolId);
        Task<DashboardWidgetResponse> CreateDashboardWidgetAsync(CreateDashboardWidgetRequest request);
        Task<DashboardWidgetResponse> UpdateDashboardWidgetAsync(Guid widgetId, UpdateDashboardWidgetRequest request, Guid schoolId);
        Task<bool> DeleteDashboardWidgetAsync(Guid widgetId, Guid schoolId);

        // Raw Analytics Records
        Task<AnalyticsListResponse> GetAnalyticsAsync(Guid schoolId, int page = 1, int pageSize = 10, string? metricType = null, string? period = null);
        Task<AnalyticsResponse?> GetAnalyticsByIdAsync(Guid analyticsId, Guid schoolId);
        Task<AnalyticsResponse> CreateAnalyticsAsync(CreateAnalyticsRequest request);
        Task<bool> DeleteAnalyticsAsync(Guid analyticsId, Guid schoolId);
        Task<List<AnalyticsResponse>> GetMetricsByPeriodAsync(Guid schoolId, string metricType, DateTime startDate, DateTime endDate);

        // Dashboard & Charts
        Task<DashboardSummaryResponse> GetDashboardSummaryAsync(Guid schoolId, bool forceRefresh = false);
        Task<ChartDataResponse> GetChartDataAsync(Guid schoolId, string metricType, string period, int dataPoints = 7);

        // Computed Analytics
        Task<SchoolOverviewStatsResponse> GetOverviewStatsAsync(Guid schoolId);
        Task<AttendanceAnalyticsResponse> GetAttendanceAnalyticsAsync(Guid schoolId, int days = 30);
        Task<EnrollmentAnalyticsResponse> GetEnrollmentAnalyticsAsync(Guid schoolId);
        Task<PerformanceAnalyticsResponse> GetPerformanceAnalyticsAsync(Guid schoolId, string? academicYear = null);
        Task<FeeAnalyticsResponse> GetFeeAnalyticsAsync(Guid schoolId, int months = 6);
    }

    public class AnalyticsService : IAnalyticsService
    {
        private readonly AppDbContext _context;
        private readonly IDistributedCache _cache;

        public AnalyticsService(AppDbContext context, IDistributedCache cache)
        {
            _context = context;
            _cache = cache;
        }

        // Dashboard Widgets

        public async Task<DashboardWidgetListResponse> GetDashboardWidgetsAsync(Guid schoolId, string? visibility = null)
        {
            var query = _context.DashboardWidgets
                .Where(w => w.SchoolId == schoolId && w.IsActive);

            if (!string.IsNullOrWhiteSpace(visibility))
                query = query.Where(w => w.Visibility.ToLower() == visibility.ToLower()
                                      || w.Visibility.ToLower() == "all");

            var items = await query
                .OrderBy(w => w.DisplayOrder)
                .ThenBy(w => w.Name)
                .AsNoTracking()
                .ToListAsync();

            return new DashboardWidgetListResponse
            {
                Items = items.Select(MapToWidgetResponse).ToList(),
                TotalCount = items.Count,
                Page = 1,
                PageSize = items.Count,
                TotalPages = 1
            };
        }

        public async Task<DashboardWidgetResponse?> GetDashboardWidgetByIdAsync(Guid widgetId, Guid schoolId)
        {
            var widget = await _context.DashboardWidgets
                .AsNoTracking()
                .FirstOrDefaultAsync(w => w.Id == widgetId && w.SchoolId == schoolId);

            return widget is null ? null : MapToWidgetResponse(widget);
        }

        public async Task<DashboardWidgetResponse> CreateDashboardWidgetAsync(CreateDashboardWidgetRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                throw new ArgumentException("Widget name is required.");

            if (request.Name.Length > AnalyticsConstants.WidgetNameMax)
                throw new ArgumentException($"Widget name cannot exceed {AnalyticsConstants.WidgetNameMax} characters.");

            if (string.IsNullOrWhiteSpace(request.WidgetType) ||
                !AnalyticsConstants.ValidWidgetTypes.Contains(request.WidgetType.ToLower()))
                throw new ArgumentException($"Invalid widget type. Allowed: {string.Join(", ", AnalyticsConstants.ValidWidgetTypes)}.");

            if (!string.IsNullOrWhiteSpace(request.ChartType) &&
                !AnalyticsConstants.ValidChartTypes.Contains(request.ChartType.ToLower()))
                throw new ArgumentException($"Invalid chart type. Allowed: {string.Join(", ", AnalyticsConstants.ValidChartTypes)}.");

            if (!string.IsNullOrWhiteSpace(request.Size) &&
                !AnalyticsConstants.ValidSizes.Contains(request.Size.ToLower()))
                throw new ArgumentException($"Invalid size. Allowed: {string.Join(", ", AnalyticsConstants.ValidSizes)}.");

            if (!string.IsNullOrWhiteSpace(request.Visibility) &&
                !AnalyticsConstants.ValidVisibilities.Contains(request.Visibility.ToLower()))
                throw new ArgumentException($"Invalid visibility. Allowed: {string.Join(", ", AnalyticsConstants.ValidVisibilities)}.");

            var nameExists = await _context.DashboardWidgets.AnyAsync(w =>
                w.SchoolId == request.SchoolId && w.Name == request.Name && w.IsActive);

            if (nameExists)
                throw new InvalidOperationException("A widget with this name already exists for the school.");

            var widget = new DashboardWidget
            {
                Id = Guid.NewGuid(),
                SchoolId = request.SchoolId,
                Name = request.Name.Trim(),
                WidgetType = request.WidgetType.ToLower(),
                DataSource = request.DataSource,
                Description = request.Description,
                Configuration = request.Configuration,
                ChartType = string.IsNullOrWhiteSpace(request.ChartType) ? null : request.ChartType.ToLower(),
                DisplayOrder = request.DisplayOrder,
                Size = string.IsNullOrWhiteSpace(request.Size) ? "medium" : request.Size.ToLower(),
                RefreshInterval = string.IsNullOrWhiteSpace(request.RefreshInterval) ? "manual" : request.RefreshInterval.ToLower(),
                Visibility = string.IsNullOrWhiteSpace(request.Visibility) ? "all" : request.Visibility.ToLower(),
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.DashboardWidgets.Add(widget);
            await _context.SaveChangesAsync();
            return MapToWidgetResponse(widget);
        }

        public async Task<DashboardWidgetResponse> UpdateDashboardWidgetAsync(Guid widgetId, UpdateDashboardWidgetRequest request, Guid schoolId)
        {
            var widget = await _context.DashboardWidgets
                .FirstOrDefaultAsync(w => w.Id == widgetId && w.SchoolId == schoolId);

            if (widget is null)
                throw new KeyNotFoundException("Dashboard widget not found.");

            if (request.Name is not null)
            {
                if (string.IsNullOrWhiteSpace(request.Name))
                    throw new ArgumentException("Widget name cannot be blank.");
                if (request.Name.Length > AnalyticsConstants.WidgetNameMax)
                    throw new ArgumentException($"Widget name cannot exceed {AnalyticsConstants.WidgetNameMax} characters.");
                widget.Name = request.Name.Trim();
            }

            if (request.ChartType is not null && request.ChartType.Length > 0 &&
                !AnalyticsConstants.ValidChartTypes.Contains(request.ChartType.ToLower()))
                throw new ArgumentException($"Invalid chart type. Allowed: {string.Join(", ", AnalyticsConstants.ValidChartTypes)}.");

            if (request.Size is not null && request.Size.Length > 0 &&
                !AnalyticsConstants.ValidSizes.Contains(request.Size.ToLower()))
                throw new ArgumentException($"Invalid size. Allowed: {string.Join(", ", AnalyticsConstants.ValidSizes)}.");

            if (request.Visibility is not null && request.Visibility.Length > 0 &&
                !AnalyticsConstants.ValidVisibilities.Contains(request.Visibility.ToLower()))
                throw new ArgumentException($"Invalid visibility. Allowed: {string.Join(", ", AnalyticsConstants.ValidVisibilities)}.");

            if (request.Description is not null) widget.Description = request.Description;
            if (request.Configuration is not null) widget.Configuration = request.Configuration;
            if (request.ChartType is not null) widget.ChartType = request.ChartType.Length == 0 ? null : request.ChartType.ToLower();
            if (request.DisplayOrder.HasValue) widget.DisplayOrder = request.DisplayOrder.Value;
            if (request.Size is not null && request.Size.Length > 0) widget.Size = request.Size.ToLower();
            if (request.RefreshInterval is not null) widget.RefreshInterval = request.RefreshInterval;
            if (request.Visibility is not null && request.Visibility.Length > 0) widget.Visibility = request.Visibility.ToLower();
            if (request.IsActive.HasValue) widget.IsActive = request.IsActive.Value;

            widget.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return MapToWidgetResponse(widget);
        }

        public async Task<bool> DeleteDashboardWidgetAsync(Guid widgetId, Guid schoolId)
        {
            var widget = await _context.DashboardWidgets
                .FirstOrDefaultAsync(w => w.Id == widgetId && w.SchoolId == schoolId);

            if (widget is null)
                return false;

            _context.DashboardWidgets.Remove(widget);
            await _context.SaveChangesAsync();
            return true;
        }

        // Raw Analytics Records

        public async Task<AnalyticsListResponse> GetAnalyticsAsync(Guid schoolId, int page = 1, int pageSize = 10, string? metricType = null, string? period = null)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;
            if (pageSize > 100) pageSize = 100;

            var query = _context.AnalyticsRecords
                .Where(a => a.SchoolId == schoolId);

            if (!string.IsNullOrWhiteSpace(metricType))
                query = query.Where(a => a.MetricType == metricType);

            if (!string.IsNullOrWhiteSpace(period))
                query = query.Where(a => a.Period == period);

            var totalCount = await query.CountAsync();
            var items = await query
                .Include(a => a.Class)
                .Include(a => a.Section)
                .OrderByDescending(a => a.PeriodStart)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .AsNoTracking()
                .ToListAsync();

            return new AnalyticsListResponse
            {
                Items = items.Select(MapToAnalyticsResponse).ToList(),
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling((double)totalCount / pageSize)
            };
        }

        public async Task<AnalyticsResponse?> GetAnalyticsByIdAsync(Guid analyticsId, Guid schoolId)
        {
            var record = await _context.AnalyticsRecords
                .Include(a => a.Class)
                .Include(a => a.Section)
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == analyticsId && a.SchoolId == schoolId);

            return record is null ? null : MapToAnalyticsResponse(record);
        }

        public async Task<AnalyticsResponse> CreateAnalyticsAsync(CreateAnalyticsRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.MetricName))
                throw new ArgumentException("MetricName is required.");

            if (request.MetricName.Length > AnalyticsConstants.MetricNameMax)
                throw new ArgumentException($"MetricName cannot exceed {AnalyticsConstants.MetricNameMax} characters.");

            if (string.IsNullOrWhiteSpace(request.MetricType) ||
                !AnalyticsConstants.ValidMetricTypes.Contains(request.MetricType))
                throw new ArgumentException($"Invalid metric type. Allowed: {string.Join(", ", AnalyticsConstants.ValidMetricTypes)}.");

            if (string.IsNullOrWhiteSpace(request.Period) ||
                !AnalyticsConstants.ValidPeriods.Contains(request.Period))
                throw new ArgumentException($"Invalid period. Allowed: {string.Join(", ", AnalyticsConstants.ValidPeriods)}.");

            if (request.PeriodEnd <= request.PeriodStart)
                throw new ArgumentException("PeriodEnd must be after PeriodStart.");

            if (request.Value < 0)
                throw new ArgumentException("Value cannot be negative.");

            if (!string.IsNullOrWhiteSpace(request.Unit) && request.Unit.Length > AnalyticsConstants.MetricUnitMax)
                throw new ArgumentException($"Unit cannot exceed {AnalyticsConstants.MetricUnitMax} characters.");

            var record = new Analytics
            {
                Id = Guid.NewGuid(),
                SchoolId = request.SchoolId,
                MetricType = request.MetricType,
                MetricName = request.MetricName.Trim(),
                Value = request.Value,
                Unit = request.Unit,
                Period = request.Period,
                PeriodStart = request.PeriodStart,
                PeriodEnd = request.PeriodEnd,
                ClassId = request.ClassId,
                SectionId = request.SectionId,
                Metadata = request.Metadata,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.AnalyticsRecords.Add(record);
            await _context.SaveChangesAsync();

            return (await GetAnalyticsByIdAsync(record.Id, request.SchoolId))!;
        }

        public async Task<bool> DeleteAnalyticsAsync(Guid analyticsId, Guid schoolId)
        {
            var record = await _context.AnalyticsRecords
                .FirstOrDefaultAsync(a => a.Id == analyticsId && a.SchoolId == schoolId);

            if (record is null)
                return false;

            _context.AnalyticsRecords.Remove(record);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<List<AnalyticsResponse>> GetMetricsByPeriodAsync(Guid schoolId, string metricType, DateTime startDate, DateTime endDate)
        {
            var records = await _context.AnalyticsRecords
                .Include(a => a.Class)
                .Include(a => a.Section)
                .Where(a => a.SchoolId == schoolId
                         && a.MetricType == metricType
                         && a.PeriodStart >= startDate
                         && a.PeriodEnd <= endDate)
                .OrderBy(a => a.PeriodStart)
                .AsNoTracking()
                .ToListAsync();

            return records.Select(MapToAnalyticsResponse).ToList();
        }

        // Dashboard Summary

        public async Task<DashboardSummaryResponse> GetDashboardSummaryAsync(Guid schoolId, bool forceRefresh = false)
        {
            var cacheKey = $"analytics:summary:{schoolId}";

            if (!forceRefresh)
            {
                var cachedJson = await _cache.GetStringAsync(cacheKey);
                if (!string.IsNullOrEmpty(cachedJson))
                {
                    try { return JsonSerializer.Deserialize<DashboardSummaryResponse>(cachedJson)!; }
                    catch { /* Corrupted cache entry — fall through to DB fetch */ }
                }
            }

            var today = DateTime.UtcNow.Date;
            var sevenDaysFromNow = today.AddDays(7);

            var totalStudents = await _context.Students.AsNoTracking().CountAsync(s => s.SchoolId == schoolId && s.Status == "active");
            var totalStaff    = await _context.StaffMembers.AsNoTracking().CountAsync(s => s.SchoolId == schoolId && s.Status == "active");
            var totalClasses  = await _context.Classes.AsNoTracking().CountAsync(c => c.SchoolId == schoolId);
            var todayPresent  = await _context.AttendanceRecords.AsNoTracking().CountAsync(a => a.SchoolId == schoolId && a.Date.Date == today && a.Status == "present");
            var pendingFees     = await _context.FeeRecords.AsNoTracking().Where(f => f.SchoolId == schoolId && f.Status != "paid").SumAsync(f => f.PendingAmount);
            var totalCollected  = await _context.FeeRecords.AsNoTracking().Where(f => f.SchoolId == schoolId).SumAsync(f => f.PaidAmount);
            var totalFees       = await _context.FeeRecords.AsNoTracking().Where(f => f.SchoolId == schoolId).SumAsync(f => f.TotalAmount);
            var upcomingExams = await _context.Examinations.AsNoTracking().CountAsync(e => e.SchoolId == schoolId && e.ExamDate >= today && e.ExamDate <= sevenDaysFromNow);
            var recentRaw     = await _context.AnalyticsRecords.AsNoTracking().Where(a => a.SchoolId == schoolId).OrderByDescending(a => a.CreatedAt).Take(10).ToListAsync();

            var todayAttPct = totalStudents > 0 ? Math.Round((decimal)todayPresent / totalStudents * 100, 2) : 0m;

            var summary = new DashboardSummaryResponse
            {
                TotalStudents = totalStudents,
                TotalStaff = totalStaff,
                TotalClasses = totalClasses,
                TodayAttendancePercentage = todayAttPct,
                PendingFees = pendingFees,
                TotalCollected = totalCollected,
                TotalFees = totalFees,
                UpcomingExams = upcomingExams,
                PendingAssignments = 0,
                UnreadNotifications = 0,
                TodayAbsentStudents = Math.Max(0, totalStudents - todayPresent),
                TodayAbsentStaff = 0,
                RecentMetrics = recentRaw.Select(MapToAnalyticsResponse).ToList()
            };

            var cacheOptions = new DistributedCacheEntryOptions
            {
                SlidingExpiration = TimeSpan.FromSeconds(30),
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(1)
            };
            await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(summary), cacheOptions);

            return summary;
        }

        // Chart Data

        public async Task<ChartDataResponse> GetChartDataAsync(Guid schoolId, string metricType, string period, int dataPoints = 7)
        {
            if (dataPoints < AnalyticsConstants.MinDataPoints) dataPoints = AnalyticsConstants.MinDataPoints;
            if (dataPoints > AnalyticsConstants.MaxDataPoints) dataPoints = AnalyticsConstants.MaxDataPoints;

            var endDate   = DateTime.UtcNow;
            var startDate = period switch
            {
                "Daily"   => endDate.AddDays(-dataPoints),
                "Weekly"  => endDate.AddDays(-dataPoints * 7),
                "Monthly" => endDate.AddMonths(-dataPoints),
                _         => endDate.AddDays(-dataPoints)
            };

            var records = await _context.AnalyticsRecords
                .Where(a => a.SchoolId == schoolId
                         && a.MetricType == metricType
                         && a.Period == period
                         && a.PeriodStart >= startDate)
                .OrderBy(a => a.PeriodStart)
                .Take(dataPoints)
                .AsNoTracking()
                .ToListAsync();

            return new ChartDataResponse
            {
                Labels = records.Select(m => m.PeriodStart.ToString("MMM dd")).ToList(),
                Datasets = new List<ChartDataset>
                {
                    new ChartDataset
                    {
                        Label = metricType,
                        Data = records.Select(m => m.Value).ToList(),
                        BackgroundColor = "rgba(54, 162, 235, 0.2)",
                        BorderColor = "rgba(54, 162, 235, 1)"
                    }
                }
            };
        }

        // Computed — Overview Stats

        public async Task<SchoolOverviewStatsResponse> GetOverviewStatsAsync(Guid schoolId)
        {
            var today = DateTime.UtcNow.Date;

            var totalStudents  = await _context.Students.AsNoTracking().CountAsync(s => s.SchoolId == schoolId);
            var activeStudents = await _context.Students.AsNoTracking().CountAsync(s => s.SchoolId == schoolId && s.Status == "active");
            var totalStaff     = await _context.StaffMembers.AsNoTracking().CountAsync(s => s.SchoolId == schoolId);
            var activeStaff    = await _context.StaffMembers.AsNoTracking().CountAsync(s => s.SchoolId == schoolId && s.Status == "active");
            var totalClasses   = await _context.Classes.AsNoTracking().CountAsync(c => c.SchoolId == schoolId);
            var totalBooks     = await _context.Books.AsNoTracking().CountAsync(b => b.SchoolId == schoolId);
            var booksIssued    = await _context.BookIssues.AsNoTracking().CountAsync(bi => bi.SchoolId == schoolId && bi.ReturnDate == null);
            var pendingAdm     = await _context.Admissions.AsNoTracking().CountAsync(a => a.SchoolId == schoolId && a.Status == "pending");
            var openAlerts     = await _context.HealthAlerts.AsNoTracking().CountAsync(ha => ha.SchoolId == schoolId && ha.Status == "active");
            var hostelOccupied = await _context.HostelStudents.AsNoTracking().CountAsync(hs => hs.SchoolId == schoolId && hs.Status == "active");
            var transportCount = await _context.TransportStudents.AsNoTracking().CountAsync(ts => ts.SchoolId == schoolId && ts.Status == "active");
            var todayPresent   = await _context.AttendanceRecords.AsNoTracking().CountAsync(a => a.SchoolId == schoolId && a.Date.Date == today && a.Status == "present");

            var todayAttPct = activeStudents > 0 ? Math.Round((decimal)todayPresent / activeStudents * 100, 2) : 0m;

            return new SchoolOverviewStatsResponse
            {
                TotalStudents = totalStudents,
                ActiveStudents = activeStudents,
                TotalStaff = totalStaff,
                ActiveStaff = activeStaff,
                TotalClasses = totalClasses,
                TotalBooks = totalBooks,
                BooksIssued = booksIssued,
                PendingAdmissions = pendingAdm,
                OpenHealthAlerts = openAlerts,
                HostelOccupied = hostelOccupied,
                TransportStudents = transportCount,
                TodayAttendancePercentage = todayAttPct
            };
        }

        // Computed — Attendance Analytics

        public async Task<AttendanceAnalyticsResponse> GetAttendanceAnalyticsAsync(Guid schoolId, int days = 30)
        {
            if (days < 1)   days = 1;
            if (days > 365) days = 365;

            var endDate   = DateTime.UtcNow.Date;
            var startDate = endDate.AddDays(-(days - 1));

            var totalStudents = await _context.Students.AsNoTracking()
                .CountAsync(s => s.SchoolId == schoolId && s.Status == "active");

            var records = await _context.AttendanceRecords.AsNoTracking()
                .Where(a => a.SchoolId == schoolId
                         && a.Date.Date >= startDate
                         && a.Date.Date <= endDate)
                .Select(a => new { a.Date, a.Status })
                .ToListAsync();

            var grouped = records
                .GroupBy(a => a.Date.Date)
                .Select(g =>
                {
                    var present = g.Count(a => a.Status == "present");
                    return new AttendanceDayDataPoint
                    {
                        Date = g.Key.ToString("yyyy-MM-dd"),
                        TotalStudents = totalStudents,
                        PresentCount = present,
                        AbsentCount = g.Count(a => a.Status == "absent"),
                        LateCount = g.Count(a => a.Status == "late"),
                        AttendancePercentage = totalStudents > 0
                            ? Math.Round((decimal)present / totalStudents * 100, 2)
                            : 0m
                    };
                })
                .OrderBy(d => d.Date)
                .ToList();

            if (grouped.Count == 0)
            {
                return new AttendanceAnalyticsResponse
                {
                    TotalDays = 0,
                    AverageAttendancePercentage = 0,
                    HighestAttendancePercentage = 0,
                    LowestAttendancePercentage = 0,
                    PerfectAttendanceDays = 0,
                    DailyData = grouped
                };
            }

            return new AttendanceAnalyticsResponse
            {
                TotalDays = grouped.Count,
                AverageAttendancePercentage = Math.Round(grouped.Average(d => d.AttendancePercentage), 2),
                HighestAttendancePercentage = grouped.Max(d => d.AttendancePercentage),
                LowestAttendancePercentage = grouped.Min(d => d.AttendancePercentage),
                PerfectAttendanceDays = grouped.Count(d => d.AttendancePercentage >= 100),
                DailyData = grouped
            };
        }

        // Computed — Enrollment Analytics

        public async Task<EnrollmentAnalyticsResponse> GetEnrollmentAnalyticsAsync(Guid schoolId)
        {
            var classes = await _context.Classes.AsNoTracking()
                .Where(c => c.SchoolId == schoolId)
                .ToListAsync();

            var students = await _context.Students.AsNoTracking()
                .Where(s => s.SchoolId == schoolId)
                .Select(s => new { s.Class, s.Status })
                .ToListAsync();

            var activeStudents   = students.Count(s => s.Status == "active");
            var inactiveStudents = students.Count(s => s.Status != "active");

            // Group students by their Class string, match to Class entities by name
            var studentsByClass = students.GroupBy(s => s.Class).ToDictionary(g => g.Key, g => g.ToList());

            var byClass = classes.Select(cls =>
            {
                var classStudents = studentsByClass.TryGetValue(cls.Name, out var list) ? list : new();
                var totalInClass  = classStudents.Count;
                var activeInClass = classStudents.Count(s => s.Status == "active");
                var fillPct       = cls.Capacity.HasValue && cls.Capacity.Value > 0
                    ? Math.Round((decimal)totalInClass / cls.Capacity.Value * 100, 2)
                    : (decimal?)null;

                return new ClassEnrollmentDto
                {
                    ClassId = cls.Id,
                    ClassName = cls.Name,
                    TotalStudents = totalInClass,
                    ActiveStudents = activeInClass,
                    Capacity = cls.Capacity,
                    FillPercentage = fillPct
                };
            })
            .OrderByDescending(c => c.TotalStudents)
            .ToList();

            var avgClassSize = classes.Count > 0
                ? Math.Round((decimal)activeStudents / classes.Count, 2)
                : 0m;

            return new EnrollmentAnalyticsResponse
            {
                TotalActiveStudents = activeStudents,
                TotalInactiveStudents = inactiveStudents,
                TotalClasses = classes.Count,
                AverageClassSize = avgClassSize,
                ByClass = byClass
            };
        }

        // Computed — Performance Analytics

        public async Task<PerformanceAnalyticsResponse> GetPerformanceAnalyticsAsync(Guid schoolId, string? academicYear = null)
        {
            var examQuery = _context.Examinations.AsNoTracking()
                .Where(e => e.SchoolId == schoolId);

            if (!string.IsNullOrWhiteSpace(academicYear))
                examQuery = examQuery.Where(e => e.AcademicYear == academicYear);

            var examIds = await examQuery.Select(e => e.Id).ToListAsync();

            if (examIds.Count == 0)
            {
                return new PerformanceAnalyticsResponse
                {
                    AcademicYear = academicYear,
                    TotalExams = 0,
                    TotalResults = 0,
                    OverallAveragePercentage = 0,
                    OverallPassRate = 0,
                    BySubject = new List<SubjectPerformanceDto>()
                };
            }

            var results = await _context.ExamResults.AsNoTracking()
                .Where(r => r.SchoolId == schoolId && examIds.Contains(r.ExamId) && !r.IsAbsent)
                .Select(r => new { r.Subject, r.Percentage, r.IsPass })
                .ToListAsync();

            if (results.Count == 0)
            {
                return new PerformanceAnalyticsResponse
                {
                    AcademicYear = academicYear,
                    TotalExams = examIds.Count,
                    TotalResults = 0,
                    OverallAveragePercentage = 0,
                    OverallPassRate = 0,
                    BySubject = new List<SubjectPerformanceDto>()
                };
            }

            var bySubject = results
                .GroupBy(r => r.Subject)
                .Select(g => new SubjectPerformanceDto
                {
                    Subject = g.Key,
                    TotalResults = g.Count(),
                    AveragePercentage = Math.Round(g.Average(r => r.Percentage), 2),
                    PassCount = g.Count(r => r.IsPass),
                    FailCount = g.Count(r => !r.IsPass),
                    PassRate = g.Count() > 0 ? Math.Round((decimal)g.Count(r => r.IsPass) / g.Count() * 100, 2) : 0m
                })
                .OrderByDescending(s => s.AveragePercentage)
                .ToList();

            return new PerformanceAnalyticsResponse
            {
                AcademicYear = academicYear,
                TotalExams = examIds.Count,
                TotalResults = results.Count,
                OverallAveragePercentage = Math.Round(results.Average(r => r.Percentage), 2),
                OverallPassRate = Math.Round((decimal)results.Count(r => r.IsPass) / results.Count * 100, 2),
                BySubject = bySubject
            };
        }

        // Computed — Fee Analytics

        public async Task<FeeAnalyticsResponse> GetFeeAnalyticsAsync(Guid schoolId, int months = 6)
        {
            if (months < 1)  months = 1;
            if (months > 24) months = 24;

            var now       = DateTime.UtcNow;
            var startDate = new DateTime(now.Year, now.Month, 1).AddMonths(-(months - 1));

            var records = await _context.FeeRecords.AsNoTracking()
                .Where(f => f.SchoolId == schoolId && f.DueDate >= startDate)
                .Select(f => new { f.DueDate, f.TotalAmount, f.PaidAmount, f.PendingAmount, f.Status })
                .ToListAsync();

            var monthlyData = new List<FeeMonthDataPoint>();
            for (var i = 0; i < months; i++)
            {
                var monthStart = startDate.AddMonths(i);
                var monthEnd   = monthStart.AddMonths(1).AddDays(-1);
                var monthRecs  = records.Where(r => r.DueDate >= monthStart && r.DueDate <= monthEnd).ToList();

                monthlyData.Add(new FeeMonthDataPoint
                {
                    Month = monthStart.ToString("MMM"),
                    Year = monthStart.Year,
                    Collected = monthRecs.Sum(r => r.PaidAmount),
                    Pending = monthRecs.Where(r => r.Status == "pending" || r.Status == "partial").Sum(r => r.PendingAmount),
                    Overdue = monthRecs.Where(r => r.Status == "overdue").Sum(r => r.PendingAmount),
                    TotalRecords = monthRecs.Count
                });
            }

            var totalBilled    = records.Sum(r => r.TotalAmount);
            var totalCollected = records.Sum(r => r.PaidAmount);
            var totalPending   = records.Where(r => r.Status != "paid").Sum(r => r.PendingAmount);
            var totalOverdue   = records.Where(r => r.Status == "overdue").Sum(r => r.PendingAmount);
            var collRate       = totalBilled > 0 ? Math.Round(totalCollected / totalBilled * 100, 2) : 0m;

            return new FeeAnalyticsResponse
            {
                TotalBilled = totalBilled,
                TotalCollected = totalCollected,
                TotalPending = totalPending,
                TotalOverdue = totalOverdue,
                CollectionRate = collRate,
                MonthlyData = monthlyData
            };
        }

        // Mappers

        private static DashboardWidgetResponse MapToWidgetResponse(DashboardWidget w) => new()
        {
            Id = w.Id,
            SchoolId = w.SchoolId,
            Name = w.Name,
            WidgetType = w.WidgetType,
            DataSource = w.DataSource,
            Description = w.Description,
            Configuration = w.Configuration,
            ChartType = w.ChartType,
            DisplayOrder = w.DisplayOrder,
            Size = w.Size,
            RefreshInterval = w.RefreshInterval,
            Visibility = w.Visibility,
            IsActive = w.IsActive,
            CreatedAt = w.CreatedAt,
            UpdatedAt = w.UpdatedAt
        };

        private static AnalyticsResponse MapToAnalyticsResponse(Analytics a) => new()
        {
            Id = a.Id,
            SchoolId = a.SchoolId,
            MetricType = a.MetricType,
            MetricName = a.MetricName,
            Value = a.Value,
            Unit = a.Unit,
            Period = a.Period,
            PeriodStart = a.PeriodStart,
            PeriodEnd = a.PeriodEnd,
            ClassId = a.ClassId,
            ClassName = a.Class?.Name,
            SectionId = a.SectionId,
            SectionName = a.Section?.Name,
            Metadata = a.Metadata,
            CreatedAt = a.CreatedAt
        };
    }
}
