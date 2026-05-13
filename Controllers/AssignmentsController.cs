using SmsApi.Models.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Services;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace SmsApi.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class AssignmentsController : ControllerBase
    {
        private readonly IAssignmentService _assignmentService;
        private readonly ITenantContext _tenant;
        private readonly AppDbContext _context;
        private readonly IParentAuthorizationService _parentAuth;
        private readonly IStudentService _studentService;

        public AssignmentsController(IAssignmentService assignmentService, ITenantContext tenant, AppDbContext context, IParentAuthorizationService parentAuth, IStudentService studentService)
        {
            _assignmentService = assignmentService;
            _tenant = tenant;
            _context = context;
            _parentAuth = parentAuth;
            _studentService = studentService;
        }

        // Assignment Endpoints
        [HttpGet]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        public async Task<ActionResult<AssignmentListResponse>> GetAssignments(
            [FromQuery] Guid? classId = null,
            [FromQuery] Guid? sectionId = null,
            [FromQuery] Guid? subjectId = null,
            [FromQuery] Guid? assignedById = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();

                // For staff/teacher role: auto-restrict to assignments they created.
                // Admin and Principal can see all assignments (or filter by assignedById if specified).
                var effectiveAssignedById = assignedById;
                var userRole = User.FindFirstValue(ClaimTypes.Role)?.ToLower()
                    ?? User.Claims.FirstOrDefault(c => c.Type == "role")?.Value?.ToLower();
                if (userRole is "staff" or "teacher")
                {
                    // Must resolve StaffMember.Id (not UserLogin.Id) to match what CreateAssignment stores
                    var userEmail = _tenant.UserEmail;
                    var staffMember = await _context.StaffMembers
                        .FirstOrDefaultAsync(s => s.SchoolId == schoolId
                                               && s.Email != null
                                               && s.Email.ToLower() == userEmail.ToLower());
                    effectiveAssignedById = staffMember?.Id ?? _tenant.UserId;
                }

                var result = await _assignmentService.GetAssignmentsAsync(schoolId, classId, sectionId, subjectId, effectiveAssignedById, page, pageSize);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "An unexpected error occurred", details = ex.Message });
            }
        }

        [HttpGet("{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        public async Task<ActionResult<AssignmentResponse>> GetAssignmentById(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var assignment = await _assignmentService.GetAssignmentByIdAsync(id, schoolId);
            if (assignment == null)
            {
                return NotFound();
            }
            return Ok(assignment);
        }

        [HttpPost]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        public async Task<ActionResult<AssignmentResponse>> CreateAssignment([FromBody] CreateAssignmentRequest request)
        {
            try
            {
                // Inject server-side identity — never trust the client for these security-sensitive fields
                request.SchoolId = _tenant.GetEffectiveSchoolId();
                // For teacher/staff, AssignedById must be the StaffMember.Id (not UserLogin.Id)
                var userRole = User.FindFirst(ClaimTypes.Role)?.Value ?? "";
                if (userRole == "Teacher" || userRole == "Staff")
                {
                    var userEmail = _tenant.UserEmail;
                    var staffMember = await _context.StaffMembers
                        .FirstOrDefaultAsync(s => s.SchoolId == request.SchoolId
                                               && s.Email != null
                                               && s.Email.ToLower() == userEmail.ToLower());
                    request.AssignedById = staffMember?.Id ?? _tenant.UserId;
                }
                else
                {
                    request.AssignedById = _tenant.UserId;
                }
                var assignment = await _assignmentService.CreateAssignmentAsync(request);
                return CreatedAtAction(nameof(GetAssignmentById), new { id = assignment.Id, schoolId = assignment.SchoolId }, assignment);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { error = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "An unexpected error occurred", details = ex.Message });
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Principal,Teacher,Staff")]
        public async Task<ActionResult<AssignmentResponse>> UpdateAssignment(Guid id, [FromBody] UpdateAssignmentRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var userEmail = _tenant.UserEmail;
                var userRole = User.FindFirstValue(ClaimTypes.Role)?.ToLower() ?? User.Claims.FirstOrDefault(c => c.Type == "role")?.Value?.ToLower();
                
                // For teachers/staff: get their StaffMember ID for authorization check
                Guid? staffMemberId = null;
                if (userRole is "staff" or "teacher")
                {
                    var staffMember = await _context.StaffMembers
                        .FirstOrDefaultAsync(s => s.SchoolId == schoolId 
                                               && s.Email != null 
                                               && s.Email.ToLower() == userEmail.ToLower());
                    staffMemberId = staffMember?.Id;
                }
                
                var assignment = await _assignmentService.UpdateAssignmentAsync(id, schoolId, request, userRole, staffMemberId);
                if (assignment == null)
                {
                    return NotFound(new { error = "Assignment not found" });
                }
                return Ok(assignment);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { error = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "An unexpected error occurred", details = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,Principal,Teacher,Staff")]
        public async Task<ActionResult> DeleteAssignment(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var userEmail = _tenant.UserEmail;
                var userRole = User.FindFirstValue(ClaimTypes.Role)?.ToLower() ?? User.Claims.FirstOrDefault(c => c.Type == "role")?.Value?.ToLower();
                
                // For teachers/staff: get their StaffMember ID for authorization check
                Guid? staffMemberId = null;
                if (userRole is "staff" or "teacher")
                {
                    var staffMember = await _context.StaffMembers
                        .FirstOrDefaultAsync(s => s.SchoolId == schoolId 
                                               && s.Email != null 
                                               && s.Email.ToLower() == userEmail.ToLower());
                    staffMemberId = staffMember?.Id;
                }
                
                var result = await _assignmentService.DeleteAssignmentAsync(id, schoolId, userRole, staffMemberId);
                if (!result)
                {
                    return NotFound(new { error = "Assignment not found or you don't have permission to delete it" });
                }
                return NoContent();
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "An unexpected error occurred", details = ex.Message });
            }
        }

        // Submission Endpoints
        [HttpGet("{assignmentId}/submissions")]
        public async Task<ActionResult<SubmissionListResponse>> GetSubmissions(
            Guid assignmentId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var result = await _assignmentService.GetSubmissionsAsync(assignmentId, page, pageSize);
            return Ok(result);
        }

        [HttpGet("submissions/{id}")]
        public async Task<ActionResult<SubmissionResponse>> GetSubmissionById(Guid id)
        {
            var submission = await _assignmentService.GetSubmissionByIdAsync(id);
            if (submission == null)
            {
                return NotFound();
            }
            return Ok(submission);
        }

        /// <summary>
        /// Get all assignments for a child's enrolled class/section with submission status.
        /// Parents can only access their own linked child. Staff can access any student.
        /// Returns every active assignment (not just submitted ones) so the parent can see
        /// what is pending, submitted, graded or overdue.
        /// </summary>
        [HttpGet("for-child")]
        [Authorize(Roles = StatusConstants.RoleGroups.StudentView)]
        public async Task<ActionResult<ChildAssignmentListResponse>> GetAssignmentsForChild(
            [FromQuery] Guid studentId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var userRole = User.FindFirst(ClaimTypes.Role)?.Value ?? "";

                if (userRole.Equals("Parent", StringComparison.OrdinalIgnoreCase))
                {
                    var parentEmail = _tenant.UserEmail ?? string.Empty;
                    if (string.IsNullOrWhiteSpace(parentEmail))
                        return StatusCode(403, new { error = "Parent email not found in token." });
                    // Use the same child-resolution logic as my-children endpoint for consistency
                    var accessibleChildren = await _studentService.GetMyChildrenAsync(schoolId, parentEmail);
                    var canAccess = accessibleChildren.Any(c => c.Id == studentId);
                    if (!canAccess)
                        return StatusCode(403, new { error = "Parents can only access their own child's data." });
                }

                // Resolve the student's active enrollment
                var enrollment = await _context.StudentEnrollments
                    .Where(e => e.StudentId == studentId && e.SchoolId == schoolId && e.Status == "active")
                    .OrderByDescending(e => e.EnrollmentDate)
                    .FirstOrDefaultAsync();

                if (enrollment == null)
                    return Ok(new ChildAssignmentListResponse());

                var skip = (page < 1 ? 0 : page - 1) * (pageSize < 1 ? 50 : pageSize > 100 ? 100 : pageSize);
                var take = pageSize < 1 ? 50 : pageSize > 100 ? 100 : pageSize;

                // All active assignments for the student's class (optionally section-filtered)
                var query = _context.Assignments
                    .Where(a => a.SchoolId == schoolId
                             && a.ClassId == enrollment.ClassId
                             && (a.SectionId == null || a.SectionId == enrollment.SectionId)
                             && a.Status == "active");

                var total = await query.CountAsync();

                var assignments = await query
                    .Include(a => a.Subject)
                    .OrderByDescending(a => a.DueDate)
                    .Skip(skip)
                    .Take(take)
                    .ToListAsync();

                var assignmentIds = assignments.Select(a => a.Id).ToList();

                var submissionMap = await _context.AssignmentSubmissions
                    .Where(s => s.StudentId == studentId && assignmentIds.Contains(s.AssignmentId))
                    .ToDictionaryAsync(s => s.AssignmentId);

                var now = DateTime.UtcNow;
                var data = assignments.Select(a =>
                {
                    submissionMap.TryGetValue(a.Id, out var sub);
                    return new ChildAssignmentView
                    {
                        Id             = a.Id,
                        Title          = a.Title,
                        Description    = a.Description,
                        SubjectName    = a.Subject?.Name ?? string.Empty,
                        AssignedDate   = a.AssignedDate,
                        DueDate        = a.DueDate,
                        MaxMarks       = a.MaxMarks,
                        AssignmentStatus = a.Status,
                        AttachmentUrl  = a.AttachmentUrl,
                        IsOverdue      = a.DueDate < now && sub == null,
                        Submission     = sub == null ? null : new ChildSubmissionSnapshot
                        {
                            Id              = sub.Id,
                            SubmissionDate  = sub.SubmissionDate,
                            MarksObtained   = sub.MarksObtained,
                            Status          = sub.Status,
                            Feedback        = sub.Feedback,
                            GradedDate      = sub.GradedDate,
                        }
                    };
                }).ToList();

                return Ok(new ChildAssignmentListResponse { Data = data, Total = total, Page = page, PageSize = pageSize });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "An unexpected error occurred", details = ex.Message });
            }
        }

        /// <summary>
        /// Get all submissions for a specific student.
        /// Admin/Staff can access any student. Parents can only access their linked child.
        /// </summary>
        [HttpGet("student-submissions")]
        public async Task<ActionResult<List<SubmissionResponse>>> GetStudentSubmissions(
            [FromQuery] Guid studentId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var userRole = User.FindFirst(ClaimTypes.Role)?.Value ?? "";

                // Parent role: verify this student is their linked child
                if (userRole.Equals("Parent", StringComparison.OrdinalIgnoreCase))
                {
                    var parentEmail = _tenant.UserEmail ?? string.Empty;
                    var canAccess = await _parentAuth.CanAccessStudentAsync(schoolId, parentEmail, studentId);
                    if (!canAccess)
                        return StatusCode(403, new { error = "Parents can only access their own child's submissions." });
                }

                var submissions = await _context.AssignmentSubmissions
                    .Where(s => s.StudentId == studentId)
                    .Include(s => s.Assignment)
                    .OrderByDescending(s => s.SubmissionDate)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(s => new
                    {
                        s.Id,
                        s.AssignmentId,
                        AssignmentTitle = s.Assignment != null ? s.Assignment.Title : "",
                        AssignmentMaxMarks = s.Assignment != null ? s.Assignment.MaxMarks : 0,
                        s.StudentId,
                        s.SubmissionDate,
                        s.Content,
                        s.AttachmentUrl,
                        s.MarksObtained,
                        s.Status,
                        s.Feedback,
                        s.GradedById,
                        s.GradedDate,
                        s.CreatedAt,
                        s.UpdatedAt,
                    })
                    .ToListAsync();

                return Ok(new { data = submissions, total = submissions.Count });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "An unexpected error occurred", details = ex.Message });
            }
        }

        [HttpPost("submissions")]
        public async Task<ActionResult<SubmissionResponse>> CreateSubmission([FromBody] CreateSubmissionRequest request)
        {
            try
            {
                var submission = await _assignmentService.CreateSubmissionAsync(request);
                return CreatedAtAction(nameof(GetSubmissionById), new { id = submission.Id }, submission);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { error = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "An unexpected error occurred", details = ex.Message });
            }
        }

        [HttpPut("submissions/{id}/grade")]
        public async Task<ActionResult<SubmissionResponse>> GradeSubmission(Guid id, [FromBody] GradeSubmissionRequest request)
        {
            try
            {
                var submission = await _assignmentService.GradeSubmissionAsync(id, request);
                if (submission == null)
                {
                    return NotFound(new { error = "Submission not found" });
                }
                return Ok(submission);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { error = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "An unexpected error occurred", details = ex.Message });
            }
        }

        // ── Staff Grading Roster ──────────────────────────────────────────────

        /// <summary>Returns all enrolled students for an assignment with their submission status.</summary>
        [HttpGet("{assignmentId}/roster")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        public async Task<ActionResult<AssignmentRosterResponse>> GetAssignmentRoster(Guid assignmentId)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var roster = await _assignmentService.GetAssignmentRosterAsync(assignmentId, schoolId);
                if (roster == null)
                    return NotFound(new { error = "Assignment not found" });
                return Ok(roster);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "An unexpected error occurred", details = ex.Message });
            }
        }

        /// <summary>Staff marks a student as submitted/not-submitted and optionally awards marks.</summary>
        [HttpPost("{assignmentId}/roster/mark")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        public async Task<ActionResult<AssignmentRosterEntry>> StaffMarkSubmission(Guid assignmentId, [FromBody] StaffMarkRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();

                // Resolve StaffMember.Id from JWT email so it matches what's stored on submissions
                var userEmail = _tenant.UserEmail;
                var staffMember = await _context.StaffMembers
                    .FirstOrDefaultAsync(s => s.SchoolId == schoolId
                                           && s.Email != null
                                           && s.Email.ToLower() == userEmail.ToLower());
                var staffId = staffMember?.Id ?? _tenant.UserId;

                var entry = await _assignmentService.StaffMarkSubmissionAsync(assignmentId, request, staffId);
                return Ok(entry);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "An unexpected error occurred", details = ex.Message });
            }
        }
    }
}
