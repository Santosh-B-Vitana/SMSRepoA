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
    [Route("api/staff-tax")]
    public class StaffTaxController : ControllerBase
    {
        private readonly IStaffTaxService _taxService;
        private readonly ITenantContext _tenant;

        public StaffTaxController(IStaffTaxService taxService, ITenantContext tenant)
        {
            _taxService = taxService;
            _tenant = tenant;
        }

        [HttpGet]
        [Authorize(Roles = "Admin,Principal,HR")]
        public async Task<IActionResult> GetDeclarations([FromQuery] string? financialYear)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            return Ok(await _taxService.GetDeclarationsAsync(schoolId, financialYear));
        }

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetDeclaration(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result = await _taxService.GetDeclarationByIdAsync(id, schoolId);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpGet("staff/{staffId:guid}")]
        public async Task<IActionResult> GetDeclarationByStaff(Guid staffId, [FromQuery] string financialYear)
        {
            if (string.IsNullOrWhiteSpace(financialYear)) return BadRequest(new { message = "financialYear is required." });
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result = await _taxService.GetDeclarationByStaffAsync(staffId, schoolId, financialYear);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpPost]
        public async Task<IActionResult> CreateOrUpdate([FromBody] CreateStaffTaxDeclarationRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _taxService.CreateOrUpdateDeclarationAsync(schoolId, request);
                return StatusCode(201, result);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpPut("{id:guid}/status")]
        [Authorize(Roles = "Admin,Principal,HR")]
        public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateTaxStatusRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var schoolId = _tenant.GetEffectiveSchoolId();
            var approvedBy = _tenant.UserId;
            var result = await _taxService.UpdateStatusAsync(id, schoolId, approvedBy, request.Status);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpDelete("{id:guid}")]
        [Authorize(Roles = "Admin,Principal")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            return await _taxService.DeleteDeclarationAsync(id, schoolId) ? NoContent() : NotFound();
        }
    }
}
