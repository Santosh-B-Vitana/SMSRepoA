using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SmsApi.Models.DTOs
{
    // ── Generic multi-channel dispatch ──────────────────────────────────────

    public class SendChannelMessageRequest
    {
        [Required]
        public string Destination { get; set; } = string.Empty;

        [Required]
        public string RecipientName { get; set; } = string.Empty;

        [Required]
        public string TemplateOrCampaignIdentifier { get; set; } = string.Empty;

        public List<string> TemplateParameters { get; set; } = new();

        public Dictionary<string, string>? CustomAttributes { get; set; }

        public string? MediaUrl { get; set; }

        public string? MediaFilename { get; set; }

        /// <summary>
        /// One or more channel names to dispatch to: "WhatsApp", "Sms", "Email", "Push".
        /// All listed channels fire concurrently.
        /// </summary>
        [Required]
        [MinLength(1)]
        public List<string> Channels { get; set; } = new();
    }

    public class ChannelDispatchResultDto
    {
        public string Channel { get; set; } = string.Empty;
        public bool IsSuccess { get; set; }
        public string? MessageId { get; set; }
        public string? ErrorMessage { get; set; }
        public int StatusCode { get; set; }
    }

    public class ChannelDispatchResponse
    {
        public bool AllSucceeded { get; set; }
        public List<ChannelDispatchResultDto> Results { get; set; } = new();
    }

    // ── User-registration use-case ───────────────────────────────────────────

    /// <summary>
    /// Drives the user-registration notification: OTP via SMS + welcome kit via WhatsApp,
    /// both dispatched concurrently through a single IChannelNotificationManager call.
    /// </summary>
    public class UserRegistrationMessageRequest
    {
        [Required]
        public string PhoneNumber { get; set; } = string.Empty;

        [Required]
        public string FullName { get; set; } = string.Empty;

        [Required]
        public string OtpCode { get; set; } = string.Empty;

        [Required]
        public string SchoolName { get; set; } = string.Empty;

        /// <summary>MSG91 flow/template identifier used for both OTP and welcome-kit sends.</summary>
        [Required]
        public string TemplateIdentifier { get; set; } = string.Empty;

        /// <summary>Optional URL to a welcome PDF or onboarding document sent via WhatsApp.</summary>
        public string? WelcomeDocumentUrl { get; set; }

        public string? WelcomeDocumentFilename { get; set; }
    }
}
