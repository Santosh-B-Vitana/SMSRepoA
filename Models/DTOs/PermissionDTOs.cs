using System;
using System.Collections.Generic;

namespace SmsApi.Models.DTOs
{
    // Role Basic DTO - Lightweight version for list views
    public class RoleBasicDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? DisplayName { get; set; }
        public int UserCount { get; set; }
        public int PermissionCount { get; set; }
        public bool IsActive { get; set; }
    }

    // Permission Basic DTO - Lightweight version for list views
    public class PermissionBasicDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? DisplayName { get; set; }
        public string Module { get; set; } = string.Empty;
        public string Action { get; set; } = string.Empty;
        public bool IsActive { get; set; }
    }

    // Role DTOs
    public class CreateRoleRequest
    {
        public Guid SchoolId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? DisplayName { get; set; }
        public string? Description { get; set; }
        public string RoleType { get; set; } = "Custom";
        public Guid CreatedBy { get; set; }
    }

    public class UpdateRoleRequest
    {
        public string? DisplayName { get; set; }
        public string? Description { get; set; }
        public bool IsActive { get; set; }
        public Guid UpdatedBy { get; set; }
    }

    public class RoleResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? DisplayName { get; set; }
        public string? Description { get; set; }
        public string RoleType { get; set; } = string.Empty;
        public bool IsSystemRole { get; set; }
        public bool IsActive { get; set; }
        public int UserCount { get; set; }
        public int PermissionCount { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class RoleListResponse
    {
        public List<RoleResponse> Items { get; set; } = new();
        public List<RoleResponse> Roles { get; set; } = new();
        public int TotalCount { get; set; }
        public int Total { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    // Permission DTOs
    public class CreatePermissionRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? DisplayName { get; set; }
        public string? Description { get; set; }
        public string Module { get; set; } = string.Empty;
        public string Action { get; set; } = string.Empty;
        public string? ResourcePattern { get; set; }
        public Guid CreatedBy { get; set; }
    }

    public class UpdatePermissionRequest
    {
        public string? DisplayName { get; set; }
        public string? Description { get; set; }
        public bool IsActive { get; set; }
        public Guid UpdatedBy { get; set; }
    }

    public class PermissionResponse
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? DisplayName { get; set; }
        public string? Description { get; set; }
        public string Module { get; set; } = string.Empty;
        public string Action { get; set; } = string.Empty;
        public string? ResourcePattern { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class PermissionListResponse
    {
        public List<PermissionResponse> Items { get; set; } = new();
        public List<PermissionResponse> Permissions { get; set; } = new();
        public int TotalCount { get; set; }
    }

    // User Role DTOs
    public class AssignRoleRequest
    {
        public Guid SchoolId { get; set; }
        public Guid UserId { get; set; }
        public Guid RoleId { get; set; }
        public DateTime? ValidFrom { get; set; }
        public DateTime? ValidTo { get; set; }
        public Guid CreatedBy { get; set; }
    }

    public class UserRoleResponse
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public Guid RoleId { get; set; }
        public string RoleName { get; set; } = string.Empty;
        public string? RoleDisplayName { get; set; }
        public DateTime? ValidFrom { get; set; }
        public DateTime? ValidTo { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    // Role Permission DTOs
    public class AssignPermissionsRequest
    {
        public Guid RoleId { get; set; }
        public List<Guid> PermissionIds { get; set; } = new();
        public Guid CreatedBy { get; set; }
    }

    public class RolePermissionResponse
    {
        public Guid RoleId { get; set; }
        public string RoleName { get; set; } = string.Empty;
        public List<Guid> PermissionIds { get; set; } = new();
        public string? PermissionName { get; set; }
        public string? PermissionDisplayName { get; set; }
        public List<PermissionResponse> Permissions { get; set; } = new();
    }

    public class CheckPermissionRequest
    {
        public Guid SchoolId { get; set; }
        public Guid UserId { get; set; }
        public string PermissionName { get; set; } = string.Empty;
        public string Module { get; set; } = string.Empty;
        public string Action { get; set; } = string.Empty;
    }

    public class CheckPermissionResponse
    {
        public Guid UserId { get; set; }
        public string PermissionName { get; set; } = string.Empty;
        public bool HasPermission { get; set; }
        public List<string> GrantedPermissions { get; set; } = new();
    }

    // ── New DTOs for enhanced Role Management ───────────────────────────────

    public class SetRolePermissionsRequest
    {
        public List<Guid> PermissionIds { get; set; } = new();
    }

    public class PermissionGroupResponse
    {
        public string Module { get; set; } = string.Empty;
        public List<PermissionResponse> Permissions { get; set; } = new();
    }

    public class UserWithRolesResponse
    {
        public Guid Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string PrimaryRole { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime? LastLogin { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<RoleBasicDto> AssignedRoles { get; set; } = new();
        /// <summary>True when the staff member has a UserLogin account (can be assigned roles)</summary>
        public bool HasLoginAccount { get; set; } = true;
        /// <summary>Staff.Id — used to provision a login for staff members who don't have one yet</summary>
        public Guid? StaffId { get; set; }
    }

    public class UserListWithRolesResponse
    {
        public List<UserWithRolesResponse> Users { get; set; } = new();
        public int Total { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }

    public class RoleStatsResponse
    {
        public int TotalRoles { get; set; }
        public int CustomRoles { get; set; }
        public int SystemRoles { get; set; }
        public int TotalUsersWithRoles { get; set; }
        public int TotalPermissions { get; set; }
    }
}
