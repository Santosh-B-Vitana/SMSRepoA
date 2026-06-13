using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using SmsApi.Models.DTOs;
using SmsApi.Services;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;

namespace SmsApi.Controllers
{
    /// <summary>
    /// Exam Setup — structured multi-subject exam creation and marks entry.
    /// Supports the full workflow: create → assign subjects → enter marks → finalize → publish.
    /// </summary>
    [ApiController]
    [Route("api/examinations/exam-setup")]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class ExamSetupController : ControllerBase
    {
        private readonly IExamSetupService _service;
        private readonly ICacheService _cache;
        private readonly ILogger<ExamSetupController> _logger;

        public ExamSetupController(
            IExamSetupService service,
            ICacheService cache,
            ILogger<ExamSetupController> logger)
        {
            _service = service;
            _cache = cache;
            _logger = logger;
        }

        private Guid GetSchoolId() =>
            Guid.Parse(User.FindFirst("SchoolId")?.Value
                ?? throw new UnauthorizedAccessException("SchoolId claim missing."));

        private Guid GetUserId() =>
            Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? throw new UnauthorizedAccessException("UserId claim missing."));

        // ─────────────────────────────────────────────────────────────────────
        // WIZARD HELPERS
        // ─────────────────────────────────────────────────────────────────────

        /// <summary>
        /// Preview the auto-generated exam name before creating the setup.
        /// Called at end of Step 1 in the wizard to show the admin what the exam will be named.
        /// </summary>
        [HttpGet("name-preview")]
        public async Task<ActionResult<ExamNamePreviewDto>> PreviewName(
            [FromQuery] Guid? examTypeId,
            [FromQuery] bool isCustomType = false,
            [FromQuery] string? customTypeName = null,
            [FromQuery] Guid classId = default,
            [FromQuery] Guid? sectionId = null,
            [FromQuery] string academicYear = "")
        {
            try
            {
                var schoolId = GetSchoolId();
                if (classId == Guid.Empty)
                    return BadRequest(new { message = "classId is required." });
                if (string.IsNullOrWhiteSpace(academicYear))
                    return BadRequest(new { message = "academicYear is required." });

                var result = await _service.PreviewExamNameAsync(
                    schoolId, examTypeId, isCustomType, customTypeName, classId, sectionId, academicYear);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error previewing exam name");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        /// <summary>
        /// Returns the boards configured for a class.
        /// If more than one board is returned, the wizard must show a board selection step.
        /// </summary>
        [HttpGet("class-boards/{classId:guid}")]
        public async Task<ActionResult<List<ClassBoardDto>>> GetClassBoards(Guid classId)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetClassBoardsAsync(schoolId, classId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting class boards");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        /// <summary>
        /// Returns subjects configured for a class (optionally filtered by board and academic year),
        /// annotated with core vs. elective status and default staff assignment.
        /// </summary>
        [HttpGet("class-subjects")]
        public async Task<ActionResult<List<ClassSubjectForExamDto>>> GetClassSubjects(
            [FromQuery] Guid classId,
            [FromQuery] Guid? boardConfigurationId = null,
            [FromQuery] string? academicYear = null)
        {
            try
            {
                var schoolId = GetSchoolId();
                if (classId == Guid.Empty)
                    return BadRequest(new { message = "classId is required." });

                var result = await _service.GetClassSubjectsForExamAsync(schoolId, classId, boardConfigurationId, academicYear);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting class subjects");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        // EXAM SETUP CRUD
        // ─────────────────────────────────────────────────────────────────────

        /// <summary>List all exam setups for the school with optional filters.</summary>
        [HttpGet]
        [ProducesResponseType(typeof(PaginatedResponse<ExamSetupBasicDto>), 200)]
        public async Task<ActionResult<PaginatedResponse<ExamSetupBasicDto>>> GetAll(
            [FromQuery] string? academicYear = null,
            [FromQuery] Guid? classId = null,
            [FromQuery] Guid? boardConfigurationId = null,
            [FromQuery] string? status = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetExamSetupsAsync(schoolId, academicYear, classId, boardConfigurationId, status, page, pageSize);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error listing exam setups");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        /// <summary>Get a single exam setup with all subject details.</summary>
        [HttpGet("{id:guid}")]
        [ProducesResponseType(typeof(ExamSetupDetailDto), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<ExamSetupDetailDto>> GetById(Guid id)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetExamSetupByIdAsync(schoolId, id);
                if (result == null) return NotFound(new { message = "Exam setup not found." });
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting exam setup {Id}", id);
                return StatusCode(500, new { message = ex.Message });
            }
        }

        /// <summary>Create a new exam setup (wizard final step).</summary>
        [HttpPost]
        [ProducesResponseType(typeof(ExamSetupDetailDto), 201)]
        [ProducesResponseType(400)]
        public async Task<ActionResult<ExamSetupDetailDto>> Create([FromBody] CreateExamSetupDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.CreateExamSetupAsync(schoolId, dto);
                return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating exam setup");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        /// <summary>Update an existing exam setup (only allowed in draft/scheduled state).</summary>
        [HttpPut("{id:guid}")]
        [ProducesResponseType(typeof(ExamSetupDetailDto), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<ExamSetupDetailDto>> Update(Guid id, [FromBody] CreateExamSetupDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.UpdateExamSetupAsync(schoolId, id, dto);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating exam setup {Id}", id);
                return StatusCode(500, new { message = ex.Message });
            }
        }

        /// <summary>Delete an exam setup (not allowed once published).</summary>
        [HttpDelete("{id:guid}")]
        [ProducesResponseType(204)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<ActionResult> Delete(Guid id)
        {
            try
            {
                var schoolId = GetSchoolId();
                var deleted = await _service.DeleteExamSetupAsync(schoolId, id);
                if (!deleted) return NotFound(new { message = "Exam setup not found." });
                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting exam setup {Id}", id);
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        // MARKS ENTRY
        // ─────────────────────────────────────────────────────────────────────

        /// <summary>
        /// Get the marks-entry sheet for a specific subject in an exam setup.
        /// Staff can only access subjects assigned to them; admins can access all.
        /// </summary>
        [HttpGet("{examSetupId:guid}/subjects/{examSetupSubjectId:guid}/marks")]
        [ProducesResponseType(typeof(MarksEntrySheetDto), 200)]
        [ProducesResponseType(403)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<MarksEntrySheetDto>> GetMarksSheet(
            Guid examSetupId, Guid examSetupSubjectId)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                var role = (User.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty).ToLowerInvariant();
                var isAdmin = role is "admin" or "super_admin" or "superadmin" or "principal";
                var staffEmail = isAdmin ? null : User.FindFirst(ClaimTypes.Email)?.Value;

                var sheet = await _service.GetMarksEntrySheetAsync(
                    schoolId, examSetupId, examSetupSubjectId, staffEmail);

                return Ok(sheet);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting marks sheet");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        /// <summary>
        /// Save marks for all students in a subject (bulk).
        /// Staff can only save for assigned subjects; admins can save for any.
        /// Supports idempotency: pass X-Idempotency-Key header to safely retry without double-saving.
        /// </summary>
        [HttpPost("{examSetupId:guid}/subjects/{examSetupSubjectId:guid}/marks")]
        [ProducesResponseType(typeof(BulkOperationResult), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(403)]
        public async Task<ActionResult<BulkOperationResult>> SaveMarks(
            Guid examSetupId, Guid examSetupSubjectId, [FromBody] BulkMarksEntryDto dto,
            [FromHeader(Name = "X-Idempotency-Key")] string? idempotencyKey = null)
        {
            try
            {
                if (dto.ExamSetupId != examSetupId || dto.ExamSetupSubjectId != examSetupSubjectId)
                    return BadRequest(new { message = "Route IDs must match body IDs." });

                // Return cached result for duplicate submissions from offline queue
                if (!string.IsNullOrWhiteSpace(idempotencyKey))
                {
                    var cached = await _cache.GetAsync<BulkOperationResult>($"marks_idem:{idempotencyKey}");
                    if (cached != null) return Ok(cached);
                }

                var schoolId = GetSchoolId();
                var userId = GetUserId();
                var role = (User.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty).ToLowerInvariant();
                var isAdmin = role is "admin" or "super_admin" or "superadmin" or "principal";
                var staffEmail = User.FindFirst(ClaimTypes.Email)?.Value;

                var result = await _service.SaveBulkMarksAsync(schoolId, dto, userId, staffEmail, isAdmin);

                if (!string.IsNullOrWhiteSpace(idempotencyKey))
                    await _cache.SetAsync($"marks_idem:{idempotencyKey}", result, CacheDurations.VeryLong);

                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving marks for exam setup {Id}", examSetupId);
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        // FINALIZE & PUBLISH
        // ─────────────────────────────────────────────────────────────────────

        /// <summary>
        /// Unlock a locked subject so marks can be corrected (admin only).
        /// Resets subject status from 'locked' back to 'marks_entry'.
        /// </summary>
        [HttpPut("{examSetupId:guid}/subjects/{examSetupSubjectId:guid}/unlock")]
        [Authorize(Roles = "Admin,Principal,SuperAdmin")]
        [ProducesResponseType(204)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> UnlockSubjectForEdit(Guid examSetupId, Guid examSetupSubjectId)
        {
            try
            {
                var schoolId = GetSchoolId();
                await _service.UnlockSubjectForEditAsync(schoolId, examSetupId, examSetupSubjectId);
                return NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error unlocking subject {SubjectId}", examSetupSubjectId);
                return StatusCode(500, new { message = ex.Message });
            }
        }

        /// <summary>
        /// Reopen a published exam for re-editing (admin only).
        /// Reverts status to marks_entry, unlocks all subjects and marks entries.
        /// </summary>
        [HttpPost("{id:guid}/reopen")]
        [Authorize(Roles = "Admin,Principal,SuperAdmin")]
        [ProducesResponseType(typeof(ExamSetupDetailDto), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<ExamSetupDetailDto>> ReopenForEditing(Guid id)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.ReopenForEditingAsync(schoolId, id);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error reopening exam setup {Id}", id);
                return StatusCode(500, new { message = ex.Message });
            }
        }

        /// <summary>
        /// Calculate grades for all students across all subjects in the exam setup.
        /// Uses class-level GradeTiers → board grading scale → school default grading.
        /// Must be called before publishing.
        /// </summary>
        [HttpPost("{id:guid}/finalize")]
        [ProducesResponseType(typeof(ExamSetupDetailDto), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<ExamSetupDetailDto>> FinalizeAndCalculateGrades(Guid id)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.FinalizeAndCalculateGradesAsync(schoolId, id);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error finalizing exam setup {Id}", id);
                return StatusCode(500, new { message = ex.Message });
            }
        }

        /// <summary>
        /// Publish results to parent portals.
        /// Generates report cards and sends notifications to guardians.
        /// Exam setup must be in 'finalized' state.
        /// </summary>
        [HttpPost("{id:guid}/publish")]
        [ProducesResponseType(typeof(PublishResultsResponseDto), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<PublishResultsResponseDto>> PublishResults(Guid id)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                var result = await _service.PublishResultsToParentsAsync(schoolId, id, userId);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error publishing results for exam setup {Id}", id);
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        // RESULTS
        // ─────────────────────────────────────────────────────────────────────

        /// <summary>Get consolidated result summaries for all students in an exam setup.</summary>
        [HttpGet("{id:guid}/results")]
        [ProducesResponseType(typeof(List<StudentExamResultSummaryDto>), 200)]
        public async Task<ActionResult<List<StudentExamResultSummaryDto>>> GetResults(Guid id)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetStudentResultSummariesAsync(schoolId, id);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting results for exam setup {Id}", id);
                return StatusCode(500, new { message = ex.Message });
            }
        }

        /// <summary>Get result summary for a specific student in an exam setup.</summary>
        [HttpGet("{id:guid}/results/{studentId:guid}")]
        [ProducesResponseType(typeof(StudentExamResultSummaryDto), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<StudentExamResultSummaryDto>> GetStudentResult(Guid id, Guid studentId)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetStudentResultSummaryAsync(schoolId, id, studentId);
                if (result == null) return NotFound(new { message = "Result not found for this student." });
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting student result");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        // STAFF VIEW
        // ─────────────────────────────────────────────────────────────────────

        /// <summary>
        /// Returns exam setups where the calling staff member is assigned to enter marks.
        /// Used to populate the staff portal Grades section.
        /// </summary>
        [HttpGet("my-assignments")]
        [ProducesResponseType(typeof(List<ExamSetupBasicDto>), 200)]
        public async Task<ActionResult<List<ExamSetupBasicDto>>> GetMyAssignments(
            [FromQuery] string? academicYear = null)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userEmail = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value ?? string.Empty;
                var result = await _service.GetExamSetupsForStaffAsync(schoolId, userEmail, academicYear);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting staff exam assignments");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        /// <summary>
        /// Returns KPI stats for the grades dashboard, scoped to the calling staff member's exam assignments.
        /// Counts: total exams, published exams, total published marks entries, average percentage, pass rate.
        /// </summary>
        [HttpGet("my-stats")]
        [ProducesResponseType(typeof(StaffExamStatsDto), 200)]
        public async Task<ActionResult<StaffExamStatsDto>> GetMyStats()
        {
            try
            {
                var schoolId = GetSchoolId();
                var userEmail = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value ?? string.Empty;
                var result = await _service.GetStaffExamStatsAsync(schoolId, userEmail);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting staff exam stats");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        /// <summary>
        /// Returns paginated published student marks for the calling staff member's exam assignments.
        /// Supports optional class and section filtering. Includes available class/section options for dropdowns.
        /// </summary>
        [HttpGet("my-student-marks")]
        [ProducesResponseType(typeof(StaffStudentMarksPageDto), 200)]
        public async Task<ActionResult<StaffStudentMarksPageDto>> GetMyStudentMarks(
            [FromQuery] Guid? classId = null,
            [FromQuery] Guid? sectionId = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 100)
        {
            try
            {
                if (page < 1) page = 1;
                if (pageSize < 1 || pageSize > 500) pageSize = 100;
                var schoolId = GetSchoolId();
                var userEmail = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value ?? string.Empty;
                var result = await _service.GetStaffStudentMarksAsync(schoolId, userEmail, classId, sectionId, page, pageSize);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting staff student marks");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        // HALL TICKETS
        // ─────────────────────────────────────────────────────────────────────

        /// <summary>Returns the list of enrolled students with their hall ticket numbers for preview/selection UI.</summary>
        [HttpGet("{id:guid}/hall-ticket-students")]
        [ProducesResponseType(200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetHallTicketStudents(Guid id, [FromServices] IHallTicketService hallTicketService)
        {
            try
            {
                var schoolId = GetSchoolId();
                var students = await hallTicketService.GetStudentsForHallTicketsAsync(schoolId, id);
                return Ok(students);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching hall ticket students for exam setup {Id}", id);
                return StatusCode(500, new { message = "Failed to fetch students.", error = ex.Message });
            }
        }

        /// <summary>Download a single student's hall ticket PDF by enrollment ID.</summary>
        [HttpGet("{id:guid}/hall-tickets/{enrollmentId:guid}")]
        [ProducesResponseType(typeof(FileContentResult), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> DownloadSingleHallTicket(Guid id, Guid enrollmentId, [FromServices] IHallTicketService hallTicketService)
        {
            try
            {
                var schoolId = GetSchoolId();
                var (pdfBytes, fileName) = await hallTicketService.GenerateSingleHallTicketPdfAsync(schoolId, id, enrollmentId);
                return File(pdfBytes, "application/pdf", fileName);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating single hall ticket for enrollment {EnrollmentId}", enrollmentId);
                return StatusCode(500, new { message = "Failed to generate hall ticket.", error = ex.Message });
            }
        }

        /// <summary>
        /// Generate and download a PDF containing one hall ticket per enrolled student.
        /// The PDF has 2 hall tickets per A4 page and includes school branding, student details,
        /// subject-wise exam schedule (date, time, venue, max marks) and signature blocks.
        /// </summary>
        [HttpGet("{id:guid}/hall-tickets")]
        [ProducesResponseType(typeof(FileContentResult), 200)]
        [ProducesResponseType(404)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> DownloadHallTickets(Guid id, [FromServices] IHallTicketService hallTicketService)
        {
            try
            {
                var schoolId = GetSchoolId();
                var (pdfBytes, fileName) = await hallTicketService.GenerateHallTicketsPdfAsync(schoolId, id);
                return File(pdfBytes, "application/pdf", fileName);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating hall tickets for exam setup {Id}", id);
                return StatusCode(500, new { message = "Failed to generate hall tickets.", error = ex.Message });
            }
        }
    }
}
