using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SmsApi.Models.DTOs
{
    // ========== ADMISSIONS APPLICATION DTOs ==========
    
    public class AdmissionApplicationBasicDto
    {
        public Guid Id { get; set; }
        public string ApplicationNumber { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public string Class { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime ApplicationDate { get; set; }
    }

    public class AdmissionApplicationFullDto
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string ApplicationNumber { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public DateTime DateOfBirth { get; set; }
        public string Gender { get; set; } = string.Empty;
        public string Class { get; set; } = string.Empty;
        public string? Section { get; set; }
        public string FatherName { get; set; } = string.Empty;
        public string MotherName { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime ApplicationDate { get; set; }
        public DateTime? InterviewDate { get; set; }
        public DateTime? TestDate { get; set; }
        public string? Remarks { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateAdmissionApplicationDto
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        [MaxLength(200)]
        public string StudentName { get; set; } = string.Empty;
        
        [Required]
        public DateTime DateOfBirth { get; set; }
        
        [Required]
        public string Gender { get; set; } = string.Empty;
        
        [Required]
        public string Class { get; set; } = string.Empty;
        
        [Required]
        public string FatherName { get; set; } = string.Empty;
        
        [Required]
        public string MotherName { get; set; } = string.Empty;
        
        [Required]
        [Phone]
        public string Phone { get; set; } = string.Empty;
        
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;
        
        [Required]
        public string Address { get; set; } = string.Empty;
        
        public string? PreviousSchool { get; set; }
        public string? Remarks { get; set; }
    }

    public class UpdateAdmissionApplicationDto
    {
        public string? StudentName { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? Gender { get; set; }
        public string? Class { get; set; }
        public string? Section { get; set; }
        public string? FatherName { get; set; }
        public string? MotherName { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? Address { get; set; }
        public string? Remarks { get; set; }
    }

    public class UpdateApplicationStatusDto
    {
        [Required]
        public string Status { get; set; } = string.Empty;
        
        public string? Remarks { get; set; }
        public Guid? UpdatedBy { get; set; }
    }

    public class ScheduleInterviewDto
    {
        [Required]
        public DateTime InterviewDate { get; set; }
        
        public TimeSpan? InterviewTime { get; set; }
        
        public string? Venue { get; set; }
        public string? InterviewerName { get; set; }
        public Guid? InterviewerId { get; set; }
        public string? Instructions { get; set; }
        
        public string? Notes { get; set; }
    }

    public class ApproveApplicationDto
    {
        [Required]
        public Guid ApprovedBy { get; set; }
        
        public string? Class { get; set; }
        public string? Section { get; set; }
        public string? ApprovalNotes { get; set; }
        public DateTime? AdmissionDate { get; set; }
    }

    public class RejectApplicationDto
    {
        [Required]
        public Guid RejectedBy { get; set; }
        
        [Required]
        public string RejectionReason { get; set; } = string.Empty;
        
        public string? Reason { get; set; }
    }

    public class EnrollApplicationDto
    {
        [Required]
        public Guid ApplicationId { get; set; }
        
        [Required]
        public Guid ClassId { get; set; }
        
        [Required]
        public Guid SectionId { get; set; }
        
        [Required]
        public DateTime AdmissionDate { get; set; }
        
        public string? AdmissionNumber { get; set; }
        
        [MaxLength(10)]
        public string? Section { get; set; }
        
        public string? RollNumber { get; set; }
        public Guid? EnrolledBy { get; set; }
    }

    // ========== ADMISSIONS FILTER DTOs ==========
    
    public class AdmissionsFiltersDto
    {
        public string? Status { get; set; }
        public string? Class { get; set; }
        public DateTime? DateFrom { get; set; }
        public DateTime? DateTo { get; set; }
        public string? SearchQuery { get; set; }
    }
}
