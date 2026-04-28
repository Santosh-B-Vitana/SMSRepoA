using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;
using SmsApi.Services;
using Xunit;

namespace SmsApi.Tests.Unit.Admissions
{
    public class TestLogger<T> : ILogger<T>
    {
        public IDisposable BeginScope<TState>(TState state) => null!;
        public bool IsEnabled(LogLevel logLevel) => true;
        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception,
            Func<TState, Exception?, string> formatter) { }
    }

    public class AdmissionServiceTests : IDisposable
    {
        private readonly AppDbContext _context;
        private readonly AdmissionService _service;
        private readonly Guid _schoolId = Guid.NewGuid();
        private readonly Guid _userId  = Guid.NewGuid();

        // Pre-seeded admission IDs
        private readonly Guid _pendingId    = Guid.NewGuid();
        private readonly Guid _approvedId   = Guid.NewGuid();
        private readonly Guid _rejectedId   = Guid.NewGuid();
        private readonly Guid _waitlistedId = Guid.NewGuid();
        private readonly Guid _interviewedId= Guid.NewGuid();
        private readonly Guid _enrolledId   = Guid.NewGuid();

        public AdmissionServiceTests()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options;

            _context = new AppDbContext(options);
            _service = new AdmissionService(_context, new TestLogger<AdmissionService>());
            SeedData().GetAwaiter().GetResult();
        }

        public void Dispose() => _context?.Dispose();

        // ==============================================
        // SEED DATA
        // ==============================================

        private async Task SeedData()
        {
            var school = new School
            {
                Id = _schoolId,
                Name = "Test School",
                SchoolCode = "TST001",
                Address = "123 Test St",
                Phone = "9876543210",
                Email = "school@test.com",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Schools.Add(school);

            var admissions = new[]
            {
                MakeAdmission(_pendingId,     "pending",     "APP001", "1",  "Alice",  "Smith"),
                MakeAdmission(_approvedId,    "approved",    "APP002", "5",  "Bob",    "Jones"),
                MakeAdmission(_rejectedId,    "rejected",    "APP003", "10", "Carol",  "Brown"),
                MakeAdmission(_waitlistedId,  "waitlisted",  "APP004", "1",  "David",  "Wilson"),
                MakeAdmission(_interviewedId, "interviewed", "APP005", "6",  "Emma",   "Davis"),
                MakeAdmission(_enrolledId,    "enrolled",    "APP006", "9",  "Frank",  "Miller"),
            };
            _context.Admissions.AddRange(admissions);
            await _context.SaveChangesAsync();
        }

        private Admission MakeAdmission(Guid id, string status, string appNum, string cls,
            string firstName, string lastName)
        {
            return new Admission
            {
                Id = id,
                SchoolId = _schoolId,
                ApplicationNumber = appNum,
                FirstName = firstName,
                LastName = lastName,
                DateOfBirth = new DateTime(2015, 6, 1),
                Gender = "male",
                ParentName = "Parent Name",
                ParentPhone = "9876543210",
                ParentEmail = "parent@test.com",
                ApplyingForClass = cls,
                AcademicYear = "2025/2025-26",
                ApplicationDate = DateTime.UtcNow.AddDays(-10),
                Status = status,
                Address = "123 Test Street",
                CreatedAt = DateTime.UtcNow.AddDays(-10),
                UpdatedAt = DateTime.UtcNow.AddDays(-10)
            };
        }

        private CreateAdmissionDto ValidCreateDto(
            string firstName = "TestFirst",
            string lastName  = "TestLast",
            string cls       = "1",
            string gender    = "male",
            string category  = "general",
            string year      = "2025-26") => new CreateAdmissionDto
        {
            SchoolId        = _schoolId,
            FirstName       = firstName,
            LastName        = lastName,
            DateOfBirth     = new DateTime(2016, 1, 1),   // ~9 years old, valid for class 1
            Gender          = gender,
            Category        = category,
            GuardianName    = "Guardian Name",
            GuardianRelation= "Father",
            GuardianPhone   = "9876543210",
            Address         = "123 Test Street",
            AppliedClass    = cls,
            AcademicYear    = year
        };

        // ==============================================
        // GetApplicationsAsync
        // ==============================================

        [Fact]
        public async Task GetApplicationsAsync_ReturnsOnlySchoolApplications()
        {
            var otherSchoolId = Guid.NewGuid();
            var result = await _service.GetApplicationsAsync(otherSchoolId,
                new AdmissionFiltersDto(), 1, 20);
            result.Items.Should().BeEmpty();
            result.TotalCount.Should().Be(0);
        }

        [Fact]
        public async Task GetApplicationsAsync_ReturnsAllApplications()
        {
            var result = await _service.GetApplicationsAsync(_schoolId,
                new AdmissionFiltersDto(), 1, 20);
            result.Items.Should().HaveCount(6);
            result.TotalCount.Should().Be(6);
        }

        [Fact]
        public async Task GetApplicationsAsync_FiltersByStatus()
        {
            var result = await _service.GetApplicationsAsync(_schoolId,
                new AdmissionFiltersDto { Status = "pending" }, 1, 20);
            result.Items.Should().HaveCount(1);
            result.Items[0].Status.Should().Be("pending");
        }

        [Fact]
        public async Task GetApplicationsAsync_FiltersByClass()
        {
            var result = await _service.GetApplicationsAsync(_schoolId,
                new AdmissionFiltersDto { Class = "1" }, 1, 20);
            result.Items.Should().HaveCount(2); // pending + waitlisted are both class 1
        }

        [Fact]
        public async Task GetApplicationsAsync_FiltersBySearchTerm_ByName()
        {
            var result = await _service.GetApplicationsAsync(_schoolId,
                new AdmissionFiltersDto { SearchTerm = "alice" }, 1, 20);
            result.Items.Should().HaveCount(1);
            result.Items[0].StudentName.Should().Contain("Alice");
        }

        [Fact]
        public async Task GetApplicationsAsync_FiltersBySearchTerm_ByAppNumber()
        {
            var result = await _service.GetApplicationsAsync(_schoolId,
                new AdmissionFiltersDto { SearchTerm = "APP002" }, 1, 20);
            result.Items.Should().HaveCount(1);
            result.Items[0].ApplicationNumber.Should().Be("APP002");
        }

        [Fact]
        public async Task GetApplicationsAsync_NormalizesPageBelow1()
        {
            var result = await _service.GetApplicationsAsync(_schoolId,
                new AdmissionFiltersDto(), 0, 20);
            result.Page.Should().Be(1);
        }

        [Fact]
        public async Task GetApplicationsAsync_NormalizesPageSizeAbove100()
        {
            var result = await _service.GetApplicationsAsync(_schoolId,
                new AdmissionFiltersDto(), 1, 200);
            result.PageSize.Should().Be(100);
        }

        [Fact]
        public async Task GetApplicationsAsync_NormalizesPageSizeBelow1()
        {
            var result = await _service.GetApplicationsAsync(_schoolId,
                new AdmissionFiltersDto(), 1, 0);
            result.PageSize.Should().Be(10);
        }

        [Fact]
        public async Task GetApplicationsAsync_PaginationWorks()
        {
            var page1 = await _service.GetApplicationsAsync(_schoolId,
                new AdmissionFiltersDto(), 1, 2);
            var page2 = await _service.GetApplicationsAsync(_schoolId,
                new AdmissionFiltersDto(), 2, 2);

            page1.Items.Should().HaveCount(2);
            page2.Items.Should().HaveCount(2);
            page1.Items[0].Id.Should().NotBe(page2.Items[0].Id);
            page1.TotalPages.Should().Be(3);
        }

        // ==============================================
        // GetApplicationByIdAsync
        // ==============================================

        [Fact]
        public async Task GetApplicationByIdAsync_ReturnsCorrectApplication()
        {
            var result = await _service.GetApplicationByIdAsync(_schoolId, _pendingId);
            result.Should().NotBeNull();
            result!.Id.Should().Be(_pendingId);
            result.FirstName.Should().Be("Alice");
        }

        [Fact]
        public async Task GetApplicationByIdAsync_ReturnsNull_WhenNotFound()
        {
            var result = await _service.GetApplicationByIdAsync(_schoolId, Guid.NewGuid());
            result.Should().BeNull();
        }

        [Fact]
        public async Task GetApplicationByIdAsync_ReturnsNull_WhenWrongSchool()
        {
            var result = await _service.GetApplicationByIdAsync(Guid.NewGuid(), _pendingId);
            result.Should().BeNull();
        }

        // ==============================================
        // CreateApplicationAsync - Happy Path
        // ==============================================

        [Fact]
        public async Task CreateApplicationAsync_CreatesSuccessfully()
        {
            var dto = ValidCreateDto();
            var result = await _service.CreateApplicationAsync(_schoolId, dto, _userId);
            result.Should().NotBeNull();
            result.Status.Should().Be("pending");
            result.FirstName.Should().Be("TestFirst");
            result.AppliedClass.Should().Be("1");
        }

        [Fact]
        public async Task CreateApplicationAsync_ApplicationNumberIsUnique()
        {
            var r1 = await _service.CreateApplicationAsync(_schoolId, ValidCreateDto(), _userId);
            var r2 = await _service.CreateApplicationAsync(_schoolId,
                ValidCreateDto("Second", "Student"), _userId);
            r1.ApplicationNumber.Should().NotBe(r2.ApplicationNumber);
        }

        // ==============================================
        // CreateApplicationAsync - Name Validation
        // ==============================================

        [Fact]
        public async Task CreateApplicationAsync_ThrowsArgumentException_WhenFirstNameTooShort()
        {
            var dto = ValidCreateDto(firstName: "A");
            var act = async () => await _service.CreateApplicationAsync(_schoolId, dto, _userId);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*first name*");
        }

        [Fact]
        public async Task CreateApplicationAsync_ThrowsArgumentException_WhenFirstNameTooLong()
        {
            var dto = ValidCreateDto(firstName: new string('A', 101));
            var act = async () => await _service.CreateApplicationAsync(_schoolId, dto, _userId);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*first name*");
        }

        [Fact]
        public async Task CreateApplicationAsync_ThrowsArgumentException_WhenLastNameEmpty()
        {
            var dto = ValidCreateDto(lastName: "");
            var act = async () => await _service.CreateApplicationAsync(_schoolId, dto, _userId);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*last name*");
        }

        // ==============================================
        // CreateApplicationAsync - Gender Validation
        // ==============================================

        [Fact]
        public async Task CreateApplicationAsync_ThrowsArgumentException_WhenInvalidGender()
        {
            var dto = ValidCreateDto(gender: "unknown");
            var act = async () => await _service.CreateApplicationAsync(_schoolId, dto, _userId);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*gender*");
        }

        [Theory]
        [InlineData("male")]
        [InlineData("female")]
        [InlineData("other")]
        public async Task CreateApplicationAsync_AcceptsValidGenders(string gender)
        {
            var dto = ValidCreateDto(gender: gender);
            var result = await _service.CreateApplicationAsync(_schoolId, dto, _userId);
            result.Should().NotBeNull();
        }

        // ==============================================
        // CreateApplicationAsync - Category Validation
        // ==============================================

        [Fact]
        public async Task CreateApplicationAsync_ThrowsArgumentException_WhenInvalidCategory()
        {
            var dto = ValidCreateDto(category: "xyz");
            var act = async () => await _service.CreateApplicationAsync(_schoolId, dto, _userId);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*category*");
        }

        [Theory]
        [InlineData("general")]
        [InlineData("obc")]
        [InlineData("sc")]
        [InlineData("st")]
        [InlineData("ews")]
        public async Task CreateApplicationAsync_AcceptsValidCategories(string category)
        {
            var dto = ValidCreateDto(category: category);
            var result = await _service.CreateApplicationAsync(_schoolId, dto, _userId);
            result.Should().NotBeNull();
        }

        // ==============================================
        // CreateApplicationAsync - Academic Year Validation
        // ==============================================

        [Theory]
        [InlineData("2025/2025-26")]
        [InlineData("abcd/abcd-ab")]
        [InlineData("")]
        public async Task CreateApplicationAsync_ThrowsArgumentException_WhenInvalidAcademicYear(string year)
        {
            var dto = ValidCreateDto(year: year);
            var act = async () => await _service.CreateApplicationAsync(_schoolId, dto, _userId);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*Academic year*");
        }

        [Theory]
        [InlineData("2025-26")]
        [InlineData("2024-25")]
        [InlineData("2025")]
        public async Task CreateApplicationAsync_AcceptsValidAcademicYear(string year)
        {
            var dto = ValidCreateDto(year: year);
            var result = await _service.CreateApplicationAsync(_schoolId, dto, _userId);
            result.Should().NotBeNull();
        }

        // ==============================================
        // CreateApplicationAsync - DOB Validation
        // ==============================================

        [Fact]
        public async Task CreateApplicationAsync_ThrowsArgumentException_WhenDOBIsFuture()
        {
            var dto = ValidCreateDto();
            dto.DateOfBirth = DateTime.UtcNow.AddDays(1);
            var act = async () => await _service.CreateApplicationAsync(_schoolId, dto, _userId);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*Date of birth*");
        }

        [Fact]
        public async Task CreateApplicationAsync_ThrowsArgumentException_WhenStudentTooOld()
        {
            var dto = ValidCreateDto();
            dto.DateOfBirth = DateTime.UtcNow.AddYears(-26);  // 26 years old
            var act = async () => await _service.CreateApplicationAsync(_schoolId, dto, _userId);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*Date of birth*");
        }

        // ==============================================
        // CreateApplicationAsync - Duplicate Detection
        // ==============================================

        [Fact]
        public async Task CreateApplicationAsync_ThrowsInvalidOperationException_WhenDuplicateApplication()
        {
            // First application succeeds
            await _service.CreateApplicationAsync(_schoolId, ValidCreateDto("Dup", "Student"), _userId);
            // Second application with same name+DOB+class+year should fail
            var dto2 = ValidCreateDto("Dup", "Student");
            var act = async () => await _service.CreateApplicationAsync(_schoolId, dto2, _userId);
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*application already exists*");
        }

        // ==============================================
        // UpdateStatusAsync - Happy Path
        // ==============================================

        [Fact]
        public async Task UpdateStatusAsync_PendingToApproved_Succeeds()
        {
            var result = await _service.UpdateStatusAsync(
                _schoolId, _pendingId, "approved", null, _userId);
            result.Should().BeTrue();
            var updated = await _context.Admissions.FindAsync(_pendingId);
            updated!.Status.Should().Be("approved");
        }

        [Fact]
        public async Task UpdateStatusAsync_PendingToInterviewed_Succeeds()
        {
            var result = await _service.UpdateStatusAsync(
                _schoolId, _pendingId, "interviewed", null, _userId);
            result.Should().BeTrue();
        }

        [Fact]
        public async Task UpdateStatusAsync_InterviewedToApproved_Succeeds()
        {
            var result = await _service.UpdateStatusAsync(
                _schoolId, _interviewedId, "approved", null, _userId);
            result.Should().BeTrue();
        }

        [Fact]
        public async Task UpdateStatusAsync_ApprovedToEnrolled_Succeeds()
        {
            var result = await _service.UpdateStatusAsync(
                _schoolId, _approvedId, "enrolled", null, _userId);
            result.Should().BeTrue();
        }

        // ==============================================
        // UpdateStatusAsync - Workflow Violations
        // ==============================================

        [Fact]
        public async Task UpdateStatusAsync_ThrowsInvalidOperation_WhenEnrolledToAnyStatus()
        {
            var act = async () => await _service.UpdateStatusAsync(
                _schoolId, _enrolledId, "pending", null, _userId);
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*transition*");
        }

        [Fact]
        public async Task UpdateStatusAsync_ThrowsInvalidOperation_WhenRejectedToApproved()
        {
            var act = async () => await _service.UpdateStatusAsync(
                _schoolId, _rejectedId, "approved", null, _userId);
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*transition*");
        }

        [Fact]
        public async Task UpdateStatusAsync_ThrowsInvalidOperation_WhenPendingToEnrolled()
        {
            // Direct pending→enrolled skips approve step
            var act = async () => await _service.UpdateStatusAsync(
                _schoolId, _pendingId, "enrolled", null, _userId);
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*transition*");
        }

        [Fact]
        public async Task UpdateStatusAsync_ThrowsArgumentException_WhenInvalidStatus()
        {
            var act = async () => await _service.UpdateStatusAsync(
                _schoolId, _pendingId, "bogus_status", null, _userId);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*status*");
        }

        [Fact]
        public async Task UpdateStatusAsync_ThrowsArgumentException_WhenEmptyStatus()
        {
            var act = async () => await _service.UpdateStatusAsync(
                _schoolId, _pendingId, "", null, _userId);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*status*");
        }

        [Fact]
        public async Task UpdateStatusAsync_ThrowsArgumentException_WhenRejectingWithoutReason()
        {
            var act = async () => await _service.UpdateStatusAsync(
                _schoolId, _pendingId, "rejected", null, _userId);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*reason*");
        }

        [Fact]
        public async Task UpdateStatusAsync_ThrowsKeyNotFound_WhenApplicationNotFound()
        {
            var act = async () => await _service.UpdateStatusAsync(
                _schoolId, Guid.NewGuid(), "approved", null, _userId);
            await act.Should().ThrowAsync<KeyNotFoundException>();
        }

        // ==============================================
        // ScheduleInterviewAsync
        // ==============================================

        [Fact]
        public async Task ScheduleInterviewAsync_Succeeds_WhenPending()
        {
            var result = await _service.ScheduleInterviewAsync(
                _schoolId, _pendingId, DateTime.UtcNow.AddDays(7), "Bring documents");
            result.Should().BeTrue();
            var updated = await _context.Admissions.FindAsync(_pendingId);
            updated!.InterviewDate.Should().NotBeNull();
        }

        [Fact]
        public async Task ScheduleInterviewAsync_Succeeds_WhenWaitlisted()
        {
            var result = await _service.ScheduleInterviewAsync(
                _schoolId, _waitlistedId, DateTime.UtcNow.AddDays(5), null);
            result.Should().BeTrue();
        }

        [Fact]
        public async Task ScheduleInterviewAsync_ThrowsArgumentException_WhenDateInPast()
        {
            var act = async () => await _service.ScheduleInterviewAsync(
                _schoolId, _pendingId, DateTime.UtcNow.AddDays(-1), null);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*future date*");
        }

        [Fact]
        public async Task ScheduleInterviewAsync_ThrowsArgumentException_WhenDateMoreThan1YearAway()
        {
            var act = async () => await _service.ScheduleInterviewAsync(
                _schoolId, _pendingId, DateTime.UtcNow.AddYears(1).AddDays(1), null);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*1 year*");
        }

        [Fact]
        public async Task ScheduleInterviewAsync_ThrowsInvalidOperation_WhenApplicationEnrolled()
        {
            var act = async () => await _service.ScheduleInterviewAsync(
                _schoolId, _enrolledId, DateTime.UtcNow.AddDays(3), null);
            await act.Should().ThrowAsync<InvalidOperationException>();
        }

        [Fact]
        public async Task ScheduleInterviewAsync_ThrowsKeyNotFound_WhenApplicationNotFound()
        {
            var act = async () => await _service.ScheduleInterviewAsync(
                _schoolId, Guid.NewGuid(), DateTime.UtcNow.AddDays(3), null);
            await act.Should().ThrowAsync<KeyNotFoundException>();
        }

        // ==============================================
        // ApproveApplicationAsync
        // ==============================================

        [Fact]
        public async Task ApproveApplicationAsync_Succeeds_WhenPending()
        {
            var result = await _service.ApproveApplicationAsync(_schoolId, _pendingId, _userId);
            result.Should().BeTrue();
            var updated = await _context.Admissions.FindAsync(_pendingId);
            updated!.Status.Should().Be("approved");
        }

        [Fact]
        public async Task ApproveApplicationAsync_Succeeds_WhenInterviewed()
        {
            var result = await _service.ApproveApplicationAsync(_schoolId, _interviewedId, _userId);
            result.Should().BeTrue();
        }

        [Fact]
        public async Task ApproveApplicationAsync_ThrowsInvalidOperation_WhenAlreadyEnrolled()
        {
            var act = async () => await _service.ApproveApplicationAsync(
                _schoolId, _enrolledId, _userId);
            await act.Should().ThrowAsync<InvalidOperationException>();
        }

        // ==============================================
        // RejectApplicationAsync
        // ==============================================

        [Fact]
        public async Task RejectApplicationAsync_Succeeds_WhenPending()
        {
            var result = await _service.RejectApplicationAsync(
                _schoolId, _pendingId, "Student does not meet criteria", _userId);
            result.Should().BeTrue();
            var updated = await _context.Admissions.FindAsync(_pendingId);
            updated!.Status.Should().Be("rejected");
        }

        [Fact]
        public async Task RejectApplicationAsync_ThrowsArgumentException_WhenReasonTooShort()
        {
            var act = async () => await _service.RejectApplicationAsync(
                _schoolId, _pendingId, "Ab", _userId);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*reason*");
        }

        [Fact]
        public async Task RejectApplicationAsync_ThrowsArgumentException_WhenReasonTooLong()
        {
            var act = async () => await _service.RejectApplicationAsync(
                _schoolId, _pendingId, new string('A', 501), _userId);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*reason*");
        }

        [Fact]
        public async Task RejectApplicationAsync_ThrowsArgumentException_WhenReasonEmpty()
        {
            var act = async () => await _service.RejectApplicationAsync(
                _schoolId, _pendingId, "", _userId);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*reason*");
        }

        // ==============================================
        // EnrollStudentAsync
        // ==============================================

        [Fact]
        public async Task EnrollStudentAsync_Succeeds_WhenApproved()
        {
            var admNum = "ADM-TEST-001";
            var result = await _service.EnrollStudentAsync(_schoolId, _approvedId, admNum, _userId);
            result.Should().BeTrue();
            var updated = await _context.Admissions.FindAsync(_approvedId);
            updated!.Status.Should().Be("enrolled");
        }

        [Fact]
        public async Task EnrollStudentAsync_CreatesStudentRecord()
        {
            var admNum = "ADM-TEST-002";
            await _service.EnrollStudentAsync(_schoolId, _approvedId, admNum, _userId);
            var student = await _context.Students
                .FirstOrDefaultAsync(s => s.SchoolId == _schoolId && s.AdmissionNumber == admNum);
            student.Should().NotBeNull();
            student!.FirstName.Should().Be("Bob");  // _approvedId is Bob Jones
        }

        [Fact]
        public async Task EnrollStudentAsync_ThrowsArgumentException_WhenAdmissionNumberEmpty()
        {
            var act = async () => await _service.EnrollStudentAsync(
                _schoolId, _approvedId, "", _userId);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*admission number*");
        }

        [Fact]
        public async Task EnrollStudentAsync_ThrowsInvalidOperation_WhenNotApproved()
        {
            var act = async () => await _service.EnrollStudentAsync(
                _schoolId, _pendingId, "ADM-X", _userId);
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*approved*");
        }

        [Fact]
        public async Task EnrollStudentAsync_ThrowsInvalidOperation_WhenAlreadyEnrolled()
        {
            var act = async () => await _service.EnrollStudentAsync(
                _schoolId, _enrolledId, "ADM-DUP", _userId);
            await act.Should().ThrowAsync<InvalidOperationException>();
        }

        [Fact]
        public async Task EnrollStudentAsync_ThrowsKeyNotFound_WhenApplicationNotFound()
        {
            var act = async () => await _service.EnrollStudentAsync(
                _schoolId, Guid.NewGuid(), "ADM-XXX", _userId);
            await act.Should().ThrowAsync<KeyNotFoundException>();
        }

        // ==============================================
        // GetApplicationStatsAsync
        // ==============================================

        [Fact]
        public async Task GetApplicationStatsAsync_ReturnsCorrectCounts()
        {
            var stats = await _service.GetApplicationStatsAsync(_schoolId);
            stats.Total.Should().Be(6);
            stats.Pending.Should().Be(1);
            stats.Approved.Should().Be(1);
            stats.Rejected.Should().Be(1);
            stats.Waitlisted.Should().Be(1);
            stats.Interviewed.Should().Be(1);
            stats.Enrolled.Should().Be(1);
        }

        [Fact]
        public async Task GetApplicationStatsAsync_ReturnsZeroCounts_WhenNoApplications()
        {
            var stats = await _service.GetApplicationStatsAsync(Guid.NewGuid());
            stats.Total.Should().Be(0);
            stats.Pending.Should().Be(0);
        }

        [Fact]
        public async Task GetApplicationStatsAsync_ByClass_ContainsAllClasses()
        {
            var stats = await _service.GetApplicationStatsAsync(_schoolId);
            stats.ByClass.Should().NotBeEmpty();
        }

        // ==============================================
        // GetDocumentsAsync
        // ==============================================

        [Fact]
        public async Task GetDocumentsAsync_ReturnsEmptyList_WhenNoDocuments()
        {
            var docs = await _service.GetDocumentsAsync(_schoolId, _pendingId);
            docs.Should().NotBeNull();
            docs.Should().BeEmpty();
        }

        [Fact]
        public async Task GetDocumentsAsync_ThrowsKeyNotFound_WhenApplicationNotFound()
        {
            var act = async () => await _service.GetDocumentsAsync(_schoolId, Guid.NewGuid());
            await act.Should().ThrowAsync<KeyNotFoundException>();
        }

        // ==============================================
        // UploadDocumentAsync
        // ==============================================

        [Fact]
        public async Task UploadDocumentAsync_UploadsSuccessfully()
        {
            var dto = new CreateAdmissionDocumentDto
            {
                DocumentType = "BirthCertificate",
                DocumentName = "Birth Certificate",
                FileUrl = "https://storage.example.com/docs/birth_cert.pdf"
            };
            var result = await _service.UploadDocumentAsync(_schoolId, _pendingId, dto);
            result.Should().NotBeNull();
            result.DocumentType.Should().Be("BirthCertificate");
        }

        [Fact]
        public async Task UploadDocumentAsync_ThrowsArgumentException_WhenDocumentTypeEmpty()
        {
            var dto = new CreateAdmissionDocumentDto
            {
                DocumentType = "",
                DocumentName  = "Test",
                FileUrl = "https://storage.example.com/doc.pdf"
            };
            var act = async () => await _service.UploadDocumentAsync(_schoolId, _pendingId, dto);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*document type*");
        }

        [Fact]
        public async Task UploadDocumentAsync_ThrowsArgumentException_WhenFileUrlEmpty()
        {
            var dto = new CreateAdmissionDocumentDto
            {
                DocumentType  = "IDProof",
                DocumentName  = "ID Proof",
                FileUrl = ""
            };
            var act = async () => await _service.UploadDocumentAsync(_schoolId, _pendingId, dto);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*file URL*");
        }

        [Fact]
        public async Task UploadDocumentAsync_ThrowsKeyNotFound_WhenApplicationNotFound()
        {
            var dto = new CreateAdmissionDocumentDto
            {
                DocumentType = "IDProof",
                DocumentName = "ID Proof",
                FileUrl = "https://storage.example.com/doc.pdf"
            };
            var act = async () => await _service.UploadDocumentAsync(_schoolId, Guid.NewGuid(), dto);
            await act.Should().ThrowAsync<KeyNotFoundException>();
        }

        // ==============================================
        // DeleteApplicationAsync
        // ==============================================

        [Fact]
        public async Task DeleteApplicationAsync_DeletesPendingSuccessfully()
        {
            var result = await _service.DeleteApplicationAsync(_schoolId, _pendingId);
            result.Should().BeTrue();
            // Uses soft-delete: entity remains but IsDeleted=true, so normal queries exclude it
            var softDeleted = await _context.Admissions
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.Id == _pendingId);
            softDeleted!.IsDeleted.Should().BeTrue();
        }

        [Fact]
        public async Task DeleteApplicationAsync_ReturnsFalse_WhenNotFound()
        {
            var result = await _service.DeleteApplicationAsync(_schoolId, Guid.NewGuid());
            result.Should().BeFalse();
        }

        [Fact]
        public async Task DeleteApplicationAsync_ThrowsInvalidOperation_WhenEnrolled()
        {
            var act = async () => await _service.DeleteApplicationAsync(_schoolId, _enrolledId);
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*enrolled*");
        }

        // ==============================================
        // UpdateApplicationAsync
        // ==============================================

        [Fact]
        public async Task UpdateApplicationAsync_UpdatesFieldsSuccessfully()
        {
            var dto = new UpdateAdmissionDto
            {
                GuardianName  = "New Guardian",
                GuardianPhone = "9111111111",
                Address       = "456 New Street"
            };
            var result = await _service.UpdateApplicationAsync(_schoolId, _pendingId, dto);
            result.Should().NotBeNull();
            result.GuardianName.Should().Be("New Guardian");
        }

        [Fact]
        public async Task UpdateApplicationAsync_ThrowsKeyNotFound_WhenNotFound()
        {
            var dto = new UpdateAdmissionDto { GuardianName = "Test" };
            var act = async () => await _service.UpdateApplicationAsync(
                _schoolId, Guid.NewGuid(), dto);
            await act.Should().ThrowAsync<KeyNotFoundException>();
        }
    }
}
