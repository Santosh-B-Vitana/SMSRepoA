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
    public interface IDisciplineService
    {
        Task<DisciplineListResponse> GetRecordsAsync(Guid schoolId, DisciplineQueryParams query);
        Task<DisciplineRecordResponse?> GetByIdAsync(Guid schoolId, Guid id);
        Task<DisciplineRecordResponse> CreateAsync(Guid schoolId, CreateDisciplineRecordRequest request);
        Task<DisciplineRecordResponse?> UpdateAsync(Guid schoolId, Guid id, UpdateDisciplineRecordRequest request);
        Task<bool> DeleteAsync(Guid schoolId, Guid id);
        Task<DisciplineSummary> GetStudentSummaryAsync(Guid schoolId, Guid studentId);
    }

    public class DisciplineService : IDisciplineService
    {
        private readonly AppDbContext _db;

        public DisciplineService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<DisciplineListResponse> GetRecordsAsync(Guid schoolId, DisciplineQueryParams query)
        {
            var q = _db.DisciplineRecords
                .Include(d => d.Student)
                .Include(d => d.ReportedByStaff)
                .Where(d => d.SchoolId == schoolId);

            if (query.StudentId.HasValue)
                q = q.Where(d => d.StudentId == query.StudentId.Value);

            if (!string.IsNullOrWhiteSpace(query.Status))
                q = q.Where(d => d.Status == query.Status);

            if (!string.IsNullOrWhiteSpace(query.Severity))
                q = q.Where(d => d.Severity == query.Severity);

            if (!string.IsNullOrWhiteSpace(query.IncidentType))
                q = q.Where(d => d.IncidentType == query.IncidentType);

            if (query.FromDate.HasValue)
                q = q.Where(d => d.IncidentDate >= query.FromDate.Value);

            if (query.ToDate.HasValue)
                q = q.Where(d => d.IncidentDate <= query.ToDate.Value.AddDays(1));

            var total = await q.CountAsync();
            var summary = await BuildSummaryAsync(q);

            var page = query.Page < 1 ? 1 : query.Page;
            var size = query.PageSize < 1 ? 20 : query.PageSize;

            var records = await q
                .OrderByDescending(d => d.IncidentDate)
                .ThenByDescending(d => d.CreatedAt)
                .Skip((page - 1) * size)
                .Take(size)
                .ToListAsync();

            return new DisciplineListResponse
            {
                Records = records.Select(MapToResponse).ToList(),
                TotalCount = total,
                Summary = summary,
            };
        }

        public async Task<DisciplineRecordResponse?> GetByIdAsync(Guid schoolId, Guid id)
        {
            var record = await _db.DisciplineRecords
                .Include(d => d.Student)
                .Include(d => d.ReportedByStaff)
                .FirstOrDefaultAsync(d => d.Id == id && d.SchoolId == schoolId);

            return record == null ? null : MapToResponse(record);
        }

        public async Task<DisciplineRecordResponse> CreateAsync(Guid schoolId, CreateDisciplineRecordRequest request)
        {
            // Validate student belongs to this school
            var student = await _db.Students.FirstOrDefaultAsync(s => s.Id == request.StudentId && s.SchoolId == schoolId)
                ?? throw new KeyNotFoundException("Student not found.");

            string? reportedByName = request.ReportedByName;
            if (request.ReportedByStaffId.HasValue && string.IsNullOrWhiteSpace(reportedByName))
            {
                var staff = await _db.StaffMembers.FirstOrDefaultAsync(s => s.Id == request.ReportedByStaffId.Value && s.SchoolId == schoolId);
                reportedByName = staff?.Name;
            }

            var record = new DisciplineRecord
            {
                SchoolId = schoolId,
                StudentId = request.StudentId,
                IncidentDate = request.IncidentDate,
                IncidentType = request.IncidentType,
                Severity = request.Severity,
                Title = request.Title,
                Description = request.Description,
                ActionTaken = request.ActionTaken,
                Status = request.Status,
                ReportedByStaffId = request.ReportedByStaffId,
                ReportedByName = reportedByName,
                ParentNotificationStatus = request.ParentNotificationStatus ?? "pending",
                ParentNotifiedAt = request.ParentNotifiedAt,
                SuspensionDays = request.SuspensionDays,
                Notes = request.Notes,
            };

            _db.DisciplineRecords.Add(record);
            await _db.SaveChangesAsync();

            // Re-load with navigation
            return await GetByIdAsync(schoolId, record.Id)
                ?? throw new InvalidOperationException("Failed to load saved record.");
        }

        public async Task<DisciplineRecordResponse?> UpdateAsync(Guid schoolId, Guid id, UpdateDisciplineRecordRequest request)
        {
            var record = await _db.DisciplineRecords
                .FirstOrDefaultAsync(d => d.Id == id && d.SchoolId == schoolId);

            if (record == null) return null;

            if (request.IncidentDate.HasValue) record.IncidentDate = request.IncidentDate.Value;
            if (!string.IsNullOrWhiteSpace(request.IncidentType)) record.IncidentType = request.IncidentType;
            if (!string.IsNullOrWhiteSpace(request.Severity)) record.Severity = request.Severity;
            if (!string.IsNullOrWhiteSpace(request.Title)) record.Title = request.Title;
            if (request.Description != null) record.Description = request.Description;
            if (request.ActionTaken != null) record.ActionTaken = request.ActionTaken;
            if (!string.IsNullOrWhiteSpace(request.Status))
            {
                record.Status = request.Status;
                if (request.Status == "resolved" || request.Status == "closed")
                    record.ResolvedAt ??= DateTime.UtcNow;
            }
            if (!string.IsNullOrWhiteSpace(request.ParentNotificationStatus))
            {
                record.ParentNotificationStatus = request.ParentNotificationStatus;
                if (request.ParentNotificationStatus == "notified")
                    record.ParentNotifiedAt ??= request.ParentNotifiedAt ?? DateTime.UtcNow;
            }
            if (request.ParentNotifiedAt.HasValue) record.ParentNotifiedAt = request.ParentNotifiedAt;
            if (request.SuspensionDays.HasValue) record.SuspensionDays = request.SuspensionDays.Value;
            if (request.Notes != null) record.Notes = request.Notes;
            if (request.ResolutionNotes != null) record.ResolutionNotes = request.ResolutionNotes;

            await _db.SaveChangesAsync();

            return await GetByIdAsync(schoolId, id);
        }

        public async Task<bool> DeleteAsync(Guid schoolId, Guid id)
        {
            var record = await _db.DisciplineRecords
                .FirstOrDefaultAsync(d => d.Id == id && d.SchoolId == schoolId);

            if (record == null) return false;

            _db.DisciplineRecords.Remove(record); // triggers soft-delete via SaveChanges override
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<DisciplineSummary> GetStudentSummaryAsync(Guid schoolId, Guid studentId)
        {
            var q = _db.DisciplineRecords.Where(d => d.SchoolId == schoolId && d.StudentId == studentId);
            return await BuildSummaryAsync(q);
        }

        // ── Helpers ────────────────────────────────────────────────────────

        private static async Task<DisciplineSummary> BuildSummaryAsync(IQueryable<DisciplineRecord> q)
        {
            var all = await q.ToListAsync();
            return new DisciplineSummary
            {
                TotalIncidents = all.Count(r => r.IncidentType != "positive_recognition"),
                OpenIncidents = all.Count(r => r.Status == "open" || r.Status == "under_review" || r.Status == "appealed" || r.Status == "escalated"),
                ResolvedIncidents = all.Count(r => r.Status == "resolved" || r.Status == "closed"),
                SuspensionDays = all.Sum(r => r.SuspensionDays),
                PositiveRecognitions = all.Count(r => r.IncidentType == "positive_recognition"),
                HighSeverityCount = all.Count(r => r.Severity == "high" || r.Severity == "critical"),
                ParentNotifiedCount = all.Count(r => r.ParentNotificationStatus == "notified"),
            };
        }

        private static DisciplineRecordResponse MapToResponse(DisciplineRecord d)
        {
            return new DisciplineRecordResponse
            {
                Id = d.Id,
                StudentId = d.StudentId,
                StudentName = d.Student?.Name ?? string.Empty,
                StudentAdmissionNumber = d.Student?.AdmissionNumber,
                StudentClass = d.Student?.Class,
                StudentSection = d.Student?.Section,
                IncidentDate = d.IncidentDate,
                IncidentType = d.IncidentType,
                Severity = d.Severity,
                Title = d.Title,
                Description = d.Description,
                ActionTaken = d.ActionTaken,
                Status = d.Status,
                ReportedByStaffId = d.ReportedByStaffId,
                ReportedByName = d.ReportedByName ?? d.ReportedByStaff?.Name,
                ParentNotificationStatus = d.ParentNotificationStatus,
                ParentNotifiedAt = d.ParentNotifiedAt,
                SuspensionDays = d.SuspensionDays,
                Notes = d.Notes,
                ResolutionNotes = d.ResolutionNotes,
                ResolvedAt = d.ResolvedAt,
                CreatedAt = d.CreatedAt,
                UpdatedAt = d.UpdatedAt,
            };
        }
    }
}
