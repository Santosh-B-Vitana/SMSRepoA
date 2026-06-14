using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.Entities;

namespace SmsApi.Services
{
    // ─── Request / Response DTOs ──────────────────────────────────────────────

    public class ScheduleOnlineClassRequest
    {
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public Guid? SubjectId { get; set; }
        public Guid? ClassId { get; set; }
        public Guid? SectionId { get; set; }
        public DateTime ScheduledStart { get; set; }
        public DateTime ScheduledEnd { get; set; }
        public int MaxParticipants { get; set; } = 100;
        public bool IsRecordingEnabled { get; set; } = false;
        public string AcademicYear { get; set; } = string.Empty;
    }

    public class OnlineClassDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string HostName { get; set; } = string.Empty;
        public Guid HostStaffId { get; set; }
        public string? SubjectName { get; set; }
        public string? ClassName { get; set; }
        public string? SectionName { get; set; }
        public string Provider { get; set; } = string.Empty;
        public string? MeetingUrl { get; set; }
        public DateTime ScheduledStart { get; set; }
        public DateTime ScheduledEnd { get; set; }
        public DateTime? ActualStart { get; set; }
        public DateTime? ActualEnd { get; set; }
        public string Status { get; set; } = string.Empty;
        public int MaxParticipants { get; set; }
        public bool IsRecordingEnabled { get; set; }
        public bool IsInstant { get; set; }
        public string AcademicYear { get; set; } = string.Empty;
        public int RecordingCount { get; set; }
        public int AttendeeCount { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class JoinClassResponse
    {
        public Guid ClassId { get; set; }
        public string RoomName { get; set; } = string.Empty;
        public string Token { get; set; } = string.Empty;
        public string WsUrl { get; set; } = string.Empty;
        public string? MeetingUrl { get; set; }
        public bool IsHost { get; set; }
    }

    public class AttendanceOverrideRequest
    {
        public OnlineClassAttendanceStatus Status { get; set; }
        public string? Notes { get; set; }
    }

    public class OnlineClassAttendanceDto
    {
        public Guid StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string? RollNumber { get; set; }
        public DateTime? JoinTime { get; set; }
        public DateTime? LeaveTime { get; set; }
        public int TotalDurationMinutes { get; set; }
        public int JoinCount { get; set; }
        public string AttendanceStatus { get; set; } = string.Empty;
        public bool IsManualOverride { get; set; }
    }

    public class OnlineClassListResponse
    {
        public List<OnlineClassDto> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
    }

    // ─── Interface ────────────────────────────────────────────────────────────

    public interface IOnlineClassService
    {
        Task<OnlineClassDto> ScheduleClassAsync(Guid schoolId, Guid staffId, string academicYear, ScheduleOnlineClassRequest request);
        Task<OnlineClassDto> CreateInstantClassAsync(Guid schoolId, Guid staffId, string academicYear, string? title);
        Task<OnlineClassListResponse> GetUpcomingAsync(Guid schoolId, Guid userId, string role, int page, int pageSize);
        Task<List<OnlineClassDto>> GetTodaysClassesAsync(Guid schoolId, Guid userId, string role, string academicYear);
        Task<OnlineClassDto?> GetByIdAsync(Guid id, Guid schoolId);
        Task<bool> CancelClassAsync(Guid id, Guid schoolId, Guid requestingStaffId);
        Task<JoinClassResponse> JoinClassAsync(Guid id, Guid schoolId, Guid userId, string displayName, bool isHost);
        Task<bool> EndClassAsync(Guid id, Guid schoolId, Guid staffId);
        Task<List<OnlineClassAttendanceDto>> GetAttendanceAsync(Guid classId, Guid schoolId);
        Task<bool> OverrideAttendanceAsync(Guid classId, Guid studentId, Guid schoolId, Guid overriddenBy, AttendanceOverrideRequest request);
    }

    // ─── Implementation ───────────────────────────────────────────────────────

    public class OnlineClassService : IOnlineClassService
    {
        private readonly AppDbContext _db;
        private readonly ILiveKitTokenService _liveKit;
        private readonly IOnlineClassNotificationService _notifications;
        private readonly IConfiguration _config;
        private readonly ILogger<OnlineClassService> _logger;

        public OnlineClassService(
            AppDbContext db,
            ILiveKitTokenService liveKit,
            IOnlineClassNotificationService notifications,
            IConfiguration config,
            ILogger<OnlineClassService> logger)
        {
            _db = db;
            _liveKit = liveKit;
            _notifications = notifications;
            _config = config;
            _logger = logger;
        }

        public async Task<OnlineClassDto> ScheduleClassAsync(
            Guid schoolId, Guid staffId, string academicYear, ScheduleOnlineClassRequest request)
        {
            var cls = new OnlineClass
            {
                SchoolId = schoolId,
                HostStaffId = staffId,
                Title = request.Title,
                Description = request.Description,
                SubjectId = request.SubjectId,
                ClassId = request.ClassId,
                SectionId = request.SectionId,
                ScheduledStart = request.ScheduledStart.ToUniversalTime(),
                ScheduledEnd = request.ScheduledEnd.ToUniversalTime(),
                MaxParticipants = request.MaxParticipants,
                IsRecordingEnabled = request.IsRecordingEnabled,
                IsInstant = false,
                AcademicYear = academicYear,
                Status = OnlineClassStatus.Scheduled,
            };

            cls.ProviderRoomName = _liveKit.BuildRoomName(schoolId, cls.Id);

            _db.OnlineClasses.Add(cls);
            await _db.SaveChangesAsync();

            // Enqueue reminder notifications — wrapped in try-catch so a Hangfire
            // infrastructure failure never prevents the class from being created.
            try { await _notifications.ScheduleRemindersAsync(cls); }
            catch (Exception ex) { _logger.LogWarning(ex, "Could not schedule reminder for class {ClassId}", cls.Id); }

            _logger.LogInformation("Online class {ClassId} scheduled for school {SchoolId}", cls.Id, schoolId);
            return await MapToDto(cls);
        }

        public async Task<OnlineClassDto> CreateInstantClassAsync(
            Guid schoolId, Guid staffId, string academicYear, string? title)
        {
            var now = DateTime.UtcNow;
            var cls = new OnlineClass
            {
                SchoolId = schoolId,
                HostStaffId = staffId,
                Title = string.IsNullOrWhiteSpace(title) ? $"Instant Class — {now:dd MMM HH:mm}" : title,
                ScheduledStart = now,
                ScheduledEnd = now.AddHours(1),
                IsInstant = true,
                AcademicYear = academicYear,
                Status = OnlineClassStatus.Live,
                ActualStart = now,
            };

            cls.ProviderRoomName = _liveKit.BuildRoomName(schoolId, cls.Id);

            _db.OnlineClasses.Add(cls);
            await _db.SaveChangesAsync();

            // Notify enrolled students immediately
            await _notifications.SendClassStartedNowAsync(cls);

            _logger.LogInformation("Instant online class {ClassId} started for school {SchoolId}", cls.Id, schoolId);
            return await MapToDto(cls);
        }

        public async Task<OnlineClassListResponse> GetUpcomingAsync(
            Guid schoolId, Guid userId, string role, int page, int pageSize)
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 50);

            var query = _db.OnlineClasses
                .Where(c => c.SchoolId == schoolId &&
                            (c.Status == OnlineClassStatus.Scheduled || c.Status == OnlineClassStatus.Live) &&
                            c.ScheduledStart >= DateTime.UtcNow.AddMinutes(-30))
                .Include(c => c.HostStaff)
                .Include(c => c.Subject)
                .Include(c => c.TargetClass)
                .Include(c => c.TargetSection)
                .OrderBy(c => c.ScheduledStart)
                .AsQueryable();

            var total = await query.CountAsync();
            var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

            var dtos = new List<OnlineClassDto>();
            foreach (var c in items)
                dtos.Add(await MapToDto(c));

            return new OnlineClassListResponse
            {
                Items = dtos,
                TotalCount = total,
                Page = page,
                PageSize = pageSize,
            };
        }

        public async Task<List<OnlineClassDto>> GetTodaysClassesAsync(
            Guid schoolId, Guid userId, string role, string academicYear)
        {
            var todayStart = DateTime.UtcNow.Date;
            var todayEnd = todayStart.AddDays(1);

            var classes = await _db.OnlineClasses
                .Where(c => c.SchoolId == schoolId &&
                            c.AcademicYear == academicYear &&
                            c.ScheduledStart >= todayStart &&
                            c.ScheduledStart < todayEnd &&
                            c.Status != OnlineClassStatus.Cancelled)
                .Include(c => c.HostStaff)
                .Include(c => c.Subject)
                .Include(c => c.TargetClass)
                .Include(c => c.TargetSection)
                .OrderBy(c => c.ScheduledStart)
                .ToListAsync();

            var dtos = new List<OnlineClassDto>();
            foreach (var c in classes)
                dtos.Add(await MapToDto(c));
            return dtos;
        }

        public async Task<OnlineClassDto?> GetByIdAsync(Guid id, Guid schoolId)
        {
            var cls = await _db.OnlineClasses
                .Include(c => c.HostStaff)
                .Include(c => c.Subject)
                .Include(c => c.TargetClass)
                .Include(c => c.TargetSection)
                .FirstOrDefaultAsync(c => c.Id == id && c.SchoolId == schoolId);

            return cls is null ? null : await MapToDto(cls);
        }

        public async Task<bool> CancelClassAsync(Guid id, Guid schoolId, Guid requestingStaffId)
        {
            var cls = await _db.OnlineClasses
                .FirstOrDefaultAsync(c => c.Id == id && c.SchoolId == schoolId);

            if (cls is null || cls.Status == OnlineClassStatus.Ended) return false;

            cls.Status = OnlineClassStatus.Cancelled;
            await _db.SaveChangesAsync();

            await _notifications.SendClassCancelledAsync(cls);
            return true;
        }

        public async Task<JoinClassResponse> JoinClassAsync(
            Guid id, Guid schoolId, Guid userId, string displayName, bool isHost)
        {
            var cls = await _db.OnlineClasses
                .FirstOrDefaultAsync(c => c.Id == id && c.SchoolId == schoolId);

            if (cls is null)
                throw new KeyNotFoundException("Online class not found.");

            if (cls.Status == OnlineClassStatus.Cancelled)
                throw new InvalidOperationException("This class has been cancelled.");

            if (cls.Status == OnlineClassStatus.Ended)
                throw new InvalidOperationException("This class has already ended.");

            // Teacher joining marks the class as Live
            if (isHost && cls.Status == OnlineClassStatus.Scheduled)
            {
                cls.Status = OnlineClassStatus.Live;
                cls.ActualStart = DateTime.UtcNow;
                await _db.SaveChangesAsync();
                await _notifications.SendClassStartedNowAsync(cls);
            }

            var creds = await _liveKit.ResolveCredentialsAsync(schoolId);
            var roomName = cls.ProviderRoomName ?? _liveKit.BuildRoomName(schoolId, id);

            var expiryMinutes = int.TryParse(_config["LiveKit:TokenExpiryMinutes"], out var exp) ? exp : 15;
            var token = LiveKitTokenService.GenerateRoomTokenWithCredentials(
                creds.ApiKey,
                creds.ApiSecret,
                roomName,
                userId.ToString("N"),
                displayName,
                canPublish: isHost,
                canSubscribe: true,
                expiryMinutes: expiryMinutes);

            return new JoinClassResponse
            {
                ClassId = id,
                RoomName = roomName,
                Token = token,
                WsUrl = creds.ServerUrl,
                MeetingUrl = cls.MeetingUrl,
                IsHost = isHost,
            };
        }

        public async Task<bool> EndClassAsync(Guid id, Guid schoolId, Guid staffId)
        {
            var cls = await _db.OnlineClasses
                .FirstOrDefaultAsync(c => c.Id == id && c.SchoolId == schoolId);

            if (cls is null || cls.Status != OnlineClassStatus.Live) return false;

            cls.Status = OnlineClassStatus.Ended;
            cls.ActualEnd = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return true;
        }

        public async Task<List<OnlineClassAttendanceDto>> GetAttendanceAsync(Guid classId, Guid schoolId)
        {
            var records = await _db.OnlineClassAttendanceRecords
                .Where(a => a.OnlineClassId == classId && a.SchoolId == schoolId)
                .Include(a => a.Student)
                .OrderBy(a => a.Student!.FirstName)
                .ThenBy(a => a.Student!.LastName)
                .ToListAsync();

            return records.Select(r => new OnlineClassAttendanceDto
            {
                StudentId = r.StudentId,
                StudentName = r.Student is null
                    ? r.StudentId.ToString()
                    : $"{r.Student.FirstName} {r.Student.LastName}".Trim(),
                RollNumber = r.Student?.RollNumber,
                JoinTime = r.JoinTime,
                LeaveTime = r.LeaveTime,
                TotalDurationMinutes = r.TotalDurationMinutes,
                JoinCount = r.JoinCount,
                AttendanceStatus = r.AttendanceStatus.ToString(),
                IsManualOverride = r.IsManualOverride,
            }).ToList();
        }

        public async Task<bool> OverrideAttendanceAsync(
            Guid classId, Guid studentId, Guid schoolId, Guid overriddenBy, AttendanceOverrideRequest request)
        {
            var record = await _db.OnlineClassAttendanceRecords
                .FirstOrDefaultAsync(a => a.OnlineClassId == classId &&
                                          a.StudentId == studentId &&
                                          a.SchoolId == schoolId);

            if (record is null)
            {
                record = new OnlineClassAttendanceRecord
                {
                    SchoolId = schoolId,
                    OnlineClassId = classId,
                    StudentId = studentId,
                };
                _db.OnlineClassAttendanceRecords.Add(record);
            }

            record.AttendanceStatus = request.Status;
            record.IsManualOverride = true;
            record.ManualOverrideBy = overriddenBy;
            record.ManualOverrideAt = DateTime.UtcNow;
            record.Notes = request.Notes;

            await _db.SaveChangesAsync();
            return true;
        }

        // ─── Helpers ──────────────────────────────────────────────────────────

        private async Task<OnlineClassDto> MapToDto(OnlineClass cls)
        {
            var recordingCount = await _db.OnlineClassRecordings
                .CountAsync(r => r.OnlineClassId == cls.Id && r.RecordingStatus == RecordingStatus.Available);
            var attendeeCount = await _db.OnlineClassAttendanceRecords
                .CountAsync(a => a.OnlineClassId == cls.Id);

            return new OnlineClassDto
            {
                Id = cls.Id,
                Title = cls.Title,
                Description = cls.Description,
                HostName = cls.HostStaff is null
                    ? string.Empty
                    : $"{cls.HostStaff.FirstName} {cls.HostStaff.LastName}".Trim(),
                HostStaffId = cls.HostStaffId,
                SubjectName = cls.Subject?.Name,
                ClassName = cls.TargetClass?.Name,
                SectionName = cls.TargetSection?.Name,
                Provider = cls.Provider.ToString(),
                MeetingUrl = cls.MeetingUrl,
                ScheduledStart = cls.ScheduledStart,
                ScheduledEnd = cls.ScheduledEnd,
                ActualStart = cls.ActualStart,
                ActualEnd = cls.ActualEnd,
                Status = cls.Status.ToString(),
                MaxParticipants = cls.MaxParticipants,
                IsRecordingEnabled = cls.IsRecordingEnabled,
                IsInstant = cls.IsInstant,
                AcademicYear = cls.AcademicYear,
                RecordingCount = recordingCount,
                AttendeeCount = attendeeCount,
                CreatedAt = cls.CreatedAt,
            };
        }
    }
}
