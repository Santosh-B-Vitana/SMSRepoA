using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SmsApi.Models.DTOs
{
    // Payslip Basic DTO - Lightweight version for list views
    public class PayslipBasicDto
    {
        public Guid Id { get; set; }
        public Guid StaffId { get; set; }
        public string StaffName { get; set; } = string.Empty;
        public string Month { get; set; } = string.Empty;
        public int Year { get; set; }
        public decimal GrossSalary { get; set; }
        public decimal NetSalary { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime? PaymentDate { get; set; }
    }

    // ========== PAYROLL PROCESSING DTOs ==========
    
    public class ProcessPayrollsDto
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public string Month { get; set; } = string.Empty;
        
        [Required]
        public int Year { get; set; }
        
        public List<Guid>? StaffIds { get; set; }
        public bool AutoApprove { get; set; } = false;
    }

    public class PayslipDto
    {
        public Guid Id { get; set; }
        public Guid StaffId { get; set; }
        public string StaffName { get; set; } = string.Empty;
        public string Designation { get; set; } = string.Empty;
        public string Month { get; set; } = string.Empty;
        public int Year { get; set; }
        public decimal BasicSalary { get; set; }
        public decimal TotalAllowances { get; set; }
        public decimal TotalDeductions { get; set; }
        public decimal GrossSalary { get; set; }
        public decimal NetSalary { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime? PaymentDate { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CalculateSalaryDto
    {
        [Required]
        public Guid StaffId { get; set; }
        
        [Required]
        public string Month { get; set; } = string.Empty;
        
        [Required]
        public int Year { get; set; }
        
        public int WorkingDays { get; set; } = 26;
        public int PresentDays { get; set; } = 26;
        public int? OvertimeHours { get; set; }
        public decimal? Bonus { get; set; }
    }
}
