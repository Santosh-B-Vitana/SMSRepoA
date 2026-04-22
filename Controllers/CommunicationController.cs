using SmsApi.Models.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using SmsApi.Models.DTOs;
using SmsApi.Services;
using System;
using System.Collections.Generic;
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

        public CommunicationController(ICommunicationService service, ILogger<CommunicationController> logger)
        {
            _service = service;
            _logger = logger;
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
    }
}
