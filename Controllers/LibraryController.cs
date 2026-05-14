using SmsApi.Models.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmsApi.Models.DTOs;
using SmsApi.Services;

using System;
using System.Threading.Tasks;

namespace SmsApi.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class LibraryController : ControllerBase
    {
        private readonly ILibraryService _libraryService;
        private readonly ITenantContext _tenant;

        public LibraryController(ILibraryService libraryService, ITenantContext tenant)
        {
            _libraryService = libraryService;
            _tenant = tenant;
        }

        // ── Books ───────────────────────────────────────────────────────

        [HttpGet("books")]
        public async Task<ActionResult<LibraryListResponse>> GetBooks(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? search = null,
            [FromQuery] string? category = null,
            [FromQuery] string? status = null)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result = await _libraryService.GetBooksAsync(schoolId, page, pageSize, search, category, status);
            return Ok(result);
        }

        [HttpGet("books/{id}")]
        public async Task<ActionResult<BookResponse>> GetBookById(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var book = await _libraryService.GetBookByIdAsync(id, schoolId);
            if (book == null) return NotFound();
            return Ok(book);
        }

        [HttpPost("books")]
        [Authorize(Roles = "Admin,Principal,Librarian")]
        public async Task<ActionResult<BookResponse>> CreateBook([FromBody] CreateBookRequest request)
        {
            request.SchoolId = _tenant.GetEffectiveSchoolId();
            try
            {
                var book = await _libraryService.CreateBookAsync(request);
                return CreatedAtAction(nameof(GetBookById), new { id = book.Id }, book);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("books/{id}")]
        [Authorize(Roles = "Admin,Principal,Librarian")]
        public async Task<ActionResult<BookResponse>> UpdateBook(Guid id, [FromBody] CreateBookRequest request)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            try
            {
                var book = await _libraryService.UpdateBookAsync(id, schoolId, request);
                if (book == null) return NotFound();
                return Ok(book);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("books/{id}")]
        [Authorize(Roles = "Admin,Principal,Librarian")]
        public async Task<ActionResult> DeleteBook(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            try
            {
                var result = await _libraryService.DeleteBookAsync(id, schoolId);
                if (!result) return NotFound();
                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // ── Issues ──────────────────────────────────────────────────────

        [HttpGet("issues")]
        public async Task<ActionResult<BookIssueListResponse>> GetBookIssues(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] Guid? bookId = null,
            [FromQuery] Guid? studentId = null,
            [FromQuery] string? status = null)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result = await _libraryService.GetBookIssuesAsync(schoolId, page, pageSize, bookId, studentId, status);
            return Ok(result);
        }

        [HttpGet("issues/{id}")]
        public async Task<ActionResult<BookIssueResponse>> GetBookIssueById(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var issue = await _libraryService.GetBookIssueByIdAsync(id, schoolId);
            if (issue == null) return NotFound();
            return Ok(issue);
        }

        [HttpPost("issues")]
        [Authorize(Roles = "Admin,Principal,Librarian,Staff,Teacher")]
        public async Task<ActionResult<BookIssueResponse>> IssueBook([FromBody] CreateBookIssueRequest request)
        {
            request.SchoolId = _tenant.GetEffectiveSchoolId();
            try
            {
                var issue = await _libraryService.IssueBookAsync(request);
                return CreatedAtAction(nameof(GetBookIssueById), new { id = issue.Id }, issue);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("issues/{id}/return")]
        [Authorize(Roles = "Admin,Principal,Librarian,Staff,Teacher")]
        public async Task<ActionResult<BookIssueResponse>> ReturnBook(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            try
            {
                var issue = await _libraryService.ReturnBookAsync(id, schoolId);
                if (issue == null) return NotFound();
                return Ok(issue);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("issues/{id}/fine-paid")]
        [Authorize(Roles = "Admin,Principal,Librarian")]
        public async Task<ActionResult<BookIssueResponse>> MarkFinePaid(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var issue = await _libraryService.MarkFinePaidAsync(id, schoolId);
            if (issue == null) return NotFound();
            return Ok(issue);
        }

        // ── Stats ───────────────────────────────────────────────────────

        [HttpGet("stats")]
        public async Task<ActionResult<LibraryStatsResponse>> GetStats()
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var stats = await _libraryService.GetStatsAsync(schoolId);
            return Ok(stats);
        }
    }
}
