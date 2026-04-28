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
using Xunit;

namespace SmsApi.Tests.Unit.Certificates
{
    public class CertificateServiceTests : IDisposable
    {
        private readonly AppDbContext _db;
        private readonly CertificateService _svc;

        public CertificateServiceTests()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options;
            _db = new AppDbContext(options);
            _svc = new CertificateService(_db);
        }

        public void Dispose() => _db.Dispose();

        // Helper methods for seeding
        private CertificateTemplate SeedCertificateTemplate(Guid schoolId, string name, string type, bool isActive = true, bool isDefault = false)
        {
            var t = new CertificateTemplate
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                Name = name,
                CertificateType = type,
                Template = "<html>template</html>",
                Orientation = "Portrait",
                PageSize = "A4",
                IsActive = isActive,
                IsDefault = isDefault,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _db.CertificateTemplates.Add(t);
            _db.SaveChanges();
            return t;
        }

        private Student SeedStudent(Guid schoolId, string name)
        {
            var s = new Student
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                Name = name,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _db.Students.Add(s);
            _db.SaveChanges();
            return s;
        }

        private SmsApi.Models.Entities.Staff SeedStaff(Guid schoolId, string firstName, string lastName)
        {
            var staffEntity = new SmsApi.Models.Entities.Staff
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                FirstName = firstName,
                LastName = lastName,
                EmployeeId = "E001",
                Email = "staff@example.com",
                Phone = "1234567890",
                DateOfBirth = DateTime.UtcNow.AddYears(-30),
                Gender = "M",
                Address = "Test Address",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _db.StaffMembers.Add(staffEntity);
            _db.SaveChanges();
            return staffEntity;
        }

        private Certificate SeedCertificate(Guid schoolId, string certNumber, string type, Guid studentId, Guid templateId, Guid staffId, string status = "Active")
        {
            var c = new Certificate
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                CertificateNumber = certNumber,
                CertificateType = type,
                Title = "Test Title",
                StudentId = studentId,
                TemplateId = templateId,
                IssuedByStaffId = staffId,
                Status = status,
                IssueDate = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _db.Certificates.Add(c);
            _db.SaveChanges();
            return c;
        }

        private IDCardTemplate SeedIDCardTemplate(Guid schoolId, string name, string cardType)
        {
            var t = new IDCardTemplate
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                Name = name,
                CardType = cardType,
                FrontTemplate = "<html>front</html>",
                BackTemplate = "<html>back</html>",
                CardSize = "CR80",
                IsActive = true,
                IsDefault = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _db.IDCardTemplates.Add(t);
            _db.SaveChanges();
            return t;
        }

        private IDCard SeedIDCard(Guid schoolId, string cardNumber, string cardType, Guid holderId, string holderType, Guid templateId)
        {
            var c = new IDCard
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                CardNumber = cardNumber,
                CardType = cardType,
                HolderId = holderId,
                HolderType = holderType,
                TemplateId = templateId,
                Status = "Active",
                IssueDate = DateTime.UtcNow,
                ExpiryDate = DateTime.UtcNow.AddYears(1),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _db.IDCards.Add(c);
            _db.SaveChanges();
            return c;
        }

        // ═══════════════════════════════════════════════════
        // Certificate Template Tests
        // ═══════════════════════════════════════════════════

        [Fact]
        public async Task CreateCertificateTemplateAsync_Success()
        {
            var schoolId = Guid.NewGuid();
            var req = new CreateCertificateTemplateRequest
            {
                SchoolId = schoolId,
                Name = "Bonafide Template",
                CertificateType = "BonafideCertificate",
                Template = "<html>template</html>",
                Orientation = "Portrait",
                PageSize = "A4"
            };
            var result = await _svc.CreateCertificateTemplateAsync(req);
            result.Should().NotBeNull();
            result.Name.Should().Be("Bonafide Template");
            result.CertificateType.Should().Be("BonafideCertificate");
        }

        [Fact]
        public async Task CreateCertificateTemplateAsync_NameEmpty_ThrowsArgumentException()
        {
            var schoolId = Guid.NewGuid();
            var req = new CreateCertificateTemplateRequest
            {
                SchoolId = schoolId,
                Name = "",
                CertificateType = "BonafideCertificate",
                Template = "<html>template</html>"
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _svc.CreateCertificateTemplateAsync(req));
        }

        [Fact]
        public async Task CreateCertificateTemplateAsync_NameTooShort_ThrowsArgumentException()
        {
            var schoolId = Guid.NewGuid();
            var req = new CreateCertificateTemplateRequest
            {
                SchoolId = schoolId,
                Name = "ab",
                CertificateType = "BonafideCertificate",
                Template = "<html>template</html>"
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _svc.CreateCertificateTemplateAsync(req));
        }

        [Fact]
        public async Task CreateCertificateTemplateAsync_NameTooLong_ThrowsArgumentException()
        {
            var schoolId = Guid.NewGuid();
            var req = new CreateCertificateTemplateRequest
            {
                SchoolId = schoolId,
                Name = new string('a', 101),
                CertificateType = "BonafideCertificate",
                Template = "<html>template</html>"
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _svc.CreateCertificateTemplateAsync(req));
        }

        [Fact]
        public async Task CreateCertificateTemplateAsync_InvalidCertificateType_ThrowsArgumentException()
        {
            var schoolId = Guid.NewGuid();
            var req = new CreateCertificateTemplateRequest
            {
                SchoolId = schoolId,
                Name = "Test Template",
                CertificateType = "InvalidType",
                Template = "<html>template</html>"
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _svc.CreateCertificateTemplateAsync(req));
        }

        [Fact]
        public async Task CreateCertificateTemplateAsync_InvalidOrientation_ThrowsArgumentException()
        {
            var schoolId = Guid.NewGuid();
            var req = new CreateCertificateTemplateRequest
            {
                SchoolId = schoolId,
                Name = "Test Template",
                CertificateType = "BonafideCertificate",
                Template = "<html>template</html>",
                Orientation = "Diagonal"
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _svc.CreateCertificateTemplateAsync(req));
        }

        [Fact]
        public async Task CreateCertificateTemplateAsync_InvalidPageSize_ThrowsArgumentException()
        {
            var schoolId = Guid.NewGuid();
            var req = new CreateCertificateTemplateRequest
            {
                SchoolId = schoolId,
                Name = "Test Template",
                CertificateType = "BonafideCertificate",
                Template = "<html>template</html>",
                PageSize = "Invalid"
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _svc.CreateCertificateTemplateAsync(req));
        }

        [Fact]
        public async Task CreateCertificateTemplateAsync_TemplateEmpty_ThrowsArgumentException()
        {
            var schoolId = Guid.NewGuid();
            var req = new CreateCertificateTemplateRequest
            {
                SchoolId = schoolId,
                Name = "Test Template",
                CertificateType = "BonafideCertificate",
                Template = ""
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _svc.CreateCertificateTemplateAsync(req));
        }

        [Fact]
        public async Task CreateCertificateTemplateAsync_DuplicateNamePerSchool_ThrowsInvalidOperationException()
        {
            var schoolId = Guid.NewGuid();
            SeedCertificateTemplate(schoolId, "Duplicate", "BonafideCertificate");
            var req = new CreateCertificateTemplateRequest
            {
                SchoolId = schoolId,
                Name = "Duplicate",
                CertificateType = "BonafideCertificate",
                Template = "<html>template</html>"
            };
            await Assert.ThrowsAsync<InvalidOperationException>(() => _svc.CreateCertificateTemplateAsync(req));
        }

        [Fact]
        public async Task GetCertificateTemplatesAsync_Success()
        {
            var schoolId = Guid.NewGuid();
            SeedCertificateTemplate(schoolId, "Template 1", "BonafideCertificate");
            SeedCertificateTemplate(schoolId, "Template 2", "TransferCertificate");
            var result = await _svc.GetCertificateTemplatesAsync(schoolId);
            result.Items.Should().HaveCount(2);
        }

        [Fact]
        public async Task GetCertificateTemplatesAsync_PaginationNormalization_PageLessThan1()
        {
            var schoolId = Guid.NewGuid();
            for (int i = 0; i < 5; i++)
                SeedCertificateTemplate(schoolId, $"Template {i}", "BonafideCertificate");
            var result = await _svc.GetCertificateTemplatesAsync(schoolId, page: 0, pageSize: 10);
            result.Page.Should().Be(1);
        }

        [Fact]
        public async Task GetCertificateTemplatesAsync_PaginationNormalization_PageSizeGreaterThan100()
        {
            var schoolId = Guid.NewGuid();
            for (int i = 0; i < 5; i++)
                SeedCertificateTemplate(schoolId, $"Template {i}", "BonafideCertificate");
            var result = await _svc.GetCertificateTemplatesAsync(schoolId, page: 1, pageSize: 150);
            result.PageSize.Should().Be(100);
        }

        [Fact]
        public async Task GetCertificateTemplatesAsync_FilterByType()
        {
            var schoolId = Guid.NewGuid();
            SeedCertificateTemplate(schoolId, "Template 1", "BonafideCertificate");
            SeedCertificateTemplate(schoolId, "Template 2", "TransferCertificate");
            var result = await _svc.GetCertificateTemplatesAsync(schoolId, certificateType: "BonafideCertificate");
            result.Items.Should().HaveCount(1);
        }

        [Fact]
        public async Task GetCertificateTemplatesAsync_FilterByIsActive()
        {
            var schoolId = Guid.NewGuid();
            SeedCertificateTemplate(schoolId, "Active", "BonafideCertificate", isActive: true);
            SeedCertificateTemplate(schoolId, "Inactive", "TransferCertificate", isActive: false);
            var result = await _svc.GetCertificateTemplatesAsync(schoolId, isActive: true);
            result.Items.Should().HaveCount(1);
        }

        [Fact]
        public async Task GetCertificateTemplatesAsync_SchoolIsolation()
        {
            var school1 = Guid.NewGuid();
            var school2 = Guid.NewGuid();
            SeedCertificateTemplate(school1, "Template 1", "BonafideCertificate");
            SeedCertificateTemplate(school2, "Template 2", "TransferCertificate");
            var result = await _svc.GetCertificateTemplatesAsync(school1);
            result.Items.Should().HaveCount(1);
            result.Items.First().Name.Should().Be("Template 1");
        }

        [Fact]
        public async Task GetCertificateTemplateByIdAsync_NotFound_ReturnsNull()
        {
            var schoolId = Guid.NewGuid();
            var result = await _svc.GetCertificateTemplateByIdAsync(Guid.NewGuid(), schoolId);
            result.Should().BeNull();
        }

        [Fact]
        public async Task UpdateCertificateTemplateAsync_PartialUpdate()
        {
            var schoolId = Guid.NewGuid();
            var template = SeedCertificateTemplate(schoolId, "Original", "BonafideCertificate");
            var req = new UpdateCertificateTemplateRequest { Name = "Updated" };
            var result = await _svc.UpdateCertificateTemplateAsync(template.Id, req, schoolId);
            result.Name.Should().Be("Updated");
            result.CertificateType.Should().Be("BonafideCertificate");
        }

        [Fact]
        public async Task UpdateCertificateTemplateAsync_NameBlank_ThrowsArgumentException()
        {
            var schoolId = Guid.NewGuid();
            var template = SeedCertificateTemplate(schoolId, "Original", "BonafideCertificate");
            var req = new UpdateCertificateTemplateRequest { Name = "" };
            await Assert.ThrowsAsync<ArgumentException>(() => _svc.UpdateCertificateTemplateAsync(template.Id, req, schoolId));
        }

        [Fact]
        public async Task UpdateCertificateTemplateAsync_NotFound_ThrowsKeyNotFoundException()
        {
            var schoolId = Guid.NewGuid();
            var req = new UpdateCertificateTemplateRequest { Name = "Updated" };
            await Assert.ThrowsAsync<KeyNotFoundException>(() => _svc.UpdateCertificateTemplateAsync(Guid.NewGuid(), req, schoolId));
        }

        [Fact]
        public async Task DeleteCertificateTemplateAsync_Success()
        {
            var schoolId = Guid.NewGuid();
            var template = SeedCertificateTemplate(schoolId, "Template", "BonafideCertificate");
            var result = await _svc.DeleteCertificateTemplateAsync(template.Id, schoolId);
            result.Should().BeTrue();
            var exists = await _db.CertificateTemplates.AnyAsync(t => t.Id == template.Id);
            exists.Should().BeFalse();
        }

        [Fact]
        public async Task DeleteCertificateTemplateAsync_NotFound_ReturnsFalse()
        {
            var schoolId = Guid.NewGuid();
            var result = await _svc.DeleteCertificateTemplateAsync(Guid.NewGuid(), schoolId);
            result.Should().BeFalse();
        }

        [Fact]
        public async Task DeleteCertificateTemplateAsync_HasCertificates_ThrowsInvalidOperationException()
        {
            var schoolId = Guid.NewGuid();
            var template = SeedCertificateTemplate(schoolId, "Template", "BonafideCertificate");
            var student = SeedStudent(schoolId, "Student");
            var staff = SeedStaff(schoolId, "Staff", "Member");
            SeedCertificate(schoolId, "CERT001", "BonafideCertificate", student.Id, template.Id, staff.Id);
            await Assert.ThrowsAsync<InvalidOperationException>(() => _svc.DeleteCertificateTemplateAsync(template.Id, schoolId));
        }

        // ═══════════════════════════════════════════════════
        // Certificate Tests
        // ═══════════════════════════════════════════════════

        [Fact]
        public async Task CreateCertificateAsync_Success()
        {
            var schoolId = Guid.NewGuid();
            var template = SeedCertificateTemplate(schoolId, "Template", "BonafideCertificate");
            var student = SeedStudent(schoolId, "Student");
            var staff = SeedStaff(schoolId, "Staff", "Member");
            var req = new CreateCertificateRequest
            {
                SchoolId = schoolId,
                CertificateNumber = "CERT001",
                CertificateType = "BonafideCertificate",
                Title = "Bonafide Certificate",
                StudentId = student.Id,
                TemplateId = template.Id,
                IssuedByStaffId = staff.Id,
                IssueDate = DateTime.UtcNow
            };
            var result = await _svc.CreateCertificateAsync(req);
            result.Should().NotBeNull();
            result.CertificateNumber.Should().Be("CERT001");
        }

        [Fact]
        public async Task CreateCertificateAsync_CertNumberEmpty_ThrowsArgumentException()
        {
            var schoolId = Guid.NewGuid();
            var template = SeedCertificateTemplate(schoolId, "Template", "BonafideCertificate");
            var student = SeedStudent(schoolId, "Student");
            var staff = SeedStaff(schoolId, "Staff", "Member");
            var req = new CreateCertificateRequest
            {
                SchoolId = schoolId,
                CertificateNumber = "",
                CertificateType = "BonafideCertificate",
                Title = "Bonafide Certificate",
                StudentId = student.Id,
                TemplateId = template.Id,
                IssuedByStaffId = staff.Id,
                IssueDate = DateTime.UtcNow
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _svc.CreateCertificateAsync(req));
        }

        [Fact]
        public async Task CreateCertificateAsync_TitleEmpty_ThrowsArgumentException()
        {
            var schoolId = Guid.NewGuid();
            var template = SeedCertificateTemplate(schoolId, "Template", "BonafideCertificate");
            var student = SeedStudent(schoolId, "Student");
            var staff = SeedStaff(schoolId, "Staff", "Member");
            var req = new CreateCertificateRequest
            {
                SchoolId = schoolId,
                CertificateNumber = "CERT001",
                CertificateType = "BonafideCertificate",
                Title = "",
                StudentId = student.Id,
                TemplateId = template.Id,
                IssuedByStaffId = staff.Id,
                IssueDate = DateTime.UtcNow
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _svc.CreateCertificateAsync(req));
        }

        [Fact]
        public async Task CreateCertificateAsync_StudentNotFound_ThrowsKeyNotFoundException()
        {
            var schoolId = Guid.NewGuid();
            var template = SeedCertificateTemplate(schoolId, "Template", "BonafideCertificate");
            var staff = SeedStaff(schoolId, "Staff", "Member");
            var req = new CreateCertificateRequest
            {
                SchoolId = schoolId,
                CertificateNumber = "CERT001",
                CertificateType = "BonafideCertificate",
                Title = "Bonafide Certificate",
                StudentId = Guid.NewGuid(),
                TemplateId = template.Id,
                IssuedByStaffId = staff.Id,
                IssueDate = DateTime.UtcNow
            };
            await Assert.ThrowsAsync<KeyNotFoundException>(() => _svc.CreateCertificateAsync(req));
        }

        [Fact]
        public async Task CreateCertificateAsync_TemplateNotFound_ThrowsKeyNotFoundException()
        {
            var schoolId = Guid.NewGuid();
            var student = SeedStudent(schoolId, "Student");
            var staff = SeedStaff(schoolId, "Staff", "Member");
            var req = new CreateCertificateRequest
            {
                SchoolId = schoolId,
                CertificateNumber = "CERT001",
                CertificateType = "BonafideCertificate",
                Title = "Bonafide Certificate",
                StudentId = student.Id,
                TemplateId = Guid.NewGuid(),
                IssuedByStaffId = staff.Id,
                IssueDate = DateTime.UtcNow
            };
            await Assert.ThrowsAsync<KeyNotFoundException>(() => _svc.CreateCertificateAsync(req));
        }

        [Fact]
        public async Task CreateCertificateAsync_TemplateInactive_ThrowsInvalidOperationException()
        {
            var schoolId = Guid.NewGuid();
            var template = SeedCertificateTemplate(schoolId, "Template", "BonafideCertificate", isActive: false);
            var student = SeedStudent(schoolId, "Student");
            var staff = SeedStaff(schoolId, "Staff", "Member");
            var req = new CreateCertificateRequest
            {
                SchoolId = schoolId,
                CertificateNumber = "CERT001",
                CertificateType = "BonafideCertificate",
                Title = "Bonafide Certificate",
                StudentId = student.Id,
                TemplateId = template.Id,
                IssuedByStaffId = staff.Id,
                IssueDate = DateTime.UtcNow
            };
            await Assert.ThrowsAsync<InvalidOperationException>(() => _svc.CreateCertificateAsync(req));
        }

        [Fact]
        public async Task CreateCertificateAsync_IssueDateInFuture_ThrowsArgumentException()
        {
            var schoolId = Guid.NewGuid();
            var template = SeedCertificateTemplate(schoolId, "Template", "BonafideCertificate");
            var student = SeedStudent(schoolId, "Student");
            var staff = SeedStaff(schoolId, "Staff", "Member");
            var req = new CreateCertificateRequest
            {
                SchoolId = schoolId,
                CertificateNumber = "CERT001",
                CertificateType = "BonafideCertificate",
                Title = "Bonafide Certificate",
                StudentId = student.Id,
                TemplateId = template.Id,
                IssuedByStaffId = staff.Id,
                IssueDate = DateTime.UtcNow.AddDays(1)
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _svc.CreateCertificateAsync(req));
        }

        [Fact]
        public async Task CreateCertificateAsync_ValidUntilBeforeIssueDate_ThrowsArgumentException()
        {
            var schoolId = Guid.NewGuid();
            var template = SeedCertificateTemplate(schoolId, "Template", "BonafideCertificate");
            var student = SeedStudent(schoolId, "Student");
            var staff = SeedStaff(schoolId, "Staff", "Member");
            var now = DateTime.UtcNow;
            var req = new CreateCertificateRequest
            {
                SchoolId = schoolId,
                CertificateNumber = "CERT001",
                CertificateType = "BonafideCertificate",
                Title = "Bonafide Certificate",
                StudentId = student.Id,
                TemplateId = template.Id,
                IssuedByStaffId = staff.Id,
                IssueDate = now,
                ValidUntil = now.AddDays(-1)
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _svc.CreateCertificateAsync(req));
        }

        [Fact]
        public async Task CreateCertificateAsync_DuplicateCertNumber_ThrowsInvalidOperationException()
        {
            var schoolId = Guid.NewGuid();
            var template = SeedCertificateTemplate(schoolId, "Template", "BonafideCertificate");
            var student = SeedStudent(schoolId, "Student");
            var staff = SeedStaff(schoolId, "Staff", "Member");
            SeedCertificate(schoolId, "CERT001", "BonafideCertificate", student.Id, template.Id, staff.Id);
            var req = new CreateCertificateRequest
            {
                SchoolId = schoolId,
                CertificateNumber = "CERT001",
                CertificateType = "BonafideCertificate",
                Title = "Bonafide Certificate",
                StudentId = student.Id,
                TemplateId = template.Id,
                IssuedByStaffId = staff.Id,
                IssueDate = DateTime.UtcNow
            };
            await Assert.ThrowsAsync<InvalidOperationException>(() => _svc.CreateCertificateAsync(req));
        }

        [Fact]
        public async Task GetCertificatesAsync_Success()
        {
            var schoolId = Guid.NewGuid();
            var template = SeedCertificateTemplate(schoolId, "Template", "BonafideCertificate");
            var student = SeedStudent(schoolId, "Student");
            var staff = SeedStaff(schoolId, "Staff", "Member");
            SeedCertificate(schoolId, "CERT001", "BonafideCertificate", student.Id, template.Id, staff.Id);
            var result = await _svc.GetCertificatesAsync(schoolId);
            result.Items.Should().HaveCount(1);
        }

        [Fact]
        public async Task GetCertificatesAsync_FilterByType()
        {
            var schoolId = Guid.NewGuid();
            var template = SeedCertificateTemplate(schoolId, "Template", "BonafideCertificate");
            var student = SeedStudent(schoolId, "Student");
            var staff = SeedStaff(schoolId, "Staff", "Member");
            SeedCertificate(schoolId, "CERT001", "BonafideCertificate", student.Id, template.Id, staff.Id);
            SeedCertificate(schoolId, "CERT002", "TransferCertificate", student.Id, template.Id, staff.Id);
            var result = await _svc.GetCertificatesAsync(schoolId, certificateType: "BonafideCertificate");
            result.Items.Should().HaveCount(1);
        }

        [Fact]
        public async Task GetCertificatesAsync_FilterByStatus()
        {
            var schoolId = Guid.NewGuid();
            var template = SeedCertificateTemplate(schoolId, "Template", "BonafideCertificate");
            var student = SeedStudent(schoolId, "Student");
            var staff = SeedStaff(schoolId, "Staff", "Member");
            SeedCertificate(schoolId, "CERT001", "BonafideCertificate", student.Id, template.Id, staff.Id, "Active");
            SeedCertificate(schoolId, "CERT002", "BonafideCertificate", student.Id, template.Id, staff.Id, "Revoked");
            var result = await _svc.GetCertificatesAsync(schoolId, status: "Active");
            result.Items.Should().HaveCount(1);
        }

        [Fact]
        public async Task GetStudentCertificatesAsync_Success()
        {
            var schoolId = Guid.NewGuid();
            var template = SeedCertificateTemplate(schoolId, "Template", "BonafideCertificate");
            var student = SeedStudent(schoolId, "Student");
            var staff = SeedStaff(schoolId, "Staff", "Member");
            SeedCertificate(schoolId, "CERT001", "BonafideCertificate", student.Id, template.Id, staff.Id);
            var result = await _svc.GetStudentCertificatesAsync(student.Id, schoolId);
            result.Items.Should().HaveCount(1);
        }

        [Fact]
        public async Task GenerateCertificateAsync_SetsFileUrl()
        {
            var schoolId = Guid.NewGuid();
            var template = SeedCertificateTemplate(schoolId, "Template", "BonafideCertificate");
            var student = SeedStudent(schoolId, "Student");
            var staff = SeedStaff(schoolId, "Staff", "Member");
            var cert = SeedCertificate(schoolId, "CERT001", "BonafideCertificate", student.Id, template.Id, staff.Id);
            var result = await _svc.GenerateCertificateAsync(cert.Id, schoolId);
            result.FileUrl.Should().NotBeNullOrEmpty();
        }

        [Fact]
        public async Task MarkCertificateAsPrintedAsync_Success()
        {
            var schoolId = Guid.NewGuid();
            var template = SeedCertificateTemplate(schoolId, "Template", "BonafideCertificate");
            var student = SeedStudent(schoolId, "Student");
            var staff = SeedStaff(schoolId, "Staff", "Member");
            var cert = SeedCertificate(schoolId, "CERT001", "BonafideCertificate", student.Id, template.Id, staff.Id);
            var result = await _svc.MarkCertificateAsPrintedAsync(cert.Id, schoolId);
            result.IsPrinted.Should().BeTrue();
            result.PrintedAt.Should().NotBeNull();
        }

        [Fact]
        public async Task MarkCertificateAsPrintedAsync_Idempotent()
        {
            var schoolId = Guid.NewGuid();
            var template = SeedCertificateTemplate(schoolId, "Template", "BonafideCertificate");
            var student = SeedStudent(schoolId, "Student");
            var staff = SeedStaff(schoolId, "Staff", "Member");
            var cert = SeedCertificate(schoolId, "CERT001", "BonafideCertificate", student.Id, template.Id, staff.Id);
            var first = await _svc.MarkCertificateAsPrintedAsync(cert.Id, schoolId);
            var second = await _svc.MarkCertificateAsPrintedAsync(cert.Id, schoolId);
            first.PrintedAt.Should().Be(second.PrintedAt);
        }

        [Fact]
        public async Task RevokeCertificateAsync_Success()
        {
            var schoolId = Guid.NewGuid();
            var template = SeedCertificateTemplate(schoolId, "Template", "BonafideCertificate");
            var student = SeedStudent(schoolId, "Student");
            var staff = SeedStaff(schoolId, "Staff", "Member");
            var cert = SeedCertificate(schoolId, "CERT001", "BonafideCertificate", student.Id, template.Id, staff.Id);
            var result = await _svc.RevokeCertificateAsync(cert.Id, schoolId);
            result.Status.Should().Be("Revoked");
        }

        [Fact]
        public async Task RevokeCertificateAsync_AlreadyRevoked_ThrowsInvalidOperationException()
        {
            var schoolId = Guid.NewGuid();
            var template = SeedCertificateTemplate(schoolId, "Template", "BonafideCertificate");
            var student = SeedStudent(schoolId, "Student");
            var staff = SeedStaff(schoolId, "Staff", "Member");
            var cert = SeedCertificate(schoolId, "CERT001", "BonafideCertificate", student.Id, template.Id, staff.Id, "Revoked");
            await Assert.ThrowsAsync<InvalidOperationException>(() => _svc.RevokeCertificateAsync(cert.Id, schoolId));
        }

        [Fact]
        public async Task GetCertificateStatsAsync_Success()
        {
            var schoolId = Guid.NewGuid();
            var template = SeedCertificateTemplate(schoolId, "Template", "BonafideCertificate");
            var student = SeedStudent(schoolId, "Student");
            var staff = SeedStaff(schoolId, "Staff", "Member");
            SeedCertificate(schoolId, "CERT001", "BonafideCertificate", student.Id, template.Id, staff.Id, "Active");
            SeedCertificate(schoolId, "CERT002", "BonafideCertificate", student.Id, template.Id, staff.Id, "Revoked");
            var result = await _svc.GetCertificateStatsAsync(schoolId);
            result.TotalCertificates.Should().Be(2);
            result.ActiveCertificates.Should().Be(1);
            result.RevokedCertificates.Should().Be(1);
        }

        [Fact]
        public async Task DeleteCertificateAsync_Success()
        {
            var schoolId = Guid.NewGuid();
            var template = SeedCertificateTemplate(schoolId, "Template", "BonafideCertificate");
            var student = SeedStudent(schoolId, "Student");
            var staff = SeedStaff(schoolId, "Staff", "Member");
            var cert = SeedCertificate(schoolId, "CERT001", "BonafideCertificate", student.Id, template.Id, staff.Id);
            var result = await _svc.DeleteCertificateAsync(cert.Id, schoolId);
            result.Should().BeTrue();
        }

        // ═══════════════════════════════════════════════════
        // ID Card Template Tests
        // ═══════════════════════════════════════════════════

        [Fact]
        public async Task CreateIDCardTemplateAsync_Success()
        {
            var schoolId = Guid.NewGuid();
            var req = new CreateIDCardTemplateRequest
            {
                SchoolId = schoolId,
                Name = "Student ID",
                CardType = "Student",
                FrontTemplate = "<html>front</html>",
                BackTemplate = "<html>back</html>",
                CardSize = "CR80"
            };
            var result = await _svc.CreateIDCardTemplateAsync(req);
            result.Should().NotBeNull();
            result.Name.Should().Be("Student ID");
        }

        [Fact]
        public async Task CreateIDCardTemplateAsync_NameEmpty_ThrowsArgumentException()
        {
            var schoolId = Guid.NewGuid();
            var req = new CreateIDCardTemplateRequest
            {
                SchoolId = schoolId,
                Name = "",
                CardType = "Student",
                FrontTemplate = "<html>front</html>",
                BackTemplate = "<html>back</html>"
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _svc.CreateIDCardTemplateAsync(req));
        }

        [Fact]
        public async Task CreateIDCardTemplateAsync_InvalidCardType_ThrowsArgumentException()
        {
            var schoolId = Guid.NewGuid();
            var req = new CreateIDCardTemplateRequest
            {
                SchoolId = schoolId,
                Name = "Student ID",
                CardType = "InvalidType",
                FrontTemplate = "<html>front</html>",
                BackTemplate = "<html>back</html>"
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _svc.CreateIDCardTemplateAsync(req));
        }

        // ═══════════════════════════════════════════════════
        // ID Card Tests
        // ═══════════════════════════════════════════════════

        [Fact]
        public async Task CreateIDCardAsync_Success()
        {
            var schoolId = Guid.NewGuid();
            var template = SeedIDCardTemplate(schoolId, "Student ID", "Student");
            var student = SeedStudent(schoolId, "Student");
            var req = new CreateIDCardRequest
            {
                SchoolId = schoolId,
                CardNumber = "ID001",
                CardType = "Student",
                HolderId = student.Id,
                HolderType = "Student",
                TemplateId = template.Id,
                IssueDate = DateTime.UtcNow,
                ExpiryDate = DateTime.UtcNow.AddYears(1)
            };
            var result = await _svc.CreateIDCardAsync(req);
            result.Should().NotBeNull();
            result.CardNumber.Should().Be("ID001");
        }

        [Fact]
        public async Task CreateIDCardAsync_CardNumberEmpty_ThrowsArgumentException()
        {
            var schoolId = Guid.NewGuid();
            var template = SeedIDCardTemplate(schoolId, "Student ID", "Student");
            var student = SeedStudent(schoolId, "Student");
            var req = new CreateIDCardRequest
            {
                SchoolId = schoolId,
                CardNumber = "",
                CardType = "Student",
                HolderId = student.Id,
                HolderType = "Student",
                TemplateId = template.Id,
                IssueDate = DateTime.UtcNow,
                ExpiryDate = DateTime.UtcNow.AddYears(1)
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _svc.CreateIDCardAsync(req));
        }

        [Fact]
        public async Task CreateIDCardAsync_InvalidCardType_ThrowsArgumentException()
        {
            var schoolId = Guid.NewGuid();
            var template = SeedIDCardTemplate(schoolId, "Student ID", "Student");
            var student = SeedStudent(schoolId, "Student");
            var req = new CreateIDCardRequest
            {
                SchoolId = schoolId,
                CardNumber = "ID001",
                CardType = "InvalidType",
                HolderId = student.Id,
                HolderType = "Student",
                TemplateId = template.Id,
                IssueDate = DateTime.UtcNow,
                ExpiryDate = DateTime.UtcNow.AddYears(1)
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _svc.CreateIDCardAsync(req));
        }

        [Fact]
        public async Task CreateIDCardAsync_InvalidHolderType_ThrowsArgumentException()
        {
            var schoolId = Guid.NewGuid();
            var template = SeedIDCardTemplate(schoolId, "Student ID", "Student");
            var student = SeedStudent(schoolId, "Student");
            var req = new CreateIDCardRequest
            {
                SchoolId = schoolId,
                CardNumber = "ID001",
                CardType = "Student",
                HolderId = student.Id,
                HolderType = "InvalidType",
                TemplateId = template.Id,
                IssueDate = DateTime.UtcNow,
                ExpiryDate = DateTime.UtcNow.AddYears(1)
            };
            await Assert.ThrowsAsync<ArgumentException>(() => _svc.CreateIDCardAsync(req));
        }

        [Fact]
        public async Task GetIDCardsAsync_Success()
        {
            var schoolId = Guid.NewGuid();
            var template = SeedIDCardTemplate(schoolId, "Student ID", "Student");
            var student = SeedStudent(schoolId, "Student");
            SeedIDCard(schoolId, "ID001", "Student", student.Id, "Student", template.Id);
            var result = await _svc.GetIDCardsAsync(schoolId);
            result.Items.Should().HaveCount(1);
        }

        [Fact]
        public async Task GetIDCardsAsync_FilterByType()
        {
            var schoolId = Guid.NewGuid();
            var template = SeedIDCardTemplate(schoolId, "ID", "Student");
            var student = SeedStudent(schoolId, "Student");
            SeedIDCard(schoolId, "ID001", "Student", student.Id, "Student", template.Id);
            SeedIDCard(schoolId, "ID002", "Staff", student.Id, "Student", template.Id);
            var result = await _svc.GetIDCardsAsync(schoolId, cardType: "Student");
            result.Items.Should().HaveCount(1);
        }

        [Fact]
        public async Task GenerateIDCardAsync_SetsFileUrl()
        {
            var schoolId = Guid.NewGuid();
            var template = SeedIDCardTemplate(schoolId, "Student ID", "Student");
            var student = SeedStudent(schoolId, "Student");
            var card = SeedIDCard(schoolId, "ID001", "Student", student.Id, "Student", template.Id);
            var result = await _svc.GenerateIDCardAsync(card.Id, schoolId);
            result.FileUrl.Should().NotBeNullOrEmpty();
        }

        [Fact]
        public async Task MarkIDCardAsPrintedAsync_Success()
        {
            var schoolId = Guid.NewGuid();
            var template = SeedIDCardTemplate(schoolId, "Student ID", "Student");
            var student = SeedStudent(schoolId, "Student");
            var card = SeedIDCard(schoolId, "ID001", "Student", student.Id, "Student", template.Id);
            var result = await _svc.MarkIDCardAsPrintedAsync(card.Id, schoolId);
            result.IsPrinted.Should().BeTrue();
        }
    }
}

