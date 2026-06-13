using SmsApi.Models.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.DTOs;
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
    [Route("api/[controller]")]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class CommunicationController : ControllerBase
    {
        private readonly ICommunicationService _service;
        private readonly ILogger<CommunicationController> _logger;
        private readonly AppDbContext _db;

        public CommunicationController(ICommunicationService service, ILogger<CommunicationController> logger, AppDbContext db)
        {
            _service = service;
            _logger = logger;
            _db = db;
        }

        private Guid GetSchoolId()
        {
            var schoolIdClaim = User.FindFirst("SchoolId")?.Value;
            return Guid.Parse(schoolIdClaim ?? throw new UnauthorizedAccessException());
        }

        private Guid GetUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.Parse(userIdClaim ?? throw new UnauthorizedAccessException());
        }

        // ========== ANNOUNCEMENTS API ==========

        /// <summary>
        /// Get paginated announcements with filters
        /// </summary>
        [HttpGet("announcements")]
        [ProducesResponseType(typeof(PaginatedResponse<AnnouncementBasicDto>), 200)]
        public async Task<ActionResult<PaginatedResponse<AnnouncementBasicDto>>> GetAnnouncements(
            [FromQuery] AnnouncementFiltersDto filters,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            try
            {
                var schoolId = GetSchoolId();
                // Convert AnnouncementFiltersDto to CommunicationFiltersDto
                var commFilters = new CommunicationFiltersDto
                {
                    Status = filters.Status,
                    Priority = filters.Priority,
                    TargetAudience = filters.TargetAudience,
                    SearchQuery = filters.SearchQuery,
                    DateFrom = filters.DateFrom,
                    DateTo = filters.DateTo
                };
                var result = await _service.GetAnnouncementsAsync(schoolId, commFilters, page, pageSize);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting announcements");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Get announcement by ID (Full DTO)
        /// </summary>
        [HttpGet("announcements/{id}")]
        [ProducesResponseType(typeof(AnnouncementFullDto), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<AnnouncementFullDto>> GetAnnouncementById(Guid id)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetAnnouncementByIdAsync(schoolId, id);
                
                if (result == null)
                    return NotFound(new { message = "Announcement not found" });
                
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting announcement {Id}", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Create a new announcement
        /// </summary>
        [HttpPost("announcements")]
        [ProducesResponseType(typeof(AnnouncementFullDto), 201)]
        [ProducesResponseType(400)]
        public async Task<ActionResult<AnnouncementFullDto>> CreateAnnouncement([FromBody] CreateAnnouncementDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                var result = await _service.CreateAnnouncementAsync(schoolId, dto, userId);
                
                return CreatedAtAction(nameof(GetAnnouncementById), new { id = result.Id }, result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating announcement");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Update an existing announcement
        /// </summary>
        [HttpPut("announcements/{id}")]
        [ProducesResponseType(typeof(AnnouncementFullDto), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<AnnouncementFullDto>> UpdateAnnouncement(
            Guid id, 
            [FromBody] UpdateAnnouncementDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.UpdateAnnouncementAsync(schoolId, id, dto);
                
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Announcement not found" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating announcement {Id}", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Delete an announcement
        /// </summary>
        [HttpDelete("announcements/{id}")]
        [ProducesResponseType(204)]
        [ProducesResponseType(404)]
        public async Task<ActionResult> DeleteAnnouncement(Guid id)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.DeleteAnnouncementAsync(schoolId, id);
                
                if (!result)
                    return NotFound(new { message = "Announcement not found" });
                
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting announcement {Id}", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Publish an announcement
        /// </summary>
        [HttpPut("announcements/{id}/publish")]
        [ProducesResponseType(typeof(AnnouncementFullDto), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<AnnouncementFullDto>> PublishAnnouncement(Guid id)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                var result = await _service.PublishAnnouncementAsync(schoolId, id, userId);
                
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Announcement not found" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error publishing announcement {Id}", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Mark announcement as read by current user
        /// </summary>
        [HttpPost("announcements/{id}/mark-read")]
        [ProducesResponseType(200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult> MarkAnnouncementAsRead(Guid id)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                await _service.AcknowledgeAnnouncementAsync(schoolId, id, userId);
                
                return Ok(new { message = "Announcement marked as read" });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking announcement {Id} as read", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // ========== MESSAGES API ==========

        /// <summary>
        /// Get paginated messages with filters
        /// </summary>
        [HttpGet("messages")]
        [ProducesResponseType(typeof(PaginatedResponse<MessageBasicDto>), 200)]
        public async Task<ActionResult<PaginatedResponse<MessageBasicDto>>> GetMessages(
            [FromQuery] MessageFiltersDto filters,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            try
            {
                var schoolId = GetSchoolId();
                // Convert MessageFiltersDto to CommunicationFiltersDto
                var commFilters = new CommunicationFiltersDto
                {
                    Type = filters.Type,
                    SearchQuery = filters.SearchQuery,
                    DateFrom = filters.DateFrom,
                    DateTo = filters.DateTo
                };
                var result = await _service.GetMessagesAsync(schoolId, commFilters, page, pageSize);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting messages");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Get message by ID (Full DTO)
        /// </summary>
        [HttpGet("messages/{id}")]
        [ProducesResponseType(typeof(MessageFullDto), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<MessageFullDto>> GetMessageById(Guid id)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetMessageByIdAsync(schoolId, id);
                
                if (result == null)
                    return NotFound(new { message = "Message not found" });
                
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting message {Id}", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Send a new message
        /// </summary>
        [HttpPost("messages")]
        [ProducesResponseType(typeof(MessageFullDto), 201)]
        [ProducesResponseType(400)]
        public async Task<ActionResult<MessageFullDto>> SendMessage([FromBody] SendMessageDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                // Convert SendMessageDto to CreateMessageDto
                var createDto = new CreateMessageDto
                {
                    ToUserIds = dto.ToUserIds ?? new List<Guid>(),
                    Subject = dto.Subject,
                    Content = dto.Content,
                    Type = dto.Type ?? "general"
                };
                var result = await _service.SendMessageAsync(schoolId, createDto, userId);
                
                return CreatedAtAction(nameof(GetMessageById), new { id = result.Id }, result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending message");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Send bulk messages to multiple recipients
        /// </summary>
        [HttpPost("messages/bulk")]
        [ProducesResponseType(typeof(BulkMessageResultDto), 201)]
        public async Task<ActionResult<BulkMessageResultDto>> BulkSendMessage([FromBody] BulkSendMessageDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                var result = await _service.BulkSendMessageAsync(schoolId, dto, userId);
                
                return CreatedAtAction(nameof(GetMessages), null, result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error bulk sending messages");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // ========== TEMPLATES API ==========

        /// <summary>
        /// Get all communication templates
        /// </summary>
        [HttpGet("templates")]
        [ProducesResponseType(typeof(List<CommunicationTemplateDto>), 200)]
        public async Task<ActionResult<List<CommunicationTemplateDto>>> GetTemplates(
            [FromQuery] string? type = null,
            [FromQuery] string? category = null)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetTemplatesAsync(schoolId, type);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting templates");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Create a new communication template
        /// </summary>
        [HttpPost("templates")]
        [ProducesResponseType(typeof(CommunicationTemplateDto), 201)]
        [ProducesResponseType(400)]
        public async Task<ActionResult<CommunicationTemplateDto>> CreateTemplate([FromBody] CreateTemplateDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.CreateTemplateAsync(schoolId, dto);
                
                return CreatedAtAction(nameof(GetTemplates), new { id = result.Id }, result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating template");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Update an existing communication template
        /// </summary>
        [HttpPut("templates/{id}")]
        [ProducesResponseType(typeof(CommunicationTemplateDto), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<CommunicationTemplateDto>> UpdateTemplate(
            Guid id, 
            [FromBody] UpdateTemplateDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                // Get existing template to fill in required fields
                var existing = await _service.GetTemplatesAsync(schoolId, null);
                var existingTemplate = existing.FirstOrDefault(t => t.Id == id);
                
                if (existingTemplate == null)
                    return NotFound(new { message = "Template not found" });
                
                // Convert UpdateTemplateDto to CreateTemplateDto
                var createDto = new CreateTemplateDto
                {
                    Name = dto.Name ?? existingTemplate.Name,
                    Type = existingTemplate.Type, // Type cannot be changed
                    Category = existingTemplate.Category, // Category cannot be changed
                    Subject = dto.Subject ?? existingTemplate.Subject,
                    Content = dto.Content ?? existingTemplate.Content,
                    Variables = dto.Variables ?? existingTemplate.Variables
                };
                
                var result = await _service.UpdateTemplateAsync(schoolId, id, createDto);
                
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Template not found" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating template {Id}", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Delete a communication template
        /// </summary>
        [HttpDelete("templates/{id}")]
        [ProducesResponseType(204)]
        [ProducesResponseType(404)]
        public async Task<ActionResult> DeleteTemplate(Guid id)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.DeleteTemplateAsync(schoolId, id);
                
                if (!result)
                    return NotFound(new { message = "Template not found" });
                
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting template {Id}", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Seed school with default communication templates (no-op if templates already exist)
        /// </summary>
        [HttpPost("templates/seed-defaults")]
        [ProducesResponseType(typeof(List<CommunicationTemplateDto>), 200)]
        public async Task<ActionResult> SeedDefaultTemplates()
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.SeedDefaultTemplatesAsync(schoolId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error seeding default templates");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // ========== STATISTICS API ==========

        /// <summary>
        /// Get communication statistics
        /// </summary>
        [HttpGet("stats")]
        [ProducesResponseType(typeof(CommunicationStatsDto), 200)]
        public async Task<ActionResult<CommunicationStatsDto>> GetCommunicationStats(
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetCommunicationStatsAsync(schoolId, startDate, endDate);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting communication stats");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // ========== STAFF-TO-PARENT MESSAGING API ==========

        /// <summary>
        /// Get students of current staff's assigned class
        /// </summary>
        [HttpGet("staff/class-students")]
        [ProducesResponseType(typeof(List<StudentBasicDto>), 200)]
        public async Task<ActionResult<List<StudentBasicDto>>> GetClassStudents()
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                var result = await _service.GetStaffClassStudentsAsync(schoolId, userId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting class students");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Send message from staff to parent
        /// </summary>
        [HttpPost("staff/send-to-parent")]
        [ProducesResponseType(typeof(StaffParentMessageDto), 201)]
        [ProducesResponseType(400)]
        public async Task<ActionResult<StaffParentMessageDto>> SendStaffToParentMessage(
            [FromBody] SendStaffParentMessageDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                var result = await _service.SendStaffToParentMessageAsync(schoolId, userId, dto);
                return CreatedAtAction(nameof(GetStaffParentMessage), new { id = result.Id }, result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending message to parent");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Get single staff-to-parent message
        /// </summary>
        [HttpGet("staff/messages/{id}")]
        [ProducesResponseType(typeof(StaffParentMessageDto), 200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<StaffParentMessageDto>> GetStaffParentMessage(Guid id)
        {
            try
            {
                var schoolId = GetSchoolId();
                var result = await _service.GetStaffParentMessageAsync(schoolId, id);
                
                if (result == null)
                    return NotFound(new { message = "Message not found" });
                
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting message {Id}", id);
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Get paginated staff-to-parent messages sent by current staff
        /// </summary>
        [HttpGet("staff/messages-sent")]
        [ProducesResponseType(typeof(PaginatedResponse<StaffParentMessageDto>), 200)]
        public async Task<ActionResult<PaginatedResponse<StaffParentMessageDto>>> GetStaffSentMessages(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? searchQuery = null)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                var result = await _service.GetStaffSentMessagesAsync(schoolId, userId, page, pageSize, searchQuery);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting sent messages");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Bulk send message to multiple parents (staff's class students' parents)
        /// </summary>
        [HttpPost("staff/bulk-send-to-parents")]
        [ProducesResponseType(typeof(BulkSendResultDto), 201)]
        [ProducesResponseType(400)]
        public async Task<ActionResult<BulkSendResultDto>> BulkSendToParents(
            [FromBody] BulkSendStaffParentDto dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();
                var result = await _service.BulkSendStaffToParentsAsync(schoolId, userId, dto);
                return CreatedAtAction(nameof(GetStaffSentMessages), result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error bulk sending messages");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // ========== MOBILE MESSAGING API (conversation/thread model) ==========

        /// <summary>
        /// [Mobile] Returns paginated list of conversations for the current user.
        /// Each conversation is a thread between the current user and one other participant.
        /// </summary>
        [HttpGet("mobile/conversations")]
        [ProducesResponseType(typeof(PaginatedResponse<MobileConversationDto>), 200)]
        public async Task<ActionResult<PaginatedResponse<MobileConversationDto>>> GetMobileConversations(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();

                // Resolve caller's StaffMember.Id (senders are stored by StaffMember.Id)
                var callerLogin = await _db.UserLogins
                    .AsNoTracking()
                    .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted);

                Guid? callerStaffId = null;
                if (!string.IsNullOrEmpty(callerLogin?.Email))
                {
                    callerStaffId = await _db.StaffMembers
                        .AsNoTracking()
                        .Where(s => s.SchoolId == schoolId && s.Email == callerLogin.Email && !s.IsDeleted)
                        .Select(s => (Guid?)s.Id)
                        .FirstOrDefaultAsync();
                }

                // Find all conversations involving this user (as sender or receiver)
                var conversationsQuery = _db.Conversations
                    .AsNoTracking()
                    .Where(c => c.SchoolId == schoolId && c.IsActive &&
                        (c.Participant1Id == userId || c.Participant2Id == userId ||
                         (callerStaffId.HasValue && (c.Participant1Id == callerStaffId.Value || c.Participant2Id == callerStaffId.Value))));

                var total = await conversationsQuery.CountAsync();
                var conversations = await conversationsQuery
                    .OrderByDescending(c => c.LastMessageAt)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToListAsync();

                var dtos = new List<MobileConversationDto>();
                foreach (var conv in conversations)
                {
                    // Determine the other participant's ID (use UserLogin.Id for consistency)
                    var otherParticipantId = conv.Participant1Id == userId ? conv.Participant2Id : conv.Participant1Id;

                    // Get the latest message in this conversation
                    var latestMsg = await _db.Messages
                        .AsNoTracking()
                        .Where(m => m.ConversationId == conv.Id)
                        .OrderByDescending(m => m.CreatedAt)
                        .Select(m => new { m.Content, m.CreatedAt })
                        .FirstOrDefaultAsync();

                    // Count unread messages sent TO the current user
                    var unreadCount = await _db.Messages
                        .AsNoTracking()
                        .CountAsync(m => m.ConversationId == conv.Id &&
                            m.ReceiverId == userId && !m.IsRead);

                    // Resolve other participant's name and role
                    var otherLogin = await _db.UserLogins
                        .AsNoTracking()
                        .FirstOrDefaultAsync(u => u.Id == otherParticipantId);
                    var otherName = otherLogin != null
                        ? $"{otherLogin.FirstName} {otherLogin.LastName}".Trim()
                        : "Unknown";
                    if (string.IsNullOrWhiteSpace(otherName)) otherName = "Unknown";
                    var otherRole = otherLogin?.Role ?? string.Empty;

                    dtos.Add(new MobileConversationDto
                    {
                        Id = conv.Id.ToString(),
                        ParticipantId = otherParticipantId.ToString(),
                        ParticipantName = otherName,
                        ParticipantRole = otherRole,
                        LastMessage = latestMsg?.Content,
                        LastMessageTime = latestMsg?.CreatedAt,
                        UnreadCount = unreadCount,
                    });
                }

                return Ok(new PaginatedResponse<MobileConversationDto>
                {
                    Items = dtos,
                    TotalCount = total,
                    Page = page,
                    PageSize = pageSize,
                    TotalPages = (int)Math.Ceiling(total / (double)pageSize),
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching mobile conversations");
                return StatusCode(500, new { message = "An error occurred" });
            }
        }

        /// <summary>
        /// [Mobile] Returns paginated messages in a conversation thread.
        /// </summary>
        [HttpGet("mobile/messages/{conversationId}")]
        [ProducesResponseType(typeof(PaginatedResponse<MobileThreadMessageDto>), 200)]
        public async Task<ActionResult<PaginatedResponse<MobileThreadMessageDto>>> GetMobileMessages(
            Guid conversationId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            try
            {
                var schoolId = GetSchoolId();

                var conv = await _db.Conversations
                    .AsNoTracking()
                    .FirstOrDefaultAsync(c => c.Id == conversationId && c.SchoolId == schoolId);

                if (conv == null)
                    return NotFound(new { message = "Conversation not found" });

                var query = _db.Messages
                    .AsNoTracking()
                    .Where(m => m.ConversationId == conversationId);

                var total = await query.CountAsync();
                var messages = await query
                    .OrderByDescending(m => m.CreatedAt)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToListAsync();

                // Resolve sender names
                var senderIds = messages.Select(m => m.SenderId).Distinct().ToList();
                var senderLogins = await _db.UserLogins
                    .AsNoTracking()
                    .Where(u => senderIds.Contains(u.Id))
                    .Select(u => new { u.Id, u.FirstName, u.LastName })
                    .ToListAsync();

                // Staff members may have their own ID as sender
                var staffMembers = await _db.StaffMembers
                    .AsNoTracking()
                    .Where(s => s.SchoolId == schoolId && senderIds.Contains(s.Id))
                    .Select(s => new { s.Id, s.Name })
                    .ToListAsync();

                var dtos = messages.Select(m =>
                {
                    // Prefer UserLogin display name; fall back to StaffMember name
                    var login = senderLogins.FirstOrDefault(u => u.Id == m.SenderId);
                    var staff = staffMembers.FirstOrDefault(s => s.Id == m.SenderId);
                    var senderName = login != null
                        ? $"{login.FirstName} {login.LastName}".Trim()
                        : staff?.Name ?? "Unknown";

                    // Normalise sender to UserLogin.Id for the mobile (which only knows UserLogin IDs)
                    var senderUserLoginId = login?.Id ?? m.SenderId;

                    return new MobileThreadMessageDto
                    {
                        Id = m.Id.ToString(),
                        SenderId = senderUserLoginId.ToString(),
                        SenderName = senderName,
                        Message = m.Content,
                        SentAt = m.CreatedAt,
                        Status = m.IsRead ? "read" : "delivered",
                    };
                }).ToList();

                return Ok(new PaginatedResponse<MobileThreadMessageDto>
                {
                    Items = dtos,
                    TotalCount = total,
                    Page = page,
                    PageSize = pageSize,
                    TotalPages = (int)Math.Ceiling(total / (double)pageSize),
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching mobile messages for conversation {Id}", conversationId);
                return StatusCode(500, new { message = "An error occurred" });
            }
        }

        /// <summary>
        /// [Mobile] Send a message to another user. Creates a new conversation if none exists.
        /// </summary>
        [HttpPost("mobile/messages")]
        [ProducesResponseType(typeof(MobileThreadMessageDto), 201)]
        [ProducesResponseType(400)]
        public async Task<ActionResult<MobileThreadMessageDto>> SendMobileMessage(
            [FromBody] MobileSendMessagePayload dto)
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();

                if (!Guid.TryParse(dto.RecipientId, out var recipientId))
                    return BadRequest(new { message = "Invalid recipientId" });

                // Verify recipient exists
                var recipientLogin = await _db.UserLogins
                    .FirstOrDefaultAsync(u => u.Id == recipientId && !u.IsDeleted);
                if (recipientLogin == null)
                    return BadRequest(new { message = "Recipient not found" });

                // Resolve caller's sender ID (prefer StaffMember.Id when sending as Staff)
                Guid senderId = userId;
                var callerLogin = await _db.UserLogins
                    .AsNoTracking()
                    .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted);
                if (!string.IsNullOrEmpty(callerLogin?.Email))
                {
                    var staff = await _db.StaffMembers
                        .AsNoTracking()
                        .Where(s => s.SchoolId == schoolId && s.Email == callerLogin.Email && !s.IsDeleted)
                        .Select(s => (Guid?)s.Id)
                        .FirstOrDefaultAsync();
                    if (staff.HasValue) senderId = staff.Value;
                }

                // Find or create conversation
                Guid conversationId;
                if (!string.IsNullOrEmpty(dto.ConversationId) && Guid.TryParse(dto.ConversationId, out var existingConvId))
                {
                    var existing = await _db.Conversations
                        .FirstOrDefaultAsync(c => c.Id == existingConvId && c.SchoolId == schoolId);
                    if (existing == null)
                        return NotFound(new { message = "Conversation not found" });
                    conversationId = existingConvId;
                    existing.LastMessageAt = DateTime.UtcNow;
                    existing.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    // Check for an existing conversation between these two users
                    var existingConv = await _db.Conversations
                        .FirstOrDefaultAsync(c => c.SchoolId == schoolId && c.IsActive &&
                            ((c.Participant1Id == userId && c.Participant2Id == recipientId) ||
                             (c.Participant1Id == recipientId && c.Participant2Id == userId) ||
                             (c.Participant1Id == senderId && c.Participant2Id == recipientId) ||
                             (c.Participant1Id == recipientId && c.Participant2Id == senderId)));

                    if (existingConv != null)
                    {
                        conversationId = existingConv.Id;
                        existingConv.LastMessageAt = DateTime.UtcNow;
                        existingConv.UpdatedAt = DateTime.UtcNow;
                    }
                    else
                    {
                        var newConv = new Conversation
                        {
                            Id = Guid.NewGuid(),
                            SchoolId = schoolId,
                            Participant1Id = userId,
                            Participant1Type = callerLogin?.Role ?? "Staff",
                            Participant2Id = recipientId,
                            Participant2Type = recipientLogin.Role,
                            LastMessageAt = DateTime.UtcNow,
                            IsActive = true,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow,
                        };
                        _db.Conversations.Add(newConv);
                        conversationId = newConv.Id;
                    }
                }

                var message = new Message
                {
                    Id = Guid.NewGuid(),
                    SchoolId = schoolId,
                    ConversationId = conversationId,
                    SenderId = senderId,
                    SenderType = callerLogin?.Role ?? "Staff",
                    ReceiverId = recipientId,
                    ReceiverType = recipientLogin.Role,
                    Content = dto.Message,
                    MessageType = "Text",
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                };
                _db.Messages.Add(message);
                await _db.SaveChangesAsync();

                var senderName = callerLogin != null
                    ? $"{callerLogin.FirstName} {callerLogin.LastName}".Trim()
                    : "Unknown";

                return Created(string.Empty, new MobileThreadMessageDto
                {
                    Id = message.Id.ToString(),
                    SenderId = userId.ToString(),
                    SenderName = senderName,
                    Message = message.Content,
                    SentAt = message.CreatedAt,
                    Status = "sent",
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending mobile message");
                return StatusCode(500, new { message = "An error occurred" });
            }
        }

        /// <summary>
        /// [Mobile] Mark a message as read.
        /// </summary>
        [HttpPut("mobile/messages/{id}/read")]
        [ProducesResponseType(200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult> MarkMobileMessageRead(Guid id)
        {
            try
            {
                var userId = GetUserId();
                var msg = await _db.Messages
                    .FirstOrDefaultAsync(m => m.Id == id && m.ReceiverId == userId);

                if (msg == null)
                    return NotFound(new { message = "Message not found" });

                msg.IsRead = true;
                msg.ReadAt = DateTime.UtcNow;
                msg.UpdatedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();

                return Ok(new { message = "Marked as read" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking message {Id} as read", id);
                return StatusCode(500, new { message = "An error occurred" });
            }
        }

        /// <summary>
        /// [Mobile] Returns the count of unread messages for the current user.
        /// </summary>
        [HttpGet("mobile/unread-count")]
        [ProducesResponseType(typeof(MobileUnreadCountDto), 200)]
        public async Task<ActionResult<MobileUnreadCountDto>> GetMobileUnreadCount()
        {
            try
            {
                var userId = GetUserId();
                var count = await _db.Messages
                    .AsNoTracking()
                    .CountAsync(m => m.ReceiverId == userId && !m.IsRead);

                return Ok(new MobileUnreadCountDto { Count = count });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching unread count");
                return StatusCode(500, new { message = "An error occurred" });
            }
        }

        /// <summary>
        /// [Mobile] Returns the list of users the current user can message.
        /// For teachers/staff: returns parents of students in their assigned classes.
        /// </summary>
        [HttpGet("mobile/recipients")]
        [ProducesResponseType(typeof(List<MobileRecipientDto>), 200)]
        public async Task<ActionResult<List<MobileRecipientDto>>> GetMobileRecipients()
        {
            try
            {
                var schoolId = GetSchoolId();
                var userId = GetUserId();

                var callerLogin = await _db.UserLogins
                    .AsNoTracking()
                    .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted);

                var dtos = new List<MobileRecipientDto>();

                if (callerLogin == null)
                    return Ok(dtos);

                // Resolve the staff member record
                var staffMember = await _db.StaffMembers
                    .AsNoTracking()
                    .FirstOrDefaultAsync(s => s.SchoolId == schoolId && s.Email == callerLogin.Email && !s.IsDeleted);

                if (staffMember == null)
                    return Ok(dtos);

                // Get all sections this teacher is assigned to
                var assignedSectionIds = await _db.TeacherAssignments
                    .AsNoTracking()
                    .Where(ta => ta.StaffId == staffMember.Id && ta.SchoolId == schoolId && ta.Status == "active" && !ta.IsDeleted)
                    .Select(ta => ta.SectionId)
                    .Distinct()
                    .ToListAsync();

                if (!assignedSectionIds.Any())
                    return Ok(dtos);

                // Get active student IDs enrolled in those sections (via StudentEnrollment)
                var enrolledStudentIds = await _db.StudentEnrollments
                    .AsNoTracking()
                    .Where(se => se.SchoolId == schoolId && se.Status == "active" &&
                                 assignedSectionIds.Contains(se.SectionId))
                    .Select(se => se.StudentId)
                    .Distinct()
                    .ToListAsync();

                if (!enrolledStudentIds.Any())
                    return Ok(dtos);

                var students = await _db.Students
                    .AsNoTracking()
                    .Where(s => s.SchoolId == schoolId && s.Status == "active" &&
                                enrolledStudentIds.Contains(s.Id))
                    .Select(s => new { s.Id, s.FirstName, s.LastName, s.Class, s.Section })
                    .ToListAsync();

                if (!students.Any())
                    return Ok(dtos);

                var studentIds = students.Select(s => s.Id).ToList();

                // Get guardian UserLoginIds linked to those students via GuardianStudents
                var guardianLinks = await _db.GuardianStudents
                    .AsNoTracking()
                    .Where(gs => studentIds.Contains(gs.StudentId))
                    .Select(gs => gs.GuardianId)
                    .Distinct()
                    .ToListAsync();

                // Get UserLoginIds from guardians linked to those students
                var guardianUserIds = await _db.Guardians
                    .AsNoTracking()
                    .Where(g => guardianLinks.Contains(g.Id) && g.UserLoginId != null)
                    .Select(g => g.UserLoginId!.Value)
                    .Distinct()
                    .ToListAsync();

                var parentLogins = await _db.UserLogins
                    .AsNoTracking()
                    .Where(u => guardianUserIds.Contains(u.Id) && !u.IsDeleted)
                    .Select(u => new { u.Id, u.FirstName, u.LastName, u.Email })
                    .ToListAsync();

                foreach (var p in parentLogins)
                {
                    var parentName = $"{p.FirstName} {p.LastName}".Trim();
                    if (string.IsNullOrWhiteSpace(parentName))
                        parentName = p.Email;

                    dtos.Add(new MobileRecipientDto
                    {
                        Id = p.Id.ToString(),
                        Name = parentName ?? "Unknown",
                        Role = "Parent",
                        ClassId = null,
                        ClassName = null,
                        StudentName = null,
                    });
                }

                return Ok(dtos.DistinctBy(d => d.Id).ToList());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching mobile recipients");
                return StatusCode(500, new { message = "An error occurred" });
            }
        }
    }
}
