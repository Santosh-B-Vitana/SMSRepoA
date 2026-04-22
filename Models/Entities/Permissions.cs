using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    public class Role : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [MaxLength(100)]
        public string? DisplayName { get; set; }
        
        public string? Description { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string RoleType { get; set; } = "Custom"; // System, Custom
        
        public bool IsSystemRole { get; set; } = false;
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
        
        public virtual ICollection<UserRole>? UserRoles { get; set; }
        public virtual ICollection<RolePermission>? RolePermissions { get; set; }
    }

    public class Permission : BaseEntity
    {
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [MaxLength(100)]
        public string? DisplayName { get; set; }
        
        public string? Description { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string Module { get; set; } = string.Empty; // Students, Staff, Fees, etc.
        
        [Required]
        [MaxLength(50)]
        public string Action { get; set; } = string.Empty; // Create, Read, Update, Delete, Approve, etc.
        
        [MaxLength(200)]
        public string? ResourcePattern { get; set; } // API endpoint pattern
        
        public virtual ICollection<RolePermission>? RolePermissions { get; set; }
    }

    public class UserRole : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public Guid UserId { get; set; }
        
        [Required]
        public Guid RoleId { get; set; }
        
        public DateTime? ValidFrom { get; set; }
        
        public DateTime? ValidTo { get; set; }
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
        
        [ForeignKey("RoleId")]
        public virtual Role? Role { get; set; }
    }

    public class RolePermission : BaseEntity
    {
        [Required]
        public Guid RoleId { get; set; }
        
        [Required]
        public Guid PermissionId { get; set; }
        
        public bool IsGranted { get; set; } = true;
        
        [ForeignKey("RoleId")]
        public virtual Role? Role { get; set; }
        
        [ForeignKey("PermissionId")]
        public virtual Permission? Permission { get; set; }
    }
}
