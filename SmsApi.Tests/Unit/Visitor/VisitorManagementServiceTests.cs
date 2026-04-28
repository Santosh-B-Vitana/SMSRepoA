using Microsoft.EntityFrameworkCore;
using Xunit;
using FluentAssertions;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;
using SmsApi.Services;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SmsApi.Tests.Unit.VisitorManagement
{
    public class VisitorManagementServiceTests : IAsyncLifetime
    {
        private readonly AppDbContext _context;
        private readonly VisitorManagementService _service;
        private readonly Guid _schoolId = Guid.NewGuid();
        private readonly Guid _userId = Guid.NewGuid();

        public VisitorManagementServiceTests()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: $"VisitorTestDb-{Guid.NewGuid()}")
                .Options;

            _context = new AppDbContext(options);
            _service = new VisitorManagementService(_context);
        }

        public async Task InitializeAsync()
        {
            await _context.Database.EnsureCreatedAsync();
        }

        public async Task DisposeAsync()
        {
            await _context.Database.EnsureDeletedAsync();
            _context.Dispose();
        }

        #region Helper Methods

        private async Task<Visitor> SeedVisitorAsync(
            string name = "Test Visitor",
            string phone = "9876543210",
            string? email = "visitor@test.com",
            bool isBlacklisted = false)
        {
            var visitor = new Visitor
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolId,
                Name = name,
                Phone = phone,
                Email = email,
                IsBlacklisted = isBlacklisted,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Visitors.Add(visitor);
            await _context.SaveChangesAsync();
            return visitor;
        }

        private async Task<VisitorLog> SeedVisitorLogAsync(
            Guid visitorId,
            string status = "CheckedIn",
            string purpose = "Parent Meeting",
            string personToMeet = "Principal")
        {
            var log = new VisitorLog
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolId,
                VisitorId = visitorId,
                VisitNumber = $"VISIT-{DateTime.UtcNow:yyyyMMddHHmmss}-1234",
                CheckInTime = DateTime.UtcNow.AddHours(-1),
                Purpose = purpose,
                PersonToMeet = personToMeet,
                PassNumber = "PASS-12345",
                Status = status,
                CheckedInByStaffId = _userId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            if (status == "CheckedOut")
            {
                log.CheckOutTime = DateTime.UtcNow;
            }

            _context.VisitorLogs.Add(log);
            await _context.SaveChangesAsync();
            return log;
        }

        #endregion

        #region Pagination Normalization Tests

        [Fact]
        public async Task GetVisitorsAsync_NormalizesNegativePage()
        {
            // Arrange
            await SeedVisitorAsync();
            
            // Act
            var result = await _service.GetVisitorsAsync(_schoolId, page: -5, pageSize: 10);

            // Assert
            result.Page.Should().Be(1);
        }

        [Fact]
        public async Task GetVisitorsAsync_NormalizesZeroPageSize()
        {
            // Arrange
            await SeedVisitorAsync();
            
            // Act
            var result = await _service.GetVisitorsAsync(_schoolId, page: 1, pageSize: 0);

            // Assert
            result.PageSize.Should().Be(1);
        }

        [Fact]
        public async Task GetVisitorsAsync_CapsExcessivePageSize()
        {
            // Arrange
            await SeedVisitorAsync();
            
            // Act
            var result = await _service.GetVisitorsAsync(_schoolId, page: 1, pageSize: 200);

            // Assert
            result.PageSize.Should().Be(100);
        }

        [Fact]
        public async Task GetVisitorLogsAsync_NormalizesNegativePage()
        {
            // Arrange
            var visitor = await SeedVisitorAsync();
            await SeedVisitorLogAsync(visitor.Id);
            
            // Act
            var result = await _service.GetVisitorLogsAsync(_schoolId, page: -3, pageSize: 10);

            // Assert
            result.Page.Should().Be(1);
        }

        [Fact]
        public async Task GetVisitorLogsAsync_CapsExcessivePageSize()
        {
            // Arrange
            var visitor = await SeedVisitorAsync();
            await SeedVisitorLogAsync(visitor.Id);
            
            // Act
            var result = await _service.GetVisitorLogsAsync(_schoolId, page: 1, pageSize: 500);

            // Assert
            result.PageSize.Should().Be(100);
        }

        [Fact]
        public async Task GetActiveVisitsAsync_NormalizesPageParameters()
        {
            // Arrange
            var visitor = await SeedVisitorAsync();
            await SeedVisitorLogAsync(visitor.Id, status: "CheckedIn");
            
            // Act
            var result = await _service.GetActiveVisitsAsync(_schoolId, page: -2, pageSize: 300);

            // Assert
            result.Page.Should().Be(1);
            result.PageSize.Should().Be(100);
        }

        #endregion

        #region School Isolation Tests

        [Fact]
        public async Task GetVisitorsAsync_IsolatesDataBySchool()
        {
            // Arrange
            var otherSchoolId = Guid.NewGuid();
            var visitor1 = await SeedVisitorAsync(name: "School1 Visitor");
            
            _context.Visitors.Add(new Visitor
            {
                Id = Guid.NewGuid(),
                SchoolId = otherSchoolId,
                Name = "School2 Visitor",
                Phone = "9999999999",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            // Act
            var result = await _service.GetVisitorsAsync(_schoolId);

            // Assert
            result.Items.Should().HaveCount(1);
            result.Items[0].Name?.Should().Be("School1 Visitor");
        }

        [Fact]
        public async Task GetVisitorLogsAsync_IsolatesDataBySchool()
        {
            // Arrange
            var otherSchoolId = Guid.NewGuid();
            var visitor1 = await SeedVisitorAsync();
            var log1 = await SeedVisitorLogAsync(visitor1.Id);

            var visitor2 = new Visitor
            {
                Id = Guid.NewGuid(),
                SchoolId = otherSchoolId,
                Name = "Other School Visitor",
                Phone = "8888888888",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Visitors.Add(visitor2);
            _context.VisitorLogs.Add(new VisitorLog
            {
                Id = Guid.NewGuid(),
                SchoolId = otherSchoolId,
                VisitorId = visitor2.Id,
                VisitNumber = "VISIT-OTHER",
                CheckInTime = DateTime.UtcNow,
                Purpose = "Other Purpose",
                PassNumber = "PASS-OTHER",
                Status = "CheckedIn",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            // Act
            var result = await _service.GetVisitorLogsAsync(_schoolId);

            // Assert
            result.Items.Should().HaveCount(1);
        }

        #endregion

        #region CreateVisitor Validation Tests

        [Fact]
        public async Task CreateVisitorAsync_ThrowsArgumentException_WhenNameIsEmpty()
        {
            // Arrange
            var request = new CreateVisitorRequest
            {
                SchoolId = _schoolId,
                Name = string.Empty,
                Phone = "9876543210",
                CreatedBy = _userId
            };

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateVisitorAsync(request));
        }

        [Fact]
        public async Task CreateVisitorAsync_ThrowsArgumentException_WhenNameExceeds100Chars()
        {
            // Arrange
            var request = new CreateVisitorRequest
            {
                SchoolId = _schoolId,
                Name = new string('A', 101),
                Phone = "9876543210",
                CreatedBy = _userId
            };

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateVisitorAsync(request));
        }

        [Fact]
        public async Task CreateVisitorAsync_ThrowsArgumentException_WhenPhoneIsEmpty()
        {
            // Arrange
            var request = new CreateVisitorRequest
            {
                SchoolId = _schoolId,
                Name = "John Doe",
                Phone = string.Empty,
                CreatedBy = _userId
            };

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateVisitorAsync(request));
        }

        [Fact]
        public async Task CreateVisitorAsync_ThrowsArgumentException_WhenPhoneExceeds15Chars()
        {
            // Arrange
            var request = new CreateVisitorRequest
            {
                SchoolId = _schoolId,
                Name = "John Doe",
                Phone = "98765432101234567890", // 20 chars
                CreatedBy = _userId
            };

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateVisitorAsync(request));
        }

        [Fact]
        public async Task CreateVisitorAsync_ThrowsArgumentException_WhenEmailExceeds100Chars()
        {
            // Arrange
            var request = new CreateVisitorRequest
            {
                SchoolId = _schoolId,
                Name = "John Doe",
                Phone = "9876543210",
                Email = new string('A', 101),
                CreatedBy = _userId
            };

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateVisitorAsync(request));
        }

        [Fact]
        public async Task CreateVisitorAsync_ThrowsArgumentException_WhenOrganizationExceeds50Chars()
        {
            // Arrange
            var request = new CreateVisitorRequest
            {
                SchoolId = _schoolId,
                Name = "John Doe",
                Phone = "9876543210",
                Organization = new string('A', 51),
                CreatedBy = _userId
            };

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateVisitorAsync(request));
        }

        [Fact]
        public async Task CreateVisitorAsync_ThrowsArgumentException_WhenAddressExceeds500Chars()
        {
            // Arrange
            var request = new CreateVisitorRequest
            {
                SchoolId = _schoolId,
                Name = "John Doe",
                Phone = "9876543210",
                Address = new string('A', 501),
                CreatedBy = _userId
            };

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateVisitorAsync(request));
        }

        [Fact]
        public async Task CreateVisitorAsync_ThrowsInvalidOperationException_WhenDuplicatePhone()
        {
            // Arrange
            await SeedVisitorAsync(phone: "9876543210");
            
            var request = new CreateVisitorRequest
            {
                SchoolId = _schoolId,
                Name = "Another Visitor",
                Phone = "9876543210", // Duplicate
                CreatedBy = _userId
            };

            // Act & Assert
            await Assert.ThrowsAsync<InvalidOperationException>(() => _service.CreateVisitorAsync(request));
        }

        [Fact]
        public async Task CreateVisitorAsync_SucceedsWithValidData()
        {
            // Arrange
            var request = new CreateVisitorRequest
            {
                SchoolId = _schoolId,
                Name = "John Doe",
                Phone = "9876543210",
                Email = "john@example.com",
                Organization = "ABC Corp",
                CreatedBy = _userId
            };

            // Act
            var result = await _service.CreateVisitorAsync(request);

            // Assert
            result.Should().NotBeNull();
            result.Name.Should().Be("John Doe");
            result.Phone.Should().Be("9876543210");
            result.IsBlacklisted.Should().BeFalse();
        }

        #endregion

        #region UpdateVisitor Validation Tests

        [Fact]
        public async Task UpdateVisitorAsync_ThrowsKeyNotFoundException_WhenNotFound()
        {
            // Arrange
            var request = new UpdateVisitorRequest { Name = "Updated" };

            // Act & Assert
            await Assert.ThrowsAsync<KeyNotFoundException>(() => 
                _service.UpdateVisitorAsync(Guid.NewGuid(), request, _schoolId));
        }

        [Fact]
        public async Task UpdateVisitorAsync_ThrowsArgumentException_WhenNameExceeds100Chars()
        {
            // Arrange
            var visitor = await SeedVisitorAsync();
            var request = new UpdateVisitorRequest { Name = new string('A', 101) };

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => 
                _service.UpdateVisitorAsync(visitor.Id, request, _schoolId));
        }

        [Fact]
        public async Task UpdateVisitorAsync_ThrowsArgumentException_WhenPhoneExceeds15Chars()
        {
            // Arrange
            var visitor = await SeedVisitorAsync();
            var request = new UpdateVisitorRequest { Phone = "98765432101234567" };

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => 
                _service.UpdateVisitorAsync(visitor.Id, request, _schoolId));
        }

        [Fact]
        public async Task UpdateVisitorAsync_ThrowsInvalidOperationException_WhenDuplicatePhone()
        {
            // Arrange
            var visitor1 = await SeedVisitorAsync(name: "Visitor 1", phone: "1111111111");
            var visitor2 = await SeedVisitorAsync(name: "Visitor 2", phone: "2222222222");
            
            var request = new UpdateVisitorRequest { Phone = "1111111111" }; // Try to use visitor1's phone

            // Act & Assert
            await Assert.ThrowsAsync<InvalidOperationException>(() => 
                _service.UpdateVisitorAsync(visitor2.Id, request, _schoolId));
        }

        [Fact]
        public async Task UpdateVisitorAsync_SucceedsWithValidUpdate()
        {
            // Arrange
            var visitor = await SeedVisitorAsync();
            var request = new UpdateVisitorRequest { Name = "Updated Name", Phone = "9999999999" };

            // Act
            var result = await _service.UpdateVisitorAsync(visitor.Id, request, _schoolId);

            // Assert
            result.Should().NotBeNull();
            result.Name.Should().Be("Updated Name");
            result.Phone.Should().Be("9999999999");
        }

        #endregion

        #region CheckIn Validation Tests

        [Fact]
        public async Task CheckInVisitorAsync_ThrowsKeyNotFoundException_WhenVisitorNotFound()
        {
            // Arrange
            var request = new CheckInVisitorRequest
            {
                SchoolId = _schoolId,
                VisitorId = Guid.NewGuid(),
                Purpose = "Meeting",
                PersonToMeet = "Principal",
                CheckedInBy = _userId
            };

            // Act & Assert
            await Assert.ThrowsAsync<KeyNotFoundException>(() => _service.CheckInVisitorAsync(request));
        }

        [Fact]
        public async Task CheckInVisitorAsync_ThrowsInvalidOperationException_WhenBlacklisted()
        {
            // Arrange
            var visitor = await SeedVisitorAsync(isBlacklisted: true);
            var request = new CheckInVisitorRequest
            {
                SchoolId = _schoolId,
                VisitorId = visitor.Id,
                Purpose = "Meeting",
                PersonToMeet = "Principal",
                CheckedInBy = _userId
            };

            // Act & Assert
            await Assert.ThrowsAsync<InvalidOperationException>(() => _service.CheckInVisitorAsync(request));
        }

        [Fact]
        public async Task CheckInVisitorAsync_ThrowsArgumentException_WhenPurposeIsEmpty()
        {
            // Arrange
            var visitor = await SeedVisitorAsync();
            var request = new CheckInVisitorRequest
            {
                SchoolId = _schoolId,
                VisitorId = visitor.Id,
                Purpose = string.Empty,
                PersonToMeet = "Principal",
                CheckedInBy = _userId
            };

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CheckInVisitorAsync(request));
        }

        [Fact]
        public async Task CheckInVisitorAsync_ThrowsArgumentException_WhenPersonToMeetIsEmpty()
        {
            // Arrange
            var visitor = await SeedVisitorAsync();
            var request = new CheckInVisitorRequest
            {
                SchoolId = _schoolId,
                VisitorId = visitor.Id,
                Purpose = "Meeting",
                PersonToMeet = string.Empty,
                CheckedInBy = _userId
            };

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CheckInVisitorAsync(request));
        }

        [Fact]
        public async Task CheckInVisitorAsync_ThrowsArgumentException_WhenPurposeExceeds100Chars()
        {
            // Arrange
            var visitor = await SeedVisitorAsync();
            var request = new CheckInVisitorRequest
            {
                SchoolId = _schoolId,
                VisitorId = visitor.Id,
                Purpose = new string('A', 101),
                PersonToMeet = "Principal",
                CheckedInBy = _userId
            };

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CheckInVisitorAsync(request));
        }

        [Fact]
        public async Task CheckInVisitorAsync_ThrowsInvalidOperationException_WhenDuplicateActiveCheckIn()
        {
            // Arrange
            var visitor = await SeedVisitorAsync();
            await SeedVisitorLogAsync(visitor.Id, status: "CheckedIn");
            
            var request = new CheckInVisitorRequest
            {
                SchoolId = _schoolId,
                VisitorId = visitor.Id,
                Purpose = "Another Meeting",
                PersonToMeet = "Principal",
                CheckedInBy = _userId
            };

            // Act & Assert
            await Assert.ThrowsAsync<InvalidOperationException>(() => _service.CheckInVisitorAsync(request));
        }

        [Fact]
        public async Task CheckInVisitorAsync_SucceedsAfterCheckOut()
        {
            // Arrange
            var visitor = await SeedVisitorAsync();
            await SeedVisitorLogAsync(visitor.Id, status: "CheckedOut");
            
            var request = new CheckInVisitorRequest
            {
                SchoolId = _schoolId,
                VisitorId = visitor.Id,
                Purpose = "New Meeting",
                PersonToMeet = "Teacher",
                CheckedInBy = _userId
            };

            // Act
            var result = await _service.CheckInVisitorAsync(request);

            // Assert
            result.Should().NotBeNull();
            result.Status.Should().Be("CheckedIn");
            result.Purpose.Should().Be("New Meeting");
        }

        [Fact]
        public async Task CheckInVisitorAsync_SucceedsWithValidData()
        {
            // Arrange
            var visitor = await SeedVisitorAsync();
            var request = new CheckInVisitorRequest
            {
                SchoolId = _schoolId,
                VisitorId = visitor.Id,
                Purpose = "Parent Meeting",
                PersonToMeet = "Principal",
                Department = "Admin",
                CheckedInBy = _userId
            };

            // Act
            var result = await _service.CheckInVisitorAsync(request);

            // Assert
            result.Should().NotBeNull();
            result.Status.Should().Be("CheckedIn");
            result.VisitorName.Should().Be("Test Visitor");
        }

        #endregion

        #region CheckOut Validation Tests

        [Fact]
        public async Task CheckOutVisitorAsync_ThrowsKeyNotFoundException_WhenLogNotFound()
        {
            // Arrange
            var request = new CheckOutVisitorRequest { Remarks = "Completed" };

            // Act & Assert
            await Assert.ThrowsAsync<KeyNotFoundException>(() => 
                _service.CheckOutVisitorAsync(Guid.NewGuid(), request, _schoolId));
        }

        [Fact]
        public async Task CheckOutVisitorAsync_ThrowsInvalidOperationException_WhenAlreadyCheckedOut()
        {
            // Arrange
            var visitor = await SeedVisitorAsync();
            var log = await SeedVisitorLogAsync(visitor.Id, status: "CheckedOut");
            
            var request = new CheckOutVisitorRequest { Remarks = "Already out" };

            // Act & Assert
            await Assert.ThrowsAsync<InvalidOperationException>(() => 
                _service.CheckOutVisitorAsync(log.Id, request, _schoolId));
        }

        [Fact]
        public async Task CheckOutVisitorAsync_ThrowsArgumentException_WhenRemarksExceeds1000Chars()
        {
            // Arrange
            var visitor = await SeedVisitorAsync();
            var log = await SeedVisitorLogAsync(visitor.Id, status: "CheckedIn");
            
            var request = new CheckOutVisitorRequest { Remarks = new string('A', 1001) };

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => 
                _service.CheckOutVisitorAsync(log.Id, request, _schoolId));
        }

        [Fact]
        public async Task CheckOutVisitorAsync_SucceedsWithValidCheckOut()
        {
            // Arrange
            var visitor = await SeedVisitorAsync();
            var log = await SeedVisitorLogAsync(visitor.Id, status: "CheckedIn");
            
            var request = new CheckOutVisitorRequest { Remarks = "Meeting completed" };

            // Act
            var result = await _service.CheckOutVisitorAsync(log.Id, request, _schoolId);

            // Assert
            result.Should().NotBeNull();
            result.Status.Should().Be("CheckedOut");
            result.Remarks.Should().Be("Meeting completed");
            result.CheckOutTime.Should().NotBeNull();
        }

        #endregion

        #region Success Path Tests

        [Fact]
        public async Task GetVisitorsAsync_WithValidPagination_ReturnsPaginatedResults()
        {
            // Arrange
            for (int i = 1; i <= 15; i++)
            {
                await SeedVisitorAsync(name: $"Visitor {i}", phone: $"{9000000000 + i}");
            }

            // Act
            var result = await _service.GetVisitorsAsync(_schoolId, page: 1, pageSize: 10);

            // Assert
            result.Items.Should().HaveCount(10);
            result.TotalCount.Should().Be(15);
            result.Page.Should().Be(1);
            result.PageSize.Should().Be(10);
            result.TotalPages.Should().Be(2);
        }

        [Fact]
        public async Task CompleteVisitorJourney_FullWorkflow()
        {
            // Arrange & Act
            // 1. Create visitor
            var createRequest = new CreateVisitorRequest
            {
                SchoolId = _schoolId,
                Name = "John Smith",
                Phone = "9876543210",
                Email = "john@example.com",
                CreatedBy = _userId
            };
            var visitor = await _service.CreateVisitorAsync(createRequest);

            // 2. Check in visitor
            var checkInRequest = new CheckInVisitorRequest
            {
                SchoolId = _schoolId,
                VisitorId = visitor.Id,
                Purpose = "Parent-Teacher Meeting",
                PersonToMeet = "Class Teacher",
                Department = "Education",
                CheckedInBy = _userId
            };
            var checkInResult = await _service.CheckInVisitorAsync(checkInRequest);

            // 3. Check out visitor
            var checkOutRequest = new CheckOutVisitorRequest { Remarks = "Meeting completed successfully" };
            var checkOutResult = await _service.CheckOutVisitorAsync(checkInResult.Id, checkOutRequest, _schoolId);

            // Assert
            visitor.Name.Should().Be("John Smith");
            checkInResult.Status?.Should().Be("CheckedIn");
            checkOutResult.Should().NotBeNull();
            checkOutResult?.Status.Should().Be("CheckedOut");
        }

        #endregion
    }
}
