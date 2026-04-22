using SmsApi.Models.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmsApi.Models.DTOs;
using SmsApi.Services;
using System.Security.Claims;

namespace SmsApi.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class DocumentsController : ControllerBase
    {
        private readonly IDocumentService _docs;
        private readonly ITenantContext _tenant;
        private readonly ILogger<DocumentsController> _logger;

        public DocumentsController(IDocumentService docs, ITenantContext tenant, ILogger<DocumentsController> logger)
        {
            _docs = docs;
            _tenant = tenant;
            _logger = logger;
        }

        private Guid GetSchoolId() => _tenant.GetEffectiveSchoolId();
        private Guid GetUserId() =>
            Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

        // ═════════════════════ Document Categories ═════════════════════════════

        /// <summary>GET api/documents/categories — paginated list of active categories</summary>
        [HttpGet("categories")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(DocumentCategoryListResponse), 200)]
        public async Task<IActionResult> GetCategories([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            try
            {
                var result = await _docs.GetCategoriesAsync(GetSchoolId(), page, pageSize);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting document categories");
                return StatusCode(500, new { message = "An error occurred while retrieving categories." });
            }
        }

        /// <summary>GET api/documents/categories/{id}</summary>
        [HttpGet("categories/{id:guid}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(DocumentCategoryResponse), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetCategoryById(Guid id)
        {
            try
            {
                var cat = await _docs.GetCategoryByIdAsync(id, GetSchoolId());
                if (cat == null) return NotFound(new { message = "Category not found." });
                return Ok(cat);
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting category {Id}", id);
                return StatusCode(500, new { message = "An error occurred." });
            }
        }

        /// <summary>POST api/documents/categories — create a new category</summary>
        [HttpPost("categories")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        [ProducesResponseType(typeof(DocumentCategoryResponse), 201)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> CreateCategory([FromBody] CreateDocumentCategoryRequest request)
        {
            try
            {
                var cat = await _docs.CreateCategoryAsync(GetSchoolId(), GetUserId(), request);
                return CreatedAtAction(nameof(GetCategoryById), new { id = cat.Id }, cat);
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating category");
                return StatusCode(500, new { message = "An error occurred." });
            }
        }

        /// <summary>PUT api/documents/categories/{id} — update a category</summary>
        [HttpPut("categories/{id:guid}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        [ProducesResponseType(typeof(DocumentCategoryResponse), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> UpdateCategory(Guid id, [FromBody] UpdateDocumentCategoryRequest request)
        {
            try
            {
                var cat = await _docs.UpdateCategoryAsync(id, GetSchoolId(), request);
                return Ok(cat);
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating category {Id}", id);
                return StatusCode(500, new { message = "An error occurred." });
            }
        }

        /// <summary>DELETE api/documents/categories/{id}</summary>
        [HttpDelete("categories/{id:guid}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        [ProducesResponseType(204)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> DeleteCategory(Guid id)
        {
            try
            {
                var deleted = await _docs.DeleteCategoryAsync(id, GetSchoolId());
                if (!deleted) return NotFound(new { message = "Category not found." });
                return NoContent();
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting category {Id}", id);
                return StatusCode(500, new { message = "An error occurred." });
            }
        }

        // ═════════════════════ Documents ═══════════════════════════════════════

        /// <summary>GET api/documents — list documents with filters</summary>
        [HttpGet]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(DocumentListResponse), 200)]
        public async Task<IActionResult> GetDocuments(
            [FromQuery] Guid? categoryId = null,
            [FromQuery] string? accessLevel = null,
            [FromQuery] Guid? relatedClassId = null,
            [FromQuery] Guid? relatedSectionId = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            try
            {
                var result = await _docs.GetDocumentsAsync(GetSchoolId(), categoryId, accessLevel, relatedClassId, relatedSectionId, page, pageSize);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting documents");
                return StatusCode(500, new { message = "An error occurred." });
            }
        }

        /// <summary>GET api/documents/{id}</summary>
        [HttpGet("{id:guid}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(DocumentResponse), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetDocumentById(Guid id)
        {
            try
            {
                var doc = await _docs.GetDocumentByIdAsync(id, GetSchoolId());
                if (doc == null) return NotFound(new { message = "Document not found." });
                return Ok(doc);
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting document {Id}", id);
                return StatusCode(500, new { message = "An error occurred." });
            }
        }

        /// <summary>POST api/documents — upload document metadata</summary>
        [HttpPost]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(DocumentResponse), 201)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> CreateDocument([FromBody] CreateDocumentRequest request)
        {
            try
            {
                var doc = await _docs.CreateDocumentAsync(GetSchoolId(), GetUserId(), request);
                return CreatedAtAction(nameof(GetDocumentById), new { id = doc.Id }, doc);
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating document");
                return StatusCode(500, new { message = "An error occurred." });
            }
        }

        /// <summary>PUT api/documents/{id}</summary>
        [HttpPut("{id:guid}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(DocumentResponse), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> UpdateDocument(Guid id, [FromBody] UpdateDocumentRequest request)
        {
            try
            {
                var doc = await _docs.UpdateDocumentAsync(id, GetSchoolId(), request);
                return Ok(doc);
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating document {Id}", id);
                return StatusCode(500, new { message = "An error occurred." });
            }
        }

        /// <summary>DELETE api/documents/{id} — soft delete</summary>
        [HttpDelete("{id:guid}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        [ProducesResponseType(204)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> DeleteDocument(Guid id)
        {
            try
            {
                var deleted = await _docs.DeleteDocumentAsync(id, GetSchoolId());
                if (!deleted) return NotFound(new { message = "Document not found." });
                return NoContent();
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting document {Id}", id);
                return StatusCode(500, new { message = "An error occurred." });
            }
        }

        /// <summary>PUT api/documents/{id}/download — increment download counter</summary>
        [HttpPut("{id:guid}/download")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> IncrementDownloadCount(Guid id)
        {
            try
            {
                var ok = await _docs.IncrementDownloadCountAsync(id, GetSchoolId());
                if (!ok) return NotFound(new { message = "Document not found." });
                return Ok(new { success = true });
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error incrementing download count {Id}", id);
                return StatusCode(500, new { message = "An error occurred." });
            }
        }

        /// <summary>GET api/documents/search?searchTerm= — full-text search across title/description/tags</summary>
        [HttpGet("search")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(List<DocumentResponse>), 200)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> SearchDocuments([FromQuery] string searchTerm)
        {
            try
            {
                var results = await _docs.SearchDocumentsAsync(GetSchoolId(), searchTerm);
                return Ok(results);
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching documents");
                return StatusCode(500, new { message = "An error occurred." });
            }
        }

        /// <summary>GET api/documents/stats — aggregate stats for the school</summary>
        [HttpGet("stats")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        [ProducesResponseType(typeof(DocumentStatsResponse), 200)]
        public async Task<IActionResult> GetStats()
        {
            try
            {
                var stats = await _docs.GetStatsAsync(GetSchoolId());
                return Ok(stats);
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting document stats");
                return StatusCode(500, new { message = "An error occurred." });
            }
        }
    }
}
