using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    public class Certificate
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid SchoolId { get; set; }

        [ForeignKey(nameof(SchoolId))]
        public School? School { get; set; }

        [Required]
        [MaxLength(100)]
        public string CertificateNumber { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string CertificateType { get; set; } = string.Empty; // BonafideCertificate, TransferCertificate, CharacterCertificate, CompletionCertificate, MeritCertificate, Participation, Achievement

        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        public Guid StudentId { get; set; }

        [ForeignKey(nameof(StudentId))]
        public Student? Student { get; set; }

        public Guid? ClassId { get; set; }

        [ForeignKey(nameof(ClassId))]
        public Class? Class { get; set; }

        public Guid? SectionId { get; set; }

        [ForeignKey(nameof(SectionId))]
        public Section? Section { get; set; }

        [Required]
        public Guid TemplateId { get; set; }

        [ForeignKey(nameof(TemplateId))]
        public CertificateTemplate? Template { get; set; }

        public string? Content { get; set; } // Additional content/description

        [Required]
        public DateTime IssueDate { get; set; }

        public DateTime? ValidUntil { get; set; }

        [Required]
        public Guid IssuedByStaffId { get; set; }

        [ForeignKey(nameof(IssuedByStaffId))]
        public Staff? IssuedByStaff { get; set; }

        [MaxLength(500)]
        public string? FileUrl { get; set; }

        [MaxLength(50)]
        public string Status { get; set; } = "Active"; // Active, Revoked, Expired

        public string? Metadata { get; set; } // JSON for additional fields

        public bool IsPrinted { get; set; } = false;

        public DateTime? PrintedAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    public class CertificateTemplate
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid SchoolId { get; set; }

        [ForeignKey(nameof(SchoolId))]
        public School? School { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string CertificateType { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Description { get; set; }

        [Required]
        public string Template { get; set; } = string.Empty; // HTML template with placeholders

        [MaxLength(20)]
        public string Orientation { get; set; } = "Portrait"; // Portrait, Landscape

        [MaxLength(20)]
        public string PageSize { get; set; } = "A4"; // A4, Letter, Legal

        public string? Styles { get; set; } // CSS styles

        public string? HeaderImage { get; set; } // Base64 or URL

        public string? FooterImage { get; set; }

        public string? WatermarkImage { get; set; }

        public bool IsActive { get; set; } = true;

        public bool IsDefault { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    public class IDCard
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid SchoolId { get; set; }

        [ForeignKey(nameof(SchoolId))]
        public School? School { get; set; }

        [Required]
        [MaxLength(50)]
        public string CardNumber { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string CardType { get; set; } = string.Empty; // Student, Staff, Parent, Visitor

        [Required]
        public Guid HolderId { get; set; } // StudentId, StaffId, or ParentId

        [Required]
        [MaxLength(50)]
        public string HolderType { get; set; } = string.Empty; // Student, Staff, Parent

        [Required]
        public Guid TemplateId { get; set; }

        [ForeignKey(nameof(TemplateId))]
        public IDCardTemplate? Template { get; set; }

        [MaxLength(500)]
        public string? PhotoUrl { get; set; }

        [MaxLength(200)]
        public string? BarcodeData { get; set; }

        [MaxLength(200)]
        public string? QRCodeData { get; set; }

        [Required]
        public DateTime IssueDate { get; set; }

        [Required]
        public DateTime ExpiryDate { get; set; }

        [MaxLength(50)]
        public string Status { get; set; } = "Active"; // Active, Expired, Lost, Revoked

        [MaxLength(500)]
        public string? FileUrl { get; set; }

        public bool IsPrinted { get; set; } = false;

        public DateTime? PrintedAt { get; set; }

        public string? Metadata { get; set; } // JSON for additional fields

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    public class IDCardTemplate
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid SchoolId { get; set; }

        [ForeignKey(nameof(SchoolId))]
        public School? School { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string CardType { get; set; } = string.Empty; // Student, Staff, Parent

        [MaxLength(500)]
        public string? Description { get; set; }

        [Required]
        public string FrontTemplate { get; set; } = string.Empty; // HTML template for front

        public string? BackTemplate { get; set; } // HTML template for back

        [MaxLength(20)]
        public string CardSize { get; set; } = "CR80"; // CR80 (Standard credit card size), Custom

        public string? Styles { get; set; } // CSS styles

        public string? BackgroundImage { get; set; }

        public bool ShowBarcode { get; set; } = false;

        public bool ShowQRCode { get; set; } = true;

        public bool IsActive { get; set; } = true;

        public bool IsDefault { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
