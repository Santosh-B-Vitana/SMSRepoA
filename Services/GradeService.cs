using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace SmsApi.Services
{
    public interface IGradeService
    {
        // Grade Categories
        Task<GradeCategoryListResponse> GetCategoriesAsync(Guid schoolId, int page = 1, int pageSize = 10);
        Task<GradeCategoryResponse?> GetCategoryByIdAsync(Guid id, Guid schoolId);
        Task<GradeCategoryResponse> CreateCategoryAsync(Guid schoolId, CreateGradeCategoryRequest request);
        Task<GradeCategoryResponse?> UpdateCategoryAsync(Guid id, Guid schoolId, CreateGradeCategoryRequest request);
        Task<bool> DeleteCategoryAsync(Guid id, Guid schoolId);

        // Grade Items
        Task<GradeItemListResponse> GetGradeItemsAsync(Guid schoolId, Guid? classId = null, Guid? subjectId = null, int page = 1, int pageSize = 10);
        Task<GradeItemResponse?> GetGradeItemByIdAsync(Guid id, Guid schoolId);
        Task<GradeItemResponse> CreateGradeItemAsync(CreateGradeItemRequest request);
        Task<GradeItemResponse?> UpdateGradeItemAsync(Guid id, Guid schoolId, UpdateGradeItemRequest request);
        Task<bool> DeleteGradeItemAsync(Guid id, Guid schoolId);

        // Student Grades
        Task<StudentGradeListResponse> GetStudentGradesAsync(Guid schoolId, Guid? gradeItemId = null, Guid? studentId = null, int page = 1, int pageSize = 10);
        Task<StudentGradeResponse?> GetStudentGradeByIdAsync(Guid id, Guid schoolId);
        Task<StudentGradeResponse> CreateStudentGradeAsync(Guid schoolId, CreateStudentGradeRequest request);
        Task<StudentGradeResponse?> UpdateStudentGradeAsync(Guid id, Guid schoolId, UpdateStudentGradeRequest request);
        Task<bool> DeleteStudentGradeAsync(Guid id, Guid schoolId);
        Task<BulkCreateStudentGradeResult> BulkCreateStudentGradesAsync(Guid schoolId, BulkCreateStudentGradeRequest request);

        // CCE Assessments
        Task<CCEAssessmentListResponse> GetCCEAssessmentsAsync(Guid schoolId, Guid? studentId = null, string? academicYear = null, int page = 1, int pageSize = 10);
        Task<CCEAssessmentResponse?> GetCCEAssessmentByIdAsync(Guid id, Guid schoolId);
        Task<CCEAssessmentResponse> CreateCCEAssessmentAsync(Guid schoolId, CreateCCEAssessmentRequest request);
        Task<CCEAssessmentResponse?> UpdateCCEAssessmentAsync(Guid id, Guid schoolId, UpdateCCEAssessmentRequest request);
        Task<bool> DeleteCCEAssessmentAsync(Guid id, Guid schoolId);

        // Stats
        Task<GradeStatsResponse> GetStatsAsync(Guid schoolId);
    }

    public class GradeService : IGradeService
    {
        private static readonly HashSet<string> ValidStatuses = new(StringComparer.OrdinalIgnoreCase)
            { "active", "inactive", "draft" };
        private static readonly HashSet<string> ValidGradeStatuses = new(StringComparer.OrdinalIgnoreCase)
            { "draft", "published" };
        private static readonly HashSet<string> ValidCCEGrades = new(StringComparer.OrdinalIgnoreCase)
            { "A+", "A", "B+", "B", "C", "D", "E" };
        private static readonly HashSet<string> ValidCCETerms = new(StringComparer.OrdinalIgnoreCase)
            { "T1", "T2", "T3", "1", "2", "3", "Term1", "Term2", "Term3" };
        private static readonly Regex AcademicYearRegex = new(@"^\d{4}(-\d{2,4})?$");

        private readonly AppDbContext _context;

        public GradeService(AppDbContext context)
        {
            _context = context;
        }

        // â”€â”€â”€ PAGINATION HELPERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        private static int NormalizePage(int page) => page < 1 ? 1 : page;
        private static int NormalizePageSize(int pageSize) => pageSize < 1 ? 10 : pageSize > 100 ? 100 : pageSize;

        // â”€â”€â”€ GRADE CATEGORIES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        public async Task<GradeCategoryListResponse> GetCategoriesAsync(Guid schoolId, int page = 1, int pageSize = 10)
        {
            page = NormalizePage(page);
            pageSize = NormalizePageSize(pageSize);

            var query = _context.GradeCategories.Where(gc => gc.SchoolId == schoolId);
            var total = await query.CountAsync();
            var categories = await query
                .OrderBy(gc => gc.Name)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new GradeCategoryListResponse
            {
                Categories = categories.Select(MapToCategoryResponse).ToList(),
                Total = total,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<GradeCategoryResponse?> GetCategoryByIdAsync(Guid id, Guid schoolId)
        {
            var category = await _context.GradeCategories
                .FirstOrDefaultAsync(gc => gc.Id == id && gc.SchoolId == schoolId);
            return category == null ? null : MapToCategoryResponse(category);
        }

        public async Task<GradeCategoryResponse> CreateCategoryAsync(Guid schoolId, CreateGradeCategoryRequest request)
        {
            // Validate Name
            var name = request.Name?.Trim();
            if (string.IsNullOrEmpty(name) || name.Length < 2 || name.Length > 200)
                throw new ArgumentException("Category name must be between 2 and 200 characters.");

            // Validate Code
            if (request.Code != null && (request.Code.Trim().Length == 0 || request.Code.Length > 50))
                throw new ArgumentException("Category code must be 1-50 characters.");

            // Validate Weightage
            if (request.Weightage < 0 || request.Weightage > 100)
                throw new ArgumentException("Weightage must be between 0 and 100.");

            // Validate Status
            var status = request.Status ?? "active";
            if (!ValidStatuses.Contains(status))
                throw new ArgumentException($"Invalid status '{status}'. Must be active, inactive, or draft.");

            // Duplicate check (case-insensitive, same school)
            var duplicate = await _context.GradeCategories
                .AnyAsync(gc => gc.SchoolId == schoolId && gc.Name.ToLower() == name.ToLower());
            if (duplicate)
                throw new InvalidOperationException($"A grade category named '{name}' already exists for this school.");

            var category = new GradeCategory
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                Name = name,
                Code = request.Code?.Trim(),
                Weightage = request.Weightage,
                Description = request.Description,
                Status = status,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.GradeCategories.Add(category);
            await _context.SaveChangesAsync();
            return MapToCategoryResponse(category);
        }

        public async Task<GradeCategoryResponse?> UpdateCategoryAsync(Guid id, Guid schoolId, CreateGradeCategoryRequest request)
        {
            var category = await _context.GradeCategories
                .FirstOrDefaultAsync(gc => gc.Id == id && gc.SchoolId == schoolId);
            if (category == null) return null;

            // Validate Name
            var name = request.Name?.Trim();
            if (string.IsNullOrEmpty(name) || name.Length < 2 || name.Length > 200)
                throw new ArgumentException("Category name must be between 2 and 200 characters.");

            // Validate Code
            if (request.Code != null && (request.Code.Trim().Length == 0 || request.Code.Length > 50))
                throw new ArgumentException("Category code must be 1-50 characters.");

            // Validate Weightage
            if (request.Weightage < 0 || request.Weightage > 100)
                throw new ArgumentException("Weightage must be between 0 and 100.");

            // Validate Status
            var status = request.Status ?? category.Status;
            if (!ValidStatuses.Contains(status))
                throw new ArgumentException($"Invalid status '{status}'. Must be active, inactive, or draft.");

            // Duplicate check (exclude self)
            var duplicate = await _context.GradeCategories
                .AnyAsync(gc => gc.SchoolId == schoolId && gc.Name.ToLower() == name.ToLower() && gc.Id != id);
            if (duplicate)
                throw new InvalidOperationException($"A grade category named '{name}' already exists for this school.");

            category.Name = name;
            category.Code = request.Code?.Trim();
            category.Weightage = request.Weightage;
            category.Description = request.Description;
            category.Status = status;
            category.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return MapToCategoryResponse(category);
        }

        public async Task<bool> DeleteCategoryAsync(Guid id, Guid schoolId)
        {
            var category = await _context.GradeCategories
                .FirstOrDefaultAsync(gc => gc.Id == id && gc.SchoolId == schoolId);
            if (category == null) return false;

            // Guard: don't delete if grade items reference this category
            var inUse = await _context.GradeItems
                .AnyAsync(gi => gi.CategoryId == id);
            if (inUse)
                throw new InvalidOperationException("Cannot delete a grade category that has grade items assigned to it.");

            _context.GradeCategories.Remove(category);
            await _context.SaveChangesAsync();
            return true;
        }

        // â”€â”€â”€ GRADE ITEMS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        public async Task<GradeItemListResponse> GetGradeItemsAsync(Guid schoolId, Guid? classId = null, Guid? subjectId = null, int page = 1, int pageSize = 10)
        {
            page = NormalizePage(page);
            pageSize = NormalizePageSize(pageSize);

            var query = _context.GradeItems.Where(gi => gi.SchoolId == schoolId);
            if (classId.HasValue) query = query.Where(gi => gi.ClassId == classId.Value);
            if (subjectId.HasValue) query = query.Where(gi => gi.SubjectId == subjectId.Value);

            var total = await query.CountAsync();
            var items = await query
                .OrderByDescending(gi => gi.Date)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new GradeItemListResponse
            {
                Items = items.Select(MapToGradeItemResponse).ToList(),
                Total = total,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<GradeItemResponse?> GetGradeItemByIdAsync(Guid id, Guid schoolId)
        {
            var item = await _context.GradeItems
                .FirstOrDefaultAsync(gi => gi.Id == id && gi.SchoolId == schoolId);
            return item == null ? null : MapToGradeItemResponse(item);
        }

        public async Task<GradeItemResponse> CreateGradeItemAsync(CreateGradeItemRequest request)
        {
            var schoolId = request.SchoolId;

            // Validate Name
            var name = request.Name?.Trim();
            if (string.IsNullOrEmpty(name) || name.Length < 3 || name.Length > 300)
                throw new ArgumentException("Grade item name must be between 3 and 300 characters.");

            // Validate MaxMarks
            if (request.MaxMarks <= 0 || request.MaxMarks > 1000)
                throw new ArgumentException("MaxMarks must be between 1 and 1000.");

            // Validate Date: not more than 5 years in the past
            if (request.Date < DateTime.UtcNow.AddYears(-5))
                throw new ArgumentException("Grade item date cannot be more than 5 years in the past.");

            // Validate Status
            var status = request.Status ?? "active";
            if (!ValidStatuses.Contains(status))
                throw new ArgumentException($"Invalid status '{status}'. Must be active, inactive, or draft.");

            // Category must exist in same school
            var categoryExists = await _context.GradeCategories
                .AnyAsync(gc => gc.Id == request.CategoryId && gc.SchoolId == schoolId);
            if (!categoryExists)
                throw new KeyNotFoundException($"Grade category not found for this school.");

            // ClassId must exist in same school
            var classExists = await _context.Classes
                .AnyAsync(c => c.Id == request.ClassId && c.SchoolId == schoolId);
            if (!classExists)
                throw new KeyNotFoundException("Class not found for this school.");

            // SubjectId must exist in same school
            var subjectExists = await _context.Subjects
                .AnyAsync(s => s.Id == request.SubjectId && s.SchoolId == schoolId);
            if (!subjectExists)
                throw new KeyNotFoundException("Subject not found for this school.");

            // Duplicate: same name + class + subject in same school
            var duplicate = await _context.GradeItems
                .AnyAsync(gi => gi.SchoolId == schoolId
                    && gi.ClassId == request.ClassId
                    && gi.SubjectId == request.SubjectId
                    && gi.Name.ToLower() == name.ToLower());
            if (duplicate)
                throw new InvalidOperationException($"A grade item named '{name}' already exists for this class and subject.");

            var item = new GradeItem
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                ClassId = request.ClassId,
                SectionId = request.SectionId,
                SubjectId = request.SubjectId,
                CategoryId = request.CategoryId,
                Name = name,
                MaxMarks = request.MaxMarks,
                Date = request.Date,
                Description = request.Description,
                Status = status,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.GradeItems.Add(item);
            await _context.SaveChangesAsync();
            return MapToGradeItemResponse(item);
        }

        public async Task<GradeItemResponse?> UpdateGradeItemAsync(Guid id, Guid schoolId, UpdateGradeItemRequest request)
        {
            var item = await _context.GradeItems
                .FirstOrDefaultAsync(gi => gi.Id == id && gi.SchoolId == schoolId);
            if (item == null) return null;

            if (request.Name != null)
            {
                var name = request.Name.Trim();
                if (name.Length < 3 || name.Length > 300)
                    throw new ArgumentException("Grade item name must be between 3 and 300 characters.");
                item.Name = name;
            }

            if (request.MaxMarks.HasValue)
            {
                if (request.MaxMarks.Value <= 0 || request.MaxMarks.Value > 1000)
                    throw new ArgumentException("MaxMarks must be between 1 and 1000.");
                item.MaxMarks = request.MaxMarks.Value;
            }

            if (request.Date.HasValue)
            {
                if (request.Date.Value < DateTime.UtcNow.AddYears(-5))
                    throw new ArgumentException("Grade item date cannot be more than 5 years in the past.");
                item.Date = request.Date.Value;
            }

            if (request.Status != null)
            {
                if (!ValidStatuses.Contains(request.Status))
                    throw new ArgumentException($"Invalid status '{request.Status}'. Must be active, inactive, or draft.");
                item.Status = request.Status;
            }

            if (request.Description != null) item.Description = request.Description;
            item.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return MapToGradeItemResponse(item);
        }

        public async Task<bool> DeleteGradeItemAsync(Guid id, Guid schoolId)
        {
            var item = await _context.GradeItems
                .FirstOrDefaultAsync(gi => gi.Id == id && gi.SchoolId == schoolId);
            if (item == null) return false;

            // Guard: don't delete if student grades exist for this item
            var hasGrades = await _context.StudentGrades.AnyAsync(sg => sg.GradeItemId == id);
            if (hasGrades)
                throw new InvalidOperationException("Cannot delete a grade item that has student grades assigned to it.");

            _context.GradeItems.Remove(item);
            await _context.SaveChangesAsync();
            return true;
        }

        // â”€â”€â”€ STUDENT GRADES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        public async Task<StudentGradeListResponse> GetStudentGradesAsync(Guid schoolId, Guid? gradeItemId = null, Guid? studentId = null, int page = 1, int pageSize = 10)
        {
            page = NormalizePage(page);
            pageSize = NormalizePageSize(pageSize);

            // School isolation via join with GradeItems
            var query = _context.StudentGrades
                .Join(_context.GradeItems.Where(gi => gi.SchoolId == schoolId),
                    sg => sg.GradeItemId,
                    gi => gi.Id,
                    (sg, gi) => sg);

            if (gradeItemId.HasValue) query = query.Where(sg => sg.GradeItemId == gradeItemId.Value);
            if (studentId.HasValue)  query = query.Where(sg => sg.StudentId == studentId.Value);

            var total = await query.CountAsync();
            var grades = await query
                .OrderByDescending(sg => sg.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new StudentGradeListResponse
            {
                Grades = grades.Select(MapToStudentGradeResponse).ToList(),
                Total = total,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<StudentGradeResponse?> GetStudentGradeByIdAsync(Guid id, Guid schoolId)
        {
            var grade = await _context.StudentGrades
                .Join(_context.GradeItems.Where(gi => gi.SchoolId == schoolId),
                    sg => sg.GradeItemId, gi => gi.Id, (sg, gi) => sg)
                .FirstOrDefaultAsync(sg => sg.Id == id);
            return grade == null ? null : MapToStudentGradeResponse(grade);
        }

        public async Task<StudentGradeResponse> CreateStudentGradeAsync(Guid schoolId, CreateStudentGradeRequest request)
        {
            // Validate GradeItem exists in same school
            var gradeItem = await _context.GradeItems
                .FirstOrDefaultAsync(gi => gi.Id == request.GradeItemId && gi.SchoolId == schoolId);
            if (gradeItem == null)
                throw new KeyNotFoundException("Grade item not found for this school.");

            // Validate Student exists in same school
            var studentExists = await _context.Students
                .AnyAsync(s => s.Id == request.StudentId && s.SchoolId == schoolId);
            if (!studentExists)
                throw new KeyNotFoundException("Student not found for this school.");

            // Validate marks are within GradeItem's MaxMarks
            if (request.MarksObtained < 0)
                throw new ArgumentException("Marks obtained cannot be negative.");
            if (request.MarksObtained > gradeItem.MaxMarks)
                throw new ArgumentException($"Marks obtained ({request.MarksObtained}) cannot exceed MaxMarks ({gradeItem.MaxMarks}).");

            // Validate Status
            var status = request.Status ?? "published";
            if (!ValidGradeStatuses.Contains(status))
                throw new ArgumentException($"Invalid status '{status}'. Must be draft or published.");

            // Validate Remarks max length
            if (request.Remarks != null && request.Remarks.Length > 1000)
                throw new ArgumentException("Remarks cannot exceed 1000 characters.");

            // Duplicate check: student already has a grade for this grade item
            var existing = await _context.StudentGrades
                .AnyAsync(sg => sg.StudentId == request.StudentId && sg.GradeItemId == request.GradeItemId);
            if (existing)
                throw new InvalidOperationException("Student already has a grade for this grade item.");

            var passingThreshold = gradeItem.MaxMarks * 0.40m; // 40% passing threshold
            var gradeValue = DetermineGrade(request.MarksObtained, gradeItem.MaxMarks);

            var grade = new StudentGrade
            {
                Id = Guid.NewGuid(),
                GradeItemId = request.GradeItemId,
                StudentId = request.StudentId,
                MarksObtained = request.MarksObtained,
                Grade = gradeValue,
                Remarks = request.Remarks,
                EnteredById = request.EnteredById,
                Status = status,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.StudentGrades.Add(grade);
            await _context.SaveChangesAsync();
            return MapToStudentGradeResponse(grade);
        }

        public async Task<StudentGradeResponse?> UpdateStudentGradeAsync(Guid id, Guid schoolId, UpdateStudentGradeRequest request)
        {
            var grade = await _context.StudentGrades
                .Join(_context.GradeItems.Where(gi => gi.SchoolId == schoolId),
                    sg => sg.GradeItemId, gi => gi.Id, (sg, gi) => new { sg, gi })
                .FirstOrDefaultAsync(x => x.sg.Id == id);

            if (grade == null) return null;

            var entity = grade.sg;
            var gradeItem = grade.gi;

            if (request.MarksObtained.HasValue)
            {
                if (request.MarksObtained.Value < 0)
                    throw new ArgumentException("Marks obtained cannot be negative.");
                if (request.MarksObtained.Value > gradeItem.MaxMarks)
                    throw new ArgumentException($"Marks obtained ({request.MarksObtained.Value}) cannot exceed MaxMarks ({gradeItem.MaxMarks}).");
                entity.MarksObtained = request.MarksObtained.Value;
                entity.Grade = DetermineGrade(entity.MarksObtained, gradeItem.MaxMarks);
            }

            if (request.Remarks != null)
            {
                if (request.Remarks.Length > 1000)
                    throw new ArgumentException("Remarks cannot exceed 1000 characters.");
                entity.Remarks = request.Remarks;
            }

            if (request.Status != null)
            {
                if (!ValidGradeStatuses.Contains(request.Status))
                    throw new ArgumentException($"Invalid status '{request.Status}'. Must be draft or published.");
                entity.Status = request.Status;
            }

            entity.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return MapToStudentGradeResponse(entity);
        }

        public async Task<bool> DeleteStudentGradeAsync(Guid id, Guid schoolId)
        {
            var grade = await _context.StudentGrades
                .Join(_context.GradeItems.Where(gi => gi.SchoolId == schoolId),
                    sg => sg.GradeItemId, gi => gi.Id, (sg, gi) => sg)
                .FirstOrDefaultAsync(sg => sg.Id == id);

            if (grade == null) return false;

            _context.StudentGrades.Remove(grade);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<BulkCreateStudentGradeResult> BulkCreateStudentGradesAsync(Guid schoolId, BulkCreateStudentGradeRequest request)
        {
            if (request.Grades == null || request.Grades.Count == 0)
                throw new ArgumentException("Grades list cannot be empty.");
            if (request.Grades.Count > 200)
                throw new ArgumentException("Cannot bulk-create more than 200 grades at once.");

            var gradeItem = await _context.GradeItems
                .FirstOrDefaultAsync(gi => gi.Id == request.GradeItemId && gi.SchoolId == schoolId);
            if (gradeItem == null)
                throw new KeyNotFoundException("Grade item not found for this school.");

            // Pre-fetch existing grades for this grade item
            var existingStudentIds = (await _context.StudentGrades
                .Where(sg => sg.GradeItemId == request.GradeItemId)
                .Select(sg => sg.StudentId)
                .ToListAsync()).ToHashSet();

            int created = 0, skipped = 0;
            var errors = new List<string>();
            var toAdd = new List<StudentGrade>();

            foreach (var entry in request.Grades)
            {
                if (existingStudentIds.Contains(entry.StudentId))
                {
                    skipped++;
                    errors.Add($"Student {entry.StudentId}: already graded, skipped.");
                    continue;
                }
                if (entry.MarksObtained < 0 || entry.MarksObtained > gradeItem.MaxMarks)
                {
                    skipped++;
                    errors.Add($"Student {entry.StudentId}: marks {entry.MarksObtained} out of range (0â€“{gradeItem.MaxMarks}), skipped.");
                    continue;
                }
                if (entry.Remarks != null && entry.Remarks.Length > 1000)
                {
                    skipped++;
                    errors.Add($"Student {entry.StudentId}: remarks too long, skipped.");
                    continue;
                }
                toAdd.Add(new StudentGrade
                {
                    Id = Guid.NewGuid(),
                    GradeItemId = request.GradeItemId,
                    StudentId = entry.StudentId,
                    MarksObtained = entry.MarksObtained,
                    Grade = DetermineGrade(entry.MarksObtained, gradeItem.MaxMarks),
                    Remarks = entry.Remarks,
                    Status = "published",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
                created++;
            }

            if (toAdd.Count > 0)
            {
                _context.StudentGrades.AddRange(toAdd);
                await _context.SaveChangesAsync();
            }

            return new BulkCreateStudentGradeResult { Created = created, Skipped = skipped, Errors = errors };
        }

        // â”€â”€â”€ CCE ASSESSMENTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        public async Task<CCEAssessmentListResponse> GetCCEAssessmentsAsync(Guid schoolId, Guid? studentId = null, string? academicYear = null, int page = 1, int pageSize = 10)
        {
            page = NormalizePage(page);
            pageSize = NormalizePageSize(pageSize);

            var query = _context.CCEAssessments.Where(cce => cce.SchoolId == schoolId);
            if (studentId.HasValue) query = query.Where(cce => cce.StudentId == studentId.Value);
            if (!string.IsNullOrEmpty(academicYear)) query = query.Where(cce => cce.AcademicYear == academicYear);

            var total = await query.CountAsync();
            var assessments = await query
                .OrderByDescending(cce => cce.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new CCEAssessmentListResponse
            {
                Assessments = assessments.Select(MapToCCEResponse).ToList(),
                Total = total,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<CCEAssessmentResponse?> GetCCEAssessmentByIdAsync(Guid id, Guid schoolId)
        {
            var assessment = await _context.CCEAssessments
                .FirstOrDefaultAsync(cce => cce.Id == id && cce.SchoolId == schoolId);
            return assessment == null ? null : MapToCCEResponse(assessment);
        }

        public async Task<CCEAssessmentResponse> CreateCCEAssessmentAsync(Guid schoolId, CreateCCEAssessmentRequest request)
        {
            // Academic year format
            var academicYear = request.AcademicYear?.Trim();
            if (string.IsNullOrEmpty(academicYear) || !AcademicYearRegex.IsMatch(academicYear))
                throw new ArgumentException("Academic year must be in format YYYY or YYYY-YY (e.g. 2025 or 2025-26).");

            // Term validation
            var term = request.Term?.Trim();
            if (string.IsNullOrEmpty(term) || !ValidCCETerms.Contains(term))
                throw new ArgumentException("Term must be one of: T1, T2, T3 (or 1, 2, 3).");

            // SkillArea
            var skillArea = request.SkillArea?.Trim();
            if (string.IsNullOrEmpty(skillArea) || skillArea.Length < 2 || skillArea.Length > 200)
                throw new ArgumentException("Skill area must be between 2 and 200 characters.");

            // Grade
            var cceGrade = request.Grade?.Trim();
            if (string.IsNullOrEmpty(cceGrade) || !ValidCCEGrades.Contains(cceGrade))
                throw new ArgumentException($"CCE Grade must be one of: A+, A, B+, B, C, D, E.");

            // Remarks
            if (request.Remarks != null && request.Remarks.Length > 1000)
                throw new ArgumentException("Remarks cannot exceed 1000 characters.");

            // Student must exist in same school
            var studentExists = await _context.Students
                .AnyAsync(s => s.Id == request.StudentId && s.SchoolId == schoolId);
            if (!studentExists)
                throw new KeyNotFoundException("Student not found for this school.");

            // Duplicate: same student + term + skillArea
            var duplicate = await _context.CCEAssessments
                .AnyAsync(cce => cce.SchoolId == schoolId
                    && cce.StudentId == request.StudentId
                    && cce.AcademicYear == academicYear
                    && cce.Term.ToLower() == term.ToLower()
                    && cce.SkillArea.ToLower() == skillArea.ToLower());
            if (duplicate)
                throw new InvalidOperationException("A CCE assessment for this student, term, and skill area already exists.");

            var assessment = new CCEAssessment
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                StudentId = request.StudentId,
                ClassId = request.ClassId,
                SectionId = request.SectionId,
                AcademicYear = academicYear,
                Term = term,
                SkillArea = skillArea,
                Grade = cceGrade,
                Remarks = request.Remarks,
                AssessedById = request.AssessedById,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.CCEAssessments.Add(assessment);
            await _context.SaveChangesAsync();
            return MapToCCEResponse(assessment);
        }

        public async Task<CCEAssessmentResponse?> UpdateCCEAssessmentAsync(Guid id, Guid schoolId, UpdateCCEAssessmentRequest request)
        {
            var assessment = await _context.CCEAssessments
                .FirstOrDefaultAsync(cce => cce.Id == id && cce.SchoolId == schoolId);
            if (assessment == null) return null;

            if (request.Grade != null)
            {
                var cceGrade = request.Grade.Trim();
                if (!ValidCCEGrades.Contains(cceGrade))
                    throw new ArgumentException($"CCE Grade must be one of: A+, A, B+, B, C, D, E.");
                assessment.Grade = cceGrade;
            }

            if (request.Remarks != null)
            {
                if (request.Remarks.Length > 1000)
                    throw new ArgumentException("Remarks cannot exceed 1000 characters.");
                assessment.Remarks = request.Remarks;
            }

            assessment.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return MapToCCEResponse(assessment);
        }

        public async Task<bool> DeleteCCEAssessmentAsync(Guid id, Guid schoolId)
        {
            var assessment = await _context.CCEAssessments
                .FirstOrDefaultAsync(cce => cce.Id == id && cce.SchoolId == schoolId);
            if (assessment == null) return false;

            _context.CCEAssessments.Remove(assessment);
            await _context.SaveChangesAsync();
            return true;
        }

        // â”€â”€â”€ STATS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        public async Task<GradeStatsResponse> GetStatsAsync(Guid schoolId)
        {
            var gradeItemIds = await _context.GradeItems
                .Where(gi => gi.SchoolId == schoolId)
                .Select(gi => gi.Id)
                .ToListAsync();

            var totalGradeItems = gradeItemIds.Count;

            var allGrades = await _context.StudentGrades
                .Where(sg => gradeItemIds.Contains(sg.GradeItemId))
                .Select(sg => new { sg.MarksObtained, sg.Grade })
                .ToListAsync();

            int totalStudentGrades = allGrades.Count;
            decimal avgMarks = totalStudentGrades > 0
                ? Math.Round(allGrades.Average(g => g.MarksObtained), 2)
                : 0;

            // Pass rate: grade != "F"
            int passCount = allGrades.Count(g => g.Grade != null && g.Grade != "F");
            decimal passRate = totalStudentGrades > 0
                ? Math.Round((decimal)passCount / totalStudentGrades * 100, 2)
                : 0;

            // Grade distribution
            var distribution = new Dictionary<string, int>
            {
                ["A+"] = 0, ["A"] = 0, ["B+"] = 0, ["B"] = 0,
                ["C"] = 0,  ["D"] = 0, ["F"] = 0
            };
            foreach (var g in allGrades)
            {
                var key = g.Grade ?? "F";
                if (distribution.ContainsKey(key)) distribution[key]++;
            }

            // By class summary
            var byClass = await _context.GradeItems
                .Where(gi => gi.SchoolId == schoolId)
                .Join(_context.Classes, gi => gi.ClassId, c => c.Id, (gi, c) => new { gi.Id, gi.ClassId, ClassName = c.Name })
                .Join(_context.StudentGrades, x => x.Id, sg => sg.GradeItemId,
                    (x, sg) => new { x.ClassId, x.ClassName, sg.MarksObtained, sg.Grade })
                .GroupBy(x => new { x.ClassId, x.ClassName })
                .Select(g => new ClassGradeSummary
                {
                    ClassId = g.Key.ClassId,
                    ClassName = g.Key.ClassName,
                    StudentCount = g.Select(x => x.MarksObtained).Count(),
                    AverageMarks = Math.Round(g.Average(x => x.MarksObtained), 2),
                    PassRate = g.Count() == 0 ? 0 :
                        Math.Round((decimal)g.Count(x => x.Grade != "F") / g.Count() * 100, 2)
                })
                .ToListAsync();

            return new GradeStatsResponse
            {
                SchoolId = schoolId,
                TotalGradeItems = totalGradeItems,
                TotalStudentGrades = totalStudentGrades,
                AverageMarks = avgMarks,
                PassRate = passRate,
                GradeDistribution = distribution,
                ByClass = byClass
            };
        }

        // â”€â”€â”€ HELPERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        private static string DetermineGrade(decimal marks, decimal maxMarks)
        {
            if (maxMarks <= 0) return "F";
            var pct = marks / maxMarks * 100;
            if (pct >= 90) return "A+";
            if (pct >= 80) return "A";
            if (pct >= 70) return "B+";
            if (pct >= 60) return "B";
            if (pct >= 50) return "C";
            if (pct >= 40) return "D";
            return "F";
        }

        private static GradeCategoryResponse MapToCategoryResponse(GradeCategory category) => new()
        {
            Id = category.Id, SchoolId = category.SchoolId,
            Name = category.Name, Code = category.Code,
            Weightage = category.Weightage, Description = category.Description,
            Status = category.Status, CreatedAt = category.CreatedAt, UpdatedAt = category.UpdatedAt
        };

        private static GradeItemResponse MapToGradeItemResponse(GradeItem item) => new()
        {
            Id = item.Id, SchoolId = item.SchoolId, ClassId = item.ClassId,
            SectionId = item.SectionId, SubjectId = item.SubjectId, CategoryId = item.CategoryId,
            Name = item.Name, MaxMarks = item.MaxMarks, Date = item.Date,
            Status = item.Status, Description = item.Description,
            CreatedAt = item.CreatedAt, UpdatedAt = item.UpdatedAt
        };

        private static StudentGradeResponse MapToStudentGradeResponse(StudentGrade grade) => new()
        {
            Id = grade.Id, GradeItemId = grade.GradeItemId, StudentId = grade.StudentId,
            MarksObtained = grade.MarksObtained, Grade = grade.Grade,
            Remarks = grade.Remarks, Status = grade.Status, EnteredById = grade.EnteredById,
            CreatedAt = grade.CreatedAt, UpdatedAt = grade.UpdatedAt
        };

        private static CCEAssessmentResponse MapToCCEResponse(CCEAssessment assessment) => new()
        {
            Id = assessment.Id, SchoolId = assessment.SchoolId, StudentId = assessment.StudentId,
            ClassId = assessment.ClassId, SectionId = assessment.SectionId,
            AcademicYear = assessment.AcademicYear, Term = assessment.Term,
            SkillArea = assessment.SkillArea, Grade = assessment.Grade,
            Remarks = assessment.Remarks, AssessedById = assessment.AssessedById,
            CreatedAt = assessment.CreatedAt, UpdatedAt = assessment.UpdatedAt
        };
    }
}
