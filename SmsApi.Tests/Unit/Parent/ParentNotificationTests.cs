using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using SmsApi.Data;
using SmsApi.Models.Entities;
using Xunit;

namespace SmsApi.Tests.Unit.Parent
{
    /// <summary>
    /// Tests for parent notification logic. Because NotificationsController has no
    /// dedicated service layer, these tests exercise the EF Core query patterns
    /// directly against an InMemory database — the same logic the controller uses.
    ///
    /// This validates:
    ///   - Data isolation (user sees only their notifications)
    ///   - Filtering by type and read-status
    ///   - Pagination correctness
    ///   - Unread count accuracy
    ///   - MarkAsRead and MarkAllAsRead state changes
    /// </summary>
    public class ParentNotificationTests : IDisposable
    {
        private readonly AppDbContext _context;
        private readonly Guid _schoolId = Guid.NewGuid();
        private readonly Guid _userId = Guid.NewGuid();
        private readonly Guid _otherUserId = Guid.NewGuid();

        public ParentNotificationTests()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options;
            _context = new AppDbContext(options);
        }

        public void Dispose() => _context.Dispose();

        // ─────────────────────────────────────────────────────────────────────
        // Helpers
        // ─────────────────────────────────────────────────────────────────────

        private Notification MakeNotification(
            Guid recipientId,
            string type = "Announcement",
            string title = "Test Notice",
            bool isRead = false,
            string priority = "Normal") =>
            new Notification
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolId,
                RecipientId = recipientId,
                RecipientType = "Parent",
                Type = type,
                Title = title,
                Content = $"Content for {title}",
                IsRead = isRead,
                ReadAt = isRead ? DateTime.UtcNow.AddMinutes(-5) : null,
                Priority = priority,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

        private async Task SeedNotifications(IEnumerable<Notification> notifications)
        {
            _context.Notifications.AddRange(notifications);
            await _context.SaveChangesAsync();
        }

        // =====================================================================
        // Data Isolation
        // =====================================================================

        [Fact]
        public async Task GetMyNotifications_ReturnsOnlyCurrentUserNotifications()
        {
            await SeedNotifications(new[]
            {
                MakeNotification(_userId, title: "My Notice 1"),
                MakeNotification(_userId, title: "My Notice 2"),
                MakeNotification(_otherUserId, title: "Not Mine"),
            });

            var result = await _context.Notifications
                .Where(n => n.SchoolId == _schoolId && n.RecipientId == _userId)
                .ToListAsync();

            result.Should().HaveCount(2);
            result.Select(n => n.Title).Should().BeEquivalentTo(new[] { "My Notice 1", "My Notice 2" });
        }

        [Fact]
        public async Task GetMyNotifications_ExcludesOtherUserNotifications()
        {
            await SeedNotifications(new[]
            {
                MakeNotification(_otherUserId, title: "Belongs To Other User"),
                MakeNotification(_userId, title: "My Notice"),
            });

            var result = await _context.Notifications
                .Where(n => n.SchoolId == _schoolId && n.RecipientId == _userId)
                .ToListAsync();

            result.Should().NotContain(n => n.RecipientId == _otherUserId);
        }

        [Fact]
        public async Task GetMyNotifications_ExcludesOtherSchoolNotifications()
        {
            var otherSchoolId = Guid.NewGuid();
            var otherSchoolNotif = new Notification
            {
                Id = Guid.NewGuid(),
                SchoolId = otherSchoolId,
                RecipientId = _userId,
                RecipientType = "Parent",
                Type = "Announcement",
                Title = "Wrong School Notice",
                Content = "Should not appear",
                IsRead = false,
                Priority = "Normal",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            await SeedNotifications(new[]
            {
                otherSchoolNotif,
                MakeNotification(_userId, title: "My School Notice")
            });

            var result = await _context.Notifications
                .Where(n => n.SchoolId == _schoolId && n.RecipientId == _userId)
                .ToListAsync();

            result.Should().HaveCount(1);
            result[0].Title.Should().Be("My School Notice");
        }

        // =====================================================================
        // Filtering
        // =====================================================================

        [Fact]
        public async Task GetMyNotifications_FiltersByType_ReturnsFeeNotificationsOnly()
        {
            await SeedNotifications(new[]
            {
                MakeNotification(_userId, type: "Fee", title: "Fee Due"),
                MakeNotification(_userId, type: "Attendance", title: "Attendance Alert"),
                MakeNotification(_userId, type: "Fee", title: "Fee Overdue"),
            });

            var result = await _context.Notifications
                .Where(n => n.SchoolId == _schoolId && n.RecipientId == _userId && n.Type == "Fee")
                .ToListAsync();

            result.Should().HaveCount(2);
            result.Should().AllSatisfy(n => n.Type.Should().Be("Fee"));
        }

        [Fact]
        public async Task GetMyNotifications_FiltersByUnreadOnly_ExcludesReadNotifications()
        {
            await SeedNotifications(new[]
            {
                MakeNotification(_userId, title: "Unread 1", isRead: false),
                MakeNotification(_userId, title: "Unread 2", isRead: false),
                MakeNotification(_userId, title: "Already Read", isRead: true),
            });

            var result = await _context.Notifications
                .Where(n => n.SchoolId == _schoolId && n.RecipientId == _userId && !n.IsRead)
                .ToListAsync();

            result.Should().HaveCount(2);
            result.Should().AllSatisfy(n => n.IsRead.Should().BeFalse());
        }

        // =====================================================================
        // Pagination
        // =====================================================================

        [Fact]
        public async Task GetMyNotifications_PaginatesCorrectly()
        {
            var notifications = Enumerable.Range(1, 10)
                .Select(i => MakeNotification(_userId, title: $"Notice {i}"))
                .ToList();
            await SeedNotifications(notifications);

            int page = 2, pageSize = 3;
            var result = await _context.Notifications
                .Where(n => n.SchoolId == _schoolId && n.RecipientId == _userId)
                .OrderByDescending(n => n.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            result.Should().HaveCount(3);
        }

        [Fact]
        public async Task GetMyNotifications_TotalCountExcludesOtherUsersNotifications()
        {
            await SeedNotifications(new[]
            {
                MakeNotification(_userId, title: "Mine 1"),
                MakeNotification(_userId, title: "Mine 2"),
                MakeNotification(_otherUserId, title: "Not Mine"),
            });

            var total = await _context.Notifications
                .Where(n => n.SchoolId == _schoolId && n.RecipientId == _userId)
                .CountAsync();

            total.Should().Be(2);
        }

        // =====================================================================
        // Unread Count
        // =====================================================================

        [Fact]
        public async Task GetMyNotifications_UnreadCount_AccuratelyReflectsUnreadItems()
        {
            await SeedNotifications(new[]
            {
                MakeNotification(_userId, isRead: false),
                MakeNotification(_userId, isRead: false),
                MakeNotification(_userId, isRead: true),
                MakeNotification(_otherUserId, isRead: false), // should NOT count
            });

            var unreadCount = await _context.Notifications
                .Where(n => n.SchoolId == _schoolId && n.RecipientId == _userId && !n.IsRead)
                .CountAsync();

            unreadCount.Should().Be(2);
        }

        // =====================================================================
        // MarkAsRead Logic
        // =====================================================================

        [Fact]
        public async Task MarkAsRead_SetsIsReadAndReadAt()
        {
            var notification = MakeNotification(_userId, title: "Unread Notice", isRead: false);
            await SeedNotifications(new[] { notification });

            var record = await _context.Notifications.FirstAsync(n => n.Id == notification.Id);
            record.IsRead = true;
            record.ReadAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var updated = await _context.Notifications.FirstAsync(n => n.Id == notification.Id);
            updated.IsRead.Should().BeTrue();
            updated.ReadAt.Should().NotBeNull();
        }

        [Fact]
        public async Task MarkAsRead_DoesNotModifyOtherUsersNotification()
        {
            var myNotif = MakeNotification(_userId, title: "Mine", isRead: false);
            var otherNotif = MakeNotification(_otherUserId, title: "Other", isRead: false);
            await SeedNotifications(new[] { myNotif, otherNotif });

            // Mark only mine as read
            var record = await _context.Notifications
                .FirstAsync(n => n.Id == myNotif.Id && n.RecipientId == _userId);
            record.IsRead = true;
            record.ReadAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var otherRecord = await _context.Notifications.FirstAsync(n => n.Id == otherNotif.Id);
            otherRecord.IsRead.Should().BeFalse("Other user's notification must not be affected");
        }

        [Fact]
        public async Task MarkAsRead_ReturnsFalseOnLookup_WhenNotificationBelongsToOtherUser()
        {
            var otherNotif = MakeNotification(_otherUserId, title: "Other Notice");
            await SeedNotifications(new[] { otherNotif });

            // Simulate controller lookup: must include RecipientId == _userId guard
            var record = await _context.Notifications
                .FirstOrDefaultAsync(n => n.Id == otherNotif.Id && n.RecipientId == _userId);

            record.Should().BeNull("notification isolation must prevent cross-user access");
        }

        // =====================================================================
        // MarkAllAsRead Logic
        // =====================================================================

        [Fact]
        public async Task MarkAllAsRead_MarksAllUnreadNotificationsForCurrentUser()
        {
            await SeedNotifications(new[]
            {
                MakeNotification(_userId, title: "Unread A", isRead: false),
                MakeNotification(_userId, title: "Unread B", isRead: false),
                MakeNotification(_userId, title: "Already Read", isRead: true),
            });

            var unread = await _context.Notifications
                .Where(n => n.SchoolId == _schoolId && n.RecipientId == _userId && !n.IsRead)
                .ToListAsync();

            foreach (var n in unread)
            {
                n.IsRead = true;
                n.ReadAt = DateTime.UtcNow;
            }
            await _context.SaveChangesAsync();

            var remainingUnread = await _context.Notifications
                .Where(n => n.SchoolId == _schoolId && n.RecipientId == _userId && !n.IsRead)
                .CountAsync();

            remainingUnread.Should().Be(0);
        }

        [Fact]
        public async Task MarkAllAsRead_DoesNotAffectOtherUsersNotifications()
        {
            await SeedNotifications(new[]
            {
                MakeNotification(_userId, title: "Mine", isRead: false),
                MakeNotification(_otherUserId, title: "Other Unread", isRead: false),
            });

            // Simulate mark-all-as-read for _userId only
            var unread = await _context.Notifications
                .Where(n => n.SchoolId == _schoolId && n.RecipientId == _userId && !n.IsRead)
                .ToListAsync();
            foreach (var n in unread) { n.IsRead = true; n.ReadAt = DateTime.UtcNow; }
            await _context.SaveChangesAsync();

            var otherStillUnread = await _context.Notifications
                .Where(n => n.RecipientId == _otherUserId && !n.IsRead)
                .CountAsync();

            otherStillUnread.Should().Be(1, "other user's notifications must remain unchanged");
        }
    }
}
