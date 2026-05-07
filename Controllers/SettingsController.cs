using SmsApi.Models.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Services;

namespace SmsApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SettingsController : ControllerBase
    {
        private readonly ISettingsService _settingsService;
        private readonly ITenantContext _tenant;
        private readonly AppDbContext _db;

        public SettingsController(ISettingsService settingsService, ITenantContext tenant, AppDbContext db)
        {
            _settingsService = settingsService;
            _tenant = tenant;
            _db = db;
        }

        /// <summary>
        /// Returns basic profile info for the current user's school.
        /// Frontend uses this to populate the school name/logo in the sidebar.
        /// For super admin, the school is resolved from the X-School-Override header.
        /// </summary>
        [HttpGet("school/me")]
        public async Task<ActionResult> GetCurrentSchoolInfo()
        {
            try
            {
                Guid schoolId;

                if (_tenant.IsSuperAdmin)
                {
                    schoolId = _tenant.GetEffectiveSchoolId();
                    if (schoolId == Guid.Empty)
                    {
                        // Super admin has not selected a school yet — return a safe placeholder
                        return Ok(new {
                            id      = (Guid?)null,
                            name    = "Super Admin",
                            logoUrl = (string?)null,
                            address = (string?)null,
                            phone   = (string?)null,
                            email   = (string?)null,
                            status  = "active"
                        });
                    }
                }
                else
                {
                    if (!_tenant.TryGetSchoolId(out schoolId))
                        return Unauthorized(new { message = "School ID not found in token" });
                }

                var school = await _db.Schools
                    .AsNoTracking()
                    .IgnoreQueryFilters()   // bypass IsDeleted filter — we want to show the school even if something weird happens
                    .Where(s => s.Id == schoolId && !s.IsDeleted)
                    .Select(s => new {
                        id      = (Guid?)s.Id,
                        name    = s.Name,
                        logoUrl = s.Logo,
                        address = s.Address,
                        phone   = s.Phone,
                        email   = s.Email,
                        status  = s.IsActive ? "active" : "inactive"
                    })
                    .FirstOrDefaultAsync();

                if (school == null)
                    return NotFound(new { message = "School not found" });

                return Ok(school);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }


        [HttpGet("school/{schoolId}")]
        [ProducesResponseType(typeof(SettingsListResponse), 200)]
        [ProducesResponseType(typeof(object), 401)]
        [ProducesResponseType(typeof(object), 403)]
        public async Task<ActionResult<SettingsListResponse>> GetSchoolSettings(Guid schoolId, [FromQuery] string? category = null)
        {
            try
            {
                if (!_tenant.CanAccessSchool(schoolId))
                    return Forbid();

                var settings = await _settingsService.GetSchoolSettingsAsync(schoolId, category);
                return Ok(settings);
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpGet("school/{schoolId}/key/{key}")]
        [ProducesResponseType(typeof(SchoolSettingResponse), 200)]
        [ProducesResponseType(typeof(object), 401)]
        [ProducesResponseType(typeof(object), 403)]
        [ProducesResponseType(typeof(object), 404)]
        public async Task<ActionResult<SchoolSettingResponse>> GetSchoolSetting(Guid schoolId, string key)
        {
            try
            {
                if (!_tenant.CanAccessSchool(schoolId))
                    return Forbid();

                var setting = await _settingsService.GetSchoolSettingAsync(schoolId, key);
                return Ok(setting);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpPost("school")]
        [ProducesResponseType(typeof(SchoolSettingResponse), 201)]
        [ProducesResponseType(typeof(object), 400)]
        [ProducesResponseType(typeof(object), 401)]
        public async Task<ActionResult<SchoolSettingResponse>> SetSchoolSetting([FromBody] SchoolSettingRequest request)
        {
            try
            {
                request.SchoolId = _tenant.GetEffectiveSchoolId(request.SchoolId == Guid.Empty ? null : request.SchoolId);

                var setting = await _settingsService.SetSchoolSettingAsync(request);
                return CreatedAtAction(nameof(GetSchoolSetting), new { schoolId = request.SchoolId, key = request.SettingKey }, setting);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpDelete("school/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        [ProducesResponseType(204)]
        [ProducesResponseType(typeof(object), 400)]
        [ProducesResponseType(typeof(object), 401)]
        [ProducesResponseType(typeof(object), 403)]
        [ProducesResponseType(typeof(object), 404)]
        public async Task<ActionResult> DeleteSchoolSetting(Guid id)
        {
            try
            {
                if (!_tenant.TryGetSchoolId(out var schoolId))
                    return Forbid();

                await _settingsService.DeleteSchoolSettingAsync(id, schoolId);
                return NoContent();
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpGet("user/{userId}")]
        [ProducesResponseType(typeof(SettingsListResponse), 200)]
        [ProducesResponseType(typeof(object), 401)]
        public async Task<ActionResult<SettingsListResponse>> GetUserSettings(Guid userId)
        {
            try
            {
                var settings = await _settingsService.GetUserSettingsAsync(userId);
                return Ok(settings);
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpPost("user")]
        [ProducesResponseType(typeof(UserSettingResponse), 201)]
        [ProducesResponseType(typeof(object), 400)]
        [ProducesResponseType(typeof(object), 401)]
        [ProducesResponseType(typeof(object), 404)]
        public async Task<ActionResult<UserSettingResponse>> SetUserSetting([FromBody] UserSettingRequest request)
        {
            try
            {
                if (_tenant.TryGetUserId(out var userId))
                    request.UserId = userId;

                var setting = await _settingsService.SetUserSettingAsync(request);
                return CreatedAtAction(nameof(GetUserSettings), new { userId = request.UserId }, setting);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpGet("system")]
        [Authorize(Roles = "SuperAdmin,Admin")]
        public async Task<ActionResult<SettingsListResponse>> GetSystemConfigs([FromQuery] string? module = null)
        {
            try
            {
                var configs = await _settingsService.GetSystemConfigsAsync(module);
                return Ok(configs);
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpPost("system")]
        [Authorize(Roles = StatusConstants.Roles.SuperAdmin)]
        [ProducesResponseType(typeof(SystemConfigResponse), 201)]
        [ProducesResponseType(typeof(object), 400)]
        [ProducesResponseType(typeof(object), 401)]
        [ProducesResponseType(typeof(object), 403)]
        public async Task<ActionResult<SystemConfigResponse>> SetSystemConfig([FromBody] SystemConfigRequest request)
        {
            try
            {
                var config = await _settingsService.SetSystemConfigAsync(request);
                return CreatedAtAction(nameof(GetSystemConfigs), new { module = request.Module }, config);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Update the school's contact/operational fields (phone, email, address, website).
        /// Accessible to both Admin and SuperAdmin.
        /// Identity fields (name, type, logo) are managed via the SuperAdmin panel.
        /// </summary>
        [HttpPatch("school/{schoolId}/contact")]
        [Authorize(Roles = "SuperAdmin,Admin")]
        [ProducesResponseType(200)]
        [ProducesResponseType(typeof(object), 400)]
        [ProducesResponseType(typeof(object), 403)]
        [ProducesResponseType(typeof(object), 404)]
        public async Task<ActionResult> UpdateSchoolContact(Guid schoolId, [FromBody] UpdateSchoolContactRequest request)
        {
            try
            {
                if (!_tenant.CanAccessSchool(schoolId))
                    return Forbid();

                var school = await _db.Schools
                    .Where(s => s.Id == schoolId && !s.IsDeleted)
                    .FirstOrDefaultAsync();

                if (school == null)
                    return NotFound(new { message = "School not found" });

                // Only update fields that were explicitly provided (null = skip)
                if (request.Phone != null) school.Phone = request.Phone.Trim();
                if (request.Email != null) school.Email = request.Email.Trim();
                if (request.Address != null) school.Address = request.Address.Trim();

                await _db.SaveChangesAsync();

                // Also mirror website and tagline (KV-only fields) via bulk settings
                var kvSettings = new List<SchoolSettingRequest>();
                if (request.Website != null)
                    kvSettings.Add(new SchoolSettingRequest { SchoolId = schoolId, SettingKey = "school_website", SettingValue = request.Website, Category = "school_profile", DataType = "string" });
                if (request.Tagline != null)
                    kvSettings.Add(new SchoolSettingRequest { SchoolId = schoolId, SettingKey = "school_tagline", SettingValue = request.Tagline, Category = "school_profile", DataType = "string" });

                foreach (var kv in kvSettings)
                    await _settingsService.SetSchoolSettingAsync(kv);

                return Ok(new {
                    phone   = school.Phone,
                    email   = school.Email,
                    address = school.Address,
                    website = request.Website,
                    tagline = request.Tagline,
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpPost("bulk")]
        [Authorize]
        [ProducesResponseType(typeof(BulkSettingsRequest), 200)]
        [ProducesResponseType(typeof(object), 400)]
        [ProducesResponseType(typeof(object), 401)]
        [ProducesResponseType(typeof(object), 404)]
        public async Task<ActionResult<BulkSettingsRequest>> BulkUpdateSettings([FromBody] BulkSettingsRequest request)
        {
            try
            {
                // Inject SchoolId from JWT claims into every school-settings entry
                if (request.SchoolSettings?.Count > 0 || request.Settings?.Count > 0)
                {
                    if (!_tenant.TryGetSchoolId(out var schoolId))
                        return Forbid();

                    foreach (var s in request.SchoolSettings ?? new())
                        if (s.SchoolId == Guid.Empty) s.SchoolId = schoolId;

                    foreach (var s in request.Settings ?? new())
                        if (s.SchoolId == Guid.Empty) s.SchoolId = schoolId;
                }

                // Inject UserId from JWT claims into every user-settings entry
                if (request.UserSettings?.Count > 0)
                {
                    if (_tenant.TryGetUserId(out var userId))
                        foreach (var s in request.UserSettings)
                            if (s.UserId == Guid.Empty) s.UserId = userId;
                }

                var result = await _settingsService.BulkUpdateSettingsAsync(request);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }
    }
}

