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
    public interface IExamSetupService
    {
        // Wizard helpers
        Task<ExamNamePreviewDto> PreviewExamNameAsync(Guid schoolId, Guid? examTypeId, bool isCustomType,
            string? customTypeName, Guid classId, Guid? sectionId, string academicYear);
        Task<List<ClassBoardDto>> GetClassBoardsAsync(Guid schoolId, Guid classId);
        Task<List<ClassSubjectForExamDto>> GetClassSubjectsForExamAsync(
            Guid schoolId, Guid classId, Guid? boardConfigurationId, string? academicYear);

        // ExamSetup CRUD
        Task<PaginatedResponse<ExamSetupBasicDto>> GetExamSetupsAsync(
            Guid schoolId, string? academicYear, Guid? classId, Guid? boardConfigurationId, string? status, int page, int pageSize);
        Task<ExamSetupDetailDto?> GetExamSetupByIdAsync(Guid schoolId, Guid id);
        Task<ExamSetupDetailDto> CreateExamSetupAsync(Guid schoolId, CreateExamSetupDto dto);
        Task<ExamSetupDetailDto> UpdateExamSetupAsync(Guid schoolId, Guid id, CreateExamSetupDto dto);
        Task<bool> DeleteExamSetupAsync(Guid schoolId, Guid id);

        // Marks Entry
        Task<MarksEntrySheetDto> GetMarksEntrySheetAsync(
            Guid schoolId, Guid examSetupId, Guid examSetupSubjectId, string? staffEmail = null);
        Task<BulkOperationResult> SaveBulkMarksAsync(Guid schoolId, BulkMarksEntryDto dto, Guid enteredByUserId, string? staffEmail = null, bool isAdmin = false);

        // Finalize & Publish
        Task<ExamSetupDetailDto> FinalizeAndCalculateGradesAsync(Guid schoolId, Guid examSetupId);
        Task<PublishResultsResponseDto> PublishResultsToParentsAsync(Guid schoolId, Guid examSetupId, Guid publishedByStaffId);

        // Student result summary (for report card / parent portal)
        Task<List<StudentExamResultSummaryDto>> GetStudentResultSummariesAsync(
            Guid schoolId, Guid examSetupId);
        Task<StudentExamResultSummaryDto?> GetStudentResultSummaryAsync(
            Guid schoolId, Guid examSetupId, Guid studentId);

        // Staff view: exam setups where staff is assigned to enter marks
        Task<List<ExamSetupBasicDto>> GetExamSetupsForStaffAsync(Guid schoolId, string userEmail, string? academicYear);

        // Staff grades dashboard
        Task<StaffExamStatsDto> GetStaffExamStatsAsync(Guid schoolId, string userEmail);
        Task<StaffStudentMarksPageDto> GetStaffStudentMarksAsync(Guid schoolId, string userEmail, Guid? classId, Guid? sectionId, int page, int pageSize);

        // Unlock a locked subject so marks can be re-edited (admin only)
        Task UnlockSubjectForEditAsync(Guid schoolId, Guid examSetupId, Guid examSetupSubjectId);

        // Reopen a published exam for re-editing (admin only)
        Task<ExamSetupDetailDto> ReopenForEditingAsync(Guid schoolId, Guid examSetupId);
    }

    public class ExamSetupService : IExamSetupService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<ExamSetupService> _logger;

        public ExamSetupService(AppDbContext context, ILogger<ExamSetupService> logger)
        {
            _context = context;
            _logger = logger;
        }

        // ─────────────────────────────────────────────────────────────────────
        // WIZARD HELPERS
        // ─────────────────────────────────────────────────────────────────────

        public async Task<ExamNamePreviewDto> PreviewExamNameAsync(
            Guid schoolId, Guid? examTypeId, bool isCustomType,
            string? customTypeName, Guid classId, Guid? sectionId, string academicYear)
        {
            string examTypePart;
            if (isCustomType && !string.IsNullOrWhiteSpace(customTypeName))
            {
                examTypePart = customTypeName.Trim();
            }
            else if (examTypeId.HasValue)
            {
                var et = await _context.ExamTypes
                    .FirstOrDefaultAsync(e => e.Id == examTypeId.Value && e.SchoolId == schoolId);
                examTypePart = et?.Name ?? "Exam";
            }
            else
            {
                examTypePart = "Exam";
            }

            var cls = await _context.Classes.FirstOrDefaultAsync(c => c.Id == classId && c.SchoolId == schoolId);
            string classPart = cls?.Name ?? "Class";

            string sectionPart = string.Empty;
            if (sectionId.HasValue)
            {
                var sec = await _context.Sections.FirstOrDefaultAsync(s => s.Id == sectionId.Value && s.SchoolId == schoolId);
                if (sec != null) sectionPart = $" {sec.Name}";
            }

            return new ExamNamePreviewDto
            {
                SuggestedName = $"{examTypePart} {academicYear} – {classPart}{sectionPart}"
            };
        }

        public async Task<List<ClassBoardDto>> GetClassBoardsAsync(Guid schoolId, Guid classId)
        {
            // A class can be linked to a single board via Class.BoardConfigurationId.
            // In schools with multiple boards for the same class name, there would be
            // separate Class rows each with a different BoardConfigurationId.
            // We therefore look at all classes with the same Name in the school:
            var targetClass = await _context.Classes
                .FirstOrDefaultAsync(c => c.Id == classId && c.SchoolId == schoolId);

            if (targetClass == null) return new List<ClassBoardDto>();

            // Find all classes in this school with same name (different boards)
            var sameNameClasses = await _context.Classes
                .Where(c => c.SchoolId == schoolId && c.Name == targetClass.Name && c.BoardConfigurationId.HasValue)
                .Include(c => c.BoardConfig)
                .ToListAsync();

            // Also include board configs from school-board configs for this school
            var result = sameNameClasses
                .Where(c => c.BoardConfig != null)
                .Select(c => new ClassBoardDto
                {
                    BoardConfigurationId = c.BoardConfigurationId!.Value,
                    BoardName = c.BoardConfig!.Name,
                    BoardCode = c.BoardConfig.Code,
                    BoardLevel = c.BoardConfig.BoardLevel
                })
                .DistinctBy(b => b.BoardConfigurationId)
                .ToList();

            return result;
        }

        public async Task<List<ClassSubjectForExamDto>> GetClassSubjectsForExamAsync(
            Guid schoolId, Guid classId, Guid? boardConfigurationId, string? academicYear)
        {
            var query = _context.ClassSubjects
                .Where(cs => cs.SchoolId == schoolId && cs.ClassId == classId && cs.Status == "active")
                .Include(cs => cs.Subject)
                .Include(cs => cs.Teacher)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(academicYear))
                query = query.Where(cs => cs.AcademicYear == null || cs.AcademicYear == academicYear);

            var classSubjects = await query.ToListAsync();

            return classSubjects
                .Where(cs => cs.Subject != null)
                .Select(cs => new ClassSubjectForExamDto
                {
                    SubjectId = cs.SubjectId,
                    SubjectName = cs.Subject!.Name,
                    SubjectCode = cs.Subject.Code,
                    IsElective = !cs.IsMandatory,
                    DefaultMaxMarks = cs.MaxMarks ?? 100,
                    DefaultTheoryMarks = cs.TheoryMaxMarks ?? 0,
                    DefaultPracticalMarks = cs.PracticalMaxMarks ?? 0,
                    DefaultStaffId = cs.TeacherId,
                    DefaultStaffName = cs.Teacher != null
                        ? $"{cs.Teacher.FirstName} {cs.Teacher.LastName}".Trim()
                        : null
                })
                .OrderBy(s => s.IsElective)
                .ThenBy(s => s.SubjectName)
                .ToList();
        }

        // ─────────────────────────────────────────────────────────────────────
        // EXAM SETUP CRUD
        // ─────────────────────────────────────────────────────────────────────

        public async Task<PaginatedResponse<ExamSetupBasicDto>> GetExamSetupsAsync(
            Guid schoolId, string? academicYear, Guid? classId, Guid? boardConfigurationId, string? status, int page, int pageSize)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 20;
            if (pageSize > 100) pageSize = 100;

            var query = _context.ExamSetups
                .Where(e => e.SchoolId == schoolId)
                .Include(e => e.ClassRef)
                .Include(e => e.SectionRef)
                .Include(e => e.ExamTypeRef)
                .Include(e => e.BoardConfig)
                .Include(e => e.Subjects)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(academicYear))
                query = query.Where(e => e.AcademicYear == academicYear);
            if (classId.HasValue)
                query = query.Where(e => e.ClassId == classId.Value);
            if (boardConfigurationId.HasValue)
                query = query.Where(e => e.BoardConfigurationId == boardConfigurationId.Value);
            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(e => e.Status == status);

            var total = await query.CountAsync();
            var items = await query
                .OrderByDescending(e => e.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new PaginatedResponse<ExamSetupBasicDto>
            {
                Items = items.Select(e => new ExamSetupBasicDto
                {
                    Id                  = e.Id,
                    Name                = e.Name,
                    ExamType            = e.IsCustomType ? (e.CustomTypeName ?? "Custom") : (e.ExamTypeRef?.Name ?? ""),
                    IsCustomType        = e.IsCustomType,
                    CustomTypeName      = e.CustomTypeName,
                    ClassId             = e.ClassId,
                    ClassName           = e.ClassRef?.Name ?? "",
                    SectionId           = e.SectionId,
                    SectionName         = e.SectionRef?.Name,
                    BoardConfigurationId = e.BoardConfigurationId,
                    BoardName           = e.BoardConfig?.Name,
                    AcademicYear        = e.AcademicYear,
                    Term                = e.Term,
                    StartDate           = e.StartDate,
                    EndDate             = e.EndDate,
                    Status              = e.Status,
                    SubjectCount        = e.Subjects.Count(s => !s.IsDeleted),
                    MarksEnteredCount   = e.Subjects.Count(s => !s.IsDeleted && (s.Status == "marks_entry" || s.Status == "locked")),
                    CreatedAt           = e.CreatedAt,
                }).ToList(),
                TotalCount = total,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling((double)total / pageSize)
            };
        }

        public async Task<ExamSetupDetailDto?> GetExamSetupByIdAsync(Guid schoolId, Guid id)
        {
            var entity = await _context.ExamSetups
                .Where(e => e.SchoolId == schoolId && e.Id == id)
                .Include(e => e.ClassRef)
                .Include(e => e.SectionRef)
                .Include(e => e.ExamTypeRef)
                .Include(e => e.BoardConfig)
                .Include(e => e.Subjects)
                    .ThenInclude(s => s.Subject)
                .Include(e => e.Subjects)
                    .ThenInclude(s => s.AssignedStaff)
                .FirstOrDefaultAsync();

            if (entity == null) return null;

            return new ExamSetupDetailDto
            {
                Id                  = entity.Id,
                Name                = entity.Name,
                ExamType            = entity.IsCustomType ? (entity.CustomTypeName ?? "Custom") : (entity.ExamTypeRef?.Name ?? ""),
                IsCustomType        = entity.IsCustomType,
                CustomTypeName      = entity.CustomTypeName,
                ClassId             = entity.ClassId,
                ClassName           = entity.ClassRef?.Name ?? "",
                SectionId           = entity.SectionId,
                SectionName         = entity.SectionRef?.Name,
                BoardConfigurationId = entity.BoardConfigurationId,
                BoardName           = entity.BoardConfig?.Name,
                AcademicYear        = entity.AcademicYear,
                Term                = entity.Term,
                StartDate           = entity.StartDate,
                EndDate             = entity.EndDate,
                Status              = entity.Status,
                SubjectCount        = entity.Subjects.Count(s => !s.IsDeleted),
                MarksEnteredCount   = entity.Subjects.Count(s => !s.IsDeleted && (s.Status == "marks_entry" || s.Status == "locked")),
                CreatedAt           = entity.CreatedAt,
                PublishedAt         = entity.PublishedAt,
                Subjects            = entity.Subjects
                    .Where(s => !s.IsDeleted)
                    .OrderBy(s => s.SubjectOrder)
                    .Select(s => new ExamSetupSubjectDto
                    {
                        Id                = s.Id,
                        SubjectId         = s.SubjectId,
                        SubjectName       = s.Subject?.Name ?? "",
                        SubjectCode       = s.Subject?.Code ?? "",
                        IsElective        = s.IsElective,
                        MaxTheoryMarks    = s.MaxTheoryMarks,
                        MaxPracticalMarks = s.MaxPracticalMarks,
                        MaxInternalMarks  = s.MaxInternalMarks,
                        MaxTotalMarks     = s.MaxTotalMarks,
                        PassingMarks      = s.PassingMarks,
                        AssignedStaffId   = s.AssignedStaffId,
                        AssignedStaffName = s.AssignedStaff != null
                            ? $"{s.AssignedStaff.FirstName} {s.AssignedStaff.LastName}"
                            : null,
                        ExamDate   = s.ExamDate,
                        StartTime  = s.StartTime,
                        EndTime    = s.EndTime,
                        Venue      = s.Venue,
                        SubjectOrder = s.SubjectOrder,
                        Status     = s.Status,
                    }).ToList()
            };
        }

        public async Task<ExamSetupDetailDto> CreateExamSetupAsync(Guid schoolId, CreateExamSetupDto dto)
        {
            // Resolve exam name
            var namePreview = await PreviewExamNameAsync(schoolId, dto.ExamTypeId, dto.IsCustomType,
                dto.CustomTypeName, dto.ClassId, dto.SectionId, dto.AcademicYear);

            var entity = new ExamSetup
            {
                SchoolId = schoolId,
                Name = namePreview.SuggestedName,
                ExamTypeId = dto.ExamTypeId,
                IsCustomType = dto.IsCustomType,
                CustomTypeName = dto.CustomTypeName,
                ClassId = dto.ClassId,
                SectionId = dto.SectionId,
                BoardConfigurationId = dto.BoardConfigurationId,
                AcademicYear = dto.AcademicYear,
                Term = dto.Term,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                Status = "draft"
            };

            _context.ExamSetups.Add(entity);
            await _context.SaveChangesAsync();

            // Add subjects
            int order = 0;
            foreach (var subDto in dto.Subjects.OrderBy(s => s.SubjectOrder))
            {
                var totalMax = subDto.MaxTheoryMarks + subDto.MaxPracticalMarks + subDto.MaxInternalMarks;
                if (totalMax == 0) totalMax = 100;

                var subject = new ExamSetupSubject
                {
                    SchoolId = schoolId,
                    ExamSetupId = entity.Id,
                    SubjectId = subDto.SubjectId,
                    IsElective = subDto.IsElective,
                    MaxTheoryMarks = subDto.MaxTheoryMarks,
                    MaxPracticalMarks = subDto.MaxPracticalMarks,
                    MaxInternalMarks = subDto.MaxInternalMarks,
                    MaxTotalMarks = totalMax,
                    PassingMarks = subDto.PassingMarks,
                    AssignedStaffId = subDto.AssignedStaffId,
                    ExamDate = subDto.ExamDate,
                    StartTime = subDto.StartTime,
                    EndTime = subDto.EndTime,
                    Venue = subDto.Venue,
                    SubjectOrder = order++,
                    Status = "pending"
                };
                _context.ExamSetupSubjects.Add(subject);
            }

            await _context.SaveChangesAsync();
            return (await GetExamSetupByIdAsync(schoolId, entity.Id))!;
        }

        public async Task<ExamSetupDetailDto> UpdateExamSetupAsync(Guid schoolId, Guid id, CreateExamSetupDto dto)
        {
            var entity = await _context.ExamSetups
                .Include(e => e.Subjects)
                .FirstOrDefaultAsync(e => e.SchoolId == schoolId && e.Id == id)
                ?? throw new KeyNotFoundException("Exam setup not found.");

            if (entity.Status is "finalized" or "published")
                throw new InvalidOperationException("Cannot edit a finalized or published exam setup.");

            // Re-generate name
            var namePreview = await PreviewExamNameAsync(schoolId, dto.ExamTypeId, dto.IsCustomType,
                dto.CustomTypeName, dto.ClassId, dto.SectionId, dto.AcademicYear);

            entity.Name = namePreview.SuggestedName;
            entity.ExamTypeId = dto.ExamTypeId;
            entity.IsCustomType = dto.IsCustomType;
            entity.CustomTypeName = dto.CustomTypeName;
            entity.ClassId = dto.ClassId;
            entity.SectionId = dto.SectionId;
            entity.BoardConfigurationId = dto.BoardConfigurationId;
            entity.AcademicYear = dto.AcademicYear;
            entity.Term = dto.Term;
            entity.StartDate = dto.StartDate;
            entity.EndDate = dto.EndDate;

            // Replace subjects
            _context.ExamSetupSubjects.RemoveRange(entity.Subjects);

            int order = 0;
            foreach (var subDto in dto.Subjects.OrderBy(s => s.SubjectOrder))
            {
                var totalMax = subDto.MaxTheoryMarks + subDto.MaxPracticalMarks + subDto.MaxInternalMarks;
                if (totalMax == 0) totalMax = 100;

                _context.ExamSetupSubjects.Add(new ExamSetupSubject
                {
                    SchoolId = schoolId,
                    ExamSetupId = entity.Id,
                    SubjectId = subDto.SubjectId,
                    IsElective = subDto.IsElective,
                    MaxTheoryMarks = subDto.MaxTheoryMarks,
                    MaxPracticalMarks = subDto.MaxPracticalMarks,
                    MaxInternalMarks = subDto.MaxInternalMarks,
                    MaxTotalMarks = totalMax,
                    PassingMarks = subDto.PassingMarks,
                    AssignedStaffId = subDto.AssignedStaffId,
                    ExamDate = subDto.ExamDate,
                    StartTime = subDto.StartTime,
                    EndTime = subDto.EndTime,
                    Venue = subDto.Venue,
                    SubjectOrder = order++,
                    Status = "pending"
                });
            }

            await _context.SaveChangesAsync();
            return (await GetExamSetupByIdAsync(schoolId, entity.Id))!;
        }

        public async Task<bool> DeleteExamSetupAsync(Guid schoolId, Guid id)
        {
            var entity = await _context.ExamSetups
                .Include(e => e.Subjects)
                    .ThenInclude(s => s.MarksEntries)
                .FirstOrDefaultAsync(e => e.SchoolId == schoolId && e.Id == id);

            if (entity == null) return false;

            if (entity.Status is "published")
                throw new InvalidOperationException("Cannot delete a published exam setup.");

            // Remove marks entries, then subjects, then setup
            foreach (var sub in entity.Subjects)
                _context.ExamMarksEntries.RemoveRange(sub.MarksEntries);

            _context.ExamSetupSubjects.RemoveRange(entity.Subjects);
            _context.ExamSetups.Remove(entity);
            await _context.SaveChangesAsync();
            return true;
        }

        // ─────────────────────────────────────────────────────────────────────
        // MARKS ENTRY
        // ─────────────────────────────────────────────────────────────────────

        public async Task<MarksEntrySheetDto> GetMarksEntrySheetAsync(
            Guid schoolId, Guid examSetupId, Guid examSetupSubjectId, string? staffEmail = null)
        {
            var examSetup = await _context.ExamSetups
                .Where(e => e.SchoolId == schoolId && e.Id == examSetupId)
                .Include(e => e.Subjects.Where(s => s.Id == examSetupSubjectId))
                    .ThenInclude(s => s.Subject)
                .FirstOrDefaultAsync()
                ?? throw new KeyNotFoundException("Exam setup not found.");

            var subject = examSetup.Subjects.FirstOrDefault(s => s.Id == examSetupSubjectId)
                ?? throw new KeyNotFoundException("Subject not found in exam setup.");

            // Verify staff access (Option D): class teacher → all subjects; subject-assigned → own subject only
            if (!string.IsNullOrWhiteSpace(staffEmail))
            {
                var staffMemberId = await _context.StaffMembers
                    .Where(s => s.Email == staffEmail && s.SchoolId == schoolId && !s.IsDeleted)
                    .Select(s => (Guid?)s.Id)
                    .FirstOrDefaultAsync();

                if (!staffMemberId.HasValue)
                    throw new UnauthorizedAccessException("Staff member not found for this account.");

                // Allow if explicitly assigned to this subject
                bool isExplicitlyAssigned = subject.AssignedStaffId.HasValue
                    && subject.AssignedStaffId == staffMemberId;

                if (!isExplicitlyAssigned)
                {
                    // Allow only if they are the class teacher for this exam's class
                    var isClassTeacher = await _context.TeacherAssignments
                        .AnyAsync(ta => ta.StaffId == staffMemberId
                            && ta.ClassId == examSetup.ClassId
                            && ta.IsClassTeacher
                            && ta.SchoolId == schoolId
                            && ta.Status == "active" && !ta.IsDeleted);

                    if (!isClassTeacher)
                        throw new UnauthorizedAccessException("You are not assigned to enter marks for this subject.");
                }
            }

            // Resolve AcademicYear name to ID for a clean EF query
            var ayId = await _context.AcademicYears
                .Where(ay => ay.SchoolId == schoolId && ay.Name == examSetup.AcademicYear)
                .Select(ay => ay.Id)
                .FirstOrDefaultAsync();

            // Get enrolled students for this class/section/year
            var enrolledStudentIds = await _context.StudentEnrollments
                .Where(se => se.SchoolId == schoolId
                    && se.ClassId == examSetup.ClassId
                    && (examSetup.SectionId == null || se.SectionId == examSetup.SectionId)
                    && (ayId == Guid.Empty || se.AcademicYearId == ayId)
                    && se.Status == "active")
                .Select(se => se.StudentId)
                .ToListAsync();

            var students = await _context.Students
                .Where(s => enrolledStudentIds.Contains(s.Id))
                .OrderBy(s => s.RollNumber)
                .ToListAsync();

            // Get existing marks entries
            var existingEntries = await _context.ExamMarksEntries
                .Where(m => m.ExamSetupId == examSetupId && m.ExamSetupSubjectId == examSetupSubjectId)
                .ToDictionaryAsync(m => m.StudentId);

            var rows = students.Select(s =>
            {
                existingEntries.TryGetValue(s.Id, out var entry);
                return new StudentMarksRowDto
                {
                    StudentId = s.Id,
                    StudentName = !string.IsNullOrWhiteSpace(s.Name) ? s.Name
                        : $"{s.FirstName} {s.LastName}".Trim(),
                    RollNumber = s.RollNumber,
                    AdmissionNumber = s.AdmissionNumber,
                    MarksEntryId = entry?.Id,
                    TheoryMarks = entry?.TheoryMarks,
                    PracticalMarks = entry?.PracticalMarks,
                    InternalMarks = entry?.InternalMarks,
                    ObtainedMarks = entry?.ObtainedMarks,
                    IsAbsent = entry?.IsAbsent ?? false,
                    Grade = entry?.Grade,
                    Percentage = entry?.Percentage,
                    IsPass = entry?.IsPass ?? false,
                    Remarks = entry?.Remarks,
                    Status = entry?.Status ?? "draft"
                };
            }).ToList();

            return new MarksEntrySheetDto
            {
                ExamSetupId = examSetupId,
                ExamSetupSubjectId = examSetupSubjectId,
                ExamName = examSetup.Name,
                SubjectName = subject.Subject?.Name ?? string.Empty,
                SubjectCode = subject.Subject?.Code,
                MaxTheoryMarks = subject.MaxTheoryMarks,
                MaxPracticalMarks = subject.MaxPracticalMarks,
                MaxInternalMarks = subject.MaxInternalMarks,
                MaxTotalMarks = subject.MaxTotalMarks,
                PassingMarks = subject.PassingMarks,
                IsLocked = subject.Status == "locked",
                Status = subject.Status,
                Rows = rows
            };
        }

        public async Task<BulkOperationResult> SaveBulkMarksAsync(
            Guid schoolId, BulkMarksEntryDto dto, Guid enteredByUserId, string? staffEmail = null, bool isAdmin = false)
        {
            var subject = await _context.ExamSetupSubjects
                .Include(s => s.ExamSetup)
                .FirstOrDefaultAsync(s => s.Id == dto.ExamSetupSubjectId
                    && s.ExamSetupId == dto.ExamSetupId
                    && s.SchoolId == schoolId)
                ?? throw new KeyNotFoundException("Exam setup subject not found.");

            if (subject.Status == "locked")
                throw new InvalidOperationException("Marks are locked for this subject.");

            // Resolve email → StaffMember.Id for access check and FK-safe audit field
            Guid? resolvedStaffId = null;
            if (!string.IsNullOrWhiteSpace(staffEmail))
            {
                resolvedStaffId = await _context.StaffMembers
                    .Where(s => s.Email == staffEmail && s.SchoolId == schoolId && !s.IsDeleted)
                    .Select(s => (Guid?)s.Id)
                    .FirstOrDefaultAsync();
            }

            // Validate staff access (Option D): class teacher → all subjects; subject-assigned → own subject only
            if (!isAdmin && resolvedStaffId.HasValue)
            {
                // Allow if explicitly assigned to this subject
                bool isExplicitlyAssigned = subject.AssignedStaffId.HasValue
                    && subject.AssignedStaffId == resolvedStaffId;

                if (!isExplicitlyAssigned)
                {
                    // Allow only if they are the class teacher for this exam's class
                    var isClassTeacher = await _context.TeacherAssignments
                        .AnyAsync(ta => ta.StaffId == resolvedStaffId
                            && ta.ClassId == subject.ExamSetup!.ClassId
                            && ta.IsClassTeacher
                            && ta.SchoolId == schoolId
                            && ta.Status == "active" && !ta.IsDeleted);

                    if (!isClassTeacher)
                        throw new UnauthorizedAccessException("You are not assigned to enter marks for this subject.");
                }
            }

            // EnteredByStaffId must reference StaffMembers FK — use resolved staff ID,
            // or null for admins (who are UserLogins without a StaffMember record)
            var enteredByStaffId = resolvedStaffId;

            var successCount = 0;
            var errors = new List<string>();
            var now = DateTime.UtcNow;

            foreach (var entry in dto.Entries)
            {
                try
                {
                    var obtained = (entry.TheoryMarks ?? 0)
                        + (entry.PracticalMarks ?? 0)
                        + (entry.InternalMarks ?? 0);

                    if (!entry.IsAbsent)
                    {
                        if (subject.MaxTheoryMarks > 0 && entry.TheoryMarks.HasValue
                            && entry.TheoryMarks > subject.MaxTheoryMarks)
                        {
                            errors.Add($"Student {entry.StudentId}: Theory marks exceed maximum ({subject.MaxTheoryMarks}).");
                            continue;
                        }
                        if (subject.MaxPracticalMarks > 0 && entry.PracticalMarks.HasValue
                            && entry.PracticalMarks > subject.MaxPracticalMarks)
                        {
                            errors.Add($"Student {entry.StudentId}: Practical marks exceed maximum ({subject.MaxPracticalMarks}).");
                            continue;
                        }
                        if (obtained > subject.MaxTotalMarks)
                        {
                            errors.Add($"Student {entry.StudentId}: Total marks ({obtained}) exceed maximum ({subject.MaxTotalMarks}).");
                            continue;
                        }
                    }

                    var existing = await _context.ExamMarksEntries
                        .FirstOrDefaultAsync(m => m.ExamSetupId == dto.ExamSetupId
                            && m.ExamSetupSubjectId == dto.ExamSetupSubjectId
                            && m.StudentId == entry.StudentId);

                    if (existing == null)
                    {
                        existing = new ExamMarksEntry
                        {
                            SchoolId = schoolId,
                            ExamSetupId = dto.ExamSetupId,
                            ExamSetupSubjectId = dto.ExamSetupSubjectId,
                            StudentId = entry.StudentId,
                            EnteredByStaffId = enteredByStaffId,
                            EnteredAt = now
                        };
                        _context.ExamMarksEntries.Add(existing);
                    }

                    existing.TheoryMarks = entry.IsAbsent ? null : entry.TheoryMarks;
                    existing.PracticalMarks = entry.IsAbsent ? null : entry.PracticalMarks;
                    existing.InternalMarks = entry.IsAbsent ? null : entry.InternalMarks;
                    existing.ObtainedMarks = entry.IsAbsent ? 0 : obtained;
                    existing.IsAbsent = entry.IsAbsent;
                    existing.Remarks = entry.Remarks;
                    existing.EnteredByStaffId = enteredByStaffId;
                    existing.EnteredAt = now;
                    existing.Status = "submitted";

                    successCount++;
                }
                catch (Exception ex)
                {
                    errors.Add($"Student {entry.StudentId}: {ex.Message}");
                }
            }

            // Mark subject as marks_entry if any were saved
            if (successCount > 0)
                subject.Status = "marks_entry";

            if (subject.ExamSetup != null && subject.ExamSetup.Status == "draft")
                subject.ExamSetup.Status = "marks_entry";

            await _context.SaveChangesAsync();

            return new BulkOperationResult
            {
                SuccessCount = successCount,
                FailureCount = errors.Count,
                Errors = errors
            };
        }

        // ─────────────────────────────────────────────────────────────────────
        // FINALIZE & PUBLISH
        // ─────────────────────────────────────────────────────────────────────

        public async Task<ExamSetupDetailDto> FinalizeAndCalculateGradesAsync(Guid schoolId, Guid examSetupId)
        {
            var setup = await _context.ExamSetups
                .Where(e => e.SchoolId == schoolId && e.Id == examSetupId)
                .Include(e => e.Subjects)
                    .ThenInclude(s => s.MarksEntries)
                .FirstOrDefaultAsync()
                ?? throw new KeyNotFoundException("Exam setup not found.");

            if (setup.Status == "published")
                throw new InvalidOperationException("Exam results already published.");

            // Resolve grading policy: class policy → board → school default
            var gradeScale = await ResolveGradeScaleAsync(schoolId, setup.ClassId, setup.BoardConfigurationId);

            foreach (var subject in setup.Subjects)
            {
                foreach (var entry in subject.MarksEntries)
                {
                    if (entry.IsAbsent)
                    {
                        entry.Grade = "AB";
                        entry.GradePoint = 0;
                        entry.Percentage = 0;
                        entry.IsPass = false;
                        entry.Status = "submitted";
                        continue;
                    }

                    var pct = subject.MaxTotalMarks > 0
                        ? Math.Round(entry.ObtainedMarks / subject.MaxTotalMarks * 100, 2)
                        : 0;

                    entry.Percentage = pct;
                    var (grade, gradePoint) = ResolveGradeFromScale(gradeScale, pct);
                    entry.Grade = grade;
                    entry.GradePoint = gradePoint;
                    entry.IsPass = entry.ObtainedMarks >= subject.PassingMarks;
                    entry.Status = "submitted";
                }

                subject.Status = "locked";
            }

            setup.Status = "finalized";
            await _context.SaveChangesAsync();

            return (await GetExamSetupByIdAsync(schoolId, examSetupId))!;
        }

        public async Task<PublishResultsResponseDto> PublishResultsToParentsAsync(
            Guid schoolId, Guid examSetupId, Guid publishedByStaffId)
        {
            var setup = await _context.ExamSetups
                .Where(e => e.SchoolId == schoolId && e.Id == examSetupId)
                .Include(e => e.Subjects)
                    .ThenInclude(s => s.MarksEntries)
                .FirstOrDefaultAsync()
                ?? throw new KeyNotFoundException("Exam setup not found.");

            if (setup.Status != "finalized")
                throw new InvalidOperationException("Exam must be finalized before publishing. Run 'Calculate Grades' first.");

            // Get all students with entries
            var studentIds = setup.Subjects
                .SelectMany(s => s.MarksEntries.Select(m => m.StudentId))
                .Distinct()
                .ToList();

            // Generate a ReportCard per student
            int reportCardsGenerated = 0;
            foreach (var studentId in studentIds)
            {
                var subjectResults = new List<SubjectResultDto>();
                decimal totalObtained = 0, totalMax = 0;

                foreach (var subject in setup.Subjects)
                {
                    var entry = subject.MarksEntries.FirstOrDefault(m => m.StudentId == studentId);
                    if (entry == null) continue;

                    subjectResults.Add(new SubjectResultDto
                    {
                        Subject = subject.Subject?.Name ?? string.Empty,
                        TheoryMarks = entry.TheoryMarks,
                        PracticalMarks = entry.PracticalMarks,
                        TotalMarks = entry.ObtainedMarks,
                        MaxMarks = subject.MaxTotalMarks,
                        Grade = entry.Grade ?? string.Empty,
                        GradePoint = entry.GradePoint ?? 0
                    });

                    totalObtained += entry.ObtainedMarks;
                    totalMax += subject.MaxTotalMarks;
                }

                var pct = totalMax > 0 ? Math.Round(totalObtained / totalMax * 100, 2) : 0;
                var gradeScale = await ResolveGradeScaleAsync(schoolId, setup.ClassId, setup.BoardConfigurationId);
                var (overallGrade, cgpa) = ResolveGradeFromScale(gradeScale, pct);

                // Update or create ReportCard
                var existingCard = await _context.ReportCards
                    .FirstOrDefaultAsync(r => r.SchoolId == schoolId
                        && r.StudentId == studentId
                        && r.AcademicYear == setup.AcademicYear
                        && r.Term == (setup.Term == 0 ? "Annual" : $"Term {setup.Term}"));

                if (existingCard == null)
                {
                    _context.ReportCards.Add(new ReportCard
                    {
                        SchoolId = schoolId,
                        StudentId = studentId,
                        ExamSetupId = setup.Id,
                        AcademicYear = setup.AcademicYear,
                        Term = setup.Term == 0 ? "Annual" : $"Term {setup.Term}",
                        TotalMarks = totalMax,
                        ObtainedMarks = totalObtained,
                        Percentage = pct,
                        OverallGrade = overallGrade,
                        CGPA = cgpa,
                        Status = pct >= 35 ? "Pass" : "Fail",
                        IssueDate = DateTime.UtcNow
                    });
                }
                else
                {
                    existingCard.TotalMarks = totalMax;
                    existingCard.ObtainedMarks = totalObtained;
                    existingCard.Percentage = pct;
                    existingCard.OverallGrade = overallGrade;
                    existingCard.CGPA = cgpa;
                    existingCard.Status = pct >= 35 ? "Pass" : "Fail";
                    existingCard.IssueDate = DateTime.UtcNow;
                    existingCard.ExamSetupId = setup.Id;
                }

                reportCardsGenerated++;

                // Notify parents via Notification entity
                // Path 1 (legacy): StudentGuardians email → UserLogins
                var guardianEmails = await _context.StudentGuardians
                    .Where(sg => sg.StudentId == studentId && sg.SchoolId == schoolId && sg.Email != null)
                    .Select(sg => sg.Email!.ToLower())
                    .Distinct()
                    .ToListAsync();

                var legacyParentIds = guardianEmails.Any()
                    ? await _context.UserLogins
                        .Where(ul => ul.SchoolId == schoolId && guardianEmails.Contains(ul.Email.ToLower()))
                        .Select(ul => ul.Id)
                        .Distinct()
                        .ToListAsync()
                    : new List<Guid>();

                // Path 2 (new): GuardianStudents → Guardian.UserLoginId
                var newParentIds = await _context.GuardianStudents
                    .Where(gs => gs.StudentId == studentId)
                    .Include(gs => gs.Guardian)
                    .Where(gs => gs.Guardian != null && gs.Guardian.UserLoginId != null)
                    .Select(gs => gs.Guardian!.UserLoginId!.Value)
                    .Distinct()
                    .ToListAsync();

                var allParentIds = legacyParentIds.Union(newParentIds).Distinct().ToList();

                foreach (var parentUserId in allParentIds)
                {
                    _context.Notifications.Add(new Notification
                    {
                        SchoolId = schoolId,
                        RecipientId = parentUserId,
                        RecipientType = "Parent",
                        Title = "Exam Results Published",
                        Content = $"Results for {setup.Name} have been published. Login to view your child's report card.",
                        Type = "Exam",
                        ReferenceId = setup.Id,
                        ReferenceType = "ExamSetup",
                        ActionUrl = "/parent-marks",
                        StudentId = studentId,
                    });
                }
            }

            // Mark all marks entries as published
            foreach (var subject in setup.Subjects)
                foreach (var entry in subject.MarksEntries)
                    entry.Status = "published";

            setup.Status = "published";
            setup.PublishedAt = DateTime.UtcNow;
            setup.PublishedByStaffId = publishedByStaffId;

            await _context.SaveChangesAsync();

            return new PublishResultsResponseDto
            {
                ExamSetupId = examSetupId,
                StudentsNotified = studentIds.Count,
                ReportCardsGenerated = reportCardsGenerated,
                Message = $"Results published for {studentIds.Count} students. {reportCardsGenerated} report cards generated."
            };
        }

        // ─────────────────────────────────────────────────────────────────────
        // STUDENT RESULT SUMMARIES
        // ─────────────────────────────────────────────────────────────────────

        public async Task<List<StudentExamResultSummaryDto>> GetStudentResultSummariesAsync(
            Guid schoolId, Guid examSetupId)
        {
            var setup = await _context.ExamSetups
                .Where(e => e.SchoolId == schoolId && e.Id == examSetupId)
                .Include(e => e.Subjects)
                    .ThenInclude(s => s.Subject)
                .Include(e => e.Subjects)
                    .ThenInclude(s => s.MarksEntries)
                .FirstOrDefaultAsync()
                ?? throw new KeyNotFoundException("Exam setup not found.");

            var studentIds = setup.Subjects
                .SelectMany(s => s.MarksEntries.Select(m => m.StudentId))
                .Distinct()
                .ToList();

            var students = await _context.Students
                .Where(s => studentIds.Contains(s.Id))
                .ToDictionaryAsync(s => s.Id);

            var result = new List<StudentExamResultSummaryDto>();
            var gradeScale = await ResolveGradeScaleAsync(schoolId, setup.ClassId, setup.BoardConfigurationId);

            foreach (var studentId in studentIds)
            {
                if (!students.TryGetValue(studentId, out var student)) continue;

                var subjectResults = new List<SubjectResultSummaryDto>();
                decimal totalObtained = 0, totalMax = 0;

                foreach (var subject in setup.Subjects.OrderBy(s => s.SubjectOrder))
                {
                    var entry = subject.MarksEntries.FirstOrDefault(m => m.StudentId == studentId);
                    subjectResults.Add(new SubjectResultSummaryDto
                    {
                        SubjectName = subject.Subject?.Name ?? string.Empty,
                        IsElective = subject.IsElective,
                        TheoryMarks = entry?.TheoryMarks,
                        PracticalMarks = entry?.PracticalMarks,
                        InternalMarks = entry?.InternalMarks,
                        ObtainedMarks = entry?.ObtainedMarks ?? 0,
                        MaxMarks = subject.MaxTotalMarks,
                        Percentage = entry?.Percentage ?? 0,
                        Grade = entry?.Grade,
                        GradePoint = entry?.GradePoint,
                        IsAbsent = entry?.IsAbsent ?? false,
                        IsPass = entry?.IsPass ?? false
                    });

                    if (!(entry?.IsAbsent ?? true))
                    {
                        totalObtained += entry!.ObtainedMarks;
                        totalMax += subject.MaxTotalMarks;
                    }
                }

                var pct = totalMax > 0 ? Math.Round(totalObtained / totalMax * 100, 2) : 0;
                var (overallGrade, cgpa) = ResolveGradeFromScale(gradeScale, pct);

                result.Add(new StudentExamResultSummaryDto
                {
                    StudentId = studentId,
                    StudentName = !string.IsNullOrWhiteSpace(student.Name) ? student.Name
                        : $"{student.FirstName} {student.LastName}".Trim(),
                    RollNumber = student.RollNumber,
                    ExamName = setup.Name,
                    AcademicYear = setup.AcademicYear,
                    Subjects = subjectResults,
                    TotalObtained = totalObtained,
                    TotalMax = totalMax,
                    Percentage = pct,
                    OverallGrade = overallGrade,
                    CGPA = cgpa,
                    IsPass = pct >= 35
                });
            }

            // Calculate ranks
            var ranked = result.OrderByDescending(r => r.Percentage).ToList();
            for (int i = 0; i < ranked.Count; i++)
                ranked[i].Rank = i + 1;

            return ranked;
        }

        public async Task<StudentExamResultSummaryDto?> GetStudentResultSummaryAsync(
            Guid schoolId, Guid examSetupId, Guid studentId)
        {
            var all = await GetStudentResultSummariesAsync(schoolId, examSetupId);
            return all.FirstOrDefault(s => s.StudentId == studentId);
        }

        // ─────────────────────────────────────────────────────────────────────
        // STAFF VIEW
        // ─────────────────────────────────────────────────────────────────────

        public async Task<List<ExamSetupBasicDto>> GetExamSetupsForStaffAsync(
            Guid schoolId, string userEmail, string? academicYear)
        {
            if (string.IsNullOrWhiteSpace(userEmail))
                return new List<ExamSetupBasicDto>();

            // Resolve email → StaffMember (same pattern as AcademicsService)
            var staffMember = await _context.StaffMembers
                .Where(s => s.Email == userEmail && s.SchoolId == schoolId && !s.IsDeleted)
                .FirstOrDefaultAsync();

            var resolvedStaffId = staffMember?.Id ?? Guid.Empty;

            // 1. Exam setups where staff is explicitly assigned to at least one subject
            var explicitSetupIds = resolvedStaffId == Guid.Empty
                ? new List<Guid>()
                : await _context.ExamSetupSubjects
                    .Where(s => s.SchoolId == schoolId && s.AssignedStaffId == resolvedStaffId)
                    .Select(s => s.ExamSetupId)
                    .Distinct()
                    .ToListAsync();

            // 2. Classes where this staff is the class teacher (Option D: class teacher sees all exams for their class)
            var staffClassIds = resolvedStaffId == Guid.Empty
                ? new List<Guid>()
                : await _context.TeacherAssignments
                    .Where(ta => ta.StaffId == resolvedStaffId && ta.SchoolId == schoolId
                        && ta.IsClassTeacher
                        && ta.Status == "active" && !ta.IsDeleted)
                    .Select(ta => ta.ClassId)
                    .Distinct()
                    .ToListAsync();

            // Union: explicitly assigned OR teaching the class
            var query = _context.ExamSetups
                .Where(e => e.SchoolId == schoolId
                    && (explicitSetupIds.Contains(e.Id) || staffClassIds.Contains(e.ClassId)))
                .Include(e => e.ClassRef)
                .Include(e => e.SectionRef)
                .Include(e => e.ExamTypeRef)
                .Include(e => e.BoardConfig)
                .Include(e => e.Subjects)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(academicYear))
                query = query.Where(e => e.AcademicYear == academicYear);

            var setups = await query.OrderByDescending(e => e.CreatedAt).ToListAsync();
            return setups.Select(e => new ExamSetupBasicDto
            {
                Id                          = e.Id,
                Name                        = e.Name,
                ExamType                    = e.IsCustomType ? (e.CustomTypeName ?? "Custom") : (e.ExamTypeRef?.Name ?? ""),
                IsCustomType                = e.IsCustomType,
                CustomTypeName              = e.CustomTypeName,
                ClassId                     = e.ClassId,
                ClassName                   = e.ClassRef?.Name ?? "",
                SectionId                   = e.SectionId,
                SectionName                 = e.SectionRef?.Name,
                BoardConfigurationId        = e.BoardConfigurationId,
                BoardName                   = e.BoardConfig?.Name,
                AcademicYear                = e.AcademicYear,
                Term                        = e.Term,
                StartDate                   = e.StartDate,
                EndDate                     = e.EndDate,
                Status                      = e.Status,
                SubjectCount                = e.Subjects.Count(s => !s.IsDeleted),
                MarksEnteredCount           = e.Subjects.Count(s => !s.IsDeleted && (s.Status == "marks_entry" || s.Status == "locked")),
                CreatedAt                   = e.CreatedAt,
                // Staff-specific access info — computed here where resolvedStaffId is known
                IsClassTeacherForThisClass  = staffClassIds.Contains(e.ClassId),
                MyAssignedSubjectIds        = e.Subjects
                    .Where(s => !s.IsDeleted && s.AssignedStaffId == resolvedStaffId)
                    .Select(s => s.Id)
                    .ToList(),
            }).ToList();
        }

        // ─────────────────────────────────────────────────────────────────────
        // STAFF GRADES DASHBOARD — STATS
        // ─────────────────────────────────────────────────────────────────────

        public async Task<StaffExamStatsDto> GetStaffExamStatsAsync(Guid schoolId, string userEmail)
        {
            if (string.IsNullOrWhiteSpace(userEmail))
                return new StaffExamStatsDto();

            var staffMember = await _context.StaffMembers
                .Where(s => s.Email == userEmail && s.SchoolId == schoolId && !s.IsDeleted)
                .FirstOrDefaultAsync();
            var resolvedStaffId = staffMember?.Id ?? Guid.Empty;

            var explicitSetupIds = resolvedStaffId == Guid.Empty
                ? new List<Guid>()
                : await _context.ExamSetupSubjects
                    .Where(s => s.SchoolId == schoolId && s.AssignedStaffId == resolvedStaffId)
                    .Select(s => s.ExamSetupId)
                    .Distinct()
                    .ToListAsync();

            var staffClassIds = resolvedStaffId == Guid.Empty
                ? new List<Guid>()
                : await _context.TeacherAssignments
                    .Where(ta => ta.StaffId == resolvedStaffId && ta.SchoolId == schoolId
                        && ta.IsClassTeacher && ta.Status == "active" && !ta.IsDeleted)
                    .Select(ta => ta.ClassId)
                    .Distinct()
                    .ToListAsync();

            var mySetups = await _context.ExamSetups
                .Where(e => e.SchoolId == schoolId
                    && (explicitSetupIds.Contains(e.Id) || staffClassIds.Contains(e.ClassId)))
                .Select(e => new { e.Id, e.Status })
                .ToListAsync();

            var totalExams = mySetups.Count;
            var publishedExams = mySetups.Count(e => e.Status == "published");
            var mySetupIdList = mySetups.Select(e => e.Id).ToList();

            var publishedEntries = mySetupIdList.Count == 0
                ? new List<(decimal? Percentage, bool IsPass)>()
                : await _context.ExamMarksEntries
                    .Where(em => mySetupIdList.Contains(em.ExamSetupId) && em.Status == "published")
                    .Select(em => new { em.Percentage, em.IsPass })
                    .ToListAsync()
                    .ContinueWith(t => t.Result.Select(x => (x.Percentage, x.IsPass)).ToList());

            var totalEntries = publishedEntries.Count;
            var pctEntries = publishedEntries.Where(e => e.Percentage.HasValue).ToList();
            var avgPct = pctEntries.Count > 0
                ? Math.Round(pctEntries.Average(e => e.Percentage!.Value), 2)
                : 0m;
            var passRate = totalEntries > 0
                ? Math.Round((decimal)publishedEntries.Count(e => e.IsPass) / totalEntries * 100, 2)
                : 0m;

            return new StaffExamStatsDto
            {
                TotalExams = totalExams,
                PublishedExams = publishedExams,
                TotalMarksEntries = totalEntries,
                AveragePercentage = avgPct,
                PassRate = passRate,
            };
        }

        // ─────────────────────────────────────────────────────────────────────
        // STAFF GRADES DASHBOARD — STUDENT MARKS (published only)
        // ─────────────────────────────────────────────────────────────────────

        public async Task<StaffStudentMarksPageDto> GetStaffStudentMarksAsync(
            Guid schoolId, string userEmail, Guid? classId, Guid? sectionId, int page, int pageSize)
        {
            if (string.IsNullOrWhiteSpace(userEmail))
                return new StaffStudentMarksPageDto();

            var staffMember = await _context.StaffMembers
                .Where(s => s.Email == userEmail && s.SchoolId == schoolId && !s.IsDeleted)
                .FirstOrDefaultAsync();
            var resolvedStaffId = staffMember?.Id ?? Guid.Empty;

            if (resolvedStaffId == Guid.Empty)
                return new StaffStudentMarksPageDto();

            // Only subjects this staff is directly assigned to teach
            var assignedSubjects = await _context.ExamSetupSubjects
                .Where(s => s.SchoolId == schoolId && s.AssignedStaffId == resolvedStaffId && !s.IsDeleted)
                .Select(s => new { s.Id, s.ExamSetupId })
                .ToListAsync();

            var assignedSetupIds = assignedSubjects.Select(s => s.ExamSetupId).Distinct().ToList();

            if (assignedSetupIds.Count == 0)
                return new StaffStudentMarksPageDto();

            // Only published exam setups where this staff has assigned subjects
            var mySetupsQuery = _context.ExamSetups
                .Where(e => e.SchoolId == schoolId
                    && e.Status == "published"
                    && assignedSetupIds.Contains(e.Id));

            if (classId.HasValue)
                mySetupsQuery = mySetupsQuery.Where(e => e.ClassId == classId.Value);
            if (sectionId.HasValue)
                mySetupsQuery = mySetupsQuery.Where(e => e.SectionId == sectionId.Value);

            var setups = await mySetupsQuery
                .Select(e => new { e.Id, e.Name, e.ClassId, e.SectionId, e.AcademicYear })
                .ToListAsync();

            // Build class/section lookup dictionaries
            var allClassIds = setups.Select(e => e.ClassId).Distinct().ToList();
            var allSectionIds = setups.Where(e => e.SectionId.HasValue)
                .Select(e => e.SectionId!.Value).Distinct().ToList();

            var classNames = await _context.Classes
                .Where(c => allClassIds.Contains(c.Id))
                .Select(c => new { c.Id, c.Name })
                .ToDictionaryAsync(c => c.Id, c => c.Name);

            var sectionNames = allSectionIds.Count > 0
                ? await _context.Sections
                    .Where(s => allSectionIds.Contains(s.Id))
                    .Select(s => new { s.Id, s.Name })
                    .ToDictionaryAsync(s => s.Id, s => s.Name)
                : new Dictionary<Guid, string>();

            // Build filter options for ALL of staff's published setups (unfiltered, for the dropdown)
            var allMySetups = await _context.ExamSetups
                .Where(e => e.SchoolId == schoolId
                    && e.Status == "published"
                    && assignedSetupIds.Contains(e.Id))
                .Select(e => new { e.ClassId, e.SectionId })
                .ToListAsync();

            var allFilterClassIds = allMySetups.Select(e => e.ClassId).Distinct().ToList();
            var allFilterSectionIds = allMySetups.Where(e => e.SectionId.HasValue)
                .Select(e => e.SectionId!.Value).Distinct().ToList();

            var allClassNamesForFilter = await _context.Classes
                .Where(c => allFilterClassIds.Contains(c.Id))
                .Select(c => new { c.Id, c.Name })
                .ToDictionaryAsync(c => c.Id, c => c.Name);

            var allSectionNamesForFilter = allFilterSectionIds.Count > 0
                ? await _context.Sections
                    .Where(s => allFilterSectionIds.Contains(s.Id))
                    .Select(s => new { s.Id, s.Name })
                    .ToDictionaryAsync(s => s.Id, s => s.Name)
                : new Dictionary<Guid, string>();

            var classOptions = allMySetups
                .GroupBy(e => new { e.ClassId, e.SectionId })
                .Select(g => new ClassSectionFilterOption
                {
                    ClassId = g.Key.ClassId,
                    ClassName = allClassNamesForFilter.GetValueOrDefault(g.Key.ClassId, ""),
                    SectionId = g.Key.SectionId,
                    SectionName = g.Key.SectionId.HasValue
                        ? allSectionNamesForFilter.GetValueOrDefault(g.Key.SectionId.Value)
                        : null,
                })
                .OrderBy(x => x.ClassName).ThenBy(x => x.SectionName)
                .ToList();

            var setupIds = setups.Select(e => e.Id).ToList();
            if (setupIds.Count == 0)
                return new StaffStudentMarksPageDto { Classes = classOptions };

            // Filter to only the staff's assigned subjects within the filtered setups
            var filteredSubjectIds = assignedSubjects
                .Where(s => setupIds.Contains(s.ExamSetupId))
                .Select(s => s.Id)
                .ToList();

            if (filteredSubjectIds.Count == 0)
                return new StaffStudentMarksPageDto { Classes = classOptions };

            var totalCount = await _context.ExamMarksEntries
                .Where(em => filteredSubjectIds.Contains(em.ExamSetupSubjectId) && em.Status == "published")
                .CountAsync();

            var entries = await _context.ExamMarksEntries
                .Where(em => filteredSubjectIds.Contains(em.ExamSetupSubjectId) && em.Status == "published")
                .Include(em => em.Student)
                .Include(em => em.ExamSetupSubject)
                    .ThenInclude(s => s!.Subject)
                .OrderBy(em => em.ExamSetupId)
                .ThenBy(em => em.Student!.RollNumber)
                .ThenBy(em => em.Student!.Name)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var setupMap = setups.ToDictionary(e => e.Id);

            var items = entries.Select(em =>
            {
                var setup = setupMap.GetValueOrDefault(em.ExamSetupId);
                return new StaffStudentMarkDto
                {
                    ExamMarksEntryId    = em.Id,
                    ExamSetupId         = em.ExamSetupId,
                    ExamName            = setup?.Name ?? "",
                    AcademicYear        = setup?.AcademicYear ?? "",
                    ClassId             = setup?.ClassId ?? Guid.Empty,
                    ClassName           = setup != null ? classNames.GetValueOrDefault(setup.ClassId, "") : "",
                    SectionId           = setup?.SectionId,
                    SectionName         = setup?.SectionId.HasValue == true
                        ? sectionNames.GetValueOrDefault(setup.SectionId!.Value)
                        : null,
                    StudentId           = em.StudentId,
                    StudentName         = !string.IsNullOrWhiteSpace(em.Student?.Name)
                        ? em.Student!.Name
                        : $"{em.Student?.FirstName} {em.Student?.LastName}".Trim(),
                    RollNumber          = em.Student?.RollNumber,
                    SubjectId           = em.ExamSetupSubject?.SubjectId ?? Guid.Empty,
                    SubjectName         = em.ExamSetupSubject?.Subject?.Name ?? "",
                    ObtainedMarks       = em.ObtainedMarks,
                    MaxMarks            = em.ExamSetupSubject?.MaxTotalMarks ?? 0,
                    Percentage          = em.Percentage,
                    Grade               = em.Grade,
                    IsPass              = em.IsPass,
                    IsAbsent            = em.IsAbsent,
                };
            }).ToList();

            return new StaffStudentMarksPageDto
            {
                Total    = totalCount,
                Page     = page,
                PageSize = pageSize,
                Items    = items,
                Classes  = classOptions,
            };
        }

        // ─────────────────────────────────────────────────────────────────────
        // UNLOCK SUBJECT FOR EDIT (admin only — reverses a lock)
        // ─────────────────────────────────────────────────────────────────────

        public async Task UnlockSubjectForEditAsync(Guid schoolId, Guid examSetupId, Guid examSetupSubjectId)
        {
            var subject = await _context.ExamSetupSubjects
                .Include(s => s.ExamSetup)
                .FirstOrDefaultAsync(s => s.Id == examSetupSubjectId
                    && s.ExamSetupId == examSetupId
                    && s.SchoolId == schoolId)
                ?? throw new KeyNotFoundException("Subject not found in exam setup.");

            if (subject.Status != "locked")
                throw new InvalidOperationException("Subject is not locked — no unlock needed.");

            subject.Status = "marks_entry";

            // If the parent exam was finalized, revert it back to marks_entry too
            if (subject.ExamSetup != null && subject.ExamSetup.Status == "finalized")
                subject.ExamSetup.Status = "marks_entry";

            await _context.SaveChangesAsync();
        }

        // ─────────────────────────────────────────────────────────────────────
        // REOPEN PUBLISHED EXAM FOR RE-EDITING (admin only)
        // ─────────────────────────────────────────────────────────────────────

        public async Task<ExamSetupDetailDto> ReopenForEditingAsync(Guid schoolId, Guid examSetupId)
        {
            var setup = await _context.ExamSetups
                .Where(e => e.SchoolId == schoolId && e.Id == examSetupId)
                .Include(e => e.Subjects)
                    .ThenInclude(s => s.MarksEntries)
                .FirstOrDefaultAsync()
                ?? throw new KeyNotFoundException("Exam setup not found.");

            if (setup.Status != "published")
                throw new InvalidOperationException("Only published exams can be reopened for editing.");

            // Revert exam and all subject statuses
            setup.Status = "marks_entry";
            setup.PublishedAt = null;

            foreach (var subject in setup.Subjects.Where(s => !s.IsDeleted))
            {
                subject.Status = "marks_entry";
                foreach (var entry in subject.MarksEntries)
                    entry.Status = "submitted";
            }

            await _context.SaveChangesAsync();

            return (await GetExamSetupByIdAsync(schoolId, examSetupId))!;
        }

        // ─────────────────────────────────────────────────────────────────────
        // PRIVATE HELPERS
        // ─────────────────────────────────────────────────────────────────────

        /*
        private static ExamSetupBasicDto MapToBasicDto(ExamSetup e)
        {
            var marksEntered = e.Subjects.Sum(s => s.MarksEntries?.Count ?? 0);
            return new ExamSetupBasicDto
            {
                Id = e.Id,
                Name = e.Name,
                ExamType = e.IsCustomType ? (e.CustomTypeName ?? "Custom") : (e.ExamTypeRef?.Name ?? string.Empty),
                IsCustomType = e.IsCustomType,
                CustomTypeName = e.CustomTypeName,
                ClassName = e.ClassRef?.Name ?? string.Empty,
                ClassId = e.ClassId,
                SectionName = e.SectionRef?.Name,
                SectionId = e.SectionId,
                BoardName = e.BoardConfig?.Name,
                BoardConfigurationId = e.BoardConfigurationId,
                AcademicYear = e.AcademicYear,
                Term = e.Term,
                StartDate = e.StartDate,
                EndDate = e.EndDate,
                Status = e.Status,
                SubjectCount = e.Subjects.Count,
                MarksEnteredCount = marksEntered,
                CreatedAt = e.CreatedAt
            };
        }

        /*
        private static ExamSetupDetailDto MapToDetailDto(ExamSetup e)
        {
            var basic = MapToBasicDto(e);
            var detail = new ExamSetupDetailDto
            {
                Id = basic.Id,
                Name = basic.Name,
                ExamType = basic.ExamType,
                IsCustomType = basic.IsCustomType,
                CustomTypeName = basic.CustomTypeName,
                ClassName = basic.ClassName,
                ClassId = basic.ClassId,
                SectionName = basic.SectionName,
                SectionId = basic.SectionId,
                BoardName = basic.BoardName,
                BoardConfigurationId = basic.BoardConfigurationId,
                AcademicYear = basic.AcademicYear,
                Term = basic.Term,
                StartDate = basic.StartDate,
                EndDate = basic.EndDate,
                Status = basic.Status,
                SubjectCount = basic.SubjectCount,
                MarksEnteredCount = basic.MarksEnteredCount,
                CreatedAt = basic.CreatedAt,
                PublishedAt = e.PublishedAt,
                Subjects = e.Subjects
                    .OrderBy(s => s.SubjectOrder)
                    .Select(s => new ExamSetupSubjectDto
                    {
                        Id = s.Id,
                        SubjectId = s.SubjectId,
                        SubjectName = s.Subject?.Name ?? string.Empty,
                        SubjectCode = s.Subject?.Code,
                        IsElective = s.IsElective,
                        MaxTheoryMarks = s.MaxTheoryMarks,
                        MaxPracticalMarks = s.MaxPracticalMarks,
                        MaxInternalMarks = s.MaxInternalMarks,
                        MaxTotalMarks = s.MaxTotalMarks,
                        PassingMarks = s.PassingMarks,
                        AssignedStaffId = s.AssignedStaffId,
                        AssignedStaffName = s.AssignedStaff != null
                            ? $"{s.AssignedStaff.FirstName} {s.AssignedStaff.LastName}".Trim()
                            : null,
                        ExamDate = s.ExamDate,
                        StartTime = s.StartTime,
                        EndTime = s.EndTime,
                        Venue = s.Venue,
                        SubjectOrder = s.SubjectOrder,
                        Status = s.Status,
                        StudentsEnrolled = 0,   // filled by controller if needed
                        MarksEntered = s.MarksEntries?.Count ?? 0
                    }).ToList()
            };
            return detail;
        }
        */

        /// <summary>
        /// Resolves the effective grade scale for a class.
        /// Priority: ClassGradeTiers → BoardGradingScale → GradeConfigurations (school default).
        /// Returns a list of (minPct, maxPct, grade, gradePoint) tuples ordered by minPct descending.
        /// </summary>
        private async Task<List<(decimal min, decimal max, string grade, decimal gp)>> ResolveGradeScaleAsync(
            Guid schoolId, Guid classId, Guid? boardConfigurationId)
        {
            // 1. Try class-specific GradeTiers
            var tiers = await _context.GradeTiers
                .Where(g => g.SchoolId == schoolId && g.ClassId == classId)
                .OrderByDescending(g => g.MinMarks)
                .ToListAsync();

            if (tiers.Any())
                return tiers.Select(t => (t.MinMarks, t.MaxMarks, t.Grade, t.GPA)).ToList();

            // 2. Try board grading scale (JSON)
            if (boardConfigurationId.HasValue)
            {
                var board = await _context.BoardConfigurations
                    .FirstOrDefaultAsync(b => b.Id == boardConfigurationId.Value);

                if (board != null && !string.IsNullOrWhiteSpace(board.GradingScaleJson)
                    && board.GradingScaleJson != "[]")
                {
                    try
                    {
                        var scaleEntries = JsonSerializer.Deserialize<List<JsonElement>>(board.GradingScaleJson);
                        if (scaleEntries != null && scaleEntries.Any())
                        {
                            return scaleEntries
                                .Select(e => (
                                    min: e.TryGetProperty("minPercentage", out var mn) ? mn.GetDecimal() : 0m,
                                    max: e.TryGetProperty("maxPercentage", out var mx) ? mx.GetDecimal() : 100m,
                                    grade: e.TryGetProperty("grade", out var g) ? g.GetString() ?? "F" : "F",
                                    gp: e.TryGetProperty("gradePoint", out var gpp) ? gpp.GetDecimal() : 0m
                                ))
                                .OrderByDescending(e => e.min)
                                .ToList();
                        }
                    }
                    catch { /* fall through to school default */ }
                }
            }

            // 3. Fall back to school-level GradeConfigurations
            var configs = await _context.GradeConfigurations
                .Where(g => g.SchoolId == schoolId)
                .OrderByDescending(g => g.MinPercentage)
                .ToListAsync();

            if (configs.Any())
                return configs.Select(c => (c.MinPercentage, c.MaxPercentage, c.Grade, c.GradePoint ?? 0m)).ToList();

            // 4. Absolute fallback: basic percentage-based scale
            return new List<(decimal, decimal, string, decimal)>
            {
                (91, 100, "A+", 10m),
                (81, 90,  "A",  9m),
                (71, 80,  "B+", 8m),
                (61, 70,  "B",  7m),
                (51, 60,  "C",  6m),
                (41, 50,  "D",  5m),
                (33, 40,  "E",  4m),
                (0,  32,  "F",  0m)
            };
        }

        private static (string grade, decimal gradePoint) ResolveGradeFromScale(
            List<(decimal min, decimal max, string grade, decimal gp)> scale, decimal percentage)
        {
            foreach (var (min, max, grade, gp) in scale)
            {
                if (percentage >= min && percentage <= max)
                    return (grade, gp);
            }
            return ("F", 0m);
        }
    }
}
