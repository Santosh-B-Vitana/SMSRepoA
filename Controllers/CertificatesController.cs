using SmsApi.Models.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using SmsApi.Models.DTOs;
using SmsApi.Services;
using System;
using System.Threading.Tasks;

namespace SmsApi.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class CertificatesController : ControllerBase
    {
        private readonly ICertificateService _svc;
        private readonly ITenantContext _tenant;
        private readonly ILogger<CertificatesController> _logger;

        public CertificatesController(
            ICertificateService svc,
            ITenantContext tenant,
            ILogger<CertificatesController> logger)
        {
            _svc    = svc;
            _tenant = tenant;
            _logger = logger;
        }

        // ═══════════════════════════════════════════════════
        // Certificate Templates
        // ═══════════════════════════════════════════════════

        [HttpGet("templates")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(CertificateTemplateListResponse), 200)]
        public async Task<ActionResult<CertificateTemplateListResponse>> GetTemplates(
            [FromQuery] int     page            = 1,
            [FromQuery] int     pageSize        = 10,
            [FromQuery] string? certificateType = null,
            [FromQuery] bool?   isActive        = null)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result   = await _svc.GetCertificateTemplatesAsync(schoolId, page, pageSize, certificateType, isActive);
            return Ok(result);
        }

        [HttpGet("templates/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(CertificateTemplateResponse), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<CertificateTemplateResponse>> GetTemplateById(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result   = await _svc.GetCertificateTemplateByIdAsync(id, schoolId);
            if (result is null)
                return NotFound(new { message = $"Certificate template {id} not found." });
            return Ok(result);
        }

        [HttpPost("templates")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        [ProducesResponseType(typeof(CertificateTemplateResponse), 201)]
        [ProducesResponseType(400)]
        [ProducesResponseType(409)]
        public async Task<ActionResult<CertificateTemplateResponse>> CreateTemplate(
            [FromBody] CreateCertificateTemplateRequest request)
        {
            try
            {
                var schoolId     = _tenant.GetEffectiveSchoolId();
                request.SchoolId = schoolId;
                var result       = await _svc.CreateCertificateTemplateAsync(request);
                return CreatedAtAction(nameof(GetTemplateById), new { id = result.Id }, result);
            }
            catch (UnauthorizedAccessException ex)  { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex)            { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex)    { return Conflict(new { message = ex.Message }); }
            catch (KeyNotFoundException ex)         { return NotFound(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error creating certificate template");
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        [HttpPut("templates/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        [ProducesResponseType(typeof(CertificateTemplateResponse), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<CertificateTemplateResponse>> UpdateTemplate(
            Guid id, [FromBody] UpdateCertificateTemplateRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result   = await _svc.UpdateCertificateTemplateAsync(id, request, schoolId);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)  { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex)            { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex)    { return Conflict(new { message = ex.Message }); }
            catch (KeyNotFoundException ex)         { return NotFound(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error updating certificate template {Id}", id);
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        [HttpDelete("templates/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminOnly)]
        [ProducesResponseType(204)]
        [ProducesResponseType(404)]
        [ProducesResponseType(409)]
        public async Task<ActionResult> DeleteTemplate(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var deleted  = await _svc.DeleteCertificateTemplateAsync(id, schoolId);
                if (!deleted)
                    return NotFound(new { message = $"Certificate template {id} not found." });
                return NoContent();
            }
            catch (UnauthorizedAccessException ex)  { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex)            { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex)    { return Conflict(new { message = ex.Message }); }
            catch (KeyNotFoundException ex)         { return NotFound(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error deleting certificate template {Id}", id);
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        // ═══════════════════════════════════════════════════
        // Certificates
        // ═══════════════════════════════════════════════════

        [HttpGet]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(CertificateListResponse), 200)]
        public async Task<ActionResult<CertificateListResponse>> GetCertificates(
            [FromQuery] int     page            = 1,
            [FromQuery] int     pageSize        = 10,
            [FromQuery] string? certificateType = null,
            [FromQuery] string? status          = null,
            [FromQuery] Guid?   studentId       = null)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result   = await _svc.GetCertificatesAsync(schoolId, page, pageSize, certificateType, status, studentId);
            return Ok(result);
        }

        [HttpGet("{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(CertificateResponse), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<CertificateResponse>> GetCertificateById(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result   = await _svc.GetCertificateByIdAsync(id, schoolId);
            if (result is null)
                return NotFound(new { message = $"Certificate {id} not found." });
            return Ok(result);
        }

        [HttpGet("student/{studentId}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(CertificateListResponse), 200)]
        public async Task<ActionResult<CertificateListResponse>> GetStudentCertificates(
            Guid studentId,
            [FromQuery] int page     = 1,
            [FromQuery] int pageSize = 50)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result   = await _svc.GetStudentCertificatesAsync(studentId, schoolId, page, pageSize);
            return Ok(result);
        }

        [HttpGet("stats")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        [ProducesResponseType(typeof(CertificateStatsResponse), 200)]
        public async Task<ActionResult<CertificateStatsResponse>> GetStats()
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result   = await _svc.GetCertificateStatsAsync(schoolId);
            return Ok(result);
        }

        [HttpPost]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(CertificateResponse), 201)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        [ProducesResponseType(409)]
        public async Task<ActionResult<CertificateResponse>> CreateCertificate(
            [FromBody] CreateCertificateRequest request)
        {
            try
            {
                var schoolId     = _tenant.GetEffectiveSchoolId();
                request.SchoolId = schoolId;
                var result       = await _svc.CreateCertificateAsync(request);
                return CreatedAtAction(nameof(GetCertificateById), new { id = result.Id }, result);
            }
            catch (UnauthorizedAccessException ex)  { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex)            { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex)    { return Conflict(new { message = ex.Message }); }
            catch (KeyNotFoundException ex)         { return NotFound(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error creating certificate");
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(CertificateResponse), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<CertificateResponse>> UpdateCertificate(
            Guid id, [FromBody] UpdateCertificateRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result   = await _svc.UpdateCertificateAsync(id, request, schoolId);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)  { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex)            { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex)    { return Conflict(new { message = ex.Message }); }
            catch (KeyNotFoundException ex)         { return NotFound(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error updating certificate {Id}", id);
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        [ProducesResponseType(204)]
        [ProducesResponseType(404)]
        public async Task<ActionResult> DeleteCertificate(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var deleted  = await _svc.DeleteCertificateAsync(id, schoolId);
                if (!deleted)
                    return NotFound(new { message = $"Certificate {id} not found." });
                return NoContent();
            }
            catch (UnauthorizedAccessException ex)  { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex)            { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex)    { return Conflict(new { message = ex.Message }); }
            catch (KeyNotFoundException ex)         { return NotFound(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error deleting certificate {Id}", id);
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        [HttpPost("{id}/generate")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(CertificateResponse), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<CertificateResponse>> GenerateCertificate(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result   = await _svc.GenerateCertificateAsync(id, schoolId);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)  { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex)            { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex)    { return Conflict(new { message = ex.Message }); }
            catch (KeyNotFoundException ex)         { return NotFound(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error generating certificate {Id}", id);
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        [HttpPost("{id}/print")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(CertificateResponse), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<CertificateResponse>> MarkAsPrinted(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result   = await _svc.MarkCertificateAsPrintedAsync(id, schoolId);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)  { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex)            { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex)    { return Conflict(new { message = ex.Message }); }
            catch (KeyNotFoundException ex)         { return NotFound(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error marking certificate {Id} as printed", id);
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        [HttpPost("{id}/revoke")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        [ProducesResponseType(typeof(CertificateResponse), 200)]
        [ProducesResponseType(404)]
        [ProducesResponseType(409)]
        public async Task<ActionResult<CertificateResponse>> RevokeCertificate(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result   = await _svc.RevokeCertificateAsync(id, schoolId);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)  { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex)            { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex)    { return Conflict(new { message = ex.Message }); }
            catch (KeyNotFoundException ex)         { return NotFound(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error revoking certificate {Id}", id);
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        // ═══════════════════════════════════════════════════
        // ID Card Templates
        // ═══════════════════════════════════════════════════

        [HttpGet("idcard-templates")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(IDCardTemplateListResponse), 200)]
        public async Task<ActionResult<IDCardTemplateListResponse>> GetIDCardTemplates(
            [FromQuery] int     page     = 1,
            [FromQuery] int     pageSize = 10,
            [FromQuery] string? cardType = null,
            [FromQuery] bool?   isActive = null)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result   = await _svc.GetIDCardTemplatesAsync(schoolId, page, pageSize, cardType, isActive);
            return Ok(result);
        }

        [HttpGet("idcard-templates/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(IDCardTemplateResponse), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<IDCardTemplateResponse>> GetIDCardTemplateById(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result   = await _svc.GetIDCardTemplateByIdAsync(id, schoolId);
            if (result is null)
                return NotFound(new { message = $"ID Card template {id} not found." });
            return Ok(result);
        }

        [HttpPost("idcard-templates")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        [ProducesResponseType(typeof(IDCardTemplateResponse), 201)]
        [ProducesResponseType(400)]
        [ProducesResponseType(409)]
        public async Task<ActionResult<IDCardTemplateResponse>> CreateIDCardTemplate(
            [FromBody] CreateIDCardTemplateRequest request)
        {
            try
            {
                var schoolId     = _tenant.GetEffectiveSchoolId();
                request.SchoolId = schoolId;
                var result       = await _svc.CreateIDCardTemplateAsync(request);
                return CreatedAtAction(nameof(GetIDCardTemplateById), new { id = result.Id }, result);
            }
            catch (UnauthorizedAccessException ex)  { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex)            { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex)    { return Conflict(new { message = ex.Message }); }
            catch (KeyNotFoundException ex)         { return NotFound(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error creating ID card template");
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        [HttpPut("idcard-templates/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        [ProducesResponseType(typeof(IDCardTemplateResponse), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<IDCardTemplateResponse>> UpdateIDCardTemplate(
            Guid id, [FromBody] UpdateIDCardTemplateRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result   = await _svc.UpdateIDCardTemplateAsync(id, request, schoolId);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)  { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex)            { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex)    { return Conflict(new { message = ex.Message }); }
            catch (KeyNotFoundException ex)         { return NotFound(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error updating ID card template {Id}", id);
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        [HttpDelete("idcard-templates/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminOnly)]
        [ProducesResponseType(204)]
        [ProducesResponseType(404)]
        [ProducesResponseType(409)]
        public async Task<ActionResult> DeleteIDCardTemplate(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var deleted  = await _svc.DeleteIDCardTemplateAsync(id, schoolId);
                if (!deleted)
                    return NotFound(new { message = $"ID Card template {id} not found." });
                return NoContent();
            }
            catch (UnauthorizedAccessException ex)  { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex)            { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex)    { return Conflict(new { message = ex.Message }); }
            catch (KeyNotFoundException ex)         { return NotFound(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error deleting ID card template {Id}", id);
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        // ═══════════════════════════════════════════════════
        // ID Cards
        // ═══════════════════════════════════════════════════

        [HttpGet("idcards")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(IDCardListResponse), 200)]
        public async Task<ActionResult<IDCardListResponse>> GetIDCards(
            [FromQuery] int     page     = 1,
            [FromQuery] int     pageSize = 10,
            [FromQuery] string? cardType = null,
            [FromQuery] string? status   = null)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result   = await _svc.GetIDCardsAsync(schoolId, page, pageSize, cardType, status);
            return Ok(result);
        }

        [HttpGet("idcards/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(IDCardResponse), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<IDCardResponse>> GetIDCardById(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result   = await _svc.GetIDCardByIdAsync(id, schoolId);
            if (result is null)
                return NotFound(new { message = $"ID Card {id} not found." });
            return Ok(result);
        }

        [HttpGet("idcards/holder/{holderId}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(IDCardListResponse), 200)]
        public async Task<ActionResult<IDCardListResponse>> GetHolderIDCards(
            Guid holderId, [FromQuery] string holderType = "Student")
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result   = await _svc.GetHolderIDCardsAsync(holderId, holderType, schoolId);
                return Ok(result);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error getting holder ID cards for {HolderId}", holderId);
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        [HttpPost("idcards")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(IDCardResponse), 201)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        [ProducesResponseType(409)]
        public async Task<ActionResult<IDCardResponse>> CreateIDCard(
            [FromBody] CreateIDCardRequest request)
        {
            try
            {
                var schoolId     = _tenant.GetEffectiveSchoolId();
                request.SchoolId = schoolId;
                var result       = await _svc.CreateIDCardAsync(request);
                return CreatedAtAction(nameof(GetIDCardById), new { id = result.Id }, result);
            }
            catch (UnauthorizedAccessException ex)  { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex)            { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex)    { return Conflict(new { message = ex.Message }); }
            catch (KeyNotFoundException ex)         { return NotFound(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error creating ID card");
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        [HttpPut("idcards/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(IDCardResponse), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<IDCardResponse>> UpdateIDCard(
            Guid id, [FromBody] UpdateIDCardRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result   = await _svc.UpdateIDCardAsync(id, request, schoolId);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)  { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex)            { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex)    { return Conflict(new { message = ex.Message }); }
            catch (KeyNotFoundException ex)         { return NotFound(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error updating ID card {Id}", id);
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        [HttpDelete("idcards/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        [ProducesResponseType(204)]
        [ProducesResponseType(404)]
        public async Task<ActionResult> DeleteIDCard(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var deleted  = await _svc.DeleteIDCardAsync(id, schoolId);
                if (!deleted)
                    return NotFound(new { message = $"ID Card {id} not found." });
                return NoContent();
            }
            catch (UnauthorizedAccessException ex)  { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex)            { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex)    { return Conflict(new { message = ex.Message }); }
            catch (KeyNotFoundException ex)         { return NotFound(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error deleting ID card {Id}", id);
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        [HttpPost("idcards/{id}/generate")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(IDCardResponse), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<IDCardResponse>> GenerateIDCard(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result   = await _svc.GenerateIDCardAsync(id, schoolId);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)  { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex)            { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex)    { return Conflict(new { message = ex.Message }); }
            catch (KeyNotFoundException ex)         { return NotFound(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error generating ID card {Id}", id);
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        [HttpPost("idcards/{id}/print")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(IDCardResponse), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<IDCardResponse>> MarkIDCardAsPrinted(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result   = await _svc.MarkIDCardAsPrintedAsync(id, schoolId);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)  { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex)            { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex)    { return Conflict(new { message = ex.Message }); }
            catch (KeyNotFoundException ex)         { return NotFound(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error marking ID card {Id} as printed", id);
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }
    }
}
