namespace SmsApi.Middleware;

/// <summary>
/// Injects OWASP-recommended HTTP security response headers on every response.
/// Prevents clickjacking, MIME sniffing, information disclosure, and limits dangerous
/// browser capabilities. Must be placed early in the pipeline before any content is written.
/// </summary>
public class SecurityHeadersMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IWebHostEnvironment _env;

    public SecurityHeadersMiddleware(RequestDelegate next, IWebHostEnvironment env)
    {
        _next = next;
        _env = env;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var headers = context.Response.Headers;

        // Prevent MIME-type sniffing — browser must honour declared Content-Type
        headers["X-Content-Type-Options"] = "nosniff";

        // Deny embedding in <iframe>, <frame>, <embed>, <object> — prevents clickjacking
        headers["X-Frame-Options"] = "DENY";

        // Modern CSP frame-ancestors also blocks clickjacking (belt-and-suspenders)
        // For an API, default-src 'none' is correct — we don't serve HTML/scripts
        headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'";

        // Minimal referrer — don't leak full URL to third parties
        headers["Referrer-Policy"] = "strict-origin-when-cross-origin";

        // Disable dangerous browser features that this API doesn't need
        headers["Permissions-Policy"] =
            "accelerometer=(), camera=(), geolocation=(), gyroscope=(), " +
            "magnetometer=(), microphone=(), payment=(), usb=()";

        // Deprecated but harmless — tells old browsers to enable XSS filter.
        // Set to 0 because modern recommendation is to rely on CSP instead.
        headers["X-XSS-Protection"] = "0";

        // Remove server banner (information disclosure)
        headers.Remove("Server");
        headers.Remove("X-Powered-By");

        // API responses must not be cached by proxies or browsers (they contain auth-sensitive data)
        // Individual GET endpoints that want caching should set their own Cache-Control.
        var path = context.Request.Path.Value ?? "";
        var isHealthOrSwagger = path.StartsWith("/health", StringComparison.OrdinalIgnoreCase)
                             || path.StartsWith("/swagger", StringComparison.OrdinalIgnoreCase);

        if (!isHealthOrSwagger)
        {
            headers["Cache-Control"] = "no-store, no-cache, must-revalidate, proxy-revalidate";
            headers["Pragma"] = "no-cache";
            headers["Expires"] = "0";
        }

        await _next(context);
    }
}
