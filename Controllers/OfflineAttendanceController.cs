using SmsApi.Models.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmsApi.Models.DTOs;
using SmsApi.Services;

namespace SmsApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class OfflineAttendanceController : ControllerBase
    {
        private readonly IOfflineAttendanceService _offlineAttendanceService;
        private readonly ITenantContext _tenant;

        public OfflineAttendanceController(IOfflineAttendanceService offlineAttendanceService, ITenantContext tenant)
        {
            _offlineAttendanceService = offlineAttendanceService;
            _tenant = tenant;
        }

        // Sessions
        [HttpPost("sessions")]
        public async Task<ActionResult<OfflineAttendanceSessionResponse>> CreateSession([FromBody] CreateOfflineSessionRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                request.SchoolId = schoolId;
                
                var session = await _offlineAttendanceService.CreateSessionAsync(request);
                return CreatedAtAction(nameof(GetSessionById), new { id = session.Id, schoolId = session.SchoolId }, session);
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpGet("sessions/{schoolId}")]
        public async Task<ActionResult<OfflineSessionListResponse>> GetSessions(
            Guid schoolId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] Guid? deviceId = null,
            [FromQuery] string? status = null)
        {
            try
            {
                var jwtSchoolId = _tenant.GetEffectiveSchoolId();
                if (schoolId != jwtSchoolId)
                    throw new UnauthorizedAccessException("School mismatch - cross-school access denied");
                
                var sessions = await _offlineAttendanceService.GetSessionsAsync(schoolId, page, pageSize, deviceId, status);
                return Ok(sessions);
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpGet("sessions/{id}/school/{schoolId}")]
        public async Task<ActionResult<OfflineAttendanceSessionResponse>> GetSessionById(Guid id, Guid schoolId)
        {
            try
            {
                var session = await _offlineAttendanceService.GetSessionByIdAsync(id, schoolId);
                return Ok(session);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpPost("sessions/{id}/complete")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipalStaff)]
        public async Task<ActionResult<OfflineAttendanceSessionResponse>> CompleteSession(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var session = await _offlineAttendanceService.CompleteSessionAsync(id, schoolId);
                return Ok(session);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // Records
        [HttpPost("records/bulk")]
        public async Task<ActionResult<List<OfflineAttendanceRecordResponse>>> AddAttendanceRecords([FromBody] BulkOfflineAttendanceRequest request)
        {
            try
            {
                var records = await _offlineAttendanceService.AddAttendanceRecordsAsync(request);
                return Ok(records);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpGet("records/session/{sessionId}/school/{schoolId}")]
        public async Task<ActionResult<OfflineRecordListResponse>> GetSessionRecords(
            Guid sessionId,
            Guid schoolId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            try
            {
                var records = await _offlineAttendanceService.GetSessionRecordsAsync(sessionId, schoolId, page, pageSize);
                return Ok(records);
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // Sync
        [HttpPost("sync")]
        public async Task<ActionResult<SyncOfflineAttendanceResponse>> SyncAttendance([FromBody] SyncOfflineAttendanceRequest request)
        {
            try
            {
                var result = await _offlineAttendanceService.SyncAttendanceAsync(request);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // Devices
        [HttpPost("devices")]
        public async Task<ActionResult<OfflineDeviceResponse>> RegisterDevice([FromBody] RegisterOfflineDeviceRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                request.SchoolId = schoolId;
                
                var device = await _offlineAttendanceService.RegisterDeviceAsync(request);
                return CreatedAtAction(nameof(GetDevices), new { schoolId = device.SchoolId }, device);
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpGet("devices/{schoolId}")]
        public async Task<ActionResult<List<OfflineDeviceResponse>>> GetDevices(Guid schoolId, [FromQuery] Guid? staffId = null)
        {
            try
            {
                var jwtSchoolId = _tenant.GetEffectiveSchoolId();
                if (schoolId != jwtSchoolId)
                    throw new UnauthorizedAccessException("School mismatch - cross-school access denied");
                
                var devices = await _offlineAttendanceService.GetDevicesAsync(schoolId, staffId);
                return Ok(devices);
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpPut("devices/{deviceId}/status")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipalStaff)]
        public async Task<ActionResult<OfflineDeviceResponse>> UpdateDeviceStatus(Guid deviceId, [FromQuery] bool isActive)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var device = await _offlineAttendanceService.UpdateDeviceStatusAsync(deviceId, schoolId, isActive);
                return Ok(device);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // Conflicts
        [HttpGet("conflicts/{schoolId}")]
        public async Task<ActionResult<List<SyncConflictResponse>>> GetConflicts(Guid schoolId, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            try
            {
                var jwtSchoolId = _tenant.GetEffectiveSchoolId();
                if (schoolId != jwtSchoolId)
                    throw new UnauthorizedAccessException("School mismatch - cross-school access denied");
                
                var conflicts = await _offlineAttendanceService.GetConflictsAsync(schoolId, page, pageSize);
                return Ok(conflicts);
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpPost("conflicts/resolve")]
        public async Task<ActionResult<SyncConflictResponse>> ResolveConflict([FromBody] ResolveConflictRequest request)
        {
            try
            {
                var conflict = await _offlineAttendanceService.ResolveConflictAsync(request);
                return Ok(conflict);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }
    }
}
