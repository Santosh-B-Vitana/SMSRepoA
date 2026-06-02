using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    // ========== BOOK ==========
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

        public virtual ICollection<BookReservation> Reservations { get; set; } = new List<BookReservation>();
    }

    // ========== BOOK ISSUE ==========
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

    // ========== BOOK RESERVATION ==========
    public class BookReservation : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        public Guid BookId { get; set; }

        [Required]
        public Guid MemberId { get; set; }

        [Required]
        [MaxLength(20)]
        public string MemberType { get; set; } = "student"; // student / staff

        [Required]
        public DateTime ReservedAt { get; set; }

        [Required]
        public DateTime ExpiresAt { get; set; }

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "pending"; // pending / fulfilled / cancelled / expired

        [MaxLength(500)]
        public string? Notes { get; set; }

        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }

        [ForeignKey("BookId")]
        public virtual Book? Book { get; set; }
    }

    // ========== PERIODICAL ==========
    public class Periodical : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        [MaxLength(300)]
        public string Title { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Type { get; set; } = "magazine"; // magazine / newspaper / journal

        [MaxLength(50)]
        public string? Frequency { get; set; } // daily / weekly / monthly / quarterly

        [MaxLength(255)]
        public string? Publisher { get; set; }

        [MaxLength(20)]
        public string? ISSN { get; set; }

        public DateTime? SubscriptionStart { get; set; }

        public DateTime? SubscriptionEnd { get; set; }

        [Column(TypeName = "decimal(10,2)")]
        public decimal? AnnualCost { get; set; }

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "active"; // active / expired / cancelled

        public string? Notes { get; set; }

        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
    }

    // ========== LIBRARY MEMBER ==========
    public class LibraryMember : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        [MaxLength(20)]
        public string MemberType { get; set; } = "student"; // student / staff

        [Required]
        public Guid MemberId { get; set; } // StudentId or StaffMemberId

        [Required]
        [MaxLength(50)]
        public string CardNumber { get; set; } = string.Empty;

        [Required]
        public DateTime ValidFrom { get; set; }

        [Required]
        public DateTime ValidTo { get; set; }

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "active"; // active / expired / suspended

        public int MaxBooksAllowed { get; set; } = 3;

        public int LoanDays { get; set; } = 14;

        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
    }
}
