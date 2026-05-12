using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;

namespace SmsApi.Services
{
    // ──────────────────────────────────────────────
    // Interface
    // ──────────────────────────────────────────────

    public interface INotificationService
    {
        Task<NotificationListResponse> GetMyNotificationsAsync(Guid schoolId, Guid userId,
            int page, int pageSize, bool? unreadOnly, string? type);

        Task<NotificationListResponse> GetSchoolNotificationsAsync(Guid schoolId,
            int page, int pageSize, string? type, string? priority, Guid? recipientId);

        Task<NotificationResponse?> GetByIdAsync(Guid id, Guid schoolId);

        Task<NotificationResponse> SendNotificationAsync(Guid schoolId, Guid senderId,
            string senderName, SendNotificationRequest request);

        Task<BroadcastResult> BroadcastNotificationAsync(Guid schoolId, Guid senderId,
            string senderName, BroadcastNotificationRequest request);

        Task<bool> MarkAsReadAsync(Guid id, Guid schoolId, Guid userId);

        Task<int> MarkAllAsReadAsync(Guid schoolId, Guid userId);

        Task<bool> DeleteMyNotificationAsync(Guid id, Guid schoolId, Guid userId);

        Task<bool> AdminDeleteNotificationAsync(Guid id, Guid schoolId);

        Task<UnreadCountResponse> GetUnreadCountAsync(Guid schoolId, Guid userId);

        Task<NotificationStatsResponse> GetStatsAsync(Guid schoolId);
    }

    // ──────────────────────────────────────────────
    // Valid constant sets
    // ──────────────────────────────────────────────

    public static class NotificationConstants
    {
        public static readonly HashSet<string> ValidTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            "Fee", "Attendance", "Exam", "Assignment", "Announcement",
            "Message", "General", "Payment", "Transport", "Library",
            "Leave", "Hostel", "Certificate", "System", "Diary"
        };

        public static readonly HashSet<string> ValidPriorities = new(StringComparer.OrdinalIgnoreCase)
        {
            "Low", "Normal", "High", "Urgent"
        };

        public static readonly HashSet<string> ValidRecipientTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            "Student", "Staff", "Parent", "Teacher", "Admin", "Principal"
        };

        public const int MaxBroadcastRecipients = 500;
    }

    // ──────────────────────────────────────────────
    // Implementation
    // ──────────────────────────────────────────────

    public class NotificationService : INotificationService
    {
        private readonly AppDbContext _db;

        public NotificationService(AppDbContext db)
        {
            _db = db;
        }

        // ── Helpers ─────────────────────────────

        private static int NormalizePage(int page) => page < 1 ? 1 : page;
        private static int NormalizePageSize(int pageSize) => pageSize < 1 ? 10 : pageSize > 100 ? 100 : pageSize;

        private static NotificationResponse ToResponse(Notification n) => new()
        {
            Id = n.Id,
            SchoolId = n.SchoolId,
            RecipientId = n.RecipientId,
            RecipientType = n.RecipientType,
            SenderId = n.SenderId,
            SenderName = n.SenderName,
            Type = n.Type,
            Title = n.Title,
            Content = n.Content,
            ActionUrl = n.ActionUrl,
            ReferenceId = n.ReferenceId,
            ReferenceType = n.ReferenceType,
            IsRead = n.IsRead,
            ReadAt = n.ReadAt,
            Priority = n.Priority,
            CreatedAt = n.CreatedAt
        };

        private static void ValidateType(string type)
        {
            if (!NotificationConstants.ValidTypes.Contains(type))
                throw new ArgumentException($"Invalid notification type '{type}'. Valid types: {string.Join(", ", NotificationConstants.ValidTypes)}.");
        }

        private static void ValidatePriority(string priority)
        {
            if (!NotificationConstants.ValidPriorities.Contains(priority))
                throw new ArgumentException($"Invalid priority '{priority}'. Valid values: Low, Normal, High, Urgent.");
        }

        private static void ValidateRecipientType(string recipientType)
        {
            if (!NotificationConstants.ValidRecipientTypes.Contains(recipientType))
                throw new ArgumentException($"Invalid recipient type '{recipientType}'. Valid values: Student, Staff, Parent, Teacher, Admin, Principal.");
        }

        private static void ValidateTitle(string title)
        {
            if (string.IsNullOrWhiteSpace(title) || title.Length < 2)
                throw new ArgumentException("Title must be at least 2 characters.");
            if (title.Length > 200)
                throw new ArgumentException("Title cannot exceed 200 characters.");
        }

        private static void ValidateContent(string content)
        {
            if (string.IsNullOrWhiteSpace(content) || content.Length < 1)
                throw new ArgumentException("Content cannot be empty.");
            if (content.Length > 5000)
                throw new ArgumentException("Content cannot exceed 5000 characters.");
        }

        // ── Read operations ──────────────────────

        public async Task<NotificationListResponse> GetMyNotificationsAsync(
            Guid schoolId, Guid userId,
            int page, int pageSize, bool? unreadOnly, string? type)
        {
            page = NormalizePage(page);
            pageSize = NormalizePageSize(pageSize);

            var query = _db.Notifications
                .Where(n => n.SchoolId == schoolId && n.RecipientId == userId);

            if (unreadOnly == true)
                query = query.Where(n => !n.IsRead);

            if (!string.IsNullOrWhiteSpace(type))
                query = query.Where(n => n.Type == type);

            var total = await query.CountAsync();
            var unreadCount = await _db.Notifications
                .Where(n => n.SchoolId == schoolId && n.RecipientId == userId && !n.IsRead)
                .CountAsync();

            var items = await query
                .OrderByDescending(n => n.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new NotificationListResponse
            {
                Notifications = items.Select(ToResponse).ToList(),
                Total = total,
                UnreadCount = unreadCount,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling(total / (double)pageSize)
            };
        }

        public async Task<NotificationListResponse> GetSchoolNotificationsAsync(
            Guid schoolId, int page, int pageSize,
            string? type, string? priority, Guid? recipientId)
        {
            page = NormalizePage(page);
            pageSize = NormalizePageSize(pageSize);

            var query = _db.Notifications.Where(n => n.SchoolId == schoolId);

            if (!string.IsNullOrWhiteSpace(type))
                query = query.Where(n => n.Type == type);
            if (!string.IsNullOrWhiteSpace(priority))
                query = query.Where(n => n.Priority == priority);
            if (recipientId.HasValue)
                query = query.Where(n => n.RecipientId == recipientId.Value);

            var total = await query.CountAsync();
            var items = await query
                .OrderByDescending(n => n.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new NotificationListResponse
            {
                Notifications = items.Select(ToResponse).ToList(),
                Total = total,
                UnreadCount = 0, // not user-specific in admin view
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling(total / (double)pageSize)
            };
        }

        public async Task<NotificationResponse?> GetByIdAsync(Guid id, Guid schoolId)
        {
            var n = await _db.Notifications.FirstOrDefaultAsync(n => n.Id == id && n.SchoolId == schoolId);
            return n == null ? null : ToResponse(n);
        }

        // ── Write operations ─────────────────────

        public async Task<NotificationResponse> SendNotificationAsync(
            Guid schoolId, Guid senderId, string senderName, SendNotificationRequest request)
        {
            ValidateTitle(request.Title);
            ValidateContent(request.Content);
            ValidateType(request.Type);
            ValidatePriority(request.Priority);
            ValidateRecipientType(request.RecipientType);

            if (request.RecipientId == Guid.Empty)
                throw new ArgumentException("RecipientId is required.");

            var notification = new Notification
            {
                SchoolId = schoolId,
                RecipientId = request.RecipientId,
                RecipientType = request.RecipientType,
                SenderId = senderId,
                SenderName = senderName,
                Type = request.Type,
                Title = request.Title.Trim(),
                Content = request.Content.Trim(),
                Priority = request.Priority,
                ActionUrl = request.ActionUrl,
                ReferenceId = request.ReferenceId,
                ReferenceType = request.ReferenceType,
                IsRead = false,
                CreatedBy = senderId
            };

            _db.Notifications.Add(notification);
            await _db.SaveChangesAsync();

            return ToResponse(notification);
        }

        public async Task<BroadcastResult> BroadcastNotificationAsync(
            Guid schoolId, Guid senderId, string senderName, BroadcastNotificationRequest request)
        {
            ValidateTitle(request.Title);
            ValidateContent(request.Content);
            ValidateType(request.Type);
            ValidatePriority(request.Priority);
            ValidateRecipientType(request.RecipientType);

            List<Guid> recipientIds;

            if (request.RecipientIds != null && request.RecipientIds.Count > 0)
            {
                recipientIds = request.RecipientIds.Distinct().ToList();
            }
            else if (!string.IsNullOrWhiteSpace(request.RecipientRole))
            {
                // Resolve all active users with the given role for this school
                recipientIds = await _db.UserLogins
                    .Where(u => u.SchoolId == schoolId
                                && u.Role == request.RecipientRole
                                && u.Status == "active")
                    .Select(u => u.Id)
                    .ToListAsync();
            }
            else
            {
                throw new ArgumentException("Either RecipientIds or RecipientRole must be provided.");
            }

            if (recipientIds.Count == 0)
                throw new ArgumentException("No recipients found for the broadcast.");

            if (recipientIds.Count > NotificationConstants.MaxBroadcastRecipients)
                throw new ArgumentException($"Broadcast exceeds maximum recipient limit of {NotificationConstants.MaxBroadcastRecipients}.");

            var notifications = recipientIds.Select(rid => new Notification
            {
                SchoolId = schoolId,
                RecipientId = rid,
                RecipientType = request.RecipientType,
                SenderId = senderId,
                SenderName = senderName,
                Type = request.Type,
                Title = request.Title.Trim(),
                Content = request.Content.Trim(),
                Priority = request.Priority,
                ActionUrl = request.ActionUrl,
                ReferenceId = request.ReferenceId,
                ReferenceType = request.ReferenceType,
                IsRead = false,
                CreatedBy = senderId
            }).ToList();

            _db.Notifications.AddRange(notifications);
            await _db.SaveChangesAsync();

            return new BroadcastResult
            {
                TotalRecipients = recipientIds.Count,
                Sent = notifications.Count,
                Failed = 0
            };
        }

        public async Task<bool> MarkAsReadAsync(Guid id, Guid schoolId, Guid userId)
        {
            var notification = await _db.Notifications
                .FirstOrDefaultAsync(n => n.Id == id && n.SchoolId == schoolId && n.RecipientId == userId);

            if (notification == null)
                throw new KeyNotFoundException("Notification not found.");

            if (!notification.IsRead)
            {
                notification.IsRead = true;
                notification.ReadAt = DateTime.UtcNow;
                notification.UpdatedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();
            }

            return true;
        }

        public async Task<int> MarkAllAsReadAsync(Guid schoolId, Guid userId)
        {
            var unread = await _db.Notifications
                .Where(n => n.SchoolId == schoolId && n.RecipientId == userId && !n.IsRead)
                .ToListAsync();

            var now = DateTime.UtcNow;
            foreach (var n in unread)
            {
                n.IsRead = true;
                n.ReadAt = now;
                n.UpdatedAt = now;
            }

            await _db.SaveChangesAsync();
            return unread.Count;
        }

        public async Task<bool> DeleteMyNotificationAsync(Guid id, Guid schoolId, Guid userId)
        {
            var notification = await _db.Notifications
                .FirstOrDefaultAsync(n => n.Id == id && n.SchoolId == schoolId && n.RecipientId == userId);

            if (notification == null)
                throw new KeyNotFoundException("Notification not found.");

            notification.IsDeleted = true;
            notification.DeletedAt = DateTime.UtcNow;
            notification.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> AdminDeleteNotificationAsync(Guid id, Guid schoolId)
        {
            var notification = await _db.Notifications
                .FirstOrDefaultAsync(n => n.Id == id && n.SchoolId == schoolId);

            if (notification == null)
                throw new KeyNotFoundException("Notification not found.");

            notification.IsDeleted = true;
            notification.DeletedAt = DateTime.UtcNow;
            notification.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return true;
        }

        // ── Stats / counts ───────────────────────

        public async Task<UnreadCountResponse> GetUnreadCountAsync(Guid schoolId, Guid userId)
        {
            var count = await _db.Notifications
                .Where(n => n.SchoolId == schoolId && n.RecipientId == userId && !n.IsRead)
                .CountAsync();

            return new UnreadCountResponse { UnreadCount = count };
        }

        public async Task<NotificationStatsResponse> GetStatsAsync(Guid schoolId)
        {
            var all = await _db.Notifications
                .Where(n => n.SchoolId == schoolId)
                .ToListAsync();

            var now = DateTime.UtcNow;
            var total = all.Count;
            var unread = all.Count(n => !n.IsRead);
            var read = all.Count(n => n.IsRead);
            var readRate = total > 0 ? Math.Round((read / (double)total) * 100, 2) : 0.0;

            var byType = all
                .GroupBy(n => n.Type)
                .ToDictionary(g => g.Key, g => g.Count());

            var byPriority = all
                .GroupBy(n => n.Priority)
                .ToDictionary(g => g.Key, g => g.Count());

            var last24h = all.Count(n => n.CreatedAt >= now.AddHours(-24));
            var last7d = all.Count(n => n.CreatedAt >= now.AddDays(-7));

            return new NotificationStatsResponse
            {
                Total = total,
                Unread = unread,
                Read = read,
                ReadRate = readRate,
                ByType = byType,
                ByPriority = byPriority,
                SentLast24Hours = last24h,
                SentLast7Days = last7d
            };
        }
    }
}
