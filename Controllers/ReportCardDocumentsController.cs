using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmsApi.Models.Constants;
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
    public class ReportCardDocumentsController : ControllerBase
    {
        private readonly IReportCardDocumentService _svc;
        private readonly ITenantContext _tenant;
        private readonly ILogger<ReportCardDocumentsController> _logger;

        public ReportCardDocumentsController(
            IReportCardDocumentService svc,
            ITenantContext tenant,
            ILogger<ReportCardDocumentsController> logger)
        {
            _svc    = svc;
            _tenant = tenant;
            _logger = logger;
        }

        private Guid StaffId => Guid.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var g) ? g : Guid.Empty;
        private string Username => User.FindFirst(ClaimTypes.Name)?.Value ?? User.Identity?.Name ?? "unknown";

        // ═══════════════════════════════════════════════════════════════════════
        // Template Gallery
        // ═══════════════════════════════════════════════════════════════════════

        /// <summary>
        /// Returns metadata for all 5 professional report card template styles.
        /// Use this to build the template picker UI.
        /// </summary>
        [HttpGet("templates/gallery")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(System.Collections.Generic.List<TemplatePreviewResponse>), 200)]
        public async Task<IActionResult> GetTemplateGallery()
        {
            var gallery = await _svc.GetTemplateGalleryAsync();
            return Ok(gallery);
        }

        // ═══════════════════════════════════════════════════════════════════════
        // Report Cards — List & Get
        // ═══════════════════════════════════════════════════════════════════════

        [HttpGet]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(ReportCardListResponse), 200)]
        public async Task<IActionResult> GetReportCards(
            [FromQuery] int    page         = 1,
            [FromQuery] int    pageSize     = 20,
            [FromQuery] Guid?  classId      = null,
            [FromQuery] Guid?  sectionId    = null,
            [FromQuery] string? academicYear = null,
            [FromQuery] string? term         = null,
            [FromQuery] string? status       = null)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result = await _svc.GetReportCardsAsync(schoolId, page, pageSize, classId, sectionId, academicYear, term, status);
            return Ok(result);
        }

        [HttpGet("{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(ReportCardDocumentDto), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetReportCard(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result = await _svc.GetReportCardAsync(id, schoolId);
            if (result == null) return NotFound(new { message = "Report card not found." });
            return Ok(result);
        }

        [HttpGet("stats")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        [ProducesResponseType(typeof(ReportCardStatsResponse), 200)]
        public async Task<IActionResult> GetStats(
            [FromQuery] string? academicYear = null,
            [FromQuery] string? term = null)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result = await _svc.GetStatsAsync(schoolId, academicYear, term);
            return Ok(result);
        }

        // ═══════════════════════════════════════════════════════════════════════
        // Generate — single student
        // ═══════════════════════════════════════════════════════════════════════

        /// <summary>
        /// Generate a report card for one student. Pulls marks from ExamMarksEntries,
        /// computes board-aware grades, and persists the ReportCard record.
        /// Returns the full DTO including subject-wise breakdown.
        /// </summary>
        [HttpPost("generate")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(ReportCardDocumentDto), 201)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GenerateReportCard([FromBody] GenerateReportCardRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _svc.GenerateReportCardAsync(schoolId, request, StaffId);
                return CreatedAtAction(nameof(GetReportCard), new { id = result.Id }, result);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating report card for student {StudentId}", request.StudentId);
                return StatusCode(500, new { message = "Failed to generate report card." });
            }
        }

        // ═══════════════════════════════════════════════════════════════════════
        // Bulk Generate — entire class/section
        // ═══════════════════════════════════════════════════════════════════════

        /// <summary>
        /// Generate report cards for an entire class or section in one call.
        /// Skips students with no marks data without failing the whole batch.
        /// </summary>
        [HttpPost("generate/bulk")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        [ProducesResponseType(typeof(System.Collections.Generic.List<ReportCardDocumentDto>), 200)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> BulkGenerate([FromBody] BulkGenerateReportCardsRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var results = await _svc.BulkGenerateAsync(schoolId, request, StaffId);
                return Ok(new { count = results.Count, items = results });
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Bulk generate failed");
                return StatusCode(500, new { message = "Bulk generation failed." });
            }
        }

        // ═══════════════════════════════════════════════════════════════════════
        // Edit / Correct a generated report card
        // ═══════════════════════════════════════════════════════════════════════

        /// <summary>
        /// Correct/edit a generated report card.
        /// All corrections are audit-trailed with the editor's identity and reason.
        /// The document is marked as "Corrected" on download.
        /// </summary>
        [HttpPut("{id}/edit")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        [ProducesResponseType(typeof(ReportCardDocumentDto), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> EditReportCard(Guid id, [FromBody] EditReportCardRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.EditRemarks))
                return BadRequest(new { message = "Edit remarks are required to explain the correction." });

            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _svc.EditReportCardAsync(id, schoolId, request, Username);
                return Ok(result);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error editing report card {Id}", id);
                return StatusCode(500, new { message = "Failed to edit report card." });
            }
        }

        // ═══════════════════════════════════════════════════════════════════════
        // Delete
        // ═══════════════════════════════════════════════════════════════════════

        [HttpDelete("{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminOnly)]
        [ProducesResponseType(204)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> DeleteReportCard(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var deleted = await _svc.DeleteReportCardAsync(id, schoolId);
            if (!deleted) return NotFound(new { message = "Report card not found." });
            return NoContent();
        }

        // ═══════════════════════════════════════════════════════════════════════
        // Mark as Distributed
        // ═══════════════════════════════════════════════════════════════════════

        [HttpPost("{id}/distribute")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> MarkDistributed(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var ok = await _svc.MarkDistributedAsync(id, schoolId);
            if (!ok) return NotFound(new { message = "Report card not found." });
            return Ok(new { message = "Report card marked as distributed." });
        }

        // ═══════════════════════════════════════════════════════════════════════
        // Download — single student
        // ═══════════════════════════════════════════════════════════════════════

        /// <summary>
        /// Download a report card in any supported format.
        /// Formats: PDF (default), Excel (.xlsx), HTML, CSV
        /// Templates: CBSE_Classic | CBSE_Modern | ICSE_Standard | StateBoard_Elite | Modern_Premium
        /// </summary>
        [HttpGet("{id}/download")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        public async Task<IActionResult> DownloadReportCard(
            Guid id,
            [FromQuery] string format         = "PDF",
            [FromQuery] string? templateStyle = null)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var (bytes, contentType, fileName) = await _svc.DownloadReportCardAsync(id, schoolId, format, templateStyle);
                return File(bytes, contentType, fileName);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Download failed for report card {Id}", id);
                return StatusCode(500, new { message = "Download failed." });
            }
        }

        // ═══════════════════════════════════════════════════════════════════════
        // Bulk Download — class/section
        // ═══════════════════════════════════════════════════════════════════════

        /// <summary>
        /// Bulk download all report cards for a class/section.
        /// Excel format produces a structured workbook with summary + subject detail sheets.
        /// HTML format produces a print-ready multi-page document (use browser print → PDF).
        /// </summary>
        [HttpGet("download/bulk")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<IActionResult> BulkDownload(
            [FromQuery] string  academicYear,
            [FromQuery] string  term,
            [FromQuery] Guid?   classId   = null,
            [FromQuery] Guid?   sectionId = null,
            [FromQuery] string  format    = "Excel")
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var (bytes, contentType, fileName) = await _svc.BulkDownloadAsync(schoolId, academicYear, term, classId, sectionId, format);
                return File(bytes, contentType, fileName);
            }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Bulk download failed");
                return StatusCode(500, new { message = "Bulk download failed." });
            }
        }

        // ═══════════════════════════════════════════════════════════════════════
        // Certificate — Edit & Download (extended from existing system)
        // ═══════════════════════════════════════════════════════════════════════

        /// <summary>
        /// Edit / correct a certificate's content or title.
        /// Requires an edit reason for the audit trail.
        /// </summary>
        [HttpPut("certificates/{certId}/edit")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        [ProducesResponseType(typeof(CertificateResponse), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> EditCertificate(Guid certId, [FromBody] EditCertificateRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.EditReason))
                return BadRequest(new { message = "Edit reason is required." });

            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _svc.EditCertificateAsync(certId, schoolId, request, Username);
                return Ok(result);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error editing certificate {CertId}", certId);
                return StatusCode(500, new { message = "Failed to edit certificate." });
            }
        }

        /// <summary>
        /// Download a certificate as PDF or HTML with any of the 5 professional templates.
        /// </summary>
        [HttpGet("certificates/{certId}/download")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        public async Task<IActionResult> DownloadCertificate(
            Guid certId,
            [FromQuery] string  format        = "PDF",
            [FromQuery] string? templateStyle = null)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var (bytes, contentType, fileName) = await _svc.DownloadCertificateAsync(certId, schoolId, format, templateStyle);
                return File(bytes, contentType, fileName);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Certificate download failed for {CertId}", certId);
                return StatusCode(500, new { message = "Certificate download failed." });
            }
        }
    }
}
