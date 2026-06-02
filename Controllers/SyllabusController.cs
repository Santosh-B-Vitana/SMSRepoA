using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.Constants;
using SmsApi.Models.DTOs;
using SmsApi.Services;
using System.Security.Claims;

namespace SmsApi.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class SyllabusController : ControllerBase
    {
        private readonly ISyllabusService _syllabusService;
        private readonly ITenantContext _tenant;
        private readonly AppDbContext _db;

        public SyllabusController(ISyllabusService syllabusService, ITenantContext tenant, AppDbContext db)
        {
            _syllabusService = syllabusService;
            _tenant = tenant;
            _db = db;
        }

        /// <summary>
        /// Helper: returns the LinkedEntityId (Staff.Id) from JWT, falling back to UserId.
        /// For staff accounts the JWT contains "LinkedEntityId" = StaffMember.Id.
        /// </summary>
        private Guid GetStaffId() => _tenant.LinkedEntityId ?? _tenant.UserId;

        /// <summary>
        /// Returns true when the current user is an admin or principal.
        /// Staff / Teacher roles are NOT included.
        /// </summary>
        private bool IsAdminOrPrincipal()
        {
            var role = _tenant.Role?.Trim().ToLowerInvariant();
            return role is "admin" or "administrator" or "principal" or "super_admin";
        }

        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        // UNITS
        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

        /// <summary>Get all syllabus units for a class/subject/year</summary>
        [HttpGet("units")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        public async Task<IActionResult> GetUnits(
            [FromQuery] Guid classId,
            [FromQuery] Guid subjectId,
            [FromQuery] string academicYear,
            [FromQuery] bool includeTopics = false)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var units = await _syllabusService.GetUnitsAsync(schoolId, classId, subjectId, academicYear, includeTopics);
            return Ok(units);
        }

        /// <summary>Get a specific syllabus unit with its topics</summary>
        [HttpGet("units/{id:guid}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        public async Task<IActionResult> GetUnit(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var unit = await _syllabusService.GetUnitByIdAsync(id, schoolId);
            if (unit == null) return NotFound(new { message = "Syllabus unit not found." });
            return Ok(unit);
        }

        /// <summary>Create a new syllabus unit</summary>
        [HttpPost("units")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipalStaff)]
        public async Task<IActionResult> CreateUnit([FromBody] CreateSyllabusUnitRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var schoolId = _tenant.GetEffectiveSchoolId();
            try
            {
                var unit = await _syllabusService.CreateUnitAsync(schoolId, request);
                return CreatedAtAction(nameof(GetUnit), new { id = unit.Id }, unit);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        /// <summary>Update a syllabus unit</summary>
        [HttpPut("units/{id:guid}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipalStaff)]
        public async Task<IActionResult> UpdateUnit(Guid id, [FromBody] UpdateSyllabusUnitRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var schoolId = _tenant.GetEffectiveSchoolId();
            var unit = await _syllabusService.UpdateUnitAsync(id, schoolId, request);
            if (unit == null) return NotFound(new { message = "Syllabus unit not found." });
            return Ok(unit);
        }

        /// <summary>Delete a syllabus unit</summary>
        [HttpDelete("units/{id:guid}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipalStaff)]
        public async Task<IActionResult> DeleteUnit(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var deleted = await _syllabusService.DeleteUnitAsync(id, schoolId);
            if (!deleted) return NotFound(new { message = "Syllabus unit not found." });
            return NoContent();
        }

        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        // TOPICS
        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

        /// <summary>Get all topics in a unit</summary>
        [HttpGet("units/{unitId:guid}/topics")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        public async Task<IActionResult> GetTopics(Guid unitId)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var topics = await _syllabusService.GetTopicsAsync(unitId, schoolId);
            return Ok(topics);
        }

        /// <summary>Get a specific topic</summary>
        [HttpGet("topics/{id:guid}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        public async Task<IActionResult> GetTopic(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var topic = await _syllabusService.GetTopicByIdAsync(id, schoolId);
            if (topic == null) return NotFound(new { message = "Topic not found." });
            return Ok(topic);
        }

        /// <summary>Create a new topic in a unit</summary>
        [HttpPost("topics")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipalStaff)]
        public async Task<IActionResult> CreateTopic([FromBody] CreateSyllabusTopicRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var schoolId = _tenant.GetEffectiveSchoolId();
            try
            {
                var topic = await _syllabusService.CreateTopicAsync(schoolId, request);
                return CreatedAtAction(nameof(GetTopic), new { id = topic.Id }, topic);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        /// <summary>Update a topic</summary>
        [HttpPut("topics/{id:guid}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipalStaff)]
        public async Task<IActionResult> UpdateTopic(Guid id, [FromBody] UpdateSyllabusTopicRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var schoolId = _tenant.GetEffectiveSchoolId();
            var topic = await _syllabusService.UpdateTopicAsync(id, schoolId, request);
            if (topic == null) return NotFound(new { message = "Topic not found." });
            return Ok(topic);
        }

        /// <summary>Mark a topic as completed (called by the teaching staff after class)</summary>
        [HttpPost("topics/{id:guid}/complete")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        public async Task<IActionResult> MarkTopicComplete(Guid id, [FromBody] MarkTopicCompleteRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var schoolId = _tenant.GetEffectiveSchoolId();
            var staffId = GetStaffId();
            var topic = await _syllabusService.MarkTopicCompleteAsync(id, schoolId, staffId, request);
            if (topic == null) return NotFound(new { message = "Topic not found." });
            return Ok(topic);
        }

        /// <summary>Delete a topic</summary>
        [HttpDelete("topics/{id:guid}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipalStaff)]
        public async Task<IActionResult> DeleteTopic(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var deleted = await _syllabusService.DeleteTopicAsync(id, schoolId);
            if (!deleted) return NotFound(new { message = "Topic not found." });
            return NoContent();
        }

        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        // LESSON PLANS
        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

        /// <summary>Get lesson plans with filtering</summary>
        [HttpGet("lesson-plans")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        public async Task<IActionResult> GetLessonPlans(
            [FromQuery] Guid? staffId,
            [FromQuery] Guid? classId,
            [FromQuery] Guid? subjectId,
            [FromQuery] Guid? sectionId,
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate,
            [FromQuery] string? status,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result = await _syllabusService.GetLessonPlansAsync(schoolId, staffId, classId, subjectId, sectionId, fromDate, toDate, status, page, pageSize);
            return Ok(result);
        }

        /// <summary>Get a specific lesson plan</summary>
        [HttpGet("lesson-plans/{id:guid}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        public async Task<IActionResult> GetLessonPlan(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var plan = await _syllabusService.GetLessonPlanByIdAsync(id, schoolId);
            if (plan == null) return NotFound(new { message = "Lesson plan not found." });
            return Ok(plan);
        }

        /// <summary>Create a lesson plan (teacher submits their plan)</summary>
        [HttpPost("lesson-plans")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        public async Task<IActionResult> CreateLessonPlan([FromBody] CreateLessonPlanRequest request)
        {
            if (!ModelState.IsValid)
            {
                var fieldErrors = ModelState
                    .Where(kvp => kvp.Value!.Errors.Count > 0)
                    .Select(kvp => $"{kvp.Key}: {string.Join("; ", kvp.Value!.Errors.Select(e => e.ErrorMessage))}")
                    .ToList();
                return BadRequest(new { message = "Validation failed", errors = fieldErrors });
            }
            var schoolId = _tenant.GetEffectiveSchoolId();
            var role = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? "";
            var isAdmin = role.Equals("Admin", StringComparison.OrdinalIgnoreCase)
                       || role.Equals("super_admin", StringComparison.OrdinalIgnoreCase)
                       || role.Equals("Principal", StringComparison.OrdinalIgnoreCase)
                       || role.Equals("HRManager", StringComparison.OrdinalIgnoreCase);

            Guid? staffId = null;
            if (!isAdmin)
            {
                // LinkedEntityId is the Staff.Id; UserId is the UserLogin.Id (different FK target)
                var linkedIdClaim = User.FindFirst("LinkedEntityId")?.Value;
                if (Guid.TryParse(linkedIdClaim, out var parsedId))
                {
                    staffId = parsedId;
                }
                else
                {
                    // Fallback: resolve staff by email when LinkedEntityId claim is absent
                    var email = User.FindFirst(ClaimTypes.Email)?.Value;
                    if (!string.IsNullOrEmpty(email))
                    {
                        var found = await _db.StaffMembers
                            .Where(s => s.SchoolId == schoolId && s.Email.ToLower() == email.ToLower() && !s.IsDeleted)
                            .Select(s => s.Id)
                            .FirstOrDefaultAsync();
                        if (found != Guid.Empty) staffId = found;
                    }
                    if (!staffId.HasValue)
                        return BadRequest(new { message = "Staff profile not found for your account. Please contact an administrator." });
                }
            }
            try
            {
                var plan = await _syllabusService.CreateLessonPlanAsync(schoolId, staffId, request);
                return CreatedAtAction(nameof(GetLessonPlan), new { id = plan.Id }, plan);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        /// <summary>Update a lesson plan (only draft plans can be edited by their author)</summary>
        [HttpPut("lesson-plans/{id:guid}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        public async Task<IActionResult> UpdateLessonPlan(Guid id, [FromBody] UpdateLessonPlanRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var schoolId = _tenant.GetEffectiveSchoolId();
            var staffId = GetStaffId();
            try
            {
                var plan = await _syllabusService.UpdateLessonPlanAsync(id, schoolId, staffId, request);
                if (plan == null) return NotFound(new { message = "Lesson plan not found." });
                return Ok(plan);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>Approve or reject a lesson plan (HOD/Principal only)</summary>
        [HttpPost("lesson-plans/{id:guid}/review")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipalStaff)]
        public async Task<IActionResult> ReviewLessonPlan(Guid id, [FromBody] ApproveLessonPlanRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var schoolId = _tenant.GetEffectiveSchoolId();
            // Use LinkedEntityId (StaffMember.Id) only — null for admin users who have no staff record
            var approverStaffId = _tenant.LinkedEntityId;
            try
            {
                var plan = await _syllabusService.ApproveLessonPlanAsync(id, schoolId, approverStaffId, request);
                if (plan == null) return NotFound(new { message = "Lesson plan not found." });
                return Ok(plan);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>Delete a lesson plan</summary>
        [HttpDelete("lesson-plans/{id:guid}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipalStaff)]
        public async Task<IActionResult> DeleteLessonPlan(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var deleted = await _syllabusService.DeleteLessonPlanAsync(id, schoolId);
            if (!deleted) return NotFound(new { message = "Lesson plan not found." });
            return NoContent();
        }

        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        // COVERAGE REPORT
        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

        /// <summary>Get syllabus coverage report for a class/subject/year</summary>
        [HttpGet("coverage")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        public async Task<IActionResult> GetCoverageReport(
            [FromQuery] Guid classId,
            [FromQuery] Guid subjectId,
            [FromQuery] string academicYear)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var report = await _syllabusService.GetCoverageReportAsync(schoolId, classId, subjectId, academicYear);
            return Ok(report);
        }

        // ════════════════════════════════════════════════════════════════
        // TEACHER ASSIGNMENT ENDPOINTS
        // ════════════════════════════════════════════════════════════════

        /// <summary>
        /// Returns the class+subject pairs assigned to the currently logged-in teacher.
        /// Uses the LinkedEntityId JWT claim (Staff.Id) to query TeacherAssignments.
        /// </summary>
        [HttpGet("my-assignments")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        public async Task<IActionResult> GetMyAssignments()
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var staffId = GetStaffId();
            var assignments = await _syllabusService.GetTeacherAssignmentsAsync(schoolId, staffId);
            return Ok(assignments);
        }

        /// <summary>
        /// Admin/Principal: for a given class+subject, returns which teacher (if any) handles each section.
        /// Used by the admin Syllabus UI to show section-teacher coverage and detect shared-teacher scenarios.
        /// </summary>
        [HttpGet("section-teachers")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<IActionResult> GetSectionTeachers(
            [FromQuery] Guid classId,
            [FromQuery] Guid subjectId)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result = await _syllabusService.GetSectionTeachersAsync(schoolId, classId, subjectId);
            return Ok(result);
        }

        /// <summary>
        /// Teacher submits a draft lesson plan for admin/principal review.
        /// Only the plan's author may call this.
        /// </summary>
        [HttpPost("lesson-plans/{id:guid}/submit")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        public async Task<IActionResult> SubmitLessonPlan(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var staffId = GetStaffId();
            try
            {
                var plan = await _syllabusService.SubmitLessonPlanAsync(id, schoolId, staffId);
                if (plan == null) return NotFound(new { message = "Lesson plan not found." });
                return Ok(plan);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Approve or reject a submitted lesson plan.
        /// Alias for review — accepts same ApproveLessonPlanRequest body.
        /// </summary>
        [HttpPost("lesson-plans/{id:guid}/approve")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipalStaff)]
        public async Task<IActionResult> ApproveLessonPlan(Guid id, [FromBody] ApproveLessonPlanRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var schoolId = _tenant.GetEffectiveSchoolId();
            // Use LinkedEntityId (StaffMember.Id) only — null for admin users who have no staff record
            var approverStaffId = _tenant.LinkedEntityId;
            try
            {
                var plan = await _syllabusService.ApproveLessonPlanAsync(id, schoolId, approverStaffId, request);
                if (plan == null) return NotFound(new { message = "Lesson plan not found." });
                return Ok(plan);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}

