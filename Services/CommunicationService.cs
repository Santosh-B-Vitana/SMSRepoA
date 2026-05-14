using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SmsApi.Data;
using SmsApi.Models.Entities;
using SmsApi.Models.DTOs;

namespace SmsApi.Services
{
    public interface ICommunicationService
    {
        // Announcements
        Task<PaginatedResponse<AnnouncementBasicDto>> GetAnnouncementsAsync(
            Guid schoolId, CommunicationFiltersDto filters, int page, int pageSize);
        Task<AnnouncementFullDto?> GetAnnouncementByIdAsync(Guid schoolId, Guid id);
        Task<AnnouncementFullDto> CreateAnnouncementAsync(
            Guid schoolId, CreateAnnouncementDto dto, Guid userId);
        Task<AnnouncementFullDto> UpdateAnnouncementAsync(
            Guid schoolId, Guid id, UpdateAnnouncementDto dto);
        Task<bool> DeleteAnnouncementAsync(Guid schoolId, Guid id);
        Task<AnnouncementFullDto> PublishAnnouncementAsync(Guid schoolId, Guid id, Guid userId);
        Task AcknowledgeAnnouncementAsync(Guid schoolId, Guid id, Guid userId);

        // Messages
        Task<PaginatedResponse<MessageBasicDto>> GetMessagesAsync(
            Guid schoolId, CommunicationFiltersDto filters, int page, int pageSize);
        Task<MessageFullDto?> GetMessageByIdAsync(Guid schoolId, Guid id);
        Task<MessageFullDto> SendMessageAsync(Guid schoolId, CreateMessageDto dto, Guid userId);
        Task<BulkOperationResult> BulkSendMessageAsync(Guid schoolId, BulkSendMessageDto dto, Guid userId);

        // Templates
        Task<List<MessageTemplateDto>> GetTemplatesAsync(Guid schoolId, string? type);
        Task<MessageTemplateDto> CreateTemplateAsync(Guid schoolId, CreateTemplateDto dto);
        Task<MessageTemplateDto> UpdateTemplateAsync(Guid schoolId, Guid id, CreateTemplateDto dto);
        Task<bool> DeleteTemplateAsync(Guid schoolId, Guid id);

        // Statistics
        Task<CommunicationStatsDto> GetCommunicationStatsAsync(
            Guid schoolId, DateTime? startDate, DateTime? endDate);

        // Seed
        Task<List<MessageTemplateDto>> SeedDefaultTemplatesAsync(Guid schoolId);

        // Staff-to-Parent Communication
        Task<List<StudentBasicDto>> GetStaffClassStudentsAsync(Guid schoolId, Guid staffUserId);
        Task<StaffParentMessageDto> SendStaffToParentMessageAsync(Guid schoolId, Guid staffUserId, SendStaffParentMessageDto dto);
        Task<StaffParentMessageDto?> GetStaffParentMessageAsync(Guid schoolId, Guid messageId);
        Task<PaginatedResponse<StaffParentMessageDto>> GetStaffSentMessagesAsync(Guid schoolId, Guid staffUserId, int page, int pageSize, string? searchQuery);
        Task<BulkSendResultDto> BulkSendStaffToParentsAsync(Guid schoolId, Guid staffUserId, BulkSendStaffParentDto dto);
    }

    public class CommunicationService : ICommunicationService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<CommunicationService> _logger;

        public CommunicationService(AppDbContext context, ILogger<CommunicationService> logger)
        {
            _context = context;
            _logger = logger;
        }

        // ========== ANNOUNCEMENTS ==========

        public async Task<PaginatedResponse<AnnouncementBasicDto>> GetAnnouncementsAsync(
            Guid schoolId, CommunicationFiltersDto filters, int page, int pageSize)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 20;
            if (pageSize > 100) pageSize = 100;

            var query = _context.Announcements.Where(a => a.SchoolId == schoolId);

            // Apply filters
            if (!string.IsNullOrEmpty(filters.Status))
                query = query.Where(a => a.IsActive == (filters.Status == "active"));

            if (!string.IsNullOrEmpty(filters.Priority))
                query = query.Where(a => a.Priority.ToLower() == filters.Priority.ToLower());

            if (!string.IsNullOrEmpty(filters.TargetAudience))
                query = query.Where(a => a.TargetAudience.ToLower() == filters.TargetAudience.ToLower());

            if (!string.IsNullOrEmpty(filters.SearchQuery))
            {
                query = query.Where(a => 
                    a.Title.Contains(filters.SearchQuery) || 
                    a.Content.Contains(filters.SearchQuery));
            }

            if (filters.DateFrom.HasValue)
                query = query.Where(a => a.PublishedDate >= filters.DateFrom.Value);

            if (filters.DateTo.HasValue)
                query = query.Where(a => a.PublishedDate <= filters.DateTo.Value);

            var totalCount = await query.CountAsync();

            var items = await query
                .Include(a => a.CreatedByStaff)
                .Include(a => a.Recipients)
                .OrderByDescending(a => a.IsPinned)
                .ThenByDescending(a => a.PublishedDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(a => new AnnouncementBasicDto
                {
                    Id = a.Id,
                    Title = a.Title,
                    TargetAudience = a.TargetAudience,
                    Priority = a.Priority,
                    Category = GetAnnouncementCategory(a.Priority),
                    Status = a.IsActive ? "published" : "archived",
                    PublishedByName = a.CreatedByStaff != null ? a.CreatedByStaff.Name : "",
                    PublishDate = a.PublishedDate,
                    ReadCount = a.Recipients.Count(r => r.IsRead),
                    IsPinned = a.IsPinned
                })
                .ToListAsync();

            return new PaginatedResponse<AnnouncementBasicDto>
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
            };
        }

        public async Task<AnnouncementFullDto?> GetAnnouncementByIdAsync(Guid schoolId, Guid id)
        {
            var announcement = await _context.Announcements
                .Include(a => a.CreatedByStaff)
                .Include(a => a.Recipients)
                .Include(a => a.TargetClass)
                .Include(a => a.TargetSection)
                .FirstOrDefaultAsync(a => a.SchoolId == schoolId && a.Id == id);

            if (announcement == null) return null;

            return new AnnouncementFullDto
            {
                Id = announcement.Id,
                SchoolId = announcement.SchoolId,
                Title = announcement.Title,
                Content = announcement.Content,
                TargetAudience = announcement.TargetAudience,
                TargetGroups = GetTargetGroups(announcement),
                TargetUserIds = new List<Guid>(),
                Priority = announcement.Priority,
                Category = GetAnnouncementCategory(announcement.Priority),
                Status = announcement.IsActive ? "published" : "archived",
                PublishedBy = announcement.CreatedByStaffId,
                PublishedByName = announcement.CreatedByStaff?.Name ?? "",
                PublishDate = announcement.PublishedDate,
                ScheduleDate = null,
                ExpiryDate = announcement.ExpiryDate,
                Attachments = GetAttachments(announcement.AttachmentUrl),
                ReadCount = announcement.Recipients.Count(r => r.IsRead),
                AcknowledgedCount = announcement.Recipients.Count(r => r.IsRead),
                TotalTargetCount = announcement.Recipients.Count,
                IsPinned = announcement.IsPinned,
                RequiresAcknowledgement = false,
                CreatedAt = announcement.CreatedAt,
                UpdatedAt = announcement.UpdatedAt
            };
        }

        public async Task<AnnouncementFullDto> CreateAnnouncementAsync(
            Guid schoolId, CreateAnnouncementDto dto, Guid userId)
        {
            // VALIDATION 1: Title required and length bounds
            if (string.IsNullOrWhiteSpace(dto.Title))
                throw new ArgumentException("Announcement title is required");
            if (dto.Title.Trim().Length < 3)
                throw new ArgumentException("Announcement title must be at least 3 characters");
            if (dto.Title.Length > 200)
                throw new ArgumentException("Announcement title cannot exceed 200 characters");

            // VALIDATION 2: Content required and length bounds
            if (string.IsNullOrWhiteSpace(dto.Content))
                throw new ArgumentException("Announcement content is required");
            if (dto.Content.Trim().Length < 10)
                throw new ArgumentException("Announcement content must be at least 10 characters");
            if (dto.Content.Length > 5000)
                throw new ArgumentException("Announcement content cannot exceed 5000 characters");

            // VALIDATION 3: Target audience must be valid
            var validAudiences = new[] { "all", "students", "parents", "staff", "specific_class", "specific_section" };
            if (string.IsNullOrWhiteSpace(dto.TargetAudience) || !validAudiences.Contains(dto.TargetAudience.ToLower()))
                throw new ArgumentException("Invalid target audience. Must be one of: all, students, parents, staff, specific_class, specific_section");

            // VALIDATION 4: Priority must be valid
            var validPriorities = new[] { "low", "medium", "high", "urgent", "critical" };
            if (string.IsNullOrWhiteSpace(dto.Priority) || !validPriorities.Contains(dto.Priority.ToLower()))
                throw new ArgumentException("Priority must be one of: low, medium, high, critical");

            // VALIDATION 5: Expiry date must be in the future
            if (dto.ExpiryDate.HasValue && dto.ExpiryDate.Value <= DateTime.UtcNow)
                throw new ArgumentException("Expiry date must be in the future");

            // VALIDATION 6: Schedule date validation - must not be too far in future (max 1 year)
            if (dto.ScheduleDate.HasValue && (dto.ScheduleDate.Value - DateTime.UtcNow).TotalDays > 365)
                throw new ArgumentException("Announcement cannot be scheduled more than 1 year in advance");

            // VALIDATION 7: Duplicate announcement prevention (same title+content within 24h)
            var cutoff = DateTime.UtcNow.AddHours(-24);
            var existingAnnouncement = await _context.Announcements
                .AnyAsync(a => a.SchoolId == schoolId &&
                              a.Title == dto.Title.Trim() &&
                              a.Content == dto.Content.Trim() &&
                              a.CreatedAt >= cutoff);
            if (existingAnnouncement)
                throw new InvalidOperationException("A similar announcement was already created recently. Please wait before creating another.");

            // Resolve StaffMember from UserLogin.Id via email match
            Guid staffId;
            var userLogin = await _context.UserLogins
                .FirstOrDefaultAsync(ul => ul.Id == userId && !ul.IsDeleted);
            if (userLogin != null)
            {
                var staffMember = await _context.StaffMembers
                    .FirstOrDefaultAsync(s => s.SchoolId == schoolId && s.Email == userLogin.Email && !s.IsDeleted);
                staffId = staffMember?.Id ?? (await _context.StaffMembers
                    .Where(s => s.SchoolId == schoolId && !s.IsDeleted)
                    .Select(s => s.Id)
                    .FirstOrDefaultAsync());
            }
            else
            {
                staffId = await _context.StaffMembers
                    .Where(s => s.SchoolId == schoolId && !s.IsDeleted)
                    .Select(s => s.Id)
                    .FirstOrDefaultAsync();
            }

            if (staffId == Guid.Empty)
                throw new InvalidOperationException("No staff members found in this school");

            var announcement = new Announcement
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                Title = dto.Title,
                Content = dto.Content,
                Priority = dto.Priority,
                TargetAudience = dto.TargetAudience.ToLower(),
                CreatedByStaffId = staffId,
                PublishedDate = dto.PublishImmediately ? DateTime.UtcNow : (dto.ScheduleDate ?? DateTime.UtcNow),
                ExpiryDate = dto.ExpiryDate,
                IsPinned = dto.IsPinned,
                IsActive = dto.PublishImmediately,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            // Set target class/section if specified
            if (dto.TargetAudience == "specific_class" && dto.TargetGroups?.Any() == true)
            {
                var targetClass = await _context.Classes
                    .FirstOrDefaultAsync(c => c.SchoolId == schoolId && c.Code == dto.TargetGroups[0]);
                if (targetClass != null)
                    announcement.TargetClassId = targetClass.Id;
            }
            else if (dto.TargetAudience == "specific_section" && dto.TargetGroups?.Any() == true)
            {
                var targetSection = await _context.Sections
                    .FirstOrDefaultAsync(s => s.SchoolId == schoolId && s.Name == dto.TargetGroups[0]);
                if (targetSection != null)
                    announcement.TargetSectionId = targetSection.Id;
            }

            _context.Announcements.Add(announcement);
            await _context.SaveChangesAsync();

            // Create recipient records based on target audience
            await CreateAnnouncementRecipientsAsync(announcement, dto);

            return await GetAnnouncementByIdAsync(schoolId, announcement.Id)
                ?? throw new Exception("Failed to retrieve created announcement");
        }

        public async Task<AnnouncementFullDto> UpdateAnnouncementAsync(
            Guid schoolId, Guid id, UpdateAnnouncementDto dto)
        {
            var announcement = await _context.Announcements
                .FirstOrDefaultAsync(a => a.SchoolId == schoolId && a.Id == id);

            if (announcement == null)
                throw new KeyNotFoundException("Announcement not found");

            if (!string.IsNullOrEmpty(dto.Title))
                announcement.Title = dto.Title;

            if (!string.IsNullOrEmpty(dto.Content))
                announcement.Content = dto.Content;

            if (!string.IsNullOrEmpty(dto.Priority))
            {
                var validPriorities = new[] { "low", "medium", "high", "urgent", "critical" };
                if (!validPriorities.Contains(dto.Priority.ToLower()))
                    throw new ArgumentException("Priority must be one of: low, medium, high, critical");
                announcement.Priority = dto.Priority.ToLower();
            }

            if (!string.IsNullOrEmpty(dto.Status))
            {
                var validStatuses = new[] { "draft", "published", "archived" };
                if (!validStatuses.Contains(dto.Status.ToLower()))
                    throw new ArgumentException("Status must be one of: draft, published, archived");
                announcement.IsActive = dto.Status.ToLower() == "published";
            }

            if (dto.ScheduleDate.HasValue)
                announcement.PublishedDate = dto.ScheduleDate.Value;

            if (dto.ExpiryDate.HasValue)
                announcement.ExpiryDate = dto.ExpiryDate.Value;

            if (dto.IsPinned.HasValue)
                announcement.IsPinned = dto.IsPinned.Value;

            announcement.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return await GetAnnouncementByIdAsync(schoolId, id)
                ?? throw new Exception("Failed to retrieve updated announcement");
        }

        public async Task<bool> DeleteAnnouncementAsync(Guid schoolId, Guid id)
        {
            var announcement = await _context.Announcements
                .Include(a => a.Recipients)
                .FirstOrDefaultAsync(a => a.SchoolId == schoolId && a.Id == id);

            if (announcement == null) return false;

            _context.AnnouncementRecipients.RemoveRange(announcement.Recipients);
            _context.Announcements.Remove(announcement);
            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<AnnouncementFullDto> PublishAnnouncementAsync(Guid schoolId, Guid id, Guid userId)
        {
            var announcement = await _context.Announcements
                .FirstOrDefaultAsync(a => a.SchoolId == schoolId && a.Id == id);

            if (announcement == null)
                throw new KeyNotFoundException("Announcement not found");

            if (announcement.IsActive)
                throw new InvalidOperationException("Announcement is already published");

            announcement.IsActive = true;
            announcement.PublishedDate = DateTime.UtcNow;
            announcement.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Announcement {AnnouncementId} published by user {UserId}", id, userId);

            return await GetAnnouncementByIdAsync(schoolId, id)
                ?? throw new Exception("Failed to retrieve published announcement");
        }

        public async Task AcknowledgeAnnouncementAsync(Guid schoolId, Guid id, Guid userId)
        {
            var recipient = await _context.AnnouncementRecipients
                .FirstOrDefaultAsync(r => r.AnnouncementId == id && r.RecipientId == userId);

            if (recipient == null)
                throw new KeyNotFoundException($"No recipient record found for this announcement and user");

            recipient.IsRead = true;
            recipient.ReadAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _logger.LogInformation("User {UserId} acknowledged announcement {AnnouncementId}", userId, id);
        }

        // ========== MESSAGES ==========

        public async Task<PaginatedResponse<MessageBasicDto>> GetMessagesAsync(
            Guid schoolId, CommunicationFiltersDto filters, int page, int pageSize)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 20;
            if (pageSize > 100) pageSize = 100;

            var query = _context.Messages
                .Where(m => m.SchoolId == schoolId);

            // Apply filters
            if (!string.IsNullOrEmpty(filters.Type))
                query = query.Where(m => m.MessageType.ToLower() == filters.Type.ToLower());

            if (!string.IsNullOrEmpty(filters.SearchQuery))
            {
                query = query.Where(m => 
                    (m.Subject != null && m.Subject.Contains(filters.SearchQuery)) || 
                    m.Content.Contains(filters.SearchQuery));
            }

            if (filters.DateFrom.HasValue)
                query = query.Where(m => m.CreatedAt >= filters.DateFrom.Value);

            if (filters.DateTo.HasValue)
                query = query.Where(m => m.CreatedAt <= filters.DateTo.Value);

            var totalCount = await query.CountAsync();

            // Fetch raw rows first — GetUserName calls DB so can't run inside EF projection
            var rawMessages = await query
                .OrderByDescending(m => m.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(m => new { m.Id, m.SenderId, m.SenderType, m.Subject, m.MessageType, m.IsRead, m.CreatedAt })
                .ToListAsync();

            var items = rawMessages.Select(m => new MessageBasicDto
            {
                Id = m.Id,
                FromName = GetUserName(m.SenderId, m.SenderType),
                RecipientCount = 1,
                Subject = m.Subject ?? "",
                Type = m.MessageType,
                Status = m.IsRead ? "delivered" : "sent",
                SentAt = m.CreatedAt
            }).ToList();

            return new PaginatedResponse<MessageBasicDto>
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
            };
        }

        public async Task<MessageFullDto?> GetMessageByIdAsync(Guid schoolId, Guid id)
        {
            var message = await _context.Messages
                .FirstOrDefaultAsync(m => m.SchoolId == schoolId && m.Id == id);

            if (message == null) return null;

            // Mark as read
            if (!message.IsRead)
            {
                message.IsRead = true;
                message.ReadAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }

            return new MessageFullDto
            {
                Id = message.Id,
                SchoolId = message.SchoolId,
                FromUserId = message.SenderId,
                FromName = GetUserName(message.SenderId, message.SenderType),
                Recipients = new List<RecipientDto>
                {
                    new RecipientDto
                    {
                        UserId = message.ReceiverId,
                        Name = GetUserName(message.ReceiverId, message.ReceiverType),
                        Email = "",
                        Phone = ""
                    }
                },
                Subject = message.Subject ?? "",
                Content = message.Content,
                Type = message.MessageType,
                Status = message.IsRead ? "delivered" : "sent",
                Priority = "normal",
                SentAt = message.CreatedAt,
                DeliveredAt = message.ReadAt,
                FailureReason = null,
                TemplateId = null,
                TemplateName = null,
                Metadata = new Dictionary<string, object>(),
                CreatedAt = message.CreatedAt,
                UpdatedAt = message.UpdatedAt
            };
        }

        public async Task<MessageFullDto> SendMessageAsync(
            Guid schoolId, CreateMessageDto dto, Guid userId)
        {
            // VALIDATION: Recipients required
            if (dto.ToUserIds == null || !dto.ToUserIds.Any())
                throw new ArgumentException("At least one recipient is required");
            if (dto.ToUserIds.Count > 500)
                throw new ArgumentException("Cannot send to more than 500 recipients at once");

            // VALIDATION: Content required
            if (string.IsNullOrWhiteSpace(dto.Content))
                throw new ArgumentException("Message content is required");
            if (dto.Content.Length > 5000)
                throw new ArgumentException("Message content cannot exceed 5000 characters");

            // VALIDATION: Subject max length
            if (dto.Subject != null && dto.Subject.Length > 200)
                throw new ArgumentException("Message subject cannot exceed 200 characters");

            // VALIDATION: Message type
            var validTypes = new[] { "email", "sms", "push_notification", "whatsapp" };
            if (string.IsNullOrWhiteSpace(dto.Type) || !validTypes.Contains(dto.Type.ToLower()))
                throw new ArgumentException("Message type must be one of: email, sms, push_notification, whatsapp");

            var messages = new List<Message>();

            foreach (var recipientId in dto.ToUserIds)
            {
                var message = new Message
                {
                    Id = Guid.NewGuid(),
                    SchoolId = schoolId,
                    SenderId = userId,
                    SenderType = "Staff",
                    ReceiverId = recipientId,
                    ReceiverType = "Student",
                    Subject = dto.Subject,
                    Content = dto.Content,
                    MessageType = dto.Type,
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                messages.Add(message);
            }

            _context.Messages.AddRange(messages);
            await _context.SaveChangesAsync();

            _logger.LogInformation("User {UserId} sent {Count} messages of type {Type}", 
                userId, messages.Count, dto.Type);

            return await GetMessageByIdAsync(schoolId, messages.First().Id)
                ?? throw new Exception("Failed to retrieve sent message");
        }

        public async Task<BulkOperationResult> BulkSendMessageAsync(
            Guid schoolId, BulkSendMessageDto dto, Guid userId)
        {
            // VALIDATION: Content required
            if (string.IsNullOrWhiteSpace(dto.Content))
                throw new ArgumentException("Message content is required");
            if (dto.Content.Length > 5000)
                throw new ArgumentException("Message content cannot exceed 5000 characters");

            // VALIDATION: Subject max length
            if (dto.Subject != null && dto.Subject.Length > 200)
                throw new ArgumentException("Message subject cannot exceed 200 characters");

            // VALIDATION: Target audience
            var validAudiences = new[] { "all", "students", "parents", "staff", "specific_class", "specific_section" };
            if (string.IsNullOrWhiteSpace(dto.TargetAudience) || !validAudiences.Contains(dto.TargetAudience.ToLower()))
                throw new ArgumentException("Invalid target audience. Must be one of: all, students, parents, staff, specific_class, specific_section");

            // VALIDATION: Message type
            var validTypes = new[] { "email", "sms", "push_notification", "whatsapp" };
            if (string.IsNullOrWhiteSpace(dto.Type) || !validTypes.Contains(dto.Type.ToLower()))
                throw new ArgumentException("Message type must be one of: email, sms, push_notification, whatsapp");

            var result = new BulkOperationResult
            {
                SuccessCount = 0,
                FailureCount = 0,
                Errors = new List<string>()
            };

            try
            {
                var recipientIds = await GetTargetRecipientsAsync(schoolId, dto.TargetAudience, dto.TargetGroups);

                if (!recipientIds.Any())
                {
                    result.Errors.Add("No recipients found for the specified target audience");
                    result.FailureCount = 1;
                    return result;
                }

                var messages = new List<Message>();

                foreach (var recipientId in recipientIds)
                {
                    try
                    {
                        var message = new Message
                        {
                            Id = Guid.NewGuid(),
                            SchoolId = schoolId,
                            SenderId = userId,
                            SenderType = "Staff",
                            ReceiverId = recipientId,
                            ReceiverType = GetRecipientType(dto.TargetAudience),
                            Subject = dto.Subject,
                            Content = dto.Content,
                            MessageType = dto.Type,
                            IsRead = false,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };

                        messages.Add(message);
                        result.SuccessCount++;
                    }
                    catch (Exception ex)
                    {
                        result.FailureCount++;
                        result.Errors.Add($"Failed to create message for recipient {recipientId}: {ex.Message}");
                    }
                }

                if (messages.Any())
                {
                    _context.Messages.AddRange(messages);
                    await _context.SaveChangesAsync();
                }

                _logger.LogInformation(
                    "Bulk send completed: {SuccessCount} messages sent, {FailureCount} failed",
                    result.SuccessCount, result.FailureCount);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in bulk send operation");
                result.Errors.Add($"Bulk operation failed: {ex.Message}");
                result.FailureCount++;
            }

            return result;
        }

        // ========== TEMPLATES ==========

        public async Task<List<MessageTemplateDto>> GetTemplatesAsync(Guid schoolId, string? type)
        {
            var query = _context.Set<MessageTemplate>()
                .Where(t => t.SchoolId == schoolId && t.IsActive);

            if (!string.IsNullOrEmpty(type))
                query = query.Where(t => t.Type.ToLower() == type.ToLower());

            // Fetch raw data first (without client-side projection)
            var rawTemplates = await query
                .OrderBy(t => t.Category)
                .ThenBy(t => t.Name)
                .ToListAsync();

            // Map to DTO with client-side parsing
            var templates = rawTemplates.Select(t => new MessageTemplateDto
            {
                Id = t.Id,
                SchoolId = t.SchoolId,
                Name = t.Name,
                Type = t.Type,
                Category = t.Category,
                Subject = t.Subject,
                Content = t.Content,
                Variables = ParseVariables(t.Variables),
                IsActive = t.IsActive,
                CreatedAt = t.CreatedAt,
                UpdatedAt = t.UpdatedAt
            }).ToList();

            return templates;
        }

        public async Task<MessageTemplateDto> CreateTemplateAsync(Guid schoolId, CreateTemplateDto dto)
        {
            // VALIDATION: Name required and length bounds
            if (string.IsNullOrWhiteSpace(dto.Name))
                throw new ArgumentException("Template name is required");
            if (dto.Name.Trim().Length < 3)
                throw new ArgumentException("Template name must be at least 3 characters");
            if (dto.Name.Length > 200)
                throw new ArgumentException("Template name cannot exceed 200 characters");

            // VALIDATION: Type enum
            var validTypes = new[] { "email", "sms", "push_notification", "whatsapp" };
            if (string.IsNullOrWhiteSpace(dto.Type) || !validTypes.Contains(dto.Type.ToLower()))
                throw new ArgumentException("Template type must be one of: email, sms, push_notification, whatsapp");

            // VALIDATION: Category required
            if (string.IsNullOrWhiteSpace(dto.Category))
                throw new ArgumentException("Template category is required");

            // VALIDATION: Content required and length
            if (string.IsNullOrWhiteSpace(dto.Content))
                throw new ArgumentException("Template content is required");
            if (dto.Content.Length > 5000)
                throw new ArgumentException("Template content cannot exceed 5000 characters");

            // VALIDATION: Subject max length
            if (dto.Subject != null && dto.Subject.Length > 500)
                throw new ArgumentException("Template subject cannot exceed 500 characters");

            // VALIDATION: Duplicate name check
            var duplicate = await _context.Set<MessageTemplate>()
                .AnyAsync(t => t.SchoolId == schoolId && t.Name == dto.Name.Trim() && t.IsActive);
            if (duplicate)
                throw new InvalidOperationException($"A template with name '{dto.Name}' already exists");

            var template = new MessageTemplate
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                Name = dto.Name,
                Type = dto.Type,
                Category = dto.Category,
                Subject = dto.Subject,
                Content = dto.Content,
                Variables = JsonSerializer.Serialize(dto.Variables),
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Set<MessageTemplate>().Add(template);
            await _context.SaveChangesAsync();

            return new MessageTemplateDto
            {
                Id = template.Id,
                SchoolId = template.SchoolId,
                Name = template.Name,
                Type = template.Type,
                Category = template.Category,
                Subject = template.Subject,
                Content = template.Content,
                Variables = dto.Variables,
                IsActive = template.IsActive,
                CreatedAt = template.CreatedAt,
                UpdatedAt = template.UpdatedAt
            };
        }

        public async Task<MessageTemplateDto> UpdateTemplateAsync(
            Guid schoolId, Guid id, CreateTemplateDto dto)
        {
            // VALIDATION: Name required and length bounds
            if (string.IsNullOrWhiteSpace(dto.Name))
                throw new ArgumentException("Template name is required");
            if (dto.Name.Trim().Length < 3)
                throw new ArgumentException("Template name must be at least 3 characters");
            if (dto.Name.Length > 200)
                throw new ArgumentException("Template name cannot exceed 200 characters");

            // VALIDATION: Type enum
            var validTypes = new[] { "email", "sms", "push_notification", "whatsapp" };
            if (string.IsNullOrWhiteSpace(dto.Type) || !validTypes.Contains(dto.Type.ToLower()))
                throw new ArgumentException("Template type must be one of: email, sms, push_notification, whatsapp");

            // VALIDATION: Category required
            if (string.IsNullOrWhiteSpace(dto.Category))
                throw new ArgumentException("Template category is required");

            // VALIDATION: Content required and length
            if (string.IsNullOrWhiteSpace(dto.Content))
                throw new ArgumentException("Template content is required");
            if (dto.Content.Length > 5000)
                throw new ArgumentException("Template content cannot exceed 5000 characters");

            // VALIDATION: Subject max length
            if (dto.Subject != null && dto.Subject.Length > 500)
                throw new ArgumentException("Template subject cannot exceed 500 characters");

            var template = await _context.Set<MessageTemplate>()
                .FirstOrDefaultAsync(t => t.SchoolId == schoolId && t.Id == id);

            if (template == null)
                throw new KeyNotFoundException("Template not found");

            template.Name = dto.Name;
            template.Type = dto.Type;
            template.Category = dto.Category;
            template.Subject = dto.Subject;
            template.Content = dto.Content;
            template.Variables = JsonSerializer.Serialize(dto.Variables);
            template.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return new MessageTemplateDto
            {
                Id = template.Id,
                SchoolId = template.SchoolId,
                Name = template.Name,
                Type = template.Type,
                Category = template.Category,
                Subject = template.Subject,
                Content = template.Content,
                Variables = dto.Variables,
                IsActive = template.IsActive,
                CreatedAt = template.CreatedAt,
                UpdatedAt = template.UpdatedAt
            };
        }

        public async Task<bool> DeleteTemplateAsync(Guid schoolId, Guid id)
        {
            var template = await _context.Set<MessageTemplate>()
                .FirstOrDefaultAsync(t => t.SchoolId == schoolId && t.Id == id);

            if (template == null) return false;

            template.IsActive = false;
            template.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return true;
        }

        // ========== STATISTICS ==========

        public async Task<CommunicationStatsDto> GetCommunicationStatsAsync(
            Guid schoolId, DateTime? startDate, DateTime? endDate)
        {
            var announcementsQuery = _context.Announcements.Where(a => a.SchoolId == schoolId);
            var messagesQuery = _context.Messages.Where(m => m.SchoolId == schoolId);

            if (startDate.HasValue)
            {
                announcementsQuery = announcementsQuery.Where(a => a.CreatedAt >= startDate.Value);
                messagesQuery = messagesQuery.Where(m => m.CreatedAt >= startDate.Value);
            }

            if (endDate.HasValue)
            {
                announcementsQuery = announcementsQuery.Where(a => a.CreatedAt <= endDate.Value);
                messagesQuery = messagesQuery.Where(m => m.CreatedAt <= endDate.Value);
            }

            var totalAnnouncements = await announcementsQuery.CountAsync();
            var publishedAnnouncements = await announcementsQuery.CountAsync(a => a.IsActive);

            var totalMessages = await messagesQuery.CountAsync();
            var sentMessages = totalMessages;
            var failedMessages = 0;

            var messagesByType = await messagesQuery
                .GroupBy(m => m.MessageType)
                .Select(g => new { Type = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Type, x => x.Count);

            var announcementsByCategory = new Dictionary<string, int>
            {
                { "general", totalAnnouncements }
            };

            var totalRecipients = await _context.AnnouncementRecipients
                .CountAsync(r => announcementsQuery.Select(a => a.Id).Contains(r.AnnouncementId));
            var totalRead = await _context.AnnouncementRecipients
                .CountAsync(r => r.IsRead && announcementsQuery.Select(a => a.Id).Contains(r.AnnouncementId));

            var avgReadRate = totalRecipients > 0 ? (decimal)totalRead / totalRecipients * 100 : 0;

            return new CommunicationStatsDto
            {
                TotalAnnouncements = totalAnnouncements,
                PublishedAnnouncements = publishedAnnouncements,
                TotalMessages = totalMessages,
                SentMessages = sentMessages,
                FailedMessages = failedMessages,
                DeliveryRate = sentMessages > 0 ? (decimal)(sentMessages - failedMessages) / sentMessages * 100 : 0,
                AvgReadRate = Math.Round(avgReadRate, 2),
                MessagesByType = messagesByType,
                AnnouncementsByCategory = announcementsByCategory
            };
        }

        // ========== HELPER METHODS ==========

        private async Task CreateAnnouncementRecipientsAsync(Announcement announcement, CreateAnnouncementDto dto)
        {
            var recipients = new List<AnnouncementRecipient>();

            switch (dto.TargetAudience.ToLower())
            {
                case "all":
                    recipients.AddRange(await GetAllUsersAsRecipients(announcement));
                    break;
                case "students":
                    recipients.AddRange(await GetStudentsAsRecipients(announcement));
                    break;
                case "parents":
                    recipients.AddRange(await GetParentsAsRecipients(announcement));
                    break;
                case "staff":
                    recipients.AddRange(await GetStaffAsRecipients(announcement));
                    break;
                case "specific_class":
                    recipients.AddRange(await GetClassStudentsAsRecipients(announcement, dto.TargetGroups));
                    break;
                case "specific_section":
                    recipients.AddRange(await GetSectionStudentsAsRecipients(announcement, dto.TargetGroups));
                    break;
            }

            if (dto.TargetUserIds?.Any() == true)
            {
                foreach (var userId in dto.TargetUserIds)
                {
                    recipients.Add(new AnnouncementRecipient
                    {
                        Id = Guid.NewGuid(),
                        AnnouncementId = announcement.Id,
                        RecipientId = userId,
                        RecipientType = "User",
                        IsRead = false,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }

            if (recipients.Any())
            {
                _context.AnnouncementRecipients.AddRange(recipients);
                await _context.SaveChangesAsync();
            }
        }

        private async Task<List<AnnouncementRecipient>> GetAllUsersAsRecipients(Announcement announcement)
        {
            var recipients = new List<AnnouncementRecipient>();

            var students = await _context.Students
                .Where(s => s.SchoolId == announcement.SchoolId && s.IsActive)
                .Select(s => s.Id)
                .ToListAsync();

            recipients.AddRange(students.Select(id => new AnnouncementRecipient
            {
                Id = Guid.NewGuid(),
                AnnouncementId = announcement.Id,
                RecipientId = id,
                RecipientType = "Student",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            }));

            var staff = await _context.StaffMembers
                .Where(s => s.SchoolId == announcement.SchoolId && s.IsActive)
                .Select(s => s.Id)
                .ToListAsync();

            recipients.AddRange(staff.Select(id => new AnnouncementRecipient
            {
                Id = Guid.NewGuid(),
                AnnouncementId = announcement.Id,
                RecipientId = id,
                RecipientType = "Staff",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            }));

            return recipients;
        }

        private async Task<List<AnnouncementRecipient>> GetStudentsAsRecipients(Announcement announcement)
        {
            var students = await _context.Students
                .Where(s => s.SchoolId == announcement.SchoolId && s.IsActive)
                .Select(s => s.Id)
                .ToListAsync();

            return students.Select(id => new AnnouncementRecipient
            {
                Id = Guid.NewGuid(),
                AnnouncementId = announcement.Id,
                RecipientId = id,
                RecipientType = "Student",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            }).ToList();
        }

        private async Task<List<AnnouncementRecipient>> GetParentsAsRecipients(Announcement announcement)
        {
            var guardians = await _context.StudentGuardians
                .Where(p => p.SchoolId == announcement.SchoolId)
                .Select(p => p.Id)
                .ToListAsync();

            return guardians.Select(id => new AnnouncementRecipient
            {
                Id = Guid.NewGuid(),
                AnnouncementId = announcement.Id,
                RecipientId = id,
                RecipientType = "Parent",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            }).ToList();
        }

        private async Task<List<AnnouncementRecipient>> GetStaffAsRecipients(Announcement announcement)
        {
            var staff = await _context.StaffMembers
                .Where(s => s.SchoolId == announcement.SchoolId && s.Status.ToLower() == "active")
                .Select(s => s.Id)
                .ToListAsync();

            return staff.Select(id => new AnnouncementRecipient
            {
                Id = Guid.NewGuid(),
                AnnouncementId = announcement.Id,
                RecipientId = id,
                RecipientType = "Staff",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            }).ToList();
        }

        private async Task<List<AnnouncementRecipient>> GetClassStudentsAsRecipients(
            Announcement announcement, List<string>? targetGroups)
        {
            if (targetGroups == null || !targetGroups.Any())
                return new List<AnnouncementRecipient>();

            var students = await _context.Students
                .Where(s => s.SchoolId == announcement.SchoolId && 
                           s.IsActive && 
                           targetGroups.Contains(s.Class))
                .Select(s => s.Id)
                .ToListAsync();

            return students.Select(id => new AnnouncementRecipient
            {
                Id = Guid.NewGuid(),
                AnnouncementId = announcement.Id,
                RecipientId = id,
                RecipientType = "Student",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            }).ToList();
        }

        private async Task<List<AnnouncementRecipient>> GetSectionStudentsAsRecipients(
            Announcement announcement, List<string>? targetGroups)
        {
            if (targetGroups == null || !targetGroups.Any())
                return new List<AnnouncementRecipient>();

            var students = await _context.Students
                .Where(s => s.SchoolId == announcement.SchoolId && 
                           s.IsActive && 
                           targetGroups.Contains(s.Section))
                .Select(s => s.Id)
                .ToListAsync();

            return students.Select(id => new AnnouncementRecipient
            {
                Id = Guid.NewGuid(),
                AnnouncementId = announcement.Id,
                RecipientId = id,
                RecipientType = "Student",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            }).ToList();
        }

        private async Task<List<Guid>> GetTargetRecipientsAsync(
            Guid schoolId, string targetAudience, List<string>? targetGroups)
        {
            var recipients = new List<Guid>();

            switch (targetAudience.ToLower())
            {
                case "all":
                    var allStudents = await _context.Students
                        .Where(s => s.SchoolId == schoolId && s.IsActive)
                        .Select(s => s.Id)
                        .ToListAsync();
                    recipients.AddRange(allStudents);
                    break;

                case "students":
                    var students = await _context.Students
                        .Where(s => s.SchoolId == schoolId && s.IsActive)
                        .Select(s => s.Id)
                        .ToListAsync();
                    recipients.AddRange(students);
                    break;

                case "parents":
                    var guardians = await _context.StudentGuardians
                        .Where(p => p.SchoolId == schoolId)
                        .Select(p => p.Id)
                        .ToListAsync();
                    recipients.AddRange(guardians);
                    break;

                case "staff":
                    var staff = await _context.StaffMembers
                        .Where(s => s.SchoolId == schoolId && s.Status.ToLower() == "active")
                        .Select(s => s.Id)
                        .ToListAsync();
                    recipients.AddRange(staff);
                    break;

                case "specific_class":
                    if (targetGroups?.Any() == true)
                    {
                        var classStudents = await _context.Students
                            .Where(s => s.SchoolId == schoolId && 
                                       s.IsActive && 
                                       targetGroups.Contains(s.Class))
                            .Select(s => s.Id)
                            .ToListAsync();
                        recipients.AddRange(classStudents);
                    }
                    break;

                case "specific_section":
                    if (targetGroups?.Any() == true)
                    {
                        var sectionStudents = await _context.Students
                            .Where(s => s.SchoolId == schoolId && 
                                       s.IsActive && 
                                       targetGroups.Contains(s.Section))
                            .Select(s => s.Id)
                            .ToListAsync();
                        recipients.AddRange(sectionStudents);
                    }
                    break;
            }

            return recipients;
        }

        private static string GetAnnouncementCategory(string priority)
        {
            return priority.ToLower() switch
            {
                "urgent" => "emergency",
                "high" => "important",
                _ => "general"
            };
        }

        private List<string> GetTargetGroups(Announcement announcement)
        {
            var groups = new List<string>();

            if (announcement.TargetClass != null)
                groups.Add(announcement.TargetClass.Code);

            if (announcement.TargetSection != null)
                groups.Add(announcement.TargetSection.Name);

            return groups;
        }

        private List<AttachmentDto> GetAttachments(string? attachmentUrl)
        {
            if (string.IsNullOrEmpty(attachmentUrl))
                return new List<AttachmentDto>();

            return new List<AttachmentDto>
            {
                new AttachmentDto
                {
                    Id = Guid.NewGuid(),
                    FileName = System.IO.Path.GetFileName(attachmentUrl),
                    FileUrl = attachmentUrl,
                    FileType = System.IO.Path.GetExtension(attachmentUrl),
                    FileSize = 0
                }
            };
        }

        private string GetUserName(Guid userId, string userType)
        {
            return userType switch
            {
                "Student" => _context.Students
                    .Where(s => s.Id == userId)
                    .Select(s => s.Name)
                    .FirstOrDefault() ?? "Unknown",
                "Staff" => _context.StaffMembers
                    .Where(s => s.Id == userId)
                    .Select(s => s.Name)
                    .FirstOrDefault() ?? "Unknown",
                "Parent" => _context.StudentGuardians
                    .Where(p => p.Id == userId)
                    .Select(p => p.Name)
                    .FirstOrDefault() ?? "Unknown",
                _ => "Unknown"
            };
        }

        private string GetRecipientType(string targetAudience)
        {
            return targetAudience.ToLower() switch
            {
                "students" => "Student",
                "specific_class" => "Student",
                "specific_section" => "Student",
                "parents" => "Parent",
                "staff" => "Staff",
                _ => "Student"
            };
        }

        private static List<string> ParseVariables(string? variablesJson)
        {
            if (string.IsNullOrEmpty(variablesJson))
                return new List<string>();

            try
            {
                return JsonSerializer.Deserialize<List<string>>(variablesJson) ?? new List<string>();
            }
            catch
            {
                return new List<string>();
            }
        }

        // ========== SEED DEFAULT TEMPLATES ==========

        public async Task<List<MessageTemplateDto>> SeedDefaultTemplatesAsync(Guid schoolId)
        {
            var existing = await _context.Set<MessageTemplate>()
                .Where(t => t.SchoolId == schoolId && t.IsActive)
                .CountAsync();

            // Only seed if no templates exist for this school
            if (existing > 0)
                return await GetTemplatesAsync(schoolId, null);

            var defaults = BuildDefaultTemplates(schoolId);
            _context.Set<MessageTemplate>().AddRange(defaults);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Seeded {Count} default templates for school {SchoolId}", defaults.Count, schoolId);
            return await GetTemplatesAsync(schoolId, null);
        }

        private static List<MessageTemplate> BuildDefaultTemplates(Guid schoolId)
        {
            MessageTemplate T(string name, string type, string category, string? subject, string content, params string[] vars) =>
                new MessageTemplate
                {
                    SchoolId = schoolId,
                    Name = name,
                    Type = type,
                    Category = category,
                    Subject = subject,
                    Content = content,
                    Variables = JsonSerializer.Serialize(vars.ToList()),
                    IsActive = true
                };

            return new List<MessageTemplate>
            {
                // ── SMS ───────────────────────────────────────────────────────
                T("Fee Reminder SMS", "sms", "fees", null,
                    "Dear {{parentName}}, the school fee of {{amount}} for {{studentName}} ({{className}}) is due by {{dueDate}}. Please pay to avoid late charges. - {{schoolName}}",
                    "{{parentName}}", "{{studentName}}", "{{amount}}", "{{dueDate}}", "{{className}}", "{{schoolName}}"),

                T("Absent Notification SMS", "sms", "attendance", null,
                    "Dear {{parentName}}, your ward {{studentName}} was marked ABSENT on {{date}}. Please contact us if this is an error. - {{schoolName}}",
                    "{{parentName}}", "{{studentName}}", "{{date}}", "{{schoolName}}"),

                T("Exam Reminder SMS", "sms", "exam", null,
                    "Dear {{parentName}}, exams for {{studentName}} ({{className}}) begin on {{date}}. Timetable available on the portal. Best wishes! - {{schoolName}}",
                    "{{parentName}}", "{{studentName}}", "{{className}}", "{{date}}", "{{schoolName}}"),

                T("PTM Reminder SMS", "sms", "event", null,
                    "Dear {{parentName}}, Parent-Teacher Meeting for {{className}} is on {{date}}. Your presence is important. - {{schoolName}}",
                    "{{parentName}}", "{{className}}", "{{date}}", "{{schoolName}}"),

                T("Result Published SMS", "sms", "results", null,
                    "Dear {{parentName}}, results for {{studentName}} are now available. Please log in to the portal or visit school. - {{schoolName}}",
                    "{{parentName}}", "{{studentName}}", "{{schoolName}}"),

                T("Holiday Notice SMS", "sms", "general", null,
                    "Dear {{parentName}}, {{schoolName}} will be closed on {{date}} due to {{reason}}. School resumes on {{nextDate}}. Stay safe!",
                    "{{parentName}}", "{{schoolName}}", "{{date}}", "{{reason}}", "{{nextDate}}"),

                // ── WhatsApp ──────────────────────────────────────────────────
                T("Fee Reminder WhatsApp", "whatsapp", "fees", null,
                    "*Fee Payment Reminder*\n\nDear {{parentName}},\n\nThis is a gentle reminder that the school fee of *{{amount}}* for *{{studentName}}* ({{className}}) is due by *{{dueDate}}*.\n\nKindly make the payment at the earliest to avoid any late charges.\n\nPayment portal: {{link}}\n\nRegards,\n*{{schoolName}}*",
                    "{{parentName}}", "{{studentName}}", "{{amount}}", "{{dueDate}}", "{{className}}", "{{link}}", "{{schoolName}}"),

                T("Absent Notification WhatsApp", "whatsapp", "attendance", null,
                    "*Attendance Alert 🔔*\n\nDear {{parentName}},\n\nYour ward *{{studentName}}* has been marked *absent* today ({{date}}).\n\nIf this is an error, please contact the school office immediately.\n\nRegards,\n*{{schoolName}}*",
                    "{{parentName}}", "{{studentName}}", "{{date}}", "{{schoolName}}"),

                T("Exam Schedule WhatsApp", "whatsapp", "exam", null,
                    "*📚 Exam Schedule*\n\nDear {{parentName}},\n\nExaminations for *{{studentName}}* ({{className}}) are scheduled to begin on *{{date}}*.\n\nThe complete timetable is available on the school portal.\n\nWishing {{studentName}} all the best! 🌟\n\n*{{schoolName}}*",
                    "{{parentName}}", "{{studentName}}", "{{className}}", "{{date}}", "{{schoolName}}"),

                T("PTM Invitation WhatsApp", "whatsapp", "event", null,
                    "*📅 Parent-Teacher Meeting*\n\nDear {{parentName}},\n\nWe would like to invite you to the *Parent-Teacher Meeting* for *{{className}}* on *{{date}}*.\n\nYour participation helps us support {{studentName}}'s growth together.\n\nKindly confirm your attendance.\n\n*{{schoolName}}*",
                    "{{parentName}}", "{{className}}", "{{date}}", "{{studentName}}", "{{schoolName}}"),

                T("Result Published WhatsApp", "whatsapp", "results", null,
                    "*🎓 Results Published*\n\nDear {{parentName}},\n\nThe results for *{{studentName}}* ({{className}}) have been published.\n\nPlease log in to the parent portal to view the detailed report.\n\n{{link}}\n\n*{{schoolName}}*",
                    "{{parentName}}", "{{studentName}}", "{{className}}", "{{link}}", "{{schoolName}}"),

                T("Holiday Notice WhatsApp", "whatsapp", "general", null,
                    "*🏫 Holiday Notice*\n\nDear {{parentName}},\n\n{{schoolName}} will remain closed on *{{date}}* on account of *{{reason}}*.\n\nSchool will resume on *{{nextDate}}*.\n\nWe wish you and your family a wonderful time! 🎉",
                    "{{parentName}}", "{{schoolName}}", "{{date}}", "{{reason}}", "{{nextDate}}"),

                // ── Email ─────────────────────────────────────────────────────
                T("Fee Reminder Email", "email", "fees",
                    "Fee Payment Reminder – {{studentName}} ({{className}})",
                    "Dear {{parentName}},\n\nThis is a reminder that the school fee of {{amount}} for {{studentName}} of {{className}} is due by {{dueDate}}.\n\nPlease ensure timely payment to avoid any inconvenience. You can pay online at {{link}}.\n\nFor queries, please contact the accounts office.\n\n{{signature}}",
                    "{{parentName}}", "{{studentName}}", "{{amount}}", "{{dueDate}}", "{{className}}", "{{link}}", "{{signature}}"),

                T("Absent Notification Email", "email", "attendance",
                    "Attendance Alert – {{studentName}} marked Absent on {{date}}",
                    "Dear {{parentName}},\n\nWe would like to inform you that {{studentName}} was marked absent on {{date}}.\n\nIf this is an error or your child is unwell, please inform the class teacher at the earliest.\n\nRegards,\n{{signature}}",
                    "{{parentName}}", "{{studentName}}", "{{date}}", "{{signature}}"),

                T("Exam Schedule Email", "email", "exam",
                    "Upcoming Examinations – {{studentName}}, {{className}}",
                    "Dear {{parentName}},\n\nThe upcoming examination schedule for {{studentName}} of {{className}} has been published.\n\nExams begin on {{date}}. Please ensure your child is well-prepared.\n\nThe detailed timetable is attached and also available on the portal at {{link}}.\n\nWe wish {{studentName}} all the best!\n\n{{signature}}",
                    "{{parentName}}", "{{studentName}}", "{{className}}", "{{date}}", "{{link}}", "{{signature}}"),

                T("PTM Invitation Email", "email", "event",
                    "Invitation: Parent-Teacher Meeting – {{className}} on {{date}}",
                    "Dear {{parentName}},\n\nWe cordially invite you to the Parent-Teacher Meeting for {{className}} scheduled on {{date}}.\n\nThis is a great opportunity to discuss {{studentName}}'s academic progress, strengths, and areas of improvement with their teachers.\n\nKindly confirm your attendance by replying to this email or contacting the school office.\n\nWe look forward to meeting you.\n\n{{signature}}",
                    "{{parentName}}", "{{studentName}}", "{{className}}", "{{date}}", "{{signature}}"),

                T("Result Published Email", "email", "results",
                    "Results Published – {{studentName}}, {{className}}",
                    "Dear {{parentName}},\n\nWe are pleased to inform you that the results for {{studentName}} ({{className}}) have been published.\n\nYou can view the detailed report card by logging in to the parent portal at {{link}}.\n\nFor any queries regarding the results, please contact the class teacher.\n\nWarm regards,\n{{signature}}",
                    "{{parentName}}", "{{studentName}}", "{{className}}", "{{link}}", "{{signature}}"),

                T("Holiday Notice Email", "email", "general",
                    "Holiday Notice – {{schoolName}}",
                    "Dear {{parentName}},\n\nThis is to inform you that {{schoolName}} will remain closed on {{date}} on account of {{reason}}.\n\nSchool will resume on {{nextDate}}.\n\nWe wish you and your family a pleasant time.\n\nRegards,\n{{signature}}",
                    "{{parentName}}", "{{schoolName}}", "{{date}}", "{{reason}}", "{{nextDate}}", "{{signature}}"),
            };
        }

        // ========== STAFF-TO-PARENT COMMUNICATION ==========

        public async Task<List<StudentBasicDto>> GetStaffClassStudentsAsync(Guid schoolId, Guid staffUserId)
        {
            // staffUserId is UserLogin.Id — resolve to StaffMember via email
            var userLogin = await _context.UserLogins
                .FirstOrDefaultAsync(ul => ul.Id == staffUserId && !ul.IsDeleted);

            if (userLogin == null)
                return new List<StudentBasicDto>();

            var staffMember = await _context.StaffMembers
                .FirstOrDefaultAsync(s => s.SchoolId == schoolId && s.Email == userLogin.Email && !s.IsDeleted);

            if (staffMember == null)
                return new List<StudentBasicDto>();

            // Find teacher assignments for this staff
            var classIds = await _context.TeacherAssignments
                .Where(ta => ta.StaffId == staffMember.Id && ta.SchoolId == schoolId && !ta.IsDeleted)
                .Select(ta => ta.ClassId)
                .Distinct()
                .ToListAsync();

            if (classIds.Count == 0)
                return new List<StudentBasicDto>();

            // Resolve class names from ClassIds so we can match against Student.Class (string field)
            var classNames = await _context.Classes
                .Where(c => classIds.Contains(c.Id) && c.SchoolId == schoolId && !c.IsDeleted)
                .Select(c => c.Name)
                .ToListAsync();

            if (classNames.Count == 0)
                return new List<StudentBasicDto>();

            // Also resolve section names so we can optionally scope by section
            var sectionAssignments = await _context.TeacherAssignments
                .Include(ta => ta.Section)
                .Where(ta => ta.StaffId == staffMember.Id && ta.SchoolId == schoolId && !ta.IsDeleted && ta.SectionId != null)
                .Select(ta => new { ClassName = ta.Class!.Name, SectionName = ta.Section!.Name })
                .ToListAsync();

            // Build a set of (className, sectionName) pairs for scoped matching;
            // If no section is set on an assignment, all sections of that class are included.
            var classesWithAllSections = await _context.TeacherAssignments
                .Where(ta => ta.StaffId == staffMember.Id && ta.SchoolId == schoolId && !ta.IsDeleted && ta.SectionId == null)
                .Join(_context.Classes, ta => ta.ClassId, c => c.Id, (ta, c) => c.Name)
                .Distinct()
                .ToListAsync();

            // Load all students in matching classes (SQL-safe), then filter by section in-memory
            var allStudentsInClasses = await _context.Students
                .Include(s => s.Guardians!.Where(g => !g.IsDeleted))
                .Where(s => s.SchoolId == schoolId && !s.IsDeleted && classNames.Contains(s.Class))
                .ToListAsync();

            // Apply section scoping in-memory (anonymous type .Any() can't be translated to SQL)
            var students = allStudentsInClasses.Where(s =>
                    classesWithAllSections.Contains(s.Class) ||
                    sectionAssignments.Any(a => a.ClassName == s.Class && a.SectionName == s.Section))
                .ToList();

            // Resolve portal user IDs for guardians by matching email to UserLogins
            var guardianEmails = students
                .SelectMany(s => s.Guardians ?? new List<StudentGuardian>())
                .Where(g => !g.IsDeleted && g.Email != null)
                .Select(g => g.Email!)
                .Distinct()
                .ToList();

            var guardianPortalAccounts = await _context.UserLogins
                .Where(ul => guardianEmails.Contains(ul.Email) && !ul.IsDeleted)
                .Select(ul => new { ul.Email, ul.Id })
                .ToListAsync();

            var portalLookup = guardianPortalAccounts.ToDictionary(x => x.Email, x => x.Id);

            return students.Select(s => new StudentBasicDto
            {
                Id = s.Id,
                Name = s.Name,
                Email = s.Email ?? "",
                PhotoUrl = s.PhotoUrl,
                Class = s.Class,
                Section = s.Section,
                RollNumber = s.RollNumber ?? "",
                Guardians = (s.Guardians ?? new List<StudentGuardian>())
                    .Where(g => !g.IsDeleted)
                    .Select(g => new GuardianInfoDto
                    {
                        GuardianId = g.Id,
                        Name = g.Name,
                        Relation = g.Relation,
                        Phone = g.Phone,
                        Email = g.Email,
                        PortalUserId = g.Email != null && portalLookup.ContainsKey(g.Email)
                            ? portalLookup[g.Email]
                            : null
                    })
                    .ToList()
            }).ToList();
        }

        public async Task<StaffParentMessageDto> SendStaffToParentMessageAsync(Guid schoolId, Guid staffUserId, SendStaffParentMessageDto dto)
        {
            // VALIDATION: Message content required
            if (string.IsNullOrWhiteSpace(dto.Message))
                throw new ArgumentException("Message content is required");
            if (dto.Message.Length > 5000)
                throw new ArgumentException("Message content cannot exceed 5000 characters");

            // VALIDATION: Subject max length
            if (dto.Subject != null && dto.Subject.Length > 200)
                throw new ArgumentException("Message subject cannot exceed 200 characters");

            // VALIDATION: Message type
            var validMessageTypes = new[] { "Text", "File", "Image", "Audio", "Video" };
            if (dto.MessageType != null && !validMessageTypes.Contains(dto.MessageType))
                throw new ArgumentException("Message type must be one of: Text, File, Image, Audio, Video");

            // staffUserId is UserLogin.Id — resolve to StaffMember via email
            var senderLogin = await _context.UserLogins
                .FirstOrDefaultAsync(ul => ul.Id == staffUserId && !ul.IsDeleted);

            if (senderLogin == null)
                throw new KeyNotFoundException("Staff user not found");

            var staffMember = await _context.StaffMembers
                .FirstOrDefaultAsync(s => s.SchoolId == schoolId && s.Email == senderLogin.Email && !s.IsDeleted);

            if (staffMember == null)
                throw new KeyNotFoundException("Staff member not found in school");

            // Verify parent exists
            var parentUser = await _context.UserLogins
                .FirstOrDefaultAsync(u => u.Id == dto.ParentUserId);

            if (parentUser == null)
                throw new KeyNotFoundException("Parent user not found");

            // Verify student exists if provided
            if (dto.StudentId.HasValue)
            {
                var student = await _context.Students
                    .FirstOrDefaultAsync(s => s.Id == dto.StudentId && s.SchoolId == schoolId);

                if (student == null)
                    throw new KeyNotFoundException("Student not found");
            }

            // Create message record
            var message = new Message
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                SenderId = staffMember.Id,
                SenderType = "Staff",
                ReceiverId = dto.ParentUserId,
                ReceiverType = "Parent",
                Subject = dto.Subject,
                Content = dto.Message,
                MessageType = dto.MessageType ?? "Text",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Messages.Add(message);
            await _context.SaveChangesAsync();

            return await GetStaffParentMessageAsync(schoolId, message.Id)
                ?? throw new Exception("Failed to retrieve created message");
        }

        public async Task<StaffParentMessageDto?> GetStaffParentMessageAsync(Guid schoolId, Guid messageId)
        {
            var message = await _context.Messages
                .FirstOrDefaultAsync(m => m.SchoolId == schoolId && m.Id == messageId && m.SenderType == "Staff" && m.ReceiverType == "Parent");

            if (message == null)
                return null;

            // Get sender staff info
            var staff = await _context.StaffMembers.FirstOrDefaultAsync(s => s.Id == message.SenderId);
            var staffName = staff?.Name ?? "Unknown";
            
            // Get receiver parent info
            var parentUser = await _context.UserLogins.FirstOrDefaultAsync(u => u.Id == message.ReceiverId);
            var parentName = $"{parentUser?.FirstName} {parentUser?.LastName}".Trim();
            if (string.IsNullOrEmpty(parentName)) parentName = "Unknown";
            var parentEmail = parentUser?.Email ?? "";

            return new StaffParentMessageDto
            {
                Id = message.Id,
                StaffId = message.SenderId,
                StaffName = staffName,
                ParentUserId = message.ReceiverId,
                ParentName = parentName,
                ParentEmail = parentEmail,
                StudentId = null,
                StudentName = "Class",
                Subject = message.Subject ?? "",
                Message = message.Content,
                MessageType = message.MessageType,
                SentAt = message.CreatedAt,
                IsRead = message.IsRead,
                ReadAt = message.ReadAt
            };
        }

        public async Task<PaginatedResponse<StaffParentMessageDto>> GetStaffSentMessagesAsync(Guid schoolId, Guid staffUserId, int page, int pageSize, string? searchQuery)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 20;
            if (pageSize > 100) pageSize = 100;

            // staffUserId is UserLogin.Id — resolve to StaffMember via email
            var userLogin = await _context.UserLogins
                .FirstOrDefaultAsync(ul => ul.Id == staffUserId && !ul.IsDeleted);

            if (userLogin == null)
                return new PaginatedResponse<StaffParentMessageDto>
                {
                    Items = new List<StaffParentMessageDto>(),
                    TotalCount = 0,
                    Page = page,
                    PageSize = pageSize,
                    TotalPages = 0
                };

            var staffMember = await _context.StaffMembers
                .FirstOrDefaultAsync(s => s.SchoolId == schoolId && s.Email == userLogin.Email && !s.IsDeleted);

            if (staffMember == null)
                return new PaginatedResponse<StaffParentMessageDto>
                {
                    Items = new List<StaffParentMessageDto>(),
                    TotalCount = 0,
                    Page = page,
                    PageSize = pageSize,
                    TotalPages = 0
                };

            var query = _context.Messages
                .Where(m => m.SchoolId == schoolId && 
                           m.SenderId == staffMember.Id && 
                           m.SenderType == "Staff" && 
                           m.ReceiverType == "Parent");

            if (!string.IsNullOrEmpty(searchQuery))
            {
                query = query.Where(m => m.Subject.Contains(searchQuery) || 
                                        m.Content.Contains(searchQuery));
            }

            var totalCount = await query.CountAsync();

            var messages = await query
                .OrderByDescending(m => m.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var dtos = new List<StaffParentMessageDto>();
            foreach (var msg in messages)
            {
                var staff = await _context.StaffMembers.FirstOrDefaultAsync(s => s.Id == msg.SenderId);
                var parentUser = await _context.UserLogins.FirstOrDefaultAsync(u => u.Id == msg.ReceiverId);
                var parentName = $"{parentUser?.FirstName} {parentUser?.LastName}".Trim();
                if (string.IsNullOrEmpty(parentName)) parentName = "Unknown";

                dtos.Add(new StaffParentMessageDto
                {
                    Id = msg.Id,
                    StaffId = msg.SenderId,
                    StaffName = staff?.Name ?? "Unknown",
                    ParentUserId = msg.ReceiverId,
                    ParentName = parentName,
                    ParentEmail = parentUser?.Email ?? "",
                    StudentId = null,
                    StudentName = "Class",
                    Subject = msg.Subject ?? "",
                    Message = msg.Content,
                    MessageType = msg.MessageType,
                    SentAt = msg.CreatedAt,
                    IsRead = msg.IsRead,
                    ReadAt = msg.ReadAt
                });
            }

            return new PaginatedResponse<StaffParentMessageDto>
            {
                Items = dtos,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
            };
        }

        public async Task<BulkSendResultDto> BulkSendStaffToParentsAsync(Guid schoolId, Guid staffUserId, BulkSendStaffParentDto dto)
        {
            // VALIDATION: Message content required
            if (string.IsNullOrWhiteSpace(dto.Message))
                throw new ArgumentException("Message content is required");
            if (dto.Message.Length > 5000)
                throw new ArgumentException("Message content cannot exceed 5000 characters");

            // VALIDATION: Subject max length
            if (dto.Subject != null && dto.Subject.Length > 200)
                throw new ArgumentException("Message subject cannot exceed 200 characters");

            // VALIDATION: Message type
            var validMessageTypes = new[] { "Text", "File", "Image", "Audio", "Video" };
            if (dto.MessageType != null && !validMessageTypes.Contains(dto.MessageType))
                throw new ArgumentException("Message type must be one of: Text, File, Image, Audio, Video");

            // staffUserId is UserLogin.Id — resolve to StaffMember via email
            var bulkLogin = await _context.UserLogins
                .FirstOrDefaultAsync(ul => ul.Id == staffUserId && !ul.IsDeleted);

            if (bulkLogin == null)
                throw new KeyNotFoundException("Staff user not found");

            var staffMember = await _context.StaffMembers
                .FirstOrDefaultAsync(s => s.SchoolId == schoolId && s.Email == bulkLogin.Email && !s.IsDeleted);

            if (staffMember == null)
                throw new KeyNotFoundException("Staff member not found in school");

            var recipientIds = new List<Guid>();

            // Get recipients based on bulk send options
            if (dto.SendToAllClassParents)
            {
                // Get all students in staff's classes, then get their parents
                var classIds = await _context.TeacherAssignments
                    .Where(ta => ta.StaffId == staffMember.Id && ta.SchoolId == schoolId && !ta.IsDeleted)
                    .Select(ta => ta.ClassId)
                    .Distinct()
                    .ToListAsync();

                if (classIds.Count > 0)
                {
                    var studentIds = await _context.Students
                        .Where(s => s.SchoolId == schoolId && !s.IsDeleted)
                        .Where(s => _context.Classes.Any(c => c.SchoolId == schoolId && c.Id == s.Id && classIds.Contains(c.Id)))
                        .Select(s => s.Id)
                        .ToListAsync();

                    // Get parent user IDs via StudentGuardian emails matched with UserLogin
                    recipientIds = await (from sg in _context.StudentGuardians
                                         join ul in _context.UserLogins on sg.Email equals ul.Email
                                         where studentIds.Contains(sg.StudentId) && !sg.IsDeleted
                                         select ul.Id)
                        .Distinct()
                        .ToListAsync();
                }
            }
            else if (dto.ParentUserIds?.Any() == true)
            {
                recipientIds = dto.ParentUserIds.ToList();
            }

            if (recipientIds.Count == 0)
                return new BulkSendResultDto
                {
                    TotalSent = 0,
                    SuccessCount = 0,
                    FailureCount = 0,
                    SentAt = DateTime.UtcNow,
                    FailedParentEmails = new List<string>()
                };

            var messages = new List<Message>();
            var failedEmails = new List<string>();

            foreach (var parentUserId in recipientIds)
            {
                try
                {
                    var parentUser = await _context.UserLogins
                        .FirstOrDefaultAsync(u => u.Id == parentUserId);

                    if (parentUser == null)
                    {
                        failedEmails.Add($"Parent {parentUserId}");
                        continue;
                    }

                    var message = new Message
                    {
                        Id = Guid.NewGuid(),
                        SchoolId = schoolId,
                        SenderId = staffMember.Id,
                        SenderType = "Staff",
                        ReceiverId = parentUserId,
                        ReceiverType = "Parent",
                        Subject = dto.Subject,
                        Content = dto.Message,
                        MessageType = dto.MessageType ?? "Text",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    messages.Add(message);
                }
                catch (Exception ex)
                {
                    _logger.LogError($"Error creating message for parent {parentUserId}: {ex.Message}");
                    failedEmails.Add(parentUserId.ToString());
                }
            }

            if (messages.Count > 0)
            {
                _context.Messages.AddRange(messages);
                await _context.SaveChangesAsync();
            }

            return new BulkSendResultDto
            {
                TotalSent = recipientIds.Count,
                SuccessCount = messages.Count,
                FailureCount = failedEmails.Count,
                SentAt = DateTime.UtcNow,
                FailedParentEmails = failedEmails
            };
        }
    }

}

