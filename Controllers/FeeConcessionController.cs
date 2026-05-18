using SmsApi.Models.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SmsApi.Models.DTOs;
using SmsApi.Services;

namespace SmsApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Policy = "SchoolAccess")]
    public class FeeConcessionController : ControllerBase
    {
        private readonly IFeeConcessionService _concessionService;
        private readonly ITenantContext _tenant;
        private readonly ILogger<FeeConcessionController> _logger;

        public FeeConcessionController(IFeeConcessionService concessionService, ITenantContext tenant, ILogger<FeeConcessionController> logger)
        {
            _concessionService = concessionService;
            _tenant = tenant;
            _logger = logger;
        }

        // Concession Types
        /// <summary>Get concession types for the current tenant (no schoolId required in URL)</summary>
        [HttpGet("types")]
        public async Task<ActionResult<IEnumerable<ConcessionTypeResponse>>> GetConcessionTypesByTenant()
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                if (schoolId == Guid.Empty)
                    return Ok(new List<ConcessionTypeResponse>()); // SuperAdmin with no school selected — return empty
                var result = await _concessionService.GetConcessionTypesAsync(schoolId);
                // Return a plain JSON array so the frontend doesn't need to unwrap a wrapper object
                var list = result.ConcessionTypes?.Count > 0 ? result.ConcessionTypes : result.Items;
                return Ok(list ?? new List<ConcessionTypeResponse>());
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpGet("types/{schoolId}")]
        public async Task<ActionResult<ConcessionTypeListResponse>> GetConcessionTypes(Guid schoolId)
        {
            try
            {
                var types = await _concessionService.GetConcessionTypesAsync(schoolId);
                return Ok(types);
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpGet("types/{id}/school/{schoolId}")]
        public async Task<ActionResult<ConcessionTypeResponse>> GetConcessionTypeById(Guid id, Guid schoolId)
        {
            try
            {
                var type = await _concessionService.GetConcessionTypeByIdAsync(id, schoolId);
                return Ok(type);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpPost("types")]
        public async Task<ActionResult<ConcessionTypeResponse>> CreateConcessionType([FromBody] CreateConcessionTypeRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                if (schoolId == Guid.Empty)
                    return BadRequest(new { message = "School context is required. Please select a school before creating concession types." });
                request.SchoolId = schoolId;
                var type = await _concessionService.CreateConcessionTypeAsync(request);
                return CreatedAtAction(nameof(GetConcessionTypeById), new { id = type.Id, schoolId = type.SchoolId }, type);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (DbUpdateException ex)
            {
                var inner = ex.InnerException?.Message ?? ex.Message;
                _logger.LogError(ex, "DB error creating concession type: {Inner}", inner);
                return StatusCode(500, new { message = "Database error saving concession type", error = inner });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error creating concession type");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpPut("types/{id}")]
        [Authorize(Roles = "Admin,Principal,Bursar,Accountant,Teacher,Staff")]
        public async Task<ActionResult<ConcessionTypeResponse>> UpdateConcessionType(Guid id, [FromBody] UpdateConcessionTypeRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var type = await _concessionService.UpdateConcessionTypeAsync(id, request, schoolId);
                return Ok(type);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpDelete("types/{id}")]
        [Authorize(Roles = "Admin,Principal,Bursar,Accountant,Teacher,Staff")]
        public async Task<ActionResult> DeleteConcessionType(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                await _concessionService.DeleteConcessionTypeAsync(id, schoolId);
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
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // Concessions
        [HttpGet("{schoolId}")]
        public async Task<ActionResult<FeeConcessionListResponse>> GetConcessions(
            Guid schoolId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] Guid? studentId = null,
            [FromQuery] string? status = null)
        {
            try
            {
                var concessions = await _concessionService.GetConcessionsAsync(schoolId, page, pageSize, studentId, status);
                return Ok(concessions);
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpGet("{id}/school/{schoolId}")]
        public async Task<ActionResult<FeeConcessionResponse>> GetConcessionById(Guid id, Guid schoolId)
        {
            try
            {
                var concession = await _concessionService.GetConcessionByIdAsync(id, schoolId);
                return Ok(concession);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpPost]
        public async Task<ActionResult<FeeConcessionResponse>> CreateConcession([FromBody] CreateFeeConcessionRequest request)
        {
            try
            {
                var concession = await _concessionService.CreateConcessionAsync(request);
                return CreatedAtAction(nameof(GetConcessionById), new { id = concession.Id, schoolId = concession.SchoolId }, concession);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpPost("{id}/approve")]
        [Authorize(Roles = "Admin,Principal,Bursar,Accountant,Teacher,Staff")]
        public async Task<ActionResult<FeeConcessionResponse>> ApproveConcession(Guid id, [FromBody] ApproveFeeConcessionRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var concession = await _concessionService.ApproveConcessionAsync(id, request, schoolId);
                return Ok(concession);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpPost("{id}/reject")]
        [Authorize(Roles = "Admin,Principal,Bursar,Accountant,Teacher,Staff")]
        public async Task<ActionResult<FeeConcessionResponse>> RejectConcession(Guid id, [FromBody] RejectFeeConcessionRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var concession = await _concessionService.RejectConcessionAsync(id, request, schoolId);
                return Ok(concession);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }
    }
}

