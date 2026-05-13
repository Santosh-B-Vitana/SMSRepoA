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
        Task<AssignmentListResponse> GetAssignmentsAsync(Guid schoolId, Guid? classId = null, Guid? sectionId = null, Guid? subjectId = null, Guid? assignedById = null, int page = 1, int pageSize = 10);
        Task<AssignmentResponse?> GetAssignmentByIdAsync(Guid id, Guid schoolId);
        Task<AssignmentResponse> CreateAssignmentAsync(CreateAssignmentRequest request);
        Task<AssignmentResponse?> UpdateAssignmentAsync(Guid id, Guid schoolId, UpdateAssignmentRequest request, string userRole = "admin", Guid? staffMemberId = null);
        Task<bool> DeleteAssignmentAsync(Guid id, Guid schoolId, string userRole = "admin", Guid? staffMemberId = null);
        
        Task<SubmissionListResponse> GetSubmissionsAsync(Guid assignmentId, int page = 1, int pageSize = 10);
        Task<SubmissionResponse?> GetSubmissionByIdAsync(Guid id);
        Task<SubmissionResponse> CreateSubmissionAsync(CreateSubmissionRequest request);
        Task<SubmissionResponse?> GradeSubmissionAsync(Guid id, GradeSubmissionRequest request);

        /// <summary>Returns the assignment details plus every enrolled student with their submission status.</summary>
        Task<AssignmentRosterResponse?> GetAssignmentRosterAsync(Guid assignmentId, Guid schoolId);

        /// <summary>Staff records whether a student submitted/not-submitted and optionally awards marks.</summary>
        Task<AssignmentRosterEntry> StaffMarkSubmissionAsync(Guid assignmentId, StaffMarkRequest request, Guid staffId);
    }

    public class AssignmentService : IAssignmentService
    {
        private readonly AppDbContext _context;

        public AssignmentService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<AssignmentListResponse> GetAssignmentsAsync(Guid schoolId, Guid? classId = null, Guid? sectionId = null, Guid? subjectId = null, Guid? assignedById = null, int page = 1, int pageSize = 10)
        {
            // Normalize pagination bounds
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;
            if (pageSize > 100) pageSize = 100;

            var query = _context.Assignments
                .Include(a => a.Class)
                .Include(a => a.Section)
                .Include(a => a.Subject)
                .Include(a => a.AssignedBy)
                .Where(a => a.SchoolId == schoolId);

            if (classId.HasValue)
                query = query.Where(a => a.ClassId == classId.Value);

            if (sectionId.HasValue)
                query = query.Where(a => a.SectionId == sectionId.Value || a.SectionId == null);

            if (subjectId.HasValue)
                query = query.Where(a => a.SubjectId == subjectId.Value);

            if (assignedById.HasValue)
                query = query.Where(a => a.AssignedById == assignedById.Value);

            var total = await query.CountAsync();
            var assignments = await query
                .OrderByDescending(a => a.AssignedDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            // Fetch submission counts in one query
            var assignmentIds = assignments.Select(a => a.Id).ToList();
            var submissionStats = await _context.AssignmentSubmissions
                .Where(s => assignmentIds.Contains(s.AssignmentId))
                .GroupBy(s => s.AssignmentId)
                .Select(g => new { AssignmentId = g.Key, Total = g.Count(), Graded = g.Count(s => s.Status == "graded") })
                .ToListAsync();
            var statsMap = submissionStats.ToDictionary(s => s.AssignmentId);

            return new AssignmentListResponse
            {
                Assignments = assignments.Select(a =>
                {
                    var resp = MapToResponse(a);
                    if (statsMap.TryGetValue(a.Id, out var stats))
                    {
                        resp.SubmissionCount = stats.Total;
                        resp.GradedCount = stats.Graded;
                    }
                    return resp;
                }).ToList(),
                Total = total,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<AssignmentResponse?> GetAssignmentByIdAsync(Guid id, Guid schoolId)
        {
            var assignment = await _context.Assignments
                .Include(a => a.Class)
                .Include(a => a.Section)
                .Include(a => a.Subject)
                .Include(a => a.AssignedBy)
                .FirstOrDefaultAsync(a => a.Id == id && a.SchoolId == schoolId);

            if (assignment == null) return null;

            var resp = MapToResponse(assignment);
            var stats = await _context.AssignmentSubmissions
                .Where(s => s.AssignmentId == id)
                .GroupBy(s => s.AssignmentId)
                .Select(g => new { Total = g.Count(), Graded = g.Count(s => s.Status == "graded") })
                .FirstOrDefaultAsync();
            if (stats != null)
            {
                resp.SubmissionCount = stats.Total;
                resp.GradedCount = stats.Graded;
            }
            return resp;
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

            // Notify parents of students in the target class/section
            await NotifyParentsAsync(assignment);

            return MapToResponse(assignment);
        }

        public async Task<AssignmentResponse?> UpdateAssignmentAsync(Guid id, Guid schoolId, UpdateAssignmentRequest request, string userRole = "admin", Guid? staffMemberId = null)
        {
            var assignment = await _context.Assignments
                .FirstOrDefaultAsync(a => a.Id == id && a.SchoolId == schoolId);

            if (assignment == null) return null;

            // AUTHORIZATION CHECK: Only admin/principal or the staff member who created the assignment can edit it
            if (userRole != "admin" && userRole != "principal")
            {
                if (!staffMemberId.HasValue || assignment.AssignedById != staffMemberId.Value)
                {
                    throw new UnauthorizedAccessException("You don't have permission to edit this assignment. Only the creator can modify it.");
                }
            }

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

        public async Task<bool> DeleteAssignmentAsync(Guid id, Guid schoolId, string userRole = "admin", Guid? staffMemberId = null)
        {
            var assignment = await _context.Assignments
                .FirstOrDefaultAsync(a => a.Id == id && a.SchoolId == schoolId);

            if (assignment == null) return false;

            // AUTHORIZATION CHECK: Only admin/principal or the staff member who created the assignment can delete it
            if (userRole != "admin" && userRole != "principal")
            {
                if (!staffMemberId.HasValue || assignment.AssignedById != staffMemberId.Value)
                {
                    throw new UnauthorizedAccessException("You don't have permission to delete this assignment. Only the creator can remove it.");
                }
            }

            _context.Assignments.Remove(assignment);
            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<SubmissionListResponse> GetSubmissionsAsync(Guid assignmentId, int page = 1, int pageSize = 10)
        {
            // Normalize pagination bounds
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;
            if (pageSize > 200) pageSize = 200;

            var query = _context.AssignmentSubmissions
                .Include(s => s.Student)
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

            // Notify parents that the assignment has been graded
            await NotifyParentOnGradeAsync(submission.StudentId, assignment.SchoolId, assignment, request.MarksObtained, request.Feedback);

            return MapToSubmissionResponse(submission);
        }

        public async Task<AssignmentRosterResponse?> GetAssignmentRosterAsync(Guid assignmentId, Guid schoolId)
        {
            var assignment = await _context.Assignments
                .IgnoreQueryFilters()
                .Include(a => a.Class)
                .Include(a => a.Section)
                .Include(a => a.Subject)
                .Include(a => a.AssignedBy)
                .FirstOrDefaultAsync(a => a.Id == assignmentId && a.SchoolId == schoolId && !a.IsDeleted);

            if (assignment == null) return null;

            // Get all active enrollments for the assignment's class (and section if set)
            var enrollmentsQuery = _context.StudentEnrollments
                .Include(e => e.Student)
                .Where(e => e.SchoolId == schoolId
                         && e.ClassId == assignment.ClassId
                         && e.Status == "active");

            if (assignment.SectionId.HasValue)
                enrollmentsQuery = enrollmentsQuery.Where(e => e.SectionId == assignment.SectionId.Value);

            var enrollments = await enrollmentsQuery
                .OrderBy(e => e.RollNumber ?? e.Student!.Name)
                .ToListAsync();

            // Load all submissions for this assignment in one query
            var submissions = await _context.AssignmentSubmissions
                .Where(s => s.AssignmentId == assignmentId)
                .ToListAsync();

            var submissionMap = submissions.ToDictionary(s => s.StudentId);

            List<AssignmentRosterEntry> rosterEntries;

            if (enrollments.Count > 0)
            {
                // Use proper StudentEnrollment records
                rosterEntries = enrollments.Select(e =>
                {
                    var student = e.Student;
                    var name = student == null ? "Unknown" :
                        (!string.IsNullOrWhiteSpace(student.FirstName)
                            ? $"{student.FirstName} {student.LastName}".Trim()
                            : student.Name);

                    submissionMap.TryGetValue(e.StudentId, out var sub);
                    var hasSubmitted = sub != null && sub.Status != "not_submitted";

                    return new AssignmentRosterEntry
                    {
                        StudentId        = e.StudentId,
                        StudentName      = name,
                        RollNumber       = e.RollNumber ?? student?.RollNumber,
                        HasSubmitted     = hasSubmitted,
                        SubmissionStatus = sub?.Status,
                        MarksObtained    = sub?.MarksObtained,
                        Feedback         = sub?.Feedback,
                        SubmissionDate   = sub?.SubmissionDate,
                        SubmissionId     = sub?.Id,
                    };
                }).ToList();
            }
            else if (assignment.Class != null)
            {
                // Fallback: look up students via legacy Class/Section string fields.
                // Use IgnoreQueryFilters so the global SchoolId/IsDeleted filter
                // doesn't conflict, and explicitly filter ourselves.
                var studentsQuery = _context.Students
                    .IgnoreQueryFilters()
                    .Where(s => s.SchoolId == schoolId
                             && !s.IsDeleted
                             && s.Class == assignment.Class.Name);

                if (assignment.Section != null)
                    studentsQuery = studentsQuery.Where(s => s.Section == assignment.Section.Name);

                var legacyStudents = await studentsQuery
                    .OrderBy(s => s.RollNumber ?? s.Name)
                    .ToListAsync();

                rosterEntries = legacyStudents.Select(student =>
                {
                    var name = !string.IsNullOrWhiteSpace(student.FirstName)
                        ? $"{student.FirstName} {student.LastName}".Trim()
                        : student.Name;

                    submissionMap.TryGetValue(student.Id, out var sub);
                    var hasSubmitted = sub != null && sub.Status != "not_submitted";

                    return new AssignmentRosterEntry
                    {
                        StudentId        = student.Id,
                        StudentName      = name,
                        RollNumber       = student.RollNumber,
                        HasSubmitted     = hasSubmitted,
                        SubmissionStatus = sub?.Status,
                        MarksObtained    = sub?.MarksObtained,
                        Feedback         = sub?.Feedback,
                        SubmissionDate   = sub?.SubmissionDate,
                        SubmissionId     = sub?.Id,
                    };
                }).ToList();
            }
            else
            {
                rosterEntries = new List<AssignmentRosterEntry>();
            }

            // Build submission count stats
            var assignmentResponse = MapToResponse(assignment);
            assignmentResponse.SubmissionCount = rosterEntries.Count(r => r.HasSubmitted);
            assignmentResponse.GradedCount     = rosterEntries.Count(r => r.SubmissionStatus == "graded");

            return new AssignmentRosterResponse
            {
                Assignment = assignmentResponse,
                Students   = rosterEntries,
            };
        }

        public async Task<AssignmentRosterEntry> StaffMarkSubmissionAsync(Guid assignmentId, StaffMarkRequest request, Guid staffId)
        {
            var assignment = await _context.Assignments
                .FirstOrDefaultAsync(a => a.Id == assignmentId);
            if (assignment == null)
                throw new KeyNotFoundException($"Assignment {assignmentId} not found");

            var student = await _context.Students
                .FirstOrDefaultAsync(s => s.Id == request.StudentId);
            if (student == null)
                throw new KeyNotFoundException($"Student {request.StudentId} not found");

            if (request.MarksObtained.HasValue)
            {
                if (request.MarksObtained.Value < 0)
                    throw new ArgumentException("Marks obtained cannot be negative");
                if (request.MarksObtained.Value > assignment.MaxMarks)
                    throw new InvalidOperationException($"Marks obtained ({request.MarksObtained}) cannot exceed maximum marks ({assignment.MaxMarks})");
            }

            var existing = await _context.AssignmentSubmissions
                .FirstOrDefaultAsync(s => s.AssignmentId == assignmentId && s.StudentId == request.StudentId);

            if (!request.Submitted)
            {
                // Mark as not_submitted
                if (existing == null)
                {
                    existing = new AssignmentSubmission
                    {
                        Id           = Guid.NewGuid(),
                        AssignmentId = assignmentId,
                        StudentId    = request.StudentId,
                        SubmissionDate = DateTime.UtcNow,
                        Content      = string.Empty,
                        Status       = "not_submitted",
                        CreatedAt    = DateTime.UtcNow,
                        UpdatedAt    = DateTime.UtcNow,
                    };
                    _context.AssignmentSubmissions.Add(existing);
                }
                else
                {
                    existing.Status    = "not_submitted";
                    existing.UpdatedAt = DateTime.UtcNow;
                }
                await _context.SaveChangesAsync();
            }
            else
            {
                // Mark as submitted / graded
                if (existing == null)
                {
                    existing = new AssignmentSubmission
                    {
                        Id             = Guid.NewGuid(),
                        AssignmentId   = assignmentId,
                        StudentId      = request.StudentId,
                        SubmissionDate = DateTime.UtcNow,
                        Content        = string.Empty,  // staff-recorded offline submission
                        Status         = request.MarksObtained.HasValue ? "graded" : "submitted",
                        MarksObtained  = request.MarksObtained,
                        Feedback       = request.Feedback,
                        GradedById     = request.MarksObtained.HasValue ? staffId : null,
                        GradedDate     = request.MarksObtained.HasValue ? DateTime.UtcNow : null,
                        CreatedAt      = DateTime.UtcNow,
                        UpdatedAt      = DateTime.UtcNow,
                    };
                    _context.AssignmentSubmissions.Add(existing);
                }
                else
                {
                    if (existing.Status == "not_submitted")
                        existing.Status = "submitted";

                    if (request.MarksObtained.HasValue)
                    {
                        existing.MarksObtained = request.MarksObtained.Value;
                        existing.Feedback      = request.Feedback ?? existing.Feedback;
                        existing.GradedById    = staffId;
                        existing.GradedDate    = DateTime.UtcNow;
                        existing.Status        = "graded";
                    }
                    else if (!string.IsNullOrWhiteSpace(request.Feedback))
                    {
                        existing.Feedback = request.Feedback;
                    }

                    existing.UpdatedAt = DateTime.UtcNow;
                }
                await _context.SaveChangesAsync();

                // Notify parents when marks are awarded
                if (request.MarksObtained.HasValue)
                    await NotifyParentOnGradeAsync(request.StudentId, assignment.SchoolId, assignment, request.MarksObtained.Value, request.Feedback);
            }

            var studentName = !string.IsNullOrWhiteSpace(student.FirstName)
                ? $"{student.FirstName} {student.LastName}".Trim()
                : student.Name;

            // Get roll number from enrollment
            var enrollment = await _context.StudentEnrollments
                .Where(e => e.StudentId == request.StudentId && e.ClassId == assignment.ClassId && e.Status == "active")
                .FirstOrDefaultAsync();

            return new AssignmentRosterEntry
            {
                StudentId        = request.StudentId,
                StudentName      = studentName,
                RollNumber       = enrollment?.RollNumber ?? student.RollNumber,
                HasSubmitted     = existing.Status != "not_submitted",
                SubmissionStatus = existing.Status,
                MarksObtained    = existing.MarksObtained,
                Feedback         = existing.Feedback,
                SubmissionDate   = existing.SubmissionDate,
                SubmissionId     = existing.Id,
            };
        }

        private static AssignmentResponse MapToResponse(Assignment assignment)
        {
            return new AssignmentResponse
            {
                Id = assignment.Id,
                SchoolId = assignment.SchoolId,
                ClassId = assignment.ClassId,
                ClassName = assignment.Class?.Name ?? string.Empty,
                SectionId = assignment.SectionId,
                SectionName = assignment.Section?.Name,
                SubjectId = assignment.SubjectId,
                SubjectName = assignment.Subject?.Name ?? string.Empty,
                AssignedById = assignment.AssignedById,
                AssignedByName = assignment.AssignedBy != null
                    ? (!string.IsNullOrWhiteSpace(assignment.AssignedBy.FirstName)
                        ? $"{assignment.AssignedBy.FirstName} {assignment.AssignedBy.LastName}".Trim()
                        : assignment.AssignedBy.Name)
                    : string.Empty,
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
            var studentName = submission.Student != null
                ? (!string.IsNullOrWhiteSpace(submission.Student.FirstName)
                    ? $"{submission.Student.FirstName} {submission.Student.LastName}".Trim()
                    : submission.Student.Name)
                : string.Empty;
            return new SubmissionResponse
            {
                Id = submission.Id,
                AssignmentId = submission.AssignmentId,
                StudentId = submission.StudentId,
                StudentName = studentName,
                StudentRollNo = submission.Student?.RollNumber,
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
        private async Task NotifyParentOnGradeAsync(Guid studentId, Guid schoolId, Assignment assignment, decimal marksObtained, string? feedback)
        {
            // Look up parent login IDs by joining StudentGuardians → UserLogins on email
            var parentLoginIds = await (
                from sg in _context.StudentGuardians
                join ul in _context.UserLogins on sg.Email equals ul.Email
                where sg.StudentId == studentId && !sg.IsDeleted
                      && ul.Role == "parent" && ul.Status == "active" && !ul.IsDeleted
                select ul.Id
            ).Distinct().ToListAsync();

            if (parentLoginIds.Count == 0) return;

            var percentage = assignment.MaxMarks > 0
                ? Math.Round((marksObtained / assignment.MaxMarks) * 100, 1)
                : 0m;

            var content = $"Assignment \"{assignment.Title}\" has been graded. Marks: {marksObtained}/{assignment.MaxMarks} ({percentage}%)";
            if (!string.IsNullOrWhiteSpace(feedback))
                content += $". Feedback: {feedback}";

            var notifications = parentLoginIds.Select(loginId => new Notification
            {
                Id            = Guid.NewGuid(),
                SchoolId      = schoolId,
                RecipientId   = loginId,
                RecipientType = "Parent",
                Type          = "Assignment",
                Title         = $"Assignment Graded: {assignment.Title}",
                Content       = content,
                ReferenceId   = assignment.Id,
                ReferenceType = "Assignment",
                ActionUrl     = "/parent-assignments",
                Priority      = "Normal",
            }).ToList();

            _context.Notifications.AddRange(notifications);
            await _context.SaveChangesAsync();
        }

        private async Task NotifyParentsAsync(Assignment assignment)
        {
            var studentIds = await _context.StudentEnrollments
                .Where(e => e.SchoolId == assignment.SchoolId
                            && e.ClassId == assignment.ClassId
                            && (assignment.SectionId == null || e.SectionId == assignment.SectionId)
                            && e.Status == "active")
                .Select(e => e.StudentId)
                .Distinct()
                .ToListAsync();

            if (studentIds.Count == 0) return;

            // Look up parent login IDs by joining StudentGuardians → UserLogins on email
            var parentLoginIds = await (
                from sg in _context.StudentGuardians
                join ul in _context.UserLogins on sg.Email equals ul.Email
                where studentIds.Contains(sg.StudentId) && !sg.IsDeleted
                      && ul.Role == "parent" && ul.Status == "active" && !ul.IsDeleted
                select ul.Id
            ).Distinct().ToListAsync();

            if (parentLoginIds.Count == 0) return;

            var subject = await _context.Subjects
                .Where(s => s.Id == assignment.SubjectId)
                .Select(s => s.Name)
                .FirstOrDefaultAsync() ?? "a subject";

            var notifications = parentLoginIds.Select(loginId => new Notification
            {
                Id            = Guid.NewGuid(),
                SchoolId      = assignment.SchoolId,
                RecipientId   = loginId,
                RecipientType = "Parent",
                Type          = "Assignment",
                Title         = $"New Assignment: {assignment.Title}",
                Content       = $"A new assignment has been posted for {subject}. Due: {assignment.DueDate:dd MMM yyyy}.",
                ReferenceId   = assignment.Id,
                ReferenceType = "Assignment",
                ActionUrl     = "/parent-assignments",
                Priority      = "Normal",
            }).ToList();

            _context.Notifications.AddRange(notifications);
            await _context.SaveChangesAsync();
        }
    }
}

