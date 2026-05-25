using SmsApi.Models.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmsApi.Models.DTOs;
using SmsApi.Services;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SmsApi.Data;
using Microsoft.EntityFrameworkCore;

namespace SmsApi.Controllers
{
    [ApiController]
    [Route("api/school-feature-permissions")]
    [Authorize]
    public class SchoolFeaturePermissionsController : ControllerBase
    {
        private readonly ISchoolFeaturePermissionService _service;
        private readonly ITenantContext _tenant;
        private readonly AppDbContext _db;

        public SchoolFeaturePermissionsController(ISchoolFeaturePermissionService service, ITenantContext tenant, AppDbContext db)
        {
            _service = service;
            _tenant = tenant;
            _db = db;
        }

        /// <summary>
        /// Get all schools (Super Admin only)
        /// </summary>
        [HttpGet("schools")]
        [Authorize(Roles = StatusConstants.Roles.SuperAdmin)]
        public async Task<ActionResult<List<SchoolListDto>>> GetAllSchools()
        {
            try
            {
                var schools = await _service.GetAllSchoolsAsync();
                return Ok(schools);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Get feature permissions for the current user's own school.
        /// Accessible to all authenticated users (staff, admin, parent) so that
        /// every login can respect school-level feature toggles.
        /// </summary>
        [HttpGet("my-school")]
        [Authorize]
        public async Task<ActionResult<SchoolPermissionsResponse>> GetMySchoolPermissions()
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                if (schoolId == Guid.Empty)
                    return BadRequest(new { message = "No school associated with this account" });

                var permissions = await _service.GetSchoolPermissionsAsync(schoolId);
                return Ok(permissions);
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

        /// <summary>
        /// Get feature permissions for a specific school
        /// </summary>
        [HttpGet("schools/{schoolId}")]
        [Authorize(Roles = "SuperAdmin,Admin")]
        public async Task<ActionResult<SchoolPermissionsResponse>> GetSchoolPermissions(Guid schoolId)
        {
            try
            {
                // Super admins can access any school, regular admins only their own
                if (!_tenant.IsSuperAdmin)
                {
                    var jwtSchoolId = _tenant.GetEffectiveSchoolId();
                    if (schoolId != jwtSchoolId)
                        return Forbid();
                }

                var permissions = await _service.GetSchoolPermissionsAsync(schoolId);
                return Ok(permissions);
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

        /// <summary>
        /// Update a single module permission for a school (Super Admin only)
        /// </summary>
        [HttpPut("schools/{schoolId}/modules/{moduleName}")]
        [Authorize(Roles = StatusConstants.Roles.SuperAdmin)]
        public async Task<ActionResult<SchoolFeaturePermissionDto>> UpdateModulePermission(
            Guid schoolId, 
            string moduleName, 
            [FromBody] UpdateSchoolFeaturePermissionRequest request)
        {
            try
            {
                // Ensure schoolId and moduleName match the request
                request.SchoolId = schoolId;
                request.ModuleName = moduleName;

                var result = await _service.UpdateSchoolFeaturePermissionAsync(request);
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
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Bulk update all module permissions for a school (Super Admin only)
        /// </summary>
        [HttpPut("schools/{schoolId}/bulk")]
        [Authorize(Roles = StatusConstants.Roles.SuperAdmin)]
        public async Task<ActionResult<SchoolPermissionsResponse>> BulkUpdateFeatures(
            Guid schoolId,
            [FromBody] BulkUpdateSchoolFeaturesRequest request)
        {
            try
            {
                request.SchoolId = schoolId;
                var result = await _service.BulkUpdateSchoolFeaturesAsync(request);
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
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Check if a specific module is enabled for a school
        /// </summary>
        [HttpGet("schools/{schoolId}/modules/{moduleName}/check")]
        public async Task<ActionResult<bool>> CheckModuleAccess(Guid schoolId, string moduleName)
        {
            try
            {
                // Verify user has access to this school
                if (!_tenant.IsSuperAdmin)
                {
                    var jwtSchoolId = _tenant.GetEffectiveSchoolId();
                    if (schoolId != jwtSchoolId)
                        return Forbid();
                }

                var hasAccess = await _service.CheckModuleAccessAsync(schoolId, moduleName);
                return Ok(new { schoolId, moduleName, hasAccess });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Get list of enabled modules for a school
        /// </summary>
        [HttpGet("schools/{schoolId}/enabled-modules")]
        public async Task<ActionResult<List<string>>> GetEnabledModules(Guid schoolId)
        {
            try
            {
                // Verify user has access to this school
                if (!_tenant.IsSuperAdmin)
                {
                    var jwtSchoolId = _tenant.GetEffectiveSchoolId();
                    if (schoolId != jwtSchoolId)
                        return Forbid();
                }

                var enabledModules = await _service.GetEnabledModulesAsync(schoolId);
                return Ok(enabledModules);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Initialize default permissions for a school (Super Admin only)
        /// </summary>
        [HttpPost("schools/{schoolId}/initialize")]
        [Authorize(Roles = StatusConstants.Roles.SuperAdmin)]
        public async Task<ActionResult> InitializeDefaultPermissions(Guid schoolId)
        {
            try
            {
                await _service.InitializeDefaultPermissionsAsync(schoolId);
                return Ok(new { message = "Default permissions initialized successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // ─── School CRUD ─────────────────────────────────────────────────────────

        /// <summary>Create a new school (Super Admin only)</summary>
        [HttpPost("schools")]
        [Authorize(Roles = StatusConstants.Roles.SuperAdmin)]
        public async Task<ActionResult<SchoolDetailDto>> CreateSchool([FromBody] CreateSchoolRequest request)
        {
            try
            {
                var result = await _service.CreateSchoolAsync(request);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>Update a school (Super Admin only)</summary>
        [HttpPut("schools/{schoolId}")]
        [Authorize(Roles = StatusConstants.Roles.SuperAdmin)]
        public async Task<ActionResult<SchoolDetailDto>> UpdateSchool(Guid schoolId, [FromBody] UpdateSchoolRequest request)
        {
            try
            {
                var result = await _service.UpdateSchoolAsync(schoolId, request);
                return Ok(result);
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

        /// <summary>Upload/replace a school's logo image (Super Admin only).</summary>
        [HttpPost("schools/{schoolId}/logo")]
        [Authorize(Roles = StatusConstants.Roles.SuperAdmin)]
        [RequestSizeLimit(10 * 1024 * 1024)]
        public async Task<ActionResult> UploadSchoolLogo(
            Guid schoolId,
            IFormFile file,
            [FromServices] IFileStorageService fileStorage)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "No file provided." });

            var school = await _db.Schools.FirstOrDefaultAsync(s => s.Id == schoolId);
            if (school == null)
                return NotFound(new { message = "School not found" });

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            var allowed = new HashSet<string> { ".jpg", ".jpeg", ".png", ".webp", ".gif" };
            if (!allowed.Contains(ext))
                return BadRequest(new { message = "Only JPG, PNG, WEBP, GIF files are allowed." });

            if (file.Length > 5 * 1024 * 1024)
                return BadRequest(new { message = "Logo size must be 5 MB or less." });

            var previousLogo = school.Logo;
            var key = fileStorage.BuildAssetKey($"schools/{schoolId}/branding/logo-{Guid.NewGuid()}{ext}");

            await using var stream = file.OpenReadStream();
            var saved = await fileStorage.SaveFileAsync(key, stream);
            if (!saved)
                return StatusCode(500, new { message = "Failed to upload school logo." });

            var logoUrl = fileStorage.GetPublicUrl(key);
            school.Logo = logoUrl;
            school.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            if (!string.IsNullOrWhiteSpace(previousLogo) && !string.Equals(previousLogo, logoUrl, StringComparison.OrdinalIgnoreCase))
            {
                _ = fileStorage.DeleteAsync(previousLogo);
            }

            return Ok(new { logoUrl });
        }

        /// <summary>Toggle school active status (Super Admin only)</summary>
        [HttpPatch("schools/{schoolId}/toggle-status")]
        [Authorize(Roles = StatusConstants.Roles.SuperAdmin)]
        public async Task<ActionResult> ToggleSchoolStatus(Guid schoolId)
        {
            try
            {
                var result = await _service.ToggleSchoolStatusAsync(schoolId);
                return Ok(new { schoolId, isActive = result });
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

        // ─── User Management ─────────────────────────────────────────────────────

        /// <summary>Get all platform users (Super Admin only)</summary>
        [HttpGet("users")]
        [Authorize(Roles = StatusConstants.Roles.SuperAdmin)]
        public async Task<ActionResult<List<PlatformUserDto>>> GetAllUsers([FromQuery] string? schoolId = null, [FromQuery] string? role = null, [FromQuery] string? search = null)
        {
            try
            {
                var result = await _service.GetAllUsersAsync(schoolId, role, search);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>Create a new platform user (Super Admin only)</summary>
        [HttpPost("users")]
        [Authorize(Roles = StatusConstants.Roles.SuperAdmin)]
        public async Task<ActionResult<PlatformUserDto>> CreateUser([FromBody] CreatePlatformUserRequest request)
        {
            try
            {
                var result = await _service.CreatePlatformUserAsync(request);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>Toggle user active/suspended status (Super Admin only)</summary>
        [HttpPatch("users/{userId}/toggle-status")]
        [Authorize(Roles = StatusConstants.Roles.SuperAdmin)]
        public async Task<ActionResult> ToggleUserStatus(Guid userId)
        {
            try
            {
                var result = await _service.ToggleUserStatusAsync(userId);
                return Ok(new { userId, status = result });
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

        /// <summary>Reset user password (Super Admin only)</summary>
        [HttpPost("users/{userId}/reset-password")]
        [Authorize(Roles = StatusConstants.Roles.SuperAdmin)]
        public async Task<ActionResult> ResetUserPassword(Guid userId, [FromBody] AdminResetPasswordRequest request)
        {
            try
            {
                await _service.ResetUserPasswordAsync(userId, request.NewPassword);
                return Ok(new { message = "Password reset successfully" });
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

        // ─── Platform Stats ───────────────────────────────────────────────────────

        /// <summary>Get platform-wide stats (Super Admin only)</summary>
        [HttpGet("stats")]
        [Authorize(Roles = StatusConstants.Roles.SuperAdmin)]
        public async Task<ActionResult<PlatformStatsDto>> GetPlatformStats()
        {
            try
            {
                var result = await _service.GetPlatformStatsAsync();
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // ─── School Onboarding ────────────────────────────────────────────────────

        /// <summary>
        /// Onboard a new school end-to-end: creates school, academic year, admin user,
        /// and applies module permissions in a single operation. (Super Admin only)
        /// </summary>
        [HttpPost("onboard")]
        [Authorize(Roles = StatusConstants.Roles.SuperAdmin)]
        public async Task<ActionResult<SchoolOnboardingResult>> OnboardSchool([FromBody] SchoolOnboardingRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var result = await _service.OnboardSchoolAsync(request);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // ── Billing ──────────────────────────────────────────────────────────────

        /// <summary>Get billing info for a specific school (SuperAdmin or that school's Admin).</summary>
        [HttpGet("schools/{schoolId}/billing")]
        [Authorize(Roles = "SuperAdmin,Admin")]
        public async Task<ActionResult<SchoolBillingDto>> GetSchoolBilling(Guid schoolId)
        {
            try
            {
                var dto = await _service.GetSchoolBillingAsync(schoolId);
                return Ok(dto);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex)            { return StatusCode(500, new { message = "An error occurred", error = ex.Message }); }
        }

        /// <summary>Update billing info for a school (SuperAdmin only).</summary>
        [HttpPut("schools/{schoolId}/billing")]
        [Authorize(Roles = StatusConstants.Roles.SuperAdmin)]
        public async Task<ActionResult<SchoolBillingDto>> UpdateSchoolBilling(Guid schoolId, [FromBody] UpdateSchoolBillingRequest request)
        {
            try
            {
                var dto = await _service.UpdateSchoolBillingAsync(schoolId, request);
                return Ok(dto);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex)            { return StatusCode(500, new { message = "An error occurred", error = ex.Message }); }
        }

        /// <summary>
        /// Login billing notification — called by admin dashboard on mount.
        /// Returns a warning when subscription is expiring soon or expired.
        /// </summary>
        [HttpGet("billing-notification")]
        [Authorize]
        public async Task<ActionResult<BillingNotificationDto>> GetBillingNotification()
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                if (schoolId == Guid.Empty)
                    return Ok(new BillingNotificationDto { HasWarning = false });

                var dto = await _service.GetBillingNotificationAsync(schoolId);
                return Ok(dto);
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred", error = ex.Message }); }
        }
    }
}
