using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    public class Book : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        [MaxLength(500)]
        public string Title { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(255)]
        public string Author { get; set; } = string.Empty;
        
        [MaxLength(20)]
        public string? ISBN { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string Category { get; set; } = string.Empty;
        
        [MaxLength(255)]
        public string? Publisher { get; set; }
        
        public int? PublishedYear { get; set; }
        
        public int TotalCopies { get; set; } = 1;
        
        public int AvailableCopies { get; set; } = 1;
        
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "available";
        
        [MaxLength(100)]
        public string? Location { get; set; }
        
        [MaxLength(500)]
        public string? CoverImageUrl { get; set; }
        
        public string? Description { get; set; }
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
    }

    public class BookIssue : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public Guid BookId { get; set; }
        
        [Required]
        public Guid StudentId { get; set; }
        
        [Required]
        public DateTime IssueDate { get; set; }
        
        [Required]
        public DateTime DueDate { get; set; }
        
        public DateTime? ReturnDate { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "issued";
        
        [Column(TypeName = "decimal(10,2)")]
        public decimal Fine { get; set; } = 0;
        
        public bool FinePaid { get; set; } = false;
        
        public Guid? IssuedBy { get; set; }
        
        public Guid? ReturnedTo { get; set; }
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
        
        [ForeignKey("BookId")]
        public virtual Book? Book { get; set; }
        
        [ForeignKey("StudentId")]
        public virtual Student? Student { get; set; }
    }
}
