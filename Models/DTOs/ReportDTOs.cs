using System;
using System.Collections.Generic;

namespace SmsApi.Models.DTOs
{
    // Report DTOs
    public class CreateReportRequest
    {
        public Guid SchoolId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string ReportType { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Parameters { get; set; } = string.Empty;
        public string Format { get; set; } = "PDF";
        public Guid GeneratedByStaffId { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public Guid? ClassId { get; set; }
        public Guid? SectionId { get; set; }
    }

    public class ReportResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string ReportType { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Parameters { get; set; } = string.Empty;
        public string Format { get; set; } = string.Empty;
        public Guid GeneratedByStaffId { get; set; }
        public string? GeneratedByStaffName { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public Guid? ClassId { get; set; }
        public string? ClassName { get; set; }
        public Guid? SectionId { get; set; }
        public string? SectionName { get; set; }
        public string? FileUrl { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? ErrorMessage { get; set; }
        public int RecordCount { get; set; }
        public DateTime GeneratedAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class ReportListResponse
    {
        public List<ReportResponse> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    // Report Template DTOs
    public class CreateReportTemplateRequest
    {
        public Guid SchoolId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string ReportType { get; set; } = string.Empty;
        public string QueryTemplate { get; set; } = string.Empty;
        public string? DefaultParameters { get; set; }
        public string Format { get; set; } = "PDF";
        public bool IsPublic { get; set; } = true;
        public Guid CreatedByStaffId { get; set; }
    }

    public class UpdateReportTemplateRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string QueryTemplate { get; set; } = string.Empty;
        public string? DefaultParameters { get; set; }
        public string Format { get; set; } = "PDF";
        public bool IsActive { get; set; }
        public bool IsPublic { get; set; }
    }

    public class ReportTemplateResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string ReportType { get; set; } = string.Empty;
        public string QueryTemplate { get; set; } = string.Empty;
        public string? DefaultParameters { get; set; }
        public string Format { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public bool IsPublic { get; set; }
        public Guid CreatedByStaffId { get; set; }
        public string? CreatedByStaffName { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class ReportTemplateListResponse
    {
        public List<ReportTemplateResponse> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }
}
