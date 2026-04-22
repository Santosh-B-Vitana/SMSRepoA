using System;
using System.Collections.Generic;

namespace SmsApi.Models.DTOs
{
    // PF/ESI Configuration Basic DTO - Lightweight version for list views
    public class PFESIConfigBasicDto
    {
        public Guid Id { get; set; }
        public string Type { get; set; } = string.Empty;
        public decimal EmployeeContributionPercentage { get; set; }
        public decimal EmployerContributionPercentage { get; set; }
        public string? RegistrationNumber { get; set; }
        public bool IsActive { get; set; }
    }

    // PF/ESI Contribution Basic DTO - Lightweight version for list views
    public class PFESIContributionBasicDto
    {
        public Guid Id { get; set; }
        public Guid StaffId { get; set; }
        public string? StaffName { get; set; }
        public string Type { get; set; } = string.Empty;
        public string Month { get; set; } = string.Empty;
        public decimal TotalContribution { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    // PF/ESI Configuration DTOs
    public class CreatePFESIConfigRequest
    {
        public Guid SchoolId { get; set; }
        public string Type { get; set; } = string.Empty;
        public decimal EmployeeContributionPercentage { get; set; }
        public decimal EmployerContributionPercentage { get; set; }
        public decimal? WageLimit { get; set; }
        public decimal? PensionContributionLimit { get; set; }
        public string? RegistrationNumber { get; set; }
        public DateTime? EffectiveFrom { get; set; }
        public DateTime? EffectiveTo { get; set; }
        public Guid CreatedBy { get; set; }
    }

    public class UpdatePFESIConfigRequest
    {
        public decimal EmployeeContributionPercentage { get; set; }
        public decimal EmployerContributionPercentage { get; set; }
        public decimal? WageLimit { get; set; }
        public decimal? PensionContributionLimit { get; set; }
        public string? RegistrationNumber { get; set; }
        public DateTime? EffectiveFrom { get; set; }
        public DateTime? EffectiveTo { get; set; }
        public bool IsActive { get; set; }
        public Guid UpdatedBy { get; set; }
    }

    public class PFESIConfigResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string Type { get; set; } = string.Empty;
        public decimal EmployeeContributionPercentage { get; set; }
        public decimal EmployerContributionPercentage { get; set; }
        public decimal? WageLimit { get; set; }
        public decimal? PensionContributionLimit { get; set; }
        public string? RegistrationNumber { get; set; }
        public DateTime? EffectiveFrom { get; set; }
        public DateTime? EffectiveTo { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    // PF/ESI Contribution DTOs
    public class CalculateContributionsRequest
    {
        public Guid SchoolId { get; set; }
        public string Type { get; set; } = string.Empty;
        public string Month { get; set; } = string.Empty;
        public decimal BasicSalary { get; set; }
        public decimal GrossSalary { get; set; }
        public List<Guid>? StaffIds { get; set; }
        public Guid CalculatedBy { get; set; }
    }

    public class PFESIContributionResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid StaffId { get; set; }
        public string? StaffName { get; set; }
        public string Type { get; set; } = string.Empty;
        public string Month { get; set; } = string.Empty;
        public decimal BasicSalary { get; set; }
        public decimal GrossSalary { get; set; }
        public decimal EmployeeContribution { get; set; }
        public decimal EmployerContribution { get; set; }
        public decimal? PensionContribution { get; set; }
        public decimal TotalContribution { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime? DepositDate { get; set; }
        public string? ChallanNumber { get; set; }
        public string? ReceiptUrl { get; set; }
        public string? Remarks { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class PFESIContributionListResponse
    {
        public List<PFESIContributionResponse> Items { get; set; } = new();
        public List<PFESIContributionResponse> Contributions { get; set; } = new();
        public int TotalCount { get; set; }
        public int Total { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
        public decimal TotalEmployeeContribution { get; set; }
        public decimal TotalEmployerContribution { get; set; }
        public decimal GrandTotal { get; set; }
    }

    public class MarkDepositRequest
    {
        public Guid SchoolId { get; set; }
        public Guid ContributionId { get; set; }
        public List<Guid> ContributionIds { get; set; } = new();
        public DateTime DepositDate { get; set; }
        public string ChallanNumber { get; set; } = string.Empty;
        public string? ReceiptUrl { get; set; }
        public string? Remarks { get; set; }
        public Guid UpdatedBy { get; set; }
    }

    // Compliance Report DTOs
    public class GenerateComplianceReportRequest
    {
        public Guid SchoolId { get; set; }
        public string Type { get; set; } = string.Empty;
        public string ReportType { get; set; } = string.Empty;
        public string Period { get; set; } = string.Empty;
        public string? Remarks { get; set; }
        public Guid GeneratedBy { get; set; }
    }

    public class ComplianceReportResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string ReportNumber { get; set; } = string.Empty;
        public string ReportType { get; set; } = string.Empty;
        public string Period { get; set; } = string.Empty;
        public DateTime GeneratedDate { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? ReportFileUrl { get; set; }
        public decimal? TotalEmployeeContribution { get; set; }
        public decimal? TotalEmployerContribution { get; set; }
        public int? TotalEmployees { get; set; }
        public DateTime? SubmissionDate { get; set; }
        public Guid? SubmittedByStaffId { get; set; }
        public string? SubmissionDetails { get; set; }
        public string? Remarks { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class ComplianceReportListResponse
    {
        public List<ComplianceReportResponse> Items { get; set; } = new();
        public List<ComplianceReportResponse> Reports { get; set; } = new();
        public int TotalCount { get; set; }
        public int Total { get; set; }
    }

    public class SubmitComplianceReportRequest
    {
        public string? SubmissionDetails { get; set; }
        public string? Remarks { get; set; }
        public Guid SubmittedBy { get; set; }
        public Guid SubmittedByStaffId { get; set; }
    }
}
