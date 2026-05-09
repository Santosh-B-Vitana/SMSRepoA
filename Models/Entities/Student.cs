using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    public class Student : BaseEntity
    {
        // Multi-tenancy
        [Required]
        public Guid SchoolId { get; set; }
        
        // Basic Information
        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;
        
        [MaxLength(100)]
        public string? FirstName { get; set; }
        
        [MaxLength(100)]
        public string? MiddleName { get; set; }
        
        [MaxLength(100)]
        public string? LastName { get; set; }
        
        [MaxLength(100)]
        public string? PreferredName { get; set; }
        
        [MaxLength(50)]
        public string? AdmissionNumber { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string Class { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(10)]
        public string Section { get; set; } = string.Empty;
        
        [MaxLength(20)]
        public string? RollNumber { get; set; }
        
        [Required]
        public DateTime DateOfBirth { get; set; }
        
        [MaxLength(100)]
        public string? PlaceOfBirth { get; set; }
        
        [MaxLength(10)]
        public string? Gender { get; set; }
        
        public string? Nationality { get; set; } // JSON array
        
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "active";
        
        [Required]
        public DateTime AdmissionDate { get; set; }
        
        [MaxLength(500)]
        public string? PhotoUrl { get; set; }
        
        // ─── Government / UDISE / Board Identifiers ──────────────────────────────
        // PEN (Permanent Education Number) — mandatory for UDISE+ / DISE reporting.
        [MaxLength(20)]
        public string? PenNumber { get; set; }
        
        // UDISE student-level unique identifier (some states issue one).
        [MaxLength(20)]
        public string? UDISENumber { get; set; }
        
        // Board exam roll number (CBSE/ICSE external).
        [MaxLength(30)]
        public string? BoardRollNumber { get; set; }
        
        // ─── Admission / Registration ─────────────────────────────────────────────
        [MaxLength(50)]
        public string? RegistrationNumber { get; set; }
        
        [MaxLength(50)]
        public string? EnrollmentNumber { get; set; }
        
        // Accounting ledger reference — used by finance module for fee reconciliation.
        [MaxLength(30)]
        public string? LedgerNumber { get; set; }
        
        [MaxLength(50)]
        public string? ApplicationFormNumber { get; set; }
        
        [MaxLength(500)]
        public string? ReasonToApply { get; set; }
        
        [MaxLength(200)]
        public string? KnownAboutSchoolBy { get; set; }
        
        // Identification (Indian Government IDs)
        [MaxLength(14)]
        public string? AadharNumber { get; set; } // XXXX-XXXX-XXXX
        
        [MaxLength(10)]
        public string? PanNumber { get; set; } // ABCDE1234F
        
        [MaxLength(20)]
        public string? PassportNumber { get; set; }
        
        [MaxLength(50)]
        public string? VisaType { get; set; }
        
        public DateTime? VisaExpiry { get; set; }
        
        // RationCard (relevant for BPL / scholarship eligibility checks).
        [MaxLength(20)]
        public string? RationCardNumber { get; set; }
        
        // Contact Information
        [Required]
        public string Address { get; set; } = string.Empty; // Current/Local
        
        public string? PermanentAddress { get; set; }
        
        [MaxLength(20)]
        public string? PrimaryPhone { get; set; }
        
        [MaxLength(20)]
        public string? SecondaryPhone { get; set; }
        
        [MaxLength(255)]
        [EmailAddress]
        public string? Email { get; set; }
        
        // Primary Guardian (backward compatibility)
        [Required]
        [MaxLength(200)]
        public string GuardianName { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(20)]
        public string GuardianPhone { get; set; } = string.Empty;
        
        // Academic History
        [MaxLength(200)]
        public string? PreviousSchool { get; set; }
        
        [MaxLength(20)]
        public string? PreviousClass { get; set; }
        
        [MaxLength(100)]
        public string? PreviousSchoolPlace { get; set; }
        
        [MaxLength(100)]
        public string? PreviousSchoolBoard { get; set; }   // e.g. CBSE, ICSE, State Board
        
        [MaxLength(10)]
        public string? PreviousSchoolYearOfPassing { get; set; }
        
        [MaxLength(20)]
        public string? PreviousSchoolPercentage { get; set; }
        
        [MaxLength(100)]
        public string? PreviousSchoolMedium { get; set; }  // English, Hindi, etc.
        
        public string? TransferReason { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string Category { get; set; } = "General"; // General, OBC, SC, ST
        
        [MaxLength(100)]
        public string? SubCaste { get; set; }
        
        // DISE-specific demographic flags
        public bool IsMinority { get; set; } = false;
        public bool IsBPL { get; set; } = false;            // Below Poverty Line
        public bool IsDifferentlyAbled { get; set; } = false;
        
        [MaxLength(100)]
        public string? DifferentlyAbledType { get; set; }   // Visual/Hearing/Locomotor etc.
        
        [MaxLength(10)]
        public string? DifferentlyAbledPercentage { get; set; }
        
        // Cultural Information
        [MaxLength(50)]
        public string? Religion { get; set; }
        
        [MaxLength(50)]
        public string? Caste { get; set; }
        
        [MaxLength(100)]
        public string? MotherTongue { get; set; }
        
        // Medical Information
        [MaxLength(5)]
        public string? BloodGroup { get; set; }
        
        public string? Allergies { get; set; }
        
        public string? ChronicConditions { get; set; }
        
        public string? Medications { get; set; }
        
        [MaxLength(200)]
        public string? EmergencyContact { get; set; }
        
        [MaxLength(20)]
        public string? EmergencyPhone { get; set; }
        
        [MaxLength(200)]
        public string? DoctorName { get; set; }
        
        [MaxLength(20)]
        public string? DoctorPhone { get; set; }
        
        // Consent Flags
        public bool PhotoConsent { get; set; } = false;
        public bool MediaConsent { get; set; } = false;
        public bool MedicalConsent { get; set; } = false;
        
        // Additional
        public string? LanguageProficiency { get; set; } // JSON array
        
        public string? SpecialNeeds { get; set; }
        
        public bool TransportRequired { get; set; } = false;
        public bool HostelRequired { get; set; } = false;
        
        // ─── Transport / Commute ──────────────────────────────────────────────────
        // How the student comes to school — foot, school-bus, parent-drop, rickshaw, etc.
        [MaxLength(50)]
        public string? CommunicationMode { get; set; }
        
        // ─── Extracurricular ──────────────────────────────────────────────────────
        public bool IsNCCCadet { get; set; } = false;
        
        [MaxLength(500)]
        public string? NCCDetails { get; set; }
        
        public string? ExtraCurricularActivities { get; set; } // free-text / JSON list
        
        // ─── Report Card remarks ──────────────────────────────────────────────────
        // Stored on the student so they pre-populate report card generation.
        public string? ProgressReportRemarks { get; set; }
        
        public string? ProgressReportRemarksCBSE { get; set; }
        
        // ─── Character Certificate ────────────────────────────────────────────────
        public bool IsCharacterCertificateIssued { get; set; } = false;
        
        [MaxLength(50)]
        public string? CharacterCertificateNumber { get; set; }
        
        // Siblings (kept for backward compat; new code uses StudentSibling table)
        public string? SiblingIds { get; set; }
        
        // Status flag
        public bool IsActive { get; set; } = true;

        // === PUR Identity Model — Phase 2 migration path ===
        // PersonId is nullable to remain fully backward compatible.
        // New records should populate this FK. Old records keep PersonId = null.
        public Guid? PersonId { get; set; }

        // Navigation properties
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }

        [ForeignKey("PersonId")]
        public virtual Person? Person { get; set; }
        
        public virtual ICollection<StudentGuardian>? Guardians { get; set; }
        public virtual ICollection<StudentDocument>? Documents { get; set; }
        public virtual ICollection<StudentSibling>? Siblings { get; set; }
        public virtual ICollection<StudentAnnualHealth>? AnnualHealthRecords { get; set; }
        public virtual ICollection<StudentHobbyEnrollment>? HobbyEnrollments { get; set; }
        public virtual ICollection<StudentPermissionSlip>? PermissionSlips { get; set; }
        public virtual TransferCertificate? TransferCertificate { get; set; }
    }
    
    public class StudentGuardian : BaseEntity
    {
        public Guid StudentId { get; set; }
        
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;
        
        [MaxLength(100)]
        public string? Surname { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string Relation { get; set; } = string.Empty; // father, mother, guardian, other
        
        [MaxLength(100)]
        public string? Qualification { get; set; }
        
        [MaxLength(100)]
        public string? Occupation { get; set; }
        
        [MaxLength(50)]
        public string? EmploymentType { get; set; }  // Govt, Private, Self-employed, etc.
        
        [MaxLength(200)]
        public string? Employer { get; set; }
        
        [MaxLength(200)]
        public string? OfficeAddress { get; set; }
        
        [MaxLength(20)]
        public string? OfficePhone { get; set; }
        
        [MaxLength(255)]
        [EmailAddress]
        public string? OfficeEmail { get; set; }
        
        [MaxLength(100)]
        public string? AnnualIncome { get; set; }
        
        public DateTime? DateOfBirth { get; set; }
        
        [MaxLength(200)]
        public string? ResidentialAddress { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string Phone { get; set; } = string.Empty;
        
        [MaxLength(20)]
        public string? HomePhone { get; set; }
        
        [MaxLength(255)]
        [EmailAddress]
        public string? Email { get; set; }
        
        [MaxLength(14)]
        public string? AadharNumber { get; set; }
        
        [MaxLength(10)]
        public string? PanNumber { get; set; }
        
        [MaxLength(20)]
        public string? PassportNumber { get; set; }
        
        [MaxLength(500)]
        public string? PhotoUrl { get; set; }
        
        // Whether parent has app login access
        public bool HasPortalAccess { get; set; } = false;
        
        public Guid? UserLoginId { get; set; }
        
        [ForeignKey("StudentId")]
        public virtual Student? Student { get; set; }
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
    }
    
    public class StudentDocument : BaseEntity
    {
        public Guid StudentId { get; set; }
        
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string DocumentType { get; set; } = string.Empty;
        // birthCertificate, aadharCard, tcFromPreviousSchool, medicalCertificate,
        // incomeCertificate, casteCertificate, photo, other
        
        [Required]
        [MaxLength(500)]
        public string FileUrl { get; set; } = string.Empty;
        
        [MaxLength(200)]
        public string? FileName { get; set; }
        
        [MaxLength(100)]
        public string? DocumentNumber { get; set; }   // e.g. Aadhar number, TC number
        
        [MaxLength(200)]
        public string? IssuingAuthority { get; set; } // e.g. CBSE, Municipality
        
        public DateTime? IssueDate { get; set; }
        
        public DateTime? ExpiryDate { get; set; }
        
        // none | pending | verified | rejected
        [MaxLength(20)]
        public string VerificationStatus { get; set; } = "none";
        
        public DateTime? VerifiedAt { get; set; }
        
        public Guid? VerifiedBy { get; set; }  // Staff Id
        
        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
        
        [ForeignKey("StudentId")]
        public virtual Student? Student { get; set; }
    }

    // ─── StudentSibling ───────────────────────────────────────────────────────────
    // Replaces the JSON SiblingIds array on Student.
    // Bidirectional: if A→B exists, B→A also exists.  The service enforces symmetry.
    public class StudentSibling : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public Guid StudentId { get; set; }
        
        [Required]
        public Guid SiblingId { get; set; }

        [ForeignKey("StudentId")]
        public virtual Student? Student { get; set; }

        [ForeignKey("SiblingId")]
        public virtual Student? Sibling { get; set; }
    }

    // ─── StudentAnnualHealth ──────────────────────────────────────────────────────
    // Per-academic-year physical health snapshot (weight, height, vision, dental).
    // Distinct from the general HealthRecord used by the clinic module.
    public class StudentAnnualHealth : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public Guid StudentId { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string AcademicYear { get; set; } = string.Empty; // e.g. "2024-25"
        
        [MaxLength(10)]
        public string? Weight { get; set; }        // kg
        
        [MaxLength(10)]
        public string? Height { get; set; }        // cm
        
        [MaxLength(20)]
        public string? VisionLeft { get; set; }    // e.g. 6/6, 6/9
        
        [MaxLength(20)]
        public string? VisionRight { get; set; }
        
        [MaxLength(50)]
        public string? DentalHygiene { get; set; } // Good, Fair, Poor, Requires Treatment
        
        [MaxLength(500)]
        public string? Remarks { get; set; }
        
        public DateTime ExaminedOn { get; set; } = DateTime.UtcNow;
        
        [MaxLength(200)]
        public string? ExaminedBy { get; set; }    // Doctor / nurse name

        [ForeignKey("StudentId")]
        public virtual Student? Student { get; set; }
    }

    // ─── Hobby (master) ──────────────────────────────────────────────────────────
    // Reusable hobby/club master list per school.
    public class Hobby : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;
        
        // Club | Hobby | Sport | Cultural | Other
        [MaxLength(50)]
        public string? Category { get; set; }
        
        public bool IsActive { get; set; } = true;
    }

    // ─── StudentHobbyEnrollment ───────────────────────────────────────────────────
    // Links a student to a hobby/club for a given academic year.
    public class StudentHobbyEnrollment : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public Guid StudentId { get; set; }
        
        [Required]
        public Guid HobbyId { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string AcademicYear { get; set; } = string.Empty;
        
        [MaxLength(500)]
        public string? Remarks { get; set; }

        [ForeignKey("StudentId")]
        public virtual Student? Student { get; set; }

        [ForeignKey("HobbyId")]
        public virtual Hobby? Hobby { get; set; }
    }

    // ─── StudentPermissionSlip ────────────────────────────────────────────────────
    // Records an early-exit / outing request and its approval status.
    // On approval the service triggers SMS + push notification to guardian.
    public class StudentPermissionSlip : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public Guid StudentId { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string AcademicYear { get; set; } = string.Empty;
        
        // Who the student is going out with (guardian name / authorized person)
        [MaxLength(200)]
        public string? OutWith { get; set; }
        
        [MaxLength(50)]
        public string? OutWithRelation { get; set; } // father, mother, uncle, etc.
        
        [MaxLength(500)]
        public string? Reason { get; set; }
        
        public DateTime OutDate { get; set; }
        
        [MaxLength(10)]
        public string? OutTime { get; set; }
        
        // pending | approved | rejected
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "pending";
        
        public Guid IssuedBy { get; set; }  // Staff ID who created the slip
        
        public Guid? ApprovedBy { get; set; } // Staff ID who approved/rejected
        
        public DateTime? ReviewedAt { get; set; }
        
        [MaxLength(500)]
        public string? ReviewRemarks { get; set; }

        [ForeignKey("StudentId")]
        public virtual Student? Student { get; set; }
    }

    // ─── TransferCertificate ──────────────────────────────────────────────────────
    // TC is a legal document in India; schools must maintain a register.
    // One per student — auto-incremented TC number per school.
    public class TransferCertificate : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public Guid StudentId { get; set; }
        
        [MaxLength(30)]
        public string? TCNumber { get; set; }       // Auto-generated or manual
        
        public int? AutoTCNumber { get; set; }       // Sequence within school
        
        [MaxLength(10)]
        public string? TCNumberPrefix { get; set; }
        
        public DateTime? ApplicationDate { get; set; }
        
        public DateTime? IssuedDate { get; set; }
        
        [MaxLength(20)]
        public string? ExitAcademicYear { get; set; }
        
        [MaxLength(100)]
        public string? ExitClass { get; set; }
        
        [MaxLength(20)]
        public string? ExitSection { get; set; }
        
        [MaxLength(500)]
        public string? ReasonForLeaving { get; set; }
        
        // TC Register legally required fields
        [MaxLength(100)]
        public string? Conduct { get; set; }        // Good, Satisfactory, etc.
        
        public bool IsTCIssued { get; set; } = false;
        
        public bool IsFailedInLastClass { get; set; } = false;
        
        [MaxLength(100)]
        public string? LastAnnualExamResult { get; set; }
        
        public bool IsQualifiedForHigherClass { get; set; } = false;
        
        [MaxLength(100)]
        public string? QualifiedToClass { get; set; }
        
        [MaxLength(200)]
        public string? DetainedInSameClass { get; set; }
        
        [MaxLength(100)]
        public string? DatePupilStruck { get; set; }   // date removed from register
        
        public string? AdditionalRemarks { get; set; }
        
        // Auto-generated CC (Character Certificate) tracking
        public bool IsCharacterCertificateIssued { get; set; } = false;
        
        [MaxLength(50)]
        public string? CharacterCertificateNumber { get; set; }
        
        public Guid? IssuedBy { get; set; }  // Staff ID

        [ForeignKey("StudentId")]
        public virtual Student? Student { get; set; }
    }
}

