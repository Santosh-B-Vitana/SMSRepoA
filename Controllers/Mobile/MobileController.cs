using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using SmsApi.Models.DTOs;
using SmsApi.Services;
using System.Security.Claims;

namespace SmsApi.Controllers.Mobile
{
    /// <summary>
    /// Mobile app bootstrapping endpoints.
    /// Returns all configuration needed by the mobile app at startup.
    /// </summary>
    [ApiController]
    [Route("api/mobile")]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class MobileController : ControllerBase
    {
        private readonly IMobileAppConfigService _appConfigService;
        private readonly ITenantContext _tenant;
        private readonly ILogger<MobileController> _logger;

        public MobileController(
            IMobileAppConfigService appConfigService,
            ITenantContext tenant,
            ILogger<MobileController> logger)
        {
            _appConfigService = appConfigService;
            _tenant = tenant;
            _logger = logger;
        }

        private Guid? GetUserId()
        {
            var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(raw, out var id) ? id : null;
        }

        private string GetRole() =>
            User.FindFirstValue(ClaimTypes.Role)
            ?? User.FindAll(ClaimTypes.Role).FirstOrDefault()?.Value
            ?? string.Empty;

        /// <summary>
        /// Returns full app configuration for the authenticated user's school.
        /// Includes branding, feature flags, role permissions, and version requirements.
        /// Cached in Redis for 5 minutes per user.
        /// </summary>
        /// <response code="200">App configuration returned successfully.</response>
        /// <response code="401">Not authenticated.</response>
        [HttpGet("app-config")]
        [ProducesResponseType(typeof(AppConfigResponse), 200)]
        public async Task<ActionResult<AppConfigResponse>> GetAppConfig()
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var userId = GetUserId();
                if (userId == null)
                    return Unauthorized(new { message = "User identity not found." });

                var role = GetRole();
                var academicYear = HttpContext.Items["AcademicYearHeaderValue"] as string ?? string.Empty;

                var config = await _appConfigService.GetAppConfigAsync(schoolId, userId.Value, role, academicYear);
                return Ok(config);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching mobile app config");
                return StatusCode(500, new { message = "An error occurred." });
            }
        }

        /// <summary>
        /// Returns the school's mobile branding settings (colors, logo URLs, fonts).
        /// Used by the mobile app on first launch to apply school colors before app-config loads.
        /// </summary>
        /// <response code="200">Branding returned successfully.</response>
        /// <response code="401">Not authenticated.</response>
        [HttpGet("branding")]
        [ProducesResponseType(typeof(BrandingResponse), 200)]
        public async Task<ActionResult<BrandingResponse>> GetMobileBranding()
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var branding = await _appConfigService.GetMobileBrandingAsync(schoolId);
                return Ok(branding);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching mobile branding");
                return StatusCode(500, new { message = "An error occurred." });
            }
        }

        /// <summary>
        /// Updates the school's mobile branding settings.
        /// Only Admins and Principals may call this endpoint.
        /// All request fields are optional — only provided fields are updated.
        /// </summary>
        /// <response code="200">Branding updated successfully.</response>
        /// <response code="400">Validation error in request body.</response>
        /// <response code="401">Not authenticated.</response>
        /// <response code="403">Insufficient role.</response>
        [HttpPut("branding")]
        [Authorize(Roles = "Admin,Principal")]
        [ProducesResponseType(200)]
        public async Task<IActionResult> UpdateMobileBranding([FromBody] UpdateBrandingRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var userId = GetUserId();
                if (userId == null)
                    return Unauthorized(new { message = "User identity not found." });

                await _appConfigService.UpdateMobileBrandingAsync(schoolId, request, userId.Value);
                return Ok(new { message = "Branding updated successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating mobile branding");
                return StatusCode(500, new { message = "An error occurred." });
            }
        }
    }
}
