using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;
using SmsApi.Services;
using Xunit;

namespace SmsApi.Tests.Unit.Fees
{
    public class FeeConcessionServiceTests : IDisposable
    {
        private readonly AppDbContext _context;
        private readonly FeeConcessionService _service;
        private readonly Guid _schoolId = Guid.NewGuid();
        private readonly Guid _student1Id = Guid.NewGuid();
        private readonly Guid _concessionTypeId = Guid.NewGuid();
        private readonly Guid _concessionId = Guid.NewGuid();

        public FeeConcessionServiceTests()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
                .Options;

            _context = new AppDbContext(options);
            var logger = new TestLogger<FeeConcessionService>();
            _service = new FeeConcessionService(_context, logger);
            SeedTestData().GetAwaiter().GetResult();
        }

        public void Dispose() => _context?.Dispose();

        private async Task SeedTestData()
        {
            var school = new School
            {
                Id = _schoolId, Name = "Test School", SchoolCode = "TST001",
                Address = "123 Test St", Phone = "1234567890", Email = "test@school.com",
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            };
            _context.Schools.Add(school);

            var student = new Student
            {
                Id = _student1Id, SchoolId = _schoolId, Name = "John Doe",
                FirstName = "John", LastName = "Doe", AdmissionNumber = "ADM001",
                Class = "10", Section = "A", Status = "Active", Email = "john@test.com",
                DateOfBirth = new DateTime(2010, 1, 1), Gender = "Male",
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            };
            _context.Students.Add(student);

            var concessionType = new ConcessionType
            {
                Id = _concessionTypeId, SchoolId = _schoolId, Name = "Merit Scholarship",
                DiscountType = "Percentage", DiscountValue = 25, MaxDiscountAmount = 15000,
                ValidFrom = DateTime.UtcNow.AddMonths(-1), ValidTo = DateTime.UtcNow.AddMonths(11),
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            };
            _context.ConcessionTypes.Add(concessionType);

            var feeRecordId = Guid.NewGuid();
            _context.FeeRecords.Add(new FeeRecord
            {
                Id = feeRecordId, SchoolId = _schoolId, StudentId = _student1Id,
                TotalAmount = 50000, PaidAmount = 0, PendingAmount = 50000, Status = "pending",
                DueDate = DateTime.UtcNow.AddDays(30), AcademicYear = "2025-2026",
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            });

            var concession = new FeeConcession
            {
                Id = _concessionId, SchoolId = _schoolId, StudentId = _student1Id,
                ConcessionTypeId = _concessionTypeId, AcademicYear = "2025-2026",
                Reason = "Academic excellence", AppliedAmount = 12500,
                Status = "Pending",
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            };
            _context.FeeConcessions.Add(concession);

            await _context.SaveChangesAsync();
        }

        // ============================================================
        // CREATE CONCESSION TYPE TESTS
        // ============================================================

        [Fact]
        public async Task CreateConcessionType_ValidData_ReturnsType()
        {
            var request = new CreateConcessionTypeRequest
            {
                SchoolId = _schoolId, Name = "Sports Scholarship",
                DiscountType = "Percentage", DiscountValue = 20, MaxDiscountAmount = 10000,
                ValidFrom = DateTime.UtcNow, ValidTo = DateTime.UtcNow.AddMonths(12)
            };

            var result = await _service.CreateConcessionTypeAsync(request);
            result.Should().NotBeNull();
            result.Name.Should().Be("Sports Scholarship");
        }

        [Fact]
        public async Task CreateConcessionType_EmptyName_ThrowsArgumentException()
        {
            var request = new CreateConcessionTypeRequest
            {
                SchoolId = _schoolId, Name = "",
                DiscountType = "Percentage", DiscountValue = 20
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateConcessionTypeAsync(request));
        }

        [Fact]
        public async Task CreateConcessionType_NameTooShort_ThrowsArgumentException()
        {
            var request = new CreateConcessionTypeRequest
            {
                SchoolId = _schoolId, Name = "AB",
                DiscountType = "Percentage", DiscountValue = 20
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateConcessionTypeAsync(request));
        }

        [Fact]
        public async Task CreateConcessionType_NameTooLong_ThrowsArgumentException()
        {
            var request = new CreateConcessionTypeRequest
            {
                SchoolId = _schoolId, Name = new string('A', 101),
                DiscountType = "Percentage", DiscountValue = 20
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateConcessionTypeAsync(request));
        }

        [Fact]
        public async Task CreateConcessionType_InvalidDiscountType_ThrowsArgumentException()
        {
            var request = new CreateConcessionTypeRequest
            {
                SchoolId = _schoolId, Name = "Test Type",
                DiscountType = "invalid", DiscountValue = 20
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateConcessionTypeAsync(request));
        }

        [Fact]
        public async Task CreateConcessionType_ZeroDiscountValue_ThrowsArgumentException()
        {
            var request = new CreateConcessionTypeRequest
            {
                SchoolId = _schoolId, Name = "Test Type",
                DiscountType = "Percentage", DiscountValue = 0
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateConcessionTypeAsync(request));
        }

        [Fact]
        public async Task CreateConcessionType_PercentageOver100_ThrowsArgumentException()
        {
            var request = new CreateConcessionTypeRequest
            {
                SchoolId = _schoolId, Name = "Test Type",
                DiscountType = "Percentage", DiscountValue = 150
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateConcessionTypeAsync(request));
        }

        [Fact]
        public async Task CreateConcessionType_NegativeMaxDiscount_ThrowsArgumentException()
        {
            var request = new CreateConcessionTypeRequest
            {
                SchoolId = _schoolId, Name = "Test Type",
                DiscountType = "FixedAmount", DiscountValue = 5000, MaxDiscountAmount = -100
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateConcessionTypeAsync(request));
        }

        [Fact]
        public async Task CreateConcessionType_ValidToBeforeValidFrom_ThrowsArgumentException()
        {
            var request = new CreateConcessionTypeRequest
            {
                SchoolId = _schoolId, Name = "Test Type",
                DiscountType = "Percentage", DiscountValue = 10,
                ValidFrom = DateTime.UtcNow.AddMonths(6), ValidTo = DateTime.UtcNow
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateConcessionTypeAsync(request));
        }

        [Fact]
        public async Task CreateConcessionType_DuplicateName_ThrowsInvalidOperationException()
        {
            var request = new CreateConcessionTypeRequest
            {
                SchoolId = _schoolId, Name = "Merit Scholarship",
                DiscountType = "Percentage", DiscountValue = 30
            };
            await Assert.ThrowsAsync<InvalidOperationException>(() => _service.CreateConcessionTypeAsync(request));
        }

        [Fact]
        public async Task CreateConcessionType_FixedAmount_NoPercentageValidation()
        {
            var request = new CreateConcessionTypeRequest
            {
                SchoolId = _schoolId, Name = "Fixed Discount",
                DiscountType = "FixedAmount", DiscountValue = 5000
            };

            var result = await _service.CreateConcessionTypeAsync(request);
            result.DiscountValue.Should().Be(5000);
        }

        // ============================================================
        // GET CONCESSION TYPES TESTS
        // ============================================================

        [Fact]
        public async Task GetConcessionTypes_ReturnsTypesForSchool()
        {
            var result = await _service.GetConcessionTypesAsync(_schoolId);
            result.Should().NotBeNull();
            result.ConcessionTypes.Should().NotBeEmpty();
        }

        [Fact]
        public async Task GetConcessionTypeById_Exists_ReturnsType()
        {
            var result = await _service.GetConcessionTypeByIdAsync(_concessionTypeId, _schoolId);
            result.Should().NotBeNull();
            result.Name.Should().Be("Merit Scholarship");
        }

        // ============================================================
        // GET CONCESSIONS TESTS (PAGINATION)
        // ============================================================

        [Fact]
        public async Task GetConcessions_ReturnsConcessionsForSchool()
        {
            var result = await _service.GetConcessionsAsync(_schoolId, 1, 20);
            result.Should().NotBeNull();
            result.Concessions.Should().NotBeEmpty();
        }

        [Fact]
        public async Task GetConcessions_PageZeroNormalized()
        {
            var result = await _service.GetConcessionsAsync(_schoolId, 0, 20);
            result.Page.Should().Be(1);
        }

        [Fact]
        public async Task GetConcessions_PageSizeOver100Normalized()
        {
            var result = await _service.GetConcessionsAsync(_schoolId, 1, 200);
            result.PageSize.Should().Be(100);
        }

        [Fact]
        public async Task GetConcessions_PageSizeZeroNormalized()
        {
            var result = await _service.GetConcessionsAsync(_schoolId, 1, 0);
            result.PageSize.Should().Be(20);
        }

        [Fact]
        public async Task GetConcessions_FilterByStudent()
        {
            var result = await _service.GetConcessionsAsync(_schoolId, 1, 20, _student1Id);
            result.Concessions.All(c => c.StudentId == _student1Id).Should().BeTrue();
        }

        [Fact]
        public async Task GetConcessions_FilterByStatus()
        {
            var result = await _service.GetConcessionsAsync(_schoolId, 1, 20, null, "Pending");
            result.Concessions.All(c => c.Status == "Pending").Should().BeTrue();
        }

        // ============================================================
        // CREATE CONCESSION TESTS
        // ============================================================

        [Fact]
        public async Task CreateConcession_ValidData_ReturnsConcession()
        {
            // Use a different concession type to avoid duplicate
            var newTypeId = Guid.NewGuid();
            _context.ConcessionTypes.Add(new ConcessionType
            {
                Id = newTypeId, SchoolId = _schoolId, Name = "Sports Concession",
                DiscountType = "FixedAmount", DiscountValue = 5000,
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            var request = new CreateFeeConcessionRequest
            {
                SchoolId = _schoolId, StudentId = _student1Id,
                ConcessionTypeId = newTypeId, AcademicYear = "2025-2026",
                Reason = "Academic excellence scholarship", AppliedAmount = 5000
            };

            var result = await _service.CreateConcessionAsync(request);
            result.Should().NotBeNull();
            result.Status.Should().Be("Pending");
        }

        [Fact]
        public async Task CreateConcession_EmptyAcademicYear_ThrowsArgumentException()
        {
            var request = new CreateFeeConcessionRequest
            {
                SchoolId = _schoolId, StudentId = _student1Id,
                ConcessionTypeId = _concessionTypeId, AcademicYear = "",
                Reason = "Scholarship", AppliedAmount = 10000
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateConcessionAsync(request));
        }

        [Fact]
        public async Task CreateConcession_EmptyReason_ThrowsArgumentException()
        {
            var request = new CreateFeeConcessionRequest
            {
                SchoolId = _schoolId, StudentId = _student1Id,
                ConcessionTypeId = _concessionTypeId, AcademicYear = "2025-2026",
                Reason = "", AppliedAmount = 10000
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateConcessionAsync(request));
        }

        [Fact]
        public async Task CreateConcession_ReasonTooLong_ThrowsArgumentException()
        {
            var request = new CreateFeeConcessionRequest
            {
                SchoolId = _schoolId, StudentId = _student1Id,
                ConcessionTypeId = _concessionTypeId, AcademicYear = "2025-2026",
                Reason = new string('A', 501), AppliedAmount = 10000
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateConcessionAsync(request));
        }

        // ============================================================
        // APPROVE CONCESSION TESTS
        // ============================================================

        [Fact]
        public async Task ApproveConcession_ValidData_ReturnsApproved()
        {
            var request = new ApproveFeeConcessionRequest
            {
                ApprovedAmount = 12500, ApprovedBy = Guid.NewGuid()
            };

            var result = await _service.ApproveConcessionAsync(_concessionId, request, _schoolId);
            result.Should().NotBeNull();
            result.Status.Should().Be("Approved");
            result.ApprovedAmount.Should().Be(12500);
        }

        [Fact]
        public async Task ApproveConcession_ZeroAmount_ThrowsArgumentException()
        {
            var request = new ApproveFeeConcessionRequest { ApprovedAmount = 0, ApprovedBy = Guid.NewGuid() };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.ApproveConcessionAsync(_concessionId, request, _schoolId));
        }

        [Fact]
        public async Task ApproveConcession_NegativeAmount_ThrowsArgumentException()
        {
            var request = new ApproveFeeConcessionRequest { ApprovedAmount = -1000, ApprovedBy = Guid.NewGuid() };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.ApproveConcessionAsync(_concessionId, request, _schoolId));
        }

        [Fact]
        public async Task ApproveConcession_NotFound_ThrowsKeyNotFoundException()
        {
            var request = new ApproveFeeConcessionRequest { ApprovedAmount = 5000, ApprovedBy = Guid.NewGuid() };
            await Assert.ThrowsAsync<KeyNotFoundException>(() => _service.ApproveConcessionAsync(Guid.NewGuid(), request, _schoolId));
        }

        [Fact]
        public async Task ApproveConcession_AlreadyApproved_ThrowsInvalidOperationException()
        {
            // Approve first
            var request = new ApproveFeeConcessionRequest { ApprovedAmount = 12500, ApprovedBy = Guid.NewGuid() };
            await _service.ApproveConcessionAsync(_concessionId, request, _schoolId);

            // Try to approve again
            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                _service.ApproveConcessionAsync(_concessionId, request, _schoolId));
        }

        // ============================================================
        // REJECT CONCESSION TESTS
        // ============================================================

        [Fact]
        public async Task RejectConcession_ValidData_ReturnsRejected()
        {
            var request = new RejectFeeConcessionRequest
            {
                Reason = "Insufficient documentation"
            };

            var result = await _service.RejectConcessionAsync(_concessionId, request, _schoolId);
            result.Should().NotBeNull();
            result.Status.Should().Be("Rejected");
        }

        [Fact]
        public async Task RejectConcession_EmptyReason_ThrowsArgumentException()
        {
            var request = new RejectFeeConcessionRequest { Reason = "" };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.RejectConcessionAsync(_concessionId, request, _schoolId));
        }

        [Fact]
        public async Task RejectConcession_NotFound_ThrowsKeyNotFoundException()
        {
            var request = new RejectFeeConcessionRequest { Reason = "Not eligible" };
            await Assert.ThrowsAsync<KeyNotFoundException>(() => _service.RejectConcessionAsync(Guid.NewGuid(), request, _schoolId));
        }

        [Fact]
        public async Task RejectConcession_AlreadyRejected_ThrowsInvalidOperationException()
        {
            // Reject first
            var request = new RejectFeeConcessionRequest { Reason = "Not eligible" };
            await _service.RejectConcessionAsync(_concessionId, request, _schoolId);

            // Try to reject again
            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                _service.RejectConcessionAsync(_concessionId, request, _schoolId));
        }

        // ============================================================
        // DELETE CONCESSION TYPE TESTS
        // ============================================================

        [Fact]
        public async Task DeleteConcessionType_Exists_Succeeds()
        {
            // Create a disposable type
            var newType = new ConcessionType
            {
                Id = Guid.NewGuid(), SchoolId = _schoolId, Name = "Temp Type",
                DiscountType = "FixedAmount", DiscountValue = 1000,
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            };
            _context.ConcessionTypes.Add(newType);
            await _context.SaveChangesAsync();

            await _service.DeleteConcessionTypeAsync(newType.Id, _schoolId);

            var deleted = await _context.ConcessionTypes.FindAsync(newType.Id);
            // Should be soft-deleted or removed
            (deleted == null || deleted.IsDeleted).Should().BeTrue();
        }

        [Fact]
        public async Task DeleteConcessionType_NotFound_ThrowsKeyNotFoundException()
        {
            await Assert.ThrowsAsync<KeyNotFoundException>(() => _service.DeleteConcessionTypeAsync(Guid.NewGuid(), _schoolId));
        }
    }
}
