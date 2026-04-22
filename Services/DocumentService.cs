using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SmsApi.Services
{
    // ─── Constants ────────────────────────────────────────────────────────────────
    public static class DocumentConstants
    {
        public static readonly string[] ValidAccessLevels = { "Public", "Private", "Class", "Section", "Staff", "Student" };
        public static readonly string[] ValidFileTypes    = { "PDF", "DOC", "DOCX", "XLS", "XLSX", "PPT", "PPTX", "IMG", "JPG", "JPEG", "PNG", "GIF", "ZIP", "TXT", "CSV", "MP4", "MP3", "OTHER" };
        public const long MaxFileSizeBytes = 104_857_600; // 100 MB
        public const int MaxTitleLength       = 200;
        public const int MinTitleLength       = 2;
        public const int MaxDescriptionLength = 500;
        public const int MaxTagsLength        = 200;
        public const int MaxCategoryNameLength     = 100;
        public const int MinCategoryNameLength     = 2;
        public const int MaxCategoryDescLength     = 300;
        public const int MaxFileNameLength    = 255;
        public const int MaxFileUrlLength     = 1000;
    }

    // ─── Interface ────────────────────────────────────────────────────────────────
    public interface IDocumentService
    {
        // Categories
        Task<DocumentCategoryListResponse> GetCategoriesAsync(Guid schoolId, int page, int pageSize);
        Task<DocumentCategoryResponse?> GetCategoryByIdAsync(Guid id, Guid schoolId);
        Task<DocumentCategoryResponse> CreateCategoryAsync(Guid schoolId, Guid createdByStaffId, CreateDocumentCategoryRequest request);
        Task<DocumentCategoryResponse> UpdateCategoryAsync(Guid id, Guid schoolId, UpdateDocumentCategoryRequest request);
        Task<bool> DeleteCategoryAsync(Guid id, Guid schoolId);

        // Documents
        Task<DocumentListResponse> GetDocumentsAsync(Guid schoolId, Guid? categoryId, string? accessLevel, Guid? relatedClassId, Guid? relatedSectionId, int page, int pageSize);
        Task<DocumentResponse?> GetDocumentByIdAsync(Guid id, Guid schoolId);
        Task<DocumentResponse> CreateDocumentAsync(Guid schoolId, Guid uploadedByStaffId, CreateDocumentRequest request);
        Task<DocumentResponse> UpdateDocumentAsync(Guid id, Guid schoolId, UpdateDocumentRequest request);
        Task<bool> DeleteDocumentAsync(Guid id, Guid schoolId);
        Task<bool> IncrementDownloadCountAsync(Guid id, Guid schoolId);
        Task<List<DocumentResponse>> SearchDocumentsAsync(Guid schoolId, string searchTerm);
        Task<DocumentStatsResponse> GetStatsAsync(Guid schoolId);
    }

    // ─── Implementation ───────────────────────────────────────────────────────────
    public class DocumentService : IDocumentService
    {
        private readonly AppDbContext _db;
        public DocumentService(AppDbContext db) => _db = db;

        // ── Pagination helper ────────────────────────────────────────────────────
        private static (int p, int ps) NormalizePage(int page, int pageSize)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;
            if (pageSize > 100) pageSize = 100;
            return (page, pageSize);
        }

        // ── Validation helpers ───────────────────────────────────────────────────
        private static void ValidateCategoryName(string name)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException("Category name is required.");
            var t = name.Trim();
            if (t.Length < DocumentConstants.MinCategoryNameLength)
                throw new ArgumentException($"Category name must be at least {DocumentConstants.MinCategoryNameLength} characters.");
            if (t.Length > DocumentConstants.MaxCategoryNameLength)
                throw new ArgumentException($"Category name must not exceed {DocumentConstants.MaxCategoryNameLength} characters.");
        }

        private static void ValidateTitle(string title)
        {
            if (string.IsNullOrWhiteSpace(title))
                throw new ArgumentException("Document title is required.");
            var t = title.Trim();
            if (t.Length < DocumentConstants.MinTitleLength)
                throw new ArgumentException($"Title must be at least {DocumentConstants.MinTitleLength} characters.");
            if (t.Length > DocumentConstants.MaxTitleLength)
                throw new ArgumentException($"Title must not exceed {DocumentConstants.MaxTitleLength} characters.");
        }

        private static void ValidateAccessLevel(string level)
        {
            if (!DocumentConstants.ValidAccessLevels.Contains(level, StringComparer.OrdinalIgnoreCase))
                throw new ArgumentException($"Invalid access level '{level}'. Valid levels: {string.Join(", ", DocumentConstants.ValidAccessLevels)}.");
        }

        private static void ValidateFileType(string fileType)
        {
            if (string.IsNullOrWhiteSpace(fileType))
                throw new ArgumentException("File type is required.");
            if (fileType.Trim().Length > 50)
                throw new ArgumentException("File type must not exceed 50 characters.");
        }

        private static void ValidateFileSize(long size)
        {
            if (size <= 0)
                throw new ArgumentException("File size must be greater than zero.");
            if (size > DocumentConstants.MaxFileSizeBytes)
                throw new ArgumentException($"File size exceeds the maximum limit of 100 MB.");
        }

        private static void ValidateFileUrl(string url)
        {
            if (string.IsNullOrWhiteSpace(url))
                throw new ArgumentException("File URL is required.");
            if (url.Trim().Length > DocumentConstants.MaxFileUrlLength)
                throw new ArgumentException($"File URL must not exceed {DocumentConstants.MaxFileUrlLength} characters.");
        }

        private static void ValidateFileName(string name)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException("File name is required.");
            if (name.Trim().Length > DocumentConstants.MaxFileNameLength)
                throw new ArgumentException($"File name must not exceed {DocumentConstants.MaxFileNameLength} characters.");
        }

        // ════════════════════════════════════════════════════════════════════════
        // Categories
        // ════════════════════════════════════════════════════════════════════════

        public async Task<DocumentCategoryListResponse> GetCategoriesAsync(Guid schoolId, int page, int pageSize)
        {
            var (p, ps) = NormalizePage(page, pageSize);
            var query = _db.DocumentCategories
                .Where(dc => dc.SchoolId == schoolId && dc.IsActive);

            var total = await query.CountAsync();
            var items = await query
                .OrderBy(dc => dc.DisplayOrder)
                .ThenBy(dc => dc.Name)
                .Skip((p - 1) * ps)
                .Take(ps)
                .Select(dc => new DocumentCategoryResponse
                {
                    Id = dc.Id,
                    SchoolId = dc.SchoolId,
                    Name = dc.Name,
                    Description = dc.Description,
                    Icon = dc.Icon,
                    Color = dc.Color,
                    DisplayOrder = dc.DisplayOrder,
                    IsActive = dc.IsActive,
                    DocumentCount = _db.Documents.Count(d => d.CategoryId == dc.Id && d.IsActive),
                    CreatedAt = dc.CreatedAt,
                    UpdatedAt = dc.UpdatedAt
                })
                .ToListAsync();

            return new DocumentCategoryListResponse
            {
                Items = items,
                TotalCount = total,
                Page = p,
                PageSize = ps,
                TotalPages = (int)Math.Ceiling(total / (double)ps)
            };
        }

        public async Task<DocumentCategoryResponse?> GetCategoryByIdAsync(Guid id, Guid schoolId)
        {
            var cat = await _db.DocumentCategories
                .Where(dc => dc.Id == id && dc.SchoolId == schoolId && dc.IsActive)
                .Select(dc => new DocumentCategoryResponse
                {
                    Id = dc.Id,
                    SchoolId = dc.SchoolId,
                    Name = dc.Name,
                    Description = dc.Description,
                    Icon = dc.Icon,
                    Color = dc.Color,
                    DisplayOrder = dc.DisplayOrder,
                    IsActive = dc.IsActive,
                    DocumentCount = _db.Documents.Count(d => d.CategoryId == dc.Id && d.IsActive),
                    CreatedAt = dc.CreatedAt,
                    UpdatedAt = dc.UpdatedAt
                })
                .FirstOrDefaultAsync();
            return cat;
        }

        public async Task<DocumentCategoryResponse> CreateCategoryAsync(Guid schoolId, Guid createdByStaffId, CreateDocumentCategoryRequest request)
        {
            ValidateCategoryName(request.Name);

            if (request.Description != null && request.Description.Length > DocumentConstants.MaxCategoryDescLength)
                throw new ArgumentException($"Description must not exceed {DocumentConstants.MaxCategoryDescLength} characters.");

            // Duplicate check (case-insensitive, same school)
            var dup = await _db.DocumentCategories.AnyAsync(dc =>
                dc.SchoolId == schoolId && dc.Name.ToLower() == request.Name.Trim().ToLower() && dc.IsActive);
            if (dup)
                throw new InvalidOperationException($"A category named '{request.Name.Trim()}' already exists.");

            var category = new DocumentCategory
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                Name = request.Name.Trim(),
                Description = request.Description?.Trim(),
                Icon = request.Icon?.Trim(),
                Color = request.Color?.Trim(),
                DisplayOrder = request.DisplayOrder,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _db.DocumentCategories.Add(category);
            await _db.SaveChangesAsync();

            return new DocumentCategoryResponse
            {
                Id = category.Id,
                SchoolId = category.SchoolId,
                Name = category.Name,
                Description = category.Description,
                Icon = category.Icon,
                Color = category.Color,
                DisplayOrder = category.DisplayOrder,
                IsActive = category.IsActive,
                DocumentCount = 0,
                CreatedAt = category.CreatedAt,
                UpdatedAt = category.UpdatedAt
            };
        }

        public async Task<DocumentCategoryResponse> UpdateCategoryAsync(Guid id, Guid schoolId, UpdateDocumentCategoryRequest request)
        {
            var cat = await _db.DocumentCategories.FirstOrDefaultAsync(dc => dc.Id == id && dc.SchoolId == schoolId);
            if (cat == null) throw new KeyNotFoundException("Category not found.");

            ValidateCategoryName(request.Name);
            if (request.Description != null && request.Description.Length > DocumentConstants.MaxCategoryDescLength)
                throw new ArgumentException($"Description must not exceed {DocumentConstants.MaxCategoryDescLength} characters.");

            // Duplicate check for rename (exclude self)
            var dup = await _db.DocumentCategories.AnyAsync(dc =>
                dc.SchoolId == schoolId && dc.Id != id && dc.Name.ToLower() == request.Name.Trim().ToLower() && dc.IsActive);
            if (dup)
                throw new InvalidOperationException($"A category named '{request.Name.Trim()}' already exists.");

            cat.Name = request.Name.Trim();
            cat.Description = request.Description?.Trim();
            cat.Icon = request.Icon?.Trim();
            cat.Color = request.Color?.Trim();
            cat.DisplayOrder = request.DisplayOrder;
            cat.IsActive = request.IsActive;
            cat.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            var docCount = await _db.Documents.CountAsync(d => d.CategoryId == cat.Id && d.IsActive);
            return new DocumentCategoryResponse
            {
                Id = cat.Id,
                SchoolId = cat.SchoolId,
                Name = cat.Name,
                Description = cat.Description,
                Icon = cat.Icon,
                Color = cat.Color,
                DisplayOrder = cat.DisplayOrder,
                IsActive = cat.IsActive,
                DocumentCount = docCount,
                CreatedAt = cat.CreatedAt,
                UpdatedAt = cat.UpdatedAt
            };
        }

        public async Task<bool> DeleteCategoryAsync(Guid id, Guid schoolId)
        {
            var cat = await _db.DocumentCategories.FirstOrDefaultAsync(dc => dc.Id == id && dc.SchoolId == schoolId);
            if (cat == null) return false;

            var hasDocuments = await _db.Documents.AnyAsync(d => d.CategoryId == id && d.IsActive);
            if (hasDocuments)
                throw new InvalidOperationException("Cannot delete a category that has active documents. Deactivate or move documents first.");

            _db.DocumentCategories.Remove(cat);
            await _db.SaveChangesAsync();
            return true;
        }

        // ════════════════════════════════════════════════════════════════════════
        // Documents
        // ════════════════════════════════════════════════════════════════════════

        public async Task<DocumentListResponse> GetDocumentsAsync(Guid schoolId, Guid? categoryId, string? accessLevel, Guid? relatedClassId, Guid? relatedSectionId, int page, int pageSize)
        {
            var (p, ps) = NormalizePage(page, pageSize);

            if (accessLevel != null)
                ValidateAccessLevel(accessLevel);

            var query = _db.Documents
                .Include(d => d.Category)
                .Include(d => d.UploadedByStaff)
                .Include(d => d.RelatedClass)
                .Include(d => d.RelatedSection)
                .Include(d => d.RelatedStudent)
                .Include(d => d.RelatedStaff)
                .Where(d => d.SchoolId == schoolId && d.IsActive);

            if (categoryId.HasValue)
                query = query.Where(d => d.CategoryId == categoryId.Value);
            if (!string.IsNullOrWhiteSpace(accessLevel))
                query = query.Where(d => d.AccessLevel.ToLower() == accessLevel.ToLower());
            if (relatedClassId.HasValue)
                query = query.Where(d => d.RelatedClassId == relatedClassId.Value);
            if (relatedSectionId.HasValue)
                query = query.Where(d => d.RelatedSectionId == relatedSectionId.Value);

            var total = await query.CountAsync();
            var items = await query
                .OrderByDescending(d => d.CreatedAt)
                .Skip((p - 1) * ps)
                .Take(ps)
                .ToListAsync();

            return new DocumentListResponse
            {
                Items = items.Select(MapToResponse).ToList(),
                TotalCount = total,
                Page = p,
                PageSize = ps,
                TotalPages = (int)Math.Ceiling(total / (double)ps)
            };
        }

        public async Task<DocumentResponse?> GetDocumentByIdAsync(Guid id, Guid schoolId)
        {
            var doc = await _db.Documents
                .Include(d => d.Category)
                .Include(d => d.UploadedByStaff)
                .Include(d => d.RelatedClass)
                .Include(d => d.RelatedSection)
                .Include(d => d.RelatedStudent)
                .Include(d => d.RelatedStaff)
                .FirstOrDefaultAsync(d => d.Id == id && d.SchoolId == schoolId && d.IsActive);
            return doc == null ? null : MapToResponse(doc);
        }

        public async Task<DocumentResponse> CreateDocumentAsync(Guid schoolId, Guid uploadedByStaffId, CreateDocumentRequest request)
        {
            ValidateTitle(request.Title);
            ValidateFileUrl(request.FileUrl);
            ValidateFileName(request.FileName);
            ValidateFileType(request.FileType);
            ValidateFileSize(request.FileSize);
            ValidateAccessLevel(request.AccessLevel);

            if (request.Description != null && request.Description.Length > DocumentConstants.MaxDescriptionLength)
                throw new ArgumentException($"Description must not exceed {DocumentConstants.MaxDescriptionLength} characters.");
            if (request.Tags != null && request.Tags.Length > DocumentConstants.MaxTagsLength)
                throw new ArgumentException($"Tags must not exceed {DocumentConstants.MaxTagsLength} characters.");

            // Category must exist and be active
            var cat = await _db.DocumentCategories.FirstOrDefaultAsync(dc => dc.Id == request.CategoryId && dc.SchoolId == schoolId && dc.IsActive);
            if (cat == null)
                throw new KeyNotFoundException("Document category does not exist or is inactive.");

            // Uploader must exist
            var uploader = await _db.StaffMembers.AnyAsync(s => s.Id == uploadedByStaffId && s.SchoolId == schoolId);
            if (!uploader)
                throw new KeyNotFoundException("Uploader staff member does not exist.");

            // Duplicate title per category
            var dup = await _db.Documents.AnyAsync(d =>
                d.SchoolId == schoolId && d.CategoryId == request.CategoryId &&
                d.Title.ToLower() == request.Title.Trim().ToLower() && d.IsActive);
            if (dup)
                throw new InvalidOperationException("A document with this title already exists in this category.");

            // Expiry date must be future
            if (request.ExpiryDate.HasValue && request.ExpiryDate.Value <= DateTime.UtcNow)
                throw new ArgumentException("Expiry date must be in the future.");

            // Related class existence check
            if (request.RelatedClassId.HasValue)
            {
                var classOk = await _db.Classes.AnyAsync(c => c.Id == request.RelatedClassId.Value && c.SchoolId == schoolId);
                if (!classOk)
                    throw new KeyNotFoundException("Related class does not exist.");
            }

            var doc = new Document
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                Title = request.Title.Trim(),
                Description = request.Description?.Trim(),
                FileUrl = request.FileUrl.Trim(),
                FileName = request.FileName.Trim(),
                FileType = request.FileType.Trim().ToUpperInvariant(),
                FileSize = request.FileSize,
                CategoryId = request.CategoryId,
                UploadedByStaffId = uploadedByStaffId,
                AccessLevel = request.AccessLevel,
                RelatedClassId = request.RelatedClassId,
                RelatedSectionId = request.RelatedSectionId,
                RelatedStudentId = request.RelatedStudentId,
                RelatedStaffId = request.RelatedStaffId,
                Tags = request.Tags?.Trim(),
                DownloadCount = 0,
                IsActive = true,
                ExpiryDate = request.ExpiryDate,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _db.Documents.Add(doc);
            await _db.SaveChangesAsync();

            await _db.Entry(doc).Reference(d => d.Category).LoadAsync();
            await _db.Entry(doc).Reference(d => d.UploadedByStaff).LoadAsync();
            return MapToResponse(doc);
        }

        public async Task<DocumentResponse> UpdateDocumentAsync(Guid id, Guid schoolId, UpdateDocumentRequest request)
        {
            var doc = await _db.Documents
                .Include(d => d.Category)
                .Include(d => d.UploadedByStaff)
                .Include(d => d.RelatedClass)
                .Include(d => d.RelatedSection)
                .Include(d => d.RelatedStudent)
                .Include(d => d.RelatedStaff)
                .FirstOrDefaultAsync(d => d.Id == id && d.SchoolId == schoolId);

            if (doc == null) throw new KeyNotFoundException("Document not found.");

            ValidateTitle(request.Title);
            ValidateAccessLevel(request.AccessLevel);
            if (request.Description != null && request.Description.Length > DocumentConstants.MaxDescriptionLength)
                throw new ArgumentException($"Description must not exceed {DocumentConstants.MaxDescriptionLength} characters.");
            if (request.Tags != null && request.Tags.Length > DocumentConstants.MaxTagsLength)
                throw new ArgumentException($"Tags must not exceed {DocumentConstants.MaxTagsLength} characters.");
            if (request.ExpiryDate.HasValue && request.ExpiryDate.Value <= DateTime.UtcNow)
                throw new ArgumentException("Expiry date must be in the future.");

            // Category must exist if changed
            if (request.CategoryId != doc.CategoryId)
            {
                var catExists = await _db.DocumentCategories.AnyAsync(dc => dc.Id == request.CategoryId && dc.SchoolId == schoolId && dc.IsActive);
                if (!catExists)
                    throw new KeyNotFoundException("Document category does not exist or is inactive.");
            }

            // Duplicate title check if title changed
            if (!string.Equals(doc.Title, request.Title.Trim(), StringComparison.OrdinalIgnoreCase) ||
                doc.CategoryId != request.CategoryId)
            {
                var dup = await _db.Documents.AnyAsync(d =>
                    d.SchoolId == schoolId && d.CategoryId == request.CategoryId &&
                    d.Id != id && d.Title.ToLower() == request.Title.Trim().ToLower() && d.IsActive);
                if (dup)
                    throw new InvalidOperationException("A document with this title already exists in this category.");
            }

            doc.Title = request.Title.Trim();
            doc.Description = request.Description?.Trim();
            doc.CategoryId = request.CategoryId;
            doc.AccessLevel = request.AccessLevel;
            doc.RelatedClassId = request.RelatedClassId;
            doc.RelatedSectionId = request.RelatedSectionId;
            doc.RelatedStudentId = request.RelatedStudentId;
            doc.RelatedStaffId = request.RelatedStaffId;
            doc.Tags = request.Tags?.Trim();
            doc.ExpiryDate = request.ExpiryDate;
            doc.IsActive = request.IsActive;
            doc.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            await _db.Entry(doc).Reference(d => d.Category).LoadAsync();
            return MapToResponse(doc);
        }

        public async Task<bool> DeleteDocumentAsync(Guid id, Guid schoolId)
        {
            var doc = await _db.Documents.FirstOrDefaultAsync(d => d.Id == id && d.SchoolId == schoolId);
            if (doc == null) return false;
            // Soft delete
            doc.IsActive = false;
            doc.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> IncrementDownloadCountAsync(Guid id, Guid schoolId)
        {
            var doc = await _db.Documents.FirstOrDefaultAsync(d => d.Id == id && d.SchoolId == schoolId && d.IsActive);
            if (doc == null) return false;
            doc.DownloadCount++;
            doc.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<List<DocumentResponse>> SearchDocumentsAsync(Guid schoolId, string searchTerm)
        {
            if (string.IsNullOrWhiteSpace(searchTerm))
                throw new ArgumentException("Search term is required.");
            var term = searchTerm.Trim().ToLower();
            var docs = await _db.Documents
                .Include(d => d.Category)
                .Include(d => d.UploadedByStaff)
                .Include(d => d.RelatedClass)
                .Include(d => d.RelatedSection)
                .Include(d => d.RelatedStudent)
                .Include(d => d.RelatedStaff)
                .Where(d => d.SchoolId == schoolId && d.IsActive &&
                    (d.Title.ToLower().Contains(term) ||
                     (d.Description != null && d.Description.ToLower().Contains(term)) ||
                     d.FileName.ToLower().Contains(term) ||
                     (d.Tags != null && d.Tags.ToLower().Contains(term))))
                .OrderByDescending(d => d.CreatedAt)
                .Take(50)
                .ToListAsync();
            return docs.Select(MapToResponse).ToList();
        }

        public async Task<DocumentStatsResponse> GetStatsAsync(Guid schoolId)
        {
            var docs = _db.Documents.Where(d => d.SchoolId == schoolId && d.IsActive);
            var total = await docs.CountAsync();
            var totalDownloads = await docs.SumAsync(d => (long)d.DownloadCount);
            var byCategory = await docs.Include(d => d.Category)
                .GroupBy(d => d.Category!.Name)
                .Select(g => new { Category = g.Key, Count = g.Count() })
                .ToListAsync();
            var byAccessLevel = await docs.GroupBy(d => d.AccessLevel)
                .Select(g => new { Level = g.Key, Count = g.Count() })
                .ToListAsync();
            var byFileType = await docs.GroupBy(d => d.FileType)
                .Select(g => new { Type = g.Key, Count = g.Count() })
                .ToListAsync();
            var last7Days = await docs.CountAsync(d => d.CreatedAt >= DateTime.UtcNow.AddDays(-7));
            var last30Days = await docs.CountAsync(d => d.CreatedAt >= DateTime.UtcNow.AddDays(-30));
            var catCount = await _db.DocumentCategories.CountAsync(c => c.SchoolId == schoolId && c.IsActive);
            var totalSizeBytes = await docs.SumAsync(d => d.FileSize);

            return new DocumentStatsResponse
            {
                TotalDocuments = total,
                TotalCategories = catCount,
                TotalDownloads = totalDownloads,
                TotalSizeBytes = totalSizeBytes,
                TotalSizeFormatted = FormatFileSize(totalSizeBytes),
                AddedLast7Days = last7Days,
                AddedLast30Days = last30Days,
                ByCategory = byCategory.ToDictionary(x => x.Category ?? "Uncategorized", x => x.Count),
                ByAccessLevel = byAccessLevel.ToDictionary(x => x.Level, x => x.Count),
                ByFileType = byFileType.ToDictionary(x => x.Type, x => x.Count)
            };
        }

        // ─── Mapping ─────────────────────────────────────────────────────────────
        private static DocumentResponse MapToResponse(Document d) => new()
        {
            Id = d.Id,
            SchoolId = d.SchoolId,
            Title = d.Title,
            Description = d.Description,
            FileUrl = d.FileUrl,
            FileName = d.FileName,
            FileType = d.FileType,
            FileSize = d.FileSize,
            FileSizeFormatted = FormatFileSize(d.FileSize),
            CategoryId = d.CategoryId,
            CategoryName = d.Category?.Name,
            UploadedByStaffId = d.UploadedByStaffId,
            UploadedByStaffName = d.UploadedByStaff != null ? $"{d.UploadedByStaff.FirstName} {d.UploadedByStaff.LastName}" : null,
            AccessLevel = d.AccessLevel,
            RelatedClassId = d.RelatedClassId,
            RelatedClassName = d.RelatedClass?.Name,
            RelatedSectionId = d.RelatedSectionId,
            RelatedSectionName = d.RelatedSection?.Name,
            RelatedStudentId = d.RelatedStudentId,
            RelatedStudentName = d.RelatedStudent?.Name,
            RelatedStaffId = d.RelatedStaffId,
            RelatedStaffName = d.RelatedStaff != null ? $"{d.RelatedStaff.FirstName} {d.RelatedStaff.LastName}" : null,
            Tags = d.Tags,
            DownloadCount = d.DownloadCount,
            IsActive = d.IsActive,
            ExpiryDate = d.ExpiryDate,
            CreatedAt = d.CreatedAt,
            UpdatedAt = d.UpdatedAt
        };

        private static string FormatFileSize(long bytes)
        {
            if (bytes == 0) return "0 B";
            string[] sizes = { "B", "KB", "MB", "GB", "TB" };
            double len = bytes;
            int order = 0;
            while (len >= 1024 && order < sizes.Length - 1) { order++; len /= 1024; }
            return $"{len:0.##} {sizes[order]}";
        }
    }
}
