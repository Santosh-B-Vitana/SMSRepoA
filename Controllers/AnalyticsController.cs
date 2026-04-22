using SmsApi.Models.Constants;
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
    [Route("api/[controller]")]
    public class AnalyticsController : ControllerBase
    {
        private readonly IAnalyticsService _svc;
        private readonly ITenantContext _tenant;
        private readonly ILogger<AnalyticsController> _logger;

        public AnalyticsController(
            IAnalyticsService svc,
            ITenantContext tenant,
            ILogger<AnalyticsController> logger)
        {
            _svc    = svc;
            _tenant = tenant;
            _logger = logger;
        }

        // GET /api/analytics/overview
        [HttpGet("overview")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(SchoolOverviewStatsResponse), 200)]
        public async Task<ActionResult<SchoolOverviewStatsResponse>> GetOverviewStats()
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result   = await _svc.GetOverviewStatsAsync(schoolId);
            return Ok(result);
        }

        // GET /api/analytics/dashboard/summary?force=true
        [HttpGet("dashboard/summary")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(DashboardSummaryResponse), 200)]
        public async Task<ActionResult<DashboardSummaryResponse>> GetDashboardSummary([FromQuery] bool force = false)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result   = await _svc.GetDashboardSummaryAsync(schoolId, force);
            return Ok(result);
        }

        // GET /api/analytics/attendance
        [HttpGet("attendance")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(AttendanceAnalyticsResponse), 200)]
        public async Task<ActionResult<AttendanceAnalyticsResponse>> GetAttendanceAnalytics(
            [FromQuery] int days = 30)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result   = await _svc.GetAttendanceAnalyticsAsync(schoolId, days);
            return Ok(result);
        }

        // GET /api/analytics/enrollment
        [HttpGet("enrollment")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(EnrollmentAnalyticsResponse), 200)]
        public async Task<ActionResult<EnrollmentAnalyticsResponse>> GetEnrollmentAnalytics()
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result   = await _svc.GetEnrollmentAnalyticsAsync(schoolId);
            return Ok(result);
        }

        // GET /api/analytics/performance
        [HttpGet("performance")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(PerformanceAnalyticsResponse), 200)]
        public async Task<ActionResult<PerformanceAnalyticsResponse>> GetPerformanceAnalytics(
            [FromQuery] string? academicYear = null)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result   = await _svc.GetPerformanceAnalyticsAsync(schoolId, academicYear);
            return Ok(result);
        }

        // GET /api/analytics/fees
        [HttpGet("fees")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        [ProducesResponseType(typeof(FeeAnalyticsResponse), 200)]
        public async Task<ActionResult<FeeAnalyticsResponse>> GetFeeAnalytics(
            [FromQuery] int months = 6)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result   = await _svc.GetFeeAnalyticsAsync(schoolId, months);
            return Ok(result);
        }

        // GET /api/analytics/charts/{metricType}
        [HttpGet("charts/{metricType}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(ChartDataResponse), 200)]
        public async Task<ActionResult<ChartDataResponse>> GetChartData(
            string metricType,
            [FromQuery] string period     = "Daily",
            [FromQuery] int    dataPoints = 7)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result   = await _svc.GetChartDataAsync(schoolId, metricType, period, dataPoints);
            return Ok(result);
        }

        // GET /api/analytics/metrics/period
        [HttpGet("metrics/period")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(200)]
        public async Task<ActionResult> GetMetricsByPeriod(
            [FromQuery] string   metricType,
            [FromQuery] DateTime startDate,
            [FromQuery] DateTime endDate)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result   = await _svc.GetMetricsByPeriodAsync(schoolId, metricType, startDate, endDate);
            return Ok(result);
        }

        // GET /api/analytics/widgets
        [HttpGet("widgets")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(DashboardWidgetListResponse), 200)]
        public async Task<ActionResult<DashboardWidgetListResponse>> GetWidgets(
            [FromQuery] string? visibility = null)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result   = await _svc.GetDashboardWidgetsAsync(schoolId, visibility);
            return Ok(result);
        }

        // GET /api/analytics/widgets/{id}
        [HttpGet("widgets/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(DashboardWidgetResponse), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<DashboardWidgetResponse>> GetWidgetById(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result   = await _svc.GetDashboardWidgetByIdAsync(id, schoolId);
            if (result is null)
                return NotFound(new { message = $"Widget {id} not found." });
            return Ok(result);
        }

        // POST /api/analytics/widgets
        [HttpPost("widgets")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        [ProducesResponseType(typeof(DashboardWidgetResponse), 201)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        public async Task<ActionResult<DashboardWidgetResponse>> CreateWidget(
            [FromBody] CreateDashboardWidgetRequest request)
        {
            try
            {
                var schoolId     = _tenant.GetEffectiveSchoolId();
                request.SchoolId = schoolId;
                var result       = await _svc.CreateDashboardWidgetAsync(request);
                return CreatedAtAction(nameof(GetWidgetById), new { id = result.Id }, result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
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
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error creating widget");
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        // PUT /api/analytics/widgets/{id}
        [HttpPut("widgets/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        [ProducesResponseType(typeof(DashboardWidgetResponse), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<DashboardWidgetResponse>> UpdateWidget(
            Guid id, [FromBody] UpdateDashboardWidgetRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result   = await _svc.UpdateDashboardWidgetAsync(id, request, schoolId);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
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
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error updating widget {Id}", id);
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        // DELETE /api/analytics/widgets/{id}
        [HttpDelete("widgets/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        [ProducesResponseType(204)]
        [ProducesResponseType(404)]
        public async Task<ActionResult> DeleteWidget(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var deleted  = await _svc.DeleteDashboardWidgetAsync(id, schoolId);
                if (!deleted)
                    return NotFound(new { message = $"Widget {id} not found." });
                return NoContent();
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error deleting widget {Id}", id);
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        // GET /api/analytics/metrics
        [HttpGet("metrics")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(AnalyticsListResponse), 200)]
        public async Task<ActionResult<AnalyticsListResponse>> GetMetrics(
            [FromQuery] string? metricType = null,
            [FromQuery] string? period     = null,
            [FromQuery] int     page       = 1,
            [FromQuery] int     pageSize   = 10)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result   = await _svc.GetAnalyticsAsync(schoolId, page, pageSize, metricType, period);
            return Ok(result);
        }

        // GET /api/analytics/metrics/{id}
        [HttpGet("metrics/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(AnalyticsResponse), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<AnalyticsResponse>> GetMetricById(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result   = await _svc.GetAnalyticsByIdAsync(id, schoolId);
            if (result is null)
                return NotFound(new { message = $"Analytics record {id} not found." });
            return Ok(result);
        }

        // POST /api/analytics/metrics
        [HttpPost("metrics")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        [ProducesResponseType(typeof(AnalyticsResponse), 201)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        public async Task<ActionResult<AnalyticsResponse>> CreateMetric(
            [FromBody] CreateAnalyticsRequest request)
        {
            try
            {
                var schoolId     = _tenant.GetEffectiveSchoolId();
                request.SchoolId = schoolId;
                var result       = await _svc.CreateAnalyticsAsync(request);
                return CreatedAtAction(nameof(GetMetricById), new { id = result.Id }, result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
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
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error creating analytics metric");
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        // DELETE /api/analytics/metrics/{id}
        [HttpDelete("metrics/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        [ProducesResponseType(204)]
        [ProducesResponseType(404)]
        public async Task<ActionResult> DeleteMetric(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var deleted  = await _svc.DeleteAnalyticsAsync(id, schoolId);
                if (!deleted)
                    return NotFound(new { message = $"Analytics record {id} not found." });
                return NoContent();
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error deleting analytics metric {Id}", id);
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }
    }
}
