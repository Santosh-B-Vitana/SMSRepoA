using System;
using System.Collections.Generic;

namespace SmsApi.Models.DTOs
{
    // Concession Type DTOs
    public class CreateConcessionTypeRequest
    {
        public Guid SchoolId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string DiscountType { get; set; } = "Percentage";
        public decimal DiscountValue { get; set; }
        public decimal? MaxDiscountAmount { get; set; }
        public string? ApplicableFor { get; set; }
        public bool RequiresDocuments { get; set; }
        public bool RequiresApproval { get; set; }
        public DateTime? ValidFrom { get; set; }
        public DateTime? ValidTo { get; set; }
        public Guid CreatedBy { get; set; }
    }

    public class UpdateConcessionTypeRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal DiscountValue { get; set; }
        public decimal? MaxDiscountAmount { get; set; }
        public bool RequiresDocuments { get; set; }
        public bool RequiresApproval { get; set; }
        public DateTime? ValidFrom { get; set; }
        public DateTime? ValidTo { get; set; }
        public bool IsActive { get; set; }
        public Guid UpdatedBy { get; set; }
    }

    public class ConcessionTypeResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string DiscountType { get; set; } = string.Empty;
        public decimal DiscountValue { get; set; }
        public decimal? MaxDiscountAmount { get; set; }
        public string? ApplicableFor { get; set; }
        public bool RequiresDocuments { get; set; }
        public bool RequiresApproval { get; set; }
        public DateTime? ValidFrom { get; set; }
        public DateTime? ValidTo { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class ConcessionTypeListResponse
    {
        public List<ConcessionTypeResponse> Items { get; set; } = new();
        public List<ConcessionTypeResponse> ConcessionTypes { get; set; } = new();
        public int TotalCount { get; set; }
        public int Total { get; set; }
    }

    // Fee Concession DTOs
    public class CreateFeeConcessionRequest
    {
        public Guid SchoolId { get; set; }
        public Guid StudentId { get; set; }
        public Guid ConcessionTypeId { get; set; }
        public string AcademicYear { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
        public List<string>? DocumentUrls { get; set; }
        public decimal AppliedAmount { get; set; }
        public DateTime? ValidFrom { get; set; }
        public DateTime? ValidTo { get; set; }
        public Guid CreatedBy { get; set; }
    }

    public class ApproveFeeConcessionRequest
    {
        public decimal ApprovedAmount { get; set; }
        public string? ApproverRemarks { get; set; }
        public string? Remarks { get; set; }
        public Guid ApprovedBy { get; set; }
        public Guid ApprovedByStaffId { get; set; }
    }

    public class RejectFeeConcessionRequest
    {
        public string ApproverRemarks { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
        public Guid RejectedBy { get; set; }
        public Guid RejectedByStaffId { get; set; }
    }

    public class FeeConcessionResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string ConcessionNumber { get; set; } = string.Empty;
        public Guid StudentId { get; set; }
        public string? StudentName { get; set; }
        public string? StudentAdmissionNumber { get; set; }
        public Guid ConcessionTypeId { get; set; }
        public string? ConcessionTypeName { get; set; }
        public string AcademicYear { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
        public List<string>? DocumentUrls { get; set; }
        public decimal AppliedAmount { get; set; }
        public decimal ApprovedAmount { get; set; }
        public string Status { get; set; } = string.Empty;
        public Guid? ApprovedByStaffId { get; set; }
        public string? ApprovedByStaffName { get; set; }
        public DateTime? ApprovedDate { get; set; }
        public string? ApproverRemarks { get; set; }
        public DateTime? ValidFrom { get; set; }
        public DateTime? ValidTo { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class FeeConcessionListResponse
    {
        public List<FeeConcessionResponse> Items { get; set; } = new();
        public List<FeeConcessionResponse> Concessions { get; set; } = new();
        public int TotalCount { get; set; }
        public int Total { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }
}
