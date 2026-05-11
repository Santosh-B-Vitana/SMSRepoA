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

        public AssignmentsController(IAssignmentService assignmentService, ITenantContext tenant, AppDbContext context)
        {
            _assignmentService = assignmentService;
            _tenant = tenant;
            _context = context;
        }

        // Assignment Endpoints
        [HttpGet]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        public async Task<ActionResult<AssignmentListResponse>> GetAssignments(
            [FromQuery] Guid? classId = null,
            [FromQuery] Guid? subjectId = null,
            [FromQuery] Guid? assignedById = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
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
                    effectiveAssignedById = _tenant.UserId;
                }

                var result = await _assignmentService.GetAssignmentsAsync(schoolId, classId, subjectId, effectiveAssignedById, page, pageSize);
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
        [Authorize(Roles = "Admin,Principal,Teacher")]
        public async Task<ActionResult<AssignmentResponse>> UpdateAssignment(Guid id, [FromBody] UpdateAssignmentRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var assignment = await _assignmentService.UpdateAssignmentAsync(id, schoolId, request);
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
        [Authorize(Roles = "Admin,Principal,Teacher")]
        public async Task<ActionResult> DeleteAssignment(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result = await _assignmentService.DeleteAssignmentAsync(id, schoolId);
            if (!result)
            {
                return NotFound();
            }
            return NoContent();
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
                    var parentEmail = _tenant.UserEmail;
                    var isLinked = await _context.StudentGuardians
                        .AnyAsync(g => g.StudentId == studentId
                                   && g.SchoolId == schoolId
                                   && !g.IsDeleted
                                   && g.Email != null
                                   && g.Email.ToLower() == parentEmail.ToLower());
                    if (!isLinked)
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
    }
}
