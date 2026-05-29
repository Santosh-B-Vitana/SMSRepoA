using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmsApi.Models.DTOs;
using SmsApi.Services;
using System;
using System.Threading.Tasks;

namespace SmsApi.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/online-exam")]
    public class OnlineExamController : ControllerBase
    {
        private readonly IOnlineExamService _examService;
        private readonly ITenantContext _tenant;

        public OnlineExamController(IOnlineExamService examService, ITenantContext tenant)
        {
            _examService = examService;
            _tenant = tenant;
        }

        // ── Question Bank ─────────────────────────────────────────────────────────

        [HttpGet("questions")]
        public async Task<IActionResult> GetQuestions(
            [FromQuery] Guid? subjectId, [FromQuery] string? questionType, [FromQuery] string? difficulty)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            return Ok(await _examService.GetQuestionsAsync(schoolId, subjectId, questionType, difficulty));
        }

        [HttpGet("questions/{id:guid}")]
        public async Task<IActionResult> GetQuestion(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result = await _examService.GetQuestionByIdAsync(id, schoolId);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpPost("questions")]
        [Authorize(Roles = "Admin,Principal,Teacher")]
        public async Task<IActionResult> CreateQuestion([FromBody] CreateQuestionRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _examService.CreateQuestionAsync(schoolId, request);
                return CreatedAtAction(nameof(GetQuestion), new { id = result.Id }, result);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpPut("questions/{id:guid}")]
        [Authorize(Roles = "Admin,Principal,Teacher")]
        public async Task<IActionResult> UpdateQuestion(Guid id, [FromBody] CreateQuestionRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result = await _examService.UpdateQuestionAsync(id, schoolId, request);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpDelete("questions/{id:guid}")]
        [Authorize(Roles = "Admin,Principal,Teacher")]
        public async Task<IActionResult> DeleteQuestion(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            return await _examService.DeleteQuestionAsync(id, schoolId) ? NoContent() : NotFound();
        }

        // ── Exams ─────────────────────────────────────────────────────────────────

        [HttpGet]
        public async Task<IActionResult> GetExams([FromQuery] string? status)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            return Ok(await _examService.GetExamsAsync(schoolId, status));
        }

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetExam(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result = await _examService.GetExamByIdAsync(id, schoolId);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Principal,Teacher")]
        public async Task<IActionResult> CreateExam([FromBody] CreateOnlineExamRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _examService.CreateExamAsync(schoolId, request);
                return CreatedAtAction(nameof(GetExam), new { id = result.Id }, result);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpPut("{id:guid}/status")]
        [Authorize(Roles = "Admin,Principal,Teacher")]
        public async Task<IActionResult> UpdateExamStatus(Guid id, [FromQuery] string status)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result = await _examService.UpdateExamStatusAsync(id, schoolId, status);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpDelete("{id:guid}")]
        [Authorize(Roles = "Admin,Principal,Teacher")]
        public async Task<IActionResult> DeleteExam(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            return await _examService.DeleteExamAsync(id, schoolId) ? NoContent() : NotFound();
        }

        // ── Sessions ──────────────────────────────────────────────────────────────

        [HttpPost("{examId:guid}/start")]
        public async Task<IActionResult> StartExam(Guid examId)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var studentId = _tenant.UserId;
                var result = await _examService.StartSessionAsync(schoolId, studentId, examId);
                return StatusCode(201, result);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpPost("sessions/{sessionId:guid}/submit")]
        public async Task<IActionResult> SubmitExam(Guid sessionId, [FromBody] SubmitExamRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var studentId = _tenant.UserId;
                var result = await _examService.SubmitExamAsync(sessionId, schoolId, studentId, request);
                return result == null ? NotFound() : Ok(result);
            }
            catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpGet("sessions/{sessionId:guid}")]
        public async Task<IActionResult> GetSession(Guid sessionId)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result = await _examService.GetSessionAsync(sessionId, schoolId);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpGet("{examId:guid}/sessions")]
        [Authorize(Roles = "Admin,Principal,Teacher")]
        public async Task<IActionResult> GetSessionsByExam(Guid examId)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            return Ok(await _examService.GetSessionsByExamAsync(examId, schoolId));
        }

        [HttpPost("grade")]
        [Authorize(Roles = "Admin,Principal,Teacher")]
        public async Task<IActionResult> GradeResponse([FromBody] GradeResponseRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var schoolId = _tenant.GetEffectiveSchoolId();
            var gradedBy = _tenant.UserId;
            var result = await _examService.GradeResponseAsync(schoolId, gradedBy, request);
            return result ? Ok(new { message = "Graded successfully." }) : NotFound();
        }

        [HttpGet("{examId:guid}/stats")]
        [Authorize(Roles = "Admin,Principal,Teacher")]
        public async Task<IActionResult> GetExamStats(Guid examId)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            return Ok(await _examService.GetExamStatsAsync(examId, schoolId));
        }
    }
}
