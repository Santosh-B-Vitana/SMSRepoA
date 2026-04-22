using SmsApi.Models.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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

        public FeeConcessionController(IFeeConcessionService concessionService, ITenantContext tenant)
        {
            _concessionService = concessionService;
            _tenant = tenant;
        }

        // Concession Types
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
                var type = await _concessionService.CreateConcessionTypeAsync(request);
                return CreatedAtAction(nameof(GetConcessionTypeById), new { id = type.Id, schoolId = type.SchoolId }, type);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpPut("types/{id}")]
        [Authorize(Roles = "Admin,Principal,Bursar")]
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
        [Authorize(Roles = "Admin,Principal,Bursar")]
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
        [Authorize(Roles = "Admin,Principal,Bursar")]
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
        [Authorize(Roles = "Admin,Principal,Bursar")]
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
