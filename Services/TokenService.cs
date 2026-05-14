using Microsoft.IdentityModel.Tokens;
using SmsApi.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace SmsApi.Services;

public class TokenService : ITokenService
{
    private readonly IConfiguration _configuration;

    public TokenService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GenerateAccessToken(User user, Guid schoolId)
    {
        var jwtSettings = _configuration.GetSection("JwtSettings");
        var secret = jwtSettings.GetValue<string>("Secret") 
            ?? throw new InvalidOperationException("JWT Secret not configured");
        var issuer = jwtSettings.GetValue<string>("Issuer");
        var audience = jwtSettings.GetValue<string>("Audience");
        var expirationInMinutes = jwtSettings.GetValue<int>("ExpirationInMinutes");

        var claimsList = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, $"{user.FirstName} {user.LastName}"),
            new Claim(ClaimTypes.Role, ResolveEffectiveRole(user.Role, user.Designation)),
            new Claim("SchoolId", schoolId.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new Claim(JwtRegisteredClaimNames.Iat, DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString()),
        };

        // Include staff designation if present (e.g. "Principal", "Mathematics Teacher")
        if (!string.IsNullOrWhiteSpace(user.Designation))
            claimsList.Add(new Claim("Designation", user.Designation));

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiry = DateTime.UtcNow.AddMinutes(expirationInMinutes);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claimsList,
            expires: expiry,
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string GenerateRefreshToken()
    {
        var randomNumber = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomNumber);
        return Convert.ToBase64String(randomNumber);
    }

    /// <summary>
    /// Resolves the effective JWT role by taking designation into account.
    /// Leadership designations (Principal, Vice Principal, HR Manager) override
    /// the raw stored role so that [Authorize(Roles = "Principal")] etc. work.
    /// </summary>
    private static string ResolveEffectiveRole(string? rawRole, string? designation)
    {
        var des = (designation ?? "").Trim().ToLowerInvariant();
        return des switch
        {
            "principal" or "vice principal"                => "Principal",
            "hr manager" or "hrmanager"                    => "HRManager",
            "administrator" or "school administrator"      => "Admin",
            "librarian"                                    => "Librarian",
            "transport manager" or "transportmanager"      => "TransportManager",
            "hostel warden" or "hostelwarden"              => "HostelWarden",
            "accountant" or "finance officer"              => "Accountant",
            "receptionist" or "front desk" or "front desk officer" => "Receptionist",
            _                                              => NormalizeRole(rawRole)
        };
    }

    /// <summary>
    /// Normalizes a raw role string from the database to the title-case form expected
    /// by [Authorize(Roles = "...")] attributes, regardless of how it was stored.
    /// e.g. "teacher" → "Teacher", "hr manager" → "HRManager"
    /// </summary>
    private static string NormalizeRole(string? rawRole) => (rawRole ?? "").ToLowerInvariant() switch
    {
        "admin" or "administrator"          => "Admin",
        "principal"                         => "Principal",
        "teacher"                           => "Teacher",
        "staff"                             => "Staff",
        "parent" or "guardian"              => "Parent",
        "student"                           => "Student",
        "hrmanager" or "hr manager"         => "HRManager",
        "super_admin" or "superadmin"       => "SuperAdmin",
        "classteacher" or "class teacher"   => "Teacher",
        _                                   => string.IsNullOrWhiteSpace(rawRole) ? "Staff"
                                              : char.ToUpperInvariant(rawRole[0]) + rawRole[1..]
    };

    public ClaimsPrincipal ValidateToken(string token)
    {
        var jwtSettings = _configuration.GetSection("JwtSettings");
        var secret = jwtSettings.GetValue<string>("Secret") 
            ?? throw new InvalidOperationException("JWT Secret not configured");
        var issuer = jwtSettings.GetValue<string>("Issuer");
        var audience = jwtSettings.GetValue<string>("Audience");

        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(secret);

        var validationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = false, // We're validating expired tokens for refresh
            ValidateIssuerSigningKey = true,
            ValidIssuer = issuer,
            ValidAudience = audience,
            IssuerSigningKey = new SymmetricSecurityKey(key),
            ClockSkew = TimeSpan.Zero
        };

        var principal = tokenHandler.ValidateToken(token, validationParameters, out _);
        return principal;
    }

    public Guid GetCurrentUserId(ClaimsPrincipal principal)
    {
        var userIdClaim = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        if (string.IsNullOrEmpty(userIdClaim))
            throw new UnauthorizedAccessException("User not authenticated");
        
        return Guid.Parse(userIdClaim);
    }

    public Guid GetCurrentSchoolId(ClaimsPrincipal principal)
    {
        var schoolIdClaim = principal.FindFirst("SchoolId")?.Value;
        
        if (string.IsNullOrEmpty(schoolIdClaim))
            throw new UnauthorizedAccessException("SchoolId not found in token");
        
        return Guid.Parse(schoolIdClaim);
    }

    public string GetCurrentUserRole(ClaimsPrincipal principal)
    {
        return principal.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;
    }
}

