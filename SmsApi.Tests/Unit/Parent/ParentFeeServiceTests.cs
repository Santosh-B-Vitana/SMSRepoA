using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;
using Microsoft.Extensions.Logging.Abstractions;
using SmsApi.Services;
using Xunit;

namespace SmsApi.Tests.Unit.Parent
{
    /// <summary>
    /// Unit tests for parent-facing fee operations:
    /// - Initiating a payment gateway transaction
    /// - Fetching fee records for a specific child
    /// Production-relevant: validates isolation, error states, and gateway response
    /// </summary>
    public class ParentFeeServiceTests : IDisposable
    {
        private readonly AppDbContext _context;
        private readonly FeeService _service;
        private readonly Guid _schoolId = Guid.NewGuid();
        private readonly Guid _otherSchoolId = Guid.NewGuid();
        private readonly Guid _studentId = Guid.NewGuid();
        private readonly Guid _feeRecordId = Guid.NewGuid();
        private readonly Guid _paidFeeRecordId = Guid.NewGuid();

        public ParentFeeServiceTests()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options;
            _context = new AppDbContext(options);
            _service = new FeeService(_context, NullLogger<FeeService>.Instance);
            SeedTestData().GetAwaiter().GetResult();
        }

        public void Dispose() => _context.Dispose();

        private async Task SeedTestData()
        {
            var student = new Student
            {
                Id = _studentId,
                SchoolId = _schoolId,
                Name = "Arjun Sharma",
                FirstName = "Arjun",
                LastName = "Sharma",
                AdmissionNumber = "ADM-001",
                Class = "Class 9",
                Section = "A",
                RollNumber = "5",
                Status = "active",
                Gender = "male",
                DateOfBirth = new DateTime(2010, 4, 10),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Students.Add(student);

            _context.FeeRecords.Add(new FeeRecord
            {
                Id = _feeRecordId,
                SchoolId = _schoolId,
                StudentId = _studentId,
                TotalAmount = 50000,
                PaidAmount = 20000,
                DiscountAmount = 0,
                LateFeeAmount = 0,
                PendingAmount = 30000,
                Status = "partial",
                DueDate = DateTime.UtcNow.AddDays(30),
                AcademicYear = "2025-2026",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });

            _context.FeeRecords.Add(new FeeRecord
            {
                Id = _paidFeeRecordId,
                SchoolId = _schoolId,
                StudentId = _studentId,
                TotalAmount = 10000,
                PaidAmount = 10000,
                DiscountAmount = 0,
                LateFeeAmount = 0,
                PendingAmount = 0,
                Status = "paid",
                DueDate = DateTime.UtcNow.AddDays(-30),
                AcademicYear = "2024-2025",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
        }

        // =====================================================================
        // InitiatePaymentAsync Tests
        // =====================================================================

        [Fact]
        public async Task InitiatePayment_CreatesTransactionAndGatewayLog()
        {
            var dto = new InitiatePaymentDto
            {
                Amount = 15000,
                Gateway = "razorpay",
                Currency = "INR"
            };

            await _service.InitiatePaymentAsync(_schoolId, _feeRecordId, dto);

            var transaction = await _context.PaymentTransactions.FirstOrDefaultAsync(t => t.FeeRecordId == _feeRecordId);
            transaction.Should().NotBeNull();
            transaction!.Amount.Should().Be(15000);
            transaction.Status.Should().Be("pending");

            var log = await _context.PaymentGatewayLogs.FirstOrDefaultAsync(l => l.FeeRecordId == _feeRecordId);
            log.Should().NotBeNull();
            log!.Gateway.Should().Be("razorpay");
            log.Status.Should().Be("created");
        }

        [Fact]
        public async Task InitiatePayment_ThrowsKeyNotFound_WhenFeeRecordMissing()
        {
            var dto = new InitiatePaymentDto { Amount = 10000, Gateway = "razorpay", Currency = "INR" };

            Func<Task> act = () => _service.InitiatePaymentAsync(_schoolId, Guid.NewGuid(), dto);

            await act.Should().ThrowAsync<KeyNotFoundException>()
                .WithMessage("*Fee record not found*");
        }

        [Fact]
        public async Task InitiatePayment_ThrowsInvalidOp_WhenFeeAlreadyPaid()
        {
            var dto = new InitiatePaymentDto { Amount = 10000, Gateway = "razorpay", Currency = "INR" };

            Func<Task> act = () => _service.InitiatePaymentAsync(_schoolId, _paidFeeRecordId, dto);

            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*already paid*");
        }

        [Fact]
        public async Task InitiatePayment_ThrowsKeyNotFound_WhenWrongSchool()
        {
            var dto = new InitiatePaymentDto { Amount = 10000, Gateway = "razorpay", Currency = "INR" };

            // Pass a different schoolId - fee record belongs to _schoolId not _otherSchoolId
            Func<Task> act = () => _service.InitiatePaymentAsync(_otherSchoolId, _feeRecordId, dto);

            await act.Should().ThrowAsync<KeyNotFoundException>();
        }

        [Fact]
        public async Task InitiatePayment_ReturnsCorrectOrderId_WithGatewayPrefix()
        {
            var dto = new InitiatePaymentDto { Amount = 25000, Gateway = "payu", Currency = "INR" };

            var response = await _service.InitiatePaymentAsync(_schoolId, _feeRecordId, dto);

            response.OrderId.Should().StartWith("PAYU-");
        }

        [Fact]
        public async Task InitiatePayment_ReturnsOrderId_ContainingSchoolIdPrefix()
        {
            var dto = new InitiatePaymentDto { Amount = 25000, Gateway = "razorpay", Currency = "INR" };

            var response = await _service.InitiatePaymentAsync(_schoolId, _feeRecordId, dto);

            response.OrderId.Should().Contain(_schoolId.ToString().Substring(0, 8));
        }

        [Fact]
        public async Task InitiatePayment_Razorpay_IncludesCheckoutUrl()
        {
            var dto = new InitiatePaymentDto { Amount = 15000, Gateway = "razorpay", Currency = "INR" };

            var response = await _service.InitiatePaymentAsync(_schoolId, _feeRecordId, dto);

            response.CheckoutUrl.Should().Contain("razorpay");
        }

        [Fact]
        public async Task InitiatePayment_ReturnsMetadataWithFeeRecordId()
        {
            var dto = new InitiatePaymentDto { Amount = 15000, Gateway = "razorpay", Currency = "INR" };

            var response = await _service.InitiatePaymentAsync(_schoolId, _feeRecordId, dto);

            response.Metadata.Should().ContainKey("fee_record_id");
            response.Metadata["fee_record_id"].Should().Be(_feeRecordId.ToString());
        }

        [Fact]
        public async Task InitiatePayment_ReturnsMetadataWithStudentName()
        {
            var dto = new InitiatePaymentDto { Amount = 15000, Gateway = "razorpay", Currency = "INR" };

            var response = await _service.InitiatePaymentAsync(_schoolId, _feeRecordId, dto);

            response.Metadata.Should().ContainKey("student_name");
            response.Metadata["student_name"].Should().Be("Arjun");
        }

        [Fact]
        public async Task InitiatePayment_GatewayLogOrderId_MatchesResponseOrderId()
        {
            var dto = new InitiatePaymentDto { Amount = 20000, Gateway = "razorpay", Currency = "INR" };

            var response = await _service.InitiatePaymentAsync(_schoolId, _feeRecordId, dto);

            var log = await _context.PaymentGatewayLogs
                .FirstOrDefaultAsync(l => l.FeeRecordId == _feeRecordId);

            log!.GatewayOrderId.Should().Be(response.OrderId);
        }

        // =====================================================================
        // GetFeeRecordsAsync (Parent-facing: fetch fees for a child)
        // =====================================================================

        [Fact]
        public async Task GetFeeRecords_FiltersByStudentId_ReturnsOnlyThatStudentsRecords()
        {
            var otherStudentId = Guid.NewGuid();
            _context.Students.Add(new Student
            {
                Id = otherStudentId, SchoolId = _schoolId, Name = "Other Child",
                AdmissionNumber = "ADM-002", Class = "Class 7", Section = "B",
                Status = "active", Gender = "female", DateOfBirth = new DateTime(2012, 1, 1),
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            });
            _context.FeeRecords.Add(new FeeRecord
            {
                Id = Guid.NewGuid(), SchoolId = _schoolId, StudentId = otherStudentId,
                TotalAmount = 40000, PaidAmount = 0, PendingAmount = 40000,
                Status = "pending", DueDate = DateTime.UtcNow.AddDays(10),
                AcademicYear = "2025-2026", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            var result = await _service.GetFeeRecordsAsync(_schoolId, 1, 50, _studentId, null);

            result.Should().NotBeNull();
            result.FeeRecords.Should().AllSatisfy(r => r.StudentId.Should().Be(_studentId));
        }

        [Fact]
        public async Task GetFeeRecords_ExcludesOtherSchoolRecords()
        {
            var otherStudentId = Guid.NewGuid();
            _context.Students.Add(new Student
            {
                Id = otherStudentId, SchoolId = _otherSchoolId, Name = "Other School Child",
                AdmissionNumber = "ADM-OTHER", Class = "Class 5", Section = "A",
                Status = "active", Gender = "male", DateOfBirth = new DateTime(2013, 1, 1),
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            });
            _context.FeeRecords.Add(new FeeRecord
            {
                Id = Guid.NewGuid(), SchoolId = _otherSchoolId, StudentId = otherStudentId,
                TotalAmount = 30000, PaidAmount = 0, PendingAmount = 30000,
                Status = "pending", DueDate = DateTime.UtcNow.AddDays(5),
                AcademicYear = "2025-2026", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            var result = await _service.GetFeeRecordsAsync(_schoolId, 1, 50, null, null);

            result.FeeRecords.Should().AllSatisfy(r => r.SchoolId.Should().Be(_schoolId));
        }

        [Fact]
        public async Task GetFeeRecords_FiltersByStatus_ReturnsPaidRecordsOnly()
        {
            var result = await _service.GetFeeRecordsAsync(_schoolId, 1, 50, _studentId, "paid");

            result.FeeRecords.Should().HaveCount(1);
            result.FeeRecords[0].Status.Should().Be("paid");
        }

        [Fact]
        public async Task GetFeeRecords_ReturnsTotalCount_CorrectlyForPagination()
        {
            var result = await _service.GetFeeRecordsAsync(_schoolId, 1, 1, _studentId, null);

            result.Total.Should().Be(2); // 2 seeded for _studentId
            result.FeeRecords.Should().HaveCount(1); // page size = 1
        }
    }
}
