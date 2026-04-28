using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;
using SmsApi.Services;
using Xunit;
using StaffEntity = SmsApi.Models.Entities.Staff;

namespace SmsApi.Tests.Unit.Academics;

public class AcademicsServiceTests : IAsyncLifetime
{
    private readonly AppDbContext _context;
    private readonly AcademicsService _service;
    private readonly Guid _schoolId = Guid.NewGuid();

    public AcademicsServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: $"AcademicsTestDb-{Guid.NewGuid()}")
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        _context = new AppDbContext(options);
        _service = new AcademicsService(_context);
    }

    public async Task InitializeAsync()
    {
        await _context.Database.EnsureCreatedAsync();
    }

    public async Task DisposeAsync()
    {
        await _context.Database.EnsureDeletedAsync();
        _context.Dispose();
    }

    #region Classes CRUD Tests

    [Fact]
    public async Task GetClassesAsync_NormalizesPaginationBounds()
    {
        await SeedClassAsync(_schoolId, "10");

        var result = await _service.GetClassesAsync(_schoolId, 0, -10);

        result.Page.Should().Be(1);
        result.PageSize.Should().Be(20);
        result.Total.Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task CreateClassAsync_Success()
    {
        var result = await _service.CreateClassAsync(new CreateClassRequest
        {
            SchoolId = _schoolId,
            Name = "10",
            Standard = "X",
            Status = "active"
        });

        result.Should().NotBeNull();
        result.Name.Should().Be("10");
    }

    [Fact]
    public async Task CreateClassAsync_Throws_WhenNameAndStandardMissing()
    {
        var act = async () => await _service.CreateClassAsync(new CreateClassRequest
        {
            SchoolId = _schoolId,
            Name = " ",
            Standard = "  "
        });

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Class name/standard is required*");
    }

    [Fact]
    public async Task CreateClassAsync_Throws_WhenDuplicateClassNameExists()
    {
        await SeedClassAsync(_schoolId, "10");

        var act = async () => await _service.CreateClassAsync(new CreateClassRequest
        {
            SchoolId = _schoolId,
            Name = "10",
            Status = "active"
        });

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*same name already exists*");
    }

    [Fact]
    public async Task CreateClassAsync_Throws_WhenCapacityInvalid()
    {
        var act = async () => await _service.CreateClassAsync(new CreateClassRequest
        {
            SchoolId = _schoolId,
            Name = "11",
            Capacity = 0,
            Status = "active"
        });

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task CreateClassAsync_ThrowsWhenInvalidStatus()
    {
        var act = async () => await _service.CreateClassAsync(new CreateClassRequest
        {
            SchoolId = _schoolId,
            Name = "12",
            Status = "invalid_status"
        });

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task UpdateClassAsync_Success()
    {
        var classEntity = await SeedClassAsync(_schoolId, "10");

        var result = await _service.UpdateClassAsync(classEntity.Id, _schoolId, new CreateClassRequest
        {
            SchoolId = _schoolId,
            Name = "Updated Class",
            Status = "active"
        });

        result.Should().NotBeNull();
        result.Name.Should().Be("Updated Class");
    }

    [Fact]
    public async Task DeleteClassAsync_ReturnsTrue()
    {
        var classEntity = await SeedClassAsync(_schoolId, "10");

        var result = await _service.DeleteClassAsync(classEntity.Id, _schoolId);

        result.Should().BeTrue();
    }

    [Fact]
    public async Task DeleteClassAsync_ReturnsfalseWhenNotFound()
    {
        var result = await _service.DeleteClassAsync(Guid.NewGuid(), _schoolId);

        result.Should().BeFalse();
    }

    #endregion

    #region Sections CRUD Tests

    [Fact]
    public async Task CreateSectionAsync_Success()
    {
        var classEntity = await SeedClassAsync(_schoolId, "10");

        var result = await _service.CreateSectionAsync(new CreateSectionRequest
        {
            SchoolId = _schoolId,
            ClassId = classEntity.Id,
            Name = "A",
            Capacity = 50,
            Status = "active"
        });

        result.Should().NotBeNull();
        result.Name.Should().Be("A");
    }

    [Fact]
    public async Task CreateSectionAsync_Throws_WhenClassDoesNotExist()
    {
        var act = async () => await _service.CreateSectionAsync(new CreateSectionRequest
        {
            SchoolId = _schoolId,
            ClassId = Guid.NewGuid(),
            Name = "A",
            Status = "active"
        });

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Class does not exist*");
    }

    [Fact]
    public async Task CreateSectionAsync_Throws_WhenDuplicateSectionInClass()
    {
        var classEntity = await SeedClassAsync(_schoolId, "10");
        await SeedSectionAsync(_schoolId, classEntity.Id, "A");

        var act = async () => await _service.CreateSectionAsync(new CreateSectionRequest
        {
            SchoolId = _schoolId,
            ClassId = classEntity.Id,
            Name = "A",
            Status = "active"
        });

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*same name already exists*");
    }

    [Fact]
    public async Task CreateSectionAsync_Throws_WhenNameTooLong()
    {
        var classEntity = await SeedClassAsync(_schoolId, "10");

        var act = async () => await _service.CreateSectionAsync(new CreateSectionRequest
        {
            SchoolId = _schoolId,
            ClassId = classEntity.Id,
            Name = new string('A', 51),
            Status = "active"
        });

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task CreateSectionAsync_Throws_WhenCapacityInvalid()
    {
        var classEntity = await SeedClassAsync(_schoolId, "10");

        var act = async () => await _service.CreateSectionAsync(new CreateSectionRequest
        {
            SchoolId = _schoolId,
            ClassId = classEntity.Id,
            Name = "B",
            Capacity = 0,
            Status = "active"
        });

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task UpdateSectionAsync_Success()
    {
        var classEntity = await SeedClassAsync(_schoolId, "10");
        var section = await SeedSectionAsync(_schoolId, classEntity.Id, "A");

        var result = await _service.UpdateSectionAsync(section.Id, _schoolId, new CreateSectionRequest
        {
            SchoolId = _schoolId,
            ClassId = classEntity.Id,
            Name = "A-Updated",
            Status = "active"
        });

        result.Should().NotBeNull();
        result.Name.Should().Be("A-Updated");
    }

    #endregion

    #region Subjects CRUD Tests

    [Fact]
    public async Task CreateSubjectAsync_Success()
    {
        var result = await _service.CreateSubjectAsync(new CreateSubjectRequest
        {
            SchoolId = _schoolId,
            Name = "Mathematics",
            Code = "MATH",
            MaxMarks = 100,
            PassMarks = 40,
            Status = "active"
        });

        result.Should().NotBeNull();
        result.Code.Should().Be("MATH");
    }

    [Fact]
    public async Task CreateSubjectAsync_Throws_WhenDuplicateCodeExists()
    {
        await SeedSubjectAsync(_schoolId, "Mathematics", "MATH");

        var act = async () => await _service.CreateSubjectAsync(new CreateSubjectRequest
        {
            SchoolId = _schoolId,
            Name = "Advanced Mathematics",
            Code = "MATH",
            Status = "active"
        });

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*same code already exists*");
    }

    [Fact]
    public async Task CreateSubjectAsync_Throws_WhenPassMarksGreaterThanMaxMarks()
    {
        var act = async () => await _service.CreateSubjectAsync(new CreateSubjectRequest
        {
            SchoolId = _schoolId,
            Name = "Science",
            Code = "SCI",
            MaxMarks = 50,
            PassMarks = 60,
            Status = "active"
        });

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Pass marks cannot exceed max marks*");
    }

    [Fact]
    public async Task CreateSubjectAsync_Throws_WhenMaxMarksZero()
    {
        var act = async () => await _service.CreateSubjectAsync(new CreateSubjectRequest
        {
            SchoolId = _schoolId,
            Name = "Science",
            Code = "SCI",
            MaxMarks = 0,
            Status = "active"
        });

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task UpdateSubjectAsync_Success()
    {
        var subject = await SeedSubjectAsync(_schoolId, "Mathematics", "MATH");

        var result = await _service.UpdateSubjectAsync(subject.Id, _schoolId, new CreateSubjectRequest
        {
            SchoolId = _schoolId,
            Name = "Advanced Math",
            Code = "MATH",
            Status = "active"
        });

        result.Should().NotBeNull();
        result.Name.Should().Be("Advanced Math");
    }

    #endregion

    #region Academic Years Tests

    [Fact]
    public async Task CreateAcademicYearAsync_Success()
    {
        var result = await _service.CreateAcademicYearAsync(_schoolId, new CreateAcademicYearRequest
        {
            Name = "2025-2026",
            StartDate = new DateTime(2025, 4, 1),
            EndDate = new DateTime(2026, 3, 31)
        });

        result.Should().NotBeNull();
        result.Name.Should().Be("2025-2026");
    }

    [Fact]
    public async Task CreateAcademicYearAsync_Throws_WhenEndDateNotAfterStartDate()
    {
        var act = async () => await _service.CreateAcademicYearAsync(_schoolId, new CreateAcademicYearRequest
        {
            Name = "2026-2027",
            StartDate = new DateTime(2026, 4, 1),
            EndDate = new DateTime(2026, 4, 1)
        });

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*end date must be after start date*");
    }

    [Fact]
    public async Task CreateAcademicYearAsync_Throws_WhenDuplicateNameExists()
    {
        await SeedAcademicYearAsync(_schoolId, "2025-2026", new DateTime(2025, 4, 1), new DateTime(2026, 3, 31));

        var act = async () => await _service.CreateAcademicYearAsync(_schoolId, new CreateAcademicYearRequest
        {
            Name = "2025-2026",
            StartDate = new DateTime(2025, 5, 1),
            EndDate = new DateTime(2026, 4, 30)
        });

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*same name already exists*");
    }

    [Fact]
    public async Task UpdateAcademicYearAsync_Success()
    {
        var year = await SeedAcademicYearAsync(_schoolId, "2025-2026", new DateTime(2025, 4, 1), new DateTime(2026, 3, 31));

        var result = await _service.UpdateAcademicYearAsync(year.Id, _schoolId, new CreateAcademicYearRequest
        {
            Name = "2025-2026-Updated",
            StartDate = year.StartDate,
            EndDate = year.EndDate
        });

        result.Should().NotBeNull();
        result.Name.Should().Be("2025-2026-Updated");
    }

    [Fact]
    public async Task UpdateAcademicYearAsync_Throws_WhenDuplicateYearNameExists()
    {
        var first = await SeedAcademicYearAsync(_schoolId, "2025-2026", new DateTime(2025, 4, 1), new DateTime(2026, 3, 31));
        var second = await SeedAcademicYearAsync(_schoolId, "2026-2027", new DateTime(2026, 4, 1), new DateTime(2027, 3, 31));

        var act = async () => await _service.UpdateAcademicYearAsync(second.Id, _schoolId, new CreateAcademicYearRequest
        {
            Name = first.Name,
            StartDate = second.StartDate,
            EndDate = second.EndDate
        });

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*same name already exists*");
    }

    #endregion

    #region Class-Subject Assignment Tests

    [Fact]
    public async Task AssignSubjectToClassAsync_Success()
    {
        var classEntity = await SeedClassAsync(_schoolId, "10");
        var subject = await SeedSubjectAsync(_schoolId, "Mathematics", "MATH");

        var result = await _service.AssignSubjectToClassAsync(new AssignSubjectRequest
        {
            SchoolId = _schoolId,
            ClassId = classEntity.Id,
            SubjectId = subject.Id,
            Status = "active"
        });

        result.Should().NotBeNull();
    }

    [Fact]
    public async Task AssignSubjectToClassAsync_Throws_WhenAssignmentAlreadyExists()
    {
        var classEntity = await SeedClassAsync(_schoolId, "10");
        var subject = await SeedSubjectAsync(_schoolId, "Mathematics", "MATH");

        await _service.AssignSubjectToClassAsync(new AssignSubjectRequest
        {
            SchoolId = _schoolId,
            ClassId = classEntity.Id,
            SubjectId = subject.Id,
            Status = "active"
        });

        var act = async () => await _service.AssignSubjectToClassAsync(new AssignSubjectRequest
        {
            SchoolId = _schoolId,
            ClassId = classEntity.Id,
            SubjectId = subject.Id,
            Status = "active"
        });

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*already assigned to this class*");
    }

    [Fact]
    public async Task AssignSubjectToClassAsync_Throws_WhenClassNotFound()
    {
        var subject = await SeedSubjectAsync(_schoolId, "Mathematics", "MATH");

        var act = async () => await _service.AssignSubjectToClassAsync(new AssignSubjectRequest
        {
            SchoolId = _schoolId,
            ClassId = Guid.NewGuid(),
            SubjectId = subject.Id,
            Status = "active"
        });

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task AssignSubjectToClassAsync_Throws_WhenSubjectNotFound()
    {
        var classEntity = await SeedClassAsync(_schoolId, "10");

        var act = async () => await _service.AssignSubjectToClassAsync(new AssignSubjectRequest
        {
            SchoolId = _schoolId,
            ClassId = classEntity.Id,
            SubjectId = Guid.NewGuid(),
            Status = "active"
        });

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    #endregion

    #region Teacher Assignment Tests

    [Fact]
    public async Task AssignTeacherAsync_Success()
    {
        var classEntity = await SeedClassAsync(_schoolId, "10");
        var staff = await SeedStaffAsync(_schoolId);

        var result = await _service.AssignTeacherAsync(new AssignTeacherRequest
        {
            SchoolId = _schoolId,
            StaffId = staff.Id,
            ClassId = classEntity.Id,
            IsClassTeacher = true,
            AcademicYear = "2025-2026",
            Status = "active"
        });

        result.Should().NotBeNull();
    }

    [Fact]
    public async Task AssignTeacherAsync_Throws_WhenAcademicYearMissing()
    {
        var classEntity = await SeedClassAsync(_schoolId, "10");
        var staff = await SeedStaffAsync(_schoolId);

        var act = async () => await _service.AssignTeacherAsync(new AssignTeacherRequest
        {
            SchoolId = _schoolId,
            StaffId = staff.Id,
            ClassId = classEntity.Id,
            IsClassTeacher = true,
            AcademicYear = "",
            Status = "active"
        });

        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*Academic year is required*");
    }

    [Fact]
    public async Task AssignTeacherAsync_Throws_WhenStaffNotFound()
    {
        var classEntity = await SeedClassAsync(_schoolId, "10");

        var act = async () => await _service.AssignTeacherAsync(new AssignTeacherRequest
        {
            SchoolId = _schoolId,
            StaffId = Guid.NewGuid(),
            ClassId = classEntity.Id,
            IsClassTeacher = true,
            AcademicYear = "2025-2026",
            Status = "active"
        });

        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("*Staff member does not exist*");
    }

    [Fact]
    public async Task AssignTeacherAsync_Throws_WhenClassNotFound()
    {
        var staff = await SeedStaffAsync(_schoolId);

        var act = async () => await _service.AssignTeacherAsync(new AssignTeacherRequest
        {
            SchoolId = _schoolId,
            StaffId = staff.Id,
            ClassId = Guid.NewGuid(),
            IsClassTeacher = true,
            AcademicYear = "2025-2026",
            Status = "active"
        });

        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("*Class does not exist*");
    }

    [Fact]
    public async Task AssignTeacherAsync_Throws_WhenDuplicateAssignment()
    {
        var classEntity = await SeedClassAsync(_schoolId, "10");
        var staff = await SeedStaffAsync(_schoolId);

        await _service.AssignTeacherAsync(new AssignTeacherRequest
        {
            SchoolId = _schoolId,
            StaffId = staff.Id,
            ClassId = classEntity.Id,
            IsClassTeacher = true,
            AcademicYear = "2025-2026",
            Status = "active"
        });

        var act = async () => await _service.AssignTeacherAsync(new AssignTeacherRequest
        {
            SchoolId = _schoolId,
            StaffId = staff.Id,
            ClassId = classEntity.Id,
            IsClassTeacher = true,
            AcademicYear = "2025-2026",
            Status = "active"
        });

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*already exists*");
    }

    #endregion

    #region Grade Tier Tests

    [Fact]
    public async Task CreateGradeTierAsync_Success()
    {
        var classEntity = await SeedClassAsync(_schoolId, "10");

        var result = await _service.CreateGradeTierAsync(new CreateGradeTierRequest
        {
            SchoolId = _schoolId,
            ClassId = classEntity.Id,
            Grade = "A",
            MinMarks = 80,
            MaxMarks = 100,
            GPA = 4.0m,
            DisplayOrder = 1
        });

        result.Should().NotBeNull();
        result.Grade.Should().Be("A");
    }

    [Fact]
    public async Task CreateGradeTierAsync_Throws_WhenGradeMissing()
    {
        var classEntity = await SeedClassAsync(_schoolId, "10");

        var act = async () => await _service.CreateGradeTierAsync(new CreateGradeTierRequest
        {
            SchoolId = _schoolId,
            ClassId = classEntity.Id,
            Grade = "",
            MinMarks = 80,
            MaxMarks = 100,
            GPA = 4.0m
        });

        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*Grade label is required*");
    }

    [Fact]
    public async Task CreateGradeTierAsync_Throws_WhenMinMarksBelowRange()
    {
        var classEntity = await SeedClassAsync(_schoolId, "10");

        var act = async () => await _service.CreateGradeTierAsync(new CreateGradeTierRequest
        {
            SchoolId = _schoolId,
            ClassId = classEntity.Id,
            Grade = "A",
            MinMarks = -1,
            MaxMarks = 100,
            GPA = 4.0m
        });

        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*Minimum marks must be between 0 and 100*");
    }

    [Fact]
    public async Task CreateGradeTierAsync_Throws_WhenMaxMarksAboveRange()
    {
        var classEntity = await SeedClassAsync(_schoolId, "10");

        var act = async () => await _service.CreateGradeTierAsync(new CreateGradeTierRequest
        {
            SchoolId = _schoolId,
            ClassId = classEntity.Id,
            Grade = "A",
            MinMarks = 80,
            MaxMarks = 101,
            GPA = 4.0m
        });

        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*Maximum marks must be between 0 and 100*");
    }

    [Fact]
    public async Task CreateGradeTierAsync_Throws_WhenMinGreaterThanMax()
    {
        var classEntity = await SeedClassAsync(_schoolId, "10");

        var act = async () => await _service.CreateGradeTierAsync(new CreateGradeTierRequest
        {
            SchoolId = _schoolId,
            ClassId = classEntity.Id,
            Grade = "A",
            MinMarks = 90,
            MaxMarks = 80,
            GPA = 4.0m
        });

        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*Minimum marks must be less than maximum marks*");
    }

    [Fact]
    public async Task CreateGradeTierAsync_Throws_WhenGPAOutOfRange()
    {
        var classEntity = await SeedClassAsync(_schoolId, "10");

        var act = async () => await _service.CreateGradeTierAsync(new CreateGradeTierRequest
        {
            SchoolId = _schoolId,
            ClassId = classEntity.Id,
            Grade = "A",
            MinMarks = 80,
            MaxMarks = 100,
            GPA = 10.5m
        });

        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*GPA must be between 0 and 10*");
    }

    [Fact]
    public async Task CreateGradeTierAsync_Throws_WhenDuplicateGradeLabel()
    {
        var classEntity = await SeedClassAsync(_schoolId, "10");

        await _service.CreateGradeTierAsync(new CreateGradeTierRequest
        {
            SchoolId = _schoolId,
            ClassId = classEntity.Id,
            Grade = "A",
            MinMarks = 80,
            MaxMarks = 100,
            GPA = 4.0m
        });

        var act = async () => await _service.CreateGradeTierAsync(new CreateGradeTierRequest
        {
            SchoolId = _schoolId,
            ClassId = classEntity.Id,
            Grade = "A",
            MinMarks = 70,
            MaxMarks = 79,
            GPA = 3.5m
        });

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*A grade tier with this label already exists for this class*");
    }

    [Fact]
    public async Task CreateGradeTierAsync_Throws_WhenOverlappingRange()
    {
        var classEntity = await SeedClassAsync(_schoolId, "10");

        await _service.CreateGradeTierAsync(new CreateGradeTierRequest
        {
            SchoolId = _schoolId,
            ClassId = classEntity.Id,
            Grade = "A",
            MinMarks = 80,
            MaxMarks = 100,
            GPA = 4.0m
        });

        var act = async () => await _service.CreateGradeTierAsync(new CreateGradeTierRequest
        {
            SchoolId = _schoolId,
            ClassId = classEntity.Id,
            Grade = "B",
            MinMarks = 75,
            MaxMarks = 90,
            GPA = 3.5m
        });

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*overlaps with an existing grade tier*");
    }

    [Fact]
    public async Task UpdateGradeTierAsync_Success()
    {
        var classEntity = await SeedClassAsync(_schoolId, "10");
        var tier = await SeedGradeTierAsync(_schoolId, classEntity.Id, "A", 80, 100, 4.0m);

        var result = await _service.UpdateGradeTierAsync(tier.Id, new UpdateGradeTierRequest
        {
            Grade = "A+",
            MinMarks = 85,
            MaxMarks = 100,
            GPA = 4.0m
        }, _schoolId);

        result.Should().NotBeNull();
        result.Grade.Should().Be("A+");
    }

    [Fact]
    public async Task UpdateGradeTierAsync_Throws_WhenMinMarksBelowRange()
    {
        var classEntity = await SeedClassAsync(_schoolId, "10");
        var tier = await SeedGradeTierAsync(_schoolId, classEntity.Id, "A", 80, 100, 4.0m);

        var act = async () => await _service.UpdateGradeTierAsync(tier.Id, new UpdateGradeTierRequest
        {
            MinMarks = -1
        }, _schoolId);

        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*Minimum marks must be between 0 and 100*");
    }

    [Fact]
    public async Task UpdateGradeTierAsync_Throws_WhenGPAOutOfRange()
    {
        var classEntity = await SeedClassAsync(_schoolId, "10");
        var tier = await SeedGradeTierAsync(_schoolId, classEntity.Id, "A", 80, 100, 4.0m);

        var act = async () => await _service.UpdateGradeTierAsync(tier.Id, new UpdateGradeTierRequest
        {
            GPA = -0.5m
        }, _schoolId);

        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*GPA must be between 0 and 10*");
    }

    #endregion

    #region Exam Type Tests

    [Fact]
    public async Task CreateExamTypeAsync_Success()
    {
        var result = await _service.CreateExamTypeAsync(_schoolId, new CreateExamTypeRequest
        {
            Name = "Mid-Term",
            DefaultMaxMarks = 100,
            ExamsPerTerm = 2,
            IsUnitTest = false
        });

        result.Should().NotBeNull();
        result.Name.Should().Be("Mid-Term");
    }

    [Fact]
    public async Task CreateExamTypeAsync_Throws_WhenNameTooShort()
    {
        var act = async () => await _service.CreateExamTypeAsync(_schoolId, new CreateExamTypeRequest
        {
            Name = "MT",
            DefaultMaxMarks = 100,
            ExamsPerTerm = 2
        });

        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*at least 3 characters*");
    }

    [Fact]
    public async Task CreateExamTypeAsync_Throws_WhenDefaultMaxMarksInvalid()
    {
        var act = async () => await _service.CreateExamTypeAsync(_schoolId, new CreateExamTypeRequest
        {
            Name = "Mid-Term",
            DefaultMaxMarks = 0,
            ExamsPerTerm = 2
        });

        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*between 1 and 1000*");
    }

    [Fact]
    public async Task CreateExamTypeAsync_Throws_WhenExamsPerTermInvalid()
    {
        var act = async () => await _service.CreateExamTypeAsync(_schoolId, new CreateExamTypeRequest
        {
            Name = "Mid-Term",
            DefaultMaxMarks = 100,
            ExamsPerTerm = 25
        });

        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*between 1 and 20*");
    }

    [Fact]
    public async Task CreateExamTypeAsync_Throws_WhenDuplicateName()
    {
        await _service.CreateExamTypeAsync(_schoolId, new CreateExamTypeRequest
        {
            Name = "Mid-Term",
            DefaultMaxMarks = 100,
            ExamsPerTerm = 2
        });

        var act = async () => await _service.CreateExamTypeAsync(_schoolId, new CreateExamTypeRequest
        {
            Name = "Mid-Term",
            DefaultMaxMarks = 100,
            ExamsPerTerm = 2
        });

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*same name already exists*");
    }

    [Fact]
    public async Task UpdateExamTypeAsync_Success()
    {
        var exam = await _service.CreateExamTypeAsync(_schoolId, new CreateExamTypeRequest
        {
            Name = "Mid-Term",
            DefaultMaxMarks = 100,
            ExamsPerTerm = 2
        });

        var result = await _service.UpdateExamTypeAsync(exam.Id, _schoolId, new CreateExamTypeRequest
        {
            Name = "Final-Term",
            DefaultMaxMarks = 150,
            ExamsPerTerm = 1
        });

        result.Should().NotBeNull();
        result.Name.Should().Be("Final-Term");
    }

    #endregion

    #region Subject Type Tests

    [Fact]
    public async Task CreateSubjectTypeAsync_Success()
    {
        var result = await _service.CreateSubjectTypeAsync(_schoolId, new CreateSubjectTypeRequest
        {
            Name = "Core",
            Description = "Core subjects"
        });

        result.Should().NotBeNull();
        result.Name.Should().Be("Core");
    }

    [Fact]
    public async Task CreateSubjectTypeAsync_Throws_WhenNameTooShort()
    {
        var act = async () => await _service.CreateSubjectTypeAsync(_schoolId, new CreateSubjectTypeRequest
        {
            Name = "AB",
            Description = "Test"
        });

        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*at least 3 characters*");
    }

    [Fact]
    public async Task CreateSubjectTypeAsync_Throws_WhenDuplicateName()
    {
        await _service.CreateSubjectTypeAsync(_schoolId, new CreateSubjectTypeRequest
        {
            Name = "Core",
            Description = "Core subjects"
        });

        var act = async () => await _service.CreateSubjectTypeAsync(_schoolId, new CreateSubjectTypeRequest
        {
            Name = "Core",
            Description = "Another core"
        });

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*same name already exists*");
    }

    [Fact]
    public async Task UpdateSubjectTypeAsync_Success()
    {
        var type = await _service.CreateSubjectTypeAsync(_schoolId, new CreateSubjectTypeRequest
        {
            Name = "Core",
            Description = "Core subjects"
        });

        var result = await _service.UpdateSubjectTypeAsync(type.Id, _schoolId, new CreateSubjectTypeRequest
        {
            Name = "Advanced",
            Description = "Advanced subjects"
        });

        result.Should().NotBeNull();
        result.Name.Should().Be("Advanced");
    }

    #endregion

    #region Student Subject Tests

    [Fact]
    public async Task AssignStudentSubjectAsync_Success()
    {
        var student = await SeedStudentAsync(_schoolId);
        var classEntity = await SeedClassAsync(_schoolId, "10");
        var subject = await SeedSubjectAsync(_schoolId, "Mathematics", "MATH");

        var result = await _service.AssignStudentSubjectAsync(_schoolId, new AssignStudentSubjectRequest
        {
            StudentId = student.Id,
            ClassId = classEntity.Id,
            SubjectId = subject.Id,
            AcademicYear = "2025-2026",
            IsMandatory = true
        });

        result.Should().NotBeNull();
    }

    [Fact]
    public async Task AssignStudentSubjectAsync_Throws_WhenAcademicYearMissing()
    {
        var student = await SeedStudentAsync(_schoolId);
        var classEntity = await SeedClassAsync(_schoolId, "10");
        var subject = await SeedSubjectAsync(_schoolId, "Mathematics", "MATH");

        var act = async () => await _service.AssignStudentSubjectAsync(_schoolId, new AssignStudentSubjectRequest
        {
            StudentId = student.Id,
            ClassId = classEntity.Id,
            SubjectId = subject.Id,
            AcademicYear = "",
            IsMandatory = true
        });

        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*Academic year is required*");
    }

    [Fact]
    public async Task AssignStudentSubjectAsync_Throws_WhenStudentNotFound()
    {
        var classEntity = await SeedClassAsync(_schoolId, "10");
        var subject = await SeedSubjectAsync(_schoolId, "Mathematics", "MATH");

        var act = async () => await _service.AssignStudentSubjectAsync(_schoolId, new AssignStudentSubjectRequest
        {
            StudentId = Guid.NewGuid(),
            ClassId = classEntity.Id,
            SubjectId = subject.Id,
            AcademicYear = "2025-2026",
            IsMandatory = true
        });

        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("*Student does not exist*");
    }

    [Fact]
    public async Task AssignStudentSubjectAsync_Throws_WhenClassNotFound()
    {
        var student = await SeedStudentAsync(_schoolId);
        var subject = await SeedSubjectAsync(_schoolId, "Mathematics", "MATH");

        var act = async () => await _service.AssignStudentSubjectAsync(_schoolId, new AssignStudentSubjectRequest
        {
            StudentId = student.Id,
            ClassId = Guid.NewGuid(),
            SubjectId = subject.Id,
            AcademicYear = "2025-2026",
            IsMandatory = true
        });

        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("*Class does not exist*");
    }

    [Fact]
    public async Task AssignStudentSubjectAsync_Throws_WhenSubjectNotFound()
    {
        var student = await SeedStudentAsync(_schoolId);
        var classEntity = await SeedClassAsync(_schoolId, "10");

        var act = async () => await _service.AssignStudentSubjectAsync(_schoolId, new AssignStudentSubjectRequest
        {
            StudentId = student.Id,
            ClassId = classEntity.Id,
            SubjectId = Guid.NewGuid(),
            AcademicYear = "2025-2026",
            IsMandatory = true
        });

        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("*Subject does not exist*");
    }

    [Fact]
    public async Task AssignStudentSubjectAsync_Throws_WhenDuplicateEnrollment()
    {
        var student = await SeedStudentAsync(_schoolId);
        var classEntity = await SeedClassAsync(_schoolId, "10");
        var subject = await SeedSubjectAsync(_schoolId, "Mathematics", "MATH");

        await _service.AssignStudentSubjectAsync(_schoolId, new AssignStudentSubjectRequest
        {
            StudentId = student.Id,
            ClassId = classEntity.Id,
            SubjectId = subject.Id,
            AcademicYear = "2025-2026",
            IsMandatory = true
        });

        var act = async () => await _service.AssignStudentSubjectAsync(_schoolId, new AssignStudentSubjectRequest
        {
            StudentId = student.Id,
            ClassId = classEntity.Id,
            SubjectId = subject.Id,
            AcademicYear = "2025-2026",
            IsMandatory = true
        });

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*already enrolled*");
    }

    [Fact]
    public async Task BulkAssignStudentSubjectsAsync_Success()
    {
        var student = await SeedStudentAsync(_schoolId);
        var classEntity = await SeedClassAsync(_schoolId, "10");
        var subject1 = await SeedSubjectAsync(_schoolId, "Mathematics", "MATH");
        var subject2 = await SeedSubjectAsync(_schoolId, "Science", "SCI");

        await _service.BulkAssignStudentSubjectsAsync(_schoolId, new BulkAssignStudentSubjectsRequest
        {
            StudentId = student.Id,
            ClassId = classEntity.Id,
            SubjectIds = new[] { subject1.Id, subject2.Id }.ToList(),
            AcademicYear = "2025-2026"
        });

        var result = await _service.GetStudentSubjectsAsync(_schoolId, student.Id, "2025-2026");
        result.Should().HaveCount(2);
    }

    [Fact]
    public async Task BulkAssignStudentSubjectsAsync_Throws_WhenNoSubjects()
    {
        var student = await SeedStudentAsync(_schoolId);
        var classEntity = await SeedClassAsync(_schoolId, "10");

        var act = async () => await _service.BulkAssignStudentSubjectsAsync(_schoolId, new BulkAssignStudentSubjectsRequest
        {
            StudentId = student.Id,
            ClassId = classEntity.Id,
            SubjectIds = new List<Guid>(),
            AcademicYear = "2025-2026"
        });

        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*At least one subject must be specified*");
    }

    [Fact]
    public async Task BulkAssignStudentSubjectsAsync_Throws_WhenTooManySubjects()
    {
        var student = await SeedStudentAsync(_schoolId);
        var classEntity = await SeedClassAsync(_schoolId, "10");
        var subjectIds = Enumerable.Range(0, 51).Select(_ => Guid.NewGuid()).ToList();

        var act = async () => await _service.BulkAssignStudentSubjectsAsync(_schoolId, new BulkAssignStudentSubjectsRequest
        {
            StudentId = student.Id,
            ClassId = classEntity.Id,
            SubjectIds = subjectIds,
            AcademicYear = "2025-2026"
        });

        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*Cannot assign more than 50 subjects*");
    }

    #endregion

    #region Class Settings Tests

    [Fact]
    public async Task CreateClassSettingsAsync_Success()
    {
        var classEntity = await SeedClassAsync(_schoolId, "10");

        var result = await _service.CreateClassSettingsAsync(new CreateClassSettingsRequest
        {
            SchoolId = _schoolId,
            ClassId = classEntity.Id,
            PassingPercentage = 40,
            MinimumAttendance = 75,
            GradingScale = "4.0",
            PromotionPolicy = "strict"
        });

        result.Should().NotBeNull();
        result.PassingPercentage.Should().Be(40);
    }

    [Fact]
    public async Task CreateClassSettingsAsync_Throws_WhenPassingPercentageInvalid()
    {
        var classEntity = await SeedClassAsync(_schoolId, "10");

        var act = async () => await _service.CreateClassSettingsAsync(new CreateClassSettingsRequest
        {
            SchoolId = _schoolId,
            ClassId = classEntity.Id,
            PassingPercentage = 101,
            MinimumAttendance = 75
        });

        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*Passing percentage must be between 0 and 100*");
    }

    [Fact]
    public async Task CreateClassSettingsAsync_Throws_WhenAttendanceInvalid()
    {
        var classEntity = await SeedClassAsync(_schoolId, "10");

        var act = async () => await _service.CreateClassSettingsAsync(new CreateClassSettingsRequest
        {
            SchoolId = _schoolId,
            ClassId = classEntity.Id,
            PassingPercentage = 40,
            MinimumAttendance = -10
        });

        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*Minimum attendance must be between 0 and 100*");
    }

    [Fact]
    public async Task CreateClassSettingsAsync_Throws_WhenGradingScaleInvalid()
    {
        var classEntity = await SeedClassAsync(_schoolId, "10");

        var act = async () => await _service.CreateClassSettingsAsync(new CreateClassSettingsRequest
        {
            SchoolId = _schoolId,
            ClassId = classEntity.Id,
            PassingPercentage = 40,
            MinimumAttendance = 75,
            GradingScale = "invalid"
        });

        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*Grading scale must be one of*");
    }

    [Fact]
    public async Task CreateClassSettingsAsync_Throws_WhenPromotionPolicyInvalid()
    {
        var classEntity = await SeedClassAsync(_schoolId, "10");

        var act = async () => await _service.CreateClassSettingsAsync(new CreateClassSettingsRequest
        {
            SchoolId = _schoolId,
            ClassId = classEntity.Id,
            PassingPercentage = 40,
            MinimumAttendance = 75,
            PromotionPolicy = "invalid"
        });

        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*Promotion policy must be one of*");
    }

    [Fact]
    public async Task UpdateClassSettingsAsync_Success()
    {
        var classEntity = await SeedClassAsync(_schoolId, "10");
        var settings = await _service.CreateClassSettingsAsync(new CreateClassSettingsRequest
        {
            SchoolId = _schoolId,
            ClassId = classEntity.Id,
            PassingPercentage = 40,
            MinimumAttendance = 75
        });

        var result = await _service.UpdateClassSettingsAsync(settings.Id, new UpdateClassSettingsRequest
        {
            PassingPercentage = 50
        }, _schoolId);

        result.Should().NotBeNull();
        result.PassingPercentage.Should().Be(50);
    }

    #endregion

    #region Helper Seeding Methods

    private async Task<Class> SeedClassAsync(Guid schoolId, string name)
    {
        var classEntity = new Class
        {
            Id = Guid.NewGuid(),
            SchoolId = schoolId,
            Name = name,
            Status = "active",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Classes.Add(classEntity);
        await _context.SaveChangesAsync();
        return classEntity;
    }

    private async Task<Section> SeedSectionAsync(Guid schoolId, Guid classId, string name)
    {
        var section = new Section
        {
            Id = Guid.NewGuid(),
            SchoolId = schoolId,
            ClassId = classId,
            Name = name,
            Status = "active",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Sections.Add(section);
        await _context.SaveChangesAsync();
        return section;
    }

    private async Task<Subject> SeedSubjectAsync(Guid schoolId, string name, string code)
    {
        var subject = new Subject
        {
            Id = Guid.NewGuid(),
            SchoolId = schoolId,
            Name = name,
            Code = code,
            Status = "active",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Subjects.Add(subject);
        await _context.SaveChangesAsync();
        return subject;
    }

    private async Task<AcademicYear> SeedAcademicYearAsync(Guid schoolId, string name, DateTime start, DateTime end)
    {
        var year = new AcademicYear
        {
            Id = Guid.NewGuid(),
            SchoolId = schoolId,
            Name = name,
            StartDate = start,
            EndDate = end,
            Status = "active",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.AcademicYears.Add(year);
        await _context.SaveChangesAsync();
        return year;
    }

    private async Task<StaffEntity> SeedStaffAsync(Guid schoolId)
    {
        var staff = new StaffEntity
        {
            Id = Guid.NewGuid(),
            SchoolId = schoolId,
            FirstName = "Test",
            LastName = "Staff",
            Email = $"test{Guid.NewGuid()}@school.com",
            Status = "active",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.StaffMembers.Add(staff);
        await _context.SaveChangesAsync();
        return staff;
    }

    private async Task<Student> SeedStudentAsync(Guid schoolId)
    {
        var student = new Student
        {
            Id = Guid.NewGuid(),
            SchoolId = schoolId,
            FirstName = "Test",
            LastName = "Student",
            RollNumber = $"ROLL{Guid.NewGuid()}",
            Status = "active",
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Students.Add(student);
        await _context.SaveChangesAsync();
        return student;
    }

    private async Task<GradeTier> SeedGradeTierAsync(Guid schoolId, Guid classId, string grade, int minMarks, int maxMarks, decimal gpa)
    {
        var tier = new GradeTier
        {
            Id = Guid.NewGuid(),
            SchoolId = schoolId,
            ClassId = classId,
            Grade = grade,
            MinMarks = minMarks,
            MaxMarks = maxMarks,
            GPA = gpa,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.GradeTiers.Add(tier);
        await _context.SaveChangesAsync();
        return tier;
    }

    #endregion
}
