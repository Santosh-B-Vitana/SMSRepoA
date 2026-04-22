using SmsApi.Models.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmsApi.Models.DTOs;
using SmsApi.Services;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;

namespace SmsApi.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class ReportsController : ControllerBase
    {
        private readonly IReportService _reportService;

        public ReportsController(IReportService reportService)
        {
            _reportService = reportService;
        }

        private Guid GetSchoolId()
        {
            var schoolIdClaim = User.FindFirst("SchoolId")?.Value;
            return Guid.TryParse(schoolIdClaim, out var schoolId) ? schoolId : Guid.Empty;
        }

        private Guid GetUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty;
        }

        [HttpGet]
        public async Task<ActionResult<ReportListResponse>> GetReports(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? reportType = null,
            [FromQuery] string? status = null)
        {
            var schoolId = GetSchoolId();
            if (schoolId == Guid.Empty)
                return Unauthorized();

            var response = await _reportService.GetReportsAsync(schoolId, page, pageSize, reportType, status);
            return Ok(response);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ReportResponse>> GetReport(Guid id)
        {
            var schoolId = GetSchoolId();
            if (schoolId == Guid.Empty)
                return Unauthorized();

            var report = await _reportService.GetReportByIdAsync(id, schoolId);
            if (report == null)
                return NotFound();

            return Ok(report);
        }

        [HttpPost]
        public async Task<ActionResult<ReportResponse>> CreateReport([FromBody] CreateReportRequest request)
        {
            var schoolId = GetSchoolId();
            if (schoolId == Guid.Empty)
                return Unauthorized();

            request.SchoolId = schoolId;
            if (request.GeneratedByStaffId == Guid.Empty)
                request.GeneratedByStaffId = GetUserId();

            var report = await _reportService.CreateReportAsync(request);
            return CreatedAtAction(nameof(GetReport), new { id = report.Id }, report);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteReport(Guid id)
        {
            var schoolId = GetSchoolId();
            if (schoolId == Guid.Empty)
                return Unauthorized();

            var result = await _reportService.DeleteReportAsync(id, schoolId);
            if (!result)
                return NotFound();

            return NoContent();
        }

        // Report Templates
        [HttpGet("templates")]
        public async Task<ActionResult<ReportTemplateListResponse>> GetTemplates(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? reportType = null)
        {
            var schoolId = GetSchoolId();
            if (schoolId == Guid.Empty)
                return Unauthorized();

            var response = await _reportService.GetReportTemplatesAsync(schoolId, page, pageSize, reportType);
            return Ok(response);
        }

        [HttpGet("templates/{id}")]
        public async Task<ActionResult<ReportTemplateResponse>> GetTemplate(Guid id)
        {
            var schoolId = GetSchoolId();
            if (schoolId == Guid.Empty)
                return Unauthorized();

            var template = await _reportService.GetReportTemplateByIdAsync(id, schoolId);
            if (template == null)
                return NotFound();

            return Ok(template);
        }

        [HttpPost("templates")]
        public async Task<ActionResult<ReportTemplateResponse>> CreateTemplate([FromBody] CreateReportTemplateRequest request)
        {
            var schoolId = GetSchoolId();
            if (schoolId == Guid.Empty)
                return Unauthorized();

            request.SchoolId = schoolId;
            if (request.CreatedByStaffId == Guid.Empty)
                request.CreatedByStaffId = GetUserId();

            var template = await _reportService.CreateReportTemplateAsync(request);
            return CreatedAtAction(nameof(GetTemplate), new { id = template.Id }, template);
        }

        [HttpPut("templates/{id}")]
        public async Task<ActionResult<ReportTemplateResponse>> UpdateTemplate(Guid id, [FromBody] UpdateReportTemplateRequest request)
        {
            var schoolId = GetSchoolId();
            if (schoolId == Guid.Empty)
                return Unauthorized();

            try
            {
                var template = await _reportService.UpdateReportTemplateAsync(id, request, schoolId);
                return Ok(template);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        [HttpDelete("templates/{id}")]
        public async Task<IActionResult> DeleteTemplate(Guid id)
        {
            var schoolId = GetSchoolId();
            if (schoolId == Guid.Empty)
                return Unauthorized();

            var result = await _reportService.DeleteReportTemplateAsync(id, schoolId);
            if (!result)
                return NotFound();

            return NoContent();
        }

        [HttpPost("templates/{templateId}/generate")]
        public async Task<ActionResult<ReportResponse>> GenerateFromTemplate(Guid templateId, [FromBody] Dictionary<string, string> parameters)
        {
            var schoolId = GetSchoolId();
            if (schoolId == Guid.Empty)
                return Unauthorized();

            var staffId = GetUserId();
            try
            {
                var report = await _reportService.GenerateReportFromTemplateAsync(templateId, parameters, schoolId, staffId);
                return CreatedAtAction(nameof(GetReport), new { id = report.Id }, report);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }
    }
}
