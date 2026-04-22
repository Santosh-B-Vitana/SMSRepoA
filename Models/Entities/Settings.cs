using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    // School-level settings
    public class SchoolSettings : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string SettingKey { get; set; } = string.Empty;
        
        [Required]
        public string SettingValue { get; set; } = string.Empty;
        
        [MaxLength(50)]
        public string? DataType { get; set; } // String, Number, Boolean, JSON, Date
        
        [MaxLength(100)]
        public string? Category { get; set; } // General, Academic, Financial, Communication, etc.
        
        public string? Description { get; set; }
        
        public bool IsEncrypted { get; set; } = false;
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
    }

    // User-specific settings
    public class UserSettings : BaseEntity
    {
        [Required]
        public Guid UserId { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string SettingKey { get; set; } = string.Empty;
        
        [Required]
        public string SettingValue { get; set; } = string.Empty;
        
        [MaxLength(50)]
        public string? DataType { get; set; }
        
        [MaxLength(100)]
        public string? Category { get; set; } // Appearance, Notifications, Privacy, etc.
    }

    // System-wide configuration
    public class SystemConfiguration : BaseEntity
    {
        [Required]
        [MaxLength(100)]
        public string ConfigKey { get; set; } = string.Empty;
        
        [Required]
        public string ConfigValue { get; set; } = string.Empty;
        
        [MaxLength(50)]
        public string? DataType { get; set; }
        
        [MaxLength(100)]
        public string? Module { get; set; } // System, Security, Integration, etc.
        
        public string? Description { get; set; }
        
        public bool IsReadOnly { get; set; } = false;
        
        public bool RequiresRestart { get; set; } = false;
    }
}
