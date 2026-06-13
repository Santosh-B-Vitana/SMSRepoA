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

        // ΓöÇΓöÇ Books ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

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

        // ΓöÇΓöÇ Issues ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

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

        // ΓöÇΓöÇ Stats ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

        [HttpGet("stats")]
        public async Task<ActionResult<LibraryStatsResponse>> GetStats()
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var stats = await _libraryService.GetStatsAsync(schoolId);
            return Ok(stats);
        }

        // ── P1: Reservations ─────────────────────────────────────────────────────

        [HttpGet("reservations")]
        public async Task<IActionResult> GetReservations([FromQuery] Guid? bookId, [FromQuery] string? status)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            return Ok(await _libraryService.GetReservationsAsync(schoolId, bookId, status));
        }

        [HttpPost("reservations")]
        public async Task<IActionResult> ReserveBook([FromBody] CreateBookReservationRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _libraryService.ReserveBookAsync(schoolId, request);
                return StatusCode(201, result);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpPut("reservations/{id:guid}/cancel")]
        public async Task<IActionResult> CancelReservation(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result = await _libraryService.CancelReservationAsync(id, schoolId);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpPut("reservations/{id:guid}/fulfill")]
        public async Task<IActionResult> FulfillReservation(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result = await _libraryService.FulfillReservationAsync(id, schoolId);
            return result == null ? NotFound() : Ok(result);
        }

        // ── P1: Periodicals ──────────────────────────────────────────────────────

        [HttpGet("periodicals")]
        public async Task<IActionResult> GetPeriodicals([FromQuery] string? type)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            return Ok(await _libraryService.GetPeriodicalsAsync(schoolId, type));
        }

        [HttpPost("periodicals")]
        public async Task<IActionResult> CreatePeriodical([FromBody] CreatePeriodicalRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _libraryService.CreatePeriodicalAsync(schoolId, request);
                return StatusCode(201, result);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpPut("periodicals/{id:guid}")]
        public async Task<IActionResult> UpdatePeriodical(Guid id, [FromBody] CreatePeriodicalRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result = await _libraryService.UpdatePeriodicalAsync(id, schoolId, request);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpDelete("periodicals/{id:guid}")]
        public async Task<IActionResult> DeletePeriodical(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            return await _libraryService.DeletePeriodicalAsync(id, schoolId) ? NoContent() : NotFound();
        }

        // ── P1: Library Members ──────────────────────────────────────────────────

        [HttpGet("members")]
        public async Task<IActionResult> GetMembers([FromQuery] string? memberType)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            return Ok(await _libraryService.GetMembersAsync(schoolId, memberType));
        }

        [HttpGet("members/{id:guid}")]
        public async Task<IActionResult> GetMember(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result = await _libraryService.GetMemberByIdAsync(id, schoolId);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpPost("members")]
        public async Task<IActionResult> CreateMember([FromBody] CreateLibraryMemberRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _libraryService.CreateMemberAsync(schoolId, request);
                return CreatedAtAction(nameof(GetMember), new { id = result.Id }, result);
            }
            catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpPut("members/{id:guid}")]
        public async Task<IActionResult> UpdateMember(Guid id, [FromBody] UpdateLibraryMemberRequest request)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result = await _libraryService.UpdateMemberAsync(id, schoolId, request);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpPut("members/{id:guid}/revoke")]
        public async Task<IActionResult> RevokeMember(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result = await _libraryService.RevokeMemberAsync(id, schoolId);
            return result == null ? NotFound() : Ok(result);
        }

        // ── P1: Overdue Items ────────────────────────────────────────────────────

        [HttpGet("overdue")]
        public async Task<IActionResult> GetOverdueItems()
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            return Ok(await _libraryService.GetOverdueItemsAsync(schoolId));
        }

        /// <summary>
        /// [Mobile/Student] Returns issued books for the currently authenticated student.
        /// StudentId is resolved from the JWT's LinkedEntityId claim.
        /// </summary>
        [HttpGet("my-issues")]
        [Authorize(Roles = StatusConstants.Roles.Student)]
        public async Task<ActionResult<BookIssueListResponse>> GetMyIssues(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50,
            [FromQuery] string? status = null)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var studentId = _tenant.LinkedEntityId;

            if (!studentId.HasValue || studentId == Guid.Empty)
                return Unauthorized(new { message = "Student record not linked to this account." });

            var result = await _libraryService.GetBookIssuesAsync(
                schoolId, page, pageSize, bookId: null, studentId: studentId.Value, status: status);
            return Ok(result);
        }
    }
}

