using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;
using SmsApi.Services;
using Xunit;
using StaffEntity = SmsApi.Models.Entities.Staff;
using AnalyticsEntity = SmsApi.Models.Entities.Analytics;

namespace SmsApi.Tests.Unit.Analytics
{
    public class AnalyticsServiceTests : IDisposable
    {
        private readonly AppDbContext _db;
        private readonly Guid _school1 = Guid.NewGuid();
        private readonly Guid _school2 = Guid.NewGuid();

        public AnalyticsServiceTests()
        {
            var opts = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options;
            _db = new AppDbContext(opts);
        }

        public void Dispose() => _db?.Dispose();

        private AnalyticsService CreateService()
        {
            IDistributedCache cache = new MemoryDistributedCache(
                Options.Create(new MemoryDistributedCacheOptions()));
            return new AnalyticsService(_db, cache);
        }

        // ═══════════════════════════════════════════════════════════
        // Helpers
        // ═══════════════════════════════════════════════════════════

        private Student MakeStudent(Guid schoolId, string status = "Active", string cls = "Grade 1")
            => new()
            {
                Id = Guid.NewGuid(), SchoolId = schoolId, Name = "Student", Status = status,
                Class = cls, Section = "A", DateOfBirth = DateTime.UtcNow.AddYears(-10),
                AdmissionDate = DateTime.UtcNow.AddYears(-1), CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            };

        private StaffEntity MakeStaff(Guid schoolId, string status = "Active")
            => new()
            {
                Id = Guid.NewGuid(), SchoolId = schoolId, Name = "Staff Member", Status = status,
                EmployeeId = Guid.NewGuid().ToString()[..8], Email = $"{Guid.NewGuid()}@test.com",
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            };

        private Class MakeClass(Guid schoolId, string name = "Grade 1", int? capacity = null)
            => new()
            {
                Id = Guid.NewGuid(), SchoolId = schoolId, Name = name, Status = "active",
                Capacity = capacity, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            };

        private AttendanceRecord MakeAttendance(Guid schoolId, Guid studentId, DateTime date, string status = "present")
            => new()
            {
                Id = Guid.NewGuid(), SchoolId = schoolId, StudentId = studentId, Date = date, Status = status,
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            };

        private FeeRecord MakeFeeRecord(Guid schoolId, Guid studentId, decimal total, decimal paid, string status = "pending", DateTime? dueDate = null)
        {
            var due = dueDate ?? DateTime.UtcNow;
            return new FeeRecord
            {
                Id = Guid.NewGuid(), SchoolId = schoolId, StudentId = studentId,
                TotalAmount = total, PaidAmount = paid,
                PendingAmount = total - paid, BalanceAmount = total - paid,
                Status = status, DueDate = due, AcademicYear = "2025-26",
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            };
        }

        private Exam MakeExam(Guid schoolId, DateTime? examDate = null, string? academicYear = null)
            => new()
            {
                Id = Guid.NewGuid(), SchoolId = schoolId, Name = "Test Exam",
                ExamDate = examDate ?? DateTime.UtcNow.AddDays(3),
                TotalMarks = 100, PassingMarks = 35, Status = "scheduled",
                Subject = "Math", Class = "Grade 1",
                AcademicYear = academicYear ?? "2025-26",
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            };

        private ExamResult MakeExamResult(Guid schoolId, Guid examId, Guid studentId, decimal percentage, bool isPass, string subject = "Math", bool isAbsent = false)
            => new()
            {
                Id = Guid.NewGuid(), SchoolId = schoolId, ExamId = examId, StudentId = studentId,
                MarksObtained = percentage, Percentage = percentage, TotalMarks = 100,
                IsPass = isPass, IsAbsent = isAbsent, Subject = subject,
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            };

        private DashboardWidget MakeWidget(Guid schoolId, string name = "Widget 1", bool isActive = true, int order = 0, string visibility = "all")
            => new()
            {
                Id = Guid.NewGuid(), SchoolId = schoolId, Name = name, WidgetType = "chart",
                DataSource = "students", Size = "medium", RefreshInterval = "manual",
                Visibility = visibility, IsActive = isActive, DisplayOrder = order,
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            };

        private AnalyticsEntity MakeAnalyticsRecord(Guid schoolId, string metricType = "Attendance", string period = "Daily")
            => new()
            {
                Id = Guid.NewGuid(), SchoolId = schoolId,
                MetricType = metricType, MetricName = "Test Metric", Value = 50m,
                Period = period,
                PeriodStart = DateTime.UtcNow.AddDays(-1),
                PeriodEnd = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            };

        // ═══════════════════════════════════════════════════════════
        // GetDashboardSummaryAsync
        // ═══════════════════════════════════════════════════════════

        [Fact]
        public async Task GetDashboardSummary_ReturnsActiveStudentCount()
        {
            _db.Students.AddRange(MakeStudent(_school1, "Active"), MakeStudent(_school1, "active"), MakeStudent(_school1, "Inactive"));
            await _db.SaveChangesAsync();

            var result = await CreateService().GetDashboardSummaryAsync(_school1);

            result.TotalStudents.Should().Be(1); // Only "Active" (exact case)
        }

        [Fact]
        public async Task GetDashboardSummary_ReturnsActiveStaffCount()
        {
            _db.StaffMembers.AddRange(MakeStaff(_school1, "Active"), MakeStaff(_school1, "Active"), MakeStaff(_school1, "inactive"));
            await _db.SaveChangesAsync();

            var result = await CreateService().GetDashboardSummaryAsync(_school1);

            result.TotalStaff.Should().Be(2);
        }

        [Fact]
        public async Task GetDashboardSummary_ReturnsTotalClassCount()
        {
            _db.Classes.AddRange(MakeClass(_school1), MakeClass(_school1, "Grade 2"));
            await _db.SaveChangesAsync();

            var result = await CreateService().GetDashboardSummaryAsync(_school1);

            result.TotalClasses.Should().Be(2);
        }

        [Fact]
        public async Task GetDashboardSummary_AttendancePercentageZeroWhenNoStudents()
        {
            var result = await CreateService().GetDashboardSummaryAsync(_school1);

            result.TodayAttendancePercentage.Should().Be(0);
        }

        [Fact]
        public async Task GetDashboardSummary_AttendancePercentageCalculatedCorrectly()
        {
            var s1 = MakeStudent(_school1, "Active");
            var s2 = MakeStudent(_school1, "Active");
            var s3 = MakeStudent(_school1, "Active");
            var s4 = MakeStudent(_school1, "Active");
            _db.Students.AddRange(s1, s2, s3, s4);
            var today = DateTime.UtcNow.Date;
            _db.AttendanceRecords.AddRange(
                MakeAttendance(_school1, s1.Id, today, "present"),
                MakeAttendance(_school1, s2.Id, today, "present"),
                MakeAttendance(_school1, s3.Id, today, "absent"),
                MakeAttendance(_school1, s4.Id, today, "absent"));
            await _db.SaveChangesAsync();

            var result = await CreateService().GetDashboardSummaryAsync(_school1);

            result.TodayAttendancePercentage.Should().Be(50.00m);
        }

        [Fact]
        public async Task GetDashboardSummary_PendingFeesSumsCorrectly()
        {
            var s = MakeStudent(_school1);
            _db.Students.Add(s);
            _db.FeeRecords.AddRange(
                MakeFeeRecord(_school1, s.Id, 1000, 0, "pending"),
                MakeFeeRecord(_school1, s.Id, 2000, 0, "pending"),
                MakeFeeRecord(_school1, s.Id, 500, 500, "paid"));
            await _db.SaveChangesAsync();

            var result = await CreateService().GetDashboardSummaryAsync(_school1);

            result.PendingFees.Should().Be(3000m);
        }

        [Fact]
        public async Task GetDashboardSummary_UpcomingExamsCountsNextSevenDays()
        {
            _db.Examinations.AddRange(
                MakeExam(_school1, DateTime.UtcNow.AddDays(1)),
                MakeExam(_school1, DateTime.UtcNow.AddDays(6)),
                MakeExam(_school1, DateTime.UtcNow.AddDays(8)),   // outside 7 days
                MakeExam(_school1, DateTime.UtcNow.AddDays(-1))); // past
            await _db.SaveChangesAsync();

            var result = await CreateService().GetDashboardSummaryAsync(_school1);

            result.UpcomingExams.Should().Be(2);
        }

        [Fact]
        public async Task GetDashboardSummary_SchoolIsolation()
        {
            _db.Students.AddRange(MakeStudent(_school1, "Active"), MakeStudent(_school2, "Active"), MakeStudent(_school2, "Active"));
            await _db.SaveChangesAsync();

            var result = await CreateService().GetDashboardSummaryAsync(_school1);

            result.TotalStudents.Should().Be(1);
        }

        [Fact]
        public async Task GetDashboardSummary_AbsentStudentsCalculated()
        {
            var s1 = MakeStudent(_school1, "Active");
            var s2 = MakeStudent(_school1, "Active");
            var s3 = MakeStudent(_school1, "Active");
            _db.Students.AddRange(s1, s2, s3);
            _db.AttendanceRecords.Add(MakeAttendance(_school1, s1.Id, DateTime.UtcNow.Date, "present"));
            await _db.SaveChangesAsync();

            var result = await CreateService().GetDashboardSummaryAsync(_school1);

            result.TodayAbsentStudents.Should().Be(2);
        }

        // ═══════════════════════════════════════════════════════════
        // GetOverviewStatsAsync
        // ═══════════════════════════════════════════════════════════

        [Fact]
        public async Task GetOverviewStats_TotalStudentsCountsAll()
        {
            _db.Students.AddRange(MakeStudent(_school1, "Active"), MakeStudent(_school1, "Inactive"), MakeStudent(_school1, "graduated"));
            await _db.SaveChangesAsync();

            var result = await CreateService().GetOverviewStatsAsync(_school1);

            result.TotalStudents.Should().Be(3);
        }

        [Fact]
        public async Task GetOverviewStats_ActiveStudentsFiltered()
        {
            _db.Students.AddRange(MakeStudent(_school1, "Active"), MakeStudent(_school1, "Active"), MakeStudent(_school1, "inactive"));
            await _db.SaveChangesAsync();

            var result = await CreateService().GetOverviewStatsAsync(_school1);

            result.ActiveStudents.Should().Be(2);
        }

        [Fact]
        public async Task GetOverviewStats_TotalStaffCountsAll()
        {
            _db.StaffMembers.AddRange(MakeStaff(_school1, "Active"), MakeStaff(_school1, "inactive"));
            await _db.SaveChangesAsync();

            var result = await CreateService().GetOverviewStatsAsync(_school1);

            result.TotalStaff.Should().Be(2);
        }

        [Fact]
        public async Task GetOverviewStats_ActiveStaffFiltered()
        {
            _db.StaffMembers.AddRange(MakeStaff(_school1, "Active"), MakeStaff(_school1, "Active"), MakeStaff(_school1, "resigned"));
            await _db.SaveChangesAsync();

            var result = await CreateService().GetOverviewStatsAsync(_school1);

            result.ActiveStaff.Should().Be(2);
        }

        [Fact]
        public async Task GetOverviewStats_TotalClassesCorrect()
        {
            _db.Classes.AddRange(MakeClass(_school1), MakeClass(_school1, "Grade 2"), MakeClass(_school1, "Grade 3"));
            await _db.SaveChangesAsync();

            var result = await CreateService().GetOverviewStatsAsync(_school1);

            result.TotalClasses.Should().Be(3);
        }

        [Fact]
        public async Task GetOverviewStats_BooksIssuedCountsOnlyUnreturned()
        {
            var bookId = Guid.NewGuid();
            var studId = Guid.NewGuid();
            _db.BookIssues.AddRange(
                new BookIssue { Id = Guid.NewGuid(), SchoolId = _school1, BookId = bookId, StudentId = studId, IssueDate = DateTime.UtcNow.AddDays(-5), DueDate = DateTime.UtcNow.AddDays(5), ReturnDate = null, Status = "issued", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                new BookIssue { Id = Guid.NewGuid(), SchoolId = _school1, BookId = bookId, StudentId = studId, IssueDate = DateTime.UtcNow.AddDays(-10), DueDate = DateTime.UtcNow.AddDays(-5), ReturnDate = DateTime.UtcNow.AddDays(-2), Status = "returned", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
            );
            await _db.SaveChangesAsync();

            var result = await CreateService().GetOverviewStatsAsync(_school1);

            result.BooksIssued.Should().Be(1);
        }

        [Fact]
        public async Task GetOverviewStats_SchoolIsolation()
        {
            _db.Students.AddRange(MakeStudent(_school1, "Active"), MakeStudent(_school2, "Active"), MakeStudent(_school2, "Active"), MakeStudent(_school2, "Active"));
            await _db.SaveChangesAsync();

            var result = await CreateService().GetOverviewStatsAsync(_school1);

            result.TotalStudents.Should().Be(1);
            result.ActiveStudents.Should().Be(1);
        }

        [Fact]
        public async Task GetOverviewStats_EmptySchoolReturnsAllZeros()
        {
            var result = await CreateService().GetOverviewStatsAsync(Guid.NewGuid());

            result.TotalStudents.Should().Be(0);
            result.TotalStaff.Should().Be(0);
            result.TotalClasses.Should().Be(0);
            result.BooksIssued.Should().Be(0);
        }

        // ═══════════════════════════════════════════════════════════
        // GetAttendanceAnalyticsAsync
        // ═══════════════════════════════════════════════════════════

        [Fact]
        public async Task GetAttendanceAnalytics_EmptySchoolReturnsZeroTotalDays()
        {
            var result = await CreateService().GetAttendanceAnalyticsAsync(Guid.NewGuid(), 30);

            result.TotalDays.Should().Be(0);
            result.DailyData.Should().BeEmpty();
        }

        [Fact]
        public async Task GetAttendanceAnalytics_DataPointsPerDayGroupedCorrectly()
        {
            var s1 = MakeStudent(_school1, "Active");
            var s2 = MakeStudent(_school1, "Active");
            var s3 = MakeStudent(_school1, "Active");
            _db.Students.AddRange(s1, s2, s3);
            var day1 = DateTime.UtcNow.Date.AddDays(-2);
            var day2 = DateTime.UtcNow.Date.AddDays(-1);
            _db.AttendanceRecords.AddRange(
                MakeAttendance(_school1, s1.Id, day1, "present"),
                MakeAttendance(_school1, s2.Id, day1, "absent"),
                MakeAttendance(_school1, s3.Id, day1, "present"),
                MakeAttendance(_school1, s1.Id, day2, "present"),
                MakeAttendance(_school1, s2.Id, day2, "present"),
                MakeAttendance(_school1, s3.Id, day2, "absent"));
            await _db.SaveChangesAsync();

            var result = await CreateService().GetAttendanceAnalyticsAsync(_school1, 30);

            result.TotalDays.Should().Be(2);
            var d1 = result.DailyData.First(d => d.Date == day1.ToString("yyyy-MM-dd"));
            d1.PresentCount.Should().Be(2);
            d1.AbsentCount.Should().Be(1);
        }

        [Fact]
        public async Task GetAttendanceAnalytics_AttendancePercentageCalculatedPerDay()
        {
            var s1 = MakeStudent(_school1, "Active");
            var s2 = MakeStudent(_school1, "Active");
            _db.Students.AddRange(s1, s2);
            var today = DateTime.UtcNow.Date;
            _db.AttendanceRecords.AddRange(
                MakeAttendance(_school1, s1.Id, today, "present"),
                MakeAttendance(_school1, s2.Id, today, "absent"));
            await _db.SaveChangesAsync();

            var result = await CreateService().GetAttendanceAnalyticsAsync(_school1, 30);

            result.DailyData.Should().HaveCount(1);
            result.DailyData[0].AttendancePercentage.Should().Be(50.00m);
        }

        [Fact]
        public async Task GetAttendanceAnalytics_AverageIsAverageOfDailyPercentages()
        {
            var s1 = MakeStudent(_school1, "Active");
            var s2 = MakeStudent(_school1, "Active");
            _db.Students.AddRange(s1, s2);
            var day1 = DateTime.UtcNow.Date.AddDays(-2);
            var day2 = DateTime.UtcNow.Date.AddDays(-1);
            // day1: 100% (both present), day2: 50% (one present)
            _db.AttendanceRecords.AddRange(
                MakeAttendance(_school1, s1.Id, day1, "present"),
                MakeAttendance(_school1, s2.Id, day1, "present"),
                MakeAttendance(_school1, s1.Id, day2, "present"),
                MakeAttendance(_school1, s2.Id, day2, "absent"));
            await _db.SaveChangesAsync();

            var result = await CreateService().GetAttendanceAnalyticsAsync(_school1, 30);

            result.AverageAttendancePercentage.Should().Be(75.00m);
        }

        [Fact]
        public async Task GetAttendanceAnalytics_HighestAndLowestIdentified()
        {
            var s1 = MakeStudent(_school1, "Active");
            var s2 = MakeStudent(_school1, "Active");
            _db.Students.AddRange(s1, s2);
            var day1 = DateTime.UtcNow.Date.AddDays(-3);
            var day2 = DateTime.UtcNow.Date.AddDays(-2);
            var day3 = DateTime.UtcNow.Date.AddDays(-1);
            _db.AttendanceRecords.AddRange(
                MakeAttendance(_school1, s1.Id, day1, "present"), MakeAttendance(_school1, s2.Id, day1, "present"), // 100%
                MakeAttendance(_school1, s1.Id, day2, "present"), MakeAttendance(_school1, s2.Id, day2, "absent"),  // 50%
                MakeAttendance(_school1, s1.Id, day3, "absent"), MakeAttendance(_school1, s2.Id, day3, "absent"));  // 0%
            await _db.SaveChangesAsync();

            var result = await CreateService().GetAttendanceAnalyticsAsync(_school1, 30);

            result.HighestAttendancePercentage.Should().Be(100m);
            result.LowestAttendancePercentage.Should().Be(0m);
        }

        [Fact]
        public async Task GetAttendanceAnalytics_FutureDatesExcluded()
        {
            var s = MakeStudent(_school1, "Active");
            _db.Students.Add(s);
            _db.AttendanceRecords.Add(MakeAttendance(_school1, s.Id, DateTime.UtcNow.Date.AddDays(1), "present"));
            await _db.SaveChangesAsync();

            var result = await CreateService().GetAttendanceAnalyticsAsync(_school1, 30);

            result.TotalDays.Should().Be(0);
        }

        [Fact]
        public async Task GetAttendanceAnalytics_DaysParamLimitsRange()
        {
            var s = MakeStudent(_school1, "Active");
            _db.Students.Add(s);
            // day 5 ago should be in range for days=7, but not for days=3
            _db.AttendanceRecords.Add(MakeAttendance(_school1, s.Id, DateTime.UtcNow.Date.AddDays(-4), "present"));
            await _db.SaveChangesAsync();

            var r7 = await CreateService().GetAttendanceAnalyticsAsync(_school1, 7);
            var r3 = await CreateService().GetAttendanceAnalyticsAsync(_school1, 3);

            r7.TotalDays.Should().Be(1);
            r3.TotalDays.Should().Be(0);
        }

        [Fact]
        public async Task GetAttendanceAnalytics_LateStatusCounted()
        {
            var s = MakeStudent(_school1, "Active");
            _db.Students.Add(s);
            _db.AttendanceRecords.Add(MakeAttendance(_school1, s.Id, DateTime.UtcNow.Date, "late"));
            await _db.SaveChangesAsync();

            var result = await CreateService().GetAttendanceAnalyticsAsync(_school1, 30);

            result.DailyData[0].LateCount.Should().Be(1);
        }

        [Fact]
        public async Task GetAttendanceAnalytics_SchoolIsolation()
        {
            var s = MakeStudent(_school2, "Active");
            _db.Students.Add(s);
            _db.AttendanceRecords.Add(MakeAttendance(_school2, s.Id, DateTime.UtcNow.Date, "present"));
            await _db.SaveChangesAsync();

            var result = await CreateService().GetAttendanceAnalyticsAsync(_school1, 30);

            result.TotalDays.Should().Be(0);
        }

        [Fact]
        public async Task GetAttendanceAnalytics_ZeroStudentsGivesZeroPercentage()
        {
            // Attendance records exist but no active students
            var s = MakeStudent(_school1, "inactive");
            _db.Students.Add(s);
            _db.AttendanceRecords.Add(MakeAttendance(_school1, s.Id, DateTime.UtcNow.Date, "present"));
            await _db.SaveChangesAsync();

            var result = await CreateService().GetAttendanceAnalyticsAsync(_school1, 30);

            if (result.DailyData.Any())
                result.DailyData[0].AttendancePercentage.Should().Be(0);
        }

        // ═══════════════════════════════════════════════════════════
        // GetEnrollmentAnalyticsAsync
        // ═══════════════════════════════════════════════════════════

        [Fact]
        public async Task GetEnrollmentAnalytics_ActiveStudentsCounted()
        {
            _db.Students.AddRange(
                MakeStudent(_school1, "Active", "Grade 1"),
                MakeStudent(_school1, "Active", "Grade 1"),
                MakeStudent(_school1, "inactive", "Grade 1"));
            await _db.SaveChangesAsync();

            var result = await CreateService().GetEnrollmentAnalyticsAsync(_school1);

            result.TotalActiveStudents.Should().Be(2);
            result.TotalInactiveStudents.Should().Be(1);
        }

        [Fact]
        public async Task GetEnrollmentAnalytics_TotalClassesCountedFromClassTable()
        {
            _db.Classes.AddRange(MakeClass(_school1, "Grade 1"), MakeClass(_school1, "Grade 2"));
            await _db.SaveChangesAsync();

            var result = await CreateService().GetEnrollmentAnalyticsAsync(_school1);

            result.TotalClasses.Should().Be(2);
        }

        [Fact]
        public async Task GetEnrollmentAnalytics_ByClassGroupsStudentsByClassName()
        {
            _db.Classes.Add(MakeClass(_school1, "Grade 1"));
            _db.Students.AddRange(
                MakeStudent(_school1, "Active", "Grade 1"),
                MakeStudent(_school1, "Active", "Grade 1"),
                MakeStudent(_school1, "Active", "Grade 2")); // no matching class entry
            await _db.SaveChangesAsync();

            var result = await CreateService().GetEnrollmentAnalyticsAsync(_school1);

            var grade1 = result.ByClass.FirstOrDefault(c => c.ClassName == "Grade 1");
            grade1.Should().NotBeNull();
            grade1!.TotalStudents.Should().Be(2);
        }

        [Fact]
        public async Task GetEnrollmentAnalytics_FillPercentageCalculatedWhenCapacitySet()
        {
            _db.Classes.Add(MakeClass(_school1, "Grade 1", capacity: 40));
            _db.Students.AddRange(
                MakeStudent(_school1, "Active", "Grade 1"),
                MakeStudent(_school1, "Active", "Grade 1"));
            await _db.SaveChangesAsync();

            var result = await CreateService().GetEnrollmentAnalyticsAsync(_school1);

            var grade1 = result.ByClass.First(c => c.ClassName == "Grade 1");
            grade1.FillPercentage.Should().Be(5.00m); // 2/40 = 5%
        }

        [Fact]
        public async Task GetEnrollmentAnalytics_FillPercentageNullWhenNoCapacity()
        {
            _db.Classes.Add(MakeClass(_school1, "Grade 1", capacity: null));
            await _db.SaveChangesAsync();

            var result = await CreateService().GetEnrollmentAnalyticsAsync(_school1);

            result.ByClass.First().FillPercentage.Should().BeNull();
        }

        [Fact]
        public async Task GetEnrollmentAnalytics_AverageClassSizeCalculated()
        {
            _db.Classes.AddRange(MakeClass(_school1, "Grade 1"), MakeClass(_school1, "Grade 2"));
            _db.Students.AddRange(
                MakeStudent(_school1, "Active", "Grade 1"),
                MakeStudent(_school1, "Active", "Grade 1"),
                MakeStudent(_school1, "Active", "Grade 2"));
            await _db.SaveChangesAsync();

            var result = await CreateService().GetEnrollmentAnalyticsAsync(_school1);

            result.AverageClassSize.Should().Be(1.5m); // 3 active / 2 classes
        }

        [Fact]
        public async Task GetEnrollmentAnalytics_EmptySchoolReturnsZeros()
        {
            var result = await CreateService().GetEnrollmentAnalyticsAsync(Guid.NewGuid());

            result.TotalActiveStudents.Should().Be(0);
            result.TotalClasses.Should().Be(0);
            result.ByClass.Should().BeEmpty();
        }

        [Fact]
        public async Task GetEnrollmentAnalytics_SchoolIsolation()
        {
            _db.Classes.Add(MakeClass(_school1, "Grade 1"));
            _db.Students.AddRange(MakeStudent(_school2, "Active", "Grade 1"), MakeStudent(_school2, "Active", "Grade 1"));
            await _db.SaveChangesAsync();

            var result = await CreateService().GetEnrollmentAnalyticsAsync(_school1);

            result.TotalActiveStudents.Should().Be(0);
        }

        // ═══════════════════════════════════════════════════════════
        // GetPerformanceAnalyticsAsync
        // ═══════════════════════════════════════════════════════════

        [Fact]
        public async Task GetPerformanceAnalytics_NoExamsReturnsZeroTotals()
        {
            var result = await CreateService().GetPerformanceAnalyticsAsync(Guid.NewGuid());

            result.TotalExams.Should().Be(0);
            result.TotalResults.Should().Be(0);
            result.BySubject.Should().BeEmpty();
        }

        [Fact]
        public async Task GetPerformanceAnalytics_TotalExamsCountedCorrectly()
        {
            _db.Examinations.AddRange(MakeExam(_school1), MakeExam(_school1), MakeExam(_school1));
            await _db.SaveChangesAsync();

            var result = await CreateService().GetPerformanceAnalyticsAsync(_school1);

            result.TotalExams.Should().Be(3);
        }

        [Fact]
        public async Task GetPerformanceAnalytics_AbsentResultsExcluded()
        {
            var exam = MakeExam(_school1);
            _db.Examinations.Add(exam);
            var s1 = MakeStudent(_school1);
            var s2 = MakeStudent(_school1);
            _db.Students.AddRange(s1, s2);
            _db.ExamResults.AddRange(
                MakeExamResult(_school1, exam.Id, s1.Id, 70, true, "Math", isAbsent: false),
                MakeExamResult(_school1, exam.Id, s2.Id, 0, false, "Math", isAbsent: true));
            await _db.SaveChangesAsync();

            var result = await CreateService().GetPerformanceAnalyticsAsync(_school1);

            result.TotalResults.Should().Be(1); // absent excluded
        }

        [Fact]
        public async Task GetPerformanceAnalytics_AveragePercentageCalculatedCorrectly()
        {
            var exam = MakeExam(_school1);
            _db.Examinations.Add(exam);
            var s1 = MakeStudent(_school1);
            var s2 = MakeStudent(_school1);
            _db.Students.AddRange(s1, s2);
            _db.ExamResults.AddRange(
                MakeExamResult(_school1, exam.Id, s1.Id, 80, true, "Math"),
                MakeExamResult(_school1, exam.Id, s2.Id, 60, true, "Math"));
            await _db.SaveChangesAsync();

            var result = await CreateService().GetPerformanceAnalyticsAsync(_school1);

            result.OverallAveragePercentage.Should().Be(70.00m);
        }

        [Fact]
        public async Task GetPerformanceAnalytics_PassRateCalculatedCorrectly()
        {
            var exam = MakeExam(_school1);
            _db.Examinations.Add(exam);
            var s1 = MakeStudent(_school1);
            var s2 = MakeStudent(_school1);
            var s3 = MakeStudent(_school1);
            var s4 = MakeStudent(_school1);
            _db.Students.AddRange(s1, s2, s3, s4);
            _db.ExamResults.AddRange(
                MakeExamResult(_school1, exam.Id, s1.Id, 80, true, "Math"),
                MakeExamResult(_school1, exam.Id, s2.Id, 70, true, "Math"),
                MakeExamResult(_school1, exam.Id, s3.Id, 30, false, "Math"),
                MakeExamResult(_school1, exam.Id, s4.Id, 20, false, "Math"));
            await _db.SaveChangesAsync();

            var result = await CreateService().GetPerformanceAnalyticsAsync(_school1);

            result.OverallPassRate.Should().Be(50.00m);
        }

        [Fact]
        public async Task GetPerformanceAnalytics_BySubjectGroupsCorrectly()
        {
            var exam = MakeExam(_school1);
            _db.Examinations.Add(exam);
            var s1 = MakeStudent(_school1);
            var s2 = MakeStudent(_school1);
            _db.Students.AddRange(s1, s2);
            _db.ExamResults.AddRange(
                MakeExamResult(_school1, exam.Id, s1.Id, 80, true, "Math"),
                MakeExamResult(_school1, exam.Id, s2.Id, 70, true, "Science"));
            await _db.SaveChangesAsync();

            var result = await CreateService().GetPerformanceAnalyticsAsync(_school1);

            result.BySubject.Should().HaveCount(2);
            result.BySubject.Select(s => s.Subject).Should().Contain(new[] { "Math", "Science" });
        }

        [Fact]
        public async Task GetPerformanceAnalytics_AcademicYearFilterWorks()
        {
            _db.Examinations.AddRange(
                MakeExam(_school1, academicYear: "2025-26"),
                MakeExam(_school1, academicYear: "2024-25"),
                MakeExam(_school1, academicYear: "2025-26"));
            await _db.SaveChangesAsync();

            var result = await CreateService().GetPerformanceAnalyticsAsync(_school1, "2025-26");

            result.TotalExams.Should().Be(2);
        }

        [Fact]
        public async Task GetPerformanceAnalytics_SchoolIsolation()
        {
            _db.Examinations.AddRange(MakeExam(_school2), MakeExam(_school2));
            await _db.SaveChangesAsync();

            var result = await CreateService().GetPerformanceAnalyticsAsync(_school1);

            result.TotalExams.Should().Be(0);
        }

        // ═══════════════════════════════════════════════════════════
        // GetFeeAnalyticsAsync
        // ═══════════════════════════════════════════════════════════

        [Fact]
        public async Task GetFeeAnalytics_TotalBilledSumsTotalAmount()
        {
            var s = MakeStudent(_school1);
            _db.Students.Add(s);
            _db.FeeRecords.AddRange(
                MakeFeeRecord(_school1, s.Id, 5000, 5000, "paid", DateTime.UtcNow),
                MakeFeeRecord(_school1, s.Id, 3000, 0, "pending", DateTime.UtcNow));
            await _db.SaveChangesAsync();

            var result = await CreateService().GetFeeAnalyticsAsync(_school1, 6);

            result.TotalBilled.Should().Be(8000m);
        }

        [Fact]
        public async Task GetFeeAnalytics_TotalCollectedSumsPaidAmount()
        {
            var s = MakeStudent(_school1);
            _db.Students.Add(s);
            _db.FeeRecords.AddRange(
                MakeFeeRecord(_school1, s.Id, 5000, 5000, "paid", DateTime.UtcNow),
                MakeFeeRecord(_school1, s.Id, 3000, 1000, "partial", DateTime.UtcNow));
            await _db.SaveChangesAsync();

            var result = await CreateService().GetFeeAnalyticsAsync(_school1, 6);

            result.TotalCollected.Should().Be(6000m);
        }

        [Fact]
        public async Task GetFeeAnalytics_CollectionRateCalculated()
        {
            var s = MakeStudent(_school1);
            _db.Students.Add(s);
            _db.FeeRecords.Add(MakeFeeRecord(_school1, s.Id, 1000, 750, "partial", DateTime.UtcNow));
            await _db.SaveChangesAsync();

            var result = await CreateService().GetFeeAnalyticsAsync(_school1, 6);

            result.CollectionRate.Should().Be(75.00m);
        }

        [Fact]
        public async Task GetFeeAnalytics_OverdueAmountSummedCorrectly()
        {
            var s = MakeStudent(_school1);
            _db.Students.Add(s);
            _db.FeeRecords.AddRange(
                MakeFeeRecord(_school1, s.Id, 1000, 0, "overdue", DateTime.UtcNow),
                MakeFeeRecord(_school1, s.Id, 2000, 0, "overdue", DateTime.UtcNow),
                MakeFeeRecord(_school1, s.Id, 500, 0, "pending", DateTime.UtcNow));
            await _db.SaveChangesAsync();

            var result = await CreateService().GetFeeAnalyticsAsync(_school1, 6);

            result.TotalOverdue.Should().Be(3000m);
        }

        [Fact]
        public async Task GetFeeAnalytics_MonthlyDataHasCorrectNumberOfMonths()
        {
            var result = await CreateService().GetFeeAnalyticsAsync(_school1, 6);

            result.MonthlyData.Should().HaveCount(6);
        }

        [Fact]
        public async Task GetFeeAnalytics_MonthsParamRespected()
        {
            var result = await CreateService().GetFeeAnalyticsAsync(_school1, 3);

            result.MonthlyData.Should().HaveCount(3);
        }

        [Fact]
        public async Task GetFeeAnalytics_EmptySchoolCollectionRateZero()
        {
            var result = await CreateService().GetFeeAnalyticsAsync(Guid.NewGuid(), 6);

            result.CollectionRate.Should().Be(0m);
            result.TotalBilled.Should().Be(0m);
        }

        [Fact]
        public async Task GetFeeAnalytics_SchoolIsolation()
        {
            var s = MakeStudent(_school2);
            _db.Students.Add(s);
            _db.FeeRecords.Add(MakeFeeRecord(_school2, s.Id, 5000, 5000, "paid", DateTime.UtcNow));
            await _db.SaveChangesAsync();

            var result = await CreateService().GetFeeAnalyticsAsync(_school1, 6);

            result.TotalBilled.Should().Be(0m);
        }

        // ═══════════════════════════════════════════════════════════
        // GetDashboardWidgetsAsync
        // ═══════════════════════════════════════════════════════════

        [Fact]
        public async Task GetDashboardWidgets_ReturnsOnlyActiveWidgets()
        {
            _db.DashboardWidgets.AddRange(
                MakeWidget(_school1, "Active Widget", isActive: true),
                MakeWidget(_school1, "Inactive Widget", isActive: false));
            await _db.SaveChangesAsync();

            var result = await CreateService().GetDashboardWidgetsAsync(_school1);

            result.Items.Should().HaveCount(1);
            result.Items[0].Name.Should().Be("Active Widget");
        }

        [Fact]
        public async Task GetDashboardWidgets_FiltersVisibilityExactMatch()
        {
            _db.DashboardWidgets.AddRange(
                MakeWidget(_school1, "Admin Widget", visibility: "admin"),
                MakeWidget(_school1, "Teacher Widget", visibility: "teacher"),
                MakeWidget(_school1, "All Widget", visibility: "all"));
            await _db.SaveChangesAsync();

            var result = await CreateService().GetDashboardWidgetsAsync(_school1, "admin");

            result.Items.Should().HaveCount(2); // admin + all
        }

        [Fact]
        public async Task GetDashboardWidgets_OrderedByDisplayOrder()
        {
            _db.DashboardWidgets.AddRange(
                MakeWidget(_school1, "Third", order: 3),
                MakeWidget(_school1, "First", order: 1),
                MakeWidget(_school1, "Second", order: 2));
            await _db.SaveChangesAsync();

            var result = await CreateService().GetDashboardWidgetsAsync(_school1);

            result.Items.Select(i => i.Name).Should().ContainInOrder("First", "Second", "Third");
        }

        [Fact]
        public async Task GetDashboardWidgets_SchoolIsolation()
        {
            _db.DashboardWidgets.Add(MakeWidget(_school2, "Other School Widget"));
            await _db.SaveChangesAsync();

            var result = await CreateService().GetDashboardWidgetsAsync(_school1);

            result.Items.Should().BeEmpty();
        }

        [Fact]
        public async Task GetDashboardWidgets_NoVisibilityFilterReturnsAll()
        {
            _db.DashboardWidgets.AddRange(
                MakeWidget(_school1, "A", visibility: "admin"),
                MakeWidget(_school1, "B", visibility: "teacher"),
                MakeWidget(_school1, "C", visibility: "all"));
            await _db.SaveChangesAsync();

            var result = await CreateService().GetDashboardWidgetsAsync(_school1); // no filter

            result.Items.Should().HaveCount(3);
        }

        // ═══════════════════════════════════════════════════════════
        // GetDashboardWidgetByIdAsync
        // ═══════════════════════════════════════════════════════════

        [Fact]
        public async Task GetDashboardWidgetById_ReturnsWidgetWhenFound()
        {
            var widget = MakeWidget(_school1, "My Widget");
            _db.DashboardWidgets.Add(widget);
            await _db.SaveChangesAsync();

            var result = await CreateService().GetDashboardWidgetByIdAsync(widget.Id, _school1);

            result.Should().NotBeNull();
            result!.Name.Should().Be("My Widget");
        }

        [Fact]
        public async Task GetDashboardWidgetById_ReturnsNullWhenNotFound()
        {
            var result = await CreateService().GetDashboardWidgetByIdAsync(Guid.NewGuid(), _school1);

            result.Should().BeNull();
        }

        [Fact]
        public async Task GetDashboardWidgetById_ReturnsNullForWrongSchool()
        {
            var widget = MakeWidget(_school2, "Other School Widget");
            _db.DashboardWidgets.Add(widget);
            await _db.SaveChangesAsync();

            var result = await CreateService().GetDashboardWidgetByIdAsync(widget.Id, _school1);

            result.Should().BeNull();
        }

        // ═══════════════════════════════════════════════════════════
        // CreateDashboardWidgetAsync
        // ═══════════════════════════════════════════════════════════

        [Fact]
        public async Task CreateDashboardWidget_SuccessReturnsCreatedWidget()
        {
            var request = new CreateDashboardWidgetRequest
            {
                SchoolId = _school1, Name = "New Widget", WidgetType = "chart",
                DataSource = "students", ChartType = "bar", Size = "medium",
                RefreshInterval = "manual", Visibility = "all"
            };

            var result = await CreateService().CreateDashboardWidgetAsync(request);

            result.Should().NotBeNull();
            result.Name.Should().Be("New Widget");
            result.WidgetType.Should().Be("chart");
            result.SchoolId.Should().Be(_school1);
        }

        [Fact]
        public async Task CreateDashboardWidget_NameRequiredThrows()
        {
            var request = new CreateDashboardWidgetRequest { SchoolId = _school1, Name = "", WidgetType = "chart", DataSource = "s" };

            await CreateService().Invoking(s => s.CreateDashboardWidgetAsync(request))
                .Should().ThrowAsync<ArgumentException>();
        }

        [Fact]
        public async Task CreateDashboardWidget_NameTooLongThrows()
        {
            var request = new CreateDashboardWidgetRequest
            {
                SchoolId = _school1, Name = new string('x', 201), WidgetType = "chart", DataSource = "s"
            };

            await CreateService().Invoking(s => s.CreateDashboardWidgetAsync(request))
                .Should().ThrowAsync<ArgumentException>();
        }

        [Fact]
        public async Task CreateDashboardWidget_InvalidWidgetTypeThrows()
        {
            var request = new CreateDashboardWidgetRequest
            {
                SchoolId = _school1, Name = "Widget", WidgetType = "badtype", DataSource = "s"
            };

            await CreateService().Invoking(s => s.CreateDashboardWidgetAsync(request))
                .Should().ThrowAsync<ArgumentException>();
        }

        [Fact]
        public async Task CreateDashboardWidget_InvalidChartTypeThrows()
        {
            var request = new CreateDashboardWidgetRequest
            {
                SchoolId = _school1, Name = "Widget", WidgetType = "chart", DataSource = "s", ChartType = "hexagon"
            };

            await CreateService().Invoking(s => s.CreateDashboardWidgetAsync(request))
                .Should().ThrowAsync<ArgumentException>();
        }

        [Fact]
        public async Task CreateDashboardWidget_InvalidSizeThrows()
        {
            var request = new CreateDashboardWidgetRequest
            {
                SchoolId = _school1, Name = "Widget", WidgetType = "chart", DataSource = "s", Size = "giant"
            };

            await CreateService().Invoking(s => s.CreateDashboardWidgetAsync(request))
                .Should().ThrowAsync<ArgumentException>();
        }

        [Fact]
        public async Task CreateDashboardWidget_InvalidVisibilityThrows()
        {
            var request = new CreateDashboardWidgetRequest
            {
                SchoolId = _school1, Name = "Widget", WidgetType = "chart", DataSource = "s", Visibility = "superadmin"
            };

            await CreateService().Invoking(s => s.CreateDashboardWidgetAsync(request))
                .Should().ThrowAsync<ArgumentException>();
        }

        [Fact]
        public async Task CreateDashboardWidget_DuplicateNameThrowsInvalidOperation()
        {
            _db.DashboardWidgets.Add(MakeWidget(_school1, "Existing Widget"));
            await _db.SaveChangesAsync();

            var request = new CreateDashboardWidgetRequest
            {
                SchoolId = _school1, Name = "Existing Widget", WidgetType = "chart", DataSource = "s"
            };

            await CreateService().Invoking(s => s.CreateDashboardWidgetAsync(request))
                .Should().ThrowAsync<InvalidOperationException>();
        }

        [Theory]
        [InlineData("chart")]
        [InlineData("metric")]
        [InlineData("table")]
        [InlineData("map")]
        [InlineData("gauge")]
        [InlineData("list")]
        public async Task CreateDashboardWidget_AllValidWidgetTypesAccepted(string widgetType)
        {
            var request = new CreateDashboardWidgetRequest
            {
                SchoolId = _school1, Name = $"Widget_{widgetType}", WidgetType = widgetType, DataSource = "s"
            };

            var result = await CreateService().CreateDashboardWidgetAsync(request);

            result.WidgetType.Should().Be(widgetType);
        }

        [Fact]
        public async Task CreateDashboardWidget_SizeNormalisedToLowercase()
        {
            var request = new CreateDashboardWidgetRequest
            {
                SchoolId = _school1, Name = "Widget", WidgetType = "chart", DataSource = "s", Size = "LARGE"
            };

            var result = await CreateService().CreateDashboardWidgetAsync(request);

            result.Size.Should().Be("large");
        }

        // ═══════════════════════════════════════════════════════════
        // UpdateDashboardWidgetAsync
        // ═══════════════════════════════════════════════════════════

        [Fact]
        public async Task UpdateDashboardWidget_SuccessUpdatesFields()
        {
            var widget = MakeWidget(_school1, "Old Name");
            _db.DashboardWidgets.Add(widget);
            await _db.SaveChangesAsync();

            var request = new UpdateDashboardWidgetRequest { Name = "New Name", IsActive = true };
            var result = await CreateService().UpdateDashboardWidgetAsync(widget.Id, request, _school1);

            result.Name.Should().Be("New Name");
        }

        [Fact]
        public async Task UpdateDashboardWidget_NotFoundThrowsKeyNotFoundException()
        {
            var request = new UpdateDashboardWidgetRequest { Name = "New" };

            await CreateService().Invoking(s => s.UpdateDashboardWidgetAsync(Guid.NewGuid(), request, _school1))
                .Should().ThrowAsync<KeyNotFoundException>();
        }

        [Fact]
        public async Task UpdateDashboardWidget_InvalidChartTypeThrows()
        {
            var widget = MakeWidget(_school1);
            _db.DashboardWidgets.Add(widget);
            await _db.SaveChangesAsync();

            var request = new UpdateDashboardWidgetRequest { ChartType = "invalid" };

            await CreateService().Invoking(s => s.UpdateDashboardWidgetAsync(widget.Id, request, _school1))
                .Should().ThrowAsync<ArgumentException>();
        }

        [Fact]
        public async Task UpdateDashboardWidget_BlankNameThrows()
        {
            var widget = MakeWidget(_school1);
            _db.DashboardWidgets.Add(widget);
            await _db.SaveChangesAsync();

            var request = new UpdateDashboardWidgetRequest { Name = "  " };

            await CreateService().Invoking(s => s.UpdateDashboardWidgetAsync(widget.Id, request, _school1))
                .Should().ThrowAsync<ArgumentException>();
        }

        [Fact]
        public async Task UpdateDashboardWidget_NameTooLongThrows()
        {
            var widget = MakeWidget(_school1);
            _db.DashboardWidgets.Add(widget);
            await _db.SaveChangesAsync();

            var request = new UpdateDashboardWidgetRequest { Name = new string('x', 201) };

            await CreateService().Invoking(s => s.UpdateDashboardWidgetAsync(widget.Id, request, _school1))
                .Should().ThrowAsync<ArgumentException>();
        }

        [Fact]
        public async Task UpdateDashboardWidget_PartialUpdateOnlyChangesProvidedFields()
        {
            var widget = MakeWidget(_school1, "Original", order: 5);
            widget.Size = "small";
            _db.DashboardWidgets.Add(widget);
            await _db.SaveChangesAsync();

            // Only update IsActive — name and size should be unchanged
            var request = new UpdateDashboardWidgetRequest { IsActive = false };
            var result = await CreateService().UpdateDashboardWidgetAsync(widget.Id, request, _school1);

            result.Name.Should().Be("Original");
            result.Size.Should().Be("small");
            result.IsActive.Should().BeFalse();
        }

        // ═══════════════════════════════════════════════════════════
        // DeleteDashboardWidgetAsync
        // ═══════════════════════════════════════════════════════════

        [Fact]
        public async Task DeleteDashboardWidget_ReturnsTrueAndRemovesWidget()
        {
            var widget = MakeWidget(_school1);
            _db.DashboardWidgets.Add(widget);
            await _db.SaveChangesAsync();

            var deleted = await CreateService().DeleteDashboardWidgetAsync(widget.Id, _school1);

            deleted.Should().BeTrue();
            _db.DashboardWidgets.AsNoTracking().FirstOrDefault(w => w.Id == widget.Id).Should().BeNull();
        }

        [Fact]
        public async Task DeleteDashboardWidget_ReturnsFalseWhenNotFound()
        {
            var deleted = await CreateService().DeleteDashboardWidgetAsync(Guid.NewGuid(), _school1);

            deleted.Should().BeFalse();
        }

        [Fact]
        public async Task DeleteDashboardWidget_ReturnsFalseForWrongSchool()
        {
            var widget = MakeWidget(_school2);
            _db.DashboardWidgets.Add(widget);
            await _db.SaveChangesAsync();

            var deleted = await CreateService().DeleteDashboardWidgetAsync(widget.Id, _school1);

            deleted.Should().BeFalse();
            _db.DashboardWidgets.Find(widget.Id).Should().NotBeNull(); // not deleted
        }

        // ═══════════════════════════════════════════════════════════
        // GetAnalyticsAsync (Pagination)
        // ═══════════════════════════════════════════════════════════

        [Fact]
        public async Task GetAnalytics_PageBelowOneNormalisedToOne()
        {
            for (var i = 0; i < 5; i++)
                _db.AnalyticsRecords.Add(MakeAnalyticsRecord(_school1));
            await _db.SaveChangesAsync();

            var result = await CreateService().GetAnalyticsAsync(_school1, page: -5, pageSize: 2);

            result.Page.Should().Be(1);
        }

        [Fact]
        public async Task GetAnalytics_PageSizeBelowOneNormalisedToTen()
        {
            var result = await CreateService().GetAnalyticsAsync(_school1, page: 1, pageSize: -1);

            result.PageSize.Should().Be(10);
        }

        [Fact]
        public async Task GetAnalytics_PageSizeAbove100NormalisedTo100()
        {
            var result = await CreateService().GetAnalyticsAsync(_school1, page: 1, pageSize: 999);

            result.PageSize.Should().Be(100);
        }

        [Fact]
        public async Task GetAnalytics_MetricTypeFilterWorks()
        {
            _db.AnalyticsRecords.AddRange(
                MakeAnalyticsRecord(_school1, "Attendance"),
                MakeAnalyticsRecord(_school1, "Enrollment"),
                MakeAnalyticsRecord(_school1, "Enrollment"));
            await _db.SaveChangesAsync();

            var result = await CreateService().GetAnalyticsAsync(_school1, metricType: "Enrollment");

            result.Items.Should().HaveCount(2);
        }

        [Fact]
        public async Task GetAnalytics_PeriodFilterWorks()
        {
            _db.AnalyticsRecords.AddRange(
                MakeAnalyticsRecord(_school1, period: "Daily"),
                MakeAnalyticsRecord(_school1, period: "Monthly"),
                MakeAnalyticsRecord(_school1, period: "Monthly"));
            await _db.SaveChangesAsync();

            var result = await CreateService().GetAnalyticsAsync(_school1, period: "Monthly");

            result.Items.Should().HaveCount(2);
        }

        [Fact]
        public async Task GetAnalytics_SchoolIsolation()
        {
            _db.AnalyticsRecords.AddRange(
                MakeAnalyticsRecord(_school1),
                MakeAnalyticsRecord(_school2),
                MakeAnalyticsRecord(_school2));
            await _db.SaveChangesAsync();

            var result = await CreateService().GetAnalyticsAsync(_school1);

            result.Items.Should().HaveCount(1);
        }

        // ═══════════════════════════════════════════════════════════
        // CreateAnalyticsAsync
        // ═══════════════════════════════════════════════════════════

        [Fact]
        public async Task CreateAnalytics_SuccessReturnsRecord()
        {
            var request = new CreateAnalyticsRequest
            {
                SchoolId = _school1, MetricType = "Attendance", MetricName = "Daily Attendance",
                Value = 85m, Period = "Daily",
                PeriodStart = DateTime.UtcNow.AddDays(-1), PeriodEnd = DateTime.UtcNow
            };

            var result = await CreateService().CreateAnalyticsAsync(request);

            result.Should().NotBeNull();
            result.MetricName.Should().Be("Daily Attendance");
            result.Value.Should().Be(85m);
        }

        [Fact]
        public async Task CreateAnalytics_MetricNameRequiredThrows()
        {
            var request = new CreateAnalyticsRequest
            {
                SchoolId = _school1, MetricType = "Attendance", MetricName = "",
                Value = 50, Period = "Daily",
                PeriodStart = DateTime.UtcNow.AddDays(-1), PeriodEnd = DateTime.UtcNow
            };

            await CreateService().Invoking(s => s.CreateAnalyticsAsync(request))
                .Should().ThrowAsync<ArgumentException>();
        }

        [Fact]
        public async Task CreateAnalytics_MetricNameTooLongThrows()
        {
            var request = new CreateAnalyticsRequest
            {
                SchoolId = _school1, MetricType = "Attendance", MetricName = new string('x', 201),
                Value = 50, Period = "Daily",
                PeriodStart = DateTime.UtcNow.AddDays(-1), PeriodEnd = DateTime.UtcNow
            };

            await CreateService().Invoking(s => s.CreateAnalyticsAsync(request))
                .Should().ThrowAsync<ArgumentException>();
        }

        [Fact]
        public async Task CreateAnalytics_InvalidMetricTypeThrows()
        {
            var request = new CreateAnalyticsRequest
            {
                SchoolId = _school1, MetricType = "UnknownType", MetricName = "Test",
                Value = 50, Period = "Daily",
                PeriodStart = DateTime.UtcNow.AddDays(-1), PeriodEnd = DateTime.UtcNow
            };

            await CreateService().Invoking(s => s.CreateAnalyticsAsync(request))
                .Should().ThrowAsync<ArgumentException>();
        }

        [Fact]
        public async Task CreateAnalytics_InvalidPeriodThrows()
        {
            var request = new CreateAnalyticsRequest
            {
                SchoolId = _school1, MetricType = "Attendance", MetricName = "Test",
                Value = 50, Period = "Hourly",
                PeriodStart = DateTime.UtcNow.AddDays(-1), PeriodEnd = DateTime.UtcNow
            };

            await CreateService().Invoking(s => s.CreateAnalyticsAsync(request))
                .Should().ThrowAsync<ArgumentException>();
        }

        [Fact]
        public async Task CreateAnalytics_PeriodEndBeforeStartThrows()
        {
            var request = new CreateAnalyticsRequest
            {
                SchoolId = _school1, MetricType = "Attendance", MetricName = "Test",
                Value = 50, Period = "Daily",
                PeriodStart = DateTime.UtcNow, PeriodEnd = DateTime.UtcNow.AddDays(-1)
            };

            await CreateService().Invoking(s => s.CreateAnalyticsAsync(request))
                .Should().ThrowAsync<ArgumentException>();
        }

        [Fact]
        public async Task CreateAnalytics_NegativeValueThrows()
        {
            var request = new CreateAnalyticsRequest
            {
                SchoolId = _school1, MetricType = "Attendance", MetricName = "Test",
                Value = -5, Period = "Daily",
                PeriodStart = DateTime.UtcNow.AddDays(-1), PeriodEnd = DateTime.UtcNow
            };

            await CreateService().Invoking(s => s.CreateAnalyticsAsync(request))
                .Should().ThrowAsync<ArgumentException>();
        }

        [Fact]
        public async Task CreateAnalytics_UnitTooLongThrows()
        {
            var request = new CreateAnalyticsRequest
            {
                SchoolId = _school1, MetricType = "Attendance", MetricName = "Test",
                Value = 50, Unit = new string('u', 31), Period = "Daily",
                PeriodStart = DateTime.UtcNow.AddDays(-1), PeriodEnd = DateTime.UtcNow
            };

            await CreateService().Invoking(s => s.CreateAnalyticsAsync(request))
                .Should().ThrowAsync<ArgumentException>();
        }

        // ═══════════════════════════════════════════════════════════
        // DeleteAnalyticsAsync
        // ═══════════════════════════════════════════════════════════

        [Fact]
        public async Task DeleteAnalytics_ReturnsTrueAndRemovesRecord()
        {
            var record = MakeAnalyticsRecord(_school1);
            _db.AnalyticsRecords.Add(record);
            await _db.SaveChangesAsync();

            var deleted = await CreateService().DeleteAnalyticsAsync(record.Id, _school1);

            deleted.Should().BeTrue();
        }

        [Fact]
        public async Task DeleteAnalytics_ReturnsFalseWhenNotFound()
        {
            var deleted = await CreateService().DeleteAnalyticsAsync(Guid.NewGuid(), _school1);

            deleted.Should().BeFalse();
        }

        [Fact]
        public async Task DeleteAnalytics_ReturnsFalseForWrongSchool()
        {
            var record = MakeAnalyticsRecord(_school2);
            _db.AnalyticsRecords.Add(record);
            await _db.SaveChangesAsync();

            var deleted = await CreateService().DeleteAnalyticsAsync(record.Id, _school1);

            deleted.Should().BeFalse();
        }
    }
}
