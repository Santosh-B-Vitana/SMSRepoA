using MailKit.Net.Smtp;
using MimeKit;
using SmsApi.Models.DTOs;

namespace SmsApi.Services
{
    /// <summary>
    /// Email service interface for sending notifications
    /// </summary>
    public interface IEmailService
    {
        Task<bool> SendPasswordResetEmailAsync(PasswordResetEmailRequest request);
        Task<bool> SendUserCreatedEmailAsync(string email, string firstName, string lastName, string username, string temporaryPassword);
    }

    /// <summary>
    /// Email service implementation using MailKit (production-grade, replaces deprecated SmtpClient)
    /// </summary>
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<bool> SendPasswordResetEmailAsync(PasswordResetEmailRequest request)
        {
            try
            {
                var smtpServer = _configuration["Email:SmtpServer"];
                var smtpPort = _configuration.GetValue<int>("Email:SmtpPort");
                var senderEmail = _configuration["Email:SenderEmail"];
                var senderPassword = _configuration["Email:SenderPassword"];
                var useTls = _configuration.GetValue<bool>("Email:UseTLS");

                if (string.IsNullOrEmpty(smtpServer) || string.IsNullOrEmpty(senderEmail))
                {
                    _logger.LogWarning("Email configuration is incomplete. Email not sent.");
                    return false;
                }

                using (var client = new SmtpClient())
                {
                    // Connect with TLS/STARTTLS (production-grade security)
                    var options = useTls ? MailKit.Security.SecureSocketOptions.StartTls : MailKit.Security.SecureSocketOptions.Auto;
                    await client.ConnectAsync(smtpServer, smtpPort, options);
                    
                    // Authenticate
                    if (!string.IsNullOrEmpty(senderPassword))
                        await client.AuthenticateAsync(senderEmail, senderPassword);

                    // Create message
                    var message = new MimeMessage
                    {
                        From = { new MailboxAddress("School Management System", senderEmail) },
                        Subject = "Password Reset - School Management System",
                        Body = new BodyBuilder { HtmlBody = GeneratePasswordResetEmailBody(request) }.ToMessageBody()
                    };
                    message.To.Add(new MailboxAddress("", request.Email));

                    // Send
                    await client.SendAsync(message);
                    await client.DisconnectAsync(true);
                    
                    _logger.LogInformation("Password reset email sent to {Email}", request.Email);
                    return true;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending password reset email to {Email}", request.Email ?? "unknown");
                return false;
            }
        }

        public async Task<bool> SendUserCreatedEmailAsync(string email, string firstName, string lastName, string username, string temporaryPassword)
        {
            try
            {
                var smtpServer = _configuration["Email:SmtpServer"];
                var smtpPort = _configuration.GetValue<int>("Email:SmtpPort");
                var senderEmail = _configuration["Email:SenderEmail"];
                var senderPassword = _configuration["Email:SenderPassword"];
                var useTls = _configuration.GetValue<bool>("Email:UseTLS");

                if (string.IsNullOrEmpty(smtpServer) || string.IsNullOrEmpty(senderEmail))
                {
                    _logger.LogWarning("Email configuration is incomplete. Email not sent.");
                    return false;
                }

                using (var client = new SmtpClient())
                {
                    // Connect with TLS/STARTTLS (production-grade security)
                    var options = useTls ? MailKit.Security.SecureSocketOptions.StartTls : MailKit.Security.SecureSocketOptions.Auto;
                    await client.ConnectAsync(smtpServer, smtpPort, options);
                    
                    // Authenticate
                    if (!string.IsNullOrEmpty(senderPassword))
                        await client.AuthenticateAsync(senderEmail, senderPassword);

                    // Create message
                    var message = new MimeMessage
                    {
                        From = { new MailboxAddress("School Management System", senderEmail) },
                        Subject = "Account Created - School Management System",
                        Body = new BodyBuilder { HtmlBody = GenerateUserCreatedEmailBody(firstName, lastName, username, temporaryPassword) }.ToMessageBody()
                    };
                    message.To.Add(new MailboxAddress("", email));

                    // Send
                    await client.SendAsync(message);
                    await client.DisconnectAsync(true);
                    
                    _logger.LogInformation("User creation email sent to {Email}", email);
                    return true;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error sending user creation email to {email}: {ex.Message}");
                return false;
            }
        }

        private string GeneratePasswordResetEmailBody(PasswordResetEmailRequest request)
        {
            return $@"
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #2c3e50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
        .content {{ background-color: #ecf0f1; padding: 20px; }}
        .footer {{ background-color: #34495e; color: white; padding: 20px; text-align: center; border-radius: 0 0 5px 5px; font-size: 12px; }}
        .password-box {{ background-color: #fff; border: 2px solid #3498db; padding: 15px; margin: 20px 0; border-radius: 5px; text-align: center; }}
        .password-text {{ font-size: 20px; font-weight: bold; color: #3498db; font-family: monospace; }}
        .warning {{ background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }}
        .btn {{ display: inline-block; padding: 10px 20px; background-color: #3498db; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px; }}
    </style>
</head>
<body>
    <div class=""container"">
        <div class=""header"">
            <h1>🔐 Password Reset</h1>
        </div>
        <div class=""content"">
            <p>Dear {request.FirstName} {request.LastName},</p>
            
            <p>Your password has been successfully reset by the school administrator. Please use the temporary password below to log in to the School Management System.</p>
            
            <div class=""password-box"">
                <p>Username: <strong>{request.Username}</strong></p>
                <p>Temporary Password:</p>
                <div class=""password-text"">{request.TemporaryPassword}</div>
            </div>
            
            <div class=""warning"">
                <strong>⚠️ Important:</strong> For security reasons, you must change this password immediately after your first login. Do not share this password with anyone.
            </div>
            
            <p><strong>Next Steps:</strong></p>
            <ol>
                <li>Log in to the system using your username and temporary password</li>
                <li>Navigate to your account settings</li>
                <li>Change your password to something only you know</li>
                <li>Log out and log back in with your new password</li>
            </ol>
            
            <p>If you did not request a password reset or have any concerns, please contact the school administration immediately.</p>
            
            <p>Best regards,<br>School Management System</p>
        </div>
        <div class=""footer"">
            <p>&copy; {DateTime.UtcNow.Year} School Management System. All rights reserved.</p>
            <p>This email was sent automatically. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>";
        }

        private string GenerateUserCreatedEmailBody(string firstName, string lastName, string username, string temporaryPassword)
        {
            return $@"
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #27ae60; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
        .content {{ background-color: #ecf0f1; padding: 20px; }}
        .footer {{ background-color: #34495e; color: white; padding: 20px; text-align: center; border-radius: 0 0 5px 5px; font-size: 12px; }}
        .credentials-box {{ background-color: #fff; border: 2px solid #27ae60; padding: 15px; margin: 20px 0; border-radius: 5px; }}
        .credential-item {{ margin: 10px 0; font-family: monospace; }}
        .label {{ font-weight: bold; color: #27ae60; }}
        .warning {{ background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }}
        .btn {{ display: inline-block; padding: 10px 20px; background-color: #27ae60; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px; }}
    </style>
</head>
<body>
    <div class=""container"">
        <div class=""header"">
            <h1>✅ Welcome to School Management System</h1>
        </div>
        <div class=""content"">
            <p>Dear {firstName} {lastName},</p>
            
            <p>Welcome! Your user account has been created in the School Management System. Below are your login credentials to get started.</p>
            
            <div class=""credentials-box"">
                <p style=""margin-top: 0;""><strong>Your Login Credentials:</strong></p>
                <div class=""credential-item""><span class=""label"">Username:</span> {username}</div>
                <div class=""credential-item""><span class=""label"">Temporary Password:</span> {temporaryPassword}</div>
            </div>
            
            <div class=""warning"">
                <strong>⚠️ Important Security Notice:</strong> This is a temporary password. You must change it to a secure password of your choice on your first login. Keep this email secure and do not share your credentials with anyone.
            </div>
            
            <p><strong>How to Get Started:</strong></p>
            <ol>
                <li>Visit the School Management System login page</li>
                <li>Enter your username and temporary password</li>
                <li>Follow the prompts to set your permanent password</li>
                <li>You can then access your account dashboard</li>
            </ol>
            
            <p><strong>Need Help?</strong> If you encounter any issues logging in or have questions, please contact your school administration.</p>
            
            <p>Best regards,<br>School Management System</p>
        </div>
        <div class=""footer"">
            <p>&copy; {DateTime.UtcNow.Year} School Management System. All rights reserved.</p>
            <p>This email was sent automatically. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>";
        }
    }
}
