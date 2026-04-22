using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SmsApi.Services
{
    public interface ILibraryService
    {
        Task<LibraryListResponse> GetBooksAsync(Guid schoolId, int page = 1, int pageSize = 20, string? search = null, string? category = null, string? status = null);
        Task<BookResponse?> GetBookByIdAsync(Guid id, Guid schoolId);
        Task<BookResponse> CreateBookAsync(CreateBookRequest request);
        Task<BookResponse?> UpdateBookAsync(Guid id, Guid schoolId, CreateBookRequest request);
        Task<bool> DeleteBookAsync(Guid id, Guid schoolId);
        Task<BookIssueListResponse> GetBookIssuesAsync(Guid schoolId, int page = 1, int pageSize = 20, Guid? bookId = null, Guid? studentId = null, string? status = null);
        Task<BookIssueResponse?> GetBookIssueByIdAsync(Guid id, Guid schoolId);
        Task<BookIssueResponse> IssueBookAsync(CreateBookIssueRequest request);
        Task<BookIssueResponse?> ReturnBookAsync(Guid id, Guid schoolId);
        Task<BookIssueResponse?> MarkFinePaidAsync(Guid id, Guid schoolId);
        Task<LibraryStatsResponse> GetStatsAsync(Guid schoolId);
    }

    public class LibraryService : ILibraryService
    {
        private readonly AppDbContext _context;
        // Fine rate: â‚¹2 per day overdue
        private const decimal FinePerDay = 2m;

        public LibraryService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<LibraryListResponse> GetBooksAsync(Guid schoolId, int page = 1, int pageSize = 20, string? search = null, string? category = null, string? status = null)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 20;
            if (pageSize > 200) pageSize = 200;

            var query = _context.Books.Where(b => b.SchoolId == schoolId);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.ToLower();
                query = query.Where(b =>
                    b.Title.ToLower().Contains(s) ||
                    (b.Author != null && b.Author.ToLower().Contains(s)) ||
                    (b.ISBN != null && b.ISBN.Contains(search)) ||
                    (b.Publisher != null && b.Publisher.ToLower().Contains(s)));
            }

            if (!string.IsNullOrWhiteSpace(category) && category != "all")
                query = query.Where(b => b.Category == category);

            if (!string.IsNullOrWhiteSpace(status) && status != "all")
                query = query.Where(b => b.Status == status);

            var total = await query.CountAsync();
            var books = await query
                .OrderBy(b => b.Title)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new LibraryListResponse
            {
                Books = books.Select(MapToResponse).ToList(),
                Total = total,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<BookResponse?> GetBookByIdAsync(Guid id, Guid schoolId)
        {
            var book = await _context.Books.FirstOrDefaultAsync(b => b.Id == id && b.SchoolId == schoolId);
            return book == null ? null : MapToResponse(book);
        }

        public async Task<BookResponse> CreateBookAsync(CreateBookRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Author))
                throw new ArgumentException("Book author is required.");
            if (string.IsNullOrWhiteSpace(request.Title))
                throw new ArgumentException("Book title is required.");
            if (request.TotalCopies <= 0)
                throw new ArgumentException("TotalCopies must be greater than zero.");
            var effectiveAvailable = request.AvailableCopies > 0 ? request.AvailableCopies : request.TotalCopies;
            if (effectiveAvailable > request.TotalCopies)
                throw new ArgumentException("AvailableCopies cannot exceed TotalCopies.");
            if (request.SchoolId == Guid.Empty)
                throw new ArgumentException("SchoolId is required.");

            // Validate ISBN uniqueness within school if provided
            if (!string.IsNullOrWhiteSpace(request.ISBN))
            {
                var exists = await _context.Books.AnyAsync(b => b.SchoolId == request.SchoolId && b.ISBN == request.ISBN);
                if (exists)
                    throw new InvalidOperationException($"A book with ISBN '{request.ISBN}' already exists in this library.");
            }

            var book = new Book
            {
                Id = Guid.NewGuid(),
                SchoolId = request.SchoolId,
                Title = request.Title,
                Author = request.Author,
                ISBN = request.ISBN,
                Publisher = request.Publisher,
                PublishedYear = request.PublishedYear,
                Category = request.Category ?? "General",
                Location = request.Location,
                Description = request.Description,
                TotalCopies = request.TotalCopies,
                AvailableCopies = effectiveAvailable,
                Status = DeriveStatus(request.TotalCopies, effectiveAvailable),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Books.Add(book);
            await _context.SaveChangesAsync();
            return MapToResponse(book);
        }

        public async Task<BookResponse?> UpdateBookAsync(Guid id, Guid schoolId, CreateBookRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Title))
                throw new ArgumentException("Book title is required.");
            if (request.TotalCopies <= 0)
                throw new ArgumentException("TotalCopies must be greater than zero.");
            if (request.AvailableCopies > request.TotalCopies)
                throw new ArgumentException("AvailableCopies cannot exceed TotalCopies.");

            var book = await _context.Books.FirstOrDefaultAsync(b => b.Id == id && b.SchoolId == schoolId);
            if (book == null) return null;

            // Ensure new TotalCopies isn't below currently issued count
            var issuedCount = await _context.BookIssues.CountAsync(bi => bi.BookId == id && bi.Status == "issued");
            if (request.TotalCopies < issuedCount)
                throw new InvalidOperationException($"Cannot reduce TotalCopies to {request.TotalCopies}; {issuedCount} copies are currently issued.");

            // ISBN uniqueness check (exclude self)
            if (!string.IsNullOrWhiteSpace(request.ISBN) && request.ISBN != book.ISBN)
            {
                var exists = await _context.Books.AnyAsync(b => b.SchoolId == schoolId && b.ISBN == request.ISBN && b.Id != id);
                if (exists)
                    throw new InvalidOperationException($"A book with ISBN '{request.ISBN}' already exists in this library.");
            }

            book.Title = request.Title;
            book.Author = request.Author;
            book.ISBN = request.ISBN;
            book.Publisher = request.Publisher;
            book.PublishedYear = request.PublishedYear;
            book.Category = request.Category ?? book.Category;
            book.Location = request.Location;
            book.Description = request.Description;
            book.TotalCopies = request.TotalCopies;
            book.AvailableCopies = request.AvailableCopies;
            book.Status = DeriveStatus(request.TotalCopies, request.AvailableCopies);
            book.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return MapToResponse(book);
        }

        public async Task<bool> DeleteBookAsync(Guid id, Guid schoolId)
        {
            var book = await _context.Books.FirstOrDefaultAsync(b => b.Id == id && b.SchoolId == schoolId);
            if (book == null) return false;

            // Check for active issues before deleting
            var hasActiveIssues = await _context.BookIssues.AnyAsync(bi => bi.BookId == id && bi.Status == "issued");
            if (hasActiveIssues)
                throw new InvalidOperationException("Cannot delete a book that has active issues.");

            book.IsDeleted = true;
            book.DeletedAt = DateTime.UtcNow;
            book.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<BookIssueListResponse> GetBookIssuesAsync(Guid schoolId, int page = 1, int pageSize = 20, Guid? bookId = null, Guid? studentId = null, string? status = null)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 20;
            if (pageSize > 200) pageSize = 200;

            var query = _context.BookIssues
                .Include(bi => bi.Book)
                .Include(bi => bi.Student)
                .Where(bi => bi.SchoolId == schoolId);

            if (bookId.HasValue)
                query = query.Where(bi => bi.BookId == bookId.Value);

            if (studentId.HasValue)
                query = query.Where(bi => bi.StudentId == studentId.Value);

            if (!string.IsNullOrWhiteSpace(status) && status != "all")
                query = query.Where(bi => bi.Status == status);

            var total = await query.CountAsync();
            var issues = await query
                .OrderByDescending(bi => bi.IssueDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            // Auto-mark overdue
            var today = DateTime.UtcNow.Date;
            foreach (var issue in issues.Where(i => i.Status == "issued" && i.DueDate.Date < today))
            {
                issue.Status = "overdue";
                issue.Fine = (today - issue.DueDate.Date).Days * FinePerDay;
            }
            if (issues.Any(i => i.Status == "overdue"))
                await _context.SaveChangesAsync();

            return new BookIssueListResponse
            {
                Issues = issues.Select(MapToIssueResponse).ToList(),
                Total = total,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<BookIssueResponse?> GetBookIssueByIdAsync(Guid id, Guid schoolId)
        {
            var issue = await _context.BookIssues
                .Include(bi => bi.Book)
                .Include(bi => bi.Student)
                .FirstOrDefaultAsync(bi => bi.Id == id && bi.SchoolId == schoolId);
            return issue == null ? null : MapToIssueResponse(issue);
        }

        public async Task<BookIssueResponse> IssueBookAsync(CreateBookIssueRequest request)
        {
            if (request.BookId == Guid.Empty)
                throw new ArgumentException("BookId is required.");
            if (request.StudentId == Guid.Empty)
                throw new ArgumentException("StudentId is required.");
            if (request.DueDate == default)
                throw new ArgumentException("DueDate is required.");
            var effectiveIssueDate = request.IssueDate == default ? DateTime.UtcNow : request.IssueDate;
            if (request.DueDate.Date <= effectiveIssueDate.Date)
                throw new ArgumentException("DueDate must be after IssueDate.");
            if (request.DueDate.Date < DateTime.UtcNow.Date)
                throw new ArgumentException("DueDate cannot be in the past.");

            var book = await _context.Books.FirstOrDefaultAsync(b => b.Id == request.BookId && b.SchoolId == request.SchoolId);
            if (book == null)
                throw new InvalidOperationException("Book not found.");
            if (book.AvailableCopies <= 0)
                throw new InvalidOperationException("No available copies for this book.");

            var duplicate = await _context.BookIssues.AnyAsync(bi =>
                bi.SchoolId == request.SchoolId &&
                bi.StudentId == request.StudentId &&
                bi.BookId == request.BookId &&
                bi.Status == "issued");
            if (duplicate)
                throw new InvalidOperationException("Student already has this book issued.");

            var activeCount = await _context.BookIssues.CountAsync(bi =>
                bi.SchoolId == request.SchoolId &&
                bi.StudentId == request.StudentId &&
                bi.Status == "issued");
            if (activeCount >= 5)
                throw new InvalidOperationException("Student has reached the maximum checkout limit of 5 books.");

            var student = await _context.Students.FirstOrDefaultAsync(s => s.Id == request.StudentId && s.SchoolId == request.SchoolId);
            if (student == null)
                throw new InvalidOperationException("Student not found.");

            var issue = new BookIssue
            {
                Id = Guid.NewGuid(),
                SchoolId = request.SchoolId,
                BookId = request.BookId,
                StudentId = request.StudentId,
                IssueDate = effectiveIssueDate,
                DueDate = request.DueDate,
                Status = "issued",
                Fine = 0,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            book.AvailableCopies--;
            book.Status = DeriveStatus(book.TotalCopies, book.AvailableCopies);
            book.UpdatedAt = DateTime.UtcNow;

            _context.BookIssues.Add(issue);
            await _context.SaveChangesAsync();

            issue.Book = book;
            issue.Student = student;
            return MapToIssueResponse(issue);
        }

        public async Task<BookIssueResponse?> ReturnBookAsync(Guid id, Guid schoolId)
        {
            var issue = await _context.BookIssues
                .Include(bi => bi.Book)
                .Include(bi => bi.Student)
                .FirstOrDefaultAsync(bi => bi.Id == id && bi.SchoolId == schoolId);

            if (issue == null) return null;
            if (issue.Status == "returned")
                throw new InvalidOperationException("This book has already been returned.");

            var today = DateTime.UtcNow;
            issue.ReturnDate = today;
            issue.Status = "returned";

            // Calculate fine: â‚¹2 per day overdue
            var daysOverdue = Math.Max(0, (today.Date - issue.DueDate.Date).Days);
            issue.Fine = daysOverdue * FinePerDay;
            issue.UpdatedAt = today;

            if (issue.Book != null)
            {
                issue.Book.AvailableCopies++;
                issue.Book.Status = DeriveStatus(issue.Book.TotalCopies, issue.Book.AvailableCopies);
                issue.Book.UpdatedAt = today;
            }

            await _context.SaveChangesAsync();
            return MapToIssueResponse(issue);
        }

        public async Task<BookIssueResponse?> MarkFinePaidAsync(Guid id, Guid schoolId)
        {
            var issue = await _context.BookIssues
                .Include(bi => bi.Book)
                .Include(bi => bi.Student)
                .FirstOrDefaultAsync(bi => bi.Id == id && bi.SchoolId == schoolId);

            if (issue == null) return null;

            issue.FinePaid = true;
            issue.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return MapToIssueResponse(issue);
        }

        public async Task<LibraryStatsResponse> GetStatsAsync(Guid schoolId)
        {
            var today = DateTime.UtcNow.Date;

            var totalTitles = await _context.Books.CountAsync(b => b.SchoolId == schoolId);
            var totalCopies = await _context.Books.Where(b => b.SchoolId == schoolId).SumAsync(b => (int?)b.TotalCopies) ?? 0;
            var availableCopies = await _context.Books.Where(b => b.SchoolId == schoolId).SumAsync(b => (int?)b.AvailableCopies) ?? 0;

            var issuedCount = await _context.BookIssues.CountAsync(bi => bi.SchoolId == schoolId && bi.Status == "issued");
            var overdueCount = await _context.BookIssues.CountAsync(bi => bi.SchoolId == schoolId && bi.Status != "returned" && bi.DueDate.Date < today);
            var pendingFines = await _context.BookIssues
                .Where(bi => bi.SchoolId == schoolId && bi.Fine > 0 && !bi.FinePaid)
                .SumAsync(bi => (decimal?)bi.Fine) ?? 0;

            var issuedToday = await _context.BookIssues.CountAsync(bi => bi.SchoolId == schoolId && bi.IssueDate.Date == today);
            var returnedToday = await _context.BookIssues.CountAsync(bi => bi.SchoolId == schoolId && bi.ReturnDate.HasValue && bi.ReturnDate.Value.Date == today);

            return new LibraryStatsResponse
            {
                TotalTitles = totalTitles,
                TotalCopies = totalCopies,
                AvailableCopies = availableCopies,
                IssuedCopies = issuedCount,
                OverdueCount = overdueCount,
                TotalFinesPending = pendingFines,
                TotalIssuedToday = issuedToday,
                TotalReturnedToday = returnedToday
            };
        }

        private static string DeriveStatus(int total, int available)
        {
            if (available <= 0) return "unavailable";
            if (available <= total / 3) return "low";
            return "available";
        }

        private static BookResponse MapToResponse(Book book) => new()
        {
            Id = book.Id,
            SchoolId = book.SchoolId,
            Title = book.Title,
            Author = book.Author,
            ISBN = book.ISBN,
            Publisher = book.Publisher,
            PublishedYear = book.PublishedYear,
            Category = book.Category,
            Location = book.Location,
            Description = book.Description,
            TotalCopies = book.TotalCopies,
            AvailableCopies = book.AvailableCopies,
            Status = book.Status,
            CreatedAt = book.CreatedAt,
            UpdatedAt = book.UpdatedAt
        };

        private static BookIssueResponse MapToIssueResponse(BookIssue issue)
        {
            var today = DateTime.UtcNow.Date;
            var daysOverdue = issue.Status != "returned"
                ? Math.Max(0, (today - issue.DueDate.Date).Days)
                : 0;
            return new BookIssueResponse
            {
                Id = issue.Id,
                SchoolId = issue.SchoolId,
                BookId = issue.BookId,
                BookTitle = issue.Book?.Title ?? string.Empty,
                BookIsbn = issue.Book?.ISBN,
                StudentId = issue.StudentId,
                StudentName = issue.Student != null
                    ? (issue.Student.Name ?? $"{issue.Student.FirstName} {issue.Student.LastName}".Trim())
                    : string.Empty,
                StudentClass = issue.Student?.Class,
                StudentSection = issue.Student?.Section,
                StudentAdmissionNumber = issue.Student?.AdmissionNumber,
                IssueDate = issue.IssueDate,
                DueDate = issue.DueDate,
                ReturnDate = issue.ReturnDate,
                Status = issue.Status,
                Fine = issue.Fine,
                FinePaid = issue.FinePaid,
                DaysOverdue = daysOverdue,
                CreatedAt = issue.CreatedAt,
                UpdatedAt = issue.UpdatedAt
            };
        }
    }
}

