using SmsApi.Models.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Services;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

namespace SmsApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PermissionsController : ControllerBase
    {
        private readonly IPermissionsService _permissionsService;
        private readonly ITenantContext _tenant;
        private readonly AppDbContext _db;

        public PermissionsController(IPermissionsService permissionsService, ITenantContext tenant, AppDbContext db)
        {
            _permissionsService = permissionsService;
            _db = db;
            _tenant = tenant;
        }

        private Guid GetCurrentUserId()
        {
            var claim = User.FindFirst("UserId") ?? User.FindFirst(ClaimTypes.NameIdentifier);
            return claim != null ? Guid.Parse(claim.Value) : Guid.Empty;
        }

        // --- Current user permissions --------------------------------------------

        /// <summary>
        /// Returns the effective permission strings ("Module.Action") for the current user,
        /// plus an <c>isRoleManaged</c> flag that tells the UI whether this user has ever had
        /// explicit Role Management assignments (active OR previously removed).
        /// When <c>isRoleManaged = false</c> the UI falls back to designation-based defaults.
        /// </summary>
        [HttpGet("me")]
        public async Task<ActionResult<object>> GetMyPermissions()
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == Guid.Empty)
                    return Unauthorized(new { message = "Unable to identify user" });

                // Admin / super-admin have full access — return wildcard, always managed
                var jwtRole = User.FindFirst(ClaimTypes.Role)?.Value ?? "";
                if (jwtRole.Equals("Admin", StringComparison.OrdinalIgnoreCase)
                    || jwtRole.Equals("SuperAdmin", StringComparison.OrdinalIgnoreCase))
                    return Ok(new { permissions = new List<string> { "*" }, isRoleManaged = true });

                var schoolId = _tenant.GetEffectiveSchoolId();

                // Does the user have any active role assignments right now?
                // If yes → role management is in effect → fail-closed (strict permission check).
                // If no  → no active roles configured → use designation-based fallback.
                // Note: we intentionally check !IsDeleted so that removing all roles reverts to
                // designation defaults rather than locking the user out permanently.
                var isRoleManaged = await _db.UserRoles
                    .AnyAsync(ur => ur.UserId == userId && ur.SchoolId == schoolId && !ur.IsDeleted);

                var permissions = await _permissionsService.GetUserEffectivePermissionsAsync(userId, schoolId);
                return Ok(new { permissions, isRoleManaged });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // --- Roles ---------------------------------------------------------------

        /// <summary>Get all roles for the authenticated school (auto-seeds system roles on first call)</summary>
        [HttpGet("roles")]
        public async Task<ActionResult<RoleListResponse>> GetRoles(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var roles = await _permissionsService.GetRolesAsync(schoolId, page, pageSize);
                return Ok(roles);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        /// <summary>Legacy endpoint � schoolId in path (kept for backward compat)</summary>
        [HttpGet("roles/{schoolId:guid}")]
        public async Task<ActionResult<RoleListResponse>> GetRolesBySchool(Guid schoolId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            try
            {
                var jwtSchoolId = _tenant.GetEffectiveSchoolId();
                if (schoolId != jwtSchoolId)
                    return Forbid();
                var roles = await _permissionsService.GetRolesAsync(schoolId, page, pageSize);
                return Ok(roles);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("roles/{id:guid}/school/{schoolId:guid}")]
        public async Task<ActionResult<RoleResponse>> GetRoleById(Guid id, Guid schoolId)
        {
            try
            {
                var role = await _permissionsService.GetRoleByIdAsync(id, schoolId);
                return Ok(role);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = ex.Message }); }
        }

        [HttpPost("roles")]
        public async Task<ActionResult<RoleResponse>> CreateRole([FromBody] CreateRoleRequest request)
        {
            try
            {
                // Inject from JWT � never trust client-provided SchoolId
                request.SchoolId = _tenant.GetEffectiveSchoolId();
                request.CreatedBy = GetCurrentUserId();
                var role = await _permissionsService.CreateRoleAsync(request);
                return CreatedAtAction(nameof(GetRoleById), new { id = role.Id, schoolId = role.SchoolId }, role);
            }            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = ex.Message }); }
        }

        [HttpPut("roles/{id}")]
        public async Task<ActionResult<RoleResponse>> UpdateRole(Guid id, [FromBody] UpdateRoleRequest request)
        {
            try
            {
                request.UpdatedBy = GetCurrentUserId();
                var schoolId = _tenant.GetEffectiveSchoolId();
                var role = await _permissionsService.UpdateRoleAsync(id, request, schoolId);
                return Ok(role);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = ex.Message }); }
        }

        [HttpDelete("roles/{id}")]
        public async Task<ActionResult> DeleteRole(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                await _permissionsService.DeleteRoleAsync(id, schoolId);
                return NoContent();
            }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = ex.Message }); }
        }

        // --- Role Permissions -----------------------------------------------------

        /// <summary>Get permissions for a role as a flat list of Guids � used by the permission matrix UI</summary>
        [HttpGet("roles/{roleId}/permissions/ids")]
        public async Task<ActionResult<List<Guid>>> GetRolePermissionIds(Guid roleId)
        {
            try
            {
                var ids = await _permissionsService.GetRolePermissionIdsAsync(roleId);
                return Ok(ids);
            }
            catch (Exception ex) { return StatusCode(500, new { message = ex.Message }); }
        }

        /// <summary>Replace all permissions for a role � full matrix save</summary>
        [HttpPut("roles/{roleId}/permissions")]
        public async Task<ActionResult> SetRolePermissions(Guid roleId, [FromBody] SetRolePermissionsRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                await _permissionsService.SetRolePermissionsAsync(roleId, schoolId, request.PermissionIds);
                return Ok(new { message = "Permissions updated successfully" });
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = ex.Message }); }
        }

        // --- Global Permissions ---------------------------------------------------

        [HttpGet("permissions")]
        public async Task<ActionResult<PermissionListResponse>> GetPermissions([FromQuery] string? module = null)
        {
            try
            {
                var permissions = await _permissionsService.GetPermissionsAsync(module);
                return Ok(permissions);
            }
            catch (Exception ex) { return StatusCode(500, new { message = ex.Message }); }
        }

        /// <summary>Get all permissions grouped by module � used to build the permission matrix</summary>
        [HttpGet("permissions/grouped")]
        public async Task<ActionResult<List<PermissionGroupResponse>>> GetPermissionsGrouped()
        {
            try
            {
                var grouped = await _permissionsService.GetPermissionsGroupedAsync();
                return Ok(grouped);
            }
            catch (Exception ex) { return StatusCode(500, new { message = ex.Message }); }
        }

        [HttpPost("permissions")]
        public async Task<ActionResult<PermissionResponse>> CreatePermission([FromBody] CreatePermissionRequest request)
        {
            try
            {
                var permission = await _permissionsService.CreatePermissionAsync(request);
                return CreatedAtAction(nameof(GetPermissions), permission);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = ex.Message }); }
        }

        // --- User-Role Assignments ------------------------------------------------

        [HttpPost("user-roles")]
        public async Task<ActionResult<UserRoleResponse>> AssignRoleToUser([FromBody] AssignRoleRequest request)
        {
            try
            {
                // Inject from JWT
                request.SchoolId = _tenant.GetEffectiveSchoolId();
                request.CreatedBy = GetCurrentUserId();
                var userRole = await _permissionsService.AssignRoleToUserAsync(request);
                return Ok(userRole);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = ex.Message }); }
        }

        [HttpGet("user-roles/{userId}/school/{schoolId}")]
        public async Task<ActionResult<List<UserRoleResponse>>> GetUserRoles(Guid userId, Guid schoolId)
        {
            try
            {
                var userRoles = await _permissionsService.GetUserRolesAsync(userId, schoolId);
                return Ok(userRoles);
            }
            catch (Exception ex) { return StatusCode(500, new { message = ex.Message }); }
        }

        [HttpDelete("user-roles/user/{userId}/role/{roleId}")]
        public async Task<ActionResult> RemoveUserRole(Guid userId, Guid roleId)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                await _permissionsService.RemoveUserRoleAsync(userId, roleId, schoolId);
                return NoContent();
            }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = ex.Message }); }
        }

        // --- Bulk role-permission (legacy endpoint, kept) -------------------------

        [HttpPost("role-permissions")]
        public async Task<ActionResult<RolePermissionResponse>> AssignPermissionsToRole([FromBody] AssignPermissionsRequest request)
        {
            try
            {
                var rolePermission = await _permissionsService.AssignPermissionsToRoleAsync(request);
                return Ok(rolePermission);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = ex.Message }); }
        }

        [HttpGet("role-permissions/{roleId}")]
        public async Task<ActionResult<List<RolePermissionResponse>>> GetRolePermissions(Guid roleId)
        {
            try
            {
                var rolePermissions = await _permissionsService.GetRolePermissionsAsync(roleId);
                return Ok(rolePermissions);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = ex.Message }); }
        }

        // --- Users with Roles -----------------------------------------------------

        [Authorize]
        [HttpGet("users-with-roles")]
        public async Task<ActionResult<UserListWithRolesResponse>> GetUsersWithRoles(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50,
            [FromQuery] bool staffOnly = false)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _permissionsService.GetUsersWithRolesAsync(schoolId, page, pageSize, staffOnly);
                return Ok(result);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = ex.Message }); }
        }

        /// <summary>
        /// Creates a UserLogin for a staff member who doesn't have one yet, and auto-assigns
        /// their matching system role based on their designation. Temp password = ChangeMe@123.
        /// </summary>
        [Authorize]
        [HttpPost("provision-staff-login/{staffId:guid}")]
        public async Task<ActionResult<UserWithRolesResponse>> ProvisionStaffLogin(Guid staffId)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _permissionsService.ProvisionStaffLoginAsync(staffId, schoolId);
                return Ok(result);
            }
            catch (InvalidOperationException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = ex.Message }); }
        }

        // --- Stats ----------------------------------------------------------------

        [HttpGet("stats")]
        public async Task<ActionResult<RoleStatsResponse>> GetStats()
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var stats = await _permissionsService.GetRoleStatsAsync(schoolId);
                return Ok(stats);
            }
            catch (Exception ex) { return StatusCode(500, new { message = ex.Message }); }
        }

        // --- Permission check -----------------------------------------------------

        [HttpPost("check")]
        public async Task<ActionResult<CheckPermissionResponse>> CheckUserPermission([FromBody] CheckPermissionRequest request)
        {
            try
            {
                var result = await _permissionsService.CheckUserPermissionAsync(request);
                return Ok(result);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = ex.Message }); }
        }

        // --- Seed -----------------------------------------------------------------

        [HttpPost("seed")]
        [Authorize(Roles = "Admin,admin")]
        public async Task<ActionResult> SeedDefaults()
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                await _permissionsService.EnsureSystemRolesAsync(schoolId);
                return Ok(new { message = "System roles and permissions seeded successfully" });
            }
            catch (Exception ex) { return StatusCode(500, new { message = ex.Message }); }
        }
    }
}
