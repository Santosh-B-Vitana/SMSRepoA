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

        // ── P1: Enhanced Library ─────────────────────────────────────────────
        Task<List<BookReservationResponse>> GetReservationsAsync(Guid schoolId, Guid? bookId, string? status);
        Task<BookReservationResponse> ReserveBookAsync(Guid schoolId, CreateBookReservationRequest request);
        Task<BookReservationResponse?> CancelReservationAsync(Guid id, Guid schoolId);
        Task<BookReservationResponse?> FulfillReservationAsync(Guid id, Guid schoolId);
        Task<List<PeriodicalResponse>> GetPeriodicalsAsync(Guid schoolId, string? type);
        Task<PeriodicalResponse> CreatePeriodicalAsync(Guid schoolId, CreatePeriodicalRequest request);
        Task<PeriodicalResponse?> UpdatePeriodicalAsync(Guid id, Guid schoolId, CreatePeriodicalRequest request);
        Task<bool> DeletePeriodicalAsync(Guid id, Guid schoolId);
        Task<List<LibraryMemberResponse>> GetMembersAsync(Guid schoolId, string? memberType);
        Task<LibraryMemberResponse?> GetMemberByIdAsync(Guid id, Guid schoolId);
        Task<LibraryMemberResponse> CreateMemberAsync(Guid schoolId, CreateLibraryMemberRequest request);
        Task<LibraryMemberResponse?> UpdateMemberAsync(Guid id, Guid schoolId, UpdateLibraryMemberRequest request);
        Task<LibraryMemberResponse?> RevokeMemberAsync(Guid id, Guid schoolId);
        Task<List<OverdueBookResponse>> GetOverdueItemsAsync(Guid schoolId);
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

        // ── P1: Book Reservations ────────────────────────────────────────────────

        public async Task<List<BookReservationResponse>> GetReservationsAsync(Guid schoolId, Guid? bookId, string? status)
        {
            var q = _context.BookReservations
                .Include(r => r.Book)
                .Where(r => r.SchoolId == schoolId && !r.IsDeleted);
            if (bookId.HasValue) q = q.Where(r => r.BookId == bookId.Value);
            if (!string.IsNullOrWhiteSpace(status)) q = q.Where(r => r.Status == status);
            // Auto-expire reservations older than expiry and restore held copies
            var now = DateTime.UtcNow;
            var list = await q.OrderByDescending(r => r.ReservedAt).ToListAsync();
            bool anyExpired = false;
            foreach (var r in list.Where(r => r.Status == "pending" && r.ExpiresAt < now))
            {
                r.Status = "expired"; r.UpdatedAt = now;
                // Restore the copy that was held since reservation
                if (r.Book != null)
                {
                    r.Book.AvailableCopies = Math.Min(r.Book.TotalCopies, r.Book.AvailableCopies + 1);
                    r.Book.Status = DeriveStatus(r.Book.TotalCopies, r.Book.AvailableCopies);
                    r.Book.UpdatedAt = now;
                }
                anyExpired = true;
            }
            if (anyExpired) await _context.SaveChangesAsync();
            return await BuildReservationResponses(schoolId, list);
        }

        public async Task<BookReservationResponse> ReserveBookAsync(Guid schoolId, CreateBookReservationRequest request)
        {
            var book = await _context.Books.FirstOrDefaultAsync(b => b.Id == request.BookId && b.SchoolId == schoolId && !b.IsDeleted);
            if (book == null) throw new KeyNotFoundException("Book not found.");

            // AvailableCopies is decremented at reservation time and restored on cancel/expiry,
            // so a simple check is sufficient.
            if (book.AvailableCopies <= 0)
                throw new InvalidOperationException("No available copies to reserve. All copies are already checked out or reserved.");

            if (await _context.BookReservations.AnyAsync(r => r.BookId == request.BookId && r.MemberId == request.MemberId && r.Status == "pending" && !r.IsDeleted))
                throw new InvalidOperationException("An active reservation already exists for this member.");

            var reservation = new BookReservation
            {
                Id = Guid.NewGuid(), SchoolId = schoolId, BookId = request.BookId,
                MemberId = request.MemberId, MemberType = request.MemberType,
                ReservedAt = DateTime.UtcNow, ExpiresAt = DateTime.UtcNow.AddDays(3),
                Status = "pending", Notes = request.Notes,
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            };
            _context.BookReservations.Add(reservation);

            // Decrement now — the reserved copy is held off the shelf immediately
            book.AvailableCopies = Math.Max(0, book.AvailableCopies - 1);
            book.Status = DeriveStatus(book.TotalCopies, book.AvailableCopies);
            book.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            await _context.Entry(reservation).Reference(r => r.Book).LoadAsync();
            return (await BuildReservationResponses(schoolId, new[] { reservation })).First();
        }

        public async Task<BookReservationResponse?> CancelReservationAsync(Guid id, Guid schoolId)
        {
            var r = await _context.BookReservations.Include(x => x.Book)
                .FirstOrDefaultAsync(x => x.Id == id && x.SchoolId == schoolId && !x.IsDeleted);
            if (r == null) return null;

            r.Status = "cancelled"; r.UpdatedAt = DateTime.UtcNow;
            // Restore the copy held since reservation
            if (r.Book != null)
            {
                r.Book.AvailableCopies = Math.Min(r.Book.TotalCopies, r.Book.AvailableCopies + 1);
                r.Book.Status = DeriveStatus(r.Book.TotalCopies, r.Book.AvailableCopies);
                r.Book.UpdatedAt = DateTime.UtcNow;
            }
            await _context.SaveChangesAsync();
            return (await BuildReservationResponses(schoolId, new[] { r })).First();
        }

        public async Task<BookReservationResponse?> FulfillReservationAsync(Guid id, Guid schoolId)
        {
            var r = await _context.BookReservations.Include(x => x.Book)
                .FirstOrDefaultAsync(x => x.Id == id && x.SchoolId == schoolId && !x.IsDeleted);
            if (r == null) return null;
            if (r.Status != "pending")
                throw new InvalidOperationException($"Cannot fulfill a reservation with status '{r.Status}'. Only pending reservations can be fulfilled.");

            r.Status = "fulfilled"; r.UpdatedAt = DateTime.UtcNow;
            // AvailableCopies was already decremented at reservation time — no change here

            if (r.MemberType == "student")
            {
                var existingIssue = await _context.BookIssues.AnyAsync(bi =>
                    bi.SchoolId == schoolId && bi.StudentId == r.MemberId &&
                    bi.BookId == r.BookId && bi.Status == "issued");

                if (!existingIssue)
                {
                    _context.BookIssues.Add(new BookIssue
                    {
                        Id = Guid.NewGuid(),
                        SchoolId = schoolId,
                        BookId = r.BookId,
                        StudentId = r.MemberId,
                        IssueDate = DateTime.UtcNow,
                        DueDate = DateTime.UtcNow.AddDays(14),
                        Status = "issued",
                        Fine = 0,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                }
            }

            await _context.SaveChangesAsync();
            return (await BuildReservationResponses(schoolId, new[] { r })).First();
        }

        private async Task<List<BookReservationResponse>> BuildReservationResponses(Guid schoolId, IEnumerable<BookReservation> reservations)
        {
            var result = new List<BookReservationResponse>();
            foreach (var r in reservations)
            {
                string memberName = string.Empty;
                if (r.MemberType == "student")
                {
                    var s = await _context.Students.AsNoTracking().FirstOrDefaultAsync(x => x.Id == r.MemberId && x.SchoolId == schoolId);
                    memberName = s != null ? (!string.IsNullOrWhiteSpace(s.FirstName) ? $"{s.FirstName} {s.LastName}".Trim() : s.Name) : string.Empty;
                }
                else
                {
                    var st = await _context.StaffMembers.AsNoTracking().FirstOrDefaultAsync(x => x.Id == r.MemberId && x.SchoolId == schoolId);
                    memberName = st != null ? $"{st.FirstName} {st.LastName}".Trim() : string.Empty;
                }
                result.Add(new BookReservationResponse
                {
                    Id = r.Id, SchoolId = r.SchoolId, BookId = r.BookId,
                    BookTitle = r.Book?.Title ?? string.Empty,
                    MemberId = r.MemberId, MemberName = memberName, MemberType = r.MemberType,
                    ReservedAt = r.ReservedAt, ExpiresAt = r.ExpiresAt, Status = r.Status,
                    Notes = r.Notes, CreatedAt = r.CreatedAt
                });
            }
            return result;
        }

        // ── P1: Periodicals ──────────────────────────────────────────────────────

        public async Task<List<PeriodicalResponse>> GetPeriodicalsAsync(Guid schoolId, string? type)
        {
            var q = _context.Periodicals.Where(p => p.SchoolId == schoolId && !p.IsDeleted);
            if (!string.IsNullOrWhiteSpace(type)) q = q.Where(p => p.Type == type);
            var list = await q.OrderBy(p => p.Title).ToListAsync();
            return list.Select(MapPeriodical).ToList();
        }

        public async Task<PeriodicalResponse> CreatePeriodicalAsync(Guid schoolId, CreatePeriodicalRequest request)
        {
            var p = new Periodical
            {
                Id = Guid.NewGuid(), SchoolId = schoolId, Title = request.Title, Type = request.Type,
                Frequency = request.Frequency, Publisher = request.Publisher, ISSN = request.ISSN,
                SubscriptionStart = request.SubscriptionStart, SubscriptionEnd = request.SubscriptionEnd,
                AnnualCost = request.AnnualCost, Status = "active", Notes = request.Notes,
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            };
            _context.Periodicals.Add(p);
            await _context.SaveChangesAsync();
            return MapPeriodical(p);
        }

        public async Task<PeriodicalResponse?> UpdatePeriodicalAsync(Guid id, Guid schoolId, CreatePeriodicalRequest request)
        {
            var p = await _context.Periodicals.FirstOrDefaultAsync(x => x.Id == id && x.SchoolId == schoolId && !x.IsDeleted);
            if (p == null) return null;
            p.Title = request.Title; p.Type = request.Type; p.Frequency = request.Frequency;
            p.Publisher = request.Publisher; p.ISSN = request.ISSN;
            p.SubscriptionStart = request.SubscriptionStart; p.SubscriptionEnd = request.SubscriptionEnd;
            p.AnnualCost = request.AnnualCost; p.Notes = request.Notes;
            p.Status = (request.SubscriptionEnd.HasValue && request.SubscriptionEnd < DateTime.UtcNow) ? "expired" : "active";
            p.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return MapPeriodical(p);
        }

        public async Task<bool> DeletePeriodicalAsync(Guid id, Guid schoolId)
        {
            var p = await _context.Periodicals.FirstOrDefaultAsync(x => x.Id == id && x.SchoolId == schoolId && !x.IsDeleted);
            if (p == null) return false;
            p.IsDeleted = true; p.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }

        private static PeriodicalResponse MapPeriodical(Periodical p) => new()
        {
            Id = p.Id, SchoolId = p.SchoolId, Title = p.Title, Type = p.Type,
            Frequency = p.Frequency, Publisher = p.Publisher, ISSN = p.ISSN,
            SubscriptionStart = p.SubscriptionStart, SubscriptionEnd = p.SubscriptionEnd,
            AnnualCost = p.AnnualCost, Status = p.Status, Notes = p.Notes,
            CreatedAt = p.CreatedAt, UpdatedAt = p.UpdatedAt
        };

        // ── P1: Library Members ──────────────────────────────────────────────────

        public async Task<List<LibraryMemberResponse>> GetMembersAsync(Guid schoolId, string? memberType)
        {
            var q = _context.LibraryMembers.Where(m => m.SchoolId == schoolId && !m.IsDeleted);
            if (!string.IsNullOrWhiteSpace(memberType)) q = q.Where(m => m.MemberType == memberType);
            var list = await q.OrderBy(m => m.CardNumber).ToListAsync();
            return await BuildMemberResponses(schoolId, list);
        }

        public async Task<LibraryMemberResponse?> GetMemberByIdAsync(Guid id, Guid schoolId)
        {
            var m = await _context.LibraryMembers.FirstOrDefaultAsync(x => x.Id == id && x.SchoolId == schoolId && !x.IsDeleted);
            if (m == null) return null;
            return (await BuildMemberResponses(schoolId, new[] { m })).FirstOrDefault();
        }

        public async Task<LibraryMemberResponse> CreateMemberAsync(Guid schoolId, CreateLibraryMemberRequest request)
        {
            if (await _context.LibraryMembers.AnyAsync(m => m.SchoolId == schoolId && m.MemberId == request.MemberId && m.Status == "active" && !m.IsDeleted))
                throw new InvalidOperationException("An active library membership already exists for this member.");
            var now = DateTime.UtcNow;
            var cardNumber = $"LIB-{schoolId.ToString("N")[..6].ToUpper()}-{Guid.NewGuid().ToString("N")[..6].ToUpper()}";
            var member = new LibraryMember
            {
                Id = Guid.NewGuid(), SchoolId = schoolId, MemberType = request.MemberType, MemberId = request.MemberId,
                CardNumber = cardNumber, ValidFrom = request.ValidFrom ?? now,
                ValidTo = request.ValidTo ?? now.AddYears(1),
                MaxBooksAllowed = request.MaxBooksAllowed, LoanDays = request.LoanDays,
                Status = "active", CreatedAt = now, UpdatedAt = now
            };
            _context.LibraryMembers.Add(member);
            await _context.SaveChangesAsync();
            return (await BuildMemberResponses(schoolId, new[] { member })).First();
        }

        public async Task<LibraryMemberResponse?> UpdateMemberAsync(Guid id, Guid schoolId, UpdateLibraryMemberRequest request)
        {
            var m = await _context.LibraryMembers.FirstOrDefaultAsync(x => x.Id == id && x.SchoolId == schoolId && !x.IsDeleted);
            if (m == null) return null;
            if (request.ValidFrom.HasValue) m.ValidFrom = request.ValidFrom.Value;
            if (request.ValidTo.HasValue) m.ValidTo = request.ValidTo.Value;
            if (request.MaxBooksAllowed.HasValue) m.MaxBooksAllowed = request.MaxBooksAllowed.Value;
            if (request.LoanDays.HasValue) m.LoanDays = request.LoanDays.Value;
            m.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return (await BuildMemberResponses(schoolId, new[] { m })).First();
        }

        public async Task<LibraryMemberResponse?> RevokeMemberAsync(Guid id, Guid schoolId)
        {
            var m = await _context.LibraryMembers.FirstOrDefaultAsync(x => x.Id == id && x.SchoolId == schoolId && !x.IsDeleted);
            if (m == null) return null;
            m.Status = "revoked"; m.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return (await BuildMemberResponses(schoolId, new[] { m })).First();
        }

        private async Task<List<LibraryMemberResponse>> BuildMemberResponses(Guid schoolId, IEnumerable<LibraryMember> members)
        {
            var result = new List<LibraryMemberResponse>();
            foreach (var m in members)
            {
                string memberName = string.Empty;
                if (m.MemberType == "student")
                {
                    var s = await _context.Students.AsNoTracking().FirstOrDefaultAsync(x => x.Id == m.MemberId && x.SchoolId == schoolId);
                    memberName = s != null ? (!string.IsNullOrWhiteSpace(s.FirstName) ? $"{s.FirstName} {s.LastName}".Trim() : s.Name) : string.Empty;
                }
                else
                {
                    var st = await _context.StaffMembers.AsNoTracking().FirstOrDefaultAsync(x => x.Id == m.MemberId && x.SchoolId == schoolId);
                    memberName = st != null ? $"{st.FirstName} {st.LastName}".Trim() : string.Empty;
                }
                result.Add(new LibraryMemberResponse
                {
                    Id = m.Id, SchoolId = m.SchoolId, MemberType = m.MemberType, MemberId = m.MemberId,
                    MemberName = memberName, CardNumber = m.CardNumber, ValidFrom = m.ValidFrom, ValidTo = m.ValidTo,
                    Status = m.ValidTo < DateTime.UtcNow ? "expired" : m.Status,
                    MaxBooksAllowed = m.MaxBooksAllowed, LoanDays = m.LoanDays,
                    CreatedAt = m.CreatedAt, UpdatedAt = m.UpdatedAt
                });
            }
            return result;
        }

        // ── P1: Overdue Items ────────────────────────────────────────────────────

        public async Task<List<OverdueBookResponse>> GetOverdueItemsAsync(Guid schoolId)
        {
            var today = DateTime.UtcNow.Date;
            var overdueIssues = await _context.BookIssues
                .Include(i => i.Book)
                .Include(i => i.Student)
                .Where(i => i.SchoolId == schoolId && !i.IsDeleted && i.Status == "issued" && i.DueDate.Date < today)
                .OrderBy(i => i.DueDate)
                .ToListAsync();

            return overdueIssues.Select(i =>
            {
                var daysOverdue = (today - i.DueDate.Date).Days;
                var accruedFine = daysOverdue * FinePerDay;
                return new OverdueBookResponse
                {
                    IssueId = i.Id, BookId = i.BookId,
                    BookTitle = i.Book?.Title ?? string.Empty,
                    StudentId = i.StudentId,
                    StudentName = i.Student != null
                        ? (!string.IsNullOrWhiteSpace(i.Student.FirstName) ? $"{i.Student.FirstName} {i.Student.LastName}".Trim() : i.Student.Name)
                        : string.Empty,
                    DueDate = i.DueDate, DaysOverdue = daysOverdue, AccruedFine = accruedFine
                };
            }).ToList();
        }
    }
}



