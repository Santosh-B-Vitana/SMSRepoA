using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;
using SmsApi.Services;
using Xunit;

namespace SmsApi.Tests.Unit.Documents
{
    public class DocumentServiceTests : IDisposable
    {
        private readonly AppDbContext _db;
        private readonly DocumentService _svc;

        private readonly Guid _schoolId  = Guid.NewGuid();
        private readonly Guid _school2Id = Guid.NewGuid();
        private readonly Guid _staffId   = Guid.NewGuid();
        private readonly Guid _staff2Id  = Guid.NewGuid();
        private readonly Guid _classId   = Guid.NewGuid();
        private readonly Guid _cat1Id    = Guid.NewGuid();
        private readonly Guid _cat2Id    = Guid.NewGuid();
        private readonly Guid _doc1Id    = Guid.NewGuid();
        private readonly Guid _doc2Id    = Guid.NewGuid();
        private readonly Guid _doc3Id    = Guid.NewGuid();

        public DocumentServiceTests()
        {
            var opts = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options;
            _db = new AppDbContext(opts);
            _svc = new DocumentService(_db);
            Seed().GetAwaiter().GetResult();
        }

        public void Dispose() => _db?.Dispose();

        private async Task Seed()
        {
            _db.Schools.AddRange(
                new School { Id = _schoolId,  Name = "School A", SchoolCode = "SCA" },
                new School { Id = _school2Id, Name = "School B", SchoolCode = "SCB" }
            );
            _db.Classes.Add(new Class { Id = _classId, Name = "Class 10", SchoolId = _schoolId });
            _db.StaffMembers.AddRange(
                new SmsApi.Models.Entities.Staff { Id = _staffId,  SchoolId = _schoolId,  FirstName = "Alice", LastName = "Smith", EmployeeId = "E001", JoiningDate = DateTime.UtcNow },
                new SmsApi.Models.Entities.Staff { Id = _staff2Id, SchoolId = _school2Id, FirstName = "Bob",   LastName = "Jones", EmployeeId = "E002", JoiningDate = DateTime.UtcNow }
            );
            _db.DocumentCategories.AddRange(
                new DocumentCategory { Id = _cat1Id, SchoolId = _schoolId,  Name = "Circulars", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                new DocumentCategory { Id = _cat2Id, SchoolId = _school2Id, Name = "Policies",  IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
            );
            _db.Documents.AddRange(
                new Document { Id = _doc1Id, SchoolId = _schoolId, CategoryId = _cat1Id, UploadedByStaffId = _staffId, Title = "Circular 1", FileName = "circ1.pdf", FileUrl = "https://s3/circ1.pdf", FileType = "PDF", FileSize = 1024, AccessLevel = "Public", DownloadCount = 5, IsActive = true, CreatedAt = DateTime.UtcNow.AddDays(-10), UpdatedAt = DateTime.UtcNow },
                new Document { Id = _doc2Id, SchoolId = _schoolId, CategoryId = _cat1Id, UploadedByStaffId = _staffId, Title = "Circular 2", FileName = "circ2.pdf", FileUrl = "https://s3/circ2.pdf", FileType = "PDF", FileSize = 2048, AccessLevel = "Staff",  DownloadCount = 2, IsActive = true, CreatedAt = DateTime.UtcNow.AddDays(-5),  UpdatedAt = DateTime.UtcNow },
                new Document { Id = _doc3Id, SchoolId = _school2Id, CategoryId = _cat2Id, UploadedByStaffId = _staff2Id, Title = "Policy 1", FileName = "pol1.pdf",  FileUrl = "https://s3/pol1.pdf",  FileType = "PDF", FileSize = 512,  AccessLevel = "Public", DownloadCount = 0, IsActive = true, CreatedAt = DateTime.UtcNow.AddDays(-1),  UpdatedAt = DateTime.UtcNow }
            );
            await _db.SaveChangesAsync();
        }

        // ══════════════════════════════════════════════════════════════════════
        // GetCategoriesAsync
        // ══════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task GetCategories_ReturnsOnlySchoolCategories()
        {
            var result = await _svc.GetCategoriesAsync(_schoolId, 1, 10);
            result.Items.Should().HaveCount(1);
            result.Items[0].Name.Should().Be("Circulars");
        }

        [Fact]
        public async Task GetCategories_DoesNotReturnOtherSchool()
        {
            var result = await _svc.GetCategoriesAsync(_schoolId, 1, 10);
            result.Items.Should().NotContain(c => c.Name == "Policies");
        }

        [Fact]
        public async Task GetCategories_PaginationNormalized_PageZeroBecomesOne()
        {
            var result = await _svc.GetCategoriesAsync(_schoolId, 0, 10);
            result.Page.Should().Be(1);
        }

        [Fact]
        public async Task GetCategories_PaginationNormalized_PageSizeOver100Becomes100()
        {
            var result = await _svc.GetCategoriesAsync(_schoolId, 1, 500);
            result.PageSize.Should().Be(100);
        }

        [Fact]
        public async Task GetCategories_PaginationNormalized_PageSizeZeroBecomesDefault()
        {
            var result = await _svc.GetCategoriesAsync(_schoolId, 1, 0);
            result.PageSize.Should().Be(10);
        }

        [Fact]
        public async Task GetCategories_ReturnsDocumentCount()
        {
            var result = await _svc.GetCategoriesAsync(_schoolId, 1, 10);
            result.Items[0].DocumentCount.Should().Be(2);
        }

        [Fact]
        public async Task GetCategories_TotalPagesCalculatedCorrectly()
        {
            var result = await _svc.GetCategoriesAsync(_schoolId, 1, 10);
            result.TotalPages.Should().Be(1);
            result.TotalCount.Should().Be(1);
        }

        // ══════════════════════════════════════════════════════════════════════
        // GetCategoryByIdAsync
        // ══════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task GetCategoryById_ReturnsCorrectCategory()
        {
            var cat = await _svc.GetCategoryByIdAsync(_cat1Id, _schoolId);
            cat.Should().NotBeNull();
            cat!.Name.Should().Be("Circulars");
        }

        [Fact]
        public async Task GetCategoryById_WrongSchool_ReturnsNull()
        {
            var cat = await _svc.GetCategoryByIdAsync(_cat1Id, _school2Id);
            cat.Should().BeNull();
        }

        [Fact]
        public async Task GetCategoryById_NonExistent_ReturnsNull()
        {
            var cat = await _svc.GetCategoryByIdAsync(Guid.NewGuid(), _schoolId);
            cat.Should().BeNull();
        }

        // ══════════════════════════════════════════════════════════════════════
        // CreateCategoryAsync
        // ══════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task CreateCategory_ValidRequest_CreatesAndReturns()
        {
            var req = new CreateDocumentCategoryRequest { Name = "Exam Papers" };
            var result = await _svc.CreateCategoryAsync(_schoolId, _staffId, req);
            result.Name.Should().Be("Exam Papers");
            result.SchoolId.Should().Be(_schoolId);
            result.IsActive.Should().BeTrue();
        }

        [Fact]
        public async Task CreateCategory_TrimsWhitespace()
        {
            var req = new CreateDocumentCategoryRequest { Name = "  Schedules  " };
            var result = await _svc.CreateCategoryAsync(_schoolId, _staffId, req);
            result.Name.Should().Be("Schedules");
        }

        [Fact]
        public async Task CreateCategory_EmptyName_ThrowsArgumentException()
        {
            var req = new CreateDocumentCategoryRequest { Name = "" };
            Func<Task> act = () => _svc.CreateCategoryAsync(_schoolId, _staffId, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*required*");
        }

        [Fact]
        public async Task CreateCategory_WhitespaceName_ThrowsArgumentException()
        {
            var req = new CreateDocumentCategoryRequest { Name = "   " };
            Func<Task> act = () => _svc.CreateCategoryAsync(_schoolId, _staffId, req);
            await act.Should().ThrowAsync<ArgumentException>();
        }

        [Fact]
        public async Task CreateCategory_TooShortName_ThrowsArgumentException()
        {
            var req = new CreateDocumentCategoryRequest { Name = "A" };
            Func<Task> act = () => _svc.CreateCategoryAsync(_schoolId, _staffId, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*at least*");
        }

        [Fact]
        public async Task CreateCategory_NameTooLong_ThrowsArgumentException()
        {
            var req = new CreateDocumentCategoryRequest { Name = new string('X', 101) };
            Func<Task> act = () => _svc.CreateCategoryAsync(_schoolId, _staffId, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*exceed*");
        }

        [Fact]
        public async Task CreateCategory_DescriptionTooLong_ThrowsArgumentException()
        {
            var req = new CreateDocumentCategoryRequest { Name = "Valid", Description = new string('D', 301) };
            Func<Task> act = () => _svc.CreateCategoryAsync(_schoolId, _staffId, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*exceed*");
        }

        [Fact]
        public async Task CreateCategory_DuplicateName_ThrowsInvalidOperationException()
        {
            var req = new CreateDocumentCategoryRequest { Name = "Circulars" };
            Func<Task> act = () => _svc.CreateCategoryAsync(_schoolId, _staffId, req);
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*already exists*");
        }

        [Fact]
        public async Task CreateCategory_CaseInsensitiveDuplicateCheck()
        {
            var req = new CreateDocumentCategoryRequest { Name = "CIRCULARS" };
            Func<Task> act = () => _svc.CreateCategoryAsync(_schoolId, _staffId, req);
            await act.Should().ThrowAsync<InvalidOperationException>();
        }

        [Fact]
        public async Task CreateCategory_SameNameDifferentSchool_Allowed()
        {
            // "Circulars" exists in school1, should be allowed in school2
            var req = new CreateDocumentCategoryRequest { Name = "Circulars" };
            var result = await _svc.CreateCategoryAsync(_school2Id, _staff2Id, req);
            result.Name.Should().Be("Circulars");
        }

        // ══════════════════════════════════════════════════════════════════════
        // UpdateCategoryAsync
        // ══════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task UpdateCategory_ValidRequest_Updates()
        {
            var req = new UpdateDocumentCategoryRequest { Name = "Circulars Updated", IsActive = true, DisplayOrder = 1 };
            var result = await _svc.UpdateCategoryAsync(_cat1Id, _schoolId, req);
            result.Name.Should().Be("Circulars Updated");
        }

        [Fact]
        public async Task UpdateCategory_NotFound_ThrowsKeyNotFoundException()
        {
            var req = new UpdateDocumentCategoryRequest { Name = "X", IsActive = true };
            Func<Task> act = () => _svc.UpdateCategoryAsync(Guid.NewGuid(), _schoolId, req);
            await act.Should().ThrowAsync<KeyNotFoundException>();
        }

        [Fact]
        public async Task UpdateCategory_WrongSchool_ThrowsKeyNotFoundException()
        {
            var req = new UpdateDocumentCategoryRequest { Name = "X", IsActive = true };
            Func<Task> act = () => _svc.UpdateCategoryAsync(_cat1Id, _school2Id, req);
            await act.Should().ThrowAsync<KeyNotFoundException>();
        }

        [Fact]
        public async Task UpdateCategory_DuplicateNameRename_ThrowsInvalidOperationException()
        {
            // Create second category in school1, then rename it to "Circulars"
            var newCat = new DocumentCategory { Id = Guid.NewGuid(), SchoolId = _schoolId, Name = "Reports", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
            _db.DocumentCategories.Add(newCat);
            await _db.SaveChangesAsync();

            var req = new UpdateDocumentCategoryRequest { Name = "Circulars", IsActive = true };
            Func<Task> act = () => _svc.UpdateCategoryAsync(newCat.Id, _schoolId, req);
            await act.Should().ThrowAsync<InvalidOperationException>();
        }

        [Fact]
        public async Task UpdateCategory_CanUpdateSameName_Succeeds()
        {
            // Updating category with same name (no rename) should succeed
            var req = new UpdateDocumentCategoryRequest { Name = "Circulars", IsActive = true };
            var result = await _svc.UpdateCategoryAsync(_cat1Id, _schoolId, req);
            result.Name.Should().Be("Circulars");
        }

        // ══════════════════════════════════════════════════════════════════════
        // DeleteCategoryAsync
        // ══════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task DeleteCategory_WithDocuments_ThrowsInvalidOperationException()
        {
            Func<Task> act = () => _svc.DeleteCategoryAsync(_cat1Id, _schoolId);
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*active documents*");
        }

        [Fact]
        public async Task DeleteCategory_Empty_DeletesAndReturnsTrue()
        {
            var emptyId = Guid.NewGuid();
            _db.DocumentCategories.Add(new DocumentCategory { Id = emptyId, SchoolId = _schoolId, Name = "Empty Cat", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
            await _db.SaveChangesAsync();

            var deleted = await _svc.DeleteCategoryAsync(emptyId, _schoolId);
            deleted.Should().BeTrue();
            var check = await _db.DocumentCategories.FindAsync(emptyId);
            check.Should().BeNull();
        }

        [Fact]
        public async Task DeleteCategory_NotFound_ReturnsFalse()
        {
            var deleted = await _svc.DeleteCategoryAsync(Guid.NewGuid(), _schoolId);
            deleted.Should().BeFalse();
        }

        [Fact]
        public async Task DeleteCategory_WrongSchool_ReturnsFalse()
        {
            var emptyId = Guid.NewGuid();
            _db.DocumentCategories.Add(new DocumentCategory { Id = emptyId, SchoolId = _schoolId, Name = "Another", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
            await _db.SaveChangesAsync();
            var deleted = await _svc.DeleteCategoryAsync(emptyId, _school2Id);
            deleted.Should().BeFalse();
        }

        // ══════════════════════════════════════════════════════════════════════
        // GetDocumentsAsync
        // ══════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task GetDocuments_ReturnsOnlySchoolDocuments()
        {
            var result = await _svc.GetDocumentsAsync(_schoolId, null, null, null, null, 1, 10);
            result.Items.Should().HaveCount(2);
            result.Items.Should().NotContain(d => d.Title == "Policy 1");
        }

        [Fact]
        public async Task GetDocuments_FilterByCategory_ReturnsCorrectDocs()
        {
            var result = await _svc.GetDocumentsAsync(_schoolId, _cat1Id, null, null, null, 1, 10);
            result.Items.Should().HaveCount(2);
        }

        [Fact]
        public async Task GetDocuments_FilterByAccessLevel_ReturnsFiltered()
        {
            var result = await _svc.GetDocumentsAsync(_schoolId, null, "Staff", null, null, 1, 10);
            result.Items.Should().HaveCount(1);
            result.Items[0].AccessLevel.Should().BeEquivalentTo("Staff");
        }

        [Fact]
        public async Task GetDocuments_FilterByAccessLevel_CaseInsensitive()
        {
            var result = await _svc.GetDocumentsAsync(_schoolId, null, "staff", null, null, 1, 10);
            result.Items.Should().HaveCount(1);
        }

        [Fact]
        public async Task GetDocuments_InvalidAccessLevel_ThrowsArgumentException()
        {
            Func<Task> act = () => _svc.GetDocumentsAsync(_schoolId, null, "INVALID_LEVEL", null, null, 1, 10);
            await act.Should().ThrowAsync<ArgumentException>();
        }

        [Fact]
        public async Task GetDocuments_FilterByRelatedClass_ReturnsFiltered()
        {
            // Add a class-related doc
            var docId = Guid.NewGuid();
            _db.Documents.Add(new Document { Id = docId, SchoolId = _schoolId, CategoryId = _cat1Id, UploadedByStaffId = _staffId, Title = "Class Doc", FileName = "cd.pdf", FileUrl = "https://s3/cd.pdf", FileType = "PDF", FileSize = 100, AccessLevel = "Class", RelatedClassId = _classId, DownloadCount = 0, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
            await _db.SaveChangesAsync();

            var result = await _svc.GetDocumentsAsync(_schoolId, null, null, _classId, null, 1, 10);
            result.Items.Should().HaveCount(1);
            result.Items[0].Title.Should().Be("Class Doc");
        }

        [Fact]
        public async Task GetDocuments_PaginationNormalized()
        {
            var result = await _svc.GetDocumentsAsync(_schoolId, null, null, null, null, 0, 200);
            result.Page.Should().Be(1);
            result.PageSize.Should().Be(100);
        }

        [Fact]
        public async Task GetDocuments_OrderedByCreatedAtDescending()
        {
            var result = await _svc.GetDocumentsAsync(_schoolId, null, null, null, null, 1, 10);
            result.Items[0].Title.Should().Be("Circular 2"); // more recent
            result.Items[1].Title.Should().Be("Circular 1");
        }

        // ══════════════════════════════════════════════════════════════════════
        // GetDocumentByIdAsync
        // ══════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task GetDocumentById_ReturnsCorrect()
        {
            var doc = await _svc.GetDocumentByIdAsync(_doc1Id, _schoolId);
            doc.Should().NotBeNull();
            doc!.Title.Should().Be("Circular 1");
        }

        [Fact]
        public async Task GetDocumentById_WrongSchool_ReturnsNull()
        {
            var doc = await _svc.GetDocumentByIdAsync(_doc1Id, _school2Id);
            doc.Should().BeNull();
        }

        [Fact]
        public async Task GetDocumentById_NonExistent_ReturnsNull()
        {
            var doc = await _svc.GetDocumentByIdAsync(Guid.NewGuid(), _schoolId);
            doc.Should().BeNull();
        }

        [Fact]
        public async Task GetDocumentById_SoftDeleted_ReturnsNull()
        {
            // Soft-delete doc1
            var d = await _db.Documents.FindAsync(_doc1Id);
            d!.IsActive = false;
            await _db.SaveChangesAsync();

            var result = await _svc.GetDocumentByIdAsync(_doc1Id, _schoolId);
            result.Should().BeNull();
        }

        // ══════════════════════════════════════════════════════════════════════
        // CreateDocumentAsync
        // ══════════════════════════════════════════════════════════════════════

        private CreateDocumentRequest ValidDocReq(string title = "New Doc") => new()
        {
            Title = title,
            FileUrl = "https://s3/new.pdf",
            FileName = "new.pdf",
            FileType = "PDF",
            FileSize = 5000,
            CategoryId = _cat1Id,
            AccessLevel = "Public"
        };

        [Fact]
        public async Task CreateDocument_ValidRequest_CreatesAndReturns()
        {
            var req = ValidDocReq();
            var result = await _svc.CreateDocumentAsync(_schoolId, _staffId, req);
            result.Title.Should().Be("New Doc");
            result.SchoolId.Should().Be(_schoolId);
            result.DownloadCount.Should().Be(0);
        }

        [Fact]
        public async Task CreateDocument_TrimsTitle()
        {
            var req = ValidDocReq("  Trimmed  ");
            var result = await _svc.CreateDocumentAsync(_schoolId, _staffId, req);
            result.Title.Should().Be("Trimmed");
        }

        [Fact]
        public async Task CreateDocument_FileTypeNormalisedToUpperCase()
        {
            var req = ValidDocReq("Doc Type Test");
            req.FileType = "pdf";
            var result = await _svc.CreateDocumentAsync(_schoolId, _staffId, req);
            result.FileType.Should().Be("PDF");
        }

        [Fact]
        public async Task CreateDocument_EmptyTitle_ThrowsArgumentException()
        {
            var req = ValidDocReq("");
            Func<Task> act = () => _svc.CreateDocumentAsync(_schoolId, _staffId, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*required*");
        }

        [Fact]
        public async Task CreateDocument_TitleTooShort_ThrowsArgumentException()
        {
            var req = ValidDocReq("X");
            Func<Task> act = () => _svc.CreateDocumentAsync(_schoolId, _staffId, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*at least*");
        }

        [Fact]
        public async Task CreateDocument_TitleTooLong_ThrowsArgumentException()
        {
            var req = ValidDocReq(new string('T', 201));
            Func<Task> act = () => _svc.CreateDocumentAsync(_schoolId, _staffId, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*exceed*");
        }

        [Fact]
        public async Task CreateDocument_EmptyFileUrl_ThrowsArgumentException()
        {
            var req = ValidDocReq();
            req.FileUrl = "";
            Func<Task> act = () => _svc.CreateDocumentAsync(_schoolId, _staffId, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*File URL*required*");
        }

        [Fact]
        public async Task CreateDocument_EmptyFileName_ThrowsArgumentException()
        {
            var req = ValidDocReq();
            req.FileName = "";
            Func<Task> act = () => _svc.CreateDocumentAsync(_schoolId, _staffId, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*File name*required*");
        }

        [Fact]
        public async Task CreateDocument_EmptyFileType_ThrowsArgumentException()
        {
            var req = ValidDocReq();
            req.FileType = "";
            Func<Task> act = () => _svc.CreateDocumentAsync(_schoolId, _staffId, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*File type*required*");
        }

        [Fact]
        public async Task CreateDocument_FileSizeZero_ThrowsArgumentException()
        {
            var req = ValidDocReq();
            req.FileSize = 0;
            Func<Task> act = () => _svc.CreateDocumentAsync(_schoolId, _staffId, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*greater than zero*");
        }

        [Fact]
        public async Task CreateDocument_FileSizeNegative_ThrowsArgumentException()
        {
            var req = ValidDocReq();
            req.FileSize = -1;
            Func<Task> act = () => _svc.CreateDocumentAsync(_schoolId, _staffId, req);
            await act.Should().ThrowAsync<ArgumentException>();
        }

        [Fact]
        public async Task CreateDocument_FileSizeOver100MB_ThrowsArgumentException()
        {
            var req = ValidDocReq();
            req.FileSize = 104_857_601;
            Func<Task> act = () => _svc.CreateDocumentAsync(_schoolId, _staffId, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*100 MB*");
        }

        [Fact]
        public async Task CreateDocument_FileSizeExactly100MB_Succeeds()
        {
            var req = ValidDocReq("Exact 100MB");
            req.FileSize = 104_857_600;
            var result = await _svc.CreateDocumentAsync(_schoolId, _staffId, req);
            result.FileSize.Should().Be(104_857_600);
        }

        [Fact]
        public async Task CreateDocument_InvalidAccessLevel_ThrowsArgumentException()
        {
            var req = ValidDocReq();
            req.AccessLevel = "Restricted";
            Func<Task> act = () => _svc.CreateDocumentAsync(_schoolId, _staffId, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*Invalid access level*");
        }

        [Fact]
        public async Task CreateDocument_AllValidAccessLevels_Succeed()
        {
            var levels = new[] { "Public", "Private", "Class", "Section", "Staff", "Student" };
            foreach (var level in levels)
            {
                var req = ValidDocReq($"Doc {level}");
                req.AccessLevel = level;
                var result = await _svc.CreateDocumentAsync(_schoolId, _staffId, req);
                result.AccessLevel.Should().Be(level);
            }
        }

        [Fact]
        public async Task CreateDocument_DescriptionTooLong_ThrowsArgumentException()
        {
            var req = ValidDocReq();
            req.Description = new string('D', 501);
            Func<Task> act = () => _svc.CreateDocumentAsync(_schoolId, _staffId, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*exceed*");
        }

        [Fact]
        public async Task CreateDocument_TagsTooLong_ThrowsArgumentException()
        {
            var req = ValidDocReq();
            req.Tags = new string('T', 201);
            Func<Task> act = () => _svc.CreateDocumentAsync(_schoolId, _staffId, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*Tags*exceed*");
        }

        [Fact]
        public async Task CreateDocument_CategoryNotFound_ThrowsKeyNotFoundException()
        {
            var req = ValidDocReq();
            req.CategoryId = Guid.NewGuid();
            Func<Task> act = () => _svc.CreateDocumentAsync(_schoolId, _staffId, req);
            await act.Should().ThrowAsync<KeyNotFoundException>().WithMessage("*category*");
        }

        [Fact]
        public async Task CreateDocument_WrongSchoolCategory_ThrowsKeyNotFoundException()
        {
            var req = ValidDocReq();
            req.CategoryId = _cat2Id; // belongs to school2
            Func<Task> act = () => _svc.CreateDocumentAsync(_schoolId, _staffId, req);
            await act.Should().ThrowAsync<KeyNotFoundException>();
        }

        [Fact]
        public async Task CreateDocument_UploaderNotFound_ThrowsKeyNotFoundException()
        {
            var req = ValidDocReq();
            Func<Task> act = () => _svc.CreateDocumentAsync(_schoolId, Guid.NewGuid(), req);
            await act.Should().ThrowAsync<KeyNotFoundException>().WithMessage("*staff*");
        }

        [Fact]
        public async Task CreateDocument_DuplicateTitleInCategory_ThrowsInvalidOperationException()
        {
            var req = ValidDocReq("Circular 1"); // already exists in cat1
            Func<Task> act = () => _svc.CreateDocumentAsync(_schoolId, _staffId, req);
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*already exists*");
        }

        [Fact]
        public async Task CreateDocument_SameTitleDifferentCategory_Allowed()
        {
            // Create another category for school1
            var cat3 = new DocumentCategory { Id = Guid.NewGuid(), SchoolId = _schoolId, Name = "Reports", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
            _db.DocumentCategories.Add(cat3);
            await _db.SaveChangesAsync();

            var req = ValidDocReq("Circular 1"); // same title but different category
            req.CategoryId = cat3.Id;
            var result = await _svc.CreateDocumentAsync(_schoolId, _staffId, req);
            result.Title.Should().Be("Circular 1");
        }

        [Fact]
        public async Task CreateDocument_ExpiryDateInPast_ThrowsArgumentException()
        {
            var req = ValidDocReq();
            req.ExpiryDate = DateTime.UtcNow.AddDays(-1);
            Func<Task> act = () => _svc.CreateDocumentAsync(_schoolId, _staffId, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*future*");
        }

        [Fact]
        public async Task CreateDocument_ExpiryDateInFuture_Succeeds()
        {
            var req = ValidDocReq("Future Expiry");
            req.ExpiryDate = DateTime.UtcNow.AddDays(30);
            var result = await _svc.CreateDocumentAsync(_schoolId, _staffId, req);
            result.ExpiryDate.Should().NotBeNull();
        }

        [Fact]
        public async Task CreateDocument_RelatedClassNotFound_ThrowsKeyNotFoundException()
        {
            var req = ValidDocReq();
            req.RelatedClassId = Guid.NewGuid();
            Func<Task> act = () => _svc.CreateDocumentAsync(_schoolId, _staffId, req);
            await act.Should().ThrowAsync<KeyNotFoundException>().WithMessage("*class*");
        }

        [Fact]
        public async Task CreateDocument_WithValidRelatedClass_Succeeds()
        {
            var req = ValidDocReq("Class-linked Doc");
            req.RelatedClassId = _classId;
            var result = await _svc.CreateDocumentAsync(_schoolId, _staffId, req);
            result.RelatedClassId.Should().Be(_classId);
        }

        // ══════════════════════════════════════════════════════════════════════
        // UpdateDocumentAsync
        // ══════════════════════════════════════════════════════════════════════

        private UpdateDocumentRequest ValidUpdateReq(string title = "Updated Title") => new()
        {
            Title = title,
            CategoryId = _cat1Id,
            AccessLevel = "Public",
            IsActive = true
        };

        [Fact]
        public async Task UpdateDocument_ValidRequest_Updates()
        {
            var req = ValidUpdateReq("Updated Circular");
            var result = await _svc.UpdateDocumentAsync(_doc1Id, _schoolId, req);
            result.Title.Should().Be("Updated Circular");
        }

        [Fact]
        public async Task UpdateDocument_NotFound_ThrowsKeyNotFoundException()
        {
            var req = ValidUpdateReq();
            Func<Task> act = () => _svc.UpdateDocumentAsync(Guid.NewGuid(), _schoolId, req);
            await act.Should().ThrowAsync<KeyNotFoundException>();
        }

        [Fact]
        public async Task UpdateDocument_WrongSchool_ThrowsKeyNotFoundException()
        {
            var req = ValidUpdateReq();
            Func<Task> act = () => _svc.UpdateDocumentAsync(_doc1Id, _school2Id, req);
            await act.Should().ThrowAsync<KeyNotFoundException>();
        }

        [Fact]
        public async Task UpdateDocument_InvalidAccessLevel_ThrowsArgumentException()
        {
            var req = ValidUpdateReq();
            req.AccessLevel = "BadLevel";
            Func<Task> act = () => _svc.UpdateDocumentAsync(_doc1Id, _schoolId, req);
            await act.Should().ThrowAsync<ArgumentException>();
        }

        [Fact]
        public async Task UpdateDocument_CategoryNotFound_ThrowsKeyNotFoundException()
        {
            var req = ValidUpdateReq();
            req.CategoryId = Guid.NewGuid();
            Func<Task> act = () => _svc.UpdateDocumentAsync(_doc1Id, _schoolId, req);
            await act.Should().ThrowAsync<KeyNotFoundException>().WithMessage("*category*");
        }

        [Fact]
        public async Task UpdateDocument_DuplicateTitleInCategory_ThrowsInvalidOperationException()
        {
            var req = ValidUpdateReq("Circular 2"); // already exists in cat1
            Func<Task> act = () => _svc.UpdateDocumentAsync(_doc1Id, _schoolId, req);
            await act.Should().ThrowAsync<InvalidOperationException>();
        }

        [Fact]
        public async Task UpdateDocument_ExpiryDateInPast_ThrowsArgumentException()
        {
            var req = ValidUpdateReq();
            req.ExpiryDate = DateTime.UtcNow.AddDays(-1);
            Func<Task> act = () => _svc.UpdateDocumentAsync(_doc1Id, _schoolId, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*future*");
        }

        [Fact]
        public async Task UpdateDocument_CanDeactivate()
        {
            var req = ValidUpdateReq("Circular 1");
            req.IsActive = false;
            var result = await _svc.UpdateDocumentAsync(_doc1Id, _schoolId, req);
            result.IsActive.Should().BeFalse();
        }

        // ══════════════════════════════════════════════════════════════════════
        // DeleteDocumentAsync
        // ══════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task DeleteDocument_SoftDeletesRecord()
        {
            var deleted = await _svc.DeleteDocumentAsync(_doc1Id, _schoolId);
            deleted.Should().BeTrue();
            var doc = await _db.Documents.FindAsync(_doc1Id);
            doc!.IsActive.Should().BeFalse();
        }

        [Fact]
        public async Task DeleteDocument_NotFound_ReturnsFalse()
        {
            var deleted = await _svc.DeleteDocumentAsync(Guid.NewGuid(), _schoolId);
            deleted.Should().BeFalse();
        }

        [Fact]
        public async Task DeleteDocument_WrongSchool_ReturnsFalse()
        {
            var deleted = await _svc.DeleteDocumentAsync(_doc1Id, _school2Id);
            deleted.Should().BeFalse();
        }

        [Fact]
        public async Task DeleteDocument_AfterSoftDelete_NotInGetList()
        {
            await _svc.DeleteDocumentAsync(_doc1Id, _schoolId);
            var list = await _svc.GetDocumentsAsync(_schoolId, null, null, null, null, 1, 10);
            list.Items.Should().NotContain(d => d.Id == _doc1Id);
        }

        // ══════════════════════════════════════════════════════════════════════
        // IncrementDownloadCountAsync
        // ══════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task IncrementDownload_IncrementsCount()
        {
            var ok = await _svc.IncrementDownloadCountAsync(_doc1Id, _schoolId);
            ok.Should().BeTrue();
            var doc = await _db.Documents.FindAsync(_doc1Id);
            doc!.DownloadCount.Should().Be(6); // was 5
        }

        [Fact]
        public async Task IncrementDownload_NotFound_ReturnsFalse()
        {
            var ok = await _svc.IncrementDownloadCountAsync(Guid.NewGuid(), _schoolId);
            ok.Should().BeFalse();
        }

        [Fact]
        public async Task IncrementDownload_WrongSchool_ReturnsFalse()
        {
            var ok = await _svc.IncrementDownloadCountAsync(_doc1Id, _school2Id);
            ok.Should().BeFalse();
        }

        [Fact]
        public async Task IncrementDownload_MultipleTimes_AccumulatesCount()
        {
            for (int i = 0; i < 3; i++)
                await _svc.IncrementDownloadCountAsync(_doc2Id, _schoolId);
            var doc = await _db.Documents.FindAsync(_doc2Id);
            doc!.DownloadCount.Should().Be(5); // was 2 + 3
        }

        // ══════════════════════════════════════════════════════════════════════
        // SearchDocumentsAsync
        // ══════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task SearchDocuments_EmptyTerm_ThrowsArgumentException()
        {
            Func<Task> act = () => _svc.SearchDocumentsAsync(_schoolId, "");
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*required*");
        }

        [Fact]
        public async Task SearchDocuments_WhitespaceTerm_ThrowsArgumentException()
        {
            Func<Task> act = () => _svc.SearchDocumentsAsync(_schoolId, "   ");
            await act.Should().ThrowAsync<ArgumentException>();
        }

        [Fact]
        public async Task SearchDocuments_MatchesTitle()
        {
            var results = await _svc.SearchDocumentsAsync(_schoolId, "Circular");
            results.Should().HaveCount(2);
        }

        [Fact]
        public async Task SearchDocuments_CaseInsensitive()
        {
            var results = await _svc.SearchDocumentsAsync(_schoolId, "circular");
            results.Should().HaveCount(2);
        }

        [Fact]
        public async Task SearchDocuments_NoMatch_ReturnsEmpty()
        {
            var results = await _svc.SearchDocumentsAsync(_schoolId, "ZZZNOMATCH");
            results.Should().BeEmpty();
        }

        [Fact]
        public async Task SearchDocuments_SchoolIsolation_DoesNotReturnOtherSchool()
        {
            var results = await _svc.SearchDocumentsAsync(_schoolId, "Policy");
            results.Should().BeEmpty();
        }

        [Fact]
        public async Task SearchDocuments_MatchesTags()
        {
            // Add doc with tags
            _db.Documents.Add(new Document { Id = Guid.NewGuid(), SchoolId = _schoolId, CategoryId = _cat1Id, UploadedByStaffId = _staffId, Title = "Tagged Doc", FileName = "tag.pdf", FileUrl = "https://s3/tag.pdf", FileType = "PDF", FileSize = 100, AccessLevel = "Public", Tags = "important,urgent", DownloadCount = 0, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
            await _db.SaveChangesAsync();
            var results = await _svc.SearchDocumentsAsync(_schoolId, "urgent");
            results.Should().HaveCount(1);
            results[0].Title.Should().Be("Tagged Doc");
        }

        // ══════════════════════════════════════════════════════════════════════
        // GetStatsAsync
        // ══════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task GetStats_TotalDocumentsCorrect()
        {
            var stats = await _svc.GetStatsAsync(_schoolId);
            stats.TotalDocuments.Should().Be(2);
        }

        [Fact]
        public async Task GetStats_TotalDownloadsCorrect()
        {
            var stats = await _svc.GetStatsAsync(_schoolId);
            stats.TotalDownloads.Should().Be(7); // 5 + 2
        }

        [Fact]
        public async Task GetStats_TotalCategoriesCorrect()
        {
            var stats = await _svc.GetStatsAsync(_schoolId);
            stats.TotalCategories.Should().Be(1);
        }

        [Fact]
        public async Task GetStats_ByAccessLevel_Correct()
        {
            var stats = await _svc.GetStatsAsync(_schoolId);
            stats.ByAccessLevel.Should().ContainKey("Public");
            stats.ByAccessLevel["Public"].Should().Be(1);
            stats.ByAccessLevel.Should().ContainKey("Staff");
            stats.ByAccessLevel["Staff"].Should().Be(1);
        }

        [Fact]
        public async Task GetStats_ByFileType_Correct()
        {
            var stats = await _svc.GetStatsAsync(_schoolId);
            stats.ByFileType.Should().ContainKey("PDF");
            stats.ByFileType["PDF"].Should().Be(2);
        }

        [Fact]
        public async Task GetStats_SchoolIsolation_DoesNotCountOtherSchool()
        {
            var stats = await _svc.GetStatsAsync(_schoolId);
            stats.TotalDocuments.Should().Be(2); // not 3
        }

        [Fact]
        public async Task GetStats_EmptySchool_ReturnsZeros()
        {
            var emptySchool = Guid.NewGuid();
            _db.Schools.Add(new School { Id = emptySchool, Name = "Empty", SchoolCode = "EMP" });
            await _db.SaveChangesAsync();

            var stats = await _svc.GetStatsAsync(emptySchool);
            stats.TotalDocuments.Should().Be(0);
            stats.TotalDownloads.Should().Be(0);
            stats.TotalSizeBytes.Should().Be(0);
        }

        [Fact]
        public async Task GetStats_AddedLast7Days_Correct()
        {
            var stats = await _svc.GetStatsAsync(_schoolId);
            // doc1 is -10 days, doc2 is -5 days; only doc2 within last 7 days
            stats.AddedLast7Days.Should().Be(1);
        }

        [Fact]
        public async Task GetStats_AddedLast30Days_Correct()
        {
            var stats = await _svc.GetStatsAsync(_schoolId);
            stats.AddedLast30Days.Should().Be(2);
        }

        [Fact]
        public async Task GetStats_TotalSizeFormatted_NotEmpty()
        {
            var stats = await _svc.GetStatsAsync(_schoolId);
            stats.TotalSizeFormatted.Should().NotBeNullOrWhiteSpace();
        }

        // ══════════════════════════════════════════════════════════════════════
        // Integration / Edge Cases
        // ══════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task Integration_CreateThenGet_Works()
        {
            var req = ValidDocReq("Integration Doc");
            var created = await _svc.CreateDocumentAsync(_schoolId, _staffId, req);
            var fetched = await _svc.GetDocumentByIdAsync(created.Id, _schoolId);
            fetched.Should().NotBeNull();
            fetched!.Title.Should().Be("Integration Doc");
        }

        [Fact]
        public async Task Integration_CreateThenUpdateThenDelete_Works()
        {
            var req = ValidDocReq("Lifecycle Doc");
            var created = await _svc.CreateDocumentAsync(_schoolId, _staffId, req);

            var updateReq = new UpdateDocumentRequest { Title = "Updated Lifecycle", CategoryId = _cat1Id, AccessLevel = "Private", IsActive = true };
            var updated = await _svc.UpdateDocumentAsync(created.Id, _schoolId, updateReq);
            updated.Title.Should().Be("Updated Lifecycle");
            updated.AccessLevel.Should().Be("Private");

            var deleted = await _svc.DeleteDocumentAsync(created.Id, _schoolId);
            deleted.Should().BeTrue();

            var notFound = await _svc.GetDocumentByIdAsync(created.Id, _schoolId);
            notFound.Should().BeNull();
        }

        [Fact]
        public async Task Integration_DeleteThenCreate_SameTitleAllowed()
        {
            await _svc.DeleteDocumentAsync(_doc1Id, _schoolId);
            // After soft-delete, creating with same title should succeed
            var req = ValidDocReq("Circular 1");
            // Note: soft-deleted docs still in DB; duplicate check looks at IsActive = true
            var result = await _svc.CreateDocumentAsync(_schoolId, _staffId, req);
            result.Title.Should().Be("Circular 1");
        }

        [Fact]
        public async Task Integration_SearchAfterCreate()
        {
            var req = ValidDocReq("Unique Searchable Document");
            await _svc.CreateDocumentAsync(_schoolId, _staffId, req);
            var results = await _svc.SearchDocumentsAsync(_schoolId, "Searchable");
            results.Should().HaveCount(1);
            results[0].Title.Should().Be("Unique Searchable Document");
        }
    }
}
