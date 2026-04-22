using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SmsApi.Models.DTOs
{
    public class SchoolFeaturePermissionDto
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string SchoolName { get; set; } = string.Empty;
        public string ModuleName { get; set; } = string.Empty;
        public bool IsEnabled { get; set; }
        public List<string> PermissionLevels { get; set; } = new();
        public string? PackageName { get; set; }
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public class SchoolPermissionsResponse
    {
        public Guid SchoolId { get; set; }
        public string SchoolName { get; set; } = string.Empty;
        public Dictionary<string, ModulePermissionDto> Modules { get; set; } = new();
    }

    public class ModulePermissionDto
    {
        public bool Enabled { get; set; }
        public List<string> Permissions { get; set; } = new();
    }

    public class UpdateSchoolFeaturePermissionRequest
    {
        // Note: SchoolId and ModuleName are provided via URL routing, not request body
        // Don't use [Required] here — it prevents model binding from the URL path
        public Guid SchoolId { get; set; }
        
        public string ModuleName { get; set; } = string.Empty;
        
        [Required]
        public bool IsEnabled { get; set; }
        
        public List<string> PermissionLevels { get; set; } = new();
        
        [MaxLength(100)]
        public string? PackageName { get; set; }
        
        [MaxLength(500)]
        public string? Notes { get; set; }
    }

    public class BulkUpdateSchoolFeaturesRequest
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        /// <summary>Key = moduleName (e.g. "library"), Value = permission settings.</summary>
        [Required]
        public Dictionary<string, ModulePermissionDto> Modules { get; set; } = new();
    }

    public class SchoolListDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string SchoolCode { get; set; } = string.Empty;
        public string? Address { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? Logo { get; set; }
        public bool IsActive { get; set; }
        public int EnabledModulesCount { get; set; }
        public int TotalModulesCount { get; set; }
    }

    public class SchoolDetailDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string SchoolCode { get; set; } = string.Empty;
        public string? Address { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? Logo { get; set; }
        public bool IsActive { get; set; }
    }

    public class CreateSchoolRequest
    {
        [Required]
        [MaxLength(255)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string SchoolCode { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Address { get; set; }

        [MaxLength(20)]
        public string? Phone { get; set; }

        [MaxLength(255)]
        [EmailAddress]
        public string? Email { get; set; }

        [MaxLength(500)]
        public string? Logo { get; set; }
    }

    public class UpdateSchoolRequest
    {
        [MaxLength(255)]
        public string? Name { get; set; }

        [MaxLength(500)]
        public string? Address { get; set; }

        [MaxLength(20)]
        public string? Phone { get; set; }

        [MaxLength(255)]
        [EmailAddress]
        public string? Email { get; set; }

        [MaxLength(500)]
        public string? Logo { get; set; }
    }

    public class PlatformUserDto
    {
        public Guid Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public Guid SchoolId { get; set; }
        public string SchoolName { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? LastLogin { get; set; }
    }

    public class CreatePlatformUserRequest
    {
        [Required]
        public string Username { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string Password { get; set; } = string.Empty;

        [Required]
        public string Role { get; set; } = string.Empty;

        [Required]
        public Guid SchoolId { get; set; }
    }

    public class AdminResetPasswordRequest
    {
        [Required]
        public string NewPassword { get; set; } = string.Empty;
    }

    public class PlatformStatsDto
    {
        public int TotalSchools { get; set; }
        public int ActiveSchools { get; set; }
        public int TotalUsers { get; set; }
        public int ActiveUsers { get; set; }
        public int TotalStudents { get; set; }
        public int TotalStaff { get; set; }
    }
}
