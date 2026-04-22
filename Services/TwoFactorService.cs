using OtpNet;
using System.Text;

namespace SmsApi.Services;

public interface ITwoFactorService
{
    /// <summary>Generate a random Base32-encoded TOTP secret.</summary>
    string GenerateSecret();

    /// <summary>Build the otpauth:// URI for QR code scanners (Google Authenticator etc.).</summary>
    string GenerateQrCodeUri(string email, string secret, string issuer = "VitanaSMS");

    /// <summary>Verify a 6-digit TOTP code. Allows ±1 time step (30s) for clock drift.</summary>
    bool VerifyCode(string secret, string code);

    /// <summary>Format Base32 secret as groups of 4 for manual entry (ABCD EFGH ...).</summary>
    string FormatSecretForDisplay(string secret);
}

/// <summary>
/// TOTP Two-Factor Authentication via Otp.NET.
/// Uses SHA-1, 30-second step, 6-digit codes — compatible with Google Authenticator, Authy, etc.
/// </summary>
public class TwoFactorService : ITwoFactorService
{
    private readonly ILogger<TwoFactorService> _logger;

    public TwoFactorService(ILogger<TwoFactorService> logger)
    {
        _logger = logger;
    }

    public string GenerateSecret()
    {
        var key = KeyGeneration.GenerateRandomKey(20); // 160-bit TOTP secret
        return Base32Encoding.ToString(key);
    }

    public string GenerateQrCodeUri(string email, string secret, string issuer = "VitanaSMS")
    {
        var encodedIssuer = Uri.EscapeDataString(issuer);
        var encodedEmail = Uri.EscapeDataString(email);
        return $"otpauth://totp/{encodedIssuer}:{encodedEmail}?secret={secret}&issuer={encodedIssuer}";
    }

    public bool VerifyCode(string secret, string code)
    {
        try
        {
            var secretBytes = Base32Encoding.ToBytes(secret);
            var totp = new Totp(secretBytes, step: 30, mode: OtpHashMode.Sha1);
            var window = new VerificationWindow(previous: 1, future: 1);
            var isValid = totp.VerifyTotp(code, out _, window);

            if (!isValid)
                _logger.LogWarning("TOTP code verification failed");

            return isValid;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying TOTP code");
            return false;
        }
    }

    public string FormatSecretForDisplay(string secret)
    {
        var sb = new StringBuilder();
        for (int i = 0; i < secret.Length; i += 4)
        {
            if (i > 0) sb.Append(' ');
            sb.Append(secret.AsSpan(i, Math.Min(4, secret.Length - i)));
        }
        return sb.ToString();
    }
}
