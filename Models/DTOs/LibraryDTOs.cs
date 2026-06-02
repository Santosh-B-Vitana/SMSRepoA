using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SmsApi.Models.DTOs
{
    // Library Book Basic DTO - Lightweight version for list views
    public class BookBasicDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Author { get; set; }
        public string ISBN { get; set; } = string.Empty;
        public int AvailableCopies { get; set; }
        public int TotalCopies { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    // Library Book DTOs
    public class CreateBookRequest
    {
        // SchoolId is injected from tenant context in the controller, not from the request body
        public Guid SchoolId { get; set; }

        [Required]
        [MaxLength(500)]
        public string Title { get; set; } = string.Empty;

        [Required]
        [MaxLength(255)]
        public string Author { get; set; } = string.Empty;

        [MaxLength(20)]
        public string? ISBN { get; set; }

        [MaxLength(255)]
        public string? Publisher { get; set; }

        public int? PublishedYear { get; set; }

        [MaxLength(100)]
        public string? Category { get; set; }

        [MaxLength(100)]
        public string? Location { get; set; }

        public string? Description { get; set; }

        [Required]
        public int TotalCopies { get; set; }

        public int AvailableCopies { get; set; }

        [MaxLength(20)]
        public string Status { get; set; } = "available";
    }

    public class BookResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Author { get; set; }
        public string? ISBN { get; set; }
        public string? Publisher { get; set; }
        public int? PublishedYear { get; set; }
        public string? Category { get; set; }
        public string? Location { get; set; }
        public string? Description { get; set; }
        public int TotalCopies { get; set; }
        public int AvailableCopies { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    // Book Issue DTOs
    public class CreateBookIssueRequest
    {
        // SchoolId injected by controller
        public Guid SchoolId { get; set; }

        [Required]
        public Guid BookId { get; set; }

        [Required]
        public Guid StudentId { get; set; }

        [Required]
        public DateTime IssueDate { get; set; }

        [Required]
        public DateTime DueDate { get; set; }
    }

    public class BookIssueResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid BookId { get; set; }
        public string BookTitle { get; set; } = string.Empty;
        public string? BookIsbn { get; set; }
        public Guid StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string? StudentClass { get; set; }
        public string? StudentSection { get; set; }
        public string? StudentAdmissionNumber { get; set; }
        public DateTime IssueDate { get; set; }
        public DateTime DueDate { get; set; }
        public DateTime? ReturnDate { get; set; }
        public string Status { get; set; } = string.Empty;
        public decimal Fine { get; set; }
        public bool FinePaid { get; set; }
        public int DaysOverdue { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class LibraryListResponse
    {
        public List<BookResponse> Books { get; set; } = new();
        public int Total { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }

    public class BookIssueListResponse
    {
        public List<BookIssueResponse> Issues { get; set; } = new();
        public int Total { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }

    public class LibraryStatsResponse
    {
        public int TotalTitles { get; set; }
        public int TotalCopies { get; set; }
        public int AvailableCopies { get; set; }
        public int IssuedCopies { get; set; }
        public int OverdueCount { get; set; }
        public decimal TotalFinesPending { get; set; }
        public int TotalIssuedToday { get; set; }
        public int TotalReturnedToday { get; set; }
    }

    public class MarkFinePaidRequest
    {
        public bool Paid { get; set; } = true;
    }

    // ── P1: Book Reservation DTOs ─────────────────────────────────────────────

    public class CreateBookReservationRequest
    {
        [Required] public Guid BookId { get; set; }
        [Required] public Guid MemberId { get; set; }
        [Required] [MaxLength(20)] public string MemberType { get; set; } = "student";
        [MaxLength(500)] public string? Notes { get; set; }
    }

    public class BookReservationResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid BookId { get; set; }
        public string BookTitle { get; set; } = string.Empty;
        public Guid MemberId { get; set; }
        public string MemberName { get; set; } = string.Empty;
        public string MemberType { get; set; } = "student";
        public DateTime ReservedAt { get; set; }
        public DateTime ExpiresAt { get; set; }
        public string Status { get; set; } = "pending";
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    // ── P1: Periodical DTOs ───────────────────────────────────────────────────

    public class CreatePeriodicalRequest
    {
        [Required] [MaxLength(300)] public string Title { get; set; } = string.Empty;
        [Required] [MaxLength(50)] public string Type { get; set; } = "magazine";
        [MaxLength(50)] public string? Frequency { get; set; }
        [MaxLength(255)] public string? Publisher { get; set; }
        [MaxLength(20)] public string? ISSN { get; set; }
        public DateTime? SubscriptionStart { get; set; }
        public DateTime? SubscriptionEnd { get; set; }
        public decimal? AnnualCost { get; set; }
        public string? Notes { get; set; }
    }

    public class PeriodicalResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Type { get; set; } = "magazine";
        public string? Frequency { get; set; }
        public string? Publisher { get; set; }
        public string? ISSN { get; set; }
        public DateTime? SubscriptionStart { get; set; }
        public DateTime? SubscriptionEnd { get; set; }
        public decimal? AnnualCost { get; set; }
        public string Status { get; set; } = "active";
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    // ── P1: Library Member DTOs ───────────────────────────────────────────────

    public class CreateLibraryMemberRequest
    {
        [Required] [MaxLength(20)] public string MemberType { get; set; } = "student";
        [Required] public Guid MemberId { get; set; }
        public DateTime? ValidFrom { get; set; }
        public DateTime? ValidTo { get; set; }
        public int MaxBooksAllowed { get; set; } = 3;
        public int LoanDays { get; set; } = 14;
    }

    public class UpdateLibraryMemberRequest
    {
        public DateTime? ValidFrom { get; set; }
        public DateTime? ValidTo { get; set; }
        public int? MaxBooksAllowed { get; set; }
        public int? LoanDays { get; set; }
    }

    public class LibraryMemberResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string MemberType { get; set; } = "student";
        public Guid MemberId { get; set; }
        public string MemberName { get; set; } = string.Empty;
        public string CardNumber { get; set; } = string.Empty;
        public DateTime ValidFrom { get; set; }
        public DateTime ValidTo { get; set; }
        public string Status { get; set; } = "active";
        public int MaxBooksAllowed { get; set; }
        public int LoanDays { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    // ── P1: Overdue Alert ─────────────────────────────────────────────────────

    public class OverdueBookResponse
    {
        public Guid IssueId { get; set; }
        public Guid BookId { get; set; }
        public string BookTitle { get; set; } = string.Empty;
        public Guid StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public DateTime DueDate { get; set; }
        public int DaysOverdue { get; set; }
        public decimal AccruedFine { get; set; }
    }
}

