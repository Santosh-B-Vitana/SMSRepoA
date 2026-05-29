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
using System.Threading.Tasks;
namespace SmsApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class DiaryController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly ITenantContext _tenant;
        private readonly ILogger<DiaryController> _logger;

        public DiaryController(AppDbContext db, ITenantContext tenant, ILogger<DiaryController> logger)
        {
            _db = db;
            _tenant = tenant;
            _logger = logger;
        }

        private Guid SchoolId() => _tenant.GetEffectiveSchoolId();
        private Guid UserId() => _tenant.UserId;

        /// <summary>
        /// Returns all (parentUserLoginId, studentId) pairs for the given student,
        /// covering both the legacy StudentGuardians-email path and the new GuardianStudents path.
        /// </summary>
        private async Task<List<(Guid ParentId, Guid StudentId)>> GetParentStudentPairsForStudentAsync(Guid schoolId, Guid studentId)
        {
            // Path 1 (legacy): StudentGuardians email → UserLogins
            var guardianEmails = await _db.StudentGuardians
                .Where(sg => sg.StudentId == studentId && sg.SchoolId == schoolId && sg.Email != null)
                .Select(sg => sg.Email!.ToLower())
                .Distinct()
                .ToListAsync();

            var legacyIds = guardianEmails.Any()
                ? await _db.UserLogins
                    .Where(ul => ul.SchoolId == schoolId && guardianEmails.Contains(ul.Email.ToLower()))
                    .Select(ul => ul.Id)
                    .Distinct()
                    .ToListAsync()
                : new List<Guid>();

            // Path 2 (new): GuardianStudents → Guardian.UserLoginId
            var newIds = await _db.GuardianStudents
                .Where(gs => gs.StudentId == studentId && gs.SchoolId == schoolId)
                .Join(_db.Guardians, gs => gs.GuardianId, g => g.Id, (gs, g) => g.UserLoginId)
                .Where(uid => uid.HasValue)
                .Select(uid => uid!.Value)
                .Distinct()
                .ToListAsync();

            return legacyIds.Union(newIds).Distinct()
                .Select(uid => (ParentId: uid, StudentId: studentId))
                .ToList();
        }

        // ─────────────────────────────────────────────────────────────────────
        // DTOs (inline — no extra file needed for this feature)
        // ─────────────────────────────────────────────────────────────────────

        public record CreateDiaryDto(
            string Title,
            string Content,
            string Category,
            string DiaryType,       // "class" | "individual"
            Guid? ClassId,
            Guid? SectionId,
            Guid? StudentId,
            DateTime? DiaryDate,
            bool IsVisibleToParent,
            bool NotifyParent,
            string? Priority,
            string? ColorTag,
            string? AttachmentUrl,
            string? AttachmentName
        );

        public record UpdateDiaryDto(
            string? Title,
            string? Content,
            string? Category,
            bool? IsVisibleToParent,
            bool? NotifyParent,
            string? Priority,
            string? ColorTag,
            string? AttachmentUrl,
            string? AttachmentName
        );

        private object ProjectEntry(StudentDiary e) => new
        {
            e.Id,
            e.StaffId,
            staffName = e.Staff != null ? $"{e.Staff.FirstName} {e.Staff.LastName}".Trim() : null,
            e.Title,
            e.Content,
            e.Category,
            e.ColorTag,
            e.DiaryType,
            e.ClassId,
            className = e.Class != null ? e.Class.Name : null,
            e.SectionId,
            sectionName = e.Section != null ? e.Section.Name : null,
            e.StudentId,
            studentName = e.Student != null ? $"{e.Student.FirstName} {e.Student.LastName}".Trim() : null,
            diaryDate = e.DiaryDate.ToString("yyyy-MM-dd"),
            e.IsVisibleToParent,
            e.NotifyParent,
            e.Priority,
            e.AttachmentUrl,
            e.AttachmentName,
            e.CreatedAt,
            e.UpdatedAt,
        };

        // ─────────────────────────────────────────────────────────────────────
        // GET /api/Diary  — list entries (staff-facing)
        // Filters: classId, sectionId, studentId, fromDate, toDate, category, diaryType
        // ─────────────────────────────────────────────────────────────────────
        [HttpGet]
        [Authorize(Roles = "Admin,Principal,Teacher,Staff")]
        public async Task<IActionResult> GetEntries(
            [FromQuery] Guid? classId = null,
            [FromQuery] Guid? sectionId = null,
            [FromQuery] Guid? studentId = null,
            [FromQuery] string? category = null,
            [FromQuery] string? diaryType = null,
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            var schoolId = SchoolId();
            var q = _db.StudentDiaries
                .Include(e => e.Staff)
                .Include(e => e.Class)
                .Include(e => e.Section)
                .Include(e => e.Student)
                .Where(e => e.SchoolId == schoolId);

            if (classId.HasValue)   q = q.Where(e => e.ClassId == classId);
            if (sectionId.HasValue) q = q.Where(e => e.SectionId == sectionId);
            if (studentId.HasValue) q = q.Where(e => e.StudentId == studentId || (e.DiaryType == "class" && e.Student == null));
            if (!string.IsNullOrWhiteSpace(category)) q = q.Where(e => e.Category == category);
            if (!string.IsNullOrWhiteSpace(diaryType)) q = q.Where(e => e.DiaryType == diaryType);
            if (fromDate.HasValue) q = q.Where(e => e.DiaryDate.Date >= fromDate.Value.Date);
            if (toDate.HasValue)   q = q.Where(e => e.DiaryDate.Date <= toDate.Value.Date);

            var total = await q.CountAsync();
            var entries = await q
                .OrderByDescending(e => e.DiaryDate)
                .ThenByDescending(e => e.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(new { total, page, pageSize, entries = entries.Select(ProjectEntry) });
        }

        // ─────────────────────────────────────────────────────────────────────
        // GET /api/Diary/{id}
        // ─────────────────────────────────────────────────────────────────────
        [HttpGet("{id:guid}")]
        [Authorize(Roles = "Admin,Principal,Teacher,Staff")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var schoolId = SchoolId();
            var entry = await _db.StudentDiaries
                .Include(e => e.Staff)
                .Include(e => e.Class)
                .Include(e => e.Section)
                .Include(e => e.Student)
                .FirstOrDefaultAsync(e => e.Id == id && e.SchoolId == schoolId);
            if (entry == null) return NotFound();
            return Ok(ProjectEntry(entry));
        }

        // ─────────────────────────────────────────────────────────────────────
        // GET /api/Diary/class/{classId}  — all entries for a class (optionally filtered by section)
        // ─────────────────────────────────────────────────────────────────────
        [HttpGet("class/{classId:guid}")]
        [Authorize(Roles = "Admin,Principal,Teacher,Staff")]
        public async Task<IActionResult> GetByClass(
            Guid classId,
            [FromQuery] Guid? sectionId = null,
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null)
        {
            var schoolId = SchoolId();

            // ── Resolve student IDs for this class using BOTH lookup strategies ─────────
            // Strategy 1: FK-based enrollment (StudentEnrollment table)
            var enrolledStudentIds = await _db.StudentEnrollments
                .Where(se => se.SchoolId == schoolId &&
                             se.ClassId == classId &&
                             (sectionId == null || se.SectionId == sectionId) &&
                             se.Status == "active")
                .Select(se => se.StudentId)
                .Distinct()
                .ToListAsync();

            // Strategy 2: Legacy string-based lookup (Student.Class / Student.Section)
            // The student-picker in the diary form uses the legacy classFilter string,
            // so students may not have a StudentEnrollment row yet.
            var classEntity = await _db.Classes
                .Where(c => c.Id == classId)
                .Select(c => new { c.Name })
                .FirstOrDefaultAsync();

            if (classEntity != null)
            {
                var sectionName = sectionId.HasValue
                    ? await _db.Sections
                        .Where(s => s.Id == sectionId.Value)
                        .Select(s => s.Name)
                        .FirstOrDefaultAsync()
                    : null;

                var legacyStudentIds = await _db.Students
                    .Where(s => s.SchoolId == schoolId &&
                                s.Class == classEntity.Name &&
                                (sectionName == null || s.Section == sectionName))
                    .Select(s => s.Id)
                    .ToListAsync();

                enrolledStudentIds = enrolledStudentIds.Union(legacyStudentIds).Distinct().ToList();
            }
            // ─────────────────────────────────────────────────────────────────────────────

            var q = _db.StudentDiaries
                .Include(e => e.Staff)
                .Include(e => e.Class)
                .Include(e => e.Section)
                .Include(e => e.Student)
                .Where(e => e.SchoolId == schoolId && (
                    // Standard: entry has the classId stored directly
                    e.ClassId == classId ||
                    // Fallback: individual entry linked to any student in this class
                    (e.DiaryType == "individual" && e.StudentId.HasValue && enrolledStudentIds.Contains(e.StudentId.Value))
                ));

            if (sectionId.HasValue) q = q.Where(e => e.SectionId == sectionId || e.DiaryType == "individual");
            if (fromDate.HasValue)  q = q.Where(e => e.DiaryDate.Date >= fromDate.Value.Date);
            if (toDate.HasValue)    q = q.Where(e => e.DiaryDate.Date <= toDate.Value.Date);

            var entries = await q
                .OrderByDescending(e => e.DiaryDate)
                .ThenByDescending(e => e.CreatedAt)
                .Take(200)
                .ToListAsync();
            return Ok(entries.Select(ProjectEntry));
        }

        // ─────────────────────────────────────────────────────────────────────
        // GET /api/Diary/student/{studentId}  — all entries for a student (class + individual)
        // Staff access
        // ─────────────────────────────────────────────────────────────────────
        [HttpGet("student/{studentId:guid}")]
        [Authorize(Roles = "Admin,Principal,Teacher,Staff")]
        public async Task<IActionResult> GetByStudent(
            Guid studentId,
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null)
        {
            var schoolId = SchoolId();

            // Find the student's current class/section
            var enrollment = await _db.StudentEnrollments
                .Where(se => se.SchoolId == schoolId && se.StudentId == studentId && se.Status == "active")
                .OrderByDescending(se => se.EnrollmentDate)
                .FirstOrDefaultAsync();

            var q = _db.StudentDiaries
                .Include(e => e.Staff)
                .Include(e => e.Class)
                .Include(e => e.Section)
                .Where(e => e.SchoolId == schoolId && (
                    e.StudentId == studentId ||
                    (e.DiaryType == "class" && enrollment != null &&
                     e.ClassId == enrollment.ClassId &&
                     (e.SectionId == null || e.SectionId == enrollment.SectionId))
                ));

            if (fromDate.HasValue) q = q.Where(e => e.DiaryDate.Date >= fromDate.Value.Date);
            if (toDate.HasValue)   q = q.Where(e => e.DiaryDate.Date <= toDate.Value.Date);

            var entries = await q
                .OrderByDescending(e => e.DiaryDate)
                .ThenByDescending(e => e.CreatedAt)
                .Take(200)
                .ToListAsync();
            return Ok(entries.Select(ProjectEntry));
        }

        // ─────────────────────────────────────────────────────────────────────
        // GET /api/Diary/parent/child/{studentId}  — parent portal (only visible entries)
        // ─────────────────────────────────────────────────────────────────────
        [HttpGet("parent/child/{studentId:guid}")]
        [Authorize(Roles = "Parent,Admin,Principal")]
        public async Task<IActionResult> GetForParent(
            Guid studentId,
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            [FromQuery] string? category = null)
        {
            var schoolId = SchoolId();

            // Find the student's current class/section
            var enrollment = await _db.StudentEnrollments
                .Where(se => se.SchoolId == schoolId && se.StudentId == studentId && se.Status == "active")
                .OrderByDescending(se => se.EnrollmentDate)
                .FirstOrDefaultAsync();

            var q = _db.StudentDiaries
                .Include(e => e.Staff)
                .Include(e => e.Class)
                .Include(e => e.Section)
                .Include(e => e.Student)
                .Where(e => e.SchoolId == schoolId &&
                            e.IsVisibleToParent &&
                            (
                                e.StudentId == studentId ||
                                (e.DiaryType == "class" && enrollment != null &&
                                 e.ClassId == enrollment.ClassId &&
                                 (e.SectionId == null || e.SectionId == enrollment.SectionId))
                            ));

            if (fromDate.HasValue) q = q.Where(e => e.DiaryDate.Date >= fromDate.Value.Date);
            if (toDate.HasValue)   q = q.Where(e => e.DiaryDate.Date <= toDate.Value.Date);
            if (!string.IsNullOrWhiteSpace(category)) q = q.Where(e => e.Category == category);

            var entries = await q
                .OrderByDescending(e => e.DiaryDate)
                .ThenByDescending(e => e.CreatedAt)
                .Take(300)
                .ToListAsync();
            return Ok(entries.Select(ProjectEntry));
        }

        // ─────────────────────────────────────────────────────────────────────
        // POST /api/Diary
        // ─────────────────────────────────────────────────────────────────────
        [HttpPost]
        [Authorize(Roles = "Admin,Principal,Teacher,Staff")]
        public async Task<IActionResult> Create([FromBody] CreateDiaryDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Title) || string.IsNullOrWhiteSpace(dto.Content))
                return BadRequest("Title and content are required.");

            var staffId = await ResolveStaffId();
            if (staffId == null) return Unauthorized("Staff profile not found.");

            var entry = new StudentDiary
            {
                SchoolId = SchoolId(),
                StaffId = staffId.Value,
                Title = dto.Title.Trim(),
                Content = dto.Content.Trim(),
                Category = dto.Category ?? "note",
                DiaryType = dto.DiaryType ?? "class",
                ClassId = dto.ClassId,
                SectionId = dto.SectionId,
                StudentId = dto.StudentId,
                DiaryDate = (dto.DiaryDate ?? DateTime.UtcNow).Date,
                IsVisibleToParent = dto.IsVisibleToParent,
                NotifyParent = dto.NotifyParent,
                Priority = dto.Priority ?? "normal",
                ColorTag = dto.ColorTag,
                AttachmentUrl = dto.AttachmentUrl,
                AttachmentName = dto.AttachmentName,
            };

            _db.StudentDiaries.Add(entry);
            await _db.SaveChangesAsync();

            // Reload with navigation properties
            await _db.Entry(entry).Reference(e => e.Staff).LoadAsync();
            await _db.Entry(entry).Reference(e => e.Class).LoadAsync();
            await _db.Entry(entry).Reference(e => e.Section).LoadAsync();
            await _db.Entry(entry).Reference(e => e.Student).LoadAsync();

            // ── Notify parents if NotifyParent is set ─────────────────────────
            if (entry.NotifyParent && entry.IsVisibleToParent)
            {
                var notifSchoolId = SchoolId();
                // Build list of (parentUserId, studentId) pairs so each notification is tagged
                // with the correct child — enabling per-child filtering on the parent portal.
                List<(Guid ParentId, Guid StudentId)> parentStudentPairs;

                if (entry.DiaryType == "individual" && entry.StudentId.HasValue)
                {
                    var sid = entry.StudentId.Value;
                    parentStudentPairs = await GetParentStudentPairsForStudentAsync(notifSchoolId, sid);
                }
                else if (entry.DiaryType == "class" && entry.ClassId.HasValue)
                {
                    // Collect all student IDs enrolled in this class/section
                    var classStudentIds = await _db.StudentEnrollments
                        .Where(se => se.SchoolId == notifSchoolId &&
                                     se.ClassId == entry.ClassId.Value &&
                                     (entry.SectionId == null || se.SectionId == entry.SectionId) &&
                                     se.Status == "active")
                        .Select(se => se.StudentId)
                        .Distinct()
                        .ToListAsync();

                    // Legacy string-based student fallback
                    var classEntity = await _db.Classes
                        .Where(c => c.Id == entry.ClassId.Value)
                        .Select(c => new { c.Name })
                        .FirstOrDefaultAsync();
                    if (classEntity != null)
                    {
                        var sectionName = entry.SectionId.HasValue
                            ? await _db.Sections
                                .Where(s => s.Id == entry.SectionId.Value)
                                .Select(s => s.Name)
                                .FirstOrDefaultAsync()
                            : null;
                        var legacyStudentIds = await _db.Students
                            .Where(s => s.SchoolId == notifSchoolId &&
                                        s.Class == classEntity.Name &&
                                        (sectionName == null || s.Section == sectionName))
                            .Select(s => s.Id)
                            .ToListAsync();
                        classStudentIds = classStudentIds.Union(legacyStudentIds).Distinct().ToList();
                    }

                    // Build parent→student pairs for all students in this class
                    parentStudentPairs = new List<(Guid, Guid)>();
                    foreach (var sid in classStudentIds)
                    {
                        var pairs = await GetParentStudentPairsForStudentAsync(notifSchoolId, sid);
                        parentStudentPairs.AddRange(pairs);
                    }
                    parentStudentPairs = parentStudentPairs.Distinct().ToList();
                }
                else
                {
                    parentStudentPairs = new List<(Guid, Guid)>();
                }

                if (parentStudentPairs.Count > 0)
                {
                    var staffName = entry.Staff != null
                        ? $"{entry.Staff.FirstName} {entry.Staff.LastName}".Trim()
                        : "Staff";

                    var shortContent = entry.Content.Length > 150
                        ? entry.Content[..150] + "…"
                        : entry.Content;

                    var priority = (entry.Priority?.ToLower()) switch
                    {
                        "high"   => "High",
                        "urgent" => "Urgent",
                        "low"    => "Low",
                        _        => "Normal",
                    };

                    var notifs = parentStudentPairs.Select(pair => new Notification
                    {
                        SchoolId      = SchoolId(),
                        RecipientId   = pair.ParentId,
                        RecipientType = "Parent",
                        SenderId      = UserId(),
                        SenderName    = staffName,
                        Type          = "Diary",
                        Title         = entry.Title,
                        Content       = shortContent,
                        ReferenceId   = entry.Id,
                        ReferenceType = "Diary",
                        Priority      = priority,
                        ActionUrl     = "/parent-diary",
                        StudentId     = pair.StudentId,
                    }).ToList();

                    _db.Notifications.AddRange(notifs);
                    await _db.SaveChangesAsync();
                }
            }

            return CreatedAtAction(nameof(GetById), new { id = entry.Id }, ProjectEntry(entry));
        }

        // ─────────────────────────────────────────────────────────────────────
        // PUT /api/Diary/{id}
        // ─────────────────────────────────────────────────────────────────────
        [HttpPut("{id:guid}")]
        [Authorize(Roles = "Admin,Principal,Teacher,Staff")]
        public async Task<IActionResult> Update(Guid id, [FromBody] UpdateDiaryDto dto)
        {
            var schoolId = SchoolId();
            var entry = await _db.StudentDiaries
                .FirstOrDefaultAsync(e => e.Id == id && e.SchoolId == schoolId);
            if (entry == null) return NotFound();

            if (dto.Title != null) entry.Title = dto.Title.Trim();
            if (dto.Content != null) entry.Content = dto.Content.Trim();
            if (dto.Category != null) entry.Category = dto.Category;
            if (dto.IsVisibleToParent.HasValue) entry.IsVisibleToParent = dto.IsVisibleToParent.Value;
            if (dto.NotifyParent.HasValue) entry.NotifyParent = dto.NotifyParent.Value;
            if (dto.Priority != null) entry.Priority = dto.Priority;
            if (dto.ColorTag != null) entry.ColorTag = dto.ColorTag;
            if (dto.AttachmentUrl != null) entry.AttachmentUrl = dto.AttachmentUrl;
            if (dto.AttachmentName != null) entry.AttachmentName = dto.AttachmentName;

            await _db.SaveChangesAsync();

            await _db.Entry(entry).Reference(e => e.Staff).LoadAsync();
            await _db.Entry(entry).Reference(e => e.Class).LoadAsync();
            await _db.Entry(entry).Reference(e => e.Section).LoadAsync();
            await _db.Entry(entry).Reference(e => e.Student).LoadAsync();

            return Ok(ProjectEntry(entry));
        }

        // ─────────────────────────────────────────────────────────────────────
        // DELETE /api/Diary/{id}
        // ─────────────────────────────────────────────────────────────────────
        [HttpDelete("{id:guid}")]
        [Authorize(Roles = "Admin,Principal,Teacher,Staff")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var schoolId = SchoolId();
            var entry = await _db.StudentDiaries
                .FirstOrDefaultAsync(e => e.Id == id && e.SchoolId == schoolId);
            if (entry == null) return NotFound();

            _db.StudentDiaries.Remove(entry);   // soft-delete via SaveChanges interceptor
            await _db.SaveChangesAsync();
            return NoContent();
        }

        // ─────────────────────────────────────────────────────────────────────
        // Helpers
        // ─────────────────────────────────────────────────────────────────────
        private async Task<Guid?> ResolveStaffId()
        {
            try
            {
                var schoolId = SchoolId();
                // Try: UserLogin.LinkedEntityId → Staff.Id (fastest path)
                var userLogin = await _db.Set<UserLogin>()
                    .FirstOrDefaultAsync(u => u.Id == UserId());
                if (userLogin?.LinkedEntityId != null)
                    return userLogin.LinkedEntityId;

                // Fallback: match by email
                var email = _tenant.UserEmail;
                if (!string.IsNullOrEmpty(email))
                {
                    var staff = await _db.StaffMembers
                        .FirstOrDefaultAsync(s => s.SchoolId == schoolId && s.Email == email);
                    return staff?.Id;
                }
                return null;
            }
            catch
            {
                return null;
            }
        }
    }
}
