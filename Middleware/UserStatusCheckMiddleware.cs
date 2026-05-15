using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using System.Security.Claims;

namespace SmsApi.Middleware;

/// <summary>
/// Validates that the authenticated user's account is still active on every request.
/// This ensures that deactivated staff are immediately blocked even if they hold a
/// valid JWT token that has not yet expired.
/// </summary>
public class UserStatusCheckMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<UserStatusCheckMiddleware> _logger;

    public UserStatusCheckMiddleware(RequestDelegate next, ILogger<UserStatusCheckMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, AppDbContext dbContext)
    {
        // Only check authenticated requests
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var email = context.User.FindFirstValue(ClaimTypes.Email)
                        ?? context.User.FindFirstValue("email");

            if (!string.IsNullOrWhiteSpace(email))
            {
                var userLogin = await dbContext.UserLogins
                    .AsNoTracking()
                    .FirstOrDefaultAsync(u => u.Email.ToLower() == email.ToLower() && !u.IsDeleted);

                if (userLogin != null &&
                    (userLogin.Status == "inactive" || userLogin.Status == "suspended"))
                {
                    _logger.LogWarning("Blocked request from deactivated user {Email} (status: {Status})",
                        email, userLogin.Status);
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    context.Response.ContentType = "application/json";
                    await context.Response.WriteAsync(
                        $"{{\"message\":\"Account is {userLogin.Status}. Contact your administrator.\"}}");
                    return;
                }
            }
        }

        await _next(context);
    }
}
