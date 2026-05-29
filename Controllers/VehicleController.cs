using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmsApi.Models.Constants;
using SmsApi.Models.DTOs;
using SmsApi.Services;

namespace SmsApi.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/transport/vehicles")]
    public class VehicleController : ControllerBase
    {
        private readonly IVehicleService _vehicleService;
        private readonly ITenantContext _tenant;

        public VehicleController(IVehicleService vehicleService, ITenantContext tenant)
        {
            _vehicleService = vehicleService;
            _tenant = tenant;
        }

        /// <summary>List all vehicles for this school</summary>
        [HttpGet]
        [Authorize(Roles = StatusConstants.RoleGroups.TransportManagement)]
        public async Task<IActionResult> GetVehicles(
            [FromQuery] string? status,
            [FromQuery] string? type)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result = await _vehicleService.GetVehiclesAsync(schoolId, status, type);
            return Ok(result);
        }

        /// <summary>Get a specific vehicle by ID</summary>
        [HttpGet("{id:guid}")]
        [Authorize(Roles = StatusConstants.RoleGroups.TransportManagement)]
        public async Task<IActionResult> GetVehicle(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var vehicle = await _vehicleService.GetVehicleByIdAsync(id, schoolId);
            if (vehicle == null) return NotFound(new { message = "Vehicle not found." });
            return Ok(vehicle);
        }

        /// <summary>Register a new vehicle</summary>
        [HttpPost]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<IActionResult> CreateVehicle([FromBody] CreateVehicleRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var schoolId = _tenant.GetEffectiveSchoolId();
            try
            {
                var vehicle = await _vehicleService.CreateVehicleAsync(schoolId, request);
                return CreatedAtAction(nameof(GetVehicle), new { id = vehicle.Id }, vehicle);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        /// <summary>Update vehicle details or compliance documents</summary>
        [HttpPut("{id:guid}")]
        [Authorize(Roles = StatusConstants.RoleGroups.TransportManagement)]
        public async Task<IActionResult> UpdateVehicle(Guid id, [FromBody] UpdateVehicleRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var schoolId = _tenant.GetEffectiveSchoolId();
            try
            {
                var vehicle = await _vehicleService.UpdateVehicleAsync(id, schoolId, request);
                if (vehicle == null) return NotFound(new { message = "Vehicle not found." });
                return Ok(vehicle);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        /// <summary>Remove a vehicle (unlinks from all routes first)</summary>
        [HttpDelete("{id:guid}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<IActionResult> DeleteVehicle(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var deleted = await _vehicleService.DeleteVehicleAsync(id, schoolId);
            if (!deleted) return NotFound(new { message = "Vehicle not found." });
            return NoContent();
        }

        /// <summary>
        /// Get compliance alerts — vehicles with documents expiring within 30 days.
        /// Used for the transport dashboard alert banner.
        /// </summary>
        [HttpGet("alerts")]
        [Authorize(Roles = StatusConstants.RoleGroups.TransportManagement)]
        public async Task<IActionResult> GetExpiryAlerts([FromQuery] int daysAhead = 30)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var alerts = await _vehicleService.GetExpiryAlertsAsync(schoolId, daysAhead);
            return Ok(new { vehicles = alerts, count = alerts.Count });
        }
    }
}
