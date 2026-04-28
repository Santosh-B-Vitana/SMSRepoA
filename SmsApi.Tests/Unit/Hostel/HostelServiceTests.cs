using System;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;
using SmsApi.Services;
using Xunit;
using Microsoft.Extensions.Logging;
using Moq;

namespace SmsApi.Tests.Unit.Hostel;

public class HostelServiceTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly HostelService _service;
    private readonly Guid _schoolId = Guid.NewGuid();
    private readonly Mock<ILogger<HostelService>> _mockLogger;

    public HostelServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _context = new AppDbContext(options);
        _mockLogger = new Mock<ILogger<HostelService>>();
        _service = new HostelService(_context, _mockLogger.Object);
    }

    public void Dispose() => _context.Dispose();

    // ── Helpers ─────────────────────────────────────────────────────────

    private async Task<HostelRoom> SeedRoomAsync(
        Guid schoolId,
        string roomNumber = "101",
        string roomType = "co-ed",
        int capacity = 4,
        int occupied = 0,
        string? status = null)
    {
        var room = new HostelRoom
        {
            Id = Guid.NewGuid(),
            SchoolId = schoolId,
            RoomNumber = roomNumber,
            RoomType = roomType,
            Capacity = capacity,
            Occupied = occupied,
            RentPerBed = 500,
            Floor = "1",
            Status = status ?? "available",
            Facilities = "bed,table,chair",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.HostelRooms.Add(room);
        await _context.SaveChangesAsync();
        return room;
    }

    private async Task<Student> SeedStudentAsync(
        Guid schoolId,
        string className = "10",
        string gender = "male",
        string? status = null)
    {
        var student = new Student
        {
            Id = Guid.NewGuid(),
            SchoolId = schoolId,
            Name = $"Student {Guid.NewGuid().ToString("N")[..8]}",
            FirstName = "Test",
            LastName = "Student",
            AdmissionNumber = $"S{Guid.NewGuid().ToString("N")[..8]}",
            Class = className,
            Section = "A",
            DateOfBirth = new DateTime(2010, 1, 1),
            Gender = gender,
            Status = status ?? "active",
            AdmissionDate = DateTime.UtcNow.AddYears(-1),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Students.Add(student);
        await _context.SaveChangesAsync();
        return student;
    }

    // ── GetRoomsAsync: Pagination ────────────────────────────────────────

    [Fact]
    public async Task GetRoomsAsync_NormalizesNegativePage()
    {
        await SeedRoomAsync(_schoolId);
        var result = await _service.GetRoomsAsync(_schoolId, -5, 10);
        result.Page.Should().Be(1);
    }

    [Fact]
    public async Task GetRoomsAsync_NormalizesZeroPageSize()
    {
        await SeedRoomAsync(_schoolId);
        var result = await _service.GetRoomsAsync(_schoolId, 1, 0);
        result.PageSize.Should().Be(1);
    }

    [Fact]
    public async Task GetRoomsAsync_ClampsTooLargePageSize()
    {
        await SeedRoomAsync(_schoolId);
        var result = await _service.GetRoomsAsync(_schoolId, 1, 9999);
        result.PageSize.Should().Be(100);
    }

    [Fact]
    public async Task GetRoomsAsync_ReturnsPaginatedRooms()
    {
        for (int i = 0; i < 5; i++)
            await SeedRoomAsync(_schoolId, $"10{i}");

        var result = await _service.GetRoomsAsync(_schoolId, 1, 2);
        result.Rooms.Should().HaveCount(2);
        result.Total.Should().Be(5);
        result.Page.Should().Be(1);
        result.PageSize.Should().Be(2);
    }

    [Fact]
    public async Task GetRoomsAsync_EnforcesSchoolIsolation()
    {
        var otherSchool = Guid.NewGuid();
        await SeedRoomAsync(_schoolId, "101");
        await SeedRoomAsync(otherSchool, "202");

        var result = await _service.GetRoomsAsync(_schoolId, 1, 10);
        result.Rooms.Should().HaveCount(1);
        result.Rooms[0].RoomNumber.Should().Be("101");
    }

    // ── CreateRoomAsync: Validation ────────────────────────────────────────

    [Fact]
    public async Task CreateRoomAsync_ThrowsWhenRoomNumberEmpty()
    {
        var request = new CreateHostelRoomRequest
        {
            SchoolId = _schoolId,
            RoomNumber = "",
            RoomType = "co-ed",
            Capacity = 4,
            Occupied = 0,
            RentPerBed = 500
        };
        await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateRoomAsync(request));
    }

    [Fact]
    public async Task CreateRoomAsync_ThrowsWhenRoomTypeEmpty()
    {
        var request = new CreateHostelRoomRequest
        {
            SchoolId = _schoolId,
            RoomNumber = "101",
            RoomType = "",
            Capacity = 4,
            Occupied = 0,
            RentPerBed = 500
        };
        await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateRoomAsync(request));
    }

    [Fact]
    public async Task CreateRoomAsync_ThrowsWhenCapacityZero()
    {
        var request = new CreateHostelRoomRequest
        {
            SchoolId = _schoolId,
            RoomNumber = "101",
            RoomType = "co-ed",
            Capacity = 0,
            Occupied = 0,
            RentPerBed = 500
        };
        await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateRoomAsync(request));
    }

    [Fact]
    public async Task CreateRoomAsync_ThrowsWhenCapacityNegative()
    {
        var request = new CreateHostelRoomRequest
        {
            SchoolId = _schoolId,
            RoomNumber = "101",
            RoomType = "co-ed",
            Capacity = -5,
            Occupied = 0,
            RentPerBed = 500
        };
        await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateRoomAsync(request));
    }

    [Fact]
    public async Task CreateRoomAsync_ThrowsWhenRentPerBedNegative()
    {
        var request = new CreateHostelRoomRequest
        {
            SchoolId = _schoolId,
            RoomNumber = "101",
            RoomType = "co-ed",
            Capacity = 4,
            Occupied = 0,
            RentPerBed = -100
        };
        await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateRoomAsync(request));
    }

    [Fact]
    public async Task CreateRoomAsync_ThrowsWhenInvalidRoomType()
    {
        var request = new CreateHostelRoomRequest
        {
            SchoolId = _schoolId,
            RoomNumber = "101",
            RoomType = "invalid",
            Capacity = 4,
            Occupied = 0,
            RentPerBed = 500
        };
        await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateRoomAsync(request));
    }

    [Fact]
    public async Task CreateRoomAsync_ThrowsWhenDuplicateRoomNumber()
    {
        await SeedRoomAsync(_schoolId, "101");
        var request = new CreateHostelRoomRequest
        {
            SchoolId = _schoolId,
            RoomNumber = "101",
            RoomType = "co-ed",
            Capacity = 4,
            Occupied = 0,
            RentPerBed = 500
        };
        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.CreateRoomAsync(request));
    }

    [Fact]
    public async Task CreateRoomAsync_AllowsDuplicateRoomNumberInDifferentSchool()
    {
        var otherSchool = Guid.NewGuid();
        await SeedRoomAsync(_schoolId, "101");
        
        var request = new CreateHostelRoomRequest
        {
            SchoolId = otherSchool,
            RoomNumber = "101",
            RoomType = "co-ed",
            Capacity = 4,
            Occupied = 0,
            RentPerBed = 500
        };
        var result = await _service.CreateRoomAsync(request);
        result.Should().NotBeNull();
        result.RoomNumber.Should().Be("101");
    }

    [Fact]
    public async Task CreateRoomAsync_AcceptsValidRoomTypes()
    {
        var roomTypes = new[] { "boys", "girls", "co-ed" };
        foreach (var type in roomTypes)
        {
            var request = new CreateHostelRoomRequest
            {
                SchoolId = _schoolId,
                RoomNumber = $"R{Guid.NewGuid().ToString("N")[..6]}",
                RoomType = type,
                Capacity = 4,
                Occupied = 0,
                RentPerBed = 500
            };
            var result = await _service.CreateRoomAsync(request);
            result.RoomType.Should().Be(type);
        }
    }

    // ── UpdateRoomAsync: Validation ────────────────────────────────────────

    [Fact]
    public async Task UpdateRoomAsync_ThrowsWhenRoomNotFound()
    {
        var request = new CreateHostelRoomRequest
        {
            SchoolId = _schoolId,
            RoomNumber = "101",
            RoomType = "co-ed",
            Capacity = 4,
            RentPerBed = 500
        };
        await Assert.ThrowsAsync<NullReferenceException>(async () =>
        {
            var result = await _service.UpdateRoomAsync(Guid.NewGuid(), _schoolId, request);
            if (result == null) throw new NullReferenceException();
        });
    }

    [Fact]
    public async Task UpdateRoomAsync_ThrowsWhenCapacityBelowOccupancy()
    {
        var room = await SeedRoomAsync(_schoolId, "101", capacity: 4);
        var student1 = await SeedStudentAsync(_schoolId);
        var student2 = await SeedStudentAsync(_schoolId);
        var student3 = await SeedStudentAsync(_schoolId);
        
        // Assign 3 students to the room
        for (int i = 0; i < 3; i++)
        {
            var students = new[] { student1, student2, student3 };
            var assignRequest = new CreateHostelStudentRequest
            {
                SchoolId = _schoolId,
                StudentId = students[i].Id,
                RoomId = room.Id,
                CheckInDate = DateTime.Now.AddDays(1),
                MonthlyFee = 500
            };
            await _service.AssignStudentToRoomAsync(assignRequest);
        }
        
        // Try to reduce capacity below current occupancy - should fail
        var request = new CreateHostelRoomRequest
        {
            SchoolId = _schoolId,
            RoomNumber = "101",
            RoomType = "co-ed",
            Capacity = 2,
            RentPerBed = 500
        };
        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.UpdateRoomAsync(room.Id, _schoolId, request));
    }

    [Fact]
    public async Task UpdateRoomAsync_AllowsCapacityIncrement()
    {
        var room = await SeedRoomAsync(_schoolId, "101", capacity: 4);
        var student1 = await SeedStudentAsync(_schoolId);
        var student2 = await SeedStudentAsync(_schoolId);
        var student3 = await SeedStudentAsync(_schoolId);
        
        // Assign 3 students to the room
        for (int i = 0; i < 3; i++)
        {
            var students = new[] { student1, student2, student3 };
            var assignRequest = new CreateHostelStudentRequest
            {
                SchoolId = _schoolId,
                StudentId = students[i].Id,
                RoomId = room.Id,
                CheckInDate = DateTime.Now.AddDays(1),
                MonthlyFee = 500
            };
            await _service.AssignStudentToRoomAsync(assignRequest);
        }
        
        var request = new CreateHostelRoomRequest
        {
            SchoolId = _schoolId,
            RoomNumber = "101",
            RoomType = "co-ed",
            Capacity = 6,
            RentPerBed = 500
        };
        var result = await _service.UpdateRoomAsync(room.Id, _schoolId, request);
        result.Should().NotBeNull();
        result!.Capacity.Should().Be(6);
    }

    [Fact]
    public async Task UpdateRoomAsync_ThrowsWhenDuplicateRoomNumber()
    {
        var room1 = await SeedRoomAsync(_schoolId, "101");
        var room2 = await SeedRoomAsync(_schoolId, "102");
        
        var request = new CreateHostelRoomRequest
        {
            SchoolId = _schoolId,
            RoomNumber = "101",
            RoomType = "co-ed",
            Capacity = 4,
            RentPerBed = 500
        };
        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.UpdateRoomAsync(room2.Id, _schoolId, request));
    }

    // ── AssignStudentToRoomAsync: Capacity Validation ─────────────────────

    [Fact]
    public async Task AssignStudentToRoomAsync_ThrowsWhenRoomNotFound()
    {
        var student = await SeedStudentAsync(_schoolId);
        var request = new CreateHostelStudentRequest
        {
            SchoolId = _schoolId,
            StudentId = student.Id,
            RoomId = Guid.NewGuid(),
            CheckInDate = DateTime.Now.AddDays(1),
            MonthlyFee = 500
        };
        await Assert.ThrowsAsync<KeyNotFoundException>(() => _service.AssignStudentToRoomAsync(request));
    }

    [Fact]
    public async Task AssignStudentToRoomAsync_ThrowsWhenStudentNotFound()
    {
        var room = await SeedRoomAsync(_schoolId);
        var request = new CreateHostelStudentRequest
        {
            SchoolId = _schoolId,
            StudentId = Guid.NewGuid(),
            RoomId = room.Id,
            CheckInDate = DateTime.Now.AddDays(1),
            MonthlyFee = 500
        };
        await Assert.ThrowsAsync<KeyNotFoundException>(() => _service.AssignStudentToRoomAsync(request));
    }

    [Fact]
    public async Task AssignStudentToRoomAsync_ThrowsWhenRoomFull()
    {
        var room = await SeedRoomAsync(_schoolId, capacity: 2);
        var student1 = await SeedStudentAsync(_schoolId, gender: "male");
        var student2 = await SeedStudentAsync(_schoolId, gender: "female");
        var student3 = await SeedStudentAsync(_schoolId, gender: "male");
        
        // Fill the room with 2 students
        var request1 = new CreateHostelStudentRequest
        {
            SchoolId = _schoolId,
            StudentId = student1.Id,
            RoomId = room.Id,
            CheckInDate = DateTime.Now.AddDays(1),
            MonthlyFee = 500
        };
        await _service.AssignStudentToRoomAsync(request1);

        var request2 = new CreateHostelStudentRequest
        {
            SchoolId = _schoolId,
            StudentId = student2.Id,
            RoomId = room.Id,
            CheckInDate = DateTime.Now.AddDays(1),
            MonthlyFee = 500
        };
        await _service.AssignStudentToRoomAsync(request2);
        
        // Try to add third student - should fail
        var request3 = new CreateHostelStudentRequest
        {
            SchoolId = _schoolId,
            StudentId = student3.Id,
            RoomId = room.Id,
            CheckInDate = DateTime.Now.AddDays(1),
            MonthlyFee = 500
        };
        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.AssignStudentToRoomAsync(request3));
    }

    [Fact]
    public async Task AssignStudentToRoomAsync_ThrowsWhenStudentDroppedOut()
    {
        var room = await SeedRoomAsync(_schoolId);
        var student = await SeedStudentAsync(_schoolId, status: "dropped_out");
        
        var request = new CreateHostelStudentRequest
        {
            SchoolId = _schoolId,
            StudentId = student.Id,
            RoomId = room.Id,
            CheckInDate = DateTime.Now,
            MonthlyFee = 500
        };
        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.AssignStudentToRoomAsync(request));
    }

    // ── AssignStudentToRoomAsync: Gender-Based Allocation ───────────────────

    [Fact]
    public async Task AssignStudentToRoomAsync_EnforceBoysRoomForMaleOnly()
    {
        var room = await SeedRoomAsync(_schoolId, roomType: "boys");
        var femaleStudent = await SeedStudentAsync(_schoolId, gender: "female");
        
        var request = new CreateHostelStudentRequest
        {
            SchoolId = _schoolId,
            StudentId = femaleStudent.Id,
            RoomId = room.Id,
            CheckInDate = DateTime.Now,
            MonthlyFee = 500
        };
        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.AssignStudentToRoomAsync(request));
    }

    [Fact]
    public async Task AssignStudentToRoomAsync_EnforceGirlsRoomForFemaleOnly()
    {
        var room = await SeedRoomAsync(_schoolId, roomType: "girls");
        var maleStudent = await SeedStudentAsync(_schoolId, gender: "male");
        
        var request = new CreateHostelStudentRequest
        {
            SchoolId = _schoolId,
            StudentId = maleStudent.Id,
            RoomId = room.Id,
            CheckInDate = DateTime.Now,
            MonthlyFee = 500
        };
        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.AssignStudentToRoomAsync(request));
    }

    [Fact]
    public async Task AssignStudentToRoomAsync_AllowsCoEdRoomForAnyGender()
    {
        var room = await SeedRoomAsync(_schoolId, roomType: "co-ed");
        var student1 = await SeedStudentAsync(_schoolId, gender: "male");
        var student2 = await SeedStudentAsync(_schoolId, gender: "female");
        
        var request1 = new CreateHostelStudentRequest
        {
            SchoolId = _schoolId,
            StudentId = student1.Id,
            RoomId = room.Id,
            CheckInDate = DateTime.Now,
            MonthlyFee = 500
        };
        var result1 = await _service.AssignStudentToRoomAsync(request1);
        result1.Should().NotBeNull();

        var request2 = new CreateHostelStudentRequest
        {
            SchoolId = _schoolId,
            StudentId = student2.Id,
            RoomId = room.Id,
            CheckInDate = DateTime.Now,
            MonthlyFee = 500
        };
        var result2 = await _service.AssignStudentToRoomAsync(request2);
        result2.Should().NotBeNull();
    }

    // ── AssignStudentToRoomAsync: Age-Based Allocation ──────────────────────

    [Fact]
    public async Task AssignStudentToRoomAsync_PreventsMixingJuniorAndSenior()
    {
        var room = await SeedRoomAsync(_schoolId);
        var juniorStudent = await SeedStudentAsync(_schoolId, className: "3");
        var seniorStudent = await SeedStudentAsync(_schoolId, className: "8");
        
        // Assign junior student first
        var juniorRequest = new CreateHostelStudentRequest
        {
            SchoolId = _schoolId,
            StudentId = juniorStudent.Id,
            RoomId = room.Id,
            CheckInDate = DateTime.Now,
            MonthlyFee = 500
        };
        await _service.AssignStudentToRoomAsync(juniorRequest);

        // Try to assign senior student - should fail
        var seniorRequest = new CreateHostelStudentRequest
        {
            SchoolId = _schoolId,
            StudentId = seniorStudent.Id,
            RoomId = room.Id,
            CheckInDate = DateTime.Now,
            MonthlyFee = 500
        };
        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.AssignStudentToRoomAsync(seniorRequest));
    }

    // ── AssignStudentToRoomAsync: Duplicate Assignment ─────────────────────

    [Fact]
    public async Task AssignStudentToRoomAsync_PreventsDuplicateAssignment()
    {
        var room1 = await SeedRoomAsync(_schoolId, "101");
        var room2 = await SeedRoomAsync(_schoolId, "102");
        var student = await SeedStudentAsync(_schoolId);
        
        // Assign student to first room
        var request1 = new CreateHostelStudentRequest
        {
            SchoolId = _schoolId,
            StudentId = student.Id,
            RoomId = room1.Id,
            CheckInDate = DateTime.Now,
            MonthlyFee = 500
        };
        await _service.AssignStudentToRoomAsync(request1);

        // Try to assign to second room - should fail
        var request2 = new CreateHostelStudentRequest
        {
            SchoolId = _schoolId,
            StudentId = student.Id,
            RoomId = room2.Id,
            CheckInDate = DateTime.Now,
            MonthlyFee = 500
        };
        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.AssignStudentToRoomAsync(request2));
    }

    // ── AssignStudentToRoomAsync: Date Validation ─────────────────────────

    [Fact]
    public async Task AssignStudentToRoomAsync_ThrowsWhenCheckOutDateBeforeCheckInDate()
    {
        var room = await SeedRoomAsync(_schoolId);
        var student = await SeedStudentAsync(_schoolId);
        
        var request = new CreateHostelStudentRequest
        {
            SchoolId = _schoolId,
            StudentId = student.Id,
            RoomId = room.Id,
            CheckInDate = DateTime.Now.AddDays(10),
            CheckOutDate = DateTime.Now.AddDays(5),
            MonthlyFee = 500
        };
        await Assert.ThrowsAsync<ArgumentException>(() => _service.AssignStudentToRoomAsync(request));
    }

    [Fact]
    public async Task AssignStudentToRoomAsync_ThrowsWhenCheckInDateInPast()
    {
        var room = await SeedRoomAsync(_schoolId);
        var student = await SeedStudentAsync(_schoolId);
        
        var request = new CreateHostelStudentRequest
        {
            SchoolId = _schoolId,
            StudentId = student.Id,
            RoomId = room.Id,
            CheckInDate = DateTime.Now.AddDays(-5),
            MonthlyFee = 500
        };
        await Assert.ThrowsAsync<ArgumentException>(() => _service.AssignStudentToRoomAsync(request));
    }

    // ── AssignStudentToRoomAsync: Success Case ─────────────────────────────

    [Fact]
    public async Task AssignStudentToRoomAsync_SuccessfullyAssignsStudent()
    {
        var room = await SeedRoomAsync(_schoolId);
        var student = await SeedStudentAsync(_schoolId);
        
        var request = new CreateHostelStudentRequest
        {
            SchoolId = _schoolId,
            StudentId = student.Id,
            RoomId = room.Id,
            CheckInDate = DateTime.Now.AddDays(1),
            MonthlyFee = 500
        };
        var result = await _service.AssignStudentToRoomAsync(request);
        
        result.Should().NotBeNull();
        result.StudentId.Should().Be(student.Id);
        result.Status.Should().Be("active");
    }

    // ── RemoveStudentFromRoomAsync: Validation ─────────────────────────────

    [Fact]
    public async Task RemoveStudentFromRoomAsync_ThrowsWhenNotAlumni()
    {
        var room = await SeedRoomAsync(_schoolId);
        var student = await SeedStudentAsync(_schoolId);
        
        var assignRequest = new CreateHostelStudentRequest
        {
            SchoolId = _schoolId,
            StudentId = student.Id,
            RoomId = room.Id,
            CheckInDate = DateTime.Now,
            MonthlyFee = 500
        };
        var hostelStudent = await _service.AssignStudentToRoomAsync(assignRequest);
        
        // Try to remove while student is still active
        var hostelRecord = await _context.HostelStudents.FirstAsync(h => h.Id == hostelStudent.Id);
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _service.RemoveStudentFromRoomAsync(hostelRecord.Id, _schoolId));
    }

    // ── School Isolation ──────────────────────────────────────────────────

    [Fact]
    public async Task GetRoomByIdAsync_EnforcesSchoolIsolation()
    {
        var otherSchool = Guid.NewGuid();
        var room = await SeedRoomAsync(_schoolId, "101");
        
        var result = await _service.GetRoomByIdAsync(room.Id, otherSchool);
        result.Should().BeNull();
    }

    [Fact]
    public async Task DeleteRoomAsync_EnforcesSchoolIsolation()
    {
        var otherSchool = Guid.NewGuid();
        var room = await SeedRoomAsync(_schoolId, "101");
        
        var result = await _service.DeleteRoomAsync(room.Id, otherSchool);
        result.Should().BeFalse();
    }
}
