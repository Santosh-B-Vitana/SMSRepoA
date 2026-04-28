using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;
using SmsApi.Services;
using Xunit;

namespace SmsApi.Tests.Unit.Examination
{
    public class TestLogger<T> : ILogger<T>
    {
        public IDisposable BeginScope<TState>(TState state) => null!;
        public bool IsEnabled(LogLevel logLevel) => true;
        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter) { }
    }

    public class ExaminationServiceTests : IDisposable
    {
        private readonly AppDbContext _context;
        private readonly ExaminationService _service;
        private readonly Mock<IBoardConfigurationService> _boardServiceMock;
        private readonly Guid _testSchoolId = Guid.NewGuid();
        private readonly Guid _testExamId = Guid.NewGuid();
        private readonly Guid _testStudentId = Guid.NewGuid();
        private readonly Guid _testStudent2Id = Guid.NewGuid();

        public ExaminationServiceTests()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
                .Options;

            _context = new AppDbContext(options);
            var logger = new TestLogger<ExaminationService>();

            _boardServiceMock = new Mock<IBoardConfigurationService>();
            _boardServiceMock
                .Setup(b => b.CalculateGradeAsync(It.IsAny<Guid>(), It.IsAny<decimal>(), It.IsAny<string?>()))
                .ReturnsAsync((Guid _, decimal pct, string? _) => new BoardAwareGradeResult
                {
                    Grade = pct >= 90 ? "A1" : pct >= 80 ? "A2" : pct >= 70 ? "B1" : pct >= 60 ? "B2" :
                            pct >= 50 ? "C1" : pct >= 40 ? "C2" : pct >= 33 ? "D" : "F",
                    GradePoint = pct >= 90 ? 10m : pct >= 80 ? 9m : pct >= 70 ? 8m : pct >= 60 ? 7m :
                                 pct >= 50 ? 6m : pct >= 40 ? 5m : pct >= 33 ? 4m : 0m,
                    IsPassing = pct >= 33,
                    BoardCode = "CBSE",
                    GradingSystem = "CBSE"
                });
            _boardServiceMock
                .Setup(b => b.CalculateGradeAsync(It.IsAny<Guid>(), It.IsAny<decimal>(), It.IsAny<Guid?>(), It.IsAny<string?>()))
                .ReturnsAsync((Guid _, decimal pct, Guid? _, string? _) => new BoardAwareGradeResult
                {
                    Grade = pct >= 90 ? "A1" : pct >= 80 ? "A2" : pct >= 70 ? "B1" : pct >= 60 ? "B2" :
                            pct >= 50 ? "C1" : pct >= 40 ? "C2" : pct >= 33 ? "D" : "F",
                    GradePoint = pct >= 90 ? 10m : pct >= 80 ? 9m : pct >= 70 ? 8m : pct >= 60 ? 7m :
                                 pct >= 50 ? 6m : pct >= 40 ? 5m : pct >= 33 ? 4m : 0m,
                    IsPassing = pct >= 33,
                    BoardCode = "CBSE",
                    GradingSystem = "CBSE"
                });

            _service = new ExaminationService(_context, logger, _boardServiceMock.Object);
            SeedTestData().GetAwaiter().GetResult();
        }

        public void Dispose() => _context?.Dispose();

        private async Task SeedTestData()
        {
            var school = new School
            {
                Id = _testSchoolId,
                Name = "Test School",
                SchoolCode = "TEST001",
                Address = "123 Test St",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Schools.Add(school);

            var student = new Student
            {
                Id = _testStudentId,
                SchoolId = _testSchoolId,
                Name = "John Doe",
                FirstName = "John",
                LastName = "Doe",
                AdmissionNumber = "ADM001",
                Class = "10",
                Section = "A",
                RollNumber = "1",
                DateOfBirth = new DateTime(2010, 1, 1),
                Status = "active",
                IsActive = true,
                AdmissionDate = DateTime.UtcNow.AddYears(-1),
                Address = "Test Address",
                GuardianName = "Guardian",
                GuardianPhone = "1234567890",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Students.Add(student);

            var student2 = new Student
            {
                Id = _testStudent2Id,
                SchoolId = _testSchoolId,
                Name = "Jane Smith",
                FirstName = "Jane",
                LastName = "Smith",
                AdmissionNumber = "ADM002",
                Class = "10",
                Section = "A",
                RollNumber = "2",
                DateOfBirth = new DateTime(2010, 6, 15),
                Status = "active",
                IsActive = true,
                AdmissionDate = DateTime.UtcNow.AddYears(-1),
                Address = "Test Address 2",
                GuardianName = "Guardian 2",
                GuardianPhone = "9876543210",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Students.Add(student2);

            var exam = new Exam
            {
                Id = _testExamId,
                SchoolId = _testSchoolId,
                Name = "Unit Test 1 - Mathematics",
                Class = "10",
                Section = "A",
                Subject = "Mathematics",
                ExamDate = DateTime.UtcNow.AddDays(7),
                TotalMarks = 100,
                PassingMarks = 33,
                AcademicYear = "2025-26",
                Term = 1,
                Status = "scheduled",
                Duration = 180,
                StartTime = "09:00",
                EndTime = "12:00",
                Venue = "Hall A",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Examinations.Add(exam);

            // Register students for the exam
            _context.ExamRegistrations.Add(new ExamRegistration
            {
                Id = Guid.NewGuid(),
                SchoolId = _testSchoolId,
                ExamId = _testExamId,
                StudentId = _testStudentId,
                Status = "registered",
                RegisteredAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });

            _context.ExamRegistrations.Add(new ExamRegistration
            {
                Id = Guid.NewGuid(),
                SchoolId = _testSchoolId,
                ExamId = _testExamId,
                StudentId = _testStudent2Id,
                Status = "registered",
                RegisteredAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
        }

        private CreateExamDto CreateValidExamDto(string name = "Quarterly Exam - Science") => new()
        {
            SchoolId = _testSchoolId,
            Name = name,
            Class = "10",
            Section = "A",
            Subject = "Science",
            AcademicYear = "2025-26",
            Term = 1,
            Date = DateTime.UtcNow.AddDays(14),
            StartTime = "09:00",
            EndTime = "12:00",
            Duration = 180,
            MaxMarks = 100,
            PassingMarks = 33,
            Room = "Hall B"
        };

        // ========== CREATE EXAM TESTS ==========

        [Fact]
        public async Task CreateExam_ValidData_ReturnsExamFullDto()
        {
            var dto = CreateValidExamDto();
            var result = await _service.CreateExamAsync(_testSchoolId, dto);

            result.Should().NotBeNull();
            result.Name.Should().Be("Quarterly Exam - Science");
            result.MaxMarks.Should().Be(100);
            result.PassingMarks.Should().Be(33);
            result.Status.Should().Be("scheduled");
        }

        [Fact]
        public async Task CreateExam_EmptyName_ThrowsArgumentException()
        {
            var dto = CreateValidExamDto();
            dto.Name = "";

            var act = () => _service.CreateExamAsync(_testSchoolId, dto);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*Exam name is required*");
        }

        [Fact]
        public async Task CreateExam_NameTooShort_ThrowsArgumentException()
        {
            var dto = CreateValidExamDto();
            dto.Name = "AB";

            var act = () => _service.CreateExamAsync(_testSchoolId, dto);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*at least 3 characters*");
        }

        [Fact]
        public async Task CreateExam_NameTooLong_ThrowsArgumentException()
        {
            var dto = CreateValidExamDto();
            dto.Name = new string('X', 201);

            var act = () => _service.CreateExamAsync(_testSchoolId, dto);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*cannot exceed 200 characters*");
        }

        [Fact]
        public async Task CreateExam_DuplicateName_ThrowsInvalidOperationException()
        {
            var dto = CreateValidExamDto("Unit Test 1 - Mathematics");
            dto.Subject = "Mathematics";

            var act = () => _service.CreateExamAsync(_testSchoolId, dto);
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*already exists*");
        }

        [Fact]
        public async Task CreateExam_ZeroMaxMarks_ThrowsArgumentException()
        {
            var dto = CreateValidExamDto();
            dto.MaxMarks = 0;

            var act = () => _service.CreateExamAsync(_testSchoolId, dto);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*Maximum marks must be greater than 0*");
        }

        [Fact]
        public async Task CreateExam_MaxMarksExceeds1000_ThrowsArgumentException()
        {
            var dto = CreateValidExamDto();
            dto.MaxMarks = 1001;

            var act = () => _service.CreateExamAsync(_testSchoolId, dto);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*cannot exceed 1000*");
        }

        [Fact]
        public async Task CreateExam_NegativePassingMarks_ThrowsArgumentException()
        {
            var dto = CreateValidExamDto();
            dto.PassingMarks = -1;

            var act = () => _service.CreateExamAsync(_testSchoolId, dto);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*Passing marks cannot be negative*");
        }

        [Fact]
        public async Task CreateExam_PassingMarksExceedMax_ThrowsArgumentException()
        {
            var dto = CreateValidExamDto();
            dto.PassingMarks = 101;
            dto.MaxMarks = 100;

            var act = () => _service.CreateExamAsync(_testSchoolId, dto);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*Passing marks cannot exceed maximum marks*");
        }

        [Fact]
        public async Task CreateExam_EmptyAcademicYear_ThrowsArgumentException()
        {
            var dto = CreateValidExamDto();
            dto.AcademicYear = "";

            var act = () => _service.CreateExamAsync(_testSchoolId, dto);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*Academic year is required*");
        }

        [Fact]
        public async Task CreateExam_InvalidTerm_ThrowsArgumentException()
        {
            var dto = CreateValidExamDto();
            dto.Term = 3;

            var act = () => _service.CreateExamAsync(_testSchoolId, dto);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*Term must be 0*");
        }

        [Fact]
        public async Task CreateExam_DurationTooLong_ThrowsArgumentException()
        {
            var dto = CreateValidExamDto();
            dto.Duration = 601;

            var act = () => _service.CreateExamAsync(_testSchoolId, dto);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*between 1 and 600 minutes*");
        }

        [Fact]
        public async Task CreateExam_DurationZero_ThrowsArgumentException()
        {
            var dto = CreateValidExamDto();
            dto.Duration = 0;

            var act = () => _service.CreateExamAsync(_testSchoolId, dto);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*between 1 and 600 minutes*");
        }

        [Fact]
        public async Task CreateExam_InvalidStartTimeFormat_ThrowsArgumentException()
        {
            var dto = CreateValidExamDto();
            dto.StartTime = "9am";

            var act = () => _service.CreateExamAsync(_testSchoolId, dto);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*HH:mm format*");
        }

        [Fact]
        public async Task CreateExam_EndTimeBeforeStartTime_ThrowsArgumentException()
        {
            var dto = CreateValidExamDto();
            dto.StartTime = "14:00";
            dto.EndTime = "12:00";

            var act = () => _service.CreateExamAsync(_testSchoolId, dto);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*End time must be after start time*");
        }

        [Fact]
        public async Task CreateExam_RoomTooLong_ThrowsArgumentException()
        {
            var dto = CreateValidExamDto();
            dto.Room = new string('X', 101);

            var act = () => _service.CreateExamAsync(_testSchoolId, dto);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*Room/venue name cannot exceed 100 characters*");
        }

        [Fact]
        public async Task CreateExam_InstructionsTooLong_ThrowsArgumentException()
        {
            var dto = CreateValidExamDto();
            dto.Instructions = new string('X', 2001);

            var act = () => _service.CreateExamAsync(_testSchoolId, dto);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*Instructions cannot exceed 2000 characters*");
        }

        [Fact]
        public async Task CreateExam_DateTooFarInPast_ThrowsArgumentException()
        {
            var dto = CreateValidExamDto();
            dto.Date = DateTime.UtcNow.AddYears(-6);

            var act = () => _service.CreateExamAsync(_testSchoolId, dto);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*more than 5 years in the past*");
        }

        [Fact]
        public async Task CreateExam_ValidTermValues_Succeeds()
        {
            // Term 0 = full year
            var dto0 = CreateValidExamDto("Full Year Exam");
            dto0.Term = 0;
            var r0 = await _service.CreateExamAsync(_testSchoolId, dto0);
            r0.Term.Should().Be(0);

            // Term 1
            var dto1 = CreateValidExamDto("Term 1 Exam");
            dto1.Term = 1;
            var r1 = await _service.CreateExamAsync(_testSchoolId, dto1);
            r1.Term.Should().Be(1);

            // Term 2
            var dto2 = CreateValidExamDto("Term 2 Exam");
            dto2.Term = 2;
            var r2 = await _service.CreateExamAsync(_testSchoolId, dto2);
            r2.Term.Should().Be(2);
        }

        // ========== GET EXAM TESTS ==========

        [Fact]
        public async Task GetExamById_ExistingExam_ReturnsExam()
        {
            var result = await _service.GetExamByIdAsync(_testSchoolId, _testExamId);

            result.Should().NotBeNull();
            result!.Name.Should().Be("Unit Test 1 - Mathematics");
            result.Class.Should().Be("10");
            result.Subject.Should().Be("Mathematics");
        }

        [Fact]
        public async Task GetExamById_NonExistentId_ReturnsNull()
        {
            var result = await _service.GetExamByIdAsync(_testSchoolId, Guid.NewGuid());
            result.Should().BeNull();
        }

        [Fact]
        public async Task GetExamById_WrongSchoolId_ReturnsNull()
        {
            var result = await _service.GetExamByIdAsync(Guid.NewGuid(), _testExamId);
            result.Should().BeNull();
        }

        // ========== GET EXAMS (PAGINATED) TESTS ==========

        [Fact]
        public async Task GetExams_PaginationNormalization_PageBelowOne()
        {
            var filters = new ExamFiltersDto();
            var result = await _service.GetExamsAsync(_testSchoolId, filters, -1, 20);

            result.Should().NotBeNull();
            result.Page.Should().Be(1); // Normalized from -1 to 1
        }

        [Fact]
        public async Task GetExams_PaginationNormalization_PageSizeAbove100()
        {
            var filters = new ExamFiltersDto();
            var result = await _service.GetExamsAsync(_testSchoolId, filters, 1, 200);

            result.Should().NotBeNull();
            result.PageSize.Should().Be(100); // Normalized from 200 to 100
        }

        [Fact]
        public async Task GetExams_FilterByStatus_ReturnsFiltered()
        {
            var filters = new ExamFiltersDto { Status = "scheduled" };
            var result = await _service.GetExamsAsync(_testSchoolId, filters, 1, 20);

            result.Items.Should().NotBeEmpty();
            result.Items.Should().OnlyContain(e => e.Status == "scheduled");
        }

        [Fact]
        public async Task GetExams_FilterByClass_ReturnsFiltered()
        {
            var filters = new ExamFiltersDto { Class = "10" };
            var result = await _service.GetExamsAsync(_testSchoolId, filters, 1, 20);

            result.Items.Should().NotBeEmpty();
            result.Items.Should().OnlyContain(e => e.Class == "10");
        }

        [Fact]
        public async Task GetExams_SchoolIsolation_ReturnsSameSchoolOnly()
        {
            var otherSchoolId = Guid.NewGuid();
            var filters = new ExamFiltersDto();
            var result = await _service.GetExamsAsync(otherSchoolId, filters, 1, 20);

            result.Items.Should().BeEmpty();
        }

        // ========== UPDATE EXAM TESTS ==========

        [Fact]
        public async Task UpdateExam_ValidData_ReturnsUpdatedExam()
        {
            var dto = CreateValidExamDto("Updated Mathematics Exam");
            dto.Subject = "Mathematics";
            dto.MaxMarks = 150;
            dto.PassingMarks = 50;

            var result = await _service.UpdateExamAsync(_testSchoolId, _testExamId, dto);

            result.Should().NotBeNull();
            result.Name.Should().Be("Updated Mathematics Exam");
            result.MaxMarks.Should().Be(150);
        }

        [Fact]
        public async Task UpdateExam_NonExistentExam_ThrowsKeyNotFoundException()
        {
            var dto = CreateValidExamDto();
            var act = () => _service.UpdateExamAsync(_testSchoolId, Guid.NewGuid(), dto);
            await act.Should().ThrowAsync<KeyNotFoundException>()
                .WithMessage("*Exam not found*");
        }

        [Fact]
        public async Task UpdateExam_CancelledExam_ThrowsInvalidOperationException()
        {
            // Set exam to cancelled
            var exam = await _context.Examinations.FindAsync(_testExamId);
            exam!.Status = "cancelled";
            await _context.SaveChangesAsync();

            var dto = CreateValidExamDto();
            var act = () => _service.UpdateExamAsync(_testSchoolId, _testExamId, dto);
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*Cannot update a cancelled exam*");

            // Reset
            exam.Status = "scheduled";
            await _context.SaveChangesAsync();
        }

        [Fact]
        public async Task UpdateExam_PublishedResults_ThrowsInvalidOperationException()
        {
            var exam = await _context.Examinations.FindAsync(_testExamId);
            exam!.Status = "results_published";
            await _context.SaveChangesAsync();

            var dto = CreateValidExamDto();
            var act = () => _service.UpdateExamAsync(_testSchoolId, _testExamId, dto);
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*Cannot update an exam with published results*");

            exam.Status = "scheduled";
            await _context.SaveChangesAsync();
        }

        [Fact]
        public async Task UpdateExam_EmptyName_ThrowsArgumentException()
        {
            var dto = CreateValidExamDto();
            dto.Name = "";
            var act = () => _service.UpdateExamAsync(_testSchoolId, _testExamId, dto);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*Exam name is required*");
        }

        [Fact]
        public async Task UpdateExam_InvalidTerm_ThrowsArgumentException()
        {
            var dto = CreateValidExamDto();
            dto.Term = -1;
            var act = () => _service.UpdateExamAsync(_testSchoolId, _testExamId, dto);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*Term must be 0*");
        }

        // ========== DELETE EXAM TESTS ==========

        [Fact]
        public async Task DeleteExam_ExistingExam_ReturnsTrue()
        {
            // Create a temp exam to delete
            var dto = CreateValidExamDto("Temp Exam for Deletion");
            var created = await _service.CreateExamAsync(_testSchoolId, dto);

            var result = await _service.DeleteExamAsync(_testSchoolId, created.Id);
            result.Should().BeTrue();
        }

        [Fact]
        public async Task DeleteExam_NonExistentExam_ReturnsFalse()
        {
            var result = await _service.DeleteExamAsync(_testSchoolId, Guid.NewGuid());
            result.Should().BeFalse();
        }

        // ========== CREATE RESULT TESTS ==========

        [Fact]
        public async Task CreateResult_ValidMarks_ReturnsResultDto()
        {
            var dto = new CreateResultDto
            {
                SchoolId = _testSchoolId,
                ExamId = _testExamId,
                StudentId = _testStudentId,
                MarksObtained = 85,
                IsAbsent = false
            };

            var result = await _service.CreateResultAsync(_testSchoolId, dto);

            result.Should().NotBeNull();
            result.MarksObtained.Should().Be(85);
            result.Percentage.Should().Be(85);
            result.IsPass.Should().BeTrue();
            result.IsAbsent.Should().BeFalse();
        }

        [Fact]
        public async Task CreateResult_AbsentStudent_ZeroMarks()
        {
            var dto = new CreateResultDto
            {
                SchoolId = _testSchoolId,
                ExamId = _testExamId,
                StudentId = _testStudent2Id,
                IsAbsent = true
            };

            var result = await _service.CreateResultAsync(_testSchoolId, dto);

            result.Should().NotBeNull();
            result.MarksObtained.Should().Be(0);
            result.IsAbsent.Should().BeTrue();
        }

        [Fact]
        public async Task CreateResult_NegativeMarks_ThrowsArgumentException()
        {
            var dto = new CreateResultDto
            {
                SchoolId = _testSchoolId,
                ExamId = _testExamId,
                StudentId = _testStudentId,
                MarksObtained = -5,
                IsAbsent = false
            };

            var act = () => _service.CreateResultAsync(_testSchoolId, dto);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*Marks obtained cannot be negative*");
        }

        [Fact]
        public async Task CreateResult_MarksExceedMax_ThrowsArgumentException()
        {
            var dto = new CreateResultDto
            {
                SchoolId = _testSchoolId,
                ExamId = _testExamId,
                StudentId = _testStudentId,
                MarksObtained = 150,
                IsAbsent = false
            };

            var act = () => _service.CreateResultAsync(_testSchoolId, dto);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*cannot exceed maximum marks*");
        }

        [Fact]
        public async Task CreateResult_DuplicateResult_ThrowsInvalidOperationException()
        {
            var dto = new CreateResultDto
            {
                SchoolId = _testSchoolId,
                ExamId = _testExamId,
                StudentId = _testStudentId,
                MarksObtained = 80,
                IsAbsent = false
            };

            await _service.CreateResultAsync(_testSchoolId, dto);

            var act = () => _service.CreateResultAsync(_testSchoolId, dto);
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*Result already exists*");
        }

        [Fact]
        public async Task CreateResult_ExamNotFound_ThrowsKeyNotFoundException()
        {
            var dto = new CreateResultDto
            {
                SchoolId = _testSchoolId,
                ExamId = Guid.NewGuid(),
                StudentId = _testStudentId,
                MarksObtained = 80,
                IsAbsent = false
            };

            var act = () => _service.CreateResultAsync(_testSchoolId, dto);
            await act.Should().ThrowAsync<KeyNotFoundException>()
                .WithMessage("*Exam not found*");
        }

        [Fact]
        public async Task CreateResult_StudentNotFound_ThrowsKeyNotFoundException()
        {
            var dto = new CreateResultDto
            {
                SchoolId = _testSchoolId,
                ExamId = _testExamId,
                StudentId = Guid.NewGuid(),
                MarksObtained = 80,
                IsAbsent = false
            };

            var act = () => _service.CreateResultAsync(_testSchoolId, dto);
            await act.Should().ThrowAsync<KeyNotFoundException>()
                .WithMessage("*Student not found*");
        }

        [Fact]
        public async Task CreateResult_StudentNotRegistered_ThrowsInvalidOperationException()
        {
            // Create student in different class
            var unregisteredStudentId = Guid.NewGuid();
            _context.Students.Add(new Student
            {
                Id = unregisteredStudentId,
                SchoolId = _testSchoolId,
                Name = "Unregistered Student",
                FirstName = "Unregistered",
                LastName = "Student",
                Class = "10",
                Section = "A",
                DateOfBirth = new DateTime(2010, 1, 1),
                Status = "active",
                IsActive = true,
                AdmissionDate = DateTime.UtcNow.AddYears(-1),
                Address = "Test",
                GuardianName = "G",
                GuardianPhone = "111",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            var dto = new CreateResultDto
            {
                SchoolId = _testSchoolId,
                ExamId = _testExamId,
                StudentId = unregisteredStudentId,
                MarksObtained = 80,
                IsAbsent = false
            };

            var act = () => _service.CreateResultAsync(_testSchoolId, dto);
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*not registered for this exam*");
        }

        [Fact]
        public async Task CreateResult_StudentWrongClass_ThrowsInvalidOperationException()
        {
            var wrongClassStudentId = Guid.NewGuid();
            _context.Students.Add(new Student
            {
                Id = wrongClassStudentId,
                SchoolId = _testSchoolId,
                Name = "Wrong Class",
                FirstName = "Wrong",
                LastName = "Class",
                Class = "9",
                Section = "B",
                DateOfBirth = new DateTime(2010, 1, 1),
                Status = "active",
                IsActive = true,
                AdmissionDate = DateTime.UtcNow.AddYears(-1),
                Address = "Test",
                GuardianName = "G",
                GuardianPhone = "222",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            _context.ExamRegistrations.Add(new ExamRegistration
            {
                Id = Guid.NewGuid(),
                SchoolId = _testSchoolId,
                ExamId = _testExamId,
                StudentId = wrongClassStudentId,
                Status = "registered",
                RegisteredAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            var dto = new CreateResultDto
            {
                SchoolId = _testSchoolId,
                ExamId = _testExamId,
                StudentId = wrongClassStudentId,
                MarksObtained = 80,
                IsAbsent = false
            };

            var act = () => _service.CreateResultAsync(_testSchoolId, dto);
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*Student is in 9*");
        }

        [Fact]
        public async Task CreateResult_NegativeTheoryMarks_ThrowsArgumentException()
        {
            var dto = new CreateResultDto
            {
                SchoolId = _testSchoolId,
                ExamId = _testExamId,
                StudentId = _testStudentId,
                TheoryMarks = -10,
                IsAbsent = false
            };

            var act = () => _service.CreateResultAsync(_testSchoolId, dto);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*Theory marks cannot be negative*");
        }

        [Fact]
        public async Task CreateResult_NegativePracticalMarks_ThrowsArgumentException()
        {
            var dto = new CreateResultDto
            {
                SchoolId = _testSchoolId,
                ExamId = _testExamId,
                StudentId = _testStudentId,
                PracticalMarks = -5,
                IsAbsent = false
            };

            var act = () => _service.CreateResultAsync(_testSchoolId, dto);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*Practical marks cannot be negative*");
        }

        [Fact]
        public async Task CreateResult_NegativeInternalMarks_ThrowsArgumentException()
        {
            var dto = new CreateResultDto
            {
                SchoolId = _testSchoolId,
                ExamId = _testExamId,
                StudentId = _testStudentId,
                InternalMarks = -3,
                IsAbsent = false
            };

            var act = () => _service.CreateResultAsync(_testSchoolId, dto);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*Internal marks cannot be negative*");
        }

        [Fact]
        public async Task CreateResult_RemarksTooLong_ThrowsArgumentException()
        {
            var dto = new CreateResultDto
            {
                SchoolId = _testSchoolId,
                ExamId = _testExamId,
                StudentId = _testStudentId,
                MarksObtained = 80,
                IsAbsent = false,
                Remarks = new string('X', 1001)
            };

            var act = () => _service.CreateResultAsync(_testSchoolId, dto);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*Remarks cannot exceed 1000 characters*");
        }

        [Fact]
        public async Task CreateResult_ComponentMarks_CalculatesSumCorrectly()
        {
            var dto = new CreateResultDto
            {
                SchoolId = _testSchoolId,
                ExamId = _testExamId,
                StudentId = _testStudentId,
                TheoryMarks = 40,
                PracticalMarks = 20,
                InternalMarks = 10,
                IsAbsent = false
            };

            var result = await _service.CreateResultAsync(_testSchoolId, dto);

            result.Should().NotBeNull();
            result.MarksObtained.Should().Be(70); // 40 + 20 + 10
            result.Percentage.Should().Be(70);
        }

        // ========== GET RESULT TESTS ==========

        [Fact]
        public async Task GetResultById_NonExistent_ReturnsNull()
        {
            var result = await _service.GetResultByIdAsync(_testSchoolId, Guid.NewGuid());
            result.Should().BeNull();
        }

        // ========== PAGINATION FOR RESULTS ==========

        [Fact]
        public async Task GetResults_PaginationNormalization_NegativePage()
        {
            var filters = new ResultFiltersDto();
            var result = await _service.GetResultsAsync(_testSchoolId, filters, -5, 20);

            result.Should().NotBeNull();
            result.Page.Should().Be(1);
        }

        [Fact]
        public async Task GetResults_PaginationNormalization_PageSizeOver100()
        {
            var filters = new ResultFiltersDto();
            var result = await _service.GetResultsAsync(_testSchoolId, filters, 1, 500);

            result.Should().NotBeNull();
            result.PageSize.Should().Be(100);
        }

        // ========== FINALIZE EXAM RESULTS TESTS ==========

        [Fact]
        public async Task FinalizeExamResults_ExamNotFound_ThrowsKeyNotFoundException()
        {
            var act = () => _service.FinalizeExamResultsAsync(_testSchoolId, Guid.NewGuid());
            await act.Should().ThrowAsync<KeyNotFoundException>()
                .WithMessage("*Exam not found*");
        }

        [Fact]
        public async Task FinalizeExamResults_AlreadyFinalized_ThrowsInvalidOperationException()
        {
            var exam = await _context.Examinations.FindAsync(_testExamId);
            exam!.Status = "results_published";
            await _context.SaveChangesAsync();

            var act = () => _service.FinalizeExamResultsAsync(_testSchoolId, _testExamId);
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*already finalized*");

            exam.Status = "scheduled";
            await _context.SaveChangesAsync();
        }

        [Fact]
        public async Task FinalizeExamResults_CancelledExam_ThrowsInvalidOperationException()
        {
            var exam = await _context.Examinations.FindAsync(_testExamId);
            exam!.Status = "cancelled";
            await _context.SaveChangesAsync();

            var act = () => _service.FinalizeExamResultsAsync(_testSchoolId, _testExamId);
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*Cannot finalize results for a cancelled exam*");

            exam.Status = "scheduled";
            await _context.SaveChangesAsync();
        }

        [Fact]
        public async Task FinalizeExamResults_ScheduledExam_ThrowsInvalidOperationException()
        {
            var act = () => _service.FinalizeExamResultsAsync(_testSchoolId, _testExamId);
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*not been conducted yet*");
        }

        [Fact]
        public async Task FinalizeExamResults_NoResults_ReturnsFalse()
        {
            var exam = await _context.Examinations.FindAsync(_testExamId);
            exam!.Status = "completed";
            await _context.SaveChangesAsync();

            var result = await _service.FinalizeExamResultsAsync(_testSchoolId, _testExamId);
            result.Should().BeFalse();

            exam.Status = "scheduled";
            await _context.SaveChangesAsync();
        }

        // ========== GRADE CALCULATION TESTS ==========

        [Fact]
        public async Task CalculateGrade_ValidPercentage_ReturnsGrade()
        {
            var result = await _service.CalculateGradeAsync(_testSchoolId, 85);

            result.Should().NotBeNull();
            result.Grade.Should().Be("A2");
            result.Percentage.Should().Be(85);
            result.IsPassingGrade.Should().BeTrue();
        }

        [Fact]
        public async Task CalculateGrade_NegativePercentage_ThrowsArgumentException()
        {
            var act = () => _service.CalculateGradeAsync(_testSchoolId, -5);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*Percentage must be between 0 and 100*");
        }

        [Fact]
        public async Task CalculateGrade_PercentageOver100_ThrowsArgumentException()
        {
            var act = () => _service.CalculateGradeAsync(_testSchoolId, 105);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*Percentage must be between 0 and 100*");
        }

        [Fact]
        public async Task CalculateGrade_BoundaryAt0_ReturnsFailGrade()
        {
            var result = await _service.CalculateGradeAsync(_testSchoolId, 0);
            result.Grade.Should().Be("F");
            result.IsPassingGrade.Should().BeFalse();
        }

        [Fact]
        public async Task CalculateGrade_BoundaryAt100_ReturnsTopGrade()
        {
            var result = await _service.CalculateGradeAsync(_testSchoolId, 100);
            result.Grade.Should().Be("A1");
            result.IsPassingGrade.Should().BeTrue();
        }

        // ========== GENERATE REPORT CARD TESTS ==========

        [Fact]
        public async Task GenerateReportCard_EmptyAcademicYear_ThrowsArgumentException()
        {
            var dto = new GenerateReportCardDto
            {
                SchoolId = _testSchoolId,
                StudentId = _testStudentId,
                AcademicYear = "",
                ExamType = "unit_test"
            };

            var act = () => _service.GenerateReportCardAsync(_testSchoolId, dto);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*Academic year is required*");
        }

        [Fact]
        public async Task GenerateReportCard_EmptyExamType_ThrowsArgumentException()
        {
            var dto = new GenerateReportCardDto
            {
                SchoolId = _testSchoolId,
                StudentId = _testStudentId,
                AcademicYear = "2025-26",
                ExamType = ""
            };

            var act = () => _service.GenerateReportCardAsync(_testSchoolId, dto);
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*Exam type is required*");
        }

        [Fact]
        public async Task GenerateReportCard_StudentNotFound_ThrowsKeyNotFoundException()
        {
            var dto = new GenerateReportCardDto
            {
                SchoolId = _testSchoolId,
                StudentId = Guid.NewGuid(),
                AcademicYear = "2025-26",
                ExamType = "unit_test"
            };

            var act = () => _service.GenerateReportCardAsync(_testSchoolId, dto);
            await act.Should().ThrowAsync<KeyNotFoundException>()
                .WithMessage("*Student not found*");
        }

        // ========== EXAM STATS TESTS ==========
        // Note: GetExamStatsAsync uses complex GroupBy with navigation properties
        // that don't translate to InMemory provider. Stats are tested via E2E.

        // ========== STUDENT REPORT CARDS TESTS ==========

        [Fact]
        public async Task GetStudentReportCards_StudentNotFound_ThrowsKeyNotFoundException()
        {
            var act = () => _service.GetStudentReportCardsAsync(_testSchoolId, Guid.NewGuid(), null);
            await act.Should().ThrowAsync<KeyNotFoundException>()
                .WithMessage("*Student not found*");
        }

        [Fact]
        public async Task GetStudentReportCards_NoResults_ReturnsEmptyList()
        {
            var result = await _service.GetStudentReportCardsAsync(_testSchoolId, _testStudentId, null);
            result.Should().NotBeNull();
            result.Should().BeEmpty();
        }
    }
}
