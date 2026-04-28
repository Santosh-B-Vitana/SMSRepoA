using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;
using SmsApi.Data;
using SmsApi.Models.Constants;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;
using SmsApi.Services;
using Xunit;

namespace SmsApi.Tests.Unit.Attendance;

public class AttendanceServiceTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly AttendanceService _service;
    private readonly Guid _schoolId = Guid.NewGuid();
    private readonly Guid _otherSchoolId = Guid.NewGuid();

    public AttendanceServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        _context = new AppDbContext(options);
        _service = new AttendanceService(_context, NullLogger<AttendanceService>.Instance);
    }

    public void Dispose() => _context.Dispose();

    [Fact]
    public async Task GetAttendanceRecords_NormalizesInvalidPagination()
    {
        var student = await SeedStudentAsync(_schoolId);
        await SeedAttendanceRecordAsync(_schoolId, student.Id, StatusConstants.AttendanceStatus.Present, DateTime.UtcNow.Date);

        var result = await _service.GetAttendanceRecordsAsync(_schoolId, new AttendanceFiltersDto(), 0, -1);

        result.Page.Should().Be(1);
        result.PageSize.Should().Be(20);
        result.Items.Should().HaveCount(1);
    }

    [Fact]
    public async Task GetAttendanceRecords_Throws_WhenStatusFilterInvalid()
    {
        var act = async () => await _service.GetAttendanceRecordsAsync(
            _schoolId,
            new AttendanceFiltersDto { Status = "bogus" },
            1,
            20);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Status must be one of*");
    }

    [Fact]
    public async Task MarkAttendance_Throws_WhenDateInFuture()
    {
        var student = await SeedStudentAsync(_schoolId);

        var act = async () => await _service.MarkAttendanceAsync(
            _schoolId,
            new MarkAttendanceDto
            {
                StudentId = student.Id,
                Date = DateTime.UtcNow.Date.AddDays(1),
                Status = StatusConstants.AttendanceStatus.Present
            },
            Guid.NewGuid());

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*cannot be in the future*");
    }

    [Fact]
    public async Task MarkAttendance_Throws_WhenStatusInvalid()
    {
        var student = await SeedStudentAsync(_schoolId);

        var act = async () => await _service.MarkAttendanceAsync(
            _schoolId,
            new MarkAttendanceDto
            {
                StudentId = student.Id,
                Date = DateTime.UtcNow.Date,
                Status = "ghost"
            },
            Guid.NewGuid());

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Status must be one of*");
    }

    [Fact]
    public async Task MarkAttendance_Throws_WhenStudentNotInSchool()
    {
        var student = await SeedStudentAsync(_otherSchoolId);

        var act = async () => await _service.MarkAttendanceAsync(
            _schoolId,
            new MarkAttendanceDto
            {
                StudentId = student.Id,
                Date = DateTime.UtcNow.Date,
                Status = StatusConstants.AttendanceStatus.Present
            },
            Guid.NewGuid());

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Student not enrolled in school*");
    }

    [Fact]
    public async Task MarkAttendance_CreatesRecord_WithNormalizedStatus()
    {
        var student = await SeedStudentAsync(_schoolId);

        var result = await _service.MarkAttendanceAsync(
            _schoolId,
            new MarkAttendanceDto
            {
                StudentId = student.Id,
                Date = DateTime.UtcNow.Date,
                Status = " PRESENT "
            },
            Guid.NewGuid());

        result.Status.Should().Be(StatusConstants.AttendanceStatus.Present);
    }

    [Fact]
    public async Task BulkMarkAttendance_Throws_WhenDuplicateStudentsInPayload()
    {
        var student = await SeedStudentAsync(_schoolId);

        var act = async () => await _service.BulkMarkAttendanceAsync(
            _schoolId,
            new BulkMarkAttendanceDto
            {
                Date = DateTime.UtcNow.Date,
                Attendances = new List<MarkAttendanceDto>
                {
                    new() { StudentId = student.Id, Date = DateTime.UtcNow.Date, Status = StatusConstants.AttendanceStatus.Present },
                    new() { StudentId = student.Id, Date = DateTime.UtcNow.Date, Status = StatusConstants.AttendanceStatus.Absent }
                }
            },
            Guid.NewGuid());

        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*Duplicate student IDs*");
    }

    [Fact]
    public async Task BulkMarkAttendance_Throws_WhenAnyStatusInvalid()
    {
        var student1 = await SeedStudentAsync(_schoolId);
        var student2 = await SeedStudentAsync(_schoolId);

        var act = async () => await _service.BulkMarkAttendanceAsync(
            _schoolId,
            new BulkMarkAttendanceDto
            {
                Date = DateTime.UtcNow.Date,
                Attendances = new List<MarkAttendanceDto>
                {
                    new() { StudentId = student1.Id, Date = DateTime.UtcNow.Date, Status = StatusConstants.AttendanceStatus.Present },
                    new() { StudentId = student2.Id, Date = DateTime.UtcNow.Date, Status = "invalid" }
                }
            },
            Guid.NewGuid());

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Status must be one of*");
    }

    [Fact]
    public async Task CreateLeaveRequest_Throws_WhenStudentMissingInSchool()
    {
        var student = await SeedStudentAsync(_otherSchoolId);

        var act = async () => await _service.CreateLeaveRequestAsync(
            _schoolId,
            new CreateLeaveRequestDto
            {
                StudentId = student.Id,
                LeaveType = "sick",
                StartDate = DateTime.UtcNow.Date,
                EndDate = DateTime.UtcNow.Date.AddDays(1),
                Reason = "fever"
            });

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Student not found in school*");
    }

    [Fact]
    public async Task CreateLeaveRequest_Throws_WhenDateRangeInvalid()
    {
        var student = await SeedStudentAsync(_schoolId);

        var act = async () => await _service.CreateLeaveRequestAsync(
            _schoolId,
            new CreateLeaveRequestDto
            {
                StudentId = student.Id,
                LeaveType = "sick",
                StartDate = DateTime.UtcNow.Date.AddDays(2),
                EndDate = DateTime.UtcNow.Date.AddDays(1),
                Reason = "fever"
            });

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*StartDate cannot be after EndDate*");
    }

    [Fact]
    public async Task CreateLeaveRequest_Throws_WhenLeaveTypeInvalid()
    {
        var student = await SeedStudentAsync(_schoolId);

        var act = async () => await _service.CreateLeaveRequestAsync(
            _schoolId,
            new CreateLeaveRequestDto
            {
                StudentId = student.Id,
                LeaveType = "vacation",
                StartDate = DateTime.UtcNow.Date,
                EndDate = DateTime.UtcNow.Date.AddDays(1),
                Reason = "trip"
            });

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*LeaveType must be one of*");
    }

    [Fact]
    public async Task CreateLeaveRequest_Throws_OnOverlappingPendingOrApproved()
    {
        var student = await SeedStudentAsync(_schoolId);
        await SeedLeaveRequestAsync(_schoolId, student.Id, StatusConstants.LeaveStatus.Pending, DateTime.UtcNow.Date.AddDays(3), DateTime.UtcNow.Date.AddDays(5));

        var act = async () => await _service.CreateLeaveRequestAsync(
            _schoolId,
            new CreateLeaveRequestDto
            {
                StudentId = student.Id,
                LeaveType = "sick",
                StartDate = DateTime.UtcNow.Date.AddDays(4),
                EndDate = DateTime.UtcNow.Date.AddDays(6),
                Reason = "overlap"
            });

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*overlaps with an existing pending or approved request*");
    }

    [Fact]
    public async Task RejectLeaveRequest_Throws_WhenReasonMissing()
    {
        var student = await SeedStudentAsync(_schoolId);
        var leave = await SeedLeaveRequestAsync(_schoolId, student.Id, StatusConstants.LeaveStatus.Pending, DateTime.UtcNow.Date, DateTime.UtcNow.Date.AddDays(1));

        var act = async () => await _service.RejectLeaveRequestAsync(_schoolId, leave.Id, Guid.NewGuid(), " ");

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Rejection reason is required*");
    }

    [Fact]
    public async Task GetAttendanceStats_Throws_WhenDateRangeInvalid()
    {
        var act = async () => await _service.GetAttendanceStatsAsync(
            _schoolId,
            DateTime.UtcNow.Date,
            DateTime.UtcNow.Date.AddDays(-1));

        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*Start date cannot be after end date*");
    }

    [Fact]
    public async Task GetMonthlyTrend_Throws_WhenYearOutOfRange()
    {
        var act = async () => await _service.GetMonthlyTrendAsync(_schoolId, 1900);

        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*between 2000 and 2100*");
    }

    [Fact]
    public async Task ApproveLeaveRequest_Throws_WhenAlreadyProcessed_CaseInsensitive()
    {
        var student = await SeedStudentAsync(_schoolId);
        var leave = await SeedLeaveRequestAsync(_schoolId, student.Id, "Approved", DateTime.UtcNow.Date, DateTime.UtcNow.Date.AddDays(1));

        var act = async () => await _service.ApproveLeaveRequestAsync(_schoolId, leave.Id, Guid.NewGuid(), "ok");

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*already been processed*");
    }

    private async Task<Student> SeedStudentAsync(Guid schoolId)
    {
        var student = new Student
        {
            Id = Guid.NewGuid(),
            SchoolId = schoolId,
            Name = $"Student-{Guid.NewGuid():N}",
            Class = "10",
            Section = "A",
            DateOfBirth = new DateTime(2010, 1, 1),
            Status = "active",
            AdmissionDate = DateTime.UtcNow.Date.AddYears(-1),
            Address = "Address",
            GuardianName = "Guardian",
            GuardianPhone = "9999999999",
            Category = "General",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Students.Add(student);
        await _context.SaveChangesAsync();
        return student;
    }

    private async Task<AttendanceRecord> SeedAttendanceRecordAsync(Guid schoolId, Guid studentId, string status, DateTime date)
    {
        var entity = new AttendanceRecord
        {
            Id = Guid.NewGuid(),
            SchoolId = schoolId,
            StudentId = studentId,
            Date = date.Date,
            Status = status,
            MarkedBy = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.AttendanceRecords.Add(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    private async Task<StudentLeaveRequest> SeedLeaveRequestAsync(Guid schoolId, Guid studentId, string status, DateTime startDate, DateTime endDate)
    {
        var entity = new StudentLeaveRequest
        {
            Id = Guid.NewGuid(),
            SchoolId = schoolId,
            StudentId = studentId,
            LeaveType = "sick",
            StartDate = startDate.Date,
            EndDate = endDate.Date,
            Reason = "reason",
            Status = status,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.AttendanceLeaveRequests.Add(entity);
        await _context.SaveChangesAsync();
        return entity;
    }
}
