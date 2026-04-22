using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SmsApi.Models.DTOs
{
    // ========== ALUMNI MEET DTOs ==========
    
    public class AlumniMeetFiltersDto
    {
        public string? MeetType { get; set; }
        public string? Status { get; set; }
        public DateTime? DateFrom { get; set; }
        public DateTime? DateTo { get; set; }
        public string? SearchQuery { get; set; }
    }

    public class AlumniMeetRegistrationDto
    {
        [Required]
        public Guid AlumniId { get; set; }
        
        [Required]
        public Guid MeetId { get; set; }
        
        public bool WillAttend { get; set; } = true;
        public int? NumberOfGuests { get; set; }
        public string? DietaryPreferences { get; set; }
        public string? SpecialRequests { get; set; }
    }

    public class MarkMeetAttendanceDto
    {
        [Required]
        public Guid MeetId { get; set; }
        
        [Required]
        public List<Guid> AlumniIds { get; set; } = new();
        
        public DateTime? AttendanceTime { get; set; }
    }

    public class AlumniMeetAttendanceDto
    {
        public Guid AlumniId { get; set; }
        public string AlumniName { get; set; } = string.Empty;
        public bool Registered { get; set; }
        public bool Attended { get; set; }
        public DateTime? AttendanceTime { get; set; }
    }

    // ========== ALUMNI DONATION DTOs ==========
    
    public class AlumniDonationFiltersDto
    {
        public Guid? AlumniId { get; set; }
        public string? DonationType { get; set; }
        public string? Purpose { get; set; }
        public string? Status { get; set; }
        public DateTime? DateFrom { get; set; }
        public DateTime? DateTo { get; set; }
        public decimal? MinAmount { get; set; }
        public decimal? MaxAmount { get; set; }
    }

    public class AlumniDonationDto
    {
        public Guid Id { get; set; }
        public Guid AlumniId { get; set; }
        public string AlumniName { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string DonationType { get; set; } = string.Empty;
        public string Purpose { get; set; } = string.Empty;
        public DateTime DonationDate { get; set; }
        public string Status { get; set; } = string.Empty;
        public string PaymentMethod { get; set; } = string.Empty;
        public string? ReceiptNumber { get; set; }
        public bool IsAnonymous { get; set; }
        public string? Message { get; set; }
    }

    public class AlumniDonationBasicDto
    {
        public Guid Id { get; set; }
        public Guid AlumniId { get; set; }
        public string AlumniName { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string DonationType { get; set; } = string.Empty;
        public string Purpose { get; set; } = string.Empty;
        public DateTime DonationDate { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    public class AlumniDonationFullDto
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid AlumniId { get; set; }
        public string AlumniName { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string DonationType { get; set; } = string.Empty;
        public string Purpose { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime DonationDate { get; set; }
        public string PaymentMethod { get; set; } = string.Empty;
        public string? TransactionReference { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime? ReceivedDate { get; set; }
        public bool TaxExemptionRequired { get; set; }
        public bool TaxCertificateIssued { get; set; }
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
