using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SmsApi.Data;
using SmsApi.Models.Entities;

namespace SmsApi.Services
{
    public class RecordingDto
    {
        public Guid Id { get; set; }
        public Guid ClassId { get; set; }
        public string ClassTitle { get; set; } = string.Empty;
        public string PlaybackUrl { get; set; } = string.Empty;
        public string? DownloadUrl { get; set; }
        public int DurationSeconds { get; set; }
        public decimal FileSizeMb { get; set; }
        public bool IsTeacherRestricted { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public interface IRecordingService
    {
        Task HandleRecordingCompletedAsync(OnlineClass cls, string egressId, string s3Location, int durationSeconds, decimal fileSizeMb);
        Task<List<RecordingDto>> GetRecordingsAsync(Guid classId, Guid schoolId, bool isTeacher);
        Task<bool> ToggleTeacherRestrictAsync(Guid recordingId, Guid schoolId, bool isRestricted);
        Task<bool> DeleteRecordingAsync(Guid recordingId, Guid schoolId);
    }

    public class RecordingService : IRecordingService
    {
        private readonly AppDbContext _db;
        private readonly IServiceProvider _sp;
        private readonly IOnlineClassNotificationService _notifications;
        private readonly IConfiguration _config;
        private readonly ILogger<RecordingService> _logger;

        private static readonly TimeSpan PresignedUrlExpiry = TimeSpan.FromHours(1);

        /// <summary>
        /// IAmazonS3 is resolved lazily because it is only registered in DI when
        /// AWS credentials are configured. In local dev (empty keys) S3 is not
        /// available — recording metadata is still stored, but presigned URLs return empty.
        /// </summary>
        private IAmazonS3? S3Client => _sp.GetService<IAmazonS3>();

        public RecordingService(
            AppDbContext db,
            IServiceProvider sp,
            IOnlineClassNotificationService notifications,
            IConfiguration config,
            ILogger<RecordingService> logger)
        {
            _db = db;
            _sp = sp;
            _notifications = notifications;
            _config = config;
            _logger = logger;
        }

        public async Task HandleRecordingCompletedAsync(
            OnlineClass cls, string egressId, string s3Location, int durationSeconds, decimal fileSizeMb)
        {
            var (bucket, key) = ParseS3Location(s3Location);

            var existing = await _db.OnlineClassRecordings
                .FirstOrDefaultAsync(r => r.EgressId == egressId);

            if (existing is null)
            {
                var recording = new OnlineClassRecording
                {
                    SchoolId = cls.SchoolId,
                    OnlineClassId = cls.Id,
                    S3Bucket = bucket,
                    S3Key = key,
                    DurationSeconds = durationSeconds,
                    FileSizeMb = fileSizeMb,
                    RecordingStatus = RecordingStatus.Available,
                    EgressId = egressId,
                };
                _db.OnlineClassRecordings.Add(recording);
                await _db.SaveChangesAsync();

                _logger.LogInformation(
                    "Recording completed for class {ClassId}: {S3Key} ({DurationSec}s, {SizeMb}MB)",
                    cls.Id, key, durationSeconds, fileSizeMb);

                await _notifications.SendRecordingAvailableAsync(cls);
            }
            else
            {
                existing.S3Bucket = bucket;
                existing.S3Key = key;
                existing.DurationSeconds = durationSeconds;
                existing.FileSizeMb = fileSizeMb;
                existing.RecordingStatus = RecordingStatus.Available;
                await _db.SaveChangesAsync();
            }
        }

        public async Task<List<RecordingDto>> GetRecordingsAsync(Guid classId, Guid schoolId, bool isTeacher)
        {
            var recordings = await _db.OnlineClassRecordings
                .Where(r => r.OnlineClassId == classId && r.SchoolId == schoolId
                            && r.RecordingStatus == RecordingStatus.Available)
                .Include(r => r.OnlineClass)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            var dtos = new List<RecordingDto>();
            foreach (var rec in recordings)
            {
                var playbackUrl = await GeneratePresignedUrlAsync(rec.S3Bucket, rec.S3Key, PresignedUrlExpiry);
                string? downloadUrl = null;

                if (isTeacher || !rec.IsTeacherRestricted)
                    downloadUrl = playbackUrl;

                dtos.Add(new RecordingDto
                {
                    Id = rec.Id,
                    ClassId = classId,
                    ClassTitle = rec.OnlineClass?.Title ?? string.Empty,
                    PlaybackUrl = playbackUrl,
                    DownloadUrl = isTeacher ? downloadUrl : (rec.IsTeacherRestricted ? null : downloadUrl),
                    DurationSeconds = rec.DurationSeconds,
                    FileSizeMb = rec.FileSizeMb,
                    IsTeacherRestricted = rec.IsTeacherRestricted,
                    Status = rec.RecordingStatus.ToString(),
                    CreatedAt = rec.CreatedAt,
                });
            }

            return dtos;
        }

        public async Task<bool> ToggleTeacherRestrictAsync(Guid recordingId, Guid schoolId, bool isRestricted)
        {
            var rec = await _db.OnlineClassRecordings
                .FirstOrDefaultAsync(r => r.Id == recordingId && r.SchoolId == schoolId);

            if (rec is null) return false;
            rec.IsTeacherRestricted = isRestricted;
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteRecordingAsync(Guid recordingId, Guid schoolId)
        {
            var rec = await _db.OnlineClassRecordings
                .FirstOrDefaultAsync(r => r.Id == recordingId && r.SchoolId == schoolId);

            if (rec is null) return false;

            _db.OnlineClassRecordings.Remove(rec);
            await _db.SaveChangesAsync();

            _logger.LogInformation("Recording {RecordingId} soft-deleted for school {SchoolId}", recordingId, schoolId);
            return true;
        }

        private async Task<string> GeneratePresignedUrlAsync(string bucket, string key, TimeSpan expiry)
        {
            if (string.IsNullOrEmpty(bucket) || string.IsNullOrEmpty(key))
                return string.Empty;

            var s3 = S3Client;
            if (s3 is null)
            {
                _logger.LogDebug("S3 not configured — returning empty presigned URL for {Key}", key);
                return string.Empty;
            }

            try
            {
                var request = new GetPreSignedUrlRequest
                {
                    BucketName = bucket,
                    Key = key,
                    Expires = DateTime.UtcNow.Add(expiry),
                    Protocol = Protocol.HTTPS,
                };
                return await s3.GetPreSignedURLAsync(request);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate presigned URL for s3://{Bucket}/{Key}", bucket, key);
                return string.Empty;
            }
        }

        private static (string bucket, string key) ParseS3Location(string s3Location)
        {
            if (string.IsNullOrEmpty(s3Location))
                return (string.Empty, string.Empty);

            var withoutScheme = s3Location.Replace("s3://", string.Empty);
            var slashIndex = withoutScheme.IndexOf('/');
            if (slashIndex < 0)
                return (withoutScheme, string.Empty);

            return (withoutScheme[..slashIndex], withoutScheme[(slashIndex + 1)..]);
        }
    }
}
