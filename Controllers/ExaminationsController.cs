using SmsApi.Models.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using SmsApi.Models.DTOs;
using SmsApi.Services;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using SmsApi.Data;
using Microsoft.EntityFrameworkCore;
using System.Linq;

namespace SmsApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class ExaminationsController : ControllerBase
    {
        private readonly IExaminationService _service;
        private readonly IAcademicYearContextService _yearContextService;
        private readonly ILogger<ExaminationsController> _logger;
        private readonly AppDbContext _context;

        public ExaminationsController(
            IExaminationService service,
            IAcademicYearContextService yearContextService,
            ILogger<ExaminationsController> logger,
            AppDbContext context)
        {
            _service = service;
            _yearContextService = yearContextService;
            _logger = logger;
            _context = context;
        }

        private Guid GetSchoolId()
        {
            var schoolIdClaim = User.FindFirst("SchoolId")?.Value;
            return Guid.Parse(schoolIdClaim ?? throw new UnauthorizedAccessException());
        }

        private Guid GetUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.Parse(userIdClaim ?? throw new UnauthorizedAccessException());
        }

        // ========== EXAMS API ==========

        /// <summary>
        /// Get paginated exams with filters (respects X-Academic-Year header for year-scoped results)
        /// </summary>
        [HttpGet("exams")]
        [ProducesResponseType(typeof(PaginatedResponse<ExamBasicDto>), 200)]
        public async Task<ActionResult<PaginatedResponse<ExamBasicDto>>> GetExams(
            [FromQuery] ExamFiltersDto filters,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            try
            {
                var schoolId = GetSchoolId();
                
                // Resolve effective academic year from header (header has priority) or query param
                var headerYear = (string?)HttpContext.Items["AcademicYearHeaderValue"] ?? "";
                var effectiveYear = await _yearContextService.GetEffectiveYearAsync(
                    schoolId,
                    string.IsNullOrWhiteSpace(headerYear) ? null : headerYear,
                    filters.AcademicYear);
                
                // Apply resolved year to filters (unless user explicitly queried different year)
                if (string.IsNullOrWhiteSpace(filters.AcademicYear))
                {
                    filters.AcademicYear = effectiveYear;
                }
                
                var result = await _service.GetExamsAsync(schoolId, filters, page, pageSize);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting exams");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Get exam by ID (Full DTO)
        /// </summary>
        [HttpGet("exams/{id}")]
        [ProducesResponseType(typeof(ExamFullDto), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<ExamFullDto>> GetExamById(Guid id)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetExamByIdAsync(schoolId, id);
                
                if (result == null)
                    return NotFound(new { message = "Exam not found" });
                
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting exam {Id}", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Create a new exam
        /// </summary>
        [HttpPost("exams")]
        [ProducesResponseType(typeof(ExamFullDto), 201)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<ExamFullDto>> CreateExam([FromBody] CreateExamDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.CreateExamAsync(schoolId, dto);
                
                return CreatedAtAction(nameof(GetExamById), new { id = result.Id }, result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(new { message = "Unauthorized" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating exam");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Update an existing exam
        /// </summary>
        [HttpPut("exams/{id}")]
        [ProducesResponseType(typeof(ExamFullDto), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<ExamFullDto>> UpdateExam(
            Guid id, 
            [FromBody] CreateExamDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.UpdateExamAsync(schoolId, id, dto);
                
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(new { message = "Unauthorized" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating exam {Id}", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Delete an exam
        /// </summary>
        [HttpDelete("exams/{id}")]
        [ProducesResponseType(204)]
        [ProducesResponseType(404)]
        public async Task<ActionResult> DeleteExam(Guid id)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.DeleteExamAsync(schoolId, id);
                
                if (!result)
                    return NotFound(new { message = "Exam not found" });
                
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting exam {Id}", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Finalize exam results - calculate ranks and publish results
        /// </summary>
        [HttpPost("exams/{id}/finalize")]
        [ProducesResponseType(200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        [ProducesResponseType(404)]
        public async Task<ActionResult> FinalizeExamResults(Guid id)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.FinalizeExamResultsAsync(schoolId, id);
                
                if (!result)
                    return NotFound(new { message = "Exam not found or no results to finalize" });
                
                return Ok(new { message = "Exam results finalized successfully", examId = id });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(new { message = "Unauthorized" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error finalizing exam results for exam {Id}", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // ========== EXAM RESULTS API ==========

        /// <summary>
        /// Get paginated exam results with filters
        /// </summary>
        [HttpGet("results")]
        [ProducesResponseType(typeof(PaginatedResponse<ResultBasicDto>), 200)]
        public async Task<ActionResult<PaginatedResponse<ResultBasicDto>>> GetResults(
            [FromQuery] ResultFiltersDto filters,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetResultsAsync(schoolId, filters, page, pageSize);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting exam results");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Get exam result by ID (Full DTO)
        /// </summary>
        [HttpGet("results/{id}")]
        [ProducesResponseType(typeof(ResultFullDto), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<ResultFullDto>> GetResultById(Guid id)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetResultByIdAsync(schoolId, id);
                
                if (result == null)
                    return NotFound(new { message = "Exam result not found" });
                
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting exam result {Id}", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Create a new exam result
        /// </summary>
        [HttpPost("results")]
        [ProducesResponseType(typeof(ResultFullDto), 201)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<ResultFullDto>> CreateResult([FromBody] CreateResultDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.CreateResultAsync(schoolId, dto);
                
                return CreatedAtAction(nameof(GetResultById), new { id = result.Id }, result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(new { message = "Unauthorized" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating exam result");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Bulk create exam results for multiple students
        /// </summary>
        [HttpPost("results/bulk")]
        [ProducesResponseType(typeof(BulkOperationResult), 201)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        public async Task<ActionResult<BulkOperationResult>> BulkCreateResults(
            [FromBody] BulkResultDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                
                if (dto.Results == null || dto.Results.Count == 0)
                    return BadRequest(new { message = "At least one result is required" });
                if (dto.Results.Count > 500)
                    return BadRequest(new { message = "Cannot process more than 500 results at once" });
                
                var result = await _service.BulkCreateResultsAsync(schoolId, dto);
                
                return CreatedAtAction(nameof(GetResults), null, result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(new { message = "Unauthorized" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error bulk creating exam results");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // ========== REPORT CARDS API ==========

        /// <summary>
        /// Get student report cards for all exams
        /// </summary>
        [HttpGet("report-cards/{studentId}")]
        [ProducesResponseType(typeof(List<ReportCardDto>), 200)]
        public async Task<ActionResult<List<ReportCardDto>>> GetStudentReportCards(
            Guid studentId,
            [FromQuery] string? academicYear = null)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetStudentReportCardsAsync(schoolId, studentId, academicYear);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting report cards for student {StudentId}", studentId);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Generate a report card for a student
        /// </summary>
        [HttpPost("report-cards")]
        [ProducesResponseType(typeof(ReportCardDto), 201)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<ReportCardDto>> GenerateReportCard(
            [FromBody] GenerateReportCardDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GenerateReportCardAsync(schoolId, dto);
                
                return CreatedAtAction(nameof(GetStudentReportCards), new { studentId = dto.StudentId }, result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(new { message = "Unauthorized" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating report card");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // ========== STATISTICS API ==========

        /// <summary>
        /// Get examination statistics and analytics
        /// </summary>
        [HttpGet("stats")]
        [ProducesResponseType(typeof(ExamStatsDto), 200)]
        public async Task<ActionResult<ExamStatsDto>> GetExamStats(
            [FromQuery] ExamFiltersDto? filters = null)
        {
            try
            {
                var schoolId = GetSchoolId();

                // Apply same academic year context resolution as GetExams
                var headerYear = (string?)HttpContext.Items["AcademicYearHeaderValue"] ?? "";
                var effectiveYear = await _yearContextService.GetEffectiveYearAsync(
                    schoolId,
                    string.IsNullOrWhiteSpace(headerYear) ? null : headerYear,
                    filters?.AcademicYear);

                filters ??= new ExamFiltersDto();
                if (string.IsNullOrWhiteSpace(filters.AcademicYear))
                {
                    filters.AcademicYear = effectiveYear;
                }

                var result = await _service.GetExamStatsAsync(schoolId, filters);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting exam statistics");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // ═══════════════════════════════════════════════════════════════════════
        // HALL TICKETS — Bulk generate and retrieve
        // ═══════════════════════════════════════════════════════════════════════

        /// <summary>
        /// Bulk-generate hall ticket numbers for all registered students in an exam.
        /// Skips students who already have a hall ticket number.
        /// </summary>
        [HttpPost("exams/{examId}/generate-hall-tickets")]
        [Authorize(Roles = "Admin,Principal,Teacher")]
        public async Task<ActionResult> GenerateHallTickets(Guid examId, [FromQuery] string? prefix = null)
        {
            try
            {
                var schoolId = GetSchoolId();
                var exam = await _context.Examinations.FirstOrDefaultAsync(e => e.Id == examId && e.SchoolId == schoolId && !e.IsDeleted);
                if (exam == null) return NotFound(new { message = "Exam not found." });

                var registrations = await _context.ExamRegistrations
                    .Where(r => r.ExamId == examId && r.SchoolId == schoolId && !r.IsDeleted
                                && (r.HallTicketNumber == null || r.HallTicketNumber == ""))
                    .OrderBy(r => r.CreatedAt)
                    .ToListAsync();

                if (registrations.Count == 0) return Ok(new { message = "All registered students already have hall ticket numbers.", generated = 0 });

                string pfx = string.IsNullOrWhiteSpace(prefix) ? "HT" : prefix.ToUpperInvariant();
                string dateTag = exam.ExamDate.ToString("yyyyMMdd");
                int seq = 1;

                foreach (var reg in registrations)
                {
                    reg.HallTicketNumber = $"{pfx}-{dateTag}-{seq:D4}";
                    reg.UpdatedAt = DateTime.UtcNow;
                    seq++;
                }

                await _context.SaveChangesAsync();
                return Ok(new { message = $"Generated hall tickets for {registrations.Count} students.", generated = registrations.Count });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating hall tickets for exam {ExamId}", examId);
                return StatusCode(500, new { message = "Failed to generate hall tickets.", error = ex.Message });
            }
        }

        /// <summary>
        /// Get hall ticket data for a student for a specific exam.
        /// Returns student info, exam details, hall ticket number, seat, venue.
        /// </summary>
        [HttpGet("exams/{examId}/hall-tickets/{studentId}")]
        [Authorize(Roles = "Admin,Principal,Teacher,Parent,Student")]
        public async Task<ActionResult> GetHallTicket(Guid examId, Guid studentId)
        {
            try
            {
                var schoolId = GetSchoolId();
                var reg = await _context.ExamRegistrations
                    .Include(r => r.Student)
                    .Include(r => r.Exam)
                    .FirstOrDefaultAsync(r => r.ExamId == examId && r.StudentId == studentId
                                             && r.SchoolId == schoolId && !r.IsDeleted);
                if (reg == null) return NotFound(new { message = "Exam registration not found." });
                if (string.IsNullOrWhiteSpace(reg.HallTicketNumber))
                    return BadRequest(new { message = "Hall ticket has not been generated for this student yet." });

                return Ok(new
                {
                    HallTicketNumber = reg.HallTicketNumber,
                    SeatNumber = reg.SeatNumber,
                    Status = reg.Status,
                    Student = new { reg.Student!.Id, reg.Student.Name, reg.Student.AdmissionNumber, reg.Student.Class },
                    Exam = new { reg.Exam!.Id, reg.Exam.Name, reg.Exam.ExamDate, reg.Exam.StartTime, reg.Exam.EndTime, reg.Exam.Venue, reg.Exam.TotalMarks, reg.Exam.Duration }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching hall ticket for exam {ExamId}, student {StudentId}", examId, studentId);
                return StatusCode(500, new { message = "Failed to fetch hall ticket.", error = ex.Message });
            }
        }

        /// <summary>
        /// Get all hall tickets for an exam (for bulk print / download).
        /// </summary>
        [HttpGet("exams/{examId}/hall-tickets")]
        [Authorize(Roles = "Admin,Principal,Teacher")]
        public async Task<ActionResult> GetAllHallTickets(Guid examId)
        {
            try
            {
                var schoolId = GetSchoolId();
                var tickets = await _context.ExamRegistrations
                    .Include(r => r.Student)
                    .Include(r => r.Exam)
                    .Where(r => r.ExamId == examId && r.SchoolId == schoolId && !r.IsDeleted
                                && r.HallTicketNumber != null && r.HallTicketNumber != "")
                    .OrderBy(r => r.HallTicketNumber)
                    .Select(r => new
                    {
                        r.HallTicketNumber, r.SeatNumber, r.Status,
                        Student = new { r.Student!.Id, r.Student.Name, r.Student.AdmissionNumber, r.Student.Class, r.Student.Section },
                        Exam = new { r.Exam!.Id, r.Exam.Name, r.Exam.ExamDate, r.Exam.StartTime, r.Exam.EndTime, r.Exam.Venue, r.Exam.TotalMarks }
                    }).ToListAsync();

                return Ok(new { examId, count = tickets.Count, hallTickets = tickets });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching all hall tickets for exam {ExamId}", examId);
                return StatusCode(500, new { message = "Failed to fetch hall tickets.", error = ex.Message });
            }
        }

        // ═══════════════════════════════════════════════════════════════════════
        // PROMOTE EXAM STRUCTURE — Copy exams to next academic year
        // ═══════════════════════════════════════════════════════════════════════

        /// <summary>
        /// Promote all exams from a source academic year to a target year.
        /// Copies exam metadata (type, class, subject, marks) but resets dates by +1 year,
        /// clears results, and sets status back to "scheduled".
        /// </summary>
        [HttpPost("exams/promote")]
        [Authorize(Roles = "Admin,Principal")]
        public async Task<ActionResult> PromoteExamStructure([FromBody] PromoteExamStructureRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.SourceAcademicYear) || string.IsNullOrWhiteSpace(request.TargetAcademicYear))
                return BadRequest(new { message = "Both source and target academic years are required." });
            if (request.SourceAcademicYear == request.TargetAcademicYear)
                return BadRequest(new { message = "Source and target academic years must be different." });
            try
            {
                var schoolId = GetSchoolId();

                // Check if target year already has exams (prevent double-promote)
                var targetExists = await _context.Examinations.AnyAsync(e =>
                    e.SchoolId == schoolId && e.AcademicYear == request.TargetAcademicYear && !e.IsDeleted);
                if (targetExists && !request.Force)
                    return Conflict(new { message = $"Exams for year '{request.TargetAcademicYear}' already exist. Pass force=true to override." });

                var sourceExams = await _context.Examinations
                    .Where(e => e.SchoolId == schoolId && e.AcademicYear == request.SourceAcademicYear && !e.IsDeleted)
                    .ToListAsync();

                if (sourceExams.Count == 0)
                    return NotFound(new { message = $"No exams found for academic year '{request.SourceAcademicYear}'." });

                int yearDiff = ParseAcademicYearDiff(request.SourceAcademicYear, request.TargetAcademicYear);
                var promoted = new List<SmsApi.Models.Entities.Exam>();

                foreach (var src in sourceExams)
                {
                    promoted.Add(new SmsApi.Models.Entities.Exam
                    {
                        Id = Guid.NewGuid(), SchoolId = schoolId,
                        Name = src.Name, Class = src.Class, Section = src.Section,
                        Subject = src.Subject, ExamTypeId = src.ExamTypeId, SubjectId = src.SubjectId,
                        SubjectTypeId = src.SubjectTypeId, ClassId = src.ClassId, SectionId = src.SectionId,
                        BoardConfigurationId = src.BoardConfigurationId,
                        ExamDate = src.ExamDate.AddYears(yearDiff),
                        StartTime = src.StartTime, EndTime = src.EndTime,
                        Duration = src.Duration, Venue = src.Venue,
                        TotalMarks = src.TotalMarks, PassingMarks = src.PassingMarks,
                        AcademicYear = request.TargetAcademicYear, Term = src.Term,
                        Description = src.Description, Status = "scheduled"
                    });
                }

                _context.Examinations.AddRange(promoted);
                await _context.SaveChangesAsync();

                return Ok(new { message = $"Promoted {promoted.Count} exams to '{request.TargetAcademicYear}'.", count = promoted.Count });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error promoting exam structure from {Source} to {Target}", request.SourceAcademicYear, request.TargetAcademicYear);
                return StatusCode(500, new { message = "Failed to promote exam structure.", error = ex.Message });
            }
        }

        private static int ParseAcademicYearDiff(string source, string target)
        {
            if (int.TryParse(source.Split('-')[0], out int s) && int.TryParse(target.Split('-')[0], out int t))
                return t - s;
            return 1;
        }

        // ═══════════════════════════════════════════════════════════════════════
        // CO-SCHOLASTIC GRADING — CBSE mandated activity assessments
        // ═══════════════════════════════════════════════════════════════════════

        /// <summary>Get co-scholastic areas configured for the school</summary>
        [HttpGet("coscholastic/areas")]
        [Authorize(Roles = "Admin,Principal,Teacher")]
        public async Task<ActionResult> GetCoScholasticAreas()
        {
            try
            {
                var schoolId = GetSchoolId();
                var areas = await _context.CoScholasticAreas
                    .Where(a => a.SchoolId == schoolId && !a.IsDeleted)
                    .OrderBy(a => a.DisplayOrder).ThenBy(a => a.Name)
                    .Select(a => new { a.Id, a.Name, a.Code, a.Description, a.GradeScale, a.DisplayOrder, a.IsActive })
                    .ToListAsync();
                return Ok(areas);
            }
            catch (Exception ex) { return StatusCode(500, new { message = "Failed to fetch areas.", error = ex.Message }); }
        }

        /// <summary>Create a co-scholastic area</summary>
        [HttpPost("coscholastic/areas")]
        [Authorize(Roles = "Admin,Principal")]
        public async Task<ActionResult> CreateCoScholasticArea([FromBody] CreateCoScholasticAreaRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var schoolId = GetSchoolId();
                var dup = await _context.CoScholasticAreas.AnyAsync(a => a.SchoolId == schoolId && a.Name == request.Name && !a.IsDeleted);
                if (dup) return Conflict(new { message = $"Area '{request.Name}' already exists." });

                var entity = new SmsApi.Models.Entities.CoScholasticArea
                {
                    Id = Guid.NewGuid(), SchoolId = schoolId, Name = request.Name, Code = request.Code,
                    Description = request.Description, GradeScale = request.GradeScale ?? "A-E",
                    DisplayOrder = request.DisplayOrder, IsActive = true
                };
                _context.CoScholasticAreas.Add(entity);
                await _context.SaveChangesAsync();
                return CreatedAtAction(nameof(GetCoScholasticAreas), new { entity.Id }, new { entity.Id, entity.Name });
            }
            catch (Exception ex) { return StatusCode(500, new { message = "Failed to create area.", error = ex.Message }); }
        }

        /// <summary>Get co-scholastic assessments for a student in an academic year</summary>
        [HttpGet("coscholastic/students/{studentId}")]
        [Authorize(Roles = "Admin,Principal,Teacher,Parent,Student")]
        public async Task<ActionResult> GetStudentCoScholasticAssessments(Guid studentId, [FromQuery] string? academicYear = null, [FromQuery] int? term = null)
        {
            try
            {
                var schoolId = GetSchoolId();
                var query = _context.CoScholasticAssessments
                    .Include(a => a.CoScholasticArea)
                    .Where(a => a.StudentId == studentId && a.SchoolId == schoolId && !a.IsDeleted);

                if (!string.IsNullOrWhiteSpace(academicYear)) query = query.Where(a => a.AcademicYear == academicYear);
                if (term.HasValue) query = query.Where(a => a.Term == term.Value);

                var assessments = await query
                    .OrderBy(a => a.CoScholasticArea!.DisplayOrder).ThenBy(a => a.Term)
                    .Select(a => new {
                        a.Id, a.AcademicYear, a.Term, a.Grade, a.Remarks, a.AssessedByStaffId,
                        Area = new { a.CoScholasticArea!.Id, a.CoScholasticArea.Name, a.CoScholasticArea.Code, a.CoScholasticArea.GradeScale }
                    }).ToListAsync();
                return Ok(assessments);
            }
            catch (Exception ex) { return StatusCode(500, new { message = "Failed to fetch assessments.", error = ex.Message }); }
        }

        /// <summary>Save (upsert) co-scholastic assessments for a student</summary>
        [HttpPost("coscholastic/assessments")]
        [Authorize(Roles = "Admin,Principal,Teacher")]
        public async Task<ActionResult> SaveCoScholasticAssessments([FromBody] List<SaveCoScholasticAssessmentRequest> request)
        {
            if (request == null || request.Count == 0) return BadRequest(new { message = "No assessments provided." });
            try
            {
                var schoolId = GetSchoolId();
                var staffId = Guid.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out Guid sid) ? sid : (Guid?)null;
                int saved = 0;

                foreach (var row in request)
                {
                    var existing = await _context.CoScholasticAssessments.FirstOrDefaultAsync(a =>
                        a.SchoolId == schoolId && a.StudentId == row.StudentId &&
                        a.CoScholasticAreaId == row.CoScholasticAreaId &&
                        a.AcademicYear == row.AcademicYear && a.Term == row.Term);

                    if (existing != null)
                    {
                        existing.Grade = row.Grade; existing.Remarks = row.Remarks;
                        existing.AssessedByStaffId = staffId; existing.UpdatedAt = DateTime.UtcNow;
                    }
                    else
                    {
                        _context.CoScholasticAssessments.Add(new SmsApi.Models.Entities.CoScholasticAssessment
                        {
                            Id = Guid.NewGuid(), SchoolId = schoolId, StudentId = row.StudentId,
                            CoScholasticAreaId = row.CoScholasticAreaId, AcademicYear = row.AcademicYear,
                            Term = row.Term, Grade = row.Grade, Remarks = row.Remarks,
                            ExamId = row.ExamId, AssessedByStaffId = staffId
                        });
                    }
                    saved++;
                }

                await _context.SaveChangesAsync();
                return Ok(new { message = $"{saved} assessments saved." });
            }
            catch (Exception ex) { return StatusCode(500, new { message = "Failed to save assessments.", error = ex.Message }); }
        }
    }
}

// ── Request DTOs for new Exam endpoints ────────────────────────────────────────
public class PromoteExamStructureRequest
{
    [System.ComponentModel.DataAnnotations.Required]
    public string SourceAcademicYear { get; set; } = string.Empty;
    [System.ComponentModel.DataAnnotations.Required]
    public string TargetAcademicYear { get; set; } = string.Empty;
    /// <summary>If true, overwrite existing exams in target year</summary>
    public bool Force { get; set; } = false;
}

public class CreateCoScholasticAreaRequest
{
    [System.ComponentModel.DataAnnotations.Required]
    [System.ComponentModel.DataAnnotations.MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    [System.ComponentModel.DataAnnotations.MaxLength(20)] public string? Code { get; set; }
    [System.ComponentModel.DataAnnotations.MaxLength(500)] public string? Description { get; set; }
    [System.ComponentModel.DataAnnotations.MaxLength(50)] public string? GradeScale { get; set; } = "A-E";
    public int DisplayOrder { get; set; } = 0;
}

public class SaveCoScholasticAssessmentRequest
{
    [System.ComponentModel.DataAnnotations.Required] public Guid StudentId { get; set; }
    [System.ComponentModel.DataAnnotations.Required] public Guid CoScholasticAreaId { get; set; }
    [System.ComponentModel.DataAnnotations.Required] public string AcademicYear { get; set; } = string.Empty;
    public int Term { get; set; } = 0;
    [System.ComponentModel.DataAnnotations.Required]
    [System.ComponentModel.DataAnnotations.MaxLength(5)]
    public string Grade { get; set; } = string.Empty;
    [System.ComponentModel.DataAnnotations.MaxLength(1000)] public string? Remarks { get; set; }
    public Guid? ExamId { get; set; }
}
