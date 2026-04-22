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
    public interface ICertificateService
    {
        // Certificate Templates
        Task<CertificateTemplateListResponse> GetCertificateTemplatesAsync(Guid schoolId, int page = 1, int pageSize = 10, string? certificateType = null, bool? isActive = null);
        Task<CertificateTemplateResponse?> GetCertificateTemplateByIdAsync(Guid templateId, Guid schoolId);
        Task<CertificateTemplateResponse> CreateCertificateTemplateAsync(CreateCertificateTemplateRequest request);
        Task<CertificateTemplateResponse> UpdateCertificateTemplateAsync(Guid templateId, UpdateCertificateTemplateRequest request, Guid schoolId);
        Task<bool> DeleteCertificateTemplateAsync(Guid templateId, Guid schoolId);

        // Certificates
        Task<CertificateListResponse> GetCertificatesAsync(Guid schoolId, int page = 1, int pageSize = 10, string? certificateType = null, string? status = null, Guid? studentId = null);
        Task<CertificateResponse?> GetCertificateByIdAsync(Guid certificateId, Guid schoolId);
        Task<CertificateListResponse> GetStudentCertificatesAsync(Guid studentId, Guid schoolId, int page = 1, int pageSize = 50);
        Task<CertificateResponse> CreateCertificateAsync(CreateCertificateRequest request);
        Task<CertificateResponse> UpdateCertificateAsync(Guid certificateId, UpdateCertificateRequest request, Guid schoolId);
        Task<bool> DeleteCertificateAsync(Guid certificateId, Guid schoolId);
        Task<CertificateResponse> GenerateCertificateAsync(Guid certificateId, Guid schoolId);
        Task<CertificateResponse> MarkCertificateAsPrintedAsync(Guid certificateId, Guid schoolId);
        Task<CertificateResponse> RevokeCertificateAsync(Guid certificateId, Guid schoolId);
        Task<CertificateStatsResponse> GetCertificateStatsAsync(Guid schoolId);

        // ID Card Templates
        Task<IDCardTemplateListResponse> GetIDCardTemplatesAsync(Guid schoolId, int page = 1, int pageSize = 10, string? cardType = null, bool? isActive = null);
        Task<IDCardTemplateResponse?> GetIDCardTemplateByIdAsync(Guid templateId, Guid schoolId);
        Task<IDCardTemplateResponse> CreateIDCardTemplateAsync(CreateIDCardTemplateRequest request);
        Task<IDCardTemplateResponse> UpdateIDCardTemplateAsync(Guid templateId, UpdateIDCardTemplateRequest request, Guid schoolId);
        Task<bool> DeleteIDCardTemplateAsync(Guid templateId, Guid schoolId);

        // ID Cards
        Task<IDCardListResponse> GetIDCardsAsync(Guid schoolId, int page = 1, int pageSize = 10, string? cardType = null, string? status = null);
        Task<IDCardResponse?> GetIDCardByIdAsync(Guid cardId, Guid schoolId);
        Task<IDCardListResponse> GetHolderIDCardsAsync(Guid holderId, string holderType, Guid schoolId);
        Task<IDCardResponse> CreateIDCardAsync(CreateIDCardRequest request);
        Task<IDCardResponse> UpdateIDCardAsync(Guid cardId, UpdateIDCardRequest request, Guid schoolId);
        Task<bool> DeleteIDCardAsync(Guid cardId, Guid schoolId);
        Task<IDCardResponse> GenerateIDCardAsync(Guid cardId, Guid schoolId);
        Task<IDCardResponse> MarkIDCardAsPrintedAsync(Guid cardId, Guid schoolId);
    }

    public class CertificateService : ICertificateService
    {
        private readonly AppDbContext _context;

        public CertificateService(AppDbContext context)
        {
            _context = context;
        }

        // ═══════════════════════════════════════════════════════════════════════
        // Certificate Templates
        // ═══════════════════════════════════════════════════════════════════════

        public async Task<CertificateTemplateListResponse> GetCertificateTemplatesAsync(
            Guid schoolId, int page = 1, int pageSize = 10,
            string? certificateType = null, bool? isActive = null)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;
            if (pageSize > 100) pageSize = 100;

            var query = _context.CertificateTemplates
                .Where(ct => ct.SchoolId == schoolId);

            if (!string.IsNullOrWhiteSpace(certificateType))
                query = query.Where(ct => ct.CertificateType == certificateType);
            if (isActive.HasValue)
                query = query.Where(ct => ct.IsActive == isActive.Value);

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(ct => ct.IsDefault)
                .ThenByDescending(ct => ct.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var templateIds = items.Select(t => t.Id).ToList();
            var counts = await _context.Certificates
                .Where(c => templateIds.Contains(c.TemplateId))
                .GroupBy(c => c.TemplateId)
                .Select(g => new { g.Key, Count = g.Count() })
                .ToDictionaryAsync(g => g.Key, g => g.Count);

            var responses = items.Select(t =>
            {
                var r = MapToCertificateTemplateResponse(t);
                r.CertificatesIssuedCount = counts.TryGetValue(t.Id, out var cnt) ? cnt : 0;
                return r;
            }).ToList();

            return new CertificateTemplateListResponse
            {
                Items      = responses,
                TotalCount = totalCount,
                Page       = page,
                PageSize   = pageSize,
                TotalPages = totalCount == 0 ? 0 : (int)Math.Ceiling((double)totalCount / pageSize)
            };
        }

        public async Task<CertificateTemplateResponse?> GetCertificateTemplateByIdAsync(Guid templateId, Guid schoolId)
        {
            var template = await _context.CertificateTemplates
                .FirstOrDefaultAsync(ct => ct.Id == templateId && ct.SchoolId == schoolId);
            if (template == null) return null;

            var r = MapToCertificateTemplateResponse(template);
            r.CertificatesIssuedCount = await _context.Certificates
                .CountAsync(c => c.TemplateId == templateId);
            return r;
        }

        public async Task<CertificateTemplateResponse> CreateCertificateTemplateAsync(CreateCertificateTemplateRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                throw new ArgumentException("Template name is required.");
            if (request.Name.Length < CertificateConstants.TemplateNameMin || request.Name.Length > CertificateConstants.TemplateNameMax)
                throw new ArgumentException($"Template name must be between {CertificateConstants.TemplateNameMin} and {CertificateConstants.TemplateNameMax} characters.");
            if (!CertificateConstants.ValidCertificateTypes.Contains(request.CertificateType))
                throw new ArgumentException($"Invalid certificate type '{request.CertificateType}'.");
            if (!CertificateConstants.ValidOrientations.Contains(request.Orientation))
                throw new ArgumentException($"Invalid orientation '{request.Orientation}'.");
            if (!CertificateConstants.ValidPageSizes.Contains(request.PageSize))
                throw new ArgumentException($"Invalid page size '{request.PageSize}'.");
            if (string.IsNullOrWhiteSpace(request.Template))
                throw new ArgumentException("Template HTML content is required.");
            if (request.Description != null && request.Description.Length > CertificateConstants.DescriptionMax)
                throw new ArgumentException($"Description must not exceed {CertificateConstants.DescriptionMax} characters.");

            var exists = await _context.CertificateTemplates
                .AnyAsync(ct => ct.SchoolId == request.SchoolId
                             && ct.Name == request.Name.Trim()
                             && ct.CertificateType == request.CertificateType);
            if (exists)
                throw new InvalidOperationException($"A template named '{request.Name}' already exists for type '{request.CertificateType}'.");

            if (request.IsDefault)
            {
                var defaults = await _context.CertificateTemplates
                    .Where(ct => ct.SchoolId == request.SchoolId
                              && ct.CertificateType == request.CertificateType
                              && ct.IsDefault)
                    .ToListAsync();
                defaults.ForEach(d => d.IsDefault = false);
            }

            var template = new CertificateTemplate
            {
                Id             = Guid.NewGuid(),
                SchoolId       = request.SchoolId,
                Name           = request.Name.Trim(),
                CertificateType= request.CertificateType,
                Description    = request.Description?.Trim(),
                Template       = request.Template,
                Orientation    = request.Orientation,
                PageSize       = request.PageSize,
                Styles         = request.Styles,
                HeaderImage    = request.HeaderImage,
                FooterImage    = request.FooterImage,
                WatermarkImage = request.WatermarkImage,
                IsActive       = true,
                IsDefault      = request.IsDefault,
                CreatedAt      = DateTime.UtcNow,
                UpdatedAt      = DateTime.UtcNow
            };

            _context.CertificateTemplates.Add(template);
            await _context.SaveChangesAsync();
            return MapToCertificateTemplateResponse(template);
        }

        public async Task<CertificateTemplateResponse> UpdateCertificateTemplateAsync(
            Guid templateId, UpdateCertificateTemplateRequest request, Guid schoolId)
        {
            var template = await _context.CertificateTemplates
                .FirstOrDefaultAsync(ct => ct.Id == templateId && ct.SchoolId == schoolId);
            if (template == null)
                throw new KeyNotFoundException("Certificate template not found.");

            if (request.Name != null)
            {
                if (string.IsNullOrWhiteSpace(request.Name))
                    throw new ArgumentException("Template name cannot be blank.");
                if (request.Name.Length < CertificateConstants.TemplateNameMin || request.Name.Length > CertificateConstants.TemplateNameMax)
                    throw new ArgumentException($"Template name must be between {CertificateConstants.TemplateNameMin} and {CertificateConstants.TemplateNameMax} characters.");
                var nameConflict = await _context.CertificateTemplates
                    .AnyAsync(ct => ct.SchoolId == schoolId && ct.Id != templateId
                                 && ct.Name == request.Name.Trim() && ct.CertificateType == template.CertificateType);
                if (nameConflict)
                    throw new InvalidOperationException($"A template named '{request.Name}' already exists.");
                template.Name = request.Name.Trim();
            }

            if (request.Description != null)
            {
                if (request.Description.Length > CertificateConstants.DescriptionMax)
                    throw new ArgumentException($"Description must not exceed {CertificateConstants.DescriptionMax} characters.");
                template.Description = request.Description.Trim();
            }

            if (request.Template != null)
            {
                if (string.IsNullOrWhiteSpace(request.Template))
                    throw new ArgumentException("Template HTML content cannot be blank.");
                template.Template = request.Template;
            }

            if (request.Orientation != null)
            {
                if (!CertificateConstants.ValidOrientations.Contains(request.Orientation))
                    throw new ArgumentException($"Invalid orientation '{request.Orientation}'.");
                template.Orientation = request.Orientation;
            }

            if (request.PageSize != null)
            {
                if (!CertificateConstants.ValidPageSizes.Contains(request.PageSize))
                    throw new ArgumentException($"Invalid page size '{request.PageSize}'.");
                template.PageSize = request.PageSize;
            }

            if (request.Styles != null)        template.Styles         = request.Styles;
            if (request.HeaderImage != null)    template.HeaderImage    = request.HeaderImage;
            if (request.FooterImage != null)    template.FooterImage    = request.FooterImage;
            if (request.WatermarkImage != null) template.WatermarkImage = request.WatermarkImage;
            if (request.IsActive.HasValue)      template.IsActive       = request.IsActive.Value;

            if (request.IsDefault.HasValue)
            {
                if (request.IsDefault.Value)
                {
                    var others = await _context.CertificateTemplates
                        .Where(ct => ct.SchoolId == schoolId && ct.CertificateType == template.CertificateType
                                  && ct.IsDefault && ct.Id != templateId)
                        .ToListAsync();
                    others.ForEach(o => o.IsDefault = false);
                }
                template.IsDefault = request.IsDefault.Value;
            }

            template.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return MapToCertificateTemplateResponse(template);
        }

        public async Task<bool> DeleteCertificateTemplateAsync(Guid templateId, Guid schoolId)
        {
            var template = await _context.CertificateTemplates
                .FirstOrDefaultAsync(ct => ct.Id == templateId && ct.SchoolId == schoolId);
            if (template == null) return false;

            var inUse = await _context.Certificates.AnyAsync(c => c.TemplateId == templateId);
            if (inUse)
                throw new InvalidOperationException("Cannot delete template: it is referenced by existing certificates.");

            _context.CertificateTemplates.Remove(template);
            await _context.SaveChangesAsync();
            return true;
        }

        // ═══════════════════════════════════════════════════════════════════════
        // Certificates
        // ═══════════════════════════════════════════════════════════════════════

        public async Task<CertificateListResponse> GetCertificatesAsync(
            Guid schoolId, int page = 1, int pageSize = 10,
            string? certificateType = null, string? status = null, Guid? studentId = null)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;
            if (pageSize > 100) pageSize = 100;

            var query = _context.Certificates
                .Include(c => c.Student)
                .Include(c => c.Class)
                .Include(c => c.Section)
                .Include(c => c.Template)
                .Include(c => c.IssuedByStaff)
                .Where(c => c.SchoolId == schoolId);

            if (!string.IsNullOrWhiteSpace(certificateType))
                query = query.Where(c => c.CertificateType == certificateType);
            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(c => c.Status == status);
            if (studentId.HasValue)
                query = query.Where(c => c.StudentId == studentId.Value);

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(c => c.IssueDate)
                .ThenByDescending(c => c.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new CertificateListResponse
            {
                Items      = items.Select(MapToCertificateResponse).ToList(),
                TotalCount = totalCount,
                Page       = page,
                PageSize   = pageSize,
                TotalPages = totalCount == 0 ? 0 : (int)Math.Ceiling((double)totalCount / pageSize)
            };
        }

        public async Task<CertificateResponse?> GetCertificateByIdAsync(Guid certificateId, Guid schoolId)
        {
            var cert = await _context.Certificates
                .Include(c => c.Student)
                .Include(c => c.Class)
                .Include(c => c.Section)
                .Include(c => c.Template)
                .Include(c => c.IssuedByStaff)
                .FirstOrDefaultAsync(c => c.Id == certificateId && c.SchoolId == schoolId);
            return cert != null ? MapToCertificateResponse(cert) : null;
        }

        public async Task<CertificateListResponse> GetStudentCertificatesAsync(
            Guid studentId, Guid schoolId, int page = 1, int pageSize = 50)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;
            if (pageSize > 100) pageSize = 100;

            var query = _context.Certificates
                .Include(c => c.Student)
                .Include(c => c.Class)
                .Include(c => c.Section)
                .Include(c => c.Template)
                .Include(c => c.IssuedByStaff)
                .Where(c => c.StudentId == studentId && c.SchoolId == schoolId);

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(c => c.IssueDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new CertificateListResponse
            {
                Items      = items.Select(MapToCertificateResponse).ToList(),
                TotalCount = totalCount,
                Page       = page,
                PageSize   = pageSize,
                TotalPages = totalCount == 0 ? 0 : (int)Math.Ceiling((double)totalCount / pageSize)
            };
        }

        public async Task<CertificateResponse> CreateCertificateAsync(CreateCertificateRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.CertificateNumber))
                throw new ArgumentException("Certificate number is required.");
            if (request.CertificateNumber.Length < CertificateConstants.CertNumberMin || request.CertificateNumber.Length > CertificateConstants.CertNumberMax)
                throw new ArgumentException($"Certificate number must be between {CertificateConstants.CertNumberMin} and {CertificateConstants.CertNumberMax} characters.");
            if (string.IsNullOrWhiteSpace(request.Title))
                throw new ArgumentException("Certificate title is required.");
            if (request.Title.Length < CertificateConstants.TitleMin || request.Title.Length > CertificateConstants.TitleMax)
                throw new ArgumentException($"Title must be between {CertificateConstants.TitleMin} and {CertificateConstants.TitleMax} characters.");
            if (!CertificateConstants.ValidCertificateTypes.Contains(request.CertificateType))
                throw new ArgumentException($"Invalid certificate type '{request.CertificateType}'.");
            if (request.StudentId == Guid.Empty)
                throw new ArgumentException("Student ID is required.");
            if (request.TemplateId == Guid.Empty)
                throw new ArgumentException("Template ID is required.");
            if (request.IssuedByStaffId == Guid.Empty)
                throw new ArgumentException("IssuedByStaffId is required.");
            if (request.Metadata != null && request.Metadata.Length > CertificateConstants.MetadataMax)
                throw new ArgumentException($"Metadata must not exceed {CertificateConstants.MetadataMax} characters.");

            if (request.IssueDate.Date > DateTime.UtcNow.Date)
                throw new ArgumentException("Issue date cannot be in the future.");
            if (request.ValidUntil.HasValue && request.ValidUntil.Value <= request.IssueDate)
                throw new ArgumentException("Valid-until date must be after the issue date.");

            var student = await _context.Students.FindAsync(request.StudentId);
            if (student == null)
                throw new KeyNotFoundException($"Student with ID '{request.StudentId}' not found.");

            var template = await _context.CertificateTemplates
                .FirstOrDefaultAsync(t => t.Id == request.TemplateId && t.SchoolId == request.SchoolId);
            if (template == null)
                throw new KeyNotFoundException($"Certificate template with ID '{request.TemplateId}' not found.");
            if (!template.IsActive)
                throw new InvalidOperationException("The selected certificate template is inactive.");

            var staff = await _context.StaffMembers.FindAsync(request.IssuedByStaffId);
            if (staff == null)
                throw new KeyNotFoundException($"Staff member with ID '{request.IssuedByStaffId}' not found.");

            var duplicate = await _context.Certificates
                .AnyAsync(c => c.SchoolId == request.SchoolId
                            && c.StudentId == request.StudentId
                            && c.CertificateType == request.CertificateType
                            && c.Status == "Active");
            if (duplicate)
                throw new InvalidOperationException($"Student already has an active '{request.CertificateType}' certificate.");

            var numberTaken = await _context.Certificates
                .AnyAsync(c => c.SchoolId == request.SchoolId
                            && c.CertificateNumber == request.CertificateNumber.Trim());
            if (numberTaken)
                throw new InvalidOperationException($"Certificate number '{request.CertificateNumber}' already exists.");

            var cert = new Certificate
            {
                Id                = Guid.NewGuid(),
                SchoolId          = request.SchoolId,
                CertificateNumber = request.CertificateNumber.Trim(),
                CertificateType   = request.CertificateType,
                Title             = request.Title.Trim(),
                StudentId         = request.StudentId,
                ClassId           = request.ClassId,
                SectionId         = request.SectionId,
                TemplateId        = request.TemplateId,
                Content           = request.Content?.Trim(),
                IssueDate         = request.IssueDate.Date,
                ValidUntil        = request.ValidUntil,
                IssuedByStaffId   = request.IssuedByStaffId,
                Status            = "Active",
                IsPrinted         = false,
                Metadata          = request.Metadata,
                CreatedAt         = DateTime.UtcNow,
                UpdatedAt         = DateTime.UtcNow
            };

            _context.Certificates.Add(cert);
            await _context.SaveChangesAsync();
            return (await GetCertificateByIdAsync(cert.Id, request.SchoolId))!;
        }

        public async Task<CertificateResponse> UpdateCertificateAsync(
            Guid certificateId, UpdateCertificateRequest request, Guid schoolId)
        {
            var cert = await _context.Certificates
                .FirstOrDefaultAsync(c => c.Id == certificateId && c.SchoolId == schoolId);
            if (cert == null)
                throw new KeyNotFoundException("Certificate not found.");

            if (request.Title != null)
            {
                if (string.IsNullOrWhiteSpace(request.Title))
                    throw new ArgumentException("Title cannot be blank.");
                if (request.Title.Length < CertificateConstants.TitleMin || request.Title.Length > CertificateConstants.TitleMax)
                    throw new ArgumentException($"Title must be between {CertificateConstants.TitleMin} and {CertificateConstants.TitleMax} characters.");
                cert.Title = request.Title.Trim();
            }

            if (request.Content != null) cert.Content = request.Content.Trim();

            if (request.ValidUntil.HasValue)
            {
                if (request.ValidUntil.Value <= cert.IssueDate)
                    throw new ArgumentException("Valid-until date must be after the issue date.");
                cert.ValidUntil = request.ValidUntil.Value;
            }

            if (request.Status != null)
            {
                if (!CertificateConstants.ValidCertificateStatuses.Contains(request.Status))
                    throw new ArgumentException($"Invalid status '{request.Status}'.");
                cert.Status = request.Status;
            }

            if (request.Metadata != null)
            {
                if (request.Metadata.Length > CertificateConstants.MetadataMax)
                    throw new ArgumentException($"Metadata must not exceed {CertificateConstants.MetadataMax} characters.");
                cert.Metadata = request.Metadata;
            }

            cert.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return (await GetCertificateByIdAsync(certificateId, schoolId))!;
        }

        public async Task<bool> DeleteCertificateAsync(Guid certificateId, Guid schoolId)
        {
            var cert = await _context.Certificates
                .FirstOrDefaultAsync(c => c.Id == certificateId && c.SchoolId == schoolId);
            if (cert == null) return false;

            _context.Certificates.Remove(cert);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<CertificateResponse> GenerateCertificateAsync(Guid certificateId, Guid schoolId)
        {
            var cert = await _context.Certificates
                .Include(c => c.Template)
                .FirstOrDefaultAsync(c => c.Id == certificateId && c.SchoolId == schoolId);
            if (cert == null)
                throw new KeyNotFoundException("Certificate not found.");

            cert.FileUrl   = $"/certificates/{certificateId}.pdf";
            cert.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return (await GetCertificateByIdAsync(certificateId, schoolId))!;
        }

        public async Task<CertificateResponse> MarkCertificateAsPrintedAsync(Guid certificateId, Guid schoolId)
        {
            var cert = await _context.Certificates
                .FirstOrDefaultAsync(c => c.Id == certificateId && c.SchoolId == schoolId);
            if (cert == null)
                throw new KeyNotFoundException("Certificate not found.");

            if (!cert.IsPrinted)
            {
                cert.IsPrinted = true;
                cert.PrintedAt = DateTime.UtcNow;
                cert.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }

            return (await GetCertificateByIdAsync(certificateId, schoolId))!;
        }

        public async Task<CertificateResponse> RevokeCertificateAsync(Guid certificateId, Guid schoolId)
        {
            var cert = await _context.Certificates
                .FirstOrDefaultAsync(c => c.Id == certificateId && c.SchoolId == schoolId);
            if (cert == null)
                throw new KeyNotFoundException("Certificate not found.");
            if (cert.Status == "Revoked")
                throw new InvalidOperationException("Certificate is already revoked.");

            cert.Status    = "Revoked";
            cert.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return (await GetCertificateByIdAsync(certificateId, schoolId))!;
        }

        public async Task<CertificateStatsResponse> GetCertificateStatsAsync(Guid schoolId)
        {
            var certs = await _context.Certificates
                .Where(c => c.SchoolId == schoolId)
                .ToListAsync();

            var byType = certs
                .GroupBy(c => c.CertificateType)
                .Select(g => new CertificateTypeStatDto { CertificateType = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .ToList();

            var cards = await _context.IDCards
                .Where(c => c.SchoolId == schoolId)
                .ToListAsync();

            var certTemplateCount = await _context.CertificateTemplates.CountAsync(t => t.SchoolId == schoolId);
            var cardTemplateCount = await _context.IDCardTemplates.CountAsync(t => t.SchoolId == schoolId);

            return new CertificateStatsResponse
            {
                TotalCertificates   = certs.Count,
                ActiveCertificates  = certs.Count(c => c.Status == "Active"),
                RevokedCertificates = certs.Count(c => c.Status == "Revoked"),
                ExpiredCertificates = certs.Count(c => c.Status == "Expired"),
                PrintedCertificates = certs.Count(c => c.IsPrinted),
                CertificateTemplates= certTemplateCount,
                TotalIDCards        = cards.Count,
                ActiveIDCards       = cards.Count(c => c.Status == "Active"),
                ExpiredIDCards      = cards.Count(c => c.Status == "Expired"),
                LostIDCards         = cards.Count(c => c.Status == "Lost"),
                PrintedIDCards      = cards.Count(c => c.IsPrinted),
                IDCardTemplates     = cardTemplateCount,
                ByType              = byType
            };
        }

        // ═══════════════════════════════════════════════════════════════════════
        // ID Card Templates
        // ═══════════════════════════════════════════════════════════════════════

        public async Task<IDCardTemplateListResponse> GetIDCardTemplatesAsync(
            Guid schoolId, int page = 1, int pageSize = 10,
            string? cardType = null, bool? isActive = null)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;
            if (pageSize > 100) pageSize = 100;

            var query = _context.IDCardTemplates.Where(t => t.SchoolId == schoolId);

            if (!string.IsNullOrWhiteSpace(cardType))
                query = query.Where(t => t.CardType == cardType);
            if (isActive.HasValue)
                query = query.Where(t => t.IsActive == isActive.Value);

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(t => t.IsDefault)
                .ThenByDescending(t => t.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var templateIds = items.Select(t => t.Id).ToList();
            var counts = await _context.IDCards
                .Where(c => templateIds.Contains(c.TemplateId))
                .GroupBy(c => c.TemplateId)
                .Select(g => new { g.Key, Count = g.Count() })
                .ToDictionaryAsync(g => g.Key, g => g.Count);

            var responses = items.Select(t =>
            {
                var r = MapToIDCardTemplateResponse(t);
                r.CardsIssuedCount = counts.TryGetValue(t.Id, out var cnt) ? cnt : 0;
                return r;
            }).ToList();

            return new IDCardTemplateListResponse
            {
                Items      = responses,
                TotalCount = totalCount,
                Page       = page,
                PageSize   = pageSize,
                TotalPages = totalCount == 0 ? 0 : (int)Math.Ceiling((double)totalCount / pageSize)
            };
        }

        public async Task<IDCardTemplateResponse?> GetIDCardTemplateByIdAsync(Guid templateId, Guid schoolId)
        {
            var template = await _context.IDCardTemplates
                .FirstOrDefaultAsync(t => t.Id == templateId && t.SchoolId == schoolId);
            if (template == null) return null;

            var r = MapToIDCardTemplateResponse(template);
            r.CardsIssuedCount = await _context.IDCards.CountAsync(c => c.TemplateId == templateId);
            return r;
        }

        public async Task<IDCardTemplateResponse> CreateIDCardTemplateAsync(CreateIDCardTemplateRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                throw new ArgumentException("Template name is required.");
            if (request.Name.Length < CertificateConstants.TemplateNameMin || request.Name.Length > CertificateConstants.TemplateNameMax)
                throw new ArgumentException($"Template name must be between {CertificateConstants.TemplateNameMin} and {CertificateConstants.TemplateNameMax} characters.");
            if (!CertificateConstants.ValidCardTypes.Contains(request.CardType))
                throw new ArgumentException($"Invalid card type '{request.CardType}'.");
            if (!CertificateConstants.ValidCardSizes.Contains(request.CardSize))
                throw new ArgumentException($"Invalid card size '{request.CardSize}'.");
            if (string.IsNullOrWhiteSpace(request.FrontTemplate))
                throw new ArgumentException("Front template HTML content is required.");
            if (request.Description != null && request.Description.Length > CertificateConstants.DescriptionMax)
                throw new ArgumentException($"Description must not exceed {CertificateConstants.DescriptionMax} characters.");

            var exists = await _context.IDCardTemplates
                .AnyAsync(t => t.SchoolId == request.SchoolId
                            && t.Name == request.Name.Trim()
                            && t.CardType == request.CardType);
            if (exists)
                throw new InvalidOperationException($"A template named '{request.Name}' already exists for card type '{request.CardType}'.");

            if (request.IsDefault)
            {
                var defaults = await _context.IDCardTemplates
                    .Where(t => t.SchoolId == request.SchoolId && t.CardType == request.CardType && t.IsDefault)
                    .ToListAsync();
                defaults.ForEach(d => d.IsDefault = false);
            }

            var template = new IDCardTemplate
            {
                Id              = Guid.NewGuid(),
                SchoolId        = request.SchoolId,
                Name            = request.Name.Trim(),
                CardType        = request.CardType,
                Description     = request.Description?.Trim(),
                FrontTemplate   = request.FrontTemplate,
                BackTemplate    = request.BackTemplate,
                CardSize        = request.CardSize,
                Styles          = request.Styles,
                BackgroundImage = request.BackgroundImage,
                ShowBarcode     = request.ShowBarcode,
                ShowQRCode      = request.ShowQRCode,
                IsActive        = true,
                IsDefault       = request.IsDefault,
                CreatedAt       = DateTime.UtcNow,
                UpdatedAt       = DateTime.UtcNow
            };

            _context.IDCardTemplates.Add(template);
            await _context.SaveChangesAsync();
            return MapToIDCardTemplateResponse(template);
        }

        public async Task<IDCardTemplateResponse> UpdateIDCardTemplateAsync(
            Guid templateId, UpdateIDCardTemplateRequest request, Guid schoolId)
        {
            var template = await _context.IDCardTemplates
                .FirstOrDefaultAsync(t => t.Id == templateId && t.SchoolId == schoolId);
            if (template == null)
                throw new KeyNotFoundException("ID Card template not found.");

            if (request.Name != null)
            {
                if (string.IsNullOrWhiteSpace(request.Name))
                    throw new ArgumentException("Template name cannot be blank.");
                if (request.Name.Length < CertificateConstants.TemplateNameMin || request.Name.Length > CertificateConstants.TemplateNameMax)
                    throw new ArgumentException($"Template name must be between {CertificateConstants.TemplateNameMin} and {CertificateConstants.TemplateNameMax} characters.");
                var nameConflict = await _context.IDCardTemplates
                    .AnyAsync(t => t.SchoolId == schoolId && t.Id != templateId
                                && t.Name == request.Name.Trim() && t.CardType == template.CardType);
                if (nameConflict)
                    throw new InvalidOperationException($"A template named '{request.Name}' already exists for card type '{template.CardType}'.");
                template.Name = request.Name.Trim();
            }

            if (request.Description != null)
            {
                if (request.Description.Length > CertificateConstants.DescriptionMax)
                    throw new ArgumentException($"Description must not exceed {CertificateConstants.DescriptionMax} characters.");
                template.Description = request.Description.Trim();
            }

            if (request.FrontTemplate != null)
            {
                if (string.IsNullOrWhiteSpace(request.FrontTemplate))
                    throw new ArgumentException("Front template content cannot be blank.");
                template.FrontTemplate = request.FrontTemplate;
            }

            if (request.BackTemplate != null)    template.BackTemplate    = request.BackTemplate;
            if (request.Styles != null)          template.Styles          = request.Styles;
            if (request.BackgroundImage != null) template.BackgroundImage = request.BackgroundImage;
            if (request.ShowBarcode.HasValue)    template.ShowBarcode     = request.ShowBarcode.Value;
            if (request.ShowQRCode.HasValue)     template.ShowQRCode      = request.ShowQRCode.Value;
            if (request.IsActive.HasValue)       template.IsActive        = request.IsActive.Value;

            if (request.CardSize != null)
            {
                if (!CertificateConstants.ValidCardSizes.Contains(request.CardSize))
                    throw new ArgumentException($"Invalid card size '{request.CardSize}'.");
                template.CardSize = request.CardSize;
            }

            if (request.IsDefault.HasValue)
            {
                if (request.IsDefault.Value)
                {
                    var others = await _context.IDCardTemplates
                        .Where(t => t.SchoolId == schoolId && t.CardType == template.CardType
                                 && t.IsDefault && t.Id != templateId)
                        .ToListAsync();
                    others.ForEach(o => o.IsDefault = false);
                }
                template.IsDefault = request.IsDefault.Value;
            }

            template.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return MapToIDCardTemplateResponse(template);
        }

        public async Task<bool> DeleteIDCardTemplateAsync(Guid templateId, Guid schoolId)
        {
            var template = await _context.IDCardTemplates
                .FirstOrDefaultAsync(t => t.Id == templateId && t.SchoolId == schoolId);
            if (template == null) return false;

            var inUse = await _context.IDCards.AnyAsync(c => c.TemplateId == templateId);
            if (inUse)
                throw new InvalidOperationException("Cannot delete template: it is referenced by existing ID cards.");

            _context.IDCardTemplates.Remove(template);
            await _context.SaveChangesAsync();
            return true;
        }

        // ═══════════════════════════════════════════════════════════════════════
        // ID Cards
        // ═══════════════════════════════════════════════════════════════════════

        public async Task<IDCardListResponse> GetIDCardsAsync(
            Guid schoolId, int page = 1, int pageSize = 10,
            string? cardType = null, string? status = null)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;
            if (pageSize > 100) pageSize = 100;

            var query = _context.IDCards
                .Include(ic => ic.Template)
                .Where(ic => ic.SchoolId == schoolId);

            if (!string.IsNullOrWhiteSpace(cardType))
                query = query.Where(ic => ic.CardType == cardType);
            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(ic => ic.Status == status);

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(ic => ic.IssueDate)
                .ThenByDescending(ic => ic.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var responses = new List<IDCardResponse>();
            foreach (var card in items)
                responses.Add(await MapToIDCardResponseAsync(card));

            return new IDCardListResponse
            {
                Items      = responses,
                TotalCount = totalCount,
                Page       = page,
                PageSize   = pageSize,
                TotalPages = totalCount == 0 ? 0 : (int)Math.Ceiling((double)totalCount / pageSize)
            };
        }

        public async Task<IDCardResponse?> GetIDCardByIdAsync(Guid cardId, Guid schoolId)
        {
            var card = await _context.IDCards
                .Include(ic => ic.Template)
                .FirstOrDefaultAsync(ic => ic.Id == cardId && ic.SchoolId == schoolId);
            return card != null ? await MapToIDCardResponseAsync(card) : null;
        }

        public async Task<IDCardListResponse> GetHolderIDCardsAsync(
            Guid holderId, string holderType, Guid schoolId)
        {
            if (!CertificateConstants.ValidHolderTypes.Contains(holderType))
                throw new ArgumentException($"Invalid holder type '{holderType}'.");

            var cards = await _context.IDCards
                .Include(ic => ic.Template)
                .Where(ic => ic.HolderId == holderId && ic.HolderType == holderType && ic.SchoolId == schoolId)
                .OrderByDescending(ic => ic.IssueDate)
                .ToListAsync();

            var responses = new List<IDCardResponse>();
            foreach (var card in cards)
                responses.Add(await MapToIDCardResponseAsync(card));

            return new IDCardListResponse
            {
                Items      = responses,
                TotalCount = cards.Count,
                Page       = 1,
                PageSize   = cards.Count == 0 ? 10 : cards.Count,
                TotalPages = cards.Count == 0 ? 0 : 1
            };
        }

        public async Task<IDCardResponse> CreateIDCardAsync(CreateIDCardRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.CardNumber))
                throw new ArgumentException("Card number is required.");
            if (request.CardNumber.Length < CertificateConstants.CardNumberMin || request.CardNumber.Length > CertificateConstants.CardNumberMax)
                throw new ArgumentException($"Card number must be between {CertificateConstants.CardNumberMin} and {CertificateConstants.CardNumberMax} characters.");
            if (!CertificateConstants.ValidCardTypes.Contains(request.CardType))
                throw new ArgumentException($"Invalid card type '{request.CardType}'.");
            if (!CertificateConstants.ValidHolderTypes.Contains(request.HolderType))
                throw new ArgumentException($"Invalid holder type '{request.HolderType}'.");
            if (request.HolderId == Guid.Empty)
                throw new ArgumentException("Holder ID is required.");
            if (request.TemplateId == Guid.Empty)
                throw new ArgumentException("Template ID is required.");
            if (request.ExpiryDate <= request.IssueDate)
                throw new ArgumentException("Expiry date must be after issue date.");
            if (request.Metadata != null && request.Metadata.Length > CertificateConstants.MetadataMax)
                throw new ArgumentException($"Metadata must not exceed {CertificateConstants.MetadataMax} characters.");

            var template = await _context.IDCardTemplates
                .FirstOrDefaultAsync(t => t.Id == request.TemplateId && t.SchoolId == request.SchoolId);
            if (template == null)
                throw new KeyNotFoundException($"ID Card template with ID '{request.TemplateId}' not found.");
            if (!template.IsActive)
                throw new InvalidOperationException("The selected ID card template is inactive.");

            if (request.HolderType == "Student")
            {
                var student = await _context.Students.FindAsync(request.HolderId);
                if (student == null)
                    throw new KeyNotFoundException($"Student with ID '{request.HolderId}' not found.");
            }
            else if (request.HolderType == "Staff")
            {
                var staff = await _context.StaffMembers.FindAsync(request.HolderId);
                if (staff == null)
                    throw new KeyNotFoundException($"Staff member with ID '{request.HolderId}' not found.");
            }

            var numberTaken = await _context.IDCards
                .AnyAsync(c => c.SchoolId == request.SchoolId && c.CardNumber == request.CardNumber.Trim());
            if (numberTaken)
                throw new InvalidOperationException($"Card number '{request.CardNumber}' already exists.");

            var card = new IDCard
            {
                Id          = Guid.NewGuid(),
                SchoolId    = request.SchoolId,
                CardNumber  = request.CardNumber.Trim(),
                CardType    = request.CardType,
                HolderId    = request.HolderId,
                HolderType  = request.HolderType,
                TemplateId  = request.TemplateId,
                PhotoUrl    = request.PhotoUrl,
                BarcodeData = request.BarcodeData,
                QRCodeData  = request.QRCodeData,
                IssueDate   = request.IssueDate.Date,
                ExpiryDate  = request.ExpiryDate,
                Status      = "Active",
                IsPrinted   = false,
                Metadata    = request.Metadata,
                CreatedAt   = DateTime.UtcNow,
                UpdatedAt   = DateTime.UtcNow
            };

            _context.IDCards.Add(card);
            await _context.SaveChangesAsync();
            return (await GetIDCardByIdAsync(card.Id, request.SchoolId))!;
        }

        public async Task<IDCardResponse> UpdateIDCardAsync(
            Guid cardId, UpdateIDCardRequest request, Guid schoolId)
        {
            var card = await _context.IDCards
                .FirstOrDefaultAsync(ic => ic.Id == cardId && ic.SchoolId == schoolId);
            if (card == null)
                throw new KeyNotFoundException("ID Card not found.");

            if (request.PhotoUrl != null) card.PhotoUrl = request.PhotoUrl;

            if (request.ExpiryDate.HasValue)
            {
                if (request.ExpiryDate.Value <= card.IssueDate)
                    throw new ArgumentException("Expiry date must be after issue date.");
                card.ExpiryDate = request.ExpiryDate.Value;
            }

            if (request.Status != null)
            {
                if (!CertificateConstants.ValidCardStatuses.Contains(request.Status))
                    throw new ArgumentException($"Invalid status '{request.Status}'.");
                card.Status = request.Status;
            }

            if (request.Metadata != null)
            {
                if (request.Metadata.Length > CertificateConstants.MetadataMax)
                    throw new ArgumentException($"Metadata must not exceed {CertificateConstants.MetadataMax} characters.");
                card.Metadata = request.Metadata;
            }

            card.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return (await GetIDCardByIdAsync(cardId, schoolId))!;
        }

        public async Task<bool> DeleteIDCardAsync(Guid cardId, Guid schoolId)
        {
            var card = await _context.IDCards
                .FirstOrDefaultAsync(ic => ic.Id == cardId && ic.SchoolId == schoolId);
            if (card == null) return false;

            _context.IDCards.Remove(card);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<IDCardResponse> GenerateIDCardAsync(Guid cardId, Guid schoolId)
        {
            var card = await _context.IDCards
                .Include(ic => ic.Template)
                .FirstOrDefaultAsync(ic => ic.Id == cardId && ic.SchoolId == schoolId);
            if (card == null)
                throw new KeyNotFoundException("ID Card not found.");

            card.FileUrl   = $"/idcards/{cardId}.pdf";
            card.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return (await GetIDCardByIdAsync(cardId, schoolId))!;
        }

        public async Task<IDCardResponse> MarkIDCardAsPrintedAsync(Guid cardId, Guid schoolId)
        {
            var card = await _context.IDCards
                .FirstOrDefaultAsync(ic => ic.Id == cardId && ic.SchoolId == schoolId);
            if (card == null)
                throw new KeyNotFoundException("ID Card not found.");

            if (!card.IsPrinted)
            {
                card.IsPrinted = true;
                card.PrintedAt = DateTime.UtcNow;
                card.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }

            return (await GetIDCardByIdAsync(cardId, schoolId))!;
        }

        // ═══════════════════════════════════════════════════════════════════════
        // Private mapping helpers
        // ═══════════════════════════════════════════════════════════════════════

        private static CertificateTemplateResponse MapToCertificateTemplateResponse(CertificateTemplate t) =>
            new CertificateTemplateResponse
            {
                Id              = t.Id,
                SchoolId        = t.SchoolId,
                Name            = t.Name,
                CertificateType = t.CertificateType,
                Description     = t.Description,
                Template        = t.Template,
                Orientation     = t.Orientation,
                PageSize        = t.PageSize,
                Styles          = t.Styles,
                HeaderImage     = t.HeaderImage,
                FooterImage     = t.FooterImage,
                WatermarkImage  = t.WatermarkImage,
                IsActive        = t.IsActive,
                IsDefault       = t.IsDefault,
                CreatedAt       = t.CreatedAt,
                UpdatedAt       = t.UpdatedAt
            };

        private static CertificateResponse MapToCertificateResponse(Certificate c) =>
            new CertificateResponse
            {
                Id                = c.Id,
                SchoolId          = c.SchoolId,
                CertificateNumber = c.CertificateNumber,
                CertificateType   = c.CertificateType,
                Title             = c.Title,
                StudentId         = c.StudentId,
                StudentName       = c.Student?.Name,
                ClassId           = c.ClassId,
                ClassName         = c.Class?.Name,
                SectionId         = c.SectionId,
                SectionName       = c.Section?.Name,
                TemplateId        = c.TemplateId,
                TemplateName      = c.Template?.Name,
                Content           = c.Content,
                IssueDate         = c.IssueDate,
                ValidUntil        = c.ValidUntil,
                IssuedByStaffId   = c.IssuedByStaffId,
                IssuedByStaffName = c.IssuedByStaff != null
                    ? $"{c.IssuedByStaff.FirstName} {c.IssuedByStaff.LastName}".Trim()
                    : null,
                FileUrl           = c.FileUrl,
                Status            = c.Status,
                Metadata          = c.Metadata,
                IsPrinted         = c.IsPrinted,
                PrintedAt         = c.PrintedAt,
                CreatedAt         = c.CreatedAt,
                UpdatedAt         = c.UpdatedAt
            };

        private static IDCardTemplateResponse MapToIDCardTemplateResponse(IDCardTemplate t) =>
            new IDCardTemplateResponse
            {
                Id              = t.Id,
                SchoolId        = t.SchoolId,
                Name            = t.Name,
                CardType        = t.CardType,
                Description     = t.Description,
                FrontTemplate   = t.FrontTemplate,
                BackTemplate    = t.BackTemplate,
                CardSize        = t.CardSize,
                Styles          = t.Styles,
                BackgroundImage = t.BackgroundImage,
                ShowBarcode     = t.ShowBarcode,
                ShowQRCode      = t.ShowQRCode,
                IsActive        = t.IsActive,
                IsDefault       = t.IsDefault,
                CreatedAt       = t.CreatedAt,
                UpdatedAt       = t.UpdatedAt
            };

        private async Task<IDCardResponse> MapToIDCardResponseAsync(IDCard card)
        {
            string? holderName = null;

            if (card.HolderType == "Student")
            {
                var student = await _context.Students.FindAsync(card.HolderId);
                if (student != null) holderName = student.Name;
            }
            else if (card.HolderType == "Staff")
            {
                var staff = await _context.StaffMembers.FindAsync(card.HolderId);
                if (staff != null)
                    holderName = $"{staff.FirstName} {staff.LastName}".Trim();
            }

            return new IDCardResponse
            {
                Id          = card.Id,
                SchoolId    = card.SchoolId,
                CardNumber  = card.CardNumber,
                CardType    = card.CardType,
                HolderId    = card.HolderId,
                HolderType  = card.HolderType,
                HolderName  = holderName,
                TemplateId  = card.TemplateId,
                TemplateName= card.Template?.Name,
                PhotoUrl    = card.PhotoUrl,
                BarcodeData = card.BarcodeData,
                QRCodeData  = card.QRCodeData,
                IssueDate   = card.IssueDate,
                ExpiryDate  = card.ExpiryDate,
                Status      = card.Status,
                FileUrl     = card.FileUrl,
                IsPrinted   = card.IsPrinted,
                PrintedAt   = card.PrintedAt,
                Metadata    = card.Metadata,
                CreatedAt   = card.CreatedAt,
                UpdatedAt   = card.UpdatedAt
            };
        }
    }
}