using SmsApi.Models.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmsApi.Models.DTOs;
using SmsApi.Services;
using System.Security.Claims;

namespace SmsApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SchoolConnectController : ControllerBase
    {
        private readonly ISchoolConnectService _schoolConnectService;
        private readonly IFileStorageService _fileStorage;
        private readonly IFileValidationService _fileValidation;
        private readonly ILogger<SchoolConnectController> _logger;

        public SchoolConnectController(
            ISchoolConnectService schoolConnectService,
            IFileStorageService fileStorage,
            IFileValidationService fileValidation,
            ILogger<SchoolConnectController> logger)
        {
            _schoolConnectService = schoolConnectService;
            _fileStorage = fileStorage;
            _fileValidation = fileValidation;
            _logger = logger;
        }

        private Guid GetSchoolId() => Guid.Parse(User.FindFirst("SchoolId")?.Value ?? Guid.Empty.ToString());
        private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());
        private string GetUserName() => User.FindFirst(ClaimTypes.Name)?.Value ?? "Unknown";
        private string GetUserRole() => User.FindFirst(ClaimTypes.Role)?.Value ?? "User";

        #region Posts

        /// <summary>
        /// Get paginated list of posts for the school feed
        /// </summary>
        [HttpGet("posts")]
        public async Task<ActionResult<SchoolConnectPostListResponse>> GetPosts(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? visibility = null,
            [FromQuery] Guid? authorId = null,
            [FromQuery] string? authorRole = null,
            [FromQuery] bool? isPinned = null,
            [FromQuery] string? searchTerm = null,
            [FromQuery] string? tag = null,
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            [FromQuery] Guid? targetClassId = null)
        {
            try
            {
                var filters = new SchoolConnectPostFilters
                {
                    Visibility = visibility,
                    AuthorId = authorId,
                    AuthorRole = authorRole,
                    IsPinned = isPinned,
                    SearchTerm = searchTerm,
                    Tag = tag,
                    FromDate = fromDate,
                    ToDate = toDate,
                    TargetClassId = targetClassId
                };

                var result = await _schoolConnectService.GetPostsAsync(GetSchoolId(), GetUserId(), GetUserRole(), page, pageSize, filters);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting posts");
                return StatusCode(500, new { message = "An error occurred while fetching posts" });
            }
        }

        /// <summary>
        /// Get a single post by ID
        /// </summary>
        [HttpGet("posts/{id}")]
        public async Task<ActionResult<SchoolConnectPostResponse>> GetPost(Guid id)
        {
            try
            {
                var post = await _schoolConnectService.GetPostByIdAsync(id, GetSchoolId(), GetUserId());
                if (post == null)
                    return NotFound(new { message = "Post not found" });

                return Ok(post);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting post {PostId}", id);
                return StatusCode(500, new { message = "An error occurred while fetching the post" });
            }
        }

        /// <summary>
        /// Create a new post
        /// </summary>
        [HttpPost("posts")]
        public async Task<ActionResult<SchoolConnectPostResponse>> CreatePost([FromBody] CreateSchoolConnectPostRequest request)
        {
            try
            {
                // Set author info from JWT
                request.SchoolId = GetSchoolId();
                request.AuthorId = GetUserId();
                request.AuthorName = GetUserName();
                request.AuthorRole = GetUserRole();

                var post = await _schoolConnectService.CreatePostAsync(request);
                return CreatedAtAction(nameof(GetPost), new { id = post.Id }, post);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating post");
                return StatusCode(500, new { message = "An error occurred while creating the post" });
            }
        }

        /// <summary>
        /// Update an existing post
        /// </summary>
        [HttpPut("posts/{id}")]
        public async Task<ActionResult<SchoolConnectPostResponse>> UpdatePost(Guid id, [FromBody] UpdateSchoolConnectPostRequest request)
        {
            try
            {
                var post = await _schoolConnectService.UpdatePostAsync(id, request, GetSchoolId(), GetUserId());
                return Ok(post);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating post {PostId}", id);
                return StatusCode(500, new { message = "An error occurred while updating the post" });
            }
        }

        /// <summary>
        /// Delete a post
        /// </summary>
        [HttpDelete("posts/{id}")]
        public async Task<ActionResult> DeletePost(Guid id)
        {
            try
            {
                var result = await _schoolConnectService.DeletePostAsync(id, GetSchoolId(), GetUserId());
                if (!result)
                    return NotFound(new { message = "Post not found" });

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting post {PostId}", id);
                return StatusCode(500, new { message = "An error occurred while deleting the post" });
            }
        }

        /// <summary>
        /// Get posts authored by the currently authenticated user (uses JWT — no authorId param needed).
        /// </summary>
        [HttpGet("posts/mine")]
        public async Task<ActionResult<SchoolConnectPostListResponse>> GetMyPosts(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? searchTerm = null)
        {
            try
            {
                var filters = new SchoolConnectPostFilters
                {
                    AuthorId = GetUserId(),
                    SearchTerm = searchTerm,
                };
                var result = await _schoolConnectService.GetPostsAsync(GetSchoolId(), GetUserId(), GetUserRole(), page, pageSize, filters);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting my posts");
                return StatusCode(500, new { message = "An error occurred while fetching posts" });
            }
        }

        /// <summary>
        /// Get pinned posts
        /// </summary>
        [HttpGet("posts/pinned")]
        public async Task<ActionResult<SchoolConnectPostListResponse>> GetPinnedPosts(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            try
            {
                var result = await _schoolConnectService.GetPinnedPostsAsync(GetSchoolId(), GetUserId(), page, pageSize);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting pinned posts");
                return StatusCode(500, new { message = "An error occurred while fetching pinned posts" });
            }
        }

        /// <summary>
        /// Get scheduled posts (for post authors and admins)
        /// </summary>
        [HttpGet("posts/scheduled")]
        public async Task<ActionResult<SchoolConnectPostListResponse>> GetScheduledPosts(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            try
            {
                var result = await _schoolConnectService.GetScheduledPostsAsync(GetSchoolId(), GetUserId(), page, pageSize);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting scheduled posts");
                return StatusCode(500, new { message = "An error occurred while fetching scheduled posts" });
            }
        }

        #endregion

        #region Comments

        /// <summary>
        /// Get comments for a post
        /// </summary>
        [HttpGet("posts/{postId}/comments")]
        public async Task<ActionResult<SchoolConnectCommentListResponse>> GetComments(
            Guid postId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            try
            {
                var result = await _schoolConnectService.GetCommentsAsync(postId, GetUserId(), page, pageSize);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting comments for post {PostId}", postId);
                return StatusCode(500, new { message = "An error occurred while fetching comments" });
            }
        }

        /// <summary>
        /// Add a comment to a post
        /// </summary>
        [HttpPost("posts/{postId}/comments")]
        public async Task<ActionResult<SchoolConnectCommentResponse>> CreateComment(
            Guid postId,
            [FromBody] CreateSchoolConnectCommentRequest request)
        {
            try
            {
                request.PostId = postId;
                request.AuthorId = GetUserId();
                request.AuthorName = GetUserName();
                request.AuthorRole = GetUserRole();

                var comment = await _schoolConnectService.CreateCommentAsync(request);
                return CreatedAtAction(nameof(GetComments), new { postId }, comment);
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
                _logger.LogError(ex, "Error creating comment");
                return StatusCode(500, new { message = "An error occurred while creating the comment" });
            }
        }

        /// <summary>
        /// Update a comment
        /// </summary>
        [HttpPut("comments/{commentId}")]
        public async Task<ActionResult<SchoolConnectCommentResponse>> UpdateComment(
            Guid commentId,
            [FromBody] UpdateSchoolConnectCommentRequest request)
        {
            try
            {
                var comment = await _schoolConnectService.UpdateCommentAsync(commentId, request, GetUserId());
                return Ok(comment);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating comment {CommentId}", commentId);
                return StatusCode(500, new { message = "An error occurred while updating the comment" });
            }
        }

        /// <summary>
        /// Delete a comment
        /// </summary>
        [HttpDelete("comments/{commentId}")]
        public async Task<ActionResult> DeleteComment(Guid commentId)
        {
            try
            {
                var result = await _schoolConnectService.DeleteCommentAsync(commentId, GetUserId());
                if (!result)
                    return NotFound(new { message = "Comment not found" });

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting comment {CommentId}", commentId);
                return StatusCode(500, new { message = "An error occurred while deleting the comment" });
            }
        }

        #endregion

        #region Likes

        /// <summary>
        /// Like/unlike a post
        /// </summary>
        [HttpPost("posts/{postId}/like")]
        public async Task<ActionResult<SchoolConnectLikeResponse>> TogglePostLike(Guid postId)
        {
            try
            {
                var request = new SchoolConnectLikeRequest
                {
                    UserId = GetUserId(),
                    UserName = GetUserName()
                };

                var result = await _schoolConnectService.TogglePostLikeAsync(postId, request);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error toggling like for post {PostId}", postId);
                return StatusCode(500, new { message = "An error occurred while processing the like" });
            }
        }

        /// <summary>
        /// Like/unlike a comment
        /// </summary>
        [HttpPost("comments/{commentId}/like")]
        public async Task<ActionResult<SchoolConnectLikeResponse>> ToggleCommentLike(Guid commentId)
        {
            try
            {
                var request = new SchoolConnectLikeRequest
                {
                    UserId = GetUserId(),
                    UserName = GetUserName()
                };

                var result = await _schoolConnectService.ToggleCommentLikeAsync(commentId, request);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error toggling like for comment {CommentId}", commentId);
                return StatusCode(500, new { message = "An error occurred while processing the like" });
            }
        }

        #endregion

        #region Pin

        /// <summary>
        /// Pin/unpin a post (admin/moderator only)
        /// </summary>
        [HttpPost("posts/{postId}/pin")]
        [Authorize(Roles = "SuperAdmin,Admin,Principal,Moderator")]
        public async Task<ActionResult> TogglePinPost(Guid postId, [FromBody] SchoolConnectPinRequest request)
        {
            try
            {
                request.PinnedById = GetUserId();
                var result = await _schoolConnectService.TogglePinPostAsync(postId, request, GetSchoolId());
                if (!result)
                    return NotFound(new { message = "Post not found" });

                return Ok(new { message = request.IsPinned ? "Post pinned" : "Post unpinned" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error toggling pin for post {PostId}", postId);
                return StatusCode(500, new { message = "An error occurred while processing the request" });
            }
        }

        #endregion

        #region Share

        /// <summary>
        /// Share a post
        /// </summary>
        [HttpPost("posts/{postId}/share")]
        public async Task<ActionResult> SharePost(Guid postId, [FromBody] CreateSchoolConnectShareRequest request)
        {
            try
            {
                request.PostId = postId;
                request.SharedById = GetUserId();
                request.SharedByName = GetUserName();

                var shareCount = await _schoolConnectService.SharePostAsync(request);
                return Ok(new { message = "Post shared", totalShares = shareCount });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sharing post {PostId}", postId);
                return StatusCode(500, new { message = "An error occurred while sharing the post" });
            }
        }

        #endregion

        #region Reports & Moderation

        /// <summary>
        /// Report a post
        /// </summary>
        [HttpPost("posts/{postId}/report")]
        public async Task<ActionResult> ReportPost(Guid postId, [FromBody] CreateSchoolConnectReportRequest request)
        {
            try
            {
                request.PostId = postId;
                request.ReportedById = GetUserId();
                request.ReporterName = GetUserName();

                var result = await _schoolConnectService.ReportPostAsync(request);
                return Ok(new { message = "Post reported for review" });
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
                _logger.LogError(ex, "Error reporting post {PostId}", postId);
                return StatusCode(500, new { message = "An error occurred while reporting the post" });
            }
        }

        /// <summary>
        /// Get moderation queue (admin/moderator only)
        /// </summary>
        [HttpGet("moderation")]
        [Authorize(Roles = "SuperAdmin,Admin,Principal,Moderator")]
        public async Task<ActionResult<SchoolConnectReportListResponse>> GetModerationQueue(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? status = null)
        {
            try
            {
                var result = await _schoolConnectService.GetModerationQueueAsync(GetSchoolId(), page, pageSize, status);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting moderation queue");
                return StatusCode(500, new { message = "An error occurred while fetching the moderation queue" });
            }
        }

        /// <summary>
        /// Review a report (admin/moderator only)
        /// </summary>
        [HttpPost("moderation/{reportId}/review")]
        [Authorize(Roles = "SuperAdmin,Admin,Principal,Moderator")]
        public async Task<ActionResult> ReviewReport(Guid reportId, [FromBody] ReviewSchoolConnectReportRequest request)
        {
            try
            {
                request.ReviewedById = GetUserId();
                var result = await _schoolConnectService.ReviewReportAsync(reportId, request, GetSchoolId());
                if (!result)
                    return NotFound(new { message = "Report not found" });

                return Ok(new { message = "Report reviewed successfully" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error reviewing report {ReportId}", reportId);
                return StatusCode(500, new { message = "An error occurred while reviewing the report" });
            }
        }

        #endregion

        #region Analytics

        /// <summary>
        /// Get School Connect analytics
        /// </summary>
        [HttpGet("analytics")]
        [Authorize(Roles = "SuperAdmin,Admin,Principal")]
        public async Task<ActionResult<SchoolConnectAnalyticsResponse>> GetAnalytics()
        {
            try
            {
                var result = await _schoolConnectService.GetAnalyticsAsync(GetSchoolId());
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting analytics");
                return StatusCode(500, new { message = "An error occurred while fetching analytics" });
            }
        }

        #endregion

        #region Media Upload

        /// <summary>
        /// Upload a media file (image or document) for use in a School Connect post.
        /// Returns the public URL to embed in the post.
        /// </summary>
        [HttpPost("upload")]
        [RequestSizeLimit(10 * 1024 * 1024)] // 10 MB
        public async Task<ActionResult<UploadMediaResponse>> UploadMedia(IFormFile file)
        {
            try
            {
                if (file == null || file.Length == 0)
                    return BadRequest(new { message = "No file provided." });

                var (isValid, errorMessage) = await _fileValidation.ValidateAsync(file);
                if (!isValid)
                    return BadRequest(new { message = errorMessage });

                var schoolId = GetSchoolId();
                var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
                var key = $"{schoolId}/school-connect/{Guid.NewGuid()}{ext}";

                using var stream = file.OpenReadStream();
                var saved = await _fileStorage.SaveFileAsync(key, stream);
                if (!saved)
                    return StatusCode(500, new { message = "Failed to save the file." });

                var url = _fileStorage.GetPublicUrl(key);

                // Determine media type from extension
                var imageExts = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
                var mediaType = imageExts.Contains(ext) ? "image" : "document";

                return Ok(new UploadMediaResponse
                {
                    Url = url,
                    MediaType = mediaType,
                    FileName = file.FileName,
                    FileSizeBytes = file.Length
                });
            }
            catch (UnauthorizedAccessException)
            {
                return BadRequest(new { message = "Invalid file path." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading media");
                return StatusCode(500, new { message = "An error occurred while uploading the file." });
            }
        }

        #endregion
    }
}
