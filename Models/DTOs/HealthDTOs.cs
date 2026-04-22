using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SmsApi.Models.DTOs
{
    // ========== HEALTH RECORD DTOs (Basic & Full) ==========
    
    /// <summary>
    /// Basic DTO for GET list endpoints - lightweight health record data
    /// </summary>
    public class HealthRecordBasicDto
    {
        public Guid Id { get; set; }
        public Guid StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string Class { get; set; } = string.Empty;
        public string Section { get; set; } = string.Empty;
        public DateTime CheckupDate { get; set; }
        public decimal Height { get; set; } // cm
        public decimal Weight { get; set; } // kg
        public decimal BMI { get; set; }
        public string BMICategory { get; set; } = string.Empty; // underweight, normal, overweight, obese
        public string? BloodGroup { get; set; }
        public string Status { get; set; } = string.Empty; // normal, attention_required, critical, follow_up
    }

    /// <summary>
    /// Full DTO for GET by ID endpoints - complete health record details
    /// </summary>
    public class HealthRecordFullDto
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string Class { get; set; } = string.Empty;
        public string Section { get; set; } = string.Empty;
        public DateTime CheckupDate { get; set; }
        
        // Physical Measurements
        public decimal Height { get; set; } // cm
        public decimal Weight { get; set; } // kg
        public decimal BMI { get; set; }
        public string BMICategory { get; set; } = string.Empty;
        
        // Vitals
        public int? BloodPressureSystolic { get; set; }
        public int? BloodPressureDiastolic { get; set; }
        public int? HeartRate { get; set; }
        public decimal? Temperature { get; set; }
        
        // Medical Info
        public string? BloodGroup { get; set; }
        public List<string> Allergies { get; set; } = new();
        public List<string> MedicalConditions { get; set; } = new();
        public List<string> CurrentMedications { get; set; } = new();
        
        // Vision & Hearing
        public string? VisionLeft { get; set; }
        public string? VisionRight { get; set; }
        public string? HearingLeft { get; set; }
        public string? HearingRight { get; set; }
        
        // Dental
        public string? DentalStatus { get; set; }
        public string? DentalRemarks { get; set; }
        
        // Doctor Details
        public string DoctorName { get; set; } = string.Empty;
        public string? DoctorNotes { get; set; }
        public string? Recommendations { get; set; }
        public DateTime? NextCheckupDate { get; set; }
        
        public string Status { get; set; } = string.Empty;
        
        // Related Data
        public List<VaccinationDto> Vaccinations { get; set; } = new();
        public List<HealthAlertDto> ActiveAlerts { get; set; } = new();
        
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    // ========== VACCINATION DTO ==========
    
    public class VaccinationDto
    {
        public Guid Id { get; set; }
        public Guid StudentId { get; set; }
        public string VaccineName { get; set; } = string.Empty;
        public DateTime VaccinationDate { get; set; }
        public DateTime? NextDueDate { get; set; }
        public string? BatchNumber { get; set; }
        public string? AdministeredBy { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    // ========== HEALTH ALERT DTO ==========
    
    public class HealthAlertDto
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string AlertType { get; set; } = string.Empty; // allergy, medical_condition, medication, vaccination_due, follow_up
        public string Severity { get; set; } = string.Empty; // low, medium, high, critical
        public string Description { get; set; } = string.Empty;
        public bool IsAcknowledged { get; set; }
        public Guid? AcknowledgedBy { get; set; }
        public string? AcknowledgedByName { get; set; }
        public DateTime? AcknowledgedAt { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    // ========== CREATE/UPDATE DTOs ==========
    
    public class CreateHealthRecordDto
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public Guid StudentId { get; set; }
        
        [Required]
        public DateTime CheckupDate { get; set; }
        
        // Physical Measurements
        [Required]
        [Range(30, 250)]
        public decimal Height { get; set; } // cm
        
        [Required]
        [Range(5, 200)]
        public decimal Weight { get; set; } // kg
        
        // Vitals
        public int? BloodPressureSystolic { get; set; }
        public int? BloodPressureDiastolic { get; set; }
        public int? HeartRate { get; set; }
        public decimal? Temperature { get; set; }
        
        // Medical Info
        [MaxLength(10)]
        public string? BloodGroup { get; set; }
        
        public List<string>? Allergies { get; set; }
        public List<string>? MedicalConditions { get; set; }
        public List<string>? CurrentMedications { get; set; }
        
        // Vision & Hearing
        [MaxLength(10)]
        public string? VisionLeft { get; set; }
        
        [MaxLength(10)]
        public string? VisionRight { get; set; }
        
        [MaxLength(10)]
        public string? HearingLeft { get; set; }
        
        [MaxLength(10)]
        public string? HearingRight { get; set; }
        
        // Dental
        [MaxLength(50)]
        public string? DentalStatus { get; set; }
        
        public string? DentalRemarks { get; set; }
        
        // Doctor Details
        [Required]
        [MaxLength(200)]
        public string DoctorName { get; set; } = string.Empty;
        
        public string? DoctorNotes { get; set; }
        public string? Recommendations { get; set; }
        public DateTime? NextCheckupDate { get; set; }
        
        [MaxLength(30)]
        public string Status { get; set; } = "normal"; // normal, attention_required, critical, follow_up
    }

    public class UpdateHealthRecordDto
    {
        public DateTime? CheckupDate { get; set; }
        
        // Physical Measurements
        [Range(30, 250)]
        public decimal? Height { get; set; }
        
        [Range(5, 200)]
        public decimal? Weight { get; set; }
        
        // Vitals
        public int? BloodPressureSystolic { get; set; }
        public int? BloodPressureDiastolic { get; set; }
        public int? HeartRate { get; set; }
        public decimal? Temperature { get; set; }
        
        // Medical Info
        [MaxLength(10)]
        public string? BloodGroup { get; set; }
        
        public List<string>? Allergies { get; set; }
        public List<string>? MedicalConditions { get; set; }
        public List<string>? CurrentMedications { get; set; }
        
        // Vision & Hearing
        [MaxLength(10)]
        public string? VisionLeft { get; set; }
        
        [MaxLength(10)]
        public string? VisionRight { get; set; }
        
        [MaxLength(10)]
        public string? HearingLeft { get; set; }
        
        [MaxLength(10)]
        public string? HearingRight { get; set; }
        
        // Dental
        [MaxLength(50)]
        public string? DentalStatus { get; set; }
        
        public string? DentalRemarks { get; set; }
        
        // Doctor Details
        [MaxLength(200)]
        public string? DoctorName { get; set; }
        
        public string? DoctorNotes { get; set; }
        public string? Recommendations { get; set; }
        public DateTime? NextCheckupDate { get; set; }
        
        [MaxLength(30)]
        public string? Status { get; set; }
    }

    public class CreateVaccinationDto
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public Guid StudentId { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string VaccineName { get; set; } = string.Empty;
        
        [Required]
        public DateTime VaccinationDate { get; set; }
        
        public DateTime? NextDueDate { get; set; }
        
        [MaxLength(50)]
        public string? BatchNumber { get; set; }
        
        [MaxLength(200)]
        public string? AdministeredBy { get; set; }
    }

    public class CreateHealthAlertDto
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public Guid StudentId { get; set; }
        
        [Required]
        [MaxLength(30)]
        public string AlertType { get; set; } = string.Empty; // allergy, medical_condition, medication, vaccination_due, follow_up
        
        [Required]
        [MaxLength(10)]
        public string Severity { get; set; } = string.Empty; // low, medium, high, critical
        
        [Required]
        public string Description { get; set; } = string.Empty;
    }

    public class AcknowledgeAlertDto
    {
        [Required]
        public Guid AcknowledgedBy { get; set; }
        
        public string? AcknowledgementNotes { get; set; }
        
        public string? Remarks { get; set; }
    }

    // ========== LIST RESPONSES ==========
    
    public class HealthRecordListResponse
    {
        public List<HealthRecordBasicDto> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    public class VaccinationListResponse
    {
        public List<VaccinationDto> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    public class HealthAlertListResponse
    {
        public List<HealthAlertDto> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    // ========== STATS DTOs ==========
    
    public class HealthStatsDto
    {
        public int TotalRecords { get; set; }
        public int NormalStatus { get; set; }
        public int AttentionRequired { get; set; }
        public int Critical { get; set; }
        public int FollowUp { get; set; }
        public decimal AvgBMI { get; set; }
        public int UpcomingCheckups { get; set; }
        public int VaccinationsDue { get; set; }
        public BMIDistributionDto BMIDistribution { get; set; } = new();
    }

    public class BMIDistributionDto
    {
        public int Underweight { get; set; }
        public int Normal { get; set; }
        public int Overweight { get; set; }
        public int Obese { get; set; }
    }

    // ========== FILTER DTOs ==========
    
    public class HealthRecordFiltersDto
    {
        public Guid? StudentId { get; set; }
        public Guid? ClassId { get; set; }
        public string? BloodGroup { get; set; }
        public string? SearchQuery { get; set; }
        public DateTime? DateFrom { get; set; }
        public DateTime? DateTo { get; set; }
    }

    public class HealthAlertFiltersDto
    {
        public Guid? StudentId { get; set; }
        public string? AlertType { get; set; }
        public string? Severity { get; set; }
        public string? Status { get; set; }
        public bool? IsAcknowledged { get; set; }
        public DateTime? DateFrom { get; set; }
        public DateTime? DateTo { get; set; }
    }

    // ========== VACCINATION DTOs ==========
    
    public class VaccinationRecordDto
    {
        [Required]
        public Guid StudentId { get; set; }
        
        [Required]
        [MaxLength(200)]
        public string VaccineName { get; set; } = string.Empty;
        
        [Required]
        public DateTime DateAdministered { get; set; }
        
        public DateTime? NextDoseDate { get; set; }
        
        public string? AdministeredBy { get; set; }
        public string? BatchNumber { get; set; }
        public string? Notes { get; set; }
    }

    public class UpcomingVaccinationDto
    {
        public Guid StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string VaccineName { get; set; } = string.Empty;
        public DateTime DueDate { get; set; }
        public int DaysRemaining { get; set; }
    }

    // ========== BMI CALCULATION ==========
    
    public class CalculateBmiDto
    {
        [Required]
        public decimal Height { get; set; } // in cm
        
        [Required]
        public decimal Weight { get; set; } // in kg
    }

    public class BmiCalculationDto
    {
        public decimal Height { get; set; }
        public decimal Weight { get; set; }
        public decimal BMI { get; set; }
        public string Category { get; set; } = string.Empty; // Underweight, Normal, Overweight, Obese
        public string? Recommendation { get; set; }
    }
}
