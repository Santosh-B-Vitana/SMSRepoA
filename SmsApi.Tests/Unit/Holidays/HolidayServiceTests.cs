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

namespace SmsApi.Tests.Unit.Holidays
{
    public class HolidayServiceTests : IDisposable
    {
        private readonly AppDbContext _db;
        private readonly HolidayService _svc;

        // Shared test IDs
        private readonly Guid _school1  = Guid.NewGuid();
        private readonly Guid _school2  = Guid.NewGuid();

        // Seeded holiday IDs
        private readonly Guid _h1Id = Guid.NewGuid(); // public,  2024-25, future
        private readonly Guid _h2Id = Guid.NewGuid(); // school,  2024-25, past
        private readonly Guid _h3Id = Guid.NewGuid(); // optional,2024-25, future (multi-day)
        private readonly Guid _h4Id = Guid.NewGuid(); // national,2023-24, inactive
        private readonly Guid _h5Id = Guid.NewGuid(); // school2

        public HolidayServiceTests()
        {
            var opts = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options;
            _db  = new AppDbContext(opts);
            _svc = new HolidayService(_db, NullLogger<HolidayService>.Instance);
            Seed().GetAwaiter().GetResult();
        }

        public void Dispose() => _db?.Dispose();

        // ─────────────────────────────────────────────────────────────────────
        // SEED
        // ─────────────────────────────────────────────────────────────────────
        private async Task Seed()
        {
            _db.Schools.AddRange(
                new School { Id = _school1, Name = "Alpha School", SchoolCode = "ALPHA" },
                new School { Id = _school2, Name = "Beta School",  SchoolCode = "BETA"  }
            );

            var today = DateTime.UtcNow.Date;

            _db.Holidays.AddRange(
                // h1 — public, active, single-day, FUTURE
                new Holiday
                {
                    Id = _h1Id, SchoolId = _school1,
                    Name = "Republic Day", Type = "public",
                    StartDate = today.AddDays(5),
                    AcademicYear = "2024-25", IsActive = true,
                    CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
                },
                // h2 — school, active, single-day, PAST
                new Holiday
                {
                    Id = _h2Id, SchoolId = _school1,
                    Name = "Founder's Day", Type = "school",
                    StartDate = today.AddDays(-30),
                    AcademicYear = "2024-25", IsActive = true,
                    CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
                },
                // h3 — optional, active, multi-day (3 days), FUTURE
                new Holiday
                {
                    Id = _h3Id, SchoolId = _school1,
                    Name = "Summer Break",  Type = "optional",
                    StartDate = today.AddDays(10),
                    EndDate   = today.AddDays(12),
                    AcademicYear = "2024-25", IsActive = true,
                    Description = "Annual summer recess",
                    CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
                },
                // h4 — national, INACTIVE, 2023-24
                new Holiday
                {
                    Id = _h4Id, SchoolId = _school1,
                    Name = "Independence Day", Type = "national",
                    StartDate = today.AddDays(20),
                    AcademicYear = "2023-24", IsActive = false,
                    CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
                },
                // h5 — belongs to school2
                new Holiday
                {
                    Id = _h5Id, SchoolId = _school2,
                    Name = "School Day", Type = "school",
                    StartDate = today.AddDays(3),
                    AcademicYear = "2024-25", IsActive = true,
                    CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
                }
            );

            await _db.SaveChangesAsync();
        }

        // ════════════════════════════════════════════════════════════════════
        // GetHolidaysAsync — pagination & filters
        // ════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task GetHolidays_ReturnsOnlySchool1Holidays()
        {
            var result = await _svc.GetHolidaysAsync(_school1, new HolidayFiltersDto(), 1, 50);
            result.Items.Should().HaveCount(4);
            result.Items.Select(x => x.Id).Should().NotContain(_h5Id);
        }

        [Fact]
        public async Task GetHolidays_ReturnsOnlySchool2Holidays()
        {
            var result = await _svc.GetHolidaysAsync(_school2, new HolidayFiltersDto(), 1, 50);
            result.Items.Should().HaveCount(1);
            result.Items[0].Id.Should().Be(_h5Id);
        }

        [Fact]
        public async Task GetHolidays_FilterByType_ReturnsOnlyPublic()
        {
            var result = await _svc.GetHolidaysAsync(_school1,
                new HolidayFiltersDto { Type = "public" }, 1, 50);
            result.Items.Should().HaveCount(1);
            result.Items[0].Name.Should().Be("Republic Day");
        }

        [Fact]
        public async Task GetHolidays_FilterByAcademicYear_Returns2024_25Only()
        {
            var result = await _svc.GetHolidaysAsync(_school1,
                new HolidayFiltersDto { AcademicYear = "2024-25" }, 1, 50);
            result.Items.Should().HaveCount(3); // h1, h2, h3
        }

        [Fact]
        public async Task GetHolidays_FilterByAcademicYear_Returns2023_24Only()
        {
            var result = await _svc.GetHolidaysAsync(_school1,
                new HolidayFiltersDto { AcademicYear = "2023-24" }, 1, 50);
            result.Items.Should().HaveCount(1);
            result.Items[0].Id.Should().Be(_h4Id);
        }

        [Fact]
        public async Task GetHolidays_FilterByIsActive_ReturnsOnlyActive()
        {
            var result = await _svc.GetHolidaysAsync(_school1,
                new HolidayFiltersDto { IsActive = true }, 1, 50);
            result.Items.Should().HaveCount(3); // h1, h2, h3 (h4 is inactive)
            result.Items.Select(x => x.Id).Should().NotContain(_h4Id);
        }

        [Fact]
        public async Task GetHolidays_FilterByIsActive_ReturnsOnlyInactive()
        {
            var result = await _svc.GetHolidaysAsync(_school1,
                new HolidayFiltersDto { IsActive = false }, 1, 50);
            result.Items.Should().HaveCount(1);
            result.Items[0].Id.Should().Be(_h4Id);
        }

        [Fact]
        public async Task GetHolidays_FilterByDateRange_ReturnsCorrect()
        {
            var today = DateTime.UtcNow.Date;
            var result = await _svc.GetHolidaysAsync(_school1,
                new HolidayFiltersDto
                {
                    DateFrom = today.AddDays(1),
                    DateTo   = today.AddDays(15)
                }, 1, 50);
            // h1 (+5), h3 (+10), h4 (+20 — outside range) => h1 + h3
            result.Items.Should().HaveCount(2);
        }

        [Fact]
        public async Task GetHolidays_OrderedByStartDate()
        {
            var result = await _svc.GetHolidaysAsync(_school1, new HolidayFiltersDto(), 1, 50);
            var dates = result.Items.Select(x => x.StartDate).ToList();
            dates.Should().BeInAscendingOrder();
        }

        [Fact]
        public async Task GetHolidays_PaginationNormalization_PageBelowOne_UsesOne()
        {
            var result = await _svc.GetHolidaysAsync(_school1, new HolidayFiltersDto(), 0, 10);
            result.Page.Should().Be(1);
        }

        [Fact]
        public async Task GetHolidays_PaginationNormalization_PageSizeZero_UsesTen()
        {
            var result = await _svc.GetHolidaysAsync(_school1, new HolidayFiltersDto(), 1, 0);
            result.PageSize.Should().Be(10);
        }

        [Fact]
        public async Task GetHolidays_PaginationNormalization_PageSizeOver100_Uses100()
        {
            var result = await _svc.GetHolidaysAsync(_school1, new HolidayFiltersDto(), 1, 200);
            result.PageSize.Should().Be(100);
        }

        [Fact]
        public async Task GetHolidays_ReturnsCorrectTotalCount()
        {
            var result = await _svc.GetHolidaysAsync(_school1, new HolidayFiltersDto(), 1, 2);
            result.TotalCount.Should().Be(4);
            result.Items.Should().HaveCount(2);
            result.TotalPages.Should().Be(2);
        }

        [Fact]
        public async Task GetHolidays_Page2_ReturnsSecondPage()
        {
            var result = await _svc.GetHolidaysAsync(_school1, new HolidayFiltersDto(), 2, 2);
            result.Items.Should().HaveCount(2);
            result.Page.Should().Be(2);
        }

        [Fact]
        public async Task GetHolidays_DurationDays_SingleDay_IsOne()
        {
            var result = await _svc.GetHolidaysAsync(_school1,
                new HolidayFiltersDto { Type = "public" }, 1, 10);
            result.Items[0].DurationDays.Should().Be(1);
        }

        [Fact]
        public async Task GetHolidays_DurationDays_MultiDay_IsCorrect()
        {
            // h3 is optional, StartDate+10, EndDate+12 => 3 days
            var result = await _svc.GetHolidaysAsync(_school1,
                new HolidayFiltersDto { Type = "optional" }, 1, 10);
            result.Items[0].DurationDays.Should().Be(3);
        }

        // ════════════════════════════════════════════════════════════════════
        // GetHolidayByIdAsync
        // ════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task GetHolidayById_ExistingId_ReturnsHoliday()
        {
            var result = await _svc.GetHolidayByIdAsync(_school1, _h1Id);
            result.Should().NotBeNull();
            result!.Name.Should().Be("Republic Day");
        }

        [Fact]
        public async Task GetHolidayById_NonExistentId_ReturnsNull()
        {
            var result = await _svc.GetHolidayByIdAsync(_school1, Guid.NewGuid());
            result.Should().BeNull();
        }

        [Fact]
        public async Task GetHolidayById_WrongSchool_ReturnsNull()
        {
            // h1 belongs to school1, not school2
            var result = await _svc.GetHolidayByIdAsync(_school2, _h1Id);
            result.Should().BeNull();
        }

        [Fact]
        public async Task GetHolidayById_MultiDayHoliday_DurationCorrect()
        {
            var result = await _svc.GetHolidayByIdAsync(_school1, _h3Id);
            result!.DurationDays.Should().Be(3);
        }

        [Fact]
        public async Task GetHolidayById_ReturnsAllFields()
        {
            var result = await _svc.GetHolidayByIdAsync(_school1, _h3Id);
            result.Should().NotBeNull();
            result!.Description.Should().Be("Annual summer recess");
            result.AcademicYear.Should().Be("2024-25");
            result.Type.Should().Be("optional");
            result.IsActive.Should().BeTrue();
        }

        // ════════════════════════════════════════════════════════════════════
        // CreateHolidayAsync — validation
        // ════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task CreateHoliday_ValidInput_ReturnsCreatedHoliday()
        {
            var dto = ValidCreate("Diwali", "public");
            var result = await _svc.CreateHolidayAsync(_school1, dto);

            result.Id.Should().NotBe(Guid.Empty);
            result.Name.Should().Be("Diwali");
            result.Type.Should().Be("public");
            result.SchoolId.Should().Be(_school1);
        }

        [Fact]
        public async Task CreateHoliday_StoredInDb()
        {
            var dto = ValidCreate("New Year", "national");
            var created = await _svc.CreateHolidayAsync(_school1, dto);

            var inDb = await _db.Holidays.FindAsync(created.Id);
            inDb.Should().NotBeNull();
            inDb!.Name.Should().Be("New Year");
        }

        [Fact]
        public async Task CreateHoliday_TypeStoredLowercase()
        {
            var dto = ValidCreate("Test Holiday", "Public"); // capital P
            var result = await _svc.CreateHolidayAsync(_school1, dto);
            result.Type.Should().Be("public");
        }

        [Fact]
        public async Task CreateHoliday_NameTrimmed()
        {
            var dto = ValidCreate("  Spaced Name  ", "school");
            var result = await _svc.CreateHolidayAsync(_school1, dto);
            result.Name.Should().Be("Spaced Name");
        }

        [Fact]
        public async Task CreateHoliday_EmptyName_Throws_ArgumentException()
        {
            var dto = ValidCreate("", "school");
            var act  = () => _svc.CreateHolidayAsync(_school1, dto);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*name*");
        }

        [Fact]
        public async Task CreateHoliday_NameTooShort_Throws_ArgumentException()
        {
            var dto = ValidCreate("AB", "school");
            var act  = () => _svc.CreateHolidayAsync(_school1, dto);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*least 3*");
        }

        [Fact]
        public async Task CreateHoliday_NameTooLong_Throws_ArgumentException()
        {
            var dto = ValidCreate(new string('A', 201), "school");
            var act  = () => _svc.CreateHolidayAsync(_school1, dto);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*200*");
        }

        [Fact]
        public async Task CreateHoliday_InvalidType_Throws_ArgumentException()
        {
            var dto = ValidCreate("Holiday X", "unknown");
            var act  = () => _svc.CreateHolidayAsync(_school1, dto);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*Invalid type*");
        }

        [Fact]
        public async Task CreateHoliday_EmptyType_Throws_ArgumentException()
        {
            var dto = ValidCreate("Holiday X", "");
            var act  = () => _svc.CreateHolidayAsync(_school1, dto);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*type*required*");
        }

        [Fact]
        public async Task CreateHoliday_AllValidTypes_Work()
        {
            var types = new[] { "public", "school", "optional", "national", "regional" };
            var today = DateTime.UtcNow.Date;
            var i = 0;
            foreach (var t in types)
            {
                var dto = new CreateHolidayDto
                {
                    Name         = $"Holiday {t}",
                    Type         = t,
                    StartDate    = today.AddDays(100 + i++),
                    AcademicYear = "2024-25"
                };
                var act = () => _svc.CreateHolidayAsync(_school1, dto);
                await act.Should().NotThrowAsync();
            }
        }

        [Fact]
        public async Task CreateHoliday_MissingAcademicYear_Throws_ArgumentException()
        {
            var dto = new CreateHolidayDto
            {
                Name         = "Test Holiday",
                Type         = "public",
                StartDate    = DateTime.UtcNow.AddDays(50),
                AcademicYear = ""
            };
            var act = () => _svc.CreateHolidayAsync(_school1, dto);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*Academic year*required*");
        }

        [Fact]
        public async Task CreateHoliday_InvalidAcademicYearFormat_Throws_ArgumentException()
        {
            var dto = ValidCreate("Holiday Y", "public");
            dto.AcademicYear = "2024";   // missing -YY part
            var act = () => _svc.CreateHolidayAsync(_school1, dto);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*YYYY-YY*");
        }

        [Fact]
        public async Task CreateHoliday_AcademicYearWrongFormat_Throws_ArgumentException()
        {
            var dto = ValidCreate("Holiday Z", "school");
            dto.AcademicYear = "24-25";   // wrong — must be YYYY-YY
            var act = () => _svc.CreateHolidayAsync(_school1, dto);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*YYYY-YY*");
        }

        [Fact]
        public async Task CreateHoliday_EndDateBeforeStartDate_Throws_ArgumentException()
        {
            var today = DateTime.UtcNow.Date;
            var dto = new CreateHolidayDto
            {
                Name         = "Bad Dates",
                Type         = "school",
                StartDate    = today.AddDays(10),
                EndDate      = today.AddDays(5),   // before start!
                AcademicYear = "2024-25"
            };
            var act = () => _svc.CreateHolidayAsync(_school1, dto);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*End date*before start*");
        }

        [Fact]
        public async Task CreateHoliday_SameDayEndDateAllowed()
        {
            var today = DateTime.UtcNow.Date;
            var dto = new CreateHolidayDto
            {
                Name         = "Same Day",
                Type         = "public",
                StartDate    = today.AddDays(60),
                EndDate      = today.AddDays(60), // same as start
                AcademicYear = "2024-25"
            };
            var act = () => _svc.CreateHolidayAsync(_school1, dto);
            await act.Should().NotThrowAsync();
        }

        [Fact]
        public async Task CreateHoliday_DescriptionTooLong_Throws_ArgumentException()
        {
            var dto = ValidCreate("Holiday D", "school");
            dto.Description = new string('x', 1001);
            var act = () => _svc.CreateHolidayAsync(_school1, dto);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*1000*");
        }

        [Fact]
        public async Task CreateHoliday_DuplicateNameSameDate_Throws_InvalidOperationException()
        {
            var today = DateTime.UtcNow.Date;
            var dto1 = new CreateHolidayDto
            {
                Name = "Repeated Holiday", Type = "public",
                StartDate = today.AddDays(80), AcademicYear = "2024-25"
            };
            var dto2 = new CreateHolidayDto
            {
                Name = "Repeated Holiday", Type = "school", // different type, same name + date
                StartDate = today.AddDays(80), AcademicYear = "2024-25"
            };

            await _svc.CreateHolidayAsync(_school1, dto1);

            var act = () => _svc.CreateHolidayAsync(_school1, dto2);
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*already exists*");
        }

        [Fact]
        public async Task CreateHoliday_DuplicateNameCaseInsensitive_Throws_InvalidOperationException()
        {
            var today = DateTime.UtcNow.Date;
            var dto1 = new CreateHolidayDto
            {
                Name = "Holi Festival", Type = "public",
                StartDate = today.AddDays(90), AcademicYear = "2024-25"
            };
            var dto2 = new CreateHolidayDto
            {
                Name = "holi festival", Type = "public", // lowercase
                StartDate = today.AddDays(90), AcademicYear = "2024-25"
            };

            await _svc.CreateHolidayAsync(_school1, dto1);

            var act = () => _svc.CreateHolidayAsync(_school1, dto2);
            await act.Should().ThrowAsync<InvalidOperationException>();
        }

        [Fact]
        public async Task CreateHoliday_DuplicateNameDifferentDate_Allowed()
        {
            var today = DateTime.UtcNow.Date;
            var dto1 = new CreateHolidayDto
            {
                Name = "Gala Day", Type = "public",
                StartDate = today.AddDays(95), AcademicYear = "2024-25"
            };
            var dto2 = new CreateHolidayDto
            {
                Name = "Gala Day", Type = "public",
                StartDate = today.AddDays(96), // different date — allowed
                AcademicYear = "2024-25"
            };

            await _svc.CreateHolidayAsync(_school1, dto1);

            var act = () => _svc.CreateHolidayAsync(_school1, dto2);
            await act.Should().NotThrowAsync(); // different date = not a duplicate
        }

        [Fact]
        public async Task CreateHoliday_SameNameDifferentSchool_Allowed()
        {
            var today = DateTime.UtcNow.Date;
            var dto = new CreateHolidayDto
            {
                Name = "Founders Day", Type = "school",
                StartDate = today.AddDays(-30), AcademicYear = "2024-25"
            };
            // school1 already has "Founder's Day" on -30 days
            // but this is "Founders Day" (different) — should succeed
            var act = () => _svc.CreateHolidayAsync(_school2, dto);
            await act.Should().NotThrowAsync();
        }

        [Fact]
        public async Task CreateHoliday_MultiDayHoliday_DurationCalculatedCorrectly()
        {
            var today = DateTime.UtcNow.Date;
            var dto = new CreateHolidayDto
            {
                Name = "Winter Break", Type = "school",
                StartDate = today.AddDays(200),
                EndDate   = today.AddDays(214), // 15 days
                AcademicYear = "2025-26"
            };
            var result = await _svc.CreateHolidayAsync(_school1, dto);
            result.DurationDays.Should().Be(15);
        }

        // ════════════════════════════════════════════════════════════════════
        // UpdateHolidayAsync
        // ════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task UpdateHoliday_ValidUpdate_ReturnsUpdated()
        {
            var dto = new UpdateHolidayDto { Name = "Republic Day Updated" };
            var result = await _svc.UpdateHolidayAsync(_school1, _h1Id, dto);
            result.Name.Should().Be("Republic Day Updated");
        }

        [Fact]
        public async Task UpdateHoliday_NotFound_Throws_KeyNotFoundException()
        {
            var dto = new UpdateHolidayDto { Name = "X" };
            var act = () => _svc.UpdateHolidayAsync(_school1, Guid.NewGuid(), dto);
            await act.Should().ThrowAsync<KeyNotFoundException>();
        }

        [Fact]
        public async Task UpdateHoliday_WrongSchool_Throws_KeyNotFoundException()
        {
            // h1 belongs to school1, not school2
            var dto = new UpdateHolidayDto { Name = "Hijack" };
            var act = () => _svc.UpdateHolidayAsync(_school2, _h1Id, dto);
            await act.Should().ThrowAsync<KeyNotFoundException>();
        }

        [Fact]
        public async Task UpdateHoliday_InvalidType_Throws_ArgumentException()
        {
            var dto = new UpdateHolidayDto { Type = "badtype" };
            var act = () => _svc.UpdateHolidayAsync(_school1, _h1Id, dto);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*Invalid type*");
        }

        [Fact]
        public async Task UpdateHoliday_NameTooShort_Throws_ArgumentException()
        {
            var dto = new UpdateHolidayDto { Name = "AB" };
            var act = () => _svc.UpdateHolidayAsync(_school1, _h1Id, dto);
            await act.Should().ThrowAsync<ArgumentException>();
        }

        [Fact]
        public async Task UpdateHoliday_NameTooLong_Throws_ArgumentException()
        {
            var dto = new UpdateHolidayDto { Name = new string('Z', 201) };
            var act = () => _svc.UpdateHolidayAsync(_school1, _h1Id, dto);
            await act.Should().ThrowAsync<ArgumentException>();
        }

        [Fact]
        public async Task UpdateHoliday_DescriptionTooLong_Throws_ArgumentException()
        {
            var dto = new UpdateHolidayDto { Description = new string('x', 1001) };
            var act = () => _svc.UpdateHolidayAsync(_school1, _h1Id, dto);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*1000*");
        }

        [Fact]
        public async Task UpdateHoliday_EndDateBeforeStartDate_Throws_ArgumentException()
        {
            // h1 startDate = today+5; set EndDate to today+2 (before startDate)
            var dto = new UpdateHolidayDto { EndDate = DateTime.UtcNow.Date.AddDays(2) };
            var act = () => _svc.UpdateHolidayAsync(_school1, _h1Id, dto);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*End date*before start*");
        }

        [Fact]
        public async Task UpdateHoliday_SetIsActive_False_Deactivates()
        {
            var dto = new UpdateHolidayDto { IsActive = false };
            var result = await _svc.UpdateHolidayAsync(_school1, _h1Id, dto);
            result.IsActive.Should().BeFalse();
        }

        [Fact]
        public async Task UpdateHoliday_AllValidTypes_Work()
        {
            var types = new[] { "public", "school", "optional", "national", "regional" };
            foreach (var t in types)
            {
                var dto = new UpdateHolidayDto { Type = t };
                var act = () => _svc.UpdateHolidayAsync(_school1, _h2Id, dto);
                await act.Should().NotThrowAsync();
            }
        }

        [Fact]
        public async Task UpdateHoliday_UpdatedAtIsRefreshed()
        {
            var before = (await _svc.GetHolidayByIdAsync(_school1, _h1Id))!.UpdatedAt;
            await Task.Delay(10);
            await _svc.UpdateHolidayAsync(_school1, _h1Id, new UpdateHolidayDto { Name = "Modified" });
            var after = (await _svc.GetHolidayByIdAsync(_school1, _h1Id))!.UpdatedAt;
            after.Should().BeOnOrAfter(before);
        }

        // ════════════════════════════════════════════════════════════════════
        // DeleteHolidayAsync
        // ════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task DeleteHoliday_ExistingId_ReturnsTrueAndRemovesFromDb()
        {
            var result = await _svc.DeleteHolidayAsync(_school1, _h4Id);
            result.Should().BeTrue();
            (await _db.Holidays.FindAsync(_h4Id)).Should().BeNull();
        }

        [Fact]
        public async Task DeleteHoliday_NonExistentId_ReturnsFalse()
        {
            var result = await _svc.DeleteHolidayAsync(_school1, Guid.NewGuid());
            result.Should().BeFalse();
        }

        [Fact]
        public async Task DeleteHoliday_WrongSchool_ReturnsFalse()
        {
            // h1 belongs to school1; deleting from school2 should return false
            var result = await _svc.DeleteHolidayAsync(_school2, _h1Id);
            result.Should().BeFalse();
            // h1 should still exist
            (await _db.Holidays.FindAsync(_h1Id)).Should().NotBeNull();
        }

        // ════════════════════════════════════════════════════════════════════
        // GetUpcomingHolidaysAsync
        // ════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task GetUpcomingHolidays_Default30Days_ReturnsOnlyFutureActive()
        {
            // school1 future active: h1 (+5), h3 (+10), h4 (+20 but inactive)
            var result = await _svc.GetUpcomingHolidaysAsync(_school1, 30);
            result.Should().HaveCount(2); // h1 and h3 only (h4 inactive)
            result.Select(x => x.Id).Should().Contain(_h1Id)
                .And.Contain(_h3Id)
                .And.NotContain(_h4Id);
        }

        [Fact]
        public async Task GetUpcomingHolidays_OrderedByStartDate()
        {
            var result = await _svc.GetUpcomingHolidaysAsync(_school1, 30);
            var dates = result.Select(x => x.StartDate).ToList();
            dates.Should().BeInAscendingOrder();
        }

        [Fact]
        public async Task GetUpcomingHolidays_PastHolidaysExcluded()
        {
            var result = await _svc.GetUpcomingHolidaysAsync(_school1, 30);
            result.Select(x => x.Id).Should().NotContain(_h2Id);
        }

        [Fact]
        public async Task GetUpcomingHolidays_WrongSchool_ReturnsEmpty()
        {
            // school1 holidays should not appear for school2 (school2 only has h5 at +3)
            var result = await _svc.GetUpcomingHolidaysAsync(_school2, 1);
            // h5 is at +3, window is 1 day from today → should be empty
            result.Should().BeEmpty();
        }

        [Fact]
        public async Task GetUpcomingHolidays_School2_WithLargerWindow_ReturnsSchool2Holiday()
        {
            var result = await _svc.GetUpcomingHolidaysAsync(_school2, 5);
            result.Should().HaveCount(1);
            result[0].Id.Should().Be(_h5Id);
        }

        [Fact]
        public async Task GetUpcomingHolidays_DaysNormalizedMax365()
        {
            // 500 days capped at 365 — no exception
            var act = () => _svc.GetUpcomingHolidaysAsync(_school1, 500);
            await act.Should().NotThrowAsync();
        }

        [Fact]
        public async Task GetUpcomingHolidays_DaysNormalizedMin1()
        {
            var act = () => _svc.GetUpcomingHolidaysAsync(_school1, -5);
            await act.Should().NotThrowAsync();
        }

        // ════════════════════════════════════════════════════════════════════
        // GetStatsAsync
        // ════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task GetStats_TotalActiveHolidays_IsCorrect()
        {
            // school1 active: h1, h2, h3 (h4 inactive)
            var stats = await _svc.GetStatsAsync(_school1);
            stats.TotalHolidays.Should().Be(3);
        }

        [Fact]
        public async Task GetStats_TotalDaysOff_IsCorrect()
        {
            // h1=1, h2=1, h3=3 => 5 total days off
            var stats = await _svc.GetStatsAsync(_school1);
            stats.TotalDaysOff.Should().Be(5);
        }

        [Fact]
        public async Task GetStats_PublicCount_IsCorrect()
        {
            var stats = await _svc.GetStatsAsync(_school1);
            stats.PublicHolidays.Should().Be(1); // h1 only
        }

        [Fact]
        public async Task GetStats_SchoolCount_IsCorrect()
        {
            var stats = await _svc.GetStatsAsync(_school1);
            stats.SchoolHolidays.Should().Be(1); // h2 only
        }

        [Fact]
        public async Task GetStats_OptionalCount_IsCorrect()
        {
            var stats = await _svc.GetStatsAsync(_school1);
            stats.OptionalHolidays.Should().Be(1); // h3 only
        }

        [Fact]
        public async Task GetStats_NationalCount_IsZero()
        {
            // h4 is national but inactive — excluded from stats (active only)
            var stats = await _svc.GetStatsAsync(_school1);
            stats.NationalHolidays.Should().Be(0);
        }

        [Fact]
        public async Task GetStats_RegionalCount_IsZero()
        {
            var stats = await _svc.GetStatsAsync(_school1);
            stats.RegionalHolidays.Should().Be(0);
        }

        [Fact]
        public async Task GetStats_UpcomingCount_IncludesFutureActiveInNext30Days()
        {
            // h1 (+5), h3 (+10), both within 30 days
            var stats = await _svc.GetStatsAsync(_school1);
            stats.UpcomingCount.Should().Be(2);
        }

        [Fact]
        public async Task GetStats_NextHolidayDate_IsSmallestFutureDate()
        {
            // h1 is +5, h3 is +10 — next should be h1
            var stats = await _svc.GetStatsAsync(_school1);
            stats.NextHolidayName.Should().Be("Republic Day");
            stats.NextHolidayDate.Should().Be(DateTime.UtcNow.Date.AddDays(5));
        }

        [Fact]
        public async Task GetStats_FilteredByAcademicYear_Correct()
        {
            // 2024-25: h1(public), h2(school), h3(optional) — all active
            var stats = await _svc.GetStatsAsync(_school1, "2024-25");
            stats.TotalHolidays.Should().Be(3);
            stats.PublicHolidays.Should().Be(1);
        }

        [Fact]
        public async Task GetStats_FilteredByAcademicYear_2023_24_ReturnsEmpty()
        {
            // h4 is 2023-24 but inactive — stats excludes inactive
            var stats = await _svc.GetStatsAsync(_school1, "2023-24");
            stats.TotalHolidays.Should().Be(0);
        }

        [Fact]
        public async Task GetStats_School2_IsIsolated()
        {
            var stats = await _svc.GetStatsAsync(_school2);
            stats.TotalHolidays.Should().Be(1); // only h5
        }

        [Fact]
        public async Task GetStats_NoHolidays_ReturnsZeros()
        {
            var emptySchool = Guid.NewGuid();
            var stats = await _svc.GetStatsAsync(emptySchool);
            stats.TotalHolidays.Should().Be(0);
            stats.TotalDaysOff.Should().Be(0);
            stats.UpcomingCount.Should().Be(0);
            stats.NextHolidayName.Should().BeNull();
        }

        // ════════════════════════════════════════════════════════════════════
        // BulkCreateHolidaysAsync
        // ════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task BulkCreate_ValidItems_AllCreated()
        {
            var today = DateTime.UtcNow.Date;
            var dto = new BulkCreateHolidaysDto
            {
                Holidays = new List<CreateHolidayDto>
                {
                    new() { Name = "Bulk1", Type = "public",   StartDate = today.AddDays(120), AcademicYear = "2025-26" },
                    new() { Name = "Bulk2", Type = "national", StartDate = today.AddDays(121), AcademicYear = "2025-26" }
                }
            };

            var result = await _svc.BulkCreateHolidaysAsync(_school1, dto);
            result.Created.Should().Be(2);
            result.Failed.Should().Be(0);
            result.SuccessItems.Should().HaveCount(2);
            result.Errors.Should().BeEmpty();
        }

        [Fact]
        public async Task BulkCreate_PartialFailure_ReportsErrors()
        {
            var today = DateTime.UtcNow.Date;
            var dto = new BulkCreateHolidaysDto
            {
                Holidays = new List<CreateHolidayDto>
                {
                    new() { Name = "GoodHoliday",  Type = "public", StartDate = today.AddDays(130), AcademicYear = "2025-26" },
                    new() { Name = "X",             Type = "public", StartDate = today.AddDays(131), AcademicYear = "2025-26" } // name too short
                }
            };

            var result = await _svc.BulkCreateHolidaysAsync(_school1, dto);
            result.Created.Should().Be(1);
            result.Failed.Should().Be(1);
            result.Errors.Should().HaveCount(1);
            result.Errors[0].Index.Should().Be(1);
        }

        [Fact]
        public async Task BulkCreate_EmptyList_Throws_ArgumentException()
        {
            var dto = new BulkCreateHolidaysDto { Holidays = new List<CreateHolidayDto>() };
            var act = () => _svc.BulkCreateHolidaysAsync(_school1, dto);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*empty*");
        }

        [Fact]
        public async Task BulkCreate_TooManyItems_Throws_ArgumentException()
        {
            var today = DateTime.UtcNow.Date;
            var holidays = Enumerable.Range(1, 51)
                .Select(i => new CreateHolidayDto
                {
                    Name = $"Holiday {i}", Type = "school",
                    StartDate = today.AddDays(200 + i), AcademicYear = "2025-26"
                })
                .ToList();

            var dto = new BulkCreateHolidaysDto { Holidays = holidays };
            var act = () => _svc.BulkCreateHolidaysAsync(_school1, dto);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*50*");
        }

        [Fact]
        public async Task BulkCreate_SchoolIdFromContext_IgnoresBodySchoolId()
        {
            var today = DateTime.UtcNow.Date;
            var dto = new BulkCreateHolidaysDto
            {
                Holidays = new List<CreateHolidayDto>
                {
                    new()
                    {
                        Name         = "Forced School",
                        Type         = "public",
                        StartDate    = today.AddDays(150),
                        AcademicYear = "2025-26",
                        SchoolId     = _school2 // body says school2
                    }
                }
            };

            // Service called with school1 — school1 should win
            var result = await _svc.BulkCreateHolidaysAsync(_school1, dto);
            result.Created.Should().Be(1);
            result.SuccessItems[0].SchoolId.Should().Be(_school1);
        }

        [Fact]
        public async Task BulkCreate_DuplicateWithinBatch_SecondFails()
        {
            var today = DateTime.UtcNow.Date;
            var sameDate = today.AddDays(160);
            var dto = new BulkCreateHolidaysDto
            {
                Holidays = new List<CreateHolidayDto>
                {
                    new() { Name = "Repeat Day", Type = "public",  StartDate = sameDate, AcademicYear = "2025-26" },
                    new() { Name = "Repeat Day", Type = "school",  StartDate = sameDate, AcademicYear = "2025-26" } // same name + date
                }
            };

            var result = await _svc.BulkCreateHolidaysAsync(_school1, dto);
            result.Created.Should().Be(1);
            result.Failed.Should().Be(1);
        }

        // ════════════════════════════════════════════════════════════════════
        // Edge cases — academic year validation
        // ════════════════════════════════════════════════════════════════════

        [Theory]
        [InlineData("2024-25")]
        [InlineData("2025-26")]
        [InlineData("1999-00")]
        [InlineData("2099-00")]
        public async Task CreateHoliday_ValidAcademicYearFormats_Work(string year)
        {
            var today = DateTime.UtcNow.Date;
            var dto = new CreateHolidayDto
            {
                Name         = $"Holiday {year}",
                Type         = "public",
                StartDate    = today.AddDays(300),
                AcademicYear = year
            };
            var act = () => _svc.CreateHolidayAsync(_school1, dto);
            await act.Should().NotThrowAsync();
        }

        [Theory]
        [InlineData("2024")]          // missing -YY
        [InlineData("24-25")]         // wrong format
        [InlineData("2024/25")]       // wrong separator
        [InlineData("2024-2025")]     // too long
        [InlineData("YYYY-YY")]       // not digits
        public async Task CreateHoliday_InvalidAcademicYearFormats_Throw(string year)
        {
            var today = DateTime.UtcNow.Date;
            var dto = new CreateHolidayDto
            {
                Name         = "Holiday",
                Type         = "public",
                StartDate    = today.AddDays(300),
                AcademicYear = year
            };
            var act = () => _svc.CreateHolidayAsync(_school1, dto);
            await act.Should().ThrowAsync<ArgumentException>();
        }

        // ════════════════════════════════════════════════════════════════════
        // Helpers
        // ════════════════════════════════════════════════════════════════════

        private static CreateHolidayDto ValidCreate(string name, string type) => new()
        {
            Name         = name,
            Type         = type,
            StartDate    = DateTime.UtcNow.Date.AddDays(50),
            AcademicYear = "2024-25"
        };
    }
}
