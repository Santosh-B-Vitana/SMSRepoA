using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;
using SmsApi.Services;
using Xunit;

namespace SmsApi.Tests.Unit.Board
{
    // Simple test logger implementation
    public class TestLogger<T> : ILogger<T>
    {
        public IDisposable BeginScope<TState>(TState state) => null!;
        public bool IsEnabled(LogLevel logLevel) => true;
        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter) { }
    }

    public class BoardConfigurationServiceTests : IDisposable
    {
        private readonly AppDbContext _context;
        private readonly BoardConfigurationService _service;
        private readonly Guid _testSchoolId = Guid.NewGuid();

        public BoardConfigurationServiceTests()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _context = new AppDbContext(options);
            var logger = new TestLogger<BoardConfigurationService>();
            _service = new BoardConfigurationService(_context, logger);

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
            await _context.SaveChangesAsync();
        }

        // ─── CreateBoard Tests (8+ validations) ───────────────────────────────

        [Fact]
        public async Task CreateBoard_WithValidData_ShouldSucceed()
        {
            // Arrange
            var request = new CreateBoardConfigurationRequest
            {
                Name = "CBSE Board",
                Code = "CBSE",
                Description = "Central Board of Secondary Education",
                BoardLevel = "National",
                StateCode = null,
                TheoryPassingPercentage = 33,
                PracticalPassingPercentage = 33,
                OverallPassingPercentage = 33,
                GradingSystem = "A1-E2",
                MaxGradePoint = 10,
                GradingScale = new List<GradeScaleEntryDto>
                {
                    new() { Grade = "A1", MinPercentage = 91, MaxPercentage = 100, GradePoint = 10, IsPassing = true }
                },
                ExamStructure = new List<BoardExamStructureEntryDto>
                {
                    new() { Code = "PT1", Name = "Periodic Test 1", WeightagePercent = 10, Term = 1 }
                },
                IsCustomizable = false
            };

            // Act
            var result = await _service.CreateBoardAsync(request);

            // Assert
            result.Should().NotBeNull();
            result.Name.Should().Be("CBSE Board");
            result.Code.Should().Be("CBSE");
            result.IsActive.Should().BeTrue();
            result.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
        }

        [Fact]
        public async Task CreateBoard_WithEmptyName_ShouldThrow()
        {
            // Arrange
            var request = new CreateBoardConfigurationRequest
            {
                Name = string.Empty,
                Code = "TEST",
                BoardLevel = "National",
                GradingScale = new List<GradeScaleEntryDto>(),
                ExamStructure = new List<BoardExamStructureEntryDto>()
            };

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateBoardAsync(request));
        }

        [Fact]
        public async Task CreateBoard_WithNameExceeding150Chars_ShouldThrow()
        {
            // Arrange
            var request = new CreateBoardConfigurationRequest
            {
                Name = new string('A', 151),
                Code = "TEST",
                BoardLevel = "National",
                GradingScale = new List<GradeScaleEntryDto>(),
                ExamStructure = new List<BoardExamStructureEntryDto>()
            };

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateBoardAsync(request));
        }

        [Fact]
        public async Task CreateBoard_WithEmptyCode_ShouldThrow()
        {
            // Arrange
            var request = new CreateBoardConfigurationRequest
            {
                Name = "Test Board",
                Code = string.Empty,
                BoardLevel = "National",
                GradingScale = new List<GradeScaleEntryDto>(),
                ExamStructure = new List<BoardExamStructureEntryDto>()
            };

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateBoardAsync(request));
        }

        [Fact]
        public async Task CreateBoard_WithCodeExceeding30Chars_ShouldThrow()
        {
            // Arrange
            var request = new CreateBoardConfigurationRequest
            {
                Name = "Test Board",
                Code = new string('A', 31),
                BoardLevel = "National",
                GradingScale = new List<GradeScaleEntryDto>(),
                ExamStructure = new List<BoardExamStructureEntryDto>()
            };

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateBoardAsync(request));
        }

        [Fact]
        public async Task CreateBoard_WithInvalidBoardLevel_ShouldThrow()
        {
            // Arrange
            var request = new CreateBoardConfigurationRequest
            {
                Name = "Test Board",
                Code = "TEST",
                BoardLevel = "InvalidLevel",
                GradingScale = new List<GradeScaleEntryDto>(),
                ExamStructure = new List<BoardExamStructureEntryDto>()
            };

            // Act & Assert - Invalid board level should throw
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateBoardAsync(request));
        }

        [Fact]
        public async Task CreateBoard_WithStateCodeButNationalLevel_ShouldSucceed()
        {
            // Arrange
            var request = new CreateBoardConfigurationRequest
            {
                Name = "Test Board",
                Code = "TEST",
                BoardLevel = "National",
                StateCode = "KA",
                GradingScale = new List<GradeScaleEntryDto>(),
                ExamStructure = new List<BoardExamStructureEntryDto>()
            };

            // Act
            var result = await _service.CreateBoardAsync(request);

            // Assert
            result.StateCode.Should().Be("KA");
        }

        [Fact]
        public async Task CreateBoard_WithNegativePassingPercentage_ShouldThrow()
        {
            // Arrange
            var request = new CreateBoardConfigurationRequest
            {
                Name = "Test Board",
                Code = "TEST",
                BoardLevel = "National",
                TheoryPassingPercentage = -5,
                GradingScale = new List<GradeScaleEntryDto>(),
                ExamStructure = new List<BoardExamStructureEntryDto>()
            };

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateBoardAsync(request));
        }

        [Fact]
        public async Task CreateBoard_WithPassingPercentageExceeding100_ShouldThrow()
        {
            // Arrange
            var request = new CreateBoardConfigurationRequest
            {
                Name = "Test Board",
                Code = "TEST",
                BoardLevel = "National",
                OverallPassingPercentage = 105,
                GradingScale = new List<GradeScaleEntryDto>(),
                ExamStructure = new List<BoardExamStructureEntryDto>()
            };

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateBoardAsync(request));
        }

        [Fact]
        public async Task CreateBoard_WithMaxGradePointZero_ShouldThrow()
        {
            // Arrange
            var request = new CreateBoardConfigurationRequest
            {
                Name = "Test Board",
                Code = "TEST",
                BoardLevel = "National",
                MaxGradePoint = 0,
                GradingScale = new List<GradeScaleEntryDto>(),
                ExamStructure = new List<BoardExamStructureEntryDto>()
            };

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateBoardAsync(request));
        }

        [Fact]
        public async Task CreateBoard_CodeShouldBeUppercased()
        {
            // Arrange
            var request = new CreateBoardConfigurationRequest
            {
                Name = "Test Board",
                Code = "cbse",
                BoardLevel = "National",
                GradingScale = new List<GradeScaleEntryDto>(),
                ExamStructure = new List<BoardExamStructureEntryDto>()
            };

            // Act
            var result = await _service.CreateBoardAsync(request);

            // Assert
            result.Code.Should().Be("CBSE");
        }

        // ─── GetBoardById Tests ───────────────────────────────

        [Fact]
        public async Task GetBoardById_WithValidId_ShouldReturnBoard()
        {
            // Arrange
            var request = new CreateBoardConfigurationRequest
            {
                Name = "Test Board",
                Code = "TEST",
                BoardLevel = "National",
                GradingScale = new List<GradeScaleEntryDto>(),
                ExamStructure = new List<BoardExamStructureEntryDto>()
            };
            var created = await _service.CreateBoardAsync(request);

            // Act
            var result = await _service.GetBoardByIdAsync(created.Id);

            // Assert
            result.Should().NotBeNull();
            result?.Id.Should().Be(created.Id);
            result?.Name.Should().Be("Test Board");
        }

        [Fact]
        public async Task GetBoardById_WithInvalidId_ShouldReturnNull()
        {
            // Act
            var result = await _service.GetBoardByIdAsync(Guid.NewGuid());

            // Assert
            result.Should().BeNull();
        }

        // ─── GetBoardByCode Tests ───────────────────────────

        [Fact]
        public async Task GetBoardByCode_WithValidCode_ShouldReturnBoard()
        {
            // Arrange
            var request = new CreateBoardConfigurationRequest
            {
                Name = "Test Board",
                Code = "UNIQUECODE",
                BoardLevel = "National",
                GradingScale = new List<GradeScaleEntryDto>(),
                ExamStructure = new List<BoardExamStructureEntryDto>()
            };
            await _service.CreateBoardAsync(request);

            // Act
            var result = await _service.GetBoardByCodeAsync("uniquecode");

            // Assert
            result.Should().NotBeNull();
            result?.Code.Should().Be("UNIQUECODE");
        }

        [Fact]
        public async Task GetBoardByCode_WithInvalidCode_ShouldReturnNull()
        {
            // Act
            var result = await _service.GetBoardByCodeAsync("NONEXISTENT");

            // Assert
            result.Should().BeNull();
        }

        // ─── SetSchoolBoardConfig Tests (8+ validations) ───────

        [Fact]
        public async Task SetSchoolBoardConfig_WithValidData_ShouldSucceed()
        {
            // Arrange
            var boardRequest = new CreateBoardConfigurationRequest
            {
                Name = "ICSE Board",
                Code = "ICSE",
                BoardLevel = "National",
                GradingScale = new List<GradeScaleEntryDto>(),
                ExamStructure = new List<BoardExamStructureEntryDto>()
            };
            var board = await _service.CreateBoardAsync(boardRequest);

            var configRequest = new SetSchoolBoardConfigRequest
            {
                BoardConfigurationId = board.Id,
                AcademicYear = "2025-26"
            };

            // Act
            var result = await _service.SetSchoolBoardConfigAsync(_testSchoolId, configRequest);

            // Assert
            result.Should().NotBeNull();
            result.SchoolId.Should().Be(_testSchoolId);
            result.BoardConfigurationId.Should().Be(board.Id);
            result.AcademicYear.Should().Be("2025-26");
        }

        [Fact]
        public async Task SetSchoolBoardConfig_WithInvalidBoardId_ShouldThrow()
        {
            // Arrange
            var configRequest = new SetSchoolBoardConfigRequest
            {
                BoardConfigurationId = Guid.NewGuid(),
                AcademicYear = "2025-26"
            };

            // Act & Assert
            await Assert.ThrowsAsync<InvalidOperationException>(() => 
                _service.SetSchoolBoardConfigAsync(_testSchoolId, configRequest));
        }

        [Fact]
        public async Task SetSchoolBoardConfig_WithCustomPassingPercentageExceeding100_ShouldThrow()
        {
            // Arrange
            var boardRequest = new CreateBoardConfigurationRequest
            {
                Name = "Test Board",
                Code = "TEST",
                BoardLevel = "National",
                GradingScale = new List<GradeScaleEntryDto>(),
                ExamStructure = new List<BoardExamStructureEntryDto>()
            };
            var board = await _service.CreateBoardAsync(boardRequest);

            var configRequest = new SetSchoolBoardConfigRequest
            {
                BoardConfigurationId = board.Id,
                AcademicYear = "2025-26",
                CustomOverallPassingPercentage = 150
            };

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => 
                _service.SetSchoolBoardConfigAsync(_testSchoolId, configRequest));
        }

        [Fact]
        public async Task SetSchoolBoardConfig_WithNegativeCustomPercentage_ShouldThrow()
        {
            // Arrange
            var boardRequest = new CreateBoardConfigurationRequest
            {
                Name = "Test Board",
                Code = "TEST",
                BoardLevel = "National",
                GradingScale = new List<GradeScaleEntryDto>(),
                ExamStructure = new List<BoardExamStructureEntryDto>()
            };
            var board = await _service.CreateBoardAsync(boardRequest);

            var configRequest = new SetSchoolBoardConfigRequest
            {
                BoardConfigurationId = board.Id,
                CustomTheoryPassingPercentage = -10
            };

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => 
                _service.SetSchoolBoardConfigAsync(_testSchoolId, configRequest));
        }

        [Fact]
        public async Task SetSchoolBoardConfig_WithInvalidAcademicYearFormat_ShouldThrow()
        {
            // Arrange
            var boardRequest = new CreateBoardConfigurationRequest
            {
                Name = "Test Board",
                Code = "TEST",
                BoardLevel = "National",
                GradingScale = new List<GradeScaleEntryDto>(),
                ExamStructure = new List<BoardExamStructureEntryDto>()
            };
            var board = await _service.CreateBoardAsync(boardRequest);

            var configRequest = new SetSchoolBoardConfigRequest
            {
                BoardConfigurationId = board.Id,
                AcademicYear = "InvalidYear"
            };

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => 
                _service.SetSchoolBoardConfigAsync(_testSchoolId, configRequest));
        }

        [Fact]
        public async Task SetSchoolBoardConfig_DeactivatesPreviousConfigForSameYear()
        {
            // Arrange
            var board1 = await _service.CreateBoardAsync(new CreateBoardConfigurationRequest
            {
                Name = "Board 1", Code = "B1", BoardLevel = "National",
                GradingScale = new List<GradeScaleEntryDto>(),
                ExamStructure = new List<BoardExamStructureEntryDto>()
            });

            var board2 = await _service.CreateBoardAsync(new CreateBoardConfigurationRequest
            {
                Name = "Board 2", Code = "B2", BoardLevel = "National",
                GradingScale = new List<GradeScaleEntryDto>(),
                ExamStructure = new List<BoardExamStructureEntryDto>()
            });

            // Set first config
            await _service.SetSchoolBoardConfigAsync(_testSchoolId, new SetSchoolBoardConfigRequest
            {
                BoardConfigurationId = board1.Id,
                AcademicYear = "2025-26"
            });

            // Act - Set second config for same year
            await _service.SetSchoolBoardConfigAsync(_testSchoolId, new SetSchoolBoardConfigRequest
            {
                BoardConfigurationId = board2.Id,
                AcademicYear = "2025-26"
            });

            // Assert - Previous config should be inactive
            var configs = _context.SchoolBoardConfigs
                .Where(c => c.SchoolId == _testSchoolId && c.AcademicYear == "2025-26")
                .ToList();
            configs.Count(c => c.IsActive).Should().Be(1);
        }

        // ─── CalculateGrade Tests ───────────────────────────

        [Fact]
        public async Task CalculateGrade_WithValidPercentage_ShouldReturnGrade()
        {
            // Arrange
            var board = await _service.CreateBoardAsync(new CreateBoardConfigurationRequest
            {
                Name = "Test Board",
                Code = "GRADE",
                BoardLevel = "National",
                GradingScale = new List<GradeScaleEntryDto>
                {
                    new() { Grade = "A1", MinPercentage = 91, MaxPercentage = 100, GradePoint = 10, IsPassing = true },
                    new() { Grade = "D", MinPercentage = 33, MaxPercentage = 40, GradePoint = 4, IsPassing = true }
                },
                ExamStructure = new List<BoardExamStructureEntryDto>()
            });

            await _service.SetSchoolBoardConfigAsync(_testSchoolId, new SetSchoolBoardConfigRequest
            {
                BoardConfigurationId = board.Id
            });

            // Act
            var result = await _service.CalculateGradeAsync(_testSchoolId, 95);

            // Assert
            result.Should().NotBeNull();
            result.Grade.Should().Be("A1");
            result.IsPassing.Should().BeTrue();
        }

        [Fact]
        public async Task CalculateGrade_WithZeroPercentage_ShouldReturnLowestGrade()
        {
            // Arrange
            var board = await _service.CreateBoardAsync(new CreateBoardConfigurationRequest
            {
                Name = "Test Board",
                Code = "GRADE2",
                BoardLevel = "National",
                GradingScale = new List<GradeScaleEntryDto>
                {
                    new() { Grade = "E2", MinPercentage = 0, MaxPercentage = 20, GradePoint = 2, IsPassing = false }
                },
                ExamStructure = new List<BoardExamStructureEntryDto>()
            });

            await _service.SetSchoolBoardConfigAsync(_testSchoolId, new SetSchoolBoardConfigRequest
            {
                BoardConfigurationId = board.Id
            });

            // Act
            var result = await _service.CalculateGradeAsync(_testSchoolId, 0);

            // Assert
            result.Grade.Should().Be("E2");
            result.IsPassing.Should().BeFalse();
        }

        // ─── Pagination & Edge Cases ───────────────────────

        [Fact]
        public async Task GetAllBoards_ShouldReturnOnlyActiveBoardsWithoutSchoolId()
        {
            // Arrange
            var board1 = await _service.CreateBoardAsync(new CreateBoardConfigurationRequest
            {
                Name = "Active Board", Code = "ACTIVE", BoardLevel = "National",
                GradingScale = new List<GradeScaleEntryDto>(),
                ExamStructure = new List<BoardExamStructureEntryDto>()
            });

            // Act
            var result = await _service.GetAllBoardsAsync();

            // Assert
            result.Boards.Should().Contain(b => b.Code == "ACTIVE");
            result.Boards.Should().AllSatisfy(b => b.SchoolId.Should().BeNull());
        }

        [Fact]
        public async Task IsPassingAsync_WithThresholdValues_ShouldReturnCorrect()
        {
            // Arrange
            var board = await _service.CreateBoardAsync(new CreateBoardConfigurationRequest
            {
                Name = "Test", Code = "PASS", BoardLevel = "National",
                TheoryPassingPercentage = 33,
                PracticalPassingPercentage = 33,
                OverallPassingPercentage = 40,
                GradingScale = new List<GradeScaleEntryDto>(),
                ExamStructure = new List<BoardExamStructureEntryDto>()
            });

            await _service.SetSchoolBoardConfigAsync(_testSchoolId, new SetSchoolBoardConfigRequest
            {
                BoardConfigurationId = board.Id
            });

            // Act & Assert
            var result1 = await _service.IsPassingAsync(_testSchoolId, 33, 33, 40);
            result1.Should().BeTrue();

            var result2 = await _service.IsPassingAsync(_testSchoolId, 32, 33, 40);
            result2.Should().BeFalse();

            var result3 = await _service.IsPassingAsync(_testSchoolId, 33, 33, 39);
            result3.Should().BeFalse();
        }
    }
}
