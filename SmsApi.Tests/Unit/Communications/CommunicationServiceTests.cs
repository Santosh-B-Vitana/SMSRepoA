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
using StaffEntity = SmsApi.Models.Entities.Staff;

namespace SmsApi.Tests.Unit.Communications
{
    public class CommTestLogger<T> : ILogger<T>
    {
        public IDisposable BeginScope<TState>(TState state) => null!;
        public bool IsEnabled(LogLevel logLevel) => true;
        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter) { }
    }

    public class CommunicationServiceTests : IDisposable
    {
        private readonly AppDbContext _context;
        private readonly CommunicationService _service;
        private readonly Guid _schoolId = Guid.NewGuid();
        private readonly Guid _staffId = Guid.NewGuid();
        private readonly Guid _staffUserId = Guid.NewGuid(); // UserLogin.Id
        private readonly Guid _parentUserId = Guid.NewGuid(); // UserLogin.Id
        private readonly Guid _studentId = Guid.NewGuid();
        private readonly Guid _announcementId = Guid.NewGuid();

        public CommunicationServiceTests()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
                .Options;

            _context = new AppDbContext(options);
            var logger = new CommTestLogger<CommunicationService>();
            _service = new CommunicationService(_context, logger);
            SeedTestData().GetAwaiter().GetResult();
        }

        public void Dispose() => _context?.Dispose();

        private async Task SeedTestData()
        {
            var school = new School
            {
                Id = _schoolId,
                Name = "Comm Test School",
                SchoolCode = "COMM001",
                Address = "1 Comm St",
                Phone = "1234567890",
                Email = "comm@test.com",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Schools.Add(school);

            var staffLogin = new UserLogin
            {
                Id = _staffUserId,
                Email = "staff@commtest.com",
                Username = "staff.comm",
                PasswordHash = "hash",
                Role = "Staff",
                FirstName = "Staff",
                LastName = "Member",
                SchoolId = _schoolId,
                Status = "active",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.UserLogins.Add(staffLogin);

            var parentLogin = new UserLogin
            {
                Id = _parentUserId,
                Email = "parent@commtest.com",
                Username = "parent.comm",
                PasswordHash = "hash",
                Role = "Parent",
                FirstName = "Parent",
                LastName = "User",
                SchoolId = _schoolId,
                Status = "active",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.UserLogins.Add(parentLogin);

            var staffMember = new StaffEntity
            {
                Id = _staffId,
                SchoolId = _schoolId,
                FirstName = "Staff",
                LastName = "Member",
                Name = "Staff Member",
                Email = "staff@commtest.com",
                EmployeeId = "EMP001",
                Phone = "1234567890",
                DateOfBirth = new DateTime(1990, 1, 1),
                Gender = "Male",
                Address = "1 Staff St",
                Department = "Teaching",
                Status = "Active",
                IsActive = true,
                JoiningDate = DateTime.UtcNow.AddYears(-1),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.StaffMembers.Add(staffMember);

            var student = new Student
            {
                Id = _studentId,
                SchoolId = _schoolId,
                Name = "Test Student",
                FirstName = "Test",
                LastName = "Student",
                AdmissionNumber = "ADM001",
                Class = "10",
                Section = "A",
                Status = "Active",
                Email = "student@commtest.com",
                DateOfBirth = new DateTime(2010, 1, 1),
                Gender = "Male",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Students.Add(student);

            // Announcement with recipient for acknowledge tests
            var announcement = new Announcement
            {
                Id = _announcementId,
                SchoolId = _schoolId,
                Title = "Existing Announcement",
                Content = "Existing content for testing purposes",
                TargetAudience = "all",
                Priority = "medium",
                CreatedByStaffId = _staffId,
                IsActive = true,
                PublishedDate = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow.AddHours(-25), // 25 hours ago (not duplicate)
                UpdatedAt = DateTime.UtcNow
            };
            _context.Announcements.Add(announcement);

            var recipient = new AnnouncementRecipient
            {
                Id = Guid.NewGuid(),
                AnnouncementId = _announcementId,
                RecipientId = _staffUserId,
                RecipientType = "Staff",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };
            _context.AnnouncementRecipients.Add(recipient);

            await _context.SaveChangesAsync();
        }

        // ================================================================
        // GetAnnouncementsAsync - Pagination normalization
        // ================================================================

        [Fact]
        public async Task GetAnnouncementsAsync_NormalizesPageBelowOne()
        {
            var result = await _service.GetAnnouncementsAsync(_schoolId, new CommunicationFiltersDto(), 0, 20);
            result.Page.Should().Be(1);
        }

        [Fact]
        public async Task GetAnnouncementsAsync_NormalizesNegativePage()
        {
            var result = await _service.GetAnnouncementsAsync(_schoolId, new CommunicationFiltersDto(), -5, 20);
            result.Page.Should().Be(1);
        }

        [Fact]
        public async Task GetAnnouncementsAsync_NormalizesPageSizeAbove100()
        {
            var result = await _service.GetAnnouncementsAsync(_schoolId, new CommunicationFiltersDto(), 1, 200);
            result.PageSize.Should().Be(100);
        }

        [Fact]
        public async Task GetAnnouncementsAsync_NormalizesPageSizeZero()
        {
            var result = await _service.GetAnnouncementsAsync(_schoolId, new CommunicationFiltersDto(), 1, 0);
            result.PageSize.Should().Be(20);
        }

        [Fact]
        public async Task GetAnnouncementsAsync_ReturnsAnnouncementsForSchool()
        {
            var result = await _service.GetAnnouncementsAsync(_schoolId, new CommunicationFiltersDto(), 1, 20);
            result.Items.Should().NotBeNull();
            result.Items.Any(a => a.Id == _announcementId).Should().BeTrue();
        }

        [Fact]
        public async Task GetAnnouncementsAsync_FiltersDoNotReturnOtherSchoolData()
        {
            var otherSchoolId = Guid.NewGuid();
            var result = await _service.GetAnnouncementsAsync(otherSchoolId, new CommunicationFiltersDto(), 1, 20);
            result.Items.Should().BeEmpty();
        }

        // ================================================================
        // CreateAnnouncementAsync - Validation
        // ================================================================

        [Fact]
        public async Task CreateAnnouncement_ThrowsArgumentException_WhenTitleEmpty()
        {
            var dto = new CreateAnnouncementDto { Title = "", Content = "Valid content here", TargetAudience = "all", Priority = "medium" };
            var act = () => _service.CreateAnnouncementAsync(_schoolId, dto, _staffId);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*title*");
        }

        [Fact]
        public async Task CreateAnnouncement_ThrowsArgumentException_WhenTitleTooShort()
        {
            var dto = new CreateAnnouncementDto { Title = "AB", Content = "Valid content here", TargetAudience = "all", Priority = "medium" };
            var act = () => _service.CreateAnnouncementAsync(_schoolId, dto, _staffId);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*3 characters*");
        }

        [Fact]
        public async Task CreateAnnouncement_ThrowsArgumentException_WhenTitleTooLong()
        {
            var dto = new CreateAnnouncementDto
            {
                Title = new string('A', 201),
                Content = "Valid content here",
                TargetAudience = "all",
                Priority = "medium"
            };
            var act = () => _service.CreateAnnouncementAsync(_schoolId, dto, _staffId);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*200 characters*");
        }

        [Fact]
        public async Task CreateAnnouncement_ThrowsArgumentException_WhenContentEmpty()
        {
            var dto = new CreateAnnouncementDto { Title = "Valid Title", Content = "", TargetAudience = "all", Priority = "medium" };
            var act = () => _service.CreateAnnouncementAsync(_schoolId, dto, _staffId);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*content*");
        }

        [Fact]
        public async Task CreateAnnouncement_ThrowsArgumentException_WhenContentTooShort()
        {
            var dto = new CreateAnnouncementDto { Title = "Valid Title", Content = "Too short", TargetAudience = "all", Priority = "medium" };
            var act = () => _service.CreateAnnouncementAsync(_schoolId, dto, _staffId);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*10 characters*");
        }

        [Fact]
        public async Task CreateAnnouncement_ThrowsArgumentException_WhenContentTooLong()
        {
            var dto = new CreateAnnouncementDto
            {
                Title = "Valid Title",
                Content = new string('X', 5001),
                TargetAudience = "all",
                Priority = "medium"
            };
            var act = () => _service.CreateAnnouncementAsync(_schoolId, dto, _staffId);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*5000 characters*");
        }

        [Fact]
        public async Task CreateAnnouncement_ThrowsArgumentException_WhenInvalidTargetAudience()
        {
            var dto = new CreateAnnouncementDto { Title = "Valid Title", Content = "Valid content text", TargetAudience = "invalid_audience", Priority = "medium" };
            var act = () => _service.CreateAnnouncementAsync(_schoolId, dto, _staffId);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*target audience*");
        }

        [Theory]
        [InlineData("all")]
        [InlineData("students")]
        [InlineData("parents")]
        [InlineData("staff")]
        [InlineData("specific_class")]
        [InlineData("specific_section")]
        public async Task CreateAnnouncement_AcceptsValidTargetAudiences(string audience)
        {
            var dto = new CreateAnnouncementDto
            {
                Title = $"Title for {audience} test",
                Content = "Valid content that is at least ten characters long",
                TargetAudience = audience,
                Priority = "medium",
                PublishImmediately = false
            };
            var act = () => _service.CreateAnnouncementAsync(_schoolId, dto, _staffId);
            // Should not throw ArgumentException for audience (may throw KeyNotFoundException for staff in other school)
            await act.Should().NotThrowAsync<ArgumentException>();
        }

        [Fact]
        public async Task CreateAnnouncement_ThrowsArgumentException_WhenInvalidPriority()
        {
            var dto = new CreateAnnouncementDto { Title = "Valid Title", Content = "Valid content text", TargetAudience = "all", Priority = "extreme" };
            var act = () => _service.CreateAnnouncementAsync(_schoolId, dto, _staffId);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*priority*");
        }

        [Theory]
        [InlineData("low")]
        [InlineData("medium")]
        [InlineData("high")]
        [InlineData("critical")]
        public async Task CreateAnnouncement_AcceptsValidPriorities(string priority)
        {
            var dto = new CreateAnnouncementDto
            {
                Title = $"Priority Test {priority}",
                Content = "Valid content that is at least ten characters long",
                TargetAudience = "all",
                Priority = priority
            };
            var act = () => _service.CreateAnnouncementAsync(_schoolId, dto, _staffId);
            await act.Should().NotThrowAsync<ArgumentException>();
        }

        [Fact]
        public async Task CreateAnnouncement_ThrowsArgumentException_WhenExpiryInPast()
        {
            var dto = new CreateAnnouncementDto
            {
                Title = "Valid Title",
                Content = "Valid content text here",
                TargetAudience = "all",
                Priority = "medium",
                ExpiryDate = DateTime.UtcNow.AddDays(-1)
            };
            var act = () => _service.CreateAnnouncementAsync(_schoolId, dto, _staffId);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*Expiry date*");
        }

        [Fact]
        public async Task CreateAnnouncement_ThrowsArgumentException_WhenScheduleTooFarAhead()
        {
            var dto = new CreateAnnouncementDto
            {
                Title = "Future Title",
                Content = "Valid content text here",
                TargetAudience = "all",
                Priority = "medium",
                ScheduleDate = DateTime.UtcNow.AddDays(400)
            };
            var act = () => _service.CreateAnnouncementAsync(_schoolId, dto, _staffId);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*1 year*");
        }

        // Creator validation removed - Staff.Id != UserLogin.Id, no UserId field on Staff

        [Fact]
        public async Task CreateAnnouncement_ThrowsInvalidOperationException_WhenDuplicate()
        {
            // Create first announcement
            _context.Announcements.Add(new Announcement
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolId,
                Title = "Duplicate Title Test",
                Content = "Duplicate content text",
                TargetAudience = "all",
                Priority = "medium",
                CreatedByStaffId = _staffId,
                IsActive = false,
                PublishedDate = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow.AddMinutes(-30), // within 24h
                UpdatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            var dto = new CreateAnnouncementDto
            {
                Title = "Duplicate Title Test",
                Content = "Duplicate content text",
                TargetAudience = "all",
                Priority = "medium"
            };
            var act = () => _service.CreateAnnouncementAsync(_schoolId, dto, _staffId);
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*similar announcement*");
        }

        [Fact]
        public async Task CreateAnnouncement_Succeeds_WithValidData()
        {
            var dto = new CreateAnnouncementDto
            {
                Title = "Valid Announcement Title",
                Content = "This is valid content that is definitely more than ten characters",
                TargetAudience = "all",
                Priority = "medium",
                PublishImmediately = true
            };
            var result = await _service.CreateAnnouncementAsync(_schoolId, dto, _staffId);
            result.Should().NotBeNull();
            result.Title.Should().Be("Valid Announcement Title");
        }

        // ================================================================
        // UpdateAnnouncementAsync - Enum validation
        // ================================================================

        [Fact]
        public async Task UpdateAnnouncement_ThrowsArgumentException_WhenInvalidPriority()
        {
            var dto = new UpdateAnnouncementDto { Priority = "ultra_high" };
            var act = () => _service.UpdateAnnouncementAsync(_schoolId, _announcementId, dto);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*priority*");
        }

        [Fact]
        public async Task UpdateAnnouncement_ThrowsArgumentException_WhenInvalidStatus()
        {
            var dto = new UpdateAnnouncementDto { Status = "deleted" };
            var act = () => _service.UpdateAnnouncementAsync(_schoolId, _announcementId, dto);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*tatus*");
        }

        [Fact]
        public async Task UpdateAnnouncement_ThrowsKeyNotFoundException_WhenNotFound()
        {
            var dto = new UpdateAnnouncementDto { Title = "Updated" };
            var act = () => _service.UpdateAnnouncementAsync(_schoolId, Guid.NewGuid(), dto);
            await act.Should().ThrowAsync<KeyNotFoundException>();
        }

        [Fact]
        public async Task UpdateAnnouncement_Succeeds_WithValidPriority()
        {
            var dto = new UpdateAnnouncementDto { Priority = "high" };
            var result = await _service.UpdateAnnouncementAsync(_schoolId, _announcementId, dto);
            result.Should().NotBeNull();
        }

        // ================================================================
        // PublishAnnouncementAsync - Idempotency
        // ================================================================

        [Fact]
        public async Task PublishAnnouncement_ThrowsInvalidOperation_WhenAlreadyPublished()
        {
            // Announcement is already IsActive = true from seed
            var act = () => _service.PublishAnnouncementAsync(_schoolId, _announcementId, _staffId);
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*already published*");
        }

        [Fact]
        public async Task PublishAnnouncement_Succeeds_WhenNotYetPublished()
        {
            var unpublishedId = Guid.NewGuid();
            _context.Announcements.Add(new Announcement
            {
                Id = unpublishedId,
                SchoolId = _schoolId,
                Title = "Draft Announcement",
                Content = "Draft content",
                TargetAudience = "all",
                Priority = "low",
                CreatedByStaffId = _staffId,
                IsActive = false,
                PublishedDate = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            var result = await _service.PublishAnnouncementAsync(_schoolId, unpublishedId, _staffId);
            result.Should().NotBeNull();
            result.Status.Should().Be("published");
        }

        [Fact]
        public async Task PublishAnnouncement_ThrowsKeyNotFoundException_WhenNotFound()
        {
            var act = () => _service.PublishAnnouncementAsync(_schoolId, Guid.NewGuid(), _staffId);
            await act.Should().ThrowAsync<KeyNotFoundException>();
        }

        // ================================================================
        // AcknowledgeAnnouncementAsync - Throws on missing recipient
        // ================================================================

        [Fact]
        public async Task AcknowledgeAnnouncement_ThrowsKeyNotFoundException_WhenNoRecipientRecord()
        {
            var unknownUserId = Guid.NewGuid();
            var act = () => _service.AcknowledgeAnnouncementAsync(_schoolId, _announcementId, unknownUserId);
            await act.Should().ThrowAsync<KeyNotFoundException>().WithMessage("*recipient*");
        }

        [Fact]
        public async Task AcknowledgeAnnouncement_Succeeds_WhenRecipientExists()
        {
            var act = () => _service.AcknowledgeAnnouncementAsync(_schoolId, _announcementId, _staffUserId);
            await act.Should().NotThrowAsync();

            var recipient = await _context.AnnouncementRecipients
                .FirstOrDefaultAsync(r => r.AnnouncementId == _announcementId && r.RecipientId == _staffUserId);
            recipient!.IsRead.Should().BeTrue();
            recipient.ReadAt.Should().NotBeNull();
        }

        // ================================================================
        // GetMessagesAsync - Pagination normalization
        // ================================================================

        [Fact]
        public async Task GetMessagesAsync_NormalizesPageBelowOne()
        {
            var result = await _service.GetMessagesAsync(_schoolId, new CommunicationFiltersDto(), 0, 20);
            result.Page.Should().Be(1);
        }

        [Fact]
        public async Task GetMessagesAsync_NormalizesPageSizeAbove100()
        {
            var result = await _service.GetMessagesAsync(_schoolId, new CommunicationFiltersDto(), 1, 150);
            result.PageSize.Should().Be(100);
        }

        // ================================================================
        // SendMessageAsync - Validation
        // ================================================================

        [Fact]
        public async Task SendMessage_ThrowsArgumentException_WhenNoRecipients()
        {
            var dto = new CreateMessageDto { ToUserIds = new List<Guid>(), Content = "Hello", Type = "email" };
            var act = () => _service.SendMessageAsync(_schoolId, dto, _staffId);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*recipient*");
        }

        [Fact]
        public async Task SendMessage_ThrowsArgumentException_WhenTooManyRecipients()
        {
            var dto = new CreateMessageDto
            {
                ToUserIds = Enumerable.Range(0, 501).Select(_ => Guid.NewGuid()).ToList(),
                Content = "Hello",
                Type = "email"
            };
            var act = () => _service.SendMessageAsync(_schoolId, dto, _staffId);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*500*");
        }

        [Fact]
        public async Task SendMessage_ThrowsArgumentException_WhenContentEmpty()
        {
            var dto = new CreateMessageDto
            {
                ToUserIds = new List<Guid> { Guid.NewGuid() },
                Content = "",
                Type = "email"
            };
            var act = () => _service.SendMessageAsync(_schoolId, dto, _staffId);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*content*");
        }

        [Fact]
        public async Task SendMessage_ThrowsArgumentException_WhenContentTooLong()
        {
            var dto = new CreateMessageDto
            {
                ToUserIds = new List<Guid> { Guid.NewGuid() },
                Content = new string('X', 5001),
                Type = "email"
            };
            var act = () => _service.SendMessageAsync(_schoolId, dto, _staffId);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*5000*");
        }

        [Fact]
        public async Task SendMessage_ThrowsArgumentException_WhenSubjectTooLong()
        {
            var dto = new CreateMessageDto
            {
                ToUserIds = new List<Guid> { Guid.NewGuid() },
                Content = "Valid content",
                Subject = new string('S', 201),
                Type = "email"
            };
            var act = () => _service.SendMessageAsync(_schoolId, dto, _staffId);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*subject*");
        }

        [Fact]
        public async Task SendMessage_ThrowsArgumentException_WhenInvalidType()
        {
            var dto = new CreateMessageDto
            {
                ToUserIds = new List<Guid> { Guid.NewGuid() },
                Content = "Valid content",
                Type = "telegram"
            };
            var act = () => _service.SendMessageAsync(_schoolId, dto, _staffId);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*type*");
        }

        [Theory]
        [InlineData("email")]
        [InlineData("sms")]
        [InlineData("push_notification")]
        [InlineData("whatsapp")]
        public async Task SendMessage_AcceptsValidMessageTypes(string type)
        {
            var dto = new CreateMessageDto
            {
                ToUserIds = new List<Guid> { Guid.NewGuid() },
                Content = "Valid message content",
                Type = type
            };
            var act = () => _service.SendMessageAsync(_schoolId, dto, _staffId);
            await act.Should().NotThrowAsync<ArgumentException>();
        }

        // ================================================================
        // BulkSendMessageAsync - Validation
        // ================================================================

        [Fact]
        public async Task BulkSendMessage_ThrowsArgumentException_WhenContentEmpty()
        {
            var dto = new BulkSendMessageDto { Content = "", TargetAudience = "all", Type = "email" };
            var act = () => _service.BulkSendMessageAsync(_schoolId, dto, _staffId);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*content*");
        }

        [Fact]
        public async Task BulkSendMessage_ThrowsArgumentException_WhenInvalidTargetAudience()
        {
            var dto = new BulkSendMessageDto { Content = "Hello", TargetAudience = "invalid", Type = "email" };
            var act = () => _service.BulkSendMessageAsync(_schoolId, dto, _staffId);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*target audience*");
        }

        [Fact]
        public async Task BulkSendMessage_ThrowsArgumentException_WhenInvalidType()
        {
            var dto = new BulkSendMessageDto { Content = "Hello", TargetAudience = "all", Type = "fax" };
            var act = () => _service.BulkSendMessageAsync(_schoolId, dto, _staffId);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*type*");
        }

        [Fact]
        public async Task BulkSendMessage_ThrowsArgumentException_WhenSubjectTooLong()
        {
            var dto = new BulkSendMessageDto
            {
                Content = "Hello",
                TargetAudience = "all",
                Type = "email",
                Subject = new string('S', 201)
            };
            var act = () => _service.BulkSendMessageAsync(_schoolId, dto, _staffId);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*subject*");
        }

        // ================================================================
        // CreateTemplateAsync - Validation
        // ================================================================

        [Fact]
        public async Task CreateTemplate_ThrowsArgumentException_WhenNameEmpty()
        {
            var dto = new CreateTemplateDto { Name = "", Type = "email", Category = "general", Content = "Content" };
            var act = () => _service.CreateTemplateAsync(_schoolId, dto);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*name*");
        }

        [Fact]
        public async Task CreateTemplate_ThrowsArgumentException_WhenNameTooShort()
        {
            var dto = new CreateTemplateDto { Name = "AB", Type = "email", Category = "general", Content = "Content" };
            var act = () => _service.CreateTemplateAsync(_schoolId, dto);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*3 characters*");
        }

        [Fact]
        public async Task CreateTemplate_ThrowsArgumentException_WhenNameTooLong()
        {
            var dto = new CreateTemplateDto
            {
                Name = new string('A', 201),
                Type = "email",
                Category = "general",
                Content = "Content"
            };
            var act = () => _service.CreateTemplateAsync(_schoolId, dto);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*200 characters*");
        }

        [Fact]
        public async Task CreateTemplate_ThrowsArgumentException_WhenInvalidType()
        {
            var dto = new CreateTemplateDto { Name = "My Template", Type = "letter", Category = "general", Content = "Content" };
            var act = () => _service.CreateTemplateAsync(_schoolId, dto);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*type*");
        }

        [Fact]
        public async Task CreateTemplate_ThrowsArgumentException_WhenCategoryEmpty()
        {
            var dto = new CreateTemplateDto { Name = "My Template", Type = "email", Category = "", Content = "Content" };
            var act = () => _service.CreateTemplateAsync(_schoolId, dto);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*category*");
        }

        [Fact]
        public async Task CreateTemplate_ThrowsArgumentException_WhenContentEmpty()
        {
            var dto = new CreateTemplateDto { Name = "My Template", Type = "email", Category = "general", Content = "" };
            var act = () => _service.CreateTemplateAsync(_schoolId, dto);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*content*");
        }

        [Fact]
        public async Task CreateTemplate_ThrowsArgumentException_WhenContentTooLong()
        {
            var dto = new CreateTemplateDto
            {
                Name = "My Template",
                Type = "email",
                Category = "general",
                Content = new string('X', 5001)
            };
            var act = () => _service.CreateTemplateAsync(_schoolId, dto);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*5000 characters*");
        }

        [Fact]
        public async Task CreateTemplate_ThrowsInvalidOperation_WhenDuplicateName()
        {
            // Add existing template
            _context.Set<MessageTemplate>().Add(new MessageTemplate
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolId,
                Name = "Duplicate Template",
                Type = "email",
                Category = "general",
                Content = "Some content",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            var dto = new CreateTemplateDto { Name = "Duplicate Template", Type = "email", Category = "general", Content = "Content" };
            var act = () => _service.CreateTemplateAsync(_schoolId, dto);
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*already exists*");
        }

        [Fact]
        public async Task CreateTemplate_Succeeds_WithValidData()
        {
            var dto = new CreateTemplateDto
            {
                Name = "My Valid Template",
                Type = "sms",
                Category = "fees",
                Content = "Hello {{parentName}}, fee is due.",
                Variables = new List<string> { "{{parentName}}" }
            };
            var result = await _service.CreateTemplateAsync(_schoolId, dto);
            result.Should().NotBeNull();
            result.Name.Should().Be("My Valid Template");
            result.Type.Should().Be("sms");
        }

        // ================================================================
        // UpdateTemplateAsync - Validation
        // ================================================================

        [Fact]
        public async Task UpdateTemplate_ThrowsArgumentException_WhenInvalidType()
        {
            var templateId = Guid.NewGuid();
            _context.Set<MessageTemplate>().Add(new MessageTemplate
            {
                Id = templateId,
                SchoolId = _schoolId,
                Name = "Update Test Template",
                Type = "email",
                Category = "general",
                Content = "Some content",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            var dto = new CreateTemplateDto { Name = "Update Test Template", Type = "pager", Category = "general", Content = "Updated content" };
            var act = () => _service.UpdateTemplateAsync(_schoolId, templateId, dto);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*type*");
        }

        [Fact]
        public async Task UpdateTemplate_ThrowsKeyNotFoundException_WhenNotFound()
        {
            var dto = new CreateTemplateDto { Name = "Valid Name", Type = "email", Category = "general", Content = "Content" };
            var act = () => _service.UpdateTemplateAsync(_schoolId, Guid.NewGuid(), dto);
            await act.Should().ThrowAsync<KeyNotFoundException>();
        }

        // ================================================================
        // DeleteTemplateAsync
        // ================================================================

        [Fact]
        public async Task DeleteTemplate_ReturnsFalse_WhenNotFound()
        {
            var result = await _service.DeleteTemplateAsync(_schoolId, Guid.NewGuid());
            result.Should().BeFalse();
        }

        [Fact]
        public async Task DeleteTemplate_ReturnsTrue_WhenDeleted()
        {
            var templateId = Guid.NewGuid();
            _context.Set<MessageTemplate>().Add(new MessageTemplate
            {
                Id = templateId,
                SchoolId = _schoolId,
                Name = "Delete Me Template",
                Type = "sms",
                Category = "general",
                Content = "Content to delete",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            var result = await _service.DeleteTemplateAsync(_schoolId, templateId);
            result.Should().BeTrue();
        }

        // ================================================================
        // GetTemplatesAsync - Filter by type
        // ================================================================

        [Fact]
        public async Task GetTemplates_ReturnsEmpty_WhenNoTemplatesExist()
        {
            var result = await _service.GetTemplatesAsync(_schoolId, null);
            result.Should().NotBeNull();
        }

        [Fact]
        public async Task GetTemplates_FiltersCorrectly_ByType()
        {
            var smsTemplateId = Guid.NewGuid();
            var emailTemplateId = Guid.NewGuid();
            _context.Set<MessageTemplate>().AddRange(
                new MessageTemplate
                {
                    Id = smsTemplateId, SchoolId = _schoolId, Name = "SMS Template 1", Type = "sms",
                    Category = "general", Content = "SMS content", IsActive = true,
                    CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
                },
                new MessageTemplate
                {
                    Id = emailTemplateId, SchoolId = _schoolId, Name = "Email Template 1", Type = "email",
                    Category = "general", Content = "Email content", IsActive = true,
                    CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
                }
            );
            await _context.SaveChangesAsync();

            var smsOnly = await _service.GetTemplatesAsync(_schoolId, "sms");
            smsOnly.Should().OnlyContain(t => t.Type == "sms");
            smsOnly.Any(t => t.Id == smsTemplateId).Should().BeTrue();
        }

        // ================================================================
        // SeedDefaultTemplatesAsync - Idempotency
        // ================================================================

        [Fact]
        public async Task SeedDefaultTemplates_SeedsTemplates_WhenNoneExist()
        {
            var newSchoolId = Guid.NewGuid();
            var result = await _service.SeedDefaultTemplatesAsync(newSchoolId);
            result.Should().HaveCount(18); // 6 SMS + 6 WhatsApp + 6 Email
        }

        [Fact]
        public async Task SeedDefaultTemplates_IsIdempotent_WhenTemplatesAlreadyExist()
        {
            var newSchoolId = Guid.NewGuid();
            await _service.SeedDefaultTemplatesAsync(newSchoolId);
            var count1 = await _context.Set<MessageTemplate>().CountAsync(t => t.SchoolId == newSchoolId);
            
            await _service.SeedDefaultTemplatesAsync(newSchoolId);
            var count2 = await _context.Set<MessageTemplate>().CountAsync(t => t.SchoolId == newSchoolId);
            
            count1.Should().Be(count2); // No duplicates seeded
        }

        // ================================================================
        // GetCommunicationStatsAsync
        // ================================================================

        [Fact]
        public async Task GetCommunicationStats_ReturnsStats_ForSchool()
        {
            var result = await _service.GetCommunicationStatsAsync(_schoolId, null, null);
            result.Should().NotBeNull();
            result.TotalAnnouncements.Should().BeGreaterThanOrEqualTo(1);
        }

        [Fact]
        public async Task GetCommunicationStats_ReturnsEmpty_ForUnknownSchool()
        {
            var result = await _service.GetCommunicationStatsAsync(Guid.NewGuid(), null, null);
            result.TotalAnnouncements.Should().Be(0);
            result.TotalMessages.Should().Be(0);
        }

        // ================================================================
        // SendStaffToParentMessageAsync - Validation
        // ================================================================

        [Fact]
        public async Task SendStaffToParentMessage_ThrowsArgumentException_WhenContentEmpty()
        {
            var dto = new SendStaffParentMessageDto
            {
                ParentUserId = _parentUserId,
                Message = "",
                Subject = "Test"
            };
            var act = () => _service.SendStaffToParentMessageAsync(_schoolId, _staffUserId, dto);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*content*");
        }

        [Fact]
        public async Task SendStaffToParentMessage_ThrowsArgumentException_WhenContentTooLong()
        {
            var dto = new SendStaffParentMessageDto
            {
                ParentUserId = _parentUserId,
                Message = new string('M', 5001)
            };
            var act = () => _service.SendStaffToParentMessageAsync(_schoolId, _staffUserId, dto);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*5000 characters*");
        }

        [Fact]
        public async Task SendStaffToParentMessage_ThrowsArgumentException_WhenSubjectTooLong()
        {
            var dto = new SendStaffParentMessageDto
            {
                ParentUserId = _parentUserId,
                Message = "Valid message",
                Subject = new string('S', 201)
            };
            var act = () => _service.SendStaffToParentMessageAsync(_schoolId, _staffUserId, dto);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*subject*");
        }

        [Fact]
        public async Task SendStaffToParentMessage_ThrowsArgumentException_WhenInvalidMessageType()
        {
            var dto = new SendStaffParentMessageDto
            {
                ParentUserId = _parentUserId,
                Message = "Valid message",
                MessageType = "Letter"
            };
            var act = () => _service.SendStaffToParentMessageAsync(_schoolId, _staffUserId, dto);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*type*");
        }

        [Fact]
        public async Task SendStaffToParentMessage_ThrowsKeyNotFoundException_WhenStaffUserNotFound()
        {
            var dto = new SendStaffParentMessageDto
            {
                ParentUserId = _parentUserId,
                Message = "Valid message content"
            };
            var unknownStaffUserId = Guid.NewGuid();
            var act = () => _service.SendStaffToParentMessageAsync(_schoolId, unknownStaffUserId, dto);
            await act.Should().ThrowAsync<KeyNotFoundException>();
        }

        [Fact]
        public async Task SendStaffToParentMessage_ThrowsKeyNotFoundException_WhenParentNotFound()
        {
            var dto = new SendStaffParentMessageDto
            {
                ParentUserId = Guid.NewGuid(), // unknown parent
                Message = "Valid message content"
            };
            var act = () => _service.SendStaffToParentMessageAsync(_schoolId, _staffUserId, dto);
            await act.Should().ThrowAsync<KeyNotFoundException>().WithMessage("*Parent*");
        }

        [Fact]
        public async Task SendStaffToParentMessage_ThrowsKeyNotFoundException_WhenStudentNotFound()
        {
            var dto = new SendStaffParentMessageDto
            {
                ParentUserId = _parentUserId,
                Message = "Valid message content",
                StudentId = Guid.NewGuid() // unknown student
            };
            var act = () => _service.SendStaffToParentMessageAsync(_schoolId, _staffUserId, dto);
            await act.Should().ThrowAsync<KeyNotFoundException>().WithMessage("*Student*");
        }

        [Fact]
        public async Task SendStaffToParentMessage_Succeeds_WithValidData()
        {
            var dto = new SendStaffParentMessageDto
            {
                ParentUserId = _parentUserId,
                Message = "Hello parent, this is a valid message",
                Subject = "Test Message",
                MessageType = "Text"
            };
            var result = await _service.SendStaffToParentMessageAsync(_schoolId, _staffUserId, dto);
            result.Should().NotBeNull();
            result.Message.Should().Be("Hello parent, this is a valid message");
        }

        // ================================================================
        // BulkSendStaffToParentsAsync - Validation
        // ================================================================

        [Fact]
        public async Task BulkSendStaffToParents_ThrowsArgumentException_WhenContentEmpty()
        {
            var dto = new BulkSendStaffParentDto
            {
                Message = "",
                ParentUserIds = new List<Guid> { _parentUserId }
            };
            var act = () => _service.BulkSendStaffToParentsAsync(_schoolId, _staffUserId, dto);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*content*");
        }

        [Fact]
        public async Task BulkSendStaffToParents_ThrowsKeyNotFoundException_WhenStaffNotFound()
        {
            var dto = new BulkSendStaffParentDto
            {
                Message = "Valid message",
                ParentUserIds = new List<Guid> { _parentUserId }
            };
            var act = () => _service.BulkSendStaffToParentsAsync(_schoolId, Guid.NewGuid(), dto);
            await act.Should().ThrowAsync<KeyNotFoundException>();
        }

        // ================================================================
        // GetStaffSentMessagesAsync - Pagination normalization
        // ================================================================

        [Fact]
        public async Task GetStaffSentMessages_NormalizesPageBelowOne()
        {
            var result = await _service.GetStaffSentMessagesAsync(_schoolId, _staffUserId, 0, 20, null);
            result.Page.Should().Be(1);
        }

        [Fact]
        public async Task GetStaffSentMessages_NormalizesPageSizeAbove100()
        {
            var result = await _service.GetStaffSentMessagesAsync(_schoolId, _staffUserId, 1, 200, null);
            result.PageSize.Should().Be(100);
        }

        // ================================================================
        // GetAnnouncementByIdAsync
        // ================================================================

        [Fact]
        public async Task GetAnnouncementById_ReturnsNull_WhenNotFound()
        {
            var result = await _service.GetAnnouncementByIdAsync(_schoolId, Guid.NewGuid());
            result.Should().BeNull();
        }

        [Fact]
        public async Task GetAnnouncementById_ReturnsAnnouncement_WhenExists()
        {
            var result = await _service.GetAnnouncementByIdAsync(_schoolId, _announcementId);
            result.Should().NotBeNull();
            result!.Id.Should().Be(_announcementId);
            result.Title.Should().Be("Existing Announcement");
        }

        // ================================================================
        // DeleteAnnouncementAsync
        // ================================================================

        [Fact]
        public async Task DeleteAnnouncement_ReturnsFalse_WhenNotFound()
        {
            var result = await _service.DeleteAnnouncementAsync(_schoolId, Guid.NewGuid());
            result.Should().BeFalse();
        }

        [Fact]
        public async Task DeleteAnnouncement_ReturnsTrue_WhenDeleted()
        {
            var deleteId = Guid.NewGuid();
            _context.Announcements.Add(new Announcement
            {
                Id = deleteId,
                SchoolId = _schoolId,
                Title = "Delete Test",
                Content = "Delete content",
                TargetAudience = "all",
                Priority = "low",
                CreatedByStaffId = _staffId,
                IsActive = false,
                PublishedDate = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow.AddDays(-5),
                UpdatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            var result = await _service.DeleteAnnouncementAsync(_schoolId, deleteId);
            result.Should().BeTrue();
        }

        // ================================================================
        // GetMessageByIdAsync
        // ================================================================

        [Fact]
        public async Task GetMessageById_ReturnsNull_WhenNotFound()
        {
            var result = await _service.GetMessageByIdAsync(_schoolId, Guid.NewGuid());
            result.Should().BeNull();
        }
    }
}
