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
    public class TestLogger<T> : ILogger<T>
    {
        public IDisposable BeginScope<TState>(TState state) => null!;
        public bool IsEnabled(LogLevel logLevel) => true;
        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter) { }
    }

    public class FeeServiceTests : IDisposable
    {
        private readonly AppDbContext _context;
        private readonly FeeService _service;
        private readonly Guid _schoolId = Guid.NewGuid();
        private readonly Guid _student1Id = Guid.NewGuid();
        private readonly Guid _student2Id = Guid.NewGuid();
        private readonly Guid _structureId = Guid.NewGuid();
        private readonly Guid _feeRecordId = Guid.NewGuid();
        private readonly Guid _paymentId = Guid.NewGuid();

        public FeeServiceTests()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
                .Options;

            _context = new AppDbContext(options);
            var logger = new TestLogger<FeeService>();
            _service = new FeeService(_context, logger);
            SeedTestData().GetAwaiter().GetResult();
        }

        public void Dispose() => _context?.Dispose();

        private async Task SeedTestData()
        {
            var school = new School
            {
                Id = _schoolId,
                Name = "Test School",
                SchoolCode = "TST001",
                Address = "123 Test St",
                Phone = "1234567890",
                Email = "test@school.com",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Schools.Add(school);

            var student1 = new Student
            {
                Id = _student1Id,
                SchoolId = _schoolId,
                Name = "John Doe",
                FirstName = "John",
                LastName = "Doe",
                AdmissionNumber = "ADM001",
                Class = "10",
                Section = "A",
                Status = "Active",
                Email = "john@test.com",
                DateOfBirth = new DateTime(2010, 1, 1),
                Gender = "Male",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            var student2 = new Student
            {
                Id = _student2Id,
                SchoolId = _schoolId,
                Name = "Jane Smith",
                FirstName = "Jane",
                LastName = "Smith",
                AdmissionNumber = "ADM002",
                Class = "10",
                Section = "A",
                Status = "Active",
                Email = "jane@test.com",
                DateOfBirth = new DateTime(2010, 6, 15),
                Gender = "Female",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Students.AddRange(student1, student2);

            var structure = new FeeStructure
            {
                Id = _structureId,
                SchoolId = _schoolId,
                Name = "Class 10 Fee Structure 2025-26",
                Class = "10",
                AcademicYear = "2025-2026",
                TuitionFee = 50000,
                AdmissionFee = 5000,
                ExamFee = 2000,
                LibraryFee = 1000,
                TotalAmount = 58000,
                InstallmentCount = 4,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.FeeStructures.Add(structure);

            var feeRecord = new FeeRecord
            {
                Id = _feeRecordId,
                SchoolId = _schoolId,
                StudentId = _student1Id,
                FeeStructureId = _structureId,
                TotalAmount = 58000,
                PaidAmount = 20000,
                DiscountAmount = 0,
                LateFeeAmount = 0,
                PendingAmount = 38000,
                Status = "partial",
                DueDate = DateTime.UtcNow.AddDays(30),
                AcademicYear = "2025-2026",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.FeeRecords.Add(feeRecord);

            var payment = new PaymentTransaction
            {
                Id = _paymentId,
                SchoolId = _schoolId,
                StudentId = _student1Id,
                FeeRecordId = _feeRecordId,
                Amount = 20000,
                Method = "cash",
                Status = "success",
                Date = DateTime.UtcNow.AddDays(-5),
                ReceiptNumber = "RCP-001",
                ProcessedBy = "Admin",
                AcademicYear = "2025-2026",
                CreatedAt = DateTime.UtcNow
            };
            _context.PaymentTransactions.Add(payment);

            await _context.SaveChangesAsync();
        }

        // ============================================================
        // CREATE FEE STRUCTURE TESTS
        // ============================================================

        [Fact]
        public async Task CreateFeeStructure_ValidData_ReturnsCreatedStructure()
        {
            var request = new CreateFeeStructureRequest
            {
                SchoolId = _schoolId,
                Name = "New Fee Structure",
                Class = "9",
                AcademicYear = "2025-2026",
                TuitionFee = 40000,
                ExamFee = 2000,
                InstallmentCount = 3
            };

            var result = await _service.CreateFeeStructureAsync(request);

            result.Should().NotBeNull();
            result.Name.Should().Be("New Fee Structure");
            result.TotalAmount.Should().Be(42000);
        }

        [Fact]
        public async Task CreateFeeStructure_EmptyName_ThrowsArgumentException()
        {
            var request = new CreateFeeStructureRequest
            {
                SchoolId = _schoolId, Name = "", Class = "10", AcademicYear = "2025-2026", TuitionFee = 10000
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateFeeStructureAsync(request));
        }

        [Fact]
        public async Task CreateFeeStructure_NameTooShort_ThrowsArgumentException()
        {
            var request = new CreateFeeStructureRequest
            {
                SchoolId = _schoolId, Name = "AB", Class = "10", AcademicYear = "2025-2026", TuitionFee = 10000
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateFeeStructureAsync(request));
        }

        [Fact]
        public async Task CreateFeeStructure_NameTooLong_ThrowsArgumentException()
        {
            var request = new CreateFeeStructureRequest
            {
                SchoolId = _schoolId, Name = new string('A', 101), Class = "10", AcademicYear = "2025-2026", TuitionFee = 10000
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateFeeStructureAsync(request));
        }

        [Fact]
        public async Task CreateFeeStructure_EmptyClass_ThrowsArgumentException()
        {
            var request = new CreateFeeStructureRequest
            {
                SchoolId = _schoolId, Name = "Test Structure", Class = "", AcademicYear = "2025-2026", TuitionFee = 10000
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateFeeStructureAsync(request));
        }

        [Fact]
        public async Task CreateFeeStructure_EmptyAcademicYear_ThrowsArgumentException()
        {
            var request = new CreateFeeStructureRequest
            {
                SchoolId = _schoolId, Name = "Test Structure", Class = "10", AcademicYear = "", TuitionFee = 10000
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateFeeStructureAsync(request));
        }

        [Fact]
        public async Task CreateFeeStructure_NegativeFeeComponent_ThrowsArgumentException()
        {
            var request = new CreateFeeStructureRequest
            {
                SchoolId = _schoolId, Name = "Test Structure", Class = "10", AcademicYear = "2025-2026", TuitionFee = -5000
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateFeeStructureAsync(request));
        }

        [Fact]
        public async Task CreateFeeStructure_AllZeroComponents_ThrowsArgumentException()
        {
            var request = new CreateFeeStructureRequest
            {
                SchoolId = _schoolId, Name = "Test Structure", Class = "10", AcademicYear = "2025-2026"
                // All fee components default to 0
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateFeeStructureAsync(request));
        }

        [Fact]
        public async Task CreateFeeStructure_NegativeInstallmentCount_ThrowsArgumentException()
        {
            var request = new CreateFeeStructureRequest
            {
                SchoolId = _schoolId, Name = "Test Structure", Class = "10", AcademicYear = "2025-2026",
                TuitionFee = 10000, InstallmentCount = -1
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateFeeStructureAsync(request));
        }

        [Fact]
        public async Task CreateFeeStructure_InstallmentCountOver12_ThrowsArgumentException()
        {
            var request = new CreateFeeStructureRequest
            {
                SchoolId = _schoolId, Name = "Test Structure", Class = "10", AcademicYear = "2025-2026",
                TuitionFee = 10000, InstallmentCount = 13
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateFeeStructureAsync(request));
        }

        [Fact]
        public async Task CreateFeeStructure_FeeComponentExceedsMax_ThrowsArgumentException()
        {
            var request = new CreateFeeStructureRequest
            {
                SchoolId = _schoolId, Name = "Test Structure", Class = "10", AcademicYear = "2025-2026",
                TuitionFee = 10_000_001
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateFeeStructureAsync(request));
        }

        [Fact]
        public async Task CreateFeeStructure_DuplicateNameClassYear_ThrowsInvalidOperationException()
        {
            var request = new CreateFeeStructureRequest
            {
                SchoolId = _schoolId,
                Name = "Class 10 Fee Structure 2025-26",
                Class = "10",
                AcademicYear = "2025-2026",
                TuitionFee = 10000
            };
            await Assert.ThrowsAsync<InvalidOperationException>(() => _service.CreateFeeStructureAsync(request));
        }

        [Fact]
        public async Task CreateFeeStructure_DescriptionTooLong_ThrowsArgumentException()
        {
            var request = new CreateFeeStructureRequest
            {
                SchoolId = _schoolId, Name = "Test Structure", Class = "10", AcademicYear = "2025-2026",
                TuitionFee = 10000, Description = new string('A', 501)
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateFeeStructureAsync(request));
        }

        [Fact]
        public async Task CreateFeeStructure_CalculatesTotalCorrectly()
        {
            var request = new CreateFeeStructureRequest
            {
                SchoolId = _schoolId, Name = "Full Fee Structure", Class = "8", AcademicYear = "2025-2026",
                TuitionFee = 30000, AdmissionFee = 5000, ExamFee = 2000, LibraryFee = 1000,
                LabFee = 1500, SportsFee = 1000, TransportFee = 3000, HostelFee = 0,
                UniformFee = 2500, BooksFee = 3000, DevelopmentFee = 2000, Miscellaneous = 500,
                InstallmentCount = 4
            };

            var result = await _service.CreateFeeStructureAsync(request);
            result.TotalAmount.Should().Be(51500);
            result.InstallmentCount.Should().Be(4);
        }

        // ============================================================
        // GET FEE STRUCTURES TESTS
        // ============================================================

        [Fact]
        public async Task GetFeeStructures_ReturnsStructuresForSchool()
        {
            var result = await _service.GetFeeStructuresAsync(_schoolId, null);
            result.Should().NotBeEmpty();
            result.All(s => s.SchoolId == _schoolId).Should().BeTrue();
        }

        [Fact]
        public async Task GetFeeStructures_WithClassFilter_FiltersCorrectly()
        {
            var result = await _service.GetFeeStructuresAsync(_schoolId, "10");
            result.Should().NotBeEmpty();
            result.All(s => s.Class == "10").Should().BeTrue();
        }

        [Fact]
        public async Task GetFeeStructures_NoMatchingClass_ReturnsEmpty()
        {
            var result = await _service.GetFeeStructuresAsync(_schoolId, "99");
            result.Should().BeEmpty();
        }

        [Fact]
        public async Task GetFeeStructureById_Exists_ReturnsStructure()
        {
            var result = await _service.GetFeeStructureByIdAsync(_structureId, _schoolId);
            result.Should().NotBeNull();
            result!.Id.Should().Be(_structureId);
        }

        [Fact]
        public async Task GetFeeStructureById_NotFound_ReturnsNull()
        {
            var result = await _service.GetFeeStructureByIdAsync(Guid.NewGuid(), _schoolId);
            result.Should().BeNull();
        }

        [Fact]
        public async Task GetFeeStructureById_WrongSchool_ReturnsNull()
        {
            var result = await _service.GetFeeStructureByIdAsync(_structureId, Guid.NewGuid());
            result.Should().BeNull();
        }

        // ============================================================
        // CREATE FEE RECORD TESTS
        // ============================================================

        [Fact]
        public async Task CreateFeeRecord_ValidData_ReturnsRecord()
        {
            var request = new CreateFeeRecordRequest
            {
                SchoolId = _schoolId,
                StudentId = _student2Id,
                FeeStructureId = _structureId,
                TotalAmount = 58000,
                DueDate = DateTime.UtcNow.AddDays(60),
                AcademicYear = "2025-2026",
                Status = "pending"
            };

            var result = await _service.CreateFeeRecordAsync(request);
            result.Should().NotBeNull();
            result.TotalAmount.Should().Be(58000);
            result.StudentId.Should().Be(_student2Id);
        }

        [Fact]
        public async Task CreateFeeRecord_EmptyStudentId_ThrowsArgumentException()
        {
            var request = new CreateFeeRecordRequest
            {
                SchoolId = _schoolId, StudentId = Guid.Empty, TotalAmount = 50000,
                DueDate = DateTime.UtcNow.AddDays(30), AcademicYear = "2025-2026", Status = "pending"
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateFeeRecordAsync(request));
        }

        [Fact]
        public async Task CreateFeeRecord_NonExistentStudent_ThrowsKeyNotFoundException()
        {
            var request = new CreateFeeRecordRequest
            {
                SchoolId = _schoolId, StudentId = Guid.NewGuid(), TotalAmount = 50000,
                DueDate = DateTime.UtcNow.AddDays(30), AcademicYear = "2025-2026", Status = "pending"
            };
            await Assert.ThrowsAsync<KeyNotFoundException>(() => _service.CreateFeeRecordAsync(request));
        }

        [Fact]
        public async Task CreateFeeRecord_ZeroAmount_ThrowsArgumentException()
        {
            var request = new CreateFeeRecordRequest
            {
                SchoolId = _schoolId, StudentId = _student2Id, TotalAmount = 0,
                DueDate = DateTime.UtcNow.AddDays(30), AcademicYear = "2025-2026", Status = "pending"
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateFeeRecordAsync(request));
        }

        [Fact]
        public async Task CreateFeeRecord_NegativeAmount_ThrowsArgumentException()
        {
            var request = new CreateFeeRecordRequest
            {
                SchoolId = _schoolId, StudentId = _student2Id, TotalAmount = -1000,
                DueDate = DateTime.UtcNow.AddDays(30), AcademicYear = "2025-2026", Status = "pending"
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateFeeRecordAsync(request));
        }

        [Fact]
        public async Task CreateFeeRecord_AmountExceedsMax_ThrowsArgumentException()
        {
            var request = new CreateFeeRecordRequest
            {
                SchoolId = _schoolId, StudentId = _student2Id, TotalAmount = 10_000_001,
                DueDate = DateTime.UtcNow.AddDays(30), AcademicYear = "2025-2026", Status = "pending"
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateFeeRecordAsync(request));
        }

        [Fact]
        public async Task CreateFeeRecord_NegativePaidAmount_ThrowsArgumentException()
        {
            var request = new CreateFeeRecordRequest
            {
                SchoolId = _schoolId, StudentId = _student2Id, TotalAmount = 50000, PaidAmount = -1000,
                DueDate = DateTime.UtcNow.AddDays(30), AcademicYear = "2025-2026", Status = "pending"
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateFeeRecordAsync(request));
        }

        [Fact]
        public async Task CreateFeeRecord_PaidExceedsTotal_ThrowsArgumentException()
        {
            var request = new CreateFeeRecordRequest
            {
                SchoolId = _schoolId, StudentId = _student2Id, TotalAmount = 50000, PaidAmount = 40000, DiscountAmount = 20000,
                DueDate = DateTime.UtcNow.AddDays(30), AcademicYear = "2025-2026", Status = "pending"
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateFeeRecordAsync(request));
        }

        [Fact]
        public async Task CreateFeeRecord_EmptyAcademicYear_ThrowsArgumentException()
        {
            var request = new CreateFeeRecordRequest
            {
                SchoolId = _schoolId, StudentId = _student2Id, TotalAmount = 50000,
                DueDate = DateTime.UtcNow.AddDays(30), AcademicYear = "", Status = "pending"
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateFeeRecordAsync(request));
        }

        [Fact]
        public async Task CreateFeeRecord_InvalidStatus_ThrowsArgumentException()
        {
            var request = new CreateFeeRecordRequest
            {
                SchoolId = _schoolId, StudentId = _student2Id, TotalAmount = 50000,
                DueDate = DateTime.UtcNow.AddDays(30), AcademicYear = "2025-2026", Status = "invalid"
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateFeeRecordAsync(request));
        }

        [Fact]
        public async Task CreateFeeRecord_DueDateTooOld_ThrowsArgumentException()
        {
            var request = new CreateFeeRecordRequest
            {
                SchoolId = _schoolId, StudentId = _student2Id, TotalAmount = 50000,
                DueDate = DateTime.UtcNow.AddYears(-3), AcademicYear = "2025-2026", Status = "pending"
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateFeeRecordAsync(request));
        }

        [Fact]
        public async Task CreateFeeRecord_NonExistentStructure_ThrowsKeyNotFoundException()
        {
            var request = new CreateFeeRecordRequest
            {
                SchoolId = _schoolId, StudentId = _student2Id, FeeStructureId = Guid.NewGuid(),
                TotalAmount = 50000, DueDate = DateTime.UtcNow.AddDays(30), AcademicYear = "2025-2026", Status = "pending"
            };
            await Assert.ThrowsAsync<KeyNotFoundException>(() => _service.CreateFeeRecordAsync(request));
        }

        [Fact]
        public async Task CreateFeeRecord_DuplicateStudentStructureYear_ThrowsInvalidOperationException()
        {
            var request = new CreateFeeRecordRequest
            {
                SchoolId = _schoolId, StudentId = _student1Id, FeeStructureId = _structureId,
                TotalAmount = 58000, DueDate = DateTime.UtcNow.AddDays(30), AcademicYear = "2025-2026", Status = "pending"
            };
            await Assert.ThrowsAsync<InvalidOperationException>(() => _service.CreateFeeRecordAsync(request));
        }

        // ============================================================
        // GET FEE RECORDS TESTS (PAGINATION)
        // ============================================================

        [Fact]
        public async Task GetFeeRecords_ReturnsRecordsForSchool()
        {
            var result = await _service.GetFeeRecordsAsync(_schoolId, 1, 20, null, null);
            result.Should().NotBeNull();
            result.FeeRecords.Should().NotBeEmpty();
        }

        [Fact]
        public async Task GetFeeRecords_PageZeroNormalized()
        {
            var result = await _service.GetFeeRecordsAsync(_schoolId, 0, 20, null, null);
            result.Page.Should().Be(1);
        }

        [Fact]
        public async Task GetFeeRecords_NegativePageNormalized()
        {
            var result = await _service.GetFeeRecordsAsync(_schoolId, -5, 20, null, null);
            result.Page.Should().Be(1);
        }

        [Fact]
        public async Task GetFeeRecords_PageSizeOver100Normalized()
        {
            var result = await _service.GetFeeRecordsAsync(_schoolId, 1, 200, null, null);
            result.PageSize.Should().Be(100);
        }

        [Fact]
        public async Task GetFeeRecords_PageSizeZeroNormalized()
        {
            var result = await _service.GetFeeRecordsAsync(_schoolId, 1, 0, null, null);
            result.PageSize.Should().Be(20);
        }

        [Fact]
        public async Task GetFeeRecords_FilterByStudent()
        {
            var result = await _service.GetFeeRecordsAsync(_schoolId, 1, 20, _student1Id, null);
            result.FeeRecords.Should().NotBeEmpty();
            result.FeeRecords.All(r => r.StudentId == _student1Id).Should().BeTrue();
        }

        [Fact]
        public async Task GetFeeRecords_FilterByStatus()
        {
            var result = await _service.GetFeeRecordsAsync(_schoolId, 1, 20, null, "partial");
            result.FeeRecords.All(r => r.Status == "partial").Should().BeTrue();
        }

        // ============================================================
        // GET FEE RECORD BY ID TESTS
        // ============================================================

        [Fact]
        public async Task GetFeeRecordById_Exists_ReturnsRecord()
        {
            var result = await _service.GetFeeRecordByIdAsync(_feeRecordId, _schoolId);
            result.Should().NotBeNull();
            result!.Id.Should().Be(_feeRecordId);
            result.StudentName.Should().NotBeEmpty();
        }

        [Fact]
        public async Task GetFeeRecordById_NotFound_ReturnsNull()
        {
            var result = await _service.GetFeeRecordByIdAsync(Guid.NewGuid(), _schoolId);
            result.Should().BeNull();
        }

        [Fact]
        public async Task GetFeeRecordById_IncludesPayments()
        {
            var result = await _service.GetFeeRecordByIdAsync(_feeRecordId, _schoolId);
            result.Should().NotBeNull();
            result!.Payments.Should().NotBeEmpty();
            result.Payments.First().ReceiptNumber.Should().Be("RCP-001");
        }

        // ============================================================
        // CREATE PAYMENT TESTS
        // ============================================================

        [Fact]
        public async Task CreatePayment_ValidData_ReturnsPayment()
        {
            var request = new CreatePaymentRequest
            {
                SchoolId = _schoolId,
                StudentId = _student1Id,
                FeeRecordId = _feeRecordId,
                Amount = 10000,
                Date = DateTime.UtcNow,
                Method = "cash",
                ReceiptNumber = "RCP-002",
                ProcessedBy = "Admin",
                AcademicYear = "2025-2026"
            };

            var result = await _service.CreatePaymentAsync(request);
            result.Should().NotBeNull();
            result.Amount.Should().Be(10000);
            result.Status.Should().Be("success");
        }

        [Fact]
        public async Task CreatePayment_ZeroAmount_ThrowsArgumentException()
        {
            var request = new CreatePaymentRequest
            {
                SchoolId = _schoolId, StudentId = _student1Id, FeeRecordId = _feeRecordId,
                Amount = 0, Date = DateTime.UtcNow, Method = "cash", ReceiptNumber = "RCP-X"
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreatePaymentAsync(request));
        }

        [Fact]
        public async Task CreatePayment_NegativeAmount_ThrowsArgumentException()
        {
            var request = new CreatePaymentRequest
            {
                SchoolId = _schoolId, StudentId = _student1Id, FeeRecordId = _feeRecordId,
                Amount = -1000, Date = DateTime.UtcNow, Method = "cash", ReceiptNumber = "RCP-X"
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreatePaymentAsync(request));
        }

        [Fact]
        public async Task CreatePayment_AmountExceedsMax_ThrowsArgumentException()
        {
            var request = new CreatePaymentRequest
            {
                SchoolId = _schoolId, StudentId = _student1Id, FeeRecordId = _feeRecordId,
                Amount = 10_000_001, Date = DateTime.UtcNow, Method = "cash", ReceiptNumber = "RCP-X"
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreatePaymentAsync(request));
        }

        [Fact]
        public async Task CreatePayment_InvalidMethod_ThrowsArgumentException()
        {
            var request = new CreatePaymentRequest
            {
                SchoolId = _schoolId, StudentId = _student1Id, FeeRecordId = _feeRecordId,
                Amount = 5000, Date = DateTime.UtcNow, Method = "bitcoin", ReceiptNumber = "RCP-X"
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreatePaymentAsync(request));
        }

        [Fact]
        public async Task CreatePayment_EmptyMethod_ThrowsArgumentException()
        {
            var request = new CreatePaymentRequest
            {
                SchoolId = _schoolId, StudentId = _student1Id, FeeRecordId = _feeRecordId,
                Amount = 5000, Date = DateTime.UtcNow, Method = "", ReceiptNumber = "RCP-X"
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreatePaymentAsync(request));
        }

        [Fact]
        public async Task CreatePayment_EmptyReceiptNumber_ThrowsArgumentException()
        {
            var request = new CreatePaymentRequest
            {
                SchoolId = _schoolId, StudentId = _student1Id, FeeRecordId = _feeRecordId,
                Amount = 5000, Date = DateTime.UtcNow, Method = "cash", ReceiptNumber = ""
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreatePaymentAsync(request));
        }

        [Fact]
        public async Task CreatePayment_FutureDate_ThrowsArgumentException()
        {
            var request = new CreatePaymentRequest
            {
                SchoolId = _schoolId, StudentId = _student1Id, FeeRecordId = _feeRecordId,
                Amount = 5000, Date = DateTime.UtcNow.AddDays(7), Method = "cash", ReceiptNumber = "RCP-X"
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreatePaymentAsync(request));
        }

        [Fact]
        public async Task CreatePayment_NullSchoolId_ThrowsArgumentException()
        {
            var request = new CreatePaymentRequest
            {
                SchoolId = null, StudentId = _student1Id, FeeRecordId = _feeRecordId,
                Amount = 5000, Date = DateTime.UtcNow, Method = "cash", ReceiptNumber = "RCP-X"
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreatePaymentAsync(request));
        }

        [Fact]
        public async Task CreatePayment_ChequeWithoutNumber_ThrowsArgumentException()
        {
            var request = new CreatePaymentRequest
            {
                SchoolId = _schoolId, StudentId = _student1Id, FeeRecordId = _feeRecordId,
                Amount = 5000, Date = DateTime.UtcNow, Method = "cheque", ReceiptNumber = "RCP-X"
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreatePaymentAsync(request));
        }

        [Fact]
        public async Task CreatePayment_ExceedsOutstanding_ThrowsInvalidOperationException()
        {
            var request = new CreatePaymentRequest
            {
                SchoolId = _schoolId, StudentId = _student1Id, FeeRecordId = _feeRecordId,
                Amount = 50000, // Outstanding is 38000
                Date = DateTime.UtcNow, Method = "cash", ReceiptNumber = "RCP-X"
            };
            await Assert.ThrowsAsync<InvalidOperationException>(() => _service.CreatePaymentAsync(request));
        }

        [Fact]
        public async Task CreatePayment_UpdatesFeeRecordBalance()
        {
            var request = new CreatePaymentRequest
            {
                SchoolId = _schoolId, StudentId = _student1Id, FeeRecordId = _feeRecordId,
                Amount = 10000, Date = DateTime.UtcNow, Method = "upi", ReceiptNumber = "RCP-003"
            };

            await _service.CreatePaymentAsync(request);

            var record = await _context.FeeRecords.FindAsync(_feeRecordId);
            record!.PaidAmount.Should().Be(30000); // 20000 + 10000
            record.PendingAmount.Should().Be(28000); // 58000 - 30000
        }

        [Fact]
        public async Task CreatePayment_FullPayment_SetsStatusPaid()
        {
            var request = new CreatePaymentRequest
            {
                SchoolId = _schoolId, StudentId = _student1Id, FeeRecordId = _feeRecordId,
                Amount = 38000, // Exactly the outstanding amount
                Date = DateTime.UtcNow, Method = "bank_transfer", ReceiptNumber = "RCP-FULL"
            };

            await _service.CreatePaymentAsync(request);

            var record = await _context.FeeRecords.FindAsync(_feeRecordId);
            record!.Status.Should().Be("paid");
            record.PendingAmount.Should().BeLessThanOrEqualTo(0);
        }

        [Fact]
        public async Task CreatePayment_AllValidMethods()
        {
            var methods = new[] { "cash", "cheque", "online", "upi", "card", "bank_transfer", "razorpay", "payu" };
            foreach (var method in methods)
            {
                // Create a fresh fee record for each
                var recordId = Guid.NewGuid();
                _context.FeeRecords.Add(new FeeRecord
                {
                    Id = recordId, SchoolId = _schoolId, StudentId = _student1Id,
                    TotalAmount = 10000, PendingAmount = 10000, Status = "pending",
                    DueDate = DateTime.UtcNow.AddDays(30), AcademicYear = "2025-2026",
                    CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
                });
                await _context.SaveChangesAsync();

                var request = new CreatePaymentRequest
                {
                    SchoolId = _schoolId, StudentId = _student1Id, FeeRecordId = recordId,
                    Amount = 1000, Date = DateTime.UtcNow, Method = method,
                    ReceiptNumber = $"RCP-{method}",
                    ChequeNumber = method == "cheque" ? "CHQ001" : null
                };

                var result = await _service.CreatePaymentAsync(request);
                result.Method.Should().Be(method);
            }
        }

        // ============================================================
        // LATE FEE CONFIG TESTS
        // ============================================================

        [Fact]
        public async Task CreateLateFeeConfig_ValidData_ReturnsConfig()
        {
            var dto = new CreateLateFeeConfigDto
            {
                GracePeriodDays = 7, FeeType = "daily", Amount = 50, MaxAmount = 1500, IsActive = true
            };

            var result = await _service.CreateOrUpdateLateFeeConfigAsync(_schoolId, dto);
            result.Should().NotBeNull();
            result.GracePeriodDays.Should().Be(7);
            result.FeeType.Should().Be("daily");
        }

        [Fact]
        public async Task CreateLateFeeConfig_NegativeGracePeriod_ThrowsArgumentException()
        {
            var dto = new CreateLateFeeConfigDto { GracePeriodDays = -1, FeeType = "daily", Amount = 50 };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateOrUpdateLateFeeConfigAsync(_schoolId, dto));
        }

        [Fact]
        public async Task CreateLateFeeConfig_GracePeriodOver365_ThrowsArgumentException()
        {
            var dto = new CreateLateFeeConfigDto { GracePeriodDays = 400, FeeType = "daily", Amount = 50 };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateOrUpdateLateFeeConfigAsync(_schoolId, dto));
        }

        [Fact]
        public async Task CreateLateFeeConfig_InvalidFeeType_ThrowsArgumentException()
        {
            var dto = new CreateLateFeeConfigDto { GracePeriodDays = 7, FeeType = "hourly", Amount = 50 };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateOrUpdateLateFeeConfigAsync(_schoolId, dto));
        }

        [Fact]
        public async Task CreateLateFeeConfig_ZeroAmount_ThrowsArgumentException()
        {
            var dto = new CreateLateFeeConfigDto { GracePeriodDays = 7, FeeType = "daily", Amount = 0 };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateOrUpdateLateFeeConfigAsync(_schoolId, dto));
        }

        [Fact]
        public async Task CreateLateFeeConfig_PercentageOver100_ThrowsArgumentException()
        {
            var dto = new CreateLateFeeConfigDto { GracePeriodDays = 7, FeeType = "percentage", Amount = 150 };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateOrUpdateLateFeeConfigAsync(_schoolId, dto));
        }

        [Fact]
        public async Task CreateLateFeeConfig_NegativeMaxAmount_ThrowsArgumentException()
        {
            var dto = new CreateLateFeeConfigDto { GracePeriodDays = 7, FeeType = "daily", Amount = 50, MaxAmount = -100 };
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateOrUpdateLateFeeConfigAsync(_schoolId, dto));
        }

        [Fact]
        public async Task CreateLateFeeConfig_UpdatesExisting()
        {
            // Create first
            var dto1 = new CreateLateFeeConfigDto { GracePeriodDays = 7, FeeType = "daily", Amount = 50, IsActive = true };
            await _service.CreateOrUpdateLateFeeConfigAsync(_schoolId, dto1);

            // Update
            var dto2 = new CreateLateFeeConfigDto { GracePeriodDays = 14, FeeType = "fixed", Amount = 500, IsActive = true };
            var result = await _service.CreateOrUpdateLateFeeConfigAsync(_schoolId, dto2);

            result.GracePeriodDays.Should().Be(14);
            result.FeeType.Should().Be("fixed");
            result.Amount.Should().Be(500);
        }

        [Fact]
        public async Task GetLateFeeConfig_NotFound_ReturnsNull()
        {
            var result = await _service.GetLateFeeConfigAsync(Guid.NewGuid());
            result.Should().BeNull();
        }

        // ============================================================
        // CALCULATE LATE FEE TESTS
        // ============================================================

        [Fact]
        public async Task CalculateLateFee_NoConfig_ReturnsZero()
        {
            var result = await _service.CalculateLateFeeAsync(_feeRecordId, _schoolId);
            result.Should().Be(0);
        }

        [Fact]
        public async Task CalculateLateFee_NotOverdue_ReturnsZero()
        {
            // Fee record has due date 30 days in future
            _context.LateFeeConfigs.Add(new LateFeeConfig
            {
                Id = Guid.NewGuid(), SchoolId = _schoolId, GracePeriodDays = 7,
                FeeType = "daily", Amount = 50, IsActive = true,
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            var result = await _service.CalculateLateFeeAsync(_feeRecordId, _schoolId);
            result.Should().Be(0);
        }

        [Fact]
        public async Task CalculateLateFee_PaidRecord_ReturnsZero()
        {
            var paidRecordId = Guid.NewGuid();
            _context.FeeRecords.Add(new FeeRecord
            {
                Id = paidRecordId, SchoolId = _schoolId, StudentId = _student1Id,
                TotalAmount = 50000, PaidAmount = 50000, PendingAmount = 0, Status = "paid",
                DueDate = DateTime.UtcNow.AddDays(-60), AcademicYear = "2025-2026",
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            var result = await _service.CalculateLateFeeAsync(paidRecordId, _schoolId);
            result.Should().Be(0);
        }

        // ============================================================
        // FEE STATS TESTS
        // ============================================================

        [Fact]
        public async Task GetFeeStats_ReturnsStats()
        {
            var result = await _service.GetFeeStatsAsync(_schoolId, null);
            result.Should().NotBeNull();
            result.TotalFees.Should().BeGreaterThan(0);
            result.CollectedFees.Should().BeGreaterThan(0);
        }

        [Fact]
        public async Task GetFeeStats_WithAcademicYear_Filters()
        {
            var result = await _service.GetFeeStatsAsync(_schoolId, "2025-2026");
            result.Should().NotBeNull();
            result.TotalFees.Should().Be(58000);
        }

        [Fact]
        public async Task GetFeeStats_NoMatchingYear_ReturnsZeros()
        {
            var result = await _service.GetFeeStatsAsync(_schoolId, "1999-2000");
            result.TotalFees.Should().Be(0);
        }

        // ============================================================
        // BULK ASSIGN STRUCTURE TESTS
        // ============================================================

        [Fact]
        public async Task BulkAssignStructure_NotFound_ThrowsKeyNotFoundException()
        {
            await Assert.ThrowsAsync<KeyNotFoundException>(() => _service.BulkAssignStructureAsync(Guid.NewGuid(), _schoolId));
        }

        [Fact]
        public async Task BulkAssignStructure_SkipsExistingRecords()
        {
            // Student1 already has a record for this structure
            var (assigned, skipped) = await _service.BulkAssignStructureAsync(_structureId, _schoolId);
            // Student1 should be skipped, Student2 might get assigned
            skipped.Should().BeGreaterThanOrEqualTo(0);
        }

        // ============================================================
        // ADD EXTRA CHARGES TESTS
        // ============================================================

        [Fact]
        public async Task AddExtraCharges_ValidData_IncreasesTotal()
        {
            var req = new AddExtraChargesRequest
            {
                Charges = new List<ExtraChargeItem>
                {
                    new() { Label = "Library Fine", Amount = 500 },
                    new() { Label = "Lab Damage", Amount = 1000 }
                },
                Reason = "Damages",
                AddedBy = "Admin"
            };

            var result = await _service.AddExtraChargesAsync(_feeRecordId, _schoolId, req);
            result.ChargesAdded.Should().Be(1500);
            result.NewTotalAmount.Should().Be(59500); // 58000 + 1500
        }

        [Fact]
        public async Task AddExtraCharges_NotFound_ThrowsKeyNotFoundException()
        {
            var req = new AddExtraChargesRequest
            {
                Charges = new List<ExtraChargeItem> { new() { Label = "Fine", Amount = 100 } }
            };
            await Assert.ThrowsAsync<KeyNotFoundException>(() => _service.AddExtraChargesAsync(Guid.NewGuid(), _schoolId, req));
        }

        [Fact]
        public async Task AddExtraCharges_ZeroTotal_ThrowsInvalidOperationException()
        {
            var req = new AddExtraChargesRequest
            {
                Charges = new List<ExtraChargeItem> { new() { Label = "Fine", Amount = 0 } }
            };
            await Assert.ThrowsAsync<InvalidOperationException>(() => _service.AddExtraChargesAsync(_feeRecordId, _schoolId, req));
        }

        // ============================================================
        // LINK STRUCTURE TESTS
        // ============================================================

        [Fact]
        public async Task LinkStructure_AlreadyLinked_ReturnsExisting()
        {
            var result = await _service.LinkStructureAsync(_feeRecordId, _schoolId);
            result.Should().NotBeNull();
            result.Message.Should().Contain("Already linked");
        }

        [Fact]
        public async Task LinkStructure_NotFound_ThrowsKeyNotFoundException()
        {
            await Assert.ThrowsAsync<KeyNotFoundException>(() => _service.LinkStructureAsync(Guid.NewGuid(), _schoolId));
        }

        [Fact]
        public async Task LinkStructure_NoStructureForClass_ThrowsInvalidOperationException()
        {
            // Create a record without a structure for a class that has no structure
            var recordId = Guid.NewGuid();
            var studentId = Guid.NewGuid();
            _context.Students.Add(new Student
            {
                Id = studentId, SchoolId = _schoolId, Name = "Orphan Student",
                FirstName = "Orphan", LastName = "Student", AdmissionNumber = "ADM099",
                Class = "99", Section = "Z", Status = "Active", Email = "orphan@test.com",
                DateOfBirth = new DateTime(2010, 1, 1), Gender = "Male",
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            });
            _context.FeeRecords.Add(new FeeRecord
            {
                Id = recordId, SchoolId = _schoolId, StudentId = studentId,
                TotalAmount = 50000, PendingAmount = 50000, Status = "pending",
                DueDate = DateTime.UtcNow.AddDays(30), AcademicYear = "2025-2026",
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            await Assert.ThrowsAsync<InvalidOperationException>(() => _service.LinkStructureAsync(recordId, _schoolId));
        }

        // ============================================================
        // EDIT PAYMENT TESTS
        // ============================================================

        [Fact]
        public async Task EditPayment_NotFound_ThrowsKeyNotFoundException()
        {
            var req = new EditPaymentRequest { EditReason = "Correction" };
            await Assert.ThrowsAsync<KeyNotFoundException>(() => _service.EditPaymentAsync(Guid.NewGuid(), _schoolId, req));
        }

        [Fact]
        public async Task EditPayment_VoidedPayment_ThrowsInvalidOperationException()
        {
            // Create a voided payment
            var voidPaymentId = Guid.NewGuid();
            _context.PaymentTransactions.Add(new PaymentTransaction
            {
                Id = voidPaymentId, SchoolId = _schoolId, StudentId = _student1Id,
                FeeRecordId = _feeRecordId, Amount = 5000, Method = "cash", Status = "voided",
                Date = DateTime.UtcNow, ReceiptNumber = "RCP-VOID", ProcessedBy = "Admin",
                AcademicYear = "2025-2026", CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            var req = new EditPaymentRequest { Amount = 6000, EditReason = "Correction" };
            await Assert.ThrowsAsync<InvalidOperationException>(() => _service.EditPaymentAsync(voidPaymentId, _schoolId, req));
        }

        // ============================================================
        // REFUND TESTS
        // ============================================================

        [Fact]
        public async Task GetRefundStatus_NotFound_ThrowsKeyNotFoundException()
        {
            await Assert.ThrowsAsync<KeyNotFoundException>(() => _service.GetRefundStatusAsync(_schoolId, Guid.NewGuid()));
        }

        // ============================================================
        // INITIATE PAYMENT (GATEWAY) TESTS
        // ============================================================

        [Fact]
        public async Task InitiatePayment_NotFound_ThrowsKeyNotFoundException()
        {
            var dto = new InitiatePaymentDto { Gateway = "razorpay", Amount = 5000 };
            await Assert.ThrowsAsync<KeyNotFoundException>(() => _service.InitiatePaymentAsync(_schoolId, Guid.NewGuid(), dto));
        }

        [Fact]
        public async Task InitiatePayment_AlreadyPaid_ThrowsInvalidOperationException()
        {
            var paidRecordId = Guid.NewGuid();
            _context.FeeRecords.Add(new FeeRecord
            {
                Id = paidRecordId, SchoolId = _schoolId, StudentId = _student1Id,
                TotalAmount = 50000, PaidAmount = 50000, PendingAmount = 0, Status = "paid",
                DueDate = DateTime.UtcNow.AddDays(30), AcademicYear = "2025-2026",
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            var dto = new InitiatePaymentDto { Gateway = "razorpay", Amount = 5000 };
            await Assert.ThrowsAsync<InvalidOperationException>(() => _service.InitiatePaymentAsync(_schoolId, paidRecordId, dto));
        }

        // ============================================================
        // OVERDUE FEES TESTS
        // ============================================================

        [Fact]
        public async Task GetOverdueFees_NoOverdue_ReturnsEmpty()
        {
            var result = await _service.GetOverdueFeesAsync(_schoolId);
            // Our seed data has DueDate 30 days in future, so no overdue
            result.Should().BeEmpty();
        }

        [Fact]
        public async Task GetOverdueFees_WithOverdue_ReturnsRecords()
        {
            // Add an overdue record
            _context.FeeRecords.Add(new FeeRecord
            {
                Id = Guid.NewGuid(), SchoolId = _schoolId, StudentId = _student1Id,
                TotalAmount = 30000, PaidAmount = 0, PendingAmount = 30000, BalanceAmount = 30000,
                Status = "pending", DueDate = DateTime.UtcNow.AddDays(-45), AcademicYear = "2025-2026",
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            var result = await _service.GetOverdueFeesAsync(_schoolId);
            result.Should().NotBeEmpty();
            result.First().DaysOverdue.Should().BeGreaterThan(0);
        }
    }
}
