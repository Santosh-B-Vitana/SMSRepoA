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

namespace SmsApi.Tests.Unit.Transport;

public class TransportServiceTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly TransportService _service;
    private readonly Guid _schoolId = Guid.NewGuid();
    private readonly Mock<ILogger<TransportService>> _mockLogger;

    public TransportServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _context = new AppDbContext(options);
        _mockLogger = new Mock<ILogger<TransportService>>();
        _service = new TransportService(_context, _mockLogger.Object);
    }

    public void Dispose() => _context.Dispose();

    // ── Helpers ─────────────────────────────────────────────────────────

    private async Task<TransportRoute> SeedRouteAsync(
        Guid schoolId,
        string routeNumber = "R001",
        string routeName = "Route 1",
        int capacity = 50,
        int assigned = 0,
        string? status = null)
    {
        var route = new TransportRoute
        {
            Id = Guid.NewGuid(),
            SchoolId = schoolId,
            RouteNumber = routeNumber,
            RouteName = routeName,
            VehicleNumber = "MH-02-AB-1234",
            DriverName = "Driver",
            DriverPhone = "9876543210",
            StartTime = TimeSpan.FromHours(7),
            EndTime = TimeSpan.FromHours(17),
            Capacity = capacity,
            StudentsAssigned = assigned,
            MonthlyFee = 1000,
            Status = status ?? "active",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.TransportRoutes.Add(route);
        await _context.SaveChangesAsync();
        return route;
    }

    private async Task<Student> SeedStudentAsync(
        Guid schoolId,
        string className = "10",
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
            Gender = "male",
            Status = status ?? "active",
            AdmissionDate = DateTime.UtcNow.AddYears(-1),
            Address = "123 Test Street",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Students.Add(student);
        await _context.SaveChangesAsync();
        return student;
    }

    // ── GetRoutesAsync: Pagination ────────────────────────────────────────

    [Fact]
    public async Task GetRoutesAsync_NormalizesNegativePage()
    {
        await SeedRouteAsync(_schoolId);
        var result = await _service.GetRoutesAsync(_schoolId, -5, 10);
        result.Page.Should().Be(1);
    }

    [Fact]
    public async Task GetRoutesAsync_NormalizesZeroPageSize()
    {
        await SeedRouteAsync(_schoolId);
        var result = await _service.GetRoutesAsync(_schoolId, 1, 0);
        result.PageSize.Should().Be(1);
    }

    [Fact]
    public async Task GetRoutesAsync_ClampsTooLargePageSize()
    {
        await SeedRouteAsync(_schoolId);
        var result = await _service.GetRoutesAsync(_schoolId, 1, 9999);
        result.PageSize.Should().Be(100);
    }

    [Fact]
    public async Task GetRoutesAsync_ReturnsPaginatedRoutes()
    {
        for (int i = 0; i < 5; i++)
            await SeedRouteAsync(_schoolId, $"R{i:D3}");

        var result = await _service.GetRoutesAsync(_schoolId, 1, 2);
        result.Routes.Should().HaveCount(2);
        result.Total.Should().Be(5);
        result.Page.Should().Be(1);
        result.PageSize.Should().Be(2);
    }

    [Fact]
    public async Task GetRoutesAsync_EnforcesSchoolIsolation()
    {
        var otherSchool = Guid.NewGuid();
        await SeedRouteAsync(_schoolId, "R001");
        await SeedRouteAsync(otherSchool, "R002");

        var result = await _service.GetRoutesAsync(_schoolId, 1, 10);
        result.Routes.Should().HaveCount(1);
        result.Routes[0].RouteNumber.Should().Be("R001");
    }

    // ── CreateRouteAsync: Validation ────────────────────────────────────────

    [Fact]
    public async Task CreateRouteAsync_ThrowsWhenRouteNumberEmpty()
    {
        var request = new CreateTransportRouteRequest
        {
            SchoolId = _schoolId,
            RouteNumber = "",
            RouteName = "Route 1",
            VehicleNumber = "MH-02-AB-1234",
            DriverName = "Driver",
            DriverPhone = "9876543210",
            Capacity = 50,
            MonthlyFee = 1000
        };
        await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateRouteAsync(request));
    }

    [Fact]
    public async Task CreateRouteAsync_ThrowsWhenRouteNameEmpty()
    {
        var request = new CreateTransportRouteRequest
        {
            SchoolId = _schoolId,
            RouteNumber = "R001",
            RouteName = "",
            VehicleNumber = "MH-02-AB-1234",
            DriverName = "Driver",
            DriverPhone = "9876543210",
            Capacity = 50,
            MonthlyFee = 1000
        };
        await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateRouteAsync(request));
    }

    [Fact]
    public async Task CreateRouteAsync_ThrowsWhenVehicleNumberEmpty()
    {
        var request = new CreateTransportRouteRequest
        {
            SchoolId = _schoolId,
            RouteNumber = "R001",
            RouteName = "Route 1",
            VehicleNumber = "",
            DriverName = "Driver",
            DriverPhone = "9876543210",
            Capacity = 50,
            MonthlyFee = 1000
        };
        await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateRouteAsync(request));
    }

    [Fact]
    public async Task CreateRouteAsync_ThrowsWhenDriverNameEmpty()
    {
        var request = new CreateTransportRouteRequest
        {
            SchoolId = _schoolId,
            RouteNumber = "R001",
            RouteName = "Route 1",
            VehicleNumber = "MH-02-AB-1234",
            DriverName = "",
            DriverPhone = "9876543210",
            Capacity = 50,
            MonthlyFee = 1000
        };
        await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateRouteAsync(request));
    }

    [Fact]
    public async Task CreateRouteAsync_ThrowsWhenDriverPhoneEmpty()
    {
        var request = new CreateTransportRouteRequest
        {
            SchoolId = _schoolId,
            RouteNumber = "R001",
            RouteName = "Route 1",
            VehicleNumber = "MH-02-AB-1234",
            DriverName = "Driver",
            DriverPhone = "",
            Capacity = 50,
            MonthlyFee = 1000
        };
        await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateRouteAsync(request));
    }

    [Fact]
    public async Task CreateRouteAsync_ThrowsWhenCapacityZero()
    {
        var request = new CreateTransportRouteRequest
        {
            SchoolId = _schoolId,
            RouteNumber = "R001",
            RouteName = "Route 1",
            VehicleNumber = "MH-02-AB-1234",
            DriverName = "Driver",
            DriverPhone = "9876543210",
            Capacity = 0,
            MonthlyFee = 1000
        };
        await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateRouteAsync(request));
    }

    [Fact]
    public async Task CreateRouteAsync_ThrowsWhenCapacityNegative()
    {
        var request = new CreateTransportRouteRequest
        {
            SchoolId = _schoolId,
            RouteNumber = "R001",
            RouteName = "Route 1",
            VehicleNumber = "MH-02-AB-1234",
            DriverName = "Driver",
            DriverPhone = "9876543210",
            Capacity = -10,
            MonthlyFee = 1000
        };
        await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateRouteAsync(request));
    }

    [Fact]
    public async Task CreateRouteAsync_ThrowsWhenMonthlyFeeNegative()
    {
        var request = new CreateTransportRouteRequest
        {
            SchoolId = _schoolId,
            RouteNumber = "R001",
            RouteName = "Route 1",
            VehicleNumber = "MH-02-AB-1234",
            DriverName = "Driver",
            DriverPhone = "9876543210",
            Capacity = 50,
            MonthlyFee = -100
        };
        await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateRouteAsync(request));
    }

    [Fact]
    public async Task CreateRouteAsync_ThrowsWhenDuplicateRouteNumber()
    {
        await SeedRouteAsync(_schoolId, "R001");
        var request = new CreateTransportRouteRequest
        {
            SchoolId = _schoolId,
            RouteNumber = "R001",
            RouteName = "Route 1",
            VehicleNumber = "MH-02-AB-1234",
            DriverName = "Driver",
            DriverPhone = "9876543210",
            Capacity = 50,
            MonthlyFee = 1000
        };
        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.CreateRouteAsync(request));
    }

    [Fact]
    public async Task CreateRouteAsync_AllowsDuplicateRouteNumberInDifferentSchool()
    {
        var otherSchool = Guid.NewGuid();
        await SeedRouteAsync(_schoolId, "R001");
        
        var request = new CreateTransportRouteRequest
        {
            SchoolId = otherSchool,
            RouteNumber = "R001",
            RouteName = "Route 1",
            VehicleNumber = "MH-02-AB-1234",
            DriverName = "Driver",
            DriverPhone = "9876543210",
            Capacity = 50,
            MonthlyFee = 1000
        };
        var result = await _service.CreateRouteAsync(request);
        result.Should().NotBeNull();
        result.RouteNumber.Should().Be("R001");
    }

    // ── UpdateRouteAsync: Validation ────────────────────────────────────────

    [Fact]
    public async Task UpdateRouteAsync_ThrowsWhenRouteNotFound()
    {
        var request = new CreateTransportRouteRequest
        {
            SchoolId = _schoolId,
            RouteNumber = "R001",
            RouteName = "Route 1",
            VehicleNumber = "MH-02-AB-1234",
            DriverName = "Driver",
            DriverPhone = "9876543210",
            Capacity = 50,
            MonthlyFee = 1000
        };
        await Assert.ThrowsAsync<NullReferenceException>(async () =>
        {
            var result = await _service.UpdateRouteAsync(Guid.NewGuid(), _schoolId, request);
            if (result == null) throw new NullReferenceException();
        });
    }

    [Fact]
    public async Task UpdateRouteAsync_ThrowsWhenCapacityBelowOccupancy()
    {
        var route = await SeedRouteAsync(_schoolId, "R001", capacity: 50, assigned: 30);
        var request = new CreateTransportRouteRequest
        {
            SchoolId = _schoolId,
            RouteNumber = "R001",
            RouteName = "Route 1",
            VehicleNumber = "MH-02-AB-1234",
            DriverName = "Driver",
            DriverPhone = "9876543210",
            Capacity = 20,
            MonthlyFee = 1000
        };
        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.UpdateRouteAsync(route.Id, _schoolId, request));
    }

    [Fact]
    public async Task UpdateRouteAsync_AllowsCapacityIncrement()
    {
        var route = await SeedRouteAsync(_schoolId, "R001", capacity: 50, assigned: 30);
        var request = new CreateTransportRouteRequest
        {
            SchoolId = _schoolId,
            RouteNumber = "R001",
            RouteName = "Route 1",
            VehicleNumber = "MH-02-AB-1234",
            DriverName = "Driver",
            DriverPhone = "9876543210",
            Capacity = 60,
            MonthlyFee = 1000
        };
        var result = await _service.UpdateRouteAsync(route.Id, _schoolId, request);
        result.Should().NotBeNull();
        result!.Capacity.Should().Be(60);
    }

    [Fact]
    public async Task UpdateRouteAsync_ThrowsWhenDuplicateRouteNumber()
    {
        var route1 = await SeedRouteAsync(_schoolId, "R001");
        var route2 = await SeedRouteAsync(_schoolId, "R002");
        
        var request = new CreateTransportRouteRequest
        {
            SchoolId = _schoolId,
            RouteNumber = "R001",
            RouteName = "Route 1",
            VehicleNumber = "MH-02-AB-1234",
            DriverName = "Driver",
            DriverPhone = "9876543210",
            Capacity = 50,
            MonthlyFee = 1000
        };
        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.UpdateRouteAsync(route2.Id, _schoolId, request));
    }

    // ── AssignStudentToRouteAsync: Route Validation ───────────────────────

    [Fact]
    public async Task AssignStudentToRouteAsync_ThrowsWhenRouteNotFound()
    {
        var student = await SeedStudentAsync(_schoolId);
        var request = new CreateTransportStudentRequest
        {
            SchoolId = _schoolId,
            StudentId = student.Id,
            RouteId = Guid.NewGuid(),
            PickupPoint = "Pickup 1",
            DropPoint = "Drop 1",
            MonthlyFee = 1000
        };
        await Assert.ThrowsAsync<KeyNotFoundException>(() => _service.AssignStudentToRouteAsync(request));
    }

    [Fact]
    public async Task AssignStudentToRouteAsync_ThrowsWhenStudentNotFound()
    {
        var route = await SeedRouteAsync(_schoolId);
        var request = new CreateTransportStudentRequest
        {
            SchoolId = _schoolId,
            StudentId = Guid.NewGuid(),
            RouteId = route.Id,
            PickupPoint = "Pickup 1",
            DropPoint = "Drop 1",
            MonthlyFee = 1000
        };
        await Assert.ThrowsAsync<KeyNotFoundException>(() => _service.AssignStudentToRouteAsync(request));
    }

    [Fact]
    public async Task AssignStudentToRouteAsync_ThrowsWhenRouteInactive()
    {
        var route = await SeedRouteAsync(_schoolId, status: "inactive");
        var student = await SeedStudentAsync(_schoolId);
        
        var request = new CreateTransportStudentRequest
        {
            SchoolId = _schoolId,
            StudentId = student.Id,
            RouteId = route.Id,
            PickupPoint = "Pickup 1",
            DropPoint = "Drop 1",
            MonthlyFee = 1000
        };
        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.AssignStudentToRouteAsync(request));
    }

    [Fact]
    public async Task AssignStudentToRouteAsync_ThrowsWhenRouteFull()
    {
        // Seed route with capacity 2
        var route = await SeedRouteAsync(_schoolId, capacity: 2, assigned: 2);

        // Seed 2 active TransportStudent records to fill the route in DB
        for (int i = 0; i < 2; i++)
        {
            var existingStudent = await SeedStudentAsync(_schoolId, className: $"10{i}");
            _context.TransportStudents.Add(new SmsApi.Models.Entities.TransportStudent
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolId,
                StudentId = existingStudent.Id,
                RouteId = route.Id,
                PickupPoint = "Pickup",
                DropPoint = "Drop",
                Fare = 1000,
                MonthlyFee = 1000,
                Status = "active",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        }
        await _context.SaveChangesAsync();

        var student = await SeedStudentAsync(_schoolId);
        
        var request = new CreateTransportStudentRequest
        {
            SchoolId = _schoolId,
            StudentId = student.Id,
            RouteId = route.Id,
            PickupPoint = "Pickup 1",
            DropPoint = "Drop 1",
            MonthlyFee = 1000
        };
        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.AssignStudentToRouteAsync(request));
    }

    [Fact]
    public async Task AssignStudentToRouteAsync_ThrowsWhenStudentDroppedOut()
    {
        var route = await SeedRouteAsync(_schoolId);
        var student = await SeedStudentAsync(_schoolId, status: "dropped_out");
        
        var request = new CreateTransportStudentRequest
        {
            SchoolId = _schoolId,
            StudentId = student.Id,
            RouteId = route.Id,
            PickupPoint = "Pickup 1",
            DropPoint = "Drop 1",
            MonthlyFee = 1000
        };
        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.AssignStudentToRouteAsync(request));
    }

    [Fact]
    public async Task AssignStudentToRouteAsync_PreventsDuplicateAssignment()
    {
        var route1 = await SeedRouteAsync(_schoolId, "R001");
        var route2 = await SeedRouteAsync(_schoolId, "R002");
        var student = await SeedStudentAsync(_schoolId);
        
        // Assign to first route
        var request1 = new CreateTransportStudentRequest
        {
            SchoolId = _schoolId,
            StudentId = student.Id,
            RouteId = route1.Id,
            PickupPoint = "Pickup 1",
            DropPoint = "Drop 1",
            MonthlyFee = 1000
        };
        await _service.AssignStudentToRouteAsync(request1);

        // Try to assign to second route
        var request2 = new CreateTransportStudentRequest
        {
            SchoolId = _schoolId,
            StudentId = student.Id,
            RouteId = route2.Id,
            PickupPoint = "Pickup 2",
            DropPoint = "Drop 2",
            MonthlyFee = 1000
        };
        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.AssignStudentToRouteAsync(request2));
    }

    [Fact]
    public async Task AssignStudentToRouteAsync_SuccessfullyAssignsStudent()
    {
        var route = await SeedRouteAsync(_schoolId);
        var student = await SeedStudentAsync(_schoolId);
        
        var request = new CreateTransportStudentRequest
        {
            SchoolId = _schoolId,
            StudentId = student.Id,
            RouteId = route.Id,
            PickupPoint = "Pickup 1",
            DropPoint = "Drop 1",
            MonthlyFee = 1000
        };
        var result = await _service.AssignStudentToRouteAsync(request);
        
        result.Should().NotBeNull();
        result.StudentId.Should().Be(student.Id);
        result.Status.Should().Be("active");
    }

    // ── School Isolation ──────────────────────────────────────────────────

    [Fact]
    public async Task GetRouteByIdAsync_EnforcesSchoolIsolation()
    {
        var otherSchool = Guid.NewGuid();
        var route = await SeedRouteAsync(_schoolId, "R001");
        
        var result = await _service.GetRouteByIdAsync(route.Id, otherSchool);
        result.Should().BeNull();
    }

    [Fact]
    public async Task DeleteRouteAsync_EnforcesSchoolIsolation()
    {
        var otherSchool = Guid.NewGuid();
        var route = await SeedRouteAsync(_schoolId, "R001");
        
        var result = await _service.DeleteRouteAsync(route.Id, otherSchool);
        result.Should().BeFalse();
    }

    [Fact]
    public async Task GetStudentsByRouteAsync_EnforcesSchoolIsolation()
    {
        var otherSchool = Guid.NewGuid();
        var route = await SeedRouteAsync(_schoolId, "R001");
        
        var result = await _service.GetStudentsByRouteAsync(route.Id, otherSchool);
        result.Should().BeEmpty();
    }
}
