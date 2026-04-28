using SmsApi.Models.Constants;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models;
using SmsApi.Models.Entities;
using SmsApi.Services;
using System.Security.Cryptography;

namespace SmsApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[EnableRateLimiting("auth")]   // 10 req/min per IP — brute-force protection
public class AuthController : ControllerBase
{
    private readonly IConfiguration _configuration;
    private readonly ITokenService _tokenService;
    private readonly ILogger<AuthController> _logger;
    private readonly AppDbContext _context;
    private readonly ITwoFactorService _twoFactor;
    private readonly ILoginAttemptService _loginAttempts;

    private const int MAX_FAILED_ATTEMPTS = 5;
    private const int LOCKOUT_MINUTES = 15;
    private const int REFRESH_TOKEN_DAYS = 7;

    public AuthController(
        IConfiguration configuration,
        ITokenService tokenService,
        ILogger<AuthController> logger,
        AppDbContext context,
        ITwoFactorService twoFactor,
        ILoginAttemptService loginAttempts)
    {
        _configuration = configuration;
        _tokenService = tokenService;
        _logger = logger;
        _context = context;
        _twoFactor = twoFactor;
        _loginAttempts = loginAttempts;
    }

    /// <summary>
    /// Login with username or email + password. Returns JWT access token and refresh token.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { message = "Username and password are required" });

        // ── Fast-path brute-force check via Redis (no DB hit required) ─────────
        var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString()
            ?? HttpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault()
            ?? "unknown";

        var (isLockedOut, remainingLockout) = await _loginAttempts.IsAccountLockedAsync(request.Username, clientIp);
        if (isLockedOut && remainingLockout.HasValue)
        {
            var minutes = (int)Math.Ceiling(remainingLockout.Value.TotalMinutes);
            _logger.LogWarning("Redis lockout active for {Username} from {IP} — {Minutes}m remaining",
                request.Username, clientIp, minutes);
            return StatusCode(429, new { message = $"Too many login attempts. Try again in {minutes} minute(s)." });
        }
        // ────────────────────────────────────────────────────────────────────────

        var identifier = request.Username.Trim().ToLower();

        // Look up by username OR email (case-insensitive)
        var userLogin = await _context.UserLogins
            .FirstOrDefaultAsync(u =>
                !u.IsDeleted &&
                (u.Username.ToLower() == identifier || u.Email.ToLower() == identifier));

        if (userLogin == null)
        {
            _logger.LogWarning("Login failed: user not found for identifier {Identifier}", identifier);
            return Unauthorized(new { message = "Invalid username or password" });
        }

        // Check account status
        if (userLogin.Status == "suspended")
            return Unauthorized(new { message = "Account is suspended. Contact your administrator." });

        if (userLogin.Status == "inactive")
            return Unauthorized(new { message = "Account is inactive. Contact your administrator." });

        // Check lockout
        if (userLogin.LockedUntil.HasValue && userLogin.LockedUntil.Value > DateTime.UtcNow)
        {
            var remaining = (int)Math.Ceiling((userLogin.LockedUntil.Value - DateTime.UtcNow).TotalMinutes);
            return Unauthorized(new { message = $"Account is locked. Try again in {remaining} minute(s)." });
        }

        // Verify password
        bool passwordValid = BCrypt.Net.BCrypt.Verify(request.Password, userLogin.PasswordHash);

        if (!passwordValid)
        {
            // Record failure in Redis (fast distributed counter)
            await _loginAttempts.RecordFailedAttemptAsync(request.Username, clientIp);

            // Also persist in DB for audit trail + cross-instance awareness
            userLogin.FailedLoginAttempts++;
            if (userLogin.FailedLoginAttempts >= MAX_FAILED_ATTEMPTS)
            {
                userLogin.LockedUntil = DateTime.UtcNow.AddMinutes(LOCKOUT_MINUTES);
                userLogin.Status = "locked";
                _logger.LogWarning("Account locked for user {Username} after {Attempts} failed attempts",
                    userLogin.Username, userLogin.FailedLoginAttempts);
            }
            userLogin.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return Unauthorized(new { message = "Invalid username or password" });
        }

        // Successful login - check 2FA first
        if (userLogin.TwoFactorEnabled && !string.IsNullOrEmpty(userLogin.TwoFactorSecret))
        {
            _logger.LogInformation("2FA challenge required for user {Username}", userLogin.Username);
            // Return a short-lived 2FA session token (does not grant API access)
            var challengeToken = GenerateSecureToken();
            userLogin.TwoFactorChallengeToken = BCrypt.Net.BCrypt.HashPassword(challengeToken);
            userLogin.TwoFactorChallengeExpiry = DateTime.UtcNow.AddMinutes(5);
            userLogin.FailedLoginAttempts = 0;
            userLogin.LockedUntil = null;
            userLogin.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                twoFactorRequired = true,
                challengeToken,
                message = "Enter your authenticator code to complete sign-in."
            });
        }

        // 2FA not enabled — issue tokens immediately
        var rawRefreshToken = GenerateSecureToken();
        var refreshHash = BCrypt.Net.BCrypt.HashPassword(rawRefreshToken);

        // Clear Redis brute-force counter on successful authentication
        await _loginAttempts.ClearAttemptsAsync(request.Username, clientIp);

        userLogin.FailedLoginAttempts = 0;
        userLogin.LockedUntil = null;
        if (userLogin.Status == "locked") userLogin.Status = "active";
        userLogin.LastLogin = DateTime.UtcNow;
        userLogin.RefreshTokenHash = refreshHash;
        userLogin.RefreshTokenExpiry = DateTime.UtcNow.AddDays(REFRESH_TOKEN_DAYS);
        userLogin.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var userModel = MapToUserModel(userLogin);
        var accessToken = _tokenService.GenerateAccessToken(userModel, userLogin.SchoolId);
        var expMins = _configuration.GetValue<int>("JwtSettings:ExpirationInMinutes", 60);

        _logger.LogInformation("Login successful for {Username} (SchoolId: {SchoolId})",
            userLogin.Username, userLogin.SchoolId);

        return Ok(new LoginResponse
        {
            Token = accessToken,
            RefreshToken = rawRefreshToken,
            Expiration = DateTime.UtcNow.AddMinutes(expMins),
            User = new UserInfo
            {
                Id = userLogin.Id,
                Email = userLogin.Email,
                FirstName = userLogin.FirstName,
                LastName = userLogin.LastName,
                Role = userLogin.Role,
                SchoolId = userLogin.SchoolId
            }
        });
    }

    /// <summary>
    /// Exchange a valid refresh token for a new access + refresh token pair.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("refresh")]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.AccessToken) || string.IsNullOrWhiteSpace(request.RefreshToken))
            return BadRequest(new { message = "Access token and refresh token are required" });

        try
        {
            var principal = _tokenService.ValidateToken(request.AccessToken);
            var userId = _tokenService.GetCurrentUserId(principal);

            var userLogin = await _context.UserLogins
                .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted);

            if (userLogin == null)
                return Unauthorized(new { message = "User not found" });

            if (userLogin.RefreshTokenExpiry == null || userLogin.RefreshTokenExpiry < DateTime.UtcNow)
                return Unauthorized(new { message = "Refresh token has expired. Please log in again." });

            if (string.IsNullOrEmpty(userLogin.RefreshTokenHash) ||
                !BCrypt.Net.BCrypt.Verify(request.RefreshToken, userLogin.RefreshTokenHash))
                return Unauthorized(new { message = "Invalid refresh token" });

            // Rotate refresh token
            var newRawRefreshToken = GenerateSecureToken();
            userLogin.RefreshTokenHash = BCrypt.Net.BCrypt.HashPassword(newRawRefreshToken);
            userLogin.RefreshTokenExpiry = DateTime.UtcNow.AddDays(REFRESH_TOKEN_DAYS);
            userLogin.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var userModel = MapToUserModel(userLogin);
            var newAccessToken = _tokenService.GenerateAccessToken(userModel, userLogin.SchoolId);
            var expMins = _configuration.GetValue<int>("JwtSettings:ExpirationInMinutes", 60);

            return Ok(new LoginResponse
            {
                Token = newAccessToken,
                RefreshToken = newRawRefreshToken,
                Expiration = DateTime.UtcNow.AddMinutes(expMins),
                User = new UserInfo
                {
                    Id = userLogin.Id,
                    Email = userLogin.Email,
                    FirstName = userLogin.FirstName,
                    LastName = userLogin.LastName,
                    Role = userLogin.Role,
                    SchoolId = userLogin.SchoolId
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Refresh token failed: {Message}", ex.Message);
            return Unauthorized(new { message = "Invalid or expired token" });
        }
    }

    /// <summary>
    /// Logout - invalidates the current refresh token.
    /// </summary>
    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
            return Ok(new { message = "Logged out" });

        var userLogin = await _context.UserLogins.FirstOrDefaultAsync(u => u.Id == userId);
        if (userLogin != null)
        {
            userLogin.RefreshTokenHash = null;
            userLogin.RefreshTokenExpiry = null;
            userLogin.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        return Ok(new { message = "Logged out successfully" });
    }

    /// <summary>
    /// Get the currently authenticated user's profile.
    /// </summary>
    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized(new { message = "Invalid token" });

        var userLogin = await _context.UserLogins
            .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted);

        if (userLogin == null)
            return NotFound(new { message = "User not found" });

        return Ok(new UserInfo
        {
            Id = userLogin.Id,
            Email = userLogin.Email,
            FirstName = userLogin.FirstName,
            LastName = userLogin.LastName,
            Role = userLogin.Role,
            SchoolId = userLogin.SchoolId
        });
    }

    /// <summary>
    /// Change the currently authenticated user's password.
    /// </summary>
    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.CurrentPassword) || string.IsNullOrWhiteSpace(request.NewPassword))
            return BadRequest(new { message = "Current and new passwords are required" });

        if (request.NewPassword.Length < 8)
            return BadRequest(new { message = "New password must be at least 8 characters" });

        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized(new { message = "Invalid token" });

        var userLogin = await _context.UserLogins
            .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted);

        if (userLogin == null)
            return NotFound(new { message = "User not found" });

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, userLogin.PasswordHash))
            return BadRequest(new { message = "Current password is incorrect" });

        userLogin.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword, workFactor: 12);
        userLogin.PasswordChangedAt = DateTime.UtcNow;
        userLogin.RefreshTokenHash = null; // Force re-login on all devices
        userLogin.RefreshTokenExpiry = null;
        userLogin.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Password changed successfully. Please log in again." });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Two-Factor Authentication (TOTP)
    // ──────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Complete login when 2FA is enabled. Exchange challenge token + TOTP code for JWT.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("2fa/login")]
    public async Task<IActionResult> TwoFactorLogin([FromBody] TwoFactorLoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ChallengeToken) || string.IsNullOrWhiteSpace(request.Code))
            return BadRequest(new { message = "Challenge token and authenticator code are required" });

        var users = await _context.UserLogins
            .Where(u => !u.IsDeleted &&
                u.TwoFactorChallengeExpiry != null &&
                u.TwoFactorChallengeExpiry > DateTime.UtcNow)
            .ToListAsync();

        // Find the user whose challenge hash matches
        var userLogin = users.FirstOrDefault(u =>
            u.TwoFactorChallengeToken != null &&
            BCrypt.Net.BCrypt.Verify(request.ChallengeToken, u.TwoFactorChallengeToken));

        if (userLogin == null)
            return Unauthorized(new { message = "Invalid or expired challenge token" });

        if (!_twoFactor.VerifyCode(userLogin.TwoFactorSecret!, request.Code))
        {
            userLogin.FailedLoginAttempts++;
            if (userLogin.FailedLoginAttempts >= MAX_FAILED_ATTEMPTS)
            {
                userLogin.LockedUntil = DateTime.UtcNow.AddMinutes(LOCKOUT_MINUTES);
                userLogin.Status = "locked";
            }
            await _context.SaveChangesAsync();
            return Unauthorized(new { message = "Invalid authenticator code" });
        }

        // Code valid — clear challenge, issue tokens
        userLogin.TwoFactorChallengeToken = null;
        userLogin.TwoFactorChallengeExpiry = null;
        userLogin.FailedLoginAttempts = 0;
        userLogin.LockedUntil = null;
        if (userLogin.Status == "locked") userLogin.Status = "active";
        userLogin.LastLogin = DateTime.UtcNow;

        var rawRefreshToken = GenerateSecureToken();
        userLogin.RefreshTokenHash = BCrypt.Net.BCrypt.HashPassword(rawRefreshToken);
        userLogin.RefreshTokenExpiry = DateTime.UtcNow.AddDays(REFRESH_TOKEN_DAYS);
        userLogin.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var userModel = MapToUserModel(userLogin);
        var accessToken = _tokenService.GenerateAccessToken(userModel, userLogin.SchoolId);
        var expMins = _configuration.GetValue<int>("JwtSettings:ExpirationInMinutes", 60);

        _logger.LogInformation("2FA login successful for user {Id}", userLogin.Id);

        return Ok(new LoginResponse
        {
            Token = accessToken,
            RefreshToken = rawRefreshToken,
            Expiration = DateTime.UtcNow.AddMinutes(expMins),
            User = new UserInfo
            {
                Id = userLogin.Id,
                Email = userLogin.Email,
                FirstName = userLogin.FirstName,
                LastName = userLogin.LastName,
                Role = userLogin.Role,
                SchoolId = userLogin.SchoolId
            }
        });
    }

    /// <summary>
    /// Start 2FA setup: generate a secret and return the QR code URI.
    /// User must confirm with a valid code before 2FA is activated.
    /// </summary>
    [Authorize]
    [HttpPost("2fa/setup")]
    public async Task<IActionResult> SetupTwoFactor()
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var userLogin = await _context.UserLogins.FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted);
        if (userLogin == null) return NotFound(new { message = "User not found" });

        if (userLogin.TwoFactorEnabled)
            return BadRequest(new { message = "Two-factor authentication is already enabled" });

        var secret = _twoFactor.GenerateSecret();
        // Store pending secret (not yet activated until confirmed)
        userLogin.TwoFactorSecret = secret;
        userLogin.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new
        {
            secret,
            secretFormatted = _twoFactor.FormatSecretForDisplay(secret),
            qrCodeUri = _twoFactor.GenerateQrCodeUri(userLogin.Email, secret),
            message = "Scan the QR code then call POST /api/auth/2fa/confirm with a valid code to activate."
        });
    }

    /// <summary>
    /// Confirm 2FA setup with the first valid TOTP code. Activates 2FA on the account.
    /// </summary>
    [Authorize]
    [HttpPost("2fa/confirm")]
    public async Task<IActionResult> ConfirmTwoFactor([FromBody] TwoFactorConfirmRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Code))
            return BadRequest(new { message = "Authenticator code is required" });

        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var userLogin = await _context.UserLogins.FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted);
        if (userLogin == null) return NotFound();
        if (string.IsNullOrEmpty(userLogin.TwoFactorSecret))
            return BadRequest(new { message = "Call POST /api/auth/2fa/setup first" });
        if (userLogin.TwoFactorEnabled)
            return BadRequest(new { message = "2FA is already active" });

        if (!_twoFactor.VerifyCode(userLogin.TwoFactorSecret, request.Code))
            return BadRequest(new { message = "Invalid code. Verify your authenticator app clock is correct." });

        userLogin.TwoFactorEnabled = true;
        userLogin.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation("2FA activated for user {UserId}", userId);
        return Ok(new { message = "Two-factor authentication activated successfully." });
    }

    /// <summary>
    /// Disable 2FA. Requires current password verification.
    /// </summary>
    [Authorize]
    [HttpDelete("2fa")]
    public async Task<IActionResult> DisableTwoFactor([FromBody] DisableTwoFactorRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { message = "Password is required to disable 2FA" });

        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var userLogin = await _context.UserLogins.FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted);
        if (userLogin == null) return NotFound();

        if (!BCrypt.Net.BCrypt.Verify(request.Password, userLogin.PasswordHash))
            return Unauthorized(new { message = "Invalid password" });

        userLogin.TwoFactorEnabled = false;
        userLogin.TwoFactorSecret = null;
        userLogin.TwoFactorChallengeToken = null;
        userLogin.TwoFactorChallengeExpiry = null;
        userLogin.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation("2FA disabled for user {UserId}", userId);
        return Ok(new { message = "Two-factor authentication disabled." });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────────────────────────────

    private Guid GetCurrentUserId()
    {
        var claim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(claim, out var id) ? id : Guid.Empty;
    }

    private static string GenerateSecureToken()
    {
        var bytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes);
    }

    private static User MapToUserModel(UserLogin userLogin) => new()
    {
        Id = userLogin.Id,
        Email = userLogin.Email,
        FirstName = userLogin.FirstName,
        LastName = userLogin.LastName,
        Role = userLogin.Role
    };
}
