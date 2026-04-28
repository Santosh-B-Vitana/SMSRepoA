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

namespace SmsApi.Tests.Unit.Parent
{
    /// <summary>
    /// Comprehensive unit tests for parent-facing student service methods.
    /// Covers GetMyChildrenAsync and GetStudentProfileSummaryAsync —
    /// the backbone of the parent dashboard and child profile pages.
    /// </summary>
    public class ParentStudentServiceTests : IDisposable
    {
        private readonly AppDbContext _context;
        private readonly StudentService _service;
        private readonly Guid _schoolId = Guid.NewGuid();
        private readonly Guid _otherSchoolId = Guid.NewGuid();

        public ParentStudentServiceTests()
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
        // Helpers
        // ─────────────────────────────────────────────────────────────────────

        private Student MakeStudent(Guid id, string name = "Child One", string className = "Class 5", bool isDeleted = false) =>
            new Student
            {
                Id = id,
                SchoolId = _schoolId,
                AdmissionNumber = $"ADM-{id.ToString().Substring(0, 6)}",
                Name = name,
                Class = className,
                Section = "A",
                RollNumber = "1",
                Status = "active",
                DateOfBirth = new DateTime(2014, 5, 15),
                AdmissionDate = new DateTime(2022, 6, 1),
                Address = "123 Test Road",
                GuardianName = "Test Parent",
                GuardianPhone = "9999999999",
                Gender = "male",
                Category = "General",
                IsDeleted = isDeleted,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

        private StudentGuardian MakeGuardian(Guid studentId, string email, bool isDeleted = false) =>
            new StudentGuardian
            {
                Id = Guid.NewGuid(),
                StudentId = studentId,
                SchoolId = _schoolId,
                Name = "Parent User",
                Relation = "mother",
                Email = email,
                Phone = "9999999999",
                IsDeleted = isDeleted,
                CreatedAt = DateTime.UtcNow
            };

        // =====================================================================
        // GetMyChildrenAsync Tests
        // =====================================================================

        [Fact]
        public async Task GetMyChildren_ReturnsChildrenLinkedByGuardianEmail()
        {
            var studentId = Guid.NewGuid();
            var parentEmail = "parent@school.com";

            _context.Students.Add(MakeStudent(studentId, "Ravi Kumar"));
            _context.StudentGuardians.Add(MakeGuardian(studentId, parentEmail));
            await _context.SaveChangesAsync();

            var result = await _service.GetMyChildrenAsync(_schoolId, parentEmail);

            result.Should().HaveCount(1);
            result[0].Name.Should().Be("Ravi Kumar");
        }

        [Fact]
        public async Task GetMyChildren_ReturnsEmpty_WhenNoGuardianMatch()
        {
            var studentId = Guid.NewGuid();
            _context.Students.Add(MakeStudent(studentId));
            _context.StudentGuardians.Add(MakeGuardian(studentId, "other@school.com"));
            await _context.SaveChangesAsync();

            var result = await _service.GetMyChildrenAsync(_schoolId, "notmyemail@school.com");

            result.Should().BeEmpty();
        }

        [Fact]
        public async Task GetMyChildren_IsCaseInsensitive_OnEmail()
        {
            var studentId = Guid.NewGuid();
            _context.Students.Add(MakeStudent(studentId, "Priya"));
            _context.StudentGuardians.Add(MakeGuardian(studentId, "Parent@School.COM"));
            await _context.SaveChangesAsync();

            var result = await _service.GetMyChildrenAsync(_schoolId, "parent@school.com");

            result.Should().HaveCount(1);
            result[0].Name.Should().Be("Priya");
        }

        [Fact]
        public async Task GetMyChildren_ExcludesStudentsFromOtherSchool()
        {
            var studentId = Guid.NewGuid();
            var parentEmail = "parent@school.com";

            // Student from a different school
            var student = MakeStudent(studentId);
            student.SchoolId = _otherSchoolId;
            _context.Students.Add(student);

            var guardian = MakeGuardian(studentId, parentEmail);
            guardian.SchoolId = _otherSchoolId;
            _context.StudentGuardians.Add(guardian);
            await _context.SaveChangesAsync();

            var result = await _service.GetMyChildrenAsync(_schoolId, parentEmail);

            result.Should().BeEmpty();
        }

        [Fact]
        public async Task GetMyChildren_ExcludesDeletedStudents()
        {
            var studentId = Guid.NewGuid();
            var parentEmail = "parent@school.com";

            _context.Students.Add(MakeStudent(studentId, isDeleted: true));
            _context.StudentGuardians.Add(MakeGuardian(studentId, parentEmail));
            await _context.SaveChangesAsync();

            var result = await _service.GetMyChildrenAsync(_schoolId, parentEmail);

            result.Should().BeEmpty();
        }

        [Fact]
        public async Task GetMyChildren_ExcludesDeletedGuardianLinks()
        {
            var studentId = Guid.NewGuid();
            var parentEmail = "parent@school.com";

            _context.Students.Add(MakeStudent(studentId));
            _context.StudentGuardians.Add(MakeGuardian(studentId, parentEmail, isDeleted: true));
            await _context.SaveChangesAsync();

            var result = await _service.GetMyChildrenAsync(_schoolId, parentEmail);

            result.Should().BeEmpty();
        }

        [Fact]
        public async Task GetMyChildren_MultipleChildren_ReturnsAll()
        {
            var parentEmail = "parent@school.com";
            var child1Id = Guid.NewGuid();
            var child2Id = Guid.NewGuid();
            var child3Id = Guid.NewGuid();

            _context.Students.AddRange(
                MakeStudent(child1Id, "Child A"),
                MakeStudent(child2Id, "Child B"),
                MakeStudent(child3Id, "Child C")
            );
            _context.StudentGuardians.AddRange(
                MakeGuardian(child1Id, parentEmail),
                MakeGuardian(child2Id, parentEmail),
                MakeGuardian(child3Id, parentEmail)
            );
            await _context.SaveChangesAsync();

            var result = await _service.GetMyChildrenAsync(_schoolId, parentEmail);

            result.Should().HaveCount(3);
            result.Select(r => r.Name).Should().BeEquivalentTo(new[] { "Child A", "Child B", "Child C" });
        }

        [Fact]
        public async Task GetMyChildren_DoesNotReturnOtherParentsChildren()
        {
            var parentEmail = "myparent@school.com";
            var child1Id = Guid.NewGuid();
            var child2Id = Guid.NewGuid();

            _context.Students.AddRange(
                MakeStudent(child1Id, "My Child"),
                MakeStudent(child2Id, "Other Child")
            );
            _context.StudentGuardians.AddRange(
                MakeGuardian(child1Id, parentEmail),
                MakeGuardian(child2Id, "otherparent@school.com")
            );
            await _context.SaveChangesAsync();

            var result = await _service.GetMyChildrenAsync(_schoolId, parentEmail);

            result.Should().HaveCount(1);
            result[0].Name.Should().Be("My Child");
        }

        [Fact]
        public async Task GetMyChildren_ResponseMapsFieldsCorrectly()
        {
            var studentId = Guid.NewGuid();
            var parentEmail = "parent@school.com";

            var student = MakeStudent(studentId, "Arjun Sharma", "Class 9");
            student.Section = "B";
            student.RollNumber = "15";
            student.PhotoUrl = "/photos/arjun.jpg";
            _context.Students.Add(student);
            _context.StudentGuardians.Add(MakeGuardian(studentId, parentEmail));
            await _context.SaveChangesAsync();

            var result = await _service.GetMyChildrenAsync(_schoolId, parentEmail);

            result.Should().HaveCount(1);
            var child = result[0];
            child.Id.Should().Be(studentId);
            child.Name.Should().Be("Arjun Sharma");
            child.Class.Should().Be("Class 9");
            child.Section.Should().Be("B");
            child.RollNumber.Should().Be("15");
            child.PhotoUrl.Should().Be("/photos/arjun.jpg");
        }

        [Fact]
        public async Task GetMyChildren_MultipleGuardianRecordsForSameStudent_DeduplicatesChild()
        {
            var parentEmail = "parent@school.com";
            var childId = Guid.NewGuid();

            _context.Students.Add(MakeStudent(childId, "Single Child"));
            // Two guardian records pointing to same student
            _context.StudentGuardians.AddRange(
                MakeGuardian(childId, parentEmail),
                new StudentGuardian
                {
                    Id = Guid.NewGuid(),
                    StudentId = childId,
                    SchoolId = _schoolId,
                    Name = "Parent User (duplicate)",
                    Email = parentEmail.ToUpper(),
                    Phone = "8888888888",
                    CreatedAt = DateTime.UtcNow
                }
            );
            await _context.SaveChangesAsync();

            var result = await _service.GetMyChildrenAsync(_schoolId, parentEmail);

            result.Should().HaveCount(1);
        }

        // =====================================================================
        // GetStudentProfileSummaryAsync Tests
        // =====================================================================

        [Fact]
        public async Task GetStudentProfileSummary_ReturnsNull_ForNonExistentStudent()
        {
            var result = await _service.GetStudentProfileSummaryAsync(Guid.NewGuid(), _schoolId);

            result.Should().BeNull();
        }

        [Fact]
        public async Task GetStudentProfileSummary_ReturnsStudentBasicInfo()
        {
            var studentId = Guid.NewGuid();
            var student = MakeStudent(studentId, "Sneha Patel", "Class 8");
            student.Section = "C";
            student.RollNumber = "7";
            _context.Students.Add(student);
            await _context.SaveChangesAsync();

            var result = await _service.GetStudentProfileSummaryAsync(studentId, _schoolId);

            result.Should().NotBeNull();
            result!.Student.Should().NotBeNull();
            result.Student.Id.Should().Be(studentId);
            result.Student.Name.Should().Be("Sneha Patel");
            result.Student.Class.Should().Be("Class 8");
            result.Student.Section.Should().Be("C");
        }

        [Fact]
        public async Task GetStudentProfileSummary_ExcludesStudentFromDifferentSchool()
        {
            var studentId = Guid.NewGuid();
            var student = MakeStudent(studentId);
            student.SchoolId = _otherSchoolId;
            _context.Students.Add(student);
            await _context.SaveChangesAsync();

            var result = await _service.GetStudentProfileSummaryAsync(studentId, _schoolId);

            result.Should().BeNull();
        }

        [Fact]
        public async Task GetStudentProfileSummary_IncludesFeesSummary_WhenFeesExist()
        {
            var studentId = Guid.NewGuid();
            _context.Students.Add(MakeStudent(studentId));
            _context.FeeRecords.Add(new FeeRecord
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolId,
                StudentId = studentId,
                AcademicYear = "2025-2026",
                TotalAmount = 50000,
                PaidAmount = 20000,
                PendingAmount = 30000,
                Status = "partial",
                DueDate = DateTime.UtcNow.AddDays(30),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            var result = await _service.GetStudentProfileSummaryAsync(studentId, _schoolId);

            result.Should().NotBeNull();
            result!.Fee.Should().NotBeNull();
            result.Fee!.TotalAmount.Should().Be(50000);
            result.Fee.PaidAmount.Should().Be(20000);
            result.Fee.PendingAmount.Should().Be(30000);
        }

        [Fact]
        public async Task GetStudentProfileSummary_FeeIsNull_WhenNoFeeRecords()
        {
            var studentId = Guid.NewGuid();
            _context.Students.Add(MakeStudent(studentId));
            await _context.SaveChangesAsync();

            var result = await _service.GetStudentProfileSummaryAsync(studentId, _schoolId);

            result.Should().NotBeNull();
            result!.Fee.Should().BeNull();
        }

        [Fact]
        public async Task GetStudentProfileSummary_FeeStatus_IsOverdue_WhenAnyRecordOverdue()
        {
            var studentId = Guid.NewGuid();
            _context.Students.Add(MakeStudent(studentId));
            _context.FeeRecords.AddRange(
                new FeeRecord
                {
                    Id = Guid.NewGuid(), SchoolId = _schoolId, StudentId = studentId,
                    AcademicYear = "2025-2026", TotalAmount = 30000, PaidAmount = 30000, PendingAmount = 0,
                    Status = "paid", DueDate = DateTime.UtcNow.AddDays(-60), CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
                },
                new FeeRecord
                {
                    Id = Guid.NewGuid(), SchoolId = _schoolId, StudentId = studentId,
                    AcademicYear = "2025-2026", TotalAmount = 20000, PaidAmount = 0, PendingAmount = 20000,
                    Status = "overdue", DueDate = DateTime.UtcNow.AddDays(-10), CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
                }
            );
            await _context.SaveChangesAsync();

            var result = await _service.GetStudentProfileSummaryAsync(studentId, _schoolId);

            result!.Fee!.Status.Should().Be("overdue");
        }

        [Fact]
        public async Task GetStudentProfileSummary_AttendanceIsNull_WhenNoRecords()
        {
            var studentId = Guid.NewGuid();
            _context.Students.Add(MakeStudent(studentId));
            await _context.SaveChangesAsync();

            var result = await _service.GetStudentProfileSummaryAsync(studentId, _schoolId);

            result!.Attendance.Should().BeNull();
        }

        [Fact]
        public async Task GetStudentProfileSummary_IncludesAttendanceSummary_WhenRecordsExist()
        {
            var studentId = Guid.NewGuid();
            _context.Students.Add(MakeStudent(studentId));

            // Seed attendance records within last 90 days
            var records = Enumerable.Range(0, 20).Select(i => new AttendanceRecord
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolId,
                StudentId = studentId,
                Date = DateTime.UtcNow.AddDays(-i),
                Status = i < 15 ? "present" : "absent",
                Remarks = "",
                IsManualOverride = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            _context.AttendanceRecords.AddRange(records);
            await _context.SaveChangesAsync();

            var result = await _service.GetStudentProfileSummaryAsync(studentId, _schoolId);

            result!.Attendance.Should().NotBeNull();
            result.Attendance!.TotalDays.Should().Be(20);
            result.Attendance.PresentDays.Should().Be(15);
            result.Attendance.AbsentDays.Should().Be(5);
        }

        [Fact]
        public async Task GetStudentProfileSummary_ExamResultsAreMapped_WhenResultsExist()
        {
            var studentId = Guid.NewGuid();
            _context.Students.Add(MakeStudent(studentId));

            var exam = new Exam
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolId,
                Name = "Unit Test 1",
                ExamDate = DateTime.UtcNow.AddDays(-30),
                TotalMarks = 100,
                PassingMarks = 35,
                Class = "Class 5",
                Subject = "Mathematics",
                Description = "AY:2025",
                Status = "published",
                AcademicYear = "2025-2026",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Examinations.Add(exam);

            var result = new ExamResult
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolId,
                StudentId = studentId,
                ExamId = exam.Id,
                Subject = "Mathematics",
                MarksObtained = 78,
                TotalMarks = 100,
                Percentage = 78m,
                Grade = "B",
                IsAbsent = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.ExamResults.Add(result);
            await _context.SaveChangesAsync();

            var summary = await _service.GetStudentProfileSummaryAsync(studentId, _schoolId);

            summary!.Exams.Should().NotBeNull();
            summary.Exams.Results.Should().HaveCount(1);
            summary.Exams.Results[0].Subject.Should().Be("Mathematics");
            summary.Exams.Results[0].MarksObtained.Should().Be(78);
            summary.Exams.Results[0].Grade.Should().Be("B");
        }
    }
}
