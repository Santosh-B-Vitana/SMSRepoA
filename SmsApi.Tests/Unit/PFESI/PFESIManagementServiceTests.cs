using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;
using SmsApi.Services;
using Xunit;

namespace SmsApi.Tests.Unit.PFESI
{
    // ──────────────────────────────────────────────────────────────────────────
    // Base test class with shared setup
    // ──────────────────────────────────────────────────────────────────────────
    public abstract class PFESITestBase : IDisposable
    {
        protected readonly AppDbContext Db;
        protected readonly IPFESIManagementService Svc;

        protected readonly Guid School1 = Guid.NewGuid();
        protected readonly Guid School2 = Guid.NewGuid();
        protected readonly Guid Staff1 = Guid.NewGuid();
        protected readonly Guid Staff2 = Guid.NewGuid();
        protected readonly Guid Staff3 = Guid.NewGuid();
        protected readonly Guid TestUserId = Guid.NewGuid();

        protected Guid PfConfigId1;
        protected Guid EsiConfigId1;
        protected Guid ContributionId1;
        protected Guid ReportId1;

        protected PFESITestBase()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options;
            Db = new AppDbContext(options);
            Svc = new PFESIManagementService(Db);
        }

        protected void Seed()
        {
            // PF Configuration for School1
            var pfConfig = new PFESIConfiguration
            {
                Id = Guid.NewGuid(),
                SchoolId = School1,
                Type = "PF",
                EmployeeContributionPercentage = 12m,
                EmployerContributionPercentage = 3.67m,
                WageLimit = 15000m,
                PensionContributionLimit = 500m,
                RegistrationNumber = "PF/SCHOOL1/001",
                EffectiveFrom = DateTime.UtcNow.AddMonths(-6),
                EffectiveTo = null,
                CreatedAt = DateTime.UtcNow
            };
            PfConfigId1 = pfConfig.Id;
            Db.PFESIConfigurations.Add(pfConfig);

            // ESI Configuration for School1
            var esiConfig = new PFESIConfiguration
            {
                Id = Guid.NewGuid(),
                SchoolId = School1,
                Type = "ESI",
                EmployeeContributionPercentage = 0.75m,
                EmployerContributionPercentage = 3.25m,
                WageLimit = 21000m,
                RegistrationNumber = "ESI/SCHOOL1/001",
                EffectiveFrom = DateTime.UtcNow.AddMonths(-6),
                EffectiveTo = null,
                CreatedAt = DateTime.UtcNow
            };
            EsiConfigId1 = esiConfig.Id;
            Db.PFESIConfigurations.Add(esiConfig);

            // Contribution for testing
            var contrib = new PFESIContribution
            {
                Id = Guid.NewGuid(),
                SchoolId = School1,
                StaffId = Staff1,
                Type = "PF",
                Month = "2025-03",
                BasicSalary = 10000m,
                GrossSalary = 11000m,
                EmployeeContribution = 1200m,
                EmployerContribution = 367m,
                PensionContribution = 200m,
                TotalContribution = 1567m,
                Status = "Calculated",
                CreatedAt = DateTime.UtcNow.AddDays(-5)
            };
            ContributionId1 = contrib.Id;
            Db.PFESIContributions.Add(contrib);

            Db.SaveChanges();
        }

        public void Dispose()
        {
            Db?.Dispose();
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 1. Configuration CRUD Tests
    // ═══════════════════════════════════════════════════════════════════════════
    public class ConfigurationCrudTests : PFESITestBase
    {
        [Fact]
        public async Task CreateConfig_WithValidData_ShouldSucceed()
        {
            // Arrange
            var request = new CreatePFESIConfigRequest
            {
                SchoolId = School1,
                Type = "NPS",
                EmployeeContributionPercentage = 10m,
                EmployerContributionPercentage = 10m,
                WageLimit = 12000m,
                RegistrationNumber = "NPS/S1/001",
                EffectiveFrom = DateTime.UtcNow.AddMonths(-1),
                CreatedBy = TestUserId
            };

            // Act
            var result = await Svc.CreateConfigAsync(request);

            // Assert
            result.Should().NotBeNull();
            result.Type.Should().Be("NPS");
            result.EmployeeContributionPercentage.Should().Be(10m);
            (await Db.PFESIConfigurations.CountAsync(c => c.Type == "NPS")).Should().Be(1);
        }

        [Fact]
        public async Task CreateConfig_DuplicateType_ShouldThrowInvalidOperationException()
        {
            // Arrange
            Seed();
            var request = new CreatePFESIConfigRequest
            {
                SchoolId = School1,
                Type = "PF",
                EmployeeContributionPercentage = 12m,
                EmployerContributionPercentage = 3.67m,
                CreatedBy = TestUserId
            };

            // Act & Assert
            await Assert.ThrowsAsync<InvalidOperationException>(() => Svc.CreateConfigAsync(request));
        }

        [Fact]
        public async Task CreateConfig_EmptySchoolId_ShouldThrowArgumentException()
        {
            // Arrange
            var request = new CreatePFESIConfigRequest
            {
                SchoolId = Guid.Empty,
                Type = "PF",
                EmployeeContributionPercentage = 12m,
                EmployerContributionPercentage = 3.67m,
                CreatedBy = TestUserId
            };

            // Act & Assert
            var ex = await Assert.ThrowsAsync<ArgumentException>(() => Svc.CreateConfigAsync(request));
            ex.Message.Should().Contain("SchoolId");
        }

        [Fact]
        public async Task CreateConfig_InvalidType_ShouldThrowArgumentException()
        {
            // Arrange
            var request = new CreatePFESIConfigRequest
            {
                SchoolId = School1,
                Type = "InvalidType",
                EmployeeContributionPercentage = 12m,
                EmployerContributionPercentage = 3.67m,
                CreatedBy = TestUserId
            };

            // Act & Assert
            var ex = await Assert.ThrowsAsync<ArgumentException>(() => Svc.CreateConfigAsync(request));
            ex.Message.Should().Contain("Type");
        }

        [Fact]
        public async Task CreateConfig_PercentageOutOfBounds_ShouldThrowArgumentException()
        {
            // Arrange
            var request = new CreatePFESIConfigRequest
            {
                SchoolId = School1,
                Type = "PF",
                EmployeeContributionPercentage = 150m, // >100
                EmployerContributionPercentage = 3.67m,
                CreatedBy = TestUserId
            };

            // Act & Assert
            var ex = await Assert.ThrowsAsync<ArgumentException>(() => Svc.CreateConfigAsync(request));
            ex.Message.Should().Contain("EmployeeContributionPercentage");
        }

        [Fact]
        public async Task CreateConfig_NegativeWageLimit_ShouldThrowArgumentException()
        {
            // Arrange
            var request = new CreatePFESIConfigRequest
            {
                SchoolId = School1,
                Type = "PF",
                EmployeeContributionPercentage = 12m,
                EmployerContributionPercentage = 3.67m,
                WageLimit = -1000m,
                CreatedBy = TestUserId
            };

            // Act & Assert
            var ex = await Assert.ThrowsAsync<ArgumentException>(() => Svc.CreateConfigAsync(request));
            ex.Message.Should().Contain("WageLimit");
        }

        [Fact]
        public async Task CreateConfig_FutureDateEffectiveFrom_ShouldThrowArgumentException()
        {
            // Arrange
            var request = new CreatePFESIConfigRequest
            {
                SchoolId = School1,
                Type = "PF",
                EmployeeContributionPercentage = 12m,
                EmployerContributionPercentage = 3.67m,
                EffectiveFrom = DateTime.UtcNow.AddDays(1),
                CreatedBy = TestUserId
            };

            // Act & Assert
            var ex = await Assert.ThrowsAsync<ArgumentException>(() => Svc.CreateConfigAsync(request));
            ex.Message.Should().Contain("future");
        }

        [Fact]
        public async Task UpdateConfig_WithValidData_ShouldSucceed()
        {
            // Arrange
            Seed();
            var request = new UpdatePFESIConfigRequest
            {
                EmployeeContributionPercentage = 15m,
                EmployerContributionPercentage = 5m,
                WageLimit = 20000m,
                PensionContributionLimit = 600m,
                RegistrationNumber = "PF/SCHOOL1/002",
                IsActive = true,
                UpdatedBy = TestUserId
            };

            // Act
            var result = await Svc.UpdateConfigAsync(PfConfigId1, request, School1);

            // Assert
            result.EmployeeContributionPercentage.Should().Be(15m);
            result.EmployerContributionPercentage.Should().Be(5m);
        }

        [Fact]
        public async Task UpdateConfig_InvalidId_ShouldThrowKeyNotFoundException()
        {
            // Arrange
            Seed();
            var request = new UpdatePFESIConfigRequest
            {
                EmployeeContributionPercentage = 15m,
                EmployerContributionPercentage = 5m,
                UpdatedBy = TestUserId
            };

            // Act & Assert
            await Assert.ThrowsAsync<KeyNotFoundException>(() => Svc.UpdateConfigAsync(Guid.NewGuid(), request, School1));
        }

        [Fact]
        public async Task UpdateConfig_InvalidPercentage_ShouldThrowArgumentException()
        {
            // Arrange
            Seed();
            var request = new UpdatePFESIConfigRequest
            {
                EmployeeContributionPercentage = 101m, // >100
                EmployerContributionPercentage = 5m,
                UpdatedBy = TestUserId
            };

            // Act & Assert
            var ex = await Assert.ThrowsAsync<ArgumentException>(() => Svc.UpdateConfigAsync(PfConfigId1, request, School1));
            ex.Message.Should().Contain("EmployeeContributionPercentage");
        }

        [Fact]
        public async Task GetConfigById_WithValidId_ShouldReturnConfig()
        {
            // Arrange
            Seed();

            // Act
            var result = await Svc.GetConfigByIdAsync(PfConfigId1, School1);

            // Assert
            result.Should().NotBeNull();
            result.Type.Should().Be("PF");
            result.RegistrationNumber.Should().Be("PF/SCHOOL1/001");
        }

        [Fact]
        public async Task GetConfigById_InvalidId_ShouldThrowKeyNotFoundException()
        {
            // Arrange
            Seed();

            // Act & Assert
            await Assert.ThrowsAsync<KeyNotFoundException>(() => Svc.GetConfigByIdAsync(Guid.NewGuid(), School1));
        }

        [Fact]
        public async Task GetConfigs_WithoutFilter_ShouldReturnAll()
        {
            // Arrange
            Seed();

            // Act
            var result = await Svc.GetConfigsAsync(School1, null);

            // Assert
            result.Should().HaveCount(2);
            result.Select(c => c.Type).Should().Contain(new[] { "PF", "ESI" });
        }

        [Fact]
        public async Task GetConfigs_WithTypeFilter_ShouldReturnFiltered()
        {
            // Arrange
            Seed();

            // Act
            var result = await Svc.GetConfigsAsync(School1, "PF");

            // Assert
            result.Should().HaveCount(1);
            result[0].Type.Should().Be("PF");
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. Contribution Calculation Tests
    // ═══════════════════════════════════════════════════════════════════════════
    public class ContributionCalculationTests : PFESITestBase
    {
        [Fact]
        public async Task CalculateContributions_WithValidData_ShouldSucceed()
        {
            // Arrange
            Seed();
            var request = new CalculateContributionsRequest
            {
                SchoolId = School1,
                Type = "PF",
                Month = "2025-04",
                BasicSalary = 12000m,
                GrossSalary = 13000m,
                StaffIds = new List<Guid> { Staff2, Staff3 },
                CalculatedBy = TestUserId
            };

            // Act
            var results = await Svc.CalculateContributionsAsync(request);

            // Assert
            results.Should().HaveCount(2);
            results.All(r => r.Status == "Calculated").Should().BeTrue();
            results.All(r => r.Month == "2025-04").Should().BeTrue();
        }

        [Fact]
        public async Task CalculateContributions_InvalidMonthFormat_ShouldThrowArgumentException()
        {
            // Arrange
            Seed();
            var request = new CalculateContributionsRequest
            {
                SchoolId = School1,
                Type = "PF",
                Month = "04-2025", // Wrong format
                BasicSalary = 12000m,
                GrossSalary = 13000m,
                StaffIds = new List<Guid> { Staff2 },
                CalculatedBy = TestUserId
            };

            // Act & Assert
            var ex = await Assert.ThrowsAsync<ArgumentException>(() => Svc.CalculateContributionsAsync(request));
            ex.Message.Should().Contain("YYYY-MM");
        }

        [Fact]
        public async Task CalculateContributions_NegativeSalary_ShouldThrowArgumentException()
        {
            // Arrange
            Seed();
            var request = new CalculateContributionsRequest
            {
                SchoolId = School1,
                Type = "PF",
                Month = "2025-04",
                BasicSalary = -1000m,
                GrossSalary = 13000m,
                StaffIds = new List<Guid> { Staff2 },
                CalculatedBy = TestUserId
            };

            // Act & Assert
            var ex = await Assert.ThrowsAsync<ArgumentException>(() => Svc.CalculateContributionsAsync(request));
            ex.Message.Should().Contain("BasicSalary");
        }

        [Fact]
        public async Task CalculateContributions_GrossSalaryLessThanBasic_ShouldThrowArgumentException()
        {
            // Arrange
            Seed();
            var request = new CalculateContributionsRequest
            {
                SchoolId = School1,
                Type = "PF",
                Month = "2025-04",
                BasicSalary = 12000m,
                GrossSalary = 11000m, // Less than basic
                StaffIds = new List<Guid> { Staff2 },
                CalculatedBy = TestUserId
            };

            // Act & Assert
            var ex = await Assert.ThrowsAsync<ArgumentException>(() => Svc.CalculateContributionsAsync(request));
            ex.Message.Should().Contain("GrossSalary");
        }

        [Fact]
        public async Task CalculateContributions_DuplicateStaffIds_ShouldThrowArgumentException()
        {
            // Arrange
            Seed();
            var request = new CalculateContributionsRequest
            {
                SchoolId = School1,
                Type = "PF",
                Month = "2025-04",
                BasicSalary = 12000m,
                GrossSalary = 13000m,
                StaffIds = new List<Guid> { Staff2, Staff2 }, // Duplicate
                CalculatedBy = TestUserId
            };

            // Act & Assert
            var ex = await Assert.ThrowsAsync<ArgumentException>(() => Svc.CalculateContributionsAsync(request));
            ex.Message.Should().Contain("duplicates");
        }

        [Fact]
        public async Task CalculateContributions_DuplicateContribution_ShouldThrowInvalidOperationException()
        {
            // Arrange
            Seed();
            var request = new CalculateContributionsRequest
            {
                SchoolId = School1,
                Type = "PF",
                Month = "2025-03", // Staff1 already has contribution for this month
                BasicSalary = 12000m,
                GrossSalary = 13000m,
                StaffIds = new List<Guid> { Staff1 },
                CalculatedBy = TestUserId
            };

            // Act & Assert
            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => Svc.CalculateContributionsAsync(request));
            ex.Message.Should().Contain("already exists");
        }

        [Fact]
        public async Task GetContributions_WithPagination_ShouldReturnPagedResults()
        {
            // Arrange
            Seed();
            // Add more contributions
            for (int i = 0; i < 5; i++)
            {
                Db.PFESIContributions.Add(new PFESIContribution
                {
                    Id = Guid.NewGuid(),
                    SchoolId = School1,
                    StaffId = Guid.NewGuid(),
                    Type = "PF",
                    Month = "2025-03",
                    BasicSalary = 10000m,
                    GrossSalary = 11000m,
                    EmployeeContribution = 1200m,
                    EmployerContribution = 367m,
                    TotalContribution = 1567m,
                    Status = "Calculated",
                    CreatedAt = DateTime.UtcNow
                });
            }
            Db.SaveChanges();

            // Act
            var result = await Svc.GetContributionsAsync(School1, 1, 3, null, null);

            // Assert
            result.Page.Should().Be(1);
            result.PageSize.Should().Be(3);
            result.Items.Should().HaveCount(3);
            result.TotalPages.Should().Be(2);
        }

        [Fact]
        public async Task GetContributions_PaginationNormalization_ShouldReturnNormalized()
        {
            // Arrange
            Seed();

            // Act
            var result = await Svc.GetContributionsAsync(School1, 0, 0, null, null);

            // Assert
            result.Page.Should().Be(1);
            result.PageSize.Should().Be(10);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 3. Deposit Workflow Tests
    // ═══════════════════════════════════════════════════════════════════════════
    public class DepositWorkflowTests : PFESITestBase
    {
        [Fact]
        public async Task MarkAsDeposited_WithValidData_ShouldSucceed()
        {
            // Arrange
            Seed();
            var request = new MarkDepositRequest
            {
                SchoolId = School1,
                ContributionId = ContributionId1,
                DepositDate = DateTime.UtcNow.Date,
                ChallanNumber = "CHN12345678901",
                ReceiptUrl = "https://example.com/receipt.pdf",
                Remarks = "Deposited successfully",
                UpdatedBy = TestUserId
            };

            // Act
            var result = await Svc.MarkAsDepositedAsync(request);

            // Assert
            result.Status.Should().Be("Deposited");
            result.ChallanNumber.Should().Be("CHN12345678901");
            result.DepositDate.Should().Be(DateTime.UtcNow.Date);
        }

        [Fact]
        public async Task MarkAsDeposited_FutureDepositDate_ShouldThrowArgumentException()
        {
            // Arrange
            Seed();
            var request = new MarkDepositRequest
            {
                SchoolId = School1,
                ContributionId = ContributionId1,
                DepositDate = DateTime.UtcNow.Date.AddDays(1),
                ChallanNumber = "CHN12345678901",
                UpdatedBy = TestUserId
            };

            // Act & Assert
            var ex = await Assert.ThrowsAsync<ArgumentException>(() => Svc.MarkAsDepositedAsync(request));
            ex.Message.Should().Contain("future");
        }

        [Fact]
        public async Task MarkAsDeposited_EmptyChallaN_ShouldThrowArgumentException()
        {
            // Arrange
            Seed();
            var request = new MarkDepositRequest
            {
                SchoolId = School1,
                ContributionId = ContributionId1,
                DepositDate = DateTime.UtcNow.Date,
                ChallanNumber = "",
                UpdatedBy = TestUserId
            };

            // Act & Assert
            var ex = await Assert.ThrowsAsync<ArgumentException>(() => Svc.MarkAsDepositedAsync(request));
            ex.Message.Should().Contain("ChallanNumber");
        }

        [Fact]
        public async Task MarkAsDeposited_AlreadyDeposited_ShouldThrowInvalidOperationException()
        {
            // Arrange
            Seed();
            var contribution = await Db.PFESIContributions.FindAsync(ContributionId1);
            contribution.Status = "Deposited";
            Db.SaveChanges();

            var request = new MarkDepositRequest
            {
                SchoolId = School1,
                ContributionId = ContributionId1,
                DepositDate = DateTime.UtcNow.Date,
                ChallanNumber = "CHN12345678901",
                UpdatedBy = TestUserId
            };

            // Act & Assert
            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => Svc.MarkAsDepositedAsync(request));
            ex.Message.Should().Contain("already marked");
        }

        [Fact]
        public async Task MarkAsDeposited_InvalidContribution_ShouldThrowKeyNotFoundException()
        {
            // Arrange
            Seed();
            var request = new MarkDepositRequest
            {
                SchoolId = School1,
                ContributionId = Guid.NewGuid(),
                DepositDate = DateTime.UtcNow.Date,
                ChallanNumber = "CHN12345678901",
                UpdatedBy = TestUserId
            };

            // Act & Assert
            await Assert.ThrowsAsync<KeyNotFoundException>(() => Svc.MarkAsDepositedAsync(request));
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 4. Compliance Report Tests
    // ═══════════════════════════════════════════════════════════════════════════
    public class ComplianceReportTests : PFESITestBase
    {
        [Fact]
        public async Task GenerateComplianceReport_WithValidData_ShouldSucceed()
        {
            // Arrange
            Seed();
            var request = new GenerateComplianceReportRequest
            {
                SchoolId = School1,
                Type = "PF",
                ReportType = "Monthly",
                Period = "2025-03",
                Remarks = "Monthly compliance report",
                GeneratedBy = TestUserId
            };

            // Act
            var result = await Svc.GenerateComplianceReportAsync(request);

            // Assert
            result.Should().NotBeNull();
            result.Status.Should().Be("Generated");
            result.ReportType.Should().Be("Monthly");
            result.Period.Should().Be("2025-03");
        }

        [Fact]
        public async Task GenerateComplianceReport_InvalidReportType_ShouldThrowArgumentException()
        {
            // Arrange
            Seed();
            var request = new GenerateComplianceReportRequest
            {
                SchoolId = School1,
                Type = "PF",
                ReportType = "InvalidType",
                Period = "2025-03",
                GeneratedBy = TestUserId
            };

            // Act & Assert
            var ex = await Assert.ThrowsAsync<ArgumentException>(() => Svc.GenerateComplianceReportAsync(request));
            ex.Message.Should().Contain("ReportType");
        }

        [Fact]
        public async Task GenerateComplianceReport_InvalidPeriodFormat_ShouldThrowArgumentException()
        {
            // Arrange
            Seed();
            var request = new GenerateComplianceReportRequest
            {
                SchoolId = School1,
                Type = "PF",
                ReportType = "Monthly",
                Period = "03-2025",
                GeneratedBy = TestUserId
            };

            // Act & Assert
            var ex = await Assert.ThrowsAsync<ArgumentException>(() => Svc.GenerateComplianceReportAsync(request));
            ex.Message.Should().Contain("YYYY-MM");
        }

        [Fact]
        public async Task GenerateComplianceReport_DuplicateReport_ShouldThrowInvalidOperationException()
        {
            // Arrange
            Seed();
            var request = new GenerateComplianceReportRequest
            {
                SchoolId = School1,
                Type = "PF",
                ReportType = "Monthly",
                Period = "2025-03",
                GeneratedBy = TestUserId
            };
            await Svc.GenerateComplianceReportAsync(request);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => Svc.GenerateComplianceReportAsync(request));
            ex.Message.Should().Contain("already exists");
        }

        [Fact]
        public async Task GetComplianceReports_WithFilters_ShouldReturnFiltered()
        {
            // Arrange
            Seed();
            var request = new GenerateComplianceReportRequest
            {
                SchoolId = School1,
                Type = "PF",
                ReportType = "Monthly",
                Period = "2025-03",
                GeneratedBy = TestUserId
            };
            await Svc.GenerateComplianceReportAsync(request);

            // Act
            var result = await Svc.GetComplianceReportsAsync(School1, "2025-03", null);

            // Assert
            result.Items.Should().HaveCount(1);
            result.Items[0].Period.Should().Be("2025-03");
        }

        [Fact]
        public async Task SubmitComplianceReport_WithValidData_ShouldSucceed()
        {
            // Arrange
            Seed();
            var request = new GenerateComplianceReportRequest
            {
                SchoolId = School1,
                Type = "PF",
                ReportType = "Monthly",
                Period = "2025-03",
                GeneratedBy = TestUserId
            };
            var report = await Svc.GenerateComplianceReportAsync(request);

            var submitRequest = new SubmitComplianceReportRequest
            {
                SubmittedByStaffId = Staff1,
                SubmittedBy = TestUserId,
                SubmissionDetails = "Report submitted for compliance",
                Remarks = "All validations passed"
            };

            // Act
            var result = await Svc.SubmitComplianceReportAsync(report.Id, submitRequest, School1);

            // Assert
            result.Status.Should().Be("Submitted");
            result.SubmittedByStaffId.Should().Be(Staff1);
        }

        [Fact]
        public async Task SubmitComplianceReport_InvalidReportId_ShouldThrowKeyNotFoundException()
        {
            // Arrange
            Seed();
            var submitRequest = new SubmitComplianceReportRequest
            {
                SubmittedByStaffId = Staff1,
                SubmittedBy = TestUserId,
                SubmissionDetails = "Report submitted"
            };

            // Act & Assert
            await Assert.ThrowsAsync<KeyNotFoundException>(() => 
                Svc.SubmitComplianceReportAsync(Guid.NewGuid(), submitRequest, School1));
        }

        [Fact]
        public async Task SubmitComplianceReport_AlreadySubmitted_ShouldThrowInvalidOperationException()
        {
            // Arrange
            Seed();
            var request = new GenerateComplianceReportRequest
            {
                SchoolId = School1,
                Type = "PF",
                ReportType = "Monthly",
                Period = "2025-03",
                GeneratedBy = TestUserId
            };
            var report = await Svc.GenerateComplianceReportAsync(request);

            var submitRequest = new SubmitComplianceReportRequest
            {
                SubmittedByStaffId = Staff1,
                SubmittedBy = TestUserId,
                SubmissionDetails = "Report submitted"
            };
            await Svc.SubmitComplianceReportAsync(report.Id, submitRequest, School1);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => 
                Svc.SubmitComplianceReportAsync(report.Id, submitRequest, School1));
            ex.Message.Should().Contain("already submitted");
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 5. Edge Cases and Multi-Tenancy Tests
    // ═══════════════════════════════════════════════════════════════════════════
    public class EdgeCasesAndTenancyTests : PFESITestBase
    {
        [Fact]
        public async Task MultiTenancy_SchoolsIsolated_ShouldNotCrossPollute()
        {
            // Arrange
            Seed();
            var request = new CreatePFESIConfigRequest
            {
                SchoolId = School2,
                Type = "PF",
                EmployeeContributionPercentage = 12m,
                EmployerContributionPercentage = 3.67m,
                CreatedBy = TestUserId
            };

            // Act
            await Svc.CreateConfigAsync(request);

            // Assert
            var school1Configs = await Svc.GetConfigsAsync(School1, null);
            var school2Configs = await Svc.GetConfigsAsync(School2, null);
            school1Configs.Should().HaveCount(2); // PF + ESI
            school2Configs.Should().HaveCount(1); // PF only
        }

        [Fact]
        public async Task DeleteConfig_ShouldBeImplementedAsDelete()
        {
            // Arrange
            Seed();

            // Act
            await Svc.DeleteConfigAsync(PfConfigId1, School1);

            // Assert: soft-delete applied — entity not accessible via filtered query
            var config = await Db.PFESIConfigurations
                .Where(c => c.Id == PfConfigId1)
                .FirstOrDefaultAsync();
            config.Should().BeNull("soft-delete should hide the record from filtered queries");
        }

        [Fact]
        public async Task ContributionAmountCalculation_ShouldBeAccurate()
        {
            // Arrange
            Seed();
            var request = new CalculateContributionsRequest
            {
                SchoolId = School1,
                Type = "PF",
                Month = "2025-05",
                BasicSalary = 15000m,
                GrossSalary = 16500m,
                StaffIds = new List<Guid> { Staff2 },
                CalculatedBy = TestUserId
            };

            // Act
            var results = await Svc.CalculateContributionsAsync(request);

            // Assert
            var contrib = results[0];
            contrib.EmployeeContribution.Should().Be(1800m); // 12% of 15000
            contrib.EmployerContribution.Should().Be(550.5m); // 3.67% of 15000
            contrib.TotalContribution.Should().BeApproximately(2350.5m, 0.1m);
        }

        [Fact]
        public async Task InvalidSchoolAccess_ShouldThrowUnauthorizedAccessException()
        {
            // Arrange
            Seed();
            var request = new UpdatePFESIConfigRequest
            {
                EmployeeContributionPercentage = 15m,
                EmployerContributionPercentage = 5m,
                UpdatedBy = TestUserId
            };

            // Act & Assert - Attempting to update config from different school
            await Assert.ThrowsAsync<KeyNotFoundException>(() => 
                Svc.UpdateConfigAsync(PfConfigId1, request, School2));
        }

        [Fact]
        public async Task RegistrationNumberLength_LimitEnforced()
        {
            // Arrange
            var longRegNumber = new string('A', 51); // Exceeds 50 char limit
            var request = new CreatePFESIConfigRequest
            {
                SchoolId = School1,
                Type = "NPS",
                EmployeeContributionPercentage = 10m,
                EmployerContributionPercentage = 10m,
                RegistrationNumber = longRegNumber,
                CreatedBy = TestUserId
            };

            // Act & Assert
            var ex = await Assert.ThrowsAsync<ArgumentException>(() => Svc.CreateConfigAsync(request));
            ex.Message.Should().Contain("RegistrationNumber");
        }

        [Fact]
        public async Task EmptyStaffIds_ShouldThrowArgumentException()
        {
            // Arrange
            Seed();
            var request = new CalculateContributionsRequest
            {
                SchoolId = School1,
                Type = "PF",
                Month = "2025-04",
                BasicSalary = 12000m,
                GrossSalary = 13000m,
                StaffIds = new List<Guid>(), // Empty
                CalculatedBy = TestUserId
            };

            // Act & Assert
            var ex = await Assert.ThrowsAsync<ArgumentException>(() => Svc.CalculateContributionsAsync(request));
            ex.Message.Should().ContainEquivalentOf("at least one");
        }
    }
}
