using Microsoft.AspNetCore.Mvc.Filters;
using System.Diagnostics;

namespace SmsApi.Middleware
{
    /// <summary>
    /// Action filter for logging all API requests and responses
    /// Captures timing, status codes, and errors
    /// </summary>
    public class LoggingActionFilter : IAsyncActionFilter
    {
        private readonly ILogger<LoggingActionFilter> _logger;

        public LoggingActionFilter(ILogger<LoggingActionFilter> logger)
        {
            _logger = logger;
        }

        public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            var stopwatch = Stopwatch.StartNew();
            var httpContext = context.HttpContext;
            var request = httpContext.Request;
            var userId = httpContext.User?.FindFirst("UserId")?.Value ?? "Unknown";
            var schoolId = httpContext.User?.FindFirst("SchoolId")?.Value ?? "Unknown";

            // Log incoming request
            _logger.LogInformation(
                "API Request: {Method} {Path} | User: {UserId} | School: {SchoolId}",
                request.Method,
                request.Path,
                userId,
                schoolId);

            try
            {
                var executedContext = await next();
                stopwatch.Stop();

                var statusCode = executedContext.HttpContext.Response.StatusCode;
                var logLevel = statusCode >= 500 ? LogLevel.Error :
                              statusCode >= 400 ? LogLevel.Warning :
                              LogLevel.Information;

                _logger.Log(logLevel,
                    "API Response: {Method} {Path} | Status: {StatusCode} | Duration: {Duration}ms",
                    request.Method,
                    request.Path,
                    statusCode,
                    stopwatch.ElapsedMilliseconds);

                // Log errors from exception
                if (executedContext.Exception != null)
                {
                    _logger.LogError(executedContext.Exception,
                        "API Error: {Method} {Path} | Exception: {Message}",
                        request.Method,
                        request.Path,
                        executedContext.Exception.Message);
                }
            }
            catch (Exception ex)
            {
                stopwatch.Stop();
                _logger.LogError(ex,
                    "API Exception: {Method} {Path} | Duration: {Duration}ms | Error: {Message}",
                    request.Method,
                    request.Path,
                    stopwatch.ElapsedMilliseconds,
                    ex.Message);
                throw;
            }
        }
    }

    /// <summary>
    /// Global exception handler middleware
    /// Produces RFC 7807 Problem Details responses with correlation ID
    /// </summary>
    public class ErrorHandlingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ErrorHandlingMiddleware> _logger;

        public ErrorHandlingMiddleware(RequestDelegate next, ILogger<ErrorHandlingMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (FluentValidation.ValidationException vex)
            {
                _logger.LogWarning(vex, "Validation failed: {Errors}", vex.Errors);
                context.Response.ContentType = "application/problem+json";
                context.Response.StatusCode = StatusCodes.Status400BadRequest;

                var errors = vex.Errors
                    .GroupBy(e => e.PropertyName)
                    .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray());

                await context.Response.WriteAsJsonAsync(new
                {
                    type = "https://tools.ietf.org/html/rfc7807",
                    title = "Validation Failed",
                    status = 400,
                    detail = "One or more validation errors occurred.",
                    errors,
                    correlationId = context.Items["CorrelationId"]?.ToString(),
                    timestamp = DateTime.UtcNow
                });
            }
            catch (UnauthorizedAccessException uex)
            {
                _logger.LogWarning(uex, "Unauthorized access: {Message}", uex.Message);
                context.Response.ContentType = "application/problem+json";
                context.Response.StatusCode = StatusCodes.Status403Forbidden;

                await context.Response.WriteAsJsonAsync(new
                {
                    type = "https://tools.ietf.org/html/rfc7807",
                    title = "Forbidden",
                    status = 403,
                    detail = uex.Message,
                    correlationId = context.Items["CorrelationId"]?.ToString(),
                    timestamp = DateTime.UtcNow
                });
            }
            catch (KeyNotFoundException knfex)
            {
                _logger.LogWarning(knfex, "Resource not found: {Message}", knfex.Message);
                context.Response.ContentType = "application/problem+json";
                context.Response.StatusCode = StatusCodes.Status404NotFound;

                await context.Response.WriteAsJsonAsync(new
                {
                    type = "https://tools.ietf.org/html/rfc7807",
                    title = "Not Found",
                    status = 404,
                    detail = knfex.Message,
                    correlationId = context.Items["CorrelationId"]?.ToString(),
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unhandled exception: {Message}", ex.Message);
                
                context.Response.ContentType = "application/problem+json";
                context.Response.StatusCode = StatusCodes.Status500InternalServerError;

                await context.Response.WriteAsJsonAsync(new
                {
                    type = "https://tools.ietf.org/html/rfc7807",
                    title = "Internal Server Error",
                    status = 500,
                    detail = "An unexpected error occurred while processing your request.",
                    correlationId = context.Items["CorrelationId"]?.ToString(),
                    timestamp = DateTime.UtcNow
                });
            }
        }
    }
}
