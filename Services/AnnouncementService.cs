using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;
using SmsApi.Utils;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SmsApi.Services
{
    public interface IAnnouncementService
    {
        Task<AnnouncementListResponse> GetAnnouncementsAsync(Guid schoolId, AnnouncementFiltersDto filters, int page, int pageSize);
        Task<AnnouncementResponse?> GetAnnouncementByIdAsync(Guid id, Guid schoolId);
        Task<AnnouncementResponse> CreateAnnouncementAsync(Guid schoolId, CreateAnnouncementRequest dto);
        Task<AnnouncementResponse> UpdateAnnouncementAsync(Guid schoolId, Guid id, UpdateAnnouncementRequest dto);
        Task<bool> DeleteAnnouncementAsync(Guid id, Guid schoolId);
        Task<bool> MarkAsReadAsync(Guid schoolId, MarkAnnouncementAsReadRequest request);
        Task<AnnouncementRecipientsListResponse> GetRecipientsAsync(Guid announcementId, Guid schoolId, bool? isRead, int page, int pageSize);
        Task<List<AnnouncementResponse>> GetMyAnnouncementsAsync(Guid recipientId, string recipientType, Guid schoolId);
        Task<List<AnnouncementResponse>> GetParentAnnouncementsAsync(string parentEmail, Guid schoolId);
        Task<AnnouncementStatsDto> GetStatsAsync(Guid schoolId);
    }

    public class AnnouncementService : IAnnouncementService
    {
        private readonly AppDbContext _context;

        public AnnouncementService(AppDbContext context)
        {
            _context = context;
        }

        // ─────────────────────────────────────────────────────────────
        // READ: list
        // ─────────────────────────────────────────────────────────────
        public async Task<AnnouncementListResponse> GetAnnouncementsAsync(
            Guid schoolId, AnnouncementFiltersDto filters, int page, int pageSize)
        {
            // Pagination normalization
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;
            if (pageSize > 100) pageSize = 100;

            var query = _context.Announcements
                .Include(a => a.CreatedByStaff)
                .Include(a => a.TargetClass)
                .Include(a => a.TargetSection)
                .Include(a => a.Recipients)
                .Where(a => a.SchoolId == schoolId)
                .AsQueryable();

            if (filters.IsActive.HasValue)
                query = query.Where(a => a.IsActive == filters.IsActive.Value);

            if (filters.IsPinned.HasValue)
                query = query.Where(a => a.IsPinned == filters.IsPinned.Value);

            if (!string.IsNullOrWhiteSpace(filters.TargetAudience))
                query = query.Where(a => a.TargetAudience == filters.TargetAudience.ToLower());

            if (!string.IsNullOrWhiteSpace(filters.Priority))
                query = query.Where(a => a.Priority == filters.Priority.ToLower());

            if (!string.IsNullOrWhiteSpace(filters.Search))
            {
                var search = filters.Search.ToLower();
                query = query.Where(a => a.Title.ToLower().Contains(search) ||
                                         a.Content.ToLower().Contains(search));
            }

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(a => a.IsPinned)
                .ThenByDescending(a => a.PublishedDate)
                .ThenByDescending(a => a.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new AnnouncementListResponse
            {
                Items      = items.Select(MapToResponse).ToList(),
                TotalCount = totalCount,
                Page       = page,
                PageSize   = pageSize,
                TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
            };
        }

        // ─────────────────────────────────────────────────────────────
        // READ: single
        // ─────────────────────────────────────────────────────────────
        public async Task<AnnouncementResponse?> GetAnnouncementByIdAsync(Guid id, Guid schoolId)
        {
            var announcement = await _context.Announcements
                .Include(a => a.CreatedByStaff)
                .Include(a => a.TargetClass)
                .Include(a => a.TargetSection)
                .Include(a => a.Recipients)
                .FirstOrDefaultAsync(a => a.Id == id && a.SchoolId == schoolId);

            return announcement == null ? null : MapToResponse(announcement);
        }

        // ─────────────────────────────────────────────────────────────
        // CREATE
        // ─────────────────────────────────────────────────────────────
        public async Task<AnnouncementResponse> CreateAnnouncementAsync(Guid schoolId, CreateAnnouncementRequest dto)
        {
            // Title validation
            var title = dto.Title?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(title))
                throw new ArgumentException("Announcement title is required.");
            if (title.Length < AnnouncementConstants.TitleMinLength)
                throw new ArgumentException(
                    $"Title must be at least {AnnouncementConstants.TitleMinLength} characters.");
            if (title.Length > AnnouncementConstants.TitleMaxLength)
                throw new ArgumentException(
                    $"Title cannot exceed {AnnouncementConstants.TitleMaxLength} characters.");

            // Content validation
            var content = dto.Content?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(content))
                throw new ArgumentException("Announcement content is required.");
            if (content.Length < AnnouncementConstants.ContentMinLength)
                throw new ArgumentException(
                    $"Content must be at least {AnnouncementConstants.ContentMinLength} characters.");
            if (content.Length > AnnouncementConstants.ContentMaxLength)
                throw new ArgumentException(
                    $"Content cannot exceed {AnnouncementConstants.ContentMaxLength} characters.");

            // Priority validation
            var priority = (dto.Priority?.Trim() ?? AnnouncementConstants.PriorityNormal).ToLower();
            if (!AnnouncementConstants.ValidPriorities.Contains(priority))
                throw new ArgumentException(
                    $"Invalid priority '{dto.Priority}'. Valid values: {string.Join(", ", AnnouncementConstants.ValidPriorities)}.");

            // TargetAudience validation
            var audience = (dto.TargetAudience?.Trim() ?? AnnouncementConstants.AudienceAll).ToLower();
            if (!AnnouncementConstants.ValidAudiences.Contains(audience))
                throw new ArgumentException(
                    $"Invalid targetAudience '{dto.TargetAudience}'. Valid values: {string.Join(", ", AnnouncementConstants.ValidAudiences)}.");

            // Audience-specific FK requirements
            if (audience == AnnouncementConstants.AudienceClass && !dto.TargetClassId.HasValue)
                throw new ArgumentException("TargetClassId is required when TargetAudience is 'class'.");
            if (audience == AnnouncementConstants.AudienceSection && !dto.TargetSectionId.HasValue)
                throw new ArgumentException("TargetSectionId is required when TargetAudience is 'section'.");

            // ExpiryDate: must be future if provided
            if (dto.ExpiryDate.HasValue && dto.ExpiryDate.Value <= DateTime.UtcNow)
                throw new ArgumentException("ExpiryDate must be a future date/time.");

            // AttachmentUrl length
            if (dto.AttachmentUrl != null && dto.AttachmentUrl.Length > AnnouncementConstants.AttachmentUrlMax)
                throw new ArgumentException(
                    $"AttachmentUrl cannot exceed {AnnouncementConstants.AttachmentUrlMax} characters.");

            // Duplicate prevention: same title (case-insensitive) + same school in last 24 hours
            var titleLower = title.ToLower();
            var cutoff     = DateTime.UtcNow.AddHours(-24);
            var duplicate  = await _context.Announcements
                .AnyAsync(a => a.SchoolId == schoolId &&
                               a.Title.ToLower() == titleLower &&
                               a.CreatedAt >= cutoff);
            if (duplicate)
                throw new InvalidOperationException(
                    "An announcement with this title was already created in the last 24 hours.");

            var now = DateTime.UtcNow;
            var announcement = new Announcement
            {
                Id             = Guid.NewGuid(),
                SchoolId       = schoolId,
                Title          = title,
                Content        = content,
                CreatedByStaffId = dto.CreatedByStaffId,
                Priority       = priority,
                TargetAudience = audience,
                TargetClassId  = audience == AnnouncementConstants.AudienceClass    ? dto.TargetClassId   : null,
                TargetSectionId= audience == AnnouncementConstants.AudienceSection  ? dto.TargetSectionId : null,
                PublishedDate  = now,
                ExpiryDate     = dto.ExpiryDate,
                IsPinned       = dto.IsPinned,
                AttachmentUrl  = dto.AttachmentUrl,
                IsActive       = true,
                CreatedAt      = now,
                UpdatedAt      = now
            };

            _context.Announcements.Add(announcement);
            await _context.SaveChangesAsync();

            // Auto-populate recipients
            await CreateRecipientsAsync(announcement);

            // Push notification to parent portals
            await NotifyParentsAsync(announcement);

            // Push notification to staff
            await NotifyStaffAsync(announcement);

            // Reload with navigation props
            var created = await _context.Announcements
                .Include(a => a.CreatedByStaff)
                .Include(a => a.TargetClass)
                .Include(a => a.TargetSection)
                .Include(a => a.Recipients)
                .FirstAsync(a => a.Id == announcement.Id);

            return MapToResponse(created);
        }

        // ─────────────────────────────────────────────────────────────
        // UPDATE
        // ─────────────────────────────────────────────────────────────
        public async Task<AnnouncementResponse> UpdateAnnouncementAsync(Guid schoolId, Guid id, UpdateAnnouncementRequest dto)
        {
            var announcement = await _context.Announcements
                .Include(a => a.CreatedByStaff)
                .Include(a => a.TargetClass)
                .Include(a => a.TargetSection)
                .Include(a => a.Recipients)
                .FirstOrDefaultAsync(a => a.Id == id && a.SchoolId == schoolId)
                ?? throw new KeyNotFoundException($"Announcement {id} not found.");

            // Title
            if (dto.Title != null)
            {
                var title = dto.Title.Trim();
                if (title.Length < AnnouncementConstants.TitleMinLength)
                    throw new ArgumentException(
                        $"Title must be at least {AnnouncementConstants.TitleMinLength} characters.");
                if (title.Length > AnnouncementConstants.TitleMaxLength)
                    throw new ArgumentException(
                        $"Title cannot exceed {AnnouncementConstants.TitleMaxLength} characters.");
                announcement.Title = title;
            }

            // Content
            if (dto.Content != null)
            {
                var content = dto.Content.Trim();
                if (content.Length < AnnouncementConstants.ContentMinLength)
                    throw new ArgumentException(
                        $"Content must be at least {AnnouncementConstants.ContentMinLength} characters.");
                if (content.Length > AnnouncementConstants.ContentMaxLength)
                    throw new ArgumentException(
                        $"Content cannot exceed {AnnouncementConstants.ContentMaxLength} characters.");
                announcement.Content = content;
            }

            // Priority
            if (dto.Priority != null)
            {
                var priority = dto.Priority.Trim().ToLower();
                if (!AnnouncementConstants.ValidPriorities.Contains(priority))
                    throw new ArgumentException(
                        $"Invalid priority '{dto.Priority}'. Valid values: {string.Join(", ", AnnouncementConstants.ValidPriorities)}.");
                announcement.Priority = priority;
            }

            // TargetAudience
            if (dto.TargetAudience != null)
            {
                var audience = dto.TargetAudience.Trim().ToLower();
                if (!AnnouncementConstants.ValidAudiences.Contains(audience))
                    throw new ArgumentException(
                        $"Invalid targetAudience '{dto.TargetAudience}'. Valid values: {string.Join(", ", AnnouncementConstants.ValidAudiences)}.");
                if (audience == AnnouncementConstants.AudienceClass &&
                    !dto.TargetClassId.HasValue && !announcement.TargetClassId.HasValue)
                    throw new ArgumentException("TargetClassId is required when TargetAudience is 'class'.");
                if (audience == AnnouncementConstants.AudienceSection &&
                    !dto.TargetSectionId.HasValue && !announcement.TargetSectionId.HasValue)
                    throw new ArgumentException("TargetSectionId is required when TargetAudience is 'section'.");
                announcement.TargetAudience = audience;
            }

            // ExpiryDate
            if (dto.ExpiryDate.HasValue)
            {
                if (dto.ExpiryDate.Value <= DateTime.UtcNow)
                    throw new ArgumentException("ExpiryDate must be a future date/time.");
                announcement.ExpiryDate = dto.ExpiryDate;
            }

            // AttachmentUrl
            if (dto.AttachmentUrl != null)
            {
                if (dto.AttachmentUrl.Length > AnnouncementConstants.AttachmentUrlMax)
                    throw new ArgumentException(
                        $"AttachmentUrl cannot exceed {AnnouncementConstants.AttachmentUrlMax} characters.");
                announcement.AttachmentUrl = dto.AttachmentUrl;
            }

            if (dto.TargetClassId.HasValue)   announcement.TargetClassId   = dto.TargetClassId;
            if (dto.TargetSectionId.HasValue) announcement.TargetSectionId = dto.TargetSectionId;
            if (dto.IsPinned.HasValue)        announcement.IsPinned        = dto.IsPinned.Value;
            if (dto.IsActive.HasValue)        announcement.IsActive        = dto.IsActive.Value;

            announcement.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return MapToResponse(announcement);
        }

        // ─────────────────────────────────────────────────────────────
        // DELETE
        // ─────────────────────────────────────────────────────────────
        public async Task<bool> DeleteAnnouncementAsync(Guid id, Guid schoolId)
        {
            var announcement = await _context.Announcements
                .FirstOrDefaultAsync(a => a.Id == id && a.SchoolId == schoolId);

            if (announcement == null) return false;

            // Soft delete
            announcement.IsActive  = false;
            announcement.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }

        // ─────────────────────────────────────────────────────────────
        // MARK AS READ
        // ─────────────────────────────────────────────────────────────
        public async Task<bool> MarkAsReadAsync(Guid schoolId, MarkAnnouncementAsReadRequest request)
        {
            // Verify announcement belongs to school
            var exists = await _context.Announcements
                .AnyAsync(a => a.Id == request.AnnouncementId && a.SchoolId == schoolId);
            if (!exists)
                throw new KeyNotFoundException($"Announcement {request.AnnouncementId} not found.");

            var recipient = await _context.AnnouncementRecipients
                .FirstOrDefaultAsync(r => r.AnnouncementId == request.AnnouncementId &&
                                          r.RecipientType   == request.RecipientType &&
                                          r.RecipientId     == request.RecipientId);

            if (recipient == null)
            {
                recipient = new AnnouncementRecipient
                {
                    Id             = Guid.NewGuid(),
                    AnnouncementId = request.AnnouncementId,
                    RecipientType  = request.RecipientType,
                    RecipientId    = request.RecipientId,
                    IsRead         = true,
                    ReadAt         = DateTime.UtcNow,
                    CreatedAt      = DateTime.UtcNow
                };
                _context.AnnouncementRecipients.Add(recipient);
            }
            else if (!recipient.IsRead)
            {
                recipient.IsRead = true;
                recipient.ReadAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            return true;
        }

        // ─────────────────────────────────────────────────────────────
        // RECIPIENTS
        // ─────────────────────────────────────────────────────────────
        public async Task<AnnouncementRecipientsListResponse> GetRecipientsAsync(
            Guid announcementId, Guid schoolId, bool? isRead, int page, int pageSize)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;
            if (pageSize > 100) pageSize = 100;

            // Verify announcement belongs to school
            var exists = await _context.Announcements
                .AnyAsync(a => a.Id == announcementId && a.SchoolId == schoolId);
            if (!exists)
                throw new KeyNotFoundException($"Announcement {announcementId} not found.");

            var query = _context.AnnouncementRecipients
                .Where(r => r.AnnouncementId == announcementId);

            if (isRead.HasValue)
                query = query.Where(r => r.IsRead == isRead.Value);

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(r => r.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new AnnouncementRecipientsListResponse
            {
                Items = items.Select(r => new AnnouncementRecipientResponse
                {
                    Id             = r.Id,
                    AnnouncementId = r.AnnouncementId,
                    RecipientType  = r.RecipientType,
                    RecipientId    = r.RecipientId,
                    IsRead         = r.IsRead,
                    ReadAt         = r.ReadAt,
                    CreatedAt      = r.CreatedAt
                }).ToList(),
                TotalCount = totalCount,
                Page       = page,
                PageSize   = pageSize,
                TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
            };
        }

        // ─────────────────────────────────────────────────────────────
        // MY ANNOUNCEMENTS
        // Returns all announcements relevant to the staff member:
        //   1) Audience = "all"    → everyone sees it (no recipient record needed)
        //   2) Audience = "staff"  → ALL authenticated staff see it (no recipient record needed)
        //   3) Audience = "class"  → this staff teaches that class (TeacherAssignment)
        // Recipient records are for read/unread tracking only — NOT for access control.
        // ─────────────────────────────────────────────────────────────
        public async Task<List<AnnouncementResponse>> GetMyAnnouncementsAsync(
            Guid recipientId, string recipientType, Guid schoolId)
        {
            var now = DateTime.UtcNow;

            // recipientId is the Staff.Id (Guid.Empty when caller could not resolve it).
            // We still need it for class/section teacher-assignment checks.
            var staffEntityId = recipientId;

            // Fetch the class IDs this staff member teaches (subject teacher or class teacher)
            var taughtClassIds = await _context.TeacherAssignments
                .Where(ta => ta.SchoolId == schoolId &&
                             ta.StaffId == staffEntityId &&
                             ta.Status == "active")
                .Select(ta => ta.ClassId)
                .Distinct()
                .ToListAsync();

            var announcements = await _context.Announcements
                .Include(a => a.CreatedByStaff)
                .Include(a => a.Recipients)
                .Include(a => a.TargetClass)
                .Where(a => a.SchoolId == schoolId &&
                            a.IsActive &&
                            (a.ExpiryDate == null || a.ExpiryDate > now) &&
                            (
                                // 1) Targeted at everyone
                                a.TargetAudience == AnnouncementConstants.AudienceAll
                                ||
                                // 2) Targeted at staff and this person is a listed recipient
                                // 2) Targeted at staff — visible to ALL authenticated staff;
                            //    no per-user recipient record is required for display.
                            a.TargetAudience == AnnouncementConstants.AudienceStaff
                                ||
                                // 3) Targeted at a class this staff member teaches
                                (a.TargetAudience == AnnouncementConstants.AudienceClass &&
                                 a.TargetClassId.HasValue &&
                                 taughtClassIds.Contains(a.TargetClassId.Value))
                                ||
                                // 4) Targeted at a section — check if any section belongs to a taught class
                                (a.TargetAudience == AnnouncementConstants.AudienceSection &&
                                 a.TargetSectionId.HasValue &&
                                 _context.TeacherAssignments.Any(ta =>
                                     ta.SchoolId == schoolId &&
                                     ta.StaffId == staffEntityId &&
                                     ta.Status == "active" &&
                                     ta.SectionId == a.TargetSectionId))
                            ))
                .OrderByDescending(a => a.IsPinned)
                .ThenByDescending(a => a.PublishedDate)
                .Take(100)
                .ToListAsync();

            return announcements.Select(MapToResponse).ToList();
        }

        // ─────────────────────────────────────────────────────────────
        // PARENT ANNOUNCEMENTS
        // Returns announcements visible to a parent: audience "all",
        // "parents", or class/section announcements for their children.
        // ─────────────────────────────────────────────────────────────
        public async Task<List<AnnouncementResponse>> GetParentAnnouncementsAsync(
            string parentEmail, Guid schoolId)
        {
            var now = DateTime.UtcNow;

            // Resolve class/section IDs of children linked to this parent
            var childIds = await _context.StudentGuardians
                .Where(sg => sg.SchoolId == schoolId &&
                             sg.Email != null &&
                             sg.Email.ToLower() == parentEmail.ToLower())
                .Select(sg => sg.StudentId)
                .Distinct()
                .ToListAsync();

            var childClassIds = childIds.Any()
                ? await _context.StudentEnrollments
                    .Where(e => e.SchoolId == schoolId &&
                                childIds.Contains(e.StudentId) &&
                                e.Status == "active")
                    .Select(e => e.ClassId)
                    .Distinct()
                    .ToListAsync()
                : new List<Guid>();

            var childSectionIds = childIds.Any()
                ? await _context.StudentEnrollments
                    .Where(e => e.SchoolId == schoolId &&
                                childIds.Contains(e.StudentId) &&
                                e.Status == "active")
                    .Select(e => e.SectionId)
                    .Distinct()
                    .ToListAsync()
                : new List<Guid>();

            var announcements = await _context.Announcements
                .Include(a => a.CreatedByStaff)
                .Include(a => a.TargetClass)
                .Where(a => a.SchoolId == schoolId &&
                            a.IsActive &&
                            (a.ExpiryDate == null || a.ExpiryDate > now) &&
                            (
                                a.TargetAudience == AnnouncementConstants.AudienceAll
                                || a.TargetAudience == AnnouncementConstants.AudienceParents
                                || (a.TargetAudience == AnnouncementConstants.AudienceClass &&
                                    a.TargetClassId.HasValue &&
                                    childClassIds.Contains(a.TargetClassId.Value))
                                || (a.TargetAudience == AnnouncementConstants.AudienceSection &&
                                    a.TargetSectionId.HasValue &&
                                    childSectionIds.Contains(a.TargetSectionId.Value))
                            ))
                .OrderByDescending(a => a.IsPinned)
                .ThenByDescending(a => a.PublishedDate)
                .Take(100)
                .ToListAsync();

            return announcements.Select(MapToResponse).ToList();
        }

        // ─────────────────────────────────────────────────────────────
        // STATS
        // ─────────────────────────────────────────────────────────────
        public async Task<AnnouncementStatsDto> GetStatsAsync(Guid schoolId)
        {
            var now   = DateTime.UtcNow;
            var today = now.Date;

            var all = await _context.Announcements
                .Where(a => a.SchoolId == schoolId)
                .ToListAsync();

            var recipientStats = await _context.AnnouncementRecipients
                .Where(r => _context.Announcements
                    .Where(a => a.SchoolId == schoolId)
                    .Select(a => a.Id)
                    .Contains(r.AnnouncementId))
                .GroupBy(r => r.IsRead)
                .Select(g => new { IsRead = g.Key, Count = g.Count() })
                .ToListAsync();

            int totalRecipients = recipientStats.Sum(x => x.Count);
            int readCount       = recipientStats.FirstOrDefault(x => x.IsRead)?.Count ?? 0;

            var byPriority = AnnouncementConstants.ValidPriorities
                .ToDictionary(p => p, p => all.Count(a => a.Priority == p));

            var byAudience = AnnouncementConstants.ValidAudiences
                .ToDictionary(au => au, au => all.Count(a => a.TargetAudience == au));

            return new AnnouncementStatsDto
            {
                TotalAnnouncements   = all.Count,
                ActiveAnnouncements  = all.Count(a => a.IsActive),
                PinnedAnnouncements  = all.Count(a => a.IsPinned),
                UrgentAnnouncements  = all.Count(a => a.Priority == AnnouncementConstants.PriorityUrgent),
                ExpiringToday        = all.Count(a => a.ExpiryDate.HasValue && a.ExpiryDate.Value.Date == today),
                ExpiredAnnouncements = all.Count(a => a.ExpiryDate.HasValue && a.ExpiryDate.Value < now),
                TotalRecipients      = totalRecipients,
                ReadCount            = readCount,
                UnreadCount          = totalRecipients - readCount,
                ByPriority           = byPriority,
                ByAudience           = byAudience
            };
        }

        // ─────────────────────────────────────────────────────────────
        // HELPERS
        // ─────────────────────────────────────────────────────────────
        private static AnnouncementResponse MapToResponse(Announcement a)
        {
            var now         = DateTime.UtcNow;
            var readCount   = a.Recipients.Count(r => r.IsRead);
            var totalRec    = a.Recipients.Count;
            return new AnnouncementResponse
            {
                Id                 = a.Id,
                SchoolId           = a.SchoolId,
                Title              = a.Title,
                Content            = a.Content,
                CreatedByStaffId   = a.CreatedByStaffId,
                CreatedByStaffName = a.CreatedByStaff != null
                    ? $"{a.CreatedByStaff.FirstName} {a.CreatedByStaff.LastName}".Trim()
                    : null,
                Priority           = a.Priority,
                TargetAudience     = a.TargetAudience,
                TargetClassId      = a.TargetClassId,
                TargetClassName    = a.TargetClass?.Name,
                TargetSectionId    = a.TargetSectionId,
                TargetSectionName  = a.TargetSection?.Name,
                PublishedDate      = a.PublishedDate,
                ExpiryDate         = a.ExpiryDate,
                IsActive           = a.IsActive,
                IsPinned           = a.IsPinned,
                IsExpired          = a.ExpiryDate.HasValue && a.ExpiryDate.Value < now,
                AttachmentUrl      = a.AttachmentUrl,
                TotalRecipients    = totalRec,
                ReadCount          = readCount,
                UnreadCount        = totalRec - readCount,
                CreatedAt          = a.CreatedAt,
                UpdatedAt          = a.UpdatedAt
            };
        }

        private async Task CreateRecipientsAsync(Announcement announcement)
        {
            var recipients = new List<AnnouncementRecipient>();

            switch (announcement.TargetAudience)
            {
                case AnnouncementConstants.AudienceStudents:
                    var students = await _context.Students
                        .Where(s => s.SchoolId == announcement.SchoolId)
                        .Select(s => s.Id)
                        .ToListAsync();
                    recipients.AddRange(students.Select(id => new AnnouncementRecipient
                    {
                        Id = Guid.NewGuid(), AnnouncementId = announcement.Id,
                        RecipientType = "Student", RecipientId = id, CreatedAt = DateTime.UtcNow
                    }));
                    break;

                case AnnouncementConstants.AudienceStaff:
                    var staff = await _context.StaffMembers
                        .Where(s => s.SchoolId == announcement.SchoolId && s.Status.ToLower() == "active")
                        .Select(s => s.Id)
                        .ToListAsync();
                    recipients.AddRange(staff.Select(id => new AnnouncementRecipient
                    {
                        Id = Guid.NewGuid(), AnnouncementId = announcement.Id,
                        RecipientType = "Staff", RecipientId = id, CreatedAt = DateTime.UtcNow
                    }));
                    break;

                case AnnouncementConstants.AudienceClass when announcement.TargetClassId.HasValue:
                {
                    // Students in this class
                    var classStudents = await _context.Students
                        .Where(s => s.SchoolId == announcement.SchoolId)
                        .Join(_context.StudentEnrollments,
                            s => s.Id, e => e.StudentId,
                            (s, e) => new { s.Id, e.ClassId, e.Status })
                        .Where(x => x.ClassId == announcement.TargetClassId.Value && x.Status == "active")
                        .Select(x => x.Id)
                        .Distinct()
                        .ToListAsync();
                    recipients.AddRange(classStudents.Select(id => new AnnouncementRecipient
                    {
                        Id = Guid.NewGuid(), AnnouncementId = announcement.Id,
                        RecipientType = "Student", RecipientId = id, CreatedAt = DateTime.UtcNow
                    }));

                    // Staff who teach this class (subject teachers + class teacher)
                    var classStaff = await _context.TeacherAssignments
                        .Where(ta => ta.SchoolId == announcement.SchoolId &&
                                     ta.ClassId == announcement.TargetClassId.Value &&
                                     ta.Status == "active")
                        .Select(ta => ta.StaffId)
                        .Distinct()
                        .ToListAsync();
                    recipients.AddRange(classStaff.Select(id => new AnnouncementRecipient
                    {
                        Id = Guid.NewGuid(), AnnouncementId = announcement.Id,
                        RecipientType = "Staff", RecipientId = id, CreatedAt = DateTime.UtcNow
                    }));
                    break;
                }

                case AnnouncementConstants.AudienceSection when announcement.TargetSectionId.HasValue:
                {
                    // Staff who teach this section
                    var sectionStaff = await _context.TeacherAssignments
                        .Where(ta => ta.SchoolId == announcement.SchoolId &&
                                     ta.SectionId == announcement.TargetSectionId.Value &&
                                     ta.Status == "active")
                        .Select(ta => ta.StaffId)
                        .Distinct()
                        .ToListAsync();
                    recipients.AddRange(sectionStaff.Select(id => new AnnouncementRecipient
                    {
                        Id = Guid.NewGuid(), AnnouncementId = announcement.Id,
                        RecipientType = "Staff", RecipientId = id, CreatedAt = DateTime.UtcNow
                    }));
                    break;
                }

                // "Parents" and "All": recipients created on-demand when MarkAsRead is called
            }

            if (recipients.Count > 0)
            {
                _context.AnnouncementRecipients.AddRange(recipients);
                await _context.SaveChangesAsync();
            }
        }
        private async Task NotifyParentsAsync(Announcement announcement)
        {
            List<Guid> loginIds;

            switch (announcement.TargetAudience)
            {
                case AnnouncementConstants.AudienceAll:
                case AnnouncementConstants.AudienceParents:
                case AnnouncementConstants.AudienceStudents:
                {
                    // Fetch all parent UserLogins for this school directly — avoids relying on
                    // Guardian/GuardianStudents (new normalised tables that may be unpopulated).
                    loginIds = await _context.UserLogins
                        .Where(u => u.SchoolId == announcement.SchoolId
                                    && u.Role == "Parent"
                                    && !u.IsDeleted)
                        .Select(u => u.Id)
                        .Distinct()
                        .ToListAsync();
                    break;
                }

                case AnnouncementConstants.AudienceClass when announcement.TargetClassId.HasValue:
                {
                    var classId = announcement.TargetClassId.Value;
                    var studentIds = await _context.StudentEnrollments
                        .Where(e => e.SchoolId == announcement.SchoolId
                                    && e.ClassId == classId
                                    && e.Status == "active")
                        .Select(e => e.StudentId)
                        .Distinct()
                        .ToListAsync();

                    // Resolve parents across legacy + modern guardian models so no parent is missed.
                    loginIds = await ParentRecipientResolver
                        .GetParentUserIdsForStudentsAsync(_context, announcement.SchoolId, studentIds);
                    break;
                }

                case AnnouncementConstants.AudienceSection when announcement.TargetSectionId.HasValue:
                {
                    var sectionId = announcement.TargetSectionId.Value;
                    var studentIds = await _context.StudentEnrollments
                        .Where(e => e.SchoolId == announcement.SchoolId
                                    && e.SectionId == sectionId
                                    && e.Status == "active")
                        .Select(e => e.StudentId)
                        .Distinct()
                        .ToListAsync();

                    loginIds = await ParentRecipientResolver
                        .GetParentUserIdsForStudentsAsync(_context, announcement.SchoolId, studentIds);
                    break;
                }

                default:
                    return; // Staff-only or unknown audience
            }
            if (loginIds.Count == 0) return;

            var shortContent = announcement.Content.Length > 200
                ? announcement.Content.Substring(0, 200) + "…"
                : announcement.Content;
            var priority = announcement.Priority is AnnouncementConstants.PriorityHigh
                                                  or AnnouncementConstants.PriorityUrgent
                ? "High" : "Normal";

            var notifications = loginIds.Select(loginId => new Notification
            {
                Id            = Guid.NewGuid(),
                SchoolId      = announcement.SchoolId,
                RecipientId   = loginId,
                RecipientType = "Parent",
                Type          = "Announcement",
                Title         = announcement.Title,
                Content       = shortContent,
                ReferenceId   = announcement.Id,
                ReferenceType = "Announcement",
                ActionUrl     = "/parent-announcements",
                Priority      = priority,
            }).ToList();

            _context.Notifications.AddRange(notifications);
            await _context.SaveChangesAsync();
        }

        private async Task NotifyStaffAsync(Announcement announcement)
        {
            IQueryable<Guid> staffLoginIds;

            switch (announcement.TargetAudience)
            {
                case AnnouncementConstants.AudienceAll:
                case AnnouncementConstants.AudienceStaff:
                {
                    staffLoginIds = _context.StaffMembers
                        .Where(s => s.SchoolId == announcement.SchoolId && s.Status.ToLower() == "active")
                        .Join(_context.UserLogins,
                            s => s.Email,
                            u => u.Email,
                            (s, u) => u.Id)
                        .Distinct();
                    break;
                }

                case AnnouncementConstants.AudienceClass when announcement.TargetClassId.HasValue:
                {
                    var classId = announcement.TargetClassId.Value;
                    staffLoginIds = _context.TeacherAssignments
                        .Where(ta => ta.SchoolId == announcement.SchoolId
                                    && ta.ClassId == classId
                                    && ta.Status == "active")
                        .Select(ta => ta.StaffId)
                        .Join(_context.StaffMembers,
                            staffId => staffId,
                            s => s.Id,
                            (staffId, s) => s)
                        .Join(_context.UserLogins,
                            s => s.Email,
                            u => u.Email,
                            (s, u) => u.Id)
                        .Distinct();
                    break;
                }

                case AnnouncementConstants.AudienceSection when announcement.TargetSectionId.HasValue:
                {
                    var sectionId = announcement.TargetSectionId.Value;
                    staffLoginIds = _context.TeacherAssignments
                        .Where(ta => ta.SchoolId == announcement.SchoolId
                                    && ta.SectionId == sectionId
                                    && ta.Status == "active")
                        .Select(ta => ta.StaffId)
                        .Join(_context.StaffMembers,
                            staffId => staffId,
                            s => s.Id,
                            (staffId, s) => s)
                        .Join(_context.UserLogins,
                            s => s.Email,
                            u => u.Email,
                            (s, u) => u.Id)
                        .Distinct();
                    break;
                }

                default:
                    return; // Student-only or unknown audience
            }

            var loginIds = await staffLoginIds.ToListAsync();
            if (loginIds.Count == 0) return;

            var shortContent = announcement.Content.Length > 200
                ? announcement.Content.Substring(0, 200) + "…"
                : announcement.Content;
            var priority = announcement.Priority is AnnouncementConstants.PriorityHigh
                                                  or AnnouncementConstants.PriorityUrgent
                ? "High" : "Normal";

            var notifications = loginIds.Select(loginId => new Notification
            {
                Id            = Guid.NewGuid(),
                SchoolId      = announcement.SchoolId,
                RecipientId   = loginId,
                RecipientType = "Staff",
                Type          = "Announcement",
                Title         = announcement.Title,
                Content       = shortContent,
                ReferenceId   = announcement.Id,
                ReferenceType = "Announcement",
                ActionUrl     = "/announcements",
                Priority      = priority,
            }).ToList();

            _context.Notifications.AddRange(notifications);
            await _context.SaveChangesAsync();
        }
    }
}
