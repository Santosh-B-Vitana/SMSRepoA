using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.Entities;
using SmsApi.Services;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace SmsApi.Controllers
{
    [ApiController]
    [Route("api/behaviour")]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class BehaviourController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly ITenantContext _tenant;

        public BehaviourController(AppDbContext db, ITenantContext tenant)
        {
            _db = db;
            _tenant = tenant;
        }

        private Guid UserId => Guid.TryParse(
            User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

        // ── List records (admin / teacher view) ────────────────────────────────

        [HttpGet]
        [Authorize(Roles = "Admin,Principal,Teacher,Staff,SuperAdmin")]
        public async Task<IActionResult> GetRecords(
            [FromQuery] Guid? studentId,
            [FromQuery] string? incidentType,
            [FromQuery] string? status,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var query = _db.BehaviourRecords
                .AsNoTracking()
                .Include(b => b.Student)
                .Include(b => b.ReportedByStaff)
                .Where(b => b.SchoolId == schoolId && !b.IsDeleted);

            if (studentId.HasValue) query = query.Where(b => b.StudentId == studentId.Value);
            if (!string.IsNullOrEmpty(incidentType)) query = query.Where(b => b.IncidentType == incidentType);
            if (!string.IsNullOrEmpty(status)) query = query.Where(b => b.Status == status);

            var total = await query.CountAsync();
            var records = await query
                .OrderByDescending(b => b.IncidentDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(b => new
                {
                    b.Id, b.IncidentType, b.Category, b.IncidentDate,
                    b.Description, b.ActionTaken, b.Points, b.Status,
                    b.ParentNotified, b.Resolution, b.ResolvedAt,
                    StudentName = b.Student != null ? $"{b.Student.FirstName} {b.Student.LastName}" : null,
                    StudentAdmissionNumber = b.Student != null ? b.Student.AdmissionNumber : null,
                    ReportedBy = b.ReportedByStaff != null ? $"{b.ReportedByStaff.FirstName} {b.ReportedByStaff.LastName}" : null,
                })
                .ToListAsync();

            return Ok(new { items = records, totalCount = total, page, pageSize, totalPages = (int)Math.Ceiling((double)total / pageSize) });
        }

        // ── Student summary (for student/parent portal) ────────────────────────

        [HttpGet("student/{studentId:guid}/summary")]
        [Authorize(Roles = "Admin,Principal,Teacher,Staff,SuperAdmin,Student,Parent")]
        public async Task<IActionResult> GetStudentSummary(Guid studentId)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var role     = _tenant.Role ?? string.Empty;

            // Student role: can only view own behaviour
            if (role.Equals("Student", StringComparison.OrdinalIgnoreCase))
            {
                var linkedId = Guid.TryParse(User.FindFirstValue("LinkedEntityId"), out var lid) ? lid : Guid.Empty;
                if (linkedId == Guid.Empty || linkedId != studentId)
                    return StatusCode(403, new { message = "Students can only view their own behaviour record." });
            }

            // Parent role: can only view their children's behaviour
            if (role.Equals("Parent", StringComparison.OrdinalIgnoreCase))
            {
                var parentEmail = User.FindFirstValue(ClaimTypes.Email) ?? string.Empty;
                var isMyChild = await _db.StudentGuardians
                    .AnyAsync(sg => sg.SchoolId == schoolId && !sg.IsDeleted
                                 && sg.StudentId == studentId
                                 && sg.Email != null && sg.Email.ToLower() == parentEmail.ToLower());
                if (!isMyChild)
                    return StatusCode(403, new { message = "Parents can only view their own children's behaviour." });
            }

            var records = await _db.BehaviourRecords
                .AsNoTracking()
                .Where(b => b.SchoolId == schoolId && b.StudentId == studentId && !b.IsDeleted)
                .OrderByDescending(b => b.IncidentDate)
                .Select(b => new
                {
                    b.Id, b.IncidentType, b.Category, b.IncidentDate,
                    b.Description, b.ActionTaken, b.Points, b.Status, b.ParentNotified,
                })
                .ToListAsync();

            var totalPoints    = records.Sum(r => r.Points);
            var meritCount     = records.Count(r => r.IncidentType == "positive");
            var demeritCount   = records.Count(r => r.IncidentType == "negative");
            var openCount      = records.Count(r => r.Status == "open");

            return Ok(new { totalPoints, meritCount, demeritCount, openCount, records });
        }

        // ── Create record ──────────────────────────────────────────────────────

        [HttpPost]
        [Authorize(Roles = "Admin,Principal,Teacher,Staff,SuperAdmin")]
        public async Task<IActionResult> CreateRecord([FromBody] CreateBehaviourRequest req)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var schoolId = _tenant.GetEffectiveSchoolId();

            // Resolve staff ID from linked entity or current user
            var staffId = Guid.TryParse(User.FindFirstValue("LinkedEntityId"), out var lid) ? lid : Guid.Empty;
            if (staffId == Guid.Empty)
            {
                staffId = await _db.StaffMembers
                    .Where(s => s.SchoolId == schoolId && s.Email == User.FindFirstValue(ClaimTypes.Email) && !s.IsDeleted)
                    .Select(s => s.Id)
                    .FirstOrDefaultAsync();
            }

            var record = new BehaviourRecord
            {
                SchoolId            = schoolId,
                StudentId           = req.StudentId,
                ReportedByStaffId   = staffId,
                IncidentType        = req.IncidentType,
                Category            = req.Category,
                IncidentDate        = req.IncidentDate,
                Description         = req.Description,
                ActionTaken         = req.ActionTaken,
                Points              = req.Points,
                Status              = "open",
                ParentNotified      = false,
                CreatedBy           = UserId,
            };

            _db.BehaviourRecords.Add(record);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(GetRecords), new { }, new { record.Id });
        }

        // ── Resolve record ─────────────────────────────────────────────────────

        [HttpPut("{id:guid}/resolve")]
        [Authorize(Roles = "Admin,Principal,Teacher,Staff,SuperAdmin")]
        public async Task<IActionResult> ResolveRecord(Guid id, [FromBody] ResolveRecordRequest req)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var record = await _db.BehaviourRecords
                .FirstOrDefaultAsync(b => b.Id == id && b.SchoolId == schoolId && !b.IsDeleted);

            if (record == null) return NotFound();
            record.Status       = "resolved";
            record.Resolution   = req.Resolution;
            record.ResolvedAt   = DateTime.UtcNow;
            record.ParentNotified = req.ParentNotified;
            record.UpdatedAt    = DateTime.UtcNow;
            record.UpdatedBy    = UserId;

            await _db.SaveChangesAsync();
            return Ok(new { record.Id, record.Status });
        }

        // ── Analytics ──────────────────────────────────────────────────────────

        [HttpGet("analytics")]
        [Authorize(Roles = "Admin,Principal,SuperAdmin")]
        public async Task<IActionResult> GetAnalytics([FromQuery] int days = 30)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var since = DateTime.UtcNow.AddDays(-days).Date;

            var records = await _db.BehaviourRecords
                .AsNoTracking()
                .Where(b => b.SchoolId == schoolId && b.IncidentDate >= since && !b.IsDeleted)
                .ToListAsync();

            var byCategory = records
                .GroupBy(r => r.Category)
                .Select(g => new { Category = g.Key, Count = g.Count(), TotalPoints = g.Sum(r => r.Points) })
                .OrderByDescending(g => g.Count)
                .ToList();

            var byType = records
                .GroupBy(r => r.IncidentType)
                .Select(g => new { Type = g.Key, Count = g.Count() })
                .ToList();

            return Ok(new
            {
                period = $"Last {days} days",
                totalRecords = records.Count,
                merits   = records.Count(r => r.IncidentType == "positive"),
                demerits = records.Count(r => r.IncidentType == "negative"),
                open     = records.Count(r => r.Status == "open"),
                resolved = records.Count(r => r.Status == "resolved"),
                byCategory,
                byType,
            });
        }

        // ── Student self-service: GET /api/behaviour/student/me/summary ────────

        [HttpGet("student/me/summary")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> GetMyBehaviourSummary()
        {
            var linkedId = _tenant.LinkedEntityId;
            if (!linkedId.HasValue || linkedId == Guid.Empty)
                return StatusCode(403, new { message = "Student identity could not be resolved from token." });

            return await GetStudentSummary(linkedId.Value);
        }
    }

    // ── Request DTOs ─────────────────────────────────────────────────────────────

    public class CreateBehaviourRequest
    {
        [Required] public Guid StudentId { get; set; }
        [Required, MaxLength(20)] public string IncidentType { get; set; } = "negative";
        [Required, MaxLength(100)] public string Category { get; set; } = string.Empty;
        [Required] public DateTime IncidentDate { get; set; }
        [Required, MaxLength(2000)] public string Description { get; set; } = string.Empty;
        [MaxLength(200)] public string? ActionTaken { get; set; }
        public int Points { get; set; } = 0;
    }

    public class ResolveRecordRequest
    {
        [MaxLength(2000)] public string? Resolution { get; set; }
        public bool ParentNotified { get; set; } = false;
    }
}
