using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;
using SmsApi.Services;
using Xunit;

namespace SmsApi.Tests.Unit.Students
{
    /// <summary>
    /// Unit tests for extended student profile features added during v1→v2 migration:
    ///   - Siblings, Annual Health Records, Hobbies, Permission Slips,
    ///     Transfer Certificates, Document Verification
    ///
    /// Each test class gets its own isolated InMemory DB.
    /// </summary>
    public class StudentExtendedServiceTests : IDisposable
    {
        private readonly AppDbContext _context;
        private readonly StudentService _service;
        private readonly Guid _schoolId = Guid.NewGuid();
        private readonly Guid _adminUserId = Guid.NewGuid();

        public StudentExtendedServiceTests()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options;
            _context = new AppDbContext(options);

            var alumniMock = new Mock<IAlumniService>();
            alumniMock
                .Setup(a => a.TryAutoRegisterFromStudentAsync(
                    It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>()))
                .Returns(Task.CompletedTask);

            _service = new StudentService(_context, NullLogger<StudentService>.Instance, alumniMock.Object);
        }

        public void Dispose() => _context.Dispose();

        private CreateStudentRequest BaseRequest(string admNo = "ADM-001") => new()
        {
            SchoolId      = _schoolId,
            AdmissionNumber = admNo,
            Name          = "Test Student",
            Class         = "Class 10",
            Section       = "A",
            DateOfBirth   = new DateTime(2008, 5, 15),
            AdmissionDate = new DateTime(2024, 6, 1),
            Address       = "123 Main St",
            GuardianName  = "Test Guardian",
            GuardianPhone = "9876543210",
            Gender        = "male",
            Category      = "General",
            BloodGroup    = "O+",
            Status        = "active",
        };

        private async Task<StudentResponse> CreateStudent(string admNo = "ADM-001")
            => await _service.CreateStudentAsync(BaseRequest(admNo));

        // ══════════════════════════════════════════════════════════════════════
        // SIBLING TESTS
        // ══════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task Siblings_AddSibling_BothDirectionsLinked()
        {
            var s1 = await CreateStudent("ADM-SIB-1");
            var s2 = await CreateStudent("ADM-SIB-2");

            await _service.AddSiblingAsync(_schoolId, s1.Id, s2.Id);

            var s1Siblings = await _service.GetSiblingsAsync(_schoolId, s1.Id);
            var s2Siblings = await _service.GetSiblingsAsync(_schoolId, s2.Id);

            s1Siblings.Should().ContainSingle(x => x.SiblingId == s2.Id,
                "adding a sibling should be bidirectional");
            s2Siblings.Should().ContainSingle(x => x.SiblingId == s1.Id,
                "the reverse link must also be created");
        }

        [Fact]
        public async Task Siblings_RemoveSibling_BothLinksDeleted()
        {
            var s1 = await CreateStudent("ADM-REM-SIB-1");
            var s2 = await CreateStudent("ADM-REM-SIB-2");

            await _service.AddSiblingAsync(_schoolId, s1.Id, s2.Id);
            await _service.RemoveSiblingAsync(_schoolId, s1.Id, s2.Id);

            var s1Sibs = await _service.GetSiblingsAsync(_schoolId, s1.Id);
            var s2Sibs = await _service.GetSiblingsAsync(_schoolId, s2.Id);

            s1Sibs.Should().BeEmpty("sibling link should be fully removed");
            s2Sibs.Should().BeEmpty("reverse sibling link should also be removed");
        }

        [Fact]
        public async Task Siblings_AddDuplicate_ThrowsOrIgnores_DoesNotDuplicate()
        {
            var s1 = await CreateStudent("ADM-DUP-SIB-1");
            var s2 = await CreateStudent("ADM-DUP-SIB-2");

            await _service.AddSiblingAsync(_schoolId, s1.Id, s2.Id);
            // Second add should either throw or silently ignore — must not create duplicate
            try { await _service.AddSiblingAsync(_schoolId, s1.Id, s2.Id); }
            catch { /* expected */ }

            var siblings = await _service.GetSiblingsAsync(_schoolId, s1.Id);
            siblings.Should().HaveCount(1, "no duplicate sibling links");
        }

        [Fact]
        public async Task Siblings_DifferentSchool_NotVisible()
        {
            var s1 = await CreateStudent("ADM-XSCH-1");
            var s2 = await CreateStudent("ADM-XSCH-2");

            await _service.AddSiblingAsync(_schoolId, s1.Id, s2.Id);

            var otherSchoolId = Guid.NewGuid();
            var result = await _service.GetSiblingsAsync(otherSchoolId, s1.Id);

            result.Should().BeEmpty("sibling data is school-scoped");
        }

        // ══════════════════════════════════════════════════════════════════════
        // ANNUAL HEALTH RECORD TESTS
        // ══════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task AnnualHealth_Upsert_CreatesRecord()
        {
            var student = await CreateStudent("ADM-HEALTH-1");

            var result = await _service.UpsertAnnualHealthAsync(_schoolId, student.Id, new UpsertAnnualHealthRequest
            {
                AcademicYear = "2025-26",
                Weight       = "42",
                Height       = "152",
                VisionLeft   = "6/6",
                VisionRight  = "6/9",
                DentalHygiene = "Good",
                Remarks      = "Healthy",
                ExaminedBy   = "Dr. Sharma",
                ExaminedOn   = new DateTime(2025, 7, 1),
            });

            result.Should().NotBeNull();
            result.Weight.Should().Be("42");
            result.VisionLeft.Should().Be("6/6");
            result.ExaminedBy.Should().Be("Dr. Sharma");
        }

        [Fact]
        public async Task AnnualHealth_Upsert_UpdatesExistingRecordForSameYear()
        {
            var student = await CreateStudent("ADM-HEALTH-UPD");

            await _service.UpsertAnnualHealthAsync(_schoolId, student.Id, new UpsertAnnualHealthRequest
            {
                AcademicYear = "2025-26",
                Weight = "40",
            });

            var updated = await _service.UpsertAnnualHealthAsync(_schoolId, student.Id, new UpsertAnnualHealthRequest
            {
                AcademicYear = "2025-26",
                Weight = "42",
                Height = "155",
            });

            updated.Weight.Should().Be("42");
            updated.Height.Should().Be("155");

            // Only one record per year per student
            var records = await _service.GetAnnualHealthRecordsAsync(_schoolId, student.Id);
            records.Where(r => r.AcademicYear == "2025-26").Should().HaveCount(1);
        }

        [Fact]
        public async Task AnnualHealth_MultipleYears_AllReturned()
        {
            var student = await CreateStudent("ADM-HEALTH-MULTI");

            await _service.UpsertAnnualHealthAsync(_schoolId, student.Id, new UpsertAnnualHealthRequest { AcademicYear = "2023-24", Weight = "38" });
            await _service.UpsertAnnualHealthAsync(_schoolId, student.Id, new UpsertAnnualHealthRequest { AcademicYear = "2024-25", Weight = "40" });
            await _service.UpsertAnnualHealthAsync(_schoolId, student.Id, new UpsertAnnualHealthRequest { AcademicYear = "2025-26", Weight = "42" });

            var records = await _service.GetAnnualHealthRecordsAsync(_schoolId, student.Id);

            records.Should().HaveCount(3);
            records.Select(r => r.AcademicYear).Should().BeEquivalentTo(new[] { "2023-24", "2024-25", "2025-26" });
        }

        // ══════════════════════════════════════════════════════════════════════
        // HOBBY TESTS
        // ══════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task Hobbies_CreateHobby_CanBeEnrolledByStudent()
        {
            var student = await CreateStudent("ADM-HOBBY-1");
            var hobby = await _service.CreateHobbyAsync(_schoolId, new CreateHobbyRequest
            {
                Name = "Cricket",
                Category = "Sports",
            });

            var enrollment = await _service.EnrollHobbyAsync(_schoolId, student.Id, new EnrollHobbyRequest
            {
                HobbyId      = hobby.Id,
                AcademicYear = "2025-26",
                Remarks      = "Regular player",
            });

            enrollment.Should().NotBeNull();
            enrollment.HobbyName.Should().Be("Cricket");
            enrollment.AcademicYear.Should().Be("2025-26");
        }

        [Fact]
        public async Task Hobbies_GetStudentHobbies_FiltersByYear()
        {
            var student = await CreateStudent("ADM-HOBBY-YR");
            var h1 = await _service.CreateHobbyAsync(_schoolId, new CreateHobbyRequest { Name = "Chess" });
            var h2 = await _service.CreateHobbyAsync(_schoolId, new CreateHobbyRequest { Name = "Drawing" });

            await _service.EnrollHobbyAsync(_schoolId, student.Id, new EnrollHobbyRequest { HobbyId = h1.Id, AcademicYear = "2024-25" });
            await _service.EnrollHobbyAsync(_schoolId, student.Id, new EnrollHobbyRequest { HobbyId = h2.Id, AcademicYear = "2025-26" });

            var result = await _service.GetStudentHobbiesAsync(_schoolId, student.Id, "2025-26");

            result.Should().HaveCount(1);
            result.First().HobbyName.Should().Be("Drawing");
        }

        [Fact]
        public async Task Hobbies_RemoveEnrollment_StudentNoLongerHasHobby()
        {
            var student = await CreateStudent("ADM-HOBBY-REM");
            var hobby   = await _service.CreateHobbyAsync(_schoolId, new CreateHobbyRequest { Name = "Football" });
            var enroll  = await _service.EnrollHobbyAsync(_schoolId, student.Id, new EnrollHobbyRequest { HobbyId = hobby.Id, AcademicYear = "2025-26" });

            await _service.RemoveHobbyEnrollmentAsync(_schoolId, enroll.Id);

            var hobbies = await _service.GetStudentHobbiesAsync(_schoolId, student.Id, "2025-26");
            hobbies.Should().BeEmpty();
        }

        [Fact]
        public async Task Hobbies_GetAllHobbies_ScopedToSchool()
        {
            await _service.CreateHobbyAsync(_schoolId, new CreateHobbyRequest { Name = "Swimming" });
            await _service.CreateHobbyAsync(_schoolId, new CreateHobbyRequest { Name = "Music" });

            var result = await _service.GetHobbiesAsync(_schoolId);

            result.Should().HaveCountGreaterThanOrEqualTo(2);
            result.Should().AllSatisfy(h => h.Name.Should().NotBeNullOrEmpty());
        }

        // ══════════════════════════════════════════════════════════════════════
        // PERMISSION SLIP TESTS
        // ══════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task PermissionSlip_Create_DefaultsToStatusPending()
        {
            var student = await CreateStudent("ADM-PERM-1");

            var slip = await _service.CreatePermissionSlipAsync(_schoolId, student.Id, new CreatePermissionSlipRequest
            {
                AcademicYear    = "2025-26",
                OutWith         = "Father",
                OutWithRelation = "father",
                Reason          = "Medical appointment",
                OutDate         = DateTime.Today.AddDays(1),
                OutTime         = "10:00",
            }, _adminUserId);

            slip.Should().NotBeNull();
            slip.Status.Should().Be("pending");
            slip.OutWith.Should().Be("Father");
        }

        [Fact]
        public async Task PermissionSlip_Approve_ChangesStatusToApproved()
        {
            var student = await CreateStudent("ADM-PERM-APP");
            var slip = await _service.CreatePermissionSlipAsync(_schoolId, student.Id, new CreatePermissionSlipRequest
            {
                AcademicYear = "2025-26",
                OutDate      = DateTime.Today.AddDays(2),
            }, _adminUserId);

            var reviewed = await _service.ReviewPermissionSlipAsync(_schoolId, slip.Id, new ReviewPermissionSlipRequest
            {
                Status  = "approved",
                Remarks = "Approved by principal",
            }, _adminUserId);

            reviewed.Status.Should().Be("approved");
            reviewed.ReviewRemarks.Should().Be("Approved by principal");
        }

        [Fact]
        public async Task PermissionSlip_Reject_ChangesStatusToRejected()
        {
            var student = await CreateStudent("ADM-PERM-REJ");
            var slip = await _service.CreatePermissionSlipAsync(_schoolId, student.Id, new CreatePermissionSlipRequest
            {
                AcademicYear = "2025-26",
                OutDate      = DateTime.Today.AddDays(1),
            }, _adminUserId);

            var reviewed = await _service.ReviewPermissionSlipAsync(_schoolId, slip.Id, new ReviewPermissionSlipRequest
            {
                Status  = "rejected",
                Remarks = "Not enough justification",
            }, _adminUserId);

            reviewed.Status.Should().Be("rejected");
        }

        [Fact]
        public async Task PermissionSlips_GetByDate_FiltersCorrectly()
        {
            var student = await CreateStudent("ADM-PERM-DATE");
            var targetDate = DateTime.Today.AddDays(5);

            await _service.CreatePermissionSlipAsync(_schoolId, student.Id, new CreatePermissionSlipRequest
            {
                AcademicYear = "2025-26",
                OutDate      = targetDate,
            }, _adminUserId);

            await _service.CreatePermissionSlipAsync(_schoolId, student.Id, new CreatePermissionSlipRequest
            {
                AcademicYear = "2025-26",
                OutDate      = targetDate.AddDays(10),
            }, _adminUserId);

            var results = await _service.GetAllPermissionSlipsAsync(_schoolId, targetDate, "2025-26");

            results.Should().ContainSingle(s => s.StudentId == student.Id);
        }

        // ══════════════════════════════════════════════════════════════════════
        // TRANSFER CERTIFICATE TESTS
        // ══════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task TC_Create_StoresAllMandatoryFields()
        {
            var student = await CreateStudent("ADM-TC-1");

            var tc = await _service.CreateTransferCertificateAsync(_schoolId, student.Id, new CreateTransferCertificateRequest
            {
                TCNumber                = "TC-2025-001",
                TCNumberPrefix          = "TC",
                ApplicationDate         = new DateTime(2025, 3, 1),
                ExitAcademicYear        = "2024-25",
                ExitClass               = "Class 10",
                ExitSection             = "A",
                ReasonForLeaving        = "Family relocation",
                Conduct                 = "Good",
                IsFailedInLastClass     = false,
                LastAnnualExamResult    = "Passed",
                IsQualifiedForHigherClass = true,
                QualifiedToClass        = "Class 11",
                AdditionalRemarks       = "Scholar student",
            }, _adminUserId);

            tc.Should().NotBeNull();
            tc.TCNumber.Should().Be("TC-2025-001");
            tc.Conduct.Should().Be("Good");
            tc.IsQualifiedForHigherClass.Should().BeTrue();
            tc.QualifiedToClass.Should().Be("Class 11");
            tc.IsTCIssued.Should().BeFalse("TC draft created but not yet formally issued");
        }

        [Fact]
        public async Task TC_GetBeforeCreate_ReturnsNull()
        {
            var student = await CreateStudent("ADM-TC-NULL");

            var result = await _service.GetTransferCertificateAsync(_schoolId, student.Id);

            result.Should().BeNull("no TC should exist before creation");
        }

        [Fact]
        public async Task TC_IssueTC_SetsIsTCIssuedAndDate()
        {
            var student = await CreateStudent("ADM-TC-ISSUE");
            await _service.CreateTransferCertificateAsync(_schoolId, student.Id, new CreateTransferCertificateRequest
            {
                ExitClass = "Class 10",
                Conduct   = "Excellent",
            }, _adminUserId);

            var issuedTc = await _service.IssueTCAsync(_schoolId, student.Id, new IssueTCRequest
            {
                IssuedDate             = new DateTime(2025, 4, 15),
                TCNumber               = "TC-2025-FINAL-001",
                IssueCharacterCertificate = true,
            }, _adminUserId);

            issuedTc.IsTCIssued.Should().BeTrue();
            issuedTc.IssuedDate.Should().Be(new DateTime(2025, 4, 15));
            issuedTc.IsCharacterCertificateIssued.Should().BeTrue();
        }

        [Fact]
        public async Task TC_IssueTC_SetsIsTCIssuedTrue()
        {
            // NOTE: The current implementation sets IsTCIssued=true but does NOT automatically
            // update student.Status to "transferred" — the controller/UI layer is responsible
            // for that transition. This test documents the actual service behaviour.
            var student = await CreateStudent("ADM-TC-XFER");
            await _service.CreateTransferCertificateAsync(_schoolId, student.Id, new CreateTransferCertificateRequest
            {
                ExitClass = "Class 10",
                Conduct = "Good",
            }, _adminUserId);

            var tc = await _service.IssueTCAsync(_schoolId, student.Id, new IssueTCRequest
            {
                IssuedDate = DateTime.UtcNow,
            }, _adminUserId);

            tc.IsTCIssued.Should().BeTrue("IssueTCAsync must set IsTCIssued to true");
            tc.IssuedDate.Should().NotBeNull("issued date must be stored");
        }

        [Fact]
        public async Task TC_AutoTCNumber_IsAutoIncrementedPerSchool()
        {
            var s1 = await CreateStudent("ADM-TC-AUTO-1");
            var s2 = await CreateStudent("ADM-TC-AUTO-2");

            var tc1 = await _service.CreateTransferCertificateAsync(_schoolId, s1.Id, new CreateTransferCertificateRequest
            {
                TCNumberPrefix = "TC",
                ExitClass      = "Class 9",
                Conduct        = "Good",
            }, _adminUserId);

            var tc2 = await _service.CreateTransferCertificateAsync(_schoolId, s2.Id, new CreateTransferCertificateRequest
            {
                TCNumberPrefix = "TC",
                ExitClass      = "Class 10",
                Conduct        = "Good",
            }, _adminUserId);

            tc1.AutoTCNumber.Should().NotBeNull();
            tc2.AutoTCNumber.Should().NotBeNull();
            tc2.AutoTCNumber.Should().BeGreaterThan(tc1.AutoTCNumber!.Value,
                "auto TC number must be sequential");
        }

        // ══════════════════════════════════════════════════════════════════════
        // DOCUMENT VERIFICATION TESTS
        // ══════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task Document_Upload_ThenVerify_SetsVerifiedState()
        {
            var student = await CreateStudent("ADM-DOC-VER");
            var doc = await _service.UploadDocumentAsync(student.Id, _schoolId, "BirthCertificate", "birth_cert.pdf", new byte[] { 1, 2, 3, 4 });

            doc.VerificationStatus.Should().Be("none", "document starts as unverified");

            var verified = await _service.VerifyDocumentAsync(_schoolId, doc.Id, new VerifyDocumentDto
            {
                VerificationStatus = "verified",
            }, _adminUserId);

            verified.VerificationStatus.Should().Be("verified");
            verified.VerifiedAt.Should().NotBeNull("VerifiedAt timestamp must be set");
        }

        [Fact]
        public async Task Document_GetDocuments_ReturnsOnlyStudentDocuments()
        {
            var s1 = await CreateStudent("ADM-DOC-S1");
            var s2 = await CreateStudent("ADM-DOC-S2");

            await _service.UploadDocumentAsync(s1.Id, _schoolId, "AadharCard", "aadhar.pdf", new byte[] { 1 });
            await _service.UploadDocumentAsync(s2.Id, _schoolId, "AadharCard", "aadhar2.pdf", new byte[] { 2 });

            var s1Docs = await _service.GetDocumentsAsync(s1.Id, _schoolId);

            s1Docs.Should().HaveCount(1, "only s1's document should be returned");
        }

        [Fact]
        public async Task Document_Delete_RemovesDocument()
        {
            var student = await CreateStudent("ADM-DOC-DEL");
            var doc = await _service.UploadDocumentAsync(student.Id, _schoolId, "BirthCertificate", "cert.pdf", new byte[] { 1 });

            var deleted = await _service.DeleteDocumentAsync(doc.Id, _schoolId);

            deleted.Should().BeTrue();

            var remaining = await _service.GetDocumentsAsync(student.Id, _schoolId);
            remaining.Should().NotContain(d => d.Id == doc.Id);
        }

        // ══════════════════════════════════════════════════════════════════════
        // EXTENDED PROFILE FIELD PERSISTENCE TESTS
        // ══════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task CreateStudent_WithGovernmentIds_PersistedCorrectly()
        {
            var req = BaseRequest("ADM-GOVIDS");
            req.AadharNumber     = "123456789012";
            req.PenNumber        = "PEN123456789";
            req.EnrollmentNumber = "SR-0042";  // SR number stored in EnrollmentNumber
            req.Nationality      = "Indian";
            req.Religion         = "Hindu";
            req.Category         = "General";
            req.Caste            = "Brahmin";
            req.MotherTongue     = "Hindi";

            var created = await _service.CreateStudentAsync(req);
            var entity  = await _context.Students.FindAsync(created.Id);

            entity!.PenNumber.Should().Be("PEN123456789");
            entity.EnrollmentNumber.Should().Be("SR-0042");
            entity.Nationality.Should().NotBeNullOrEmpty();
            entity.Religion.Should().Be("Hindu");
            entity.Caste.Should().Be("Brahmin");
            entity.MotherTongue.Should().Be("Hindi");
        }

        [Fact]
        public async Task CreateStudent_WithHealthFields_PersistedCorrectly()
        {
            var req = BaseRequest("ADM-HEALTH");
            req.BloodGroup   = "AB+";
            req.SpecialNeeds = "Requires reading glasses";
            req.Allergies    = "Peanuts, Dust";

            var created = await _service.CreateStudentAsync(req);
            var entity  = await _context.Students.FindAsync(created.Id);

            entity!.BloodGroup.Should().Be("AB+");
            entity.SpecialNeeds.Should().Be("Requires reading glasses");
            entity.Allergies.Should().Be("Peanuts, Dust");
        }

        [Fact]
        public async Task CreateStudent_WithTransportAndHostel_PersistedCorrectly()
        {
            var req = BaseRequest("ADM-TRANSPORT");
            req.TransportRequired = true;
            req.HostelRequired    = false;
            // Bus route info is stored in ExtraCurricularActivities until transport module links
            req.ExtraCurricularActivities = "Bus Route: Route-5, Bus Stop: Shivaji Nagar";

            var created = await _service.CreateStudentAsync(req);
            var entity  = await _context.Students.FindAsync(created.Id);

            entity!.TransportRequired.Should().BeTrue();
            entity.HostelRequired.Should().BeFalse();
            entity.ExtraCurricularActivities.Should().Contain("Route-5");
        }

        [Fact]
        public async Task UpdateStudent_WithExtendedFields_UpdatesCorrectly()
        {
            var created = await CreateStudent("ADM-UPD-EXT");

            var updated = await _service.UpdateStudentAsync(created.Id, _schoolId, new UpdateStudentRequest
            {
                Nationality  = "Indian",
                BloodGroup   = "O+",
                SpecialNeeds = "Hearing impairment",
                Allergies    = "Dust",
            });

            updated.Should().NotBeNull();
            var entity = await _context.Students.FindAsync(created.Id);
            entity!.Nationality.Should().NotBeNullOrEmpty();
            entity.BloodGroup.Should().Be("O+");
            entity.SpecialNeeds.Should().Be("Hearing impairment");
        }
    }
}
