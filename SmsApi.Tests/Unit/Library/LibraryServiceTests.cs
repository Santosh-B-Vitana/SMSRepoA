using System;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;
using SmsApi.Services;
using Xunit;

namespace SmsApi.Tests.Unit.Library;

public class LibraryServiceTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly LibraryService _service;
    private readonly Guid _schoolId = Guid.NewGuid();

    public LibraryServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _context = new AppDbContext(options);
        _service = new LibraryService(_context);
    }

    public void Dispose() => _context.Dispose();

    // ── Helpers ─────────────────────────────────────────────────────────

    private async Task<Book> SeedBookAsync(Guid schoolId, string title, string? isbn = null, int total = 5, int available = 5)
    {
        var book = new Book
        {
            Id = Guid.NewGuid(),
            SchoolId = schoolId,
            Title = title,
            Author = "Author",
            ISBN = isbn,
            Category = "General",
            TotalCopies = total,
            AvailableCopies = available,
            Status = available > 0 ? "available" : "unavailable",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Books.Add(book);
        await _context.SaveChangesAsync();
        return book;
    }

    private async Task<Student> SeedStudentAsync(Guid schoolId)
    {
        var student = new Student
        {
            Id = Guid.NewGuid(),
            SchoolId = schoolId,
            Name = "Test Student",
            FirstName = "Test",
            LastName = "Student",
            AdmissionNumber = $"S{Guid.NewGuid().ToString("N")[..8]}",
            Class = "10",
            Section = "A",
            DateOfBirth = new DateTime(2010, 1, 1),
            Gender = "male",
            Status = "active",
            AdmissionDate = DateTime.UtcNow.AddYears(-1),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Students.Add(student);
        await _context.SaveChangesAsync();
        return student;
    }

    // ── GetBooksAsync: Pagination ────────────────────────────────────────

    [Fact]
    public async Task GetBooksAsync_NormalizesNegativePage()
    {
        await SeedBookAsync(_schoolId, "Book One");
        var result = await _service.GetBooksAsync(_schoolId, -5, 10);
        result.Page.Should().Be(1);
    }

    [Fact]
    public async Task GetBooksAsync_NormalizesZeroPageSize()
    {
        await SeedBookAsync(_schoolId, "Book Two");
        var result = await _service.GetBooksAsync(_schoolId, 1, 0);
        result.PageSize.Should().Be(20);
    }

    [Fact]
    public async Task GetBooksAsync_ClampsTooLargePageSize()
    {
        await SeedBookAsync(_schoolId, "Book Three");
        var result = await _service.GetBooksAsync(_schoolId, 1, 9999);
        result.PageSize.Should().Be(200);
    }

    [Fact]
    public async Task GetBooksAsync_FiltersIsolatedBySchool()
    {
        var otherSchool = Guid.NewGuid();
        await SeedBookAsync(_schoolId, "Mine");
        await SeedBookAsync(otherSchool, "Theirs");

        var result = await _service.GetBooksAsync(_schoolId, 1, 50);
        result.Books.Should().AllSatisfy(b => b.SchoolId.Should().Be(_schoolId));
        result.Total.Should().Be(1);
    }

    // ── CreateBookAsync: Validation ──────────────────────────────────────

    [Fact]
    public async Task CreateBookAsync_Throws_WhenTitleEmpty()
    {
        var act = async () => await _service.CreateBookAsync(new CreateBookRequest
        {
            SchoolId = _schoolId, Title = "  ", Author = "A", TotalCopies = 2
        });
        await act.Should().ThrowAsync<ArgumentException>().WithMessage("*title*");
    }

    [Fact]
    public async Task CreateBookAsync_Throws_WhenTotalCopiesZero()
    {
        var act = async () => await _service.CreateBookAsync(new CreateBookRequest
        {
            SchoolId = _schoolId, Title = "Book", Author = "A", TotalCopies = 0
        });
        await act.Should().ThrowAsync<ArgumentException>().WithMessage("*TotalCopies*");
    }

    [Fact]
    public async Task CreateBookAsync_Throws_WhenTotalCopiesNegative()
    {
        var act = async () => await _service.CreateBookAsync(new CreateBookRequest
        {
            SchoolId = _schoolId, Title = "Book", TotalCopies = -1
        });
        await act.Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task CreateBookAsync_Throws_WhenAvailableCopiesExceedsTotal()
    {
        var act = async () => await _service.CreateBookAsync(new CreateBookRequest
        {
            SchoolId = _schoolId, Title = "Book", Author = "A", TotalCopies = 2, AvailableCopies = 5
        });
        await act.Should().ThrowAsync<ArgumentException>().WithMessage("*AvailableCopies*");
    }

    [Fact]
    public async Task CreateBookAsync_Throws_WhenIsbnDuplicate()
    {
        await SeedBookAsync(_schoolId, "Existing", "978-3-16-148410-0");
        var act = async () => await _service.CreateBookAsync(new CreateBookRequest
        {
            SchoolId = _schoolId, Title = "New Book", Author = "A", ISBN = "978-3-16-148410-0", TotalCopies = 2
        });
        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*ISBN*");
    }

    [Fact]
    public async Task CreateBookAsync_DefaultsCategory_WhenEmpty()
    {
        var result = await _service.CreateBookAsync(new CreateBookRequest
        {
            SchoolId = _schoolId, Title = "No Category Book", Author = "A", TotalCopies = 1, Category = null
        });
        result.Category.Should().Be("General");
    }

    [Fact]
    public async Task CreateBookAsync_SetsAvailableCopies_ToTotalWhenNotSpecified()
    {
        var result = await _service.CreateBookAsync(new CreateBookRequest
        {
            SchoolId = _schoolId, Title = "Auto Available", Author = "A", TotalCopies = 3, AvailableCopies = 0
        });
        result.AvailableCopies.Should().Be(3);
    }

    // ── UpdateBookAsync: Validation ──────────────────────────────────────

    [Fact]
    public async Task UpdateBookAsync_Throws_WhenReducingBelowIssuedCount()
    {
        var student = await SeedStudentAsync(_schoolId);
        var book = await SeedBookAsync(_schoolId, "IssuedBook", total: 5, available: 4);

        // Issue one copy
        _context.BookIssues.Add(new BookIssue
        {
            Id = Guid.NewGuid(), SchoolId = _schoolId, BookId = book.Id,
            StudentId = student.Id, IssueDate = DateTime.UtcNow,
            DueDate = DateTime.UtcNow.AddDays(14), Status = "issued",
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        var act = async () => await _service.UpdateBookAsync(book.Id, _schoolId, new CreateBookRequest
        {
            Title = "IssuedBook", TotalCopies = 0 // less than 1 issued
        });
        await act.Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task UpdateBookAsync_ReturnsNull_WhenBookNotFound()
    {
        var result = await _service.UpdateBookAsync(Guid.NewGuid(), _schoolId, new CreateBookRequest
        {
            Title = "X", TotalCopies = 1
        });
        result.Should().BeNull();
    }

    // ── IssueBookAsync: Validation ───────────────────────────────────────

    [Fact]
    public async Task IssueBookAsync_Throws_WhenDueDateBeforeIssueDate()
    {
        var book = await SeedBookAsync(_schoolId, "DueDateBook");
        var student = await SeedStudentAsync(_schoolId);
        var issueDate = DateTime.UtcNow.Date;

        var act = async () => await _service.IssueBookAsync(new CreateBookIssueRequest
        {
            SchoolId = _schoolId, BookId = book.Id, StudentId = student.Id,
            IssueDate = issueDate, DueDate = issueDate.AddDays(-1)
        });
        await act.Should().ThrowAsync<ArgumentException>().WithMessage("*DueDate*");
    }

    [Fact]
    public async Task IssueBookAsync_Throws_WhenDueDateEqualToIssueDate()
    {
        var book = await SeedBookAsync(_schoolId, "SameDateBook");
        var student = await SeedStudentAsync(_schoolId);
        var today = DateTime.UtcNow.Date;

        var act = async () => await _service.IssueBookAsync(new CreateBookIssueRequest
        {
            SchoolId = _schoolId, BookId = book.Id, StudentId = student.Id,
            IssueDate = today, DueDate = today
        });
        await act.Should().ThrowAsync<ArgumentException>().WithMessage("*DueDate*");
    }

    [Fact]
    public async Task IssueBookAsync_Throws_WhenNoAvailableCopies()
    {
        var book = await SeedBookAsync(_schoolId, "UnavailableBook", total: 1, available: 0);
        var student = await SeedStudentAsync(_schoolId);

        var act = async () => await _service.IssueBookAsync(new CreateBookIssueRequest
        {
            SchoolId = _schoolId, BookId = book.Id, StudentId = student.Id,
            IssueDate = DateTime.UtcNow, DueDate = DateTime.UtcNow.AddDays(14)
        });
        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*available copies*");
    }

    [Fact]
    public async Task IssueBookAsync_Throws_WhenStudentAlreadyHasBookIssued()
    {
        var book = await SeedBookAsync(_schoolId, "DupIssueBook", total: 5, available: 4);
        var student = await SeedStudentAsync(_schoolId);

        // First issue
        _context.BookIssues.Add(new BookIssue
        {
            Id = Guid.NewGuid(), SchoolId = _schoolId, BookId = book.Id,
            StudentId = student.Id, IssueDate = DateTime.UtcNow,
            DueDate = DateTime.UtcNow.AddDays(14), Status = "issued",
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        var act = async () => await _service.IssueBookAsync(new CreateBookIssueRequest
        {
            SchoolId = _schoolId, BookId = book.Id, StudentId = student.Id,
            IssueDate = DateTime.UtcNow, DueDate = DateTime.UtcNow.AddDays(14)
        });
        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*already has*");
    }

    [Fact]
    public async Task IssueBookAsync_Throws_WhenMaxCheckoutLimitReached()
    {
        var student = await SeedStudentAsync(_schoolId);
        for (int i = 0; i < 5; i++)
        {
            var b = await SeedBookAsync(_schoolId, $"Book{i}", total: 5, available: 4);
            _context.BookIssues.Add(new BookIssue
            {
                Id = Guid.NewGuid(), SchoolId = _schoolId, BookId = b.Id,
                StudentId = student.Id, IssueDate = DateTime.UtcNow,
                DueDate = DateTime.UtcNow.AddDays(14), Status = "issued",
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            });
        }
        await _context.SaveChangesAsync();

        var newBook = await SeedBookAsync(_schoolId, "SixthBook");
        var act = async () => await _service.IssueBookAsync(new CreateBookIssueRequest
        {
            SchoolId = _schoolId, BookId = newBook.Id, StudentId = student.Id,
            IssueDate = DateTime.UtcNow, DueDate = DateTime.UtcNow.AddDays(14)
        });
        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*maximum*");
    }

    [Fact]
    public async Task IssueBookAsync_Throws_WhenStudentBelongsToDifferentSchool()
    {
        var book = await SeedBookAsync(_schoolId, "CrossSchoolBook");
        var otherSchoolStudent = await SeedStudentAsync(Guid.NewGuid()); // different school

        var act = async () => await _service.IssueBookAsync(new CreateBookIssueRequest
        {
            SchoolId = _schoolId, BookId = book.Id, StudentId = otherSchoolStudent.Id,
            IssueDate = DateTime.UtcNow, DueDate = DateTime.UtcNow.AddDays(14)
        });
        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*Student not found*");
    }

    [Fact]
    public async Task IssueBookAsync_DecrementsAvailableCopies()
    {
        var book = await SeedBookAsync(_schoolId, "DecrementBook", total: 3, available: 3);
        var student = await SeedStudentAsync(_schoolId);

        await _service.IssueBookAsync(new CreateBookIssueRequest
        {
            SchoolId = _schoolId, BookId = book.Id, StudentId = student.Id,
            IssueDate = DateTime.UtcNow, DueDate = DateTime.UtcNow.AddDays(14)
        });

        var updatedBook = await _context.Books.FindAsync(book.Id);
        updatedBook!.AvailableCopies.Should().Be(2);
    }

    // ── ReturnBookAsync ──────────────────────────────────────────────────

    [Fact]
    public async Task ReturnBookAsync_Throws_WhenAlreadyReturned()
    {
        var book = await SeedBookAsync(_schoolId, "ReturnedBook");
        var student = await SeedStudentAsync(_schoolId);
        var issue = new BookIssue
        {
            Id = Guid.NewGuid(), SchoolId = _schoolId, BookId = book.Id,
            StudentId = student.Id, IssueDate = DateTime.UtcNow.AddDays(-7),
            DueDate = DateTime.UtcNow.AddDays(7), Status = "returned",
            ReturnDate = DateTime.UtcNow.AddDays(-1),
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
        };
        _context.BookIssues.Add(issue);
        await _context.SaveChangesAsync();

    }

    [Fact]
    public async Task ReturnBookAsync_CalculatesFine_WhenOverdue()
    {
        var book = await SeedBookAsync(_schoolId, "OverdueBook", total: 2, available: 1);
        var student = await SeedStudentAsync(_schoolId);
        var dueDate = DateTime.UtcNow.AddDays(-5); // 5 days overdue
        var issue = new BookIssue
        {
            Id = Guid.NewGuid(), SchoolId = _schoolId, BookId = book.Id,
            StudentId = student.Id, IssueDate = dueDate.AddDays(-7),
            DueDate = dueDate, Status = "issued",
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
        };
        _context.BookIssues.Add(issue);
        await _context.SaveChangesAsync();

    }

    [Fact]
    public async Task ReturnBookAsync_IncreasesAvailableCopies()
    {
        var book = await SeedBookAsync(_schoolId, "RestockBook", total: 3, available: 2);
        var student = await SeedStudentAsync(_schoolId);
        var issue = new BookIssue
        {
            Id = Guid.NewGuid(), SchoolId = _schoolId, BookId = book.Id,
            StudentId = student.Id, IssueDate = DateTime.UtcNow.AddDays(-3),
            DueDate = DateTime.UtcNow.AddDays(11), Status = "issued",
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
        };
        _context.BookIssues.Add(issue);
        await _context.SaveChangesAsync();

    }

    // ── GetStatsAsync ────────────────────────────────────────────────────

    [Fact]
    public async Task GetStatsAsync_ReturnsCorrectCounts()
    {
        var book1 = await SeedBookAsync(_schoolId, "Stats Book 1", total: 5, available: 3);
        var book2 = await SeedBookAsync(_schoolId, "Stats Book 2", total: 2, available: 2);
        var student = await SeedStudentAsync(_schoolId);

        _context.BookIssues.Add(new BookIssue
        {
            Id = Guid.NewGuid(), SchoolId = _schoolId, BookId = book1.Id,
            StudentId = student.Id, IssueDate = DateTime.UtcNow,
            DueDate = DateTime.UtcNow.AddDays(14), Status = "issued",
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        var stats = await _service.GetStatsAsync(_schoolId);
        stats.TotalTitles.Should().Be(2);
    }
}
