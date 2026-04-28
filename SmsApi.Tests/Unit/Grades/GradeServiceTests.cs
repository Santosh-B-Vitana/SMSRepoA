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

namespace SmsApi.Tests.Unit.Grades
{
    public class GradeServiceTests : IDisposable
    {
        private readonly AppDbContext _context;
        private readonly GradeService _service;

        private readonly Guid _schoolId  = Guid.NewGuid();
        private readonly Guid _school2Id = Guid.NewGuid();
        private readonly Guid _classId   = Guid.NewGuid();
        private readonly Guid _sectionId = Guid.NewGuid();
        private readonly Guid _subjectId = Guid.NewGuid();
        private readonly Guid _categoryId = Guid.NewGuid();
        private readonly Guid _gradeItemId = Guid.NewGuid();
        private readonly Guid _studentId  = Guid.NewGuid();
        private readonly Guid _student2Id = Guid.NewGuid();
        private readonly Guid _gradeId    = Guid.NewGuid();
        private readonly Guid _cceId      = Guid.NewGuid();

        public GradeServiceTests()
        {
            var opts = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options;
            _context = new AppDbContext(opts);
            _service = new GradeService(_context);
            SeedData().GetAwaiter().GetResult();
        }

        public void Dispose() => _context?.Dispose();

        // ─── SEED ─────────────────────────────────────────────────────────────────

        private async Task SeedData()
        {
            // School
            _context.Schools.Add(new School { Id = _schoolId, Name = "Test School", SchoolCode = "TST" });
            _context.Schools.Add(new School { Id = _school2Id, Name = "Other School", SchoolCode = "OTH" });

            // Class & Subject
            _context.Classes.Add(new Class { Id = _classId, SchoolId = _schoolId, Name = "Class 10" });
            _context.Subjects.Add(new Subject { Id = _subjectId, SchoolId = _schoolId, Name = "Mathematics", Code = "MATH" });

            // Students
            _context.Students.Add(new Student { Id = _studentId, SchoolId = _schoolId, Name = "Alice Smith", FirstName = "Alice", LastName = "Smith", Class = "10", Section = "A", DateOfBirth = new DateTime(2008, 1, 1), AdmissionDate = DateTime.UtcNow.AddYears(-2), RollNumber = "001", Status = "active" });
            _context.Students.Add(new Student { Id = _student2Id, SchoolId = _schoolId, Name = "Bob Jones", FirstName = "Bob", LastName = "Jones", Class = "10", Section = "A", DateOfBirth = new DateTime(2008, 2, 1), AdmissionDate = DateTime.UtcNow.AddYears(-2), RollNumber = "002", Status = "active" });

            // GradeCategory
            _context.GradeCategories.Add(new GradeCategory
            {
                Id = _categoryId, SchoolId = _schoolId,
                Name = "Unit Test", Code = "UT", Weightage = 20, Status = "active"
            });

            // GradeItem
            _context.GradeItems.Add(new GradeItem
            {
                Id = _gradeItemId, SchoolId = _schoolId,
                ClassId = _classId, SubjectId = _subjectId, CategoryId = _categoryId,
                Name = "Quiz 1", MaxMarks = 50, Date = DateTime.UtcNow.AddDays(-10),
                Status = "active"
            });

            // StudentGrade (for student1) — 40/50=80%→A
            _context.StudentGrades.Add(new StudentGrade
            {
                Id = _gradeId, GradeItemId = _gradeItemId, StudentId = _studentId,
                MarksObtained = 40, Grade = "A", Status = "published"
            });

            // CCE Assessment
            _context.CCEAssessments.Add(new CCEAssessment
            {
                Id = _cceId, SchoolId = _schoolId, StudentId = _studentId,
                ClassId = _classId, AcademicYear = "2025-26", Term = "T1",
                SkillArea = "Communication", Grade = "A", Remarks = "Good"
            });

            await _context.SaveChangesAsync();
        }

        // ─── HELPERS ──────────────────────────────────────────────────────────────

        private CreateGradeCategoryRequest ValidCategoryRequest(string name = "New Category") => new()
        {
            SchoolId = _schoolId,
            Name = name,
            Code = "NC",
            Weightage = 25,
            Description = "Test",
            Status = "active"
        };

        private CreateGradeItemRequest ValidGradeItemRequest(string name = "Homework 1") => new()
        {
            SchoolId = _schoolId,
            ClassId = _classId,
            SubjectId = _subjectId,
            CategoryId = _categoryId,
            Name = name,
            MaxMarks = 100,
            Date = DateTime.UtcNow.AddDays(-5),
            Status = "active"
        };

        private CreateStudentGradeRequest ValidStudentGradeRequest() => new()
        {
            GradeItemId = _gradeItemId,
            StudentId = _student2Id,   // student2 has no grade yet
            MarksObtained = 35,
            Status = "published"
        };

        private CreateCCEAssessmentRequest ValidCCERequest() => new()
        {
            SchoolId = _schoolId,
            StudentId = _student2Id,
            ClassId = _classId,
            AcademicYear = "2025-26",
            Term = "T2",
            SkillArea = "Creativity",
            Grade = "B+"
        };

        // ═══════════════════════════════════════════════════════════════════════════
        // GRADE CATEGORIES
        // ═══════════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task GetCategories_Returns_PagedResults()
        {
            var result = await _service.GetCategoriesAsync(_schoolId);
            result.Total.Should().Be(1);
            result.Categories.Should().HaveCount(1);
            result.Categories[0].Name.Should().Be("Unit Test");
        }

        [Fact]
        public async Task GetCategories_IsolatesSchool()
        {
            var result = await _service.GetCategoriesAsync(_school2Id);
            result.Total.Should().Be(0);
        }

        [Theory]
        [InlineData(0, 1)]   // page 0 → 1
        [InlineData(-5, 1)]  // page -5 → 1
        public async Task GetCategories_NormalizesPage(int page, int expectedPage)
        {
            var result = await _service.GetCategoriesAsync(_schoolId, page);
            result.Page.Should().Be(expectedPage);
        }

        [Theory]
        [InlineData(0, 10)]    // pageSize 0 → 10
        [InlineData(200, 100)] // pageSize 200 → 100
        public async Task GetCategories_NormalizesPageSize(int pageSize, int expectedSize)
        {
            var result = await _service.GetCategoriesAsync(_schoolId, 1, pageSize);
            result.PageSize.Should().Be(expectedSize);
        }

        [Fact]
        public async Task GetCategoryById_Returns_Category()
        {
            var result = await _service.GetCategoryByIdAsync(_categoryId, _schoolId);
            result.Should().NotBeNull();
            result!.Name.Should().Be("Unit Test");
        }

        [Fact]
        public async Task GetCategoryById_Returns_Null_WhenNotFound()
        {
            var result = await _service.GetCategoryByIdAsync(Guid.NewGuid(), _schoolId);
            result.Should().BeNull();
        }

        [Fact]
        public async Task GetCategoryById_Returns_Null_WrongSchool()
        {
            var result = await _service.GetCategoryByIdAsync(_categoryId, _school2Id);
            result.Should().BeNull();
        }

        [Fact]
        public async Task CreateCategory_Success()
        {
            var req = ValidCategoryRequest();
            var result = await _service.CreateCategoryAsync(_schoolId, req);
            result.Name.Should().Be("New Category");
            result.SchoolId.Should().Be(_schoolId);
            result.Weightage.Should().Be(25);
        }

        [Theory]
        [InlineData("")]        // empty
        [InlineData("A")]       // too short (<2)
        public async Task CreateCategory_Rejects_InvalidName(string name)
        {
            var req = ValidCategoryRequest(name);
            var act = () => _service.CreateCategoryAsync(_schoolId, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*Category name*");
        }

        [Fact]
        public async Task CreateCategory_Rejects_TooLongName()
        {
            var req = ValidCategoryRequest(new string('A', 201));
            var act = () => _service.CreateCategoryAsync(_schoolId, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*Category name*");
        }

        [Fact]
        public async Task CreateCategory_Rejects_InvalidWeightage_Negative()
        {
            var req = ValidCategoryRequest();
            req.Weightage = -1;
            var act = () => _service.CreateCategoryAsync(_schoolId, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*Weightage*");
        }

        [Fact]
        public async Task CreateCategory_Rejects_InvalidWeightage_Over100()
        {
            var req = ValidCategoryRequest();
            req.Weightage = 101;
            var act = () => _service.CreateCategoryAsync(_schoolId, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*Weightage*");
        }

        [Fact]
        public async Task CreateCategory_Rejects_InvalidStatus()
        {
            var req = ValidCategoryRequest();
            req.Status = "unknown";
            var act = () => _service.CreateCategoryAsync(_schoolId, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*status*");
        }

        [Fact]
        public async Task CreateCategory_Rejects_DuplicateName()
        {
            var req = ValidCategoryRequest("Unit Test"); // already exists (case check)
            var act = () => _service.CreateCategoryAsync(_schoolId, req);
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*already exists*");
        }

        [Fact]
        public async Task CreateCategory_DuplicateCheck_CaseInsensitive()
        {
            var req = ValidCategoryRequest("unit test"); // lowercase of existing
            var act = () => _service.CreateCategoryAsync(_schoolId, req);
            await act.Should().ThrowAsync<InvalidOperationException>();
        }

        [Fact]
        public async Task UpdateCategory_Success()
        {
            var req = ValidCategoryRequest("Updated Category");
            var result = await _service.UpdateCategoryAsync(_categoryId, _schoolId, req);
            result.Should().NotBeNull();
            result!.Name.Should().Be("Updated Category");
        }

        [Fact]
        public async Task UpdateCategory_Returns_Null_WhenNotFound()
        {
            var req = ValidCategoryRequest("X");
            var result = await _service.UpdateCategoryAsync(Guid.NewGuid(), _schoolId, req);
            result.Should().BeNull();
        }

        [Fact]
        public async Task DeleteCategory_Success()
        {
            // Create a new category with no grade items
            var cat = new GradeCategory
            {
                Id = Guid.NewGuid(), SchoolId = _schoolId,
                Name = "Empty Category", Weightage = 0, Status = "active"
            };
            _context.GradeCategories.Add(cat);
            await _context.SaveChangesAsync();

            var result = await _service.DeleteCategoryAsync(cat.Id, _schoolId);
            result.Should().BeTrue();
        }

        [Fact]
        public async Task DeleteCategory_Throws_WhenCategoryInUse()
        {
            // _categoryId is used by _gradeItemId
            var act = () => _service.DeleteCategoryAsync(_categoryId, _schoolId);
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*grade items*");
        }

        [Fact]
        public async Task DeleteCategory_Returns_False_WhenNotFound()
        {
            var result = await _service.DeleteCategoryAsync(Guid.NewGuid(), _schoolId);
            result.Should().BeFalse();
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // GRADE ITEMS
        // ═══════════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task GetGradeItems_Returns_PagedResults()
        {
            var result = await _service.GetGradeItemsAsync(_schoolId);
            result.Total.Should().Be(1);
            result.Items[0].Name.Should().Be("Quiz 1");
        }

        [Fact]
        public async Task GetGradeItems_FiltersBy_ClassId()
        {
            var result = await _service.GetGradeItemsAsync(_schoolId, classId: Guid.NewGuid());
            result.Total.Should().Be(0);
        }

        [Fact]
        public async Task GetGradeItems_FiltersBy_SubjectId()
        {
            var result = await _service.GetGradeItemsAsync(_schoolId, subjectId: _subjectId);
            result.Total.Should().Be(1);
        }

        [Fact]
        public async Task GetGradeItems_NormalizesPage()
        {
            var result = await _service.GetGradeItemsAsync(_schoolId, page: 0);
            result.Page.Should().Be(1);
        }

        [Fact]
        public async Task GetGradeItemById_Returns_Item()
        {
            var result = await _service.GetGradeItemByIdAsync(_gradeItemId, _schoolId);
            result.Should().NotBeNull();
            result!.Name.Should().Be("Quiz 1");
        }

        [Fact]
        public async Task GetGradeItemById_IsolatesSchool()
        {
            var result = await _service.GetGradeItemByIdAsync(_gradeItemId, _school2Id);
            result.Should().BeNull();
        }

        [Fact]
        public async Task CreateGradeItem_Success()
        {
            var req = ValidGradeItemRequest();
            var result = await _service.CreateGradeItemAsync(req);
            result.Name.Should().Be("Homework 1");
            result.MaxMarks.Should().Be(100);
        }

        [Theory]
        [InlineData("")]       // empty
        [InlineData("AB")]     // too short (<3)
        public async Task CreateGradeItem_Rejects_ShortName(string name)
        {
            var req = ValidGradeItemRequest(name);
            var act = () => _service.CreateGradeItemAsync(req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*Grade item name*");
        }

        [Fact]
        public async Task CreateGradeItem_Rejects_MaxMarks_Zero()
        {
            var req = ValidGradeItemRequest();
            req.MaxMarks = 0;
            var act = () => _service.CreateGradeItemAsync(req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*MaxMarks*");
        }

        [Fact]
        public async Task CreateGradeItem_Rejects_MaxMarks_Over1000()
        {
            var req = ValidGradeItemRequest();
            req.MaxMarks = 1001;
            var act = () => _service.CreateGradeItemAsync(req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*MaxMarks*");
        }

        [Fact]
        public async Task CreateGradeItem_Rejects_MaxMarks_Negative()
        {
            var req = ValidGradeItemRequest();
            req.MaxMarks = -1;
            var act = () => _service.CreateGradeItemAsync(req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*MaxMarks*");
        }

        [Fact]
        public async Task CreateGradeItem_Rejects_OldDate()
        {
            var req = ValidGradeItemRequest();
            req.Date = DateTime.UtcNow.AddYears(-6);
            var act = () => _service.CreateGradeItemAsync(req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*5 years*");
        }

        [Fact]
        public async Task CreateGradeItem_Rejects_InvalidStatus()
        {
            var req = ValidGradeItemRequest();
            req.Status = "invalid";
            var act = () => _service.CreateGradeItemAsync(req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*status*");
        }

        [Fact]
        public async Task CreateGradeItem_Rejects_UnknownCategory()
        {
            var req = ValidGradeItemRequest();
            req.CategoryId = Guid.NewGuid();
            var act = () => _service.CreateGradeItemAsync(req);
            await act.Should().ThrowAsync<KeyNotFoundException>().WithMessage("*category*");
        }

        [Fact]
        public async Task CreateGradeItem_Rejects_UnknownClass()
        {
            var req = ValidGradeItemRequest();
            req.ClassId = Guid.NewGuid();
            var act = () => _service.CreateGradeItemAsync(req);
            await act.Should().ThrowAsync<KeyNotFoundException>().WithMessage("*Class*");
        }

        [Fact]
        public async Task CreateGradeItem_Rejects_UnknownSubject()
        {
            var req = ValidGradeItemRequest();
            req.SubjectId = Guid.NewGuid();
            var act = () => _service.CreateGradeItemAsync(req);
            await act.Should().ThrowAsync<KeyNotFoundException>().WithMessage("*Subject*");
        }

        [Fact]
        public async Task CreateGradeItem_Rejects_DuplicateName()
        {
            var req = ValidGradeItemRequest("Quiz 1"); // already seeded
            var act = () => _service.CreateGradeItemAsync(req);
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*already exists*");
        }

        [Fact]
        public async Task UpdateGradeItem_Success()
        {
            var req = new UpdateGradeItemRequest { Name = "Quiz 1 Updated", MaxMarks = 75 };
            var result = await _service.UpdateGradeItemAsync(_gradeItemId, _schoolId, req);
            result.Should().NotBeNull();
            result!.Name.Should().Be("Quiz 1 Updated");
            result.MaxMarks.Should().Be(75);
        }

        [Fact]
        public async Task UpdateGradeItem_Rejects_ShortName()
        {
            var req = new UpdateGradeItemRequest { Name = "Q" };
            var act = () => _service.UpdateGradeItemAsync(_gradeItemId, _schoolId, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*Grade item name*");
        }

        [Fact]
        public async Task UpdateGradeItem_Rejects_MaxMarks_Over1000()
        {
            var req = new UpdateGradeItemRequest { MaxMarks = 1500 };
            var act = () => _service.UpdateGradeItemAsync(_gradeItemId, _schoolId, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*MaxMarks*");
        }

        [Fact]
        public async Task UpdateGradeItem_Rejects_InvalidStatus()
        {
            var req = new UpdateGradeItemRequest { Status = "bad" };
            var act = () => _service.UpdateGradeItemAsync(_gradeItemId, _schoolId, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*status*");
        }

        [Fact]
        public async Task UpdateGradeItem_Returns_Null_WhenNotFound()
        {
            var result = await _service.UpdateGradeItemAsync(Guid.NewGuid(), _schoolId, new UpdateGradeItemRequest());
            result.Should().BeNull();
        }

        [Fact]
        public async Task DeleteGradeItem_Throws_WhenHasStudentGrades()
        {
            // _gradeItemId has student grades seeded
            var act = () => _service.DeleteGradeItemAsync(_gradeItemId, _schoolId);
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*student grades*");
        }

        [Fact]
        public async Task DeleteGradeItem_Success_WhenNoGrades()
        {
            var item = new GradeItem
            {
                Id = Guid.NewGuid(), SchoolId = _schoolId,
                ClassId = _classId, SubjectId = _subjectId, CategoryId = _categoryId,
                Name = "Empty Item", MaxMarks = 50, Date = DateTime.UtcNow, Status = "active"
            };
            _context.GradeItems.Add(item);
            await _context.SaveChangesAsync();

            var result = await _service.DeleteGradeItemAsync(item.Id, _schoolId);
            result.Should().BeTrue();
        }

        [Fact]
        public async Task DeleteGradeItem_Returns_False_WhenNotFound()
        {
            var result = await _service.DeleteGradeItemAsync(Guid.NewGuid(), _schoolId);
            result.Should().BeFalse();
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // STUDENT GRADES
        // ═══════════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task GetStudentGrades_Returns_PagedResults()
        {
            var result = await _service.GetStudentGradesAsync(_schoolId);
            result.Total.Should().Be(1);
        }

        [Fact]
        public async Task GetStudentGrades_SchoolIsolation()
        {
            var result = await _service.GetStudentGradesAsync(_school2Id);
            result.Total.Should().Be(0);
        }

        [Fact]
        public async Task GetStudentGrades_FiltersBy_GradeItemId()
        {
            var result = await _service.GetStudentGradesAsync(_schoolId, gradeItemId: _gradeItemId);
            result.Total.Should().Be(1);
        }

        [Fact]
        public async Task GetStudentGrades_FiltersBy_StudentId()
        {
            var result = await _service.GetStudentGradesAsync(_schoolId, studentId: _student2Id);
            result.Total.Should().Be(0); // student2 has no grade yet
        }

        [Fact]
        public async Task GetStudentGrades_NormalizesPageSize()
        {
            var result = await _service.GetStudentGradesAsync(_schoolId, pageSize: 500);
            result.PageSize.Should().Be(100);
        }

        [Fact]
        public async Task GetStudentGradeById_Returns_Grade()
        {
            var result = await _service.GetStudentGradeByIdAsync(_gradeId, _schoolId);
            result.Should().NotBeNull();
            result!.MarksObtained.Should().Be(40);
        }

        [Fact]
        public async Task GetStudentGradeById_IsolatesSchool()
        {
            var result = await _service.GetStudentGradeByIdAsync(_gradeId, _school2Id);
            result.Should().BeNull();
        }

        [Fact]
        public async Task CreateStudentGrade_Success()
        {
            var req = ValidStudentGradeRequest();
            var result = await _service.CreateStudentGradeAsync(_schoolId, req);
            result.MarksObtained.Should().Be(35);
            result.StudentId.Should().Be(_student2Id);
        }

        [Fact]
        public async Task CreateStudentGrade_AutoCalculates_Grade()
        {
            // 35/50 = 70% → B+
            var req = ValidStudentGradeRequest();
            req.MarksObtained = 35; // 70%
            var result = await _service.CreateStudentGradeAsync(_schoolId, req);
            result.Grade.Should().Be("B+");
        }

        [Theory]
        [InlineData(50, 50, "A+")]  // 100% → A+
        [InlineData(45, 50, "A+")]  // 90% → A+ (boundary >=90)
        [InlineData(40, 50, "A")]   // 80% → A (boundary >=80)
        [InlineData(35, 50, "B+")]  // 70% → B+ (boundary >=70)
        [InlineData(30, 50, "B")]   // 60% → B (boundary >=60)
        [InlineData(25, 50, "C")]   // 50% → C (boundary >=50)
        [InlineData(20, 50, "D")]   // 40% → D (boundary >=40)
        [InlineData(10, 50, "F")]   // 20% → F
        public async Task CreateStudentGrade_GradeCalculation_Correct(decimal marks, decimal maxMarks, string expectedGrade)
        {
            // Update the grade item max marks for this test
            var item = new GradeItem
            {
                Id = Guid.NewGuid(), SchoolId = _schoolId, ClassId = _classId,
                SubjectId = _subjectId, CategoryId = _categoryId,
                Name = $"Test {Guid.NewGuid()}", MaxMarks = maxMarks,
                Date = DateTime.UtcNow, Status = "active"
            };
            _context.GradeItems.Add(item);
            await _context.SaveChangesAsync();

            var req = new CreateStudentGradeRequest
            {
                GradeItemId = item.Id, StudentId = _student2Id,
                MarksObtained = marks, Status = "published"
            };
            var result = await _service.CreateStudentGradeAsync(_schoolId, req);
            result.Grade.Should().Be(expectedGrade);
        }

        [Fact]
        public async Task CreateStudentGrade_Rejects_NegativeMarks()
        {
            var req = ValidStudentGradeRequest();
            req.MarksObtained = -1;
            var act = () => _service.CreateStudentGradeAsync(_schoolId, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*negative*");
        }

        [Fact]
        public async Task CreateStudentGrade_Rejects_MarksExceedingMaxMarks()
        {
            var req = ValidStudentGradeRequest();
            req.MarksObtained = 51; // MaxMarks is 50
            var act = () => _service.CreateStudentGradeAsync(_schoolId, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*MaxMarks*");
        }

        [Fact]
        public async Task CreateStudentGrade_Rejects_InvalidStatus()
        {
            var req = ValidStudentGradeRequest();
            req.Status = "approved";
            var act = () => _service.CreateStudentGradeAsync(_schoolId, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*status*");
        }

        [Fact]
        public async Task CreateStudentGrade_Rejects_LongRemarks()
        {
            var req = ValidStudentGradeRequest();
            req.Remarks = new string('x', 1001);
            var act = () => _service.CreateStudentGradeAsync(_schoolId, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*Remarks*");
        }

        [Fact]
        public async Task CreateStudentGrade_Rejects_UnknownGradeItem()
        {
            var req = ValidStudentGradeRequest();
            req.GradeItemId = Guid.NewGuid();
            var act = () => _service.CreateStudentGradeAsync(_schoolId, req);
            await act.Should().ThrowAsync<KeyNotFoundException>().WithMessage("*Grade item*");
        }

        [Fact]
        public async Task CreateStudentGrade_Rejects_UnknownStudent()
        {
            var req = ValidStudentGradeRequest();
            req.StudentId = Guid.NewGuid();
            var act = () => _service.CreateStudentGradeAsync(_schoolId, req);
            await act.Should().ThrowAsync<KeyNotFoundException>().WithMessage("*Student*");
        }

        [Fact]
        public async Task CreateStudentGrade_Rejects_Duplicate()
        {
            // student1 already has a grade for _gradeItemId
            var req = new CreateStudentGradeRequest
            {
                GradeItemId = _gradeItemId, StudentId = _studentId,
                MarksObtained = 30, Status = "published"
            };
            var act = () => _service.CreateStudentGradeAsync(_schoolId, req);
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*already has a grade*");
        }

        [Fact]
        public async Task CreateStudentGrade_Rejects_GradeItem_WrongSchool()
        {
            var req = ValidStudentGradeRequest();
            var act = () => _service.CreateStudentGradeAsync(_school2Id, req); // wrong school
            await act.Should().ThrowAsync<KeyNotFoundException>();
        }

        [Fact]
        public async Task UpdateStudentGrade_Success()
        {
            var req = new UpdateStudentGradeRequest { MarksObtained = 45, Remarks = "Improved" };
            var result = await _service.UpdateStudentGradeAsync(_gradeId, _schoolId, req);
            result.Should().NotBeNull();
            result!.MarksObtained.Should().Be(45);
            result.Grade.Should().Be("A+");  // 45/50 = 90% → A+
        }

        [Fact]
        public async Task UpdateStudentGrade_Rejects_MarksExceedingMax()
        {
            var req = new UpdateStudentGradeRequest { MarksObtained = 100 }; // max is 50
            var act = () => _service.UpdateStudentGradeAsync(_gradeId, _schoolId, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*MaxMarks*");
        }

        [Fact]
        public async Task UpdateStudentGrade_Rejects_NegativeMarks()
        {
            var req = new UpdateStudentGradeRequest { MarksObtained = -5 };
            var act = () => _service.UpdateStudentGradeAsync(_gradeId, _schoolId, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*negative*");
        }

        [Fact]
        public async Task UpdateStudentGrade_Rejects_LongRemarks()
        {
            var req = new UpdateStudentGradeRequest { Remarks = new string('x', 1001) };
            var act = () => _service.UpdateStudentGradeAsync(_gradeId, _schoolId, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*Remarks*");
        }

        [Fact]
        public async Task UpdateStudentGrade_Returns_Null_WhenNotFound()
        {
            var result = await _service.UpdateStudentGradeAsync(Guid.NewGuid(), _schoolId, new UpdateStudentGradeRequest());
            result.Should().BeNull();
        }

        [Fact]
        public async Task UpdateStudentGrade_SchoolIsolation()
        {
            var result = await _service.UpdateStudentGradeAsync(_gradeId, _school2Id, new UpdateStudentGradeRequest { MarksObtained = 30 });
            result.Should().BeNull();
        }

        [Fact]
        public async Task DeleteStudentGrade_Success()
        {
            // Create a fresh grade and delete it
            var grade = new StudentGrade
            {
                Id = Guid.NewGuid(), GradeItemId = _gradeItemId,
                StudentId = _student2Id, MarksObtained = 40, Grade = "B", Status = "published"
            };
            _context.StudentGrades.Add(grade);
            await _context.SaveChangesAsync();

            var result = await _service.DeleteStudentGradeAsync(grade.Id, _schoolId);
            result.Should().BeTrue();
        }

        [Fact]
        public async Task DeleteStudentGrade_Returns_False_WhenNotFound()
        {
            var result = await _service.DeleteStudentGradeAsync(Guid.NewGuid(), _schoolId);
            result.Should().BeFalse();
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // BULK GRADES
        // ═══════════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task BulkCreateGrades_Success()
        {
            var req = new BulkCreateStudentGradeRequest
            {
                GradeItemId = _gradeItemId,
                Grades = new List<BulkGradeEntry>
                {
                    new() { StudentId = _student2Id, MarksObtained = 38 }
                }
            };
            var result = await _service.BulkCreateStudentGradesAsync(_schoolId, req);
            result.Created.Should().Be(1);
            result.Skipped.Should().Be(0);
        }

        [Fact]
        public async Task BulkCreateGrades_Skips_Duplicates()
        {
            var req = new BulkCreateStudentGradeRequest
            {
                GradeItemId = _gradeItemId,
                Grades = new List<BulkGradeEntry>
                {
                    new() { StudentId = _studentId, MarksObtained = 40 } // already has a grade
                }
            };
            var result = await _service.BulkCreateStudentGradesAsync(_schoolId, req);
            result.Created.Should().Be(0);
            result.Skipped.Should().Be(1);
            result.Errors.Should().HaveCount(1);
        }

        [Fact]
        public async Task BulkCreateGrades_Rejects_EmptyList()
        {
            var req = new BulkCreateStudentGradeRequest
            {
                GradeItemId = _gradeItemId, Grades = new List<BulkGradeEntry>()
            };
            var act = () => _service.BulkCreateStudentGradesAsync(_schoolId, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*empty*");
        }

        [Fact]
        public async Task BulkCreateGrades_Rejects_Over200Entries()
        {
            var req = new BulkCreateStudentGradeRequest
            {
                GradeItemId = _gradeItemId,
                Grades = Enumerable.Range(0, 201)
                    .Select(_ => new BulkGradeEntry { StudentId = Guid.NewGuid(), MarksObtained = 30 })
                    .ToList()
            };
            var act = () => _service.BulkCreateStudentGradesAsync(_schoolId, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*200*");
        }

        [Fact]
        public async Task BulkCreateGrades_Skips_OutOfRangeMarks()
        {
            var req = new BulkCreateStudentGradeRequest
            {
                GradeItemId = _gradeItemId,
                Grades = new List<BulkGradeEntry>
                {
                    new() { StudentId = _student2Id, MarksObtained = 100 } // max is 50
                }
            };
            var result = await _service.BulkCreateStudentGradesAsync(_schoolId, req);
            result.Created.Should().Be(0);
            result.Skipped.Should().Be(1);
        }

        [Fact]
        public async Task BulkCreateGrades_Rejects_UnknownGradeItem()
        {
            var req = new BulkCreateStudentGradeRequest
            {
                GradeItemId = Guid.NewGuid(),
                Grades = new List<BulkGradeEntry> { new() { StudentId = _student2Id, MarksObtained = 30 } }
            };
            var act = () => _service.BulkCreateStudentGradesAsync(_schoolId, req);
            await act.Should().ThrowAsync<KeyNotFoundException>();
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // CCE ASSESSMENTS
        // ═══════════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task GetCCEAssessments_Returns_Results()
        {
            var result = await _service.GetCCEAssessmentsAsync(_schoolId);
            result.Total.Should().Be(1);
        }

        [Fact]
        public async Task GetCCEAssessments_SchoolIsolation()
        {
            var result = await _service.GetCCEAssessmentsAsync(_school2Id);
            result.Total.Should().Be(0);
        }

        [Fact]
        public async Task GetCCEAssessments_FiltersBy_AcademicYear()
        {
            var result = await _service.GetCCEAssessmentsAsync(_schoolId, academicYear: "2024-25");
            result.Total.Should().Be(0);
        }

        [Fact]
        public async Task GetCCEAssessmentById_Returns_Assessment()
        {
            var result = await _service.GetCCEAssessmentByIdAsync(_cceId, _schoolId);
            result.Should().NotBeNull();
            result!.SkillArea.Should().Be("Communication");
        }

        [Fact]
        public async Task GetCCEAssessmentById_IsolatesSchool()
        {
            var result = await _service.GetCCEAssessmentByIdAsync(_cceId, _school2Id);
            result.Should().BeNull();
        }

        [Fact]
        public async Task CreateCCEAssessment_Success()
        {
            var req = ValidCCERequest();
            var result = await _service.CreateCCEAssessmentAsync(_schoolId, req);
            result.SkillArea.Should().Be("Creativity");
            result.Grade.Should().Be("B+");
            result.Term.Should().Be("T2");
        }

        [Theory]
        [InlineData("")]
        [InlineData("2025/2026")]
        [InlineData("25-26")]
        public async Task CreateCCEAssessment_Rejects_InvalidAcademicYear(string year)
        {
            var req = ValidCCERequest();
            req.AcademicYear = year;
            var act = () => _service.CreateCCEAssessmentAsync(_schoolId, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*Academic year*");
        }

        [Theory]
        [InlineData("T1")]
        [InlineData("T2")]
        [InlineData("T3")]
        [InlineData("1")]
        [InlineData("2")]
        [InlineData("3")]
        public async Task CreateCCEAssessment_AcceptsValidTerms(string term)
        {
            var req = ValidCCERequest();
            req.Term = term;
            req.SkillArea = $"Skill {Guid.NewGuid()}"; // unique to avoid duplicate
            var result = await _service.CreateCCEAssessmentAsync(_schoolId, req);
            result.Term.Should().Be(term);
        }

        [Theory]
        [InlineData("Term4")]
        [InlineData("Q1")]
        [InlineData("")]
        public async Task CreateCCEAssessment_Rejects_InvalidTerm(string term)
        {
            var req = ValidCCERequest();
            req.Term = term;
            var act = () => _service.CreateCCEAssessmentAsync(_schoolId, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*Term*");
        }

        [Theory]
        [InlineData("A+")]
        [InlineData("A")]
        [InlineData("B+")]
        [InlineData("B")]
        [InlineData("C")]
        [InlineData("D")]
        [InlineData("E")]
        public async Task CreateCCEAssessment_AcceptsValidCCEGrades(string grade)
        {
            var req = ValidCCERequest();
            req.Grade = grade;
            req.SkillArea = $"Skill {Guid.NewGuid()}";
            var result = await _service.CreateCCEAssessmentAsync(_schoolId, req);
            result.Grade.Should().Be(grade);
        }

        [Theory]
        [InlineData("F")]
        [InlineData("G")]
        [InlineData("")]
        public async Task CreateCCEAssessment_Rejects_InvalidCCEGrade(string grade)
        {
            var req = ValidCCERequest();
            req.Grade = grade;
            var act = () => _service.CreateCCEAssessmentAsync(_schoolId, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*CCE Grade*");
        }

        [Fact]
        public async Task CreateCCEAssessment_Rejects_ShortSkillArea()
        {
            var req = ValidCCERequest();
            req.SkillArea = "X";
            var act = () => _service.CreateCCEAssessmentAsync(_schoolId, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*Skill area*");
        }

        [Fact]
        public async Task CreateCCEAssessment_Rejects_LongRemarks()
        {
            var req = ValidCCERequest();
            req.Remarks = new string('x', 1001);
            var act = () => _service.CreateCCEAssessmentAsync(_schoolId, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*Remarks*");
        }

        [Fact]
        public async Task CreateCCEAssessment_Rejects_UnknownStudent()
        {
            var req = ValidCCERequest();
            req.StudentId = Guid.NewGuid();
            var act = () => _service.CreateCCEAssessmentAsync(_schoolId, req);
            await act.Should().ThrowAsync<KeyNotFoundException>().WithMessage("*Student*");
        }

        [Fact]
        public async Task CreateCCEAssessment_Rejects_Duplicate()
        {
            // student1 already has T1/Communication CCE in 2025-26
            var req = new CreateCCEAssessmentRequest
            {
                SchoolId = _schoolId, StudentId = _studentId, ClassId = _classId,
                AcademicYear = "2025-26", Term = "T1", SkillArea = "Communication", Grade = "B"
            };
            var act = () => _service.CreateCCEAssessmentAsync(_schoolId, req);
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*already exists*");
        }

        [Fact]
        public async Task UpdateCCEAssessment_Success()
        {
            var req = new UpdateCCEAssessmentRequest { Grade = "B+", Remarks = "Good progress" };
            var result = await _service.UpdateCCEAssessmentAsync(_cceId, _schoolId, req);
            result.Should().NotBeNull();
            result!.Grade.Should().Be("B+");
        }

        [Fact]
        public async Task UpdateCCEAssessment_Rejects_InvalidGrade()
        {
            var req = new UpdateCCEAssessmentRequest { Grade = "Z" };
            var act = () => _service.UpdateCCEAssessmentAsync(_cceId, _schoolId, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*CCE Grade*");
        }

        [Fact]
        public async Task UpdateCCEAssessment_Rejects_LongRemarks()
        {
            var req = new UpdateCCEAssessmentRequest { Remarks = new string('x', 1001) };
            var act = () => _service.UpdateCCEAssessmentAsync(_cceId, _schoolId, req);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*Remarks*");
        }

        [Fact]
        public async Task DeleteCCEAssessment_Success()
        {
            var result = await _service.DeleteCCEAssessmentAsync(_cceId, _schoolId);
            result.Should().BeTrue();
        }

        [Fact]
        public async Task DeleteCCEAssessment_Returns_False_WhenNotFound()
        {
            var result = await _service.DeleteCCEAssessmentAsync(Guid.NewGuid(), _schoolId);
            result.Should().BeFalse();
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // STATS
        // ═══════════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task GetStats_Returns_Correct_TotalCounts()
        {
            var result = await _service.GetStatsAsync(_schoolId);
            result.TotalGradeItems.Should().Be(1);
            result.TotalStudentGrades.Should().Be(1);
        }

        [Fact]
        public async Task GetStats_Calculates_AverageMarks()
        {
            // Seeded: student1 has 40 marks on gradeItem (max 50)
            var result = await _service.GetStatsAsync(_schoolId);
            result.AverageMarks.Should().Be(40);
        }

        [Fact]
        public async Task GetStats_Calculates_PassRate()
        {
            // 40/50 = 80% → B+ (not F) → pass rate 100%
            var result = await _service.GetStatsAsync(_schoolId);
            result.PassRate.Should().Be(100);
        }

        [Fact]
        public async Task GetStats_GradeDistribution_Correct()
        {
            // Seeded: student1 has 40/50 = 80% → A
            var result = await _service.GetStatsAsync(_schoolId);
            result.GradeDistribution.Should().ContainKey("A");
            result.GradeDistribution["A"].Should().Be(1);
        }

        [Fact]
        public async Task GetStats_SchoolIsolation()
        {
            var result = await _service.GetStatsAsync(_school2Id);
            result.TotalGradeItems.Should().Be(0);
            result.TotalStudentGrades.Should().Be(0);
            result.PassRate.Should().Be(0);
        }

        [Fact]
        public async Task GetStats_EmptySchool_HasZeroValues()
        {
            var emptySchoolId = Guid.NewGuid();
            _context.Schools.Add(new School { Id = emptySchoolId, Name = "Empty", SchoolCode = "EMP" });
            await _context.SaveChangesAsync();

            var result = await _service.GetStatsAsync(emptySchoolId);
            result.TotalGradeItems.Should().Be(0);
            result.AverageMarks.Should().Be(0);
            result.PassRate.Should().Be(0);
            result.GradeDistribution.Should().NotBeNull();
        }
    }
}
