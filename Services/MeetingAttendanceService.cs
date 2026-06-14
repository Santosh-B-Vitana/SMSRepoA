using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.Entities;

namespace SmsApi.Services
{
    // ─── LiveKit webhook payload models ──────────────────────────────────────

    public class LiveKitWebhookEvent
    {
        public string Event { get; set; } = string.Empty;
        public LiveKitRoom? Room { get; set; }
        public LiveKitParticipant? Participant { get; set; }
        public LiveKitEgressInfo? EgressInfo { get; set; }
        public long CreatedAt { get; set; }
    }

    public class LiveKitRoom
    {
        public string Name { get; set; } = string.Empty;
    }

    public class LiveKitParticipant
    {
        public string Identity { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Sid { get; set; } = string.Empty;
        public long JoinedAt { get; set; }
        public long LeftAt { get; set; }
    }

    public class LiveKitEgressInfo
    {
        public string EgressId { get; set; } = string.Empty;
        public string RoomName { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public List<LiveKitEgressFile> FileResults { get; set; } = new();
    }

    public class LiveKitEgressFile
    {
        public string Filename { get; set; } = string.Empty;
        public long Size { get; set; }
        public long Duration { get; set; }
        public string Location { get; set; } = string.Empty;
    }

    // ─── Interface ────────────────────────────────────────────────────────────

    public interface IMeetingAttendanceService
    {
        Task HandleParticipantJoinedAsync(LiveKitWebhookEvent evt);
        Task HandleParticipantLeftAsync(LiveKitWebhookEvent evt);
        Task HandleEgressEndedAsync(LiveKitWebhookEvent evt);
    }

    // ─── Implementation ───────────────────────────────────────────────────────

    public class MeetingAttendanceService : IMeetingAttendanceService
    {
        private readonly AppDbContext _db;
        private readonly IRecordingService _recordings;
        private readonly IOnlineClassNotificationService _notifications;
        private readonly ILogger<MeetingAttendanceService> _logger;

        // Thresholds for automatic attendance classification
        private const int AbsentThresholdMinutes = 2;    // join+leave within 2 min = JoinedAndLeftImmediately
        private const int PartialThresholdPercent = 25;   // < 25% = PartiallyPresent
        private const int PresentThresholdPercent = 75;   // >= 75% = Present

        public MeetingAttendanceService(
            AppDbContext db,
            IRecordingService recordings,
            IOnlineClassNotificationService notifications,
            ILogger<MeetingAttendanceService> logger)
        {
            _db = db;
            _recordings = recordings;
            _notifications = notifications;
            _logger = logger;
        }

        public async Task HandleParticipantJoinedAsync(LiveKitWebhookEvent evt)
        {
            if (evt.Room is null || evt.Participant is null) return;

            var cls = await ResolveClassAsync(evt.Room.Name);
            if (cls is null) return;

            // Identity = userId (Guid N format)
            if (!Guid.TryParse(evt.Participant.Identity, out var userId)) return;

            var student = await ResolveStudentAsync(userId, cls.SchoolId);
            if (student is null) return; // host/non-student participant

            var joinTime = DateTimeOffset.FromUnixTimeSeconds(evt.CreatedAt).UtcDateTime;

            var record = await _db.OnlineClassAttendanceRecords
                .FirstOrDefaultAsync(a => a.OnlineClassId == cls.Id && a.StudentId == student.Id);

            if (record is null)
            {
                record = new OnlineClassAttendanceRecord
                {
                    SchoolId = cls.SchoolId,
                    OnlineClassId = cls.Id,
                    StudentId = student.Id,
                    JoinTime = joinTime,
                    JoinCount = 1,
                };
                _db.OnlineClassAttendanceRecords.Add(record);
            }
            else
            {
                // Reconnect: increment count but keep earliest JoinTime
                record.JoinCount++;
                record.JoinTime ??= joinTime;
            }

            record.AttendanceStatus = OnlineClassAttendanceStatus.Present; // tentative, refined on leave

            await _db.SaveChangesAsync();
            _logger.LogDebug("Participant {Identity} joined class {ClassId}", evt.Participant.Identity, cls.Id);
        }

        public async Task HandleParticipantLeftAsync(LiveKitWebhookEvent evt)
        {
            if (evt.Room is null || evt.Participant is null) return;

            var cls = await ResolveClassAsync(evt.Room.Name);
            if (cls is null) return;

            if (!Guid.TryParse(evt.Participant.Identity, out var userId)) return;

            var student = await ResolveStudentAsync(userId, cls.SchoolId);
            if (student is null) return;

            var leaveTime = DateTimeOffset.FromUnixTimeSeconds(evt.CreatedAt).UtcDateTime;

            var record = await _db.OnlineClassAttendanceRecords
                .FirstOrDefaultAsync(a => a.OnlineClassId == cls.Id && a.StudentId == student.Id);

            if (record is null) return;

            record.LeaveTime = leaveTime;

            // Calculate cumulative duration
            if (record.JoinTime.HasValue)
            {
                var sessionMinutes = (int)(leaveTime - record.JoinTime.Value).TotalMinutes;
                record.TotalDurationMinutes += Math.Max(0, sessionMinutes);
            }

            // Classify attendance only if not already manually overridden
            if (!record.IsManualOverride)
                record.AttendanceStatus = ClassifyAttendance(record, cls);

            await _db.SaveChangesAsync();
            _logger.LogDebug("Participant {Identity} left class {ClassId}. Duration: {Duration}m",
                evt.Participant.Identity, cls.Id, record.TotalDurationMinutes);
        }

        public async Task HandleEgressEndedAsync(LiveKitWebhookEvent evt)
        {
            if (evt.EgressInfo is null) return;

            var egressInfo = evt.EgressInfo;
            var cls = await ResolveClassAsync(egressInfo.RoomName);
            if (cls is null) return;

            // Check for successful file egress
            var fileResult = egressInfo.FileResults.FirstOrDefault();
            if (fileResult is null || egressInfo.Status != "EGRESS_COMPLETE")
            {
                // Mark any pending recording as failed
                var pendingRec = await _db.OnlineClassRecordings
                    .FirstOrDefaultAsync(r => r.EgressId == egressInfo.EgressId);
                if (pendingRec != null)
                {
                    pendingRec.RecordingStatus = RecordingStatus.Failed;
                    await _db.SaveChangesAsync();
                }
                return;
            }

            await _recordings.HandleRecordingCompletedAsync(cls, egressInfo.EgressId, fileResult.Location,
                (int)(fileResult.Duration / 1_000_000_000), (decimal)fileResult.Size / (1024 * 1024));
        }

        // ─── Private helpers ──────────────────────────────────────────────────

        private async Task<OnlineClass?> ResolveClassAsync(string roomName)
        {
            return await _db.OnlineClasses
                .FirstOrDefaultAsync(c => c.ProviderRoomName == roomName);
        }

        private async Task<Student?> ResolveStudentAsync(Guid userId, Guid schoolId)
        {
            var userLogin = await _db.UserLogins.FirstOrDefaultAsync(u => u.Id == userId);
            if (userLogin?.LinkedEntityId is null) return null;

            return await _db.Students.FirstOrDefaultAsync(
                s => s.Id == userLogin.LinkedEntityId && s.SchoolId == schoolId);
        }

        private static OnlineClassAttendanceStatus ClassifyAttendance(
            OnlineClassAttendanceRecord record, OnlineClass cls)
        {
            var classDurationMinutes = (int)(cls.ScheduledEnd - cls.ScheduledStart).TotalMinutes;
            if (classDurationMinutes <= 0) return OnlineClassAttendanceStatus.Present;

            var attended = record.TotalDurationMinutes;

            if (attended <= AbsentThresholdMinutes)
                return OnlineClassAttendanceStatus.JoinedAndLeftImmediately;

            var percentAttended = (double)attended / classDurationMinutes * 100;

            if (percentAttended >= PresentThresholdPercent)
                return OnlineClassAttendanceStatus.Present;

            if (percentAttended >= PartialThresholdPercent)
                return OnlineClassAttendanceStatus.PartiallyPresent;

            return OnlineClassAttendanceStatus.Absent;
        }
    }
}
