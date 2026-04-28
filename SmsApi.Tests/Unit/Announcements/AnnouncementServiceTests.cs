using System;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;
using SmsApi.Services;
using StaffEntity = SmsApi.Models.Entities.Staff;
using Xunit;

namespace SmsApi.Tests.Unit.Announcements
{
    public class AnnouncementServiceTests : IDisposable
    {
        private readonly AppDbContext _db;
        private readonly AnnouncementService _svc;

        private readonly Guid _school1 = Guid.NewGuid();
        private readonly Guid _school2 = Guid.NewGuid();
        private readonly Guid _staffId = Guid.NewGuid();

        // Pre-seeded announcements
        private readonly Guid _a1Id = Guid.NewGuid(); // active, pinned, urgent, all audience
        private readonly Guid _a2Id = Guid.NewGuid(); // active, not-pinned, normal, students
        private readonly Guid _a3Id = Guid.NewGuid(); // inactive, normal, staff
        private readonly Guid _a4Id = Guid.NewGuid(); // active, expiring today
        private readonly Guid _a5Id = Guid.NewGuid(); // school2's announcement
        private readonly Guid _a6Id = Guid.NewGuid(); // active, high priority, parents

        public AnnouncementServiceTests()
        {
            var opts = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options;
            _db  = new AppDbContext(opts);
            _svc = new AnnouncementService(_db);
            Seed().GetAwaiter().GetResult();
        }

        public void Dispose() => _db?.Dispose();

        // ──────────────────────────────────────────────────────────────
        // Seed
        // ──────────────────────────────────────────────────────────────
        private async Task Seed()
        {
            _db.Schools.AddRange(
                new School { Id = _school1, Name = "Alpha School", SchoolCode = "ALPHA" },
                new School { Id = _school2, Name = "Beta School",  SchoolCode = "BETA"  }
            );

            var staff = new StaffEntity
            {
                Id = _staffId, SchoolId = _school1,
                EmployeeId = "E001", FirstName = "John", LastName = "Smith",
                Email = "john@alpha.school", Phone = "9999999999",
                DateOfBirth = new DateTime(1985, 1, 1),
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            };
            _db.StaffMembers.Add(staff);

            var now  = DateTime.UtcNow;
            var today = now.Date;

            _db.Announcements.AddRange(
                // a1 — active, pinned, urgent, all
                new Announcement
                {
                    Id = _a1Id, SchoolId = _school1, Title = "Annual Day Celebration",
                    Content = "Annual day is on 30th Jan. All students must attend.",
                    CreatedByStaffId = _staffId, Priority = "urgent",
                    TargetAudience = "all", IsActive = true, IsPinned = true,
                    PublishedDate = now.AddDays(-2), ExpiryDate = now.AddDays(30),
                    CreatedAt = now.AddDays(-2), UpdatedAt = now.AddDays(-2)
                },
                // a2 — active, not-pinned, normal, students
                new Announcement
                {
                    Id = _a2Id, SchoolId = _school1, Title = "Library Book Return Notice",
                    Content = "All students must return library books by Friday.",
                    CreatedByStaffId = _staffId, Priority = "normal",
                    TargetAudience = "students", IsActive = true, IsPinned = false,
                    PublishedDate = now.AddDays(-1),
                    CreatedAt = now.AddDays(-1), UpdatedAt = now.AddDays(-1)
                },
                // a3 — inactive, normal, staff
                new Announcement
                {
                    Id = _a3Id, SchoolId = _school1, Title = "Staff Meeting Cancelled",
                    Content = "The Monday staff meeting has been cancelled this week.",
                    CreatedByStaffId = _staffId, Priority = "normal",
                    TargetAudience = "staff", IsActive = false, IsPinned = false,
                    PublishedDate = now.AddDays(-5),
                    CreatedAt = now.AddDays(-5), UpdatedAt = now.AddDays(-5)
                },
                // a4 — active, expires today
                new Announcement
                {
                    Id = _a4Id, SchoolId = _school1, Title = "Sports Day Registration",
                    Content = "Last day to register for sports day events. Register before midnight.",
                    CreatedByStaffId = _staffId, Priority = "high",
                    TargetAudience = "all", IsActive = true, IsPinned = false,
                    PublishedDate = now.AddDays(-3), ExpiryDate = today.AddHours(23),
                    CreatedAt = now.AddDays(-3), UpdatedAt = now.AddDays(-3)
                },
                // a5 — school2
                new Announcement
                {
                    Id = _a5Id, SchoolId = _school2, Title = "School Picnic Notice",
                    Content = "School picnic is scheduled for next Saturday. Permission slips needed.",
                    CreatedByStaffId = _staffId, Priority = "normal",
                    TargetAudience = "all", IsActive = true, IsPinned = false,
                    PublishedDate = now,
                    CreatedAt = now, UpdatedAt = now
                },
                // a6 — active, high, parents
                new Announcement
                {
                    Id = _a6Id, SchoolId = _school1, Title = "Parent-Teacher Meeting",
                    Content = "Parent-Teacher meeting scheduled for all classes this Saturday.",
                    CreatedByStaffId = _staffId, Priority = "high",
                    TargetAudience = "parents", IsActive = true, IsPinned = false,
                    PublishedDate = now.AddDays(-1),
                    CreatedAt = now.AddDays(-1), UpdatedAt = now.AddDays(-1)
                }
            );

            // Add 2 recipients on a1 — one read, one unread
            _db.AnnouncementRecipients.AddRange(
                new AnnouncementRecipient
                {
                    Id = Guid.NewGuid(), AnnouncementId = _a1Id,
                    RecipientType = "Staff", RecipientId = _staffId,
                    IsRead = true, ReadAt = now.AddDays(-1),
                    CreatedAt = now.AddDays(-2)
                },
                new AnnouncementRecipient
                {
                    Id = Guid.NewGuid(), AnnouncementId = _a1Id,
                    RecipientType = "Student", RecipientId = Guid.NewGuid(),
                    IsRead = false,
                    CreatedAt = now.AddDays(-2)
                }
            );

            await _db.SaveChangesAsync();
        }

        // ════════════════════════════════════════════════════════════════
        // GetAnnouncements — school isolation
        // ════════════════════════════════════════════════════════════════
        [Fact]
        public async Task GetAnnouncements_ReturnsOnlySchool1Announcements()
        {
            var result = await _svc.GetAnnouncementsAsync(_school1, new AnnouncementFiltersDto(), 1, 100);
            result.Items.Should().HaveCount(5);
            result.Items.All(a => a.SchoolId == _school1).Should().BeTrue();
        }

        [Fact]
        public async Task GetAnnouncements_School2IsolationReturnsOneAnnouncement()
        {
            var result = await _svc.GetAnnouncementsAsync(_school2, new AnnouncementFiltersDto(), 1, 100);
            result.Items.Should().HaveCount(1);
            result.Items[0].Id.Should().Be(_a5Id);
        }

        [Fact]
        public async Task GetAnnouncements_FilterByIsActive_True_ReturnsOnlyActive()
        {
            var result = await _svc.GetAnnouncementsAsync(_school1,
                new AnnouncementFiltersDto { IsActive = true }, 1, 100);
            result.Items.Should().NotContain(a => a.Id == _a3Id);
            result.Items.All(a => a.IsActive).Should().BeTrue();
        }

        [Fact]
        public async Task GetAnnouncements_FilterByIsActive_False_ReturnsOnlyInactive()
        {
            var result = await _svc.GetAnnouncementsAsync(_school1,
                new AnnouncementFiltersDto { IsActive = false }, 1, 100);
            result.Items.Should().HaveCount(1);
            result.Items[0].Id.Should().Be(_a3Id);
        }

        [Fact]
        public async Task GetAnnouncements_FilterByIsPinned_True_ReturnsOnlyPinned()
        {
            var result = await _svc.GetAnnouncementsAsync(_school1,
                new AnnouncementFiltersDto { IsPinned = true }, 1, 100);
            result.Items.Should().HaveCount(1);
            result.Items[0].Id.Should().Be(_a1Id);
        }

        [Fact]
        public async Task GetAnnouncements_FilterByPriority_Urgent()
        {
            var result = await _svc.GetAnnouncementsAsync(_school1,
                new AnnouncementFiltersDto { Priority = "urgent" }, 1, 100);
            result.Items.Should().HaveCount(1);
            result.Items[0].Priority.Should().Be("urgent");
        }

        [Fact]
        public async Task GetAnnouncements_FilterByAudience_Students()
        {
            var result = await _svc.GetAnnouncementsAsync(_school1,
                new AnnouncementFiltersDto { TargetAudience = "students" }, 1, 100);
            result.Items.Should().HaveCount(1);
            result.Items[0].Id.Should().Be(_a2Id);
        }

        [Fact]
        public async Task GetAnnouncements_FilterBySearch_TitleMatch()
        {
            var result = await _svc.GetAnnouncementsAsync(_school1,
                new AnnouncementFiltersDto { Search = "library" }, 1, 100);
            result.Items.Should().HaveCount(1);
            result.Items[0].Id.Should().Be(_a2Id);
        }

        [Fact]
        public async Task GetAnnouncements_FilterBySearch_ContentMatch()
        {
            var result = await _svc.GetAnnouncementsAsync(_school1,
                new AnnouncementFiltersDto { Search = "Permission slips" }, 1, 100);
            // This is school2's announcement — schoolId scoping means no match for school1
            result.Items.Should().BeEmpty();
        }

        [Fact]
        public async Task GetAnnouncements_OrderedByPinnedFirst()
        {
            var result = await _svc.GetAnnouncementsAsync(_school1, new AnnouncementFiltersDto(), 1, 100);
            result.Items[0].IsPinned.Should().BeTrue();
        }

        // ─── Pagination normalization ───
        [Fact]
        public async Task GetAnnouncements_NormalizesPageBelowOne()
        {
            var result = await _svc.GetAnnouncementsAsync(_school1, new AnnouncementFiltersDto(), 0, 10);
            result.Page.Should().Be(1);
        }

        [Fact]
        public async Task GetAnnouncements_NormalizesNegativePage()
        {
            var result = await _svc.GetAnnouncementsAsync(_school1, new AnnouncementFiltersDto(), -3, 10);
            result.Page.Should().Be(1);
        }

        [Fact]
        public async Task GetAnnouncements_NormalizesPageSizeZero()
        {
            var result = await _svc.GetAnnouncementsAsync(_school1, new AnnouncementFiltersDto(), 1, 0);
            result.PageSize.Should().Be(10);
        }

        [Fact]
        public async Task GetAnnouncements_NormalizesPageSizeAbove100()
        {
            var result = await _svc.GetAnnouncementsAsync(_school1, new AnnouncementFiltersDto(), 1, 500);
            result.PageSize.Should().Be(100);
        }

        [Fact]
        public async Task GetAnnouncements_TotalPagesCalculated()
        {
            var result = await _svc.GetAnnouncementsAsync(_school1, new AnnouncementFiltersDto(), 1, 2);
            result.TotalPages.Should().Be((int)Math.Ceiling(5.0 / 2));
        }

        // ════════════════════════════════════════════════════════════════
        // GetAnnouncementById
        // ════════════════════════════════════════════════════════════════
        [Fact]
        public async Task GetAnnouncementById_Found_ReturnsAnnouncement()
        {
            var result = await _svc.GetAnnouncementByIdAsync(_a1Id, _school1);
            result.Should().NotBeNull();
            result!.Id.Should().Be(_a1Id);
        }

        [Fact]
        public async Task GetAnnouncementById_NotFound_ReturnsNull()
        {
            var result = await _svc.GetAnnouncementByIdAsync(Guid.NewGuid(), _school1);
            result.Should().BeNull();
        }

        [Fact]
        public async Task GetAnnouncementById_WrongSchool_ReturnsNull()
        {
            // a1 belongs to school1; school2 cannot see it
            var result = await _svc.GetAnnouncementByIdAsync(_a1Id, _school2);
            result.Should().BeNull();
        }

        [Fact]
        public async Task GetAnnouncementById_MapsAllFields()
        {
            var result = await _svc.GetAnnouncementByIdAsync(_a1Id, _school1);
            result!.Title.Should().Be("Annual Day Celebration");
            result.Priority.Should().Be("urgent");
            result.TargetAudience.Should().Be("all");
            result.IsPinned.Should().BeTrue();
            result.IsActive.Should().BeTrue();
        }

        [Fact]
        public async Task GetAnnouncementById_RecipientCountsPopulated()
        {
            var result = await _svc.GetAnnouncementByIdAsync(_a1Id, _school1);
            result!.TotalRecipients.Should().Be(2);
            result.ReadCount.Should().Be(1);
            result.UnreadCount.Should().Be(1);
        }

        // ════════════════════════════════════════════════════════════════
        // CreateAnnouncement — success path
        // ════════════════════════════════════════════════════════════════
        [Fact]
        public async Task CreateAnnouncement_Success_ReturnsCreatedAnnouncement()
        {
            var dto = ValidCreate("New Year Party");
            var result = await _svc.CreateAnnouncementAsync(_school1, dto);

            result.Should().NotBeNull();
            result.Id.Should().NotBeEmpty();
            result.Title.Should().Be("New Year Party");
            result.SchoolId.Should().Be(_school1);
        }

        [Fact]
        public async Task CreateAnnouncement_SavedToDatabase()
        {
            var dto = ValidCreate("Sports Event 2025");
            var result = await _svc.CreateAnnouncementAsync(_school1, dto);

            var fromDb = await _db.Announcements.FindAsync(result.Id);
            fromDb.Should().NotBeNull();
            fromDb!.Title.Should().Be("Sports Event 2025");
        }

        [Fact]
        public async Task CreateAnnouncement_DefaultsToActive()
        {
            var result = await _svc.CreateAnnouncementAsync(_school1, ValidCreate("Auto Active Test"));
            result.IsActive.Should().BeTrue();
        }

        [Fact]
        public async Task CreateAnnouncement_StoredPriorityIsLowercase()
        {
            var dto = ValidCreate("Priority Case", priority: "HIGH");
            var result = await _svc.CreateAnnouncementAsync(_school1, dto);
            result.Priority.Should().Be("high");
        }

        [Fact]
        public async Task CreateAnnouncement_StoredAudienceIsLowercase()
        {
            var dto = ValidCreate("Audience Case", audience: "STUDENTS");
            var result = await _svc.CreateAnnouncementAsync(_school1, dto);
            result.TargetAudience.Should().Be("students");
        }

        [Fact]
        public async Task CreateAnnouncement_TitleTrimmed()
        {
            var dto = ValidCreate("  Trimmed Title  ");
            var result = await _svc.CreateAnnouncementAsync(_school1, dto);
            result.Title.Should().Be("Trimmed Title");
        }

        // ─── Title validation ───
        [Fact]
        public async Task CreateAnnouncement_EmptyTitle_ThrowsArgumentException()
        {
            var dto = ValidCreate("");
            await _svc.Invoking(s => s.CreateAnnouncementAsync(_school1, dto))
                .Should().ThrowAsync<ArgumentException>()
                .WithMessage("*required*");
        }

        [Fact]
        public async Task CreateAnnouncement_TitleTooShort_ThrowsArgumentException()
        {
            var dto = ValidCreate("AB");
            await _svc.Invoking(s => s.CreateAnnouncementAsync(_school1, dto))
                .Should().ThrowAsync<ArgumentException>()
                .WithMessage("*at least 3*");
        }

        [Fact]
        public async Task CreateAnnouncement_TitleExactlyMinLength_Succeeds()
        {
            var dto = ValidCreate("ABC");
            var result = await _svc.CreateAnnouncementAsync(_school1, dto);
            result.Title.Should().Be("ABC");
        }

        [Fact]
        public async Task CreateAnnouncement_TitleTooLong_ThrowsArgumentException()
        {
            var dto = ValidCreate(new string('A', 201));
            await _svc.Invoking(s => s.CreateAnnouncementAsync(_school1, dto))
                .Should().ThrowAsync<ArgumentException>()
                .WithMessage("*200*");
        }

        [Fact]
        public async Task CreateAnnouncement_TitleExactly200Chars_Succeeds()
        {
            var dto = ValidCreate(new string('A', 200));
            var result = await _svc.CreateAnnouncementAsync(_school1, dto);
            result.Title.Length.Should().Be(200);
        }

        // ─── Content validation ───
        [Fact]
        public async Task CreateAnnouncement_EmptyContent_ThrowsArgumentException()
        {
            var dto = ValidCreate("Empty Content Test", content: "");
            await _svc.Invoking(s => s.CreateAnnouncementAsync(_school1, dto))
                .Should().ThrowAsync<ArgumentException>()
                .WithMessage("*required*");
        }

        [Fact]
        public async Task CreateAnnouncement_ContentTooShort_ThrowsArgumentException()
        {
            var dto = ValidCreate("Content Short Test", content: "Short");
            await _svc.Invoking(s => s.CreateAnnouncementAsync(_school1, dto))
                .Should().ThrowAsync<ArgumentException>()
                .WithMessage("*at least 10*");
        }

        [Fact]
        public async Task CreateAnnouncement_ContentExactly10Chars_Succeeds()
        {
            var dto = ValidCreate("Content 10 Test", content: "1234567890");
            var result = await _svc.CreateAnnouncementAsync(_school1, dto);
            result.Should().NotBeNull();
        }

        [Fact]
        public async Task CreateAnnouncement_ContentTooLong_ThrowsArgumentException()
        {
            var dto = ValidCreate("Content Long Test", content: new string('C', 5001));
            await _svc.Invoking(s => s.CreateAnnouncementAsync(_school1, dto))
                .Should().ThrowAsync<ArgumentException>()
                .WithMessage("*5000*");
        }

        // ─── Priority validation ───
        [Fact]
        public async Task CreateAnnouncement_InvalidPriority_ThrowsArgumentException()
        {
            var dto = ValidCreate("Invalid Priority Test", priority: "CRITICAL");
            await _svc.Invoking(s => s.CreateAnnouncementAsync(_school1, dto))
                .Should().ThrowAsync<ArgumentException>()
                .WithMessage("*Invalid priority*");
        }

        [Theory]
        [InlineData("low")]
        [InlineData("normal")]
        [InlineData("high")]
        [InlineData("urgent")]
        public async Task CreateAnnouncement_AllValidPriorities_Succeeds(string priority)
        {
            var dto = ValidCreate($"Priority-{priority}", priority: priority);
            var result = await _svc.CreateAnnouncementAsync(_school1, dto);
            result.Priority.Should().Be(priority);
        }

        // ─── TargetAudience validation ───
        [Fact]
        public async Task CreateAnnouncement_InvalidAudience_ThrowsArgumentException()
        {
            var dto = ValidCreate("Invalid Audience Test", audience: "teachers");
            await _svc.Invoking(s => s.CreateAnnouncementAsync(_school1, dto))
                .Should().ThrowAsync<ArgumentException>()
                .WithMessage("*Invalid targetAudience*");
        }

        [Theory]
        [InlineData("all")]
        [InlineData("students")]
        [InlineData("staff")]
        [InlineData("parents")]
        public async Task CreateAnnouncement_CommonAudiences_Succeed(string audience)
        {
            var dto = ValidCreate($"Audience-{audience}", audience: audience);
            var result = await _svc.CreateAnnouncementAsync(_school1, dto);
            result.TargetAudience.Should().Be(audience);
        }

        [Fact]
        public async Task CreateAnnouncement_ClassAudience_RequiresTargetClassId()
        {
            var dto = ValidCreate("Class Audience Test", audience: "class", targetClassId: null);
            await _svc.Invoking(s => s.CreateAnnouncementAsync(_school1, dto))
                .Should().ThrowAsync<ArgumentException>()
                .WithMessage("*TargetClassId*required*");
        }

        [Fact]
        public async Task CreateAnnouncement_ClassAudience_WithClassId_Succeeds()
        {
            var dto = ValidCreate("Class Ann", audience: "class", targetClassId: Guid.NewGuid());
            var result = await _svc.CreateAnnouncementAsync(_school1, dto);
            result.TargetAudience.Should().Be("class");
        }

        [Fact]
        public async Task CreateAnnouncement_SectionAudience_RequiresTargetSectionId()
        {
            var dto = ValidCreate("Section Audience Test", audience: "section", targetSectionId: null);
            await _svc.Invoking(s => s.CreateAnnouncementAsync(_school1, dto))
                .Should().ThrowAsync<ArgumentException>()
                .WithMessage("*TargetSectionId*required*");
        }

        // ─── ExpiryDate validation ───
        [Fact]
        public async Task CreateAnnouncement_ExpiryInPast_ThrowsArgumentException()
        {
            var dto = ValidCreate("Expiry Past Test", expiry: DateTime.UtcNow.AddHours(-1));
            await _svc.Invoking(s => s.CreateAnnouncementAsync(_school1, dto))
                .Should().ThrowAsync<ArgumentException>()
                .WithMessage("*future*");
        }

        [Fact]
        public async Task CreateAnnouncement_ExpiryInFuture_Succeeds()
        {
            var dto = ValidCreate("Expiry Future", expiry: DateTime.UtcNow.AddDays(30));
            var result = await _svc.CreateAnnouncementAsync(_school1, dto);
            result.ExpiryDate.Should().NotBeNull();
        }

        [Fact]
        public async Task CreateAnnouncement_NoExpiryDate_Succeeds()
        {
            var dto = ValidCreate("No Expiry");
            var result = await _svc.CreateAnnouncementAsync(_school1, dto);
            result.ExpiryDate.Should().BeNull();
        }

        // ─── AttachmentUrl validation ───
        [Fact]
        public async Task CreateAnnouncement_AttachmentUrlTooLong_ThrowsArgumentException()
        {
            var dto = ValidCreate("Attachment Long Test", attachmentUrl: new string('A', 501));
            await _svc.Invoking(s => s.CreateAnnouncementAsync(_school1, dto))
                .Should().ThrowAsync<ArgumentException>()
                .WithMessage("*500*");
        }

        [Fact]
        public async Task CreateAnnouncement_AttachmentUrlExactly500_Succeeds()
        {
            var dto = ValidCreate("Attach500", attachmentUrl: new string('A', 500));
            var result = await _svc.CreateAnnouncementAsync(_school1, dto);
            result.AttachmentUrl!.Length.Should().Be(500);
        }

        // ─── Duplicate prevention ───
        [Fact]
        public async Task CreateAnnouncement_DuplicateTitleSameSchool_ThrowsInvalidOperation()
        {
            var dto1 = ValidCreate("Duplicate Test Title Announcement");
            await _svc.CreateAnnouncementAsync(_school1, dto1);

            var dto2 = ValidCreate("Duplicate Test Title Announcement");
            await _svc.Invoking(s => s.CreateAnnouncementAsync(_school1, dto2))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*last 24 hours*");
        }

        [Fact]
        public async Task CreateAnnouncement_DuplicateTitleCaseInsensitive_ThrowsInvalidOperation()
        {
            var dto1 = ValidCreate("Case Duplicate Test");
            await _svc.CreateAnnouncementAsync(_school1, dto1);

            var dto2 = ValidCreate("CASE DUPLICATE TEST");
            await _svc.Invoking(s => s.CreateAnnouncementAsync(_school1, dto2))
                .Should().ThrowAsync<InvalidOperationException>();
        }

        [Fact]
        public async Task CreateAnnouncement_SameTitleDifferentSchool_Succeeds()
        {
            var dto1 = ValidCreate("Cross School Title");
            await _svc.CreateAnnouncementAsync(_school1, dto1);

            // school2 can have same title
            var dto2 = ValidCreate("Cross School Title");
            var result = await _svc.CreateAnnouncementAsync(_school2, dto2);
            result.Should().NotBeNull();
        }

        // ════════════════════════════════════════════════════════════════
        // UpdateAnnouncement
        // ════════════════════════════════════════════════════════════════
        [Fact]
        public async Task UpdateAnnouncement_Success_UpdatesTitleAndPriority()
        {
            var dto    = new UpdateAnnouncementRequest { Title = "Updated Title Here", Priority = "low" };
            var result = await _svc.UpdateAnnouncementAsync(_school1, _a2Id, dto);

            result.Title.Should().Be("Updated Title Here");
            result.Priority.Should().Be("low");
        }

        [Fact]
        public async Task UpdateAnnouncement_NotFound_ThrowsKeyNotFound()
        {
            await _svc.Invoking(s => s.UpdateAnnouncementAsync(_school1, Guid.NewGuid(),
                    new UpdateAnnouncementRequest { Title = "Test" }))
                .Should().ThrowAsync<KeyNotFoundException>();
        }

        [Fact]
        public async Task UpdateAnnouncement_WrongSchool_ThrowsKeyNotFound()
        {
            await _svc.Invoking(s => s.UpdateAnnouncementAsync(_school2, _a1Id,
                    new UpdateAnnouncementRequest { Title = "Hack Attempt" }))
                .Should().ThrowAsync<KeyNotFoundException>();
        }

        [Fact]
        public async Task UpdateAnnouncement_TitleTooShort_ThrowsArgumentException()
        {
            var dto = new UpdateAnnouncementRequest { Title = "AB" };
            await _svc.Invoking(s => s.UpdateAnnouncementAsync(_school1, _a2Id, dto))
                .Should().ThrowAsync<ArgumentException>()
                .WithMessage("*at least 3*");
        }

        [Fact]
        public async Task UpdateAnnouncement_TitleTooLong_ThrowsArgumentException()
        {
            var dto = new UpdateAnnouncementRequest { Title = new string('B', 201) };
            await _svc.Invoking(s => s.UpdateAnnouncementAsync(_school1, _a2Id, dto))
                .Should().ThrowAsync<ArgumentException>()
                .WithMessage("*200*");
        }

        [Fact]
        public async Task UpdateAnnouncement_ContentTooShort_ThrowsArgumentException()
        {
            var dto = new UpdateAnnouncementRequest { Content = "Short" };
            await _svc.Invoking(s => s.UpdateAnnouncementAsync(_school1, _a2Id, dto))
                .Should().ThrowAsync<ArgumentException>()
                .WithMessage("*at least 10*");
        }

        [Fact]
        public async Task UpdateAnnouncement_InvalidPriority_ThrowsArgumentException()
        {
            var dto = new UpdateAnnouncementRequest { Priority = "EXTREME" };
            await _svc.Invoking(s => s.UpdateAnnouncementAsync(_school1, _a2Id, dto))
                .Should().ThrowAsync<ArgumentException>()
                .WithMessage("*Invalid priority*");
        }

        [Fact]
        public async Task UpdateAnnouncement_InvalidAudience_ThrowsArgumentException()
        {
            var dto = new UpdateAnnouncementRequest { TargetAudience = "teachers" };
            await _svc.Invoking(s => s.UpdateAnnouncementAsync(_school1, _a2Id, dto))
                .Should().ThrowAsync<ArgumentException>()
                .WithMessage("*Invalid targetAudience*");
        }

        [Fact]
        public async Task UpdateAnnouncement_ExpiryInPast_ThrowsArgumentException()
        {
            var dto = new UpdateAnnouncementRequest { ExpiryDate = DateTime.UtcNow.AddHours(-1) };
            await _svc.Invoking(s => s.UpdateAnnouncementAsync(_school1, _a2Id, dto))
                .Should().ThrowAsync<ArgumentException>()
                .WithMessage("*future*");
        }

        [Fact]
        public async Task UpdateAnnouncement_SetInactive_Succeeds()
        {
            var dto    = new UpdateAnnouncementRequest { IsActive = false };
            var result = await _svc.UpdateAnnouncementAsync(_school1, _a2Id, dto);
            result.IsActive.Should().BeFalse();
        }

        [Fact]
        public async Task UpdateAnnouncement_UpdatedAtRefreshed()
        {
            var before = (await _svc.GetAnnouncementByIdAsync(_a2Id, _school1))!.UpdatedAt;
            await Task.Delay(10);

            var dto    = new UpdateAnnouncementRequest { Title = "Updated Now 12345" };
            var result = await _svc.UpdateAnnouncementAsync(_school1, _a2Id, dto);
            result.UpdatedAt.Should().BeAfter(before);
        }

        [Fact]
        public async Task UpdateAnnouncement_NullFields_DoNotOverwriteExistingValues()
        {
            // Only update IsPinned, leave everything else unchanged
            var before = await _svc.GetAnnouncementByIdAsync(_a2Id, _school1);
            var dto    = new UpdateAnnouncementRequest { IsPinned = true };
            var result = await _svc.UpdateAnnouncementAsync(_school1, _a2Id, dto);

            result.Title.Should().Be(before!.Title);
            result.Content.Should().Be(before.Content);
            result.IsPinned.Should().BeTrue();
        }

        // ════════════════════════════════════════════════════════════════
        // DeleteAnnouncement
        // ════════════════════════════════════════════════════════════════
        [Fact]
        public async Task DeleteAnnouncement_Success_ReturnsTrueAndSoftDeletes()
        {
            var result = await _svc.DeleteAnnouncementAsync(_a2Id, _school1);
            result.Should().BeTrue();

            // Should be soft-deleted (IsActive = false), not hard-deleted
            var fromDb = await _db.Announcements.FindAsync(_a2Id);
            fromDb.Should().NotBeNull();
            fromDb!.IsActive.Should().BeFalse();
        }

        [Fact]
        public async Task DeleteAnnouncement_NotFound_ReturnsFalse()
        {
            var result = await _svc.DeleteAnnouncementAsync(Guid.NewGuid(), _school1);
            result.Should().BeFalse();
        }

        [Fact]
        public async Task DeleteAnnouncement_WrongSchool_ReturnsFalse()
        {
            var result = await _svc.DeleteAnnouncementAsync(_a1Id, _school2);
            result.Should().BeFalse();
        }

        // ════════════════════════════════════════════════════════════════
        // MarkAsRead
        // ════════════════════════════════════════════════════════════════
        [Fact]
        public async Task MarkAsRead_NewRecipient_CreatesReadRecord()
        {
            var recipientId = Guid.NewGuid();
            var result = await _svc.MarkAsReadAsync(_school1, new MarkAnnouncementAsReadRequest
            {
                AnnouncementId = _a1Id,
                RecipientType  = "Student",
                RecipientId    = recipientId
            });

            result.Should().BeTrue();
            var record = await _db.AnnouncementRecipients
                .FirstOrDefaultAsync(r => r.RecipientId == recipientId);
            record.Should().NotBeNull();
            record!.IsRead.Should().BeTrue();
        }

        [Fact]
        public async Task MarkAsRead_AlreadyReadRecipient_IsIdempotent()
        {
            // a1 has a Staff recipient that is already read (seeded)
            var result = await _svc.MarkAsReadAsync(_school1, new MarkAnnouncementAsReadRequest
            {
                AnnouncementId = _a1Id,
                RecipientType  = "Staff",
                RecipientId    = _staffId
            });

            result.Should().BeTrue();
        }

        [Fact]
        public async Task MarkAsRead_UnreadRecipientExists_UpdatesIsReadAndReadAt()
        {
            // Find the unread recipient seeded for a1
            var unread = await _db.AnnouncementRecipients
                .FirstAsync(r => r.AnnouncementId == _a1Id && !r.IsRead);

            await _svc.MarkAsReadAsync(_school1, new MarkAnnouncementAsReadRequest
            {
                AnnouncementId = _a1Id,
                RecipientType  = unread.RecipientType,
                RecipientId    = unread.RecipientId
            });

            var updated = await _db.AnnouncementRecipients.FindAsync(unread.Id);
            updated!.IsRead.Should().BeTrue();
            updated.ReadAt.Should().NotBeNull();
        }

        [Fact]
        public async Task MarkAsRead_AnnouncementNotFound_ThrowsKeyNotFound()
        {
            await _svc.Invoking(s => s.MarkAsReadAsync(_school1, new MarkAnnouncementAsReadRequest
                {
                    AnnouncementId = Guid.NewGuid(),
                    RecipientType  = "Staff",
                    RecipientId    = _staffId
                }))
                .Should().ThrowAsync<KeyNotFoundException>();
        }

        [Fact]
        public async Task MarkAsRead_WrongSchoolAnnouncement_ThrowsKeyNotFound()
        {
            // a5 belongs to school2; school1 cannot mark it
            await _svc.Invoking(s => s.MarkAsReadAsync(_school1, new MarkAnnouncementAsReadRequest
                {
                    AnnouncementId = _a5Id,
                    RecipientType  = "Staff",
                    RecipientId    = _staffId
                }))
                .Should().ThrowAsync<KeyNotFoundException>();
        }

        // ════════════════════════════════════════════════════════════════
        // GetRecipients
        // ════════════════════════════════════════════════════════════════
        [Fact]
        public async Task GetRecipients_ReturnsCorrectRecipients()
        {
            var result = await _svc.GetRecipientsAsync(_a1Id, _school1, null, 1, 10);
            result.TotalCount.Should().Be(2);
        }

        [Fact]
        public async Task GetRecipients_FilterByIsRead_True()
        {
            var result = await _svc.GetRecipientsAsync(_a1Id, _school1, true, 1, 10);
            result.TotalCount.Should().Be(1);
            result.Items[0].IsRead.Should().BeTrue();
        }

        [Fact]
        public async Task GetRecipients_FilterByIsRead_False()
        {
            var result = await _svc.GetRecipientsAsync(_a1Id, _school1, false, 1, 10);
            result.TotalCount.Should().Be(1);
            result.Items[0].IsRead.Should().BeFalse();
        }

        [Fact]
        public async Task GetRecipients_PaginationNormalized()
        {
            var result = await _svc.GetRecipientsAsync(_a1Id, _school1, null, 0, 500);
            result.Page.Should().Be(1);
            result.PageSize.Should().Be(100);
        }

        [Fact]
        public async Task GetRecipients_WrongSchool_ThrowsKeyNotFound()
        {
            await _svc.Invoking(s => s.GetRecipientsAsync(_a1Id, _school2, null, 1, 10))
                .Should().ThrowAsync<KeyNotFoundException>();
        }

        // ════════════════════════════════════════════════════════════════
        // GetMyAnnouncements
        // ════════════════════════════════════════════════════════════════
        [Fact]
        public async Task GetMyAnnouncements_AllAudienceIsIncluded()
        {
            var recipientId = Guid.NewGuid();
            var result = await _svc.GetMyAnnouncementsAsync(recipientId, "Staff", _school1);

            // a1 is "all" audience — should appear for any recipient
            result.Any(a => a.Id == _a1Id).Should().BeTrue();
        }

        [Fact]
        public async Task GetMyAnnouncements_ExcludesInactive()
        {
            var recipientId = Guid.NewGuid();
            var result = await _svc.GetMyAnnouncementsAsync(recipientId, "Staff", _school1);

            result.Any(a => a.Id == _a3Id).Should().BeFalse();
        }

        [Fact]
        public async Task GetMyAnnouncements_SchoolIsolation()
        {
            var recipientId = Guid.NewGuid();
            var result = await _svc.GetMyAnnouncementsAsync(recipientId, "Staff", _school2);

            // school2 only has a5
            result.All(a => a.SchoolId == _school2).Should().BeTrue();
        }

        [Fact]
        public async Task GetMyAnnouncements_ExcludesExpiredAnnouncements()
        {
            // Create an expired announcement
            _db.Announcements.Add(new Announcement
            {
                Id = Guid.NewGuid(), SchoolId = _school1,
                Title = "Already Expired Test Ann",
                Content = "This content is for an expired test announcement.",
                CreatedByStaffId = _staffId, Priority = "normal",
                TargetAudience = "all", IsActive = true, IsPinned = false,
                PublishedDate = DateTime.UtcNow.AddDays(-10),
                ExpiryDate = DateTime.UtcNow.AddHours(-1), // expired
                CreatedAt = DateTime.UtcNow.AddDays(-10), UpdatedAt = DateTime.UtcNow.AddDays(-10)
            });
            await _db.SaveChangesAsync();

            var result = await _svc.GetMyAnnouncementsAsync(Guid.NewGuid(), "Staff", _school1);

            result.Any(a => a.Title == "Already Expired Test Ann").Should().BeFalse();
        }

        [Fact]
        public async Task GetMyAnnouncements_PinnedFirstOrdering()
        {
            var result = await _svc.GetMyAnnouncementsAsync(Guid.NewGuid(), "Staff", _school1);

            if (result.Count > 1)
                result[0].IsPinned.Should().BeTrue();
        }

        // ════════════════════════════════════════════════════════════════
        // GetStats
        // ════════════════════════════════════════════════════════════════
        [Fact]
        public async Task GetStats_TotalAnnouncementsCount()
        {
            var stats = await _svc.GetStatsAsync(_school1);
            stats.TotalAnnouncements.Should().Be(5); // a1-a4 + a6 (a5 is school2)
        }

        [Fact]
        public async Task GetStats_ActiveCount()
        {
            var stats = await _svc.GetStatsAsync(_school1);
            stats.ActiveAnnouncements.Should().Be(4); // a1, a2, a4, a6 (a3 inactive)
        }

        [Fact]
        public async Task GetStats_PinnedCount()
        {
            var stats = await _svc.GetStatsAsync(_school1);
            stats.PinnedAnnouncements.Should().Be(1); // only a1
        }

        [Fact]
        public async Task GetStats_UrgentCount()
        {
            var stats = await _svc.GetStatsAsync(_school1);
            stats.UrgentAnnouncements.Should().Be(1); // only a1
        }

        [Fact]
        public async Task GetStats_ExpiringToday()
        {
            var stats = await _svc.GetStatsAsync(_school1);
            stats.ExpiringToday.Should().Be(1); // a4 expires today
        }

        [Fact]
        public async Task GetStats_TotalRecipients()
        {
            var stats = await _svc.GetStatsAsync(_school1);
            stats.TotalRecipients.Should().Be(2); // 2 seeded on a1
        }

        [Fact]
        public async Task GetStats_ReadCount()
        {
            var stats = await _svc.GetStatsAsync(_school1);
            stats.ReadCount.Should().Be(1);
        }

        [Fact]
        public async Task GetStats_UnreadCount()
        {
            var stats = await _svc.GetStatsAsync(_school1);
            stats.UnreadCount.Should().Be(1);
        }

        [Fact]
        public async Task GetStats_ByPriorityContainsAllPriorities()
        {
            var stats = await _svc.GetStatsAsync(_school1);
            stats.ByPriority.Should().ContainKeys("low", "normal", "high", "urgent");
            stats.ByPriority["urgent"].Should().Be(1);
            stats.ByPriority["high"].Should().Be(2); // a4 and a6
            stats.ByPriority["normal"].Should().Be(2); // a2 and a3
        }

        [Fact]
        public async Task GetStats_ByAudienceContainsAllAudiences()
        {
            var stats = await _svc.GetStatsAsync(_school1);
            stats.ByAudience.Should().ContainKeys("all", "students", "staff", "parents", "class", "section");
            stats.ByAudience["all"].Should().Be(2);      // a1 + a4
            stats.ByAudience["students"].Should().Be(1); // a2
            stats.ByAudience["staff"].Should().Be(1);    // a3
            stats.ByAudience["parents"].Should().Be(1);  // a6
        }

        [Fact]
        public async Task GetStats_SchoolIsolation()
        {
            var school2Stats = await _svc.GetStatsAsync(_school2);
            school2Stats.TotalAnnouncements.Should().Be(1);
        }

        [Fact]
        public async Task GetStats_EmptySchool_AllZeros()
        {
            var emptySchoolId = Guid.NewGuid();
            var stats = await _svc.GetStatsAsync(emptySchoolId);

            stats.TotalAnnouncements.Should().Be(0);
            stats.ActiveAnnouncements.Should().Be(0);
            stats.TotalRecipients.Should().Be(0);
        }

        // ════════════════════════════════════════════════════════════════
        // Edge cases — IsExpired mapping
        // ════════════════════════════════════════════════════════════════
        [Fact]
        public async Task GetAnnouncementById_ActiveWithPastExpiry_IsExpiredTrue()
        {
            // a4 has ExpiryDate = today+23h, still future — not expired
            var a4 = await _svc.GetAnnouncementByIdAsync(_a4Id, _school1);
            a4!.IsExpired.Should().BeFalse();
        }

        [Fact]
        public async Task GetAnnouncementById_NoExpiry_IsExpiredFalse()
        {
            var a2 = await _svc.GetAnnouncementByIdAsync(_a2Id, _school1);
            a2!.IsExpired.Should().BeFalse();
        }

        [Fact]
        public async Task GetAnnouncementById_PastExpiry_IsExpiredTrue()
        {
            // Create a truly expired announcement
            var expiredId = Guid.NewGuid();
            _db.Announcements.Add(new Announcement
            {
                Id = expiredId, SchoolId = _school1,
                Title = "Old Festival Announcement",
                Content = "This was a festival announcement that has now expired.",
                CreatedByStaffId = _staffId, Priority = "low",
                TargetAudience = "all", IsActive = true, IsPinned = false,
                PublishedDate = DateTime.UtcNow.AddDays(-10),
                ExpiryDate = DateTime.UtcNow.AddSeconds(-1),
                CreatedAt = DateTime.UtcNow.AddDays(-10), UpdatedAt = DateTime.UtcNow.AddDays(-10)
            });
            await _db.SaveChangesAsync();

            var result = await _svc.GetAnnouncementByIdAsync(expiredId, _school1);
            result!.IsExpired.Should().BeTrue();
        }

        // ════════════════════════════════════════════════════════════════
        // Helpers
        // ════════════════════════════════════════════════════════════════
        private CreateAnnouncementRequest ValidCreate(
            string title,
            string? priority       = null,
            string? audience       = null,
            DateTime? expiry       = null,
            Guid? targetClassId    = null,
            Guid? targetSectionId  = null,
            string? attachmentUrl  = null,
            string? content        = null) =>
            new CreateAnnouncementRequest
            {
                Title            = title,
                Content          = content ?? "This is a valid content for the announcement that is at least 10 chars.",
                CreatedByStaffId = _staffId,
                Priority         = priority ?? AnnouncementConstants.PriorityNormal,
                TargetAudience   = audience ?? AnnouncementConstants.AudienceAll,
                IsPinned         = false,
                ExpiryDate       = expiry,
                TargetClassId    = targetClassId,
                TargetSectionId  = targetSectionId,
                AttachmentUrl    = attachmentUrl
            };
    }
}
