using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmsApi.Models.Constants;
using SmsApi.Services;

namespace SmsApi.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/reports/dise")]
    public class DISEReportController : ControllerBase
    {
        private readonly IDISEReportService _diseService;
        private readonly ITenantContext _tenant;

        public DISEReportController(IDISEReportService diseService, ITenantContext tenant)
        {
            _diseService = diseService;
            _tenant = tenant;
        }

        /// <summary>
        /// DISE/UDISE school-level summary: total enrolment, category-wise breakdowns, etc.
        /// Used for filling the DISE Annual School Report (ASR).
        /// </summary>
        [HttpGet("summary")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<IActionResult> GetSummary([FromQuery] string academicYear)
        {
            if (string.IsNullOrWhiteSpace(academicYear))
                return BadRequest(new { message = "academicYear is required (e.g. '2025-26')." });

            var schoolId = _tenant.GetEffectiveSchoolId();
            var summary = await _diseService.GetSummaryAsync(schoolId, academicYear);
            return Ok(summary);
        }

        /// <summary>
        /// Student-level DISE data (DCF-1 format) — for review in UI before export.
        /// Includes PEN, UDISE student code, category, disability, religion, etc.
        /// </summary>
        [HttpGet("students")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<IActionResult> GetStudentRecords(
            [FromQuery] string academicYear,
            [FromQuery] string? className)
        {
            if (string.IsNullOrWhiteSpace(academicYear))
                return BadRequest(new { message = "academicYear is required." });

            var schoolId = _tenant.GetEffectiveSchoolId();
            var records = await _diseService.GetStudentRecordsAsync(schoolId, academicYear, className);
            return Ok(new { records, count = records.Count });
        }

        /// <summary>
        /// Export student DISE data as CSV (DCF-1 compatible).
        /// Download with filename: DISE_Export_2025-26.csv
        /// </summary>
        [HttpGet("export/csv")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<IActionResult> ExportCsv(
            [FromQuery] string academicYear,
            [FromQuery] string? className)
        {
            if (string.IsNullOrWhiteSpace(academicYear))
                return BadRequest(new { message = "academicYear is required." });

            var schoolId = _tenant.GetEffectiveSchoolId();
            var csvBytes = await _diseService.ExportCsvAsync(schoolId, academicYear, className);

            var fileName = string.IsNullOrWhiteSpace(className)
                ? $"DISE_Export_{academicYear}.csv"
                : $"DISE_Export_{academicYear}_{className}.csv";

            return File(csvBytes, "text/csv", fileName);
        }

        /// <summary>
        /// DISE staff summary: teaching staff counts by gender, training status,
        /// employment type, and designation — used for the DISE ASR Staff section.
        /// </summary>
        [HttpGet("staff")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<IActionResult> GetStaffSummary()
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var summary = await _diseService.GetStaffSummaryAsync(schoolId);
            return Ok(summary);
        }
    }
}
