using SmsApi.Models.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;
using SmsApi.Services;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace SmsApi.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class TransportController : ControllerBase
    {
        private readonly ITransportService _transportService;
        private readonly ITenantContext _tenant;
        private readonly AppDbContext _db;

        public TransportController(ITransportService transportService, ITenantContext tenant, AppDbContext db)
        {
            _transportService = transportService;
            _tenant = tenant;
            _db = db;
        }

        [HttpGet("routes")]
        [Authorize(Roles = StatusConstants.RoleGroups.TransportManagement)]
        public async Task<ActionResult<TransportRouteListResponse>> GetRoutes(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _transportService.GetRoutesAsync(schoolId, page, pageSize);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpGet("routes/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.TransportManagement)]
        public async Task<ActionResult<TransportRouteResponse>> GetRouteById(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var route = await _transportService.GetRouteByIdAsync(id, schoolId);
                if (route == null)
                {
                    return NotFound();
                }
                return Ok(route);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpPost("routes")]
        [Authorize(Roles = StatusConstants.RoleGroups.TransportManagement)]
        public async Task<ActionResult<TransportRouteResponse>> CreateRoute([FromBody] CreateTransportRouteRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                request.SchoolId = schoolId;
                var route = await _transportService.CreateRouteAsync(request);
                return CreatedAtAction(nameof(GetRouteById), new { id = route.Id }, route);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpPut("routes/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.TransportManagement)]
        public async Task<ActionResult<TransportRouteResponse>> UpdateRoute(Guid id, [FromBody] CreateTransportRouteRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var route = await _transportService.UpdateRouteAsync(id, schoolId, request);
                if (route == null)
                {
                    return NotFound();
                }
                return Ok(route);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpDelete("routes/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.TransportManagement)]
        public async Task<ActionResult> DeleteRoute(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _transportService.DeleteRouteAsync(id, schoolId);
                if (!result)
                {
                    return NotFound();
                }
                return NoContent();
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpGet("routes/{routeId}/students")]
        [Authorize(Roles = StatusConstants.RoleGroups.TransportManagement)]
        public async Task<ActionResult> GetStudentsByRoute(Guid routeId)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var students = await _transportService.GetStudentsByRouteAsync(routeId, schoolId);
                return Ok(students);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpGet("students")]
        [Authorize(Roles = StatusConstants.RoleGroups.TransportManagement)]
        public async Task<ActionResult<TransportStudentListResponse>> GetAllTransportStudents(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? search = null)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                pageSize = Math.Clamp(pageSize, 1, 500);
                var result = await _transportService.GetAllTransportStudentsAsync(schoolId, page, pageSize, search);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpPost("students")]
        [Authorize(Roles = StatusConstants.RoleGroups.TransportManagement)]
        public async Task<ActionResult<TransportStudentResponse>> AssignStudentToRoute([FromBody] CreateTransportStudentRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                request.SchoolId = schoolId;
                var student = await _transportService.AssignStudentToRouteAsync(request);
                return Ok(student);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpPut("students/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.TransportManagement)]
        public async Task<ActionResult<TransportStudentResponse>> UpdateTransportStudent(Guid id, [FromBody] UpdateTransportStudentRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var student = await _transportService.UpdateTransportStudentAsync(id, schoolId, request);
                if (student == null) return NotFound();
                return Ok(student);
            }
            catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpDelete("students/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.TransportManagement)]
        public async Task<ActionResult> RemoveStudentFromRoute(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _transportService.RemoveStudentFromRouteAsync(id, schoolId);
                if (!result)
                {
                    return NotFound();
                }
                return NoContent();
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        // ── Route Stops ────────────────────────────────────────────────────

        [HttpGet("routes/{routeId}/stops")]
        [Authorize(Roles = StatusConstants.RoleGroups.TransportManagement)]
        public async Task<IActionResult> GetStops(Guid routeId)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var stops = await _transportService.GetStopsAsync(routeId, schoolId);
            return Ok(stops);
        }

        [HttpGet("stops/{id:guid}")]
        [Authorize(Roles = StatusConstants.RoleGroups.TransportManagement)]
        public async Task<IActionResult> GetStop(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var stop = await _transportService.GetStopByIdAsync(id, schoolId);
            if (stop == null) return NotFound(new { message = "Stop not found." });
            return Ok(stop);
        }

        [HttpPost("routes/{routeId}/stops")]
        [Authorize(Roles = StatusConstants.RoleGroups.TransportManagement)]
        public async Task<IActionResult> CreateStop(Guid routeId, [FromBody] CreateTransportStopRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var schoolId = _tenant.GetEffectiveSchoolId();
            try
            {
                var stop = await _transportService.CreateStopAsync(routeId, schoolId, request);
                return CreatedAtAction(nameof(GetStop), new { id = stop.Id }, stop);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpPut("stops/{id:guid}")]
        [Authorize(Roles = StatusConstants.RoleGroups.TransportManagement)]
        public async Task<IActionResult> UpdateStop(Guid id, [FromBody] UpdateTransportStopRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var schoolId = _tenant.GetEffectiveSchoolId();
            try
            {
                var stop = await _transportService.UpdateStopAsync(id, schoolId, request);
                if (stop == null) return NotFound(new { message = "Stop not found." });
                return Ok(stop);
            }
            catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpDelete("stops/{id:guid}")]
        [Authorize(Roles = StatusConstants.RoleGroups.TransportManagement)]
        public async Task<IActionResult> DeleteStop(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var deleted = await _transportService.DeleteStopAsync(id, schoolId);
            if (!deleted) return NotFound(new { message = "Stop not found." });
            return NoContent();
        }

        /// <summary>Reorder stops on a route — provide ordered list of stop IDs</summary>
        [HttpPost("routes/{routeId}/stops/reorder")]
        [Authorize(Roles = StatusConstants.RoleGroups.TransportManagement)]
        public async Task<IActionResult> ReorderStops(Guid routeId, [FromBody] ReorderStopsRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var schoolId = _tenant.GetEffectiveSchoolId();
            await _transportService.ReorderStopsAsync(routeId, schoolId, request);
            return Ok(new { message = "Stops reordered successfully." });
        }

        /// <summary>Assign or unassign a vehicle to a route</summary>
        [HttpPut("routes/{routeId}/vehicle")]
        [Authorize(Roles = StatusConstants.RoleGroups.TransportManagement)]
        public async Task<IActionResult> AssignVehicle(Guid routeId, [FromQuery] Guid? vehicleId)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            try
            {
                var route = await _transportService.AssignVehicleToRouteAsync(routeId, schoolId, vehicleId);
                if (route == null) return NotFound(new { message = "Route not found." });
                return Ok(route);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        // ── GPS Tracking ──────────────────────────────────────────────────────

        /// <summary>
        /// Push a GPS location ping for a vehicle.
        /// Called by the driver app or GPS hardware integration.
        /// </summary>
        [HttpPost("gps/{vehicleId:guid}")]
        [Authorize(Roles = "TransportManager,Admin,SuperAdmin")]
        public async Task<IActionResult> UpdateGpsLocation(Guid vehicleId, [FromBody] GpsLocationPushRequest req)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();

            var existing = await _db.VehicleGpsLocations
                .FirstOrDefaultAsync(g => g.SchoolId == schoolId && g.VehicleId == vehicleId && !g.IsDeleted);

            if (existing == null)
            {
                existing = new VehicleGpsLocation
                {
                    SchoolId  = schoolId,
                    VehicleId = vehicleId,
                };
                _db.VehicleGpsLocations.Add(existing);
            }

            existing.Latitude      = req.Latitude;
            existing.Longitude     = req.Longitude;
            existing.SpeedKmh      = req.SpeedKmh;
            existing.Heading       = req.Heading;
            existing.Status        = req.Status ?? "running";
            existing.ActiveRouteId = req.ActiveRouteId;
            existing.PingTime      = DateTime.UtcNow;
            existing.UpdatedAt     = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return Ok(new { vehicleId, pingTime = existing.PingTime });
        }

        /// <summary>
        /// Get current GPS location for a specific vehicle.
        /// </summary>
        [HttpGet("gps/{vehicleId:guid}")]
        [Authorize(Roles = StatusConstants.RoleGroups.TransportManagement + ",Parent")]
        public async Task<IActionResult> GetVehicleGps(Guid vehicleId)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var loc = await _db.VehicleGpsLocations
                .AsNoTracking()
                .Include(g => g.Vehicle)
                .FirstOrDefaultAsync(g => g.SchoolId == schoolId && g.VehicleId == vehicleId && !g.IsDeleted);

            if (loc == null) return NotFound(new { message = "No GPS data available for this vehicle." });

            var staleSec = (DateTime.UtcNow - loc.PingTime).TotalSeconds;
            return Ok(new
            {
                vehicleId,
                vehicleNumber = loc.Vehicle?.RegistrationNumber,
                loc.Latitude,
                loc.Longitude,
                loc.SpeedKmh,
                loc.Heading,
                loc.Status,
                loc.ActiveRouteId,
                pingTime = loc.PingTime,
                isStale  = staleSec > 300, // stale if no ping in 5 minutes
                staleSeconds = Math.Round(staleSec),
            });
        }

        /// <summary>
        /// Parent: get live bus locations for all routes their children are assigned to.
        /// </summary>
        [HttpGet("gps/parent/my-children")]
        [Authorize(Roles = "Parent")]
        public async Task<IActionResult> GetParentChildrenBusLocations()
        {
            var schoolId   = _tenant.GetEffectiveSchoolId();
            var parentEmail = User.FindFirstValue(ClaimTypes.Email) ?? string.Empty;

            // Find children via legacy StudentGuardians table
            var childIds = await _db.StudentGuardians
                .AsNoTracking()
                .Where(sg => sg.SchoolId == schoolId && !sg.IsDeleted
                          && sg.Email != null && sg.Email.ToLower() == parentEmail.ToLower())
                .Select(sg => sg.StudentId)
                .Distinct()
                .ToListAsync();

            if (!childIds.Any()) return Ok(Array.Empty<object>());

            // Find route+vehicle assignments for each child
            var assignments = await _db.TransportStudents
                .AsNoTracking()
                .Include(ts => ts.Route)
                .ThenInclude(r => r.Vehicle)
                .Where(ts => ts.SchoolId == schoolId && childIds.Contains(ts.StudentId) && !ts.IsDeleted)
                .ToListAsync();

            var result = new System.Collections.Generic.List<object>();
            foreach (var a in assignments)
            {
                var vehicleId = a.Route?.VehicleId;
                VehicleGpsLocation? loc = null;
                if (vehicleId.HasValue)
                {
                    loc = await _db.VehicleGpsLocations
                        .AsNoTracking()
                        .FirstOrDefaultAsync(g => g.SchoolId == schoolId && g.VehicleId == vehicleId.Value && !g.IsDeleted);
                }

                result.Add(new
                {
                    studentId    = a.StudentId,
                    routeId      = a.RouteId,
                    routeNumber  = a.Route?.RouteNumber,
                    routeName    = a.Route?.RouteName,
                    vehicleId,
                    vehicleNumber = a.Route?.Vehicle?.RegistrationNumber,
                    hasGps       = loc != null,
                    latitude     = loc?.Latitude,
                    longitude    = loc?.Longitude,
                    speedKmh     = loc?.SpeedKmh,
                    status       = loc?.Status ?? "unknown",
                    pingTime     = loc?.PingTime,
                    isStale      = loc == null || (DateTime.UtcNow - loc.PingTime).TotalSeconds > 300,
                });
            }

            return Ok(result);
        }
    }
}

public class GpsLocationPushRequest
{
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public double? SpeedKmh { get; set; }
    public double? Heading { get; set; }
    public string? Status { get; set; }
    public Guid? ActiveRouteId { get; set; }
}
