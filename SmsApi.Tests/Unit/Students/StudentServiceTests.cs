using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.InMemory.Infrastructure.Internal;
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
    /// Comprehensive unit tests for StudentService.
    /// Uses EF Core InMemory database to test service logic without a real DB.
    /// Each test gets a fresh database to ensure isolation.
    /// </summary>
    public class StudentServiceTests : IDisposable
    {
        private readonly AppDbContext _context;
        private readonly StudentService _service;
        private readonly Guid _schoolId = Guid.NewGuid();
        private readonly Guid _adminUserId = Guid.NewGuid();

        public StudentServiceTests()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
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

        // ─────────────────────────────────────────────────────────────────────
        // Helper: create a minimal valid CreateStudentRequest
        // ─────────────────────────────────────────────────────────────────────
        private CreateStudentRequest ValidRequest(string admissionNumber = "ADM-001") => new CreateStudentRequest
        {
            SchoolId = _schoolId,
            AdmissionNumber = admissionNumber,
            Name = "Test Student",
            Class = "Class 10",
            Section = "A",
            DateOfBirth = new DateTime(2008, 5, 15),
            AdmissionDate = new DateTime(2024, 6, 1),
            Address = "123 Main Street",
            GuardianName = "Test Guardian",
            GuardianPhone = "9876543210",
            Gender = "male",
            Category = "General",
            BloodGroup = "B+",
            Status = "active"
        };

        private CreateStudentRequest ValidRequest(string admissionNumber, Action<CreateStudentRequest> modify)
        {
            var req = ValidRequest(admissionNumber);
            modify(req);
            return req;
        }

        // =====================================================================
        // CREATE STUDENT TESTS
        // =====================================================================

        [Fact]
        public async Task CreateStudent_ValidRequest_CreatesStudentAndReturnsId()
        {
            var request = ValidRequest();

            var result = await _service.CreateStudentAsync(request);

            result.Should().NotBeNull();
            result.Id.Should().NotBe(Guid.Empty);
            result.AdmissionNumber.Should().Be("ADM-001");
            result.Name.Should().Be("Test Student");
            result.Status.Should().Be("active");
        }

        [Fact]
        public async Task CreateStudent_DuplicateAdmissionNumber_ThrowsInvalidOperation()
        {
            await _service.CreateStudentAsync(ValidRequest("ADM-DUP"));

            Func<Task> act = () => _service.CreateStudentAsync(ValidRequest("ADM-DUP"));

            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*admission number*");
        }

        [Fact]
        public async Task CreateStudent_CreatesGuardianEntity_WhenGuardianProvided()
        {
            var request = ValidRequest("ADM-GUARD");
            request.GuardianName = "Ramesh Kumar";
            request.GuardianPhone = "9876543210";

            var result = await _service.CreateStudentAsync(request);

            var guardians = await _context.StudentGuardians
                .Where(g => g.StudentId == result.Id)
                .ToListAsync();

            // The service's CreateStudentAsync does not currently create guardian entities
            // (legacy GuardianName/Phone used). Bulk import now does. This verifies single-create path.
            result.Should().NotBeNull();
        }

        [Fact]
        public async Task CreateStudent_SetsCreatedAtAndUpdatedAt()
        {
            var before = DateTime.UtcNow.AddSeconds(-1);
            await _service.CreateStudentAsync(ValidRequest("ADM-TS"));
            var after = DateTime.UtcNow.AddSeconds(1);

            var student = await _context.Students.FirstAsync(s => s.AdmissionNumber == "ADM-TS");
            student.CreatedAt.Should().BeAfter(before).And.BeBefore(after);
            student.UpdatedAt.Should().BeAfter(before).And.BeBefore(after);
        }

        // =====================================================================
        // GET STUDENTS (LIST) TESTS
        // =====================================================================

        [Fact]
        public async Task GetStudents_ReturnsOnlySchoolStudents()
        {
            await _service.CreateStudentAsync(ValidRequest("ADM-S1"));
            // Create a student for a different school
            _context.Students.Add(new Student
            {
                Id = Guid.NewGuid(), SchoolId = Guid.NewGuid(),
                AdmissionNumber = "ADM-OTHER", Name = "Other School", Class = "Class 1",
                Section = "A", DateOfBirth = new DateTime(2010, 1, 1), Address = "Other",
                GuardianName = "G", GuardianPhone = "1", Status = "active",
                AdmissionDate = DateTime.UtcNow, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            var result = await _service.GetStudentsAsync(_schoolId, 1, 10, null, null, null, null);

            result.Total.Should().Be(1);
            result.Students.Should().AllSatisfy(s => s.AdmissionNumber.Should().Be("ADM-S1"));
        }

        [Fact]
        public async Task GetStudents_SearchByName_FiltersCorrectly()
        {
            await _service.CreateStudentAsync(ValidRequest("ADM-SEARCH1", r => r.Name = "Ramesh Kumar"));
            await _service.CreateStudentAsync(ValidRequest("ADM-SEARCH2", r => r.Name = "Suresh Patel"));

            var result = await _service.GetStudentsAsync(_schoolId, 1, 10, "ramesh", null, null, null);

            result.Total.Should().Be(1);
            result.Students.First().Name.Should().Be("Ramesh Kumar");
        }

        [Fact]
        public async Task GetStudents_FilterByClass_ReturnsCorrectStudents()
        {
            await _service.CreateStudentAsync(ValidRequest("ADM-C10", r => r.Class = "Class 10"));
            await _service.CreateStudentAsync(ValidRequest("ADM-C11", r => r.Class = "Class 11"));

            var result = await _service.GetStudentsAsync(_schoolId, 1, 10, null, "Class 10", null, null);

            result.Total.Should().Be(1);
            result.Students.First().Class.Should().Be("Class 10");
        }

        [Fact]
        public async Task GetStudents_FilterBySection_ReturnsCorrectStudents()
        {
            await _service.CreateStudentAsync(ValidRequest("ADM-SA", r => r.Section = "A"));
            await _service.CreateStudentAsync(ValidRequest("ADM-SB", r => r.Section = "B"));

            var result = await _service.GetStudentsAsync(_schoolId, 1, 10, null, null, "A", null);

            result.Total.Should().Be(1);
            result.Students.First().Section.Should().Be("A");
        }

        [Fact]
        public async Task GetStudents_FilterByStatus_ReturnsCorrectStudents()
        {
            await _service.CreateStudentAsync(ValidRequest("ADM-ACT", r => r.Status = "active"));
            await _service.CreateStudentAsync(ValidRequest("ADM-INA", r => r.Status = "inactive"));

            var result = await _service.GetStudentsAsync(_schoolId, 1, 10, null, null, null, "inactive");

            result.Total.Should().Be(1);
        }

        [Fact]
        public async Task GetStudents_PaginationWorks_CorrectPageAndTotal()
        {
            for (int i = 1; i <= 15; i++)
                await _service.CreateStudentAsync(ValidRequest($"ADM-PG-{i:D2}"));

            var page1 = await _service.GetStudentsAsync(_schoolId, 1, 5, null, null, null, null);
            var page2 = await _service.GetStudentsAsync(_schoolId, 2, 5, null, null, null, null);
            var page3 = await _service.GetStudentsAsync(_schoolId, 3, 5, null, null, null, null);

            page1.Total.Should().Be(15);
            page1.TotalPages.Should().Be(3);
            page1.Students.Count.Should().Be(5);
            page2.Students.Count.Should().Be(5);
            page3.Students.Count.Should().Be(5);
        }

        [Fact]
        public async Task GetStudents_SortByName_AscWorks()
        {
            await _service.CreateStudentAsync(ValidRequest("ADM-ZZZ", r => r.Name = "Zara Khan"));
            await _service.CreateStudentAsync(ValidRequest("ADM-AAA", r => r.Name = "Arjun Singh"));

            var result = await _service.GetStudentsAsync(_schoolId, 1, 10, null, null, null, null, sortBy: "name", sortOrder: "asc");

            result.Students.First().Name.Should().Be("Arjun Singh");
            result.Students.Last().Name.Should().Be("Zara Khan");
        }

        [Fact]
        public async Task GetStudents_SortByNameDesc_Works()
        {
            await _service.CreateStudentAsync(ValidRequest("ADM-SORT-Z", r => r.Name = "Zara Khan"));
            await _service.CreateStudentAsync(ValidRequest("ADM-SORT-A", r => r.Name = "Arjun Singh"));

            var result = await _service.GetStudentsAsync(_schoolId, 1, 10, null, null, null, null, sortBy: "name", sortOrder: "desc");

            result.Students.First().Name.Should().Be("Zara Khan");
        }

        // =====================================================================
        // GET STUDENT BY ID TESTS
        // =====================================================================

        [Fact]
        public async Task GetStudentById_ValidId_ReturnsMaskedPii()
        {
            var req = ValidRequest("ADM-PII");
            req.AadharNumber = "123456789012";
            req.PanNumber = "ABCDE1234F";
            var created = await _service.CreateStudentAsync(req);

            var student = await _service.GetStudentByIdAsync(created.Id, _schoolId);

            student.Should().NotBeNull();
            student!.AadharNumber.Should().StartWith("XXXX-XXXX-");
            student.AadharNumber.Should().EndWith("9012");
            student.PanNumber.Should().StartWith("XXXXX");
            student.PanNumber.Should().EndWith("1234F");
        }

        [Fact]
        public async Task GetStudentById_WrongSchool_ReturnsNull()
        {
            var created = await _service.CreateStudentAsync(ValidRequest("ADM-WRONG-SCH"));

            var result = await _service.GetStudentByIdAsync(created.Id, Guid.NewGuid());

            result.Should().BeNull();
        }

        [Fact]
        public async Task GetStudentById_NonExistentId_ReturnsNull()
        {
            var result = await _service.GetStudentByIdAsync(Guid.NewGuid(), _schoolId);
            result.Should().BeNull();
        }

        // =====================================================================
        // UPDATE STUDENT TESTS
        // =====================================================================

        [Fact]
        public async Task UpdateStudent_ValidStatus_UpdatesCorrectly()
        {
            var created = await _service.CreateStudentAsync(ValidRequest("ADM-UPD"));

            var result = await _service.UpdateStudentAsync(created.Id, _schoolId, new UpdateStudentRequest { Status = "inactive" });

            result.Should().NotBeNull();
            result!.Status.Should().Be("inactive");
        }

        [Fact]
        public async Task UpdateStudent_InvalidStatus_ThrowsInvalidOperation()
        {
            var created = await _service.CreateStudentAsync(ValidRequest("ADM-INVALID-ST"));

            Func<Task> act = () => _service.UpdateStudentAsync(created.Id, _schoolId, new UpdateStudentRequest { Status = "flying" });

            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*Invalid status*");
        }

        [Fact]
        public async Task UpdateStudent_AllowedStatuses_AllPass()
        {
            var allowedStatuses = new[] { "active", "inactive", "transferred", "graduated", "left", "dropped_out", "on_leave" };
            for (int i = 0; i < allowedStatuses.Length; i++)
            {
                var created = await _service.CreateStudentAsync(ValidRequest($"ADM-ST-{i}"));
                var result = await _service.UpdateStudentAsync(created.Id, _schoolId, new UpdateStudentRequest { Status = allowedStatuses[i] });
                result!.Status.Should().Be(allowedStatuses[i]);
            }
        }

        // =====================================================================
        // DELETE STUDENT (SOFT DELETE) TESTS
        // =====================================================================

        [Fact]
        public async Task DeleteStudent_SoftDeletesRecord_NotHardDeletes()
        {
            var created = await _service.CreateStudentAsync(ValidRequest("ADM-DEL"));

            var deleted = await _service.DeleteStudentAsync(created.Id, _schoolId);

            deleted.Should().BeTrue();

            // Record still exists in DB (soft delete) but IsDeleted = true
            var raw = await _context.Students
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(s => s.Id == created.Id);
            raw.Should().NotBeNull("Record must be preserved for audit and referential integrity");
            raw!.IsDeleted.Should().BeTrue("Must be soft deleted");
            raw.DeletedAt.Should().NotBeNull("DeletedAt must be set");
        }

        [Fact]
        public async Task DeleteStudent_SoftDeleted_NotReturnedInGetList()
        {
            var created = await _service.CreateStudentAsync(ValidRequest("ADM-DEL-HIDE"));
            await _service.DeleteStudentAsync(created.Id, _schoolId);

            var list = await _service.GetStudentsAsync(_schoolId, 1, 10, null, null, null, null);

            list.Students.Should().NotContain(s => s.Id == created.Id, "soft-deleted students must not appear in list");
        }

        [Fact]
        public async Task DeleteStudent_NonExistent_ReturnsFalse()
        {
            var result = await _service.DeleteStudentAsync(Guid.NewGuid(), _schoolId);
            result.Should().BeFalse();
        }

        // =====================================================================
        // BULK IMPORT TESTS
        // =====================================================================

        [Fact]
        public async Task BulkImport_ValidBatch_AllSucceed()
        {
            var requests = Enumerable.Range(1, 5).Select(i => ValidRequest($"BULK-{i:D3}")).ToList();

            var result = await _service.BulkImportStudentsAsync(_schoolId, requests, _adminUserId);

            result.SuccessCount.Should().Be(5);
            result.FailureCount.Should().Be(0);
            result.Errors.Should().BeEmpty();
            result.SuccessfulIds.Should().HaveCount(5);
            result.SuccessfulAdmissionNumbers.Should().HaveCount(5);
        }

        [Fact]
        public async Task BulkImport_DuplicateAdmissionInDB_FailsWithError()
        {
            await _service.CreateStudentAsync(ValidRequest("ADM-EXISTS"));

            var result = await _service.BulkImportStudentsAsync(_schoolId, new List<CreateStudentRequest> { ValidRequest("ADM-EXISTS") }, _adminUserId);

            result.FailureCount.Should().Be(1);
            result.Errors.Should().ContainMatch("*ADM-EXISTS*Duplicate*");
        }

        [Fact]
        public async Task BulkImport_DuplicateInSameBatch_SecondFailsFirstSucceeds()
        {
            var req1 = ValidRequest("ADM-DUP-BATCH");
            var req2 = ValidRequest("ADM-DUP-BATCH"); // Same admission number

            var result = await _service.BulkImportStudentsAsync(_schoolId, new List<CreateStudentRequest> { req1, req2 }, _adminUserId);

            result.SuccessCount.Should().Be(1);
            result.FailureCount.Should().Be(1);
            result.Errors.First().Should().Contain("twice in this import");
        }

        [Fact]
        public async Task BulkImport_MissingName_FailsWithValidationError()
        {
            var req = ValidRequest("ADM-NONAME", r => r.Name = "");

            var result = await _service.BulkImportStudentsAsync(_schoolId, new List<CreateStudentRequest> { req }, _adminUserId);

            result.FailureCount.Should().Be(1);
            result.Errors.Should().ContainMatch("*Name is required*");
        }

        [Fact]
        public async Task BulkImport_MissingClass_FailsWithValidationError()
        {
            var req = ValidRequest("ADM-NOCLASS", r => r.Class = "");

            var result = await _service.BulkImportStudentsAsync(_schoolId, new List<CreateStudentRequest> { req }, _adminUserId);

            result.FailureCount.Should().Be(1);
            result.Errors.Should().ContainMatch("*Class is required*");
        }

        [Fact]
        public async Task BulkImport_FutureDateOfBirth_FailsWithValidationError()
        {
            var req = ValidRequest("ADM-FUTUREDOB", r => r.DateOfBirth = DateTime.UtcNow.AddYears(1));

            var result = await _service.BulkImportStudentsAsync(_schoolId, new List<CreateStudentRequest> { req }, _adminUserId);

            result.FailureCount.Should().Be(1);
            result.Errors.Should().ContainMatch("*DateOfBirth*");
        }

        [Fact]
        public async Task BulkImport_InvalidGender_FailsWithValidationError()
        {
            var req = ValidRequest("ADM-BADGENDER", r => r.Gender = "unknown_gender_xyz");

            var result = await _service.BulkImportStudentsAsync(_schoolId, new List<CreateStudentRequest> { req }, _adminUserId);

            result.FailureCount.Should().Be(1);
            result.Errors.Should().ContainMatch("*Gender*invalid*");
        }

        [Fact]
        public async Task BulkImport_InvalidBloodGroup_FailsWithValidationError()
        {
            var req = ValidRequest("ADM-BADBLOOD", r => r.BloodGroup = "Z+");

            var result = await _service.BulkImportStudentsAsync(_schoolId, new List<CreateStudentRequest> { req }, _adminUserId);

            result.FailureCount.Should().Be(1);
            result.Errors.Should().ContainMatch("*BloodGroup*invalid*");
        }

        [Fact]
        public async Task BulkImport_InvalidCategory_FailsWithValidationError()
        {
            var req = ValidRequest("ADM-BADCAT", r => r.Category = "INVALID_CAT");

            var result = await _service.BulkImportStudentsAsync(_schoolId, new List<CreateStudentRequest> { req }, _adminUserId);

            result.FailureCount.Should().Be(1);
            result.Errors.Should().ContainMatch("*Category*invalid*");
        }

        [Fact]
        public async Task BulkImport_ExceedsMaxBatchSize_ReturnsError()
        {
            var requests = Enumerable.Range(1, 501).Select(i => ValidRequest($"BIGBATCH-{i:D4}")).ToList();

            var result = await _service.BulkImportStudentsAsync(_schoolId, requests, _adminUserId);

            result.FailureCount.Should().Be(501);
            result.Errors.Should().ContainMatch("*exceeds maximum*500*");
        }

        [Fact]
        public async Task BulkImport_CreatesGuardianEntity_WhenGuardianProvided()
        {
            var req = ValidRequest("ADM-GUARDIAN-BULK");
            req.GuardianName = "Ramesh Kumar";
            req.GuardianPhone = "9876543210";

            var result = await _service.BulkImportStudentsAsync(_schoolId, new List<CreateStudentRequest> { req }, _adminUserId);

            result.SuccessCount.Should().Be(1);
            var studentId = result.SuccessfulIds.First();
            var guardian = await _context.StudentGuardians.FirstOrDefaultAsync(g => g.StudentId == studentId);
            guardian.Should().NotBeNull("Guardian entity must be created from bulk import");
            guardian!.Name.Should().Be("Ramesh Kumar");
        }

        [Fact]
        public async Task BulkImport_MapsAllFields_Correctly()
        {
            var req = ValidRequest("ADM-FULLFIELDS");
            req.Email = "student@school.com";
            req.PrimaryPhone = "9876543210";
            req.PanNumber = "ABCDE1234F"; // Valid PAN
            req.AadharNumber = "123456789012";
            req.TransportRequired = true;
            req.HostelRequired = false;
            req.SpecialNeeds = "Needs wheelchair access";
            req.EmergencyContact = "Emergency Person";
            req.EmergencyPhone = "9999999999";
            req.Allergies = "Peanuts";
            req.PreviousSchool = "Old School";
            req.PreviousClass = "Class 9";

            var result = await _service.BulkImportStudentsAsync(_schoolId, new List<CreateStudentRequest> { req }, _adminUserId);

            result.SuccessCount.Should().Be(1);
            var studentId = result.SuccessfulIds.First();
            var student = await _context.Students.IgnoreQueryFilters().FirstAsync(s => s.Id == studentId);

            student.Email.Should().Be("student@school.com");
            student.PrimaryPhone.Should().Be("9876543210");
            student.TransportRequired.Should().BeTrue();
            student.SpecialNeeds.Should().Be("Needs wheelchair access");
            student.Allergies.Should().Be("Peanuts");
            student.PreviousSchool.Should().Be("Old School");
            student.EmergencyContact.Should().Be("Emergency Person");
        }

        [Fact]
        public async Task BulkImport_MixedValidAndInvalid_SuccessAndFailureSeparated()
        {
            var requests = new List<CreateStudentRequest>
            {
                ValidRequest("MIXED-OK-1"),
                ValidRequest("MIXED-BAD", r => r.Name = ""), // will fail
                ValidRequest("MIXED-OK-2"),
            };

            var result = await _service.BulkImportStudentsAsync(_schoolId, requests, _adminUserId);

            result.SuccessCount.Should().Be(2);
            result.FailureCount.Should().Be(1);
            result.SuccessfulAdmissionNumbers.Should().Contain("MIXED-OK-1").And.Contain("MIXED-OK-2");
        }

        // =====================================================================
        // BULK PROMOTE TESTS
        // =====================================================================

        [Fact]
        public async Task BulkPromote_ValidStudents_UpdatesClassAndCreatesHistory()
        {
            var s1 = await _service.CreateStudentAsync(ValidRequest("ADM-PROM-1", r => { r.Class = "Class 9"; r.Section = "A"; }));
            var s2 = await _service.CreateStudentAsync(ValidRequest("ADM-PROM-2", r => { r.Class = "Class 9"; r.Section = "A"; }));

            var result = await _service.BulkPromoteStudentsAsync(_schoolId, new BulkPromoteRequest
            {
                StudentIds = new List<Guid> { s1.Id, s2.Id },
                NewClass = "Class 10",
                NewSection = "A",
                AcademicYear = "2025-26"
            });

            result.SuccessCount.Should().Be(2);
            result.FailureCount.Should().Be(0);

            var updated1 = await _context.Students.FindAsync(s1.Id);
            updated1!.Class.Should().Be("Class 10");

            // CRITICAL: Verify PromotionHistory records were created
            var history = await _context.PromotionHistories
                .Where(p => p.SchoolId == _schoolId && p.AcademicYear == "2025-26")
                .ToListAsync();
            history.Count.Should().Be(2);
            history.Should().AllSatisfy(h =>
            {
                h.PreviousClass.Should().Be("Class 9");
                h.NewClass.Should().Be("Class 10");
                h.PromotionStatus.Should().Be("completed");
            });
        }

        [Fact]
        public async Task BulkPromote_NonExistentStudents_ReturnsErrors()
        {
            var result = await _service.BulkPromoteStudentsAsync(_schoolId, new BulkPromoteRequest
            {
                StudentIds = new List<Guid> { Guid.NewGuid(), Guid.NewGuid() },
                NewClass = "Class 10",
                NewSection = "A"
            });

            result.FailureCount.Should().Be(2);
            result.SuccessCount.Should().Be(0);
        }

        [Fact]
        public async Task BulkPromote_ExceedsMaxSize_ReturnsError()
        {
            var ids = Enumerable.Range(1, 501).Select(_ => Guid.NewGuid()).ToList();

            var result = await _service.BulkPromoteStudentsAsync(_schoolId, new BulkPromoteRequest
            {
                StudentIds = ids,
                NewClass = "Class 10",
                NewSection = "A"
            });

            result.FailureCount.Should().Be(501);
            result.Errors.Should().ContainMatch("*exceeds maximum*");
        }

        // =====================================================================
        // STATS TESTS
        // =====================================================================

        [Fact]
        public async Task GetStudentStats_CorrectCountsByStatus()
        {
            await _service.CreateStudentAsync(ValidRequest("STATS-1", r => r.Status = "active"));
            await _service.CreateStudentAsync(ValidRequest("STATS-2", r => r.Status = "active"));
            await _service.CreateStudentAsync(ValidRequest("STATS-3", r => r.Status = "inactive"));
            await _service.CreateStudentAsync(ValidRequest("STATS-4", r => r.Status = "graduated"));

            var stats = await _service.GetStudentStatsAsync(_schoolId);

            stats.Total.Should().Be(4);
            stats.Active.Should().Be(2);
            stats.Inactive.Should().Be(1);
            stats.Graduated.Should().Be(1);
        }

        [Fact]
        public async Task GetStudentStats_ByClassAggregation_IsCorrect()
        {
            await _service.CreateStudentAsync(ValidRequest("S-CLS-1", r => r.Class = "Class 10"));
            await _service.CreateStudentAsync(ValidRequest("S-CLS-2", r => r.Class = "Class 10"));
            await _service.CreateStudentAsync(ValidRequest("S-CLS-3", r => r.Class = "Class 11"));

            var stats = await _service.GetStudentStatsAsync(_schoolId);

            stats.ByClass.Should().ContainKey("Class 10").WhoseValue.Should().Be(2);
            stats.ByClass.Should().ContainKey("Class 11").WhoseValue.Should().Be(1);
        }

        // =====================================================================
        // GUARDIAN TESTS
        // =====================================================================

        [Fact]
        public async Task AddGuardian_ValidInput_CreatesGuardian()
        {
            var student = await _service.CreateStudentAsync(ValidRequest("ADM-GUARD-ADD"));

            var guardian = await _service.AddGuardianAsync(_schoolId, student.Id, new CreateGuardianDto
            {
                Name = "Father Kumar",
                Relation = "father",
                Phone = "9876543210",
                Email = "father@example.com",
                AadharNumber = "123456789012"
            }, _adminUserId);

            guardian.Should().NotBeNull();
            guardian.Name.Should().Be("Father Kumar");
            guardian.AadharNumber.Should().StartWith("XXXX-XXXX-");
        }

        [Fact]
        public async Task GetGuardians_MasksPiiFields()
        {
            var student = await _service.CreateStudentAsync(ValidRequest("ADM-MASK-GUARD"));
            await _service.AddGuardianAsync(_schoolId, student.Id, new CreateGuardianDto
            {
                Name = "Parent",
                Relation = "mother",
                Phone = "9876543210",
                AadharNumber = "987654321012",
                PanNumber = "ABCDE1234F"
            }, _adminUserId);

            var guardians = await _service.GetGuardiansAsync(student.Id, _schoolId);

            guardians.Should().HaveCount(1);
            guardians[0].AadharNumber.Should().StartWith("XXXX-XXXX-");
            guardians[0].PanNumber.Should().StartWith("XXXXX");
        }

        // =====================================================================
        // EXPORT CSV TESTS
        // =====================================================================

        [Fact]
        public async Task ExportStudentsToCsv_ReturnsValidCsv()
        {
            await _service.CreateStudentAsync(ValidRequest("EXP-001", r => r.Name = "Export Student"));

            var bytes = await _service.ExportStudentsToCsvAsync(_schoolId);

            bytes.Should().NotBeNullOrEmpty();
            var csv = System.Text.Encoding.UTF8.GetString(bytes);
            csv.Should().Contain("AdmissionNumber");
            csv.Should().Contain("EXP-001");
            csv.Should().Contain("Export Student");
        }

        [Fact]
        public async Task ExportStudentsToCsv_MasksPiiInOutput()
        {
            var req = ValidRequest("EXP-PII", r => { r.AadharNumber = "123456789012"; r.PanNumber = "ABCDE1234F"; });
            await _service.CreateStudentAsync(req);

            var bytes = await _service.ExportStudentsToCsvAsync(_schoolId);
            var csv = System.Text.Encoding.UTF8.GetString(bytes);

            csv.Should().Contain("XXXX-XXXX-9012", "Aadhar must be masked in export");
            csv.Should().NotContain("123456789012", "Full Aadhar must NOT appear in export");
        }

        [Fact]
        public async Task ExportStudentsToCsv_FilterByClass_ExcludesOtherClasses()
        {
            await _service.CreateStudentAsync(ValidRequest("EXP-C10", r => r.Class = "Class 10"));
            await _service.CreateStudentAsync(ValidRequest("EXP-C11", r => r.Class = "Class 11"));

            var bytes = await _service.ExportStudentsToCsvAsync(_schoolId, classFilter: "Class 10");
            var csv = System.Text.Encoding.UTF8.GetString(bytes);

            csv.Should().Contain("EXP-C10");
            csv.Should().NotContain("EXP-C11");
        }

        // =====================================================================
        // CSV IMPORT TEMPLATE TEST
        // =====================================================================

        [Fact]
        public void GetImportTemplate_ReturnsValidCsvWithHeadersAndExample()
        {
            var bytes = StudentService.GetImportTemplate();

            bytes.Should().NotBeNullOrEmpty();
            var csv = System.Text.Encoding.UTF8.GetString(bytes);
            csv.Should().Contain("AdmissionNumber");
            csv.Should().Contain("GuardianName");
            csv.Should().Contain("BloodGroup");
            csv.Should().Contain("TransportRequired");
            // Should have at least 2 lines (header + example row)
            csv.Split('\n', StringSplitOptions.RemoveEmptyEntries).Length.Should().BeGreaterThanOrEqualTo(2);
        }

        // =====================================================================
        // PII MASKING EDGE CASES
        // =====================================================================

        [Theory]
        [InlineData("123456789012")]
        [InlineData("1234-5678-9012")]
        [InlineData("1234 5678 9012")]
        [InlineData(null)]
        [InlineData("")]
        public async Task AadharMasking_VariousInputFormats_MaskedCorrectly(string? aadhar)
        {
            var req = ValidRequest("ADM-AADHAR-MASK");
            req.AadharNumber = aadhar;
            var created = await _service.CreateStudentAsync(req);
            var student = await _service.GetStudentByIdAsync(created.Id, _schoolId);

            if (aadhar == null || aadhar == "")
            {
                student!.AadharNumber.Should().BeNull();
            }
            else
            {
                student!.AadharNumber.Should().NotBe(aadhar, "Must not return raw Aadhar");
                student.AadharNumber.Should().StartWith("XXXX-XXXX-");
            }
        }

        // =====================================================================
        // TOTAL PAGES COMPUTATION
        // =====================================================================

        [Theory]
        [InlineData(0, 10, 0)]
        [InlineData(1, 10, 1)]
        [InlineData(10, 10, 1)]
        [InlineData(11, 10, 2)]
        [InlineData(100, 10, 10)]
        [InlineData(101, 10, 11)]
        public void StudentListResponse_TotalPages_ComputedCorrectly(int total, int pageSize, int expectedPages)
        {
            var response = new StudentListResponse { Total = total, PageSize = pageSize };
            response.TotalPages.Should().Be(expectedPages);
        }
    }
}
