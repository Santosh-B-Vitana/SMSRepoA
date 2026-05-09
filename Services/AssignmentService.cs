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
    public interface IAssignmentService
    {
        Task<AssignmentListResponse> GetAssignmentsAsync(Guid schoolId, Guid? classId = null, Guid? subjectId = null, Guid? assignedById = null, int page = 1, int pageSize = 10);
        Task<AssignmentResponse?> GetAssignmentByIdAsync(Guid id, Guid schoolId);
        Task<AssignmentResponse> CreateAssignmentAsync(CreateAssignmentRequest request);
        Task<AssignmentResponse?> UpdateAssignmentAsync(Guid id, Guid schoolId, UpdateAssignmentRequest request);
        Task<bool> DeleteAssignmentAsync(Guid id, Guid schoolId);
        
        Task<SubmissionListResponse> GetSubmissionsAsync(Guid assignmentId, int page = 1, int pageSize = 10);
        Task<SubmissionResponse?> GetSubmissionByIdAsync(Guid id);
        Task<SubmissionResponse> CreateSubmissionAsync(CreateSubmissionRequest request);
        Task<SubmissionResponse?> GradeSubmissionAsync(Guid id, GradeSubmissionRequest request);
    }

    public class AssignmentService : IAssignmentService
    {
        private readonly AppDbContext _context;

        public AssignmentService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<AssignmentListResponse> GetAssignmentsAsync(Guid schoolId, Guid? classId = null, Guid? subjectId = null, Guid? assignedById = null, int page = 1, int pageSize = 10)
        {
            // Normalize pagination bounds
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;
            if (pageSize > 100) pageSize = 100;

            var query = _context.Assignments.Where(a => a.SchoolId == schoolId);

            if (classId.HasValue)
            {
                query = query.Where(a => a.ClassId == classId.Value);
            }

            if (subjectId.HasValue)
            {
                query = query.Where(a => a.SubjectId == subjectId.Value);
            }

            if (assignedById.HasValue)
            {
                query = query.Where(a => a.AssignedById == assignedById.Value);
            }

            var total = await query.CountAsync();
            var assignments = await query
                .OrderByDescending(a => a.AssignedDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new AssignmentListResponse
            {
                Assignments = assignments.Select(MapToResponse).ToList(),
                Total = total,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<AssignmentResponse?> GetAssignmentByIdAsync(Guid id, Guid schoolId)
        {
            var assignment = await _context.Assignments
                .FirstOrDefaultAsync(a => a.Id == id && a.SchoolId == schoolId);

            return assignment == null ? null : MapToResponse(assignment);
        }

        public async Task<AssignmentResponse> CreateAssignmentAsync(CreateAssignmentRequest request)
        {
            // VALIDATION 1: Title validation (required, 3-500 chars)
            if (string.IsNullOrWhiteSpace(request.Title))
                throw new ArgumentException("Assignment title is required and cannot be empty");
            
            if (request.Title.Length < 3)
                throw new ArgumentException("Assignment title must be at least 3 characters long");
            
            if (request.Title.Length > 500)
                throw new ArgumentException("Assignment title cannot exceed 500 characters");

            // VALIDATION 2: Description validation (required)
            if (string.IsNullOrWhiteSpace(request.Description))
                throw new ArgumentException("Assignment description is required and cannot be empty");

            // VALIDATION 3: Max marks validation (must be positive and ≤ 1000)
            if (request.MaxMarks <= 0)
                throw new ArgumentException("Maximum marks must be greater than zero");
            
            if (request.MaxMarks > 1000)
                throw new ArgumentException("Maximum marks cannot exceed 1000");

            // VALIDATION 4: Validate due date (must be after assigned date)
            if (request.DueDate <= request.AssignedDate)
                throw new InvalidOperationException("Due date must be after assigned date");

            // VALIDATION 5: Verify subject is assigned to class
            var subjectAssignment = await _context.ClassSubjects
                .AnyAsync(cs => cs.SubjectId == request.SubjectId &&
                               cs.ClassId == request.ClassId);
            if (!subjectAssignment)
                throw new InvalidOperationException("Subject is not assigned to this class");

            // VALIDATION 6: Verify teacher is assigned to subject
            var teacherAssignment = await _context.TeacherAssignments
                .AnyAsync(ta => ta.SubjectId == request.SubjectId &&
                               ta.StaffId == request.AssignedById);
            if (!teacherAssignment)
                throw new InvalidOperationException("Teacher is not assigned to this subject");

            // VALIDATION 7: Verify teacher is active
            var teacher = await _context.StaffMembers
                .FirstOrDefaultAsync(s => s.Id == request.AssignedById);
            if (teacher == null || !teacher.IsActive)
                throw new InvalidOperationException("Teacher is not active or does not exist");

            // VALIDATION 8: Prevent duplicate assignments for same subject/class/title
            var existingAssignment = await _context.Assignments
                .AnyAsync(a => a.SubjectId == request.SubjectId &&
                              a.ClassId == request.ClassId &&
                              a.Title == request.Title &&
                              a.SchoolId == request.SchoolId);
            if (existingAssignment)
                throw new InvalidOperationException("An assignment with this title already exists for this class/subject");

            var assignment = new Assignment
            {
                Id = Guid.NewGuid(),
                SchoolId = request.SchoolId,
                ClassId = request.ClassId,
                SectionId = request.SectionId,
                SubjectId = request.SubjectId,
                AssignedById = request.AssignedById,
                Title = request.Title,
                Description = request.Description,
                AssignedDate = request.AssignedDate,
                DueDate = request.DueDate,
                MaxMarks = request.MaxMarks,
                AttachmentUrl = request.AttachmentUrl,
                Status = "active",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Assignments.Add(assignment);
            await _context.SaveChangesAsync();

            return MapToResponse(assignment);
        }

        public async Task<AssignmentResponse?> UpdateAssignmentAsync(Guid id, Guid schoolId, UpdateAssignmentRequest request)
        {
            var assignment = await _context.Assignments
                .FirstOrDefaultAsync(a => a.Id == id && a.SchoolId == schoolId);

            if (assignment == null) return null;

            // VALIDATION 1: Title validation if provided
            if (!string.IsNullOrWhiteSpace(request.Title))
            {
                if (request.Title.Length < 3)
                    throw new ArgumentException("Assignment title must be at least 3 characters long");
                
                if (request.Title.Length > 500)
                    throw new ArgumentException("Assignment title cannot exceed 500 characters");
                
                assignment.Title = request.Title;
            }

            // VALIDATION 2: Description validation if provided
            if (request.Description != null && string.IsNullOrWhiteSpace(request.Description))
                throw new ArgumentException("Assignment description cannot be empty");
            
            if (!string.IsNullOrWhiteSpace(request.Description))
                assignment.Description = request.Description;

            // VALIDATION 3: Due date validation if provided
            if (request.DueDate.HasValue)
            {
                if (request.DueDate.Value <= assignment.AssignedDate)
                    throw new InvalidOperationException("Due date must be after assigned date");
                assignment.DueDate = request.DueDate.Value;
            }

            // VALIDATION 4: Max marks validation if provided
            if (request.MaxMarks.HasValue)
            {
                if (request.MaxMarks.Value <= 0)
                    throw new ArgumentException("Maximum marks must be greater than zero");
                if (request.MaxMarks.Value > 1000)
                    throw new ArgumentException("Maximum marks cannot exceed 1000");
                assignment.MaxMarks = request.MaxMarks.Value;
            }

            // VALIDATION 5: Status validation if provided
            if (request.Status != null)
            {
                var validStatuses = new[] { "active", "inactive", "draft", "archived" };
                if (!validStatuses.Contains(request.Status.ToLower()))
                    throw new ArgumentException("Invalid status. Must be: active, inactive, draft, or archived");
                assignment.Status = request.Status;
            }

            if (request.AttachmentUrl != null) 
                assignment.AttachmentUrl = request.AttachmentUrl;

            assignment.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return MapToResponse(assignment);
        }

        public async Task<bool> DeleteAssignmentAsync(Guid id, Guid schoolId)
        {
            var assignment = await _context.Assignments
                .FirstOrDefaultAsync(a => a.Id == id && a.SchoolId == schoolId);

            if (assignment == null) return false;

            _context.Assignments.Remove(assignment);
            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<SubmissionListResponse> GetSubmissionsAsync(Guid assignmentId, int page = 1, int pageSize = 10)
        {
            // Normalize pagination bounds
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;
            if (pageSize > 100) pageSize = 100;

            var query = _context.AssignmentSubmissions
                .Where(s => s.AssignmentId == assignmentId);

            var total = await query.CountAsync();
            var submissions = await query
                .OrderByDescending(s => s.SubmissionDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new SubmissionListResponse
            {
                Submissions = submissions.Select(MapToSubmissionResponse).ToList(),
                Total = total,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<SubmissionResponse?> GetSubmissionByIdAsync(Guid id)
        {
            var submission = await _context.AssignmentSubmissions.FindAsync(id);

            return submission == null ? null : MapToSubmissionResponse(submission);
        }

        public async Task<SubmissionResponse> CreateSubmissionAsync(CreateSubmissionRequest request)
        {
            // VALIDATION 1: Assignment existence
            var assignment = await _context.Assignments
                .FirstOrDefaultAsync(a => a.Id == request.AssignmentId);
            if (assignment == null)
                throw new KeyNotFoundException($"Assignment with ID {request.AssignmentId} not found");

            // VALIDATION 2: Student existence
            var student = await _context.Students
                .FirstOrDefaultAsync(s => s.Id == request.StudentId);
            if (student == null)
                throw new KeyNotFoundException($"Student with ID {request.StudentId} not found");

            // VALIDATION 3: Check if already submitted
            var existingSubmission = await _context.AssignmentSubmissions
                .AnyAsync(s => s.AssignmentId == request.AssignmentId && s.StudentId == request.StudentId);
            if (existingSubmission)
                throw new InvalidOperationException("Student has already submitted this assignment");

            // VALIDATION 4: Submission text or attachment required
            if (string.IsNullOrWhiteSpace(request.Content) && string.IsNullOrWhiteSpace(request.AttachmentUrl))
                throw new ArgumentException("Submission must contain either text content or an attachment");

            var submission = new AssignmentSubmission
            {
                Id = Guid.NewGuid(),
                AssignmentId = request.AssignmentId,
                StudentId = request.StudentId,
                SubmissionDate = DateTime.UtcNow,
                Content = request.Content,
                AttachmentUrl = request.AttachmentUrl,
                Status = "submitted",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.AssignmentSubmissions.Add(submission);
            await _context.SaveChangesAsync();

            return MapToSubmissionResponse(submission);
        }

        public async Task<SubmissionResponse?> GradeSubmissionAsync(Guid id, GradeSubmissionRequest request)
        {
            var submission = await _context.AssignmentSubmissions.FindAsync(id);

            if (submission == null) return null;

            // Get the assignment to validate marks
            var assignment = await _context.Assignments
                .FirstOrDefaultAsync(a => a.Id == submission.AssignmentId);
            if (assignment == null)
                throw new KeyNotFoundException("Associated assignment not found");

            // VALIDATION 1: Marks cannot be negative
            if (request.MarksObtained < 0)
                throw new ArgumentException("Marks obtained cannot be negative");

            // VALIDATION 2: Marks cannot exceed MaxMarks
            if (request.MarksObtained > assignment.MaxMarks)
                throw new InvalidOperationException($"Marks obtained ({request.MarksObtained}) cannot exceed maximum marks ({assignment.MaxMarks})");

            // VALIDATION 3: Feedback validation if provided
            if (!string.IsNullOrWhiteSpace(request.Feedback) && request.Feedback.Length > 1000)
                throw new ArgumentException("Feedback cannot exceed 1000 characters");

            submission.MarksObtained = request.MarksObtained;
            submission.Feedback = request.Feedback;
            submission.GradedById = request.GradedById;
            submission.GradedDate = DateTime.UtcNow;
            submission.Status = "graded";
            submission.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return MapToSubmissionResponse(submission);
        }

        private static AssignmentResponse MapToResponse(Assignment assignment)
        {
            return new AssignmentResponse
            {
                Id = assignment.Id,
                SchoolId = assignment.SchoolId,
                ClassId = assignment.ClassId,
                SectionId = assignment.SectionId,
                SubjectId = assignment.SubjectId,
                AssignedById = assignment.AssignedById,
                Title = assignment.Title,
                Description = assignment.Description,
                AssignedDate = assignment.AssignedDate,
                DueDate = assignment.DueDate,
                MaxMarks = assignment.MaxMarks,
                Status = assignment.Status,
                AttachmentUrl = assignment.AttachmentUrl,
                CreatedAt = assignment.CreatedAt,
                UpdatedAt = assignment.UpdatedAt
            };
        }

        private static SubmissionResponse MapToSubmissionResponse(AssignmentSubmission submission)
        {
            return new SubmissionResponse
            {
                Id = submission.Id,
                AssignmentId = submission.AssignmentId,
                StudentId = submission.StudentId,
                SubmissionDate = submission.SubmissionDate,
                Content = submission.Content,
                AttachmentUrl = submission.AttachmentUrl,
                MarksObtained = submission.MarksObtained,
                Status = submission.Status,
                Feedback = submission.Feedback,
                GradedById = submission.GradedById,
                GradedDate = submission.GradedDate,
                CreatedAt = submission.CreatedAt,
                UpdatedAt = submission.UpdatedAt
            };
        }
    }
}

