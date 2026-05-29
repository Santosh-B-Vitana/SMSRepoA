using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;

namespace SmsApi.Services
{
    public interface ISyllabusService
    {
        // ── Units ──────────────────────────────────────────────────────────
        Task<List<SyllabusUnitResponse>> GetUnitsAsync(Guid schoolId, Guid classId, Guid subjectId, string academicYear, bool includeTopics = false);
        Task<SyllabusUnitResponse?> GetUnitByIdAsync(Guid id, Guid schoolId, bool includeTopics = true);
        Task<SyllabusUnitResponse> CreateUnitAsync(Guid schoolId, CreateSyllabusUnitRequest request);
        Task<SyllabusUnitResponse?> UpdateUnitAsync(Guid id, Guid schoolId, UpdateSyllabusUnitRequest request);
        Task<bool> DeleteUnitAsync(Guid id, Guid schoolId);

        // ── Topics ─────────────────────────────────────────────────────────
        Task<List<SyllabusTopicResponse>> GetTopicsAsync(Guid unitId, Guid schoolId);
        Task<SyllabusTopicResponse?> GetTopicByIdAsync(Guid id, Guid schoolId);
        Task<SyllabusTopicResponse> CreateTopicAsync(Guid schoolId, CreateSyllabusTopicRequest request);
        Task<SyllabusTopicResponse?> UpdateTopicAsync(Guid id, Guid schoolId, UpdateSyllabusTopicRequest request);
        Task<SyllabusTopicResponse?> MarkTopicCompleteAsync(Guid id, Guid schoolId, Guid staffId, MarkTopicCompleteRequest request);
        Task<bool> DeleteTopicAsync(Guid id, Guid schoolId);

        // ── Lesson Plans ───────────────────────────────────────────────────
        Task<LessonPlanListResponse> GetLessonPlansAsync(Guid schoolId, Guid? staffId, Guid? classId, DateTime? fromDate, DateTime? toDate, string? status, int page, int pageSize);
        Task<LessonPlanResponse?> GetLessonPlanByIdAsync(Guid id, Guid schoolId);
        Task<LessonPlanResponse> CreateLessonPlanAsync(Guid schoolId, Guid? staffId, CreateLessonPlanRequest request);
        Task<LessonPlanResponse?> UpdateLessonPlanAsync(Guid id, Guid schoolId, Guid staffId, UpdateLessonPlanRequest request);
        Task<LessonPlanResponse?> ApproveLessonPlanAsync(Guid id, Guid schoolId, Guid approverStaffId, ApproveLessonPlanRequest request);
        Task<bool> DeleteLessonPlanAsync(Guid id, Guid schoolId);

        // ── Reports ────────────────────────────────────────────────────────
        Task<SyllabusCoverageReport> GetCoverageReportAsync(Guid schoolId, Guid classId, Guid subjectId, string academicYear);
    }

    public class SyllabusService : ISyllabusService
    {
        private readonly AppDbContext _db;
        private readonly ILogger<SyllabusService> _logger;

        public SyllabusService(AppDbContext db, ILogger<SyllabusService> logger)
        {
            _db = db;
            _logger = logger;
        }

        // ═══════════════════════════════════════════════════════════════════
        // UNITS
        // ═══════════════════════════════════════════════════════════════════

        public async Task<List<SyllabusUnitResponse>> GetUnitsAsync(Guid schoolId, Guid classId, Guid subjectId, string academicYear, bool includeTopics = false)
        {
            var query = _db.SyllabusUnits
                .Where(u => u.SchoolId == schoolId && u.ClassId == classId
                            && u.SubjectId == subjectId && u.AcademicYear == academicYear)
                .OrderBy(u => u.UnitNumber)
                .AsQueryable();

            if (includeTopics)
                query = query.Include(u => u.Topics.OrderBy(t => t.TopicNumber));

            var units = await query
                .Include(u => u.ClassRef)
                .Include(u => u.SubjectRef)
                .ToListAsync();

            return units.Select(MapUnit).ToList();
        }

        public async Task<SyllabusUnitResponse?> GetUnitByIdAsync(Guid id, Guid schoolId, bool includeTopics = true)
        {
            var q = _db.SyllabusUnits
                .Include(u => u.ClassRef)
                .Include(u => u.SubjectRef)
                .AsQueryable();

            if (includeTopics)
                q = q.Include(u => u.Topics.OrderBy(t => t.TopicNumber))
                     .ThenInclude(t => t.CompletedByStaff);

            var unit = await q.FirstOrDefaultAsync(u => u.Id == id && u.SchoolId == schoolId);
            return unit == null ? null : MapUnit(unit);
        }

        public async Task<SyllabusUnitResponse> CreateUnitAsync(Guid schoolId, CreateSyllabusUnitRequest request)
        {
            // Prevent duplicate unit numbers within same class/subject/year
            var duplicate = await _db.SyllabusUnits.AnyAsync(u =>
                u.SchoolId == schoolId && u.ClassId == request.ClassId &&
                u.SubjectId == request.SubjectId && u.AcademicYear == request.AcademicYear &&
                u.UnitNumber == request.UnitNumber);

            if (duplicate)
                throw new InvalidOperationException($"Unit number {request.UnitNumber} already exists for this class/subject/year.");

            var unit = new SyllabusUnit
            {
                SchoolId = schoolId,
                ClassId = request.ClassId,
                SubjectId = request.SubjectId,
                AcademicYear = request.AcademicYear,
                UnitNumber = request.UnitNumber,
                Title = request.Title,
                Description = request.Description,
                PlannedHours = request.PlannedHours,
                PlannedStartDate = request.PlannedStartDate,
                PlannedEndDate = request.PlannedEndDate,
                Status = "pending"
            };

            _db.SyllabusUnits.Add(unit);
            await _db.SaveChangesAsync();

            return (await GetUnitByIdAsync(unit.Id, schoolId, false))!;
        }

        public async Task<SyllabusUnitResponse?> UpdateUnitAsync(Guid id, Guid schoolId, UpdateSyllabusUnitRequest request)
        {
            var unit = await _db.SyllabusUnits.FirstOrDefaultAsync(u => u.Id == id && u.SchoolId == schoolId);
            if (unit == null) return null;

            if (request.Title != null) unit.Title = request.Title;
            if (request.Description != null) unit.Description = request.Description;
            if (request.UnitNumber.HasValue) unit.UnitNumber = request.UnitNumber.Value;
            if (request.PlannedHours.HasValue) unit.PlannedHours = request.PlannedHours;
            if (request.PlannedStartDate.HasValue) unit.PlannedStartDate = request.PlannedStartDate;
            if (request.PlannedEndDate.HasValue) unit.PlannedEndDate = request.PlannedEndDate;
            if (request.ActualStartDate.HasValue) unit.ActualStartDate = request.ActualStartDate;
            if (request.ActualEndDate.HasValue) unit.ActualEndDate = request.ActualEndDate;
            if (request.Status != null) unit.Status = request.Status;

            await _db.SaveChangesAsync();
            return await GetUnitByIdAsync(id, schoolId, true);
        }

        public async Task<bool> DeleteUnitAsync(Guid id, Guid schoolId)
        {
            var unit = await _db.SyllabusUnits.FirstOrDefaultAsync(u => u.Id == id && u.SchoolId == schoolId);
            if (unit == null) return false;
            _db.SyllabusUnits.Remove(unit);
            await _db.SaveChangesAsync();
            return true;
        }

        // ═══════════════════════════════════════════════════════════════════
        // TOPICS
        // ═══════════════════════════════════════════════════════════════════

        public async Task<List<SyllabusTopicResponse>> GetTopicsAsync(Guid unitId, Guid schoolId)
        {
            var topics = await _db.SyllabusTopics
                .Include(t => t.CompletedByStaff)
                .Where(t => t.UnitId == unitId && t.SchoolId == schoolId)
                .OrderBy(t => t.TopicNumber)
                .ToListAsync();

            return topics.Select(MapTopic).ToList();
        }

        public async Task<SyllabusTopicResponse?> GetTopicByIdAsync(Guid id, Guid schoolId)
        {
            var topic = await _db.SyllabusTopics
                .Include(t => t.CompletedByStaff)
                .FirstOrDefaultAsync(t => t.Id == id && t.SchoolId == schoolId);

            return topic == null ? null : MapTopic(topic);
        }

        public async Task<SyllabusTopicResponse> CreateTopicAsync(Guid schoolId, CreateSyllabusTopicRequest request)
        {
            var unit = await _db.SyllabusUnits.FirstOrDefaultAsync(u => u.Id == request.UnitId && u.SchoolId == schoolId);
            if (unit == null) throw new InvalidOperationException("Syllabus unit not found.");

            var duplicate = await _db.SyllabusTopics.AnyAsync(t =>
                t.UnitId == request.UnitId && t.TopicNumber == request.TopicNumber);

            if (duplicate)
                throw new InvalidOperationException($"Topic number {request.TopicNumber} already exists in this unit.");

            var topic = new SyllabusTopic
            {
                SchoolId = schoolId,
                UnitId = request.UnitId,
                TopicNumber = request.TopicNumber,
                Title = request.Title,
                Description = request.Description,
                DurationMinutes = request.DurationMinutes,
                ResourceReferences = request.ResourceReferences,
                Status = "pending"
            };

            _db.SyllabusTopics.Add(topic);

            // Update unit topic count
            unit.TotalTopics += 1;

            await _db.SaveChangesAsync();
            return MapTopic(topic);
        }

        public async Task<SyllabusTopicResponse?> UpdateTopicAsync(Guid id, Guid schoolId, UpdateSyllabusTopicRequest request)
        {
            var topic = await _db.SyllabusTopics.FirstOrDefaultAsync(t => t.Id == id && t.SchoolId == schoolId);
            if (topic == null) return null;

            if (request.Title != null) topic.Title = request.Title;
            if (request.Description != null) topic.Description = request.Description;
            if (request.TopicNumber.HasValue) topic.TopicNumber = request.TopicNumber.Value;
            if (request.DurationMinutes.HasValue) topic.DurationMinutes = request.DurationMinutes;
            if (request.ResourceReferences != null) topic.ResourceReferences = request.ResourceReferences;
            if (request.Status != null) topic.Status = request.Status;

            await _db.SaveChangesAsync();
            return await GetTopicByIdAsync(id, schoolId);
        }

        public async Task<SyllabusTopicResponse?> MarkTopicCompleteAsync(Guid id, Guid schoolId, Guid staffId, MarkTopicCompleteRequest request)
        {
            var topic = await _db.SyllabusTopics
                .Include(t => t.Unit)
                .FirstOrDefaultAsync(t => t.Id == id && t.SchoolId == schoolId);

            if (topic == null) return null;

            var wasComplete = topic.Status == "completed";

            topic.Status = "completed";
            topic.CompletedDate = request.CompletedDate;
            topic.CompletedByStaffId = staffId;
            topic.CompletionRemarks = request.Remarks;

            // Update unit completed count
            if (!wasComplete && topic.Unit != null)
            {
                topic.Unit.CompletedTopics += 1;
                if (topic.Unit.CompletedTopics >= topic.Unit.TotalTopics)
                    topic.Unit.Status = "completed";
                else
                    topic.Unit.Status = "in_progress";
            }

            await _db.SaveChangesAsync();
            return await GetTopicByIdAsync(id, schoolId);
        }

        public async Task<bool> DeleteTopicAsync(Guid id, Guid schoolId)
        {
            var topic = await _db.SyllabusTopics
                .Include(t => t.Unit)
                .FirstOrDefaultAsync(t => t.Id == id && t.SchoolId == schoolId);

            if (topic == null) return false;

            // Update unit counters
            if (topic.Unit != null)
            {
                topic.Unit.TotalTopics = Math.Max(0, topic.Unit.TotalTopics - 1);
                if (topic.Status == "completed")
                    topic.Unit.CompletedTopics = Math.Max(0, topic.Unit.CompletedTopics - 1);
            }

            _db.SyllabusTopics.Remove(topic);
            await _db.SaveChangesAsync();
            return true;
        }

        // ═══════════════════════════════════════════════════════════════════
        // LESSON PLANS
        // ═══════════════════════════════════════════════════════════════════

        public async Task<LessonPlanListResponse> GetLessonPlansAsync(
            Guid schoolId, Guid? staffId, Guid? classId, DateTime? fromDate, DateTime? toDate,
            string? status, int page, int pageSize)
        {
            var query = _db.LessonPlans
                .Include(p => p.Staff)
                .Include(p => p.ClassRef)
                .Include(p => p.SectionRef)
                .Include(p => p.SubjectRef)
                .Include(p => p.Topic)
                .Where(p => p.SchoolId == schoolId);

            if (staffId.HasValue) query = query.Where(p => p.StaffId == staffId.Value);
            if (classId.HasValue) query = query.Where(p => p.ClassId == classId.Value);
            if (fromDate.HasValue) query = query.Where(p => p.Date >= fromDate.Value.Date);
            if (toDate.HasValue) query = query.Where(p => p.Date <= toDate.Value.Date);
            if (!string.IsNullOrWhiteSpace(status)) query = query.Where(p => p.Status == status);

            var total = await query.CountAsync();
            var plans = await query
                .OrderByDescending(p => p.Date)
                .ThenBy(p => p.PeriodNumber)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new LessonPlanListResponse
            {
                Plans = plans.Select(MapLessonPlan).ToList(),
                Total = total,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<LessonPlanResponse?> GetLessonPlanByIdAsync(Guid id, Guid schoolId)
        {
            var plan = await _db.LessonPlans
                .Include(p => p.Staff)
                .Include(p => p.ClassRef)
                .Include(p => p.SectionRef)
                .Include(p => p.SubjectRef)
                .Include(p => p.Topic)
                .Include(p => p.ApprovedByStaff)
                .FirstOrDefaultAsync(p => p.Id == id && p.SchoolId == schoolId);

            return plan == null ? null : MapLessonPlan(plan);
        }

        public async Task<LessonPlanResponse> CreateLessonPlanAsync(Guid schoolId, Guid? staffId, CreateLessonPlanRequest request)
        {
            var plan = new LessonPlan
            {
                SchoolId = schoolId,
                StaffId = staffId,
                ClassId = request.ClassId,
                SectionId = request.SectionId,
                SubjectId = request.SubjectId,
                TopicId = request.TopicId,
                Date = request.Date.Date,
                PeriodNumber = request.PeriodNumber,
                Title = request.Title,
                LearningObjectives = request.LearningObjectives,
                TeachingMethods = request.TeachingMethods,
                Resources = request.Resources,
                ClassActivities = request.ClassActivities,
                Homework = request.Homework,
                Notes = request.Notes,
                Status = "draft"
            };

            _db.LessonPlans.Add(plan);
            await _db.SaveChangesAsync();

            return (await GetLessonPlanByIdAsync(plan.Id, schoolId))!;
        }

        public async Task<LessonPlanResponse?> UpdateLessonPlanAsync(Guid id, Guid schoolId, Guid staffId, UpdateLessonPlanRequest request)
        {
            var plan = await _db.LessonPlans.FirstOrDefaultAsync(p => p.Id == id && p.SchoolId == schoolId && p.StaffId == staffId);
            if (plan == null) return null;

            // Only draft plans can be updated by their author
            if (plan.Status != "draft")
                throw new InvalidOperationException("Only draft lesson plans can be edited.");

            if (request.TopicId.HasValue) plan.TopicId = request.TopicId;
            if (request.Date.HasValue) plan.Date = request.Date.Value.Date;
            if (request.PeriodNumber.HasValue) plan.PeriodNumber = request.PeriodNumber;
            if (request.Title != null) plan.Title = request.Title;
            if (request.LearningObjectives != null) plan.LearningObjectives = request.LearningObjectives;
            if (request.TeachingMethods != null) plan.TeachingMethods = request.TeachingMethods;
            if (request.Resources != null) plan.Resources = request.Resources;
            if (request.ClassActivities != null) plan.ClassActivities = request.ClassActivities;
            if (request.Homework != null) plan.Homework = request.Homework;
            if (request.Notes != null) plan.Notes = request.Notes;

            await _db.SaveChangesAsync();
            return await GetLessonPlanByIdAsync(id, schoolId);
        }

        public async Task<LessonPlanResponse?> ApproveLessonPlanAsync(Guid id, Guid schoolId, Guid approverStaffId, ApproveLessonPlanRequest request)
        {
            var plan = await _db.LessonPlans.FirstOrDefaultAsync(p => p.Id == id && p.SchoolId == schoolId);
            if (plan == null) return null;

            if (request.Action == "approve")
            {
                plan.Status = "approved";
                plan.ApprovedByStaffId = approverStaffId;
                plan.ApprovedAt = DateTime.UtcNow;
                plan.RejectionReason = null;
            }
            else if (request.Action == "reject")
            {
                plan.Status = "rejected";
                plan.ApprovedByStaffId = approverStaffId;
                plan.ApprovedAt = DateTime.UtcNow;
                plan.RejectionReason = request.RejectionReason;
            }
            else
            {
                throw new InvalidOperationException("Action must be 'approve' or 'reject'.");
            }

            await _db.SaveChangesAsync();
            return await GetLessonPlanByIdAsync(id, schoolId);
        }

        public async Task<bool> DeleteLessonPlanAsync(Guid id, Guid schoolId)
        {
            var plan = await _db.LessonPlans.FirstOrDefaultAsync(p => p.Id == id && p.SchoolId == schoolId);
            if (plan == null) return false;
            _db.LessonPlans.Remove(plan);
            await _db.SaveChangesAsync();
            return true;
        }

        // ═══════════════════════════════════════════════════════════════════
        // COVERAGE REPORT
        // ═══════════════════════════════════════════════════════════════════

        public async Task<SyllabusCoverageReport> GetCoverageReportAsync(Guid schoolId, Guid classId, Guid subjectId, string academicYear)
        {
            var units = await _db.SyllabusUnits
                .Include(u => u.ClassRef)
                .Include(u => u.SubjectRef)
                .Include(u => u.Topics.OrderBy(t => t.TopicNumber))
                    .ThenInclude(t => t.CompletedByStaff)
                .Where(u => u.SchoolId == schoolId && u.ClassId == classId
                            && u.SubjectId == subjectId && u.AcademicYear == academicYear)
                .OrderBy(u => u.UnitNumber)
                .ToListAsync();

            var mappedUnits = units.Select(MapUnit).ToList();

            // Derive report totals from the already-computed (live) mapped unit values
            return new SyllabusCoverageReport
            {
                ClassId = classId,
                ClassName = units.FirstOrDefault()?.ClassRef?.Name ?? string.Empty,
                SubjectId = subjectId,
                SubjectName = units.FirstOrDefault()?.SubjectRef?.Name ?? string.Empty,
                AcademicYear = academicYear,
                TotalUnits = mappedUnits.Count,
                CompletedUnits = mappedUnits.Count(u => u.Status == "completed"),
                InProgressUnits = mappedUnits.Count(u => u.Status == "in_progress"),
                PendingUnits = mappedUnits.Count(u => u.Status == "pending"),
                TotalTopics = mappedUnits.Sum(u => u.TotalTopics),
                CompletedTopics = mappedUnits.Sum(u => u.CompletedTopics),
                Units = mappedUnits
            };
        }

        // ═══════════════════════════════════════════════════════════════════
        // MAPPERS
        // ═══════════════════════════════════════════════════════════════════

        private static SyllabusUnitResponse MapUnit(SyllabusUnit u)
        {
            // Always derive counts from the loaded Topics collection (source of truth).
            // Fall back to stored counter columns only when topics were not eager-loaded.
            var loadedTopics = u.Topics?.ToList();
            var totalTopics   = loadedTopics != null ? loadedTopics.Count : u.TotalTopics;
            var completedTopics = loadedTopics != null
                ? loadedTopics.Count(t => t.Status == "completed")
                : u.CompletedTopics;

            // Derive unit status from actual topic completion:
            // all done → completed | any done → in_progress | none → pending
            string derivedStatus;
            if (totalTopics == 0)
                derivedStatus = u.Status; // no topics yet — keep whatever was set manually
            else if (completedTopics >= totalTopics)
                derivedStatus = "completed";
            else if (completedTopics > 0)
                derivedStatus = "in_progress";
            else
                derivedStatus = "pending";

            return new()
            {
                Id = u.Id,
                SchoolId = u.SchoolId,
                ClassId = u.ClassId,
                ClassName = u.ClassRef?.Name,
                SubjectId = u.SubjectId,
                SubjectName = u.SubjectRef?.Name,
                AcademicYear = u.AcademicYear,
                UnitNumber = u.UnitNumber,
                Title = u.Title,
                Description = u.Description,
                PlannedHours = u.PlannedHours,
                PlannedStartDate = u.PlannedStartDate,
                PlannedEndDate = u.PlannedEndDate,
                ActualStartDate = u.ActualStartDate,
                ActualEndDate = u.ActualEndDate,
                Status = derivedStatus,
                TotalTopics = totalTopics,
                CompletedTopics = completedTopics,
                Topics = loadedTopics?.Select(MapTopic).ToList() ?? new(),
                CreatedAt = u.CreatedAt,
                UpdatedAt = u.UpdatedAt
            };
        }

        private static SyllabusTopicResponse MapTopic(SyllabusTopic t) => new()
        {
            Id = t.Id,
            SchoolId = t.SchoolId,
            UnitId = t.UnitId,
            TopicNumber = t.TopicNumber,
            Title = t.Title,
            Description = t.Description,
            DurationMinutes = t.DurationMinutes,
            ResourceReferences = t.ResourceReferences,
            Status = t.Status,
            CompletedDate = t.CompletedDate,
            CompletedByStaffId = t.CompletedByStaffId,
            CompletedByStaffName = t.CompletedByStaff != null
                ? $"{t.CompletedByStaff.FirstName} {t.CompletedByStaff.LastName}".Trim()
                : null,
            CompletionRemarks = t.CompletionRemarks,
            CreatedAt = t.CreatedAt,
            UpdatedAt = t.UpdatedAt
        };

        private static LessonPlanResponse MapLessonPlan(LessonPlan p) => new()
        {
            Id = p.Id,
            SchoolId = p.SchoolId,
            StaffId = p.StaffId,
            StaffName = p.Staff != null ? $"{p.Staff.FirstName} {p.Staff.LastName}".Trim() : null,
            ClassId = p.ClassId,
            ClassName = p.ClassRef?.Name,
            SectionId = p.SectionId,
            SectionName = p.SectionRef?.Name,
            SubjectId = p.SubjectId,
            SubjectName = p.SubjectRef?.Name,
            TopicId = p.TopicId,
            TopicTitle = p.Topic?.Title,
            Date = p.Date,
            PeriodNumber = p.PeriodNumber,
            Title = p.Title,
            LearningObjectives = p.LearningObjectives,
            TeachingMethods = p.TeachingMethods,
            Resources = p.Resources,
            ClassActivities = p.ClassActivities,
            Homework = p.Homework,
            Notes = p.Notes,
            Status = p.Status,
            ApprovedByStaffId = p.ApprovedByStaffId,
            ApprovedByName = p.ApprovedByStaff != null ? $"{p.ApprovedByStaff.FirstName} {p.ApprovedByStaff.LastName}".Trim() : null,
            ApprovedAt = p.ApprovedAt,
            RejectionReason = p.RejectionReason,
            CreatedAt = p.CreatedAt,
            UpdatedAt = p.UpdatedAt
        };
    }
}
