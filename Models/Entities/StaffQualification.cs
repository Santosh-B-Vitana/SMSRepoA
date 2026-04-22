using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    public class StaffQualification : BaseEntity
    {
        [Required]
        public Guid StaffId { get; set; }
        
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        [MaxLength(20)]
        public string QualificationType { get; set; } = string.Empty; // degree, diploma, certificate

        [Required]
        [MaxLength(200)]
        public string DegreeName { get; set; } = string.Empty;

        [Required]
        [MaxLength(300)]
        public string InstitutionName { get; set; } = string.Empty;

        [MaxLength(200)]
        public string? UniversityBoard { get; set; }

        [MaxLength(100)]
        public string? Specialization { get; set; }

        [Required]
        public int YearOfPassing { get; set; }

        [MaxLength(20)]
        public string? Grade { get; set; }

        public decimal? Percentage { get; set; }

        [MaxLength(500)]
        public string? CertificateUrl { get; set; }

        [MaxLength(500)]
        public string? Remarks { get; set; }

        [ForeignKey("StaffId")]
        public virtual Staff? Staff { get; set; }
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
    }
}
