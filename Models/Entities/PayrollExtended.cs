using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    // ========== SALARY STRUCTURE ==========
    public class SalaryStructure : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;
        
        [MaxLength(100)]
        public string? Designation { get; set; }
        
        [Required]
        public decimal BasicSalary { get; set; }
        
        [MaxLength(2000)]
        public string? AllowanceConfig { get; set; } // JSON configuration for allowances
        
        [MaxLength(2000)]
        public string? DeductionConfig { get; set; } // JSON configuration for deductions
        
        [MaxLength(1000)]
        public string? Description { get; set; }
        
        public bool IsActive { get; set; } = true;
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
    }
}
