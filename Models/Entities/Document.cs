using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    public class Document
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid SchoolId { get; set; }

        [ForeignKey(nameof(SchoolId))]
        public School? School { get; set; }

        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Description { get; set; }

        [Required]
        [MaxLength(500)]
        public string FileUrl { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string FileName { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string FileType { get; set; } = string.Empty; // PDF, DOC, XLS, IMG, etc.

        public long FileSize { get; set; } // Size in bytes

        [Required]
        public Guid CategoryId { get; set; }

        [ForeignKey(nameof(CategoryId))]
        public DocumentCategory? Category { get; set; }

        [Required]
        public Guid UploadedByStaffId { get; set; }

        [ForeignKey(nameof(UploadedByStaffId))]
        public Staff? UploadedByStaff { get; set; }

        [Required]
        [MaxLength(50)]
        public string AccessLevel { get; set; } = "Public"; // Public, Private, Class, Section, Staff

        public Guid? RelatedClassId { get; set; }

        [ForeignKey(nameof(RelatedClassId))]
        public Class? RelatedClass { get; set; }

        public Guid? RelatedSectionId { get; set; }

        [ForeignKey(nameof(RelatedSectionId))]
        public Section? RelatedSection { get; set; }

        public Guid? RelatedStudentId { get; set; }

        [ForeignKey(nameof(RelatedStudentId))]
        public Student? RelatedStudent { get; set; }

        public Guid? RelatedStaffId { get; set; }

        [ForeignKey(nameof(RelatedStaffId))]
        public Staff? RelatedStaff { get; set; }

        [MaxLength(100)]
        public string? Tags { get; set; } // Comma-separated tags

        public int DownloadCount { get; set; } = 0;

        public bool IsActive { get; set; } = true;

        public DateTime? ExpiryDate { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    public class DocumentCategory
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

        [MaxLength(300)]
        public string? Description { get; set; }

        [MaxLength(50)]
        public string? Icon { get; set; }

        [MaxLength(20)]
        public string? Color { get; set; }

        public int DisplayOrder { get; set; } = 0;

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation property
        public ICollection<Document> Documents { get; set; } = new List<Document>();
    }
}
