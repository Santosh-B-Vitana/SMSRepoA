using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    public class PayrollRecord : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public Guid StaffId { get; set; }
        
        [Required]
        public int Month { get; set; }
        
        [Required]
        public int Year { get; set; }
        
        [Column(TypeName = "decimal(10,2)")]
        public decimal BasicSalary { get; set; }
        
        [Column(TypeName = "decimal(10,2)")]
        public decimal Allowances { get; set; } = 0;
        
        [Column(TypeName = "decimal(10,2)")]
        public decimal Deductions { get; set; } = 0;
        
        [Column(TypeName = "decimal(10,2)")]
        public decimal Bonus { get; set; } = 0;
        
        [Column(TypeName = "decimal(10,2)")]
        public decimal NetSalary { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "pending";
        
        public DateTime? PaymentDate { get; set; }
        
        [MaxLength(50)]
        public string? PaymentMethod { get; set; }
        
        public string? Notes { get; set; }
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
        
        [ForeignKey("StaffId")]
        public virtual Staff? Staff { get; set; }
    }
    
    public class PayrollAllowance : BaseEntity
    {
        [Required]
        public Guid PayrollId { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string AllowanceType { get; set; } = string.Empty;
        
        [Column(TypeName = "decimal(10,2)")]
        public decimal Amount { get; set; }
        
        [ForeignKey("PayrollId")]
        public virtual PayrollRecord? Payroll { get; set; }
    }
    
    public class PayrollDeduction : BaseEntity
    {
        [Required]
        public Guid PayrollId { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string DeductionType { get; set; } = string.Empty;
        
        [Column(TypeName = "decimal(10,2)")]
        public decimal Amount { get; set; }
        
        [ForeignKey("PayrollId")]
        public virtual PayrollRecord? Payroll { get; set; }
    }
}
