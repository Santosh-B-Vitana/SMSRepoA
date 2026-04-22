using System.Net;
using Microsoft.Extensions.Logging;
using Polly;
using Polly.CircuitBreaker;
using Polly.Retry;

namespace SmsApi.Infrastructure.Resilience;

/// <summary>
/// Production-grade resilience policies using Polly 8.x for external service calls.
/// Provides retry, circuit breaker, and timeout patterns for email and payment gateway.
/// </summary>
public static class ResiliencePolicies
{
    // =========================================================================
    // HTTP / External Service Retry Policy
    // =========================================================================

    /// <summary>
    /// Exponential back-off retry for transient HTTP failures (3 retries: 2s, 4s, 8s).
    /// </summary>
    public static AsyncRetryPolicy<HttpResponseMessage> GetHttpRetryPolicy(ILogger logger) =>
        Policy
            .Handle<HttpRequestException>()
            .Or<TaskCanceledException>()
            .OrResult<HttpResponseMessage>(r =>
                r.StatusCode is HttpStatusCode.RequestTimeout
                    or HttpStatusCode.TooManyRequests
                    or HttpStatusCode.BadGateway
                    or HttpStatusCode.ServiceUnavailable
                    or HttpStatusCode.GatewayTimeout)
            .WaitAndRetryAsync(
                retryCount: 3,
                sleepDurationProvider: attempt =>
                    TimeSpan.FromSeconds(Math.Pow(2, attempt))
                    + TimeSpan.FromMilliseconds(Random.Shared.Next(0, 500)),
                onRetry: (outcome, delay, attempt, _) =>
                    logger.LogWarning(
                        "HTTP retry {Attempt}/3 after {Delay}ms. Reason: {Reason}",
                        attempt, delay.TotalMilliseconds,
                        outcome.Exception?.Message ?? outcome.Result?.StatusCode.ToString()));

    /// <summary>
    /// Circuit breaker: opens after 5 failures, stays open for 30 s.
    /// </summary>
    public static AsyncCircuitBreakerPolicy<HttpResponseMessage> GetHttpCircuitBreakerPolicy(ILogger logger) =>
        Policy
            .Handle<HttpRequestException>()
            .OrResult<HttpResponseMessage>(r => (int)r.StatusCode >= 500)
            .CircuitBreakerAsync(
                handledEventsAllowedBeforeBreaking: 5,
                durationOfBreak: TimeSpan.FromSeconds(30),
                onBreak: (_, duration) =>
                    logger.LogError("Circuit breaker OPEN for {Duration}s — external service down.", duration.TotalSeconds),
                onReset: () =>
                    logger.LogInformation("Circuit breaker RESET — external service restored."),
                onHalfOpen: () =>
                    logger.LogInformation("Circuit breaker HALF-OPEN — probing service."));

    // =========================================================================
    // Email Service Policies
    // =========================================================================

    /// <summary>
    /// Retry policy for email delivery (3 attempts, 5 s apart, no jitter needed for batch jobs).
    /// </summary>
    public static AsyncRetryPolicy GetEmailRetryPolicy(ILogger logger) =>
        Policy
            .Handle<Exception>(ex => ex is not OperationCanceledException)
            .WaitAndRetryAsync(
                retryCount: 3,
                sleepDurationProvider: _ => TimeSpan.FromSeconds(5),
                onRetry: (ex, _, attempt, _) =>
                    logger.LogWarning(ex,
                        "Email send retry {Attempt}/3. Error: {Message}", attempt, ex.Message));

    /// <summary>
    /// Circuit breaker for email service: opens after 3 failures, pauses 2 minutes.
    /// </summary>
    public static AsyncCircuitBreakerPolicy GetEmailCircuitBreakerPolicy(ILogger logger) =>
        Policy
            .Handle<Exception>()
            .CircuitBreakerAsync(
                exceptionsAllowedBeforeBreaking: 3,
                durationOfBreak: TimeSpan.FromMinutes(2),
                onBreak: (ex, duration) =>
                    logger.LogError(ex, "Email circuit breaker OPEN for {Duration} min.", duration.TotalMinutes),
                onReset: () =>
                    logger.LogInformation("Email circuit breaker RESET."));

    // =========================================================================
    // Payment Gateway Policies
    // =========================================================================

    /// <summary>
    /// Conservative retry for payment gateway (2 retries only — avoid double charges).
    /// </summary>
    public static AsyncRetryPolicy GetPaymentRetryPolicy(ILogger logger) =>
        Policy
            .Handle<HttpRequestException>()
            .Or<TaskCanceledException>()
            .WaitAndRetryAsync(
                retryCount: 2,
                sleepDurationProvider: attempt => TimeSpan.FromSeconds(attempt * 3),
                onRetry: (ex, _, attempt, _) =>
                    logger.LogWarning(ex,
                        "Payment gateway retry {Attempt}/2. Error: {Message}", attempt, ex.Message));

    /// <summary>
    /// Circuit breaker for payment gateway: opens after 3 failures, pauses 1 minute.
    /// </summary>
    public static AsyncCircuitBreakerPolicy GetPaymentCircuitBreakerPolicy(ILogger logger) =>
        Policy
            .Handle<HttpRequestException>()
            .CircuitBreakerAsync(
                exceptionsAllowedBeforeBreaking: 3,
                durationOfBreak: TimeSpan.FromMinutes(1),
                onBreak: (ex, duration) =>
                    logger.LogError(ex, "Payment gateway circuit breaker OPEN for {Duration}s.", duration.TotalSeconds),
                onReset: () =>
                    logger.LogInformation("Payment gateway circuit breaker RESET."));
}
