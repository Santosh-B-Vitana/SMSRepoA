using SmsApi.Models.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmsApi.Models.DTOs;
using SmsApi.Services;
using Microsoft.Extensions.Logging;

namespace SmsApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PFESIManagementController : ControllerBase
    {
        private readonly IPFESIManagementService _pfesiService;
        private readonly ITenantContext _tenant;
        private readonly ILogger<PFESIManagementController> _logger;

        public PFESIManagementController(IPFESIManagementService pfesiService, ITenantContext tenant, ILogger<PFESIManagementController> logger)
        {
            _pfesiService = pfesiService;
            _tenant = tenant;
            _logger = logger;
        }

        private IActionResult HandleException(Exception ex, string operation)
        {
            return ex switch
            {
                ArgumentException argEx => (IActionResult)BadRequest(new { message = argEx.Message, error = "ValidationError" }),
                UnauthorizedAccessException authEx => (IActionResult)Unauthorized(new { message = authEx.Message, error = "Unauthorized" }),
                KeyNotFoundException notFoundEx => (IActionResult)NotFound(new { message = notFoundEx.Message, error = "NotFound" }),
                InvalidOperationException invalidOpEx => (IActionResult)Conflict(new { message = invalidOpEx.Message, error = "ConflictError" }),
                _ => (IActionResult)StatusCode(500, new { message = "An unexpected error occurred", error = ex.Message })
            };
        }

        // Configurations
        [HttpGet("configs/{schoolId}")]
        public async Task<ActionResult<List<PFESIConfigResponse>>> GetConfigs(Guid schoolId, [FromQuery] string? type = null)
        {
            try
            {
                var jwtSchoolId = _tenant.GetEffectiveSchoolId();
                if (schoolId != jwtSchoolId)
                    throw new UnauthorizedAccessException("School mismatch - cross-school access denied");
                
                var configs = await _pfesiService.GetConfigsAsync(schoolId, type);
                return Ok(configs);
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpGet("configs/{id}/school/{schoolId}")]
        public async Task<ActionResult<PFESIConfigResponse>> GetConfigById(Guid id, Guid schoolId)
        {
            try
            {
                var jwtSchoolId = _tenant.GetEffectiveSchoolId();
                if (schoolId != jwtSchoolId)
                    throw new UnauthorizedAccessException("School mismatch - cross-school access denied");
                
                var config = await _pfesiService.GetConfigByIdAsync(id, schoolId);
                return Ok(config);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpPost("configs")]
        public async Task<ActionResult<PFESIConfigResponse>> CreateConfig([FromBody] CreatePFESIConfigRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                request.SchoolId = schoolId;
                
                var config = await _pfesiService.CreateConfigAsync(request);
                return CreatedAtAction(nameof(GetConfigById), new { id = config.Id, schoolId = config.SchoolId }, config);
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpPut("configs/{id}")]
        [Authorize(Roles = "Admin,Principal,HumanResources")]
        public async Task<ActionResult<PFESIConfigResponse>> UpdateConfig(Guid id, [FromBody] UpdatePFESIConfigRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var config = await _pfesiService.UpdateConfigAsync(id, request, schoolId);
                return Ok(config);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpDelete("configs/{id}")]
        [Authorize(Roles = "Admin,Principal,HumanResources")]
        public async Task<ActionResult> DeleteConfig(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                await _pfesiService.DeleteConfigAsync(id, schoolId);
                return NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // Contributions
        [HttpPost("contributions/calculate")]
        public async Task<ActionResult<List<PFESIContributionResponse>>> CalculateContributions([FromBody] CalculateContributionsRequest request)
        {
            try
            {
                var contributions = await _pfesiService.CalculateContributionsAsync(request);
                return Ok(contributions);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpGet("contributions/{schoolId}")]
        public async Task<ActionResult<PFESIContributionListResponse>> GetContributions(
            Guid schoolId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? month = null,
            [FromQuery] string? type = null)
        {
            try
            {
                var jwtSchoolId = _tenant.GetEffectiveSchoolId();
                if (schoolId != jwtSchoolId)
                    throw new UnauthorizedAccessException("School mismatch - cross-school access denied");
                
                var contributions = await _pfesiService.GetContributionsAsync(schoolId, page, pageSize, month, type);
                return Ok(contributions);
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpGet("contributions/{id}/school/{schoolId}")]
        public async Task<ActionResult<PFESIContributionResponse>> GetContributionById(Guid id, Guid schoolId)
        {
            try
            {
                var jwtSchoolId = _tenant.GetEffectiveSchoolId();
                if (schoolId != jwtSchoolId)
                    throw new UnauthorizedAccessException("School mismatch - cross-school access denied");
                
                var contribution = await _pfesiService.GetContributionByIdAsync(id, schoolId);
                return Ok(contribution);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpPost("contributions/{id}/mark-deposited")]
        public async Task<ActionResult<PFESIContributionResponse>> MarkAsDeposited([FromBody] MarkDepositRequest request)
        {
            try
            {
                var contribution = await _pfesiService.MarkAsDepositedAsync(request);
                return Ok(contribution);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // Compliance Reports
        [HttpPost("reports/generate")]
        public async Task<ActionResult<ComplianceReportResponse>> GenerateComplianceReport([FromBody] GenerateComplianceReportRequest request)
        {
            try
            {
                var report = await _pfesiService.GenerateComplianceReportAsync(request);
                return CreatedAtAction(nameof(GetComplianceReportById), new { id = report.Id, schoolId = report.SchoolId }, report);
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpGet("reports/{schoolId}")]
        public async Task<ActionResult<ComplianceReportListResponse>> GetComplianceReports(
            Guid schoolId,
            [FromQuery] string? period = null,
            [FromQuery] string? reportType = null)
        {
            try
            {
                var reports = await _pfesiService.GetComplianceReportsAsync(schoolId, period, reportType);
                return Ok(reports);
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpGet("reports/{id}/school/{schoolId}")]
        public async Task<ActionResult<ComplianceReportResponse>> GetComplianceReportById(Guid id, Guid schoolId)
        {
            try
            {
                var report = await _pfesiService.GetComplianceReportByIdAsync(id, schoolId);
                return Ok(report);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpPost("reports/{id}/submit")]
        [Authorize(Roles = "Admin,Principal,HumanResources")]
        public async Task<ActionResult<ComplianceReportResponse>> SubmitComplianceReport(Guid id, [FromBody] SubmitComplianceReportRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var report = await _pfesiService.SubmitComplianceReportAsync(id, request, schoolId);
                return Ok(report);
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
    }
}
