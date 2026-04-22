using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    // ========== ALUMNI MEET ==========
    public class AlumniMeet : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;
        
        [MaxLength(2000)]
        public string? Description { get; set; }
        
        [Required]
        public DateTime MeetDate { get; set; }
        
        public TimeSpan? MeetTime { get; set; }
        
        [Required]
        [MaxLength(500)]
        public string Venue { get; set; } = string.Empty;
        
        [MaxLength(100)]
        public string? MeetType { get; set; } // Reunion, Career Fair, Networking, Social, etc.
        
        public int? MaxCapacity { get; set; }
        
        public int RegisteredCount { get; set; } = 0;
        
        public int AttendedCount { get; set; } = 0;
        
        [MaxLength(20)]
        public string Status { get; set; } = "Planned"; // Planned, Open, Closed, Completed, Cancelled
        
        public DateTime? RegistrationDeadline { get; set; }
        
        public decimal? RegistrationFee { get; set; }
        
        [MaxLength(1000)]
        public string? SpecialGuests { get; set; }
        
        [MaxLength(2000)]
        public string? Agenda { get; set; }
        
        public Guid? OrganizerId { get; set; }
        
        [MaxLength(200)]
        public string? ContactPerson { get; set; }
        
        [MaxLength(20)]
        public string? ContactPhone { get; set; }
        
        [MaxLength(200)]
        public string? ContactEmail { get; set; }
        
        [MaxLength(1000)]
        public string? PhotoUrl { get; set; }

        [MaxLength(2000)]
        public string? Notes { get; set; } // JSON metadata for registrations and attendance

        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
    }

    // ========== ALUMNI DONATION ==========
    public class AlumniDonation : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public Guid AlumniId { get; set; }
        
        [Required]
        public decimal Amount { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string DonationType { get; set; } = string.Empty; // Cash, Infrastructure, Scholarship, Equipment, etc.
        
        [Required]
        [MaxLength(100)]
        public string Purpose { get; set; } = string.Empty; // Building Fund, Scholarship Fund, Library, Sports, etc.
        
        [MaxLength(2000)]
        public string? Description { get; set; }
        
        [Required]
        public DateTime DonationDate { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string PaymentMethod { get; set; } = string.Empty; // Cash, Cheque, Bank Transfer, Online, etc.
        
        [MaxLength(200)]
        public string? TransactionReference { get; set; }
        
        [MaxLength(200)]
        public string? ChequeNumber { get; set; }
        
        [MaxLength(200)]
        public string? BankName { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "Pending"; // Pending, Received, Verified, Acknowledged
        
        public DateTime? ReceivedDate { get; set; }
        
        public Guid? ReceivedBy { get; set; }
        
        public bool TaxExemptionRequired { get; set; } = false;
        
        public bool TaxCertificateIssued { get; set; } = false;
        
        public DateTime? TaxCertificateIssuedDate { get; set; }
        
        [MaxLength(200)]
        public string? TaxCertificateNumber { get; set; }
        
        [MaxLength(1000)]
        public string? ReceiptUrl { get; set; }
        
        [MaxLength(2000)]
        public string? AcknowledgementMessage { get; set; }
        
        public DateTime? AcknowledgementSentDate { get; set; }
        
        [MaxLength(1000)]
        public string? Notes { get; set; }
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
        
        [ForeignKey("AlumniId")]
        public virtual Alumni? Alumni { get; set; }
    }
}
