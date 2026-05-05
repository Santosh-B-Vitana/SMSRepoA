using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SmsApi.Data;
using SmsApi.Models.Entities;
using SmsApi.Models.DTOs;

namespace SmsApi.Services
{
    public interface IExaminationService
    {
        // Exams
        Task<PaginatedResponse<ExamBasicDto>> GetExamsAsync(
            Guid schoolId, ExamFiltersDto filters, int page, int pageSize);
        Task<ExamFullDto?> GetExamByIdAsync(Guid schoolId, Guid id);
        Task<ExamFullDto> CreateExamAsync(Guid schoolId, CreateExamDto dto);
        Task<ExamFullDto> UpdateExamAsync(Guid schoolId, Guid id, CreateExamDto dto);
        Task<bool> DeleteExamAsync(Guid schoolId, Guid id);

        // Results
        Task<PaginatedResponse<ResultBasicDto>> GetResultsAsync(
            Guid schoolId, ResultFiltersDto filters, int page, int pageSize);
        Task<ResultFullDto?> GetResultByIdAsync(Guid schoolId, Guid id);
        Task<ResultFullDto> CreateResultAsync(Guid schoolId, CreateResultDto dto);
        Task<BulkOperationResult> BulkCreateResultsAsync(Guid schoolId, BulkResultDto dto);
        Task<bool> FinalizeExamResultsAsync(Guid schoolId, Guid examId);

        // Report Cards
        Task<List<ReportCardDto>> GetStudentReportCardsAsync(
            Guid schoolId, Guid studentId, string? academicYear);
        Task<ReportCardDto> GenerateReportCardAsync(
            Guid schoolId, GenerateReportCardDto dto);

        // Statistics
        Task<ExamStatsDto> GetExamStatsAsync(Guid schoolId, ExamFiltersDto? filters);

        // Grade Calculation
        Task<GradeDto> CalculateGradeAsync(Guid schoolId, decimal percentage);
    }

    public class ExaminationService : IExaminationService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<ExaminationService> _logger;
        private readonly IBoardConfigurationService _boardService;

        public ExaminationService(AppDbContext context, ILogger<ExaminationService> logger, IBoardConfigurationService boardService)
        {
            _context = context;
            _logger = logger;
            _boardService = boardService;
        }

        // ========== EXAMS ==========

        private static readonly HashSet<string> ValidExamStatuses = new(StringComparer.OrdinalIgnoreCase)
        {
            "scheduled", "ongoing", "completed", "cancelled", "postponed", "results_published"
        };

        public async Task<PaginatedResponse<ExamBasicDto>> GetExamsAsync(
            Guid schoolId, ExamFiltersDto filters, int page, int pageSize)
        {
            // Pagination bounds normalization
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 20;
            if (pageSize > 100) pageSize = 100;

            var query = _context.Examinations.Where(e => e.SchoolId == schoolId);

            // Apply filters
            if (!string.IsNullOrEmpty(filters.SearchTerm))
            {
                query = query.Where(e => 
                    e.Name.Contains(filters.SearchTerm) || 
                    e.Subject.Contains(filters.SearchTerm));
            }
            if (!string.IsNullOrEmpty(filters.Class))
                query = query.Where(e => e.Class == filters.Class || (e.ClassRef != null && e.ClassRef.Name == filters.Class));
            if (filters.ClassId.HasValue)
                query = query.Where(e => e.ClassId == filters.ClassId.Value);
            if (!string.IsNullOrEmpty(filters.Subject))
                query = query.Where(e => e.Subject == filters.Subject || (e.SubjectRef != null && e.SubjectRef.Name == filters.Subject));
            if (filters.SubjectId.HasValue)
                query = query.Where(e => e.SubjectId == filters.SubjectId.Value);
            if (!string.IsNullOrEmpty(filters.ExamType))
                query = query.Where(e => e.ExamTypeRef != null && e.ExamTypeRef.Name.Contains(filters.ExamType));
            if (filters.ExamTypeId.HasValue)
                query = query.Where(e => e.ExamTypeId == filters.ExamTypeId.Value);
            if (!string.IsNullOrEmpty(filters.Status))
                query = query.Where(e => e.Status == filters.Status);
            if (filters.DateFrom.HasValue)
                query = query.Where(e => e.ExamDate >= filters.DateFrom.Value);
            if (filters.DateTo.HasValue)
                query = query.Where(e => e.ExamDate <= filters.DateTo.Value);
            if (!string.IsNullOrEmpty(filters.AcademicYear))
                query = query.Where(e => e.AcademicYear == filters.AcademicYear);
            if (filters.Term.HasValue)
                query = query.Where(e => e.Term == filters.Term.Value);

            var totalCount = await query.CountAsync();
            var exams = await query
                .OrderByDescending(e => e.ExamDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            // Auto-update status for each exam
            foreach (var exam in exams)
            {
                await UpdateExamStatusAsync(exam);
            }

            var items = exams.Select(e => new ExamBasicDto
            {
                Id = e.Id,
                Name = e.Name,
                Class = e.Class,
                ClassId = e.ClassId,
                Section = e.Section,
                SectionId = e.SectionId,
                Subject = e.Subject,
                SubjectId = e.SubjectId,
                SubjectTypeId = e.SubjectTypeId,
                ExamTypeId = e.ExamTypeId,
                ExamType = e.ExamTypeRef?.Name ?? DeriveExamType(e.Name),
                Date = e.ExamDate,
                MaxMarks = e.TotalMarks,
                PassingMarks = e.PassingMarks,
                AcademicYear = e.AcademicYear,
                Term = e.Term,
                Status = e.Status
            }).ToList();

            return new PaginatedResponse<ExamBasicDto>
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
            };
        }

        public async Task<ExamFullDto?> GetExamByIdAsync(Guid schoolId, Guid id)
        {
            var exam = await _context.Examinations
                .Include(e => e.ExamTypeRef)
                .Include(e => e.SubjectRef)
                .Include(e => e.SubjectTypeRef)
                .Include(e => e.ClassRef)
                .Include(e => e.SectionRef)
                .Include(e => e.Invigilator)
                .Include(e => e.BoardConfig)
                .FirstOrDefaultAsync(e => e.SchoolId == schoolId && e.Id == id);

            if (exam == null) return null;

            await UpdateExamStatusAsync(exam);

            var classStudents = await _context.Students
                .CountAsync(s => s.SchoolId == schoolId &&
                               (exam.ClassId.HasValue
                                   ? (s.Class == (exam.ClassRef != null ? exam.ClassRef.Name : exam.Class))
                                   : s.Class == exam.Class) &&
                               (string.IsNullOrEmpty(exam.Section) || s.Section == exam.Section));

            var resultsCount = await _context.ExamResults.CountAsync(r => r.ExamId == id);

            var syllabusTopics = string.IsNullOrEmpty(exam.Description)
                ? new List<string>()
                : exam.Description.Split(';', StringSplitOptions.RemoveEmptyEntries).ToList();

            return new ExamFullDto
            {
                Id = exam.Id,
                SchoolId = exam.SchoolId,
                Name = exam.Name,
                ExamType = exam.ExamTypeRef?.Name ?? DeriveExamType(exam.Name),
                ExamTypeId = exam.ExamTypeId,
                Class = exam.ClassRef?.Name ?? exam.Class,
                ClassId = exam.ClassId,
                Section = exam.SectionRef?.Name ?? exam.Section ?? "",
                SectionId = exam.SectionId,
                Subject = exam.SubjectRef?.Name ?? exam.Subject,
                SubjectId = exam.SubjectId,
                SubjectType = exam.SubjectTypeRef?.Name,
                SubjectTypeId = exam.SubjectTypeId,
                Date = exam.ExamDate,
                StartTime = exam.StartTime ?? "09:00",
                EndTime = exam.EndTime ?? "12:00",
                Duration = exam.Duration ?? 180,
                MaxMarks = exam.TotalMarks,
                PassingMarks = exam.PassingMarks,
                Room = exam.Venue,
                InvigilatorId = exam.InvigilatorId,
                InvigilatorName = exam.Invigilator != null
                    ? $"{exam.Invigilator.FirstName} {exam.Invigilator.LastName}".Trim()
                    : "",
                SyllabusTopics = syllabusTopics,
                Instructions = null,
                Status = exam.Status,
                AcademicYear = exam.AcademicYear ?? "",
                Term = exam.Term,
                TotalStudents = classStudents,
                ResultsEntered = resultsCount,
                CreatedAt = exam.CreatedAt,
                UpdatedAt = exam.UpdatedAt,
                BoardConfigurationId = exam.BoardConfigurationId,
                BoardName = exam.BoardConfig?.Name,
                BoardCode = exam.BoardConfig?.Code,
                GradingSystem = exam.BoardConfig?.GradingSystem
            };
        }

        public async Task<ExamFullDto> CreateExamAsync(Guid schoolId, CreateExamDto dto)
        {
            // VALIDATION 1: Exam name required, length bounds (3-200 chars)
            if (string.IsNullOrWhiteSpace(dto.Name))
                throw new ArgumentException("Exam name is required");
            if (dto.Name.Trim().Length < 3)
                throw new ArgumentException("Exam name must be at least 3 characters");
            if (dto.Name.Trim().Length > 200)
                throw new ArgumentException("Exam name cannot exceed 200 characters");

            // VALIDATION 3: MaxMarks bounds (1-1000)
            if (dto.MaxMarks <= 0)
                throw new ArgumentException("Maximum marks must be greater than 0");
            if (dto.MaxMarks > 1000)
                throw new ArgumentException("Maximum marks cannot exceed 1000");

            // VALIDATION 4: PassingMarks bounds (0 to MaxMarks)
            if (dto.PassingMarks < 0)
                throw new ArgumentException("Passing marks cannot be negative");
            if (dto.PassingMarks > dto.MaxMarks)
                throw new ArgumentException("Passing marks cannot exceed maximum marks");

            // VALIDATION 5: AcademicYear format (YYYY-YY)
            if (string.IsNullOrWhiteSpace(dto.AcademicYear))
                throw new ArgumentException("Academic year is required");
            if (dto.AcademicYear.Length > 20)
                throw new ArgumentException("Academic year cannot exceed 20 characters");

            // VALIDATION 6: Term validation (0=full year, 1=Term1, 2=Term2)
            if (dto.Term < 0 || dto.Term > 2)
                throw new ArgumentException("Term must be 0 (full year), 1 (Term 1), or 2 (Term 2)");

            // VALIDATION 7: Duration validation (1-600 minutes)
            if (dto.Duration.HasValue && (dto.Duration.Value < 1 || dto.Duration.Value > 600))
                throw new ArgumentException("Exam duration must be between 1 and 600 minutes");

            // VALIDATION 8: Exam date sanity — not more than 5 years in the past
            if (dto.Date < DateTime.UtcNow.AddYears(-5))
                throw new ArgumentException("Exam date cannot be more than 5 years in the past");

            // VALIDATION 9: StartTime/EndTime format validation (HH:mm)
            if (!string.IsNullOrEmpty(dto.StartTime) && !System.Text.RegularExpressions.Regex.IsMatch(dto.StartTime, @"^\d{2}:\d{2}$"))
                throw new ArgumentException("Start time must be in HH:mm format");
            if (!string.IsNullOrEmpty(dto.EndTime) && !System.Text.RegularExpressions.Regex.IsMatch(dto.EndTime, @"^\d{2}:\d{2}$"))
                throw new ArgumentException("End time must be in HH:mm format");

            // VALIDATION 10: EndTime must be after StartTime if both provided
            if (!string.IsNullOrEmpty(dto.StartTime) && !string.IsNullOrEmpty(dto.EndTime))
            {
                if (TimeSpan.TryParse(dto.StartTime, out var start) && TimeSpan.TryParse(dto.EndTime, out var end))
                {
                    if (end <= start)
                        throw new ArgumentException("End time must be after start time");
                }
            }

            // VALIDATION 11: Room/Venue length
            if (!string.IsNullOrEmpty(dto.Room) && dto.Room.Length > 100)
                throw new ArgumentException("Room/venue name cannot exceed 100 characters");

            // VALIDATION 12: Instructions length
            if (!string.IsNullOrEmpty(dto.Instructions) && dto.Instructions.Length > 2000)
                throw new ArgumentException("Instructions cannot exceed 2000 characters");

            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
            
                try
                {
                    // VALIDATION 2: Duplicate prevention - unique per class/subject/academic year
                    var existingExam = await _context.Examinations
                        .AnyAsync(e => e.SchoolId == schoolId &&
                                      e.Name == dto.Name.Trim() &&
                                      (e.Class == (dto.Class ?? "") || e.ClassId == dto.ClassId) &&
                                      (e.Subject == (dto.Subject ?? "") || e.SubjectId == dto.SubjectId) &&
                                      e.AcademicYear == dto.AcademicYear);
                    if (existingExam)
                        throw new InvalidOperationException("An exam with this name already exists for this class/subject in this academic year");

                // Build description - now used only for free-text syllabus topics
                var description = dto.SyllabusTopics != null && dto.SyllabusTopics.Any()
                    ? string.Join(";", dto.SyllabusTopics)
                    : null;

                // Determine board configuration: use explicit board, or inherit from class
                Guid? boardConfigId = dto.BoardConfigurationId;
                if (!boardConfigId.HasValue && dto.ClassId.HasValue)
                {
                    var classEntity = await _context.Classes
                        .AsNoTracking()
                        .FirstOrDefaultAsync(c => c.Id == dto.ClassId && c.SchoolId == schoolId);
                    
                    if (classEntity?.BoardConfigurationId.HasValue == true)
                        boardConfigId = classEntity.BoardConfigurationId;
                }

                var exam = new Exam
                {
                    Id = Guid.NewGuid(),
                    SchoolId = schoolId,
                    Name = dto.Name,
                    // Structured FK refs (preferred)
                    ExamTypeId = dto.ExamTypeId,
                    ClassId = dto.ClassId,
                    SectionId = dto.SectionId,
                    SubjectId = dto.SubjectId,
                    SubjectTypeId = dto.SubjectTypeId,
                    InvigilatorId = dto.InvigilatorId,
                    BoardConfigurationId = boardConfigId,
                    // Legacy string fallbacks
                    Class = dto.Class ?? "",
                    Section = dto.Section,
                    Subject = dto.Subject ?? "",
                    // Scheduling
                    ExamDate = dto.Date.Date,
                    StartTime = dto.StartTime,
                    EndTime = dto.EndTime,
                    Duration = dto.Duration,
                    Venue = dto.Room,
                    // Marks
                    TotalMarks = (int)dto.MaxMarks,
                    PassingMarks = (int)dto.PassingMarks,
                    // Academic context
                    AcademicYear = dto.AcademicYear,
                    Term = dto.Term,
                    Description = description,
                    Status = "scheduled",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Examinations.Add(exam);
                await _context.SaveChangesAsync();
                
                _logger.LogInformation("Exam created: {ExamId}, Name: {ExamName}", exam.Id, exam.Name);

                // AUTO-ENROLL eligible students
                await EnrollStudentsForExamAsync(exam);
                
                await transaction.CommitAsync();
                _logger.LogInformation("Exam creation completed with student enrollments: {ExamId}", exam.Id);

                return await GetExamByIdAsync(schoolId, exam.Id) 
                    ?? throw new Exception("Failed to retrieve created exam");
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    _logger.LogError(ex, "Failed to create exam: {ExamName}", dto.Name);
                    throw;
                }
            });
        }
        
        private async Task EnrollStudentsForExamAsync(Exam exam)
        {
            try
            {
                // Find all active students in the exam's class/section
                var studentsQuery = _context.Students
                    .Where(s => s.SchoolId == exam.SchoolId && 
                               s.Class == exam.Class &&
                               s.IsActive &&
                               s.Status == "active");

                // Filter by section if specified
                if (!string.IsNullOrEmpty(exam.Section))
                {
                    studentsQuery = studentsQuery.Where(s => s.Section == exam.Section);
                }

                var students = await studentsQuery.ToListAsync();
                
                if (students.Count == 0)
                {
                    _logger.LogWarning("No students found for exam {ExamId}, Class: {Class}, Section: {Section}", 
                        exam.Id, exam.Class, exam.Section);
                    return;
                }

                // Create exam registrations for each student
                var registrations = students.Select(student => new ExamRegistration
                {
                    Id = Guid.NewGuid(),
                    SchoolId = exam.SchoolId,
                    ExamId = exam.Id,
                    StudentId = student.Id,
                    Status = "registered",
                    IsPresent = null, // Will be marked during exam
                    RegisteredAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                }).ToList();

                _context.ExamRegistrations.AddRange(registrations);
                await _context.SaveChangesAsync();
                
                _logger.LogInformation("Auto-enrolled {Count} students for exam {ExamId}", 
                    registrations.Count, exam.Id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to enroll students for exam {ExamId}", exam.Id);
                // Don't throw - enrollment failure shouldn't block exam creation completely
            }
        }

        public async Task<ExamFullDto> UpdateExamAsync(Guid schoolId, Guid id, CreateExamDto dto)
        {
            var exam = await _context.Examinations
                .FirstOrDefaultAsync(e => e.SchoolId == schoolId && e.Id == id);

            if (exam == null)
                throw new KeyNotFoundException("Exam not found");

            // VALIDATION: Cannot update cancelled or finalized exams
            if (exam.Status == "cancelled")
                throw new InvalidOperationException("Cannot update a cancelled exam");
            if (exam.Status == "results_published")
                throw new InvalidOperationException("Cannot update an exam with published results");

            // VALIDATION: Name bounds
            if (string.IsNullOrWhiteSpace(dto.Name))
                throw new ArgumentException("Exam name is required");
            if (dto.Name.Trim().Length < 3)
                throw new ArgumentException("Exam name must be at least 3 characters");
            if (dto.Name.Trim().Length > 200)
                throw new ArgumentException("Exam name cannot exceed 200 characters");

            // VALIDATION: MaxMarks bounds
            if (dto.MaxMarks <= 0)
                throw new ArgumentException("Maximum marks must be greater than 0");
            if (dto.MaxMarks > 1000)
                throw new ArgumentException("Maximum marks cannot exceed 1000");

            // VALIDATION: PassingMarks bounds
            if (dto.PassingMarks < 0)
                throw new ArgumentException("Passing marks cannot be negative");
            if (dto.PassingMarks > dto.MaxMarks)
                throw new ArgumentException("Passing marks cannot exceed maximum marks");

            // VALIDATION: Duration bounds
            if (dto.Duration.HasValue && (dto.Duration.Value < 1 || dto.Duration.Value > 600))
                throw new ArgumentException("Exam duration must be between 1 and 600 minutes");

            // VALIDATION: Term
            if (dto.Term < 0 || dto.Term > 2)
                throw new ArgumentException("Term must be 0 (full year), 1 (Term 1), or 2 (Term 2)");

            // Update fields
            exam.Name = dto.Name;
            exam.Class = dto.Class ?? exam.Class;
            exam.Section = dto.Section ?? exam.Section;
            exam.Subject = dto.Subject ?? exam.Subject;
            exam.ExamDate = dto.Date.Date;
            exam.TotalMarks = (int)dto.MaxMarks;
            exam.PassingMarks = (int)dto.PassingMarks;

            // Structured FK refs
            if (dto.ExamTypeId.HasValue) exam.ExamTypeId = dto.ExamTypeId;
            if (dto.ClassId.HasValue) exam.ClassId = dto.ClassId;
            if (dto.SectionId.HasValue) exam.SectionId = dto.SectionId;
            if (dto.SubjectId.HasValue) exam.SubjectId = dto.SubjectId;
            if (dto.SubjectTypeId.HasValue) exam.SubjectTypeId = dto.SubjectTypeId;
            if (dto.InvigilatorId.HasValue) exam.InvigilatorId = dto.InvigilatorId;

            // Scheduling
            if (dto.StartTime != null) exam.StartTime = dto.StartTime;
            if (dto.EndTime != null) exam.EndTime = dto.EndTime;
            if (dto.Duration.HasValue) exam.Duration = dto.Duration;
            if (dto.Room != null) exam.Venue = dto.Room;

            // Academic context
            exam.AcademicYear = dto.AcademicYear;
            exam.Term = dto.Term;

            // Syllabus topics go in Description as simple semicolon-delimited list
            if (dto.SyllabusTopics != null)
                exam.Description = string.Join(";", dto.SyllabusTopics);

            exam.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return await GetExamByIdAsync(schoolId, id)
                ?? throw new Exception("Failed to retrieve updated exam");
        }

        public async Task<bool> DeleteExamAsync(Guid schoolId, Guid id)
        {
            var exam = await _context.Examinations
                .FirstOrDefaultAsync(e => e.SchoolId == schoolId && e.Id == id);

            if (exam == null) return false;

            // Delete associated results first
            var results = await _context.ExamResults
                .Where(r => r.ExamId == id)
                .ToListAsync();
            _context.ExamResults.RemoveRange(results);

            // Delete associated registrations
            var registrations = await _context.ExamRegistrations
                .Where(r => r.ExamId == id)
                .ToListAsync();
            _context.ExamRegistrations.RemoveRange(registrations);

            _context.Examinations.Remove(exam);
            await _context.SaveChangesAsync();
            return true;
        }

        // ========== RESULTS ==========

        public async Task<PaginatedResponse<ResultBasicDto>> GetResultsAsync(
            Guid schoolId, ResultFiltersDto filters, int page, int pageSize)
        {
            // Pagination bounds normalization
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 20;
            if (pageSize > 100) pageSize = 100;

            var query = _context.ExamResults
                .Include(r => r.Student)
                .Include(r => r.Exam)
                .Where(r => r.SchoolId == schoolId);

            // Apply filters
            if (filters.ExamId.HasValue)
                query = query.Where(r => r.ExamId == filters.ExamId.Value);
            if (filters.StudentId.HasValue)
                query = query.Where(r => r.StudentId == filters.StudentId.Value);
            if (!string.IsNullOrEmpty(filters.Class))
                query = query.Where(r => r.Student != null && r.Student.Class == filters.Class);
            if (!string.IsNullOrEmpty(filters.Section))
                query = query.Where(r => r.Student != null && r.Student.Section == filters.Section);
            if (!string.IsNullOrEmpty(filters.Subject))
                query = query.Where(r => r.Subject == filters.Subject);
            if (!string.IsNullOrEmpty(filters.SearchTerm))
            {
                query = query.Where(r => 
                    (r.Student != null && 
                     (r.Student.Name.Split()[0].Contains(filters.SearchTerm) || 
                      r.Student.LastName.Contains(filters.SearchTerm))) ||
                    r.Subject.Contains(filters.SearchTerm));
            }

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(r => r.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(r => new ResultBasicDto
                {
                    Id = r.Id,
                    StudentId = r.StudentId,
                    StudentName = r.Student != null ? r.Student.Name : "",
                    Class = r.Student != null ? r.Student.Class : "",
                    Subject = r.Subject,
                    SubjectId = r.SubjectId,
                    MarksObtained = r.MarksObtained,
                    MaxMarks = r.TotalMarks,
                    Grade = r.Grade ?? "",
                    IsAbsent = r.IsAbsent,
                    IsPass = r.IsPass,
                    Percentage = r.Percentage
                })
                .ToListAsync();

            return new PaginatedResponse<ResultBasicDto>
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
            };
        }

        public async Task<ResultFullDto?> GetResultByIdAsync(Guid schoolId, Guid id)
        {
            var result = await _context.ExamResults
                .Include(r => r.Student)
                .Include(r => r.Exam)
                .Include(r => r.SubjectRef)
                .FirstOrDefaultAsync(r => r.SchoolId == schoolId && r.Id == id);

            if (result == null) return null;

            var gradePoint = CalculateGradePoint(result.Grade ?? "F");
            var rank = await CalculateRankAsync(schoolId, result.ExamId, result.StudentId, result.Subject);

            return new ResultFullDto
            {
                Id = result.Id,
                SchoolId = result.SchoolId,
                ExamId = result.ExamId,
                ExamName = result.Exam?.Name ?? "",
                StudentId = result.StudentId,
                StudentName = result.Student?.Name ?? "",
                Class = result.Student?.Class ?? "",
                Section = result.Student?.Section ?? "",
                Subject = result.SubjectRef?.Name ?? result.Subject,
                SubjectId = result.SubjectId,
                MarksObtained = result.MarksObtained,
                TheoryMarks = result.TheoryMarks,
                PracticalMarks = result.PracticalMarks,
                InternalMarks = result.InternalMarks,
                MaxMarks = result.TotalMarks,
                Percentage = result.Percentage,
                Grade = result.Grade ?? "F",
                GradePoint = gradePoint,
                Rank = rank,
                Remarks = result.Remarks,
                IsAbsent = result.IsAbsent,
                IsPass = result.IsPass,
                CreatedAt = result.CreatedAt,
                UpdatedAt = result.UpdatedAt
            };
        }

        public async Task<ResultFullDto> CreateResultAsync(Guid schoolId, CreateResultDto dto)
        {
            // VALIDATION 1: Marks components cannot be negative
            if (dto.MarksObtained.HasValue && dto.MarksObtained.Value < 0)
                throw new ArgumentException("Marks obtained cannot be negative");
            if (dto.TheoryMarks.HasValue && dto.TheoryMarks.Value < 0)
                throw new ArgumentException("Theory marks cannot be negative");
            if (dto.PracticalMarks.HasValue && dto.PracticalMarks.Value < 0)
                throw new ArgumentException("Practical marks cannot be negative");
            if (dto.InternalMarks.HasValue && dto.InternalMarks.Value < 0)
                throw new ArgumentException("Internal marks cannot be negative");

            // VALIDATION 2: Remarks length
            if (!string.IsNullOrEmpty(dto.Remarks) && dto.Remarks.Length > 1000)
                throw new ArgumentException("Remarks cannot exceed 1000 characters");

            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
            
                try
                {
                    // VALIDATION 3: Check if result already exists (duplicate prevention)
                    var exists = await _context.ExamResults
                        .AnyAsync(r => r.SchoolId == schoolId && 
                                      r.ExamId == dto.ExamId && 
                                      r.StudentId == dto.StudentId);

                    if (exists)
                        throw new InvalidOperationException("Result already exists for this student in this exam");

                    // VALIDATION 4: Get exam details (UPDATED: Include BoardConfig for board-aware grading)
                    var exam = await _context.Examinations
                        .Include(e => e.BoardConfig)
                        .FirstOrDefaultAsync(e => e.Id == dto.ExamId && e.SchoolId == schoolId);
                    if (exam == null)
                        throw new KeyNotFoundException("Exam not found");

                // VALIDATION 5: Get student details and check if in correct class
                var student = await _context.Students
                    .FirstOrDefaultAsync(s => s.Id == dto.StudentId && s.SchoolId == schoolId);
                if (student == null)
                    throw new KeyNotFoundException("Student not found");
                
                if (student.Class != exam.Class)
                    throw new InvalidOperationException($"Student is in {student.Class}, but exam is for {exam.Class}");
                
                if (!string.IsNullOrEmpty(exam.Section) && student.Section != exam.Section)
                    throw new InvalidOperationException($"Student is in section {student.Section}, but exam is for section {exam.Section}");

                // VALIDATION 6: Check if student is registered for this exam
                var registration = await _context.ExamRegistrations
                    .FirstOrDefaultAsync(r => r.ExamId == dto.ExamId && r.StudentId == dto.StudentId);
                
                if (registration == null)
                    throw new InvalidOperationException("Student is not registered for this exam. Please enroll the student first.");
                
                // VALIDATION 7: Check attendance status
                if (registration.IsPresent == false && !dto.IsAbsent)
                    throw new InvalidOperationException("Student was marked absent. Cannot enter marks for absent student.");

                // VALIDATION 8: Validate Marks Components - non-negative
                if (dto.TheoryMarks.HasValue && dto.TheoryMarks < 0)
                    throw new ArgumentException("Theory marks cannot be negative");
                
                if (dto.PracticalMarks.HasValue && dto.PracticalMarks < 0)
                    throw new ArgumentException("Practical marks cannot be negative");
                
                if (dto.InternalMarks.HasValue && dto.InternalMarks < 0)
                    throw new ArgumentException("Internal marks cannot be negative");

                // Calculate marks
                decimal totalMarks = 0;
                if (dto.IsAbsent)
                {
                    totalMarks = 0;
                    // Mark student as absent in registration
                    registration.IsPresent = false;
                    registration.Status = "absent";
                }
                else if (dto.MarksObtained.HasValue)
                {
                    totalMarks = dto.MarksObtained.Value;
                    
                    // VALIDATION: Validate MarksObtained is not negative
                    if (totalMarks < 0)
                        throw new ArgumentException("Marks obtained cannot be negative");
                    
                    // Mark student as appeared
                    registration.IsPresent = true;
                    registration.Status = "appeared";
                }
                else
                {
                    totalMarks = (dto.TheoryMarks ?? 0) + (dto.PracticalMarks ?? 0) + (dto.InternalMarks ?? 0);
                    // Mark student as appeared
                    registration.IsPresent = true;
                    registration.Status = "appeared";
                }

                // VALIDATION 9: Validate marks don't exceed max marks
                if (totalMarks > exam.TotalMarks)
                    throw new ArgumentException($"Marks obtained ({totalMarks}) cannot exceed maximum marks ({exam.TotalMarks})");

                // VALIDATION 10: Calculate percentage and determine PASS/FAIL
                var percentage = exam.TotalMarks > 0 ? (totalMarks / exam.TotalMarks) * 100 : 0;
                
                // Calculate passing percentage based on exam's passing marks
                var examPassingPercentage = (exam.PassingMarks / (decimal)exam.TotalMarks) * 100;
                var isStudentPassed = percentage >= examPassingPercentage;

                // UPDATED: Pass exam's board configuration for board-aware grading
                var (grade, gradePoint, _) = await GetBoardGradeAsync(schoolId, percentage, exam.BoardConfigurationId);
                
                _logger.LogInformation($"RESULT CALCULATION: Student {student.Name}, Subject {exam.Subject}, Marks: {totalMarks}/{exam.TotalMarks}, Percentage: {percentage:F2}%, Passing %: {examPassingPercentage:F2}%, Status: {(isStudentPassed ? "PASSED" : "FAILED")}, Grade: {grade}, Board: {exam.BoardConfig?.Code ?? "School Default"}");

                var result = new ExamResult
                {
                    Id = Guid.NewGuid(),
                    SchoolId = schoolId,
                    ExamId = dto.ExamId,
                    StudentId = dto.StudentId,
                    SubjectId = dto.SubjectId ?? exam.SubjectId,
                    Subject = exam.SubjectRef?.Name ?? exam.Subject,
                    MarksObtained = totalMarks,
                    TheoryMarks = dto.TheoryMarks,
                    PracticalMarks = dto.PracticalMarks,
                    InternalMarks = dto.InternalMarks,
                    TotalMarks = exam.TotalMarks,
                    Percentage = percentage,
                    Grade = grade,
                    IsPass = isStudentPassed,
                    IsAbsent = dto.IsAbsent,
                    Remarks = dto.Remarks,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.ExamResults.Add(result);
                registration.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();
                
                _logger.LogInformation($"✅ CRITICAL: Result created for student {student.AdmissionNumber} ({student.Name}), exam {exam.Name}, subject {exam.Subject}, marks: {totalMarks}/{exam.TotalMarks}, grade: {grade}, Board: {exam.BoardConfig?.Code ?? "School Default"}, status: {(isStudentPassed ? "PASSED ✓" : "FAILED ✗")}");

                return await GetResultByIdAsync(schoolId, result.Id) 
                    ?? throw new Exception("Failed to retrieve created result");
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    _logger.LogError($"❌ CRITICAL: Failed to create result: {ex.Message}");
                    throw;
                }
            });
        }

        public async Task<BulkOperationResult> BulkCreateResultsAsync(Guid schoolId, BulkResultDto dto)
        {
            var successCount = 0;
            var failureCount = 0;
            var errors = new List<string>();

            // Get exam details (UPDATED: Include BoardConfig for board-aware grading)
            var exam = await _context.Examinations
                .Include(e => e.BoardConfig)
                .FirstOrDefaultAsync(e => e.Id == dto.ExamId);
            if (exam == null)
            {
                return new BulkOperationResult
                {
                    SuccessCount = 0,
                    FailureCount = dto.Results.Count,
                    Errors = new List<string> { "Exam not found" }
                };
            }

            // Get existing results for UPSERT (update if exists, create if new)
            var existingResultsMap = await _context.ExamResults
                .Where(r => r.SchoolId == schoolId && 
                           r.ExamId == dto.ExamId &&
                           dto.Results.Select(x => x.StudentId).Contains(r.StudentId))
                .ToDictionaryAsync(r => r.StudentId, r => r);

            foreach (var studentResult in dto.Results)
            {
                try
                {
                    // Calculate marks
                    decimal totalMarks = 0;
                    if (studentResult.IsAbsent)
                    {
                        totalMarks = 0;
                    }
                    else if (studentResult.MarksObtained.HasValue)
                    {
                        totalMarks = studentResult.MarksObtained.Value;
                    }
                    else
                    {
                        totalMarks = (studentResult.TheoryMarks ?? 0) + 
                                   (studentResult.PracticalMarks ?? 0) + 
                                   (studentResult.InternalMarks ?? 0);
                    }

                    // Validate marks don't exceed max and aren't negative
                    if (totalMarks < 0)
                    {
                        failureCount++;
                        errors.Add($"Marks cannot be negative for student {studentResult.StudentId}");
                        continue;
                    }
                    if (totalMarks > exam.TotalMarks)
                    {
                        failureCount++;
                        errors.Add($"Marks ({totalMarks}) exceed maximum ({exam.TotalMarks}) for student {studentResult.StudentId}");
                        continue;
                    }

                    // Calculate percentage and grade (UPDATED: Pass exam's board configuration)
                    var percentage = exam.TotalMarks > 0 ? (totalMarks / exam.TotalMarks) * 100 : 0;
                    var (grade, gradePoint, _) = await GetBoardGradeAsync(schoolId, percentage, exam.BoardConfigurationId);
                    var examPassingPercentage = (exam.PassingMarks / (decimal)exam.TotalMarks) * 100;
                    var isStudentPassed = percentage >= examPassingPercentage;

                    // Build remarks
                    var remarksParts = new List<string>();
                    if (studentResult.TheoryMarks.HasValue)
                        remarksParts.Add($"TH:{studentResult.TheoryMarks.Value}");
                    if (studentResult.PracticalMarks.HasValue)
                        remarksParts.Add($"PR:{studentResult.PracticalMarks.Value}");
                    if (studentResult.InternalMarks.HasValue)
                        remarksParts.Add($"INT:{studentResult.InternalMarks.Value}");
                    if (studentResult.IsAbsent)
                        remarksParts.Add("ABSENT:true");
                    if (!string.IsNullOrEmpty(studentResult.Remarks))
                        remarksParts.Add($"REM:{studentResult.Remarks}");
                    remarksParts.Add($"STATUS:{(isStudentPassed ? "PASSED" : "FAILED")}");

                    var remarksStr = string.Join("|", remarksParts);

                    if (existingResultsMap.TryGetValue(studentResult.StudentId, out var existing))
                    {
                        // UPDATE existing result
                        existing.MarksObtained = (int)totalMarks;
                        existing.TotalMarks = exam.TotalMarks;
                        existing.Percentage = percentage;
                        existing.Grade = grade;
                        existing.Remarks = remarksStr;
                        existing.UpdatedAt = DateTime.UtcNow;
                        successCount++;
                    }
                    else
                    {
                        // CREATE new result
                        var result = new ExamResult
                        {
                            Id = Guid.NewGuid(),
                            SchoolId = schoolId,
                            ExamId = dto.ExamId,
                            StudentId = studentResult.StudentId,
                            Subject = exam.Subject,
                            MarksObtained = (int)totalMarks,
                            TotalMarks = exam.TotalMarks,
                            Percentage = percentage,
                            Grade = grade,
                            Remarks = remarksStr,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };

                        _context.ExamResults.Add(result);
                        successCount++;
                    }
                }
                catch (Exception ex)
                {
                    failureCount++;
                    errors.Add($"Failed for student {studentResult.StudentId}: {ex.Message}");
                    _logger.LogError(ex, "Failed to create/update result for student {StudentId}", studentResult.StudentId);
                }
            }

            if (successCount > 0)
                await _context.SaveChangesAsync();

            return new BulkOperationResult
            {
                SuccessCount = successCount,
                FailureCount = failureCount,
                Errors = errors
            };
        }

        // ========== REPORT CARDS ==========

        public async Task<List<ReportCardDto>> GetStudentReportCardsAsync(
            Guid schoolId, Guid studentId, string? academicYear)
        {
            var student = await _context.Students
                .FirstOrDefaultAsync(s => s.SchoolId == schoolId && s.Id == studentId);

            if (student == null)
                throw new KeyNotFoundException("Student not found");

            var query = _context.ExamResults
                .Include(r => r.Exam)
                .Where(r => r.SchoolId == schoolId && r.StudentId == studentId);

            // Filter by academic year if provided
            if (!string.IsNullOrEmpty(academicYear))
            {
                query = query.Where(r => r.Exam != null &&
                                        (r.Exam.AcademicYear == academicYear ||
                                         r.Exam.AcademicYear == null));
            }

            var results = await query.ToListAsync();

            // If we have year-matched results alongside null-year results, prefer year-matched
            if (!string.IsNullOrEmpty(academicYear) && results.Any(r => r.Exam?.AcademicYear == academicYear))
                results = results.Where(r => r.Exam?.AcademicYear == academicYear).ToList();

            // Helper: resolve exam type from navigation property name or name heuristic
            static string ResolveExamType(ExamResult r)
            {
                var et = r.Exam?.ExamTypeRef?.Name?.ToLowerInvariant().Trim().Replace("-", "_") ?? "";
                if (!string.IsNullOrEmpty(et)) return et;
                var n = r.Exam?.Name?.ToLowerInvariant() ?? "";
                return n.Contains("unit") ? "unit_test" :
                       n.Contains("mid")  ? "mid_term"  :
                       n.Contains("quarter") ? "quarterly" :
                       n.Contains("half") ? "half_yearly" :
                       n.Contains("annual") ? "annual" : "practical";
            }

            // Group by exam type
            var examTypes = results.Select(ResolveExamType).Distinct().ToList();

            var reportCards = new List<ReportCardDto>();

            foreach (var examType in examTypes)
            {
                var examTypeResults = results
                    .Where(r => ResolveExamType(r) == examType)
                    .ToList();

                if (!examTypeResults.Any()) continue;

                var subjectResults = examTypeResults.Select(r => {
                    var remarks = r.Remarks ?? "";
                    decimal? theoryMarks = null, practicalMarks = null;
                    
                    if (remarks.Contains("TH:"))
                        theoryMarks = decimal.Parse(remarks.Split("TH:")[1].Split('|')[0].Trim());
                    if (remarks.Contains("PR:"))
                        practicalMarks = decimal.Parse(remarks.Split("PR:")[1].Split('|')[0].Trim());

                    return new SubjectResultDto
                    {
                        Subject = r.Subject,
                        TheoryMarks = theoryMarks,
                        PracticalMarks = practicalMarks,
                        TotalMarks = r.MarksObtained,
                        MaxMarks = r.TotalMarks,
                        Grade = r.Grade ?? "F",
                        GradePoint = CalculateGradePoint(r.Grade ?? "F")
                    };
                }).ToList();

                var totalMarks = subjectResults.Sum(s => s.TotalMarks);
                var maxTotalMarks = subjectResults.Sum(s => s.MaxMarks);
                var percentage = maxTotalMarks > 0 ? (totalMarks / maxTotalMarks) * 100 : 0;
                var (overallGrade, _, overallIsPassing) = await GetBoardGradeAsync(schoolId, percentage);

                var year = !string.IsNullOrEmpty(academicYear) ? academicYear : 
                          examTypeResults.First().Exam?.AcademicYear ?? "";

                reportCards.Add(new ReportCardDto
                {
                    Id = Guid.NewGuid(),
                    SchoolId = schoolId,
                    StudentId = studentId,
                    StudentName = $"{student.Name.Split()[0]} {student.LastName}",
                    Class = student.Class,
                    Section = student.Section,
                    RollNumber = student.RollNumber,
                    AcademicYear = year,
                    ExamType = examType,
                    Subjects = subjectResults,
                    TotalMarks = totalMarks,
                    MaxTotalMarks = maxTotalMarks,
                    Percentage = Math.Round(percentage, 2),
                    Grade = overallGrade,
                    Rank = null,
                    AttendancePercentage = null,
                    TeacherRemarks = null,
                    PrincipalRemarks = null,
                    GeneratedAt = DateTime.UtcNow
                });
            }

            return reportCards;
        }

        public async Task<ReportCardDto> GenerateReportCardAsync(
            Guid schoolId, GenerateReportCardDto dto)
        {
            // VALIDATION: AcademicYear required
            if (string.IsNullOrWhiteSpace(dto.AcademicYear))
                throw new ArgumentException("Academic year is required for report card generation");
            
            // VALIDATION: ExamType required
            if (string.IsNullOrWhiteSpace(dto.ExamType))
                throw new ArgumentException("Exam type is required for report card generation");

            var student = await _context.Students
                .FirstOrDefaultAsync(s => s.SchoolId == schoolId && s.Id == dto.StudentId);

            if (student == null)
                throw new KeyNotFoundException("Student not found");

            var results = await _context.ExamResults
                .Include(r => r.Exam)
                .Where(r => r.SchoolId == schoolId &&
                           r.StudentId == dto.StudentId &&
                           r.Exam != null &&
                           // Use the proper AcademicYear field — Description encoding is not reliable
                           (r.Exam.AcademicYear == dto.AcademicYear ||
                            // Fallback: exams seeded before the AcademicYear field was set have null; include them
                            // only when no year is explicitly set so old data is not lost
                            r.Exam.AcademicYear == null))
                .ToListAsync();

            // If any results have a known year, prefer those over the null-year fallback
            if (results.Any(r => r.Exam?.AcademicYear == dto.AcademicYear))
                results = results.Where(r => r.Exam?.AcademicYear == dto.AcademicYear).ToList();

            // Filter by exam type — use the Exam.ExamType field first, fall back to name heuristic
            results = results.Where(r => {
                var examType = r.Exam?.ExamTypeRef?.Name?.ToLowerInvariant().Trim() ?? "";
                if (string.IsNullOrEmpty(examType))
                {
                    // Heuristic from exam name when ExamTypeRef not populated
                    var name = r.Exam?.Name?.ToLowerInvariant() ?? "";
                    examType = name.Contains("unit") ? "unit_test" :
                               name.Contains("mid") ? "mid_term" :
                               name.Contains("quarter") ? "quarterly" :
                               name.Contains("half") ? "half_yearly" :
                               name.Contains("annual") ? "annual" : "practical";
                }
                // Normalize both sides: "half-yearly" == "half_yearly", "annual" == "annual"
                var requested = dto.ExamType.ToLowerInvariant().Replace("-", "_").Trim();
                var actual    = examType.Replace("-", "_");
                return actual == requested || actual.Contains(requested) || requested.Contains(actual);
            }).ToList();

            if (!results.Any())
                throw new InvalidOperationException("No results found for the specified criteria");

            var subjectResults = results.Select(r => {
                var remarks = r.Remarks ?? "";
                decimal? theoryMarks = null, practicalMarks = null;
                
                if (remarks.Contains("TH:"))
                    theoryMarks = decimal.Parse(remarks.Split("TH:")[1].Split('|')[0].Trim());
                if (remarks.Contains("PR:"))
                    practicalMarks = decimal.Parse(remarks.Split("PR:")[1].Split('|')[0].Trim());

                return new SubjectResultDto
                {
                    Subject = r.Subject,
                    TheoryMarks = theoryMarks,
                    PracticalMarks = practicalMarks,
                    TotalMarks = r.MarksObtained,
                    MaxMarks = r.TotalMarks,
                    Grade = r.Grade ?? "F",
                    GradePoint = CalculateGradePoint(r.Grade ?? "F")
                };
            }).ToList();

            var totalMarks = subjectResults.Sum(s => s.TotalMarks);
            var maxTotalMarks = subjectResults.Sum(s => s.MaxMarks);
            var percentage = maxTotalMarks > 0 ? (totalMarks / maxTotalMarks) * 100 : 0;
            var (overallGrade, _, overallIsPassing) = await GetBoardGradeAsync(schoolId, percentage);

            // Calculate rank based on total percentage for the class
            int? rank = null;
            // Get all students in the same class for the same exam type
            var classResults = await _context.ExamResults
                .Where(r => r.SchoolId == schoolId && 
                           r.Exam != null && 
                           r.Exam.Name.Contains(dto.ExamType) &&
                           r.Student != null &&
                           r.Student.Class == student.Class)
                .Include(r => r.Student)
                .GroupBy(r => r.StudentId)
                .Select(g => new
                {
                    StudentId = g.Key,
                    TotalMarks = g.Sum(r => r.MarksObtained),
                    MaxMarks = g.Sum(r => r.TotalMarks)
                })
                .ToListAsync();

            if (classResults.Any())
            {
                var rankedStudents = classResults
                    .Select(r => new
                    {
                        r.StudentId,
                        Percentage = r.MaxMarks > 0 ? (decimal)r.TotalMarks / r.MaxMarks * 100 : 0
                    })
                    .OrderByDescending(r => r.Percentage)
                    .ToList();

                rank = rankedStudents.FindIndex(r => r.StudentId == dto.StudentId) + 1;
            }

            // Calculate attendance (optional)
            var attendanceRecords = await _context.AttendanceRecords
                .Where(a => a.SchoolId == schoolId && a.StudentId == dto.StudentId)
                .ToListAsync();

            decimal? attendancePercentage = null;
            if (attendanceRecords.Any())
            {
                var totalDays = attendanceRecords.Count;
                var presentDays = attendanceRecords.Count(a => a.Status == "present" || a.Status == "late");
                attendancePercentage = totalDays > 0 ? Math.Round((decimal)presentDays / totalDays * 100, 2) : 0;
            }

            return new ReportCardDto
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                StudentId = dto.StudentId,
                StudentName = $"{student.Name.Split()[0]} {student.LastName}",
                Class = student.Class,
                Section = student.Section,
                RollNumber = student.RollNumber,
                AcademicYear = dto.AcademicYear,
                ExamType = dto.ExamType,
                Subjects = subjectResults,
                TotalMarks = totalMarks,
                MaxTotalMarks = maxTotalMarks,
                Percentage = Math.Round(percentage, 2),
                Grade = overallGrade,
                Rank = rank,
                AttendancePercentage = attendancePercentage,
                TeacherRemarks = dto.TeacherRemarks,
                PrincipalRemarks = dto.PrincipalRemarks,
                GeneratedAt = DateTime.UtcNow
            };
        }

        // ========== STATISTICS ==========

        public async Task<ExamStatsDto> GetExamStatsAsync(Guid schoolId, ExamFiltersDto? filters)
        {
            var query = _context.Examinations.Where(e => e.SchoolId == schoolId);

            if (filters != null)
            {
                if (!string.IsNullOrEmpty(filters.Class))
                    query = query.Where(e => e.Class == filters.Class);
                if (!string.IsNullOrEmpty(filters.Subject))
                    query = query.Where(e => e.Subject == filters.Subject);
                if (!string.IsNullOrEmpty(filters.AcademicYear))
                    query = query.Where(e => e.AcademicYear == filters.AcademicYear);
                if (filters.DateFrom.HasValue)
                    query = query.Where(e => e.ExamDate >= filters.DateFrom.Value);
                if (filters.DateTo.HasValue)
                    query = query.Where(e => e.ExamDate <= filters.DateTo.Value);
            }

            var exams = await query.ToListAsync();
            var totalExams = exams.Count;
            var scheduledExams = exams.Count(e => e.Status == "scheduled");
            var completedExams = exams.Count(e => e.Status == "completed");
            var ongoingExams = exams.Count(e => e.Status == "ongoing");

            var resultsQuery = _context.ExamResults.Where(r => r.SchoolId == schoolId);
            var results = await resultsQuery.ToListAsync();

            var totalResults = results.Count;
            var averageMarks = results.Any() ? results.Average(r => r.Percentage) : 0;
            
            var passPercentage = results.Any() 
                ? Math.Round((decimal)results.Count(r => r.Percentage >= 35) / results.Count * 100, 2) 
                : 0;

            // Get top performers
            var topPerformers = await _context.ExamResults
                .Include(r => r.Student)
                .Where(r => r.SchoolId == schoolId)
                .GroupBy(r => r.StudentId)
                .Select(g => new {
                    StudentId = g.Key,
                    Student = g.First().Student,
                    AveragePercentage = g.Average(r => r.Percentage)
                })
                .OrderByDescending(x => x.AveragePercentage)
                .Take(10)
                .ToListAsync();

            var topPerformersList = topPerformers.Select((tp, index) => new TopPerformerDto
            {
                StudentId = tp.StudentId,
                StudentName = tp.Student != null ? tp.Student.Name : "",
                Class = tp.Student?.Class ?? "",
                Percentage = Math.Round(tp.AveragePercentage, 2),
                Rank = index + 1
            }).ToList();

            return new ExamStatsDto
            {
                TotalExams = totalExams,
                ScheduledExams = scheduledExams,
                CompletedExams = completedExams,
                OngoingExams = ongoingExams,
                TotalResults = totalResults,
                AverageMarks = Math.Round(averageMarks, 2),
                PassPercentage = passPercentage,
                TopPerformers = topPerformersList
            };
        }

        // ========== GRADE CALCULATION ==========

        public async Task<GradeDto> CalculateGradeAsync(Guid schoolId, decimal percentage)
        {
            if (percentage < 0 || percentage > 100)
                throw new ArgumentException("Percentage must be between 0 and 100");

            var boardResult = await _boardService.CalculateGradeAsync(schoolId, percentage);
            return new GradeDto
            {
                Grade = boardResult.Grade,
                GradePoint = boardResult.GradePoint,
                Percentage = percentage,
                IsPassingGrade = boardResult.IsPassing
            };
        }

        /// <summary>Board-aware grade lookup used internally in async methods.</summary>
        private async Task<(string Grade, decimal GradePoint, bool IsPassing)> GetBoardGradeAsync(Guid schoolId, decimal percentage)
        {
            var r = await _boardService.CalculateGradeAsync(schoolId, percentage);
            return (r.Grade, r.GradePoint, r.IsPassing);
        }

        /// <summary>Board-aware grade lookup with specific exam board configuration.</summary>
        private async Task<(string Grade, decimal GradePoint, bool IsPassing)> GetBoardGradeAsync(Guid schoolId, decimal percentage, Guid? boardConfigurationId)
        {
            var r = await _boardService.CalculateGradeAsync(schoolId, percentage, boardConfigurationId);
            return (r.Grade, r.GradePoint, r.IsPassing);
        }

        /// <summary>Fallback grade lookup for callers that already have a grade string from the DB (no percentage available).</summary>
        private static decimal CalculateGradePoint(string grade)
        {
            return grade switch
            {
                // CBSE A1-E2
                "A1" => 10.0m, "A2" => 9.0m, "B1" => 8.0m, "B2" => 7.0m,
                "C1" => 6.0m, "C2" => 5.0m, "D" => 4.0m, "E1" => 3.0m, "E2" => 2.0m,
                // Generic / State boards
                "A+" => 10.0m, "A" => 9.0m, "B+" => 8.0m, "B" => 7.0m,
                "C+" => 6.0m, "C" => 5.0m,
                // IB
                "7" => 7.0m, "6" => 6.0m, "5" => 5.0m, "4" => 4.0m,
                "3" => 3.0m, "2" => 2.0m, "1" => 1.0m,
                // Cambridge
                "A*" => 9.0m, "E" => 4.0m,
                "F" or "U" => 0.0m,
                _ => 0.0m
            };
        }

        // ========== HELPER METHODS ==========

        private async Task UpdateExamStatusAsync(Exam exam)
        {
            var now = DateTime.UtcNow;
            var examDateTime = exam.ExamDate.Date;
            
            // Parse duration from Description field
            var description = exam.Description ?? "";
            var duration = description.Contains("DUR:") 
                ? int.Parse(description.Split("DUR:")[1].Split('|')[0].Trim()) 
                : 180; // Default 3 hours
            
            var examEndDateTime = examDateTime.AddMinutes(duration);

            // Auto-update status based on date/time
            if (now < examDateTime && exam.Status != "scheduled")
            {
                exam.Status = "scheduled";
                exam.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
            else if (now >= examDateTime && now <= examEndDateTime && exam.Status != "ongoing")
            {
                exam.Status = "ongoing";
                exam.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
            else if (now > examEndDateTime && exam.Status != "completed")
            {
                exam.Status = "completed";
                exam.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
        }

        private async Task<int?> CalculateRankAsync(Guid schoolId, Guid examId, Guid studentId, string subject)
        {
            // Get all results for this exam and subject
            var allResults = await _context.ExamResults
                .Where(r => r.SchoolId == schoolId && r.ExamId == examId && r.Subject == subject)
                .OrderByDescending(r => r.MarksObtained)
                .ThenBy(r => r.CreatedAt)
                .ToListAsync();

            if (!allResults.Any()) return null;

            // Find the rank of this student
            var studentResult = allResults.FirstOrDefault(r => r.StudentId == studentId);
            if (studentResult == null) return null;

            return allResults.IndexOf(studentResult) + 1;
        }

        private string CalculateGrade(decimal percentage)
        {
            // Legacy fallback — use GetBoardGradeAsync for board-aware grading in async callers
            if (percentage >= 91) return "A1";
            if (percentage >= 81) return "A2";
            if (percentage >= 71) return "B1";
            if (percentage >= 61) return "B2";
            if (percentage >= 51) return "C1";
            if (percentage >= 41) return "C2";
            if (percentage >= 33) return "D";
            if (percentage >= 21) return "E1";
            return "E2";
        }
        
        public async Task<bool> FinalizeExamResultsAsync(Guid schoolId, Guid examId)
        {
            try
            {
                // 1. Verify exam exists and is in completed state
                var exam = await _context.Examinations
                    .FirstOrDefaultAsync(e => e.Id == examId && e.SchoolId == schoolId);
                
                if (exam == null)
                    throw new KeyNotFoundException("Exam not found");
                
                if (exam.Status == "results_published")
                    throw new InvalidOperationException("Results already finalized for this exam");
                
                if (exam.Status == "cancelled")
                    throw new InvalidOperationException("Cannot finalize results for a cancelled exam");
                
                if (exam.Status == "scheduled")
                    throw new InvalidOperationException("Cannot finalize results for an exam that has not been conducted yet");

                // 2. Get all results for this exam, ordered by marks (descending)
                var results = await _context.ExamResults
                    .Where(r => r.ExamId == examId && r.SchoolId == schoolId)
                    .OrderByDescending(r => r.MarksObtained)
                    .ThenBy(r => r.StudentId) // Tiebreaker
                    .ToListAsync();

                if (results.Count == 0)
                {
                    _logger.LogWarning("No results found for exam {ExamId}. Cannot finalize.", examId);
                    return false;
                }

                // 3. Calculate and assign ranks
                int currentRank = 1;
                decimal? previousMarks = null;
                int studentsWithSameMarks = 0;

                foreach (var result in results)
                {
                    if (previousMarks.HasValue && result.MarksObtained == previousMarks.Value)
                    {
                        // Same marks = same rank
                        studentsWithSameMarks++;
                    }
                    else
                    {
                        // Different marks = new rank
                        currentRank += studentsWithSameMarks;
                        studentsWithSameMarks = 1;
                    }

                    // Store rank in Remarks field (append if exists)
                    var remarks = result.Remarks ?? "";
                    if (remarks.Contains("RANK:"))
                    {
                        // Update existing rank
                        var parts = remarks.Split('|');
                        for (int i = 0; i < parts.Length; i++)
                        {
                            if (parts[i].StartsWith("RANK:"))
                                parts[i] = $"RANK:{currentRank}";
                        }
                        result.Remarks = string.Join("|", parts);
                    }
                    else
                    {
                        // Add new rank
                        result.Remarks = string.IsNullOrEmpty(remarks) 
                            ? $"RANK:{currentRank}" 
                            : $"{remarks}|RANK:{currentRank}";
                    }

                    result.UpdatedAt = DateTime.UtcNow;
                    previousMarks = result.MarksObtained;
                }

                // 4. Mark exam as "results_published"
                exam.Status = "results_published";
                exam.UpdatedAt = DateTime.UtcNow;

                // 5. Save all changes
                await _context.SaveChangesAsync();
                
                _logger.LogInformation("Finalized results for exam {ExamId}. Total students: {Count}, Ranks assigned.", 
                    examId, results.Count);

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to finalize results for exam {ExamId}", examId);
                throw;
            }
        }

        private static string ExtractAcademicYearFromDescription(string? description)
        {
            if (string.IsNullOrWhiteSpace(description) || !description.Contains("AY:"))
                return string.Empty;

            return description.Split("AY:")[1].Split('|')[0].Trim();
        }

        private static string? ExtractExamTypeFromDescription(string? description)
        {
            if (string.IsNullOrWhiteSpace(description) || !description.Contains("ETYPE:"))
                return null;

            return description.Split("ETYPE:")[1].Split('|')[0].Trim();
        }

        private static string DeriveExamType(string examName)
        {
            if (examName.Contains("Unit", StringComparison.OrdinalIgnoreCase)) return "unit_test";
            if (examName.Contains("Mid", StringComparison.OrdinalIgnoreCase)) return "mid_term";
            if (examName.Contains("Quarterly", StringComparison.OrdinalIgnoreCase)) return "quarterly";
            if (examName.Contains("Half", StringComparison.OrdinalIgnoreCase)) return "half_yearly";
            if (examName.Contains("Annual", StringComparison.OrdinalIgnoreCase)) return "annual";
            return "practical";
        }

        private static (string Requested, string ShortForm, string LongForm) BuildAcademicYearTokens(string year)
        {
            var requested = CompactYearSeparators(year);
            var parts = requested.Split('-', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (parts.Length != 2)
            {
                return (requested, requested, requested);
            }

            var start = parts[0];
            var end = parts[1];

            var shortForm = requested;
            var longForm = requested;

            if (start.Length == 4 && end.Length == 4)
            {
                shortForm = $"{start}-{end.Substring(2)}";
            }
            else if (start.Length == 4 && end.Length == 2)
            {
                longForm = $"{start}-{start.Substring(0, 2)}{end}";
            }

            return (requested, shortForm, longForm);
        }

        private static string CompactYearSeparators(string year)
        {
            return (year ?? string.Empty).Trim().Replace("/", "-").Replace(" ", string.Empty);
        }
    }

    // ========== ADDITIONAL DTOs ==========

    public class ExamFiltersDto
    {
        public string? SearchTerm { get; set; }
        public string? Class { get; set; }
        public Guid? ClassId { get; set; }
        public string? Subject { get; set; }
        public Guid? SubjectId { get; set; }
        public string? ExamType { get; set; }
        public Guid? ExamTypeId { get; set; }
        public string? Status { get; set; }
        public DateTime? DateFrom { get; set; }
        public DateTime? DateTo { get; set; }
        public string? AcademicYear { get; set; }
        public int? Term { get; set; }
    }

    public class ResultFiltersDto
    {
        public Guid? ExamId { get; set; }
        public Guid? StudentId { get; set; }
        public string? Class { get; set; }
        public string? Section { get; set; }
        public string? Subject { get; set; }
        public string? SearchTerm { get; set; }
    }

    public class GradeDto
    {
        public string Grade { get; set; } = string.Empty;
        public decimal GradePoint { get; set; }
        public decimal Percentage { get; set; }
        public bool IsPassingGrade { get; set; }
    }
}


