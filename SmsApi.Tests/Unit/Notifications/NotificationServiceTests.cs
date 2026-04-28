using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;
using SmsApi.Services;
using Xunit;

namespace SmsApi.Tests.Unit.Notifications
{
    public class NotificationServiceTests : IDisposable
    {
        private readonly AppDbContext _context;
        private readonly NotificationService _service;

        private readonly Guid _schoolId  = Guid.NewGuid();
        private readonly Guid _school2Id = Guid.NewGuid();
        private readonly Guid _userId1   = Guid.NewGuid();
        private readonly Guid _userId2   = Guid.NewGuid();
        private readonly Guid _senderId  = Guid.NewGuid();
        private readonly Guid _notif1Id  = Guid.NewGuid();
        private readonly Guid _notif2Id  = Guid.NewGuid();
        private readonly Guid _notif3Id  = Guid.NewGuid();

        public NotificationServiceTests()
        {
            var opts = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options;
            _context = new AppDbContext(opts);
            _service = new NotificationService(_context);
            SeedData().GetAwaiter().GetResult();
        }

        public void Dispose() => _context?.Dispose();

        // ─── SEED ──────────────────────────────────────────────────────────────

        private async Task SeedData()
        {
            _context.Schools.AddRange(
                new School { Id = _schoolId,  Name = "School A", SchoolCode = "SCA" },
                new School { Id = _school2Id, Name = "School B", SchoolCode = "SCB" }
            );

            // Notification 1 — unread, Fee type, Normal priority (school1, user1)
            _context.Notifications.Add(new Notification
            {
                Id = _notif1Id, SchoolId = _schoolId,
                RecipientId = _userId1, RecipientType = "Staff",
                SenderId = _senderId, SenderName = "Admin User",
                Type = "Fee", Title = "Fee Due", Content = "Your fee is due.",
                Priority = "High", IsRead = false,
                CreatedAt = DateTime.UtcNow.AddHours(-1)
            });

            // Notification 2 — read, Attendance type (school1, user1)
            _context.Notifications.Add(new Notification
            {
                Id = _notif2Id, SchoolId = _schoolId,
                RecipientId = _userId1, RecipientType = "Staff",
                SenderId = _senderId, SenderName = "Admin User",
                Type = "Attendance", Title = "Attendance Alert", Content = "Student was absent.",
                Priority = "Normal", IsRead = true, ReadAt = DateTime.UtcNow.AddMinutes(-30),
                CreatedAt = DateTime.UtcNow.AddHours(-2)
            });

            // Notification 3 — unread, General type (school1, user2) — should NOT appear for user1
            _context.Notifications.Add(new Notification
            {
                Id = _notif3Id, SchoolId = _schoolId,
                RecipientId = _userId2, RecipientType = "Teacher",
                SenderId = _senderId, SenderName = "Admin User",
                Type = "General", Title = "General Notice", Content = "Meeting at 3pm.",
                Priority = "Low", IsRead = false,
                CreatedAt = DateTime.UtcNow.AddHours(-3)
            });

            await _context.SaveChangesAsync();
        }

        private SendNotificationRequest ValidSendRequest(Guid recipientId) => new()
        {
            RecipientId   = recipientId,
            RecipientType = "Staff",
            Type          = "Fee",
            Title         = "Test Title",
            Content       = "Test notification content.",
            Priority      = "Normal"
        };

        // ─── GetMyNotificationsAsync ───────────────────────────────────────────

        [Fact]
        public async Task GetMyNotifications_ReturnsOnlyUserNotifications()
        {
            var result = await _service.GetMyNotificationsAsync(_schoolId, _userId1, 1, 20, null, null);
            result.Notifications.Should().HaveCount(2);
            result.Notifications.Should().OnlyContain(n => n.RecipientId == _userId1);
        }

        [Fact]
        public async Task GetMyNotifications_ReturnsCorrectTotal()
        {
            var result = await _service.GetMyNotificationsAsync(_schoolId, _userId1, 1, 20, null, null);
            result.Total.Should().Be(2);
        }

        [Fact]
        public async Task GetMyNotifications_ReturnsCorrectUnreadCount()
        {
            var result = await _service.GetMyNotificationsAsync(_schoolId, _userId1, 1, 20, null, null);
            result.UnreadCount.Should().Be(1);
        }

        [Fact]
        public async Task GetMyNotifications_FiltersUnreadOnly()
        {
            var result = await _service.GetMyNotificationsAsync(_schoolId, _userId1, 1, 20, true, null);
            result.Notifications.Should().HaveCount(1);
            result.Notifications.Should().OnlyContain(n => !n.IsRead);
        }

        [Fact]
        public async Task GetMyNotifications_FiltersByType()
        {
            var result = await _service.GetMyNotificationsAsync(_schoolId, _userId1, 1, 20, null, "Fee");
            result.Notifications.Should().HaveCount(1);
            result.Notifications[0].Type.Should().Be("Fee");
        }

        [Fact]
        public async Task GetMyNotifications_TypeFilterReturnsNoneForNoMatch()
        {
            var result = await _service.GetMyNotificationsAsync(_schoolId, _userId1, 1, 20, null, "Exam");
            result.Notifications.Should().BeEmpty();
            result.Total.Should().Be(0);
        }

        [Fact]
        public async Task GetMyNotifications_ReturnsEmptyForUnknownUser()
        {
            var result = await _service.GetMyNotificationsAsync(_schoolId, Guid.NewGuid(), 1, 20, null, null);
            result.Notifications.Should().BeEmpty();
        }

        [Fact]
        public async Task GetMyNotifications_SchoolIsolation_ReturnsEmptyForOtherSchool()
        {
            var result = await _service.GetMyNotificationsAsync(_school2Id, _userId1, 1, 20, null, null);
            result.Notifications.Should().BeEmpty();
        }

        [Fact]
        public async Task GetMyNotifications_PaginationNormalizesPageBelow1()
        {
            var result = await _service.GetMyNotificationsAsync(_schoolId, _userId1, 0, 20, null, null);
            result.Page.Should().Be(1);
            result.Notifications.Should().HaveCount(2);
        }

        [Fact]
        public async Task GetMyNotifications_PaginationNormalizesPageSizeBelow1()
        {
            var result = await _service.GetMyNotificationsAsync(_schoolId, _userId1, 1, 0, null, null);
            result.PageSize.Should().Be(10);
        }

        [Fact]
        public async Task GetMyNotifications_PaginationNormalizesPageSizeAbove100()
        {
            var result = await _service.GetMyNotificationsAsync(_schoolId, _userId1, 1, 999, null, null);
            result.PageSize.Should().Be(100);
        }

        [Fact]
        public async Task GetMyNotifications_PaginationCalculatesTotalPages()
        {
            var result = await _service.GetMyNotificationsAsync(_schoolId, _userId1, 1, 1, null, null);
            result.TotalPages.Should().Be(2);
        }

        [Fact]
        public async Task GetMyNotifications_PaginationPage2ReturnsSecondItem()
        {
            var result = await _service.GetMyNotificationsAsync(_schoolId, _userId1, 2, 1, null, null);
            result.Notifications.Should().HaveCount(1);
        }

        [Fact]
        public async Task GetMyNotifications_OrderedByCreatedAtDescending()
        {
            var result = await _service.GetMyNotificationsAsync(_schoolId, _userId1, 1, 20, null, null);
            result.Notifications.Should().BeInDescendingOrder(n => n.CreatedAt);
        }

        // ─── GetSchoolNotificationsAsync ───────────────────────────────────────

        [Fact]
        public async Task GetSchoolNotifications_ReturnsAllSchoolNotifications()
        {
            var result = await _service.GetSchoolNotificationsAsync(_schoolId, 1, 20, null, null, null);
            result.Total.Should().Be(3);
        }

        [Fact]
        public async Task GetSchoolNotifications_FiltersByType()
        {
            var result = await _service.GetSchoolNotificationsAsync(_schoolId, 1, 20, "Fee", null, null);
            result.Notifications.Should().HaveCount(1);
        }

        [Fact]
        public async Task GetSchoolNotifications_FiltersByPriority()
        {
            var result = await _service.GetSchoolNotificationsAsync(_schoolId, 1, 20, null, "High", null);
            result.Notifications.Should().HaveCount(1);
            result.Notifications[0].Priority.Should().Be("High");
        }

        [Fact]
        public async Task GetSchoolNotifications_FiltersByRecipientId()
        {
            var result = await _service.GetSchoolNotificationsAsync(_schoolId, 1, 20, null, null, _userId2);
            result.Notifications.Should().HaveCount(1);
            result.Notifications[0].RecipientId.Should().Be(_userId2);
        }

        [Fact]
        public async Task GetSchoolNotifications_SchoolIsolation()
        {
            var result = await _service.GetSchoolNotificationsAsync(_school2Id, 1, 20, null, null, null);
            result.Total.Should().Be(0);
        }

        // ─── GetByIdAsync ──────────────────────────────────────────────────────

        [Fact]
        public async Task GetById_ReturnsNotificationForCorrectSchool()
        {
            var result = await _service.GetByIdAsync(_notif1Id, _schoolId);
            result.Should().NotBeNull();
            result!.Id.Should().Be(_notif1Id);
        }

        [Fact]
        public async Task GetById_ReturnsNullForWrongSchool()
        {
            var result = await _service.GetByIdAsync(_notif1Id, _school2Id);
            result.Should().BeNull();
        }

        [Fact]
        public async Task GetById_ReturnsNullForNonExistentId()
        {
            var result = await _service.GetByIdAsync(Guid.NewGuid(), _schoolId);
            result.Should().BeNull();
        }

        // ─── GetUnreadCountAsync ───────────────────────────────────────────────

        [Fact]
        public async Task GetUnreadCount_ReturnsCorrectCount()
        {
            var result = await _service.GetUnreadCountAsync(_schoolId, _userId1);
            result.UnreadCount.Should().Be(1);
        }

        [Fact]
        public async Task GetUnreadCount_ReturnsZeroWhenAllRead()
        {
            await _service.MarkAllAsReadAsync(_schoolId, _userId1);
            var result = await _service.GetUnreadCountAsync(_schoolId, _userId1);
            result.UnreadCount.Should().Be(0);
        }

        [Fact]
        public async Task GetUnreadCount_SchoolIsolation()
        {
            var result = await _service.GetUnreadCountAsync(_school2Id, _userId1);
            result.UnreadCount.Should().Be(0);
        }

        // ─── SendNotificationAsync ─────────────────────────────────────────────

        [Fact]
        public async Task Send_CreatesNotificationInDatabase()
        {
            var before = await _context.Notifications.CountAsync(n => n.SchoolId == _schoolId);
            await _service.SendNotificationAsync(_schoolId, _senderId, "Sender", ValidSendRequest(_userId2));
            var after = await _context.Notifications.CountAsync(n => n.SchoolId == _schoolId);
            after.Should().Be(before + 1);
        }

        [Fact]
        public async Task Send_ReturnsMappedResponse()
        {
            var result = await _service.SendNotificationAsync(_schoolId, _senderId, "Admin", ValidSendRequest(_userId1));
            result.Should().NotBeNull();
            result.Title.Should().Be("Test Title");
            result.Type.Should().Be("Fee");
            result.SenderId.Should().Be(_senderId);
            result.SenderName.Should().Be("Admin");
            result.IsRead.Should().BeFalse();
            result.SchoolId.Should().Be(_schoolId);
        }

        [Fact]
        public async Task Send_TrimsWhitespaceFromTitleAndContent()
        {
            var req = ValidSendRequest(_userId1);
            req.Title = "  Trimmed Title  ";
            req.Content = "  Trimmed Content  ";
            var result = await _service.SendNotificationAsync(_schoolId, _senderId, "S", req);
            result.Title.Should().Be("Trimmed Title");
            result.Content.Should().Be("Trimmed Content");
        }

        [Fact]
        public async Task Send_ThrowsArgument_WhenTitleTooShort()
        {
            var req = ValidSendRequest(_userId1);
            req.Title = "X";
            await _service.Invoking(s => s.SendNotificationAsync(_schoolId, _senderId, "S", req))
                .Should().ThrowAsync<ArgumentException>().WithMessage("*at least 2*");
        }

        [Fact]
        public async Task Send_ThrowsArgument_WhenTitleTooLong()
        {
            var req = ValidSendRequest(_userId1);
            req.Title = new string('T', 201);
            await _service.Invoking(s => s.SendNotificationAsync(_schoolId, _senderId, "S", req))
                .Should().ThrowAsync<ArgumentException>().WithMessage("*200*");
        }

        [Fact]
        public async Task Send_ThrowsArgument_WhenTitleIsEmpty()
        {
            var req = ValidSendRequest(_userId1);
            req.Title = "";
            await _service.Invoking(s => s.SendNotificationAsync(_schoolId, _senderId, "S", req))
                .Should().ThrowAsync<ArgumentException>();
        }

        [Fact]
        public async Task Send_ThrowsArgument_WhenContentTooLong()
        {
            var req = ValidSendRequest(_userId1);
            req.Content = new string('C', 5001);
            await _service.Invoking(s => s.SendNotificationAsync(_schoolId, _senderId, "S", req))
                .Should().ThrowAsync<ArgumentException>().WithMessage("*5000*");
        }

        [Fact]
        public async Task Send_ThrowsArgument_WhenContentIsEmpty()
        {
            var req = ValidSendRequest(_userId1);
            req.Content = "";
            await _service.Invoking(s => s.SendNotificationAsync(_schoolId, _senderId, "S", req))
                .Should().ThrowAsync<ArgumentException>();
        }

        [Fact]
        public async Task Send_ThrowsArgument_WhenTypeIsInvalid()
        {
            var req = ValidSendRequest(_userId1);
            req.Type = "InvalidType";
            await _service.Invoking(s => s.SendNotificationAsync(_schoolId, _senderId, "S", req))
                .Should().ThrowAsync<ArgumentException>().WithMessage("*type*");
        }

        [Fact]
        public async Task Send_AcceptsAllValidTypes()
        {
            var validTypes = new[] { "Fee", "Attendance", "Exam", "Assignment", "Announcement",
                "Message", "General", "Payment", "Transport", "Library", "Leave", "Hostel", "Certificate", "System" };
            foreach (var type in validTypes)
            {
                var req = ValidSendRequest(_userId1);
                req.Type = type;
                var result = await _service.SendNotificationAsync(_schoolId, _senderId, "S", req);
                result.Type.Should().Be(type);
            }
        }

        [Fact]
        public async Task Send_ThrowsArgument_WhenPriorityIsInvalid()
        {
            var req = ValidSendRequest(_userId1);
            req.Priority = "Critical"; // not in valid set
            await _service.Invoking(s => s.SendNotificationAsync(_schoolId, _senderId, "S", req))
                .Should().ThrowAsync<ArgumentException>().WithMessage("*priority*");
        }

        [Fact]
        public async Task Send_AcceptsAllValidPriorities()
        {
            foreach (var p in new[] { "Low", "Normal", "High", "Urgent" })
            {
                var req = ValidSendRequest(_userId1);
                req.Priority = p;
                var result = await _service.SendNotificationAsync(_schoolId, _senderId, "S", req);
                result.Priority.Should().Be(p);
            }
        }

        [Fact]
        public async Task Send_ThrowsArgument_WhenRecipientTypeIsInvalid()
        {
            var req = ValidSendRequest(_userId1);
            req.RecipientType = "Robot";
            await _service.Invoking(s => s.SendNotificationAsync(_schoolId, _senderId, "S", req))
                .Should().ThrowAsync<ArgumentException>().WithMessage("*recipient type*");
        }

        [Fact]
        public async Task Send_ThrowsArgument_WhenRecipientIdIsEmpty()
        {
            var req = ValidSendRequest(Guid.Empty);
            await _service.Invoking(s => s.SendNotificationAsync(_schoolId, _senderId, "S", req))
                .Should().ThrowAsync<ArgumentException>().WithMessage("*RecipientId*");
        }

        [Fact]
        public async Task Send_SetsCreatedByToSenderId()
        {
            await _service.SendNotificationAsync(_schoolId, _senderId, "S", ValidSendRequest(_userId1));
            var saved = await _context.Notifications
                .OrderByDescending(n => n.CreatedAt)
                .FirstAsync(n => n.SchoolId == _schoolId && n.SenderId == _senderId);
            saved.CreatedBy.Should().Be(_senderId);
        }

        // ─── BroadcastNotificationAsync ────────────────────────────────────────

        private BroadcastNotificationRequest ValidBroadcastRequest(List<Guid> ids) => new()
        {
            RecipientIds  = ids,
            RecipientType = "Staff",
            Type          = "Announcement",
            Title         = "Broadcast Notice",
            Content       = "This is a broadcast to all staff.",
            Priority      = "Normal"
        };

        [Fact]
        public async Task Broadcast_SendsToAllRecipients()
        {
            var ids = new List<Guid> { _userId1, _userId2 };
            var result = await _service.BroadcastNotificationAsync(_schoolId, _senderId, "S", ValidBroadcastRequest(ids));
            result.TotalRecipients.Should().Be(2);
            result.Sent.Should().Be(2);
            result.Failed.Should().Be(0);
        }

        [Fact]
        public async Task Broadcast_CreatesOneNotificationPerRecipient()
        {
            var ids = new List<Guid> { _userId1, _userId2 };
            var before = await _context.Notifications.CountAsync(n => n.SchoolId == _schoolId);
            await _service.BroadcastNotificationAsync(_schoolId, _senderId, "S", ValidBroadcastRequest(ids));
            var after = await _context.Notifications.CountAsync(n => n.SchoolId == _schoolId);
            after.Should().Be(before + 2);
        }

        [Fact]
        public async Task Broadcast_ThrowsArgument_WhenNoRecipientIdsOrRole()
        {
            var req = ValidBroadcastRequest(new List<Guid>());
            req.RecipientIds = new List<Guid>();
            req.RecipientRole = null;
            await _service.Invoking(s => s.BroadcastNotificationAsync(_schoolId, _senderId, "S", req))
                .Should().ThrowAsync<ArgumentException>().WithMessage("*RecipientIds or RecipientRole*");
        }

        [Fact]
        public async Task Broadcast_ThrowsArgument_WhenExceedsMaxRecipients()
        {
            var ids = Enumerable.Range(0, 501).Select(_ => Guid.NewGuid()).ToList();
            var req = ValidBroadcastRequest(ids);
            await _service.Invoking(s => s.BroadcastNotificationAsync(_schoolId, _senderId, "S", req))
                .Should().ThrowAsync<ArgumentException>().WithMessage("*500*");
        }

        [Fact]
        public async Task Broadcast_DeduplicatesRecipientIds()
        {
            var id = _userId1;
            var ids = new List<Guid> { id, id, id };
            var result = await _service.BroadcastNotificationAsync(_schoolId, _senderId, "S", ValidBroadcastRequest(ids));
            result.TotalRecipients.Should().Be(1);
            result.Sent.Should().Be(1);
        }

        [Fact]
        public async Task Broadcast_ThrowsArgument_WhenInvalidType()
        {
            var req = ValidBroadcastRequest(new List<Guid> { _userId1 });
            req.Type = "BadType";
            await _service.Invoking(s => s.BroadcastNotificationAsync(_schoolId, _senderId, "S", req))
                .Should().ThrowAsync<ArgumentException>();
        }

        [Fact]
        public async Task Broadcast_ThrowsArgument_WhenTitleEmpty()
        {
            var req = ValidBroadcastRequest(new List<Guid> { _userId1 });
            req.Title = " ";
            await _service.Invoking(s => s.BroadcastNotificationAsync(_schoolId, _senderId, "S", req))
                .Should().ThrowAsync<ArgumentException>();
        }

        [Fact]
        public async Task Broadcast_ByRoleReturnsZeroRecipientsThrowsArgument()
        {
            var req = ValidBroadcastRequest(null!);
            req.RecipientIds = null;
            req.RecipientRole = "Teacher"; // no teachers seeded in UserLogins
            await _service.Invoking(s => s.BroadcastNotificationAsync(_schoolId, _senderId, "S", req))
                .Should().ThrowAsync<ArgumentException>().WithMessage("*No recipients*");
        }

        // ─── MarkAsReadAsync ───────────────────────────────────────────────────

        [Fact]
        public async Task MarkAsRead_SetsIsReadAndReadAt()
        {
            await _service.MarkAsReadAsync(_notif1Id, _schoolId, _userId1);
            var n = await _context.Notifications.FindAsync(_notif1Id);
            n!.IsRead.Should().BeTrue();
            n.ReadAt.Should().NotBeNull();
        }

        [Fact]
        public async Task MarkAsRead_AlreadyReadDoesNotUpdateReadAt()
        {
            var original = (await _context.Notifications.FindAsync(_notif2Id))!.ReadAt;
            await _service.MarkAsReadAsync(_notif2Id, _schoolId, _userId1);
            var n = await _context.Notifications.FindAsync(_notif2Id);
            n!.ReadAt.Should().BeCloseTo(original!.Value, TimeSpan.FromSeconds(1));
        }

        [Fact]
        public async Task MarkAsRead_ThrowsKeyNotFound_WhenNotificationNotFound()
        {
            await _service.Invoking(s => s.MarkAsReadAsync(Guid.NewGuid(), _schoolId, _userId1))
                .Should().ThrowAsync<KeyNotFoundException>();
        }

        [Fact]
        public async Task MarkAsRead_ThrowsKeyNotFound_WhenWrongUser()
        {
            // notif3 belongs to _userId2, not _userId1
            await _service.Invoking(s => s.MarkAsReadAsync(_notif3Id, _schoolId, _userId1))
                .Should().ThrowAsync<KeyNotFoundException>();
        }

        [Fact]
        public async Task MarkAsRead_ThrowsKeyNotFound_WhenWrongSchool()
        {
            await _service.Invoking(s => s.MarkAsReadAsync(_notif1Id, _school2Id, _userId1))
                .Should().ThrowAsync<KeyNotFoundException>();
        }

        [Fact]
        public async Task MarkAsRead_ReturnsTrue()
        {
            var result = await _service.MarkAsReadAsync(_notif1Id, _schoolId, _userId1);
            result.Should().BeTrue();
        }

        // ─── MarkAllAsReadAsync ────────────────────────────────────────────────

        [Fact]
        public async Task MarkAllAsRead_MarksAllUnreadNotifications()
        {
            var count = await _service.MarkAllAsReadAsync(_schoolId, _userId1);
            count.Should().Be(1); // only notif1 was unread for user1
            var n = await _context.Notifications.FindAsync(_notif1Id);
            n!.IsRead.Should().BeTrue();
        }

        [Fact]
        public async Task MarkAllAsRead_DoesNotAffectOtherUsersNotifications()
        {
            await _service.MarkAllAsReadAsync(_schoolId, _userId1);
            var n = await _context.Notifications.FindAsync(_notif3Id);
            n!.IsRead.Should().BeFalse(); // user2's notification untouched
        }

        [Fact]
        public async Task MarkAllAsRead_ReturnsZeroWhenNothingUnread()
        {
            await _service.MarkAllAsReadAsync(_schoolId, _userId1);
            var count = await _service.MarkAllAsReadAsync(_schoolId, _userId1);
            count.Should().Be(0);
        }

        [Fact]
        public async Task MarkAllAsRead_SchoolIsolation()
        {
            var count = await _service.MarkAllAsReadAsync(_school2Id, _userId1);
            count.Should().Be(0);
        }

        // ─── DeleteMyNotificationAsync ─────────────────────────────────────────

        [Fact]
        public async Task DeleteMy_SoftDeletesNotification()
        {
            await _service.DeleteMyNotificationAsync(_notif1Id, _schoolId, _userId1);
            var n = await _context.Notifications.IgnoreQueryFilters().FirstAsync(n => n.Id == _notif1Id);
            n.IsDeleted.Should().BeTrue();
            n.DeletedAt.Should().NotBeNull();
        }

        [Fact]
        public async Task DeleteMy_ReturnsTrue()
        {
            var result = await _service.DeleteMyNotificationAsync(_notif1Id, _schoolId, _userId1);
            result.Should().BeTrue();
        }

        [Fact]
        public async Task DeleteMy_ThrowsKeyNotFound_WhenNotFound()
        {
            await _service.Invoking(s => s.DeleteMyNotificationAsync(Guid.NewGuid(), _schoolId, _userId1))
                .Should().ThrowAsync<KeyNotFoundException>();
        }

        [Fact]
        public async Task DeleteMy_ThrowsKeyNotFound_WhenWrongUser()
        {
            // notif3 belongs to _userId2
            await _service.Invoking(s => s.DeleteMyNotificationAsync(_notif3Id, _schoolId, _userId1))
                .Should().ThrowAsync<KeyNotFoundException>();
        }

        [Fact]
        public async Task DeleteMy_ThrowsKeyNotFound_WhenWrongSchool()
        {
            await _service.Invoking(s => s.DeleteMyNotificationAsync(_notif1Id, _school2Id, _userId1))
                .Should().ThrowAsync<KeyNotFoundException>();
        }

        // ─── AdminDeleteNotificationAsync ──────────────────────────────────────

        [Fact]
        public async Task AdminDelete_CanDeleteAnyNotificationInSchool()
        {
            await _service.AdminDeleteNotificationAsync(_notif3Id, _schoolId);
            var n = await _context.Notifications.IgnoreQueryFilters().FirstAsync(n => n.Id == _notif3Id);
            n.IsDeleted.Should().BeTrue();
        }

        [Fact]
        public async Task AdminDelete_ThrowsKeyNotFound_WhenNotFound()
        {
            await _service.Invoking(s => s.AdminDeleteNotificationAsync(Guid.NewGuid(), _schoolId))
                .Should().ThrowAsync<KeyNotFoundException>();
        }

        [Fact]
        public async Task AdminDelete_ThrowsKeyNotFound_WhenWrongSchool()
        {
            await _service.Invoking(s => s.AdminDeleteNotificationAsync(_notif1Id, _school2Id))
                .Should().ThrowAsync<KeyNotFoundException>();
        }

        [Fact]
        public async Task AdminDelete_ReturnsTrue()
        {
            var result = await _service.AdminDeleteNotificationAsync(_notif1Id, _schoolId);
            result.Should().BeTrue();
        }

        // ─── GetStatsAsync ─────────────────────────────────────────────────────

        [Fact]
        public async Task GetStats_ReturnsCorrectTotal()
        {
            var stats = await _service.GetStatsAsync(_schoolId);
            stats.Total.Should().Be(3);
        }

        [Fact]
        public async Task GetStats_ReturnsCorrectUnreadAndRead()
        {
            var stats = await _service.GetStatsAsync(_schoolId);
            stats.Unread.Should().Be(2);
            stats.Read.Should().Be(1);
        }

        [Fact]
        public async Task GetStats_CalculatesReadRate()
        {
            var stats = await _service.GetStatsAsync(_schoolId);
            stats.ReadRate.Should().BeApproximately(33.33, 0.5);
        }

        [Fact]
        public async Task GetStats_ReturnsReadRateZeroWhenNoNotifications()
        {
            var stats = await _service.GetStatsAsync(_school2Id);
            stats.ReadRate.Should().Be(0.0);
            stats.Total.Should().Be(0);
        }

        [Fact]
        public async Task GetStats_ByTypeContainsAllTypes()
        {
            var stats = await _service.GetStatsAsync(_schoolId);
            stats.ByType.Should().ContainKey("Fee");
            stats.ByType.Should().ContainKey("Attendance");
            stats.ByType.Should().ContainKey("General");
        }

        [Fact]
        public async Task GetStats_ByTypeCountsAreCorrect()
        {
            var stats = await _service.GetStatsAsync(_schoolId);
            stats.ByType["Fee"].Should().Be(1);
            stats.ByType["Attendance"].Should().Be(1);
            stats.ByType["General"].Should().Be(1);
        }

        [Fact]
        public async Task GetStats_ByPriorityCountsAreCorrect()
        {
            var stats = await _service.GetStatsAsync(_schoolId);
            stats.ByPriority.Should().ContainKey("High");
            stats.ByPriority.Should().ContainKey("Normal");
            stats.ByPriority.Should().ContainKey("Low");
        }

        [Fact]
        public async Task GetStats_SentLast24HoursCountsRecentNotifications()
        {
            var stats = await _service.GetStatsAsync(_schoolId);
            stats.SentLast24Hours.Should().Be(3); // all seeded within 3 hours
        }

        [Fact]
        public async Task GetStats_SentLast7DaysIncludesAllRecentNotifications()
        {
            var stats = await _service.GetStatsAsync(_schoolId);
            stats.SentLast7Days.Should().Be(3);
        }

        [Fact]
        public async Task GetStats_SchoolIsolation()
        {
            var stats = await _service.GetStatsAsync(_school2Id);
            stats.Total.Should().Be(0);
            stats.ByType.Should().BeEmpty();
        }

        [Fact]
        public async Task GetStats_FullReadRateWhenAllRead()
        {
            await _service.MarkAllAsReadAsync(_schoolId, _userId1);
            await _service.MarkAllAsReadAsync(_schoolId, _userId2);
            var stats = await _service.GetStatsAsync(_schoolId);
            stats.ReadRate.Should().Be(100.0);
        }

        // ─── Edge cases & integration ──────────────────────────────────────────

        [Fact]
        public async Task Send_AfterDelete_DeletedNotificationNotVisibleInGetMy()
        {
            await _service.DeleteMyNotificationAsync(_notif1Id, _schoolId, _userId1);
            var result = await _service.GetMyNotificationsAsync(_schoolId, _userId1, 1, 20, null, null);
            result.Notifications.Should().NotContain(n => n.Id == _notif1Id);
        }

        [Fact]
        public async Task Send_ThenMarkRead_IncreasesReadCountInStats()
        {
            var req = ValidSendRequest(_userId1);
            var sent = await _service.SendNotificationAsync(_schoolId, _senderId, "S", req);
            await _service.MarkAsReadAsync(sent.Id, _schoolId, _userId1);
            var stats = await _service.GetStatsAsync(_schoolId);
            stats.Read.Should().BeGreaterThan(1);
        }

        [Fact]
        public async Task BroadcastToSingleRecipient_CreatesExactlyOneNotification()
        {
            var before = await _context.Notifications.CountAsync(n => n.SchoolId == _schoolId);
            await _service.BroadcastNotificationAsync(_schoolId, _senderId, "S", ValidBroadcastRequest(new List<Guid> { _userId1 }));
            var after = await _context.Notifications.CountAsync(n => n.SchoolId == _schoolId);
            after.Should().Be(before + 1);
        }

        [Fact]
        public async Task UnreadCountIncreases_AfterSend()
        {
            var before = await _service.GetUnreadCountAsync(_schoolId, _userId1);
            await _service.SendNotificationAsync(_schoolId, _senderId, "S", ValidSendRequest(_userId1));
            var after = await _service.GetUnreadCountAsync(_schoolId, _userId1);
            after.UnreadCount.Should().Be(before.UnreadCount + 1);
        }

        [Fact]
        public async Task UnreadCountDecreases_AfterMarkRead()
        {
            var before = await _service.GetUnreadCountAsync(_schoolId, _userId1);
            await _service.MarkAsReadAsync(_notif1Id, _schoolId, _userId1);
            var after = await _service.GetUnreadCountAsync(_schoolId, _userId1);
            after.UnreadCount.Should().Be(before.UnreadCount - 1);
        }

        [Fact]
        public async Task GetMyNotifications_ReflectsOptionalFields()
        {
            var req = ValidSendRequest(_userId1);
            req.ActionUrl = "/fees/pay";
            req.ReferenceId = Guid.NewGuid();
            req.ReferenceType = "FeeRecord";
            var sent = await _service.SendNotificationAsync(_schoolId, _senderId, "S", req);
            var result = await _service.GetMyNotificationsAsync(_schoolId, _userId1, 1, 20, null, null);
            var found = result.Notifications.FirstOrDefault(n => n.Id == sent.Id);
            found.Should().NotBeNull();
            found!.ActionUrl.Should().Be("/fees/pay");
            found.ReferenceType.Should().Be("FeeRecord");
        }
    }
}
