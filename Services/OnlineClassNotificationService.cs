using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.Entities;

namespace SmsApi.Services
{
    public interface IOnlineClassNotificationService
    {
        /// <summary>Enqueues Hangfire reminder jobs at class creation time.</summary>
        Task ScheduleRemindersAsync(OnlineClass cls);

        /// <summary>Sends "class started now" push to all enrolled students (+ parents if flag on).</summary>
        Task SendClassStartedNowAsync(OnlineClass cls);

        /// <summary>Sends "class cancelled" push to enrolled students.</summary>
        Task SendClassCancelledAsync(OnlineClass cls);

        /// <summary>Sends "recording available" push to enrolled students.</summary>
        Task SendRecordingAvailableAsync(OnlineClass cls);

        /// <summary>Called by Hangfire — sends "starting in 15 minutes" push.</summary>
        Task SendStartingSoonAsync(Guid classId, Guid schoolId);
    }

    public class OnlineClassNotificationService : IOnlineClassNotificationService
    {
        private readonly AppDbContext _db;
        private readonly IFirebasePushService _push;
        private readonly ILogger<OnlineClassNotificationService> _logger;

        public OnlineClassNotificationService(
            AppDbContext db,
            IFirebasePushService push,
            ILogger<OnlineClassNotificationService> logger)
        {
            _db = db;
            _push = push;
            _logger = logger;
        }

        public Task ScheduleRemindersAsync(OnlineClass cls)
        {
            // Reminders are handled by the OnlineClassReminderJob recurring job (every 5 minutes).
            // That job scans for classes starting within the next 10-20 minutes and sends push
            // notifications without requiring per-class Hangfire SQL job entries.
            // This avoids a hard dependency on Hangfire SQL tables at class creation time.
            _logger.LogInformation(
                "Class {ClassId} scheduled for {Start} UTC — reminder will be sent by recurring job",
                cls.Id, cls.ScheduledStart);
            return Task.CompletedTask;
        }

        public async Task SendStartingSoonAsync(Guid classId, Guid schoolId)
        {
            var cls = await _db.OnlineClasses.FindAsync(classId);
            if (cls is null || cls.Status != OnlineClassStatus.Scheduled) return;

            var tokens = await GetStudentTokensAsync(schoolId, cls.ClassId, cls.SectionId);
            if (tokens.Count == 0) return;

            var data = new Dictionary<string, string>
            {
                ["type"] = "class_starting_soon",
                ["classId"] = classId.ToString(),
            };

            await _push.SendMulticastAsync(tokens, $"Class starting soon: {cls.Title}", "Your online class starts in 15 minutes.", data);
            await LogNotificationsAsync(classId, schoolId, tokens.Count, "class_starting_soon");
        }

        public async Task SendClassStartedNowAsync(OnlineClass cls)
        {
            var tokens = await GetStudentTokensAsync(cls.SchoolId, cls.ClassId, cls.SectionId);
            if (tokens.Count == 0) return;

            var data = new Dictionary<string, string>
            {
                ["type"] = "class_started_now",
                ["classId"] = cls.Id.ToString(),
            };

            await _push.SendMulticastAsync(tokens, $"Class started: {cls.Title}", "Your teacher has started the online class. Join now!", data);
            await LogNotificationsAsync(cls.Id, cls.SchoolId, tokens.Count, "class_started_now");
        }

        public async Task SendClassCancelledAsync(OnlineClass cls)
        {
            var tokens = await GetStudentTokensAsync(cls.SchoolId, cls.ClassId, cls.SectionId);
            if (tokens.Count == 0) return;

            var data = new Dictionary<string, string>
            {
                ["type"] = "class_cancelled",
                ["classId"] = cls.Id.ToString(),
            };

            await _push.SendMulticastAsync(tokens, $"Class cancelled: {cls.Title}", "The online class has been cancelled by the teacher.", data);
            await LogNotificationsAsync(cls.Id, cls.SchoolId, tokens.Count, "class_cancelled");
        }

        public async Task SendRecordingAvailableAsync(OnlineClass cls)
        {
            var tokens = await GetStudentTokensAsync(cls.SchoolId, cls.ClassId, cls.SectionId);
            if (tokens.Count == 0) return;

            var data = new Dictionary<string, string>
            {
                ["type"] = "recording_available",
                ["classId"] = cls.Id.ToString(),
            };

            await _push.SendMulticastAsync(tokens, $"Recording available: {cls.Title}", "The class recording is now available. Tap to watch.", data);
            await LogNotificationsAsync(cls.Id, cls.SchoolId, tokens.Count, "recording_available");
        }

        // ─── Private helpers ──────────────────────────────────────────────────

        private async Task<List<string>> GetStudentTokensAsync(
            Guid schoolId, Guid? classId, Guid? sectionId)
        {
            // Resolve students enrolled in the given class/section
            IQueryable<Guid> studentQuery;

            if (classId.HasValue || sectionId.HasValue)
            {
                studentQuery = _db.StudentEnrollments
                    .Where(e => e.SchoolId == schoolId &&
                                (!classId.HasValue || e.ClassId == classId) &&
                                (!sectionId.HasValue || e.SectionId == sectionId))
                    .Select(e => e.StudentId)
                    .Distinct();
            }
            else
            {
                // School-wide class — notify all active students
                studentQuery = _db.Students
                    .Where(s => s.SchoolId == schoolId && s.IsActive)
                    .Select(s => s.Id);
            }

            var studentIds = await studentQuery.ToListAsync();
            if (studentIds.Count == 0) return new List<string>();

            // Map student IDs → UserLogin → DeviceTokens
            var userIds = await _db.UserLogins
                .Where(u => u.LinkedEntityId.HasValue && studentIds.Contains(u.LinkedEntityId!.Value) && u.Status == "active")
                .Select(u => u.Id)
                .ToListAsync();

            var tokens = await _db.MobileDeviceTokens
                .Where(t => userIds.Contains(t.UserId) && t.IsActive && t.SchoolId == schoolId)
                .Select(t => t.NativeToken)
                .ToListAsync();

            return tokens;
        }

        private async Task LogNotificationsAsync(
            Guid classId, Guid schoolId, int recipientCount, string notificationType)
        {
            // Log a summary row (not per-device to avoid table bloat)
            var log = new OnlineClassNotificationLog
            {
                SchoolId = schoolId,
                OnlineClassId = classId,
                RecipientId = Guid.Empty, // bulk send — recipient = all enrolled students
                NotificationType = notificationType,
                Channel = NotificationChannel.Push,
                Status = "Sent",
                SentAt = DateTime.UtcNow,
            };

            _db.OnlineClassNotificationLogs.Add(log);
            await _db.SaveChangesAsync();
        }
    }
}
