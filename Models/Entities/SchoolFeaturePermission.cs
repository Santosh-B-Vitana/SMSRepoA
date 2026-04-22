using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    /// <summary>
    /// Represents feature/module permissions for a school.
    /// Controls which modules are enabled and what access levels are granted.
    /// Used by Super Admin (Sales Team) to manage school packages.
    /// Supports optional branch-level permissions for multi-branch schools.
    /// </summary>
    public class SchoolFeaturePermission : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        /// <summary>
        /// Optional: Branch identifier for multi-branch schools
        /// If null, permission applies to all branches
        /// </summary>
        [MaxLength(100)]
        public string? BranchCode { get; set; }
        
        /// <summary>
        /// Module name (e.g., students, staff, attendance, fees, health, hostel, etc.)
        /// </summary>
        [Required]
        [MaxLength(100)]
        public string ModuleName { get; set; } = string.Empty;
        
        /// <summary>
        /// Whether this module is enabled for the school
        /// </summary>
        public bool IsEnabled { get; set; } = true;
        
        /// <summary>
        /// Comma-separated permission levels (e.g., "read,write,delete")
        /// </summary>
        [MaxLength(200)]
        public string PermissionLevels { get; set; } = "read";
        
        /// <summary>
        /// Optional: Package/Plan name this feature belongs to
        /// </summary>
        [MaxLength(100)]
        public string? PackageName { get; set; }
        
        /// <summary>
        /// Optional: Notes about why this feature is enabled/disabled
        /// </summary>
        [MaxLength(500)]
        public string? Notes { get; set; }
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
    }
}
