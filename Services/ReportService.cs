using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.Entities;
using SmsApi.Models.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SmsApi.Services
{
    public interface IReportService
    {
        Task<ReportListResponse> GetReportsAsync(Guid schoolId, int page = 1, int pageSize = 10, string? reportType = null, string? status = null);
        Task<ReportResponse?> GetReportByIdAsync(Guid reportId, Guid schoolId);
        Task<ReportResponse> CreateReportAsync(CreateReportRequest request);
        Task<bool> DeleteReportAsync(Guid reportId, Guid schoolId);
        Task<ReportTemplateListResponse> GetReportTemplatesAsync(Guid schoolId, int page = 1, int pageSize = 10, string? reportType = null);
        Task<ReportTemplateResponse?> GetReportTemplateByIdAsync(Guid templateId, Guid schoolId);
        Task<ReportTemplateResponse> CreateReportTemplateAsync(CreateReportTemplateRequest request);
        Task<ReportTemplateResponse> UpdateReportTemplateAsync(Guid templateId, UpdateReportTemplateRequest request, Guid schoolId);
        Task<bool> DeleteReportTemplateAsync(Guid templateId, Guid schoolId);
        Task<ReportResponse> GenerateReportFromTemplateAsync(Guid templateId, Dictionary<string, string> parameters, Guid schoolId, Guid staffId);
    }

    public class ReportService : IReportService
    {
        private readonly AppDbContext _context;

        public ReportService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<ReportListResponse> GetReportsAsync(Guid schoolId, int page = 1, int pageSize = 10, string? reportType = null, string? status = null)
        {
            var query = _context.Reports
                .Include(r => r.GeneratedByStaff)
                .Include(r => r.Class)
                .Include(r => r.Section)
                .Where(r => r.SchoolId == schoolId);

            if (!string.IsNullOrEmpty(reportType))
                query = query.Where(r => r.ReportType == reportType);

            if (!string.IsNullOrEmpty(status))
                query = query.Where(r => r.Status == status);

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(r => r.GeneratedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new ReportListResponse
            {
                Items = items.Select(r => MapToResponse(r)).ToList(),
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling((double)totalCount / pageSize)
            };
        }

        public async Task<ReportResponse?> GetReportByIdAsync(Guid reportId, Guid schoolId)
        {
            var report = await _context.Reports
                .Include(r => r.GeneratedByStaff)
                .Include(r => r.Class)
                .Include(r => r.Section)
                .FirstOrDefaultAsync(r => r.Id == reportId && r.SchoolId == schoolId);

            return report != null ? MapToResponse(report) : null;
        }

        public async Task<ReportResponse> CreateReportAsync(CreateReportRequest request)
        {
            // VALIDATION 1: Class/section existence and active status
            if (request.ClassId.HasValue)
            {
                var classExists = await _context.Classes.AnyAsync(c => c.Id == request.ClassId && c.SchoolId == request.SchoolId);
                if (!classExists)
                    throw new InvalidOperationException($"Class does not exist for school {request.SchoolId}");
            }

            // VALIDATION 2: Report period date validation (end > start, not future)
            if (request.EndDate < request.StartDate)
                throw new InvalidOperationException("Report end date must be after start date");
            
            if (request.EndDate > DateTime.UtcNow.Date)
                throw new InvalidOperationException("Report end date cannot be in the future");

            // VALIDATION 3: Duplicate report prevention
            var existingReport = await _context.Reports.AnyAsync(r => 
                r.SchoolId == request.SchoolId &&
                r.ReportType == request.ReportType &&
                r.StartDate == request.StartDate &&
                r.EndDate == request.EndDate &&
                r.ClassId == request.ClassId);
            
            if (existingReport)
                throw new InvalidOperationException($"A report already exists for this period and class");

            var report = new Report
            {
                Id = Guid.NewGuid(),
                SchoolId = request.SchoolId,
                Name = request.Name,
                Description = request.Description,
                ReportType = request.ReportType,
                Category = request.Category,
                Parameters = request.Parameters,
                Format = request.Format,
                GeneratedByStaffId = request.GeneratedByStaffId,
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                ClassId = request.ClassId,
                SectionId = request.SectionId,
                Status = "Pending",
                GeneratedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Reports.Add(report);
            await _context.SaveChangesAsync();

            return (await GetReportByIdAsync(report.Id, request.SchoolId))!;
        }

        public async Task<bool> DeleteReportAsync(Guid reportId, Guid schoolId)
        {
            var report = await _context.Reports
                .FirstOrDefaultAsync(r => r.Id == reportId && r.SchoolId == schoolId);

            if (report == null)
                return false;

            _context.Reports.Remove(report);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<ReportTemplateListResponse> GetReportTemplatesAsync(Guid schoolId, int page = 1, int pageSize = 10, string? reportType = null)
        {
            var query = _context.ReportTemplates
                .Include(rt => rt.CreatedByStaff)
                .Where(rt => rt.SchoolId == schoolId);

            if (!string.IsNullOrEmpty(reportType))
                query = query.Where(rt => rt.ReportType == reportType);

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(rt => rt.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new ReportTemplateListResponse
            {
                Items = items.Select(rt => MapToTemplateResponse(rt)).ToList(),
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling((double)totalCount / pageSize)
            };
        }

        public async Task<ReportTemplateResponse?> GetReportTemplateByIdAsync(Guid templateId, Guid schoolId)
        {
            var template = await _context.ReportTemplates
                .Include(rt => rt.CreatedByStaff)
                .FirstOrDefaultAsync(rt => rt.Id == templateId && rt.SchoolId == schoolId);

            return template != null ? MapToTemplateResponse(template) : null;
        }

        public async Task<ReportTemplateResponse> CreateReportTemplateAsync(CreateReportTemplateRequest request)
        {
            var template = new ReportTemplate
            {
                Id = Guid.NewGuid(),
                SchoolId = request.SchoolId,
                Name = request.Name,
                Description = request.Description,
                ReportType = request.ReportType,
                QueryTemplate = request.QueryTemplate,
                DefaultParameters = request.DefaultParameters,
                Format = request.Format,
                IsActive = true,
                IsPublic = request.IsPublic,
                CreatedByStaffId = request.CreatedByStaffId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.ReportTemplates.Add(template);
            await _context.SaveChangesAsync();

            return (await GetReportTemplateByIdAsync(template.Id, request.SchoolId))!;
        }

        public async Task<ReportTemplateResponse> UpdateReportTemplateAsync(Guid templateId, UpdateReportTemplateRequest request, Guid schoolId)
        {
            var template = await _context.ReportTemplates
                .FirstOrDefaultAsync(rt => rt.Id == templateId && rt.SchoolId == schoolId);

            if (template == null)
                throw new KeyNotFoundException("Report template not found");

            template.Name = request.Name;
            template.Description = request.Description;
            template.QueryTemplate = request.QueryTemplate;
            template.DefaultParameters = request.DefaultParameters;
            template.Format = request.Format;
            template.IsActive = request.IsActive;
            template.IsPublic = request.IsPublic;
            template.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return (await GetReportTemplateByIdAsync(templateId, schoolId))!;
        }

        public async Task<bool> DeleteReportTemplateAsync(Guid templateId, Guid schoolId)
        {
            var template = await _context.ReportTemplates
                .FirstOrDefaultAsync(rt => rt.Id == templateId && rt.SchoolId == schoolId);

            if (template == null)
                return false;

            _context.ReportTemplates.Remove(template);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<ReportResponse> GenerateReportFromTemplateAsync(Guid templateId, Dictionary<string, string> parameters, Guid schoolId, Guid staffId)
        {
            var template = await _context.ReportTemplates
                .FirstOrDefaultAsync(rt => rt.Id == templateId && rt.SchoolId == schoolId);

            if (template == null)
                throw new KeyNotFoundException("Report template not found");

            var report = new Report
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                Name = template.Name,
                Description = template.Description,
                ReportType = template.ReportType,
                Category = "Custom",
                Parameters = System.Text.Json.JsonSerializer.Serialize(parameters),
                Format = template.Format,
                GeneratedByStaffId = staffId,
                Status = "Pending",
                GeneratedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Reports.Add(report);
            await _context.SaveChangesAsync();

            return (await GetReportByIdAsync(report.Id, schoolId))!;
        }

        private ReportResponse MapToResponse(Report report)
        {
            return new ReportResponse
            {
                Id = report.Id,
                SchoolId = report.SchoolId,
                Name = report.Name,
                Description = report.Description,
                ReportType = report.ReportType,
                Category = report.Category,
                Parameters = report.Parameters,
                Format = report.Format,
                GeneratedByStaffId = report.GeneratedByStaffId,
                GeneratedByStaffName = report.GeneratedByStaff != null 
                    ? $"{report.GeneratedByStaff.FirstName} {report.GeneratedByStaff.LastName}" 
                    : null,
                StartDate = report.StartDate,
                EndDate = report.EndDate,
                ClassId = report.ClassId,
                ClassName = report.Class?.Name,
                SectionId = report.SectionId,
                SectionName = report.Section?.Name,
                FileUrl = report.FileUrl,
                Status = report.Status,
                ErrorMessage = report.ErrorMessage,
                RecordCount = report.RecordCount,
                GeneratedAt = report.GeneratedAt,
                CreatedAt = report.CreatedAt,
                UpdatedAt = report.UpdatedAt
            };
        }

        private ReportTemplateResponse MapToTemplateResponse(ReportTemplate template)
        {
            return new ReportTemplateResponse
            {
                Id = template.Id,
                SchoolId = template.SchoolId,
                Name = template.Name,
                Description = template.Description,
                ReportType = template.ReportType,
                QueryTemplate = template.QueryTemplate,
                DefaultParameters = template.DefaultParameters,
                Format = template.Format,
                IsActive = template.IsActive,
                IsPublic = template.IsPublic,
                CreatedByStaffId = template.CreatedByStaffId,
                CreatedByStaffName = template.CreatedByStaff != null 
                    ? $"{template.CreatedByStaff.FirstName} {template.CreatedByStaff.LastName}" 
                    : null,
                CreatedAt = template.CreatedAt,
                UpdatedAt = template.UpdatedAt
            };
        }
    }
}

