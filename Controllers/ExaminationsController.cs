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

        public ExaminationsController(
            IExaminationService service,
            IAcademicYearContextService yearContextService,
            ILogger<ExaminationsController> logger)
        {
            _service = service;
            _yearContextService = yearContextService;
            _logger = logger;
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
    }
}
