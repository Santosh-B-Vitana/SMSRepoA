using System;
using System.ComponentModel.DataAnnotations;

namespace SmsApi.Models.Entities
{
    public class School : BaseEntity
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
        
        public bool IsActive { get; set; } = true;
    }
}
