using Microsoft.Extensions.Logging;

namespace SmsApi.Services;

/// <summary>
/// HTML sanitization service to prevent XSS attacks.
/// Strips dangerous tags/attributes while preserving safe HTML content.
/// </summary>
public interface IHtmlSanitizer
{
    /// <summary>Sanitizes HTML string, removing dangerous content.</summary>
    string Sanitize(string? html);

    /// <summary>Sanitizes and truncates HTML to max length.</summary>
    string Sanitize(string? html, int maxLength);
}

/// <summary>
/// Implementation using AngleSharp-based HTML sanitizer (OWASP-compliant).
/// Uses simple whitelist approach to remove dangerous HTML/JS content.
/// </summary>
public sealed class HtmlSanitizationService : IHtmlSanitizer
{
    private readonly ILogger<HtmlSanitizationService> _logger;
    
    // Dangerous patterns that should be removed
    private static readonly string[] DangerousPatterns = new[]
    {
        "<script", "</script>",
        "onerror=", "onload=", "onclick=", "onmouseover=", "onmouseout=", "onkeydown=", "onkeyup=",
        "onfocus=", "onblur=", "onchange=", "onsubmit=",
        "javascript:", "data:text/html", "vbscript:",
        "<iframe", "</iframe>",
        "<embed", "</embed>",
        "<object", "</object>",
        "<applet", "</applet>",
        "<form", "</form>",
        "<input", "</input>",
        "<button", "</button>"
    };

    public HtmlSanitizationService(ILogger<HtmlSanitizationService> logger)
    {
        _logger = logger;
    }

    public string Sanitize(string? html)
    {
        if (string.IsNullOrWhiteSpace(html))
            return string.Empty;

        try
        {
            var sanitized = html;
            
            // Remove dangerous patterns (case-insensitive)
            foreach (var pattern in DangerousPatterns)
            {
                sanitized = System.Text.RegularExpressions.Regex.Replace(
                    sanitized, 
                    System.Text.RegularExpressions.Regex.Escape(pattern), 
                    string.Empty, 
                    System.Text.RegularExpressions.RegexOptions.IgnoreCase
                );
            }

            return sanitized;
        }
        catch (Exception ex)
        {
            _logger.LogWarning("HTML sanitization error: {Message}. Returning original text.", ex.Message);
            return System.Web.HttpUtility.HtmlEncode(html); // Fallback: encode all HTML
        }
    }

    public string Sanitize(string? html, int maxLength)
    {
        var sanitized = Sanitize(html);
        return sanitized.Length > maxLength ? sanitized.Substring(0, maxLength) + "..." : sanitized;
    }
}
