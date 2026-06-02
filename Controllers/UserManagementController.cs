using SmsApi.Models.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;
using SmsApi.Services;
using SmsApi.Data;

namespace SmsApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Route("api/user-management")]
    [Authorize]
    public class UserManagementController : ControllerBase
    {
        private readonly IUserManagementService _userManagementService;
        private readonly ITokenService _tokenService;
        private readonly ILogger<UserManagementController> _logger;

        public UserManagementController(
            IUserManagementService userManagementService,
            ITokenService tokenService,
            ILogger<UserManagementController> logger)
        {
            _userManagementService = userManagementService;
            _tokenService = tokenService;
            _logger = logger;
        }

        /// <summary>
        /// Get current user's school ID from JWT token
        /// </summary>
        private Guid GetSchoolId()
        {
            var schoolIdClaim = User.FindFirst("SchoolId");
            return schoolIdClaim != null ? Guid.Parse(schoolIdClaim.Value) : Guid.Empty;
        }

        /// <summary>
        /// Get current user's ID from JWT token
        /// </summary>
        private Guid GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)
                ?? User.FindFirst("UserId");
            return userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var userId)
                ? userId
                : Guid.Empty;
        }

        /// <summary>
        /// Create a new user account
        /// </summary>
        [HttpPost("create")]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<UserResponse>> CreateUser([FromBody] CreateUserRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var schoolId = GetSchoolId();
            if (schoolId == Guid.Empty)
                return Unauthorized(new { message = "School ID not found in token" });

            var result = await _userManagementService.CreateUserAsync(schoolId, request);
            
            if (!result.Success)
                return BadRequest(new { message = result.Message });

            return CreatedAtAction(nameof(GetUserById), new { userId = result.Data?.Id }, result.Data);
        }

        /// <summary>
        /// Update current user's own profile (firstName, lastName only).
        /// Uses JWT identity — no SchoolId scoping needed since the user is updating themselves.
        /// </summary>
        [HttpPut("me")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<UserResponse>> UpdateMyProfile([FromBody] UpdateProfileRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userId = GetCurrentUserId();
            if (userId == Guid.Empty)
                return Unauthorized(new { message = "User ID not found in token" });

            var result = await _userManagementService.UpdateMyProfileAsync(userId, request);

            if (!result.Success)
                return result.Message == "User not found"
                    ? NotFound(new { message = result.Message })
                    : BadRequest(new { message = result.Message });

            return Ok(result.Data);
        }

        /// <summary>
        /// Upload current user's profile photo.
        /// Stores the public URL in UserSettings with key "profile_photo_url".
        /// </summary>
        [HttpPost("me/photo")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult> UploadMyProfilePhoto(
            IFormFile file,
            [FromServices] IFileValidationService fileValidation,
            [FromServices] IFileStorageService fileStorage,
            [FromServices] AppDbContext db)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "No file provided." });

            var userId = GetCurrentUserId();
            if (userId == Guid.Empty)
                return Unauthorized(new { message = "User ID not found in token" });

            var schoolId = GetSchoolId();
            if (schoolId == Guid.Empty)
                return Unauthorized(new { message = "School ID not found in token" });

            var (isValid, errorMessage) = await fileValidation.ValidateAsync(file);
            if (!isValid)
                return BadRequest(new { message = errorMessage });

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            var key = fileStorage.BuildAssetKey($"schools/{schoolId}/users/{userId}/profile/{Guid.NewGuid()}{ext}");

            await using var stream = file.OpenReadStream();
            var saved = await fileStorage.SaveFileAsync(key, stream);
            if (!saved)
                return StatusCode(500, new { message = "Failed to save profile photo." });

            var photoUrl = fileStorage.GetPublicUrl(key);

            var setting = await db.UserSettings
                .FirstOrDefaultAsync(s => s.UserId == userId && s.SettingKey == "profile_photo_url" && !s.IsDeleted);

            if (setting == null)
            {
                db.UserSettings.Add(new UserSettings
                {
                    UserId = userId,
                    SettingKey = "profile_photo_url",
                    SettingValue = photoUrl,
                    Category = "profile",
                    DataType = "string",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                });
            }
            else
            {
                setting.SettingValue = photoUrl;
                setting.Category = "profile";
                setting.DataType = "string";
                setting.UpdatedAt = DateTime.UtcNow;
            }

            await db.SaveChangesAsync();

            return Ok(new { photoUrl });
        }

        /// <summary>
        /// Update an existing user
        /// </summary>
        [HttpPut("{userId}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<UserResponse>> UpdateUser(Guid userId, [FromBody] UpdateUserRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var schoolId = GetSchoolId();
            if (schoolId == Guid.Empty)
                return Unauthorized(new { message = "School ID not found in token" });

            var result = await _userManagementService.UpdateUserAsync(schoolId, userId, request);
            
            if (!result.Success)
                return NotFound(new { message = result.Message });

            return Ok(result.Data);
        }

        /// <summary>
        /// Delete a user (soft delete)
        /// </summary>
        [HttpDelete("{userId}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteUser(Guid userId)
        {
            var schoolId = GetSchoolId();
            if (schoolId == Guid.Empty)
                return Unauthorized(new { message = "School ID not found in token" });

            var result = await _userManagementService.DeleteUserAsync(schoolId, userId);
            
            if (!result.Success)
                return NotFound(new { message = result.Message });

            return Ok(new { message = "User deleted successfully" });
        }

        /// <summary>
        /// Get user by ID
        /// </summary>
        [HttpGet("{userId}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<UserResponse>> GetUserById(Guid userId)
        {
            var schoolId = GetSchoolId();
            if (schoolId == Guid.Empty)
                return Unauthorized(new { message = "School ID not found in token" });

            var result = await _userManagementService.GetUserByIdAsync(schoolId, userId);
            
            if (!result.Success)
                return NotFound(new { message = result.Message });

            return Ok(result.Data);
        }

        /// <summary>
        /// Get all users for the school (paginated)
        /// </summary>
        [HttpGet("list/all")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<UserListResponse>> GetAllUsers(
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 50)
        {
            var schoolId = GetSchoolId();
            if (schoolId == Guid.Empty)
                return Unauthorized(new { message = "School ID not found in token" });

            var result = await _userManagementService.GetAllUsersAsync(schoolId, pageNumber, pageSize);
            
            if (!result.Success)
                return BadRequest(new { message = result.Message });

            return Ok(result.Data);
        }

        /// <summary>
        /// Get user statistics
        /// </summary>
        [HttpGet("statistics")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<UserStatisticsResponse>> GetUserStatistics()
        {
            var schoolId = GetSchoolId();
            if (schoolId == Guid.Empty)
                return Unauthorized(new { message = "School ID not found in token" });

            var result = await _userManagementService.GetUserStatisticsAsync(schoolId);
            
            if (!result.Success)
                return BadRequest(new { message = result.Message });

            return Ok(result.Data);
        }

        /// <summary>
        /// Reset user password and send email notification
        /// </summary>
        [HttpPost("{userId}/reset-password")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> ResetPassword(Guid userId, [FromBody] ResetPasswordRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var schoolId = GetSchoolId();
            if (schoolId == Guid.Empty)
                return Unauthorized(new { message = "School ID not found in token" });

            request.UserId = userId;
            var result = await _userManagementService.ResetPasswordAsync(schoolId, request);
            
            if (!result.Success)
                return BadRequest(new { message = result.Message });

            return Ok(new { 
                message = "Password reset successfully. " + 
                (request.SendEmailNotification ? "Email notification sent to user." : "Email notification was not sent.")
            });
        }

        /// <summary>
        /// Change password (authenticated user changing their own password)
        /// </summary>
        [HttpPost("change-password")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userId = GetCurrentUserId();
            if (userId == Guid.Empty)
                return Unauthorized(new { message = "User ID not found in token" });

            var result = await _userManagementService.ChangePasswordAsync(userId, request.CurrentPassword, request.NewPassword);
            
            if (!result.Success)
                return BadRequest(new { message = result.Message });

            return Ok(new { message = "Password changed successfully" });
        }

        /// <summary>
        /// Search users by username, email, or name
        /// </summary>
        [HttpGet("search")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<List<UserResponse>>> SearchUsers(
            [FromQuery] string searchTerm,
            [FromQuery] string? roleFilter = null)
        {
            var schoolId = GetSchoolId();
            if (schoolId == Guid.Empty)
                return Unauthorized(new { message = "School ID not found in token" });

            if (string.IsNullOrWhiteSpace(searchTerm))
                return BadRequest(new { message = "Search term is required" });

            var result = await _userManagementService.SearchUsersAsync(schoolId, searchTerm, roleFilter);
            
            if (!result.Success)
                return BadRequest(new { message = result.Message });

            return Ok(result.Data);
        }

        /// <summary>
        /// Get user by username
        /// </summary>
        [HttpGet("username/{username}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<UserResponse>> GetUserByUsername(string username)
        {
            var schoolId = GetSchoolId();
            if (schoolId == Guid.Empty)
                return Unauthorized(new { message = "School ID not found in token" });

            var result = await _userManagementService.GetUserByUsernameAsync(schoolId, username);
            
            if (!result.Success)
                return NotFound(new { message = result.Message });

            return Ok(result.Data);
        }
    }

    /// <summary>
    /// Request model for changing password
    /// </summary>
    public class ChangePasswordRequest
    {
        public string CurrentPassword { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }
}
