using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SmsApi.Services
{
    public interface IAcademicsService
    {
        // Classes
        Task<ClassListResponse> GetClassesAsync(Guid schoolId, int page = 1, int pageSize = 10);
        Task<ClassResponse?> GetClassByIdAsync(Guid id, Guid schoolId);
        Task<ClassResponse> CreateClassAsync(CreateClassRequest request);
        Task<ClassResponse?> UpdateClassAsync(Guid id, Guid schoolId, CreateClassRequest request);
        Task<bool> DeleteClassAsync(Guid id, Guid schoolId);

        // Sections
        Task<SectionListResponse> GetSectionsAsync(Guid schoolId, Guid? classId = null, int page = 1, int pageSize = 10);
        Task<SectionResponse?> GetSectionByIdAsync(Guid id, Guid schoolId);
        Task<SectionResponse> CreateSectionAsync(CreateSectionRequest request);
        Task<SectionResponse?> UpdateSectionAsync(Guid id, Guid schoolId, CreateSectionRequest request);
        Task<bool> DeleteSectionAsync(Guid id, Guid schoolId);

        // Subjects
        Task<SubjectListResponse> GetSubjectsAsync(Guid schoolId, int page = 1, int pageSize = 10, string? search = null, string? type = null, Guid? boardConfigurationId = null, bool noBoardOnly = false);
        Task<SubjectResponse?> GetSubjectByIdAsync(Guid id, Guid schoolId);
        Task<SubjectResponse> CreateSubjectAsync(CreateSubjectRequest request);
        Task<SubjectResponse?> UpdateSubjectAsync(Guid id, Guid schoolId, CreateSubjectRequest request);
        Task<bool> DeleteSubjectAsync(Guid id, Guid schoolId);

        // Class Subjects
        Task<List<ClassSubjectResponse>> GetClassSubjectsAsync(Guid classId, Guid schoolId);
        Task<ClassSubjectResponse> AssignSubjectToClassAsync(AssignSubjectRequest request);
        Task<ClassSubjectResponse?> UpdateClassSubjectTeacherAsync(Guid id, Guid schoolId, Guid? teacherId);
        Task<bool> RemoveSubjectFromClassAsync(Guid id, Guid schoolId);

        // Teacher Assignments
        Task<TeacherAssignmentListResponse> GetTeacherAssignmentsAsync(Guid schoolId, Guid? classId = null, Guid? sectionId = null, Guid? staffId = null, int page = 1, int pageSize = 10);
        Task<TeacherAssignmentResponse> AssignTeacherAsync(AssignTeacherRequest request);
        Task<bool> RemoveTeacherAssignmentAsync(Guid id, Guid schoolId);
        Task<bool> UnsetClassTeacherFlagAsync(Guid id, Guid schoolId);
        Task<List<MyClassAssignmentDto>> GetMyClassTeacherAssignmentsAsync(Guid staffId, Guid schoolId);
        Task<List<MyClassAssignmentDto>> GetMyClassTeacherAssignmentsByEmailAsync(string userEmail, Guid schoolId);

        // Class Settings
        Task<ClassSettingsResponse?> GetClassSettingsAsync(Guid classId, Guid schoolId);
        Task<ClassSettingsResponse> CreateClassSettingsAsync(CreateClassSettingsRequest request);
        Task<ClassSettingsResponse?> UpdateClassSettingsAsync(Guid settingsId, UpdateClassSettingsRequest request, Guid schoolId);
        Task<bool> DeleteClassSettingsAsync(Guid settingsId, Guid schoolId);

        // Grade Tiers
        Task<GradeTierListResponse> GetGradeTiersAsync(Guid classId, Guid schoolId);
        Task<GradeTierResponse> CreateGradeTierAsync(CreateGradeTierRequest request);
        Task<GradeTierResponse?> UpdateGradeTierAsync(Guid id, UpdateGradeTierRequest request, Guid schoolId);
        Task<bool> DeleteGradeTierAsync(Guid id, Guid schoolId);

        // Timetable
        Task<TimetableEntryListResponse> GetSectionTimetableAsync(Guid sectionId, Guid schoolId);
        Task<TimetableEntryResponse> CreateTimetableEntryAsync(CreateTimetableEntryRequest request);
        Task<TimetableEntryResponse?> UpdateTimetableEntryAsync(Guid id, UpdateTimetableEntryRequest request, Guid schoolId);
        Task<bool> DeleteTimetableEntryAsync(Guid id, Guid schoolId);

        // Grouped Classes
        Task<GroupedClassListResponse> GetGroupedClassesAsync(Guid schoolId);

        // Academic Years
        Task<AcademicYearListResponse> GetAcademicYearsAsync(Guid schoolId, int page = 1, int pageSize = 50);
        Task<AcademicYearResponse?> GetAcademicYearByIdAsync(Guid id, Guid schoolId);
        Task<AcademicYearResponse> CreateAcademicYearAsync(Guid schoolId, CreateAcademicYearRequest request);
        Task<AcademicYearResponse?> UpdateAcademicYearAsync(Guid id, Guid schoolId, CreateAcademicYearRequest request);
        Task<AcademicYearResponse?> SetCurrentAcademicYearAsync(Guid id, Guid schoolId);
        Task<bool> DeleteAcademicYearAsync(Guid id, Guid schoolId);

        // ExamTypes
        Task<ExamTypeListResponse> GetExamTypesAsync(Guid schoolId);
        Task<ExamTypeResponse?> GetExamTypeByIdAsync(Guid id, Guid schoolId);
        Task<ExamTypeResponse> CreateExamTypeAsync(Guid schoolId, CreateExamTypeRequest request);
        Task<ExamTypeResponse?> UpdateExamTypeAsync(Guid id, Guid schoolId, CreateExamTypeRequest request);
        Task<bool> DeleteExamTypeAsync(Guid id, Guid schoolId);

        // SubjectTypes
        Task<SubjectTypeListResponse> GetSubjectTypesAsync(Guid schoolId);
        Task<SubjectTypeResponse?> GetSubjectTypeByIdAsync(Guid id, Guid schoolId);
        Task<SubjectTypeResponse> CreateSubjectTypeAsync(Guid schoolId, CreateSubjectTypeRequest request);
        Task<SubjectTypeResponse?> UpdateSubjectTypeAsync(Guid id, Guid schoolId, CreateSubjectTypeRequest request);
        Task<bool> DeleteSubjectTypeAsync(Guid id, Guid schoolId);

        // StudentSubjects
        Task<List<StudentSubjectResponse>> GetStudentSubjectsAsync(Guid schoolId, Guid studentId, string? academicYear);
        Task<StudentSubjectResponse> AssignStudentSubjectAsync(Guid schoolId, AssignStudentSubjectRequest request);
        Task<bool> RemoveStudentSubjectAsync(Guid id, Guid schoolId);
        Task BulkAssignStudentSubjectsAsync(Guid schoolId, BulkAssignStudentSubjectsRequest request);
    }

    public class AcademicsService : IAcademicsService
    {
        private readonly AppDbContext _context;
        private readonly IPermissionsService _permissionsService;
        private static readonly HashSet<string> AllowedClassStatuses = new(StringComparer.OrdinalIgnoreCase)
        {
            "active", "inactive", "archived"
        };
        private static readonly HashSet<string> AllowedSectionStatuses = new(StringComparer.OrdinalIgnoreCase)
        {
            "active", "inactive"
        };
        private static readonly HashSet<string> AllowedGeneralStatuses = new(StringComparer.OrdinalIgnoreCase)
        {
            "active", "inactive"
        };

        public AcademicsService(AppDbContext context, IPermissionsService permissionsService)
        {
            _context = context;
            _permissionsService = permissionsService;
        }

        // Classes Implementation
        public async Task<ClassListResponse> GetClassesAsync(Guid schoolId, int page = 1, int pageSize = 10)
        {
            EnsureSchoolId(schoolId);
            NormalizePagination(ref page, ref pageSize);
            await EnsureClassSectionDataFromStudentsAsync(schoolId);

            var classes = await _context.Classes
                .Include(c => c.BoardConfig)
                .Where(c => c.SchoolId == schoolId)
                .OrderBy(c => c.Name)
                .ToListAsync();

            var classIds = classes.Select(c => c.Id).ToList();
            var sections = await _context.Sections
                .Where(s => s.SchoolId == schoolId && classIds.Contains(s.ClassId))
                .OrderBy(s => s.Name)
                .ToListAsync();

            var classStudentCounts = await _context.Students
                .Where(s => s.SchoolId == schoolId && s.Status == "active")
                .GroupBy(s => s.Class)
                .Select(g => new { ClassName = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.ClassName, x => x.Count);

            var sectionStudentCounts = await _context.Students
                .Where(s => s.SchoolId == schoolId && s.Status == "active")
                .GroupBy(s => new { s.Class, s.Section })
                .Select(g => new { g.Key.Class, g.Key.Section, Count = g.Count() })
                .ToListAsync();

            var sectionCountMap = sectionStudentCounts
                .ToDictionary(
                    x => $"{x.Class.Trim().ToLowerInvariant()}|{x.Section.Trim().ToLowerInvariant()}",
                    x => x.Count);

            var activeAcademicYear = await GetCurrentAcademicYearNameAsync(schoolId);

            var expanded = new List<ClassResponse>();
            foreach (var classEntity in classes)
            {
                var classSections = sections.Where(s => s.ClassId == classEntity.Id).ToList();
                if (!classSections.Any())
                {
                    expanded.Add(MapToClassResponse(
                        classEntity,
                        classEntity.Name,
                        string.Empty,
                        activeAcademicYear,
                        classStudentCounts.TryGetValue(classEntity.Name, out var classCount) ? classCount : 0));
                    continue;
                }

                foreach (var section in classSections)
                {
                    var countKey = $"{classEntity.Name.Trim().ToLowerInvariant()}|{section.Name.Trim().ToLowerInvariant()}";
                    expanded.Add(MapToClassResponse(
                        classEntity,
                        classEntity.Name,
                        section.Name,
                        activeAcademicYear,
                        sectionCountMap.TryGetValue(countKey, out var sectionCount) ? sectionCount : 0));
                }
            }

            var total = expanded.Count;
            var paged = expanded
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            return new ClassListResponse
            {
                Classes = paged,
                Total = total,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<ClassResponse?> GetClassByIdAsync(Guid id, Guid schoolId)
        {
            await EnsureClassSectionDataFromStudentsAsync(schoolId);

            var classEntity = await _context.Classes
                .Include(c => c.BoardConfig)
                .FirstOrDefaultAsync(c => c.Id == id && c.SchoolId == schoolId);

            if (classEntity == null) return null;

            var activeAcademicYear = await GetCurrentAcademicYearNameAsync(schoolId);
            var totalStudents = await _context.Students
                .CountAsync(s => s.SchoolId == schoolId && s.Class == classEntity.Name && s.Status == "active");

            // Look up the class teacher from TeacherAssignments (load staff separately to avoid join issues)
            var ctStaffId = await _context.TeacherAssignments
                .IgnoreQueryFilters()
                .Where(ta => ta.SchoolId == schoolId && ta.ClassId == id
                    && ta.IsClassTeacher && ta.Status == "active" && !ta.IsDeleted)
                .Select(ta => (Guid?)ta.StaffId)
                .FirstOrDefaultAsync();

            string? ctName = null;
            if (ctStaffId.HasValue)
            {
                var ctStaff = await _context.StaffMembers
                    .IgnoreQueryFilters()
                    .Where(s => s.Id == ctStaffId.Value)
                    .Select(s => new { s.FirstName, s.LastName })
                    .FirstOrDefaultAsync();
                if (ctStaff != null)
                    ctName = $"{ctStaff.FirstName} {ctStaff.LastName}".Trim();
            }

            return MapToClassResponse(classEntity, classEntity.Name, string.Empty, activeAcademicYear, totalStudents,
                ctName, ctStaffId);
        }

        public async Task<ClassResponse> CreateClassAsync(CreateClassRequest request)
        {
            EnsureSchoolId(request.SchoolId);
            var normalizedName = NormalizeClassName(request);
            if (string.IsNullOrWhiteSpace(normalizedName))
                throw new InvalidOperationException("Class name/standard is required");

            var className = normalizedName.Trim();

            // Uniqueness check: same standard + same board
            if (request.BoardConfigurationId.HasValue)
            {
                var duplicateBoardClass = await _context.Classes
                    .IgnoreQueryFilters()
                    .Where(c => !c.IsDeleted && c.SchoolId == request.SchoolId &&
                                   c.Name.ToLower() == className.ToLower() &&
                                   c.BoardConfigurationId == request.BoardConfigurationId)
                    .AnyAsync();
                if (duplicateBoardClass)
                    throw new InvalidOperationException($"A class '{className}' for this board already exists");

                // Validate board is in school's active boards
                var boardIsConfigured = await _context.SchoolBoardConfigs
                    .AnyAsync(s => s.SchoolId == request.SchoolId &&
                                   s.BoardConfigurationId == request.BoardConfigurationId &&
                                   s.IsActive);
                if (!boardIsConfigured)
                    throw new InvalidOperationException("The selected board is not configured for this school. Add it in Settings → Board first.");
            }
            else
            {
                // No board specified: use legacy name-only uniqueness
                var duplicateClass = await _context.Classes
                    .IgnoreQueryFilters()
                    .Where(c => !c.IsDeleted && c.SchoolId == request.SchoolId &&
                                   c.Name.ToLower() == className.ToLower() &&
                                   c.BoardConfigurationId == null)
                    .AnyAsync();
                if (duplicateClass)
                    throw new InvalidOperationException("A class with the same name already exists");
            }

            var normalizedStatus = NormalizeStatus(request.Status, AllowedClassStatuses, "active", "class");
            var normalizedCode = string.IsNullOrWhiteSpace(request.Code) ? null : request.Code.Trim();
            if (request.Capacity.HasValue && request.Capacity <= 0)
                throw new InvalidOperationException("Class capacity must be greater than 0");

            var numberOfSections = request.NumberOfSections > 0 ? request.NumberOfSections : 1;

            var academicYear = !string.IsNullOrWhiteSpace(request.AcademicYear)
                ? request.AcademicYear!
                : await GetCurrentAcademicYearNameAsync(request.SchoolId);

            var classEntity = new Class
            {
                Id = Guid.NewGuid(),
                SchoolId = request.SchoolId,
                Name = className,
                Code = normalizedCode,
                Board = request.Board,
                BoardConfigurationId = request.BoardConfigurationId,
                Capacity = request.Capacity,
                NumberOfSections = numberOfSections,
                Status = normalizedStatus,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Classes.Add(classEntity);
            await _context.SaveChangesAsync();

            // Reload with navigation properties
            await _context.Entry(classEntity).Reference(c => c.BoardConfig).LoadAsync();

            // Auto-create sections A, B, C... based on numberOfSections
            var sectionLabels = Enumerable.Range(0, numberOfSections)
                .Select(i => ((char)('A' + i)).ToString())
                .ToList();

            foreach (var sectionName in sectionLabels)
            {
                var existingSection = await _context.Sections.FirstOrDefaultAsync(s =>
                    s.SchoolId == request.SchoolId && s.ClassId == classEntity.Id && s.Name == sectionName);
                if (existingSection == null)
                {
                    _context.Sections.Add(new Section
                    {
                        Id = Guid.NewGuid(),
                        SchoolId = request.SchoolId,
                        ClassId = classEntity.Id,
                        Name = sectionName,
                        Capacity = request.Capacity,
                        Status = "active",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                }
            }
            await _context.SaveChangesAsync();

            var totalStudents = await _context.Students
                .CountAsync(s => s.SchoolId == request.SchoolId && s.Class == classEntity.Name);

            return MapToClassResponse(
                classEntity,
                classEntity.Name,
                sectionLabels.FirstOrDefault() ?? string.Empty,
                academicYear,
                totalStudents,
                request.ClassTeacher,
                request.ClassTeacherId);
        }

        public async Task<ClassResponse?> UpdateClassAsync(Guid id, Guid schoolId, CreateClassRequest request)
        {
            EnsureSchoolId(schoolId);
            var classEntity = await _context.Classes
                .FirstOrDefaultAsync(c => c.Id == id && c.SchoolId == schoolId);

            if (classEntity == null) return null;

            var normalizedName = NormalizeClassName(request);
            var normalizedSection = string.IsNullOrWhiteSpace(request.Section) ? null : request.Section.Trim();
            if (!string.IsNullOrWhiteSpace(normalizedName))
            {
                var candidateName = normalizedName.Trim();
                var duplicateClass = await _context.Classes
                    .AnyAsync(c => c.SchoolId == schoolId && c.Id != id &&
                                   c.Name.ToLower() == candidateName.ToLower());
                if (duplicateClass)
                    throw new InvalidOperationException("A class with the same name already exists");
                classEntity.Name = candidateName;
            }

            if (request.Capacity.HasValue && request.Capacity <= 0)
                throw new InvalidOperationException("Class capacity must be greater than 0");

            classEntity.Code = string.IsNullOrWhiteSpace(request.Code) ? null : request.Code.Trim();
            classEntity.Board = request.Board;
            classEntity.BoardConfigurationId = request.BoardConfigurationId;
            classEntity.Capacity = request.Capacity;
            classEntity.Status = NormalizeStatus(request.Status, AllowedClassStatuses, classEntity.Status, "class");
            classEntity.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Persist class teacher assignment to TeacherAssignments table
            if (request.ClassTeacherId.HasValue)
            {
                var sections = await _context.Sections
                    .Where(s => s.SchoolId == schoolId && s.ClassId == classEntity.Id && !s.IsDeleted)
                    .ToListAsync();

                if (sections.Any())
                {
                    foreach (var section in sections)
                        await UpsertClassTeacherAssignmentAsync(schoolId, classEntity.Id, section.Id, request.ClassTeacherId.Value);
                }
                else
                {
                    // No sections yet — create a class-level assignment (SectionId = null)
                    var oldClassLevel = await _context.TeacherAssignments
                        .Where(ta => ta.SchoolId == schoolId && ta.ClassId == classEntity.Id
                            && ta.IsClassTeacher && ta.SectionId == null)
                        .ToListAsync();
                    _context.TeacherAssignments.RemoveRange(oldClassLevel);

                    var classLevelAcademicYear = await GetCurrentAcademicYearNameAsync(schoolId);
                    _context.TeacherAssignments.Add(new TeacherAssignment
                    {
                        Id = Guid.NewGuid(),
                        SchoolId = schoolId,
                        StaffId = request.ClassTeacherId.Value,
                        ClassId = classEntity.Id,
                        SectionId = null,
                        IsClassTeacher = true,
                        AcademicYear = classLevelAcademicYear,
                        Status = "active",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                    await _context.SaveChangesAsync();

                    try { await _permissionsService.AutoAssignAcademicRoleAsync(request.ClassTeacherId.Value, isClassTeacher: true, hasSubject: false, schoolId); }
                    catch { /* best-effort */ }
                }
            }

            // Reload with navigation properties
            await _context.Entry(classEntity).Reference(c => c.BoardConfig).LoadAsync();

            if (!string.IsNullOrWhiteSpace(normalizedSection))
            {
                var sectionName = normalizedSection;
                var existingSection = await _context.Sections.FirstOrDefaultAsync(s =>
                    s.SchoolId == schoolId && s.ClassId == classEntity.Id && s.Name == sectionName);
                if (existingSection == null)
                {
                    _context.Sections.Add(new Section
                    {
                        Id = Guid.NewGuid(),
                        SchoolId = schoolId,
                        ClassId = classEntity.Id,
                        Name = sectionName,
                        Capacity = request.Capacity,
                        Status = "active",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                    await _context.SaveChangesAsync();
                }
            }

            var academicYear = !string.IsNullOrWhiteSpace(request.AcademicYear)
                ? request.AcademicYear!
                : await GetCurrentAcademicYearNameAsync(schoolId);

            var totalStudents = await _context.Students
                .CountAsync(s => s.SchoolId == schoolId && s.Class == classEntity.Name
                    && (string.IsNullOrWhiteSpace(normalizedSection) || s.Section == normalizedSection));

            // Return the CT info from DB (not just from request) so the response is always accurate
            var savedCtStaffId = await _context.TeacherAssignments
                .IgnoreQueryFilters()
                .Where(ta => ta.SchoolId == schoolId && ta.ClassId == classEntity.Id
                    && ta.IsClassTeacher && ta.Status == "active" && !ta.IsDeleted)
                .Select(ta => (Guid?)ta.StaffId)
                .FirstOrDefaultAsync();

            string? ctName = request.ClassTeacher;
            Guid? ctId = savedCtStaffId ?? request.ClassTeacherId;
            if (savedCtStaffId.HasValue)
            {
                var savedCtStaff = await _context.StaffMembers
                    .IgnoreQueryFilters()
                    .Where(s => s.Id == savedCtStaffId.Value)
                    .Select(s => new { s.FirstName, s.LastName })
                    .FirstOrDefaultAsync();
                if (savedCtStaff != null)
                    ctName = $"{savedCtStaff.FirstName} {savedCtStaff.LastName}".Trim();
            }

            return MapToClassResponse(
                classEntity,
                classEntity.Name,
                normalizedSection ?? string.Empty,
                academicYear,
                totalStudents,
                ctName,
                ctId);
        }

        public async Task<bool> DeleteClassAsync(Guid id, Guid schoolId)
        {
            var classEntity = await _context.Classes
                .FirstOrDefaultAsync(c => c.Id == id && c.SchoolId == schoolId);

            if (classEntity == null) return false;

            _context.Classes.Remove(classEntity);
            await _context.SaveChangesAsync();

            return true;
        }

        // Sections Implementation
        public async Task<SectionListResponse> GetSectionsAsync(Guid schoolId, Guid? classId = null, int page = 1, int pageSize = 10)
        {
            EnsureSchoolId(schoolId);
            NormalizePagination(ref page, ref pageSize);
            await EnsureClassSectionDataFromStudentsAsync(schoolId);

            var query = _context.Sections.Where(s => s.SchoolId == schoolId);

            if (classId.HasValue)
                query = query.Where(s => s.ClassId == classId.Value);

            var total = await query.CountAsync();
            var sections = await query
                .OrderBy(s => s.Name)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var classIds = sections.Select(s => s.ClassId).Distinct().ToList();
            var classMap = await _context.Classes
                .Where(c => c.SchoolId == schoolId && classIds.Contains(c.Id))
                .ToDictionaryAsync(c => c.Id, c => c.Name);

            var sectionCounts = await _context.Students
                .Where(s => s.SchoolId == schoolId && s.Status == "active")
                .GroupBy(s => new { s.Class, s.Section })
                .Select(g => new { g.Key.Class, g.Key.Section, Count = g.Count() })
                .ToListAsync();

            var sectionCountMap = sectionCounts.ToDictionary(
                x => $"{x.Class.Trim().ToLowerInvariant()}|{x.Section.Trim().ToLowerInvariant()}",
                x => x.Count);

            // Load class teacher assignments for these sections
            var sectionIds = sections.Select(s => s.Id).ToList();
            var ctAssignments = await _context.TeacherAssignments
                .Where(ta => ta.SchoolId == schoolId && ta.IsClassTeacher
                    && ta.SectionId != null && sectionIds.Contains(ta.SectionId.Value)
                    && ta.Status == "active")
                .Include(ta => ta.Staff)
                .ToListAsync();

            var responses = sections.Select(s =>
            {
                var ct = ctAssignments.FirstOrDefault(ta => ta.SectionId == s.Id);
                classMap.TryGetValue(s.ClassId, out var className);
                var countKey = $"{(className ?? string.Empty).Trim().ToLowerInvariant()}|{s.Name.Trim().ToLowerInvariant()}";
                var dto = MapToSectionResponse(
                    s,
                    className ?? string.Empty,
                    sectionCountMap.TryGetValue(countKey, out var sectionCount) ? sectionCount : 0);
                if (ct?.Staff != null)
                {
                    dto.ClassTeacherId = ct.StaffId;
                    dto.ClassTeacherName = $"{ct.Staff.FirstName} {ct.Staff.LastName}".Trim();
                }
                return dto;
            }).ToList();

            return new SectionListResponse
            {
                Sections = responses,
                Total = total,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<SectionResponse?> GetSectionByIdAsync(Guid id, Guid schoolId)
        {
            await EnsureClassSectionDataFromStudentsAsync(schoolId);

            var section = await _context.Sections
                .FirstOrDefaultAsync(s => s.Id == id && s.SchoolId == schoolId);
            if (section == null) return null;

            var className = await _context.Classes
                .Where(c => c.Id == section.ClassId && c.SchoolId == schoolId)
                .Select(c => c.Name)
                .FirstOrDefaultAsync() ?? string.Empty;

            var studentsCount = await _context.Students
                .CountAsync(s => s.SchoolId == schoolId && s.Class == className && s.Section == section.Name && s.Status == "active");

            var ct = await _context.TeacherAssignments
                .Include(ta => ta.Staff)
                .FirstOrDefaultAsync(ta => ta.SectionId == id && ta.IsClassTeacher && ta.SchoolId == schoolId && ta.Status == "active");

            var dto = MapToSectionResponse(section, className, studentsCount);
            if (ct?.Staff != null)
            {
                dto.ClassTeacherId = ct.StaffId;
                dto.ClassTeacherName = $"{ct.Staff.FirstName} {ct.Staff.LastName}".Trim();
            }
            return dto;
        }

        public async Task<SectionResponse> CreateSectionAsync(CreateSectionRequest request)
        {
            EnsureSchoolId(request.SchoolId);
            var classExists = await _context.Classes.AnyAsync(c => c.Id == request.ClassId && c.SchoolId == request.SchoolId);
            if (!classExists)
                throw new InvalidOperationException("Class does not exist");

            var sectionName = NormalizeRequiredText(request.Name, "Section name", 50);
            var duplicateSection = await _context.Sections
                .AnyAsync(s => s.SchoolId == request.SchoolId && s.ClassId == request.ClassId &&
                               s.Name.ToLower() == sectionName.ToLower());
            if (duplicateSection)
                throw new InvalidOperationException("A section with the same name already exists for this class");

            if (request.Capacity.HasValue && request.Capacity <= 0)
                throw new InvalidOperationException("Section capacity must be greater than 0");

            var section = new Section
            {
                Id = Guid.NewGuid(),
                SchoolId = request.SchoolId,
                ClassId = request.ClassId,
                Name = sectionName,
                Capacity = request.Capacity,
                Status = NormalizeStatus(request.Status, AllowedSectionStatuses, "active", "section"),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Sections.Add(section);
            await _context.SaveChangesAsync();

            // Assign class teacher if provided
            if (request.ClassTeacherId.HasValue)
                await UpsertClassTeacherAssignmentAsync(request.SchoolId, request.ClassId, section.Id, request.ClassTeacherId.Value);

            var className = await _context.Classes
                .Where(c => c.Id == section.ClassId && c.SchoolId == section.SchoolId)
                .Select(c => c.Name)
                .FirstOrDefaultAsync() ?? string.Empty;
            var dto = MapToSectionResponse(section, className, section.StudentsCount);
            if (request.ClassTeacherId.HasValue)
            {
                var staff = await _context.StaffMembers.FindAsync(request.ClassTeacherId.Value);
                if (staff != null)
                {
                    dto.ClassTeacherId = staff.Id;
                    dto.ClassTeacherName = $"{staff.FirstName} {staff.LastName}".Trim();
                }
            }
            return dto;
        }

        public async Task<SectionResponse?> UpdateSectionAsync(Guid id, Guid schoolId, CreateSectionRequest request)
        {
            EnsureSchoolId(schoolId);
            var section = await _context.Sections
                .FirstOrDefaultAsync(s => s.Id == id && s.SchoolId == schoolId);

            if (section == null) return null;

            var sectionName = NormalizeRequiredText(request.Name, "Section name", 50);
            var duplicateSection = await _context.Sections
                .AnyAsync(s => s.SchoolId == schoolId && s.ClassId == section.ClassId && s.Id != id &&
                               s.Name.ToLower() == sectionName.ToLower());
            if (duplicateSection)
                throw new InvalidOperationException("A section with the same name already exists for this class");

            if (request.Capacity.HasValue && request.Capacity <= 0)
                throw new InvalidOperationException("Section capacity must be greater than 0");

            section.Name = sectionName;
            section.Capacity = request.Capacity;
            section.Status = NormalizeStatus(request.Status, AllowedSectionStatuses, section.Status, "section");
            section.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Update class teacher assignment
            if (request.ClassTeacherId.HasValue)
                await UpsertClassTeacherAssignmentAsync(schoolId, section.ClassId, section.Id, request.ClassTeacherId.Value);
            else
                await RemoveClassTeacherAssignmentAsync(schoolId, section.Id);

            var ct = await _context.TeacherAssignments
                .Include(ta => ta.Staff)
                .FirstOrDefaultAsync(ta => ta.SectionId == id && ta.IsClassTeacher && ta.SchoolId == schoolId && ta.Status == "active");

            var className = await _context.Classes
                .Where(c => c.Id == section.ClassId && c.SchoolId == section.SchoolId)
                .Select(c => c.Name)
                .FirstOrDefaultAsync() ?? string.Empty;
            var dto = MapToSectionResponse(section, className, section.StudentsCount);
            if (ct?.Staff != null)
            {
                dto.ClassTeacherId = ct.StaffId;
                dto.ClassTeacherName = $"{ct.Staff.FirstName} {ct.Staff.LastName}".Trim();
            }
            return dto;
        }

        public async Task<bool> DeleteSectionAsync(Guid id, Guid schoolId)
        {
            var section = await _context.Sections
                .FirstOrDefaultAsync(s => s.Id == id && s.SchoolId == schoolId);

            if (section == null) return false;

            _context.Sections.Remove(section);
            await _context.SaveChangesAsync();

            return true;
        }

        // Subjects Implementation
        public async Task<SubjectListResponse> GetSubjectsAsync(Guid schoolId, int page = 1, int pageSize = 10, string? search = null, string? type = null, Guid? boardConfigurationId = null, bool noBoardOnly = false)
        {
            EnsureSchoolId(schoolId);
            NormalizePagination(ref page, ref pageSize);
            var query = _context.Subjects
                .Include(s => s.SubjectTypeRef)
                .Include(s => s.BoardConfig)
                .Where(s => s.SchoolId == schoolId);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var q = search.Trim().ToLower();
                query = query.Where(s => s.Name.ToLower().Contains(q) || s.Code.ToLower().Contains(q));
            }
            if (!string.IsNullOrWhiteSpace(type))
                query = query.Where(s => s.Type != null && s.Type.ToLower() == type.ToLower());
            if (noBoardOnly)
                query = query.Where(s => s.BoardConfigurationId == null);
            else if (boardConfigurationId.HasValue)
                query = query.Where(s => s.BoardConfigurationId == boardConfigurationId.Value);

            var total = await query.CountAsync();
            var subjects = await query
                .OrderBy(s => s.Name)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new SubjectListResponse
            {
                Subjects = subjects.Select(MapToSubjectResponse).ToList(),
                Total = total,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<SubjectResponse?> GetSubjectByIdAsync(Guid id, Guid schoolId)
        {
            var subject = await _context.Subjects
                .Include(s => s.SubjectTypeRef)
                .Include(s => s.BoardConfig)
                .FirstOrDefaultAsync(s => s.Id == id && s.SchoolId == schoolId);

            return subject == null ? null : MapToSubjectResponse(subject);
        }

        public async Task<SubjectResponse> CreateSubjectAsync(CreateSubjectRequest request)
        {
            EnsureSchoolId(request.SchoolId);
            var subjectName = NormalizeRequiredText(request.Name, "Subject name", 200);
            var subjectCode = NormalizeRequiredText(request.Code, "Subject code", 50);

            var duplicateCode = await _context.Subjects
                .AnyAsync(s => s.SchoolId == request.SchoolId && s.Code.ToLower() == subjectCode.ToLower());
            if (duplicateCode)
                throw new InvalidOperationException("A subject with the same code already exists");

            if (request.MaxMarks.HasValue && request.MaxMarks <= 0)
                throw new InvalidOperationException("Max marks must be greater than 0");
            if (request.PassMarks.HasValue && request.PassMarks < 0)
                throw new InvalidOperationException("Pass marks cannot be negative");
            if (request.MaxMarks.HasValue && request.PassMarks.HasValue && request.PassMarks > request.MaxMarks)
                throw new InvalidOperationException("Pass marks cannot exceed max marks");

            var subject = new Subject
            {
                Id = Guid.NewGuid(),
                SchoolId = request.SchoolId,
                Name = subjectName,
                Code = subjectCode,
                Type = request.Type,
                SubjectTypeId = request.SubjectTypeId,
                BoardConfigurationId = request.BoardConfigurationId,
                MaxMarks = request.MaxMarks,
                TheoryMaxMarks = request.TheoryMaxMarks,
                PracticalMaxMarks = request.PracticalMaxMarks,
                PassMarks = request.PassMarks,
                Description = request.Description,
                Status = NormalizeStatus(request.Status, AllowedGeneralStatuses, "active", "subject"),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Subjects.Add(subject);
            await _context.SaveChangesAsync();
            await _context.Entry(subject).Reference(s => s.SubjectTypeRef).LoadAsync();
            await _context.Entry(subject).Reference(s => s.BoardConfig).LoadAsync();

            return MapToSubjectResponse(subject);
        }

        public async Task<SubjectResponse?> UpdateSubjectAsync(Guid id, Guid schoolId, CreateSubjectRequest request)
        {
            EnsureSchoolId(schoolId);
            var subject = await _context.Subjects
                .FirstOrDefaultAsync(s => s.Id == id && s.SchoolId == schoolId);

            if (subject == null) return null;

            var subjectName = NormalizeRequiredText(request.Name, "Subject name", 200);
            var subjectCode = NormalizeRequiredText(request.Code, "Subject code", 50);
            var duplicateCode = await _context.Subjects
                .AnyAsync(s => s.SchoolId == schoolId && s.Id != id && s.Code.ToLower() == subjectCode.ToLower());
            if (duplicateCode)
                throw new InvalidOperationException("A subject with the same code already exists");

            if (request.MaxMarks.HasValue && request.MaxMarks <= 0)
                throw new InvalidOperationException("Max marks must be greater than 0");
            if (request.PassMarks.HasValue && request.PassMarks < 0)
                throw new InvalidOperationException("Pass marks cannot be negative");
            if (request.MaxMarks.HasValue && request.PassMarks.HasValue && request.PassMarks > request.MaxMarks)
                throw new InvalidOperationException("Pass marks cannot exceed max marks");

            subject.Name = subjectName;
            subject.Code = subjectCode;
            subject.Type = request.Type;
            subject.SubjectTypeId = request.SubjectTypeId;
            subject.BoardConfigurationId = request.BoardConfigurationId;
            subject.MaxMarks = request.MaxMarks;
            subject.TheoryMaxMarks = request.TheoryMaxMarks;
            subject.PracticalMaxMarks = request.PracticalMaxMarks;
            subject.PassMarks = request.PassMarks;
            subject.Description = request.Description;
            subject.Status = NormalizeStatus(request.Status, AllowedGeneralStatuses, subject.Status, "subject");
            subject.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            await _context.Entry(subject).Reference(s => s.SubjectTypeRef).LoadAsync();
            await _context.Entry(subject).Reference(s => s.BoardConfig).LoadAsync();

            return MapToSubjectResponse(subject);
        }

        public async Task<bool> DeleteSubjectAsync(Guid id, Guid schoolId)
        {
            var subject = await _context.Subjects
                .FirstOrDefaultAsync(s => s.Id == id && s.SchoolId == schoolId);

            if (subject == null) return false;

            _context.Subjects.Remove(subject);
            await _context.SaveChangesAsync();

            return true;
        }

        // Class Subjects Implementation
        public async Task<List<ClassSubjectResponse>> GetClassSubjectsAsync(Guid classId, Guid schoolId)
        {
            // IgnoreQueryFilters so the global school/IsDeleted filter on Subject and Staff entities
            // does not null-out the Subject and Teacher nav-props during Include.
            var classSubjects = await _context.ClassSubjects
                .IgnoreQueryFilters()
                .Include(cs => cs.Teacher)
                .Include(cs => cs.Subject)
                .Include(cs => cs.SubjectType)
                .Where(cs => cs.ClassId == classId && cs.SchoolId == schoolId)
                .ToListAsync();

            // Build a set of (staffId|subjectId) pairs that have an active TeacherAssignment.
            // This guards against stale ClassSubjects.TeacherId references left behind when
            // a teacher assignment was removed without clearing the ClassSubjects link.
            var validPairs = await _context.TeacherAssignments
                .Where(ta => ta.SchoolId == schoolId
                    && ta.ClassId == classId
                    && ta.SubjectId.HasValue)
                .Select(ta => new { ta.StaffId, ta.SubjectId })
                .ToListAsync();

            var validPairSet = new HashSet<string>(
                validPairs.Select(p => $"{p.StaffId}|{p.SubjectId}"));

            return classSubjects.Select(cs => MapToClassSubjectResponse(cs, validPairSet)).ToList();
        }

        public async Task<ClassSubjectResponse> AssignSubjectToClassAsync(AssignSubjectRequest request)
        {
            // VALIDATION 1: Class-subject mapping validation - Verify class exists and is active
            var classEntity = await _context.Classes
                .FirstOrDefaultAsync(c => c.Id == request.ClassId && c.SchoolId == request.SchoolId);
            if (classEntity == null)
                throw new InvalidOperationException("Class does not exist");

            // VALIDATION 2: Duplicate enrollment prevention - Ensure subject not already assigned to class
            var duplicateAssignment = await _context.ClassSubjects
                .AnyAsync(cs => cs.SchoolId == request.SchoolId &&
                               cs.ClassId == request.ClassId &&
                               cs.SubjectId == request.SubjectId);
            if (duplicateAssignment)
                throw new InvalidOperationException("Subject is already assigned to this class");

            // VALIDATION 3: Subject strength check - Ensure subject is available for assignment
            var subject = await _context.Subjects
                .FirstOrDefaultAsync(s => s.Id == request.SubjectId && s.SchoolId == request.SchoolId);
            if (subject == null)
                throw new InvalidOperationException("Subject does not exist");

            // VALIDATION 4: Teacher validation - If teacher is provided, ensure they exist
            if (request.TeacherId.HasValue && request.TeacherId != Guid.Empty)
            {
                var teacher = await _context.Set<Staff>()
                    .FirstOrDefaultAsync(s => s.Id == request.TeacherId && s.SchoolId == request.SchoolId);
                if (teacher == null)
                    throw new InvalidOperationException("Teacher does not exist");
            }

            var classSubject = new ClassSubject
            {
                Id = Guid.NewGuid(),
                SchoolId = request.SchoolId,
                ClassId = request.ClassId,
                SubjectId = request.SubjectId,
                SubjectTypeId = request.SubjectTypeId,
                TeacherId = request.TeacherId,
                AcademicYear = request.AcademicYear,
                MaxMarks = request.MaxMarks ?? 100,
                TheoryMaxMarks = request.TheoryMaxMarks,
                PracticalMaxMarks = request.PracticalMaxMarks,
                Credits = request.Credits ?? 4,
                IsMandatory = request.IsMandatory,
                Status = request.Status ?? "active",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.ClassSubjects.Add(classSubject);
            await _context.SaveChangesAsync();

            // If a teacher is specified, also create a class-level TeacherAssignment so the
            // teacher sees this subject in "My Classes" immediately.
            if (classSubject.TeacherId.HasValue)
            {
                var academicYear = !string.IsNullOrWhiteSpace(classSubject.AcademicYear)
                    ? classSubject.AcademicYear
                    : $"{DateTime.UtcNow.Year}-{DateTime.UtcNow.Year + 1}";

                var alreadyAssigned = await _context.TeacherAssignments.AnyAsync(ta =>
                    ta.SchoolId == request.SchoolId
                    && ta.StaffId == classSubject.TeacherId.Value
                    && ta.ClassId == classSubject.ClassId
                    && ta.SectionId == null
                    && ta.SubjectId == classSubject.SubjectId
                    && !ta.IsDeleted);

                if (!alreadyAssigned)
                {
                    _context.TeacherAssignments.Add(new TeacherAssignment
                    {
                        Id            = Guid.NewGuid(),
                        SchoolId      = request.SchoolId,
                        StaffId       = classSubject.TeacherId.Value,
                        ClassId       = classSubject.ClassId,
                        SectionId     = null,
                        SubjectId     = classSubject.SubjectId,
                        IsClassTeacher = false,
                        AcademicYear  = academicYear,
                        Status        = "active",
                        CreatedAt     = DateTime.UtcNow,
                        UpdatedAt     = DateTime.UtcNow,
                    });
                    await _context.SaveChangesAsync();
                }
            }

            return MapToClassSubjectResponse(classSubject);
        }

        public async Task<bool> RemoveSubjectFromClassAsync(Guid id, Guid schoolId)
        {
            var classSubject = await _context.ClassSubjects
                .FirstOrDefaultAsync(cs => cs.Id == id && cs.SchoolId == schoolId);

            if (classSubject == null) return false;

            _context.ClassSubjects.Remove(classSubject);
            await _context.SaveChangesAsync();

            return true;
        }

        /// <summary>
        /// Assigns or reassigns the teacher for an existing class-subject record.
        /// Also creates/removes the corresponding TeacherAssignment rows so the
        /// teacher's "My Classes" view stays in sync.
        /// </summary>
        public async Task<ClassSubjectResponse?> UpdateClassSubjectTeacherAsync(Guid id, Guid schoolId, Guid? teacherId)
        {
            var classSubject = await _context.ClassSubjects
                .Include(cs => cs.Teacher)
                .Include(cs => cs.Subject)
                .Include(cs => cs.SubjectType)
                .FirstOrDefaultAsync(cs => cs.Id == id && cs.SchoolId == schoolId);

            if (classSubject == null) return null;

            // Validate new teacher if provided
            if (teacherId.HasValue && teacherId != Guid.Empty)
            {
                var teacher = await _context.Set<Staff>()
                    .FirstOrDefaultAsync(s => s.Id == teacherId && s.SchoolId == schoolId && s.Status != "inactive");
                if (teacher == null)
                    throw new InvalidOperationException("Teacher does not exist or is inactive.");
            }

            var oldTeacherId = classSubject.TeacherId;

            // If there was a previous teacher and they are being replaced, remove their assignment
            if (oldTeacherId.HasValue && oldTeacherId != teacherId)
            {
                var oldAssignment = await _context.TeacherAssignments
                    .FirstOrDefaultAsync(ta => ta.SchoolId == schoolId
                        && ta.StaffId == oldTeacherId.Value
                        && ta.ClassId == classSubject.ClassId
                        && ta.SubjectId == classSubject.SubjectId
                        && !ta.IsDeleted);
                if (oldAssignment != null)
                    _context.TeacherAssignments.Remove(oldAssignment);
            }

            // Update the class-subject record
            classSubject.TeacherId = (teacherId == Guid.Empty) ? null : teacherId;
            classSubject.UpdatedAt = DateTime.UtcNow;

            // If a new teacher is assigned, create TeacherAssignment if one doesn't already exist
            if (classSubject.TeacherId.HasValue)
            {
                var academicYear = !string.IsNullOrWhiteSpace(classSubject.AcademicYear)
                    ? classSubject.AcademicYear
                    : $"{DateTime.UtcNow.Year}-{DateTime.UtcNow.Year + 1}";

                var alreadyAssigned = await _context.TeacherAssignments.AnyAsync(ta =>
                    ta.SchoolId == schoolId
                    && ta.StaffId == classSubject.TeacherId.Value
                    && ta.ClassId == classSubject.ClassId
                    && ta.SubjectId == classSubject.SubjectId
                    && !ta.IsDeleted);

                if (!alreadyAssigned)
                {
                    _context.TeacherAssignments.Add(new TeacherAssignment
                    {
                        Id            = Guid.NewGuid(),
                        SchoolId      = schoolId,
                        StaffId       = classSubject.TeacherId.Value,
                        ClassId       = classSubject.ClassId,
                        SectionId     = null,
                        SubjectId     = classSubject.SubjectId,
                        IsClassTeacher = false,
                        AcademicYear  = academicYear,
                        Status        = "active",
                        CreatedAt     = DateTime.UtcNow,
                        UpdatedAt     = DateTime.UtcNow,
                    });
                }
            }

            await _context.SaveChangesAsync();

            // Re-load with navigation props for mapping
            var updated = await _context.ClassSubjects
                .IgnoreQueryFilters()
                .Include(cs => cs.Teacher)
                .Include(cs => cs.Subject)
                .Include(cs => cs.SubjectType)
                .FirstOrDefaultAsync(cs => cs.Id == id);

            // Build valid pair set so the mapper's defensive check passes
            var validPairs = new HashSet<string>();
            if (updated?.TeacherId.HasValue == true)
                validPairs.Add($"{updated.TeacherId}|{updated.SubjectId}");

            return updated == null ? null : MapToClassSubjectResponse(updated, validPairs);
        }

        // Teacher Assignments Implementation
        public async Task<TeacherAssignmentListResponse> GetTeacherAssignmentsAsync(Guid schoolId, Guid? classId = null, Guid? sectionId = null, Guid? staffId = null, int page = 1, int pageSize = 10)
        {
            EnsureSchoolId(schoolId);
            NormalizePagination(ref page, ref pageSize);
            // Use IgnoreQueryFilters so the global school/IsDeleted filter on related entities
            // (Class, Section, Subject, Staff) does not silently null-out navigation properties.
            // The explicit WHERE clause below re-applies the correct tenant + soft-delete filters.
            var query = _context.TeacherAssignments
                .IgnoreQueryFilters()
                .Include(ta => ta.Staff)
                .Include(ta => ta.Class)
                .Include(ta => ta.Section)
                .Include(ta => ta.Subject)
                .Where(ta => ta.SchoolId == schoolId && !ta.IsDeleted
                    && (ta.Staff == null || ta.Staff.Status != "inactive"));

            if (classId.HasValue)
                query = query.Where(ta => ta.ClassId == classId.Value);

            if (sectionId.HasValue)
                query = query.Where(ta => ta.SectionId == sectionId.Value);

            if (staffId.HasValue)
                query = query.Where(ta => ta.StaffId == staffId.Value);

            var total = await query.CountAsync();
            var assignments = await query
                .OrderByDescending(ta => ta.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new TeacherAssignmentListResponse
            {
                Assignments = assignments.Select(MapToTeacherAssignmentResponse).ToList(),
                Total = total,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<TeacherAssignmentResponse> AssignTeacherAsync(AssignTeacherRequest request)
        {
            EnsureSchoolId(request.SchoolId);

            // VALIDATION 1: Academic year required
            if (string.IsNullOrWhiteSpace(request.AcademicYear))
                throw new ArgumentException("Academic year is required");

            // VALIDATION 2: Staff exists in school and is active
            var staffMember = await _context.StaffMembers
                .FirstOrDefaultAsync(s => s.Id == request.StaffId && s.SchoolId == request.SchoolId && !s.IsDeleted);
            if (staffMember == null)
                throw new KeyNotFoundException("Staff member does not exist in this school");
            if (staffMember.Status?.ToLower() == "inactive" || staffMember.Status?.ToLower() == "terminated")
                throw new InvalidOperationException($"Cannot assign {staffMember.FirstName} {staffMember.LastName} to a class — their account is {staffMember.Status}. Reactivate the staff member first.");

            // VALIDATION 3: Class exists in school
            var classExists = await _context.Classes
                .AnyAsync(c => c.Id == request.ClassId && c.SchoolId == request.SchoolId);
            if (!classExists)
                throw new KeyNotFoundException("Class does not exist in this school");

            // VALIDATION 4: Section exists if provided
            if (request.SectionId.HasValue && request.SectionId != Guid.Empty)
            {
                var sectionExists = await _context.Sections
                    .AnyAsync(s => s.Id == request.SectionId.Value && s.SchoolId == request.SchoolId);
                if (!sectionExists)
                    throw new KeyNotFoundException("Section does not exist in this school");
            }

            // VALIDATION 5: Duplicate assignment check (same staff/class/section/subject/year/isClassTeacher)
            var duplicate = await _context.TeacherAssignments
                .AnyAsync(ta => ta.SchoolId == request.SchoolId
                    && ta.StaffId == request.StaffId
                    && ta.ClassId == request.ClassId
                    && ta.SectionId == request.SectionId
                    && ta.SubjectId == request.SubjectId
                    && ta.AcademicYear == request.AcademicYear.Trim()
                    && ta.IsClassTeacher == request.IsClassTeacher);
            if (duplicate)
                throw new InvalidOperationException("This teacher assignment already exists for the given class, section, subject, and academic year");

            var normalizedStatus = NormalizeStatus(request.Status, AllowedGeneralStatuses, "active", "teacher assignment");

            var assignment = new TeacherAssignment
            {
                Id = Guid.NewGuid(),
                SchoolId = request.SchoolId,
                StaffId = request.StaffId,
                ClassId = request.ClassId,
                SectionId = request.SectionId,
                SubjectId = request.SubjectId,
                IsClassTeacher = request.IsClassTeacher,
                AcademicYear = request.AcademicYear.Trim(),
                Status = normalizedStatus,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.TeacherAssignments.Add(assignment);
            await _context.SaveChangesAsync();

            // Auto-assign system role in Role Management based on assignment type
            try
            {
                await _permissionsService.AutoAssignAcademicRoleAsync(
                    request.StaffId,
                    request.IsClassTeacher,
                    request.SubjectId.HasValue && request.SubjectId != Guid.Empty,
                    request.SchoolId);
            }
            catch
            {
                // Role assignment is best-effort — do not fail the teacher assignment
            }

            // Reload with navigation properties so the response includes names.
            // Use IgnoreQueryFilters on the entry load so that the school/IsDeleted
            // global query filter on Class/Section/Subject does not null out the nav-props.
            var saved = await _context.TeacherAssignments
                .IgnoreQueryFilters()
                .Include(ta => ta.Staff)
                .Include(ta => ta.Class)
                .Include(ta => ta.Section)
                .Include(ta => ta.Subject)
                .FirstAsync(ta => ta.Id == assignment.Id);

            return MapToTeacherAssignmentResponse(saved);
        }

        public async Task<bool> RemoveTeacherAssignmentAsync(Guid id, Guid schoolId)
        {
            var assignment = await _context.TeacherAssignments
                .FirstOrDefaultAsync(ta => ta.Id == id && ta.SchoolId == schoolId);

            if (assignment == null) return false;

            var staffId  = assignment.StaffId;
            var classId  = assignment.ClassId;
            var subjectId = assignment.SubjectId;

            // When removing a subject-teacher assignment, also clear the ClassSubjects link
            // so the teacher no longer appears in the class subjects list.
            if (subjectId.HasValue)
            {
                var classSubject = await _context.ClassSubjects
                    .FirstOrDefaultAsync(cs => cs.SchoolId == schoolId
                        && cs.ClassId  == classId
                        && cs.SubjectId == subjectId.Value
                        && cs.TeacherId == staffId);
                if (classSubject != null)
                {
                    classSubject.TeacherId  = null;
                    classSubject.UpdatedAt = DateTime.UtcNow;
                }
            }

            _context.TeacherAssignments.Remove(assignment);
            await _context.SaveChangesAsync();

            // Revoke academic role if no remaining assignments
            try { await _permissionsService.RevokeAcademicRoleIfUnassignedAsync(staffId, schoolId); }
            catch { /* best-effort */ }

            return true;
        }

        public async Task<bool> UnsetClassTeacherFlagAsync(Guid id, Guid schoolId)
        {
            var assignment = await _context.TeacherAssignments
                .FirstOrDefaultAsync(ta => ta.Id == id && ta.SchoolId == schoolId);

            if (assignment == null) return false;

            if (!assignment.SubjectId.HasValue || assignment.SubjectId == Guid.Empty)
            {
                // Pure class-teacher-only record — remove it entirely
                _context.TeacherAssignments.Remove(assignment);
            }
            else
            {
                // Combined record (class teacher + subject) — only clear the flag
                assignment.IsClassTeacher = false;
                assignment.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            try { await _permissionsService.RevokeAcademicRoleIfUnassignedAsync(assignment.StaffId, schoolId); }
            catch { /* best-effort */ }

            return true;
        }

        public async Task<List<MyClassAssignmentDto>> GetMyClassTeacherAssignmentsAsync(Guid staffId, Guid schoolId)
        {
            // Return ALL assignments for this staff (class teacher + subject teacher).
            // IgnoreQueryFilters prevents the global school/IsDeleted filter on related
            // entities from silently nulling out Class/Section/Subject nav-props.
            var assignments = await _context.TeacherAssignments
                .IgnoreQueryFilters()
                .Include(ta => ta.Class)
                .Include(ta => ta.Section)
                .Include(ta => ta.Subject)
                .Where(ta => ta.StaffId == staffId && ta.SchoolId == schoolId
                    && ta.Status == "active" && !ta.IsDeleted)
                .ToListAsync();

            // Collect all classIds we'll need section data for
            var allClassIds = assignments.Select(ta => ta.ClassId).Distinct().ToList();

            // Also surface class-default subjects (ClassSubject.TeacherId) that have no
            // corresponding TeacherAssignment yet (legacy data or direct DB inserts).
            var taKeys = new HashSet<(Guid classId, Guid? subjectId)>(
                assignments.Select(t => (t.ClassId, t.SubjectId)));

            var classSubjectsForTeacher = await _context.ClassSubjects
                .IgnoreQueryFilters()
                .Include(cs => cs.Class)
                .Include(cs => cs.Subject)
                .Where(cs => cs.TeacherId == staffId && cs.SchoolId == schoolId && !cs.IsDeleted)
                .ToListAsync();

            var csClassIds = classSubjectsForTeacher
                .Where(cs => cs.Class != null)
                .Select(cs => cs.ClassId)
                .Distinct()
                .ToList();

            allClassIds = allClassIds.Union(csClassIds).ToList();

            // Fetch all sections for every relevant class so we can expand class-wide assignments
            var allSections = await _context.Sections
                .Where(s => s.SchoolId == schoolId && allClassIds.Contains(s.ClassId) && !s.IsDeleted && s.Status == "active")
                .Select(s => new { s.Id, s.ClassId, s.Name })
                .ToListAsync();

            var sectionsByClass = allSections
                .GroupBy(s => s.ClassId)
                .ToDictionary(g => g.Key, g => g.ToList());

            // Batch ACTIVE student count query — count active students per (Class.Name, Section.Name) pair
            var classNames = allClassIds
                .Select(cid => assignments.FirstOrDefault(ta => ta.ClassId == cid)?.Class?.Name
                             ?? classSubjectsForTeacher.FirstOrDefault(cs => cs.ClassId == cid)?.Class?.Name)
                .Where(n => !string.IsNullOrEmpty(n))
                .Distinct()
                .ToList()!;

            var studentGroups = await _context.Students
                .Where(s => s.SchoolId == schoolId && classNames.Contains(s.Class) && s.Status == "active")
                .GroupBy(s => new { s.Class, s.Section })
                .Select(g => new { g.Key.Class, g.Key.Section, Count = g.Count() })
                .ToListAsync();

            int GetStudentCount(string? className, string? sectionName)
            {
                if (string.IsNullOrEmpty(className)) return 0;
                return studentGroups
                    .Where(g => g.Class == className &&
                                (string.IsNullOrEmpty(sectionName) || g.Section == sectionName))
                    .Sum(g => g.Count);
            }

            // Helper: expand a single assignment into one entry per section (if class has sections)
            // or keep as-is (class-wide) when no sections exist.
            // assignmentGuid = the original ta/cs Guid; prefix allows composite IDs.
            List<MyClassAssignmentDto> ExpandBySections(
                Guid assignmentGuid,
                Guid classId,
                string className,
                Guid? subjectId,
                string? subjectName,
                bool isClassTeacher,
                string academicYear,
                string status)
            {
                var result = new List<MyClassAssignmentDto>();
                var sections = sectionsByClass.GetValueOrDefault(classId);
                if (sections != null && sections.Count > 0)
                {
                    foreach (var sec in sections)
                    {
                        // Composite ID ensures uniqueness per section even for shared assignment records
                        var compositeId = $"{assignmentGuid}|{sec.Id}";
                        result.Add(new MyClassAssignmentDto
                        {
                            AssignmentId = compositeId,
                            StaffId = staffId,
                            ClassId = classId,
                            ClassName = className,
                            SectionId = sec.Id,
                            SectionName = sec.Name,
                            SubjectId = subjectId,
                            SubjectName = subjectName,
                            IsClassTeacher = isClassTeacher,
                            AcademicYear = academicYear,
                            Status = status,
                            StudentCount = GetStudentCount(className, sec.Name),
                        });
                    }
                }
                else
                {
                    // No sections defined for this class — keep as class-wide card
                    result.Add(new MyClassAssignmentDto
                    {
                        AssignmentId = assignmentGuid.ToString(),
                        StaffId = staffId,
                        ClassId = classId,
                        ClassName = className,
                        SectionId = null,
                        SectionName = null,
                        SubjectId = subjectId,
                        SubjectName = subjectName,
                        IsClassTeacher = isClassTeacher,
                        AcademicYear = academicYear,
                        Status = status,
                        StudentCount = GetStudentCount(className, null),
                    });
                }
                return result;
            }

            var taList = new List<MyClassAssignmentDto>();

            foreach (var ta in assignments)
            {
                if (ta.Class == null) continue;

                if (ta.SectionId.HasValue)
                {
                    // Already section-specific — use directly without expansion
                    taList.Add(new MyClassAssignmentDto
                    {
                        AssignmentId = ta.Id.ToString(),
                        StaffId = staffId,
                        ClassId = ta.ClassId,
                        ClassName = ta.Class.Name,
                        SectionId = ta.SectionId,
                        SectionName = ta.Section?.Name,
                        SubjectId = ta.SubjectId,
                        SubjectName = ta.Subject?.Name,
                        IsClassTeacher = ta.IsClassTeacher,
                        AcademicYear = ta.AcademicYear,
                        Status = ta.Status,
                        StudentCount = GetStudentCount(ta.Class.Name, ta.Section?.Name),
                    });
                }
                else
                {
                    // Class-wide assignment — expand per section
                    taList.AddRange(ExpandBySections(
                        ta.Id, ta.ClassId, ta.Class.Name,
                        ta.SubjectId, ta.Subject?.Name,
                        ta.IsClassTeacher, ta.AcademicYear, ta.Status));
                }
            }

            // Track which (classId, sectionId, subjectId) combos are already covered
            // so ClassSubject entries don't create duplicate cards
            var coveredKeys = new HashSet<(Guid classId, Guid? sectionId, Guid? subjectId)>(
                taList.Select(t => (t.ClassId, t.SectionId, t.SubjectId)));

            foreach (var cs in classSubjectsForTeacher)
            {
                if (cs.Class == null) continue;
                if (taKeys.Contains((cs.ClassId, cs.SubjectId))) continue; // TeacherAssignment already covers it

                var expandedCs = ExpandBySections(
                    cs.Id, cs.ClassId, cs.Class.Name,
                    cs.SubjectId, cs.Subject?.Name,
                    false, cs.AcademicYear ?? string.Empty, cs.Status);

                foreach (var entry in expandedCs)
                {
                    // Skip if this exact (class, section, subject) combo was already added
                    if (coveredKeys.Contains((entry.ClassId, entry.SectionId, entry.SubjectId))) continue;
                    taList.Add(entry);
                    coveredKeys.Add((entry.ClassId, entry.SectionId, entry.SubjectId));
                }
            }

            return taList;
        }

        // Get my class assignments by user email (looks up StaffMember by email)
        public async Task<List<MyClassAssignmentDto>> GetMyClassTeacherAssignmentsByEmailAsync(string userEmail, Guid schoolId)
        {
            if (string.IsNullOrEmpty(userEmail))
            {
                return new List<MyClassAssignmentDto>();
            }

            // Find the StaffMember associated with this email
            var staff = await _context.StaffMembers
                .Where(s => s.Email == userEmail && s.SchoolId == schoolId && !s.IsDeleted)
                .FirstOrDefaultAsync();

            if (staff == null)
            {
                return new List<MyClassAssignmentDto>();
            }

            // Get assignments using the StaffMember ID
            return await GetMyClassTeacherAssignmentsAsync(staff.Id, schoolId);
        }

        // Helper: upsert class teacher assignment for a section
        private async Task UpsertClassTeacherAssignmentAsync(Guid schoolId, Guid classId, Guid sectionId, Guid staffId)
        {
            // Remove existing class teacher for this section
            var existing = await _context.TeacherAssignments
                .Where(ta => ta.SchoolId == schoolId && ta.SectionId == sectionId && ta.IsClassTeacher)
                .ToListAsync();
            _context.TeacherAssignments.RemoveRange(existing);

            // Add new assignment
            var assignment = new TeacherAssignment
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                StaffId = staffId,
                ClassId = classId,
                SectionId = sectionId,
                IsClassTeacher = true,
                AcademicYear = DateTime.UtcNow.Year + "-" + (DateTime.UtcNow.Year + 1),
                Status = "active",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.TeacherAssignments.Add(assignment);
            await _context.SaveChangesAsync();

            // Auto-elevate to Class Teacher role in Role Management
            try { await _permissionsService.AutoAssignAcademicRoleAsync(staffId, isClassTeacher: true, hasSubject: false, schoolId); }
            catch { /* best-effort */ }
        }

        private async Task RemoveClassTeacherAssignmentAsync(Guid schoolId, Guid sectionId)
        {
            var existing = await _context.TeacherAssignments
                .Where(ta => ta.SchoolId == schoolId && ta.SectionId == sectionId && ta.IsClassTeacher)
                .ToListAsync();
            if (existing.Any())
            {
                _context.TeacherAssignments.RemoveRange(existing);
                await _context.SaveChangesAsync();
            }
        }

        // Mappers
        private static ClassResponse MapToClassResponse(
            Class classEntity,
            string standard,
            string section,
            string academicYear,
            int totalStudents,
            string? classTeacher = null,
            Guid? classTeacherId = null)
        {
            return new ClassResponse
            {
                Id = classEntity.Id,
                SchoolId = classEntity.SchoolId,
                Name = classEntity.Name,
                Standard = standard,
                Section = section,
                AcademicYear = academicYear,
                TotalStudents = totalStudents,
                ClassTeacher = classTeacher,
                ClassTeacherId = classTeacherId,
                Code = classEntity.Code,
                Board = classEntity.Board,
                BoardConfigurationId = classEntity.BoardConfigurationId,
                BoardName = classEntity.BoardConfig?.Name,
                Capacity = classEntity.Capacity,
                Status = classEntity.Status,
                CreatedAt = classEntity.CreatedAt,
                UpdatedAt = classEntity.UpdatedAt
            };
        }

        private static SectionResponse MapToSectionResponse(Section section, string className, int totalStudents)
        {
            return new SectionResponse
            {
                Id = section.Id,
                SchoolId = section.SchoolId,
                ClassId = section.ClassId,
                Name = section.Name,
                ClassName = className,
                Capacity = section.Capacity,
                StudentsCount = totalStudents,
                TotalStudents = totalStudents,
                Status = section.Status,
                CreatedAt = section.CreatedAt,
                UpdatedAt = section.UpdatedAt
            };
        }

        private static string NormalizeClassName(CreateClassRequest request)
        {
            if (!string.IsNullOrWhiteSpace(request.Name)) return request.Name.Trim();
            if (!string.IsNullOrWhiteSpace(request.Standard)) return request.Standard.Trim();
            return string.Empty;
        }

        private async Task<string> GetCurrentAcademicYearNameAsync(Guid schoolId)
        {
            var now = DateTime.UtcNow;
            var active = await _context.AcademicYears
                .Where(y => y.SchoolId == schoolId && y.StartDate <= now && y.EndDate >= now)
                .OrderByDescending(y => y.StartDate)
                .Select(y => y.Name)
                .FirstOrDefaultAsync();

            if (!string.IsNullOrWhiteSpace(active)) return active;

            var latest = await _context.AcademicYears
                .Where(y => y.SchoolId == schoolId)
                .OrderByDescending(y => y.EndDate)
                .Select(y => y.Name)
                .FirstOrDefaultAsync();

            return latest ?? string.Empty;
        }

        private async Task EnsureClassSectionDataFromStudentsAsync(Guid schoolId)
        {
            var studentGroups = await _context.Students
                .Where(s => s.SchoolId == schoolId
                    && !string.IsNullOrWhiteSpace(s.Class)
                    && !string.IsNullOrWhiteSpace(s.Section)
                    && s.Status == "active")
                .GroupBy(s => new { s.Class, s.Section })
                .Select(g => new
                {
                    ClassName = g.Key.Class.Trim(),
                    SectionName = g.Key.Section.Trim(),
                    Count = g.Count()
                })
                .ToListAsync();

            // Keys of sections that have at least one active student
            var coveredKeys = new HashSet<string>(
                studentGroups.Select(g =>
                    $"{g.ClassName.Trim().ToLowerInvariant()}|{g.SectionName.Trim().ToLowerInvariant()}"));

            var existingClasses = await _context.Classes
                .Where(c => c.SchoolId == schoolId)
                .ToListAsync();

            var classMap = existingClasses.ToDictionary(c => c.Name.Trim().ToLowerInvariant(), c => c);
            var dirty = false;

            // Create any missing class entries for classes that have active students
            foreach (var className in studentGroups.Select(g => g.ClassName).Distinct())
            {
                var key = className.Trim().ToLowerInvariant();
                if (classMap.ContainsKey(key)) continue;

                var cls = new Class
                {
                    Id = Guid.NewGuid(),
                    SchoolId = schoolId,
                    Name = className,
                    Code = className,
                    Status = "active",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.Classes.Add(cls);
                classMap[key] = cls;
                dirty = true;
            }

            if (dirty)
            {
                await _context.SaveChangesAsync();
            }

            // Load ALL sections for the school so we can zero out empty ones too
            var allClassIds = classMap.Values.Select(c => c.Id).ToList();
            var sections = await _context.Sections
                .Where(s => s.SchoolId == schoolId && allClassIds.Contains(s.ClassId))
                .ToListAsync();

            // Update / create sections that have active students
            foreach (var g in studentGroups)
            {
                if (!classMap.TryGetValue(g.ClassName.Trim().ToLowerInvariant(), out var classEntity)) continue;

                var section = sections.FirstOrDefault(s =>
                    s.ClassId == classEntity.Id &&
                    string.Equals(s.Name, g.SectionName, StringComparison.OrdinalIgnoreCase));

                if (section == null)
                {
                    section = new Section
                    {
                        Id = Guid.NewGuid(),
                        SchoolId = schoolId,
                        ClassId = classEntity.Id,
                        Name = g.SectionName,
                        StudentsCount = g.Count,
                        Status = "active",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _context.Sections.Add(section);
                    sections.Add(section);
                    dirty = true;
                }
                else if (section.StudentsCount != g.Count)
                {
                    section.StudentsCount = g.Count;
                    section.UpdatedAt = DateTime.UtcNow;
                    dirty = true;
                }
            }

            // Zero out sections whose active-student count has dropped to 0
            var classIdToName = classMap.ToDictionary(kv => kv.Value.Id, kv => kv.Key);
            foreach (var section in sections)
            {
                if (section.StudentsCount == 0) continue;
                if (!classIdToName.TryGetValue(section.ClassId, out var classKey)) continue;
                var sectionKey = $"{classKey}|{section.Name.Trim().ToLowerInvariant()}";
                if (!coveredKeys.Contains(sectionKey))
                {
                    section.StudentsCount = 0;
                    section.UpdatedAt = DateTime.UtcNow;
                    dirty = true;
                }
            }

            if (dirty)
            {
                await _context.SaveChangesAsync();
            }
        }

        private static SubjectResponse MapToSubjectResponse(Subject subject)
        {
            return new SubjectResponse
            {
                Id = subject.Id,
                SchoolId = subject.SchoolId,
                Name = subject.Name,
                Code = subject.Code,
                Type = subject.Type,
                SubjectTypeId = subject.SubjectTypeId,
                SubjectTypeName = subject.SubjectTypeRef?.Name,
                BoardConfigurationId = subject.BoardConfigurationId,
                BoardName = subject.BoardConfig?.Name,
                MaxMarks = subject.MaxMarks,
                TheoryMaxMarks = subject.TheoryMaxMarks,
                PracticalMaxMarks = subject.PracticalMaxMarks,
                PassMarks = subject.PassMarks,
                Description = subject.Description,
                Status = subject.Status,
                CreatedAt = subject.CreatedAt,
                UpdatedAt = subject.UpdatedAt
            };
        }

        private static ClassSubjectResponse MapToClassSubjectResponse(
            ClassSubject classSubject,
            HashSet<string>? validTeacherPairs = null)
        {
            // A teacher is only shown if:
            //   1. They are not inactive
            //   2. They have an active TeacherAssignment for this class+subject
            //      (validTeacherPairs == null means skip the assignment check)
            var teacherActive = classSubject.TeacherId.HasValue
                && classSubject.Teacher?.Status?.ToLower() != "inactive";
            var teacherHasAssignment = validTeacherPairs == null
                || validTeacherPairs.Contains($"{classSubject.TeacherId}|{classSubject.SubjectId}");
            var showTeacher = teacherActive && teacherHasAssignment;

            return new ClassSubjectResponse
            {
                Id = classSubject.Id,
                SchoolId = classSubject.SchoolId,
                ClassId = classSubject.ClassId,
                SubjectId = classSubject.SubjectId,
                TeacherId = showTeacher ? classSubject.TeacherId : null,
                SubjectName = classSubject.Subject?.Name,
                SubjectCode = classSubject.Subject?.Code,
                SubjectType = classSubject.Subject?.Type,
                SubjectTypeId = classSubject.SubjectTypeId,
                SubjectTypeName = classSubject.SubjectType?.Name,
                TeacherName = showTeacher
                    ? (classSubject.Teacher != null ? $"{classSubject.Teacher.FirstName} {classSubject.Teacher.LastName}".Trim() : null)
                    : null,
                AcademicYear = classSubject.AcademicYear,
                MaxMarks = classSubject.MaxMarks,
                TheoryMaxMarks = classSubject.TheoryMaxMarks,
                PracticalMaxMarks = classSubject.PracticalMaxMarks,
                Credits = classSubject.Credits,
                IsMandatory = classSubject.IsMandatory,
                Status = classSubject.Status,
                CreatedAt = classSubject.CreatedAt,
                UpdatedAt = classSubject.UpdatedAt
            };
        }

        private static TeacherAssignmentResponse MapToTeacherAssignmentResponse(TeacherAssignment assignment)
        {
            var staffName = assignment.Staff != null
                ? $"{assignment.Staff.FirstName} {assignment.Staff.LastName}".Trim()
                : string.Empty;

            return new TeacherAssignmentResponse
            {
                Id = assignment.Id,
                SchoolId = assignment.SchoolId,
                StaffId = assignment.StaffId,
                StaffName = staffName,
                ClassId = assignment.ClassId,
                ClassName = assignment.Class?.Name ?? string.Empty,
                SectionId = assignment.SectionId,
                SectionName = assignment.Section?.Name,
                SubjectId = assignment.SubjectId,
                SubjectName = assignment.Subject?.Name,
                IsClassTeacher = assignment.IsClassTeacher,
                AcademicYear = assignment.AcademicYear,
                Status = assignment.Status,
                CreatedAt = assignment.CreatedAt,
                UpdatedAt = assignment.UpdatedAt
            };
        }

        // Class Settings Implementation
        public async Task<ClassSettingsResponse?> GetClassSettingsAsync(Guid classId, Guid schoolId)
        {
            var settings = await _context.ClassSettings
                .FirstOrDefaultAsync(cs => cs.ClassId == classId && cs.SchoolId == schoolId && !cs.IsDeleted);

            if (settings == null)
            {
                // Return default settings if not found
                return new ClassSettingsResponse
                {
                    Id = Guid.NewGuid(),
                    SchoolId = schoolId,
                    ClassId = classId,
                    PassingPercentage = 35,
                    MinimumAttendance = 75,
                    GradingScale = "4.0",
                    PromotionPolicy = "strict",
                    EnableAutoPromotion = true,
                    EnableSupplementaryExams = true,
                    EnableGradingForPromotion = true
                };
            }

            return new ClassSettingsResponse
            {
                Id = settings.Id,
                SchoolId = settings.SchoolId,
                ClassId = settings.ClassId,
                PassingPercentage = settings.PassingPercentage,
                MinimumAttendance = settings.MinimumAttendance,
                GradingScale = settings.GradingScale,
                PromotionPolicy = settings.PromotionPolicy,
                CustomPromotionPolicy = settings.CustomPromotionPolicy,
                EnableAutoPromotion = settings.EnableAutoPromotion,
                EnableSupplementaryExams = settings.EnableSupplementaryExams,
                EnableGradingForPromotion = settings.EnableGradingForPromotion,
                MinSubjectsToPass = settings.MinSubjectsToPass,
                Notes = settings.Notes,
                CreatedAt = settings.CreatedAt,
                UpdatedAt = settings.UpdatedAt
            };
        }

        private static readonly HashSet<string> AllowedGradingScales = new(StringComparer.OrdinalIgnoreCase)
        {
            "4.0", "5.0", "10.0", "percentage"
        };
        private static readonly HashSet<string> AllowedPromotionPolicies = new(StringComparer.OrdinalIgnoreCase)
        {
            "strict", "lenient", "flexible", "automatic"
        };

        public async Task<ClassSettingsResponse> CreateClassSettingsAsync(CreateClassSettingsRequest request)
        {
            // VALIDATION 1: Class exists
            var classExists = await _context.Classes.AnyAsync(c => c.Id == request.ClassId && c.SchoolId == request.SchoolId);
            if (!classExists)
                throw new InvalidOperationException("The specified class does not exist.");

            // VALIDATION 2: Settings already exist
            var existing = await _context.ClassSettings
                .FirstOrDefaultAsync(cs => cs.ClassId == request.ClassId && cs.SchoolId == request.SchoolId && !cs.IsDeleted);
            if (existing != null)
                throw new InvalidOperationException("Settings for this class already exist.");

            // VALIDATION 3: Bounds
            if (request.PassingPercentage < 0 || request.PassingPercentage > 100)
                throw new ArgumentException("Passing percentage must be between 0 and 100");
            if (request.MinimumAttendance < 0 || request.MinimumAttendance > 100)
                throw new ArgumentException("Minimum attendance must be between 0 and 100");
            if (!string.IsNullOrEmpty(request.GradingScale) && !AllowedGradingScales.Contains(request.GradingScale))
                throw new ArgumentException("Grading scale must be one of: 4.0, 5.0, 10.0, percentage");
            if (!string.IsNullOrEmpty(request.PromotionPolicy) && !AllowedPromotionPolicies.Contains(request.PromotionPolicy))
                throw new ArgumentException("Promotion policy must be one of: strict, lenient, flexible, automatic");
            if (request.MinSubjectsToPass.HasValue && request.MinSubjectsToPass < 0)
                throw new ArgumentException("Minimum subjects to pass cannot be negative");

            var settings = new ClassSettings
            {
                Id = Guid.NewGuid(),
                SchoolId = request.SchoolId,
                ClassId = request.ClassId,
                PassingPercentage = request.PassingPercentage,
                MinimumAttendance = request.MinimumAttendance,
                GradingScale = request.GradingScale,
                PromotionPolicy = request.PromotionPolicy,
                CustomPromotionPolicy = request.CustomPromotionPolicy,
                EnableAutoPromotion = request.EnableAutoPromotion,
                EnableSupplementaryExams = request.EnableSupplementaryExams,
                EnableGradingForPromotion = request.EnableGradingForPromotion,
                MinSubjectsToPass = request.MinSubjectsToPass,
                Notes = request.Notes,
                Status = "Active",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.ClassSettings.Add(settings);
            await _context.SaveChangesAsync();

            return new ClassSettingsResponse
            {
                Id = settings.Id,
                SchoolId = settings.SchoolId,
                ClassId = settings.ClassId,
                PassingPercentage = settings.PassingPercentage,
                MinimumAttendance = settings.MinimumAttendance,
                GradingScale = settings.GradingScale,
                PromotionPolicy = settings.PromotionPolicy,
                CustomPromotionPolicy = settings.CustomPromotionPolicy,
                EnableAutoPromotion = settings.EnableAutoPromotion,
                EnableSupplementaryExams = settings.EnableSupplementaryExams,
                EnableGradingForPromotion = settings.EnableGradingForPromotion,
                MinSubjectsToPass = settings.MinSubjectsToPass,
                Notes = settings.Notes,
                CreatedAt = settings.CreatedAt,
                UpdatedAt = settings.UpdatedAt
            };
        }

        public async Task<ClassSettingsResponse?> UpdateClassSettingsAsync(Guid settingsId, UpdateClassSettingsRequest request, Guid schoolId)
        {
            var settings = await _context.ClassSettings
                .FirstOrDefaultAsync(cs => cs.Id == settingsId && cs.SchoolId == schoolId && !cs.IsDeleted);

            if (settings == null) return null;

            // Bounds validation
            if (request.PassingPercentage.HasValue && (request.PassingPercentage.Value < 0 || request.PassingPercentage.Value > 100))
                throw new ArgumentException("Passing percentage must be between 0 and 100");
            if (request.MinimumAttendance.HasValue && (request.MinimumAttendance.Value < 0 || request.MinimumAttendance.Value > 100))
                throw new ArgumentException("Minimum attendance must be between 0 and 100");
            if (!string.IsNullOrEmpty(request.GradingScale) && !AllowedGradingScales.Contains(request.GradingScale))
                throw new ArgumentException("Grading scale must be one of: 4.0, 5.0, 10.0, percentage");
            if (!string.IsNullOrEmpty(request.PromotionPolicy) && !AllowedPromotionPolicies.Contains(request.PromotionPolicy))
                throw new ArgumentException("Promotion policy must be one of: strict, lenient, flexible, automatic");
            if (request.MinSubjectsToPass.HasValue && request.MinSubjectsToPass.Value < 0)
                throw new ArgumentException("Minimum subjects to pass cannot be negative");

            if (request.PassingPercentage.HasValue) settings.PassingPercentage = request.PassingPercentage.Value;
            if (request.MinimumAttendance.HasValue) settings.MinimumAttendance = request.MinimumAttendance.Value;
            if (!string.IsNullOrEmpty(request.GradingScale)) settings.GradingScale = request.GradingScale;
            if (!string.IsNullOrEmpty(request.PromotionPolicy)) settings.PromotionPolicy = request.PromotionPolicy;
            if (request.CustomPromotionPolicy != null) settings.CustomPromotionPolicy = request.CustomPromotionPolicy;
            if (request.EnableAutoPromotion.HasValue) settings.EnableAutoPromotion = request.EnableAutoPromotion.Value;
            if (request.EnableSupplementaryExams.HasValue) settings.EnableSupplementaryExams = request.EnableSupplementaryExams.Value;
            if (request.EnableGradingForPromotion.HasValue) settings.EnableGradingForPromotion = request.EnableGradingForPromotion.Value;
            if (request.MinSubjectsToPass.HasValue) settings.MinSubjectsToPass = request.MinSubjectsToPass.Value;
            if (request.Notes != null) settings.Notes = request.Notes;

            settings.UpdatedAt = DateTime.UtcNow;
            _context.ClassSettings.Update(settings);
            await _context.SaveChangesAsync();

            return new ClassSettingsResponse
            {
                Id = settings.Id,
                SchoolId = settings.SchoolId,
                ClassId = settings.ClassId,
                PassingPercentage = settings.PassingPercentage,
                MinimumAttendance = settings.MinimumAttendance,
                GradingScale = settings.GradingScale,
                PromotionPolicy = settings.PromotionPolicy,
                CustomPromotionPolicy = settings.CustomPromotionPolicy,
                EnableAutoPromotion = settings.EnableAutoPromotion,
                EnableSupplementaryExams = settings.EnableSupplementaryExams,
                EnableGradingForPromotion = settings.EnableGradingForPromotion,
                MinSubjectsToPass = settings.MinSubjectsToPass,
                Notes = settings.Notes,
                CreatedAt = settings.CreatedAt,
                UpdatedAt = settings.UpdatedAt
            };
        }

        public async Task<bool> DeleteClassSettingsAsync(Guid settingsId, Guid schoolId)
        {
            var settings = await _context.ClassSettings
                .FirstOrDefaultAsync(cs => cs.Id == settingsId && cs.SchoolId == schoolId && !cs.IsDeleted);

            if (settings == null) return false;

            settings.IsDeleted = true;
            settings.DeletedAt = DateTime.UtcNow;
            _context.ClassSettings.Update(settings);
            await _context.SaveChangesAsync();

            return true;
        }

        // Grade Tiers Implementation
        public async Task<GradeTierListResponse> GetGradeTiersAsync(Guid classId, Guid schoolId)
        {
            var gradeTiers = await _context.GradeTiers
                .Where(gt => gt.ClassId == classId && gt.SchoolId == schoolId && !gt.IsDeleted)
                .OrderBy(gt => gt.DisplayOrder)
                .ToListAsync();

            return new GradeTierListResponse
            {
                GradeTiers = gradeTiers.Select(gt => new GradeTierResponse
                {
                    Id = gt.Id,
                    SchoolId = gt.SchoolId,
                    ClassId = gt.ClassId,
                    Grade = gt.Grade,
                    MinMarks = gt.MinMarks,
                    MaxMarks = gt.MaxMarks,
                    GPA = gt.GPA,
                    DisplayOrder = gt.DisplayOrder,
                    CreatedAt = gt.CreatedAt,
                    UpdatedAt = gt.UpdatedAt
                }).ToList(),
                Total = gradeTiers.Count
            };
        }

        public async Task<GradeTierResponse> CreateGradeTierAsync(CreateGradeTierRequest request)
        {
            EnsureSchoolId(request.SchoolId);

            // VALIDATION 1: Grade label required
            if (string.IsNullOrWhiteSpace(request.Grade))
                throw new ArgumentException("Grade label is required");
            if (request.Grade.Trim().Length > 10)
                throw new ArgumentException("Grade label cannot exceed 10 characters");

            // VALIDATION 2: Class exists
            var classExists = await _context.Classes
                .AnyAsync(c => c.Id == request.ClassId && c.SchoolId == request.SchoolId);
            if (!classExists)
                throw new KeyNotFoundException("Class does not exist in this school");

            // VALIDATION 3: Marks bounds
            if (request.MinMarks < 0 || request.MinMarks > 100)
                throw new ArgumentException("Minimum marks must be between 0 and 100");
            if (request.MaxMarks < 0 || request.MaxMarks > 100)
                throw new ArgumentException("Maximum marks must be between 0 and 100");
            if (request.MinMarks >= request.MaxMarks)
                throw new ArgumentException("Minimum marks must be less than maximum marks");

            // VALIDATION 4: GPA bounds
            if (request.GPA < 0 || request.GPA > 10)
                throw new ArgumentException("GPA must be between 0 and 10");

            // VALIDATION 5: Duplicate grade label for this class
            var duplicateGrade = await _context.GradeTiers
                .AnyAsync(gt => gt.ClassId == request.ClassId && gt.SchoolId == request.SchoolId
                    && gt.Grade.ToLower() == request.Grade.Trim().ToLower() && !gt.IsDeleted);
            if (duplicateGrade)
                throw new InvalidOperationException("A grade tier with this label already exists for this class");

            // VALIDATION 6: Overlapping range check
            var overlapping = await _context.GradeTiers
                .AnyAsync(gt => gt.ClassId == request.ClassId && gt.SchoolId == request.SchoolId && !gt.IsDeleted
                    && gt.MinMarks < request.MaxMarks && gt.MaxMarks > request.MinMarks);
            if (overlapping)
                throw new InvalidOperationException("Grade tier marks range overlaps with an existing grade tier");

            var gradeTier = new GradeTier
            {
                Id = Guid.NewGuid(),
                SchoolId = request.SchoolId,
                ClassId = request.ClassId,
                Grade = request.Grade.Trim(),
                MinMarks = request.MinMarks,
                MaxMarks = request.MaxMarks,
                GPA = request.GPA,
                DisplayOrder = request.DisplayOrder,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.GradeTiers.Add(gradeTier);
            await _context.SaveChangesAsync();

            return new GradeTierResponse
            {
                Id = gradeTier.Id,
                SchoolId = gradeTier.SchoolId,
                ClassId = gradeTier.ClassId,
                Grade = gradeTier.Grade,
                MinMarks = gradeTier.MinMarks,
                MaxMarks = gradeTier.MaxMarks,
                GPA = gradeTier.GPA,
                DisplayOrder = gradeTier.DisplayOrder,
                CreatedAt = gradeTier.CreatedAt,
                UpdatedAt = gradeTier.UpdatedAt
            };
        }

        public async Task<GradeTierResponse?> UpdateGradeTierAsync(Guid id, UpdateGradeTierRequest request, Guid schoolId)
        {
            var gradeTier = await _context.GradeTiers
                .FirstOrDefaultAsync(gt => gt.Id == id && gt.SchoolId == schoolId && !gt.IsDeleted);

            if (gradeTier == null) return null;

            if (request.MinMarks.HasValue && (request.MinMarks.Value < 0 || request.MinMarks.Value > 100))
                throw new ArgumentException("Minimum marks must be between 0 and 100");
            if (request.MaxMarks.HasValue && (request.MaxMarks.Value < 0 || request.MaxMarks.Value > 100))
                throw new ArgumentException("Maximum marks must be between 0 and 100");
            var newMin = request.MinMarks ?? gradeTier.MinMarks;
            var newMax = request.MaxMarks ?? gradeTier.MaxMarks;
            if (newMin >= newMax)
                throw new ArgumentException("Minimum marks must be less than maximum marks");
            if (request.GPA.HasValue && (request.GPA.Value < 0 || request.GPA.Value > 10))
                throw new ArgumentException("GPA must be between 0 and 10");

            if (!string.IsNullOrEmpty(request.Grade)) gradeTier.Grade = request.Grade;
            if (request.MinMarks.HasValue) gradeTier.MinMarks = request.MinMarks.Value;
            if (request.MaxMarks.HasValue) gradeTier.MaxMarks = request.MaxMarks.Value;
            if (request.GPA.HasValue) gradeTier.GPA = request.GPA.Value;
            if (request.DisplayOrder.HasValue) gradeTier.DisplayOrder = request.DisplayOrder.Value;

            gradeTier.UpdatedAt = DateTime.UtcNow;
            _context.GradeTiers.Update(gradeTier);
            await _context.SaveChangesAsync();

            return new GradeTierResponse
            {
                Id = gradeTier.Id,
                SchoolId = gradeTier.SchoolId,
                ClassId = gradeTier.ClassId,
                Grade = gradeTier.Grade,
                MinMarks = gradeTier.MinMarks,
                MaxMarks = gradeTier.MaxMarks,
                GPA = gradeTier.GPA,
                DisplayOrder = gradeTier.DisplayOrder,
                CreatedAt = gradeTier.CreatedAt,
                UpdatedAt = gradeTier.UpdatedAt
            };
        }

        public async Task<bool> DeleteGradeTierAsync(Guid id, Guid schoolId)
        {
            var gradeTier = await _context.GradeTiers
                .FirstOrDefaultAsync(gt => gt.Id == id && gt.SchoolId == schoolId && !gt.IsDeleted);

            if (gradeTier == null) return false;

            gradeTier.IsDeleted = true;
            gradeTier.DeletedAt = DateTime.UtcNow;
            _context.GradeTiers.Update(gradeTier);
            await _context.SaveChangesAsync();

            return true;
        }

        // Timetable Implementation
        public async Task<TimetableEntryListResponse> GetSectionTimetableAsync(Guid sectionId, Guid schoolId)
        {
            var entries = await _context.Timetable
                .Include(t => t.Subject)
                .Include(t => t.Teacher)
                .Where(t => t.SectionId == sectionId && t.SchoolId == schoolId && !t.IsDeleted)
                .OrderBy(t => t.DayOfWeek)
                .ThenBy(t => t.Period)
                .ToListAsync();

            return new TimetableEntryListResponse
            {
                Entries = entries.Select(t => new TimetableEntryResponse
                {
                    Id = t.Id,
                    SchoolId = t.SchoolId,
                    SectionId = t.SectionId,
                    DayOfWeek = t.DayOfWeek,
                    Period = t.Period,
                    SubjectId = t.SubjectId,
                    SubjectName = t.Subject?.Name ?? string.Empty,
                    TeacherId = t.TeacherId,
                    TeacherName = t.Teacher != null ? $"{t.Teacher.FirstName} {t.Teacher.LastName}" : null,
                    StartTime = t.StartTime,
                    EndTime = t.EndTime,
                    CreatedAt = t.CreatedAt,
                    UpdatedAt = t.UpdatedAt
                }).ToList(),
                Total = entries.Count
            };
        }

        private static readonly HashSet<string> AllowedDaysOfWeek = new(StringComparer.OrdinalIgnoreCase)
        {
            "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
        };

        public async Task<TimetableEntryResponse> CreateTimetableEntryAsync(CreateTimetableEntryRequest request)
        {
            EnsureSchoolId(request.SchoolId);
            // VALIDATION 1: Section exists
            var sectionExists = await _context.Sections
                .AnyAsync(s => s.Id == request.SectionId && s.SchoolId == request.SchoolId);
            if (!sectionExists)
                throw new KeyNotFoundException("Section does not exist in this school");
            // VALIDATION 2: Subject exists
            var subjectExists = await _context.Subjects
                .AnyAsync(s => s.Id == request.SubjectId && s.SchoolId == request.SchoolId);
            if (!subjectExists)
                throw new KeyNotFoundException("Subject does not exist in this school");
            // VALIDATION 3: Day of week valid
            if (string.IsNullOrWhiteSpace(request.DayOfWeek) || !AllowedDaysOfWeek.Contains(request.DayOfWeek.Trim()))
                throw new ArgumentException("Day of week must be one of: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday");
            // VALIDATION 4: Period bounds
            if (request.Period < 1 || request.Period > 12)
                throw new ArgumentException("Period must be between 1 and 12");
            // VALIDATION 5: Duplicate slot check
            var duplicate = await _context.Timetable
                .AnyAsync(t => t.SectionId == request.SectionId && t.SchoolId == request.SchoolId
                    && t.DayOfWeek.ToLower() == request.DayOfWeek.Trim().ToLower()
                    && t.Period == request.Period && !t.IsDeleted);
            if (duplicate)
                throw new InvalidOperationException("A timetable entry already exists for this section, day, and period");

            var entry = new TimetableEntry
            {
                Id = Guid.NewGuid(),
                SchoolId = request.SchoolId,
                SectionId = request.SectionId,
                DayOfWeek = request.DayOfWeek.Trim(),
                Period = request.Period,
                SubjectId = request.SubjectId,
                TeacherId = request.TeacherId,
                StartTime = request.StartTime,
                EndTime = request.EndTime,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Timetable.Add(entry);
            await _context.SaveChangesAsync();

            var subject = await _context.Subjects.FindAsync(request.SubjectId);
            var teacher = request.TeacherId.HasValue ? await _context.StaffMembers.FindAsync(request.TeacherId.Value) : null;

            return new TimetableEntryResponse
            {
                Id = entry.Id,
                SchoolId = entry.SchoolId,
                SectionId = entry.SectionId,
                DayOfWeek = entry.DayOfWeek,
                Period = entry.Period,
                SubjectId = entry.SubjectId,
                SubjectName = subject?.Name ?? string.Empty,
                TeacherId = entry.TeacherId,
                TeacherName = teacher != null ? $"{teacher.FirstName} {teacher.LastName}" : null,
                StartTime = entry.StartTime,
                EndTime = entry.EndTime,
                CreatedAt = entry.CreatedAt,
                UpdatedAt = entry.UpdatedAt
            };
        }

        public async Task<TimetableEntryResponse?> UpdateTimetableEntryAsync(Guid id, UpdateTimetableEntryRequest request, Guid schoolId)
        {
            var entry = await _context.Timetable
                .Include(t => t.Subject)
                .Include(t => t.Teacher)
                .FirstOrDefaultAsync(t => t.Id == id && t.SchoolId == schoolId && !t.IsDeleted);

            if (entry == null) return null;

            if (!string.IsNullOrEmpty(request.DayOfWeek)) entry.DayOfWeek = request.DayOfWeek;
            if (request.Period.HasValue) entry.Period = request.Period.Value;
            if (request.SubjectId.HasValue) entry.SubjectId = request.SubjectId.Value;
            if (request.TeacherId.HasValue) entry.TeacherId = request.TeacherId.Value;
            if (request.StartTime != null) entry.StartTime = request.StartTime;
            if (request.EndTime != null) entry.EndTime = request.EndTime;

            entry.UpdatedAt = DateTime.UtcNow;
            _context.Timetable.Update(entry);
            await _context.SaveChangesAsync();

            return new TimetableEntryResponse
            {
                Id = entry.Id,
                SchoolId = entry.SchoolId,
                SectionId = entry.SectionId,
                DayOfWeek = entry.DayOfWeek,
                Period = entry.Period,
                SubjectId = entry.SubjectId,
                SubjectName = entry.Subject?.Name ?? string.Empty,
                TeacherId = entry.TeacherId,
                TeacherName = entry.Teacher != null ? $"{entry.Teacher.FirstName} {entry.Teacher.LastName}" : null,
                StartTime = entry.StartTime,
                EndTime = entry.EndTime,
                CreatedAt = entry.CreatedAt,
                UpdatedAt = entry.UpdatedAt
            };
        }

        public async Task<bool> DeleteTimetableEntryAsync(Guid id, Guid schoolId)
        {
            var entry = await _context.Timetable
                .FirstOrDefaultAsync(t => t.Id == id && t.SchoolId == schoolId && !t.IsDeleted);

            if (entry == null) return false;

            entry.IsDeleted = true;
            entry.DeletedAt = DateTime.UtcNow;
            _context.Timetable.Update(entry);
            await _context.SaveChangesAsync();

            return true;
        }

        // Grouped Classes Implementation
        public async Task<GroupedClassListResponse> GetGroupedClassesAsync(Guid schoolId)
        {
            var classes = await _context.Classes
                .Where(c => c.SchoolId == schoolId && !c.IsDeleted)
                .OrderBy(c => c.Name)
                .ToListAsync();

            var sections = await _context.Sections
                .Where(s => s.SchoolId == schoolId && !s.IsDeleted)
                .ToListAsync();

            var students = await _context.Students
                .Where(s => s.SchoolId == schoolId && !s.IsDeleted)
                .ToListAsync();

            var groupedClasses = classes.Select(c =>
            {
                var classSections = sections.Where(s => s.ClassId == c.Id).ToList();
                return new GroupedClassResponse
                {
                    ClassName = c.Name,
                    ClassId = c.Id,
                    SectionsCount = classSections.Count,
                    TotalStudents = students.Count(st => classSections.Any(s => s.Id.ToString() == st.Section)),
                    SectionIds = classSections.Select(s => s.Id).ToList(),
                    Sections = classSections.Select(s => new SectionBasicDto
                    {
                        Id = s.Id,
                        ClassId = s.ClassId,
                        Name = s.Name,
                        Capacity = s.Capacity,
                        StudentsCount = students.Count(st => st.Section == s.Id.ToString() && st.Class == c.Name),
                        Status = s.Status
                    }).ToList()
                };
            }).ToList();

            return new GroupedClassListResponse
            {
                GroupedClasses = groupedClasses,
                Total = groupedClasses.Count
            };
        }

        // Academic Years Implementation
        public async Task<AcademicYearListResponse> GetAcademicYearsAsync(Guid schoolId, int page = 1, int pageSize = 50)
        {
            EnsureSchoolId(schoolId);
            NormalizePagination(ref page, ref pageSize, 200);

            var query = _context.AcademicYears.Where(ay => ay.SchoolId == schoolId);

            // Self-heal: first-run DBs can be empty; seed defaults automatically.
            if (!await query.AnyAsync())
            {
                await SeedDefaultAcademicYearsAsync(schoolId);
                query = _context.AcademicYears.Where(ay => ay.SchoolId == schoolId);
            }

            var total = await query.CountAsync();
            var items = await query
                .OrderByDescending(ay => ay.StartDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new AcademicYearListResponse
            {
                AcademicYears = items.Select(ay => new AcademicYearResponse
                {
                    Id = ay.Id,
                    Name = ay.Name,
                    StartDate = ay.StartDate,
                    EndDate = ay.EndDate,
                    IsCurrent = ay.IsCurrent,
                    Status = ay.Status,
                    CreatedAt = ay.CreatedAt,
                    UpdatedAt = ay.UpdatedAt
                }).ToList(),
                Total = total,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<AcademicYearResponse?> GetAcademicYearByIdAsync(Guid id, Guid schoolId)
        {
            var ay = await _context.AcademicYears.FirstOrDefaultAsync(a => a.Id == id && a.SchoolId == schoolId);
            if (ay == null) return null;
            return new AcademicYearResponse
            {
                Id = ay.Id,
                Name = ay.Name,
                StartDate = ay.StartDate,
                EndDate = ay.EndDate,
                IsCurrent = ay.IsCurrent,
                Status = ay.Status,
                CreatedAt = ay.CreatedAt,
                UpdatedAt = ay.UpdatedAt
            };
        }

        public async Task<AcademicYearResponse> CreateAcademicYearAsync(Guid schoolId, CreateAcademicYearRequest request)
        {
            EnsureSchoolId(schoolId);
            var yearName = NormalizeRequiredText(request.Name, "Academic year name", 50);
            if (request.EndDate <= request.StartDate)
                throw new InvalidOperationException("Academic year end date must be after start date");

            var duplicateName = await _context.AcademicYears
                .AnyAsync(a => a.SchoolId == schoolId && a.Name.ToLower() == yearName.ToLower());
            if (duplicateName)
                throw new InvalidOperationException("An academic year with the same name already exists");

            var ay = new Models.Entities.AcademicYear
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                Name = yearName,
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                IsCurrent = false,
                Status = "active",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.AcademicYears.Add(ay);
            await _context.SaveChangesAsync();
            return new AcademicYearResponse
            {
                Id = ay.Id,
                Name = ay.Name,
                StartDate = ay.StartDate,
                EndDate = ay.EndDate,
                IsCurrent = ay.IsCurrent,
                Status = ay.Status,
                CreatedAt = ay.CreatedAt,
                UpdatedAt = ay.UpdatedAt
            };
        }

        public async Task<AcademicYearResponse?> UpdateAcademicYearAsync(Guid id, Guid schoolId, CreateAcademicYearRequest request)
        {
            EnsureSchoolId(schoolId);
            var ay = await _context.AcademicYears.FirstOrDefaultAsync(a => a.Id == id && a.SchoolId == schoolId);
            if (ay == null) return null;

            var yearName = NormalizeRequiredText(request.Name, "Academic year name", 50);
            if (request.EndDate <= request.StartDate)
                throw new InvalidOperationException("Academic year end date must be after start date");

            var duplicateName = await _context.AcademicYears
                .AnyAsync(a => a.SchoolId == schoolId && a.Id != id && a.Name.ToLower() == yearName.ToLower());
            if (duplicateName)
                throw new InvalidOperationException("An academic year with the same name already exists");

            ay.Name = yearName;
            ay.StartDate = request.StartDate;
            ay.EndDate = request.EndDate;
            ay.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return new AcademicYearResponse
            {
                Id = ay.Id,
                Name = ay.Name,
                StartDate = ay.StartDate,
                EndDate = ay.EndDate,
                IsCurrent = ay.IsCurrent,
                Status = ay.Status,
                CreatedAt = ay.CreatedAt,
                UpdatedAt = ay.UpdatedAt
            };
        }

        public async Task<AcademicYearResponse?> SetCurrentAcademicYearAsync(Guid id, Guid schoolId)
        {
            EnsureSchoolId(schoolId);
            var target = await _context.AcademicYears.FirstOrDefaultAsync(a => a.Id == id && a.SchoolId == schoolId);
            if (target == null) return null;

            // Clear isCurrent flag on all other years for this school
            var others = await _context.AcademicYears
                .Where(a => a.SchoolId == schoolId && a.Id != id && a.IsCurrent)
                .ToListAsync();
            foreach (var other in others)
            {
                other.IsCurrent = false;
                other.UpdatedAt = DateTime.UtcNow;
            }

            target.IsCurrent = true;
            target.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return new AcademicYearResponse
            {
                Id = target.Id,
                Name = target.Name,
                StartDate = target.StartDate,
                EndDate = target.EndDate,
                IsCurrent = target.IsCurrent,
                Status = target.Status,
                CreatedAt = target.CreatedAt,
                UpdatedAt = target.UpdatedAt
            };
        }

        public async Task<bool> DeleteAcademicYearAsync(Guid id, Guid schoolId)
        {
            var ay = await _context.AcademicYears.FirstOrDefaultAsync(a => a.Id == id && a.SchoolId == schoolId);
            if (ay == null) return false;
            _context.AcademicYears.Remove(ay);
            await _context.SaveChangesAsync();
            return true;
        }

        private async Task SeedDefaultAcademicYearsAsync(Guid schoolId)
        {
            var now = DateTime.UtcNow;
            var startYear = now.Month >= 4 ? now.Year : now.Year - 1;

            var previous = new AcademicYear
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                Name = $"{startYear - 1}-{startYear}",
                StartDate = new DateTime(startYear - 1, 4, 1, 0, 0, 0, DateTimeKind.Utc),
                EndDate = new DateTime(startYear, 3, 31, 23, 59, 59, DateTimeKind.Utc),
                IsCurrent = false,
                Status = "active",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            var current = new AcademicYear
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                Name = $"{startYear}-{startYear + 1}",
                StartDate = new DateTime(startYear, 4, 1, 0, 0, 0, DateTimeKind.Utc),
                EndDate = new DateTime(startYear + 1, 3, 31, 23, 59, 59, DateTimeKind.Utc),
                IsCurrent = true,
                Status = "active",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.AcademicYears.AddRange(previous, current);
            await _context.SaveChangesAsync();
        }

        // ── ExamType ─────────────────────────────────────────────────────────
        public async Task<ExamTypeListResponse> GetExamTypesAsync(Guid schoolId)
        {
            var entities = await _context.ExamTypes
                .Where(e => e.SchoolId == schoolId)
                .OrderBy(e => e.Name)
                .ToListAsync();
            var items = entities.Select(MapExamType).ToList();
            return new ExamTypeListResponse { ExamTypes = items, Total = items.Count };
        }

        public async Task<ExamTypeResponse?> GetExamTypeByIdAsync(Guid id, Guid schoolId)
        {
            var e = await _context.ExamTypes.FirstOrDefaultAsync(x => x.Id == id && x.SchoolId == schoolId);
            return e == null ? null : MapExamType(e);
        }

        public async Task<ExamTypeResponse> CreateExamTypeAsync(Guid schoolId, CreateExamTypeRequest req)
        {
            EnsureSchoolId(schoolId);
            var name = NormalizeRequiredText(req.Name, "Exam type name", 100);
            if (name.Length < 3)
                throw new ArgumentException("Exam type name must be at least 3 characters");
            if (req.DefaultMaxMarks <= 0 || req.DefaultMaxMarks > 1000)
                throw new ArgumentException("Default max marks must be between 1 and 1000");
            if (req.ExamsPerTerm < 1 || req.ExamsPerTerm > 20)
                throw new ArgumentException("Exams per term must be between 1 and 20");
            var duplicate = await _context.ExamTypes
                .AnyAsync(e => e.SchoolId == schoolId && e.Name.ToLower() == name.ToLower());
            if (duplicate)
                throw new InvalidOperationException("An exam type with the same name already exists");
            var entity = new ExamType
            {
                Id = Guid.NewGuid(), SchoolId = schoolId,
                Name = name, DefaultMaxMarks = req.DefaultMaxMarks,
                ExamsPerTerm = req.ExamsPerTerm, IsUnitTest = req.IsUnitTest,
                Description = req.Description, Status = "active",
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            };
            _context.ExamTypes.Add(entity);
            await _context.SaveChangesAsync();
            return MapExamType(entity);
        }

        public async Task<ExamTypeResponse?> UpdateExamTypeAsync(Guid id, Guid schoolId, CreateExamTypeRequest req)
        {
            var entity = await _context.ExamTypes.FirstOrDefaultAsync(x => x.Id == id && x.SchoolId == schoolId);
            if (entity == null) return null;
            var name = NormalizeRequiredText(req.Name, "Exam type name", 100);
            if (name.Length < 3)
                throw new ArgumentException("Exam type name must be at least 3 characters");
            if (req.DefaultMaxMarks <= 0 || req.DefaultMaxMarks > 1000)
                throw new ArgumentException("Default max marks must be between 1 and 1000");
            if (req.ExamsPerTerm < 1 || req.ExamsPerTerm > 20)
                throw new ArgumentException("Exams per term must be between 1 and 20");
            var duplicate = await _context.ExamTypes
                .AnyAsync(e => e.SchoolId == schoolId && e.Id != id && e.Name.ToLower() == name.ToLower());
            if (duplicate)
                throw new InvalidOperationException("An exam type with the same name already exists");
            entity.Name = name; entity.DefaultMaxMarks = req.DefaultMaxMarks;
            entity.ExamsPerTerm = req.ExamsPerTerm; entity.IsUnitTest = req.IsUnitTest;
            entity.Description = req.Description; entity.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return MapExamType(entity);
        }

        public async Task<bool> DeleteExamTypeAsync(Guid id, Guid schoolId)
        {
            var entity = await _context.ExamTypes.FirstOrDefaultAsync(x => x.Id == id && x.SchoolId == schoolId);
            if (entity == null) return false;
            _context.ExamTypes.Remove(entity);
            await _context.SaveChangesAsync();
            return true;
        }

        private static ExamTypeResponse MapExamType(ExamType e) => new()
        {
            Id = e.Id, SchoolId = e.SchoolId, Name = e.Name,
            DefaultMaxMarks = e.DefaultMaxMarks, ExamsPerTerm = e.ExamsPerTerm,
            IsUnitTest = e.IsUnitTest, Description = e.Description,
            Status = e.Status, CreatedAt = e.CreatedAt, UpdatedAt = e.UpdatedAt
        };

        // ── SubjectType ───────────────────────────────────────────────────────
        public async Task<SubjectTypeListResponse> GetSubjectTypesAsync(Guid schoolId)
        {
            var entities = await _context.SubjectTypes
                .Where(s => s.SchoolId == schoolId)
                .OrderBy(s => s.Name)
                .ToListAsync();
            var items = entities.Select(MapSubjectType).ToList();
            return new SubjectTypeListResponse { SubjectTypes = items, Total = items.Count };
        }

        public async Task<SubjectTypeResponse?> GetSubjectTypeByIdAsync(Guid id, Guid schoolId)
        {
            var s = await _context.SubjectTypes.FirstOrDefaultAsync(x => x.Id == id && x.SchoolId == schoolId);
            return s == null ? null : MapSubjectType(s);
        }

        public async Task<SubjectTypeResponse> CreateSubjectTypeAsync(Guid schoolId, CreateSubjectTypeRequest req)
        {
            EnsureSchoolId(schoolId);
            var name = NormalizeRequiredText(req.Name, "Subject type name", 100);
            if (name.Length < 3)
                throw new ArgumentException("Subject type name must be at least 3 characters");
            var duplicate = await _context.SubjectTypes
                .AnyAsync(s => s.SchoolId == schoolId && s.Name.ToLower() == name.ToLower());
            if (duplicate)
                throw new InvalidOperationException("A subject type with the same name already exists");
            var entity = new SubjectType
            {
                Id = Guid.NewGuid(), SchoolId = schoolId,
                Name = name, Description = req.Description,
                Status = "active", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            };
            _context.SubjectTypes.Add(entity);
            await _context.SaveChangesAsync();
            return MapSubjectType(entity);
        }

        public async Task<SubjectTypeResponse?> UpdateSubjectTypeAsync(Guid id, Guid schoolId, CreateSubjectTypeRequest req)
        {
            var entity = await _context.SubjectTypes.FirstOrDefaultAsync(x => x.Id == id && x.SchoolId == schoolId);
            if (entity == null) return null;
            var name = NormalizeRequiredText(req.Name, "Subject type name", 100);
            if (name.Length < 3)
                throw new ArgumentException("Subject type name must be at least 3 characters");
            var duplicate = await _context.SubjectTypes
                .AnyAsync(s => s.SchoolId == schoolId && s.Id != id && s.Name.ToLower() == name.ToLower());
            if (duplicate)
                throw new InvalidOperationException("A subject type with the same name already exists");
            entity.Name = name; entity.Description = req.Description;
            entity.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return MapSubjectType(entity);
        }

        public async Task<bool> DeleteSubjectTypeAsync(Guid id, Guid schoolId)
        {
            var entity = await _context.SubjectTypes.FirstOrDefaultAsync(x => x.Id == id && x.SchoolId == schoolId);
            if (entity == null) return false;
            _context.SubjectTypes.Remove(entity);
            await _context.SaveChangesAsync();
            return true;
        }

        private static SubjectTypeResponse MapSubjectType(SubjectType s) => new()
        {
            Id = s.Id, SchoolId = s.SchoolId, Name = s.Name,
            Description = s.Description, Status = s.Status,
            CreatedAt = s.CreatedAt, UpdatedAt = s.UpdatedAt
        };

        // ── StudentSubject ─────────────────────────────────────────────────────
        public async Task<List<StudentSubjectResponse>> GetStudentSubjectsAsync(
            Guid schoolId, Guid studentId, string? academicYear)
        {
            var q = _context.StudentSubjects
                .Include(ss => ss.Subject)
                .Include(ss => ss.SubjectType)
                .Include(ss => ss.Class)
                .Where(ss => ss.SchoolId == schoolId && ss.StudentId == studentId);
            if (!string.IsNullOrEmpty(academicYear))
                q = q.Where(ss => ss.AcademicYear == academicYear);
            var list = await q.ToListAsync();
            return list.Select(ss => new StudentSubjectResponse
            {
                Id = ss.Id, StudentId = ss.StudentId, StudentName = "",
                ClassId = ss.ClassId, ClassName = ss.Class?.Name ?? "",
                SubjectId = ss.SubjectId, SubjectName = ss.Subject?.Name ?? "",
                SubjectTypeId = ss.SubjectTypeId, SubjectTypeName = ss.SubjectType?.Name,
                AcademicYear = ss.AcademicYear, IsMandatory = ss.IsMandatory, Status = ss.Status
            }).ToList();
        }

        public async Task<StudentSubjectResponse> AssignStudentSubjectAsync(
            Guid schoolId, AssignStudentSubjectRequest req)
        {
            EnsureSchoolId(schoolId);
            // VALIDATION 1: Academic year required
            if (string.IsNullOrWhiteSpace(req.AcademicYear))
                throw new ArgumentException("Academic year is required");
            // VALIDATION 2: Student exists
            var studentExists = await _context.Students
                .AnyAsync(s => s.Id == req.StudentId && s.SchoolId == schoolId && !s.IsDeleted);
            if (!studentExists)
                throw new KeyNotFoundException("Student does not exist in this school");
            // VALIDATION 3: Class exists
            var classExists = await _context.Classes
                .AnyAsync(c => c.Id == req.ClassId && c.SchoolId == schoolId);
            if (!classExists)
                throw new KeyNotFoundException("Class does not exist in this school");
            // VALIDATION 4: Subject exists
            var subjectExists = await _context.Subjects
                .AnyAsync(s => s.Id == req.SubjectId && s.SchoolId == schoolId);
            if (!subjectExists)
                throw new KeyNotFoundException("Subject does not exist in this school");
            // VALIDATION 5: Duplicate enrollment check
            var duplicate = await _context.StudentSubjects
                .AnyAsync(ss => ss.SchoolId == schoolId && ss.StudentId == req.StudentId
                    && ss.SubjectId == req.SubjectId && ss.AcademicYear == req.AcademicYear.Trim());
            if (duplicate)
                throw new InvalidOperationException("Student is already enrolled in this subject for the given academic year");
            var entity = new StudentSubject
            {
                Id = Guid.NewGuid(), SchoolId = schoolId,
                StudentId = req.StudentId, ClassId = req.ClassId,
                SubjectId = req.SubjectId, SubjectTypeId = req.SubjectTypeId,
                AcademicYear = req.AcademicYear.Trim(), IsMandatory = req.IsMandatory,
                Status = "active", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            };
            _context.StudentSubjects.Add(entity);
            await _context.SaveChangesAsync();
            await _context.Entry(entity).Reference(e => e.Subject).LoadAsync();
            await _context.Entry(entity).Reference(e => e.SubjectType).LoadAsync();
            await _context.Entry(entity).Reference(e => e.Class).LoadAsync();
            return new StudentSubjectResponse
            {
                Id = entity.Id, StudentId = entity.StudentId, StudentName = "",
                ClassId = entity.ClassId, ClassName = entity.Class?.Name ?? "",
                SubjectId = entity.SubjectId, SubjectName = entity.Subject?.Name ?? "",
                SubjectTypeId = entity.SubjectTypeId, SubjectTypeName = entity.SubjectType?.Name,
                AcademicYear = entity.AcademicYear, IsMandatory = entity.IsMandatory, Status = entity.Status
            };
        }

        public async Task<bool> RemoveStudentSubjectAsync(Guid id, Guid schoolId)
        {
            var entity = await _context.StudentSubjects.FirstOrDefaultAsync(x => x.Id == id && x.SchoolId == schoolId);
            if (entity == null) return false;
            _context.StudentSubjects.Remove(entity);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task BulkAssignStudentSubjectsAsync(Guid schoolId, BulkAssignStudentSubjectsRequest req)
        {
            EnsureSchoolId(schoolId);
            // VALIDATION 1: Required fields
            if (req.StudentId == Guid.Empty)
                throw new ArgumentException("Student ID is required");
            if (req.ClassId == Guid.Empty)
                throw new ArgumentException("Class ID is required");
            if (string.IsNullOrWhiteSpace(req.AcademicYear))
                throw new ArgumentException("Academic year is required");
            if (req.SubjectIds == null || !req.SubjectIds.Any())
                throw new ArgumentException("At least one subject must be specified");
            if (req.SubjectIds.Count > 50)
                throw new ArgumentException("Cannot assign more than 50 subjects at once");
            // VALIDATION 2: Student exists
            var studentExists = await _context.Students
                .AnyAsync(s => s.Id == req.StudentId && s.SchoolId == schoolId && !s.IsDeleted);
            if (!studentExists)
                throw new KeyNotFoundException("Student does not exist in this school");
            // VALIDATION 3: Class exists
            var classExists = await _context.Classes
                .AnyAsync(c => c.Id == req.ClassId && c.SchoolId == schoolId);
            if (!classExists)
                throw new KeyNotFoundException("Class does not exist in this school");
            // Remove existing enrollments for this student/class/year first
            var existing = await _context.StudentSubjects
                .Where(ss => ss.SchoolId == schoolId && ss.StudentId == req.StudentId
                          && ss.ClassId == req.ClassId && ss.AcademicYear == req.AcademicYear.Trim())
                .ToListAsync();
            _context.StudentSubjects.RemoveRange(existing);

            var now = DateTime.UtcNow;
            var newEntries = req.SubjectIds.Distinct().Select(subjectId => new StudentSubject
            {
                Id = Guid.NewGuid(), SchoolId = schoolId,
                StudentId = req.StudentId, ClassId = req.ClassId,
                SubjectId = subjectId, AcademicYear = req.AcademicYear.Trim(),
                IsMandatory = true, Status = "active",
                CreatedAt = now, UpdatedAt = now
            });
            _context.StudentSubjects.AddRange(newEntries);
            await _context.SaveChangesAsync();
        }

        private static void NormalizePagination(ref int page, ref int pageSize, int maxPageSize = 200)
        {
            if (page < 1)
            {
                page = 1;
            }

            if (pageSize < 1)
            {
                pageSize = 20;
            }
            else if (pageSize > maxPageSize)
            {
                pageSize = maxPageSize;
            }
        }

        private static void EnsureSchoolId(Guid schoolId)
        {
            if (schoolId == Guid.Empty)
            {
                throw new ArgumentException("A valid school id is required");
            }
        }

        private static string NormalizeStatus(string? status, HashSet<string> allowed, string defaultValue, string entityName)
        {
            var normalized = string.IsNullOrWhiteSpace(status) ? defaultValue : status.Trim().ToLowerInvariant();
            if (!allowed.Contains(normalized))
            {
                throw new InvalidOperationException($"Invalid {entityName} status. Allowed values: {string.Join(", ", allowed)}");
            }

            return normalized;
        }

        private static string NormalizeRequiredText(string? value, string fieldName, int maxLength)
        {
            var normalized = value?.Trim();
            if (string.IsNullOrWhiteSpace(normalized))
            {
                throw new InvalidOperationException($"{fieldName} is required");
            }

            if (normalized.Length > maxLength)
            {
                throw new InvalidOperationException($"{fieldName} cannot exceed {maxLength} characters");
            }

            return normalized;
        }
    }
}

