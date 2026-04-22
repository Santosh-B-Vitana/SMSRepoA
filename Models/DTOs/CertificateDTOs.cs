using System;
using System.Collections.Generic;

namespace SmsApi.Models.DTOs
{
    // ═══════════════════════════════════════════════════════════════════════════
    // Constants
    // ═══════════════════════════════════════════════════════════════════════════
    public static class CertificateConstants
    {
        public static readonly IReadOnlyList<string> ValidCertificateTypes = new[]
        {
            "BonafideCertificate", "TransferCertificate", "CharacterCertificate",
            "CompletionCertificate", "MeritCertificate", "Participation",
            "Achievement", "LeavingCertificate", "ConductCertificate"
        };

        public static readonly IReadOnlyList<string> ValidCertificateStatuses = new[]
        {
            "Active", "Revoked", "Expired"
        };

        public static readonly IReadOnlyList<string> ValidOrientations = new[]
        {
            "Portrait", "Landscape"
        };

        public static readonly IReadOnlyList<string> ValidPageSizes = new[]
        {
            "A4", "A3", "Letter", "Legal"
        };

        public static readonly IReadOnlyList<string> ValidCardTypes = new[]
        {
            "Student", "Staff", "Parent", "Visitor"
        };

        public static readonly IReadOnlyList<string> ValidHolderTypes = new[]
        {
            "Student", "Staff", "Parent"
        };

        public static readonly IReadOnlyList<string> ValidCardSizes = new[]
        {
            "CR80", "CR79", "CR100", "Custom"
        };

        public static readonly IReadOnlyList<string> ValidCardStatuses = new[]
        {
            "Active", "Expired", "Lost", "Revoked"
        };

        public const int TemplateNameMax    = 100;
        public const int TemplateNameMin    = 3;
        public const int DescriptionMax     = 500;
        public const int TitleMax           = 200;
        public const int TitleMin           = 3;
        public const int CertNumberMax      = 100;
        public const int CertNumberMin      = 3;
        public const int CardNumberMax      = 50;
        public const int CardNumberMin      = 3;
        public const int MetadataMax        = 4000;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Certificate Template DTOs
    // ═══════════════════════════════════════════════════════════════════════════
    public class CertificateTemplateBasicDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string CertificateType { get; set; } = string.Empty;
        public string Orientation { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public bool IsDefault { get; set; }
    }

    public class CreateCertificateTemplateRequest
    {
        public Guid SchoolId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string CertificateType { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Template { get; set; } = string.Empty;
        public string Orientation { get; set; } = "Portrait";
        public string PageSize { get; set; } = "A4";
        public string? Styles { get; set; }
        public string? HeaderImage { get; set; }
        public string? FooterImage { get; set; }
        public string? WatermarkImage { get; set; }
        public bool IsDefault { get; set; } = false;
    }

    public class UpdateCertificateTemplateRequest
    {
        public string? Name { get; set; }
        public string? Description { get; set; }
        public string? Template { get; set; }
        public string? Orientation { get; set; }
        public string? PageSize { get; set; }
        public string? Styles { get; set; }
        public string? HeaderImage { get; set; }
        public string? FooterImage { get; set; }
        public string? WatermarkImage { get; set; }
        public bool? IsActive { get; set; }
        public bool? IsDefault { get; set; }
    }

    public class CertificateTemplateResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string CertificateType { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Template { get; set; } = string.Empty;
        public string Orientation { get; set; } = string.Empty;
        public string PageSize { get; set; } = string.Empty;
        public string? Styles { get; set; }
        public string? HeaderImage { get; set; }
        public string? FooterImage { get; set; }
        public string? WatermarkImage { get; set; }
        public bool IsActive { get; set; }
        public bool IsDefault { get; set; }
        public int CertificatesIssuedCount { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class CertificateTemplateListResponse
    {
        public List<CertificateTemplateResponse> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Certificate DTOs
    // ═══════════════════════════════════════════════════════════════════════════
    public class CertificateBasicDto
    {
        public Guid Id { get; set; }
        public string CertificateNumber { get; set; } = string.Empty;
        public string CertificateType { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public Guid StudentId { get; set; }
        public string? StudentName { get; set; }
        public DateTime IssueDate { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    public class CreateCertificateRequest
    {
        public Guid SchoolId { get; set; }
        public string CertificateNumber { get; set; } = string.Empty;
        public string CertificateType { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public Guid StudentId { get; set; }
        public Guid? ClassId { get; set; }
        public Guid? SectionId { get; set; }
        public Guid TemplateId { get; set; }
        public string? Content { get; set; }
        public DateTime IssueDate { get; set; }
        public DateTime? ValidUntil { get; set; }
        public Guid IssuedByStaffId { get; set; }
        public string? Metadata { get; set; }
    }

    public class UpdateCertificateRequest
    {
        public string? Title { get; set; }
        public string? Content { get; set; }
        public DateTime? ValidUntil { get; set; }
        public string? Status { get; set; }
        public string? Metadata { get; set; }
    }

    public class CertificateResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string CertificateNumber { get; set; } = string.Empty;
        public string CertificateType { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public Guid StudentId { get; set; }
        public string? StudentName { get; set; }
        public Guid? ClassId { get; set; }
        public string? ClassName { get; set; }
        public Guid? SectionId { get; set; }
        public string? SectionName { get; set; }
        public Guid TemplateId { get; set; }
        public string? TemplateName { get; set; }
        public string? Content { get; set; }
        public DateTime IssueDate { get; set; }
        public DateTime? ValidUntil { get; set; }
        public Guid IssuedByStaffId { get; set; }
        public string? IssuedByStaffName { get; set; }
        public string? FileUrl { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? Metadata { get; set; }
        public bool IsPrinted { get; set; }
        public DateTime? PrintedAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class CertificateListResponse
    {
        public List<CertificateResponse> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ID Card Template DTOs
    // ═══════════════════════════════════════════════════════════════════════════
    public class CreateIDCardTemplateRequest
    {
        public Guid SchoolId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string CardType { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string FrontTemplate { get; set; } = string.Empty;
        public string? BackTemplate { get; set; }
        public string CardSize { get; set; } = "CR80";
        public string? Styles { get; set; }
        public string? BackgroundImage { get; set; }
        public bool ShowBarcode { get; set; } = false;
        public bool ShowQRCode { get; set; } = true;
        public bool IsDefault { get; set; } = false;
    }

    public class UpdateIDCardTemplateRequest
    {
        public string? Name { get; set; }
        public string? Description { get; set; }
        public string? FrontTemplate { get; set; }
        public string? BackTemplate { get; set; }
        public string? CardSize { get; set; }
        public string? Styles { get; set; }
        public string? BackgroundImage { get; set; }
        public bool? ShowBarcode { get; set; }
        public bool? ShowQRCode { get; set; }
        public bool? IsActive { get; set; }
        public bool? IsDefault { get; set; }
    }

    public class IDCardTemplateResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string CardType { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string FrontTemplate { get; set; } = string.Empty;
        public string? BackTemplate { get; set; }
        public string CardSize { get; set; } = string.Empty;
        public string? Styles { get; set; }
        public string? BackgroundImage { get; set; }
        public bool ShowBarcode { get; set; }
        public bool ShowQRCode { get; set; }
        public bool IsActive { get; set; }
        public bool IsDefault { get; set; }
        public int CardsIssuedCount { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class IDCardTemplateListResponse
    {
        public List<IDCardTemplateResponse> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ID Card DTOs
    // ═══════════════════════════════════════════════════════════════════════════
    public class CreateIDCardRequest
    {
        public Guid SchoolId { get; set; }
        public string CardNumber { get; set; } = string.Empty;
        public string CardType { get; set; } = string.Empty;
        public Guid HolderId { get; set; }
        public string HolderType { get; set; } = string.Empty;
        public Guid TemplateId { get; set; }
        public string? PhotoUrl { get; set; }
        public string? BarcodeData { get; set; }
        public string? QRCodeData { get; set; }
        public DateTime IssueDate { get; set; }
        public DateTime ExpiryDate { get; set; }
        public string? Metadata { get; set; }
    }

    public class UpdateIDCardRequest
    {
        public string? PhotoUrl { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public string? Status { get; set; }
        public string? Metadata { get; set; }
    }

    public class IDCardResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string CardNumber { get; set; } = string.Empty;
        public string CardType { get; set; } = string.Empty;
        public Guid HolderId { get; set; }
        public string HolderType { get; set; } = string.Empty;
        public string? HolderName { get; set; }
        public Guid TemplateId { get; set; }
        public string? TemplateName { get; set; }
        public string? PhotoUrl { get; set; }
        public string? BarcodeData { get; set; }
        public string? QRCodeData { get; set; }
        public DateTime IssueDate { get; set; }
        public DateTime ExpiryDate { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? FileUrl { get; set; }
        public bool IsPrinted { get; set; }
        public DateTime? PrintedAt { get; set; }
        public string? Metadata { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class IDCardListResponse
    {
        public List<IDCardResponse> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Stats
    // ═══════════════════════════════════════════════════════════════════════════
    public class CertificateTypeStatDto
    {
        public string CertificateType { get; set; } = string.Empty;
        public int Count { get; set; }
    }

    public class CertificateStatsResponse
    {
        public int TotalCertificates { get; set; }
        public int ActiveCertificates { get; set; }
        public int RevokedCertificates { get; set; }
        public int ExpiredCertificates { get; set; }
        public int PrintedCertificates { get; set; }
        public int CertificateTemplates { get; set; }
        public int TotalIDCards { get; set; }
        public int ActiveIDCards { get; set; }
        public int ExpiredIDCards { get; set; }
        public int LostIDCards { get; set; }
        public int PrintedIDCards { get; set; }
        public int IDCardTemplates { get; set; }
        public List<CertificateTypeStatDto> ByType { get; set; } = new();
    }
}

