using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.Entities;
using SmsApi.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace SmsApi.Controllers
{
    [ApiController]
    [Route("api/ptm")]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class PtmController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly ITenantContext _tenant;

        public PtmController(AppDbContext db, ITenantContext tenant)
        {
            _db = db;
            _tenant = tenant;
        }

        private Guid UserId => Guid.TryParse(
            User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

        // ── Sessions ──────────────────────────────────────────────────────────

        [HttpGet("sessions")]
        public async Task<IActionResult> GetSessions([FromQuery] string? status)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var query = _db.PtmSessions
                .AsNoTracking()
                .Where(s => s.SchoolId == schoolId && !s.IsDeleted);

            if (!string.IsNullOrEmpty(status))
                query = query.Where(s => s.Status == status);

            var sessions = await query
                .OrderByDescending(s => s.SessionDate)
                .Select(s => new
                {
                    s.Id, s.Title, s.Description, s.SessionDate,
                    s.StartTime, s.EndTime, s.SlotDurationMinutes,
                    s.Status, s.Location, s.TargetClassIds,
                    SlotCount = s.Slots.Count(sl => !sl.IsDeleted),
                    BookedCount = s.Slots.Count(sl => !sl.IsDeleted && sl.Status == "booked"),
                })
                .ToListAsync();

            return Ok(sessions);
        }

        [HttpGet("sessions/{id}")]
        public async Task<IActionResult> GetSession(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var session = await _db.PtmSessions
                .AsNoTracking()
                .Include(s => s.Slots.Where(sl => !sl.IsDeleted))
                .ThenInclude(sl => sl.Teacher)
                .Include(s => s.Slots.Where(sl => !sl.IsDeleted))
                .ThenInclude(sl => sl.Student)
                .FirstOrDefaultAsync(s => s.Id == id && s.SchoolId == schoolId && !s.IsDeleted);

            if (session == null) return NotFound(new { message = "PTM session not found." });
            return Ok(session);
        }

        [HttpPost("sessions")]
        [Authorize(Roles = "Admin,Principal,HRManager,SuperAdmin")]
        public async Task<IActionResult> CreateSession([FromBody] CreatePtmSessionRequest req)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var session = new PtmSession
            {
                SchoolId             = schoolId,
                Title                = req.Title,
                Description          = req.Description,
                SessionDate          = req.SessionDate,
                StartTime            = req.StartTime,
                EndTime              = req.EndTime,
                SlotDurationMinutes  = req.SlotDurationMinutes,
                Location             = req.Location,
                TargetClassIds       = req.TargetClassIds,
                Status               = "scheduled",
                CreatedBy            = UserId,
            };

            _db.PtmSessions.Add(session);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(GetSession), new { id = session.Id }, new { session.Id });
        }

        [HttpPut("sessions/{id}/status")]
        [Authorize(Roles = "Admin,Principal,HRManager,SuperAdmin")]
        public async Task<IActionResult> UpdateSessionStatus(Guid id, [FromBody] UpdateStatusRequest req)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var session = await _db.PtmSessions
                .FirstOrDefaultAsync(s => s.Id == id && s.SchoolId == schoolId && !s.IsDeleted);
            if (session == null) return NotFound();
            session.Status    = req.Status;
            session.UpdatedAt = DateTime.UtcNow;
            session.UpdatedBy = UserId;
            await _db.SaveChangesAsync();
            return Ok(new { session.Status });
        }

        // ── Slots ─────────────────────────────────────────────────────────────

        [HttpGet("sessions/{sessionId}/slots")]
        public async Task<IActionResult> GetSlots(Guid sessionId, [FromQuery] Guid? teacherId)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var query = _db.PtmSlots
                .AsNoTracking()
                .Where(sl => sl.SessionId == sessionId && sl.SchoolId == schoolId && !sl.IsDeleted);

            if (teacherId.HasValue)
                query = query.Where(sl => sl.TeacherId == teacherId.Value);

            var slots = await query
                .OrderBy(sl => sl.SlotDateTime)
                .Select(sl => new
                {
                    sl.Id, sl.TeacherId, sl.SlotDateTime, sl.Status,
                    sl.BookedByParentId, sl.StudentId, sl.Notes, sl.TeacherRemarks,
                    TeacherName = sl.Teacher != null
                        ? $"{sl.Teacher.FirstName} {sl.Teacher.LastName}" : null,
                    StudentName = sl.Student != null
                        ? $"{sl.Student.FirstName} {sl.Student.LastName}" : null,
                })
                .ToListAsync();

            return Ok(slots);
        }

        [HttpPost("sessions/{sessionId}/slots/generate")]
        [Authorize(Roles = "Admin,Principal,HRManager,SuperAdmin")]
        public async Task<IActionResult> GenerateSlots(Guid sessionId, [FromBody] GenerateSlotsRequest req)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var session = await _db.PtmSessions
                .FirstOrDefaultAsync(s => s.Id == sessionId && s.SchoolId == schoolId && !s.IsDeleted);
            if (session == null) return NotFound();

            var slots = new List<PtmSlot>();
            var slotDuration = TimeSpan.FromMinutes(session.SlotDurationMinutes);
            var current = session.SessionDate.Date + session.StartTime;
            var endTime = session.SessionDate.Date + session.EndTime;

            foreach (var teacherId in req.TeacherIds)
            {
                var slotTime = current;
                while (slotTime + slotDuration <= endTime)
                {
                    slots.Add(new PtmSlot
                    {
                        SchoolId    = schoolId,
                        SessionId   = sessionId,
                        TeacherId   = teacherId,
                        SlotDateTime = slotTime,
                        Status      = "available",
                        CreatedBy   = UserId,
                    });
                    slotTime += slotDuration;
                }
            }

            _db.PtmSlots.AddRange(slots);
            await _db.SaveChangesAsync();
            return Ok(new { generated = slots.Count });
        }

        [HttpPost("slots/{slotId}/book")]
        [Authorize(Roles = "Parent")]
        public async Task<IActionResult> BookSlot(Guid slotId, [FromBody] BookSlotRequest req)
        {
            var schoolId    = _tenant.GetEffectiveSchoolId();
            var parentEmail = User.FindFirstValue(ClaimTypes.Email) ?? string.Empty;

            // Verify req.StudentId belongs to this parent
            var isMyChild = await _db.StudentGuardians
                .AnyAsync(sg => sg.SchoolId == schoolId && !sg.IsDeleted
                             && sg.StudentId == req.StudentId
                             && sg.Email != null && sg.Email.ToLower() == parentEmail.ToLower());
            if (!isMyChild)
                return StatusCode(403, new { message = "You can only book a slot for your own child." });

            var slot = await _db.PtmSlots
                .FirstOrDefaultAsync(sl => sl.Id == slotId && sl.SchoolId == schoolId && !sl.IsDeleted);

            if (slot == null) return NotFound();
            if (slot.Status != "available")
                return Conflict(new { message = "This slot is already booked or unavailable." });

            slot.Status           = "booked";
            slot.BookedByParentId = UserId;
            slot.StudentId        = req.StudentId;
            slot.Notes            = req.Notes;
            slot.UpdatedAt        = DateTime.UtcNow;
            slot.UpdatedBy        = UserId;

            await _db.SaveChangesAsync();
            return Ok(new { slotId, status = "booked" });
        }

        [HttpPost("slots/{slotId}/cancel")]
        [Authorize(Roles = "Parent,Admin,Principal,SuperAdmin")]
        public async Task<IActionResult> CancelSlot(Guid slotId)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var slot = await _db.PtmSlots
                .FirstOrDefaultAsync(sl => sl.Id == slotId && sl.SchoolId == schoolId && !sl.IsDeleted);

            if (slot == null) return NotFound();

            // Parents can only cancel their own bookings
            var role = _tenant.Role ?? string.Empty;
            if (role.Equals("Parent", StringComparison.OrdinalIgnoreCase)
                && slot.BookedByParentId != UserId)
                return StatusCode(403, new { message = "You can only cancel your own bookings." });

            slot.Status           = "available";
            slot.BookedByParentId = null;
            slot.StudentId        = null;
            slot.Notes            = null;
            slot.UpdatedAt        = DateTime.UtcNow;
            slot.UpdatedBy        = UserId;

            await _db.SaveChangesAsync();
            return Ok(new { slotId, status = "available" });
        }

        // ── Parent: my booked slots ────────────────────────────────────────────

        [HttpGet("parent/my-bookings")]
        [Authorize(Roles = "Parent")]
        public async Task<IActionResult> GetParentMyBookings()
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var slots = await _db.PtmSlots
                .AsNoTracking()
                .Include(sl => sl.Session)
                .Include(sl => sl.Teacher)
                .Include(sl => sl.Student)
                .Where(sl => sl.SchoolId == schoolId && !sl.IsDeleted
                          && sl.BookedByParentId == UserId
                          && sl.SlotDateTime >= DateTime.UtcNow.AddDays(-7))
                .OrderBy(sl => sl.SlotDateTime)
                .Select(sl => new
                {
                    sl.Id, sl.SlotDateTime, sl.Status,
                    sl.Notes, sl.TeacherRemarks,
                    SessionTitle = sl.Session != null ? sl.Session.Title : null,
                    SessionLocation = sl.Session != null ? sl.Session.Location : null,
                    TeacherName = sl.Teacher != null
                        ? $"{sl.Teacher.FirstName} {sl.Teacher.LastName}" : null,
                    StudentName = sl.Student != null
                        ? $"{sl.Student.FirstName} {sl.Student.LastName}" : null,
                })
                .ToListAsync();

            return Ok(slots);
        }

        [HttpPut("slots/{slotId}/remarks")]
        [Authorize(Roles = "Teacher,Staff,Principal")]
        public async Task<IActionResult> AddTeacherRemarks(Guid slotId, [FromBody] AddRemarksRequest req)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var slot = await _db.PtmSlots
                .FirstOrDefaultAsync(sl => sl.Id == slotId && sl.SchoolId == schoolId && !sl.IsDeleted);

            if (slot == null) return NotFound();
            slot.TeacherRemarks = req.Remarks;
            slot.Status         = "completed";
            slot.UpdatedAt      = DateTime.UtcNow;
            slot.UpdatedBy      = UserId;

            await _db.SaveChangesAsync();
            return Ok(new { slotId, status = "completed" });
        }

        // ── Teacher: my upcoming slots ─────────────────────────────────────────

        [HttpGet("my-slots")]
        [Authorize(Roles = "Teacher,Staff,Principal")]
        public async Task<IActionResult> GetMySlots()
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var staffEmail = User.FindFirstValue(ClaimTypes.Email);
            Guid.TryParse(User.FindFirstValue("LinkedEntityId"), out var linkedId);
            var staffId = await _db.StaffMembers
                .Where(s => s.SchoolId == schoolId && !s.IsDeleted
                         && (s.Email == staffEmail || s.Id == linkedId))
                .Select(s => s.Id)
                .FirstOrDefaultAsync();

            if (staffId == Guid.Empty) return Ok(Array.Empty<object>());

            var slots = await _db.PtmSlots
                .AsNoTracking()
                .Include(sl => sl.Session)
                .Include(sl => sl.Student)
                .Where(sl => sl.SchoolId == schoolId && sl.TeacherId == staffId && !sl.IsDeleted
                          && sl.SlotDateTime >= DateTime.UtcNow.AddDays(-1))
                .OrderBy(sl => sl.SlotDateTime)
                .Select(sl => new
                {
                    sl.Id, sl.SlotDateTime, sl.Status,
                    sl.Notes, sl.TeacherRemarks,
                    SessionTitle = sl.Session != null ? sl.Session.Title : null,
                    StudentName = sl.Student != null
                        ? $"{sl.Student.FirstName} {sl.Student.LastName}" : null,
                })
                .ToListAsync();

            return Ok(slots);
        }
    }

    // ── Request models ──────────────────────────────────────────────────────────

    public class CreatePtmSessionRequest
    {
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime SessionDate { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public int SlotDurationMinutes { get; set; } = 10;
        public string? Location { get; set; }
        public string? TargetClassIds { get; set; }
    }

    public class UpdateStatusRequest
    {
        public string Status { get; set; } = string.Empty;
    }

    public class GenerateSlotsRequest
    {
        public List<Guid> TeacherIds { get; set; } = new();
    }

    public class BookSlotRequest
    {
        public Guid? StudentId { get; set; }
        public string? Notes { get; set; }
    }

    public class AddRemarksRequest
    {
        public string Remarks { get; set; } = string.Empty;
    }
}
