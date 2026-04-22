using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;

namespace SmsApi.Services
{
    public interface IOfflineAttendanceService
    {
        Task<OfflineAttendanceSessionResponse> CreateSessionAsync(CreateOfflineSessionRequest request);
        Task<OfflineSessionListResponse> GetSessionsAsync(Guid schoolId, int page, int pageSize, Guid? deviceId = null, string? status = null);
        Task<OfflineAttendanceSessionResponse> GetSessionByIdAsync(Guid id, Guid schoolId);
        Task<OfflineAttendanceSessionResponse> CompleteSessionAsync(Guid id, Guid schoolId);
        Task<List<OfflineAttendanceRecordResponse>> AddAttendanceRecordsAsync(BulkOfflineAttendanceRequest request);
        Task<OfflineRecordListResponse> GetSessionRecordsAsync(Guid sessionId, Guid schoolId, int page, int pageSize);
        Task<SyncOfflineAttendanceResponse> SyncAttendanceAsync(SyncOfflineAttendanceRequest request);
        Task<OfflineDeviceResponse> RegisterDeviceAsync(RegisterOfflineDeviceRequest request);
        Task<List<OfflineDeviceResponse>> GetDevicesAsync(Guid schoolId, Guid? staffId = null);
        Task<OfflineDeviceResponse> UpdateDeviceStatusAsync(Guid deviceId, Guid schoolId, bool isActive);
        Task<List<SyncConflictResponse>> GetConflictsAsync(Guid schoolId, int page, int pageSize);
        Task<SyncConflictResponse> ResolveConflictAsync(ResolveConflictRequest request);
    }

    public class OfflineAttendanceService : IOfflineAttendanceService
    {
        private readonly AppDbContext _context;

        public OfflineAttendanceService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<OfflineAttendanceSessionResponse> CreateSessionAsync(CreateOfflineSessionRequest request)
        {
            var sessionId = $"SES-{DateTime.UtcNow:yyyyMMddHHmmss}";

            var session = new OfflineAttendanceSession
            {
                Id = Guid.NewGuid(),
                SchoolId = request.SchoolId,
                SessionId = sessionId,
                DeviceId = request.DeviceId,
                DeviceName = request.DeviceName,
                CapturedByStaffId = request.CapturedByStaffId,
                SessionStartTime = DateTime.UtcNow,
                AttendanceType = request.AttendanceType,
                Status = "InProgress",
                RecordCount = 0,
                CreatedAt = DateTime.UtcNow
            };

            _context.OfflineAttendanceSessions.Add(session);
            await _context.SaveChangesAsync();

            return MapToSessionResponse(session);
        }

        public async Task<OfflineSessionListResponse> GetSessionsAsync(Guid schoolId, int page, int pageSize, Guid? deviceId = null, string? status = null)
        {
            var query = _context.OfflineAttendanceSessions.Where(s => s.SchoolId == schoolId);

            if (deviceId.HasValue)
                query = query.Where(s => s.DeviceId == deviceId.Value);

            if (!string.IsNullOrEmpty(status))
                query = query.Where(s => s.Status == status);

            var total = await query.CountAsync();
            var sessions = await query
                .OrderByDescending(s => s.SessionStartTime)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new OfflineSessionListResponse
            {
                Sessions = sessions.Select(MapToSessionResponse).ToList(),
                Total = total,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<OfflineAttendanceSessionResponse> GetSessionByIdAsync(Guid id, Guid schoolId)
        {
            var session = await _context.OfflineAttendanceSessions
                .FirstOrDefaultAsync(s => s.Id == id && s.SchoolId == schoolId);

            if (session == null)
                throw new KeyNotFoundException("Session not found");

            return MapToSessionResponse(session);
        }

        public async Task<OfflineAttendanceSessionResponse> CompleteSessionAsync(Guid id, Guid schoolId)
        {
            var session = await _context.OfflineAttendanceSessions
                .FirstOrDefaultAsync(s => s.Id == id && s.SchoolId == schoolId);

            if (session == null)
                throw new KeyNotFoundException("Session not found");

            session.Status = "Completed";
            session.SessionEndTime = DateTime.UtcNow;
            session.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return MapToSessionResponse(session);
        }

        public async Task<List<OfflineAttendanceRecordResponse>> AddAttendanceRecordsAsync(BulkOfflineAttendanceRequest request)
        {
            var session = await _context.OfflineAttendanceSessions
                .FirstOrDefaultAsync(s => s.Id == request.SessionId && s.SchoolId == request.SchoolId);

            if (session == null)
                throw new KeyNotFoundException("Session not found");

            var records = new List<OfflineAttendanceRecord>();

            foreach (var recordRequest in request.Records)
            {
                var record = new OfflineAttendanceRecord
                {
                    Id = Guid.NewGuid(),
                    SchoolId = request.SchoolId,
                    SessionId = request.SessionId,
                    EntityId = recordRequest.EntityId,
                    EntityType = recordRequest.EntityType,
                    AttendanceDate = recordRequest.AttendanceDate,
                    Status = recordRequest.Status,
                    CheckInTime = recordRequest.CheckInTime,
                    CheckOutTime = recordRequest.CheckOutTime,
                    ClassId = recordRequest.ClassId,
                    SectionId = recordRequest.SectionId,
                    Remarks = recordRequest.Remarks,
                    CapturedAt = DateTime.UtcNow,
                    SyncStatus = "Pending",
                    DeviceFingerprint = recordRequest.DeviceFingerprint,
                    CreatedAt = DateTime.UtcNow
                };

                records.Add(record);
                _context.OfflineAttendanceRecords.Add(record);
            }

            // Update session record count
            session.RecordCount = await _context.OfflineAttendanceRecords
                .CountAsync(r => r.SessionId == request.SessionId);

            await _context.SaveChangesAsync();
            return records.Select(MapToRecordResponse).ToList();
        }

        public async Task<OfflineRecordListResponse> GetSessionRecordsAsync(Guid sessionId, Guid schoolId, int page, int pageSize)
        {
            var query = _context.OfflineAttendanceRecords
                .Where(r => r.SessionId == sessionId && r.SchoolId == schoolId);

            var total = await query.CountAsync();
            var records = await query
                .OrderBy(r => r.AttendanceDate)
                .ThenBy(r => r.EntityId)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new OfflineRecordListResponse
            {
                Records = records.Select(MapToRecordResponse).ToList(),
                Total = total,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<SyncOfflineAttendanceResponse> SyncAttendanceAsync(SyncOfflineAttendanceRequest request)
        {
            var sessionIdString = request.SessionId.ToString();
            var session = await _context.OfflineAttendanceSessions
                .FirstOrDefaultAsync(s => s.SessionId == sessionIdString && s.SchoolId == request.SchoolId);

            if (session == null)
                throw new KeyNotFoundException("Session not found");

            session.Status = "Syncing";
            session.SyncInitiatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var records = await _context.OfflineAttendanceRecords
                .Where(r => r.SessionId == session.Id && r.SyncStatus == "Pending")
                .ToListAsync();

            int syncedCount = 0;
            int failedCount = 0;
            var errors = new List<SyncErrorDetail>();

            foreach (var record in records)
            {
                try
                {
                    // Check for duplicates
                    var existingRecord = await _context.StudentAttendances
                        .FirstOrDefaultAsync(a => a.SchoolId == record.SchoolId &&
                                                  a.StudentId == record.EntityId &&
                                                  a.Date == record.AttendanceDate);

                    if (existingRecord != null)
                    {
                        // Create conflict
                        var conflict = new SyncConflict
                        {
                            Id = Guid.NewGuid(),
                            SchoolId = record.SchoolId,
                            OfflineRecordId = record.Id,
                            ConflictType = "Duplicate",
                            ServerRecordId = existingRecord.Id,
                            OfflineData = $"Status: {record.Status}, CheckIn: {record.CheckInTime}",
                            ServerData = $"Status: {existingRecord.Status}, CheckIn: {existingRecord.CheckInTime}",
                            Status = "Pending",
                            CreatedAt = DateTime.UtcNow
                        };

                        _context.SyncConflicts.Add(conflict);
                        record.SyncStatus = "Failed";
                        record.SyncError = "Duplicate record found";
                        failedCount++;
                    }
                    else
                    {
                        // Create new attendance record
                        var userId = Guid.NewGuid(); // TODO: Get from current user context
                        var attendance = new AttendanceRecord
                        {
                            Id = Guid.NewGuid(),
                            SchoolId = record.SchoolId,
                            StudentId = record.EntityId,
                            Date = record.AttendanceDate,
                            Status = record.Status,
                            CheckInTime = record.CheckInTime,
                            CheckOutTime = record.CheckOutTime,
                            Remarks = record.Remarks,
                            MarkedBy = userId,
                            CreatedAt = DateTime.UtcNow
                        };

                        _context.AttendanceRecords.Add(attendance);
                        record.SyncStatus = "Synced";
                        record.SyncedAt = DateTime.UtcNow;
                        record.ServerRecordId = attendance.Id;
                        syncedCount++;
                    }
                }
                catch (Exception ex)
                {
                    record.SyncStatus = "Failed";
                    record.SyncError = ex.Message;
                    failedCount++;

                    errors.Add(new SyncErrorDetail
                    {
                        RecordId = record.Id,
                        EntityId = record.EntityId,
                        EntityType = record.EntityType,
                        Error = ex.Message
                    });
                }
            }

            session.Status = failedCount > 0 ? "Failed" : "Synced";
            session.SyncCompletedAt = DateTime.UtcNow;
            session.SyncedRecords = syncedCount;
            session.FailedRecords = failedCount;
            session.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return new SyncOfflineAttendanceResponse
            {
                SessionId = request.SessionId,
                TotalRecords = records.Count,
                SyncedRecords = syncedCount,
                FailedRecords = failedCount,
                Errors = errors
            };
        }

        public async Task<OfflineDeviceResponse> RegisterDeviceAsync(RegisterOfflineDeviceRequest request)
        {
            var existingDevice = await _context.OfflineDevices
                .FirstOrDefaultAsync(d => d.DeviceId == request.DeviceId && d.SchoolId == request.SchoolId);

            if (existingDevice != null)
            {
                existingDevice.DeviceName = request.DeviceName;
                existingDevice.DeviceType = request.DeviceType;
                existingDevice.DeviceFingerprint = request.DeviceFingerprint;
                existingDevice.AssignedToStaffId = request.AssignedToStaffId;
                existingDevice.IsActive = true;
                existingDevice.LastActiveAt = DateTime.UtcNow;
                existingDevice.AppVersion = request.AppVersion;
                existingDevice.OSVersion = request.OSVersion;
                existingDevice.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                return MapToDeviceResponse(existingDevice);
            }
            else
            {
                var device = new OfflineDevice
                {
                    Id = Guid.NewGuid(),
                    SchoolId = request.SchoolId,
                    DeviceId = request.DeviceId,
                    DeviceName = request.DeviceName,
                    DeviceType = request.DeviceType,
                    DeviceFingerprint = request.DeviceFingerprint,
                    AssignedToStaffId = request.AssignedToStaffId,
                    IsActive = true,
                    LastActiveAt = DateTime.UtcNow,
                    AppVersion = request.AppVersion,
                    OSVersion = request.OSVersion,
                    CreatedAt = DateTime.UtcNow
                };

                _context.OfflineDevices.Add(device);
                await _context.SaveChangesAsync();

                return MapToDeviceResponse(device);
            }
        }

        public async Task<List<OfflineDeviceResponse>> GetDevicesAsync(Guid schoolId, Guid? staffId = null)
        {
            var query = _context.OfflineDevices.Where(d => d.SchoolId == schoolId);

            if (staffId.HasValue)
                query = query.Where(d => d.AssignedToStaffId == staffId.Value);

            var devices = await query.OrderBy(d => d.DeviceName).ToListAsync();
            return devices.Select(MapToDeviceResponse).ToList();
        }

        public async Task<OfflineDeviceResponse> UpdateDeviceStatusAsync(Guid deviceId, Guid schoolId, bool isActive)
        {
            var device = await _context.OfflineDevices
                .FirstOrDefaultAsync(d => d.DeviceId == deviceId && d.SchoolId == schoolId);

            if (device == null)
                throw new KeyNotFoundException("Device not found");

            device.IsActive = isActive;
            device.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return MapToDeviceResponse(device);
        }

        public async Task<List<SyncConflictResponse>> GetConflictsAsync(Guid schoolId, int page, int pageSize)
        {
            var conflicts = await _context.SyncConflicts
                .Where(c => c.SchoolId == schoolId && c.Status == "Pending")
                .OrderBy(c => c.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return conflicts.Select(MapToConflictResponse).ToList();
        }

        public async Task<SyncConflictResponse> ResolveConflictAsync(ResolveConflictRequest request)
        {
            var conflict = await _context.SyncConflicts
                .FirstOrDefaultAsync(c => c.Id == request.ConflictId && c.SchoolId == request.SchoolId);

            if (conflict == null)
                throw new KeyNotFoundException("Conflict not found");

            conflict.Status = "Resolved";
            conflict.Resolution = request.Resolution;
            conflict.ResolutionRemarks = request.Remarks;
            conflict.ResolvedAt = DateTime.UtcNow;
            conflict.ResolvedByStaffId = request.ResolvedByStaffId;
            conflict.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return MapToConflictResponse(conflict);
        }

        private OfflineAttendanceSessionResponse MapToSessionResponse(OfflineAttendanceSession session)
        {
            return new OfflineAttendanceSessionResponse
            {
                Id = session.Id,
                SchoolId = session.SchoolId,
                SessionId = session.SessionId,
                DeviceId = session.DeviceId,
                DeviceName = session.DeviceName,
                CapturedByStaffId = session.CapturedByStaffId,
                SessionStartTime = session.SessionStartTime,
                SessionEndTime = session.SessionEndTime,
                AttendanceType = session.AttendanceType,
                RecordCount = session.RecordCount,
                Status = session.Status,
                SyncInitiatedAt = session.SyncInitiatedAt,
                SyncCompletedAt = session.SyncCompletedAt,
                SyncedRecords = session.SyncedRecords,
                FailedRecords = session.FailedRecords,
                CreatedAt = session.CreatedAt,
                UpdatedAt = session.UpdatedAt
            };
        }

        private OfflineAttendanceRecordResponse MapToRecordResponse(OfflineAttendanceRecord record)
        {
            return new OfflineAttendanceRecordResponse
            {
                Id = record.Id,
                SchoolId = record.SchoolId,
                SessionId = record.SessionId,
                EntityId = record.EntityId,
                EntityType = record.EntityType,
                AttendanceDate = record.AttendanceDate,
                Status = record.Status,
                CheckInTime = record.CheckInTime,
                CheckOutTime = record.CheckOutTime,
                ClassId = record.ClassId,
                SectionId = record.SectionId,
                Remarks = record.Remarks,
                SyncStatus = record.SyncStatus,
                SyncedAt = record.SyncedAt,
                ServerRecordId = record.ServerRecordId,
                SyncError = record.SyncError,
                CreatedAt = record.CreatedAt
            };
        }

        private OfflineDeviceResponse MapToDeviceResponse(OfflineDevice device)
        {
            return new OfflineDeviceResponse
            {
                Id = device.Id,
                SchoolId = device.SchoolId,
                DeviceId = device.DeviceId,
                DeviceName = device.DeviceName,
                DeviceType = device.DeviceType,
                DeviceFingerprint = device.DeviceFingerprint,
                AssignedToStaffId = device.AssignedToStaffId,
                IsActive = device.IsActive,
                LastSyncedAt = device.LastSyncedAt,
                LastActiveAt = device.LastActiveAt,
                AppVersion = device.AppVersion,
                OSVersion = device.OSVersion,
                CreatedAt = device.CreatedAt,
                UpdatedAt = device.UpdatedAt
            };
        }

        private SyncConflictResponse MapToConflictResponse(SyncConflict conflict)
        {
            return new SyncConflictResponse
            {
                Id = conflict.Id,
                SchoolId = conflict.SchoolId,
                OfflineRecordId = conflict.OfflineRecordId,
                ConflictType = conflict.ConflictType,
                ServerRecordId = conflict.ServerRecordId,
                OfflineData = conflict.OfflineData,
                ServerData = conflict.ServerData,
                Status = conflict.Status,
                Resolution = conflict.Resolution,
                ResolutionRemarks = conflict.ResolutionRemarks,
                ResolvedAt = conflict.ResolvedAt,
                ResolvedByStaffId = conflict.ResolvedByStaffId,
                CreatedAt = conflict.CreatedAt
            };
        }
    }
}

