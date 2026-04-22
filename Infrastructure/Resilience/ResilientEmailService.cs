using Polly;
using Polly.CircuitBreaker;
using SmsApi.Models.DTOs;

namespace SmsApi.Infrastructure.Resilience;

/// <summary>
/// Resilient decorator for <see cref="SmsApi.Services.IEmailService"/>.
/// Wraps every send operation with Polly retry + circuit-breaker so transient
/// SMTP failures are retried automatically without crashing the request thread.
/// </summary>
public class ResilientEmailService : SmsApi.Services.IEmailService
{
    private readonly SmsApi.Services.IEmailService _inner;
    private readonly ILogger<ResilientEmailService> _logger;
    private readonly AsyncPolicy _policy;

    public ResilientEmailService(
        SmsApi.Services.IEmailService inner,
        ILogger<ResilientEmailService> logger)
    {
        _inner = inner;
        _logger = logger;

        var retry = ResiliencePolicies.GetEmailRetryPolicy(logger);
        var breaker = ResiliencePolicies.GetEmailCircuitBreakerPolicy(logger);

        // Wrap: circuit breaker is outer (won't even attempt when open)
        _policy = Policy.WrapAsync(breaker, retry);
    }

    public async Task<bool> SendPasswordResetEmailAsync(SmsApi.Models.DTOs.PasswordResetEmailRequest request)
    {
        try
        {
            return await _policy.ExecuteAsync(() => _inner.SendPasswordResetEmailAsync(request));
        }
        catch (BrokenCircuitException)
        {
            _logger.LogError("Email circuit open — password reset email queued for later delivery.");
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Email delivery failed after retries for {Email}", request.Email);
            return false;
        }
    }

    public async Task<bool> SendUserCreatedEmailAsync(
        string email, string firstName, string lastName, string username, string temporaryPassword)
    {
        try
        {
            return await _policy.ExecuteAsync(() =>
                _inner.SendUserCreatedEmailAsync(email, firstName, lastName, username, temporaryPassword));
        }
        catch (BrokenCircuitException)
        {
            _logger.LogError("Email circuit open — user-created email for {Email} dropped.", email);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Email delivery failed after retries for {Email}", email);
            return false;
        }
    }
}
