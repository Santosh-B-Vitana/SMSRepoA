using System;
using System.Collections.Generic;

namespace SmsApi.Models.DTOs
{
    // Document Category Basic DTO - Lightweight version for list views
    public class DocumentCategoryBasicDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Icon { get; set; }
        public string? Color { get; set; }
        public int DocumentCount { get; set; }
        public bool IsActive { get; set; }
    }

    // Document Basic DTO - Lightweight version for list views
    public class DocumentBasicDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string FileType { get; set; } = string.Empty;
        public long FileSize { get; set; }
        public Guid CategoryId { get; set; }
        public string AccessLevel { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    // Document Category DTOs
    public class CreateDocumentCategoryRequest
    {
        public Guid SchoolId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Icon { get; set; }
        public string? Color { get; set; }
        public int DisplayOrder { get; set; } = 0;
    }

    public class UpdateDocumentCategoryRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Icon { get; set; }
        public string? Color { get; set; }
        public int DisplayOrder { get; set; }
        public bool IsActive { get; set; }
    }

    public class DocumentCategoryResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Icon { get; set; }
        public string? Color { get; set; }
        public int DisplayOrder { get; set; }
        public bool IsActive { get; set; }
        public int DocumentCount { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class DocumentCategoryListResponse
    {
        public List<DocumentCategoryResponse> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    // Document DTOs
    public class CreateDocumentRequest
    {
        public Guid SchoolId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string FileUrl { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public string FileType { get; set; } = string.Empty;
        public long FileSize { get; set; }
        public Guid CategoryId { get; set; }
        public Guid UploadedByStaffId { get; set; }
        public string AccessLevel { get; set; } = "Public"; // Public, Private, Class, Section, Staff
        public Guid? RelatedClassId { get; set; }
        public Guid? RelatedSectionId { get; set; }
        public Guid? RelatedStudentId { get; set; }
        public Guid? RelatedStaffId { get; set; }
        public string? Tags { get; set; }
        public DateTime? ExpiryDate { get; set; }
    }

    public class UpdateDocumentRequest
    {
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public Guid CategoryId { get; set; }
        public string AccessLevel { get; set; } = "Public";
        public Guid? RelatedClassId { get; set; }
        public Guid? RelatedSectionId { get; set; }
        public Guid? RelatedStudentId { get; set; }
        public Guid? RelatedStaffId { get; set; }
        public string? Tags { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public bool IsActive { get; set; }
    }

    public class DocumentResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string FileUrl { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public string FileType { get; set; } = string.Empty;
        public long FileSize { get; set; }
        public string FileSizeFormatted { get; set; } = string.Empty;
        public Guid CategoryId { get; set; }
        public string? CategoryName { get; set; }
        public Guid UploadedByStaffId { get; set; }
        public string? UploadedByStaffName { get; set; }
        public string AccessLevel { get; set; } = string.Empty;
        public Guid? RelatedClassId { get; set; }
        public string? RelatedClassName { get; set; }
        public Guid? RelatedSectionId { get; set; }
        public string? RelatedSectionName { get; set; }
        public Guid? RelatedStudentId { get; set; }
        public string? RelatedStudentName { get; set; }
        public Guid? RelatedStaffId { get; set; }
        public string? RelatedStaffName { get; set; }
        public string? Tags { get; set; }
        public int DownloadCount { get; set; }
        public bool IsActive { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class DocumentListResponse
    {
        public List<DocumentResponse> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    public class IncrementDownloadRequest
    {
        public Guid DocumentId { get; set; }
    }

    public class DocumentStatsResponse
    {
        public int TotalDocuments { get; set; }
        public int TotalCategories { get; set; }
        public long TotalDownloads { get; set; }
        public long TotalSizeBytes { get; set; }
        public string TotalSizeFormatted { get; set; } = string.Empty;
        public int AddedLast7Days { get; set; }
        public int AddedLast30Days { get; set; }
        public Dictionary<string, int> ByCategory { get; set; } = new();
        public Dictionary<string, int> ByAccessLevel { get; set; } = new();
        public Dictionary<string, int> ByFileType { get; set; } = new();
    }
}
