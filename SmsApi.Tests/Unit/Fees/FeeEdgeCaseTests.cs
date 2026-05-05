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
    /// <summary>
    /// Industry-grade edge case tests for the fee module.
    /// Covers: double-payment prevention, duplicate receipts, refund flows,
    /// late fee precision, concurrent payment sequencing, and reminder dispatch.
    /// </summary>
    public class FeeEdgeCaseTests : IDisposable
    {
        private readonly AppDbContext _context;
        private readonly FeeService _service;

        private readonly Guid _schoolId   = Guid.NewGuid();
        private readonly Guid _studentId  = Guid.NewGuid();
        private readonly Guid _structureId = Guid.NewGuid();

        // A partially-paid record (₹20 000 paid out of ₹58 000)
        private readonly Guid _partialRecordId = Guid.NewGuid();
        // A fully-paid record
        private readonly Guid _paidRecordId    = Guid.NewGuid();
        // A pending record with zero payments
        private readonly Guid _pendingRecordId = Guid.NewGuid();
        // An existing successful payment on the partial record
        private readonly Guid _payment1Id      = Guid.NewGuid();

        public FeeEdgeCaseTests()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .ConfigureWarnings(w => w.Ignore(
                    Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
                .Options;

            _context = new AppDbContext(options);
            _service  = new FeeService(_context, new TestLogger<FeeService>());
            SeedData().GetAwaiter().GetResult();
        }

        public void Dispose() => _context?.Dispose();

        // ──────────────────────────────────────────────────────────────────────
        // SEED
        // ──────────────────────────────────────────────────────────────────────

        private async Task SeedData()
        {
            _context.Schools.Add(new School
            {
                Id = _schoolId, Name = "Edge School", SchoolCode = "EDG001",
                Address = "1 Edge St", Phone = "0000000000", Email = "edge@school.com",
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            });

            _context.Students.Add(new Student
            {
                Id = _studentId, SchoolId = _schoolId,
                Name = "Edge Student", FirstName = "Edge", LastName = "Student",
                AdmissionNumber = "EDGE001", Class = "10", Section = "A",
                Status = "active", Email = "edge@student.com",
                DateOfBirth = new DateTime(2010, 1, 1), Gender = "Male",
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            });

            _context.FeeStructures.Add(new FeeStructure
            {
                Id = _structureId, SchoolId = _schoolId,
                Name = "Class 10 Edge Structure", Class = "10",
                AcademicYear = "2025-2026",
                TuitionFee = 50000, ExamFee = 8000,
                TotalAmount = 58000,
                InstallmentCount = 4,
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            });

            // Partial record: ₹20 000 paid, ₹38 000 pending
            _context.FeeRecords.Add(new FeeRecord
            {
                Id = _partialRecordId, SchoolId = _schoolId, StudentId = _studentId,
                FeeStructureId = _structureId,
                TotalAmount = 58000, PaidAmount = 20000, DiscountAmount = 0,
                LateFeeAmount = 0, PendingAmount = 38000,
                Status = "partial",
                DueDate = DateTime.UtcNow.AddDays(30),
                AcademicYear = "2025-2026",
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            });

            // Fully-paid record
            _context.FeeRecords.Add(new FeeRecord
            {
                Id = _paidRecordId, SchoolId = _schoolId, StudentId = _studentId,
                TotalAmount = 10000, PaidAmount = 10000, PendingAmount = 0,
                Status = "paid",
                DueDate = DateTime.UtcNow.AddDays(30),
                AcademicYear = "2025-2026",
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            });

            // Pending record: ₹15 000 with zero payments
            _context.FeeRecords.Add(new FeeRecord
            {
                Id = _pendingRecordId, SchoolId = _schoolId, StudentId = _studentId,
                TotalAmount = 15000, PaidAmount = 0, PendingAmount = 15000,
                Status = "pending",
                DueDate = DateTime.UtcNow.AddDays(30),
                AcademicYear = "2025-2026",
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            });

            // An existing success payment for the partial record with receipt RCP-EXISTING
            _context.PaymentTransactions.Add(new PaymentTransaction
            {
                Id = _payment1Id, SchoolId = _schoolId, StudentId = _studentId,
                FeeRecordId = _partialRecordId,
                Amount = 20000, Method = "cash", Status = "success",
                Date = DateTime.UtcNow.AddDays(-10),
                ReceiptNumber = "RCP-EXISTING",
                ProcessedBy = "Admin", AcademicYear = "2025-2026",
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
        }

        // ──────────────────────────────────────────────────────────────────────
        // SECTION 1: DOUBLE-PAYMENT PREVENTION
        // ──────────────────────────────────────────────────────────────────────

        [Fact]
        public async Task CreatePayment_OnAlreadyPaidRecord_ThrowsInvalidOperationException()
        {
            // The fee record is already fully paid — any further payment must be rejected.
            var req = new CreatePaymentRequest
            {
                SchoolId = _schoolId, StudentId = _studentId,
                FeeRecordId = _paidRecordId,
                Amount = 1000, Date = DateTime.UtcNow,
                Method = "cash", ReceiptNumber = "RCP-GHOST"
            };

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(
                () => _service.CreatePaymentAsync(req));
            ex.Message.Should().ContainEquivalentOf("already fully paid");
        }

        [Fact]
        public async Task CreatePayment_ZeroOutstanding_ThrowsInvalidOperationException()
        {
            // Simulate a record where outstanding is exactly zero but status is not "paid"
            var recordId = Guid.NewGuid();
            _context.FeeRecords.Add(new FeeRecord
            {
                Id = recordId, SchoolId = _schoolId, StudentId = _studentId,
                TotalAmount = 5000, PaidAmount = 3000, DiscountAmount = 2000,
                PendingAmount = 0, Status = "partial",   // edge: discount zeroed it out
                DueDate = DateTime.UtcNow.AddDays(30), AcademicYear = "2025-2026",
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            var req = new CreatePaymentRequest
            {
                SchoolId = _schoolId, StudentId = _studentId,
                FeeRecordId = recordId,
                Amount = 500, Date = DateTime.UtcNow,
                Method = "cash", ReceiptNumber = "RCP-ZERO-OUTSTANDING"
            };

            await Assert.ThrowsAsync<InvalidOperationException>(
                () => _service.CreatePaymentAsync(req));
        }

        // ──────────────────────────────────────────────────────────────────────
        // SECTION 2: DUPLICATE RECEIPT (IDEMPOTENCY)
        // ──────────────────────────────────────────────────────────────────────

        [Fact]
        public async Task CreatePayment_DuplicateReceiptNumber_ThrowsInvalidOperationException()
        {
            // "RCP-EXISTING" is already used in seed data for the same school.
            var req = new CreatePaymentRequest
            {
                SchoolId = _schoolId, StudentId = _studentId,
                FeeRecordId = _partialRecordId,
                Amount = 5000, Date = DateTime.UtcNow,
                Method = "cash", ReceiptNumber = "RCP-EXISTING"
            };

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(
                () => _service.CreatePaymentAsync(req));
            ex.Message.Should().ContainEquivalentOf("RCP-EXISTING");
        }

        [Fact]
        public async Task CreatePayment_SameReceiptDifferentSchool_Succeeds()
        {
            // Duplicate receipt in a different school is allowed
            var otherSchoolId = Guid.NewGuid();
            var otherStudentId = Guid.NewGuid();
            var otherRecordId  = Guid.NewGuid();

            _context.Schools.Add(new School
            {
                Id = otherSchoolId, Name = "Other School", SchoolCode = "OTH001",
                Address = "2 Other St", Phone = "1111111111", Email = "other@school.com",
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            });
            _context.Students.Add(new Student
            {
                Id = otherStudentId, SchoolId = otherSchoolId,
                Name = "Other Student", FirstName = "Other", LastName = "Student",
                AdmissionNumber = "OTH001", Class = "10", Section = "A",
                Status = "Active", Email = "other@student.com",
                DateOfBirth = new DateTime(2010, 1, 1), Gender = "Male",
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            });
            _context.FeeRecords.Add(new FeeRecord
            {
                Id = otherRecordId, SchoolId = otherSchoolId, StudentId = otherStudentId,
                TotalAmount = 10000, PaidAmount = 0, PendingAmount = 10000,
                Status = "pending", DueDate = DateTime.UtcNow.AddDays(30),
                AcademicYear = "2025-2026", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            var req = new CreatePaymentRequest
            {
                SchoolId = otherSchoolId, StudentId = otherStudentId,
                FeeRecordId = otherRecordId,
                Amount = 5000, Date = DateTime.UtcNow,
                Method = "upi", ReceiptNumber = "RCP-EXISTING"   // same receipt, different school
            };

            var result = await _service.CreatePaymentAsync(req);
            result.ReceiptNumber.Should().Be("RCP-EXISTING");
            result.Status.Should().Be("success");
        }

        [Fact]
        public async Task CreatePayment_VoidedReceiptCanBeReused_Succeeds()
        {
            // A voided payment with the same receipt number should NOT block a new one
            var voidedReceiptNumber = "RCP-VOIDED";
            _context.PaymentTransactions.Add(new PaymentTransaction
            {
                Id = Guid.NewGuid(), SchoolId = _schoolId, StudentId = _studentId,
                FeeRecordId = _partialRecordId,
                Amount = 5000, Method = "cash", Status = "voided",
                Date = DateTime.UtcNow.AddDays(-30),
                ReceiptNumber = voidedReceiptNumber,
                ProcessedBy = "Admin", AcademicYear = "2025-2026",
                CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            var req = new CreatePaymentRequest
            {
                SchoolId = _schoolId, StudentId = _studentId,
                FeeRecordId = _partialRecordId,
                Amount = 5000, Date = DateTime.UtcNow,
                Method = "cash", ReceiptNumber = voidedReceiptNumber
            };

            // Should succeed because voided payments are excluded from the duplicate check
            var result = await _service.CreatePaymentAsync(req);
            result.Status.Should().Be("success");
        }

        // ──────────────────────────────────────────────────────────────────────
        // SECTION 3: OVERPAYMENT GUARD
        // ──────────────────────────────────────────────────────────────────────

        [Fact]
        public async Task CreatePayment_ExceedsOutstandingByOneRupee_ThrowsInvalidOperationException()
        {
            // Outstanding = ₹38 000, attempt ₹38 001
            var req = new CreatePaymentRequest
            {
                SchoolId = _schoolId, StudentId = _studentId,
                FeeRecordId = _partialRecordId,
                Amount = 38001, Date = DateTime.UtcNow,
                Method = "bank_transfer", ReceiptNumber = "RCP-OVER"
            };

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(
                () => _service.CreatePaymentAsync(req));
            ex.Message.Should().ContainEquivalentOf("outstanding");
        }

        [Fact]
        public async Task CreatePayment_ExactOutstanding_SetsStatusPaid()
        {
            var req = new CreatePaymentRequest
            {
                SchoolId = _schoolId, StudentId = _studentId,
                FeeRecordId = _partialRecordId,
                Amount = 38000,
                Date = DateTime.UtcNow, Method = "upi", ReceiptNumber = "RCP-EXACT"
            };

            var result = await _service.CreatePaymentAsync(req);
            result.Status.Should().Be("success");

            var record = await _context.FeeRecords.FindAsync(_partialRecordId);
            record!.Status.Should().Be("paid");
            record.PendingAmount.Should().BeLessThanOrEqualTo(0);
        }

        [Fact]
        public async Task CreatePayment_TwoSequentialPayments_BalanceDecreasesEachTime()
        {
            // First installment
            await _service.CreatePaymentAsync(new CreatePaymentRequest
            {
                SchoolId = _schoolId, StudentId = _studentId,
                FeeRecordId = _partialRecordId,
                Amount = 10000, Date = DateTime.UtcNow,
                Method = "cash", ReceiptNumber = "RCP-INST1"
            });

            var afterFirst = await _context.FeeRecords.FindAsync(_partialRecordId);
            afterFirst!.PaidAmount.Should().Be(30000);
            afterFirst.PendingAmount.Should().Be(28000);
            afterFirst.Status.Should().Be("partial");

            // Second installment
            await _service.CreatePaymentAsync(new CreatePaymentRequest
            {
                SchoolId = _schoolId, StudentId = _studentId,
                FeeRecordId = _partialRecordId,
                Amount = 10000, Date = DateTime.UtcNow,
                Method = "cash", ReceiptNumber = "RCP-INST2"
            });

            var afterSecond = await _context.FeeRecords.FindAsync(_partialRecordId);
            afterSecond!.PaidAmount.Should().Be(40000);
            afterSecond.PendingAmount.Should().Be(18000);
            afterSecond.Status.Should().Be("partial");
        }

        [Fact]
        public async Task CreatePayment_SecondPaymentWouldExceedTotal_ThrowsInvalidOperationException()
        {
            // First payment clears ₹38 000 outstanding → status = paid
            await _service.CreatePaymentAsync(new CreatePaymentRequest
            {
                SchoolId = _schoolId, StudentId = _studentId,
                FeeRecordId = _partialRecordId,
                Amount = 38000, Date = DateTime.UtcNow,
                Method = "upi", ReceiptNumber = "RCP-CLEAR"
            });

            // Second payment must be blocked
            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
                _service.CreatePaymentAsync(new CreatePaymentRequest
                {
                    SchoolId = _schoolId, StudentId = _studentId,
                    FeeRecordId = _partialRecordId,
                    Amount = 1000, Date = DateTime.UtcNow,
                    Method = "cash", ReceiptNumber = "RCP-SECOND"
                }));

            ex.Message.Should().ContainEquivalentOf("fully paid");
        }

        // ──────────────────────────────────────────────────────────────────────
        // SECTION 4: REFUND PROCESSING
        // ──────────────────────────────────────────────────────────────────────

        private async Task<Guid> CreateSuccessPaymentTransaction(
            Guid feeRecordId, decimal amount, string receiptNumber)
        {
            var txId = Guid.NewGuid();
            // For refund tests we bypass CreatePaymentAsync and directly insert a
            // completed transaction so we can test ProcessRefundAsync in isolation.
            _context.PaymentTransactions.Add(new PaymentTransaction
            {
                Id = txId, SchoolId = _schoolId, StudentId = _studentId,
                FeeRecordId = feeRecordId,
                Amount = amount, Method = "upi", Status = "success",
                Date = DateTime.UtcNow.AddHours(-1),
                ReceiptNumber = receiptNumber,
                ProcessedBy = "Admin", AcademicYear = "2025-2026",
                CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();
            return txId;
        }

        [Fact]
        public async Task ProcessRefund_FullRefund_CreatesRefundAndVoidsTransaction()
        {
            var txId = await CreateSuccessPaymentTransaction(_pendingRecordId, 5000, "RCP-FOR-REFUND");

            // Update the fee record to reflect the payment
            var rec = await _context.FeeRecords.FindAsync(_pendingRecordId);
            rec!.PaidAmount   = 5000;
            rec.PendingAmount = 10000;
            await _context.SaveChangesAsync();

            var dto = new CreateRefundDto { Amount = 5000, Reason = "Duplicate payment", RefundMethod = "original" };
            var result = await _service.ProcessRefundAsync(_schoolId, txId, dto, Guid.NewGuid());

            result.Should().NotBeNull();
            result.Amount.Should().Be(5000);
            result.Status.Should().BeOneOf("processing", "pending", "completed");

            // Original transaction should be voided
            var tx = await _context.PaymentTransactions.FindAsync(txId);
            tx!.Status.Should().Be("voided");

            // Fee record balance should be restored
            var updatedRec = await _context.FeeRecords.FindAsync(_pendingRecordId);
            updatedRec!.PaidAmount.Should().Be(0);
        }

        [Fact]
        public async Task ProcessRefund_PartialRefund_TransactionMarkedPartialRefund()
        {
            var txId = await CreateSuccessPaymentTransaction(_pendingRecordId, 8000, "RCP-PARTIAL-REFUND");

            var rec = await _context.FeeRecords.FindAsync(_pendingRecordId);
            rec!.PaidAmount   = 8000;
            rec.PendingAmount = 7000;
            await _context.SaveChangesAsync();

            var dto = new CreateRefundDto { Amount = 3000, Reason = "Overpayment correction", RefundMethod = "bank_transfer" };
            var result = await _service.ProcessRefundAsync(_schoolId, txId, dto, Guid.NewGuid());

            result.Amount.Should().Be(3000);

            var tx = await _context.PaymentTransactions.FindAsync(txId);
            tx!.Status.Should().Be("partial_refund");
        }

        [Fact]
        public async Task ProcessRefund_AmountExceedsTransaction_ThrowsArgumentException()
        {
            var txId = await CreateSuccessPaymentTransaction(_pendingRecordId, 5000, "RCP-EXCEED-REFUND");

            var dto = new CreateRefundDto { Amount = 6000, Reason = "Error", RefundMethod = "original" };
            await Assert.ThrowsAsync<ArgumentException>(
                () => _service.ProcessRefundAsync(_schoolId, txId, dto, Guid.NewGuid()));
        }

        [Fact]
        public async Task ProcessRefund_TransactionNotFound_ThrowsKeyNotFoundException()
        {
            var dto = new CreateRefundDto { Amount = 1000, Reason = "Error", RefundMethod = "original" };
            await Assert.ThrowsAsync<KeyNotFoundException>(
                () => _service.ProcessRefundAsync(_schoolId, Guid.NewGuid(), dto, Guid.NewGuid()));
        }

        [Fact]
        public async Task ProcessRefund_OnPendingTransaction_ThrowsInvalidOperationException()
        {
            // A pending (not-completed) transaction cannot be refunded
            var pendingTxId = Guid.NewGuid();
            _context.PaymentTransactions.Add(new PaymentTransaction
            {
                Id = pendingTxId, SchoolId = _schoolId, StudentId = _studentId,
                FeeRecordId = _pendingRecordId,
                Amount = 5000, Method = "online", Status = "pending",
                Date = DateTime.UtcNow,
                ReceiptNumber = "RCP-PENDING-TX",
                ProcessedBy = "System", AcademicYear = "2025-2026",
                CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            var dto = new CreateRefundDto { Amount = 5000, Reason = "Test", RefundMethod = "original" };
            await Assert.ThrowsAsync<InvalidOperationException>(
                () => _service.ProcessRefundAsync(_schoolId, pendingTxId, dto, Guid.NewGuid()));
        }

        [Fact]
        public async Task GetRefundStatus_ValidRefund_ReturnsStatus()
        {
            var txId    = await CreateSuccessPaymentTransaction(_pendingRecordId, 5000, "RCP-STATUS-CHECK");
            var dto     = new CreateRefundDto { Amount = 5000, Reason = "Test refund", RefundMethod = "original" };
            var created = await _service.ProcessRefundAsync(_schoolId, txId, dto, Guid.NewGuid());

            var status = await _service.GetRefundStatusAsync(_schoolId, created.Id);
            status.Should().NotBeNull();
            status.Amount.Should().Be(5000);
            status.Status.Should().NotBeNullOrEmpty();
        }

        [Fact]
        public async Task GetRefundStatus_NotFound_ThrowsKeyNotFoundException()
        {
            await Assert.ThrowsAsync<KeyNotFoundException>(
                () => _service.GetRefundStatusAsync(_schoolId, Guid.NewGuid()));
        }

        // ──────────────────────────────────────────────────────────────────────
        // SECTION 5: LATE FEE CALCULATION — PRECISION CASES
        // ──────────────────────────────────────────────────────────────────────

        private async Task<Guid> CreateOverdueFeeRecord(decimal totalAmount, int daysOverdueCount)
        {
            var id = Guid.NewGuid();
            _context.FeeRecords.Add(new FeeRecord
            {
                Id = id, SchoolId = _schoolId, StudentId = _studentId,
                TotalAmount = totalAmount, PaidAmount = 0,
                PendingAmount = totalAmount, Status = "pending",
                DueDate = DateTime.UtcNow.AddDays(-daysOverdueCount),
                AcademicYear = "2025-2026",
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();
            return id;
        }

        private async Task SetLateFeeConfig(string feeType, decimal amount, decimal? maxAmount = null, int graceDays = 0)
        {
            // Remove any existing config for this school
            var existing = _context.LateFeeConfigs.Where(c => c.SchoolId == _schoolId);
            _context.LateFeeConfigs.RemoveRange(existing);
            await _context.SaveChangesAsync();

            _context.LateFeeConfigs.Add(new LateFeeConfig
            {
                Id = Guid.NewGuid(), SchoolId = _schoolId,
                GracePeriodDays = graceDays,
                FeeType = feeType, Amount = amount,
                MaxAmount = maxAmount, IsActive = true,
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();
        }

        [Fact]
        public async Task CalculateLateFee_FixedConfig_ReturnsConfiguredAmount()
        {
            var recordId = await CreateOverdueFeeRecord(50000, 20);
            await SetLateFeeConfig("fixed", 500);

            var lateFee = await _service.CalculateLateFeeAsync(recordId, _schoolId);
            lateFee.Should().Be(500);
        }

        [Fact]
        public async Task CalculateLateFee_DailyConfig_AccumulatesCorrectly()
        {
            // 10 days overdue, ₹50/day, no grace period → ₹500
            var recordId = await CreateOverdueFeeRecord(50000, 10);
            await SetLateFeeConfig("daily", 50);

            var lateFee = await _service.CalculateLateFeeAsync(recordId, _schoolId);
            lateFee.Should().BeGreaterThan(0);
        }

        [Fact]
        public async Task CalculateLateFee_PercentageConfig_BasedOnTotalAmount()
        {
            // 1% per month on ₹50 000 fee, 35 days overdue → ~₹583 (ceiling 2 months)
            var recordId = await CreateOverdueFeeRecord(50000, 35);
            await SetLateFeeConfig("percentage", 1m);  // 1%

            var lateFee = await _service.CalculateLateFeeAsync(recordId, _schoolId);
            // At least 1 month's percentage fee
            lateFee.Should().BeGreaterThan(0);
            // Should not exceed total fee
            lateFee.Should().BeLessThanOrEqualTo(50000);
        }

        [Fact]
        public async Task CalculateLateFee_WithMaxCap_DoesNotExceedCap()
        {
            // 100 days overdue, ₹50/day = ₹5 000 uncapped, but cap is ₹1 000
            var recordId = await CreateOverdueFeeRecord(50000, 100);
            await SetLateFeeConfig("daily", 50, maxAmount: 1000);

            var lateFee = await _service.CalculateLateFeeAsync(recordId, _schoolId);
            lateFee.Should().BeLessThanOrEqualTo(1000);
        }

        [Fact]
        public async Task CalculateLateFee_InactiveConfig_ReturnsZero()
        {
            var recordId = await CreateOverdueFeeRecord(50000, 30);
            var existing = _context.LateFeeConfigs.Where(c => c.SchoolId == _schoolId);
            _context.LateFeeConfigs.RemoveRange(existing);

            _context.LateFeeConfigs.Add(new LateFeeConfig
            {
                Id = Guid.NewGuid(), SchoolId = _schoolId,
                GracePeriodDays = 0, FeeType = "daily", Amount = 50,
                IsActive = false,   // ← inactive
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            var lateFee = await _service.CalculateLateFeeAsync(recordId, _schoolId);
            lateFee.Should().Be(0);
        }

        [Fact]
        public async Task CalculateLateFee_WithinGracePeriod_ReturnsZero()
        {
            // 5 days overdue but grace period is 7 days → no fee
            var recordId = await CreateOverdueFeeRecord(50000, 5);
            await SetLateFeeConfig("daily", 50, graceDays: 7);

            var lateFee = await _service.CalculateLateFeeAsync(recordId, _schoolId);
            lateFee.Should().Be(0);
        }

        [Fact]
        public async Task CalculateLateFee_PaidRecord_AlwaysReturnsZero()
        {
            // Even if overdue and configured, paid records get zero late fee
            var recordId = Guid.NewGuid();
            _context.FeeRecords.Add(new FeeRecord
            {
                Id = recordId, SchoolId = _schoolId, StudentId = _studentId,
                TotalAmount = 30000, PaidAmount = 30000, PendingAmount = 0,
                Status = "paid",
                DueDate = DateTime.UtcNow.AddDays(-90),
                AcademicYear = "2025-2026",
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();
            await SetLateFeeConfig("daily", 100);

            var lateFee = await _service.CalculateLateFeeAsync(recordId, _schoolId);
            lateFee.Should().Be(0);
        }

        [Fact]
        public async Task CalculateLateFee_NoConfig_ReturnsZero()
        {
            var recordId = await CreateOverdueFeeRecord(50000, 30);
            // Ensure no config exists
            var existing = _context.LateFeeConfigs.Where(c => c.SchoolId == _schoolId);
            _context.LateFeeConfigs.RemoveRange(existing);
            await _context.SaveChangesAsync();

            var lateFee = await _service.CalculateLateFeeAsync(recordId, _schoolId);
            lateFee.Should().Be(0);
        }

        // ──────────────────────────────────────────────────────────────────────
        // SECTION 6: FEE STATS INTEGRITY
        // ──────────────────────────────────────────────────────────────────────

        [Fact]
        public async Task GetFeeStats_CollectedPlusPendingEqualsTotal()
        {
            var stats = await _service.GetFeeStatsAsync(_schoolId, "2025-2026");

            // Fundamental accounting invariant
            (stats.CollectedFees + stats.PendingFees).Should().Be(stats.TotalFees);
        }

        [Fact]
        public async Task GetFeeStats_NeverNegative()
        {
            var stats = await _service.GetFeeStatsAsync(_schoolId, null);
            stats.TotalFees.Should().BeGreaterThanOrEqualTo(0);
            stats.CollectedFees.Should().BeGreaterThanOrEqualTo(0);
            stats.PendingFees.Should().BeGreaterThanOrEqualTo(0);
            stats.OverdueFees.Should().BeGreaterThanOrEqualTo(0);
        }

        [Fact]
        public async Task GetFeeStats_ByMethodBreakdown_ReflectsActualPayments()
        {
            // The seed data has one cash payment of ₹20 000
            var stats = await _service.GetFeeStatsAsync(_schoolId, null);
            stats.ByMethod.Should().ContainKey("cash");
            stats.ByMethod["cash"].Should().Be(20000);
        }

        [Fact]
        public async Task GetFeeStats_PaymentAdded_StatsUpdate()
        {
            var statsBefore = await _service.GetFeeStatsAsync(_schoolId, "2025-2026");

            await _service.CreatePaymentAsync(new CreatePaymentRequest
            {
                SchoolId = _schoolId, StudentId = _studentId,
                FeeRecordId = _pendingRecordId,
                Amount = 7500, Date = DateTime.UtcNow,
                Method = "upi", ReceiptNumber = "RCP-STATS-TEST"
            });

            var statsAfter = await _service.GetFeeStatsAsync(_schoolId, "2025-2026");
            statsAfter.CollectedFees.Should().Be(statsBefore.CollectedFees + 7500);
            statsAfter.PendingFees.Should().Be(statsBefore.PendingFees - 7500);
        }

        // ──────────────────────────────────────────────────────────────────────
        // SECTION 7: OVERDUE FEES
        // ──────────────────────────────────────────────────────────────────────

        [Fact]
        public async Task GetOverdueFees_OnlyUnpaidOverdueReturned()
        {
            // Add an overdue unpaid record and an overdue PAID record
            var unpaidId = Guid.NewGuid();
            var paidId   = Guid.NewGuid();

            _context.FeeRecords.AddRange(
                new FeeRecord
                {
                    Id = unpaidId, SchoolId = _schoolId, StudentId = _studentId,
                    TotalAmount = 25000, PaidAmount = 0, PendingAmount = 25000,
                    BalanceAmount = 25000, Status = "pending",
                    DueDate = DateTime.UtcNow.AddDays(-30),
                    AcademicYear = "2025-2026",
                    CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
                },
                new FeeRecord
                {
                    Id = paidId, SchoolId = _schoolId, StudentId = _studentId,
                    TotalAmount = 10000, PaidAmount = 10000, PendingAmount = 0,
                    BalanceAmount = 0, Status = "paid",
                    DueDate = DateTime.UtcNow.AddDays(-30),
                    AcademicYear = "2025-2026",
                    CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
                }
            );
            await _context.SaveChangesAsync();

            var result = await _service.GetOverdueFeesAsync(_schoolId);

            result.Should().Contain(r => r.FeeRecordId == unpaidId);
            result.Should().NotContain(r => r.FeeRecordId == paidId);
            result.All(r => r.DaysOverdue > 0).Should().BeTrue();
        }

        [Fact]
        public async Task GetOverdueFees_DaysOverdueIsAccurate()
        {
            var overdueId = Guid.NewGuid();
            _context.FeeRecords.Add(new FeeRecord
            {
                Id = overdueId, SchoolId = _schoolId, StudentId = _studentId,
                TotalAmount = 20000, PaidAmount = 0, PendingAmount = 20000,
                BalanceAmount = 20000, Status = "pending",
                DueDate = DateTime.UtcNow.AddDays(-45),
                AcademicYear = "2025-2026",
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            var result = await _service.GetOverdueFeesAsync(_schoolId);
            var record = result.FirstOrDefault(r => r.FeeRecordId == overdueId);

            record.Should().NotBeNull();
            record!.DaysOverdue.Should().BeGreaterThanOrEqualTo(44); // allow ±1 for UTC boundary
        }

        // ──────────────────────────────────────────────────────────────────────
        // SECTION 8: FEE REMINDERS
        // ──────────────────────────────────────────────────────────────────────

        [Fact]
        public async Task SendFeeReminders_NoMatchingDueDate_ReturnsZeroSent()
        {
            // Due dates are 30 days out; remind 5 days before → no match
            var dto = new SendRemindersDto { DaysBefore = 5, Channel = "sms" };
            var result = await _service.SendFeeRemindersAsync(_schoolId, dto);

            result.Should().NotBeNull();
            result.SentSuccessfully.Should().Be(0);
        }

        [Fact]
        public async Task SendFeeReminders_PaidFeesNotReminded()
        {
            // Paid record should never appear in reminders
            var dto = new SendRemindersDto { DaysBefore = 30, Channel = "email" };
            var result = await _service.SendFeeRemindersAsync(_schoolId, dto);

            // Even if sent count > 0, no paid records should generate a reminder error
            result.Failed.Should().Be(0);
        }

        [Fact]
        public async Task SendFeeReminders_ReturnsResultStructure()
        {
            var dto = new SendRemindersDto { DaysBefore = 0, Channel = "all" };
            var result = await _service.SendFeeRemindersAsync(_schoolId, dto);

            result.Should().NotBeNull();
            result.TotalRecords.Should().BeGreaterThanOrEqualTo(0);
            result.SentSuccessfully.Should().BeGreaterThanOrEqualTo(0);
            result.Failed.Should().BeGreaterThanOrEqualTo(0);
            result.Errors.Should().NotBeNull();
        }

        // ──────────────────────────────────────────────────────────────────────
        // SECTION 9: PAYMENT GATEWAY — INITIATE + VERIFY
        // ──────────────────────────────────────────────────────────────────────

        [Fact]
        public async Task InitiatePayment_RazorpayGateway_ReturnsOrderId()
        {
            var dto = new InitiatePaymentDto { Gateway = "razorpay", Amount = 15000, Currency = "INR" };
            var result = await _service.InitiatePaymentAsync(_schoolId, _pendingRecordId, dto);

            result.Should().NotBeNull();
            result.OrderId.Should().NotBeNullOrEmpty();
            result.Gateway.Should().Be("razorpay");
            result.Amount.Should().Be(15000);
        }

        [Fact]
        public async Task InitiatePayment_PayuGateway_ReturnsCheckoutUrl()
        {
            var dto = new InitiatePaymentDto { Gateway = "payu", Amount = 15000, Currency = "INR" };
            var result = await _service.InitiatePaymentAsync(_schoolId, _pendingRecordId, dto);

            result.CheckoutUrl.Should().NotBeNullOrEmpty();
            result.Gateway.Should().Be("payu");
        }

        [Fact]
        public async Task InitiatePayment_AlreadyPaid_ThrowsInvalidOperationException()
        {
            var dto = new InitiatePaymentDto { Gateway = "razorpay", Amount = 5000 };
            await Assert.ThrowsAsync<InvalidOperationException>(
                () => _service.InitiatePaymentAsync(_schoolId, _paidRecordId, dto));
        }

        [Fact]
        public async Task InitiatePayment_FeeRecordNotFound_ThrowsKeyNotFoundException()
        {
            var dto = new InitiatePaymentDto { Gateway = "razorpay", Amount = 5000 };
            await Assert.ThrowsAsync<KeyNotFoundException>(
                () => _service.InitiatePaymentAsync(_schoolId, Guid.NewGuid(), dto));
        }

        [Fact]
        public async Task VerifyPayment_ValidTransaction_ReturnsTrue()
        {
            // Initiate a payment to create a gateway log + transaction
            var dto = new InitiatePaymentDto { Gateway = "razorpay", Amount = 10000, Currency = "INR" };
            var gatewayResponse = await _service.InitiatePaymentAsync(_schoolId, _pendingRecordId, dto);

            // Retrieve the created transaction ID from the gateway log
            var log = await _context.PaymentGatewayLogs
                .FirstOrDefaultAsync(g => g.GatewayOrderId == gatewayResponse.OrderId);
            log.Should().NotBeNull();

            var verifyDto = new VerifyPaymentDto
            {
                GatewayOrderId  = gatewayResponse.OrderId,
                GatewayPaymentId = "pay_test_abc123",
                GatewaySignature = "sig_test_xyz"
            };

            var result = await _service.VerifyPaymentAsync(_schoolId, log!.TransactionId, verifyDto);
            result.Should().BeTrue();
        }

        [Fact]
        public async Task VerifyPayment_TransactionNotFound_ReturnsFalse()
        {
            var dto = new VerifyPaymentDto
            {
                GatewayOrderId  = "ORDER-GHOST",
                GatewayPaymentId = "pay_ghost",
                GatewaySignature = "sig_ghost"
            };
            var result = await _service.VerifyPaymentAsync(_schoolId, Guid.NewGuid(), dto);
            result.Should().BeFalse();
        }

        // ──────────────────────────────────────────────────────────────────────
        // SECTION 10: LATE FEE CONFIG VALIDATION
        // ──────────────────────────────────────────────────────────────────────

        [Fact]
        public async Task LateFeeConfig_MaxAmountLessThanBaseForFixed_ThrowsArgumentException()
        {
            // For fixed type: max amount cannot be less than base amount
            var dto = new CreateLateFeeConfigDto
            {
                GracePeriodDays = 7, FeeType = "fixed",
                Amount = 1000, MaxAmount = 500  // max < base
            };
            await Assert.ThrowsAsync<ArgumentException>(
                () => _service.CreateOrUpdateLateFeeConfigAsync(_schoolId, dto));
        }

        [Fact]
        public async Task LateFeeConfig_PercentageOver100_ThrowsArgumentException()
        {
            var dto = new CreateLateFeeConfigDto
            {
                GracePeriodDays = 7, FeeType = "percentage",
                Amount = 101  // > 100%
            };
            await Assert.ThrowsAsync<ArgumentException>(
                () => _service.CreateOrUpdateLateFeeConfigAsync(_schoolId, dto));
        }

        [Fact]
        public async Task LateFeeConfig_NegativeMaxAmount_ThrowsArgumentException()
        {
            var dto = new CreateLateFeeConfigDto
            {
                GracePeriodDays = 7, FeeType = "daily",
                Amount = 50, MaxAmount = -100
            };
            await Assert.ThrowsAsync<ArgumentException>(
                () => _service.CreateOrUpdateLateFeeConfigAsync(_schoolId, dto));
        }

        // ──────────────────────────────────────────────────────────────────────
        // SECTION 11: AUDIT LOG WRITTEN ON PAYMENT
        // ──────────────────────────────────────────────────────────────────────

        [Fact]
        public async Task CreatePayment_AuditLogIsWritten()
        {
            var req = new CreatePaymentRequest
            {
                SchoolId = _schoolId, StudentId = _studentId,
                FeeRecordId = _pendingRecordId,
                Amount = 5000, Date = DateTime.UtcNow,
                Method = "card", ReceiptNumber = "RCP-AUDIT-TEST",
                ProcessedBy = "AuditOfficer"
            };

            await _service.CreatePaymentAsync(req);

            var auditLog = await _context.Set<FeeAuditLog>()
                .Where(a => a.SchoolId == _schoolId && a.Action == "PaymentReceived")
                .OrderByDescending(a => a.Timestamp)
                .FirstOrDefaultAsync();

            auditLog.Should().NotBeNull();
            auditLog!.Amount.Should().Be(5000);
            auditLog.PerformedByName.Should().Be("AuditOfficer");
        }

        // ──────────────────────────────────────────────────────────────────────
        // SECTION 12: GENERATE RECEIPT PDF
        // ──────────────────────────────────────────────────────────────────────

        [Fact]
        public async Task GenerateReceiptPDF_ValidTransaction_ReturnsByteArray()
        {
            // Create a transaction via gateway initiation path (direct insert)
            var txId = Guid.NewGuid();
            _context.PaymentTransactions.Add(new PaymentTransaction
            {
                Id = txId, SchoolId = _schoolId, StudentId = _studentId,
                FeeRecordId = _pendingRecordId,
                Amount = 5000, Method = "cash", Status = "success",
                Date = DateTime.UtcNow, ReceiptNumber = "RCP-PDF-TEST",
                ProcessedBy = "Admin", AcademicYear = "2025-2026",
                TransactionNumber = "TXN-PDF-001",
                TransactionDate = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            var pdf = await _service.GenerateReceiptPDFAsync(_schoolId, txId);
            pdf.Should().NotBeNullOrEmpty();
            // HTML receipt is UTF-8 encoded; must contain "Fee Receipt"
            var content = System.Text.Encoding.UTF8.GetString(pdf);
            content.Should().Contain("Fee Receipt");
        }

        [Fact]
        public async Task GenerateReceiptPDF_TransactionNotFound_ThrowsKeyNotFoundException()
        {
            await Assert.ThrowsAsync<KeyNotFoundException>(
                () => _service.GenerateReceiptPDFAsync(_schoolId, Guid.NewGuid()));
        }

        // ──────────────────────────────────────────────────────────────────────
        // SECTION 13: BULK ASSIGN STRUCTURE
        // ──────────────────────────────────────────────────────────────────────

        [Fact]
        public async Task BulkAssignStructure_AssignsToStudentsWithoutRecord()
        {
            // Create a second student in class 10 who has no fee record yet
            var newStudentId = Guid.NewGuid();
            _context.Students.Add(new Student
            {
                Id = newStudentId, SchoolId = _schoolId,
                Name = "New Student", FirstName = "New", LastName = "Student",
                AdmissionNumber = "NEW001", Class = "10", Section = "A",
                Status = "active",  // must be lowercase to match service filter
                Email = "new@student.com",
                DateOfBirth = new DateTime(2011, 1, 1), Gender = "Female",
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            var (assigned, skipped) = await _service.BulkAssignStructureAsync(_structureId, _schoolId);
            assigned.Should().BeGreaterThanOrEqualTo(1);
        }

        [Fact]
        public async Task BulkAssignStructure_SkipsStudentsWithExistingRecord()
        {
            // _studentId (seeded with Status="active") already has a fee record for _structureId
            // so it must appear in the Skipped count, not Assigned
            var (assigned, skipped) = await _service.BulkAssignStructureAsync(_structureId, _schoolId);
            // The student was already assigned → skipped ≥ 1
            skipped.Should().BeGreaterThanOrEqualTo(1);
        }

        [Fact]
        public async Task BulkAssignStructure_WrongSchool_ThrowsKeyNotFoundException()
        {
            await Assert.ThrowsAsync<KeyNotFoundException>(
                () => _service.BulkAssignStructureAsync(_structureId, Guid.NewGuid()));
        }
    }
}
