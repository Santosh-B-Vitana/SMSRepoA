using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;

namespace SmsApi.Services
{
    public interface IBoardConfigurationService
    {
        // ── Board catalogue ───────────────────────────────────────────────────
        Task<BoardConfigurationListResponse> GetAllBoardsAsync();
        Task<BoardConfigurationResponse?> GetBoardByIdAsync(Guid id);
        Task<BoardConfigurationResponse?> GetBoardByCodeAsync(string code);
        Task<BoardConfigurationResponse> CreateBoardAsync(CreateBoardConfigurationRequest request);

        // ── School board config ───────────────────────────────────────────────
        Task<SchoolBoardConfigResponse?> GetSchoolBoardConfigAsync(Guid schoolId, string? academicYear = null);
        Task<SchoolBoardConfigResponse> SetSchoolBoardConfigAsync(Guid schoolId, SetSchoolBoardConfigRequest request);

        // ── Multi-board school config ─────────────────────────────────────────
        Task<SchoolBoardListResponse> GetSchoolBoardsAsync(Guid schoolId);
        Task<SchoolBoardConfigResponse> AddSchoolBoardAsync(Guid schoolId, AddSchoolBoardRequest request);
        Task RemoveSchoolBoardAsync(Guid schoolId, Guid configId);
        Task<SchoolBoardConfigResponse> SetDefaultBoardAsync(Guid schoolId, Guid configId);

        // ── Grading (board-aware) ─────────────────────────────────────────────
        Task<BoardAwareGradeResult> CalculateGradeAsync(Guid schoolId, decimal percentage, string? academicYear = null);
        Task<BoardAwareGradeResult> CalculateGradeAsync(Guid schoolId, decimal percentage, Guid? boardConfigurationId, string? academicYear = null);
        Task<bool> IsPassingAsync(Guid schoolId, decimal theoryPct, decimal practicalPct, decimal overallPct, string? academicYear = null);
        Task<List<GradeScaleEntryDto>> GetEffectiveGradingScaleAsync(Guid schoolId, string? academicYear = null);
        Task<List<BoardExamStructureEntryDto>> GetEffectiveExamStructureAsync(Guid schoolId, string? academicYear = null);
    }

    public class BoardConfigurationService : IBoardConfigurationService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<BoardConfigurationService> _logger;

        private static readonly JsonSerializerOptions _jsonOpts = new()
        {
            PropertyNameCaseInsensitive = true
        };

        // Fallback CBSE grading when no board config is set
        private static readonly List<GradeScaleEntryDto> _defaultGradingScale = new()
        {
            new() { Grade = "A1", MinPercentage = 91, MaxPercentage = 100, GradePoint = 10, Description = "Outstanding",        IsPassing = true  },
            new() { Grade = "A2", MinPercentage = 81, MaxPercentage = 90,  GradePoint = 9,  Description = "Excellent",          IsPassing = true  },
            new() { Grade = "B1", MinPercentage = 71, MaxPercentage = 80,  GradePoint = 8,  Description = "Very Good",          IsPassing = true  },
            new() { Grade = "B2", MinPercentage = 61, MaxPercentage = 70,  GradePoint = 7,  Description = "Good",               IsPassing = true  },
            new() { Grade = "C1", MinPercentage = 51, MaxPercentage = 60,  GradePoint = 6,  Description = "Above Average",      IsPassing = true  },
            new() { Grade = "C2", MinPercentage = 41, MaxPercentage = 50,  GradePoint = 5,  Description = "Average",            IsPassing = true  },
            new() { Grade = "D",  MinPercentage = 33, MaxPercentage = 40,  GradePoint = 4,  Description = "Below Average",      IsPassing = true  },
            new() { Grade = "E1", MinPercentage = 21, MaxPercentage = 32,  GradePoint = 3,  Description = "Needs Improvement",  IsPassing = false },
            new() { Grade = "E2", MinPercentage = 0,  MaxPercentage = 20,  GradePoint = 2,  Description = "Unsatisfactory",     IsPassing = false }
        };

        public BoardConfigurationService(AppDbContext context, ILogger<BoardConfigurationService> logger)
        {
            _context = context;
            _logger = logger;
        }

        // ── Board catalogue ───────────────────────────────────────────────────

        public async Task<BoardConfigurationListResponse> GetAllBoardsAsync()
        {
            var boards = await _context.BoardConfigurations
                .Where(b => b.IsActive && b.SchoolId == null)
                .OrderBy(b => b.BoardLevel)
                .ThenBy(b => b.Name)
                .ToListAsync();

            return new BoardConfigurationListResponse
            {
                Boards = boards.Select(MapToResponse).ToList(),
                Total = boards.Count
            };
        }

        public async Task<BoardConfigurationResponse?> GetBoardByIdAsync(Guid id)
        {
            var b = await _context.BoardConfigurations.FirstOrDefaultAsync(x => x.Id == id && x.IsActive);
            return b == null ? null : MapToResponse(b);
        }

        public async Task<BoardConfigurationResponse?> GetBoardByCodeAsync(string code)
        {
            var b = await _context.BoardConfigurations
                .FirstOrDefaultAsync(x => x.Code == code.ToUpper() && x.IsActive && x.SchoolId == null);
            return b == null ? null : MapToResponse(b);
        }

        public async Task<BoardConfigurationResponse> CreateBoardAsync(CreateBoardConfigurationRequest request)
        {
            // VALIDATION 1: Name required and length
            if (string.IsNullOrWhiteSpace(request.Name))
                throw new ArgumentException("Board name is required");
            if (request.Name.Length > 150)
                throw new ArgumentException("Board name cannot exceed 150 characters");

            // VALIDATION 2: Code required and length
            if (string.IsNullOrWhiteSpace(request.Code))
                throw new ArgumentException("Board code is required");
            if (request.Code.Length > 30)
                throw new ArgumentException("Board code cannot exceed 30 characters");

            // VALIDATION 3: Description length
            if (!string.IsNullOrEmpty(request.Description) && request.Description.Length > 300)
                throw new ArgumentException("Description cannot exceed 300 characters");

            // VALIDATION 4: BoardLevel must be valid (National, State, International)
            var validBoardLevels = new[] { "National", "State", "International" };
            if (!string.IsNullOrEmpty(request.BoardLevel) && !validBoardLevels.Contains(request.BoardLevel))
                throw new ArgumentException("Invalid BoardLevel. Must be National, State, or International");

            // VALIDATION 5: If State level, StateCode must be provided
            if (request.BoardLevel == "State" && string.IsNullOrEmpty(request.StateCode))
                throw new ArgumentException("StateCode is required for State level boards");

            // VALIDATION 6: StateCode format (must be 2-5 chars if provided)
            if (!string.IsNullOrEmpty(request.StateCode) && (request.StateCode.Length < 2 || request.StateCode.Length > 5))
                throw new ArgumentException("StateCode must be 2-5 characters");

            // VALIDATION 7: Passing percentages must be 0-100
            if (request.TheoryPassingPercentage < 0 || request.TheoryPassingPercentage > 100)
                throw new ArgumentException("TheoryPassingPercentage must be between 0 and 100");
            if (request.PracticalPassingPercentage < 0 || request.PracticalPassingPercentage > 100)
                throw new ArgumentException("PracticalPassingPercentage must be between 0 and 100");
            if (request.OverallPassingPercentage < 0 || request.OverallPassingPercentage > 100)
                throw new ArgumentException("OverallPassingPercentage must be between 0 and 100");

            // VALIDATION 8: GradingSystem required
            if (string.IsNullOrWhiteSpace(request.GradingSystem))
                throw new ArgumentException("GradingSystem is required");
            if (request.GradingSystem.Length > 30)
                throw new ArgumentException("GradingSystem cannot exceed 30 characters");

            // VALIDATION 9: MaxGradePoint must be positive
            if (request.MaxGradePoint <= 0)
                throw new ArgumentException("MaxGradePoint must be greater than 0");

            // VALIDATION 10: GradingScale validation
            if (request.GradingScale != null && request.GradingScale.Count > 0)
            {
                foreach (var entry in request.GradingScale)
                {
                    if (string.IsNullOrWhiteSpace(entry.Grade))
                        throw new ArgumentException("Grade name cannot be empty in grading scale");
                    if (entry.MinPercentage < 0 || entry.MinPercentage > 100)
                        throw new ArgumentException("Grade MinPercentage must be between 0 and 100");
                    if (entry.MaxPercentage < 0 || entry.MaxPercentage > 100)
                        throw new ArgumentException("Grade MaxPercentage must be between 0 and 100");
                    if (entry.MinPercentage > entry.MaxPercentage)
                        throw new ArgumentException("Grade MinPercentage cannot exceed MaxPercentage");
                    if (entry.GradePoint <= 0)
                        throw new ArgumentException("Grade GradePoint must be positive");
                }
            }

            var board = new BoardConfiguration
            {
                Id = Guid.NewGuid(),
                Name = request.Name,
                Code = request.Code.ToUpper(),
                Description = request.Description,
                BoardLevel = request.BoardLevel ?? "National",
                StateCode = request.StateCode?.ToUpper(),
                TheoryPassingPercentage = request.TheoryPassingPercentage,
                PracticalPassingPercentage = request.PracticalPassingPercentage,
                OverallPassingPercentage = request.OverallPassingPercentage,
                GradingSystem = request.GradingSystem,
                MaxGradePoint = request.MaxGradePoint,
                GradingScaleJson = JsonSerializer.Serialize(request.GradingScale),
                ExamStructureJson = JsonSerializer.Serialize(request.ExamStructure),
                IsSystemBoard = false,
                IsCustomizable = request.IsCustomizable,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.BoardConfigurations.Add(board);
            await _context.SaveChangesAsync();
            return MapToResponse(board);
        }

        // ── School board config ───────────────────────────────────────────────

        public async Task<SchoolBoardConfigResponse?> GetSchoolBoardConfigAsync(Guid schoolId, string? academicYear = null)
        {
            var query = _context.SchoolBoardConfigs
                .Include(s => s.BoardConfiguration)
                .Where(s => s.SchoolId == schoolId && s.IsActive);

            SchoolBoardConfig? config;
            if (!string.IsNullOrEmpty(academicYear))
            {
                config = await query.FirstOrDefaultAsync(s => s.AcademicYear == academicYear)
                      ?? await query.FirstOrDefaultAsync(s => s.AcademicYear == null);
            }
            else
            {
                config = await query.OrderByDescending(s => s.AcademicYear).FirstOrDefaultAsync();
            }

            return config == null ? null : MapToSchoolBoardConfigResponse(config);
        }

        public async Task<SchoolBoardConfigResponse> SetSchoolBoardConfigAsync(Guid schoolId, SetSchoolBoardConfigRequest request)
        {
            // VALIDATION 1: Board exists and is active
            var board = await _context.BoardConfigurations
                .FirstOrDefaultAsync(b => b.Id == request.BoardConfigurationId && b.IsActive)
                ?? throw new InvalidOperationException("Board configuration not found.");

            // VALIDATION 2: Academic year format validation (YYYY-YY format)
            if (!string.IsNullOrEmpty(request.AcademicYear))
            {
                var yearPattern = @"^\d{4}-\d{2}$";
                if (!System.Text.RegularExpressions.Regex.IsMatch(request.AcademicYear, yearPattern))
                    throw new ArgumentException("AcademicYear must be in format YYYY-YY (e.g., 2025-26)");
            }

            // VALIDATION 3: Custom passing percentages must be 0-100 if provided
            if (request.CustomTheoryPassingPercentage.HasValue && 
                (request.CustomTheoryPassingPercentage < 0 || request.CustomTheoryPassingPercentage > 100))
                throw new ArgumentException("CustomTheoryPassingPercentage must be between 0 and 100");

            if (request.CustomPracticalPassingPercentage.HasValue && 
                (request.CustomPracticalPassingPercentage < 0 || request.CustomPracticalPassingPercentage > 100))
                throw new ArgumentException("CustomPracticalPassingPercentage must be between 0 and 100");

            if (request.CustomOverallPassingPercentage.HasValue && 
                (request.CustomOverallPassingPercentage < 0 || request.CustomOverallPassingPercentage > 100))
                throw new ArgumentException("CustomOverallPassingPercentage must be between 0 and 100");

            // Deactivate previous config for same academic year
            var existing = await _context.SchoolBoardConfigs
                .Where(s => s.SchoolId == schoolId && s.AcademicYear == request.AcademicYear && s.IsActive)
                .ToListAsync();
            foreach (var e in existing)
            {
                e.IsActive = false;
                e.UpdatedAt = DateTime.UtcNow;
            }

            var config = new SchoolBoardConfig
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                BoardConfigurationId = request.BoardConfigurationId,
                AcademicYear = request.AcademicYear,
                CustomOverallPassingPercentage = request.CustomOverallPassingPercentage,
                CustomTheoryPassingPercentage = request.CustomTheoryPassingPercentage,
                CustomPracticalPassingPercentage = request.CustomPracticalPassingPercentage,
                CustomGradingScaleJson = request.CustomGradingScale != null
                    ? JsonSerializer.Serialize(request.CustomGradingScale) : null,
                CustomExamStructureJson = request.CustomExamStructure != null
                    ? JsonSerializer.Serialize(request.CustomExamStructure) : null,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.SchoolBoardConfigs.Add(config);
            await _context.SaveChangesAsync();

            // Reload with nav props
            config = await _context.SchoolBoardConfigs
                .Include(s => s.BoardConfiguration)
                .FirstAsync(s => s.Id == config.Id);

            return MapToSchoolBoardConfigResponse(config);
        }

        // ── Multi-board school config methods ─────────────────────────────────

        public async Task<SchoolBoardListResponse> GetSchoolBoardsAsync(Guid schoolId)
        {
            var configs = await _context.SchoolBoardConfigs
                .Include(s => s.BoardConfiguration)
                .Where(s => s.SchoolId == schoolId && s.IsActive)
                .OrderByDescending(s => s.IsDefault)
                .ThenBy(s => s.CreatedAt)
                .ToListAsync();

            var items = configs.Select(MapToSchoolBoardConfigResponse).ToList();
            return new SchoolBoardListResponse { Boards = items, Total = items.Count };
        }

        public async Task<SchoolBoardConfigResponse> AddSchoolBoardAsync(Guid schoolId, AddSchoolBoardRequest request)
        {
            var board = await _context.BoardConfigurations
                .FirstOrDefaultAsync(b => b.Id == request.BoardConfigurationId && b.IsActive);
            if (board == null)
                throw new InvalidOperationException("Board configuration not found or inactive.");

            var alreadyAdded = await _context.SchoolBoardConfigs
                .AnyAsync(s => s.SchoolId == schoolId && s.BoardConfigurationId == request.BoardConfigurationId && s.IsActive);
            if (alreadyAdded)
                throw new InvalidOperationException("This board is already configured for the school.");

            // Check if this will be the first board (auto-default)
            var hasExisting = await _context.SchoolBoardConfigs
                .AnyAsync(s => s.SchoolId == schoolId && s.IsActive);
            var willBeDefault = !hasExisting || request.SetAsDefault;

            if (willBeDefault)
            {
                // Unset existing defaults
                var existingDefaults = await _context.SchoolBoardConfigs
                    .Where(s => s.SchoolId == schoolId && s.IsActive && s.IsDefault)
                    .ToListAsync();
                foreach (var d in existingDefaults)
                    d.IsDefault = false;
            }

            var config = new SchoolBoardConfig
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                BoardConfigurationId = request.BoardConfigurationId,
                IsDefault = willBeDefault,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.SchoolBoardConfigs.Add(config);
            await _context.SaveChangesAsync();

            config = await _context.SchoolBoardConfigs
                .Include(s => s.BoardConfiguration)
                .FirstAsync(s => s.Id == config.Id);

            return MapToSchoolBoardConfigResponse(config);
        }

        public async Task RemoveSchoolBoardAsync(Guid schoolId, Guid configId)
        {
            var config = await _context.SchoolBoardConfigs
                .FirstOrDefaultAsync(s => s.Id == configId && s.SchoolId == schoolId && s.IsActive);
            if (config == null)
                throw new InvalidOperationException("School board configuration not found.");

            var activeCount = await _context.SchoolBoardConfigs
                .CountAsync(s => s.SchoolId == schoolId && s.IsActive);
            if (activeCount <= 1)
                throw new InvalidOperationException("Cannot remove the only configured board. Add another board first.");

            // Check if any classes use this board
            var hasClasses = await _context.Classes
                .AnyAsync(c => c.SchoolId == schoolId && c.BoardConfigurationId == config.BoardConfigurationId && !c.IsDeleted);
            if (hasClasses)
                throw new InvalidOperationException("Cannot remove this board because it has classes assigned to it.");

            config.IsActive = false;
            config.UpdatedAt = DateTime.UtcNow;

            // If this was the default, pick another one
            if (config.IsDefault)
            {
                var next = await _context.SchoolBoardConfigs
                    .Where(s => s.SchoolId == schoolId && s.IsActive && s.Id != configId)
                    .OrderBy(s => s.CreatedAt)
                    .FirstOrDefaultAsync();
                if (next != null)
                    next.IsDefault = true;
            }

            await _context.SaveChangesAsync();
        }

        public async Task<SchoolBoardConfigResponse> SetDefaultBoardAsync(Guid schoolId, Guid configId)
        {
            var config = await _context.SchoolBoardConfigs
                .Include(s => s.BoardConfiguration)
                .FirstOrDefaultAsync(s => s.Id == configId && s.SchoolId == schoolId && s.IsActive);
            if (config == null)
                throw new InvalidOperationException("School board configuration not found.");

            // Unset current defaults
            var currentDefaults = await _context.SchoolBoardConfigs
                .Where(s => s.SchoolId == schoolId && s.IsActive && s.IsDefault)
                .ToListAsync();
            foreach (var d in currentDefaults)
                d.IsDefault = false;

            config.IsDefault = true;
            config.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return MapToSchoolBoardConfigResponse(config);
        }

        // ── Grading (board-aware) ─────────────────────────────────────────────

        public async Task<BoardAwareGradeResult> CalculateGradeAsync(Guid schoolId, decimal percentage, string? academicYear = null)
        {
            var scale = await GetEffectiveGradingScaleAsync(schoolId, academicYear);
            var config = await GetSchoolBoardConfigAsync(schoolId, academicYear);

            var entry = scale.FirstOrDefault(g => percentage >= g.MinPercentage && percentage <= g.MaxPercentage)
                      ?? scale.LastOrDefault();  // fallback to lowest grade

            return new BoardAwareGradeResult
            {
                Grade = entry?.Grade ?? "F",
                GradePoint = entry?.GradePoint ?? 0,
                IsPassing = entry?.IsPassing ?? false,
                Description = entry?.Description,
                BoardCode = config?.BoardCode ?? "CBSE",
                GradingSystem = config?.Board.GradingSystem ?? "A1-E2"
            };
        }

        /// <summary>Overload: Calculate grade using a specific board configuration.</summary>
        /// <param name="schoolId">School ID</param>
        /// <param name="percentage">Student's percentage score</param>
        /// <param name="boardConfigurationId">Specific board config (e.g., from exam); if null, falls back to school default</param>
        /// <param name="academicYear">Optional academic year for multi-year configs</param>
        public async Task<BoardAwareGradeResult> CalculateGradeAsync(Guid schoolId, decimal percentage, Guid? boardConfigurationId, string? academicYear = null)
        {
            // VALIDATION 1: Percentage must be 0-100
            if (percentage < 0 || percentage > 100)
                throw new ArgumentException("Percentage must be between 0 and 100");

            BoardConfiguration? board = null;
            
            // If explicit board ID provided, use that
            if (boardConfigurationId.HasValue)
            {
                board = await _context.BoardConfigurations
                    .Where(b => b.Id == boardConfigurationId && b.IsActive)
                    .FirstOrDefaultAsync();
                
                // VALIDATION 2: If explicit board specified, it must exist
                if (board == null)
                    throw new InvalidOperationException("Specified board configuration not found");
            }
            
            // If no explicit board or not found, fall back to school default
            if (board == null)
            {
                var config = await GetSchoolBoardConfigAsync(schoolId, academicYear);
                if (config?.BoardConfigurationId != null)
                {
                    board = await _context.BoardConfigurations
                        .Where(b => b.Id == config.BoardConfigurationId && b.IsActive)
                        .FirstOrDefaultAsync();
                }
            }

            // If still no board, use default CBSE
            if (board == null)
            {
                return new BoardAwareGradeResult
                {
                    Grade = _defaultGradingScale.FirstOrDefault(g => percentage >= g.MinPercentage && percentage <= g.MaxPercentage)?.Grade ?? "E2",
                    GradePoint = _defaultGradingScale.FirstOrDefault(g => percentage >= g.MinPercentage && percentage <= g.MaxPercentage)?.GradePoint ?? 2,
                    IsPassing = percentage >= 33,
                    Description = "Default CBSE fallback",
                    BoardCode = "CBSE",
                    GradingSystem = "A1-E2"
                };
            }

            // VALIDATION 3: Parse the board's grading scale (must be valid JSON)
            var gradingScale = string.IsNullOrEmpty(board.GradingScaleJson)
                ? _defaultGradingScale
                : JsonSerializer.Deserialize<List<GradeScaleEntryDto>>(board.GradingScaleJson, _jsonOpts) ?? _defaultGradingScale;

            // VALIDATION 4: Grading scale must not be empty
            if (gradingScale == null || gradingScale.Count == 0)
                gradingScale = _defaultGradingScale;

            var entry = gradingScale.FirstOrDefault(g => percentage >= g.MinPercentage && percentage <= g.MaxPercentage)
                      ?? gradingScale.LastOrDefault();

            return new BoardAwareGradeResult
            {
                Grade = entry?.Grade ?? "F",
                GradePoint = entry?.GradePoint ?? 0,
                IsPassing = entry?.IsPassing ?? false,
                Description = entry?.Description,
                BoardCode = board.Code,
                GradingSystem = board.GradingSystem
            };
        }

        public async Task<bool> IsPassingAsync(Guid schoolId, decimal theoryPct, decimal practicalPct, decimal overallPct, string? academicYear = null)
        {
            var config = await GetSchoolBoardConfigAsync(schoolId, academicYear);
            var theoryMin = config?.EffectiveTheoryPassingPercentage ?? 33;
            var practicalMin = config?.EffectivePracticalPassingPercentage ?? 33;
            var overallMin = config?.EffectiveOverallPassingPercentage ?? 33;
            return theoryPct >= theoryMin && practicalPct >= practicalMin && overallPct >= overallMin;
        }

        public async Task<List<GradeScaleEntryDto>> GetEffectiveGradingScaleAsync(Guid schoolId, string? academicYear = null)
        {
            var config = await GetSchoolBoardConfigAsync(schoolId, academicYear);
            if (config == null) return _defaultGradingScale;

            if (config.HasCustomGradingScale && !string.IsNullOrEmpty(config.Board.GradingSystem))
            {
                // Already resolved inside MapToSchoolBoardConfigResponse
                return config.EffectiveGradingScale;
            }

            return config.EffectiveGradingScale.Count > 0
                ? config.EffectiveGradingScale
                : _defaultGradingScale;
        }

        public async Task<List<BoardExamStructureEntryDto>> GetEffectiveExamStructureAsync(Guid schoolId, string? academicYear = null)
        {
            var config = await GetSchoolBoardConfigAsync(schoolId, academicYear);
            return config?.EffectiveExamStructure ?? new List<BoardExamStructureEntryDto>();
        }

        // ── Mappers ───────────────────────────────────────────────────────────

        private static BoardConfigurationResponse MapToResponse(BoardConfiguration b)
        {
            return new BoardConfigurationResponse
            {
                Id = b.Id,
                SchoolId = b.SchoolId,
                Name = b.Name,
                Code = b.Code,
                Description = b.Description,
                BoardLevel = b.BoardLevel,
                StateCode = b.StateCode,
                TheoryPassingPercentage = b.TheoryPassingPercentage,
                PracticalPassingPercentage = b.PracticalPassingPercentage,
                OverallPassingPercentage = b.OverallPassingPercentage,
                GradingSystem = b.GradingSystem,
                MaxGradePoint = b.MaxGradePoint,
                GradingScale = DeserializeScale(b.GradingScaleJson),
                ExamStructure = DeserializeStructure(b.ExamStructureJson),
                IsSystemBoard = b.IsSystemBoard,
                IsCustomizable = b.IsCustomizable,
                IsActive = b.IsActive,
                CreatedAt = b.CreatedAt,
                UpdatedAt = b.UpdatedAt
            };
        }

        private static SchoolBoardConfigResponse MapToSchoolBoardConfigResponse(SchoolBoardConfig c)
        {
            var board = c.BoardConfiguration!;
            var boardScale = DeserializeScale(board.GradingScaleJson);
            var boardStructure = DeserializeStructure(board.ExamStructureJson);

            var customScale = !string.IsNullOrEmpty(c.CustomGradingScaleJson)
                ? DeserializeScale(c.CustomGradingScaleJson) : null;
            var customStructure = !string.IsNullOrEmpty(c.CustomExamStructureJson)
                ? DeserializeStructure(c.CustomExamStructureJson) : null;

            return new SchoolBoardConfigResponse
            {
                Id = c.Id,
                SchoolId = c.SchoolId,
                BoardConfigurationId = c.BoardConfigurationId,
                BoardName = board.Name,
                BoardCode = board.Code,
                BoardLevel = board.BoardLevel,
                AcademicYear = c.AcademicYear,
                EffectiveOverallPassingPercentage = c.CustomOverallPassingPercentage ?? board.OverallPassingPercentage,
                EffectiveTheoryPassingPercentage = c.CustomTheoryPassingPercentage ?? board.TheoryPassingPercentage,
                EffectivePracticalPassingPercentage = c.CustomPracticalPassingPercentage ?? board.PracticalPassingPercentage,
                EffectiveGradingScale = customScale ?? boardScale,
                EffectiveExamStructure = customStructure ?? boardStructure,
                CustomOverallPassingPercentage = c.CustomOverallPassingPercentage,
                CustomTheoryPassingPercentage = c.CustomTheoryPassingPercentage,
                CustomPracticalPassingPercentage = c.CustomPracticalPassingPercentage,
                HasCustomGradingScale = customScale != null,
                HasCustomExamStructure = customStructure != null,
                IsActive = c.IsActive,
                IsDefault = c.IsDefault,
                Board = MapToResponse(board),
                CreatedAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt
            };
        }

        private static List<GradeScaleEntryDto> DeserializeScale(string json)
        {
            try
            {
                return string.IsNullOrWhiteSpace(json)
                    ? new List<GradeScaleEntryDto>()
                    : JsonSerializer.Deserialize<List<GradeScaleEntryDto>>(json, _jsonOpts) ?? new();
            }
            catch { return new List<GradeScaleEntryDto>(); }
        }

        private static List<BoardExamStructureEntryDto> DeserializeStructure(string json)
        {
            try
            {
                return string.IsNullOrWhiteSpace(json)
                    ? new List<BoardExamStructureEntryDto>()
                    : JsonSerializer.Deserialize<List<BoardExamStructureEntryDto>>(json, _jsonOpts) ?? new();
            }
            catch { return new List<BoardExamStructureEntryDto>(); }
        }
    }
}
